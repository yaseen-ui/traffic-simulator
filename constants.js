// Traffic Signal Constants
const SIGNAL_STATES = {
  GREEN: 'GREEN',
  YELLOW: 'YELLOW',
  RED: 'RED'
};

const ROUTES = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D'
};

// Route pairs that move together
const ROUTE_PAIRS = {
  PAIR_1: [ROUTES.A, ROUTES.C],  // Routes A and C move together
  PAIR_2: [ROUTES.B, ROUTES.D]   // Routes B and D move together
};

// Phase definitions
const PHASES = {
  PHASE_AC_GREEN: 'PHASE_AC_GREEN',    // A-C pair is green, B-D pair is red
  PHASE_AC_YELLOW: 'PHASE_AC_YELLOW',  // Transition phase
  PHASE_BD_GREEN: 'PHASE_BD_GREEN',    // B-D pair is green, A-C pair is red
  PHASE_BD_YELLOW: 'PHASE_BD_YELLOW'   // Transition phase
};

// Timing constraints (in seconds)
const TIMING = {
  MIN_GREEN: 5,
  MAX_GREEN: 60,
  YELLOW_DURATION: 3,
  MIN_CYCLE_TIME: 30
};

// Traffic calculation weights
const TRAFFIC_WEIGHTS = {
  NORMAL_VEHICLE: 1,
  HEAVY_VEHICLE: 2.5,  // Heavy vehicles count more in traffic calculation
  BASE_DEMAND_UNIT: 10  // Base unit for one vehicle
};

// Message types
const MESSAGE_TYPES = {
  CAMERA_UPDATE: 'CAMERA_UPDATE',
  SUBSCRIBE: 'SUBSCRIBE',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  QUERY: 'QUERY',
  STATUS: 'STATUS',
  ERROR: 'ERROR'
};

// Server configuration
const SERVER_CONFIG = {
  PORT: 4000,
  HOST: 'localhost',
  MAX_CONNECTIONS: 100,
  SOCKET_TIMEOUT: 30000,  // 30 seconds
  RECONNECT_DELAY: 5000   // 5 seconds
};

module.exports = {
  SIGNAL_STATES,
  ROUTES,
  ROUTE_PAIRS,
  PHASES,
  TIMING,
  TRAFFIC_WEIGHTS,
  MESSAGE_TYPES,
  SERVER_CONFIG
};
