import { NextRequest, NextResponse } from "next/server";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

export async function GET() {
  try {
    // Query factions directly via Convex HTTP API
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "factions:getAll",
        args: {}
      })
    });
    
    if (!response.ok) {
      throw new Error(`Convex API error: ${response.status}`);
    }
    
    const factions = await response.json();
    return NextResponse.json({ factions });
  } catch (error: any) {
    console.error("Error fetching factions:", error);
    return NextResponse.json(
      { error: "Failed to fetch factions", details: error.message },
      { status: 500 }
    );
  }
}
