import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// In-memory cache for leaderboard
let leaderboardCache: Map<string, { data: any; cachedAt: number }> = new Map();
const CACHE_TTL_MS = 60_000; // 60 seconds cache for leaderboard

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 50) : 10; // Reduced max from 100 to 50

    const sortParam = searchParams.get("sort");
    const sort = ["pixels", "name", "newest", "oldest"].includes(sortParam ?? "")
      ? sortParam!
      : "pixels";

    // Parse cursor (format: "offset:N")
    const cursorParam = searchParams.get("cursor");
    let offset = 0;
    if (cursorParam) {
      const match = cursorParam.match(/^offset:(\d+)$/);
      if (match) offset = parseInt(match[1], 10);
    }

    // Cache key based on params
    const cacheKey = `${limit}-${sort}-${offset}`;
    const now = Date.now();
    const cached = leaderboardCache.get(cacheKey);

    // Return cached if fresh
    if (cached && (now - cached.cachedAt) < CACHE_TTL_MS) {
      return NextResponse.json(cached.data, {
        headers: { 
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
          "X-Cache": "HIT"
        },
      });
    }

    // Fetch from Convex
    const result = await convex.query(api.agents.leaderboard, {
      limit,
      sort,
      offset,
    });

    // Update cache
    leaderboardCache.set(cacheKey, { data: result, cachedAt: now });

    // Prune old cache entries (keep last 20)
    if (leaderboardCache.size > 20) {
      const keys = Array.from(leaderboardCache.keys());
      leaderboardCache.delete(keys[0]);
    }

    return NextResponse.json(result, {
      headers: { 
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        "X-Cache": "MISS"
      },
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "Failed to retrieve leaderboard" }, { status: 500 });
  }
}
