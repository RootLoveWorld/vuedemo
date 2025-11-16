# Docker Compose Quick Reference

## Start Services

```bash
# Development (with hot reload)
make dev-up
# or
./start.sh dev

# Production
make prod-up
# or
./start.sh
```

## Stop Services

```bash
# Development
make dev-down
# or
./stop.sh dev

# Production
make prod-down
# or
./stop.sh
```

## View Logs

```bash
# Development
make dev-logs

# Production
make prod-logs

# Specific service
docker-compose -f docker-compose.dev.yml logs -f bff
```

## Common Tasks

```bash
# Check status
make ps

# Pull Ollama models
make pull-models

# Run database migrations
make migrate

# Access database
make db-shell

# Open container shell
make shell-bff
make shell-ai

# View resource usage
make stats
```

## Debug Ports (Development)

- **BFF:** localhost:9229 (Node.js)
- **AI Service:** localhost:5678 (Python)

## Access Points

- **Frontend:** http://localhost:3000
- **BFF API:** http://localhost:3001
- **AI Service:** http://localhost:8000
- **Ollama:** http://localhost:11434

## Environment Files

- **Production:** `.env` (copy from `.env.example`)
- **Development:** `.env.dev` (copy from `.env.dev.example`)

## Clean Up

```bash
# Clean development data
make clean-dev

# Clean production data
make clean-prod

# Clean everything
make clean
```

## Help

```bash
# Show all commands
make help

# Read documentation
cat DOCKER_COMPOSE_GUIDE.md
```
