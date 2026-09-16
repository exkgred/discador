import type {
  AgentMetrics,
  Call,
  Campaign,
  CampaignLead,
  CampaignMetrics,
  LiveAgentStatus,
  LiveSession,
  PublicUser,
  SupervisorOverview,
} from './types'

function rate(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

function avg(total: number, count: number): number {
  if (count <= 0) return 0
  return Math.round(total / count)
}

export function formatClock(total: number): string {
  const safe = Math.max(0, Math.floor(total))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function liveLabel(status: LiveAgentStatus): string {
  if (status === 'ringing') return 'Tocando'
  if (status === 'in_call') return 'Em ligação'
  if (status === 'wrap_up') return 'Pós-atendimento'
  if (status === 'idle') return 'Disponível'
  return 'Offline'
}

export function liveTone(status: LiveAgentStatus): string {
  if (status === 'ringing') return 'bg-amber-500/15 text-amber-300'
  if (status === 'in_call') return 'bg-emerald-500/15 text-emerald-300'
  if (status === 'wrap_up') return 'bg-violet-500/15 text-violet-300'
  if (status === 'idle') return 'bg-accent/15 text-accent'
  return 'bg-white/5 text-ink-500'
}

export function dispositionLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    ANSWERED: 'Atendeu',
    NO_ANSWER: 'Não atendeu',
    VOICEMAIL: 'Caixa postal',
    BUSY: 'Ocupado',
    CALLBACK: 'Retorno',
    DNC: 'Não ligar',
    OTHER: 'Outro',
  }
  return value ? (labels[value] ?? value) : '—'
}

export function buildSupervisorOverview(input: {
  users: PublicUser[]
  calls: Call[]
  campaigns: Campaign[]
  queue: CampaignLead[]
  sessions: Record<string, LiveSession>
  now?: Date
}): SupervisorOverview {
  const now = input.now ?? new Date()
  const agents = input.users.filter((user) => user.role === 'AGENT')
  const metrics: AgentMetrics[] = agents.map((agent) => {
    const mine = input.calls.filter((call) => call.agentId === agent.id)
    const answered = mine.filter((call) => call.disposition === 'ANSWERED').length
    const noAnswer = mine.filter((call) => call.disposition === 'NO_ANSWER' || call.disposition === 'BUSY').length
    const talkSeconds = mine.reduce((sum, call) => sum + (call.durationSeconds ?? 0), 0)
    const session = input.sessions[agent.id]
    const status = session?.status ?? 'offline'
    const campaign = input.campaigns.find((item) => item.id === session?.campaignId)
    const last = mine[0]
    return {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      ramalId: agent.ramalId,
      status,
      campaignName: campaign?.name ?? null,
      leadName: session?.leadName ?? last?.leadName ?? null,
      statusSince: session?.startedAt ?? null,
      calls: mine.length,
      answered,
      noAnswer,
      talkSeconds,
      ahtSeconds: avg(talkSeconds, answered || mine.filter((call) => call.status === 'FINALIZED').length),
      contactRate: rate(answered, mine.length),
      lastDisposition: last?.disposition ?? null,
    }
  })

  const order: LiveAgentStatus[] = ['in_call', 'ringing', 'wrap_up', 'idle', 'offline']
  metrics.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.calls - a.calls)

  const allAnswered = input.calls.filter((call) => call.disposition === 'ANSWERED').length
  const talkSeconds = input.calls.reduce((sum, call) => sum + (call.durationSeconds ?? 0), 0)
  const campaigns: CampaignMetrics[] = input.campaigns.map((campaign) => {
    const items = input.queue.filter((item) => item.campaignId === campaign.id)
    return {
      id: campaign.id,
      name: campaign.name,
      pending: items.filter((item) => item.status === 'PENDING').length,
      done: items.filter((item) => item.status === 'DONE' || item.status === 'NO_ANSWER' || item.status === 'CALLBACK' || item.status === 'DNC').length,
      live: items.filter((item) => item.status === 'DIALING' || item.status === 'IN_CALL').length,
    }
  })

  return {
    generatedAt: now.toISOString(),
    kpis: {
      agentsOnline: metrics.filter((item) => item.status !== 'offline').length,
      agentsInCall: metrics.filter((item) => item.status === 'in_call' || item.status === 'ringing').length,
      calls: input.calls.length,
      answered: allAnswered,
      contactRate: rate(allAnswered, input.calls.length),
      talkSeconds,
      ahtSeconds: avg(talkSeconds, allAnswered),
      pendingQueue: input.queue.filter((item) => item.status === 'PENDING').length,
    },
    agents: metrics,
    campaigns,
    recentCalls: input.calls.slice(0, 12),
  }
}
