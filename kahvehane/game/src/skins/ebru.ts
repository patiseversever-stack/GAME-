// Deste "Ebru": Türk kâğıt ebrusu. Bütün desenler gerçek ebru matematiğiyle (src/skins/marble.ts) teknede "yapılır":
// boya damlaları, tarak, biz ve girdap. Hiçbir görsel indirilmez; prepare() desenleri dilim dilim bir kez boyar.
//   · kenar: taraklı ebru şeridi · panel: aharlı krem kâğıt
//   · sayılar: ebru dolgulu iri takım işareti (♥ gelgit, ♦ taraklı, ♠ bülbül yuvası, ♣ battal) + ortada değer
//   · As: hatip ebrusu çiçek madalyonu · Papaz: hatip (iç içe halkalar) + taç · Kız: lale ebrusu · Vale: dört renk bülbül yuvası
//   · arka: lacivert-kırmızı-altın gelgit üstünde altın çerçeveli lale madalyonu
import {battal, gelgit, lale, marble, pathMask, rings, type MOp} from './marble';
import {
  cardPath, corners, crown, defineSkin, edge, gold, grain, isRed, lin, loadFont, makeCanvas, mulberry, rad, RankFont, roundRect, rrPath,
  SUIT_TY, suitPath, withSuit, type Ctx, type Job, type RGB, type Suit,
} from './kit';

const FONT = (px: number): string => `900 ${px}px "Playfair Display", "Times New Roman", Georgia, serif`;
const RF = new RankFont(FONT);
const PW = 360, PH = Math.round(PW / 0.7);
const RED = '#a8132b', INK = '#141a3c';

// Ebru boyaları (toprak + mineral pigment tonları)
const P = {
  lac: [24, 36, 98] as RGB, // lacivert
  gece: [14, 18, 44] as RGB,
  kir: [168, 22, 40] as RGB, // lal kırmızı
  vis: [112, 14, 34] as RGB, // vişne
  gul: [222, 104, 118] as RGB,
  hardal: [214, 158, 52] as RGB,
  altin: [238, 196, 92] as RGB,
  krem: [244, 232, 204] as RGB,
  tur: [38, 138, 150] as RGB,
  yes: [36, 120, 72] as RGB,
  mavi: [52, 104, 204] as RGB,
  tur2: [120, 196, 200] as RGB,
};
const PAL: RGB[] = [P.lac, P.gece, P.kir, P.vis, P.gul, P.hardal, P.altin, P.krem, P.tur, P.yes, P.mavi, P.tur2];
const I = Object.fromEntries(Object.keys(P).map((k, i) => [k, i])) as Record<keyof typeof P, number>;

interface Art {
  frame: HTMLCanvasElement;
  paper: HTMLCanvasElement;
  suit: Record<Suit, HTMLCanvasElement>;
  ace: HTMLCanvasElement;
  court: Record<number, HTMLCanvasElement>;
  back: HTMLCanvasElement;
}

// ───────────────────────── yerleşim ─────────────────────────
const F = 0.082; // ebru kenar kalınlığı (w oranı)
const BX = 0.032, BW = 0.34, BH = 0.6; // köşe rozeti
function panelPath(w: number, h: number): Path2D {
  const p = new Path2D();
  roundRect(p, F * w, F * w, w - 2 * F * w, h - 2 * F * w, 0.05 * w);
  roundRect(p, BX * w, BX * w, BW * w, BH * w, 0.07 * w);
  roundRect(p, w - (BX + BW) * w, h - (BX + BH) * w, BW * w, BH * w, 0.07 * w);
  return p;
}

// ───────────────────────── boyamalar ─────────────────────────
/** Kenar şeridi: battal + gelgit + ince tarak (yalnız panelin dışında hesaplanır). */
function* paintFrame(): Job<HTMLCanvasElement> {
  const rnd = mulberry(1607);
  const ops: MOp[] = [];
  battal(ops, PW, PH, rnd, [I.lac, I.kir, I.krem, I.hardal, I.lac, I.tur, I.vis, I.krem, I.gece], 230, 16, 34);
  gelgit(ops, true, 34, 26, 9);
  ops.push({k: 'wave', dx: 1, dy: 0, A: 7, f: 0.045, ph: 0.6});
  ops.push({k: 'tine', x: 0, y: 0, dx: 0, dy: 1, a: 12, l: 3, s: 11});
  const m = PW * 0.05;
  const keep = (x: number, y: number): boolean => x < PW * F + m || y < PW * F + m || x > PW * (1 - F) - m || y > PH - PW * F - m || (x < PW * (BX + BW) + m && y < PW * (BX + BH) + m) || (x > PW * (1 - BX - BW) - m && y > PH - PW * (BX + BH) - m);
  return yield* marble({w: PW, h: PH, ops, pal: PAL, base: P.krem, rim: 0.25, keep});
}

