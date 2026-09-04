<template>
  <q-page class="page">
    <div class="page-head no-print">
      <h1>Gün sonu</h1>
      <div class="row q-gutter-sm">
        <q-btn
          v-if="report?.closed"
          outline
          no-caps
          color="negative"
          label="Kasa kilidini aç"
          :loading="closing"
          @click="reopenDay"
        />
        <q-btn
          v-else
          unelevated
          no-caps
          color="primary"
          label="Günü kapat"
          :disable="!report"
          :loading="closing"
          @click="closeDay"
        />
        <q-btn unelevated no-caps color="primary" label="Yazdır" :disable="!report" @click="printReport" />
        <q-btn outline no-caps color="primary" label="CSV" :disable="!report" @click="exportCsv" />
        <q-btn outline no-caps color="primary" label="Kasa düzelt" :disable="!parkingLotId" @click="cashOpen = true" />
      </div>
    </div>

    <div class="toolbar no-print">
      <q-input v-model="date" outlined dense type="date" label="Tarih" style="max-width: 180px" />
      <q-select
        v-model="parkingLotId"
        outlined
        dense
        clearable
        emit-value
        map-options
        label="Tesis"
        :options="lotOptions"
        style="max-width: 240px"
      />
    </div>

    <div v-if="error" class="text-negative q-mb-md no-print">{{ error }}</div>
    <div v-if="report?.closed" class="notice q-mb-md no-print">
      <span>Bu gün kapatıldı. Yeni giriş, çıkış ve tahsilat alınmaz.{{ closeHint }}</span>
    </div>
    <div v-else-if="partialClose" class="notice q-mb-md no-print">
      <span>Bazı tesisler kapatıldı: {{ partialClose }}</span>
    </div>

    <div class="print-heading q-mb-md">
      <div style="font-size: 18px; font-weight: 600">Gün sonu</div>
      <div class="text-grey-7">{{ calendarDate(report?.date || date) }} · {{ lotLabel }}</div>
    </div>

    <div class="stat-grid">
      <div v-for="card in cards" :key="card.label" class="stat">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
      </div>
    </div>
    <div v-if="report" class="section-label q-mb-md" style="margin-top: -16px">
      <span>Nakit {{ money(summary.byMethod?.CASH) }} · Kart {{ money(summary.byMethod?.CARD) }}</span>
    </div>

    <div class="section-label">
      <span>Çıkan araçlar</span>
      <span>{{ visits.length }}</span>
    </div>
    <q-table
      class="q-mb-lg"
      flat
      dense
      row-key="id"
      :rows="visits"
      :columns="visitColumns"
      :loading="loading"
      :pagination="visitPagination"
      hide-pagination
      no-data-label="Bu günde çıkış yok."
    >
      <template #body-cell-plate="props">
        <q-td :props="props"><span class="plate">{{ props.row.plate }}</span></q-td>
      </template>
      <template #body-cell-kind="props">
        <q-td :props="props">
          <span class="text-grey-7">{{ props.row.isSubscriber ? 'Abone' : 'Günlük' }}</span>
        </q-td>
      </template>
      <template #body-cell-reprint="props">
        <q-td :props="props" class="text-right">
          <q-btn
            flat
            dense
            no-caps
            color="primary"
            label="Fiş"
            @click="reprintVisit(props.row)"
          />
        </q-td>
      </template>
    </q-table>

    <div class="section-label">
      <span>Abone tahsilat</span>
      <span>{{ payments.length }}</span>
    </div>
    <q-table
      flat
      dense
      row-key="id"
      :rows="payments"
      :columns="paymentColumns"
      :loading="loading"
      :pagination="paymentPagination"
      hide-pagination
      no-data-label="Bu günde abone ödemesi yok."
    >
      <template #body-cell-plate="props">
        <q-td :props="props"><span class="plate">{{ props.row.subscriber?.plate }}</span></q-td>
      </template>
      <template #body-cell-reprint="props">
        <q-td :props="props" class="text-right">
          <q-btn flat dense no-caps color="primary" label="Fiş" @click="reprintPayment(props.row)" />
        </q-td>
      </template>
    </q-table>

    <div class="section-label">
      <span>Kasa düzeltme</span>
      <span>{{ adjustments.length }}</span>
    </div>
    <q-table
      class="q-mb-lg"
      flat
      dense
      row-key="id"
      :rows="adjustments"
      :columns="adjustColumns"
      :loading="loading"
      hide-pagination
      :pagination="{ rowsPerPage: 0 }"
      no-data-label="Bu günde kasa düzeltmesi yok."
    />

    <q-dialog v-model="cashOpen" persistent>
      <q-card style="min-width: 360px">
        <q-card-section style="font-weight: 600">Kasa düzeltme</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model.number="cash.amount" outlined dense type="number" label="Tutar (₺, eksi olabilir)" />
          <q-select
            v-model="cash.method"
            outlined
            dense
            emit-value
            map-options
            label="Yöntem"
            :options="[
              { label: 'Nakit', value: 'CASH' },
              { label: 'Kart', value: 'CARD' },
            ]"
          />
          <q-input v-model="cash.reason" outlined dense label="Gerekçe" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Vazgeç" v-close-popup />
          <q-btn unelevated no-caps color="primary" label="Kaydet" :loading="cashing" @click="saveCash" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { calendarDate, dateTime, methodLabel, money, todayIso } from '@/utils/format'
