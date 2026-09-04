<template>
  <div v-if="visible" class="cookie-bar">
    <span>
      Oturum için zorunlu çerez/depolama kullanılır (Supabase Auth). Reklam çerezi yok.
      <router-link to="/gizlilik">Gizlilik</router-link>
    </span>
    <q-btn unelevated dense no-caps color="primary" label="Tamam" @click="accept" />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const KEY = 'parkkasa-cookie-ok'
const visible = ref(!localStorage.getItem(KEY))

function accept() {
  localStorage.setItem(KEY, '1')
  visible.value = false
}
</script>

<style scoped>
.cookie-bar {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: 16px;
  z-index: 2000;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #1c1f24;
  color: #eceae4;
  border-radius: 10px;
  font-size: 13px;
}
.cookie-bar a {
  color: #c5ddd0;
}
</style>
