// Kesişim alanının kare çizicisi (Canvas 2D). Katmanlar: gök ve ufuk pusu → uzak/orta yaylar (sisle sönen) → odak dışı
// ön plan (bulanık) → ışık katmanı (yarım çözünürlük, üç kademeli bloom) → akkor çekirdekler → anamorfik parlama →
// havada süzülen toz. Yaylar derinlik kovalarına göre toplu çizilir (binlerce yay, kova başına tek stroke). Işık kaynağı
// (kuyruklu yıldız) geçtiği yerdeki yayları gerçekten aydınlatır.
import { spring } from 'remotion';
import { hash } from '../../lib/math';
import {
  ARC_LEN, COMETS, GRID, PAIRS, ROUTE, T, WAVE_ORIGIN, arcGeom, basis, baseO, camAt, flips, heroAt,
  heroS, isAmber, pointOnPath, proj, turnOrigin, turnRadius, type Basis, type Step,
} from './field';

export type Bufs = { near: HTMLCanvasElement; glow: HTMLCanvasElement; scratch: HTMLCanvasElement; acc: HTMLCanvasElement };
export function makeBufs(W: number, H: number): Bufs {
  const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  return { near: mk(W, H), glow: mk(W / 2, H / 2), scratch: mk(W, H), acc: mk(W, H) };
}

type Ctx = CanvasRenderingContext2D;
const CREAM = [239, 230, 210], AMBER = [242, 178, 86], TRAILC = [255, 190, 110];
const NB = 34;
const bucketZ = (b: number) => 0.28 * Math.pow(1.16, b + 0.5);
const bucketOf = (z: number) => Math.max(0, Math.min(NB - 1, Math.floor(Math.log(z / 0.28) / Math.log(1.16))));
const smooth = (a: number, b: number, x: number) => { const c = Math.max(0, Math.min(1, (x - a) / (b - a))); return c * c * (3 - 2 * c); };
const FOG0 = 8, FOG1 = 44;
const fog = (z: number) => Math.pow(1 - smooth(FOG0, FOG1, z), 1.4);
const easeOut = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
// dalga yarıçapı r(t) = a·d + b·d² → karo mesafesi için başlama zamanı
const reach = (a: number, b: number, dist: number) => (-a + Math.sqrt(a * a + 4 * b * dist)) / (2 * b);
const LEVELS = 5;

const routeIdx = new Map<number, number>();
ROUTE.forEach((s, n) => routeIdx.set((s.i * 4096 + s.j) * 16 + s.a * 4 + s.b, n));

function tileTurn(i: number, j: number, t: number) {
  if (!flips(i, j)) return { ang: 0, heat: 0 };
  const d = Math.hypot(i + 0.5 - turnOrigin.x, j + 0.5 - turnOrigin.y);
  const t0 = T.turn + reach(5, 10, d) + hash(i + 500, j + 500, 9) * 0.05;
  const q = spring({ frame: (t - t0) * 60, fps: 60, config: { damping: 11, stiffness: 150, mass: 0.7 } });
  const dir = hash(i + 500, j + 500, 4) < 0.5 ? 1 : -1;
  const h = t > t0 ? Math.max(0, Math.sin(Math.min(1, (t - t0) / 0.34) * Math.PI)) : 0;
  return { ang: q * dir * (Math.PI / 2), heat: h };
}

// yay örnekleri: karo merkezine göre φ döndürülmüş, [u0,u1] aralığı
function arcPoints(b: Basis, i: number, j: number, a: number, e: number, phi: number, u0: number, u1: number, n: number, out: number[]) {
  const g = arcGeom(i, j, a as 0, e as 0);
  const cxT = i + 0.5, cyT = j + 0.5, cs = Math.cos(phi), sn = Math.sin(phi);
  out.length = 0;
  for (let s = 0; s <= n; s++) {
    const u = u0 + ((u1 - u0) * s) / n, an = g.a0 + (g.a1 - g.a0) * u;
    const x = g.cx + 0.5 * Math.cos(an) - cxT, y = g.cy + 0.5 * Math.sin(an) - cyT;
    const p = proj(b, x * cs - y * sn + cxT, x * sn + y * cs + cyT);
    if (p[2] <= 0.05) return false;
    out.push(p[0], p[1]);
  }
  return true;
}

