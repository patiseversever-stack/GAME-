// Bitki örtüsü: kodla boyanmış yaprak dokuları (palmiye yaprağı, yaprak kümesi, eğrelti, ot) ve
// bunlardan kurulan palmiye, tropik ağaç, çalı, eğrelti, muz bitkisi ve ot tutamları. Rüzgârda hafifçe salınır.
import * as THREE from 'three/webgpu';
import { positionLocal, time, sin, vec3, float } from 'three/tsl';
import { paint, merge, rng, smoothstep, pathTools } from './util.js';

// ---------- dokular ---------------------------------------------------------------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  return t;
}
const R0 = rng(1234);
const hsl = (h, s, l) => `hsl(${h},${s}%,${l}%)`;

// palmiye yaprağı: ortada damar, iki yana eğik yaprakçıklar; uçlara doğru sararır
const palmFrondTex = () => canvasTex(512, 160, (ctx, w, h) => {
  const cy = h / 2;
  for (let i = 0; i < 46; i++) {
    const t = i / 46;
    const x = 20 + t * (w - 40);
    const len = (Math.sin(t * Math.PI) * 0.85 + 0.15) * (h * 0.48);
    for (const dir of [-1, 1]) {
      const g = ctx.createLinearGradient(x, cy, x + len * 0.5, cy + dir * len);
      g.addColorStop(0, hsl(95 - t * 25, 48, 22 + t * 6));
      g.addColorStop(1, hsl(80 - t * 28, 55, 36 + t * 10));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 3, cy);
      ctx.quadraticCurveTo(x + len * 0.18, cy + dir * len * 0.55, x + len * 0.55, cy + dir * len);
      ctx.quadraticCurveTo(x + len * 0.22, cy + dir * len * 0.4, x + 6, cy);
      ctx.fill();
    }
  }
  ctx.strokeStyle = hsl(60, 35, 28);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(10, cy);
  ctx.lineTo(w - 10, cy);
  ctx.stroke();
});

// yaprak kümesi: üst üste binmiş elips yapraklar, kenarları koyu
const leafClusterTex = (hue = 100) => canvasTex(256, 256, (ctx, w, h) => {
  for (let i = 0; i < 70; i++) {
    const a = R0() * Math.PI * 2;
    const r = Math.sqrt(R0()) * w * 0.38;
    const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r;
    const lw = 16 + R0() * 16, lh = 30 + R0() * 22;
    const light = 22 + R0() * 22 + (1 - y / h) * 10;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2 + (R0() - 0.5) * 0.8);
    const g = ctx.createLinearGradient(0, -lh / 2, 0, lh / 2);
    g.addColorStop(0, hsl(hue - 8 + R0() * 16, 50, light + 10));
    g.addColorStop(1, hsl(hue + R0() * 10, 45, light - 6));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, lw / 2, lh / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,40,10,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(210,240,150,0.25)';
    ctx.beginPath();
    ctx.moveTo(0, -lh / 2 + 3);
    ctx.lineTo(0, lh / 2 - 3);
    ctx.stroke();
    ctx.restore();
  }
});

