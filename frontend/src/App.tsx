import { useEffect } from 'react'
import { Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom'
import { Phone } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import LoginPage from '@/pages/LoginPage'
import AgentPage from '@/pages/AgentPage'
import LeadsPage from '@/pages/LeadsPage'
import CampaignsPage from '@/pages/CampaignsPage'
import CallsPage from '@/pages/CallsPage'

function Layout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-emerald-400">
            <Phone size={18} /> Discador
          </Link>
          <nav className="flex items-center gap-4 text-sm text-slate-300">
            <Link to="/" className="hover:text-white">Agente</Link>
            <Link to="/leads" className="hover:text-white">Leads</Link>
            <Link to="/campaigns" className="hover:text-white">Campanhas</Link>
            <Link to="/calls" className="hover:text-white">Chamadas</Link>
            <span className="text-slate-500">{user?.name}</span>
            <button
              type="button"
              className="text-rose-300 hover:text-rose-200"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              Sair
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}

function Private({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  useEffect(() => {
    document.title = 'Discador Zenvia'
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Private><AgentPage /></Private>} />
      <Route path="/leads" element={<Private><LeadsPage /></Private>} />
      <Route path="/campaigns" element={<Private><CampaignsPage /></Private>} />
      <Route path="/calls" element={<Private><CallsPage /></Private>} />
    </Routes>
  )
}
