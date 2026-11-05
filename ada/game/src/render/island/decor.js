// Ayrıntılar: Suskunlar kalıntıları (oluklu sütunlar, kemerler, oyma taşlar, sarmaşık, moloz),
// uçurum kaya çıkıntıları, kıyı kayaları, yol kenarı taşları, şelale.
import * as THREE from 'three/webgpu';
import { time, uv, vec2, fract, sin, mix, color, float, smoothstep as sstep, positionLocal, vec3 } from 'three/tsl';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { paint, blob, merge, rng, pathTools, smoothstep, UP } from './util.js';
import { LANE_WIDTH } from '../../core/constants.js';

// oluklu sütun gövdesi
function flutedColumn(radius = 0.46, flutes = 16, segs = 6) {
  const g = new THREE.CylinderGeometry(radius, radius * 1.06, 1, flutes * 4, segs, false);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x);
    const r = Math.hypot(v.x, v.z);
    if (r < 1e-3) continue;
    const k = 1 - 0.045 * Math.pow(Math.abs(Math.cos(a * flutes * 0.5)), 3);
    p.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  g.computeVertexNormals();
  return g;
}

// oyma sembol dokusu: Suskunlar'ın ışık-gölge yazısı (parlamaz, taşa kazınmış)
function glyphTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d7c6a4';
  ctx.fillRect(0, 0, 256, 256);
  const r = rng(77);
  ctx.strokeStyle = 'rgba(70,55,40,0.75)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    const cx = 64 + (k % 2) * 128, cy = 64 + Math.floor(k / 2) * 128;
    ctx.beginPath();
    const shape = Math.floor(r() * 4);
    if (shape === 0) { ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.moveTo(cx - 34, cy); ctx.lineTo(cx + 34, cy); }
    else if (shape === 1) { ctx.moveTo(cx, cy - 40); ctx.lineTo(cx + 36, cy + 28); ctx.lineTo(cx - 36, cy + 28); ctx.closePath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 18); }
    else if (shape === 2) { ctx.moveTo(cx - 36, cy - 30); ctx.lineTo(cx, cy + 34); ctx.lineTo(cx + 36, cy - 30); ctx.moveTo(cx - 20, cy - 34); ctx.lineTo(cx + 20, cy - 34); }
    else { ctx.rect(cx - 30, cy - 30, 60, 60); ctx.moveTo(cx - 30, cy); ctx.arc(cx, cy, 14, Math.PI, 0); }
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,245,225,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 236, 236);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createDecor({ scene, course, path, terrain, quality, instanced, mats, deckWidth }) {
  const { along, yawAt } = pathTools(path);
  const sec = Object.fromEntries(course.sections.map((s) => [s.id, s]));
  const zip = course.hazards.find((h) => h.type === 'zip');
  const bridge = course.hazards.find((h) => h.type === 'bridge');
  const R = rng(2024);
  const tint = (hex, j = 0.07) => new THREE.Color(hex).multiplyScalar(1 - j + R() * j * 2);
  const STONE = () => tint(0xdac8a6, 0.07);
  const ground = (s, x) => {
    const f = path.frame(s);
    const wx = f.pos.x + f.right.x * x, wz = f.pos.z + f.right.z * x;
    return { x: wx, z: wz, y: terrain.heightPath(s, x, f.pos.y, wx, wz) };
  };

  const K = {
    fluted: paint(flutedColumn(), 0xffffff, { bottom: 0.74, top: 1.06, noiseAmt: 0.16, seed: 11 }),
    capital: paint(merge([
      new RoundedBoxGeometry(1.35, 0.28, 1.35, 2, 0.05).translate(0, 0.32, 0),
      new THREE.CylinderGeometry(0.62, 0.5, 0.34, 20).translate(0, 0.04, 0),
    ]), 0xffffff, { bottom: 0.8, top: 1.06 }),
    base: paint(merge([
      new RoundedBoxGeometry(1.3, 0.3, 1.3, 2, 0.05).translate(0, 0.15, 0),
      new THREE.CylinderGeometry(0.56, 0.62, 0.22, 20).translate(0, 0.4, 0),
    ]), 0xffffff, { bottom: 0.7, top: 1.04 }),
    block: paint(new RoundedBoxGeometry(1, 1, 1, 2, 0.08), 0xffffff, { bottom: 0.72, top: 1.06, noiseAmt: 0.1, seed: 3 }),
    rubble: paint(blob(1, 1, 0.5, 21, 1.4), 0xffffff, { bottom: 0.7, top: 1.1 }),
    rock: paint(blob(1, 3, 0.6, 33, 0.7, 0.8), 0xffffff, { bottom: 0.6, top: 1.12, noiseAmt: 0.25, seed: 5 }),
    pebble: paint(blob(1, 1, 0.4, 44, 1.2, 0.6), 0xffffff, { bottom: 0.7, top: 1.1 }),
    moss: paint(blob(0.6, 2, 0.45, 3, 2, 0.5), 0x4f8a30, { bottom: 0.75, top: 1.15, topColor: 0x86bb45 }),
  };
  const L = { fluted: [], capital: [], base: [], block: [], rubble: [], rock: [], pebble: [], moss: [], glyph: [] };

  // --- kalıntı yolu: iki yanda sütun sıraları (kimi ayakta, kimi kırık), aralarda duvar kalıntıları
  for (let s = sec.kalinti.z0 + 3; s < sec.kalinti.z1 - 2; s += 9.5 + R() * 4) {
    for (const sx of [-1, 1]) {
      if (R() < 0.18) continue;
      const x = sx * (deckWidth / 2 + 1.9 + R() * 1.2);
      const g = ground(s, x);
      const broken = R() < 0.4;
      const h = broken ? 1.0 + R() * 1.8 : 4.6 + R() * 1.8;
      const lean = broken ? 0 : (R() - 0.5) * 0.06;
      L.base.push({ x: g.x, y: g.y - 0.1, z: g.z, ry: yawAt(s), color: STONE() });
      L.fluted.push({ x: g.x, y: g.y + 0.45 + h / 2, z: g.z, rx: lean, rz: lean, sy: h, ry: R() * 3, color: STONE() });
      if (!broken) {
        L.capital.push({ x: g.x, y: g.y + 0.45 + h, z: g.z, ry: yawAt(s) + (R() - 0.5) * 0.15, color: STONE() });
        L.moss.push({ x: g.x, y: g.y + 0.95 + h, z: g.z, s: 0.8, sy: 0.4, ry: R() * 3 });
      } else {
        L.moss.push({ x: g.x, y: g.y + 0.45 + h, z: g.z, s: 0.55, sy: 0.4, ry: R() * 3 });
        // devrilmiş üst parça yerde
        const fx = x + sx * (1.4 + R()), fs = s + (R() - 0.5) * 2;
        const fg = ground(fs, fx);
        L.fluted.push({ x: fg.x, y: fg.y + 0.38, z: fg.z, rz: Math.PI / 2, ry: R() * 3, sy: 1.6 + R(), s: 0.82, color: STONE() });
      }
      // dibinde moloz
      for (let k = 0; k < 3; k++) {
        const rg = ground(s + (R() - 0.5) * 2.4, x + (R() - 0.5) * 2.4);
        L.rubble.push({ x: rg.x, y: rg.y + 0.05, z: rg.z, rx: R() * 3, ry: R() * 3, s: 0.16 + R() * 0.22, color: STONE() });
      }
    }
    // duvar kalıntısı ve oyma taşlar
    if (R() < 0.6) {
      const sx = R() < 0.5 ? -1 : 1;
      const x0 = sx * (deckWidth / 2 + 5 + R() * 6);
      const n = 4 + Math.floor(R() * 5);
      for (let k = 0; k < n; k++) {
        const levels = 1 + Math.floor(R() * 3 * (1 - Math.abs(k - n / 2) / n));
        for (let lv = 0; lv < levels; lv++) {
          const g = ground(s + k * 1.12, x0);
          L.block.push({ x: g.x, y: g.y + 0.3 + lv * 0.62, z: g.z, ry: yawAt(s) + (R() - 0.5) * 0.12, sx: 1.08, sy: 0.6, sz: 0.9, color: STONE() });
          if (lv === levels - 1 && R() < 0.45) L.moss.push({ x: g.x, y: g.y + 0.62 + lv * 0.62, z: g.z, s: 0.5, sy: 0.35, ry: R() * 3 });
        }
      }
      const g = ground(s + n * 0.5, x0 - sx * 0.48);
      L.glyph.push({ pos: new THREE.Vector3(g.x, g.y + 0.62, g.z), ry: yawAt(s) - sx * Math.PI / 2 });
    }
  }
  // kalıntı yolunun ortasındaki büyük kemer kapı (yolun üstünden geçer, yüksek: engel değil)
  {
    const s = sec.kalinti.z0 + 52;
    for (const sx of [-1, 1]) {
      const g = ground(s, sx * (deckWidth / 2 + 1.0));
      for (let lv = 0; lv < 8; lv++) L.block.push({ x: g.x, y: g.y + 0.35 + lv * 0.72, z: g.z, ry: yawAt(s), sx: 1.3, sy: 0.7, sz: 1.2, color: STONE() });
    }
    const span = deckWidth + 2.0;
    const top = along(s, 0, 6.1);
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (k / 6);
      const p = along(s, Math.cos(a) * (span / 2), 6.1 + Math.sin(a) * 1.4);
      L.block.push({ x: p.x, y: p.y, z: p.z, ry: yawAt(s), rz: -(a - Math.PI / 2) * 0.9, sx: 1.25, sy: 0.7, sz: 1.2, color: STONE() });
    }
    L.moss.push({ x: top.x, y: top.y + 1.9, z: top.z, s: 1.2, sy: 0.5 });
  }
  // büyük yıkık kule (sol)
  {
    const s = sec.kalinti.z0 + 82;
    const c = ground(s, -17);
    for (let lvl = 0; lvl < 20; lvl++) {
      const ring = 11 - Math.floor(lvl / 6);
      for (let k = 0; k < ring; k++) {
        if (lvl > 12 && R() < 0.45) continue;
        const a = (k / ring) * Math.PI * 2 + lvl * 0.29;
        const rad = 4.0 - lvl * 0.075;
        L.block.push({ x: c.x + Math.cos(a) * rad, y: c.y - 0.3 + lvl * 0.8, z: c.z + Math.sin(a) * rad, ry: -a, sx: 2.3, sy: 0.78, sz: 1.15, color: STONE() });
      }
    }
    for (let k = 0; k < 8; k++) L.moss.push({ x: c.x + (R() - 0.5) * 7, y: c.y + 13 + R() * 2.5, z: c.z + (R() - 0.5) * 7, s: 1 + R(), sy: 0.55 });
    for (let k = 0; k < 14; k++) {
      const a = R() * Math.PI * 2, d = 5 + R() * 4;
      L.block.push({ x: c.x + Math.cos(a) * d, y: c.y + 0.25, z: c.z + Math.sin(a) * d, rx: (R() - 0.5) * 0.6, ry: R() * 3, rz: (R() - 0.5) * 0.6, sx: 1.6, sy: 0.6, sz: 0.9, color: STONE() });
    }
  }

  // --- uçurum: kaya çıkıntıları ve kıyı kayaları
  for (let s = sec.ucurum.z0 - 25; s < sec.kopru.z0 + 8; s += 2.2) {
    for (let k = 0; k < 2; k++) {
      const x = 6.5 + R() * 14;
      const g = ground(s + R() * 2, x);
      if (g.y > path.frame(s).pos.y - 1.2) continue;
      L.rock.push({ x: g.x, y: g.y + 0.3, z: g.z, rx: R() * 3, ry: R() * 3, s: 1.2 + R() * 2.6, sy: 0.7 + R() * 0.6, color: tint(0x9c8670, 0.1) });
    }
    if (R() < 0.6) {
      const x = 18 + R() * 26;
      const g = ground(s, x);
      L.rock.push({ x: g.x, y: Math.max(g.y, -1.6) + 0.4, z: g.z, rx: R() * 3, ry: R() * 3, s: 1.6 + R() * 3.5, sy: 0.75, color: tint(0x8c7864, 0.1) });
    }
  }
  // vadi duvarları ve koy kenarları
  for (const [a, b] of [[bridge.z0 - 4, bridge.z1 + 4], [zip.z0 - 2, zip.z1 + 2]]) {
    for (let s = a; s < b; s += 1.6) for (const sx of [-1, 1]) {
      const x = sx * (8 + R() * 22);
      const g = ground(s, x);
      if (g.y < -1.5) continue;
      L.rock.push({ x: g.x, y: g.y + 0.2, z: g.z, rx: R() * 3, ry: R() * 3, s: 0.9 + R() * 2.4, sy: 0.65 + R() * 0.5, color: tint(0xa08a72, 0.1) });
    }
  }
  // yol kenarı çakılları
  for (let s = -20; s < course.length + 30; s += 1.3) {
    if (s > sec.kopru.z0 - 2 && s < zip.z1 + 4) continue;
    for (const sx of [-1, 1]) {
      if (R() < 0.45) continue;
      const g = ground(s + R(), sx * (deckWidth / 2 + 0.8 + R() * 2.5));
      L.pebble.push({ x: g.x, y: g.y + 0.04, z: g.z, ry: R() * 3, s: 0.1 + R() * 0.22, color: tint(0xc9b79a, 0.1) });
    }
  }

  instanced(K.fluted, mats.stone, L.fluted);
  instanced(K.capital, mats.stone, L.capital);
  instanced(K.base, mats.stone, L.base);
  instanced(K.block, mats.stone, L.block);
  instanced(K.rubble, mats.stone, L.rubble, { shadow: false });
  instanced(K.rock, mats.stone, L.rock);
  instanced(K.pebble, mats.vc, L.pebble, { shadow: false });
  instanced(K.moss, mats.vc, L.moss, { shadow: false });

  // oyma taşlar (duvarın yüzüne kazınmış semboller)
  const glyphMat = new THREE.MeshLambertNodeMaterial({ map: glyphTexture(), normalMap: mats.stone.normalMap });
  for (const g of L.glyph) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.62, 0.08, 1, 0.02), glyphMat);
    m.position.copy(g.pos);
    m.rotation.y = g.ry;
    m.receiveShadow = quality.shadows;
    scene.add(m);
  }

  // sarmaşıklar: sütunlardan ve kemerden sarkan yeşil sarmal ipler + yaprak
  {
    const vineMat = new THREE.MeshLambertNodeMaterial({ color: 0x3f6f2a });
    const leafGeo = paint(new THREE.PlaneGeometry(0.28, 0.2), 0x4f8a30, { bottom: 0.9, top: 1.1 });
    const leaves = [];
    const vines = [];
    for (const c of L.fluted) {
      if (c.rz === Math.PI / 2 || R() < 0.55) continue;
      const top = c.y + (c.sy || 1) / 2;
      const pts = [];
      const a0 = R() * Math.PI * 2;
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        const a = a0 + t * Math.PI * 2.2;
        pts.push(new THREE.Vector3(c.x + Math.cos(a) * 0.5, top - t * (c.sy || 1) * 0.85, c.z + Math.sin(a) * 0.5));
        if (k % 2 === 0) leaves.push({ x: c.x + Math.cos(a) * 0.56, y: top - t * (c.sy || 1) * 0.85, z: c.z + Math.sin(a) * 0.56, ry: -a, rz: R() - 0.5, s: 1 + R() * 0.6 });
      }
      vines.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.035, 4));
    }
    if (vines.length) {
      const m = new THREE.Mesh(merge(vines, ['position', 'normal']), vineMat);
      scene.add(m);
    }
    const lm = new THREE.MeshLambertNodeMaterial({ vertexColors: true, side: THREE.DoubleSide });
    instanced(leafGeo, lm, leaves.map((l) => ({ ...l, color: new THREE.Color().setHSL(0.26, 0.45, 0.4 + R() * 0.15) })), { shadow: false });
  }

  // şelale: vadinin sol duvarından dereye dökülür
  const updaters = [];
  {
    const s = (bridge.z0 + bridge.z1) / 2 + 6;
    const topG = ground(s, -26);
    const botG = ground(s, -12);
    const h = Math.max(6, topG.y - Math.max(botG.y, -0.5));
    const fallMat = new THREE.MeshBasicNodeMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: true });
    const v = uv();
    const flow = fract(v.y.mul(3.0).add(time.mul(1.2)));
    const streak = sin(v.x.mul(60.0).add(sin(v.x.mul(13.0)).mul(3.0))).mul(0.5).add(0.5);
    const a = sstep(float(0.0), float(0.15), v.x).mul(sstep(float(1.0), float(0.85), v.x));
    fallMat.colorNode = mix(color(0x9fd8e6), color(0xffffff), streak.mul(flow));
    fallMat.opacityNode = a.mul(float(0.55).add(streak.mul(0.4)));
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(5, h, 1, 8), fallMat);
    const mid = new THREE.Vector3().lerpVectors(new THREE.Vector3(topG.x, topG.y, topG.z), new THREE.Vector3(botG.x, Math.max(botG.y, -0.3), botG.z), 0.5);
    fall.position.copy(mid);
    fall.position.y = Math.max(botG.y, -0.3) + h / 2;
    fall.rotation.order = 'YXZ';
    fall.rotation.y = yawAt(s) - Math.PI / 2;
    fall.rotation.x = -0.22;
    scene.add(fall);
    // dipte köpük
    const foam = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
    foam.position.set(botG.x, 0.12, botG.z);
    scene.add(foam);
    updaters.push((t) => foam.scale.setScalar(1 + Math.sin(t * 0.004) * 0.06));
  }

  return { update: (t) => updaters.forEach((u) => u(t)) };
}
