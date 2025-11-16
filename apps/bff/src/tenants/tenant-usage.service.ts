import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

export interface TenantUsageStats {
  tenantId: string
  tenantName: string
  users: {
    total: number
    active: number
  }
  workflows: {
    total: number
    active: number
    inactive: number
  }
  executions: {
    total: number
    completed: number
    failed: number
    running: number
    pending: number
    lastExecution?: Date
  }
  storage: {
    usedMB: number
    quotaMB: number
    percentUsed: number
  }
  period: {
    from: Date
    to: Date
  }
}

export interface TenantUsageTrend {
  date: Date
  workflows: number
  executions: number
  users: number
}

/**
 * Service to track and report tenant usage statistics
 */
@Injectable()
export class TenantUsageService {
  private readonly logger = new Logger(TenantUsageService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive usage statistics for a tenant
   */
  async getTenantUsage(tenantId: string): Promise<TenantUsageStats> {
    this.logger.debug(`Getting usage stats for tenant ${tenantId}`)

    const tenant = await this.prisma.withoutTenantFilter(() =>
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
      })
    )

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`)
    }

    // Get all statistics in parallel for better performance
    const [userStats, workflowStats, executionStats, storageStats] = await Promise.all([
      this.getUserStats(tenantId),
      this.getWorkflowStats(tenantId),
      this.getExecutionStats(tenantId),
      this.getStorageStats(tenantId),
    ])

    return {
      tenantId,
      tenantName: tenant.name,
      users: userStats,
      workflows: workflowStats,
      executions: executionStats,
      storage: storageStats,
      period: {
        from: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
        to: new Date(),
      },
    }
  }

  /**
   * Get user statistics for tenant
   */
  private async getUserStats(tenantId: string) {
    const [total, active] = await Promise.all([
      this.prisma.withTenant(tenantId, () => this.prisma.user.count()),
      this.prisma.withTenant(tenantId, () =>
        this.prisma.user.count({
          where: { isActive: true },
        })
      ),
    ])

    return { total, active }
  }

  /**
   * Get workflow statistics for tenant
   */
  private async getWorkflowStats(tenantId: string) {
    const [total, active, inactive] = await Promise.all([
      this.prisma.withTenant(tenantId, () => this.prisma.workflow.count()),
      this.prisma.withTenant(tenantId, () =>
        this.prisma.workflow.count({
          where: { isActive: true },
        })
      ),
      this.prisma.withTenant(tenantId, () =>
        this.prisma.workflow.count({
          where: { isActive: false },
        })
      ),
    ])

    return { total, active, inactive }
  }

  /**
   * Get execution statistics for tenant
   */
  private async getExecutionStats(tenantId: string) {
    const [total, completed, failed, running, pending, lastExecution] = await Promise.all([
      this.prisma.withTenant(tenantId, () => this.prisma.execution.count()),
      this.prisma.withTenant(tenantId, () =>
        this.prisma.execution.count({
          where: { status: 'completed' },
        })
      ),
      this.prisma.withTenant(tenantId, () =>
        this.prisma.execution.count({
          where: { status: 'failed' },
        })
      ),
      this.prisma.withTenant(tenantId, () =>
        this.prisma.execution.count({
          where: { status: 'running' },
        })
      ),
      this.prisma.withTenant(tenantId, () =>
        this.prisma.execution.count({
          where: { status: 'pending' },
        })
      ),
      this.prisma.withTenant(tenantId, () =>
        this.prisma.execution.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        })
      ),
    ])

    return {
      total,
      completed,
      failed,
      running,
      pending,
      lastExecution: lastExecution?.createdAt,
    }
  }

  /**
   * Get storage statistics for tenant
   * Note: This is a placeholder. Actual implementation would query MinIO
   */
  private async getStorageStats(tenantId: string) {
    // TODO: Implement actual storage calculation from MinIO
    // For now, return placeholder values
    const quotaMB = 1024 // 1GB default quota

    // Estimate storage from workflow definitions and execution data
    const workflows = await this.prisma.withTenant(tenantId, () =>
      this.prisma.workflow.findMany({
        select: { definition: true },
      })
    )

    const executions = await this.prisma.withTenant(tenantId, () =>
      this.prisma.execution.findMany({
        select: { inputData: true, outputData: true },
      })
    )

    // Rough estimate: JSON size in MB
    const workflowSize = JSON.stringify(workflows).length / (1024 * 1024)
    const executionSize = JSON.stringify(executions).length / (1024 * 1024)
    const usedMB = Math.round((workflowSize + executionSize) * 100) / 100

    return {
      usedMB,
      quotaMB,
      percentUsed: Math.round((usedMB / quotaMB) * 100),
    }
  }

  /**
   * Get usage trend over time for a tenant
   */
  async getTenantUsageTrend(tenantId: string, days: number = 30): Promise<TenantUsageTrend[]> {
    this.logger.debug(`Getting usage trend for tenant ${tenantId} over ${days} days`)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get daily execution counts
    const executions = await this.prisma.withTenant(tenantId, () =>
      this.prisma.execution.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        _count: true,
      })
    )

    // Get workflow creation counts
    const workflows = await this.prisma.withTenant(tenantId, () =>
      this.prisma.workflow.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        _count: true,
      })
    )

    // Get user creation counts
    const users = await this.prisma.withTenant(tenantId, () =>
      this.prisma.user.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        _count: true,
      })
    )

    // Aggregate by date
    const trendMap = new Map<string, TenantUsageTrend>()

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateKey = date.toISOString().split('T')[0]

      trendMap.set(dateKey, {
        date,
        workflows: 0,
        executions: 0,
        users: 0,
      })
    }

    // Populate execution counts
    executions.forEach((item) => {
      const dateKey = item.createdAt.toISOString().split('T')[0]
      const trend = trendMap.get(dateKey)
      if (trend) {
        trend.executions += item._count
      }
    })

    // Populate workflow counts
    workflows.forEach((item) => {
      const dateKey = item.createdAt.toISOString().split('T')[0]
      const trend = trendMap.get(dateKey)
      if (trend) {
        trend.workflows += item._count
      }
    })

    // Populate user counts
    users.forEach((item) => {
      const dateKey = item.createdAt.toISOString().split('T')[0]
      const trend = trendMap.get(dateKey)
      if (trend) {
        trend.users += item._count
      }
    })

    return Array.from(trendMap.values())
  }

  /**
   * Get execution statistics for a specific time period
   */
  async getExecutionStatsByPeriod(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    total: number
    completed: number
    failed: number
    averageDuration: number
    successRate: number
  }> {
    const executions = await this.prisma.withTenant(tenantId, () =>
      this.prisma.execution.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          status: true,
          duration: true,
        },
      })
    )

    const total = executions.length
    const completed = executions.filter((e) => e.status === 'completed').length
    const failed = executions.filter((e) => e.status === 'failed').length

    const durations = executions.filter((e) => e.duration !== null).map((e) => e.duration!)
    const averageDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

    const successRate = total > 0 ? (completed / total) * 100 : 0

    return {
      total,
      completed,
      failed,
      averageDuration: Math.round(averageDuration),
      successRate: Math.round(successRate * 100) / 100,
    }
  }

  /**
   * Get top workflows by execution count
   */
  async getTopWorkflows(
    tenantId: string,
    limit: number = 10
  ): Promise<
    Array<{
      workflowId: string
      workflowName: string
      executionCount: number
      successRate: number
    }>
  > {
    const workflows = await this.prisma.withTenant(tenantId, () =>
      this.prisma.workflow.findMany({
        include: {
          _count: {
            select: { executions: true },
          },
          executions: {
            select: { status: true },
          },
        },
        orderBy: {
          executions: {
            _count: 'desc',
          },
        },
        take: limit,
      })
    )

    return workflows.map((workflow) => {
      const total = workflow.executions.length
      const completed = workflow.executions.filter((e) => e.status === 'completed').length
      const successRate = total > 0 ? (completed / total) * 100 : 0

      return {
        workflowId: workflow.id,
        workflowName: workflow.name,
        executionCount: total,
        successRate: Math.round(successRate * 100) / 100,
      }
    })
  }

  /**
   * Check if tenant is approaching usage limits
   */
  async checkUsageLimits(tenantId: string): Promise<{
    workflows: { current: number; limit: number; percentUsed: number; exceeded: boolean }
    executions: { current: number; limit: number; percentUsed: number; exceeded: boolean }
    storage: { current: number; limit: number; percentUsed: number; exceeded: boolean }
  }> {
    const usage = await this.getTenantUsage(tenantId)

    // Define limits (these could come from tenant plan configuration)
    const limits = {
      workflows: 100,
      executionsPerDay: 1000,
      storageMB: 1024,
    }

    // Get today's execution count
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayExecutions = await this.prisma.withTenant(tenantId, () =>
      this.prisma.execution.count({
        where: {
          createdAt: {
            gte: today,
          },
        },
      })
    )

    return {
      workflows: {
        current: usage.workflows.total,
        limit: limits.workflows,
        percentUsed: Math.round((usage.workflows.total / limits.workflows) * 100),
        exceeded: usage.workflows.total >= limits.workflows,
      },
      executions: {
        current: todayExecutions,
        limit: limits.executionsPerDay,
        percentUsed: Math.round((todayExecutions / limits.executionsPerDay) * 100),
        exceeded: todayExecutions >= limits.executionsPerDay,
      },
      storage: {
        current: usage.storage.usedMB,
        limit: usage.storage.quotaMB,
        percentUsed: usage.storage.percentUsed,
        exceeded: usage.storage.usedMB >= usage.storage.quotaMB,
      },
    }
  }
}
