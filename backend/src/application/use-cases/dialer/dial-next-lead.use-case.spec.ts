import { BusinessRuleError } from '../../../domain/errors/domain-error';
import type { CampaignLead } from '../../../domain/entities/campaign.entity';
import type { Call } from '../../../domain/entities/call.entity';
import type { User } from '../../../domain/entities/user.entity';
import type { CampaignRepository } from '../../../domain/repositories/campaign.repository';
import type { CallRepository } from '../../../domain/repositories/call.repository';
import type { DncRepository } from '../../../domain/repositories/dnc.repository';
import type { UserRepository } from '../../../domain/repositories/user.repository';
import type { ZenviaVoicePort } from '../../../domain/ports/zenvia-voice.port';
import type {
  AgentSessionPort,
  RealtimePublisher,
} from '../../../domain/ports/realtime.port';
import {
  DialNextLeadUseCase,
  SetAgentReadyUseCase,
} from './dial-next-lead.use-case';

function mondayTenAm(): Date {
  return new Date('2026-09-14T13:00:00.000Z');
}

function saturday(): Date {
  return new Date('2026-09-12T13:00:00.000Z');
}

describe('DialNextLeadUseCase', () => {
  let campaigns: jest.Mocked<CampaignRepository>;
  let calls: jest.Mocked<CallRepository>;
  let dnc: jest.Mocked<DncRepository>;
  let users: jest.Mocked<UserRepository>;
  let voice: jest.Mocked<ZenviaVoicePort>;
  let sessions: jest.Mocked<AgentSessionPort>;
  let realtime: jest.Mocked<RealtimePublisher>;
  let useCase: DialNextLeadUseCase;

  const agent: User = {
    id: 'agent-1',
    name: 'Agente',
    email: 'agent@discador.dev',
    passwordHash: 'x',
    role: 'AGENT',
    ramalId: '1002',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const campaignLead: CampaignLead = {
    id: 'cl-1',
    campaignId: 'camp-1',
    leadId: 'lead-1',
    position: 0,
    status: 'DIALING',
    agentId: 'agent-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    lead: {
      id: 'lead-1',
      name: 'Maria',
      phone: '+5511988880001',
      tags: [],
      dncBlocked: false,
    },
  };

  const call: Call = {
    id: 'call-1',
    zenviaChamadaId: '999',
    campaignId: 'camp-1',
    campaignLeadId: 'cl-1',
    leadId: 'lead-1',
    agentId: 'agent-1',
    status: 'RINGING',
    recordingUrl: null,
    durationSeconds: null,
    spokenSeconds: null,
    billedSeconds: null,
    price: null,
    disconnectReason: null,
    disposition: null,
    wrapUpNotes: null,
    webhookProcessedAt: null,
    startedAt: new Date(),
    endedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
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
    dnc = {
      isBlocked: jest.fn(),
      add: jest.fn(),
      list: jest.fn(),
      remove: jest.fn(),
    };
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      create: jest.fn(),
      toPublic: jest.fn(),
    };
    voice = {
      placeCall: jest.fn(),
      getCall: jest.fn(),
      hangup: jest.fn(),
      getWebphoneUrl: jest.fn(),
    };
    sessions = { set: jest.fn(), get: jest.fn(), clear: jest.fn() };
    realtime = { emitToAgent: jest.fn(), emitToCampaign: jest.fn() };
    useCase = new DialNextLeadUseCase(
      campaigns,
      calls,
      dnc,
      users,
      voice,
      sessions,
      realtime,
    );

    users.findById.mockResolvedValue(agent);
    calls.findActiveByAgent.mockResolvedValue(null);
    sessions.get.mockResolvedValue({
      userId: 'agent-1',
      campaignId: 'camp-1',
      status: 'idle',
    });
    campaigns.findById.mockResolvedValue({
      id: 'camp-1',
      name: 'Piloto',
      script: 'Olá',
      dialMode: 'POWER',
      gravarAudio: true,
      windowStart: '08:00',
      windowEnd: '18:00',
      timeZone: 'America/Sao_Paulo',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    campaigns.reserveNextPending.mockResolvedValue(campaignLead);
    dnc.isBlocked.mockResolvedValue(false);
    voice.placeCall.mockResolvedValue({ chamadaId: '999', mock: true });
    calls.create.mockResolvedValue(call);
  });

  it('reserva lead e dispara POST /chamada', async () => {
    const result = await useCase.execute({
      agentId: 'agent-1',
      now: mondayTenAm(),
    });
    expect(voice.placeCall).toHaveBeenCalledWith({
      origin: '1002',
      destination: '+5511988880001',
      recordAudio: true,
      tags: 'campaign:camp-1;lead:lead-1',
    });
    expect(result.call.zenviaChamadaId).toBe('999');
    expect(realtime.emitToAgent).toHaveBeenCalledWith(
      'agent-1',
      'call:started',
      expect.any(Object),
    );
  });

  it('DNC → BUSINESS_RULE_VIOLATION e marca lead DNC', async () => {
    dnc.isBlocked.mockResolvedValue(true);
    await expect(
      useCase.execute({ agentId: 'agent-1', now: mondayTenAm() }),
    ).rejects.toThrow(BusinessRuleError);
    expect(campaigns.updateCampaignLeadStatus).toHaveBeenCalledWith(
      'cl-1',
      'DNC',
      'agent-1',
    );
    expect(voice.placeCall).not.toHaveBeenCalled();
  });

  it('fim de semana → recusa discagem', async () => {
    await expect(
      useCase.execute({ agentId: 'agent-1', now: saturday() }),
    ).rejects.toThrow(BusinessRuleError);
    expect(voice.placeCall).not.toHaveBeenCalled();
  });

  it('lead já em discagem (reserva específica) → erro', async () => {
    campaigns.findCampaignLeadById.mockResolvedValue({
      ...campaignLead,
      status: 'DIALING',
    });
    await expect(
      useCase.execute({
        agentId: 'agent-1',
        campaignLeadId: 'cl-1',
        now: mondayTenAm(),
      }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it('campanha inativa na discagem → erro', async () => {
    campaigns.findById.mockResolvedValue({
      id: 'camp-1',
      name: 'Piloto',
      script: 'Olá',
      dialMode: 'POWER',
      gravarAudio: true,
      windowStart: '08:00',
      windowEnd: '18:00',
      timeZone: 'America/Sao_Paulo',
      active: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(
      useCase.execute({ agentId: 'agent-1', now: mondayTenAm() }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it('fila vazia → erro', async () => {
    campaigns.reserveNextPending.mockResolvedValue(null);
    await expect(
      useCase.execute({ agentId: 'agent-1', now: mondayTenAm() }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it('usuário inexistente → NotFoundError', async () => {
    users.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ agentId: 'missing', now: mondayTenAm() }),
    ).rejects.toThrow();
  });

  it('campanha inexistente → NotFoundError', async () => {
    campaigns.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ agentId: 'agent-1', now: mondayTenAm() }),
    ).rejects.toThrow();
  });

  it('campaignLeadId inexistente → NotFoundError', async () => {
    campaigns.findCampaignLeadById.mockResolvedValue(null);
    await expect(
      useCase.execute({
        agentId: 'agent-1',
        campaignLeadId: 'missing',
        now: mondayTenAm(),
      }),
    ).rejects.toThrow();
  });

  it('agente sem ramal → erro', async () => {
    users.findById.mockResolvedValue({ ...agent, ramalId: null });
    await expect(
      useCase.execute({ agentId: 'agent-1', now: mondayTenAm() }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it('chamada ativa → erro', async () => {
    calls.findActiveByAgent.mockResolvedValue(call);
    await expect(
      useCase.execute({ agentId: 'agent-1', now: mondayTenAm() }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it('sem campanha selecionada → erro', async () => {
    sessions.get.mockResolvedValue(null);
    await expect(
      useCase.execute({ agentId: 'agent-1', now: mondayTenAm() }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it('disca lead específico PENDING', async () => {
    campaigns.findCampaignLeadById.mockResolvedValue({
      ...campaignLead,
      status: 'PENDING',
    });
    campaigns.updateCampaignLeadStatus.mockResolvedValue(campaignLead);
    await useCase.execute({
      agentId: 'agent-1',
      campaignLeadId: 'cl-1',
      now: mondayTenAm(),
    });
    expect(campaigns.updateCampaignLeadStatus).toHaveBeenCalledWith(
      'cl-1',
      'DIALING',
      'agent-1',
    );
  });
});

describe('SetAgentReadyUseCase', () => {
  it('campanha inexistente → NotFoundError', async () => {
    const campaigns = {
      findById: jest.fn().mockResolvedValue(null),
    } as unknown as CampaignRepository;
    const useCase = new SetAgentReadyUseCase(
      campaigns,
      { set: jest.fn(), get: jest.fn(), clear: jest.fn() },
      { emitToAgent: jest.fn(), emitToCampaign: jest.fn() },
    );
    await expect(
      useCase.execute({ userId: 'a', campaignId: 'x' }),
    ).rejects.toThrow();
  });

  it('campanha inativa → BusinessRuleError', async () => {
    const campaigns = {
      findById: jest.fn().mockResolvedValue({ id: 'c', active: false }),
    } as unknown as CampaignRepository;
    const useCase = new SetAgentReadyUseCase(
      campaigns,
      { set: jest.fn(), get: jest.fn(), clear: jest.fn() },
      { emitToAgent: jest.fn(), emitToCampaign: jest.fn() },
    );
    await expect(
      useCase.execute({ userId: 'a', campaignId: 'c' }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it('grava sessão idle', async () => {
    const sessions = { set: jest.fn(), get: jest.fn(), clear: jest.fn() };
    const realtime = { emitToAgent: jest.fn(), emitToCampaign: jest.fn() };
    const campaigns = {
      findById: jest.fn().mockResolvedValue({ id: 'c', active: true }),
    } as unknown as CampaignRepository;
    const useCase = new SetAgentReadyUseCase(campaigns, sessions, realtime);
    const result = await useCase.execute({ userId: 'a', campaignId: 'c' });
    expect(result.status).toBe('idle');
    expect(sessions.set).toHaveBeenCalled();
  });
});
