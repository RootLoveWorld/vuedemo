# Nginx Reverse Proxy Architecture

## System Architecture Diagram

```
                                    Internet
                                       │
                                       │
                                       ▼
                        ┌──────────────────────────┐
                        │   Nginx Reverse Proxy    │
                        │   (Port 80/443)          │
                        │                          │
                        │  Features:               │
                        │  • SSL/TLS Termination   │
                        │  • Load Balancing        │
                        │  • Rate Limiting         │
                        │  • WebSocket Support     │
                        │  • Caching               │
                        │  • Security Headers      │
                        └──────────┬───────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │   Frontend   │  │     BFF      │  │  AI Service  │
         │   (Vue3)     │  │  (NestJS)    │  │  (FastAPI)   │
         │   Port 80    │  │  Port 3001   │  │  Port 8000   │
         └──────────────┘  └──────┬───────┘  └──────┬───────┘
                                  │                  │
                    ┌─────────────┼──────────────────┤
                    │             │                  │
                    ▼             ▼                  ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │  PostgreSQL  │  │    Redis     │  │    Ollama    │
            │  Port 5432   │  │  Port 6379   │  │  Port 11434  │
            └──────────────┘  └──────────────┘  └──────────────┘
```

## Request Flow

### 1. Static Assets (Frontend)

```
Client Request: https://domain.com/assets/app.js
                        │
                        ▼
                  Nginx Proxy
                        │
                        ├─ Check cache
                        ├─ Add cache headers (1 year)
                        ├─ Enable gzip
                        │
                        ▼
                  Frontend Container
                        │
                        ▼
                  Return asset
```

### 2. API Requests

```
Client Request: https://domain.com/api/workflows
                        │
                        ▼
                  Nginx Proxy
                        │
                        ├─ Rate limiting check (100 req/s)
                        ├─ Connection limiting (10 concurrent)
                        ├─ Add security headers
                        ├─ Check API cache (5 min)
                        │
                        ▼
                  Load Balancer
                        │
                        ├─ Health check
                        ├─ Least connections algorithm
                        │
                        ▼
                  BFF Container (NestJS)
                        │
                        ├─ JWT validation
                        ├─ Business logic
                        ├─ Database query
                        │
                        ▼
                  Return response
```

### 3. Authentication Requests

```
Client Request: https://domain.com/api/auth/login
                        │
                        ▼
                  Nginx Proxy
                        │
                        ├─ Rate limiting check (10 req/s) ⚠️ Stricter
                        ├─ Connection limiting
                        ├─ Add security headers
                        │
                        ▼
                  BFF Container (NestJS)
                        │
                        ├─ Validate credentials
                        ├─ Generate JWT token
                        │
                        ▼
                  Return token
```

### 4. WebSocket Connections

```
Client Request: wss://domain.com/socket.io
                        │
                        ▼
                  Nginx Proxy
                        │
                        ├─ Upgrade to WebSocket
                        ├─ Set Connection: upgrade
                        ├─ Long timeout (7 days)
                        ├─ Disable buffering
                        │
                        ▼
                  BFF Container (NestJS)
                        │
                        ├─ Socket.io handler
                        ├─ Real-time events
                        │
                        ▼
                  Bidirectional communication
```

### 5. Workflow Execution

```
Client Request: POST https://domain.com/api/executions
                        │
                        ▼
                  Nginx Proxy
                        │
                        ├─ Rate limiting (20 req/s)
                        ├─ Disable buffering (streaming)
                        ├─ Extended timeout (300s)
                        │
                        ▼
                  BFF Container
                        │
                        ├─ Validate workflow
                        ├─ Create execution record
                        │
                        ▼
                  AI Service Container
                        │
                        ├─ Execute workflow
                        ├─ Call Ollama
                        ├─ Stream results
                        │
                        ▼
                  WebSocket updates to client
```

## Load Balancing Architecture

### Single Instance (Default)

```
                  Nginx
                    │
                    ▼
              ┌──────────┐
              │   BFF    │
              └──────────┘
```

### Multiple Instances (Scaled)

```
                  Nginx
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
   ┌────────┐  ┌────────┐  ┌────────┐
   │ BFF-1  │  │ BFF-2  │  │ BFF-3  │
   └────────┘  └────────┘  └────────┘
        │           │           │
        └───────────┼───────────┘
                    │
                    ▼
              ┌──────────┐
              │PostgreSQL│
              └──────────┘
```

**Load Balancing Algorithm:** Least Connections

- Routes to server with fewest active connections
- Best for long-running requests
- Automatic failover on health check failure

## SSL/TLS Architecture

### Development (Self-Signed)

```
Client ──HTTPS──> Nginx ──HTTP──> Backend Services
         (TLS)            (Plain)

Certificate: Self-signed
Validation: Browser warning (expected)
Use case: Local development
```

### Production (Let's Encrypt)

```
Client ──HTTPS──> Nginx ──HTTP──> Backend Services
         (TLS)            (Plain)

Certificate: Let's Encrypt
Validation: Trusted CA
Auto-renewal: Every 12 hours
Use case: Production deployment
```

### SSL Termination Benefits

