const TrafficSignalClient = require('./TrafficSignalClient');

/**
 * Camera Simulator Client
 * Simulates a traffic camera sending vehicle count updates
 * Useful for testing the traffic signal system
 */
class CameraSimulator extends TrafficSignalClient {
  constructor(host = 'localhost', port = 4000, debugMode = false) {
    super(host, port, debugMode);
    this.updateInterval = null;
    this.variationMode = 'random'; // 'random', 'wave', 'spike', 'constant'
    this.baseTraffic = {
      A: { vehicles: 5, heavyVehicles: 1 },
      B: { vehicles: 3, heavyVehicles: 1 },
      C: { vehicles: 4, heavyVehicles: 0 },
      D: { vehicles: 6, heavyVehicles: 2 }
    };
  }

  /**
   * Start sending simulated camera updates
   * @param {number} interval - Update interval in milliseconds
   * @param {string} mode - Variation mode
   */
  startSimulation(interval = 5000, mode = 'random') {
    if (!this.isConnected) {
      this.log('Not connected to server', 'error');
      return;
    }

    this.variationMode = mode;
    this.log(`Started camera simulation (${mode} mode, ${interval}ms interval)`);

    this.updateInterval = setInterval(() => {
      const trafficData = this.generateTrafficData();
      this.sendCameraUpdate(trafficData);
      this.displayTraffic(trafficData);
    }, interval);
  }

  /**
   * Stop camera simulation
   */
  stopSimulation() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      this.log('Stopped camera simulation');
    }
  }

  /**
   * Generate traffic data based on variation mode
   * @returns {object} Traffic data for all routes
   */
  generateTrafficData() {
    const timestamp = Math.floor(Date.now() / 1000) % 60;

    let trafficData = {};

    for (const route of ['A', 'B', 'C', 'D']) {
      const base = this.baseTraffic[route];

      if (this.variationMode === 'random') {
        trafficData[route] = {
          vehicles: base.vehicles + Math.floor(Math.random() * 15 - 7),
          heavyVehicles: base.heavyVehicles + Math.floor(Math.random() * 3)
        };
      } else if (this.variationMode === 'wave') {
        // Wave pattern: traffic increases and decreases periodically
        const waveValue = Math.sin((timestamp / 60) * 2 * Math.PI) * 10;
        trafficData[route] = {
          vehicles: Math.max(1, base.vehicles + Math.round(waveValue)),
          heavyVehicles: Math.max(0, base.heavyVehicles + Math.floor(waveValue / 5))
        };
      } else if (this.variationMode === 'spike') {
        // Random traffic spikes
        const spikeChance = Math.random();
        const spike = spikeChance > 0.85 ? 20 : 0;
        trafficData[route] = {
          vehicles: base.vehicles + spike,
          heavyVehicles: Math.max(0, base.heavyVehicles + (spikeChance > 0.9 ? 3 : 0))
        };
      } else {
        // constant
        trafficData[route] = { ...base };
      }

      // Ensure non-negative values
      trafficData[route].vehicles = Math.max(0, trafficData[route].vehicles);
      trafficData[route].heavyVehicles = Math.max(0, trafficData[route].heavyVehicles);
    }

    return trafficData;
  }

  /**
   * Display traffic data in formatted way
   * @param {object} trafficData - Traffic data
   */
  displayTraffic(trafficData) {
    const routes = ['A', 'B', 'C', 'D'];
    let display = '  📹 Camera Update: ';

    for (const route of routes) {
      const data = trafficData[route];
      const bar = '█'.repeat(Math.min(data.vehicles, 10));
      display += `${route}[${bar}${data.vehicles}|Heavy:${data.heavyVehicles}] `;
    }

    console.log(display);
  }

  /**
   * Set base traffic levels
   * @param {object} baseTraffic - Base traffic for each route
   */
  setBaseTraffic(baseTraffic) {
    this.baseTraffic = {
      A: baseTraffic.A || this.baseTraffic.A,
      B: baseTraffic.B || this.baseTraffic.B,
      C: baseTraffic.C || this.baseTraffic.C,
      D: baseTraffic.D || this.baseTraffic.D
    };
    this.log('Base traffic updated', 'info');
  }

  /**
   * Create multiple camera simulators for realistic scenario
   */
  static createMultipleCameras(count = 4, port = 4000) {
    const cameras = [];

    for (let i = 0; i < count; i++) {
      cameras.push(new CameraSimulator('localhost', port, false));
    }

    return cameras;
  }
}

// Example usage
if (require.main === module) {
  const simulator = new CameraSimulator('localhost', 4000, true);

  simulator.connect().then(() => {
    simulator.log('Connected! Starting simulation...', 'info');

    // Simulate different traffic patterns
    simulator.startSimulation(5000, 'wave'); // 'random', 'wave', 'spike', 'constant'

    // Handle termination
    process.on('SIGINT', () => {
      simulator.log('Stopping simulator...', 'warn');
      simulator.stopSimulation();
      simulator.disconnect().then(() => {
        process.exit(0);
      });
    });
  }).catch((error) => {
    simulator.log(`Connection failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = CameraSimulator;
