import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsOptional } from 'class-validator'

export class StopExecutionDto {
  @ApiProperty({
    description: 'Reason for stopping the execution',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string
}
