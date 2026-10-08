// World-specific props built as merged, world-space geometry per 512 m cell (one draw per visible cell):
// Likya gulets (gentle rocking), rock-tomb facades, lighthouse, rock arch · Karadeniz yayla houses (4 variants) ·
// Erciyes ice cornices / rocks · Pamukkale columns, broken walls, theatre seating. Generic shapes only.
// Every generator fits the visual to the PropInstance collision primitives (±0.4 m).
import { BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial, MeshDepthMaterial, RGBADepthPacking, Vector2, Vector3, Frustum, Matrix4 } from 'three';
import type { Camera, Object3D } from 'three';
import type { PropInstance, PropPrimitive, WorldId } from '../../sim/types.ts';
import type { TerrainSampler } from '../../sim/terrain/types.ts';
import { MeshAcc, Frame, box, lathe, tube, rockDisp, icosphere, MK } from './meshKit.ts';
import type { MatSpec } from './meshKit.ts';
import { patchMaterial } from './patch.ts';
import { GLSL_NOISE, GLSL_DITHER } from './glsl.ts';
import { detailTexture } from './textures.ts';
import { hashSeed } from './chimneys.ts';
import { sphereInFrustum } from './InstanceTable.ts';
import { primYRange } from './fit.ts';
import type { PropTierConfig } from './tiers.ts';
import { sharedUniforms } from '../vfx/shared.ts';

function lin(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  const f = (c: number): number => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return [f((v >> 16) & 255), f((v >> 8) & 255), f(v & 255)];
}

const M = {
  stone: { color: lin('#9A958C'), rough: 0.85, metal: 0, kind: MK.stone } as MatSpec,
  stoneDark: { color: lin('#6E6A63'), rough: 0.9, metal: 0, kind: MK.stone } as MatSpec,
  limestone: { color: lin('#CFC6B4'), rough: 0.75, metal: 0, kind: MK.stone } as MatSpec,
  marble: { color: lin('#D8C9B0'), rough: 0.6, metal: 0, kind: MK.stone } as MatSpec,
  ruinStone: { color: lin('#C9A27E'), rough: 0.7, metal: 0, kind: MK.stone } as MatSpec,
  wood: { color: lin('#5A3B26'), rough: 0.8, metal: 0, kind: MK.wood } as MatSpec,
  woodLight: { color: lin('#8A6440'), rough: 0.75, metal: 0, kind: MK.wood } as MatSpec,
  teak: { color: lin('#A57B4E'), rough: 0.6, metal: 0, kind: MK.wood } as MatSpec,
  varnish: { color: lin('#6E3E22'), rough: 0.35, metal: 0, kind: MK.wood } as MatSpec,
  hullWhite: { color: lin('#E9E6DE'), rough: 0.4, metal: 0, kind: MK.plain } as MatSpec,
  tin: { color: lin('#8A8F93'), rough: 0.45, metal: 0.9, kind: MK.metal } as MatSpec,
  windowDark: { color: lin('#1A1E22'), rough: 0.15, metal: 0, kind: MK.glass } as MatSpec,
  frameWhite: { color: lin('#E8E4DA'), rough: 0.6, metal: 0, kind: MK.plain } as MatSpec,
  sail: { color: lin('#EDE6D6'), rough: 0.85, metal: 0, kind: MK.plain } as MatSpec,
  rope: { color: lin('#3A3026'), rough: 0.9, metal: 0, kind: MK.plain } as MatSpec,
  white: { color: lin('#E8E3D8'), rough: 0.7, metal: 0, kind: MK.stone } as MatSpec,
  lampGlass: { color: lin('#C8D4D0'), rough: 0.1, metal: 0, kind: MK.glass } as MatSpec,
  ironDark: { color: lin('#2C2E30'), rough: 0.5, metal: 0.8, kind: MK.metal } as MatSpec,
  snow: { color: lin('#F4F1EC'), rough: 0.6, metal: 0, kind: MK.snow } as MatSpec,
  rock: { color: lin('#4A4642'), rough: 0.85, metal: 0, kind: MK.stone } as MatSpec,
  tuff: { color: lin('#D9B48F'), rough: 0.9, metal: 0, kind: MK.tuff } as MatSpec,
};

function rockMatFor(world: WorldId): MatSpec {
  if (world === 'likya') return M.limestone;
  if (world === 'erciyes') return M.rock;
  if (world === 'kapadokya') return M.tuff;
  if (world === 'pamukkale') return { ...M.limestone, color: lin('#E9DCCB') };
  return M.stone;
}

// ---------------------------------------------------------------------------------------------------------------
// Primitive → displaced rock shell (generic fallback that is always within ±0.4 m of the collision shape).

