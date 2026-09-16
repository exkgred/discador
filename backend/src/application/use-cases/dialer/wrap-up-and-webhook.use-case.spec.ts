import { HandleZenviaWebhookUseCase } from '../webhooks/handle-zenvia-webhook.use-case';
import { WrapUpCallUseCase } from './wrap-up-call.use-case';
import { CompleteWrapUpUseCase } from './complete-wrap-up.use-case';
import { DialNextLeadUseCase } from './dial-next-lead.use-case';
import { BusinessRuleError } from '../../../domain/errors/domain-error';
import type { Call } from '../../../domain/entities/call.entity';
import type { CallRepository } from '../../../domain/repositories/call.repository';
import type { CampaignRepository } from '../../../domain/repositories/campaign.repository';
import type {
  AgentSessionPort,
  RealtimePublisher,
} from '../../../domain/ports/realtime.port';
import type {
  CallbackRepository,
  DncRepository,
} from '../../../domain/repositories/dnc.repository';
import type { LeadRepository } from '../../../domain/repositories/lead.repository';

const baseCall: Call = {
  id: 'call-1',
  zenviaChamadaId: '999',
  campaignId: 'camp-1',
  campaignLeadId: 'cl-1',
  leadId: 'lead-1',
  agentId: 'agent-1',
  status: 'FINALIZED',
  recordingUrl: null,
  durationSeconds: 18,
  spokenSeconds: 12,
  billedSeconds: 60,
  price: 0.13,
  disconnectReason: '16. normal',
  disposition: null,
  wrapUpNotes: null,
  webhookProcessedAt: null,
  startedAt: new Date(),
  endedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('HandleZenviaWebhookUseCase', () => {
  let calls: jest.Mocked<CallRepository>;
  let campaigns: jest.Mocked<CampaignRepository>;
  let sessions: jest.Mocked<AgentSessionPort>;
  let realtime: jest.Mocked<RealtimePublisher>;
  let useCase: HandleZenviaWebhookUseCase;

  beforeEach(() => {
    calls = {
      create: jest.fn(),
      findById: jest.fn(),
      findByZenviaId: jest.fn(),
      findActiveByAgent: jest.fn(),
      updateStatus: jest.fn(),
      finalizeFromWebhook: jest.fn(),
      wrapUp: jest.fn(),
      list: jest.fn(),
    };
    campaigns = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      enqueueLeads: jest.fn(),
      findCampaignLeadById: jest.fn(),
      findNextPending: jest.fn(),
      reserveNextPending: jest.fn(),
      updateCampaignLeadStatus: jest.fn(),
      listQueue: jest.fn(),
    };
    sessions = { set: jest.fn(), get: jest.fn(), clear: jest.fn() };
    realtime = { emitToAgent: jest.fn(), emitToCampaign: jest.fn() };
    useCase = new HandleZenviaWebhookUseCase(
      calls,
      campaigns,
      sessions,
      realtime,
    );
  });

  it('Chamada-Fim → wrap-up e Socket.IO', async () => {
    calls.findByZenviaId.mockResolvedValue(baseCall);
    const finalized = {
      ...baseCall,
      webhookProcessedAt: new Date(),
      status: 'FINALIZED' as const,
    };
    calls.finalizeFromWebhook.mockResolvedValue(finalized);

    const result = await useCase.execute({
      id: 999,
      url_gravacao: 'http://rec',
    });
    expect(result.duplicate).toBe(false);
    expect(campaigns.updateCampaignLeadStatus).toHaveBeenCalledWith(
      'cl-1',
      'WRAP_UP',
      'agent-1',
    );
    expect(realtime.emitToAgent).toHaveBeenCalledWith(
      'agent-1',
      'call:wrap-up',
      expect.any(Object),
    );
  });

  it('mesmo chamada.id duas vezes → idempotente', async () => {
    calls.findByZenviaId.mockResolvedValue({
      ...baseCall,
      webhookProcessedAt: new Date(),
    });
    const result = await useCase.execute({ id: '999' });
    expect(result.duplicate).toBe(true);
    expect(calls.finalizeFromWebhook).not.toHaveBeenCalled();
  });

  it('webhook sem destino usa campos da raiz', async () => {
    calls.findByZenviaId.mockResolvedValue(baseCall);
    calls.finalizeFromWebhook.mockResolvedValue({
      ...baseCall,
      webhookProcessedAt: new Date(),
    });
    await useCase.execute({
      id: 999,
      duracao_segundos: 5,
      duracao_falada_segundos: 4,
      duracao_cobrada_segundos: 60,
      preco: 0.1,
      motivo_desconexao: 'x',
    });
    expect(calls.finalizeFromWebhook).toHaveBeenCalledWith(
      '999',
      expect.objectContaining({ durationSeconds: 5, spokenSeconds: 4 }),
    );
  });

  it('id desconhecido → ignora', async () => {
    calls.findByZenviaId.mockResolvedValue(null);
    const result = await useCase.execute({ id: '0' });
    expect(result.call).toBeNull();
  });
});

