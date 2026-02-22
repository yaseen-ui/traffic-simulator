// Simple logging utility with timestamps
const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
  SUCCESS: 'SUCCESS'
};

const LOG_COLORS = {
  INFO: '\x1b[36m',      // Cyan
  WARN: '\x1b[33m',      // Yellow
  ERROR: '\x1b[31m',     // Red
  DEBUG: '\x1b[35m',     // Magenta
  SUCCESS: '\x1b[32m',   // Green
  RESET: '\x1b[0m'       // Reset
};

class Logger {
  constructor(debugMode = false) {
    this.debugMode = debugMode;
  }

  getTimestamp() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').slice(0, 19);
  }

  formatMessage(level, message, data = null) {
    const timestamp = this.getTimestamp();
    const color = LOG_COLORS[level];
    const reset = LOG_COLORS.RESET;
    
    let output = `${color}[${timestamp}] [${level}]${reset} ${message}`;
    
    if (data !== null && data !== undefined) {
      if (typeof data === 'object') {
        output += ` ${JSON.stringify(data)}`;
      } else {
        output += ` ${data}`;
      }
    }
    
    return output;
  }

  info(message, data = null) {
    console.log(this.formatMessage(LOG_LEVELS.INFO, message, data));
  }

  warn(message, data = null) {
    console.warn(this.formatMessage(LOG_LEVELS.WARN, message, data));
  }

  error(message, data = null) {
    console.error(this.formatMessage(LOG_LEVELS.ERROR, message, data));
  }

  debug(message, data = null) {
    if (this.debugMode) {
      console.log(this.formatMessage(LOG_LEVELS.DEBUG, message, data));
    }
  }

  success(message, data = null) {
    console.log(this.formatMessage(LOG_LEVELS.SUCCESS, message, data));
  }

  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
}

module.exports = Logger;
