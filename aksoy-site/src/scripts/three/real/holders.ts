// Katerler ve baralar (ISO 5608 / katalog ölçüleri). Modelleme uzayı Z yukarı; uç üst yüzü z = 0
// (kesme yüksekliği = sap üst yüzü), uç ucu x = 0'da, sap −X yönüne uzanır.
import * as THREE from 'three';
import { buildIsoInsert, type InsertShape } from '../catalog-models';
import type { ToolMats } from '../tools3d';
import { buildThreadInsert } from '../tools3d';
import {
  kit, box, prism, cylZ, barX, chamferRect, cutAbove, cutBeyond, add2, dir2, rot2, offsetPoly, part, space, marking, deg, revolveZ,
  type P2, type RealMats, type M,
} from './kit';

/* ---------- Uç yerleştirme ---------- */
interface Placed { verts: P2[]; center: P2; th: number; hole: number; tipIdx: number }
function sharpestIdx(v: THREE.Vector2[]) {
  let best = 0, ang = Infinity;
  v.forEach((p, i) => {
    const a = v[(i + v.length - 1) % v.length].clone().sub(p).normalize(), b = v[(i + 1) % v.length].clone().sub(p).normalize();
    const t = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1));
    if (t < ang - 1e-6) { ang = t; best = i; }
  });
  return best;
}
/** Ucu, keskin köşesi `tip` noktasına ve köşe açıortayı `bisDeg` yönüne (uca doğru içeri) gelecek şekilde yerleştir */
function placeInsert(ins: THREE.Object3D, verts: THREE.Vector2[], th: number, hole: number, tip: P2, bisDeg: number, zTop: number): Placed {
  const vi = sharpestIdx(verts);
  const v = verts[vi];
  const a = verts[(vi + verts.length - 1) % verts.length].clone().sub(v).normalize();
  const b = verts[(vi + 1) % verts.length].clone().sub(v).normalize();
  const localBis = Math.atan2(a.y + b.y, a.x + b.x);
  const th0 = bisDeg * deg - localBis;
  const vr = rot2([v.x, v.y], th0);
  const pos: P2 = [tip[0] - vr[0], tip[1] - vr[1]];
  ins.rotation.z = th0;
  ins.position.set(pos[0], pos[1], zTop - th);
  return { verts: verts.map((p) => add2(rot2([p.x, p.y], th0), pos)), center: pos, th, hole, tipIdx: vi };
}

/* ---------- Ortak parçalar ---------- */
/** Altıgen lokmalı (ya da torx) vida başı: üst yüz zTop, eksen Z */
function screwHead(K: any, rm: RealMats, x: number, y: number, zTop: number, r: number, h: number, torx = false) {
  const g = new THREE.Group();
  let head = cylZ(K, r, r, zTop - h, zTop - 0.25, 48, x, y).add(cylZ(K, r, r - 0.25, zTop - 0.25, zTop, 48, x, y));
  const sr = r * 0.46;
  let sock: M;
  if (torx) {
    // 6 loblu yıldız
    const pts: P2[] = [];
    for (let i = 0; i < 72; i++) { const t = (i / 72) * Math.PI * 2; const rr = sr * (0.78 + 0.22 * Math.cos(6 * t)); pts.push([x + Math.cos(t) * rr, y + Math.sin(t) * rr]); }
    sock = prism(K, pts, zTop - h * 0.7, zTop + 1);
  } else {
    const pts: P2[] = [];
    for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2 + 0.3; pts.push([x + Math.cos(t) * sr, y + Math.sin(t) * sr]); }
    sock = prism(K, pts, zTop - h * 0.7, zTop + 1);
  }
  head = head.subtract(sock);
  g.add(part(head, rm.screw, 40));
  // Lokmanın dibi (karanlık)
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(sr * 0.95, 24), rm.socket);
  bottom.position.set(x, y, zTop - h * 0.7 + 0.02);
  g.add(bottom);
  return g;
}

