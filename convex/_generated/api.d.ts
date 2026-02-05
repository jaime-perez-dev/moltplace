/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

type QueryFunc = FunctionReference<"query", "public">;
type MutationFunc = FunctionReference<"mutation", "public">;

export declare const api: {
  agents: {
    register: MutationFunc;
    getByApiKey: QueryFunc;
    leaderboard: QueryFunc;
  };
  canvas: {
    placePixel: MutationFunc;
    getCanvas: QueryFunc;
    getCanvasSince: QueryFunc;
    getCanvasMeta: QueryFunc;
    clearCanvas: MutationFunc;
    getDimensions: QueryFunc;
    getConfig: QueryFunc;
    setConfig: MutationFunc;
    getPixelInfo: QueryFunc;
    getAgentStatus: QueryFunc;
    getAnalytics: QueryFunc;
    getRecentActivity: QueryFunc;
  };
  factions: {
    initializeFactions: MutationFunc;
    getAll: QueryFunc;
    getBySlug: QueryFunc;
    leaderboard: QueryFunc;
    getConflictZones: QueryFunc;
    joinFaction: MutationFunc;
    recalculateTerritory: MutationFunc;
    recordConflict: MutationFunc;
  };
};

export declare const internal: any;
