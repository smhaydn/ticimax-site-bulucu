// Derlemeden önce (predist) çalışır: kullanıcının güncel veritabanını
// uygulamanın içine "başlangıç verisi" olarak gömer. Böylece .exe her yere
// dolu gider. Kaynak yoksa mevcut başlangıç verisini korur.
const fs = require('fs');
const path = require('path');
const src = path.join(process.env.APPDATA || '', 'ticimax-site-bulucu', 'veritabani.json');
const hedef = path.join(__dirname, 'baslangic-verisi.json');
try {
  const d = JSON.parse(fs.readFileSync(src, 'utf8'));
  if (d && Array.isArray(d.siteler) && d.siteler.length > 0) {
    fs.writeFileSync(hedef, JSON.stringify(d.siteler));
    console.log('[predist] Başlangıç verisi güncellendi:', d.siteler.length, 'kayıt');
  } else {
    console.log('[predist] Kaynak boş, mevcut başlangıç verisi korundu.');
  }
} catch (e) {
  console.log('[predist] Kaynak okunamadı, mevcut başlangıç verisi korundu:', e.message);
}
