import { ApiProperty } from '@nestjs/swagger'

export class ExecutionResponseDto {
  @ApiProperty({ description: 'Execution ID' })
  id: string

  @ApiProperty({ description: 'Workflow ID' })
  workflowId: string

  @ApiProperty({ description: 'User ID' })
  userId: string

  @ApiProperty({
    description: 'Execution status',
    enum: ['pending', 'running', 'completed', 'failed'],
  })
  status: string

  @ApiProperty({ description: 'Input data', required: false })
  inputData?: Record<string, any>

  @ApiProperty({ description: 'Output data', required: false })
  outputData?: Record<string, any>

  @ApiProperty({ description: 'Error message if failed', required: false })
  errorMessage?: string

  @ApiProperty({ description: 'Execution start time', required: false })
  startedAt?: Date

  @ApiProperty({ description: 'Execution completion time', required: false })
  completedAt?: Date

  @ApiProperty({ description: 'Execution creation time' })
  createdAt: Date
}
