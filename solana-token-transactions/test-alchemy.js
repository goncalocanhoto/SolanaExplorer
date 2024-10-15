const axios = require('axios');
require('dotenv').config();

const ALCHEMY_URL = `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

async function testAlchemy() {
  try {
    const response = await axios.post(ALCHEMY_URL, {
      jsonrpc: "2.0",
      id: 1,
      method: "getHealth",
      params: []
    });
    console.log("Alchemy API Response:", response.data);
  } catch (error) {
    console.error("Error testing Alchemy API:", error.message);
  }
}

testAlchemy();