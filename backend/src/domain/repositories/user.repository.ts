import type { PublicUser, User, UserRole } from '../entities/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  list(): Promise<User[]>;
  create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    ramalId?: string | null;
  }): Promise<User>;
  toPublic(user: User): PublicUser;
}
