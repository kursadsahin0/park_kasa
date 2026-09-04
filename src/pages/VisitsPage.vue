<template>
  <q-page class="page">
    <div class="page-head">
      <h1>Günlük</h1>
    </div>

    <div v-if="!lots.length" class="notice">
      <span>Önce tesis ve saatlik tarife kaydet.</span>
      <q-btn flat no-caps dense color="primary" to="/tesis" label="Tesis" />
    </div>

    <div v-else class="toolbar">
      <q-select
        v-model="parkingLotId"
        outlined
        dense
        emit-value
        map-options
        label="Tesis"
        :options="lotOptions"
        style="max-width: 200px"
      />
      <q-input
        v-model="plate"
        outlined
        dense
        label="Plaka"
        class="plate"
        @blur="plate = formatPlate(plate)"
        @keyup.enter="checkIn"
      />
      <q-input v-model="fullName" outlined dense label="Ad" />
      <q-btn
        unelevated
        color="primary"
        no-caps
        label="Giriş"
        :loading="saving"
        :disable="!parkingLotId || !normalizePlate(plate) || alreadyInside"
        @click="checkIn"
      />
    </div>

    <SpotMap
      selectable
      :spots="occupancy.spots"
      :empty-count="occupancy.emptyCount"
      :reserved-count="occupancy.reservedCount"
      :unassigned-inside="occupancy.unassignedInside"
      :selected="spotCode"
      @select="onPickSpot"
    />

    <div class="section-label">
      <span>İçeride</span>
      <span>{{ openRows.length }}</span>
    </div>
    <q-table
      class="q-mb-lg"
      flat
      dense
      row-key="id"
      :rows="openRows"
      :columns="openColumns"
      :loading="loading"
      hide-pagination
    >
      <template #body-cell-plate="props">
        <q-td :props="props"><span class="plate">{{ props.row.plate }}</span></q-td>
      </template>
      <template #body-cell-duration="props">
        <q-td :props="props"><span class="plate">{{ liveDuration(props.row.startedAt) }}</span></q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <span v-if="props.row.isSubscriber" class="q-mr-sm text-grey-7" style="font-size: 12px">Abone</span>
          <q-btn unelevated dense no-caps color="primary" label="Çıkış" @click="openCheckout(props.row)" />
          <q-btn flat dense no-caps color="negative" label="İptal" @click="cancelVisit(props.row)" />
        </q-td>
      </template>
    </q-table>

    <div class="section-label">
      <span>Bugün çıkanlar</span>
      <span>{{ closedRows.length }}{{ closedTotal > 0 ? ` · ${money(closedTotal)}` : '' }}</span>
    </div>
    <q-table
      flat
      dense
      row-key="id"
      :rows="closedRows"
      :columns="closedColumns"
      :loading="loadingClosed"
      hide-pagination
      no-data-label="Bugün çıkış yok."
    >
      <template #body-cell-plate="props">
        <q-td :props="props"><span class="plate">{{ props.row.plate }}</span></q-td>
      </template>
      <template #body-cell-kind="props">
        <q-td :props="props">
          <span class="text-grey-7">{{ visitKind(props.row) }}</span>
        </q-td>
      </template>
      <template #body-cell-reprint="props">
        <q-td :props="props" class="text-right">
          <q-btn
            v-if="props.row.status === 'CLOSED'"
            flat
            dense
            no-caps
            color="primary"
            label="Fiş"
            @click="reprintVisit(props.row)"
          />
          <q-btn
            v-if="props.row.status === 'CLOSED'"
            flat
            dense
            no-caps
            color="primary"
            label="İndir"
            @click="downloadVisit(props.row)"
          />
          <q-btn
            v-if="props.row.status === 'CLOSED' && !props.row.isSubscriber"
            flat
            dense
            no-caps
            label="Düzelt"
            @click="adjustVisit(props.row)"
          />
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="checkoutOpen" persistent>
      <q-card style="min-width: 360px">
        <q-card-section style="font-size: 17px; font-weight: 600">
          {{ checkoutRow?.plate }} çıkış
        </q-card-section>
        <q-card-section>
          <p v-if="checkoutRow?.isSubscriber" class="q-mb-none">Abone kaydı. Ücret alınmayacak.</p>
          <template v-else>
            <p>Kalınan süre başlayan saate yuvarlanır. Tahmini ücret: {{ money(checkoutEstimate) }}</p>
            <q-select
              v-model="checkoutMethod"
              outlined
              dense
              emit-value
              map-options
              label="Ödeme yöntemi"
              :options="paymentOptions"
            />
            <q-toggle v-model="lostTicket" label="Kayıp bilet (sabit ücret)" />
          </template>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Vazgeç" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="primary"
            label="Çıkışı tamamla"
            :loading="checkingOut"
            :disable="!checkoutRow?.isSubscriber && !checkoutMethod"
            @click="confirmCheckout"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { dateTime, durationLabel, methodLabel, money } from '@/utils/format'
