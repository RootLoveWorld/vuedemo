# Nginx Reverse Proxy - Quick Reference

## Quick Commands

### Development Setup (Self-Signed SSL)

```bash
cd docker
make -f Makefile.nginx setup-dev
make -f Makefile.nginx start
```

Access: https://localhost (accept certificate warning)

### Production Setup (Let's Encrypt)

```bash
cd docker
make -f Makefile.nginx setup-prod
# Edit .env.nginx with your domain and email
make -f Makefile.nginx ssl-prod
make -f Makefile.nginx start
```

### Common Operations

```bash
# Start services
make -f Makefile.nginx start

# Stop services
make -f Makefile.nginx stop

# Restart services
make -f Makefile.nginx restart

# View logs
make -f Makefile.nginx logs

# Check status
make -f Makefile.nginx status

# Health check
make -f Makefile.nginx health

# Reload nginx config
make -f Makefile.nginx reload

# Test nginx config
make -f Makefile.nginx test
```

## Service URLs

| Service      | Internal URL           | External URL (via Nginx)      |
| ------------ | ---------------------- | ----------------------------- |
| Frontend     | http://frontend:80     | https://domain.com/           |
| BFF API      | http://bff:3001        | https://domain.com/api        |
| WebSocket    | ws://bff:3001          | wss://domain.com/socket.io    |
| AI Service   | http://ai-service:8000 | https://domain.com/ai-service |
| Health Check | -                      | https://domain.com/health     |

## Configuration Files

| File                       | Purpose                    |
| -------------------------- | -------------------------- |
| `nginx-reverse-proxy.conf` | Main nginx configuration   |
| `nginx.conf`               | Base nginx settings        |
| `docker-compose.nginx.yml` | Docker compose with nginx  |
| `.env.nginx`               | Environment variables      |
| `ssl/`                     | SSL certificates directory |

## SSL Certificate Management

### Self-Signed (Development)

```bash
# Generate certificate
./scripts/generate-self-signed-cert.sh localhost

# Or for custom domain
./scripts/generate-self-signed-cert.sh dev.example.com
```

### Let's Encrypt (Production)

```bash
# Initial setup
./scripts/init-letsencrypt.sh

# Manual renewal
make -f Makefile.nginx ssl-renew

# Auto-renewal runs every 12 hours via certbot container
```

## Troubleshooting

### Check Nginx Status

```bash
docker-compose -f docker-compose.nginx.yml exec nginx nginx -t
```

### View Nginx Logs

```bash
# Access logs
docker-compose -f docker-compose.nginx.yml exec nginx tail -f /var/log/nginx/access.log

# Error logs
docker-compose -f docker-compose.nginx.yml exec nginx tail -f /var/log/nginx/error.log
```

### Test Backend Connectivity

```bash
# From nginx container
docker-compose -f docker-compose.nginx.yml exec nginx curl http://bff:3001/health
docker-compose -f docker-compose.nginx.yml exec nginx curl http://ai-service:8000/health
```

### 502 Bad Gateway

1. Check backend services are running:

   ```bash
   docker-compose -f docker-compose.nginx.yml ps
   ```

2. Check backend health:

   ```bash
   make -f Makefile.nginx health
   ```

3. Check nginx logs:
   ```bash
   make -f Makefile.nginx logs
   ```

### WebSocket Issues

1. Verify upgrade headers in browser DevTools
2. Check nginx WebSocket configuration
3. Test with wscat:
   ```bash
   npm install -g wscat
   wscat -c wss://your-domain.com/socket.io
   ```

## Rate Limits

| Endpoint            | Rate Limit | Burst |
| ------------------- | ---------- | ----- |
| `/api/auth/*`       | 10 req/s   | 20    |
| `/api/executions/*` | 20 req/s   | 50    |
| `/api/*`            | 100 req/s  | 200   |

Adjust in `nginx-reverse-proxy.conf` if needed.

## Load Balancing

### Scale Services

```bash
# Scale BFF to 3 instances
docker-compose -f docker-compose.nginx.yml up -d --scale bff=3

# Scale AI service to 2 instances
docker-compose -f docker-compose.nginx.yml up -d --scale ai-service=2
```

### Update Upstream Configuration

Edit `nginx-reverse-proxy.conf`:

```nginx
upstream bff_backend {
    least_conn;
    server bff-1:3001;
    server bff-2:3001;
    server bff-3:3001;
}
```

Then reload:

```bash
make -f Makefile.nginx reload
```

## Security Checklist

- [ ] Change JWT_SECRET in .env.nginx
- [ ] Use strong POSTGRES_PASSWORD
- [ ] Enable firewall (ports 80, 443 only)
- [ ] Use Let's Encrypt for production
- [ ] Review rate limits
- [ ] Enable HSTS (already configured)
- [ ] Monitor logs regularly
- [ ] Keep nginx image updated

## Performance Tuning

### High Traffic

Edit `nginx.conf`:

```nginx
worker_processes auto;
events {
    worker_connections 4096;
}
```

### Enable More Caching

Edit `nginx-reverse-proxy.conf`:

```nginx
proxy_cache_path /var/cache/nginx ... max_size=1g;
proxy_cache_valid 200 10m;
```

## Monitoring

### Prometheus Metrics (Optional)

Add nginx-prometheus-exporter:

```yaml
services:
  nginx-exporter:
    image: nginx/nginx-prometheus-exporter:latest
    command:
      - '-nginx.scrape-uri=http://nginx:80/stub_status'
    ports:
      - '9113:9113'
```

### Access Logs Format

Logs include:

- Client IP
- Request method and path
- Response status
- Response time
- User agent
- Forwarded for headers

## Backup & Restore

### Backup Database

```bash
make -f Makefile.nginx backup
```

### Restore Database

```bash
make -f Makefile.nginx restore
```

## Environment Variables

Key variables in `.env.nginx`:

```bash
DOMAIN_NAME=your-domain.com
CERTBOT_EMAIL=admin@example.com
JWT_SECRET=your-secret-key
POSTGRES_PASSWORD=strong-password
```

## Additional Resources

- Full documentation: [NGINX_SETUP.md](./NGINX_SETUP.md)
- Nginx docs: https://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/
- SSL test: https://www.ssllabs.com/ssltest/
