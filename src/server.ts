import http from 'http';
import { LoremIpsum } from 'lorem-ipsum';
import WebSocket from 'ws';
import app, { AUDIO_PACKET_DURATION_MS, CAPTION_GENERATION_INTERVAL_MS, clientUsageMap, DEFAULT_TIME_LIMIT_MS } from './app';


// Initialize lorem ipsum generator
const lorem = new LoremIpsum({
  sentencesPerParagraph: {
    max: 8,
    min: 4
  },
  wordsPerSentence: {
    max: 10,
    min: 4
  }
});

// Create HTTP server
const server = http.createServer(app);

// Configure WebSocket server
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  
  if (!token) {
    ws.close(1008, 'Authentication token required');
    return;
  }
  
  // Initialize or get client usage data
  if (!clientUsageMap.has(token)) {
    clientUsageMap.set(token, {
      totalTimeMs: 0,
      lastPacketTimestamp: Date.now(),
      sessionActive: true
    });
  } else {
    const clientData = clientUsageMap.get(token)!;
    clientData.sessionActive = true;
    clientUsageMap.set(token, clientData);
  }
  
  console.log(`Client connected with token: ${token}`);
  
  // Start caption generation interval
  const captionInterval = setInterval(() => {
    const clientData = clientUsageMap.get(token);
    if (clientData && clientData.sessionActive) {
      // Generate a random caption
      const caption = lorem.generateSentences(1);
      ws.send(JSON.stringify({ type: 'caption', text: caption, timestamp: Date.now() }));
    }
  }, CAPTION_GENERATION_INTERVAL_MS);
  
  // Handle audio packet reception
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Check if this is an audio packet
      if (data.type === 'audio') {
        const clientData = clientUsageMap.get(token);
        
        if (!clientData) {
          ws.send(JSON.stringify({ type: 'error', text: 'Client not found' }));
          return;
        }
        
        // Update usage statistics
        clientData.totalTimeMs += AUDIO_PACKET_DURATION_MS;
        clientData.lastPacketTimestamp = Date.now();
        
        // Check if client has exceeded time limit
        if (clientData.totalTimeMs > DEFAULT_TIME_LIMIT_MS) {
          ws.send(JSON.stringify({ 
            type: 'limit_exceeded', 
            text: 'You have exceeded your captioning time limit',
            usageMs: clientData.totalTimeMs,
            limitMs: DEFAULT_TIME_LIMIT_MS
          }));
          
          clientData.sessionActive = false;
          ws.close(1000, 'Time limit exceeded');
          clearInterval(captionInterval);
        }
        
        clientUsageMap.set(token, clientData);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ type: 'error', text: 'Invalid message format' }));
    }
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    console.log(`Client disconnected: ${token}`);
    const clientData = clientUsageMap.get(token);
    if (clientData) {
      clientData.sessionActive = false;
      clientUsageMap.set(token, clientData);
    }
    clearInterval(captionInterval);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${token}:`, error);
    clearInterval(captionInterval);
  });
});

export default server;