import { formatPlate, normalizePlate, platesEqual } from '@/utils/plate'
import { downloadReceipt, printReceipt } from '@/utils/print-receipt'
import SpotMap from '@/components/SpotMap.vue'

const $q = useQuasar()
const lots = ref([])
const occupancy = ref({
  spots: [],
  emptyCount: 0,
  reservedCount: 0,
  unassignedInside: 0,
})
const openRows = ref([])
const closedRows = ref([])
const loading = ref(false)
const loadingClosed = ref(false)
const saving = ref(false)
const parkingLotId = ref(null)
const plate = ref('')
const fullName = ref('')
const spotCode = ref(null)
const tick = ref(0)
const checkoutOpen = ref(false)
const checkoutRow = ref(null)
const checkoutMethod = ref('CASH')
const lostTicket = ref(false)
const checkingOut = ref(false)
let timer

const paymentOptions = [
  { label: 'Nakit', value: 'CASH' },
  { label: 'Kart', value: 'CARD' },
]

const lotOptions = computed(() => lots.value.map((l) => ({ label: l.name, value: l.id })))
const selectedLot = computed(() => lots.value.find((l) => l.id === parkingLotId.value))
const closedTotal = computed(() =>
  closedRows.value.reduce((sum, r) => sum + Number(r.totalPrice || 0), 0),
)
const alreadyInside = computed(() =>
  openRows.value.some((row) => platesEqual(row.plate, plate.value)),
)

