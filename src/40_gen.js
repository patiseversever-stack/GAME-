
/* =====================================================================
   ADA ÜRETİCİ + ÇÖZÜCÜ
   Her ada tohumdan üretilir; ardından dinamik programlama ile "bir insan
   güneşi makul hızla çevirerek Zifir'i hayatta tutabilir mi?" sorusu
   kesin olarak yanıtlanır. Çözülemeyen adalar onarılır.
   ===================================================================== */
const STORY_LEVELS = CHAPTERS.length * 8;

function levelSpec(g) {
  const ch = Math.floor(g / 8), i = g % 8, chap = CHAPTERS[ch];
  const gp = Math.min(1, g / 39), d = i / 7;
  const finale = i === 7;
  const spec = {
    kind: 'story', g, ch, i, chap, seed: 7919 * (g + 1) + 104729 * (ch + 3), finale,
    speed: 1.18 + 0.55 * gp + 0.12 * d,
    burn: 0.5 + 0.4 * gp + 0.08 * d,
    regen: 0.42,
    spacing: lerp(2.3, 3.4, clamp01(d * 0.6 + gp * 0.5)),
    amp: lerp(2.2, 4.0, clamp01(0.25 + d * 0.5 + gp * 0.3)),
    ctrl: finale ? 8 : 5 + Math.round(d * 2),
    pergolaRate: lerp(0.9, 0.35, clamp01(gp * 0.8 + d * 0.3)),
    prune: i >= 3 ? Math.round(lerp(2, 7, clamp01(d * 0.7 + gp * 0.5))) : 0,
    margin: lerp(0.62, 0.3, clamp01(gp * 0.75 + d * 0.35)),
    drops: Math.min(7, 2 + Math.round(d * 3 + gp * 2)),
    features: Object.assign({}, chap.features),
    eclipse: g >= 4,
    sunStart: 0.5,
    sunSpeed: g < 8 ? 0.62 : 0.75,
  };
  if (g === 0) Object.assign(spec, { speed: 1.05, burn: 0.42, spacing: 2.0, amp: 1.8, ctrl: 4, pergolaRate: 0, drops: 2, margin: 0.7 });
  if (g === 1) Object.assign(spec, { pergolaRate: 1.2, drops: 3 });
  // bölüm içi tanıtım sırası
  if (ch === 1) { spec.features.clouds = i !== 2; spec.features.windmills = i >= 2; }
  if (ch === 3 && i >= 5) spec.features.clouds = true;
  if (ch === 4 && i >= 3) spec.features.balloons = i % 2 === 1;
  if (ch === 4 && i >= 5) spec.features.clouds = i % 2 === 0;
  if (finale) { spec.speed *= 1.04; spec.drops += 1; }
  if (chap.features.twin) { spec.burn *= 0.68; spec.margin = Math.max(spec.margin, 0.45); spec.spacing = Math.min(spec.spacing, 2.7); spec.sunSpeed = 0.58; spec.prune = Math.min(spec.prune, 3); }
  // yeni dünyalar (VI–VIII): kendi zorluk eğrileri
  if (ch >= 5) Object.assign(spec, {
    speed: 1.46 + 0.12 * d + (ch - 5) * 0.05, burn: 0.74 + 0.1 * d + (ch - 5) * 0.03, spacing: lerp(2.4, 3.1, d),
    prune: i >= 2 ? Math.round(lerp(2, 5, d)) : 0, margin: lerp(0.5, 0.32, d), drops: 3 + Math.round(d * 3) + (finale ? 1 : 0), sunSpeed: 0.72,
    ctrl: finale ? 8 : 5 + Math.round(d * 2), amp: lerp(2.6, 3.8, d),
  });
  if (chap.features.melt) spec.margin = Math.max(spec.margin, 0.36);
  if (chap.features.mirrors) { spec.burn *= 0.9; spec.margin = Math.max(spec.margin, 0.36); spec.mirrors = i < 2 ? 1 : i < 5 ? 2 : 3; }
  if (chap.features.gears) { spec.features.pendulum = i >= 2; spec.gears = i < 3 ? 1 : 2; }
  // aksiyon: ışık perileri ve güneş patlamaları
  spec.sprites = ch === 2 ? (i >= 4 ? 1 : 0) : ch === 3 ? (i >= 2 ? 2 : 1) : ch === 4 ? 2 : ch >= 5 ? (i < 2 ? 2 : 3) : 0;
  if (finale && ch >= 2) spec.sprites += 1;
  spec.flares = (finale && ch >= 1) || (ch >= 5 && i >= 4);
  spec.dash = g >= 2;
  spec.wait = g >= 6;
  spec.boss = finale; // dünyanın son adası: Güneş Ejderhası kovalar
  // çeşitlilik: ada biçimi ve yol düzeni (dünyanın ilk adası her zaman tanıdık oval + zikzak)
  const bridges = !!spec.features.bridges;
  spec.shape = i === 0 || g < 3 ? 'oval' : ['waist', 'tear', 'oval', 'tearR'][(g * 7 + ch) % 4];
  spec.layout = i === 0 || g < 3 ? 'zig' : bridges ? (i % 2 ? 'rev' : 'zig') : finale ? 'hair' : ['zig', 'rev', 'zig', 'hair', 'rev', 'zig'][(i - 1) % 6];
  // U dönüşü ve ters yön ileriyi okumayı zorlaştırır: bu düzenlerde gölge payı biraz geniş tutulur
  if (spec.layout !== 'zig') spec.margin += LAYOUT_SLACK;
  // zorluk eğrisi: dünyanın ilk adası nefes aldırır; Tuz Gölü adaları kısa kalmasın
  if (i === 0 && g > 0) { spec.margin = Math.max(spec.margin, 0.5); spec.speed *= 0.94; spec.prune = 0; }
  if (bridges) { spec.speed *= 0.86; spec.amp += 0.5; }
  return spec;
}
const SHAPES = ['oval', 'waist', 'tear', 'tearR'], LAYOUT_SLACK = 0.06;
function endlessSpec(n, seedBase) {
  const maxCh = Math.min(CHAPTERS.length - 1, Math.max(1, Math.floor((Save.data.unlocked) / 8)));
  const rng = new RNG(seedBase + n * 977);
  const ch = n === 0 ? 0 : rng.int(0, maxCh), chap = CHAPTERS[ch];
  const d = clamp01(n / 12);
  const ex = { sprites: n >= 2 ? Math.min(3, 1 + Math.floor(n / 4)) : 0, flares: n >= 5 && rng.chance(0.35), dash: true, mirrors: 2, gears: 1 };
  const features = Object.assign({}, chap.features);
  if (ch === 1) features.windmills = rng.chance(0.6);
  if (maxCh >= 2 && ch !== 2 && rng.chance(0.25)) features.balloons = true;
  const twinK = chap.features.twin ? 0.75 : 1;
  const shape = n < 1 ? 'oval' : rng.pick(SHAPES), layout = n < 1 ? 'zig' : chap.features.bridges ? rng.pick(['zig', 'rev']) : rng.pick(['zig', 'rev', 'hair']);
  return {
    kind: 'endless', g: -1, n, ch, i: 0, chap, seed: seedBase + n * 7151, finale: false, boss: n > 0 && n % 8 === 7, shape, layout, wait: true,
    speed: Math.min(2.5, 1.45 + n * 0.07), burn: Math.min(1.15, 0.7 + n * 0.035) * twinK, regen: 0.42,
    spacing: lerp(2.5, 3.5, d), amp: lerp(2.6, 4.0, d), ctrl: 5 + Math.round(d * 2), pergolaRate: lerp(0.6, 0.25, d),
    prune: Math.round(lerp(1, 6, d)), margin: lerp(0.45, 0.28, d) + (layout !== 'zig' ? LAYOUT_SLACK : 0), drops: 3 + Math.round(d * 2), features, eclipse: true, sunStart: 0.5, sunSpeed: 0.72, ...ex,
  };
}
function dailySpec(dateNum) {
  const rng = new RNG(dateNum);
  const maxCh = Math.min(CHAPTERS.length - 1, Math.floor(Save.data.unlocked / 8));
  const ch = rng.int(0, maxCh), chap = CHAPTERS[ch];
  const features = Object.assign({}, chap.features);
  if (ch >= 2 && rng.chance(0.4)) features.clouds = true;
  const shape = rng.pick(SHAPES), layout = chap.features.bridges ? rng.pick(['zig', 'rev']) : rng.pick(['zig', 'rev', 'hair']);
  return {
    kind: 'daily', g: -1, ch, i: 4, chap, seed: dateNum * 31 + 17, finale: false, shape, layout, wait: true,
    speed: 1.5 + rng.range(0, 0.35), burn: 0.8, regen: 0.42, spacing: 3.0, amp: 3.4, ctrl: 7, pergolaRate: 0.4, prune: 4, margin: 0.32 + (layout !== 'zig' ? LAYOUT_SLACK : 0), drops: 5, features, eclipse: true, sunStart: 0.5, sunSpeed: 0.7,
    sprites: 2, flares: true, dash: true, mirrors: 2, gears: 1,
  };
}

/* ---------- ada dış hatları ---------- */
// biçimler: oval · bel (ortası daralan) · damla (önü geniş) · ters damla (arkası geniş)
function makeChunk(rng, cx, cz, hx, hz, seed, shape = 'oval') {
  const N = 96, pts = [], p = 2.6;
  if (shape === 'tear' || shape === 'tearR') hx *= 0.94;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU, ca = Math.cos(a), sa = Math.sin(a);
    let r = 1 / Math.pow(Math.pow(Math.abs(ca / hx), p) + Math.pow(Math.abs(sa / hz), p), 1 / p);
    if (shape === 'waist') r *= 1 - 0.22 * Math.pow(Math.abs(ca), 3);
    else if (shape === 'tear') r *= 1 + 0.42 * sa * ca * ca;
    else if (shape === 'tearR') r *= 1 - 0.42 * sa * ca * ca;
    const n = 1 + 0.07 * (fbm2(Math.cos(a) * 1.6 + seed, Math.sin(a) * 1.6 + seed * 0.7, 3) - 0.5) * 2;
    pts.push([cx + ca * r * n, cz + sa * r * n]);
  }
  return { cx, cz, hx, hz, pts };
}
function insideChunk(ch, x, z, margin) {
  const dx = x - ch.cx, dz = z - ch.cz, a = Math.atan2(dz, dx);
  const N = ch.pts.length, f = ((a / TAU) * N + N) % N, i = Math.floor(f), j = (i + 1) % N, t = f - i;
  const ex = lerp(ch.pts[i][0], ch.pts[j][0], t) - ch.cx, ez = lerp(ch.pts[i][1], ch.pts[j][1], t) - ch.cz;
  return Math.hypot(dx, dz) <= Math.hypot(ex, ez) - margin;
}
function insideIsland(lv, x, z, margin) { for (const c of lv.chunks) if (insideChunk(c, x, z, margin)) return true; return false; }

