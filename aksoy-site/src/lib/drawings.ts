// Teknik çizim tarzında ürün görselleri (SVG). Sunucuda ve tarayıcıda aynı fonksiyon kullanılır:
// ürün kartı, ürün sayfası, arama sonuçları ve teklif sepeti küçük resimleri.
import type { Drawing, InsertShape } from '../data/types';

type Pt = [number, number];

const STEEL = 'url(#dg-steel)';
const STEEL_D = 'url(#dg-steel-d)';
const GOLD = 'url(#dg-gold)';
const LINE = '#a9b0b9';
const DIM = '#59616b';

let uid = 0;

function defs(id: string) {
  return `<defs>
<linearGradient id="dg-steel-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a525c"/><stop offset=".45" stop-color="#2a3038"/><stop offset="1" stop-color="#14171b"/></linearGradient>
<linearGradient id="dg-steel-d-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c3239"/><stop offset="1" stop-color="#101215"/></linearGradient>
<linearGradient id="dg-gold-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d27e"/><stop offset=".5" stop-color="#d9a441"/><stop offset="1" stop-color="#8f6418"/></linearGradient>
<pattern id="dg-hatch-${id}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v4" stroke="#7d858f" stroke-width=".5" opacity=".5"/></pattern>
</defs>`;
}

const fmt = (n: number) => Math.round(n * 10) / 10;
const poly = (pts: Pt[]) => pts.map((p) => `${fmt(p[0])},${fmt(p[1])}`).join(' ');

/** Kenar uzunlukları ve dış dönüş açılarıyla çokgen üretir, sonra kutuya sığdırır. */
function walk(sides: number[], turnsDeg: number[]): Pt[] {
  const pts: Pt[] = [[0, 0]];
  let a = 0;
  for (let i = 0; i < sides.length - 1; i++) {
    const [x, y] = pts[pts.length - 1];
    pts.push([x + Math.cos(a) * sides[i], y + Math.sin(a) * sides[i]]);
    a += (turnsDeg[i] * Math.PI) / 180;
  }
  return pts;
}

function fit(pts: Pt[], cx: number, cy: number, w: number, h: number, rotDeg = 0): Pt[] {
  const r = (rotDeg * Math.PI) / 180;
  const rot = pts.map(([x, y]) => [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)] as Pt);
  const xs = rot.map((p) => p[0]);
  const ys = rot.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const s = Math.min(w / (maxX - minX), h / (maxY - minY));
  const ox = (minX + maxX) / 2, oy = (minY + maxY) / 2;
  return rot.map(([x, y]) => [cx + (x - ox) * s, cy + (y - oy) * s]);
}

function insertPolygon(shape: InsertShape): { pts: Pt[] | null; angle: number } {
  const rh = (a: number) => walk([1, 1, 1, 1], [180 - a, a, 180 - a, a]);
  const pg = (a: number, ratio: number) => walk([ratio, 1, ratio, 1], [180 - a, a, 180 - a, a]);
  switch (shape) {
    case 'C': return { pts: rh(80), angle: 80 };
    case 'D': return { pts: rh(55), angle: 55 };
    case 'E': return { pts: rh(75), angle: 75 };
    case 'V': return { pts: rh(35), angle: 35 };
    case 'H': return { pts: walk([1, 1, 1, 1, 1, 1], [60, 60, 60, 60, 60, 60]), angle: 120 };
    case 'O': return { pts: walk(Array(8).fill(1), Array(8).fill(45)), angle: 135 };
    case 'P': return { pts: walk(Array(5).fill(1), Array(5).fill(72)), angle: 108 };
    case 'S': return { pts: walk([1, 1, 1, 1], [90, 90, 90, 90]), angle: 90 };
    case 'T': return { pts: walk([1, 1, 1], [120, 120, 120]), angle: 60 };
    case 'W': return { pts: walk([1, 1, 1, 1, 1, 1], [100, 20, 100, 20, 100, 20]), angle: 80 };
    case 'L': return { pts: pg(90, 1.7), angle: 90 };
    case 'A': return { pts: pg(85, 1.55), angle: 85 };
    case 'K': return { pts: pg(55, 1.2), angle: 55 };
    case 'X': return { pts: pg(85, 1.55), angle: 85 };
    case 'R': return { pts: null, angle: 0 };
  }
  return { pts: rh(80), angle: 80 };
}

function shrink(pts: Pt[], k: number): Pt[] {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
}

function centerline(x1: number, y1: number, x2: number, y2: number) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${DIM}" stroke-width=".6" stroke-dasharray="8 3 1.5 3"/>`;
}

