import { Inject, Injectable } from '@nestjs/common';
import type { Lead } from '../../../domain/entities/lead.entity';
import {
  ConflictError,
  NotFoundError,
} from '../../../domain/errors/domain-error';
import { normalizePhone } from '../../../domain/ports/phone';
import {
  DNC_REPOSITORY,
  type DncRepository,
} from '../../../domain/repositories/dnc.repository';
import {
  LEAD_REPOSITORY,
  type LeadRepository,
} from '../../../domain/repositories/lead.repository';

@Injectable()
export class CreateLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    @Inject(DNC_REPOSITORY) private readonly dnc: DncRepository,
  ) {}

  async execute(input: {
    name: string;
    phone: string;
    tags?: string[];
    notes?: string | null;
  }): Promise<Lead> {
    const phone = normalizePhone(input.phone);
    const existing = await this.leads.findByPhone(phone);
    if (existing) {
      throw new ConflictError('Lead com este telefone já existe');
    }
    const blocked = await this.dnc.isBlocked(phone);
    return this.leads.create({
      name: input.name,
      phone,
      tags: input.tags ?? [],
      notes: input.notes ?? null,
      dncBlocked: blocked,
    });
  }
}

@Injectable()
export class UpdateLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    @Inject(DNC_REPOSITORY) private readonly dnc: DncRepository,
  ) {}

  async execute(input: {
    id: string;
    name?: string;
    phone?: string;
    tags?: string[];
    notes?: string | null;
  }): Promise<Lead> {
    const current = await this.leads.findById(input.id);
    if (!current) {
      throw new NotFoundError('Lead');
    }
    const phone = input.phone ? normalizePhone(input.phone) : undefined;
    if (phone && phone !== current.phone) {
      const existing = await this.leads.findByPhone(phone);
      if (existing) {
        throw new ConflictError('Lead com este telefone já existe');
      }
    }
    const nextPhone = phone ?? current.phone;
    const blocked = await this.dnc.isBlocked(nextPhone);
    return this.leads.update(input.id, {
      name: input.name,
      phone,
      tags: input.tags,
      notes: input.notes,
      dncBlocked: blocked,
    });
  }
}

@Injectable()
export class ListLeadsUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
  ) {}

  async execute(input: { search?: string; page?: number; perPage?: number }) {
    const page = input.page && input.page > 0 ? input.page : 1;
    const perPage = input.perPage && input.perPage > 0 ? input.perPage : 20;
    const result = await this.leads.list({
      search: input.search,
      page,
      perPage,
    });
    return { ...result, page, perPage };
  }
}

@Injectable()
export class GetLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
  ) {}

  async execute(id: string): Promise<Lead> {
    const lead = await this.leads.findById(id);
    if (!lead) {
      throw new NotFoundError('Lead');
    }
    return lead;
  }
}

@Injectable()
export class ImportLeadsCsvUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    @Inject(DNC_REPOSITORY) private readonly dnc: DncRepository,
  ) {}

  async execute(csv: string): Promise<{ created: number; skipped: number }> {
    const lines = csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      return { created: 0, skipped: 0 };
    }

    const header = lines[0].toLowerCase();
    const hasHeader = header.includes('name') || header.includes('nome');
    const rows = hasHeader ? lines.slice(1) : lines;

    let created = 0;
    let skipped = 0;
    for (const row of rows) {
      const cols = parseCsvRow(row);
      const name = cols[0]?.trim();
      const phoneRaw = cols[1]?.trim();
      const tags = (cols[2] ?? '')
        .split(';')
        .map((tag) => tag.trim())
        .filter(Boolean);
      if (!name || !phoneRaw) {
        skipped += 1;
        continue;
      }
      try {
        const phone = normalizePhone(phoneRaw);
        const existing = await this.leads.findByPhone(phone);
        if (existing) {
          skipped += 1;
          continue;
        }
        const blocked = await this.dnc.isBlocked(phone);
        await this.leads.create({ name, phone, tags, dncBlocked: blocked });
        created += 1;
      } catch {
        skipped += 1;
      }
    }
    return { created, skipped };
  }
}

function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let quoted = false;
  for (const char of row) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      result.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current);
  return result;
}
