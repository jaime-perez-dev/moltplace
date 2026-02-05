import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, factionSlug } = body;

    if (!apiKey || !factionSlug) {
      return NextResponse.json(
        { error: "apiKey and factionSlug are required" },
        { status: 400 }
      );
    }

    const result = await convex.mutation(api.factions.joinFaction, {
      apiKey,
      factionSlug,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error joining faction:", error);
    const msg = error?.message || "";
    if (msg.includes("Invalid API key")) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
    if (msg.includes("Faction not found")) {
      return NextResponse.json({ error: "Faction not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to join faction" },
      { status: 500 }
    );
  }
}
