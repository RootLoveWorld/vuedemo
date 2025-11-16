# Docker Deployment Documentation

## Overview

This document provides comprehensive information about deploying the AI Workflow Platform using Docker containers.

## Architecture

The platform consists of 6 containerized services:

1. **Frontend** (Vue3 + Nginx) - User interface
2. **BFF** (NestJS) - Backend for Frontend API layer
3. **AI Service** (Python/FastAPI) - Workflow execution engine
4. **PostgreSQL** - Primary database
5. **Redis** - Cache and session storage
6. **Ollama** - Local LLM service

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 8GB+ RAM recommended
- 20GB+ disk space (for Ollama models)

## Quick Start

### Option 1: Using the start script

```bash
cd docker
./start.sh
```

### Option 2: Using Make

```bash
cd docker
make up
```

### Option 3: Using Docker Compose directly

```bash
cd docker
cp .env.example .env
# Edit .env with your configuration
docker-compose up -d
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
POSTGRES_USER=workflow
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=workflow_db

# Security
JWT_SECRET=your_very_secure_random_string_here

# Ports (optional, defaults shown)
FRONTEND_PORT=3000
BFF_PORT=3001
AI_SERVICE_PORT=8000
```

**Important:** Always change `JWT_SECRET` in production!

Generate a secure JWT secret:

```bash
openssl rand -base64 32
```

## Dockerfile Details

### Frontend Dockerfile

**Location:** `docker/frontend.Dockerfile`

**Features:**

- Multi-stage build (builder + nginx)
- Optimized image size (~50MB final)
- Gzip compression enabled
- API and WebSocket proxying
- Health check endpoint
- Security headers

**Build stages:**

1. **Builder:** Compiles Vue3 app with Vite
2. **Production:** Serves static files with Nginx

### BFF Dockerfile

**Location:** `docker/bff.Dockerfile`

**Features:**

- Multi-stage build (builder + deps + production)
- Production-only dependencies
- Non-root user (nestjs:1001)
- Prisma client generation
- Health check endpoint
- Signal handling with dumb-init

**Build stages:**

1. **Builder:** Compiles TypeScript
2. **Deps:** Installs production dependencies
3. **Production:** Minimal runtime image

### AI Service Dockerfile

**Location:** `docker/ai-service.Dockerfile`

**Features:**

- Multi-stage build (builder + production)
- Poetry for dependency management
- Non-root user (appuser:1001)
- Virtual environment isolation
- Health check endpoint
- Signal handling with dumb-init

**Build stages:**

1. **Builder:** Installs Python dependencies
2. **Production:** Minimal runtime image

## Image Optimization

All Dockerfiles follow best practices:

1. **Multi-stage builds** - Separate build and runtime stages
2. **Layer caching** - Optimized COPY order for better caching
3. **Minimal base images** - Alpine Linux where possible
4. **Non-root users** - Security best practice
5. **Health checks** - Container orchestration support
6. **Signal handling** - Proper shutdown with dumb-init
7. **.dockerignore** - Exclude unnecessary files

## Image Sizes

Approximate final image sizes:

- Frontend: ~50MB (nginx:alpine + static files)
- BFF: ~400MB (node:alpine + dependencies)
- AI Service: ~800MB (python:slim + ML libraries)

## Networking

All services communicate through a Docker bridge network:

```
workflow-network (bridge)
├── frontend:80
├── bff:3001
├── ai-service:8000
├── postgres:5432
├── redis:6379
└── ollama:11434
```

**External access:**

- Frontend: localhost:3000
- BFF: localhost:3001 (optional)
- AI Service: localhost:8000 (optional)

**Internal DNS:**
Services can reach each other by service name (e.g., `http://bff:3001`)

## Data Persistence

Three named volumes store persistent data:

1. **postgres_data** - Database files
2. **redis_data** - Redis persistence
3. **ollama_data** - Downloaded LLM models

**Backup volumes:**

```bash
# Backup
docker run --rm -v workflow_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data

# Restore
docker run --rm -v workflow_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

## Health Checks

All services include health checks:

- **Frontend:** HTTP GET /health
- **BFF:** HTTP GET /health (Node.js)
- **AI Service:** HTTP GET /health (curl)
- **PostgreSQL:** pg_isready
- **Redis:** redis-cli ping
- **Ollama:** HTTP GET /api/tags

View health status:

```bash
docker-compose ps
```

## Logging

### View logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f bff

# Last 100 lines
docker-compose logs --tail=100 ai-service
```

### Log locations in containers

- Frontend: `/var/log/nginx/`
- BFF: `/app/apps/bff/logs/`
- AI Service: `/app/logs/`

## Troubleshooting

### Services won't start

**Check logs:**

```bash
docker-compose logs <service-name>
```

**Common issues:**

- Port already in use: Change port in `.env`
- Out of memory: Increase Docker memory limit
- Permission denied: Check file permissions

### Database connection failed

**Verify PostgreSQL:**

```bash
docker-compose ps postgres
docker-compose logs postgres
```

**Test connection:**

```bash
docker-compose exec postgres psql -U workflow -d workflow_db -c "SELECT 1"
```

**Run migrations:**

```bash
docker-compose exec bff npx prisma migrate deploy
```

### Ollama model not found

**Pull models:**

```bash
docker-compose exec ollama ollama pull llama2
docker-compose exec ollama ollama pull mistral
```

**List models:**

```bash
docker-compose exec ollama ollama list
```

### Frontend can't reach BFF

**Check BFF health:**

```bash
curl http://localhost:3001/health
```

**Check nginx config:**

```bash
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf
```

**Test from frontend container:**

```bash
docker-compose exec frontend wget -O- http://bff:3001/health
```

## Production Deployment

### Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Enable HTTPS (use reverse proxy)
- [ ] Limit exposed ports (only frontend)
- [ ] Enable firewall rules
- [ ] Regular security updates
- [ ] Scan images for vulnerabilities
- [ ] Use secrets management (Docker secrets/Vault)

### Performance Optimization

**Resource limits:**

```yaml
services:
  bff:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

**Scaling:**

```bash
# Scale BFF horizontally
docker-compose up -d --scale bff=3

# Add load balancer (nginx/traefik)
```

### Monitoring

Add monitoring stack:

```yaml
services:
  prometheus:
    image: prom/prometheus
    # ... configuration

  grafana:
    image: grafana/grafana
    # ... configuration
```

### Backup Strategy

**Automated backups:**

```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U workflow workflow_db > backup_$DATE.sql
```

**Schedule with cron:**

```bash
0 2 * * * /path/to/backup.sh
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Images

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Frontend
        run: docker build -f docker/frontend.Dockerfile -t myregistry/frontend:latest .

      - name: Push to Registry
        run: docker push myregistry/frontend:latest
```

## Maintenance

### Update images

```bash
# Pull latest base images
docker-compose pull

# Rebuild with latest
docker-compose up -d --build
```

### Clean up

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything (⚠️ careful!)
docker system prune -a --volumes
```

### Database maintenance

```bash
# Backup
docker-compose exec postgres pg_dump -U workflow workflow_db > backup.sql

# Restore
cat backup.sql | docker-compose exec -T postgres psql -U workflow workflow_db

# Vacuum
docker-compose exec postgres psql -U workflow -d workflow_db -c "VACUUM ANALYZE"
```

## Support

For issues or questions:

1. Check logs: `docker-compose logs -f`
2. Review this documentation
3. Check GitHub issues
4. Contact support team

## License

MIT
