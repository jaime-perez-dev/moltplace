import { query } from "./_generated/server";

export const checkStorage = query({
  args: {},
  handler: async (ctx) => {
    const results = {
      agents: 0,
      pixels: 0,
      factions: 0,
      conflictZones: 0,
      territory: 0,
    };

    // Count agents
    const agents = await ctx.db.query("agents").collect();
    results.agents = agents.length;

    // Count pixels  
    const pixels = await ctx.db.query("pixels").collect();
    results.pixels = pixels.length;

    // Count factions
    const factions = await ctx.db.query("factions").collect();
    results.factions = factions.length;

    // Count conflict zones
    const conflicts = await ctx.db.query("conflictZones").collect();
    results.conflictZones = conflicts.length;

    // Count territory records
    const territories = await ctx.db.query("territory").collect();
    results.territory = territories.length;

    // Estimate sizes (rough approximation)
    const estSizeKB = {
      agents: results.agents * 1.5,      // ~1.5KB per agent
      pixels: results.pixels * 0.5,      // ~0.5KB per pixel
      factions: results.factions * 2,    // ~2KB per faction
      conflictZones: results.conflictZones * 1, // ~1KB per conflict
      territory: results.territory * 5,  // ~5KB per territory (has arrays)
    };

    const totalKB = Object.values(estSizeKB).reduce((a, b) => a + b, 0);
    const totalMB = (totalKB / 1024).toFixed(2);

    return {
      counts: results,
      estimatedSizeKB: Math.round(totalKB),
      estimatedSizeMB: totalMB,
      percentOf500MB: ((totalKB / 1024) / 500 * 100).toFixed(1),
    };
  },
});
