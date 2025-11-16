import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

/**
 * Guard to check if user has required role
 * Use with @RequireRoles() decorator
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('User not authenticated')
    }

    // Check if user has any of the required roles
    const hasRole = requiredRoles.includes(user.role)

    if (!hasRole) {
      throw new ForbiddenException(`Required role: ${requiredRoles.join(' or ')}`)
    }

    return true
  }
}

/**
 * Decorator to specify required roles for a route
 * @param roles - Array of role strings (e.g., ['admin', 'editor'])
 */
export const RequireRoles = (...roles: string[]) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('roles', roles, descriptor.value)
    } else {
      Reflect.defineMetadata('roles', roles, target)
    }
  }
}
