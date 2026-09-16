import { Inject, Injectable } from '@nestjs/common';
import type {
  Campaign,
  DialMode,
} from '../../../domain/entities/campaign.entity';
import { NotFoundError } from '../../../domain/errors/domain-error';
import {
  CAMPAIGN_REPOSITORY,
  type CampaignRepository,
} from '../../../domain/repositories/campaign.repository';
import {
  LEAD_REPOSITORY,
  type LeadRepository,
} from '../../../domain/repositories/lead.repository';

@Injectable()
export class CreateCampaignUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY) private readonly campaigns: CampaignRepository,
  ) {}

  execute(input: {
    name: string;
    script: string;
    dialMode?: DialMode;
    gravarAudio?: boolean;
    windowStart?: string;
    windowEnd?: string;
    timeZone?: string;
  }): Promise<Campaign> {
    return this.campaigns.create({
      name: input.name,
      script: input.script,
      dialMode: input.dialMode ?? 'MANUAL',
      gravarAudio: input.gravarAudio ?? true,
      windowStart: input.windowStart ?? '08:00',
      windowEnd: input.windowEnd ?? '18:00',
      timeZone: input.timeZone ?? 'America/Sao_Paulo',
    });
  }
}

@Injectable()
export class UpdateCampaignUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY) private readonly campaigns: CampaignRepository,
  ) {}

  async execute(
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
  ): Promise<Campaign> {
    const campaign = await this.campaigns.findById(id);
    if (!campaign) {
      throw new NotFoundError('Campaign');
    }
    return this.campaigns.update(id, data);
  }
}

@Injectable()
export class ListCampaignsUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY) private readonly campaigns: CampaignRepository,
  ) {}

  execute(): Promise<Campaign[]> {
    return this.campaigns.list();
  }
}

@Injectable()
export class GetCampaignUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY) private readonly campaigns: CampaignRepository,
  ) {}

  async execute(id: string): Promise<Campaign> {
    const campaign = await this.campaigns.findById(id);
    if (!campaign) {
      throw new NotFoundError('Campaign');
    }
    return campaign;
  }
}

@Injectable()
export class EnqueueLeadsUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY) private readonly campaigns: CampaignRepository,
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
  ) {}

  async execute(
    campaignId: string,
    leadIds: string[],
  ): Promise<{ added: number }> {
    const campaign = await this.campaigns.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign');
    }
    const valid: string[] = [];
    for (const leadId of leadIds) {
      const lead = await this.leads.findById(leadId);
      if (lead) {
        valid.push(leadId);
      }
    }
    const added = await this.campaigns.enqueueLeads(campaignId, valid);
    return { added };
  }
}

@Injectable()
export class ListCampaignQueueUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY) private readonly campaigns: CampaignRepository,
  ) {}

  async execute(campaignId: string) {
    const campaign = await this.campaigns.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign');
    }
    return this.campaigns.listQueue(campaignId);
  }
}