const openColumns = [
  { name: 'spotCode', label: 'Yer', field: (r) => r.spotCode || '—', align: 'left' },
  { name: 'plate', label: 'Plaka', field: 'plate', align: 'left' },
  { name: 'fullName', label: 'Ad', field: 'fullName', align: 'left' },
  { name: 'startedAt', label: 'Giriş', field: (r) => dateTime(r.startedAt), align: 'left' },
  { name: 'duration', label: 'Süre', field: 'startedAt', align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right' },
]

const closedColumns = [
  { name: 'spotCode', label: 'Yer', field: (r) => r.spotCode || '—', align: 'left' },
  { name: 'plate', label: 'Plaka', field: 'plate', align: 'left' },
  { name: 'fullName', label: 'Ad', field: 'fullName', align: 'left' },
  { name: 'kind', label: 'Tür', field: 'isSubscriber', align: 'left' },
  { name: 'startedAt', label: 'Giriş', field: (r) => dateTime(r.startedAt), align: 'left' },
  { name: 'endedAt', label: 'Çıkış', field: (r) => (r.endedAt ? dateTime(r.endedAt) : '—'), align: 'left' },
  { name: 'hours', label: 'Saat', field: (r) => (r.isSubscriber ? '—' : `${r.billedHours} sa`), align: 'left' },
  { name: 'total', label: 'Ücret', field: (r) => (r.status === 'CANCELLED' ? '—' : r.isSubscriber ? 'Ücretsiz' : money(r.totalPrice)), align: 'left' },
  { name: 'method', label: 'Ödeme', field: (r) => (r.status === 'CANCELLED' || r.isSubscriber ? '—' : methodLabel(r.method)), align: 'left' },
  { name: 'reprint', label: '', field: 'id', align: 'right' },
]

function visitKind(row) {
  if (row.status === 'CANCELLED') return 'İptal'
  return row.isSubscriber ? 'Abone' : 'Günlük'
}

function liveDuration(startedAt) {
  return tick.value >= 0 ? durationLabel(startedAt) : ''
}

onMounted(async () => {
  const { data } = await api.get('/parking-lots/mine')
  lots.value = data
  parkingLotId.value = data[0]?.id || null
  timer = setInterval(() => {
    tick.value += 1
  }, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

watch(parkingLotId, (id) => {
  spotCode.value = null
  if (id) loadLists()
  else {
    openRows.value = []
    closedRows.value = []
    occupancy.value = { spots: [], emptyCount: 0, reservedCount: 0, unassignedInside: 0 }
  }
})

async function loadLists() {
  await Promise.all([loadOpen(), loadClosed(), loadSpots()])
}

async function loadSpots() {
  try {
    const { data } = await api.get('/dashboard/spots', {
      params: { parkingLotId: parkingLotId.value || undefined },
    })
    occupancy.value = data
  } catch {
    occupancy.value = {
      spots: [],
      emptyCount: 0,
      reservedCount: 0,
      unassignedInside: 0,
    }
  }
}

function onPickSpot(spot) {
  spotCode.value = spot?.code || null
}

async function loadOpen() {
  loading.value = true
  try {
    const { data } = await api.get('/visits/open', {
      params: { parkingLotId: parkingLotId.value || undefined },
    })
    openRows.value = data
  } finally {
    loading.value = false
  }
}

async function loadClosed() {
  loadingClosed.value = true
  try {
    const { data } = await api.get('/visits/closed', {
      params: { parkingLotId: parkingLotId.value || undefined },
    })
    closedRows.value = data
  } finally {
    loadingClosed.value = false
  }
}

async function checkIn() {
  const formatted = formatPlate(plate.value)
  if (!normalizePlate(formatted)) {
    $q.notify({ type: 'negative', message: 'Plaka gerekli.' })
    return
  }
  if (openRows.value.some((row) => platesEqual(row.plate, formatted))) {
    $q.notify({ type: 'negative', message: 'Bu plaka zaten içeride.' })
    return
  }
  saving.value = true
  try {
    const created = await api.post('/visits/check-in', {
      parkingLotId: parkingLotId.value,
      plate: formatted,
      fullName: fullName.value || undefined,
      spotCode: spotCode.value || undefined,
    })
    const yer = created.data.spotCode ? ` · yer ${created.data.spotCode}` : ''
    const msg = created.data.isSubscriber
      ? `${created.data.plate} abone — içeride, çıkışta ücret yok${yer}.`
      : `${created.data.plate} giriş yaptı${yer}.`
    $q.notify({ type: 'positive', message: msg })
    plate.value = ''
    fullName.value = ''
    spotCode.value = null
    await loadLists()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Giriş kaydedilemedi.' })
  } finally {
    saving.value = false
  }
}

function estimate(row) {
  const start = new Date(row.startedAt)
  const hours = Math.max(1, Math.ceil((Date.now() - start.getTime()) / 36e5))
  const rate = Number(selectedLot.value?.hourlyRate || row.parkingLot?.hourlyRate || 0)
  if (row.isSubscriber) return 0
  return hours * rate
}

const checkoutEstimate = computed(() => (checkoutRow.value ? estimate(checkoutRow.value) : 0))

function openCheckout(row) {
  checkoutRow.value = row
  checkoutMethod.value = 'CASH'
  lostTicket.value = false
  checkoutOpen.value = true
}

async function confirmCheckout() {
  const row = checkoutRow.value
  if (!row) return
  if (!row.isSubscriber && !checkoutMethod.value) {
    $q.notify({ type: 'warning', message: 'Ödeme yöntemi seçin.' })
    return
  }
  checkingOut.value = true
  try {
    const { data } = await api.post(`/visits/${row.id}/checkout`, {
      method: row.isSubscriber ? undefined : checkoutMethod.value,
      lostTicket: row.isSubscriber ? undefined : lostTicket.value,
    })
    checkoutOpen.value = false
    $q.notify({
      type: 'positive',
      message: data.isSubscriber
        ? 'Çıkış yapıldı (abone).'
        : `Çıkış: ${data.billedHours} saat · ${money(data.totalPrice)}`,
    })
    if (data.receipt) printReceipt(data.receipt)
    await loadLists()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Çıkış yapılamadı.' })
  } finally {
    checkingOut.value = false
  }
}

function cancelVisit(row) {
  $q.dialog({
    title: `${row.plate} iptal`,
    message: 'Bu giriş silinsin mi? Ücret alınmaz, yer boşalır.',
    prompt: { model: '', type: 'text', label: 'Neden (isteğe bağlı)' },
    cancel: { label: 'Vazgeç', flat: true },
    ok: { label: 'İptal et', color: 'negative' },
    persistent: true,
  }).onOk(async (reason) => {
    try {
      await api.post(`/visits/${row.id}/cancel`, { reason: reason || undefined })
      $q.notify({ type: 'positive', message: `${row.plate} iptal edildi.` })
      await loadLists()
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.message || 'İptal edilemedi.' })
    }
  })
}

async function reprintVisit(row) {
  try {
    const { data } = await api.get(`/visits/${row.id}/receipt`)
    printReceipt(data)
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Fiş alınamadı.' })
  }
}

async function downloadVisit(row) {
  try {
    const { data } = await api.get(`/visits/${row.id}/receipt`)
    downloadReceipt(data)
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Fiş alınamadı.' })
  }
}

function adjustVisit(row) {
  $q.dialog({
    title: `${row.plate} düzelt`,
    message: 'Yeni ücret (₺). Kasa kilidi açık olmalı.',
    prompt: { model: String(row.totalPrice ?? ''), type: 'number', label: 'Ücret' },
    cancel: { label: 'Vazgeç', flat: true },
    ok: { label: 'Kaydet', color: 'primary' },
    persistent: true,
  }).onOk(async (value) => {
    try {
      await api.patch(`/visits/${row.id}`, { totalPrice: Number(value), notes: 'Kasa düzeltme' })
      $q.notify({ type: 'positive', message: 'Çıkış düzeltildi.' })
      await loadLists()
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.message || 'Düzeltilemedi.' })
    }
  })
}
</script>
