# Docker Deployment Guide

This directory contains Docker configurations for deploying the AI Workflow Platform with support for both **production** and **development** environments.

## Quick Start

### Production Environment

```bash
# Option 1: Using the start script
./start.sh

# Option 2: Using Make
make prod-up

# Option 3: Using Docker Compose directly
cp .env.example .env
# Edit .env with your configuration
docker-compose -f docker-compose.prod.yml up -d
```

### Development Environment

```bash
# Option 1: Using the start script
./start.sh dev

# Option 2: Using Make
make dev-up

# Option 3: Using Docker Compose directly
cp .env.dev.example .env.dev
docker-compose -f docker-compose.dev.yml --env-file .env.dev up -d
```

## Configuration Files

### Production

- **Compose File:** `docker-compose.prod.yml`
- **Environment:** `.env` (copy from `.env.example`)
- **Features:**
  - Optimized Docker images
  - Resource limits
  - Production logging
  - Health checks
  - Persistent volumes

### Development

- **Compose File:** `docker-compose.dev.yml`
- **Environment:** `.env.dev` (copy from `.env.dev.example`)
- **Features:**
  - Hot reload for all services
  - Source code mounted as volumes
  - Debug ports exposed
  - Development logging (DEBUG level)
  - Separate development database

## Architecture

```
┌─────────────┐
│   Frontend  │ :3000 (Nginx + Vue3 / Vite dev server)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│     BFF     │ :3001 (NestJS)
└──┬────┬─────┘
   │    │
   │    └──────────┐
   │               │
   ▼               ▼
┌──────────┐  ┌──────────┐
│PostgreSQL│  │AI Service│ :8000 (FastAPI)
└──────────┘  └────┬─────┘
                   │
              ┌────┴─────┐
              │          │
              ▼          ▼
         ┌────────┐  ┌────────┐
         │ Redis  │  │ Ollama │ :11434
         └────────┘  └────────┘
```

## Services

### Frontend (Vue3)

**Production:**

- Nginx serving static files
- Port: 3000
- Gzip compression
- API/WebSocket proxying

**Development:**

- Vite dev server with HMR
- Port: 3000 (5173 internally)
- Source code mounted
- Hot reload enabled

### BFF (NestJS)

**Production:**

- Optimized Node.js image
- Port: 3001
- Runs migrations on startup
- Production logging

**Development:**

- Hot reload enabled
- Port: 3001
- Debug port: 9229
- Source code mounted
- Development logging

### AI Service (Python/FastAPI)

**Production:**

- Optimized Python image
- Port: 8000
- 4 workers (configurable)
- Production logging

**Development:**

- Auto-reload enabled
- Port: 8000
- Debug port: 5678
- Source code mounted
- DEBUG logging

### PostgreSQL

- Port: 5432
- Image: postgres:16-alpine
- Separate volumes for prod/dev

### Redis

- Port: 6379
- Image: redis:7-alpine
- Separate volumes for prod/dev

### Ollama

- Port: 11434
- Image: ollama/ollama:latest
- Separate volumes for prod/dev

## Environment Variables

### Production (.env)

```bash
# Required changes:
POSTGRES_PASSWORD=<generate-secure-password>
JWT_SECRET=<generate-secure-random-string>
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=WARNING
```

Generate secure values:

```bash
# JWT secret
openssl rand -base64 32

# PostgreSQL password
openssl rand -base64 24
```

### Development (.env.dev)

Development defaults are fine for local development. No changes required.

## Common Commands

### Using Make (Recommended)

```bash
# Development
make dev-up          # Start development environment
make dev-down        # Stop development environment
make dev-logs        # View development logs
make dev-build       # Build development images
make dev-restart     # Restart development services

# Production
make prod-up         # Start production environment
make prod-down       # Stop production environment
make prod-logs       # View production logs
make prod-build      # Build production images
make prod-restart    # Restart production services

# General
make ps              # Show service status (both environments)
make pull-models     # Pull Ollama models
make migrate         # Run database migrations
make db-shell        # Access PostgreSQL shell
make shell-bff       # Open BFF container shell
make shell-ai        # Open AI service container shell
make stats           # View resource usage
make clean           # Clean all data (both environments)
make clean-dev       # Clean development data only
make clean-prod      # Clean production data only
```

### Using Scripts

```bash
# Start
./start.sh           # Production
./start.sh dev       # Development

# Stop
./stop.sh            # Production
./stop.sh dev        # Development
```

### Using Docker Compose Directly

```bash
# Production
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml logs -f

# Development
docker-compose -f docker-compose.dev.yml --env-file .env.dev up -d
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml logs -f
```

## Development Features

### Hot Reload

All services support hot reload in development:

- **Frontend:** Vite HMR (instant updates)
- **BFF:** NestJS watch mode (auto-restart)
- **AI Service:** FastAPI auto-reload (auto-restart)

