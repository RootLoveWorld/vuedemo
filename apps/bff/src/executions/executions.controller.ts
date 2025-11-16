import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { ExecutionsService } from './executions.service'
import { CreateExecutionDto, ExecutionResponseDto, StopExecutionDto } from './dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@ApiTags('executions')
@ApiBearerAuth()
@Controller('executions')
@UseGuards(JwtAuthGuard)
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create and trigger a new workflow execution' })
  @ApiResponse({
    status: 201,
    description: 'Execution created successfully',
    type: ExecutionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 400, description: 'Invalid workflow definition' })
  async create(
    @CurrentUser() user: any,
    @Body() createExecutionDto: CreateExecutionDto
  ): Promise<ExecutionResponseDto> {
    return this.executionsService.create(user.id, createExecutionDto)
  }

  @Get()
  @ApiOperation({ summary: 'Get all executions for the current user' })
  @ApiQuery({ name: 'workflowId', required: false, description: 'Filter by workflow ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiResponse({
    status: 200,
    description: 'List of executions',
    type: [ExecutionResponseDto],
  })
  async findAll(
    @CurrentUser() user: any,
    @Query('workflowId') workflowId?: string,
    @Query('status') status?: string
  ): Promise<ExecutionResponseDto[]> {
    return this.executionsService.findAll(user.id, workflowId, status)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific execution by ID' })
  @ApiResponse({
    status: 200,
    description: 'Execution details',
    type: ExecutionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string): Promise<ExecutionResponseDto> {
    return this.executionsService.findOne(user.id, id)
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop a running execution' })
  @ApiResponse({
    status: 200,
    description: 'Execution stopped successfully',
    type: ExecutionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  @ApiResponse({ status: 400, description: 'Execution is not running' })
  async stop(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() stopExecutionDto: StopExecutionDto
  ): Promise<ExecutionResponseDto> {
    return this.executionsService.stop(user.id, id, stopExecutionDto.reason)
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get execution logs with filtering and pagination' })
  @ApiQuery({ name: 'level', required: false, description: 'Filter by log level' })
  @ApiQuery({ name: 'nodeId', required: false, description: 'Filter by node ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of logs to return',
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of logs to skip',
    type: Number,
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for log messages' })
  @ApiResponse({
    status: 200,
    description: 'Execution logs with pagination',
  })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async getLogs(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('level') level?: string,
    @Query('nodeId') nodeId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('search') search?: string
  ) {
    return this.executionsService.getLogs(user.id, id, {
      level,
      nodeId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      search,
    })
  }

  @Get(':id/logs/stream')
  @ApiOperation({ summary: 'Stream execution logs from a specific timestamp' })
  @ApiQuery({ name: 'from', required: false, description: 'ISO timestamp to stream logs from' })
  @ApiResponse({
    status: 200,
    description: 'Streamed execution logs',
  })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async streamLogs(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('from') from?: string
  ) {
    const fromTimestamp = from ? new Date(from) : undefined
    return this.executionsService.streamLogs(user.id, id, fromTimestamp)
  }

  @Get(':id/logs/stats')
  @ApiOperation({ summary: 'Get log statistics for an execution' })
  @ApiResponse({
    status: 200,
    description: 'Log statistics grouped by level',
  })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async getLogStats(@CurrentUser() user: any, @Param('id') id: string) {
    return this.executionsService.getLogStats(user.id, id)
  }
}
