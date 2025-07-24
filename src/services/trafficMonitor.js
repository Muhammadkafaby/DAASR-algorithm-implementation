/**
 * Traffic Monitoring Service
 *
 * Real-time traffic analysis and monitoring for DAASR algorithm
 *
 * @module trafficMonitor
 * @author DAASR Team
 * @version 1.0.0
 */

const winston = require("winston");
const config = require("../config/default");

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/traffic.log" }),
    new winston.transports.Console(),
  ],
});

/**
 * Traffic Monitoring Service
 *
 * Provides real-time traffic analysis including:
 * - Request rate calculation
 * - Response time tracking
 * - Error rate monitoring
 * - Traffic pattern analysis
 */
class TrafficMonitor {
  constructor() {
    this.requestHistory = [];
    this.errorHistory = [];
    this.responseTimeHistory = [];
    this.trafficStats = {
      requestsPerSecond: 0,
      requestsPerMinute: 0,
      averageResponseTime: 0,
      errorRate: 0,
      totalRequests: 0,
      totalErrors: 0,
      peakRequestsPerSecond: 0,
      peakResponseTime: 0,
      lastUpdated: Date.now(),
    };

    this.startMonitoring();
  }

  /**
   * Start traffic monitoring
   */
  startMonitoring() {
    // Clean up old data every minute
    setInterval(() => {
      this.cleanupOldData();
      this.calculateStats();
    }, 60000);

    // Log traffic stats every 5 minutes
    setInterval(() => {
      this.logTrafficStats();
    }, 300000);

    logger.info("Traffic monitoring started");
  }

  /**
   * Record a request
   * @param {Object} requestData - Request metadata
   */
  recordRequest(requestData) {
    const now = Date.now();

    this.requestHistory.push({
      timestamp: now,
      ip: requestData.ip,
      method: requestData.method,
      url: requestData.url,
      userAgent: requestData.userAgent,
    });

    this.trafficStats.totalRequests++;

    // Keep only last hour of data
    const oneHourAgo = now - 3600000;
    this.requestHistory = this.requestHistory.filter(
      (req) => req.timestamp > oneHourAgo
    );
  }

  /**
   * Record a response
   * @param {Object} responseData - Response metadata
   */
  recordResponse(responseData) {
    const now = Date.now();

    this.responseTimeHistory.push({
      timestamp: now,
      responseTime: responseData.responseTime,
      statusCode: responseData.statusCode,
      contentLength: responseData.contentLength,
    });

    // Track errors
    if (responseData.statusCode >= 400) {
      this.errorHistory.push({
        timestamp: now,
        statusCode: responseData.statusCode,
        message: responseData.message,
      });
      this.trafficStats.totalErrors++;
    }

    // Keep only last hour of data
    const oneHourAgo = now - 3600000;
    this.responseTimeHistory = this.responseTimeHistory.filter(
      (res) => res.timestamp > oneHourAgo
    );
    this.errorHistory = this.errorHistory.filter(
      (err) => err.timestamp > oneHourAgo
    );
  }

  /**
   * Calculate current traffic statistics
   */
  calculateStats() {
    const now = Date.now();

    // Calculate requests per second (last minute average)
    const oneMinuteAgo = now - 60000;
    const recentRequests = this.requestHistory.filter(
      (req) => req.timestamp > oneMinuteAgo
    );

    this.trafficStats.requestsPerMinute = recentRequests.length;
    this.trafficStats.requestsPerSecond = Math.round(
      recentRequests.length / 60
    );

    // Calculate average response time
    const recentResponses = this.responseTimeHistory.filter(
      (res) => res.timestamp > oneMinuteAgo
    );

    if (recentResponses.length > 0) {
      const totalResponseTime = recentResponses.reduce(
        (sum, res) => sum + res.responseTime,
        0
      );
      this.trafficStats.averageResponseTime = Math.round(
        totalResponseTime / recentResponses.length
      );

      // Update peak response time
      const maxResponseTime = Math.max(
        ...recentResponses.map((res) => res.responseTime)
      );
      this.trafficStats.peakResponseTime = Math.max(
        this.trafficStats.peakResponseTime,
        maxResponseTime
      );
    }

    // Calculate error rate
    const recentErrors = this.errorHistory.filter(
      (err) => err.timestamp > oneMinuteAgo
    );

    if (recentRequests.length > 0) {
      this.trafficStats.errorRate = recentErrors.length / recentRequests.length;
    }

    // Update peak requests per second
    this.trafficStats.peakRequestsPerSecond = Math.max(
      this.trafficStats.peakRequestsPerSecond,
      this.trafficStats.requestsPerSecond
    );

    this.trafficStats.lastUpdated = now;
  }