import { printReceipt } from '@/utils/print-receipt'
import { downloadCsv } from '@/utils/csv'

const $q = useQuasar()
const date = ref(todayIso())
const parkingLotId = ref(null)
const lots = ref([])
const report = ref(null)
const loading = ref(false)
const closing = ref(false)
const cashOpen = ref(false)
const cashing = ref(false)
const cash = reactive({ amount: 0, method: 'CASH', reason: '' })
const error = ref('')
const visitPagination = { rowsPerPage: 0 }
const paymentPagination = { rowsPerPage: 0 }

const lotOptions = computed(() => lots.value.map((l) => ({ label: l.name, value: l.id })))
const visits = computed(() => report.value?.visits || [])
const payments = computed(() => report.value?.payments || [])
const adjustments = computed(() => report.value?.adjustments || [])
const summary = computed(() => report.value?.summary || {})

const lotLabel = computed(() => {
  if (!parkingLotId.value) return 'Tüm tesisler'
  return lots.value.find((l) => l.id === parkingLotId.value)?.name || 'Tesis'
})

const closeHint = computed(() => {
  const first = report.value?.closes?.[0]
  if (!first) return ''
  const who = first.closedBy?.fullName || first.closedBy?.email || ''
  return who ? ` · ${who}` : ''
})

const partialClose = computed(() => {
  if (!report.value || report.value.closed) return ''
  const names = (report.value.closes || []).map((c) => c.parkingLot?.name).filter(Boolean)
  return names.join(', ')
})

const cards = computed(() => {
  const s = summary.value
  const items = [
    { label: 'Çıkan', value: s.checkoutCount ?? 0 },
    { label: 'Saatlik', value: money(s.hourlyRevenue) },
    { label: 'Abone', value: money(s.subscriberRevenue) },
    { label: 'Düzeltme', value: money(s.adjustmentTotal) },
    { label: 'Kasa', value: money(s.totalRevenue) },
  ]
  if (s.stillInside != null) {
    items.push({ label: 'İçeride', value: s.stillInside })
  }
  return items
})

const visitColumns = [
  { name: 'plate', label: 'Plaka', field: 'plate', align: 'left' },
  { name: 'fullName', label: 'Ad', field: 'fullName', align: 'left' },
  { name: 'kind', label: 'Tür', field: 'isSubscriber', align: 'left' },
  { name: 'lot', label: 'Tesis', field: (r) => r.parkingLot?.name, align: 'left' },
  { name: 'startedAt', label: 'Giriş', field: (r) => dateTime(r.startedAt), align: 'left' },
  { name: 'endedAt', label: 'Çıkış', field: (r) => (r.endedAt ? dateTime(r.endedAt) : '—'), align: 'left' },
  { name: 'hours', label: 'Saat', field: (r) => (r.isSubscriber ? '—' : `${r.billedHours} sa`), align: 'left' },
  { name: 'total', label: 'Ücret', field: (r) => (r.isSubscriber ? 'Ücretsiz' : money(r.totalPrice)), align: 'right' },
  { name: 'method', label: 'Ödeme', field: (r) => (r.isSubscriber ? '—' : methodLabel(r.method)), align: 'left' },
  { name: 'reprint', label: '', field: 'id', align: 'right' },
]

const paymentColumns = [
  { name: 'plate', label: 'Plaka', field: (r) => r.subscriber?.plate, align: 'left' },
  { name: 'fullName', label: 'Ad', field: (r) => r.subscriber?.fullName, align: 'left' },
  { name: 'lot', label: 'Tesis', field: (r) => r.subscriber?.parkingLot?.name, align: 'left' },
  { name: 'paidAt', label: 'Saat', field: (r) => dateTime(r.paidAt), align: 'left' },
  { name: 'amount', label: 'Tutar', field: (r) => money(r.amount), align: 'right' },
  { name: 'method', label: 'Ödeme', field: (r) => methodLabel(r.method), align: 'left' },
  { name: 'reprint', label: '', field: 'id', align: 'right' },
]

