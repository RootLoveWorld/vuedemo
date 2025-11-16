import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

/**
 * Guard to ensure tenant context is present
 * Can be bypassed with @Public() decorator
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name)

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const tenantId = request.tenantId

    if (!tenantId) {
      this.logger.warn('Tenant ID not found in request')
      throw new ForbiddenException('Tenant context is required')
    }

    return true
  }
}

/**
 * Decorator to mark routes as not requiring tenant context
 */
export const NoTenant = () => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('noTenant', true, descriptor.value)
    } else {
      Reflect.defineMetadata('noTenant', true, target)
    }
  }
}
