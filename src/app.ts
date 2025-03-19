import express from 'express';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface ClientUsage {
  totalTimeMs: number;
  lastPacketTimestamp: number;
  sessionActive: boolean;
}

// Constants
export const AUDIO_PACKET_DURATION_MS = 100; // Each audio packet represents 100ms
export const CAPTION_GENERATION_INTERVAL_MS = 500; // Generate captions every 500ms
// export const DEFAULT_TIME_LIMIT_MS = 6000; // 6 seconds for demo purposes

export const DEFAULT_TIME_LIMIT_MS = 60000; // 60 seconds default time limit

// In-memory storage for usage tracking
export const clientUsageMap = new Map<string, ClientUsage>();

// Create Express app
const app = express();
app.use(express.json());

// Middleware to validate client tokens
export function validateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }
  
  // In a real implementation, you would validate the token properly
  // For this exercise, we'll just make sure it exists in our map
  if (!clientUsageMap.has(token)) {
    clientUsageMap.set(token, {
      totalTimeMs: 0,
      lastPacketTimestamp: Date.now(),
      sessionActive: false
    });
  }
  
  req.headers['client-token'] = token;
  next();
}

// REST endpoint to get usage information
app.get('/api/usage', validateToken, (req, res) => {
  const token = req.headers['client-token'] as string;
  const clientData = clientUsageMap.get(token);
  
  if (!clientData) {
    return res.status(404).json({ error: 'Client not found' });
  }
  
  res.json({
    token,
    totalTimeMs: clientData.totalTimeMs,
    timeLimit: DEFAULT_TIME_LIMIT_MS,
    isActive: clientData.sessionActive,
    remainingTimeMs: Math.max(0, DEFAULT_TIME_LIMIT_MS - clientData.totalTimeMs)
  });
});

// Endpoint to create a new session token
app.post('/api/token', (req, res) => {
  const token = uuidv4();
  
  clientUsageMap.set(token, {
    totalTimeMs: 0,
    lastPacketTimestamp: Date.now(),
    sessionActive: false
  });
  
  res.json({ token });
});

export default app;