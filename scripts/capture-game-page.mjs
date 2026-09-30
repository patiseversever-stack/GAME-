// Oyunun kendi PaperPainter'ı ile GERÇEK bulmaca sayfasını yüksek çözünürlükte PNG olarak çıkarır (video dokusu),
// ayrıca yatay/dikey telefonlarda oyunun ilk "tam sayfa" karesini ve sayfa köşelerini kaydeder (çıkış eşleşmesi için).
import fs from 'node:fs';
import path from 'node:path';
import { launch, newPage, VIEWS, root } from './verify/lib.mjs';
const file = 'file://' + path.join(root, 'game', 'Gece_Postasi_Yatay_Hafif.html');
const out = path.join(root, 'remotion', 'public', 'img');
const browser = await launch();
const { page } = await newPage(browser, VIEWS['land-mid'], 1);
await page.goto(file, { waitUntil: 'commit' });
await page.waitForFunction(() => window.game && window.Posta, null, { timeout: 170000, polling: 200 });
const b64 = await page.evaluate(() => {
  const S = 2, c = document.createElement('canvas'); c.width = 1800 * S; c.height = 1160 * S;
  const x = c.getContext('2d'); x.setTransform(S, 0, 0, S, 0, 0); window.game.print.paint(x, true);
  return c.toDataURL('image/png').split(',')[1];
});
fs.writeFileSync(path.join(out, 'sayfa-gercek.png'), Buffer.from(b64, 'base64'));
console.log('sayfa-gercek.png', Buffer.from(b64, 'base64').length);
await browser.close();
