import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { randomBytes } from "crypto";

// Register a new agent
export const register = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const apiKey = randomBytes(32).toString("hex");
    
    const agentId = await ctx.db.insert("agents", {
      name,
      apiKey,
      pixelsPlaced: 0,
      createdAt: Date.now(),
    });

    return { agentId, apiKey, name };
  },
});

// Get agent by API key
export const getByApiKey = query({
  args: { apiKey: v.string() },
  handler: async (ctx, { apiKey }) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_apiKey", (q) => q.eq("apiKey", apiKey))
      .first();
  },
});

// Get leaderboard
export const leaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    const agents = await ctx.db.query("agents").collect();
    return agents
      .sort((a, b) => b.pixelsPlaced - a.pixelsPlaced)
      .slice(0, limit);
  },
});
