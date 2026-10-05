// Takma uçlu frezeler: kafa tipi (shell) ve saplı. Modelleme uzayı: eksen +Z, kesme yüzü z = 0 (alt).
// Her uç kendi yerel çerçevesinde yerleşir: x radyal (dışa), y teğetsel (talaş yüzü bu yöne bakar), z eksenel.
import * as THREE from 'three';
import { buildInsert, type ToolMats } from '../tools3d';
import { applyClearance, parallelogram, regular } from '../catalog-models';
import { kit, box, cylZ, revolveZ, part, space, deg, type P2, type RealMats, type M } from './kit';

type InsKind = 'APMT1604' | 'APMT1135' | 'SEKT1204' | 'RPMT10';
function makeInsert(m: ToolMats, k: InsKind) {
  let verts: THREE.Vector2[], th: number, hole: number, rad: number, clr: number, land = 0.5, breaker = 1.5;
  switch (k) {
    case 'APMT1604': verts = parallelogram(16.4, 9.5); th = 5.0; hole = 2.1; rad = 0.8; clr = 11; land = 0.55; breaker = 1.8; break;
    case 'APMT1135': verts = parallelogram(11.2, 6.8); th = 3.6; hole = 1.45; rad = 0.8; clr = 11; land = 0.45; breaker = 1.25; break;
    case 'SEKT1204': verts = regular(4, 12.7, Math.PI / 4); th = 3.18; hole = 2.2; rad = 0.6; clr = 20; land = 0.5; breaker = 1.9; break;
    case 'RPMT10': verts = regular(72, 10); th = 3.97; hole = 1.8; rad = 0.2; clr = 11; land = 0.6; breaker = 1.4; break;
  }
  const g = buildInsert(verts, { rad, th, hole, land, breaker }, m);
  const ic = Math.min(...verts.map((p, i) => { const q = verts[(i + 1) % verts.length]; return Math.abs((q.x - p.x) * p.y - (q.y - p.y) * p.x) / p.distanceTo(q); }));
  applyClearance(g, th, clr * deg, ic * 0.78);
  return { g, verts, th, hole };
}

/** Uç yerel (X uzunluk, Y genişlik, Z kalınlık) → freze yerel (x radyal, y teğetsel, z eksenel) */
const BASIS = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));