function rockFromPrim(acc: MeshAcc, p: PropPrimitive, m: MatSpec, seed: number, amp = 0.32, detail = 2): void {
  const ico = icosphere(detail);
  if (p.kind === 'ellipsoid') {
    const base = acc.vertexCount;
    for (const v of ico.v) {
      const x = p.c[0] + v[0] * p.r[0], y = p.c[1] + v[1] * p.r[1], z = p.c[2] + v[2] * p.r[2];
      const n = new Vector3(v[0] / p.r[0], v[1] / p.r[1], v[2] / p.r[2]).normalize();
      const d = rockDisp(x, y, z, amp, seed);
      acc.vert(x + n.x * d, y + n.y * d, z + n.z * d, n.x, n.y, n.z, m, 0.75 + 0.25 * (v[1] * 0.5 + 0.5));
    }
    for (const f of ico.f) acc.tri(base + f[0], base + f[2], base + f[1]);
  } else if (p.kind === 'capsule') {
    const a = new Vector3(...p.a), b = new Vector3(...p.b);
    const d = b.clone().sub(a);
    const len = d.length();
    const w = len > 1e-6 ? d.clone().divideScalar(len) : new Vector3(0, 1, 0);
    const up = Math.abs(w.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
    const u = new Vector3().crossVectors(w, up).normalize();
    const v2 = new Vector3().crossVectors(u, w).normalize();
    const base = acc.vertexCount;
    for (const v of ico.v) {
      // stretch the sphere into a capsule along w
      const along = v[0];
      const shift = along >= 0 ? len / 2 : -len / 2;
      const c = a.clone().add(b).multiplyScalar(0.5);
      const n = w.clone().multiplyScalar(v[0]).addScaledVector(u, v[1]).addScaledVector(v2, v[2]).normalize();
      const pnt = c.clone().addScaledVector(w, shift).addScaledVector(n, p.r);
      const dd = rockDisp(pnt.x, pnt.y, pnt.z, amp, seed);
      acc.vert(pnt.x + n.x * dd, pnt.y + n.y * dd, pnt.z + n.z * dd, n.x, n.y, n.z, m, 0.8 + 0.2 * Math.max(0, n.y));
    }
    for (const f of ico.f) acc.tri(base + f[0], base + f[2], base + f[1]);
  } else if (p.kind === 'box') {
    const f = new Frame(p.c[0], p.c[1], p.c[2], p.yaw);
    const base = acc.vertexCount;
    const N = 4;
    const faces: [number[], number[], number[]][] = [
      [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
      [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
    ];
    for (const [n, uu, vv] of faces) {
      const start = acc.vertexCount;
      for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
        const su = (i / N) * 2 - 1, sv = (j / N) * 2 - 1;
        let lx = (n[0] + uu[0] * su + vv[0] * sv) * p.h[0];
        let ly = (n[1] + uu[1] * su + vv[1] * sv) * p.h[1];
        let lz = (n[2] + uu[2] * su + vv[2] * sv) * p.h[2];
        // rounded edges: pull corners in by `round`
        const r = Math.min(p.round, 0.45 * Math.min(p.h[0], p.h[1], p.h[2]));
        const k = (q: number, h: number): number => Math.sign(q) * Math.min(Math.abs(q), h - r * Math.max(0, (Math.abs(q) - (h - r)) / Math.max(r, 1e-3)));
        lx = k(lx, p.h[0]); ly = k(ly, p.h[1]); lz = k(lz, p.h[2]);
        const wx = f.px(lx, lz), wz = f.pz(lx, lz), wy = p.c[1] + ly;
        const nx = f.nx(n[0], n[2]), nz = f.nz(n[0], n[2]);
        const dd = rockDisp(wx, wy, wz, amp, seed);
        acc.vert(wx + nx * dd, wy + n[1] * dd, wz + nz * dd, nx, n[1], nz, m);
      }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const a = start + j * (N + 1) + i;
        acc.quad(a, a + 1, a + N + 2, a + N + 1);
      }
    }
    void base;
  } else {
    const f = new Frame(p.base[0], p.base[1], p.base[2], seed * 6.28);
    lathe(acc, f, 0, 0, 0, p.h, 8, 14, (t, a) => {
      const r = p.r0 + (p.r1 - p.r0) * t;
      return Math.max(0.05, r + rockDisp(Math.cos(a) * r, t * p.h, Math.sin(a) * r, amp, seed));
    }, m, true);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Specific generators

function mainBox(inst: PropInstance): { c: [number, number, number]; h: [number, number, number]; yaw: number } {
  for (const p of inst.prims) if (p.kind === 'box') return { c: p.c, h: p.h, yaw: p.yaw };
  // fallback from scale
  const s = inst.scale || 1;
  return { c: [inst.pos[0], inst.pos[1] + 3 * s, inst.pos[2]], h: [4 * s, 3 * s, 3 * s], yaw: inst.yaw };
}

/**
 * Karadeniz yayla house (sim params bw, bd, bh, rh; ridge along local z, eave 0.4 m): stone base, plank walls,
 * corner posts, white-framed windows, tin gable roof (metalness 0.9 / roughness 0.45, rust in shader). 4 variants.
 */
function house(acc: MeshAcc, inst: PropInstance, seed: number): void {
  const P = inst.params ?? {};
  const b = mainBox(inst);
  const bw = P.bw ?? b.h[0] * 2, bd = P.bd ?? b.h[2] * 2, bh = P.bh ?? b.h[1] * 2, rh = P.rh ?? 2.2;
  const v = Math.floor(inst.variant ?? 0) % 4;
  const f = new Frame(inst.pos[0], inst.pos[1], inst.pos[2], inst.yaw);
  const hx = bw / 2, hz = bd / 2;
  const baseH = Math.min(1.3, bh * 0.22) + (v === 2 ? 0.5 : 0);
  const eave = 0.4;
  const wood = v === 3 ? M.woodLight : M.wood;
  // stone base + plank walls (inset a few cm so the posts read)
  box(acc, f, -hx, -0.5, -hz, hx, baseH, hz, v === 1 ? M.stoneDark : M.stone, 4, 0.6);
  box(acc, f, -hx + 0.05, baseH, -hz + 0.05, hx - 0.05, bh, hz - 0.05, wood, 4 | 8);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(acc, f, sx * hx - 0.12, baseH, sz * hz - 0.12, sx * hx + 0.12, bh, sz * hz + 0.12, M.wood, 4);
  // horizontal sill beam between floors
  box(acc, f, -hx - 0.04, baseH, -hz - 0.04, hx + 0.04, baseH + 0.18, hz + 0.04, M.wood, 4);
  // windows on the long (z) sides, door on +x gable side
  const nWin = Math.max(1, Math.floor(bd / 2.2));
  const wy0 = baseH + (bh - baseH) * 0.3, wy1 = wy0 + Math.min(1.1, (bh - baseH) * 0.45);
  for (let i = 0; i < nWin; i++) {
    const z = -hz + bd * ((i + 0.5) / nWin);
    for (const sx of [-1, 1]) {
      const x = sx * (hx - 0.02);
      box(acc, f, x - 0.06, wy0 - 0.07, z - 0.5, x + 0.06, wy1 + 0.07, z + 0.5, M.frameWhite);
      box(acc, f, x - 0.08, wy0, z - 0.4, x + 0.08, wy1, z + 0.4, M.windowDark);
    }
  }
  box(acc, f, -0.55, baseH, hz - 0.02, 0.55, Math.min(bh, baseH + 2.0), hz + 0.06, M.woodLight);
  // gable roof: ridge along z at x = 0, eaves at x = ±(hx + eave) on y = bh
  const rx = hx + eave, rz = hz + eave;
  const ry0 = bh, ry1 = bh + rh;
  for (const sx of [-1, 1]) {
    const n = new Vector3(sx * rh, rx, 0).normalize();
    const p0: [number, number, number][] = [[sx * rx, ry0, -rz], [sx * rx, ry0, rz], [0, ry1, rz], [0, ry1, -rz]];
    const ids = p0.map(([x, y, z]) => acc.vert(f.px(x, z), f.oy + y, f.pz(x, z), f.nx(n.x, n.z), n.y, f.nz(n.x, n.z), M.tin));
    if (sx < 0) acc.quad(ids[0], ids[1], ids[2], ids[3]); else acc.quad(ids[0], ids[3], ids[2], ids[1]);
    const ids2 = p0.map(([x, y, z]) => acc.vert(f.px(x, z), f.oy + y - 0.05, f.pz(x, z), 0, -1, 0, M.wood, 0.5));
    if (sx < 0) acc.quad(ids2[0], ids2[3], ids2[2], ids2[1]); else acc.quad(ids2[0], ids2[1], ids2[2], ids2[3]);
  }
  // gable triangles (front/back, plank wood)
  for (const sz of [-1, 1]) {
    const z = sz * (hz - 0.05);
    const a = acc.vert(f.px(-hx, z), f.oy + bh, f.pz(-hx, z), f.nx(0, sz), 0, f.nz(0, sz), wood);
    const c = acc.vert(f.px(hx, z), f.oy + bh, f.pz(hx, z), f.nx(0, sz), 0, f.nz(0, sz), wood);
    const t = acc.vert(f.px(0, z), f.oy + ry1 - 0.12, f.pz(0, z), f.nx(0, sz), 0, f.nz(0, sz), wood);
    if (sz > 0) acc.tri(a, c, t); else acc.tri(a, t, c);
  }
  // balcony (variant 3) / stone chimney stack (variants 0, 2)
  if (v === 3) {
    box(acc, f, hx - 0.02, baseH + 0.9, -hz * 0.7, hx + 0.38, baseH + 1.05, hz * 0.7, M.woodLight);
    for (let i = 0; i <= 6; i++) { const z = -hz * 0.7 + (1.4 * hz) * (i / 6); box(acc, f, hx + 0.26, baseH + 1.05, z - 0.04, hx + 0.34, baseH + 1.9, z + 0.04, M.woodLight); }
  }
  if (v === 0 || v === 2) box(acc, f, -0.3, ry1 - rh * 0.55, hz * 0.45, 0.25, ry1 + 0.25, hz * 0.45 + 0.5, M.stoneDark);
  void seed;
}

/**
 * Likya gulet (sim params len, beam, free, mastH, masts; hull box with local z = bow axis, masts = capsules):
 * lofted full-bodied hull (white or varnished), teak deck, cabin, masts from the collision capsules, booms with
 * furled sails, bowsprit, stays, rails. Rocks ±1.3° in the shader.
 */
function gulet(acc: MeshAcc, inst: PropInstance, seed: number): void {
  const P = inst.params ?? {};
  const b = mainBox(inst);
  const L = P.len ?? b.h[2] * 2, B = P.beam ?? b.h[0] * 2, free = P.free ?? 2;
  const f = new Frame(inst.pos[0], inst.pos[1], inst.pos[2], inst.yaw);
  acc.cx = inst.pos[0]; acc.cy = inst.pos[1] + free * 0.5; acc.cz = inst.pos[2];
  acc.rock = 0.022;
  const white = (Math.floor(inst.variant ?? 0) % 2) === 0;
  const hullM = white ? M.hullWhite : M.varnish;
  const NS = 20, NC = 8;
  const draft = 1.0;
  // s: -1 stern … +1 bow (local +z). Full-bodied hull: rounded transom, raked bow.
  const sec = (s0: number): { w: number; top: number; bot: number } => {
    const w = (B / 2) * (s0 > 0 ? Math.pow(Math.max(0, 1 - Math.pow(s0, 2.6)), 0.5) * (1 - 0.12 * s0) + (s0 > 0.97 ? 0 : 0) : Math.pow(Math.max(0, 1 - Math.pow(-s0, 6)), 0.3) * 0.94);
    const top = free + (s0 > 0 ? 0.32 * s0 * s0 : 0.12 * s0 * s0);
    const bot = -draft * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(s0), 3)), 0.5);
    return { w, top, bot };
  };
  const hullBase = acc.vertexCount;
  for (let i = 0; i <= NS; i++) {
    const s0 = (i / NS) * 2 - 1;
    const z = s0 * L / 2;
    const { w, top, bot } = sec(s0);
    for (let j = 0; j <= NC * 2; j++) {
      const k = j / NC - 1;
      const ang = k * Math.PI / 2;
      const yy = (j === 0 || j === NC * 2) ? top : top + (bot - top) * Math.cos(ang);
      const xx = w * Math.sin(ang);
      const ny = -Math.cos(ang), nx = Math.sin(ang);
      const band = yy > top - 0.4 ? M.varnish : (yy < 0.08 ? { ...hullM, color: lin(white ? '#1E3A5A' : '#3A2416') } : hullM);
      acc.vert(f.px(xx, z), f.oy + yy, f.pz(xx, z), f.nx(nx, 0), ny * 0.6, f.nz(nx, 0), band);
    }
  }
  const row = NC * 2 + 1;
  for (let i = 0; i < NS; i++) for (let j = 0; j < NC * 2; j++) {
    const a = hullBase + i * row + j;
    acc.quad(a, a + row, a + row + 1, a + 1);
  }
  // deck (teak) along the sheer
  const dbase = acc.vertexCount;
  for (let i = 0; i <= NS; i++) {
    const s0 = (i / NS) * 2 - 1;
    const { w, top } = sec(s0);
    const z = s0 * L / 2;
    for (const xx of [-w * 0.97, w * 0.97]) acc.vert(f.px(xx, z), f.oy + top - 0.05, f.pz(xx, z), 0, 1, 0, M.teak);
  }
  for (let i = 0; i < NS; i++) { const a = dbase + i * 2; acc.quad(a, a + 1, a + 3, a + 2); }
  // aft cabin + deckhouse windows
  box(acc, f, -B * 0.3, free - 0.05, -L * 0.38, B * 0.3, free + 1.2, L * 0.02, M.hullWhite);
  box(acc, f, -B * 0.33, free + 1.2, -L * 0.39, B * 0.33, free + 1.28, L * 0.03, M.teak);
  for (let i = 0; i < 5; i++) {
    const z = -L * 0.35 + i * L * 0.072;
    for (const sx of [-1, 1]) box(acc, f, sx * B * 0.3 - 0.02, free + 0.5, z, sx * B * 0.3 + 0.02, free + 0.9, z + 0.42, M.windowDark);
  }
  // masts: exactly the collision capsules
  const mastTops: Vector3[] = [];
  for (const p of inst.prims) {
    if (p.kind !== 'capsule') continue;
    const a = new Vector3(...p.a), c = new Vector3(...p.b);
    tube(acc, a, c, Math.min(0.2, p.r), Math.min(0.1, p.r * 0.5), 6, M.varnish);
    mastTops.push(c);
    // boom + furled sail toward the stern
    const aft = new Vector3(f.px(0, -L * 0.28) - f.ox, 0, f.pz(0, -L * 0.28) - f.oz);
    const bA = a.clone().add(new Vector3(0, 1.6, 0));
    tube(acc, bA, bA.clone().add(aft), 0.08, 0.07, 5, M.varnish);
    tube(acc, bA.clone().add(new Vector3(0, 0.2, 0)), bA.clone().add(aft).add(new Vector3(0, 0.18, 0)), 0.22, 0.12, 6, M.sail);
  }
  const bow = new Vector3(f.px(0, L / 2), f.oy + free + 0.3, f.pz(0, L / 2));
  const bs = new Vector3(f.px(0, L / 2 + L * 0.12), f.oy + free + 0.65, f.pz(0, L / 2 + L * 0.12));
  tube(acc, bow, bs, 0.1, 0.06, 5, M.varnish);
  mastTops.sort((p, q) => (f.nz(p.x - f.ox, p.z - f.oz)) - (f.nz(q.x - f.ox, q.z - f.oz)));
  if (mastTops.length > 0) {
    tube(acc, bs, mastTops[mastTops.length - 1], 0.025, 0.025, 3, M.rope);
    for (let i = 0; i + 1 < mastTops.length; i++) tube(acc, mastTops[i], mastTops[i + 1], 0.025, 0.025, 3, M.rope);
    tube(acc, mastTops[0], new Vector3(f.px(0, -L / 2), f.oy + free + 0.2, f.pz(0, -L / 2)), 0.025, 0.025, 3, M.rope);
  }
  for (const sx of [-1, 1]) {
    for (let i = 0; i < NS; i += 2) {
      const s0 = (i / NS) * 2 - 1, s1 = ((i + 2) / NS) * 2 - 1;
      const a = sec(s0), c = sec(s1);
      const p0 = new Vector3(f.px(sx * a.w * 0.95, s0 * L / 2), f.oy + a.top + 0.7, f.pz(sx * a.w * 0.95, s0 * L / 2));
      const p1 = new Vector3(f.px(sx * c.w * 0.95, s1 * L / 2), f.oy + c.top + 0.7, f.pz(sx * c.w * 0.95, s1 * L / 2));
      tube(acc, p0, p1, 0.035, 0.035, 4, M.varnish);
    }
  }
  acc.rock = 0;
  void seed;
}

