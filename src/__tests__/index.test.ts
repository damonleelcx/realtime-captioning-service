import express, { Request, Response } from 'express';
import { createServer } from 'http';
import request from 'supertest';
import WebSocket, { WebSocketServer } from 'ws';

// Mock dependencies
jest.mock('lorem-ipsum', () => {
  return {
    LoremIpsum: jest.fn().mockImplementation(() => {
      return {
        generateSentences: jest.fn().mockReturnValue('Mock caption text')
      };
    })
  };
});

// Define types
interface ClientUsage {
  totalTimeMs: number;
  lastPacketTimestamp: number;
  sessionActive: boolean;
}

// Create a test server
const app = express();
app.use(express.json());

// In-memory storage for testing
const clientUsageMap = new Map<string, ClientUsage>();

// Test route handlers
app.post('/api/token', (req: Request, res: Response) => {
  const token = 'test-token';
  
  clientUsageMap.set(token, {
    totalTimeMs: 0,
    lastPacketTimestamp: Date.now(),
    sessionActive: false
  });
  
  res.json({ token });
});

app.get('/api/usage', (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }
  
  const clientData = clientUsageMap.get(token);
  
  if (!clientData) {
    return res.status(404).json({ error: 'Client not found' });
  }
  
  res.json({
    token,
    totalTimeMs: clientData.totalTimeMs,
    timeLimit: 60000,
    isActive: clientData.sessionActive,
    remainingTimeMs: Math.max(0, 60000 - clientData.totalTimeMs)
  });
});

describe('Captioning Service API', () => {
  test('POST /api/token should return a new token', async () => {
    const response = await request(app)
      .post('/api/token')
      .expect(200);
      
    expect(response.body).toHaveProperty('token');
    expect(response.body.token).toBe('test-token');
  });
  
  test('GET /api/usage should return usage data for valid token', async () => {
    // First create a token
    await request(app).post('/api/token');
    
    const response = await request(app)
      .get('/api/usage')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
      
    expect(response.body).toHaveProperty('totalTimeMs');
    expect(response.body).toHaveProperty('timeLimit');
    expect(response.body).toHaveProperty('remainingTimeMs');
  });
  
  test('GET /api/usage should return 401 without token', async () => {
    await request(app)
      .get('/api/usage')
      .expect(401);
  });
});

describe('WebSocket Connection', () => {
  let server: any;
  let wss: WebSocketServer;
  let port: number;
  
  beforeAll((done) => {
    server = createServer(app);
    wss = new WebSocketServer({ server });
    
    wss.on('connection', (ws, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        ws.close(1008, 'Authentication token required');
        return;
      }
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'audio') {
            ws.send(JSON.stringify({ type: 'caption', text: 'Mock caption text' }));
          }
        } catch (error) {
          ws.send(JSON.stringify({ type: 'error', text: 'Invalid message format' }));
        }
      });
    });
    
    server.listen(0, () => {
      port = server.address().port;
      done();
    });
  });
  
  afterAll((done) => {
    server.close(done);
  });
  
  test('Should connect with valid token', (done) => {
    const ws = new WebSocket(`ws://localhost:${port}?token=test-token`);
    
    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
      done();
    });
  });
  
  test('Should receive captions after sending audio packet', (done) => {
    const ws = new WebSocket(`ws://localhost:${port}?token=test-token`);
    
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'audio', data: 'test' }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message.type).toBe('caption');
      expect(message.text).toBe('Mock caption text');
      ws.close();
      done();
    });
  });
});