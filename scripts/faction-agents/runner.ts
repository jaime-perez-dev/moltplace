// Faction Agent Runner
// Spawns and controls 8 faction agents to paint territories

import { AGENTS, FACTIONS, API_BASE_URL, ADMIN_KEY } from "./config";

// Safety limits
const MAX_RUNTIME_MS = 30 * 60 * 1000; // 30 minutes max
const MAX_PIXELS_TOTAL = 5000; // Stop after 5k total pixels
const START_TIME = Date.now();
let totalPixelsPlaced = 0;

interface AgentState {
  id: string;
  name: string;
  apiKey: string | null;
  faction: string;
  strategy: string;
  lastX: number;
  lastY: number;
  pixelsPlaced: number;
  isRunning: boolean;
}

interface CanvasState {
  pixels: Map<string, { x: number; y: number; color: string | number }>;
  width: number;
  height: number;
}

// Global state
const agentStates = new Map<string, AgentState>();
const canvasState: CanvasState = {
  pixels: new Map(),
  width: 500,
  height: 500,
};

// Initialize agent states
for (const agent of AGENTS) {
  const faction = Object.values(FACTIONS).find(f => f.slug === agent.faction);
  agentStates.set(agent.id, {
    id: agent.id,
    name: agent.name,
    apiKey: null,
    faction: agent.faction,
    strategy: agent.strategy,
    lastX: faction?.home.x ?? 0,
    lastY: faction?.home.y ?? 0,
    pixelsPlaced: 0,
    isRunning: false,
  });
}

// API Helpers
async function registerAgent(agent: typeof AGENTS[0]): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": ADMIN_KEY,
      },
      body: JSON.stringify({ name: agent.name }),
    });

    if (!res.ok) {
      console.error(`[${agent.name}] Registration failed:`, await res.text());
      return null;
    }

    const data = await res.json();
    console.log(`[${agent.name}] Registered with ID: ${data.agentId}`);
    return data.apiKey;
  } catch (err) {
    console.error(`[${agent.name}] Registration error:`, err);
    return null;
  }
}

