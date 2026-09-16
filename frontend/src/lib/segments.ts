export const SEGMENTS = [
  { id: 'saude', label: 'Saúde', hint: 'Clínicas, labs, convênios' },
  { id: 'educacao', label: 'Educação', hint: 'Escolas, EAD, idiomas' },
  { id: 'imobiliario', label: 'Imobiliário', hint: 'Imóveis e lançamentos' },
  { id: 'seguros', label: 'Seguros', hint: 'Corretoras e consórcio' },
  { id: 'telecom', label: 'Telecom', hint: 'Fibra, móvel, provedor' },
  { id: 'varejo', label: 'Varejo', hint: 'Loja, franquia, e-commerce' },
  { id: 'financeiro', label: 'Financeiro', hint: 'Crédito, fintech, cobrança' },
  { id: 'tecnologia', label: 'Tecnologia', hint: 'SaaS, software, MSP' },
] as const

export type SegmentId = (typeof SEGMENTS)[number]['id']

export const ACTIVITIES: Record<SegmentId, string[]> = {
  saude: ['Clínica', 'Laboratório', 'Hospital', 'Consultório', 'Farmácia'],
  educacao: ['Escola', 'Faculdade', 'Curso técnico', 'EAD', 'Idiomas'],
  imobiliario: ['Imobiliária', 'Incorporadora', 'Corretor autônomo', 'Administradora'],
  seguros: ['Corretora', 'Seguradora', 'Consórcio'],
  telecom: ['Provedor de internet', 'Operadora', 'Call center'],
  varejo: ['Loja física', 'E-commerce', 'Atacado', 'Franquia'],
  financeiro: ['Crédito', 'Correspondente bancário', 'Fintech', 'Cobrança'],
  tecnologia: ['SaaS', 'Software house', 'MSP', 'Startup'],
}

export function segmentLabel(id?: string | null): string {
  return SEGMENTS.find((item) => item.id === id)?.label ?? id ?? '—'
}

export function activitiesOf(segment?: string): string[] {
  if (segment && segment in ACTIVITIES) {
    return ACTIVITIES[segment as SegmentId]
  }
  return Object.values(ACTIVITIES).flat()
}
