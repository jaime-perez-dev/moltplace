#!/usr/bin/env bun
// Single Faction Agent
// Usage: bun run agent.ts <faction> [agent-number]
// Example: bun run agent.ts red-legion 1

const FACTIONS: Record<string, {
  slug: string;
  name: string;
  color: string;
  secondaryColor: string;
  home: { x: number; y: number; size: number };
  expansionDir: { x: number; y: number };
}> = {
  "vibe-coders": {
    slug: "vibe-coders",
    name: "Vibe Coders",
    color: "#FF6B9D",
    secondaryColor: "#FFB3D1",
    home: { x: 0, y: 0, size: 50 },
    expansionDir: { x: 1, y: 1 },
  },
  "devs": {
    slug: "devs",
    name: "Devs",
    color: "#00D3DD",
    secondaryColor: "#44E4EE",
    home: { x: 450, y: 0, size: 50 },
    expansionDir: { x: -1, y: 1 },
  },
  "accels": {
    slug: "accels",
    name: "Accels",
    color: "#02BE01",
    secondaryColor: "#44DD44",
    home: { x: 0, y: 450, size: 50 },
    expansionDir: { x: 1, y: -1 },
  },
  "degens": {
    slug: "degens",
    name: "Degens",
    color: "#E59500",
    secondaryColor: "#FFBB44",
    home: { x: 450, y: 450, size: 50 },
    expansionDir: { x: -1, y: -1 },
  },
};

const API_BASE_URL = process.env.MOLTPLACE_URL || "https://molt.place";

const factionSlug = process.argv[2];
const agentNum = parseInt(process.argv[3] || "1", 10);

if (!factionSlug || !FACTIONS[factionSlug]) {
  console.error("Usage: bun run agent.ts <faction> [agent-number]");
  console.error("Factions: vibe-coders, devs, accels, degens");
  process.exit(1);
}

const faction = FACTIONS[factionSlug];
const agentName = `${faction.name.replace(/\s+/g, "")}_${agentNum}`;

console.log(`Starting ${agentName} for ${faction.name}`);
console.log(`Home territory: (${faction.home.x},${faction.home.y})`);
console.log(`Color: ${faction.color}\n`);

let apiKey: string | null = null;
let pixelsPlaced = 0;
const canvas = new Map<string, { x: number; y: number; color: string }>();

async function register(): Promise<boolean> {
  console.log(`[${agentName}] Registering...`);
  try {
    const res = await fetch(`${API_BASE_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: agentName }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[${agentName}] Registration failed:`, text);
      return false;
    }

    const data = await res.json();
    apiKey = data.apiKey;
    console.log(`[${agentName}] Registered! ID: ${data.agentId}`);
    
    // Join faction
    await fetch(`${API_BASE_URL}/api/factions/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, factionSlug }),
    });
    
    return true;
  } catch (err) {
    console.error(`[${agentName}] Registration error:`, err);
    return false;
  }
}

async function placePixel(x: number, y: number): Promise<boolean> {
  if (!apiKey) return false;
  
  const color = Math.random() > 0.9 ? faction.secondaryColor : faction.color;
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/pixel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, x, y, color }),
    });
    
    if (res.ok) {
      pixelsPlaced++;
      canvas.set(`${x},${y}`, { x, y, color });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function getNextPosition(): { x: number; y: number } {
  const { home, expansionDir } = faction;
  
  // Calculate current territory radius
  const radius = Math.floor(Math.sqrt(pixelsPlaced / 2)) + home.size;
  
  // Try positions in expanding territory
  for (let i = 0; i < 50; i++) {
    const r = Math.floor(Math.random() * radius);
    const theta = Math.random() * Math.PI / 2; // Quarter circle toward center
    
    let x = home.x + expansionDir.x * Math.floor(r * Math.cos(theta));
    let y = home.y + expansionDir.y * Math.floor(r * Math.sin(theta));
    
    // Add some randomness
    x += Math.floor(Math.random() * 10) - 5;
    y += Math.floor(Math.random() * 10) - 5;
    
    // Clamp to canvas
    x = Math.max(0, Math.min(499, x));
    y = Math.max(0, Math.min(499, y));
    
    if (!canvas.has(`${x},${y}`)) {
      return { x, y };
    }
  }
  
  // Fallback: random
  return {
    x: Math.floor(Math.random() * 500),
    y: Math.floor(Math.random() * 500),
  };
}

async function run() {
  if (!(await register())) {
    process.exit(1);
  }
  
  console.log(`[${agentName}] Starting to paint...\n`);
  
  while (true) {
    const pos = getNextPosition();
    const success = await placePixel(pos.x, pos.y);
    
    if (success) {
      process.stdout.write(`[${agentName}] Painted (${pos.x},${pos.y}) - Total: ${pixelsPlaced}\r`);
      await new Promise(r => setTimeout(r, 100)); // Fast painting
    } else {
      await new Promise(r => setTimeout(r, 500)); // Wait on rate limit
    }
  }
}

run().catch(console.error);
