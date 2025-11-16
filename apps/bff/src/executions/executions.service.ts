import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AiServiceClient } from '../ai-service/ai-service.client'
import { ExecutionsGateway } from './executions.gateway'
import { CreateExecutionDto, ExecutionResponseDto } from './dto'

@Injectable()
export class ExecutionsService {
  private readonly logger = new Logger(ExecutionsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiServiceClient: AiServiceClient,
    @Inject(forwardRef(() => ExecutionsGateway))
    private readonly executionsGateway: ExecutionsGateway
  ) {}

  /**
   * Create and trigger a new workflow execution
   */
  async create(userId: string, dto: CreateExecutionDto): Promise<ExecutionResponseDto> {
    this.logger.log(`Creating execution for workflow ${dto.workflowId} by user ${userId}`)

    // Verify workflow exists and user has access
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: dto.workflowId,
        userId,
      },
    })

    if (!workflow) {
      throw new NotFoundException('Workflow not found or access denied')
    }

    // Validate workflow definition
    if (!workflow.definition || typeof workflow.definition !== 'object') {
      throw new BadRequestException('Invalid workflow definition')
    }

    // Create execution record
    const execution = await this.prisma.execution.create({
      data: {
        workflowId: dto.workflowId,
        userId,
        status: 'pending',
        inputData: dto.inputData || {},
      },
    })

    this.logger.log(`Execution ${execution.id} created with status: pending`)

    // Trigger async execution (will be implemented in next subtask)
    this.executeWorkflowAsync(execution.id, workflow.definition, dto.inputData || {}).catch(
      (error) => {
        this.logger.error(`Failed to execute workflow ${execution.id}:`, error)
      }
    )

    return this.mapToResponseDto(execution)
  }

  /**
   * Get all executions for a user
   */
  async findAll(
    userId: string,
    workflowId?: string,
    status?: string
  ): Promise<ExecutionResponseDto[]> {
    const where: any = { userId }

    if (workflowId) {
      where.workflowId = workflowId
    }

    if (status) {
      where.status = status
    }

    const executions = await this.prisma.execution.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to last 100 executions
    })

    return executions.map((execution) => this.mapToResponseDto(execution))
  }

  /**
   * Get a specific execution by ID
   */
  async findOne(userId: string, id: string): Promise<ExecutionResponseDto> {
    const execution = await this.prisma.execution.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        logs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!execution) {
      throw new NotFoundException('Execution not found')
    }

    return this.mapToResponseDto(execution)
  }

  /**
   * Stop a running execution
   */
  async stop(userId: string, id: string, reason?: string): Promise<ExecutionResponseDto> {
    const execution = await this.prisma.execution.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!execution) {
      throw new NotFoundException('Execution not found')
    }

    if (execution.status !== 'running' && execution.status !== 'pending') {
      throw new BadRequestException('Execution is not running')
    }

    // Update execution status
    const updated = await this.prisma.execution.update({
      where: { id },
      data: {
        status: 'failed',
        errorMessage: reason || 'Stopped by user',
        completedAt: new Date(),
      },
    })

    this.logger.log(`Execution ${id} stopped by user`)

    // Send stop signal to AI Service
    try {
      await this.aiServiceClient.stopExecution(id, reason)
      this.logger.log(`Stop signal sent to AI Service for execution ${id}`)
    } catch (error) {
      this.logger.warn(`Failed to send stop signal to AI Service for execution ${id}:`, error)
      // Continue anyway since we've already updated the database
    }

    return this.mapToResponseDto(updated)
  }

  /**
   * Get execution logs with filtering and pagination
   */
  async getLogs(
    userId: string,
    executionId: string,
    options?: {
      level?: string
      nodeId?: string
      limit?: number
      offset?: number
      search?: string
    }
  ) {
    const execution = await this.prisma.execution.findFirst({
      where: {
        id: executionId,
        userId,
      },
    })

    if (!execution) {
      throw new NotFoundException('Execution not found')
    }

    // Build where clause
    const where: any = { executionId }

    if (options?.level) {
      where.level = options.level
    }

    if (options?.nodeId) {
      where.nodeId = options.nodeId
    }

    if (options?.search) {
      where.message = {
        contains: options.search,
        mode: 'insensitive',
      }
    }

    // Get total count
    const total = await this.prisma.executionLog.count({ where })

    // Get logs with pagination
    const logs = await this.prisma.executionLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    })

    return {
      logs,
      total,
      limit: options?.limit || 100,
      offset: options?.offset || 0,
    }
  }

  /**
   * Stream execution logs (for real-time log viewing)
   */
  async streamLogs(userId: string, executionId: string, fromTimestamp?: Date) {
    const execution = await this.prisma.execution.findFirst({
      where: {
        id: executionId,
        userId,
      },
    })

    if (!execution) {
      throw new NotFoundException('Execution not found')
    }

    const where: any = { executionId }

    if (fromTimestamp) {
      where.createdAt = {
        gt: fromTimestamp,
      }
    }

    const logs = await this.prisma.executionLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })

    return logs
  }

  /**
   * Get log statistics for an execution
   */
  async getLogStats(userId: string, executionId: string) {
    const execution = await this.prisma.execution.findFirst({
      where: {
        id: executionId,
        userId,
      },
    })

    if (!execution) {
      throw new NotFoundException('Execution not found')
    }

    const stats = await this.prisma.executionLog.groupBy({
      by: ['level'],
      where: { executionId },
      _count: {
        level: true,
      },
    })

    return stats.reduce(
      (acc, stat) => {
        acc[stat.level] = stat._count.level
        return acc
      },
      {} as Record<string, number>
    )
  }

  /**
   * Update execution status (called by AI Service or WebSocket)
   */
  async updateStatus(
    executionId: string,
    status: string,
    outputData?: any,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = { status }

    if (status === 'running' && !outputData) {
      updateData.startedAt = new Date()
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date()
    }

    if (outputData) {
      updateData.outputData = outputData
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage
    }

    await this.prisma.execution.update({
      where: { id: executionId },
      data: updateData,
    })

    this.logger.log(`Execution ${executionId} status updated to: ${status}`)

    // Send WebSocket update to subscribed clients
    if (status === 'completed') {
      this.executionsGateway.sendResult(executionId, outputData)
    } else if (status === 'failed') {
      this.executionsGateway.sendError(executionId, errorMessage || 'Execution failed')
    } else {
      this.executionsGateway.sendStatus(executionId, status)
    }
  }

  /**
   * Add execution log entry
   */
  async addLog(
    executionId: string,
    level: string,
    message: string,
    nodeId?: string,
    metadata?: any
  ): Promise<void> {
    await this.prisma.executionLog.create({
      data: {
        executionId,
        level,
        message,
        nodeId,
        metadata,
      },
    })

    // Send WebSocket log update to subscribed clients
    this.executionsGateway.sendLog(executionId, {
      level,
      message,
      nodeId,
      metadata,
    })
  }

  /**
   * Execute workflow asynchronously using AI Service
   */
  private async executeWorkflowAsync(
    executionId: string,
    definition: any,
    inputData: any
  ): Promise<void> {
    try {
      // Update status to running
      await this.updateStatus(executionId, 'running')

      // Call AI Service to execute workflow
      this.logger.log(`Calling AI Service to execute workflow for execution ${executionId}`)

      const response = await this.aiServiceClient.executeWorkflow({
        executionId,
        definition,
        inputData,
      })

      this.logger.log(
        `AI Service accepted execution ${executionId} with status: ${response.status}`
      )

      // Note: The actual execution status updates will come through WebSocket
      // from the AI Service as it processes the workflow
    } catch (error) {
      this.logger.error(`Failed to trigger execution ${executionId} on AI Service:`, error)
      await this.updateStatus(
        executionId,
        'failed',
        null,
        error.message || 'Failed to communicate with AI Service'
      )
    }
  }

  /**
   * Map Prisma execution to response DTO
   */
  private mapToResponseDto(execution: any): ExecutionResponseDto {
    return {
      id: execution.id,
      workflowId: execution.workflowId,
      userId: execution.userId,
      status: execution.status,
      inputData: execution.inputData,
      outputData: execution.outputData,
      errorMessage: execution.errorMessage,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      createdAt: execution.createdAt,
    }
  }
}
