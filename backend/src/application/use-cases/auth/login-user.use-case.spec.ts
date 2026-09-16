import { LoginUserUseCase } from './login-user.use-case';
import { UnauthorizedError } from '../../../domain/errors/domain-error';
import type { UserRepository } from '../../../domain/repositories/user.repository';
import type { RefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository';
import type {
  PasswordHasher,
  TokenService,
} from '../../interfaces/auth.interfaces';
import type { PublicUser, User } from '../../../domain/entities/user.entity';

describe('LoginUserUseCase', () => {
  let useCase: LoginUserUseCase;
  let userRepo: jest.Mocked<UserRepository>;
  let refreshTokenRepo: jest.Mocked<RefreshTokenRepository>;
  let passwordHasher: jest.Mocked<PasswordHasher>;
  let tokenService: jest.Mocked<TokenService>;

  const user: User = {
    id: '1',
    name: 'Agente',
    email: 'agent@example.com',
    passwordHash: 'hash',
    role: 'AGENT',
    ramalId: '1002',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const publicUser: PublicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ramalId: user.ramalId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  beforeEach(() => {
    userRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      toPublic: jest.fn(),
    };
    refreshTokenRepo = {
      create: jest.fn(),
      findValidByHash: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    passwordHasher = { hash: jest.fn(), compare: jest.fn() };
    tokenService = {
      signAccess: jest.fn(),
      signRefresh: jest.fn(),
      verifyAccess: jest.fn(),
      verifyRefresh: jest.fn(),
      hashToken: jest.fn(),
    };
    useCase = new LoginUserUseCase(
      userRepo,
      refreshTokenRepo,
      passwordHasher,
      tokenService,
    );
  });

  it('credenciais válidas → tokens e usuário', async () => {
    userRepo.findByEmail.mockResolvedValue(user);
    passwordHasher.compare.mockResolvedValue(true);
    userRepo.toPublic.mockReturnValue(publicUser);
    tokenService.signAccess.mockResolvedValue('access');
    tokenService.signRefresh.mockResolvedValue('refresh');
    tokenService.hashToken.mockReturnValue('hashed');

    const result = await useCase.execute({
      email: user.email,
      password: 'password123',
    });

    expect(tokenService.signAccess).toHaveBeenCalledWith({
      sub: '1',
      email: user.email,
      name: 'Agente',
      role: 'AGENT',
    });
    expect(result.tokens).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });

  it('e-mail inexistente → UnauthorizedError', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    await expect(
      useCase.execute({ email: user.email, password: 'password123' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('senha inválida → UnauthorizedError', async () => {
    userRepo.findByEmail.mockResolvedValue(user);
    passwordHasher.compare.mockResolvedValue(false);
    await expect(
      useCase.execute({ email: user.email, password: 'wrongpass' }),
    ).rejects.toThrow(UnauthorizedError);
  });
});
