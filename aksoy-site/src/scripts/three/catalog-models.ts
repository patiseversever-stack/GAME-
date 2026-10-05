// Katalog ürün görselleri için 3D modeller (ölçüler mm). Her ürün türü için gerçek katalog
// oranlarında bir model üretir; scripts/render-products.mjs bunları stüdyo ışığında çizip
// public/img/urun/<anahtar>.webp olarak kaydeder.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  toolMaterials, buildInsert, buildThreadInsert, buildGroovingHolder, buildEndMill, buildDrill, buildTap, buildBT40, radialSurface,
  type ToolMats,
} from './tools3d';
import { buildDrill as buildUDrill, trigonVerts } from '../showcase/model';

const TAU = Math.PI * 2;
const V2 = (x: number, y: number) => new THREE.Vector2(x, y);
const smooth = THREE.MathUtils.smoothstep;
const lathe = (pts: [number, number][], seg = 96) => new THREE.LatheGeometry(pts.map(([r, y]) => V2(r, y)), seg);

/* ======================= Elmas uç şekilleri (ISO 1832) ======================= */
export type InsertShape = 'C' | 'D' | 'V' | 'S' | 'T' | 'W' | 'R' | 'A';
type Shape = InsertShape;
/** Eşkenar dörtgen: keskin köşe açısı α, iç teğet daire IC. Köşe 0 = keskin köşe (+X). */
function rhombus(alphaDeg: number, ic: number) {
  const a = (alphaDeg * Math.PI) / 180;
  const s = ic / Math.sin(a);
  const hx = s * Math.cos(a / 2), hy = s * Math.sin(a / 2);
  return [V2(hx, 0), V2(0, hy), V2(-hx, 0), V2(0, -hy)];
}
export function regular(n: number, ic: number, rot = 0) {
  const R = ic / 2 / Math.cos(Math.PI / n);
  return Array.from({ length: n }, (_, i) => { const a = rot + (i * TAU) / n; return V2(Math.cos(a) * R, Math.sin(a) * R); });
}
/** APMT benzeri paralelkenar: kesme kenarı L, genişlik w, köşe açısı 85° */
export function parallelogram(L: number, w: number, deg = 85) {
  const k = w / Math.tan((deg * Math.PI) / 180);
  const pts = [V2(0, 0), V2(L, 0), V2(L + k, w), V2(k, w)];
  const c = V2((L + k) / 2, w / 2);
  return pts.map((p) => p.sub(c));
}
interface InsertSpec { verts: THREE.Vector2[]; th: number; hole: number; rad: number; clearance: number; land?: number; breaker?: number }
function insertSpec(shape: Shape, positive: boolean): InsertSpec {
  const clr = positive ? (7 * Math.PI) / 180 : 0;
  switch (shape) {
    case 'C': return positive ? { verts: rhombus(80, 9.525), th: 3.97, hole: 2.2, rad: 0.4, clearance: clr } : { verts: rhombus(80, 12.7), th: 4.76, hole: 2.6, rad: 0.8, clearance: 0 };
    case 'D': return positive ? { verts: rhombus(55, 9.525), th: 3.97, hole: 2.2, rad: 0.4, clearance: clr } : { verts: rhombus(55, 12.7), th: 4.76, hole: 2.6, rad: 0.8, clearance: 0 };
    case 'V': return { verts: rhombus(35, 9.525), th: 4.76, hole: 2.0, rad: positive ? 0.4 : 0.8, clearance: clr, land: 0.45, breaker: 1.5 };
    case 'S': return { verts: regular(4, 12.7, Math.PI / 4), th: 4.76, hole: 2.6, rad: 0.8, clearance: positive ? (20 * Math.PI) / 180 : 0 };
    case 'T': return positive ? { verts: regular(3, 9.525), th: 3.97, hole: 2.0, rad: 0.4, clearance: clr, land: 0.45, breaker: 1.4 } : { verts: regular(3, 9.525), th: 4.76, hole: 1.9, rad: 0.8, clearance: 0, land: 0.5, breaker: 1.5 };
    case 'W': return { verts: trigonVerts(12.7), th: 4.76, hole: 2.6, rad: 0.8, clearance: clr };
    case 'R': return { verts: regular(72, 12), th: 4.76, hole: 2.1, rad: 0.2, clearance: clr || (7 * Math.PI) / 180, land: 0.7, breaker: 1.6 };
    case 'A': return { verts: parallelogram(11, 6.8), th: 3.5, hole: 1.4, rad: 0.8, clearance: (11 * Math.PI) / 180, land: 0.45, breaker: 1.25 };
  }
}
/** Pozitif uçta yan yüzler aşağı doğru içe eğilir (boşluk açısı) */
export function applyClearance(g: THREE.Object3D, th: number, angle: number, minR: number) {
  if (!angle) return;
  const t = Math.tan(angle);
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const r = Math.hypot(x, y);
      if (r < minR) continue;
      const k = Math.max(0, 1 - ((th - z) * t) / r);
      pos.setXY(i, x * k, y * k);
    }
    pos.needsUpdate = true;
    m.geometry.computeVertexNormals();
  });
}
export function buildIsoInsert(m: ToolMats, shape: Shape, positive: boolean, mat = m.tin) {
  const sp = insertSpec(shape, positive);
  const g = buildInsert(sp.verts, { rad: sp.rad, th: sp.th, hole: sp.hole, land: sp.land, breaker: sp.breaker }, m, mat);
  const ic = Math.min(...sp.verts.map((p, i) => { const q = sp.verts[(i + 1) % sp.verts.length]; return Math.abs((q.x - p.x) * p.y - (q.y - p.y) * p.x) / p.distanceTo(q); }));
  applyClearance(g, sp.th, sp.clearance, ic * 0.78);
  g.userData.spec = sp;
  return g;
}
/** En keskin köşenin indeksi */
function sharpest(v: THREE.Vector2[]) {
  let best = 0, ang = Infinity;
  v.forEach((p, i) => {
    const a = v[(i + v.length - 1) % v.length].clone().sub(p).normalize(), b = v[(i + 1) % v.length].clone().sub(p).normalize();
    const t = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1));
    if (t < ang - 1e-6) { ang = t; best = i; }
  });
  return best;
}

