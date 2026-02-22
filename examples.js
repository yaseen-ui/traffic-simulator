/**
 * Custom Client Example
 * 
 * This file demonstrates how to create a custom traffic signal client
 * for your specific use case. Extend or modify as needed.
 */

const TrafficSignalClient = require('./TrafficSignalClient');

/**
 * Example 1: Simple Status Logger
 * Continuously logs the current traffic signal status
 */
class StatusLogger extends TrafficSignalClient {
  async start() {
    await this.connect();
    console.log('Connected to Traffic Signal Server\n');

    // Query status every 3 seconds
    setInterval(async () => {
      await this.query('status');
    }, 3000);

    // Handle status responses
    this.onMessage('STATUS', (message) => {
      const data = message.data;
      if (data.signals) {
        console.log('\n--- Signal Status ---');
        console.log('Phase:', data.phase);
        console.log('Signals:', data.signals);
        console.log('Time:', new Date().toLocaleTimeString());
      }
    });
  }
}

/**
 * Example 2: Traffic Monitor
 * Monitors traffic congestion and alerts when high traffic detected
 */
class TrafficMonitor extends TrafficSignalClient {
  constructor(host, port, thresholdDemand = 50) {
    super(host, port);
    this.thresholdDemand = thresholdDemand;
    this.previousDemands = {};
  }

  async start() {
    await this.connect();
    console.log('Traffic Monitor started\n');

    // Query traffic every 5 seconds
    setInterval(async () => {
      await this.query('traffic');
    }, 5000);

    // Handle traffic updates
    this.onMessage('STATUS', (message) => {
      const data = message.data;
      if (data.demands) {
        this.analyzeTraffic(data);
      }
    });
  }

  analyzeTraffic(data) {
    const demands = data.demands;
    const traffic = data.trafficData;

    for (const route of ['A', 'B', 'C', 'D']) {
      const demand = demands[route] || 0;
      const vehicles = traffic[route]?.vehicles || 0;
      const heavy = traffic[route]?.heavyVehicles || 0;

      if (demand > this.thresholdDemand) {
        console.log(
          `⚠️  HIGH TRAFFIC on Route ${route}: ${vehicles} vehicles (${heavy} heavy), Demand: ${demand}`
        );
      }
    }
  }
}

/**
 * Example 3: Adaptive Traffic Injector
 * Injects traffic based on time of day patterns
 */
class AdaptiveTrafficInjector extends TrafficSignalClient {
  async start() {
    await this.connect();
    console.log('Adaptive Traffic Injector started\n');

    // Send traffic updates every 2 seconds
    setInterval(async () => {
      const traffic = this.generateTimeBasedTraffic();
      await this.sendCameraUpdate(traffic);
      this.displayInjection(traffic);
    }, 2000);
  }

  generateTimeBasedTraffic() {
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    const second = new Date().getSeconds();

    let timeOfDay = 'off-peak';
    let baseMultiplier = 1;

    if (hour >= 7 && hour < 9) {
      timeOfDay = 'morning-rush';
      baseMultiplier = 2.5;
    } else if (hour >= 12 && hour < 14) {
      timeOfDay = 'lunch-rush';
      baseMultiplier = 1.8;
    } else if (hour >= 17 && hour < 19) {
      timeOfDay = 'evening-rush';
      baseMultiplier = 2.8;
    }

    // Vary traffic based on cycle
    const cyclePosition = (hour * 60 + minute) % 60;
    const variation = Math.sin((cyclePosition / 60) * 2 * Math.PI);

    return {
      A: {
        vehicles: Math.round((10 + variation * 5) * baseMultiplier),
        heavyVehicles: Math.round((2 + variation * 1) * baseMultiplier)
      },
      B: {
        vehicles: Math.round((8 + variation * 4) * baseMultiplier),
        heavyVehicles: Math.round((1 + variation * 0.5) * baseMultiplier)
      },
      C: {
        vehicles: Math.round((9 + variation * 5) * baseMultiplier),
        heavyVehicles: Math.round((2 + variation * 1) * baseMultiplier)
      },
      D: {
        vehicles: Math.round((11 + variation * 6) * baseMultiplier),
        heavyVehicles: Math.round((3 + variation * 1.5) * baseMultiplier)
      }
    };
  }

