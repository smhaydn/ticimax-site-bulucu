# 🛒 Ticimax Site Bulucu

Türkiye'de **Ticimax altyapısı kullanan e-ticaret sitelerini** bulan, telefon /
mail / Instagram / sektör / şehir bilgilerini toplayan ve **satış takibi** yapan
masaüstü uygulaması. Toplanan **4.161 firma verisi uygulamanın içinde gömülü**
gelir — kurunca hazır dolu açılır.

> ⚠️ Bu depo **gizli (private)** — içinde firma iletişim verileri var. Herkese açmayın.

---

## ⬇️ İNDİRME (en kolay yol)

Kurulum dosyaları hazır. **[Releases sayfasına git »](https://github.com/smhaydn/ticimax-site-bulucu/releases/latest)**

| Bilgisayarın | İndireceğin dosya |
|---|---|
| 🪟 **Windows** | `Ticimax Site Bulucu Setup 1.x.x.exe` |
| 🍎 **Mac (M1/M2/M3 – Apple Silicon)** | `Ticimax Site Bulucu-1.x.x-arm64.dmg` |

İkisinde de tüm veriler gömülü gelir, ekstra bir şey yapmana gerek yok.

---

## 🪟 WINDOWS KURULUMU

1. Releases'ten **`...Setup...exe`** dosyasını indir.
2. İndirilen dosyaya **çift tıkla**.
3. Mavi bir uyarı çıkarsa ("Windows bilgisayarınızı korudu"):
   **"Ek bilgi"** → **"Yine de çalıştır"** de. (Uygulama imzasız olduğu için normal.)
4. Kurulum ekranında **İleri / Kur** de, bitir.
5. **Masaüstündeki "Ticimax Site Bulucu" simgesine** çift tıkla. Açılır, hazır.

---

## 🍎 MAC KURULUMU (Apple Silicon – M1/M2/M3)

1. Releases'ten **`...arm64.dmg`** dosyasını indir.
2. İndirilen `.dmg`'ye **çift tıkla** → küçük bir pencere açılır.
3. Açılan pencerede **uygulama simgesini "Applications" klasörüne sürükle**.
4. **Launchpad** veya **Applications**'tan uygulamayı bul.
5. İlk açılışta uygulamaya **sağ tık → "Aç"** (normal çift tık DEĞİL) → çıkan
   uyarıda tekrar **"Aç"**. (İmzasız olduğu için sadece ilk seferde böyle; sonra
   normal çift tıkla açılır.)

> Not: Bu `.dmg` GitHub'ın gerçek Mac sunucusunda üretildiği için temiz açılır,
> Terminal komutu gerektirmez.

---

## 🤖 CLAUDE CODE / GELİŞTİRİCİ İLE KURULUM (isteğe bağlı)

Arkadaşının bilgisayarında **Claude Code + GitHub girişi (gh)** varsa, kurulum
dosyası indirmeden doğrudan kaynaktan çalıştırabilir. Claude Code'a şunu söylemesi yeter:

> "Şu private repoyu klonla ve çalıştır: `smhaydn/ticimax-site-bulucu`"

Ya da terminalde tek tek:

```bash
gh repo clone smhaydn/ticimax-site-bulucu
cd ticimax-site-bulucu
npm install
npm start
```

Kendi kurulum dosyasını üretmek isterse:

```bash
npm run dist    # Windows'ta .exe üretir (dist/ klasörüne)
```

> Bu yol repoya erişim ister (arkadaşın **collaborator** olarak eklenmiş olmalı).

---

## 🔄 Yeni sürüm / güncelleme

Veri güncellenince veya kodda değişiklik olunca yeni bir sürüm etiketi
(`v1.0.1` gibi) atılır; GitHub Windows `.exe` ve Mac `.dmg`'yi otomatik derleyip
**Releases**'e ekler. Herkes en güncel dosyayı oradan indirir.
