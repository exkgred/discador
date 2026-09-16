import { Inject, Injectable } from '@nestjs/common';
import {
  PASSWORD_HASHER,
  TOKEN_SERVICE,
  type PasswordHasher,
  type TokenPair,
  type TokenService,
} from '../../interfaces/auth.interfaces';
import type {
  PublicUser,
  UserRole,
} from '../../../domain/entities/user.entity';
import {
  ConflictError,
  ForbiddenError,
} from '../../../domain/errors/domain-error';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../../domain/repositories/refresh-token.repository';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository';

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  ramalId?: string | null;
  actorRole: UserRole;
}

export interface RegisterUserOutput {
  user: PublicUser;
  tokens: TokenPair;
}

@Injectable()
export class RegisterUserUseCase {
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

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    if (input.actorRole !== 'ADMIN') {
      throw new ForbiddenError('Apenas administradores cadastram usuários');
    }
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('E-mail já cadastrado');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.userRepo.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role ?? 'AGENT',
      ramalId: input.ramalId ?? null,
    });

    const tokens = await this.issueTokens(user);
    return { user: this.userRepo.toPublic(user), tokens };
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  }): Promise<TokenPair> {
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

export function refreshExpiresAt(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  return expires;
}
