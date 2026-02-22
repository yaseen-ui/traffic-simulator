const { MESSAGE_TYPES, ROUTES } = require('./constants');

/**
 * Represents a connected client
 */
class ClientConnection {
  constructor(id, socket, logger) {
    this.id = id;
    this.socket = socket;
    this.logger = logger;
    this.subscribedRoutes = new Set();
    this.isActive = true;
    this.createdAt = Date.now();
    this.lastMessageAt = Date.now();
    this.bufferedData = '';
  }

  /**
   * Subscribe to routes
   * @param {array} routes - Route identifiers
   */
  subscribeToRoutes(routes) {
    for (const route of routes) {
      this.subscribedRoutes.add(route);
    }
  }

  /**
   * Unsubscribe from routes
   * @param {array} routes - Route identifiers
   */
  unsubscribeFromRoutes(routes) {
    for (const route of routes) {
      this.subscribedRoutes.delete(route);
    }
  }

  /**
   * Check if subscribed to a route
   * @param {string} route - Route identifier
   * @returns {boolean}
   */
  isSubscribedTo(route) {
    return this.subscribedRoutes.has(route);
  }

  /**
   * Get subscription status
   * @returns {array} List of subscribed routes
   */
  getSubscriptions() {
    return Array.from(this.subscribedRoutes);
  }

  /**
   * Clear all subscriptions
   */
  clearSubscriptions() {
    this.subscribedRoutes.clear();
  }