/* ======================= Katerler ve baralar ======================= */
/** Dış çap kateri (P/M/S tipi): uç yuvasında, keskin köşesi ön-yan köşede; üstte bağlama. */
export function buildExtHolder(m: ToolMats, shape: Shape, positive = false) {
  const g = new THREE.Group();
  const H = 25, W = 25;
  const prof = new THREE.Shape([V2(-100, -W / 2), V2(-34, -W / 2), V2(-14, -9), V2(-2.4, -4.6), V2(0.8, -0.6), V2(-1.5, 7.5), V2(-18, W / 2), V2(-100, W / 2)]);
  const body = new THREE.ExtrudeGeometry(prof, { depth: H - 1.2, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 3 });
  body.rotateX(Math.PI / 2);
  body.translate(0, -1.8, 0);
  g.add(new THREE.Mesh(body, m.black));
  // Altlık (shim): uçtan biraz küçük, koyu karbür
  const ins = buildIsoInsert(m, shape, positive);
  const sp = ins.userData.spec as InsertSpec;
  const vi = sharpest(sp.verts);
  const tip = sp.verts[vi];
  const bis = sp.verts[(vi + sp.verts.length - 1) % sp.verts.length].clone().sub(tip).normalize().add(sp.verts[(vi + 1) % sp.verts.length].clone().sub(tip).normalize()).normalize();
  // Köşe orijinde; açıortay gövdeye doğru (dünyada −X, hafif +Z) bakar.
  // piv: yerel (x, y, z) → dünya (x, z, −y); yani yerel açıortay (−1, −0,15) olmalı.
  const piv = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(ins);
  ins.position.set(-tip.x, -tip.y, 0);
  const theta = Math.atan2(-0.15, -1) - Math.atan2(bis.y, bis.x);
  inner.rotation.z = theta;
  piv.add(inner);
  piv.rotation.x = -Math.PI / 2; // üst yüz +Y
  piv.position.y = -sp.th + 0.25;
  g.add(piv);
  // Ucun merkezi (dünya XZ): bağlama pabucu buraya basar
  const cLoc = V2(-tip.x, -tip.y).rotateAround(V2(0, 0), theta);
  const cx = cLoc.x, cz = -cLoc.y;
  // Altlık (shim): uçtan biraz küçük, koyu karbür
  const shim = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape(sp.verts.map((p) => p.clone().multiplyScalar(0.93))), { depth: 3.2, bevelEnabled: false }), m.carbide);
  shim.position.set(-tip.x, -tip.y, -3.2);
  inner.add(shim);
  if (positive) {
    // Vidalı bağlama (torx vida başı)
    const sc = new THREE.Mesh(new THREE.CylinderGeometry(sp.hole + 0.7, sp.hole + 0.7, 0.9, 32), m.screw);
    sc.rotation.x = Math.PI / 2;
    sc.position.set(-tip.x, -tip.y, sp.th - 0.2);
    inner.add(sc);
    const tx = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 6), m.hole);
    tx.rotation.x = Math.PI / 2;
    tx.position.set(-tip.x, -tip.y, sp.th + 0.27);
    inner.add(tx);
  } else {
    // Üstten pabuç (P tipi kol) ve vidası
    // Pabuç ucun deliğine basar, arkada vidayla sıkılır
    const cl = new THREE.Mesh(new RoundedBoxGeometry(15, 3.4, 8.5, 3, 0.9), m.black);
    cl.position.set(cx - 6.5, 1.75, cz);
    cl.rotation.set(0, Math.atan2(-cz, 6.5) * 0, 0.06);
    g.add(cl);
    const sc = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 1.8, 28), m.screw);
    sc.position.set(cx - 9.5, 3.8, cz);
    g.add(sc);
    const tx = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.3, 6), m.hole);
    tx.position.set(cx - 9.5, 4.75, cz);
    g.add(tx);
  }
  return g;
}

