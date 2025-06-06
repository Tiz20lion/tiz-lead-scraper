#!/bin/bash

# Tiz Lead Scraper - Enhanced Deployment Script
# Usage: ./deploy.sh [production|development|debug|build|status|stop|logs|help]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to create .env file if it doesn't exist
setup_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        cp env.example .env
        print_warning "Please edit .env file with your API tokens before running again."
        print_warning "At minimum, you need to set OPENROUTER_API_KEY or OPENAI_API_KEY"
        exit 1
    fi
}

# Function to create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    mkdir -p logs data attached_assets
    print_success "Directories created successfully"
}

# Function to validate requirements
validate_requirements() {
    print_status "Validating requirements..."
    
    if [ ! -f "requirements.txt" ]; then
        print_error "requirements.txt not found"
        exit 1
    fi
    
    if [ ! -f "run_dev.py" ]; then
        print_error "run_dev.py not found"
        exit 1
    fi
    
    if [ ! -d "app" ]; then
        print_error "app directory not found"
        exit 1
    fi
    
    print_success "All required files found"
}

# Function to deploy production
deploy_production() {
    print_status "Deploying Tiz Lead Scraper in production mode..."
    
    # Pull latest image
    print_status "Pulling latest Docker image..."
    docker pull tiz20lion/tiz-lead-scraper:latest || print_warning "Could not pull latest image, using local build"
    
    # Stop existing containers
    stop_deployment
    
    # Start with docker-compose
    print_status "Starting production deployment..."
    docker-compose --profile production up -d
    
    print_success "Production deployment completed!"
    print_status "Application is running at: http://localhost:5000"
    print_status "Health check: http://localhost:5000/health"
    print_status "API docs: http://localhost:5000/docs"
}

# Function to deploy development
deploy_development() {
    print_status "Deploying Tiz Lead Scraper in development mode..."
    
    # Stop existing containers
    stop_deployment
    
    # Start with docker-compose (development profile)
    print_status "Starting development deployment with auto-reload..."
    docker-compose --profile development up -d
    
    print_success "Development deployment completed!"
    print_status "Application is running at: http://localhost:5000"
    print_status "Debug port: http://localhost:8000"
    print_status "Auto-reload enabled - code changes will restart the server"
    print_status "View logs: docker-compose logs -f tiz-lead-scraper-dev"
}

# Function to deploy debug mode
deploy_debug() {
    print_status "Deploying Tiz Lead Scraper in debug mode..."
    
    # Stop existing containers
    stop_deployment
    
    # Start with docker-compose (debug profile)
    print_status "Starting debug deployment..."
    docker-compose --profile debug up -d
    
    print_success "Debug deployment completed!"
    print_status "Container is running and ready for manual debugging"
    print_status "Access container: docker exec -it tiz-lead-scraper-debug bash"
    print_status "Run app manually: python run_dev.py"
    print_status "Application port: http://localhost:5000"
    print_status "Debug ports: 8000, 5678"
}

# Function to build custom image
build_custom() {
    print_status "Building custom Docker image..."
    
    # Build the image with enhanced features
    docker build -t tiz-lead-scraper:custom .
    
    print_success "Custom image built successfully!"
    print_status "Tagged as: tiz-lead-scraper:custom"
    print_status "Run with: docker run -d -p 5000:5000 -e OPENROUTER_API_KEY=your_key tiz-lead-scraper:custom"
}

# Function to show status
show_status() {
    print_status "Checking deployment status..."
    
    echo ""
    echo "=== Container Status ==="
    docker ps --filter "name=tiz-lead-scraper" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    echo "=== Health Check ==="
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        print_success "Application is healthy and responding"
        
        # Show health details
        echo "Health Details:"
        curl -s http://localhost:5000/health | python -m json.tool 2>/dev/null || echo "Could not parse health response"
    else
        print_warning "Application may not be ready yet or is not responding"
        print_status "Checking if container is running..."
        
        if docker ps --filter "name=tiz-lead-scraper" --format "{{.Names}}" | grep -q tiz-lead-scraper; then
            print_status "Container is running but application may be starting up"
            print_status "Check logs with: ./deploy.sh logs"
        else
            print_warning "No containers are running"
        fi
    fi
    
    echo ""
    echo "=== Quick Links ==="
    echo "🌐 Application: http://localhost:5000"
    echo "📚 API Docs: http://localhost:5000/docs"
    echo "❤️ Health Check: http://localhost:5000/health"
    echo "🐛 Debug Info: http://localhost:5000/debug/static"
    echo "📁 Static Files: http://localhost:5000/static/"
}

