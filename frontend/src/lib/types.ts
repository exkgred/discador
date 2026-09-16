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
  tags: string[]
  dncBlocked: boolean
  notes: string | null
}

export interface Campaign {
  id: string
  name: string
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
}

export type AgentStatus = 'idle' | 'ringing' | 'in_call' | 'wrap_up'

export interface Envelope<T> {
  success: boolean
  data: T
  meta?: { page?: number; perPage?: number; total?: number; lastPage?: number }
  error?: { code: string; message: string }
}