describe('WrapUpCallUseCase', () => {
  function buildWrapUp(overrides?: {
    calls?: Partial<jest.Mocked<CallRepository>>;
    campaigns?: Partial<jest.Mocked<CampaignRepository>>;
    leads?: Partial<jest.Mocked<LeadRepository>>;
    dnc?: Partial<jest.Mocked<DncRepository>>;
    callbacks?: Partial<jest.Mocked<CallbackRepository>>;
  }) {
    const calls = {
      findById: jest.fn().mockResolvedValue(baseCall),
      wrapUp: jest
        .fn()
        .mockResolvedValue({ ...baseCall, disposition: 'ANSWERED' }),
      ...overrides?.calls,
    } as unknown as jest.Mocked<CallRepository>;
    const campaigns = {
      updateCampaignLeadStatus: jest.fn(),
      findById: jest.fn().mockResolvedValue({
        id: 'camp-1',
        dialMode: 'POWER',
      }),
      ...overrides?.campaigns,
    } as unknown as jest.Mocked<CampaignRepository>;
    const leads = {
      findById: jest.fn().mockResolvedValue({
        id: 'lead-1',
        phone: '11988880001',
      }),
      markDnc: jest.fn(),
      ...overrides?.leads,
    } as unknown as jest.Mocked<LeadRepository>;
    const dnc = {
      add: jest.fn(),
      ...overrides?.dnc,
    } as unknown as jest.Mocked<DncRepository>;
    const callbacks = {
      create: jest.fn(),
      ...overrides?.callbacks,
    } as unknown as jest.Mocked<CallbackRepository>;
    return new WrapUpCallUseCase(
      calls,
      campaigns,
      leads,
      dnc,
      callbacks,
      { set: jest.fn(), get: jest.fn(), clear: jest.fn() },
      { emitToAgent: jest.fn(), emitToCampaign: jest.fn() },
    );
  }

  it('chamada inexistente → NotFoundError', async () => {
    const calls = {
      findById: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<CallRepository>;
    await expect(
      new WrapUpCallUseCase(
        calls,
        {} as CampaignRepository,
        {} as LeadRepository,
        {} as DncRepository,
        {} as CallbackRepository,
        { set: jest.fn(), get: jest.fn(), clear: jest.fn() },
        { emitToAgent: jest.fn(), emitToCampaign: jest.fn() },
      ).execute({
        callId: 'x',
        agentId: 'agent-1',
        disposition: 'ANSWERED',
      }),
    ).rejects.toThrow();
  });

  it('campanha apagada assume MANUAL', async () => {
    const result = await buildWrapUp({
      campaigns: {
        updateCampaignLeadStatus: jest.fn(),
        findById: jest.fn().mockResolvedValue(null),
      } as unknown as Partial<jest.Mocked<CampaignRepository>>,
    }).execute({
      callId: 'call-1',
      agentId: 'agent-1',
      disposition: 'ANSWERED',
    });
    expect(result.dialMode).toBe('MANUAL');
  });

  it('ANSWERED → DONE e idle', async () => {
    const result = await buildWrapUp().execute({
      callId: 'call-1',
      agentId: 'agent-1',
      disposition: 'ANSWERED',
      notes: 'fechou',
    });
    expect(result.dialMode).toBe('POWER');
    expect(result.call.disposition).toBe('ANSWERED');
  });

  it('DNC adiciona telefone à lista', async () => {
    const dnc = { add: jest.fn() };
    const leads = {
      findById: jest.fn().mockResolvedValue({
        id: 'lead-1',
        phone: '11988880001',
      }),
      markDnc: jest.fn(),
    };
    await buildWrapUp({
      dnc: dnc as unknown as jest.Mocked<DncRepository>,
      leads: leads as unknown as jest.Mocked<LeadRepository>,
      calls: {
        findById: jest.fn().mockResolvedValue(baseCall),
        wrapUp: jest
          .fn()
          .mockResolvedValue({ ...baseCall, disposition: 'DNC' }),
      } as unknown as Partial<jest.Mocked<CallRepository>>,
    }).execute({
      callId: 'call-1',
      agentId: 'agent-1',
      disposition: 'DNC',
    });
    expect(dnc.add).toHaveBeenCalledWith(
      '+5511988880001',
      'Marcado no wrap-up',
    );
    expect(leads.markDnc).toHaveBeenCalledWith('+5511988880001', true);
  });

  it('DNC sem lead não quebra', async () => {
    await buildWrapUp({
      leads: {
        findById: jest.fn().mockResolvedValue(null),
        markDnc: jest.fn(),
      } as unknown as Partial<jest.Mocked<LeadRepository>>,
      calls: {
        findById: jest.fn().mockResolvedValue(baseCall),
        wrapUp: jest
          .fn()
          .mockResolvedValue({ ...baseCall, disposition: 'DNC' }),
      } as unknown as Partial<jest.Mocked<CallRepository>>,
    }).execute({
      callId: 'call-1',
      agentId: 'agent-1',
      disposition: 'DNC',
    });
  });

  it('CALLBACK com data agenda retorno', async () => {
    const callbacks = { create: jest.fn() };
    await buildWrapUp({
      callbacks: callbacks as unknown as jest.Mocked<CallbackRepository>,
      calls: {
        findById: jest.fn().mockResolvedValue(baseCall),
        wrapUp: jest
          .fn()
          .mockResolvedValue({ ...baseCall, disposition: 'CALLBACK' }),
      } as unknown as Partial<jest.Mocked<CallRepository>>,
    }).execute({
      callId: 'call-1',
      agentId: 'agent-1',
      disposition: 'CALLBACK',
      callbackAt: '2026-09-20T14:00:00.000Z',
    });
    expect(callbacks.create).toHaveBeenCalled();
  });

  it('agente errado → erro', async () => {
    await expect(
      buildWrapUp().execute({
        callId: 'call-1',
        agentId: 'outro',
        disposition: 'ANSWERED',
      }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it('resultado já registrado → erro', async () => {
    const calls = {
      findById: jest.fn().mockResolvedValue({
        ...baseCall,
        disposition: 'ANSWERED',
      }),
    } as unknown as jest.Mocked<CallRepository>;
    const useCase = new WrapUpCallUseCase(
      calls,
      {} as CampaignRepository,
      {} as LeadRepository,
      {} as DncRepository,
      {} as CallbackRepository,
      { set: jest.fn(), get: jest.fn(), clear: jest.fn() },
      { emitToAgent: jest.fn(), emitToCampaign: jest.fn() },
    );
    await expect(
      useCase.execute({
        callId: 'call-1',
        agentId: 'agent-1',
        disposition: 'ANSWERED',
      }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it('CALLBACK sem data → erro', async () => {
    const calls = {
      findById: jest.fn().mockResolvedValue(baseCall),
      wrapUp: jest
        .fn()
        .mockResolvedValue({ ...baseCall, disposition: 'CALLBACK' }),
    } as unknown as jest.Mocked<CallRepository>;
    const campaigns = {
      updateCampaignLeadStatus: jest.fn(),
    } as unknown as jest.Mocked<CampaignRepository>;
    const useCase = new WrapUpCallUseCase(
      calls,
      campaigns,
      {} as LeadRepository,
      {} as DncRepository,
      { create: jest.fn() } as unknown as CallbackRepository,
      { set: jest.fn(), get: jest.fn(), clear: jest.fn() },
      { emitToAgent: jest.fn(), emitToCampaign: jest.fn() },
    );
    await expect(
      useCase.execute({
        callId: 'call-1',
        agentId: 'agent-1',
        disposition: 'CALLBACK',
      }),
    ).rejects.toThrow(BusinessRuleError);
  });
});

describe('CompleteWrapUpUseCase', () => {
  it('modo POWER disca o próximo lead', async () => {
    const wrapUp = {
      execute: jest.fn().mockResolvedValue({
        call: { ...baseCall, disposition: 'ANSWERED' },
        dialMode: 'POWER',
        campaignId: 'camp-1',
      }),
    } as unknown as WrapUpCallUseCase;
    const dialNext = {
      execute: jest.fn().mockResolvedValue({ call: { id: 'call-2' } }),
    } as unknown as DialNextLeadUseCase;
    const realtime: jest.Mocked<RealtimePublisher> = {
      emitToAgent: jest.fn(),
      emitToCampaign: jest.fn(),
    };
    const useCase = new CompleteWrapUpUseCase(wrapUp, dialNext, realtime);
    const result = await useCase.execute({
      callId: 'call-1',
      agentId: 'agent-1',
      disposition: 'ANSWERED',
    });
    expect(dialNext.execute).toHaveBeenCalledWith({
      agentId: 'agent-1',
      campaignId: 'camp-1',
    });
    expect(result.next).toEqual({ call: { id: 'call-2' } });
  });

  it('modo MANUAL não disca automaticamente', async () => {
    const wrapUp = {
      execute: jest.fn().mockResolvedValue({
        call: baseCall,
        dialMode: 'MANUAL',
        campaignId: 'camp-1',
      }),
    } as unknown as WrapUpCallUseCase;
    const dialNext = { execute: jest.fn() } as unknown as DialNextLeadUseCase;
    const useCase = new CompleteWrapUpUseCase(wrapUp, dialNext, {
      emitToAgent: jest.fn(),
      emitToCampaign: jest.fn(),
    });
    const result = await useCase.execute({
      callId: 'call-1',
      agentId: 'agent-1',
      disposition: 'ANSWERED',
      autoDialNext: false,
    });
    expect(dialNext.execute).not.toHaveBeenCalled();
    expect(result.call).toBeDefined();
  });

  it('POWER com fila vazia emite queue:empty', async () => {
    const wrapUp = {
      execute: jest.fn().mockResolvedValue({
        call: baseCall,
        dialMode: 'POWER',
        campaignId: 'camp-1',
      }),
    } as unknown as WrapUpCallUseCase;
    const dialNext = {
      execute: jest.fn().mockRejectedValue(new BusinessRuleError('Fila vazia')),
    } as unknown as DialNextLeadUseCase;
    const realtime: jest.Mocked<RealtimePublisher> = {
      emitToAgent: jest.fn(),
      emitToCampaign: jest.fn(),
    };
    const useCase = new CompleteWrapUpUseCase(wrapUp, dialNext, realtime);
    await useCase.execute({
      callId: 'call-1',
      agentId: 'agent-1',
      disposition: 'ANSWERED',
    });
    expect(realtime.emitToAgent).toHaveBeenCalledWith(
      'agent-1',
      'queue:empty',
      {
        campaignId: 'camp-1',
      },
    );
  });
});
