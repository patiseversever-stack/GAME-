// Masa küçük resimlerini PİŞİRİR (scripts/bake-tables.mjs bu sayfayı açar, sonucu src/ui/tablepv/<id>.webp yazar).
// Her boyalı masa, temanın GÜNCEL paint() çizimiyle, ürün penceresindeki sahneyle aynı oranda çizilir (src/ui/previews.ts
// TABLE_BAKE). Market ızgarası, vitrin, setler, koleksiyon ve "Dene"/ürün penceresi (canlı boya gelene dek) bunu gösterir.
// Elle: /dev/tablebake.html (?only=bogaz) — resimleri ve boyutlarını gösterir.
import {TABLES} from '../src/themes/tables';
import {TABLE_BAKE} from '../src/ui/tablepv';

const only = new URLSearchParams(location.search).get('only');

interface Out {
  id: string;
  url: string;
  bytes: number;
  ms: number;
}

async function bake(): Promise<Out[]> {
  const out: Out[] = [];
  const {w, h, dpr, q} = TABLE_BAKE;
  for (const t of TABLES) {
    if (!t.paint || (only && t.id !== only)) continue;
    const t0 = performance.now();
    const src = await t.paint(w, h, dpr);
    // boya daha düşük çözünürlükte dönebilir: hedef boya gerilerek çizilir (oyundaki gibi)
    const c = document.createElement('canvas');
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const g = c.getContext('2d')!;
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, c.width, c.height);
    const ms = performance.now() - t0;
    const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/webp', q));
    if (!blob) continue;
    const url = await new Promise<string>(r => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result as string);
      fr.readAsDataURL(blob);
    });
    out.push({id: t.id, url, bytes: blob.size, ms});
    const img = new Image();
    img.src = url;
    img.style.cssText = `display:block;width:${w}px;margin:6px 0 16px`;
    const lab = document.createElement('div');
    lab.textContent = `${t.id}: ${(blob.size / 1024).toFixed(1)} KB · çizim ${ms.toFixed(0)} ms`;
    document.body.append(lab, img);
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
