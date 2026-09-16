import { Inject, Injectable } from '@nestjs/common';
import {
  PASSWORD_HASHER,
  TOKEN_SERVICE,
  type PasswordHasher,
  type TokenPair,
  type TokenService,
} from '../../interfaces/auth.interfaces';
import type { PublicUser } from '../../../domain/entities/user.entity';
import { UnauthorizedError } from '../../../domain/errors/domain-error';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../../domain/repositories/refresh-token.repository';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository';
import { refreshExpiresAt } from './register-user.use-case';

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface LoginUserOutput {
  user: PublicUser;
  tokens: TokenPair;
}

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepo: RefreshTokenRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: LoginUserInput): Promise<LoginUserOutput> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    const valid = await this.passwordHasher.compare(
      input.password,
      user.passwordHash,
    );
    if (!valid) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    const accessToken = await this.tokenService.signAccess({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    const refreshToken = await this.tokenService.signRefresh({ sub: user.id });
    await this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash: this.tokenService.hashToken(refreshToken),
      expiresAt: refreshExpiresAt(),
    });

    return {
      user: this.userRepo.toPublic(user),
      tokens: { accessToken, refreshToken },
    };
  }
}
