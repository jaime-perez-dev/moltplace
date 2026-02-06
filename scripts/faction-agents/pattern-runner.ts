// Pattern-Based Faction Agent Runner
// Draws actual pixel art patterns for each faction

import { AGENTS, FACTIONS, API_BASE_URL, ADMIN_KEY } from "./config";
import { PATTERNS, getRandomPattern } from "./patterns";

// Safety limits - CONSERVATIVE for monitoring
const MAX_RUNTIME_MS = 30 * 60 * 1000; // 30 minutes max
const MAX_PIXELS_TOTAL = 2000; // Stop after 2k total pixels (conservative start)
const MIN_DELAY_MS = 300; // Minimum 300ms between pixels per agent
const START_TIME = Date.now();
let totalPixelsPlaced = 0;

interface AgentState {
  id: string;
  name: string;
  apiKey: string | null;
  faction: string;
  factionConfig: typeof FACTIONS[keyof typeof FACTIONS];
  pixelsPlaced: number;
  isRunning: boolean;
  currentPattern: { name: string; pattern: number[][]; offsetX: number; offsetY: number; pixelIndex: number } | null;
}

// Global state
const agentStates = new Map<string, AgentState>();

// Initialize agent states
for (const agent of AGENTS) {
  const faction = Object.values(FACTIONS).find(f => f.slug === agent.faction);
  if (!faction) continue;
  
  agentStates.set(agent.id, {
    id: agent.id,
    name: agent.name,
    apiKey: null,
    faction: agent.faction,
    factionConfig: faction,
    pixelsPlaced: 0,
    isRunning: false,
    currentPattern: null,
  });
}