// eğrelti: ince yaprakçıklı uzun yaprak
const fernTex = () => canvasTex(256, 96, (ctx, w, h) => {
  const cy = h / 2;
  for (let i = 0; i < 34; i++) {
    const t = i / 34;
    const x = 10 + t * (w - 20);
    const len = Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.95) * h * 0.46 + 3;
    for (const dir of [-1, 1]) {
      ctx.fillStyle = hsl(105 - t * 12, 46, 24 + t * 14 + R0() * 4);
      ctx.beginPath();
      ctx.ellipse(x + len * 0.25, cy + dir * len * 0.5, 3.2, len * 0.52, dir * -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = hsl(90, 40, 22);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(4, cy);
  ctx.lineTo(w - 6, cy);
  ctx.stroke();
});

// ot tutamı: farklı boy ve tonda bıçak yapraklar
const grassTex = () => canvasTex(256, 128, (ctx, w, h) => {
  for (let i = 0; i < 46; i++) {
    const x = 8 + R0() * (w - 16);
    const hh = h * (0.45 + R0() * 0.55);
    const lean = (R0() - 0.5) * 30;
    const g = ctx.createLinearGradient(x, h, x + lean, h - hh);
    g.addColorStop(0, hsl(95, 45, 18));
    g.addColorStop(1, hsl(75 + R0() * 20, 55, 42 + R0() * 14));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 3, h);
    ctx.quadraticCurveTo(x + lean * 0.3, h - hh * 0.6, x + lean, h - hh);
    ctx.quadraticCurveTo(x + lean * 0.35, h - hh * 0.55, x + 3, h);
    ctx.fill();
  }
});

// muz/kürek yaprağı
const bananaTex = () => canvasTex(256, 128, (ctx, w, h) => {
  const cy = h / 2;
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, hsl(105, 45, 22));
  g.addColorStop(1, hsl(88, 52, 38));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(6, cy);
  ctx.bezierCurveTo(w * 0.3, -h * 0.05, w * 0.8, h * 0.02, w - 4, cy);
  ctx.bezierCurveTo(w * 0.8, h * 0.98, w * 0.3, h * 1.05, 6, cy);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,40,10,0.35)';
  for (let i = 0; i < 26; i++) {
    const x = 14 + (i / 26) * (w - 30);
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.lineTo(x + 12, cy - h * 0.42);
    ctx.moveTo(x, cy);
    ctx.lineTo(x + 12, cy + h * 0.42);
    ctx.stroke();
  }
  // yırtıklar
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) {
    const x = 40 + R0() * (w - 80);
    const dir = R0() < 0.5 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(x, cy + dir * h * 0.08);
    ctx.lineTo(x + 18, cy + dir * h * 0.6);
    ctx.lineTo(x + 22, cy + dir * h * 0.6);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = hsl(70, 40, 55);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(6, cy);
  ctx.lineTo(w - 6, cy);
  ctx.stroke();
});

// ---------- geometriler -------------------------------------------------------------
// Bükülmüş yaprak şeridi (palmiye/eğrelti/muz): kök (0,0,0), +X yönünde uzanır, aşağı sarkar
function frond(length, width, droop, segs = 10, curlUp = 0.25) {
  const g = new THREE.PlaneGeometry(length, width, segs, 2).translate(length / 2, 0, 0);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const t = x / length;
    p.setY(i, curlUp * length * t - droop * length * t * t + Math.abs(z) * 0.35);
  }
  g.computeVertexNormals();
  return g;
}
// küre biçimli yumuşak normaller: yaprak kümeleri ışığı yumuşak alsın
function sphericalNormals(g, center = new THREE.Vector3()) {
  const p = g.attributes.position;
  const n = new Float32Array(p.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).sub(center).normalize();
    v.y = v.y * 0.8 + 0.25;
    v.normalize();
    n.set([v.x, v.y, v.z], i * 3);
  }
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return g;
}
const white = (g) => paint(g, 0xffffff, { bottom: 0.55, top: 1.1 });

