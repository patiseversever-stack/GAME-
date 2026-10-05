
/* =====================================================================
   ADA GÖRSELLERİ — prosedürel geometri, prop modelleri, boyalı zemin,
   kayalık yamaçlar, çimen, bulut/balon/köprü/kapı
   ===================================================================== */
const _col = new THREE.Color(), _m4 = new THREE.Matrix4(), _eu = new THREE.Euler();
function jitterGeo(g, amt, seed = 0, yScale = 1) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const kx = Math.round(x * 97), ky = Math.round(y * 97), kz = Math.round(z * 97);
    const h1 = hash2(kx + seed, ky * 3 + kz) - 0.5, h2 = hash2(ky + seed * 7, kz * 5 + kx) - 0.5, h3 = hash2(kz + seed * 13, kx * 7 + ky) - 0.5;
    p.setXYZ(i, x + h1 * amt, y + h2 * amt * yScale, z + h3 * amt);
  }
  return g;
}
// parça: renkli, (isteğe bağlı) düz gölgeli, dönüştürülmüş, indekssiz geometri
function part(geo, color, o = {}) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  if (o.jit) jitterGeo(g, o.jit, o.seed || 0, o.jy ?? 1);
  if (o.scale) g.scale(o.scale[0], o.scale[1], o.scale[2]);
  if (o.rot) g.applyMatrix4(_m4.makeRotationFromEuler(_eu.set(o.rot[0], o.rot[1], o.rot[2])));
  if (o.pos) g.translate(o.pos[0], o.pos[1], o.pos[2]);
  if (o.flat !== false) { g.deleteAttribute('normal'); g.computeVertexNormals(); }
  if (g.attributes.uv) g.deleteAttribute('uv');
  const pos = g.attributes.position, n = pos.count, col = new Float32Array(n * 3);
  _col.set(color); const base = [_col.r, _col.g, _col.b];
  const c2 = o.top ? new THREE.Color(o.top) : null, y0 = o.y0 ?? 0, y1 = o.y1 ?? 1;
  for (let i = 0; i < n; i += 3) {
    const v = o.vary ? 1 + (hash2(i, (o.seed || 1) * 31) - 0.5) * o.vary : 1;
    for (let k = 0; k < 3 && i + k < n; k++) {
      let r = base[0], gg = base[1], b = base[2];
      if (c2) { const t = smoothstep(y0, y1, pos.getY(i + k)); r = lerp(r, c2.r, t); gg = lerp(gg, c2.g, t); b = lerp(b, c2.b, t); }
      if (o.band) { const t = Math.sin(pos.getY(i + k) * o.band) * 0.5 + 0.5; const f = 1 - t * 0.12; r *= f; gg *= f; b *= f; }
      col[(i + k) * 3] = r * v; col[(i + k) * 3 + 1] = gg * v; col[(i + k) * 3 + 2] = b * v;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function mergeParts(parts, ao = true) {
  let n = 0; for (const g of parts) n += g.attributes.position.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) {
    const c = g.attributes.position.count;
    P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3);
    o += c; g.dispose();
  }
  if (ao) for (let i = 0; i < n; i++) { const y = P[i * 3 + 1]; const f = lerp(0.5, 1, smoothstep(0.0, 0.7, y)); C[i * 3] *= f; C[i * 3 + 1] *= f; C[i * 3 + 2] *= f; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  g.computeBoundingSphere();
  return g;
}
function lathe(profile, seg) { return new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p[0], p[1])), seg); }

const matProp = worldMat({ vertexColors: true, roughness: 0.84, metalness: 0 });
const matPropSmooth = worldMat({ vertexColors: true, roughness: 0.9, metalness: 0 });
const matWindow = worldMat({ color: 0x26324e, roughness: 0.35, metalness: 0.1 }, { glow: true });
const SHARED = (fn) => { let m = null; return () => { if (!m) { m = fn(); m.userData.shared = true; } return m; }; };
const MAT_ICE = SHARED(() => envMat(worldMat({ color: 0xcfeeff, roughness: 0.08, metalness: 0.05, emissive: 0x3a6a9a, emissiveIntensity: 0.32 })));
const MAT_GOLD = SHARED(() => envMat(worldMat({ color: 0xd9a040, roughness: 0.3, metalness: 0.9 })));
const MAT_BRASS = SHARED(() => envMat(worldMat({ color: 0xb08040, roughness: 0.42, metalness: 0.8 })));
const MAT_COPPER = SHARED(() => envMat(worldMat({ color: 0xa85e3c, roughness: 0.44, metalness: 0.75 })));
const MAT_MIRROR = SHARED(() => envMat(worldMat({ color: 0xf2f6ff, roughness: 0.03, metalness: 1.0 })));
const MAT_CLOCKFACE = SHARED(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#f4ead2'; x.beginPath(); x.arc(64, 64, 62, 0, TAU); x.fill(); x.strokeStyle = '#3a2a1a'; x.lineWidth = 3;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; x.beginPath(); x.moveTo(64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46); x.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); x.stroke(); }
  x.lineWidth = 5; x.beginPath(); x.moveTo(64, 64); x.lineTo(64, 26); x.stroke(); x.lineWidth = 4; x.beginPath(); x.moveTo(64, 64); x.lineTo(94, 74); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return worldMat({ map: t, roughness: 0.6 }, { glow: true }); });
const MAT_WATER = SHARED(() => envMat(worldMat({ color: 0x8cc8ea, roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.82, depthWrite: false })));
// dişli çark geometrisi (XY düzleminde, z kalınlık)
function gearGeo(r, ri, th, teeth) {
  const sh = new THREE.Shape(), n = teeth * 4;
  for (let i = 0; i <= n; i++) { const a = (i / n) * TAU, rr = (i % 4 === 1 || i % 4 === 2) ? r : r * 0.86; const px = Math.cos(a) * rr, py = Math.sin(a) * rr; if (i === 0) sh.moveTo(px, py); else sh.lineTo(px, py); }
  const hole = new THREE.Path(); hole.absarc(0, 0, ri * 0.32, 0, TAU, true); sh.holes.push(hole);
  for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + 0.3, cx = Math.cos(a) * ri * 0.62, cy = Math.sin(a) * ri * 0.62; const h2 = new THREE.Path(); h2.absarc(cx, cy, ri * 0.17, 0, TAU, true); sh.holes.push(h2); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 4 });
  g.translate(0, 0, -th / 2); g.computeVertexNormals();
  return g;
}
const GLOW_CACHE = new Map();
const matGlowBasic = (c) => { let m = GLOW_CACHE.get(c); if (!m) { m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.6) }); m.userData.shared = true; GLOW_CACHE.set(c, m); } return m; };

