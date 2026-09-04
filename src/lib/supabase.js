import { createClient } from '@supabase/supabase-js'

function decodeJwtPayload(token) {
  try {
    const part = String(token || '').split('.')[1]
    if (!part) return null
    const padded = part.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function isPublishableAnonKey(key) {
  if (!key || String(key).includes('your-anon-key')) return false
  const payload = decodeJwtPayload(key)
  if (payload?.role === 'service_role') return false
  if (String(key).includes('service_role')) return false
  return true
}

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(
  url &&
    !String(url).includes('YOUR_PROJECT') &&
    isPublishableAnonKey(anonKey),
)

const storage = typeof window !== 'undefined' ? window.sessionStorage : undefined

export const supabase = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage,
        storageKey: 'parkkasa-auth',
      },
    })
  : null
