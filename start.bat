@echo off
title Tiz Lead Scraper - Enhanced Start Script

echo 🚀 Starting Tiz Lead Scraper...

:: Function to kill processes on port 5000
echo 🔍 Checking for existing processes on port 5000...

:: Kill any process using port 5000
for /f "tokens=5" %%i in ('netstat -aon ^| findstr :5000') do (
    if not "%%i"=="0" (
        echo 🛑 Found process %%i using port 5000. Terminating...
        taskkill /F /PID %%i >nul 2>&1
    )
)

:: Also check for any docker containers using port 5000
echo 🧹 Cleaning up any containers using port 5000...
for /f %%i in ('docker ps --filter "publish=5000" --format "{{.ID}}" 2^>nul') do (
    echo 🛑 Stopping container %%i using port 5000...
    docker stop %%i >nul 2>&1
)

echo ✅ Port 5000 cleared successfully

:: Check if Docker is running
echo 🐳 Checking Docker status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop and try again.
    echo 💡 Start Docker Desktop from the Start menu or system tray
    pause
    exit /b 1
)
echo ✅ Docker is running

:: Check if Docker Compose is available
echo 🔧 Checking Docker Compose...
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    docker compose version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Docker Compose not found. Please install Docker Desktop and try again.
        echo 💡 Visit: https://docs.docker.com/compose/install/
        pause
        exit /b 1
    )
)
echo ✅ Docker Compose is available

:: Create necessary directories
echo 📁 Creating directories...
if not exist "logs" mkdir logs
if not exist "data" mkdir data

:: Stop any existing containers and clean up
echo 🛑 Stopping existing containers...
docker-compose down --remove-orphans >nul 2>&1
if %errorlevel% neq 0 (
    docker compose down --remove-orphans >nul 2>&1
)

:: Build and start the application
echo 🔨 Building and starting Tiz Lead Scraper...
docker-compose up --build -d
if %errorlevel% neq 0 (
    docker compose up --build -d
    if %errorlevel% neq 0 (
        echo ❌ Failed to start the application. Check Docker logs.
        pause
        exit /b 1
    )
)

:: Wait for the application to be ready with better feedback
echo ⏳ Waiting for application to start...
set /a counter=0
:wait_loop
set /a counter+=1
if %counter% gtr 12 goto timeout_error

curl -f http://localhost:5000/health >nul 2>&1
if %errorlevel% equ 0 goto success

echo ⏳ Still starting... (%counter%/12)
timeout /t 5 /nobreak >nul
goto wait_loop

:success
echo ✅ Tiz Lead Scraper is running successfully!
echo 🌐 Open your browser and visit: http://localhost:5000
echo.
echo 📋 Quick Tips:
echo • Get your Apify API token from: https://apify.com
echo • View logs: docker-compose logs -f (or docker compose logs -f)
echo • Stop application: docker-compose down (or docker compose down)
echo • Restart application: start.bat
echo.
echo 🎉 Setup complete! Your lead scraper is ready to use.
echo.
echo Press any key to open the application in your browser...
pause >nul
start http://localhost:5000
goto end

:timeout_error
echo ❌ Application failed to start within 60 seconds.
echo.
echo 🔍 Troubleshooting steps:
echo 1. Check Docker logs: docker-compose logs -f
echo 2. Verify port 5000 is not in use: netstat -an ^| findstr :5000
echo 3. Restart Docker Desktop and try again
echo 4. Check system resources (RAM/CPU)
echo.
echo 📝 Recent logs:
docker-compose logs --tail=20 2>nul
if %errorlevel% neq 0 (
    docker compose logs --tail=20 2>nul
)
echo.
pause
exit /b 1

:end