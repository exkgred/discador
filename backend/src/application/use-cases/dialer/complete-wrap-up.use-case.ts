import { Inject, Injectable } from '@nestjs/common';
import { DialNextLeadUseCase } from './dial-next-lead.use-case';
import { WrapUpCallUseCase } from './wrap-up-call.use-case';
import type { CallDisposition } from '../../../domain/entities/call.entity';
import {
  REALTIME_PUBLISHER,
  type RealtimePublisher,
} from '../../../domain/ports/realtime.port';

@Injectable()
export class CompleteWrapUpUseCase {
  constructor(
    private readonly wrapUp: WrapUpCallUseCase,
    private readonly dialNext: DialNextLeadUseCase,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher,
  ) {}

  async execute(input: {
    callId: string;
    agentId: string;
    disposition: CallDisposition;
    notes?: string | null;
    callbackAt?: string | null;
    autoDialNext?: boolean;
  }) {
    const wrapped = await this.wrapUp.execute(input);
    const shouldAuto =
      input.autoDialNext !== false && wrapped.dialMode === 'POWER';
    if (!shouldAuto) {
      return { call: wrapped.call };
    }
    try {
      const next = await this.dialNext.execute({
        agentId: input.agentId,
        campaignId: wrapped.campaignId,
      });
      return { call: wrapped.call, next };
    } catch {
      this.realtime.emitToAgent(input.agentId, 'queue:empty', {
        campaignId: wrapped.campaignId,
      });
      return { call: wrapped.call };
    }
  }
}
