<template>
  <q-page class="page" style="max-width: 520px">
    <div class="page-head">
      <h1>Profil</h1>
    </div>
    <q-form class="q-gutter-md q-mb-lg" @submit="save">
      <q-input :model-value="auth.user?.email" outlined dense label="E-posta" disable />
      <q-input v-model="fullName" outlined dense label="Ad soyad" />
      <q-input v-model="phone" outlined dense label="Telefon" />
      <q-btn unelevated color="primary" no-caps type="submit" label="Kaydet" :loading="saving" />
    </q-form>

    <div class="section-label"><span>Lisans</span></div>
    <p class="text-grey-7">
      {{ licenseLabel }}
    </p>
    <q-input v-model="licenseKey" outlined dense label="Lisans anahtarı" class="q-mb-sm" />
    <q-btn outline no-caps color="primary" label="Anahtarı etkinleştir" :loading="licensing" @click="activate" />

    <div class="section-label q-mt-lg"><span>Yedek ve KVKK</span></div>
    <div class="row q-gutter-sm">
      <q-btn outline no-caps color="primary" label="JSON yedek indir" :loading="exporting" @click="downloadBackup" />
      <q-btn outline no-caps color="negative" label="Veri silme talebi" @click="askDelete" />
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/boot/axios'

const auth = useAuthStore()
const $q = useQuasar()
const fullName = ref('')
const phone = ref('')
const saving = ref(false)
const licensing = ref(false)
const exporting = ref(false)
const licenseKey = ref('')
const me = ref(null)

const licenseLabel = computed(() => {
  const lic = me.value?.license
  if (!lic) return 'Yükleniyor…'
  const exp = lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString('tr-TR') : 'süresiz'
  const state = lic.expired ? 'doldu' : 'açık'
  return `${lic.plan} · ${lic.lotCount}/${lic.maxLots} tesis · bitiş ${exp} (${state})`
})

onMounted(async () => {
  const { data } = await api.get('/users/me')
  me.value = data
  auth.setProfile(data)
  fullName.value = data.fullName || ''
  phone.value = data.phone || ''
})

async function save() {
  saving.value = true
  try {
    const { data } = await api.patch('/users/me', { fullName: fullName.value, phone: phone.value })
    auth.setProfile({ ...me.value, ...data })
    $q.notify({ type: 'positive', message: 'Profil güncellendi.' })
  } finally {
    saving.value = false
  }
}

async function activate() {
  licensing.value = true
  try {
    await api.post('/users/me/license', { key: licenseKey.value })
    const { data } = await api.get('/users/me')
    me.value = data
    auth.setProfile(data)
    $q.notify({ type: 'positive', message: 'Lisans işlendi.' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Anahtar geçersiz.' })
  } finally {
    licensing.value = false
  }
}

function downloadBackup() {
  $q.dialog({
    title: 'JSON yedek',
    message: 'Plaka, isim, telefon ve kasa kayıtları bu dosyaya yazılır. İndirmeyi onaylıyor musun?',
    cancel: true,
    ok: { label: 'İndir', color: 'primary' },
  }).onOk(async () => {
    exporting.value = true
    try {
      const { data } = await api.post('/users/me/export', { confirm: true })
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `parkkasa-yedek-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      exporting.value = false
    }
  })
}

function askDelete() {
  $q.dialog({
    title: 'Veri silme',
    message: 'KVKK silme talebi destek kuyruğuna düşer. Mali kayıtlar yasal süre kadar tutulabilir.',
    cancel: true,
    ok: { label: 'Talep et', color: 'negative' },
  }).onOk(async () => {
    await api.post('/support', {
      email: auth.user?.email,
      kind: 'DATA_DELETION',
      message: 'Hesap ve otopark verilerinin silinmesini talep ediyorum.',
    })
    $q.notify({ type: 'positive', message: 'Talep alındı.' })
  })
}
</script>
