# ParkKasa

**Otopark kasa + abone + gün sonu.** Teslim edilen ürün web panelidir.

Nakit kasa fiş basar; ParkKasa plaka, abone dönemi ve gün sonu kasasını tek panelde tutar.

Sürüm **1.1.0** · [Fiyat](https://parkkasa.com/#/fiyat) · Destek: [destek@parkkasa.com](mailto:destek@parkkasa.com)

Kurulum: [docs/KURULUM.md](docs/KURULUM.md) · Yayın: [docs/YAYIN.md](docs/YAYIN.md) · Sürüm notları: [CHANGELOG.md](CHANGELOG.md)

## Kapsam (vaat)

- Web: giriş-çıkış, abone, gün sonu, fiş, CSV, rapor, rezervasyon
- Lisans: ücretli anahtar ile süre ve tesis sayısı
- Mobil uygulama ve Electron bu teklifin parçası değildir

## Fiyat (liste)

| Plan | Tesis | Süre | Liste |
| --- | --- | --- | --- |
| Kasa | 1 | yıl | 24.900 ₺ |
| İşletme | 5 | yıl | 49.900 ₺ |

ParkKasa aboneliği panel dışında faturalanır (uygulama içi ödeme yok). Otoparkın müşterisine e-fatura ürün özelliği değildir.

## Komutlar

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | API + web |
| `cd backend && npm test` | API testleri |
| `cd backend && npm run prisma:seed` | Demo hesap + örnek veri |

Panel: `http://localhost:9000` · API: `http://localhost:3000/api/health`
