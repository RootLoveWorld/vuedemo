# Docker Compose Configuration Guide

## Overview

This project provides two Docker Compose configurations optimized for different use cases:

1. **Production Configuration** (`docker-compose.prod.yml`) - Optimized for production deployment
2. **Development Configuration** (`docker-compose.dev.yml`) - Optimized for local development with hot reload

## Quick Start

### Development Environment

```bash
cd docker
make dev-up
```

This will:

- Start all services with hot reload enabled
- Mount source code for live updates
- Expose debug ports for debugging
- Use development database and settings

### Production Environment

```bash
cd docker
make prod-up
```

This will:

- Start all services in production mode
- Use optimized Docker images
- Apply resource limits
- Use production database and settings

## Configuration Files

### Production Configuration

**File:** `docker-compose.prod.yml`

**Features:**

- ✅ Multi-stage optimized Docker images
- ✅ Resource limits (CPU and memory)
- ✅ Production-grade restart policies
- ✅ Health checks for all services
- ✅ Persistent data volumes
- ✅ Network isolation
- ✅ Security best practices

**Resource Limits:**

- PostgreSQL: 2 CPU, 2GB RAM
- Redis: 1 CPU, 512MB RAM
- Ollama: 4 CPU, 8GB RAM
- AI Service: 2 CPU, 2GB RAM
- BFF: 2 CPU, 2GB RAM
- Frontend: 0.5 CPU, 256MB RAM

**Services:**

- All services run with `restart: unless-stopped`
- Health checks ensure service availability
- Proper dependency management with `depends_on`
- Separate volumes for production data

### Development Configuration

**File:** `docker-compose.dev.yml`

**Features:**

- ✅ Hot reload for all services
- ✅ Source code mounted as volumes
- ✅ Debug ports exposed
- ✅ Faster startup times
- ✅ Development-friendly logging
- ✅ Simplified dependencies
- ✅ Separate development database

**Development Features:**

- **Frontend:** Vite dev server with HMR on port 5173
- **BFF:** NestJS with hot reload, debug port 9229
- **AI Service:** FastAPI with auto-reload, debug port 5678
- **Database:** Separate development database
- **Logging:** DEBUG level for detailed logs

**Mounted Volumes:**

```yaml
# Frontend
- ../apps/frontend:/app/apps/frontend:delegated

# BFF
- ../apps/bff:/app/apps/bff:delegated
- ../packages:/app/packages:delegated

# AI Service
- ../apps/ai-service:/app/apps/ai-service:delegated
```

## Environment Variables

### Production Environment

**File:** `.env` (copy from `.env.example`)

```bash
# Required changes for production:
POSTGRES_PASSWORD=<generate-secure-password>
JWT_SECRET=<generate-secure-random-string>
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=WARNING
```

**Generate secure values:**

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate PostgreSQL password
openssl rand -base64 24
```

### Development Environment

**File:** `.env.dev` (copy from `.env.dev.example`)

```bash
# Development defaults are fine
POSTGRES_PASSWORD=workflow_dev
JWT_SECRET=dev-secret-key-not-for-production
CORS_ORIGIN=*
LOG_LEVEL=DEBUG
```

## Network Configuration

### Production Network

```yaml
networks:
  workflow-network:
    driver: bridge
```

All services communicate through this isolated network.

### Development Network

```yaml
networks:
  workflow-dev-network:
    driver: bridge
```

Separate network for development to avoid conflicts.

## Volume Management

### Production Volumes

```yaml
volumes:
  postgres_data: # PostgreSQL data
  redis_data: # Redis persistence
  ollama_data: # LLM models
```

### Development Volumes

```yaml
volumes:
  postgres_dev_data: # Development database
  redis_dev_data: # Development cache
  ollama_dev_data: # Development models
```

**Note:** Development and production volumes are completely separate.

## Service Details

### PostgreSQL

**Production:**

- Resource limits: 2 CPU, 2GB RAM
- Persistent volume
- Health checks every 10s
- UTF-8 encoding

**Development:**

- No resource limits
- Separate dev database
- Faster health checks (5s)
- Exposed port for direct access

### Redis

**Production:**

- Resource limits: 1 CPU, 512MB RAM
- AOF persistence enabled
- LRU eviction policy
- 512MB max memory

**Development:**

- No resource limits
- AOF persistence enabled
- Exposed port for direct access

### Ollama

**Production:**

- Resource limits: 4 CPU, 8GB RAM
- Persistent model storage
- Health checks every 30s

**Development:**

- No resource limits
- Separate model storage
- Same health checks

### AI Service (Python/FastAPI)

**Production:**

- Multi-stage optimized image
- Resource limits: 2 CPU, 2GB RAM
- 4 workers (configurable)
- Production logging

**Development:**

- Builder stage with Poetry
- Source code mounted
- Auto-reload enabled
- Debug port 5678 exposed
- DEBUG logging

**Debug with VS Code:**

```json
{
  "name": "Attach to AI Service",
  "type": "python",
  "request": "attach",
  "connect": {
    "host": "localhost",
    "port": 5678
  }
}
```

### BFF (NestJS)

**Production:**

- Multi-stage optimized image
- Resource limits: 2 CPU, 2GB RAM
- Runs migrations on startup
- Production logging

**Development:**

- Builder stage with dependencies
- Source code mounted
- Hot reload enabled
- Debug port 9229 exposed
- Development logging

**Debug with VS Code:**

```json
{
  "name": "Attach to BFF",
  "type": "node",
  "request": "attach",
  "port": 9229,
  "restart": true,
  "skipFiles": ["<node_internals>/**"]
}
```

### Frontend (Vue3)

**Production:**

- Nginx serving static files
- Resource limits: 0.5 CPU, 256MB RAM
- Gzip compression
- API proxying

**Development:**

- Vite dev server
- Source code mounted
- HMR enabled
- Port 5173 (Vite default)

## Common Commands

### Development

```bash
# Start development environment
make dev-up

