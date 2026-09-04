<template>
  <q-layout view="hHh LpR lFf">
    <q-header>
      <q-toolbar class="q-px-md" style="min-height: 52px">
        <q-btn flat dense round icon="menu" class="lt-md" @click="drawer = !drawer" />
        <router-link to="/" class="brand q-ml-sm brand--light">
          <img class="brand-logo" src="@/assets/logo.png" width="28" height="28" :alt="PRODUCT_NAME" />
          {{ PRODUCT_NAME }}
        </router-link>
        <q-space />
        <q-btn-dropdown flat no-caps>
          <template #label>
            <q-icon name="notifications" />
            <q-badge v-if="alerts.length" color="accent" floating>{{ alerts.length }}</q-badge>
          </template>
          <q-list style="min-width: 280px">
            <q-item v-if="!alerts.length">
              <q-item-section class="text-grey-7">Bildirim yok</q-item-section>
            </q-item>
            <q-item v-for="(item, i) in alerts" :key="i">
              <q-item-section>
                <q-item-label>{{ item.title }}</q-item-label>
                <q-item-label caption>{{ item.body }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
        <q-btn-dropdown flat no-caps>
          <template #label>
            <div class="user-chip">
              <span class="user-avatar">{{ initials }}</span>
              <span class="gt-xs">{{ auth.displayName }}</span>
            </div>
          </template>
          <q-list>
            <q-item clickable v-close-popup to="/profil">
              <q-item-section>Profil</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="logout">
              <q-item-section>Çıkış</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" show-if-above :width="228">
      <q-list class="q-pt-sm">
        <q-item class="rail-item" clickable v-ripple="false" to="/" exact>
          <q-item-section avatar><q-icon name="space_dashboard" /></q-item-section>
          <q-item-section>Özet</q-item-section>
        </q-item>
        <q-item class="rail-item" clickable v-ripple="false" to="/gunluk">
          <q-item-section avatar><q-icon name="directions_car" /></q-item-section>
          <q-item-section>Günlük</q-item-section>
        </q-item>
        <q-item class="rail-item" clickable v-ripple="false" to="/gun-sonu">
          <q-item-section avatar><q-icon name="receipt_long" /></q-item-section>
          <q-item-section>Gün sonu</q-item-section>
        </q-item>
        <q-item class="rail-item" clickable v-ripple="false" to="/aboneler">
          <q-item-section avatar><q-icon name="badge" /></q-item-section>
          <q-item-section>Aboneler</q-item-section>
        </q-item>
        <q-item class="rail-item" clickable v-ripple="false" to="/rezervasyon">
          <q-item-section avatar><q-icon name="event" /></q-item-section>
          <q-item-section>Rezervasyon</q-item-section>
        </q-item>
        <q-item class="rail-item" clickable v-ripple="false" to="/rapor">
          <q-item-section avatar><q-icon name="assessment" /></q-item-section>
          <q-item-section>Rapor</q-item-section>
        </q-item>
        <q-item class="rail-item" clickable v-ripple="false" to="/gecmis">
          <q-item-section avatar><q-icon name="history" /></q-item-section>
          <q-item-section>Plaka geçmişi</q-item-section>
        </q-item>
        <q-item class="rail-item" clickable v-ripple="false" to="/tesis">
          <q-item-section avatar><q-icon name="apartment" /></q-item-section>
          <q-item-section>Tesis</q-item-section>
        </q-item>
        <q-item class="rail-item" clickable v-ripple="false" to="/baslangic">
          <q-item-section avatar><q-icon name="flag" /></q-item-section>
          <q-item-section>Kurulum</q-item-section>
        </q-item>
      </q-list>
      <div class="drawer-legal">
        <div>{{ PRODUCT_NAME }} v{{ VERSION }}</div>
        <router-link to="/kvkk">KVKK</router-link>
        ·
        <router-link to="/destek">Destek</router-link>
        ·
        <router-link to="/surum">Sürüm</router-link>
      </div>
    </q-drawer>

    <q-page-container>
      <div v-if="licenseExpired" class="notice" style="margin: 12px 20px 0">
        <span>Lisans süresi doldu. Çıkış ve yedek alınır; yeni giriş alınmaz.</span>
        <q-btn flat no-caps dense color="primary" to="/profil" label="Lisans" />
      </div>
      <router-view />
    </q-page-container>
    <CookieBanner />
  </q-layout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/boot/axios'
import { PRODUCT_NAME, VERSION } from '@/brand'
import CookieBanner from '@/components/CookieBanner.vue'

const auth = useAuthStore()
const router = useRouter()
const drawer = ref(false)
const alerts = ref([])

onMounted(async () => {
  try {
    const { data } = await api.get('/users/me')
    auth.setProfile(data)
  } catch {
    /* oturum interceptor */
  }
  try {
    const { data } = await api.get('/dashboard/alerts')
    alerts.value = data
  } catch {
    alerts.value = []
  }
})

const licenseExpired = computed(() => Boolean(auth.profile?.license?.expired))

const initials = computed(() => {
  const name = String(auth.displayName || 'O').trim()
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
})

async function logout() {
  await auth.signOut()
  router.push('/giris')
}
</script>