  /**
   * Send message to client
   * @param {string} message - Message to send
   * @returns {Promise} Resolves when sent or error occurs
   */
  sendMessage(message) {
    return new Promise((resolve) => {
      if (!this.isActive || !this.socket) {
        resolve(false);
        return;
      }

      this.socket.write(message, (error) => {
        if (error) {
          this.logger.warn(`Failed to send message to client ${this.id}`, {
            error: error.message
          });
          this.isActive = false;
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * Update last activity timestamp
   */
  updateActivity() {
    this.lastMessageAt = Date.now();
  }

  /**
   * Close connection
   */
  close() {
    this.isActive = false;
    if (this.socket && !this.socket.destroyed) {
      this.socket.destroy();
    }
  }

  /**
   * Get client information
   */
  getInfo() {
    return {
      id: this.id,
      subscriptions: this.getSubscriptions(),
      isActive: this.isActive,
      createdAt: new Date(this.createdAt).toISOString(),
      lastMessageAt: new Date(this.lastMessageAt).toISOString()
    };
  }
}

/**
 * Manages all client connections and their subscriptions
 */
class ClientManager {
  constructor(logger) {
    this.logger = logger;
    this.clients = new Map();
    this.nextClientId = 1;
  }

  /**
   * Add a new client connection
   * @param {socket} socket - Socket.io socket or TCP socket object
   * @returns {object} ClientConnection instance
   */
  addClient(socket) {
    const clientId = this.nextClientId++;
    const client = new ClientConnection(clientId, socket, this.logger);

    this.clients.set(clientId, client);

    this.logger.info(`Client connected`, {
      clientId: clientId,
      totalClients: this.clients.size,
      remoteAddress: socket.remoteAddress
    });

    return client;
  }

  /**
   * Remove a client connection
   * @param {number} clientId - Client identifier
   */
  removeClient(clientId) {
    const client = this.clients.get(clientId);
    
    if (client) {
      client.close();
      this.clients.delete(clientId);

      this.logger.info(`Client disconnected`, {
        clientId: clientId,
        totalClients: this.clients.size
      });

      return true;
    }

    return false;
  }

  /**
   * Get client by ID
   * @param {number} clientId - Client identifier
   * @returns {ClientConnection|null}
   */
  getClient(clientId) {
    return this.clients.get(clientId) || null;
  }

  /**
   * Get all active clients
   * @returns {array} Array of ClientConnection objects
   */
  getActiveClients() {
    return Array.from(this.clients.values()).filter(c => c.isActive);
  }

  /**
   * Get all client count
   * @returns {number}
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * Subscribe client to routes
   * @param {number} clientId - Client identifier
   * @param {array} routes - Route identifiers
   * @returns {boolean}
   */
  subscribeClient(clientId, routes) {
    const client = this.getClient(clientId);
    
    if (!client) {
      return false;
    }

    client.subscribeToRoutes(routes);
    
    this.logger.debug(`Client subscribed`, {
      clientId: clientId,
      routes: routes,
      allSubscriptions: client.getSubscriptions()
    });

    return true;
  }

  /**
   * Unsubscribe client from routes
   * @param {number} clientId - Client identifier
   * @param {array} routes - Route identifiers
   * @returns {boolean}
   */
  unsubscribeClient(clientId, routes) {
    const client = this.getClient(clientId);
    
    if (!client) {
      return false;
    }

    client.unsubscribeFromRoutes(routes);

    this.logger.debug(`Client unsubscribed`, {
      clientId: clientId,
      routes: routes,
      remainingSubscriptions: client.getSubscriptions()
    });

    return true;
  }

  /**
   * Get all clients subscribed to specific routes
   * @param {array} routes - Route identifiers (optional, returns all if omitted)
   * @returns {array} Array of client IDs
   */
  getSubscribedClients(routes = null) {
    return Array.from(this.clients.values())
      .filter(client => {
        if (!client.isActive) return false;
        
        if (!routes) return client.getSubscriptions().length > 0;
        
        // Check if client is subscribed to any of the specified routes
        return routes.some(route => client.isSubscribedTo(route));
      })
      .map(client => client.id);
  }

  /**
   * Broadcast message to clients
   * @param {string} message - Message to send
   * @param {array} routes - If specified, only send to clients subscribed to these routes
   * @param {array} excludeClientIds - Client IDs to exclude
   * @returns {Promise} Resolves when all messages sent
   */
  async broadcastMessage(message, routes = null, excludeClientIds = []) {
    let targetClientIds;

    if (routes) {
      targetClientIds = this.getSubscribedClients(routes);
    } else {
      targetClientIds = this.getActiveClients().map(c => c.id);
    }

    // Filter out excluded clients
    targetClientIds = targetClientIds.filter(id => !excludeClientIds.includes(id));

    const promises = [];

    for (const clientId of targetClientIds) {
      const client = this.getClient(clientId);
      
      if (client && client.isActive) {
        promises.push(client.sendMessage(message));
      }
    }

    const results = await Promise.all(promises);
    
    // Count successful sends
    const successCount = results.filter(r => r).length;
    
    this.logger.debug(`Broadcast message sent`, {
      targetClients: targetClientIds.length,
      successCount: successCount,
      routes: routes || 'all'
    });

    return {
      targetCount: targetClientIds.length,
      successCount: successCount
    };
  }

  /**
   * Send message to specific client
   * @param {number} clientId - Client identifier
   * @param {string} message - Message to send
   * @returns {Promise<boolean>} True if sent successfully
   */
  async sendToClient(clientId, message) {
    const client = this.getClient(clientId);
    
    if (!client) {
      return false;
    }

    return client.sendMessage(message);
  }

  /**
   * Get all client info
   * @returns {array} Array of client info objects
   */
  getAllClientsInfo() {
    return Array.from(this.clients.values()).map(client => client.getInfo());
  }

  /**
   * Clean up inactive clients (optional periodic maintenance)
   * @param {number} inactivityThreshold - Time in milliseconds
   * @returns {number} Number of clients removed
   */
  cleanupInactiveClients(inactivityThreshold = 60000) {
    const now = Date.now();
    let removedCount = 0;

    for (const [clientId, client] of this.clients.entries()) {
      if (!client.isActive || (now - client.lastMessageAt > inactivityThreshold)) {
        this.removeClient(clientId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.info(`Cleaned up inactive clients`, {
        removedCount: removedCount,
        remainingClients: this.clients.size
      });
    }

    return removedCount;
  }

  /**
   * Reset all clients
   */
  resetAllClients() {
    for (const clientId of Array.from(this.clients.keys())) {
      this.removeClient(clientId);
    }
  }
}

module.exports = ClientManager;
