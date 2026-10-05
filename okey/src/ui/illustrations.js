// Vektör illüstrasyonlar (tek renk tonlu, CSS değişkenleriyle boyanır):
//  istanbulSVG() — katmanlı İstanbul silueti: camiler ve minareler, Galata Kulesi, Kız Kulesi, Boğaz Köprüsü, evler, servi;
//                  pencerelerde göz kırpan ışıklar, suda titreşen yansıma. Bitiş ve ilk açılış ekranlarının alt bandı.
//  arcadeSVG()   — Kapalıçarşı kemer koridoru: alacalı (kırmızı-krem) taş kemerler derinliğe doğru küçülür, tepelerinde fenerler.
const f1 = (n) => +n.toFixed(1);
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dome(cx, y, r, k = 0.95) {
  return `M${f1(cx - r)} ${f1(y)}A${f1(r)} ${f1(r * k)} 0 0 1 ${f1(cx + r)} ${f1(y)}Z`;
}
function minaret(cx, y, w, h) {
  const t = y - h;
  return `M${f1(cx - w / 2)} ${f1(y)}V${f1(t + w * 2.6)}L${f1(cx)} ${f1(t)}L${f1(cx + w / 2)} ${f1(t + w * 2.6)}V${f1(y)}Z` +
    `M${f1(cx - w * 0.95)} ${f1(t + h * 0.28)}h${f1(w * 1.9)}v${f1(w * 0.55)}h${f1(-w * 1.9)}Z` +
    `M${f1(cx - w * 0.9)} ${f1(t + h * 0.52)}h${f1(w * 1.8)}v${f1(w * 0.5)}h${f1(-w * 1.8)}Z`;
}
function mosque(cx, y, s) {
  let d = `M${f1(cx - 110 * s)} ${f1(y)}V${f1(y - 34 * s)}H${f1(cx + 110 * s)}V${f1(y)}Z`;
  d += dome(cx, y - 34 * s, 54 * s, 0.92);
  d += `M${f1(cx - 3 * s)} ${f1(y - 84 * s)}h${f1(6 * s)}v${f1(-16 * s)}h${f1(-6 * s)}Z`;
  for (const sd of [-1, 1]) {
    d += dome(cx + sd * 62 * s, y - 34 * s, 30 * s, 0.86);
    d += dome(cx + sd * 96 * s, y - 34 * s, 13 * s, 0.9);
    d += minaret(cx + sd * 132 * s, y, 7 * s, 168 * s);
    d += minaret(cx + sd * 104 * s, y, 6 * s, 132 * s);
  }
  return d;
}
function galata(cx, y, s) {
  return `M${f1(cx - 15 * s)} ${f1(y)}V${f1(y - 118 * s)}H${f1(cx + 15 * s)}V${f1(y)}Z` +
    `M${f1(cx - 19 * s)} ${f1(y - 112 * s)}h${f1(38 * s)}v${f1(-7 * s)}h${f1(-38 * s)}Z` +
    `M${f1(cx - 16 * s)} ${f1(y - 119 * s)}L${f1(cx)} ${f1(y - 168 * s)}L${f1(cx + 16 * s)} ${f1(y - 119 * s)}Z` +
    `M${f1(cx - 1.2 * s)} ${f1(y - 168 * s)}h${f1(2.4 * s)}v${f1(-10 * s)}h${f1(-2.4 * s)}Z`;
}
function maiden(cx, y, s) {
  return `M${f1(cx - 46 * s)} ${f1(y)}Q${f1(cx)} ${f1(y - 14 * s)} ${f1(cx + 46 * s)} ${f1(y)}Z` +
    `M${f1(cx - 22 * s)} ${f1(y - 6 * s)}V${f1(y - 26 * s)}H${f1(cx + 10 * s)}V${f1(y - 6 * s)}Z` +
    `M${f1(cx + 2 * s)} ${f1(y - 6 * s)}V${f1(y - 56 * s)}H${f1(cx + 16 * s)}V${f1(y - 6 * s)}Z` +
    `M${f1(cx)} ${f1(y - 56 * s)}L${f1(cx + 9 * s)} ${f1(y - 76 * s)}L${f1(cx + 18 * s)} ${f1(y - 56 * s)}Z`;
}
function bridge(x0, x1, y, h) {
  const tA = x0 + (x1 - x0) * 0.2,
    tB = x0 + (x1 - x0) * 0.8;
  let d = `M${f1(x0)} ${f1(y - 4)}H${f1(x1)}V${f1(y)}H${f1(x0)}Z`;
  for (const t of [tA, tB]) d += `M${f1(t - 3)} ${f1(y)}V${f1(y - h)}h6V${f1(y)}Z`;
  return d;
}
function bridgeCables(x0, x1, y, h) {
  const tA = x0 + (x1 - x0) * 0.2,
    tB = x0 + (x1 - x0) * 0.8;
  const mid = (tA + tB) / 2;
  let d = `M${f1(x0)} ${f1(y - 4)}Q${f1((x0 + tA) / 2)} ${f1(y - h * 0.4)} ${f1(tA)} ${f1(y - h)}Q${f1(mid)} ${f1(y - 8)} ${f1(tB)} ${f1(y - h)}Q${f1((tB + x1) / 2)} ${f1(y - h * 0.4)} ${f1(x1)} ${f1(y - 4)}`;
  for (let i = 1; i < 14; i++) {
    const x = tA + ((tB - tA) * i) / 14,
      t = (x - tA) / (tB - tA),
      cy = y - h + (h - 8) * (1 - Math.pow(2 * t - 1, 2));
    d += `M${f1(x)} ${f1(cy)}V${f1(y - 4)}`;
  }
  return d;
}

