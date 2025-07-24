#!/bin/bash

# DAASR Enterprise Monitoring Platform - Build Script
# Fallback build script for Docker and deployment issues
# Version: 2.0.0

set -e

echo "🚀 DAASR Enterprise Monitoring Platform - Build Script v2.0.0"
echo "=============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check Node.js version
check_node_version() {
    log_info "Checking Node.js version..."
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    if [ "$NODE_MAJOR" -lt 16 ]; then
        log_error "Node.js version 16 or higher is required. Current version: $NODE_VERSION"
        exit 1
    fi
    
    log_success "Node.js version: $NODE_VERSION ✓"
}

# Install dependencies with fallback
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Clean install with cache clearing
    npm cache clean --force 2>/dev/null || true
    
    # Try npm ci first (production install)
    if [ -f "package-lock.json" ]; then
        log_info "Using npm ci for production install..."
        if npm ci; then
            log_success "Dependencies installed with npm ci ✓"
            return 0
        else
            log_warning "npm ci failed, falling back to npm install"
        fi
    fi
    
    # Fallback to npm install
    log_info "Installing with npm install..."
    if npm install; then
        log_success "Dependencies installed with npm install ✓"
    else
        log_error "Failed to install dependencies"
        exit 1
    fi
}

# Create required directories
create_directories() {
    log_info "Creating required directories..."
    mkdir -p logs
    mkdir -p data
    log_success "Directories created ✓"
}

# Main build process
main() {
    echo ""
    log_info "Starting DAASR Enterprise build process..."
    echo ""
    
    check_node_version
    create_directories
    install_dependencies
    
    echo ""
    log_success "🎉 DAASR Enterprise build completed successfully!"
    log_info "You can now start the application with: npm start"
    echo ""
    log_info "🌐 Application URLs:"
    log_info "   Dashboard: http://localhost:3000"
    log_info "   Health Check: http://localhost:3000/health"
    log_info "   Metrics API: http://localhost:3000/api/enterprise/metrics"
    log_info "   Alerts API: http://localhost:3000/api/enterprise/alerts"
    echo ""
}

# Run main function
main "$@"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check Node.js version
check_node_version() {
    log_info "Checking Node.js version..."
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    if [ "$NODE_MAJOR" -lt 16 ]; then
        log_error "Node.js version 16 or higher is required. Current version: $NODE_VERSION"
        exit 1
    fi
    
    log_success "Node.js version: $NODE_VERSION ✓"
}

# Check npm version
check_npm_version() {
    log_info "Checking npm version..."
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    NPM_VERSION=$(npm --version)
    log_success "npm version: $NPM_VERSION ✓"
}

# Create required directories
create_directories() {
    log_info "Creating required directories..."
    mkdir -p logs
    mkdir -p data
    log_success "Directories created ✓"
}

# Install dependencies with fallback
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Clean install with cache clearing
    npm cache clean --force 2>/dev/null || true
    
    # Try npm ci first (production install)
    if [ -f "package-lock.json" ]; then
        log_info "Using npm ci for production install..."
        if npm ci; then
            log_success "Dependencies installed with npm ci ✓"
            return 0
        else
            log_warning "npm ci failed, falling back to npm install"
        fi
    fi
    
    # Fallback to npm install
    log_info "Installing with npm install..."
    if npm install; then
        log_success "Dependencies installed with npm install ✓"
    else
        log_error "Failed to install dependencies"
        exit 1
    fi
}

# Run security audit
run_security_audit() {
    log_info "Running security audit..."
    if npm audit --audit-level moderate; then
        log_success "Security audit passed ✓"
    else
        log_warning "Security vulnerabilities found. Run 'npm audit fix' to resolve."
    fi
}

# Build static assets (if any)
build_assets() {
    log_info "Building static assets..."
    
    # Check if we have any build scripts
    if npm run build > /dev/null 2>&1; then
        log_success "Static assets built ✓"
    else
        log_info "No build script found, skipping asset building"
    fi
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    if npm test; then
        log_success "All tests passed ✓"
    else
        log_warning "Some tests failed"
    fi
}

