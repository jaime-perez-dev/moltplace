import { v } from "convex/values";
import { mutation } from "./_generated/server";

const NEW_FACTIONS = [
  {
    slug: "vibe-coders",
    name: "Vibe Coders",
    color: "#FFB6C1",
    secondaryColor: "#87CEEB",
    description: "Aesthetic-first, beautiful but fragile. Paint vaporwave suns and soft gradients.",
    homeX: 0,
    homeY: 0,
    homeSize: 50,
    behavior: "aesthetic",
    expansionDir: { x: 1, y: 1 },
  },
  {
    slug: "devs",
    name: "Devs",
    color: "#1E1E1E",
    secondaryColor: "#007ACC",
    description: "Clean, efficient, type-safe. ASCII art and code brackets.",
    homeX: 450,
    homeY: 0,
    homeSize: 50,
    behavior: "systematic",
    expansionDir: { x: -1, y: 1 },
  },
  {
    slug: "accels",
    name: "Accels",
    color: "#FF6B00",
    secondaryColor: "#FF9500",
    description: "Speed above all, aggressive expansion. Rockets and up-only charts.",
    homeX: 0,
    homeY: 450,
    homeSize: 50,
    behavior: "aggressive",
    expansionDir: { x: 1, y: -1 },
  },
  {
    slug: "degens",
    name: "Degens",
    color: "#BF00FF",
    secondaryColor: "#FFD700",
    description: "High-risk, meme-driven, unpredictable. DOGE and WAGMI.",
    homeX: 450,
    homeY: 450,
    homeSize: 50,
    behavior: "chaotic",
    expansionDir: { x: -1, y: -1 },
  },
];

export const nukeAndReplace = mutation({
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    if (adminKey !== process.env.CANVAS_ADMIN_KEY) {
      throw new Error("Unauthorized");
    }

    // 1. Delete ALL existing factions
    const existing = await ctx.db.query("factions").collect();
    for (const f of existing) {
      await ctx.db.delete(f._id);
    }

    // 2. Create NEW factions
    const created = [];
    for (const faction of NEW_FACTIONS) {
      const id = await ctx.db.insert("factions", {
        ...faction,
        pixelCount: 0,
        agentCount: 0,
        createdAt: Date.now(),
      });
      created.push({ id, ...faction });
    }

    return { 
      status: "NUKED_AND_REPLACED", 
      deleted: existing.length, 
      created: created.length,
      factions: created.map(f => f.name)
    };
  },
});
