// Procedural pilot + wingsuit geometry (skinned). Bind pose = flight pose: prone, head toward −Z, back up (+Y),
// right side +X. 1.8 m tall, ~1.95 m arm-wing span. No face (full-face helmet with visor), no real-person likeness.
import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute, Vector3, Bone, Skeleton } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const MAT = { suit: 0, trim: 1, glove: 2, shoe: 3, helmet: 4, visor: 5, membrane: 6, container: 7 } as const;

export interface BoneDef { name: string; parent: number; head: [number, number, number] }

export const BONES: BoneDef[] = [
  { name: 'root', parent: -1, head: [0, 0, 0] },
  { name: 'pelvis', parent: 0, head: [0, 0, 0.12] },
  { name: 'spine', parent: 1, head: [0, 0.01, -0.1] },
  { name: 'chest', parent: 2, head: [0, 0.02, -0.3] },
  { name: 'neck', parent: 3, head: [0, 0.03, -0.5] },
  { name: 'head', parent: 4, head: [0, 0.05, -0.6] },
  { name: 'upperArm.L', parent: 3, head: [-0.19, 0.02, -0.43] },
  { name: 'foreArm.L', parent: 6, head: [-0.5, 0.025, -0.41] },
  { name: 'hand.L', parent: 7, head: [-0.79, 0.02, -0.38] },
  { name: 'upperArm.R', parent: 3, head: [0.19, 0.02, -0.43] },
  { name: 'foreArm.R', parent: 9, head: [0.5, 0.025, -0.41] },
  { name: 'hand.R', parent: 10, head: [0.79, 0.02, -0.38] },
  { name: 'thigh.L', parent: 1, head: [-0.095, 0, 0.16] },
  { name: 'shin.L', parent: 12, head: [-0.2, 0, 0.56] },
  { name: 'foot.L', parent: 13, head: [-0.27, -0.005, 0.92] },
  { name: 'thigh.R', parent: 1, head: [0.095, 0, 0.16] },
  { name: 'shin.R', parent: 15, head: [0.2, 0, 0.56] },
  { name: 'foot.R', parent: 16, head: [0.27, -0.005, 0.92] },
];
export const B = Object.fromEntries(BONES.map((b, i) => [b.name, i])) as Record<string, number>;

export function makeSkeleton(): { root: Bone; bones: Bone[]; skeleton: Skeleton } {
  const bones = BONES.map((d) => { const b = new Bone(); b.name = d.name; return b; });
  for (let i = 0; i < BONES.length; i++) {
    const d = BONES[i];
    const p = d.parent >= 0 ? BONES[d.parent].head : [0, 0, 0];
    bones[i].position.set(d.head[0] - p[0], d.head[1] - p[1], d.head[2] - p[2]);
    if (d.parent >= 0) bones[d.parent].add(bones[i]);
  }
  // bone world matrices must be valid before the Skeleton computes its inverse bind matrices
  bones[0].updateMatrixWorld(true);
  return { root: bones[0], bones, skeleton: new Skeleton(bones) };
}

type W = [number, number][]; // (bone, weight)

interface Part { pos: number[]; uv: number[]; idx: number[]; si: number[]; sw: number[]; mat: number[]; pat: number[]; cloth: number[]; le: number[] }

function newPart(): Part { return { pos: [], uv: [], idx: [], si: [], sw: [], mat: [], pat: [], cloth: [], le: [] }; }

function pushV(p: Part, x: number, y: number, z: number, w: W, mat: number, cloth: [number, number, number, number] = [0, 0, 0, 0], le?: [number, number, number]): number {
  p.pos.push(x, y, z);
  p.uv.push(0, 0);
  const ws = w.slice().sort((a, b) => b[1] - a[1]).slice(0, 4);
  let sum = 0;
  for (const [, v] of ws) sum += v;
  for (let k = 0; k < 4; k++) {
    p.si.push(k < ws.length ? ws[k][0] : 0);
    p.sw.push(k < ws.length ? ws[k][1] / (sum || 1) : 0);
  }
  p.mat.push(mat);
  p.pat.push(x, -z);
  p.cloth.push(...cloth);
  if (le) p.le.push(...le); else p.le.push(x, y, z);
  return p.pos.length / 3 - 1;
}

