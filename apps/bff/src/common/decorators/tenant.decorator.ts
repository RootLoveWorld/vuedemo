import { createParamDecorator, ExecutionContext } from '@nestjs/common'

/**
 * Decorator to extract tenant ID from request
 *
 * Usage:
 * @Get()
 * findAll(@TenantId() tenantId: string) {
 *   // tenantId is automatically extracted from request
 * }
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest()
    return request.tenantId || null
  }
)

/**
 * Decorator to extract full tenant object from request
 *
 * Usage:
 * @Get()
 * findAll(@CurrentTenant() tenant: any) {
 *   // tenant object is automatically extracted
 * }
 */
export const CurrentTenant = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest()
  return request.tenant || null
})
