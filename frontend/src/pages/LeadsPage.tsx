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
import { SEGMENTS, activitiesOf } from '@/lib/segments'
import type { Envelope, Lead } from '@/lib/types'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filters, setFilters] = useState<LeadFilterState>(emptyLeadFilters)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [city, setCity] = useState('')
  const [segment, setSegment] = useState<string>(SEGMENTS[0].id)
  const [activity, setActivity] = useState(activitiesOf(SEGMENTS[0].id)[0])
  const [csv, setCsv] = useState(
    'name,phone,company,city,segment,activity,tags\nCarla Dias,11977770001,Clínica Norte,São Paulo,saude,Clínica,vip',
  )
  const [flash, setFlash] = useState('')

  async function load() {
    const { data } = await api.get<Envelope<Lead[]>>('/leads?perPage=100')
    setLeads(unwrap(data))
  }

  useEffect(() => {
    void load()
  }, [])

  const visible = useMemo(() => filterLeads(leads, filters), [leads, filters])

  async function create(event: FormEvent) {
    event.preventDefault()
    await api.post('/leads', { name, phone, company, city, segment, activity })
    setName('')
    setPhone('')
    setCompany('')
    setCity('')
    await load()
  }

  async function importCsv(event: FormEvent) {
    event.preventDefault()
    const { data } = await api.post<Envelope<{ created: number; skipped: number }>>('/leads/import', { csv })
    const result = unwrap(data)
    setFlash(`Importados ${result.created}, ignorados ${result.skipped}`)
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-300">Leads</h1>
        <p className="text-sm text-ink-500">
          {leads.length} contatos na base · organize por segmento e ramo de atividade, como em discadores de outbound.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={create} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-medium">Novo lead</h2>
          <input className="w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-ink-300 outline-none focus:border-accent" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-ink-300 outline-none focus:border-accent" placeholder="Empresa" value={company} onChange={(e) => setCompany(e.target.value)} />
          <input className="w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-ink-300 outline-none focus:border-accent" placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-ink-300 outline-none focus:border-accent" placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-ink-300"
              value={segment}
              onChange={(e) => {
                const next = e.target.value
                setSegment(next)
                setActivity(activitiesOf(next)[0] ?? '')
              }}
            >
              {SEGMENTS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-ink-300"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
            >
              {activitiesOf(segment).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">Salvar</button>
        </form>
        <form onSubmit={importCsv} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-medium">Importar lista (CSV)</h2>
          <p className="text-xs text-ink-500">Colunas: name, phone, company, city, segment, activity, tags</p>
          <textarea className="h-36 w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 font-mono text-xs text-ink-300 outline-none focus:border-accent" value={csv} onChange={(e) => setCsv(e.target.value)} />
          <button className="rounded-lg bg-ink-800 px-4 py-2 text-sm font-medium text-ink-300">Importar</button>
          {flash && <p className="text-sm text-accent">{flash}</p>}
        </form>
      </div>

      <section className="space-y-3">
        <SegmentChips
          leads={leads}
          selected={filters.segment}
          onSelect={(segmentId) => setFilters((current) => ({ ...current, segment: segmentId, activity: '' }))}
        />
        <LeadFiltersBar leads={leads} filters={filters} onChange={setFilters} />
        <p className="text-xs text-ink-500">{visible.length} lead(s) no filtro atual</p>
        <LeadTable leads={visible} />
      </section>
    </div>
  )
}
