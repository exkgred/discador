import { normalizePhone } from '../../../domain/ports/phone';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../domain/errors/domain-error';
import {
  CreateLeadUseCase,
  GetLeadUseCase,
  ImportLeadsCsvUseCase,
  ListLeadsUseCase,
  UpdateLeadUseCase,
} from './leads.use-case';
import type { LeadRepository } from '../../../domain/repositories/lead.repository';
import type { DncRepository } from '../../../domain/repositories/dnc.repository';

describe('normalizePhone', () => {
  it('DDD+número → E.164 BR', () => {
    expect(normalizePhone('11988880001')).toBe('+5511988880001');
  });

  it('já com +55 permanece', () => {
    expect(normalizePhone('+55 (11) 98888-0001')).toBe('+5511988880001');
  });

  it('inválido → ValidationError', () => {
    expect(() => normalizePhone('123')).toThrow(ValidationError);
  });
});

describe('ImportLeadsCsvUseCase', () => {
  it('importa linhas novas e ignora duplicadas', async () => {
    const leads: jest.Mocked<LeadRepository> = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByPhone: jest.fn(),
      list: jest.fn(),
      markDnc: jest.fn(),
    };
    const dnc: jest.Mocked<DncRepository> = {
      isBlocked: jest.fn().mockResolvedValue(false),
      add: jest.fn(),
      list: jest.fn(),
      remove: jest.fn(),
    };
    leads.findByPhone.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: '1',
      name: 'Existe',
      phone: '+5511988880002',
      tags: [],
      dncBlocked: false,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    leads.create.mockResolvedValue({
      id: 'n',
      name: 'Maria',
      phone: '+5511988880001',
      tags: ['vip'],
      dncBlocked: false,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const useCase = new ImportLeadsCsvUseCase(leads, dnc);
    const result = await useCase.execute(
      'name,phone,tags\nMaria,11988880001,vip\nJoão,11988880002,novo',
    );
    expect(result).toEqual({ created: 1, skipped: 1 });
  });
});

describe('CreateLeadUseCase', () => {
  it('marca DNC se telefone bloqueado', async () => {
    const leads: jest.Mocked<LeadRepository> = {
      create: jest.fn().mockResolvedValue({
        id: '1',
        name: 'Maria',
        phone: '+5511988880001',
        tags: [],
        dncBlocked: true,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      update: jest.fn(),
      findById: jest.fn(),
      findByPhone: jest.fn().mockResolvedValue(null),
      list: jest.fn(),
      markDnc: jest.fn(),
    };
    const dnc: jest.Mocked<DncRepository> = {
      isBlocked: jest.fn().mockResolvedValue(true),
      add: jest.fn(),
      list: jest.fn(),
      remove: jest.fn(),
    };
    const created = await new CreateLeadUseCase(leads, dnc).execute({
      name: 'Maria',
      phone: '11988880001',
      company: 'Clínica Vida',
      city: 'São Paulo',
      segment: 'saude',
      activity: 'Clínica',
    });
    expect(leads.create).toHaveBeenCalledWith(
      expect.objectContaining({
        dncBlocked: true,
        phone: '+5511988880001',
        company: 'Clínica Vida',
        segment: 'saude',
      }),
    );
    expect(created.dncBlocked).toBe(true);
  });

  it('telefone duplicado → ConflictError', async () => {
    const leads = {
      findByPhone: jest.fn().mockResolvedValue({ id: '1' }),
    } as unknown as jest.Mocked<LeadRepository>;
    const dnc = {
      isBlocked: jest.fn(),
    } as unknown as jest.Mocked<DncRepository>;
    await expect(
      new CreateLeadUseCase(leads, dnc).execute({
        name: 'Maria',
        phone: '11988880001',
      }),
    ).rejects.toThrow(ConflictError);
  });
});

describe('GetLeadUseCase', () => {
  it('inexistente → NotFoundError', async () => {
    const leads = {
      findById: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<LeadRepository>;
    await expect(new GetLeadUseCase(leads).execute('x')).rejects.toThrow(
      NotFoundError,
    );
  });

  it('retorna lead', async () => {
    const lead = {
      id: '1',
      name: 'Maria',
      phone: '+5511988880001',
      tags: [],
      dncBlocked: false,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const leads = {
      findById: jest.fn().mockResolvedValue(lead),
    } as unknown as jest.Mocked<LeadRepository>;
    await expect(new GetLeadUseCase(leads).execute('1')).resolves.toEqual(lead);
  });
});

describe('ListLeadsUseCase', () => {
  it('aplica paginação padrão', async () => {
    const leads = {
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    } as unknown as jest.Mocked<LeadRepository>;
    const result = await new ListLeadsUseCase(leads).execute({});
    expect(leads.list).toHaveBeenCalledWith({
      search: undefined,
      segment: undefined,
      activity: undefined,
      page: 1,
      perPage: 20,
    });
    expect(result.page).toBe(1);
  });

  it('encaminha filtro de segmento e atividade', async () => {
    const leads = {
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    } as unknown as jest.Mocked<LeadRepository>;
    await new ListLeadsUseCase(leads).execute({
      segment: 'saude',
      activity: 'Clínica',
    });
    expect(leads.list).toHaveBeenCalledWith({
      search: undefined,
      segment: 'saude',
      activity: 'Clínica',
      page: 1,
      perPage: 20,
    });
  });
});

describe('UpdateLeadUseCase', () => {
  it('inexistente → NotFoundError', async () => {
    const leads = {
      findById: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<LeadRepository>;
    const dnc = {
      isBlocked: jest.fn(),
    } as unknown as jest.Mocked<DncRepository>;
    await expect(
      new UpdateLeadUseCase(leads, dnc).execute({ id: 'x', name: 'A' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('atualiza e recarrega DNC', async () => {
    const current = {
      id: '1',
      name: 'Maria',
      phone: '+5511988880001',
      tags: [],
      dncBlocked: false,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const leads = {
      findById: jest.fn().mockResolvedValue(current),
      findByPhone: jest.fn(),
      update: jest.fn().mockResolvedValue({ ...current, name: 'Maria Silva' }),
    } as unknown as jest.Mocked<LeadRepository>;
    const dnc = {
      isBlocked: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<DncRepository>;
    await new UpdateLeadUseCase(leads, dnc).execute({
      id: '1',
      name: 'Maria Silva',
      company: 'Clínica Vida',
      segment: 'saude',
      activity: 'Clínica',
      city: 'São Paulo',
    });
    expect(leads.update).toHaveBeenCalled();
  });

  it('telefone novo duplicado → ConflictError', async () => {
    const current = {
      id: '1',
      name: 'Maria',
      phone: '+5511988880001',
      tags: [],
      dncBlocked: false,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const leads = {
      findById: jest.fn().mockResolvedValue(current),
      findByPhone: jest.fn().mockResolvedValue({ id: '2' }),
    } as unknown as jest.Mocked<LeadRepository>;
    const dnc = {
      isBlocked: jest.fn(),
    } as unknown as jest.Mocked<DncRepository>;
    await expect(
      new UpdateLeadUseCase(leads, dnc).execute({
        id: '1',
        phone: '11988880009',
      }),
    ).rejects.toThrow(ConflictError);
  });
});

describe('ListLeadsUseCase extras', () => {
  it('respeita page/perPage positivos', async () => {
    const leads = {
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    } as unknown as jest.Mocked<LeadRepository>;
    await new ListLeadsUseCase(leads).execute({
      page: 2,
      perPage: 10,
      search: 'a',
    });
    expect(leads.list).toHaveBeenCalledWith({
      search: 'a',
      segment: undefined,
      activity: undefined,
      page: 2,
      perPage: 10,
    });
  });
});

describe('ImportLeadsCsvUseCase extras', () => {
  it('CSV vazio', async () => {
    const useCase = new ImportLeadsCsvUseCase(
      {} as LeadRepository,
      {} as DncRepository,
    );
    await expect(useCase.execute('   ')).resolves.toEqual({
      created: 0,
      skipped: 0,
    });
  });

  it('sem header, linha incompleta e telefone inválido', async () => {
    const leads = {
      findByPhone: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    } as unknown as jest.Mocked<LeadRepository>;
    const dnc = {
      isBlocked: jest.fn(),
    } as unknown as jest.Mocked<DncRepository>;
    const useCase = new ImportLeadsCsvUseCase(leads, dnc);
    const result = await useCase.execute(
      'SóNome\n"Ana, Silva",abc\nBeatriz,11988880003',
    );
    expect(result.skipped).toBeGreaterThan(0);
  });

  it('CSV estendido importa empresa, cidade, segmento e atividade', async () => {
    const leads = {
      findByPhone: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<LeadRepository>;
    const dnc = {
      isBlocked: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<DncRepository>;
    const useCase = new ImportLeadsCsvUseCase(leads, dnc);
    const result = await useCase.execute(
      'name,phone,company,city,segment,activity,tags\nMaria,11988880001,Clínica Vida,São Paulo,saude,Clínica,vip',
    );
    expect(result).toEqual({ created: 1, skipped: 0 });
    expect(leads.create).toHaveBeenCalledWith(
      expect.objectContaining({
        company: 'Clínica Vida',
        city: 'São Paulo',
        segment: 'saude',
        activity: 'Clínica',
        tags: ['vip'],
      }),
    );
  });
});