// API Helpers
async function registerAgent(agent: typeof AGENTS[0]): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/register`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_KEY, // Bypass rate limit
      },
      body: JSON.stringify({ name: agent.name }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (text.includes("already exists")) {
        // Try to get existing key - for now just log
        console.log(`[${agent.name}] Already registered, need existing key`);
      }
      console.error(`[${agent.name}] Registration failed:`, text);
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

async function placePixel(apiKey: string, x: number, y: number, color: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/pixel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, x, y, color }),
    });
    
    if (res.status === 429) {
      return false;
    }
    
    return res.ok;
  } catch {
    return false;
  }
}

// Get next pattern position for an agent
function getNextPatternPixel(agent: AgentState): { x: number; y: number; color: string } | null {
  const faction = agent.factionConfig;
  
  // If no current pattern or pattern complete, start a new one
  if (!agent.currentPattern || agent.currentPattern.pixelIndex >= getTotalPixels(agent.currentPattern.pattern)) {
    const { name, pattern } = getRandomPattern(agent.faction);
    
    // Calculate position in home territory with some randomness
    const homeX = faction.home.x;
    const homeY = faction.home.y;
    const homeSize = faction.home.size;
    const expansionFactor = Math.floor(agent.pixelsPlaced / 50); // Expand territory over time
    
    // Random offset within expanded territory
    const maxOffset = homeSize + expansionFactor * 10;
    const offsetX = homeX + Math.floor(Math.random() * maxOffset) * (faction.expansionDir.x || 1);
    const offsetY = homeY + Math.floor(Math.random() * maxOffset) * (faction.expansionDir.y || 1);
    
    agent.currentPattern = {
      name,
      pattern,
      offsetX: Math.max(0, Math.min(480, offsetX)), // Keep in bounds
      offsetY: Math.max(0, Math.min(480, offsetY)),
      pixelIndex: 0,
    };
    
    console.log(`[${agent.name}] Starting pattern: ${name} at (${agent.currentPattern.offsetX}, ${agent.currentPattern.offsetY})`);
  }
  
  const { pattern, offsetX, offsetY, pixelIndex } = agent.currentPattern;
  
  // Find next non-zero pixel in pattern
  let idx = pixelIndex;
  const height = pattern.length;
  const width = pattern[0]?.length || 0;
  
  while (idx < height * width) {
    const py = Math.floor(idx / width);
    const px = idx % width;
    const value = pattern[py]?.[px] || 0;
    
    if (value > 0) {
      agent.currentPattern.pixelIndex = idx + 1;
      
      const x = offsetX + px;
      const y = offsetY + py;
      
      // Skip if out of bounds
      if (x < 0 || x >= 500 || y < 0 || y >= 500) {
        idx++;
        continue;
      }
      
      // Choose color based on value (1 = primary, 2 = secondary)
      const color = value === 1 ? faction.color : faction.secondaryColor;
      
      return { x, y, color };
    }
    idx++;
  }
  
  // Pattern complete
  agent.currentPattern = null;
  return getNextPatternPixel(agent); // Recursively get next pattern
}

function getTotalPixels(pattern: number[][]): number {
  return pattern.reduce((sum, row) => sum + row.filter(v => v > 0).length, 0);
}

// Agent Runner
async function runAgent(agentId: string): Promise<void> {
  const agent = agentStates.get(agentId);
  if (!agent || !agent.apiKey) return;
  
  agent.isRunning = true;
  console.log(`[${agent.name}] Starting pattern painter for ${agent.faction}...`);
  
  const agentConfig = AGENTS.find(a => a.id === agentId);
  const delay = Math.max(agentConfig?.delay || 300, MIN_DELAY_MS); // Enforce minimum delay
  
  while (agent.isRunning) {
    // Safety checks
    if (Date.now() - START_TIME > MAX_RUNTIME_MS) {
      console.log(`[${agent.name}] MAX RUNTIME reached. Stopping.`);
      agent.isRunning = false;
      break;
    }
    if (totalPixelsPlaced >= MAX_PIXELS_TOTAL) {
      console.log(`[${agent.name}] MAX PIXELS reached. Stopping.`);
      agent.isRunning = false;
      break;
    }
    
    try {
      const pixel = getNextPatternPixel(agent);
      if (!pixel) {
        await new Promise(r => setTimeout(r, 100));
        continue;
      }
      
      const success = await placePixel(agent.apiKey, pixel.x, pixel.y, pixel.color);
      
      if (success) {
        agent.pixelsPlaced++;
        totalPixelsPlaced++;
        
        // Only log every 10 pixels to reduce spam
        if (agent.pixelsPlaced % 10 === 0) {
          console.log(`[${agent.name}] Progress: ${agent.pixelsPlaced} pixels | Pattern: ${agent.currentPattern?.name || 'switching'}`);
        }
      }
      
      await new Promise(r => setTimeout(r, delay));
      
    } catch (err) {
      console.error(`[${agent.name}] Error:`, err);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// Initialize and start all agents
async function initializeAgents(): Promise<void> {
  console.log("=== MoltPlace Pattern Painter Initialization ===\n");
  console.log(`Safety limits: ${MAX_RUNTIME_MS/60000} min runtime, ${MAX_PIXELS_TOTAL} max pixels\n`);
  
  // Register all agents with staggered timing
  console.log("Registering agents...");
  for (const agentConfig of AGENTS) {
    const apiKey = await registerAgent(agentConfig);
    if (apiKey) {
      const state = agentStates.get(agentConfig.id);
      if (state) {
        state.apiKey = apiKey;
      }
    }
    await new Promise(r => setTimeout(r, 500)); // Longer delay to avoid rate limits
  }
  
  // Join factions
  console.log("\nJoining factions...");
  for (const [id, agent] of agentStates) {
    if (agent.apiKey) {
      const success = await joinFaction(agent.apiKey, agent.faction);
      console.log(`[${agent.name}] Joined ${agent.faction}: ${success}`);
      await new Promise(r => setTimeout(r, 100));
    }
  }
  
  console.log("\n=== Starting Pattern Painters ===\n");
  
  // Start all agents with staggered starts
  for (const [id, agent] of agentStates) {
    if (agent.apiKey) {
      runAgent(id).catch(console.error);
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

// Status reporter
function printStatus(): void {
  const elapsed = Math.floor((Date.now() - START_TIME) / 1000);
  const remaining = Math.max(0, Math.floor((MAX_RUNTIME_MS - (Date.now() - START_TIME)) / 1000));
  
  console.log("\n=== FACTION PATTERN STATUS ===");
  console.log(`Runtime: ${elapsed}s | Remaining: ${remaining}s | Total: ${totalPixelsPlaced}/${MAX_PIXELS_TOTAL}`);
  
  for (const faction of Object.values(FACTIONS)) {
    const factionAgents = Array.from(agentStates.values()).filter(a => a.faction === faction.slug);
    const totalPixels = factionAgents.reduce((sum, a) => sum + a.pixelsPlaced, 0);
    console.log(`\n${faction.name} (${faction.color}):`);
    for (const agent of factionAgents) {
      const pattern = agent.currentPattern?.name || 'idle';
      console.log(`  ${agent.name}: ${agent.pixelsPlaced} pixels, drawing: ${pattern}`);
    }
  }
  console.log("\n==============================\n");
  
  // Auto-shutdown check
  if (totalPixelsPlaced >= MAX_PIXELS_TOTAL || Date.now() - START_TIME > MAX_RUNTIME_MS) {
    console.log("🛑 Safety limit reached. Shutting down...");
    for (const agent of agentStates.values()) {
      agent.isRunning = false;
    }
    setTimeout(() => process.exit(0), 3000);
  }
}

// Main
async function main() {
  console.log("MoltPlace Pattern Painter v2.0");
  console.log(`API Base: ${API_BASE_URL}\n`);
  
  await initializeAgents();
  
  // Print status every 60 seconds
  setInterval(printStatus, 60000);
  
  // Keep alive
  setInterval(() => {}, 10000);
}

main().catch(console.error);
