@echo off
REM Tiz Lead Scraper - Easy Deployment Script for Windows
REM Usage: deploy.bat [production|development|build|status|stop|logs|help]

setlocal enabledelayedexpansion

REM Function to print colored output (simplified for Windows)
:print_status
echo [INFO] %~1
goto :eof

:print_success
echo [SUCCESS] %~1
goto :eof

:print_warning
echo [WARNING] %~1
goto :eof

:print_error
echo [ERROR] %~1
goto :eof

REM Function to check if Docker is running
:check_docker
docker info >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker is not running. Please start Docker Desktop and try again."
    exit /b 1
)
goto :eof

REM Function to create .env file if it doesn't exist
:setup_env
if not exist .env (
    call :print_warning ".env file not found. Creating from template..."
    copy env.example .env >nul
    call :print_warning "Please edit .env file with your API tokens before running again."
    call :print_warning "At minimum, you need to set APIFY_API_TOKEN"
    exit /b 1
)
goto :eof

REM Function to create necessary directories
:create_directories
call :print_status "Creating necessary directories..."
if not exist logs mkdir logs
if not exist data mkdir data
if not exist attached_assets mkdir attached_assets
call :print_success "Directories created successfully"
goto :eof

REM Function to deploy production
:deploy_production
call :print_status "Deploying Tiz Lead Scraper in production mode..."

REM Pull latest image
call :print_status "Pulling latest Docker image..."
docker pull tiz20lion/tiz-lead-scraper:latest

REM Stop existing container if running
docker ps -q -f name=tiz-lead-scraper >nul 2>&1
if not errorlevel 1 (
    call :print_status "Stopping existing container..."
    docker stop tiz-lead-scraper >nul
    docker rm tiz-lead-scraper >nul
)

REM Start with docker-compose
call :print_status "Starting production deployment..."
docker-compose --profile production up -d

call :print_success "Production deployment completed!"
call :print_status "Application is running at: http://localhost:5000"
call :print_status "Health check: http://localhost:5000/health"
call :print_status "API docs: http://localhost:5000/docs"
goto :eof

REM Function to deploy development
:deploy_development
call :print_status "Deploying Tiz Lead Scraper in development mode..."

REM Start with docker-compose
call :print_status "Starting development deployment..."
docker-compose --profile development up -d

call :print_success "Development deployment completed!"
call :print_status "Application is running at: http://localhost:5000"
call :print_status "Debug port: http://localhost:8000"
call :print_status "Logs: docker-compose logs -f tiz-lead-scraper-dev"
goto :eof

REM Function to build custom image
:build_custom
call :print_status "Building custom Docker image..."

REM Build the image
docker build -t tiz-lead-scraper:custom .

call :print_success "Custom image built successfully!"
call :print_status "You can now run: docker run -d -p 5000:5000 tiz-lead-scraper:custom"
goto :eof

REM Function to show status
:show_status
call :print_status "Checking deployment status..."

echo.
echo === Container Status ===
docker ps --filter "name=tiz-lead-scraper" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo === Health Check ===
curl -f http://localhost:5000/health >nul 2>&1
if not errorlevel 1 (
    call :print_success "Application is healthy and responding"
) else (
    call :print_warning "Application may not be ready yet or is not responding"
)

echo.
echo === Quick Links ===
echo 🌐 Application: http://localhost:5000
echo 📚 API Docs: http://localhost:5000/docs
echo ❤️ Health Check: http://localhost:5000/health
echo 📊 Debug Info: http://localhost:5000/debug/
goto :eof

REM Function to stop deployment
:stop_deployment
call :print_status "Stopping Tiz Lead Scraper..."

REM Stop docker-compose services
docker-compose --profile production down >nul 2>&1
docker-compose --profile development down >nul 2>&1

REM Stop standalone container if running
docker ps -q -f name=tiz-lead-scraper >nul 2>&1
if not errorlevel 1 (
    docker stop tiz-lead-scraper >nul
    docker rm tiz-lead-scraper >nul
)

call :print_success "Deployment stopped successfully"
goto :eof

REM Function to show logs
:show_logs
call :print_status "Showing application logs..."

docker ps -q -f name=tiz-lead-scraper-dev >nul 2>&1
if not errorlevel 1 (
    docker-compose logs -f tiz-lead-scraper-dev
) else (
    docker ps -q -f name=tiz-lead-scraper >nul 2>&1
    if not errorlevel 1 (
        docker-compose logs -f tiz-lead-scraper
    ) else (
        call :print_warning "No running containers found"
    )
)
goto :eof

REM Function to show help
:show_help
echo Tiz Lead Scraper - Easy Deployment Script for Windows
echo.
echo Usage: %~nx0 [COMMAND]
echo.
echo Commands:
echo   production    Deploy in production mode (recommended)
echo   development   Deploy in development mode with hot reload
echo   build         Build custom Docker image
echo   status        Show deployment status and health
echo   stop          Stop all running containers
echo   logs          Show application logs
echo   help          Show this help message
echo.
echo Examples:
echo   %~nx0 production     # Deploy for production use
echo   %~nx0 development    # Deploy for development
echo   %~nx0 status         # Check if everything is running
echo   %~nx0 stop           # Stop the application
echo.
echo Before first run:
echo   1. Copy env.example to .env
echo   2. Edit .env with your API tokens
echo   3. Run: %~nx0 production
goto :eof

REM Main script logic
:main
REM Check if Docker is running
call :check_docker
if errorlevel 1 exit /b 1

REM Create directories
call :create_directories

REM Handle command line arguments
set "command=%~1"
if "%command%"=="" set "command=help"

if "%command%"=="production" (
    call :setup_env
    if errorlevel 1 exit /b 1
    call :deploy_production
    call :show_status
) else if "%command%"=="development" (
    call :setup_env
    if errorlevel 1 exit /b 1
    call :deploy_development
    call :show_status
) else if "%command%"=="build" (
    call :build_custom
) else if "%command%"=="status" (
    call :show_status
) else if "%command%"=="stop" (
    call :stop_deployment
) else if "%command%"=="logs" (
    call :show_logs
) else (
    call :show_help
)

goto :eof

REM Call main function
call :main %* 