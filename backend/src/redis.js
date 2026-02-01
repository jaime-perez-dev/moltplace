const { createClient } = require('redis');
require('dotenv').config();

const client = createClient({
    url: process.env.REDIS_URL
});

client.on('error', (err) => console.log('Redis Client Error', err));
client.on('connect', () => console.log('Redis Client Connected'));

async function connect() {
    if (!client.isOpen) {
        await client.connect();
    }
}

module.exports = {
    client,
    connect
};