/* ---------- prop modelleri ---------- */
function buildPropVisual(pr, key, rng) {
  const P = pr.p, parts = [], smooth = [], win = [], extra = [];
  const W = (g) => win.push(g);
  switch (pr.type) {
    case 'house': {
      const wall = key === 'ruzgar' ? '#eadfca' : key === 'ikiz' ? '#b9b4d8' : '#f6f1e8', blue = key === 'ruzgar' ? '#6b4a32' : '#2b5fb8';
      parts.push(part(new THREE.BoxGeometry(P.w, P.h, P.d), wall, { pos: [0, P.h / 2, 0], vary: 0.03, seed: 3 }));
      parts.push(part(new THREE.BoxGeometry(P.w + 0.1, 0.12, P.d + 0.1), wall, { pos: [0, P.h, 0] }));
      parts.push(part(new THREE.BoxGeometry(0.48, 0.9, 0.06), blue, { pos: [-P.w * 0.18, 0.45, P.d / 2 + 0.02] }));
      parts.push(part(new THREE.BoxGeometry(0.62, 0.06, 0.16), wall, { pos: [-P.w * 0.18, 0.93, P.d / 2 + 0.06] }));
      for (const [x, y, z, ry] of [[P.w * 0.22, P.h * 0.6, P.d / 2, 0], [P.w / 2, P.h * 0.58, 0, PI / 2], [-P.w / 2, P.h * 0.6, P.d * 0.1, -PI / 2]]) {
        if (P.h < 1.45 && y > 1) continue;
        parts.push(part(new THREE.BoxGeometry(0.42, 0.44, 0.05), blue, { pos: [x, y, z], rot: [0, ry, 0], scale: [1, 1, 1] }));
        const gw = new THREE.BoxGeometry(0.3, 0.32, 0.05); gw.rotateY(ry); gw.translate(x + Math.sin(ry) * 0.03, y, z + Math.cos(ry) * 0.03); W(gw);
      }
      if (P.dome) smooth.push(part(new THREE.SphereGeometry(P.dr, 18, 9, 0, TAU, 0, PI / 2), key === 'ikiz' ? '#5f4bb8' : '#2f6ed2', { pos: [0, P.h + 0.06, 0], flat: false }));
      if (P.chim) parts.push(part(new THREE.BoxGeometry(0.28, 0.6, 0.28), wall, { pos: [P.w * 0.28, P.h + 0.3, -P.d * 0.25] }));
      if (key === 'ege' && rng.chance(0.6)) { // begonvil
        for (let k = 0; k < 5; k++) smooth.push(part(new THREE.IcosahedronGeometry(0.16 + rng.range(0, 0.1), 0), rng.pick(['#d92f86', '#e8509a', '#c2266e']), { pos: [P.w * 0.5 + 0.02, P.h * rng.range(0.55, 0.95), rng.range(-P.d / 2, P.d / 2) * 0.8], scale: [0.5, 1, 1] }));
      }
      break;
    }
    case 'hut': {
      smooth.push(part(new THREE.SphereGeometry(P.r, 20, 12, 0, TAU, 0, PI * 0.62), '#5d4b5e', { pos: [0, 0.15, 0], scale: [1, 0.78, 1], jit: 0.04, top: '#7d6a7c', y0: 0, y1: 0.9, flat: true }));
      parts.push(part(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 16, 1, false, 0, PI), '#050308', { pos: [0, 0.2, 0.6], rot: [PI / 2, 0, 0], scale: [1, 1, 1.6] }));
      parts.push(part(new THREE.BoxGeometry(0.68, 0.4, 0.08), '#050308', { pos: [0, 0.2, 0.62] }));
      break;
    }
    case 'cypress': case 'poplar': {
      const h = P.h, r = P.r, c0 = pr.type === 'cypress' ? '#22401f' : '#4f8a32', c1 = pr.type === 'cypress' ? '#3f6634' : '#8cc157';
      parts.push(part(new THREE.CylinderGeometry(0.11, 0.13, h * 0.14, 6), '#5a4532', { pos: [0, h * 0.07, 0] }));
      const prof = [[0.0, h * 0.11], [r * 0.75, h * 0.12], [r * 0.97, h * 0.3], [r, h * 0.38], [r * 0.9, h * 0.55], [r * 0.62, h * 0.72], [r * 0.33, h * 0.86], [0.03, h]];
      parts.push(part(lathe(prof, 9), c0, { jit: 0.05, seed: Math.floor(pr.x * 10), top: c1, y0: h * 0.1, y1: h, vary: 0.12 }));
      break;
    }
    case 'olive': case 'apricot': {
      const s = P.s, trunkC = '#6e5a46';
      const tr = new THREE.CylinderGeometry(0.1, 0.14, P.trunk + 0.3, 6, 3); jitterGeo(tr, 0.06, 5);
      parts.push(part(tr, trunkC, { pos: [0, (P.trunk + 0.3) / 2, 0], rot: [0.08, 0, -0.06] }));
      const cs = pr.type === 'olive' ? ['#8c9c6c', '#7b8d5d', '#9aa878'] : ['#6f9a45', '#5f8a3c', '#83ac52'];
      for (const b of P.blobs) smooth.push(part(new THREE.IcosahedronGeometry(b[3], 1), rng.pick(cs), { pos: [b[0], b[1], b[2]], scale: [1, b[4], 1], jit: 0.06 * s, seed: Math.floor(b[0] * 50), vary: 0.1 }));
      if (pr.type === 'apricot') for (let k = 0; k < 6; k++) { const b = rng.pick(P.blobs), a = rng.range(0, TAU); smooth.push(part(new THREE.IcosahedronGeometry(0.07, 0), '#f39a3a', { pos: [b[0] + Math.cos(a) * b[3] * 0.92, b[1] + rng.range(-0.2, 0.2), b[2] + Math.sin(a) * b[3] * 0.92] })); }
      break;
    }
    case 'haystack': case 'hay': {
      parts.push(part(new THREE.CylinderGeometry(P.r * 0.55, P.r, P.h, 12, 3), '#d8b25a', { pos: [0, P.h / 2, 0], band: 18, jit: 0.03, vary: 0.06 }));
      smooth.push(part(new THREE.SphereGeometry(P.r * 0.55, 12, 8), '#e2c06a', { pos: [0, P.h, 0], scale: [1, 0.5, 1], flat: false }));
      break;
    }
    case 'chimney': case 'smallChimney': case 'chimneyTwin': {
      const list = pr.type === 'chimneyTwin' ? P.twins : [{ dx: 0, h: P.h, r: P.r, cap: P.cap }];
      for (const t of list) {
        const prof = [[0, 0], [t.r, 0], [t.r * 0.96, t.h * 0.2], [t.r * 0.72, t.h * 0.45], [t.r * 0.6, t.h * 0.7], [t.r * 0.42, t.h], [0, t.h]];
        parts.push(part(lathe(prof, 12), '#e7c6a1', { pos: [t.dx, 0, 0], jit: 0.05, seed: Math.floor(t.h * 9), top: '#f3dcc0', y0: 0, y1: t.h, band: 9, vary: 0.05 }));
        smooth.push(part(new THREE.SphereGeometry(t.cap, 14, 10), '#5c4637', { pos: [t.dx, t.h + t.cap * 0.25, 0], scale: [1, 0.55, 1], jit: 0.04, flat: true }));
        const doors = pr.type === 'chimney' ? P.doors : 0;
        for (let k = 0; k < doors; k++) {
          const a = rng.range(-1.2, 1.2), y = rng.range(0.5, t.h * 0.5), rr = lerp(t.r, t.r * 0.72, y / (t.h * 0.45)) + 0.01;
          parts.push(part(new THREE.BoxGeometry(0.22, k === 0 ? 0.42 : 0.24, 0.05), '#2a1a14', { pos: [t.dx + Math.sin(a) * rr, k === 0 ? 0.24 : y, Math.cos(a) * rr], rot: [0, a, 0] }));
        }
      }
      break;
    }
    case 'saltCone': parts.push(part(new THREE.CylinderGeometry(0.06, P.r, P.h, 9, 3), '#f6f1f6', { pos: [0, P.h / 2, 0], jit: 0.06, seed: 11, top: '#ffffff', y0: 0, y1: P.h, vary: 0.05 })); break;
    case 'saltPillar':
      parts.push(part(new THREE.CylinderGeometry(P.r * 0.8, P.r, P.h, 7, 2), '#f0e8f0', { pos: [0, P.h / 2, 0], jit: 0.04, vary: 0.05 }));
      parts.push(part(new THREE.ConeGeometry(P.r * 0.8, P.r * 0.9, 7), '#ffffff', { pos: [0, P.h + P.r * 0.45, 0] }));
      break;
    case 'saltBlock':
      parts.push(part(new THREE.BoxGeometry(P.w, P.h, P.d, 2, 2, 2), '#f3edf3', { pos: [0, P.h / 2, 0], jit: 0.04, vary: 0.04 }));
      break;
    case 'monolith': {
      parts.push(part(new THREE.BoxGeometry(P.w, P.h, P.d, 1, 3, 1), '#2b2546', { pos: [0, P.h / 2, 0], jit: 0.02, top: '#3d3466', y0: 0, y1: P.h }));
      for (let k = 0; k < 3; k++) extra.push({ geo: new THREE.BoxGeometry(P.w * 0.6, 0.05, 0.02).translate(0, P.h * (0.3 + k * 0.22), P.d / 2 + 0.012), mat: matGlowBasic('#4fffe0') });
      break;
    }
    case 'spire': {
      const g = new THREE.CylinderGeometry(0.04, P.r, P.h, 6, 6);
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + P.h / 2, a = y * 0.55; const x = p.getX(i), z = p.getZ(i); p.setXYZ(i, x * Math.cos(a) - z * Math.sin(a), p.getY(i), x * Math.sin(a) + z * Math.cos(a)); }
      parts.push(part(g, '#6a4ac8', { pos: [0, P.h / 2, 0], top: '#c8a2ff', y0: 0, y1: P.h }));
      extra.push({ geo: new THREE.OctahedronGeometry(0.12).translate(0, P.h + 0.05, 0), mat: matGlowBasic('#e2c8ff') });
      break;
    }
    case 'mushroom': {
      parts.push(part(new THREE.CylinderGeometry(0.2, 0.25, P.h, 10), '#e8e2f4', { pos: [0, P.h / 2, 0], vary: 0.04 }));
      smooth.push(part(new THREE.SphereGeometry(P.cr, 24, 12), '#2fb7a2', { pos: [P.ox, P.h, P.oz], scale: [1, 0.42, 1], top: '#5fe0c8', y0: P.h - 0.2, y1: P.h + 0.5, flat: false }));
      for (let k = 0; k < 7; k++) { const a = rng.range(0, TAU), rr = rng.range(0.2, 0.8) * P.cr; const y = P.h + 0.42 * P.cr * Math.sqrt(Math.max(0, 1 - (rr / P.cr) ** 2)); extra.push({ geo: new THREE.SphereGeometry(0.07, 8, 6).translate(Math.cos(a) * rr, y, Math.sin(a) * rr), mat: matGlowBasic('#b6fff0') }); }
      break;
    }
    case 'wall': parts.push(part(new THREE.BoxGeometry(P.w, P.h, P.d, 4, 2, 1), '#cdbfa3', { pos: [0, P.h / 2, 0], jit: 0.03, vary: 0.1, seed: 9 })); break;
    case 'hedge': smooth.push(part(new THREE.BoxGeometry(P.w, P.h, P.d, 4, 2, 2), '#4c7a2e', { pos: [0, P.h / 2, 0], jit: 0.06, vary: 0.12, flat: true })); break;
    case 'rock': case 'saltRock': case 'alienRock': {
      const c = pr.type === 'rock' ? '#a1968c' : pr.type === 'saltRock' ? '#f1ecf2' : '#4a3d6e';
      parts.push(part(new THREE.IcosahedronGeometry(P.r, 0), c, { pos: [0, P.r * 0.55, 0], scale: [1, P.sy, 1], jit: P.r * 0.25, seed: Math.floor(pr.x * 31), vary: 0.08 }));
      break;
    }
    case 'bush': case 'glowBush': {
      const c = pr.type === 'bush' ? (key === 'peri' ? '#8a9a52' : '#5d8a3a') : '#2f9a8a';
      smooth.push(part(new THREE.IcosahedronGeometry(P.r, 1), c, { pos: [0, P.r * 0.55, 0], scale: [1, P.sy, 1], jit: P.r * 0.18, vary: 0.12 }));
      if (pr.type === 'glowBush') for (let k = 0; k < 4; k++) { const a = rng.range(0, TAU); extra.push({ geo: new THREE.SphereGeometry(0.05, 6, 4).translate(Math.cos(a) * P.r * 0.8, P.r * 0.9, Math.sin(a) * P.r * 0.8), mat: matGlowBasic('#ff7ad0') }); }
      break;
    }
    case 'saltCrystal': parts.push(part(new THREE.OctahedronGeometry(P.r, 0), '#ffd6e6', { pos: [0, P.r * 0.55, 0], scale: [0.7, P.sy, 0.7], rot: [0, 0.4, 0.15] })); break;
    case 'pots': {
      parts.push(part(new THREE.CylinderGeometry(0.26, 0.2, 0.42, 9), '#c0663c', { pos: [0, 0.21, 0], vary: 0.06 }));
      smooth.push(part(new THREE.IcosahedronGeometry(0.2, 0), rng.pick(['#d92f86', '#e94b4b', '#f0c13b']), { pos: [0, 0.5, 0], scale: [1, 0.6, 1] }));
      break;
    }
    case 'orb': extra.push({ geo: new THREE.SphereGeometry(P.r, 20, 14).translate(0, P.y, 0), mat: matGlowBasic('#7affea'), cast: true }); break;
    case 'flamingo': {
      smooth.push(part(new THREE.SphereGeometry(0.22, 12, 8), '#ff8fb5', { pos: [0, 0.75, 0], scale: [1.35, 0.8, 0.8], flat: false }));
      parts.push(part(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 4), '#e05a8a', { pos: [0.02, 0.31, 0] }));
      const neck = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.2, 0.8, 0), new THREE.Vector3(0.32, 1.05, 0), new THREE.Vector3(0.22, 1.25, 0), new THREE.Vector3(0.34, 1.32, 0)]), 8, 0.035, 5);
      extra.push({ geo: neck, mat: new THREE.MeshStandardMaterial({ color: '#ff8fb5', roughness: 0.8 }), cast: false });
      break;
    }
    case 'crystal': {
      parts.push(part(new THREE.CylinderGeometry(0.46, 0.5, 0.2, 8), '#cfc6d8', { pos: [0, 0.1, 0] }));
      extra.push({ geo: new THREE.CylinderGeometry(0.3, 0.3, 1.7, 6).translate(0, 0.85 + 0.15, 0), mat: 'crystal', cast: true });
      extra.push({ geo: new THREE.ConeGeometry(0.3, 0.42, 6).translate(0, 1.7 + 0.15 + 0.21, 0), mat: 'crystal', cast: true });
      break;
    }
    case 'windmill': {
      const prof = [[0, 0], [P.r, 0], [P.r * 0.95, P.h * 0.5], [P.r * 0.86, P.h], [0, P.h]];
      parts.push(part(lathe(prof, 16), '#f1ece2', { vary: 0.03 }));
      parts.push(part(new THREE.CylinderGeometry(0.06, P.r * 0.94, 1.15, 16), '#7a5b42', { pos: [0, P.h + 0.575, 0], vary: 0.08 }));
      parts.push(part(new THREE.BoxGeometry(0.46, 0.85, 0.08), '#5d4330', { pos: [0, 0.42, P.r * 0.98] }));
      parts.push(part(new THREE.BoxGeometry(0.28, 0.32, 0.08), '#33251a', { pos: [0, P.h * 0.62, P.r * 0.93] }));
      parts.push(part(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 8), '#6b4e38', { pos: [0, P.h + 0.25, P.r * 0.9 + 0.2], rot: [PI / 2, 0, 0] }));
      break;
    }
    case 'iceSpire': case 'iceColumn': {
      const g = pr.type === 'iceSpire' ? new THREE.CylinderGeometry(0.05, P.r, P.h, 7, 4) : new THREE.CylinderGeometry(P.r * 0.82, P.r, P.h, 7, 4);
      jitterGeo(g, 0.06, Math.floor(pr.x * 13));
      extra.push({ geo: g.translate(0, P.h / 2, 0), mat: MAT_ICE(), cast: true });
      for (let k = 0; k < 3; k++) { const a = rng.range(0, TAU), r = P.r * 0.8, hh = rng.range(0.4, 0.9); extra.push({ geo: new THREE.ConeGeometry(0.12, hh, 5).rotateZ(rng.range(-0.5, 0.5)).translate(Math.cos(a) * r, hh / 2, Math.sin(a) * r), mat: MAT_ICE(), cast: false }); }
      parts.push(part(new THREE.CylinderGeometry(P.r * 1.25, P.r * 1.4, 0.12, 9), '#f4f8fc', { pos: [0, 0.06, 0] }));
      break;
    }
    case 'pine': {
      parts.push(part(new THREE.CylinderGeometry(0.1, 0.14, P.h * 0.2, 6), '#5a4232', { pos: [0, P.h * 0.1, 0] }));
      for (let k = 0; k < 3; k++) {
        const y0 = P.h * (0.15 + k * 0.26), hh = P.h * 0.42, r = P.r * (1 - k * 0.24);
        parts.push(part(new THREE.ConeGeometry(r, hh, 8), '#2c5a48', { pos: [0, y0 + hh / 2, 0], jit: 0.05, top: '#3f7a60', y0, y1: y0 + hh, vary: 0.08 }));
        parts.push(part(new THREE.ConeGeometry(r * 0.78, hh * 0.38, 8), '#f6faff', { pos: [0, y0 + hh * 0.86, 0], jit: 0.03 }));
      }
      break;
    }
    case 'igloo': {
      smooth.push(part(new THREE.SphereGeometry(P.r, 16, 8, 0, TAU, 0, PI / 2), '#f4f8fc', { pos: [0, 0.05, 0], scale: [1, 0.78, 1], flat: true, band: 22, vary: 0.03 }));
      parts.push(part(new THREE.CylinderGeometry(0.34, 0.36, 0.5, 10, 1, false, 0, PI), '#e8f0f8', { pos: [0, 0.25, P.r * 0.86], rot: [0, PI / 2, 0] }));
      parts.push(part(new THREE.BoxGeometry(0.4, 0.42, 0.06), '#1a2438', { pos: [0, 0.22, P.r * 0.98] }));
      W(new THREE.BoxGeometry(0.3, 0.32, 0.05).translate(0, 0.22, P.r * 1.0));
      break;
    }
    case 'snowRock': parts.push(part(new THREE.IcosahedronGeometry(P.r, 0), '#8a9ab0', { pos: [0, P.r * 0.55, 0], scale: [1, P.sy, 1], jit: P.r * 0.25, top: '#f6faff', y0: P.r * 0.3, y1: P.r * 0.8 })); break;
    case 'iceShard': extra.push({ geo: new THREE.OctahedronGeometry(P.r, 0).scale(0.6, P.sy, 0.6).rotateZ(0.2).translate(0, P.r * 0.8, 0), mat: MAT_ICE(), cast: true }); break;
    case 'penguin': {
      smooth.push(part(new THREE.SphereGeometry(0.2, 12, 10), '#1c2230', { pos: [0, 0.36, 0], scale: [1, 1.6, 0.9], flat: false }));
      smooth.push(part(new THREE.SphereGeometry(0.15, 12, 10), '#f6f8fc', { pos: [0, 0.34, 0.07], scale: [1, 1.5, 0.7], flat: false }));
      smooth.push(part(new THREE.SphereGeometry(0.12, 10, 8), '#1c2230', { pos: [0, 0.72, 0.02], flat: false }));
      parts.push(part(new THREE.ConeGeometry(0.035, 0.12, 5), '#ffa020', { pos: [0, 0.72, 0.16], rot: [PI / 2, 0, 0] }));
      for (const sx of [-1, 1]) parts.push(part(new THREE.BoxGeometry(0.08, 0.03, 0.12), '#ff9a20', { pos: [sx * 0.07, 0.015, 0.05] }));
      break;
    }
    case 'kiosk': {
      const wall = '#f7efe0', tile = '#2a6fb8';
      parts.push(part(new THREE.BoxGeometry(P.w, P.h, P.d), wall, { pos: [0, P.h / 2, 0], vary: 0.03 }));
      parts.push(part(new THREE.BoxGeometry(P.w + 0.1, 0.14, P.d + 0.1), tile, { pos: [0, P.h * 0.82, 0] }));
      parts.push(part(new THREE.BoxGeometry(P.w + 0.16, 0.1, P.d + 0.16), '#c94e3e', { pos: [0, P.h, 0] }));
      // sivri kemerli kapı + pencereler
      parts.push(part(new THREE.BoxGeometry(0.5, 0.8, 0.05), '#2a3a5a', { pos: [0, 0.4, P.d / 2 + 0.02] }));
      parts.push(part(new THREE.ConeGeometry(0.25, 0.3, 4), '#2a3a5a', { pos: [0, 0.95, P.d / 2 + 0.02], rot: [0, PI / 4, 0], scale: [1, 1, 0.15] }));
      for (const sx of [-1, 1]) { const gw = new THREE.BoxGeometry(0.22, 0.36, 0.05); gw.translate(sx * P.w * 0.3, P.h * 0.55, P.d / 2 + 0.03); W(gw); }
      smooth.push(part(new THREE.SphereGeometry(P.dr, 20, 10, 0, TAU, 0, PI / 2), '#3a8fbf', { pos: [0, P.h + 0.05, 0], flat: false, top: '#5fc0d8', y0: P.h, y1: P.h + P.dr }));
      extra.push({ geo: new THREE.SphereGeometry(0.07, 8, 6).translate(0, P.h + P.dr + 0.18, 0), mat: MAT_GOLD(), cast: false });
      extra.push({ geo: new THREE.CylinderGeometry(0.015, 0.015, 0.2, 4).translate(0, P.h + P.dr + 0.06, 0), mat: MAT_GOLD(), cast: false });
      break;
    }
    case 'minaret': {
      parts.push(part(new THREE.CylinderGeometry(P.r * 0.85, P.r, P.h, 12, 4), '#f6eedf', { vary: 0.03, pos: [0, P.h / 2, 0], band: 6 }));
      parts.push(part(new THREE.CylinderGeometry(P.r * 1.45, P.r * 1.1, 0.16, 12), '#e8dcc6', { pos: [0, P.h * 0.72 + 0.08, 0] }));
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; parts.push(part(new THREE.BoxGeometry(0.04, 0.22, 0.04), '#d8c8aa', { pos: [Math.cos(a) * P.r * 1.4, P.h * 0.72 + 0.26, Math.sin(a) * P.r * 1.4] })); }
      parts.push(part(new THREE.ConeGeometry(P.r * 0.9, P.r * 2.6, 12), '#3a7fbf', { pos: [0, P.h + P.r * 1.3, 0] }));
      extra.push({ geo: new THREE.SphereGeometry(0.06, 8, 6).translate(0, P.h + P.r * 2.6 + 0.08, 0), mat: MAT_GOLD(), cast: false });
      parts.push(part(new THREE.CylinderGeometry(P.r * 0.88, P.r * 0.88, 0.12, 12), '#2a6fb8', { pos: [0, P.h * 0.45, 0] }));
      break;
    }
    case 'fountain': {
      parts.push(part(new THREE.CylinderGeometry(P.r, P.r * 1.02, 0.6, 8), '#e8dcc6', { pos: [0, 0.3, 0], band: 30 }));
      parts.push(part(new THREE.CylinderGeometry(P.r * 0.86, P.r * 0.86, 0.04, 8), '#3aa0c8', { pos: [0, 0.6, 0] }));
      for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; parts.push(part(new THREE.CylinderGeometry(0.06, 0.07, 1.1, 6), '#f6eedf', { pos: [Math.cos(a) * P.r * 0.8, 1.15, Math.sin(a) * P.r * 0.8] })); }
      smooth.push(part(new THREE.SphereGeometry(P.r * 0.95, 20, 10, 0, TAU, 0, PI / 2), '#2f7fbf', { pos: [0, 1.65, 0], scale: [1, 0.62, 1], flat: false, top: '#5fc0d8', y0: 1.6, y1: 2.2 }));
      extra.push({ geo: new THREE.SphereGeometry(0.07, 8, 6).translate(0, 2.32, 0), mat: MAT_GOLD(), cast: false });
      break;
    }
    case 'tulips': {
      parts.push(part(new THREE.CylinderGeometry(P.r, P.r * 1.05, 0.14, 8), '#8a6a4a', { pos: [0, 0.07, 0] }));
      for (let k = 0; k < 7; k++) { const a = rng.range(0, TAU), rr = rng.range(0, P.r * 0.8); parts.push(part(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 3), '#4a8a3a', { pos: [Math.cos(a) * rr, 0.25, Math.sin(a) * rr] })); smooth.push(part(new THREE.ConeGeometry(0.06, 0.12, 6), rng.pick(['#d63a3a', '#e8506a', '#f2c040', '#c42a4a']), { pos: [Math.cos(a) * rr, 0.42, Math.sin(a) * rr], rot: [PI, 0, 0], flat: false })); }
      break;
    }
    case 'urn': parts.push(part(lathe([[0, 0], [0.16, 0], [0.26, 0.22], [0.2, 0.48], [0.12, 0.56], [0.16, 0.62], [0, 0.62]], 10), '#2a6fb8', { top: '#f6eedf', y0: 0.2, y1: 0.4, flat: false })); break;
    case 'tileBench': parts.push(part(new THREE.BoxGeometry(P.w, P.h, P.d), '#f2e6d0', { pos: [0, P.h / 2, 0] })); parts.push(part(new THREE.BoxGeometry(P.w + 0.02, 0.12, P.d + 0.02), '#2a6fb8', { pos: [0, P.h * 0.55, 0] })); break;
    case 'mirror': {
      extra.push({ geo: new THREE.PlaneGeometry(0.96, 1.24).translate(0, 1.35, 0.055), mat: MAT_MIRROR(), cast: false });
      const fr = [new THREE.BoxGeometry(1.12, 0.1, 0.12).translate(0, 2.02, 0), new THREE.BoxGeometry(1.12, 0.1, 0.12).translate(0, 0.68, 0), new THREE.BoxGeometry(0.1, 1.42, 0.12).translate(-0.56, 1.35, 0), new THREE.BoxGeometry(0.1, 1.42, 0.12).translate(0.56, 1.35, 0),
        new THREE.TorusGeometry(0.22, 0.04, 6, 14, PI).translate(0, 2.06, 0), new THREE.SphereGeometry(0.06, 8, 6).translate(0, 2.3, 0)];
      for (const g of fr) extra.push({ geo: g, mat: MAT_GOLD(), cast: true });
      parts.push(part(new THREE.BoxGeometry(1.0, 1.28, 0.08), '#1e4f8c', { pos: [0, 1.35, -0.02] }));
      parts.push(part(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 8), '#f2e6d0', { pos: [0, 1.35, -0.07], rot: [PI / 2, 0, 0] }));
      parts.push(part(new THREE.CylinderGeometry(0.18, 0.18, 0.025, 8), '#c94e3e', { pos: [0, 1.35, -0.075], rot: [PI / 2, PI / 8, 0] }));
      parts.push(part(new THREE.CylinderGeometry(0.07, 0.09, 0.7, 8), '#8a6a3a', { pos: [0, 0.35, -0.04] }));
      parts.push(part(new THREE.CylinderGeometry(0.34, 0.4, 0.1, 10), '#e8dcc6', { pos: [0, 0.05, 0] }));
      break;
    }
    case 'clockTower': {
      parts.push(part(new THREE.BoxGeometry(P.w, P.h, P.w, 1, 3, 1), '#8a6a4e', { pos: [0, P.h / 2, 0], top: '#a8845e', y0: 0, y1: P.h, vary: 0.04 }));
      parts.push(part(new THREE.BoxGeometry(P.w + 0.12, 0.12, P.w + 0.12), '#c8954a', { pos: [0, P.h * 0.66, 0] }));
      parts.push(part(new THREE.ConeGeometry(P.w * 0.74, 1.0, 4), '#3f665e', { pos: [0, P.h + 0.5, 0], rot: [0, PI / 4, 0] }));
      for (const [ry, ox, oz] of [[0, 0, 1], [PI / 2, 1, 0], [PI, 0, -1], [-PI / 2, -1, 0]]) {
        extra.push({ geo: new THREE.CircleGeometry(P.w * 0.36, 20).rotateY(ry).translate(ox * (P.w / 2 + 0.01), P.h * 0.82, oz * (P.w / 2 + 0.01)), mat: MAT_CLOCKFACE(), cast: false });
        extra.push({ geo: new THREE.TorusGeometry(P.w * 0.37, 0.03, 4, 20).rotateY(ry).translate(ox * (P.w / 2 + 0.02), P.h * 0.82, oz * (P.w / 2 + 0.02)), mat: MAT_GOLD(), cast: false });
      }
      break;
    }
    case 'cogStand': {
      extra.push({ geo: gearGeo(P.r, P.r * 0.78, 0.22, P.teeth).rotateX(PI / 2).translate(0, P.r + 0.35, 0), mat: MAT_BRASS(), cast: true });
      parts.push(part(new THREE.BoxGeometry(0.3, 0.5, 0.5), '#3a3a40', { pos: [0, 0.25, 0] }));
      parts.push(part(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8), '#5a4a3a', { pos: [0, P.r + 0.35, 0], rot: [PI / 2, 0, 0] }));
      break;
    }
    case 'pipeStack': {
      for (const q of P.pipes) {
        extra.push({ geo: new THREE.CylinderGeometry(q[3], q[3], q[2], 12).translate(q[0], q[2] / 2, q[1]), mat: MAT_COPPER(), cast: true });
        extra.push({ geo: new THREE.TorusGeometry(q[3] + 0.02, 0.04, 6, 12).rotateX(PI / 2).translate(q[0], q[2] * 0.7, q[1]), mat: MAT_BRASS(), cast: false });
        parts.push(part(new THREE.CylinderGeometry(q[3] * 0.7, q[3] * 0.7, 0.06, 10), '#1a1a1e', { pos: [q[0], q[2] + 0.02, q[1]] }));
      }
      break;
    }
    case 'steamTank': {
      extra.push({ geo: new THREE.SphereGeometry(P.r, 20, 14).translate(0, P.r + 0.45, 0), mat: MAT_COPPER(), cast: true });
      extra.push({ geo: new THREE.TorusGeometry(P.r * 1.0, 0.05, 6, 20).rotateX(PI / 2).translate(0, P.r + 0.45, 0), mat: MAT_BRASS(), cast: false });
      for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; parts.push(part(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 6), '#3a3a40', { pos: [Math.cos(a) * P.r * 0.6, 0.3, Math.sin(a) * P.r * 0.6] })); }
      extra.push({ geo: new THREE.CircleGeometry(0.2, 16).translate(0, P.r + 0.45, P.r + 0.01), mat: MAT_CLOCKFACE(), cast: false });
      break;
    }
    case 'bolt': parts.push(part(new THREE.CylinderGeometry(0.14, 0.18, 0.5, 6), '#6a6a70', { pos: [0, 0.25, 0], top: '#a0a0a8', y0: 0.3, y1: 0.5 })); break;
    case 'smallGear': extra.push({ geo: gearGeo(0.42, 0.32, 0.12, 10).rotateX(PI / 2).rotateZ(0.2).translate(0, 0.45, 0), mat: MAT_BRASS(), cast: true }); break;
    case 'lamp': {
      parts.push(part(new THREE.CylinderGeometry(0.04, 0.06, 1.5, 6), '#2a2a30', { pos: [0, 0.75, 0] }));
      extra.push({ geo: new THREE.SphereGeometry(0.16, 12, 10).translate(0, 1.6, 0), mat: matGlowBasic('#ffcf7a'), cast: false });
      break;
    }
    case 'gear': {
      extra.push({ geo: gearGeo(P.rg, P.rg * 0.86, 0.12, P.teeth).rotateX(-PI / 2).translate(0, 0.04, 0), mat: MAT_BRASS(), cast: false });
      parts.push(part(new THREE.CylinderGeometry(P.rg * 0.32, P.rg * 0.32, 0.18, 16), '#3a3a40', { pos: [0, 0.09, 0] }));
      for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; parts.push(part(new THREE.BoxGeometry(0.12, 0.1, P.rg * 0.5), '#8a6a3a', { pos: [Math.cos(a) * P.rg * 0.5, 0.12, Math.sin(a) * P.rg * 0.5], rot: [0, -a + PI / 2, 0] })); }
      break;
    }
    case 'pendFrame': {
      const hw = P.span / 2;
      for (const sd of [-1, 1]) {
        extra.push({ geo: new THREE.CylinderGeometry(0.16, 0.2, P.h, 10).translate(sd * hw, P.h / 2, 0), mat: MAT_BRASS(), cast: true });
        parts.push(part(new THREE.CylinderGeometry(0.4, 0.46, 0.3, 10), '#3a3a40', { pos: [sd * hw, 0.15, 0] }));
      }
      extra.push({ geo: new THREE.BoxGeometry(P.span + 0.4, 0.28, 0.28).translate(0, P.h, 0), mat: MAT_BRASS(), cast: true });
      extra.push({ geo: gearGeo(0.5, 0.38, 0.14, 12).translate(0, P.h, 0.2), mat: MAT_COPPER(), cast: false });
      break;
    }
    case 'pergola': case 'rockArch': case 'saltArch': case 'iceArch': case 'iwan': case 'gearArch': {
      const hw = P.w / 2, hl = P.l / 2, H = P.h;
      const postC = { pergola: '#8a6a4a', rockArch: '#d9b894', saltArch: '#f3eef4', iceArch: '#dcecfa', iwan: '#f2e6d0', gearArch: '#8a6a3a' }[pr.type];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const g = pr.type === 'pergola' ? new THREE.CylinderGeometry(P.post, P.post, H, 6) : new THREE.CylinderGeometry(P.post * 0.85, P.post, H, 7, 2);
        parts.push(part(g, postC, { pos: [sx * hw, H / 2, sz * hl], jit: pr.type === 'pergola' ? 0 : 0.04, vary: 0.06 }));
      }
      if (pr.type === 'pergola') {
        for (let k = -2; k <= 2; k++) parts.push(part(new THREE.BoxGeometry(P.w + 0.3, 0.08, 0.08), '#7a5a3c', { pos: [0, H - 0.05, (k / 2) * hl] }));
        smooth.push(part(new THREE.BoxGeometry(P.w + 0.24, P.roof, P.l + 0.24, 5, 1, 5), key === 'ruzgar' ? '#4f7f32' : '#557a34', { pos: [0, H, 0], jit: 0.07, vary: 0.16, flat: true }));
        const fc = key === 'ruzgar' ? ['#7c3f8f', '#5a2e78'] : ['#d92f86', '#e8509a', '#ba2270'];
        for (let k = 0; k < 9; k++) smooth.push(part(new THREE.IcosahedronGeometry(rng.range(0.14, 0.24), 0), rng.pick(fc), { pos: [rng.range(-hw, hw), H + P.roof * 0.45, rng.range(-hl, hl)], scale: [1, 0.6, 1] }));
      } else {
        parts.push(part(new THREE.BoxGeometry(P.w + 0.24, P.roof, P.l + 0.24, 3, 1, 3), postC, { pos: [0, H, 0], jit: pr.type === 'iwan' || pr.type === 'gearArch' ? 0 : 0.05, vary: 0.06 }));
        if (pr.type === 'iwan') { for (const sz of [-1, 1]) parts.push(part(new THREE.BoxGeometry(P.w + 0.26, 0.1, 0.06), '#2a6fb8', { pos: [0, H - P.roof * 0.2, sz * (P.l / 2 + 0.13)] })); smooth.push(part(new THREE.SphereGeometry(0.5, 14, 8, 0, TAU, 0, PI / 2), '#3a8fbf', { pos: [0, H + P.roof / 2, 0], flat: false })); }
        if (pr.type === 'gearArch') extra.push({ geo: gearGeo(0.7, 0.55, 0.14, 12).translate(0, H + 0.62, 0), mat: MAT_BRASS(), cast: true });
        if (pr.type === 'iceArch') for (let k = 0; k < 6; k++) extra.push({ geo: new THREE.ConeGeometry(0.06, rng.range(0.2, 0.45), 5).rotateX(PI).translate(rng.range(-hw, hw), H - P.roof / 2 - 0.12, rng.range(-hl, hl)), mat: MAT_ICE(), cast: false });
      }
      break;
    }
    case 'mushroomArch': {
      const hw = P.w / 2, hl = P.l / 2, H = P.h, cr = Math.max(hw, hl) + 0.75;
      parts.push(part(new THREE.CylinderGeometry(0.22, 0.27, H, 10), '#e8e2f4', { pos: [hw + 0.15, H / 2, 0], vary: 0.04 }));
      smooth.push(part(new THREE.SphereGeometry(cr, 28, 14), '#c25ad6', { pos: [0, H, 0], scale: [1, 0.38, 1], top: '#f08ae8', y0: H - 0.1, y1: H + 0.6, flat: false }));
      for (let k = 0; k < 9; k++) { const a = rng.range(0, TAU), rr = rng.range(0.2, 0.85) * cr; const y = H + 0.38 * cr * Math.sqrt(Math.max(0, 1 - (rr / cr) ** 2)); extra.push({ geo: new THREE.SphereGeometry(0.08, 8, 6).translate(Math.cos(a) * rr, y, Math.sin(a) * rr), mat: matGlowBasic('#ffe2ff') }); }
      break;
    }
  }
  const g = new THREE.Group();
  if (parts.length) { const m = new THREE.Mesh(mergeParts(parts), matProp); m.castShadow = m.receiveShadow = true; g.add(m); }
  if (smooth.length) { const m = new THREE.Mesh(mergeParts(smooth), matPropSmooth); m.castShadow = m.receiveShadow = true; g.add(m); }
  if (win.length) { const geo = mergeSimple(win); const m = new THREE.Mesh(geo, matWindow); m.receiveShadow = true; g.add(m); }
  // aynı malzemeli küçük detayları tek çizim çağrısında birleştir
  const groups = new Map();
  for (const e of extra) { const k = e.mat; if (!groups.has(k)) groups.set(k, { mat: e.mat, cast: !!e.cast, geos: [] }); groups.get(k).geos.push(e.geo); }
  for (const gr of groups.values()) { const m = new THREE.Mesh(gr.geos.length > 1 ? mergeSimple(gr.geos, !!gr.mat.map) : gr.geos[0], gr.mat); m.castShadow = gr.cast; g.add(m); }
  g.position.set(pr.x, 0, pr.z); g.rotation.y = pr.yaw;
  return g;
}
function mergeSimple(geos, keepUV = false) {
  const parts = geos.map((g) => { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); if (!keepUV && n.attributes.uv) n.deleteAttribute('uv'); return n; });
  let c = 0; for (const g of parts) c += g.attributes.position.count;
  const P = new Float32Array(c * 3), N = new Float32Array(c * 3), UV = keepUV ? new Float32Array(c * 2) : null; let o = 0;
  for (const g of parts) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); if (UV && g.attributes.uv) UV.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  if (UV) g.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  return g;
}

