import type { UserRole } from '../../domain/entities/user.entity';

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface TokenService {
  signAccess(payload: AccessTokenPayload): Promise<string>;
  signRefresh(payload: { sub: string }): Promise<string>;
  verifyAccess(token: string): Promise<AccessTokenPayload>;
  verifyRefresh(token: string): Promise<{ sub: string }>;
  hashToken(token: string): string;
}
