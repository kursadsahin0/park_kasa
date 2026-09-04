<template>
  <q-page class="page">
    <div class="page-head">
      <h1>Aboneler</h1>
      <q-btn unelevated color="primary" no-caps label="Abone ekle" :disable="!lots.length" @click="openForm()" />
    </div>

    <div class="toolbar">
      <q-input v-model="q" outlined dense debounce="300" clearable label="Ara" />
      <q-select v-model="status" outlined dense clearable emit-value map-options label="Durum" :options="statusOptions" style="max-width: 180px" />
      <q-select v-model="parkingLotId" outlined dense clearable emit-value map-options label="Tesis" :options="lotOptions" style="max-width: 220px" />
    </div>

    <div v-if="!lots.length" class="notice">
      <span>Önce tesis ekle.</span>
      <q-btn flat no-caps dense color="primary" to="/tesis" label="Tesis" />
    </div>
    <div v-else-if="expiredRows.length" class="notice">
      <span>{{ expiredRows.length }} abonenin dönemi ödenmedi, durumu “süresi doldu”.</span>
    </div>

    <q-table
      flat
      dense
      row-key="id"
      :rows="rows"
      :columns="columns"
      :loading="loading"
      :filter="q"
      hide-filter
    >
      <template #body-cell-plate="props">
        <q-td :props="props"><span class="plate">{{ props.row.plate }}</span></q-td>
      </template>
      <template #body-cell-period="props">
        <q-td :props="props">
          <span v-if="props.row.status === 'CANCELLED'" class="text-grey-7">—</span>
          <span v-else class="text-grey-7">{{ props.row.cycle?.paid ? 'Ödendi' : 'Ödemedi' }}</span>
        </q-td>
      </template>
      <template #body-cell-status="props">
        <q-td :props="props">
          <span class="text-grey-7">{{ statusLabel(props.row.status) }}</span>
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn-group v-if="props.row.status !== 'CANCELLED'" outline class="table-actions">
            <q-btn
              dense
              no-caps
              color="primary"
              label="Düzenle"
              @click="openForm(props.row)"
            />
            <q-btn
              v-if="!props.row.cycle?.paid"
              dense
              no-caps
              color="primary"
              label="Ödendi"
              @click="openPay(props.row)"
            />
            <q-btn
              dense
              no-caps
              color="negative"
              label="Sonlandır"
              @click="terminate(props.row)"
            />
          </q-btn-group>
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="dialog" persistent>
      <q-card style="min-width: 420px; max-width: 520px">
        <q-card-section style="font-size: 17px; font-weight: 600; letter-spacing: -0.02em">
          {{ editing?.id ? 'Aboneyi düzenle' : 'Yeni abone' }}
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select v-model="form.parkingLotId" outlined dense emit-value map-options label="Tesis" :options="lotOptions" :disable="Boolean(editing?.id)" />
          <q-input v-model="form.fullName" outlined dense label="Ad soyad" />
          <q-input v-model="form.phone" outlined dense label="Telefon" />
          <q-input v-model="form.plate" outlined dense label="Plaka" class="plate" @blur="form.plate = formatPlate(form.plate)" />
          <div class="row q-col-gutter-sm">
            <div class="col-4"><q-input v-model="form.brand" outlined dense label="Marka" /></div>
            <div class="col-4"><q-input v-model="form.model" outlined dense label="Model" /></div>
            <div class="col-4"><q-input v-model="form.color" outlined dense label="Renk" /></div>
          </div>
          <q-input v-model="form.spotCode" outlined dense label="Park yeri" hint="Boş bırakılırsa atanmaz. Ör. 12 veya A-12" />
          <q-input v-model="form.startDate" outlined dense type="date" label="Kayıt günü" hint="Her takvim ayında yenilenir" />
          <q-input v-model.number="form.monthlyFee" outlined dense type="number" label="Aylık ücret (₺)" />
          <template v-if="!editing?.id">
            <q-select
              v-model="form.paymentMethod"
              outlined
              dense
              emit-value
              map-options
              label="Ödeme türü"
              :options="paymentOptions"
            />
            <q-input
              v-model.number="form.paidAmount"
              outlined
              dense
              type="number"
              label="Alınan tutar (₺)"
              hint="Kayıt için ödeme zorunlu"
            />
          </template>
          <q-select v-model="form.status" outlined dense emit-value map-options label="Durum" :options="formStatusOptions" />
          <q-input v-model="form.notes" outlined dense type="textarea" autogrow label="Not" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Vazgeç" v-close-popup />
          <q-btn unelevated no-caps color="primary" :label="editing?.id ? 'Kaydet' : 'Öde ve kaydet'" :loading="saving" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="payDialog" persistent>
      <q-card style="min-width: 360px">
        <q-card-section style="font-size: 17px; font-weight: 600">
          {{ paying?.plate }} tahsilat
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model.number="payAmount" outlined dense type="number" label="Tutar (₺)" />
          <q-select
            v-model="payMethod"
            outlined
            dense
            emit-value
            map-options
            label="Ödeme yöntemi"
            :options="paymentOptions"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Vazgeç" v-close-popup />
          <q-btn unelevated no-caps color="primary" label="Al ve fiş yazdır" :loading="saving" @click="confirmPay" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { money, shortDate, statusLabel } from '@/utils/format'
