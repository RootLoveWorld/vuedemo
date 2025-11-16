import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import { RegisterDto, LoginDto } from './dto'
import { JwtPayload } from './strategies/jwt.strategy'
import * as bcrypt from 'bcrypt'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
      },
    })

    if (!user) {
      return null
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive')
    }

    // Check if tenant is active
    if (!user.tenant || !user.tenant.isActive) {
      throw new UnauthorizedException('Tenant is inactive')
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return null
    }

    // Remove password from user object
    const { password: _, ...result } = user
    return result
  }

  /**
   * Register a new user
   */
  async register(dto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })

    if (existingUser) {
      throw new ConflictException('User with this email already exists')
    }

    // If tenantId is not provided, create a new tenant
    let tenantId = dto.tenantId
    if (!tenantId) {
      // Extract slug from email (e.g., user@company.com -> company)
      const emailDomain = dto.email.split('@')[1]
      const slug = emailDomain.split('.')[0]

      // Check if tenant with this slug exists
      const existingTenant = await this.prisma.tenant.findUnique({
        where: { slug },
      })

      if (existingTenant) {
        tenantId = existingTenant.id
      } else {
        // Create new tenant
        const tenant = await this.prisma.tenant.create({
          data: {
            name: slug.charAt(0).toUpperCase() + slug.slice(1),
            slug,
          },
        })
        tenantId = tenant.id
        this.logger.log(`Created new tenant: ${tenant.name} (${tenant.id})`)
      }
    } else {
      // Verify tenant exists
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      })

      if (!tenant) {
        throw new BadRequestException('Invalid tenant ID')
      }

      if (!tenant.isActive) {
        throw new BadRequestException('Tenant is inactive')
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10)

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        tenantId,
        role: 'user', // Default role
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
      },
    })

    this.logger.log(`User registered: ${user.email} (${user.id})`)

    // Generate JWT token
    const tokens = await this.generateTokens(user)

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      ...tokens,
    }
  }

  /**
   * Login user
   */
  async login(user: any) {
    const tokens = await this.generateTokens(user)

    this.logger.log(`User logged in: ${user.email} (${user.id})`)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenant: user.tenant,
      },
      ...tokens,
    }
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(user: any) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    }

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m', // Short-lived access token
    })

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d', // Long-lived refresh token
    })

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900, // 15 minutes in seconds
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken)

      // Get user to ensure they still exist and are active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
            },
          },
        },
      })

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive')
      }

      if (!user.tenant || !user.tenant.isActive) {
        throw new UnauthorizedException('Tenant not found or inactive')
      }

      // Generate new tokens
      return this.generateTokens(user)
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
      },
    })

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    return user
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: { name?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    this.logger.log(`User profile updated: ${user.email} (${user.id})`)

    return user
  }

  /**
   * Change password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid old password')
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    this.logger.log(`Password changed for user: ${user.email} (${user.id})`)

    return { message: 'Password changed successfully' }
  }
}
