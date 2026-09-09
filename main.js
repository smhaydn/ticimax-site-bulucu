// ============================================================================
//  Ticimax Site Bulucu — Ana süreç
//  - Pencereyi açar
//  - DataForSEO'dan Ticimax sitelerini çeker ve yerel veritabanına kaydeder
//  - Her siteye girip telefon / mail / instagram / şehir bilgisini tamamlar
//  - Sonuçları arayüze verir, filtreletir, Excel'e aktarır
// ============================================================================

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const XLSX = require('xlsx');
const motor = require('./motor');
const depo = require('./depo');
const dfs = require('./dfs');

// ---- Ayarlar (gerçek dünyaya göre ince ayar yapılabilir) -------------------
const ESZAMANLI = 10;       // aynı anda kaç site taranacak
const ZAMAN_ASIMI = 12000;  // her istek için zaman aşımı (milisaniye)
const TARAYICI_KIMLIGI =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// Hem geliştirme (npm start) hem kurulu (.exe) sürüm AYNI veri klasörünü kullansın
// (yoksa kurulu sürüm boş veritabanıyla başlar, 4.161 firma görünmez).
app.setName('ticimax-site-bulucu');

let pencere = null;
let durduruldu = false;
let iller = [];

// ---- Yardımcı: paket içi dosya okuma ---------------------------------------
function jsonOku(dosyaAdi) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, dosyaAdi), 'utf-8'));
}

// ---- Tek bir siteyi indir --------------------------------------------------
async function siteIndir(url) {
  const yanit = await axios.get(url, {
    timeout: ZAMAN_ASIMI,
    maxRedirects: 5,
    headers: {
      'User-Agent': TARAYICI_KIMLIGI,
      'Accept-Language': 'tr-TR,tr;q=0.9',
      'Accept': 'text/html,application/xhtml+xml',
    },
    validateStatus: (s) => s >= 200 && s < 400,
  });
  return typeof yanit.data === 'string' ? yanit.data : String(yanit.data);
}

// ---- Bir siteyi ziyaret edip bilgilerini tamamla ---------------------------
async function siteyiZiyaretEt(domain) {
  const anaAdresler = ['https://www.' + domain + '/', 'https://' + domain + '/'];
  let html = null;
  for (const adr of anaAdresler) {
    try { html = await siteIndir(adr); break; } catch (e) { /* diğerini dene */ }
  }
  if (!html) return { domain, ulasildi: false };

  const ticimax = motor.ticimaxMi(html);
  let b = motor.bilgiCikar(html, domain, iller);

  if (!b.telefon || !b.mail || !b.sehir) {
    for (const yol of ['iletisim', 'iletisim.aspx', 'Iletisim', 'iletisim-bilgileri', 'bize-ulasin']) {
      if (b.telefon && b.mail && b.sehir) break;
      try {
        const h2 = await siteIndir('https://www.' + domain + '/' + yol);
        const b2 = motor.bilgiCikar(h2, domain, iller);
        b.telefon = b.telefon || b2.telefon;
        b.mail = b.mail || b2.mail;
        b.sehir = b.sehir || b2.sehir;
        b.instagram = b.instagram || b2.instagram;
      } catch (e) { /* yoksa geç */ }
    }
  }
  return { domain, ulasildi: true, ticimax, telefon: b.telefon, mail: b.mail, instagram: b.instagram, sehir: b.sehir, sektor: b.sektor };
}

// ---- Sınırlı eşzamanlılıkla havuz çalıştır ---------------------------------
async function havuzdaCalistir(liste, limit, isFn) {
  let sonraki = 0;
  const isciler = [];
  for (let w = 0; w < limit; w++) {
    isciler.push((async () => {
      while (sonraki < liste.length && !durduruldu) {
        const idx = sonraki++;
        await isFn(liste[idx], idx);
      }
    })());
  }
  await Promise.all(isciler);
}

