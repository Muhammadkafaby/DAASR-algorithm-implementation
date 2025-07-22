/**
 * DAASR Middleware - Dynamic Adaptive Algorithm for Scalable Rate-limiting
 *
 * This middleware implements the DAASR algorithm which dynamically adjusts
 * rate limits based on real-time traffic analysis and system load.
 *
 * @module daasr
 * @author DAASR Team
 * @version 1.0.0
 */

const rateLimit = require("express-rate-limit");
const winston = require("winston");
const config = require("../config/default");
const trafficMonitor = require("../services/trafficMonitor");
const { normalizeTrafficData } = require("../utils/helpers");

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/daasr.log" }),
    new winston.transports.Console(),
  ],
});

/**
 * DAASR Rate Limiting Algorithm
 *
 * The algorithm considers:
 * 1. Current traffic volume
 * 2. Request patterns (burst vs steady)
 * 3. System resource utilization
 * 4. Historical traffic data
 * 5. User behavior patterns
 */
class DAASRAlgorithm {
  constructor() {
    this.trafficHistory = new Map();
    this.userPatterns = new Map();
    this.currentLimits = new Map();
    this.lastAdjustment = Date.now();
    this.adjustmentInterval = config.adjustmentInterval || 30000; // 30 seconds
  }

  /**
   * Calculate dynamic rate limit based on current conditions
   * @param {string} identifier - IP address or user identifier
   * @param {Object} requestData - Request metadata
   * @returns {Object} Rate limit configuration
   */
  calculateDynamicLimit(identifier, requestData) {
    const now = Date.now();
    const trafficStats = trafficMonitor.getCurrentStats();

    // Get base configuration
    const baseConfig = config.getConfig();

    // Calculate traffic multiplier
    const trafficMultiplier = this.calculateTrafficMultiplier(trafficStats);

    // Calculate burst factor
    const burstFactor = this.calculateBurstFactor(identifier, requestData);

    // Calculate resource factor
    const resourceFactor = this.calculateResourceFactor();

    // Calculate user reputation factor
    const reputationFactor = this.calculateUserReputation(identifier);

    // Calculate penalty factor
    const penaltyFactor = this.calculatePenaltyFactor(identifier);

    // Calculate final rate limit
    const baseLimit = baseConfig.baseRateLimit;
    const dynamicLimit = Math.max(
      baseConfig.minRateLimit,
      Math.min(
        baseConfig.maxRateLimit,
        Math.round(
          baseLimit *
            trafficMultiplier *
            burstFactor *
            resourceFactor *
            reputationFactor *
            penaltyFactor
        )
      )
    );

    // Calculate window size based on traffic pattern
    const windowSize = this.calculateWindowSize(trafficStats);

    // Log adjustment
    if (now - this.lastAdjustment > this.adjustmentInterval) {
      logger.info("DAASR adjustment", {
        identifier,
        dynamicLimit,
        trafficMultiplier,
        burstFactor,
        resourceFactor,
        reputationFactor,
        windowSize,
      });
      this.lastAdjustment = now;
    }

    return {
      windowMs: windowSize,
      max: dynamicLimit,
      message: {
        error: "Rate limit exceeded",
        retryAfter: Math.ceil(windowSize / 1000),
        limit: dynamicLimit,
        algorithm: "DAASR-v1",
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        this.handleRateLimit(req, res, dynamicLimit, windowSize);
      },
    };
  }

  /**
   * Calculate traffic multiplier based on current traffic volume
   * @param {Object} trafficStats - Current traffic statistics
   * @returns {number} Traffic multiplier
   */
  calculateTrafficMultiplier(trafficStats) {
    const { requestsPerSecond, averageResponseTime, errorRate } = trafficStats;

    // High traffic = lower limits
    if (requestsPerSecond > 1000) return 0.5;
    if (requestsPerSecond > 500) return 0.7;
    if (requestsPerSecond > 100) return 0.9;

    // High error rate = lower limits
    if (errorRate > 0.1) return 0.6;
    if (errorRate > 0.05) return 0.8;

    // High response time = lower limits
    if (averageResponseTime > 1000) return 0.7;
    if (averageResponseTime > 500) return 0.9;

    return 1.0;
  }

  /**
   * Calculate burst factor based on request patterns
   * @param {string} identifier - User identifier
   * @param {Object} requestData - Request metadata
   * @returns {number} Burst factor
   */
  calculateBurstFactor(identifier, requestData) {
    const userHistory = this.userPatterns.get(identifier) || {
      requests: [],
      burstScore: 1.0,
    };

    const now = Date.now();
    const recentRequests = userHistory.requests.filter(
      (req) => now - req.timestamp < 60000 // Last minute
    );

    // Calculate burst score
    const burstScore = Math.max(0.5, 1 - recentRequests.length / 100);

    // Update user history
    userHistory.requests.push({
      timestamp: now,
      url: requestData.url,
      method: requestData.method,
    });

    // Keep only last 100 requests
    if (userHistory.requests.length > 100) {
      userHistory.requests = userHistory.requests.slice(-100);
    }

    this.userPatterns.set(identifier, userHistory);

    return burstScore;
  }

