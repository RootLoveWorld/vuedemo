# Authentication and Authorization Implementation

This document summarizes the implementation of Task 11: 认证授权模块 (Authentication and Authorization Module).

## Overview

A complete JWT-based authentication and authorization system has been implemented for the AI Workflow Platform BFF layer, including:

- User registration and login
- JWT token generation and validation
- Multi-tenant support with automatic tenant creation
- Role-based access control (RBAC)
- Permission-based access control
- Resource ownership verification
- Tenant isolation middleware

## Implemented Components

### 1. Auth Module (Task 11.1)

#### Location: `apps/bff/src/auth/`

#### Components:

- **AuthService** (`auth.service.ts`): Core authentication logic
  - User registration with automatic tenant creation
  - Login with email/password validation
  - JWT token generation (access + refresh tokens)
  - Token refresh mechanism
  - Password change functionality
  - Profile management

- **AuthController** (`auth.controller.ts`): REST API endpoints
  - `POST /auth/register` - User registration
  - `POST /auth/login` - User login
  - `POST /auth/refresh` - Token refresh
  - `GET /auth/profile` - Get user profile
  - `PUT /auth/profile` - Update user profile
  - `POST /auth/change-password` - Change password
  - `POST /auth/logout` - Logout (client-side)

- **Strategies**:
  - **JwtStrategy** (`strategies/jwt.strategy.ts`): Validates JWT tokens
  - **LocalStrategy** (`strategies/local.strategy.ts`): Validates email/password

- **Guards**:
  - **JwtAuthGuard** (`guards/jwt-auth.guard.ts`): Protects routes requiring authentication
  - **LocalAuthGuard** (`guards/local-auth.guard.ts`): Used for login endpoint

- **Decorators**:
  - **@Public()** (`decorators/public.decorator.ts`): Marks routes as public
  - **@CurrentUser()** (`decorators/current-user.decorator.ts`): Injects authenticated user

- **DTOs**:
  - **RegisterDto** (`dto/register.dto.ts`): Registration request validation
  - **LoginDto** (`dto/login.dto.ts`): Login request validation

### 2. Permissions System (Task 11.2)

#### Location: `apps/bff/src/common/guards/` and `apps/bff/src/common/services/`

#### Components:

- **PermissionsGuard** (`guards/permissions.guard.ts`): Checks user permissions
  - Validates user has required permissions
  - Admin users bypass all checks
  - Uses `@RequirePermissions()` decorator

- **RolesGuard** (`guards/roles.guard.ts`): Checks user roles
  - Validates user has required role
  - Uses `@RequireRoles()` decorator
  - Supports multiple roles (OR logic)

- **ResourceOwnerGuard** (`guards/resource-owner.guard.ts`): Verifies resource ownership
  - Checks if user owns the resource
  - Admin users can access all resources
  - Supports workflows and executions

- **PermissionsService** (`services/permissions.service.ts`): Manages permissions
  - Grant/revoke permissions
  - Check user permissions
  - Initialize default permissions by role
  - Bulk permission operations

#### Permission Format:

Permissions follow the pattern: `resource:action`

Examples:

- `workflow:create`
- `workflow:read`
- `workflow:update`
- `workflow:delete`
- `workflow:execute`
- `execution:read`
- `execution:stop`

#### Default Roles:

- **admin**: Full access (all permissions)
- **editor**: Can manage and execute workflows
- **user**: Can create and execute workflows (default)
- **viewer**: Read-only access

### 3. Tenant Middleware (Task 11.3)

#### Location: `apps/bff/src/common/middleware/`

#### Components:

- **TenantMiddleware** (`middleware/tenant.middleware.ts`): Extracts tenant context
  - Extracts tenant from authenticated user (preferred)
  - Extracts tenant from X-Tenant-Id header
  - Extracts tenant from subdomain
  - Sets tenant context in PrismaService for automatic filtering
  - Validates tenant is active

- **TenantContextInterceptor** (`interceptors/tenant-context.interceptor.ts`): Ensures tenant context
  - Runs after authentication
  - Sets tenant context from authenticated user
  - Ensures consistency across request lifecycle

- **TenantGuard** (`guards/tenant.guard.ts`): Validates tenant context
  - Ensures tenant ID is present
  - Can be bypassed with `@NoTenant()` decorator

#### Tenant Isolation:

- **PrismaService** (`prisma/prisma.service.ts`): Enhanced with tenant filtering
  - Automatic tenant filtering for all queries
  - `setTenantId()`: Set current tenant
  - `getTenantId()`: Get current tenant
  - `clearTenantId()`: Clear tenant (admin operations)
  - `withoutTenantFilter()`: Execute query without filtering
  - `withTenant()`: Execute query with specific tenant

