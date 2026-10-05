// Ürün görselleri için katı modelleme (yalnızca scripts/render-products.mjs sırasında kullanılır,
// siteye gönderilmez). Parçalar gerçek takımlar gibi "talaş kaldırılarak" (boolean) üretilir.
// Modelleme uzayı: Z yukarı (manifold). three'ye aktarırken (x, y, z) → (x, z, −y) çevrilir.
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import Module from 'manifold-3d/manifold';
import wasmUrl from 'manifold-3d/manifold.wasm?url';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type M = any;
let W: any = null;
export async function kit() {
  if (!W) {
    W = await (Module as any)({ locateFile: () => wasmUrl });
    W.setup();
    W.setMinCircularAngle?.(4);
    W.setMinCircularEdgeLength?.(0.25);
  }
  return W as { Manifold: any; CrossSection: any };
}

export type P2 = [number, number];
export const deg = Math.PI / 180;

/** Eksen hizalı kutu */
export function box(K: any, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): M {
  return K.Manifold.cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0]);
}
/** XY çokgeni (saat yönü tersine) z0..z1 arasında prizma */
export function prism(K: any, pts: P2[], z0: number, z1: number): M {
  return new K.CrossSection([pts]).extrude(z1 - z0).translate([0, 0, z0]);
}
/** Z ekseni boyunca silindir/koni (z0..z1) */
export function cylZ(K: any, r0: number, r1: number, z0: number, z1: number, seg = 64, x = 0, y = 0): M {
  return K.Manifold.cylinder(z1 - z0, r0, r1, seg).translate([x, y, z0]);
}
/** (r, z) profilini Z ekseni etrafında döndür */
export function revolveZ(K: any, prof: P2[], seg = 128): M {
  return new K.CrossSection([prof]).revolve(seg);
}
/** Kesit (y, z) çokgenini X ekseni boyunca x0..x1 çek */
export function barX(K: any, sec: P2[], x0: number, x1: number): M {
  // extrude: (u, v, w) → döndür: (w, u, v)
  return new K.CrossSection([sec]).extrude(x1 - x0).rotate([90, 0, 90]).translate([x0, 0, 0]);
}
/** Pahlı dikdörtgen kesit (y0..y1, z0..z1, pah c) */
export function chamferRect(y0: number, y1: number, z0: number, z1: number, c: number): P2[] {
  return [[y0 + c, z0], [y1 - c, z0], [y1, z0 + c], [y1, z1 - c], [y1 - c, z1], [y0 + c, z1], [y0, z1 - c], [y0, z0 + c]];
}
/** n·p > d bölgesini (n normalize edilir) kaldır */
export function cutAbove(m: M, n: [number, number, number], d: number): M {
  const l = Math.hypot(...n);
  return m.trimByPlane([-n[0] / l, -n[1] / l, -n[2] / l], -d / l);
}
/** Bir noktadan geçen düzlemin n yönündeki tarafını kaldır */
export function cutBeyond(m: M, n: [number, number, number], p: [number, number, number]): M {
  return cutAbove(m, n, n[0] * p[0] + n[1] * p[1] + n[2] * p[2]);
}

/** 2B yardımcılar */
export const add2 = (a: P2, b: P2, k = 1): P2 => [a[0] + b[0] * k, a[1] + b[1] * k];
export const dir2 = (angDeg: number): P2 => [Math.cos(angDeg * deg), Math.sin(angDeg * deg)];
export const rot2 = (p: P2, a: number): P2 => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
/** Çokgeni içe/dışa ötele (manifold offset; köşeler keskin) */
export function offsetPoly(K: any, pts: P2[], d: number): P2[] {
  const cs = new K.CrossSection([pts]).offset(d, 'Miter', 4);
  const polys = cs.toPolygons();
  return polys[0].map((v: any) => [v[0], v[1]] as P2);
}

/** Manifold → three geometrisi (kırışık açısına göre düz/yumuşak normaller) */
export function toGeo(m: M, crease = 32, refine = 0): THREE.BufferGeometry {
  if (refine > 0) m = m.refineToLength(refine);
  const mesh = m.getMesh();
  const np = mesh.numProp;
  const n = mesh.vertProperties.length / np;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = mesh.vertProperties[i * np]; pos[i * 3 + 1] = mesh.vertProperties[i * np + 1]; pos[i * 3 + 2] = mesh.vertProperties[i * np + 2]; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(mesh.triVerts), 1));
  return toCreasedNormals(g, crease * deg);
}
/** Manifold parçasını malzemesiyle mesh yap (modelleme uzayında) */
export function part(m: M, mat: THREE.Material, crease = 32, refine = 0) {
  const mesh = new THREE.Mesh(toGeo(m, crease, refine), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
/** Modelleme uzayı grubu (Z yukarı) → three uzayı (Y yukarı) */
export function space() {
  const g = new THREE.Group();
  g.rotation.x = -Math.PI / 2;
  return g;
}

/** Lazer markalama: yüzeye yapışık saydam yazı (modelleme uzayında XY düzleminde, +Z'ye bakar) */
export function marking(text: string, w: number, h: number, opts: { color?: string; font?: string } = {}) {
  const c = document.createElement('canvas');
  const pxPerMm = 24;
  c.width = Math.round(w * pxPerMm);
  c.height = Math.round(h * pxPerMm);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = opts.color ?? 'rgba(40,44,50,0.82)';
  ctx.font = opts.font ?? `600 ${Math.round(h * pxPerMm * 0.62)}px "IBM Plex Mono", "DejaVu Sans Mono", monospace`;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, metalness: 0.4, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return plane;
}

/** Ürün görselleri için malzemeler */
export function realMats() {
  return {
    /** Gri metalik kater gövdesi (taşlanmış, ıslah çeliği) */
    body: new THREE.MeshPhysicalMaterial({ color: 0x737a83, metalness: 1, roughness: 0.36, envMapIntensity: 0.95, vertexColors: true }),
    /** Daha açık, ince taşlanmış yüzey (bara, pens tutucu) */
    ground: new THREE.MeshPhysicalMaterial({ color: 0xb4b9bf, metalness: 1, roughness: 0.26, envMapIntensity: 1.1, vertexColors: true }),
    /** Parlak HSS / pens çeliği */
    bright: new THREE.MeshPhysicalMaterial({ color: 0xc7cbd0, metalness: 1, roughness: 0.2, envMapIntensity: 1.0, vertexColors: true }),
    /** Karbür altlık (shim) */
    shim: new THREE.MeshPhysicalMaterial({ color: 0x6c7178, metalness: 1, roughness: 0.42, envMapIntensity: 1.0, vertexColors: true }),
    /** Siyah oksit vida */
    screw: new THREE.MeshPhysicalMaterial({ color: 0x33373d, metalness: 1, roughness: 0.36, envMapIntensity: 1.1, vertexColors: true }),
    /** Vida soketinin karanlık içi */
    socket: new THREE.MeshBasicMaterial({ color: 0x0a0b0d }),
  };
}
export type RealMats = ReturnType<typeof realMats>;
