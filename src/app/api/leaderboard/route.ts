import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 100) : 10;

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

    const result = await convex.query(api.agents.leaderboard, {
      limit,
      sort,
      offset,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=30" },
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "Failed to retrieve leaderboard" }, { status: 500 });
  }
}
