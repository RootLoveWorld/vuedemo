import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { PluginsController } from './plugins.controller'
import { PluginsService } from './plugins.service'
import { PluginStorageService } from './plugin-storage.service'
import { PluginValidationService } from './plugin-validation.service'
import { PluginInstallationService } from './plugin-installation.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule, HttpModule],
  controllers: [PluginsController],
  providers: [
    PluginsService,
    PluginStorageService,
    PluginValidationService,
    PluginInstallationService,
  ],
  exports: [
    PluginsService,
    PluginStorageService,
    PluginValidationService,
    PluginInstallationService,
  ],
})
export class PluginsModule {}
