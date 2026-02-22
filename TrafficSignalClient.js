const net = require('net');

/**
 * Base client for connecting to Traffic Signal Server
 * Handles socket communication and message formatting
 */
class TrafficSignalClient {
  constructor(host = 'localhost', port = 4000, debugMode = false) {
    this.host = host;
    this.port = port;
    this.socket = null;
    this.isConnected = false;
    this.debugMode = debugMode;
    this.bufferedData = '';
    this.clientId = null;
    this.messageHandlers = {};
  }

  /**
   * Connect to the server
   * @returns {Promise}
   */
  connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection({ host: this.host, port: this.port });

      this.socket.setEncoding('utf8');
      this.socket.setTimeout(30000);

      this.socket.on('connect', () => {
        this.isConnected = true;
        this.log('Connected to server');
        resolve();
      });

      this.socket.on('data', (data) => {
        this.handleData(data);
      });

      this.socket.on('end', () => {
        this.isConnected = false;
        this.log('Disconnected from server');
      });

      this.socket.on('error', (error) => {
        this.log(`Socket error: ${error.message}`, 'error');
        reject(error);
      });

      this.socket.on('timeout', () => {
        this.log('Socket timeout', 'warn');
        this.disconnect();
      });
    });
  }

  /**
   * Handle incoming data from server
   * Buffers incomplete messages
   * @param {string} data - Data received
   */
  handleData(data) {
    this.bufferedData += data;

    const messages = this.bufferedData.split('\n');
    this.bufferedData = messages.pop();

    for (const message of messages) {
      if (message.trim()) {
        this.processMessage(message);
      }
    }
  }

  /**
   * Process received message
   * @param {string} rawMessage - Raw message data
   */
  processMessage(rawMessage) {
    try {
      const message = JSON.parse(rawMessage);
      
      this.log(`Received: ${message.type}`, 'info');
      
      // Call registered handler if exists
      const handlerName = `on${message.type}`;
      if (typeof this[handlerName] === 'function') {
        this[handlerName](message);
      }

      // Call generic handler if registered
      if (this.messageHandlers[message.type]) {
        this.messageHandlers[message.type](message);
      }
    } catch (error) {
      this.log(`Failed to parse message: ${error.message}`, 'error');
    }
  }

  /**
   * Send a message to the server
   * @param {object} messageObj - Message object
   * @returns {Promise}
   */
  sendMessage(messageObj) {
    return new Promise((resolve) => {
      if (!this.isConnected || !this.socket) {
        this.log('Not connected to server', 'error');
        resolve(false);
        return;
      }

      const messageStr = JSON.stringify(messageObj) + '\n';
      
      this.socket.write(messageStr, (error) => {
        if (error) {
          this.log(`Send error: ${error.message}`, 'error');
          resolve(false);
        } else {
          this.log(`Sent: ${messageObj.type}`, 'debug');
          resolve(true);
        }
      });
    });
  }

  /**
   * Send camera update
   * @param {object} trafficData - Traffic data per route
   * @returns {Promise}
   */
  sendCameraUpdate(trafficData) {
    return this.sendMessage({
      type: 'CAMERA_UPDATE',
      data: trafficData
    });
  }

  /**
   * Subscribe to routes
   * @param {array|string} routes - Routes to subscribe ('all' or array like ['A', 'B'])
   * @returns {Promise}
   */
  subscribe(routes = 'all') {
    return this.sendMessage({
      type: 'SUBSCRIBE',
      routes: routes
    });
  }

  /**
   * Unsubscribe from routes
   * @param {array|string} routes - Routes to unsubscribe
   * @returns {Promise}
   */
  unsubscribe(routes = 'all') {
    return this.sendMessage({
      type: 'UNSUBSCRIBE',
      routes: routes
    });
  }

  /**
   * Query server status
   * @param {string} queryType - Type of query (status, phase, traffic)
   * @returns {Promise}
   */
  query(queryType = 'status') {
    return this.sendMessage({
      type: 'QUERY',
      queryType: queryType
    });
  }

  /**
   * Register a message handler
   * @param {string} messageType - Message type to handle
   * @param {function} handler - Handler function
   */
  onMessage(messageType, handler) {
    this.messageHandlers[messageType] = handler;
  }

  /**
   * Handle STATUS messages
   * @param {object} message - Message object
   */
  onSTATUS(message) {
    if (this.debugMode) {
      console.log('[STATUS]', JSON.stringify(message.data, null, 2));
    }
  }

  /**
   * Handle ERROR messages
   * @param {object} message - Message object
   */
  onERROR(message) {
    this.log(`Server error: ${message.error}`, 'error');
  }

  /**
   * Disconnect from server
   * @returns {Promise}
   */
  disconnect() {
    return new Promise((resolve) => {
      if (this.socket) {
        this.socket.destroy();
      }
      this.isConnected = false;
      this.log('Disconnected');
      resolve();
    });
  }

  /**
   * Logging utility
   * @param {string} message - Message to log
   * @param {string} level - Log level
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    const levelColors = {
      info: '\x1b[36m',
      debug: '\x1b[35m',
      warn: '\x1b[33m',
      error: '\x1b[31m'
    };
    const reset = '\x1b[0m';
    const color = levelColors[level] || '';

    if (level === 'debug' && !this.debugMode) return;

    console.log(`${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}`);
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnectedToServer() {
    return this.isConnected;
  }
}

module.exports = TrafficSignalClient;
