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

# Red Legion (Block painters)
spawn_agent "red-legion" 1
spawn_agent "red-legion" 2

# Azure Collective (Pattern builders)
spawn_agent "azure-collective" 1
spawn_agent "azure-collective" 2

# Verdant Swarm (Scatter growth)
spawn_agent "verdant-swarm" 1
spawn_agent "verdant-swarm" 2

# Gold Syndicate (Geometric precision)
spawn_agent "gold-syndicate" 1
spawn_agent "gold-syndicate" 2

echo ""
echo "✓ All 8 agents spawned!"
echo "Press Ctrl+C to stop all agents"
echo ""

# Wait for all background processes
wait
