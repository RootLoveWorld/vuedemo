import { Injectable, NotFoundException, ForbiddenException, Scope, Inject } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { PrismaService } from '../prisma/prisma.service'
import { WorkflowValidationService } from './workflow-validation.service'
import { WorkflowVersionService } from './workflow-version.service'
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto'
import type { Workflow, WorkflowListItem, WorkflowDefinition } from '@workflow/shared-types'

interface RequestWithUser {
  user: {
    id: string
    tenantId: string
  }
}

@Injectable({ scope: Scope.REQUEST })
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: WorkflowValidationService,
    private readonly versionService: WorkflowVersionService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {
    // Set tenant context from request
    if (this.request.user?.tenantId) {
      this.prisma.setTenantId(this.request.user.tenantId)
    }
  }

  /**
   * Create a new workflow
   */
  async create(userId: string, tenantId: string, dto: CreateWorkflowDto): Promise<Workflow> {
    // Validate workflow structure using validation service
    this.validationService.validateOrThrow(dto.definition)

    // Create workflow definition with proper structure
    const workflowDefinition: Partial<WorkflowDefinition> = {
      id: '', // Will be set after creation
      name: dto.name,
      description: dto.description,
      nodes: dto.definition.nodes,
      edges: dto.definition.edges,
      version: 1,
    }

    const workflow = await this.prisma.workflow.create({
      data: {
        name: dto.name,
        description: dto.description,
        definition: workflowDefinition as any,
        version: 1,
        userId,
        tenantId,
      },
    })

    // Update the definition with the actual workflow ID
    const updatedDefinition: WorkflowDefinition = {
      ...workflowDefinition,
      id: workflow.id,
    } as WorkflowDefinition

    const updatedWorkflow = await this.prisma.workflow.update({
      where: { id: workflow.id },
      data: { definition: updatedDefinition as any },
    })

    return this.mapToWorkflow(updatedWorkflow)
  }

  /**
   * Find all workflows for a tenant
   */
  async findAll(
    tenantId: string,
    userId?: string,
    isActive?: boolean
  ): Promise<WorkflowListItem[]> {
    const workflows = await this.prisma.workflow.findMany({
      where: {
        tenantId,
        ...(userId && { userId }),
        ...(isActive !== undefined && { isActive }),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        version: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return workflows.map((w) => ({
      ...w,
      description: w.description || undefined,
    }))
  }

  /**
   * Find one workflow by ID
   */
  async findOne(id: string, tenantId: string, userId?: string): Promise<Workflow> {
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id,
        tenantId,
        ...(userId && { userId }),
      },
    })

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`)
    }

    return this.mapToWorkflow(workflow)
  }

  /**
   * Update a workflow
   */
  async update(
    id: string,
    tenantId: string,
    userId: string,
    dto: UpdateWorkflowDto
  ): Promise<Workflow> {
    // Check if workflow exists and user has access
    const existingWorkflow = await this.prisma.workflow.findFirst({
      where: { id, tenantId },
    })

    if (!existingWorkflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`)
    }

    // Check ownership
    if (existingWorkflow.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this workflow')
    }

    // If definition is being updated, validate it
    if (dto.definition) {
      this.validationService.validateOrThrow(dto.definition)
    }

    // Prepare update data
    const updateData: {
      name?: string
      description?: string | null
      isActive?: boolean
      definition?: WorkflowDefinition
      version?: number
    } = {}

    if (dto.name !== undefined) {
      updateData.name = dto.name
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive
    }

    if (dto.definition) {
      // Save current version before updating
      await this.versionService.createVersion(
        existingWorkflow.id,
        existingWorkflow.version,
        existingWorkflow.definition as unknown as WorkflowDefinition,
        'Version before update'
      )

      // Increment version if definition changes
      const newVersion = existingWorkflow.version + 1
      const workflowDefinition: WorkflowDefinition = {
        id: existingWorkflow.id,
        name: dto.name || existingWorkflow.name,
        description: dto.description || existingWorkflow.description || undefined,
        nodes: dto.definition.nodes,
        edges: dto.definition.edges,
        version: newVersion,
      }

      updateData.definition = workflowDefinition
      updateData.version = newVersion

      // Create new version record
      await this.versionService.createVersion(
        existingWorkflow.id,
        newVersion,
        workflowDefinition,
        'Updated workflow definition'
      )
    }

    const updatedWorkflow = await this.prisma.workflow.update({
      where: { id },
      data: updateData as any,
    })

    return this.mapToWorkflow(updatedWorkflow)
  }

  /**
   * Delete a workflow
   */
  async remove(id: string, tenantId: string, userId: string): Promise<void> {
    // Check if workflow exists and user has access
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, tenantId },
    })

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`)
    }

    // Check ownership
    if (workflow.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this workflow')
    }

    await this.prisma.workflow.delete({
      where: { id },
    })
  }

  /**
   * Clone a workflow
   */
  async clone(id: string, tenantId: string, userId: string, newName?: string): Promise<Workflow> {
    // Get the original workflow
    const originalWorkflow = await this.findOne(id, tenantId)

    // Create a new workflow with the same definition
    const clonedWorkflow = await this.create(userId, tenantId, {
      name: newName || `${originalWorkflow.name} (Copy)`,
      description: originalWorkflow.description,
      definition: {
        name: newName || `${originalWorkflow.name} (Copy)`,
        description: originalWorkflow.description,
        nodes: (originalWorkflow.definition as any).nodes,
        edges: (originalWorkflow.definition as any).edges,
      },
    })

    return clonedWorkflow
  }

  /**
   * Map Prisma workflow to domain workflow
   */
  private mapToWorkflow(prismaWorkflow: {
    id: string
    name: string
    description: string | null
    definition: unknown
    version: number
    isActive: boolean
    userId: string
    createdAt: Date
    updatedAt: Date
  }): Workflow {
    return {
      id: prismaWorkflow.id,
      name: prismaWorkflow.name,
      description: prismaWorkflow.description || undefined,
      definition: prismaWorkflow.definition as WorkflowDefinition,
      version: prismaWorkflow.version,
      isActive: prismaWorkflow.isActive,
      userId: prismaWorkflow.userId,
      createdAt: prismaWorkflow.createdAt,
      updatedAt: prismaWorkflow.updatedAt,
    }
  }

  /**
   * Get version history for a workflow
   */
  async getVersionHistory(id: string) {
    return this.versionService.getVersionHistory(id)
  }

  /**
   * Get a specific version
   */
  async getVersion(id: string, version: number) {
    return this.versionService.getVersion(id, version)
  }

  /**
   * Compare two versions
   */
  async compareVersions(id: string, oldVersion: number, newVersion: number) {
    return this.versionService.compareVersions(id, oldVersion, newVersion)
  }

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(id: string, version: number, userId: string) {
    return this.versionService.rollbackToVersion(id, version, userId)
  }
}
