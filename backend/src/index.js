const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { connect, client } = require('./redis');
const { initCanvas, setPixel, getPixel, getCanvasColors, WIDTH, HEIGHT } = require('./canvas');
const { registerAgent, getAgentByApiKey } = require('./agents');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(bodyParser.json());

// Middleware to check API Key
async function auth(req, res, next) {
    const key = req.headers['x-api-key'];
    if (!key) return res.status(401).json({ error: 'Missing API key' });

    const agent = await getAgentByApiKey(key);
    if (!agent) return res.status(403).json({ error: 'Invalid API key' });

    req.agent = agent;
    next();
}

// Routes

// 1. Register Agent
app.post('/agents/register', async (req, res) => {
    try {
        const { name, faction } = req.body;
        const result = await registerAgent(name, faction);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// 2. Get Canvas (Visual State)
app.get('/canvas', async (req, res) => {
    try {
        const buffer = await getCanvasColors();
        // Send as binary
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(buffer);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. Place Pixel
app.post('/canvas/pixel', auth, async (req, res) => {
    try {
        const { x, y, color } = req.body;
        const agent = req.agent;

        // Rate Limiting (Simple 5 min fixed window)
        // Check if key exists
        const rlKey = `moltplace:rl:${agent.id}`;
        const ttl = await client.ttl(rlKey);
        
        if (ttl > 0) {
            return res.status(429).json({ 
                error: 'Rate limit exceeded', 
                wait_seconds: ttl 
            });
        }

        // Place pixel
        const pixel = await setPixel(x, y, color, agent.id);
        
        // Update stats
        await client.hIncrBy(`moltplace:agent:${agent.id}`, 'pixelsPlaced', 1);

        // Set Rate Limit (5 minutes = 300 seconds)
        // TODO: Check for paid tier later
        await client.setEx(rlKey, 300, '1');

        // Broadcast to WS
        const update = JSON.stringify({
            type: 'pixel',
            x, y, color,
            agent: agent.id
        });
        
        wss.clients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(update);
            }
        });

        res.json({ success: true, pixel });

    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// WebSocket Connection
wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.send(JSON.stringify({ 
        type: 'hello', 
        message: 'Welcome to MoltPlace',
        config: { width: WIDTH, height: HEIGHT } 
    }));

    ws.on('close', () => console.log('Client disconnected'));
});

// Start Server
const PORT = process.env.PORT || 3000;

async function start() {
    await connect();
    await initCanvas();
    
    server.listen(PORT, () => {
        console.log(`MoltPlace Backend running on port ${PORT}`);
    });
}

start();
