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
      <h1 className="text-2xl font-semibold text-slate-900">Histórico de chamadas</h1>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="text-slate-500">
          <tr>
            <th className="p-3">Zenvia</th>
            <th>Status</th>
            <th>Disposição</th>
            <th>Duração</th>
            <th>Gravação</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <tr key={call.id} className="border-t border-slate-200">
              <td className="p-3 font-mono text-xs">{call.zenviaChamadaId}</td>
              <td>{call.status}</td>
              <td>{call.disposition ?? '—'}</td>
              <td>{call.durationSeconds ?? 0}s</td>
              <td>
                {call.recordingUrl ? (
                  <a className="text-blue-600" href={call.recordingUrl} target="_blank" rel="noreferrer">
                    áudio
                  </a>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