1. **Simplified Backend:** Services don't need SSL configuration
2. **Centralized Management:** Single point for certificate management
3. **Performance:** SSL/TLS handled by optimized nginx
4. **Flexibility:** Easy to update SSL configuration

## Security Layers

```
┌─────────────────────────────────────────────────┐
│ Layer 1: Network (Firewall)                    │
│ • Only ports 80/443 exposed                    │
│ • Internal network for services                │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ Layer 2: Nginx (Reverse Proxy)                 │
│ • Rate limiting                                 │
│ • Connection limiting                           │
│ • Request size limits                           │
│ • Security headers                              │
│ • SSL/TLS termination                           │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ Layer 3: Application (BFF)                     │
│ • JWT authentication                            │
│ • Authorization checks                          │
│ • Input validation                              │
│ • Business logic                                │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ Layer 4: Data (Database)                       │
│ • Access control                                │
│ • Encryption at rest                            │
│ • Audit logging                                 │
└─────────────────────────────────────────────────┘
```

## Caching Strategy

### Static Assets

```
Request: /assets/app.js
         │
         ▼
    Nginx Cache
         │
    ┌────┴────┐
    │         │
  Hit?      Miss?
    │         │
    ▼         ▼
 Return   Fetch from
 Cached   Frontend
 (Fast)      │
             ▼
          Cache it
          (1 year)
```

### API Responses

```
Request: GET /api/workflows
         │
         ▼
    Nginx Cache
         │
    ┌────┴────┐
    │         │
  Hit?      Miss?
    │         │
    ▼         ▼
 Return   Fetch from
 Cached    BFF
 (5 min)     │
             ▼
          Cache it
          (5 min)
```

**Cache Bypass:**

- POST/PUT/DELETE requests
- Authenticated requests with Cache-Control header
- Real-time endpoints (/socket.io, /api/executions)

## High Availability Setup

### Active-Active Configuration

```
                    DNS Load Balancer
                            │
                ┌───────────┼───────────┐
                │                       │
                ▼                       ▼
         ┌──────────┐            ┌──────────┐
         │ Nginx-1  │            │ Nginx-2  │
         └────┬─────┘            └────┬─────┘
              │                       │
              └───────────┬───────────┘
                          │
                ┌─────────┼─────────┐
                │         │         │
                ▼         ▼         ▼
           ┌────────┬────────┬────────┐
           │ BFF-1  │ BFF-2  │ BFF-3  │
           └────────┴────────┴────────┘
```

**Benefits:**

- No single point of failure
- Horizontal scaling
- Zero-downtime deployments
- Geographic distribution

## Monitoring Points

```
┌─────────────────────────────────────────────────┐
│ Nginx Metrics                                   │
│ • Request rate                                  │
│ • Response time                                 │
│ • Error rate (4xx, 5xx)                        │
│ • Active connections                            │
│ • Cache hit ratio                               │
│ • Upstream health                               │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ Application Metrics                             │
│ • API latency                                   │
│ • Database query time                           │
│ • Queue depth                                   │
│ • Error logs                                    │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ Infrastructure Metrics                          │
│ • CPU usage                                     │
│ • Memory usage                                  │
│ • Disk I/O                                      │
│ • Network traffic                               │
└─────────────────────────────────────────────────┘
```

## Deployment Workflow

### Development

```
1. Generate self-signed cert
   └─> ./scripts/generate-self-signed-cert.sh

2. Start services
   └─> make -f Makefile.nginx start

3. Access application
   └─> https://localhost
```

### Production

```
1. Configure domain
   └─> Edit .env.nginx

2. Initialize Let's Encrypt
   └─> ./scripts/init-letsencrypt.sh

3. Start services
   └─> make -f Makefile.nginx start

4. Verify SSL
   └─> curl https://domain.com/health

5. Monitor
   └─> make -f Makefile.nginx health
```

## Performance Characteristics

### Throughput

- **Static Assets:** ~10,000 req/s (cached)
- **API Requests:** ~1,000 req/s (with backend)
- **WebSocket:** ~10,000 concurrent connections

### Latency

- **Static Assets:** <1ms (cached)
- **API Requests:** 10-50ms (+ backend time)
- **WebSocket:** <5ms (upgrade)

### Resource Usage

- **CPU:** 0.25-1 core (typical)
- **Memory:** 128-512MB (typical)
- **Network:** Depends on traffic

## Scalability

### Vertical Scaling

```
Increase nginx resources:
- More CPU cores → More worker processes
- More RAM → Larger cache
- Faster disk → Better logging
```

### Horizontal Scaling

```
Add more nginx instances:
- DNS load balancing
- Multiple nginx containers
- Geographic distribution
```

### Backend Scaling

```
Scale backend services:
- docker-compose up -d --scale bff=3
- Nginx automatically distributes load
- Health checks ensure reliability
```

## Conclusion

The Nginx reverse proxy provides:

✅ **Single Entry Point:** Unified access to all services
✅ **Security:** SSL/TLS, rate limiting, security headers
✅ **Performance:** Caching, compression, connection pooling
✅ **Reliability:** Load balancing, health checks, failover
✅ **Scalability:** Horizontal and vertical scaling support
✅ **Flexibility:** Easy configuration and management

This architecture supports both development and production deployments with minimal configuration changes.
