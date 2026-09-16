import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import type { Call, Campaign, CampaignLead, Lead, PublicUser } from './types'

const STORAGE_KEY = 'discador-demo-state'

interface DemoUser extends PublicUser {
  password: string
}

interface DemoState {
  users: DemoUser[]
  leads: Lead[]
  campaigns: Campaign[]
  queue: CampaignLead[]
  calls: Call[]
  currentUserId: string | null
}

const nowIso = () => new Date().toISOString()

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function seed(): DemoState {
  const leads: Lead[] = [
    { id: 'lead-1', name: 'Maria Silva', phone: '+5511988880001', tags: ['vip'], dncBlocked: false, notes: null },
    { id: 'lead-2', name: 'João Souza', phone: '+5511988880002', tags: ['novo'], dncBlocked: false, notes: null },
    { id: 'lead-3', name: 'Ana Costa', phone: '+5511988880003', tags: [], dncBlocked: false, notes: null },
    { id: 'lead-4', name: 'Pedro Lima', phone: '+5511988880004', tags: ['retorno'], dncBlocked: false, notes: null },
    { id: 'lead-dnc', name: 'Bloqueado DNC', phone: '+5511900000000', tags: ['dnc'], dncBlocked: true, notes: 'Lista Não Me Perturbe' },
  ]
  const campaign: Campaign = {
    id: 'camp-piloto',
    name: 'Campanha piloto',
    script:
      'Olá, aqui é da equipe comercial. Esta ligação pode ser gravada. Temos uma condição especial hoje — posso falar um minuto?',
    dialMode: 'POWER',
    gravarAudio: true,
    windowStart: '00:00',
    windowEnd: '23:59',
    timeZone: 'America/Sao_Paulo',
    active: true,
  }
  const queue: CampaignLead[] = leads
    .filter((lead) => !lead.dncBlocked)
    .map((lead, position) => ({
      id: `cl-${lead.id}`,
      campaignId: campaign.id,
      leadId: lead.id,
      position,
      status: 'PENDING',
      agentId: null,
      lead,
    }))
  return {
    users: [
      { id: 'u-admin', name: 'Admin Discador', email: 'admin@discador.dev', role: 'ADMIN', ramalId: '1000', password: 'password123' },
      { id: 'u-sup', name: 'Supervisor', email: 'supervisor@discador.dev', role: 'SUPERVISOR', ramalId: '1001', password: 'password123' },
      { id: 'u-agent', name: 'Agente Demo', email: 'agent@discador.dev', role: 'AGENT', ramalId: '1002', password: 'password123' },
    ],
    leads,
    campaigns: [campaign],
    queue,
    calls: [],
    currentUserId: null,
  }
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState
      parsed.queue = parsed.queue.map((item) => ({
        ...item,
        lead: item.lead ?? parsed.leads.find((lead) => lead.id === item.leadId),
      }))
      return parsed
    }
  } catch {
    /* ignore */
  }
  return seed()
}

function save(state: DemoState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function ok<T>(data: T, extra?: { page?: number; perPage?: number; total?: number }) {
  const lastPage =
    extra?.perPage && extra.total != null
      ? Math.max(1, Math.ceil(extra.total / extra.perPage))
      : undefined
  return {
    data: {
      success: true,
      data,
      meta: {
        timestamp: nowIso(),
        requestId: 'demo',
        ...extra,
        lastPage,
      },
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  }
}

function fail(message: string, status = 400): never {
  const error = new Error(message) as Error & { status: number; response: { status: number; data: unknown } }
  error.status = status
  error.response = {
    status,
    data: {
      success: false,
      error: { code: status === 401 ? 'UNAUTHORIZED' : 'BUSINESS_RULE_VIOLATION', message },
      meta: { timestamp: nowIso(), requestId: 'demo' },
    },
  }
  throw error
}

function publicUser(user: DemoUser): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role, ramalId: user.ramalId }
}

