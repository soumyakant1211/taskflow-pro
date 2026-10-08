import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthUser, CurrentUser, Public } from '../common/auth.decorators.js';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Create an account (role MEMBER) and receive a JWT' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: Number(process.env.LOGIN_THROTTLE_LIMIT ?? 60), ttl: 60_000 } })
  @ApiOperation({ summary: 'Log in with email + password and receive a JWT' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('guest')
  @HttpCode(200)
  @Throttle({ default: { limit: Number(process.env.LOGIN_THROTTLE_LIMIT ?? 60), ttl: 60_000 } })
  @ApiOperation({ summary: 'Log in as the read-only guest user (no password). Guests can view everything but change nothing.' })
  guest() {
    return this.auth.guestLogin();
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Current user profile' })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @ApiBearerAuth()
  @Patch('me')
  @ApiOperation({ summary: 'Update own profile' })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.id, dto);
  }

  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Change own password' })
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto);
  }
}
