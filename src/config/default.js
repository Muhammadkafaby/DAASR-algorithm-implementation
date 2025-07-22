/**
 * DAASR Configuration Module
 *
 * Centralized configuration management for the DAASR middleware
 *
 * @module config
 * @author DAASR Team
 * @version 1.0.0
 */

const Joi = require("joi");

// Configuration schema validation
const configSchema = Joi.object({
  // Rate limiting settings
  baseRateLimit: Joi.number().integer().min(1).max(10000).default(100),
  minRateLimit: Joi.number().integer().min(1).max(1000).default(10),
  maxRateLimit: Joi.number().integer().min(1).max(10000).default(1000),

  // Timing settings
  adjustmentInterval: Joi.number()
    .integer()
    .min(1000)
    .max(300000)
    .default(30000),
  windowSize: Joi.number().integer().min(1000).max(3600000).default(900000),

  // Traffic thresholds
  highTrafficThreshold: Joi.number().integer().min(1).max(10000).default(1000),
  mediumTrafficThreshold: Joi.number().integer().min(1).max(1000).default(100),

  // Error rate thresholds
  criticalErrorRate: Joi.number().min(0).max(1).default(0.1),
  warningErrorRate: Joi.number().min(0).max(1).default(0.05),

  // Response time thresholds (ms)
  criticalResponseTime: Joi.number()
    .integer()
    .min(100)
    .max(10000)
    .default(1000),
  warningResponseTime: Joi.number().integer().min(100).max(5000).default(500),

  // User behavior settings
  newUserBonus: Joi.number().min(0.5).max(2.0).default(1.2),
  burstPenalty: Joi.number().min(0.1).max(1.0).default(0.5),

  // Logging settings
  logLevel: Joi.string()
    .valid("error", "warn", "info", "debug")
    .default("info"),
  productionLogging: Joi.boolean().default(false),

  // Feature flags
  enableAdaptiveLimits: Joi.boolean().default(true),
  enableUserTracking: Joi.boolean().default(true),
  enableBurstDetection: Joi.boolean().default(true),

  // API settings
  apiPort: Joi.number().integer().min(1000).max(65535).default(3000),
  apiPrefix: Joi.string().default("/api"),

  // Security settings
  trustProxy: Joi.boolean().default(false),
  enableCors: Joi.boolean().default(true),
  corsOrigin: Joi.alternatives()
    .try(Joi.string(), Joi.array().items(Joi.string()))
    .default("*"),

  // Monitoring settings
  enableMetrics: Joi.boolean().default(true),
  metricsPort: Joi.number().integer().min(1000).max(65535).default(9090),

  // Cache settings
  cacheSize: Joi.number().integer().min(100).max(1000000).default(10000),
  cacheTTL: Joi.number().integer().min(1000).max(86400000).default(3600000),
});

class ConfigManager {
  constructor() {
    this.config = null;
    this.loadConfig();
  }

