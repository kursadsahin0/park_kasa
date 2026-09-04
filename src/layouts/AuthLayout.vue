<template>
  <q-layout>
    <q-page-container>
      <div class="auth-shell">
        <div class="auth-panel">
          <AppBrand class="q-mb-lg" tagline />
          <router-view />
          <nav class="auth-legal">
            <router-link to="/fiyat">Fiyat</router-link>
            <router-link to="/kvkk">KVKK</router-link>
            <router-link to="/gizlilik">Gizlilik</router-link>
            <router-link to="/kullanim-sartlari">Şartlar</router-link>
          </nav>
        </div>
      </div>
    </q-page-container>
    <CookieBanner />
  </q-layout>
</template>

<script setup>
import AppBrand from '@/components/AppBrand.vue'
import CookieBanner from '@/components/CookieBanner.vue'
</script>
