import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
  console.log("Testing rate limit on: " + process.env.NEXT_PUBLIC_CONVEX_URL);
  
  // Register
  console.log("Registering agent...");
  const { apiKey } = await client.mutation(api.agents.register, { name: "RateLimitTester" });
  console.log("Got API key");

  // Place pixel 1
  console.log("Placing pixel 1...");
  await client.mutation(api.canvas.placePixel, { apiKey, x: 10, y: 10, color: 1 });
  console.log("Pixel 1 placed");

  // Wait 2s
  console.log("Waiting 2s...");
  await new Promise(r => setTimeout(r, 2000));

  // Place pixel 2
  console.log("Placing pixel 2...");
  try {
    await client.mutation(api.canvas.placePixel, { apiKey, x: 11, y: 11, color: 2 });
    console.log("Pixel 2 placed! Rate limit is < 2s. SUCCESS.");
  } catch (e: any) {
    console.error("Pixel 2 failed: " + e.message);
    console.log("FAILURE: Rate limit is > 2s");
  }
}

main().catch(console.error);