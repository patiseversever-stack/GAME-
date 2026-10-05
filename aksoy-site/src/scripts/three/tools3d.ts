// Kodla üretilmiş gerçekçi kesici takım modelleri (ölçüler mm).
// Kategori kartları ve kesme simülasyonu aynı modelleri kullanır.
// Döner takımların ekseni +Y'dir; uç (kesici taraf) y = 0'da, sap +Y yönündedir.
// Elmas uçlar XY düzleminde yatar, üst yüz +Z'dir.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const TAU = Math.PI * 2;
const V2 = (x: number, y: number) => new THREE.Vector2(x, y);
const smooth = THREE.MathUtils.smoothstep;
const clamp = THREE.MathUtils.clamp;

/* ---------------- Malzemeler ---------------- */
export type ToolMats = ReturnType<typeof toolMaterials>;
export function toolMaterials() {
  return {
    /** TiN altın kaplama (uçlar, kılavuz dişleri) */
    tin: new THREE.MeshPhysicalMaterial({ color: 0xd9a74b, metalness: 1, roughness: 0.25, clearcoat: 0.35, clearcoatRoughness: 0.32, envMapIntensity: 1.2 }),
    /** Kaplamasız karbür: mat gri, ince taşlama dokusu */
    carbide: new THREE.MeshPhysicalMaterial({ color: 0x8c929a, metalness: 1, roughness: 0.3, envMapIntensity: 1.05 }),
    /** AlTiN kaplama: koyu mor-antrasit, açıyla renk değiştiren yanardöner yüzey */
    altin: new THREE.MeshPhysicalMaterial({
      color: 0x5b5668, metalness: 1, roughness: 0.27, iridescence: 0.45, iridescenceIOR: 1.6,
      iridescenceThicknessRange: [300, 520], envMapIntensity: 1.4,
    }),
    /** TiAlN bronz-mor (matkap) */
    tialn: new THREE.MeshPhysicalMaterial({
      color: 0x7d6455, metalness: 1, roughness: 0.27, iridescence: 0.18, iridescenceIOR: 1.5,
      iridescenceThicknessRange: [420, 640], envMapIntensity: 1.35,
    }),
    /** Taşlanmış çelik sap (dairesel taşlama izleri, anizotropik parlama) */
    steel: new THREE.MeshPhysicalMaterial({ color: 0xb6bbc2, metalness: 1, roughness: 0.27, anisotropy: 0.25, envMapIntensity: 1.25 }),
    /** Parlatılmış takım tutucu çeliği */
    polished: new THREE.MeshPhysicalMaterial({ color: 0xc3c7cc, metalness: 1, roughness: 0.12, envMapIntensity: 1.0 }),
    /** Siyah oksit kater gövdesi */
    black: new THREE.MeshPhysicalMaterial({ color: 0x575c63, metalness: 0.9, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.22, envMapIntensity: 1.4 }),
    /** Vida başı */
    screw: new THREE.MeshPhysicalMaterial({ color: 0x3a3e45, metalness: 1, roughness: 0.34 }),
    /** Delik, yarık gibi karanlık boşluklar */
    hole: new THREE.MeshBasicMaterial({ color: 0x060607 }),
  };
}

/* ---------------- Yardımcılar: köşeleri yuvarlatılmış dışbükey çokgen ---------------- */

/** Saat yönünün tersine sıralı dışbükey çokgen; köşe yarıçapı rad, içe öteleme inset. */
function polyPoints(verts: THREE.Vector2[], rad: number, inset = 0, seg = 10) {
  const n = verts.length;
  const out: THREE.Vector2[] = [];
  for (let i = 0; i < n; i++) {
    const p = verts[(i + n - 1) % n], v = verts[i], q = verts[(i + 1) % n];
    const d1 = v.clone().sub(p).normalize(), d2 = q.clone().sub(v).normalize();
    const theta = Math.PI - Math.acos(clamp(d1.dot(d2), -1, 1)); // iç açı
    const bis = d2.clone().sub(d1).normalize(); // içe doğru açıortay
    const s = Math.sin(theta / 2);
    const r = Math.max(0.06, rad - inset);
    const c = v.clone().addScaledVector(bis, (inset + r) / s); // köşe yayının merkezi
    // Kenar normalleri (içe) → yayın başlangıç ve bitiş açıları
    const n1 = V2(-d1.y, d1.x), n2 = V2(-d2.y, d2.x);
    let a1 = Math.atan2(-n1.y, -n1.x), a2 = Math.atan2(-n2.y, -n2.x);
    while (a2 < a1) a2 += TAU;
    for (let k = 0; k <= seg; k++) {
      const a = a1 + ((a2 - a1) * k) / seg;
      out.push(V2(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r));
    }
  }
  return out;
}
const shapeFrom = (pts: THREE.Vector2[]) => new THREE.Shape(pts);
const pathFrom = (pts: THREE.Vector2[]) => new THREE.Path(pts);
const circlePath = (r: number, seg = 48) => { const p = new THREE.Path(); p.absarc(0, 0, r, 0, TAU, true); p.autoClose = true; return p; };

