import { Injectable } from '@nestjs/common';
import type {
  Campaign,
  CampaignLead,
  CampaignLeadStatus,
  DialMode,
} from '../../domain/entities/campaign.entity';
import type { CampaignRepository } from '../../domain/repositories/campaign.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PrismaCampaignRepository implements CampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    name: string;
    script: string;
    dialMode: DialMode;
    gravarAudio: boolean;
    windowStart: string;
    windowEnd: string;
    timeZone: string;
    segment?: string | null;
  }): Promise<Campaign> {
    return this.prisma.campaign.create({ data });
  }

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
        | 'segment'
      >
    >,
  ): Promise<Campaign> {
    return this.prisma.campaign.update({ where: { id }, data });
  }

  findById(id: string): Promise<Campaign | null> {
    return this.prisma.campaign.findUnique({ where: { id } });
  }

  list(): Promise<Campaign[]> {
    return this.prisma.campaign.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async enqueueLeads(campaignId: string, leadIds: string[]): Promise<number> {
    const last = await this.prisma.campaignLead.findFirst({
      where: { campaignId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    let position = (last?.position ?? -1) + 1;
    let added = 0;
    for (const leadId of leadIds) {
      try {
        await this.prisma.campaignLead.create({
          data: { campaignId, leadId, position },
        });
        position += 1;
        added += 1;
      } catch {
        // unique campaign+lead
      }
    }
    return added;
  }

  async findCampaignLeadById(id: string): Promise<CampaignLead | null> {
    const row = await this.prisma.campaignLead.findUnique({
      where: { id },
      include: { lead: true },
    });
    return row ? this.toCampaignLead(row) : null;
  }

  async findNextPending(campaignId: string): Promise<CampaignLead | null> {
    const row = await this.prisma.campaignLead.findFirst({
      where: { campaignId, status: 'PENDING', lead: { dncBlocked: false } },
      orderBy: { position: 'asc' },
      include: { lead: true },
    });
    return row ? this.toCampaignLead(row) : null;
  }

  async reserveNextPending(
    campaignId: string,
    agentId: string,
  ): Promise<CampaignLead | null> {
    const next = await this.findNextPending(campaignId);
    if (!next) {
      return null;
    }
    const updated = await this.prisma.campaignLead.updateMany({
      where: { id: next.id, status: 'PENDING' },
      data: { status: 'DIALING', agentId },
    });
    if (updated.count === 0) {
      return this.reserveNextPending(campaignId, agentId);
    }
    return this.findCampaignLeadById(next.id);
  }

  async updateCampaignLeadStatus(
    id: string,
    status: CampaignLeadStatus,
    agentId?: string | null,
  ): Promise<CampaignLead> {
    const row = await this.prisma.campaignLead.update({
      where: { id },
      data: {
        status,
        ...(agentId !== undefined ? { agentId } : {}),
      },
      include: { lead: true },
    });
    return this.toCampaignLead(row);
  }

  async listQueue(campaignId: string): Promise<CampaignLead[]> {
    const rows = await this.prisma.campaignLead.findMany({
      where: { campaignId },
      orderBy: { position: 'asc' },
      include: { lead: true },
    });
    return rows.map((row) => this.toCampaignLead(row));
  }

  private toCampaignLead(row: {
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
      tags: string[];
      dncBlocked: boolean;
    };
  }): CampaignLead {
    return {
      id: row.id,
      campaignId: row.campaignId,
      leadId: row.leadId,
      position: row.position,
      status: row.status,
      agentId: row.agentId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lead: row.lead,
    };
  }
}
