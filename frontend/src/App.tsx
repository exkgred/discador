import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, NavLink, useNavigate } from 'react-router-dom'
import { Headset, History, LogOut, Megaphone, Phone, Users } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import LoginPage from '@/pages/LoginPage'
import AgentPage from '@/pages/AgentPage'
import LeadsPage from '@/pages/LeadsPage'
import CampaignsPage from '@/pages/CampaignsPage'
import CallsPage from '@/pages/CallsPage'

const NAV = [
  { to: '/', label: 'Agente', icon: Headset },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/campaigns', label: 'Campanhas', icon: Megaphone },
  { to: '/calls', label: 'Chamadas', icon: History },
] as const

function Layout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh pb-[4.5rem] md:pb-0">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/" className="flex shrink-0 items-center gap-2 font-semibold text-emerald-400">
            <Phone size={18} />
            <span>Discador</span>
          </NavLink>
          <nav className="hidden items-center gap-1 text-sm text-slate-300 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 ${isActive ? 'bg-slate-800 text-white' : 'hover:text-white'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <span className="ml-2 hidden text-slate-500 lg:inline">{user?.name}</span>
            <button
              type="button"
              className="ml-2 text-rose-300 hover:text-rose-200"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              Sair
            </button>
          </nav>
          <button
            type="button"
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Menu"
          >
            {user?.name?.split(' ')[0] ?? 'Menu'}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-slate-800 px-4 py-2 md:hidden">
            <p className="mb-2 text-xs text-slate-500">{user?.email}</p>
            <button
              type="button"
              className="text-sm text-rose-300"
              onClick={() => {
                logout()
                navigate('/login')
                setMenuOpen(false)
              }}
            >
              <span className="inline-flex items-center gap-2"><LogOut size={14} /> Sair</span>
            </button>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-4 md:py-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-2 py-2 text-[11px] ${
                  isActive ? 'text-emerald-400' : 'text-slate-400'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
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
