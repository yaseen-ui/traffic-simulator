# Quick Start Guide

## Overview

This traffic signal simulator is a complete terminal-based system that models a four-way junction with adaptive traffic signal control. It runs as a TCP socket server and handles multiple simultaneous clients.

## System Requirements

- **Node.js**: v12 or higher
- **OS**: macOS, Linux, or Windows
- **Network**: No external internet required (local connections only)

## Installation

1. Clone or download the project:
```bash
cd traffic-simulator
```

2. No additional dependencies needed - uses only Node.js built-in modules!

## 5-Minute Quick Start

### Method 1: Automated Demo (Quickest)

```bash
node demo.js
```

This runs a complete demo showing:
- Server starting and managing signals
- Camera simulator sending traffic data
- Subscriber receiving live signal updates
- Real-time display of traffic conditions

### Method 2: Interactive Manual Start

**Terminal 1 - Start the Server:**
```bash
node server.js
```

You should see:
```
[2026-02-22 18:25:27] [SUCCESS] Traffic Signal Server started 
    address: localhost:4000
    environment: Terminal-based
```

**Terminal 2 - Start Camera Simulator:**
```bash
node CameraSimulator.js
```

This simulates traffic cameras sending vehicle counts.

**Terminal 3 - Start Subscriber:**
```bash
node SignalSubscriber.js
```

This displays real-time signal changes.

**Expected Output - Subscriber Terminal:**
```
🕐 10:30:45 | A:🟢GREEN  C:🟢GREEN  B:🔴RED    D:🔴RED    | Phase: PHASE_AC_GREEN (8/15s)
🕐 10:30:46 | A:🟢GREEN  C:🟢GREEN  B:🔴RED    D:🔴RED    | Phase: PHASE_AC_GREEN (9/15s)
🕐 10:30:47 | A:🟢GREEN  C:🟢GREEN  B:🔴RED    D:🔴RED    | Phase: PHASE_AC_GREEN (10/15s)
```

## Core Concepts

### Four-Way Junction Model

The system models a traffic intersection with 4 routes:

```
        ↑ Route A ↑
        
← Route D            Route B →

        ↓ Route C ↓
```

**Key Rule**: Opposite routes move together:
- **A & C move together** (vertically)
- **B & D move together** (horizontally)

### Signal States

- 🟢 **GREEN**: "Go" signal - traffic can proceed
- 🟡 **YELLOW**: "Caution" signal - prepare to stop
- 🔴 **RED**: "Stop" signal - traffic must stop

### Phases

1. **PHASE_AC_GREEN**: Routes A & C are green, B & D are red
2. **PHASE_AC_YELLOW**: Routes A & C are yellow (3-second transition)
3. **PHASE_BD_GREEN**: Routes B & D are green, A & C are red
4. **PHASE_BD_YELLOW**: Routes B & D are yellow (3-second transition)

### Adaptive Timing

Green signal duration is calculated based on:
- Number of vehicles at each route
- Number of heavy vehicles (counted as 2.5x regular vehicles)
- Demand ratio between routes

Example:
- Low traffic: 5-second green
- Medium traffic: 15-20 second green
- Heavy traffic: Up to 60-second green

## Common Tasks

### Send Traffic Data (from camera)

```javascript
// In your own camera client script:
const TrafficSignalClient = require('./TrafficSignalClient');

const camera = new TrafficSignalClient('localhost', 4000);
await camera.connect();

await camera.sendCameraUpdate({
  A: { vehicles: 10, heavyVehicles: 2 },
  B: { vehicles: 5, heavyVehicles: 1 },
  C: { vehicles: 8, heavyVehicles: 1 },
  D: { vehicles: 12, heavyVehicles: 3 }
});
```

### Subscribe to Signal Updates

```javascript
const TrafficSignalClient = require('./TrafficSignalClient');

const client = new TrafficSignalClient('localhost', 4000);
await client.connect();

// Subscribe to all routes
await client.subscribe('all');

// Or specific routes
await client.subscribe(['A', 'C']);

// Register handler for updates
client.onMessage('STATUS', (message) => {
  console.log('Signal update:', message.data);
});
```

### Query Current Status

```javascript
const TrafficSignalClient = require('./TrafficSignalClient');

const client = new TrafficSignalClient('localhost', 4000);
await client.connect();

// Get full system status
await client.query('status');

// Get phase info
await client.query('phase');

// Get traffic data
await client.query('traffic');

// Handle response
client.onMessage('STATUS', (message) => {
  console.log(JSON.stringify(message.data, null, 2));
});
```

## Simulation Modes

The camera simulator offers different traffic patterns:

### Random Mode
```bash
# Modify CameraSimulator.js line ~180
simulator.startSimulation(5000, 'random');
```
Traffic changes randomly each update.

### Wave Mode
```bash
simulator.startSimulation(5000, 'wave');
```
Traffic increases and decreases in a smooth wave pattern.

### Spike Mode
```bash
simulator.startSimulation(5000, 'spike');
```
Random traffic spikes simulate sudden congestion.

### Constant Mode
```bash
simulator.startSimulation(5000, 'constant');
```
Steady traffic for testing consistent behavior.