function dimH(x1: number, x2: number, y: number, label: string) {
  return `<g stroke="${DIM}" stroke-width=".6" fill="none"><line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/><line x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}"/><line x1="${x2}" y1="${y - 4}" x2="${x2}" y2="${y + 4}"/></g><text x="${(x1 + x2) / 2}" y="${y - 3.5}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="6.5" fill="#7d858f">${label}</text>`;
}

function insert(shape: InsertShape, id: string) {
  const { pts: raw, angle } = insertPolygon(shape);
  if (!raw) {
    return `<circle cx="100" cy="72" r="46" fill="${GOLD}" stroke="#f6d27e" stroke-width=".8"/>
<circle cx="100" cy="72" r="36" fill="none" stroke="#1a1408" stroke-opacity=".35"/>
<circle cx="100" cy="72" r="13" fill="#0b0c0e" stroke="#5e4310"/>
${dimH(54, 146, 132, 'IC')}`;
  }
  const pts = fit(raw, 100, 70, 140, 96, shape === 'T' || shape === 'W' ? -90 : -18);
  const inner = shrink(pts, 0.8);
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  // En sivri köşe = kesme köşesi
  let tip = 0, best = Infinity;
  pts.forEach((p, i) => {
    const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length];
    const v1 = [a[0] - p[0], a[1] - p[1]], v2 = [b[0] - p[0], b[1] - p[1]];
    const ang = Math.acos((v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2)));
    if (ang < best - 1e-6) { best = ang; tip = i; }
  });
  const t = pts[tip];
  const prev = pts[(tip + pts.length - 1) % pts.length];
  const next = pts[(tip + 1) % pts.length];
  const e1: Pt = [t[0] + (prev[0] - t[0]) * 0.35, t[1] + (prev[1] - t[1]) * 0.35];
  const e2: Pt = [t[0] + (next[0] - t[0]) * 0.35, t[1] + (next[1] - t[1]) * 0.35];
  const label = angle ? `${angle}°` : '';
  return `<polygon points="${poly(pts)}" fill="${GOLD}" stroke="#f6d27e" stroke-width=".8" stroke-linejoin="round"/>
<polygon points="${poly(inner)}" fill="none" stroke="#1a1408" stroke-opacity=".35" stroke-width=".9" stroke-linejoin="round"/>
<polyline points="${poly([e1, t, e2])}" fill="none" stroke="#fff3cf" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="9" fill="#0b0c0e" stroke="#5e4310"/>
<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="12.5" fill="none" stroke="#1a1408" stroke-opacity=".3"/>
${label ? `<text x="${fmt(t[0] + (t[0] - cx) * 0.18)}" y="${fmt(t[1] + (t[1] - cy) * 0.18 + 3)}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="8" fill="#d9a441">${label}</text>` : ''}
${centerline(20, fmt(cy), 180, fmt(cy))}`;
}

function shank(x: number, y: number, w: number, h: number, extra = '') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<line x1="${x + 2}" y1="${y + 1.6}" x2="${x + w - 2}" y2="${y + 1.6}" stroke="#cdd2d8" stroke-opacity=".45" stroke-width=".8"/>${extra}`;
}

function goldPoly(pts: Pt[]) {
  return `<polygon points="${poly(pts)}" fill="${GOLD}" stroke="#f6d27e" stroke-width=".6" stroke-linejoin="round"/>`;
}

const helix = (x1: number, x2: number, y1: number, y2: number, n: number, slant: number, color = '#0b0c0e', op = 0.55) => {
  let s = '';
  const step = (x2 - x1) / n;
  for (let i = 0; i < n; i++) {
    const x = x1 + i * step;
    s += `<path d="M${fmt(x)} ${y1} C ${fmt(x + slant * 0.3)} ${fmt(y1 + (y2 - y1) * 0.35)}, ${fmt(x + slant * 0.7)} ${fmt(y1 + (y2 - y1) * 0.65)}, ${fmt(x + slant)} ${y2}" fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="${fmt(step * 0.38)}" stroke-linecap="butt"/>`;
  }
  return s;
};