export interface HolderOpts {
  shape: InsertShape; positive: boolean; clamp: 'P' | 'M' | 'S';
  /** Yanaşma açısı κr (°) */
  kr: number; H: number; f: number; L: number; code: string;
}
/** Dış çap kateri */
export async function buildExtHolderReal(m: ToolMats, rm: RealMats, o: HolderOpts) {
  const K = await kit();
  const S = space();
  const H = o.H, B = o.H, half = B / 2;
  // Uç
  const ins = buildIsoInsert(m, o.shape, o.positive);
  const sp = ins.userData.spec as { verts: THREE.Vector2[]; th: number; hole: number; rad: number };
  const vi = sharpestIdx(sp.verts);
  const va = sp.verts[(vi + sp.verts.length - 1) % sp.verts.length].clone().sub(sp.verts[vi]);
  const vb = sp.verts[(vi + 1) % sp.verts.length].clone().sub(sp.verts[vi]);
  const alpha = Math.acos(va.clone().normalize().dot(vb.clone().normalize())) / deg;
  const edgeLen = Math.min(va.length(), vb.length());
  // Ana kesme kenarı (yan) −X'e yakın: κr − 90 kadar içe döner; uç kenarı α kadar ötede
  const a2 = -180 + (o.kr - 90), a1 = a2 + alpha, bis = a2 + alpha / 2;
  const T: P2 = [0, -half + o.f];
  const shimT = o.positive ? 0 : 3.18;
  const zFloor = -sp.th - shimT;
  const zHead = -1.3;
  const P = placeInsert(ins, sp.verts, sp.th, sp.hole, T, bis, 0);
  S.add(ins);
  // Kafa: uç kenarlarından e kadar içeride başlayan profil
  const e = 0.55;
  const Tp = add2(T, dir2(bis), e / Math.sin((alpha / 2) * deg));
  const d1 = dir2(a1), d2 = dir2(a2);
  // Ön çizginin sap yan yüzüyle (y = −half) kesişimi
  const t1 = (-half + 0.0001 - Tp[1]) / d1[1];
  let F: P2 = add2(Tp, d1, t1);
  const hx = Math.max(34, -F[0] + 6);
  if (F[0] < -hx + 4) F = [-hx + 4, -half];
  const Q = add2(Tp, d2, edgeLen * 0.82);
  const Sx = Math.min(Q[0] - 8, -24);
  const headPoly: P2[] = [Tp, Q, [Sx, half], [-hx, half], [-hx, -half], F];
  let head = prism(K, headPoly, -H, zHead);
  // Boşluk açıları: uç altındaki ön ve yan yüzler aşağı doğru içe eğik (yalnız kafanın ön bölümü)
  const cl = Math.tan(6 * deg);
  const n1: P2 = [-d1[1], d1[0]], n2: P2 = [d2[1], -d2[0]];
  const frontLim = Math.min(-14, Q[0] - 4);
  let front = head.intersect(box(K, frontLim, 5, -half - 30, half + 30, -H - 1, 5));
  const backPart = head.subtract(box(K, frontLim, 5, -half - 30, half + 30, -H - 1, 5));
  front = cutBeyond(front, [n1[0], n1[1], -cl], [Tp[0], Tp[1], zHead]);
  front = cutBeyond(front, [n2[0], n2[1], -cl], [Tp[0], Tp[1], zHead]);
  head = front.add(backPart);
  // Sap (pahlı kesit) ve kafa basamağına 45° pah
  // Sap: üst kenarlar pahlı (alt kenarlar görünmez)
  let shank = barX(K, [[-half, -H], [half, -H], [half, -1.0], [half - 1.0, 0], [-half + 1.0, 0], [-half, -1.0]], -o.L, -hx + 0.01);
  shank = cutAbove(shank, [1, 0, 1], -hx + zHead + 0.02);
  // Arka uç pahları
  shank = cutAbove(shank, [-1, 0, 1], o.L - 1.6);
  shank = cutAbove(shank, [-1, 0, -1], o.L + H - 1.6);
  shank = cutAbove(shank, [-1, 1, 0], o.L + half - 1.6);
  shank = cutAbove(shank, [-1, -1, 0], o.L + half - 1.6);
  let body = shank.add(head);
  // Uç yuvası: uçtan 0,15 büyük cep; arka köşelerde rahatlatma delikleri
  const pocket = offsetPoly(K, P.verts, 0.15);
  body = body.subtract(prism(K, pocket, zFloor, 10));
  const nV = P.verts.length;
  for (let i = 0; i < nV; i++) {
    if (i === P.tipIdx) continue;
    const v = P.verts[i];
    // Yalnızca kafa malzemesinin içinde kalan (arka) köşeler
    if (v[0] < Tp[0] - 3 || v[1] < Tp[1] - 3) body = body.subtract(cylZ(K, 0.9, 0.9, zFloor - 1.2, 10, 24, v[0], v[1]));
  }
  // Bağlama
  const bd = dir2(bis);
  const rearIdx = nV === 4 ? (P.tipIdx + 2) % 4 : -1;
  const rear: P2 = rearIdx >= 0 ? P.verts[rearIdx] : add2(P.center, bd, 5);
  if (o.clamp === 'P') {
    const sc = add2(rear, bd, 4.6);
    body = body.subtract(cylZ(K, 3.4, 3.4, zHead - 1.6, 10, 48, sc[0], sc[1]));
    S.add(screwHead(K, rm, sc[0], sc[1], zHead - 0.35, 3.1, 3));
    // Kol pimi (uç deliğinden görünür)
    const pin = cylZ(K, P.hole * 0.62, P.hole * 0.62, zFloor, -1.6, 32, P.center[0], P.center[1]);
    S.add(part(pin, rm.screw));
  } else if (o.clamp === 'M') {
    // Üstten pabuç: ucun ortasına basar, arkada vidayla sıkılır
    const c0 = add2(P.center, bd, 1.0), c1 = add2(P.center, bd, 9.5);
    let clampM = K.Manifold.hull([cylZ(K, 3.6, 3.6, 0.05, 3.8, 40, c0[0], c0[1]), cylZ(K, 4.4, 4.4, zHead, 3.8, 40, c1[0], c1[1])]);
    clampM = cutBeyond(clampM, [bd[0] * -1, bd[1] * -1, 1.4], [c0[0], c0[1], 3.0]);
    S.add(part(clampM, rm.body, 30, 0.8));
    S.add(screwHead(K, rm, c1[0], c1[1], 4.6, 3.2, 1.2));
    const pin = cylZ(K, P.hole * 0.62, P.hole * 0.62, zFloor, -1.4, 32, P.center[0], P.center[1]);
    S.add(part(pin, rm.screw));
  } else {
    // Vidalı (S): havşa başlı torx vida ucun deliğinde
    S.add(screwHead(K, rm, P.center[0], P.center[1], -0.15, P.hole + 0.7, 1.4, true));
  }
  // Altlık (shim)
  if (shimT > 0) {
    const shimPoly = offsetPoly(K, P.verts, -0.3);
    let shim = prism(K, shimPoly, zFloor + 0.02, -sp.th - 0.02);
    shim = shim.subtract(cylZ(K, P.hole + 0.6, P.hole + 0.6, zFloor - 1, 0, 32, P.center[0], P.center[1]));
    S.add(part(shim, rm.shim, 30));
  }
  S.add(part(body, rm.body, 30, 1.6));
  // Lazer markalama: sapın arka yan yüzünde
  const mk = marking(o.code, 44, 4.2);
  // Ucun olduğu yan yüzde (+Y), yazı uçtan sapa doğru okunur
  mk.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)));
  mk.position.set(-hx - 38, half + 0.03, -H * 0.42);
  S.add(mk);
  return S;
}

