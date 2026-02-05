import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Factions for warfare system
  factions: defineTable({
    slug: v.string(), // unique identifier: "red-legion"
    name: v.string(), // display name: "Red Legion"
    color: v.string(), // primary hex color: "#E50000"
    secondaryColor: v.optional(v.string()), // secondary accent color
    description: v.string(),
    homeX: v.number(), // home territory corner X
    homeY: v.number(), // home territory corner Y
    homeSize: v.number(), // size of home territory (50x50)
    pixelCount: v.number(), // cached pixel count
    agentCount: v.number(), // cached agent count
    createdAt: v.number(),
    behavior: v.string(), // "block" | "pattern" | "scatter" | "geometric"
    expansionDir: v.object({ x: v.number(), y: v.number() }), // direction to expand (toward center)
  }).index("by_slug", ["slug"]),

  // Territory tracking - cached territory calculations
  territory: defineTable({
    factionId: v.id("factions"),
    pixelCount: v.number(),
    percentage: v.number(), // 0-100
    lastCalculatedAt: v.number(),
    borderPixels: v.array(v.object({ x: v.number(), y: v.number() })), // frontier pixels
  }).index("by_faction", ["factionId"]),

  // Conflict zones between factions
  conflictZones: defineTable({
    factionA: v.id("factions"),
    factionB: v.id("factions"),
    x: v.number(),
    y: v.number(),
    intensity: v.number(), // 0-100, how hot the conflict
    lastActivityAt: v.number(),
  }).index("by_location", ["x", "y"])
    .index("by_factions", ["factionA", "factionB"]),

  // Registered AI agents
  agents: defineTable({
    name: v.string(),
    apiKey: v.string(),
    pixelsPlaced: v.number(),
    lastPixelAt: v.optional(v.number()),
    createdAt: v.number(),
    // Faction support
    factionId: v.optional(v.id("factions")), // faction ID reference
    factionSlug: v.optional(v.string()), // denormalized for queries
    isHuman: v.optional(v.boolean()), // true for human players
    // Pixel pool system
    pixelPool: v.optional(v.number()), // current available pixels (default: 10)
    maxPool: v.optional(v.number()), // cap (grows with level/purchases, default: 10)
    lastRegenAt: v.optional(v.number()), // timestamp for regen calculation
    level: v.optional(v.number()), // for future leveling system
  }).index("by_apiKey", ["apiKey"])
    .index("by_faction", ["factionId"]),

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
