// Replay / highlight-clip director (§2.4 "Tekrar açıları kütüphanesi", §1 "sinematik çarpma tekrarı").
// Shot library: Telephoto follow (side, FOV 18–25°, 40–80 m), Fixed Ground (placed on the terrain ahead of the
// event, pans as the pilot passes), Helmet, Orbit (slow-mo moments), Drone (top), Rock Edge (attached to the
// grazed surface). Auto-director: proximity peak → Fixed Ground; gate / balloon thread → Telephoto;
// crash → Telephoto + Orbit; gaps → Telephoto/Drone alternation. Cuts between shots (never fast pans),
// in-shot angular speed ≤ 90°/s, slow-mo 0.25–0.5× only around events with 0.3 s eased transitions.
import * as THREE from 'three';
import type { SimEvent } from '../../sim/types.ts';
import type { TerrainSampler } from '../../sim/terrain/types.ts';

export interface ReplayFrame {
  t: number; // sim seconds
  pos: [number, number, number];
  vel: [number, number, number];
  phi: number;
  /** Proximity distance (m) at this frame (Infinity if none). */
  d: number;
}

export type ShotKind = 'telephoto' | 'fixedGround' | 'helmet' | 'orbit' | 'drone' | 'rockEdge';

export interface ReplayShot {
  kind: ShotKind;
  t0: number;
  t1: number;
  /** World anchor (fixed ground / rock edge / orbit centre). */
  anchor: [number, number, number];
  side: 1 | -1;
  fov: number;
}

interface SlowMo {
  t: number;
  scale: number;
  half: number;
}

const MAX_ANG_SPEED = (90 * Math.PI) / 180;

