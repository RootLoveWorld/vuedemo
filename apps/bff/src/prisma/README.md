# Prisma Service with Multi-Tenancy

This directory contains the Prisma service implementation with built-in multi-tenancy support.

## Features

- **Automatic Tenant Filtering**: Queries are automatically filtered by tenant ID
- **Tenant Middleware**: Extracts tenant context from requests
- **Connection Management**: Handles database connections lifecycle
- **Query Logging**: Logs queries in development mode
- **Statistics**: Provides database and tenant statistics

## Architecture

### PrismaService

The `PrismaService` extends `PrismaClient` and adds:

1. **Tenant Context Management**
   - `setTenantId(tenantId)`: Set current tenant
   - `getTenantId()`: Get current tenant
   - `clearTenantId()`: Clear tenant context

2. **Middleware for Automatic Filtering**
   - Automatically adds `tenantId` filter to queries
   - Applies to: User, Workflow, Execution models
   - Supports all CRUD operations

3. **Utility Methods**
   - `withoutTenantFilter()`: Execute queries without tenant filtering
   - `withTenant()`: Execute queries with specific tenant
   - `getDatabaseStats()`: Get overall database statistics
   - `getTenantStats()`: Get tenant-specific statistics

### TenantMiddleware

Extracts tenant ID from:

1. `X-Tenant-Id` header
2. Subdomain (e.g., `tenant1.example.com`)
3. Authenticated user's tenant

### TenantGuard

Ensures tenant context is present for protected routes.

## Usage

### Basic Usage

```typescript
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class WorkflowsService {
  constructor(private prisma: PrismaService) {}

  // Automatically filtered by tenant
  async findAll() {
    return this.prisma.workflow.findMany()
  }

  // Tenant ID is automatically added
  async create(data: any) {
    return this.prisma.workflow.create({ data })
  }
}
```

### Using Tenant Decorator

```typescript
import { Controller, Get } from '@nestjs/common'
import { TenantId } from '../common/decorators/tenant.decorator'

@Controller('workflows')
export class WorkflowsController {
  @Get()
  findAll(@TenantId() tenantId: string) {
    console.log('Current tenant:', tenantId)
    // ...
  }
}
```

### Admin Operations (Cross-Tenant)

```typescript
// Execute query without tenant filtering
async getAllWorkflows() {
  return this.prisma.withoutTenantFilter(async () => {
    return this.prisma.workflow.findMany()
  })
}

// Execute query for specific tenant
async getWorkflowsForTenant(tenantId: string) {
  return this.prisma.withTenant(tenantId, async () => {
    return this.prisma.workflow.findMany()
  })
}
```

### Setting Up Middleware

In your `app.module.ts`:

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'
import { TenantMiddleware } from './common/middleware/tenant.middleware'

@Module({
  // ...
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*') // Apply to all routes
  }
}
```

### Using Tenant Guard

```typescript
import { Controller, UseGuards } from '@nestjs/common'
import { TenantGuard } from '../common/guards/tenant.guard'

@Controller('workflows')
@UseGuards(TenantGuard)
export class WorkflowsController {
  // All routes require tenant context
}
```

## Multi-Tenancy Strategy

### Data Isolation

- **Logical Separation**: All tenant data is in the same database but logically separated
- **Automatic Filtering**: Middleware ensures queries are scoped to current tenant
- **Foreign Keys**: All tenant-scoped models have `tenantId` foreign key

### Tenant Identification

1. **Header-based**: `X-Tenant-Id: <tenant-id>`
2. **Subdomain-based**: `https://tenant1.example.com`
3. **User-based**: From authenticated user's tenant

### Security Considerations

1. **Always validate tenant access**: Ensure users can only access their tenant's data
2. **Use guards**: Apply `TenantGuard` to protected routes
3. **Admin operations**: Use `withoutTenantFilter()` carefully
4. **Audit logging**: Log all cross-tenant operations

## Database Models

### Tenant-Scoped Models

These models are automatically filtered by tenant:

- `User`
- `Workflow`
- `Execution`

### Global Models

These models are not filtered by tenant:

- `Tenant`
- `Permission`
- `WorkflowVersion`
- `ExecutionLog`

## Statistics and Monitoring

### Database Statistics

```typescript
const stats = await this.prisma.getDatabaseStats()
// Returns: { tenants, users, workflows, executions }
```

### Tenant Statistics

```typescript
const stats = await this.prisma.getTenantStats(tenantId)
// Returns: {
//   users,
//   workflows,
//   executions,
//   activeWorkflows,
//   completedExecutions,
//   failedExecutions
// }
```

## Testing

### Clean Database (Test Only)

```typescript
await this.prisma.cleanDatabase()
```

⚠️ **Warning**: This will delete all data! Only use in test environment.

### Test with Different Tenants

```typescript
describe('Multi-tenant tests', () => {
  it('should isolate tenant data', async () => {
    // Create data for tenant 1
    await prisma.withTenant('tenant-1', async () => {
      await prisma.workflow.create({ data: { name: 'Workflow 1' } })
    })

    // Create data for tenant 2
    await prisma.withTenant('tenant-2', async () => {
      await prisma.workflow.create({ data: { name: 'Workflow 2' } })
    })

    // Verify isolation
    const tenant1Workflows = await prisma.withTenant('tenant-1', async () => {
      return prisma.workflow.findMany()
    })
    expect(tenant1Workflows).toHaveLength(1)
  })
})
```

## Best Practices

1. **Always set tenant context**: Use middleware or manually set tenant ID
2. **Use decorators**: Leverage `@TenantId()` for easy access
3. **Validate tenant access**: Check user belongs to tenant before operations
4. **Log tenant operations**: Track all tenant-related activities
5. **Test isolation**: Ensure tenant data is properly isolated
6. **Handle missing tenant**: Gracefully handle requests without tenant context
7. **Admin operations**: Document and audit all cross-tenant queries

## Troubleshooting

### "Tenant context is required" error

- Ensure `TenantMiddleware` is applied
- Check that tenant ID is present in request (header, subdomain, or user)
- Verify user is authenticated if using user-based tenant identification

### Queries returning empty results

- Check if tenant ID is correctly set
- Verify the data belongs to the current tenant
- Use `withoutTenantFilter()` to check if data exists in database

### Cross-tenant data leakage

- Review all queries using `withoutTenantFilter()`
- Ensure guards are applied to all protected routes
- Audit logs for suspicious cross-tenant access