function toGeometry(p: Part): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p.pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(p.uv, 2));
  g.setAttribute('skinIndex', new Uint16BufferAttribute(p.si, 4));
  g.setAttribute('skinWeight', new Float32BufferAttribute(p.sw, 4));
  g.setAttribute('aMat', new Float32BufferAttribute(p.mat, 1));
  g.setAttribute('aPat', new Float32BufferAttribute(p.pat, 2));
  g.setAttribute('aCloth', new Float32BufferAttribute(p.cloth, 4));
  g.setAttribute('aLE', new Float32BufferAttribute(p.le, 3));
  g.setIndex(p.idx);
  g.computeVertexNormals();
  return g;
}

interface Section { c: Vector3; a1: Vector3; a2: Vector3; r1: number; r2: number; w: W; mat: number }

/** Tube through elliptical sections; caps optional. */
function loft(p: Part, secs: Section[], segs: number, capStart: boolean, capEnd: boolean): void {
  const base = p.pos.length / 3;
  for (const s of secs) {
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      pushV(p, s.c.x + s.a1.x * ca * s.r1 + s.a2.x * sa * s.r2, s.c.y + s.a1.y * ca * s.r1 + s.a2.y * sa * s.r2, s.c.z + s.a1.z * ca * s.r1 + s.a2.z * sa * s.r2, s.w, s.mat);
    }
  }
  const row = segs + 1;
  // orientation: cross(a1, a2) should point along the loft direction for outward-facing triangles
  const dir = secs[secs.length - 1].c.clone().sub(secs[0].c);
  const flip = new Vector3().crossVectors(secs[0].a1, secs[0].a2).dot(dir) < 0;
  for (let k = 0; k < secs.length - 1; k++) for (let i = 0; i < segs; i++) {
    const a = base + k * row + i, b = a + 1, c = a + row, d = c + 1;
    if (!flip) p.idx.push(a, b, c, b, d, c); else p.idx.push(a, c, b, b, c, d);
  }
  const cap = (k: number, end: boolean): void => {
    const s = secs[k];
    const ci = pushV(p, s.c.x, s.c.y, s.c.z, s.w, s.mat);
    for (let i = 0; i < segs; i++) {
      const a = base + k * row + i, b = a + 1;
      if (end !== flip) p.idx.push(ci, a, b); else p.idx.push(ci, b, a);
    }
  };
  if (capStart) cap(0, false);
  if (capEnd) cap(secs.length - 1, true);
}

const X = new Vector3(1, 0, 0), Y = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1);

function lerpW(a: W, b: W, t: number): W {
  const m = new Map<number, number>();
  for (const [i, w] of a) m.set(i, (m.get(i) ?? 0) + w * (1 - t));
  for (const [i, w] of b) m.set(i, (m.get(i) ?? 0) + w * t);
  return [...m.entries()].filter(([, w]) => w > 1e-4);
}

/** Ellipsoid (lat-long) with optional angular window (for the visor). */
function ellipsoid(p: Part, c: Vector3, r: Vector3, latSegs: number, lonSegs: number, w: W, mat: number): void {
  const base = p.pos.length / 3;
  for (let j = 0; j <= latSegs; j++) {
    const th = (j / latSegs) * Math.PI;
    for (let i = 0; i <= lonSegs; i++) {
      const ph = (i / lonSegs) * Math.PI * 2;
      // pole axis = Z (helmet crown toward −Z)
      const x = Math.sin(th) * Math.cos(ph), y = Math.sin(th) * Math.sin(ph), z = Math.cos(th);
      pushV(p, c.x + x * r.x, c.y + y * r.y, c.z + z * r.z, w, mat);
    }
  }
  const row = lonSegs + 1;
  for (let j = 0; j < latSegs; j++) for (let i = 0; i < lonSegs; i++) {
    const a = base + j * row + i, b = a + 1, cc = a + row, d = cc + 1;
    p.idx.push(a, cc, b, b, cc, d);
  }
}

