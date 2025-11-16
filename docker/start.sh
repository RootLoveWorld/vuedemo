#!/bin/bash

# AI Workflow Platform - Docker Quick Start Script

set -e

echo "🚀 AI Workflow Platform - Docker Deployment"
echo "==========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Determine environment
ENVIRONMENT=${1:-production}

if [ "$ENVIRONMENT" = "dev" ] || [ "$ENVIRONMENT" = "development" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
    ENV_FILE=".env.dev"
    ENV_EXAMPLE=".env.dev.example"
    ENVIRONMENT="development"
    echo "🔧 Starting DEVELOPMENT environment"
else
    COMPOSE_FILE="docker-compose.prod.yml"
    ENV_FILE=".env"
    ENV_EXAMPLE=".env.example"
    ENVIRONMENT="production"
    echo "🏭 Starting PRODUCTION environment"
fi

echo ""

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "📝 Creating $ENV_FILE from $ENV_EXAMPLE..."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "⚠️  WARNING: Please edit $ENV_FILE and set secure values!"
        echo "   Especially: JWT_SECRET and POSTGRES_PASSWORD"
        echo ""
        read -p "Press Enter to continue or Ctrl+C to exit and edit $ENV_FILE first..."
    else
        echo "✅ Development environment file created with default values"
    fi
fi

# Pull Ollama base image first (it's large)
echo ""
echo "📦 Pulling Ollama image (this may take a while)..."
docker pull ollama/ollama:latest

# Build and start services
echo ""
echo "🔨 Building and starting services..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose -f "$COMPOSE_FILE" ps

# Pull default Ollama model
echo ""
echo "🤖 Pulling default Ollama model (llama2)..."
echo "   This may take several minutes depending on your internet connection..."

if [ "$ENVIRONMENT" = "development" ]; then
    OLLAMA_CONTAINER="workflow-ollama-dev"
else
    OLLAMA_CONTAINER="workflow-ollama"
fi

docker exec -t "$OLLAMA_CONTAINER" ollama pull llama2 || echo "⚠️  Failed to pull model. You can do this later with: docker exec $OLLAMA_CONTAINER ollama pull llama2"

echo ""
echo "✅ Deployment complete!"
echo ""

if [ "$ENVIRONMENT" = "development" ]; then
    echo "🌐 Access the application (DEVELOPMENT):"
    echo "   Frontend:   http://localhost:3000 (Vite dev server with HMR)"
    echo "   BFF API:    http://localhost:3001 (NestJS with hot reload)"
    echo "   AI Service: http://localhost:8000 (FastAPI with auto-reload)"
    echo "   Ollama:     http://localhost:11434"
    echo ""
    echo "🐛 Debug ports:"
    echo "   BFF:        localhost:9229 (Node.js debugger)"
    echo "   AI Service: localhost:5678 (Python debugger)"
    echo ""
    echo "📝 Useful commands:"
    echo "   View logs:        make dev-logs"
    echo "   Stop services:    make dev-down"
    echo "   Restart service:  make dev-restart"
else
    echo "🌐 Access the application (PRODUCTION):"
    echo "   Frontend:   http://localhost:3000"
    echo "   BFF API:    http://localhost:3001"
    echo "   AI Service: http://localhost:8000"
    echo "   Ollama:     http://localhost:11434"
    echo ""
    echo "📝 Useful commands:"
    echo "   View logs:        make prod-logs"
    echo "   Stop services:    make prod-down"
    echo "   Restart service:  make prod-restart"
fi

echo ""
echo "📚 For more information, see docker/DOCKER_COMPOSE_GUIDE.md"
