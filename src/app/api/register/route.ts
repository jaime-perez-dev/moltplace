import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { getClientIp, rateLimit } from "../../../lib/rateLimit";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(ip, 5, 60 * 60 * 1000); // 5 registrations/hour/IP
    if (!rl.ok) {
      const retryAfter = Math.ceil(rl.resetIn / 1000);
      return NextResponse.json(
        { error: "Rate limited. Try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

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
