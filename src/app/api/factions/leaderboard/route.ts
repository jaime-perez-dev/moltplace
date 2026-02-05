import { NextRequest, NextResponse } from "next/server";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

export async function GET() {
  try {
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "factions:leaderboard",
        args: { limit: 10 }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Convex API error: ${response.status}`);
    }
    
    const leaderboard = await response.json();
    return NextResponse.json({ leaderboard });
  } catch (error: any) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard", details: error.message },
      { status: 500 }
    );
  }
}