/** Rock-cut temple facade (generic Lycian-style): podium, two columns in antis, entablature, pediment, panelled door. */
function tomb(acc: MeshAcc, inst: PropInstance, seed: number, world: WorldId): void {
  const b = mainBox(inst);
  const f = new Frame(b.c[0], b.c[1] - b.h[1], b.c[2], b.yaw);
  const W = b.h[0], D = b.h[2], H = b.h[1] * 2;
  const rockM = rockMatFor(world);
  // rock mass the facade is carved into (behind), displaced shell
  rockFromPrim(acc, { kind: 'box', c: [f.px(0, -D * 0.25), b.c[1], f.pz(0, -D * 0.25)], h: [W, b.h[1], D * 0.75], yaw: b.yaw, round: 0.6 }, rockM, seed, 0.3, 2);
  const fz = D - 0.02; // facade plane at +z
  const st = M.limestone;
  const podH = H * 0.12, colH = H * 0.5, entH = H * 0.1;
  box(acc, f, -W * 0.92, 0, fz - 0.6, W * 0.92, podH, fz, st);
  // antae
  box(acc, f, -W * 0.82, podH, fz - 0.5, -W * 0.62, podH + colH, fz - 0.05, st);
  box(acc, f, W * 0.62, podH, fz - 0.5, W * 0.82, podH + colH, fz - 0.05, st);
  // columns (lathe, fluted)
  const colR = Math.min(W * 0.07, 0.45);
  const fc = new Frame(b.c[0], b.c[1] - b.h[1], b.c[2], b.yaw);
  for (const sx of [-0.28, 0.28]) {
    lathe(acc, fc, sx * W * 2 * 0.5 * 1.0, fz - 0.45, podH, podH + colH, 6, 12, (t, a) => colR * (1 - 0.1 * t) * (1 + 0.04 * Math.cos(a * 12)), st, false);
  }
  // recessed door with panels (dark interior)
  const dw = W * 0.28, dh = colH * 0.62;
  box(acc, f, -dw, podH, fz - 1.2, dw, podH + dh, fz - 1.0, { ...M.windowDark, color: lin('#2A241E'), rough: 0.9, kind: MK.stone });
  box(acc, f, -W * 0.6, podH, fz - 1.25, W * 0.6, podH + colH, fz - 1.15, st);
  for (const px of [-0.5, 0.5]) for (const py of [0.25, 0.7]) {
    const cx = px * dw, cy = podH + dh * py;
    box(acc, f, cx - dw * 0.38, cy - dh * 0.18, fz - 1.0, cx + dw * 0.38, cy + dh * 0.18, fz - 0.94, st);
  }
  // entablature + dentils + pediment
  const ey = podH + colH;
  box(acc, f, -W * 0.9, ey, fz - 0.6, W * 0.9, ey + entH, fz, st);
  for (let i = 0; i < 14; i++) { const x = -W * 0.85 + i * (1.7 * W / 13); box(acc, f, x - 0.08, ey + entH * 0.1, fz - 0.02, x + 0.08, ey + entH * 0.45, fz + 0.1, st); }
  const pTop = Math.min(H, ey + entH + H * 0.2);
  const n = new Vector3(0, 0, 1);
  const a = acc.vert(f.px(-W * 0.92, fz), f.oy + ey + entH, f.pz(-W * 0.92, fz), f.nx(n.x, n.z), 0, f.nz(n.x, n.z), st);
  const c = acc.vert(f.px(W * 0.92, fz), f.oy + ey + entH, f.pz(W * 0.92, fz), f.nx(n.x, n.z), 0, f.nz(n.x, n.z), st);
  const t = acc.vert(f.px(0, fz), f.oy + pTop, f.pz(0, fz), f.nx(n.x, n.z), 0, f.nz(n.x, n.z), st);
  acc.tri(a, c, t);
  box(acc, f, -W * 0.94, ey + entH, fz - 0.5, W * 0.94, ey + entH + 0.18, fz + 0.06, st);
}