### Debug Ports

Connect your debugger:

- **BFF:** localhost:9229 (Node.js/Chrome DevTools)
- **AI Service:** localhost:5678 (Python debugpy)

**VS Code Debug Configuration:**

```json
{
  "configurations": [
    {
      "name": "Attach to BFF",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "restart": true
    },
    {
      "name": "Attach to AI Service",
      "type": "python",
      "request": "attach",
      "connect": {
        "host": "localhost",
        "port": 5678
      }
    }
  ]
}
```

### Source Code Mounting

Development containers mount source code:

```yaml
volumes:
  - ../apps/frontend:/app/apps/frontend:delegated
  - ../apps/bff:/app/apps/bff:delegated
  - ../apps/ai-service:/app/apps/ai-service:delegated
```

Changes to source code are immediately reflected.

## Production Features

### Resource Limits

Production services have resource limits:

- PostgreSQL: 2 CPU, 2GB RAM
- Redis: 1 CPU, 512MB RAM
- Ollama: 4 CPU, 8GB RAM
- AI Service: 2 CPU, 2GB RAM
- BFF: 2 CPU, 2GB RAM
- Frontend: 0.5 CPU, 256MB RAM

### Health Checks

All services include health checks for orchestration:

```yaml
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:8000/health']
  interval: 30s
  timeout: 5s
  retries: 3
```

### Optimized Images

Production images use multi-stage builds:

- Minimal base images (Alpine/Slim)
- Production-only dependencies
- Non-root users
- Efficient layer caching

## Troubleshooting

### Port Conflicts

Change ports in `.env` or `.env.dev`:

```bash
FRONTEND_PORT=3001
BFF_PORT=3002
AI_SERVICE_PORT=8001
```

### Hot Reload Not Working

```bash
# Restart the service
make dev-restart

# Check volume mounts
docker-compose -f docker-compose.dev.yml config
```

### Database Connection Issues

```bash
# Check PostgreSQL
make dev-logs | grep postgres

# Test connection
docker-compose -f docker-compose.dev.yml exec postgres \
  psql -U workflow -d workflow_dev -c "SELECT 1"

# Run migrations
make migrate
```

### Ollama Models Not Found

```bash
# Pull models
make pull-models

# Or manually
docker exec workflow-ollama-dev ollama pull llama2
docker exec workflow-ollama-dev ollama list
```

### Build Failures

```bash
# Clean and rebuild
make clean-dev
make dev-build
make dev-up
```

## Security Considerations

### Production

- ✅ Change all default passwords
- ✅ Use strong JWT secret (32+ characters)
- ✅ Enable HTTPS (use reverse proxy)
- ✅ Limit exposed ports (only frontend)
- ✅ Enable firewall rules
- ✅ Regular security updates
- ✅ Scan images for vulnerabilities

### Development

- ⚠️ Development secrets are not secure
- ⚠️ CORS is set to `*` for convenience
- ⚠️ Debug ports are exposed
- ⚠️ Do not use dev config in production

## Backup and Restore

### Backup

```bash
# PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U workflow workflow_db > backup.sql

# Ollama models
docker cp workflow-ollama:/root/.ollama ./ollama_backup
```

### Restore

```bash
# PostgreSQL
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U workflow workflow_db

# Ollama models
docker cp ./ollama_backup/. workflow-ollama:/root/.ollama
```

## Nginx Reverse Proxy

For production deployments with SSL/TLS, load balancing, and advanced routing:

- **[Nginx Setup Guide](./NGINX_SETUP.md)** - Complete nginx reverse proxy documentation
- **[Nginx Quick Reference](./NGINX_QUICK_REFERENCE.md)** - Quick commands and troubleshooting

### Quick Start with Nginx

```bash
# Development with self-signed SSL
cd docker
make -f Makefile.nginx setup-dev
make -f Makefile.nginx start

# Production with Let's Encrypt
cd docker
make -f Makefile.nginx setup-prod
# Edit .env.nginx with your domain
make -f Makefile.nginx ssl-prod
make -f Makefile.nginx start
```

## Additional Documentation

- **[Docker Compose Guide](./DOCKER_COMPOSE_GUIDE.md)** - Comprehensive guide for both environments
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment documentation
- **[Docker Setup](../DOCKER_SETUP.md)** - Initial setup documentation
- **[Nginx Setup](./NGINX_SETUP.md)** - Nginx reverse proxy configuration
- **[Nginx Quick Reference](./NGINX_QUICK_REFERENCE.md)** - Nginx quick commands

## Support

For issues or questions:

1. Check logs: `make dev-logs` or `make prod-logs`
2. Review documentation in `docker/`
3. Check service health: `make ps`
4. Contact support team

---

**Last Updated:** November 16, 2024
**Version:** 2.0.0 (with dev/prod separation)
