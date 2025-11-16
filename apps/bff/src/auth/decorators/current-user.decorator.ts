import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface CurrentUserData {
  id: string
  email: string
  name?: string
  role: string
  tenantId: string
  tenant: {
    id: string
    name: string
    slug: string
    isActive: boolean
  }
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest()
    return request.user
  }
)
