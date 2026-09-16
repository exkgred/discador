import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const LEADS: Array<{
  id: string;
  name: string;
  company: string;
  phone: string;
  city: string;
  segment: string;
  activity: string;
  tags: string[];
  dncBlocked?: boolean;
}> = [
  { id: 'lead-01', name: 'Maria Silva', company: 'Clínica Vida Plena', phone: '+551198880001', city: 'São Paulo', segment: 'saude', activity: 'Clínica', tags: ['vip'] },
  { id: 'lead-02', name: 'Carlos Mendes', company: 'Lab São Lucas', phone: '+551998880002', city: 'Campinas', segment: 'saude', activity: 'Laboratório', tags: [] },
  { id: 'lead-03', name: 'Fernanda Rocha', company: 'Hospital Santa Clara', phone: '+553198880003', city: 'Belo Horizonte', segment: 'saude', activity: 'Hospital', tags: ['grande-conta'] },
  { id: 'lead-04', name: 'Ricardo Alves', company: 'Consultório Dr. Alves', phone: '+554198880004', city: 'Curitiba', segment: 'saude', activity: 'Consultório', tags: [] },
  { id: 'lead-05', name: 'Juliana Castro', company: 'Farmácia Popular Plus', phone: '+558198880005', city: 'Recife', segment: 'saude', activity: 'Farmácia', tags: [] },
  { id: 'lead-06', name: 'Paulo Henrique', company: 'Clínica Orto Center', phone: '+555198880006', city: 'Porto Alegre', segment: 'saude', activity: 'Clínica', tags: [] },
  { id: 'lead-07', name: 'Beatriz Nunes', company: 'Lab Diagnóstico Norte', phone: '+556198880007', city: 'Brasília', segment: 'saude', activity: 'Laboratório', tags: [] },
  { id: 'lead-08', name: 'André Lima', company: 'Colégio Horizonte', phone: '+551198880008', city: 'São Paulo', segment: 'educacao', activity: 'Escola', tags: ['novo'] },
  { id: 'lead-09', name: 'Camila Duarte', company: 'Faculdade Integra', phone: '+552198880009', city: 'Rio de Janeiro', segment: 'educacao', activity: 'Faculdade', tags: [] },
  { id: 'lead-10', name: 'Roberto Dias', company: 'TechPro Cursos', phone: '+553198880010', city: 'Belo Horizonte', segment: 'educacao', activity: 'Curso técnico', tags: [] },
  { id: 'lead-11', name: 'Sofia Martins', company: 'EducaOnline EAD', phone: '+557198880011', city: 'Salvador', segment: 'educacao', activity: 'EAD', tags: ['digital'] },
  { id: 'lead-12', name: 'Lucas Ferreira', company: 'Wizard Idiomas Centro', phone: '+558598880012', city: 'Fortaleza', segment: 'educacao', activity: 'Idiomas', tags: [] },
  { id: 'lead-13', name: 'Patrícia Gomes', company: 'Escola Recriar', phone: '+556298880013', city: 'Goiânia', segment: 'educacao', activity: 'Escola', tags: [] },
  { id: 'lead-14', name: 'Gustavo Oliveira', company: 'Lopes Premium', phone: '+551198880014', city: 'São Paulo', segment: 'imobiliario', activity: 'Imobiliária', tags: ['vip'] },
  { id: 'lead-15', name: 'Helena Barbosa', company: 'MRV Parcerias', phone: '+551998880015', city: 'Campinas', segment: 'imobiliario', activity: 'Incorporadora', tags: [] },
  { id: 'lead-16', name: 'Diego Santos', company: 'Corretor Diego Santos', phone: '+552198880016', city: 'Rio de Janeiro', segment: 'imobiliario', activity: 'Corretor autônomo', tags: [] },
  { id: 'lead-17', name: 'Aline Teixeira', company: 'Administradora Vista', phone: '+554198880017', city: 'Curitiba', segment: 'imobiliario', activity: 'Administradora', tags: [] },
  { id: 'lead-18', name: 'Marcelo Pinto', company: 'QuintoAndar Parceiros', phone: '+553198880018', city: 'Belo Horizonte', segment: 'imobiliario', activity: 'Imobiliária', tags: [] },
  { id: 'lead-19', name: 'Renata Vieira', company: 'Cyrela Consultores', phone: '+554898880019', city: 'Florianópolis', segment: 'imobiliario', activity: 'Incorporadora', tags: [] },
  { id: 'lead-20', name: 'Fábio Costa', company: 'Porto Corretora', phone: '+551198880020', city: 'São Paulo', segment: 'seguros', activity: 'Corretora', tags: [] },
  { id: 'lead-21', name: 'Vanessa Lopes', company: 'Bradesco Seguros Ind.', phone: '+551398880021', city: 'Santos', segment: 'seguros', activity: 'Seguradora', tags: [] },
  { id: 'lead-22', name: 'Thiago Ramos', company: 'Consórcio Nacional', phone: '+551698880022', city: 'Ribeirão Preto', segment: 'seguros', activity: 'Consórcio', tags: ['retorno'] },
  { id: 'lead-23', name: 'Carolina Freitas', company: 'Tokio Marine Parceira', phone: '+555198880023', city: 'Porto Alegre', segment: 'seguros', activity: 'Corretora', tags: [] },
  { id: 'lead-24', name: 'Eduardo Melo', company: 'Liberty Consórcios', phone: '+556198880024', city: 'Brasília', segment: 'seguros', activity: 'Consórcio', tags: [] },
  { id: 'lead-25', name: 'Larissa Souza', company: 'Corretora Atlas', phone: '+557198880025', city: 'Salvador', segment: 'seguros', activity: 'Corretora', tags: [] },
  { id: 'lead-26', name: 'Bruno Carvalho', company: 'NetSpeed Fibra', phone: '+551998880026', city: 'Campinas', segment: 'telecom', activity: 'Provedor de internet', tags: [] },
  { id: 'lead-27', name: 'Amanda Reis', company: 'Claro Empresas', phone: '+551198880027', city: 'São Paulo', segment: 'telecom', activity: 'Operadora', tags: ['grande-conta'] },
  { id: 'lead-28', name: 'Felipe Araújo', company: 'Vivo B2B', phone: '+552198880028', city: 'Rio de Janeiro', segment: 'telecom', activity: 'Operadora', tags: [] },
  { id: 'lead-29', name: 'Isabela Monteiro', company: 'Call Center Delta', phone: '+558198880029', city: 'Recife', segment: 'telecom', activity: 'Call center', tags: [] },
  { id: 'lead-30', name: 'Rodrigo Nascimento', company: 'Oi Fibra Interior', phone: '+553198880030', city: 'Belo Horizonte', segment: 'telecom', activity: 'Provedor de internet', tags: [] },
  { id: 'lead-31', name: 'Tatiane Moreira', company: 'Desktop Internet', phone: '+551398880031', city: 'Santos', segment: 'telecom', activity: 'Provedor de internet', tags: [] },
  { id: 'lead-32', name: 'Henrique Batista', company: 'Americanas Franquia', phone: '+551198880032', city: 'São Paulo', segment: 'varejo', activity: 'Franquia', tags: [] },
  { id: 'lead-33', name: 'Priscila Andrade', company: 'Magazine Center', phone: '+552198880033', city: 'Rio de Janeiro', segment: 'varejo', activity: 'Loja física', tags: [] },
  { id: 'lead-34', name: 'Vinícius Rocha', company: 'ShopNow', phone: '+554198880034', city: 'Curitiba', segment: 'varejo', activity: 'E-commerce', tags: ['digital'] },
  { id: 'lead-35', name: 'Eliane Castro', company: 'Atacadão Parceiros', phone: '+556298880035', city: 'Goiânia', segment: 'varejo', activity: 'Atacado', tags: [] },
  { id: 'lead-36', name: 'Daniel Souza', company: 'C&A Franquias Sul', phone: '+555198880036', city: 'Porto Alegre', segment: 'varejo', activity: 'Franquia', tags: [] },
  { id: 'lead-37', name: 'Mônica Alves', company: 'Mercado Livre Sellers', phone: '+551198880037', city: 'São Paulo', segment: 'varejo', activity: 'E-commerce', tags: [] },
  { id: 'lead-38', name: 'Alexandre Pinto', company: 'Banco Pan Correspondente', phone: '+551198880038', city: 'São Paulo', segment: 'financeiro', activity: 'Correspondente bancário', tags: [] },
  { id: 'lead-39', name: 'Cristiane Dias', company: 'Crefisa Crédito', phone: '+558198880039', city: 'Recife', segment: 'financeiro', activity: 'Crédito', tags: [] },
  { id: 'lead-40', name: 'Otávio Lima', company: 'C6 Bank Indicação', phone: '+553198880040', city: 'Belo Horizonte', segment: 'financeiro', activity: 'Fintech', tags: ['digital'] },
  { id: 'lead-41', name: 'Simone Rocha', company: 'Recovery Cobrança', phone: '+552198880041', city: 'Rio de Janeiro', segment: 'financeiro', activity: 'Cobrança', tags: [] },
  { id: 'lead-42', name: 'Igor Fernandes', company: 'BV Financeira', phone: '+554198880042', city: 'Curitiba', segment: 'financeiro', activity: 'Crédito', tags: [] },
  { id: 'lead-43', name: 'Natália Campos', company: 'PicPay Empresas', phone: '+556198880043', city: 'Brasília', segment: 'financeiro', activity: 'Fintech', tags: [] },
  { id: 'lead-44', name: 'Rafael Martins', company: 'TOTVS Parceiro', phone: '+551198880044', city: 'São Paulo', segment: 'tecnologia', activity: 'SaaS', tags: ['vip'] },
  { id: 'lead-45', name: 'Bianca Oliveira', company: 'Softplan', phone: '+554898880045', city: 'Florianópolis', segment: 'tecnologia', activity: 'Software house', tags: [] },
  { id: 'lead-46', name: 'Caio Henrique', company: 'Locaweb MSP', phone: '+551998880046', city: 'Campinas', segment: 'tecnologia', activity: 'MSP', tags: [] },
  { id: 'lead-47', name: 'Débora Santos', company: 'Startup Nexa', phone: '+552198880047', city: 'Rio de Janeiro', segment: 'tecnologia', activity: 'Startup', tags: ['novo'] },
  { id: 'lead-48', name: 'Wellington Cruz', company: 'Microsoft PSH', phone: '+553198880048', city: 'Belo Horizonte', segment: 'tecnologia', activity: 'SaaS', tags: [] },
  { id: 'lead-49', name: 'Luana Ribeiro', company: 'CI&T', phone: '+551998880049', city: 'Campinas', segment: 'tecnologia', activity: 'Software house', tags: [] },
  { id: 'lead-50', name: 'Bloqueado DNC', company: 'Clínica Encerrada', phone: '+5511900000000', city: 'São Paulo', segment: 'saude', activity: 'Clínica', tags: ['dnc'], dncBlocked: true },
];

