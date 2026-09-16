import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { PhoneCall, PhoneOff, Volume2, VolumeX } from 'lucide-react'
import { api, unwrap } from '@/lib/api'
import {
  isCallAudioMuted,
  playHangup,
  playOutboundCall,
  setCallAudioMuted,
  startInCallAudio,
  stopCallAudio,
  unlockCallAudio,
} from '@/lib/call-audio'
import { isDemo } from '@/lib/demo-mode'
import type {
  AgentStatus,
  Call,
  Campaign,
  CampaignLead,
  Envelope,
} from '@/lib/types'
import { useAuthStore } from '@/stores/auth'

const DISPOSITIONS = [
  { id: 'ANSWERED', label: 'Atendeu' },
  { id: 'NO_ANSWER', label: 'Não atendeu' },
  { id: 'VOICEMAIL', label: 'Caixa postal' },
  { id: 'BUSY', label: 'Ocupado' },
  { id: 'CALLBACK', label: 'Retorno' },
  { id: 'DNC', label: 'Não ligar' },
  { id: 'OTHER', label: 'Outro' },
] as const

const NEXT_DELAY_MS = 3000

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: 'Livre',
  ringing: 'Tocando',
  in_call: 'Em ligação',
  wrap_up: 'Encerrada',
}

type ActiveCall = { call: Call; campaignLead: CampaignLead; campaign?: Campaign }