/** İki nokta arasında silindir (delik delmek için) */
function cylBetween(K: any, a: [number, number, number], b: [number, number, number], r: number, seg = 32): M {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L = Math.hypot(d[0], d[1], d[2]);
  // Z eksenini d yönüne çevir: önce Y etrafında (eğim), sonra Z etrafında (yön)
  const ry = Math.acos(d[2] / L) / deg;
  const rz = Math.atan2(d[1], d[0]) / deg;
  return K.Manifold.cylinder(L, r, r, seg).rotate([0, ry, 0]).rotate([0, 0, rz]).translate(a);
}

export interface BarOpts { shape: InsertShape; kr: number; D: number; f: number; L: number; code: string }
/** İç çap barası (S tipi vidalı, pozitif uç). Bara ekseni X, eksen yüksekliği z = 0 (kesme yüksekliği). */
export async function buildBoringBarReal(m: ToolMats, rm: RealMats, o: BarOpts) {
  const K = await kit();
  const S = space();
  const R = o.D / 2;
  const ins = buildIsoInsert(m, o.shape, true);
  const sp = ins.userData.spec as { verts: THREE.Vector2[]; th: number; hole: number };
  const vi = sharpestIdx(sp.verts);
  const va = sp.verts[(vi + sp.verts.length - 1) % sp.verts.length].clone().sub(sp.verts[vi]);
  const vb = sp.verts[(vi + 1) % sp.verts.length].clone().sub(sp.verts[vi]);
  const alpha = Math.acos(va.clone().normalize().dot(vb.clone().normalize())) / deg;
  // Delik işlemede ilerleme +X: ana kenar öndedir (eksene doğru), ikincil kenar geriye kaçar
  const a1 = -(o.kr), a2 = a1 - alpha, bis = a1 - alpha / 2;
  const T: P2 = [0, o.f];
  const P = placeInsert(ins, sp.verts, sp.th, sp.hole, T, bis, 0);
  S.add(ins);
  // Gövde: uçları pahlı silindir
  let bar = revolveZ(K, [[0, 0], [R - 0.8, 0], [R, 0.8], [R, o.L], [0, o.L]], 160).rotate([0, 90, 0]).translate([-o.L, 0, 0]);
  // Talaş boşluğu: ön bölümde eksenin üstü kaldırılır, arkada 40° rampa
  const ramp = 24;
  const k40 = Math.tan(38 * deg);
  // Kaldırılacak bölge: z ≥ 0 ve rampanın üstü (rampa x = −ramp'tan geriye doğru yükselir)
  const chip = cutAbove(box(K, -ramp - 30, 6, -R - 5, R + 5, 0, R + 5), [-k40, 0, -1], ramp * k40);
  bar = bar.subtract(chip);
  // Kafa: uç kenarlarından e içeride, 7° boşlukla
  const e = 0.5;
  const Tp = add2(T, dir2(bis), e / Math.sin((alpha / 2) * deg));
  const d1 = dir2(a1), d2 = dir2(a2);
  const n1: P2 = [-d1[1], d1[0]], n2: P2 = [d2[1], -d2[0]];
  const cl = Math.tan(7 * deg);
  let front = bar.intersect(box(K, -ramp + 1, 8, -R - 8, R + 8, -R - 2, R + 2));
  const back = bar.subtract(box(K, -ramp + 1, 8, -R - 8, R + 8, -R - 2, R + 2));
  // Ucun desteklediği bölge: ön uç (x > Tp) ve dış taraf (ikincil kenar çizgisinin ötesi) kesilir
  front = cutBeyond(front, [n1[0], n1[1], -cl], [Tp[0], Tp[1], 0]);
  front = cutBeyond(front, [n2[0], n2[1], -cl], [Tp[0], Tp[1], 0]);
  bar = front.add(back);
  // Uç yuvası ve köşe rahatlatma
  bar = bar.subtract(prism(K, offsetPoly(K, P.verts, 0.15), -sp.th, 10));
  const rearIdx = sp.verts.length === 4 ? (P.tipIdx + 2) % 4 : (P.tipIdx + 1) % 3;
  const rv = P.verts[rearIdx];
  bar = bar.subtract(cylZ(K, 0.8, 0.8, -sp.th - 1.2, 4, 24, rv[0], rv[1]));
  // İçten soğutma: eksenden gelip uca bakan kanal, rampadan çıkar
  bar = bar.subtract(cylBetween(K, [-o.L + 30, -1.5, -2.5], [-o.L + 32, -1.5, -2.5], 1.0));
  bar = bar.subtract(cylBetween(K, [-48, -1.5, -2.5], [-15, 2.2, 7], 1.1));
  // Bağlama düzlüğü (üstte) ve markalama
  const hFlat = R - 1.0;
  bar = bar.subtract(box(K, -o.L - 1, -ramp - 26, -R - 1, R + 1, hFlat, R + 2));
  S.add(part(bar, rm.body, 30, 1.6));
  S.add(screwHead(K, rm, P.center[0], P.center[1], -0.15, sp.hole + 0.65, 1.4, true));
  const mk = marking(o.code, 36, 3.4);
  mk.rotation.z = Math.PI; // yazı uçtan sapa doğru okunur
  mk.position.set(-o.L * 0.55, 0, hFlat + 0.03);
  S.add(mk);
  return S;
}