import { formatPlate, normalizePlate, platesEqual } from '@/utils/plate'
import { printReceipt } from '@/utils/print-receipt'

const $q = useQuasar()
const rows = ref([])
const lots = ref([])
const loading = ref(false)
const saving = ref(false)
const dialog = ref(false)
const editing = ref(null)
const q = ref('')
const status = ref(null)
const parkingLotId = ref(null)
const payDialog = ref(false)
const paying = ref(null)
const payMethod = ref('CASH')
const payAmount = ref(0)

const statusOptions = [
  { label: 'Aktif', value: 'ACTIVE' },
  { label: 'Beklemede', value: 'PENDING' },
  { label: 'Süresi doldu', value: 'EXPIRED' },
  { label: 'Donduruldu', value: 'SUSPENDED' },
  { label: 'Sonlandırıldı', value: 'CANCELLED' },
]

const formStatusOptions = [
  { label: 'Aktif', value: 'ACTIVE' },
  { label: 'Donduruldu', value: 'SUSPENDED' },
]

const paymentOptions = [
  { label: 'Nakit', value: 'CASH' },
  { label: 'Kart', value: 'CARD' },
]

const lotOptions = computed(() => lots.value.map((l) => ({ label: l.name, value: l.id })))
const expiredRows = computed(() => rows.value.filter((r) => r.status === 'EXPIRED'))

const columns = [
  { name: 'fullName', label: 'Abone', field: 'fullName', align: 'left' },
  { name: 'plate', label: 'Plaka', field: 'plate', align: 'left' },
  { name: 'spotCode', label: 'Yer', field: 'spotCode', align: 'left' },
  { name: 'renewal', label: 'Sonraki yenileme', field: (r) => (r.status === 'CANCELLED' && r.endedAt ? `Bitti · ${shortDate(r.endedAt)}` : shortDate(r.cycle?.periodEnd)), align: 'left' },
  { name: 'monthlyFee', label: 'Ücret', field: (r) => money(r.monthlyFee), align: 'right' },
  { name: 'period', label: 'Bu dönem', field: (r) => (r.cycle?.paid ? 'Ödendi' : 'Ödemedi'), align: 'left' },
  { name: 'status', label: 'Durum', field: 'status', align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right', style: 'width: 1%; white-space: nowrap' },
]

const form = reactive(emptyForm())

function emptyForm() {
  const start = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const iso = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
  return {
    parkingLotId: null,
    fullName: '',
    phone: '',
    plate: '',
    brand: '',
    model: '',
    color: '',
    spotCode: '',
    startDate: iso,
    monthlyFee: 0,
    paymentMethod: 'CASH',
    paidAmount: 0,
    status: 'ACTIVE',
    notes: '',
  }
}

async function loadLots() {
  const { data } = await api.get('/parking-lots/mine')
  lots.value = data
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/subscribers', {
      params: { q: q.value || undefined, status: status.value || undefined, parkingLotId: parkingLotId.value || undefined },
    })
    rows.value = data
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadLots()
  await load()
})
watch([status, parkingLotId, q], load)

