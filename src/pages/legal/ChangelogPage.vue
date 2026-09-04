<template>
  <article class="legal-doc">
    <h1>Sürüm notları</h1>
    <section v-for="rel in CHANGELOG" :key="rel.version" class="q-mb-lg">
      <h2>{{ rel.version }} · {{ rel.date }}</h2>
      <ul>
        <li v-for="(item, i) in rel.items" :key="i">{{ item }}</li>
      </ul>
    </section>
  </article>
</template>

<script setup>
import { CHANGELOG } from '@/changelog'
</script>
