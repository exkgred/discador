import { FormEvent, useEffect, useState } from 'react'
import { api, unwrap } from '@/lib/api'
import type { Envelope, Lead } from '@/lib/types'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [csv, setCsv] = useState('name,phone,tags\nCarla Dias,11977770001,vip')
  const [flash, setFlash] = useState('')

  async function load() {
    const { data } = await api.get<Envelope<Lead[]>>('/leads')
    setLeads(unwrap(data))
  }

  useEffect(() => {
    void load()
  }, [])

  async function create(event: FormEvent) {
    event.preventDefault()
    await api.post('/leads', { name, phone })
    setName('')
    setPhone('')
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
      <h1 className="text-2xl font-semibold text-ink-300">Leads</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={create} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-medium">Novo lead</h2>
          <input className="w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-ink-300 outline-none focus:border-accent" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-ink-300 outline-none focus:border-accent" placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">Salvar</button>
        </form>
        <form onSubmit={importCsv} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-medium">Importar CSV</h2>
          <textarea className="h-28 w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 font-mono text-xs text-ink-300 outline-none focus:border-accent" value={csv} onChange={(e) => setCsv(e.target.value)} />
          <button className="rounded-lg bg-ink-800 px-4 py-2 text-sm font-medium text-ink-300">Importar</button>
          {flash && <p className="text-sm text-accent">{flash}</p>}
        </form>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="text-ink-500">
            <tr><th className="p-3">Nome</th><th>Telefone</th><th>DNC</th></tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-white/10">
                <td className="p-3">{lead.name}</td>
                <td>{lead.phone}</td>
                <td>{lead.dncBlocked ? 'sim' : 'não'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
