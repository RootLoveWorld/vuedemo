# Nginx Reverse Proxy Setup Guide

This guide explains how to configure and deploy the AI Workflow Platform with Nginx as a reverse proxy, including SSL/TLS support, load balancing, and WebSocket proxying.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [SSL Certificate Setup](#ssl-certificate-setup)
- [Configuration Details](#configuration-details)
- [Load Balancing](#load-balancing)
- [Troubleshooting](#troubleshooting)

## Overview

The Nginx reverse proxy sits in front of all services and provides:

- **Unified entry point**: Single domain for all services
- **SSL/TLS termination**: HTTPS encryption
- **Load balancing**: Distribute traffic across multiple instances
- **WebSocket support**: Real-time communication
- **Security**: Rate limiting, security headers, DDoS protection
- **Caching**: API response caching for better performance

## Features

### 1. Routing Rules

- `/` → Frontend (Vue3 SPA)
- `/api/*` → BFF Service (NestJS)
- `/socket.io/*` → WebSocket connections
- `/ai-service/*` → Direct AI service access (optional)

### 2. SSL/TLS Configuration

- Modern TLS 1.2 and 1.3 support
- Strong cipher suites
- OCSP stapling
- HSTS headers
- Automatic HTTP to HTTPS redirect

### 3. Load Balancing

- Least connections algorithm
- Health checks with automatic failover
- Connection pooling
- Support for horizontal scaling

### 4. WebSocket Proxy

- Proper upgrade header handling
- Long-lived connections (7 days timeout)
- No buffering for real-time data

### 5. Security Features

- Rate limiting (API, auth, execution endpoints)
- Connection limiting
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Hidden file protection
- Request size limits

### 6. Performance Optimization

- Gzip compression
- Static asset caching (1 year)
- API response caching (5 minutes)
- Connection keep-alive
- Buffering optimization

## Quick Start

### Development (Self-Signed Certificate)

1. **Generate self-signed certificate:**

```bash
cd docker
chmod +x scripts/generate-self-signed-cert.sh
./scripts/generate-self-signed-cert.sh localhost
```

2. **Create environment file:**

```bash
cp .env.nginx.example .env.nginx
# Edit .env.nginx with your configuration
```

3. **Start services:**

```bash
docker-compose -f docker-compose.nginx.yml up -d
```

4. **Access the application:**

- HTTP: http://localhost
- HTTPS: https://localhost (accept self-signed certificate warning)

### Production (Let's Encrypt)

1. **Configure domain:**

```bash
cd docker
cp .env.nginx.example .env.nginx
# Edit .env.nginx:
# - Set DOMAIN_NAME to your domain
# - Set CERTBOT_EMAIL to your email
```

2. **Initialize Let's Encrypt:**

```bash
chmod +x scripts/init-letsencrypt.sh
./scripts/init-letsencrypt.sh
```

3. **Start all services:**

```bash
docker-compose -f docker-compose.nginx.yml up -d
```

4. **Verify SSL:**

```bash
curl https://your-domain.com/health
```

## SSL Certificate Setup

### Option 1: Self-Signed Certificate (Development)

Best for local development and testing.

```bash
# Generate certificate
./scripts/generate-self-signed-cert.sh localhost

# Or for a custom domain
./scripts/generate-self-signed-cert.sh dev.example.com
```

**Note**: Browsers will show a security warning. This is expected for self-signed certificates.

### Option 2: Let's Encrypt (Production)

Free, automated SSL certificates for production.

**Prerequisites:**

- Domain name pointing to your server
- Ports 80 and 443 open
- Valid email address

**Steps:**

1. Configure environment:

```bash
# .env.nginx
DOMAIN_NAME=workflow.example.com
CERTBOT_EMAIL=admin@example.com
LETSENCRYPT_STAGING=0  # Set to 1 for testing
```

2. Run initialization script:

```bash
./scripts/init-letsencrypt.sh
```

3. Certificates will auto-renew every 12 hours.

**Manual renewal:**

```bash
docker-compose -f docker-compose.nginx.yml run --rm certbot renew
docker-compose -f docker-compose.nginx.yml exec nginx nginx -s reload
```

### Option 3: Custom Certificate

If you have your own SSL certificate:

1. Place certificate files in `./ssl/`:
   - `privkey.pem` - Private key
   - `fullchain.pem` - Full certificate chain
   - `chain.pem` - Intermediate certificates

2. Update `docker-compose.nginx.yml` to mount your certificate directory:

```yaml
volumes:
  - /path/to/your/certs:/etc/nginx/ssl:ro
```

## Configuration Details

### Nginx Configuration File

The main configuration is in `nginx-reverse-proxy.conf`. Key sections:

#### Upstream Definitions

```nginx
upstream bff_backend {
    least_conn;
    server bff:3001 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

- `least_conn`: Route to server with fewest connections
- `max_fails`: Mark server down after 3 failures
- `fail_timeout`: Wait 30s before retrying failed server
- `keepalive`: Keep 32 connections open for reuse

#### Rate Limiting

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/s;
```

- API endpoints: 100 requests/second per IP
- Auth endpoints: 10 requests/second per IP
- Execution endpoints: 20 requests/second per IP

#### WebSocket Configuration

```nginx
location /socket.io {
    proxy_pass http://bff_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 7d;
    proxy_buffering off;
}
```

### Environment Variables

Configure in `.env.nginx`:

| Variable        | Default   | Description                        |
| --------------- | --------- | ---------------------------------- |
| `DOMAIN_NAME`   | localhost | Your domain name                   |
| `HTTP_PORT`     | 80        | HTTP port                          |
| `HTTPS_PORT`    | 443       | HTTPS port                         |
| `SSL_CERT_PATH` | ./ssl     | SSL certificate directory          |
| `CERTBOT_EMAIL` | -         | Email for Let's Encrypt            |
| `JWT_SECRET`    | -         | JWT secret (change in production!) |

## Load Balancing

### Horizontal Scaling

To scale services horizontally:

1. **Update docker-compose.nginx.yml:**

```yaml
services:
  bff:
    deploy:
      replicas: 3 # Run 3 BFF instances
```

2. **Update nginx-reverse-proxy.conf:**

```nginx
upstream bff_backend {
    least_conn;
    server bff-1:3001 max_fails=3 fail_timeout=30s;
    server bff-2:3001 max_fails=3 fail_timeout=30s;
    server bff-3:3001 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

3. **Restart services:**

```bash
docker-compose -f docker-compose.nginx.yml up -d --scale bff=3
```

### Load Balancing Algorithms

Available algorithms (change in upstream block):

- `least_conn` - Least connections (default, best for long requests)
- `ip_hash` - Sticky sessions based on client IP
- `round_robin` - Simple round-robin (default if not specified)
- `least_time` - Least average response time (Nginx Plus only)

## Monitoring

### Check Nginx Status

```bash
# View logs
docker-compose -f docker-compose.nginx.yml logs -f nginx

# Check configuration
docker-compose -f docker-compose.nginx.yml exec nginx nginx -t

# Reload configuration
docker-compose -f docker-compose.nginx.yml exec nginx nginx -s reload
```

### Health Checks

```bash
# Overall health
curl http://localhost/health

# Service-specific health
curl http://localhost/api/health
```

### Access Logs

```bash
# Real-time access logs
docker-compose -f docker-compose.nginx.yml exec nginx tail -f /var/log/nginx/access.log

# Error logs
docker-compose -f docker-compose.nginx.yml exec nginx tail -f /var/log/nginx/error.log
```

## Troubleshooting

### SSL Certificate Issues

**Problem**: Certificate not found

```bash
# Check certificate files exist
ls -la docker/ssl/

# Should see:
# - privkey.pem
# - fullchain.pem
# - chain.pem
```

**Solution**: Regenerate certificates using the appropriate script.

### WebSocket Connection Fails

**Problem**: WebSocket connections timeout or fail

**Check**:

1. Verify upgrade headers are set correctly
2. Check firewall allows WebSocket connections
3. Verify timeout settings are sufficient

```bash
# Test WebSocket connection
wscat -c wss://your-domain.com/socket.io
```

### 502 Bad Gateway

**Problem**: Nginx can't reach backend services

**Check**:

1. Backend services are running:

   ```bash
   docker-compose -f docker-compose.nginx.yml ps
   ```

2. Network connectivity:

   ```bash
   docker-compose -f docker-compose.nginx.yml exec nginx ping bff
   ```

3. Backend health:
   ```bash
   docker-compose -f docker-compose.nginx.yml exec nginx curl http://bff:3001/health
   ```

### Rate Limiting Too Aggressive

**Problem**: Legitimate requests being blocked

**Solution**: Adjust rate limits in `nginx-reverse-proxy.conf`:

```nginx
# Increase rate limit
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=200r/s;

# Increase burst size
location /api {
    limit_req zone=api_limit burst=500 nodelay;
}
```

### High Memory Usage

**Problem**: Nginx consuming too much memory

**Solutions**:

1. Reduce cache size:

   ```nginx
   proxy_cache_path /var/cache/nginx ... max_size=50m ...
   ```

2. Reduce buffer sizes:

   ```nginx
   proxy_buffers 4 4k;
   proxy_buffer_size 4k;
   ```

3. Limit worker connections:
   ```nginx
   events {
       worker_connections 512;
   }
   ```

## Security Best Practices

1. **Change default secrets:**

   ```bash
   # Generate strong JWT secret
   openssl rand -base64 32
   ```

2. **Enable firewall:**

   ```bash
   # Only allow ports 80 and 443
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```

3. **Regular updates:**

   ```bash
   # Update nginx image
   docker-compose -f docker-compose.nginx.yml pull nginx
   docker-compose -f docker-compose.nginx.yml up -d nginx
   ```

4. **Monitor logs:**

   ```bash
   # Set up log monitoring/alerting
   # Use tools like fail2ban, Grafana, or ELK stack
   ```

5. **SSL/TLS hardening:**
   - Use strong cipher suites (already configured)
   - Enable HSTS (already configured)
   - Regular certificate renewal
   - Monitor SSL Labs rating: https://www.ssllabs.com/ssltest/

## Performance Tuning

### For High Traffic

1. **Increase worker processes:**

   ```nginx
   # nginx.conf
   worker_processes auto;  # Use all CPU cores
   ```

2. **Increase worker connections:**

   ```nginx
   events {
       worker_connections 4096;
   }
   ```

3. **Enable caching:**

   ```nginx
   proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:100m max_size=1g;
   ```

4. **Optimize buffers:**
   ```nginx
   proxy_buffer_size 8k;
   proxy_buffers 16 8k;
   ```

### For Low Latency

1. **Disable buffering for real-time endpoints:**

   ```nginx
   location /api/executions {
       proxy_buffering off;
       proxy_request_buffering off;
   }
   ```

2. **Reduce timeouts:**
   ```nginx
   proxy_connect_timeout 10s;
   proxy_send_timeout 30s;
   proxy_read_timeout 30s;
   ```

## Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [SSL Labs Testing](https://www.ssllabs.com/ssltest/)
- [WebSocket RFC](https://tools.ietf.org/html/rfc6455)

## Support

For issues or questions:

1. Check logs: `docker-compose -f docker-compose.nginx.yml logs nginx`
2. Verify configuration: `docker-compose -f docker-compose.nginx.yml exec nginx nginx -t`
3. Review this documentation
4. Check project issues on GitHub