/* ---------- boyalı ada yüzeyi ---------- */
const TOP_BOUNDS = { x0: -8, x1: 8, z0: -12, z1: 12 };
function paintTop(lv, pal, scale) {
  const ppu = Math.round(64 * scale), B = TOP_BOUNDS;
  const W = (B.x1 - B.x0) * ppu, H = (B.z1 - B.z0) * ppu;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), rng = new RNG(lv.spec.seed ^ 0x5bd1e995);
  const X = (wx) => (wx - B.x0) * ppu, Z = (wz) => (wz - B.z0) * ppu;
  const key = lv.chap.key;
  x.fillStyle = pal.ground; x.fillRect(0, 0, W, H);
  const hexA = (hex, a) => { const v = parseInt(hex.slice(1), 16); return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`; };
  const blot = (cx, cz, r, col, a) => { const g = x.createRadialGradient(X(cx), Z(cz), 0, X(cx), Z(cz), r * ppu);
    g.addColorStop(0, hexA(col, a)); g.addColorStop(1, hexA(col, 0)); x.fillStyle = g; x.beginPath(); x.arc(X(cx), Z(cz), r * ppu, 0, TAU); x.fill(); };
  for (let i = 0; i < 170; i++) {
    const c = rng.pick(pal.groundVar), cx = rng.range(B.x0, B.x1), cz = rng.range(B.z0, B.z1), r = rng.range(0.4, 2.4);
    const g = x.createRadialGradient(X(cx), Z(cz), 0, X(cx), Z(cz), r * ppu); g.addColorStop(0, hexA(c, rng.range(0.2, 0.42))); g.addColorStop(1, hexA(c, 0));
    x.fillStyle = g; x.beginPath(); x.arc(X(cx), Z(cz), r * ppu, 0, TAU); x.fill();
  }
  for (let i = 0; i < 2600 * scale; i++) { x.fillStyle = rng.chance(0.5) ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'; x.fillRect(rng.range(0, W), rng.range(0, H), rng.range(1, 3) * scale, rng.range(1, 3) * scale); }
  // bölüme özgü dokular
  if (key === 'tuz') {
    x.strokeStyle = 'rgba(170,150,190,0.22)'; x.lineWidth = Math.max(1, 1.2 * scale);
    for (let i = 0; i < 260; i++) { const cx = rng.range(0, W), cz = rng.range(0, H), r = rng.range(0.5, 1.0) * ppu; x.beginPath(); for (let k = 0; k <= 6; k++) { const a = (k / 6) * TAU + 0.3; x.lineTo(cx + Math.cos(a) * r, cz + Math.sin(a) * r); } x.stroke(); }
    for (let i = 0; i < 7; i++) {
      for (let t = 0; t < 30; t++) {
        const cx = rng.range(-6, 6), cz = rng.range(-10, 10), rx = rng.range(0.8, 1.8), rz = rng.range(0.6, 1.3);
        if (distToPath(lv.path, cx, cz) < Math.max(rx, rz) + 0.9 || !insideIsland(lv, cx, cz, Math.max(rx, rz))) continue;
        const g = x.createRadialGradient(X(cx), Z(cz), 0, X(cx), Z(cz), rx * ppu);
        g.addColorStop(0, 'rgba(255,140,180,0.95)'); g.addColorStop(0.7, 'rgba(255,170,200,0.85)'); g.addColorStop(0.92, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.save(); x.translate(X(cx), Z(cz)); x.scale(1, rz / rx); x.translate(-X(cx), -Z(cz)); x.fillStyle = g; x.beginPath(); x.arc(X(cx), Z(cz), rx * ppu, 0, TAU); x.fill(); x.restore();
        break;
      }
    }
  }
  if (key === 'ikiz') for (let i = 0; i < 220; i++) blot(rng.range(-7, 7), rng.range(-11, 11), rng.range(0.05, 0.16), rng.pick(['#7affea', '#ff7ad0', '#b48aff']), 0.55);
  if (key === 'ege' || key === 'ruzgar') for (let i = 0; i < 160 * scale; i++) { x.fillStyle = rng.pick(pal.flowers); x.globalAlpha = 0.7; const s = rng.range(1.5, 3.2) * scale; x.fillRect(rng.range(0, W), rng.range(0, H), s, s); }
  x.globalAlpha = 1;
  const freeSpot = (r, clear) => { for (let t = 0; t < 40; t++) { const cx = rng.range(-6.5, 6.5), cz = rng.range(-10.5, 10.5); if (distToPath(lv.path, cx, cz) > r + clear && insideIsland(lv, cx, cz, r * 0.6)) return [cx, cz]; } return null; };
  if (key === 'buz') {
    // rüzgârın yonttuğu kar sırtları
    x.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const cx = rng.range(0, W), cz = rng.range(0, H), len = rng.range(0.8, 2.6) * ppu, a = rng.range(-0.25, 0.25);
      x.strokeStyle = `rgba(${rng.chance(0.5) ? '150,180,220' : '255,255,255'},${rng.range(0.12, 0.3)})`; x.lineWidth = rng.range(1.5, 4) * scale;
      x.beginPath(); x.moveTo(cx, cz); x.quadraticCurveTo(cx + len * 0.5, cz + Math.sin(a) * len * 0.3 - 6 * scale, cx + len, cz + Math.sin(a) * len); x.stroke();
    }
    // donmuş göletler (çatlaklı)
    for (let k = 0; k < 4; k++) {
      const sp = freeSpot(1.6, 0.9); if (!sp) continue;
      const [cx, cz] = sp, rx = rng.range(1.0, 1.7), rz = rx * rng.range(0.55, 0.85);
      x.save(); x.translate(X(cx), Z(cz)); x.scale(1, rz / rx);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, rx * ppu);
      g.addColorStop(0, 'rgba(120,190,235,0.95)'); g.addColorStop(0.75, 'rgba(160,215,245,0.9)'); g.addColorStop(0.9, 'rgba(235,248,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, rx * ppu, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = Math.max(1, 1.2 * scale);
      for (let c = 0; c < 9; c++) { let px = rng.range(-0.4, 0.4) * rx * ppu, pz = rng.range(-0.4, 0.4) * rx * ppu; x.beginPath(); x.moveTo(px, pz); for (let q = 0; q < 4; q++) { px += rng.range(-0.3, 0.3) * ppu; pz += rng.range(-0.3, 0.3) * ppu; x.lineTo(px, pz); } x.stroke(); }
      x.restore();
    }
    for (let i = 0; i < 900 * scale; i++) { x.fillStyle = rng.chance(0.7) ? 'rgba(255,255,255,0.9)' : 'rgba(160,210,255,0.7)'; const s2 = rng.range(0.8, 2) * scale; x.fillRect(rng.range(0, W), rng.range(0, H), s2, s2); }
  }
  if (key === 'ayna') {
    // İznik çinisi avlular: sekiz köşeli yıldız döşemesi
    const star = (cx, cy, r, fill) => { x.beginPath(); for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU + PI / 16, rr = k % 2 ? r * 0.62 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fillStyle = fill; x.fill(); };
    for (let k = 0; k < 3; k++) {
      const sp = freeSpot(1.9, 0.75); if (!sp) continue;
      const [cx, cz] = sp, hs = rng.range(1.2, 1.8), rot = rng.range(0, PI / 2), cell = 0.42 * ppu;
      x.save(); x.translate(X(cx), Z(cz)); x.rotate(rot);
      x.fillStyle = '#f6efe0'; x.fillRect(-hs * ppu, -hs * ppu, hs * 2 * ppu, hs * 2 * ppu);
      x.beginPath(); x.rect(-hs * ppu, -hs * ppu, hs * 2 * ppu, hs * 2 * ppu); x.clip();
      for (let gx = -hs * ppu; gx <= hs * ppu + cell; gx += cell) for (let gz = -hs * ppu; gz <= hs * ppu + cell; gz += cell) {
        star(gx, gz, cell * 0.46, '#2a6fb8'); star(gx, gz, cell * 0.26, '#ffffff');
        x.fillStyle = '#c94e3e'; x.beginPath(); x.arc(gx + cell / 2, gz + cell / 2, cell * 0.1, 0, TAU); x.fill();
        x.fillStyle = '#3fa0a8'; x.beginPath(); x.arc(gx + cell / 2, gz + cell / 2, cell * 0.05, 0, TAU); x.fill();
      }
      x.restore(); x.save(); x.translate(X(cx), Z(cz)); x.rotate(rot);
      x.strokeStyle = '#c94e3e'; x.lineWidth = 0.09 * ppu; x.strokeRect(-hs * ppu, -hs * ppu, hs * 2 * ppu, hs * 2 * ppu);
      x.strokeStyle = '#1e4f8c'; x.lineWidth = 0.04 * ppu; x.strokeRect(-hs * ppu - 0.08 * ppu, -hs * ppu - 0.08 * ppu, (hs * 2 + 0.16) * ppu, (hs * 2 + 0.16) * ppu);
      x.restore();
    }
    for (let i = 0; i < 120 * scale; i++) { x.fillStyle = rng.pick(pal.flowers); x.globalAlpha = 0.65; const s2 = rng.range(1.5, 3) * scale; x.fillRect(rng.range(0, W), rng.range(0, H), s2, s2); }
    x.globalAlpha = 1;
  }
  if (key === 'saat') {
    // zemine gömülü dev saat kadranı: pirinç halkalar, Roma rakamları
    const cx = X(0), cz = Z(0), R = 7.2 * ppu;
    x.save(); x.globalAlpha = 0.5;
    for (const [r, w, c] of [[1, 0.16, '#d8a85a'], [0.93, 0.05, '#f0c878'], [0.62, 0.08, '#c8954a'], [0.3, 0.05, '#e8c070']]) { x.strokeStyle = c; x.lineWidth = w * ppu; x.beginPath(); x.arc(cx, cz, R * r, 0, TAU); x.stroke(); }
    x.fillStyle = '#e8c070'; x.font = `bold ${Math.round(0.55 * ppu)}px Georgia, serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    const RN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU - PI / 2, big = i % 5 === 0;
      x.strokeStyle = '#d8a85a'; x.lineWidth = (big ? 0.1 : 0.04) * ppu;
      x.beginPath(); x.moveTo(cx + Math.cos(a) * R * (big ? 0.8 : 0.86), cz + Math.sin(a) * R * (big ? 0.8 : 0.86)); x.lineTo(cx + Math.cos(a) * R * 0.92, cz + Math.sin(a) * R * 0.92); x.stroke();
      if (big) { x.save(); x.translate(cx + Math.cos(a) * R * 0.71, cz + Math.sin(a) * R * 0.71); x.rotate(a + PI / 2); x.fillText(RN[i / 5], 0, 0); x.restore(); }
    }
    x.restore();
    // perçinli pirinç levhalar
    for (let k = 0; k < 10; k++) {
      const sp = freeSpot(0.6, 0.7); if (!sp) continue;
      const [px, pz] = sp, w2 = rng.range(0.6, 1.1) * ppu, rot = rng.range(0, PI);
      x.save(); x.translate(X(px), Z(pz)); x.rotate(rot); x.fillStyle = 'rgba(200,150,80,0.55)'; x.fillRect(-w2 / 2, -w2 / 3, w2, w2 * 0.66);
      x.fillStyle = 'rgba(90,60,30,0.7)'; for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { x.beginPath(); x.arc(a * w2 * 0.4, b * w2 * 0.25, 0.04 * ppu, 0, TAU); x.fill(); }
      x.restore();
    }
    for (let i = 0; i < 90 * scale; i++) { x.fillStyle = rng.pick(['#7affea', '#ffd27a']); x.globalAlpha = 0.5; const s2 = rng.range(1, 2.4) * scale; x.fillRect(rng.range(0, W), rng.range(0, H), s2, s2); }
    x.globalAlpha = 1;
  }
  // pişmiş ortam gölgesi: ada kenarı içe doğru hafif kararır (kenar derinliği), sonra prop dipleri
  {
    const cs = 0.25, gw = Math.ceil((B.x1 - B.x0) / cs), gh = Math.ceil((B.z1 - B.z0) / cs);
    const ao = document.createElement('canvas'); ao.width = gw; ao.height = gh;
    const ax = ao.getContext('2d'), img = ax.createImageData(gw, gh), d = img.data;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const wx = B.x0 + (i + 0.5) * cs, wz = B.z0 + (j + 0.5) * cs;
      if (!insideIsland(lv, wx, wz, 0)) continue;
      const k = insideIsland(lv, wx, wz, 0.9) ? (insideIsland(lv, wx, wz, 1.6) ? 0 : 0.45) : 1, q = (j * gw + i) * 4;
      d[q] = 26; d[q + 1] = 14; d[q + 2] = 4; d[q + 3] = Math.round(k * 0.2 * 255);
    }
    ax.putImageData(img, 0, 0); x.imageSmoothingEnabled = true; x.drawImage(ao, 0, 0, W, H);
  }
  for (const p of lv.props) {
    const h = p.h || 1; if (h < 0.3) continue;
    const hk = clamp(h / 3, 0.35, 1.4), r = p.fr * (1.2 + 0.35 * hk), a0 = 0.26 + 0.14 * hk;
    const g = x.createRadialGradient(X(p.x), Z(p.z), 0, X(p.x), Z(p.z), r * ppu);
    g.addColorStop(0, `rgba(20,10,0,${a0.toFixed(3)})`); g.addColorStop(0.55, `rgba(20,10,0,${(a0 * 0.4).toFixed(3)})`); g.addColorStop(1, 'rgba(20,10,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(X(p.x), Z(p.z), r * ppu, 0, TAU); x.fill();
    if (p.arch && p.p) {
      // kemer çatısının altı: gökyüzünü göremeyen zemin daha koyu, kenarları yumuşak
      const P = p.p; x.save(); x.translate(X(p.x), Z(p.z)); x.rotate(-p.yaw);
      x.shadowColor = 'rgba(20,10,0,0.3)'; x.shadowBlur = 0.35 * ppu; x.fillStyle = 'rgba(20,10,0,0.16)';
      x.fillRect(-P.w * 0.5 * ppu, -P.l * 0.5 * ppu, P.w * ppu, P.l * ppu); x.restore();
    }
  }
  // yol
  const path = lv.path;
  const strokePath = (w, style, blur = 0) => {
    x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = w * ppu; x.strokeStyle = style; x.shadowBlur = blur * ppu; x.shadowColor = style;
    x.beginPath(); x.moveTo(X(path.x[0]), Z(path.z[0])); for (let i = 1; i < path.n; i += 2) x.lineTo(X(path.x[i]), Z(path.z[i])); x.lineTo(X(path.x[path.n - 1]), Z(path.z[path.n - 1])); x.stroke(); x.shadowBlur = 0;
  };
  strokePath(1.55, hexA(pal.pathEdge, 0.32), 0.25);
  strokePath(1.14, pal.path);
  strokePath(0.7, hexA(pal.pathStone, 0.35));
  const PA = {};
  for (let s = 0.15; s < path.length; s += rng.range(0.3, 0.42)) {
    pathAt(path, s, PA);
    for (const off of [-0.27, 0.27]) {
      if (rng.chance(0.18)) continue;
      const cx = PA.x + PA.nx * (off + rng.range(-0.08, 0.08)), cz = PA.z + PA.nz * (off + rng.range(-0.08, 0.08));
      const rw = rng.range(0.12, 0.17) * ppu, rh = rng.range(0.1, 0.14) * ppu;
      x.save(); x.translate(X(cx), Z(cz)); x.rotate(Math.atan2(PA.tz, PA.tx) + rng.range(-0.3, 0.3));
      x.fillStyle = hexA(pal.pathStone, rng.range(0.7, 1)); x.strokeStyle = hexA(pal.pathEdge, 0.35); x.lineWidth = Math.max(1, 1.4 * scale);
      x.beginPath(); x.ellipse(0, 0, rw, rh, 0, 0, TAU); x.fill(); x.stroke(); x.restore();
    }
  }
  // kenar koyulaşması
  for (const ch of lv.chunks) {
    x.lineWidth = 0.9 * ppu; x.strokeStyle = 'rgba(30,15,5,0.22)'; x.beginPath();
    ch.pts.forEach((p, i) => (i ? x.lineTo(X(p[0]), Z(p[1])) : x.moveTo(X(p[0]), Z(p[1])))); x.closePath(); x.stroke();
    x.lineWidth = 0.28 * ppu; x.strokeStyle = hexA(pal.cliffTop, 0.9); x.stroke();
  }
  // kapı ışığı
  blot(lv.gate.x, lv.gate.z, 1.8, '#8e7cff', 0.45);
  blot(lv.start.x, lv.start.z, 1.0, '#1a1020', 0.4);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}
