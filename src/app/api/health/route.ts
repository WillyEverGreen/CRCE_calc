import { NextResponse } from "next/server";

// Health check endpoint for keep-alive pings
// Set up UptimeRobot or cron-job.org to ping this every 10-14 minutes
// to prevent Render cold starts

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: "CRCE Results API is running"
  });
}
