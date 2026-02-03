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

    const result = await convex.mutation(api.canvas.placePixel, {
      apiKey,
      x,
      y,
      color,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    // Normalize the error message (Convex wraps errors with extra context)
    const rawMsg = error instanceof Error ? error.message : String(error);
    const msg = rawMsg.toLowerCase();
    console.error("POST /api/pixel error:", rawMsg);

    let status = 500;
    const headers: Record<string, string> = {};
    let safeMessage = "Internal server error";

    if (msg.includes("no pixels available") || msg.includes("rate limit")) {
      status = 429;
      const match = rawMsg.match(/(\d+)\s*seconds?/);
      if (match) {
        headers["Retry-After"] = match[1];
        safeMessage = `Rate limited. Try again in ${match[1]} seconds.`;
      } else {
        safeMessage = "Rate limited. Please try again later.";
      }
    } else if (msg.includes("invalid api key") || msg.includes("unauthorized")) {
      status = 401;
      safeMessage = "Invalid API key";
    } else if (
      msg.includes("invalid") ||
      msg.includes("out of bounds") ||
      msg.includes("must be")
    ) {
      status = 400;
      safeMessage = "Invalid request";
    }

    return NextResponse.json({ error: safeMessage }, { status, headers });
  }
}