function topGeometry(chunk) {
  const contour = chunk.pts.map((p) => new THREE.Vector2(p[0], p[1]));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const B = TOP_BOUNDS, n = tris.length * 3, P = new Float32Array(n * 3), N = new Float32Array(n * 3), UV = new Float32Array(n * 2);
  let o = 0;
  for (const t of tris) for (const idx of [t[0], t[2], t[1]]) {
    const p = contour[idx]; P[o * 3] = p.x; P[o * 3 + 1] = 0; P[o * 3 + 2] = p.y; N[o * 3 + 1] = 1;
    UV[o * 2] = (p.x - B.x0) / (B.x1 - B.x0); UV[o * 2 + 1] = 1 - (p.y - B.z0) / (B.z1 - B.z0); o++;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  // üçgen sırasını kontrol et (yukarı bakmalı)
  const a = new THREE.Vector3(P[0], P[1], P[2]), b = new THREE.Vector3(P[3], P[4], P[5]), c = new THREE.Vector3(P[6], P[7], P[8]);
  const nrm = b.sub(a).cross(c.sub(a)); if (nrm.y < 0) { for (let i = 0; i < n; i += 3) for (let k = 0; k < 3; k++) { const t1 = P[(i + 1) * 3 + k]; P[(i + 1) * 3 + k] = P[(i + 2) * 3 + k]; P[(i + 2) * 3 + k] = t1; } for (let i = 0; i < n; i += 3) for (let k = 0; k < 2; k++) { const t1 = UV[(i + 1) * 2 + k]; UV[(i + 1) * 2 + k] = UV[(i + 2) * 2 + k]; UV[(i + 2) * 2 + k] = t1; } }
  return g;
}
function cliffGeometry(chunk, pal, depth, seed) {
  const pts = chunk.pts, N = pts.length, cx = chunk.cx, cz = chunk.cz;
  const rings = [[0, 1.0], [-0.24, 1.018], [-0.6, 0.985]];
  const K = 9;
  for (let k = 1; k <= K; k++) { const f = k / K; rings.push([-0.6 - depth * Math.pow(f, 1.12), (1 - Math.pow(f, 1.5)) * 0.95 + 0.04]); }
  const V = rings.map(([y, s], ri) => pts.map((p, i) => {
    const a = (i / N) * TAU, nz = ri < 2 ? 0 : (fbm2(Math.cos(a) * 2.2 + seed, Math.sin(a) * 2.2 + y * 0.35, 3) - 0.5);
    const ss = s * (1 + nz * 0.22 * (ri > 2 ? 1 : 0.3));
    return [cx + (p[0] - cx) * ss, y + (ri > 2 ? (hash2(i + seed * 3, ri) - 0.5) * 0.5 : 0), cz + (p[1] - cz) * ss];
  }));
  const tip = [cx + (hash2(seed, 1) - 0.5) * 1.5, -depth - 2.2, cz + (hash2(seed, 2) - 0.5) * 1.5];
  const pos = [];
  for (let r = 0; r < V.length - 1; r++) for (let i = 0; i < N; i++) { const j = (i + 1) % N, a = V[r][i], b = V[r][j], c = V[r + 1][i], d = V[r + 1][j]; pos.push(...a, ...c, ...b, ...b, ...c, ...d); }
  const last = V[V.length - 1]; for (let i = 0; i < N; i++) { const j = (i + 1) % N; pos.push(...last[i], ...tip, ...last[j]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  const n = pos.length / 3, col = new Float32Array(n * 3), ct = new THREE.Color(pal.cliffTop), cs = new THREE.Color(pal.soil), cr = new THREE.Color(pal.rockDark);
  const bands = pal.bands.map((h) => new THREE.Color(h));
  for (let i = 0; i < n; i += 3) {
    let y = (pos[i * 3 + 1] + pos[i * 3 + 4] + pos[i * 3 + 7]) / 3;
    const fx = pos[i * 3], fz = pos[i * 3 + 2];
    let c;
    if (y > -0.3) c = ct.clone();
    else if (y > -0.85) c = cs.clone();
    else { const bi = Math.floor((-y + (fbm2(fx * 0.3, fz * 0.3, 2) - 0.5) * 1.4) * 1.25); c = bands[((bi % bands.length) + bands.length) % bands.length].clone(); c.lerp(cr, smoothstep(-2.5, -depth - 1, y) * 0.75); }
    const v = 0.9 + hash2(i, seed) * 0.2; c.multiplyScalar(v);
    for (let k = 0; k < 3; k++) { col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/* ---------- çimen ---------- */
// adanın kaba alanı: yola uzaklık + prop dibi maskesi (çimen ekimini binlerce kez hızlandırır)
function islandField(lv) {
  if (lv._field) return lv._field;
  const B = TOP_BOUNDS, cs = 0.2, W = Math.ceil((B.x1 - B.x0) / cs), H = Math.ceil((B.z1 - B.z0) / cs), R = 1.4;
  const dist = new Float32Array(W * H).fill(9), block = new Uint8Array(W * H), path = lv.path;
  for (let i = 0; i < path.n; i++) {
    const px = path.x[i], pz = path.z[i], i0 = Math.max(0, Math.floor((px - R - B.x0) / cs)), i1 = Math.min(W - 1, Math.ceil((px + R - B.x0) / cs)), j0 = Math.max(0, Math.floor((pz - R - B.z0) / cs)), j1 = Math.min(H - 1, Math.ceil((pz + R - B.z0) / cs));
    for (let j = j0; j <= j1; j++) for (let k = i0; k <= i1; k++) { const d = Math.hypot(B.x0 + (k + 0.5) * cs - px, B.z0 + (j + 0.5) * cs - pz), q = j * W + k; if (d < dist[q]) dist[q] = d; }
  }
  for (const pr of lv.props) {
    const r = pr.fr * 0.75, i0 = Math.max(0, Math.floor((pr.x - r - B.x0) / cs)), i1 = Math.min(W - 1, Math.ceil((pr.x + r - B.x0) / cs)), j0 = Math.max(0, Math.floor((pr.z - r - B.z0) / cs)), j1 = Math.min(H - 1, Math.ceil((pr.z + r - B.z0) / cs));
    for (let j = j0; j <= j1; j++) for (let k = i0; k <= i1; k++) if (Math.hypot(B.x0 + (k + 0.5) * cs - pr.x, B.z0 + (j + 0.5) * cs - pr.z) < r) block[j * W + k] = 1;
  }
  const at = (x, z) => { const k = Math.floor((x - B.x0) / cs), j = Math.floor((z - B.z0) / cs); return k < 0 || j < 0 || k >= W || j >= H ? -1 : j * W + k; };
  return (lv._field = { dist, block, at });
}
function bladeGeo(kind) {
  const g = new THREE.BufferGeometry();
  let p, c;
  if (kind === 'salt') { p = [-0.05, 0, 0, 0.05, 0, 0, 0, 0.22, 0.01, 0, 0, -0.05, 0, 0, 0.05, 0.01, 0.2, 0]; c = [0.8, 0.8, 1.15, 0.8, 0.8, 1.15]; }
  else { const w = 0.045; p = [-w, 0, 0, w, 0, 0, -w * 0.6, 0.2, 0, w, 0, 0, w * 0.6, 0.2, 0, -w * 0.6, 0.2, 0, -w * 0.6, 0.2, 0, w * 0.6, 0.2, 0, 0.01, 0.42, 0.02]; c = [0.45, 0.45, 0.8, 0.45, 0.8, 0.8, 0.8, 0.8, 1.2]; }
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  const col = []; for (const v of c) col.push(v, v, v);
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const nrm = []; for (let i = 0; i < p.length / 3; i++) nrm.push(0, 1, 0);
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return g;
}
const matGrass = worldMat({ vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide }, { grass: true });
const matFlower = worldMat({ vertexColors: false, roughness: 0.8, metalness: 0 }, { grass: true });

/* ---------- bulut / balon ---------- */
const BALLOON_COLS = [['#e8463a', '#ffd25a'], ['#2f6fd2', '#f5f0e6'], ['#f28a2e', '#7a3fb0'], ['#3fae6a', '#f3e9c8'], ['#ff6fa8', '#36c5c0'], ['#f5c542', '#d6403a']];
function buildCloud(m, rng) {
  // tüm puflar tek geometri; önce derinlik ön geçişi, sonra yalnızca en öndeki yüzey boyanır
  const parts = [];
  for (const p of m.parts) {
    parts.push(part(new THREE.IcosahedronGeometry(p.c.r, 2), '#ffffff', { pos: [p.dx, p.dy, p.dz], scale: [1, p.c.sy, 1], flat: false }));
    for (let k = 0; k < 2; k++) { const r = p.c.r * rng.range(0.45, 0.6), a = rng.range(0, TAU); parts.push(part(new THREE.IcosahedronGeometry(r, 1), '#ffffff', { pos: [p.dx + Math.cos(a) * (p.c.r - r) * 0.8, p.dy + p.c.r * p.c.sy * 0.35, p.dz + Math.sin(a) * (p.c.r - r) * 0.8], scale: [1, 0.8, 1], flat: false })); }
  }
  const geo = mergeParts(parts, false);
  const g = new THREE.Group();
  const pre = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, transparent: true }));
  pre.renderOrder = 10;
  const mat = worldMat({ vertexColors: true, roughness: 1, metalness: 0, emissive: 0xfff2e6, emissiveIntensity: 0.16, transparent: true, opacity: 0.9, depthWrite: false }, { noFog: true });
  const vis = new THREE.Mesh(geo, mat); vis.renderOrder = 11; vis.castShadow = true;
  g.add(pre, vis);
  g.userData.mat = mat;
  return g;
}
function buildBalloon(m, rng) {
  const g = new THREE.Group();
  const [ca, cb] = BALLOON_COLS[m.look % BALLOON_COLS.length];
  const prof = []; const R = 1.25, SY = 1.12, cy = 0.15;
  for (let i = 0; i <= 16; i++) { const t = i / 16, y = cy - R * SY + t * 2 * R * SY; const yy = (y - cy) / (R * SY); let r = R * Math.sqrt(Math.max(0, 1 - yy * yy)); r *= 0.72 + 0.28 * smoothstep(-1, 0.2, yy); if (i === 0) r = 0.22; prof.push([Math.max(0.0, r), y]); }
  const env = lathe(prof, 16).toNonIndexed();
  const pos = env.attributes.position, n = pos.count, col = new Float32Array(n * 3);
  const A = new THREE.Color(ca), Bc = new THREE.Color(cb);
  for (let i = 0; i < n; i += 3) {
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3, y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const seg = Math.floor(((Math.atan2(z, x) + PI) / TAU) * 8);
    let c = seg % 2 ? A : Bc; if (Math.abs(y - 0.55) < 0.12) c = A;
    for (let k = 0; k < 3; k++) { col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b; }
  }
  env.setAttribute('color', new THREE.BufferAttribute(col, 3)); env.computeVertexNormals();
  const mat = worldMat({ vertexColors: true, roughness: 0.62, metalness: 0, transparent: true, opacity: 1 }, { noFog: true });
  const em = new THREE.Mesh(env, mat); em.castShadow = true; g.add(em);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.34, 0.44), worldMat({ color: 0x7a5636, roughness: 0.9, transparent: true }, { noFog: true })); basket.position.y = -1.65; basket.castShadow = true; g.add(basket);
  const lp = []; for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) lp.push(sx * 0.2, -1.48, sz * 0.2, sx * 0.24, -0.95, sz * 0.24);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x3a2a20, transparent: true })));
  const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(3, 1.6, 0.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  fl.position.y = -1.32; fl.scale.setScalar(0.9); g.add(fl);
  g.userData = { mats: [mat, basket.material], flame: fl, nextBurn: rng.range(1, 6) };
  return g;
}

