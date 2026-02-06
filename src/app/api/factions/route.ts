import { NextRequest, NextResponse } from "next/server";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

// In-memory cache for factions
let factionsCache: { data: any; cachedAt: number } | null = null;
const CACHE_TTL_MS = 120_000; // 2 minutes - factions don't change often

export async function GET() {
  try {
    const now = Date.now();

    // Return cached if fresh
    if (factionsCache && (now - factionsCache.cachedAt) < CACHE_TTL_MS) {
      return NextResponse.json(
        { factions: factionsCache.data },
        { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120", "X-Cache": "HIT" } }
      );
    }

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
    
    const result = await response.json();
    const factions = result.value || result; // Extract value from Convex response
    
    // Update cache
    factionsCache = { data: factions, cachedAt: now };

    return NextResponse.json(
      { factions },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120", "X-Cache": "MISS" } }
    );
  } catch (error: any) {
    console.error("Error fetching factions:", error);
    return NextResponse.json(
      { error: "Failed to fetch factions", details: error.message },
      { status: 500 }
    );
  }
}
