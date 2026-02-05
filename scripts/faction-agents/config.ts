// Faction Agent Configuration
// 4 Factions, 2 Agents Each = 8 Total Agents

export const FACTIONS = {
  RED_LEGION: {
    slug: "red-legion",
    name: "Red Legion",
    color: "#E50000",
    secondaryColor: "#FF4444",
    home: { x: 0, y: 0, size: 50 },
    expansionDir: { x: 1, y: 1 }, // Toward center
    behavior: "block",
  },
  AZURE_COLLECTIVE: {
    slug: "azure-collective",
    name: "Azure Collective",
    color: "#00D3DD",
    secondaryColor: "#44E4EE",
    home: { x: 450, y: 0, size: 50 },
    expansionDir: { x: -1, y: 1 },
    behavior: "pattern",
  },
  VERDANT_SWARM: {
    slug: "verdant-swarm",
    name: "Verdant Swarm",
    color: "#02BE01",
    secondaryColor: "#44DD44",
    home: { x: 0, y: 450, size: 50 },
    expansionDir: { x: 1, y: -1 },
    behavior: "scatter",
  },
  GOLD_SYNDICATE: {
    slug: "gold-syndicate",
    name: "Gold Syndicate",
    color: "#E59500",
    secondaryColor: "#FFBB44",
    home: { x: 450, y: 450, size: 50 },
    expansionDir: { x: -1, y: -1 },
    behavior: "geometric",
  },
};

export const AGENTS = [
  // Red Legion - Block Painters
  {
    id: "agent_red_1",
    name: "Red Vanguard",
    faction: "red-legion",
    strategy: "aggressive_block",
    delay: 200,
  },
  {
    id: "agent_red_2",
    name: "Crimson Blade",
    faction: "red-legion",
    strategy: "defensive_block",
    delay: 300,
  },
  // Azure Collective - Pattern Builders
  {
    id: "agent_blue_1",
    name: "Azure Architect",
    faction: "azure-collective",
    strategy: "diagonal_pattern",
    delay: 250,
  },
  {
    id: "agent_blue_2",
    name: "Cyan Sentinel",
    faction: "azure-collective",
    strategy: "checkerboard_pattern",
    delay: 350,
  },
  // Verdant Swarm - Scatter Growth
  {
    id: "agent_green_1",
    name: "Swarm Scout",
    faction: "verdant-swarm",
    strategy: "organic_scatter",
    delay: 150,
  },
  {
    id: "agent_green_2",
    name: "Growth Spore",
    faction: "verdant-swarm",
    strategy: "expansion_scatter",
    delay: 400,
  },
  // Gold Syndicate - Geometric Precision
  {
    id: "agent_gold_1",
    name: "Gold Engineer",
    faction: "gold-syndicate",
    strategy: "geometric_lines",
    delay: 275,
  },
  {
    id: "agent_gold_2",
    name: "Syndicate Builder",
    faction: "gold-syndicate",
    strategy: "border_expansion",
    delay: 325,
  },
];

export const API_BASE_URL = process.env.MOLTPLACE_URL || "https://molt.place";
export const ADMIN_KEY = process.env.CANVAS_ADMIN_KEY || "";