/* ---------- kapı (Gece Kapısı) ---------- */
const PORTAL_FRAG = `uniform float uTime, uPulse; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
void main(){
  vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
  float sw = a + r * 3.0 - uTime * 0.6;
  vec3 col = mix(vec3(0.02, 0.01, 0.06), vec3(0.1, 0.05, 0.28), 0.5 + 0.5 * sin(sw * 3.0));
  vec2 q = vec2(cos(sw), sin(sw)) * r * 8.0; vec2 cell = floor(q); float st = h(cell);
  if (st > 0.82){ vec2 f = fract(q) - 0.5; col += vec3(0.9, 0.85, 1.0) * (1.0 - smoothstep(0.0, 0.18, length(f))) * (0.6 + 0.4 * sin(uTime * 3.0 + st * 40.0)); }
  col += vec3(0.55, 0.4, 1.0) * smoothstep(0.65, 1.0, r) * (1.4 + uPulse * 6.0);
  col += vec3(0.4, 0.3, 1.0) * uPulse * 3.0 * (1.0 - r);
  gl_FragColor = vec4(col, 1.0);
}`;
function buildGate(pal) {
  const g = new THREE.Group();
  const stone = mergeParts([
    part(new THREE.TorusGeometry(1.05, 0.2, 10, 40), '#e9dcc4', { pos: [0, 1.15, 0], vary: 0.04 }),
    part(new THREE.BoxGeometry(1.0, 0.22, 0.6), '#cdbfa6', { pos: [0, 0.11, 0] }),
    part(new THREE.TorusGeometry(1.05, 0.05, 6, 40), '#d9a54a', { pos: [0, 1.15, 0.18] }),
  ], false);
  const sm = new THREE.Mesh(stone, matProp); sm.castShadow = false; sm.receiveShadow = true; g.add(sm);
  const pu = { uTime: U.uTime, uPulse: { value: 0 } };
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.88, 48), new THREE.ShaderMaterial({ vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: PORTAL_FRAG, uniforms: pu, side: THREE.DoubleSide }));
  disc.position.y = 1.15; g.add(disc);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(0.9, 0.6, 2.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 }));
  halo.position.y = 1.15; halo.scale.setScalar(3.6); g.add(halo);
  g.userData = { pu, halo, disc };
  return g;
}