function body(drawing: Drawing, shape: InsertShape | undefined, id: string): string {
  switch (drawing) {
    case 'insert':
      return insert(shape ?? 'C', id);

    case 'groove-insert':
      return `${goldPoly([[30, 62], [44, 56], [156, 56], [170, 62], [170, 82], [156, 88], [44, 88], [30, 82]])}
<polygon points="70,56 100,66 130,56" fill="#0b0c0e" opacity=".45"/>
<polyline points="30,62 30,82" stroke="#fff3cf" stroke-width="1.8"/><polyline points="170,62 170,82" stroke="#fff3cf" stroke-width="1.8"/>
${dimH(30, 170, 108, 'MGMN')}${centerline(16, 72, 184, 72)}`;

    case 'thread-insert':
      return `${goldPoly([[100, 22], [150, 108], [50, 108]])}
<polygon points="100,22 108,36 92,36" fill="#fff3cf" opacity=".85"/>
<circle cx="100" cy="80" r="9" fill="#0b0c0e" stroke="#5e4310"/>
<text x="100" y="128" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="8" fill="#d9a441">60°</text>`;

    case 'holder-ext':
      return `${shank(22, 58, 130, 30)}
<polygon points="150,58 176,52 182,58 182,88 150,88" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
${goldPoly([[166, 52], [184, 46], [190, 58], [176, 64]])}
<circle cx="171" cy="70" r="3.4" fill="#0b0c0e" stroke="${LINE}" stroke-width=".5"/>
${dimH(22, 182, 110, 'h × b × l1')}${centerline(14, 73, 192, 73)}`;

    case 'holder-groove':
      return `${shank(20, 60, 118, 26)}
<polygon points="136,60 160,60 176,40 182,40 182,86 136,86" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<path d="M150 74 h22" stroke="#0b0c0e" stroke-width="2.4" stroke-linecap="round"/>
${goldPoly([[176, 34], [190, 34], [190, 44], [178, 44]])}
<circle cx="148" cy="68" r="3" fill="#0b0c0e" stroke="${LINE}" stroke-width=".5"/>
${dimH(20, 182, 108, 'MGEHR')}${centerline(12, 73, 192, 73)}`;

    case 'holder-thread':
      return `${shank(22, 58, 130, 30)}
<polygon points="150,58 178,52 182,58 182,88 150,88" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
${goldPoly([[174, 44], [192, 52], [176, 62]])}
<circle cx="168" cy="70" r="3.4" fill="#0b0c0e" stroke="${LINE}" stroke-width=".5"/>
${dimH(22, 182, 110, 'SER / SNR')}${centerline(14, 73, 192, 73)}`;

    case 'boring-bar':
      return `<rect x="16" y="62" width="150" height="20" rx="10" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<line x1="24" y1="64.5" x2="160" y2="64.5" stroke="#cdd2d8" stroke-opacity=".45"/>
<rect x="16" y="76" width="70" height="6" fill="#0b0c0e" opacity=".35"/>
<polygon points="160,62 180,62 184,70 176,82 160,82" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
${goldPoly([[176, 56], [188, 58], [186, 68], [176, 66]])}
${dimH(16, 184, 106, 'Ø d × l1')}${centerline(10, 72, 192, 72)}`;

    case 'drill-carbide':
    case 'drill-hss': {
      const isHss = drawing === 'drill-hss';
      const fill = isHss ? GOLD : STEEL;
      return `<rect x="16" y="60" width="62" height="24" rx="2" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<line x1="20" y1="62.5" x2="74" y2="62.5" stroke="#cdd2d8" stroke-opacity=".45"/>
<polygon points="78,61 80,63 166,63 186,72 166,81 80,81 78,83" fill="${fill}" stroke="${isHss ? '#f6d27e' : LINE}" stroke-width=".7"/>
<clipPath id="dc-${id}"><polygon points="80,63 166,63 186,72 166,81 80,81"/></clipPath>
<g clip-path="url(#dc-${id})">${helix(84, 196, 63, 81, 9, -14)}</g>
<polyline points="166,63 186,72 166,81" fill="none" stroke="#fff3cf" stroke-width="1.2" stroke-linejoin="round"/>
${dimH(16, 186, 106, isHss ? 'HSS · 118°' : 'VHM · 140°')}${centerline(10, 72, 192, 72)}`;
    }

    case 'drill-u':
      return `<rect x="14" y="56" width="52" height="32" rx="2" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<rect x="24" y="57" width="30" height="7" fill="#6a717b" opacity=".55"/>
<rect x="64" y="50" width="16" height="44" rx="3" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<rect x="80" y="60" width="96" height="24" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<path d="M86 66 H170 a4 4 0 0 1 0 8 H86 a4 4 0 0 1 0 -8z" fill="#0b0c0e" opacity=".55"/>
${goldPoly([[170, 56], [180, 56], [180, 64], [170, 64]])}
${goldPoly([[170, 78], [180, 78], [180, 86], [170, 86]])}
<circle cx="175" cy="60" r="1.6" fill="#0b0c0e"/><circle cx="175" cy="82" r="1.6" fill="#0b0c0e"/>
${dimH(80, 180, 112, '2xD – 5xD')}${centerline(8, 72, 192, 72)}`;

    case 'center-drill':
      return `<rect x="48" y="58" width="104" height="28" rx="2" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<polygon points="48,58 34,66 26,69 26,75 34,78 48,86" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<polygon points="152,58 166,66 174,69 174,75 166,78 152,86" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<polyline points="34,66 26,69 26,75 34,78" fill="none" stroke="#fff3cf" stroke-width="1"/>
${dimH(26, 174, 108, '60°')}${centerline(12, 72, 188, 72)}`;

    case 'endmill':
    case 'endmill-ball': {
      const ball = drawing === 'endmill-ball';
      const end = ball
        ? `<path d="M168 60 A12 12 0 0 1 168 84" fill="none" stroke="#fff3cf" stroke-width="1.2"/>`
        : `<polyline points="168,60 180,60 180,84 168,84" fill="none" stroke="#fff3cf" stroke-width="1.2"/>`;
      const outline = ball ? `M86 60 H168 A12 12 0 0 1 168 84 H86 Z` : `M86 60 H180 V84 H86 Z`;
      return `<rect x="16" y="60" width="72" height="24" rx="2" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<line x1="20" y1="62.5" x2="84" y2="62.5" stroke="#cdd2d8" stroke-opacity=".45"/>
<path d="${outline}" fill="${STEEL_D}" stroke="${LINE}" stroke-width=".7"/>
<clipPath id="em-${id}"><path d="${outline}"/></clipPath>
<g clip-path="url(#em-${id})">${helix(84, 200, 60, 84, 8, -16, '#cdd2d8', 0.22)}${helix(90, 206, 60, 84, 8, -16, '#0b0c0e', 0.5)}</g>
${end}
${dimH(86, 180, 106, ball ? 'R · küresel' : 'Z4 · HRC55')}${centerline(10, 72, 192, 72)}`;
    }

    case 'facemill': {
      let ins = '';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x = 100 + Math.cos(a) * 50, y = 72 + Math.sin(a) * 50;
        const r = (a * 180) / Math.PI + 90;
        ins += `<g transform="translate(${fmt(x)} ${fmt(y)}) rotate(${fmt(r)})"><rect x="-7" y="-6" width="14" height="12" rx="1.5" fill="${GOLD}" stroke="#f6d27e" stroke-width=".5"/><circle r="2" fill="#0b0c0e"/></g>`;
        const a2 = a + Math.PI / 6;
        ins += `<path d="M${fmt(100 + Math.cos(a2) * 36)} ${fmt(72 + Math.sin(a2) * 36)} L${fmt(100 + Math.cos(a2) * 56)} ${fmt(72 + Math.sin(a2) * 56)}" stroke="#0b0c0e" stroke-width="7" opacity=".5" stroke-linecap="round"/>`;
      }
      return `<circle cx="100" cy="72" r="56" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<circle cx="100" cy="72" r="38" fill="${STEEL_D}" stroke="${LINE}" stroke-width=".5"/>
${ins}
<circle cx="100" cy="72" r="13" fill="#0b0c0e" stroke="${LINE}" stroke-width=".6"/>
<rect x="96" y="56" width="8" height="5" fill="#0b0c0e"/>
${centerline(30, 72, 170, 72)}${centerline(100, 6, 100, 138)}`;
    }

    case 'tap': {
      let teeth = '';
      for (let x = 112; x < 174; x += 5) teeth += `L${x + 2.5} 58 L${x + 5} 63 `;
      const bot: string[] = [];
      for (let x = 112; x < 174; x += 5) bot.push(`L${x + 5} 81`, `L${x + 2.5} 86`);
      const teethB = bot.reverse().join(' ');
      return `<rect x="14" y="62" width="12" height="20" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<rect x="26" y="60" width="86" height="24" rx="2" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<line x1="30" y1="62.5" x2="108" y2="62.5" stroke="#cdd2d8" stroke-opacity=".45"/>
<path d="M112 63 ${teeth} L182 66 L182 78 L177 81 ${teethB} L112 81 Z" fill="${STEEL}" stroke="${LINE}" stroke-width=".6"/>
<path d="M112 63 ${teeth}" fill="none" stroke="#fff3cf" stroke-width=".7" opacity=".8"/>
<clipPath id="tp-${id}"><rect x="112" y="58" width="72" height="28"/></clipPath>
<g clip-path="url(#tp-${id})">${helix(110, 200, 58, 86, 5, -18, '#0b0c0e', 0.45)}</g>
${dimH(26, 182, 108, 'M · P')}${centerline(8, 72, 192, 72)}`;
    }

    case 'reamer': {
      let lines = '';
      for (let i = 0; i < 6; i++) lines += `<line x1="100" y1="${63 + i * 3.6}" x2="176" y2="${63 + i * 3.6}" stroke="#0b0c0e" stroke-opacity="${i % 2 ? 0.25 : 0.5}" stroke-width="1.4"/>`;
      return `<rect x="16" y="61" width="84" height="22" rx="2" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<polygon points="100,60 176,60 182,64 182,80 176,84 100,84" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>${lines}
${dimH(16, 182, 106, 'H7')}${centerline(8, 72, 192, 72)}`;
    }

    case 'collet': {
      let slits = '';
      for (let i = 0; i < 5; i++) slits += `<line x1="${70 + i * 15}" y1="${i % 2 ? 50 : 60}" x2="${70 + i * 15}" y2="${i % 2 ? 84 : 94}" stroke="#0b0c0e" stroke-width="1.6" opacity=".7"/>`;
      return `<polygon points="44,56 74,46 140,46 160,58 160,86 140,98 74,98 44,88" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<line x1="76" y1="49" x2="138" y2="49" stroke="#cdd2d8" stroke-opacity=".45"/>${slits}
<rect x="44" y="64" width="116" height="16" fill="#0b0c0e" opacity=".35"/>
${dimH(44, 160, 118, 'ER')}${centerline(30, 72, 174, 72)}`;
    }

    case 'chuck-bt':
      return `<polygon points="16,62 64,52 64,92 16,82" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<rect x="6" y="66" width="10" height="12" fill="${STEEL}" stroke="${LINE}" stroke-width=".6"/>
<rect x="64" y="40" width="26" height="64" rx="2" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<path d="M70 40 L77 47 L84 40" fill="none" stroke="#0b0c0e" stroke-width="2" opacity=".6"/>
<path d="M70 104 L77 97 L84 104" fill="none" stroke="#0b0c0e" stroke-width="2" opacity=".6"/>
<rect x="90" y="56" width="60" height="32" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<rect x="150" y="52" width="30" height="40" rx="3" fill="${STEEL_D}" stroke="${LINE}" stroke-width=".7"/>
<line x1="154" y1="55" x2="176" y2="55" stroke="#cdd2d8" stroke-opacity=".45"/>
${dimH(16, 180, 124, 'BT40 · ER32')}${centerline(2, 72, 196, 72)}`;

    case 'pull-stud':
      return `<rect x="30" y="64" width="20" height="16" rx="2" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<polygon points="50,60 70,56 70,88 50,84" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<rect x="70" y="52" width="16" height="40" rx="2" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
<rect x="86" y="62" width="80" height="20" fill="${STEEL}" stroke="${LINE}" stroke-width=".7"/>
${helix(90, 172, 62, 82, 14, 4, '#0b0c0e', 0.45)}
${dimH(30, 166, 112, 'MAS 403')}${centerline(20, 72, 180, 72)}`;
  }
  return insert('C', id);
}

