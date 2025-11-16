import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * Guard to check if user is the owner of a resource or has admin role
 * Checks the resource ID from route params and verifies ownership
 */
@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user = request.user
    const resourceId = request.params.id

    if (!user) {
      throw new ForbiddenException('User not authenticated')
    }

    // Admin users can access all resources
    if (user.role === 'admin') {
      return true
    }

    if (!resourceId) {
      throw new ForbiddenException('Resource ID not found')
    }

    // Determine resource type from controller name or route
    const resourceType = this.getResourceType(context)

    // Check ownership based on resource type
    const isOwner = await this.checkOwnership(resourceType, resourceId, user.id, user.tenantId)

    if (!isOwner) {
      throw new ForbiddenException('You do not have access to this resource')
    }

    return true
  }

  /**
   * Get resource type from controller name
   */
  private getResourceType(context: ExecutionContext): string {
    const controller = context.getClass().name
    // Convert "WorkflowsController" to "workflow"
    return controller.replace('Controller', '').toLowerCase().replace(/s$/, '')
  }

  /**
   * Check if user owns the resource
   */
  private async checkOwnership(
    resourceType: string,
    resourceId: string,
    userId: string,
    tenantId: string
  ): Promise<boolean> {
    try {
      switch (resourceType) {
        case 'workflow':
          const workflow = await this.prisma.workflow.findFirst({
            where: {
              id: resourceId,
              tenantId,
            },
            select: { userId: true },
          })
          return workflow?.userId === userId

        case 'execution':
          const execution = await this.prisma.execution.findFirst({
            where: {
              id: resourceId,
              tenantId,
            },
            select: { userId: true },
          })
          return execution?.userId === userId

        default:
          // For unknown resource types, deny access
          return false
      }
    } catch (error) {
      return false
    }
  }
}
