import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegisterDto, LoginDto } from './dto'
import { JwtAuthGuard, LocalAuthGuard } from './guards'
import { Public, CurrentUser, CurrentUserData } from './decorators'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Register a new user
   * POST /auth/register
   */
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  /**
   * Login with email and password
   * POST /auth/login
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: any) {
    return this.authService.login(req.user)
  }

  /**
   * Refresh access token
   * POST /auth/refresh
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refreshToken(refreshToken)
  }

  /**
   * Get current user profile
   * GET /auth/profile
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: CurrentUserData) {
    return this.authService.getProfile(user.id)
  }

  /**
   * Update current user profile
   * PUT /auth/profile
   */
  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(@CurrentUser() user: CurrentUserData, @Body() data: { name?: string }) {
    return this.authService.updateProfile(user.id, data)
  }

  /**
   * Change password
   * POST /auth/change-password
   */
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: CurrentUserData,
    @Body() data: { oldPassword: string; newPassword: string }
  ) {
    return this.authService.changePassword(user.id, data.oldPassword, data.newPassword)
  }

  /**
   * Logout (client-side token removal)
   * POST /auth/logout
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    // In a stateless JWT setup, logout is handled client-side by removing the token
    // If you want to implement token blacklisting, you can add it here
    return { message: 'Logged out successfully' }
  }
}
