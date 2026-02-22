# Traffic Signal Control Simulator

A fully terminal-based traffic signal control simulator built with Node.js that operates as a TCP socket server, supporting multiple simultaneous clients. The system models a four-way junction with adaptive traffic signal control based on real-time vehicle data.

## Features

- **🚦 Four-Way Junction**: Models routes A, B, C, and D with opposite pairs (A-C and B-D) moving together
- **📡 TCP Socket Server**: Handles multiple simultaneous client connections
- **🎯 Adaptive Signal Control**: Green signal durations calculated based on live traffic conditions
- **🟡 Yellow Transitions**: Enforced yellow phase transitions between signal switches
- **📊 Real-Time Updates**: Clients receive signal state updates only when changes occur
- **📹 Camera Integration**: Accepts traffic data (vehicle count and heavy vehicle count) from client connections
- **⚡ Robust Error Handling**: Safely handles malformed or missing inputs without crashing
- **🔌 Reusable Modules**: Modular architecture with reusable client and server components
- **💻 Terminal Only**: No web frameworks or UI - runs completely in the terminal

## Architecture

### Core Components

- **`server.js`** - Main server entry point that coordinates the traffic signal system
- **`TrafficSignalController.js`** - Core logic for signal state management and phase transitions
- **`TrafficCalculator.js`** - Adaptive traffic calculations for green signal durations
- **`ClientManager.js`** - Manages client connections and subscriptions
- **`MessageHandler.js`** - Parses and validates incoming messages
- **`Logger.js`** - Terminal logging utility with timestamps and colors
- **`constants.js`** - Configuration constants and definitions

### Client Components

- **`TrafficSignalClient.js`** - Base client class for TCP communication
- **`CameraSimulator.js`** - Simulates traffic camera sending vehicle data
- **`SignalSubscriber.js`** - Subscribes to signal updates and displays them

## Installation

No external dependencies required - uses only Node.js built-in modules.

```bash
cd traffic-simulator
```

## Quick Start

### 1. Start the Server

```bash
node server.js
```

The server will start on `localhost:4000` and display status updates every 15 seconds.

Output:
```
[2026-02-22 10:30:45] [SUCCESS] Traffic Signal Server started
    address: localhost:4000
    environment: Terminal-based
```

### 2. Run Camera Simulator (in another terminal)

```bash
node CameraSimulator.js
```

This simulates a traffic camera sending vehicle counts to the server.

### 3. Run Signal Subscriber (in another terminal)

```bash
node SignalSubscriber.js
```

This subscribes to signal updates and displays them in real-time.

## Message Protocol

All communication uses JSON-based messages terminated with newlines.

### Message Types

#### CAMERA_UPDATE
Sends traffic data from camera clients to the server.

```json
{
  "type": "CAMERA_UPDATE",
  "data": {
    "A": { "vehicles": 5, "heavyVehicles": 1 },
    "B": { "vehicles": 3, "heavyVehicles": 0 },
    "C": { "vehicles": 4, "heavyVehicles": 1 },
    "D": { "vehicles": 6, "heavyVehicles": 2 }
  }
}
```

#### SUBSCRIBE
Subscribe to signal updates for specific routes.

```json
{
  "type": "SUBSCRIBE",
  "routes": "all"
}
```

Or specify routes:
```json
{
  "type": "SUBSCRIBE",
  "routes": ["A", "C"]
}
```

#### UNSUBSCRIBE
Unsubscribe from signal updates.

```json
{
  "type": "UNSUBSCRIBE",
  "routes": "all"
}
```

#### QUERY
Query current system status.

```json
{
  "type": "QUERY",
  "queryType": "status"
}
```

Valid `queryType` values: `status`, `phase`, `traffic`

### Response Messages

All server responses include:
```json
{
  "type": "STATUS",
  "timestamp": "2026-02-22T10:30:45.123Z",
  "data": { ... }
}
```

Error responses:
```json
{
  "type": "ERROR",
  "timestamp": "2026-02-22T10:30:45.123Z",
  "error": "error message",
  "error_code": "ERROR_CODE"
}
```

