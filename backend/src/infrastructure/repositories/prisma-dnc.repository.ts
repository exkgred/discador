import { Injectable } from '@nestjs/common';
import type { Callback, DoNotCall } from '../../domain/entities/call.entity';
import type {
  CallbackRepository,
  DncRepository,
} from '../../domain/repositories/dnc.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PrismaDncRepository implements DncRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isBlocked(phone: string): Promise<boolean> {
    const row = await this.prisma.doNotCall.findUnique({ where: { phone } });
    return Boolean(row);
  }

  async add(phone: string, reason?: string | null): Promise<DoNotCall> {
    return this.prisma.doNotCall.upsert({
      where: { phone },
      update: { reason: reason ?? undefined },
      create: { phone, reason: reason ?? null },
    });
  }

  list(): Promise<DoNotCall[]> {
    return this.prisma.doNotCall.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async remove(phone: string): Promise<void> {
    await this.prisma.doNotCall.deleteMany({ where: { phone } });
  }
}

@Injectable()
export class PrismaCallbackRepository implements CallbackRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    leadId: string;
    campaignLeadId: string;
    agentId: string;
    callId?: string | null;
    scheduledAt: Date;
    notes?: string | null;
  }): Promise<Callback> {
    return this.prisma.callback.create({
      data: {
        leadId: data.leadId,
        campaignLeadId: data.campaignLeadId,
        agentId: data.agentId,
        callId: data.callId ?? null,
        scheduledAt: data.scheduledAt,
        notes: data.notes ?? null,
      },
    });
  }
}
