import { Injectable, NotFoundException, BadRequestException, Scope, Inject } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { PrismaService } from '../prisma/prisma.service'
import { PluginValidationService } from './plugin-validation.service'
import { CreatePluginDto, UpdatePluginDto } from './dto'
import type { Plugin, PluginListItem, PluginManifest } from '@workflow/shared-types'

interface RequestWithUser {
  user: {
    id: string
    tenantId: string
  }
}

@Injectable({ scope: Scope.REQUEST })
export class PluginsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: PluginValidationService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {
    // Set tenant context from request
    if (this.request.user?.tenantId) {
      this.prisma.setTenantId(this.request.user.tenantId)
    }
  }

  /**
   * Register a new plugin
   */
  async register(tenantId: string, dto: CreatePluginDto): Promise<Plugin> {
    const manifest = dto.manifest

    // Validate plugin manifest
    await this.validationService.validatePlugin(manifest)

    // Check if plugin with same name and version already exists
    const existingPlugin = await this.prisma.plugin.findFirst({
      where: {
        tenantId,
        name: manifest.name,
        version: manifest.version,
      },
    })

    if (existingPlugin) {
      throw new BadRequestException(
        `Plugin ${manifest.name} version ${manifest.version} already exists`
      )
    }

    const plugin = await this.prisma.plugin.create({
      data: {
        name: manifest.name,
        version: manifest.version,
        author: manifest.author,
        description: manifest.description,
        category: manifest.category,
        icon: manifest.icon,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        manifest: manifest as any,
        fileUrl: dto.fileUrl,
        tenantId,
      },
    })

    return this.mapToPlugin(plugin)
  }

  /**
   * Find all plugins for a tenant
   */
  async findAll(
    tenantId: string,
    category?: string,
    isInstalled?: boolean
  ): Promise<PluginListItem[]> {
    const plugins = await this.prisma.plugin.findMany({
      where: {
        tenantId,
        ...(category && { category }),
        ...(isInstalled !== undefined && { isInstalled }),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        version: true,
        author: true,
        description: true,
        category: true,
        icon: true,
        isInstalled: true,
        isActive: true,
        downloads: true,
        rating: true,
      },
    })

    return plugins.map((p) => ({
      ...p,
      icon: p.icon || undefined,
      downloads: p.downloads || undefined,
      rating: p.rating || undefined,
    }))
  }

  /**
   * Find one plugin by ID
   */
  async findOne(id: string, tenantId: string): Promise<Plugin> {
    const plugin = await this.prisma.plugin.findFirst({
      where: {
        id,
        tenantId,
      },
    })

    if (!plugin) {
      throw new NotFoundException(`Plugin with ID ${id} not found`)
    }

    return this.mapToPlugin(plugin)
  }

  /**
   * Update a plugin
   */
  async update(id: string, tenantId: string, dto: UpdatePluginDto): Promise<Plugin> {
    // Check if plugin exists
    const existingPlugin = await this.prisma.plugin.findFirst({
      where: { id, tenantId },
    })

    if (!existingPlugin) {
      throw new NotFoundException(`Plugin with ID ${id} not found`)
    }

    const updatedPlugin = await this.prisma.plugin.update({
      where: { id },
      data: dto,
    })

    return this.mapToPlugin(updatedPlugin)
  }

  /**
   * Delete a plugin
   */
  async remove(id: string, tenantId: string): Promise<void> {
    // Check if plugin exists
    const plugin = await this.prisma.plugin.findFirst({
      where: { id, tenantId },
    })

    if (!plugin) {
      throw new NotFoundException(`Plugin with ID ${id} not found`)
    }

    await this.prisma.plugin.delete({
      where: { id },
    })
  }

  /**
   * Activate a plugin
   */
  async activate(id: string, tenantId: string): Promise<Plugin> {
    const plugin = await this.findOne(id, tenantId)

    if (!plugin.isInstalled) {
      throw new BadRequestException('Plugin must be installed before activation')
    }

    return this.update(id, tenantId, { isActive: true })
  }

  /**
   * Deactivate a plugin
   */
  async deactivate(id: string, tenantId: string): Promise<Plugin> {
    return this.update(id, tenantId, { isActive: false })
  }

  /**
   * Map Prisma plugin to domain plugin
   */
  private mapToPlugin(prismaPlugin: {
    id: string
    name: string
    version: string
    author: string
    description: string
    category: string
    icon: string | null
    manifest: unknown
    isInstalled: boolean
    isActive: boolean
    downloads: number
    rating: number | null
    createdAt: Date
    updatedAt: Date
  }): Plugin {
    return {
      id: prismaPlugin.id,
      name: prismaPlugin.name,
      version: prismaPlugin.version,
      author: prismaPlugin.author,
      description: prismaPlugin.description,
      category: prismaPlugin.category,
      icon: prismaPlugin.icon || undefined,
      manifest: prismaPlugin.manifest as PluginManifest,
      isInstalled: prismaPlugin.isInstalled,
      isActive: prismaPlugin.isActive,
      downloads: prismaPlugin.downloads || undefined,
      rating: prismaPlugin.rating || undefined,
      createdAt: prismaPlugin.createdAt,
      updatedAt: prismaPlugin.updatedAt,
    }
  }
}
