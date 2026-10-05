// Döner parçalar: punta matkabı (DIN 333 A), ER pens (DIN 6499), çektirme civatası (MAS 403 P40T-1),
// BT40 ER32 pens tutucu. Modelleme uzayında eksen +Z.
import * as THREE from 'three';
import { radialSurface, type ToolMats } from '../tools3d';
import { kit, box, cylZ, revolveZ, part, space, marking, deg, type P2, type RealMats, type M } from './kit';

const TAU = Math.PI * 2;
/** three geometrisini (eksen +Y) modelleme uzayına (eksen +Z) çevir */
const yToZ = (g: THREE.BufferGeometry) => g.rotateX(Math.PI / 2);

/** Oluk: ekseni ana eksene paralel, eksenden c uzaklıkta, yarıçapı fr olan silindirin kestiği yüzey */
function fluteR(rp: number, dTheta: number, c: number, fr: number) {
  const s = c * Math.sin(dTheta), k = fr * fr - s * s;
  if (k <= 0) return rp;
  const cc = c * Math.cos(dTheta);
  const rn = cc - Math.sqrt(k), rf = cc + Math.sqrt(k);
  if (rn > rp || rf < rp) return rp;
  return Math.max(0.04, rn);
}
const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** DIN 333 A punta matkabı (d1 × d2 × l1), iki uçlu, her uçta iki oluk */
export function buildCenterDrillReal(rm: RealMats, d1 = 2.5, d2 = 6.3, l1 = 45, l2 = 3.1) {
  const S = space();
  const rp = d1 / 2, rb = d2 / 2;
  const tipL = rp / Math.tan(59 * deg);
  const coneL = (rb - rp) / Math.tan(30 * deg);
  const prof = (s: number) => (s < tipL ? s * Math.tan(59 * deg) : s < l2 ? rp : s < l2 + coneL ? rp + (s - l2) * Math.tan(30 * deg) : rb);
  const fluteEnd = l2 + coneL + 0.6;
  const ys: number[] = [];
  for (let i = 0; i <= 900; i++) ys.push((l1 * i) / 900);
  const geo = radialSurface(420, ys, (t, y) => {
    const near = y < l1 / 2;
    const s = near ? y : l1 - y;
    const r0 = Math.min(prof(s), rb) - (s > 1.2 && s < 1.8 && false ? 0 : 0);
    // Uçlarda 2 oluk; hafif helis; gövdeye doğru yay biçiminde çıkış
    const helix = (near ? 1 : -1) * s * 0.07;
    // Oluk pilotta dar (öz ≈ 0,2 mm), havşa boyunca genişler ve gövdeye yay çizerek çıkar
    const k = Math.max(0, s - l2);
    const run = Math.max(0, s - fluteEnd);
    const c = 1.45 + k * 0.52 + run * run * 1.1;
    const fr = rp + k * 0.26;
    let r = r0;
    for (const a0 of [0, Math.PI]) r = Math.min(r, fluteR(r0, wrapA(t - a0 - helix - (near ? 0 : Math.PI / 2)), c, fr));
    return r;
  }, false, false);
  S.add(part2(yToZ(geo), rm.bright));
  return S;
}
/** three geometrisinden mesh (gölge alır) */
function part2(g: THREE.BufferGeometry, mat: THREE.Material) {
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  return m;
}

/** ER pens (DIN 6499 / ISO 15488) — ER32 ölçüleri, iki uçtan sırayla 8+8 yarık */
export async function buildColletReal(rm: RealMats, bore = 10) {
  const K = await kit();
  const S = space();
  const rb = bore / 2;
  const prof: P2[] = [
    [rb + 0.8, 0], [11.6, 0], [12.1, 0.5], [16.5, 31.8], [16.5, 33.0], [15.7, 33.5], [15.7, 34.5], [16.5, 35.0], [16.5, 35.6],
    [14.0, 40], [rb + 1.4, 40], [rb, 38.6], [rb, 1.4],
  ];
  let c = revolveZ(K, prof, 200);
  const slot = (a: number, z0: number, z1: number, hz: number) => {
    let s = box(K, rb - 1, 19, -0.45, 0.45, z0, z1);
    s = s.add(K.Manifold.cylinder(20, 0.75, 0.75, 20).rotate([0, 90, 0]).translate([rb - 1, 0, hz]));
    return s.rotate([0, 0, a]);
  };
  const cuts: M[] = [];
  for (let i = 0; i < 8; i++) {
    cuts.push(slot(i * 45, 7, 41, 7));
    cuts.push(slot(22.5 + i * 45, -1, 31, 31));
  }
  c = c.subtract(K.Manifold.union(cuts));
  S.add(part(c, rm.bright, 28, 0.9));
  // Delik içi (karanlık): iç yüzey zaten gölgede; ön ve arkadan bakınca derinlik hissi için koyu kapak
  const cap = new THREE.Mesh(new THREE.CircleGeometry(rb - 0.02, 48), rm.socket);
  cap.position.z = 20;
  S.add(cap);
  return S;
}

