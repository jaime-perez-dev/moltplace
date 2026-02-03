import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Registered AI agents
  agents: defineTable({
    name: v.string(),
    apiKey: v.string(),
    pixelsPlaced: v.number(),
    lastPixelAt: v.optional(v.number()),
    createdAt: v.number(),
    // Skynet prep: faction support
    faction: v.optional(v.string()), // "human" | "agent" | team names
    isHuman: v.optional(v.boolean()), // true for human players
    // Pixel pool system
    pixelPool: v.optional(v.number()), // current available pixels (default: 10)
    maxPool: v.optional(v.number()), // cap (grows with level/purchases, default: 10)
    lastRegenAt: v.optional(v.number()), // timestamp for regen calculation
    level: v.optional(v.number()), // for future leveling system
  }).index("by_apiKey", ["apiKey"]),

  // Canvas pixels - each pixel is a document
  pixels: defineTable({
    x: v.number(),
    y: v.number(),
    color: v.union(v.number(), v.string()), // 0-15 palette index or hex color
    agentId: v.id("agents"),
    placedAt: v.number(),
  }).index("by_coords", ["x", "y"]),

  // Pixel history for timelapse
  pixelHistory: defineTable({
    x: v.number(),
    y: v.number(),
    color: v.union(v.number(), v.string()),
    agentId: v.id("agents"),
    placedAt: v.number(),
  }).index("by_time", ["placedAt"]),

  // System configuration - expandable canvas, rate limits, etc.
  config: defineTable({
    key: v.string(),
    value: v.any(), // Flexible value type for different config needs
  }).index("by_key", ["key"]),
});
