import { Module, Global } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { TenantService, PermissionsService } from './services'
import { TenantGuard, PermissionsGuard, ResourceOwnerGuard, RolesGuard } from './guards'

/**
 * Global module for common services and guards
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    TenantService,
    PermissionsService,
    TenantGuard,
    PermissionsGuard,
    ResourceOwnerGuard,
    RolesGuard,
  ],
  exports: [
    TenantService,
    PermissionsService,
    TenantGuard,
    PermissionsGuard,
    ResourceOwnerGuard,
    RolesGuard,
  ],
})
export class CommonModule {}
