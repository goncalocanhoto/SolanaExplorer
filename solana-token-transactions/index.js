const axios = require('axios');
const fs = require('fs').promises;
require('dotenv').config();

const TOKEN_MINT_ADDRESS = '9JhFqCA21MoAXs2PTaeqNQp2XngPn1PgYr2rsEVCpump';
const ALCHEMY_URL = `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
const OUTPUT_FILE = 'transactions.json';
const MAX_TRANSACTIONS = 10;

const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiN89JlPAZqF7ydjh5tUb9kmj30Urisg';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getOldestTransactions() {
  let signatures = [];
  let beforeSignature = null;

  while (signatures.length < MAX_TRANSACTIONS) {
    console.log(`Fetching signatures. Current count: ${signatures.length}`);
    const response = await axios.post(ALCHEMY_URL, {
      jsonrpc: "2.0",
      id: 1,
      method: "getSignaturesForAddress",
      params: [
        TOKEN_MINT_ADDRESS,
        {
          limit: MAX_TRANSACTIONS,
          before: beforeSignature
        }
      ]
    });

    if (!response.data.result || response.data.result.length === 0) break;

    signatures = signatures.concat(response.data.result);
    beforeSignature = response.data.result[response.data.result.length - 1].signature;

    await sleep(100);
  }

  return signatures.slice(0, MAX_TRANSACTIONS);
}

async function main() {
  const oldestTransactions = await getOldestTransactions();
  const transactions = [];

  for (let i = 0; i < oldestTransactions.length; i++) {
    console.log(`Processing transaction ${i + 1} of ${oldestTransactions.length}`);
    const response = await axios.post(ALCHEMY_URL, {
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [
        oldestTransactions[i].signature,
        {
          encoding: "jsonParsed",
          maxSupportedTransactionVersion: 0
        }
      ]
    });

    if (response.data.result) {
      transactions.push(response.data.result);
    }

    await sleep(100);
  }

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(transactions, null, 2));
  console.log(`Transactions saved to ${OUTPUT_FILE}`);
}

main().catch(console.error);
