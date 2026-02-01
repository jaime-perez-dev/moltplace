const { client } = require('./redis');
require('dotenv').config();

const WIDTH = parseInt(process.env.CANVAS_WIDTH) || 500;
const HEIGHT = parseInt(process.env.CANVAS_HEIGHT) || 500;
const CANVAS_KEY = 'moltplace:canvas'; // Hash: "x,y" -> JSON string

// Initialize canvas if empty
async function initCanvas() {
    const exists = await client.exists(CANVAS_KEY);
    if (!exists) {
        console.log('Initializing empty canvas...');
        // We don't necessarily need to fill it with zeros, we can treat missing keys as color 0 (white/black)
    }
}

async function setPixel(x, y, color, agentId) {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
        throw new Error('Coordinates out of bounds');
    }
    
    // 16 color palette (0-15)
    if (color < 0 || color > 15) {
        throw new Error('Invalid color');
    }

    const pixelData = {
        c: color,
        a: agentId,
        t: Date.now()
    };

    await client.hSet(CANVAS_KEY, `${x},${y}`, JSON.stringify(pixelData));
    return pixelData;
}

async function getPixel(x, y) {
    const data = await client.hGet(CANVAS_KEY, `${x},${y}`);
    return data ? JSON.parse(data) : { c: 0, a: null, t: 0 };
}

// Returns the full canvas state.
// For MVP, we'll return a flat array of colors to keep it lightweight for the viewer.
async function getCanvasColors() {
    // This is the heavy operation. 
    // Optimization: Maintain a Buffer in Redis just for the visual state?
    // For now, let's just do HGETALL and reconstruct. It's MVP.
    // WARNING: HGETALL on 250k items is slow. 
    
    // Better MVP approach: 
    // Don't use HGETALL. 
    // Let's assume most pixels are empty (0).
    // Construct a buffer of size WIDTH * HEIGHT.
    
    const buffer = Buffer.alloc(WIDTH * HEIGHT, 0);
    const allPixels = await client.hGetAll(CANVAS_KEY);
    
    for (const [key, value] of Object.entries(allPixels)) {
        const [xStr, yStr] = key.split(',');
        const x = parseInt(xStr);
        const y = parseInt(yStr);
        const pixel = JSON.parse(value);
        
        const index = y * WIDTH + x;
        buffer[index] = pixel.c;
    }
    
    return buffer;
}

module.exports = {
    initCanvas,
    setPixel,
    getPixel,
    getCanvasColors,
    WIDTH,
    HEIGHT
};
