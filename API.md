# API Reference

Complete API reference for the Traffic Signal Control Simulator system.

## Table of Contents

1. [Constants](#constants)
2. [Logger](#logger)
3. [TrafficCalculator](#trafficcalculator)
4. [TrafficSignalController](#trafficsignalcontroller)
5. [ClientManager](#clientmanager)
6. [MessageHandler](#messagehandler)
7. [TrafficSignalClient](#trafficsignalclient)
8. [CameraSimulator](#camerasimulator)
9. [SignalSubscriber](#signalsubscriber)

---

## Constants

Module: `constants.js`

### SIGNAL_STATES
Signal state definitions.

```javascript
{
  GREEN: 'GREEN',
  YELLOW: 'YELLOW',
  RED: 'RED'
}
```

### ROUTES
Route identifiers.

```javascript
{
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D'
}
```

### PHASES
Phase definitions.

```javascript
{
  PHASE_AC_GREEN: 'PHASE_AC_GREEN',
  PHASE_AC_YELLOW: 'PHASE_AC_YELLOW',
  PHASE_BD_GREEN: 'PHASE_BD_GREEN',
  PHASE_BD_YELLOW: 'PHASE_BD_YELLOW'
}
```

### TIMING
Timing constraints in seconds.

```javascript
{
  MIN_GREEN: 5,        // Minimum green duration
  MAX_GREEN: 60,       // Maximum green duration
  YELLOW_DURATION: 3,  // Yellow phase duration
  MIN_CYCLE_TIME: 30   // Minimum cycle time
}
```

### MESSAGE_TYPES
Message type identifiers.

```javascript
{
  CAMERA_UPDATE: 'CAMERA_UPDATE',
  SUBSCRIBE: 'SUBSCRIBE',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  QUERY: 'QUERY',
  STATUS: 'STATUS',
  ERROR: 'ERROR'
}
```

---

## Logger

Module: `Logger.js`

### Constructor

```javascript
const Logger = require('./Logger');
const logger = new Logger(debugMode = false);
```

### Methods

#### `info(message, data = null)`
Log information message.

```javascript
logger.info('Server started', { port: 4000 });
```

#### `warn(message, data = null)`
Log warning message.

```javascript
logger.warn('Client disconnected', { clientId: 1 });
```

#### `error(message, data = null)`
Log error message.

```javascript
logger.error('Connection failed', { error: 'ECONNREFUSED' });
```

#### `debug(message, data = null)`
Log debug message (only if debug mode enabled).

```javascript
logger.debug('Processing message', { type: 'CAMERA_UPDATE' });
```

#### `success(message, data = null)`
Log success message.

```javascript
logger.success('Server started', { address: 'localhost:4000' });
```

#### `setDebugMode(enabled)`
Enable or disable debug logging.

```javascript
logger.setDebugMode(true);
```

---

## TrafficCalculator

Module: `TrafficCalculator.js`

### Constructor

```javascript
const TrafficCalculator = require('./TrafficCalculator');
const calculator = new TrafficCalculator();
```

### Methods

#### `calculateDemand(vehicleCount, heavyVehicleCount)`
Calculate demand score for traffic data.

```javascript
const demand = calculator.calculateDemand(10, 2);
// Returns: 10 * 1 + 2 * 2.5 = 15
```

#### `calculateGreenDuration(demandA, demandB, demandC, demandD, phase)`
Calculate adaptive green signal duration.

```javascript
const duration = calculator.calculateGreenDuration(
  15, 7,   // A demand, B demand
  13, 25,  // C demand, D demand
  'PHASE_AC_GREEN'
);
// Returns: green duration in seconds (5-60)
```

#### `validateTrafficData(trafficData)`
Validate and sanitize traffic data.

```javascript
const validated = calculator.validateTrafficData({
  A: { vehicles: '10', heavyVehicles: 'abc' },
  B: { vehicles: 5 }
});
// Returns: { A: { vehicles: 10, heavyVehicles: 0 }, B: { vehicles: 5, heavyVehicles: 0 }, C: ..., D: ... }
```

#### `calculateAllDemands(trafficData)`
Calculate demands for all routes.

```javascript
const demands = calculator.calculateAllDemands({
  A: { vehicles: 10, heavyVehicles: 2 },
  B: { vehicles: 5, heavyVehicles: 1 },
  C: { vehicles: 8, heavyVehicles: 1 },
  D: { vehicles: 12, heavyVehicles: 3 }
});
// Returns: { A: 15, B: 7, C: 13, D: 29.5 }
```

#### `getPairDemand(demands, routePair)`
Get combined demand for route pair.

```javascript
const pairDemand = calculator.getPairDemand(
  { A: 15, C: 13 },
  ['A', 'C']
);
// Returns: 28
```

#### `getCycleTime(demands)`
Get recommended cycle time based on total demand.

```javascript
const cycleTime = calculator.getCycleTime({
  A: 15, B: 7, C: 13, D: 25
});
// Returns: cycle time in seconds
```

---

## TrafficSignalController

Module: `TrafficSignalController.js`

### Constructor

```javascript
const TrafficSignalController = require('./TrafficSignalController');
const controller = new TrafficSignalController(logger);
```

### Methods

#### `updateTrafficData(route, vehicles, heavyVehicles)`
Update traffic data for a route.

```javascript
controller.updateTrafficData('A', 10, 2);
```

#### `getSignalState()`
Get current signal state for all routes.

```javascript
const state = controller.getSignalState();
// Returns: { A: 'GREEN', B: 'RED', C: 'GREEN', D: 'RED' }
```

#### `getPhaseInfo()`
Get detailed phase information.

```javascript
const info = controller.getPhaseInfo();
// Returns: {
//   phase: 'PHASE_AC_GREEN',
//   signalState: { A: 'GREEN', ... },
//   elapsedSeconds: 8,
//   totalDurationSeconds: 15,
//   remainingSeconds: 7,
//   isYellow: false,
//   timestamp: '2026-02-22T10:30:45.123Z'
// }
```

#### `calculateDemands()`
Calculate demands from current traffic data.

```javascript
const demands = controller.calculateDemands();
// Returns: { A: 15, B: 7, C: 13, D: 25 }
```

#### `executePhaseTransition()`
Execute phase transition (green to yellow or yellow to green).

```javascript
controller.executePhaseTransition();
```

#### `applyPhaseSignals()`
Apply signal states based on current phase.

```javascript
controller.applyPhaseSignals();
```

#### `updatePhase()`
Check if phase duration elapsed and execute transition if needed.

```javascript
const stateChanged = controller.updatePhase();
// Returns: true if state changed
```

#### `hasStateChanged()`
Check if signal state changed since last broadcast.

```javascript
const changed = controller.hasStateChanged();
// Returns: boolean
```

#### `reset()`
Reset controller to initial state.

```javascript
controller.reset();
```

#### `getStatus()`
Get comprehensive system status.

```javascript
const status = controller.getStatus();
// Returns: {
//   timestamp: '2026-02-22T10:30:45.123Z',
//   phase: { ... },
//   traffic: { A: { ... }, ... },
//   demands: { A: 15, ... },
//   signals: { A: 'GREEN', ... }
// }
```

---

## ClientManager

Module: `ClientManager.js`

### Constructor

```javascript
const ClientManager = require('./ClientManager');
const manager = new ClientManager(logger);
```

### Methods

#### `addClient(socket)`
Add new client connection.

```javascript
const client = manager.addClient(socket);
// Returns: ClientConnection instance
```

#### `removeClient(clientId)`
Remove client connection.

```javascript
manager.removeClient(1);
// Returns: boolean
```

#### `getClient(clientId)`
Get client by ID.

```javascript
const client = manager.getClient(1);
// Returns: ClientConnection | null
```

#### `getActiveClients()`
Get all active clients.

```javascript
const clients = manager.getActiveClients();
// Returns: array of ClientConnection objects
```

#### `getClientCount()`
Get total client count.

```javascript
const count = manager.getClientCount();
// Returns: number
```

#### `subscribeClient(clientId, routes)`
Subscribe client to routes.

```javascript
manager.subscribeClient(1, ['A', 'C']);
// Returns: boolean
```

#### `unsubscribeClient(clientId, routes)`
Unsubscribe client from routes.

```javascript
manager.unsubscribeClient(1, ['A']);
// Returns: boolean
```

#### `getSubscribedClients(routes = null)`
Get all clients subscribed to specific routes.

```javascript
const clientIds = manager.getSubscribedClients(['A', 'B']);
// Returns: array of client IDs
```

#### `broadcastMessage(message, routes = null, excludeClientIds = [])`
Broadcast message to clients.

```javascript
await manager.broadcastMessage(messageStr, ['A', 'C']);
// Returns: { targetCount: number, successCount: number }
```

#### `sendToClient(clientId, message)`
Send message to specific client.

```javascript
const sent = await manager.sendToClient(1, messageStr);
// Returns: boolean
```

#### `getAllClientsInfo()`
Get information about all clients.

```javascript
const info = manager.getAllClientsInfo();
// Returns: array of client info objects
```

#### `cleanupInactiveClients(inactivityThreshold = 60000)`
Clean up inactive clients.

```javascript
const removed = manager.cleanupInactiveClients();
// Returns: number of clients removed
```

#### `resetAllClients()`
Disconnect all clients.

```javascript
manager.resetAllClients();
```

---

## MessageHandler

Module: `MessageHandler.js`

### Constructor

```javascript
const MessageHandler = require('./MessageHandler');
const handler = new MessageHandler(logger);
```

### Methods

#### `parseMessage(rawData)`
Parse incoming message.

```javascript
const message = handler.parseMessage('{"type":"CAMERA_UPDATE","data":{...}}');
// Returns: parsed object | null
```

#### `processIncomingMessage(rawData)`
Validate and process incoming message.

```javascript
const result = handler.processIncomingMessage(rawData);
// Returns: { isValid, type, data, error, ... }
```

#### `validateCameraUpdate(message)`
Validate CAMERA_UPDATE message.

```javascript
const result = handler.validateCameraUpdate(message);
// Returns: { valid, data, error }
```

#### `validateSubscribe(message)`
Validate SUBSCRIBE message.

```javascript
const result = handler.validateSubscribe(message);
// Returns: { valid, routes, error }
```

#### `validateUnsubscribe(message)`
Validate UNSUBSCRIBE message.

```javascript
const result = handler.validateUnsubscribe(message);
// Returns: { valid, routes, error }
```

#### `validateQuery(message)`
Validate QUERY message.

```javascript
const result = handler.validateQuery(message);
// Returns: { valid, queryType, error }
```

#### `formatMessage(data, type = MESSAGE_TYPES.STATUS)`
Format response message.

```javascript
const msg = handler.formatMessage({ status: 'ok' }, 'STATUS');
// Returns: JSON string with newline
```

#### `formatError(error, error_code = 'INVALID_MESSAGE')`
Format error response.

```javascript
const msg = handler.formatError('Invalid route', 'INVALID_ROUTE');
// Returns: JSON error string with newline
```

---

## TrafficSignalClient

Module: `TrafficSignalClient.js`

### Constructor

```javascript
const TrafficSignalClient = require('./TrafficSignalClient');
const client = new TrafficSignalClient(host = 'localhost', port = 4000, debugMode = false);
```

### Methods

#### `connect()`
Connect to server.

```javascript
await client.connect();
```

#### `disconnect()`
Disconnect from server.

```javascript
await client.disconnect();
```

#### `sendMessage(messageObj)`
Send message to server.

```javascript
await client.sendMessage({
  type: 'CAMERA_UPDATE',
  data: { ... }
});
// Returns: Promise<boolean>
```

#### `sendCameraUpdate(trafficData)`
Send camera update.

```javascript
await client.sendCameraUpdate({
  A: { vehicles: 10, heavyVehicles: 2 },
  B: { vehicles: 5, heavyVehicles: 1 },
  C: { vehicles: 8, heavyVehicles: 1 },
  D: { vehicles: 12, heavyVehicles: 3 }
});
```

#### `subscribe(routes = 'all')`
Subscribe to routes.

```javascript
await client.subscribe('all');
// or
await client.subscribe(['A', 'C']);
```

#### `unsubscribe(routes = 'all')`
Unsubscribe from routes.

```javascript
await client.unsubscribe('all');
```

#### `query(queryType = 'status')`
Query server status.

```javascript
await client.query('status');
// Valid types: 'status', 'phase', 'traffic'
```

#### `onMessage(messageType, handler)`
Register message handler.

```javascript
client.onMessage('STATUS', (message) => {
  console.log(message.data);
});
```

#### `isConnectedToServer()`
Check if connected.

```javascript
const connected = client.isConnectedToServer();
// Returns: boolean
```

---

## CameraSimulator

Module: `CameraSimulator.js`

Extends `TrafficSignalClient`.

### Constructor

```javascript
const CameraSimulator = require('./CameraSimulator');
const camera = new CameraSimulator(host = 'localhost', port = 4000, debugMode = false);
```

### Methods

#### `startSimulation(interval = 5000, mode = 'random')`
Start camera simulation.

```javascript
camera.startSimulation(5000, 'wave');
// Modes: 'random', 'wave', 'spike', 'constant'
```

#### `stopSimulation()`
Stop camera simulation.

```javascript
camera.stopSimulation();
```

#### `setBaseTraffic(baseTraffic)`
Set base traffic levels.

```javascript
camera.setBaseTraffic({
  A: { vehicles: 10, heavyVehicles: 2 },
  B: { vehicles: 5, heavyVehicles: 1 },
  C: { vehicles: 8, heavyVehicles: 1 },
  D: { vehicles: 12, heavyVehicles: 3 }
});
```

---

## SignalSubscriber

Module: `SignalSubscriber.js`

Extends `TrafficSignalClient`.

### Constructor

```javascript
const SignalSubscriber = require('./SignalSubscriber');
const subscriber = new SignalSubscriber(host = 'localhost', port = 4000, debugMode = false);
```

### Methods

#### `subscribeToRoutes(routes = 'all')`
Subscribe to signal updates.

```javascript
await subscriber.subscribeToRoutes('all');
```

#### `unsubscribeFromRoutes(routes = 'all')`
Unsubscribe from signal updates.

```javascript
await subscriber.unsubscribeFromRoutes('all');
```

#### `displayPhaseUpdate(phaseInfo)`
Display phase update nicely.

```javascript
// Called automatically when status received
```

#### `displayFullStatus()`
Request and display full status.

```javascript
await subscriber.displayFullStatus();
```

#### `displayTrafficStatus()`
Request and display traffic status.

```javascript
await subscriber.displayTrafficStatus();
```

#### `startWatching()`
Start watching for signal changes.

```javascript
await subscriber.startWatching();
```

---

## Server

Module: `server.js`

### Constructor

```javascript
const TrafficSignalServer = require('./server');
const server = new TrafficSignalServer(port = 4000, host = 'localhost', debugMode = false);
```

### Methods

#### `start()`
Start the server.

```javascript
await server.start();
```

#### `stop()`
Stop the server.

```javascript
await server.stop();
```

#### `displayStatus()`
Display server status in terminal.

```javascript
server.displayStatus();
```

#### `startStatusDisplay(interval = 10000)`
Start periodic status display.

```javascript
server.startStatusDisplay(15000);  // Every 15 seconds
```

---

## Message Formats

### CAMERA_UPDATE Request

```json
{
  "type": "CAMERA_UPDATE",
  "data": {
    "A": { "vehicles": 10, "heavyVehicles": 2 },
    "B": { "vehicles": 5, "heavyVehicles": 1 },
    "C": { "vehicles": 8, "heavyVehicles": 1 },
    "D": { "vehicles": 12, "heavyVehicles": 3 }
  }
}
```

### SUBSCRIBE Request

```json
{
  "type": "SUBSCRIBE",
  "routes": "all"
}
```

or

```json
{
  "type": "SUBSCRIBE",
  "routes": ["A", "C"]
}
```

### QUERY Request

```json
{
  "type": "QUERY",
  "queryType": "status"
}
```

### STATUS Response

```json
{
  "type": "STATUS",
  "timestamp": "2026-02-22T10:30:45.123Z",
  "data": {
    "phase": {
      "phase": "PHASE_AC_GREEN",
      "signalState": {"A":"GREEN","B":"RED","C":"GREEN","D":"RED"},
      "elapsedSeconds": 8,
      "totalDurationSeconds": 15,
      "remainingSeconds": 7,
      "isYellow": false,
      "timestamp": "2026-02-22T10:30:45.123Z"
    },
    "signals": {"A":"GREEN","B":"RED","C":"GREEN","D":"RED"}
  }
}
```

### ERROR Response

```json
{
  "type": "ERROR",
  "timestamp": "2026-02-22T10:30:45.123Z",
  "error": "Invalid route: E",
  "error_code": "INVALID_MESSAGE"
}
```

---

**API Version**: 1.0.0  
**Last Updated**: February 22, 2026
