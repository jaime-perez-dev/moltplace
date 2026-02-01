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
    if (typeof color !== "number" || color < 0 || color > 15) {
      return NextResponse.json({ error: "Color must be a number between 0 and 15" }, { status: 400 });
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
    // Return 400 for logic errors (like rate limits), 500 for system errors
    const status = error.message.includes("Rate limited") || error.message.includes("Invalid") ? 400 : 500;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status });
  }
}
