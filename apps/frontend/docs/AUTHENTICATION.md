# Authentication Implementation

This document describes the authentication system implemented for the AI Workflow Platform frontend.

## Overview

The authentication system provides:

- User login and registration
- JWT token management with automatic refresh
- Route guards for protected pages
- Automatic logout on token expiry
- Secure token storage

## Components

### 1. Login Page (`/login`)

- Email and password validation using Zod
- Form validation with real-time feedback
- Integration with BFF login API
- Redirect to intended page after login

### 2. Registration Page (`/register`)

- User registration with email, password, and optional name
- Password strength indicator (Weak/Fair/Good/Strong)
- Password requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
- Confirm password validation
- Automatic login after successful registration

### 3. Auth Store (`stores/auth.ts`)

- Centralized authentication state management using Pinia
- Token storage in localStorage
- Automatic token refresh before expiry (5 minutes threshold)
- Token expiry checking every minute
- User profile management

### 4. API Client (`api/client.ts`)

- Automatic Bearer token injection in requests
- Token refresh on 401 errors
- Request queuing during token refresh
- Error handling and message extraction

### 5. Route Guards (`router/index.ts`)

- Protected routes require authentication
- Guest routes (login/register) redirect authenticated users
- Automatic redirect to login with return URL
- Type-safe route meta properties

### 6. Auth Composable (`composables/useAuth.ts`)

- Convenient auth utilities for components
- Permission and role checking (placeholder for future RBAC)
- Programmatic logout

## Usage

### Protecting Routes

```typescript
{
  path: '/workflows',
  name: 'workflows',
  component: () => import('@/views/WorkflowsView.vue'),
  meta: { requiresAuth: true },
}
```

### Using Auth in Components

```vue
<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'

const { isAuthenticated, user, logout } = useAuth()
</script>

<template>
  <div v-if="isAuthenticated">
    <p>Welcome, {{ user?.name || user?.email }}</p>
    <button @click="logout">Logout</button>
  </div>
</template>
```

### Making Authenticated API Calls

```typescript
import { workflowsApi } from '@/api/workflows'

// Token is automatically added to the request
const workflows = await workflowsApi.getAll()
```

## Token Management

### Storage

- Tokens are stored in localStorage with key `auth_token`
- Token expiry time is stored with key `auth_token_expiry`

### Refresh Strategy

- Tokens are automatically refreshed 5 minutes before expiry
- Failed refresh attempts trigger automatic logout
- Multiple simultaneous requests during refresh are queued

### Expiry Handling

- Token expiry is checked every minute
- Expired tokens trigger automatic logout
- 401 responses trigger token refresh attempt

## Security Considerations

1. **Token Storage**: Tokens are stored in localStorage. For production, consider:
   - Using httpOnly cookies for enhanced security
   - Implementing CSRF protection
   - Using secure, sameSite cookie attributes

2. **Token Refresh**: The current implementation refreshes tokens automatically. Ensure:
   - Refresh tokens have appropriate expiry times
   - Refresh endpoint validates the current token
   - Rate limiting on refresh endpoint

3. **Password Requirements**: Current requirements are basic. Consider:
   - Checking against common password lists
   - Implementing password history
   - Adding 2FA support

## Future Enhancements

- [ ] Role-based access control (RBAC)
- [ ] Permission-based route guards
- [ ] Two-factor authentication (2FA)
- [ ] Social login (OAuth)
- [ ] Remember me functionality
- [ ] Password reset flow
- [ ] Email verification
- [ ] Session management (view active sessions, logout all devices)