function extrude(shape: THREE.Shape, depth: number, z0: number, bevel = 0, curveSegments = 12) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, depth - bevel * 2), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 3, curveSegments,
  });
  g.translate(0, 0, z0 + bevel);
  return g;
}

/* ---------------- Elmas uç (talaş kırıcılı) ---------------- */
interface InsertOpts { rad: number; th: number; hole: number; land?: number; breaker?: number }
/**
 * Üst yüzde: dış kesme kenarı (land) tam yükseklikte, arkasında talaş kırıcı oluğu (daha alçak),
 * ortada hafif yükseltilmiş plato ve havşalı vida deliği.
 */
export function buildInsert(verts: THREE.Vector2[], o: InsertOpts, m: ToolMats, mat = m.tin) {
  const g = new THREE.Group();
  const { rad, th, hole } = o;
  const land = o.land ?? 0.55, breaker = o.breaker ?? 1.9;
  const b = 0.1; // kenar honlama
  const groove = 0.28;
  // Gövde (üst yüzü oluk tabanı)
  const body = shapeFrom(polyPoints(verts, rad, b));
  body.holes.push(circlePath(hole + 0.75));
  const geos: THREE.BufferGeometry[] = [extrude(body, th - groove, 0, b)];
  // Kesme kenarı bandı
  const ring = shapeFrom(polyPoints(verts, rad, b));
  ring.holes.push(pathFrom(polyPoints(verts, rad, land).reverse()));
  geos.push(extrude(ring, groove + 0.04, th - groove - 0.04, 0.03));
  // Plato
  const plate = shapeFrom(polyPoints(verts, rad, breaker));
  plate.holes.push(circlePath(hole + 0.95));
  geos.push(extrude(plate, groove - 0.02, th - groove - 0.04, 0.04));
  g.add(new THREE.Mesh(mergeGeometries(geos), mat));
  // Vida deliği: havşa konisi ve karanlık iç
  const cs = new THREE.Mesh(new THREE.CylinderGeometry(hole + 0.95, hole, 0.9, 40, 1, true), m.screw);
  cs.rotation.x = Math.PI / 2;
  cs.position.z = th - groove - 0.45;
  g.add(cs);
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(hole, hole, th, 32, 1, true), m.hole);
  bore.rotation.x = Math.PI / 2;
  bore.position.z = th / 2 - 0.4;
  g.add(bore);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(hole, 32), m.hole);
  cap.position.z = 0.3;
  g.add(cap);
  g.userData.th = th;
  return g;
}

/** CNMG 120408: 80° eşkenar dörtgen, iç teğet daire 12,7 mm, kalınlık 4,76 mm, köşe R0,8 */
export function cnmgVerts() {
  const s = 12.7 / Math.sin((80 * Math.PI) / 180);
  const a = s * Math.cos((40 * Math.PI) / 180), b = s * Math.sin((40 * Math.PI) / 180);
  return [V2(a, 0), V2(0, b), V2(-a, 0), V2(0, -b)];
}
export function buildCNMG(m: ToolMats, mat = m.tin) {
  return buildInsert(cnmgVerts(), { rad: 0.8, th: 4.76, hole: 2.6, land: 0.6, breaker: 2.3 }, m, mat);
}