/** İç çap barası: Ø20 silindirik sap (bağlama düzlüğü), açılı baş, vidalı pozitif uç */
export function buildBoringBar(m: ToolMats, shape: Shape) {
  const g = new THREE.Group();
  const D = 20, L = 150;
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(D / 2, D / 2, L, 96, 1, false), m.black);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(-L / 2 - 6, -D / 2 + 3, 0);
  g.add(bar);
  const flat = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.6, 7), m.steel);
  flat.position.set(-L * 0.62, -D / 2 + 3, -D / 2 + 0.6);
  flat.rotation.y = Math.PI;
  g.add(flat);
  // Baş: uç yuvası için yontulmuş uç
  const head = new THREE.Shape([V2(-14, -9), V2(-5, -9), V2(0.6, -2), V2(0.6, 1), V2(-4, 6), V2(-14, 7)]);
  const hg = new THREE.ExtrudeGeometry(head, { depth: 14, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2 });
  hg.rotateX(Math.PI / 2);
  hg.translate(-0.5, 0.6, 0);
  g.add(new THREE.Mesh(hg, m.black));
  const ins = buildIsoInsert(m, shape, true);
  const sp = ins.userData.spec as InsertSpec;
  const vi = sharpest(sp.verts), tip = sp.verts[vi];
  const inner = new THREE.Group();
  ins.position.set(-tip.x, -tip.y, 0);
  inner.add(ins);
  inner.rotation.z = shape === 'D' ? 2.75 : 2.55;
  const sc = new THREE.Mesh(new THREE.CylinderGeometry(sp.hole + 0.6, sp.hole + 0.6, 0.8, 32), m.screw);
  sc.rotation.x = Math.PI / 2;
  sc.position.set(-tip.x, -tip.y, sp.th - 0.25);
  inner.add(sc);
  const piv = new THREE.Group();
  piv.add(inner);
  piv.rotation.x = -Math.PI / 2;
  piv.position.y = -sp.th + 0.6;
  g.add(piv);
  // Soğutma çıkışı
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.2, 20), m.hole);
  hole.position.set(-14.6, -3, 3);
  hole.rotation.y = -Math.PI / 2;
  g.add(hole);
  return g;
}