/** Lighthouse (sim params h, r0, r1, lanternH): stone foot, white tower cone, gallery, lantern room, dark cap. */
function lighthouse(acc: MeshAcc, inst: PropInstance): void {
  const P = inst.params ?? {};
  let H = P.h ?? 18, r0 = P.r0 ?? 2.6, r1 = P.r1 ?? 1.9;
  const lanternH = P.lanternH ?? 3;
  let bx = inst.pos[0], by = inst.pos[1], bz = inst.pos[2];
  for (const p of inst.prims) if (p.kind === 'cone') { H = p.h; r0 = p.r0; r1 = p.r1; bx = p.base[0]; by = p.base[1]; bz = p.base[2]; }
  const f = new Frame(bx, by, bz, inst.yaw);
  lathe(acc, f, 0, 0, -0.5, 1.4, 1, 16, () => r0 + 0.25, M.stone, true);
  lathe(acc, f, 0, 0, 1.4, H, 12, 18, (t) => r0 + (r1 - r0) * ((1.4 + t * (H - 1.4)) / H) - 0.04, M.white, false);
  // gallery deck + railing, lantern room (glass), cap
  lathe(acc, f, 0, 0, H - 0.05, H + 0.22, 1, 18, () => r1 + 0.28, M.ironDark, true);
  lathe(acc, f, 0, 0, H + 0.22, H + lanternH * 0.72, 2, 12, () => r1 * 0.72, M.lampGlass, false);
  lathe(acc, f, 0, 0, H + lanternH * 0.72, H + lanternH, 3, 12, (t) => r1 * 0.8 * (1 - t * 0.85), M.ironDark, true);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const x = Math.cos(a) * (r1 + 0.22), z = Math.sin(a) * (r1 + 0.22);
    tube(acc, new Vector3(f.px(x, z), f.oy + H + 0.22, f.pz(x, z)), new Vector3(f.px(x, z), f.oy + H + 1.1, f.pz(x, z)), 0.03, 0.03, 3, M.ironDark);
  }
  // red band (generic day-mark)
  lathe(acc, f, 0, 0, H * 0.62, H * 0.7, 1, 18, (t) => r0 + (r1 - r0) * ((H * 0.62 + t * H * 0.08) / H) - 0.02, { ...M.white, color: lin('#9E2B25') }, false);
}

