.PHONY: help build up down restart logs ps clean pull-models dev-up dev-down prod-up prod-down

# Default target
help:
	@echo "AI Workflow Platform - Docker Commands"
	@echo "======================================"
	@echo ""
	@echo "Environment commands:"
	@echo "  make dev-up       - Start development environment (hot reload)"
	@echo "  make dev-down     - Stop development environment"
	@echo "  make dev-logs     - View development logs"
	@echo "  make dev-build    - Build development images"
	@echo "  make prod-up      - Start production environment"
	@echo "  make prod-down    - Stop production environment"
	@echo "  make prod-logs    - View production logs"
	@echo "  make prod-build   - Build production images"
	@echo ""
	@echo "General commands:"
	@echo "  make build        - Build all Docker images (production)"
	@echo "  make up           - Start all services (production)"
	@echo "  make down         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo "  make logs         - View logs from all services"
	@echo "  make ps           - Show service status"
	@echo "  make clean        - Stop services and remove volumes (⚠️  deletes data)"
	@echo "  make pull-models  - Pull default Ollama models"
	@echo ""
	@echo "Service-specific commands:"
	@echo "  make logs-frontend    - View frontend logs"
	@echo "  make logs-bff         - View BFF logs"
	@echo "  make logs-ai          - View AI service logs"
	@echo "  make shell-bff        - Open shell in BFF container"
	@echo "  make shell-ai         - Open shell in AI service container"
	@echo "  make migrate          - Run database migrations"
	@echo "  make db-shell         - Access PostgreSQL shell"
	@echo ""

# Development environment
dev-up:
	@echo "🚀 Starting DEVELOPMENT environment..."
	@if [ ! -f .env.dev ]; then \
		echo "📝 Creating .env.dev from .env.dev.example..."; \
		cp .env.dev.example .env.dev; \
	fi
	docker-compose -f docker-compose.dev.yml --env-file .env.dev up -d
	@echo "✅ Development environment started!"
	@echo ""
	@echo "🌐 Access points:"
	@echo "   Frontend:   http://localhost:3000 (Vite dev server with HMR)"
	@echo "   BFF API:    http://localhost:3001 (NestJS with hot reload)"
	@echo "   AI Service: http://localhost:8000 (FastAPI with auto-reload)"
	@echo ""
	@echo "🐛 Debug ports:"
	@echo "   BFF:        localhost:9229 (Node.js debugger)"
	@echo "   AI Service: localhost:5678 (Python debugger)"

dev-down:
	@echo "🛑 Stopping development environment..."
	docker-compose -f docker-compose.dev.yml down
	@echo "✅ Development environment stopped!"

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

dev-build:
	@echo "🔨 Building development images..."
	docker-compose -f docker-compose.dev.yml build

dev-restart:
	@echo "🔄 Restarting development environment..."
	docker-compose -f docker-compose.dev.yml restart
	@echo "✅ Development environment restarted!"

# Production environment
prod-up:
	@echo "🚀 Starting PRODUCTION environment..."
	@if [ ! -f .env ]; then \
		echo "📝 Creating .env from .env.example..."; \
		cp .env.example .env; \
		echo "⚠️  WARNING: Please update .env with secure values!"; \
	fi
	docker-compose -f docker-compose.prod.yml up -d
	@echo "✅ Production environment started!"
	@echo ""
	@echo "🌐 Access points:"
	@echo "   Frontend:   http://localhost:3000"
	@echo "   BFF API:    http://localhost:3001"
	@echo "   AI Service: http://localhost:8000"

prod-down:
	@echo "🛑 Stopping production environment..."
	docker-compose -f docker-compose.prod.yml down
	@echo "✅ Production environment stopped!"

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f

prod-build:
	@echo "🔨 Building production images..."
	docker-compose -f docker-compose.prod.yml build

prod-restart:
	@echo "🔄 Restarting production environment..."
	docker-compose -f docker-compose.prod.yml restart
	@echo "✅ Production environment restarted!"

# Build all images (defaults to production)
build:
	@echo "🔨 Building Docker images..."
	docker-compose -f docker-compose.prod.yml build

# Start all services (defaults to production)
up:
	@echo "🚀 Starting services..."
	docker-compose -f docker-compose.prod.yml up -d
	@echo "✅ Services started!"
	@echo ""
	@echo "🌐 Access points:"
	@echo "   Frontend:   http://localhost:3000"
	@echo "   BFF API:    http://localhost:3001"
	@echo "   AI Service: http://localhost:8000"

