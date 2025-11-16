import { Module } from '@nestjs/common'
import { TenantsService } from './tenants.service'
import { TenantsController } from './tenants.controller'
import { TenantResourcesService } from './tenant-resources.service'
import { TenantUsageService } from './tenant-usage.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [TenantsController],
  providers: [TenantsService, TenantResourcesService, TenantUsageService],
  exports: [TenantsService, TenantResourcesService, TenantUsageService],
})
export class TenantsModule {}
