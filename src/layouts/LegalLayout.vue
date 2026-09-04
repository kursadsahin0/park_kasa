<template>
  <q-layout>
    <q-page-container>
      <div class="legal-shell">
        <AppBrand to="/giris" tagline class="q-mb-lg" />
        <router-view />
        <p class="legal-meta">{{ PRODUCT_NAME }} v{{ VERSION }} · {{ PRODUCT_DOMAIN }}</p>
        <p class="legal-meta">
          <router-link to="/fiyat">Fiyat</router-link> ·
          <router-link to="/surum">Sürüm</router-link> ·
          <router-link to="/destek">Destek</router-link>
        </p>
      </div>
    </q-page-container>
    <CookieBanner />
  </q-layout>
</template>

<script setup>
import AppBrand from '@/components/AppBrand.vue'
import CookieBanner from '@/components/CookieBanner.vue'
import { PRODUCT_NAME, PRODUCT_DOMAIN, VERSION } from '@/brand'
</script>

<style scoped>
.legal-shell {
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 20px 64px;
}
.legal-meta {
  margin-top: 32px;
  color: var(--muted);
  font-size: 13px;
}
.legal-shell :deep(.legal-doc h2) {
  font-size: 16px;
  margin: 24px 0 8px;
}
.legal-shell :deep(.legal-doc ul) {
  padding-left: 18px;
}
.legal-shell :deep(.lead) {
  color: var(--muted);
}
</style>
