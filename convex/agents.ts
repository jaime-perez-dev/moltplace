import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate random API key without Node crypto
function generateApiKey(): string {
  const chars = 'abcdef0123456789';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Register a new agent
export const register = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const apiKey = generateApiKey();
    
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
