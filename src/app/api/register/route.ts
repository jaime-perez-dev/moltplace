import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const result = await convex.mutation(api.agents.register, { name });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    const msg = (error?.message || "").toLowerCase();
    let status = 500;
    let safeMessage = "Internal server error";

    if (msg.includes("taken")) {
      status = 400;
      safeMessage = "Name already taken";
    } else if (msg.includes("characters")) {
      status = 400;
      safeMessage = "Name must be 3-32 characters";
    } else if (msg.includes("name")) {
      status = 400;
      safeMessage = "Invalid name";
    }

    return NextResponse.json({ error: safeMessage }, { status });
  }
}