/** 16ER diş çekme ucu: üçgen, köşelerde 60° diş profili ve iki yanında boşaltma kanalı */
export function buildThreadInsert(m: ToolMats, mat = m.tin) {
  const g = new THREE.Group();
  const th = 3.5;
  const side = 9.525 * Math.sqrt(3);
  const cr = side / Math.sqrt(3); // çevrel yarıçap
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * TAU) / 3;
    const v = V2(Math.cos(a) * cr, Math.sin(a) * cr);
    const prev = V2(Math.cos(a - TAU / 3) * cr, Math.sin(a - TAU / 3) * cr);
    const next = V2(Math.cos(a + TAU / 3) * cr, Math.sin(a + TAU / 3) * cr);
    const dIn = v.clone().sub(prev).normalize(); // köşeye gelen kenar yönü
    const dOut = next.clone().sub(v).normalize();
    const nIn = V2(-dIn.y, dIn.x), nOut = V2(-dOut.y, dOut.x); // içe normaller
    // Köşeye yaklaşırken: kenar → kanal (içeri girinti) → diş tabanı → 60° diş ucu
    const along = (d: THREE.Vector2, n: THREE.Vector2, t: number, k: number) => v.clone().addScaledVector(d, t).addScaledVector(n, k);
    pts.push(along(dIn, nIn, -4.6, 0), along(dIn, nIn, -4.1, 0.6), along(dIn, nIn, -3.0, 0.6), along(dIn, nIn, -2.6, 0.04));
    // Diş ucu (küçük düzlük)
    const tip = v.clone();
    const bis = dOut.clone().sub(dIn).normalize();
    pts.push(tip.clone().addScaledVector(dIn, -0.18).addScaledVector(bis, 0.05), tip.clone().addScaledVector(dOut, 0.18).addScaledVector(bis, 0.05));
    pts.push(along(dOut, nOut, 2.6, 0.04), along(dOut, nOut, 3.0, 0.6), along(dOut, nOut, 4.1, 0.6), along(dOut, nOut, 4.6, 0));
  }
  const shape = shapeFrom(pts);
  shape.holes.push(circlePath(2.0));
  const body = extrude(shape, th - 0.2, 0, 0.1, 8);
  g.add(new THREE.Mesh(body, mat));
  // Üst yüzde talaş kırıcı işaretleri: her dişin arkasında hafif çukur (koyu bant)
  const plate = shapeFrom(polyPoints([0, 1, 2].map((i) => { const a = Math.PI / 2 + (i * TAU) / 3; return V2(Math.cos(a) * cr * 0.62, Math.sin(a) * cr * 0.62); }), 1.2, 0));
  plate.holes.push(circlePath(2.9));
  g.add(new THREE.Mesh(extrude(plate, 0.22, th - 0.2, 0.05), mat));
  const cs = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.0, 0.8, 40, 1, true), m.screw);
  cs.rotation.x = Math.PI / 2;
  cs.position.z = th - 0.5;
  g.add(cs);
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, th, 32, 1, true), m.hole);
  bore.rotation.x = Math.PI / 2;
  bore.position.z = th / 2 - 0.4;
  g.add(bore);
  g.userData.th = th;
  return g;
}

/* ---------------- Kater (torna ve kanal) ---------------- */

/** Dış çap torna kateri (PCLNR benzeri) + CNMG uç + üst bağlama pabucu. Uç ucu orijinde, kater -X'e uzanır. */
export function buildTurningHolder(m: ToolMats, insertMat = m.tin) {
  const g = new THREE.Group();
  const H = 20, W = 20;
  // Gövde: üstten görünüş profili (XZ), Y yönünde kalınlık
  const prof = new THREE.Shape([V2(-110, -W / 2), V2(-24, -W / 2), V2(-8, -6), V2(-1.2, -3.2), V2(1.0, 0.2), V2(-3, 6), V2(-14, W / 2), V2(-110, W / 2)]);
  const bodyGeo = new THREE.ExtrudeGeometry(prof, { depth: H - 1, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2 });
  bodyGeo.rotateX(Math.PI / 2); // profil XZ düzlemine; kalınlık -Y
  bodyGeo.translate(0, -1.6, 0);
  g.add(new THREE.Mesh(bodyGeo, m.black));
  // Altlık (shim) ve uç: uç üst yüzü y=0 civarında, köşesi uca bakar
  const ins = buildCNMG(m, insertMat);
  const corner = cnmgVerts()[0];
  ins.rotation.x = -Math.PI / 2; // üst yüz +Y
  const holderPivot = new THREE.Group();
  holderPivot.add(ins);
  ins.position.set(-corner.x, -4.76 + 0.2, 0);
  holderPivot.rotation.y = (5 * Math.PI) / 180; // 95° yanaşma açısı
  g.add(holderPivot);
  // Bağlama pabucu ve vidası
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(11, 3.2, 7, 2, 1, 1), m.black);
  clamp.position.set(-12.5, 1.5, 0.2);
  clamp.rotation.z = 0.06;
  g.add(clamp);
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 1.8, 24), m.screw);
  screw.position.set(-14.5, 3.6, 0.2);
  g.add(screw);
  const torx = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.3, 6), m.hole);
  torx.position.set(-14.5, 4.55, 0.2);
  g.add(torx);
  g.userData.insert = ins;
  return g;
}