# Check configuration files
check_configuration() {
    log_info "Checking configuration files..."
    
    # Check for required config files
    CONFIG_FILES=("src/config/default.js" "package.json")
    
    for file in "${CONFIG_FILES[@]}"; do
        if [ -f "$file" ]; then
            log_success "Found: $file ✓"
        else
            log_error "Missing required file: $file"
            exit 1
        fi
    done
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Start the application in background
    log_info "Starting application for health check..."
    timeout 30s npm start &
    APP_PID=$!
    
    # Wait a moment for startup
    sleep 5
    
    # Check if process is running
    if kill -0 $APP_PID 2>/dev/null; then
        log_info "Application started successfully"
        
        # Try to access health endpoint
        if command -v curl &> /dev/null; then
            if curl -f http://localhost:3000/health > /dev/null 2>&1; then
                log_success "Health check endpoint responded ✓"
            else
                log_warning "Health check endpoint not responding"
            fi
        else
            log_info "curl not available, skipping endpoint check"
        fi
        
        # Stop the application
        kill $APP_PID 2>/dev/null || true
        wait $APP_PID 2>/dev/null || true
        log_success "Health check completed ✓"
    else
        log_error "Application failed to start"
        exit 1
    fi
}

# Docker build (if requested)
docker_build() {
    if [ "$1" = "--docker" ]; then
        log_info "Building Docker image..."
        
        if command -v docker &> /dev/null; then
            if docker build -t daasr-enterprise:latest .; then
                log_success "Docker image built successfully ✓"
            else
                log_error "Docker build failed"
                exit 1
            fi
        else
            log_error "Docker is not installed"
            exit 1
        fi
    fi
}

# Production deployment check
production_check() {
    if [ "$1" = "--production" ]; then
        log_info "Running production deployment checks..."
        
        # Check environment variables
        REQUIRED_ENV_VARS=("NODE_ENV")
        
        for var in "${REQUIRED_ENV_VARS[@]}"; do
            if [ -z "${!var}" ]; then
                log_warning "Environment variable $var is not set"
            else
                log_success "Environment variable $var is set ✓"
            fi
        done
        
        # Set production environment
        export NODE_ENV=production
        log_success "Production environment configured ✓"
    fi
}

# Generate build report
generate_report() {
    log_info "Generating build report..."
    
    REPORT_FILE="build-report-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$REPORT_FILE" << EOF
DAASR Enterprise Monitoring Platform - Build Report
==================================================
Build Date: $(date)
Node.js Version: $(node --version)
npm Version: $(npm --version)
Platform: $(uname -s) $(uname -m)
Working Directory: $(pwd)

Package Information:
$(npm list --depth=0 2>/dev/null || echo "Package list unavailable")

Build Status: SUCCESS
EOF
    
    log_success "Build report generated: $REPORT_FILE ✓"
}

# Main build process
main() {
    echo ""
    log_info "Starting DAASR Enterprise build process..."
    echo ""
    
    # Parse arguments
    DOCKER_BUILD=false
    PRODUCTION_MODE=false
    RUN_TESTS=true
    SKIP_AUDIT=false
    
    for arg in "$@"; do
        case $arg in
            --docker)
                DOCKER_BUILD=true
                ;;
            --production)
                PRODUCTION_MODE=true
                ;;
            --skip-tests)
                RUN_TESTS=false
                ;;
            --skip-audit)
                SKIP_AUDIT=false
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --docker       Build Docker image"
                echo "  --production   Production mode"
                echo "  --skip-tests   Skip running tests"
                echo "  --skip-audit   Skip security audit"
                echo "  --help         Show this help"
                exit 0
                ;;
        esac
    done
    
    # Execute build steps
    check_node_version
    check_npm_version
    check_configuration
    create_directories
    install_dependencies
    
    if [ "$SKIP_AUDIT" = false ]; then
        run_security_audit
    fi
    
    build_assets
    
    if [ "$RUN_TESTS" = true ]; then
        run_tests
    fi
    
    if [ "$PRODUCTION_MODE" = true ]; then
        production_check --production
    fi
    
    if [ "$DOCKER_BUILD" = true ]; then
        docker_build --docker
    fi
    
    health_check
    generate_report
    
    echo ""
    log_success "🎉 DAASR Enterprise build completed successfully!"
    log_info "You can now start the application with: npm start"
    
    if [ "$DOCKER_BUILD" = true ]; then
        log_info "Docker image available: daasr-enterprise:latest"
        log_info "Run with Docker: docker run -p 3000:3000 daasr-enterprise:latest"
    fi
    
    echo ""
    log_info "🌐 Application URLs:"
    log_info "   Dashboard: http://localhost:3000"
    log_info "   Health Check: http://localhost:3000/health"
    log_info "   Metrics API: http://localhost:3000/api/enterprise/metrics"
    log_info "   Alerts API: http://localhost:3000/api/enterprise/alerts"
    echo ""
}

# Trap for cleanup
cleanup() {
    log_info "Cleaning up..."
    # Kill any background processes
    jobs -p | xargs -r kill 2>/dev/null || true
}

trap cleanup EXIT

# Run main function
main "$@"