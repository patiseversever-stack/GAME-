// Deste laboratuvarı (Agent B): ?deck=ebru&w=320&cards=S1,H7,D10,C11,H12,S13,B&dpr=1
// Kartları atlas hücresi boyunda çizer; prepare süresini ve uzun görevleri (longtask) ölçer.
import {DECKS} from '../src/skins/index';
import {buildSkinAtlas} from '../src/render/skinAtlas';
import type {Suit} from '../src/skins/contract';

const qs = new URLSearchParams(location.search);
const id = qs.get('deck') || 'ebru';
const W = Number(qs.get('w')) || 320;
const DPR = Number(qs.get('dpr')) || 1;
const list = (qs.get('cards') || 'S1,H7,D10,C11,H12,S13,B').split(',');
const long: number[] = [];
try {
  new PerformanceObserver(l => l.getEntries().forEach(e => long.push(Math.round(e.duration)))).observe({type: 'longtask', buffered: true});
} catch {
  /* yok */
}
async function main(): Promise<void> {
  const entry = DECKS.find(d => d.id === id);
  if (!entry) throw new Error('deste yok: ' + id);
  const t0 = performance.now();
  const skin = await entry.load();
  const t1 = performance.now();
  await skin.prepare();
  const t2 = performance.now();
  const host = document.getElementById('cards')!;
  const H = Math.round(W / 0.7);
  const td: number[] = [];
  for (const c of list) {
    const cv = document.createElement('canvas');
    cv.width = W * DPR;
    cv.height = H * DPR;
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    const g = cv.getContext('2d')!;
    g.scale(DPR, DPR);
    const s = performance.now();
    if (c === 'B') skin.drawBack(g, W, H);
    else skin.drawFace(g, W, H, c[0] as Suit, Number(c.slice(1)));
    g.getImageData(0, 0, 1, 1);
    td.push(Math.round((performance.now() - s) * 10) / 10);
    host.append(cv);
  }
  let atlasMs = -1;
  if (qs.get('atlas') === '1') {
    const a0 = performance.now();
    const at = await buildSkinAtlas(skin, Number(qs.get('aw')) || 2560);
    at.canvas.getContext('2d')!.getImageData(0, 0, 1, 1);
    atlasMs = Math.round(performance.now() - a0);
    if (qs.get('show') === '1') {
      at.canvas.style.width = '100%';
      host.append(at.canvas);
    }
  }
  await new Promise(r => setTimeout(r, 200));
  const res = {load: Math.round(t1 - t0), prepare: Math.round(t2 - t1), draw: td, atlasMs, longtasks: long};
  document.getElementById('t')!.textContent = JSON.stringify(res);
  (window as unknown as {__lab: unknown; __skin: unknown}).__lab = res;
  (window as unknown as {__skin: unknown}).__skin = skin;
  document.body.dataset.ready = '1';
}
main().catch(e => {
  console.error(e);
  document.getElementById('t')!.textContent = String(e);
  document.body.dataset.ready = 'err';
});
