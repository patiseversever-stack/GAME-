// Kodla üretilmiş uçlu U-matkap (Ø25 · 4×D, WCMX trigon uçlu). Ölçüler mm; dış grup 0.01 ile
// ölçeklenir (1 birim = 100 mm). Piyasadaki SDUM tipi U-matkaplar örnek alındı:
// - Düz sap (arka yüzde Weldon düzlüğü, ön yüzde lazer markalama), küçük omuz
// - İki düz oluk; her oluğun bir yüzü düz (uç bu yüze oturur), arkası kavisli; sapa yakın
//   yerde oluk kıvrılarak biter
// - Merkez ucu bir olukta eksene yakın, çevre ucu karşı olukta dış çapta; kesme kenarları
//   ortada üst üste biner ve gövdenin geriye eğik alın yüzünden öne taşar
// - Alın yüzünde iki soğutma deliği, sap arkasında soğutma girişi
import * as THREE from 'three';
import { buildInsert as buildChipbreakerInsert, radialSurface } from '../three/tools3d';

export interface InsertPart {
  /** Uç + vidanın bağlı olduğu yuva (seat) noktası */
  seat: THREE.Group;
  /** Uçun hareket eden kısmı (havalanma, dönme) */
  insert: THREE.Group;
  screw: THREE.Group;
  /** Körelmiş kesme kenarı parıltısı (uçla birlikte döner) */
  wear: THREE.Mesh;
  /** Havalanma yönü (yuva yerel ekseninde +Z) */
  liftForward: number;
}

export interface Drill {
  /** Dış grup: sahnede bu döndürülür/ölçeklenir */
  root: THREE.Group;
  /** Ekseni +X'e çeviren iç grup (tasarım ekseni +Y) */
  frame: THREE.Group;
  /** GLB ile değiştirilebilecek gövde grubu */
  body: THREE.Group;
  inserts: InsertPart[];
  coolant: { pos: THREE.Vector3; dir: THREE.Vector3 }[];
  anchors: Record<string, THREE.Object3D>;
  materials: Record<string, THREE.MeshPhysicalMaterial | THREE.MeshBasicMaterial>;
  /** Tasarım ekseni boyunca ölçüler (mm) */
  dims: { shankEnd: number; tip: number; bodyStart: number; R: number; shankR: number };
}

const SHANK_R = 12.5; // Ø25 sap
const R = 12.5; // Ø25 delik
const A_END = -120;
const A_WELDON_0 = -114;
const A_WELDON_1 = -80;
const A_BODY0 = -41; // oluklu gövde başlangıcı (omuz bitişi)
const A_TIP = 56;
const WEB = 4.2; // oluğun düz yüzünün eksene uzaklığı (gövde özü yarı kalınlığı)
const smooth = THREE.MathUtils.smoothstep;

function latheGeo(pts: [number, number][], seg = 96) {
  return new THREE.LatheGeometry(pts.map(([r, a]) => new THREE.Vector2(r, a)), seg);
}

