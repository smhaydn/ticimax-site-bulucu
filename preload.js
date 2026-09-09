// Arayüz (index.html) ile arka plan (main.js) arasındaki güvenli köprü.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Veritabanı
  dbYukle: () => ipcRenderer.invoke('db-yukle'),
  sektorleriGetir: () => ipcRenderer.invoke('sektorleri-getir'),

  // DataForSEO
  dfsCek: (opt) => ipcRenderer.send('dfs-cek', opt || {}),
  onDfsIlerleme: (cb) => ipcRenderer.on('dfs-ilerleme', (_e, v) => cb(v)),
  onDfsBitti: (cb) => ipcRenderer.on('dfs-bitti', (_e, v) => cb(v)),

  // Ayarlar (DataForSEO kullanıcı adı/şifre)
  ayarGetir: () => ipcRenderer.invoke('ayar-getir'),
  ayarKaydet: (ayar) => ipcRenderer.send('ayar-kaydet', ayar),
  ayarSil: () => ipcRenderer.send('ayar-sil'),

  // Tarama (siteleri gezip iletişim bilgisi tamamlama)
  taramaBaslat: (opt) => ipcRenderer.send('tarama-baslat', opt || {}),
  taramaDurdur: () => ipcRenderer.send('tarama-durdur'),
  onIlerleme: (cb) => ipcRenderer.on('tarama-ilerleme', (_e, v) => cb(v)),
  onBitti: (cb) => ipcRenderer.on('tarama-bitti', (_e, v) => cb(v)),

  // Satış takibi (durum/not)
  kayitGuncelle: (domainler, alanlar) => ipcRenderer.invoke('kayit-guncelle', domainler, alanlar),

  // Dışa aktarma / bağlantı açma
  exceleAktar: (satirlar) => ipcRenderer.invoke('excele-aktar', satirlar),
  disariAc: (url) => ipcRenderer.send('disari-ac', url),
});
