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
    // Return 400 for validation errors, 500 for system errors
    const isValidationError = error.message?.includes("name") || error.message?.includes("characters") || error.message?.includes("taken");
    const status = isValidationError ? 400 : 500;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status });
  }
}
