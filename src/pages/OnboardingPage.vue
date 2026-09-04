<template>
  <q-page class="page" style="max-width: 640px">
    <div class="page-head">
      <h1>Kurulum</h1>
    </div>

    <div v-if="locked" class="notice q-mb-md">
      <span>Tesis zaten kayıtlı. Bu sihirbaz yalnızca ilk kurulum içindir. Değişiklik için Tesis sayfasını kullan.</span>
      <q-btn unelevated no-caps dense color="primary" to="/tesis" label="Tesis" />
    </div>

    <p v-else class="text-grey-7 q-mb-md">Örnek tarifeyi seç, adı yaz, sonra ilk aracı günlük ekrandan içeri al.</p>
    <div class="row q-col-gutter-sm q-mb-md">
      <div v-for="p in presets" :key="p.id" class="col-12 col-sm-4">
        <q-btn
          outline
          no-caps
          class="full-width"
          :disable="locked"
          :color="preset.id === p.id ? 'primary' : 'grey'"
          :label="p.label"
          @click="apply(p)"
        />
      </div>
    </div>
    <q-form class="q-gutter-md" @submit="save">
      <q-input v-model="form.name" outlined dense label="Tesis adı" :disable="locked" :rules="locked ? [] : [(v) => !!v || 'Gerekli']" />
      <q-input v-model="form.city" outlined dense label="Şehir" :disable="locked" :rules="locked ? [] : [(v) => !!v || 'Gerekli']" />
      <q-input v-model="form.address" outlined dense label="Adres" :disable="locked" :rules="locked ? [] : [(v) => !!v || 'Gerekli']" />
      <q-input v-model.number="form.totalSpots" outlined dense type="number" label="Kapasite" :disable="locked" />
      <q-input v-model.number="form.hourlyRate" outlined dense type="number" label="Saatlik (₺)" :disable="locked" />
      <q-input v-model.number="form.monthlyRate" outlined dense type="number" label="Aylık abone (₺)" :disable="locked" />
      <q-btn unelevated color="primary" no-caps type="submit" label="Tesis oluştur" :disable="locked" :loading="saving" />
    </q-form>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'

const $q = useQuasar()
const router = useRouter()
const saving = ref(false)
const lots = ref([])
const locked = computed(() => lots.value.length > 0)
const presets = [
  { id: 'kucuk', label: 'Küçük · 30 yer · 40₺', totalSpots: 30, hourlyRate: 40, monthlyRate: 2500 },
  { id: 'orta', label: 'Orta · 80 yer · 50₺', totalSpots: 80, hourlyRate: 50, monthlyRate: 3500 },
  { id: 'buyuk', label: 'Büyük · 150 yer · 60₺', totalSpots: 150, hourlyRate: 60, monthlyRate: 4500 },
]
const preset = ref(presets[1])
const form = reactive({
  name: '',
  city: 'İstanbul',
  address: '',
  district: '',
  totalSpots: 80,
  hourlyRate: 50,
  monthlyRate: 3500,
  timeZone: 'Europe/Istanbul',
})

onMounted(async () => {
  const { data } = await api.get('/parking-lots/mine')
  lots.value = data
  if (data.length) {
    $q.notify({ type: 'warning', message: 'Tesis zaten var. Kurulum sihirbazı kilitli.' })
  }
})

function apply(p) {
  if (locked.value) return
  preset.value = p
  form.totalSpots = p.totalSpots
  form.hourlyRate = p.hourlyRate
  form.monthlyRate = p.monthlyRate
}

async function save() {
  if (locked.value) {
    $q.notify({ type: 'warning', message: 'Tesis zaten var. Yeni tesis Tesis sayfasından eklenir.' })
    return
  }
  saving.value = true
  try {
    await api.post('/parking-lots', { ...form })
    await api.post('/users/me/onboarding')
    $q.notify({ type: 'positive', message: 'Tesis hazır. İlk plakayı günlük ekrana yaz.' })
    router.push('/gunluk')
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Oluşturulamadı.' })
  } finally {
    saving.value = false
  }
}
</script>
