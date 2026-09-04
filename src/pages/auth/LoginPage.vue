<template>
  <div>
    <h1>Giriş</h1>
    <p class="lead">Web paneli. {{ PRODUCT_PITCH }}</p>

    <div v-if="demoHint" class="notice q-mb-md">
      <span>Demo: {{ demoHint }}</span>
    </div>

    <div v-if="!auth.configured" class="notice q-mb-md">
      Bağlantı ayarları eksik. Yöneticiye danış.
    </div>

    <q-form class="q-gutter-md" @submit="submit">
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
        :type="showPass ? 'text' : 'password'"
        label="Şifre"
        :disable="!auth.configured"
        :rules="[(v) => (v && v.length >= 6) || 'En az 6 karakter']"
      >
        <template #append>
          <q-icon
            :name="showPass ? 'visibility_off' : 'visibility'"
            class="cursor-pointer"
            @click="showPass = !showPass"
          />
        </template>
      </q-input>
      <q-btn
        unelevated
        color="primary"
        no-caps
        class="full-width"
        type="submit"
        label="Giriş yap"
        :loading="loading"
        :disable="!auth.configured"
      />
    </q-form>

    <div class="q-mt-lg text-grey-7" style="font-size: 13px">
      Hesabın yok mu?
      <router-link to="/kayit">Kayıt ol</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/boot/axios'
import { PRODUCT_PITCH } from '@/brand'

const demoHint = import.meta.env.VITE_DEMO_EMAIL
  ? `Demo e-posta: ${import.meta.env.VITE_DEMO_EMAIL}`
  : ''

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const email = ref('')
const password = ref('')
const showPass = ref(false)
const loading = ref(false)

async function submit() {
  loading.value = true
  try {
    await auth.signIn(email.value, password.value)
    try {
      const { data } = await api.get('/users/me')
      auth.setProfile(data)
    } catch {
      auth.setProfile(null)
    }
    router.push(route.query.redirect || '/')
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message || 'Giriş başarısız.' })
  } finally {
    loading.value = false
  }
}
</script>
