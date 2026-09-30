// AÇILIŞ kare çizicisi (Canvas 2D). Arkadan öne: gök → yıldızlar → ay (hale + yüzey) → bulutlar → uzak siluetler
// (kubbe, minareler, kule; sis) → orta binalar → kahraman kule (Art Deco kütleler, ay ışığı kenarları, taç aydınlatması,
// pencere-bulmaca) → yakın binalar → yer sisi → ön plan çatı ve su deposu → ışık katmanı (bloom).
import { hash } from '../../lib/math';
import { CITY, FAR, FG_D, HERO, HERO_WINS, H, T, W, camAt, layerMatrix, winLight, type Building, type CamState, type Win } from './scene';

type Ctx = CanvasRenderingContext2D;
export type Bufs = { glow: HTMLCanvasElement; clouds: HTMLCanvasElement; tmp: HTMLCanvasElement };

// ---------- bulut dokusu: değer gürültüsü (fbm), bir kez üretilir ----------
function valueNoise(seed: number) {
  const N = 256, g = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) g[i] = hash(i % N, Math.floor(i / N), seed);
  const at = (x: number, y: number) => g[((y % N) + N) % N * N + (((x % N) + N) % N)];
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
export function makeBufs(): Bufs {
  const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const clouds = mk(800, 300);
  const cx = clouds.getContext('2d')!, img = cx.createImageData(800, 300), n = valueNoise(91);
  for (let y = 0; y < 300; y++) for (let x = 0; x < 800; x++) {
    let f = 0, amp = 0.5, fr = 1 / 90;
    for (let o = 0; o < 5; o++) { f += amp * n(x * fr + o * 37, y * fr * 2.2 + o * 11); amp *= 0.5; fr *= 2; }
    const band = Math.sin((y / 300) * Math.PI); // üst/alt kenarda söner
    const a = Math.max(0, Math.min(1, (f - 0.46) / 0.24)) * band;
    const i = (y * 800 + x) * 4;
    img.data[i] = 150; img.data[i + 1] = 166; img.data[i + 2] = 196; img.data[i + 3] = Math.round(a * 255);
  }
  cx.putImageData(img, 0, 0);
  return { glow: mk(W / 2, H / 2), clouds, tmp: mk(W, H) };
}

const setM = (ctx: Ctx, m: number[]) => ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
// opak bir kütle, ışık katmanında arkasında kalan parıltıyı siler (ay binanın önüne geçmesin)
function occlude(glow: Ctx, x: number, y: number, w: number, h: number, a: number) {
  glow.globalCompositeOperation = 'destination-out';
  glow.fillStyle = `rgba(0,0,0,${a})`;
  glow.fillRect(x, y, w, h);
  glow.globalCompositeOperation = 'lighter';
}
const MOON = { x: 668, y: 338, r: 160 };