/** SER dış diş kateri: yatık 16ER uç, sap ucunda bağlama pabucu */
export function buildThreadHolder(m: ToolMats) {
  const g = new THREE.Group();
  const prof = new THREE.Shape([V2(-120, -10), V2(-26, -10), V2(-4, -6), V2(1.2, -1.5), V2(-2, 6), V2(-20, 10), V2(-120, 10)]);
  const body = new THREE.ExtrudeGeometry(prof, { depth: 19, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 3 });
  body.rotateX(Math.PI / 2);
  body.translate(0, -1.6, 0);
  g.add(new THREE.Mesh(body, m.black));
  const ins = buildThreadInsert(m);
  const piv = new THREE.Group();
  ins.position.set(-8.2, 0, 0);
  piv.add(ins);
  piv.rotation.set(-Math.PI / 2, 0, 0);
  piv.position.set(0, -3.3, -0.5);
  ins.rotation.z = -Math.PI / 2;
  g.add(piv);
  const cl = new THREE.Mesh(new RoundedBoxGeometry(12, 3.4, 8, 3, 0.8), m.black);
  cl.position.set(-13, 1.8, -0.5);
  g.add(cl);
  const sc = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 2, 28), m.screw);
  sc.position.set(-15, 3.8, -0.5);
  g.add(sc);
  return g;
}

/** MGMN kanal ucu (tek başına) */
export function buildGrooveInsert(m: ToolMats) {
  const ins = new THREE.Shape([
    V2(0, 0), V2(-0.72, -5.9), V2(-19.28, -5.9), V2(-20, 0),
    V2(-19.6, 0), V2(-18.8, -0.36), V2(-17.8, -0.12), V2(-15.4, -0.52), V2(-10, -1.02), V2(-4.6, -0.52), V2(-2.2, -0.12), V2(-1.2, -0.36), V2(-0.4, 0),
  ]);
  const geo = new THREE.ExtrudeGeometry(ins, { depth: 2.84, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 });
  geo.translate(10, 2.95, -1.42);
  return new THREE.Mesh(geo, m.tin);
}

/* ======================= Frezeler ======================= */
/** Takma uçlu freze: kabuk (shell) gövde ya da saplı (C20); çevrede APMT (ya da yuvarlak) uçlar.
 *  Eksen +Y, kesme yüzü y = 0 (alt). Uçlar: uzun kesme kenarı eksene paralel, dış çaptan ve
 *  alt yüzden biraz taşar; önlerinde talaş cebi. */
