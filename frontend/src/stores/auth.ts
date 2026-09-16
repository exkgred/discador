import { create } from 'zustand'
import type { PublicUser } from '@/lib/types'

interface AuthState {
  user: PublicUser | null
  accessToken: string | null
  refreshToken: string | null
  setSession: (user: PublicUser, accessToken: string, refreshToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: readJson('discador.user'),
  accessToken: localStorage.getItem('discador.access'),
  refreshToken: localStorage.getItem('discador.refresh'),
  setSession: (user, accessToken, refreshToken) => {
    localStorage.setItem('discador.user', JSON.stringify(user))
    localStorage.setItem('discador.access', accessToken)
    localStorage.setItem('discador.refresh', refreshToken)
    set({ user, accessToken, refreshToken })
  },
  logout: () => {
    localStorage.removeItem('discador.user')
    localStorage.removeItem('discador.access')
    localStorage.removeItem('discador.refresh')
    set({ user: null, accessToken: null, refreshToken: null })
  },
}))

function readJson(key: string): PublicUser | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PublicUser
  } catch {
    return null
  }
}
