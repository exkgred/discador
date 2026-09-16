import { Inject, Injectable } from '@nestjs/common';
import {
  DNC_REPOSITORY,
  type DncRepository,
} from '../../../domain/repositories/dnc.repository';
import {
  LEAD_REPOSITORY,
  type LeadRepository,
} from '../../../domain/repositories/lead.repository';
import { normalizePhone } from '../../../domain/ports/phone';

@Injectable()
export class AddDncUseCase {
  constructor(
    @Inject(DNC_REPOSITORY) private readonly dnc: DncRepository,
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
  ) {}

  async execute(input: { phone: string; reason?: string | null }) {
    const phone = normalizePhone(input.phone);
    const entry = await this.dnc.add(phone, input.reason ?? null);
    await this.leads.markDnc(phone, true);
    return entry;
  }
}

@Injectable()
export class ListDncUseCase {
  constructor(@Inject(DNC_REPOSITORY) private readonly dnc: DncRepository) {}

  execute() {
    return this.dnc.list();
  }
}
