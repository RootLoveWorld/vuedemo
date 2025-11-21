import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class UpdatePluginDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsBoolean()
  isInstalled?: boolean

  @IsOptional()
  @IsString()
  fileUrl?: string
}
