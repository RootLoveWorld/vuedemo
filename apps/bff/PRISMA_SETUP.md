# Prisma Database Setup Guide

This guide will help you set up the database layer with multi-tenancy support.

## Prerequisites

1. PostgreSQL 14+ installed and running
2. Node.js 18+ and pnpm installed

## Setup Steps

### 1. Configure Database Connection

Create or update `.env` file in `apps/bff/`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/workflow_platform?schema=public"
NODE_ENV=development
```

Replace `user`, `password`, and database name as needed.

### 2. Generate Prisma Client

```bash
cd apps/bff
pnpm prisma:generate
```

This will generate the Prisma Client based on your schema.

### 3. Run Migrations

```bash
pnpm prisma:migrate
```

This will:

- Create all database tables
- Set up indexes and foreign keys
- Apply the schema to your database

### 4. Seed the Database

```bash
pnpm prisma:seed
```

This will create:

- Default tenant (slug: "default")
- Admin user (admin@example.com / admin123)
- Demo user (demo@example.com / demo123)
- Sample workflow
- Permissions for both users

### 5. Verify Setup

Open Prisma Studio to verify the data:

```bash
pnpm prisma:studio
```

This will open a GUI at http://localhost:5555

## Database Schema Overview

### Core Models

1. **Tenant** - Multi-tenant organization
   - `id`, `name`, `slug`, `description`, `isActive`
   - Unique slug for subdomain-based routing

2. **User** - User accounts
   - `id`, `email`, `password`, `name`, `role`, `tenantId`
   - Roles: admin, user, viewer
   - Belongs to one tenant

3. **Permission** - Fine-grained permissions
   - `id`, `userId`, `resource`, `action`
   - Resources: workflow, execution, plugin, user, tenant
   - Actions: create, read, update, delete, execute

4. **Workflow** - Workflow definitions
   - `id`, `name`, `description`, `definition` (JSON), `version`
   - `tenantId`, `userId`, `isActive`, `isPublic`, `tags`
   - Supports versioning through WorkflowVersion

5. **WorkflowVersion** - Version history
   - `id`, `workflowId`, `version`, `definition`, `changelog`
   - Tracks all workflow changes

6. **Execution** - Workflow execution records
   - `id`, `workflowId`, `userId`, `tenantId`, `status`
   - `inputData`, `outputData`, `errorMessage`, `duration`
   - Status: pending, running, completed, failed, cancelled

7. **ExecutionLog** - Execution logs
   - `id`, `executionId`, `nodeId`, `level`, `message`, `metadata`
   - Levels: info, warning, error

## Multi-Tenancy Implementation

### Automatic Tenant Filtering

The `PrismaService` includes middleware that automatically filters queries by tenant:

```typescript
// Automatically filtered by current tenant
const workflows = await prisma.workflow.findMany()

// Tenant ID is automatically added on create
const workflow = await prisma.workflow.create({ data: { name: 'My Workflow' } })
```

### Tenant Context

Tenant context is set by `TenantMiddleware` from:

1. `X-Tenant-Id` header
2. Subdomain (e.g., tenant1.example.com)
3. Authenticated user's tenant

### Cross-Tenant Operations

For admin operations that need to access multiple tenants:

```typescript
// Query without tenant filter
const allWorkflows = await prisma.withoutTenantFilter(async () => {
  return prisma.workflow.findMany()
})

// Query specific tenant
const tenantWorkflows = await prisma.withTenant('tenant-id', async () => {
  return prisma.workflow.findMany()
})
```

## Common Commands

### Generate Prisma Client

```bash
pnpm prisma:generate
```

### Create Migration

```bash
npx prisma migrate dev --name migration_name
```

### Apply Migrations

```bash
pnpm prisma:migrate
```

### Reset Database (Development)

```bash
npx prisma migrate reset
```

⚠️ This will delete all data!

### Seed Database

```bash
pnpm prisma:seed
```

### Open Prisma Studio

```bash
pnpm prisma:studio
```

### Format Schema

```bash
npx prisma format
```

### Validate Schema

```bash
npx prisma validate
```

## Troubleshooting

### "Can't reach database server"

1. Check PostgreSQL is running:

   ```bash
   # macOS
   brew services list

   # Linux
   sudo systemctl status postgresql
   ```

2. Verify connection string in `.env`
3. Test connection:
   ```bash
   psql -h localhost -U user -d workflow_platform
   ```

### "Prisma Client not generated"

Run:

```bash
pnpm prisma:generate
```

### "Migration failed"

1. Check database permissions
2. Verify schema syntax:
   ```bash
   npx prisma validate
   ```
3. Reset and try again:
   ```bash
   npx prisma migrate reset
   ```

### Seed script errors

1. Ensure migrations are applied first
2. Check bcrypt is installed:
   ```bash
   pnpm add bcrypt @types/bcrypt
   ```
3. Run seed manually:
   ```bash
   npx ts-node prisma/seed.ts
   ```

## Production Deployment

### Environment Variables

Set these in production:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
NODE_ENV=production
```

### Run Migrations

```bash
npx prisma migrate deploy
```

This runs migrations without prompts (safe for CI/CD).

### Connection Pooling

For production, consider using connection pooling:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public&connection_limit=10&pool_timeout=20"
```

Or use PgBouncer for better connection management.

## Next Steps

1. ✅ Database schema designed
2. ✅ Migrations created
3. ✅ Seed data prepared
4. ✅ Multi-tenancy implemented
5. 🔄 Integrate with authentication module
6. 🔄 Create workflow and execution services
7. 🔄 Add API endpoints

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Multi-tenancy Patterns](https://www.prisma.io/docs/guides/database/multi-tenancy)
