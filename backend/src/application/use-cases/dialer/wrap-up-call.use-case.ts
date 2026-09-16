import { Inject, Injectable } from '@nestjs/common';
import type {
  Call,
  CallDisposition,
} from '../../../domain/entities/call.entity';
import type { DialMode } from '../../../domain/entities/campaign.entity';
import {
  BusinessRuleError,
  NotFoundError,
} from '../../../domain/errors/domain-error';
import { normalizePhone } from '../../../domain/ports/phone';
import {
  AGENT_SESSION_PORT,
  REALTIME_PUBLISHER,
  type AgentSessionPort,
  type RealtimePublisher,
} from '../../../domain/ports/realtime.port';
import {
  CALL_REPOSITORY,
  type CallRepository,
} from '../../../domain/repositories/call.repository';
import {
  CALLBACK_REPOSITORY,
  DNC_REPOSITORY,
  type CallbackRepository,
  type DncRepository,
} from '../../../domain/repositories/dnc.repository';
import {
  CAMPAIGN_REPOSITORY,
  type CampaignRepository,
} from '../../../domain/repositories/campaign.repository';
import {
  LEAD_REPOSITORY,
  type LeadRepository,
} from '../../../domain/repositories/lead.repository';

const DISPOSITION_TO_STATUS: Record<
  CallDisposition,
  'DONE' | 'NO_ANSWER' | 'CALLBACK' | 'DNC'
> = {
  ANSWERED: 'DONE',
  NO_ANSWER: 'NO_ANSWER',
  VOICEMAIL: 'NO_ANSWER',
  BUSY: 'NO_ANSWER',
  CALLBACK: 'CALLBACK',
  DNC: 'DNC',
  OTHER: 'DONE',
};

@Injectable()
export class WrapUpCallUseCase {
  constructor(
    @Inject(CALL_REPOSITORY) private readonly calls: CallRepository,
    @Inject(CAMPAIGN_REPOSITORY) private readonly campaigns: CampaignRepository,
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    @Inject(DNC_REPOSITORY) private readonly dnc: DncRepository,
    @Inject(CALLBACK_REPOSITORY) private readonly callbacks: CallbackRepository,
    @Inject(AGENT_SESSION_PORT) private readonly sessions: AgentSessionPort,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher,
  ) {}

  async execute(input: {
    callId: string;
    agentId: string;
    disposition: CallDisposition;
    notes?: string | null;
    callbackAt?: string | null;
  }): Promise<{ call: Call; dialMode: DialMode; campaignId: string }> {
    const call = await this.calls.findById(input.callId);
    if (!call) {
      throw new NotFoundError('Call');
    }
    if (call.agentId !== input.agentId) {
      throw new BusinessRuleError('Chamada não pertence ao agente');
    }
    if (call.disposition) {
      throw new BusinessRuleError('Resultado já registrado');
    }

    const wrapped = await this.calls.wrapUp(
      call.id,
      input.disposition,
      input.notes ?? null,
    );

    const queueStatus = DISPOSITION_TO_STATUS[input.disposition];
    await this.campaigns.updateCampaignLeadStatus(
      call.campaignLeadId,
      queueStatus,
      input.agentId,
    );

    if (input.disposition === 'DNC') {
      const lead = await this.leads.findById(call.leadId);
      if (lead) {
        const phone = normalizePhone(lead.phone);
        await this.dnc.add(phone, 'Marcado no wrap-up');
        await this.leads.markDnc(phone, true);
      }
    }

    if (input.disposition === 'CALLBACK') {
      if (!input.callbackAt) {
        throw new BusinessRuleError('Informe a data do retorno');
      }
      await this.callbacks.create({
        leadId: call.leadId,
        campaignLeadId: call.campaignLeadId,
        agentId: input.agentId,
        callId: call.id,
        scheduledAt: new Date(input.callbackAt),
        notes: input.notes ?? null,
      });
    }

    await this.sessions.set({
      userId: input.agentId,
      campaignId: call.campaignId,
      status: 'idle',
    });
    this.realtime.emitToAgent(input.agentId, 'agent:status', {
      status: 'idle',
      campaignId: call.campaignId,
    });

    const campaign = await this.campaigns.findById(call.campaignId);
    return {
      call: wrapped,
      dialMode: campaign?.dialMode ?? 'MANUAL',
      campaignId: call.campaignId,
    };
  }
}
