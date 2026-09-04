import { defineBoot } from '#q-app'
import { useAuthStore } from '@/stores/auth'
import { api } from './axios'
import { supabase } from '@/lib/supabase'

export { supabase }

export default defineBoot(async () => {
  const auth = useAuthStore()
  await auth.init()

  if (auth.isLoggedIn) {
    try {
      const { data } = await api.get('/users/me')
      auth.setProfile(data)
    } catch {
      auth.setProfile(null)
    }
  }
})
