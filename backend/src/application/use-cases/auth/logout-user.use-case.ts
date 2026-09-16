import { Inject, Injectable } from '@nestjs/common';
import {
  TOKEN_SERVICE,
  type TokenService,
} from '../../interfaces/auth.interfaces';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../../domain/repositories/refresh-token.repository';

@Injectable()
export class LogoutUserUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepo: RefreshTokenRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: {
    refreshToken?: string;
    userId?: string;
  }): Promise<void> {
    if (input.refreshToken) {
      const tokenHash = this.tokenService.hashToken(input.refreshToken);
      const stored = await this.refreshTokenRepo.findValidByHash(tokenHash);
      if (stored) {
        await this.refreshTokenRepo.revoke(stored.id);
      }
      return;
    }

    if (input.userId) {
      await this.refreshTokenRepo.revokeAllForUser(input.userId);
    }
  }
}
