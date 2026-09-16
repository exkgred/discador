import type { Callback, DoNotCall } from '../entities/call.entity';

export const DNC_REPOSITORY = Symbol('DNC_REPOSITORY');

export interface DncRepository {
  isBlocked(phone: string): Promise<boolean>;
  add(phone: string, reason?: string | null): Promise<DoNotCall>;
  list(): Promise<DoNotCall[]>;
  remove(phone: string): Promise<void>;
}

export const CALLBACK_REPOSITORY = Symbol('CALLBACK_REPOSITORY');

export interface CallbackRepository {
  create(data: {
    leadId: string;
    campaignLeadId: string;
    agentId: string;
    callId?: string | null;
    scheduledAt: Date;
    notes?: string | null;
  }): Promise<Callback>;
}