/** Pamukkale column: plinth, fluted shaft (Ionic-ish capital or broken top). Fitted to cone/capsule. */
function column(acc: MeshAcc, inst: PropInstance, seed: number): void {
  let H = 6, r = 0.45, bx = inst.pos[0], by = inst.pos[1], bz = inst.pos[2];
  for (const p of inst.prims) {
    if (p.kind === 'cone') { H = p.h; r = Math.max(p.r0, p.r1); bx = p.base[0]; by = p.base[1]; bz = p.base[2]; }
    else if (p.kind === 'capsule') { const lo = Math.min(p.a[1], p.b[1]); H = Math.abs(p.b[1] - p.a[1]) + 2 * p.r; r = p.r; bx = p.a[0]; by = lo - p.r; bz = p.a[2]; }
    else if (p.kind === 'box') { H = p.h[1] * 2; r = Math.min(p.h[0], p.h[2]); bx = p.c[0]; by = p.c[1] - p.h[1]; bz = p.c[2]; }
  }
  const f = new Frame(bx, by, bz, inst.yaw);
  const broken = (Math.floor(inst.variant ?? 0) % 2) === 1;
  const m = M.ruinStone;
  box(acc, f, -r * 1.25, -0.3, -r * 1.25, r * 1.25, Math.min(0.5, H * 0.08), r * 1.25, m);
  const shaftTop = broken ? H : H - Math.min(0.7, H * 0.1);
  lathe(acc, f, 0, 0, Math.min(0.5, H * 0.08), shaftTop, 8, 20, (t, a) => {
    let rr = r * (1 - 0.12 * t) * (1 - 0.035 * Math.max(0, Math.cos(a * 20)));
    if (broken && t > 0.85) rr *= 1 - 0.25 * Math.max(0, Math.sin(a * 3 + seed * 6)) * (t - 0.85) / 0.15;
    return rr;
  }, m, true);
  if (!broken) {
    box(acc, f, -r * 1.3, shaftTop, -r * 1.1, r * 1.3, shaftTop + 0.28, r * 1.1, m);
    for (const sx of [-1, 1]) lathe(acc, new Frame(f.px(sx * r * 1.15, 0), by + shaftTop, f.pz(sx * r * 1.15, 0), inst.yaw + Math.PI / 2), 0, 0, -0.05, 0.3, 1, 8, () => 0.2, m, true);
    box(acc, f, -r * 1.35, shaftTop + 0.28, -r * 1.35, r * 1.35, H, r * 1.35, m);
  }
}

