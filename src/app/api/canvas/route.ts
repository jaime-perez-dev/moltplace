import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Get full canvas state (supports ?since=timestamp)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get("since");

    if (sinceParam) {
      const since = Number(sinceParam);
      const updates = await convex.query(api.canvas.getCanvasSince, { since, limit: 20000 });
      const sanitized = updates.map((p: any) => ({
        x: p.x,
        y: p.y,
        color: p.color,
        placedAt: p.placedAt,
      }));
      return NextResponse.json({ updates: sanitized });
    }

    const meta = await convex.query(api.canvas.getCanvasMeta, {});
    const etag = `W/"${meta.lastPlacedAt}"`;
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    const [pixels, dimensions] = await Promise.all([
      convex.query(api.canvas.getCanvas, {}),
      convex.query(api.canvas.getDimensions, {}),
    ]);

    const sanitized = pixels.map((p: any) => ({
      x: p.x,
      y: p.y,
      color: p.color,
      placedAt: p.placedAt,
    }));
    
    return NextResponse.json(
      { pixels: sanitized, dimensions },
      { headers: { ETag: etag, "Cache-Control": "public, max-age=3, stale-while-revalidate=30" } }
    );
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