## Traffic Signal Timing

### Phase Types

1. **PHASE_AC_GREEN** - Routes A and C are green, B and D are red
2. **PHASE_AC_YELLOW** - Routes A and C are yellow (transition phase)
3. **PHASE_BD_GREEN** - Routes B and D are green, A and C are red
4. **PHASE_BD_YELLOW** - Routes B and D are yellow (transition phase)

### Timing Constraints

- Minimum green duration: 5 seconds
- Maximum green duration: 60 seconds
- Yellow duration: 3 seconds (fixed)
- Minimum cycle time: 30 seconds

### Adaptive Duration Calculation

Green signal duration is calculated based on:
1. Vehicle count at each route
2. Heavy vehicle count (weighted 2.5x more than normal vehicles)
3. Demand ratio between route pairs

The algorithm ensures:
- More traffic gets more green time
- Opposite routes always move together
- Yellow transitions are enforced between color changes
- All constraints are respected

## Usage Examples

### Using the Base Client

```javascript
const TrafficSignalClient = require('./TrafficSignalClient');

const client = new TrafficSignalClient('localhost', 4000);

await client.connect();

// Send camera update
await client.sendCameraUpdate({
  A: { vehicles: 10, heavyVehicles: 2 },
  B: { vehicles: 5, heavyVehicles: 1 },
  C: { vehicles: 8, heavyVehicles: 1 },
  D: { vehicles: 12, heavyVehicles: 3 }
});

// Subscribe to updates
await client.subscribe('all');

// Register message handler
client.onMessage('STATUS', (message) => {
  console.log('Signal Update:', message.data);
});

// Query status
await client.query('status');

// Unsubscribe
await client.unsubscribe('all');

await client.disconnect();
```

### Using Camera Simulator

```javascript
const CameraSimulator = require('./CameraSimulator');

const simulator = new CameraSimulator('localhost', 4000);

await simulator.connect();

// Start simulation with wave pattern
simulator.startSimulation(5000, 'wave');

// Supported modes: 'random', 'wave', 'spike', 'constant'

// Set custom base traffic
simulator.setBaseTraffic({
  A: { vehicles: 10, heavyVehicles: 2 },
  B: { vehicles: 5, heavyVehicles: 1 },
  C: { vehicles: 8, heavyVehicles: 1 },
  D: { vehicles: 12, heavyVehicles: 3 }
});

// Stop simulation
simulator.stopSimulation();

await simulator.disconnect();
```

### Using Signal Subscriber

```javascript
const SignalSubscriber = require('./SignalSubscriber');

const subscriber = new SignalSubscriber('localhost', 4000);

await subscriber.connect();

// Subscribe to all routes
await subscriber.subscribeToRoutes('all');

// Start watching for changes
await subscriber.startWatching();

// Display traffic status
await subscriber.displayTrafficStatus();

// Display full status
await subscriber.displayFullStatus();

await subscriber.disconnect();
```

## Error Handling

The server handles various error scenarios gracefully:

- **Malformed JSON**: Silently ignored, client continues
- **Invalid message types**: Returns ERROR message
- **Missing required fields**: Returns descriptive error
- **Invalid routes**: Returns validation error
- **Network issues**: Client reconnection logic built into base client
- **Socket timeouts**: Automatic client cleanup

## Server Configuration

Edit `constants.js` to customize:

```javascript
const SERVER_CONFIG = {
  PORT: 4000,                // Server port
  HOST: 'localhost',         // Server host
  MAX_CONNECTIONS: 100,      // Max concurrent clients
  SOCKET_TIMEOUT: 30000,     // Socket timeout (30 seconds)
  RECONNECT_DELAY: 5000      // Reconnection delay (5 seconds)
};

const TIMING = {
  MIN_GREEN: 5,              // Minimum green duration (seconds)
  MAX_GREEN: 60,             // Maximum green duration (seconds)
  YELLOW_DURATION: 3,        // Yellow phase duration (seconds)
  MIN_CYCLE_TIME: 30         // Minimum cycle time (seconds)
};
```

## Monitoring

