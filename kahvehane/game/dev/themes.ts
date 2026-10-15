// Masa temaları + avatar çerçeveleri önizlemesi: her tema için 390×844 telefon taklidi (Table2D katman yapısı,
// tema değişkenleri + boyalı zemin sözleşmedeki gibi), gerçek "Yıldızlı Gece" kartları ve rozetler.
// ?only=gece → yalnız o tema · ?state=empty → yığın boş (nötr parıltı) · ?frames=0 / ?tables=0
import '../src/table2d/table.css';
import '../src/themes/frames.css';
import {TABLES} from '../src/themes/tables';
import type {TableTheme} from '../src/themes/contract';
import type {Suit} from '../src/skins/contract';
import {skin} from '../src/skins/yildizli';
import rizaUrl from '../assets/chars/riza/riza_01_notr.webp?url';
import cemUrl from '../assets/chars/cem/cem_01_notr.webp?url';

const qs = new URLSearchParams(location.search);
const only = qs.get('only');
const empty = qs.get('state') === 'empty';
const DPR = Math.max(1, window.devicePixelRatio || 1);
const W = 390, H = 844;
const FRAMES = ['standart', 'altin', 'lale', 'yildizli', 'ates'];
const FRAME_NAMES: Record<string, string> = {standart: 'Standart', altin: 'Altın Halka', lale: 'Lale Bahçesi', yildizli: 'Yıldızlı Gece', ates: 'Alev'};
const timings: Record<string, unknown> = {};
(window as unknown as {__timings: unknown}).__timings = timings;

function patternUrl(): string {
  const S = (d: string, x: number, y: number, r: number) => `<path d="${d}" transform="translate(${x} ${y}) rotate(${r}) scale(.9)" fill="#fff"/>`;
  const heart = 'M0 6 C-9 -1 -7 -9 0 -4 C7 -9 9 -1 0 6Z';
  const diamond = 'M0 -8 L6 0 L0 8 L-6 0Z';
  const spade = 'M0 -8 C8 -1 7 6 1 3 L2 8 L-2 8 L-1 3 C-7 6 -8 -1 0 -8Z';
  const club = 'M0 -8a3.4 3.4 0 1 1 0 .01M-4.5 -1a3.4 3.4 0 1 1 0 .01M4.5 -1a3.4 3.4 0 1 1 0 .01M-1.2 1L-2 8H2L1.2 1Z';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">${S(heart, 20, 22, -12)}${S(diamond, 70, 26, 10)}${S(spade, 46, 64, 8)}${S(club, 86, 78, -10)}${S(club, 10, 74, 14)}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Tuval çizimi ertelenmiş olabilir: 1 piksel okuyarak gerçek boyamayı ölçüme dahil et. */
function flush(c: HTMLCanvasElement): void {
  const q = document.createElement('canvas').getContext('2d')!;
  q.drawImage(c, 0, 0, 1, 1);
  q.getImageData(0, 0, 1, 1);
}

function cardCanvas(cw: number, ch: number, s: Suit | null, r = 0): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.round(cw * DPR);
  c.height = Math.round(ch * DPR);
  const g = c.getContext('2d')!;
  g.scale(DPR, DPR);
  if (s) skin.drawFace(g, cw, ch, s, r);
  else skin.drawBack(g, cw, ch);
  return c;
}

function avatar(size: number, frame: string, url: string, blue = false): HTMLElement {
  const a = document.createElement('div');
  a.className = `kh-avatar-ring kh-frame--${frame}`;
  a.style.width = a.style.height = size + 'px';
  a.innerHTML = `<div class="bk${blue ? ' is-b' : ''}"><img src="${url}" alt=""></div>`;
  return a;
}

