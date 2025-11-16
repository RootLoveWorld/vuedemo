# Guards and Authorization

This directory contains guards for implementing authorization and access control in the AI Workflow Platform.

## Available Guards

### 1. JwtAuthGuard

Located in: `apps/bff/src/auth/guards/jwt-auth.guard.ts`

Validates JWT tokens and ensures the user is authenticated.

**Usage:**

```typescript
@UseGuards(JwtAuthGuard)
@Get('protected')
async protectedRoute(@CurrentUser() user: CurrentUserData) {
  // Only authenticated users can access this
}
```

### 2. TenantGuard

Located in: `tenant.guard.ts`

Ensures that a tenant context is present in the request.

**Usage:**

```typescript
@UseGuards(JwtAuthGuard, TenantGuard)
@Get('workflows')
async getWorkflows() {
  // Tenant context is guaranteed to be present
}
```

### 3. PermissionsGuard

Located in: `permissions.guard.ts`

Checks if the user has specific permissions to perform an action.

**Usage:**

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('workflow:create', 'workflow:update')
@Post('workflows')
async createWorkflow() {
  // Only users with workflow:create AND workflow:update permissions can access
}
```

**Permission Format:**
Permissions follow the format: `resource:action`

Examples:

- `workflow:create`
- `workflow:read`
- `workflow:update`
- `workflow:delete`
- `workflow:execute`
- `execution:read`
- `execution:stop`
- `plugin:install`

### 4. RolesGuard

Located in: `roles.guard.ts`

Checks if the user has a specific role.

**Usage:**

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('admin', 'editor')
@Delete('workflows/:id')
async deleteWorkflow() {
  // Only users with 'admin' OR 'editor' role can access
}
```

**Available Roles:**

- `admin`: Full access to all resources
- `editor`: Can create, read, update, delete, and execute workflows
- `user`: Can create, read, update, and execute workflows (default)
- `viewer`: Can only read workflows and executions

### 5. ResourceOwnerGuard

Located in: `resource-owner.guard.ts`

Checks if the user is the owner of a resource or has admin role.

**Usage:**

```typescript
@UseGuards(JwtAuthGuard, ResourceOwnerGuard)
@Put('workflows/:id')
async updateWorkflow(@Param('id') id: string) {
  // Only the workflow owner or admin can update
}
```

**Supported Resources:**

- `workflow`: Checks if user owns the workflow
- `execution`: Checks if user owns the execution

## Guard Combinations

Guards can be combined for fine-grained access control:

### Example 1: Authenticated + Tenant Context

```typescript
@UseGuards(JwtAuthGuard, TenantGuard)
@Get('workflows')
async getWorkflows() {
  // User must be authenticated and have tenant context
}
```

### Example 2: Authenticated + Specific Permission

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('workflow:delete')
@Delete('workflows/:id')
async deleteWorkflow() {
  // User must be authenticated and have workflow:delete permission
}
```

### Example 3: Authenticated + Resource Owner

```typescript
@UseGuards(JwtAuthGuard, ResourceOwnerGuard)
@Put('workflows/:id')
async updateWorkflow() {
  // User must be authenticated and own the resource
}
```

### Example 4: Authenticated + Role + Permission

```typescript
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@RequireRoles('admin', 'editor')
@RequirePermissions('workflow:execute')
@Post('workflows/:id/execute')
async executeWorkflow() {
  // User must be authenticated, have admin/editor role, and workflow:execute permission
}
```

## Decorators

### @Public()

Marks a route as public (bypasses JwtAuthGuard).

```typescript
@Public()
@Get('health')
health() {
  return { status: 'ok' }
}
```

### @RequirePermissions(...permissions)

Specifies required permissions for a route.

```typescript
@RequirePermissions('workflow:create', 'workflow:read')
@Post('workflows')
async createWorkflow() {
  // Requires both permissions
}
```

### @RequireRoles(...roles)

Specifies required roles for a route.

```typescript
@RequireRoles('admin', 'editor')
@Delete('workflows/:id')
async deleteWorkflow() {
  // Requires admin OR editor role
}
```

### @BypassTenant()

Bypasses tenant filtering (for admin operations).

```typescript
@BypassTenant()
@Get('admin/all-workflows')
async getAllWorkflows() {
  // Can access workflows across all tenants
}
```

## Permission Management

Use the `PermissionsService` to manage user permissions:

```typescript
import { PermissionsService } from '../common/services'

@Injectable()
export class UserManagementService {
  constructor(private permissionsService: PermissionsService) {}

  async grantPermission(userId: string) {
    await this.permissionsService.grantPermission({
      userId,
      resource: 'workflow',
      action: 'create',
    })
  }

  async revokePermission(userId: string) {
    await this.permissionsService.revokePermission({
      userId,
      resource: 'workflow',
      action: 'create',
    })
  }

  async checkPermission(userId: string) {
    const hasPermission = await this.permissionsService.hasPermission(userId, 'workflow', 'create')
    return hasPermission
  }
}
```

## Default Permissions by Role

### Admin

- All permissions (checked in guards, not stored in database)

### Editor

- `workflow:create`
- `workflow:read`
- `workflow:update`
- `workflow:delete`
- `workflow:execute`
- `execution:read`
- `execution:stop`

### User (Default)

- `workflow:create`
- `workflow:read`
- `workflow:update`
- `workflow:execute`
- `execution:read`

### Viewer

- `workflow:read`
- `execution:read`

## Best Practices

1. **Always use JwtAuthGuard first**: It should be the first guard in the chain
2. **Combine guards appropriately**: Use multiple guards for fine-grained control
3. **Use @Public() sparingly**: Only for truly public endpoints
4. **Check resource ownership**: Use ResourceOwnerGuard for user-specific resources
5. **Admin bypass**: Admins automatically pass all permission checks
6. **Tenant isolation**: All queries are automatically filtered by tenant (unless bypassed)

## Error Responses

Guards throw appropriate HTTP exceptions:

- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User authenticated but lacks required permissions/role
- `404 Not Found`: Resource not found or user doesn't have access

## Testing Guards

```typescript
import { Test } from '@nestjs/testing'
import { PermissionsGuard } from './permissions.guard'
import { PrismaService } from '../../prisma/prisma.service'

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard
  let prisma: PrismaService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: PrismaService,
          useValue: {
            permission: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile()

    guard = module.get<PermissionsGuard>(PermissionsGuard)
    prisma = module.get<PrismaService>(PrismaService)
  })

  it('should allow admin users', async () => {
    // Test implementation
  })
})
```
