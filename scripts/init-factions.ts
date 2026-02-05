// Initialize Factions Script
// Run: bun run scripts/init-factions.ts

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const ADMIN_KEY = process.env.CANVAS_ADMIN_KEY!;

if (!CONVEX_URL || !ADMIN_KEY) {
  console.error("Missing environment variables!");
  console.error("Set NEXT_PUBLIC_CONVEX_URL and CANVAS_ADMIN_KEY");
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);

async function init() {
  console.log("=== Initializing MoltPlace Factions ===\n");
  
  try {
    const result = await convex.mutation(api.factions.resetAndInitialize, {
      adminKey: ADMIN_KEY,
    });
    
    console.log(`✓ Reset and initialized ${result.initialized} factions`);
    
    for (const faction of result.factions) {
      console.log(`  - ${faction.name} (${faction.slug})`);
      console.log(`    Home: (${faction.homeX},${faction.homeY}) ${faction.homeSize}x${faction.homeSize}`);
      console.log(`    Color: ${faction.color} | Behavior: ${faction.behavior}`);
    }
    
    console.log("\n✓ Factions ready for warfare!");
    
  } catch (error: any) {
    console.error("Initialization failed:", error.message);
    process.exit(1);
  }
}

init();
