<template>
  <q-page class="page" style="max-width: 860px">
    <div class="page-head">
      <h1>Tesis</h1>
      <q-btn unelevated color="primary" no-caps label="Yeni tesis" @click="startCreate" />
    </div>

    <div v-if="lots.length" class="toolbar">
      <q-select
        v-model="lotId"
        outlined
        dense
        emit-value
        map-options
        label="Tesis"
        :options="lotOptions"
        style="max-width: 280px"
      />
      <span class="text-grey-7" style="font-size: 13px">{{ lots.length }} tesis</span>
    </div>

    <div v-else class="notice q-mb-md">
      <span>Henüz tesis yok. Aşağıdan ilk tesisi oluştur.</span>
    </div>

    <q-form class="q-gutter-md" @submit="save">
      <q-input v-model="form.name" outlined dense label="Tesis adı" :rules="[(v) => !!v || 'Gerekli']" />
      <q-input v-model="form.address" outlined dense label="Adres" :rules="[(v) => !!v || 'Gerekli']" />
      <div class="row q-col-gutter-sm">
        <div class="col-6">
          <q-input v-model="form.city" outlined dense label="Şehir" :rules="[(v) => !!v || 'Gerekli']" />
        </div>
        <div class="col-6">
          <q-input v-model="form.district" outlined dense label="İlçe" />
        </div>
      </div>
      <q-input v-model.number="form.totalSpots" outlined dense type="number" label="Kapasite" />
      <q-input
        v-model="form.spotPrefix"
        outlined
        dense
        label="Yer öneki"
        hint="Boş bırakılırsa 1, 2, 3…  A- yazarsan A-1, A-2…"
      />
      <q-input v-model.number="form.hourlyRate" outlined dense type="number" label="Saatlik tarife (₺)" />
      <q-input v-model.number="form.monthlyRate" outlined dense type="number" label="Aylık abone tarife (₺)" />
      <q-input v-model="form.timeZone" outlined dense label="Saat dilimi" hint="Örn. Europe/Istanbul" />
      <div class="row q-col-gutter-sm">
        <div class="col-4">
          <q-input v-model.number="form.nightStartHour" outlined dense type="number" label="Gece başlangıç saati" />
        </div>
        <div class="col-4">
          <q-input v-model.number="form.nightEndHour" outlined dense type="number" label="Gece bitiş saati" />
        </div>
        <div class="col-4">
          <q-input v-model.number="form.nightHourlyRate" outlined dense type="number" label="Gece tarife (₺)" />
        </div>
      </div>
      <q-input v-model.number="form.freeMinutes" outlined dense type="number" label="Ücretsiz ilk dakika" />
      <q-input v-model.number="form.maxDailyCap" outlined dense type="number" label="Günlük tavan (₺)" />
      <q-input v-model.number="form.lostTicketFee" outlined dense type="number" label="Kayıp bilet ücreti (₺)" />
      <q-input v-model="form.notifyEmail" outlined dense type="email" label="Bildirim e-posta" hint="Abone/doluluk uyarıları panelde; e-posta adresi hatırlatma içindir" />
      <div class="row q-gutter-sm">
        <q-btn unelevated color="primary" no-caps type="submit" :label="lotId ? 'Kaydet' : 'Oluştur'" :loading="saving" />
        <q-btn v-if="lotId" outline no-caps color="negative" label="Tesisi sil" @click="removeLot" />
      </div>
    </q-form>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'

const $q = useQuasar()
const lots = ref([])
const lotId = ref(null)
const saving = ref(false)
const form = reactive(emptyForm())

const lotOptions = computed(() => lots.value.map((l) => ({ label: l.name, value: l.id })))

function emptyForm() {
  return {
    name: '',
    address: '',
    city: '',
    district: '',
    totalSpots: 50,
    spotPrefix: '',
    monthlyRate: 3500,
    hourlyRate: 50,
    timeZone: 'Europe/Istanbul',
    nightStartHour: 22,
    nightEndHour: 7,
    nightHourlyRate: null,
    maxDailyCap: null,
    freeMinutes: 0,
    lostTicketFee: 0,
    notifyEmail: '',
  }
}

function applyLot(lot) {
  if (!lot) {
    Object.assign(form, emptyForm())
    return
  }
  form.name = lot.name
  form.address = lot.address
  form.city = lot.city
  form.district = lot.district || ''
  form.totalSpots = lot.totalSpots
  form.spotPrefix = lot.spotPrefix || ''
  form.monthlyRate = Number(lot.monthlyRate)
  form.hourlyRate = Number(lot.hourlyRate || 50)
  form.timeZone = lot.timeZone || 'Europe/Istanbul'
  form.nightStartHour = lot.nightStartHour ?? 22
  form.nightEndHour = lot.nightEndHour ?? 7
  form.nightHourlyRate = lot.nightHourlyRate != null ? Number(lot.nightHourlyRate) : null
  form.maxDailyCap = lot.maxDailyCap != null ? Number(lot.maxDailyCap) : null
  form.freeMinutes = lot.freeMinutes ?? 0
  form.lostTicketFee = Number(lot.lostTicketFee || 0)
  form.notifyEmail = lot.notifyEmail || ''
}

async function loadLots(selectId) {
  try {
    const { data } = await api.get('/parking-lots/mine')
    lots.value = data
    lotId.value = selectId || data[0]?.id || null
    applyLot(data.find((l) => l.id === lotId.value) || null)
  } catch (err) {
    lots.value = []
    lotId.value = null
    applyLot(null)
    $q.notify({
      type: 'negative',
      message:
        err.code === 'ERR_NETWORK' || !err.response
          ? 'API çalışmıyor (localhost:3000). Backend’i başlat.'
          : err.response?.data?.message || 'Tesisler yüklenemedi.',
    })
  }
}

onMounted(() => loadLots())

watch(lotId, (id) => {
  applyLot(lots.value.find((l) => l.id === id) || null)
})

function numOrUndef(value) {
  if (value === '' || value == null || Number.isNaN(Number(value))) return undefined
  return Number(value)
}

function payload() {
  return {
    ...form,
    nightHourlyRate: numOrUndef(form.nightHourlyRate),
    maxDailyCap: numOrUndef(form.maxDailyCap),
    notifyEmail: form.notifyEmail || undefined,
  }
}

function startCreate() {
  lotId.value = null
  applyLot(null)
}

async function save() {
  saving.value = true
  try {
    if (lotId.value) {
      const { data } = await api.patch(`/parking-lots/${lotId.value}`, payload())
      lots.value = lots.value.map((l) => (l.id === data.id ? { ...l, ...data } : l))
      $q.notify({ type: 'positive', message: 'Tesis güncellendi.' })
    } else {
      const { data } = await api.post('/parking-lots', payload())
      await loadLots(data.id)
      $q.notify({ type: 'positive', message: 'Tesis oluşturuldu.' })
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Kaydedilemedi.' })
  } finally {
    saving.value = false
  }
}

async function removeLot() {
  $q.dialog({
    title: 'Tesisi sil',
    message: 'Bu tesis ve bağlı kayıtlar silinir. İçeride araç olmamalı.',
    cancel: true,
    ok: { label: 'Sil', color: 'negative' },
  }).onOk(async () => {
    try {
      await api.delete(`/parking-lots/${lotId.value}`)
      $q.notify({ type: 'positive', message: 'Tesis silindi.' })
      await loadLots()
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.message || 'Silinemedi.' })
    }
  })
}
</script>
