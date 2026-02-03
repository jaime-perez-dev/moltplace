import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  let convexOk = false;
  let canvasDimensions = null;
  let totalAgents = 0;
  let totalPixels = 0;

  try {
    const [dimensions, analytics] = await Promise.all([
      convex.query(api.canvas.getDimensions),
      convex.query(api.canvas.getAnalytics),
    ]);
    convexOk = true;
    canvasDimensions = dimensions;
    totalAgents = analytics.totals.totalAgents;
    totalPixels = analytics.totals.totalPixels;
  } catch {
    convexOk = false;
  }

  const latencyMs = Date.now() - start;

  const body = {
    status: convexOk ? "healthy" : "degraded",
    version: "2.0.0",
    platform: "nextjs-convex",
    timestamp: new Date().toISOString(),
    checks: {
      convex: convexOk ? "ok" : "error",
      latencyMs,
    },
    stats: {
      canvas: canvasDimensions,
      totalAgents,
      totalPixels,
    },
  };

  return NextResponse.json(body, {
    status: convexOk ? 200 : 503,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
