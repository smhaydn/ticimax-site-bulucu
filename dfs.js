// ============================================================================
//  dfs.js — DataForSEO istemcisi
//  "HTML'inde 'ticimax' geçen Türk sitelerini" tek seferde çeker.
//  Domain + telefon + mail + instagram + başlık/açıklama gelir.
// ============================================================================

const axios = require('axios');
const motor = require('./motor');

const URL = 'https://api.dataforseo.com/v3/domain_analytics/technologies/domains_by_html_terms/live';

// Instagram URL'sinden temiz hesap adresi
function igNormalle(url) {
  const yasak = ['p', 'reel', 'reels', 'explore', 'tv', 'stories', 'accounts', ''];
  const m = (url || '').match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
  if (m && !yasak.includes(m[1].toLowerCase())) return 'https://instagram.com/' + m[1];
  return '';
}

// DataForSEO'dan gelen bir kaydı bizim biçimimize çevir
function donustur(item) {
  const tel = (item.phone_numbers || [])
    .map(motor.telNormalle).find(motor.telGecerli) || '';
  const mail = (item.emails || [])
    .map((m) => (m || '').toLowerCase())
    .find((m) => m && !/\.(png|jpe?g|gif|svg)$|sentry|wixpress|ticimax\.com/i.test(m)) || '';
  let ig = '';
  for (const u of (item.social_graph_urls || [])) {
    ig = igNormalle(u); if (ig) break;
  }
  const sektor = motor.sektorTahmin(
    `${item.title || ''} ${item.description || ''} ${(item.meta_keywords || []).join(' ')}`
  );
  return {
    domain: item.domain, telefon: tel, mail, instagram: ig,
    sehir: '', sektor, kaynak: 'dataforseo', ticimax: true,
  };
}

// Tek bir arama terimi için tüm sayfaları çek
async function tekTerimCek(auth, terim, kalanKota) {
  const bulunan = [];
  let offset = 0, offsetToken = null, toplam = null;
  const sayfaBoyu = 1000;
  while (bulunan.length < kalanKota) {
    // Ülke filtresi YOK: Ticimax yalnızca Türk sitelerinde bulunur; ayrıca
    // Cloudflare/AWS arkasındaki Türk siteleri "ABD" sanılıp elenmesin diye.
    const gorev = {
      search_terms: [terim],
      order_by: ['domain_rank,desc'],
      limit: Math.min(sayfaBoyu, kalanKota - bulunan.length),
    };
    if (offsetToken) gorev.offset_token = offsetToken; else gorev.offset = offset;

    const yanit = await axios.post(URL, [gorev], {
      auth, timeout: 90000, headers: { 'content-type': 'application/json' },
    });
    const g = yanit.data && yanit.data.tasks && yanit.data.tasks[0];
    if (!g || g.status_code !== 20000) {
      throw new Error('DataForSEO: ' + ((g && g.status_message) || 'bilinmeyen hata'));
    }
    const res = g.result && g.result[0];
    if (!res) break;
    toplam = res.total_count;
    const items = res.items || [];
    items.forEach((it) => bulunan.push(donustur(it)));
    offsetToken = res.offset_token;
    offset += items.length;
    if (items.length < gorev.limit) break;
    if (toplam != null && bulunan.length >= toplam) break;
  }
  return bulunan;
}

// Ticimax + Türkiye sitelerini çek.
// Birden fazla iz arar (footer silinmiş siteleri de yakalamak için) ve birleştirir.
// onIlerleme({toplanan}) çağrılır. enUst: toplam benzersiz site üst sınırı (maliyet kontrolü).
async function cek({ login, password, terimler, enUst = 5000, onIlerleme }) {
  if (!login || !password) throw new Error('DataForSEO kullanıcı adı/şifre eksik. Ayarlardan gir.');
  const auth = { username: login, password };
  // En geniş iz (her Ticimax sitesinde bulunur, footer silinse bile) önce.
  const izler = (terimler && terimler.length)
    ? terimler
    : ['cultureSettings.RegionId', 'ticimax', 'static.ticimax.cloud'];

  const harita = new Map();     // domain -> kayıt (tekilleştirme)
  let faturalanan = 0;          // DataForSEO'dan çekilen toplam kayıt = maliyet birimi
  let sonHata = null;

  for (const terim of izler) {
    if (faturalanan >= enUst) break;         // maliyet tavanı
    const kalanKota = enUst - faturalanan;   // kalan bütçe kadar çek
    let liste = [];
    try {
      liste = await tekTerimCek(auth, terim, kalanKota);
    } catch (e) { sonHata = e; continue; }
    faturalanan += liste.length;
    for (const k of liste) {
      const d = (k.domain || '').replace(/^www\./, '');
      if (!harita.has(d)) harita.set(d, k);
    }
    if (onIlerleme) onIlerleme({ toplanan: harita.size, faturalanan });
  }
  if (harita.size === 0 && sonHata) throw sonHata;  // hiçbir şey gelmediyse hatayı bildir
  const siteler = [...harita.values()];
  return { siteler, toplam: siteler.length };
}

module.exports = { cek, tekTerimCek, donustur, sektorTahmin: motor.sektorTahmin, igNormalle };
