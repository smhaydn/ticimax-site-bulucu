// ============================================================================
//  depo.js — Basit yerel veritabanı (JSON dosyası)
//  Binlerce kayıt için yeterli; ayrı bir veritabanı motoru kurmaya gerek yok,
//  bu sayede uygulama her bilgisayara sorunsuz kurulur.
// ============================================================================

const fs = require('fs');
const path = require('path');

let dosya = null;
let ayarDosya = null;
let veri = { siteler: [] };
let ayarlar = {};

// Uygulama açılışında çağrılır; klasör = Electron userData
function baslat(klasor) {
  dosya = path.join(klasor, 'veritabani.json');
  ayarDosya = path.join(klasor, 'ayarlar.json');
  try { veri = JSON.parse(fs.readFileSync(dosya, 'utf-8')); } catch (e) { veri = { siteler: [] }; }
  if (!Array.isArray(veri.siteler)) veri.siteler = [];
  try { ayarlar = JSON.parse(fs.readFileSync(ayarDosya, 'utf-8')); } catch (e) { ayarlar = {}; }
}

function kaydet() {
  if (dosya) fs.writeFileSync(dosya, JSON.stringify(veri));
}

function domainNormalle(d) {
  return (d || '').toString().trim().toLowerCase()
    .replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
}

// Bir kaydı ekler; varsa boş alanları doldurarak birleştirir.
// Döner: 'yeni' | 'guncellendi'
function ekle(kayit) {
  const domain = domainNormalle(kayit.domain);
  if (!domain) return null;
  let mevcut = veri.siteler.find((s) => s.domain === domain);
  if (!mevcut) {
    veri.siteler.push({
      domain,
      telefon: kayit.telefon || '',
      mail: kayit.mail || '',
      instagram: kayit.instagram || '',
      sehir: kayit.sehir || '',
      sektor: kayit.sektor || 'Bilinmiyor',
      kaynak: kayit.kaynak || '',
      ticimax: kayit.ticimax !== false,
      tarandi: !!kayit.tarandi,
      durum: kayit.durum || 'Yeni',   // satış takibi
      not: kayit.not || '',
    });
    return 'yeni';
  }
  // Boş alanları doldur (var olan doğru veriyi ezme)
  ['telefon', 'mail', 'instagram', 'sehir'].forEach((a) => {
    if (!mevcut[a] && kayit[a]) mevcut[a] = kayit[a];
  });
  // Anlamlı yeni sektör gelirse üstüne yaz (site içeriğinden gelen, tahminden güvenilir);
  // yeni sektör "Bilinmiyor" ise eldeki değeri koru.
  if (kayit.sektor && kayit.sektor !== 'Bilinmiyor') mevcut.sektor = kayit.sektor;
  else if (!mevcut.sektor) mevcut.sektor = 'Bilinmiyor';
  if (kayit.kaynak && !String(mevcut.kaynak).includes(kayit.kaynak)) {
    mevcut.kaynak = mevcut.kaynak ? mevcut.kaynak + '+' + kayit.kaynak : kayit.kaynak;
  }
  if (kayit.tarandi) mevcut.tarandi = true;
  if (kayit.ticimax === false) mevcut.ticimax = false;
  return 'guncellendi';
}

function tumSiteler() { return veri.siteler; }
function siteSayisi() { return veri.siteler.length; }

// Tüm listeyi baştan yükle (başlangıç verisiyle tohumlama için)
function topluYukle(siteler) {
  veri.siteler = Array.isArray(siteler) ? siteler : [];
  kaydet();
}

// Satış takibi alanlarını güncelle (durum, not). Tek veya çoklu domain.
function kayitGuncelle(domainler, alanlar) {
  const liste = Array.isArray(domainler) ? domainler : [domainler];
  const küme = new Set(liste.map(domainNormalle));
  let sayi = 0;
  for (const s of veri.siteler) {
    if (küme.has(s.domain)) {
      if (typeof alanlar.durum === 'string') s.durum = alanlar.durum;
      if (typeof alanlar.not === 'string') s.not = alanlar.not;
      sayi++;
    }
  }
  kaydet();
  return sayi;
}

function ayarKaydet(yeni) {
  ayarlar = { ...ayarlar, ...yeni };
  if (ayarDosya) fs.writeFileSync(ayarDosya, JSON.stringify(ayarlar, null, 2));
}
function ayarGetir() { return ayarlar; }

// DataForSEO kullanıcı adı/şifresini tamamen sil
function dfsAnahtariSil() {
  delete ayarlar.dfsLogin;
  delete ayarlar.dfsPassword;
  if (ayarDosya) fs.writeFileSync(ayarDosya, JSON.stringify(ayarlar, null, 2));
}

module.exports = {
  baslat, kaydet, ekle, tumSiteler, siteSayisi, topluYukle, kayitGuncelle,
  ayarKaydet, ayarGetir, dfsAnahtariSil, domainNormalle,
};
