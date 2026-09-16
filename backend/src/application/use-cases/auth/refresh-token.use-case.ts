import { Inject, Injectable } from '@nestjs/common';
import {
  TOKEN_SERVICE,
  type TokenPair,
  type TokenService,
} from '../../interfaces/auth.interfaces';
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

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepo: RefreshTokenRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: { refreshToken: string }): Promise<TokenPair> {
    let payload: { sub: string };
    try {
      payload = await this.tokenService.verifyRefresh(input.refreshToken);
    } catch {
      throw new UnauthorizedError('Refresh token inválido');
    }

    const tokenHash = this.tokenService.hashToken(input.refreshToken);
    const stored = await this.refreshTokenRepo.findValidByHash(tokenHash);
    if (!stored || stored.userId !== payload.sub) {
      throw new UnauthorizedError('Refresh token inválido');
    }

    const user = await this.userRepo.findById(stored.userId);
    if (!user) {
      throw new UnauthorizedError('Refresh token inválido');
    }

    await this.refreshTokenRepo.revoke(stored.id);

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

    return { accessToken, refreshToken };
  }
}