/** Daireden Weldon düzlüğü kesilmiş sap kesiti (düzlük y = +WELDON_FLAT) */
const WELDON_FLAT = 10.6;
function weldonShape() {
  const s = new THREE.Shape();
  const t0 = Math.asin(WELDON_FLAT / SHANK_R);
  const start = Math.PI - t0;
  const end = 2 * Math.PI + t0;
  const n = 96;
  for (let i = 0; i <= n; i++) {
    const t = start + ((end - start) * i) / n;
    const x = Math.cos(t) * SHANK_R, y = Math.sin(t) * SHANK_R;
    i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

/**
 * Gövde kesiti (eksenden yarıçap, açıya göre). Gerçek U-matkap gibi yuvarlak gövde ve iki
 * kavisli (dairesel) oluk; uca yakın bölümde uçların oturduğu düz cepler.
 * Açı θ: x = cos θ, z = sin θ. Oluk A (+Z, merkez ucu) ve oluk B (−Z, çevre ucu).
 */
const GROOVE_D = 13.2, GROOVE_R = 8.6; // oluk dairesinin eksene uzaklığı ve yarıçapı → öz kalınlığı ≈ 9,2 mm
const GROOVES = [(80 * Math.PI) / 180, (260 * Math.PI) / 180];
/** Işının bir daireye ilk giriş uzaklığı (yoksa ∞) */
function rayCircle(c: number, s: number, cx: number, cz: number, rad: number) {
  const b = c * cx + s * cz;
  const disc = b * b - (cx * cx + cz * cz - rad * rad);
  if (disc < 0) return Infinity;
  const t = b - Math.sqrt(disc);
  return t > 0 ? t : Infinity;
}
/** Uç cebi: düz taban z = ±WEB, x aralığıyla sınırlı (merkez ucu eksene yakın, çevre ucu dışta) */
const POCKETS = [
  { sign: 1, x0: -0.5, x1: 9.4 },
  { sign: -1, x0: -R - 2, x1: -3.6 },
];
function sectionR(theta: number, twist: number, pocket: number) {
  const c = Math.cos(theta), s = Math.sin(theta);
  let r = R - 0.1; // gövde sırtı: dış çaptan biraz küçük (boşluk)
  for (const g of GROOVES) {
    const a = g + twist;
    r = Math.min(r, rayCircle(c, s, Math.cos(a) * GROOVE_D, Math.sin(a) * GROOVE_D, GROOVE_R));
  }
  if (pocket > 0.001) {
    // Cep tabanı uca doğru yükselerek (kavisli çıkış) WEB düzlemine iner
    const web = WEB + (R + 2 - WEB) * (1 - pocket);
    for (const p of POCKETS) {
      const ss = s * p.sign;
      if (ss <= 0) continue;
      const t = web / ss, x = t * c;
      if (x >= p.x0 && x <= p.x1) r = Math.min(r, t);
    }
  }
  return r;
}
/** Uç burnu: dış kenarda yuvarlatma (oval alın) */
const NOSE_F = 2.6;
function noseR(d: number) {
  if (d >= NOSE_F) return Infinity;
  const k = NOSE_F - d;
  return R - NOSE_F + Math.sqrt(Math.max(0, NOSE_F * NOSE_F - k * k));
}

function torxPath(rOuter: number, rInner: number, lobes = 6) {
  const p = new THREE.Path();
  const n = lobes * 24;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const k = 0.5 + 0.5 * Math.cos(t * lobes);
    const r = rInner + (rOuter - rInner) * Math.pow(k, 0.7);
    const x = Math.cos(t) * r, y = Math.sin(t) * r;
    i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
  }
  return p;
}

function makeMaterials() {
  // Gövde: koyu antrasit (siyah oksit/nikel), oluk içleri köşe rengiyle daha koyu
  const body = new THREE.MeshPhysicalMaterial({ color: 0x5c6168, metalness: 0.95, roughness: 0.4, envMapIntensity: 1.15, vertexColors: true, clearcoat: 0.3, clearcoatRoughness: 0.4 });
  const shank = new THREE.MeshPhysicalMaterial({ color: 0xb8bdc4, metalness: 1, roughness: 0.22, envMapIntensity: 1.05 });
  const flat = new THREE.MeshPhysicalMaterial({ color: 0x8a9098, metalness: 1, roughness: 0.42 });
  const flute = new THREE.MeshPhysicalMaterial({ color: 0x4f545b, metalness: 1, roughness: 0.3 });
  const bodyPlain = new THREE.MeshPhysicalMaterial({ color: 0x5c6168, metalness: 0.95, roughness: 0.38, envMapIntensity: 1.15, clearcoat: 0.3, clearcoatRoughness: 0.4 });
  const insert = new THREE.MeshPhysicalMaterial({ color: 0xd8a64a, metalness: 1, roughness: 0.27, clearcoat: 0.25, clearcoatRoughness: 0.4, envMapIntensity: 1.25 });
  const screw = new THREE.MeshPhysicalMaterial({ color: 0x3c4046, metalness: 1, roughness: 0.36 });
  const hole = new THREE.MeshBasicMaterial({ color: 0x050506 });
  return { body, bodyPlain, shank, flat, flute, insert, screw, hole };
}

/**
 * WCMX trigon uç köşeleri: altı eşit kenar, köşeler sırayla 80° ve 160°.
 * Yerel eksen: üst kenar (iki 80° köşe arası) kesme kenarıdır, +X çevreye doğru.
 */
export function trigonVerts(ic: number) {
  // Dış açıları 20°/100° olan eşit kenarlı altıgen; ardından iç teğet daireye göre ölçekle
  const pts: THREE.Vector2[] = [];
  let x = 0, y = 0, a = 0;
  for (let i = 0; i < 6; i++) {
    pts.push(new THREE.Vector2(x, y));
    x += Math.cos(a); y += Math.sin(a);
    a += ((i % 2 === 0 ? 20 : 100) * Math.PI) / 180;
  }
  const c = pts.reduce((s, p) => s.add(p), new THREE.Vector2()).multiplyScalar(1 / 6);
  pts.forEach((p) => p.sub(c));
  let rin = Infinity;
  for (let i = 0; i < 6; i++) {
    const p = pts[i], q = pts[(i + 1) % 6];
    rin = Math.min(rin, Math.abs((q.x - p.x) * p.y - (q.y - p.y) * p.x) / p.distanceTo(q));
  }
  pts.forEach((p) => p.multiplyScalar(ic / 2 / rin));
  // 80° köşelerden ikisini üste, kesme kenarı yatay olacak şekilde döndür
  const sharp: number[] = [];
  for (let i = 0; i < 6; i++) {
    const p = pts[(i + 5) % 6], v = pts[i], q = pts[(i + 1) % 6];
    const ang = Math.acos(p.clone().sub(v).normalize().dot(q.clone().sub(v).normalize()));
    if (ang < Math.PI / 2) sharp.push(i);
  }
  const mid = pts[sharp[0]].clone().add(pts[sharp[1]]).multiplyScalar(0.5);
  const rot = Math.PI / 2 - Math.atan2(mid.y, mid.x);
  pts.forEach((p) => p.rotateAround(new THREE.Vector2(), rot));
  let area = 0;
  for (let i = 0; i < 6; i++) { const p = pts[i], q = pts[(i + 1) % 6]; area += p.x * q.y - q.x * p.y; }
  if (area < 0) pts.reverse();
  return pts;
}

const IC = 7.94, TH = 3.18;
const TRIGON = trigonVerts(IC);
const TRIGON_TOP = Math.max(...TRIGON.map((p) => p.y));
const TRIGON_W = Math.max(...TRIGON.map((p) => p.x)) - Math.min(...TRIGON.map((p) => p.x));

function buildInsert(mat: THREE.MeshPhysicalMaterial, holeMat: THREE.MeshBasicMaterial, screwMat: THREE.MeshPhysicalMaterial) {
  const g = new THREE.Group();
  // Talaş kırıcılı pozitif trigon uç (kesme kenarı bandı, oluk, plato, havşalı delik)
  const body = buildChipbreakerInsert(TRIGON, { rad: 0.8, th: TH, hole: 1.45, land: 0.4, breaker: 1.35 }, { screw: screwMat, hole: holeMat } as any, mat);
  body.position.z = -TH / 2;
  g.add(body);
  // Körelmiş kenar: üst kesme kenarı boyunca turuncu ısı izi
  const wear = new THREE.Mesh(
    new THREE.BoxGeometry(TRIGON_W * 0.62, 0.45, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xff6a12, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  wear.position.set(0, TRIGON_TOP - 0.35, TH / 2 + 0.05);
  g.add(wear);
  g.userData.wear = wear;
  return g;
}

/** Lazer markalama dokusu: koyu, yarı mat yazı; eksen boyunca akar */
function markingTexture(lines: string[]) {
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 1024;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = 'rgba(16,17,19,0.86)';
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.translate(c.width / 2, c.height / 2);
  g.rotate(-Math.PI / 2);
  g.font = '700 62px "Space Grotesk", "IBM Plex Mono", sans-serif';
  g.fillText(lines[0], 0, -34);
  g.font = '500 40px "IBM Plex Mono", ui-monospace, monospace';
  if (lines[1]) g.fillText(lines[1], 0, 30);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function buildScrew(mat: THREE.Material, holeMat: THREE.Material) {
  const g = new THREE.Group();
  const head = new THREE.Shape();
  head.absarc(0, 0, 1.75, 0, Math.PI * 2, false);
  head.holes.push(torxPath(0.9, 0.64));
  const hg = new THREE.ExtrudeGeometry(head, { depth: 0.8, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.16, bevelSegments: 2, curveSegments: 32 });
  const hm = new THREE.Mesh(hg, mat);
  hm.position.z = -0.5;
  g.add(hm);
  const recess = new THREE.Mesh(new THREE.CircleGeometry(0.8, 24), holeMat);
  recess.position.z = -0.28;
  g.add(recess);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 5.5, 20), mat);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -3.3;
  g.add(shaft);
  return g;
}

export function buildDrill(): Drill {
  const materials = makeMaterials();
  const root = new THREE.Group();
  root.name = 'drill-root';
  const frame = new THREE.Group(); // tasarım ekseni +Y → dünya +X
  frame.rotation.z = -Math.PI / 2;
  root.add(frame);
  const scaler = new THREE.Group();
  scaler.scale.setScalar(0.01);
  frame.add(scaler);
  const body = new THREE.Group();
  body.name = 'body';
  scaler.add(body);

  // Sap ucu (pahlı)
  body.add(new THREE.Mesh(latheGeo([[0, A_END], [11.6, A_END], [SHANK_R, A_END + 0.9], [SHANK_R, A_WELDON_0]]), materials.shank));
  // Weldon düzlüklü bölüm (düzlük arka yüzde: -Z)
  const wg = new THREE.ExtrudeGeometry(weldonShape(), { depth: A_WELDON_1 - A_WELDON_0, bevelEnabled: false, curveSegments: 96 });
  wg.rotateX(-Math.PI / 2);
  wg.translate(0, A_WELDON_0, 0);
  body.add(new THREE.Mesh(wg, [materials.shank, materials.shank]));
  const flatW = 2 * Math.sqrt(SHANK_R ** 2 - WELDON_FLAT ** 2) - 0.2;
  const flatPlate = new THREE.Mesh(new THREE.PlaneGeometry(flatW, A_WELDON_1 - A_WELDON_0 - 0.2), materials.flat);
  flatPlate.position.set(0, (A_WELDON_0 + A_WELDON_1) / 2, -WELDON_FLAT - 0.03);
  flatPlate.rotation.set(0, Math.PI, 0);
  body.add(flatPlate);

  // Sap devamı (parlak) ve gövdeyle aynı koyu renkte kısa omuz Ø31
  body.add(new THREE.Mesh(latheGeo([[SHANK_R, A_WELDON_1], [SHANK_R, -50.6], [0, -50.6]]), materials.shank));
  body.add(
    new THREE.Mesh(
      latheGeo([
        [0, -50.6], [SHANK_R, -50.6], [13.4, -49.6], [15.2, -48.7], [15.5, -48.1],
        [15.5, -44.6], [15.0, -44.0], [13.0, -42.2], [12.45, -41.2], [12.45, A_BODY0], [0, A_BODY0],
      ]),
      materials.bodyPlain,
    ),
  );

  // Oluklu gövde: kesit sectionR; sapa yakın bölümde oluk kıvrılarak ve sığlaşarak biter;
  // uçta dış kenarı yuvarlatılmış (oval) alın yüzü
  const RUN0 = A_BODY0 + 1.5, RUN1 = A_BODY0 + 26;
  const P0 = A_TIP - 15, P1 = A_TIP - 11.5; // uç ceplerinin başladığı bölge
  const ys = [
    ...Array.from({ length: 130 }, (_, i) => A_BODY0 + ((RUN1 - A_BODY0) * i) / 129),
    ...Array.from({ length: 6 }, (_, i) => RUN1 + ((P0 - RUN1) * (i + 1)) / 6),
    ...Array.from({ length: 70 }, (_, i) => P0 + ((P1 - P0) * (i + 1)) / 70),
    ...Array.from({ length: 4 }, (_, i) => P1 + ((A_TIP - NOSE_F - P1) * (i + 1)) / 4),
    ...Array.from({ length: 26 }, (_, i) => A_TIP - NOSE_F + (NOSE_F * (i + 1)) / 26),
  ];
  const fg = radialSurface(640, ys, (t, y) => {
    const k = smooth(y, RUN0, RUN1); // 0: oluk yok (omuz), 1: tam oluk
    const twist = (1 - k) ** 1.6 * 1.25; // oluk çıkışında kıvrılma
    const rs = sectionR(t, twist, smooth(y, P0, P1));
    const r = R - (R - rs) * k;
    return Math.min(r, noseR(A_TIP - y));
  }, false, true);
  // Köşe rengi: oluk içleri koyu, dış çap parlak, alın yüzü taşlanmış ton
  {
    const pos = fg.attributes.position;
    const nrm = fg.attributes.normal;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      const k = smooth(r, R - 2.6, R - 0.25);
      let c = 0.62 + 0.38 * k;
      if (nrm.getY(i) > 0.8 && pos.getY(i) > A_TIP - 0.01) c = 0.5; // alın yüzü: koyu taşlanmış
      col[i * 3] = c; col[i * 3 + 1] = c; col[i * 3 + 2] = c * 1.02;
    }
    fg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  body.add(new THREE.Mesh(fg, materials.body));

  // Sap ön yüzünde lazer markalama (eksen boyunca)
  const mark = new THREE.Mesh(
    new THREE.CylinderGeometry(SHANK_R + 0.03, SHANK_R + 0.03, 46, 64, 1, true, -0.5, 1.0),
    new THREE.MeshPhysicalMaterial({ map: markingTexture(['U-MATKAP Ø25 · 4×D', 'WCMX 050308 · İÇTEN SOĞUTMA']), transparent: true, depthWrite: false, metalness: 0.5, roughness: 0.65, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  mark.position.y = -101;
  body.add(mark);
  // Sap arkasında içten soğutma girişi
  const inlet = new THREE.Mesh(new THREE.CircleGeometry(3.0, 32), materials.hole);
  inlet.rotation.x = Math.PI / 2;
  inlet.position.y = A_END - 0.02;
  body.add(inlet);

  // Alın yüzünde soğutma delikleri (gövde sırtlarında, uçların yanında)
  const coolant: Drill['coolant'] = [];
  const anchors: Record<string, THREE.Object3D> = {};
  const holes: THREE.Vector3[] = [];
  for (const th of [(168 * Math.PI) / 180, (348 * Math.PI) / 180]) {
    const r = 6.6;
    const p = new THREE.Vector3(Math.cos(th) * r, A_TIP + 0.02, Math.sin(th) * r);
    holes.push(p);
    const h = new THREE.Mesh(new THREE.CircleGeometry(1.05, 28), materials.hole);
    h.position.copy(p);
    h.rotation.x = -Math.PI / 2;
    body.add(h);
    coolant.push({ pos: p.clone().add(new THREE.Vector3(0, 0.3, 0)), dir: new THREE.Vector3(Math.cos(th) * 0.05, 1, Math.sin(th) * 0.05).normalize() });
  }

  // Uçlar ve torx vidalar: merkez ucu A oluğunun düz yüzünde (z = +WEB) eksene yakın,
  // çevre ucu B oluğunun düz yüzünde (z = -WEB) dış çapta. Kesme kenarı (üst kenar) alın
  // yüzünden ~0,7 mm öne taşar; iki uç ortada üst üste biner.
  const inserts: InsertPart[] = [];
  const zSeat = WEB + TH / 2;
  const ySeat = A_TIP + 0.7 - TRIGON_TOP;
  const seats = [
    { name: 'cevre', pos: new THREE.Vector3(-(R + 0.12 - TRIGON_W / 2), ySeat, -zSeat), rot: new THREE.Euler(-0.07, Math.PI, 0.03) },
    { name: 'merkez', pos: new THREE.Vector3(TRIGON_W / 2 - 0.9, ySeat - 0.15, zSeat), rot: new THREE.Euler(0.07, 0, -0.03) },
  ];
  for (const s of seats) {
    const seat = new THREE.Group();
    seat.position.copy(s.pos);
    seat.rotation.copy(s.rot);
    scaler.add(seat);
    const ins = new THREE.Group();
    const insMesh = buildInsert(materials.insert, materials.hole, materials.screw);
    ins.add(insMesh);
    seat.add(ins);
    const screw = buildScrew(materials.screw, materials.hole);
    screw.position.z = 1.7;
    seat.add(screw);
    inserts.push({ seat, insert: ins, screw, wear: insMesh.userData.wear, liftForward: s.name === 'cevre' ? 1 : 0.6 });
    // Etiket noktası ucun kendisine bağlı: uç yerinden çıkınca etiket de onunla gider
    const a = new THREE.Object3D();
    ins.add(a);
    a.position.set(0, 0, 2);
    anchors[`insert-${s.name}`] = a;
    const sa = new THREE.Object3D();
    screw.add(sa);
    sa.position.set(0, 0, 0.5);
    anchors[`screw-${s.name}`] = sa;
  }

  // Ölçü ve etiket çapaları (tasarım ekseninde)
  const add = (name: string, x: number, a: number, z: number) => {
    const o = new THREE.Object3D();
    o.position.set(x, a, z);
    scaler.add(o);
    anchors[name] = o;
  };
  add('dia-a', R + 0.4, A_TIP + 1, 0);
  add('dia-b', -R - 0.4, A_TIP + 1, 0);
  add('len-a', R + 7, -44, 0);
  add('len-b', R + 7, A_TIP, 0);
  add('len-a0', R + 1, -44, 0);
  add('len-b0', R + 1, A_TIP, 0);
  add('shank', -SHANK_R, (A_WELDON_0 + A_WELDON_1) / 2, 4);
  add('collar', -15.5, -46, 6);
  add('cool', holes[0].x, holes[0].y + 2, holes[0].z);
  add('tip', 0, A_TIP, 0);
  add('flute', 6, 10, 8);

  return {
    root,
    frame,
    body,
    inserts,
    coolant: coolant.map((c) => ({ pos: c.pos, dir: c.dir })),
    anchors,
    materials,
    dims: { shankEnd: A_END, tip: A_TIP, bodyStart: -44, R, shankR: SHANK_R },
  };
}

/** Tasarım ekseninde (mm) bir noktayı ölçekli gruba göre yerelleştirir */
export const MM = 0.01;