export interface DrawingOpts {
  /** Arka planı karanlık kart için ızgara çizgisi ekle */
  grid?: boolean;
  /** Sağ alt köşedeki teknik etiket */
  label?: string;
  class?: string;
  title?: string;
}

export function drawingSvg(drawing: Drawing, shape?: InsertShape, opts: DrawingOpts = {}): string {
  const id = `d${(uid++).toString(36)}`;
  const inner = body(drawing, shape, id)
    .replaceAll('url(#dg-steel)', `url(#dg-steel-${id})`)
    .replaceAll('url(#dg-steel-d)', `url(#dg-steel-d-${id})`)
    .replaceAll('url(#dg-gold)', `url(#dg-gold-${id})`);
  const grid = opts.grid
    ? `<g stroke="#7d858f" stroke-opacity=".09" stroke-width=".5">${Array.from({ length: 9 }, (_, i) => `<line x1="${i * 25}" y1="0" x2="${i * 25}" y2="150"/>`).join('')}${Array.from({ length: 7 }, (_, i) => `<line x1="0" y1="${i * 25}" x2="200" y2="${i * 25}"/>`).join('')}</g>`
    : '';
  const label = opts.label
    ? `<text x="194" y="144" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="6.5" letter-spacing=".6" fill="#59616b">${opts.label}</text>`
    : '';
  const title = opts.title ? `<title>${opts.title}</title>` : '';
  const role = opts.title ? 'role="img"' : 'aria-hidden="true"';
  return `<svg viewBox="0 0 200 150" ${role} ${opts.class ? `class="${opts.class}"` : ''} xmlns="http://www.w3.org/2000/svg">${title}${defs(id)}${grid}${inner}${label}</svg>`;
}
