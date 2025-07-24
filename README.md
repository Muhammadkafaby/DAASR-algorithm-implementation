# DAASR Enterprise Monitoring Platform

<div align="center">

![DAASR Enterprise](https://img.shields.io/badge/DAASR-Enterprise%20v2.0-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-16%2B-green?style=for-the-badge&logo=node.js)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?style=for-the-badge&logo=docker)

**Enterprise-Grade Real-time Monitoring & Rate Limiting Platform**

*Transform your applications with Netdata-like monitoring capabilities and intelligent rate limiting*

</div>

## 🚀 Overview

DAASR Enterprise is a comprehensive monitoring and rate-limiting platform that combines the power of adaptive algorithms with enterprise-grade monitoring capabilities similar to Netdata. It provides real-time system metrics, intelligent alerting, and beautiful dashboards for modern applications.

### ✨ Key Features

#### 🔧 **Intelligent Rate Limiting**
- **Dynamic Adaptive Algorithm** - Automatically adjusts limits based on traffic patterns
- **User Behavior Analysis** - Learns from user patterns to optimize limits
- **Burst Detection** - Handles traffic spikes intelligently
- **Multi-tier API Support** - Different limits for different user tiers

#### 📊 **Enterprise Monitoring**
- **Real-time System Metrics** - CPU, memory, disk, network monitoring
- **Application Performance** - Response times, error rates, throughput
- **Historical Data Analysis** - 24+ hours of data retention
- **Prometheus Integration** - Export metrics in Prometheus format

#### 🚨 **Advanced Alerting**
- **Smart Alert Rules** - CPU, memory, response time, error rate alerts
- **Multiple Notification Channels** - Email, webhook, console, log file
- **Alert Suppression** - Prevent alert fatigue
- **Escalation Policies** - Configurable alert escalation

#### 🎨 **Beautiful Dashboard**
- **Netdata-style Interface** - Clean, modern, responsive design
- **Real-time Charts** - Live updating charts and metrics
- **Dark/Light Theme** - Toggle between themes
- **Mobile Responsive** - Works on all devices

#### 🔒 **Enterprise Security**
- **Helmet.js Security** - Comprehensive security headers
- **IP Blocklist Management** - Dynamic IP blocking
- **Request Logging** - Detailed access logs
- **Error Tracking** - Comprehensive error monitoring

#### 🐳 **Production Ready**
- **Docker Support** - Complete containerization
- **Health Checks** - Built-in health monitoring
- **Graceful Shutdown** - Clean shutdown handling
- **Log Rotation** - Automatic log management

## 🎯 Quick Start

### Prerequisites

- Node.js 16+ 
- npm 8+
- Docker (optional)

### 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/daasr-team/daasr-enterprise-middleware.git
cd daasr-enterprise-middleware

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Start the server
npm start
```

### 🚀 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t daasr-enterprise .
docker run -p 3000:3000 daasr-enterprise
```

### 📱 Access Dashboard

Open your browser and navigate to:
- **Dashboard**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **API Documentation**: http://localhost:3000/api/docs

## 📊 Enterprise Features

### Real-time Monitoring Dashboard

![Dashboard Preview](docs/images/dashboard-preview.png)

The dashboard provides:
- **Live System Metrics** - CPU, memory, load average, network
- **Application Analytics** - Request rates, response times, error tracking
- **Interactive Charts** - Zoom, filter, and analyze data
- **Alert Management** - View and manage active alerts
- **System Information** - Platform details and configuration

### Advanced Alerting System

```javascript
// Example: Custom alert configuration
const alertingSystem = new AlertingSystem({
  enabled: true,
  checkInterval: 30000,
  channels: ['email', 'webhook', 'slack']
});

// Add custom alert rule
alertingSystem.addRule({
  id: 'custom_response_time',
  name: 'Slow API Response',
  metric: 'api.response_time',
  condition: 'greater_than',
  threshold: 1000,
  duration: 60000,
  severity: 'warning'
});
```

### Prometheus Integration

```bash
# Export metrics in Prometheus format
curl http://localhost:3000/api/enterprise/metrics/prometheus

# Example output:
# HELP system_cpu_usage_percent System CPU usage percentage
# TYPE system_cpu_usage_percent gauge
system_cpu_usage_percent 45.2

# HELP system_memory_usage_percent System memory usage percentage  
# TYPE system_memory_usage_percent gauge
system_memory_usage_percent 67.8
```

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Rate Limiting
DAASR_BASE_RATE_LIMIT=100
DAASR_MIN_RATE_LIMIT=10
DAASR_MAX_RATE_LIMIT=1000

# API Keys for Tiered Access
ENTERPRISE_API_KEY=your-enterprise-key
PREMIUM_API_KEY=your-premium-key

# Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ALERT_FROM_EMAIL=alerts@yourcompany.com
ALERT_TO_EMAIL=admin@yourcompany.com

# Webhook Notifications
WEBHOOK_URL=https://hooks.slack.com/your-webhook-url
```

### Alert Rules Configuration

```javascript
const rules = [
  {
    id: 'high_cpu',
    name: 'High CPU Usage',
    metric: 'system.cpu.overall',
    condition: 'greater_than',
    threshold: 80,
    duration: 60000,
    severity: 'warning',
    channels: ['email', 'webhook']
  },
  {
    id: 'critical_memory',
    name: 'Critical Memory Usage', 
    metric: 'system.memory.usagePercent',
    condition: 'greater_than',
    threshold: 95,
    duration: 30000,
    severity: 'critical',
    channels: ['email', 'webhook', 'sms']
  }
];
```

## 📈 API Documentation

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "2.0.0",
  "uptime": 3600,
  "system": {
    "memory": {...},
    "cpu": {...},
    "platform": "linux"
  },
  "monitoring": {
    "metricsCollector": true,
    "alertingSystem": true,
    "activeAlerts": 0
  }
}
```

### Real-time Metrics
```http
GET /api/enterprise/metrics
```

### Alert Management
```http
GET /api/enterprise/alerts
POST /api/enterprise/alerts/suppress/{alertId}
```

### System Information
```http
GET /api/enterprise/system
```

### Protected Endpoints (Rate Limited)
```http
GET /protected/data
GET /protected/analytics
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format
```

## 🔍 Monitoring & Observability

### Built-in Metrics

- **System Metrics**: CPU, memory, disk, network usage
- **Application Metrics**: Request rate, response time, error rate
- **Rate Limiting Metrics**: Blocked requests, rate limit hits
- **Custom Metrics**: Business-specific measurements

### Log Management

```javascript
// Structured logging with Winston
logger.info('Request processed', {
  requestId: 'req-123',
  method: 'GET',
  url: '/api/data',
  responseTime: 245,
  statusCode: 200
});
```

### Performance Monitoring

The system continuously monitors:
- Memory usage and leaks
- CPU utilization patterns  
- Response time trends
- Error rate spikes
- WebSocket connection health

## 🚀 Production Deployment

### Docker Compose Production Setup

```yaml
version: '3.8'

services:
  daasr-enterprise:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "npm", "run", "health:check"]
      interval: 30s
      timeout: 10s
      retries: 3

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    restart: unless-stopped
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: daasr-enterprise
spec:
  replicas: 3
  selector:
    matchLabels:
      app: daasr-enterprise
  template:
    metadata:
      labels:
        app: daasr-enterprise
    spec:
      containers:
      - name: daasr-enterprise
        image: daasr-enterprise:2.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

## 📚 Advanced Usage

### Custom Metrics Integration

```javascript
const { systemMetrics } = require('./src/services/systemMetrics');

// Add custom business metrics
systemMetrics.addCustomMetric('orders_processed', orderCount, {
  type: 'business',
  service: 'order-service'
});

systemMetrics.addCustomMetric('revenue_generated', revenue, {
  currency: 'USD',
  period: 'hourly'
});
```

### Custom Alert Rules

```javascript
const { alertingSystem } = require('./src/services/alerting');

// Business-specific alerts
alertingSystem.addRule({
  id: 'low_conversion_rate',
  name: 'Low Conversion Rate',
  metric: 'business.conversion_rate',
  condition: 'less_than',
  threshold: 2.5,
  duration: 300000, // 5 minutes
  severity: 'warning'
});
```

### Multi-node Monitoring

```javascript
// Configure for distributed monitoring
const config = {
  cluster: {
    enabled: true,
    nodeId: process.env.NODE_ID,
    masterNode: process.env.MASTER_NODE_URL
  },
  metrics: {
    aggregation: true,
    crossNodeAlerts: true
  }
};
```

## 🔧 Troubleshooting

### Common Issues

1. **High Memory Usage**
   ```bash
   # Check memory metrics
   curl http://localhost:3000/api/enterprise/metrics | grep memory
   
   # Adjust retention settings
   export METRICS_RETENTION_HOURS=12
   ```

2. **WebSocket Connection Issues**
   ```bash
   # Check WebSocket endpoint
   wscat -c ws://localhost:3000
   
   # Verify firewall settings
   sudo ufw allow 3000
   ```

3. **Alert Email Not Working**
   ```bash
   # Test SMTP configuration
   npm run alerts:test
   
   # Check email logs
   tail -f logs/alerts.log
   ```

### Performance Tuning

```javascript
// Optimize for high-traffic scenarios
const optimizedConfig = {
  metrics: {
    collectInterval: 5000, // Reduce frequency
    maxDataPoints: 720,    // 1 hour at 5s intervals
    compression: true      // Enable data compression
  },
  alerts: {
    batchSize: 50,         // Batch alert processing
    throttleInterval: 10000 // Prevent alert spam
  }
};
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/yourusername/daasr-enterprise-middleware.git

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [Netdata](https://github.com/netdata/netdata) for monitoring excellence
- Built with [Express.js](https://expressjs.com/) and [Node.js](https://nodejs.org/)
- Dashboard powered by [Chart.js](https://www.chartjs.org/) and [Tailwind CSS](https://tailwindcss.com/)

## 📞 Support

- 📧 Email: support@daasr.com
- 💬 Slack: [DAASR Community](https://daasr.slack.com)
- 📖 Documentation: [docs.daasr.com](https://docs.daasr.com)
- 🐛 Issues: [GitHub Issues](https://github.com/daasr-team/daasr-enterprise-middleware/issues)

---

<div align="center">

**Made with ❤️ by the DAASR Enterprise Team**

[Website](https://daasr.com) • [Documentation](https://docs.daasr.com) • [Community](https://community.daasr.com)

</div>