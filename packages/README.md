# Shared Packages

This directory contains shared TypeScript packages used by both the frontend (Vue3) and BFF (NestJS) layers of the AI Workflow Platform.

## Packages

### @workflow/shared-types

TypeScript type definitions for the entire platform.

**Exports:**

- User types (User, CreateUserDto, UpdateUserDto, LoginDto, RegisterDto, AuthResponse)
- Node types (NodeType, FlowNode, FlowEdge, various node configs)
- Workflow types (WorkflowDefinition, Workflow, CreateWorkflowDto, UpdateWorkflowDto)
- Execution types (ExecutionStatus, Execution, ExecutionLog, ExecutionResult)
- API types (ApiResponse, PaginatedResponse, WebSocket events)

**Usage:**

```typescript
import type { WorkflowDefinition, FlowNode, ExecutionStatus } from '@workflow/shared-types'
```

### @workflow/shared-constants

Constant definitions for node types, status codes, and error codes.

**Exports:**

- NODE_TYPES, NODE_CATEGORIES, NODE_TYPE_METADATA, DEFAULT_NODE_CONFIGS
- EXECUTION_STATUS, NODE_EXECUTION_STATUS, LOG_LEVEL, WORKFLOW_STATUS
- HTTP_STATUS, WEBSOCKET_EVENTS
- ERROR_CODES, ERROR_MESSAGES

**Usage:**

```typescript
import { NODE_TYPES, EXECUTION_STATUS, ERROR_CODES } from '@workflow/shared-constants'
```

### @workflow/shared-utils

Utility functions for common operations.

**Exports:**

- Date utilities (formatDateISO, formatRelativeTime, formatDuration, etc.)
- Validation utilities (isEmpty, isValidEmail, isValidUUID, validatePassword, etc.)
- Format utilities (formatFileSize, truncate, capitalize, deepClone, debounce, throttle, etc.)

**Usage:**

```typescript
import { formatRelativeTime, isValidEmail, debounce } from '@workflow/shared-utils'
```

### @workflow/shared-validators

Zod validation schemas for runtime validation.

**Exports:**

- Node schemas (flowNodeSchema, flowEdgeSchema, various node config schemas)
- Workflow schemas (workflowDefinitionSchema, createWorkflowDtoSchema, validateWorkflowStructure)
- Execution schemas (createExecutionDtoSchema, executionResultSchema, validateExecutionInput)
- User schemas (loginDtoSchema, registerDtoSchema, userSchema)

**Usage:**

```typescript
import { workflowDefinitionSchema, createWorkflowDtoSchema } from '@workflow/shared-validators'

// Validate data
const result = workflowDefinitionSchema.safeParse(data)
if (result.success) {
  // data is valid
}
```

## Development

### Build all packages

```bash
pnpm -r --filter "./packages/*" build
```

### Build specific package

```bash
cd packages/shared-types
pnpm build
```

### Watch mode for development

```bash
cd packages/shared-types
pnpm dev
```

## Architecture Benefits

1. **Type Safety**: End-to-end type safety between frontend and BFF
2. **Code Reuse**: Shared validation logic and utilities
3. **Consistency**: Single source of truth for types and constants
4. **Maintainability**: Changes propagate automatically through the monorepo
5. **Developer Experience**: Auto-completion and type checking across the stack
