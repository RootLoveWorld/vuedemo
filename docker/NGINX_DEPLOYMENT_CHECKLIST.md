# Nginx Reverse Proxy Deployment Checklist

Use this checklist to ensure proper deployment of the Nginx reverse proxy.

## Pre-Deployment

### Development Environment

- [ ] Review `NGINX_SETUP.md` documentation
- [ ] Verify Docker and Docker Compose are installed
- [ ] Check port availability (80, 443)
- [ ] Copy `.env.nginx.example` to `.env.nginx`
- [ ] Review environment variables in `.env.nginx`

### Production Environment

- [ ] Review `NGINX_SETUP.md` documentation
- [ ] Verify Docker and Docker Compose are installed
- [ ] Domain name configured and pointing to server
- [ ] Ports 80 and 443 open in firewall
- [ ] Valid email address for Let's Encrypt
- [ ] Copy `.env.nginx.example` to `.env.nginx`
- [ ] Update `DOMAIN_NAME` in `.env.nginx`
- [ ] Update `CERTBOT_EMAIL` in `.env.nginx`
- [ ] Generate strong `JWT_SECRET` (32+ characters)
- [ ] Generate strong `POSTGRES_PASSWORD`
- [ ] Update `CORS_ORIGIN` to production domain

## SSL Certificate Setup

### Development (Self-Signed)

- [ ] Run `./scripts/generate-self-signed-cert.sh localhost`
- [ ] Verify certificate files in `./ssl/` directory:
  - [ ] `privkey.pem`
  - [ ] `fullchain.pem`
  - [ ] `chain.pem`
- [ ] Note: Browser will show security warning (expected)

### Production (Let's Encrypt)

- [ ] Verify domain DNS is configured correctly
- [ ] Run `./scripts/init-letsencrypt.sh`
- [ ] Verify certificate initialization succeeded
- [ ] Check certificate files in `./ssl/` directory
- [ ] Test SSL with: `curl -I https://your-domain.com`
- [ ] Verify SSL rating: https://www.ssllabs.com/ssltest/
- [ ] Confirm auto-renewal is working (certbot container running)

## Service Deployment

### Start Services

- [ ] Run `make -f Makefile.nginx start`
- [ ] Wait for all services to start (check with `docker-compose ps`)
- [ ] Verify all services are healthy: `make -f Makefile.nginx health`

### Verify Nginx

- [ ] Test nginx configuration: `make -f Makefile.nginx test`
- [ ] Check nginx logs: `make -f Makefile.nginx logs`
- [ ] Verify nginx is running: `docker-compose -f docker-compose.nginx.yml ps nginx`

## Functional Testing

### Basic Connectivity

- [ ] Test health endpoint: `curl http://localhost/health`
- [ ] Test HTTPS redirect: `curl -I http://localhost/`
- [ ] Test frontend: Open browser to `https://your-domain.com`
- [ ] Verify frontend loads without errors

### API Testing

- [ ] Test API health: `curl https://your-domain.com/api/health`
- [ ] Test auth endpoint: `curl -X POST https://your-domain.com/api/auth/login`
- [ ] Verify API responses include security headers
- [ ] Test API with authentication token

### WebSocket Testing

- [ ] Install wscat: `npm install -g wscat`
- [ ] Test WebSocket: `wscat -c wss://your-domain.com/socket.io`
- [ ] Verify WebSocket connection establishes
- [ ] Test real-time updates

### Static Assets

- [ ] Verify static assets load (check browser DevTools)
- [ ] Check cache headers on static assets (should be 1 year)
- [ ] Verify gzip compression is working
- [ ] Test asset loading speed

## Security Verification

### SSL/TLS

- [ ] Verify HTTPS is enforced (HTTP redirects to HTTPS)
- [ ] Check SSL certificate is valid (no browser warnings)
- [ ] Verify TLS version (should be 1.2 or 1.3)
- [ ] Test with SSL Labs: https://www.ssllabs.com/ssltest/
- [ ] Target grade: A or A+

### Security Headers

- [ ] Verify HSTS header: `curl -I https://your-domain.com | grep -i strict`
- [ ] Check X-Frame-Options: `curl -I https://your-domain.com | grep -i x-frame`
- [ ] Check CSP header: `curl -I https://your-domain.com | grep -i content-security`
- [ ] Verify all security headers are present

### Rate Limiting

- [ ] Test API rate limiting (make rapid requests)
- [ ] Test auth rate limiting (should be stricter)
- [ ] Verify 429 status code on rate limit
- [ ] Check rate limit headers in response

### Access Control

- [ ] Verify hidden files are blocked: `curl https://your-domain.com/.env`
- [ ] Test sensitive file blocking: `curl https://your-domain.com/.git/config`
- [ ] Verify proper 403/404 responses

## Performance Testing

### Load Testing

- [ ] Run basic load test with `ab` or `wrk`
- [ ] Monitor nginx during load test
- [ ] Check response times under load
- [ ] Verify no errors under normal load

### Caching

- [ ] Verify static asset caching (check X-Cache-Status header)
- [ ] Test API response caching (GET requests)
- [ ] Verify cache bypass for authenticated requests
- [ ] Check cache hit ratio in logs

### Resource Usage

- [ ] Monitor CPU usage: `docker stats`
- [ ] Monitor memory usage: `docker stats`
- [ ] Check disk usage: `df -h`
- [ ] Verify resource limits are appropriate

## Monitoring Setup

### Logging

- [ ] Verify access logs are being written
- [ ] Verify error logs are being written
- [ ] Set up log rotation (if needed)
- [ ] Configure log aggregation (optional)

### Health Checks

- [ ] Set up automated health checks
- [ ] Configure alerting for service failures
- [ ] Test health check endpoints
- [ ] Verify health check frequency

