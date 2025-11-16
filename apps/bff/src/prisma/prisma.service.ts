import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { PrismaClient, Prisma } from '@prisma/client'

/**
 * Extended Prisma Client with tenant filtering middleware
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)
  private tenantId: string | null = null

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    })

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      this.$on('query' as never, (e: any) => {
        this.logger.debug(`Query: ${e.query}`)
        this.logger.debug(`Duration: ${e.duration}ms`)
      })
    }

    this.$on('error' as never, (e: any) => {
      this.logger.error(`Error: ${e.message}`)
    })

    // Setup tenant filtering middleware
    this.setupTenantMiddleware()
  }

  /**
   * Set the current tenant ID for filtering
   * This should be called from a request-scoped context
   */
  setTenantId(tenantId: string | null) {
    this.tenantId = tenantId
  }

  /**
   * Get the current tenant ID
   */
  getTenantId(): string | null {
    return this.tenantId
  }

  /**
   * Clear the tenant ID (useful for admin operations)
   */
  clearTenantId() {
    this.tenantId = null
  }

  /**
   * Setup middleware to automatically filter queries by tenant
   */
  private setupTenantMiddleware() {
    // Models that should be filtered by tenantId
    const tenantModels = ['user', 'workflow', 'execution']

    this.$use(async (params, next) => {
      // Skip if no tenant is set (e.g., for system operations)
      if (!this.tenantId) {
        return next(params)
      }

      // Only apply to tenant-scoped models
      if (!tenantModels.includes(params.model?.toLowerCase() || '')) {
        return next(params)
      }

      // Apply tenant filter for read operations
      if (params.action === 'findUnique' || params.action === 'findFirst') {
        params.args.where = {
          ...params.args.where,
          tenantId: this.tenantId,
        }
      }

      if (params.action === 'findMany') {
        if (params.args.where) {
          if (params.args.where.tenantId === undefined) {
            params.args.where.tenantId = this.tenantId
          }
        } else {
          params.args.where = { tenantId: this.tenantId }
        }
      }

      // Apply tenant filter for write operations
      if (params.action === 'create') {
        if (params.args.data) {
          params.args.data.tenantId = this.tenantId
        }
      }

      if (params.action === 'createMany') {
        if (Array.isArray(params.args.data)) {
          params.args.data = params.args.data.map((item: any) => ({
            ...item,
            tenantId: this.tenantId,
          }))
        }
      }

      if (params.action === 'update' || params.action === 'updateMany') {
        params.args.where = {
          ...params.args.where,
          tenantId: this.tenantId,
        }
      }

      if (params.action === 'delete' || params.action === 'deleteMany') {
        params.args.where = {
          ...params.args.where,
          tenantId: this.tenantId,
        }
      }

      if (params.action === 'upsert') {
        params.args.where = {
          ...params.args.where,
          tenantId: this.tenantId,
        }
        if (params.args.create) {
          params.args.create.tenantId = this.tenantId
        }
      }

      return next(params)
    })
  }

  async onModuleInit() {
    try {
      await this.$connect()
      this.logger.log('Successfully connected to database')
    } catch (error) {
      this.logger.error('Failed to connect to database', error)
      throw error
    }
  }

  async onModuleDestroy() {
    await this.$disconnect()
    this.logger.log('Disconnected from database')
  }

  /**
   * Execute a query without tenant filtering
   * Use this for admin operations or cross-tenant queries
   */
  async withoutTenantFilter<T>(callback: () => Promise<T>): Promise<T> {
    const originalTenantId = this.tenantId
    this.clearTenantId()
    try {
      return await callback()
    } finally {
      this.setTenantId(originalTenantId)
    }
  }

  /**
   * Execute a query with a specific tenant ID
   */
  async withTenant<T>(tenantId: string, callback: () => Promise<T>): Promise<T> {
    const originalTenantId = this.tenantId
    this.setTenantId(tenantId)
    try {
      return await callback()
    } finally {
      this.setTenantId(originalTenantId)
    }
  }

  /**
   * Clean database (for testing only)
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production')
    }

    // Get all table names
    const tables = await this.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `

    // Truncate all tables
    for (const { tablename } of tables) {
      if (tablename !== '_prisma_migrations') {
        try {
          await this.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`)
        } catch (error) {
          this.logger.warn(`Failed to truncate ${tablename}:`, error)
        }
      }
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    const [tenants, users, workflows, executions] = await Promise.all([
      this.tenant.count(),
      this.user.count(),
      this.workflow.count(),
      this.execution.count(),
    ])

    return {
      tenants,
      users,
      workflows,
      executions,
    }
  }

  /**
   * Get tenant statistics
   */
  async getTenantStats(tenantId: string) {
    return this.withTenant(tenantId, async () => {
      const [users, workflows, executions] = await Promise.all([
        this.user.count(),
        this.workflow.count(),
        this.execution.count(),
      ])

      const [activeWorkflows, completedExecutions, failedExecutions] = await Promise.all([
        this.workflow.count({ where: { isActive: true } }),
        this.execution.count({ where: { status: 'completed' } }),
        this.execution.count({ where: { status: 'failed' } }),
      ])

      return {
        users,
        workflows,
        executions,
        activeWorkflows,
        completedExecutions,
        failedExecutions,
      }
    })
  }
}
