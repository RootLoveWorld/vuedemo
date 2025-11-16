import { IsString, IsObject, IsOptional, IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateExecutionDto {
  @ApiProperty({
    description: 'Workflow ID to execute',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  workflowId: string

  @ApiProperty({
    description: 'Input data for the workflow execution',
    example: { input: 'Hello World' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  inputData?: Record<string, any>
}
