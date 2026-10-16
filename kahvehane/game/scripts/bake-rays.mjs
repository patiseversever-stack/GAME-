// Dönen ışın çarkı görsellerini pişirir: src/ui/img/rays-{white,gold}.webp — ışınlar VE yumuşak kenar sönümü görselin
// içinde (maske yok). Market önizlemelerinin arkasında <img class="kh-srays kh-keep"> olarak yalnız transform ile döner
// (bileşimci; boyama/stil yok). Renk tonu CSS opaklığıyla, zemin rengi altta kalır. Kullanım: node scripts/bake-rays.mjs
// Geometri eski repeating-conic-gradient ile aynı: 20°'lik dönemde 7° ışın (18 ışın).
import {chromium} from 'playwright-core';
import {execFileSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIZE = 512;
/** Görseldeki en yüksek saydamlık: ekranda gereken en parlak ışın ~0.35. Dar aralık + kayıpsız saydamlık = halka/bant
 *  olmadan ~35 KB. Kullanım yerinde CSS opacity = istenen / MAX_ALPHA (src/ui/shop.css .kh-srays). */
const MAX_ALPHA = 0.4;
const VARIANTS = {white: [255, 255, 255], gold: [255, 222, 120]};
const b = await chromium.launch();
try {
  const p = await b.newPage();
  for (const [name, rgb] of Object.entries(VARIANTS)) {
    const url = await p.evaluate(([S, rgb]) => {
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const g = c.getContext('2d');
      const R = S / 2;
      // ışınlar (merkezden kenara dilimler)
      g.fillStyle = `rgb(${rgb.join(',')})`;
      for (let i = 0; i < 18; i++) {
        const a0 = ((i * 20 - 90) * Math.PI) / 180, a1 = a0 + (7 * Math.PI) / 180;
        g.beginPath();
        g.moveTo(R, R);
        g.arc(R, R, R, a0, a1);
        g.closePath();
        g.fill();
      }
      // sönüm: merkezde tam, ortada ~yarı, kenarda sıfır (yumuşak eğri). Merkezdeki iğne ucu birleşimi biraz yumuşatılır.
      const f = g.createRadialGradient(R, R, 0, R, R, R);
      const stops = [[0, 0.75], [0.06, 1], [0.3, 0.82], [0.55, 0.55], [0.78, 0.26], [0.92, 0.08], [1, 0]];
      for (const [o, a] of stops) f.addColorStop(o, `rgba(0,0,0,${a})`);
      g.globalCompositeOperation = 'destination-in';
      g.fillStyle = f;
      g.fillRect(0, 0, S, S);
      return c.toDataURL('image/png');
    }, [SIZE, rgb]);
    const out = path.join(root, `src/ui/img/rays-${name}.webp`);
    const png = out.replace(/\.webp$/, '.tmp.png');
    fs.writeFileSync(png, Buffer.from(url.split(',')[1], 'base64'));
    // WebP: renk her yerde sabit (desen yalnız saydamlıkta), saydamlık 0..MAX_ALPHA kayıpsız → bant yok (tuvalin kendi
    // kodlayıcısı saydam piksellerin altını siyah bıraktığından çok daha büyük). Pillow yoksa tuval kodlayıcısına düşer
    // (o durumda saydamlık tam aralıkta kalır: CSS opaklıkları biraz düşürülmeli).
    try {
      execFileSync('python3', ['-c', `
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGBA')
base = Image.new('RGBA', im.size, tuple(int(x) for x in sys.argv[3].split(',')) + (255,))
base.putalpha(im.getchannel('A').point(lambda v: int(round(v * ${MAX_ALPHA}))))
base.save(sys.argv[2], 'WEBP', quality=80, alpha_quality=100, method=6)
`, png, out, rgb.join(',')]);
    } catch {
      console.warn('  (Pillow yok: tuval kodlayıcısı kullanıldı, dosya daha büyük)');
      const w = await p.evaluate(async u => {
        const img = new Image();
        img.src = u;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        return c.toDataURL('image/webp', 0.86);
      }, url);
      fs.writeFileSync(out, Buffer.from(w.split(',')[1], 'base64'));
    }
    fs.unlinkSync(png);
    console.log(`✓ ${path.relative(root, out)}  ${(fs.statSync(out).size / 1024).toFixed(1)} KB`);
  }
} finally {
  await b.close();
}
