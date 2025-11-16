import { IsString, IsNotEmpty, IsOptional, IsEmail, MinLength, Matches } from 'class-validator'

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  @MinLength(2)
  slug: string

  @IsString()
  @IsOptional()
  description?: string

  @IsEmail()
  @IsNotEmpty()
  adminEmail: string

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  adminPassword: string

  @IsString()
  @IsOptional()
  adminName?: string
}
