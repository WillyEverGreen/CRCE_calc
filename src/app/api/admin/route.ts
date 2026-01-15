import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";

const redis = process.env.UPSTASH_REDIS_REST_URL ? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
}) : null;

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
    
    // Get stats from Redis
    const [
      totalRequests,
      todayRequests,
      cacheHits,
      recentUsers,
      queueCurrent,
      activeCount,
      uniqueUsersTotal,
      uniqueUsersToday
    ] = await Promise.all([
      redis?.get("stats:total") || 0,
      redis?.get(`stats:daily:${today}`) || 0,
      redis?.get("stats:cache_hits") || 0,
      redis?.lrange("stats:recent_users", 0, 49) || [],
      redis?.lrange("queue:current", 0, -1) || [],
      redis?.get("queue:active") || 0,
      redis?.scard("stats:unique_users") || 0,          // Count of unique PRNs (all time)
      redis?.scard(`stats:unique_daily:${today}`) || 0  // Count of unique PRNs today
    ]);

    // Parse recent users for branch distribution
    const branchCounts: Record<string, number> = {};
    const userList = (recentUsers as string[]).map(u => {
      // Extract branch from PRN pattern
      const match = u.match(/MU\d{4}(\d{2})/);
      if (match) {
        const branchCode = match[1];
        const branchName = getBranchName(branchCode);
        branchCounts[branchName] = (branchCounts[branchName] || 0) + 1;
      }
      return {
        prn: maskPRN(u),
        timestamp: new Date().toISOString() // Would need to store this separately for accuracy
      };
    });

    return Response.json({
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
        maxConcurrent: 4  // Updated: early browser close = can handle more concurrent
      },
      recentUsers: userList.slice(0, 20),
      branchDistribution: branchCounts,
      serverTime: new Date().toISOString()
    });
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

    // Clear all stats
    await Promise.all([
      redis.del("stats:total"),
      redis.del("stats:cache_hits"),
      redis.del("stats:recent_users"),
      redis.del("stats:unique_users"),  // Clear unique users (all time)
      redis.del("queue:active"),
      redis.del("queue:waiting")
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

    return Response.json({ success: true, message: "All data cleared (including unique users)" });
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