export function buildFaceMill(m: ToolMats, o: { D?: number; z?: number; shank?: boolean; round?: boolean } = {}) {
  const D = o.D ?? 50, z = o.z ?? 4, R = D / 2, H = o.shank ? 26 : 40;
  const g = new THREE.Group();
  const span = (TAU / z) * 0.42; // cep açısal genişliği
  const seat = (i: number) => (i / z) * TAU + span; // uç arka duvarının açısı
  const ys = Array.from({ length: 110 }, (_, i) => H * (i / 109) ** 1.15);
  const body = radialSurface(480, ys, (t, y) => {
    let r = R - 0.6;
    if (y > H - 3) r = Math.min(r, R - 0.6 - (y - (H - 3)) * 1.2); // üst pah
    if (y < 1.2) r = Math.min(r, R - 1.8 + y); // alt pah
    for (let i = 0; i < z; i++) {
      let d = seat(i) - t;
      d = ((d % TAU) + TAU) % TAU;
      if (d < span) {
        const k = 1 - d / span; // 1: uç duvarı, 0: cep başı
        const depth = (o.round ? 10 : 9) * Math.sin(k * Math.PI * 0.5) ** 0.55 * (1 - smooth(y, o.round ? 14 : 12, o.round ? 24 : 22));
        r = Math.min(r, R - 0.6 - depth);
      }
    }
    return r;
  }, true);
  g.add(new THREE.Mesh(body, m.black));
  // Alt yüz: merkez delik ve vida başı
  const bore = new THREE.Mesh(new THREE.CircleGeometry(o.shank ? 3 : 11, 48), m.hole);
  bore.rotation.x = Math.PI / 2;
  bore.position.y = -0.02;
  g.add(bore);
  if (o.shank) {
    g.add(new THREE.Mesh(lathe([[R - 0.6 - 3.6, H], [10, H + 3], [10, H + 110], [9.4, H + 110.6], [0, H + 110.6]]), m.steel));
  } else {
    g.add(new THREE.Mesh(lathe([[0, H], [R - 4.2, H], [R - 5.5, H + 3], [12, H + 3], [11, H + 3.01], [0, H + 3.01]]), m.black));
    const top = new THREE.Mesh(new THREE.CircleGeometry(11, 48), m.hole);
    top.rotation.x = -Math.PI / 2;
    top.position.y = H + 3.03;
    g.add(top);
  }
  for (let i = 0; i < z; i++) {
    const a = seat(i);
    const ins = o.round ? buildIsoInsert(m, 'R', true) : buildIsoInsert(m, 'A', true);
    const sp = ins.userData.spec as InsertSpec;
    const n = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)); // radyal
    const t = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)); // teğet (dönüş yönü)
    const holder = new THREE.Group();
    // Yerel x → eksen (+Y), yerel y → radyal, yerel z (talaş yüzü normali) → −teğet (cebe bakar)
    holder.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), n, t.clone().negate()));
    const halfR = o.round ? 6 : 3.4; // uç merkezinden dış kenara
    const halfA = o.round ? 6 : 5.8; // uç merkezinden alt kenara
    holder.position.copy(n.clone().multiplyScalar(R + 0.5 - halfR)).add(new THREE.Vector3(0, halfA - 0.7, 0)).add(t.clone().multiplyScalar(sp.th * 0.15));
    holder.add(ins);
    ins.position.z = -sp.th; // talaş yüzü cebe doğru, sırtı duvara yaslı
    const sc = new THREE.Mesh(new THREE.CylinderGeometry(sp.hole + 0.55, sp.hole + 0.55, 0.7, 24), m.screw);
    sc.rotation.x = Math.PI / 2;
    sc.position.z = -0.15;
    holder.add(sc);
    g.add(holder);
  }
  return g;
}

/** Makine raybası: 6 düz oluk, kısa giriş pahı, H7 */
export function buildReamer(m: ToolMats, D = 10) {
  const R = D / 2, Lf = 30, L = 100;
  const g = new THREE.Group();
  const ys = Array.from({ length: 160 }, (_, i) => (Lf + 4) * (i / 159) ** 1.2);
  const geo = radialSurface(240, ys, (t, y) => {
    const u = ((((t * 6) / TAU) % 1) + 1) % 1;
    let r = R;
    if (u < 0.42) r = R - R * 0.38 * Math.sin((u / 0.42) * Math.PI) ** 0.7 * (1 - smooth(y, Lf, Lf + 4));
    else r = R - (u > 0.5 ? 0.05 + 0.15 * ((u - 0.5) / 0.5) : 0);
    if (y < 0.8) r = Math.min(r, R - 0.8 + y);
    return r;
  }, true);
  g.add(new THREE.Mesh(geo, m.carbide));
  g.add(new THREE.Mesh(lathe([[R - 0.6, Lf + 4], [R - 0.9, Lf + 8], [R - 0.9, L - 0.6], [R - 1.5, L], [0, L]]), m.steel));
  return g;
}

/** A tipi punta matkabı (DIN 333): iki uçlu, 60° havşa + pilot */
export function buildCenterDrill(m: ToolMats) {
  const g = new THREE.Group();
  const pts: [number, number][] = [[0, 0], [0.5, 0.15], [1.25, 0.5], [1.25, 3.0], [4.0, 7.7], [4.0, 20], [4.0, 32.3], [1.25, 37], [1.25, 39.5], [0.5, 39.85], [0, 40]];
  g.add(new THREE.Mesh(lathe(pts, 96), m.steel));
  // Pilot üzerinde iki düz oluk (koyu çizgi)
  for (const end of [0, 1]) for (const a of [0, Math.PI]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 0.6), m.hole);
    f.position.set(Math.cos(a) * 1.05, end ? 38 : 2, Math.sin(a) * 1.05);
    g.add(f);
  }
  return g;
}

