
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
    case 'pergola': case 'rockArch': case 'saltArch': {
      const hw = P.w / 2, hl = P.l / 2, H = P.h;
      const postC = pr.type === 'pergola' ? '#8a6a4a' : pr.type === 'rockArch' ? '#d9b894' : '#f3eef4';
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
        parts.push(part(new THREE.BoxGeometry(P.w + 0.24, P.roof, P.l + 0.24, 3, 1, 3), postC, { pos: [0, H, 0], jit: 0.05, vary: 0.06 }));
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
  for (const gr of groups.values()) { const m = new THREE.Mesh(gr.geos.length > 1 ? mergeSimple(gr.geos) : gr.geos[0], gr.mat); m.castShadow = gr.cast; g.add(m); }
  g.position.set(pr.x, 0, pr.z); g.rotation.y = pr.yaw;
  return g;
}
function mergeSimple(geos) {
  const parts = geos.map((g) => { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); if (n.attributes.uv) n.deleteAttribute('uv'); return n; });
  let c = 0; for (const g of parts) c += g.attributes.position.count;
  const P = new Float32Array(c * 3), N = new Float32Array(c * 3); let o = 0;
  for (const g of parts) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); return g;
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
  // prop dibi gölgelendirme (AO)
  for (const p of lv.props) { const r = p.fr * 1.55; const g = x.createRadialGradient(X(p.x), Z(p.z), 0, X(p.x), Z(p.z), r * ppu); g.addColorStop(0, 'rgba(20,10,0,0.38)'); g.addColorStop(0.6, 'rgba(20,10,0,0.14)'); g.addColorStop(1, 'rgba(20,10,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(X(p.x), Z(p.z), r * ppu, 0, TAU); x.fill(); }
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

/* ---------- ada görünümü ---------- */
class IslandView {
  constructor(lv) {
    this.lv = lv; const pal = lv.chap.pal, key = lv.chap.key, Q = Perf.Q, rng = new RNG(lv.spec.seed ^ 0x2545f491);
    this.root = new THREE.Group(); this.disposables = [];
    // yüzey
    this.tex = paintTop(lv, pal, Q.texScale);
    this.topMat = worldMat({ map: this.tex, roughness: 0.95, metalness: 0 });
    this.cliffMat = worldMat({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true });
    lv.chunks.forEach((ch, i) => {
      const top = new THREE.Mesh(topGeometry(ch), this.topMat); top.receiveShadow = true; this.root.add(top);
      const cl = new THREE.Mesh(cliffGeometry(ch, pal, key === 'tuz' ? 5.5 : 7.5, (lv.spec.seed % 97) + i * 13), this.cliffMat); cl.receiveShadow = true; this.root.add(cl);
      // asılı kayalar
      const hang = [], depth = key === 'tuz' ? 5.5 : 7.5;
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
      v.traverse((o) => { if (o.material === 'crystal') { if (!pr.crystalMat) pr.crystalMat = new THREE.MeshStandardMaterial({ color: 0xc8b8ff, emissive: 0x8a6cff, emissiveIntensity: 0.4, roughness: 0.15, metalness: 0.1 }); o.material = pr.crystalMat; } });
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
    if (key === 'ege' || key === 'ruzgar' || key === 'ikiz') {
      const vines = [];
      for (const ch of lv.chunks) for (let k = 0; k < 10; k++) {
        const p = rng.pick(ch.pts), dx = p[0] - ch.cx, dz = p[1] - ch.cz, l = Math.hypot(dx, dz);
        const ox = p[0] + (dx / l) * 0.1, oz = p[1] + (dz / l) * 0.1, L = rng.range(0.8, 2.4);
        const cv = new THREE.CatmullRomCurve3([new THREE.Vector3(ox, -0.1, oz), new THREE.Vector3(ox + dx / l * 0.15, -L * 0.4, oz + dz / l * 0.15), new THREE.Vector3(ox + rng.range(-0.2, 0.2), -L, oz + rng.range(-0.2, 0.2))]);
        vines.push(part(new THREE.TubeGeometry(cv, 6, 0.035, 4), key === 'ikiz' ? '#3fb4a4' : '#4f7a32', { flat: false }));
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
    scene.add(this.root);
    this.introT = 0; this.popped = 0;
  }
  buildGrass(rng, pal, key, Q) {
    const lv = this.lv;
    const kind = key === 'tuz' ? 'salt' : 'blade';
    const cnt = Math.round(Q.grass * (key === 'peri' ? 0.45 : key === 'tuz' ? 0.35 : 1) * (lv.chunks.length > 1 ? 0.85 : 1));
    const geo = bladeGeo(kind);
    const mesh = new THREE.InstancedMesh(geo, matGrass, cnt);
    const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.055, 0), matFlower, Math.ceil(cnt * 0.12));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    let n = 0, nf = 0;
    for (let t = 0; t < cnt * 8 && n < cnt; t++) {
      const ch = rng.pick(lv.chunks), x = ch.cx + rng.range(-ch.hx, ch.hx), z = ch.cz + rng.range(-ch.hz, ch.hz);
      if (!insideChunk(ch, x, z, 0.15)) continue;
      const dp = distToPath(lv.path, x, z);
      if (dp < 0.62) continue;
      if (dp < 1.0 && rng.chance(0.6)) continue;
      let blocked = false; for (const pr of lv.props) if (Math.hypot(pr.x - x, pr.z - z) < pr.fr * 0.75) { blocked = true; break; }
      if (blocked) continue;
      const sc = rng.range(0.65, 1.35) * (dp < 1.3 ? 0.7 : 1);
      q.setFromEuler(_eu.set(rng.range(-0.15, 0.15), rng.range(0, TAU), rng.range(-0.15, 0.15)));
      m.compose(p.set(x, 0, z), q, s.set(sc, sc * rng.range(0.8, 1.25), sc)); mesh.setMatrixAt(n, m);
      c.set(rng.pick(pal.grass)).multiplyScalar(rng.range(0.85, 1.12)); mesh.setColorAt(n, c); n++;
      if (nf < fl.count && (key === 'ege' || key === 'ruzgar' || key === 'ikiz') && rng.chance(0.13)) {
        m.compose(p.set(x + rng.range(-0.05, 0.05), 0.3 * sc + 0.05, z), q, s.set(1, 0.7, 1)); fl.setMatrixAt(nf, m); c.set(rng.pick(pal.flowers)); fl.setColorAt(nf, c); nf++;
      }
    }
    mesh.count = n; fl.count = nf;
    mesh.receiveShadow = true; fl.receiveShadow = true; mesh.frustumCulled = false; fl.frustumCulled = false;
    this.root.add(mesh); if (nf) this.root.add(fl); else fl.dispose();
    this.grass = mesh;
  }
  // giriş animasyonu: ada yükselir, proplar sırayla belirir
  intro(dt) {
    this.introT += dt;
    const t = this.introT;
    this.root.position.y = lerp(-26, 0, Ease.outCubic(clamp01(t / 1.25)));
    let changed = t < 1.4;
    for (const v of this.propViews) {
      const k = clamp01((t - v.userData.delay) / 0.5);
      if (k > 0 && v.userData.pop === 0) { v.userData.pop = 1; if (this.popped++ % 3 === 0) audio.pop(this.popped); }
      const s = k <= 0 ? 0.001 : k >= 1 ? 1 : Math.max(0.001, Ease.outBack(k, 2.2));
      if (v.scale.x !== s) { v.scale.set(s, k >= 1 ? 1 : lerp(1.25, 1, k) * s, s); changed = true; }
    }
    const gk = clamp01((t - 1.0) / 0.6); this.gate.scale.setScalar(Math.max(0.001, Ease.outBack(gk, 1.8)));
    return changed || gk < 1;
  }
  sink(dt) { this.root.position.y -= dt * (8 + this.root.position.y * -1.6); this.root.rotation.z += dt * 0.02; }
  update(dt, t, ctx) {
    const lv = this.lv;
    this.orbit.rotation.y += dt * 0.018; this.orbit.position.y = Math.sin(U.uTime.value * 0.4) * 0.25;
    for (const pr of lv.props) if (pr.rotor) pr.rotor.rotation.z = -(pr.mover.a0 + pr.mover.w * t);
    for (const mv of this.moverViews) {
      moverPose(mv.m, t, _mp); mv.v.position.set(_mp.x, _mp.y, _mp.z);
      // Zifir'i örtüyorsa saydamlaş
      const fade = ctx.occludeFade(mv.v.position, mv.m.kind === 'cloud' ? 4.0 : 2.4);
      const op = lerp(mv.m.kind === 'cloud' ? 0.88 : 1, mv.m.kind === 'cloud' ? 0.2 : 0.35, fade);
      if (mv.m.kind === 'cloud') mv.v.userData.mat.opacity = op;
      else {
        for (const m of mv.v.userData.mats) m.opacity = op;
        const ud = mv.v.userData; ud.nextBurn -= dt;
        if (ud.nextBurn < 0) { ud.nextBurn = 3 + Math.random() * 6; ud.burn = 0.9; if (ctx.near(mv.v.position)) audio.burner(); }
        ud.burn = Math.max(0, (ud.burn || 0) - dt); ud.flame.material.opacity = ud.burn > 0 ? 0.6 + Math.random() * 0.4 : 0;
      }
    }
    for (const bv of this.bridgeViews) {
      bv.on = damp(bv.on, bv.br.active ? 1 : 0, 9, dt);
      bv.bu.uOn.value = bv.on; bv.beam.material.opacity = bv.on * 0.8;
    }
    for (const c of lv.crystals) if (c.prop.crystalMat) { c.glow = damp(c.glow || 0, c.lit ? 1 : 0, 10, dt); c.prop.crystalMat.emissiveIntensity = 0.35 + c.glow * 3.2; c.prop.crystalMat.emissive.setRGB(lerp(0.55, 1.0, c.glow), lerp(0.42, 0.85, c.glow), lerp(1.0, 0.55, c.glow)); }
    this.gate.userData.pu.uPulse.value = Math.max(0, this.gate.userData.pu.uPulse.value - dt * 1.5);
  }
  dispose() {
    scene.remove(this.root);
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material;
      if (m && m !== matProp && m !== matPropSmooth && m !== matWindow && m !== matGrass && m !== matFlower && !(m.userData && m.userData.shared) && typeof m.dispose === 'function') m.dispose();
    });
    this.tex.dispose(); this.topMat.dispose(); this.cliffMat.dispose();
  }
}
