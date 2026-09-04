<template>
  <q-page class="page">
    <div class="page-head">
      <h1>Plaka geçmişi</h1>
    </div>
    <div class="toolbar">
      <q-input
        v-model="plate"
        outlined
        dense
        label="Plaka"
        class="plate"
        style="max-width: 200px"
        @keyup.enter="load"
      />
      <q-btn unelevated no-caps color="primary" label="Ara" :disable="!plate" :loading="loading" @click="load" />
    </div>
    <q-table
      flat
      dense
      row-key="id"
      :rows="rows"
      :columns="columns"
      :loading="loading"
      hide-pagination
      :pagination="{ rowsPerPage: 0 }"
      no-data-label="Kayıt yok."
    />
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { dateTime, money } from '@/utils/format'
import { formatPlate } from '@/utils/plate'

const $q = useQuasar()
const plate = ref('')
const rows = ref([])
const loading = ref(false)
const columns = [
  { name: 'lot', label: 'Tesis', field: (r) => r.parkingLot?.name, align: 'left' },
  { name: 'startedAt', label: 'Giriş', field: (r) => dateTime(r.startedAt), align: 'left' },
  { name: 'endedAt', label: 'Çıkış', field: (r) => (r.endedAt ? dateTime(r.endedAt) : 'İçeride'), align: 'left' },
  { name: 'status', label: 'Durum', field: 'status', align: 'left' },
  { name: 'total', label: 'Ücret', field: (r) => money(r.totalPrice), align: 'right' },
]

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/visits/history', { params: { plate: formatPlate(plate.value) } })
    rows.value = data
  } catch (err) {
    rows.value = []
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Arama başarısız.' })
  } finally {
    loading.value = false
  }
}
</script>
