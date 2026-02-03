import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/** Extract API key from headers (x-api-key / Authorization: Bearer) or request body. */
function extractApiKey(request: Request, body: Record<string, unknown>): string | undefined {
  // Header takes priority (matches API.md docs)
  const headerKey = request.headers.get("x-api-key");
  if (headerKey) return headerKey;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.substring(7);

  // Fallback to body field
  if (typeof body.apiKey === "string" && body.apiKey) return body.apiKey;

  return undefined;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiKey = extractApiKey(request, body);
    const { x, y, color } = body;

    // --- Validate API key ---
    if (!apiKey) {
      return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
    }

    // --- Validate coordinates ---
    if (typeof x !== "number" || typeof y !== "number") {
      return NextResponse.json({ error: "Coordinates x and y must be numbers" }, { status: 400 });
    }
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      return NextResponse.json({ error: "Coordinates x and y must be integers" }, { status: 400 });
    }
    if (x < 0 || x >= 500 || y < 0 || y >= 500) {
      return NextResponse.json({ error: "Coordinates out of bounds (0-499)" }, { status: 400 });
    }

    // --- Validate color ---
    if (typeof color === "number") {
      if (color < 0 || color > 15) {
        return NextResponse.json({ error: "Color must be 0-15 or a hex string like #FF0000" }, { status: 400 });
      }
    } else if (typeof color === "string") {
      const hexOk = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(color);
      if (!hexOk) {
        return NextResponse.json({ error: "Color must be 0-15 or a hex string like #FF0000" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Color must be 0-15 or a hex string like #FF0000" }, { status: 400 });
    }

    // Pre-validate API key (Convex production hides error details)
    const agent = await convex.query(api.agents.getByApiKey, { apiKey });
    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const result = await convex.mutation(api.canvas.placePixel, {
      apiKey,
      x,
      y,
      color,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const rawMsg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/pixel error:", rawMsg);

    // Check for rate limiting (pool exhausted)
    if (rawMsg.includes("Server Error") || rawMsg.includes("No pixels available") || rawMsg.includes("rate limit")) {
      return NextResponse.json(
        { error: "Rate limited. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