const CAMPAIGNS = [
  {
    id: 'camp-saude',
    name: 'Convênio saúde',
    segment: 'saude',
    dialMode: 'POWER' as const,
    script:
      'Olá, falo da equipe de convênios. Esta ligação pode ser gravada. Temos uma condição especial para clínicas da sua região — posso falar um minuto?',
  },
  {
    id: 'camp-ead',
    name: 'Captação EAD',
    segment: 'educacao',
    dialMode: 'POWER' as const,
    script:
      'Olá, falo da equipe educacional. Esta ligação pode ser gravada. Abrimos turmas de pós e EAD nesta semana — posso apresentar em um minuto?',
  },
  {
    id: 'camp-imob',
    name: 'Lançamentos imobiliários',
    segment: 'imobiliario',
    dialMode: 'MANUAL' as const,
    script:
      'Olá, falo da equipe de lançamentos. Esta ligação pode ser gravada. Temos unidades com condição de plantão hoje — posso confirmar o melhor horário?',
  },
  {
    id: 'camp-seguros',
    name: 'Consórcio e seguros',
    segment: 'seguros',
    dialMode: 'POWER' as const,
    script:
      'Olá, falo da equipe de consórcio. Esta ligação pode ser gravada. Há cotas contempladas e simulações sem compromisso — posso seguir?',
  },
];

