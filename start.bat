@echo off
title Tiz Lead Scraper - Easy Start

echo 🚀 Starting Tiz Lead Scraper...

:: Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

:: Check if Docker Compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose not found. Please install Docker Desktop and try again.
    pause
    exit /b 1
)

:: Create necessary directories
echo 📁 Creating directories...
if not exist "logs" mkdir logs
if not exist "data" mkdir data

:: Stop any existing containers
echo 🛑 Stopping existing containers...
docker-compose down

:: Build and start the application
echo 🔨 Building and starting Tiz Lead Scraper...
docker-compose up --build -d

:: Wait for the application to be ready
echo ⏳ Waiting for application to start...
timeout /t 10 /nobreak >nul

:: Check if the application is running
curl -f http://localhost:5000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Tiz Lead Scraper is running successfully!
    echo 🌐 Open your browser and visit: http://localhost:5000
    echo.
    echo 📋 Quick Tips:
    echo • Get your Apify API token from: https://apify.com
    echo • View logs: docker-compose logs -f
    echo • Stop application: docker-compose down
    echo.
    echo Press any key to open the application in your browser...
    pause >nul
    start http://localhost:5000
) else (
    echo ❌ Application failed to start. Check logs with: docker-compose logs
    pause
    exit /b 1
)