/** Aharlı krem kâğıt: sıcak degrade + lif dokusu + çok soluk ebru gölgesi. */
function* paintPaper(): Job<HTMLCanvasElement> {
  const rnd = mulberry(77);
  const ops: MOp[] = [];
  battal(ops, PW, PH, rnd, [0, 1, 2], 120, 18, 40);
  gelgit(ops, false, 60, 30, 14);
  // hayalet ebru: krem tonları arası çok hafif fark
  const ghost = yield* marble({w: PW >> 1, h: PH >> 1, unit: 2, ops, pal: [[246, 236, 212], [240, 226, 196], [248, 240, 222]], base: [245, 234, 210], rim: 0.1});
  const [c, g] = makeCanvas(PW, PH);
  g.imageSmoothingQuality = 'high';
  g.drawImage(ghost, 0, 0, PW, PH);
  ghost.width = ghost.height = 0;
  g.fillStyle = rad(g, PW / 2, PH / 2, PW * 0.1, PH * 0.7, [
    [0, 'rgba(255,252,240,0.5)'],
    [1, 'rgba(200,170,120,0.22)'],
  ]);
  g.fillRect(0, 0, PW, PH);
  // lifler
  g.globalAlpha = 0.07;
  g.strokeStyle = '#7a5a30';
  g.lineWidth = 0.6;
  for (let i = 0; i < 260; i++) {
    const x = rnd() * PW, y = rnd() * PH, a = rnd() * Math.PI, l = 3 + rnd() * 9;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + rnd() * 2, y + Math.sin(a) * l * 0.5 + rnd() * 2, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  g.globalAlpha = 1;
  grain(g, PW, PH, rnd, 0.05);
  return c;
}

const SPR = 220;
/** Takım işareti ebru dolgulu (her takımın kendi klasik deseni), koyu mürekkep konturu + ince altın iç çizgi. */
function* paintSuit(s: Suit): Job<HTMLCanvasElement> {
  const rnd = mulberry(900 + 'SHDC'.indexOf(s));
  const ops: MOp[] = [];
  const S = SPR;
  let base: RGB;
  if (s === 'H') {
    // gelgit: lal kırmızı ağırlıklı, gül ve altın damarlar
    base = P.kir;
    battal(ops, S, S, rnd, [I.kir, I.vis, I.kir, I.gul, I.kir, I.altin, I.vis, I.krem], 120, 9, 20);
    gelgit(ops, true, 22, 18, 6);
    ops.push({k: 'wave', dx: 1, dy: 0, A: 5, f: 0.06, ph: 1});
  } else if (s === 'D') {
    // taraklı: dikey ince tarak
    base = P.kir;
    battal(ops, S, S, rnd, [I.kir, I.hardal, I.vis, I.kir, I.altin, I.kir, I.krem, I.vis], 130, 8, 18);
    gelgit(ops, false, 26, 16, 7);
    ops.push({k: 'tine', x: 0, y: 0, dx: 1, dy: 0, a: 9, l: 2.5, s: 9});
  } else if (s === 'S') {
    // bülbül yuvası: lacivert zeminde küçük sarmallar
    base = P.gece;
    battal(ops, S, S, rnd, [I.gece, I.lac, I.gece, I.tur, I.lac, I.krem, I.gece, I.mavi], 120, 9, 19);
    gelgit(ops, true, 24, 14, 6);
    for (let i = 0; i < 7; i++) ops.push({k: 'swirl', x: S * (0.15 + rnd() * 0.7), y: S * (0.15 + rnd() * 0.7), a: (rnd() < 0.5 ? -1 : 1) * (5 + rnd() * 3), r: S * (0.1 + rnd() * 0.06)});
  } else {
    // battal + hafif dalga: gece mavisi, zümrüt ve krem
    base = P.gece;
    battal(ops, S, S, rnd, [I.gece, I.lac, I.yes, I.gece, I.krem, I.tur, I.gece, I.lac], 130, 9, 21);
    ops.push({k: 'wave', dx: 0, dy: 1, A: 6, f: 0.05, ph: 0.3});
    ops.push({k: 'wave', dx: 1, dy: 0, A: 4, f: 0.07, ph: 2});
  }
  const k = S * 0.84, C = S / 2;
  const path = suitPath(s);
  const keep = pathMask(S, S, m => {
    m.setTransform(k, 0, 0, k, C, C);
    m.lineWidth = 6 / k;
    m.fill(path);
    m.stroke(path);
  });
  const tex = yield* marble({w: S, h: S, ops, pal: PAL, base, rim: 0.3, keep});
  const [c, g] = makeCanvas(S, S);
  g.setTransform(k, 0, 0, k, C, C);
  g.save();
  g.clip(path);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(tex, 0, 0);
  tex.width = tex.height = 0;
  // hacim: üstte ışık, altta gölge
  g.fillStyle = lin(g, 0, 0, 0, S, [
    [0, 'rgba(255,255,255,0.16)'],
    [0.5, 'rgba(255,255,255,0)'],
    [1, 'rgba(0,0,0,0.22)'],
  ]);
  g.fillRect(0, 0, S, S);
  g.restore();
  g.setTransform(k, 0, 0, k, C, C);
  g.lineJoin = 'round';
  g.lineWidth = 5 / k;
  g.strokeStyle = isRed(s) ? '#4a0614' : '#060816';
  g.stroke(path);
  g.lineWidth = 1.6 / k;
  g.strokeStyle = 'rgba(246,212,120,0.85)';
  g.save();
  g.translate(0, 0);
  g.scale(0.955, 0.955);
  g.stroke(path);
  g.restore();
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

/** As: hatip madalyonu — iç içe halkalar sekiz kollu biz darbeleriyle çiçeğe açılır; çevresinde küçük hatipler. */
const ACE = 320;
function* paintAce(): Job<HTMLCanvasElement> {
  const S = ACE, C = S / 2;
  const rnd = mulberry(4242);
  const ops: MOp[] = [];
  battal(ops, S, S, rnd, [I.lac, I.gece, I.lac, I.tur], 60, 14, 26);
  // çevredeki 8 küçük hatip
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    rings(ops, C + Math.cos(a) * S * 0.36, C + Math.sin(a) * S * 0.36, [22, 16, 10, 5], [I.krem, I.kir, I.altin, I.krem]);
  }
  // merkez: büyük hatip
  rings(ops, C, C, [96, 84, 72, 60, 48, 38, 28, 18, 9], [I.altin, I.kir, I.krem, I.lac, I.hardal, I.vis, I.krem, I.kir, I.altin]);
  // sekiz yaprak: merkezden dışa iğne
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ops.push({k: 'tine', x: C, y: C, dx: Math.cos(a), dy: Math.sin(a), a: 30, l: 7, t0: 20, t1: 120, fall: 26});
  }
  // aralara ters (içe) iğne: yaprak boğumu
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    ops.push({k: 'tine', x: C, y: C, dx: -Math.cos(a), dy: -Math.sin(a), a: 12, l: 5, t0: -110, t1: -50, fall: 20});
  }
  ops.push({k: 'swirl', x: C, y: C, a: 0.5, r: 140});
  const tex = yield* marble({w: S, h: S, ops, pal: PAL, base: P.gece, rim: 0.28, keep: (x, y) => (x - C) ** 2 + (y - C) ** 2 < (S * 0.49) ** 2});
  const [c, g] = makeCanvas(S, S);
  const R = S * 0.48;
  g.save();
  g.beginPath();
  g.arc(C, C, R, 0, Math.PI * 2);
  g.clip();
  g.drawImage(tex, 0, 0);
  g.fillStyle = rad(g, C, C, R * 0.6, R, [
    [0, 'rgba(0,0,0,0)'],
    [1, 'rgba(6,8,30,0.45)'],
  ]);
  g.fillRect(0, 0, S, S);
  g.restore();
  tex.width = tex.height = 0;
  // altın bilezik: kalın altın + iç koyu + boncuklar
  g.lineWidth = S * 0.035;
  g.strokeStyle = gold(g, 0, 0, S, S);
  g.beginPath();
  g.arc(C, C, R, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 2;
  g.strokeStyle = '#3a2206';
  for (const rr of [R + S * 0.0175, R - S * 0.0175]) {
    g.beginPath();
    g.arc(C, C, rr, 0, Math.PI * 2);
    g.stroke();
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.fillStyle = i % 2 ? '#fff4cc' : '#8a5a12';
    g.beginPath();
    g.arc(C + Math.cos(a) * R, C + Math.sin(a) * R, S * 0.007, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

const CW = 240, CH = 350, PAD = 17;
const ORX = CW / 2 - PAD, ORY = CH / 2 - PAD;
/** Saray kartı: elips içinde ebru sahnesi + altın-lacivert çerçeve. */
function* paintCourt(kind: 'K' | 'Q' | 'J'): Job<HTMLCanvasElement> {
  const W = CW, H = CH, cx = W / 2, cy = H / 2;
  const rnd = mulberry(kind === 'K' ? 13 : kind === 'Q' ? 12 : 11);
  const ops: MOp[] = [];
  let base: RGB = P.krem;
  if (kind === 'K') {
    // hatip: koyu lacivert zemin, merkezde büyük iç içe halkalar, çevresinde yarım hatipler
    base = P.gece;
    battal(ops, W, H, rnd, [I.lac, I.gece, I.tur, I.lac], 70, 12, 24);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      rings(ops, cx + Math.cos(a) * ORX * 0.92, cy + 30 + Math.sin(a) * ORY * 0.7, [26, 19, 12, 6], [I.altin, I.kir, I.krem, I.kir]);
    }
    rings(ops, cx, cy + 30, [74, 64, 54, 44, 35, 26, 18, 10], [I.kir, I.altin, I.lac, I.krem, I.vis, I.altin, I.kir, I.krem]);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ops.push({k: 'tine', x: cx, y: cy + 30, dx: Math.cos(a), dy: Math.sin(a), a: 14, l: 4, t0: 30, t1: 110, fall: 20});
    }
  } else if (kind === 'Q') {
    // lale: krem-gül battal zemin, ortada büyük lale, iki yanda küçük tomurcuk
    base = P.krem;
    battal(ops, W, H, rnd, [I.krem, I.tur2, I.krem, I.gul, I.krem, I.altin], 90, 10, 20);
    gelgit(ops, true, 30, 14, 8);
    // sap ve yapraklar: yeşil damlalar yukarı çekilir
    rings(ops, cx, cy + 92, [26, 14], [I.yes, I.tur]);
    ops.push({k: 'tine', x: cx, y: cy + 92, dx: 0, dy: -1, a: 70, l: 3, t0: -60, t1: 60, fall: 30});
    for (const sd of [-1, 1]) {
      rings(ops, cx + sd * 34, cy + 86, [16, 9], [I.yes, I.tur]);
      ops.push({k: 'tine', x: cx + sd * 34, y: cy + 86, dx: sd * 0.35, dy: -1, a: 46, l: 5, t0: -40, t1: 40, fall: 22});
    }
    lale(ops, cx, cy - 4, 58, [I.kir, I.gul, I.vis, I.altin]);
    for (const sd of [-1, 1]) lale(ops, cx + sd * 66, cy + 26, 20, [I.kir, I.gul, I.altin, I.vis]);
  } else {
    // vale: dört renk bülbül yuvası — renk şeritleri (sıra sıra damla + tarak) iğneyle sarmala çevrilir
    base = P.gece;
    const rows = [I.kir, I.krem, I.altin, I.gece, I.yes, I.krem, I.mavi, I.gece];
    for (let j = 0, y = -6; y < H + 14; y += 15, j++) for (let x = (j % 2) * 9 - 4; x < W + 14; x += 18) ops.push({k: 'drop', x: x + rnd() * 3, y: y + rnd() * 3, r: 11, c: rows[j % rows.length]});
    ops.push({k: 'tine', x: 0, y: 0, dx: 1, dy: 0, a: 14, l: 4, s: 8});
    ops.push({k: 'tine', x: 0, y: 4, dx: -1, dy: 0, a: 10, l: 4, s: 8});
    ops.push({k: 'swirl', x: cx, y: cy, a: 9, r: 62});
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ops.push({k: 'swirl', x: cx + Math.cos(a) * ORX * 0.78, y: cy + Math.sin(a) * ORY * 0.8, a: -6, r: 22});
    }
  }
  const keep = (x: number, y: number): boolean => ((x - cx) / (ORX + 3)) ** 2 + ((y - cy) / (ORY + 3)) ** 2 < 1;
  const tex = yield* marble({w: W, h: H, ops, pal: PAL, base, rim: 0.28, keep});
  const [c, g] = makeCanvas(W, H);
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, ORX + 1, ORY + 1, 0, 0, Math.PI * 2);
  g.clip();
  g.drawImage(tex, 0, 0);
  tex.width = tex.height = 0;
  g.fillStyle = rad(g, cx, cy, ORX * 0.5, ORY * 1.05, [
    [0, 'rgba(0,0,0,0)'],
    [1, kind === 'Q' ? 'rgba(80,40,10,0.28)' : 'rgba(4,6,24,0.5)'],
  ]);
  g.fillRect(0, 0, W, H);
  if (kind === 'K') crown(g, cx, cy - 34, 96, ['#c8102e', '#1f5fd6']);
  if (kind === 'Q') {
    // küçük altın hotoz yerine lale tacı: üç inci
    for (let i = -1; i <= 1; i++) {
      g.fillStyle = gold(g, cx - 20, 30, cx + 20, 60);
      g.beginPath();
      g.arc(cx + i * 22, 50 - (i === 0 ? 8 : 0), i === 0 ? 7 : 5, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (kind === 'J') {
    // ortada altın göbek yıldızı
    g.save();
    g.translate(cx, cy);
    g.fillStyle = gold(g, -16, -16, 16, 16);
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, r = i % 2 ? 6 : 15;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = '#3a2206';
    g.stroke();
    g.restore();
  }
  g.restore();
  // çerçeve: altın şerit + lacivert iç çizgi + boncuk dizisi
  g.lineWidth = PAD * 0.62;
  g.strokeStyle = gold(g, 0, 0, W, H);
  g.beginPath();
  g.ellipse(cx, cy, ORX + PAD * 0.4, ORY + PAD * 0.4, 0, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 2;
  g.strokeStyle = '#2a1a04';
  for (const d of [0.4 - 0.31, 0.4 + 0.31]) {
    g.beginPath();
    g.ellipse(cx, cy, ORX + PAD * d, ORY + PAD * d, 0, 0, Math.PI * 2);
    g.stroke();
  }
  const nb = 40;
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2;
    const x = cx + Math.cos(a) * (ORX + PAD * 0.4), y = cy + Math.sin(a) * (ORY + PAD * 0.4);
    g.fillStyle = i % 2 ? '#fff4cc' : '#1a2a6a';
    g.beginPath();
    g.arc(x, y, i % 2 ? 1.6 : 2.2, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

/** Arka: lacivert-lal-altın gelgit + taraklı, ortada krem madalyonda lale (ayrı teknede). */
const MED = 210;
function* paintBack(): Job<HTMLCanvasElement> {
  const W = PW, H = PH, cx = W / 2, cy = H / 2;
  const rnd = mulberry(1453);
  const ops: MOp[] = [];
  // taraklı ebru: sık battal → yatay gelgit → ince dikey tarak → hafif dalga
  battal(ops, W, H, rnd, [I.lac, I.kir, I.krem, I.altin, I.gece, I.lac, I.tur, I.vis], 240, 12, 22);
  gelgit(ops, true, 17, 24, 5);
  ops.push({k: 'tine', x: 0, y: 0, dx: 0, dy: 1, a: 13, l: 2.5, s: 11});
  ops.push({k: 'wave', dx: 1, dy: 0, A: 5, f: 0.05, ph: 0});
  const R = MED / 2 - 4;
  const keep = (x: number, y: number): boolean => (x - cx) ** 2 + (y - cy) ** 2 > (R - 6) ** 2;
  const tex = yield* marble({w: W, h: H, ops, pal: PAL, base: P.lac, rim: 0.26, keep});
  // madalyon teknesi: krem zemin, lale + yapraklar
  const m = MED, mc = m / 2;
  const mo: MOp[] = [];
  battal(mo, m, m, rnd, [I.krem, I.tur2, I.krem, I.altin, I.krem], 50, 9, 18);
  gelgit(mo, true, 26, 10, 6);
  rings(mo, mc, mc + 62, [20, 11], [I.yes, I.tur]);
  mo.push({k: 'tine', x: mc, y: mc + 62, dx: 0, dy: -1, a: 52, l: 3, t0: -50, t1: 40, fall: 26});
  for (const sd of [-1, 1]) {
    rings(mo, mc + sd * 32, mc + 58, [14, 8], [I.yes, I.tur]);
    mo.push({k: 'tine', x: mc + sd * 32, y: mc + 58, dx: sd * 0.4, dy: -1, a: 36, l: 4, t0: -36, t1: 30, fall: 20});
  }
  lale(mo, mc, mc - 14, 52, [I.kir, I.gul, I.vis, I.altin]);
  const med = yield* marble({w: m, h: m, ops: mo, pal: PAL, base: P.krem, rim: 0.24, keep: (x, y) => (x - mc) ** 2 + (y - mc) ** 2 < (R + 2) ** 2});
  const [c, g] = makeCanvas(W, H);
  g.drawImage(tex, 0, 0);
  tex.width = tex.height = 0;
  g.fillStyle = rad(g, cx, cy, W * 0.3, H * 0.62, [
    [0, 'rgba(0,0,0,0)'],
    [1, 'rgba(6,8,30,0.4)'],
  ]);
  g.fillRect(0, 0, W, H);
  g.save();
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.clip();
  g.drawImage(med, cx - mc, cy - mc);
  g.fillStyle = rad(g, cx, cy, R * 0.55, R, [
    [0, 'rgba(0,0,0,0)'],
    [1, 'rgba(90,50,10,0.25)'],
  ]);
  g.fillRect(cx - R, cy - R, R * 2, R * 2);
  g.restore();
  med.width = med.height = 0;
  // madalyon çerçevesi: altın bilezik + iki koyu çizgi + boncuklar
  g.lineWidth = 9;
  g.strokeStyle = gold(g, cx - 120, cy - 120, cx + 120, cy + 120);
  g.beginPath();
  g.arc(cx, cy, R + 1, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 1.6;
  g.strokeStyle = '#2a1a04';
  for (const r of [R - 3.5, R + 5.5]) {
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
  }
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    g.fillStyle = i % 2 ? '#fff4cc' : '#7a4a0a';
    g.beginPath();
    g.arc(cx + Math.cos(a) * (R + 1), cy + Math.sin(a) * (R + 1), i % 2 ? 1.6 : 2.2, 0, Math.PI * 2);
    g.fill();
  }
  // dört köşede küçük altın gonca
  for (const [x, y] of [[0.16, 0.115], [0.84, 0.115], [0.16, 0.885], [0.84, 0.885]] as const) {
    g.save();
    g.translate(W * x, H * y);
    g.rotate(Math.PI / 4);
    g.fillStyle = gold(g, -10, -10, 10, 10);
    g.beginPath();
    g.moveTo(0, -14);
    g.quadraticCurveTo(9, 0, 0, 14);
    g.quadraticCurveTo(-9, 0, 0, -14);
    g.fill();
    g.lineWidth = 1.2;
    g.strokeStyle = '#2a1a04';
    g.stroke();
    g.restore();
  }
  return c;
}

function* paintAll(): Job<Art> {
  const frame = yield* paintFrame();
  const paper = yield* paintPaper();
  const suit = {} as Record<Suit, HTMLCanvasElement>;
  for (const s of ['S', 'H', 'D', 'C'] as Suit[]) suit[s] = yield* paintSuit(s);
  const ace = yield* paintAce();
  const court: Record<number, HTMLCanvasElement> = {};
  court[13] = yield* paintCourt('K');
  court[12] = yield* paintCourt('Q');
  court[11] = yield* paintCourt('J');
  const back = yield* paintBack();
  RF.measure();
  return {frame, paper, suit, ace, court, back};
}

// ───────────────────────── kart çizimi ─────────────────────────
const pipDraw = (g: Ctx, s: Suit, cx: number, cy: number, size: number): void =>
  withSuit(g, s, cx, cy, size, p => {
    g.fillStyle = isRed(s) ? RED : INK;
    g.fill(p);
  });

function face(g: Ctx, w: number, h: number, s: Suit, r: number, a: Art): void {
  g.save();
  g.clip(cardPath(w, h));
  g.drawImage(a.frame, 0, 0, w, h);
  const panel = panelPath(w, h);
  g.lineJoin = 'round';
  g.lineWidth = 0.034 * w;
  g.strokeStyle = 'rgba(14,16,44,0.9)';
  g.stroke(panel);
  g.lineWidth = 0.018 * w;
  g.strokeStyle = gold(g, 0, 0, w, h);
  g.stroke(panel);
  g.save();
  g.clip(panel);
  g.drawImage(a.paper, 0, 0, w, h);
  g.restore();
  const cx = w / 2, cy = h / 2;
  if (r === 1) {
    const d = 0.78 * w;
    g.drawImage(a.ace, cx - d / 2, cy - d / 2, d, d);
    // ortada krem göbek + ebru dolgulu iri takım işareti
    const rr = 0.2 * w;
    g.beginPath();
    g.arc(cx, cy, rr, 0, Math.PI * 2);
    g.fillStyle = rad(g, cx, cy - rr * 0.3, 0, rr, [
      [0, '#fffaf0'],
      [1, '#ecdcb8'],
    ]);
    g.fill();
    g.lineWidth = 0.022 * w;
    g.strokeStyle = gold(g, cx - rr, cy - rr, cx + rr, cy + rr);
    g.stroke();
    g.lineWidth = 0.006 * w;
    g.strokeStyle = '#2a1a04';
    g.beginPath();
    g.arc(cx, cy, rr + 0.011 * w, 0, Math.PI * 2);
    g.stroke();
    const sd = (0.27 * w) / 0.84;
    g.drawImage(a.suit[s], cx - sd / 2, cy - sd / 2 + (s === 'H' ? 0.004 * w : 0), sd, sd);
  } else if (r >= 11) {
    const dw = 0.56 * w, dh = (dw * CH) / CW;
    g.drawImage(a.court[r], cx - dw / 2, cy - dh / 2, dw, dh);
    for (const sy of [-1, 1]) {
      const ey = cy + sy * (dh / 2 - 0.004 * w);
      g.beginPath();
      g.arc(cx, ey, 0.062 * w, 0, Math.PI * 2);
      g.fillStyle = '#f6ecd4';
      g.fill();
      g.lineWidth = 0.014 * w;
      g.strokeStyle = gold(g, cx - 0.06 * w, ey - 0.06 * w, cx + 0.06 * w, ey + 0.06 * w);
      g.stroke();
      pipDraw(g, s, cx, ey + 0.003 * w, 0.072 * w);
    }
  } else {
    const sz = 0.5 * w, d = sz / 0.84;
    // yumuşak gölge
    g.save();
    g.globalAlpha = 0.25;
    withSuit(g, s, cx + 0.012 * w, cy + 0.02 * w, sz, p => {
      g.fillStyle = '#3a2a10';
      g.fill(p);
    });
    g.restore();
    g.drawImage(a.suit[s], cx - d / 2, cy - d / 2, d, d);
    const capH = 0.16 * w;
    RF.draw(g, String(r), cx, cy + SUIT_TY[s] * sz - capH / 2, capH, (s === 'D' ? 0.22 : 0.26) * w, '#fbf3dc', isRed(s) ? '#4a0614' : '#060816', 0.034 * w);
  }
  corners(g, w, h, s, r, {
    font: RF,
    x: 0.2,
    top: 0.07,
    cap: 0.25,
    pip: 0.17,
    gap: 0.05,
    rank: (gg, t, x, top, cap, maxW, su) => RF.draw(gg, t, x, top, cap, maxW, isRed(su) ? RED : INK),
    pipDraw,
  });
  g.restore();
  edge(g, w, h, 'rgba(10,12,36,0.75)');
}

function back(g: Ctx, w: number, h: number, a: Art): void {
  g.save();
  const card = cardPath(w, h);
  g.clip(card);
  g.drawImage(a.back, 0, 0, w, h);
  const bw = 0.032 * w;
  g.lineWidth = bw * 2;
  g.strokeStyle = gold(g, 0, 0, w, h);
  g.stroke(card);
  g.lineWidth = 0.011 * w;
  g.strokeStyle = 'rgba(20,14,4,0.8)';
  g.stroke(cardPath(w, h, bw));
  const fi = 0.062 * w;
  g.lineWidth = Math.max(0.6, 0.007 * w);
  g.strokeStyle = 'rgba(246,214,120,0.85)';
  g.stroke(rrPath(fi, fi, w - 2 * fi, h - 2 * fi, 0.08 * w - fi * 0.8));
  g.restore();
}

export const skin = defineSkin<Art>({
  id: 'ebru',
  name: 'Ebru',
  desc: 'Suyun üstünde doğan desenler: tarak, biz ve damlayla yapılmış gerçek ebru.',
  fonts: () => loadFont(() => import('@fontsource/playfair-display/900.css'), `900 100px "Playfair Display"`),
  paint: paintAll,
  face,
  back,
});
