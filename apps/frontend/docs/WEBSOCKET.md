# WebSocket Real-Time Communication

This document describes the WebSocket implementation for real-time execution monitoring in the AI Workflow Platform.

## Overview

The platform uses Socket.io for WebSocket communication between the frontend and BFF (Backend For Frontend) layer. This enables real-time updates for workflow execution status, logs, and node-level progress.

## Architecture

```
Frontend (Vue3) <---> BFF (NestJS) <---> AI Service (Python)
     |                    |
     |-- Socket.io -------|
```

## Components

### 1. useWebSocket Composable

**Location**: `src/composables/useWebSocket.ts`

A generic WebSocket composable that provides:

- Connection management
- Automatic reconnection with exponential backoff
- Event emission and listening
- Connection status tracking

**Features**:

- Auto-reconnect on disconnect (max 5 attempts)
- Reconnection delay: 1s to 5s
- Connection state tracking (`isConnected`, `isReconnecting`)
- Automatic cleanup on component unmount

**Usage**:

```typescript
const { connect, disconnect, emit, on, off, isConnected } = useWebSocket('/namespace')

connect()
on('event', (data) => console.log(data))
emit('event', { data: 'value' })
```

### 2. useExecutionWebSocket Composable

**Location**: `src/composables/useExecutionWebSocket.ts`

A specialized composable for execution monitoring that:

- Connects to the `/executions` namespace
- Subscribes to execution updates
- Handles execution status, logs, results, and errors
- Manages node-level status updates
- Auto-resubscribes on reconnection

**Events Handled**:

- `status`: Execution status updates (pending, running, completed, failed)
- `log`: Real-time execution logs
- `result`: Execution completion results
- `error`: Execution errors
- `nodeStatus`: Individual node execution status

**Usage**:

```typescript
const { initialize, subscribeToExecution, unsubscribeFromExecution } = useExecutionWebSocket()

initialize() // Connect and set up event listeners
subscribeToExecution(executionId) // Subscribe to specific execution
unsubscribeFromExecution(executionId) // Unsubscribe
```

### 3. ExecutionLogs Component

**Location**: `src/components/execution/ExecutionLogs.vue`

Displays real-time execution logs with:

- Auto-scrolling to latest log
- Log level color coding (info, warning, error)
- Connection status indicator
- Clear logs functionality
- Timestamp formatting

### 4. ExecutionStatus Component

**Location**: `src/components/execution/ExecutionStatus.vue`

Shows execution status with:

- Current execution state
- Execution metadata (ID, timestamps)
- Node-level status tracking
- Error messages
- Output data display

### 5. ExecutionsView

**Location**: `src/views/ExecutionsView.vue`

Main view for execution monitoring that:

- Initializes WebSocket connection on mount
- Provides test execution interface
- Displays real-time logs and status
- Handles execution start/stop

## WebSocket Protocol

### Connection

**Endpoint**: `ws://localhost:3001/executions`

**Authentication**: JWT token passed in auth header

```typescript
{
  auth: {
    token: 'jwt_token'
  }
}
```

### Events

#### Client → Server

**subscribe**: Subscribe to execution updates

```typescript
socket.emit('subscribe', executionId)
```

**unsubscribe**: Unsubscribe from execution updates

```typescript
socket.emit('unsubscribe', executionId)
```

#### Server → Client

**status**: Execution status update

```typescript
{
  executionId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  timestamp?: string
}
```

**log**: Execution log entry

```typescript
{
  executionId: string
  log: {
    id: string
    nodeId?: string
    level: 'info' | 'warning' | 'error'
    message: string
    metadata?: any
    createdAt: Date
  }
}
```

**result**: Execution result

```typescript
{
  executionId: string
  result: any
}
```

**error**: Execution error

```typescript
{
  executionId: string
  error: string
}
```

**nodeStatus**: Node execution status

```typescript
{
  executionId: string
  nodeId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  output?: any
}
```

## Configuration

### Environment Variables

**VITE_WS_URL**: WebSocket server URL (default: `http://localhost:3001`)

```env
VITE_WS_URL=http://localhost:3001
```

### Socket.io Options

```typescript
{
  auth: { token },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
}
```

## Error Handling

### Connection Errors

- **connect_error**: Logged and triggers reconnection
- **reconnect_error**: Logged during reconnection attempts
- **reconnect_failed**: Logged when max attempts reached

### Disconnect Handling

- **io server disconnect**: Automatically attempts to reconnect
- **io client disconnect**: Manual disconnect, no reconnection
- **ping timeout**: Triggers automatic reconnection
- **transport close**: Triggers automatic reconnection

### Reconnection Strategy

1. Initial connection attempt
2. On failure, wait 1 second
3. Retry with exponential backoff (max 5 seconds)
4. Maximum 5 attempts
5. If all fail, stop and log error

## State Management

### Execution Store

**Location**: `src/stores/execution.ts`

Manages execution state:

- `currentExecution`: Currently monitored execution
- `executionHistory`: List of past executions
- `logs`: Real-time execution logs
- `realTimeStatus`: Map of node IDs to their status

**Methods**:

- `setCurrentExecution(execution)`: Set current execution
- `addLog(log)`: Add log entry
- `clearLogs()`: Clear all logs
- `updateNodeStatus(nodeId, status)`: Update node status
- `updateExecutionStatus(executionId, status)`: Update execution status
- `setExecutionResult(executionId, result)`: Set execution result
- `setExecutionError(executionId, error)`: Set execution error

## Testing

### Manual Testing

1. Start the frontend dev server:

```bash
cd apps/frontend
pnpm dev
```

2. Navigate to `/executions`

3. Enter a workflow ID and input data

4. Click "Start Execution"

5. Observe real-time logs and status updates

### Connection Status

The UI displays connection status:

- 🟢 **Connected**: Green indicator with pulse animation
- 🟡 **Reconnecting**: Yellow indicator with pulse animation
- 🔴 **Disconnected**: Red indicator (static)

## Best Practices

1. **Always initialize WebSocket on component mount**

```typescript
onMounted(() => {
  initialize()
})
```

2. **Always cleanup on unmount**

```typescript
onUnmounted(() => {
  cleanup()
})
```

3. **Subscribe after execution starts**

```typescript
const execution = await executionsApi.execute(data)
subscribeToExecution(execution.id)
```

4. **Unsubscribe when done**

```typescript
unsubscribeFromExecution(executionId)
```

5. **Handle reconnection gracefully**

- The composable automatically resubscribes on reconnection
- UI should show reconnection status to users

## Troubleshooting

### WebSocket not connecting

1. Check VITE_WS_URL environment variable
2. Verify BFF server is running
3. Check browser console for errors
4. Verify JWT token is valid

### Not receiving updates

1. Verify subscription was successful
2. Check if execution ID is correct
3. Verify BFF is emitting events
4. Check browser network tab for WebSocket frames

### Reconnection issues

1. Check network connectivity
2. Verify max reconnection attempts not exceeded
3. Check server logs for connection errors
4. Try manual reconnection

## Future Enhancements

- [ ] Add heartbeat/ping mechanism
- [ ] Implement message queuing for offline mode
- [ ] Add compression for large payloads
- [ ] Implement binary protocol for efficiency
- [ ] Add metrics for connection quality
- [ ] Implement room-based broadcasting for multi-user scenarios
