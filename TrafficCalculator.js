const {
  TIMING,
  TRAFFIC_WEIGHTS,
  ROUTES,
  ROUTE_PAIRS
} = require('./constants');

class TrafficCalculator {
  /**
   * Calculate demand score for a route based on traffic data
   * @param {number} vehicleCount - Number of normal vehicles
   * @param {number} heavyVehicleCount - Number of heavy vehicles
   * @returns {number} Demand score
   */
  calculateDemand(vehicleCount, heavyVehicleCount) {
    const normalDemand = vehicleCount * TRAFFIC_WEIGHTS.NORMAL_VEHICLE;
    const heavyDemand = heavyVehicleCount * TRAFFIC_WEIGHTS.HEAVY_VEHICLE;
    return normalDemand + heavyDemand;
  }

  /**
   * Calculate green signal duration based on traffic demand
   * Uses adaptive algorithm: proportional allocation based on demand
   * @param {number} demandA - Demand for route A
   * @param {number} demandB - Demand for route B
   * @param {number} demandC - Demand for route C
   * @param {number} demandD - Demand for route D
   * @param {string} phase - Current phase (PHASE_AC_GREEN or PHASE_BD_GREEN)
   * @returns {number} Green signal duration in seconds
   */
  calculateGreenDuration(demandA, demandB, demandC, demandD, phase) {
    // Ensure all demands are non-negative numbers
    demandA = Math.max(0, Number(demandA) || 0);
    demandB = Math.max(0, Number(demandB) || 0);
    demandC = Math.max(0, Number(demandC) || 0);
    demandD = Math.max(0, Number(demandD) || 0);

    // Get the pair being evaluated
    let pair1Demand, pair2Demand;
    
    if (phase === 'PHASE_AC_GREEN' || phase === 'PHASE_AC_YELLOW') {
      // A-C pair
      pair1Demand = demandA + demandC;
      pair2Demand = demandB + demandD;
    } else {
      // B-D pair
      pair1Demand = demandB + demandD;
      pair2Demand = demandA + demandC;
    }

    // Calculate total demand
    const totalDemand = pair1Demand + pair2Demand;

    // If no traffic, use minimum green
    if (totalDemand === 0) {
      return TIMING.MIN_GREEN;
    }

    // Proportional allocation: give more time to the pair with more demand
    // But balance it relative to other pair's demand too
    const pair1Ratio = pair1Demand / totalDemand;
    const pair2Ratio = pair2Demand / totalDemand;

    // Available time range
    const timeRange = TIMING.MAX_GREEN - TIMING.MIN_GREEN;

    // Calculate green duration with some weighting towards equilibrium
    // Higher demand gets more time, but we stay within min/max constraints
    let greenDuration = TIMING.MIN_GREEN + (timeRange * pair1Ratio * 0.8);

    return Math.round(greenDuration);
  }

  /**
   * Validate traffic data
   * @param {object} trafficData - Traffic data object
   * @returns {object} Validated and sanitized data
   */
  validateTrafficData(trafficData) {
    const validated = {};

    // List of valid routes
    const validRoutes = Object.values(ROUTES);

    for (const route of validRoutes) {
      const vehicleCount = parseInt(trafficData[route]?.vehicles) || 0;
      const heavyVehicleCount = parseInt(trafficData[route]?.heavyVehicles) || 0;

      validated[route] = {
        vehicles: Math.max(0, vehicleCount),
        heavyVehicles: Math.max(0, heavyVehicleCount)
      };
    }

    return validated;
  }

  /**
   * Get demand for a route pair
   * @param {object} demands - Object with demand for each route
   * @param {array} routePair - Pair of routes (e.g., ['A', 'C'])
   * @returns {number} Combined demand
   */
  getPairDemand(demands, routePair) {
    const route1Demand = demands[routePair[0]] || 0;
    const route2Demand = demands[routePair[1]] || 0;
    return route1Demand + route2Demand;
  }

  /**
   * Calculate all route demands from traffic data
   * @param {object} trafficData - Traffic data with vehicles and heavyVehicles per route
   * @returns {object} Demands for each route
   */
  calculateAllDemands(trafficData) {
    const demands = {};

    for (const route of Object.values(ROUTES)) {
      const routeData = trafficData[route] || { vehicles: 0, heavyVehicles: 0 };
      demands[route] = this.calculateDemand(
        routeData.vehicles,
        routeData.heavyVehicles
      );
    }

    return demands;
  }

  /**
   * Get cycle time recommendation based on total traffic
   * @param {object} demands - Demands for all routes
   * @returns {number} Recommended cycle time
   */
  getCycleTime(demands) {
    const totalDemand = Object.values(demands).reduce((sum, d) => sum + d, 0);
    
    if (totalDemand === 0) {
      return TIMING.MIN_CYCLE_TIME;
    }

    // Cycle time scales with total demand
    // More traffic = longer cycle, but cap at reasonable max
    const baseMultiplier = Math.min(totalDemand / 100, 2); // Max 2x multiplier
    let cycleTime = TIMING.MIN_CYCLE_TIME * (1 + baseMultiplier);

    // Add 6 seconds for two yellow phases
    cycleTime += TIMING.YELLOW_DURATION * 2;

    return Math.round(cycleTime);
  }
}

module.exports = TrafficCalculator;
