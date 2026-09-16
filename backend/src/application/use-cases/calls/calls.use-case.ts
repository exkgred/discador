import { Inject, Injectable } from '@nestjs/common';
import type { Call } from '../../../domain/entities/call.entity';
import { NotFoundError } from '../../../domain/errors/domain-error';
import {
  CALL_REPOSITORY,
  type CallRepository,
} from '../../../domain/repositories/call.repository';
import {
  ZENVIA_VOICE_PORT,
  type ZenviaVoicePort,
} from '../../../domain/ports/zenvia-voice.port';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository';
import { BusinessRuleError } from '../../../domain/errors/domain-error';

@Injectable()
export class ListCallsUseCase {
  constructor(
    @Inject(CALL_REPOSITORY) private readonly calls: CallRepository,
  ) {}

  async execute(input: {
    campaignId?: string;
    agentId?: string;
    page?: number;
    perPage?: number;
  }) {
    const page = input.page && input.page > 0 ? input.page : 1;
    const perPage = input.perPage && input.perPage > 0 ? input.perPage : 20;
    const result = await this.calls.list({
      campaignId: input.campaignId,
      agentId: input.agentId,
      page,
      perPage,
    });
    return { ...result, page, perPage };
  }
}

@Injectable()
export class HangupCallUseCase {
  constructor(
    @Inject(CALL_REPOSITORY) private readonly calls: CallRepository,
    @Inject(ZENVIA_VOICE_PORT) private readonly voice: ZenviaVoicePort,
  ) {}

  async execute(callId: string, agentId: string): Promise<Call> {
    const call = await this.calls.findById(callId);
    if (!call) {
      throw new NotFoundError('Call');
    }
    if (call.agentId !== agentId) {
      throw new BusinessRuleError('Chamada não pertence ao agente');
    }
    await this.voice.hangup(call.zenviaChamadaId);
    return call;
  }
}

@Injectable()
export class GetWebphoneUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ZENVIA_VOICE_PORT) private readonly voice: ZenviaVoicePort,
  ) {}

  async execute(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    if (!user.ramalId) {
      throw new BusinessRuleError('Agente sem ramal configurado');
    }
    return this.voice.getWebphoneUrl(user.ramalId);
  }
}
