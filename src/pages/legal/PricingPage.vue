<template>
  <article class="legal-doc">
    <h1>Fiyat</h1>
    <p class="lead">{{ PRODUCT_PITCH }} Teslim edilen ürün web panelidir.</p>
    <div class="stat-grid q-mb-lg">
      <div v-for="plan in PLANS" :key="plan.id" class="stat">
        <span>{{ plan.name }} · {{ plan.lots }}</span>
        <strong>{{ plan.price }} / {{ plan.period }}</strong>
        <p class="text-grey-7 q-mb-none" style="font-size: 13px">{{ plan.note }}</p>
      </div>
    </div>
    <h2>Rakip farkı</h2>
    <p>Yazar kasa / ÖKC nakit tahsilatı mali fiş basar. ParkKasa plaka, abone dönemi ve gün sonu kasasını tutar; panel çıktısı mali belge değildir.</p>
    <h2>Fatura</h2>
    <p>
      ParkKasa aboneliği için satış faturası (e-arşiv / e-fatura) tarafımızca kesilir. Otoparkın kendi müşterisine e-fatura
      kesmesi ürün özelliği değildir; küçük otopark için şart değildir.
    </p>
    <h2>Lisans</h2>
    <p>Ücretsiz plan yoktur. Panelde ödeme alınmaz. Satın alma e-posta veya sözleşme ile; anahtar profilde elle etkinleştirilir.</p>
    <p><router-link to="/kayit">Hesap oluştur</router-link> · <a :href="`mailto:${SUPPORT_EMAIL}`">{{ SUPPORT_EMAIL }}</a></p>
  </article>
</template>

<script setup>
import { PLANS, PRODUCT_PITCH, SUPPORT_EMAIL } from '@/brand'
</script>