async function phone(t: TableTheme, idx: number): Promise<HTMLElement> {
  const col = document.createElement('div');
  col.className = 'col';
  col.dataset.theme = t.id;
  col.innerHTML = `<div class="lab"><b>${t.name}</b><small>${t.id}</small><i></i></div>`;
  const ph = document.createElement('div');
  ph.className = 'ph';
  const ar = document.createElement('div');
  ar.className = 'ar';
  for (const [k, v] of Object.entries(t.vars)) ar.style.setProperty(k, v);
  ar.innerHTML = `<div class="ar__bg"></div><div class="ar__glow"></div><div class="ar__rays"></div><div class="ar__pattern"></div><div class="ar__vig"></div>
    <div class="ar__ring"><i></i></div><div class="ar__cards"></div>`;
  ph.append(ar);
  col.append(ph);
  (ar.querySelector('.ar__pattern') as HTMLElement).style.backgroundImage = patternUrl();

  // boyalı zemin: önce ölçüm (1080×2340 cihaz pikseli = 360×780 @3), sonra bu ekran için çizim
  if (t.paint) {
    const m: number[] = [];
    for (let i = 0; i < 2; i++) {
      const t0 = performance.now();
      flush(await t.paint(360, 780, 3));
      m.push(Math.round(performance.now() - t0));
    }
    let t0 = performance.now();
    flush(await t.paint(360, 780, 2));
    const m2 = Math.round(performance.now() - t0);
    const t1 = performance.now();
    const cv = await t.paint(W, H, Math.min(2, DPR)); // Table2D: dpr ≤ 2 (düşük kipte 1.5)
    flush(cv);
    const t2 = Math.round(performance.now() - t1);
    cv.className = 'ar__paint';
    ar.querySelector('.ar__bg')!.after(cv);
    timings[t.id] = {cold1080: m[0], warm1080: m[1], dpr2_720: m2, phone: t2, canvas: `${cv.width}x${cv.height}`};
    col.querySelector('.lab i')!.textContent = `1080p ${m[1]} ms (ilk ${m[0]}) · dpr2 ${m2} ms`;
  }

  // Table2D.layout() oranları
  const cw = Math.round(Math.min(W * 0.215, H * 0.112)), ch = Math.round(cw / 0.7);
  const handW = Math.min(W * 0.245, H * 0.138);
  const pileY = H * 0.455;
  const rd = cw * 2.25;
  const ring = ar.querySelector('.ar__ring') as HTMLElement;
  Object.assign(ring.style, {width: rd + 'px', height: rd + 'px', left: W / 2 - rd / 2 + 'px', top: pileY - rd / 2 + 'px'});
  const glow = ar.querySelector('.ar__glow') as HTMLElement;
  glow.style.top = pileY + 'px';
  glow.dataset.s = empty ? 'N' : 'S';
  glow.classList.add('is-on');
  if (!empty) ring.style.setProperty('--ring', '#1f7bff');
  (ar.querySelector('.ar__rays') as HTMLElement).style.top = pileY + 'px';
  const cards = ar.querySelector('.ar__cards')!;
  const put = (cv: HTMLCanvasElement, x: number, y: number, r: number, s: number, flat = false) => {
    const d = document.createElement('div');
    d.className = 'c2' + (flat ? ' is-flat' : '');
    d.style.width = cw + 'px';
    d.style.height = ch + 'px';
    d.style.transform = `translate(${x - cw / 2}px,${y - ch / 2}px) rotate(${r}deg) scale(${s})`;
    d.append(cv);
    cards.append(d);
  };
  // deste (sol)
  const deck = {x: Math.max(cw * 0.62, W * 0.155), y: pileY};
  for (let i = 0; i < 5; i++) put(cardCanvas(cw, ch, null), deck.x - i * 0.6, deck.y - i * 0.9, -4, 1, true);
  // toplananlar (sağ)
  const sx = W - Math.max(cw * 0.6, W * 0.15);
  for (let i = 0; i < 3; i++) put(cardCanvas(cw, ch, null), sx, H * 0.27 - i, -8 + i, 0.78, true);
  for (let i = 0; i < 3; i++) put(cardCanvas(cw, ch, null), sx, H * 0.655 - i, 8 - i, 0.78, true);
  // rakip eli
  for (let i = 0; i < 4; i++) put(cardCanvas(cw, ch, null), W / 2 + (i - 1.5) * cw * 0.5, H * 0.235 + Math.abs(i - 1.5) * 3, (i - 1.5) * 6, 0.62);
  // yığın
  if (!empty) {
    const pile: [Suit, number, number][] = [['D', 4, -14], ['C', 9, 9], ['H', 1, -4], ['S', 12, 6]];
    pile.forEach(([s, r, a], i) => put(cardCanvas(cw, ch, s, r), W / 2 + (i % 2 ? 3 : -3), pileY - i * 1.2, a, 1, true));
  }
  // oyuncu eli
  const hs = handW / cw;
  const hand: [Suit, number][] = [['H', 7], ['D', 10], ['C', 11], ['S', 13]];
  const hx = W * 0.61, hy = H - handW / 0.7 / 2 - Math.max(14, H * 0.022);
  const step = Math.min(handW * 0.72, (W * 0.68 - handW) / 3);
  hand.forEach(([s, r], i) => put(cardCanvas(cw, ch, s, r), hx + (i - 1.5) * step, hy + Math.abs(i - 1.5) ** 2 * 3, (i - 1.5) * 4.5, hs));

  // rozetler
  const u = Math.max(12, Math.min(22, Math.min(W * 0.04, H * 0.02)));
  const topF = ['standart', 'yildizli', 'lale', 'altin', 'ates'][idx % 5];
  const botF = ['altin', 'ates', 'standart', 'lale', 'yildizli'][idx % 5];
  const tb = document.createElement('div');
  tb.className = 'bdg';
  const ts = Math.round(u * 6.6);
  Object.assign(tb.style, {left: W / 2 - ts / 2 + 'px', top: Math.round(u * 0.55) + 'px'});
  tb.append(avatar(ts, topF, rizaUrl));
  tb.insertAdjacentHTML('beforeend', '<div class="name">Rıza Amca</div>');
  const bb = document.createElement('div');
  bb.className = 'bdg';
  const bs = Math.round(u * 5.2);
  Object.assign(bb.style, {left: Math.round(u * 1.1) + 'px', top: H - Math.round(u * 3.6) - bs + 'px'});
  bb.append(avatar(bs, botF, cemUrl, true));
  bb.insertAdjacentHTML('beforeend', '<div class="name">Sen</div>');
  ar.append(tb, bb);
  return col;
}