// İstanbul silueti (1600×300). Renkler: --sky-far, --sky-near, --sky-lit, --sky-water
export function istanbulSVG() {
  const R = rng(7);
  const W = 1600,
    base = 232;
  // uzak katman: tepeler + camiler + Galata + köprü
  let far = `M0 ${base}V${base - 30}Q200 ${base - 64} 420 ${base - 40}T880 ${base - 46}T1320 ${base - 36}T${W} ${base - 50}V${base}Z`;
  far += mosque(330, base - 30, 0.95);
  far += mosque(760, base - 36, 0.72);
  far += galata(1070, base - 38, 1);
  far += bridge(1220, 1600, base - 20, 120);
  // yakın katman: evler, çatılar, serviler
  let near = '';
  let x = 0;
  const lights = [];
  while (x < W) {
    const w = 26 + R() * 46,
      h = 18 + R() * 40;
    const y = base + 10;
    near += `M${f1(x)} ${y}V${f1(y - h)}L${f1(x + w / 2)} ${f1(y - h - 10 - R() * 8)}L${f1(x + w)} ${f1(y - h)}V${y}Z`;
    if (R() < 0.35) near += `M${f1(x + w * 0.7)} ${f1(y - h - 4)}h5v-12h-5Z`;
    for (let k = 0; k < 3; k++) if (R() < 0.42) lights.push([x + 6 + R() * (w - 12), y - 6 - R() * (h - 12)]);
    if (R() < 0.18) {
      const cx = x + w + 6;
      near += `M${f1(cx)} ${y}C${f1(cx - 9)} ${f1(y - 30)} ${f1(cx - 4)} ${f1(y - 70)} ${f1(cx)} ${f1(y - 84)}C${f1(cx + 4)} ${f1(y - 70)} ${f1(cx + 9)} ${f1(y - 30)} ${f1(cx)} ${y}Z`;
      x += 14;
    }
    x += w + 2;
  }
  const water = Array.from({ length: 34 }, () => {
    const y = base + 16 + R() * 54,
      x0 = R() * W,
      l = 20 + R() * 120;
    return `<path d="M${f1(x0)} ${f1(y)}h${f1(l)}" style="animation-delay:${f1(-R() * 6)}s"/>`;
  }).join('');
  return `<svg class="ill ill--ist" viewBox="0 0 ${W} 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs><linearGradient id="istw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky-water)" stop-opacity=".55"/><stop offset="1" style="stop-color:var(--sky-water)" stop-opacity="0"/></linearGradient>
      <linearGradient id="istf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky-far)"/><stop offset="1" style="stop-color:var(--sky-far)" stop-opacity=".6"/></linearGradient></defs>
    <path d="${far}" fill="url(#istf)"/>
    <path d="${bridgeCables(1220, 1600, base - 20, 120)}" fill="none" style="stroke:var(--sky-far)" stroke-width="1.6"/>
    <path d="${maiden(560, base + 26, 1)}" style="fill:var(--sky-near)"/>
    <rect x="0" y="${base}" width="${W}" height="80" fill="url(#istw)"/>
    <g class="ill-water" style="stroke:var(--sky-lit)" stroke-width="1.4" stroke-linecap="round">${water}</g>
    <path d="${near}" style="fill:var(--sky-near)"/>
    <g class="ill-lights" style="fill:var(--sky-lit)">${lights.map(([lx, ly], i) => `<rect x="${f1(lx)}" y="${f1(ly)}" width="3" height="4" rx=".6" style="animation-delay:${f1((i * 0.37) % 5)}s"/>`).join('')}</g>
    <rect x="0" y="${base + 10}" width="${W}" height="${300 - base - 10}" style="fill:var(--sky-near)"/>
  </svg>`;
}

