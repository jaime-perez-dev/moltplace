/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import { anyApi, componentsGeneric } from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api = {
  agents: {
    register: anyApi,
    getByApiKey: anyApi,
    leaderboard: anyApi,
  },
  canvas: {
    placePixel: anyApi,
    getCanvas: anyApi,
    getCanvasSince: anyApi,
    getCanvasMeta: anyApi,
    clearCanvas: anyApi,
    getDimensions: anyApi,
    getConfig: anyApi,
    setConfig: anyApi,
    getPixelInfo: anyApi,
    getAgentStatus: anyApi,
    getAnalytics: anyApi,
    getRecentActivity: anyApi,
  },
  factions: {
    initializeFactions: anyApi,
    getAll: anyApi,
    getBySlug: anyApi,
    leaderboard: anyApi,
    getConflictZones: anyApi,
    joinFaction: anyApi,
    recalculateTerritory: anyApi,
    recordConflict: anyApi,
  },
};

export const internal = anyApi;
export const components = componentsGeneric();
