import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { PhoneCall, PhoneOff } from 'lucide-react'
import { api, unwrap } from '@/lib/api'
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
  { id: 'CALLBACK', label: 'Agendar retorno' },
  { id: 'DNC', label: 'Não Me Perturbe' },
  { id: 'OTHER', label: 'Outro' },
] as const

export default function AgentPage() {
  const token = useAuthStore((s) => s.accessToken)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignId, setCampaignId] = useState('')
  const [queue, setQueue] = useState<CampaignLead[]>([])
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [current, setCurrent] = useState<{ call: Call; campaignLead: CampaignLead; campaign?: Campaign } | null>(null)
  const [webphoneUrl, setWebphoneUrl] = useState<string | null>(null)
  const [webphoneMock, setWebphoneMock] = useState(true)
  const [flash, setFlash] = useState('')
  const [disposition, setDisposition] = useState<(typeof DISPOSITIONS)[number]['id']>('ANSWERED')
  const [notes, setNotes] = useState('')
  const [callbackAt, setCallbackAt] = useState('')
  const hangupTimer = useRef<number | null>(null)

  function scheduleDemoHangup() {
    if (hangupTimer.current) window.clearTimeout(hangupTimer.current)
    hangupTimer.current = window.setTimeout(() => {
      setCurrent((prev) =>
        prev
          ? {
              ...prev,
              call: {
                ...prev.call,
                status: 'FINALIZED',
                durationSeconds: 12,
                spokenSeconds: 8,
                recordingUrl: 'https://example.invalid/rec/demo',
              },
            }
          : prev,
      )
      setStatus('wrap_up')
      setFlash('')
    }, 3000)
  }

  const campaign = useMemo(
    () => campaigns.find((item) => item.id === campaignId),
    [campaigns, campaignId],
  )

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
      setCurrent(payload)
      setStatus('ringing')
    })
    socket.on('call:wrap-up', (payload: { call: Call }) => {
      setCurrent((prev) => (prev ? { ...prev, call: payload.call } : prev))
      setStatus('wrap_up')
    })
    socket.on('queue:empty', () => setFlash('Fila da campanha vazia.'))
    return () => {
      socket.disconnect()
    }
  }, [token])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const message = (event.data as { message?: string })?.message
      if (message === 'status') setStatus('in_call')
      if (message === 'chamada_id') setStatus('in_call')
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  async function ready() {
    setFlash('')
    await api.post('/agent/ready', { campaignId })
    setStatus('idle')
  }

  async function dial(campaignLeadId?: string) {
    setFlash('')
    try {
      const { data } = await api.post<Envelope<{ call: Call; campaignLead: CampaignLead; mock: boolean }>>(
        '/agent/dial',
        { campaignId, campaignLeadId },
      )
      const result = unwrap(data)
      setCurrent({ call: result.call, campaignLead: result.campaignLead, campaign })
      setStatus('ringing')
      if (result.mock || isDemo) {
        setFlash('Chamada simulada: o hangup chega em ~3s.')
        scheduleDemoHangup()
      }
    } catch (error) {
      const message = axiosMessage(error)
      setFlash(message)
    }
  }

  async function hangup() {
    if (!current) return
    await api.post(`/calls/${current.call.id}/hangup`)
    if (isDemo) {
      if (hangupTimer.current) window.clearTimeout(hangupTimer.current)
      setCurrent((prev) =>
        prev
          ? { ...prev, call: { ...prev.call, status: 'FINALIZED', durationSeconds: 8 } }
          : prev,
      )
      setStatus('wrap_up')
    }
  }

  async function wrapUp() {
    if (!current) return
    setFlash('')
    try {
      const { data } = await api.post<Envelope<{ call: Call; next?: { call: Call; campaignLead: CampaignLead } }>>(
        `/calls/${current.call.id}/wrap-up`,
        {
          disposition,
          notes,
          callbackAt: disposition === 'CALLBACK' ? callbackAt : undefined,
        },
      )
      const result = unwrap(data)
      setNotes('')
      if (result.next) {
        setCurrent({
          call: result.next.call,
          campaignLead: result.next.campaignLead,
          campaign,
        })
        setStatus('ringing')
        if (isDemo) scheduleDemoHangup()
      } else {
        setCurrent(null)
        setStatus('idle')
      }
      if (campaignId) void loadQueue(campaignId)
    } catch (error) {
      setFlash(axiosMessage(error))
    }
  }

  const pending = queue.filter((item) => item.status === 'PENDING')

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      {webphoneUrl && !webphoneMock && (
        <iframe title="webphone" src={webphoneUrl} className="hidden" allow="microphone" />
      )}

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Mesa do agente</h1>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide text-emerald-300">
            {status}
          </span>
        </div>

        <label className="block text-sm">
          Campanha
          <select
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            disabled={status !== 'idle'}
          >
            {campaigns.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.dialMode})
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void ready()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
          >
            Ficar disponível
          </button>
          <button
            type="button"
            onClick={() => void dial()}
            disabled={status !== 'idle'}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-40"
          >
            <PhoneCall size={16} /> Discar próximo
          </button>
          {current && status !== 'wrap_up' && (
            <button
              type="button"
              onClick={() => void hangup()}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm"
            >
              <PhoneOff size={16} /> Desligar
            </button>
          )}
        </div>

        {flash && <p className="text-sm text-amber-300">{flash}</p>}

        <div className="rounded-xl bg-slate-950 p-4 text-sm leading-relaxed text-slate-300">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Script</p>
          {campaign?.script ?? 'Selecione uma campanha.'}
        </div>

        {current && (
          <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-4">
            <p className="text-xs uppercase text-emerald-300">Lead atual</p>
            <p className="text-lg font-medium">
              {current.campaignLead.lead?.name} — {current.campaignLead.lead?.phone}
            </p>
            <p className="text-xs text-slate-400">chamada {current.call.zenviaChamadaId}</p>
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-3 font-medium">Fila ({pending.length} pendentes)</h2>
          <ul className="max-h-80 space-y-2 overflow-auto text-sm">
            {queue.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-lg bg-slate-950 px-3 py-2">
                <div>
                  <p>{item.lead?.name}</p>
                  <p className="text-xs text-slate-500">{item.lead?.phone} · {item.status}</p>
                </div>
                {item.status === 'PENDING' && status === 'idle' && (
                  <button
                    type="button"
                    className="text-emerald-400 hover:underline"
                    onClick={() => void dial(item.id)}
                  >
                    Discar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {status === 'wrap_up' && current && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">Resultado da ligação</h2>
            <p className="text-sm text-slate-400">
              {current.campaignLead.lead?.name} — duração {current.call.durationSeconds ?? 0}s
            </p>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              value={disposition}
              onChange={(e) => setDisposition(e.target.value as typeof disposition)}
            >
              {DISPOSITIONS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
            {disposition === 'CALLBACK' && (
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                value={callbackAt}
                onChange={(e) => setCallbackAt(e.target.value)}
              />
            )}
            <textarea
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              placeholder="Observações"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void wrapUp()}
              className="w-full rounded-lg bg-emerald-500 py-2 font-medium text-slate-950"
            >
              Salvar e {campaign?.dialMode === 'POWER' ? 'próximo' : 'continuar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function axiosMessage(error: unknown): string {
  if (typeof error === 'object' && error && 'response' in error) {
    const data = (error as { response?: { data?: Envelope<unknown> } }).response?.data
    return data?.error?.message ?? 'Falha ao discar'
  }
  return 'Falha ao discar'
}
