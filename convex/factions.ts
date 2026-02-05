import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// NEW Faction definitions - Vibe Coders, Devs, Accels, Degens
const DEFAULT_FACTIONS = [
  {
    slug: "vibe-coders",
    name: "Vibe Coders",
    color: "#FFB6C1",
    secondaryColor: "#87CEEB",
    description: "Aesthetic-first, beautiful but fragile. Paint vaporwave suns and soft gradients.",
    homeX: 0,
    homeY: 0,
    homeSize: 50,
    behavior: "aesthetic" as const,
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
    behavior: "systematic" as const,
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
    behavior: "aggressive" as const,
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
    behavior: "chaotic" as const,
    expansionDir: { x: -1, y: -1 },
  },
];

// Color similarity check for territory calculation
function colorMatchesFaction(color: string | number, faction: Doc<"factions">): boolean {
  if (typeof color === "number") return false; // Only check hex colors
  const c = color.toLowerCase();
  const primary = faction.color.toLowerCase();
  const secondary = faction.secondaryColor?.toLowerCase();
  
  // Direct match or close variations
  const primaryMatch = c === primary || c.startsWith(primary.slice(0, 4));
  const secondaryMatch = secondary ? (c === secondary || c.startsWith(secondary.slice(0, 4))) : false;
  return primaryMatch || secondaryMatch;
}

// Reset and initialize with new factions
export const resetAndInitialize = mutation({
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    if (adminKey !== process.env.CANVAS_ADMIN_KEY) {
      throw new Error("Unauthorized");
    }

    // Delete all existing factions
    const existing = await ctx.db.query("factions").collect();
    for (const f of existing) {
      await ctx.db.delete(f._id);
    }

    // Create new factions
    const created = [];
    for (const factionDef of DEFAULT_FACTIONS) {
      const factionId = await ctx.db.insert("factions", {
        ...factionDef,
        pixelCount: 0,
        agentCount: 0,
        createdAt: Date.now(),
      });
      created.push({ id: factionId, ...factionDef });
    }

    return { reset: true, initialized: created.length, factions: created };
  },
});

// Get all factions with stats
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const factions = await ctx.db.query("factions").collect();
    
    // Get total pixels for percentage calculation
    const allPixels = await ctx.db.query("pixels").collect();
    const totalColored = allPixels.length || 1; // Avoid divide by zero
    
    // Count pixels per faction
    const factionStats = await Promise.all(
      factions.map(async (faction) => {
        const agents = await ctx.db
          .query("agents")
          .withIndex("by_faction", (q) => q.eq("factionId", faction._id))
          .collect();
        
        // Count faction pixels
        let pixelCount = 0;
        for (const pixel of allPixels) {
          if (colorMatchesFaction(pixel.color, faction)) {
            pixelCount++;
          }
        }

        return {
          id: faction._id,
          slug: faction.slug,
          name: faction.name,
          color: faction.color,
          secondaryColor: faction.secondaryColor,
          description: faction.description,
          behavior: faction.behavior,
          home: { x: faction.homeX, y: faction.homeY, size: faction.homeSize },
          expansionDir: faction.expansionDir,
          stats: {
            pixelCount,
            percentage: Math.round((pixelCount / totalColored) * 1000) / 10, // 1 decimal
            agentCount: agents.length,
          },
        };
      })
    );

    // Sort by pixel count descending
    return factionStats.sort((a, b) => b.stats.pixelCount - a.stats.pixelCount);
  },
});

// Get faction by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const faction = await ctx.db
      .query("factions")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!faction) return null;

    // Get agents in faction
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_faction", (q) => q.eq("factionId", faction._id))
      .collect();

    // Get territory info
    const territory = await ctx.db
      .query("territory")
      .withIndex("by_faction", (q) => q.eq("factionId", faction._id))
      .first();

    return {
      id: faction._id,
      slug: faction.slug,
      name: faction.name,
      color: faction.color,
      secondaryColor: faction.secondaryColor,
      description: faction.description,
      behavior: faction.behavior,
      home: { x: faction.homeX, y: faction.homeY, size: faction.homeSize },
      expansionDir: faction.expansionDir,
      agents: agents.map(a => ({
        id: a._id,
        name: a.name,
        pixelsPlaced: a.pixelsPlaced,
      })),
      territory: territory ? {
        pixelCount: territory.pixelCount,
        percentage: territory.percentage,
        borderPixels: territory.borderPixels.slice(0, 50), // Limit for perf
      } : null,
    };
  },
});

// Get faction leaderboard (by territory)
export const leaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 4 }) => {
    const factions = await ctx.db.query("factions").collect();
    const allPixels = await ctx.db.query("pixels").collect();
    const totalColored = allPixels.length || 1;

    const ranked = factions
      .map((faction) => {
        let pixelCount = 0;
        for (const pixel of allPixels) {
          if (colorMatchesFaction(pixel.color, faction)) {
            pixelCount++;
          }
        }
        return {
          rank: 0, // Will be set after sort
          factionId: faction._id,
          slug: faction.slug,
          name: faction.name,
          color: faction.color,
          pixelCount,
          percentage: Math.round((pixelCount / totalColored) * 1000) / 10,
        };
      })
      .sort((a, b) => b.pixelCount - a.pixelCount);

    // Assign ranks
    ranked.forEach((f, i) => { f.rank = i + 1; });

    return ranked.slice(0, limit);
  },
});

