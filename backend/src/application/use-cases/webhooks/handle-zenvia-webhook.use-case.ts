import { Inject, Injectable } from '@nestjs/common';
import type { Call } from '../../../domain/entities/call.entity';
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
  CAMPAIGN_REPOSITORY,
  type CampaignRepository,
} from '../../../domain/repositories/campaign.repository';

export interface ZenviaHangupPayload {
  id: number | string;
  url_gravacao?: string | null;
  status_geral?: string;
  origem?: { duracao_segundos?: number; duracao_falada_segundos?: number };
  destino?: {
    duracao_segundos?: number;
    duracao_falada_segundos?: number;
    duracao_cobrada_segundos?: number;
    preco?: number;
    motivo_desconexao?: string;
    status?: string;
  };
  duracao_segundos?: number;
  duracao_falada_segundos?: number;
  duracao_cobrada_segundos?: number;
  preco?: number;
  motivo_desconexao?: string;
}

@Injectable()
export class HandleZenviaWebhookUseCase {
  constructor(
    @Inject(CALL_REPOSITORY) private readonly calls: CallRepository,
    @Inject(CAMPAIGN_REPOSITORY) private readonly campaigns: CampaignRepository,
    @Inject(AGENT_SESSION_PORT) private readonly sessions: AgentSessionPort,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher,
  ) {}

  async execute(payload: ZenviaHangupPayload): Promise<{
    call: Call | null;
    duplicate: boolean;
  }> {
    const zenviaId = String(payload.id);
    const existing = await this.calls.findByZenviaId(zenviaId);
    if (!existing) {
      return { call: null, duplicate: false };
    }
    if (existing.webhookProcessedAt) {
      return { call: existing, duplicate: true };
    }

    const destino = payload.destino;
    const finalized = await this.calls.finalizeFromWebhook(zenviaId, {
      status: 'FINALIZED',
      recordingUrl: payload.url_gravacao ?? null,
      durationSeconds:
        destino?.duracao_segundos ?? payload.duracao_segundos ?? null,
      spokenSeconds:
        destino?.duracao_falada_segundos ??
        payload.duracao_falada_segundos ??
        null,
      billedSeconds:
        destino?.duracao_cobrada_segundos ??
        payload.duracao_cobrada_segundos ??
        null,
      price: destino?.preco ?? payload.preco ?? null,
      disconnectReason:
        destino?.motivo_desconexao ?? payload.motivo_desconexao ?? null,
      endedAt: new Date(),
    });

    await this.campaigns.updateCampaignLeadStatus(
      finalized.campaignLeadId,
      'WRAP_UP',
      finalized.agentId,
    );
    await this.sessions.set({
      userId: finalized.agentId,
      campaignId: finalized.campaignId,
      status: 'wrap_up',
    });

    this.realtime.emitToAgent(finalized.agentId, 'call:wrap-up', {
      call: finalized,
    });
    this.realtime.emitToAgent(finalized.agentId, 'agent:status', {
      status: 'wrap_up',
      campaignId: finalized.campaignId,
    });

    return { call: finalized, duplicate: false };
  }
}
