const { MESSAGE_TYPES, ROUTES } = require('./constants');

class MessageHandler {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Parse incoming message from client
   * Handles both complete messages and partial data
   * @param {string} rawData - Raw message data from client
   * @returns {object|null} Parsed message or null if invalid
   */
  parseMessage(rawData) {
    try {
      if (!rawData || typeof rawData !== 'string') {
        return null;
      }

      const trimmed = rawData.trim();
      
      if (!trimmed) {
        return null;
      }

      // Try parsing as JSON
      const message = JSON.parse(trimmed);
      
      // Validate message structure
      if (!message.type) {
        this.logger.warn('Received message without type field');
        return null;
      }

      return message;
    } catch (error) {
      // Silently handle parsing errors - client may send incomplete data
      this.logger.debug('Failed to parse message', {
        error: error.message,
        data: rawData.substring(0, 100) // Log first 100 chars
      });
      return null;
    }
  }

  /**
   * Handle CAMERA_UPDATE message type
   * Updates traffic data for routes
   * @param {object} message - Parsed message
   * @returns {object} Validation result
   */
  validateCameraUpdate(message) {
    if (!message.data || typeof message.data !== 'object') {
      return {
        valid: false,
        error: 'Camera update requires "data" object'
      };
    }

    const data = message.data;
    const validatedData = {};

    // Validate each route in the data
    for (const route of Object.values(ROUTES)) {
      if (data.hasOwnProperty(route)) {
        const routeData = data[route];

        if (typeof routeData !== 'object') {
          return {
            valid: false,
            error: `Route ${route} data must be an object`
          };
        }

        const vehicles = parseInt(routeData.vehicles);
        const heavyVehicles = parseInt(routeData.heavyVehicles);

        // Allow missing fields but validate if present
        if (isNaN(vehicles) && routeData.vehicles !== undefined) {
          return {
            valid: false,
            error: `Route ${route} vehicles must be a valid number`
          };
        }

        if (isNaN(heavyVehicles) && routeData.heavyVehicles !== undefined) {
          return {
            valid: false,
            error: `Route ${route} heavyVehicles must be a valid number`
          };
        }

        validatedData[route] = {
          vehicles: isNaN(vehicles) ? 0 : Math.max(0, vehicles),
          heavyVehicles: isNaN(heavyVehicles) ? 0 : Math.max(0, heavyVehicles)
        };
      }
    }

    return {
      valid: true,
      data: validatedData
    };
  }

  /**
   * Handle SUBSCRIBE message type
   * Client requests to subscribe to signal updates for specific routes
   * @param {object} message - Parsed message
   * @returns {object} Validation result
   */
  validateSubscribe(message) {
    if (!message.routes) {
      return {
        valid: false,
        error: 'Subscribe requires "routes" field (array or "all")'
      };
    }

    let routes = [];

    if (typeof message.routes === 'string' && message.routes === 'all') {
      routes = Object.values(ROUTES);
    } else if (Array.isArray(message.routes)) {
      // Validate each route
      for (const route of message.routes) {
        if (!Object.values(ROUTES).includes(route)) {
          return {
            valid: false,
            error: `Invalid route: ${route}. Valid routes are: A, B, C, D`
          };
        }
      }
      routes = message.routes;
    } else {
      return {
        valid: false,
        error: 'Routes must be an array or "all"'
      };
    }

    return {
      valid: true,
      routes: routes
    };
  }

  /**
   * Handle UNSUBSCRIBE message type
   * @param {object} message - Parsed message
   * @returns {object} Validation result
   */
  validateUnsubscribe(message) {
    if (!message.routes) {
      return {
        valid: false,
        error: 'Unsubscribe requires "routes" field (array or "all")'
      };
    }

    let routes = [];

    if (typeof message.routes === 'string' && message.routes === 'all') {
      routes = Object.values(ROUTES);
    } else if (Array.isArray(message.routes)) {
      for (const route of message.routes) {
        if (!Object.values(ROUTES).includes(route)) {
          return {
            valid: false,
            error: `Invalid route: ${route}`
          };
        }
      }
      routes = message.routes;
    } else {
      return {
        valid: false,
        error: 'Routes must be an array or "all"'
      };
    }

    return {
      valid: true,
      routes: routes
    };
  }

  /**
   * Handle QUERY message type
   * Client requests current status
   * @param {object} message - Parsed message
   * @returns {object} Validation result
   */
  validateQuery(message) {
    const validQueryTypes = ['status', 'phase', 'traffic'];
    
    const queryType = message.queryType || 'status';

    if (!validQueryTypes.includes(queryType)) {
      return {
        valid: false,
        error: `Invalid query type. Valid types are: ${validQueryTypes.join(', ')}`
      };
    }

    return {
      valid: true,
      queryType: queryType
    };
  }

  /**
   * Validate incoming message and extract data
   * @param {string} rawData - Raw message from socket
   * @returns {object} { isValid, type, data, error }
   */
  processIncomingMessage(rawData) {
    const message = this.parseMessage(rawData);

    if (!message) {
      return {
        isValid: false,
        error: 'Failed to parse message'
      };
    }

    const messageType = message.type;

    switch (messageType) {
      case MESSAGE_TYPES.CAMERA_UPDATE: {
        const result = this.validateCameraUpdate(message);
        return {
          isValid: result.valid,
          type: MESSAGE_TYPES.CAMERA_UPDATE,
          data: result.data,
          error: result.error
        };
      }

      case MESSAGE_TYPES.SUBSCRIBE: {
        const result = this.validateSubscribe(message);
        return {
          isValid: result.valid,
          type: MESSAGE_TYPES.SUBSCRIBE,
          routes: result.routes,
          error: result.error
        };
      }

      case MESSAGE_TYPES.UNSUBSCRIBE: {
        const result = this.validateUnsubscribe(message);
        return {
          isValid: result.valid,
          type: MESSAGE_TYPES.UNSUBSCRIBE,
          routes: result.routes,
          error: result.error
        };
      }

      case MESSAGE_TYPES.QUERY: {
        const result = this.validateQuery(message);
        return {
          isValid: result.valid,
          type: MESSAGE_TYPES.QUERY,
          queryType: result.queryType,
          error: result.error
        };
      }

      default:
        return {
          isValid: false,
          error: `Unknown message type: ${messageType}`
        };
    }
  }

  /**
   * Format and serialize a response message
   * @param {object} data - Response data
   * @param {string} type - Message type
   * @returns {string} JSON serialized message
   */
  formatMessage(data, type = MESSAGE_TYPES.STATUS) {
    return JSON.stringify({
      type: type,
      timestamp: new Date().toISOString(),
      data: data
    }) + '\n';
  }

  /**
   * Format error response
   * @param {string} error - Error message
   * @param {string} error_code - Error code
   * @returns {string} JSON serialized error message
   */
  formatError(error, error_code = 'INVALID_MESSAGE') {
    return JSON.stringify({
      type: MESSAGE_TYPES.ERROR,
      timestamp: new Date().toISOString(),
      error: error,
      error_code: error_code
    }) + '\n';
  }
}

module.exports = MessageHandler;
