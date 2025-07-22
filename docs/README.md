# DAASR Enterprise Middleware

## Dynamic Adaptive Algorithm for Scalable Rate-limiting

DAASR (Dynamic Adaptive Algorithm for Scalable Rate-limiting) is an enterprise-grade middleware solution that provides intelligent, adaptive rate limiting based on real-time traffic analysis and system load.

## 🚀 Features

- **Dynamic Rate Limiting**: Automatically adjusts rate limits based on traffic patterns
- **Real-time Traffic Analysis**: Monitors request rates, response times, and error rates
- **User Behavior Tracking**: Learns from user patterns to optimize limits
- **Burst Detection**: Identifies and handles traffic spikes intelligently
- **Enterprise Configuration**: Comprehensive configuration management
- **Health Monitoring**: Real-time system health and performance metrics
- **RESTful API**: Full API for monitoring and configuration management
- **Comprehensive Logging**: Structured logging with multiple levels
- **Docker Support**: Ready for containerized deployment

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Testing](#testing)
- [Deployment](#deployment)
- [Monitoring](#monitoring)

## 🛠 Installation

### Prerequisites

- Node.js 14+
- npm or yarn

### Install Dependencies

```bash
npm install
```

### Development Dependencies

```bash
npm install --save-dev
```

## 🚀 Quick Start

### 1. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 3. Test the Installation

```bash
# Run tests
npm test

# Check health endpoint
curl http://localhost:3000/health
```

## ⚙️ Configuration

### Environment Variables

| Variable                    | Description              | Default       |
| --------------------------- | ------------------------ | ------------- |
| `PORT`                      | Server port              | `3000`        |
| `NODE_ENV`                  | Environment mode         | `development` |
| `DAASR_BASE_RATE_LIMIT`     | Base rate limit          | `100`         |
| `DAASR_MIN_RATE_LIMIT`      | Minimum rate limit       | `10`          |
| `DAASR_MAX_RATE_LIMIT`      | Maximum rate limit       | `1000`        |
| `DAASR_ADJUSTMENT_INTERVAL` | Adjustment interval (ms) | `30000`       |
| `DAASR_WINDOW_SIZE`         | Rate limit window (ms)   | `900000`      |

### Configuration File

The system uses a centralized configuration module at `src/config/default.js` with validation using Joi.

## 📡 API Documentation

### Health Check

```http
GET /health
```

### Traffic Statistics

```http
GET /api/stats
```

### System Status

```http
GET /api/status
```

### Configuration Management

```http
GET /api/config
POST /api/config
```

### Traffic History

```http
GET /api/history?minutes=60
```

### Rate Limit Test

```http
GET /api/test-rate-limit
```

## 🏗 Architecture

### Core Components

1. **DAASR Algorithm** (`src/middleware/daasr.js`)
   - Dynamic rate limit calculation
   - Traffic pattern analysis
   - User behavior learning

2. **Traffic Monitor** (`src/services/trafficMonitor.js`)
   - Real-time traffic analysis
   - Performance metrics
   - Health monitoring

3. **Configuration Manager** (`src/config/default.js`)
   - Centralized configuration
   - Environment variable support
   - Runtime configuration updates

4. **Utility Functions** (`src/utils/helpers.js`)
   - Common utility functions
   - Data normalization
   - Helper methods

### Data Flow

```
Request → Traffic Monitor → DAASR Algorithm → Rate Limit Decision → Response
```

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test Suite

```bash
npm test -- --grep "DAASR Algorithm"
```

### Test Coverage

```bash
npm run test:coverage
```

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t daasr-middleware .
```

### Run Container

```bash
docker run -p 3000:3000 -e NODE_ENV=production daasr-middleware
```

### Docker Compose

```bash
docker-compose up -d
```

## 📊 Monitoring

### Health Endpoints

- `/health` - Basic health check
- `/api/health` - Detailed health metrics
- `/api/status` - Complete system status

### Metrics

- Request rate (RPS)
- Response time
- Error rate
- System resource usage
- Traffic patterns

### Logging

Logs are written to:

- `logs/app.log` - Application logs
- `logs/error.log` - Error logs
- `logs/daasr.log` - DAASR algorithm logs
- `logs/traffic.log` - Traffic monitoring logs

## 🔧 Development

### Project Structure

```
daasr-enterprise-middleware/
├── src/
│   ├── index.js              # Main entry point
│   ├── middleware/
│   │   └── daasr.js          # DAASR algorithm
│   ├── services/
│   │   └── trafficMonitor.js # Traffic monitoring
│   ├── config/
│   │   └── default.js        # Configuration
│   ├── utils/
│   │   └── helpers.js        # Utility functions
│   └── routes/
│       └── api.js            # API routes
├── tests/
│   └── daasr.test.js         # Unit tests
├── logs/                     # Log files
├── docs/                     # Documentation
├── .env                      # Environment variables
├── package.json              # Dependencies
└── README.md                 # This file
```

### Development Scripts

```bash
npm run dev          # Development with auto-reload
npm start           # Production start
npm test            # Run tests
npm run lint        # Lint code
npm run docs        # Generate documentation
```

## 🔒 Security

### Rate Limiting Strategy

- IP-based rate limiting
- User behavior analysis
- Burst detection and mitigation
- Adaptive thresholds

### Security Headers

- Helmet.js integration
- CORS configuration
- Trust proxy settings

## 📈 Performance

### Optimization Features

- Efficient data structures
- Memory usage monitoring
- Garbage collection optimization
- Request/response time tracking

### Benchmarking

```bash
npm run benchmark
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:

- Create an issue on GitHub
- Check the documentation
- Review the test cases

## 🔄 Changelog

### v1.0.0

- Initial release
- DAASR algorithm implementation
- Traffic monitoring service
- RESTful API
- Comprehensive testing
- Docker support