/**
 * MGEHR 2020-3 kanal kateri + MGMN300 kanal ucu (ölçüler katalog oranlarında).
 * Uç ön kesme köşesi orijinde, kesme kenarı yüksekliği = sap üst yüzü (y = 0); kater -X'e uzanır.
 * İnce bıçak (2,4 mm) ucun genişliğinden (3 mm) dardır: uç boydan boya yanlardan görünür.
 * Bıçak sapın +Z yan yüzüne hizalıdır (aynaya yakın kanal için).
 */
export function buildGroovingHolder(m: ToolMats, insertMat = m.tin) {
  const g = new THREE.Group();
  const zb = 8.6; // bıçak/uç orta düzlemi
  const shank = new THREE.Mesh(new RoundedBoxGeometry(86, 20, 20, 4, 1.4), m.black);
  shank.position.set(-82, -10, 0);
  g.add(shank);
  const head = new THREE.Mesh(new RoundedBoxGeometry(25, 28, 20, 4, 1.6), m.black);
  head.position.set(-34.5, -6, 0);
  g.add(head);
  // Bıçak (yan profil): alt çene ucu taşır, üst çene ucun arka yarısını V sırtıyla sıkar,
  // ucun arkasında esneme yarığı kalır.
  const blade = new THREE.Shape([
    V2(-24, -20), V2(-12.5, -20), V2(-4.4, -10.8), V2(-2.6, -5.95), V2(-23.2, -5.95), V2(-23.2, -0.25),
    V2(-11.6, -0.72), V2(-10, -1.02), V2(-8.6, -0.78), V2(-11.4, 5.4), V2(-17.5, 7.6), V2(-24, 8),
  ]);
  const bladeGeo = new THREE.ExtrudeGeometry(blade, { depth: 2.0, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 3 });
  bladeGeo.translate(0, 0, zb - 1.0);
  g.add(new THREE.Mesh(bladeGeo, m.black));
  // Esneme yarığı başlık yan yüzünde devam eder
  const slit = new THREE.Mesh(new THREE.BoxGeometry(15, 0.5, 0.3), m.hole);
  slit.position.set(-29.5, -0.45, 10.02);
  g.add(slit);
  // Sıkma vidası (başlığın yan yüzünde, üst çeneyi çeker)
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 1.6, 36), m.screw);
  screw.rotation.x = Math.PI / 2;
  screw.position.set(-33, 3.4, 10.6);
  g.add(screw);
  const tx = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.4, 6), m.hole);
  tx.rotation.x = Math.PI / 2;
  tx.position.set(-33, 3.4, 11.3);
  g.add(tx);
  // MGMN300: boy 20, genişlik 3, yükseklik ~5,9 mm; iki uçlu, uçlarda 7° boşluk ve talaş kırıcı,
  // ortada üst çenenin oturduğu V yuvası.
  const ins = new THREE.Shape([
    V2(0, 0), V2(-0.72, -5.9), V2(-19.28, -5.9), V2(-20, 0),
    V2(-19.6, 0), V2(-18.8, -0.36), V2(-17.8, -0.12), V2(-15.4, -0.52), V2(-10, -1.02), V2(-4.6, -0.52), V2(-2.2, -0.12), V2(-1.2, -0.36), V2(-0.4, 0),
  ]);
  const insGeo = new THREE.ExtrudeGeometry(ins, { depth: 2.84, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 });
  insGeo.translate(0, 0, zb - 1.42);
  const insert = new THREE.Mesh(insGeo, insertMat);
  g.add(insert);
  g.userData.insert = insert;
  return g;
}

/* ---------------- Döner takımlar: parametrik yüzey ---------------- */

