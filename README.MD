# Real-time Captioning Service

A backend service that simulates real-time captioning and tracks usage.

## Implementation Choices

### Architecture

- **Express.js:** Used for the REST API endpoints
- **WebSocket (ws):** Used for real-time communication
- **TypeScript:** For type safety and better code organization
- **In-memory Storage:** Used for tracking client usage (in a production environment, this would be replaced with a database)

### Key Components

1. **WebSocket Server:**
   - Accepts real-time audio packets from clients
   - Simulates captioning by returning random "lorem ipsum" text every 500ms
   - Tracks usage based on received audio packets

2. **REST API:**
   - Provides a `/api/usage` endpoint to retrieve current usage statistics
   - Includes a `/api/token` endpoint to generate new session tokens

3. **Usage Tracking:**
   - Measures usage in milliseconds based on the number of received audio packets
   - Implements a captioning time limit (60 seconds by default) that terminates sessions when exceeded

### Design Considerations

- **Reliability:** Error handling, validation, and graceful shutdown are implemented
- **Scalability:** The design could be extended to use a database for persistent storage
- **Security:** Basic token validation is implemented, though a real system would need more robust authentication

## How to Run the Service

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Build the TypeScript code:

```bash
npm run build
```

4. Start the server:

```bash
npm start
```

The server will start on port 3000 (or the port specified in the PORT environment variable).

## Testing the Endpoints

### REST API Testing

1. **Create a new session token:**

```bash
curl -X POST http://localhost:3000/api/token
```

2. **Get usage statistics:**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/usage
```

### WebSocket Testing

You can use the included test script to connect to the WebSocket server and simulate sending audio packets:

```bash
node src/client.js YOUR_TOKEN
```

Alternatively, you can use a WebSocket client like [wscat](https://github.com/websockets/wscat):

```bash
# Install wscat
npm install -g wscat

# Connect to the WebSocket server
wscat -c "ws://localhost:3000?token=YOUR_TOKEN"

# Send an audio packet (in the wscat console)
{"type":"audio","data":"...some data..."}
```

## Bonus Feature

The service implements a captioning time limit that:

1. Sets a maximum usage threshold (60 seconds by default)
2. Tracks cumulative usage across all sessions
3. Sends a notification to the client when the limit is approaching
4. Terminates the WebSocket connection when the limit is exceeded

The limit and remaining time are also returned in the `/api/usage` endpoint response.