// ============================================================================
//  Arayüz mantığı: veritabanı + DataForSEO + tarama + satış takibi (mini-CRM)
// ============================================================================

let tumSonuclar = [];
const secili = new Set();                 // seçili firma domainleri
const filtre = { arama: '', sektor: '', sehir: '', durum: '', telefon: false, mail: false, instagram: false };
let siralaAlan = null, siralaYon = 1;

const DURUMLAR = ['Yeni', 'Ulaşıldı', 'İlgileniyor', 'Satıldı', 'Olmaz'];
const BIRIM_FIYAT = 15000;   // Pixra hizmet bedeli (TL) — satış başına ciro
const DURUM_SINIF = { 'Satıldı': 'durum-Satildi', 'İlgileniyor': 'durum-Ilgileniyor', 'Ulaşıldı': 'durum-Ulasildi', 'Olmaz': 'durum-Olmaz', 'Yeni': '' };
const GOSTERIM_SINIRI = 800;              // ekranda en fazla kaç satır çizilsin

const $ = (id) => document.getElementById(id);
const durumu = (s) => s.durum || 'Yeni';
// Sahte/doğrulanmamış (tarama sonucu Ticimax çıkmayan) siteleri her yerde gizle
const aktifSiteler = () => tumSonuclar.filter((s) => s.ticimax !== false);

