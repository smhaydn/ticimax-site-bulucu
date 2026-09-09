# Ticimax Site Bulucu

Türkiye'de Ticimax altyapısı kullanan e-ticaret sitelerini bulan, iletişim
bilgilerini toplayan ve satış takibi yapan masaüstü uygulaması. Veriler
uygulamanın içinde gömülü gelir.

> Bu depo **gizli (private)** tutulmalıdır — içinde firma iletişim verileri var.

## İndirme (kullanacak kişi için)

**Releases** sayfasından son sürümü indir:

- **Windows:** `Ticimax Site Bulucu Setup x.x.x.exe` → çift tıkla →
  "Bilgisayarınızı korudu" çıkarsa **Ek bilgi → Yine de çalıştır** → kur.
- **Mac (Apple Silicon / M-serisi):** `.dmg` dosyasını aç → uygulamayı
  **Applications**'a sürükle → ilk açılışta **sağ tık → Aç → Aç** (imzasız uygulama uyarısı).

## Derleme (otomatik)

Kurulum dosyaları GitHub üzerinde otomatik üretilir:
- **Actions** sekmesi → "Uygulamayı Derle" → **Run workflow** (elle), veya
- `v1.0.0` gibi bir etiket at → hem Windows `.exe` hem Mac `.dmg` derlenip
  **Releases**'e eklenir.

## Geliştirme (kendi bilgisayarında)

```bash
npm install
npm start          # uygulamayı çalıştır
npm run dist       # Windows kurulumu üret (dist/ klasörüne)
```