function sky(ctx: Ctx, cam: CamState, t: number, glow: Ctx) {
  const m = layerMatrix(cam, Infinity)!;
  setM(ctx, m);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#050916'); g.addColorStop(0.24, '#091327'); g.addColorStop(0.46, '#0f1f38');
  g.addColorStop(0.6, '#1a2d45'); g.addColorStop(0.68, '#2f3445'); g.addColorStop(0.76, '#4b3a30'); g.addColorStop(1, '#1a130d');
  ctx.fillStyle = g;
  ctx.fillRect(-500, -500, W + 1000, H + 1000);
  // yıldızlar
  for (let i = 0; i < 170; i++) {
    const x = hash(i, 1, 71) * (W + 200) - 100, y = hash(i, 2, 71) * 1150 - 60;
    const s = 0.6 + hash(i, 3, 71) ** 3 * 1.8, tw = 0.55 + 0.45 * Math.sin(t * (1.5 + hash(i, 4, 71) * 3) + i);
    const fade = 1 - Math.max(0, (y - 700) / 450);
    ctx.fillStyle = `rgba(226,232,255,${(0.25 + 0.6 * hash(i, 5, 71)) * tw * fade})`;
    ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
  }
  // ay: soğuk hale + sıcak fildişi disk + denizler
  const halo = ctx.createRadialGradient(MOON.x, MOON.y, MOON.r * 0.9, MOON.x, MOON.y, MOON.r * 4.2);
  halo.addColorStop(0, 'rgba(200,214,240,0.26)'); halo.addColorStop(0.25, 'rgba(150,172,214,0.10)'); halo.addColorStop(1, 'rgba(120,140,190,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(MOON.x - MOON.r * 4.2, MOON.y - MOON.r * 4.2, MOON.r * 8.4, MOON.r * 8.4);
  const disk = ctx.createRadialGradient(MOON.x - 40, MOON.y - 46, 10, MOON.x, MOON.y, MOON.r);
  disk.addColorStop(0, '#f1ead8'); disk.addColorStop(0.7, '#e2d7bb'); disk.addColorStop(1, '#c6b590');
  ctx.fillStyle = disk;
  ctx.beginPath(); ctx.arc(MOON.x, MOON.y, MOON.r, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(MOON.x, MOON.y, MOON.r, 0, Math.PI * 2); ctx.clip();
  const maria: Array<[number, number, number, number, number]> = [[-52, -34, 50, 34, 0.34], [26, -60, 34, 25, 0.27], [44, 22, 56, 38, 0.3], [-22, 56, 38, 27, 0.24], [-80, 34, 22, 18, 0.2], [80, -20, 20, 16, 0.2], [4, -6, 16, 12, 0.16]];
  for (const [dx, dy, rx, ry, a] of maria) {
    const mg = ctx.createRadialGradient(MOON.x + dx, MOON.y + dy, 0, MOON.x + dx, MOON.y + dy, Math.max(rx, ry));
    mg.addColorStop(0, `rgba(150,138,118,${a})`); mg.addColorStop(1, 'rgba(150,138,118,0)');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.ellipse(MOON.x + dx, MOON.y + dy, rx, ry, 0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // bloom katmanına ay
  setM(glow, m.map((v, i) => (i < 6 ? v : v)));
  glow.fillStyle = 'rgba(255,248,232,0.2)';
  glow.beginPath(); glow.arc(MOON.x, MOON.y, MOON.r * 1.02, 0, Math.PI * 2); glow.fill();
}

function clouds(ctx: Ctx, cam: CamState, t: number, bufs: Bufs) {
  const m = layerMatrix(cam, Infinity)!;
  const tmp = bufs.tmp.getContext('2d')!;
  tmp.setTransform(1, 0, 0, 1, 0, 0);
  tmp.globalCompositeOperation = 'source-over';
  tmp.clearRect(0, 0, W, H);
  tmp.globalAlpha = 0.7;
  tmp.drawImage(bufs.clouds, -260 - t * 16, 250, 1700, 560);
  tmp.globalAlpha = 0.36;
  tmp.drawImage(bufs.clouds, 1160 - t * 26, 110, -1500, 440);
  tmp.globalAlpha = 1;
  // renk: aya yakın kenarlar gümüş, uzaklar koyu mavi
  tmp.globalCompositeOperation = 'source-in';
  const cg = tmp.createRadialGradient(MOON.x, MOON.y, MOON.r * 0.6, MOON.x, MOON.y, 760);
  cg.addColorStop(0, 'rgba(222,228,240,1)'); cg.addColorStop(0.35, 'rgba(120,140,176,0.95)'); cg.addColorStop(1, 'rgba(34,48,74,0.85)');
  tmp.fillStyle = cg;
  tmp.fillRect(0, 0, W, H);
  setM(ctx, m);
  ctx.drawImage(bufs.tmp, 0, 0);
}

function farLayers(ctx: Ctx, cam: CamState, t: number) {
  for (const L of FAR) {
    const m = layerMatrix(cam, L.D);
    if (!m) continue;
    setM(ctx, m);
    ctx.fillStyle = L.color;
    for (const [x0, x1, top] of L.blocks) ctx.fillRect(x0, top, x1 - x0, H + 200 - top);
    for (const s of L.specials) {
      ctx.beginPath();
      if (s.kind === 'dome') {
        ctx.arc(s.x, s.y, 58 * s.s, Math.PI, 0); ctx.rect(s.x - 70 * s.s, s.y, 140 * s.s, 200);
        ctx.moveTo(s.x - 2, s.y - 58 * s.s); ctx.lineTo(s.x, s.y - 80 * s.s); ctx.lineTo(s.x + 2, s.y - 58 * s.s);
      } else if (s.kind === 'minaret') {
        ctx.rect(s.x - 5 * s.s, s.y - 150 * s.s, 10 * s.s, 350); ctx.rect(s.x - 8 * s.s, s.y - 104 * s.s, 16 * s.s, 5 * s.s);
        ctx.moveTo(s.x - 5 * s.s, s.y - 150 * s.s); ctx.lineTo(s.x, s.y - 196 * s.s); ctx.lineTo(s.x + 5 * s.s, s.y - 150 * s.s);
      } else {
        ctx.rect(s.x - 24, s.y - 60, 48, 400); ctx.moveTo(s.x - 28, s.y - 60); ctx.lineTo(s.x, s.y - 118); ctx.lineTo(s.x + 28, s.y - 60);
      }
      ctx.fill();
    }
    // uzak ışıklar: şehir uyudukça söner
    for (let i = 0; i < L.dots.length; i++) {
      const [x, y, r] = L.dots[i];
      const off = 1.3 + r * 3.2, v = r < 0.22 ? 1 : Math.max(0, Math.min(1, (off - t) / 0.2));
      if (v <= 0) continue;
      ctx.fillStyle = `rgba(255,${190 + Math.round(40 * r)},120,${0.5 * v})`;
      ctx.fillRect(x, y, 3, 4);
    }
    // atmosfer: katmanın üstüne sis perdesi
    const hz = ctx.createLinearGradient(0, 1080, 0, 1500);
    hz.addColorStop(0, 'rgba(0,0,0,0)'); hz.addColorStop(0.5, L.haze); hz.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hz;
    ctx.fillRect(-300, 1080, W + 600, 420);
  }
}

// pencere: gömme çerçeve, cam yansıması, iç ışık, perde, harf, bulmaca numarası
function drawWindow(ctx: Ctx, glow: Ctx, w: Win, t: number, heroSide: boolean) {
  const L = winLight(w, t);
  ctx.fillStyle = '#04060b';
  ctx.fillRect(w.x - 3, w.y - 3, w.w + 6, w.h + 6);
  const gl = ctx.createLinearGradient(w.x, w.y, w.x + w.w, w.y + w.h);
  gl.addColorStop(0, '#16233a'); gl.addColorStop(0.45, '#0b1424'); gl.addColorStop(1, '#070d18');
  ctx.fillStyle = gl;
  ctx.fillRect(w.x, w.y, w.w, w.h);
  if (heroSide) {
    // camda gök yansıması: pencere başına farklı açı/yoğunluk; üst katlar göğü daha çok yansıtır
    const hv = hash(Math.round(w.x), Math.round(w.y), 77), up = Math.max(0.2, 1.25 - w.y / 1500);
    const off = 0.3 + hv * 0.4;
    const sh = ctx.createLinearGradient(w.x, w.y + w.h, w.x + w.w, w.y);
    sh.addColorStop(Math.max(0, off - 0.14), 'rgba(170,190,230,0)'); sh.addColorStop(off, `rgba(170,190,230,${(0.04 + 0.1 * hv) * up})`); sh.addColorStop(Math.min(1, off + 0.12), 'rgba(170,190,230,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = `rgba(${hv > 0.5 ? '30,44,70' : '14,20,34'},${0.25 * hash(Math.round(w.y), Math.round(w.x), 78)})`;
    ctx.fillRect(w.x, w.y, w.w, w.h);
  }
  if (L <= 0.002) return;
  const b = L * w.bright;
  const warmR = 255, warmG = Math.round(176 + 40 * w.warm), warmB = Math.round(90 + 60 * w.warm);
  const lg = ctx.createRadialGradient(w.x + w.w * 0.38, w.y + w.h * 0.7, 2, w.x + w.w * 0.5, w.y + w.h * 0.55, Math.max(w.w, w.h) * 0.9);
  lg.addColorStop(0, `rgba(255,${Math.min(255, warmG + 58)},${Math.min(255, warmB + 90)},${Math.min(1, b)})`);
  lg.addColorStop(0.5, `rgba(${warmR},${warmG},${warmB},${Math.min(1, b * 0.97)})`);
  lg.addColorStop(1, `rgba(${Math.round(210 - 30 * (1 - w.warm))},${Math.round(warmG * 0.6)},${Math.round(warmB * 0.45)},${Math.min(1, b * 0.92)})`);
  ctx.fillStyle = lg;
  ctx.fillRect(w.x, w.y, w.w, w.h);
  const ceil = ctx.createLinearGradient(0, w.y, 0, w.y + w.h * 0.35);
  ceil.addColorStop(0, `rgba(70,30,10,${0.4 * Math.min(1, L)})`); ceil.addColorStop(1, 'rgba(70,30,10,0)');
  ctx.fillStyle = ceil;
  ctx.fillRect(w.x, w.y, w.w, w.h * 0.35);
  if (!w.letter && w.warm > 0.62) {
    ctx.fillStyle = `rgba(80,40,16,${0.28 * L})`;
    for (let k = 1; k < 7; k++) ctx.fillRect(w.x, w.y + (w.h * k) / 7, w.w, Math.max(1, w.h * 0.035));
  }
  if (w.curtain !== 0) {
    const cx0 = w.curtain < 0 ? w.x : w.x + w.w * 0.7;
    const cg = ctx.createLinearGradient(cx0, 0, cx0 + w.w * 0.3, 0);
    cg.addColorStop(w.curtain < 0 ? 0 : 1, `rgba(90,44,18,${0.55 * L})`); cg.addColorStop(w.curtain < 0 ? 1 : 0, 'rgba(90,44,18,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(cx0, w.y, w.w * 0.3, w.h);
  }
  if (w.letter) {
    ctx.fillStyle = `rgba(24,14,6,${Math.min(1, L * 1.1)})`;
    ctx.font = `900 ${w.h * 0.8}px "Playfair Display"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(w.letter, w.x + w.w / 2, w.y + w.h * 0.81);
    if (w.clue && t > T.clue) {
      const k = Math.min(1, (t - T.clue) / 0.4);
      ctx.fillStyle = `rgba(40,24,10,${0.85 * k})`;
      ctx.font = `700 ${w.h * 0.24}px "Courier Prime"`;
      ctx.textAlign = 'left';
      ctx.fillText(w.clue, w.x + w.w * 0.08, w.y + w.h * 0.22);
    }
  }
  // pencere pervazı ışığı yakalar
  ctx.fillStyle = `rgba(255,214,160,${0.45 * L})`;
  ctx.fillRect(w.x - 3, w.y + w.h + 1, w.w + 6, 2);
  // ışık taşması → bloom katmanı
  // yumuşak ışık taşması (dünya uzayında radyal: her ölçekte doğal düşüş)
  const R = Math.max(w.w, w.h) * 1.05, gcx = w.x + w.w / 2, gcy = w.y + w.h / 2;
  const sp = glow.createRadialGradient(gcx, gcy, Math.min(w.w, w.h) * 0.35, gcx, gcy, R);
  const ga = 0.34 * b * (w.letter ? 1.3 : 1);
  sp.addColorStop(0, `rgba(255,${Math.round(160 + 40 * w.warm)},${Math.round(80 + 40 * w.warm)},${ga})`);
  sp.addColorStop(0.55, `rgba(255,${Math.round(150 + 40 * w.warm)},${Math.round(70 + 40 * w.warm)},${ga * 0.35})`);
  sp.addColorStop(1, 'rgba(255,150,70,0)');
  glow.fillStyle = sp;
  glow.fillRect(gcx - R, gcy - R, R * 2, R * 2);
  // pencerenin içi ve harf parıltıdan korunur (harf siluet kalsın)
  glow.globalCompositeOperation = 'destination-out';
  glow.fillStyle = 'rgba(0,0,0,0.55)';
  glow.fillRect(w.x + 2, w.y + 2, w.w - 4, w.h - 4);
  if (w.letter) {
    glow.fillStyle = 'rgba(0,0,0,1)';
    glow.font = `900 ${w.h * 0.8}px "Playfair Display"`;
    glow.textAlign = 'center';
    glow.fillText(w.letter, w.x + w.w / 2, w.y + w.h * 0.81);
  }
  glow.globalCompositeOperation = 'lighter';
}

function building(ctx: Ctx, glow: Ctx, cam: CamState, b: Building, t: number) {
  const m = layerMatrix(cam, b.D);
  if (!m) return;
  const near = Math.min(1, (b.D - cam.cz) / 160);
  if (near <= 0) return;
  setM(ctx, m); setM(glow, m);
  ctx.globalAlpha = near;
  const g = ctx.createLinearGradient(0, b.top, 0, H);
  g.addColorStop(0, b.fill[0]); g.addColorStop(1, b.fill[1]);
  ctx.fillStyle = g;
  ctx.fillRect(b.x0, b.top, b.x1 - b.x0, H + 300 - b.top);
  occlude(glow, b.x0, b.top, b.x1 - b.x0, H + 300 - b.top, near);
  // ay ışığı kenarı: aya bakan kenar
  const lit = (b.x0 + b.x1) / 2 < MOON.x ? b.x1 - 3 : b.x0;
  ctx.fillStyle = `rgba(120,146,190,${b.rim})`;
  ctx.fillRect(lit, b.top, 3, H - b.top);
  ctx.fillStyle = `rgba(140,164,204,${b.rim * 0.8})`;
  ctx.fillRect(b.x0, b.top, b.x1 - b.x0, 3);
  if (b.roof === 'tank') {
    const cx = b.x0 + (b.x1 - b.x0) * 0.62;
    ctx.fillStyle = b.fill[0];
    ctx.fillRect(cx - 34, b.top - 70, 68, 52);
    ctx.beginPath(); ctx.moveTo(cx - 38, b.top - 70); ctx.lineTo(cx, b.top - 100); ctx.lineTo(cx + 38, b.top - 70); ctx.fill();
    ctx.fillRect(cx - 30, b.top - 18, 4, 18); ctx.fillRect(cx + 26, b.top - 18, 4, 18);
  }
  for (const w of b.wins) drawWindow(ctx, glow, w, t, false);
  ctx.globalAlpha = 1;
}

function hero(ctx: Ctx, glow: Ctx, cam: CamState, t: number) {
  const m = layerMatrix(cam, 1000)!;
  setM(ctx, m); setM(glow, m);
  const mass = (x0: number, x1: number, top: number, bottom: number, c0: string, c1: string) => {
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.fillRect(x0, top, x1 - x0, bottom - top);
    occlude(glow, x0, top, x1 - x0, bottom - top, 1);
    // sağ kenar ve tepe ay ışığını yakalar
    ctx.fillStyle = 'rgba(126,152,196,0.55)';
    ctx.fillRect(x1 - 4, top, 4, bottom - top);
    ctx.fillStyle = 'rgba(150,172,212,0.6)';
    ctx.fillRect(x0, top, x1 - x0, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x0, top, 5, bottom - top);
  };
  // iğne ve kırmızı uyarı ışığı
  const sp = HERO.spire;
  ctx.fillStyle = '#56688a';
  ctx.beginPath(); ctx.moveTo(sp.x - 5, sp.base); ctx.lineTo(sp.x - 1, sp.top); ctx.lineTo(sp.x + 1, sp.top); ctx.lineTo(sp.x + 5, sp.base); ctx.fill();
  glow.globalCompositeOperation = 'destination-out';
  glow.beginPath(); glow.moveTo(sp.x - 5, sp.base); glow.lineTo(sp.x - 1, sp.top); glow.lineTo(sp.x + 1, sp.top); glow.lineTo(sp.x + 5, sp.base); glow.fill();
  glow.globalCompositeOperation = 'lighter';
  const blink = ((t + 0.3) % 1.4) < 0.45 ? 1 : 0.12;
  ctx.fillStyle = `rgba(255,70,50,${blink})`;
  ctx.beginPath(); ctx.arc(sp.x, sp.top - 2, 3.4, 0, Math.PI * 2); ctx.fill();
  glow.fillStyle = `rgba(255,60,40,${0.8 * blink})`;
  glow.beginPath(); glow.arc(sp.x, sp.top - 2, 14, 0, Math.PI * 2); glow.fill();
  // taç (kademeli) + projektör aydınlatması
  const crown = HERO.crown;
  for (let i = crown.length - 1; i >= 0; i--) {
    const c = crown[i];
    mass(c.x0, c.x1, c.top, i === 0 ? HERO.set2.top : crown[i - 1].top, '#1a2740', '#121c30');
  }
  const up = ctx.createLinearGradient(0, HERO.set2.top, 0, crown[3].top);
  up.addColorStop(0, 'rgba(255,176,96,0.42)'); up.addColorStop(1, 'rgba(255,176,96,0)');
  ctx.fillStyle = up;
  ctx.fillRect(crown[0].x0, crown[3].top, crown[0].x1 - crown[0].x0, HERO.set2.top - crown[3].top);
  for (let k = 0; k < 5; k++) {
    const x = 452 + k * 44;
    const sg = ctx.createLinearGradient(0, HERO.set2.top, 0, 392);
    sg.addColorStop(0, 'rgba(255,214,160,0.85)'); sg.addColorStop(1, 'rgba(255,214,160,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(x - 2, 392, 4, HERO.set2.top - 392);
    glow.fillStyle = 'rgba(255,170,90,0.28)';
    glow.fillRect(x - 6, 400, 12, HERO.set2.top - 400);
  }
  mass(HERO.set2.x0, HERO.set2.x1, HERO.set2.top, HERO.set1.top, '#16223a', '#101a2c');
  mass(HERO.set1.x0, HERO.set1.x1, HERO.set1.top, HERO.body.top, '#131e34', '#0e172a');
  mass(HERO.body.x0, HERO.body.x1, HERO.body.top, H + 300, '#111b30', '#070c16');
  // Art Deco dikey kanatlar (pencere sütunları arası) + korniş bantları
  const gr = HERO.grid;
  for (let c = 0; c <= gr.cols; c++) {
    const x = gr.x0 + c * gr.px - 13;
    ctx.fillStyle = 'rgba(40,56,86,0.9)';
    ctx.fillRect(x - 4, HERO.body.top + 14, 8, H);
    ctx.fillStyle = 'rgba(128,150,190,0.35)';
    ctx.fillRect(x + 3, HERO.body.top + 14, 1.5, H);
  }
  for (const y of [HERO.body.top + 8, HERO.set1.top + 8, HERO.set2.top + 8]) {
    ctx.fillStyle = 'rgba(46,62,94,0.9)';
    ctx.fillRect(HERO.body.x0, y, HERO.body.x1 - HERO.body.x0, 6);
  }
  for (const w of HERO_WINS) drawWindow(ctx, glow, w, t, true);
}

function foreground(ctx: Ctx, glow: Ctx, cam: CamState, t: number) {
  const m = layerMatrix(cam, FG_D);
  if (!m) return;
  const near = Math.min(1, (FG_D - cam.cz) / 140);
  if (near <= 0) return;
  setM(ctx, m); setM(glow, m);
  ctx.globalAlpha = near;
  const street = ctx.createRadialGradient(170, 1905, 20, 170, 1880, 300);
  street.addColorStop(0, 'rgba(255,176,98,0.42)'); street.addColorStop(0.45, 'rgba(230,140,70,0.16)'); street.addColorStop(1, 'rgba(200,120,60,0)');
  ctx.fillStyle = street;
  ctx.fillRect(-200, 1540, 760, 420);
  const DARK = '#03050a', RIM = 'rgba(120,146,190,0.5)';
  // parapet
  ctx.fillStyle = DARK;
  ctx.fillRect(-300, 1812, 1700, 400);
  ctx.fillStyle = RIM;
  ctx.fillRect(-300, 1812, 1700, 2);
  occlude(glow, -300, 1812, 1700, 400, near);
  // baca
  ctx.fillStyle = DARK;
  ctx.fillRect(-40, 1712, 46, 100); ctx.fillRect(-48, 1704, 62, 12);
  ctx.fillStyle = RIM; ctx.fillRect(4, 1716, 2, 96);
  occlude(glow, -48, 1704, 62, 120, near);
  // TV antenleri
  ctx.strokeStyle = DARK; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(944, 1812); ctx.lineTo(944, 1618);
  for (const [y, hw] of [[1628, 46], [1652, 38], [1676, 30], [1700, 22]] as const) { ctx.moveTo(944 - hw, y); ctx.lineTo(944 + hw, y); }
  ctx.moveTo(1010, 1812); ctx.lineTo(1010, 1682); ctx.moveTo(988, 1690); ctx.lineTo(1032, 1690); ctx.moveTo(993, 1706); ctx.lineTo(1027, 1706);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(120,146,190,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(945.5, 1812); ctx.lineTo(945.5, 1618); ctx.stroke();
  // sokak kedisi: parapette oturmuş, kuleye (sağa) bakıyor; kuyruk yavaşça sallanır
  const cx = 148, by = 1812;
  ctx.save();
  ctx.translate(cx, by);
  ctx.fillStyle = DARK;
  ctx.beginPath();
  ctx.moveTo(-46, 0);
  ctx.bezierCurveTo(-58, -34, -54, -84, -26, -104); // sırt
  ctx.bezierCurveTo(-14, -113, 2, -114, 10, -110); // ense
  ctx.bezierCurveTo(8, -124, 10, -136, 16, -144); // başın arkası
  ctx.lineTo(14, -166); ctx.lineTo(27, -152); // sol kulak
  ctx.bezierCurveTo(31, -154, 36, -154, 40, -152);
  ctx.lineTo(50, -166); ctx.lineTo(50, -144); // sağ kulak
  ctx.bezierCurveTo(56, -136, 56, -124, 50, -118); // yüz
  ctx.bezierCurveTo(46, -114, 40, -112, 36, -110); // çene
  ctx.bezierCurveTo(38, -84, 34, -44, 40, -6); // göğüs ve ön bacak
  ctx.bezierCurveTo(42, -1, 36, 0, 30, 0);
  ctx.closePath();
  ctx.fill();
  // kuyruk (yerde kıvrılır, ucu sallanır)
  const sw = Math.sin(t * 2.2) * 0.5 + Math.sin(t * 3.7 + 1) * 0.25;
  ctx.strokeStyle = DARK; ctx.lineWidth = 11; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-40, -6);
  ctx.bezierCurveTo(-76, -2, -98, -12, -104 + sw * 6, -34);
  ctx.bezierCurveTo(-108 + sw * 10, -48, -100 + sw * 16, -60, -92 + sw * 22, -58 - sw * 4);
  ctx.stroke();
  // ay ışığı: sırt, kulak ve baş kenarında ince parıltı
  ctx.strokeStyle = 'rgba(168,190,228,0.75)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-50, -52); ctx.bezierCurveTo(-54, -80, -44, -96, -26, -104); ctx.bezierCurveTo(-14, -113, 2, -114, 10, -110); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(14, -166); ctx.lineTo(27, -152); ctx.bezierCurveTo(31, -154, 36, -154, 40, -152); ctx.lineTo(50, -166); ctx.lineTo(50, -144); ctx.bezierCurveTo(56, -136, 56, -124, 50, -118); ctx.stroke();
  ctx.restore();
  occlude(glow, cx - 110, by - 170, 170, 170, near * 0.8);
  ctx.globalAlpha = 1;
}

export function renderFrame(ctx: Ctx, t: number, bufs: Bufs) {
  const cam = camAt(t);
  const glow = bufs.glow.getContext('2d')!;
  glow.setTransform(1, 0, 0, 1, 0, 0);
  glow.globalCompositeOperation = 'source-over';
  glow.clearRect(0, 0, W / 2, H / 2);
  glow.globalCompositeOperation = 'lighter';
  // bloom katmanı yarım çözünürlükte: tüm matrisleri 0.5 ile ölçekle
  const glowProxy = new Proxy(glow, {
    get(target, prop) {
      if (prop === 'setTransform') return (a: number, b: number, c: number, d: number, e: number, f: number) => target.setTransform(a / 2, b / 2, c / 2, d / 2, e / 2, f / 2);
      const v = (target as unknown as Record<string | symbol, unknown>)[prop];
      return typeof v === 'function' ? (v as (...args: unknown[]) => unknown).bind(target) : v;
    },
    set(target, prop, value) { (target as unknown as Record<string | symbol, unknown>)[prop] = value; return true; },
  }) as Ctx;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  sky(ctx, cam, t, glowProxy);
  clouds(ctx, cam, t, bufs);
  farLayers(ctx, cam, t);
  for (const b of CITY) if (b.D > 1000) building(ctx, glowProxy, cam, b, t);
  hero(ctx, glowProxy, cam, t);
  for (const b of CITY) if (b.D < 1000) building(ctx, glowProxy, cam, b, t);

  // yer sisi (kahraman derinliğinde) ve alt karanlık (ekran uzayında, iniş sırasında gelir)
  const mh = layerMatrix(cam, 1000)!;
  setM(ctx, mh);
  const mist = ctx.createLinearGradient(0, 1300, 0, 1900);
  mist.addColorStop(0, 'rgba(60,72,96,0)'); mist.addColorStop(0.45, 'rgba(70,80,104,0.22)'); mist.addColorStop(0.75, 'rgba(120,96,80,0.18)'); mist.addColorStop(1, 'rgba(10,12,18,0.4)');
  ctx.fillStyle = mist;
  ctx.fillRect(-400, 1300, W + 800, 900);
  foreground(ctx, glowProxy, cam, t);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const land = Math.max(0, Math.min(1, (t - 2.4) / 1.1));
  const dark = ctx.createLinearGradient(0, 1420, 0, H);
  dark.addColorStop(0, 'rgba(3,5,9,0)'); dark.addColorStop(0.5, `rgba(3,5,9,${0.55 * land})`); dark.addColorStop(1, `rgba(2,3,6,${0.9 * land})`);
  ctx.fillStyle = dark;
  ctx.fillRect(0, 1420, W, H - 1420);

  // bloom
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'blur(4px)'; ctx.globalAlpha = 0.9; ctx.drawImage(bufs.glow, 0, 0, W, H);
  ctx.filter = 'blur(16px)'; ctx.globalAlpha = 0.65; ctx.drawImage(bufs.glow, 0, 0, W, H);
  ctx.filter = 'blur(48px)'; ctx.globalAlpha = 0.5; ctx.drawImage(bufs.glow, 0, 0, W, H);
  ctx.filter = 'none'; ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
