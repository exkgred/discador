import { Inject, Injectable } from '@nestjs/common';
import type { Call } from '../../../domain/entities/call.entity';
import type { CampaignLead } from '../../../domain/entities/campaign.entity';
import {
  BusinessRuleError,
  NotFoundError,
} from '../../../domain/errors/domain-error';
import { assertCanDial } from '../../../domain/ports/business-hours';
import {
  AGENT_SESSION_PORT,
  REALTIME_PUBLISHER,
  type AgentSessionPort,
  type RealtimePublisher,
} from '../../../domain/ports/realtime.port';
import {
  ZENVIA_VOICE_PORT,
  type ZenviaVoicePort,
} from '../../../domain/ports/zenvia-voice.port';
import {
  CALL_REPOSITORY,
  type CallRepository,
} from '../../../domain/repositories/call.repository';
import {
  CAMPAIGN_REPOSITORY,
  type CampaignRepository,
} from '../../../domain/repositories/campaign.repository';
import {
  DNC_REPOSITORY,
  type DncRepository,
} from '../../../domain/repositories/dnc.repository';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository';

export interface DialResult {
  call: Call;
  campaignLead: CampaignLead;
  mock: boolean;
}

@Injectable()
export class SetAgentReadyUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY) private readonly campaigns: CampaignRepository,
    @Inject(AGENT_SESSION_PORT) private readonly sessions: AgentSessionPort,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher,
  ) {}

  async execute(input: { userId: string; campaignId: string }) {
    const campaign = await this.campaigns.findById(input.campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign');
    }
    if (!campaign.active) {
      throw new BusinessRuleError('Campanha inativa');
    }
    await this.sessions.set({
      userId: input.userId,
      campaignId: input.campaignId,
      status: 'idle',
    });
    this.realtime.emitToAgent(input.userId, 'agent:status', {
      status: 'idle',
      campaignId: input.campaignId,
    });
    return { campaignId: input.campaignId, status: 'idle' as const };
  }
}

@Injectable()
export class DialNextLeadUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY) private readonly campaigns: CampaignRepository,
    @Inject(CALL_REPOSITORY) private readonly calls: CallRepository,
    @Inject(DNC_REPOSITORY) private readonly dnc: DncRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ZENVIA_VOICE_PORT) private readonly voice: ZenviaVoicePort,
    @Inject(AGENT_SESSION_PORT) private readonly sessions: AgentSessionPort,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher,
  ) {}

  async execute(input: {
    agentId: string;
    campaignId?: string;
    campaignLeadId?: string;
    now?: Date;
  }): Promise<DialResult> {
    const agent = await this.users.findById(input.agentId);
    if (!agent) {
      throw new NotFoundError('User');
    }
    if (!agent.ramalId) {
      throw new BusinessRuleError('Agente sem ramal configurado');
    }

    const active = await this.calls.findActiveByAgent(input.agentId);
    if (active) {
      throw new BusinessRuleError('Agente já possui chamada em andamento');
    }

    const session = await this.sessions.get(input.agentId);
    const campaignId = input.campaignId ?? session?.campaignId;
    if (!campaignId) {
      throw new BusinessRuleError('Agente precisa selecionar uma campanha');
    }

    const campaign = await this.campaigns.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    const reserved = input.campaignLeadId
      ? await this.reserveSpecific(input.campaignLeadId, input.agentId)
      : await this.campaigns.reserveNextPending(campaignId, input.agentId);

    if (!reserved || !reserved.lead) {
      throw new BusinessRuleError('Fila da campanha vazia');
    }

    const blocked =
      reserved.lead.dncBlocked ||
      (await this.dnc.isBlocked(reserved.lead.phone));

    try {
      assertCanDial({
        now: input.now ?? new Date(),
        windowStart: campaign.windowStart,
        windowEnd: campaign.windowEnd,
        timeZone: campaign.timeZone,
        dncBlocked: blocked,
        alreadyDialing: false,
        campaignActive: campaign.active,
      });
    } catch (error) {
      const status = blocked ? 'DNC' : 'PENDING';
      await this.campaigns.updateCampaignLeadStatus(
        reserved.id,
        status,
        status === 'DNC' ? input.agentId : null,
      );
      throw error;
    }

    const placed = await this.voice.placeCall({
      origin: agent.ramalId,
      destination: reserved.lead.phone,
      recordAudio: campaign.gravarAudio,
      tags: `campaign:${campaign.id};lead:${reserved.leadId}`,
    });

    const call = await this.calls.create({
      zenviaChamadaId: placed.chamadaId,
      campaignId: campaign.id,
      campaignLeadId: reserved.id,
      leadId: reserved.leadId,
      agentId: input.agentId,
      status: 'RINGING',
    });

    await this.sessions.set({
      userId: input.agentId,
      campaignId: campaign.id,
      status: 'ringing',
    });

    this.realtime.emitToAgent(input.agentId, 'call:started', {
      call,
      campaignLead: reserved,
      campaign,
    });
    this.realtime.emitToAgent(input.agentId, 'agent:status', {
      status: 'ringing',
      campaignId: campaign.id,
    });

    return { call, campaignLead: reserved, mock: placed.mock };
  }

  private async reserveSpecific(
    campaignLeadId: string,
    agentId: string,
  ): Promise<CampaignLead | null> {
    const item = await this.campaigns.findCampaignLeadById(campaignLeadId);
    if (!item) {
      throw new NotFoundError('CampaignLead');
    }
    if (item.status !== 'PENDING') {
      throw new BusinessRuleError('Lead já está em discagem');
    }
    return this.campaigns.updateCampaignLeadStatus(
      campaignLeadId,
      'DIALING',
      agentId,
    );
  }
}
