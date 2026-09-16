export const REALTIME_PUBLISHER = Symbol('REALTIME_PUBLISHER');

export type AgentStatus = 'idle' | 'ringing' | 'in_call' | 'wrap_up';

export interface RealtimePublisher {
  emitToAgent(agentId: string, event: string, payload: unknown): void;
  emitToCampaign(campaignId: string, event: string, payload: unknown): void;
}

export const AGENT_SESSION_PORT = Symbol('AGENT_SESSION_PORT');

export interface AgentSession {
  userId: string;
  campaignId: string;
  status: AgentStatus;
}

export interface AgentSessionPort {
  set(session: AgentSession): Promise<void>;
  get(userId: string): Promise<AgentSession | null>;
  clear(userId: string): Promise<void>;
}

export const HANGUP_SCHEDULER = Symbol('HANGUP_SCHEDULER');

export interface HangupScheduler {
  scheduleMockHangup(chamadaId: string, delayMs: number): Promise<void>;
}
