import { Inject, Injectable } from '@nestjs/common';
import type { PublicUser } from '../../../domain/entities/user.entity';
import { NotFoundError } from '../../../domain/errors/domain-error';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository';

@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(input: { userId: string }): Promise<PublicUser> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return this.userRepo.toPublic(user);
  }
}
