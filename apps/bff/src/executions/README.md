# Executions Module

This module handles workflow execution management, including triggering executions, monitoring status, and managing execution logs.

## Features

### 1. Execution Management

- **Create Execution**: Trigger a new workflow execution
- **List Executions**: Get all executions with filtering by workflow and status
- **Get Execution**: Retrieve detailed execution information
- **Stop Execution**: Stop a running execution

### 2. AI Service Integration

- **AI Service Client**: HTTP client for communicating with the Python AI Service
- **Retry Logic**: Automatic retry with exponential backoff
- **Error Handling**: Comprehensive error handling and logging
- **Health Check**: Monitor AI Service availability

### 3. Real-time Updates (WebSocket)

- **Subscribe/Unsubscribe**: Subscribe to execution updates
- **Status Updates**: Real-time execution status changes
- **Log Streaming**: Real-time log messages
- **Node Updates**: Individual node execution updates
- **Progress Updates**: Execution progress tracking
- **Error Notifications**: Real-time error notifications

### 4. Execution Logs

- **Log Storage**: Store execution logs in database
- **Log Filtering**: Filter logs by level, node ID, and search term
- **Log Pagination**: Paginated log retrieval
- **Log Streaming**: Stream logs from a specific timestamp
- **Log Statistics**: Get log counts grouped by level

## API Endpoints

### Executions

```
POST   /executions              Create and trigger a new execution
GET    /executions              Get all executions (with filters)
GET    /executions/:id          Get execution details
POST   /executions/:id/stop     Stop a running execution
```

### Execution Logs

```
GET    /executions/:id/logs           Get execution logs (with filters)
GET    /executions/:id/logs/stream    Stream logs from timestamp
GET    /executions/:id/logs/stats     Get log statistics
```

## WebSocket Events

### Client -> Server

```typescript
// Subscribe to execution updates
socket.emit('subscribe', executionId)

// Unsubscribe from execution updates
socket.emit('unsubscribe', executionId)
```

### Server -> Client

```typescript
// Status update
socket.on('status', (data) => {
  // { executionId, status, metadata, timestamp }
})

// Log message
socket.on('log', (data) => {
  // { executionId, level, message, nodeId, metadata, timestamp }
})

// Execution result
socket.on('result', (data) => {
  // { executionId, result, timestamp }
})

// Execution error
socket.on('error', (data) => {
  // { executionId, error, metadata, timestamp }
})

// Node update
socket.on('node-update', (data) => {
  // { executionId, nodeId, status, data, timestamp }
})

// Progress update
socket.on('progress', (data) => {
  // { executionId, current, total, percentage, message, timestamp }
})
```

## Usage Examples

### Trigger Execution

```typescript
const execution = await executionsService.create(userId, {
  workflowId: 'workflow-id',
  inputData: { input: 'Hello World' },
})
```

### Subscribe to Execution Updates

```typescript
import { io } from 'socket.io-client'

const socket = io('http://localhost:3001/executions', {
  auth: { token: accessToken },
})

socket.emit('subscribe', executionId)

socket.on('status', (data) => {
  console.log('Status:', data.status)
})

socket.on('log', (data) => {
  console.log('Log:', data.message)
})

socket.on('result', (data) => {
  console.log('Result:', data.result)
})
```

### Get Execution Logs

```typescript
const logs = await executionsService.getLogs(userId, executionId, {
  level: 'error',
  limit: 50,
  offset: 0,
  search: 'failed',
})
```

## Architecture

```
┌─────────────────┐
│   Controller    │  HTTP/REST API
└────────┬────────┘
         │
┌────────▼────────┐
│    Service      │  Business Logic
└────┬───────┬────┘
     │       │
     │       └──────────┐
     │                  │
┌────▼────────┐  ┌──────▼──────┐
│   Prisma    │  │ AI Service  │
│   Service   │  │   Client    │
└─────────────┘  └─────────────┘
     │                  │
┌────▼────────┐  ┌──────▼──────┐
│  Database   │  │ AI Service  │
│ PostgreSQL  │  │   (Python)  │
└─────────────┘  └─────────────┘

┌─────────────────┐
│    Gateway      │  WebSocket
└────────┬────────┘
         │
    Socket.IO
         │
┌────────▼────────┐
│    Clients      │
└─────────────────┘
```

## Configuration

Environment variables:

```env
# AI Service
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TIMEOUT=300000  # 5 minutes
AI_SERVICE_MAX_RETRIES=3

# JWT (for WebSocket authentication)
JWT_SECRET=your-secret-key
```

## Error Handling

The module implements comprehensive error handling:

1. **Validation Errors**: Invalid input data
2. **Not Found Errors**: Execution or workflow not found
3. **Permission Errors**: User doesn't have access
4. **AI Service Errors**: Communication failures with AI Service
5. **Database Errors**: Database operation failures

All errors are logged and appropriate HTTP status codes are returned.

## Testing

```bash
# Unit tests
pnpm test executions.service.spec.ts

# E2E tests
pnpm test:e2e executions.e2e-spec.ts
```

## Future Enhancements

- [ ] Execution scheduling (cron-like)
- [ ] Execution retry policies
- [ ] Execution templates
- [ ] Execution analytics and metrics
- [ ] Execution cost tracking
- [ ] Execution rate limiting
- [ ] Execution priority queues
