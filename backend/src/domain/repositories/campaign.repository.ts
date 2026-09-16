import type {
  Campaign,
  CampaignLead,
  CampaignLeadStatus,
  DialMode,
} from '../entities/campaign.entity';

export const CAMPAIGN_REPOSITORY = Symbol('CAMPAIGN_REPOSITORY');

export interface CampaignRepository {
  create(data: {
    name: string;
    script: string;
    dialMode: DialMode;
    gravarAudio: boolean;
    windowStart: string;
    windowEnd: string;
    timeZone: string;
  }): Promise<Campaign>;
  update(
    id: string,
    data: Partial<
      Pick<
        Campaign,
        | 'name'
        | 'script'
        | 'dialMode'
        | 'gravarAudio'
        | 'windowStart'
        | 'windowEnd'
        | 'timeZone'
        | 'active'
      >
    >,
  ): Promise<Campaign>;
  findById(id: string): Promise<Campaign | null>;
  list(): Promise<Campaign[]>;
  enqueueLeads(campaignId: string, leadIds: string[]): Promise<number>;
  findCampaignLeadById(id: string): Promise<CampaignLead | null>;
  findNextPending(campaignId: string): Promise<CampaignLead | null>;
  reserveNextPending(
    campaignId: string,
    agentId: string,
  ): Promise<CampaignLead | null>;
  updateCampaignLeadStatus(
    id: string,
    status: CampaignLeadStatus,
    agentId?: string | null,
  ): Promise<CampaignLead>;
  listQueue(campaignId: string): Promise<CampaignLead[]>;
}
