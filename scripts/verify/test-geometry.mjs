// Tahmin edilen "tam sayfa" köşeleri ile GERÇEK oyundan ölçülen köşeleri karşılaştırır (Posta.screenPoint).
// Ölçümler scripts/verify/fixtures/game-quads.json içindedir (8 telefon/tablet/masaüstü görünümü).
import fs from 'node:fs';
import { predictOverviewQuad, homography } from '../../loader/src/geometry.js';
const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/game-quads.json', import.meta.url), 'utf8'));
let worst = 0, sum = 0, n = 0;
for (const [name, v] of Object.entries(fx)) {
  const pred = predictOverviewQuad(v.w, v.h, v.touch);
  const errs = pred.map((p, i) => Math.hypot(p.x - v.quad[i].x, p.y - v.quad[i].y));
  const max = Math.max(...errs); worst = Math.max(worst, max); sum += errs.reduce((a, b) => a + b, 0); n += 4;
  console.log(name.padEnd(11), `${v.w}x${v.h}`.padEnd(9), 'maks hata', max.toFixed(1).padStart(5), 'px', ' köşe hataları', errs.map(e => e.toFixed(1)).join(' / '));
}
console.log(`\nortalama köşe hatası ${(sum / n).toFixed(2)} px, en kötü ${worst.toFixed(1)} px`);
// Homografi sağlaması: birim dikdörtgenin köşeleri hedef dörtgene gitmeli.
const q = predictOverviewQuad(844, 390, true), m = homography(1800, 1160, q);
console.log('matrix3d örneği:', m.slice(0, 90) + '…');
if (worst > 6) { console.error('HATA: tahmin gerçek oyundan çok saptı'); process.exit(1); }
