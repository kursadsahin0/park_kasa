# Yayın (üretim)

Tek cümle: HTTPS panel + HTTPS API, sıkı CORS, yedek, sağlık kontrolü.

## Panel (frontend)

Quasar SPA, hash router (`/#/...`). Statik host yeter: Cloudflare Pages, Netlify, S3+CloudFront.

```bash
npm run build
```

Çıktı: `dist/spa`. Ortam: `VITE_API_URL=https://api.parkkasa.com/api`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

Netlify örneği: `netlify.toml`. HTTPS host tarafından gelir. CORS’a panel origin’ini yazın (`https://app.parkkasa.com`).

## API (backend)

`backend/Dockerfile` migrate + `node dist/main.js`. Render taslağı: `backend/render.yaml`.

Zorunlu env: `NODE_ENV=production`, `PORT`, `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_*`, `CORS_ORIGIN` (virgülle panel URL), `LICENSE_SECRET`, `LICENSE_ENFORCE=true`.

Swagger productionda kapalıdır.

## Güvenlik ve işletim

- TLS yalnızca reverse proxy / platform.
- Helmet API’de açık. Panel Netlify’da CSP + frame deny.
- Oturum JWT tarayıcı `sessionStorage` içindedir (sekme kapanınca düşer). XSS varsa aynı sekmede token yine okunabilir; yedek `POST /users/me/export` + onay ister.
- API token’ı yalnızca JWKS ile doğrular; JWT secret sızsa HS256 ile sahte oturum kabul edilmez.
- Yedek: Postgres günlük snapshot (Supabase PITR veya Render disk). İşletmeci ayrıca profil JSON yedeği alır.
- Monitoring: `/api/health` (uptime robot). Loglar stdout; istek özeti middleware’de.
- Hata bildirimi: panel `/#/destek`.
- Supabase’de herkese açık kayıt kapalı tutulur; Auth kotası kayıt endpoint’i + lisans ile doldurulur.

## Fatura

Uygulama içi ödeme yoktur. Tahsilat ve e-arşiv faturası satış sürecinde, panel dışında kesilir. Lisans anahtarı elle üretilir.
