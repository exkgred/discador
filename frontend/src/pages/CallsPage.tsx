import { useEffect, useState } from 'react'
import { api, unwrap } from '@/lib/api'
import type { Call, Envelope } from '@/lib/types'

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])

  useEffect(() => {
    void api.get<Envelope<Call[]>>('/calls').then(({ data }) => setCalls(unwrap(data)))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Histórico de chamadas</h1>
      <table className="w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="p-2">Zenvia</th>
            <th>Status</th>
            <th>Disposição</th>
            <th>Duração</th>
            <th>Gravação</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <tr key={call.id} className="border-t border-slate-800">
              <td className="p-2 font-mono text-xs">{call.zenviaChamadaId}</td>
              <td>{call.status}</td>
              <td>{call.disposition ?? '—'}</td>
              <td>{call.durationSeconds ?? 0}s</td>
              <td>
                {call.recordingUrl ? (
                  <a className="text-emerald-400" href={call.recordingUrl} target="_blank" rel="noreferrer">
                    áudio
                  </a>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
