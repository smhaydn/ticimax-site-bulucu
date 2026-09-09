// ============================================================================
//  test.js — Motorun kendi kendini kontrolü (bağımlılık: cheerio)
//  Çalıştır:  node test.js
//  Gerçek Ticimax sitelerinden alınmış örnek parçalarla mantığı doğrular.
// ============================================================================

const assert = require('assert');
const cheerio = require('cheerio');
const motor = require('./motor');

const iller = require('./veri/iller.json');
let gecen = 0;
function kontrol(ad, kosul) {
  assert.ok(kosul, 'BAŞARISIZ: ' + ad);
  gecen++;
  console.log('  ✓ ' + ad);
}

console.log('Motor testleri çalışıyor...\n');

// --- 1) Ticimax doğrulama ---
kontrol('cultureSettings izi Ticimax sayılır',
  motor.ticimaxMi('<div>cultureSettings.RegionId: 0</div>'));
kontrol('footer yazısı Ticimax sayılır',
  motor.ticimaxMi('Bu site Ticimax® Gelişmiş E-Ticaret sistemleri ile hazırlanmıştır'));
kontrol('static.ticimax.cloud izi Ticimax sayılır',
  motor.ticimaxMi('<img src="https://static.ticimax.cloud/1/x.png">'));
kontrol('rakip platform (softtr / "ticimax entegrasyonu") Ticimax SAYILMAZ',
  motor.ticimaxMi('prapazar pazaryeri ticimax entegrasyonu — softtr ile hazırlanmıştır') === false);

// --- 2) Telefon çöp ayıklama ---
const telHtml = `<html><body>
  <a href="tel:05263157894">Ara</a>
  İletişim: 0532 780 51 00 — Faks: 00000000000
</body></html>`;
const $tel = cheerio.load(telHtml);
const tel = motor.telefonlariAyikla($tel, telHtml);
kontrol('geçerli mobil numara bulunur', tel === '05263157894');
kontrol('00000000000 çöpü elenir', motor.telGecerli('00000000000') === false);
kontrol('05555555555 (tekrar rakam) elenir', motor.telGecerli('05555555555') === false);
kontrol('normal sabit hat geçerli', motor.telGecerli('02121234567') === true);
kontrol('kısa numara geçersiz', motor.telGecerli('1234') === false);

// --- 3) Mail çöp ayıklama ---
const mailHtml = `<a href="mailto:info@haydigiy.com">mail</a>
  logo@2x.png destek@sentry.io`;
const $mail = cheerio.load(mailHtml);
const mail = motor.mailleriAyikla($mail, mailHtml, 'haydigiy.com');
kontrol('gerçek mail bulunur, .png ve sentry çöpü elenir', mail === 'info@haydigiy.com');

// --- 4) Instagram hesabı ---
const igHtml = `<a href="https://instagram.com/haydigiy">ig</a>
  <a href="https://www.instagram.com/p/ABC123">gönderi</a>`;
const $ig = cheerio.load(igHtml);
const ig = motor.instagramAyikla($ig, igHtml);
kontrol('instagram hesabı bulunur, /p/ gönderisi elenir', ig === 'https://instagram.com/haydigiy');

// --- 5) Şehir bulma ---
const adres = '1.organize sanayi bölgesi 6. cadde no:1 SİVAS/Merkez';
kontrol('adresten şehir (Sivas) bulunur', motor.sehirBul(adres, iller) === 'Sivas');
kontrol('şehir yoksa boş döner', motor.sehirBul('sadece bir açıklama metni', iller) === '');

// --- 6) Uçtan uca bilgi çıkarma ---
const tamHtml = `<html><body>
  <a href="tel:02123334455">telefon</a>
  <a href="mailto:iletisim@femias.com.tr">mail</a>
  <a href="https://instagram.com/femias">takip</a>
  Adres: İstanbul / Türkiye
  cultureSettings.RegionId: 0
</body></html>`;
const bilgi = motor.bilgiCikar(tamHtml, 'femias.com.tr', iller);
kontrol('uçtan uca: telefon', bilgi.telefon === '02123334455');
kontrol('uçtan uca: mail', bilgi.mail === 'iletisim@femias.com.tr');
kontrol('uçtan uca: instagram', bilgi.instagram === 'https://instagram.com/femias');
kontrol('uçtan uca: şehir', bilgi.sehir === 'İstanbul');

console.log('\nTÜM TESTLER GEÇTİ (' + gecen + ' kontrol).');