/**
 * Ekseni +Y olan, yarıçapı r(θ, y) fonksiyonuyla verilen kapalı yüzey.
 * capStart: y0'da düz kapak (frezenin alın yüzü) eklenir.
 */
export function radialSurface(nT: number, ys: number[], r: (t: number, y: number) => number, capStart = false, capEnd = false) {
  const nY = ys.length;
  const extra = (capStart ? nT + 1 : 0) + (capEnd ? nT + 1 : 0); // kapaklar için ayrı köşeler (keskin kenar)
  const pos = new Float32Array((nT * nY + extra) * 3);
  const uv = new Float32Array((nT * nY + extra) * 2);
  for (let j = 0; j < nY; j++) {
    const y = ys[j];
    for (let i = 0; i < nT; i++) {
      const t = (i / nT) * TAU;
      const rr = Math.max(0, r(t, y));
      const k = (j * nT + i) * 3;
      pos[k] = Math.cos(t) * rr; pos[k + 1] = y; pos[k + 2] = Math.sin(t) * rr;
      uv[(j * nT + i) * 2] = i / nT; uv[(j * nT + i) * 2 + 1] = j / (nY - 1);
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < nY - 1; j++) {
    for (let i = 0; i < nT; i++) {
      const a = j * nT + i, b = j * nT + ((i + 1) % nT), c = (j + 1) * nT + i, d = (j + 1) * nT + ((i + 1) % nT);
      idx.push(a, c, b, b, c, d);
    }
  }
  if (capStart) {
    const base = nT * nY, ci = base + nT;
    for (let i = 0; i < nT; i++) for (let a = 0; a < 3; a++) pos[(base + i) * 3 + a] = pos[i * 3 + a];
    // Alın yüzü hafif içbükey (gerçek frezede merkez geride): düz "tıpa" görünümünü kırar
    pos[ci * 3] = 0; pos[ci * 3 + 1] = ys[0] + 0.22; pos[ci * 3 + 2] = 0;
    for (let i = 0; i < nT; i++) idx.push(ci, base + i, base + ((i + 1) % nT));
  }
  if (capEnd) {
    // Son satırın kopyası + merkez: düz alın yüzü (kenarı kesitle birebir, tırtıksız)
    const base = nT * nY + (capStart ? nT + 1 : 0), ci = base + nT, last = (nY - 1) * nT;
    for (let i = 0; i < nT; i++) for (let a = 0; a < 3; a++) pos[(base + i) * 3 + a] = pos[(last + i) * 3 + a];
    pos[ci * 3] = 0; pos[ci * 3 + 1] = ys[nY - 1]; pos[ci * 3 + 2] = 0;
    for (let i = 0; i < nT; i++) idx.push(ci, base + ((i + 1) % nT), base + i);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

const range = (a: number, b: number, n: number, ease?: (u: number) => number) =>
  Array.from({ length: n + 1 }, (_, i) => a + (b - a) * (ease ? ease(i / n) : i / n));

/** Oluk kesiti: z oluk, her biri açısal genişlik w; rake (kesme) yüzü dik, sırt tarafı kavisli. */
function fluteDepth(phi: number, z: number, w: number) {
  const seg = TAU / z;
  let u = (((phi % seg) + seg) % seg) / seg; // 0..1 bir ağız periyodu
  // Periyodun başında oluk: u ∈ [0, w]
  if (u > w) return { d: 0, land: (u - w) / (1 - w) };
  u = u / w; // 0 rake tarafı → 1 sırt tarafı
  const d = u < 0.18 ? Math.sqrt(1 - Math.pow(1 - u / 0.18, 2)) : Math.pow(Math.sin(((1 - u) / 0.82) * Math.PI / 2), 0.75);
  return { d, land: -1 };
}

/** Karbür parmak freze (Z ağız, helis açısı derece). Uç y=0. */
export function buildEndMill(m: ToolMats, o: { D?: number; z?: number; helix?: number; Lf?: number; L?: number; mat?: THREE.Material } = {}) {
  const D = o.D ?? 10, z = o.z ?? 4, helix = ((o.helix ?? 38) * Math.PI) / 180, Lf = o.Lf ?? 22, L = o.L ?? 72;
  const R = D / 2;
  const depth = R * (z <= 2 ? 0.52 : z === 3 ? 0.42 : 0.36);
  const w = z <= 2 ? 0.62 : 0.55;
  const twist = Math.tan(helix) / R; // rad/mm
  const g = new THREE.Group();
  const ys = [...range(0, 0.6, 4), ...range(0.6, Lf + 5, 220).slice(1)];
  const geo = radialSurface(z <= 2 ? 180 : 200, ys, (t, y) => {
    const phi = t + y * twist;
    const f = fluteDepth(phi, z, w);
    const run = 1 - smooth(y, Lf, Lf + 5); // oluk çıkışı
    let r = R;
    if (f.d > 0) r = R - depth * f.d * run;
    else r = R - 0.06 - 0.12 * Math.max(0, f.land - 0.15) * run; // kenar payı + boşluk açısı
    if (y < 0.6) r = Math.min(r, R - 0.35 + y * 0.58); // köşe pahı
    return r;
  }, true);
  g.add(new THREE.Mesh(geo, o.mat ?? m.altin));
  // Sap
  const shank = new THREE.LatheGeometry([V2(R - 0.02, Lf + 5), V2(R - 0.02, L - 0.6), V2(R - 0.6, L), V2(0, L)], 96);
  g.add(new THREE.Mesh(shank, m.carbide)); // karbür sap (taşlanmış h6)
  g.userData.length = L;
  return g;
}

/** Karbür matkap: 2 oluk, 140° uç, içten soğutma delikleri. Uç y=0. */
export function buildDrill(m: ToolMats, o: { D?: number; Lf?: number; L?: number; mat?: THREE.Material } = {}) {
  const D = o.D ?? 10, Lf = o.Lf ?? 46, L = o.L ?? 90, R = D / 2;
  const twist = Math.tan((30 * Math.PI) / 180) / R;
  const tipK = Math.tan((70 * Math.PI) / 180); // 140° uç: r ≤ y·tan70°
  const g = new THREE.Group();
  const ys = [...range(0, R / tipK + 0.2, 40, (u) => u * u * 0.6 + u * 0.4), ...range(R / tipK + 0.2, Lf + 6, 240).slice(1)];
  const geo = radialSurface(200, ys, (t, y) => {
    const phi = t + y * twist;
    const f = fluteDepth(phi, 2, 0.47);
    const run = 1 - smooth(y, Lf, Lf + 6);
    let r = R;
    if (f.d > 0) r = R - R * 0.74 * f.d * run;
    else r = f.land < 0.16 ? R : R - 0.22 * run; // pah (margin) ve gövde boşluğu
    return Math.min(r, y * tipK);
  });
  g.add(new THREE.Mesh(geo, o.mat ?? m.tialn));
  const shank = new THREE.LatheGeometry([V2(R - 0.02, Lf + 6), V2(R - 0.02, L - 0.6), V2(R - 0.6, L), V2(0, L)], 96);
  g.add(new THREE.Mesh(shank, m.carbide));
  // Soğutma delikleri: uç yüzeyinde iki küçük koyu delik (açıyla birlikte döner)
  for (const s of [0, Math.PI]) {
    const r = R * 0.55, y = r / tipK - 0.04;
    const a = s + 0.76 * Math.PI - y * twist; // sırt (flank) yüzeyinin ortası
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), m.hole);
    hole.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    const nrm = new THREE.Vector3(Math.cos(a), -tipK, Math.sin(a)).normalize(); // koni yüzey normali
    hole.lookAt(hole.position.clone().add(nrm));
    g.add(hole);
  }
  g.userData.length = L;
  return g;
}

/** Makine kılavuzu M10×1,5: 3 helis oluk, 60° diş, uç pahı, kare sürücü. Uç y=0. */
export function buildTap(m: ToolMats, o: { D?: number; P?: number; mat?: THREE.Material } = {}) {
  const D = o.D ?? 10, P = o.P ?? 1.5, R = D / 2;
  const h = 0.6134 * P, Rmin = R - h;
  const Lth = 20, Lf = 24, Lneck = 30, L = 80;
  const twist = Math.tan((35 * Math.PI) / 180) / R;
  const chamfer = 3 * P;
  const g = new THREE.Group();
  const ys = range(0, Lf + 3, 480);
  const geo = radialSurface(200, ys, (t, y) => {
    // Diş: sağ el helis, 60° üçgen profil, tepe ve dipte küçük düzlük
    const u = (((y / P - t / TAU) % 1) + 1) % 1;
    const tri = Math.min(1, Math.max(0, 1.15 - Math.abs(u - 0.5) * 2.3));
    let r = Rmin + h * tri;
    if (y < chamfer) r = Math.min(r, Rmin + 0.15 + (R - Rmin) * (y / chamfer));
    const fade = smooth(y, Lth - 0.5, Lth + 2.5); // diş bitişi → gövde
    r = r * (1 - fade) + (Rmin + 0.05) * fade;
    // Oluklar
    const phi = t + y * twist;
    const f = fluteDepth(phi, 3, 0.36);
    const run = 1 - smooth(y, Lf, Lf + 3);
    if (f.d > 0) r = Math.min(r, R - (R * 0.62) * f.d * run);
    return r;
  });
  g.add(new THREE.Mesh(geo, o.mat ?? m.tin));
  // Boyun, sap ve kare sürücü
  const neck = new THREE.LatheGeometry([V2(Rmin + 0.05, Lf + 3), V2(Rmin - 0.6, Lf + 5), V2(Rmin - 0.6, Lneck + 4), V2(R - 0.8, Lneck + 6), V2(R - 0.8, L - 8), V2(0, L - 8)], 72);
  g.add(new THREE.Mesh(neck, m.steel));
  const sq = new THREE.Mesh(new THREE.BoxGeometry(D * 0.58, 8, D * 0.58), m.steel);
  sq.position.y = L - 4;
  g.add(sq);
  g.userData.length = L;
  return g;
}

/** BT40 ER32 pens tutucu (+ çektirme civatası), içinde Ø10 freze. Eksen +Y, freze ucu y=0. */
export function buildBT40(m: ToolMats, withTool = true) {
  const g = new THREE.Group();
  const off = 34; // freze tutucudan dışarı taşan boy
  const p = (r: number, y: number) => V2(r, y + off);
  const prof = [
    p(0, 0), p(5.6, 0), p(6.2, 0.6), p(15.5, 1.0), p(16.5, 0.2), p(24.2, 0.2), p(25.2, 1.2), p(25.2, 18.5), p(24.4, 19.4), // somun
    p(23.8, 20.2), p(23.2, 21.0), p(23.0, 52), // gövde
    p(26.5, 53.5), p(31.75, 55), p(31.75, 60.5), p(28.4, 63.4), p(31.75, 66.3), p(31.75, 71.5), p(29, 72.5), p(24.8, 72.5), // flanş + V kanal
    p(22.25, 74), p(12.6, 139), p(11.2, 140), // 7/24 konik
    p(8.6, 140), p(8.6, 146), p(7.2, 147), p(7.2, 150), p(5.6, 151.6), p(5.6, 156), p(8.5, 158), p(8.5, 165), p(7.4, 166.5), p(0, 166.5), // çektirme civatası
  ];
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 128), m.polished));
  // Flanş sürücü kanalları ve somun anahtar yuvaları (koyu)
  for (const s of [-1, 1]) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(16.2, 17.4, 3.2), m.hole);
    slot.position.set(s * 30.4, off + 64, 0);
    slot.rotation.y = Math.PI / 2;
    g.add(slot);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const n = new THREE.Mesh(new THREE.BoxGeometry(3.4, 5, 2.2), m.hole);
    n.position.set(Math.cos(a) * 24.6, off + 10, Math.sin(a) * 24.6);
    n.rotation.y = -a;
    g.add(n);
  }
  // Pens yarıkları (somun alnında)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const s = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.3, 0.7), m.hole);
    s.position.set(Math.cos(a) * 10.5, off + 0.82, Math.sin(a) * 10.5);
    s.rotation.y = -a;
    g.add(s);
  }
  if (withTool) g.add(buildEndMill(m, { D: 10, z: 4, Lf: 22, L: off + 30 }));
  g.userData.length = off + 166.5;
  return g;
}

/* ---------------- Katalog modelleri ---------------- */
import type { ModelKind } from './models-map';
export type { ModelKind };

export function buildModel(kind: ModelKind, m: ToolMats) {
  switch (kind) {
    case 'cnmg': return buildCNMG(m);
    case 'groove': return buildGroovingHolder(m);
    case 'thread': return buildThreadInsert(m);
    case 'endmill': return buildEndMill(m);
    case 'drill': return buildDrill(m);
    case 'tap': return buildTap(m);
    case 'bt40': return buildBT40(m);
  }
}
