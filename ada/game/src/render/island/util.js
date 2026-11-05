// Ada çiziminde ortak yardımcılar: gürültü, renk boyama, tombul şekiller, örnekleme.
import * as THREE from 'three/webgpu';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const lerp = (a, b, t) => a + (b - a) * t;
export const UP = new THREE.Vector3(0, 1, 0);

export function valueNoise2(seed = 1) {
  const perm = new Uint8Array(512);
  let s = seed;
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const hash = (x, y) => perm[(perm[x & 255] + y) & 511] / 255;
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  return (x, y, oct = 4) => {
    let v = 0, amp = 0.5, f = 1, tot = 0;
    for (let i = 0; i < oct; i++) {
      v += n(x * f, y * f) * amp;
      tot += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return v / tot;
  };
}

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// Köşe renkleri: alttan üste koyudan açığa (sahte ortam gölgesi), isteğe bağlı üst renk
export function paint(geo, base, { bottom = 0.62, top = 1.08, topColor = null, topFrom = 0.7, noiseAmt = 0, seed = 1 } = {}) {
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const p = geo.attributes.position;
  const c = new THREE.Color(base);
  const tc = topColor != null ? new THREE.Color(topColor) : null;
  const out = new Float32Array(p.count * 3);
  const tmp = new THREE.Color();
  const nz = noiseAmt ? valueNoise2(seed) : null;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) - min.y) / Math.max(1e-4, max.y - min.y);
    let k = lerp(bottom, top, t);
    if (nz) k *= 1 + (nz(p.getX(i) * 1.7 + 3, p.getZ(i) * 1.7 + p.getY(i) * 1.3, 3) - 0.5) * noiseAmt;
    tmp.copy(c);
    if (tc) tmp.lerp(tc, smoothstep(topFrom, 1, t));
    out.set([tmp.r * k, tmp.g * k, tmp.b * k], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(out, 3));
  return geo;
}

// Gürültüyle şişirilmiş yuvarlak şekil (kaya, çalı, bulut)
export function blob(radius, detail, amount, seed, freq = 1, squash = 1) {
  let g = new THREE.IcosahedronGeometry(radius, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const noise = valueNoise2(seed);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 1 + (noise(v.x * freq + 10, v.y * freq + v.z * freq + 3, 4) - 0.5) * amount;
    v.multiplyScalar(k);
    v.y *= squash;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  // basit küresel doku koordinatı (normal haritası için)
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    uv.set([Math.atan2(v.z, v.x) / Math.PI * 2, v.y * 1.5], i * 2);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

export function merge(parts, keep = ['position', 'normal', 'color', 'uv']) {
  return mergeGeometries(
    parts.map((g) => {
      const n = g.index ? g.toNonIndexed() : g.clone();
      for (const k of Object.keys(n.attributes)) if (!keep.includes(k)) n.deleteAttribute(k);
      for (const k of keep) {
        if (n.attributes[k]) continue;
        if (k === 'color') n.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 3).fill(1), 3));
        if (k === 'uv') n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
      }
      return n;
    }),
  );
}

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpE = new THREE.Euler();
export function makeInstancer(scene, shadows) {
  return function instanced(geo, material, list, { shadow = true, receive = true } = {}) {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, material, list.length);
    list.forEach((it, i) => {
      if (it.q) tmpQ.copy(it.q);
      else tmpQ.setFromEuler(tmpE.set(it.rx || 0, it.ry || 0, it.rz || 0, 'YXZ'));
      tmpS.set(it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.s ?? 1);
      im.setMatrixAt(i, tmpM.compose(tmpP.set(it.x, it.y, it.z), tmpQ, tmpS));
      if (it.color) im.setColorAt(i, it.color);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = shadow && shadows;
    im.receiveShadow = receive && shadows;
    im.frustumCulled = false;
    scene.add(im);
    return im;
  };
}

// Yol çerçevesine göre yerleştirme yardımcıları
export function pathTools(path) {
  const along = (z, x = 0, y = 0) => {
    const f = path.frame(z);
    return f.pos.clone().addScaledVector(f.right, x).addScaledVector(UP, y);
  };
  const yawAt = (z) => {
    const f = path.frame(z);
    return Math.atan2(f.tan.x, f.tan.z);
  };
  const quatAt = (z, extra = new THREE.Euler()) => new THREE.Quaternion().setFromAxisAngle(UP, yawAt(z)).multiply(new THREE.Quaternion().setFromEuler(extra));
  return { along, yawAt, quatAt };
}