## Database Schema

The Prisma schema includes:

```prisma
model Tenant {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users      User[]
  workflows  Workflow[]
  executions Execution[]
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  role      String   @default("user")
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id])

  workflows   Workflow[]
  executions  Execution[]
  permissions Permission[]
}

model Permission {
  id        String   @id @default(uuid())
  resource  String
  action    String
  createdAt DateTime @default(now())

  userId String
  user   User   @relation(fields: [userId], references: [id])

  @@unique([userId, resource, action])
}
```

## Configuration

### Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
JWT_REFRESH_EXPIRES_IN=7d
```

### Dependencies Added

```json
{
  "dependencies": {
    "@nestjs/passport": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "passport-jwt": "^4.0.1",
    "bcrypt": "^5.1.1"
  },
  "devDependencies": {
    "@types/passport-local": "^1.0.38",
    "@types/passport-jwt": "^4.0.1",
    "@types/bcrypt": "^5.0.2"
  }
}
```

## Integration

### App Module Configuration

The `AppModule` has been updated to:

1. Import `AuthModule` for authentication
2. Import `CommonModule` for guards and services
3. Apply `TenantMiddleware` to all routes (except public auth endpoints)

```typescript
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, CommonModule, AuthModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
        { path: 'health', method: RequestMethod.GET }
      )
      .forRoutes('*')
  }
}
```

## Usage Examples

### Protecting a Route

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards'
import { CurrentUser, CurrentUserData } from '../auth/decorators'

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  @Get()
  async findAll(@CurrentUser() user: CurrentUserData) {
    // User is authenticated, tenant context is set
    // Prisma queries are automatically filtered by tenant
    return this.workflowsService.findAll()
  }
}
```

### Using Permission Guards

```typescript
@Controller('workflows')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkflowsController {
  @Post()
  @RequirePermissions('workflow:create')
  async create(@Body() dto: CreateWorkflowDto) {
    // Only users with workflow:create permission can access
    return this.workflowsService.create(dto)
  }

  @Delete(':id')
  @RequirePermissions('workflow:delete')
  @UseGuards(ResourceOwnerGuard)
  async delete(@Param('id') id: string) {
    // User must have workflow:delete permission AND own the resource
    return this.workflowsService.delete(id)
  }
}
```

### Using Role Guards

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('admin')
export class AdminController {
  @Get('users')
  async getAllUsers() {
    // Only admin users can access
    return this.usersService.findAll()
  }
}
```

## Security Features

1. **Password Security**:
   - Passwords hashed with bcrypt (10 salt rounds)
   - Never returned in API responses

2. **Token Security**:
   - Short-lived access tokens (15 minutes)
   - Long-lived refresh tokens (7 days)
   - Tokens validated on every request

3. **Tenant Isolation**:
   - Automatic tenant filtering in database queries
   - Users can only access resources in their tenant
   - Tenant validation on every request

4. **Permission Checks**:
   - Fine-grained permission system
   - Role-based access control
   - Resource ownership verification

5. **Input Validation**:
   - DTOs with class-validator
   - Email format validation
   - Password strength requirements (min 8 characters)

## Testing

To test the authentication system:

```bash
# Start the BFF server
cd apps/bff
pnpm run start:dev

# Register a new user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Get profile (use access_token from login response)
curl -X GET http://localhost:3001/auth/profile \
  -H "Authorization: Bearer <access_token>"
```

## Next Steps

1. **Database Migration**: Run `pnpm prisma migrate dev` to apply schema changes
2. **Seed Data**: Create seed script for default roles and permissions
3. **Unit Tests**: Add tests for AuthService, guards, and middleware
4. **Integration Tests**: Add E2E tests for authentication flows
5. **API Documentation**: Generate Swagger/OpenAPI documentation
6. **Rate Limiting**: Add rate limiting for auth endpoints
7. **Token Blacklisting**: Implement token blacklist for logout (optional)
8. **2FA Support**: Add two-factor authentication (future enhancement)

## Documentation

- **Auth Module**: `apps/bff/src/auth/README.md`
- **Guards**: `apps/bff/src/common/guards/README.md`
- **This Document**: `apps/bff/AUTHENTICATION_IMPLEMENTATION.md`

## Status

✅ Task 11.1: 创建Auth Module - **COMPLETED**
✅ Task 11.2: 实现权限系统 - **COMPLETED**
✅ Task 11.3: 实现租户中间件 - **COMPLETED**
✅ Task 11: 实现认证授权模块 - **COMPLETED**

All authentication and authorization functionality has been successfully implemented and is ready for use.
