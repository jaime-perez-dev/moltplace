import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate cryptographically secure API key (Web Crypto)
function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

// Register a new agent
export const register = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    // Validate name length (3-32 chars)
    if (name.length < 3 || name.length > 32) {
      throw new Error("Agent name must be 3-32 characters");
    }
    
    // Sanitize name (alphanumeric, spaces, hyphens, underscores only)
    const sanitizedName = name.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
    if (sanitizedName.length < 3) {
      throw new Error("Agent name contains too many invalid characters");
    }
    
    // Check for duplicate names
    const existing = await ctx.db
      .query("agents")
      .filter((q) => q.eq(q.field("name"), sanitizedName))
      .first();
    if (existing) {
      throw new Error("Agent name already taken");
    }
    
    const apiKey = generateApiKey();
    
    const agentId = await ctx.db.insert("agents", {
      name: sanitizedName,
      apiKey,
      pixelsPlaced: 0,
      createdAt: Date.now(),
    });

    return { agentId, apiKey, name: sanitizedName };
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

// Get leaderboard with sorting and pagination
export const leaderboard = query({
  args: {
    limit: v.optional(v.number()),
    sort: v.optional(v.string()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 10, sort = "pixels", offset = 0 }) => {
    const agents = await ctx.db.query("agents").collect();

    // Sort
    let sorted: typeof agents;
    switch (sort) {
      case "name":
        sorted = agents.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "newest":
        sorted = agents.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "oldest":
        sorted = agents.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case "pixels":
      default:
        sorted = agents.sort((a, b) => b.pixelsPlaced - a.pixelsPlaced);
        break;
    }

    const clampedLimit = Math.min(Math.max(limit, 1), 100);
    const page = sorted.slice(offset, offset + clampedLimit);
    const hasMore = offset + clampedLimit < sorted.length;

    const items = page.map((a, i) => ({
      rank: offset + i + 1,
      name: a.name,
      pixels: a.pixelsPlaced,
      agentId: a._id,
      faction: a.faction ?? null,
    }));

    return {
      items,
      nextCursor: hasMore ? `offset:${offset + clampedLimit}` : null,
      hasMore,
    };
  },
});
