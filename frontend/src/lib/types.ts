export interface PublicUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'SUPERVISOR' | 'AGENT'
  ramalId: string | null
}

export interface Lead {
  id: string
  name: string
  phone: string
  company: string
  city: string
  segment: string
  activity: string
  tags: string[]
  dncBlocked: boolean
  notes: string | null
}

export interface Campaign {
  id: string
  name: string
  segment: string | null
  script: string
  dialMode: 'MANUAL' | 'POWER'
  gravarAudio: boolean
  windowStart: string
  windowEnd: string
  timeZone: string
  active: boolean
}

export interface CampaignLead {
  id: string
  campaignId: string
  leadId: string
  position: number
  status: string
  agentId: string | null
  lead?: Lead
}

export interface Call {
  id: string
  zenviaChamadaId: string
  campaignId: string
  campaignLeadId: string
  leadId: string
  agentId: string
  status: string
  recordingUrl: string | null
  durationSeconds: number | null
  spokenSeconds: number | null
  disposition: string | null
  disconnectReason: string | null
  agentName?: string
  leadName?: string
  startedAt?: string
}

export type AgentStatus = 'idle' | 'ringing' | 'in_call' | 'wrap_up'
export type LiveAgentStatus = AgentStatus | 'offline'

export interface LiveSession {
  userId: string
  status: LiveAgentStatus
  campaignId: string | null
  leadName: string | null
  startedAt: string
}

export interface AgentMetrics {
  id: string
  name: string
  email: string
  ramalId: string | null
  status: LiveAgentStatus
  campaignName: string | null
  leadName: string | null
  statusSince: string | null
  calls: number
  answered: number
  noAnswer: number
  talkSeconds: number
  ahtSeconds: number
  contactRate: number
  lastDisposition: string | null
}

export interface CampaignMetrics {
  id: string
  name: string
  pending: number
  done: number
  live: number
}

export interface SupervisorOverview {
  generatedAt: string
  kpis: {
    agentsOnline: number
    agentsInCall: number
    calls: number
    answered: number
    contactRate: number
    talkSeconds: number
    ahtSeconds: number
    pendingQueue: number
  }
  agents: AgentMetrics[]
  campaigns: CampaignMetrics[]
  recentCalls: Call[]
}

export interface Envelope<T> {
  success: boolean
  data: T
  meta?: { page?: number; perPage?: number; total?: number; lastPage?: number }
  error?: { code: string; message: string }
}
