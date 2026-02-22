const {
  SIGNAL_STATES,
  ROUTES,
  PHASES,
  TIMING
} = require('./constants');

const TrafficCalculator = require('./TrafficCalculator');

class TrafficSignalController {
  constructor(logger) {
    this.logger = logger;
    this.calculator = new TrafficCalculator();

    // Current state of signals for each route
    this.signalState = {
      [ROUTES.A]: SIGNAL_STATES.RED,
      [ROUTES.B]: SIGNAL_STATES.RED,
      [ROUTES.C]: SIGNAL_STATES.RED,
      [ROUTES.D]: SIGNAL_STATES.RED
    };

    // Traffic data for each route
    this.trafficData = {
      [ROUTES.A]: { vehicles: 0, heavyVehicles: 0 },
      [ROUTES.B]: { vehicles: 0, heavyVehicles: 0 },
      [ROUTES.C]: { vehicles: 0, heavyVehicles: 0 },
      [ROUTES.D]: { vehicles: 0, heavyVehicles: 0 }
    };

    // Current phase
    this.currentPhase = PHASES.PHASE_AC_GREEN;

    // Timing information
    this.phaseStartTime = Date.now();
    this.currentPhaseDuration = TIMING.MIN_GREEN;
    this.yellowTimeRemaining = 0;
    this.isInYellow = false;

    // Last state for change detection
    this.lastBroadcastState = JSON.stringify(this.signalState);
  }

  /**
   * Update traffic data for a specific route
   * @param {string} route - Route identifier (A, B, C, D)
   * @param {number} vehicles - Vehicle count
   * @param {number} heavyVehicles - Heavy vehicle count
   */
  updateTrafficData(route, vehicles, heavyVehicles) {
    if (!Object.values(ROUTES).includes(route)) {
      throw new Error(`Invalid route: ${route}`);
    }

    this.trafficData[route] = {
      vehicles: Math.max(0, parseInt(vehicles) || 0),
      heavyVehicles: Math.max(0, parseInt(heavyVehicles) || 0)
    };

    this.logger.debug(`Traffic updated for route ${route}`, {
      vehicles: this.trafficData[route].vehicles,
      heavyVehicles: this.trafficData[route].heavyVehicles
    });
  }

  /**
   * Get current signal state for all routes
   * @returns {object} Current signal states
   */
  getSignalState() {
    return { ...this.signalState };
  }

