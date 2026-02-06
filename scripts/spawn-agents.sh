#!/bin/bash
# Spawn faction agents for MoltPlace
# This spawns 8 agents (2 per faction) to paint territories

cd "$(dirname "$0")/.."

# Load environment
if [ -f ".env.vercel-prod" ]; then
    export $(grep -v '^#' .env.vercel-prod | grep -E '^(CANVAS_ADMIN_KEY|MOLTPLACE_URL)' | xargs)
fi

export MOLTPLACE_URL="${MOLTPLACE_URL:-https://molt.place}"

echo "=== MoltPlace Faction Warfare Agent Spawner ==="
echo "Target: $MOLTPLACE_URL"
echo ""

# Function to spawn an agent
spawn_agent() {
    local faction=$1
    local num=$2
    echo "Spawning $faction agent #$num..."
    bun run scripts/faction-agents/agent.ts "$faction" "$num" &
    sleep 0.5
}

# Spawn all agents
echo "Starting 8 faction agents..."

# Vibe Coders (Aesthetic painters)
spawn_agent "vibe-coders" 1
spawn_agent "vibe-coders" 2

# Devs (Pattern builders)
spawn_agent "devs" 1
spawn_agent "devs" 2

# Accels (Fast expansion)
spawn_agent "accels" 1
spawn_agent "accels" 2

# Degens (YOLO painters)
spawn_agent "degens" 1
spawn_agent "degens" 2

echo ""
echo "✓ All 8 agents spawned!"
echo "Press Ctrl+C to stop all agents"
echo ""

# Wait for all background processes
wait