/* ---------- yol ---------- */
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
function buildPath(ctrl, ds = 0.1) {
  const dense = [];
  const P = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  for (let i = 1; i < P.length - 2; i++) for (let k = 0; k < 24; k++) {
    const t = k / 24;
    dense.push([catmull(P[i - 1][0], P[i][0], P[i + 1][0], P[i + 2][0], t), catmull(P[i - 1][1], P[i][1], P[i + 1][1], P[i + 2][1], t)]);
  }
  dense.push(ctrl[ctrl.length - 1]);
  // yay uzunluğuna göre yeniden örnekle
  const xs = [dense[0][0]], zs = [dense[0][1]]; let acc = 0, need = ds;
  for (let i = 1; i < dense.length; i++) {
    let ax = dense[i - 1][0], az = dense[i - 1][1]; const bx = dense[i][0], bz = dense[i][1];
    let seg = Math.hypot(bx - ax, bz - az);
    while (acc + seg >= need) {
      const t = (need - acc) / seg; ax = ax + (bx - ax) * t; az = az + (bz - az) * t;
      xs.push(ax); zs.push(az); seg = Math.hypot(bx - ax, bz - az); acc = 0; need = ds;
    }
    acc += seg;
  }
  xs.push(ctrl[ctrl.length - 1][0]); zs.push(ctrl[ctrl.length - 1][1]);
  return { x: Float32Array.from(xs), z: Float32Array.from(zs), n: xs.length, ds, length: (xs.length - 1) * ds };
}

/* ---------- prop katalogu (çarpıştırıcı tarafı) ----------
   her prop: {type, x, z, yaw, fr (taban yarıçapı), h, p:{...}, cols:[]} */