export function createFoliage({ scene, course, path, terrain, quality, instanced }) {
  const { along } = pathTools(path);
  const sec = Object.fromEntries(course.sections.map((s) => [s.id, s]));
  const zip = course.hazards.find((h) => h.type === 'zip');
  const bridge = course.hazards.find((h) => h.type === 'bridge');
  const R = rng(4242);
  const lowQ = quality.key === 'dusuk';

  const tex = { palm: palmFrondTex(), leaf: leafClusterTex(100), leaf2: leafClusterTex(85), fern: fernTex(), grass: grassTex(), banana: bananaTex() };
  // rüzgâr: yükseldikçe artan hafif salınım
  const sway = (amp, speed) => positionLocal.add(vec3(sin(time.mul(speed).add(positionLocal.y.mul(0.6)).add(positionLocal.x.mul(0.3))).mul(positionLocal.y.mul(amp)), float(0), sin(time.mul(speed * 0.8).add(positionLocal.z.mul(0.4))).mul(positionLocal.y.mul(amp * 0.6))));
  const leafMat = (map, amp = 0.012, speed = 1.6) => {
    const m = new THREE.MeshLambertNodeMaterial({ map, alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true });
    m.positionNode = sway(amp, speed);
    return m;
  };
  const M = {
    palm: leafMat(tex.palm, 0.01, 1.3),
    leaf: leafMat(tex.leaf, 0.008, 1.5),
    leaf2: leafMat(tex.leaf2, 0.008, 1.5),
    fern: leafMat(tex.fern, 0.03, 2.1),
    grass: leafMat(tex.grass, 0.05, 2.6),
    banana: leafMat(tex.banana, 0.02, 1.4),
    bark: new THREE.MeshLambertNodeMaterial({ vertexColors: true }),
  };

  // palmiye: kıvrık boğumlu gövde + 11 yaprak + hindistancevizleri
  const palm = (() => {
    const segs = 11;
    const parts = [];
    let top = new THREE.Vector3();
    for (let i = 0; i < segs; i++) {
      const t = i / segs;
      const g = new THREE.CylinderGeometry(0.21 - t * 0.06, 0.25 - t * 0.06, 0.82, 9, 1);
      const bend = Math.pow(t, 1.8) * 2.0;
      g.rotateZ(-Math.pow(t, 0.8) * 0.32);
      g.translate(bend, i * 0.78 + 0.4, 0);
      paint(g, i % 2 ? 0x8f6a46 : 0x7d5b3a, { bottom: 0.72, top: 1.05 });
      parts.push(g);
      top.set(bend, i * 0.78 + 0.8, 0);
    }
    const trunk = merge(parts);
    const crown = [];
    const n = 11;
    for (let i = 0; i < n; i++) {
      const f = frond(3.6 + R() * 0.8, 1.05, 0.55 + R() * 0.35, 10, 0.35);
      f.rotateZ(-0.1 + (i % 3) * 0.12);
      f.rotateY((i / n) * Math.PI * 2 + R() * 0.3);
      f.translate(top.x, top.y, top.z);
      crown.push(paint(f, 0xffffff, { bottom: 0.75, top: 1.05 }));
    }
    for (let i = 0; i < 4; i++) {
      const c = new THREE.SphereGeometry(0.16, 8, 6);
      c.translate(top.x + Math.cos(i * 1.6) * 0.22, top.y - 0.22, Math.sin(i * 1.6) * 0.22);
      paint(c, 0x5d4126);
      parts.push(c);
    }
    return { trunk: merge(parts), crown: merge(crown) };
  })();

  // tropik ağaç: gövde, dallar, yaprak kümesi kartları
  const tree = (() => {
    const wood = [];
    const t = new THREE.CylinderGeometry(0.3, 0.55, 5.2, 9, 3).translate(0, 2.6, 0);
    wood.push(paint(t, 0x6e5034, { bottom: 0.7, top: 1.0 }));
    const leaves = [];
    const centers = [];
    for (let b = 0; b < 4; b++) {
      const a = (b / 4) * Math.PI * 2 + R() * 0.6;
      const len = 1.6 + R() * 1.2;
      const br = new THREE.CylinderGeometry(0.1, 0.18, len, 6).translate(0, len / 2, 0);
      br.rotateZ(-0.9 + R() * 0.3);
      br.rotateY(a);
      br.translate(0, 4.3 + R() * 0.8, 0);
      wood.push(paint(br, 0x6e5034, { bottom: 0.75, top: 1.0 }));
      centers.push(new THREE.Vector3(Math.cos(a) * len * 0.8, 5.6 + R() * 1.4, -Math.sin(a) * len * 0.8));
    }
    centers.push(new THREE.Vector3(0, 6.8, 0));
    for (const c of centers) {
      const rad = 1.7 + R() * 0.8;
      for (let k = 0; k < 9; k++) {
        const q = new THREE.PlaneGeometry(rad * 1.5, rad * 1.5);
        q.rotateX((R() - 0.5) * Math.PI);
        q.rotateY(R() * Math.PI);
        const dir = new THREE.Vector3(R() - 0.5, R() * 0.8 - 0.1, R() - 0.5).normalize().multiplyScalar(rad * 0.55);
        q.translate(c.x + dir.x, c.y + dir.y, c.z + dir.z);
        leaves.push(q);
      }
    }
    const L = merge(leaves);
    sphericalNormals(L, new THREE.Vector3(0, 6.2, 0));
    paint(L, 0xffffff, { bottom: 0.55, top: 1.12 });
    return { wood: merge(wood), leaves: L };
  })();

  // çalı: kubbe şeklinde yaprak kümesi kartları
  const bush = (() => {
    const parts = [];
    for (let k = 0; k < (lowQ ? 7 : 11); k++) {
      const q = new THREE.PlaneGeometry(1.5, 1.5);
      q.rotateX((R() - 0.5) * 1.6);
      q.rotateY(R() * Math.PI);
      const d = new THREE.Vector3(R() - 0.5, R() * 0.6, R() - 0.5).normalize().multiplyScalar(0.55);
      q.translate(d.x, 0.75 + d.y, d.z);
      parts.push(q);
    }
    const g = merge(parts);
    sphericalNormals(g, new THREE.Vector3(0, 0.4, 0));
    return paint(g, 0xffffff, { bottom: 0.5, top: 1.15 });
  })();

  // eğrelti
  const fern = (() => {
    const parts = [];
    for (let i = 0; i < 9; i++) {
      const f = frond(1.5 + R() * 0.5, 0.55, 0.65, 8, 0.75);
      f.rotateY((i / 9) * Math.PI * 2 + R() * 0.3);
      parts.push(f);
    }
    return paint(merge(parts), 0xffffff, { bottom: 0.6, top: 1.1 });
  })();

  // muz bitkisi: büyük kürek yapraklar
  const banana = (() => {
    const parts = [];
    const stem = new THREE.CylinderGeometry(0.08, 0.14, 1.6, 6).translate(0, 0.8, 0);
    for (let i = 0; i < 6; i++) {
      const f = frond(2.4 + R() * 0.6, 0.9, 0.5, 8, 0.9);
      f.rotateY((i / 6) * Math.PI * 2 + R() * 0.4);
      f.translate(0, 1.2 + R() * 0.5, 0);
      parts.push(f);
    }
    return { leaves: paint(merge(parts), 0xffffff, { bottom: 0.65, top: 1.1 }), stem: paint(stem, 0x6f8a3a) };
  })();

  // ot tutamı: çapraz üç kart
  const grass = (() => {
    const parts = [];
    for (let i = 0; i < 3; i++) {
      const q = new THREE.PlaneGeometry(0.9, 0.5).translate(0, 0.25, 0);
      q.rotateY((i / 3) * Math.PI);
      parts.push(q);
    }
    const g = merge(parts);
    const n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
    return paint(g, 0xffffff, { bottom: 0.7, top: 1.1 });
  })();

  // ---------- yerleşim ------------------------------------------------------------
  const lists = { palm: [], tree: [], bush: [], fern: [], banana: [], grass: [] };
  const cnt = quality.vegetation;
  const cap = { palm: cnt * 0.32, tree: cnt * 0.5, bush: cnt * 0.9, fern: cnt * 0.8, banana: cnt * 0.25, grass: cnt * (lowQ ? 2 : 4.5) };
  const green = (h, s, l) => new THREE.Color().setHSL(h, s, l);
  const at = (s, x) => {
    const f = path.frame(s);
    const wx = f.pos.x + f.right.x * x, wz = f.pos.z + f.right.z * x;
    const h = terrain.heightPath(s, x, f.pos.y, wx, wz);
    const h2 = terrain.heightPath(s + 1, x + 1, path.frame(s + 1).pos.y, wx + f.right.x + f.tan.x, wz + f.right.z + f.tan.z);
    return { x: wx, z: wz, y: h, slope: Math.abs(h2 - h), pathY: f.pos.y };
  };
  const biome = (s) => {
    if (s < sec.ucurum.z0 - 10) return 'jungle';
    if (s < sec.kopru.z0) return 'cliff';
    if (s < zip.z0) return 'ravine';
    if (s < zip.z1 + 6) return 'inlet';
    return 'beach';
  };
  const tries = cnt * 22;
  for (let i = 0; i < tries; i++) {
    const s = path.zMin + R() * (path.zMax - path.zMin);
    const side = R() < 0.5 ? -1 : 1;
    const dRaw = Math.pow(R(), 1.5);
    const d = 3.9 + dRaw * 85;
    const p = at(s, side * d);
    if (p.y < 0.7) continue;
    if (p.slope > 1.6) continue;
    if (Math.abs(p.y - p.pathY) > 30) continue;
    const b = biome(s);
    const it = { x: p.x, y: p.y - 0.12, z: p.z, ry: R() * Math.PI * 2 };
    const roll = R();
    const sandy = p.y < 3.4;
    if (d < 14 && roll < 0.6) {
      if (lists.grass.length < cap.grass) lists.grass.push({ ...it, s: 0.7 + R() * 0.9, color: green(0.24 + R() * 0.05, 0.5, 0.42 + R() * 0.15) });
      continue;
    }
    if (b === 'beach' || sandy) {
      if (roll < 0.5 && lists.palm.length < cap.palm) lists.palm.push({ ...it, rx: (R() - 0.5) * 0.18, rz: (R() - 0.5) * 0.18, s: 0.85 + R() * 0.5, color: green(0.24, 0.45, 0.48 + R() * 0.12) });
      else if (roll < 0.8 && lists.grass.length < cap.grass) lists.grass.push({ ...it, s: 0.8 + R(), color: green(0.17 + R() * 0.05, 0.42, 0.55) });
      else if (lists.bush.length < cap.bush && !sandy) lists.bush.push({ ...it, s: 0.8 + R() * 0.8, color: green(0.26, 0.45, 0.5) });
      continue;
    }
    if (b === 'jungle' || b === 'ravine') {
      if (roll < 0.28 && lists.tree.length < cap.tree) lists.tree.push({ ...it, s: 0.75 + R() * 0.7, color: green(0.25 + R() * 0.06, 0.45, 0.45 + R() * 0.12) });
      else if (roll < 0.45 && lists.fern.length < cap.fern) lists.fern.push({ ...it, s: 0.8 + R() * 0.7, color: green(0.27, 0.5, 0.5) });
      else if (roll < 0.58 && lists.banana.length < cap.banana) lists.banana.push({ ...it, s: 0.85 + R() * 0.5, color: green(0.24, 0.5, 0.5) });
      else if (roll < 0.66 && lists.palm.length < cap.palm) lists.palm.push({ ...it, rx: (R() - 0.5) * 0.15, rz: (R() - 0.5) * 0.15, s: 0.9 + R() * 0.4, color: green(0.24, 0.45, 0.5) });
      else if (lists.bush.length < cap.bush) lists.bush.push({ ...it, s: 0.8 + R() * 0.9, sy: 0.8 + R() * 0.5, color: green(0.25 + R() * 0.05, 0.45, 0.45 + R() * 0.12) });
    } else {
      // uçurum ve koy: rüzgâra açık, çalı ve ot ağırlıklı, yer yer palmiye
      if (roll < 0.15 && lists.palm.length < cap.palm) lists.palm.push({ ...it, rx: (R() - 0.5) * 0.2, rz: (R() - 0.5) * 0.2, s: 0.8 + R() * 0.4, color: green(0.23, 0.45, 0.48) });
      else if (roll < 0.55 && lists.bush.length < cap.bush) lists.bush.push({ ...it, s: 0.7 + R() * 0.8, sy: 0.7 + R() * 0.4, color: green(0.22 + R() * 0.05, 0.42, 0.46 + R() * 0.12) });
      else if (lists.grass.length < cap.grass) lists.grass.push({ ...it, s: 0.8 + R() * 0.8, color: green(0.2 + R() * 0.05, 0.45, 0.5) });
    }
  }

  instanced(palm.trunk, M.bark, lists.palm);
  instanced(palm.crown, M.palm, lists.palm);
  instanced(tree.wood, M.bark, lists.tree);
  instanced(tree.leaves, M.leaf, lists.tree);
  instanced(bush, M.leaf2, lists.bush, { shadow: !lowQ });
  instanced(fern, M.fern, lists.fern, { shadow: false });
  instanced(banana.stem, M.bark, lists.banana, { shadow: false });
  instanced(banana.leaves, M.banana, lists.banana, { shadow: !lowQ });
  instanced(grass, M.grass, lists.grass, { shadow: false });
  return { counts: Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, v.length])) };
}
