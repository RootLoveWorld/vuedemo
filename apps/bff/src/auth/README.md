# Authentication Module

This module provides JWT-based authentication and authorization for the AI Workflow Platform.

## Features

- **JWT Authentication**: Secure token-based authentication
- **Local Strategy**: Email/password login
- **User Registration**: Self-service user registration with automatic tenant creation
- **Token Refresh**: Long-lived refresh tokens for seamless user experience
- **Password Management**: Secure password hashing with bcrypt
- **Multi-tenant Support**: Automatic tenant context from authenticated users

## API Endpoints

### Public Endpoints (No Authentication Required)

#### Register

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "tenantId": "optional-tenant-id"
}
```

Response:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "tenantId": "uuid",
    "tenant": {
      "id": "uuid",
      "name": "Example",
      "slug": "example",
      "isActive": true
    }
  },
  "access_token": "jwt-token",
  "refresh_token": "refresh-token",
  "expires_in": 900
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

Response: Same as register

#### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "your-refresh-token"
}
```

Response:

```json
{
  "access_token": "new-jwt-token",
  "refresh_token": "new-refresh-token",
  "expires_in": 900
}
```

### Protected Endpoints (Authentication Required)

#### Get Profile

```http
GET /auth/profile
Authorization: Bearer <access_token>
```

Response:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "isActive": true,
  "tenantId": "uuid",
  "tenant": {
    "id": "uuid",
    "name": "Example",
    "slug": "example",
    "isActive": true
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Update Profile

```http
PUT /auth/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Jane Doe"
}
```

#### Change Password

```http
POST /auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "oldPassword": "currentPassword",
  "newPassword": "newSecurePassword123"
}
```

#### Logout

```http
POST /auth/logout
Authorization: Bearer <access_token>
```

## Usage in Controllers

### Protecting Routes

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards'
import { CurrentUser, CurrentUserData } from '../auth/decorators'

@Controller('workflows')
@UseGuards(JwtAuthGuard) // Protect all routes in this controller
export class WorkflowsController {
  @Get()
  async findAll(@CurrentUser() user: CurrentUserData) {
    // user object contains authenticated user info
    console.log(user.id, user.email, user.tenantId)
    // ...
  }
}
```

### Public Routes

```typescript
import { Controller, Get } from '@nestjs/common'
import { Public } from '../auth/decorators'

@Controller('public')
export class PublicController {
  @Public() // This route doesn't require authentication
  @Get('health')
  health() {
    return { status: 'ok' }
  }
}
```

## Guards

### JwtAuthGuard

Validates JWT tokens and attaches user to request.

```typescript
@UseGuards(JwtAuthGuard)
@Get('protected')
async protectedRoute(@CurrentUser() user: CurrentUserData) {
  // ...
}
```

### LocalAuthGuard

Validates email/password credentials (used for login).

```typescript
@UseGuards(LocalAuthGuard)
@Post('login')
async login(@Request() req: any) {
  return this.authService.login(req.user)
}
```

## Decorators

### @Public()

Marks a route as public (no authentication required).

```typescript
@Public()
@Get('public-data')
async getPublicData() {
  // ...
}
```

### @CurrentUser()

Injects the authenticated user into the route handler.

```typescript
@Get('me')
async getMe(@CurrentUser() user: CurrentUserData) {
  return user
}
```

## Token Configuration

Tokens are configured via environment variables:

```env
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
JWT_REFRESH_EXPIRES_IN=7d
```

## Security Features

1. **Password Hashing**: Passwords are hashed using bcrypt with 10 salt rounds
2. **Token Expiration**: Access tokens expire after 15 minutes, refresh tokens after 7 days
3. **User Validation**: Users and tenants must be active to authenticate
4. **Tenant Isolation**: Users can only access resources within their tenant

## Multi-Tenant Support

The authentication module automatically handles multi-tenant scenarios:

1. **Registration**: If no tenantId is provided, a new tenant is created based on the email domain
2. **Login**: User's tenant is validated and included in the JWT payload
3. **Token Validation**: Tenant status is checked on every request
4. **Automatic Filtering**: Prisma queries are automatically filtered by tenant

## Error Handling

The module throws appropriate HTTP exceptions:

- `401 Unauthorized`: Invalid credentials, expired token, inactive user/tenant
- `409 Conflict`: User already exists (registration)
- `400 Bad Request`: Invalid input data

## Testing

To test the authentication endpoints:

```bash
# Register a new user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get profile (use token from login response)
curl -X GET http://localhost:3001/auth/profile \
  -H "Authorization: Bearer <access_token>"
```

## Integration with Other Modules

The auth module is integrated with:

- **PrismaModule**: For database access
- **CommonModule**: For tenant middleware and guards
- **ConfigModule**: For JWT configuration

All other modules should import AuthModule and use JwtAuthGuard to protect routes.