const PROP_SETS = {
  ege: { shade: [['house', 4], ['cypress', 2.6], ['olive', 3]], deco: [['rock', 2], ['bush', 3], ['pots', 2], ['wall', 1.5]], arch: 'pergola' },
  ruzgar: { shade: [['poplar', 3], ['house', 2], ['haystack', 2], ['olive', 1.5]], deco: [['rock', 1.5], ['bush', 3], ['hay', 2], ['hedge', 2]], arch: 'pergola' },
  peri: { shade: [['chimney', 5], ['chimneyTwin', 1.6], ['apricot', 2]], deco: [['rock', 3], ['bush', 1.5], ['smallChimney', 2]], arch: 'rockArch' },
  tuz: { shade: [['saltCone', 3], ['saltBlock', 3], ['saltPillar', 2]], deco: [['saltRock', 3], ['flamingo', 2], ['saltCrystal', 2]], arch: 'saltArch' },
  ikiz: { shade: [['monolith', 3], ['spire', 2.5], ['mushroom', 3]], deco: [['alienRock', 2.5], ['glowBush', 2.5], ['orb', 1.5]], arch: 'mushroomArch' },
  buz: { shade: [['iceSpire', 4], ['iceColumn', 3], ['pine', 2.5], ['igloo', 1]], deco: [['snowRock', 2.5], ['iceShard', 2], ['penguin', 2]], arch: 'iceArch' },
  ayna: { shade: [['kiosk', 3], ['minaret', 2.5], ['fountain', 1.5], ['cypress', 2.5]], deco: [['tulips', 3], ['urn', 2], ['tileBench', 1.5]], arch: 'iwan' },
  saat: { shade: [['clockTower', 3], ['cogStand', 2.5], ['pipeStack', 2.5], ['steamTank', 1.5]], deco: [['bolt', 2.5], ['smallGear', 2], ['lamp', 2]], arch: 'gearArch' },
};
function propFootprint(type) {
  return ({ house: 1.15, cypress: 0.55, olive: 1.0, poplar: 0.6, haystack: 0.75, chimney: 1.0, chimneyTwin: 1.5, apricot: 0.9, saltCone: 1.0, saltBlock: 0.95,
    saltPillar: 0.6, monolith: 0.75, spire: 0.6, mushroom: 1.25, windmill: 1.15, rock: 0.45, bush: 0.45, pots: 0.35, wall: 0.9, hay: 0.5, hedge: 0.8, smallChimney: 0.5,
    saltRock: 0.45, flamingo: 0.35, saltCrystal: 0.4, alienRock: 0.5, glowBush: 0.45, orb: 0.4, hut: 0.95, crystal: 0.45,
    iceSpire: 0.7, iceColumn: 0.62, pine: 0.8, igloo: 1.1, snowRock: 0.45, iceShard: 0.4, penguin: 0.3,
    kiosk: 1.15, minaret: 0.55, fountain: 1.05, tulips: 0.4, urn: 0.35, tileBench: 0.8, mirror: 0.6,
    clockTower: 0.8, cogStand: 1.0, pipeStack: 0.8, steamTank: 0.9, bolt: 0.35, smallGear: 0.5, lamp: 0.3, gear: 2.0, pendFrame: 0.4 })[type] || 0.6;
}
// prop çarpıştırıcılarını üret (yükseklik h hedefi verilebilir)
function buildPropCols(pr, rng) {
  const { x, z, yaw } = pr, P = pr.p, cols = [];
  const cs = Math.cos(yaw), sn = Math.sin(yaw);
  const L = (lx, lz) => [x + cs * lx + sn * lz, z - sn * lx + cs * lz];
  switch (pr.type) {
    case 'house': {
      cols.push(cBox(x, P.h / 2, z, P.w / 2, P.h / 2 + 0.06, P.d / 2, yaw));
      if (P.dome) cols.push(cSphere(x, P.h, z, P.dr, 1));
      if (P.chim) { const [cx, cz] = L(P.w * 0.28, -P.d * 0.25); cols.push(cBox(cx, P.h + 0.3, cz, 0.14, 0.3, 0.14, yaw)); }
      break;
    }
    case 'hut': cols.push(cSphere(x, 0.15, z, P.r, 0.78)); break;
    case 'cypress': case 'poplar': {
      const h = P.h, r = P.r;
      cols.push(cFrustum(x, z, 0, h * 0.12, 0.12, 0.12));
      cols.push(cFrustum(x, z, h * 0.12, h * 0.38, r * 0.75, r));
      cols.push(cFrustum(x, z, h * 0.38, h * 0.72, r, r * 0.62));
      cols.push(cFrustum(x, z, h * 0.72, h, r * 0.62, 0.03));
      break;
    }
    case 'olive': case 'apricot': {
      cols.push(cFrustum(x, z, 0, P.trunk, 0.13, 0.11));
      for (const b of P.blobs) cols.push(cSphere(x + b[0], b[1], z + b[2], b[3], b[4] || 1));
      break;
    }
    case 'haystack': case 'hay': cols.push(cFrustum(x, z, 0, P.h, P.r, P.r * 0.55)); cols.push(cSphere(x, P.h, z, P.r * 0.55, 0.5)); break;
    case 'chimney': case 'smallChimney': {
      const h = P.h, r = P.r;
      cols.push(cFrustum(x, z, 0, h * 0.45, r, r * 0.72));
      cols.push(cFrustum(x, z, h * 0.45, h, r * 0.72, r * 0.42));
      cols.push(cSphere(x, h + P.cap * 0.25, z, P.cap, 0.55));
      break;
    }
    case 'chimneyTwin': {
      for (const s of P.twins) {
        const [cx, cz] = L(s.dx, 0);
        cols.push(cFrustum(cx, cz, 0, s.h * 0.45, s.r, s.r * 0.72));
        cols.push(cFrustum(cx, cz, s.h * 0.45, s.h, s.r * 0.72, s.r * 0.42));
        cols.push(cSphere(cx, s.h + s.cap * 0.25, cz, s.cap, 0.55));
      }
      break;
    }
    case 'saltCone': cols.push(cFrustum(x, z, 0, P.h, P.r, 0.06)); break;
    case 'saltPillar': cols.push(cFrustum(x, z, 0, P.h, P.r, P.r * 0.8)); cols.push(cFrustum(x, z, P.h, P.h + P.r * 0.9, P.r * 0.8, 0.02)); break;
    case 'saltBlock': case 'monolith': cols.push(cBox(x, P.h / 2, z, P.w / 2, P.h / 2, P.d / 2, yaw)); break;
    case 'spire': cols.push(cFrustum(x, z, 0, P.h, P.r, 0.04)); break;
    case 'mushroom': cols.push(cFrustum(x, z, 0, P.h, 0.24, 0.2)); cols.push(cSphere(x + P.ox, P.h, z + P.oz, P.cr, 0.42)); break;
    case 'wall': case 'hedge': cols.push(cBox(x, P.h / 2, z, P.w / 2, P.h / 2, P.d / 2, yaw)); break;
    case 'rock': case 'saltRock': case 'alienRock': case 'bush': case 'glowBush': case 'saltCrystal':
      cols.push(cSphere(x, P.r * 0.55, z, P.r, P.sy || 0.8)); break;
    case 'pots': cols.push(cFrustum(x, z, 0, 0.42, 0.2, 0.26)); break;
    case 'orb': cols.push(cSphere(x, P.y, z, P.r, 1)); break;
    case 'flamingo': cols.push(cSphere(x, 0.75, z, 0.22, 1.1)); cols.push(cFrustum(x, z, 0, 0.6, 0.05, 0.05)); break;
    case 'crystal': { const c = cFrustum(x, z, 0, P.h, 0.3, 0.3); cols.push(c); pr.selfId = c.id; break; }
    case 'iceSpire': cols.push(cFrustum(x, z, 0, P.h, P.r, 0.05)); break;
    case 'iceColumn': cols.push(cFrustum(x, z, 0, P.h, P.r, P.r * 0.82)); break;
    case 'pine': cols.push(cFrustum(x, z, 0, P.h * 0.15, 0.14, 0.14)); cols.push(cFrustum(x, z, P.h * 0.15, P.h * 0.55, P.r, P.r * 0.62)); cols.push(cFrustum(x, z, P.h * 0.55, P.h, P.r * 0.62, 0.04)); break;
    case 'igloo': cols.push(cSphere(x, 0.05, z, P.r, 0.78)); break;
    case 'snowRock': case 'iceShard': cols.push(cSphere(x, P.r * 0.55, z, P.r, P.sy || 0.8)); break;
    case 'penguin': cols.push(cSphere(x, 0.36, z, 0.2, 1.6)); break;
    case 'kiosk': {
      cols.push(cBox(x, P.h / 2, z, P.w / 2, P.h / 2 + 0.05, P.d / 2, yaw));
      cols.push(cSphere(x, P.h + 0.05, z, P.dr, 1));
      break;
    }
    case 'minaret': cols.push(cFrustum(x, z, 0, P.h, P.r, P.r * 0.85)); cols.push(cFrustum(x, z, P.h * 0.72, P.h * 0.72 + 0.16, P.r * 1.45, P.r * 1.45)); cols.push(cFrustum(x, z, P.h, P.h + P.r * 2.6, P.r * 0.9, 0.02)); break;
    case 'fountain': cols.push(cFrustum(x, z, 0, 0.6, P.r, P.r * 0.92)); cols.push(cSphere(x, 1.75, z, P.r * 0.95, 0.55)); break;
    case 'tulips': cols.push(cSphere(x, 0.2, z, P.r, 0.6)); break;
    case 'urn': cols.push(cFrustum(x, z, 0, 0.62, 0.16, 0.26)); break;
    case 'tileBench': cols.push(cBox(x, P.h / 2, z, P.w / 2, P.h / 2, P.d / 2, yaw)); break;
    case 'mirror': { const c = cBox(x, 1.35, z, 0.52, 0.66, 0.05, yaw); cols.push(c); pr.panelId = c.id; cols.push(cFrustum(x, z, 0, 0.7, 0.09, 0.07)); break; }
    case 'clockTower': cols.push(cBox(x, P.h / 2, z, P.w / 2, P.h / 2, P.w / 2, yaw)); cols.push(cFrustum(x, z, P.h, P.h + 1.0, P.w * 0.72, 0.03)); break;
    case 'cogStand': cols.push(cBox(x, P.r + 0.35, z, P.r, P.r, 0.14, yaw)); break;
    case 'pipeStack': for (const q of P.pipes) { const [px, pz] = L(q[0], q[1]); cols.push(cFrustum(px, pz, 0, q[2], q[3], q[3])); } break;
    case 'steamTank': cols.push(cSphere(x, P.r + 0.45, z, P.r, 1)); break;
    case 'bolt': cols.push(cFrustum(x, z, 0, 0.5, 0.18, 0.14)); break;
    case 'smallGear': cols.push(cBox(x, 0.45, z, 0.42, 0.42, 0.08, yaw)); break;
    case 'lamp': cols.push(cFrustum(x, z, 0, 1.5, 0.05, 0.05)); cols.push(cSphere(x, 1.6, z, 0.18, 1)); break;
    case 'gear': break;
    case 'pendFrame': {
      const hw = P.span / 2;
      for (const sd of [-1, 1]) { const [px, pz] = L(sd * hw, 0); cols.push(cFrustum(px, pz, 0, P.h, 0.2, 0.16)); }
      cols.push(cBox(x, P.h, z, hw + 0.2, 0.14, 0.14, yaw));
      break;
    }
    case 'windmill': {
      cols.push(cFrustum(x, z, 0, P.h, P.r, P.r * 0.86));
      cols.push(cFrustum(x, z, P.h, P.h + 1.15, P.r * 0.94, 0.06));
      break;
    }
    case 'pergola': case 'rockArch': case 'saltArch': case 'mushroomArch': case 'iceArch': case 'iwan': case 'gearArch': {
      const hw = P.w / 2, hl = P.l / 2, H = P.h;
      if (pr.type === 'mushroomArch') {
        const [sx, sz] = L(hw + 0.15, 0);
        cols.push(cFrustum(sx, sz, 0, H, 0.26, 0.22));
        cols.push(cSphere(x, H, z, Math.max(hw, hl) + 0.75, 0.38));
        break;
      }
      cols.push(cBox(x, H, z, hw + 0.12, P.roof / 2, hl + 0.12, yaw));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const [px, pz] = L(sx * hw, sz * hl); cols.push(cFrustum(px, pz, 0, H, P.post, P.post)); }
      break;
    }
  }
  pr.cols = cols;
  return cols;
}
// verilen tür için parametreleri seç; hNeed: gerekli minimum yükseklik (gölgenin ulaşması için)
function makeProp(type, x, z, yaw, rng, hNeed = 0) {
  const P = {}; let h = 0;
  switch (type) {
    case 'house': P.w = rng.range(1.5, 2.3); P.d = rng.range(1.4, 2.1); P.h = clamp(Math.max(hNeed, rng.range(1.4, 2.3)), 1.3, 3.2); P.dome = rng.chance(0.28); P.dr = Math.min(P.w, P.d) * 0.36; P.chim = !P.dome && rng.chance(0.5); P.stairs = rng.chance(0.4); h = P.h + (P.dome ? P.dr : 0); break;
    case 'hut': P.r = 0.95; h = 0.9; break;
    case 'cypress': P.h = clamp(Math.max(hNeed * 1.15, rng.range(3.0, 4.4)), 2.8, 5.6); P.r = rng.range(0.42, 0.52); h = P.h; break;
    case 'poplar': P.h = clamp(Math.max(hNeed * 1.15, rng.range(3.4, 4.8)), 3.0, 6.0); P.r = rng.range(0.5, 0.62); h = P.h; break;
    case 'olive': case 'apricot': {
      const s = clamp(Math.max(hNeed / 2.0, rng.range(0.85, 1.15)), 0.8, 1.45);
      P.trunk = 1.0 * s; P.blobs = [];
      const n = rng.int(3, 4), base = 1.35 * s;
      P.blobs.push([0, base + 0.15 * s, 0, 0.78 * s, 0.82]);
      for (let k = 0; k < n; k++) { const a = (k / n) * TAU + rng.range(-0.4, 0.4); P.blobs.push([Math.cos(a) * 0.55 * s, base + rng.range(-0.15, 0.25) * s, Math.sin(a) * 0.55 * s, rng.range(0.48, 0.62) * s, 0.85]); }
      h = base + 0.8 * s; P.s = s; break;
    }
    case 'haystack': P.r = rng.range(0.62, 0.78); P.h = clamp(Math.max(hNeed, rng.range(0.9, 1.3)), 0.8, 1.6); h = P.h + 0.3; break;
    case 'hay': P.r = rng.range(0.38, 0.48); P.h = 0.6; h = 0.75; break;
    case 'chimney': P.r = rng.range(0.8, 1.05); P.h = clamp(Math.max(hNeed * 1.05, rng.range(3.0, 5.2)), 2.6, 6.5); P.cap = P.r * rng.range(0.7, 0.85); P.doors = rng.int(0, 3); h = P.h + P.cap * 0.5; break;
    case 'smallChimney': P.r = rng.range(0.35, 0.45); P.h = rng.range(1.0, 1.6); P.cap = P.r * 0.8; P.doors = 0; h = P.h; break;
    case 'chimneyTwin': {
      const hh = clamp(Math.max(hNeed * 1.05, rng.range(3.0, 4.6)), 2.6, 5.8);
      P.twins = [{ dx: -0.62, h: hh, r: 0.72, cap: 0.58 }, { dx: 0.66, h: hh * rng.range(0.7, 0.9), r: 0.62, cap: 0.5 }];
      h = hh; break;
    }
    case 'saltCone': P.r = rng.range(0.85, 1.15); P.h = clamp(Math.max(hNeed * 1.4, rng.range(1.4, 2.6)), 1.2, 4.0); h = P.h; break;
    case 'saltPillar': P.r = rng.range(0.45, 0.55); P.h = clamp(Math.max(hNeed, rng.range(2.2, 3.6)), 2.0, 5.0); h = P.h + P.r; break;
    case 'saltBlock': P.w = rng.range(1.2, 1.8); P.d = rng.range(1.0, 1.5); P.h = clamp(Math.max(hNeed, rng.range(1.0, 1.9)), 0.9, 2.8); h = P.h; break;
    case 'monolith': P.w = rng.range(0.7, 1.0); P.d = rng.range(0.5, 0.8); P.h = clamp(Math.max(hNeed, rng.range(2.6, 4.5)), 2.2, 6.0); h = P.h; break;
    case 'spire': P.r = rng.range(0.5, 0.65); P.h = clamp(Math.max(hNeed * 1.3, rng.range(3.0, 5.0)), 2.6, 6.4); h = P.h; break;
    case 'mushroom': P.h = clamp(Math.max(hNeed, rng.range(1.8, 2.8)), 1.6, 3.6); P.cr = rng.range(1.05, 1.35); P.ox = 0; P.oz = 0; h = P.h + P.cr * 0.42; break;
    case 'wall': P.w = rng.range(1.6, 2.6); P.d = 0.36; P.h = rng.range(0.5, 0.8); h = P.h; break;
    case 'hedge': P.w = rng.range(1.6, 2.4); P.d = 0.5; P.h = rng.range(0.45, 0.65); h = P.h; break;
    case 'rock': case 'saltRock': case 'alienRock': P.r = rng.range(0.3, 0.5); P.sy = rng.range(0.6, 0.9); h = P.r * 1.2; break;
    case 'bush': case 'glowBush': P.r = rng.range(0.32, 0.48); P.sy = 0.85; h = P.r * 1.3; break;
    case 'saltCrystal': P.r = rng.range(0.28, 0.4); P.sy = 1.4; h = P.r * 1.8; break;
    case 'pots': h = 0.45; break;
    case 'orb': P.r = rng.range(0.3, 0.42); P.y = rng.range(0.9, 1.5); h = P.y + P.r; break;
    case 'flamingo': h = 1.0; break;
    case 'crystal': P.h = 2.1; h = 2.1; break;
    case 'windmill': P.r = 1.0; P.h = rng.range(3.1, 3.6); P.blades = 4; P.len = 2.5; h = P.h + 1.1; break;
    case 'iceSpire': P.r = rng.range(0.62, 0.8); P.h = clamp(Math.max(hNeed * 1.35, rng.range(2.6, 4.2)), 2.2, 5.6); h = P.h; break;
    case 'iceColumn': P.r = rng.range(0.5, 0.6); P.h = clamp(Math.max(hNeed * 1.1, rng.range(2.2, 3.6)), 1.8, 5.0); h = P.h; break;
    case 'pine': P.r = rng.range(0.72, 0.85); P.h = clamp(Math.max(hNeed * 1.2, rng.range(2.8, 4.2)), 2.4, 5.4); h = P.h; break;
    case 'igloo': P.r = rng.range(0.95, 1.1); h = P.r * 0.8; break;
    case 'snowRock': P.r = rng.range(0.3, 0.48); P.sy = rng.range(0.6, 0.85); h = P.r; break;
    case 'iceShard': P.r = rng.range(0.25, 0.38); P.sy = 1.6; h = P.r * 2; break;
    case 'penguin': h = 0.7; break;
    case 'kiosk': P.w = rng.range(1.5, 2.1); P.d = rng.range(1.4, 2.0); P.h = clamp(Math.max(hNeed, rng.range(1.4, 2.2)), 1.3, 3.0); P.dr = Math.min(P.w, P.d) * 0.44; h = P.h + P.dr; break;
    case 'minaret': P.r = rng.range(0.34, 0.42); P.h = clamp(Math.max(hNeed * 1.1, rng.range(3.4, 5.0)), 3.0, 6.2); h = P.h + P.r * 2.6; break;
    case 'fountain': P.r = rng.range(0.95, 1.1); h = 2.3; break;
    case 'tulips': P.r = rng.range(0.3, 0.42); h = 0.45; break;
    case 'urn': h = 0.62; break;
    case 'tileBench': P.w = rng.range(1.2, 1.8); P.d = 0.45; P.h = 0.5; h = 0.5; break;
    case 'mirror': h = 2.05; break;
    case 'clockTower': P.w = rng.range(0.85, 1.15); P.h = clamp(Math.max(hNeed, rng.range(2.8, 4.6)), 2.4, 5.8); h = P.h + 1; break;
    case 'cogStand': P.r = clamp(Math.max(hNeed * 0.55, rng.range(0.8, 1.15)), 0.75, 1.5); P.teeth = 10 + Math.round(P.r * 4); h = P.r * 2 + 0.35; break;
    case 'pipeStack': { const hh = clamp(Math.max(hNeed * 1.05, rng.range(2.2, 3.6)), 1.8, 4.6); P.pipes = [[0, 0, hh, 0.32], [0.5, 0.25, hh * 0.72, 0.24], [-0.42, 0.3, hh * 0.55, 0.22]]; h = hh; break; }
    case 'steamTank': P.r = clamp(Math.max(hNeed * 0.4, rng.range(0.7, 0.9)), 0.65, 1.1); h = P.r * 2 + 0.45; break;
    case 'bolt': h = 0.5; break;
    case 'smallGear': h = 0.87; break;
    case 'lamp': h = 1.8; break;
  }
  const pr = { type, x, z, yaw, fr: propFootprint(type), h, p: P };
  buildPropCols(pr, rng);
  return pr;
}