async function joinFaction(apiKey: string, factionSlug: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/factions/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, factionSlug }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchCanvas(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/canvas`);
    if (!res.ok) return;
    
    const data = await res.json();
    canvasState.pixels.clear();
    for (const pixel of data.pixels || []) {
      canvasState.pixels.set(`${pixel.x},${pixel.y}`, pixel);
    }
  } catch (err) {
    console.error("Canvas fetch error:", err);
  }
}

async function placePixel(apiKey: string, x: number, y: number, color: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/pixel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, x, y, color }),
    });
    
    if (res.status === 429) {
      console.log(`Rate limited at (${x},${y})`);
      return false;
    }
    
    return res.ok;
  } catch (err) {
    console.error(`Pixel place error at (${x},${y}):`, err);
    return false;
  }
}

// Painting Strategies
function getNextBlockPosition(agent: AgentState, faction: typeof FACTIONS[keyof typeof FACTIONS]): { x: number; y: number } {
  // Fill home territory first, then expand
  const home = faction.home;
  const expansion = faction.expansionDir;
  
  // Try to fill within current bounds
  const bounds = Math.floor(Math.sqrt(agent.pixelsPlaced / 2)) + home.size;
  const minX = Math.max(0, home.x);
  const maxX = Math.min(500, home.x + bounds);
  const minY = Math.max(0, home.y);
  const maxY = Math.min(500, home.y + bounds);
  
  // Spiral pattern from home corner
  let x = agent.lastX;
  let y = agent.lastY;
  
  // Move in expansion direction
  for (let i = 0; i < 100; i++) {
    x += expansion.x * Math.floor(Math.random() * 3);
    y += expansion.y * Math.floor(Math.random() * 3);
    
    // Add some randomness
    x += Math.floor(Math.random() * 5) - 2;
    y += Math.floor(Math.random() * 5) - 2;
    
    // Clamp to bounds
    x = Math.max(minX, Math.min(maxX - 1, x));
    y = Math.max(minY, Math.min(maxY - 1, y));
    
    // Check if empty
    const key = `${x},${y}`;
    if (!canvasState.pixels.has(key)) {
      return { x, y };
    }
  }
  
  // Fallback: random position in territory
  return {
    x: minX + Math.floor(Math.random() * (maxX - minX)),
    y: minY + Math.floor(Math.random() * (maxY - minY)),
  };
}

function getNextPatternPosition(agent: AgentState, faction: typeof FACTIONS[keyof typeof FACTIONS]): { x: number; y: number } {
  const home = faction.home;
  const expansion = faction.expansionDir;
  
  // Create diagonal or checkerboard pattern
  const offset = agent.pixelsPlaced % 2 === 0 ? 0 : 1;
  
  for (let attempts = 0; attempts < 50; attempts++) {
    const distance = Math.floor(agent.pixelsPlaced / 10) + Math.floor(Math.random() * 20);
    const x = home.x + expansion.x * distance + (agent.strategy === "checkerboard_pattern" ? offset : 0);
    const y = home.y + expansion.y * distance + (agent.strategy === "checkerboard_pattern" ? offset : 0);
    
    if (x >= 0 && x < 500 && y >= 0 && y < 500) {
      const key = `${x},${y}`;
      if (!canvasState.pixels.has(key)) {
        return { x, y };
      }
    }
  }
  
  return getNextBlockPosition(agent, faction);
}

function getNextScatterPosition(agent: AgentState, faction: typeof FACTIONS[keyof typeof FACTIONS]): { x: number; y: number } {
  const home = faction.home;
  const expansion = faction.expansionDir;
  
  // Organic scatter - random walk from last position
  let x = agent.lastX || home.x + home.size / 2;
  let y = agent.lastY || home.y + home.size / 2;
  
  // Random walk with bias toward expansion
  const spread = 20 + Math.floor(agent.pixelsPlaced / 10);
  
  for (let attempts = 0; attempts < 50; attempts++) {
    x += (Math.floor(Math.random() * spread * 2) - spread) + expansion.x * 3;
    y += (Math.floor(Math.random() * spread * 2) - spread) + expansion.y * 3;
    
    x = Math.max(0, Math.min(499, x));
    y = Math.max(0, Math.min(499, y));
    
    const key = `${x},${y}`;
    if (!canvasState.pixels.has(key)) {
      return { x, y };
    }
  }
  
  // Random fallback
  return {
    x: Math.floor(Math.random() * 500),
    y: Math.floor(Math.random() * 500),
  };
}

function getNextGeometricPosition(agent: AgentState, faction: typeof FACTIONS[keyof typeof FACTIONS]): { x: number; y: number } {
  const home = faction.home;
  const expansion = faction.expansionDir;
  
  if (agent.strategy === "geometric_lines") {
    // Build lines extending from home
    const lineIndex = agent.pixelsPlaced % 4;
    const lineLength = Math.floor(agent.pixelsPlaced / 4);
    
    let x = home.x;
    let y = home.y;
    
    switch (lineIndex) {
      case 0: x += expansion.x * lineLength; break; // Horizontal
      case 1: y += expansion.y * lineLength; break; // Vertical
      case 2: x += expansion.x * lineLength; y += lineLength; break; // Diagonal
      case 3: x += lineLength; y += expansion.y * lineLength; break; // Cross diagonal
    }
    
    if (x >= 0 && x < 500 && y >= 0 && y < 500) {
      return { x, y };
    }
  }
  
  // Border expansion - grow the perimeter
  const perimeter = home.size + Math.floor(agent.pixelsPlaced / 20);
  const side = agent.pixelsPlaced % 4;
  let x = home.x;
  let y = home.y;
  
  switch (side) {
    case 0: x += Math.floor(Math.random() * perimeter); y = home.y; break;
    case 1: x = home.x + perimeter; y += Math.floor(Math.random() * perimeter); break;
    case 2: x += Math.floor(Math.random() * perimeter); y = home.y + perimeter; break;
    case 3: x = home.x; y += Math.floor(Math.random() * perimeter); break;
  }
  
  return { x: Math.max(0, Math.min(499, x)), y: Math.max(0, Math.min(499, y)) };
}

function getNextPosition(agent: AgentState): { x: number; y: number } {
  const faction = Object.values(FACTIONS).find(f => f.slug === agent.faction);
  if (!faction) return { x: 0, y: 0 };
  
  switch (agent.strategy) {
    case "aggressive_block":
    case "defensive_block":
      return getNextBlockPosition(agent, faction);
    case "diagonal_pattern":
    case "checkerboard_pattern":
      return getNextPatternPosition(agent, faction);
    case "organic_scatter":
    case "expansion_scatter":
      return getNextScatterPosition(agent, faction);
    case "geometric_lines":
    case "border_expansion":
      return getNextGeometricPosition(agent, faction);
    default:
      return getNextBlockPosition(agent, faction);
  }
}

// Agent Runner
async function runAgent(agentId: string): Promise<void> {
  const agent = agentStates.get(agentId);
  if (!agent || !agent.apiKey) return;
  
  const faction = Object.values(FACTIONS).find(f => f.slug === agent.faction);
  if (!faction) return;
  
  agent.isRunning = true;
  console.log(`[${agent.name}] Starting painter...`);
  
  while (agent.isRunning) {
    // Safety checks
    if (Date.now() - START_TIME > MAX_RUNTIME_MS) {
      console.log(`[${agent.name}] MAX RUNTIME reached (30 min). Stopping.`);
      agent.isRunning = false;
      break;
    }
    if (totalPixelsPlaced >= MAX_PIXELS_TOTAL) {
      console.log(`[${agent.name}] MAX PIXELS reached (${MAX_PIXELS_TOTAL}). Stopping.`);
      agent.isRunning = false;
      break;
    }
    
    try {
      // Refresh canvas periodically
      if (agent.pixelsPlaced % 10 === 0) {
        await fetchCanvas();
      }
      
      // Get next position to paint
      const pos = getNextPosition(agent);
      
      // Occasionally use secondary color
      const color = Math.random() > 0.8 ? faction.secondaryColor : faction.color;
      
      // Place pixel
      const success = await placePixel(agent.apiKey, pos.x, pos.y, color);
      
      if (success) {
        agent.pixelsPlaced++;
        totalPixelsPlaced++;
        agent.lastX = pos.x;
        agent.lastY = pos.y;
        console.log(`[${agent.name}] Painted (${pos.x},${pos.y}) - Agent: ${agent.pixelsPlaced} | Global: ${totalPixelsPlaced}`);
        
        // Update local canvas
        canvasState.pixels.set(`${pos.x},${pos.y}`, { x: pos.x, y: pos.y, color });
      }
      
      // Delay between pixels
      const agentConfig = AGENTS.find(a => a.id === agentId);
      await new Promise(r => setTimeout(r, agentConfig?.delay || 200));
      
    } catch (err) {
      console.error(`[${agent.name}] Error:`, err);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// Initialize and start all agents
async function initializeAgents(): Promise<void> {
  console.log("=== MoltPlace Faction Warfare Initialization ===\n");
  
  // Register all agents
  console.log("Registering agents...");
  for (const agentConfig of AGENTS) {
    const apiKey = await registerAgent(agentConfig);
    if (apiKey) {
      const state = agentStates.get(agentConfig.id);
      if (state) {
        state.apiKey = apiKey;
      }
    }
    await new Promise(r => setTimeout(r, 100));
  }
  
  // Join factions
  console.log("\nJoining factions...");
  for (const [id, agent] of agentStates) {
    if (agent.apiKey) {
      const success = await joinFaction(agent.apiKey, agent.faction);
      console.log(`[${agent.name}] Joined ${agent.faction}: ${success}`);
      await new Promise(r => setTimeout(r, 50));
    }
  }
  
  console.log("\n=== Starting Territory Claims ===\n");
  
  // Start all agents painting
  for (const [id, agent] of agentStates) {
    if (agent.apiKey) {
      runAgent(id).catch(console.error);
      await new Promise(r => setTimeout(r, 200)); // Stagger starts
    }
  }
}

// Status reporter
function printStatus(): void {
  const elapsed = Math.floor((Date.now() - START_TIME) / 1000);
  const remaining = Math.max(0, Math.floor((MAX_RUNTIME_MS - (Date.now() - START_TIME)) / 1000));
  
  console.log("\n=== FACTION STATUS ===");
  console.log(`Runtime: ${elapsed}s | Remaining: ${remaining}s | Total pixels: ${totalPixelsPlaced}/${MAX_PIXELS_TOTAL}`);
  for (const faction of Object.values(FACTIONS)) {
    const factionAgents = Array.from(agentStates.values())
      .filter(a => a.faction === faction.slug);
    const totalPixels = factionAgents.reduce((sum, a) => sum + a.pixelsPlaced, 0);
    console.log(`${faction.name}: ${totalPixels} pixels (${factionAgents.length} agents)`);
    for (const agent of factionAgents) {
      console.log(`  - ${agent.name}: ${agent.pixelsPlaced} pixels`);
    }
  }
  console.log("======================\n");
  
  // Check if we should stop
  if (totalPixelsPlaced >= MAX_PIXELS_TOTAL || Date.now() - START_TIME > MAX_RUNTIME_MS) {
    console.log("🛑 Safety limit reached. Shutting down all agents...");
    for (const agent of agentStates.values()) {
      agent.isRunning = false;
    }
    setTimeout(() => process.exit(0), 2000);
  }
}

// Main
async function main() {
  console.log("MoltPlace Faction Warfare System v1.0");
  console.log(`API Base: ${API_BASE_URL}\n`);
  
  await initializeAgents();
  
  // Print status every 30 seconds
  setInterval(printStatus, 30000);
  
  // Keep alive
  setInterval(() => {}, 10000);
}

main().catch(console.error);
