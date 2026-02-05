import { NextRequest, NextResponse } from "next/server";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

export async function GET() {
  try {
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "factions:getConflictZones",
        args: { limit: 20 }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Convex API error: ${response.status}`);
    }
    
    const conflicts = await response.json();
    return NextResponse.json({ conflicts });
  } catch (error: any) {
    console.error("Error fetching conflicts:", error);
    return NextResponse.json(
      { error: "Failed to fetch conflicts", details: error.message },
      { status: 500 }
    );
  }
}
