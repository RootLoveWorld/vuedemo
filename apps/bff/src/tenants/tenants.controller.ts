import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common'
import { TenantsService } from './tenants.service'
import { TenantUsageService } from './tenant-usage.service'
import { CreateTenantDto, UpdateTenantDto } from './dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard, RequireRoles } from '../common/guards/roles.guard'

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly tenantUsageService: TenantUsageService
  ) {}

  /**
   * Create a new tenant
   * Only super admins can create tenants
   */
  @Post()
  @UseGuards(RolesGuard)
  @RequireRoles('super_admin')
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto)
  }

  /**
   * Get all tenants
   * Only super admins can list all tenants
   */
  @Get()
  @UseGuards(RolesGuard)
  @RequireRoles('super_admin')
  findAll() {
    return this.tenantsService.findAll()
  }

  /**
   * Get tenant by ID
   * Admins can view their own tenant, super admins can view any
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @RequireRoles('admin', 'super_admin')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id)
  }

  /**
   * Update tenant
   * Only super admins can update tenants
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @RequireRoles('super_admin')
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantsService.update(id, updateTenantDto)
  }

  /**
   * Deactivate tenant (soft delete)
   * Only super admins can deactivate tenants
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @RequireRoles('super_admin')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id)
  }

  /**
   * Hard delete tenant
   * Only super admins can permanently delete tenants
   */
  @Delete(':id/hard')
  @UseGuards(RolesGuard)
  @RequireRoles('super_admin')
  @HttpCode(HttpStatus.OK)
  hardDelete(@Param('id') id: string) {
    return this.tenantsService.hardDelete(id)
  }

  /**
   * Activate tenant
   * Only super admins can activate tenants
   */
  @Post(':id/activate')
  @UseGuards(RolesGuard)
  @RequireRoles('super_admin')
  activate(@Param('id') id: string) {
    return this.tenantsService.activate(id)
  }

  /**
   * Get tenant usage statistics
   * Admins can view their own tenant usage, super admins can view any
   */
  @Get(':id/usage')
  @UseGuards(RolesGuard)
  @RequireRoles('admin', 'super_admin')
  getUsage(@Param('id') id: string) {
    return this.tenantUsageService.getTenantUsage(id)
  }

  /**
   * Get tenant usage trend
   */
  @Get(':id/usage/trend')
  @UseGuards(RolesGuard)
  @RequireRoles('admin', 'super_admin')
  getUsageTrend(@Param('id') id: string, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30
    return this.tenantUsageService.getTenantUsageTrend(id, daysNum)
  }

  /**
   * Get execution statistics by period
   */
  @Get(':id/usage/executions')
  @UseGuards(RolesGuard)
  @RequireRoles('admin', 'super_admin')
  getExecutionStats(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()
    return this.tenantUsageService.getExecutionStatsByPeriod(id, start, end)
  }

  /**
   * Get top workflows by execution count
   */
  @Get(':id/usage/top-workflows')
  @UseGuards(RolesGuard)
  @RequireRoles('admin', 'super_admin')
  getTopWorkflows(@Param('id') id: string, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10
    return this.tenantUsageService.getTopWorkflows(id, limitNum)
  }

  /**
   * Check usage limits
   */
  @Get(':id/usage/limits')
  @UseGuards(RolesGuard)
  @RequireRoles('admin', 'super_admin')
  checkUsageLimits(@Param('id') id: string) {
    return this.tenantUsageService.checkUsageLimits(id)
  }
}
