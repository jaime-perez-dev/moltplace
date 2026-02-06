import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// In-memory cache for full canvas (serverless function lifetime)
let canvasCache: {
  data: any;
  dimensions: any;
  lastPlacedAt: number;
  cachedAt: number;
} | null = null;

const CACHE_TTL_MS = 30_000; // 30 seconds cache

// Get full canvas state (supports ?since=timestamp, ?dimensions=1, ?activity=1)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get("since");
    const dimensionsOnly = searchParams.get("dimensions") === "1";
    const activityParam = searchParams.get("activity");
    const limitParam = searchParams.get("limit");

    // Dimensions only - lightweight call
    if (dimensionsOnly) {
      const dimensions = await convex.query(api.canvas.getDimensions, {});
      return NextResponse.json(
        { pixels: [], dimensions },
        { headers: { "Cache-Control": "public, max-age=300" } } // 5 min cache for dimensions
      );
    }

    // Activity feed - recent pixels with limit
    if (activityParam === "1") {
      const limit = limitParam ? Math.min(Number(limitParam), 100) : 50; // Cap at 100
      const pixels = await convex.query(api.canvas.getRecentPixels, { limit });
      const sanitized = pixels.map((p: any) => ({
        x: p.x,
        y: p.y,
        color: p.color,
        placedAt: p.placedAt,
        agentName: p.agentName,
      }));
      return NextResponse.json(
        { pixels: sanitized },
        { headers: { "Cache-Control": "public, max-age=5, stale-while-revalidate=30" } }
      );
    }

    // Delta updates since timestamp - efficient for polling
    if (sinceParam) {
      const since = Number(sinceParam);
      const limit = limitParam ? Math.min(Number(limitParam), 20000) : 20000;
      const updates = await convex.query(api.canvas.getCanvasSince, { since, limit });
      const sanitized = updates.map((p: any) => ({
        x: p.x,
        y: p.y,
        color: p.color,
        placedAt: p.placedAt,
      }));
      return NextResponse.json(
        { updates: sanitized },
        { headers: { "Cache-Control": "public, max-age=2, stale-while-revalidate=10" } }
      );
    }

    // Full canvas - use cache if fresh
    const now = Date.now();
    if (canvasCache && (now - canvasCache.cachedAt) < CACHE_TTL_MS) {
      const etag = `W/"${canvasCache.lastPlacedAt}"`;
      const ifNoneMatch = request.headers.get("if-none-match");
      if (ifNoneMatch === etag) {
        return new NextResponse(null, { 
          status: 304, 
          headers: { ETag: etag, "Cache-Control": "public, max-age=10, stale-while-revalidate=30" } 
        });
      }
      return NextResponse.json(
        { pixels: canvasCache.data, dimensions: canvasCache.dimensions },
        { headers: { ETag: etag, "Cache-Control": "public, max-age=10, stale-while-revalidate=30" } }
      );
    }

    // Cache miss - fetch from Convex
    const [pixels, dimensions, meta] = await Promise.all([
      convex.query(api.canvas.getCanvas, {}),
      convex.query(api.canvas.getDimensions, {}),
      convex.query(api.canvas.getCanvasMeta, {}),
    ]);

    const sanitized = pixels.map((p: any) => ({
      x: p.x,
      y: p.y,
      color: p.color,
      placedAt: p.placedAt,
    }));

    // Update cache
    canvasCache = {
      data: sanitized,
      dimensions,
      lastPlacedAt: meta.lastPlacedAt,
      cachedAt: now,
    };

    const etag = `W/"${meta.lastPlacedAt}"`;
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { 
        status: 304, 
        headers: { ETag: etag, "Cache-Control": "public, max-age=10, stale-while-revalidate=30" } 
      });
    }
    
    return NextResponse.json(
      { pixels: sanitized, dimensions },
      { headers: { ETag: etag, "Cache-Control": "public, max-age=10, stale-while-revalidate=30" } }
    );
  } catch (error: any) {
    console.error("Canvas API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
