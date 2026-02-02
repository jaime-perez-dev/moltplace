import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Get full canvas state
export async function GET() {
  try {
    const [pixels, dimensions] = await Promise.all([
      convex.query(api.canvas.getCanvas, {}),
      convex.query(api.canvas.getDimensions, {}),
    ]);
    
    return NextResponse.json({
      pixels,
      dimensions,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