### Metrics (Optional)

- [ ] Install nginx-prometheus-exporter
- [ ] Configure Prometheus scraping
- [ ] Set up Grafana dashboards
- [ ] Configure alerts

## Backup and Recovery

### Backup

- [ ] Test database backup: `make -f Makefile.nginx backup`
- [ ] Verify backup file is created
- [ ] Store backup in secure location
- [ ] Set up automated backup schedule

### Recovery

- [ ] Test database restore process
- [ ] Document recovery procedures
- [ ] Test disaster recovery plan
- [ ] Verify RTO/RPO requirements

## Documentation

### Internal Documentation

- [ ] Document deployment process
- [ ] Document configuration changes
- [ ] Document troubleshooting steps
- [ ] Create runbook for operations team

### External Documentation

- [ ] Update API documentation with new URLs
- [ ] Update client configuration examples
- [ ] Document WebSocket connection details
- [ ] Provide SSL certificate information

## Post-Deployment

### Immediate (First Hour)

- [ ] Monitor logs for errors
- [ ] Check service health every 5 minutes
- [ ] Verify user access and functionality
- [ ] Monitor resource usage
- [ ] Check SSL certificate validity

### Short-term (First Day)

- [ ] Review access logs for issues
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify backup completion
- [ ] Review security logs

### Long-term (First Week)

- [ ] Analyze traffic patterns
- [ ] Optimize rate limits if needed
- [ ] Review and adjust resource limits
- [ ] Fine-tune caching strategy
- [ ] Plan for scaling if needed

## Maintenance

### Daily

- [ ] Check service health
- [ ] Review error logs
- [ ] Monitor resource usage
- [ ] Verify backups completed

### Weekly

- [ ] Review access logs
- [ ] Check SSL certificate expiry
- [ ] Update security patches
- [ ] Review performance metrics
- [ ] Test disaster recovery

### Monthly

- [ ] Review and update documentation
- [ ] Audit security configuration
- [ ] Review rate limits and adjust
- [ ] Optimize performance settings
- [ ] Plan capacity upgrades

## Scaling Checklist

### Horizontal Scaling

- [ ] Identify bottleneck services
- [ ] Update upstream configuration in nginx
- [ ] Scale services: `docker-compose up -d --scale bff=3`
- [ ] Verify load distribution
- [ ] Monitor performance improvement

### Vertical Scaling

- [ ] Identify resource constraints
- [ ] Update resource limits in docker-compose
- [ ] Increase worker processes/connections
- [ ] Restart services
- [ ] Monitor resource usage

## Troubleshooting Checklist

### Service Not Starting

- [ ] Check docker logs: `docker-compose logs nginx`
- [ ] Verify configuration: `make -f Makefile.nginx test`
- [ ] Check port conflicts: `netstat -tulpn | grep -E '80|443'`
- [ ] Verify SSL certificates exist
- [ ] Check environment variables

### 502 Bad Gateway

- [ ] Check backend service status: `docker-compose ps`
- [ ] Test backend connectivity from nginx container
- [ ] Check backend logs
- [ ] Verify network configuration
- [ ] Check upstream health

### SSL Certificate Issues

- [ ] Verify certificate files exist
- [ ] Check certificate expiry: `openssl x509 -in ssl/fullchain.pem -noout -dates`
- [ ] Renew certificate: `make -f Makefile.nginx ssl-renew`
- [ ] Check Let's Encrypt rate limits
- [ ] Verify domain DNS

### Performance Issues

- [ ] Check resource usage: `docker stats`
- [ ] Review nginx logs for slow requests
- [ ] Check backend performance
- [ ] Verify caching is working
- [ ] Consider scaling services

## Rollback Plan

### Preparation

- [ ] Document current configuration
- [ ] Backup current SSL certificates
- [ ] Backup database
- [ ] Note current service versions

### Rollback Steps

- [ ] Stop current services: `make -f Makefile.nginx stop`
- [ ] Restore previous configuration
- [ ] Restore SSL certificates if needed
- [ ] Start services with previous configuration
- [ ] Verify functionality
- [ ] Restore database if needed

## Sign-off

### Development Deployment

- [ ] Deployment completed by: **\*\***\_\_\_\_**\*\***
- [ ] Date: **\*\***\_\_\_\_**\*\***
- [ ] All checks passed: Yes / No
- [ ] Issues noted: **\*\***\_\_\_\_**\*\***

### Production Deployment

- [ ] Deployment completed by: **\*\***\_\_\_\_**\*\***
- [ ] Date: **\*\***\_\_\_\_**\*\***
- [ ] All checks passed: Yes / No
- [ ] Issues noted: **\*\***\_\_\_\_**\*\***
- [ ] Approved by: **\*\***\_\_\_\_**\*\***
- [ ] Go-live date: **\*\***\_\_\_\_**\*\***

## Additional Resources

- [NGINX_SETUP.md](./NGINX_SETUP.md) - Complete setup guide
- [NGINX_QUICK_REFERENCE.md](./NGINX_QUICK_REFERENCE.md) - Quick commands
- [NGINX_ARCHITECTURE.md](./NGINX_ARCHITECTURE.md) - Architecture diagrams
- [NGINX_IMPLEMENTATION_SUMMARY.md](./NGINX_IMPLEMENTATION_SUMMARY.md) - Implementation details

## Support Contacts

- Technical Lead: **\*\***\_\_\_\_**\*\***
- DevOps Team: **\*\***\_\_\_\_**\*\***
- Security Team: **\*\***\_\_\_\_**\*\***
- On-call: **\*\***\_\_\_\_**\*\***

---

**Last Updated:** November 16, 2024
**Version:** 1.0.0
