const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const OPUS_MINT = '9JhFqCA21MoAXs2PTaeqNQp2XngPn1PgYr2rsEVCpump';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/transactions', async (req, res) => {
  try {
    const data = await fs.readFile('transactions.json', 'utf8');
    const transactions = JSON.parse(data);
    console.log('Raw transactions:', transactions.slice(0, 2)); // Log first two raw transactions

    const processedTransactions = transactions
      .map(processTransaction)
      .filter(tx => tx !== null);
    console.log('Processed transactions:', processedTransactions.slice(0, 2)); // Log first two processed transactions

    res.json(processedTransactions);
  } catch (error) {
    console.error('Error reading transactions:', error);
    res.status(500).json({ error: 'Error reading transactions' });
  }
});

function processTransaction(tx) {
  if (!tx || !tx.transaction || !tx.transaction.message || !tx.transaction.message.accountKeys) {
    return null;
  }

  const tokenProgramIndex = tx.transaction.message.accountKeys.findIndex(
    key => key.pubkey === 'TokenkegQfeZyiN89JlPAZqF7ydjh5tUb9kmj30Urisg'
  );

  if (tokenProgramIndex === -1) return null;

  const transferInstruction = tx.transaction.message.instructions.find(
    instr => instr.programIdIndex === tokenProgramIndex
  );

  if (!transferInstruction) return null;

  const { accounts } = transferInstruction;
  
  // Extract amount from instruction data
  const amount = transferInstruction.data 
    ? parseInt(Buffer.from(transferInstruction.data, 'base64').slice(4).toString('hex'), 16) / 1e6 
    : 'Unknown';

  return {
    signature: tx.transaction.signatures[0],
    blockTime: new Date(tx.blockTime * 1000).toISOString(),
    from: tx.transaction.message.accountKeys[accounts[0]].pubkey,
    to: tx.transaction.message.accountKeys[accounts[1]].pubkey,
    amount: amount,
    token: 'OPUS'
  };
}

io.on('connection', (socket) => {
  socket.on('runScript', () => {
    const scriptProcess = spawn('node', ['index.js']);

    scriptProcess.stdout.on('data', (data) => {
      socket.emit('log', data.toString());
    });

    scriptProcess.stderr.on('data', (data) => {
      socket.emit('log', `Error: ${data.toString()}`);
    });

    scriptProcess.on('close', (code) => {
      socket.emit('log', `Script finished with code ${code}`);
      socket.emit('scriptFinished');
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
