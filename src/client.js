const WebSocket = require('ws');
const readline = require('readline');

// Get token from command line arguments
const token = process.argv[2];

if (!token) {
  console.error('Please provide a token: node test-client.js YOUR_TOKEN');
  process.exit(1);
}

// Create WebSocket connection
const ws = new WebSocket(`ws://localhost:3000?token=${token}`);

// Set up console interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Handle connection open
ws.on('open', () => {
  console.log('Connected to the server');
  console.log('Press Enter to send audio packets, type "exit" to quit');
  
  // Auto-send audio packets every second
  const autoSendInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const audioPacket = {
        type: 'audio',
        data: Buffer.from(Array(100).fill(Math.floor(Math.random() * 256))).toString('base64'),
        timestamp: Date.now()
      };
      
      ws.send(JSON.stringify(audioPacket));
      console.log('Sent audio packet');
    } else {
      clearInterval(autoSendInterval);
    }
  }, 1000);
  
  // Manual input
  rl.on('line', (input) => {
    if (input.toLowerCase() === 'exit') {
      clearInterval(autoSendInterval);
      ws.close();
      rl.close();
      return;
    }
    
    if (ws.readyState === WebSocket.OPEN) {
      const audioPacket = {
        type: 'audio',
        data: Buffer.from(Array(100).fill(Math.floor(Math.random() * 256))).toString('base64'),
        timestamp: Date.now()
      };
      
      ws.send(JSON.stringify(audioPacket));
      console.log('Sent manual audio packet');
    }
  });
});

// Handle incoming messages
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    
    switch (message.type) {
      case 'caption':
        console.log(`Caption: ${message.text}`);
        break;
      case 'limit_exceeded':
        console.log(`⚠️ ${message.text} - Used: ${message.usageMs}ms / Limit: ${message.limitMs}ms`);
        break;
      case 'error':
        console.error(`Error: ${message.text}`);
        break;
      default:
        console.log('Received:', message);
    }
  } catch (error) {
    console.error('Failed to parse message:', error);
  }
});

// Handle connection close
ws.on('close', (code, reason) => {
  console.log(`Connection closed: ${code} - ${reason}`);
  clearInterval(autoSendInterval);
  process.exit(0);
});

// Handle errors
ws.on('error', (error) => {
  console.error('WebSocket error:', error);
  process.exit(1);
});