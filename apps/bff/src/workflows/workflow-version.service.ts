import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { WorkflowDefinition } from '@workflow/shared-types'

export interface WorkflowVersion {
  id: string
  version: number
  definition: WorkflowDefinition
  changelog?: string
  createdAt: Date
}

export interface VersionComparison {
  oldVersion: number
  newVersion: number
  changes: {
    nodesAdded: string[]
    nodesRemoved: string[]
    nodesModified: string[]
    edgesAdded: string[]
    edgesRemoved: string[]
  }
}

@Injectable()
export class WorkflowVersionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new version when workflow definition changes
   */
  async createVersion(
    workflowId: string,
    version: number,
    definition: WorkflowDefinition,
    changelog?: string
  ): Promise<WorkflowVersion> {
    const versionRecord = await this.prisma.workflowVersion.create({
      data: {
        workflowId,
        version,
        definition: definition as any,
        changelog,
      },
    })

    return {
      id: versionRecord.id,
      version: versionRecord.version,
      definition: versionRecord.definition as unknown as WorkflowDefinition,
      changelog: versionRecord.changelog || undefined,
      createdAt: versionRecord.createdAt,
    }
  }

  /**
   * Get all versions for a workflow
   */
  async getVersions(workflowId: string): Promise<WorkflowVersion[]> {
    const versions = await this.prisma.workflowVersion.findMany({
      where: { workflowId },
      orderBy: { version: 'desc' },
    })

    return versions.map((v: any) => ({
      id: v.id,
      version: v.version,
      definition: v.definition as unknown as WorkflowDefinition,
      changelog: v.changelog || undefined,
      createdAt: v.createdAt,
    }))
  }

  /**
   * Get a specific version
   */
  async getVersion(workflowId: string, version: number): Promise<WorkflowVersion> {
    const versionRecord = await this.prisma.workflowVersion.findUnique({
      where: {
        workflowId_version: {
          workflowId,
          version,
        },
      },
    })

    if (!versionRecord) {
      throw new NotFoundException(`Version ${version} not found for workflow ${workflowId}`)
    }

    return {
      id: versionRecord.id,
      version: versionRecord.version,
      definition: versionRecord.definition as unknown as WorkflowDefinition,
      changelog: versionRecord.changelog || undefined,
      createdAt: versionRecord.createdAt,
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    workflowId: string,
    oldVersion: number,
    newVersion: number
  ): Promise<VersionComparison> {
    const [oldVersionData, newVersionData] = await Promise.all([
      this.getVersion(workflowId, oldVersion),
      this.getVersion(workflowId, newVersion),
    ])

    const oldDef = oldVersionData.definition
    const newDef = newVersionData.definition

    // Compare nodes
    const oldNodeIds = new Set(oldDef.nodes.map((n) => n.id))
    const newNodeIds = new Set(newDef.nodes.map((n) => n.id))

    const nodesAdded = newDef.nodes
      .filter((n) => !oldNodeIds.has(n.id))
      .map((n) => `${n.data.label} (${n.id})`)

    const nodesRemoved = oldDef.nodes
      .filter((n) => !newNodeIds.has(n.id))
      .map((n) => `${n.data.label} (${n.id})`)

    // Check for modified nodes
    const nodesModified: string[] = []
    for (const newNode of newDef.nodes) {
      const oldNode = oldDef.nodes.find((n) => n.id === newNode.id)
      if (oldNode && JSON.stringify(oldNode) !== JSON.stringify(newNode)) {
        nodesModified.push(`${newNode.data.label} (${newNode.id})`)
      }
    }

    // Compare edges
    const oldEdgeIds = new Set(oldDef.edges.map((e) => e.id))
    const newEdgeIds = new Set(newDef.edges.map((e) => e.id))

    const edgesAdded = newDef.edges
      .filter((e) => !oldEdgeIds.has(e.id))
      .map((e) => `${e.source} -> ${e.target}`)

    const edgesRemoved = oldDef.edges
      .filter((e) => !newEdgeIds.has(e.id))
      .map((e) => `${e.source} -> ${e.target}`)

    return {
      oldVersion,
      newVersion,
      changes: {
        nodesAdded,
        nodesRemoved,
        nodesModified,
        edgesAdded,
        edgesRemoved,
      },
    }
  }

  /**
   * Rollback workflow to a specific version
   */
  async rollbackToVersion(
    workflowId: string,
    targetVersion: number,
    userId: string
  ): Promise<void> {
    // Get the target version
    const versionData = await this.getVersion(workflowId, targetVersion)

    // Get current workflow
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    })

    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`)
    }

    // Check ownership
    if (workflow.userId !== userId) {
      throw new BadRequestException('You do not have permission to rollback this workflow')
    }

    // Create a new version with the old definition
    const newVersion = workflow.version + 1

    // Save current version before rollback
    await this.createVersion(
      workflowId,
      workflow.version,
      workflow.definition as unknown as WorkflowDefinition,
      `Version before rollback to v${targetVersion}`
    )

    // Update workflow with the target version's definition
    const rolledBackDefinition: WorkflowDefinition = {
      ...versionData.definition,
      id: workflowId,
      version: newVersion,
    }

    await this.prisma.workflow.update({
      where: { id: workflowId },
      data: {
        definition: rolledBackDefinition as any,
        version: newVersion,
      },
    })

    // Create a new version record for the rollback
    await this.createVersion(
      workflowId,
      newVersion,
      rolledBackDefinition,
      `Rolled back to version ${targetVersion}`
    )
  }

  /**
   * Delete old versions (keep only the last N versions)
   */
  async pruneOldVersions(workflowId: string, keepCount: number = 10): Promise<number> {
    const versions = await this.prisma.workflowVersion.findMany({
      where: { workflowId },
      orderBy: { version: 'desc' },
      select: { id: true },
    })

    if (versions.length <= keepCount) {
      return 0
    }

    const versionsToDelete = versions.slice(keepCount)
    const deleteResult = await this.prisma.workflowVersion.deleteMany({
      where: {
        id: {
          in: versionsToDelete.map((v) => v.id),
        },
      },
    })

    return deleteResult.count
  }

  /**
   * Get version history summary
   */
  async getVersionHistory(workflowId: string): Promise<
    Array<{
      version: number
      changelog?: string
      createdAt: Date
      nodeCount: number
      edgeCount: number
    }>
  > {
    const versions = await this.getVersions(workflowId)

    return versions.map((v: unknown) => ({
      version: v.version,
      changelog: v.changelog,
      createdAt: v.createdAt,
      nodeCount: v.definition.nodes.length,
      edgeCount: v.definition.edges.length,
    }))
  }
}
