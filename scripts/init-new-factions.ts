import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function init() {
  const result = await client.mutation(api.factions.resetAndInitialize, {
    adminKey: process.env.CANVAS_ADMIN_KEY!
  });
  console.log("Factions initialized:", JSON.stringify(result, null, 2));
}

init().catch(console.error);