// Kapalıçarşı kemer koridoru (800×400). Renkler: --arc-a (kırmızı taş), --arc-b (krem taş), --arc-lit (fener)
export function arcadeSVG() {
  const vx = 560,
    vy = 210;
  let out = '';
  const N = 7;
  for (let i = N - 1; i >= 0; i--) {
    const s = Math.pow(0.74, i);
    const cx = vx + (400 - vx) * s * 0.0 + (420 - vx) * s;
    const w = 560 * s,
      h = 360 * s,
      by = vy + h * 0.5,
      top = by - h;
    const r = w / 2,
      band = 26 * s;
    const op = (0.35 + 0.65 * (1 - i / N)).toFixed(2);
    // sivri kemer: iki çember yayı
    const arch = (rr) => `M${f1(cx - rr)} ${f1(by)}V${f1(top + h * 0.42)}Q${f1(cx - rr)} ${f1(top + (r - rr) * 0.8)} ${f1(cx)} ${f1(top + (r - rr) * 0.9)}Q${f1(cx + rr)} ${f1(top + (r - rr) * 0.8)} ${f1(cx + rr)} ${f1(top + h * 0.42)}V${f1(by)}`;
    // alacalı taşlar: kemer bandını dilimlere böl
    let stones = '';
    const M = 16;
    for (let k = 0; k < M; k++) {
      const t0 = k / M,
        t1 = (k + 1) / M;
      const pt = (t, rr) => {
        const a = Math.PI * (1 - t);
        return [cx + Math.cos(a) * rr, top + h * 0.42 - Math.sin(a) * (h * 0.42 - (r - rr) * 0.9)];
      };
      const [ax, ay] = pt(t0, r),
        [bx, by2] = pt(t1, r),
        [cx2, cy2] = pt(t1, r - band),
        [dx, dy] = pt(t0, r - band);
      stones += `<path d="M${f1(ax)} ${f1(ay)}L${f1(bx)} ${f1(by2)}L${f1(cx2)} ${f1(cy2)}L${f1(dx)} ${f1(dy)}Z" style="fill:var(${k % 2 ? '--arc-a' : '--arc-b'})"/>`;
    }
    out += `<g opacity="${op}">${stones}<path d="${arch(r)}" fill="none" style="stroke:var(--arc-b)" stroke-width="${f1(2 * s)}"/><path d="M${f1(cx - r)} ${f1(top + h * 0.42)}V${f1(by)}h${f1(band)}V${f1(top + h * 0.42)}ZM${f1(cx + r - band)} ${f1(top + h * 0.42)}V${f1(by)}h${f1(band)}V${f1(top + h * 0.42)}Z" style="fill:var(--arc-b)" opacity=".75"/>
      <g class="ill-lamp" style="animation-delay:${f1(-i * 0.6)}s"><path d="M${f1(cx)} ${f1(top + (r - band) * 0.12)}v${f1(30 * s)}" style="stroke:var(--arc-b)" stroke-width="${f1(1.2 * s + 0.4)}"/>
      <circle cx="${f1(cx)}" cy="${f1(top + 52 * s)}" r="${f1(30 * s)}" fill="url(#arcg)"/><path d="M${f1(cx - 8 * s)} ${f1(top + 40 * s)}h${f1(16 * s)}l${f1(-3 * s)} ${f1(22 * s)}h${f1(-10 * s)}z" style="fill:var(--arc-lit)"/></g></g>`;
  }
  return `<svg class="ill ill--arc" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><radialGradient id="arcg"><stop offset="0" style="stop-color:var(--arc-lit)" stop-opacity=".9"/><stop offset="1" style="stop-color:var(--arc-lit)" stop-opacity="0"/></radialGradient></defs>
    <g style="stroke:var(--arc-b)" opacity=".18" stroke-width="1">${Array.from({ length: 9 }, (_, i) => `<path d="M${560 + (i - 4) * 4} 320L${(i - 4) * 260 + 560} 520"/>`).join('')}</g>${out}</svg>`;
}
