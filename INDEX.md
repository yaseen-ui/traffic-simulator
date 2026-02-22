# 🚦 Traffic Signal Control Simulator - Getting Started

Welcome! This is a fully functional terminal-based traffic signal simulator built with Node.js. Let's get you started in 5 minutes.

## ⚡ Super Quick Start (2 minutes)

### 1. Start the server
```bash
node server.js
```

You should see:
```
[2026-02-22 18:25:27] [SUCCESS] Traffic Signal Server started
    address: localhost:4000
    environment: Terminal-based
```

### 2. In another terminal, run the demo
```bash
node demo.js
```

**That's it!** You'll see:
- Server managing traffic signals
- Camera sending vehicle data
- Subscriber receiving live updates
- Real-time signal changes

Press `Ctrl+C` to stop.

---

## 📚 Documentation Map

Choose what you need:

| Your Goal | Read This | Time |
|-----------|-----------|------|
| Get running ASAP | [QUICKSTART.md](./QUICKSTART.md) | 5 min |
| Understand the system | [README.md](./README.md) | 20 min |
| Use the APIs | [API.md](./API.md) | 15 min |
| Extend/modify code | [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | 30 min |
| Understand architecture | [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) | 10 min |

---

## 🎯 What This Does

This is a **traffic signal control system** that:

✅ Models a 4-way intersection (Routes A, B, C, D)  
✅ Controls signals that move opposite routes together (A-C, B-D)  
✅ Calculates green duration based on live traffic  
✅ Handles yellow transitions between switches  
✅ Works with multiple clients (cameras, displays)  
✅ Runs 100% in your terminal  

**No web UI. No external services. Just Node.js.**

---

## 🚀 Next Steps

### Option 1: Interactive Manual Start (Learning)

**Terminal 1 - Start Server:**
```bash
node server.js
```

**Terminal 2 - Send Traffic Data:**
```bash
node CameraSimulator.js
```

**Terminal 3 - View Signal Updates:**
```bash
node SignalSubscriber.js
```

Watch them work together in real-time!

### Option 2: Run Examples

Learn by examples:
```bash
# Example 1: Status Logger
node examples.js 1

# Example 2: Traffic Monitor  
node examples.js 2

# Example 3: Adaptive Traffic Injection
node examples.js 3

# Example 4: Signal Change Detector
node examples.js 4

# Example 5: Performance Reporter
node examples.js 5
```

### Option 3: Build Your Own Client

```javascript
const TrafficSignalClient = require('./TrafficSignalClient');

const client = new TrafficSignalClient('localhost', 4000);

await client.connect();

// Send traffic data
await client.sendCameraUpdate({
  A: { vehicles: 10, heavyVehicles: 2 },
  B: { vehicles: 5, heavyVehicles: 1 },
  C: { vehicles: 8, heavyVehicles: 1 },
  D: { vehicles: 12, heavyVehicles: 3 }
});

// Subscribe to updates
await client.subscribe('all');

// Receive updates
client.onMessage('STATUS', (message) => {
  console.log('Signal update:', message.data);
});

await client.disconnect();
```

---

## 📂 Project Structure

```
📦 traffic-simulator
├── 🚦 Core System
│   ├── server.js                      # Start here - main server
│   ├── TrafficSignalController.js     # Signal state & phases
│   ├── ClientManager.js               # Handle clients
│   ├── MessageHandler.js              # Message protocol
│   └── TrafficCalculator.js           # Smart timing logic
│
├── 🔧 Utilities  
│   ├── Logger.js                      # Colored logging
│   └── constants.js                   # Configuration
│
├── 🎮 Clients
│   ├── TrafficSignalClient.js         # Base client
│   ├── CameraSimulator.js             # Camera client
│   └── SignalSubscriber.js            # Subscriber client
│
├── 📖 Demo & Examples
│   ├── demo.js                        # Auto demo
│   └── examples.js                    # 5 examples (run with 1-5)
│
└── 📚 Documentation
    ├── README.md                      # Complete guide
    ├── QUICKSTART.md                  # Quick start
    ├── API.md                         # API reference
    ├── DEVELOPER_GUIDE.md             # How to extend
    ├── PROJECT_SUMMARY.md             # Architecture
    └── package.json                   # Project info
```

---

## 🎓 How It Works (Simple Explanation)

### The Junction

```
        ↑ Route A ↑
        
← Route D            Route B →

        ↓ Route C ↓
```

### Rules

1. **A & C move together** (red/green same)
2. **B & D move together** (red/green same)
3. **Never both pairs green** (intersection safety)

### Signal Flow

```
PHASE 1: A-C GREEN (vehicles go up/down)
   ↓ (after 10 seconds)
PHASE 2: A-C YELLOW (prepare to stop)
   ↓ (after 3 seconds)
PHASE 3: B-D GREEN (vehicles go left/right)
   ↓ (after 10 seconds)
PHASE 4: B-D YELLOW (prepare to stop)
   ↓ (after 3 seconds)
Back to PHASE 1
```

### Adaptive Timing

- **More traffic** = longer green signal
- **Less traffic** = shorter green signal
- **Heavy vehicles** = count more in calculations
- **Min/Max limits** = 5-60 seconds

---

## 🔑 Key Concepts

### Signal States
- 🟢 **GREEN**: Proceed (5-60 seconds)
- 🟡 **YELLOW**: Prepare to stop (3 seconds)
- 🔴 **RED**: Must stop

### Message Types
- **CAMERA_UPDATE**: Send vehicle counts
- **SUBSCRIBE**: Receive signal updates
- **QUERY**: Ask for current status
- **STATUS**: Server response

### Clients
- **Camera**: Sends traffic data (vehicle counts)
- **Subscriber**: Receives signal state updates
- **Your Client**: Whatever you build!

---

## 💻 Command Reference

### Start Components

```bash
# Start server
node server.js

# With debug mode (verbose logging)
DEBUG=true node server.js

# Run complete demo
node demo.js

# Run camera simulator
node CameraSimulator.js

# Run signal subscriber
node SignalSubscriber.js
```

### Run Examples

```bash
node examples.js 1  # Status Logger
node examples.js 2  # Traffic Monitor
node examples.js 3  # Adaptive Injector
node examples.js 4  # Signal Detector
node examples.js 5  # Performance Reporter
```

### Use npm Scripts

```bash
npm start              # Start server
npm run start:debug    # Start with debug
npm run demo           # Run demo
npm run example:1      # Run example 1
npm run client:simulator    # Run simulator
npm run client:subscriber   # Run subscriber
```

---

## 🧪 Try These Scenarios

### Scenario 1: Heavy Traffic on Vertical Routes

```javascript
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

→ **Result**: A-C phase gets much longer green times

### Scenario 2: Balanced Traffic

```javascript
sim.setBaseTraffic({
  A: { vehicles: 10, heavyVehicles: 2 },
  B: { vehicles: 10, heavyVehicles: 2 },
  C: { vehicles: 10, heavyVehicles: 2 },
  D: { vehicles: 10, heavyVehicles: 2 }
});
```

→ **Result**: All phases get similar duration

### Scenario 3: No Traffic

```javascript
sim.setBaseTraffic({
  A: { vehicles: 0, heavyVehicles: 0 },
  B: { vehicles: 0, heavyVehicles: 0 },
  C: { vehicles: 0, heavyVehicles: 0 },
  D: { vehicles: 0, heavyVehicles: 0 }
});
```

→ **Result**: All phases use minimum green (5 seconds)

---

## 🚨 Troubleshooting

### Server won't start
```bash
# Port already in use?
lsof -i :4000

# Solution:
# 1. Kill the process: kill -9 <PID>
# 2. Or change port in constants.js
```

### Can't connect to server
```bash
# Verify server is running
nc -zv localhost 4000

# Check with debug mode
DEBUG=true node server.js
```

### No signal updates
```javascript
// Make sure you subscribe
await client.subscribe('all');

// Send some traffic data first
await camera.sendCameraUpdate({...});

// Check status
await client.query('status');
```

---

## 🧠 Learning Path

1. **Start Here** (now)
   - Run `node demo.js`
   - Understand basic flow

2. **Learn Components** (5 min)
   - Read [QUICKSTART.md](./QUICKSTART.md)
   - Run examples 1-5

3. **Deep Dive** (20 min)
   - Read [README.md](./README.md)
   - Understand message protocol

4. **Build Custom** (30 min)
   - Read [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
   - Modify examples

5. **Extend System** (1 hour)
   - Read [API.md](./API.md)
   - Build your client

---

## 📊 System Stats

- **Total Code**: 3,156 lines of JavaScript
- **Documentation**: 1,758 lines
- **Files**: 12 JavaScript + 5 documentation
- **Dependencies**: 0 (Node.js built-in only)
- **Quick Start**: 2 minutes
- **Full Learning**: 2 hours

---

## 🎯 What You Can Do

✅ Understand traffic signal control  
✅ Learn TCP socket programming  
✅ See real-time system simulation  
✅ Build custom clients  
✅ Experiment with scheduling algorithms  
✅ Learn Node.js async patterns  
✅ Understand system architecture  

---

## 📞 Getting Help

1. **Quick Questions**: Check [QUICKSTART.md](./QUICKSTART.md)
2. **How Things Work**: Check [README.md](./README.md)
3. **API Questions**: Check [API.md](./API.md)
4. **Want to Extend**: Check [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
5. **Debug Issues**: Run with `DEBUG=true`

---

## ✨ Key Features

🚦 **Realistic Junction Model**
- Four routes with proper signal coordination
- Yellow transitions between phase changes
- Opposite pairs move together

📡 **Real-Time Communication**
- TCP socket server
- Multiple simultaneous clients
- Efficient update broadcasting

🧠 **Adaptive Algorithms**
- Smart green duration calculation
- Traffic-responsive timing
- Heavy vehicle weighting

🛡️ **Robust & Safe**
- Handles bad input gracefully
- No external dependencies
- Automatic cleanup

⚙️ **Fully Customizable**
- Change timing constraints
- Modify traffic weights
- Add custom message types

---

## 🎉 You're Ready!

Everything is:
- ✅ Fully functional
- ✅ Well documented
- ✅ Ready to use
- ✅ Easy to extend

**Start with**:
```bash
node demo.js
```

**Then explore**:
- Read the docs
- Run the examples
- Build your own client

Enjoy! 🚦

---

**Version**: 1.0.0  
**Node.js**: v12+  
**License**: MIT  
**Status**: Production Ready

🚀 **Let's simulate some traffic!**