export class ReplayDirector {
  readonly camera: THREE.PerspectiveCamera;
  sampler: TerrainSampler | null;
  shots: ReplayShot[] = [];
  private frames: ReplayFrame[] = [];
  private slowmos: SlowMo[] = [];
  private current = -1;
  private readonly dir = new THREE.Vector3(0, 0, -1);
  private readonly tmp = new THREE.Vector3();
  private readonly p = new THREE.Vector3();
  private readonly v = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly smooth = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, sampler: TerrainSampler | null = null) {
    this.camera = camera;
    this.sampler = sampler;
  }

  /** Best ≤ 8 s highlight window: centred on the minimum proximity distance (or the crash). */
  static highlight(frames: readonly ReplayFrame[], events: readonly SimEvent[], tickRate = 60, maxLen = 8): { t0: number; t1: number } {
    if (frames.length === 0) return { t0: 0, t1: 0 };
    let best = frames[0];
    for (const f of frames) if (f.d < best.d) best = f;
    const crash = events.find((e) => e.type === 'crash');
    const tc = crash ? crash.tick / tickRate : best.t;
    const tEnd = frames[frames.length - 1].t;
    const t0 = Math.max(frames[0].t, Math.min(tc - maxLen * 0.6, tEnd - maxLen));
    return { t0, t1: Math.min(tEnd, t0 + maxLen) };
  }

  private ground(x: number, z: number): number {
    return this.sampler ? this.sampler.height(x, z) : -1e9;
  }

  /** Sample the recorded trajectory at time t (linear interpolation). */
  sample(t: number, pos: THREE.Vector3, vel: THREE.Vector3): number {
    const f = this.frames;
    if (f.length === 0) return Infinity;
    let lo = 0;
    let hi = f.length - 1;
    if (t <= f[0].t) lo = hi = 0;
    else if (t >= f[hi].t) lo = hi;
    else {
      while (hi - lo > 1) {
        const m = (lo + hi) >> 1;
        if (f[m].t <= t) lo = m;
        else hi = m;
      }
    }
    const a = f[lo];
    const b = f[hi];
    const k = hi === lo ? 0 : (t - a.t) / (b.t - a.t);
    pos.set(a.pos[0] + (b.pos[0] - a.pos[0]) * k, a.pos[1] + (b.pos[1] - a.pos[1]) * k, a.pos[2] + (b.pos[2] - a.pos[2]) * k);
    vel.set(a.vel[0] + (b.vel[0] - a.vel[0]) * k, a.vel[1] + (b.vel[1] - a.vel[1]) * k, a.vel[2] + (b.vel[2] - a.vel[2]) * k);
    return a.d + (b.d - a.d) * k;
  }

  /** Build the shot list for [t0, t1] (sim seconds) from recorded frames + sim events. */
  plan(frames: ReplayFrame[], events: readonly SimEvent[], tickRate = 60, t0 = frames[0]?.t ?? 0, t1 = frames[frames.length - 1]?.t ?? 0): ReplayShot[] {
    this.frames = frames;
    this.shots = [];
    this.slowmos = [];
    this.current = -1;
    const evs = events
      .map((e) => ({ e, t: e.tick / tickRate }))
      .filter((x) => x.t >= t0 - 0.5 && x.t <= t1 + 0.5)
      .sort((a, b) => a.t - b.t);
    type Key = { t: number; kind: ShotKind; anchor: [number, number, number]; slow: number };
    const keys: Key[] = [];
    for (const { e, t } of evs) {
      this.sample(t, this.p, this.v);
      if (e.type === 'graze') {
        // Fixed Ground ahead of the graze point, or Rock Edge on strong grazes.
        const vh = Math.hypot(this.v.x, this.v.z) || 1;
        const ax = this.p.x + (this.v.x / vh) * 28 - (this.v.z / vh) * 5 * e.side;
        const az = this.p.z + (this.v.z / vh) * 28 + (this.v.x / vh) * 5 * e.side;
        const kind: ShotKind = e.strength > 0.7 ? 'rockEdge' : 'fixedGround';
        const anchor: [number, number, number] =
          kind === 'rockEdge' ? [e.pos[0], e.pos[1] + 1.2, e.pos[2]] : [ax, this.ground(ax, az) + 1.6, az];
        keys.push({ t, kind, anchor, slow: 0.35 });
      } else if (e.type === 'gate' || e.type === 'balloonThread') {
        keys.push({ t, kind: 'telephoto', anchor: [this.p.x, this.p.y, this.p.z], slow: e.type === 'balloonThread' ? 0.5 : 1 });
      } else if (e.type === 'crash') {
        keys.push({ t: t - 1.2, kind: 'telephoto', anchor: [this.p.x, this.p.y, this.p.z], slow: 1 });
        keys.push({ t, kind: 'orbit', anchor: [e.pos[0], e.pos[1], e.pos[2]], slow: 0.3 });
      } else if (e.type === 'parachuteOpen') {
        keys.push({ t, kind: 'drone', anchor: [this.p.x, this.p.y, this.p.z], slow: 1 });
      }
    }
    // Shots: each key owns [key.t - 1.0, next.t - 1.0]; gaps > 3.5 s filled with telephoto/drone alternation.
    let cursor = t0;
    let alt = 0;
    let side: 1 | -1 = 1;
    const push = (kind: ShotKind, a: number, b: number, anchor: [number, number, number]) => {
      if (b - a < 0.6) return;
      side = (side === 1 ? -1 : 1) as 1 | -1;
      const fov = kind === 'telephoto' ? 22 : kind === 'fixedGround' ? 46 : kind === 'orbit' ? 45 : kind === 'drone' ? 55 : kind === 'rockEdge' ? 70 : 80;
      this.shots.push({ kind, t0: a, t1: b, anchor, side, fov });
    };
    for (let i = 0; i <= keys.length; i++) {
      const k = keys[i];
      const start = k ? Math.max(cursor, k.t - 1.0) : t1;
      // Filler before this key.
      while (start - cursor > 3.5) {
        this.sample(cursor, this.p, this.v);
        push(alt++ % 2 === 0 ? 'telephoto' : 'drone', cursor, cursor + 2.5, [this.p.x, this.p.y, this.p.z]);
        cursor += 2.5;
      }
      if (start > cursor) {
        this.sample(cursor, this.p, this.v);
        push('telephoto', cursor, start, [this.p.x, this.p.y, this.p.z]);
        cursor = start;
      }
      if (!k) break;
      const next = keys[i + 1];
      const end = Math.min(t1, next ? Math.max(k.t + 0.8, next.t - 1.0) : t1);
      push(k.kind, cursor, end, k.anchor);
      cursor = end;
      if (k.slow < 1) this.slowmos.push({ t: k.t, scale: Math.max(0.25, Math.min(0.5, k.slow)), half: 0.6 });
    }
    return this.shots;
  }

  /** Playback time scale at sim time t (slow-mo 0.25–0.5× around events, 0.3 s ease in/out). */
  timeScale(t: number): number {
    let s = 1;
    for (const m of this.slowmos) {
      const d = Math.abs(t - m.t);
      if (d < m.half + 0.3) {
        const k = d <= m.half ? 1 : 1 - (d - m.half) / 0.3;
        const e = k * k * (3 - 2 * k);
        s = Math.min(s, 1 + (m.scale - 1) * e);
      }
    }
    return s;
  }

  /** Position the camera for sim time t. dt = real frame time (angular-speed limit). Returns the time scale. */
  update(t: number, dt: number): number {
    const shots = this.shots;
    let idx = this.current;
    if (idx < 0 || idx >= shots.length || t < shots[idx].t0 || t > shots[idx].t1) {
      idx = shots.findIndex((s) => t >= s.t0 && t <= s.t1);
      if (idx < 0) idx = shots.length - 1;
    }
    const cut = idx !== this.current;
    this.current = idx;
    const shot = shots[idx];
    const cam = this.camera;
    const d = this.sample(t, this.p, this.v);
    const vh = Math.hypot(this.v.x, this.v.z) || 1;
    const fx = this.v.x / vh;
    const fz = this.v.z / vh;
    const kind: ShotKind = shot ? shot.kind : 'telephoto';
    const side = shot ? shot.side : 1;
    this.target.copy(this.p);
    switch (kind) {
      case 'telephoto': {
        const dist = 60;
        this.tmp.set(this.p.x - fz * dist * side - fx * 10, this.p.y + 6, this.p.z + fx * dist * side - fz * 10);
        break;
      }
      case 'fixedGround':
      case 'rockEdge':
        this.tmp.set(shot.anchor[0], shot.anchor[1], shot.anchor[2]);
        break;
      case 'orbit': {
        const ang = (t - shot.t0) * 0.45 + (side > 0 ? 0 : Math.PI);
        this.tmp.set(shot.anchor[0] + Math.cos(ang) * 14, shot.anchor[1] + 5, shot.anchor[2] + Math.sin(ang) * 14);
        this.target.set(shot.anchor[0], shot.anchor[1], shot.anchor[2]);
        break;
      }
      case 'drone':
        this.tmp.set(this.p.x - fx * 30, this.p.y + 40, this.p.z - fz * 30);
        break;
      case 'helmet':
        this.tmp.set(this.p.x, this.p.y + 0.15, this.p.z);
        this.target.set(this.p.x + this.v.x, this.p.y + this.v.y, this.p.z + this.v.z);
        break;
    }
    const g = this.ground(this.tmp.x, this.tmp.z) + 1.5;
    if (this.tmp.y < g) this.tmp.y = g;
    if (cut) this.smooth.copy(this.tmp);
    else this.smooth.lerp(this.tmp, 1 - Math.exp(-dt * 6));
    cam.position.copy(this.smooth);
    // Angular speed limit (no whip pans; a cut resets the direction).
    this.tmp.copy(this.target).sub(cam.position).normalize();
    if (cut) this.dir.copy(this.tmp);
    else {
      const ang = this.dir.angleTo(this.tmp);
      const maxA = MAX_ANG_SPEED * Math.max(dt, 1e-4);
      if (ang > maxA) this.dir.lerp(this.tmp, maxA / ang).normalize();
      else this.dir.copy(this.tmp);
    }
    cam.up.set(0, 1, 0);
    this.tmp.copy(cam.position).add(this.dir);
    cam.lookAt(this.tmp);
    cam.fov = shot ? shot.fov : 22;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    void d;
    return this.timeScale(t);
  }
}
