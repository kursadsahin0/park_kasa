<template>
  <q-page class="page">
    <div class="page-head">
      <h1>Rezervasyon</h1>
      <q-btn unelevated color="primary" no-caps label="Ekle" :disable="!lots.length" @click="dialog = true" />
    </div>
    <q-table flat dense row-key="id" :rows="rows" :columns="columns" :loading="loading" hide-pagination>
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn
            v-if="props.row.status === 'BOOKED'"
            dense
            no-caps
            color="primary"
            label="Giriş"
            @click="checkIn(props.row)"
          />
          <q-btn
            v-if="props.row.status === 'BOOKED'"
            flat
            dense
            no-caps
            color="negative"
            label="İptal"
            @click="cancel(props.row)"
          />
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="dialog" persistent>
      <q-card style="min-width: 380px">
        <q-card-section style="font-weight: 600">Yeni rezervasyon</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select v-model="form.parkingLotId" outlined dense emit-value map-options label="Tesis" :options="lotOptions" />
          <q-input v-model="form.plate" outlined dense label="Plaka" />
          <q-input v-model="form.fullName" outlined dense label="Ad" />
          <q-input v-model="form.startsAt" outlined dense type="datetime-local" label="Başlangıç" />
          <q-input v-model="form.endsAt" outlined dense type="datetime-local" label="Bitiş" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Vazgeç" v-close-popup />
          <q-btn unelevated no-caps color="primary" label="Kaydet" :loading="saving" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { dateTime } from '@/utils/format'
import { formatPlate } from '@/utils/plate'

const $q = useQuasar()
const lots = ref([])
const rows = ref([])
const loading = ref(false)
const saving = ref(false)
const dialog = ref(false)
const lotOptions = computed(() => lots.value.map((l) => ({ label: l.name, value: l.id })))
const form = reactive({
  parkingLotId: null,
  plate: '',
  fullName: '',
  startsAt: '',
  endsAt: '',
})
const columns = [
  { name: 'plate', label: 'Plaka', field: 'plate', align: 'left' },
  { name: 'lot', label: 'Tesis', field: (r) => r.parkingLot?.name, align: 'left' },
  { name: 'startsAt', label: 'Başlangıç', field: (r) => dateTime(r.startsAt), align: 'left' },
  { name: 'endsAt', label: 'Bitiş', field: (r) => dateTime(r.endsAt), align: 'left' },
  { name: 'status', label: 'Durum', field: 'status', align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right' },
]

onMounted(async () => {
  const { data } = await api.get('/parking-lots/mine')
  lots.value = data
  form.parkingLotId = data[0]?.id || null
  await load()
})

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/reservations')
    rows.value = data
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await api.post('/reservations', {
      ...form,
      plate: formatPlate(form.plate),
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
    })
    dialog.value = false
    await load()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Kaydedilemedi.' })
  } finally {
    saving.value = false
  }
}

async function checkIn(row) {
  try {
    await api.post('/visits/check-in', {
      parkingLotId: row.parkingLotId,
      plate: row.plate,
      fullName: row.fullName || undefined,
      reservationId: row.id,
    })
    $q.notify({ type: 'positive', message: 'Giriş yapıldı.' })
    await load()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Giriş yapılamadı.' })
  }
}

async function cancel(row) {
  await api.post(`/reservations/${row.id}/cancel`)
  await load()
}
</script>