export default function AgentPage() {
  const token = useAuthStore((s) => s.accessToken)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignId, setCampaignId] = useState('')
  const [queue, setQueue] = useState<CampaignLead[]>([])
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [current, setCurrent] = useState<ActiveCall | null>(null)
  const [webphoneUrl, setWebphoneUrl] = useState<string | null>(null)
  const [webphoneMock, setWebphoneMock] = useState(true)
  const [flash, setFlash] = useState('')
  const [disposition, setDisposition] = useState<(typeof DISPOSITIONS)[number]['id']>('ANSWERED')
  const [notes, setNotes] = useState('')
  const [callbackAt, setCallbackAt] = useState('')
  const [muted, setMuted] = useState(isCallAudioMuted)
  const [elapsed, setElapsed] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const callTimers = useRef<{ answer: number | null; next: number | null; tick: number | null }>({
    answer: null,
    next: null,
    tick: null,
  })
  const formRef = useRef({ disposition, notes, callbackAt, current, campaignId })
  const submitting = useRef(false)
  const startNextCountdownRef = useRef<() => void>(() => {})
  const willAutoNextRef = useRef(false)
  formRef.current = { disposition, notes, callbackAt, current, campaignId }

  const campaign = useMemo(
    () => campaigns.find((item) => item.id === campaignId),
    [campaigns, campaignId],
  )
  const pending = queue.filter((item) => item.status === 'PENDING')
  const onCall = status === 'ringing' || status === 'in_call'
  const willAutoNext = campaign?.dialMode === 'POWER' && pending.length > 0
  willAutoNextRef.current = willAutoNext

  function clearCallTimers() {
    if (callTimers.current.answer) window.clearTimeout(callTimers.current.answer)
    if (callTimers.current.next) window.clearTimeout(callTimers.current.next)
    if (callTimers.current.tick) window.clearInterval(callTimers.current.tick)
    callTimers.current = { answer: null, next: null, tick: null }
  }

  function startCallAudio(phone: string) {
    playOutboundCall(phone)
    try {
      navigator.vibrate?.(40)
    } catch {
      /* ignore */
    }
  }

  function startElapsed() {
    if (callTimers.current.tick) window.clearInterval(callTimers.current.tick)
    const started = Date.now()
    setElapsed(0)
    callTimers.current.tick = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000))
    }, 250)
  }

  function scheduleDemoAnswer() {
    if (callTimers.current.answer) window.clearTimeout(callTimers.current.answer)
    callTimers.current.answer = window.setTimeout(() => {
      startInCallAudio()
      setStatus('in_call')
      setCurrent((prev) =>
        prev ? { ...prev, call: { ...prev.call, status: 'IN_CALL' } } : prev,
      )
      setFlash('')
    }, 2800)
  }

  function beginCall(payload: ActiveCall, mock: boolean) {
    setCurrent(payload)
    setStatus('ringing')
    setElapsed(0)
    startElapsed()
    startCallAudio(payload.campaignLead.lead?.phone ?? '')
    if (mock || isDemo) scheduleDemoAnswer()
  }

  useEffect(() => {
    return () => {
      clearCallTimers()
      stopCallAudio()
    }
  }, [])

  const loadQueue = useCallback(async (id: string) => {
    const { data } = await api.get<Envelope<CampaignLead[]>>(`/campaigns/${id}/queue`)
    setQueue(unwrap(data))
  }, [])

  useEffect(() => {
    void api.get<Envelope<Campaign[]>>('/campaigns').then(({ data }) => {
      const list = unwrap(data)
      setCampaigns(list)
      if (list[0]) setCampaignId(list[0].id)
    })
    void api.get<Envelope<{ url: string | null; mock: boolean }>>('/webphone').then(({ data }) => {
      const info = unwrap(data)
      setWebphoneUrl(info.url)
      setWebphoneMock(info.mock)
    }).catch(() => setWebphoneMock(true))
  }, [])

  useEffect(() => {
    if (campaignId) void loadQueue(campaignId)
  }, [campaignId, loadQueue])

  useEffect(() => {
    if (isDemo || !token) return
    const socket: Socket = io(import.meta.env.VITE_WS_URL ?? 'http://localhost:3001/realtime', {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
    socket.on('agent:status', (payload: { status: AgentStatus }) => setStatus(payload.status))
    socket.on('call:started', (payload: { call: Call; campaignLead: CampaignLead; campaign: Campaign }) => {
      beginCall(payload, false)
    })
    socket.on('call:wrap-up', (payload: { call: Call }) => {
      playHangup()
      setCurrent((prev) => (prev ? { ...prev, call: payload.call } : prev))
      setStatus('wrap_up')
      if (willAutoNextRef.current) startNextCountdownRef.current()
    })
    socket.on('queue:empty', () => setFlash('Fila da campanha vazia.'))
    return () => {
      socket.disconnect()
    }
  }, [token])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const message = (event.data as { message?: string })?.message
      if (message === 'status' || message === 'chamada_id') {
        setStatus('in_call')
        if (isDemo || webphoneMock) startInCallAudio()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [webphoneMock])

  async function dial(campaignLeadId?: string) {
    setFlash('')
    await unlockCallAudio()
    try {
      await api.post('/agent/ready', { campaignId })
      const { data } = await api.post<Envelope<{ call: Call; campaignLead: CampaignLead; mock: boolean }>>(
        '/agent/dial',
        { campaignId, campaignLeadId },
      )
      const result = unwrap(data)
      beginCall(
        { call: result.call, campaignLead: result.campaignLead, campaign },
        result.mock,
      )
    } catch (error) {
      stopCallAudio()
      setFlash(axiosMessage(error))
    }
  }

  function startNextCountdown() {
    if (callTimers.current.next) window.clearTimeout(callTimers.current.next)
    if (callTimers.current.tick) window.clearInterval(callTimers.current.tick)
    setCountdown(3)
    const started = Date.now()
    callTimers.current.tick = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((NEXT_DELAY_MS - (Date.now() - started)) / 1000))
      setCountdown(left)
    }, 100)
    callTimers.current.next = window.setTimeout(() => {
      void submitWrapUp(true)
    }, NEXT_DELAY_MS)
  }
  startNextCountdownRef.current = startNextCountdown

  async function hangup() {
    if (!current || !onCall) return
    if (callTimers.current.answer) window.clearTimeout(callTimers.current.answer)
    playHangup()
    try {
      navigator.vibrate?.(60)
    } catch {
      /* ignore */
    }
    const seconds = elapsed
    await api.post(`/calls/${current.call.id}/hangup`)
    setCurrent((prev) =>
      prev
        ? { ...prev, call: { ...prev.call, status: 'FINALIZED', durationSeconds: seconds } }
        : prev,
    )
    setStatus('wrap_up')
    setFlash('')
    if (willAutoNext) startNextCountdown()
    else setCountdown(null)
  }

  async function submitWrapUp(autoDialNext: boolean) {
    const snapshot = formRef.current
    if (!snapshot.current || submitting.current) return
    submitting.current = true
    if (callTimers.current.next) window.clearTimeout(callTimers.current.next)
    if (callTimers.current.tick) window.clearInterval(callTimers.current.tick)
    setCountdown(null)
    await unlockCallAudio()
    try {
      const { data } = await api.post<Envelope<{ call: Call; next?: { call: Call; campaignLead: CampaignLead } }>>(
        `/calls/${snapshot.current.call.id}/wrap-up`,
        {
          disposition: snapshot.disposition,
          notes: snapshot.notes,
          callbackAt: snapshot.disposition === 'CALLBACK' ? snapshot.callbackAt : undefined,
          autoDialNext,
        },
      )
      const result = unwrap(data)
      setNotes('')
      if (autoDialNext && result.next) {
        beginCall(
          {
            call: result.next.call,
            campaignLead: result.next.campaignLead,
            campaign,
          },
          isDemo,
        )
      } else {
        stopCallAudio()
        setCurrent(null)
        setStatus('idle')
      }
      if (snapshot.campaignId) void loadQueue(snapshot.campaignId)
    } catch (error) {
      setFlash(axiosMessage(error))
    } finally {
      submitting.current = false
    }
  }

  const lead = current?.campaignLead.lead
  const nextLead = pending[0]?.lead
  const initials = initialsOf(lead?.name)

  return (
    <div className="space-y-6">
      {webphoneUrl && !webphoneMock && (
        <iframe title="webphone" src={webphoneUrl} className="hidden" allow="microphone; autoplay" />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">Mesa do agente</h1>
          <p className="text-slate-500">
            {pending.length} lead(s) na fila
            {campaign ? ` · ${campaign.name}` : ''}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !muted
              setMuted(next)
              setCallAudioMuted(next)
              void unlockCallAudio()
            }}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
            title={muted ? 'Ativar som' : 'Silenciar'}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusTone(status)}`}>
            {STATUS_LABEL[status]}
          </span>
          {status === 'idle' && (
            <button
              type="button"
              onClick={() => void dial()}
              disabled={pending.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              <PhoneCall size={16} /> Discar próximo
            </button>
          )}
          {onCall && (
            <button
              type="button"
              onClick={() => void hangup()}
              className="hidden h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 sm:inline-flex"
            >
              <PhoneOff size={16} /> Encerrar
            </button>
          )}
        </div>
      </div>

      {flash && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{flash}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Pendentes" value={String(pending.length)} />
        <Kpi label="Campanha" value={campaign?.name ?? '—'} />
        <Kpi label="Modo" value={campaign?.dialMode === 'POWER' ? 'Automático' : 'Manual'} />
      </div>

      {onCall && lead && (
        <section className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 ${
                  status === 'ringing' ? 'ringing-avatar' : ''
                }`}
              >
                {initials}
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-800">{lead.name}</p>
                <p className="font-mono text-sm text-slate-500">{lead.phone}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <p className="font-mono text-2xl tabular-nums text-blue-700">{formatDuration(elapsed)}</p>
              <button
                type="button"
                onClick={() => void hangup()}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 sm:hidden"
              >
                <PhoneOff size={16} /> Encerrar
              </button>
            </div>
          </div>
          {campaign?.script && (
            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{campaign.script}</p>
          )}
        </section>
      )}

      {status === 'idle' && nextLead && (
        <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Próximo lead</p>
            <p className="font-semibold text-slate-800">{nextLead.name}</p>
            <p className="font-mono text-sm text-slate-500">{nextLead.phone}</p>
          </div>
          <button
            type="button"
            onClick={() => void dial()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
          >
            <PhoneCall size={16} /> Discar {nextLead.name.split(' ')[0]}
          </button>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-slate-800">Fila da campanha</h2>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:w-72"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            disabled={status !== 'idle'}
          >
            {campaigns.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.dialMode === 'POWER' ? 'automático' : 'manual'})
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{item.lead?.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{item.lead?.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${queueBadge(item.status)}`}>
                      {queueLabel(item.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.status === 'PENDING' && status === 'idle' && (
                      <button
                        type="button"
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        onClick={() => void dial(item.id)}
                      >
                        Discar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Nenhum lead na fila desta campanha.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {onCall && (
        <div className="fixed inset-x-0 z-30 px-4 sm:hidden" style={{ bottom: 'calc(4.6rem + env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={() => void hangup()}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-red-600 text-sm font-semibold text-white shadow-lg"
          >
            <PhoneOff size={18} /> Encerrar ligação
          </button>
        </div>
      )}

      {status === 'wrap_up' && current && (
        <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-4 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:bg-slate-900/40 sm:p-4">
          <div className="mx-auto w-full max-w-md space-y-4 rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Ligação encerrada</h2>
                <p className="text-sm text-slate-500">
                  {lead?.name} · {formatDuration(current.call.durationSeconds ?? elapsed)}
                </p>
              </div>
              {countdown != null && willAutoNext && (
                <CountdownBadge seconds={countdown} total={3} />
              )}
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
              {DISPOSITIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDisposition(item.id)}
                  className={`shrink-0 rounded-full px-3 py-2 text-sm ${
                    disposition === item.id
                      ? 'bg-blue-600 font-medium text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {disposition === 'CALLBACK' && (
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
                value={callbackAt}
                onChange={(e) => setCallbackAt(e.target.value)}
              />
            )}
            <textarea
              className="h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base"
              placeholder="Observações (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            {willAutoNext && countdown != null ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void submitWrapUp(false)}
                  className="h-11 rounded-lg bg-slate-100 font-medium text-slate-700"
                >
                  Parar
                </button>
                <button
                  type="button"
                  onClick={() => void submitWrapUp(true)}
                  className="h-11 rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700"
                >
                  Ligar agora
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void submitWrapUp(false)}
                className="h-11 w-full rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700"
              >
                Salvar e continuar
              </button>
            )}
            {willAutoNext && countdown != null && (
              <p className="text-center text-xs text-slate-500">
                Próxima ligação em {countdown}s. Toque em Parar se quiser pausar.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xl font-bold text-slate-800">{value}</p>
    </div>
  )
}