/** ER pens: ön 60° koni, arka 16° konik gövde, sırayla iki uçtan açılmış 8 yarık (gerçek oyuk) */
export function buildCollet(m: ToolMats, size = 32) {
  const s = size / 32;
  const prof: [number, number][] = [[10, 0], [14.8, 3.2], [15.3, 3.6], [16.5, 5.3], [16.5, 7.8], [16.0, 8.4], [14.8, 9.0], [14.8, 10.2], [15.6, 11.0], [15.1, 40]];
  const rAt = (y: number) => {
    for (let i = 0; i < prof.length - 1; i++) {
      const [r0, y0] = prof[i], [r1, y1] = prof[i + 1];
      if (y <= y1) return r0 + (r1 - r0) * ((y - y0) / Math.max(1e-6, y1 - y0));
    }
    return prof[prof.length - 1][0];
  };
  const ys = Array.from({ length: 240 }, (_, i) => (40 * i) / 239);
  const geo = radialSurface(480, ys, (t, y) => {
    let r = rAt(y);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      let d = Math.abs(((t - a + Math.PI) % TAU + TAU) % TAU - Math.PI) * r;
      const front = i % 2 === 0;
      const on = front ? y < 33 : y > 7;
      if (on && d < 0.55) r -= 1.6 * (1 - (d / 0.55) ** 4);
    }
    return r;
  }, true, true);
  geo.scale(s, s, s);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, m.polished));
  for (const y of [-0.03, 40 * s + 0.03]) {
    const bore = new THREE.Mesh(new THREE.CircleGeometry(5.2 * s, 40), m.hole);
    bore.rotation.x = y < 0 ? Math.PI / 2 : -Math.PI / 2;
    bore.position.y = y;
    g.add(bore);
  }
  return g;
}

/** Çektirme civatası (MAS 403 P40T-1) */
export function buildPullStud(m: ToolMats) {
  const pts: [number, number][] = [[0, 0], [7.6, 0], [8.5, 0.9], [8.5, 6], [5.5, 9.5], [5.5, 13], [7.6, 15], [7.6, 22], [9.5, 23.5], [11.5, 25], [11.5, 28], [8.5, 30], [8.5, 54], [7.8, 54.7], [0, 54.7]];
  const g = new THREE.Group();
  g.add(new THREE.Mesh(lathe(pts, 96), m.polished));
  // Dişli bölüm (koyu çizgiler)
  for (let i = 0; i < 16; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.18, 6, 64), m.screw);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 32 + i * 1.4;
    g.add(ring);
  }
  return g;
}

/* ======================= Anahtar → model ======================= */
export const RENDER_KEYS = [
  'insert-C-n', 'insert-C-p', 'insert-D-n', 'insert-D-p', 'insert-V-n', 'insert-V-p', 'insert-S-n', 'insert-S-p',
  'insert-T-n', 'insert-T-p', 'insert-W-n', 'insert-R-p', 'insert-A-p',
  'groove-insert', 'thread-insert',
  'holder-ext-C', 'holder-ext-D', 'holder-ext-V', 'holder-ext-V-s', 'holder-ext-W', 'holder-ext-T', 'holder-groove', 'holder-thread',
  'boring-bar-C', 'boring-bar-D',
  'drill-carbide', 'drill-hss', 'drill-u', 'center-drill', 'reamer',
  'endmill', 'endmill-ball', 'facemill', 'facemill-45', 'facemill-shank', 'facemill-round',
  'tap-helis', 'tap-duz', 'tap-ovalama', 'collet', 'chuck-bt', 'pull-stud',
] as const;
export type RenderKey = (typeof RENDER_KEYS)[number];

