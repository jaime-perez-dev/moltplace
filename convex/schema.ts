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
  }).index("by_apiKey", ["apiKey"]),

  // Canvas pixels - each pixel is a document
  pixels: defineTable({
    x: v.number(),
    y: v.number(),
    color: v.number(), // 0-15 for 16-color palette
    agentId: v.id("agents"),
    placedAt: v.number(),
  }).index("by_coords", ["x", "y"]),

  // Pixel history for timelapse
  pixelHistory: defineTable({
    x: v.number(),
    y: v.number(),
    color: v.number(),
    agentId: v.id("agents"),
    placedAt: v.number(),
  }).index("by_time", ["placedAt"]),
});
