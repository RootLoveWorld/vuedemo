# Database Migrations

This directory contains Prisma schema and migrations for the AI Workflow Platform.

## Schema Overview

The database schema includes the following models:

- **Tenant**: Multi-tenant support for isolating data between organizations
- **User**: User accounts with role-based access control
- **Permission**: Fine-grained permissions for users
- **Workflow**: Workflow definitions with versioning support
- **WorkflowVersion**: Version history for workflows
- **Execution**: Workflow execution records
- **ExecutionLog**: Detailed logs for each execution

## Running Migrations

### Prerequisites

Ensure PostgreSQL is running and the `DATABASE_URL` is set in your `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/workflow_platform?schema=public"
```

### Generate Prisma Client

```bash
pnpm prisma:generate
```

### Run Migrations

```bash
pnpm prisma:migrate
```

This will apply all pending migrations to your database.

### Seed Database

To populate the database with initial data:

```bash
pnpm prisma:seed
```

This will create:

- Default tenant
- Admin user (admin@example.com / admin123)
- Demo user (demo@example.com / demo123)
- Sample workflow
- Permissions for both users

### Reset Database (Development Only)

To reset the database and re-run all migrations:

```bash
npx prisma migrate reset
```

⚠️ **Warning**: This will delete all data in the database!

## Creating New Migrations

When you modify the `schema.prisma` file:

```bash
npx prisma migrate dev --name your_migration_name
```

This will:

1. Create a new migration file
2. Apply the migration to your database
3. Regenerate the Prisma Client

## Prisma Studio

To explore your database with a GUI:

```bash
pnpm prisma:studio
```

This will open Prisma Studio at http://localhost:5555

## Multi-Tenancy

The schema implements multi-tenancy with the following approach:

1. All main entities (User, Workflow, Execution) have a `tenantId` foreign key
2. Tenant isolation is enforced at the application level through middleware
3. Each tenant's data is logically separated but stored in the same database

## Indexes

The schema includes indexes on:

- Foreign keys (tenantId, userId, workflowId, etc.)
- Frequently queried fields (email, status, isActive)
- Composite unique constraints (userId + resource + action for permissions)

## Version Management

Workflows support versioning through the `WorkflowVersion` model:

- Each workflow change creates a new version record
- Version history is maintained for audit and rollback purposes
- The main `Workflow` model stores the current version number