async function main(): Promise<void> {
  const hash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@discador.dev' },
    update: { passwordHash: hash, role: 'ADMIN', ramalId: '1000' },
    create: {
      name: 'Admin Discador',
      email: 'admin@discador.dev',
      passwordHash: hash,
      role: 'ADMIN',
      ramalId: '1000',
    },
  });

  await prisma.user.upsert({
    where: { email: 'supervisor@discador.dev' },
    update: { passwordHash: hash, role: 'SUPERVISOR', ramalId: '1001' },
    create: {
      name: 'Supervisor',
      email: 'supervisor@discador.dev',
      passwordHash: hash,
      role: 'SUPERVISOR',
      ramalId: '1001',
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@discador.dev' },
    update: { passwordHash: hash, role: 'AGENT', ramalId: '1002' },
    create: {
      name: 'Agente Demo',
      email: 'agent@discador.dev',
      passwordHash: hash,
      role: 'AGENT',
      ramalId: '1002',
    },
  });

  await prisma.doNotCall.upsert({
    where: { phone: '+5511900000000' },
    update: {},
    create: { phone: '+5511900000000', reason: 'Lista Não Me Perturbe (seed)' },
  });

  for (const lead of LEADS) {
    await prisma.lead.upsert({
      where: { phone: lead.phone },
      update: {
        name: lead.name,
        company: lead.company,
        city: lead.city,
        segment: lead.segment,
        activity: lead.activity,
        tags: lead.tags,
        dncBlocked: lead.dncBlocked ?? false,
      },
      create: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        company: lead.company,
        city: lead.city,
        segment: lead.segment,
        activity: lead.activity,
        tags: lead.tags,
        dncBlocked: lead.dncBlocked ?? false,
      },
    });
  }

  const stored = await prisma.lead.findMany();
  const byPhone = new Map(stored.map((row) => [row.phone, row.id]));

  for (const campaign of CAMPAIGNS) {
    await prisma.campaign.upsert({
      where: { id: campaign.id },
      update: {
        name: campaign.name,
        script: campaign.script,
        dialMode: campaign.dialMode,
        segment: campaign.segment,
        active: true,
      },
      create: {
        id: campaign.id,
        name: campaign.name,
        script: campaign.script,
        dialMode: campaign.dialMode,
        segment: campaign.segment,
        gravarAudio: true,
        windowStart: '00:00',
        windowEnd: '23:59',
        timeZone: 'America/Sao_Paulo',
      },
    });
    await prisma.campaignLead.deleteMany({ where: { campaignId: campaign.id } });
  }

  for (const campaignId of ['camp-saude', 'camp-ead'] as const) {
    const campaign = CAMPAIGNS.find((item) => item.id === campaignId);
    if (!campaign) continue;
    let position = 0;
    for (const lead of LEADS.filter((item) => item.segment === campaign.segment && !item.dncBlocked)) {
      const leadId = byPhone.get(lead.phone);
      if (!leadId) continue;
      await prisma.campaignLead.create({
        data: { campaignId, leadId, position },
      });
      position += 1;
    }
  }

  console.log('Seed concluído.');
  console.log('Logins:');
  console.log('  admin@discador.dev / password123');
  console.log('  supervisor@discador.dev / password123');
  console.log(`  agent@discador.dev / password123  (id ${agent.id})`);
  console.log(`Leads: ${LEADS.length}`);
  console.log(`Admin: ${admin.id}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