/** Helis diş yüzeyi (eksen +Z): z0..z1, iç/dış yarıçap, hatve */
function threadGeo(z0: number, z1: number, rMin: number, rMaj: number, P: number) {
  const ys: number[] = [];
  const n = Math.round(((z1 - z0) / P) * 40);
  for (let i = 0; i <= n; i++) ys.push(z0 + ((z1 - z0) * i) / n);
  const g = radialSurface(160, ys, (t, y) => {
    const u = (((y - z0) / P - t / TAU) % 1 + 1) % 1;
    const tri = 1 - Math.abs(2 * u - 1);
    let r = rMin + (rMaj - rMin) * Math.min(1, tri * 1.25);
    // Uçlarda pah (ilk ve son dişler)
    const fade = Math.min(1, (y - z0) / (P * 0.8), (z1 - y) / (P * 0.8));
    r = Math.min(r, rMin + (rMaj - rMin) * Math.max(0, fade));
    return r;
  }, false, false);
  return yToZ(g);
}

/** MAS 403 P40T-1 çektirme civatası (M16, 45°, Ø4 soğutma deliği). z = 0 diş ucu, z = 60 baş. */
export async function buildPullStudReal(rm: RealMats) {
  const K = await kit();
  const S = space();
  const prof: P2[] = [
    [2.0, 0], [6.4, 0], [6.65, 0.4], [6.65, 22], [8.5, 22], [8.5, 24.6], [11.0, 25], [11.5, 25.5], [11.5, 30.5], [11.0, 31], [8.5, 31],
    [8.5, 34.6], [5.0, 38.6], [5.0, 51.5], [7.5, 54.0], [7.5, 58.6], [6.6, 60], [2.0, 60],
  ];
  let st = revolveZ(K, prof, 160);
  // Flanşta anahtar ağzı (19 mm)
  st = st.subtract(box(K, -20, 20, 9.5, 20, 24.8, 31.2)).subtract(box(K, -20, 20, -20, -9.5, 24.8, 31.2));
  S.add(part(st, rm.bright, 30, 0.8));
  const th = new THREE.Mesh(threadGeo(0.3, 21.8, 6.62, 7.95, 2.0), rm.bright);
  S.add(th);
  return S;
}

/** BT40 ER32-70 pens tutucu + ER32 somun + pens + çektirme civatası. z = 0 konik küçük ucu. */
export async function buildBT40Real(rm: RealMats) {
  const K = await kit();
  const S = space();
  const tL = 65.4, rS = 12.7, rG = 22.225;
  const fl0 = tL + 2, fl1 = fl0 + 25, R = 31.75;
  const body1 = fl1 + 21, nose = tL + 70;
  const prof: P2[] = [
    [8.5, 0], [rS - 0.6, 0], [rS, 0.6], [rG, tL], [rG + 1.2, tL + 0.4], [26, fl0 - 0.3], [R - 0.8, fl0], [R, fl0 + 0.8],
    // V kanal (60°)
    [R, fl0 + 8.6], [R - 5.2, fl0 + 11.6], [R - 5.2, fl0 + 13.4], [R, fl0 + 16.4], [R, fl1 - 0.8], [R - 0.8, fl1],
    [22.5, fl1], [21, fl1 + 1.5], [21, body1 - 1.5], [19.5, body1], [8.5, body1],
  ];
  let h = revolveZ(K, prof, 200);
  // Kama yuvaları (2 adet, 16,1 mm) ve yön çentiği
  h = h.subtract(box(K, 24.5, 40, -8.05, 8.05, fl0 - 1, fl1 + 1)).subtract(box(K, -40, -24.5, -8.05, 8.05, fl0 - 1, fl1 + 1));
  h = h.subtract(cylZ(K, 2.6, 2.6, fl1 - 4, fl1 + 1, 24, 0, -R + 1.2));
  // Kısa iç delik (çektirme civatası)
  h = h.subtract(cylZ(K, 8.2, 8.2, -1, 25, 48));
  S.add(part(h, rm.ground, 30, 1.4));
  // ER32 somun: Ø50, çevrede 6 anahtar çentiği, önde pah ve açıklık
  const nProf: P2[] = [[18.5, body1 + 0.4], [24.2, body1 + 0.4], [25, body1 + 1.2], [25, nose - 2.2], [23.6, nose - 0.4], [21, nose], [17.6, nose], [16.9, nose - 0.7], [16.9, nose - 6], [18.5, nose - 9]];
  let nut = revolveZ(K, nProf, 200);
  const notches: M[] = [];
  for (let i = 0; i < 6; i++) notches.push(box(K, 22.6, 27, -2.6, 2.6, body1 + 0.2, body1 + 9.5).rotate([0, 0, i * 60 + 30]));
  nut = nut.subtract(K.Manifold.union(notches));
  S.add(part(nut, rm.bright, 30, 1.2));
  // Pens: ön yüzü somun açıklığında
  const col = await buildColletReal(rm, 12);
  col.rotation.x = 0;
  const colG = new THREE.Group();
  colG.add(...col.children.map((c) => c));
  colG.position.z = nose - 40.6;
  S.add(colG);
  // Çektirme civatası: flanşı tutucunun küçük ucuna dayalı, dişi içeride
  const ps = await buildPullStudReal(rm);
  const psG = new THREE.Group();
  psG.add(...ps.children.map((c) => c));
  psG.rotation.x = Math.PI;
  psG.position.z = 25;
  S.add(psG);
  // Markalama gövde üstünde (küçük düz alanda değil, flanş ön yüzünde)
  const mk = marking('BT40-ER32-70', 30, 3.2);
  mk.position.set(0, -R + 4.2, fl1 + 0.04);
  S.add(mk);
  return S;
}
