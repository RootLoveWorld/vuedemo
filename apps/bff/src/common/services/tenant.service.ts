import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface CreateTenantDto {
  name: string
  slug: string
  description?: string
}

export interface UpdateTenantDto {
  name?: string
  description?: string
  isActive?: boolean
}

/**
 * Service for managing tenants
 */
@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new tenant
   */
  async create(dto: CreateTenantDto) {
    // Check if slug already exists
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    })

    if (existing) {
      throw new ConflictException(`Tenant with slug '${dto.slug}' already exists`)
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
      },
    })

    this.logger.log(`Created tenant: ${tenant.name} (${tenant.id})`)
    return tenant
  }

  /**
   * Find all tenants
   */
  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Find tenant by ID
   */
  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    })

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`)
    }

    return tenant
  }

  /**
   * Find tenant by slug
   */
  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    })

    if (!tenant) {
      throw new NotFoundException(`Tenant with slug '${slug}' not found`)
    }

    return tenant
  }

  /**
   * Update tenant
   */
  async update(id: string, dto: UpdateTenantDto) {
    const tenant = await this.findOne(id)

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: dto,
    })

    this.logger.log(`Updated tenant: ${updated.name} (${updated.id})`)
    return updated
  }

  /**
   * Delete tenant (soft delete by setting isActive to false)
   */
  async remove(id: string) {
    const tenant = await this.findOne(id)

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { isActive: false },
    })

    this.logger.log(`Deactivated tenant: ${updated.name} (${updated.id})`)
    return updated
  }

  /**
   * Hard delete tenant (use with caution!)
   */
  async hardDelete(id: string) {
    const tenant = await this.findOne(id)

    await this.prisma.tenant.delete({
      where: { id },
    })

    this.logger.warn(`Hard deleted tenant: ${tenant.name} (${tenant.id})`)
    return { message: 'Tenant permanently deleted' }
  }

  /**
   * Get tenant statistics
   */
  async getStats(id: string) {
    const tenant = await this.findOne(id)
    const stats = await this.prisma.getTenantStats(id)

    return {
      tenant,
      stats,
    }
  }

  /**
   * Get all tenants with their statistics
   */
  async getAllWithStats() {
    const tenants = await this.findAll()

    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const stats = await this.prisma.getTenantStats(tenant.id)
        return {
          ...tenant,
          stats,
        }
      })
    )

    return tenantsWithStats
  }
}
