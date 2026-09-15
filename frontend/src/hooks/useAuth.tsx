/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { bypassAuth, supabase, supabaseConfigured } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  devMode: boolean
  configError: string | null
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const MOCK_USER_KEY = 'lumina_mock_user'

function loadMockUser(): User | null {
  const savedUser = localStorage.getItem(MOCK_USER_KEY)
  if (!savedUser) return null
  try {
    return JSON.parse(savedUser)
  } catch {
    localStorage.removeItem(MOCK_USER_KEY)
    return null
  }
}

function mockSession(user: User): Session {
  return {
    access_token: 'mock-token',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'mock-refresh',
    user,
  } as Session
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const devMode = bypassAuth
  const configError = !devMode && !supabaseConfigured
    ? 'Sign-in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    : null

  const [user, setUser] = useState<User | null>(() => (devMode ? loadMockUser() : null))
  const [session, setSession] = useState<Session | null>(() => {
    const mockUser = devMode ? loadMockUser() : null
    return mockUser ? mockSession(mockUser) : null
  })
  const [loading, setLoading] = useState(() => !devMode && !configError)

  useEffect(() => {
    if (devMode || configError) {
      return
    }

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
      })
      .finally(() => setLoading(false))

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [devMode, configError])

  const signInMock = (email: string) => {
    const mockUser = { id: 'dev-user-id', email } as User
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(mockUser))
    setUser(mockUser)
    setSession(mockSession(mockUser))
  }

  const signUp = async (email: string, password: string) => {
    if (devMode) {
      signInMock(email)
      return { error: null, needsConfirmation: false }
    }
    if (configError) return { error: new Error(configError), needsConfirmation: false }

    const { data, error } = await supabase.auth.signUp({ email, password })
    // Without a session, Supabase is waiting for the user to confirm their email
    return { error: error as Error | null, needsConfirmation: !error && !data.session }
  }

  const signIn = async (email: string, password: string) => {
    if (devMode) {
      signInMock(email)
      return { error: null }
    }
    if (configError) return { error: new Error(configError) }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    if (devMode) {
      localStorage.removeItem(MOCK_USER_KEY)
      setUser(null)
      setSession(null)
      return
    }
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, devMode, configError, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