/* ---------- ana üretici ---------- */
function generateLevel(spec, attempt = 0) {
  const rng = new RNG(spec.seed + attempt * 99991);
  COL_ID = 1;
  const chap = spec.chap, set = PROP_SETS[chap.key];
  const lv = { spec, chap, chunks: [], props: [], movers: [], bridges: [], crystals: [], drops: [], sun: makeSunCfg(chap), rng };
  lv.speed = spec.speed; lv.burn = spec.burn; lv.regen = spec.regen; lv.walkDelay = 0.45;

  // ---- adalar ----
  const zBack = -10.6, zFront = 10.6;
  if (spec.features.bridges) {
    const n = spec.i >= 4 || spec.finale ? 3 : 2;
    const total = zFront - zBack, gap = 2.6;
    const lens = n === 2 ? [0.5, 0.5] : [0.34, 0.33, 0.33];
    let z = zBack;
    for (let k = 0; k < n; k++) {
      const len = (total - gap * (n - 1)) * lens[k];
      lv.chunks.push(makeChunk(rng, rng.range(-0.5, 0.5), z + len / 2, rng.range(5.4, 6.2), len / 2 + 0.2, spec.seed * 0.01 + k * 3.1));
      z += len + gap;
    }
  } else {
    lv.chunks.push(makeChunk(rng, 0, 0, rng.range(6.0, 6.6), 10.9, spec.seed * 0.013, spec.shape || 'oval'));
  }

  // ---- yol kontrol noktaları ----
  const ctrl = [];
  const n = spec.ctrl, zs = -9.2, ze = 8.8;
  let side = rng.sign();
  const hair = spec.layout === 'hair' && !spec.features.bridges;
  if (hair) {
    // U dönüşü: bir şeritten öne iner, kameranın önünde döner, öbür şeritten geri çıkar
    const L = rng.range(2.3, 2.9), half = Math.max(3, Math.ceil(n / 2)), sd = rng.sign(), zTop = -8.8, zBot = 6.0;
    for (let k = 0; k < half; k++) ctrl.push([-sd * L + (k > 0 ? rng.range(-0.55, 0.55) : 0), lerp(zTop, zBot, k / (half - 1))]);
    ctrl.push([0, 8.5]);
    for (let k = 0; k < half; k++) ctrl.push([sd * L + (k < half - 1 ? rng.range(-0.55, 0.55) : 0), lerp(zBot, zTop + 0.8, k / (half - 1))]);
  } else for (let k = 0; k < n; k++) {
    const f = k / (n - 1);
    let z = lerp(zs, ze, f) + (k > 0 && k < n - 1 ? rng.range(-0.5, 0.5) : 0);
    let x = k === 0 || k === n - 1 ? rng.range(-1.2, 1.2) : side * spec.amp * rng.range(0.65, 1.0);
    side = -side;
    ctrl.push([x, z]);
  }
  // köprü geçişleri: boşluğun iki yanında aynı x ile düz geçiş
  if (lv.chunks.length > 1) {
    for (let k = 0; k < lv.chunks.length - 1; k++) {
      const a = lv.chunks[k], b = lv.chunks[k + 1];
      const g0 = a.cz + a.hz - 0.2, g1 = b.cz - b.hz + 0.2;
      const gx = rng.range(-2.0, 2.0);
      for (let q = ctrl.length - 1; q >= 0; q--) if (ctrl[q][1] > g0 - 1.6 && ctrl[q][1] < g1 + 1.6 && q !== 0 && q !== ctrl.length - 1) ctrl.splice(q, 1);
      ctrl.push([gx, g0 - 1.1], [gx, g1 + 1.1]);
    }
    ctrl.sort((p, q) => p[1] - q[1]);
  }
  // ters yön: Zifir kameraya yakın uçtan başlayıp adanın arkasına yürür
  if (spec.layout === 'rev') ctrl.reverse();
  // adanın içinde tut
  for (const c of ctrl) {
    for (let it = 0; it < 30 && !insideIsland(lv, c[0], c[1], 1.7); it++) c[0] *= 0.9;
  }
  lv.path = buildPath(ctrl);
  const path = lv.path, PA = {};
  lv.length = path.length;

  // köprü aralıkları (yol ada dışında kalan kısımlar)
  if (lv.chunks.length > 1) {
    let inGap = false, s0 = 0;
    for (let i = 0; i < path.n; i++) {
      const out = !insideIsland(lv, path.x[i], path.z[i], 0.05);
      if (out && !inGap) { inGap = true; s0 = i * path.ds; }
      if (!out && inGap) { inGap = false; lv.bridges.push({ s0: s0 - 0.25, s1: i * path.ds + 0.25 }); }
    }
  }

  const placed = lv.props;
  const okSpot = (x, z, fr, pathClear = 0.62, ignoreArch = false) => {
    if (!insideIsland(lv, x, z, fr + 0.25)) return false;
    if (distToPath(path, x, z) < fr + pathClear) return false;
    for (const p of placed) {
      if (ignoreArch && p.arch) continue;
      if (Math.hypot(p.x - x, p.z - z) < p.fr + fr + 0.22) return false;
    }
    for (const c of lv.crystals) if (Math.hypot(c.x - x, c.z - z) < fr + 1.4) return false;
    for (const k of keepOut) if (Math.hypot(k.x - x, k.z - z) < fr + k.r) return false;
    return true;
  };
  const keepOut = lv.keepOut = [];

  // ---- başlangıç kulübesi & kapı ----
  pathAt(path, 0, PA);
  const hut = makeProp('hut', PA.x - PA.tx * 1.05, PA.z - PA.tz * 1.05, Math.atan2(PA.tx, PA.tz), rng);
  hut.fixed = true; placed.push(hut);
  pathAt(path, path.length, PA);
  lv.start = { x: path.x[0], z: path.z[0] };
  lv.gate = { x: PA.x + PA.tx * 0.35, z: PA.z + PA.tz * 0.35, yaw: Math.atan2(PA.tx, PA.tz) };

  // ---- köprü kristalleri ----
  for (const br of lv.bridges) {
    pathAt(path, br.s0, PA);
    let done = false;
    for (let t = 0; t < 40 && !done; t++) {
      const sd = rng.sign(), back = rng.range(0.6, 2.4), off = rng.range(1.6, 3.2);
      const x = PA.x - PA.tx * back + PA.nx * off * sd, z = PA.z - PA.tz * back + PA.nz * off * sd;
      if (!okSpot(x, z, 0.45, 0.8)) continue;
      const cr = makeProp('crystal', x, z, 0, rng); cr.fixed = true; placed.push(cr);
      const c = { x, z, y: 1.75, id: cr.selfId, prop: cr, bridge: br }; lv.crystals.push(c); br.crystal = c; done = true;
    }
    if (!done) return null;
  }

  // ---- sarkaç (Gök Saati) — kemerlerden önce yerleşir ----
  if (spec.features.pendulum) {
    for (let t = 0; t < 90; t++) {
      const s = rng.range(path.length * 0.3, path.length * 0.72); pathAt(path, s, PA);
      const span = t < 45 ? 5.4 : 4.6, yaw = Math.atan2(PA.nx, PA.nz) + PI / 2;
      const p1 = [PA.x + PA.nx * span / 2, PA.z + PA.nz * span / 2], p2 = [PA.x - PA.nx * span / 2, PA.z - PA.nz * span / 2];
      if (!insideIsland(lv, p1[0], p1[1], 0.4) || !insideIsland(lv, p2[0], p2[1], 0.4)) continue;
      if (distToPath(path, p1[0], p1[1]) < 1.1 || distToPath(path, p2[0], p2[1]) < 1.1) continue;
      if (placed.some((p) => Math.hypot(p.x - p1[0], p.z - p1[1]) < p.fr + 0.6 || Math.hypot(p.x - p2[0], p.z - p2[1]) < p.fr + 0.6)) continue;
      let blocked = false;
      for (let d = -5; d <= 5 && !blocked; d += 0.5) { const qx = PA.x + PA.tx * d, qz = PA.z + PA.tz * d; if (placed.some((p) => (p.h || 0) > 1.3 && Math.hypot(p.x - qx, p.z - qz) < p.fr + 1.0) || lv.crystals.some((c) => Math.hypot(c.x - qx, c.z - qz) < 1.6)) blocked = true; }
      if (blocked) continue;
      const fr = { type: 'pendFrame', x: PA.x, z: PA.z, yaw, fr: 0.4, h: 8.9, p: { span, h: 8.9 }, fixed: true, noBlock: true };
      buildPropCols(fr); placed.push(fr);
      // sarkaç yol boyunca salınır (gövde direkler arasında kalır)
      const m = { kind: 'pendulum', px: PA.x, py: 8.75, pz: PA.z, L: 6.4, dx: PA.tx, dz: PA.tz, amp: rng.range(0.55, 0.72), w: TAU / rng.range(3.6, 4.8), ph: rng.range(0, TAU), cols: [cSphere(0, 0, 0, 0.8, 1)], prop: fr };
      fr.mover = m; lv.movers.push(m);
      const ext = m.L * Math.sin(m.amp) + 0.9;
      for (let d = -ext; d <= ext; d += 0.6) keepOut.push({ x: PA.x + PA.tx * d, z: PA.z + PA.tz * d, r: 1.5 });
      break;
    }
  }

  // ---- kemerler (güvenli tüneller) ----
  const archType = set.arch;
  let lastArch = -99;
  for (let s = 4.0; s < path.length - 4.0; s += 0.5) {
    if (s - lastArch < 9.5) continue;
    if (lv.bridges.some((b) => s > b.s0 - 2.5 && s < b.s1 + 2.5)) continue;
    if (!rng.chance(spec.pergolaRate * 0.12)) continue;
    // düzlük kontrolü
    const a = pathAt(path, s - 1.0, {}), b = pathAt(path, s + 1.0, {});
    if (a.tx * b.tx + a.tz * b.tz < 0.96) continue;
    pathAt(path, s, PA);
    const pr = makeArch(archType, PA, rng);
    if (!insideIsland(lv, pr.x, pr.z, 1.5)) continue;
    if (placed.some((p) => Math.hypot(p.x - pr.x, p.z - pr.z) < p.fr + 1.8)) continue;
    if (keepOut.some((k) => Math.hypot(k.x - pr.x, k.z - pr.z) < k.r + pr.fr)) continue;
    pr.arch = true; pr.s = s; placed.push(pr); lastArch = s;
  }

  // ---- yel değirmenleri ----
  if (spec.features.windmills) {
    const cnt = spec.i >= 5 ? 2 : 1;
    for (let k = 0; k < cnt; k++) {
      for (let t = 0; t < 60; t++) {
        const s = rng.range(path.length * 0.2, path.length * 0.8);
        pathAt(path, s, PA);
        const sd = rng.sign(), off = rng.range(2.3, 3.2);
        const x = PA.x + PA.nx * off * sd, z = PA.z + PA.nz * off * sd - rng.range(0, 1.2);
        if (!okSpot(x, z, 1.15, 0.9)) continue;
        // kanat diski yola değmesin (kanatlar kameraya bakar: +z)
        let clash = false;
        for (let i = 0; i < path.n; i += 2) { const dx = path.x[i] - x, dz = path.z[i] - (z + 1.15); if (Math.abs(dx) < 3.1 && Math.abs(dz) < 0.9) { clash = true; break; } }
        if (clash) continue;
        const wm = makeProp('windmill', x, z, 0, rng);
        placed.push(wm);
        const len = wm.p.len, hub = { x, y: wm.p.h + 0.25, z: z + 1.12 };
        const m = { kind: 'sails', hx: hub.x, hy: hub.y, hz: hub.z, nx: 0, nz: 1, sx: 1, sz: 0, len, a0: rng.range(0, TAU), w: rng.range(0.55, 0.95) * rng.sign(), cols: [], prop: wm };
        for (let b = 0; b < wm.p.blades; b++) m.cols.push(cObb(len / 2, 0.36, 0.05));
        wm.mover = m; lv.movers.push(m);
        break;
      }
    }
  }

  // ---- aynalar (Ayna Sarayı) ----
  lv.mirrors = [];
  for (let k = 0; k < (spec.features.mirrors ? spec.mirrors || 2 : 0); k++) {
    for (let t = 0; t < 60; t++) {
      const s = rng.range(path.length * 0.15, path.length * 0.85); pathAt(path, s, PA);
      const sd = rng.sign(), off = rng.range(1.5, 2.6);
      const x = PA.x + PA.nx * off * sd, z = PA.z + PA.nz * off * sd;
      if (!okSpot(x, z, 0.6, 0.85) || lv.mirrors.some((m) => Math.hypot(m.x - x, m.z - z) < 4)) continue;
      const yaw = rng.range(PI * 0.55, PI * 1.45), nx = Math.sin(yaw), nz = Math.cos(yaw);
      const pr = makeProp('mirror', x, z, yaw, rng); pr.fixed = true; placed.push(pr);
      lv.mirrors.push({ x, y: 1.35, z, nx, ny: 0, nz, ux: 0, uy: 1, uz: 0, vx: Math.cos(yaw), vy: 0, vz: -Math.sin(yaw), hw: 0.48, hh: 0.62, prop: pr, id: pr.panelId });
      break;
    }
  }
  // ---- dönen dişliler & sarkaç (Gök Saati) ----
  if (spec.features.gears) {
    for (let k = 0; k < (spec.gears || 1); k++) {
      for (let t = 0; t < 70; t++) {
        const s = rng.range(path.length * 0.15, path.length * 0.85); pathAt(path, s, PA);
        const rg = rng.range(1.5, 2.05), sd = rng.sign(), off = rg + rng.range(0.85, 1.3);
        const x = PA.x + PA.nx * off * sd, z = PA.z + PA.nz * off * sd;
        if (!okSpot(x, z, rg + 0.1, 0.5)) continue;
        const pr = { type: 'gear', x, z, yaw: 0, fr: rg + 0.1, h: 0.1, p: { rg, teeth: 14 + Math.round(rg * 6) }, cols: [], fixed: true };
        const n = rng.int(2, 3), items = [];
        for (let q = 0; q < n; q++) { const h = rng.range(2.2, 3.4); items.push({ rho: rg * 0.66, phi: (q / n) * TAU + rng.range(-0.3, 0.3), h, c: cFrustum(0, 0, 0, h, 0.34, 0.27) }); }
        const m = { kind: 'orbit', cx: x, cz: z, w: rng.sign() * rng.range(0.3, 0.5), a0: rng.range(0, TAU), items, cols: items.map((i) => i.c), prop: pr };
        pr.mover = m; placed.push(pr); lv.movers.push(m);
        break;
      }
    }
  }
  // ---- gölge sağlayıcılar (tasarlanmış güneş açılarıyla) ----
  const shadeTypes = set.shade;
  let prevU = spec.sunStart;
  for (let s = 1.4; s < path.length - 0.9; s += spec.spacing * rng.range(0.8, 1.2)) {
    if (placed.some((p) => p.arch && Math.abs(p.s - s) < 1.6)) continue;
    let ok = false;
    for (let t = 0; t < 10 && !ok; t++) {
      let u = prevU + rng.sign() * rng.range(0.12, 0.42);
      if (u < 0.06) u = 0.06 + (0.06 - u); if (u > 0.94) u = 0.94 - (u - 0.94);
      u = clamp(u, 0.05, 0.95);
      ok = !!placeShadeFor(lv, s, u, rng.weighted(shadeTypes), rng, okSpot);
      if (ok) prevU = u;
    }
    if (lv.sun.twin) for (let t = 0; t < 6; t++) if (placeShadeFor(lv, s, clamp(prevU + rng.range(-0.1, 0.1), 0.05, 0.95), rng.weighted(shadeTypes), rng, okSpot, 2)) break;
  }

  // ---- süs propları ----
  const area = lv.chunks.reduce((a, c) => a + c.hx * c.hz * 3.4, 0);
  const decoN = Math.round(area / 9);
  for (let k = 0, tries = 0; k < decoN && tries < decoN * 30; tries++) {
    const ch = rng.pick(lv.chunks);
    const x = ch.cx + rng.range(-ch.hx, ch.hx), z = ch.cz + rng.range(-ch.hz, ch.hz);
    const type = rng.weighted(set.deco), fr = propFootprint(type);
    if (!okSpot(x, z, fr, 1.6)) continue;
    const pr = makeProp(type, x, z, rng.range(0, TAU), rng);
    if (hidesPath(lv, pr.cols)) continue; // kameradan yolu gizlemesin
    placed.push(pr); k++;
  }
  // uzak manzara: yoldan uzak büyük proplar (adayı doldurur)
  for (let k = 0, tries = 0; k < 4 && tries < 120; tries++) {
    const ch = rng.pick(lv.chunks);
    const x = ch.cx + rng.range(-ch.hx, ch.hx), z = ch.cz + rng.range(-ch.hz, ch.hz);
    const type = rng.weighted(shadeTypes), fr = propFootprint(type);
    if (!okSpot(x, z, fr, 2.8)) continue;
    const pr = makeProp(type, x, z, rng.range(0, TAU), rng);
    if (hidesPath(lv, pr.cols)) continue; // manzara nesnesi yolun önüne düşmesin
    placed.push(pr); k++;
  }

  // ---- bulutlar / balonlar ----
  const T = lv.walkDelay + lv.length / lv.speed;
  if (spec.features.clouds) {
    const cnt = rng.int(3, 4), dir = rng.sign();
    for (let k = 0; k < cnt; k++) {
      const vx = dir * rng.range(0.42, 0.62);
      const crossT = rng.range(0.1, 0.9) * T; // ada üzerinden geçiş zamanı
      const z0 = rng.range(-10, -3.5); // arka taraf: gölgesi kameraya doğru adaya düşer, gövdesi yolu örtmez
      const m = { kind: 'cloud', x0: -vx * crossT + rng.range(-3, 3), y0: rng.range(6.8, 8.4), z0, vx, ph: rng.range(0, TAU), parts: [] };
      const R = rng.range(1.5, 2.0);
      const puffs = [[0, 0, 0, R, 0.62], [R * 0.85, -0.15, rng.range(-0.4, 0.4), R * 0.72, 0.6], [-R * 0.85, -0.12, rng.range(-0.4, 0.4), R * 0.75, 0.6]];
      if (rng.chance(0.6)) puffs.push([rng.range(-0.5, 0.5), 0.1, R * 0.7, R * 0.62, 0.6]);
      for (const p of puffs) m.parts.push({ dx: p[0], dy: p[1], dz: p[2], c: cSphere(0, 0, 0, p[3], p[4]) });
      lv.movers.push(m);
    }
  }
  if (spec.features.balloons) {
    const cnt = rng.int(3, 5);
    for (let k = 0; k < cnt; k++) {
      const vx = rng.sign() * rng.range(0.22, 0.42);
      const crossT = ((k + rng.range(0.1, 0.9)) / cnt) * T;
      const m = { kind: 'balloon', x0: -vx * crossT + rng.range(-2, 2), y0: rng.range(4.6, 8.6), z0: rng.range(-9.5, -3), vx, w: rng.range(0.4, 0.7), amp: rng.range(0.25, 0.5), ph: rng.range(0, TAU), parts: [], look: k };
      m.parts.push({ dx: 0, dy: 0.15, dz: 0, c: cSphere(0, 0, 0, 1.25, 1.12) });
      m.parts.push({ dx: 0, dy: -1.65, dz: 0, c: cSphere(0, 0, 0, 0.32, 0.8) });
      lv.movers.push(m);
    }
  }

  // ---- güneş patlamaları & ışık perileri (ayrı tohum) ----
  const rng2 = new RNG((spec.seed ^ 0x9e3779b9) + attempt);
  lv.flares = null;
  if (spec.flares) {
    // patlama, köprü kristalinin yakılması gereken anla çakışmasın (iki zor iş aynı anda gelmesin)
    const sAt = (t) => (t - lv.walkDelay) * lv.speed;
    lv.flares = [];
    for (let t = rng2.range(3.5, 5); t < T - 2.2; t += rng2.range(6.5, 8.5)) {
      for (const br of lv.bridges) if (sAt(t + 2.55) > br.s0 - 3 && sAt(t + 1.25) < br.s1 + 0.6) t = lv.walkDelay + (br.s1 + 0.6) / lv.speed - 1.25;
      if (t < T - 2.2) lv.flares.push({ w: t, a: t + 1.25, e: t + 2.55 });
    }
  }
  lv.sprites = [];
  for (let k = 0; k < (spec.sprites || 0); k++) {
    const ts = T * (0.18 + (0.62 * (k + 0.5)) / spec.sprites) + rng2.range(-0.8, 0.8);
    const sAt = Math.max(0, (ts - lv.walkDelay) * lv.speed), sa = Math.min(lv.length - 1.2, sAt + rng2.range(4.5, 6.5));
    pathAt(path, sa, PA);
    let sd = rng2.sign(), off = rng2.range(2.4, 3.6), x = PA.x + PA.nx * off * sd, z = PA.z + PA.nz * off * sd;
    if (!insideIsland(lv, x, z, 0.4)) { sd = -sd; x = PA.x + PA.nx * off * sd; z = PA.z + PA.nz * off * sd; }
    if (!insideIsland(lv, x, z, 0.4)) { x = PA.x + PA.nx * 1.6 * sd; z = PA.z + PA.nz * 1.6 * sd; }
    lv.sprites.push({ t: ts, x, z });
  }

  rebuildColliderList(lv);
  // harita kartpostalı: çözücüye gerek yok (hızlı ve bellek dostu)
  if (spec.visualOnly) { lv.solution = null; lv.drops = []; lv.flawless = 0; lv.repairs = 0; updateMovers(lv, 0); return lv; }

  // ---- çözülebilirlik: çöz → onar → (zorsa) budama ----
  let orc = new Oracle(lv);
  let sol = orc.solve();
  let repairs = 0;
  const applyRepair = (r) => { if (!r) return false; if (r.crystal) { rebuildColliderList(lv); orc = new Oracle(lv); } else if (r.prop.mover) orc.applyMover(r.prop.mover, 1); else orc.apply(r.prop.cols, 1); return true; };
  while (!sol.ok && repairs < 24) {
    if (!applyRepair(repairAt(lv, sol, rng, okSpot))) break;
    repairs++; sol = orc.solve();
  }
  if (!sol.ok) return null;
  let extra = 0;
  while (sol.minMeter < spec.margin && extra < 10) {
    if (!applyRepair(repairAt(lv, sol, rng, okSpot, sol.minK))) break;
    extra++; const s2 = orc.solve(); if (s2.ok) sol = s2; else break;
  }
  // zorluk bandı: çözüm payı hedefin çok altındaysa bu deneme atılır (dalgalı zorluk olmasın)
  if (sol.minMeter < Math.max(0.2, spec.margin * 0.85)) return null;
  // budama: zorluk için gereksiz gölgeleri kaldır
  if (spec.prune > 0) {
    let removed = 0;
    for (let t = 0; t < spec.prune * 3 && removed < spec.prune; t++) {
      const cands = placed.filter((p) => !p.fixed && !p.arch && !p.mover && p.type !== 'windmill');
      if (!cands.length) break;
      const pr = rng.pick(cands), idx = placed.indexOf(pr);
      placed.splice(idx, 1); orc.apply(pr.cols, -1);
      const s2 = orc.solve();
      // yalnızca gölgesi gerçekten işe yarayan prop kaldırılır (süs nesneleri adayı boşaltmasın)
      if (s2.ok && s2.minMeter >= spec.margin && s2.minMeter < sol.minMeter - 0.004) { sol = s2; removed++; }
      else { placed.splice(idx, 0, pr); orc.apply(pr.cols, 1); }
    }
  }
  // hedefin çok üstünde kalan (fazla kolay) adalar biraz daha budanır
  if (spec.prune > 0) {
    for (let t = 0; t < 24 && sol.minMeter > spec.margin + 0.2; t++) {
      const cands = placed.filter((p) => !p.fixed && !p.arch && !p.mover && p.type !== 'windmill' && (p.h || 0) > 1.2);
      if (!cands.length) break;
      const pr = rng.pick(cands), idx = placed.indexOf(pr);
      placed.splice(idx, 1); orc.apply(pr.cols, -1);
      const s2 = orc.solve();
      if (s2.ok && s2.minMeter >= spec.margin && s2.minMeter < sol.minMeter - 0.004) sol = s2; else { placed.splice(idx, 0, pr); orc.apply(pr.cols, 1); }
    }
  }
  rebuildColliderList(lv);
  // gerçek oyun hızında yeniden oynatma: plan oyunda da geçilebilmeli (ince/hareketli gölgelerde örnekleme kaçağı olmasın)
  const pb = playbackMin(lv, sol);
  if (pb < 0.14) return null;
  lv.playMin = pb;
  lv.solution = sol;
  lv.repairs = repairs;
  placeDrops(lv, rng);
  lv.flawless = Math.max(0.6, Math.round((sol.exposure * 1.2 + 0.7) * 10) / 10);
  updateMovers(lv, 0);
  return lv;
}
function makeArch(type, PA, rng) {
  const yaw = Math.atan2(PA.tx, PA.tz);
  const P = { w: 1.5, l: rng.range(1.8, 2.4), h: 1.95, roof: 0.28, post: 0.1 };
  if (type === 'rockArch') { P.w = 1.7; P.h = 2.2; P.roof = 0.6; P.post = 0.34; }
  if (type === 'saltArch') { P.w = 1.6; P.h = 2.0; P.roof = 0.45; P.post = 0.3; }
  if (type === 'mushroomArch') { P.w = 1.4; P.l = 1.6; P.h = 2.3; }
  if (type === 'iceArch') { P.w = 1.6; P.h = 2.0; P.roof = 0.45; P.post = 0.3; }
  if (type === 'iwan') { P.w = 1.7; P.h = 2.3; P.roof = 0.55; P.post = 0.32; }
  if (type === 'gearArch') { P.w = 1.6; P.h = 2.1; P.roof = 0.36; P.post = 0.18; }
  const pr = { type, x: PA.x, z: PA.z, yaw, fr: Math.max(P.w, P.l) / 2 + 0.25, h: P.h, p: P };
  buildPropCols(pr);
  return pr;
}
// yol noktası s'yi, güneş u'dayken gölgeleyecek bir prop yerleştir (which: 1 ya da 2. güneş)
// Görüş: oyun kamerası adanın önünde, yukarıda durur (ekran oranına göre z≈14–20). Kameradan yola bakan çizgiyi
// kesen nesneler yolu ve Zifir'i gizler; yerleştirmede bu çizgiler korunur.
const VIEW_CAMS = [{ x: 0, y: 30, z: 14 }, { x: 0, y: 30, z: 20 }];
function hidesPath(lv, cols, maxHidden = 1) {
  if (!cols || !cols.length) return false;
  const P = {}, D = {};
  let hidden = 0;
  for (let s = 0.3; s < lv.length - 0.2; s += 0.3) {
    pathAt(lv.path, s, P);
    for (const C of VIEW_CAMS) {
      D.x = C.x - P.x; D.y = C.y - 0.2; D.z = C.z - P.z; const n = Math.hypot(D.x, D.y, D.z); D.x /= n; D.y /= n; D.z /= n;
      if (occluded(cols, P.x, 0.2, P.z, D, -1)) { hidden++; break; }
    }
    if (hidden > maxHidden) return true;
  }
  return false;
}
function placeShadeFor(lv, s, u, type, rng, okSpot, which = 1) {
  const PA = pathAt(lv.path, s, {});
  const L = which === 2 ? sunDirInto(1 - u, lv.sun.tilt2, lv.sun.thMin2, {}) : sunDirInto(u, lv.sun.tilt, lv.sun.thMin, {});
  const lh = Math.hypot(L.x, L.z), dx = L.x / lh, dz = L.z / lh, tanE = L.y / lh;
  const fr = propFootprint(type);
  let alt = null;
  for (let t = 0; t < 9; t++) {
    const dist = fr + rng.range(0.75, 1.7);
    const x = PA.x + dx * dist, z = PA.z + dz * dist;
    if (!okSpot(x, z, fr)) continue;
    const hNeed = (dist - fr * 0.4) * tanE + 0.45;
    const pr = makeProp(type, x, z, rng.range(0, TAU), rng, hNeed);
    if (pr.h < hNeed * 0.9) continue;
    // başka bir yol şeridini kameradan gizliyorsa yedekte tut, daha iyi yer ara
    if (hidesPath(lv, pr.cols, 2)) { if (!alt) alt = pr; continue; }
    alt = pr; break;
  }
  const pr = alt;
  if (pr) {
    lv.props.push(pr);
    if (lv.spec.features.melt && (type === 'iceSpire' || type === 'iceColumn')) makeMelt(lv, pr, s, rng);
    return pr;
  }
  return null;
}
function makeMelt(lv, pr, s, rng) {
  const tReach = lv.walkDelay + s / lv.speed, t0 = Math.max(0.8, tReach - rng.range(0.6, 3.2)), dur = rng.range(4.5, 7.5);
  const m = { kind: 'melt', prop: pr, cols: pr.cols, base: pr.cols.map((c) => ({ y0: c.y0, y1: c.y1, r0: c.r0, r1: c.r1 })), t0, t1: t0 + dur, drop: 0.72, f: 1 };
  pr.cols = []; pr.mover = m; lv.movers.push(m);
}
function rebuildColliderList(lv) {
  const cols = [];
  for (const p of lv.props) for (const c of p.cols) cols.push(c);
  for (const m of lv.movers) cols.push(...moverCols(m));
  lv.cols = cols;
  lv.hasMovers = lv.movers.length > 0;
}
function repairAt(lv, sol, rng, okSpot, forceK = -1) {
  const k = forceK >= 0 ? forceK : sol.failK;
  const t = Math.max(0, (k - 2) * SOLVE_DT);
  const s = clamp((t - lv.walkDelay) * lv.speed, 0, lv.length);
  if (sol.failReason === 'bridge') {
    for (const br of lv.bridges) if (s > br.s0 - 1.6 && s < br.s0 + 0.4) {
      const c = br.crystal, pr = c.prop, PA = pathAt(lv.path, br.s0, {});
      for (let q = 0; q < 40; q++) {
        const sd = rng.sign(), back = rng.range(0.4, 2.8), off = rng.range(1.5, 3.6);
        const x = PA.x - PA.tx * back + PA.nx * off * sd, z = PA.z - PA.tz * back + PA.nz * off * sd;
        const idx = lv.props.indexOf(pr); lv.props.splice(idx, 1);
        const ci = lv.crystals.indexOf(c); lv.crystals.splice(ci, 1);
        const okk = okSpot(x, z, 0.45, 0.8);
        lv.props.splice(idx, 0, pr); lv.crystals.splice(ci, 0, c);
        if (!okk) continue;
        pr.x = x; pr.z = z; buildPropCols(pr); c.x = x; c.z = z; c.id = pr.selfId;
        return { crystal: true };
      }
    }
  }
  const set = PROP_SETS[lv.chap.key];
  const uBest = sol.bestU != null ? sol.bestU : 0.5;
  const tries = [0, 0.08, -0.08, 0.16, -0.16, 0.26, -0.26, 0.38, -0.38];
  const suns = lv.sun.twin ? [1, 2] : [1];
  for (const ds of [0, -0.6, 0.6, -1.2]) for (const du of tries) for (const w of suns) {
    const u = clamp(uBest + du, 0.04, 0.96);
    const pr = placeShadeFor(lv, clamp(s + ds, 0.2, lv.length - 0.2), u, rng.weighted(set.shade), rng, okSpot, w);
    if (pr) return { prop: pr };
  }
  // son çare: kemer
  const PA = pathAt(lv.path, s, {});
  const pr = makeArch(set.arch, PA, rng);
  if (!lv.props.some((p) => Math.hypot(p.x - pr.x, p.z - pr.z) < p.fr + 1.2) && !(lv.keepOut || []).some((k) => Math.hypot(k.x - pr.x, k.z - pr.z) < k.r + pr.fr)) { pr.arch = true; pr.s = s; lv.props.push(pr); return { prop: pr }; }
  return null;
}

