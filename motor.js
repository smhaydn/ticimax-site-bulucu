// ============================================================================
//  motor.js — Ticimax doğrulama ve iletişim bilgisi çıkarma mantığı
//  Electron'a bağımlı değildir; bu sayede ayrıca test edilebilir (test.js).
// ============================================================================

const cheerio = require('cheerio');

// Ticimax'a özgü izler. Footer yazısı silinmiş olsa bile bunlardan biri
// genelde kodda kalır (çerez adı, CDN adresi, JS değişkeni).
const TICIMAX_IZLERI = [
  /cultureSettings\.RegionId/i,
  /TcmxSID/i,
  /static\.ticimax\.cloud/i,
  /ticimax\.com\/\?utm_source=footer_/i,
  /Ticimax[®\s]*Geli[şs]mi[şs]\s+E-?Ticaret/i,
  /Bu\s+Site\s+Ticimax/i,
  /Ticimax\s+Altyap/i,
  /Ticimax\s+Bili[şs]im\s+Teknolojileri/i,
];

// Bir sayfanın Ticimax olup olmadığını söyler
function ticimaxMi(html) {
  return TICIMAX_IZLERI.some((iz) => iz.test(html || ''));
}

// Türkçe karakterleri sadeleştir (şehir eşleştirmesi için)
function sadelestir(metin) {
  return (metin || '')
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
    .replace(/Ş/g, 's').replace(/ş/g, 's')
    .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u').replace(/ü/g, 'u')
    .replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c')
    .toLowerCase();
}

// ---- Sektör tahmini (metinden, yaklaşık) ----
// Sıra önemli: güçlü/özel sinyaller (pet, bebek) genel kelimelerden (çorap) ÖNCE.
const SEKTOR_KURALLARI = [
  [/kedi|k[oö]pek|\bmama\b|pet ?shop|evcil|akvaryum|ku[şs] yemi|veteriner|tasma/i, 'Pet Shop'],
  [/bebek|[çc]ocuk|oyuncak|\banne\b|kids|baby|z[ıi]b[ıi]n|emzik|kundak|mama sandalye/i, 'Bebek & Çocuk'],
  [/kozmetik|makyaj|parf[uü]m|cilt bak[ıi]m|sa[çc] bak[ıi]m|\bkrem\b|serum|\bruj\b|\boje\b|dermokozmetik|deodorant|[şs]ampuan|maskara/i, 'Kozmetik & Kişisel Bakım'],
  [/\btak[ıi]\b|g[uü]m[uü][şs]|kolye|y[uü]z[uü]k|bileklik|k[uü]pe|m[uü]cevher|p[ıi]rlanta|\balt[ıi]n\b|\bsaat\b|g[oö]zl[uü]k|bijuteri|hal?hal/i, 'Takı & Aksesuar'],
  [/i[çc] giyim|k[uü]lot|s[uü]tyen|boxer|\batlet\b|korse|gecelik|[çc]ama[şs][ıi]r|tesett[uü]r|abiye|abaya|ferace|\bmayo\b|bikini|f[ıi]stan/i, 'İç Giyim & Tesettür'],
  [/ayakkab[ıi]|sneaker|\bbot\b|[çc]izme|terlik|sandalet|\b[çc]anta\b|valiz|c[uü]zdan|\bkemer\b/i, 'Ayakkabı & Çanta'],
  [/\bspor\b|fitness|outdoor|\bkamp\b|bisiklet|kondisyon|ko[şs]u band|da[ğg]c[ıi]l[ıi]k|\byoga\b/i, 'Spor & Outdoor'],
  [/nak[ıi][şs]|[oö]rg[uü]|diki[şs]|\bhobi\b|amigurumi|boyama|el sanat|ipli[kğ]|\bt[ıi][ğg]\b|punch|boncuk/i, 'Hobi & El Sanatları'],
  [/mobilya|dekorasyon|nevresim|\bperde\b|\bhal[ıi]\b|ev tekstil|\byatak\b|mutfak|z[uü]ccaciye|ayd[ıi]nlatma|avize|[çc]i[çc]ek/i, 'Ev & Dekorasyon'],
  [/elektronik|teknoloji|cep telefon|bilgisayar|kulakl[ıi]k|ak[ıi]ll[ıi]|elektrik|kamera|[şs]arj/i, 'Elektronik & Teknoloji'],
  [/\bofis\b|k[ıi]rtasiye|nalbur|h[ıi]rdavat|yap[ıi] market|el aleti|matkap/i, 'Ofis & Hırdavat'],
  [/\bg[ıi]da\b|organik|\bbal\b|kuruyemi[şs]|baharat|\b[çc]ay\b|\bkahve\b|y[oö]resel|do[ğg]al [uü]r[uü]n|zeytin|re[çc]el/i, 'Gıda & Organik'],
  [/erkek giyim|erkek moda|erkek g[oö]mlek|damatl[ıi]k|tak[ıi]m elbise/i, 'Erkek Giyim'],
  [/kad[ıi]n giyim|elbise|\bbluz\b|\betek\b|tunik|butik|triko|penye|kad[ıi]n moda|[şs]al|e[şs]arp|g[oö]mlek|pantolon|\bceket\b|kaban|\bmont\b|t-?shirt|ti[şs][oö]rt|sweat|\bkot\b|jean|tulum|kazak|h[ıi]rka|e[şs]ofman|yelek|\bşort\b/i, 'Kadın Giyim'],
];
// Puan bazlı sektör tahmini: metinde hangi sektörün izleri EN ÇOK geçiyorsa o kazanır.
// Böylece karışık menülü sitelerde (giyim + ufak aksesuar reyonu) baskın tema doğru seçilir.
function sektorTahmin(metin) {
  const m = metin || '';
  let enIyi = 'Bilinmiyor', enYuksek = 0;
  for (const [re, sek] of SEKTOR_KURALLARI) {
    const g = new RegExp(re.source, 'gi');
    const say = (m.match(g) || []).length;
    if (say > enYuksek) { enYuksek = say; enIyi = sek; }
  }
  return enIyi;
}

