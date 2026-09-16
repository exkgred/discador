import type { Campaign, Lead } from './types'
import type { SegmentId } from './segments'

type SeedLead = Omit<Lead, 'id'> & { id: string }

function lead(
  id: string,
  name: string,
  company: string,
  phone: string,
  city: string,
  segment: SegmentId,
  activity: string,
  tags: string[] = [],
  dncBlocked = false,
): SeedLead {
  return {
    id,
    name,
    company,
    phone,
    city,
    segment,
    activity,
    tags,
    dncBlocked,
    notes: dncBlocked ? 'Lista Não Me Perturbe' : null,
  }
}

/** 50 contatos de outbound, agrupados como lista/vertical de discador. */
export const DEMO_LEADS: SeedLead[] = [
  lead('lead-01', 'Maria Silva', 'Clínica Vida Plena', '+551198880001', 'São Paulo', 'saude', 'Clínica', ['vip']),
  lead('lead-02', 'Carlos Mendes', 'Lab São Lucas', '+551998880002', 'Campinas', 'saude', 'Laboratório'),
  lead('lead-03', 'Fernanda Rocha', 'Hospital Santa Clara', '+553198880003', 'Belo Horizonte', 'saude', 'Hospital', ['grande-conta']),
  lead('lead-04', 'Ricardo Alves', 'Consultório Dr. Alves', '+554198880004', 'Curitiba', 'saude', 'Consultório'),
  lead('lead-05', 'Juliana Castro', 'Farmácia Popular Plus', '+558198880005', 'Recife', 'saude', 'Farmácia'),
  lead('lead-06', 'Paulo Henrique', 'Clínica Orto Center', '+555198880006', 'Porto Alegre', 'saude', 'Clínica'),
  lead('lead-07', 'Beatriz Nunes', 'Lab Diagnóstico Norte', '+556198880007', 'Brasília', 'saude', 'Laboratório'),

  lead('lead-08', 'André Lima', 'Colégio Horizonte', '+551198880008', 'São Paulo', 'educacao', 'Escola', ['novo']),
  lead('lead-09', 'Camila Duarte', 'Faculdade Integra', '+552198880009', 'Rio de Janeiro', 'educacao', 'Faculdade'),
  lead('lead-10', 'Roberto Dias', 'TechPro Cursos', '+553198880010', 'Belo Horizonte', 'educacao', 'Curso técnico'),
  lead('lead-11', 'Sofia Martins', 'EducaOnline EAD', '+557198880011', 'Salvador', 'educacao', 'EAD', ['digital']),
  lead('lead-12', 'Lucas Ferreira', 'Wizard Idiomas Centro', '+558598880012', 'Fortaleza', 'educacao', 'Idiomas'),
  lead('lead-13', 'Patrícia Gomes', 'Escola Recriar', '+556298880013', 'Goiânia', 'educacao', 'Escola'),

  lead('lead-14', 'Gustavo Oliveira', 'Lopes Premium', '+551198880014', 'São Paulo', 'imobiliario', 'Imobiliária', ['vip']),
  lead('lead-15', 'Helena Barbosa', 'MRV Parcerias', '+551998880015', 'Campinas', 'imobiliario', 'Incorporadora'),
  lead('lead-16', 'Diego Santos', 'Corretor Diego Santos', '+552198880016', 'Rio de Janeiro', 'imobiliario', 'Corretor autônomo'),
  lead('lead-17', 'Aline Teixeira', 'Administradora Vista', '+554198880017', 'Curitiba', 'imobiliario', 'Administradora'),
  lead('lead-18', 'Marcelo Pinto', 'QuintoAndar Parceiros', '+553198880018', 'Belo Horizonte', 'imobiliario', 'Imobiliária'),
  lead('lead-19', 'Renata Vieira', 'Cyrela Consultores', '+554898880019', 'Florianópolis', 'imobiliario', 'Incorporadora'),

  lead('lead-20', 'Fábio Costa', 'Porto Corretora', '+551198880020', 'São Paulo', 'seguros', 'Corretora'),
  lead('lead-21', 'Vanessa Lopes', 'Bradesco Seguros Ind.', '+551398880021', 'Santos', 'seguros', 'Seguradora'),
  lead('lead-22', 'Thiago Ramos', 'Consórcio Nacional', '+551698880022', 'Ribeirão Preto', 'seguros', 'Consórcio', ['retorno']),
  lead('lead-23', 'Carolina Freitas', 'Tokio Marine Parceira', '+555198880023', 'Porto Alegre', 'seguros', 'Corretora'),
  lead('lead-24', 'Eduardo Melo', 'Liberty Consórcios', '+556198880024', 'Brasília', 'seguros', 'Consórcio'),
  lead('lead-25', 'Larissa Souza', 'Corretora Atlas', '+557198880025', 'Salvador', 'seguros', 'Corretora'),

  lead('lead-26', 'Bruno Carvalho', 'NetSpeed Fibra', '+551998880026', 'Campinas', 'telecom', 'Provedor de internet'),
  lead('lead-27', 'Amanda Reis', 'Claro Empresas', '+551198880027', 'São Paulo', 'telecom', 'Operadora', ['grande-conta']),
  lead('lead-28', 'Felipe Araújo', 'Vivo B2B', '+552198880028', 'Rio de Janeiro', 'telecom', 'Operadora'),
  lead('lead-29', 'Isabela Monteiro', 'Call Center Delta', '+558198880029', 'Recife', 'telecom', 'Call center'),
  lead('lead-30', 'Rodrigo Nascimento', 'Oi Fibra Interior', '+553198880030', 'Belo Horizonte', 'telecom', 'Provedor de internet'),
  lead('lead-31', 'Tatiane Moreira', 'Desktop Internet', '+551398880031', 'Santos', 'telecom', 'Provedor de internet'),

  lead('lead-32', 'Henrique Batista', 'Americanas Franquia', '+551198880032', 'São Paulo', 'varejo', 'Franquia'),
  lead('lead-33', 'Priscila Andrade', 'Magazine Center', '+552198880033', 'Rio de Janeiro', 'varejo', 'Loja física'),
  lead('lead-34', 'Vinícius Rocha', 'ShopNow', '+554198880034', 'Curitiba', 'varejo', 'E-commerce', ['digital']),
  lead('lead-35', 'Eliane Castro', 'Atacadão Parceiros', '+556298880035', 'Goiânia', 'varejo', 'Atacado'),
  lead('lead-36', 'Daniel Souza', 'C&A Franquias Sul', '+555198880036', 'Porto Alegre', 'varejo', 'Franquia'),
  lead('lead-37', 'Mônica Alves', 'Mercado Livre Sellers', '+551198880037', 'São Paulo', 'varejo', 'E-commerce'),

  lead('lead-38', 'Alexandre Pinto', 'Banco Pan Correspondente', '+551198880038', 'São Paulo', 'financeiro', 'Correspondente bancário'),
  lead('lead-39', 'Cristiane Dias', 'Crefisa Crédito', '+558198880039', 'Recife', 'financeiro', 'Crédito'),
  lead('lead-40', 'Otávio Lima', 'C6 Bank Indicação', '+553198880040', 'Belo Horizonte', 'financeiro', 'Fintech', ['digital']),
  lead('lead-41', 'Simone Rocha', 'Recovery Cobrança', '+552198880041', 'Rio de Janeiro', 'financeiro', 'Cobrança'),
  lead('lead-42', 'Igor Fernandes', 'BV Financeira', '+554198880042', 'Curitiba', 'financeiro', 'Crédito'),
  lead('lead-43', 'Natália Campos', 'PicPay Empresas', '+556198880043', 'Brasília', 'financeiro', 'Fintech'),

  lead('lead-44', 'Rafael Martins', 'TOTVS Parceiro', '+551198880044', 'São Paulo', 'tecnologia', 'SaaS', ['vip']),
  lead('lead-45', 'Bianca Oliveira', 'Softplan', '+554898880045', 'Florianópolis', 'tecnologia', 'Software house'),
  lead('lead-46', 'Caio Henrique', 'Locaweb MSP', '+551998880046', 'Campinas', 'tecnologia', 'MSP'),
  lead('lead-47', 'Débora Santos', 'Startup Nexa', '+552198880047', 'Rio de Janeiro', 'tecnologia', 'Startup', ['novo']),
  lead('lead-48', 'Wellington Cruz', 'Microsoft PSH', '+553198880048', 'Belo Horizonte', 'tecnologia', 'SaaS'),
  lead('lead-49', 'Luana Ribeiro', 'CI&T', '+551998880049', 'Campinas', 'tecnologia', 'Software house'),

  lead('lead-50', 'Bloqueado DNC', 'Clínica Encerrada', '+5511900000000', 'São Paulo', 'saude', 'Clínica', ['dnc'], true),
]

