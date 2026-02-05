import { NextRequest, NextResponse } from "next/server";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, factionSlug } = body;
    
    if (!apiKey || !factionSlug) {
      return NextResponse.json(
        { error: "Missing apiKey or factionSlug" },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${CONVEX_URL}/api/mutation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "factions:joinFaction",
        args: { apiKey, factionSlug }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Convex API error: ${response.status}`);
    }
    
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error joining faction:", error);
    return NextResponse.json(
      { error: "Failed to join faction", details: error.message },
      { status: 500 }
    );
  }
}