/** SER dış diş kateri: yatık 16ER uç (diş ekseni sap eksenine paralel), altlık ve vida */
export async function buildThreadHolderReal(m: ToolMats, rm: RealMats, o: { H: number; f: number; L: number; code: string }) {
  const K = await kit();
  const S = space();
  const H = o.H, half = H / 2;
  const ins = buildThreadInsert(m);
  const th = 3.5;
  const Rc = 9.525; // çevrel yarıçap (IC 9,525)
  const verts = [0, 1, 2].map((i) => { const a = Math.PI / 2 + (i * 2 * Math.PI) / 3; return new THREE.Vector2(Math.cos(a) * Rc, Math.sin(a) * Rc); });
  const T: P2 = [0, -half + o.f];
  const P = placeInsert(ins, verts, th, 2.0, T, 180, 0);
  S.add(ins);
  const anvT = 3.2;
  const zFloor = -th - anvT, zHead = -1.2;
  // Kafa: üçgenin altını taşıyan, dişin iki yanında geri çekilmiş profil
  const e = 1.3;
  const Tp: P2 = [T[0] - e / Math.sin(30 * deg), T[1]];
  const up = dir2(150), dn = dir2(-150);
  const Vo = P.verts.reduce((a, v) => (v[1] > a[1] ? v : a)); // dış köşe
  const A: P2 = add2(Vo, dir2(-30), -1.0);
  // İç taraf: dişin iç kenarı boyunca, sonra sapın ön yüzü olarak aşağı iner
  const F1 = add2(Tp, dn, 14.5);
  const hx = 36;
  const headPoly: P2[] = [Tp, add2(Tp, up, 12), [A[0] - 1, A[1] - 0.6], [A[0] - 9, half + 1], [-hx, half], [-hx, -half], [F1[0] - 4, -half], F1];
  let head = prism(K, headPoly, -H, zHead);
  const cl = Math.tan(6 * deg);
  let front = head.intersect(box(K, -15, 5, -half - 30, half + 40, -H - 1, 5));
  const back = head.subtract(box(K, -15, 5, -half - 30, half + 40, -H - 1, 5));
  const nU: P2 = [up[1], -up[0]], nD: P2 = [-dn[1], dn[0]];
  front = cutBeyond(front, [nU[0], nU[1], -cl], [Tp[0], Tp[1], zHead]);
  front = cutBeyond(front, [nD[0], nD[1], -cl], [Tp[0], Tp[1], zHead]);
  head = front.add(back);
  let shank = barX(K, [[-half, -H], [half, -H], [half, -1.0], [half - 1.0, 0], [-half + 1.0, 0], [-half, -1.0]], -o.L, -hx + 0.01);
  shank = cutAbove(shank, [1, 0, 1], -hx + zHead + 0.02);
  shank = cutAbove(shank, [-1, 0, 1], o.L - 1.6);
  let body = shank.add(head);
  body = body.subtract(prism(K, offsetPoly(K, P.verts, 0.2), zFloor, 10));
  // Altlık (anvil): uçtan biraz küçük üçgen
  let anvil = prism(K, offsetPoly(K, P.verts, -0.6), zFloor + 0.02, -th - 0.02);
  anvil = anvil.subtract(cylZ(K, 2.6, 2.6, zFloor - 1, 0, 32, P.center[0], P.center[1]));
  S.add(part(anvil, rm.shim, 30));
  S.add(part(body, rm.body, 30, 1.6));
  S.add(screwHead(K, rm, P.center[0], P.center[1], -0.1, 2.75, 1.3, true));
  const mk = marking(o.code, 40, 4.0);
  mk.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)));
  mk.position.set(-hx - 36, half + 0.03, -H * 0.42);
  S.add(mk);
  return S;
}

