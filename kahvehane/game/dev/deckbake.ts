// Deste vitrin şeritlerini PİŞİRİR (scripts/bake-decks.mjs bu sayfayı açar, sonucu src/ui/deckpv/<id>.webp yazar).
// Düzen src/ui/deckpv.ts'teki sabitlerden gelir: [arka, A♠, J♥, K♣, Q♦, 10♦] yan yana, aralarında saydam boşluk.
// Elle: /dev/deckbake.html (?only=iznik) — şeritleri ve boyutlarını gösterir.
import {DECKS} from '../src/skins/index';
import {PV_CARDS, PV_W, PV_H, PV_GAP, PV_QUALITY} from '../src/ui/deckpv';

const only = new URLSearchParams(location.search).get('only');

interface Out {
  id: string;
  url: string;
  bytes: number;
  prepMs: number;
  drawMs: number;
}

async function bake(): Promise<Out[]> {
  const out: Out[] = [];
  for (const d of DECKS) {
    if (only && d.id !== only) continue;
    const skin = await d.load();
    const t1 = performance.now();
    await skin.prepare();
    const t2 = performance.now();
    const n = PV_CARDS.length;
    const c = document.createElement('canvas');
    c.width = n * PV_W + (n - 1) * PV_GAP;
    c.height = PV_H;
    const g = c.getContext('2d')!;
    for (const [i, card] of PV_CARDS.entries()) {
      const cc = document.createElement('canvas');
      cc.width = PV_W;
      cc.height = PV_H;
      const gg = cc.getContext('2d')!;
      if (card === 'back') skin.drawBack(gg, PV_W, PV_H);
      else skin.drawFace(gg, PV_W, PV_H, card[0], card[1]);
      g.drawImage(cc, i * (PV_W + PV_GAP), 0);
    }
    const t3 = performance.now();
    const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/webp', PV_QUALITY));
    if (!blob) continue;
    const url = await new Promise<string>(r => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result as string);
      fr.readAsDataURL(blob);
    });
    out.push({id: d.id, url, bytes: blob.size, prepMs: t2 - t1, drawMs: t3 - t2});
    const img = new Image();
    img.src = url;
    img.style.cssText = 'display:block;max-width:100%;margin:6px 0 16px';
    const lab = document.createElement('div');
    lab.textContent = `${d.id}: ${(blob.size / 1024).toFixed(1)} KB · hazırlık ${(t2 - t1).toFixed(0)} ms · çizim ${(t3 - t2).toFixed(0)} ms`;
    document.body.append(lab, img);
  }
  return out;
}

const w = window as unknown as {__bake: Promise<Out[]>};
w.__bake = bake();
w.__bake.then(() => (document.body.dataset.ready = '1')).catch(e => {
  document.body.dataset.ready = 'err';
  console.error(e);
});
