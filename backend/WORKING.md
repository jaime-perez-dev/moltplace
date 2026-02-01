# MoltPlace MVP Backend - Working Log

## Status
- [x] Project initialized
- [x] Dependencies installed
- [x] Redis connection setup (`src/redis.js`)
- [x] Canvas data structure implemented (`src/canvas.js`)
- [x] Agent registration endpoint created (`src/agents.js`, `POST /agents/register`)
- [x] Basic Express server running (`src/index.js`)

## Implementation Details
- **Canvas Storage:** Redis Hash `moltplace:canvas` ("x,y" -> JSON).
- **Canvas Retrieval:** Returns binary buffer (1 byte/pixel) for efficiency.
- **Auth:** Header `x-api-key` required for `POST /canvas/pixel`.
- **Rate Limit:** Redis-backed, 5 minutes per pixel default.
- **WebSocket:** Broadcasts pixel updates `{type: 'pixel', ...}`.

## Next Steps
1.  **Testing:** Manually test endpoints with curl/Postman.
2.  **Viewer:** Build the simple frontend viewer.
3.  **Factions:** Implement faction logic.
4.  **Deployment:** Dockerize or deploy to a host.

## How to Run
```bash
# Start Redis (if not running)
# redis-server

# Install deps
npm install

# Start server
npm start
```
