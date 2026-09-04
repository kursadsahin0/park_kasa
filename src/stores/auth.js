import { defineStore } from 'pinia'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { supabaseAuthMessage } from '@/utils/supabase-auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    session: null,
    profile: null,
    ready: false,
  }),
  getters: {
    configured: () => supabaseConfigured,
    user: (state) => state.session?.user ?? null,
    accessToken: (state) => state.session?.access_token ?? null,
    isLoggedIn: (state) => Boolean(state.session?.user),
    isAdmin: (state) => state.profile?.role === 'OWNER' || state.profile?.role === 'STAFF',
    displayName: (state) =>
      state.profile?.fullName ||
      state.session?.user?.user_metadata?.full_name ||
      state.session?.user?.email?.split('@')[0] ||
      'Misafir',
  },
  actions: {
    async init() {
      if (this.ready) return
      if (!supabase) {
        this.ready = true
        return
      }
      const { data } = await supabase.auth.getSession()
      this.session = data.session
      supabase.auth.onAuthStateChange((_event, session) => {
        this.session = session
        if (!session) this.profile = null
      })
      this.ready = true
    },
    async signIn(email, password) {
      if (!supabase) throw new Error('Supabase bağlı değil. .env içine proje URL ve anon key yaz.')
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(supabaseAuthMessage(error))
      this.session = data.session
    },
    async signUp(email, password, fullName, licenseKey) {
      if (!supabase) throw new Error('Supabase bağlı değil. .env içine proje URL ve anon key yaz.')
      const { api } = await import('@/boot/axios')
      await api.post('/auth/register', {
        email,
        password,
        fullName,
        licenseKey,
      })
      return this.signIn(email, password)
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut()
      this.session = null
      this.profile = null
    },
    setProfile(profile) {
      this.profile = profile
    },
  },
})
