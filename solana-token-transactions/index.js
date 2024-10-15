const axios = require('axios');
const fs = require('fs').promises;
require('dotenv').config();

const TOKEN_MINT_ADDRESS = '9JhFqCA21MoAXs2PTaeqNQp2XngPn1PgYr2rsEVCpump';
const ALCHEMY_URL = `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
const OUTPUT_FILE = 'transactions.json';
const MAX_TRANSACTIONS = 100;

const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiN89JlPAZqF7ydjh5tUb9kmj30Urisg';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getOldestTransactions() {
  try {
    const response = await axios.post(ALCHEMY_URL, {
      jsonrpc: "2.0",
      id: 1,
      method: "getSignaturesForAddress",
      params: [
        TOKEN_MINT_ADDRESS,
        {
          limit: MAX_TRANSACTIONS,
        }
      ]
    });
    console.log('API Response:', JSON.stringify(response.data, null, 2));
    if (response.data && response.data.result) {
      return response.data.result;
    } else {
      console.error('Unexpected API response structure:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching oldest transactions:', error.message);
    return [];
  }
}

async function getTransactionDetails(signature) {
  try {
    const response = await axios.post(ALCHEMY_URL, {
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [
        signature,
        {
          encoding: "jsonParsed",
          maxSupportedTransactionVersion: 0
        }
      ]
    });
    return response.data.result;
  } catch (error) {
    console.error(`Error fetching transaction details for ${signature}:`, error.message);
    return null;
  }
}

async function main() {
  const oldestTransactions = await getOldestTransactions();
  console.log(`Fetched ${oldestTransactions.length} transactions`);
  
  if (oldestTransactions.length === 0) {
    console.log('No transactions found. Exiting.');
    return;
  }

  const transactions = [];

  for (let i = 0; i < oldestTransactions.length; i++) {
    console.log(`Processing transaction ${i + 1} of ${oldestTransactions.length}`);
    const txDetails = await getTransactionDetails(oldestTransactions[i].signature);
    if (txDetails) {
      transactions.push(txDetails);
    }
    await sleep(100); // To avoid rate limiting
  }

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(transactions, null, 2));
  console.log(`Transactions saved to ${OUTPUT_FILE}`);
}

main().catch(error => {
  console.error('An error occurred in the main function:', error);
});
