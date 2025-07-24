/**
 * DAASR Enterprise Middleware - Main Entry Point
 * Enhanced with comprehensive monitoring, alerting, and real-time analytics
 * 
 * Features:
 * - Real-time system metrics collection
 * - Advanced alerting system
 * - Netdata-style dashboard
 * - Multi-node monitoring support
 * - Historical data analysis
 * - Enterprise-grade reporting
 *
 * @author DAASR Enterprise Team
 * @version 2.0.0
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

// Enhanced enterprise modules
const daasrMiddleware = require("./middleware/daasr");
const blocklistMiddleware = require("./middleware/blocklist");
const trafficMonitor = require("./services/trafficMonitor");
const SystemMetricsCollector = require("./services/systemMetrics");
const AlertingSystem = require("./services/alerting");
const config = require("./config/default");

// Initialize enterprise monitoring systems
const systemMetrics = new SystemMetricsCollector({
  collectInterval: 1000, // 1 second like Netdata
  retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
  maxDataPoints: 86400 // 24 hours of data
});

const alertingSystem = new AlertingSystem({
  enabled: true,
  checkInterval: 30000, // 30 seconds
  escalationTimeout: 300000, // 5 minutes
  maxAlerts: 10000
});

// Configure Enhanced Winston Logger with Structured Logging
const logger = winston.createLogger({
  level: config.get("logLevel"),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    config.get("productionLogging")
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, metadata }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(metadata).length ? JSON.stringify(metadata) : ''}`;
          })
        )
  ),
  defaultMeta: { 
    service: "daasr-enterprise",
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development"
  },
  transports: [
    new winston.transports.File({ 
      filename: "logs/error.log", 
      level: "error",
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    new winston.transports.File({ 
      filename: "logs/app.log",
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    new winston.transports.File({ 
      filename: "logs/access.log",
      level: "info",
      maxsize: 10485760, // 10MB
      maxFiles: 15,
      tailable: true
    })
  ],
});

// Add console transport for development
if (!config.get("productionLogging")) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Initialize Express app with enhanced enterprise features
const app = express();
const PORT = process.env.PORT || 3000;

// Global error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  alertingSystem.emit('criticalError', {
    type: 'uncaughtException',
    error: error.message,
    stack: error.stack,
    timestamp: Date.now()
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
  alertingSystem.emit('criticalError', {
    type: 'unhandledRejection',
    reason,
    timestamp: Date.now()
  });
});

// Enhanced middleware stack
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware with enterprise configuration
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": [
          "'self'",
          "'unsafe-inline'", // Required for dashboard
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://cdn.tailwindcss.com",
        ],
        "style-src": [
          "'self'",
          "'unsafe-inline'", // Required for dashboard
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://cdn.tailwindcss.com",
        ],
        "font-src": [
          "'self'",
          "https://cdnjs.cloudflare.com",
        ],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for dashboard functionality
  })
);

// Enhanced logging middleware with detailed analytics
app.use(
  morgan("combined", {
    stream: {
      write: (message) => {
        const logData = message.trim();
        logger.info(logData, { type: 'access' });
        
        // Extract metrics for real-time monitoring
        const requestMatch = logData.match(/(\d+\.\d+\.\d+\.\d+).*?"([A-Z]+)\s+([^\s]+).*?"\s+(\d+)\s+(\d+|\-)/);
        if (requestMatch) {
          const [, ip, method, url, status, size] = requestMatch;
          systemMetrics.addCustomMetric('http_requests_total', 1, {
            method,
            status_code: status,
            endpoint: url
          });
        }
      },
    },
  })
);

// Blocklist middleware (applied early for security)
app.use(blocklistMiddleware);

// Enhanced traffic monitoring middleware
const { trafficMonitoringMiddleware } = require("./services/trafficMonitor");
app.use(trafficMonitoringMiddleware);

// Custom enterprise metrics middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Record response time metrics
    systemMetrics.addCustomMetric('http_request_duration_ms', duration, {
      method: req.method,
      status_code: res.statusCode.toString(),
      endpoint: req.route?.path || req.path
    });
    
    // Record status code metrics
    systemMetrics.addCustomMetric('http_responses_total', 1, {
      status_code: res.statusCode.toString(),
      method: req.method
    });
    
    // Alert on slow responses
    if (duration > 1000) {
      alertingSystem.emit('slowResponse', {
        duration,
        endpoint: req.path,
        method: req.method,
        timestamp: Date.now()
      });
    }
  });
  
  next();
});

// --- Public & Dashboard Routes (No Rate Limiting) ---

// Serve static files with enhanced caching
app.use(express.static(path.join(__dirname, "..", "public"), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
  etag: true,
  lastModified: true
}));

// Root route - Enhanced Enterprise Dashboard
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// Enhanced health check endpoint with detailed system information
app.get("/health", (req, res) => {
  const systemHealth = systemMetrics.getHealthStatus();
  const alertStats = alertingSystem.getStatistics();
  
  const healthData = {
    status: systemHealth.status,
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    system: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version
    },
    monitoring: {
      metricsCollector: systemMetrics.isCollecting,
      alertingSystem: alertingSystem.isRunning,
      activeAlerts: alertStats.activeAlerts,
      alerts24h: alertStats.alerts24h
    },
    performance: systemHealth
  };
  
  const statusCode = systemHealth.status === 'healthy' ? 200 : 
                    systemHealth.status === 'warning' ? 200 : 503;
  
  res.status(statusCode).json(healthData);
});

// Enhanced API routes with enterprise features
app.use("/api", require("./routes/api"));

// Enterprise monitoring endpoints
app.get("/api/enterprise/metrics", (req, res) => {
  const metrics = systemMetrics.exportMetrics();
  res.json(metrics);
});

app.get("/api/enterprise/metrics/prometheus", (req, res) => {
  const prometheusMetrics = systemMetrics.exportMetrics('prometheus');
  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics);
});

app.get("/api/enterprise/alerts", (req, res) => {
  const alerts = alertingSystem.getActiveAlerts();
  const history = alertingSystem.getAlertHistory(50);
  const statistics = alertingSystem.getStatistics();
  
  res.json({
    active: alerts,
    recent: history,
    statistics
  });
});

app.post("/api/enterprise/alerts/suppress/:alertId", (req, res) => {
  const { alertId } = req.params;
  const { duration = 300000 } = req.body; // 5 minutes default
  
  const suppressed = alertingSystem.suppressAlert(alertId, duration);
  
  if (suppressed) {
    res.json({ message: "Alert suppressed", alertId, duration });
  } else {
    res.status(404).json({ error: "Alert not found" });
  }
});

// System information endpoint
app.get("/api/enterprise/system", (req, res) => {
  const systemInfo = {
    platform: process.platform,
    architecture: process.arch,
    nodeVersion: process.version,
    cpuCount: require('os').cpus().length,
    totalMemory: require('os').totalmem(),
    freeMemory: require('os').freemem(),
    uptime: process.uptime(),
    loadAverage: require('os').loadavg(),
    environment: process.env.NODE_ENV || "development",
    version: "2.0.0"
  };
  
  res.json(systemInfo);
});

// --- Protected API Routes (Apply DAASR Rate Limiting) ---

const protectedRouter = express.Router();

// Enhanced rate limiting with enterprise features
const enterpriseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    // Dynamic limits based on user tier or API key
    const apiKey = req.headers['x-api-key'];
    if (apiKey === process.env.ENTERPRISE_API_KEY) {
      return 10000; // Enterprise tier
    } else if (apiKey === process.env.PREMIUM_API_KEY) {
      return 1000; // Premium tier
    }
    return 100; // Standard tier
  },
  message: (req, res) => {
    const tier = req.headers['x-api-key'] ? 'authenticated' : 'anonymous';
    return {
      error: "Rate limit exceeded",
      message: "Too many requests from this IP, please try again later.",
      tier,
      retryAfter: Math.ceil(15 * 60), // 15 minutes in seconds
      documentation: "https://docs.daasr.com/rate-limiting"
    };
  },
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: (req, res, options) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method
    });
    
    // Trigger alert for excessive rate limiting
    systemMetrics.addCustomMetric('rate_limit_exceeded_total', 1, {
      endpoint: req.path,
      ip: req.ip
    });
  }
});

protectedRouter.use(daasrMiddleware);
protectedRouter.use(enterpriseLimiter);

// Enhanced protected endpoints
protectedRouter.get("/data", (req, res) => {
  const requestId = req.headers['x-request-id'] || Math.random().toString(36);
  
  logger.info('Protected data accessed', {
    requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    message: "This is protected enterprise data, accessed successfully!",
    timestamp: new Date().toISOString(),
    requestId,
    environment: process.env.NODE_ENV || "development",
    version: "2.0.0"
  });
});

protectedRouter.get("/analytics", (req, res) => {
  const analytics = trafficMonitor.getDetailedAnalytics();
  const systemMetricsData = systemMetrics.getCurrentMetrics();
  
  res.json({
    traffic: analytics,
    system: systemMetricsData,
    timestamp: new Date().toISOString()
  });
});

app.use("/protected", protectedRouter);

// Enhanced error handling middleware with detailed logging
app.use((err, req, res, next) => {
  const errorId = Math.random().toString(36);
  
  logger.error("Application error", {
    errorId,
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Trigger critical error alert
  alertingSystem.emit('applicationError', {
    errorId,
    error: err.message,
    endpoint: req.path,
    method: req.method,
    timestamp: Date.now()
  });
  
  res.status(err.status || 500).json({
    error: "Internal server error",
    errorId,
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
    timestamp: new Date().toISOString()
  });
});

// Enhanced 404 handler
app.use((req, res) => {
  logger.warn('Route not found', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({
    error: "Not found",
    message: "The requested resource was not found",
    timestamp: new Date().toISOString(),
    suggestion: "Check the API documentation at /api/docs"
  });
});

// Create HTTP server with enhanced configuration
const server = http.createServer(app);

// Enhanced WebSocket server for real-time dashboard
const wss = new WebSocketServer({ 
  server,
  clientTracking: true,
  maxPayload: 1024 * 1024 // 1MB max message size
});

// WebSocket connection handling with authentication
wss.on("connection", (ws, req) => {
  const clientId = Math.random().toString(36);
  
  logger.info("Dashboard client connected", {
    clientId,
    ip: req.socket.remoteAddress,
    userAgent: req.headers['user-agent']
  });
  
  ws.clientId = clientId;
  ws.isAlive = true;
  
  // Send initial system state
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    timestamp: Date.now(),
    systemInfo: {
      version: "2.0.0",
      environment: process.env.NODE_ENV || "development"
    }
  }));
  
  // Handle pong responses for connection health
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle client commands
      if (data.type === 'subscribe') {
        ws.subscriptions = data.channels || ['metrics', 'alerts'];
        logger.info('Client subscribed to channels', { 
          clientId, 
          channels: ws.subscriptions 
        });
      } else if (data.type === 'heartbeat') {
        ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', { 
        clientId, 
        error: error.message 
      });
    }
  });
  
  ws.on('close', () => {
    logger.info('Dashboard client disconnected', { clientId });
  });
  
  ws.on('error', (error) => {
    logger.error('WebSocket client error', { clientId, error: error.message });
  });
});

// WebSocket heartbeat to detect dead connections
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      logger.info('Terminating dead WebSocket connection', { clientId: ws.clientId });
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // Check every 30 seconds

    /**
     * Real-time metrics broadcasting
     */
    setInterval(() => {
        if (!systemMetrics.isCollecting) {
            return; // Skip if metrics collection is not running
        }
        
        try {
            const currentMetrics = systemMetrics.getCurrentMetrics();
            const trafficAnalytics = trafficMonitor.getDetailedAnalytics();
            
            const payload = {
                type: 'stats',
                payload: {
                    system: currentMetrics.system || {},
                    process: currentMetrics.process || {},
                    traffic: trafficAnalytics || {},
                    health: currentMetrics.health || { status: 'unknown', score: 0, issues: [] },
                    timestamp: Date.now()
                }
            };
            
            wss.clients.forEach((client) => {
                if (client.readyState === 1) { // WebSocket.OPEN
                    client.send(JSON.stringify(payload));
                }
            });
        } catch (error) {
            logger.error('Error in metrics broadcasting', { error: error.message });
        }
    }, 2000); // Every 2 seconds