function swatches(): void {
  const host = document.getElementById('sws')!;
  for (const t of TABLES) {
    const f = document.createElement('figure');
    f.innerHTML = `<div style="display:flex;gap:10px;align-items:flex-end"><div class="sw"></div><div class="sw" style="width:96px;height:128px"></div><div class="sw" style="width:56px;height:56px;border-radius:10px"></div></div><figcaption>${t.name}</figcaption>`;
    f.querySelectorAll<HTMLElement>('.sw').forEach(el => (el.style.background = t.swatch ?? '#333'));
    host.append(f);
  }
}

function frames(): void {
  const host = document.getElementById('frames')!;
  for (const bg of ['', 'is-dark', 'is-light']) {
    const row = document.createElement('div');
    row.className = 'frames ' + bg;
    row.style.marginBottom = '16px';
    for (const id of FRAMES) {
      const fr = document.createElement('div');
      fr.className = 'fr';
      const pair = document.createElement('div');
      pair.className = 'pair';
      pair.append(avatar(120, id, rizaUrl), avatar(44, id, cemUrl, true));
      fr.append(pair);
      fr.insertAdjacentHTML('beforeend', `<span>${FRAME_NAMES[id]} · .kh-frame--${id}</span>`);
      row.append(fr);
    }
    host.append(row);
  }
}

async function main(): Promise<void> {
  if (qs.get('frames') !== '0') frames();
  swatches();
  if (qs.get('tables') !== '0') {
    await skin.prepare();
    const host = document.getElementById('tables')!;
    for (const [i, t] of TABLES.entries()) {
      if (only && t.id !== only) continue;
      host.append(await phone(t, i));
    }
  }
  await new Promise(r => setTimeout(r, 300));
  document.body.dataset.ready = '1';
  console.log('timings', JSON.stringify(timings));
}
main().catch(e => {
  document.body.dataset.ready = 'err';
  console.error(e);
});
