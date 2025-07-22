/**
 * Utility Functions
 *
 * Common utility functions for DAASR middleware
 *
 * @module helpers
 * @author DAASR Team
 * @version 1.0.0
 */

const crypto = require("crypto");

/**
 * Normalize traffic data for consistent processing
 * @param {Object} data - Raw traffic data
 * @returns {Object} Normalized traffic data
 */
function normalizeTrafficData(data) {
  if (!data || typeof data !== "object") {
    return {
      requests: 0,
      errors: 0,
      responseTime: 0,
      timestamp: Date.now(),
    };
  }

  return {
    requests: Math.max(0, parseInt(data.requests) || 0),
    errors: Math.max(0, parseInt(data.errors) || 0),
    responseTime: Math.max(0, parseFloat(data.responseTime) || 0),
    timestamp: parseInt(data.timestamp) || Date.now(),
  };
}

/**
 * Calculate exponential moving average
 * @param {number} current - Current value
 * @param {number} previous - Previous average
 * @param {number} alpha - Smoothing factor (0-1)
 * @returns {number} New average
 */
function exponentialMovingAverage(current, previous, alpha = 0.3) {
  if (previous === null || previous === undefined) {
    return current;
  }

  return alpha * current + (1 - alpha) * previous;
}

/**
 * Generate unique request ID
 * @returns {string} Unique request ID
 */
function generateRequestId() {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Parse user agent string
 * @param {string} userAgent - User agent string
 * @returns {Object} Parsed user agent info
 */
function parseUserAgent(userAgent) {
  if (!userAgent || typeof userAgent !== "string") {
    return {
      browser: "unknown",
      version: "unknown",
      os: "unknown",
      device: "unknown",
    };
  }

  // Simple user agent parsing
  const ua = userAgent.toLowerCase();

  let browser = "unknown";
  let version = "unknown";
  let os = "unknown";
  let device = "desktop";

  // Browser detection
  if (ua.includes("chrome") && !ua.includes("edge")) {
    browser = "chrome";
    const match = ua.match(/chrome\/([\d.]+)/);
    version = match ? match[1] : "unknown";
  } else if (ua.includes("firefox")) {
    browser = "firefox";
    const match = ua.match(/firefox\/([\d.]+)/);
    version = match ? match[1] : "unknown";
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    browser = "safari";
    const match = ua.match(/version\/([\d.]+)/);
    version = match ? match[1] : "unknown";
  } else if (ua.includes("edge")) {
    browser = "edge";
    const match = ua.match(/edge\/([\d.]+)/);
    version = match ? match[1] : "unknown";
  }

  // OS detection
  if (ua.includes("windows")) {
    os = "windows";
  } else if (ua.includes("mac os")) {
    os = "macos";
  } else if (ua.includes("linux")) {
    os = "linux";
  } else if (ua.includes("android")) {
    os = "android";
  } else if (ua.includes("ios")) {
    os = "ios";
  }

  // Device detection
  if (ua.includes("mobile")) {
    device = "mobile";
  } else if (ua.includes("tablet")) {
    device = "tablet";
  }

  return {
    browser,
    version,
    os,
    device,
    raw: userAgent,
  };
}

/**
 * Calculate request signature for pattern matching
 * @param {Object} request - Request object
 * @returns {string} Request signature
 */
function calculateRequestSignature(request) {
  const parts = [
    request.method || "GET",
    request.url ? request.url.split("?")[0] : "/",
    request.headers && request.headers["user-agent"]
      ? parseUserAgent(request.headers["user-agent"]).browser
      : "unknown",
  ];

  return crypto.createHash("md5").update(parts.join("|")).digest("hex");
}

/**
 * Validate IP address format
 * @param {string} ip - IP address
 * @returns {boolean} Whether IP is valid
 */
function isValidIP(ip) {
  if (!ip || typeof ip !== "string") {
    return false;
  }

  // IPv4 validation
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Regex.test(ip)) {
    return true;
  }

  // IPv6 validation
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  if (ipv6Regex.test(ip)) {
    return true;
  }

  return false;
}

/**
 * Rate limit window calculation
 * @param {number} requests - Number of requests
 * @param {number} windowMs - Window size in milliseconds
 * @returns {number} Rate per second
 */
function calculateRatePerSecond(requests, windowMs) {
  if (windowMs <= 0) return 0;
  return (requests * 1000) / windowMs;
}

/**
 * Retry-after header calculation
 * @param {number} resetTime - Reset time in milliseconds
 * @returns {string} Retry-after value
 */
function calculateRetryAfter(resetTime) {
  const now = Date.now();
  const diff = Math.max(0, resetTime - now);
  return Math.ceil(diff / 1000).toString();
}

/**
 * Memory usage calculation
 * @returns {Object} Memory usage statistics
 */
function getMemoryUsage() {
  const usage = process.memoryUsage();

  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
    timestamp: Date.now(),
  };
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item));
  }

  if (typeof obj === "object") {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

/**
 * Safe JSON parse
 * @param {string} str - JSON string
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed object or default value
 */
function safeJSONParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Generate random string
 * @param {number} length - String length
 * @returns {string} Random string
 */
function generateRandomString(length = 16) {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

/**
 * Sleep function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after sleep
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  normalizeTrafficData,
  exponentialMovingAverage,
  generateRequestId,
  parseUserAgent,
  calculateRequestSignature,
  isValidIP,
  calculateRatePerSecond,
  calculateRetryAfter,
  getMemoryUsage,
  formatBytes,
  debounce,
  throttle,
  deepClone,
  safeJSONParse,
  generateRandomString,
  sleep,
};