function openForm(row) {
  editing.value = row || null
  const base = emptyForm()
  if (row) {
    Object.assign(form, {
      parkingLotId: row.parkingLotId,
      fullName: row.fullName,
      phone: row.phone || '',
      plate: row.plate,
      brand: row.brand || '',
      model: row.model || '',
      color: row.color || '',
      spotCode: row.spotCode || '',
      startDate: String(row.startDate).slice(0, 10),
      monthlyFee: Number(row.monthlyFee),
      status: row.status,
      notes: row.notes || '',
    })
  } else {
    Object.assign(form, base, {
      parkingLotId: lots.value[0]?.id || null,
      monthlyFee: Number(lots.value[0]?.monthlyRate || 0),
      paidAmount: Number(lots.value[0]?.monthlyRate || 0),
      paymentMethod: 'CASH',
    })
  }
  dialog.value = true
}

async function save() {
  const plate = formatPlate(form.plate)
  if (!normalizePlate(plate)) {
    $q.notify({ type: 'negative', message: 'Plaka gerekli.' })
    return
  }
  const duplicate = rows.value.some(
    (row) =>
      row.status !== 'CANCELLED' &&
      row.parkingLotId === form.parkingLotId &&
      platesEqual(row.plate, plate) &&
      row.id !== editing.value?.id,
  )
  if (duplicate) {
    $q.notify({ type: 'negative', message: 'Bu plaka bu tesiste zaten kayıtlı.' })
    return
  }
  if (!editing.value?.id) {
    const amount = Number(form.paidAmount || form.monthlyFee)
    if (!form.paymentMethod || amount <= 0) {
      $q.notify({ type: 'warning', message: 'Abone kaydı için ödeme alınmalı.' })
      return
    }
  }
  saving.value = true
  try {
    if (editing.value?.id) {
      const payload = { ...form, plate }
      delete payload.parkingLotId
      delete payload.paymentMethod
      delete payload.paidAmount
      await api.patch(`/subscribers/${editing.value.id}`, payload)
    } else {
      await api.post('/subscribers', {
        ...form,
        plate,
        paidAmount: Number(form.paidAmount || form.monthlyFee),
      }).then(({ data }) => {
        if (data.receipt) printReceipt(data.receipt)
      })
    }
    dialog.value = false
    $q.notify({
      type: 'positive',
      message: editing.value?.id ? 'Kaydedildi.' : 'Ödeme alındı, abone kaydedildi.',
    })
    await load()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Kaydedilemedi.' })
  } finally {
    saving.value = false
  }
}

async function terminate(row) {
  $q.dialog({
    title: 'Aboneliği sonlandır',
    message: `${row.plate} aboneliği bitsin mi? Bundan sonra bu plaka günlük ücretle girer. Aynı plaka yeniden abone yapılabilir.`,
    cancel: { label: 'Vazgeç', flat: true },
    ok: { label: 'Sonlandır', color: 'negative' },
    persistent: true,
  }).onOk(async () => {
    try {
      await api.post(`/subscribers/${row.id}/terminate`)
      $q.notify({ type: 'positive', message: `${row.plate} aboneliği sonlandırıldı.` })
      await load()
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.message || 'Sonlandırılamadı.' })
    }
  })
}

function openPay(row) {
  paying.value = row
  payMethod.value = 'CASH'
  payAmount.value = Number(row.monthlyFee)
  payDialog.value = true
}

async function confirmPay() {
  const row = paying.value
  if (!row) return
  if (!payMethod.value || Number(payAmount.value) <= 0) {
    $q.notify({ type: 'warning', message: 'Tutar ve ödeme yöntemi gerekli.' })
    return
  }
  saving.value = true
  try {
    const { data } = await api.post(`/subscribers/${row.id}/payments`, {
      amount: Number(payAmount.value),
      method: payMethod.value,
    })
    payDialog.value = false
    $q.notify({ type: 'positive', message: `${row.plate} için bu dönem ödendi.` })
    if (data.receipt) printReceipt(data.receipt)
    await load()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Ödeme kaydı eklenemedi.' })
  } finally {
    saving.value = false
  }
}
</script>
