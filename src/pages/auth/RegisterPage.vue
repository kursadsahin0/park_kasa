<template>
  <div>
    <h1>Kayıt</h1>
    <p class="lead">Web paneli. Kullanım lisans anahtarı ile açılır.</p>
    <p class="text-grey-7" style="font-size: 13px">
      <router-link to="/fiyat">Fiyat</router-link> · Kayıt KVKK metnini kabul sayılır.
    </p>

    <div v-if="!auth.configured" class="notice q-mb-md">Bağlantı ayarları eksik.</div>

    <q-form class="q-gutter-md" @submit="submit">
      <q-input
        v-model="fullName"
        outlined
        dense
        label="Ad soyad"
        :disable="!auth.configured"
        :rules="[(v) => !!v || 'Gerekli']"
      />
      <q-input
        v-model="email"
        outlined
        dense
        type="email"
        label="E-posta"
        :disable="!auth.configured"
        :rules="[(v) => !!v || 'Gerekli']"
      />
      <q-input
        v-model="password"
        outlined
        dense
        type="password"
        label="Şifre"
        :disable="!auth.configured"
        :rules="[(v) => (v && v.length >= 8) || 'En az 8 karakter']"
      />
      <q-input
        v-model="password2"
        outlined
        dense
        type="password"
        label="Şifre tekrar"
        :disable="!auth.configured"
        :rules="[(v) => v === password || 'Şifreler aynı olmalı']"
      />
      <q-input
        v-model="licenseKey"
        outlined
        dense
        label="Lisans anahtarı"
        hint="Bu e-postaya kesilmiş anahtar"
        :disable="!auth.configured"
        :rules="[(v) => !!v || 'Gerekli']"
      />
      <q-btn
        unelevated
        color="primary"
        no-caps
        class="full-width"
        type="submit"
        label="Hesap oluştur"
        :loading="loading"
        :disable="!auth.configured"
      />
    </q-form>

    <div class="q-mt-lg text-grey-7" style="font-size: 13px">
      Zaten hesabın var mı?
      <router-link to="/giris">Giriş yap</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/boot/axios'

const auth = useAuthStore()
const router = useRouter()
const $q = useQuasar()
const fullName = ref('')
const email = ref('')
const password = ref('')
const password2 = ref('')
const licenseKey = ref('')
const loading = ref(false)

async function submit() {
  loading.value = true
  try {
    await api.post('/licenses/preview', { email: email.value, key: licenseKey.value })
    await auth.signUp(email.value, password.value, fullName.value, licenseKey.value)
    if (auth.isLoggedIn) {
      try {
        const { data } = await api.get('/users/me')
        auth.setProfile(data)
      } catch {
        auth.setProfile(null)
      }
      router.push('/')
    } else {
      router.push('/giris')
    }
  } catch (err) {
    const raw = err.response?.data?.message
    const message = Array.isArray(raw) ? raw[0] : raw
    $q.notify({ type: 'negative', message: message || err.message || 'Kayıt başarısız.' })
  } finally {
    loading.value = false
  }
}
</script>
