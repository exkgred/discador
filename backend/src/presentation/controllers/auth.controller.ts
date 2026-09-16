import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AccessTokenPayload } from '../../application/interfaces/auth.interfaces';
import { GetMeUseCase } from '../../application/use-cases/auth/get-me.use-case';
import { LoginUserUseCase } from '../../application/use-cases/auth/login-user.use-case';
import { LogoutUserUseCase } from '../../application/use-cases/auth/logout-user.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/auth/refresh-token.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/auth/register-user.use-case';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { LoginDto, LogoutDto, RefreshDto, RegisterDto } from '../dto/auth.dto';
import { RolesGuard } from '../guards/roles.guard';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly logoutUser: LogoutUserUseCase,
    private readonly getMe: GetMeUseCase,
  ) {}

  @Post('register')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cadastrar usuário (admin)' })
  register(@Body() dto: RegisterDto, @CurrentUser() actor: AccessTokenPayload) {
    return this.registerUser.execute({ ...dto, actorRole: actor.role });
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login' })
  login(@Body() dto: LoginDto) {
    return this.loginUser.execute(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renovar tokens' })
  refresh(@Body() dto: RefreshDto) {
    return this.refreshToken.execute({ refreshToken: dto.refreshToken });
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revogar refresh token' })
  async logout(@Body() dto: LogoutDto) {
    await this.logoutUser.execute({ refreshToken: dto.refreshToken });
    return { ok: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Usuário autenticado' })
  me(@CurrentUser() user: AccessTokenPayload) {
    return this.getMe.execute({ userId: user.sub });
  }
}
