import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import type { Call, Campaign, CampaignLead, Lead, LiveSession, PublicUser } from './types'
import { DEMO_CAMPAIGNS, DEMO_LEADS, DEMO_PRELOAD_CAMPAIGN_IDS } from './demo-catalog'
import { DEMO_TEAM, seedTeamCalls, seedTeamSessions } from './demo-team'
import { buildSupervisorOverview } from './supervisor'

const STORAGE_KEY = 'discador-demo-state-v3'

interface DemoUser extends PublicUser {
  password: string
}

interface DemoState {
  users: DemoUser[]
  leads: Lead[]
  campaigns: Campaign[]
  queue: CampaignLead[]
  calls: Call[]
  sessions: Record<string, LiveSession>
  currentUserId: string | null
}

const nowIso = () => new Date().toISOString()

function hydrateLead(lead: Lead): Lead {
  return {
    ...lead,
    company: lead.company ?? '',
    city: lead.city ?? '',
    segment: lead.segment ?? '',
    activity: lead.activity ?? '',
    tags: lead.tags ?? [],
    dncBlocked: lead.dncBlocked ?? false,
    notes: lead.notes ?? null,
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function seed(): DemoState {
  const leads = DEMO_LEADS.map((item) => ({ ...item }))
  const campaigns = DEMO_CAMPAIGNS.map((item) => ({ ...item }))
  const queue: CampaignLead[] = []
  for (const campaign of campaigns) {
    if (!(DEMO_PRELOAD_CAMPAIGN_IDS as readonly string[]).includes(campaign.id)) continue
    const members = leads.filter((lead) => lead.segment === campaign.segment && !lead.dncBlocked)
    members.forEach((lead, position) => {
      queue.push({
        id: `cl-${campaign.id}-${lead.id}`,
        campaignId: campaign.id,
        leadId: lead.id,
        position,
        status: 'PENDING',
        agentId: null,
        lead,
      })
    })
  }
  return {
    users: DEMO_TEAM.map((item) => ({ ...item })),
    leads,
    campaigns,
    queue,
    calls: seedTeamCalls(),
    sessions: seedTeamSessions(),
    currentUserId: null,
  }
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState
      parsed.queue = parsed.queue.map((item) => {
        const raw = item.lead ?? parsed.leads.find((lead) => lead.id === item.leadId)
        return { ...item, lead: raw ? hydrateLead(raw) : undefined }
      })
      parsed.leads = parsed.leads.map(hydrateLead)
      parsed.campaigns = parsed.campaigns.map((campaign) => ({
        ...campaign,
        segment: campaign.segment ?? null,
      }))
      parsed.sessions = parsed.sessions ?? {}
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

function actor(state: DemoState, config: InternalAxiosRequestConfig): DemoUser {
  const header = String(config.headers?.Authorization ?? '')
  const token = header.replace(/^Bearer\s+/i, '')
  const fromToken = token.startsWith('demo-') ? token.slice(5) : ''
  const id = state.currentUserId || fromToken
  return (
    state.users.find((item) => item.id === id) ??
    state.users.find((item) => item.id === 'u-agent') ??
    state.users[2]
  )
}

function setSession(
  state: DemoState,
  user: DemoUser,
  status: LiveSession['status'],
  campaignId: string | null,
  leadName: string | null,
): void {
  if (status === 'offline') {
    delete state.sessions[user.id]
    return
  }
  state.sessions[user.id] = {
    userId: user.id,
    status,
    campaignId,
    leadName,
    startedAt: new Date().toISOString(),
  }
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

  const user = actor(state, config)

  if (path === '/auth/me' && method === 'GET') {
    return ok(publicUser(user))
  }
  if (path === '/auth/logout' && method === 'POST') return ok({ ok: true })

  if (path === '/campaigns' && method === 'GET') return ok(state.campaigns)
  if (path === '/campaigns' && method === 'POST') {
    const campaign: Campaign = {
      id: uid('camp'),
      name: String(body.name || 'Nova campanha'),
      segment: body.segment ? String(body.segment) : null,
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
    let added = 0
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
      added += 1
    }
    save(state)
    return ok({ added })
  }

  if (path === '/leads' && method === 'GET') {
    return ok(state.leads, { page: 1, perPage: state.leads.length, total: state.leads.length })
  }
  if (path === '/leads' && method === 'POST') {
    const lead: Lead = {
      id: uid('lead'),
      name: String(body.name),
      phone: String(body.phone),
      company: String(body.company || ''),
      city: String(body.city || ''),
      segment: String(body.segment || ''),
      activity: String(body.activity || ''),
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
      const [name, phone, company, city, segment, activity, tags] = row.split(',')
      if (!name || !phone) continue
      state.leads.unshift({
        id: uid('lead'),
        name: name.trim(),
        phone: phone.trim(),
        company: (company ?? '').trim(),
        city: (city ?? '').trim(),
        segment: (segment ?? '').trim(),
        activity: (activity ?? '').trim(),
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
    setSession(state, user, 'idle', String(body.campaignId || ''), null)
    save(state)
    return ok({ campaignId: body.campaignId, status: 'idle' })
  }

  if (path === '/agent/status' && method === 'POST') {
    const status = String(body.status || 'idle') as LiveSession['status']
    setSession(
      state,
      user,
      status,
      body.campaignId ? String(body.campaignId) : state.sessions[user.id]?.campaignId ?? null,
      body.leadName ? String(body.leadName) : null,
    )
    save(state)
    return ok(state.sessions[user.id] ?? { userId: user.id, status: 'offline' })
  }

  if (path === '/supervisor/overview' && method === 'GET') {
    return ok(
      buildSupervisorOverview({
        users: state.users.map(publicUser),
        calls: state.calls,
        campaigns: state.campaigns,
        queue: state.queue,
        sessions: state.sessions,
      }),
    )
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
    next.agentId = user.id
    const call: Call = {
      id: uid('call'),
      zenviaChamadaId: String(Math.floor(10_000_000 + Math.random() * 80_000_000)),
      campaignId,
      campaignLeadId: next.id,
      leadId: next.leadId,
      agentId: user.id,
      agentName: user.name,
      leadName: next.lead.name,
      status: 'RINGING',
      recordingUrl: null,
      durationSeconds: null,
      spokenSeconds: null,
      disposition: null,
      disconnectReason: null,
      startedAt: nowIso(),
    }
    state.calls.unshift(call)
    setSession(state, user, 'ringing', campaignId, next.lead.name)
    save(state)
    return ok({ call, campaignLead: next, mock: true })
  }

  const hangup = path.match(/^\/calls\/([^/]+)\/hangup$/)
  if (hangup && method === 'POST') {
    const call = state.calls.find((item) => item.id === hangup[1])
    if (call) {
      call.status = 'FINALIZED'
      const owner = state.users.find((item) => item.id === call.agentId) ?? user
      setSession(state, owner, 'wrap_up', call.campaignId, call.leadName ?? null)
    }
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
          agentId: user.id,
          agentName: user.name,
          leadName: pending.lead.name,
          status: 'RINGING',
          recordingUrl: null,
          durationSeconds: null,
          spokenSeconds: null,
          disposition: null,
          disconnectReason: null,
          startedAt: nowIso(),
        }
        state.calls.unshift(nextCall)
        next = { call: nextCall, campaignLead: pending }
        setSession(state, user, 'ringing', call.campaignId, pending.lead.name)
      } else {
        setSession(state, user, 'idle', call.campaignId, null)
      }
    } else {
      setSession(state, user, 'idle', call.campaignId, null)
    }
    save(state)
    return ok({ call, next })
  }

  if (path === '/calls' && method === 'GET') {
    return ok(state.calls, { page: 1, perPage: state.calls.length, total: state.calls.length })
  }

  fail(`Rota demo não implementada: ${method} ${path}`, 404)
}

export const demoAdapter: AxiosAdapter = async (config) => {
  await new Promise((resolve) => setTimeout(resolve, 80))
  return handle(config)
}
