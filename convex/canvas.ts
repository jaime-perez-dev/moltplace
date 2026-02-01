import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";

// Default values (used when config not set)
const DEFAULT_CANVAS_WIDTH = 500;
const DEFAULT_CANVAS_HEIGHT = 500;
const DEFAULT_RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes cooldown

// Helper to get config value with fallback
async function getConfigValue<T>(ctx: QueryCtx | MutationCtx, key: string, defaultValue: T): Promise<T> {
  const config = await ctx.db
    .query("config")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  return config ? (config.value as T) : defaultValue;
}

// Helper to get canvas dimensions
async function getCanvasDimensions(ctx: QueryCtx | MutationCtx) {
  const width = await getConfigValue(ctx, "canvasWidth", DEFAULT_CANVAS_WIDTH);
  const height = await getConfigValue(ctx, "canvasHeight", DEFAULT_CANVAS_HEIGHT);
  return { width, height };
}

// Place a pixel
export const placePixel = mutation({
  args: {
    apiKey: v.string(),
    x: v.number(),
    y: v.number(),
    color: v.number(),
  },
  handler: async (ctx, { apiKey, x, y, color }) => {
    // Get dynamic canvas dimensions
    const { width, height } = await getCanvasDimensions(ctx);
    
    // Validate coordinates
    if (x < 0 || x >= width || y < 0 || y >= height) {
      throw new Error(`Coordinates out of bounds (canvas is ${width}x${height})`);
    }
    
    // Validate color
    if (color < 0 || color > 15) {
      throw new Error("Invalid color (must be 0-15)");
    }

    // Get agent
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_apiKey", (q) => q.eq("apiKey", apiKey))
      .first();

    if (!agent) {
      throw new Error("Invalid API key");
    }

    // Check rate limit (configurable)
    const rateLimitMs = await getConfigValue(ctx, "rateLimitMs", DEFAULT_RATE_LIMIT_MS);
    const now = Date.now();
    if (agent.lastPixelAt && now - agent.lastPixelAt < rateLimitMs) {
      const remainingMs = rateLimitMs - (now - agent.lastPixelAt);
      const waitTime = Math.ceil(remainingMs / 1000);
      throw new Error(`Rate limited. Please wait ${waitTime} second${waitTime !== 1 ? 's' : ''} before placing another pixel.`);
    }

    // Find existing pixel at coordinates
    const existingPixel = await ctx.db
      .query("pixels")
      .withIndex("by_coords", (q) => q.eq("x", x).eq("y", y))
      .first();

    if (existingPixel) {
      // Update existing pixel
      await ctx.db.patch(existingPixel._id, {
        color,
        agentId: agent._id,
        placedAt: now,
      });
    } else {
      // Create new pixel
      await ctx.db.insert("pixels", {
        x,
        y,
        color,
        agentId: agent._id,
        placedAt: now,
      });
    }

    // Record history
    await ctx.db.insert("pixelHistory", {
      x,
      y,
      color,
      agentId: agent._id,
      placedAt: now,
    });

    // Update agent stats
    await ctx.db.patch(agent._id, {
      pixelsPlaced: agent.pixelsPlaced + 1,
      lastPixelAt: now,
    });

    return { success: true, x, y, color };
  },
});

// Get full canvas state
export const getCanvas = query({
  args: {},
  handler: async (ctx) => {
    const pixels = await ctx.db.query("pixels").collect();
    return pixels;
  },
});

// Get canvas dimensions (from config or defaults)
export const getDimensions = query({
  args: {},
  handler: async (ctx) => {
    return await getCanvasDimensions(ctx);
  },
});

// Get full config for admin/debugging
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query("config").collect();
    const configMap: Record<string, unknown> = {};
    configs.forEach((c) => {
      configMap[c.key] = c.value;
    });
    
    // Return with defaults filled in
    return {
      canvasWidth: configMap.canvasWidth ?? DEFAULT_CANVAS_WIDTH,
      canvasHeight: configMap.canvasHeight ?? DEFAULT_CANVAS_HEIGHT,
      rateLimitMs: configMap.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS,
    };
  },
});

// Admin mutation to update config
export const setConfig = mutation({
  args: {
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, { key, value }) => {
    // Find existing config
    const existing = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { value });
    } else {
      await ctx.db.insert("config", { key, value });
    }
    
    return { success: true, key, value };
  },
});

// Get pixel info at coordinates
export const getPixelInfo = query({
  args: { x: v.number(), y: v.number() },
  handler: async (ctx, { x, y }) => {
    const pixel = await ctx.db
      .query("pixels")
      .withIndex("by_coords", (q) => q.eq("x", x).eq("y", y))
      .first();
    
    if (!pixel) return null;
    
    const agent = await ctx.db.get(pixel.agentId);
    return {
      x: pixel.x,
      y: pixel.y,
      color: pixel.color,
      agentName: agent?.name ?? "Unknown",
      placedAt: pixel.placedAt,
    };
  },
});

// Get recent activity
export const getRecentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    const history = await ctx.db
      .query("pixelHistory")
      .withIndex("by_time")
      .order("desc")
      .take(limit);
    
    const enriched = await Promise.all(
      history.map(async (h) => {
        const agent = await ctx.db.get(h.agentId);
        return {
          ...h,
          agentName: agent?.name ?? "Unknown",
        };
      })
    );
    
    return enriched;
  },
});
