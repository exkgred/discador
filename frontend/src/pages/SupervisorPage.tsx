import { useEffect, useState } from 'react'
import { LayoutDashboard, RefreshCw } from 'lucide-react'
import { api, unwrap } from '@/lib/api'
import {
  dispositionLabel,
  formatClock,
  liveLabel,
  liveTone,
} from '@/lib/supervisor'
import type { Envelope, SupervisorOverview } from '@/lib/types'

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-medium text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink-300">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  )
}

function elapsed(since: string | null, now: number): string {
  if (!since) return '—'
  return formatClock(Math.floor((now - new Date(since).getTime()) / 1000))
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export default function SupervisorPage() {
  const [overview, setOverview] = useState<SupervisorOverview | null>(null)
  const [now, setNow] = useState(Date.now())
  const [error, setError] = useState('')

  async function load() {
    try {
      const { data } = await api.get<Envelope<SupervisorOverview>>('/supervisor/overview')
      setOverview(unwrap(data))
      setError('')
    } catch {
      setError('Não foi possível carregar o painel da equipe.')
    }
  }

  useEffect(() => {
    void load()
    const poll = window.setInterval(() => void load(), 4000)
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      window.clearInterval(poll)
      window.clearInterval(tick)
    }
  }, [])

  if (!overview) {
    return <p className="text-ink-500">{error || 'Carregando painel da equipe…'}</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-300 sm:text-3xl">
            <LayoutDashboard size={22} className="text-accent" />
            Painel da equipe
          </h1>
          <p className="text-sm text-ink-500">
            Wallboard de supervisor: status ao vivo, TMA e taxa de contato por agente — padrão Five9 / Vicidial / Talkdesk.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-ink-300"
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Agentes online" value={String(overview.kpis.agentsOnline)} hint={`${overview.kpis.agentsInCall} em ligação`} />
        <Kpi label="Ligações hoje" value={String(overview.kpis.calls)} hint={`${overview.kpis.answered} atendidas`} />
        <Kpi label="Taxa de contato" value={`${overview.kpis.contactRate}%`} hint="Atendeu ÷ discadas" />
        <Kpi label="TMA" value={formatClock(overview.kpis.ahtSeconds)} hint={`Fala ${formatClock(overview.kpis.talkSeconds)}`} />
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-ink-300">Agentes ao vivo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {overview.agents.map((agent) => (
            <article key={agent.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                    {initials(agent.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-ink-300">{agent.name}</p>
                    <p className="text-xs text-ink-500">Ramal {agent.ramalId ?? '—'}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${liveTone(agent.status)}`}>
                  {liveLabel(agent.status)}
                </span>
              </div>
              <p className="mt-3 text-sm text-ink-500">
                {agent.status === 'offline'
                  ? 'Fora da operação'
                  : [agent.campaignName, agent.leadName].filter(Boolean).join(' · ') || 'Aguardando fila'}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold text-ink-300">{agent.calls}</p>
                  <p className="text-[11px] text-ink-500">Discadas</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-ink-300">{agent.contactRate}%</p>
                  <p className="text-[11px] text-ink-500">Contato</p>
                </div>
                <div>
                  <p className="font-mono text-lg font-semibold text-accent">
                    {agent.status === 'in_call' || agent.status === 'ringing'
                      ? elapsed(agent.statusSince, now)
                      : formatClock(agent.ahtSeconds)}
                  </p>
                  <p className="text-[11px] text-ink-500">
                    {agent.status === 'in_call' || agent.status === 'ringing' ? 'Ao vivo' : 'TMA'}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 p-4">
          <h2 className="font-semibold text-ink-300">Produtividade</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="text-ink-500">
              <tr>
                <th className="px-4 py-3 font-medium">Agente</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Campanha</th>
                <th className="px-4 py-3 font-medium">Discadas</th>
                <th className="px-4 py-3 font-medium">Atendeu</th>
                <th className="px-4 py-3 font-medium">Não atendeu</th>
                <th className="px-4 py-3 font-medium">TMA</th>
                <th className="px-4 py-3 font-medium">Última tabulação</th>
              </tr>
            </thead>
            <tbody>
              {overview.agents.map((agent) => (
                <tr key={agent.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-medium text-ink-300">{agent.name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${liveTone(agent.status)}`}>
                      {liveLabel(agent.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-500">{agent.campaignName ?? '—'}</td>
                  <td className="px-4 py-3">{agent.calls}</td>
                  <td className="px-4 py-3 text-emerald-300">{agent.answered}</td>
                  <td className="px-4 py-3 text-amber-300">{agent.noAnswer}</td>
                  <td className="px-4 py-3 font-mono">{formatClock(agent.ahtSeconds)}</td>
                  <td className="px-4 py-3 text-ink-500">{dispositionLabel(agent.lastDisposition)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="mb-3 font-semibold text-ink-300">Filas por campanha</h2>
          <div className="space-y-2">
            {overview.campaigns.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between rounded-lg bg-ink-950/50 px-3 py-2 text-sm">
                <span className="text-ink-300">{campaign.name}</span>
                <span className="text-ink-500">
                  {campaign.live > 0 ? `${campaign.live} ao vivo · ` : ''}
                  {campaign.pending} na fila · {campaign.done} tratados
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="mb-3 font-semibold text-ink-300">Últimas ligações</h2>
          <div className="space-y-2">
            {overview.recentCalls.map((call) => (
              <div key={call.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="text-ink-300">{call.agentName ?? 'Agente'} · {call.leadName ?? call.leadId}</p>
                  <p className="text-xs text-ink-500">{dispositionLabel(call.disposition)} · {call.status}</p>
                </div>
                <p className="font-mono text-ink-500">{formatClock(call.durationSeconds ?? 0)}</p>
              </div>
            ))}
            {overview.recentCalls.length === 0 && (
              <p className="text-sm text-ink-500">Nenhuma ligação registrada ainda.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
