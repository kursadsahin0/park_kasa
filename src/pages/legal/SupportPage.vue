<template>
  <article class="legal-doc">
    <h1>Destek</h1>
    <p class="lead">Hata, silme talebi veya genel soru. Yanıt {{ SUPPORT_EMAIL }} üzerinden gider.</p>
    <q-form class="q-gutter-md" style="max-width: 480px" @submit="send">
      <q-input v-model="email" outlined dense type="email" label="E-posta" :rules="[(v) => !!v || 'Gerekli']" />
      <q-select
        v-model="kind"
        outlined
        dense
        emit-value
        map-options
        label="Konu"
        :options="[
          { label: 'Hata', value: 'BUG' },
          { label: 'Veri silme (KVKK)', value: 'DATA_DELETION' },
          { label: 'Diğer', value: 'OTHER' },
        ]"
      />
      <q-input v-model="message" outlined dense type="textarea" autogrow label="Mesaj" :rules="[(v) => !!v || 'Gerekli']" />
      <q-btn unelevated color="primary" no-caps type="submit" label="Gönder" :loading="loading" />
    </q-form>
  </article>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { SUPPORT_EMAIL } from '@/brand'
import { useAuthStore } from '@/stores/auth'

const $q = useQuasar()
const auth = useAuthStore()
const email = ref(auth.user?.email || '')
const kind = ref('BUG')
const message = ref('')
const loading = ref(false)

async function send() {
  loading.value = true
  try {
    await api.post('/support', { email: email.value, kind: kind.value, message: message.value })
    $q.notify({ type: 'positive', message: 'İletildi.' })
    message.value = ''
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Gönderilemedi.' })
  } finally {
    loading.value = false
  }
}
</script>
