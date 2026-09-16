export type DialMode = 'MANUAL' | 'POWER';
export type CampaignLeadStatus =
  | 'PENDING'
  | 'DIALING'
  | 'IN_CALL'
  | 'WRAP_UP'
  | 'DONE'
  | 'NO_ANSWER'
  | 'CALLBACK'
  | 'DNC';

export interface Campaign {
  id: string;
  name: string;
  script: string;
  dialMode: DialMode;
  gravarAudio: boolean;
  windowStart: string;
  windowEnd: string;
  timeZone: string;
  segment?: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignLead {
  id: string;
  campaignId: string;
  leadId: string;
  position: number;
  status: CampaignLeadStatus;
  agentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lead?: {
    id: string;
    name: string;
    phone: string;
    company?: string;
    city?: string;
    segment?: string;
    activity?: string;
    tags: string[];
    dncBlocked: boolean;
  };
}