/**
 * MGEHR kanal kateri: kare sap, sapın üstüne taşan baş, ince bıçak; MGMN uç alt ve üst çene
 * arasında sıkılır. Üst çene, yatay esneme yarığıyla ayrılır ve tepedeki vida ile bastırılır.
 * Uç ön kesme köşesi x = 0, kesme yüksekliği z = 0; bıçağın dış yüzü sapın +Y yüzüyle aynı hizada.
 */
export async function buildGrooveHolderReal(m: ToolMats, rm: RealMats, o: { H: number; w: number; L: number; code: string }) {
  const K = await kit();
  const S = space();
  const H = o.H, half = H / 2, w = o.w; // w: uç genişliği
  const bw = w - 0.5; // bıçak genişliği
  const yOut = half, yIn = half - bw; // bıçak yüzleri
  const yc = half - bw / 2; // uç orta düzlemi
  const Li = 20, hi = 5.9; // uç boyu ve yüksekliği
  const headTop = 7.5, headX = -24; // başın tepesi ve bıçağın başladığı x
  // Sap
  let shank = barX(K, [[-half, -H], [half, -H], [half, -1.0], [half - 1.0, 0], [-half + 1.0, 0], [-half, -1.0]], -o.L, headX - 12);
  shank = cutAbove(shank, [-1, 0, 1], o.L - 1.6);
  // Baş: sapın üstüne yükselen blok (önü pahlı)
  let head = box(K, headX - 12.01, headX, -half, half, -H, headTop);
  head = cutAbove(head, [1, 0, 1], headX + headTop - 3.5);
  head = cutAbove(head, [0, -1, 1], half + headTop - 1.2);
  head = cutAbove(head, [0, 1, 1], half + headTop - 1.2);
  // Bıçak yan profili (x, z): alt çene ucu taşır, üst çene ucun arka yarısına basar
  const prof: P2[] = [
    [headX, -H], [-13, -H], [-4.6, -10.6], [-2.5, -hi], [-Li - 0.2, -hi], [-Li - 0.2, -0.35], [-11.6, -0.75], [-10.0, -1.05],
    [-8.4, -0.55], [-10.5, 4.2], [-15.5, headTop - 0.6], [headX, headTop],
  ];
  // Profil XZ düzleminde: CrossSection (x, z) → extrude Y yönüne
  let blade = new K.CrossSection([prof]).extrude(bw).rotate([90, 0, 0]).translate([0, yOut, 0]);
  // Uç oturma yuvası (bıçak ve baş içine)
  const slot = box(K, -Li - 0.2, 0.5, yc - w / 2 - 0.05, yc + w / 2 + 0.05, -hi - 0.02, 0.05);
  let body = shank.add(head).add(blade).subtract(slot);
  // Esneme yarığı: ucun arkasından başın içine, sonunda yuvarlak delik
  body = body.subtract(box(K, headX - 9, -Li + 0.5, -half - 1, half + 1, -0.75, -0.25));
  body = body.subtract(cylBetween(K, [headX - 9, -half - 1, -0.5], [headX - 9, half + 1, -0.5], 1.1));
  // Sıkma vidası: başın tepesinden, ucun arka ucu hizasında
  const sx = headX - 4.5, sy = 0.5;
  body = body.subtract(cylZ(K, 3.6, 3.6, headTop - 2.4, headTop + 2, 48, sx, sy));
  S.add(part(body, rm.body, 30, 1.6));
  S.add(screwHead(K, rm, sx, sy, headTop - 0.5, 3.3, 3));
  // MGMN uç: iki uçlu, uçlarda 7° boşluk ve talaş kırıcı, ortada üst çenenin oturduğu V
  const insProf: P2[] = [
    [0, 0], [-0.72, -hi], [-Li + 0.72, -hi], [-Li, 0], [-Li + 0.4, 0], [-Li + 1.2, -0.36], [-Li + 2.2, -0.12], [-Li + 4.6, -0.52],
    [-Li / 2, -1.02], [-4.6, -0.52], [-2.2, -0.12], [-1.2, -0.36], [-0.4, 0],
  ];
  const insM = new K.CrossSection([insProf.map(([x, z]) => [x, z] as P2).reverse()]).extrude(w - 0.02).rotate([90, 0, 0]).translate([0, yc + w / 2 - 0.01, 0]);
  S.add(part(insM, m.tin, 30, 0.6));
  const mk = marking(o.code, 40, 4.0);
  mk.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)));
  mk.position.set(headX - 50, half + 0.03, -H * 0.45);
  S.add(mk);
  return S;
}
