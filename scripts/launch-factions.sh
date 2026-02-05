#!/bin/bash
# MoltPlace Faction Agent Launcher
# Usage: ./launch-factions.sh [start|stop|status]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="/tmp/moltplace-factions.pid"
LOG_FILE="/tmp/moltplace-factions.log"

# Load environment
if [ -f "$SCRIPT_DIR/../.env.local" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/../.env.local" | xargs)
elif [ -f "$SCRIPT_DIR/../.env.production" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/../.env.production" | xargs)
fi

start() {
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        echo "Faction agents already running (PID: $(cat $PID_FILE))"
        return 1
    fi
    
    echo "Starting MoltPlace Faction Warfare agents..."
    cd "$SCRIPT_DIR"
    
    # Compile and run
    bun run runner.ts > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    
    echo "✓ Faction agents started (PID: $(cat $PID_FILE))"
    echo "  Log: $LOG_FILE"
    sleep 2
    tail -20 "$LOG_FILE"
}

stop() {
    if [ ! -f "$PID_FILE" ]; then
        echo "No faction agents running"
        return 1
    fi
    
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Stopping faction agents (PID: $PID)..."
        kill "$PID" 2>/dev/null && rm "$PID_FILE"
        echo "✓ Faction agents stopped"
    else
        echo "Faction agents not running (stale PID file)"
        rm "$PID_FILE"
    fi
}

status() {
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        echo "✓ Faction agents running (PID: $(cat $PID_FILE))"
        echo ""
        echo "Recent activity:"
        tail -15 "$LOG_FILE" 2>/dev/null || echo "No log entries yet"
    else
        echo "✗ Faction agents not running"
    fi
}

init() {
    echo "Initializing factions in database..."
    cd "$SCRIPT_DIR/.."
    
    # Create initialization script
    cat > /tmp/init-factions.ts << 'EOF'
    import { ConvexHttpClient } from "convex/browser";
    
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    
    async function init() {
        const result = await convex.mutation(
            (await import("./convex/_generated/api")).api.factions.initializeFactions,
            { adminKey: process.env.CANVAS_ADMIN_KEY || "" }
        );
        console.log("Factions initialized:", result);
    }
    
    init().catch(console.error);
EOF
    
    bun run /tmp/init-factions.ts
}

case "${1:-start}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop || true
        sleep 2
        start
        ;;
    status)
        status
        ;;
    init)
        init
        ;;
    logs)
        tail -f "$LOG_FILE"
        ;;
    *)
        echo "Usage: $0 [start|stop|restart|status|init|logs]"
        exit 1
        ;;
esac
