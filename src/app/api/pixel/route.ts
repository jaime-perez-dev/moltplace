import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, x, y, color } = body;

    // Validate inputs
    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }
    if (typeof x !== "number" || typeof y !== "number") {
      return NextResponse.json({ error: "Coordinates x and y must be numbers" }, { status: 400 });
    }
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      return NextResponse.json({ error: "Coordinates x and y must be integers" }, { status: 400 });
    }
    if (x < 0 || x >= 500 || y < 0 || y >= 500) {
      return NextResponse.json({ error: "Coordinates out of bounds (0-499)" }, { status: 400 });
    }
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
  } catch (error: any) {
    console.error(error);
    let status = 500;
    const headers: Record<string, string> = {};
    const msg = error?.message || "";
    let safeMessage = "Internal server error";

    if (msg.includes("No pixels available") || msg.includes("Rate limited")) {
      status = 429; // Too Many Requests
      const match = msg.match(/(\d+) seconds?/);
      if (match) {
        headers["Retry-After"] = match[1];
        safeMessage = `Rate limited. Try again in ${match[1]} seconds.`;
      } else {
        safeMessage = "Rate limited. Please try again later.";
      }
    } else if (msg.includes("Invalid API key") || msg.includes("unauthorized")) {
      status = 401;
      safeMessage = "Invalid API key";
    } else if (msg.includes("Invalid") || msg.includes("out of bounds")) {
      status = 400; // Bad Request
      safeMessage = "Invalid request";
    }

    return NextResponse.json(
      { error: safeMessage },
      { status, headers }
    );
  }
}