export interface MillOpts {
  type: 'shell' | 'shank'; D: number; z: number; insert: InsKind;
  /** Kafa yüksekliği / boyu */
  H: number; shankD?: number; shankL?: number; bore?: number;
}
export async function buildMillReal(m: ToolMats, rm: RealMats, o: MillOpts) {
  const K = await kit();
  const S = space();
  const R = o.D / 2;
  const sample = makeInsert(m, o.insert);
  // Uç konumu (yerel x–z düzleminde): ψ düzlem içi dönüş, (x0, z0) merkez
  let psi = 0, x0 = 0, z0 = 0, reach = 0;
  const vs = sample.verts;
  const ext = (f: (p: THREE.Vector2) => number) => Math.max(...vs.map(f));
  if (o.insert.startsWith('APMT')) {
    // Uzun kesme kenarı eksene paralel, dış çapta; alt köşe yüzeyden 0,6 mm taşar
    const w = ext((p) => p.y), L = ext((p) => p.x);
    x0 = R - w; z0 = -0.6 + L; reach = w * 2;
  } else if (o.insert === 'SEKT1204') {
    // 45° yanaşma: kare 45° döndürülür; alt köşe kesme çapında
    psi = 45 * deg;
    const d = 12.7 / Math.SQRT2;
    x0 = R; z0 = -0.5 + d; reach = d;
  } else {
    // Yuvarlak uç: dış kenar kesme çapında, alttan taşar
    x0 = R - 5; z0 = 5 - 0.6; reach = 10;
  }
  const bodyR = o.insert === 'SEKT1204' ? R + 1.5 : R - 0.9;
  // Gövde
  let body: M;
  if (o.type === 'shell') {
    const Hh = o.H, rb = (o.bore ?? 22) / 2;
    body = revolveZ(K, [[rb, 0.6], [rb + 0.6, 0], [bodyR - 1, 0], [bodyR, 1], [bodyR, Hh - 9], [bodyR - 3, Hh - 4], [bodyR - 3.5, Hh - 0.8], [bodyR - 4.3, Hh], [rb + 0.8, Hh], [rb, Hh - 0.8]], 200);
    // Alttan bağlama vidası havşası, üstte kama kanalı
    body = body.subtract(cylZ(K, rb + 5, rb + 5, -1, 9, 96));
    body = body.subtract(box(K, -bodyR - 2, bodyR + 2, -5.2, 5.2, Hh - 5.6, Hh + 1));
  } else {
    const sr = (o.shankD ?? o.D) / 2, L = o.shankL ?? 150;
    body = revolveZ(K, [[0, 0], [bodyR - 0.8, 0], [bodyR, 0.8], [bodyR, o.H - 2], [sr - 0.7, o.H + 3], [sr - 0.7, o.H + 6], [sr, o.H + 7], [sr, L - 1], [sr - 1, L], [0, L]], 160);
  }
  // Uç cepleri, talaş boşlukları
  const cuts: M[] = [];
  for (let i = 0; i < o.z; i++) {
    const a = (360 / o.z) * i;
    const t = sample.th;
    let pocket = box(K, x0 - reach * 0.55 - 0.4, R + 12, -t - 0.15, 4, -2, z0 + reach * 0.62 + 0.2);
    if (o.insert === 'SEKT1204') pocket = box(K, x0 - 9.6, R + 14, -t - 0.15, 4, -2, z0 + 9.4);
    if (o.insert === 'RPMT10') pocket = cylZ(K, 5.2, 5.2, -t - 0.15, 4, 64).rotate([-90, 0, 0]).translate([x0, 0, z0]).add(box(K, x0, R + 8, -t - 0.15, 4, -2, z0));
    // Talaş cebi: ucun önünde, alttan açık, yukarı doğru daralan kapsül
    const gr = o.type === 'shell' ? (o.insert === 'SEKT1204' ? 8 : 7) : R * 0.48;
    const gx = (o.insert === 'SEKT1204' ? R - 2 : R - gr * 0.55);
    const gTop = o.type === 'shell' ? z0 + reach * 0.9 : z0 + reach * 0.9 + 4;
    const gullet = K.Manifold.hull([
      K.Manifold.sphere(gr, 48).translate([gx, gr * 0.95, -gr]),
      K.Manifold.sphere(gr * 0.85, 48).translate([gx - 1, gr * 1.05, gTop]),
    ]);
    cuts.push(pocket.add(gullet).rotate([0, 0, a]));
  }
  body = body.subtract(K.Manifold.union(cuts));
  S.add(part(body, rm.body, 30, o.type === 'shell' ? 1.6 : 1.2));
  // Uçlar ve vidaları
  for (let i = 0; i < o.z; i++) {
    const a = ((360 / o.z) * i) * deg;
    const ins = i === 0 ? sample : makeInsert(m, o.insert);
    const holder = new THREE.Group();
    const local = new THREE.Group();
    local.matrixAutoUpdate = false;
    // Düzlem içi dönüş ψ ve konum: uç talaş yüzü y = 0'da
    const inner = new THREE.Group();
    inner.add(ins.g);
    inner.rotation.z = psi;
    local.add(inner);
    local.matrix.copy(BASIS).setPosition(x0, -ins.th, z0);
    holder.add(local);
    // Vida (talaş yüzünden, uç deliğinde)
    const sc = new THREE.Mesh(new THREE.CylinderGeometry(ins.hole + 0.6, ins.hole + 0.6, 0.6, 32), rm.screw);
    sc.position.set(x0, -0.25, z0);
    holder.add(sc);
    const tx = new THREE.Mesh(new THREE.CircleGeometry(ins.hole * 0.45, 6), rm.socket);
    tx.rotation.x = -Math.PI / 2;
    tx.position.set(x0, 0.08, z0);
    holder.add(tx);
    holder.rotation.z = a;
    S.add(holder);
  }
  return S;
}

/** MGMN kanal ve kesme ucu (tek başına): alt V prizma, üstte sıkma oluğu, iki uçta kesme kenarı ve talaş kırıcı */
export async function buildGrooveInsertReal(m: ToolMats, w = 3, Li = 20, hi = 5.9) {
  const K = await kit();
  const S = space();
  const h = w / 2;
  const sec: P2[] = [[-h + 0.08, -4.5], [0, -hi], [h - 0.08, -4.5], [h, 0], [0, -0.6], [-h, 0]];
  const flat: P2[] = [[-h + 0.08, -4.5], [0, -hi], [h - 0.08, -4.5], [h, 0], [-h, 0]];
  // barX: kesit (y, z) X boyunca
  const bx = (pts: P2[], x0: number, x1: number) => new K.CrossSection([pts]).extrude(x1 - x0).rotate([90, 0, 90]).translate([x0, 0, 0]);
  let ins = bx(sec, -Li, 0).add(bx(flat, -3.2, 0)).add(bx(flat, -Li, -Li + 3.2));
  const t7 = Math.tan(7 * deg);
  ins = ins.trimByPlane([-1 / Math.hypot(1, t7), 0, t7 / Math.hypot(1, t7)], 0);
  ins = ins.trimByPlane([1 / Math.hypot(1, t7), 0, t7 / Math.hypot(1, t7)], -Li / Math.hypot(1, t7));
  // Talaş kırıcı çanakları
  const cb = (x: number) => K.Manifold.cylinder(w + 2, 0.78, 0.78, 40).rotate([90, 0, 0]).translate([x, h + 1, 0.56]);
  ins = ins.subtract(cb(-1.32)).subtract(cb(-Li + 1.32));
  S.add(part(ins, m.tin, 30, 0.5));
  return S;
}