// ---- Veritabanını yükle ----
async function verileriYukle() {
  tumSonuclar = await window.api.dbYukle();
  await sektorMenusuGuncelle();
  sehirMenusuGuncelle();
  istatGuncelle();
  tabloyuCiz();
}
async function sektorMenusuGuncelle() {
  const sektorler = await window.api.sektorleriGetir();
  const sel = $('fSektor'); const mevcut = sel.value;
  sel.innerHTML = '<option value="">Tüm sektörler</option>';
  sektorler.forEach((s) => { const o = document.createElement('option'); o.value = s; o.textContent = s; sel.appendChild(o); });
  sel.value = mevcut;
}
function sehirMenusuGuncelle() {
  const sel = $('fSehir'); const mevcut = sel.value;
  const sehirler = [...new Set(aktifSiteler().map((s) => s.sehir).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
  sel.innerHTML = '<option value="">Tüm şehirler</option>';
  sehirler.forEach((s) => { const o = document.createElement('option'); o.value = s; o.textContent = s; sel.appendChild(o); });
  sel.value = mevcut;
}
function istatGuncelle() {
  const a = aktifSiteler();
  $('statToplam').textContent = a.length;
  $('statTelefon').textContent = a.filter((s) => s.telefon).length;
  $('statMail').textContent = a.filter((s) => s.mail).length;
  $('statInsta').textContent = a.filter((s) => s.instagram).length;
  const satildi = a.filter((s) => durumu(s) === 'Satıldı').length;
  $('statSatildi').textContent = satildi;
  $('statCiro').textContent = (satildi * BIRIM_FIYAT).toLocaleString('tr-TR') + ' ₺';
}

function butonlar(kilit) {
  ['btnDfs', 'btnBaslat', 'btnExcel', 'btnAyar'].forEach((id) => $(id).disabled = kilit);
}

// ---- DataForSEO'dan çek ----
$('btnDfs').addEventListener('click', () => {
  butonlar(true);
  $('ilerlemeDolgu').style.width = '0%';
  $('ilerlemeYazi').textContent = 'DataForSEO\'dan siteler çekiliyor...';
  window.api.dfsCek({ enUst: 5000 });
});
window.api.onDfsIlerleme(({ toplanan, toplam }) => {
  const y = toplam ? Math.min(100, Math.round((toplanan / toplam) * 100)) : 0;
  $('ilerlemeDolgu').style.width = y + '%';
  $('ilerlemeYazi').textContent = `DataForSEO: ${toplanan}${toplam ? ' / ' + toplam : ''} site çekildi`;
});
window.api.onDfsBitti(async (v) => {
  butonlar(false);
  if (v && v.hata) { $('ilerlemeYazi').textContent = 'Hata: ' + v.hata; if (/ayar/i.test(v.hata)) ayarAc(); return; }
  $('ilerlemeDolgu').style.width = '100%';
  $('ilerlemeYazi').textContent = `DataForSEO bitti — ${v.yeni} yeni, ${v.guncel} güncellendi. Toplam: ${v.dbToplam} site`;
  await verileriYukle();
});

// ---- Bilgileri tamamla (tara) ----
$('btnBaslat').addEventListener('click', () => {
  butonlar(true); $('btnDurdur').hidden = false;
  $('ilerlemeDolgu').style.width = '0%';
  $('ilerlemeYazi').textContent = 'Siteler taranıyor, iletişim bilgileri tamamlanıyor...';
  window.api.taramaBaslat({});
});
$('btnDurdur').addEventListener('click', () => { window.api.taramaDurdur(); $('ilerlemeYazi').textContent += ' — durduruluyor...'; });
window.api.onIlerleme(({ tamamlanan, toplam, domain }) => {
  const y = toplam ? Math.round((tamamlanan / toplam) * 100) : 0;
  $('ilerlemeDolgu').style.width = y + '%';
  $('ilerlemeYazi').textContent = `Taranıyor: ${tamamlanan}/${toplam} — ${domain}`;
});
window.api.onBitti(async (v) => {
  butonlar(false); $('btnDurdur').hidden = true;
  if (v && v.hata) { $('ilerlemeYazi').textContent = 'Hata: ' + v.hata; return; }
  $('ilerlemeYazi').textContent = `Tarama bitti${v.durduruldu ? ' (durduruldu)' : ''} — ${v.guncellenen}/${v.toplam} site güncellendi`;
  await verileriYukle();
});

// ---- Ayarlar ----
async function ayarAc() {
  const a = await window.api.ayarGetir();
  $('ayarLogin').value = a.dfsLogin || '';
  $('ayarSifre').value = '';
  $('ayarSifre').placeholder = a.sifreVar ? '•••••••• (kayıtlı — boş bırakırsan değişmez)' : 'API password';
  $('ayarKatman').hidden = false;
}
$('btnAyar').addEventListener('click', ayarAc);
$('ayarKapat').addEventListener('click', () => { $('ayarKatman').hidden = true; });
$('ayarKaydet').addEventListener('click', () => {
  window.api.ayarKaydet({ dfsLogin: $('ayarLogin').value.trim(), dfsPassword: $('ayarSifre').value });
  $('ayarKatman').hidden = true; $('ilerlemeYazi').textContent = 'Ayarlar kaydedildi.';
});
$('ayarSil').addEventListener('click', () => {
  window.api.ayarSil();
  $('ayarLogin').value = ''; $('ayarSifre').value = '';
  $('ayarKatman').hidden = true;
  $('ilerlemeYazi').textContent = 'DataForSEO anahtarı silindi.';
});

// ---- Filtreler ----
$('arama').addEventListener('input', (e) => { filtre.arama = e.target.value.toLowerCase(); tabloyuCiz(); });
$('fSektor').addEventListener('change', (e) => { filtre.sektor = e.target.value; tabloyuCiz(); });
$('fSehir').addEventListener('change', (e) => { filtre.sehir = e.target.value; tabloyuCiz(); });
$('fDurum').addEventListener('change', (e) => { filtre.durum = e.target.value; tabloyuCiz(); });
document.querySelectorAll('.cip').forEach((cip) => {
  cip.addEventListener('click', () => {
    const alan = cip.dataset.alan; filtre[alan] = !filtre[alan];
    cip.classList.toggle('aktif', filtre[alan]); tabloyuCiz();
  });
});

// ---- Sıralama ----
document.querySelectorAll('.tablo thead th[data-sirala]').forEach((th) => {
  th.addEventListener('click', () => {
    const alan = th.dataset.sirala;
    if (siralaAlan === alan) siralaYon = -siralaYon; else { siralaAlan = alan; siralaYon = 1; }
    document.querySelectorAll('.tablo thead th').forEach((x) => x.classList.remove('sirali-asc', 'sirali-desc'));
    th.classList.add(siralaYon === 1 ? 'sirali-asc' : 'sirali-desc');
    tabloyuCiz();
  });
});

// ---- Filtre + sıralama ----
function suzulmusListe() {
  let liste = aktifSiteler().filter((s) => {
    if (filtre.sektor && s.sektor !== filtre.sektor) return false;
    if (filtre.sehir && s.sehir !== filtre.sehir) return false;
    if (filtre.durum && durumu(s) !== filtre.durum) return false;
    if (filtre.telefon && !s.telefon) return false;
    if (filtre.mail && !s.mail) return false;
    if (filtre.instagram && !s.instagram) return false;
    if (filtre.arama) {
      const havuz = `${s.domain} ${s.mail} ${s.instagram} ${s.telefon} ${s.sektor} ${s.sehir} ${s.not || ''}`.toLowerCase();
      if (!havuz.includes(filtre.arama)) return false;
    }
    return true;
  });
  if (siralaAlan) {
    liste = [...liste].sort((a, b) =>
      String((siralaAlan === 'durum' ? durumu(a) : a[siralaAlan]) || '')
        .localeCompare(String((siralaAlan === 'durum' ? durumu(b) : b[siralaAlan]) || ''), 'tr') * siralaYon);
  }
  return liste;
}

const esc = (t) => (t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// ---- Tabloyu çiz ----
function tabloyuCiz() {
  const liste = suzulmusListe();
  const govde = $('tabloGovde'); const bos = $('bosDurum');
  if (tumSonuclar.length === 0) {
    govde.innerHTML = ''; bos.hidden = false; $('sonucSayaci').textContent = '';
    return;
  }
  bos.hidden = true;
  const gosterilen = liste.slice(0, GOSTERIM_SINIRI);
  $('sonucSayaci').textContent = liste.length > GOSTERIM_SINIRI
    ? `${liste.length} sonuç — ilk ${GOSTERIM_SINIRI} gösteriliyor (filtreyle daralt)`
    : `${liste.length} sonuç gösteriliyor`;

  govde.innerHTML = gosterilen.map((s) => {
    const web = 'https://' + s.domain;
    const d = durumu(s);
    const tel = s.telefon ? `<a data-dis="tel:${s.telefon}">${s.telefon}</a>` : '<span class="bos-hucre">—</span>';
    const mail = s.mail ? `<a data-dis="mailto:${s.mail}">${s.mail}</a>` : '<span class="bos-hucre">—</span>';
    const igAd = s.instagram ? '@' + s.instagram.split('/').filter(Boolean).pop() : '';
    const secim = secili.has(s.domain) ? 'checked' : '';
    const opts = DURUMLAR.map((x) => `<option ${x === d ? 'selected' : ''}>${x}</option>`).join('');
    return `<tr>
      <td class="sec-col"><input type="checkbox" class="satir-sec" data-domain="${s.domain}" ${secim}></td>
      <td><a data-dis="${web}">${s.domain}</a></td>
      <td>${tel}</td>
      <td>${mail}</td>
      <td>${s.instagram ? `<a data-dis="${s.instagram}">${igAd}</a>` : '<span class="bos-hucre">—</span>'}</td>
      <td><span class="rozet">${s.sektor || '—'}</span></td>
      <td>${s.sehir ? s.sehir : '<span class="bos-hucre">—</span>'}</td>
      <td><select class="satir-durum ${DURUM_SINIF[d] || ''}" data-domain="${s.domain}">${opts}</select></td>
      <td><input class="satir-not" data-domain="${s.domain}" value="${esc(s.not)}" placeholder="not..."></td>
    </tr>`;
  }).join('');

  // Bağlantılar
  govde.querySelectorAll('a[data-dis]').forEach(disariBagla);
  // Seçim kutuları
  govde.querySelectorAll('.satir-sec').forEach((cb) => cb.addEventListener('change', () => {
    if (cb.checked) secili.add(cb.dataset.domain); else secili.delete(cb.dataset.domain);
    topluBariGuncelle();
  }));
  // Durum menüleri
  govde.querySelectorAll('.satir-durum').forEach((sel) => sel.addEventListener('change', async () => {
    const dom = sel.dataset.domain;
    await window.api.kayitGuncelle(dom, { durum: sel.value });
    const kayit = tumSonuclar.find((x) => x.domain === dom); if (kayit) kayit.durum = sel.value;
    istatGuncelle();
    if (filtre.durum) tabloyuCiz();  // durum filtresi açıksa listeyi tazele
  }));
  // Not kutuları (odak kaybında kaydet)
  govde.querySelectorAll('.satir-not').forEach((inp) => inp.addEventListener('change', async () => {
    const dom = inp.dataset.domain;
    await window.api.kayitGuncelle(dom, { not: inp.value });
    const kayit = tumSonuclar.find((x) => x.domain === dom); if (kayit) kayit.not = inp.value;
  }));

  $('tumSec').checked = false;
}

function disariBagla(a) {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const hedef = a.getAttribute('data-dis');
    if (hedef.startsWith('tel:')) return;
    window.api.disariAc(hedef);
  });
}
document.querySelectorAll('a[data-dis]').forEach(disariBagla);

// ---- Görünenleri seç ----
$('tumSec').addEventListener('change', (e) => {
  const gorunen = suzulmusListe().slice(0, GOSTERIM_SINIRI);
  gorunen.forEach((s) => { if (e.target.checked) secili.add(s.domain); else secili.delete(s.domain); });
  document.querySelectorAll('.satir-sec').forEach((cb) => cb.checked = e.target.checked);
  topluBariGuncelle();
});

// ---- Toplu işlem çubuğu ----
function topluBariGuncelle() {
  $('topluBar').hidden = secili.size === 0;
  $('topluSayi').textContent = secili.size + ' seçili';
}
$('topluTemizle').addEventListener('click', () => {
  secili.clear(); topluBariGuncelle();
  document.querySelectorAll('.satir-sec').forEach((cb) => cb.checked = false);
  $('tumSec').checked = false;
});
$('topluUygula').addEventListener('click', async () => {
  if (secili.size === 0) return;
  const durum = $('topluDurum').value;
  const domainler = [...secili];
  await window.api.kayitGuncelle(domainler, { durum });
  domainler.forEach((d) => { const k = tumSonuclar.find((x) => x.domain === d); if (k) k.durum = durum; });
  istatGuncelle(); tabloyuCiz();
  $('ilerlemeYazi').textContent = `${domainler.length} firma "${durum}" olarak işaretlendi.`;
});
$('topluExcel').addEventListener('click', async () => {
  if (secili.size === 0) return;
  const secilenler = tumSonuclar.filter((s) => secili.has(s.domain));
  const sonuc = await window.api.exceleAktar(secilenler);
  if (sonuc && sonuc.ok) $('ilerlemeYazi').textContent = 'Seçilenler Excel\'e aktarıldı: ' + sonuc.filePath;
});

// ---- Excel (görünen filtrelenmiş liste) ----
$('btnExcel').addEventListener('click', async () => {
  const liste = suzulmusListe();
  if (liste.length === 0) return;
  const sonuc = await window.api.exceleAktar(liste);
  if (sonuc && sonuc.ok) $('ilerlemeYazi').textContent = 'Excel kaydedildi: ' + sonuc.filePath;
});

// ---- Başlangıç ----
verileriYukle();
