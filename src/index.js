/**
 * DAASR Enterprise Middleware - Main Entry Point
 * Dynamic Adaptive Algorithm for Scalable Rate-limiting
 *
 * @author DAASR Team
 * @version 1.0.0
 */

const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const winston = require("winston");
require("dotenv").config();

const daasrMiddleware = require("./middleware/daasr");
const trafficMonitor = require("./services/trafficMonitor");
const config = require("./config/default");

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "daasr-middleware" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/app.log" }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Logging middleware
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Basic rate limiting (fallback)
const basicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply DAASR middleware
app.use(daasrMiddleware);

// Apply basic rate limiting as fallback
app.use(basicLimiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    daasr: {
      active: true,
      algorithm: "DAASR-v1",
      adaptive: true,
    },
  });
});

// API endpoint for DAASR configuration
app.get("/api/daasr/config", (req, res) => {
  res.json({
    config: config.getConfig(),
    traffic: trafficMonitor.getCurrentStats(),
  });
});

// Main API routes
app.use("/api", require("./routes/api"));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    message: "The requested resource was not found",
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`DAASR Enterprise Middleware started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

module.exports = app;
