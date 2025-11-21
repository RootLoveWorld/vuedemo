import { IsNotEmpty, IsString } from 'class-validator'

export class InstallPluginDto {
  @IsNotEmpty()
  @IsString()
  pluginId: string
}
