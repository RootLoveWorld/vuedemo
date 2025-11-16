import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'

/**
 * Service to manage tenant resource initialization
 * Handles MinIO buckets, Redis namespaces, and default roles
 */
@Injectable()
export class TenantResourcesService {
  private readonly logger = new Logger(TenantResourcesService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Initialize all resources for a new tenant
   */
  async initializeTenantResources(tenantId: string): Promise<void> {
    this.logger.log(`Initializing resources for tenant ${tenantId}`)

    try {
      // Initialize in parallel for better performance
      await Promise.all([
        this.createMinIOBuckets(tenantId),
        this.initializeRedisNamespace(tenantId),
        this.createDefaultRoles(tenantId),
      ])

      this.logger.log(`Successfully initialized resources for tenant ${tenantId}`)
    } catch (error) {
      this.logger.error(`Failed to initialize resources for tenant ${tenantId}:`, error)
      throw error
    }
  }

  /**
   * Create MinIO buckets for tenant
   * Buckets: plugins, files, exports
   */
  private async createMinIOBuckets(tenantId: string): Promise<void> {
    this.logger.debug(`Creating MinIO buckets for tenant ${tenantId}`)

    // TODO: Implement MinIO bucket creation when MinIO client is added
    // For now, we'll just log the bucket names that should be created
    const buckets = [
      `tenant-${tenantId}-plugins`, // For plugin storage
      `tenant-${tenantId}-files`, // For user uploaded files
      `tenant-${tenantId}-exports`, // For workflow exports
    ]

    this.logger.debug(`MinIO buckets to create: ${buckets.join(', ')}`)

    // Placeholder for MinIO implementation:
    // const minioClient = new Minio.Client({...})
    // for (const bucket of buckets) {
    //   const exists = await minioClient.bucketExists(bucket)
    //   if (!exists) {
    //     await minioClient.makeBucket(bucket, 'us-east-1')
    //     this.logger.log(`Created MinIO bucket: ${bucket}`)
    //   }
    // }
  }

  /**
   * Initialize Redis namespace for tenant
   * Sets up keys for caching, sessions, and rate limiting
   */
  private async initializeRedisNamespace(tenantId: string): Promise<void> {
    this.logger.debug(`Initializing Redis namespace for tenant ${tenantId}`)

    // TODO: Implement Redis initialization when Redis client is added
    // For now, we'll just log the namespace structure
    const namespaces = {
      cache: `tenant:${tenantId}:cache`,
      session: `tenant:${tenantId}:session`,
      rateLimit: `tenant:${tenantId}:ratelimit`,
      queue: `tenant:${tenantId}:queue`,
    }

    this.logger.debug(`Redis namespaces: ${JSON.stringify(namespaces)}`)

    // Placeholder for Redis implementation:
    // const redis = new Redis(this.configService.get('redis.url'))
    // await redis.set(`tenant:${tenantId}:initialized`, Date.now())
    // await redis.set(`tenant:${tenantId}:config`, JSON.stringify({
    //   maxWorkflows: 100,
    //   maxExecutionsPerDay: 1000,
    //   storageQuotaMB: 1024,
    // }))
    // await redis.quit()
  }

  /**
   * Create default roles and permissions for tenant
   */
  private async createDefaultRoles(tenantId: string): Promise<void> {
    this.logger.debug(`Creating default roles for tenant ${tenantId}`)

    // Get the admin user for this tenant
    const adminUser = await this.prisma.withTenant(tenantId, async () => {
      return this.prisma.user.findFirst({
        where: { role: 'admin' },
      })
    })

    if (!adminUser) {
      this.logger.warn(`No admin user found for tenant ${tenantId}, skipping role creation`)
      return
    }

    // Define default permissions for admin role
    const defaultPermissions = [
      { resource: 'workflow', action: 'create' },
      { resource: 'workflow', action: 'read' },
      { resource: 'workflow', action: 'update' },
      { resource: 'workflow', action: 'delete' },
      { resource: 'workflow', action: 'execute' },
      { resource: 'execution', action: 'read' },
      { resource: 'execution', action: 'stop' },
      { resource: 'user', action: 'read' },
      { resource: 'user', action: 'create' },
      { resource: 'user', action: 'update' },
    ]

    // Create permissions for admin user
    await this.prisma.withTenant(tenantId, async () => {
      for (const perm of defaultPermissions) {
        await this.prisma.permission.upsert({
          where: {
            userId_resource_action: {
              userId: adminUser.id,
              resource: perm.resource,
              action: perm.action,
            },
          },
          create: {
            userId: adminUser.id,
            resource: perm.resource,
            action: perm.action,
          },
          update: {},
        })
      }
    })

    this.logger.log(
      `Created ${defaultPermissions.length} default permissions for tenant ${tenantId}`
    )
  }

  /**
   * Clean up all resources for a tenant
   * Called when tenant is deleted
   */
  async cleanupTenantResources(tenantId: string): Promise<void> {
    this.logger.log(`Cleaning up resources for tenant ${tenantId}`)

    try {
      await Promise.all([this.deleteMinIOBuckets(tenantId), this.clearRedisNamespace(tenantId)])

      this.logger.log(`Successfully cleaned up resources for tenant ${tenantId}`)
    } catch (error) {
      this.logger.error(`Failed to cleanup resources for tenant ${tenantId}:`, error)
      throw error
    }
  }

  /**
   * Delete MinIO buckets for tenant
   */
  private async deleteMinIOBuckets(tenantId: string): Promise<void> {
    this.logger.debug(`Deleting MinIO buckets for tenant ${tenantId}`)

    const buckets = [
      `tenant-${tenantId}-plugins`,
      `tenant-${tenantId}-files`,
      `tenant-${tenantId}-exports`,
    ]

    this.logger.debug(`MinIO buckets to delete: ${buckets.join(', ')}`)

    // Placeholder for MinIO implementation:
    // const minioClient = new Minio.Client({...})
    // for (const bucket of buckets) {
    //   try {
    //     const exists = await minioClient.bucketExists(bucket)
    //     if (exists) {
    //       // Remove all objects first
    //       const objectsList = minioClient.listObjects(bucket, '', true)
    //       for await (const obj of objectsList) {
    //         await minioClient.removeObject(bucket, obj.name)
    //       }
    //       // Then remove bucket
    //       await minioClient.removeBucket(bucket)
    //       this.logger.log(`Deleted MinIO bucket: ${bucket}`)
    //     }
    //   } catch (error) {
    //     this.logger.warn(`Failed to delete bucket ${bucket}:`, error)
    //   }
    // }
  }

  /**
   * Clear Redis namespace for tenant
   */
  private async clearRedisNamespace(tenantId: string): Promise<void> {
    this.logger.debug(`Clearing Redis namespace for tenant ${tenantId}`)

    // Placeholder for Redis implementation:
    // const redis = new Redis(this.configService.get('redis.url'))
    // const keys = await redis.keys(`tenant:${tenantId}:*`)
    // if (keys.length > 0) {
    //   await redis.del(...keys)
    //   this.logger.log(`Deleted ${keys.length} Redis keys for tenant ${tenantId}`)
    // }
    // await redis.quit()
  }

  /**
   * Get tenant resource usage statistics
   */
  async getTenantResourceUsage(tenantId: string): Promise<{
    storage: { used: number; quota: number }
    buckets: string[]
    redisKeys: number
  }> {
    this.logger.debug(`Getting resource usage for tenant ${tenantId}`)

    // Placeholder implementation
    return {
      storage: {
        used: 0, // MB
        quota: 1024, // MB
      },
      buckets: [
        `tenant-${tenantId}-plugins`,
        `tenant-${tenantId}-files`,
        `tenant-${tenantId}-exports`,
      ],
      redisKeys: 0,
    }

    // TODO: Implement actual resource usage calculation
    // const minioClient = new Minio.Client({...})
    // const redis = new Redis(this.configService.get('redis.url'))
    //
    // let totalSize = 0
    // for (const bucket of buckets) {
    //   const objects = await minioClient.listObjects(bucket, '', true)
    //   for await (const obj of objects) {
    //     totalSize += obj.size
    //   }
    // }
    //
    // const redisKeys = await redis.keys(`tenant:${tenantId}:*`)
    //
    // return {
    //   storage: { used: totalSize / (1024 * 1024), quota: 1024 },
    //   buckets,
    //   redisKeys: redisKeys.length,
    // }
  }
}
