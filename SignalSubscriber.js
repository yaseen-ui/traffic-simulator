const TrafficSignalClient = require('./TrafficSignalClient');

/**
 * Signal Subscriber Client
 * Subscribes to traffic signal updates and displays them in real-time
 */
class SignalSubscriber extends TrafficSignalClient {
  constructor(host = 'localhost', port = 4000, debugMode = false) {
    super(host, port, debugMode);
    this.subscribedRoutes = [];
    this.signalDisplay = {};
  }

  /**
   * Subscribe to signal updates for specific routes
   * @param {array|string} routes - Routes to subscribe ('all' or ['A', 'B', ...])
   * @returns {Promise}
   */
  async subscribeToRoutes(routes = 'all') {
    if (!this.isConnected) {
      this.log('Not connected to server', 'error');
      return false;
    }

    const result = await this.subscribe(routes);
    
    if (typeof routes === 'string' && routes === 'all') {
      this.subscribedRoutes = ['A', 'B', 'C', 'D'];
    } else if (Array.isArray(routes)) {
      this.subscribedRoutes = routes;
    }

    this.log(`Subscribed to: ${this.subscribedRoutes.join(', ')}`);
    return result;
  }

  /**
   * Initialize signal display data
   */
  initializeDisplay() {
    for (const route of this.subscribedRoutes) {
      this.signalDisplay[route] = {
        state: 'RED',
        lastChanged: Date.now()
      };
    }
  }

  /**
   * Override message handler for STATUS messages to display nicely
   * @param {object} message - Message object
   */
  onSTATUS(message) {
    const data = message.data;

    // Handle different status types
    if (data.phase) {
      // It's a phase update
      this.displayPhaseUpdate(data);
    } else if (data.status) {
      // It's an acknowledgement or subscription confirmation
      this.log(`${data.status}: ${data.message || ''}`);
    }
  }

  /**
   * Display phase/signal update
   * @param {object} phaseInfo - Phase information
   */
  displayPhaseUpdate(phaseInfo) {
    const signals = phaseInfo.signalState || {};
    const timestamp = new Date().toLocaleTimeString();

    // Build display
    let display = `🕐 ${timestamp} | `;

    for (const route of this.subscribedRoutes) {
      const state = signals[route] || 'RED';
      const stateIcon = this.getStateIcon(state);
      display += `${route}:${stateIcon}${state.padEnd(6, ' ')} `;
    }

    // Add phase info
    display += `| Phase: ${phaseInfo.phase} (${phaseInfo.elapsedSeconds}/${phaseInfo.totalDurationSeconds}s)`;

    console.log(display);

    // Update display cache
    for (const route of this.subscribedRoutes) {
      this.signalDisplay[route].state = signals[route] || 'RED';
      this.signalDisplay[route].lastChanged = Date.now();
    }
  }

  /**
   * Get emoji for signal state
   * @param {string} state - Signal state
   * @returns {string} Emoji icon
   */
  getStateIcon(state) {
    const icons = {
      'GREEN': '🟢',
      'YELLOW': '🟡',
      'RED': '🔴'
    };
    return icons[state] || '⚪';
  }

  /**
   * Request and display full status
   * @returns {Promise}
   */
  async displayFullStatus() {
    if (!this.isConnected) {
      this.log('Not connected to server', 'error');
      return;
    }

    // Register handler for this query
    this.onMessage('STATUS', (message) => {
      console.log('\n' + '='.repeat(70));
      console.log('FULL SYSTEM STATUS');
      console.log('='.repeat(70));
      console.log(JSON.stringify(message.data, null, 2));
      console.log('='.repeat(70) + '\n');
    });

    return this.query('status');
  }

  /**
   * Request traffic status
   * @returns {Promise}
   */
  async displayTrafficStatus() {
    if (!this.isConnected) {
      this.log('Not connected to server', 'error');
      return;
    }

    this.onMessage('STATUS', (message) => {
      const data = message.data;
      console.log('\n📊 TRAFFIC STATUS:');
      console.log('-'.repeat(50));
      
      if (data.trafficData && data.demands) {
        for (const route of this.subscribedRoutes) {
          const traffic = data.trafficData[route] || {};
          const demand = data.demands[route] || 0;
          console.log(
            `  Route ${route}: ${traffic.vehicles || 0} vehicles, ${traffic.heavyVehicles || 0} heavy | Demand: ${demand}`
          );
        }
      }
      console.log('-'.repeat(50) + '\n');
    });

    return this.query('traffic');
  }

  /**
   * Unsubscribe from routes
   * @param {array|string} routes - Routes to unsubscribe
   * @returns {Promise}
   */
  async unsubscribeFromRoutes(routes = 'all') {
    if (!this.isConnected) {
      this.log('Not connected to server', 'error');
      return false;
    }

    const result = await this.unsubscribe(routes);
    
    if (typeof routes === 'string' && routes === 'all') {
      this.subscribedRoutes = [];
    } else if (Array.isArray(routes)) {
      this.subscribedRoutes = this.subscribedRoutes.filter(r => !routes.includes(r));
    }

    this.log(`Unsubscribed from: ${typeof routes === 'string' ? routes : routes.join(', ')}`);
    return result;
  }

  /**
   * Start watching signal changes in real-time
   * Polls for initial status then watches for updates
   * @returns {Promise}
   */
  async startWatching() {
    if (!this.isConnected) {
      this.log('Not connected to server', 'error');
      return;
    }

    this.initializeDisplay();
    this.log('Watching for signal changes...');
    
    // Get initial status
    await this.query('status');
  }
}

// Example usage
if (require.main === module) {
  const subscriber = new SignalSubscriber('localhost', 4000, false);

  subscriber.connect().then(async () => {
    subscriber.log('Connected to server', 'info');

    // Subscribe to all routes
    await subscriber.subscribeToRoutes('all');

    // Start watching
    await subscriber.startWatching();

    // Get traffic status after 2 seconds
    setTimeout(async () => {
      await subscriber.displayTrafficStatus();
    }, 2000);

    // Get full status after 5 seconds
    setTimeout(async () => {
      await subscriber.displayFullStatus();
    }, 5000);

    // Handle termination
    process.on('SIGINT', () => {
      subscriber.log('Stopping subscriber...', 'warn');
      subscriber.unsubscribeFromRoutes('all').then(() => {
        subscriber.disconnect().then(() => {
          process.exit(0);
        });
      });
    });
  }).catch((error) => {
    subscriber.log(`Connection failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = SignalSubscriber;
