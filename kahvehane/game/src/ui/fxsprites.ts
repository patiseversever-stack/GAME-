// Pişti efektlerinin parçacık görselleri: bir kez (boşta, dilim dilim) tuvalde "gerçek" görünümlü çizilir —
// yumuşak ışık hâleleri, anamorfik mercek parlaması, kırınım dikenli yıldız parıltıları, kıvılcım/kuyruklu yıldız
// izleri, şok halkaları, ışık hüzmeleri, gerçek yıldırım (çekirdek + parıltı), boyalı lale yaprakları, cam nazar
// boncuğu ve kırıkları, metal altın taç, kozmik girdap diski, duman. Sonuç PNG veri adresi olarak saklanır; DOM
// düğümleri bunu arka plan görseli yapar ve yalnız transform/opacity ile oynatılır (bileşimci). Bellek sınırlı:
// ~35 küçük görsel, her biri bir kez.
import {ASSETS} from './assets';
import {suitOutline, suitPath} from '../skins/kit';

type Ctx = CanvasRenderingContext2D;
type RGB = readonly [number, number, number];
interface Def {
  w: number;
  h: number;
  draw: (g: Ctx, w: number, h: number) => void;
}

const rgba = (c: RGB, a: number): string => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a: RGB, b: RGB, t: number): RGB => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Işık paleti: çekirdek (beyaza yakın) → orta → dış ton */
interface Pal {
  core: RGB;
  mid: RGB;
  out: RGB;
}
export const PAL = {
  gold: {core: [255, 252, 236], mid: [255, 214, 120], out: [255, 140, 30]},
  white: {core: [255, 255, 255], mid: [236, 244, 255], out: [170, 200, 255]},
  blue: {core: [240, 250, 255], mid: [130, 205, 255], out: [40, 100, 255]},
  rose: {core: [255, 244, 246], mid: [255, 140, 165], out: [215, 20, 75]},
  violet: {core: [250, 242, 255], mid: [196, 150, 255], out: [110, 40, 230]},
  cyan: {core: [240, 255, 255], mid: [120, 240, 255], out: [0, 170, 230]},
  silver: {core: [255, 255, 255], mid: [226, 232, 245], out: [150, 170, 210]},
} satisfies Record<string, Pal>;
type PalKey = keyof typeof PAL;