  displayInjection(traffic) {
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    let period = 'Off-Peak';

    if (hour >= 7 && hour < 9) period = 'Morning Rush';
    else if (hour >= 12 && hour < 14) period = 'Lunch Rush';
    else if (hour >= 17 && hour < 19) period = 'Evening Rush';

    console.log(
      `[${hour}:${String(minute).padStart(2, '0')}] ${period}: ` +
      `A=${traffic.A.vehicles}(${traffic.A.heavyVehicles}) ` +
      `B=${traffic.B.vehicles}(${traffic.B.heavyVehicles}) ` +
      `C=${traffic.C.vehicles}(${traffic.C.heavyVehicles}) ` +
      `D=${traffic.D.vehicles}(${traffic.D.heavyVehicles})`
    );
  }
}

/**
 * Example 4: Signal Change Detector
 * Alerts when signal state changes
 */
class SignalChangeDetector extends TrafficSignalClient {
  constructor(host, port) {
    super(host, port);
    this.lastSignalState = {};
  }

  async start() {
    await this.connect();
    console.log('Signal Change Detector started\n');

    // Subscribe to all routes
    await this.subscribe('all');

    // Handle updates
    this.onMessage('STATUS', (message) => {
      const data = message.data;
      if (data.signalState) {
        this.detectChanges(data.signalState, data.timestamp);
      }
    });
  }

  detectChanges(signals, timestamp) {
    for (const route of ['A', 'B', 'C', 'D']) {
      const newState = signals[route];
      const oldState = this.lastSignalState[route];

      if (newState !== oldState) {
        console.log(`🚦 Signal Change: Route ${route} changed from ${oldState} to ${newState} at ${timestamp}`);
      }

      this.lastSignalState[route] = newState;
    }
  }
}

/**
 * Example 5: Performance Reporter
 * Reports performance metrics
 */
class PerformanceReporter extends TrafficSignalClient {
  constructor(host, port) {
    super(host, port);
    this.metrics = {
      messagesReceived: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  async start() {
    await this.connect();
    console.log('Performance Reporter started\n');

    // Query status periodically
    setInterval(async () => {
      await this.query('status');
    }, 10000);

    // Count messages
    this.onMessage('STATUS', (message) => {
      this.metrics.messagesReceived++;
    });

    this.onMessage('ERROR', (message) => {
      this.metrics.errors++;
    });

    // Report metrics
    setInterval(() => {
      this.reportMetrics();
    }, 30000);
  }

  reportMetrics() {
    const uptime = Math.floor((Date.now() - this.metrics.startTime) / 1000);
    const messageRate = (this.metrics.messagesReceived / uptime).toFixed(2);

    console.log('\n' + '='.repeat(50));
    console.log('PERFORMANCE METRICS');
    console.log('='.repeat(50));
    console.log(`Uptime: ${uptime} seconds`);
    console.log(`Messages Received: ${this.metrics.messagesReceived}`);
    console.log(`Message Rate: ${messageRate} msg/sec`);
    console.log(`Errors: ${this.metrics.errors}`);
    console.log('='.repeat(50) + '\n');
  }
}

// Demo runner
async function runExample(ExampleClass, name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running Example: ${name}`);
  console.log('='.repeat(60) + '\n');

  const example = new ExampleClass('localhost', 4000);

  try {
    await example.start();

    // Run for 30 seconds then stop
    setTimeout(async () => {
      console.log('\n\nExample completed');
      await example.disconnect();
      process.exit(0);
    }, 30000);
  } catch (error) {
    console.error('Example error:', error.message);
    process.exit(1);
  }

  // Handle interruption
  process.on('SIGINT', async () => {
    console.log('\n\nStopping example...');
    await example.disconnect();
    process.exit(0);
  });
}

// Choose which example to run
const exampleNumber = process.argv[2] || '1';

const examples = {
  '1': [StatusLogger, 'Status Logger - Logs signal status every 3 seconds'],
  '2': [TrafficMonitor, 'Traffic Monitor - Alerts on high traffic'],
  '3': [AdaptiveTrafficInjector, 'Adaptive Traffic Injector - Simulates time-based traffic'],
  '4': [SignalChangeDetector, 'Signal Change Detector - Alerts on signal changes'],
  '5': [PerformanceReporter, 'Performance Reporter - Reports metrics']
};

if (examples[exampleNumber]) {
  const [ExampleClass, description] = examples[exampleNumber];
  runExample(ExampleClass, description).catch(e => {
    console.error('Failed to run example:', e.message);
    process.exit(1);
  });
} else {
  console.log('Available examples:\n');
  for (const [num, [, desc]] of Object.entries(examples)) {
    console.log(`  ${num}. ${desc}`);
  }
  console.log('\nUsage: node examples.js <number>\n');
  process.exit(0);
}

module.exports = {
  StatusLogger,
  TrafficMonitor,
  AdaptiveTrafficInjector,
  SignalChangeDetector,
  PerformanceReporter
};
