export type CallStatus =
  'CREATED' | 'RINGING' | 'IN_CALL' | 'FINALIZED' | 'FAILED';
export type CallDisposition =
  | 'ANSWERED'
  | 'NO_ANSWER'
  | 'VOICEMAIL'
  | 'BUSY'
  | 'CALLBACK'
  | 'DNC'
  | 'OTHER';

export interface Call {
  id: string;
  zenviaChamadaId: string;
  campaignId: string;
  campaignLeadId: string;
  leadId: string;
  agentId: string;
  status: CallStatus;
  recordingUrl: string | null;
  durationSeconds: number | null;
  spokenSeconds: number | null;
  billedSeconds: number | null;
  price: number | null;
  disconnectReason: string | null;
  disposition: CallDisposition | null;
  wrapUpNotes: string | null;
  webhookProcessedAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DoNotCall {
  id: string;
  phone: string;
  reason: string | null;
  createdAt: Date;
}

export interface Callback {
  id: string;
  leadId: string;
  campaignLeadId: string;
  agentId: string;
  callId: string | null;
  scheduledAt: Date;
  notes: string | null;
  completed: boolean;
  createdAt: Date;
}
