import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TenantResourcesService } from './tenant-resources.service'
import { CreateTenantDto, UpdateTenantDto } from './dto'
import * as bcrypt from 'bcrypt'

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantResources: TenantResourcesService
  ) {}

  /**
   * Create a new tenant with admin user
   */
  async create(dto: CreateTenantDto) {
    // Check if slug is already taken
    const existingTenant = await this.prisma.withoutTenantFilter(() =>
      this.prisma.tenant.findUnique({
        where: { slug: dto.slug },
      })
    )

    if (existingTenant) {
      throw new ConflictException(`Tenant with slug "${dto.slug}" already exists`)
    }

    // Check if admin email is already taken
    const existingUser = await this.prisma.withoutTenantFilter(() =>
      this.prisma.user.findUnique({
        where: { email: dto.adminEmail },
      })
    )

    if (existingUser) {
      throw new ConflictException(`User with email "${dto.adminEmail}" already exists`)
    }

    // Create tenant and admin user in a transaction
    const result = await this.prisma.withoutTenantFilter(async () => {
      return this.prisma.$transaction(async (tx) => {
        // Create tenant
        const tenant = await tx.tenant.create({
          data: {
            name: dto.name,
            slug: dto.slug,
            description: dto.description,
          },
        })

        // Hash admin password
        const hashedPassword = await bcrypt.hash(dto.adminPassword, 10)

        // Create admin user
        const adminUser = await tx.user.create({
          data: {
            email: dto.adminEmail,
            password: hashedPassword,
            name: dto.adminName,
            role: 'admin',
            tenantId: tenant.id,
          },
        })

        this.logger.log(`Created tenant "${tenant.name}" with admin user "${adminUser.email}"`)

        return { tenant, adminUser }
      })
    })

    // Initialize tenant resources (MinIO, Redis, default roles)
    try {
      await this.tenantResources.initializeTenantResources(result.tenant.id)
    } catch (error) {
      this.logger.error(`Failed to initialize resources for tenant ${result.tenant.id}`, error)
      // Note: Tenant is already created, resources can be initialized later
    }

    // Return tenant without sensitive user data
    return {
      ...result.tenant,
      adminUser: {
        id: result.adminUser.id,
        email: result.adminUser.email,
        name: result.adminUser.name,
      },
    }
  }

  /**
   * Find all tenants (admin only)
   */
  async findAll() {
    return this.prisma.withoutTenantFilter(() =>
      this.prisma.tenant.findMany({
        include: {
          _count: {
            select: {
              users: true,
              workflows: true,
              executions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    )
  }

  /**
   * Find one tenant by ID
   */
  async findOne(id: string) {
    const tenant = await this.prisma.withoutTenantFilter(() =>
      this.prisma.tenant.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              users: true,
              workflows: true,
              executions: true,
            },
          },
        },
      })
    )

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${id}" not found`)
    }

    return tenant
  }

  /**
   * Find tenant by slug
   */
  async findBySlug(slug: string) {
    const tenant = await this.prisma.withoutTenantFilter(() =>
      this.prisma.tenant.findUnique({
        where: { slug },
      })
    )

    if (!tenant) {
      throw new NotFoundException(`Tenant with slug "${slug}" not found`)
    }

    return tenant
  }

  /**
   * Update tenant
   */
  async update(id: string, dto: UpdateTenantDto) {
    // Verify tenant exists
    await this.findOne(id)

    const tenant = await this.prisma.withoutTenantFilter(() =>
      this.prisma.tenant.update({
        where: { id },
        data: dto,
      })
    )

    this.logger.log(`Updated tenant "${tenant.name}"`)
    return tenant
  }

  /**
   * Delete tenant (soft delete by deactivating)
   */
  async remove(id: string) {
    // Verify tenant exists
    await this.findOne(id)

    // Deactivate tenant instead of hard delete
    const tenant = await this.prisma.withoutTenantFilter(() =>
      this.prisma.tenant.update({
        where: { id },
        data: { isActive: false },
      })
    )

    this.logger.log(`Deactivated tenant "${tenant.name}"`)
    return tenant
  }

  /**
   * Hard delete tenant and all related data
   */
  async hardDelete(id: string) {
    // Verify tenant exists
    await this.findOne(id)

    // Clean up tenant resources first
    try {
      await this.tenantResources.cleanupTenantResources(id)
    } catch (error) {
      this.logger.error(`Failed to cleanup resources for tenant ${id}`, error)
      // Continue with deletion even if resource cleanup fails
    }

    await this.prisma.withoutTenantFilter(async () => {
      await this.prisma.$transaction(async (tx) => {
        // Delete in order due to foreign key constraints
        await tx.executionLog.deleteMany({
          where: { execution: { tenantId: id } },
        })
        await tx.execution.deleteMany({ where: { tenantId: id } })
        await tx.workflowVersion.deleteMany({
          where: { workflow: { tenantId: id } },
        })
        await tx.workflow.deleteMany({ where: { tenantId: id } })
        await tx.permission.deleteMany({ where: { user: { tenantId: id } } })
        await tx.user.deleteMany({ where: { tenantId: id } })
        await tx.tenant.delete({ where: { id } })
      })
    })

    this.logger.warn(`Hard deleted tenant with ID "${id}"`)
    return { success: true, message: 'Tenant permanently deleted' }
  }

  /**
   * Activate tenant
   */
  async activate(id: string) {
    const tenant = await this.prisma.withoutTenantFilter(() =>
      this.prisma.tenant.update({
        where: { id },
        data: { isActive: true },
      })
    )

    this.logger.log(`Activated tenant "${tenant.name}"`)
    return tenant
  }
}
