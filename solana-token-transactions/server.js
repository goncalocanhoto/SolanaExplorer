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
    const processedTransactions = transactions.map(processTransaction).filter(Boolean);
    res.json(processedTransactions);
  } catch (error) {
    res.status(500).json({ error: 'Error reading transactions' });
  }
});

function processTransaction(tx) {
  const transferInstruction = tx.transaction.message.instructions.find(instr => 
    instr.parsed && instr.parsed.type === 'transfer'
  );

  if (!transferInstruction) return null;

  const { info } = transferInstruction.parsed;
  const tokenMint = tx.transaction.message.accountKeys.find(key => 
    key.pubkey === OPUS_MINT || key.pubkey === SOL_MINT
  );

  if (!tokenMint) return null;

  const isOpus = tokenMint.pubkey === OPUS_MINT;
  const decimals = isOpus ? 6 : 9; // OPUS has 6 decimals, SOL has 9

  return {
    signature: tx.transaction.signatures[0],
    blockTime: tx.blockTime,
    from: info.source,
    to: info.destination,
    amount: parseFloat(info.amount) / Math.pow(10, decimals),
    token: isOpus ? 'OPUS' : 'SOL'
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