/** Broken stone wall: ashlar course blocks with a ragged top, fitted inside its box prims. */
function wall(acc: MeshAcc, inst: PropInstance, seed: number, mat: MatSpec): void {
  for (const p of inst.prims) {
    if (p.kind !== 'box') { rockFromPrim(acc, p, mat, seed, 0.2, 1); continue; }
    const f = new Frame(p.c[0], p.c[1] - p.h[1], p.c[2], p.yaw);
    const L = p.h[0], T = p.h[2], H = p.h[1] * 2;
    const course = 0.55;
    const rows = Math.max(1, Math.round(H / course));
    for (let r = 0; r < rows; r++) {
      const y0 = r * (H / rows), y1 = (r + 1) * (H / rows);
      let x = -L + (r % 2) * 0.4;
      let k = 0;
      while (x < L - 0.05) {
        const w = 0.8 + hashSeed(seed * 1000 + r * 97 + k) * 0.7;
        const x1 = Math.min(L, x + w);
        // ragged top: upper rows are missing blocks toward the ends
        const keep = hashSeed(seed * 777 + r * 31 + k) > Math.max(0, (r - rows * 0.5) / rows) * 1.6 * (0.4 + Math.abs((x + x1) / (2 * L)));
        if (keep) {
          const inset = 0.03 + 0.04 * hashSeed(seed + r * 13 + k * 7);
          box(acc, f, Math.max(-L, x) + inset, y0 + inset * 0.5, -T + inset, x1 - inset, y1 - inset * 0.5, T - inset, mat, r > 0 ? 4 : 0);
        }
        x = x1;
        k++;
      }
    }
  }
}

/** Theatre: each tier×segment box prim becomes a limestone seat block with a front lip and a foot groove. */
function theater(acc: MeshAcc, inst: PropInstance, seed: number): void {
  let k = 0;
  for (const p of inst.prims) {
    if (p.kind !== 'box') { rockFromPrim(acc, p, M.ruinStone, seed, 0.15, 1); continue; }
    const f = new Frame(p.c[0], p.c[1] - p.h[1], p.c[2], p.yaw);
    const H = p.h[1] * 2;
    const worn = hashSeed(seed * 100 + k++);
    const m = worn > 0.8 ? { ...M.ruinStone, color: lin('#B89270') } : M.ruinStone;
    box(acc, f, -p.h[0], 0, -p.h[2], p.h[0], H - 0.06, p.h[2], m, 4);
    // seat lip on the inner edge (box-local +z faces the stage in the sim's theatre layout)
    box(acc, f, -p.h[0] + 0.02, H - 0.08, p.h[2] - 0.42, p.h[0] - 0.02, H, p.h[2], m, 4);
    if (worn > 0.6) box(acc, f, -p.h[0] * 0.3, H - 0.06, -p.h[2] * 0.2, p.h[0] * 0.1, H - 0.02, p.h[2] * 0.4, m, 4);
  }
}

/** Erciyes ice cornice: wind-sculpted snow lip over its prims with an icy blue underside. */
function cornice(acc: MeshAcc, inst: PropInstance, seed: number): void {
  for (const p of inst.prims) rockFromPrim(acc, p, M.snow, seed, 0.3, 2);
}

// ---------------------------------------------------------------------------------------------------------------
// Material

const VERT_PARS = /* glsl */ `
attribute vec4 aMat;
attribute vec4 aCtr;
uniform float uTime;
uniform vec2 uFade; // start, end distance
varying vec4 vKMat;
varying vec3 vKWorld;
varying vec3 vKNrmW;
varying float vKFade;
`;

