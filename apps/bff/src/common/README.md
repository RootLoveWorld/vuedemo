# Common Utilities and Middleware

This directory contains shared utilities, middleware, guards, and decorators used across the BFF application.

## Directory Structure

```
common/
├── decorators/       # Custom parameter decorators
├── filters/          # Exception filters
├── guards/           # Route guards
├── interceptors/     # Request/response interceptors
├── middleware/       # Express middleware
└── services/         # Shared services
```

## Multi-Tenancy Components

### TenantMiddleware

Extracts tenant context from requests and sets it in PrismaService.

**Location**: `middleware/tenant.middleware.ts`

**Usage**:

```typescript
// In app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*')
  }
}
```

**Tenant Identification Methods**:

1. Header: `X-Tenant-Id: <tenant-id>`
2. Subdomain: `https://tenant1.example.com`
3. User: From authenticated user's `tenantId`

### TenantGuard

Ensures tenant context is present for protected routes.

**Location**: `guards/tenant.guard.ts`

**Usage**:

```typescript
@Controller('workflows')
@UseGuards(TenantGuard)
export class WorkflowsController {
  // All routes require tenant context
}
```

### Tenant Decorators

**Location**: `decorators/tenant.decorator.ts`

#### @TenantId()

Extracts tenant ID from request.

```typescript
@Get()
findAll(@TenantId() tenantId: string) {
  console.log('Current tenant:', tenantId)
}
```

#### @CurrentTenant()

Extracts full tenant object from request.

```typescript
@Get()
findAll(@CurrentTenant() tenant: any) {
  console.log('Tenant:', tenant.name)
}
```

### TenantService

Service for managing tenant operations.

**Location**: `services/tenant.service.ts`

**Methods**:

- `create(dto)` - Create new tenant
- `findAll()` - Get all tenants
- `findOne(id)` - Get tenant by ID
- `findBySlug(slug)` - Get tenant by slug
- `update(id, dto)` - Update tenant
- `remove(id)` - Soft delete tenant
- `hardDelete(id)` - Permanently delete tenant
- `getStats(id)` - Get tenant statistics
- `getAllWithStats()` - Get all tenants with stats

**Usage**:

```typescript
@Injectable()
export class MyService {
  constructor(private tenantService: TenantService) {}

  async getTenantInfo(tenantId: string) {
    return this.tenantService.getStats(tenantId)
  }
}
```

## Existing Components

### Exception Filters

#### HttpExceptionFilter

**Location**: `filters/http-exception.filter.ts`

Formats HTTP exceptions with consistent structure.

**Usage**:

```typescript
@UseFilters(HttpExceptionFilter)
@Controller()
export class MyController {}
```

### Interceptors

#### LoggingInterceptor

**Location**: `interceptors/logging.interceptor.ts`

Logs incoming requests and outgoing responses.

#### TransformInterceptor

**Location**: `interceptors/transform.interceptor.ts`

Transforms response data to consistent format.

**Usage**:

```typescript
@UseInterceptors(TransformInterceptor)
@Controller()
export class MyController {}
```

## Best Practices

### Multi-Tenancy

1. **Always apply TenantMiddleware** to routes that need tenant context
2. **Use TenantGuard** for routes that require tenant validation
3. **Use @TenantId() decorator** instead of manually extracting from request
4. **Document cross-tenant operations** when using `withoutTenantFilter()`
5. **Test tenant isolation** to ensure data doesn't leak between tenants

### Error Handling

1. **Use custom exceptions** for domain-specific errors
2. **Apply HttpExceptionFilter** globally or per controller
3. **Log errors** with appropriate context
4. **Return consistent error format** to frontend

### Logging

1. **Use LoggingInterceptor** for request/response logging
2. **Include tenant ID** in log context
3. **Use appropriate log levels** (debug, info, warn, error)
4. **Avoid logging sensitive data** (passwords, tokens)

### Guards and Decorators

1. **Combine guards** for layered security (Auth + Tenant + Permission)
2. **Use decorators** for cleaner controller code
3. **Document custom decorators** with usage examples
4. **Test guards** to ensure proper authorization

## Adding New Components

### Adding a New Middleware

1. Create file in `middleware/` directory
2. Implement `NestMiddleware` interface
3. Register in `app.module.ts`

```typescript
// my.middleware.ts
@Injectable()
export class MyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Your logic
    next()
  }
}

// app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MyMiddleware).forRoutes('*')
  }
}
```

### Adding a New Guard

1. Create file in `guards/` directory
2. Implement `CanActivate` interface
3. Use with `@UseGuards()` decorator

```typescript
// my.guard.ts
@Injectable()
export class MyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Your logic
    return true
  }
}

// controller
@UseGuards(MyGuard)
@Controller()
export class MyController {}
```

### Adding a New Decorator

1. Create file in `decorators/` directory
2. Use `createParamDecorator` or custom decorator function
3. Document usage

```typescript
// my.decorator.ts
export const MyDecorator = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    return request.myProperty
  }
)

// controller
@Get()
findAll(@MyDecorator() value: string) {
  // Use value
}
```

## Testing

### Testing Middleware

```typescript
describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware
  let prisma: PrismaService

  beforeEach(() => {
    prisma = new PrismaService()
    middleware = new TenantMiddleware(prisma)
  })

  it('should extract tenant from header', async () => {
    const req = { headers: { 'x-tenant-id': 'tenant-1' } }
    const res = {}
    const next = jest.fn()

    await middleware.use(req as any, res as any, next)

    expect(prisma.getTenantId()).toBe('tenant-1')
    expect(next).toHaveBeenCalled()
  })
})
```

### Testing Guards

```typescript
describe('TenantGuard', () => {
  let guard: TenantGuard
  let reflector: Reflector

  beforeEach(() => {
    reflector = new Reflector()
    guard = new TenantGuard(reflector)
  })

  it('should allow access with tenant context', () => {
    const context = createMockExecutionContext({ tenantId: 'tenant-1' })
    expect(guard.canActivate(context)).toBe(true)
  })

  it('should deny access without tenant context', () => {
    const context = createMockExecutionContext({})
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
  })
})
```

## Resources

- [NestJS Middleware](https://docs.nestjs.com/middleware)
- [NestJS Guards](https://docs.nestjs.com/guards)
- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
- [NestJS Interceptors](https://docs.nestjs.com/interceptors)