  /**
   * Get current phase information
   * @returns {object} Phase details
   */
  getPhaseInfo() {
    const elapsedTime = Math.round((Date.now() - this.phaseStartTime) / 1000);
    
    return {
      phase: this.currentPhase,
      signalState: this.getSignalState(),
      elapsedSeconds: elapsedTime,
      totalDurationSeconds: this.currentPhaseDuration,
      remainingSeconds: Math.max(0, this.currentPhaseDuration - elapsedTime),
      isYellow: this.isInYellow,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate demands from current traffic data
   * @returns {object} Demands for each route
   */
  calculateDemands() {
    return this.calculator.calculateAllDemands(this.trafficData);
  }

  /**
   * Execute phase transition
   * Handles switching between phases and yellow transitions
   */
  executePhaseTransition() {
    const demands = this.calculateDemands();
    const demandA = demands[ROUTES.A];
    const demandB = demands[ROUTES.B];
    const demandC = demands[ROUTES.C];
    const demandD = demands[ROUTES.D];

    // Determine next phase
    let nextPhase;
    let nextPhaseDuration;

    if (this.isInYellow) {
      // Yellow phase ending, transition to green
      this.isInYellow = false;

      if (this.currentPhase === PHASES.PHASE_AC_YELLOW) {
        nextPhase = PHASES.PHASE_BD_GREEN;
        nextPhaseDuration = this.calculator.calculateGreenDuration(
          demandA,
          demandB,
          demandC,
          demandD,
          nextPhase
        );
      } else {
        nextPhase = PHASES.PHASE_AC_GREEN;
        nextPhaseDuration = this.calculator.calculateGreenDuration(
          demandA,
          demandB,
          demandC,
          demandD,
          nextPhase
        );
      }
    } else {
      // Green phase ending, transition to yellow
      this.isInYellow = true;

      if (this.currentPhase === PHASES.PHASE_AC_GREEN) {
        nextPhase = PHASES.PHASE_AC_YELLOW;
      } else {
        nextPhase = PHASES.PHASE_BD_YELLOW;
      }
      nextPhaseDuration = TIMING.YELLOW_DURATION;
    }

    // Update state
    this.currentPhase = nextPhase;
    this.currentPhaseDuration = nextPhaseDuration;
    this.phaseStartTime = Date.now();

    // Apply signal state based on phase
    this.applyPhaseSignals();

    this.logger.info(`Phase transition executed`, {
      newPhase: this.currentPhase,
      durationSeconds: this.currentPhaseDuration,
      allSignals: this.signalState
    });
  }

  /**
   * Apply signal states based on current phase
   */
  applyPhaseSignals() {
    // Reset all to RED
    for (const route of Object.values(ROUTES)) {
      this.signalState[route] = SIGNAL_STATES.RED;
    }

    if (this.currentPhase === PHASES.PHASE_AC_GREEN) {
      this.signalState[ROUTES.A] = SIGNAL_STATES.GREEN;
      this.signalState[ROUTES.C] = SIGNAL_STATES.GREEN;
    } else if (this.currentPhase === PHASES.PHASE_AC_YELLOW) {
      this.signalState[ROUTES.A] = SIGNAL_STATES.YELLOW;
      this.signalState[ROUTES.C] = SIGNAL_STATES.YELLOW;
    } else if (this.currentPhase === PHASES.PHASE_BD_GREEN) {
      this.signalState[ROUTES.B] = SIGNAL_STATES.GREEN;
      this.signalState[ROUTES.D] = SIGNAL_STATES.GREEN;
    } else if (this.currentPhase === PHASES.PHASE_BD_YELLOW) {
      this.signalState[ROUTES.B] = SIGNAL_STATES.YELLOW;
      this.signalState[ROUTES.D] = SIGNAL_STATES.YELLOW;
    }
  }

  /**
   * Check if phase duration has elapsed and execute transition if needed
   * @returns {boolean} True if state changed
   */
  updatePhase() {
    const elapsedTime = Math.round((Date.now() - this.phaseStartTime) / 1000);

    if (elapsedTime >= this.currentPhaseDuration) {
      this.executePhaseTransition();
      return true;
    }

    return false;
  }

  /**
   * Check if signal state has changed since last broadcast
   * @returns {boolean} True if state changed
   */
  hasStateChanged() {
    const currentState = JSON.stringify(this.signalState);
    const hasChanged = currentState !== this.lastBroadcastState;
    
    if (hasChanged) {
      this.lastBroadcastState = currentState;
    }

    return hasChanged;
  }

  /**
   * Reset controller to initial state
   */
  reset() {
    this.signalState = {
      [ROUTES.A]: SIGNAL_STATES.RED,
      [ROUTES.B]: SIGNAL_STATES.RED,
      [ROUTES.C]: SIGNAL_STATES.RED,
      [ROUTES.D]: SIGNAL_STATES.RED
    };

    this.trafficData = {
      [ROUTES.A]: { vehicles: 0, heavyVehicles: 0 },
      [ROUTES.B]: { vehicles: 0, heavyVehicles: 0 },
      [ROUTES.C]: { vehicles: 0, heavyVehicles: 0 },
      [ROUTES.D]: { vehicles: 0, heavyVehicles: 0 }
    };

    this.currentPhase = PHASES.PHASE_AC_GREEN;
    this.phaseStartTime = Date.now();
    this.currentPhaseDuration = TIMING.MIN_GREEN;
    this.isInYellow = false;
    this.lastBroadcastState = JSON.stringify(this.signalState);

    this.applyPhaseSignals();
    this.logger.info('Traffic signal controller reset to initial state');
  }

  /**
   * Get comprehensive system status
   * @returns {object} Complete system status
   */
  getStatus() {
    return {
      timestamp: new Date().toISOString(),
      phase: this.getPhaseInfo(),
      traffic: this.trafficData,
      demands: this.calculateDemands(),
      signals: this.signalState
    };
  }
}

module.exports = TrafficSignalController;
