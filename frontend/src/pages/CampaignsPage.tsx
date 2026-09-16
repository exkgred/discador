import { FormEvent, useEffect, useMemo, useState } from 'react'
import { api, unwrap } from '@/lib/api'
import {
  LeadFiltersBar,
  LeadTable,
  SegmentChips,
  emptyLeadFilters,
  filterLeads,
  type LeadFilterState,
} from '@/components/lead-directory'
import { SEGMENTS, segmentLabel } from '@/lib/segments'
import type { Campaign, Envelope, Lead } from '@/lib/types'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [name, setName] = useState('Nova campanha')
  const [script, setScript] = useState('Olá, esta ligação pode ser gravada.')
  const [dialMode, setDialMode] = useState<'MANUAL' | 'POWER'>('POWER')
  const [campaignSegment, setCampaignSegment] = useState<string>(SEGMENTS[0].id)
  const [loadSegmentOnCreate, setLoadSegmentOnCreate] = useState(true)
  const [targetCampaignId, setTargetCampaignId] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [filters, setFilters] = useState<LeadFilterState>(emptyLeadFilters)
  const [flash, setFlash] = useState('')

  async function load() {
    const [c, l] = await Promise.all([
      api.get<Envelope<Campaign[]>>('/campaigns'),
      api.get<Envelope<Lead[]>>('/leads?perPage=100'),
    ])
    const nextCampaigns = unwrap(c.data)
    setCampaigns(nextCampaigns)
    setLeads(unwrap(l.data))
    setTargetCampaignId((current) => current || nextCampaigns[0]?.id || '')
  }

  useEffect(() => {
    void load()
  }, [])

  const visible = useMemo(() => filterLeads(leads, filters), [leads, filters])
  const selectableIds = visible.filter((lead) => !lead.dncBlocked).map((lead) => lead.id)
  const dncInView = visible.filter((lead) => lead.dncBlocked).length

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function toggleAll() {
    const allOn = selectableIds.length > 0 && selectableIds.every((id) => selected.includes(id))
    setSelected((current) => {
      if (allOn) return current.filter((id) => !selectableIds.includes(id))
      return [...new Set([...current, ...selectableIds])]
    })
  }

  function selectSegment(segmentId: string) {
    setFilters((current) => ({ ...current, segment: segmentId, activity: '' }))
    if (!segmentId) return
    const ids = leads.filter((lead) => lead.segment === segmentId && !lead.dncBlocked).map((lead) => lead.id)
    setSelected(ids)
  }

  async function create(event: FormEvent) {
    event.preventDefault()
    const { data } = await api.post<Envelope<Campaign>>('/campaigns', {
      name,
      script,
      dialMode,
      segment: campaignSegment,
      windowStart: '00:00',
      windowEnd: '23:59',
    })
    const created = unwrap(data)
    if (loadSegmentOnCreate) {
      const ids = leads.filter((lead) => lead.segment === campaignSegment && !lead.dncBlocked).map((lead) => lead.id)
      if (ids.length) {
        await api.post(`/campaigns/${created.id}/queue`, { leadIds: ids })
      }
    }
    setFlash(
      loadSegmentOnCreate
        ? `Campanha criada e lista de ${segmentLabel(campaignSegment)} carregada na fila.`
        : 'Campanha criada. Selecione os leads abaixo para montar a fila.',
    )
    await load()
    setTargetCampaignId(created.id)
  }

  async function enqueue(campaignId = targetCampaignId) {
    if (!campaignId || selected.length === 0) return
    const { data } = await api.post<Envelope<{ added: number }>>(`/campaigns/${campaignId}/queue`, {
      leadIds: selected,
    })
    const result = unwrap(data)
    const campaign = campaigns.find((item) => item.id === campaignId)
    setFlash(`${result.added} lead(s) enviados à fila de ${campaign?.name ?? 'campanha'}.`)
    setSelected([])
    setTargetCampaignId(campaignId)
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-300">Campanhas</h1>
        <p className="text-sm text-ink-500">
          Cada campanha consome uma lista (segmento). Filtre, selecione e envie para o hopper — padrão de discadores como Vicidial e Five9.
        </p>
      </div>

      <form onSubmit={create} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-medium">Nova campanha</h2>
        <input className="w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-ink-300 outline-none focus:border-accent" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className="h-20 w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-ink-300 outline-none focus:border-accent" value={script} onChange={(e) => setScript(e.target.value)} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <select className="rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-ink-300" value={dialMode} onChange={(e) => setDialMode(e.target.value as 'MANUAL' | 'POWER')}>
            <option value="MANUAL">Manual</option>
            <option value="POWER">Power dialer</option>
          </select>
          <select className="rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-ink-300" value={campaignSegment} onChange={(e) => setCampaignSegment(e.target.value)}>
            {SEGMENTS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-500">
          <input type="checkbox" checked={loadSegmentOnCreate} onChange={(e) => setLoadSegmentOnCreate(e.target.checked)} />
          Já carregar a lista deste segmento na fila
        </label>
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">Criar</button>
      </form>

      <section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-medium">Montar fila</h2>
            <p className="text-xs text-ink-500">Toque num segmento para filtrar e já selecionar todos os discáveis.</p>
          </div>
          {flash && <p className="text-sm text-accent">{flash}</p>}
        </div>

        <SegmentChips leads={leads} selected={filters.segment} onSelect={selectSegment} />
        <LeadFiltersBar leads={leads} filters={filters} onChange={setFilters} />

        <LeadTable
          leads={visible}
          selectable
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />

        <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-ink-950/60 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-500">
            <span className="font-semibold text-ink-300">{selected.length}</span> selecionado(s)
            {dncInView > 0 ? ` · ${dncInView} DNC fora da seleção em lote` : ''}
            {' · '}
            {visible.length} no filtro
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button type="button" className="rounded-lg bg-ink-800 px-3 py-2 text-sm text-ink-300" onClick={() => setSelected([])}>
              Limpar
            </button>
            <select
              className="rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-ink-300"
              value={targetCampaignId}
              onChange={(e) => setTargetCampaignId(e.target.value)}
            >
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                  {campaign.segment ? ` · ${segmentLabel(campaign.segment)}` : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={selected.length === 0 || !targetCampaignId}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
              onClick={() => void enqueue()}
            >
              Adicionar à fila
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Campanhas ativas</h2>
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-ink-300">{campaign.name}</p>
              <p className="text-ink-500">
                {campaign.dialMode === 'POWER' ? 'Automático' : 'Manual'}
                {campaign.segment ? ` · ${segmentLabel(campaign.segment)}` : ''}
                {campaign.active ? ' · ativa' : ' · off'}
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg bg-accent/15 px-3 py-2 text-accent disabled:opacity-40"
              disabled={selected.length === 0}
              onClick={() => void enqueue(campaign.id)}
            >
              Enviar selecionados
            </button>
          </div>
        ))}
      </section>
    </div>
  )
}
