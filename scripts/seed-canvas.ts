#!/usr/bin/env bun
/**
 * Seed script to test the MoltPlace API
 * Registers an agent and places some pixels to seed the canvas
 */

const API_BASE = process.env.API_URL || "https://moltplace-delta.vercel.app";

interface RegisterResponse {
  agentId: string;
  apiKey: string;
  name: string;
}

interface PixelResponse {
  success: boolean;
  x: number;
  y: number;
  color: number;
}

async function register(name: string): Promise<RegisterResponse> {
  const res = await fetch(`${API_BASE}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Registration failed");
  }
  
  return res.json();
}

async function placePixel(apiKey: string, x: number, y: number, color: number): Promise<PixelResponse> {
  const res = await fetch(`${API_BASE}/api/pixel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, x, y, color }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Pixel placement failed");
  }
  
  return res.json();
}

// Draw a simple pattern - a colorful diamond
async function drawPattern(apiKey: string, centerX: number, centerY: number) {
  const colors = [5, 6, 8, 9, 10, 11, 12, 13, 14]; // Skip white/gray/black
  const size = 5;
  
  for (let dy = -size; dy <= size; dy++) {
    for (let dx = -size; dx <= size; dx++) {
      if (Math.abs(dx) + Math.abs(dy) <= size) {
        const x = centerX + dx;
        const y = centerY + dy;
        const colorIdx = (Math.abs(dx) + Math.abs(dy)) % colors.length;
        
        try {
          await placePixel(apiKey, x, y, colors[colorIdx]);
          console.log(`  Placed pixel at (${x}, ${y}) with color ${colors[colorIdx]}`);
          // Small delay to avoid overwhelming
          await new Promise(r => setTimeout(r, 100));
        } catch (err: any) {
          if (err.message.includes("Rate limited")) {
            console.log("  Rate limited, waiting...");
            await new Promise(r => setTimeout(r, 5000));
          } else {
            console.error(`  Error: ${err.message}`);
          }
        }
      }
    }
  }
}

async function main() {
  console.log("🎨 MoltPlace Seed Script");
  console.log(`Using API: ${API_BASE}\n`);
  
  // Register test agents
  const agents = ["SeedBot-Alpha", "SeedBot-Beta", "SeedBot-Gamma"];
  
  for (let i = 0; i < agents.length; i++) {
    const name = agents[i];
    console.log(`Registering ${name}...`);
    
    try {
      const { apiKey } = await register(name);
      console.log(`  Registered! API Key: ${apiKey.substring(0, 16)}...`);
      
      // Draw a pattern at different locations
      const centerX = 100 + (i * 150);
      const centerY = 250;
      console.log(`Drawing pattern at (${centerX}, ${centerY})...`);
      
      await drawPattern(apiKey, centerX, centerY);
      console.log(`  Done!\n`);
    } catch (err: any) {
      console.error(`  Error: ${err.message}\n`);
    }
  }
  
  console.log("✅ Seeding complete!");
}

main().catch(console.error);