const cometS = (c: (typeof COMETS)[number], t: number) => {
  const tau = t - c.t0;
  return Math.min(c.v * (tau - 0.18 * (1 - Math.exp(-tau / 0.18))), c.path.length * ARC_LEN - 0.01);
};

function drawScene(ctx: Ctx, t: number, bufs: Bufs, W: number, H: number) {
  const cam = camAt(t, W, H);
  const B = basis(cam, W, H);
  const hero = heroAt(t), hp = proj(B, hero.x, hero.y);
  const focusZ = hp[2] > 0.3 ? hp[2] : 3;

  // --- gök ve ufuk ---
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  ctx.fillStyle = '#04070a';
  ctx.fillRect(0, 0, W, H);
  const fdx = Math.sin(cam.yaw), fdy = Math.cos(cam.yaw);
  const h1 = proj(B, cam.x + fdx * 4000 - fdy * 1500, cam.y + fdy * 4000 + fdx * 1500), h2 = proj(B, cam.x + fdx * 4000 + fdy * 1500, cam.y + fdy * 4000 - fdx * 1500);
  if (h1[2] > 0 && h2[2] > 0) {
    const mx = (h1[0] + h2[0]) / 2, my = (h1[1] + h2[1]) / 2, ang = Math.atan2(h2[1] - h1[1], h2[0] - h1[0]);
    ctx.save();
    ctx.translate(mx, my); ctx.rotate(ang);
    const sky = ctx.createLinearGradient(0, -1400, 0, 700);
    sky.addColorStop(0, 'rgba(5,15,22,1)');
    sky.addColorStop(0.42, 'rgba(12,28,36,1)');
    sky.addColorStop(0.6, 'rgba(84,62,40,0.92)');
    sky.addColorStop(0.668, 'rgba(226,160,90,0.55)');
    sky.addColorStop(0.69, 'rgba(150,96,50,0.32)');
    sky.addColorStop(0.8, 'rgba(40,26,14,0.14)');
    sky.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sky;
    ctx.fillRect(-3000, -1400, 6000, 2100);
    const sun = ctx.createRadialGradient(0, 0, 0, 0, 0, 760);
    sun.addColorStop(0, 'rgba(255,214,150,0.30)');
    sun.addColorStop(0.35, 'rgba(240,160,80,0.12)');
    sun.addColorStop(1, 'rgba(240,160,80,0)');
    ctx.fillStyle = sun;
    ctx.scale(1.9, 0.62);
    ctx.fillRect(-800, -800, 1600, 1600);
    ctx.restore();
  }

  // --- tamponlar ---
  const nearC = bufs.near.getContext('2d')!;
  nearC.setTransform(1, 0, 0, 1, 0, 0);
  nearC.clearRect(0, 0, W, H);
  const glowC = bufs.glow.getContext('2d')!;
  glowC.setTransform(0.5, 0, 0, 0.5, 0, 0);
  glowC.globalCompositeOperation = 'source-over';
  glowC.clearRect(0, 0, W, H);
  glowC.globalCompositeOperation = 'lighter';
  glowC.lineCap = 'round';

  // ışık kaynakları (dünya xy): kahraman + aktif kuyruklu yıldızlar
  const lights: Array<{ x: number; y: number; p: number; s2: number }> = [{ x: hero.x, y: hero.y, p: t > T.ignite ? 1 : 0, s2: 2 * 1.15 * 1.15 }];
  for (const c of COMETS) {
    if (t < c.t0) continue;
    const q = pointOnPath(c.path, cometS(c, t));
    lights.push({ x: q.x, y: q.y, p: 0.6 * Math.min(1, (t - c.t0) / 0.25), s2: 2 * 0.8 * 0.8 });
  }

  const paths: Record<string, Path2D> = {};
  const heatP: Record<string, Path2D> = {};
  const litP: Path2D[] = Array.from({ length: LEVELS + 1 }, () => new Path2D());
  const pts: number[] = [];
  const heroN = Math.floor(heroS(t) / ARC_LEN), heroU = heroS(t) / ARC_LEN - heroN;
  const nearLim = focusZ * 0.5, vnearLim = focusZ * 0.27;

  for (let i = GRID.i0; i <= GRID.i1; i++) {
    for (let j = GRID.j0; j <= GRID.j1; j++) {
      const c = proj(B, i + 0.5, j + 0.5);
      const z = c[2];
      if (z < 0.12 || z > FOG1) continue;
      const sz = B.f / z;
      if (c[0] < -sz * 1.2 || c[0] > W + sz * 1.2 || c[1] < -sz * 1.2 || c[1] > H + sz * 1.2) continue;
      const dist = Math.hypot(i + 0.5 - WAVE_ORIGIN.x, j + 0.5 - WAVE_ORIGIN.y);
      const tIn = T.waveDraw + reach(2.6, 2.3, dist) + hash(i + 500, j + 500, 5) * 0.4;
      const pDraw = easeOut((t - tIn) / 0.34);
      const fresh = t > tIn ? Math.max(0, 1 - (t - tIn - 0.2) / 0.7) : 0;
      const turn = tileTurn(i, j, t);
      // bu karoyu aydınlatan en güçlü ışık
      let light = 0;
      for (const L of lights) {
        const dx = i + 0.5 - L.x, dy = j + 0.5 - L.y, d2 = dx * dx + dy * dy;
        if (d2 < 16) light = Math.max(light, L.p * Math.exp(-d2 / L.s2));
      }
      const o = baseO(i, j);
      const n = Math.max(2, Math.min(9, Math.round((sz * ARC_LEN) / 13)));
      const fz = fog(z), amber = isAmber(i, j);
      const layer = z < vnearLim ? 'v' : z < nearLim ? 'n' : 'm';
      const bk = bucketOf(z);
      const wcls = (B.f * 0.14) / z > 6 ? 0 : 1;
      for (const [a, e] of PAIRS[o]) {
        // kahramanın rotasındaki yay: baş geçtikçe çizilir ve sıcak kalır
        const rk = routeIdx.get((i * 4096 + j) * 16 + a * 4 + e) ?? routeIdx.get((i * 4096 + j) * 16 + e * 4 + a);
        let u0 = 0, u1 = 1, lit = false;
        if (rk !== undefined) {
          if (rk > heroN) continue;
          const fwd = ROUTE[rk].a === a, uu = rk === heroN ? heroU : 1;
          if (fwd) { u0 = 0; u1 = uu; } else { u0 = 1 - uu; u1 = 1; }
          lit = true;
        } else {
          if (pDraw <= 0) continue;
          const g = arcGeom(i, j, a, e);
          const d0 = Math.hypot(g.cx + 0.5 * Math.cos(g.a0) - WAVE_ORIGIN.x, g.cy + 0.5 * Math.sin(g.a0) - WAVE_ORIGIN.y);
          const d1 = Math.hypot(g.cx + 0.5 * Math.cos(g.a1) - WAVE_ORIGIN.x, g.cy + 0.5 * Math.sin(g.a1) - WAVE_ORIGIN.y);
          if (d0 <= d1) { u0 = 0; u1 = pDraw; } else { u0 = 1 - pDraw; u1 = 1; }
        }
        if (!arcPoints(B, i, j, a, e, turn.ang, u0, u1, n, pts)) continue;
        const pth = new Path2D();
        pth.moveTo(pts[0], pts[1]);
        for (let q = 2; q < pts.length; q += 2) pth.lineTo(pts[q], pts[q + 1]);
        const key = `${layer}|${bk}|${lit ? 'L' : amber ? 'A' : 'C'}`;
        (paths[key] ??= new Path2D()).addPath(pth);
        const hot = Math.min(1, Math.max(lit ? 0.3 : fresh * 0.28, turn.heat * 0.85, light * 0.95)) * fz;
        if (hot > 0.05) {
          const lv = Math.min(LEVELS, Math.ceil(hot * LEVELS));
          (heatP[`${wcls}|${lv}`] ??= new Path2D()).addPath(pth);
          if (light > 0.12 && layer === 'm') litP[Math.min(LEVELS, Math.ceil(light * fz * LEVELS))].addPath(pth);
        }
      }
    }
  }

  // keskin + bulanık katmanlar
  const strokeBucket = (c: Ctx, key: string, pth: Path2D) => {
    const [, bs, col] = key.split('|');
    const z = bucketZ(+bs);
    const w = Math.max(0.8, (B.f * (col === 'L' ? 0.11 : 0.085)) / z);
    const thin = w < 1.4 ? w / 1.4 : 1;
    const fz = fog(z);
    const base = col === 'A' ? AMBER : col === 'L' ? TRAILC : CREAM;
    const cool = col === 'L' ? 0 : (1 - fz) * 0.85;
    const rgb = [base[0] + (138 - base[0]) * cool, base[1] + (170 - base[1]) * cool, base[2] + (182 - base[2]) * cool].map(Math.round);
    const a = (col === 'A' ? 0.62 : col === 'L' ? 0.95 : 0.46) * fz * thin * (col === 'L' ? 1 : 0.55 + 0.45 * fz);
    c.lineWidth = w;
    c.lineCap = 'round';
    c.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
    c.stroke(pth);
  };
  for (const key of Object.keys(paths)) strokeBucket(key[0] === 'm' ? ctx : nearC, key, paths[key]);
  // aydınlanan yaylar: keskin sıcak beyaz (ışık kaynağının yakınında)
  ctx.lineCap = 'round';
  for (let lv = 1; lv <= LEVELS; lv++) {
    ctx.lineWidth = Math.max(1, (B.f * 0.09) / Math.max(1, focusZ));
    ctx.strokeStyle = `rgba(255,236,205,${0.6 * (lv / LEVELS)})`;
    ctx.stroke(litP[lv]);
  }
  ctx.filter = `blur(${Math.min(10, 2.5 + 2.5 * (focusZ / 3))}px)`;
  ctx.globalAlpha = 0.72;
  ctx.drawImage(bufs.near, 0, 0);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;

  // ısı / ışık izleri → ışık katmanı
  for (const key of Object.keys(heatP)) {
    const [wc, lv] = key.split('|').map(Number);
    glowC.lineWidth = wc === 0 ? 12 : 5;
    glowC.strokeStyle = `rgba(255,190,110,${0.62 * (lv / LEVELS)})`;
    glowC.stroke(heatP[key]);
  }

  // dönüş dalgasının ön cephesi: zeminde genişleyen tek ışık halkası
  const rr = turnRadius(t), ringK = t > T.turn ? 1 - Math.min(1, (t - T.turn) / 1.5) : 0;
  if (ringK > 0 && rr > 0.2) {
    const ring = new Path2D();
    let started = false;
    for (let s = 0; s <= 160; s++) {
      const an = (s / 160) * Math.PI * 2, q = proj(B, turnOrigin.x + rr * Math.cos(an), turnOrigin.y + rr * Math.sin(an));
      if (q[2] <= 0.1 || q[2] > FOG1) { started = false; continue; }
      if (!started) { ring.moveTo(q[0], q[1]); started = true; } else ring.lineTo(q[0], q[1]);
    }
    glowC.lineWidth = 16;
    glowC.strokeStyle = `rgba(255,200,120,${0.75 * ringK})`;
    glowC.stroke(ring);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(255,236,200,${0.45 * ringK})`;
    ctx.stroke(ring);
    ctx.globalCompositeOperation = 'source-over';
  }

  // --- kuyruklu yıldızlar ---
  const drawComet = (path: readonly Step[], sHead: number, trail: number, power: number, streak: number) => {
    if (sHead <= 0) return;
    const s0 = Math.max(0, sHead - trail), stepS = 0.045;
    const segs: Array<[number, number, number, number, number, number]> = [];
    let prev: [number, number, number] | null = null;
    for (let s = s0; s <= sHead + 1e-6; s += stepS) {
      const p = pointOnPath(path, s);
      const turnA = tileTurn(path[p.n].i, path[p.n].j, t);
      // dönen karoda iz, karonun anlık açısını izler (son yön = hedef yön)
      const cxT = path[p.n].i + 0.5, cyT = path[p.n].j + 0.5;
      const phi = turnA.ang === 0 ? 0 : turnA.ang - Math.sign(turnA.ang) * (Math.PI / 2);
      const x = cxT + (p.x - cxT) * Math.cos(phi) - (p.y - cyT) * Math.sin(phi);
      const y = cyT + (p.x - cxT) * Math.sin(phi) + (p.y - cyT) * Math.cos(phi);
      const q = proj(B, x, y);
      if (q[2] > 0.05 && prev) segs.push([prev[0], prev[1], q[0], q[1], (s - s0) / Math.max(1e-6, sHead - s0), q[2]]);
      prev = q[2] > 0.05 ? q : null;
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const [x0, y0, x1, y1, k, z] of segs) {
      const a = Math.pow(k, 1.7) * power;
      const fz = fog(z);
      glowC.lineWidth = Math.max(2, (B.f * 0.13) / z);
      glowC.strokeStyle = `rgba(255,${Math.round(150 + 90 * k)},${Math.round(70 + 150 * k * k)},${0.9 * a * fz})`;
      glowC.beginPath(); glowC.moveTo(x0, y0); glowC.lineTo(x1, y1); glowC.stroke();
      ctx.lineWidth = Math.max(1, (B.f * 0.045) / z);
      ctx.strokeStyle = `rgba(255,248,232,${0.95 * Math.pow(k, 2.4) * power * fz})`;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    const hq = pointOnPath(path, sHead);
    const hpq = proj(B, hq.x, hq.y);
    if (hpq[2] <= 0.05) return;
    const zf = fog(hpq[2]);
    const R = Math.min(150, Math.max(14, (B.f * 0.32) / hpq[2])) * (0.6 + 0.4 * power);
    const gg = glowC.createRadialGradient(hpq[0], hpq[1], 0, hpq[0], hpq[1], R);
    gg.addColorStop(0, `rgba(255,250,235,${0.95 * power * zf})`);
    gg.addColorStop(0.25, `rgba(255,200,120,${0.5 * power * zf})`);
    gg.addColorStop(1, 'rgba(255,160,70,0)');
    glowC.fillStyle = gg;
    glowC.fillRect(hpq[0] - R, hpq[1] - R, R * 2, R * 2);
    ctx.globalCompositeOperation = 'lighter';
    const r0 = Math.max(2, (B.f * 0.035) / hpq[2]);
    ctx.fillStyle = `rgba(255,252,244,${power * zf})`;
    ctx.beginPath(); ctx.arc(hpq[0], hpq[1], r0, 0, Math.PI * 2); ctx.fill();
    if (streak > 0) {
      // anamorfik parlama: yatay ince çizgi + geniş yumuşak şerit (ekrana hizalı, lens kusuru)
      const L = 980 * streak;
      const s1 = ctx.createLinearGradient(hpq[0] - L / 2, 0, hpq[0] + L / 2, 0);
      s1.addColorStop(0, 'rgba(255,170,80,0)'); s1.addColorStop(0.5, `rgba(255,236,200,${0.75 * streak * zf})`); s1.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = s1;
      ctx.fillRect(hpq[0] - L / 2, hpq[1] - 1.6, L, 3.2);
      const s2 = ctx.createLinearGradient(hpq[0] - L * 0.35, 0, hpq[0] + L * 0.35, 0);
      s2.addColorStop(0, 'rgba(255,150,60,0)'); s2.addColorStop(0.5, `rgba(255,170,90,${0.16 * streak * zf})`); s2.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = s2;
      ctx.fillRect(hpq[0] - L * 0.35, hpq[1] - 10, L * 0.7, 20);
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  const ign = Math.max(0, 1 - Math.abs(t - T.ignite - 0.05) / 0.28);
  drawComet(ROUTE, heroS(t), 5.5, 1, 0.55 + 0.9 * ign);
  if (ign > 0) {
    const sp = proj(B, 0.5, 0.02);
    if (sp[2] > 0.05) {
      const R = 560 * ign * ign;
      const gg = glowC.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], R);
      gg.addColorStop(0, `rgba(255,244,220,${0.9 * ign})`); gg.addColorStop(0.3, `rgba(255,180,90,${0.35 * ign})`); gg.addColorStop(1, 'rgba(255,150,60,0)');
      glowC.fillStyle = gg;
      glowC.fillRect(sp[0] - R, sp[1] - R, R * 2, R * 2);
    }
  }
  for (const c of COMETS) {
    if (t < c.t0) continue;
    drawComet(c.path, cometS(c, t), c.trail, 0.55 * Math.min(1, (t - c.t0) / 0.25), 0);
  }

  // --- havada süzülen toz: ışığa yakın olanlar parlar, odak dışındakiler bokeh ---
  ctx.globalCompositeOperation = 'lighter';
  for (let m = 0; m < 70; m++) {
    const x = hero.x + (hash(m, 1, 21) - 0.5) * 22 + Math.sin(t * 0.35 + m) * 0.3;
    const y = -6 + hash(m, 2, 21) * 46 + Math.cos(t * 0.3 + m * 1.7) * 0.3;
    const zz = 0.25 + hash(m, 3, 21) * 4.5 + Math.sin(t * 0.5 + m * 0.7) * 0.1;
    const q = proj(B, x, y, zz);
    if (q[2] <= 0.2 || q[0] < -60 || q[0] > W + 60 || q[1] < -60 || q[1] > H + 60) continue;
    const d2 = (x - hero.x) ** 2 + (y - hero.y) ** 2 + zz * zz;
    const lum = (0.1 + 0.9 * Math.exp(-d2 / 5)) * fog(q[2]) * (t > T.ignite ? 1 : 0);
    const defocus = Math.abs(1 - focusZ / q[2]);
    const r = Math.max(1.2, (B.f * 0.012) / q[2]) * (1 + Math.min(6, defocus * 4));
    const a = (0.55 * lum) / (1 + defocus * 3);
    if (a < 0.01) continue;
    const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r);
    g.addColorStop(0, `rgba(255,226,180,${a})`); g.addColorStop(0.6, `rgba(255,200,140,${a * 0.45})`); g.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(q[0] - r, q[1] - r, r * 2, r * 2);
  }

  // --- bloom: ışık katmanını üç yarıçapla ekle ---
  ctx.filter = 'blur(3px)'; ctx.globalAlpha = 0.95; ctx.drawImage(bufs.glow, 0, 0, W, H);
  ctx.filter = 'blur(14px)'; ctx.globalAlpha = 0.6; ctx.drawImage(bufs.glow, 0, 0, W, H);
  ctx.filter = 'blur(44px)'; ctx.globalAlpha = 0.42; ctx.drawImage(bufs.glow, 0, 0, W, H);
  ctx.filter = 'none'; ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

// hareket bulanıklığı: hızlı dalışta alt kareleri ortala
export function renderFrame(ctx: Ctx, t: number, bufs: Bufs, W: number, H: number, fps: number) {
  const dv = (T.dive[0] < t && t < T.dive[1]) ? Math.pow((t - T.dive[0]) / (T.dive[1] - T.dive[0]), 1.2) : 0;
  const n = dv > 0.15 ? 4 : 1;
  if (n === 1) { drawScene(ctx, t, bufs, W, H); return; }
  const acc = bufs.acc.getContext('2d')!, scr = bufs.scratch.getContext('2d')!;
  acc.globalCompositeOperation = 'source-over'; acc.globalAlpha = 1; acc.fillStyle = '#000'; acc.fillRect(0, 0, W, H);
  for (let s = 0; s < n; s++) {
    drawScene(scr, t + ((s + 0.5) / n - 0.5) * (0.7 / fps), bufs, W, H);
    acc.globalCompositeOperation = 'lighter'; acc.globalAlpha = 1 / n; acc.drawImage(bufs.scratch, 0, 0);
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
  ctx.drawImage(bufs.acc, 0, 0);
}