// Alert broadcasting
alertingSystem.on('alertTriggered', (alert) => {
  const payload = {
    type: 'alert',
    payload: {
      ...alert,
      timestamp: Date.now()
    }
  };
  
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(payload));
    }
  });
});

// Start monitoring services
systemMetrics.start();
alertingSystem.start();

// Integrate alerting with system metrics
systemMetrics.on('metrics', (metrics) => {
  // Feed metrics to alerting system for real-time evaluation
  alertingSystem.emit('systemMetrics', metrics);
});

// Enhanced graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Stop monitoring services
    systemMetrics.stop();
    alertingSystem.stop();
    
    // Close WebSocket connections
    wss.clients.forEach((client) => {
      client.close(1000, 'Server shutting down');
    });
    
    logger.info('All connections closed. Exiting process...');
    process.exit(0);
  });
  
  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
server.listen(PORT, () => {
  logger.info("DAASR Enterprise Monitoring Platform started", {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    version: "2.0.0",
    features: [
      "Real-time system monitoring",
      "Advanced alerting system", 
      "Netdata-style dashboard",
      "Enterprise rate limiting",
      "WebSocket real-time updates"
    ]
  });
  
  // Log initial system state
  const initialMetrics = systemMetrics.getCurrentMetrics();
  logger.info("Initial system metrics", initialMetrics);
  
  console.log(`🚀 DAASR Enterprise Monitor running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log(`📈 Metrics API: http://localhost:${PORT}/api/enterprise/metrics`);
  console.log(`🚨 Alerts API: http://localhost:${PORT}/api/enterprise/alerts`);
});

module.exports = { app, server, systemMetrics, alertingSystem };