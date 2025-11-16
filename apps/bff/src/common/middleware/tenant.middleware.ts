import { Injectable, NestMiddleware, Logger, UnauthorizedException } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * Middleware to extract and set tenant context from request
 *
 * Tenant can be identified by:
 * 1. User's tenant from JWT token (preferred)
 * 2. X-Tenant-Id header
 * 3. Subdomain (e.g., tenant1.example.com)
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name)

  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      let tenantId: string | null = null

      // 1. Try to get tenant from authenticated user (most reliable)
      if ((req as any).user) {
        const user = (req as any).user
        if (user.tenantId) {
          tenantId = user.tenantId
          this.logger.debug(`Tenant ID from authenticated user: ${tenantId}`)
        }
      }

      // 2. Try to get tenant from header (for API clients)
      if (!tenantId) {
        const tenantHeader = req.headers['x-tenant-id'] as string
        if (tenantHeader) {
          // Verify tenant exists and is active
          const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantHeader },
            select: { id: true, isActive: true },
          })
          if (tenant && tenant.isActive) {
            tenantId = tenantHeader
            this.logger.debug(`Tenant ID from header: ${tenantId}`)
          } else {
            this.logger.warn(`Invalid or inactive tenant ID in header: ${tenantHeader}`)
          }
        }
      }

      // 3. Try to get tenant from subdomain (for multi-tenant SaaS)
      if (!tenantId) {
        const host = req.headers.host || ''
        const subdomain = this.extractSubdomain(host)
        if (subdomain) {
          // Look up tenant by slug
          const tenant = await this.prisma.tenant.findUnique({
            where: { slug: subdomain },
            select: { id: true, isActive: true },
          })
          if (tenant && tenant.isActive) {
            tenantId = tenant.id
            this.logger.debug(`Tenant ID from subdomain: ${tenantId}`)
          } else {
            this.logger.warn(`Invalid or inactive tenant slug: ${subdomain}`)
          }
        }
      }

      // Set tenant ID in Prisma service for automatic filtering
      if (tenantId) {
        this.prisma.setTenantId(tenantId)
        // Also attach to request for easy access in controllers
        ;(req as any).tenantId = tenantId
      } else {
        // For authenticated routes, tenant is required
        if ((req as any).user) {
          this.logger.error('Authenticated user has no tenant ID')
          throw new UnauthorizedException('Tenant context is required')
        }
        this.logger.debug('No tenant ID found in request (public route)')
      }

      next()
    } catch (error) {
      this.logger.error('Error in tenant middleware:', error)
      next(error)
    }
  }

  /**
   * Extract subdomain from host
   * e.g., "tenant1.example.com" -> "tenant1"
   */
  private extractSubdomain(host: string): string | null {
    // Remove port if present
    const hostWithoutPort = host.split(':')[0]
    const parts = hostWithoutPort.split('.')

    // Need at least 3 parts for subdomain (subdomain.domain.tld)
    if (parts.length < 3) {
      return null
    }

    // Ignore common subdomains
    const subdomain = parts[0]
    if (['www', 'api', 'app', 'localhost'].includes(subdomain)) {
      return null
    }

    return subdomain
  }
}
