import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class QueryLogsDto {
  @ApiProperty({
    description: 'Filter by log level',
    enum: ['info', 'warning', 'error', 'debug'],
    required: false,
  })
  @IsOptional()
  @IsIn(['info', 'warning', 'error', 'debug'])
  level?: string

  @ApiProperty({
    description: 'Filter by node ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  nodeId?: string

  @ApiProperty({
    description: 'Number of logs to return',
    default: 100,
    minimum: 1,
    maximum: 1000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 100

  @ApiProperty({
    description: 'Number of logs to skip',
    default: 0,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0

  @ApiProperty({
    description: 'Search term to filter logs by message',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string
}