// ============================ ELECTRON PENCERE ==============================
function pencereOlustur() {
  pencere = new BrowserWindow({
    width: 1320, height: 840, minWidth: 980, minHeight: 620,
    backgroundColor: '#0f1115',
    title: 'Ticimax Site Bulucu',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  pencere.setMenuBarVisibility(false);
  pencere.loadFile('index.html');
}

app.whenReady().then(() => {
  depo.baslat(app.getPath('userData'));
  try { iller = jsonOku(path.join('veri', 'iller.json')); } catch (e) { iller = []; }

  // Veri yoksa ya da yalnızca eski küçük tohum (73) varsa, pakete gömülü
  // güncel listeyi (baslangic-verisi.json) yükle. Böylece .exe her bilgisayara
  // dolu gider. Gerçek veri (binlerce kayıt) varsa dokunma (kullanıcının
  // durum/not düzenlemeleri korunur).
  if (depo.siteSayisi() < 200) {
    try {
      const baslangic = jsonOku('baslangic-verisi.json');
      if (Array.isArray(baslangic) && baslangic.length > 0) {
        depo.topluYukle(baslangic);
        console.log('[TICIMAX] Başlangıç verisi yüklendi:', baslangic.length);
      }
    } catch (e) {
      try {
        jsonOku('hedef_siteler.json').forEach((k) => depo.ekle({ ...k, kaynak: 'tohum' }));
        depo.kaydet();
      } catch (e2) { /* tohum da yoksa boş başla */ }
    }
  }

  console.log('[TICIMAX] Veri klasörü:', app.getPath('userData'));
  console.log('[TICIMAX] Veritabanı kayıt sayısı:', depo.siteSayisi());
  pencereOlustur();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) pencereOlustur(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ============================ IPC OLAYLARI ==================================

// Veritabanındaki tüm siteleri arayüze ver
ipcMain.handle('db-yukle', () => depo.tumSiteler());

// Mevcut sektörler (filtre menüsü için)
ipcMain.handle('sektorleri-getir', () =>
  [...new Set(depo.tumSiteler().map((s) => s.sektor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr')));

// Ayarları getir (şifreyi geri göndermeyiz, sadece dolu mu bilgisi)
ipcMain.handle('ayar-getir', () => {
  const a = depo.ayarGetir();
  return { dfsLogin: a.dfsLogin || '', sifreVar: !!a.dfsPassword };
});
ipcMain.on('ayar-kaydet', (_e, ayar) => {
  const yeni = { dfsLogin: ayar.dfsLogin || '' };
  if (ayar.dfsPassword) yeni.dfsPassword = ayar.dfsPassword; // boşsa eskisini koru
  depo.ayarKaydet(yeni);
});
ipcMain.on('ayar-sil', () => depo.dfsAnahtariSil());

// Satış takibi: durum/not güncelle (tek veya çoklu firma)
ipcMain.handle('kayit-guncelle', (_e, domainler, alanlar) => depo.kayitGuncelle(domainler, alanlar));

// DataForSEO'dan Ticimax sitelerini çek
ipcMain.on('dfs-cek', async (_e, opt) => {
  const a = depo.ayarGetir();
  if (!a.dfsLogin || !a.dfsPassword) {
    pencere.webContents.send('dfs-bitti', { hata: 'Önce ayarlardan DataForSEO kullanıcı adı ve şifreni gir.' });
    return;
  }
  let yeni = 0, guncel = 0;
  try {
    const { toplam } = await dfs.cek({
      login: a.dfsLogin,
      password: a.dfsPassword,
      enUst: (opt && opt.enUst) || 5000,
      onIlerleme: ({ toplanan, toplam }) =>
        pencere.webContents.send('dfs-ilerleme', { toplanan, toplam }),
    }).then((r) => {
      r.siteler.forEach((s) => { (depo.ekle(s) === 'yeni') ? yeni++ : guncel++; });
      depo.kaydet();
      return r;
    });
    pencere.webContents.send('dfs-bitti', { yeni, guncel, toplam, dbToplam: depo.siteSayisi() });
  } catch (e) {
    pencere.webContents.send('dfs-bitti', { hata: e.message });
  }
});

// Veritabanındaki siteleri gezip iletişim bilgilerini tamamla
ipcMain.on('tarama-baslat', async (_e, opt) => {
  durduruldu = false;
  const hepsi = depo.tumSiteler();
  // Sadece daha önce taranmamış ya da telefon+mail'i eksik olanları gez
  // Henüz taranmamış (motorla ziyaret edilmemiş) tüm siteleri gez.
  // Böylece DataForSEO'dan gelenlerin sektörü de siteden düzeltilir.
  const hedef = (opt && opt.hepsiniTara) ? hepsi : hepsi.filter((s) => !s.tarandi);

  const toplam = hedef.length;
  let tamamlanan = 0, guncellenen = 0;

  await havuzdaCalistir(hedef, ESZAMANLI, async (kayit) => {
    let z;
    try { z = await siteyiZiyaretEt(kayit.domain); } catch (e) { z = { domain: kayit.domain, ulasildi: false }; }
    tamamlanan++;
    if (z.ulasildi) {
      depo.ekle({
        domain: z.domain, telefon: z.telefon, mail: z.mail,
        instagram: z.instagram, sehir: z.sehir, sektor: z.sektor,
        ticimax: z.ticimax, tarandi: true, kaynak: 'tarama',
      });
      guncellenen++;
      if (tamamlanan % 10 === 0) depo.kaydet();
    }
    pencere.webContents.send('tarama-ilerleme', { tamamlanan, toplam, domain: kayit.domain, ulasildi: z.ulasildi });
  });

  depo.kaydet();
  pencere.webContents.send('tarama-bitti', { toplam, guncellenen, durduruldu });
});

ipcMain.on('tarama-durdur', () => { durduruldu = true; });

ipcMain.on('disari-ac', (_e, url) => {
  if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) shell.openExternal(url);
});

ipcMain.handle('excele-aktar', async (_e, satirlar) => {
  const { canceled, filePath } = await dialog.showSaveDialog(pencere, {
    title: 'Excel olarak kaydet',
    defaultPath: 'ticimax-siteler.xlsx',
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
  if (canceled || !filePath) return { ok: false };

  const veri = satirlar.map((s) => ({
    'Web Adresi': s.domain,
    'Telefon': s.telefon || '',
    'Mail': s.mail || '',
    'Instagram': s.instagram || '',
    'Sektör': s.sektor || '',
    'Şehir': s.sehir || '',
    'Durum': s.durum || 'Yeni',
    'Not': s.not || '',
  }));
  const ws = XLSX.utils.json_to_sheet(veri);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ticimax Siteleri');
  XLSX.writeFile(wb, filePath);
  return { ok: true, filePath };
});
