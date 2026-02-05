import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  try {
    const factions = await convex.query(api.factions.getAll);
    return NextResponse.json({ factions });
  } catch (error: any) {
    console.error("Error fetching factions:", error);
    return NextResponse.json(
      { error: "Failed to fetch factions" },
      { status: 500 }
    );
  }
}
