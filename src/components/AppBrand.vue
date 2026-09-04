<template>
  <component :is="to ? 'router-link' : 'div'" :to="to" class="brand" :class="{ 'brand--light': light }">
    <img class="brand-logo" src="@/assets/logo.png" width="28" height="28" alt="" />
    <span class="brand-text">
      <span>{{ PRODUCT_NAME }}</span>
      <small v-if="tagline" class="brand-tag">{{ PRODUCT_TAGLINE }}</small>
    </span>
  </component>
</template>

<script setup>
import { PRODUCT_NAME, PRODUCT_TAGLINE } from '@/brand'

defineProps({
  to: { type: [String, Object], default: null },
  light: { type: Boolean, default: false },
  tagline: { type: Boolean, default: false },
})
</script>
