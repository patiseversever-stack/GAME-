// Masa küçük resimlerini PİŞİRİR (scripts/bake-tables.mjs bu sayfayı açar, sonucu src/ui/tablepv/<id>.webp yazar).
// Her boyalı masa, temanın GÜNCEL paint() çizimiyle, ürün penceresindeki sahneyle aynı oranda çizilir (src/ui/previews.ts
// TABLE_BAKE). Market ızgarası, vitrin, setler, koleksiyon ve "Dene"/ürün penceresi (canlı boya gelene dek) bunu gösterir.
// Elle: /dev/tablebake.html (?only=bogaz) — resimleri ve boyutlarını gösterir.
import {TABLES} from '../src/themes/tables';
import {FULL_BAKE, TABLE_BAKE, TABLE_THUMB, TABLE_ZOOM, THUMB} from '../src/ui/tablepv';

const only = new URLSearchParams(location.search).get('only');
// boyanın yığın halkası (themes/paint.ts spotOf): yüksekliğin %45.5'i
const RING_Y = 0.455;

interface Out {
  id: string;
  file: string;
  url: string;
  bytes: number;
  ms: number;
}

const toUrl = async (c: HTMLCanvasElement, q: number): Promise<{url: string; bytes: number} | null> => {
  const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/webp', q));
  if (!blob) return null;
  const url = await new Promise<string>(r => {
    const fr = new FileReader();
    fr.onload = () => r(fr.result as string);
    fr.readAsDataURL(blob);
  });
  return {url, bytes: blob.size};
};

function show(label: string, url: string, w: number): void {
  const img = new Image();
  img.src = url;
  img.style.cssText = `display:inline-block;vertical-align:top;width:${w}px;margin:4px 8px 14px 0`;
  const lab = document.createElement('div');
  lab.textContent = label;
  document.body.append(lab, img);
}

async function bake(): Promise<Out[]> {
  const out: Out[] = [];
  for (const t of TABLES) {
    if (!t.paint || (only && t.id !== only)) continue;
    const t0 = performance.now();
    // 1) satış küçük resmi: oyun oranında büyük çiz, imzayı kırp
    const big = await t.paint(TABLE_BAKE.w, TABLE_BAKE.h, TABLE_BAKE.dpr);
    const bw = big.width, bh = big.height;
    const z = TABLE_ZOOM[t.id] ?? {w: 1, x: 0};
    const sw = bw * z.w, sx = bw * z.x;
    const sh = Math.min(bh, (sw * THUMB.h) / THUMB.w);
    const sy = TABLE_THUMB[t.id] === 'top' ? 0 : Math.max(0, Math.min(bh - sh, bh * RING_Y - sh / 2));
    const c = document.createElement('canvas');
    c.width = THUMB.w;
    c.height = THUMB.h;
    const g = c.getContext('2d')!;
    g.imageSmoothingQuality = 'high';
    g.drawImage(big, sx, sy, sw, sh, 0, 0, THUMB.w, THUMB.h);
    big.width = big.height = 0;
    const a = await toUrl(c, TABLE_BAKE.q);
    // 2) büyük sahne yer tutucusu: canlı boyayla aynı oran, düşük çözünürlük
    const full = await t.paint(FULL_BAKE.w, FULL_BAKE.h, FULL_BAKE.dpr);
    const f = document.createElement('canvas');
    f.width = Math.round(FULL_BAKE.w * FULL_BAKE.dpr);
    f.height = Math.round(FULL_BAKE.h * FULL_BAKE.dpr);
    const fg = f.getContext('2d')!;
    fg.imageSmoothingQuality = 'high';
    fg.drawImage(full, 0, 0, f.width, f.height);
    const b = await toUrl(f, FULL_BAKE.q);
    const ms = performance.now() - t0;
    if (a) {
      out.push({id: t.id, file: `${t.id}.webp`, url: a.url, bytes: a.bytes, ms});
      show(`${t.id}: ${(a.bytes / 1024).toFixed(1)} KB · ${ms.toFixed(0)} ms`, a.url, 168);
    }
    if (b) {
      out.push({id: t.id, file: `${t.id}.full.webp`, url: b.url, bytes: b.bytes, ms: 0});
      show(`${t.id} (yer tutucu): ${(b.bytes / 1024).toFixed(1)} KB`, b.url, 100);
    }
  }
  return out;
}

const win = window as unknown as {__bake: Promise<Out[]>; __ids: string[]};
win.__ids = TABLES.filter(t => t.paint).map(t => t.id);
win.__bake = bake();
win.__bake.then(() => (document.body.dataset.ready = '1')).catch(e => {
  document.body.dataset.ready = 'err';
  console.error(e);
});