/* ---------- ayna ışını: hacim + zemindeki sıcak leke ---------- */
const BEAM_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const BEAM_FRAG = `uniform float uOn, uTime; uniform vec3 uCol; varying vec2 vUv;
void main(){ float e = pow(sin(vUv.x * 3.14159), 1.6);
  float dust = 0.72 + 0.28 * sin(vUv.y * 38.0 - uTime * 2.6 + vUv.x * 7.0) * sin(vUv.y * 11.0 + uTime * 1.1);
  gl_FragColor = vec4(uCol * e * mix(1.0, 0.45, vUv.y) * dust * uOn * 0.34, 1.0); }`;
const SPOT_VERT = `attribute float aA; varying vec2 vUv; varying float vA; void main(){ vUv = uv; vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SPOT_FRAG = `uniform float uOn, uTime; uniform vec3 uCol; varying vec2 vUv; varying float vA;
void main(){ vec2 q = min(vUv, 1.0 - vUv); float e = smoothstep(0.0, 0.16, q.x) * smoothstep(0.0, 0.16, q.y);
  float c = 0.8 + 0.2 * sin(vUv.x * 23.0 + uTime * 1.7) * sin(vUv.y * 19.0 - uTime * 1.3);
  gl_FragColor = vec4(uCol * e * c * smoothstep(0.3, 1.0, vA) * uOn * 1.25, 1.0); }`;
const SPOT_N = 7;
function buildMirrorView(mr) {
  const u = { uOn: { value: 0 }, uTime: U.uTime, uCol: { value: new THREE.Color(1.0, 0.74, 0.42) } };
  const bg = new THREE.BufferGeometry(), bp = new Float32Array(16 * 3), buv = new Float32Array(16 * 2), bi = [];
  for (let q = 0; q < 4; q++) { buv.set([0, 0, 1, 0, 1, 1, 0, 1], q * 8); const o = q * 4; bi.push(o, o + 1, o + 2, o, o + 2, o + 3); }
  bg.setAttribute('position', new THREE.BufferAttribute(bp, 3).setUsage(THREE.DynamicDrawUsage)); bg.setAttribute('uv', new THREE.BufferAttribute(buv, 2)); bg.setIndex(bi);
  const beam = new THREE.Mesh(bg, new THREE.ShaderMaterial({ uniforms: u, vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  const N = SPOT_N + 1, sg = new THREE.BufferGeometry(), sp = new Float32Array(N * N * 3), suv = new Float32Array(N * N * 2), sa = new Float32Array(N * N), si = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { suv[(j * N + i) * 2] = i / SPOT_N; suv[(j * N + i) * 2 + 1] = j / SPOT_N; if (i < SPOT_N && j < SPOT_N) { const a = j * N + i; si.push(a, a + N, a + 1, a + 1, a + N, a + N + 1); } }
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3).setUsage(THREE.DynamicDrawUsage)); sg.setAttribute('uv', new THREE.BufferAttribute(suv, 2)); sg.setAttribute('aA', new THREE.BufferAttribute(sa, 1).setUsage(THREE.DynamicDrawUsage)); sg.setIndex(si);
  const spot = new THREE.Mesh(sg, new THREE.ShaderMaterial({ uniforms: u, vertexShader: SPOT_VERT, fragmentShader: SPOT_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(2.4, 1.8, 1.1), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  glint.position.set(mr.x + mr.nx * 0.12, mr.y, mr.z + mr.nz * 0.12); glint.scale.setScalar(1.7);
  for (const m of [beam, spot]) { m.frustumCulled = false; m.renderOrder = 9; m.visible = false; }
  return { mr, beam, spot, glint, u, on: 0, C: [0, 1, 2, 3].map(() => new THREE.Vector3()), Gp: [0, 1, 2, 3].map(() => new THREE.Vector3()) };
}
const _vdm = { x: 0, y: 0, z: 0 };
function updateMirrorView(mv, lv, L, dim, dt) {
  const mr = mv.mr, d = mirrorVDir(mr, L, _vdm);
  const dn = L.x * mr.nx + L.y * mr.ny + L.z * mr.nz;
  mv.on = damp(mv.on, d ? clamp01((dn - 0.03) * 5) * (1 - dim) : 0, 7, dt);
  mv.u.uOn.value = mv.on; mv.glint.material.opacity = mv.on * (0.55 + Math.sin(U.uTime.value * 3.1 + mr.x) * 0.12);
  const vis = mv.on > 0.01 && !!d; mv.beam.visible = mv.spot.visible = vis;
  if (!vis) return;
  const sgn = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let i = 0; i < 4; i++) {
    const a = sgn[i][0] * mr.hw * 0.96, b = sgn[i][1] * mr.hh * 0.96, c = mv.C[i];
    c.set(mr.x + mr.vx * a + mr.ux * b + mr.nx * 0.06, mr.y + mr.vy * a + mr.uy * b, mr.z + mr.vz * a + mr.uz * b + mr.nz * 0.06);
    const k = Math.min(16, (c.y - 0.04) / Math.max(d.y, 0.02));
    mv.Gp[i].set(c.x - d.x * k, c.y - d.y * k, c.z - d.z * k);
  }
  const bp = mv.beam.geometry.attributes.position;
  for (let q = 0; q < 4; q++) { const A = mv.C[q], B = mv.C[(q + 1) % 4], Bg = mv.Gp[(q + 1) % 4], Ag = mv.Gp[q], o = q * 4; bp.setXYZ(o, A.x, A.y, A.z); bp.setXYZ(o + 1, B.x, B.y, B.z); bp.setXYZ(o + 2, Bg.x, Bg.y, Bg.z); bp.setXYZ(o + 3, Ag.x, Ag.y, Ag.z); }
  bp.needsUpdate = true;
  const sg = mv.spot.geometry, sp = sg.attributes.position, sa = sg.attributes.aA, N = SPOT_N + 1, [G0, G1, G2, G3] = mv.Gp;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = i / SPOT_N, b = j / SPOT_N;
    const x0 = lerp(G0.x, G1.x, a), z0 = lerp(G0.z, G1.z, a), x1 = lerp(G3.x, G2.x, a), z1 = lerp(G3.z, G2.z, a);
    const x = lerp(x0, x1, b), z = lerp(z0, z1, b), n = j * N + i;
    sp.setXYZ(n, x, 0.04, z); sa.setX(n, insideIsland(lv, x, z, 0.08) ? 1 : 0);
  }
  sp.needsUpdate = true; sa.needsUpdate = true; sg.computeBoundingSphere();
}

/* ---------- ada görünümü ---------- */
class IslandView {
  constructor(lv, opts = {}) {
    this.lv = lv; const pal = lv.chap.pal, key = lv.chap.key, Q = opts.Q || Perf.Q, rng = new RNG(lv.spec.seed ^ 0x2545f491);
    this.parent = opts.parent || scene; this.quiet = !!opts.quiet;
    this.root = new THREE.Group(); this.disposables = [];
    // yüzey
    this.tex = paintTop(lv, pal, Q.texScale);
    this.topMat = worldMat({ map: this.tex, roughness: 0.95, metalness: 0 });
    this.cliffMat = worldMat({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true });
    lv.chunks.forEach((ch, i) => {
      const top = new THREE.Mesh(topGeometry(ch), this.topMat); top.receiveShadow = true; this.root.add(top);
      const depth = key === 'tuz' ? 5.5 : key === 'saat' ? 6.5 : 7.5;
      const cl = new THREE.Mesh(cliffGeometry(ch, pal, depth, (lv.spec.seed % 97) + i * 13), this.cliffMat); cl.receiveShadow = true; this.root.add(cl);
      // asılı kayalar
      const hang = [];
      for (let k = 0; k < 6; k++) {
        const a = rng.range(0, TAU), rr = rng.range(0.3, 0.8); const hx = ch.cx + Math.cos(a) * ch.hx * rr, hz = ch.cz + Math.sin(a) * ch.hz * rr; const h = rng.range(1.0, 2.8);
        const f = Math.pow(clamp((0.99 - rr) / 0.95, 0, 1), 1 / 1.5), ys = -0.6 - depth * Math.pow(f, 1.12);
        hang.push(part(new THREE.ConeGeometry(rng.range(0.35, 0.8), h, 6), pal.rockDark, { pos: [hx, ys + 0.3 - h / 2, hz], rot: [PI, 0, 0], jit: 0.08 }));
      }
      const hm = new THREE.Mesh(mergeParts(hang, false), this.cliffMat); this.root.add(hm);
    });
    // proplar
    this.propViews = [];
    for (const pr of lv.props) {
      const v = buildPropVisual(pr, key, rng);
      v.traverse((o) => { if (o.material === 'crystal') { if (!pr.crystalMat) pr.crystalMat = envMat(new THREE.MeshStandardMaterial({ color: 0xc8b8ff, emissive: 0x8a6cff, emissiveIntensity: 0.4, roughness: 0.15, metalness: 0.1 })); o.material = pr.crystalMat; } });
      v.userData.pop = 0; v.userData.delay = 0.25 + ((pr.z + 11) / 22) * 0.75 + rng.range(0, 0.15);
      v.scale.setScalar(0.001);
      pr.view = v; this.propViews.push(v); this.root.add(v);
      if (pr.type === 'windmill') {
        const rotor = new THREE.Group(); rotor.position.set(0, pr.p.h + 0.25, 1.12);
        const parts = [];
        for (let b = 0; b < pr.p.blades; b++) {
          const a = -(b * TAU) / pr.p.blades;
          const spar = new THREE.BoxGeometry(0.07, pr.p.len + 0.25, 0.07); spar.translate(0, (pr.p.len + 0.25) / 2, 0.04); spar.rotateZ(a);
          const sail = new THREE.BoxGeometry(0.72, pr.p.len, 0.05, 1, 4, 1); sail.translate(0.06, pr.p.len / 2 + 0.22, 0); sail.rotateZ(a);
          parts.push(part(spar, '#6b4e38'), part(sail, '#f4ecdc', { vary: 0.05 }));
        }
        parts.push(part(new THREE.CylinderGeometry(0.16, 0.16, 0.18, 10), '#4a3626', { rot: [PI / 2, 0, 0] }));
        const rm = new THREE.Mesh(mergeParts(parts, false), matProp); rm.castShadow = rm.receiveShadow = true; rotor.add(rm);
        v.add(rotor); pr.rotor = rotor;
      }
    }
    // yeni dünyaların hareketli parçaları
    this.meltViews = []; this.orbitViews = []; this.pendViews = []; this.fxProps = [];
    for (const m of lv.movers) {
      const pr = m.prop;
      if (m.kind === 'melt') {
        const ice = []; pr.view.traverse((o) => { if (o.isMesh && o.material === MAT_ICE()) ice.push(o); });
        const pud = new THREE.Mesh(new THREE.CircleGeometry(pr.p.r * 1.25, 22).rotateX(-PI / 2).translate(0, 0.025, 0), MAT_WATER()); pud.scale.setScalar(0.001); pud.renderOrder = 2; pr.view.add(pud);
        this.meltViews.push({ m, ice, pud, v: pr.view, top: m.base[0].y1, last: 1, crack: 0 });
      } else if (m.kind === 'orbit') {
        const brass = [], cop = [], glow = [];
        for (const it of m.items) {
          const x = Math.cos(it.phi) * it.rho, z = Math.sin(it.phi) * it.rho, h = it.h;
          brass.push(new THREE.CylinderGeometry(0.27, 0.34, h, 12).translate(x, h / 2, z));
          for (const f of [0.22, 0.5, 0.78]) cop.push(new THREE.TorusGeometry(0.33 - 0.06 * f + 0.02, 0.035, 6, 18).rotateX(PI / 2).translate(x, h * f, z));
          brass.push(gearGeo(0.4, 0.32, 0.08, 10).rotateX(-PI / 2).translate(x, h + 0.04, z));
          glow.push(new THREE.SphereGeometry(0.12, 10, 8).translate(x, h + 0.24, z));
        }
        const bm = new THREE.Mesh(mergeSimple(brass), MAT_BRASS()); bm.castShadow = true; bm.receiveShadow = true;
        const cm = new THREE.Mesh(mergeSimple(cop), MAT_COPPER());
        const gm = new THREE.Mesh(mergeSimple(glow), matGlowBasic('#ffd27a'));
        pr.view.add(bm, cm, gm);
        this.orbitViews.push({ m, v: pr.view });
      } else if (m.kind === 'pendulum') {
        const piv = new THREE.Group(); piv.position.y = m.py;
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, m.L - 0.7, 8).translate(0, -(m.L - 0.7) / 2, 0), MAT_BRASS()); rod.castShadow = true;
        const bob = new THREE.Mesh(new THREE.SphereGeometry(0.8, 28, 18).translate(0, -m.L, 0), MAT_GOLD()); bob.castShadow = true;
        const ring = new THREE.Mesh(mergeSimple([new THREE.TorusGeometry(0.84, 0.07, 8, 36).translate(0, -m.L, 0), gearGeo(0.34, 0.26, 0.1, 10).rotateY(PI / 2)]), MAT_BRASS());
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.815, 0.03, 6, 48).rotateY(PI / 2).translate(0, -m.L, 0), matGlowBasic('#ffcf6a'));
        piv.add(rod, bob, ring, band); pr.view.add(piv);
        this.pendViews.push({ m, piv, v: pr.view, last: 0 });
      }
    }
    for (const pr of lv.props) if (pr.type === 'steamTank' || pr.type === 'pipeStack' || pr.type === 'fountain' || pr.type === 'igloo') this.fxProps.push(pr);
    // aynalar
    this.mirrorViews = (lv.mirrors || []).map((mr) => { const mv = buildMirrorView(mr); this.root.add(mv.beam, mv.spot, mv.glint); return mv; });
    // kapı
    this.gate = buildGate(pal); this.gate.position.set(lv.gate.x, 0, lv.gate.z); this.gate.rotation.y = lv.gate.yaw; this.root.add(this.gate);
    this.gate.scale.setScalar(0.001);
    // çimen
    this.buildGrass(rng, pal, key, Q);
    // köprüler
    this.bridgeViews = [];
    for (const br of lv.bridges) {
      const a = pathAt(lv.path, br.s0, {}), b = pathAt(lv.path, br.s1, {});
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const bu = { uTime: U.uTime, uOn: { value: 0 }, uLen: { value: len } };
      const bm = new THREE.ShaderMaterial({
        uniforms: bu, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform float uTime, uOn, uLen; varying vec2 vUv;
          void main(){ float e = smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x));
            float st = fract(vUv.y * uLen * 1.6 - uTime * 1.8); float chev = smoothstep(0.0, 0.25, st) * (1.0 - smoothstep(0.4, 0.65, st));
            float edge = smoothstep(0.8, 1.0, abs(vUv.x - 0.5) * 2.0);
            vec3 c = mix(vec3(0.5, 0.75, 1.6), vec3(1.6, 1.2, 0.6), vUv.y) * (0.35 + chev * 0.8 + edge * 1.4);
            float dots = step(0.5, fract(vUv.y * uLen * 3.0)) * edge * 0.25;
            gl_FragColor = vec4(c * (uOn * e + dots * (1.0 - uOn)), 1.0); }`,
      });
      const plank = new THREE.Mesh(new THREE.PlaneGeometry(1.05, len), bm);
      plank.rotation.x = -PI / 2; plank.rotation.z = -Math.atan2(b.x - a.x, b.z - a.z) * -1;
      plank.position.set((a.x + b.x) / 2, -0.03, (a.z + b.z) / 2);
      // yön: düzlemin uzun ekseni yol yönüne
      plank.rotation.set(-PI / 2, 0, Math.atan2(b.x - a.x, b.z - a.z) + PI);
      this.root.add(plank);
      const cr = br.crystal; const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.8, 3.2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      const p0 = new THREE.Vector3(cr.x, 1.9, cr.z), p1 = new THREE.Vector3(a.x, 0.05, a.z), mid = p0.clone().add(p1).multiplyScalar(0.5);
      beam.position.copy(mid); beam.scale.set(1, p0.distanceTo(p1), 1); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
      this.root.add(beam);
      this.bridgeViews.push({ br, plank, bu, beam, on: 0 });
    }
    // bulut ve balonlar
    this.moverViews = [];
    for (const m of lv.movers) {
      if (m.kind === 'cloud') { const v = buildCloud(m, rng); this.root.add(v); this.moverViews.push({ m, v }); }
      else if (m.kind === 'balloon') { const v = buildBalloon(m, rng); this.root.add(v); this.moverViews.push({ m, v }); }
    }
    // kenar sarmaşıkları / kökler
    if (key === 'buz') {
      const icy = [];
      for (const ch of lv.chunks) for (let k = 0; k < 22; k++) {
        const p = rng.pick(ch.pts), dx = p[0] - ch.cx, dz = p[1] - ch.cz, l = Math.hypot(dx, dz), h = rng.range(0.4, 1.6);
        icy.push(new THREE.ConeGeometry(rng.range(0.07, 0.16), h, 5).rotateX(PI).translate(p[0] + (dx / l) * 0.06, -0.2 - h / 2, p[1] + (dz / l) * 0.06));
      }
      const im = new THREE.Mesh(mergeSimple(icy), MAT_ICE()); this.root.add(im);
    }
    if (key === 'ege' || key === 'ruzgar' || key === 'ikiz' || key === 'ayna' || key === 'saat') {
      const vines = [];
      for (const ch of lv.chunks) for (let k = 0; k < 10; k++) {
        const p = rng.pick(ch.pts), dx = p[0] - ch.cx, dz = p[1] - ch.cz, l = Math.hypot(dx, dz);
        const ox = p[0] + (dx / l) * 0.1, oz = p[1] + (dz / l) * 0.1, L = rng.range(0.8, 2.4);
        const cv = new THREE.CatmullRomCurve3([new THREE.Vector3(ox, -0.1, oz), new THREE.Vector3(ox + dx / l * 0.15, -L * 0.4, oz + dz / l * 0.15), new THREE.Vector3(ox + rng.range(-0.2, 0.2), -L, oz + rng.range(-0.2, 0.2))]);
        vines.push(part(new THREE.TubeGeometry(cv, 6, 0.035, 4), key === 'ikiz' ? '#3fb4a4' : key === 'saat' ? '#4f8a80' : '#4f7a32', { flat: false }));
      }
      const vm = new THREE.Mesh(mergeParts(vines, false), matPropSmooth); this.root.add(vm);
    }
    // yörüngedeki kaya parçaları
    this.orbit = new THREE.Group();
    const orbs = [];
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU + rng.range(-0.3, 0.3), r = rng.range(8.5, 12.5), y = rng.range(-5.5, -1.2), s = rng.range(0.25, 0.7);
      const rx = Math.cos(a) * r * 0.75, rz = Math.sin(a) * r;
      orbs.push(part(new THREE.IcosahedronGeometry(s, 0), pal.bands[k % pal.bands.length], { pos: [rx, y, rz], scale: [1, 0.8, 1], jit: s * 0.25, seed: k }));
      orbs.push(part(new THREE.ConeGeometry(s * 0.9, s * 1.8, 6), pal.rockDark, { pos: [rx, y - s * 1.1, rz], rot: [PI, 0, 0], jit: s * 0.1 }));
      orbs.push(part(new THREE.CylinderGeometry(s * 0.95, s * 0.9, 0.08, 7), pal.cliffTop, { pos: [rx, y + s * 0.62, rz] }));
    }
    const om = new THREE.Mesh(mergeParts(orbs, false), this.cliffMat); this.orbit.add(om); this.root.add(this.orbit);
    this.parent.add(this.root);
    this.introT = 0; this.popped = 0;
  }
  // kalite değişince çimen sayısı: azaltmak anında, artırmak gerekiyorsa yeniden ekim
  setGrass(Q) {
    const want = this.grassCount(Q, this.lv.chap.key);
    if (want <= this.grassCap) { this.grass.count = Math.min(want, this.grassN); if (this.flowers) this.flowers.count = Math.min(this.flowersN, Math.ceil(this.flowersN * want / Math.max(1, this.grassN))); return; }
    this.root.remove(this.grass); this.grass.dispose(); if (this.flowers) { this.root.remove(this.flowers); this.flowers.dispose(); }
    this.buildGrass(new RNG(this.lv.spec.seed ^ 0x77), this.lv.chap.pal, this.lv.chap.key, Q);
  }
  grassCount(Q, key) { return Math.round(Q.grass * ({ peri: 0.45, tuz: 0.35, buz: 0.3, saat: 0.6, ayna: 0.75 }[key] ?? 1) * (this.lv.chunks.length > 1 ? 0.85 : 1)); }
  buildGrass(rng, pal, key, Q) {
    const lv = this.lv;
    const kind = key === 'tuz' || key === 'buz' ? 'salt' : 'blade';
    const cnt = this.grassCount(Q, key);
    const geo = bladeGeo(kind);
    const mesh = new THREE.InstancedMesh(geo, matGrass, cnt);
    const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.055, 0), matFlower, Math.ceil(cnt * 0.12));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    let n = 0, nf = 0;
    const F = islandField(lv);
    for (let t = 0; t < cnt * 8 && n < cnt; t++) {
      const ch = rng.pick(lv.chunks), x = ch.cx + rng.range(-ch.hx, ch.hx), z = ch.cz + rng.range(-ch.hz, ch.hz);
      if (!insideChunk(ch, x, z, 0.15)) continue;
      const ci = F.at(x, z); if (ci < 0 || F.block[ci]) continue;
      const dp = F.dist[ci];
      if (dp < 0.62) continue;
      if (dp < 1.0 && rng.chance(0.6)) continue;
      const sc = rng.range(0.65, 1.35) * (dp < 1.3 ? 0.7 : 1);
      q.setFromEuler(_eu.set(rng.range(-0.15, 0.15), rng.range(0, TAU), rng.range(-0.15, 0.15)));
      m.compose(p.set(x, 0, z), q, s.set(sc, sc * rng.range(0.8, 1.25), sc)); mesh.setMatrixAt(n, m);
      c.set(rng.pick(pal.grass)).multiplyScalar(rng.range(0.85, 1.12)); mesh.setColorAt(n, c); n++;
      if (nf < fl.count && (key === 'ege' || key === 'ruzgar' || key === 'ikiz' || key === 'ayna' || key === 'saat') && rng.chance(key === 'ayna' ? 0.2 : 0.13)) {
        m.compose(p.set(x + rng.range(-0.05, 0.05), 0.3 * sc + 0.05, z), q, s.set(1, 0.7, 1)); fl.setMatrixAt(nf, m); c.set(rng.pick(pal.flowers)); fl.setColorAt(nf, c); nf++;
      }
    }
    mesh.count = n; fl.count = nf;
    mesh.receiveShadow = true; fl.receiveShadow = true; mesh.frustumCulled = false; fl.frustumCulled = false;
    this.root.add(mesh); if (nf) this.root.add(fl); else fl.dispose();
    this.grass = mesh; this.grassCap = cnt; this.grassN = n; this.flowers = nf ? fl : null; this.flowersN = nf;
  }
  // giriş animasyonu: ada yükselir, proplar sırayla belirir
  intro(dt) {
    this.introT += dt;
    const t = this.introT;
    this.root.position.y = lerp(-26, 0, Ease.outCubic(clamp01(t / 1.25)));
    let changed = t < 1.4;
    for (const v of this.propViews) {
      const k = clamp01((t - v.userData.delay) / 0.5);
      if (k > 0 && v.userData.pop === 0) { v.userData.pop = 1; if (this.popped++ % 3 === 0 && !this.quiet) audio.pop(this.popped); }
      const s = k <= 0 ? 0.001 : k >= 1 ? 1 : Math.max(0.001, Ease.outBack(k, 2.2));
      if (v.scale.x !== s) { v.scale.set(s, k >= 1 ? 1 : lerp(1.25, 1, k) * s, s); changed = true; }
    }
    const gk = clamp01((t - 1.0) / 0.6); this.gate.scale.setScalar(Math.max(0.001, Ease.outBack(gk, 1.8)));
    // giriş bitti (ya da film atlandı): her şeyi son hâline oturt, sabit propları birleştir
    if (t >= 2.0 && !this.introDone) {
      this.introDone = true; this.root.position.y = 0; this.gate.scale.setScalar(1);
      for (const v of this.propViews) v.scale.set(1, 1, 1);
      try { this.bake(); } catch (e) { console.warn('ada birleştirme', e); }
      return true;
    }
    return changed || gk < 1;
  }
  // Sabit propları malzeme başına tek ağa birleştir: ~100 çizim çağrısı yerine ~10 (gölge geçişinde de).
  // Hareketli/animasyonlu parçası olanlar (değirmen, eriyen buz, dişli, sarkaç) ayrı kalır.
  bake() {
    const root = this.root; root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), M = new THREE.Matrix4(), NM = new THREE.Matrix3(), groups = new Map(), done = [];
    for (const pr of this.lv.props) {
      const v = pr.view; if (!v || pr.mover || pr.rotor) continue;
      let ok = true; v.traverse((o) => { if ((o.isMesh && (o.isInstancedMesh || o.renderOrder || Array.isArray(o.material))) || o.isSprite || o.isLine || o.isPoints) ok = false; });
      if (!ok) continue;
      v.traverse((o) => {
        if (!o.isMesh) return;
        const k = o.material.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');
        if (!groups.has(k)) groups.set(k, { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, items: [] });
        groups.get(k).items.push({ geo: o.geometry, m: M.multiplyMatrices(inv, o.matrixWorld).clone() });
      });
      done.push(v);
    }
    const _v = new THREE.Vector3();
    this.baked = [];
    for (const gr of groups.values()) {
      const mat = gr.mat, wantC = !!mat.vertexColors, wantUV = !!mat.map;
      const geos = gr.items.map((it) => ({ g: it.geo.index ? it.geo.toNonIndexed() : it.geo, m: it.m, own: !!it.geo.index }));
      let n = 0; for (const e of geos) n += e.g.attributes.position.count;
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = wantC ? new Float32Array(n * 3) : null, UV = wantUV ? new Float32Array(n * 2) : null;
      let o = 0;
      for (const e of geos) {
        const pa = e.g.attributes.position, na = e.g.attributes.normal, ca = e.g.attributes.color, ua = e.g.attributes.uv, c = pa.count;
        NM.getNormalMatrix(e.m);
        for (let i = 0; i < c; i++) {
          _v.fromBufferAttribute(pa, i).applyMatrix4(e.m); P[(o + i) * 3] = _v.x; P[(o + i) * 3 + 1] = _v.y; P[(o + i) * 3 + 2] = _v.z;
          if (na) _v.fromBufferAttribute(na, i).applyMatrix3(NM).normalize(); else _v.set(0, 1, 0);
          N[(o + i) * 3] = _v.x; N[(o + i) * 3 + 1] = _v.y; N[(o + i) * 3 + 2] = _v.z;
          if (C) { if (ca) { C[(o + i) * 3] = ca.getX(i); C[(o + i) * 3 + 1] = ca.getY(i); C[(o + i) * 3 + 2] = ca.getZ(i); } else C.fill(1, (o + i) * 3, (o + i) * 3 + 3); }
          if (UV && ua) { UV[(o + i) * 2] = ua.getX(i); UV[(o + i) * 2 + 1] = ua.getY(i); }
        }
        o += c; if (e.own) e.g.dispose();
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
      if (C) g.setAttribute('color', new THREE.BufferAttribute(C, 3)); if (UV) g.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, mat); mesh.castShadow = gr.cast; mesh.receiveShadow = gr.recv; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      root.add(mesh); this.baked.push(mesh);
    }
    // birleştirilenleri sahneden çıkar (geometrileri bırak; materyaller paylaşımlı)
    for (const v of done) { root.remove(v); v.traverse((q) => { if (q.geometry) q.geometry.dispose(); }); }
    this.bakedViews = done;
  }
  sink(dt) { this.root.position.y -= dt * (8 + this.root.position.y * -1.6); this.root.rotation.z += dt * 0.02; }
  update(dt, t, ctx) {
    const lv = this.lv;
    this.orbit.rotation.y += dt * 0.018; this.orbit.position.y = Math.sin(U.uTime.value * 0.4) * 0.25;
    for (const pr of lv.props) if (pr.rotor) pr.rotor.rotation.z = -(pr.mover.a0 + pr.mover.w * t);
    for (const mv of this.moverViews) {
      moverPose(mv.m, t, _mp); mv.v.position.set(_mp.x, _mp.y, _mp.z);
      // bulut/balon adanın arka tarafında dolaşır (üretimde): yolu örtmez, saydamlaştırılmaz
      if (mv.m.kind !== 'cloud') {
        const ud = mv.v.userData; ud.nextBurn -= dt;
        if (ud.nextBurn < 0) { ud.nextBurn = 3 + Math.random() * 6; ud.burn = 0.9; if (ctx.near(mv.v.position)) audio.burner(); }
        ud.burn = Math.max(0, (ud.burn || 0) - dt); ud.flame.material.opacity = ud.burn > 0 ? 0.6 + Math.random() * 0.4 : 0;
      }
    }
    for (const mv of this.meltViews) {
      const m = mv.m, f = 1 - m.drop * smoothstep(m.t0, m.t1, t), sxz = 0.75 + 0.25 * f;
      for (const o of mv.ice) o.scale.set(sxz, f, sxz);
      const melt = 1 - f; mv.pud.scale.setScalar(Math.max(0.001, 0.35 + melt * 1.4));
      if (f < mv.last - 1e-4 && f > 0.3 && ctx.near(mv.v.position) && Math.random() < dt * 7) {
        const a = Math.random() * TAU, r = m.prop.p.r * sxz * 0.8;
        fxAdd.spawn(m.prop.x + Math.cos(a) * r, mv.top * f * (0.3 + Math.random() * 0.6), m.prop.z + Math.sin(a) * r, 0, -0.4, 0, { c: [0.7, 1.1, 1.6], a: 0.9, s: 0.06, s1: 0.04, life: 0.7, drag: 0.2, g: -7 });
      }
      if (melt > 0.02 && mv.crack === 0) { mv.crack = 1; if (ctx.near(mv.v.position)) audio.iceCrack(); }
      if (f > 0.999) mv.crack = 0;
      mv.last = f;
    }
    for (const ov of this.orbitViews) ov.v.rotation.y = -(ov.m.a0 + ov.m.w * t);
    for (const pv of this.pendViews) {
      const m = pv.m, ang = m.amp * Math.sin(m.w * t + m.ph); pv.piv.rotation.x = -ang;
      const sg = Math.sign(ang); if (sg !== pv.last && pv.last !== 0 && ctx.near(pv.v.position)) audio.tock(sg > 0);
      pv.last = sg;
    }
    const dim = ctx.dim ? ctx.dim() : 0;
    for (const mv of this.mirrorViews) updateMirrorView(mv, lv, L1, dim, dt);
    if (this.fxProps.length && Math.random() < dt * 6) {
      const pr = this.fxProps[Math.floor(Math.random() * this.fxProps.length)];
      if (pr.type === 'steamTank') fxMix.spawn(pr.x + (Math.random() - 0.5) * 0.2, pr.p.r * 2 + 0.5, pr.z, (Math.random() - 0.5) * 0.3, 1.0, (Math.random() - 0.5) * 0.3, { c: [0.95, 0.95, 1.0], a: 0.32, s: 0.3, s1: 1.1, life: 1.5, drag: 1.2, t: 1 });
      else if (pr.type === 'pipeStack') { const q = pr.p.pipes[Math.floor(Math.random() * pr.p.pipes.length)]; const c = Math.cos(pr.yaw), sn = Math.sin(pr.yaw); fxMix.spawn(pr.x + q[0] * c + q[1] * sn, q[2] + 0.1, pr.z - q[0] * sn + q[1] * c, (Math.random() - 0.5) * 0.3, 1.2, (Math.random() - 0.5) * 0.3, { c: [0.95, 0.95, 1.0], a: 0.35, s: 0.25, s1: 0.9, life: 1.4, drag: 1.2, t: 1 }); }
      else if (pr.type === 'fountain') for (let k = 0; k < 3; k++) { const a = Math.random() * TAU; fxAdd.spawn(pr.x, 2.3, pr.z, Math.cos(a) * 0.7, 1.4, Math.sin(a) * 0.7, { c: [0.8, 1.2, 1.7], a: 0.8, s: 0.06, s1: 0.03, life: 0.7, drag: 0.4, g: -6 }); }
      else if (pr.type === 'igloo' && ctx.dim && ctx.dim() > 0.3) FX.mote(pr.x, 0.4, pr.z, [2.4, 1.6, 0.6], 0.12);
    }
    for (const bv of this.bridgeViews) {
      bv.on = damp(bv.on, bv.br.active ? 1 : 0, 9, dt);
      bv.bu.uOn.value = bv.on; bv.beam.material.opacity = bv.on * 0.8;
    }
    for (const c of lv.crystals) if (c.prop.crystalMat) { c.glow = damp(c.glow || 0, c.lit ? 1 : 0, 10, dt); c.prop.crystalMat.emissiveIntensity = 0.35 + c.glow * 3.2; c.prop.crystalMat.emissive.setRGB(lerp(0.55, 1.0, c.glow), lerp(0.42, 0.85, c.glow), lerp(1.0, 0.55, c.glow)); }
    this.gate.userData.pu.uPulse.value = Math.max(0, this.gate.userData.pu.uPulse.value - dt * 1.5);
  }
  dispose() {
    this.parent.remove(this.root);
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material;
      if (m && m !== matProp && m !== matPropSmooth && m !== matWindow && m !== matGrass && m !== matFlower && !(m.userData && m.userData.shared) && typeof m.dispose === 'function') m.dispose();
    });
    this.tex.dispose(); this.topMat.dispose(); this.cliffMat.dispose();
  }
}
