const net = require('net');
const {
  SERVER_CONFIG,
  MESSAGE_TYPES,
  ROUTES
} = require('./constants');

const Logger = require('./Logger');
const TrafficSignalController = require('./TrafficSignalController');
const ClientManager = require('./ClientManager');
const MessageHandler = require('./MessageHandler');

class TrafficSignalServer {
  constructor(port = SERVER_CONFIG.PORT, host = SERVER_CONFIG.HOST, debugMode = false) {
    this.port = port;
    this.host = host;
    this.logger = new Logger(debugMode);
    this.signalController = new TrafficSignalController(this.logger);
    this.clientManager = new ClientManager(this.logger);
    this.messageHandler = new MessageHandler(this.logger);

    this.server = null;
    this.isRunning = false;
    this.phaseUpdateInterval = null;
    this.broadcastInterval = null;
    this.cleanupInterval = null;
    this.lastBroadcastState = null;

    // Update frequency (100ms for responsive updates)
    this.UPDATE_INTERVAL = 100;
    // Broadcast frequency (500ms - only on change)
    this.BROADCAST_INTERVAL = 500;
    // Cleanup frequency (30 seconds)
    this.CLEANUP_INTERVAL = 30000;
  }

  /**
   * Initialize and start the server
   */
  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = net.createServer((socket) => {
          this.handleNewConnection(socket);
        });

        this.server.on('error', (error) => {
          this.logger.error('Server error', { error: error.message });
          reject(error);
        });

