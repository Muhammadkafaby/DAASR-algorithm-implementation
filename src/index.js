/**
 * DAASR Enterprise Middleware - Main Entry Point
 * Dynamic Adaptive Algorithm for Scalable Rate-limiting
 *
 * @author DAASR Team
 * @version 1.0.0
 */

const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const winston = require("winston");
require("dotenv").config();

const daasrMiddleware = require("./middleware/daasr");
const blocklistMiddleware = require("./middleware/blocklist");
const trafficMonitor = require("./services/trafficMonitor");
const config = require("./config/default");

// Configure Winston logger
const logger = winston.createLogger({
  level: config.get("logLevel"),
  format: config.get("productionLogging")
    ? winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
  defaultMeta: { service: "daasr-middleware" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/app.log" }),
  ],
});

// If not in production, add a console transport
if (!config.get("productionLogging")) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Blocklist middleware
app.use(blocklistMiddleware);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://cdn.tailwindcss.com",
        ],
      },
    },
  })
);

// Logging middleware
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Traffic monitoring middleware
const { trafficMonitoringMiddleware } = require("./services/trafficMonitor");
app.use(trafficMonitoringMiddleware);

// --- Public & Dashboard Routes (No Rate Limiting) ---

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "..", "public")));

// Root route to serve the dashboard
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API routes for the dashboard (stats, blocklist, etc.)
app.use("/api", require("./routes/api"));

// --- Protected API Routes (Apply DAASR Rate Limiting) ---

// Example of a protected route group.
// For this project, we'll assume any route under /protected should be rate-limited.
const protectedRouter = express.Router();

// Basic rate limiting (fallback)
const basicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

protectedRouter.use(daasrMiddleware);
protectedRouter.use(basicLimiter);

protectedRouter.get("/data", (req, res) => {
  res.json({
    message: "This is protected data, accessed successfully!",
    timestamp: new Date().toISOString(),
  });
});

app.use("/protected", protectedRouter);

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
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  logger.info("Dashboard client connected via WebSocket");
  ws.on("close", () => {
    logger.info("Dashboard client disconnected");
  });
});

// Broadcast function
wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(data);
    }
  });
};

// Periodically broadcast stats
setInterval(() => {
  if (wss.clients.size > 0) {
    const data = {
      type: "stats",
      payload: {
        traffic: trafficMonitor.getCurrentStats(),
        system: {
          uptime: process.uptime(),
          memory: {
            heapUsed:
              Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) /
              100,
            heapTotal:
              Math.round(
                (process.memoryUsage().heapTotal / 1024 / 1024) * 100
              ) / 100,
          },
          status: trafficMonitor.getSystemHealth().status,
        },
      },
    };
    wss.broadcast(JSON.stringify(data));
  }
}, 2000); // Broadcast every 2 seconds

server.listen(PORT, () => {
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