# View logs
make dev-logs

# Restart services
make dev-restart

# Stop environment
make dev-down

# Clean development data
make clean-dev
```

### Production

```bash
# Start production environment
make prod-up

# View logs
make prod-logs

# Restart services
make prod-restart

# Stop environment
make prod-down

# Clean production data
make clean-prod
```

### Both Environments

```bash
# View service status
make ps

# Pull Ollama models
make pull-models

# Run migrations
make migrate

# Access database
make db-shell

# Open BFF shell
make shell-bff

# Open AI service shell
make shell-ai

# View resource usage
make stats
```

## Debugging

### Enable Debug Mode

**BFF (Node.js):**

```bash
# Already enabled in dev environment on port 9229
# Attach debugger from VS Code or Chrome DevTools
```

**AI Service (Python):**

```bash
# Already enabled in dev environment on port 5678
# Use debugpy or VS Code Python debugger
```

### View Logs

```bash
# All services
make dev-logs

# Specific service
docker-compose -f docker-compose.dev.yml logs -f bff

# Last 100 lines
docker-compose -f docker-compose.dev.yml logs --tail=100 ai-service
```

### Access Container Shell

```bash
# BFF
make shell-bff

# AI Service
make shell-ai

# PostgreSQL
make db-shell
```

## Troubleshooting

### Port Conflicts

If ports are already in use, modify `.env` or `.env.dev`:

```bash
FRONTEND_PORT=3001
BFF_PORT=3002
AI_SERVICE_PORT=8001
```

### Hot Reload Not Working

**Check volume mounts:**

```bash
docker-compose -f docker-compose.dev.yml config
```

**Restart service:**

```bash
docker-compose -f docker-compose.dev.yml restart bff
```

### Database Connection Issues

**Check PostgreSQL:**

```bash
docker-compose -f docker-compose.dev.yml logs postgres
```

**Test connection:**

```bash
docker-compose -f docker-compose.dev.yml exec postgres \
  psql -U workflow -d workflow_dev -c "SELECT 1"
```

### Ollama Models Not Found

**Pull models:**

```bash
make pull-models
```

**List models:**

```bash
docker exec workflow-ollama-dev ollama list
```

### Build Failures

**Clean and rebuild:**

```bash
make clean-dev
make dev-build
make dev-up
```

## Performance Optimization

### Development

**Use delegated volume mounts** (already configured):

```yaml
volumes:
  - ../apps/frontend:/app/apps/frontend:delegated
```

**Exclude node_modules:**

```yaml
volumes:
  - /app/node_modules # Anonymous volume
```

### Production

**Resource limits prevent resource exhaustion:**

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

**Health checks ensure availability:**

```yaml
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:8000/health']
  interval: 30s
  timeout: 5s
  retries: 3
```

## Migration Between Environments

### Export from Development

```bash
# Export database
docker-compose -f docker-compose.dev.yml exec postgres \
  pg_dump -U workflow workflow_dev > dev_backup.sql

# Export Ollama models
docker cp workflow-ollama-dev:/root/.ollama ./ollama_backup
```

### Import to Production

```bash
# Import database
cat dev_backup.sql | docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U workflow workflow_db

# Import Ollama models
docker cp ./ollama_backup/. workflow-ollama:/root/.ollama
```

## Best Practices

### Development

1. ✅ Use `make dev-up` for consistent startup
2. ✅ Keep `.env.dev` in `.gitignore`
3. ✅ Use debug ports for troubleshooting
4. ✅ Monitor logs with `make dev-logs`
5. ✅ Clean up regularly with `make clean-dev`

### Production

1. ✅ Always use strong passwords and secrets
2. ✅ Enable HTTPS with reverse proxy
3. ✅ Monitor resource usage with `make stats`
4. ✅ Regular backups of volumes
5. ✅ Update images regularly
6. ✅ Use `make prod-up` for deployment
7. ✅ Review logs with `make prod-logs`

## Security Considerations

### Production

- ✅ Change all default passwords
- ✅ Use strong JWT secret (32+ characters)
- ✅ Limit exposed ports (only frontend)
- ✅ Enable firewall rules
- ✅ Use HTTPS (reverse proxy)
- ✅ Regular security updates
- ✅ Scan images for vulnerabilities

### Development

- ⚠️ Development secrets are not secure
- ⚠️ CORS is set to `*` for convenience
- ⚠️ Debug ports are exposed
- ⚠️ Do not use dev config in production

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Production Deployment Guide](./DEPLOYMENT.md)
- [Docker Setup Guide](../DOCKER_SETUP.md)
- [Project README](../README.md)

## Support

For issues or questions:

1. Check logs: `make dev-logs` or `make prod-logs`
2. Review this documentation
3. Check service health: `make ps`
4. Contact support team

---

**Last Updated:** November 16, 2024
**Version:** 1.0.0
