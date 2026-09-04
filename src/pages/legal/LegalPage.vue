<template>
  <article class="legal-doc">
    <h1>{{ title }}</h1>
    <p class="lead">Son güncelleme: 3 Eylül 2026</p>
    <div v-html="html" />
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { COMPANY_ADDRESS, COMPANY_NAME, PRODUCT_NAME, PRODUCT_URL, SUPPORT_EMAIL } from '@/brand'

const route = useRoute()

const pages = {
  kvkk: {
    title: 'KVKK aydınlatma metni',
    html: `
      <p>${COMPANY_NAME}, ${PRODUCT_NAME} web paneli üzerinden otopark işletmesine ait <strong>plaka, ad-soyad, telefon</strong> ve ödeme kayıtlarını 6698 sayılı Kanun kapsamında işler. Bunlar kişisel veridir.</p>
      <h2>Veri sorumlusu</h2>
      <p>${COMPANY_NAME} · ${COMPANY_ADDRESS}<br />İletişim: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> · <a href="${PRODUCT_URL}">${PRODUCT_URL}</a></p>
      <h2>İşlenen veriler</h2>
      <ul>
        <li>Hesap: e-posta, ad, telefon</li>
        <li>Tesis: adres, tarife, yer kodu</li>
        <li>Ziyaret ve abone: plaka, süre, ücret, ödeme yöntemi</li>
        <li>Denetim: işlem zamanı, kullanıcı, IP</li>
      </ul>
      <h2>Amaç ve hukuki sebep</h2>
      <p>Sözleşmenin ifası (kasa, abone, gün sonu), meşru menfaat (uyuşmazlık, güvenlik). Pazarlama yapılmaz; açık rıza aranmaz.</p>
      <h2>Saklama</h2>
      <p>Ziyaret ve tahsilat kayıtları fiilen 24 ay, yasal defter yükümlülüğü varsa ilgili süre kadar tutulur. Denetim logları 12 ay. Süre bitince silinir veya anonimleştirilir.</p>
      <h2>Aktarım</h2>
      <p>Kimlik doğrulama ve veritabanı için hizmet alınan altyapı (ör. Supabase) kullanılabilir. Veri satılmaz.</p>
      <h2>Haklar ve silme</h2>
      <p>Kanun m.11 talepleri ve hesap/veri silme için paneldeki Destek formundan “Veri silme” seçin veya ${SUPPORT_EMAIL} yazın. Kimlik doğrulaması sonrası makul sürede yerine getirilir. Mali kayıtlar yasal süre boyunca saklanabilir.</p>
    `,
  },
  gizlilik: {
    title: 'Gizlilik politikası',
    html: `
      <p>${PRODUCT_NAME} (${PRODUCT_URL}) otopark kasa, abone ve gün sonu işlemlerini web tarayıcısında sunar.</p>
      <h2>Çerez ve yerel depolama</h2>
      <p>Zorunlu: oturum (Supabase Auth). Tercih: çerez onay bayrağı. Reklam ve izleme çerezi yoktur. Çerez bandı ilk ziyarette gösterilir.</p>
      <h2>Altyapı</h2>
      <p>API HTTPS ile konuşur. Üretimde CORS yalnızca tanımlı panele açıktır.</p>
      <h2>Yedek</h2>
      <p>İşletmeci profilinden JSON yedek indirebilir. Sunucu yedeği barındırma sözleşmesine göredir.</p>
    `,
  },
  sartlar: {
    title: 'Kullanım şartları',
    html: `
      <p>Teslim edilen ürün <strong>web paneli</strong>dir: otopark kasa + abone + gün sonu. Mobil uygulama veya masaüstü paket bu sözleşmenin konusu değildir (ayrıca yazılmadıkça).</p>
      <h2>Lisans</h2>
      <p>Ücretsiz plan yoktur. Ücretli plan lisans anahtarı ile süre ve tesis sayısı sınırlar. Uygulama içi ödeme yoktur; tahsilat satış sözleşmesine göredir.</p>
      <h2>Satış faturası</h2>
      <p>${COMPANY_NAME}, yazılım aboneliği için e-arşiv/e-fatura keser. Otoparkın kendi müşterisine e-fatura kesmesi ürün özelliği değildir.</p>
      <h2>Sizin yükümlülüğünüz</h2>
      <p>Doğru tarife, KVKK, yedek. Yazılım işletme fişi ve rapor üretir; bunlar ÖKC, e-arşiv veya e-fatura değildir. Nakit tahsilatın mali belgesi ve vergi beyanı işletmecinindir.</p>
      <h2>Sorumluluk</h2>
      <p>Kesinti, internet veya kimlik sağlayıcısı kaynaklı kayıplardan ${COMPANY_NAME} sorumlu tutulamaz. Zorunlu haller saklıdır.</p>
      <h2>Fesih</h2>
      <p>Süre bitince yazma işlemleri kapanır. Veri ihracı profil yedeği veya destek talebi ile sağlanır.</p>
    `,
  },
}

const current = computed(() => pages[route.meta.legal] || pages.kvkk)
const title = computed(() => current.value.title)
const html = computed(() => current.value.html)
</script>