export const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-saude',
    name: 'Convênio saúde',
    segment: 'saude',
    script:
      'Olá, falo da equipe de convênios. Esta ligação pode ser gravada. Temos uma condição especial para clínicas da sua região — posso falar um minuto?',
    dialMode: 'POWER',
    gravarAudio: true,
    windowStart: '00:00',
    windowEnd: '23:59',
    timeZone: 'America/Sao_Paulo',
    active: true,
  },
  {
    id: 'camp-ead',
    name: 'Captação EAD',
    segment: 'educacao',
    script:
      'Olá, falo da equipe educacional. Esta ligação pode ser gravada. Abrimos turmas de pós e EAD nesta semana — posso apresentar em um minuto?',
    dialMode: 'POWER',
    gravarAudio: true,
    windowStart: '00:00',
    windowEnd: '23:59',
    timeZone: 'America/Sao_Paulo',
    active: true,
  },
  {
    id: 'camp-imob',
    name: 'Lançamentos imobiliários',
    segment: 'imobiliario',
    script:
      'Olá, falo da equipe de lançamentos. Esta ligação pode ser gravada. Temos unidades com condição de plantão hoje — posso confirmar o melhor horário?',
    dialMode: 'MANUAL',
    gravarAudio: true,
    windowStart: '00:00',
    windowEnd: '23:59',
    timeZone: 'America/Sao_Paulo',
    active: true,
  },
  {
    id: 'camp-seguros',
    name: 'Consórcio e seguros',
    segment: 'seguros',
    script:
      'Olá, falo da equipe de consórcio. Esta ligação pode ser gravada. Há cotas contempladas e simulações sem compromisso — posso seguir?',
    dialMode: 'POWER',
    gravarAudio: true,
    windowStart: '00:00',
    windowEnd: '23:59',
    timeZone: 'America/Sao_Paulo',
    active: true,
  },
]

/** Filas iniciais: só as campanhas ativas de Saúde e EAD, como lista pré-carregada. */
export const DEMO_PRELOAD_CAMPAIGN_IDS = ['camp-saude', 'camp-ead'] as const