## Understanding Server Output

### Status Display (every 15 seconds)

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

### Log Levels

- 🔵 **INFO**: General information
- 🟡 **WARN**: Warnings (disconnections, etc.)
- 🔴 **ERROR**: Error messages
- 🟣 **DEBUG**: Debug information (with DEBUG=true)
- 🟢 **SUCCESS**: Successful operations

## Testing Multiple Scenarios

### Scenario 1: Heavy Traffic on Vertical Routes

**Terminal 1:**
```bash
node server.js
```

**Terminal 2:**
```javascript
// Create custom camera simulator
const CameraSimulator = require('./CameraSimulator');
const sim = new CameraSimulator();
await sim.connect();

sim.setBaseTraffic({
  A: { vehicles: 30, heavyVehicles: 5 },  // Heavy
  B: { vehicles: 2, heavyVehicles: 0 },   // Light
  C: { vehicles: 25, heavyVehicles: 4 },  // Heavy
  D: { vehicles: 3, heavyVehicles: 0 }    // Light
});

sim.startSimulation(5000, 'wave');
```

**Terminal 3:**
```bash
node SignalSubscriber.js
```

You'll see the A-C phase get much longer green times.

### Scenario 2: Balanced Traffic

Same setup but with:
```javascript
sim.setBaseTraffic({
  A: { vehicles: 10, heavyVehicles: 2 },
  B: { vehicles: 10, heavyVehicles: 2 },
  C: { vehicles: 10, heavyVehicles: 2 },
  D: { vehicles: 10, heavyVehicles: 2 }
});
```

All phases should get roughly equal duration.

### Scenario 3: No Traffic

```javascript
sim.setBaseTraffic({
  A: { vehicles: 0, heavyVehicles: 0 },
  B: { vehicles: 0, heavyVehicles: 0 },
  C: { vehicles: 0, heavyVehicles: 0 },
  D: { vehicles: 0, heavyVehicles: 0 }
});
```

All phases use minimum green duration (5 seconds).

## Debugging

### Enable Debug Mode

```bash
DEBUG=true node server.js
```

This shows detailed logs including:
- Every message received
- Every client connection/disconnection
- Phase calculations
- Traffic updates

### Check Active Clients

```bash
node -e "
const Client = require('./TrafficSignalClient');
const c = new Client();
c.connect().then(async () => {
  await c.query('status');
  c.onMessage('STATUS', (msg) => {
    console.log('Active clients:', msg.data.phase);
    process.exit();
  });
}).catch(e => console.error(e));
"
```

## Customization

### Change Server Port

Edit `constants.js`:
```javascript
const SERVER_CONFIG = {
  PORT: 5000,  // Change this
  HOST: 'localhost'
};
```

Then start server:
```bash
node server.js
```

### Adjust Timing Constraints

Edit `constants.js`:
```javascript
const TIMING = {
  MIN_GREEN: 5,              // Min green duration
  MAX_GREEN: 60,             // Max green duration
  YELLOW_DURATION: 3,        // Yellow phase duration
  MIN_CYCLE_TIME: 30         // Min total cycle time
};
```

### Change Update Frequency

Edit `server.js`:
```javascript
this.UPDATE_INTERVAL = 100;      // Phase check frequency
this.BROADCAST_INTERVAL = 500;   // Broadcast frequency
this.CLEANUP_INTERVAL = 30000;   // Cleanup frequency
```

## Troubleshooting

### Server won't start
```bash
# Check if port is in use:
lsof -i :4000

# Kill the process using the port:
kill -9 <PID>

# Or change port in constants.js
```

### Clients can't connect
```bash
# Verify server is running:
nc -zv localhost 4000

# Check server logs for errors:
DEBUG=true node server.js
```

### No signal updates
```javascript
// Make sure you've subscribed:
client.subscribe('all');

// Check current subscriptions:
client.query('status');

// Verify camera is sending data:
camera.sendCameraUpdate({ ... });
```

### Memory usage growing
- Server automatically cleans up every 30 seconds
- Restart server if needed
- Check for stuck client connections

## Performance Tips

1. **Reduce broadcast frequency** if CPU is high:
   - Edit `server.js` - increase `BROADCAST_INTERVAL`

2. **Increase cleanup interval** for fewer disconnects:
   - Edit `server.js` - increase `CLEANUP_INTERVAL`

3. **Reduce number of clients** if memory is high:
   - Edit `constants.js` - reduce `MAX_CONNECTIONS`

4. **Simplify traffic patterns**:
   - Use 'constant' mode instead of 'spike' mode

## Next Steps

1. Review the [README.md](./README.md) for complete documentation
2. Check [constants.js](./constants.js) for all configuration options
3. Explore the source code to understand the implementation
4. Create your own client scripts based on [TrafficSignalClient.js](./TrafficSignalClient.js)
5. Customize the system for your specific needs

## Getting Help

If something doesn't work:

1. Check the error messages in the terminal
2. Run with `DEBUG=true` for verbose output
3. Review the README.md documentation
4. Check if the server is accepting connections
5. Verify all files are present in the directory

---

**Happy simulating! 🚦**
