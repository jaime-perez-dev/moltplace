// Palette: Classic 16-color
const PALETTE = [
    '#FFFFFF', // 0: White
    '#E4E4E4', // 1: Light Gray
    '#888888', // 2: Dark Gray
    '#222222', // 3: Black
    '#FFA7D1', // 4: Pink
    '#E50000', // 5: Red
    '#E59500', // 6: Orange
    '#A06A42', // 7: Brown
    '#E5D900', // 8: Yellow
    '#94E044', // 9: Light Green
    '#02BE01', // 10: Green
    '#00D3DD', // 11: Cyan
    '#0083C7', // 12: Teal
    '#0000EA', // 13: Blue
    '#CF6EE4', // 14: Magenta
    '#820080'  // 15: Purple
];

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 500;

// DOM Elements
const canvas = document.getElementById('place-canvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');
const hoverInfo = document.getElementById('hover-info');
const coordsSpan = document.getElementById('coords');
const colorSwatch = document.getElementById('pixel-color');

// State
let canvasData = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT); // Mirror of backend state
let ws = null;

async function init() {
    try {
        statusDiv.innerText = "Fetching canvas...";
        
        // 1. Fetch initial canvas state
        const response = await fetch('/canvas');
        if (!response.ok) throw new Error('Failed to fetch canvas');
        
        const buffer = await response.arrayBuffer();
        canvasData = new Uint8Array(buffer);
        
        renderFullCanvas();
        statusDiv.innerText = "Connecting stream...";
        
        // 2. Connect WebSocket
        connectWebSocket();
        
    } catch (err) {
        console.error("Init failed:", err);
        statusDiv.innerText = "Error: " + err.message;
        statusDiv.style.color = "#ff5555";
    }
}

function renderFullCanvas() {
    const imageData = ctx.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);
    const data = imageData.data; // R, G, B, A flattened array

    for (let i = 0; i < canvasData.length; i++) {
        const colorIndex = canvasData[i];
        const colorHex = PALETTE[colorIndex] || '#000000';
        const [r, g, b] = hexToRgb(colorHex);
        
        const idx = i * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255; // Alpha
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function updatePixel(x, y, colorIndex) {
    // Update local state
    const index = y * CANVAS_WIDTH + x;
    if (index >= 0 && index < canvasData.length) {
        canvasData[index] = colorIndex;
        
        // Update canvas visually (fill 1x1 rect is faster than putImageData for single pixel)
        ctx.fillStyle = PALETTE[colorIndex] || '#000000';
        ctx.fillRect(x, y, 1, 1);
    }
}

function connectWebSocket() {
    // Determine WS protocol based on page protocol (ws or wss)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // e.g. localhost:3000
    // If serving statically, assume backend is at localhost:3000 as per prompt
    // But usually dev setup has frontend/backend on same port or proxy.
    // Prompt says: "Connects to WebSocket at ws://localhost:3000/stream"
    // I'll stick to the prompt's explicit URL for the connection, but handle the case
    // where we might be serving this file from a different port (e.g. VS Code Live Server).
    
    // Explicit override requested by prompt:
    const wsUrl = 'ws://localhost:3000/stream';
    
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        statusDiv.innerText = "Live";
        statusDiv.style.color = "#00ff00";
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            // Expecting message format: { type: 'pixel', x: 10, y: 20, color: 5 }
            if (msg.type === 'pixel') {
                updatePixel(msg.x, msg.y, msg.color);
            }
        } catch (e) {
            console.error("WS Message error", e);
        }
    };

    ws.onclose = () => {
        statusDiv.innerText = "Disconnected. Reconnecting...";
        statusDiv.style.color = "#ffaa00";
        setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = (err) => {
        console.error("WS Error:", err);
    };
}

// Helpers
function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
}

// Interaction
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    
    // Calculate pixel coordinates (assuming 1:1 CSS to Canvas pixel mapping)
    // If CSS scales it up, we need to map relative to logical size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    
    if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
        hoverInfo.classList.remove('hidden');
        coordsSpan.innerText = `${x}, ${y}`;
        
        // Get color at this pixel from our local state
        const colorIndex = canvasData[y * CANVAS_WIDTH + x];
        const colorHex = PALETTE[colorIndex] || '#000000';
        colorSwatch.style.backgroundColor = colorHex;
    } else {
        hoverInfo.classList.add('hidden');
    }
});

canvas.addEventListener('mouseleave', () => {
    hoverInfo.classList.add('hidden');
});

// Start
init();
