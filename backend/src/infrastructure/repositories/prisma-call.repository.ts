import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  Call,
  CallDisposition,
  CallStatus,
} from '../../domain/entities/call.entity';
import type {
  CallRepository,
  CreateCallInput,
  FinalizeCallInput,
} from '../../domain/repositories/call.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PrismaCallRepository implements CallRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCallInput): Promise<Call> {
    const row = await this.prisma.call.create({
      data: {
        zenviaChamadaId: data.zenviaChamadaId,
        campaignId: data.campaignId,
        campaignLeadId: data.campaignLeadId,
        leadId: data.leadId,
        agentId: data.agentId,
        status: data.status ?? 'CREATED',
        startedAt: new Date(),
      },
    });
    return this.toDomain(row);
  }

  async findById(id: string): Promise<Call | null> {
    const row = await this.prisma.call.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByZenviaId(zenviaChamadaId: string): Promise<Call | null> {
    const row = await this.prisma.call.findUnique({
      where: { zenviaChamadaId },
    });
    return row ? this.toDomain(row) : null;
  }

  async findActiveByAgent(agentId: string): Promise<Call | null> {
    const row = await this.prisma.call.findFirst({
      where: {
        agentId,
        status: { in: ['CREATED', 'RINGING', 'IN_CALL'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.toDomain(row) : null;
  }

  async updateStatus(id: string, status: CallStatus): Promise<Call> {
    const row = await this.prisma.call.update({
      where: { id },
      data: { status },
    });
    return this.toDomain(row);
  }

  async finalizeFromWebhook(
    zenviaChamadaId: string,
    data: FinalizeCallInput,
  ): Promise<Call> {
    const row = await this.prisma.call.update({
      where: { zenviaChamadaId },
      data: {
        status: data.status,
        recordingUrl: data.recordingUrl,
        durationSeconds: data.durationSeconds,
        spokenSeconds: data.spokenSeconds,
        billedSeconds: data.billedSeconds,
        price: data.price ?? undefined,
        disconnectReason: data.disconnectReason,
        endedAt: data.endedAt ?? new Date(),
        webhookProcessedAt: new Date(),
      },
    });
    return this.toDomain(row);
  }

  async wrapUp(
    id: string,
    disposition: CallDisposition,
    notes: string | null,
  ): Promise<Call> {
    const row = await this.prisma.call.update({
      where: { id },
      data: { disposition, wrapUpNotes: notes },
    });
    return this.toDomain(row);
  }

  async list(filters: {
    campaignId?: string;
    agentId?: string;
    page: number;
    perPage: number;
  }): Promise<{ items: Call[]; total: number }> {
    const where = {
      ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
      ...(filters.agentId ? { agentId: filters.agentId } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.call.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.perPage,
        take: filters.perPage,
      }),
      this.prisma.call.count({ where }),
    ]);
    return { items: rows.map((row) => this.toDomain(row)), total };
  }

  private toDomain(row: {
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
    price: Prisma.Decimal | null;
    disconnectReason: string | null;
    disposition: CallDisposition | null;
    wrapUpNotes: string | null;
    webhookProcessedAt: Date | null;
    startedAt: Date | null;
    endedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Call {
    return {
      ...row,
      price: row.price === null ? null : Number(row.price),
    };
  }
}
