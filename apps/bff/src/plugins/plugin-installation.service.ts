import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { PluginStorageService } from './plugin-storage.service'
import { PluginValidationService } from './plugin-validation.service'
import { PluginsService } from './plugins.service'
import AdmZip = require('adm-zip')
import * as path from 'path'
import * as fs from 'fs/promises'
import { firstValueFrom } from 'rxjs'
import type { PluginManifest } from '@workflow/shared-types'
import { Buffer } from 'buffer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZipEntry = any

export interface PluginInstallProgress {
  pluginId: string
  status: 'downloading' | 'extracting' | 'installing' | 'completed' | 'failed'
  progress: number
  message?: string
  error?: string
}

@Injectable()
export class PluginInstallationService {
  private readonly logger = new Logger(PluginInstallationService.name)
  private readonly installProgressMap = new Map<string, PluginInstallProgress>()

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly storageService: PluginStorageService,
    private readonly validationService: PluginValidationService,
    private readonly pluginsService: PluginsService
  ) {}

  /**
   * Install a plugin from a file
   */
  async installPlugin(
    tenantId: string,
    pluginId: string,
    fileBuffer: Buffer
  ): Promise<PluginInstallProgress> {
    const progress: PluginInstallProgress = {
      pluginId,
      status: 'extracting',
      progress: 0,
      message: 'Starting plugin installation',
    }

    this.installProgressMap.set(pluginId, progress)

    try {
      // Step 1: Extract plugin package
      this.updateProgress(pluginId, 'extracting', 10, 'Extracting plugin package')
      const { manifest, files } = await this.extractPluginPackage(fileBuffer)

      // Step 2: Validate plugin
      this.updateProgress(pluginId, 'extracting', 30, 'Validating plugin')
      await this.validationService.validatePlugin(manifest, fileBuffer)

      // Step 3: Install frontend resources
      this.updateProgress(pluginId, 'installing', 50, 'Installing frontend resources')
      if (manifest.frontend) {
        await this.installFrontendResources(tenantId, pluginId, files, manifest)
      }

      // Step 4: Notify AI Service to install backend
      this.updateProgress(pluginId, 'installing', 70, 'Installing backend components')
      if (manifest.backend) {
        await this.notifyAIServiceInstall(tenantId, pluginId, manifest)
      }

      // Step 5: Update plugin status
      this.updateProgress(pluginId, 'installing', 90, 'Updating plugin status')
      await this.pluginsService.update(pluginId, tenantId, {
        isInstalled: true,
      })

      // Step 6: Complete
      this.updateProgress(pluginId, 'completed', 100, 'Plugin installed successfully')

      return this.installProgressMap.get(pluginId)!
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Plugin installation failed: ${errorMessage}`)
      this.updateProgress(pluginId, 'failed', 0, 'Installation failed', errorMessage)
      throw error
    }
  }

  /**
   * Extract plugin package and read manifest
   */
  private async extractPluginPackage(
    fileBuffer: Buffer
  ): Promise<{ manifest: PluginManifest; files: Map<string, Buffer> }> {
    try {
      const zip = new AdmZip(fileBuffer)
      const zipEntries = zip.getEntries()

      // Find and read manifest.json
      const manifestEntry = zipEntries.find(
        (entry: ZipEntry) => entry.entryName === 'manifest.json'
      )
      if (!manifestEntry) {
        throw new BadRequestException('Plugin package must contain manifest.json')
      }

      const manifestContent = manifestEntry.getData().toString('utf8')
      const manifest: PluginManifest = JSON.parse(manifestContent)

      // Extract all files
      const files = new Map<string, Buffer>()
      for (const entry of zipEntries) {
        if (!entry.isDirectory) {
          files.set(entry.entryName, entry.getData())
        }
      }

      return { manifest, files }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Failed to extract plugin package: ${errorMessage}`)
      throw new BadRequestException(`Failed to extract plugin package: ${errorMessage}`)
    }
  }

  /**
   * Install frontend resources
   */
  private async installFrontendResources(
    tenantId: string,
    pluginId: string,
    files: Map<string, Buffer>,
    _manifest: PluginManifest
  ): Promise<void> {
    try {
      // Get frontend directory from config
      const frontendPluginDir = this.configService.get<string>(
        'FRONTEND_PLUGIN_DIR',
        './apps/frontend/src/plugins/installed'
      )

      // Create plugin directory
      const pluginDir = path.join(frontendPluginDir, pluginId)
      await fs.mkdir(pluginDir, { recursive: true })

      // Write frontend files
      for (const [filePath, content] of files.entries()) {
        // Only copy frontend files
        if (filePath.startsWith('frontend/')) {
          const relativePath = filePath.replace('frontend/', '')
          const targetPath = path.join(pluginDir, relativePath)

          // Create directory if needed
          const targetDir = path.dirname(targetPath)
          await fs.mkdir(targetDir, { recursive: true })

          // Write file
          await fs.writeFile(targetPath, content)
          this.logger.log(`Installed frontend file: ${targetPath}`)
        }
      }

      // Also upload to storage for backup
      const frontendZip = new AdmZip()
      for (const [filePath, content] of files.entries()) {
        if (filePath.startsWith('frontend/')) {
          frontendZip.addFile(filePath, content)
        }
      }

      const frontendZipBuffer = frontendZip.toBuffer()
      await this.storageService.uploadPlugin(
        tenantId,
        pluginId,
        'frontend.zip',
        frontendZipBuffer,
        'application/zip'
      )

      this.logger.log(`Frontend resources installed for plugin: ${pluginId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Failed to install frontend resources: ${errorMessage}`)
      throw new Error(`Failed to install frontend resources: ${errorMessage}`)
    }
  }

  /**
   * Notify AI Service to install backend components
   */
  private async notifyAIServiceInstall(
    tenantId: string,
    pluginId: string,
    manifest: PluginManifest
  ): Promise<void> {
    try {
      const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000')

      const response = await firstValueFrom(
        this.httpService.post(`${aiServiceUrl}/api/v1/plugins/install`, {
          tenantId,
          pluginId,
          manifest,
        })
      )

      this.logger.log(`AI Service notified for plugin installation: ${pluginId}`)
      return response.data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Failed to notify AI Service: ${errorMessage}`)
      // Don't throw error if AI Service is not available
      this.logger.warn('Continuing without AI Service installation')
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(tenantId: string, pluginId: string): Promise<void> {
    try {
      // Get plugin info
      const plugin = await this.pluginsService.findOne(pluginId, tenantId)

      // Remove frontend resources
      if (plugin.manifest.frontend) {
        await this.removeFrontendResources(pluginId)
      }

      // Notify AI Service to uninstall backend
      if (plugin.manifest.backend) {
        await this.notifyAIServiceUninstall(tenantId, pluginId)
      }

      // Update plugin status
      await this.pluginsService.update(pluginId, tenantId, {
        isInstalled: false,
        isActive: false,
      })

      this.logger.log(`Plugin uninstalled: ${pluginId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Failed to uninstall plugin: ${errorMessage}`)
      throw error
    }
  }

  /**
   * Remove frontend resources
   */
  private async removeFrontendResources(pluginId: string): Promise<void> {
    try {
      const frontendPluginDir = this.configService.get<string>(
        'FRONTEND_PLUGIN_DIR',
        './apps/frontend/src/plugins/installed'
      )

      const pluginDir = path.join(frontendPluginDir, pluginId)

      // Remove directory recursively
      await fs.rm(pluginDir, { recursive: true, force: true })

      this.logger.log(`Frontend resources removed for plugin: ${pluginId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Failed to remove frontend resources: ${errorMessage}`)
      // Don't throw error if directory doesn't exist
    }
  }

  /**
   * Notify AI Service to uninstall backend components
   */
  private async notifyAIServiceUninstall(tenantId: string, pluginId: string): Promise<void> {
    try {
      const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000')

      await firstValueFrom(
        this.httpService.delete(`${aiServiceUrl}/api/v1/plugins/${pluginId}`, {
          data: { tenantId },
        })
      )

      this.logger.log(`AI Service notified for plugin uninstallation: ${pluginId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Failed to notify AI Service: ${errorMessage}`)
      // Don't throw error if AI Service is not available
    }
  }

  /**
   * Get installation progress
   */
  getInstallProgress(pluginId: string): PluginInstallProgress | undefined {
    return this.installProgressMap.get(pluginId)
  }

  /**
   * Update installation progress
   */
  private updateProgress(
    pluginId: string,
    status: PluginInstallProgress['status'],
    progress: number,
    message?: string,
    error?: string
  ): void {
    const currentProgress = this.installProgressMap.get(pluginId)
    if (currentProgress) {
      currentProgress.status = status
      currentProgress.progress = progress
      currentProgress.message = message
      currentProgress.error = error
      this.installProgressMap.set(pluginId, currentProgress)
    }
  }
}
