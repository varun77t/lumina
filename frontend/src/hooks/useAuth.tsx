/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  devMode: boolean
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const devMode = import.meta.env.VITE_SUPABASE_URL === undefined || 
                  import.meta.env.VITE_SUPABASE_ANON_KEY === undefined ||
                  import.meta.env.VITE_BYPASS_AUTH === 'true'

  const [user, setUser] = useState<User | null>(() => {
    if (devMode) {
      const savedUser = localStorage.getItem('lumina_mock_user')
      if (savedUser) {
        try {
          return JSON.parse(savedUser)
        } catch {
          localStorage.removeItem('lumina_mock_user')
        }
      }
    }
    return null
  })

  const [session, setSession] = useState<Session | null>(() => {
    if (devMode) {
      const savedUser = localStorage.getItem('lumina_mock_user')
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser)
          return {
            access_token: 'mock-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock-refresh',
            user: parsedUser
          } as Session
        } catch {
          // Handled in user initializer
        }
      }
    }
    return null
  })

  const [loading, setLoading] = useState(() => {
    return !devMode
  })

  useEffect(() => {
    if (devMode) {
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
  }, [devMode])

  const signUp = async (email: string, password: string) => {
    if (devMode) {
      const mockUser = { id: 'dev-user-id', email } as User
      localStorage.setItem('lumina_mock_user', JSON.stringify(mockUser))
      setUser(mockUser)
      setSession({
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh',
        user: mockUser
      } as Session)
      return { error: null }
    }
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error as Error | null }
  }

  const signIn = async (email: string, password: string) => {
    if (devMode) {
      const mockUser = { id: 'dev-user-id', email } as User
      localStorage.setItem('lumina_mock_user', JSON.stringify(mockUser))
      setUser(mockUser)
      setSession({
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh',
        user: mockUser
      } as Session)
      return { error: null }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    if (devMode) {
      localStorage.removeItem('lumina_mock_user')
      setUser(null)
      setSession(null)
      return
    }
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, devMode, signUp, signIn, signOut }}>
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
