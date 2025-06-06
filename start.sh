#!/bin/bash

# Tiz Lead Scraper - Enhanced Start Script
echo "🚀 Starting Tiz Lead Scraper..."

# Function to kill processes on port 5000
kill_port_5000() {
    echo "🔍 Checking for existing processes on port 5000..."
    
    # Find processes using port 5000
    PIDS=$(lsof -ti:5000 2>/dev/null)
    
    if [ ! -z "$PIDS" ]; then
        echo "🛑 Found processes running on port 5000. Terminating..."
        echo "$PIDS" | xargs kill -TERM 2>/dev/null || true
        
        # Wait a moment for graceful shutdown
        sleep 3
        
        # Force kill if still running
        REMAINING_PIDS=$(lsof -ti:5000 2>/dev/null)
        if [ ! -z "$REMAINING_PIDS" ]; then
            echo "⚡ Force killing remaining processes..."
            echo "$REMAINING_PIDS" | xargs kill -KILL 2>/dev/null || true
        fi
        
        echo "✅ Port 5000 cleared successfully"
    else
        echo "✅ Port 5000 is available"
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if lsof is available for port checking
if ! command_exists lsof; then
    echo "⚠️  Warning: lsof not found. Installing on supported systems..."
    if command_exists apt-get; then
        sudo apt-get update && sudo apt-get install -y lsof
    elif command_exists yum; then
        sudo yum install -y lsof
    elif command_exists brew; then
        brew install lsof
    else
        echo "⚠️  Could not install lsof. Port checking may not work properly."
    fi
fi

# Kill any processes on port 5000
kill_port_5000

# Check if Docker is running
echo "🐳 Checking Docker status..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    echo "💡 On macOS: Start Docker Desktop"
    echo "💡 On Linux: sudo systemctl start docker"
    exit 1
fi
echo "✅ Docker is running"

# Check if Docker Compose is available
echo "🔧 Checking Docker Compose..."
if ! command_exists docker-compose && ! docker compose version > /dev/null 2>&1; then
    echo "❌ Docker Compose not found. Please install Docker Compose and try again."
    echo "💡 Visit: https://docs.docker.com/compose/install/"
    exit 1
fi
echo "✅ Docker Compose is available"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs data

# Stop any existing containers and clean up
echo "🛑 Stopping existing containers..."
if command_exists docker-compose; then
    docker-compose down --remove-orphans 2>/dev/null || true
else
    docker compose down --remove-orphans 2>/dev/null || true
fi

# Clean up any lingering containers using port 5000
echo "🧹 Cleaning up any containers using port 5000..."
docker ps --filter "publish=5000" --format "{{.ID}}" | xargs -r docker stop 2>/dev/null || true

# Build and start the application
echo "🔨 Building and starting Tiz Lead Scraper..."
if command_exists docker-compose; then
    docker-compose up --build -d
else
    docker compose up --build -d
fi

if [ $? -ne 0 ]; then
    echo "❌ Failed to start the application. Check Docker logs."
    exit 1
fi

# Wait for the application to be ready with better feedback
echo "⏳ Waiting for application to start..."
for i in {1..12}; do
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        echo "✅ Tiz Lead Scraper is running successfully!"
        echo "🌐 Open your browser and visit: http://localhost:5000"
        echo ""
        echo "📋 Quick Tips:"
        echo "• Get your Apify API token from: https://apify.com"
        echo "• View logs: docker-compose logs -f (or docker compose logs -f)"
        echo "• Stop application: docker-compose down (or docker compose down)"
        echo "• Restart application: ./start.sh"
        echo ""
        echo "🎉 Setup complete! Your lead scraper is ready to use."
        exit 0
    fi
    echo "⏳ Still starting... ($i/12)"
    sleep 5
done

# If we get here, startup failed
echo "❌ Application failed to start within 60 seconds."
echo ""
echo "🔍 Troubleshooting steps:"
echo "1. Check Docker logs: docker-compose logs -f"
echo "2. Verify port 5000 is not in use: lsof -i:5000"
echo "3. Restart Docker and try again"
echo "4. Check system resources (RAM/CPU)"
echo ""
echo "📝 Recent logs:"
if command_exists docker-compose; then
    docker-compose logs --tail=20
else
    docker compose logs --tail=20
fi

exit 1