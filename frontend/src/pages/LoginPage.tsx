import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone } from 'lucide-react'
import { api, unwrap } from '@/lib/api'
import type { Envelope, PublicUser } from '@/lib/types'
import { useAuthStore } from '@/stores/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [email, setEmail] = useState('agent@discador.dev')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const { data } = await api.post<
        Envelope<{ user: PublicUser; tokens: { accessToken: string; refreshToken: string } }>
      >('/auth/login', { email, password })
      const session = unwrap(data)
      setSession(session.user, session.tokens.accessToken, session.tokens.refreshToken)
      navigate('/')
    } catch {
      setError('Credenciais inválidas')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-8"
      >
        <div className="flex items-center gap-2 text-emerald-400">
          <Phone /> <h1 className="text-xl font-semibold">Discador Zenvia</h1>
        </div>
        <p className="text-sm text-slate-400">Entre para discar leads no navegador.</p>
        <label className="block text-sm">
          E-mail
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Senha
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-500 py-2 font-medium text-slate-950 hover:bg-emerald-400"
        >
          Entrar
        </button>
        <p className="text-xs text-slate-500">agent@discador.dev / password123</p>
      </form>
    </div>
  )
}
