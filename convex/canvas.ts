import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";

// Default values (used when config not set)
const DEFAULT_CANVAS_WIDTH = 500;
const DEFAULT_CANVAS_HEIGHT = 500;
const DEFAULT_RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes cooldown

// Pool system defaults
const DEFAULT_POOL_SIZE = 10;
const DEFAULT_MAX_POOL = 10;
const REGEN_RATE_MS = 5 * 60 * 1000; // 1 pixel per 5 minutes

// Helper to calculate current pool with regeneration
function calculateCurrentPool(
  lastPool: number,
  maxPool: number,
  lastRegenAt: number,
  now: number
): { pool: number; newRegenAt: number } {
  const elapsed = now - lastRegenAt;
  const regenAmount = Math.floor(elapsed / REGEN_RATE_MS);
  const newPool = Math.min(lastPool + regenAmount, maxPool);
  // Move lastRegenAt forward by the time consumed by regen (not to now)
  const newRegenAt = lastRegenAt + regenAmount * REGEN_RATE_MS;
  return { pool: newPool, newRegenAt };
}

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
    color: v.union(v.number(), v.string()),
  },
  handler: async (ctx, { apiKey, x, y, color }) => {
    // Get dynamic canvas dimensions
    const { width, height } = await getCanvasDimensions(ctx);
    
    // Validate coordinates
    if (x < 0 || x >= width || y < 0 || y >= height) {
      throw new Error(`Coordinates out of bounds (canvas is ${width}x${height})`);
    }
    
    // Validate color
    if (typeof color === "number") {
      if (color < 0 || color > 15) {
        throw new Error("Invalid color (use 0-15 or hex like #FF0000)");
      }
    } else {
      const hexOk = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(color);
      if (!hexOk) {
        throw new Error("Invalid color (use 0-15 or hex like #FF0000)");
      }
    }

    // Get agent
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_apiKey", (q) => q.eq("apiKey", apiKey))
      .first();

    if (!agent) {
      throw new Error("Invalid API key");
    }

    const now = Date.now();
    
    // Initialize pool if not set (for existing agents)
    const currentStoredPool = agent.pixelPool ?? DEFAULT_POOL_SIZE;
    const maxPool = agent.maxPool ?? DEFAULT_MAX_POOL;
    const lastRegenAt = agent.lastRegenAt ?? now;
    
    // Calculate current pool with regeneration
    const { pool: currentPool, newRegenAt } = calculateCurrentPool(
      currentStoredPool,
      maxPool,
      lastRegenAt,
      now
    );
    
    // Check if agent has pixels available
    if (currentPool <= 0) {
      // Calculate when next pixel will be available
      const nextRegenAt = newRegenAt + REGEN_RATE_MS;
      const waitMs = nextRegenAt - now;
      const waitSeconds = Math.ceil(waitMs / 1000);
      throw new Error(`No pixels available. Next pixel regenerates in ${waitSeconds} seconds.`);
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

    // Update agent stats and pool
    const newPoolAfterPlace = currentPool - 1;
    await ctx.db.patch(agent._id, {
      pixelsPlaced: agent.pixelsPlaced + 1,
      lastPixelAt: now,
      pixelPool: newPoolAfterPlace,
      lastRegenAt: newRegenAt,
      maxPool: maxPool, // Ensure maxPool is set
    });

    // Calculate next regen time for response
    const nextRegenAt = newPoolAfterPlace < maxPool ? newRegenAt + REGEN_RATE_MS : null;

    return { 
      success: true, 
      x, 
      y, 
      color,
      pool: {
        remaining: newPoolAfterPlace,
        max: maxPool,
        nextRegenAt,
      }
    };
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

// Get canvas updates since a timestamp
export const getCanvasSince = query({
  args: { since: v.number(), limit: v.optional(v.number()) },
  handler: async (ctx, { since, limit = 10000 }) => {
    const history = await ctx.db
      .query("pixelHistory")
      .withIndex("by_time", (q) => q.gt("placedAt", since))
      .order("asc")
      .take(limit);
    return history;
  },
});

// Get canvas metadata (for caching)
export const getCanvasMeta = query({
  args: {},
  handler: async (ctx) => {
    const latest = await ctx.db
      .query("pixelHistory")
      .withIndex("by_time")
      .order("desc")
      .take(1);
    return { lastPlacedAt: latest[0]?.placedAt ?? 0 };
  },
});

// Admin: clear canvas + history
export const clearCanvas = mutation({
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    if (adminKey !== process.env.CANVAS_ADMIN_KEY) {
      throw new Error("Unauthorized");
    }
    const pixels = await ctx.db.query("pixels").collect();
    for (const p of pixels) {
      await ctx.db.delete(p._id);
    }
    const history = await ctx.db.query("pixelHistory").collect();
    for (const h of history) {
      await ctx.db.delete(h._id);
    }
    return { pixelsDeleted: pixels.length, historyDeleted: history.length };
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

// Get agent status (pool info)
export const getAgentStatus = query({
  args: { apiKey: v.string() },
  handler: async (ctx, { apiKey }) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_apiKey", (q) => q.eq("apiKey", apiKey))
      .first();

    if (!agent) {
      throw new Error("Invalid API key");
    }

    const now = Date.now();
    
    // Get pool values with defaults
    const currentStoredPool = agent.pixelPool ?? DEFAULT_POOL_SIZE;
    const maxPool = agent.maxPool ?? DEFAULT_MAX_POOL;
    const lastRegenAt = agent.lastRegenAt ?? now;
    
    // Calculate current pool with regeneration
    const { pool: currentPool, newRegenAt } = calculateCurrentPool(
      currentStoredPool,
      maxPool,
      lastRegenAt,
      now
    );
    
    // Calculate next regen time
    const nextRegenAt = currentPool < maxPool ? newRegenAt + REGEN_RATE_MS : null;
    
    return {
      name: agent.name,
      pixelsPlaced: agent.pixelsPlaced,
      pool: {
        remaining: currentPool,
        max: maxPool,
        nextRegenAt,
        regenRateMs: REGEN_RATE_MS,
      },
      level: agent.level ?? 1,
      faction: agent.faction ?? null,
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
