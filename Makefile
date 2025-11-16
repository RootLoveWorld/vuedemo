.PHONY: help install dev build test lint format clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install all dependencies
	pnpm install

dev: ## Start development servers
	pnpm dev

build: ## Build all applications
	pnpm build

test: ## Run all tests
	pnpm test

lint: ## Run linters
	pnpm lint

format: ## Format code
	pnpm format

format-check: ## Check code formatting
	pnpm format:check

typecheck: ## Run TypeScript type checking
	pnpm typecheck

clean: ## Clean build artifacts and dependencies
	pnpm clean
	rm -rf node_modules

docker-up: ## Start Docker containers
	docker-compose up -d

docker-down: ## Stop Docker containers
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f

setup: install ## Initial setup (install + git hooks)
	@echo "✅ Setup complete!"
