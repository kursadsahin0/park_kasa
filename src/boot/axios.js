import { defineBoot } from '#q-app'
import axios from 'axios'
import { Notify } from 'quasar'
import { useAuthStore } from '@/stores/auth'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 15000,
})

let lastNetworkNotice = 0
let signingOut = false

function notifyApiDown() {
  const now = Date.now()
  if (now - lastNetworkNotice < 5000) return
  lastNetworkNotice = now
  Notify.create({
    type: 'negative',
    message: 'API kapalı. Proje kökünde npm run dev çalıştır (panel + backend).',
    timeout: 5000,
  })
}

export default defineBoot(({ app, router }) => {
  api.interceptors.request.use((config) => {
    const auth = useAuthStore()
    if (auth.accessToken) {
      config.headers.Authorization = `Bearer ${auth.accessToken}`
    }
    return config
  })

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (!error.response && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED')) {
        notifyApiDown()
      }
      if (error.response?.status === 403 && useAuthStore().isLoggedIn) {
        const raw = error.response.data?.message
        const message = Array.isArray(raw) ? raw[0] : raw
        if (message) {
          Notify.create({ type: 'warning', message })
        }
      }
      if (error.response?.status === 401 && !signingOut) {
        const auth = useAuthStore()
        if (auth.isLoggedIn) {
          signingOut = true
          try {
            await auth.signOut()
            const current = router.currentRoute.value
            if (current.name !== 'login') {
              Notify.create({ type: 'warning', message: 'Oturum sona erdi. Yeniden giriş yap.' })
              await router.replace({
                name: 'login',
                query: { redirect: current.fullPath },
              })
            }
          } finally {
            signingOut = false
          }
        }
      }
      return Promise.reject(error)
    },
  )

  app.config.globalProperties.$api = api
})

export { api }
