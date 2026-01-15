import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// Initialize Redis safely
const redis = process.env.UPSTASH_REDIS_REST_URL ? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
}) : null;

export const revalidate = 60; // Cache for 60 seconds

function maskPRN(prn: string): string {
  if (!prn || prn.length < 10) return prn;
  // Mask middle digits: MU12345678 -> MU12****78
  return prn.substring(0, 4) + "****" + prn.substring(prn.length - 4);
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export async function GET() {
  if (!redis) {
    return NextResponse.json({ error: "Redis not configured" }, { status: 500 });
  }

  try {
    // Get top 50 students by SGPA (Score)
    // withscores: true returns [member1, score1, member2, score2, ...]
    const result = await redis.zrange("leaderboard:sgpa", 0, 49, {
      rev: true,
      withScores: true
    });

    const leaderboard = [];
    for (let i = 0; i < result.length; i += 2) {
      const member = result[i] as string;
      const score = Number(result[i + 1]);
      
      // Member is just PRN now
      const prn = member;
      
      // Infer branch from PRN
      const branchMatch = prn.match(/MU\d{4}(\d{2})/);
      let branch = "Unknown";
      if (branchMatch) {
         // This assumes getBranchName logic exists or we just use code
         // For now, simpler to just show code or "Branch " + code
         branch = "Branch " + branchMatch[1]; 
      }

      leaderboard.push({
        rank: (i / 2) + 1,
        prn: maskPRN(prn), // Privacy: MASKED
        sgpa: score,
        branch, 
        // We don't have timestamp anymore in the unique set
        // Could fetch from a separate key if needed, but for now omitting
      });
    }

    return NextResponse.json({ 
      leaderboard,
      updated: new Date().toISOString()
    });

  } catch (error) {
    console.error("Leaderboard fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
