import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator'
import type { PluginManifest } from '@workflow/shared-types'

export class CreatePluginDto {
  @IsNotEmpty()
  @IsObject()
  manifest: PluginManifest

  @IsOptional()
  @IsString()
  fileUrl?: string
}