/* ---------- DP çözücü (gölge sayacı önbellekli) ----------
   Her (zaman adımı k, güneş konumu j, örnek nokta q) için o noktayı
   örten çarpıştırıcı sayısı tutulur. Prop ekleme/çıkarma yalnızca o
   propun ışınlarını yeniden test eder; çözüm milisaniyeler sürer. */
const SOLVE_NU = 48, SOLVE_DT = 0.15, SOLVE_SPEED = 0.75;
class Oracle {
  constructor(lv) {
    this.lv = lv;
    const NU = SOLVE_NU, dt = SOLVE_DT;
    const T = lv.walkDelay + lv.length / lv.speed + 0.05, K = Math.ceil(T / dt) + 1;
    this.NU = NU; this.K = K; this.twin = lv.sun.twin;
    this.L1 = []; this.L2 = [];
    for (let j = 0; j < NU; j++) { const a = {}, b = {}; sunDirs(j / (NU - 1), lv.sun, a, b); this.L1.push(a); this.L2.push(b); }
    this.sx = new Float32Array(K * 3); this.sz = new Float32Array(K * 3);
    this.valid = new Uint8Array(K); this.crys = new Int16Array(K).fill(-1);
    const PA = {}, hw = ZIFIR_HALF * 1.18;
    for (let k = 0; k < K; k++) {
      const t = k * dt, s = Math.max(0, (t - lv.walkDelay) * lv.speed);
      pathAt(lv.path, Math.min(s, lv.length), PA);
      for (let q = 0; q < 3; q++) { this.sx[k * 3 + q] = PA.x + PA.nx * hw * (q - 1); this.sz[k * 3 + q] = PA.z + PA.nz * hw * (q - 1); }
      let onBridge = false;
      lv.bridges.forEach((br, bi) => { if (s > br.s0 - 0.4 && s <= br.s0 + 0.05) this.crys[k] = bi; if (s > br.s0 + 0.05 && s < br.s1) onBridge = true; });
      this.valid[k] = t > lv.walkDelay && !onBridge ? 1 : 0;
    }
    this.c1 = new Uint16Array(K * NU * 3); this.c2 = this.twin ? new Uint16Array(K * NU * 3) : null;
    this.k1 = new Uint16Array(K * NU); this.k2 = this.twin ? new Uint16Array(K * NU) : null;
    const statics = []; for (const p of lv.props) for (const c of p.cols) statics.push(c);
    this.apply(statics, 1);
    // güneş patlaması yanma çarpanı
    this.fk = new Float32Array(K); for (let k = 0; k < K; k++) this.fk[k] = flareMul(lv, k * dt);
    // aynalar: yansıma noktası maskesi (gölge tanımaz → bir kez hesaplanır)
    this.mirr = null;
    if (lv.mirrors && lv.mirrors.length) {
      this.mirr = new Uint8Array(K * NU * 3);
      for (let j = 0; j < NU; j++) for (const mr of lv.mirrors) {
        const d = mirrorVDir(mr, this.L1[j], {}); if (!d) continue;
        for (let k = 0; k < K; k++) if (this.valid[k]) for (let q = 0; q < 3; q++) if (mirrorHit(mr, d, this.sx[k * 3 + q], ZIFIR_Y, this.sz[k * 3 + q])) this.mirr[(k * NU + j) * 3 + q] = 1;
      }
    }
    // hareketliler: her adımda poz
    if (lv.movers.length) {
      const mcols = []; for (const m of lv.movers) mcols.push(...moverCols(m));
      for (let k = 0; k < K; k++) { updateMovers(lv, k * dt); this.applyAt(k, mcols, 1); }
      updateMovers(lv, 0);
    }
  }
  apply(cols, sign) { for (let k = 0; k < this.K; k++) this.applyAt(k, cols, sign); }
  applyMover(m, sign) { const cols = moverCols(m); for (let k = 0; k < this.K; k++) { moverUpdate(m, k * SOLVE_DT); this.applyAt(k, cols, sign); } moverUpdate(m, 0); }
  applyAt(k, cols, sign) {
    const NU = this.NU, twin = this.twin, ci = this.crys[k];
    const doZ = this.valid[k] === 1;
    if (!doZ && ci < 0) return;
    const cr = ci >= 0 ? this.lv.bridges[ci].crystal : null;
    for (let n = 0; n < cols.length; n++) {
      const c = cols[n];
      for (let j = 0; j < NU; j++) {
        const A = this.L1[j], B = this.L2[j];
        if (doZ) for (let q = 0; q < 3; q++) {
          const x = this.sx[k * 3 + q], z = this.sz[k * 3 + q], idx = (k * NU + j) * 3 + q;
          if (rayHit(c, x, ZIFIR_Y, z, A.x, A.y, A.z)) this.c1[idx] += sign;
          if (twin && rayHit(c, x, ZIFIR_Y, z, B.x, B.y, B.z)) this.c2[idx] += sign;
        }
        if (cr && c.id !== cr.id) {
          if (rayHit(c, cr.x, cr.y, cr.z, A.x, A.y, A.z)) this.k1[k * NU + j] += sign;
          if (twin && rayHit(c, cr.x, cr.y, cr.z, B.x, B.y, B.z)) this.k2[k * NU + j] += sign;
        }
      }
    }
  }
  expo(k, j) {
    if (!this.valid[k]) return 0;
    const b = (k * this.NU + j) * 3; let e = 0;
    if (this.twin) { for (let q = 0; q < 3; q++) e += ((this.c1[b + q] === 0 ? 1 : 0) + (this.c2[b + q] === 0 ? 1 : 0)) * 0.5; }
    else if (this.mirr) for (let q = 0; q < 3; q++) e += this.c1[b + q] === 0 || this.mirr[b + q] ? 1 : 0;
    else for (let q = 0; q < 3; q++) e += this.c1[b + q] === 0 ? 1 : 0;
    return e / 3;
  }
  crysLit(k, j) { const i = k * this.NU + j; return this.k1[i] === 0 || (this.twin && this.k2[i] === 0); }
  solve() {
    const lv = this.lv, NU = this.NU, K = this.K, dt = SOLVE_DT, R = Math.max(1, Math.round((lv.spec.sunSpeed || SOLVE_SPEED) * dt * (NU - 1)));
    const burn = lv.burn * 1.12, regen = lv.regen * 0.95;
    let best = new Float32Array(NU).fill(1), nb = new Float32Array(NU);
    const choice = new Int8Array(K * NU);
    const order = [0]; for (let o = 1; o <= R; o++) order.push(-o, o);
    for (let k = 1; k < K; k++) {
      const needC = this.crys[k] >= 0; let alive = false;
      for (let j = 0; j < NU; j++) {
        let bm = -1, bo = 0;
        for (let q = 0; q < order.length; q++) { const i = j + order[q]; if (i >= 0 && i < NU && best[i] > bm + 1e-6) { bm = best[i]; bo = order[q]; } }
        if (bm <= 0 || (needC && !this.crysLit(k, j))) { nb[j] = -1; continue; }
        const f = this.expo(k, j);
        const m = f > 0 ? bm - burn * this.fk[k] * f * dt : Math.min(1, bm + regen * dt);
        nb[j] = m > 0 ? m : -1; choice[k * NU + j] = bo;
        if (m > 0) alive = true;
      }
      if (!alive) {
        let bu = 0, bv = -1; for (let j = 0; j < NU; j++) if (best[j] > bv) { bv = best[j]; bu = j; }
        return { ok: false, failK: k, bestU: bu / (NU - 1), failReason: needC ? 'bridge' : 'light' };
      }
      const tmp = best; best = nb; nb = tmp;
    }
    let j = 0, bv = -1; for (let q = 0; q < NU; q++) if (best[q] > bv) { bv = best[q]; j = q; }
    const traj = new Float32Array(K); let exposure = 0;
    const js = new Int16Array(K);
    for (let k = K - 1; k >= 1; k--) { js[k] = j; traj[k] = j / (NU - 1); exposure += this.expo(k, j) * dt; j += choice[k * NU + j]; }
    js[0] = j; traj[0] = j / (NU - 1);
    let m = 1, minMeter = 1, minK = 0;
    for (let k = 1; k < K; k++) { const f = this.expo(k, js[k]); m = f > 0 ? m - burn * this.fk[k] * f * dt : Math.min(1, m + regen * dt); if (m < minMeter) { minMeter = m; minK = k; } }
    return { ok: true, traj, K, dt, exposure, minMeter, minK, bestU: traj[minK] };
  }
}
// Çözüm rotasını oyunun kendi kurallarıyla (1/30 sn adım, güneş yayı gecikmesi, 3 noktalı pozlama) oynatır; en düşük canı döner.
function playbackMin(lv, sol) {
  const dt = 1 / 30, T = lv.walkDelay + lv.length / lv.speed, L1 = {}, L2 = {}, P = {}, tw = lv.sun.twin, mir = lv.mirrors && lv.mirrors.length;
  let m = 1, mn = 1, u = sol.traj[0], uv = 0;
  const kk = 240, cc = 2 * Math.sqrt(kk) * 0.8;
  for (let t = dt; t < T; t += dt) {
    const f = (t + 0.1) / sol.dt, k0 = Math.min(sol.K - 1, Math.floor(f)), k1 = Math.min(sol.K - 1, k0 + 1), uT = sol.traj[k0] + (sol.traj[k1] - sol.traj[k0]) * (f - Math.floor(f));
    for (let i = 0; i < 3; i++) { uv += ((uT - u) * kk - uv * cc) * (dt / 3); u = clamp(u + uv * (dt / 3), 0, 1); }
    if (t <= lv.walkDelay) continue;
    const s = Math.min(lv.length, (t - lv.walkDelay) * lv.speed);
    if (lv.bridges.some((b) => s > b.s0 - 0.35 && s < b.s1)) continue;
    if (lv.hasMovers) updateMovers(lv, t);
    sunDirs(u, lv.sun, L1, L2); pathAt(lv.path, s, P);
    let e = 0;
    for (let q = -1; q <= 1; q++) {
      const px = P.x + P.nx * ZIFIR_HALF * q, pz = P.z + P.nz * ZIFIR_HALF * q;
      let l1 = occluded(lv.cols, px, ZIFIR_Y, pz, L1, -1) ? 0 : 1;
      if (!l1 && mir && mirrorsLit(lv.mirrors, px, ZIFIR_Y, pz, L1)) l1 = 1;
      e += tw ? (l1 + (occluded(lv.cols, px, ZIFIR_Y, pz, L2, -1) ? 0 : 1)) * 0.5 : l1;
    }
    e /= 3;
    m = e > 0 ? m - lv.burn * e * flareMul(lv, t) * dt : Math.min(1, m + lv.regen * dt);
    if (m < mn) mn = m;
  }
  if (lv.hasMovers) updateMovers(lv, 0);
  return mn;
}
// damlalar: Zifir yaklaşınca (DROP_WAKE) uyanır ve ışığa karşı savunmasızlaşır
const DROP_LIFE = 2.4, DROP_WAKE = 6.5;
function placeDrops(lv, rng) {
  const want = lv.spec.drops, sol = lv.solution, path = lv.path;
  const cands = [];
  for (let s = 2.4; s < lv.length - 1.5; s += 0.35) cands.push(s);
  const L1 = {}, L2 = {};
  const life = (s) => {
    const PA = pathAt(path, s, {}), tCol = lv.walkDelay + s / lv.speed;
    let litT = 0;
    for (let k = 1; k < sol.K; k++) {
      const t = k * sol.dt; if (t >= tCol) break;
      const zs = (t - lv.walkDelay) * lv.speed;
      if (s - zs > DROP_WAKE) continue;
      if (lv.hasMovers) updateMovers(lv, t);
      sunDirs(sol.traj[k], lv.sun, L1, L2);
      if (lv.sun.twin) litT += ((occluded(lv.cols, PA.x, 0.3, PA.z, L1, -1) ? 0 : 1) + (occluded(lv.cols, PA.x, 0.3, PA.z, L2, -1) ? 0 : 1)) * 0.5 * sol.dt;
      else if (!occluded(lv.cols, PA.x, 0.3, PA.z, L1, -1) || (lv.mirrors && lv.mirrors.length && mirrorsLit(lv.mirrors, PA.x, 0.3, PA.z, L1))) litT += sol.dt;
    }
    return litT;
  };
  const scored = [];
  for (const s of cands) { if (lv.bridges.some((b) => s > b.s0 - 0.6 && s < b.s1 + 0.4)) continue; scored.push([s, life(s) + rng.next() * 0.05]); }
  scored.sort((p, q) => p[1] - q[1]);
  const picks = [];
  const minGap = (lv.length / (want + 1)) * 0.6;
  for (const lim of [0.5, 0.8]) for (const [s, l] of scored) {
    if (picks.length >= want || l > DROP_LIFE * lim) break;
    if (picks.some((p) => Math.abs(p - s) < minGap)) continue;
    picks.push(s);
  }
  if (lv.hasMovers) updateMovers(lv, 0);
  picks.sort((a, b) => a - b);
  lv.drops = picks.map((s) => { const PA = pathAt(path, s, {}); return { s, x: PA.x, z: PA.z, hp: 1, state: 0 }; });
}

