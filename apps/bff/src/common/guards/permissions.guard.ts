import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * Guard to check if user has required permissions
 * Use with @RequirePermissions() decorator
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('User not authenticated')
    }

    // Super admin has all permissions
    if (user.role === 'admin') {
      return true
    }

    // Get user permissions from database
    const userPermissions = await this.prisma.permission.findMany({
      where: { userId: user.id },
      select: {
        resource: true,
        action: true,
      },
    })

    // Convert to permission strings (e.g., "workflow:create")
    const permissionStrings = userPermissions.map((p) => `${p.resource}:${p.action}`)

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      permissionStrings.includes(permission)
    )

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions')
    }

    return true
  }
}

/**
 * Decorator to specify required permissions for a route
 * @param permissions - Array of permission strings (e.g., ['workflow:create', 'workflow:read'])
 */
export const RequirePermissions = (...permissions: string[]) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('permissions', permissions, descriptor.value)
    } else {
      Reflect.defineMetadata('permissions', permissions, target)
    }
  }
}
