import { Injectable } from '@nestjs/common';
import type { Lead } from '../../domain/entities/lead.entity';
import type {
  LeadRepository,
  ListLeadsFilters,
} from '../../domain/repositories/lead.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PrismaLeadRepository implements LeadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    phone: string;
    tags: string[];
    notes?: string | null;
    dncBlocked?: boolean;
    company?: string;
    city?: string;
    segment?: string;
    activity?: string;
  }): Promise<Lead> {
    return this.prisma.lead.create({
      data: {
        name: data.name,
        phone: data.phone,
        tags: data.tags,
        notes: data.notes ?? null,
        dncBlocked: data.dncBlocked ?? false,
        company: data.company ?? '',
        city: data.city ?? '',
        segment: data.segment ?? '',
        activity: data.activity ?? '',
      },
    });
  }

  async update(
    id: string,
    data: Partial<
      Pick<
        Lead,
        | 'name'
        | 'phone'
        | 'tags'
        | 'notes'
        | 'dncBlocked'
        | 'company'
        | 'city'
        | 'segment'
        | 'activity'
      >
    >,
  ): Promise<Lead> {
    return this.prisma.lead.update({ where: { id }, data });
  }

  async findById(id: string): Promise<Lead | null> {
    return this.prisma.lead.findUnique({ where: { id } });
  }

  async findByPhone(phone: string): Promise<Lead | null> {
    return this.prisma.lead.findUnique({ where: { phone } });
  }

  async list(
    filters: ListLeadsFilters,
  ): Promise<{ items: Lead[]; total: number }> {
    const where = {
      ...(filters.segment ? { segment: filters.segment } : {}),
      ...(filters.activity ? { activity: filters.activity } : {}),
      ...(filters.search
        ? {
            OR: [
              {
                name: { contains: filters.search, mode: 'insensitive' as const },
              },
              { phone: { contains: filters.search } },
              { company: { contains: filters.search, mode: 'insensitive' as const } },
              { city: { contains: filters.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.perPage,
        take: filters.perPage,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { items, total };
  }

  async markDnc(phone: string, blocked: boolean): Promise<void> {
    await this.prisma.lead.updateMany({
      where: { phone },
      data: { dncBlocked: blocked },
    });
  }
}
