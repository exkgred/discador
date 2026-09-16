import type { Call, LiveSession } from './types'
import { DEMO_CAMPAIGNS, DEMO_LEADS } from './demo-catalog'

export const DEMO_TEAM = [
  { id: 'u-admin', name: 'Admin Discador', email: 'admin@discador.dev', role: 'ADMIN' as const, ramalId: '1000', password: 'password123' },
  { id: 'u-sup', name: 'Carla Supervisor', email: 'supervisor@discador.dev', role: 'SUPERVISOR' as const, ramalId: '1001', password: 'password123' },
  { id: 'u-agent', name: 'Agente Demo', email: 'agent@discador.dev', role: 'AGENT' as const, ramalId: '1002', password: 'password123' },
  { id: 'u-agent-2', name: 'Bruno Costa', email: 'bruno@discador.dev', role: 'AGENT' as const, ramalId: '1003', password: 'password123' },
  { id: 'u-agent-3', name: 'Carla Mendes', email: 'carla@discador.dev', role: 'AGENT' as const, ramalId: '1004', password: 'password123' },
  { id: 'u-agent-4', name: 'Diego Alves', email: 'diego@discador.dev', role: 'AGENT' as const, ramalId: '1005', password: 'password123' },
  { id: 'u-agent-5', name: 'Elisa Ramos', email: 'elisa@discador.dev', role: 'AGENT' as const, ramalId: '1006', password: 'password123' },
]

const DISPOSITIONS = ['ANSWERED', 'NO_ANSWER', 'ANSWERED', 'BUSY', 'VOICEMAIL', 'ANSWERED', 'CALLBACK', 'NO_ANSWER'] as const

export function seedTeamSessions(): Record<string, LiveSession> {
  const now = Date.now()
  return {
    'u-agent': {
      userId: 'u-agent',
      status: 'idle',
      campaignId: 'camp-saude',
      leadName: null,
      startedAt: new Date(now - 8 * 60_000).toISOString(),
    },
    'u-agent-2': {
      userId: 'u-agent-2',
      status: 'in_call',
      campaignId: 'camp-saude',
      leadName: DEMO_LEADS[0].name,
      startedAt: new Date(now - 142_000).toISOString(),
    },
    'u-agent-3': {
      userId: 'u-agent-3',
      status: 'wrap_up',
      campaignId: 'camp-ead',
      leadName: DEMO_LEADS[8].name,
      startedAt: new Date(now - 25_000).toISOString(),
    },
    'u-agent-4': {
      userId: 'u-agent-4',
      status: 'idle',
      campaignId: 'camp-saude',
      leadName: null,
      startedAt: new Date(now - 3 * 60_000).toISOString(),
    },
  }
}

export function seedTeamCalls(): Call[] {
  const now = Date.now()
  const agents = DEMO_TEAM.filter((user) => user.role === 'AGENT' && user.id !== 'u-agent-5')
  const calls: Call[] = []
  let n = 0
  for (const agent of agents) {
    const count = agent.id === 'u-agent' ? 7 : 11
    for (let i = 0; i < count; i += 1) {
      const lead = DEMO_LEADS[n % (DEMO_LEADS.length - 1)]
      const campaign = DEMO_CAMPAIGNS[n % 2]
      const disposition = DISPOSITIONS[n % DISPOSITIONS.length]
      const duration = disposition === 'ANSWERED' ? 40 + (n % 80) : 8 + (n % 18)
      calls.push({
        id: `call-seed-${agent.id}-${i}`,
        zenviaChamadaId: String(31_000_000 + n),
        campaignId: campaign.id,
        campaignLeadId: `cl-${campaign.id}-${lead.id}`,
        leadId: lead.id,
        agentId: agent.id,
        agentName: agent.name,
        leadName: lead.name,
        status: 'FINALIZED',
        recordingUrl: disposition === 'ANSWERED' ? 'https://example.com/demo.mp3' : null,
        durationSeconds: duration,
        spokenSeconds: disposition === 'ANSWERED' ? duration - 6 : 0,
        disposition,
        disconnectReason: '16. normal',
        startedAt: new Date(now - (n + 2) * 7 * 60_000).toISOString(),
      })
      n += 1
    }
  }
  calls.unshift({
    id: 'call-live-bruno',
    zenviaChamadaId: '39000001',
    campaignId: 'camp-saude',
    campaignLeadId: 'cl-camp-saude-lead-01',
    leadId: DEMO_LEADS[0].id,
    agentId: 'u-agent-2',
    agentName: 'Bruno Costa',
    leadName: DEMO_LEADS[0].name,
    status: 'IN_CALL',
    recordingUrl: null,
    durationSeconds: 142,
    spokenSeconds: 120,
    disposition: null,
    disconnectReason: null,
    startedAt: new Date(now - 142_000).toISOString(),
  })
  return calls
}
