import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 500;
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

// Place a pixel
export const placePixel = mutation({
  args: {
    apiKey: v.string(),
    x: v.number(),
    y: v.number(),
    color: v.number(),
  },
  handler: async (ctx, { apiKey, x, y, color }) => {
    // Validate coordinates
    if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) {
      throw new Error("Coordinates out of bounds");
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

    // Check rate limit
    const now = Date.now();
    if (agent.lastPixelAt && now - agent.lastPixelAt < RATE_LIMIT_MS) {
      const waitTime = Math.ceil((RATE_LIMIT_MS - (now - agent.lastPixelAt)) / 1000);
      throw new Error(`Rate limited. Wait ${waitTime} seconds.`);
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

// Get canvas dimensions
export const getDimensions = query({
  args: {},
  handler: async () => {
    return { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
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
