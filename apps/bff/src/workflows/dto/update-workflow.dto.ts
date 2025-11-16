import { IsString, IsOptional, IsObject, IsBoolean, MinLength, MaxLength } from 'class-validator'
import type { UpdateWorkflowDto as IUpdateWorkflowDto } from '@workflow/shared-types'

export class UpdateWorkflowDto implements IUpdateWorkflowDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @IsOptional()
  @IsObject()
  definition?: {
    name: string
    description?: string
    nodes: any[]
    edges: any[]
  }

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