        this.server.listen(this.port, this.host, () => {
          this.isRunning = true;
          this.logger.success(`Traffic Signal Server started`, {
            address: `${this.host}:${this.port}`,
            environment: 'Terminal-based'
          });

          // Start background processing
          this.startPhaseUpdates();
          this.startBroadcasting();
          this.startCleanup();

          resolve();
        });
      } catch (error) {
        this.logger.error('Failed to start server', { error: error.message });
        reject(error);
      }
    });
  }

  /**
   * Handle new client connection
   * @param {socket} socket - TCP socket
   */
  handleNewConnection(socket) {
    // Set socket options
    socket.setEncoding('utf8');
    socket.setTimeout(SERVER_CONFIG.SOCKET_TIMEOUT);

    // Add client
    const client = this.clientManager.addClient(socket);

    // Send welcome message
    const welcomeMsg = this.messageHandler.formatMessage({
      clientId: client.id,
      message: `Welcome to Traffic Signal Server. Client ID: ${client.id}`
    }, MESSAGE_TYPES.STATUS);

    socket.write(welcomeMsg);

    // Handle incoming data
    socket.on('data', (data) => {
      this.handleClientData(client.id, data);
    });

    // Handle socket end
    socket.on('end', () => {
      this.handleClientDisconnect(client.id);
    });

    // Handle socket errors
    socket.on('error', (error) => {
      this.logger.warn(`Socket error for client ${client.id}`, {
        error: error.message
      });
      this.handleClientDisconnect(client.id);
    });

    // Handle timeout
    socket.on('timeout', () => {
      this.logger.warn(`Socket timeout for client ${client.id}`);
      this.handleClientDisconnect(client.id);
    });
  }

  /**
   * Handle data received from client
   * May contain partial messages, so buffer incomplete data
   * @param {number} clientId - Client identifier
   * @param {string} data - Data received
   */
  handleClientData(clientId, data) {
    const client = this.clientManager.getClient(clientId);

    if (!client) {
      return;
    }

    client.updateActivity();

    // Add to buffer
    client.bufferedData += data;

    // Process complete messages (separated by newlines)
    const messages = client.bufferedData.split('\n');

    // Last element is incomplete (or empty if ended with newline)
    client.bufferedData = messages.pop();

    for (const message of messages) {
      if (message.trim()) {
        this.processClientMessage(clientId, message);
      }
    }
  }

  /**
   * Process a complete message from client
   * @param {number} clientId - Client identifier
   * @param {string} rawMessage - Raw message data
   */
  processClientMessage(clientId, rawMessage) {
    const client = this.clientManager.getClient(clientId);

    if (!client) {
      return;
    }

    // Parse and validate message
    const result = this.messageHandler.processIncomingMessage(rawMessage);

    if (!result.isValid) {
      // Send error response
      const errorMsg = this.messageHandler.formatError(
        result.error,
        'INVALID_MESSAGE'
      );
      client.sendMessage(errorMsg);
      return;
    }

    // Handle by type
    switch (result.type) {
      case MESSAGE_TYPES.CAMERA_UPDATE:
        this.handleCameraUpdate(clientId, result.data);
        break;

      case MESSAGE_TYPES.SUBSCRIBE:
        this.handleSubscribe(clientId, result.routes);
        break;

      case MESSAGE_TYPES.UNSUBSCRIBE:
        this.handleUnsubscribe(clientId, result.routes);
        break;

      case MESSAGE_TYPES.QUERY:
        this.handleQuery(clientId, result.queryType);
        break;

      default:
        const errorMsg = this.messageHandler.formatError(
          'Unknown message type'
        );
        client.sendMessage(errorMsg);
    }
  }

  /**
   * Handle CAMERA_UPDATE message
   * @param {number} clientId - Client identifier
   * @param {object} trafficData - Traffic data per route
   */
  handleCameraUpdate(clientId, trafficData) {
    const client = this.clientManager.getClient(clientId);

    if (!client) {
      return;
    }

    try {
      // Update traffic data in controller
      for (const route of Object.values(ROUTES)) {
        if (trafficData[route]) {
          this.signalController.updateTrafficData(
            route,
            trafficData[route].vehicles,
            trafficData[route].heavyVehicles
          );
        }
      }

      // Send acknowledgement
      const ackMsg = this.messageHandler.formatMessage({
        status: 'accepted',
        message: 'Traffic data received',
        dataProcessed: Object.keys(trafficData).length
      }, MESSAGE_TYPES.STATUS);

      client.sendMessage(ackMsg);

      this.logger.debug(`Camera update from client ${clientId}`, trafficData);
    } catch (error) {
      const errorMsg = this.messageHandler.formatError(
        `Failed to process camera update: ${error.message}`
      );
      client.sendMessage(errorMsg);
    }
  }

  /**
   * Handle SUBSCRIBE message
   * @param {number} clientId - Client identifier
   * @param {array} routes - Routes to subscribe to
   */
  handleSubscribe(clientId, routes) {
    const client = this.clientManager.getClient(clientId);

    if (!client) {
      return;
    }

    const success = this.clientManager.subscribeClient(clientId, routes);

    if (success) {
      const subscriptionMsg = this.messageHandler.formatMessage({
        status: 'subscribed',
        routes: routes,
        message: `Subscribed to ${routes.join(', ')} signal updates`
      }, MESSAGE_TYPES.STATUS);

      client.sendMessage(subscriptionMsg);
    } else {
      const errorMsg = this.messageHandler.formatError('Failed to subscribe');
      client.sendMessage(errorMsg);
    }
  }

  /**
   * Handle UNSUBSCRIBE message
   * @param {number} clientId - Client identifier
   * @param {array} routes - Routes to unsubscribe from
   */
  handleUnsubscribe(clientId, routes) {
    const client = this.clientManager.getClient(clientId);

    if (!client) {
      return;
    }

    const success = this.clientManager.unsubscribeClient(clientId, routes);

    if (success) {
      const unsubMsg = this.messageHandler.formatMessage({
        status: 'unsubscribed',
        routes: routes,
        message: `Unsubscribed from ${routes.join(', ')} signal updates`
      }, MESSAGE_TYPES.STATUS);

      client.sendMessage(unsubMsg);
    } else {
      const errorMsg = this.messageHandler.formatError('Failed to unsubscribe');
      client.sendMessage(errorMsg);
    }
  }

  /**
   * Handle QUERY message
   * @param {number} clientId - Client identifier
   * @param {string} queryType - Type of query (status, phase, traffic)
   */
  handleQuery(clientId, queryType) {
    const client = this.clientManager.getClient(clientId);

    if (!client) {
      return;
    }

    let responseData;

    try {
      switch (queryType) {
        case 'status':
          responseData = this.signalController.getStatus();
          break;

        case 'phase':
          responseData = this.signalController.getPhaseInfo();
          break;

        case 'traffic':
          responseData = {
            trafficData: this.signalController.trafficData,
            demands: this.signalController.calculateDemands()
          };
          break;

        default:
          responseData = this.signalController.getStatus();
      }

      const response = this.messageHandler.formatMessage(responseData, MESSAGE_TYPES.STATUS);
      client.sendMessage(response);
    } catch (error) {
      const errorMsg = this.messageHandler.formatError(
        `Query failed: ${error.message}`
      );
      client.sendMessage(errorMsg);
    }
  }

  /**
   * Handle client disconnection
   * @param {number} clientId - Client identifier
   */
  handleClientDisconnect(clientId) {
    this.clientManager.removeClient(clientId);
  }

  /**
   * Start phase update loop
   * Checks if phase duration has elapsed and executes transitions
   */
  startPhaseUpdates() {
    this.phaseUpdateInterval = setInterval(() => {
      try {
        const stateChanged = this.signalController.updatePhase();

        if (stateChanged) {
          this.logger.info('Phase changed', {
            phase: this.signalController.currentPhase,
            signals: this.signalController.getSignalState()
          });
        }
      } catch (error) {
        this.logger.error('Error during phase update', { error: error.message });
      }
    }, this.UPDATE_INTERVAL);

    this.logger.debug('Phase update loop started', {
      interval: this.UPDATE_INTERVAL
    });
  }

  /**
   * Start broadcasting loop
   * Sends signal state updates to subscribed clients when state changes
   */
  startBroadcasting() {
    this.broadcastInterval = setInterval(() => {
      try {
        // Check if state has changed
        if (!this.signalController.hasStateChanged()) {
          return;
        }

        const currentState = this.signalController.getPhaseInfo();
        const message = this.messageHandler.formatMessage(
          currentState,
          MESSAGE_TYPES.STATUS
        );

        // Broadcast to all subscribed clients (they receive updates only if subscribed)
        this.clientManager.broadcastMessage(message);
      } catch (error) {
        this.logger.error('Error during broadcast', { error: error.message });
      }
    }, this.BROADCAST_INTERVAL);

    this.logger.debug('Broadcasting loop started', {
      interval: this.BROADCAST_INTERVAL
    });
  }

  /**
   * Start cleanup loop
   * Periodically removes inactive clients
   */
  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      try {
        const removed = this.clientManager.cleanupInactiveClients();
      } catch (error) {
        this.logger.error('Error during cleanup', { error: error.message });
      }
    }, this.CLEANUP_INTERVAL);

    this.logger.debug('Cleanup loop started', {
      interval: this.CLEANUP_INTERVAL
    });
  }

  /**
   * Stop the server and clean up resources
   */
  stop() {
    return new Promise((resolve) => {
      this.isRunning = false;

      // Clear intervals
      if (this.phaseUpdateInterval) clearInterval(this.phaseUpdateInterval);
      if (this.broadcastInterval) clearInterval(this.broadcastInterval);
      if (this.cleanupInterval) clearInterval(this.cleanupInterval);

      // Disconnect all clients
      this.clientManager.resetAllClients();

      // Close server
      if (this.server) {
        this.server.close(() => {
          this.logger.success('Traffic Signal Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Display server status in terminal
   */
  displayStatus() {
    console.log('\n' + '='.repeat(70));
    console.log('TRAFFIC SIGNAL SERVER STATUS');
    console.log('='.repeat(70));
    
    const phaseInfo = this.signalController.getPhaseInfo();
    const status = this.signalController.getStatus();

    console.log(`\n📍 SERVER: ${this.host}:${this.port} | Active: ${this.isRunning ? '✓' : '✗'}`);
    console.log(`👥 CLIENTS: ${this.clientManager.getClientCount()} connected`);

    console.log(`\n🚦 SIGNAL STATE:`);
    for (const route of Object.values(ROUTES)) {
      const signal = status.signals[route];
      const symbolMap = {
        'GREEN': '🟢',
        'YELLOW': '🟡',
        'RED': '🔴'
      };
      console.log(`   Route ${route}: ${symbolMap[signal] || '⚪'} ${signal}`);
    }

    console.log(`\n📊 TRAFFIC DATA:`);
    for (const route of Object.values(ROUTES)) {
      const traffic = status.traffic[route];
      const demand = status.demands[route];
      console.log(
        `   Route ${route}: ${traffic.vehicles} vehicles, ${traffic.heavyVehicles} heavy | Demand: ${demand}`
      );
    }

    console.log(`\n⏱️  PHASE: ${phaseInfo.phase}`);
    console.log(`   Elapsed: ${phaseInfo.elapsedSeconds}s / Total: ${phaseInfo.totalDurationSeconds}s`);
    console.log(`   Remaining: ${phaseInfo.remainingSeconds}s`);
    console.log(`   Yellow: ${phaseInfo.isYellow ? 'YES' : 'NO'}`);

    console.log(`\n💾 CLIENT SUBSCRIPTIONS:`);
    const clients = this.clientManager.getAllClientsInfo();
    if (clients.length === 0) {
      console.log('   No active subscriptions');
    } else {
      for (const client of clients) {
        console.log(`   Client ${client.id}: ${client.subscriptions.join(', ') || 'none'}`);
      }
    }

    console.log('\n' + '='.repeat(70) + '\n');
  }

  /**
   * Periodic status display
   */
  startStatusDisplay(interval = 10000) {
    setInterval(() => {
      this.displayStatus();
    }, interval);
  }
}

// Main execution
if (require.main === module) {
  const server = new TrafficSignalServer(
    SERVER_CONFIG.PORT,
    SERVER_CONFIG.HOST,
    process.env.DEBUG === 'true'
  );

  server.start().then(() => {
    server.startStatusDisplay(15000); // Display status every 15 seconds

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n\nShutting down server...');
      server.stop().then(() => {
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('\n\nTerminating server...');
      server.stop().then(() => {
        process.exit(0);
      });
    });
  }).catch((error) => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  });
}

module.exports = TrafficSignalServer;
