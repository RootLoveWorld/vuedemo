#!/bin/bash

# AI Workflow Platform - Docker Stop Script

set -e

echo "🛑 Stopping AI Workflow Platform..."
echo "=================================="
echo ""

# Determine environment
ENVIRONMENT=${1:-production}

if [ "$ENVIRONMENT" = "dev" ] || [ "$ENVIRONMENT" = "development" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
    ENVIRONMENT="development"
    echo "🔧 Stopping DEVELOPMENT environment"
else
    COMPOSE_FILE="docker-compose.prod.yml"
    ENVIRONMENT="production"
    echo "🏭 Stopping PRODUCTION environment"
fi

echo ""

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ $COMPOSE_FILE not found. Are you in the docker directory?"
    exit 1
fi

# Ask user if they want to remove volumes
echo "Do you want to remove data volumes? (This will delete all data!)"
read -p "Remove volumes? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "⚠️  Stopping services and removing volumes..."
    docker-compose -f "$COMPOSE_FILE" down -v
    echo "✅ Services stopped and volumes removed."
else
    echo "📦 Stopping services (keeping volumes)..."
    docker-compose -f "$COMPOSE_FILE" down
    echo "✅ Services stopped. Data volumes preserved."
fi

echo ""
if [ "$ENVIRONMENT" = "development" ]; then
    echo "💡 To start again, run: ./start.sh dev"
else
    echo "💡 To start again, run: ./start.sh"
fi
