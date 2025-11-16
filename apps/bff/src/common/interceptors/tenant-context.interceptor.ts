import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * Interceptor to ensure tenant context is set from authenticated user
 * This runs after authentication guards
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantContextInterceptor.name)

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    // If user is authenticated and has a tenant, ensure it's set in Prisma
    if (user && user.tenantId) {
      const currentTenantId = this.prisma.getTenantId()

      // Only set if not already set or different
      if (currentTenantId !== user.tenantId) {
        this.prisma.setTenantId(user.tenantId)
        request.tenantId = user.tenantId
        this.logger.debug(`Set tenant context from user: ${user.tenantId}`)
      }
    }

    return next.handle().pipe(
      tap(() => {
        // Optionally clear tenant context after request
        // this.prisma.clearTenantId()
      })
    )
  }
}
