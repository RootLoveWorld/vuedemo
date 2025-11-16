# AI Workflow Platform - BFF (Backend For Frontend)

NestJS-based BFF service for the AI Workflow Platform.

## Features

- **TypeScript**: Full type safety with TypeScript 5.x
- **NestJS**: Modern, scalable Node.js framework
- **Prisma ORM**: Type-safe database access
- **JWT Authentication**: Secure authentication with Passport
- **WebSocket**: Real-time communication with Socket.io
- **Swagger**: Auto-generated API documentation
- **Winston**: Structured logging
- **Validation**: Request validation with class-validator

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- pnpm 9+

## Installation

```bash
# Install dependencies (from root)
pnpm install

# Generate Prisma client
pnpm --filter @workflow/bff prisma:generate
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for JWT token signing
- `AI_SERVICE_URL`: URL of the Python AI service

## Database Setup

```bash
# Run migrations
pnpm --filter @workflow/bff prisma:migrate

# Open Prisma Studio (optional)
pnpm --filter @workflow/bff prisma:studio
```

## Development

```bash
# Start in development mode with hot reload
pnpm --filter @workflow/bff start:dev

# Start in debug mode
pnpm --filter @workflow/bff start:debug
```

The server will start on `http://localhost:3001`

API Documentation: `http://localhost:3001/api/docs`

## Build

```bash
# Build for production
pnpm --filter @workflow/bff build

# Start production server
pnpm --filter @workflow/bff start:prod
```

## Testing

```bash
# Unit tests
pnpm --filter @workflow/bff test

# E2E tests
pnpm --filter @workflow/bff test:e2e

# Test coverage
pnpm --filter @workflow/bff test:cov
```

## Project Structure

```
src/
├── auth/              # Authentication module
├── workflows/         # Workflow management
├── executions/        # Execution management
├── users/             # User management
├── ai-service/        # AI service client
├── prisma/            # Prisma service
├── common/            # Shared utilities
│   ├── filters/       # Exception filters
│   ├── interceptors/  # Request/response interceptors
│   ├── guards/        # Auth guards
│   └── logger/        # Winston logger
├── config/            # Configuration
├── app.module.ts      # Root module
└── main.ts            # Application entry point
```

## API Endpoints

### Health Check

- `GET /` - Basic health check
- `GET /health` - Detailed health check

### Authentication (Coming Soon)

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token

### Workflows (Coming Soon)

- `POST /api/workflows` - Create workflow
- `GET /api/workflows` - List workflows
- `GET /api/workflows/:id` - Get workflow
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow

### Executions (Coming Soon)

- `POST /api/executions` - Trigger execution
- `GET /api/executions` - List executions
- `GET /api/executions/:id` - Get execution details

## Logging

Logs are written to:

- Console (formatted with colors in development)
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

Log levels: `error`, `warn`, `info`, `debug`, `verbose`

## License

MIT