const VERT_PRE = /* glsl */ `
  vec3 kP = position;
  vec3 kN = normal;
  if (aCtr.w > 0.0) {
    // gentle rocking about the hull centre (small-angle rotation, ±1.3°)
    float ph = aCtr.x * 0.07 + aCtr.z * 0.05;
    float roll = sin(uTime * 0.55 + ph) * aCtr.w;
    float pitch = sin(uTime * 0.37 + ph * 1.7) * aCtr.w * 0.5;
    vec3 o = kP - aCtr.xyz;
    kP = aCtr.xyz + vec3(o.x - o.y * roll, o.y + o.x * roll + o.z * pitch, o.z - o.y * pitch);
    kN = normalize(vec3(kN.x - kN.y * roll, kN.y + kN.x * roll + kN.z * pitch, kN.z - kN.y * pitch));
  }
  float kd = distance(aCtr.xyz, cameraPosition);
  vKFade = 1.0 - clamp((kd - uFade.x) / max(uFade.y - uFade.x, 1.0), 0.0, 1.0);
  vKMat = aMat; vKWorld = kP; vKNrmW = kN;
`;

const FRAG_PARS = /* glsl */ `
${GLSL_NOISE}
${GLSL_DITHER}
uniform sampler2D uStone;
uniform sampler2D uWood;
uniform sampler2D uSnow;
uniform float uOct;
varying vec4 vKMat;
varying vec3 vKWorld;
varying vec3 vKNrmW;
varying float vKFade;
vec3 kDetN; float kCav;
vec4 kTri(sampler2D t, vec3 p, vec3 n, float sc) {
  vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z);
  return texture2D(t, p.zy * sc) * w.x + texture2D(t, p.xz * sc) * w.y + texture2D(t, p.xy * sc) * w.z;
}
`;

const FRAG_COLOR = /* glsl */ `
  {
    vec3 n = normalize(vKNrmW);
    int kind = int(vKMat.z + 0.5);
    vec4 d = vec4(0.5, 0.5, 0.5, 1.0);
    if (kind == ${MK.stone} || kind == ${MK.tuff}) d = kTri(uStone, vKWorld, n, kind == ${MK.tuff} ? 0.18 : 0.32);
    else if (kind == ${MK.wood}) d = kTri(uWood, vKWorld.yxz * vec3(1.0, 1.0, 1.0), n, 0.35);
    else if (kind == ${MK.snow}) d = kTri(uSnow, vKWorld, n, 0.12);
    kDetN = vec3(d.xy * 2.0 - 1.0, 1.0);
    kCav = d.a;
    vec3 col = vColor.rgb;
    float macro = kNoise3(vKWorld * 0.13) - 0.5;
    if (kind == ${MK.stone} || kind == ${MK.tuff}) col *= 0.9 + 0.25 * (d.b - 0.5) + 0.25 * macro;
    if (kind == ${MK.wood}) col *= 0.78 + 0.45 * d.b + 0.15 * macro;
    if (kind == ${MK.metal}) {
      // tin roof: corrugation shading + rust streaks from the ridge
      float rust = smoothstep(0.55, 0.85, kNoise2(vKWorld.xz * 0.35 + vKWorld.y * 0.5) + 0.25 * kNoise2(vKWorld.xz * 2.0));
      col = mix(col, vec3(0.32, 0.12, 0.04), rust * 0.75);
      kRoughOv = mix(vKMat.x, 0.85, rust);
      kMetalOv = mix(vKMat.y, 0.2, rust);
    }
    if (kind == ${MK.snow}) {
      // icy blue in overhang shadows / undersides
      col = mix(col, vec3(0.52, 0.75, 0.86), smoothstep(0.1, -0.6, n.y) * 0.8);
    }
    col *= vKMat.w;
    diffuseColor.rgb = col;
  }
`;

const FRAG_NORMAL = /* glsl */ `
  {
    vec3 Nw = normalize(vKNrmW);
    vec3 T = normalize(cross(abs(Nw.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), Nw));
    vec3 B = cross(Nw, T);
    int kind = int(vKMat.z + 0.5);
    float s = (kind == ${MK.metal}) ? 0.0 : (kind == ${MK.glass} ? 0.0 : 0.8);
    vec3 pn = normalize(Nw + (T * kDetN.x + B * kDetN.y) * s);
    if (kind == ${MK.metal}) pn = normalize(Nw + T * sin(dot(vKWorld, T) * 9.0) * 0.12);
    normal = normalize((viewMatrix * vec4(pn, 0.0)).xyz);
  }
`;

const FRAG_PRE = /* glsl */ `
  if (kIGN(gl_FragCoord.xy) >= vKFade) discard;
  float kRoughOv = -1.0; float kMetalOv = -1.0;
`;

function makeMiscMaterial(cfg: PropTierConfig, fade: { value: Vector2 }, depth: boolean): MeshStandardMaterial | MeshDepthMaterial {
  const uniforms = {
    uTime: sharedUniforms.uTime, uFade: fade,
    uStone: { value: detailTexture('stone') }, uWood: { value: detailTexture('wood') }, uSnow: { value: detailTexture('snow') }, uOct: { value: cfg.detailOctaves },
  };
  if (depth) {
    return patchMaterial(new MeshDepthMaterial({ depthPacking: RGBADepthPacking }), {
      key: 'misc-depth', uniforms, vertexPars: VERT_PARS, vertexPre: VERT_PRE,
      vertexNormal: 'vec3 objectNormal = kN;', vertexBegin: 'vec3 transformed = kP;',
      fragPars: GLSL_DITHER + 'varying float vKFade;', fragPre: 'if (kIGN(gl_FragCoord.xy) >= vKFade) discard;',
    });
  }
  const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 });
  return patchMaterial(m, {
    key: 'misc',
    uniforms,
    vertexPars: VERT_PARS,
    vertexPre: VERT_PRE,
    vertexNormal: 'vec3 objectNormal = kN;',
    vertexBegin: 'vec3 transformed = kP;',
    fragPars: FRAG_PARS,
    fragPre: FRAG_PRE,
    fragColor: FRAG_COLOR,
    fragRoughness: 'roughnessFactor = kRoughOv >= 0.0 ? kRoughOv : vKMat.x;',
    fragMetalness: 'metalnessFactor = kMetalOv >= 0.0 ? kMetalOv : vKMat.y;',
    fragNormal: FRAG_NORMAL,
    fragLight: 'reflectedLight.indirectDiffuse *= mix(0.6, 1.0, kCav);',
  });
}

