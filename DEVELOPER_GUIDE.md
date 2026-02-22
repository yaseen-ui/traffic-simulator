# Developer Guide

A comprehensive guide for developers who want to understand, extend, or modify the traffic signal simulator system.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Code Structure](#code-structure)
3. [Understanding the Flow](#understanding-the-flow)
4. [Extending the System](#extending-the-system)
5. [Common Modifications](#common-modifications)
6. [Testing Guide](#testing-guide)
7. [Performance Optimization](#performance-optimization)
8. [Debugging](#debugging)

---

## Architecture Overview

### High-Level Design

```
┌─────────────────────────────────────────────────────┐
│              TCP Socket Server                      │
│         (Accepts client connections)                │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
   ┌─────────┬──────────┬──────────────┐
   │ Signal  │ Message  │   Client     │
   │ Control │ Handler  │   Manager    │
   │         │          │              │
   │ - Phase │ - Parsing│ - Broadcast  │
   │ - State │ - Valid. │ - Track Subs │
   └─────────┴──────────┴──────────────┘
        │
        ▼
   ┌──────────────────┐
   │Traffic Calculator│
   │ - Demand Score   │
   │ - Green Duration │
   └──────────────────┘
```

### Key Concepts

1. **Phase**: Current state of traffic lights (AC_GREEN, AC_YELLOW, BD_GREEN, BD_YELLOW)
2. **Demand**: Calculated vehicle requirement for a route
3. **Cycle**: Complete sequence of all phases
4. **State Change**: When any signal changes color (GREEN→YELLOW, YELLOW→RED, etc.)

---

## Code Structure

### Directory Layout

```
traffic-simulator/
├── Core Components
│   ├── server.js                    # Main coordinator
│   ├── TrafficSignalController.js   # State management
│   ├── ClientManager.js             # Connection handling
│   ├── MessageHandler.js            # Protocol handling
│   └── TrafficCalculator.js         # Calculations
│
├── Utilities
│   ├── Logger.js                    # Logging
│   └── constants.js                 # Config & constants
│
├── Client Libraries
│   ├── TrafficSignalClient.js       # Base client
│   ├── CameraSimulator.js           # Camera client
│   └── SignalSubscriber.js          # Subscriber client
│
├── Examples & Demo
│   ├── demo.js                      # Automated demo
│   └── examples.js                  # 5 examples
│
└── Documentation
    ├── README.md                    # Complete docs
    ├── QUICKSTART.md                # Quick start
    ├── API.md                       # API reference
    └── PROJECT_SUMMARY.md           # This guide
```

### Module Relationships

```
server.js
    ├── imports TrafficSignalController
    ├── imports ClientManager
    ├── imports MessageHandler
    └── imports Logger

TrafficSignalController
    └── imports TrafficCalculator

ClientManager
    └── has ClientConnection instances

MessageHandler
    ├── validates all messages
    └── formats responses

CameraSimulator
    └── extends TrafficSignalClient

SignalSubscriber
    └── extends TrafficSignalClient
```

---

## Understanding the Flow

### Startup Sequence

```
1. server.start()
   ├── Create TCP server on port 4000
   ├── Initialize TrafficSignalController
   ├── Initialize ClientManager
   ├── Initialize MessageHandler
   └── Start background loops
       ├── updatePhase() every 100ms
       ├── broadcast() every 500ms
       └── cleanup() every 30s
```

### Client Connection Sequence

```
1. Client connects to TCP socket
2. Server calls handleNewConnection()
   ├── Create ClientConnection instance
   ├── Add to ClientManager
   ├── Send welcome message
   └── Register event handlers (data, end, error)
```

### Message Processing Sequence

```
1. Client sends JSON message + newline
2. Server receives data in handleClientData()
   ├── Add to client's buffer
   ├── Extract complete messages (by newline)
3. For each complete message:
   ├── Call processClientMessage()
   ├── MessageHandler.processIncomingMessage()
   │   ├── Parse JSON
   │   ├── Validate format
   │   ├── Validate data
   │   └── Return validation result
   ├── Based on type, call handler:
   │   ├── handleCameraUpdate()
   │   ├── handleSubscribe()
   │   ├── handleUnsubscribe()
   │   └── handleQuery()
   └── Send response back to client
```

### Phase Transition Sequence

```
Every 100ms (UPDATE_INTERVAL):
└── controller.updatePhase()
    ├── Check if phase duration elapsed
    ├── If yes, execute transition:
    │   ├── Increment phase counter
    │   ├── Calculate new duration
    │   ├── Apply new signal state
    │   └── Log the change
    └── Return state changed (true/false)

Every 500ms (BROADCAST_INTERVAL):
└── Check if state changed
    ├── If yes, get phase info
    ├── Format as JSON message
    ├── Get subscribed clients
    └── Broadcast to all subscribed clients
```

### Traffic Update Sequence

```
1. Camera sends CAMERA_UPDATE
2. Server validates data
3. Server updates TrafficSignalController
4. On next phase transition:
   ├── Calculate new demands
   ├── Recalculate green duration
   ├── Apply new phase duration
   └── Continue with new timing
```

---

## Extending the System

### Creating a Custom Client

```javascript
const TrafficSignalClient = require('./TrafficSignalClient');

class MyCustomClient extends TrafficSignalClient {
  constructor(host, port) {
    super(host, port);
    this.customData = {};
  }

  async start() {
    await this.connect();
    
    // Your custom logic here
    await this.subscribe(['A', 'B']);
    
    this.onMessage('STATUS', (message) => {
      this.handleStatusUpdate(message);
    });
  }

  handleStatusUpdate(message) {
    // Custom handling
    console.log('Custom handling:', message.data);
  }
}

// Use it
const client = new MyCustomClient('localhost', 4000);
await client.start();
```

### Creating a Custom Traffic Simulator

```javascript
const CameraSimulator = require('./CameraSimulator');

class MySimulator extends CameraSimulator {
  generateTrafficData() {
    // Your custom traffic generation logic
    return {
      A: { vehicles: calculateA(), heavyVehicles: calculateAHeavy() },
      B: { vehicles: calculateB(), heavyVehicles: calculateBHeavy() },
      C: { vehicles: calculateC(), heavyVehicles: calculateCHeavy() },
      D: { vehicles: calculateD(), heavyVehicles: calculateDHeavy() }
    };
  }

  calculateA() {
    // Your logic
    return Math.random() * 20;
  }

  // ... implement other methods
}
```

### Adding Custom Message Types

**Step 1**: Add constant to constants.js
```javascript
const MESSAGE_TYPES = {
  // ... existing types
  CUSTOM_MESSAGE: 'CUSTOM_MESSAGE'
};
```

**Step 2**: Add validation to MessageHandler.js
```javascript
validateCustomMessage(message) {
  // Validation logic
  return { valid, data, error };
}
```

**Step 3**: Add handler to server.js
```javascript
case MESSAGE_TYPES.CUSTOM_MESSAGE:
  this.handleCustomMessage(clientId, result.data);
  break;
```

**Step 4**: Send from client
```javascript
await client.sendMessage({
  type: 'CUSTOM_MESSAGE',
  data: { ... }
});
```

---

## Common Modifications

### 1. Change Timing Constraints

**File**: constants.js

```javascript
// Current
const TIMING = {
  MIN_GREEN: 5,
  MAX_GREEN: 60,
  YELLOW_DURATION: 3,
  MIN_CYCLE_TIME: 30
};

// Modified for very busy intersection
const TIMING = {
  MIN_GREEN: 10,
  MAX_GREEN: 120,      // Longer max
  YELLOW_DURATION: 5,  // Longer yellow for safety
  MIN_CYCLE_TIME: 40
};
```

### 2. Adjust Update Frequency

**File**: server.js

```javascript
// Current (responsive)
this.UPDATE_INTERVAL = 100;

// Modified (less CPU intensive)
this.UPDATE_INTERVAL = 500;  // Check phase every 500ms

// Modified (more responsive)
this.UPDATE_INTERVAL = 50;   // Check phase every 50ms
```

### 3. Change Server Port

**File**: constants.js

```javascript
const SERVER_CONFIG = {
  PORT: 5000,  // Changed from 4000
  HOST: 'localhost'
};
```

### 4. Add New Traffic Weights

**File**: constants.js

```javascript
const TRAFFIC_WEIGHTS = {
  NORMAL_VEHICLE: 1,
  HEAVY_VEHICLE: 2.5,
  MOTORCYCLE: 0.5,       // Add new type
  BIKE: 0.25,             // Add new type
  BASE_DEMAND_UNIT: 10
};
```

### 5. Modify Signal Names

**File**: constants.js

```javascript
const SIGNAL_STATES = {
  GO: 'GREEN',      // Changed naming
  CAUTION: 'YELLOW',
  STOP: 'RED'
};
```

### 6. Add Custom Logging Format

**File**: Logger.js

```javascript
formatMessage(level, message, data = null) {
  const timestamp = this.getTimestamp();
  // Modify format here
  return `[${timestamp}] [${level}] ${message}`;
}
```

---

## Testing Guide

### Unit Testing Patterns

```javascript
// Test TrafficCalculator
const TrafficCalculator = require('./TrafficCalculator');

const calc = new TrafficCalculator();

// Test demand calculation
const demand = calc.calculateDemand(10, 2);
console.assert(demand === 15, 'Demand calculation failed');

// Test green duration
const duration = calc.calculateGreenDuration(15, 7, 13, 25, 'PHASE_AC_GREEN');
console.assert(duration >= 5 && duration <= 60, 'Green duration out of range');
```

### Integration Testing

```javascript
// Test server with client
const server = new TrafficSignalServer();
await server.start();

const client = new TrafficSignalClient();
await client.connect();

// Test camera update
await client.sendCameraUpdate({
  A: { vehicles: 10, heavyVehicles: 2 },
  B: { vehicles: 5, heavyVehicles: 1 },
  C: { vehicles: 8, heavyVehicles: 1 },
  D: { vehicles: 12, heavyVehicles: 3 }
});

// Test subscription
await client.subscribe(['A', 'C']);

// Test query
await client.query('status');

await client.disconnect();
await server.stop();
```

### Scenario Testing

```javascript
// Scenario: Heavy vertical traffic
const simulator = new CameraSimulator();
await simulator.connect();

simulator.setBaseTraffic({
  A: { vehicles: 30, heavyVehicles: 5 },
  B: { vehicles: 2, heavyVehicles: 0 },
  C: { vehicles: 25, heavyVehicles: 4 },
  D: { vehicles: 3, heavyVehicles: 0 }
});

// Verify that A-C phase gets longer green
// ... assertions here
```

---

## Performance Optimization

### Reduce CPU Usage

```javascript
// In server.js - increase intervals
this.UPDATE_INTERVAL = 200;        // 100 → 200ms
this.BROADCAST_INTERVAL = 1000;    // 500 → 1000ms
this.CLEANUP_INTERVAL = 60000;     // 30 → 60 seconds
```

### Reduce Memory Usage

```javascript
// In constants.js
const SERVER_CONFIG = {
  MAX_CONNECTIONS: 50,  // Instead of 100
  SOCKET_TIMEOUT: 15000 // Instead of 30000
};

// Clean up more aggressively
manager.cleanupInactiveClients(30000);  // Every 30 seconds
```

### Optimize Calculations

```javascript
// Cache calculations instead of recalculating
class CachedTrafficCalculator extends TrafficCalculator {
  constructor() {
    super();
    this.lastDemands = null;
    this.lastTrafficHash = null;
  }

  calculateAllDemands(trafficData) {
    const hash = JSON.stringify(trafficData);
    if (hash === this.lastTrafficHash) {
      return this.lastDemands;  // Return cached
    }
    
    const demands = super.calculateAllDemands(trafficData);
    this.lastTrafficHash = hash;
    this.lastDemands = demands;
    return demands;
  }
}
```

---

## Debugging

### Enable Debug Mode

```bash
DEBUG=true node server.js
```

This shows:
- Every message received
- Every client action
- Calculation details
- Phase updates

### Add Custom Logging

```javascript
// In any module
this.logger.debug('Custom debug message', {
  route: 'A',
  vehicles: 10,
  calculation: 'demand'
});
```

### Verify State

```javascript
// Check current state
console.log('Current signals:', controller.getSignalState());
console.log('Current phase:', controller.currentPhase);
console.log('Traffic data:', controller.trafficData);
console.log('Demands:', controller.calculateDemands());
```

### Monitor Clients

```javascript
// Check all connected clients
const clients = clientManager.getAllClientsInfo();
clients.forEach(client => {
  console.log(`Client ${client.id}:`, client.subscriptions);
});
```

### Test Message Parsing

```javascript
const MessageHandler = require('./MessageHandler');
const handler = new MessageHandler();

// Test valid message
const result = handler.processIncomingMessage(
  '{"type":"CAMERA_UPDATE","data":{"A":{"vehicles":10,"heavyVehicles":2}}}'
);
console.log('Valid:', result.isValid);

// Test invalid message
const invalidResult = handler.processIncomingMessage(
  '{"type":"INVALID_TYPE","data":{}}'
);
console.log('Invalid:', !invalidResult.isValid);
```

---

## Best Practices

### When Extending

1. **Extend, don't modify** - Create subclasses instead of modifying existing code
2. **Validate inputs** - Always validate incoming data
3. **Use logging** - Add logging for debugging
4. **Document changes** - Keep comments up to date
5. **Test thoroughly** - Test all scenarios

### When Optimizing

1. **Profile first** - Measure before optimizing
2. **Focus on hot paths** - Optimize frequently used code
3. **Don't sacrifice readability** - Keep code understandable
4. **Test after changes** - Ensure nothing breaks
5. **Document trade-offs** - Explain any performance trade-offs

### When Debugging

1. **Enable debug mode** - Always start with `DEBUG=true`
2. **Check logs** - Review server logs first
3. **Verify connectivity** - Ensure clients can connect
4. **Test incrementally** - Isolate the problem
5. **Use examples** - Compare with working examples

---

## File Modification Checklist

Before modifying files:

- [ ] Understand the current code
- [ ] Document your changes
- [ ] Test modifications thoroughly
- [ ] Check for side effects
- [ ] Update tests
- [ ] Update documentation
- [ ] Verify performance doesn't degrade

---

## Getting Help

If you're stuck:

1. **Check examples.js** - See working implementations
2. **Check demo.js** - See complete working system
3. **Review API.md** - Detailed API documentation
4. **Check tests** - Run with DEBUG=true
5. **Read code comments** - Each module has explanations

---

**Happy Developing! 🚀**
