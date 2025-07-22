/**
 * API Routes
 *
 * Main API routes for DAASR middleware
 *
 * @module api
 * @author DAASR Team
 * @version 1.0.0
 */

const express = require("express");
const router = express.Router();
const trafficMonitor = require("../services/trafficMonitor");
const config = require("../config/default");
const { getMemoryUsage } = require("../utils/helpers");

/**
 * GET /api/stats
 * Get current traffic statistics
 */
router.get("/stats", (req, res) => {
  try {
    const stats = trafficMonitor.getCurrentStats();
    const patterns = trafficMonitor.getTrafficPatterns();

    res.json({
      success: true,
      data: {
        stats,
        patterns,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve statistics",
      message: error.message,
    });
  }
});

/**
 * GET /api/health
 * Get system health status
 */
router.get("/health", (req, res) => {
  try {
    const health = trafficMonitor.getSystemHealth();
    const memory = getMemoryUsage();

    res.json({
      success: true,
      data: {
        health,
        memory,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve health status",
      message: error.message,
    });
  }
});

/**
 * GET /api/config
 * Get current configuration
 */
router.get("/config", (req, res) => {
  try {
    const currentConfig = config.getConfig();

    res.json({
      success: true,
      data: {
        config: currentConfig,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve configuration",
      message: error.message,
    });
  }
});

/**
 * POST /api/config
 * Update configuration (admin only)
 */
router.post("/config", (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing key or value in request body",
      });
    }

    // Validate key exists
    const currentConfig = config.getConfig();
    if (!(key in currentConfig)) {
      return res.status(400).json({
        success: false,
        error: "Invalid configuration key",
      });
    }

    // Update configuration
    config.set(key, value);

    res.json({
      success: true,
      data: {
        key,
        value,
        message: "Configuration updated successfully",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to update configuration",
      message: error.message,
    });
  }
});

/**
 * GET /api/history
 * Get traffic history
 */
router.get("/history", (req, res) => {
  try {
    const { minutes = 60 } = req.query;
    const history = trafficMonitor.getTrafficHistory(parseInt(minutes));

    res.json({
      success: true,
      data: {
        history,
        minutes: parseInt(minutes),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve history",
      message: error.message,
    });
  }
});

/**
 * POST /api/reset
 * Reset traffic statistics (admin only)
 */
router.post("/reset", (req, res) => {
  try {
    trafficMonitor.reset();

    res.json({
      success: true,
      data: {
        message: "Traffic statistics reset successfully",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to reset statistics",
      message: error.message,
    });
  }
});

/**
 * GET /api/test-rate-limit
 * Test endpoint for rate limiting
 */
router.get("/test-rate-limit", (req, res) => {
  res.json({
    success: true,
    data: {
      message: "Rate limit test successful",
      timestamp: new Date().toISOString(),
      ip: req.ip,
    },
  });
});

/**
 * GET /api/status
 * Get detailed system status
 */
router.get("/status", (req, res) => {
  try {
    const stats = trafficMonitor.getCurrentStats();
    const health = trafficMonitor.getSystemHealth();
    const memory = getMemoryUsage();
    const config = require("../config/default").getConfig();

    res.json({
      success: true,
      data: {
        system: {
          status: health.status,
          uptime: process.uptime(),
          memory,
          pid: process.pid,
          nodeVersion: process.version,
        },
        traffic: stats,
        configuration: {
          adaptiveLimits: config.enableAdaptiveLimits,
          userTracking: config.enableUserTracking,
          burstDetection: config.enableBurstDetection,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve status",
      message: error.message,
    });
  }
});

module.exports = router;
