import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Local development only: skip Supabase and sign in as a mock user (the backend needs AUTH_BYPASS=true)
export const bypassAuth = import.meta.env.VITE_BYPASS_AUTH === 'true'
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
)
