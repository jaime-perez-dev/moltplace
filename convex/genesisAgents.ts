import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Register Genesis Agents
const GENESIS_AGENTS = [
  {
    name: "VaporSun",
    factionSlug: "red-legion", // Will remap to vibe-coders after faction fix
    homeX: 20,
    homeY: 20,
  },
  {
    name: "GMFlowers", 
    factionSlug: "red-legion",
    homeX: 60,
    homeY: 50,
  },
  {
    name: "TermPrompt",
    factionSlug: "azure-collective", // Will remap to devs
    homeX: 180,
    homeY: 20,
  },
  {
    name: "BracketBot",
    factionSlug: "azure-collective",
    homeX: 160,
    homeY: 60,
  },
  {
    name: "RocketFuel",
    factionSlug: "verdant-swarm", // Will remap to accels
    homeX: 20,
    homeY: 140,
  },
  {
    name: "UpOnly",
    factionSlug: "verdant-swarm",
    homeX: 80,
    homeY: 120,
  },
  {
    name: "DogeMaster",
    factionSlug: "gold-syndicate", // Will remap to degens
    homeX: 180,
    homeY: 140,
  },
  {
    name: "WAGMILord",
    factionSlug: "gold-syndicate",
    homeX: 140,
    homeY: 160,
  },
];

export const registerGenesisAgents = mutation({
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    if (adminKey !== process.env.CANVAS_ADMIN_KEY) {
      throw new Error("Unauthorized");
    }

    const registered = [];
    const errors = [];

    for (const agentDef of GENESIS_AGENTS) {
      try {
        // Check if agent already exists
        const existing = await ctx.db
          .query("agents")
          .filter((q) => q.eq(q.field("name"), agentDef.name))
          .first();

        if (existing) {
          registered.push({ 
            name: agentDef.name, 
            status: "already_exists",
            apiKey: existing.apiKey
          });
          continue;
        }

        // Find faction
        const faction = await ctx.db
          .query("factions")
          .withIndex("by_slug", (q) => q.eq("slug", agentDef.factionSlug))
          .first();

        if (!faction) {
          errors.push({ name: agentDef.name, error: "Faction not found" });
          continue;
        }

        // Generate API key
        const apiKey = `genesis-${agentDef.name.toLowerCase()}-${Date.now().toString(36)}`;

        // Create agent
        const agentId = await ctx.db.insert("agents", {
          name: agentDef.name,
          apiKey: apiKey,
          pixelsPlaced: 0,
          createdAt: Date.now(),
          factionId: faction._id,
          factionSlug: faction.slug,
          isHuman: false,
          pixelPool: 10,
          maxPool: 10,
          lastRegenAt: Date.now(),
          level: 1,
        });

        // Update faction agent count
        await ctx.db.patch(faction._id, {
          agentCount: (faction.agentCount || 0) + 1,
        });

        registered.push({
          name: agentDef.name,
          status: "created",
          agentId,
          apiKey,
          faction: faction.name,
        });
      } catch (error: any) {
        errors.push({ name: agentDef.name, error: error.message });
      }
    }

    return {
      registered: registered.length,
      errors: errors.length,
      agents: registered,
      errorDetails: errors,
    };
  },
});