// ───────────────────────── ışıklar ─────────────────────────
/** Yumuşak ışık hâlesi (Gauss'a yakın düşüş, beyaz çekirdek) */
function bloom(p: Pal): Def {
  return {
    w: 128,
    h: 128,
    draw(g, w) {
      const r = w / 2;
      const gr = g.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, rgba(p.core, 1));
      gr.addColorStop(0.07, rgba(p.core, 0.95));
      gr.addColorStop(0.18, rgba(p.mid, 0.62));
      gr.addColorStop(0.36, rgba(p.out, 0.26));
      gr.addColorStop(0.6, rgba(p.out, 0.08));
      gr.addColorStop(0.82, rgba(p.out, 0.02));
      gr.addColorStop(1, rgba(p.out, 0));
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    },
  };
}
/** Tanrı ışınları: merkezden dışa farklı genişlik ve boyda yumuşak hüzmeler (döndürülerek kullanılır) */
function rays(p: Pal, seed: number): Def {
  return {
    w: 256,
    h: 256,
    draw(g, w) {
      const c = w / 2, R = w / 2, rnd = rng(seed);
      g.globalCompositeOperation = 'lighter';
      const N = 14;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + (rnd() - 0.5) * 0.25, wa = i % 2 ? 0.05 + rnd() * 0.05 : 0.1 + rnd() * 0.08, L = R * (0.7 + rnd() * 0.3);
        const col = i % 3 === 0 ? p.core : i % 3 === 1 ? p.mid : mix(p.mid, p.out, 0.4);
        const gr = g.createRadialGradient(c, c, 0, c, c, L);
        gr.addColorStop(0, rgba(col, 0));
        gr.addColorStop(0.08, rgba(col, 0.7));
        gr.addColorStop(0.3, rgba(col, 0.42));
        gr.addColorStop(0.7, rgba(col, 0.12));
        gr.addColorStop(1, rgba(col, 0));
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(c, c);
        g.arc(c, c, L, a - wa, a + wa);
        g.closePath();
        g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      const gr = g.createRadialGradient(c, c, 0, c, c, R * 0.35);
      gr.addColorStop(0, rgba(p.core, 0.5));
      gr.addColorStop(1, rgba(p.mid, 0));
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    },
  };
}
/** Şok halkası: ince parlak kenar, dışa doğru yumuşak ışıma, içte çok hafif dolgu */
function ring(p: Pal): Def {
  return {
    w: 200,
    h: 200,
    draw(g, w) {
      const c = w / 2, R = w / 2;
      const gr = g.createRadialGradient(c, c, 0, c, c, R);
      const r0 = 0.82;
      gr.addColorStop(0, rgba(p.out, 0));
      gr.addColorStop(r0 - 0.3, rgba(p.out, 0.04));
      gr.addColorStop(r0 - 0.1, rgba(p.mid, 0.25));
      gr.addColorStop(r0 - 0.025, rgba(p.core, 0.85));
      gr.addColorStop(r0, rgba(p.core, 1));
      gr.addColorStop(r0 + 0.03, rgba(p.mid, 0.55));
      gr.addColorStop(r0 + 0.1, rgba(p.out, 0.12));
      gr.addColorStop(1, rgba(p.out, 0));
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    },
  };
}
/** Anamorfik mercek parlaması: yatay ince ışık çizgisi + parlak çekirdek */
function flare(p: Pal): Def {
  return {
    w: 512,
    h: 56,
    draw(g, w, h) {
      g.save();
      g.translate(w / 2, h / 2);
      g.scale(1, (h / w) * 0.9);
      const R = w / 2;
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, R);
      gr.addColorStop(0, rgba(p.core, 1));
      gr.addColorStop(0.05, rgba(p.core, 0.85));
      gr.addColorStop(0.18, rgba(p.mid, 0.45));
      gr.addColorStop(0.5, rgba(p.out, 0.14));
      gr.addColorStop(1, rgba(p.out, 0));
      g.fillStyle = gr;
      g.fillRect(-R, -R, 2 * R, 2 * R);
      g.restore();
      // ince çekirdek çizgisi
      const lg = g.createLinearGradient(0, 0, w, 0);
      lg.addColorStop(0, rgba(p.mid, 0));
      lg.addColorStop(0.5, rgba(p.core, 0.95));
      lg.addColorStop(1, rgba(p.mid, 0));
      g.fillStyle = lg;
      g.fillRect(0, h / 2 - 1.2, w, 2.4);
      const cg = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h * 0.5);
      cg.addColorStop(0, rgba(p.core, 1));
      cg.addColorStop(1, rgba(p.core, 0));
      g.fillStyle = cg;
      g.fillRect(w / 2 - h / 2, 0, h, h);
    },
  };
}
/** Yıldız parıltısı: dört uzun kırınım dikeni + dört kısa çapraz diken + parlak çekirdek */
function glint(p: Pal): Def {
  return {
    w: 128,
    h: 128,
    draw(g, w) {
      const c = w / 2;
      const halo = g.createRadialGradient(c, c, 0, c, c, w * 0.3);
      halo.addColorStop(0, rgba(p.core, 0.9));
      halo.addColorStop(0.25, rgba(p.mid, 0.45));
      halo.addColorStop(1, rgba(p.out, 0));
      g.fillStyle = halo;
      g.fillRect(0, 0, w, w);
      g.globalCompositeOperation = 'lighter';
      const spike = (a: number, L: number, t: number, alpha: number): void => {
        g.save();
        g.translate(c, c);
        g.rotate(a);
        const lg = g.createLinearGradient(0, 0, L, 0);
        lg.addColorStop(0, rgba(p.core, alpha));
        lg.addColorStop(0.3, rgba(p.mid, alpha * 0.7));
        lg.addColorStop(1, rgba(p.out, 0));
        g.fillStyle = lg;
        g.beginPath();
        g.moveTo(0, -t);
        g.quadraticCurveTo(L * 0.25, -t * 0.25, L, 0);
        g.quadraticCurveTo(L * 0.25, t * 0.25, 0, t);
        g.closePath();
        g.fill();
        g.restore();
      };
      for (let i = 0; i < 4; i++) spike((i * Math.PI) / 2, w * 0.49, w * 0.035, 1);
      for (let i = 0; i < 4; i++) spike(Math.PI / 4 + (i * Math.PI) / 2, w * 0.24, w * 0.022, 0.7);
      g.globalCompositeOperation = 'source-over';
      const core = g.createRadialGradient(c, c, 0, c, c, w * 0.07);
      core.addColorStop(0, 'rgba(255,255,255,1)');
      core.addColorStop(1, rgba(p.core, 0));
      g.fillStyle = core;
      g.fillRect(0, 0, w, w);
    },
  };
}
/** Kıvılcım / kuyruklu iz: sağda parlak baş, solda incelen sıcak kuyruk (hız yönüne döndürülür) */
function streak(p: Pal, w: number, h: number, headAt = 0.86): Def {
  return {
    w,
    h,
    draw(g) {
      const cy = h / 2, hx = w * headAt, r = h * 0.3;
      const glow = g.createRadialGradient(hx, cy, 0, hx, cy, h * 0.5);
      glow.addColorStop(0, rgba(p.mid, 0.55));
      glow.addColorStop(1, rgba(p.out, 0));
      g.fillStyle = glow;
      g.fillRect(hx - h / 2, 0, h, h);
      const lg = g.createLinearGradient(0, 0, hx + r, 0);
      lg.addColorStop(0, rgba(p.out, 0));
      lg.addColorStop(0.4, rgba(p.out, 0.45));
      lg.addColorStop(0.78, rgba(p.mid, 0.95));
      lg.addColorStop(0.94, rgba(p.core, 1));
      lg.addColorStop(1, rgba(p.core, 1));
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(0, cy);
      g.quadraticCurveTo(hx * 0.6, cy - r * 0.55, hx, cy - r);
      g.arc(hx, cy, r, -Math.PI / 2, Math.PI / 2);
      g.quadraticCurveTo(hx * 0.6, cy + r * 0.55, 0, cy);
      g.closePath();
      g.fill();
      const core = g.createRadialGradient(hx, cy, 0, hx, cy, r * 0.9);
      core.addColorStop(0, 'rgba(255,255,255,1)');
      core.addColorStop(1, rgba(p.core, 0));
      g.fillStyle = core;
      g.fillRect(hx - r, cy - r, 2 * r, 2 * r);
    },
  };
}
/** Fişek / kıvılcım demeti: merkezden dışa onlarca ince ışık izi, uçlarında parlak baş (ölçekle "açılır") */
function burst(p: Pal, seed: number): Def {
  return {
    w: 256,
    h: 256,
    draw(g, w) {
      const c = w / 2, R = w * 0.48, rnd = rng(seed);
      g.globalCompositeOperation = 'lighter';
      g.lineCap = 'round';
      const N = 44;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + (rnd() - 0.5) * 0.12, r1 = R * (0.62 + rnd() * 0.38), r0 = r1 * (0.3 + rnd() * 0.2);
        const x0 = c + Math.cos(a) * r0, y0 = c + Math.sin(a) * r0, x1 = c + Math.cos(a) * r1, y1 = c + Math.sin(a) * r1;
        const lg = g.createLinearGradient(x0, y0, x1, y1);
        lg.addColorStop(0, rgba(p.out, 0));
        lg.addColorStop(0.6, rgba(p.mid, 0.55));
        lg.addColorStop(1, rgba(p.core, 1));
        g.strokeStyle = lg;
        g.lineWidth = 1.6 + rnd() * 1.6;
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke();
        const hg = g.createRadialGradient(x1, y1, 0, x1, y1, 5.5);
        hg.addColorStop(0, rgba(p.core, 1));
        hg.addColorStop(0.4, rgba(p.mid, 0.6));
        hg.addColorStop(1, rgba(p.out, 0));
        g.fillStyle = hg;
        g.fillRect(x1 - 6, y1 - 6, 12, 12);
      }
      const cg = g.createRadialGradient(c, c, 0, c, c, R * 0.35);
      cg.addColorStop(0, rgba(p.mid, 0.35));
      cg.addColorStop(1, rgba(p.out, 0));
      g.fillStyle = cg;
      g.fillRect(0, 0, w, w);
    },
  };
}
/** Göktaşı: uzun, ince, mavimsi beyaz kuyruk; başında küçük dikenli parıltı */
const meteor: Def = {
  w: 448,
  h: 44,
  draw(g, w, h) {
    const cy = h / 2, hx = w * 0.93;
    g.globalCompositeOperation = 'lighter';
    for (const [t, a, col] of [[h * 0.46, 0.22, [110, 150, 255]], [h * 0.26, 0.5, [180, 215, 255]], [h * 0.11, 1, [255, 255, 255]]] as const) {
      const lg = g.createLinearGradient(0, 0, hx, 0);
      lg.addColorStop(0, rgba(col, 0));
      lg.addColorStop(0.55, rgba(col, a * 0.35));
      lg.addColorStop(1, rgba(col, a));
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(0, cy);
      g.quadraticCurveTo(hx * 0.7, cy - t * 0.6, hx, cy - t);
      g.arc(hx, cy, t, -Math.PI / 2, Math.PI / 2);
      g.quadraticCurveTo(hx * 0.7, cy + t * 0.6, 0, cy);
      g.fill();
    }
    const halo = g.createRadialGradient(hx, cy, 0, hx, cy, h * 0.5);
    halo.addColorStop(0, 'rgba(255,255,255,1)');
    halo.addColorStop(0.3, 'rgba(200,225,255,.6)');
    halo.addColorStop(1, 'rgba(120,170,255,0)');
    g.fillStyle = halo;
    g.fillRect(hx - h / 2, 0, h, h);
    // baştaki dikey diken
    const vg = g.createLinearGradient(0, 0, 0, h);
    vg.addColorStop(0, 'rgba(255,255,255,0)');
    vg.addColorStop(0.5, 'rgba(255,255,255,.9)');
    vg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = vg;
    g.fillRect(hx - 1, 0, 2, h);
  },
};
/** Toz / polen zerresi */
function dust(p: Pal): Def {
  return {
    w: 32,
    h: 32,
    draw(g, w) {
      const c = w / 2;
      const gr = g.createRadialGradient(c, c, 0, c, c, c);
      gr.addColorStop(0, rgba(p.core, 1));
      gr.addColorStop(0.22, rgba(p.mid, 0.85));
      gr.addColorStop(0.55, rgba(p.out, 0.25));
      gr.addColorStop(1, rgba(p.out, 0));
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    },
  };
}
/** Duman / toz bulutu: üst üste binmiş yumuşak lekeler */
const smoke: Def = {
  w: 128,
  h: 128,
  draw(g, w) {
    const rnd = rng(77);
    for (let i = 0; i < 9; i++) {
      const a = rnd() * Math.PI * 2, d = rnd() * w * 0.18, x = w / 2 + Math.cos(a) * d, y = w / 2 + Math.sin(a) * d * 0.7, r = w * (0.18 + rnd() * 0.16);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const warm = 230 + rnd() * 25;
      gr.addColorStop(0, `rgba(${warm | 0},${(warm - 14) | 0},${(warm - 34) | 0},.34)`);
      gr.addColorStop(1, `rgba(${warm | 0},${(warm - 18) | 0},${(warm - 40) | 0},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    }
  },
};
/** Yukarıdan inen ışık hüzmesi */
const shaft: Def = {
  w: 128,
  h: 512,
  draw(g, w, h) {
    const lg = g.createLinearGradient(0, 0, w, 0);
    lg.addColorStop(0, 'rgba(255,214,120,0)');
    lg.addColorStop(0.3, 'rgba(255,214,120,.28)');
    lg.addColorStop(0.5, 'rgba(255,248,220,.75)');
    lg.addColorStop(0.7, 'rgba(255,214,120,.28)');
    lg.addColorStop(1, 'rgba(255,214,120,0)');
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(w * 0.3, 0);
    g.lineTo(w * 0.7, 0);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.closePath();
    g.fill();
    g.globalCompositeOperation = 'destination-in';
    const vg = g.createLinearGradient(0, 0, 0, h);
    vg.addColorStop(0, 'rgba(0,0,0,.2)');
    vg.addColorStop(0.25, 'rgba(0,0,0,1)');
    vg.addColorStop(0.75, 'rgba(0,0,0,.8)');
    vg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = vg;
    g.fillRect(0, 0, w, h);
  },
};

// ───────────────────────── yıldırım ─────────────────────────
type Pt = [number, number];
/** Orta nokta kaydırmalı kırık çizgi */
function jag(a: Pt, b: Pt, rough: number, depth: number, rnd: () => number): Pt[] {
  let pts: Pt[] = [a, b];
  for (let d = 0; d < depth; d++) {
    const out: Pt[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i];
      const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy);
      const off = (rnd() - 0.5) * L * rough;
      out.push([(p[0] + q[0]) / 2 - (dy / L) * off, (p[1] + q[1]) / 2 + (dx / L) * off], q);
    }
    pts = out;
  }
  return pts;
}
function strokeBolt(g: Ctx, lines: Pt[][], k: number): void {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.globalCompositeOperation = 'lighter';
  for (const [lw, col] of [[26, 'rgba(70,120,255,.07)'], [15, 'rgba(90,150,255,.14)'], [8, 'rgba(140,195,255,.32)'], [4, 'rgba(200,230,255,.7)'], [1.8, 'rgba(255,255,255,1)']] as const)
    lines.forEach((ln, i) => {
      g.lineWidth = lw * k * (i === 0 ? 1 : 0.55);
      g.strokeStyle = col;
      g.beginPath();
      ln.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    });
}
function bolt(seed: number): Def {
  return {
    w: 200,
    h: 800,
    draw(g, w, h) {
      const rnd = rng(seed);
      const main = jag([w * 0.5 + (rnd() - 0.5) * 30, 0], [w * 0.5, h * 0.985], 0.34, 7, rnd);
      const lines: Pt[][] = [main];
      for (let i = 0; i < 4; i++) {
        const at = main[Math.floor(main.length * (0.18 + rnd() * 0.55))];
        const side = rnd() < 0.5 ? -1 : 1, L = h * (0.12 + rnd() * 0.16), ang = Math.PI / 2 + side * (0.4 + rnd() * 0.5);
        lines.push(jag(at, [at[0] + Math.cos(ang) * L, at[1] + Math.sin(ang) * L], 0.45, 5, rnd));
      }
      strokeBolt(g, lines, 2.2);
      // çarpma noktasında ışık
      const e = main[main.length - 1];
      const gr = g.createRadialGradient(e[0], e[1], 0, e[0], e[1], w * 0.3);
      gr.addColorStop(0, 'rgba(255,255,255,.95)');
      gr.addColorStop(0.3, 'rgba(160,210,255,.45)');
      gr.addColorStop(1, 'rgba(60,110,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, h - w * 0.3, w, w * 0.3);
    },
  };
}
/** Küçük elektrik arkı (yığının çevresinde çakar) */
const arc: Def = {
  w: 128,
  h: 128,
  draw(g, w) {
    const rnd = rng(5);
    const c = w / 2, R = w * 0.36;
    const pts: Pt[] = [];
    for (let i = 0; i <= 10; i++) {
      const a = -1 + (i / 10) * 2;
      pts.push([c + Math.cos(a) * R, c + Math.sin(a) * R]);
    }
    const lines: Pt[][] = [];
    let line: Pt[] = [];
    for (let i = 1; i < pts.length; i++) line.push(...jag(pts[i - 1], pts[i], 0.9, 2, rnd).slice(i > 1 ? 1 : 0));
    lines.push(line);
    line = jag([c + R, c], [c + R * 1.3, c + R * 0.5], 0.8, 3, rnd);
    lines.push(line);
    strokeBolt(g, lines, 0.45);
  },
};

// ───────────────────────── lale yaprağı ─────────────────────────
/** Lale yaprağı yolu (w×h kutusunda, taban altta ortada) */
function petalPath(w: number, h: number, ox = 0, oy = 0): Path2D {
  const cx = ox + w / 2, p = new Path2D();
  p.moveTo(cx, oy + h * 0.98);
  p.bezierCurveTo(ox + w * 0.1, oy + h * 0.84, ox + w * 0.02, oy + h * 0.4, ox + w * 0.2, oy + h * 0.14);
  p.quadraticCurveTo(cx - w * 0.06, oy + h * 0.02, cx + w * 0.02, oy + h * 0.02);
  p.quadraticCurveTo(cx + w * 0.16, oy + h * 0.04, ox + w * 0.82, oy + h * 0.16);
  p.bezierCurveTo(ox + w * 0.98, oy + h * 0.42, ox + w * 0.9, oy + h * 0.84, cx, oy + h * 0.98);
  return p;
}
/** Açan lale gülü (üstten): dışta 8 büyük, içte 6 küçük boyalı yaprak, altın göbek ve başçıklar */
const rosette: Def = {
  w: 256,
  h: 256,
  draw(g, w) {
    const c = w / 2;
    const halo = g.createRadialGradient(c, c, 0, c, c, c);
    halo.addColorStop(0, 'rgba(255,200,215,.55)');
    halo.addColorStop(0.5, 'rgba(255,120,150,.18)');
    halo.addColorStop(1, 'rgba(255,90,130,0)');
    g.fillStyle = halo;
    g.fillRect(0, 0, w, w);
    const ring = (n: number, L: number, Wd: number, off: number, base: string, top: string, edge: string): void => {
      for (let i = 0; i < n; i++) {
        g.save();
        g.translate(c, c);
        g.rotate(off + (i / n) * Math.PI * 2);
        g.translate(-Wd / 2, -L);
        const p = petalPath(Wd, L);
        const lg = g.createLinearGradient(0, L, 0, 0);
        lg.addColorStop(0, '#5a0414');
        lg.addColorStop(0.3, base);
        lg.addColorStop(0.9, top);
        lg.addColorStop(1, '#ffd0d8');
        g.fillStyle = lg;
        g.fill(p);
        g.save();
        g.clip(p);
        const sh = g.createLinearGradient(0, 0, Wd, 0);
        sh.addColorStop(0, 'rgba(255,235,235,.3)');
        sh.addColorStop(0.5, 'rgba(255,235,235,0)');
        sh.addColorStop(1, 'rgba(40,0,10,.3)');
        g.fillStyle = sh;
        g.fillRect(0, 0, Wd, L);
        g.strokeStyle = 'rgba(80,0,20,.3)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(Wd / 2, L * 0.95);
        g.quadraticCurveTo(Wd / 2 + 1, L * 0.5, Wd / 2 - 1, L * 0.12);
        g.stroke();
        g.restore();
        g.strokeStyle = edge;
        g.lineWidth = 2;
        g.stroke(p);
        g.restore();
      }
    };
    ring(8, w * 0.46, w * 0.3, 0, '#c8102e', '#ff4a5e', 'rgba(255,206,90,.9)');
    ring(6, w * 0.3, w * 0.22, Math.PI / 6, '#e0204a', '#ff7a90', 'rgba(110,0,24,.45)');
    const cg = g.createRadialGradient(c - 4, c - 4, 0, c, c, w * 0.09);
    cg.addColorStop(0, '#fff6c0');
    cg.addColorStop(0.5, '#ffc83a');
    cg.addColorStop(1, '#a05a06');
    g.fillStyle = cg;
    g.beginPath();
    g.arc(c, c, w * 0.085, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3, x = c + Math.cos(a) * w * 0.11, y = c + Math.sin(a) * w * 0.11;
      g.strokeStyle = 'rgba(60,20,0,.7)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(c, c);
      g.lineTo(x, y);
      g.stroke();
      g.fillStyle = '#3a1404';
      g.beginPath();
      g.ellipse(x, y, 4, 2.5, a, 0, Math.PI * 2);
      g.fill();
    }
  },
};
function petal(base: RGB, top: RGB, edge: string | null, gold: boolean): Def {
  return {
    w: 64,
    h: 96,
    draw(g, w, h) {
      const cx = w / 2;
      const p = new Path2D();
      p.moveTo(cx, h * 0.98);
      p.bezierCurveTo(w * 0.1, h * 0.84, w * 0.02, h * 0.4, w * 0.2, h * 0.14);
      p.quadraticCurveTo(cx - w * 0.06, h * 0.02, cx + w * 0.02, h * 0.02);
      p.quadraticCurveTo(cx + w * 0.16, h * 0.04, w * 0.82, h * 0.16);
      p.bezierCurveTo(w * 0.98, h * 0.42, w * 0.9, h * 0.84, cx, h * 0.98);
      const lg = g.createLinearGradient(0, h, 0, 0);
      lg.addColorStop(0, rgba(mix(base, [20, 0, 0], 0.45), 1));
      lg.addColorStop(0.35, rgba(base, 1));
      lg.addColorStop(0.85, rgba(top, 1));
      lg.addColorStop(1, rgba(mix(top, [255, 255, 255], 0.3), 1));
      g.fillStyle = lg;
      g.fill(p);
      g.save();
      g.clip(p);
      // yandan ışık: sol üst parlak, sağ kenar gölgeli (kâse biçimi)
      const sh = g.createLinearGradient(0, 0, w, 0);
      sh.addColorStop(0, 'rgba(255,235,235,.32)');
      sh.addColorStop(0.45, 'rgba(255,235,235,0)');
      sh.addColorStop(0.8, 'rgba(40,0,10,.1)');
      sh.addColorStop(1, 'rgba(40,0,10,.35)');
      g.fillStyle = sh;
      g.fillRect(0, 0, w, h);
      if (gold) {
        const bg = g.createRadialGradient(cx, h, 0, cx, h, h * 0.4);
        bg.addColorStop(0, 'rgba(255,200,70,.75)');
        bg.addColorStop(1, 'rgba(255,200,70,0)');
        g.fillStyle = bg;
        g.fillRect(0, 0, w, h);
      }
      // damarlar
      g.strokeStyle = 'rgba(80,0,20,.3)';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(cx, h * 0.95);
      g.quadraticCurveTo(cx + 1, h * 0.5, cx - 1, h * 0.12);
      for (const s of [-1, 1]) {
        g.moveTo(cx, h * 0.7);
        g.quadraticCurveTo(cx + s * w * 0.18, h * 0.45, cx + s * w * 0.26, h * 0.2);
      }
      g.stroke();
      g.strokeStyle = 'rgba(255,230,230,.25)';
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(cx - 1.5, h * 0.9);
      g.quadraticCurveTo(cx - 0.5, h * 0.5, cx - 2.5, h * 0.15);
      g.stroke();
      g.restore();
      if (edge) {
        g.strokeStyle = edge;
        g.lineWidth = 2.2;
        g.stroke(p);
      } else {
        g.strokeStyle = 'rgba(60,0,15,.35)';
        g.lineWidth = 1;
        g.stroke(p);
      }
    },
  };
}

// ───────────────────────── nazar ─────────────────────────
/** Cam nazar boncuğu: lacivert cam, beyaz + açık mavi halkalar, koyu göz bebeği, parlak yansımalar */
function eyeBead(rimBevel: boolean): (g: Ctx, w: number) => void {
  return (g, w) => {
    const c = w / 2, r = w * 0.46;
    // dış cam
    const og = g.createRadialGradient(c - r * 0.2, c - r * 0.25, r * 0.1, c, c, r);
    og.addColorStop(0, '#5aa8ff');
    og.addColorStop(0.45, '#1f5fe0');
    og.addColorStop(0.85, '#0a2a90');
    og.addColorStop(1, '#061660');
    g.fillStyle = og;
    g.beginPath();
    g.arc(c, c, r, 0, Math.PI * 2);
    g.fill();
    if (rimBevel) {
      // eğimli cam kenar: dışta açık bir hat
      g.strokeStyle = 'rgba(160,210,255,.55)';
      g.lineWidth = r * 0.06;
      g.beginPath();
      g.arc(c, c, r * 0.94, Math.PI * 0.9, Math.PI * 1.7);
      g.stroke();
      g.strokeStyle = 'rgba(0,10,50,.5)';
      g.beginPath();
      g.arc(c, c, r * 0.94, Math.PI * 1.95, Math.PI * 0.75);
      g.stroke();
    }
    // beyaz halka
    const wg = g.createRadialGradient(c - r * 0.1, c - r * 0.12, r * 0.2, c, c, r * 0.62);
    wg.addColorStop(0, '#ffffff');
    wg.addColorStop(1, '#d4e6ff');
    g.fillStyle = wg;
    g.beginPath();
    g.arc(c, c, r * 0.6, 0, Math.PI * 2);
    g.fill();
    // açık mavi
    const lb = g.createRadialGradient(c - r * 0.08, c - r * 0.1, r * 0.05, c, c, r * 0.44);
    lb.addColorStop(0, '#b8ecff');
    lb.addColorStop(0.6, '#4ab8f0');
    lb.addColorStop(1, '#1a86d8');
    g.fillStyle = lb;
    g.beginPath();
    g.arc(c, c, r * 0.42, 0, Math.PI * 2);
    g.fill();
    // göz bebeği
    const pg = g.createRadialGradient(c - r * 0.05, c - r * 0.06, 0, c, c, r * 0.24);
    pg.addColorStop(0, '#26306a');
    pg.addColorStop(1, '#070a26');
    g.fillStyle = pg;
    g.beginPath();
    g.arc(c, c, r * 0.22, 0, Math.PI * 2);
    g.fill();
    // yansımalar
    g.save();
    g.translate(c - r * 0.38, c - r * 0.42);
    g.rotate(-0.65);
    const hg = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.34);
    hg.addColorStop(0, 'rgba(255,255,255,.95)');
    hg.addColorStop(0.5, 'rgba(255,255,255,.45)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    g.scale(1, 0.5);
    g.fillStyle = hg;
    g.beginPath();
    g.arc(0, 0, r * 0.34, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.fillStyle = 'rgba(255,255,255,.9)';
    g.beginPath();
    g.arc(c - r * 0.1, c - r * 0.1, r * 0.045, 0, Math.PI * 2);
    g.fill();
    const lo = g.createRadialGradient(c + r * 0.45, c + r * 0.5, 0, c + r * 0.45, c + r * 0.5, r * 0.3);
    lo.addColorStop(0, 'rgba(170,220,255,.45)');
    lo.addColorStop(1, 'rgba(170,220,255,0)');
    g.fillStyle = lo;
    g.fillRect(0, 0, w, w);
    g.strokeStyle = 'rgba(2,8,40,.55)';
    g.lineWidth = Math.max(1, r * 0.03);
    g.beginPath();
    g.arc(c, c, r, 0, Math.PI * 2);
    g.stroke();
  };
}
/** Cam kırığı */
function shard(seed: number): Def {
  return {
    w: 64,
    h: 64,
    draw(g, w) {
      const rnd = rng(seed);
      const pts: Pt[] = [];
      const n = 3 + Math.floor(rnd() * 2);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd() * 0.8, r = w * (0.22 + rnd() * 0.24);
        pts.push([w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r]);
      }
      const p = new Path2D();
      pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
      p.closePath();
      const lg = g.createLinearGradient(0, 0, w, w);
      lg.addColorStop(0, 'rgba(120,190,255,.95)');
      lg.addColorStop(0.5, 'rgba(30,100,240,.88)');
      lg.addColorStop(1, 'rgba(8,36,140,.92)');
      g.fillStyle = lg;
      g.fill(p);
      g.lineJoin = 'round';
      g.strokeStyle = 'rgba(180,225,255,.7)';
      g.lineWidth = 1.2;
      g.stroke(p);
      g.strokeStyle = 'rgba(255,255,255,.95)';
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      g.lineTo(pts[1][0], pts[1][1]);
      g.stroke();
      // iç parıltı
      const sg = g.createRadialGradient(w * 0.42, w * 0.4, 0, w * 0.42, w * 0.4, w * 0.2);
      sg.addColorStop(0, 'rgba(255,255,255,.6)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      g.save();
      g.clip(p);
      g.fillStyle = sg;
      g.fillRect(0, 0, w, w);
      g.restore();
    },
  };
}

// ───────────────────────── altın taç ─────────────────────────
function metalGold(g: Ctx, y0: number, y1: number): CanvasGradient {
  const lg = g.createLinearGradient(0, y0, 0, y1);
  lg.addColorStop(0, '#fff6c4');
  lg.addColorStop(0.18, '#ffd84a');
  lg.addColorStop(0.42, '#d99a14');
  lg.addColorStop(0.58, '#8a4e06');
  lg.addColorStop(0.72, '#e8b02a');
  lg.addColorStop(0.88, '#fff0a0');
  lg.addColorStop(1, '#a8640a');
  return lg;
}
function gem(g: Ctx, x: number, y: number, rx: number, ry: number, c0: string, c1: string): void {
  const gr = g.createRadialGradient(x - rx * 0.3, y - ry * 0.35, 0, x, y, Math.max(rx, ry));
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.18, c0);
  gr.addColorStop(1, c1);
  g.fillStyle = gr;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  // fasetler
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x - rx * 0.55, y);
  g.lineTo(x, y - ry * 0.55);
  g.lineTo(x + rx * 0.55, y);
  g.lineTo(x, y + ry * 0.55);
  g.closePath();
  g.stroke();
  g.strokeStyle = 'rgba(60,30,0,.8)';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.beginPath();
  g.arc(x - rx * 0.32, y - ry * 0.36, Math.max(1.2, rx * 0.16), 0, Math.PI * 2);
  g.fill();
}
function pearl(g: Ctx, x: number, y: number, r: number): void {
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, 0, x, y, r);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.5, '#f4ecdc');
  gr.addColorStop(1, '#a89a82');
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(80,50,10,.6)';
  g.lineWidth = 1.2;
  g.stroke();
}
const crown: Def = {
  w: 400,
  h: 320,
  draw(g, w, h) {
    const cx = w / 2;
    const bandTop = h * 0.6, bandBot = h * 0.86, sag = h * 0.05;
    // iç kadife (arkada)
    const vg = g.createRadialGradient(cx, h * 0.55, 0, cx, h * 0.55, w * 0.42);
    vg.addColorStop(0, '#b0122e');
    vg.addColorStop(1, '#4a0614');
    g.fillStyle = vg;
    g.beginPath();
    g.ellipse(cx, h * 0.62, w * 0.36, h * 0.3, 0, Math.PI, 0);
    g.fill();
    // ön gövde: bant + beş sivri uç
    const tips = [-0.42, -0.21, 0, 0.21, 0.42].map((u, i) => [cx + u * w, h * [0.24, 0.16, 0.06, 0.16, 0.24][i]] as const);
    const vals = [-0.315, -0.105, 0.105, 0.315].map((u, i) => [cx + u * w, h * [0.48, 0.44, 0.44, 0.48][i]] as const);
    const body = new Path2D();
    const L = cx - w * 0.44, R = cx + w * 0.44;
    body.moveTo(L, bandBot);
    body.lineTo(L + w * 0.01, bandTop - h * 0.02);
    body.lineTo(tips[0][0], tips[0][1]);
    for (let i = 0; i < 4; i++) {
      const [vx, vy] = vals[i], [nx, ny] = tips[i + 1];
      body.quadraticCurveTo((tips[i][0] + vx) / 2 + w * 0.01, (tips[i][1] + vy) / 2 + h * 0.06, vx, vy);
      body.quadraticCurveTo((vx + nx) / 2 - w * 0.01, (vy + ny) / 2 + h * 0.06, nx, ny);
    }
    body.lineTo(R - w * 0.01, bandTop - h * 0.02);
    body.lineTo(R, bandBot);
    body.quadraticCurveTo(cx, bandBot + sag, L, bandBot);
    body.closePath();
    g.fillStyle = metalGold(g, h * 0.05, bandBot + sag);
    g.fill(body);
    // yatay metal parlaması (sol üstten ışık)
    g.save();
    g.clip(body);
    // silindir gölgesi: kenarlar koyu, sol-orta parlak
    const sh = g.createLinearGradient(L, 0, R, 0);
    sh.addColorStop(0, 'rgba(60,24,0,.45)');
    sh.addColorStop(0.12, 'rgba(60,24,0,.08)');
    sh.addColorStop(0.32, 'rgba(255,255,230,.32)');
    sh.addColorStop(0.45, 'rgba(255,255,230,0)');
    sh.addColorStop(0.8, 'rgba(60,24,0,.18)');
    sh.addColorStop(1, 'rgba(60,24,0,.55)');
    g.fillStyle = sh;
    g.fillRect(0, 0, w, h);
    // uçlarda kabartma çizgileri
    g.strokeStyle = 'rgba(255,250,210,.65)';
    g.lineWidth = 2;
    for (const [tx, ty] of tips) {
      g.beginPath();
      g.moveTo(tx, ty + h * 0.03);
      g.lineTo(tx - w * 0.02, bandTop - h * 0.04);
      g.stroke();
    }
    g.restore();
    // bant: üst ve alt kordon
    const band = new Path2D();
    band.moveTo(L, bandTop);
    band.quadraticCurveTo(cx, bandTop + sag, R, bandTop);
    band.lineTo(R, bandBot);
    band.quadraticCurveTo(cx, bandBot + sag, L, bandBot);
    band.closePath();
    g.fillStyle = metalGold(g, bandTop, bandBot + sag);
    g.fill(band);
    g.save();
    g.clip(band);
    g.fillStyle = sh;
    g.fillRect(0, 0, w, h);
    // kazıma: bant boyunca küçük eşkenar dörtgenler
    g.strokeStyle = 'rgba(110,60,0,.55)';
    g.lineWidth = 1.2;
    for (let i = -9; i <= 9; i++) {
      const x = cx + i * w * 0.045, y = (bandTop + bandBot) / 2 + sag * (1 - (i / 9) ** 2) * 0.55, d = h * 0.03;
      if (Math.abs(i) <= 1 || Math.abs(i) === 4 || Math.abs(i) === 7) continue;
      g.beginPath();
      g.moveTo(x, y - d);
      g.lineTo(x + d * 0.7, y);
      g.lineTo(x, y + d);
      g.lineTo(x - d * 0.7, y);
      g.closePath();
      g.stroke();
    }
    g.restore();
    g.lineWidth = 3;
    g.strokeStyle = '#6a3a04';
    g.stroke(band);
    for (const [y, a] of [[bandTop + 4, 0.8], [bandBot - 4, 0.5]] as const) {
      g.strokeStyle = `rgba(255,246,200,${a})`;
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(L + 6, y);
      g.quadraticCurveTo(cx, y + sag, R - 6, y);
      g.stroke();
    }
    g.lineWidth = 3;
    g.strokeStyle = '#6a3a04';
    g.stroke(body);
    // taşlar
    const by = (bandTop + bandBot) / 2 + sag * 0.55;
    gem(g, cx, by, w * 0.055, h * 0.075, '#ff3a52', '#6a0010');
    gem(g, cx - w * 0.2, by - sag * 0.15, w * 0.035, h * 0.05, '#4ab0ff', '#062a7a');
    gem(g, cx + w * 0.2, by - sag * 0.15, w * 0.035, h * 0.05, '#4ab0ff', '#062a7a');
    gem(g, cx - w * 0.34, by - sag * 0.5, w * 0.025, h * 0.035, '#3ae08a', '#04502a');
    gem(g, cx + w * 0.34, by - sag * 0.5, w * 0.025, h * 0.035, '#3ae08a', '#04502a');
    gem(g, cx, h * 0.3, w * 0.03, h * 0.05, '#ff3a52', '#6a0010');
    for (const [tx, ty] of tips) pearl(g, tx, ty - h * 0.015, w * (tx === cx ? 0.034 : 0.027));
  },
};

// ───────────────────────── kozmik girdap ─────────────────────────
const disc: Def = {
  w: 256,
  h: 256,
  draw(g, w) {
    const c = w / 2, R = w * 0.48, rnd = rng(9);
    const bg = g.createRadialGradient(c, c, 0, c, c, R);
    bg.addColorStop(0, 'rgba(255,240,255,.9)');
    bg.addColorStop(0.12, 'rgba(220,150,255,.55)');
    bg.addColorStop(0.45, 'rgba(110,40,220,.22)');
    bg.addColorStop(1, 'rgba(40,10,120,0)');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, w);
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    const cols: RGB[] = [[120, 70, 255], [200, 90, 255], [70, 200, 255], [255, 200, 120]];
    for (let arm = 0; arm < 3; arm++) {
      const a0 = (arm / 3) * Math.PI * 2;
      for (let i = 0; i < 70; i++) {
        const t = i / 70, th = a0 + t * Math.PI * 2.6, r = R * (0.96 - 0.86 * t) * (0.94 + rnd() * 0.12);
        const da = 0.18 + rnd() * 0.2;
        const col = mix(cols[(arm + (t > 0.6 ? 2 : 0)) % 4], [255, 255, 255], t * 0.6);
        g.strokeStyle = rgba(col, 0.1 + t * 0.4);
        g.lineWidth = (1 - t) * 9 + 1.5;
        g.beginPath();
        g.arc(c, c, r, th, th + da);
        g.stroke();
      }
    }
    const core = g.createRadialGradient(c, c, 0, c, c, R * 0.16);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(1, 'rgba(255,220,255,0)');
    g.fillStyle = core;
    g.fillRect(0, 0, w, w);
  },
};

// ───────────────────────── parlak 3B takım amblemi ─────────────────────────
/** ♥♦ yakut kırmızısı, ♣♠ gece laciverti; parlak cam/emaye gövde, altın kenar, sol üstte parlama */
function suit3d(su: 'H' | 'D' | 'C' | 'S'): Def {
  return {
    w: 128,
    h: 128,
    draw(g, w) {
      const c = w / 2, k = w * 0.72, red = su === 'H' || su === 'D';
      const path = suitPath(su), out = suitOutline(su);
      // yumuşak gölge
      g.save();
      g.translate(c + w * 0.02, c + w * 0.04);
      g.scale(k * 1.02, k * 1.02);
      g.fillStyle = 'rgba(0,0,20,.35)';
      g.fill(path);
      g.restore();
      g.save();
      g.translate(c, c);
      g.scale(k, k);
      const lg = g.createLinearGradient(0, -0.55, 0, 0.55);
      if (red) {
        lg.addColorStop(0, '#ff8a94');
        lg.addColorStop(0.3, '#ef2a44');
        lg.addColorStop(0.72, '#a8081f');
        lg.addColorStop(1, '#58000e');
      } else {
        lg.addColorStop(0, '#6a7ac0');
        lg.addColorStop(0.3, '#26346e');
        lg.addColorStop(0.72, '#0c1234');
        lg.addColorStop(1, '#03050f');
      }
      g.fillStyle = lg;
      g.fill(path);
      g.save();
      g.clip(path);
      const hg = g.createRadialGradient(-0.2, -0.3, 0.02, -0.12, -0.12, 0.75);
      hg.addColorStop(0, 'rgba(255,255,255,.55)');
      hg.addColorStop(0.35, 'rgba(255,255,255,.12)');
      hg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = hg;
      g.fillRect(-1, -1, 2, 2);
      const rg = g.createRadialGradient(0.18, 0.42, 0, 0.18, 0.42, 0.45);
      rg.addColorStop(0, red ? 'rgba(255,170,150,.35)' : 'rgba(120,170,255,.35)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(-1, -1, 2, 2);
      g.save();
      g.translate(-0.17, -0.3);
      g.rotate(-0.6);
      g.scale(1, 0.45);
      const sg = g.createRadialGradient(0, 0, 0, 0, 0, 0.16);
      sg.addColorStop(0, 'rgba(255,255,255,.95)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sg;
      g.beginPath();
      g.arc(0, 0, 0.16, 0, Math.PI * 2);
      g.fill();
      g.restore();
      g.restore();
      g.lineJoin = 'round';
      g.lineWidth = 0.085;
      g.strokeStyle = '#2a1602';
      g.stroke(out);
      const gg = g.createLinearGradient(-0.5, -0.55, 0.5, 0.55);
      gg.addColorStop(0, '#fff3b0');
      gg.addColorStop(0.3, '#e8b030');
      gg.addColorStop(0.55, '#fff0a0');
      gg.addColorStop(0.8, '#b07410');
      gg.addColorStop(1, '#ffe080');
      g.lineWidth = 0.055;
      g.strokeStyle = gg;
      g.stroke(out);
      g.restore();
    },
  };
}

// ───────────────────────── katalog ─────────────────────────
const DEFS: Record<string, Def> = {
  meteor,
  smoke,
  shaft,
  arc,
  crown,
  disc,
  bolt1: bolt(11),
  bolt2: bolt(23),
  'eye': {w: 256, h: 256, draw: eyeBead(true)},
  'bead': {w: 96, h: 96, draw: eyeBead(false)},
  shard1: shard(3),
  shard2: shard(8),
  petal1: petal([200, 16, 46], [255, 74, 92], null, false),
  petal2: petal([226, 70, 110], [255, 168, 190], null, false),
  petal3: petal([176, 10, 40], [240, 40, 64], 'rgba(255,206,90,.95)', true),
  rosette,
  'suit:H': suit3d('H'),
  'suit:D': suit3d('D'),
  'suit:C': suit3d('C'),
  'suit:S': suit3d('S'),
};
for (const k of Object.keys(PAL) as PalKey[]) {
  const p = PAL[k];
  DEFS[`bloom:${k}`] = bloom(p);
  DEFS[`ring:${k}`] = ring(p);
  DEFS[`glint:${k}`] = glint(p);
  DEFS[`spark:${k}`] = streak(p, 96, 20);
  DEFS[`comet:${k}`] = streak(p, 192, 30, 0.9);
  DEFS[`dust:${k}`] = dust(p);
  DEFS[`flare:${k}`] = flare(p);
  DEFS[`rays:${k}`] = rays(p, k.length * 7);
  DEFS[`burst:${k}`] = burst(p, k.length * 13);
}
export type SpriteKey = string;

const URLS = new Map<string, string>();
const KEEP: HTMLImageElement[] = [];
/** Görselin adresi (yoksa hemen çizer). `coin` = oyunun jeton görseli. */
export function spriteUrl(key: SpriteKey): string {
  if (key === 'coin') return ASSETS.icon_coin;
  let u = URLS.get(key);
  if (u) return u;
  const d = DEFS[key];
  if (!d) throw new Error('fx görseli yok: ' + key);
  const c = document.createElement('canvas');
  c.width = d.w;
  c.height = d.h;
  const g = c.getContext('2d')!;
  d.draw(g, d.w, d.h);
  u = c.toDataURL('image/png');
  c.width = c.height = 0;
  URLS.set(key, u);
  // çözülmüş hâli bellekte kalsın: ilk gösterimde boş kare olmasın
  const img = new Image();
  img.src = u;
  img.decode?.().catch(() => undefined);
  KEEP.push(img);
  return u;
}
/** Görsel boyutu (CSS en-boy oranı için) */
export const spriteSize = (key: SpriteKey): [number, number] => (key === 'coin' ? [1, 1] : [DEFS[key].w, DEFS[key].h]);

/** Efektin kullandığı görseller (boşta önceden çizmek için) */
export const FX_SPRITES: Record<string, SpriteKey[]> = {
  klasik: ['suit:H', 'suit:D', 'suit:C', 'suit:S', 'bloom:gold', 'bloom:white', 'ring:gold', 'flare:gold', 'rays:gold', 'burst:gold', 'spark:gold', 'glint:gold', 'glint:white'],
  altin: ['coin', 'bloom:gold', 'ring:gold', 'shaft', 'glint:gold', 'glint:white', 'dust:gold'],
  havai: ['comet:gold', 'comet:rose', 'comet:silver', 'comet:cyan', 'burst:gold', 'burst:rose', 'burst:silver', 'burst:cyan', 'bloom:gold', 'bloom:rose', 'bloom:silver', 'bloom:cyan', 'glint:white'],
  yildiz: ['meteor', 'glint:white', 'glint:blue', 'bloom:blue', 'bloom:white', 'ring:blue', 'rays:white'],
  simsek: ['bolt1', 'bolt2', 'arc', 'bloom:blue', 'bloom:white', 'ring:blue', 'flare:blue', 'spark:blue', 'glint:blue'],
  lale: ['rosette', 'petal1', 'petal2', 'petal3', 'bloom:rose', 'ring:rose', 'rays:rose', 'glint:gold', 'dust:gold'],
  nazar: ['eye', 'bead', 'shard1', 'shard2', 'bloom:blue', 'bloom:white', 'ring:blue', 'glint:white'],
  tac: ['crown', 'shaft', 'smoke', 'bloom:gold', 'ring:gold', 'rays:gold', 'spark:gold', 'glint:white', 'glint:rose', 'glint:blue', 'glint:gold'],
  girdap: ['disc', 'spark:violet', 'spark:cyan', 'spark:gold', 'bloom:violet', 'bloom:white', 'ring:violet', 'flare:violet', 'burst:violet', 'burst:cyan', 'glint:white'],
};

/** Boşta, dilim dilim çiz (efekt anında çizim maliyeti olmasın). Önce verilen efekt, sonra diğerleri. */
export function warmSprites(first?: string, all = false): void {
  const order: string[] = [];
  const add = (id: string): void => {
    for (const k of FX_SPRITES[id] ?? []) if (k !== 'coin' && !URLS.has(k) && !order.includes(k)) order.push(k);
  };
  if (first) add(first);
  add('klasik');
  if (all) for (const id of Object.keys(FX_SPRITES)) add(id);
  if (!order.length) return;
  const ric = (globalThis as {requestIdleCallback?: (cb: () => void, o?: {timeout: number}) => number}).requestIdleCallback;
  const next = (): void => void (ric ? ric(step, {timeout: 1500}) : setTimeout(step, 60));
  const step = (): void => {
    const t0 = performance.now();
    while (order.length && performance.now() - t0 < 6) spriteUrl(order.shift()!);
    if (order.length) next();
  };
  next();
}