function initialsOf(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function queueBadge(status: string): string {
  if (status === 'PENDING') return 'bg-blue-50 text-blue-700'
  if (status === 'DIALING') return 'bg-amber-50 text-amber-700'
  if (status === 'DONE') return 'bg-emerald-50 text-emerald-700'
  if (status === 'CALLBACK') return 'bg-violet-50 text-violet-700'
  if (status === 'DNC') return 'bg-red-50 text-red-700'
  return 'bg-slate-100 text-slate-600'
}

function queueLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pendente',
    DIALING: 'Discando',
    DONE: 'Concluído',
    NO_ANSWER: 'Não atendeu',
    CALLBACK: 'Retorno',
    DNC: 'Não ligar',
  }
  return labels[status] ?? status
}

function CountdownBadge({ seconds, total }: { seconds: number; total: number }) {
  const radius = 16
  const circ = 2 * Math.PI * radius
  const progress = Math.max(0, seconds / total)
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 40 40" className="countdown-ring h-12 w-12">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="#2563eb"
          strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
        {seconds}
      </span>
    </div>
  )
}

function statusTone(status: AgentStatus): string {
  if (status === 'ringing') return 'bg-amber-100 text-amber-700'
  if (status === 'in_call') return 'bg-blue-100 text-blue-700'
  if (status === 'wrap_up') return 'bg-slate-100 text-slate-600'
  return 'bg-slate-100 text-slate-500'
}

function formatDuration(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function axiosMessage(error: unknown): string {
  if (typeof error === 'object' && error && 'response' in error) {
    const data = (error as { response?: { data?: Envelope<unknown> } }).response?.data
    return data?.error?.message ?? 'Falha ao discar'
  }
  return 'Falha ao discar'
}