export interface PilotDetail { radial: number; spanSegs: number; chordSegs: number; headLat: number; headLon: number }
export const PILOT_DETAIL: PilotDetail[] = [
  { radial: 14, spanSegs: 14, chordSegs: 9, headLat: 12, headLon: 18 },
  { radial: 9, spanSegs: 8, chordSegs: 6, headLat: 8, headLon: 12 },
  { radial: 6, spanSegs: 5, chordSegs: 4, headLat: 6, headLon: 8 },
];

/** Face direction of the helmet in bind space (looking forward along the flight path). */
export const FACE_DIR = new Vector3(0, -0.55, -0.83).normalize();
export const HEAD_CENTER = new Vector3(0, 0.06, -0.69);
export const HEAD_R = new Vector3(0.122, 0.13, 0.148);

export function buildPilotGeometry(level: 0 | 1 | 2): BufferGeometry {
  const D = PILOT_DETAIL[level];
  const parts: BufferGeometry[] = [];
  // --- torso
  {
    const p = newPart();
    const prof: [number, number, number, W][] = [
      [0.25, 0.12, 0.085, [[B.pelvis, 1]]],
      [0.15, 0.17, 0.11, [[B.pelvis, 1]]],
      [0.02, 0.16, 0.105, [[B.pelvis, 0.5], [B.spine, 0.5]]],
      [-0.12, 0.152, 0.1, [[B.spine, 1]]],
      [-0.26, 0.172, 0.115, [[B.spine, 0.3], [B.chest, 0.7]]],
      [-0.38, 0.19, 0.115, [[B.chest, 1]]],
      [-0.46, 0.165, 0.098, [[B.chest, 1]]],
      [-0.51, 0.08, 0.065, [[B.chest, 0.6], [B.neck, 0.4]]],
    ];
    loft(p, prof.map(([z, rx, ry, w]) => ({ c: new Vector3(0, 0.01, z), a1: X, a2: Y, r1: rx, r2: ry, w, mat: MAT.suit })), D.radial + 2, true, true);
    parts.push(toGeometry(p));
  }
  // --- neck
  {
    const p = newPart();
    loft(p, [
      { c: new Vector3(0, 0.03, -0.49), a1: X, a2: Y, r1: 0.06, r2: 0.055, w: [[B.chest, 1]], mat: MAT.trim },
      { c: new Vector3(0, 0.045, -0.6), a1: X, a2: Y, r1: 0.055, r2: 0.05, w: [[B.neck, 0.5], [B.head, 0.5]], mat: MAT.trim },
    ], D.radial, false, false);
    parts.push(toGeometry(p));
  }
  // --- helmet shell + visor
  {
    const p = newPart();
    ellipsoid(p, HEAD_CENTER, HEAD_R, D.headLat, D.headLon, [[B.head, 1]], MAT.helmet);
    parts.push(toGeometry(p));
    const v = newPart();
    const F = FACE_DIR;
    const U = new Vector3(0, 0.83, -0.55).normalize();
    const R = new Vector3().crossVectors(U, F).normalize();
    const nu = Math.max(6, D.headLon), nv = Math.max(4, Math.round(D.headLat * 0.6));
    const base = v.pos.length / 3;
    for (let j = 0; j <= nv; j++) {
      const bt = -0.42 + (j / nv) * 0.98; // vertical angle (rad) around R
      for (let i = 0; i <= nu; i++) {
        const at = -1.15 + (i / nu) * 2.3; // horizontal angle around U
        // edge rounding of the visor outline (lens shape)
        const d = F.clone().multiplyScalar(Math.cos(at) * Math.cos(bt)).addScaledVector(R, Math.sin(at) * Math.cos(bt)).addScaledVector(U, Math.sin(bt));
        const q = new Vector3(d.x * HEAD_R.x * 1.06, d.y * HEAD_R.y * 1.06, d.z * HEAD_R.z * 1.06);
        // project onto the scaled ellipsoid surface
        const s = 1 / Math.sqrt((d.x / (HEAD_R.x * 1.06)) ** 2 + (d.y / (HEAD_R.y * 1.06)) ** 2 + (d.z / (HEAD_R.z * 1.06)) ** 2);
        q.copy(d).multiplyScalar(s).add(HEAD_CENTER);
        pushV(v, q.x, q.y, q.z, [[B.head, 1]], MAT.visor);
      }
    }
    const row = nu + 1;
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = base + j * row + i, b = a + 1, c = a + row, dd = c + 1;
      v.idx.push(a, b, c, b, dd, c);
    }
    parts.push(toGeometry(v));
  }
  // --- arms, gloves
  for (const s of [-1, 1]) {
    const up = s < 0 ? B['upperArm.L'] : B['upperArm.R'];
    const fo = s < 0 ? B['foreArm.L'] : B['foreArm.R'];
    const ha = s < 0 ? B['hand.L'] : B['hand.R'];
    const p = newPart();
    const sx = new Vector3(s, 0, 0);
    const a2 = Y, a1 = Z;
    const secs: Section[] = [
      { c: new Vector3(s * 0.15, 0.025, -0.43), a1, a2, r1: 0.075, r2: 0.07, w: [[B.chest, 0.6], [up, 0.4]], mat: MAT.suit },
      { c: new Vector3(s * 0.24, 0.025, -0.43), a1, a2, r1: 0.065, r2: 0.06, w: [[up, 1]], mat: MAT.suit },
      { c: new Vector3(s * 0.46, 0.025, -0.415), a1, a2, r1: 0.052, r2: 0.05, w: [[up, 0.65], [fo, 0.35]], mat: MAT.suit },
      { c: new Vector3(s * 0.55, 0.025, -0.405), a1, a2, r1: 0.048, r2: 0.046, w: [[fo, 1]], mat: MAT.suit },
      { c: new Vector3(s * 0.765, 0.02, -0.385), a1, a2, r1: 0.04, r2: 0.036, w: [[fo, 0.8], [ha, 0.2]], mat: MAT.suit },
      { c: new Vector3(s * 0.785, 0.02, -0.382), a1, a2, r1: 0.042, r2: 0.037, w: [[fo, 0.3], [ha, 0.7]], mat: MAT.trim },
      { c: new Vector3(s * 0.8, 0.02, -0.38), a1, a2, r1: 0.038, r2: 0.03, w: [[ha, 1]], mat: MAT.glove },
      { c: new Vector3(s * 0.845, 0.018, -0.377), a1, a2, r1: 0.048, r2: 0.024, w: [[ha, 1]], mat: MAT.glove },
      { c: new Vector3(s * 0.885, 0.014, -0.375), a1, a2, r1: 0.05, r2: 0.022, w: [[ha, 1]], mat: MAT.glove },
    ];
    void sx;
    loft(p, secs, D.radial, false, false);
    // fingers: four gloved fingers as one rounded block with knuckle grooves, slightly curled (palm side = −y)
    const fingers: Section[] = [];
    const fn = 5;
    for (let k = 0; k <= fn; k++) {
      const t = k / fn;
      const ang = t * 0.55; // curl
      const x = s * (0.885 + 0.095 * Math.sin(Math.PI / 2 * t) * (1 - 0.15 * t));
      const y = 0.014 - 0.05 * (1 - Math.cos(ang));
      fingers.push({ c: new Vector3(x, y, -0.375), a1, a2, r1: 0.05 - 0.012 * t * t, r2: 0.019 - 0.006 * t * t, w: [[ha, 1]], mat: MAT.glove });
    }
    loft(p, fingers, D.radial, false, true);
    // thumb (toward the head side, −z)
    loft(p, [
      { c: new Vector3(s * 0.83, 0.0, -0.405), a1: X, a2: Y, r1: 0.016, r2: 0.014, w: [[ha, 1]], mat: MAT.glove },
      { c: new Vector3(s * 0.86, -0.012, -0.435), a1: X, a2: Y, r1: 0.014, r2: 0.012, w: [[ha, 1]], mat: MAT.glove },
      { c: new Vector3(s * 0.89, -0.02, -0.445), a1: X, a2: Y, r1: 0.011, r2: 0.01, w: [[ha, 1]], mat: MAT.glove },
    ], Math.max(5, D.radial - 4), false, true);
    parts.push(toGeometry(p));
  }
  // --- legs, shoes
  for (const s of [-1, 1]) {
    const th = s < 0 ? B['thigh.L'] : B['thigh.R'];
    const sh = s < 0 ? B['shin.L'] : B['shin.R'];
    const ft = s < 0 ? B['foot.L'] : B['foot.R'];
    const p = newPart();
    const secs: Section[] = [
      { c: new Vector3(s * 0.085, 0.01, 0.13), a1: X, a2: Y, r1: 0.095, r2: 0.095, w: [[B.pelvis, 0.6], [th, 0.4]], mat: MAT.suit },
      { c: new Vector3(s * 0.12, 0.005, 0.28), a1: X, a2: Y, r1: 0.082, r2: 0.08, w: [[th, 1]], mat: MAT.suit },
      { c: new Vector3(s * 0.19, 0, 0.53), a1: X, a2: Y, r1: 0.06, r2: 0.058, w: [[th, 0.6], [sh, 0.4]], mat: MAT.suit },
      { c: new Vector3(s * 0.22, 0, 0.62), a1: X, a2: Y, r1: 0.055, r2: 0.055, w: [[sh, 1]], mat: MAT.suit },
      { c: new Vector3(s * 0.265, -0.005, 0.88), a1: X, a2: Y, r1: 0.042, r2: 0.042, w: [[sh, 0.7], [ft, 0.3]], mat: MAT.trim },
      { c: new Vector3(s * 0.275, -0.01, 0.93), a1: X, a2: Y, r1: 0.045, r2: 0.05, w: [[ft, 1]], mat: MAT.shoe },
      { c: new Vector3(s * 0.285, -0.03, 1.04), a1: X, a2: Y, r1: 0.045, r2: 0.04, w: [[ft, 1]], mat: MAT.shoe },
      { c: new Vector3(s * 0.29, -0.045, 1.13), a1: X, a2: Y, r1: 0.032, r2: 0.022, w: [[ft, 1]], mat: MAT.shoe },
    ];
    loft(p, secs, D.radial, false, true);
    parts.push(toGeometry(p));
  }
  // --- rig container on the upper back
  {
    const p = newPart();
    const secs: Section[] = [];
    for (const [z, rx, ry] of [[-0.06, 0.1, 0.025], [-0.08, 0.13, 0.055], [-0.33, 0.14, 0.06], [-0.36, 0.1, 0.025]] as [number, number, number][]) {
      secs.push({ c: new Vector3(0, 0.12 + ry * 0.4, z), a1: X, a2: Y, r1: rx, r2: ry, w: [[B.chest, 0.6], [B.spine, 0.4]], mat: MAT.container });
    }
    loft(p, secs, Math.max(6, D.radial - 2), true, true);
    parts.push(toGeometry(p));
  }
  // --- arm wings (inflated: top and bottom skins meeting at the trailing edge)
  for (const s of [-1, 1]) {
    const up = s < 0 ? B['upperArm.L'] : B['upperArm.R'];
    const fo = s < 0 ? B['foreArm.L'] : B['foreArm.R'];
    const th = s < 0 ? B['thigh.L'] : B['thigh.R'];
    const wingId = s < 0 ? 1 : 2;
    const p = newPart();
    const NU = D.spanSegs, NV = D.chordSegs;
    const LE = (u: number): Vector3 => new Vector3(s * (0.16 + 0.63 * u), 0.02, -0.395 + 0.02 * u + 0.04);
    const TE = (u: number): Vector3 => new Vector3(s * (0.16 + 0.66 * u), 0.0, 0.43 + (-0.62) * u - 0.075 * Math.sin(Math.PI * u) + 0.05 * u * u);
    for (const side of [1, -1]) {
      const base = p.pos.length / 3;
      for (let j = 0; j <= NV; j++) {
        const v = j / NV;
        for (let i = 0; i <= NU; i++) {
          const u = i / NU;
          const le = LE(u), te = TE(u);
          const pt = le.clone().lerp(te, v);
          const thick = 0.06 * (1 - 0.55 * u) * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.65)), 0.8);
          pt.y += side > 0 ? thick : -thick * 0.45;
          // skinning: leading edge rides the arm, trailing root rides the thigh/pelvis
          const armW: W = u < 0.45 ? [[up, 1]] : u > 0.62 ? [[fo, 1]] : [[up, (0.62 - u) / 0.17], [fo, (u - 0.45) / 0.17]];
          const bz = te.z;
          const bodyW: W = bz < 0.0 ? [[B.chest, 0.5], [B.spine, 0.5]] : bz < 0.25 ? [[B.pelvis, 0.7], [B.spine, 0.3]] : [[th, 0.65], [B.pelvis, 0.35]];
          const bodyShare = Math.min(1, v * Math.pow(1 - u, 1.1) * 1.15);
          const w = lerpW(armW, bodyW, bodyShare);
          const flutter = Math.pow(v, 1.6) * (0.4 + 0.6 * u);
          pushV(p, pt.x, pt.y, pt.z, w, MAT.membrane, [flutter, wingId, v, u], [le.x, le.y, le.z]);
        }
      }
      const row = NU + 1;
      for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
        const a = base + j * row + i, b = a + 1, c = a + row, d = c + 1;
        const outward = (side > 0) !== (s > 0);
        if (outward) p.idx.push(a, b, c, b, d, c); else p.idx.push(a, c, b, b, c, d);
      }
    }
    parts.push(toGeometry(p));
  }
  // --- leg wing between the legs
  {
    const p = newPart();
    const NU = Math.max(4, D.spanSegs), NV = D.chordSegs;
    const leg = (sgn: number, t: number): Vector3 => new Vector3(sgn * (0.06 + 0.2 * t), 0.0, 0.2 + 0.7 * t);
    for (const side of [1, -1]) {
      const base = p.pos.length / 3;
      for (let j = 0; j <= NV; j++) {
        const t = j / NV;
        for (let i = 0; i <= NU; i++) {
          const u = (i / NU) * 2 - 1;
          const a = leg(-1, t), b = leg(1, t);
          const pt = a.clone().lerp(b, (u + 1) / 2);
          pt.z -= 0.13 * (1 - u * u) * Math.pow(t, 3);
          const thick = 0.035 * (1 - u * u) * Math.sin(Math.PI * Math.min(1, t * 1.1));
          pt.y += side > 0 ? thick : -thick * 0.5;
          const wl = (1 - u) / 2, wr = (1 + u) / 2;
          const segW = (thigh: number, shin: number): W => (t < 0.45 ? [[thigh, 1]] : t > 0.65 ? [[shin, 1]] : [[thigh, (0.65 - t) / 0.2], [shin, (t - 0.45) / 0.2]]);
          const wL = segW(B['thigh.L'], B['shin.L']).map(([i2, w2]) => [i2, w2 * wl] as [number, number]);
          const wR = segW(B['thigh.R'], B['shin.R']).map(([i2, w2]) => [i2, w2 * wr] as [number, number]);
          const flutter = Math.pow(t, 2.0) * (1 - Math.abs(u) * 0.6);
          const le = new Vector3(pt.x, 0, 0.2 + 0.7 * t * 0.2);
          pushV(p, pt.x, pt.y, pt.z, [...wL, ...wR], MAT.membrane, [flutter, 3, t, u], [le.x, le.y, le.z]);
        }
      }
      const row = NU + 1;
      for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
        const a = base + j * row + i, b = a + 1, c = a + row, d = c + 1;
        if (side > 0) p.idx.push(a, c, b, b, c, d); else p.idx.push(a, b, c, b, d, c);
      }
    }
    parts.push(toGeometry(p));
  }
  const g = mergeGeometries(parts, false);
  for (const pg of parts) pg.dispose();
  if (!g) throw new Error('pilot geometry merge failed');
  g.computeBoundingSphere();
  return g;
}
