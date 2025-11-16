import { IsString, IsOptional, IsObject, MinLength, MaxLength } from 'class-validator'
import type { CreateWorkflowDto as ICreateWorkflowDto } from '@workflow/shared-types'

export class CreateWorkflowDto implements ICreateWorkflowDto {
  @IsString()
  @MinLength(1, { message: 'Workflow name is required' })
  @MaxLength(255, { message: 'Workflow name must not exceed 255 characters' })
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters' })
  description?: string

  @IsObject()
  definition: {
    name: string
    description?: string
    nodes: any[]
    edges: any[]
  }
}
