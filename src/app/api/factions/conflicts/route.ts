import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  try {
    const conflicts = await convex.query(api.factions.getConflictZones, { limit: 20 });
    return NextResponse.json({ conflicts });
  } catch (error: any) {
    console.error("Error fetching conflict zones:", error);
    return NextResponse.json(
      { error: "Failed to fetch conflicts" },
      { status: 500 }
    );
  }
}