// tohumdan ada: çözülemezse yeni deneme. Hikâye adaları deterministik olduğundan
// geçerli deneme numaraları önceden bilinir (farklı JS motorlarında kayarsa
// döngü kendiliğinden devam eder — yalnızca hızlandırmadır).
const ATTEMPT_HINT = [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 7, 1, 0, 1, 1, 3, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 4, 10, 7, 2];
// zorluk eğrisi: 64 ada insan profilleriyle ölçülerek kalibre edildi. Yalnızca yakıcılığı ölçekler (ada düzeni değişmez);
// sertleştirmede plan gerçek oyun hızında yine geçilebilir kalmalı, kalmıyorsa katsayı geri çekilir.
const BURN_TUNE = [0.66, 0.72, 0.67, 1.07, 0.71, 1.45, 0.92, 0.77, 1, 1.09, 1.03, 1.06, 1.22, 1.08, 1.45, 1.01, 1.1, 0.67, 1.41, 1.41, 0.77, 1.45, 0.9, 1.15, 1, 1.18, 0.62, 0.5, 0.97, 1.45, 1.45, 1.16, 0.61, 0.5, 0.7, 0.73, 0.57, 0.8, 0.9, 0.64, 0.82, 0.94, 1.07, 0.96, 0.5, 1.33, 1.04, 1.0, 1.3, 0.65, 1, 1.09, 0.94, 1.45, 1.45, 0.89, 1.39, 0.54, 0.5, 0.67, 0.55, 0.94, 1.07, 1];
function tuneBurn(lv) {
  if (lv.spec.kind !== 'story' || !lv.solution) return; // harita önizlemesi (visualOnly) çözümsüzdür
  const b0 = lv.burn; let k = BURN_TUNE[lv.spec.g] || 1;
  lv.burn = b0 * k;
  while (k > 1 && playbackMin(lv, lv.solution) < 0.14) { k = Math.max(1, k - 0.03); lv.burn = b0 * k; }
  lv.burnK = k;
}
function buildLevel(spec) {
  const easy = Object.assign({}, spec, { spacing: Math.min(spec.spacing, 2.2), prune: 0, margin: Math.min(spec.margin, 0.4), pergolaRate: 1.0 });
  const order = [];
  if (spec.kind === 'story' && ATTEMPT_HINT[spec.g] != null) order.push(ATTEMPT_HINT[spec.g]);
  for (let a = 0; a < 20; a++) order.push(a);
  for (let a = 50; a < 70; a++) order.push(a);
  const tried = new Set();
  for (const a of order) {
    if (tried.has(a)) continue; tried.add(a);
    const lv = generateLevel(a >= 50 ? easy : spec, a);
    if (lv) { lv.attempt = a; tuneBurn(lv); return lv; }
  }
  return null;
}

