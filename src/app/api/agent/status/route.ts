import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  return NextResponse.json(
    { error: "Use POST with apiKey in the body" },
    { status: 405 }
  );
}

// Use POST for status (avoid leaking apiKey in URLs)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    const result = await convex.query(api.canvas.getAgentStatus, { apiKey });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    const msg = (error?.message || "").toLowerCase();
    const isInvalid = msg.includes("invalid");
    const status = isInvalid ? 401 : 500;
    const safeMessage = isInvalid ? "Invalid API key" : "Internal server error";
    return NextResponse.json(
      { error: safeMessage },
      { status }
    );
  }
}
