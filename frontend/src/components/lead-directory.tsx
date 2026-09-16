import { useMemo } from 'react'
import { Search } from 'lucide-react'
import type { Lead } from '@/lib/types'
import { SEGMENTS, activitiesOf, segmentLabel } from '@/lib/segments'

export interface LeadFilterState {
  search: string
  segment: string
  activity: string
  city: string
}

export function emptyLeadFilters(): LeadFilterState {
  return { search: '', segment: '', activity: '', city: '' }
}

export function filterLeads(leads: Lead[], filters: LeadFilterState): Lead[] {
  const q = filters.search.trim().toLowerCase()
  return leads.filter((lead) => {
    if (filters.segment && lead.segment !== filters.segment) return false
    if (filters.activity && lead.activity !== filters.activity) return false
    if (filters.city && lead.city !== filters.city) return false
    if (!q) return true
    return [lead.name, lead.company, lead.phone, lead.city, lead.activity, segmentLabel(lead.segment)]
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
}

export function LeadFiltersBar({
  leads,
  filters,
  onChange,
}: {
  leads: Lead[]
  filters: LeadFilterState
  onChange: (next: LeadFilterState) => void
}) {
  const cities = useMemo(
    () => [...new Set(leads.map((lead) => lead.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [leads],
  )
  const activities = filters.segment ? activitiesOf(filters.segment) : [...new Set(leads.map((lead) => lead.activity))]

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <label className="relative min-w-[12rem] flex-1">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
        <input
          className="w-full rounded-lg border border-ink-700 bg-ink-800 py-2 pl-8 pr-3 text-sm text-ink-300 outline-none focus:border-accent"
          placeholder="Buscar nome, empresa, telefone…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </label>
      <select
        className="rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-ink-300"
        value={filters.segment}
        onChange={(e) => onChange({ ...filters, segment: e.target.value, activity: '' })}
      >
        <option value="">Todos os segmentos</option>
        {SEGMENTS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <select
        className="rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-ink-300"
        value={filters.activity}
        onChange={(e) => onChange({ ...filters, activity: e.target.value })}
      >
        <option value="">Todas as atividades</option>
        {activities.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select
        className="rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-ink-300"
        value={filters.city}
        onChange={(e) => onChange({ ...filters, city: e.target.value })}
      >
        <option value="">Todas as cidades</option>
        {cities.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  )
}

export function SegmentChips({
  leads,
  selected,
  onSelect,
}: {
  leads: Lead[]
  selected: string
  onSelect: (segment: string) => void
}) {
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const lead of leads) {
      map.set(lead.segment, (map.get(lead.segment) ?? 0) + 1)
    }
    return map
  }, [leads])

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        onClick={() => onSelect('')}
        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
          selected === '' ? 'bg-accent text-white' : 'bg-white/5 text-ink-500 hover:text-ink-300'
        }`}
      >
        Todos · {leads.length}
      </button>
      {SEGMENTS.map((item) => (
        <button
          key={item.id}
          type="button"
          title={item.hint}
          onClick={() => onSelect(item.id === selected ? '' : item.id)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
            selected === item.id ? 'bg-accent text-white' : 'bg-white/5 text-ink-500 hover:text-ink-300'
          }`}
        >
          {item.label} · {counts.get(item.id) ?? 0}
        </button>
      ))}
    </div>
  )
}

export function LeadTable({
  leads,
  selectable,
  selected,
  onToggle,
  onToggleAll,
}: {
  leads: Lead[]
  selectable?: boolean
  selected?: string[]
  onToggle?: (id: string) => void
  onToggleAll?: () => void
}) {
  const selectedSet = new Set(selected)
  const selectableRows = leads.filter((lead) => !lead.dncBlocked)
  const allSelected = selectableRows.length > 0 && selectableRows.every((lead) => selectedSet.has(lead.id))

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
      <table className="w-full min-w-[48rem] text-left text-sm">
        <thead className="text-ink-500">
          <tr>
            {selectable && (
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onToggleAll?.()}
                  aria-label="Selecionar filtrados"
                />
              </th>
            )}
            <th className="p-3">Contato</th>
            <th>Empresa</th>
            <th>Segmento</th>
            <th>Atividade</th>
            <th>Cidade</th>
            <th>Telefone</th>
            <th>DNC</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-t border-white/10">
              {selectable && (
                <td className="p-3">
                  <input
                    type="checkbox"
                    disabled={lead.dncBlocked}
                    checked={selectedSet.has(lead.id)}
                    onChange={() => onToggle?.(lead.id)}
                    aria-label={`Selecionar ${lead.name}`}
                  />
                </td>
              )}
              <td className="p-3">
                <p className="font-medium text-ink-300">{lead.name}</p>
                {lead.tags.length > 0 && (
                  <p className="text-xs text-ink-500">{lead.tags.join(' · ')}</p>
                )}
              </td>
              <td className="text-ink-300">{lead.company || '—'}</td>
              <td>{segmentLabel(lead.segment)}</td>
              <td className="text-ink-500">{lead.activity || '—'}</td>
              <td className="text-ink-500">{lead.city || '—'}</td>
              <td className="font-mono text-xs text-ink-500">{lead.phone}</td>
              <td>{lead.dncBlocked ? <span className="text-red-300">sim</span> : 'não'}</td>
            </tr>
          ))}
          {leads.length === 0 && (
            <tr>
              <td colSpan={selectable ? 8 : 7} className="p-8 text-center text-ink-500">
                Nenhum lead neste filtro.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