  /**
   * Clean up old data
   */
  cleanupOldData() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    this.requestHistory = this.requestHistory.filter(
      (req) => req.timestamp > oneHourAgo
    );
    this.responseTimeHistory = this.responseTimeHistory.filter(
      (res) => res.timestamp > oneHourAgo
    );
    this.errorHistory = this.errorHistory.filter(
      (err) => err.timestamp > oneHourAgo
    );
  }

  /**
   * Get current traffic statistics
   * @returns {Object} Current traffic statistics
   */
  getCurrentStats() {
    this.calculateStats();
    return { ...this.trafficStats };
  }

  /**
   * Get traffic history
   * @param {number} minutes - Number of minutes to retrieve
   * @returns {Object} Traffic history
   */
  getTrafficHistory(minutes = 60) {
    const now = Date.now();
    const cutoff = now - minutes * 60000;

    return {
      requests: this.requestHistory.filter((req) => req.timestamp > cutoff),
      responses: this.responseTimeHistory.filter(
        (res) => res.timestamp > cutoff
      ),
      errors: this.errorHistory.filter((err) => err.timestamp > cutoff),
    };
  }

  /**
   * Get traffic patterns
   * @returns {Object} Traffic pattern analysis
   */
  getTrafficPatterns() {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;

    const recentRequests = this.requestHistory.filter(
      (req) => req.timestamp > fiveMinutesAgo
    );

    // Analyze request patterns
    const patterns = {
      topEndpoints: {},
      topIPs: {},
      topUserAgents: {},
      methodDistribution: {},
      statusCodeDistribution: {},
      hourlyDistribution: {},
    };

    recentRequests.forEach((req) => {
      // Top endpoints
      const endpoint = req.url.split("?")[0];
      patterns.topEndpoints[endpoint] =
        (patterns.topEndpoints[endpoint] || 0) + 1;

      // Top IPs
      patterns.topIPs[req.ip] = (patterns.topIPs[req.ip] || 0) + 1;

      // Top user agents
      patterns.topUserAgents[req.userAgent] =
        (patterns.topUserAgents[req.userAgent] || 0) + 1;

      // Method distribution
      patterns.methodDistribution[req.method] =
        (patterns.methodDistribution[req.method] || 0) + 1;

      // Hourly distribution
      const hour = new Date(req.timestamp).getHours();
      patterns.hourlyDistribution[hour] =
        (patterns.hourlyDistribution[hour] || 0) + 1;
    });

    return patterns;
  }

  /**
   * Get system health metrics
   * @returns {Object} System health metrics
   */
  getSystemHealth() {
    const stats = this.getCurrentStats();

    return {
      status: this.calculateHealthStatus(stats),
      metrics: {
        requestsPerSecond: stats.requestsPerSecond,
        averageResponseTime: stats.averageResponseTime,
        errorRate: stats.errorRate,
        totalRequests: stats.totalRequests,
        totalErrors: stats.totalErrors,
      },
      thresholds: {
        highTraffic: config.get("highTrafficThreshold") || 100,
        mediumTraffic: config.get("mediumTrafficThreshold") || 50,
        criticalErrorRate: config.get("criticalErrorRate") || 0.1,
        warningErrorRate: config.get("warningErrorRate") || 0.05,
        criticalResponseTime: config.get("criticalResponseTime") || 1000,
        warningResponseTime: config.get("warningResponseTime") || 500,
      },
    };
  }

  /**
   * Calculate health status based on metrics
   * @param {Object} stats - Traffic statistics
   * @returns {string} Health status
   */
  calculateHealthStatus(stats) {
    const thresholds = {
      highTrafficThreshold: 100,
      mediumTrafficThreshold: 50,
      criticalErrorRate: 0.1,
      warningErrorRate: 0.05,
      criticalResponseTime: 1000,
      warningResponseTime: 500,
    };

    if (stats.requestsPerSecond > thresholds.highTrafficThreshold) {
      return "high-load";
    }

    if (stats.requestsPerSecond > thresholds.mediumTrafficThreshold) {
      return "medium-load";
    }

    if (stats.errorRate > thresholds.criticalErrorRate) {
      return "critical";
    }

    if (stats.errorRate > thresholds.warningErrorRate) {
      return "warning";
    }

    if (stats.averageResponseTime > thresholds.criticalResponseTime) {
      return "critical";
    }

    if (stats.averageResponseTime > thresholds.warningResponseTime) {
      return "warning";
    }

    return "healthy";
  }

  /**
   * Log traffic statistics
   */
  logTrafficStats() {
    const stats = this.getCurrentStats();
    const patterns = this.getTrafficPatterns();

    logger.info("Traffic statistics", {
      stats,
      topEndpoints: Object.entries(patterns.topEndpoints)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
      topIPs: Object.entries(patterns.topIPs)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
      methodDistribution: patterns.methodDistribution,
    });
  }

  /**
   * Get detailed analytics combining stats and patterns
   * @returns {Object} Detailed analytics data
   */
  getDetailedAnalytics() {
    const stats = this.getCurrentStats();
    const patterns = this.getTrafficPatterns();
    const systemHealth = this.getSystemHealth();
    
    return {
      ...stats,
      patterns,
      health: systemHealth,
      summary: {
        totalRequests: stats.totalRequests,
        totalErrors: stats.totalErrors,
        uptime: Date.now() - (stats.lastUpdated - 3600000), // Approximate uptime
        status: systemHealth.status
      }
    };
  }

  /**
   * Reset statistics
   */
  reset() {
    this.requestHistory = [];
    this.errorHistory = [];
    this.responseTimeHistory = [];
    this.trafficStats = {
      requestsPerSecond: 0,
      requestsPerMinute: 0,
      averageResponseTime: 0,
      errorRate: 0,
      totalRequests: 0,
      totalErrors: 0,
      peakRequestsPerSecond: 0,
      peakResponseTime: 0,
      lastUpdated: Date.now(),
    };

    logger.info("Traffic statistics reset");
  }
}

// Create singleton instance
const trafficMonitor = new TrafficMonitor();

// Express middleware to integrate with DAASR
function trafficMonitoringMiddleware(req, res, next) {
  const startTime = Date.now();

  // Record request
  trafficMonitor.recordRequest({
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    url: req.url,
    userAgent: req.get("User-Agent"),
  });

  // Override res.end to capture response data
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    const responseTime = Date.now() - startTime;

    trafficMonitor.recordResponse({
      responseTime,
      statusCode: res.statusCode,
      contentLength: res.get("content-length") || 0,
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
}

module.exports = trafficMonitor;
module.exports.trafficMonitoringMiddleware = trafficMonitoringMiddleware;