// ---------------------------------------------------------------------------------------------------------------

interface Cell { mesh: Mesh; cx: number; cy: number; cz: number; r: number; tris: number }

const CELL = 512;
const _m = new Matrix4();

export class MiscLayer {
  private cells: Cell[] = [];
  private cfg: PropTierConfig;
  private readonly parent: Object3D;
  private readonly world: WorldId;
  private readonly fade = { value: new Vector2(1e5, 1e5 + 1) };
  private mat: MeshStandardMaterial | MeshDepthMaterial | null = null;
  private depthMat: MeshStandardMaterial | MeshDepthMaterial | null = null;
  private readonly frustum = new Frustum();
  private visCalls = 0;
  private visTris = 0;
  counts: Record<string, number> = {};

  constructor(parent: Object3D, cfg: PropTierConfig, world: WorldId) {
    this.parent = parent;
    this.cfg = cfg;
    this.world = world;
  }

  build(props: PropInstance[], _sampler: TerrainSampler | null): void {
    this.dispose();
    const accs = new Map<number, MeshAcc>();
    for (const inst of props) {
      const gx = Math.floor(inst.pos[0] / CELL), gz = Math.floor(inst.pos[2] / CELL);
      const key = (gx + 1000) * 4096 + (gz + 1000);
      let acc = accs.get(key);
      if (!acc) { acc = new MeshAcc(); accs.set(key, acc); }
      // prop centre for the distance fade (and rocking pivot)
      let cy = inst.pos[1];
      if (inst.prims.length > 0) { const [a, b] = primYRange(inst.prims[0]); cy = (a + b) / 2; }
      acc.cx = inst.pos[0]; acc.cy = cy; acc.cz = inst.pos[2]; acc.rock = 0;
      const seed = hashSeed(inst.id * 13 + 1) * 100;
      this.counts[inst.type] = (this.counts[inst.type] ?? 0) + 1;
      switch (inst.type) {
        case 'house': house(acc, inst, seed); break;
        case 'gulet': gulet(acc, inst, seed); break;
        case 'tomb': tomb(acc, inst, seed, this.world); break;
        case 'lighthouse': lighthouse(acc, inst); break;
        case 'column': column(acc, inst, seed); break;
        case 'wall': wall(acc, inst, seed, M.ruinStone); break;
        case 'theater': theater(acc, inst, seed); break;
        case 'cornice': cornice(acc, inst, seed); break;
        case 'arch': for (const p of inst.prims) rockFromPrim(acc, p, rockMatFor(this.world), seed, 0.32, 2); break;
        case 'rock': for (const p of inst.prims) rockFromPrim(acc, p, this.world === 'erciyes' && hashSeed(inst.id) > 0.6 ? M.snow : rockMatFor(this.world), seed, 0.32, 2); break;
        default: for (const p of inst.prims) rockFromPrim(acc, p, rockMatFor(this.world), seed, 0.3, 1);
      }
    }
    this.mat = makeMiscMaterial(this.cfg, this.fade, false);
    this.depthMat = makeMiscMaterial(this.cfg, this.fade, true);
    for (const acc of accs.values()) {
      if (acc.idx.length === 0) continue;
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(acc.pos, 3));
      g.setAttribute('normal', new Float32BufferAttribute(acc.nrm, 3));
      g.setAttribute('color', new Float32BufferAttribute(acc.col, 3));
      g.setAttribute('aMat', new Float32BufferAttribute(acc.mat, 4));
      g.setAttribute('aCtr', new Float32BufferAttribute(acc.ctr, 4));
      g.setIndex(acc.idx);
      g.computeBoundingSphere();
      const mesh = new Mesh(g, this.mat);
      mesh.customDepthMaterial = this.depthMat as MeshDepthMaterial;
      mesh.castShadow = this.cfg.heroShadows;
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = false;
      mesh.name = 'misc-cell';
      const bs = g.boundingSphere!;
      this.cells.push({ mesh, cx: bs.center.x, cy: bs.center.y, cz: bs.center.z, r: bs.radius, tris: acc.idx.length / 3 });
      this.parent.add(mesh);
    }
    this.applyDistances();
  }

  private applyDistances(): void {
    const max = this.cfg.miscMax;
    this.fade.value.set(max * (1 - this.cfg.fadeFrac), max);
    for (const c of this.cells) c.mesh.castShadow = this.cfg.heroShadows;
  }

  setTier(cfg: PropTierConfig): void {
    this.cfg = cfg;
    this.applyDistances();
  }

  update(camera: Camera, _t: number): void {
    _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(_m);
    const e = camera.matrixWorld.elements;
    const px = e[12], py = e[13], pz = e[14];
    const max = this.cfg.miscMax;
    this.visCalls = 0;
    this.visTris = 0;
    for (const c of this.cells) {
      const d = Math.hypot(c.cx - px, c.cy - py, c.cz - pz) - c.r;
      const vis = d < max && sphereInFrustum(this.frustum.planes, c.cx, c.cy, c.cz, c.r + 20);
      c.mesh.visible = vis;
      if (vis) { this.visCalls++; this.visTris += c.tris; }
    }
  }

  calls(): number { return this.visCalls; }
  triangles(): number { return this.visTris; }

  dispose(): void {
    for (const c of this.cells) { this.parent.remove(c.mesh); c.mesh.geometry.dispose(); }
    this.cells = [];
    this.mat?.dispose(); this.depthMat?.dispose();
    this.mat = null; this.depthMat = null;
  }
}
