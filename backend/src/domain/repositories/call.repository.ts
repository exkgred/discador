import type {
  Call,
  CallDisposition,
  CallStatus,
} from '../entities/call.entity';

export const CALL_REPOSITORY = Symbol('CALL_REPOSITORY');

export interface CreateCallInput {
  zenviaChamadaId: string;
  campaignId: string;
  campaignLeadId: string;
  leadId: string;
  agentId: string;
  status?: CallStatus;
}

export interface FinalizeCallInput {
  recordingUrl?: string | null;
  durationSeconds?: number | null;
  spokenSeconds?: number | null;
  billedSeconds?: number | null;
  price?: number | null;
  disconnectReason?: string | null;
  status: CallStatus;
  endedAt?: Date;
}

export interface CallRepository {
  create(data: CreateCallInput): Promise<Call>;
  findById(id: string): Promise<Call | null>;
  findByZenviaId(zenviaChamadaId: string): Promise<Call | null>;
  findActiveByAgent(agentId: string): Promise<Call | null>;
  updateStatus(id: string, status: CallStatus): Promise<Call>;
  finalizeFromWebhook(
    zenviaChamadaId: string,
    data: FinalizeCallInput,
  ): Promise<Call>;
  wrapUp(
    id: string,
    disposition: CallDisposition,
    notes: string | null,
  ): Promise<Call>;
  list(filters: {
    campaignId?: string;
    agentId?: string;
    page: number;
    perPage: number;
  }): Promise<{ items: Call[]; total: number }>;
}
