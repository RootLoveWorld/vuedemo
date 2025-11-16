import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface GrantPermissionDto {
  userId: string
  resource: string
  action: string
}

export interface RevokePermissionDto {
  userId: string
  resource: string
  action: string
}

/**
 * Service for managing user permissions
 */
@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Grant permission to a user
   */
  async grantPermission(dto: GrantPermissionDto) {
    const permission = await this.prisma.permission.upsert({
      where: {
        userId_resource_action: {
          userId: dto.userId,
          resource: dto.resource,
          action: dto.action,
        },
      },
      update: {},
      create: {
        userId: dto.userId,
        resource: dto.resource,
        action: dto.action,
      },
    })

    this.logger.log(`Granted permission ${dto.resource}:${dto.action} to user ${dto.userId}`)

    return permission
  }

  /**
   * Revoke permission from a user
   */
  async revokePermission(dto: RevokePermissionDto) {
    await this.prisma.permission.deleteMany({
      where: {
        userId: dto.userId,
        resource: dto.resource,
        action: dto.action,
      },
    })

    this.logger.log(`Revoked permission ${dto.resource}:${dto.action} from user ${dto.userId}`)

    return { message: 'Permission revoked successfully' }
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string) {
    const permissions = await this.prisma.permission.findMany({
      where: { userId },
      select: {
        id: true,
        resource: true,
        action: true,
        createdAt: true,
      },
    })

    return permissions
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    // Check if user is admin (admins have all permissions)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (user?.role === 'admin') {
      return true
    }

    // Check specific permission
    const permission = await this.prisma.permission.findUnique({
      where: {
        userId_resource_action: {
          userId,
          resource,
          action,
        },
      },
    })

    return !!permission
  }

  /**
   * Grant multiple permissions to a user
   */
  async grantMultiplePermissions(
    userId: string,
    permissions: Array<{ resource: string; action: string }>
  ) {
    const results = await Promise.all(
      permissions.map((perm) =>
        this.grantPermission({
          userId,
          resource: perm.resource,
          action: perm.action,
        })
      )
    )

    this.logger.log(`Granted ${permissions.length} permissions to user ${userId}`)

    return results
  }

  /**
   * Revoke all permissions from a user
   */
  async revokeAllPermissions(userId: string) {
    const result = await this.prisma.permission.deleteMany({
      where: { userId },
    })

    this.logger.log(`Revoked all permissions from user ${userId}`)

    return { message: `Revoked ${result.count} permissions` }
  }

  /**
   * Get default permissions for a role
   */
  getDefaultPermissionsForRole(role: string): Array<{ resource: string; action: string }> {
    switch (role) {
      case 'admin':
        // Admins have all permissions (handled in guards)
        return []

      case 'editor':
        return [
          { resource: 'workflow', action: 'create' },
          { resource: 'workflow', action: 'read' },
          { resource: 'workflow', action: 'update' },
          { resource: 'workflow', action: 'delete' },
          { resource: 'workflow', action: 'execute' },
          { resource: 'execution', action: 'read' },
          { resource: 'execution', action: 'stop' },
        ]

      case 'viewer':
        return [
          { resource: 'workflow', action: 'read' },
          { resource: 'execution', action: 'read' },
        ]

      case 'user':
      default:
        return [
          { resource: 'workflow', action: 'create' },
          { resource: 'workflow', action: 'read' },
          { resource: 'workflow', action: 'update' },
          { resource: 'workflow', action: 'execute' },
          { resource: 'execution', action: 'read' },
        ]
    }
  }

  /**
   * Initialize default permissions for a user based on their role
   */
  async initializeUserPermissions(userId: string, role: string) {
    const defaultPermissions = this.getDefaultPermissionsForRole(role)

    if (defaultPermissions.length > 0) {
      await this.grantMultiplePermissions(userId, defaultPermissions)
    }

    this.logger.log(`Initialized permissions for user ${userId} with role ${role}`)
  }
}
