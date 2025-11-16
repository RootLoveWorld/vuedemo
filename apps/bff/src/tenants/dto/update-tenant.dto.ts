import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator'

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