The server displays status in the terminal every 15 seconds:

```
======================================================================
TRAFFIC SIGNAL SERVER STATUS
======================================================================

📍 SERVER: localhost:4000 | Active: ✓
👥 CLIENTS: 3 connected

🚦 SIGNAL STATE:
   Route A: 🟢 GREEN
   Route B: 🔴 RED
   Route C: 🟢 GREEN
   Route D: 🔴 RED

📊 TRAFFIC DATA:
   Route A: 8 vehicles, 2 heavy | Demand: 21
   Route B: 5 vehicles, 1 heavy | Demand: 7
   Route C: 6 vehicles, 1 heavy | Demand: 13
   Route D: 10 vehicles, 3 heavy | Demand: 25

⏱️  PHASE: PHASE_AC_GREEN
   Elapsed: 8s / Total: 15s
   Remaining: 7s
   Yellow: NO

💾 CLIENT SUBSCRIPTIONS:
   Client 1: A, C
   Client 2: all
   Client 3: B, D

======================================================================
```

## Development

### Running with Debug Mode

```bash
DEBUG=true node server.js
```

This enables verbose logging including debug messages.

### Testing Multiple Clients

Run multiple simulators/subscribers in different terminals:

```bash
# Terminal 1: Server
node server.js

# Terminal 2: Camera Simulator 1
node CameraSimulator.js

# Terminal 3: Camera Simulator 2
node CameraSimulator.js

# Terminal 4: Subscriber
node SignalSubscriber.js
```

## Performance Characteristics

- **Update frequency**: 100ms (phase checking)
- **Broadcast frequency**: 500ms (state changes only)
- **Cleanup frequency**: 30 seconds (inactive client removal)
- **Max connections**: 100 (configurable)
- **Message overhead**: ~200 bytes per update
- **CPU usage**: Minimal (primarily event-driven)

## Graceful Shutdown

Press `Ctrl+C` to gracefully shut down:
- All clients are disconnected
- All intervals are cleared
- Server socket is closed
- Process exits cleanly

## Troubleshooting

### Server won't start
- Check if port 4000 is already in use
- Change port in `constants.js`
- Ensure Node.js is installed (v12+)

### Clients can't connect
- Verify server is running: `node server.js`
- Check hostname/port configuration
- Ensure firewall allows connections

### No signal updates received
- Subscribe using `SUBSCRIBE` message
- Check subscriptions with `QUERY` message
- Verify traffic data is being sent via `CAMERA_UPDATE`

### Memory usage increasing
- Server performs automatic cleanup every 30 seconds
- Check for disconnected clients in logs
- Restart server if needed

## Project Structure

```
traffic-simulator/
├── server.js                          # Main server file
├── constants.js                       # Configuration and constants
├── Logger.js                          # Logging utility
├── TrafficSignalController.js         # Signal state management
├── TrafficCalculator.js               # Adaptive calculations
├── ClientManager.js                   # Client connection management
├── MessageHandler.js                  # Message parsing and validation
├── TrafficSignalClient.js             # Base client class
├── CameraSimulator.js                 # Camera simulator client
├── SignalSubscriber.js                # Signal subscriber client
├── package.json                       # Project metadata
└── README.md                          # This file
```

## Implementation Details

### Signal State Management
- Routes A and C always move together (opposite pair)
- Routes B and D always move together (opposite pair)
- Yellow transitions are mandatory between color changes
- All signals are RED except during their active phase

### Traffic Calculation
- Normal vehicles count as 1 demand unit
- Heavy vehicles count as 2.5 demand units
- Green duration proportional to demand ratio
- Respects minimum (5s) and maximum (60s) constraints

### Client Communication
- Uses TCP sockets for reliable delivery
- Line-delimited JSON messages
- Automatic buffering of partial messages
- No authentication or encryption (local network only)

### Robustness
- All user input validated and sanitized
- Graceful handling of disconnects
- Automatic cleanup of idle clients
- No external dependencies

## License

MIT

## Author

Built as a terminal-based traffic signal control simulator for Node.js

---

**Last Updated**: February 22, 2026
