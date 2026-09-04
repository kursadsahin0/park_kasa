<template>
  <q-page class="page">
    <div class="page-head">
      <h1>Rapor</h1>
      <q-btn unelevated no-caps color="primary" label="CSV" :disable="!report" @click="exportCsv" />
    </div>
    <div class="toolbar">
      <q-input v-model="from" outlined dense type="date" label="Başlangıç" style="max-width: 170px" />
      <q-input v-model="to" outlined dense type="date" label="Bitiş" style="max-width: 170px" />
      <q-select
        v-model="parkingLotId"
        outlined
        dense
        clearable
        emit-value
        map-options
        label="Tesis"
        :options="lotOptions"
        style="max-width: 220px"
      />
    </div>
    <div v-if="error" class="text-negative q-mb-md">{{ error }}</div>
    <div class="stat-grid">
      <div v-for="card in cards" :key="card.label" class="stat">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
      </div>
    </div>
    <q-table
      flat
      dense
      row-key="id"
      :rows="visits"
      :columns="columns"
      :loading="loading"
      hide-pagination
      :pagination="{ rowsPerPage: 0 }"
      no-data-label="Bu aralıkta çıkış yok."
    />
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '@/boot/axios'
import { dateTime, money, todayIso } from '@/utils/format'
import { downloadCsv } from '@/utils/csv'

const from = ref(todayIso())
const to = ref(todayIso())
const parkingLotId = ref(null)
const lots = ref([])
const report = ref(null)
const loading = ref(false)
const error = ref('')

const lotOptions = computed(() => lots.value.map((l) => ({ label: l.name, value: l.id })))
const visits = computed(() => report.value?.visits || [])
const cards = computed(() => {
  const s = report.value?.summary || {}
  return [
    { label: 'Çıkan', value: s.checkoutCount ?? 0 },
    { label: 'Saatlik', value: money(s.hourlyRevenue) },
    { label: 'Abone', value: money(s.subscriberRevenue) },
    { label: 'Düzeltme', value: money(s.adjustmentTotal) },
    { label: 'Toplam', value: money(s.totalRevenue) },
  ]
})
const columns = [
  { name: 'plate', label: 'Plaka', field: 'plate', align: 'left' },
  { name: 'lot', label: 'Tesis', field: (r) => r.parkingLot?.name, align: 'left' },
  { name: 'endedAt', label: 'Çıkış', field: (r) => (r.endedAt ? dateTime(r.endedAt) : '—'), align: 'left' },
  { name: 'total', label: 'Ücret', field: (r) => (r.isSubscriber ? 'Ücretsiz' : money(r.totalPrice)), align: 'right' },
]

onMounted(async () => {
  const { data } = await api.get('/parking-lots/mine')
  lots.value = data
  await load()
})
watch([from, to, parkingLotId], load)

async function load() {
  if (!from.value || !to.value) return
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/dashboard/report', {
      params: { from: from.value, to: to.value, parkingLotId: parkingLotId.value || undefined },
    })
    report.value = data
  } catch (err) {
    report.value = null
    error.value = err.response?.data?.message || 'Rapor yüklenemedi.'
  } finally {
    loading.value = false
  }
}

function exportCsv() {
  downloadCsv(
    `parkkasa-rapor-${from.value}-${to.value}.csv`,
    ['Plaka', 'Tesis', 'Çıkış', 'Ücret'],
    visits.value.map((r) => [
      r.plate,
      r.parkingLot?.name,
      r.endedAt || '',
      r.isSubscriber ? 0 : r.totalPrice,
    ]),
  )
}
</script>
