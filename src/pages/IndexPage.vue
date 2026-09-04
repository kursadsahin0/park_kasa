<template>
  <q-page class="page">
    <div class="page-head">
      <h1>Özet</h1>
      <div class="row items-center no-wrap q-gutter-sm">
        <q-select
          v-if="spotLots.length > 1"
          v-model="parkingLotId"
          outlined
          dense
          emit-value
          map-options
          :options="lotOptions"
          style="min-width: 160px"
        />
        <q-btn unelevated no-caps color="primary" to="/gun-sonu" label="Gün sonu" />
      </div>
    </div>

    <div v-if="error" class="text-negative q-mb-md">{{ error }}</div>

    <div v-if="!stats?.lots && !loading" class="notice">
      <span>İlk tesisi sihirbazla kur, örnek tarife seç, sonra günlükte ilk aracı içeri al.</span>
      <q-btn unelevated no-caps dense color="primary" to="/baslangic" label="Kuruluma başla" />
    </div>

    <template v-else>
      <div class="stat-grid">
        <div v-for="card in cards" :key="card.label" class="stat">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
        </div>
      </div>

      <SpotMap
        :spots="occupancy.spots"
        :empty-count="occupancy.emptyCount"
        :reserved-count="occupancy.reservedCount"
        :unassigned-inside="occupancy.unassignedInside"
      />
    </template>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '@/boot/axios'
import { money } from '@/utils/format'
import SpotMap from '@/components/SpotMap.vue'

const stats = ref(null)
const occupancy = ref({
  spots: [],
  emptyCount: 0,
  reservedCount: 0,
  unassignedInside: 0,
  lots: [],
})
const parkingLotId = ref(null)
const loading = ref(false)
const error = ref('')

const spotLots = computed(() => occupancy.value.lots || [])
const lotOptions = computed(() => spotLots.value.map((l) => ({ label: l.name, value: l.id })))

const cards = computed(() => {
  const s = stats.value || {}
  return [
    { label: 'İçeride', value: s.parkedNow ?? '—' },
    { label: 'Boş yer', value: occupancy.value.emptyCount ?? s.emptySpots ?? '—' },
    { label: 'Doluluk', value: s.totalSpots ? `%${s.occupancy}` : '—' },
    { label: 'Saatlik ciro', value: s.lots ? money(s.todayHourlyRevenue) : '—' },
    { label: 'Abone', value: s.activeSubscribers ?? '—' },
    { label: 'Süresi doldu', value: s.expiredCount ?? '—' },
    { label: 'Tahsilat', value: s.lots ? money(s.collectedThisPeriod) : '—' },
    { label: 'Ödemeyen', value: s.unpaidThisPeriod ?? '—' },
  ]
})

onMounted(async () => {
  loading.value = true
  try {
    const { data } = await api.get('/dashboard')
    stats.value = data
    await loadSpots()
  } catch {
    error.value = 'Özet yüklenemedi.'
  } finally {
    loading.value = false
  }
})

watch(parkingLotId, (id, prev) => {
  if (id && prev) loadSpots()
})

async function loadSpots() {
  const { data } = await api.get('/dashboard/spots', {
    params: { parkingLotId: parkingLotId.value || undefined },
  })
  occupancy.value = data
  if (!parkingLotId.value) parkingLotId.value = data.parkingLotId
}
</script>
