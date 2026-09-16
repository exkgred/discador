import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AccessTokenPayload } from '../../application/interfaces/auth.interfaces';
import type { UserRole } from '../../domain/entities/user.entity';
import { ForbiddenError } from '../../domain/errors/domain-error';
import { ROLES_KEY } from '../../presentation/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) {
      return true;
    }
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AccessTokenPayload }>();
    const role = request.user?.role;
    if (!role || !roles.includes(role)) {
      throw new ForbiddenError('Sem permissão para esta operação');
    }
    return true;
  }
}
