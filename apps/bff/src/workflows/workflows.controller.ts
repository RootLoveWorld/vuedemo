import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common'
import { WorkflowsService } from './workflows.service'
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

interface RequestWithUser {
  user: {
    id: string
    tenantId: string
    email: string
  }
}

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  /**
   * Create a new workflow
   * POST /workflows
   */
  @Post()
  async create(@Req() req: RequestWithUser, @Body() createWorkflowDto: CreateWorkflowDto) {
    const userId = req.user.id
    const tenantId = req.user.tenantId

    return this.workflowsService.create(userId, tenantId, createWorkflowDto)
  }

  /**
   * Get all workflows
   * GET /workflows
   */
  @Get()
  async findAll(
    @Req() req: RequestWithUser,
    @Query('userId') userId?: string,
    @Query('isActive') isActive?: string
  ) {
    const tenantId = req.user.tenantId
    const isActiveBoolean = isActive === 'true' ? true : isActive === 'false' ? false : undefined

    return this.workflowsService.findAll(tenantId, userId, isActiveBoolean)
  }

  /**
   * Get a workflow by ID
   * GET /workflows/:id
   */
  @Get(':id')
  async findOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    const tenantId = req.user.tenantId

    return this.workflowsService.findOne(id, tenantId)
  }

  /**
   * Update a workflow
   * PUT /workflows/:id
   */
  @Put(':id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto
  ) {
    const userId = req.user.id
    const tenantId = req.user.tenantId

    return this.workflowsService.update(id, tenantId, userId, updateWorkflowDto)
  }

  /**
   * Delete a workflow
   * DELETE /workflows/:id
   */
  @Delete(':id')
  async remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    const userId = req.user.id
    const tenantId = req.user.tenantId

    await this.workflowsService.remove(id, tenantId, userId)

    return { message: 'Workflow deleted successfully' }
  }

  /**
   * Clone a workflow
   * POST /workflows/:id/clone
   */
  @Post(':id/clone')
  async clone(@Req() req: RequestWithUser, @Param('id') id: string, @Body('name') name?: string) {
    const userId = req.user.id
    const tenantId = req.user.tenantId

    return this.workflowsService.clone(id, tenantId, userId, name)
  }

  /**
   * Get version history for a workflow
   * GET /workflows/:id/versions
   */
  @Get(':id/versions')
  async getVersionHistory(@Param('id') id: string) {
    return this.workflowsService.getVersionHistory(id)
  }

  /**
   * Get a specific version
   * GET /workflows/:id/versions/:version
   */
  @Get(':id/versions/:version')
  async getVersion(@Param('id') id: string, @Param('version') version: string) {
    return this.workflowsService.getVersion(id, parseInt(version, 10))
  }

  /**
   * Compare two versions
   * GET /workflows/:id/versions/:oldVersion/compare/:newVersion
   */
  @Get(':id/versions/:oldVersion/compare/:newVersion')
  async compareVersions(
    @Param('id') id: string,
    @Param('oldVersion') oldVersion: string,
    @Param('newVersion') newVersion: string
  ) {
    return this.workflowsService.compareVersions(
      id,
      parseInt(oldVersion, 10),
      parseInt(newVersion, 10)
    )
  }

  /**
   * Rollback to a specific version
   * POST /workflows/:id/versions/:version/rollback
   */
  @Post(':id/versions/:version/rollback')
  async rollbackToVersion(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('version') version: string
  ) {
    const userId = req.user.id

    await this.workflowsService.rollbackToVersion(id, parseInt(version, 10), userId)

    return { message: 'Workflow rolled back successfully' }
  }
}
