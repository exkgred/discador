import { FormEvent, useEffect, useState } from 'react'
import { api, unwrap } from '@/lib/api'
import type { Campaign, Envelope, Lead } from '@/lib/types'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [name, setName] = useState('Nova campanha')
  const [script, setScript] = useState('Olá, esta ligação pode ser gravada.')
  const [dialMode, setDialMode] = useState<'MANUAL' | 'POWER'>('POWER')
  const [selected, setSelected] = useState<string[]>([])

  async function load() {
    const [c, l] = await Promise.all([
      api.get<Envelope<Campaign[]>>('/campaigns'),
      api.get<Envelope<Lead[]>>('/leads?perPage=50'),
    ])
    setCampaigns(unwrap(c.data))
    setLeads(unwrap(l.data))
  }

  useEffect(() => {
    void load()
  }, [])

  async function create(event: FormEvent) {
    event.preventDefault()
    await api.post('/campaigns', { name, script, dialMode, windowStart: '00:00', windowEnd: '23:59' })
    await load()
  }

  async function enqueue(campaignId: string) {
    await api.post(`/campaigns/${campaignId}/queue`, { leadIds: selected })
    await load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Campanhas</h1>
      <form onSubmit={create} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className="h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" value={script} onChange={(e) => setScript(e.target.value)} />
        <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" value={dialMode} onChange={(e) => setDialMode(e.target.value as 'MANUAL' | 'POWER')}>
          <option value="MANUAL">Manual</option>
          <option value="POWER">Power dialer</option>
        </select>
        <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Criar</button>
      </form>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-2 font-medium">Enfileirar leads</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {leads.map((lead) => (
            <label key={lead.id} className="flex items-center gap-2 rounded bg-slate-950 px-2 py-1 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(lead.id)}
                onChange={(e) => {
                  setSelected((current) =>
                    e.target.checked ? [...current, lead.id] : current.filter((id) => id !== lead.id),
                  )
                }}
              />
              {lead.name}
            </label>
          ))}
        </div>
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="mb-2 flex items-center justify-between rounded-lg bg-slate-950 px-3 py-2 text-sm">
            <span>{campaign.name} · {campaign.dialMode} · {campaign.active ? 'ativa' : 'off'}</span>
            <button type="button" className="text-emerald-400" onClick={() => void enqueue(campaign.id)}>
              Adicionar selecionados
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