  /**
   * Calculate resource factor based on system load
   * @returns {number} Resource factor
   */
  calculateResourceFactor() {
    // This would typically integrate with system monitoring
    // For now, return 1.0 as placeholder
    return 1.0;
  }

  /**
   * Calculate user reputation factor
   * @param {string} identifier - User identifier
   * @returns {number} Reputation factor
   */
  calculateUserReputation(identifier) {
    const userHistory = this.userPatterns.get(identifier);
    if (!userHistory) return 1.0;

    // Calculate reputation based on historical behavior
    const totalRequests = userHistory.requests.length;
    const recentRequests = userHistory.requests.filter(
      (req) => Date.now() - req.timestamp < 3600000 // Last hour
    ).length;

    // New users get slightly higher limits
    if (totalRequests < 10) return 1.2;

    // Active users get standard limits
    return 1.0;
  }

  /**
   * Calculate penalty factor for repeat offenders
   * @param {string} identifier - User identifier
   * @returns {number} Penalty factor
   */
  calculatePenaltyFactor(identifier) {
    const userHistory = this.userPatterns.get(identifier);
    if (!userHistory || !userHistory.offenses) {
      return 1.0;
    }

    // Reduce penalty over time (e.g., one offense "forgiven" every 15 minutes)
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    userHistory.offenses = userHistory.offenses.filter(
      (offenseTime) => now - offenseTime < fifteenMinutes
    );

    // Apply penalty: 10% reduction for each recent offense, up to a max of 50%
    const penalty = Math.max(0.5, 1.0 - userHistory.offenses.length * 0.1);
    return penalty;
  }

  /**
   * Calculate optimal window size based on traffic pattern
   * @param {Object} trafficStats - Current traffic statistics
   * @returns {number} Window size in milliseconds
   */
  calculateWindowSize(trafficStats) {
    const { requestsPerSecond } = trafficStats;

    // Shorter windows for high traffic, longer for low traffic
    if (requestsPerSecond > 100) return 60000; // 1 minute
    if (requestsPerSecond > 10) return 5 * 60000; // 5 minutes
    return 15 * 60000; // 15 minutes
  }

  /**
   * Handle rate limit exceeded
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} limit - Current rate limit
   * @param {number} windowSize - Rate limit window size
   */
  handleRateLimit(req, res, limit, windowSize) {
    const identifier = req.ip || req.connection.remoteAddress;

    // Record the offense
    const userHistory = this.userPatterns.get(identifier) || {
      requests: [],
      offenses: [],
    };
    userHistory.offenses = userHistory.offenses || [];
    userHistory.offenses.push(Date.now());
    this.userPatterns.set(identifier, userHistory);

    logger.warn("Rate limit exceeded", {
      identifier,
      limit,
      windowSize,
      userAgent: req.get("User-Agent"),
      url: req.url,
      offenseCount: userHistory.offenses.length,
    });

    res.status(429).json({
      error: "Rate limit exceeded",
      retryAfter: Math.ceil(windowSize / 1000),
      limit,
      algorithm: "DAASR-v1",
      timestamp: new Date().toISOString(),
    });
  }
}

// Create singleton instance
const daasrAlgorithm = new DAASRAlgorithm();

/**
 * DAASR Express middleware
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware function
 */
function createDAASRMiddleware(options = {}) {
  const limiter = rateLimit({
    // `max` and `windowMs` are calculated dynamically for each request
    max: (req) => {
      const identifier = req.ip || req.connection.remoteAddress;
      const requestData = {
        url: req.url,
        method: req.method,
        userAgent: req.get("User-Agent"),
        timestamp: Date.now(),
      };
      const dynamicConfig = daasrAlgorithm.calculateDynamicLimit(
        identifier,
        requestData
      );
      return dynamicConfig.max;
    },
    windowMs: (req) => {
      const identifier = req.ip || req.connection.remoteAddress;
      const requestData = {
        url: req.url,
        method: req.method,
        userAgent: req.get("User-Agent"),
        timestamp: Date.now(),
      };
      const dynamicConfig = daasrAlgorithm.calculateDynamicLimit(
        identifier,
        requestData
      );
      return dynamicConfig.windowMs;
    },
    handler: (req, res, next, options) => {
      const identifier = req.ip || req.connection.remoteAddress;
      const requestData = {
        url: req.url,
        method: req.method,
        userAgent: req.get("User--Agent"),
        timestamp: Date.now(),
      };
      const dynamicConfig = daasrAlgorithm.calculateDynamicLimit(
        identifier,
        requestData
      );
      daasrAlgorithm.handleRateLimit(
        req,
        res,
        dynamicConfig.max,
        dynamicConfig.windowMs
      );
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });

  return limiter;
}

// Export middleware
module.exports = createDAASRMiddleware();

// Export for testing
module.exports.DAASRAlgorithm = DAASRAlgorithm;
