# Kurulum

ParkKasa web paneli + NestJS API. Node.js 22+, Docker (Postgres) veya Supabase Postgres, Supabase Auth.

## 1. Ortam dosyaları

```bash
cp env.example .env
cp backend/env.example backend/.env
```

Kök `.env`: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

`backend/.env`: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LICENSE_SECRET`, `CORS_ORIGIN`.

JWT doğrulama yalnızca Supabase JWKS iledir; JWT secret frontend’e ve HS256 yedeğine konmaz. Service role, `DATABASE_URL` ve `LICENSE_SECRET` asla `VITE_` ile yazılmaz.

`LICENSE_SECRET` üretmek: `openssl rand -hex 32`

## 2. Postgres

Yerel:

```bash
docker compose up -d
```

`DATABASE_URL` ve `DIRECT_URL` örnekteki gibi `localhost:5432` kalır.

Supabase kullanıyorsanız Project Settings → Database: pooler `DATABASE_URL`, direct `DIRECT_URL` (migrate için).

## 3. Supabase Auth

1. Proje oluşturun.
2. Authentication → URL: geliştirmede `http://localhost:9000` (hash router).
3. **Allow new users to sign up** kapalı olsun. Hesap yalnızca panel **Kayıt** → API `POST /api/auth/register` (geçerli, e-postaya bağlı lisans) ile açılır.
4. Anon key yalnızca kök `.env` (`VITE_SUPABASE_ANON_KEY`). Service role yalnızca `backend/.env`.
5. Lisans: `cd backend && npm run license:issue -- kasa 365 musteri@firma.com` — anahtar o e-postaya bağlıdır; paylaşılınca başka e-posta ile kayıt olmaz.

## 4. Bağımlılık, migrate, çalıştır

```bash
npm install
cd backend && npm install && npx prisma generate && npm run prisma:migrate && cd ..
npm run dev
```

## 5. Demo hesabı (satış)

`backend/.env` içinde service role tanımlı olsun. Sonra:

```bash
cd backend && npm run prisma:seed
```

Varsayılan giriş: `demo@parkkasa.com` / `DemoPark1!` (`DEMO_EMAIL` / `DEMO_PASSWORD` ile değişir). Seed tesis, abone, içeride araç ve kapanmış çıkış ekler.

Kök `.env` isteğe bağlı: `VITE_DEMO_EMAIL` giriş ekranında yalnızca e-posta ipucu gösterir (şifre yazılmaz).

## 6. Lisans anahtarı

```bash
cd backend && LICENSE_SECRET=... npm run license:issue -- kasa 365 musteri@firma.com
```

Plan `kasa` | `isletme`, gün sayısı, **müşteri e-postası**. Eski (e-postasız) anahtarlar geçersizdir; yeniden kesin.

`LICENSE_ENFORCE=false` ile süre/tesis kontrolü kapanır (kendi sunucunuz).

## 7. İlk tesis

Giriş → özet → **Kuruluma başla** veya `/#/baslangic`: örnek tarife, tesis adı, ardından **Günlük**te ilk plaka.