/** Sunum duruşu: döner takımlar yatay, ucu sol-öne; uçlar üst yüzü kameraya dönük */
export interface Posed { obj: THREE.Object3D; kind: 'insert' | 'rotary' | 'holder' | 'compact' }
export function buildRenderModel(key: RenderKey, m = toolMaterials()): Posed {
  const wrap = new THREE.Group();
  const rotary = (o: THREE.Object3D, tilt = 0.22) => {
    // Eksen +Y → ekran yatayı; uç solda
    o.rotation.z = Math.PI / 2;
    const r = new THREE.Group();
    r.add(o);
    r.rotation.set(0.12, -0.55, tilt);
    wrap.add(r);
    return { obj: wrap, kind: 'rotary' as const };
  };
  if (key.startsWith('insert-')) {
    const [, sh, pn] = key.split('-');
    const ins = buildIsoInsert(m, sh as Shape, pn === 'p');
    ins.rotation.set(-0.95, 0, 0.35);
    wrap.add(ins);
    return { obj: wrap, kind: 'insert' };
  }
  switch (key) {
    case 'groove-insert': { const g = buildGrooveInsert(m); g.rotation.set(0.5, -0.7, 0.1); wrap.add(g); return { obj: wrap, kind: 'insert' }; }
    case 'thread-insert': { const g = buildThreadInsert(m); g.rotation.set(-0.95, 0, 0.3); wrap.add(g); return { obj: wrap, kind: 'insert' }; }
    case 'holder-ext-C': case 'holder-ext-D': case 'holder-ext-V': case 'holder-ext-W': case 'holder-ext-T': {
      const g = buildExtHolder(m, key.slice(-1) as Shape); g.rotation.set(0.5, -0.95, 0.08); wrap.add(g); return { obj: wrap, kind: 'holder' };
    }
    case 'holder-groove': { const g = buildGroovingHolder(m); g.rotation.set(0.42, -0.72, 0.06); wrap.add(g); return { obj: wrap, kind: 'holder' }; }
    case 'holder-thread': { const g = buildThreadHolder(m); g.rotation.set(0.5, -0.95, 0.08); wrap.add(g); return { obj: wrap, kind: 'holder' }; }
    case 'boring-bar-C': case 'boring-bar-D': { const g = buildBoringBar(m, key.slice(-1) as Shape); g.rotation.set(0.45, -0.85, 0.06); wrap.add(g); return { obj: wrap, kind: 'holder' }; }
    case 'drill-carbide': return rotary(buildDrill(m, { D: 10, Lf: 52, L: 103, mat: m.altin }));
    case 'drill-hss': return rotary(buildDrill(m, { D: 10, Lf: 87, L: 133, mat: m.tin, shankMat: m.tin, tip: 118, coolant: false }));
    case 'drill-u': {
      const d = buildUDrill();
      const o = new THREE.Group();
      d.root.scale.setScalar(100);
      d.root.rotation.z = -Math.PI / 2; // uç +X → −Y, sap +Y (diğer döner takımlarla aynı)
      o.add(d.root);
      return rotary(o);
    }
    case 'center-drill': return rotary(buildCenterDrill(m), 0.15);
    case 'reamer': return rotary(buildReamer(m));
    case 'endmill': return rotary(buildEndMill(m, { D: 10, z: 4, Lf: 22, L: 72 }));
    case 'endmill-ball': return rotary(buildEndMill(m, { D: 10, z: 2, Lf: 20, L: 72, ball: true, helix: 30 }));
    case 'facemill': { const g = buildFaceMill(m, { D: 50, z: 4 }); g.rotation.set(-0.62, 0.4, 0.2); wrap.add(g); return { obj: wrap, kind: 'compact' }; }
    case 'facemill-shank': return rotary(buildFaceMill(m, { D: 20, z: 2, shank: true }), 0.18);
    case 'facemill-round': { const g = buildFaceMill(m, { D: 50, z: 5, round: true }); g.rotation.set(-0.62, 0.4, 0.2); wrap.add(g); return { obj: wrap, kind: 'compact' }; }
    case 'tap-helis': return rotary(buildTap(m, { kind: 'helis' }));
    case 'tap-duz': return rotary(buildTap(m, { kind: 'duz' }));
    case 'tap-ovalama': return rotary(buildTap(m, { kind: 'ovalama' }));
    case 'collet': { const g = buildCollet(m); g.rotation.set(0.25, 0.4, -1.25); wrap.add(g); return { obj: wrap, kind: 'compact' }; }
    case 'chuck-bt': return rotary(buildBT40(m, false), 0.1);
    case 'pull-stud': return rotary(buildPullStud(m), 0.15);
  }
  throw new Error(`Bilinmeyen model: ${key}`);
}