// ---- Telefon: temizle ve doğrula ----
function telNormalle(ham) {
  let d = (ham || '').replace(/\D/g, '');
  if (d.startsWith('90')) d = d.slice(2);
  if (d.length === 10 && d[0] !== '0') d = '0' + d;
  return d;
}
function telGecerli(d) {
  if (!d || d.length !== 11 || d[0] !== '0') return false;
  if (/^0(\d)\1{9}$/.test(d)) return false; // 00000000000, 05555555555 gibi çöp
  if (!['2', '3', '4', '5', '8'].includes(d[1])) return false;
  return true;
}
function telefonlariAyikla($, html) {
  const bulunan = [];
  const ekle = (ham) => {
    const d = telNormalle(ham);
    if (telGecerli(d) && !bulunan.includes(d)) bulunan.push(d);
  };
  $('a[href^="tel:"]').each((i, el) => ekle(($(el).attr('href') || '').replace(/tel:/i, '')));
  const metin = $('body').text();
  const re = /(?:\+?90[\s\-().]*)?0?[\s\-().]*\(?\d{3}\)?[\s\-().]*\d{3}[\s\-().]*\d{2}[\s\-().]*\d{2}/g;
  (metin.match(re) || []).forEach(ekle);
  return bulunan.find((d) => d.startsWith('05')) ||
         bulunan.find((d) => d.startsWith('0850')) ||
         bulunan[0] || '';
}

// ---- Mail: çıkar ve çöpü ele ----
function mailleriAyikla($, html, siteDomain) {
  const set = new Set();
  const junk = /(\.(png|jpe?g|gif|webp|svg|css|js)$|sentry|wixpress|example\.|ticimax\.com|\.cloud$|godaddy)/i;
  $('a[href^="mailto:"]').each((i, el) => {
    const adr = ($(el).attr('href') || '').replace(/mailto:/i, '').split('?')[0].trim();
    if (adr) set.add(adr.toLowerCase());
  });
  const re = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  ((html || '').match(re) || []).forEach((m) => set.add(m.toLowerCase()));
  const gecerli = [...set].filter((m) => !junk.test(m));
  const kok = (siteDomain || '').replace(/^www\./, '');
  return gecerli.find((m) => m.endsWith('@' + kok) || m.endsWith('.' + kok)) ||
         gecerli[0] || '';
}

// ---- Instagram: hesabı çıkar ----
function instagramAyikla($, html) {
  const yasak = ['p', 'reel', 'reels', 'explore', 'tv', 'stories', 'accounts', 'about', ''];
  const adaylar = new Set();
  const yakala = (url) => {
    const m = (url || '').match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
    if (m && !yasak.includes(m[1].toLowerCase())) adaylar.add(m[1]);
  };
  $('a[href*="instagram.com"]').each((i, el) => yakala($(el).attr('href')));
  ((html || '').match(/instagram\.com\/[A-Za-z0-9_.]+/gi) || []).forEach(yakala);
  const ilk = [...adaylar][0];
  return ilk ? 'https://instagram.com/' + ilk : '';
}

// ---- Şehir (il) bul ----
function sehirBul(metin, iller) {
  const sade = sadelestir(metin);
  for (const il of iller) {
    const ilSade = sadelestir(il);
    if (new RegExp('(^|[^a-z])' + ilSade + '([^a-z]|$)').test(sade)) return il;
  }
  return '';
}

// ---- Bir sayfanın HTML'inden tüm bilgileri çıkar ----
function bilgiCikar(html, siteDomain, iller) {
  const $ = cheerio.load(html);
  // Sektör için odaklı metin: başlık + açıklama + anahtar kelimeler + başlıklar + menü
  const sektorMetni = [
    (siteDomain || '').replace(/\.(com|net|org|tr|co|shop|store)/g, ' ').replace(/[.\-_]/g, ' '),
    $('title').text(),
    $('meta[name="description"]').attr('content') || '',
    $('meta[name="keywords"]').attr('content') || '',
    $('h1').text(),
    $('h2').slice(0, 12).text(),
    $('nav a, .menu a, .kategori a').slice(0, 40).text(),
  ].join(' ');
  return {
    telefon: telefonlariAyikla($, html),
    mail: mailleriAyikla($, html, siteDomain),
    instagram: instagramAyikla($, html),
    sehir: sehirBul($('body').text(), iller || []),
    sektor: sektorTahmin(sektorMetni),
  };
}

module.exports = {
  TICIMAX_IZLERI, ticimaxMi, sadelestir, sektorTahmin,
  telNormalle, telGecerli, telefonlariAyikla,
  mailleriAyikla, instagramAyikla, sehirBul, bilgiCikar,
};