  /**
   * Load configuration from environment variables and defaults
   */
  loadConfig() {
    const envConfig = {
      // Rate limiting settings
      baseRateLimit: parseInt(process.env.DAASR_BASE_RATE_LIMIT) || 100,
      minRateLimit: parseInt(process.env.DAASR_MIN_RATE_LIMIT) || 10,
      maxRateLimit: parseInt(process.env.DAASR_MAX_RATE_LIMIT) || 1000,

      // Timing settings
      adjustmentInterval:
        parseInt(process.env.DAASR_ADJUSTMENT_INTERVAL) || 30000,
      windowSize: parseInt(process.env.DAASR_WINDOW_SIZE) || 900000,

      // Traffic thresholds
      highTrafficThreshold:
        parseInt(process.env.DAASR_HIGH_TRAFFIC_THRESHOLD) || 1000,
      mediumTrafficThreshold:
        parseInt(process.env.DAASR_MEDIUM_TRAFFIC_THRESHOLD) || 100,

      // Error rate thresholds
      criticalErrorRate:
        parseFloat(process.env.DAASR_CRITICAL_ERROR_RATE) || 0.1,
      warningErrorRate:
        parseFloat(process.env.DAASR_WARNING_ERROR_RATE) || 0.05,

      // Response time thresholds (ms)
      criticalResponseTime:
        parseInt(process.env.DAASR_CRITICAL_RESPONSE_TIME) || 1000,
      warningResponseTime:
        parseInt(process.env.DAASR_WARNING_RESPONSE_TIME) || 500,

      // User behavior settings
      newUserBonus: parseFloat(process.env.DAASR_NEW_USER_BONUS) || 1.2,
      burstPenalty: parseFloat(process.env.DAASR_BURST_PENALTY) || 0.5,

      // Logging settings
      logLevel: process.env.DAASR_LOG_LEVEL || "info",
      productionLogging: process.env.NODE_ENV === "production",

      // Feature flags
      enableAdaptiveLimits:
        process.env.DAASR_ENABLE_ADAPTIVE_LIMITS !== "false",
      enableUserTracking: process.env.DAASR_ENABLE_USER_TRACKING !== "false",
      enableBurstDetection:
        process.env.DAASR_ENABLE_BURST_DETECTION !== "false",

      // API settings
      apiPort: parseInt(process.env.DAASR_API_PORT) || 3000,
      apiPrefix: process.env.DAASR_API_PREFIX || "/api",

      // Security settings
      trustProxy: process.env.DAASR_TRUST_PROXY === "true",
      enableCors: process.env.DAASR_ENABLE_CORS !== "false",
      corsOrigin: process.env.DAASR_CORS_ORIGIN || "*",

      // Monitoring settings
      enableMetrics: process.env.DAASR_ENABLE_METRICS !== "false",
      metricsPort: parseInt(process.env.DAASR_METRICS_PORT) || 9090,

      // Cache settings
      cacheSize: parseInt(process.env.DAASR_CACHE_SIZE) || 10000,
      cacheTTL: parseInt(process.env.DAASR_CACHE_TTL) || 3600000,
    };

    // Validate configuration
    const { error, value } = configSchema.validate(envConfig);

    if (error) {
      throw new Error(`Configuration validation error: ${error.message}`);
    }

    this.config = value;
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration object
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Get specific configuration value
   * @param {string} key - Configuration key
   * @returns {*} Configuration value
   */
  get(key) {
    return this.config[key];
  }

  /**
   * Update configuration (for runtime adjustments)
   * @param {string} key - Configuration key
   * @param {*} value - New value
   */
  set(key, value) {
    const { error } = configSchema.extract(key).validate(value);
    if (error) {
      throw new Error(
        `Invalid configuration value for ${key}: ${error.message}`
      );
    }

    this.config[key] = value;
  }

  /**
   * Reload configuration from environment
   */
  reload() {
    this.loadConfig();
  }

  /**
   * Get configuration as environment variables template
   * @returns {string} Environment variables template
   */
  getEnvTemplate() {
    return `# DAASR Configuration Environment Variables
# Copy this file to .env and modify as needed

# Rate limiting settings
DAASR_BASE_RATE_LIMIT=100
DAASR_MIN_RATE_LIMIT=10
DAASR_MAX_RATE_LIMIT=1000

# Timing settings (milliseconds)
DAASR_ADJUSTMENT_INTERVAL=30000
DAASR_WINDOW_SIZE=900000

# Traffic thresholds
DAASR_HIGH_TRAFFIC_THRESHOLD=1000
DAASR_MEDIUM_TRAFFIC_THRESHOLD=100

# Error rate thresholds (0.0 - 1.0)
DAASR_CRITICAL_ERROR_RATE=0.1
DAASR_WARNING_ERROR_RATE=0.05

# Response time thresholds (milliseconds)
DAASR_CRITICAL_RESPONSE_TIME=1000
DAASR_WARNING_RESPONSE_TIME=500

# User behavior settings
DAASR_NEW_USER_BONUS=1.2
DAASR_BURST_PENALTY=0.5

# Logging settings
DAASR_LOG_LEVEL=info

# Feature flags (true/false)
DAASR_ENABLE_ADAPTIVE_LIMITS=true
DAASR_ENABLE_USER_TRACKING=true
DAASR_ENABLE_BURST_DETECTION=true

# API settings
DAASR_API_PORT=3000
DAASR_API_PREFIX=/api

# Security settings
DAASR_TRUST_PROXY=false
DAASR_ENABLE_CORS=true
DAASR_CORS_ORIGIN=*

# Monitoring settings
DAASR_ENABLE_METRICS=true
DAASR_METRICS_PORT=9090

# Cache settings
DAASR_CACHE_SIZE=10000
DAASR_CACHE_TTL=3600000
`;
  }
}

// Create singleton instance
const configManager = new ConfigManager();

module.exports = configManager;
