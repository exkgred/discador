import type { Lead } from '../entities/lead.entity';

export const LEAD_REPOSITORY = Symbol('LEAD_REPOSITORY');

export interface ListLeadsFilters {
  search?: string;
  page: number;
  perPage: number;
}

export interface LeadRepository {
  create(data: {
    name: string;
    phone: string;
    tags: string[];
    notes?: string | null;
    dncBlocked?: boolean;
  }): Promise<Lead>;
  update(
    id: string,
    data: Partial<
      Pick<Lead, 'name' | 'phone' | 'tags' | 'notes' | 'dncBlocked'>
    >,
  ): Promise<Lead>;
  findById(id: string): Promise<Lead | null>;
  findByPhone(phone: string): Promise<Lead | null>;
  list(filters: ListLeadsFilters): Promise<{ items: Lead[]; total: number }>;
  markDnc(phone: string, blocked: boolean): Promise<void>;
}