# Stop all services
down:
	@echo "🛑 Stopping services..."
	docker-compose -f docker-compose.prod.yml down
	@echo "✅ Services stopped!"

# Restart all services (defaults to production)
restart:
	@echo "🔄 Restarting services..."
	docker-compose -f docker-compose.prod.yml restart
	@echo "✅ Services restarted!"

# View logs (defaults to production)
logs:
	docker-compose -f docker-compose.prod.yml logs -f

# View frontend logs
logs-frontend:
	docker-compose -f docker-compose.prod.yml logs -f frontend

# View BFF logs
logs-bff:
	docker-compose -f docker-compose.prod.yml logs -f bff

# View AI service logs
logs-ai:
	docker-compose -f docker-compose.prod.yml logs -f ai-service

# Show service status
ps:
	@echo "Production environment:"
	@docker-compose -f docker-compose.prod.yml ps 2>/dev/null || echo "  Not running"
	@echo ""
	@echo "Development environment:"
	@docker-compose -f docker-compose.dev.yml ps 2>/dev/null || echo "  Not running"

# Clean everything (including volumes)
clean:
	@echo "⚠️  This will delete all data from both environments!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "🧹 Cleaning up..."
	docker-compose -f docker-compose.prod.yml down -v 2>/dev/null || true
	docker-compose -f docker-compose.dev.yml down -v 2>/dev/null || true
	@echo "✅ Cleanup complete!"

# Clean only development environment
clean-dev:
	@echo "⚠️  This will delete all development data!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "🧹 Cleaning up development environment..."
	docker-compose -f docker-compose.dev.yml down -v
	@echo "✅ Development cleanup complete!"

# Clean only production environment
clean-prod:
	@echo "⚠️  This will delete all production data!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "🧹 Cleaning up production environment..."
	docker-compose -f docker-compose.prod.yml down -v
	@echo "✅ Production cleanup complete!"

# Pull Ollama models (works for both environments)
pull-models:
	@echo "🤖 Pulling Ollama models..."
	@if docker ps | grep -q workflow-ollama; then \
		docker exec workflow-ollama ollama pull llama2; \
		docker exec workflow-ollama ollama pull mistral; \
	elif docker ps | grep -q workflow-ollama-dev; then \
		docker exec workflow-ollama-dev ollama pull llama2; \
		docker exec workflow-ollama-dev ollama pull mistral; \
	else \
		echo "❌ Ollama container not running. Start environment first."; \
		exit 1; \
	fi
	@echo "✅ Models pulled!"

# Open shell in BFF container
shell-bff:
	@if docker ps | grep -q workflow-bff-dev; then \
		docker exec -it workflow-bff-dev sh; \
	elif docker ps | grep -q workflow-bff; then \
		docker exec -it workflow-bff sh; \
	else \
		echo "❌ BFF container not running."; \
		exit 1; \
	fi

# Open shell in AI service container
shell-ai:
	@if docker ps | grep -q workflow-ai-service-dev; then \
		docker exec -it workflow-ai-service-dev sh; \
	elif docker ps | grep -q workflow-ai-service; then \
		docker exec -it workflow-ai-service sh; \
	else \
		echo "❌ AI service container not running."; \
		exit 1; \
	fi

# Run database migrations
migrate:
	@echo "📊 Running database migrations..."
	@if docker ps | grep -q workflow-bff-dev; then \
		docker exec workflow-bff-dev npx prisma migrate deploy; \
	elif docker ps | grep -q workflow-bff; then \
		docker exec workflow-bff npx prisma migrate deploy; \
	else \
		echo "❌ BFF container not running."; \
		exit 1; \
	fi
	@echo "✅ Migrations complete!"

# Access PostgreSQL
db-shell:
	@if docker ps | grep -q workflow-postgres-dev; then \
		docker exec -it workflow-postgres-dev psql -U workflow -d workflow_dev; \
	elif docker ps | grep -q workflow-postgres; then \
		docker exec -it workflow-postgres psql -U workflow -d workflow_db; \
	else \
		echo "❌ PostgreSQL container not running."; \
		exit 1; \
	fi

# View resource usage
stats:
	docker stats