# Function to stop deployment
stop_deployment() {
    print_status "Stopping Tiz Lead Scraper..."
    
    # Stop all docker-compose services
    docker-compose --profile production down 2>/dev/null || true
    docker-compose --profile development down 2>/dev/null || true
    docker-compose --profile debug down 2>/dev/null || true
    
    # Stop standalone container if running
    if docker ps -q -f name=tiz-lead-scraper > /dev/null; then
        docker stop tiz-lead-scraper 2>/dev/null || true
        docker rm tiz-lead-scraper 2>/dev/null || true
    fi
    
    print_success "All deployments stopped successfully"
}

# Function to show logs
show_logs() {
    print_status "Showing application logs..."
    
    if docker ps -q -f name=tiz-lead-scraper-debug > /dev/null; then
        print_status "Debug container logs:"
        docker-compose logs -f tiz-lead-scraper-debug
    elif docker ps -q -f name=tiz-lead-scraper-dev > /dev/null; then
        print_status "Development container logs:"
        docker-compose logs -f tiz-lead-scraper-dev
    elif docker ps -q -f name=tiz-lead-scraper > /dev/null; then
        print_status "Production container logs:"
        docker-compose logs -f tiz-lead-scraper
    else
        print_warning "No running containers found"
        print_status "Available log commands:"
        echo "  - docker-compose logs tiz-lead-scraper"
        echo "  - docker-compose logs tiz-lead-scraper-dev"
        echo "  - docker-compose logs tiz-lead-scraper-debug"
    fi
}

# Function to show help
show_help() {
    echo "Tiz Lead Scraper - Enhanced Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  production    Deploy in production mode (recommended)"
    echo "  development   Deploy in development mode with hot reload"
    echo "  debug         Deploy in debug mode for manual debugging"
    echo "  build         Build custom Docker image"
    echo "  status        Show deployment status and health"
    echo "  stop          Stop all running containers"
    echo "  logs          Show application logs"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 production     # Deploy for production use"
    echo "  $0 development    # Deploy for development with auto-reload"
    echo "  $0 debug          # Deploy for debugging (manual start)"
    echo "  $0 status         # Check if everything is running"
    echo "  $0 stop           # Stop the application"
    echo ""
    echo "Setup Instructions:"
    echo "  1. Copy env.example to .env"
    echo "  2. Edit .env with your API tokens (OPENROUTER_API_KEY or OPENAI_API_KEY)"
    echo "  3. Run: $0 production"
    echo ""
    echo "Development Workflow:"
    echo "  1. $0 development    # Start with auto-reload"
    echo "  2. Edit code in ./app/"
    echo "  3. Changes auto-reload in container"
    echo "  4. $0 logs          # View real-time logs"
    echo ""
    echo "Debug Workflow:"
    echo "  1. $0 debug                                      # Start debug container"
    echo "  2. docker exec -it tiz-lead-scraper-debug bash   # Access container"
    echo "  3. python run_dev.py                            # Start app manually"
}

# Main script logic
main() {
    # Check if Docker is running
    check_docker
    
    # Create directories
    create_directories
    
    # Validate requirements
    validate_requirements
    
    case "${1:-help}" in
        "production")
            setup_env
            deploy_production
            show_status
            ;;
        "development")
            setup_env
            deploy_development
            show_status
            ;;
        "debug")
            setup_env
            deploy_debug
            show_status
            ;;
        "build")
            build_custom
            ;;
        "status")
            show_status
            ;;
        "stop")
            stop_deployment
            ;;
        "logs")
            show_logs
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@" 