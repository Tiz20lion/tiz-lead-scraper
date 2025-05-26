#!/bin/bash

# Tiz Lead Scraper - Easy Start Script
echo "🚀 Starting Tiz Lead Scraper..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose and try again."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs data

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start the application
echo "🔨 Building and starting Tiz Lead Scraper..."
docker-compose up --build -d

# Wait for the application to be ready
echo "⏳ Waiting for application to start..."
sleep 30

# Check if the application is running
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Tiz Lead Scraper is running successfully!"
    echo "🌐 Open your browser and visit: http://localhost:5000"
    echo ""
    echo "📋 Quick Tips:"
    echo "• Get your Apify API token from: https://apify.com"
    echo "• View logs: docker-compose logs -f"
    echo "• Stop application: docker-compose down"
else
    echo "❌ Application failed to start. Check logs with: docker-compose logs"
    exit 1
fi