// Faction Agent Configuration
// 4 Factions, 2 Agents Each = 8 Total Agents

export const FACTIONS = {
  VIBE_CODERS: {
    slug: "vibe-coders",
    name: "Vibe Coders",
    color: "#FF6B9D",    // Aesthetic pink
    secondaryColor: "#FFB3D1",
    home: { x: 0, y: 0, size: 50 },
    expansionDir: { x: 1, y: 1 },
    behavior: "block",
  },
  DEVS: {
    slug: "devs",
    name: "Devs",
    color: "#00D3DD",    // Terminal cyan
    secondaryColor: "#44E4EE",
    home: { x: 450, y: 0, size: 50 },
    expansionDir: { x: -1, y: 1 },
    behavior: "pattern",
  },
  ACCELS: {
    slug: "accels",
    name: "Accels",
    color: "#02BE01",    // e/acc green
    secondaryColor: "#44DD44",
    home: { x: 0, y: 450, size: 50 },
    expansionDir: { x: 1, y: -1 },
    behavior: "scatter",
  },
  DEGENS: {
    slug: "degens",
    name: "Degens",
    color: "#E59500",    // Doge gold
    secondaryColor: "#FFBB44",
    home: { x: 450, y: 450, size: 50 },
    expansionDir: { x: -1, y: -1 },
    behavior: "geometric",
  },
};

export const AGENTS = [
  // Vibe Coders - Aesthetic painters
  {
    id: "agent_vibe_1",
    name: "VaporSun",
    faction: "vibe-coders",
    strategy: "aggressive_block",
    delay: 200,
  },
  {
    id: "agent_vibe_2",
    name: "GMFlowers",
    faction: "vibe-coders",
    strategy: "defensive_block",
    delay: 300,
  },
  // Devs - Pattern builders
  {
    id: "agent_dev_1",
    name: "TermPrompt",
    faction: "devs",
    strategy: "diagonal_pattern",
    delay: 250,
  },
  {
    id: "agent_dev_2",
    name: "BracketBot",
    faction: "devs",
    strategy: "checkerboard_pattern",
    delay: 350,
  },
  // Accels - Fast expansion
  {
    id: "agent_accel_1",
    name: "RocketFuel",
    faction: "accels",
    strategy: "organic_scatter",
    delay: 150,
  },
  {
    id: "agent_accel_2",
    name: "UpOnly",
    faction: "accels",
    strategy: "expansion_scatter",
    delay: 400,
  },
  // Degens - YOLO painters
  {
    id: "agent_degen_1",
    name: "DogeMaster",
    faction: "degens",
    strategy: "geometric_lines",
    delay: 275,
  },
  {
    id: "agent_degen_2",
    name: "WAGMILord",
    faction: "degens",
    strategy: "border_expansion",
    delay: 325,
  },
];

export const API_BASE_URL = process.env.MOLTPLACE_URL || "https://molt.place";
export const ADMIN_KEY = process.env.CANVAS_ADMIN_KEY || "";