/* ---------- arka plan üretici (Web Worker) ----------
   Sonraki ada oyun sürerken ayrı iş parçacığında üretilir: ada geçişinde ana iş parçacığı donmaz.
   Kaynak, derlemede bu dosyanın saf bölümlerinden küçültülerek gömülür. Worker yoksa eşzamanlı üretime düşülür. */
const GEN_WORKER_SRC = '__GEN_WORKER_SRC__';
const GenW = {
  w: null, ok: false, seq: 0, pend: new Map(),
  init() {
    if (this.w || typeof Worker === 'undefined' || GEN_WORKER_SRC.length < 100) return;
    try {
      const url = URL.createObjectURL(new Blob([GEN_WORKER_SRC], { type: 'text/javascript' }));
      this.w = new Worker(url); this.ok = true;
      this.w.onmessage = (e) => { const d = e.data, p = this.pend.get(d.id); if (!p) return; this.pend.delete(d.id); p(d.lv ? fixWorkerLevel(d.lv) : null); };
      this.w.onerror = () => { this.ok = false; for (const p of this.pend.values()) p(null); this.pend.clear(); };
    } catch (e) { this.ok = false; }
  },
  build(spec) {
    if (!this.ok) return Promise.resolve(null);
    const id = ++this.seq;
    return new Promise((res) => { this.pend.set(id, res); try { this.w.postMessage({ id, spec }); } catch (e) { this.pend.delete(id); res(null); } });
  },
};
// iş parçacığından gelen kopyada bölüm nesnesi yerel olanla değiştirilir (aynı başvuru)
function fixWorkerLevel(lv) { const ch = CHAPTERS[lv.spec.ch]; if (ch) { lv.chap = ch; lv.spec.chap = ch; } lv.rng = new RNG(lv.spec.seed ^ 0x1234567); return lv; }
