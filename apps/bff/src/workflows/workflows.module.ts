import { Module } from '@nestjs/common'
import { WorkflowsController } from './workflows.controller'
import { WorkflowsService } from './workflows.service'
import { WorkflowValidationService } from './workflow-validation.service'
import { WorkflowVersionService } from './workflow-version.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowValidationService, WorkflowVersionService],
  exports: [WorkflowsService, WorkflowValidationService, WorkflowVersionService],
})
export class WorkflowsModule {}