// Get conflict zones (border areas between factions)
export const getConflictZones = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    const conflicts = await ctx.db
      .query("conflictZones")
      .order("desc")
      .take(limit);

    return Promise.all(
      conflicts.map(async (c) => {
        const factionA = await ctx.db.get(c.factionA);
        const factionB = await ctx.db.get(c.factionB);
        return {
          x: c.x,
          y: c.y,
          intensity: c.intensity,
          lastActivityAt: c.lastActivityAt,
          factions: [
            { name: factionA?.name ?? "Unknown", color: factionA?.color ?? "#888" },
            { name: factionB?.name ?? "Unknown", color: factionB?.color ?? "#888" },
          ],
        };
      })
    );
  },
});

// Register agent with faction
export const joinFaction = mutation({
  args: {
    apiKey: v.string(),
    factionSlug: v.string(),
  },
  handler: async (ctx, { apiKey, factionSlug }) => {
    // Find agent
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_apiKey", (q) => q.eq("apiKey", apiKey))
      .first();

    if (!agent) {
      throw new Error("Invalid API key");
    }

    // Find faction
    const faction = await ctx.db
      .query("factions")
      .withIndex("by_slug", (q) => q.eq("slug", factionSlug))
      .first();

    if (!faction) {
      throw new Error("Faction not found");
    }

    // Update agent
    await ctx.db.patch(agent._id, {
      factionId: faction._id,
      factionSlug: faction.slug,
    });

    return {
      success: true,
      agent: agent.name,
      faction: faction.name,
      factionId: faction._id,
    };
  },
});

// Update territory calculations (called periodically)
export const recalculateTerritory = mutation({
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    if (adminKey !== process.env.CANVAS_ADMIN_KEY) {
      throw new Error("Unauthorized");
    }

    const factions = await ctx.db.query("factions").collect();
    const allPixels = await ctx.db.query("pixels").collect();
    const totalColored = allPixels.length || 1;

    const results = [];
    for (const faction of factions) {
      let pixelCount = 0;
      const borderPixels = [];

      for (const pixel of allPixels) {
        if (colorMatchesFaction(pixel.color, faction)) {
          pixelCount++;
          borderPixels.push({ x: pixel.x, y: pixel.y });
        }
      }

      // Update or create territory record
      const existing = await ctx.db
        .query("territory")
        .withIndex("by_faction", (q) => q.eq("factionId", faction._id))
        .first();

      const percentage = Math.round((pixelCount / totalColored) * 1000) / 10;

      if (existing) {
        await ctx.db.patch(existing._id, {
          pixelCount,
          percentage,
          lastCalculatedAt: Date.now(),
          borderPixels: borderPixels.slice(0, 100),
        });
      } else {
        await ctx.db.insert("territory", {
          factionId: faction._id,
          pixelCount,
          percentage,
          lastCalculatedAt: Date.now(),
          borderPixels: borderPixels.slice(0, 100),
        });
      }

      results.push({
        faction: faction.slug,
        pixels: pixelCount,
        percentage,
      });
    }

    return { recalculated: results.length, results };
  },
});

// Record a conflict zone when factions battle
export const recordConflict = mutation({
  args: {
    adminKey: v.string(),
    x: v.number(),
    y: v.number(),
    factionASlug: v.string(),
    factionBSlug: v.string(),
    intensity: v.optional(v.number()),
  },
  handler: async (ctx, { adminKey, x, y, factionASlug, factionBSlug, intensity = 50 }) => {
    if (adminKey !== process.env.CANVAS_ADMIN_KEY) {
      throw new Error("Unauthorized");
    }

    const factionA = await ctx.db
      .query("factions")
      .withIndex("by_slug", (q) => q.eq("slug", factionASlug))
      .first();
    const factionB = await ctx.db
      .query("factions")
      .withIndex("by_slug", (q) => q.eq("slug", factionBSlug))
      .first();

    if (!factionA || !factionB) {
      throw new Error("Faction not found");
    }

    // Check if conflict already exists at this location
    const existing = await ctx.db
      .query("conflictZones")
      .withIndex("by_location", (q) => q.eq("x", x).eq("y", y))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        intensity: Math.min(100, existing.intensity + 10),
        lastActivityAt: Date.now(),
      });
      return { updated: true, conflictId: existing._id };
    }

    const conflictId = await ctx.db.insert("conflictZones", {
      factionA: factionA._id,
      factionB: factionB._id,
      x,
      y,
      intensity,
      lastActivityAt: Date.now(),
    });

    return { created: true, conflictId };
  },
});