const adjustColumns = [
  { name: 'time', label: 'Saat', field: (r) => dateTime(r.createdAt), align: 'left' },
  { name: 'amount', label: 'Tutar', field: (r) => money(r.amount), align: 'right' },
  { name: 'method', label: 'Yöntem', field: (r) => methodLabel(r.method), align: 'left' },
  { name: 'reason', label: 'Gerekçe', field: 'reason', align: 'left' },
]

onMounted(async () => {
  const { data } = await api.get('/parking-lots/mine')
  lots.value = data
  await load()
})

watch([date, parkingLotId], load)

async function load() {
  if (!date.value) return
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/dashboard/day-close', {
      params: {
        date: date.value,
        parkingLotId: parkingLotId.value || undefined,
      },
    })
    report.value = data
  } catch (err) {
    report.value = null
    error.value = err.response?.data?.message || 'Rapor yüklenemedi.'
  } finally {
    loading.value = false
  }
}

function printReport() {
  const previous = document.title
  document.title = `Gun sonu ${date.value}`
  window.print()
  document.title = previous
}

function exportCsv() {
  downloadCsv(
    `parkkasa-gun-sonu-${date.value}.csv`,
    ['Tür', 'Plaka', 'Tutar', 'Yöntem'],
    [
      ...visits.value.map((r) => ['Çıkış', r.plate, r.isSubscriber ? 0 : r.totalPrice, r.method || '']),
      ...payments.value.map((r) => ['Abone', r.subscriber?.plate, r.amount, r.method]),
      ...adjustments.value.map((r) => ['Düzeltme', '', r.amount, r.method]),
    ],
  )
}

async function saveCash() {
  if (!parkingLotId.value || !cash.reason) {
    $q.notify({ type: 'warning', message: 'Tesis ve gerekçe gerekli.' })
    return
  }
  cashing.value = true
  try {
    await api.post('/dashboard/cash-adjustments', {
      parkingLotId: parkingLotId.value,
      amount: cash.amount,
      method: cash.method,
      reason: cash.reason,
    })
    cashOpen.value = false
    cash.amount = 0
    cash.reason = ''
    $q.notify({ type: 'positive', message: 'Kasa düzeltmesi kaydedildi.' })
    await load()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Kaydedilemedi.' })
  } finally {
    cashing.value = false
  }
}

async function closeDay() {
  const still = report.value?.summary?.stillInside
  const warn =
    still > 0
      ? ` İçeride ${still} araç var; onlar ancak kilit açılınca veya ertesi gün çıkış yapabilir.`
      : ''
  $q.dialog({
    title: 'Günü kapat',
    message: `${calendarDate(date.value)} kasa kilidi atılsın mı?${warn}`,
    cancel: { label: 'Vazgeç', flat: true },
    ok: { label: 'Kapat', color: 'primary' },
    persistent: true,
  }).onOk(async () => {
    closing.value = true
    try {
      const { data } = await api.post('/dashboard/day-close', {
        date: date.value,
        parkingLotId: parkingLotId.value || undefined,
      })
      report.value = data
      $q.notify({ type: 'positive', message: 'Gün kapatıldı. Kasa kilitlendi.' })
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.message || 'Kapatılamadı.' })
    } finally {
      closing.value = false
    }
  })
}

async function reopenDay() {
  $q.dialog({
    title: 'Kilidi aç',
    message: 'Bu günün kasa kilidi kaldırılsın mı? Yeni işlemler tekrar alınır.',
    cancel: { label: 'Vazgeç', flat: true },
    ok: { label: 'Kilidi aç', color: 'negative' },
    persistent: true,
  }).onOk(async () => {
    closing.value = true
    try {
      const { data } = await api.post('/dashboard/day-close/reopen', {
        date: date.value,
        parkingLotId: parkingLotId.value || undefined,
      })
      report.value = data
      $q.notify({ type: 'positive', message: 'Kasa kilidi açıldı.' })
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.message || 'Açılamadı.' })
    } finally {
      closing.value = false
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

async function reprintPayment(row) {
  try {
    const { data } = await api.get(`/subscribers/payments/${row.id}/receipt`)
    printReceipt(data)
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Fiş alınamadı.' })
  }
}
</script>

<style scoped>
.print-heading {
  display: none;
}
@media print {
  .print-heading {
    display: block;
  }
}
</style>
