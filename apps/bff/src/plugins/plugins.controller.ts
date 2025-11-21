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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  StreamableFile,
  Res,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Response } from 'express'
import { PluginsService } from './plugins.service'
import { PluginStorageService } from './plugin-storage.service'
import { PluginValidationService } from './plugin-validation.service'
import { PluginInstallationService } from './plugin-installation.service'
import { CreatePluginDto, UpdatePluginDto } from './dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import type { PluginManifest } from '@workflow/shared-types'

interface RequestWithUser {
  user: {
    id: string
    tenantId: string
    email: string
  }
}

@Controller('plugins')
@UseGuards(JwtAuthGuard)
export class PluginsController {
  constructor(
    private readonly pluginsService: PluginsService,
    private readonly storageService: PluginStorageService,
    private readonly validationService: PluginValidationService,
    private readonly installationService: PluginInstallationService
  ) {}

  /**
   * Register a new plugin
   * POST /plugins
   */
  @Post()
  async register(@Req() req: RequestWithUser, @Body() createPluginDto: CreatePluginDto) {
    const tenantId = req.user.tenantId

    return this.pluginsService.register(tenantId, createPluginDto)
  }

  /**
   * Get all plugins
   * GET /plugins
   */
  @Get()
  async findAll(
    @Req() req: RequestWithUser,
    @Query('category') category?: string,
    @Query('isInstalled') isInstalled?: string
  ) {
    const tenantId = req.user.tenantId
    const isInstalledBoolean =
      isInstalled === 'true' ? true : isInstalled === 'false' ? false : undefined

    return this.pluginsService.findAll(tenantId, category, isInstalledBoolean)
  }

  /**
   * Get a plugin by ID
   * GET /plugins/:id
   */
  @Get(':id')
  async findOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    const tenantId = req.user.tenantId

    return this.pluginsService.findOne(id, tenantId)
  }

  /**
   * Update a plugin
   * PUT /plugins/:id
   */
  @Put(':id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() updatePluginDto: UpdatePluginDto
  ) {
    const tenantId = req.user.tenantId

    return this.pluginsService.update(id, tenantId, updatePluginDto)
  }

  /**
   * Delete a plugin
   * DELETE /plugins/:id
   */
  @Delete(':id')
  async remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    const tenantId = req.user.tenantId

    await this.pluginsService.remove(id, tenantId)

    return { message: 'Plugin deleted successfully' }
  }

  /**
   * Activate a plugin
   * POST /plugins/:id/activate
   */
  @Post(':id/activate')
  async activate(@Req() req: RequestWithUser, @Param('id') id: string) {
    const tenantId = req.user.tenantId

    return this.pluginsService.activate(id, tenantId)
  }

  /**
   * Deactivate a plugin
   * POST /plugins/:id/deactivate
   */
  @Post(':id/deactivate')
  async deactivate(@Req() req: RequestWithUser, @Param('id') id: string) {
    const tenantId = req.user.tenantId

    return this.pluginsService.deactivate(id, tenantId)
  }

  /**
   * Upload a plugin file
   * POST /plugins/:id/upload
   */
  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @UploadedFile() file: unknown
  ) {
    const tenantId = req.user.tenantId

    if (!file) {
      throw new BadRequestException('No file uploaded')
    }

    // Upload to MinIO
    const fileUrl = await this.storageService.uploadPlugin(
      tenantId,
      id,
      file.originalname,
      file.buffer,
      file.mimetype
    )

    // Update plugin with file URL
    await this.pluginsService.update(id, tenantId, { fileUrl })

    return { message: 'File uploaded successfully', fileUrl }
  }

  /**
   * Download a plugin file
   * GET /plugins/:id/download
   */
  @Get(':id/download')
  async downloadFile(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Query('fileName') fileName: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const tenantId = req.user.tenantId

    if (!fileName) {
      throw new BadRequestException('fileName query parameter is required')
    }

    // Download from MinIO
    const fileBuffer = await this.storageService.downloadPlugin(tenantId, id, fileName)

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    })

    return new StreamableFile(fileBuffer)
  }

  /**
   * Get a presigned download URL
   * GET /plugins/:id/download-url
   */
  @Get(':id/download-url')
  async getDownloadUrl(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Query('fileName') fileName: string
  ) {
    const tenantId = req.user.tenantId

    if (!fileName) {
      throw new BadRequestException('fileName query parameter is required')
    }

    const url = await this.storageService.getDownloadUrl(tenantId, id, fileName)

    return { url }
  }

  /**
   * Get a presigned upload URL
   * GET /plugins/:id/upload-url
   */
  @Get(':id/upload-url')
  async getUploadUrl(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Query('fileName') fileName: string
  ) {
    const tenantId = req.user.tenantId

    if (!fileName) {
      throw new BadRequestException('fileName query parameter is required')
    }

    const url = await this.storageService.getUploadUrl(tenantId, id, fileName)

    return { url }
  }

  /**
   * Validate a plugin manifest
   * POST /plugins/validate
   */
  @Post('validate')
  async validateManifest(@Body('manifest') manifest: PluginManifest) {
    try {
      await this.validationService.validatePlugin(manifest)
      return { valid: true, message: 'Plugin manifest is valid' }
    } catch (error) {
      return { valid: false, message: error.message }
    }
  }

  /**
   * Install a plugin
   * POST /plugins/:id/install
   */
  @Post(':id/install')
  @UseInterceptors(FileInterceptor('file'))
  async installPlugin(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @UploadedFile() file: any
  ) {
    const tenantId = req.user.tenantId

    if (!file) {
      throw new BadRequestException('No plugin file uploaded')
    }

    // Start installation process
    const progress = await this.installationService.installPlugin(tenantId, id, file.buffer)

    return progress
  }

  /**
   * Uninstall a plugin
   * POST /plugins/:id/uninstall
   */
  @Post(':id/uninstall')
  async uninstallPlugin(@Req() req: RequestWithUser, @Param('id') id: string) {
    const tenantId = req.user.tenantId

    await this.installationService.uninstallPlugin(tenantId, id)

    return { message: 'Plugin uninstalled successfully' }
  }

  /**
   * Get installation progress
   * GET /plugins/:id/install-progress
   */
  @Get(':id/install-progress')
  async getInstallProgress(@Param('id') id: string) {
    const progress = this.installationService.getInstallProgress(id)

    if (!progress) {
      throw new BadRequestException('No installation in progress for this plugin')
    }

    return progress
  }
}