function parseBody(config: InternalAxiosRequestConfig): Record<string, unknown> {
  if (!config.data) return {}
  return typeof config.data === 'string'
    ? (JSON.parse(config.data) as Record<string, unknown>)
    : (config.data as Record<string, unknown>)
}

function pathOf(config: InternalAxiosRequestConfig): string {
  const raw = `${config.baseURL || ''}${config.url || ''}`
  const path = raw.replace(/^https?:\/\/[^/]+/, '').split('?')[0]
  return path.replace(/\/$/, '').replace(/^\/api\/v1/, '') || '/'
}

function handle(config: InternalAxiosRequestConfig): ReturnType<typeof ok> {
  const state = load()
  const method = (config.method || 'get').toUpperCase()
  const path = pathOf(config)
  const body = parseBody(config)

  if (path === '/auth/login' && method === 'POST') {
    const user = state.users.find(
      (item) => item.email === body.email && item.password === body.password,
    )
    if (!user) fail('Credenciais inválidas', 401)
    state.currentUserId = user.id
    save(state)
    return ok({
      user: publicUser(user),
      tokens: { accessToken: `demo-${user.id}`, refreshToken: 'demo-refresh' },
    })
  }

  const agent = state.users.find((item) => item.id === 'u-agent') ?? state.users[2]

  if (path === '/auth/me' && method === 'GET') {
    return ok(publicUser(agent))
  }
  if (path === '/auth/logout' && method === 'POST') return ok({ ok: true })

  if (path === '/campaigns' && method === 'GET') return ok(state.campaigns)
  if (path === '/campaigns' && method === 'POST') {
    const campaign: Campaign = {
      id: uid('camp'),
      name: String(body.name || 'Nova campanha'),
      script: String(body.script || ''),
      dialMode: body.dialMode === 'MANUAL' ? 'MANUAL' : 'POWER',
      gravarAudio: body.gravarAudio !== false,
      windowStart: String(body.windowStart || '00:00'),
      windowEnd: String(body.windowEnd || '23:59'),
      timeZone: 'America/Sao_Paulo',
      active: true,
    }
    state.campaigns.unshift(campaign)
    save(state)
    return ok(campaign)
  }

  const queueMatch = path.match(/^\/campaigns\/([^/]+)\/queue$/)
  if (queueMatch && method === 'GET') {
    return ok(state.queue.filter((item) => item.campaignId === queueMatch[1]))
  }
  if (queueMatch && method === 'POST') {
    const ids = (body.leadIds as string[]) ?? []
    let position = state.queue.length
    for (const leadId of ids) {
      if (state.queue.some((item) => item.leadId === leadId && item.campaignId === queueMatch[1])) {
        continue
      }
      const lead = state.leads.find((item) => item.id === leadId)
      if (!lead) continue
      state.queue.push({
        id: uid('cl'),
        campaignId: queueMatch[1],
        leadId,
        position,
        status: lead.dncBlocked ? 'DNC' : 'PENDING',
        agentId: null,
        lead,
      })
      position += 1
    }
    save(state)
    return ok({ added: ids.length })
  }

  if (path === '/leads' && method === 'GET') {
    return ok(state.leads, { page: 1, perPage: 50, total: state.leads.length })
  }
  if (path === '/leads' && method === 'POST') {
    const lead: Lead = {
      id: uid('lead'),
      name: String(body.name),
      phone: String(body.phone),
      tags: Array.isArray(body.tags) ? (body.tags as string[]) : [],
      dncBlocked: false,
      notes: body.notes ? String(body.notes) : null,
    }
    state.leads.unshift(lead)
    save(state)
    return ok(lead)
  }
  if (path === '/leads/import' && method === 'POST') {
    const csv = String(body.csv || '')
    const rows = csv.split(/\r?\n/).slice(1).filter(Boolean)
    let created = 0
    for (const row of rows) {
      const [name, phone, tags] = row.split(',')
      if (!name || !phone) continue
      state.leads.unshift({
        id: uid('lead'),
        name: name.trim(),
        phone: phone.trim(),
        tags: tags ? tags.split(';').map((tag) => tag.trim()).filter(Boolean) : [],
        dncBlocked: false,
        notes: null,
      })
      created += 1
    }
    save(state)
    return ok({ created, skipped: 0 })
  }

  if (path === '/webphone' && method === 'GET') {
    return ok({ url: null, mock: true })
  }

  if (path === '/agent/ready' && method === 'POST') {
    return ok({ campaignId: body.campaignId, status: 'idle' })
  }

  if (path === '/agent/dial' && method === 'POST') {
    const campaignId = String(body.campaignId || state.campaigns[0]?.id || '')
    const specificId = body.campaignLeadId ? String(body.campaignLeadId) : undefined
    const next = specificId
      ? state.queue.find((item) => item.id === specificId)
      : state.queue.find((item) => item.campaignId === campaignId && item.status === 'PENDING')
    if (!next?.lead) fail('Fila da campanha vazia', 422)
    if (next.lead.dncBlocked) fail('Número na lista Não Me Perturbe', 422)
    next.status = 'DIALING'
    next.agentId = agent.id
    const call: Call = {
      id: uid('call'),
      zenviaChamadaId: String(Math.floor(10_000_000 + Math.random() * 80_000_000)),
      campaignId,
      campaignLeadId: next.id,
      leadId: next.leadId,
      agentId: agent.id,
      status: 'RINGING',
      recordingUrl: null,
      durationSeconds: null,
      spokenSeconds: null,
      disposition: null,
      disconnectReason: null,
    }
    state.calls.unshift(call)
    save(state)
    return ok({ call, campaignLead: next, mock: true })
  }

  const hangup = path.match(/^\/calls\/([^/]+)\/hangup$/)
  if (hangup && method === 'POST') {
    const call = state.calls.find((item) => item.id === hangup[1])
    if (call) call.status = 'FINALIZED'
    save(state)
    return ok(call)
  }

  const wrap = path.match(/^\/calls\/([^/]+)\/wrap-up$/)
  if (wrap && method === 'POST') {
    const call = state.calls.find((item) => item.id === wrap[1])
    if (!call) fail('Chamada não encontrada', 404)
    call.disposition = String(body.disposition)
    call.status = 'FINALIZED'
    call.durationSeconds = call.durationSeconds ?? 12
    const queueItem = state.queue.find((item) => item.id === call.campaignLeadId)
    if (queueItem) {
      queueItem.status =
        call.disposition === 'CALLBACK'
          ? 'CALLBACK'
          : call.disposition === 'DNC'
            ? 'DNC'
            : call.disposition === 'ANSWERED'
              ? 'DONE'
              : 'NO_ANSWER'
    }
    const campaign = state.campaigns.find((item) => item.id === call.campaignId)
    let next: { call: Call; campaignLead: CampaignLead } | undefined
    if (campaign?.dialMode === 'POWER' && body.autoDialNext !== false) {
      const pending = state.queue.find(
        (item) => item.campaignId === call.campaignId && item.status === 'PENDING' && !item.lead?.dncBlocked,
      )
      if (pending?.lead) {
        pending.status = 'DIALING'
        const nextCall: Call = {
          id: uid('call'),
          zenviaChamadaId: String(Math.floor(10_000_000 + Math.random() * 80_000_000)),
          campaignId: call.campaignId,
          campaignLeadId: pending.id,
          leadId: pending.leadId,
          agentId: agent.id,
          status: 'RINGING',
          recordingUrl: null,
          durationSeconds: null,
          spokenSeconds: null,
          disposition: null,
          disconnectReason: null,
        }
        state.calls.unshift(nextCall)
        next = { call: nextCall, campaignLead: pending }
      }
    }
    save(state)
    return ok({ call, next })
  }

  if (path === '/calls' && method === 'GET') {
    return ok(state.calls, { page: 1, perPage: 20, total: state.calls.length })
  }

  fail(`Rota demo não implementada: ${method} ${path}`, 404)
}

export const demoAdapter: AxiosAdapter = async (config) => {
  await new Promise((resolve) => setTimeout(resolve, 80))
  return handle(config)
}
