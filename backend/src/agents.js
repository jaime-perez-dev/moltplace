const { client } = require('./redis');
const { v4: uuidv4 } = require('uuid'); // Need to install uuid, or just use crypto

const crypto = require('crypto');

async function registerAgent(name, factionId = null) {
    if (!name) throw new Error('Name is required');

    // Check if name already taken (optional, skip for MVP speed)

    const agentId = crypto.randomUUID();
    const apiKey = crypto.randomBytes(16).toString('hex');

    const agentData = {
        id: agentId,
        name,
        apiKey, // Store here for reference?
        factionId: factionId || '',
        pixelsPlaced: 0,
        createdAt: Date.now()
    };

    // Store agent data
    await client.hSet(`moltplace:agent:${agentId}`, agentData);
    
    // API Key lookup
    await client.set(`moltplace:apikey:${apiKey}`, agentId);
    
    // Add to agent list
    await client.sAdd('moltplace:agents', agentId);

    return { agentId, apiKey, name };
}

async function getAgentByApiKey(apiKey) {
    const agentId = await client.get(`moltplace:apikey:${apiKey}`);
    if (!agentId) return null;
    
    const data = await client.hGetAll(`moltplace:agent:${agentId}`);
    return data;
}

module.exports = {
    registerAgent,
    getAgentByApiKey
};
