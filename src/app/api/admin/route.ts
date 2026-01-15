
import { Redis } from "@upstash/redis";
import { type NextRequest, NextResponse } from "next/server";

// Safe Redis initialization - fully optional
let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (e) {
    console.warn("Redis initialization failed (running without Redis):", e);
  }
}

// Admin key for authentication
const ADMIN_KEY = process.env.ADMIN_KEY || "crce-admin-2026";

export async function GET(req: NextRequest) {
  // Simple auth check
  const key = req.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    
    // Initialize with default values
    let totalRequests = 0;
    let todayRequests = 0;
    let cacheHits = 0;
    let recentUsers: string[] = [];
    let queueCurrent: string[] = [];
    let activeCount = 0;
    let uniqueUsersTotal = 0;
    let uniqueUsersToday = 0;

    // Try to get stats from Redis if available
    if (redis) {
      try {
        const [
          tr, tdr, ch, ru, qc, ac, uut, uud
        ] = await Promise.all([
          redis.get("stats:total"),
          redis.get(`stats:daily:${today}`),
          redis.get("stats:cache_hits"),
          redis.lrange("stats:recent_users", 0, 49),
          redis.lrange("queue:current", 0, -1),
          redis.get("queue:active"),
          redis.scard("stats:unique_users"),
          redis.scard(`stats:unique_daily:${today}`)
        ]);
        
        totalRequests = Number(tr) || 0;
        todayRequests = Number(tdr) || 0;
        cacheHits = Number(ch) || 0;
        recentUsers = (ru as string[]) || [];
        queueCurrent = (qc as string[]) || [];
        activeCount = Number(ac) || 0;
        uniqueUsersTotal = Number(uut) || 0;
        uniqueUsersToday = Number(uud) || 0;
      } catch (redisError) {
        console.warn("Redis fetch failed (returning zeros):", redisError);
        // Continue with default values
      }
    }

    // Parse recent users for branch distribution
    const branchCounts: Record<string, number> = {};
    const userList = [];
    
    for (const u of recentUsers) {
      let prn = "";
      let timestamp = "";
      
      try {
        if (typeof u === "object" && u !== null) {
          // Handle auto-parsed JSON from Redis
          const data = u as any;
          prn = data.prn || "";
          timestamp = data.timestamp || "";
        } else if (typeof u === "string" && u.startsWith("{")) {
          const data = JSON.parse(u);
          prn = data.prn || "";
          timestamp = data.timestamp || "";
        } else {
          prn = String(u || "");
        }
        
        // Skip invalid data
        if (!prn || prn === "[object Object]" || prn === "undefined" || prn.length < 5) {
          continue;
        }

        // Add to list
         userList.push({
          prn: prn, // Unmasked for admin
          timestamp: timestamp || new Date().toISOString()
        });

        // Stats
        const match = prn.match(/MU\d{4}(\d{2})/);
        if (match) {
          const branchCode = match[1];
          const branchName = getBranchName(branchCode);
          branchCounts[branchName] = (branchCounts[branchName] || 0) + 1;
        }

      } catch {
        continue; // Skip malformed entries
      }
    }

    // Get Leaderboard Data
    const leaderboard: { rank: number; prn: string; sgpa: number; branch: string }[] = [];
    if (redis) { // Only fetch if redis is available
      const leaderboardRaw = await redis.zrange("leaderboard:sgpa", 0, 49, {
        rev: true,
        withScores: true
      });
      
      // Parse leaderboard
      for (let i = 0; i < leaderboardRaw.length; i += 2) {
        const prn = leaderboardRaw[i] as string;
        const score = Number(leaderboardRaw[i + 1]);
        
        // Infer branch from PRN
        const branchMatch = prn.match(/MU\d{4}(\d{2})/);
        let branch = "Unknown";
        if (branchMatch) {
           branch = getBranchName(branchMatch[1]);
        }
        
        leaderboard.push({
          rank: (i / 2) + 1,
          prn: prn, // UNMASKED for admin
          sgpa: score,
          branch // Keeping logic but will not show in UI if requested
        });
      }
    }

    return NextResponse.json(
      {
        stats: {
          totalRequests: Number(totalRequests),
          todayRequests: Number(todayRequests),
          cacheHits: Number(cacheHits),
          cacheHitRate: Number(totalRequests) > 0 
            ? Math.round((Number(cacheHits) / Number(totalRequests)) * 100) 
            : 0,
          uniqueUsers: Number(uniqueUsersTotal),      // NEW: Total unique users
          uniqueUsersToday: Number(uniqueUsersToday)  // NEW: Unique users today
        },
        queue: {
          active: Number(activeCount),
          waiting: (queueCurrent as string[]).map(p => maskPRN(p)),
          maxConcurrent: 2  // Reduced - Render free tier can only handle 2
        },
        recentUsers: userList.slice(0, 20),
        leaderboard, // Add leaderboard to response
        branchDistribution: branchCounts,
        serverTime: new Date().toISOString()
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!redis) {
      return Response.json({ error: "Redis not configured" }, { status: 500 });
    }

    // Clear specific sections based on type param
    const type = req.nextUrl.searchParams.get("type");
    
    if (type === "recent_users") {
      await redis.del("stats:recent_users");
      return Response.json({ success: true, message: "Cleared recent users list" });
    }
    
    if (type === "leaderboard") {
      await redis.del("leaderboard:sgpa");
      return Response.json({ success: true, message: "Cleared leaderboard" });
    }

    // Default: Clear all stats EXCEPT recent users and leaderboard
    await Promise.all([
      redis.del("stats:total"),
      redis.del("stats:cache_hits"),
      // redis.del("stats:recent_users"), // KEPT - Cleared separately
      redis.del("stats:unique_users"),  // Clear unique users (all time)
      redis.del("queue:active"),
      redis.del("queue:waiting"),
      // redis.del("leaderboard:sgpa") // KEPT - Cleared separately
    ]);

    // Clear daily stats for last 30 days
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      await redis.del(`stats:daily:${dateStr}`);
      await redis.del(`stats:unique_daily:${dateStr}`);  // Clear unique users daily
    }

    return Response.json({ success: true, message: "Stats cleared (Recent Users & Leaderboard preserved)" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

// Clear user results cache
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!redis) {
      return Response.json({ error: "Redis not configured" }, { status: 500 });
    }

    // Get all keys matching crce:* pattern and delete them
    let cursor: number = 0;
    let deletedCount = 0;
    
    do {
      const result = await redis.scan(cursor, { match: "crce:*", count: 100 });
      cursor = Number(result[0]);
      const keys = result[1] as string[];
      
      if (keys.length > 0) {
        for (const k of keys) {
          await redis.del(k);
          deletedCount++;
        }
      }
    } while (cursor !== 0);

    return Response.json({ success: true, message: `Cleared ${deletedCount} cached results` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

function maskPRN(prn: string): string {
  if (!prn || prn.length < 10) return prn;
  return prn.substring(0, 6) + "****" + prn.substring(prn.length - 4);
}

function getBranchName(code: string): string {
  // CRCE Branch mapping:
  // CE = Computer Engineering
  // AIML/AI&DS = Artificial Intelligence (was called CSE)
  // ECS = Electronics & Computer Science
  // MECH = Mechanical Engineering
  const branches: Record<string, string> = {
    "11": "CE",      // Computer Engineering
    "12": "AI&ML",   // AIML (not CSE)
    "13": "ECS",
    "14": "MECH",
    "15": "AI&DS",
    "21": "CE",
    "22": "AI&ML",
    "23": "ECS",
    "24": "MECH",
    "25": "AI&DS"
  };
  return branches[code] || "Other";
}
