// Ghost code: round trip, size budget, corruption, version, garbage (BRIEF §9.G-14, §11.G).
import { describe, expect, it } from 'vitest';
import { deflateSync } from 'fflate';
import type { Command } from '../../src/sim/types.ts';
import {
  GHOST_ERROR_MESSAGES,
  GHOST_PREFIX,
  careerRouteIdFromNumber,
  careerRouteNumber,
  decodeGhostCode,
  encodeGhostCode,
  ghostTag,
  sanitizePlayerName,
  toDisplayCode,
  verifyGhostOutcome,
} from '../../src/sim/replay/ghostCode.ts';
import type { GhostHeader, GhostInput } from '../../src/sim/replay/ghostCode.ts';
import { Recorder, recordCommands } from '../../src/sim/replay/recorder.ts';
import { ReplayCursor, toCommands } from '../../src/sim/replay/playback.ts';
import { decodeBase64Url, encodeBase64Url } from '../../src/sim/replay/base64url.ts';
import { crc32 } from '../../src/sim/replay/crc32.ts';

const SIM_VERSION = 3;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// ------------------------------------------------------------------------------------------------
// Seeded generators (test-side only; the sim never uses Math.log/cos)
// ------------------------------------------------------------------------------------------------

function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const r = (t + d) | 0;
    c = (c + r) | 0;
    return (r >>> 0) / 4294967296;
  };
}

function makeRng(seed: number): () => number {
  const r = sfc32(seed, 0x9e3779b9, 0x243f6a88, 0xb7e15162);
  for (let i = 0; i < 12; i++) r();
  return r;
}

const int = (rng: () => number, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

interface HumanStyle {
  /** Thumb tremor σ in stick units (R = 0.11 × short screen edge ≈ 45 pt). */
  tremor?: number;
  /** Maneuver rate multiplier. */
  busy?: number;
  /** Quantization hysteresis in output steps (0 = plain rounding). */
  hyst?: number;
}

/**
 * Human-like thumb input through the §2.2 pipeline: floating anchor, radial deadzone 0.08 with
 * rescale, expo (roll 0.35 / pitch 0.50), quantized to ±31, one axis command per 2 ticks (30 Hz).
 * The thumb is a critically damped spring (ω 13 rad/s) toward maneuver targets — moves, holds,
 * slow wandering corrections and releases — plus physiological tremor and 1 pt digitizer steps.
 */
function humanFlight(seconds: number, seed: number, style: HumanStyle = {}): Command[] {
  const rng = makeRng(seed);
  const gauss = () => {
    let u = rng();
    if (u < 1e-12) u = 1e-12;
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  };
  const tremor = style.tremor ?? 0.008;
  const busy = style.busy ?? 1;
  const hyst = style.hyst ?? 0;
  const quant = (v: number, prev: number) => {
    const r = Math.round(v);
    if (hyst <= 0 || r === 0 || Math.abs(v - prev) > 0.5 + hyst) return r;
    return prev;
  };
  const ticks = seconds * 60;
  const cmds: Command[] = [];
  let touching = true;
  let px = 0, py = 0, vx = 0, vy = 0, tx = 0, ty = 0, wx = 0, wy = 0, trx = 0, trY = 0, qx = 0, qy = 0;
  let mode: 'hold' | 'move' | 'wander' = 'hold';
  let segLeft = 0.5;
  const dt = 1 / 60;
  for (let tick = 0; tick < ticks; tick++) {
    segLeft -= dt * busy;
    if (segLeft <= 0) {
      if (touching && rng() < 0.12) {
        touching = false;
        segLeft = 0.25 + rng() * 2.5;
      } else {
        if (!touching) {
          touching = true;
          px = py = vx = vy = tx = ty = 0;
        }
        const k = rng();
        if (k < 0.35) {
          mode = 'hold';
          segLeft = 0.4 + rng() * 1.8;
        } else if (k < 0.75) {
          mode = 'move';
          tx = gauss() * 0.5;
          ty = gauss() * 0.35;
          segLeft = 0.25 + rng() * 1.2;
        } else {
          mode = 'wander';
          wx = tx;
          wy = ty;
          segLeft = 0.8 + rng() * 2.5;
        }
      }
    }
    if (touching) {
      if (mode === 'wander') {
        const a = Math.exp(-dt / 0.5);
        wx = wx * a + gauss() * 0.35 * Math.sqrt(1 - a * a);
        wy = wy * a + gauss() * 0.25 * Math.sqrt(1 - a * a);
        tx = wx;
        ty = wy;
      }
      const w = 13;
      vx += (w * w * (tx - px) - 2 * w * vx) * dt;
      px += vx * dt;
      vy += (w * w * (ty - py) - 2 * w * vy) * dt;
      py += vy * dt;
      const b = Math.exp(-dt / 0.08);
      trx = trx * b + gauss() * tremor * Math.sqrt(1 - b * b);
      trY = trY * b + gauss() * tremor * Math.sqrt(1 - b * b);
    }
    if (tick % 2 !== 0) continue;
    let sx = 0, sy = 0;
    if (touching) {
      let fx = Math.round((px + trx) * 45) / 45;
      let fy = Math.round((py + trY) * 45) / 45;
      let m = Math.hypot(fx, fy);
      if (m > 1) {
        fx /= m;
        fy /= m;
        m = 1;
      }
      if (m > 0.08) {
        const s = (m - 0.08) / (1 - 0.08) / m;
        const ex = (v: number, e: number) => Math.sign(v) * (e * Math.abs(v) ** 3 + (1 - e) * Math.abs(v));
        sx = Math.max(-31, Math.min(31, quant(31 * ex(fx * s, 0.35), qx))) | 0;
        sy = Math.max(-31, Math.min(31, quant(31 * ex(fy * s, 0.5), qy))) | 0;
      }
    }
    qx = sx;
    qy = sy;
    cmds.push({ tick, actorId: 0, cmd: 'axis', args: [sx, sy] });
    if (tick === ticks - 400) cmds.push({ tick, actorId: 0, cmd: 'parachute', args: [] });
    if (tick === ticks - 40) cmds.push({ tick, actorId: 0, cmd: 'flare', args: [31] });
  }
  return cmds;
}

/** Worst case: uniform random stick every sample (no correlation at all). */
function noisyFlight(seconds: number, seed: number): Command[] {
  const rng = makeRng(seed);
  const cmds: Command[] = [];
  for (let tick = 0; tick < seconds * 60; tick += 2) {
    cmds.push({ tick, actorId: 0, cmd: 'axis', args: [int(rng, -31, 31), int(rng, -31, 31)] });
  }
  return cmds;
}

const NAMES = ['', 'Ayşe', 'Mehmet', 'Çağrı Ünlü', 'İpek', 'Öykü 🪂', 'Ğ', 'x'.repeat(20), 'Zeynep Su Yılmaz', '  Can  ', '🦅🦅🦅🦅🦅'];

function randomHeader(rng: () => number, tickCount: number): GhostHeader {
  const mode = int(rng, 0, 2) as 0 | 1 | 2;
  return {
    simVersion: SIM_VERSION,
    mode,
    routeRef: mode === 1 ? int(rng, 1, 5000) : mode === 0 ? int(rng, 0, 19) : int(rng, 0, 4),
    seed: Math.floor(rng() * 4294967296),
    assist: rng() < 0.3,
    slowMode: rng() < 0.2,
    guideWind: rng() < 0.2,
    suitId: int(rng, 0, 300),
    tickCount,
    finalTimeMs: int(rng, 0, 400000),
    score: int(rng, 0, 2000000),
    finalStateHash: Math.floor(rng() * 4294967296),
    playerName: sanitizePlayerName(NAMES[int(rng, 0, NAMES.length - 1)]),
  };
}

/**
 * Random command stream of actor 0 (plus distractor commands of actor 1) covering: regular 30 Hz
 * axis, phase shifts, gaps, duplicate axis in one tick, events before/after axis in a tick, all
 * command kinds with their arg ranges, empty streams.
 */
function randomStream(rng: () => number): { all: Command[]; mine: Command[]; tickCount: number } {
  const style = int(rng, 0, 5);
  const len = style === 0 ? int(rng, 0, 3) : int(rng, 1, 9000);
  const all: Command[] = [];
  let x = 0, y = 0;
  let phase = int(rng, 0, 1);
  const smooth = rng() < 0.5;
  for (let tick = 0; tick < len; tick++) {
    const here: Command[] = [];
    if (style === 3 && rng() < 0.01) phase ^= 1; // phase shift after a hitch
    const axisDue = style === 4 ? rng() < 0.3 : style === 5 ? false : (tick & 1) === phase && !(style === 2 && rng() < 0.05);
    if (axisDue) {
      if (smooth) {
        x = Math.max(-31, Math.min(31, x + int(rng, -2, 2)));
        y = Math.max(-31, Math.min(31, y + (rng() < 0.7 ? 0 : int(rng, -3, 3))));
      } else {
        x = int(rng, -31, 31);
        y = int(rng, -31, 31);
      }
      here.push({ tick, actorId: 0, cmd: 'axis', args: [x, y] });
      if (rng() < 0.01) here.push({ tick, actorId: 0, cmd: 'axis', args: [int(rng, -31, 31), int(rng, -31, 31)] });
    }
    const evP = style === 5 ? 0.05 : 0.004;
    if (rng() < evP) {
      const k = int(rng, 0, 4);
      if (k === 0) here.push({ tick, actorId: 0, cmd: 'parachute', args: [] });
      else if (k === 1) here.push({ tick, actorId: 0, cmd: 'flare', args: [int(rng, 0, 31)] });
      else if (k === 2) here.push({ tick, actorId: 0, cmd: 'tight', args: [int(rng, 0, 1)] });
      else if (k === 3) here.push({ tick, actorId: 0, cmd: 'pause', args: rng() < 0.5 ? [] : [int(rng, 0, 1)] });
      else here.push({ tick, actorId: 0, cmd: 'parachute', args: [int(rng, -65535, 65535), int(rng, -5, 5), 0] });
    }
    if (rng() < 0.01) here.push({ tick, actorId: 1, cmd: 'axis', args: [int(rng, -31, 31), 0] });
    // random order inside the tick (events may precede axis)
    for (let i = here.length - 1; i > 0; i--) {
      const j = int(rng, 0, i);
      const t = here[i];
      here[i] = here[j];
      here[j] = t;
    }
    all.push(...here);
  }
  const mine = all.filter((c) => c.actorId === 0);
  const last = mine.length ? mine[mine.length - 1].tick : 0;
  return { all, mine, tickCount: Math.max(len, last + int(rng, 0, 3)) };
}

function typicalHeader(tickCount: number, name = 'Ayşe'): GhostHeader {
  return {
    simVersion: SIM_VERSION,
    mode: 1,
    routeRef: 214,
    seed: 0x9e3779b9,
    assist: false,
    slowMode: false,
    guideWind: false,
    suitId: 7,
    tickCount,
    finalTimeMs: 127400,
    score: 48210,
    finalStateHash: 0xc0ffee42,
    playerName: name,
  };
}

function expectInputEqual(a: GhostInput, b: GhostInput): void {
  expect(a.axisCount).toBe(b.axisCount);
  expect(Array.from(a.axisTick.subarray(0, a.axisCount))).toEqual(Array.from(b.axisTick.subarray(0, b.axisCount)));
  expect(Array.from(a.sx.subarray(0, a.axisCount))).toEqual(Array.from(b.sx.subarray(0, b.axisCount)));
  expect(Array.from(a.sy.subarray(0, a.axisCount))).toEqual(Array.from(b.sy.subarray(0, b.axisCount)));
  expect(a.events).toEqual(b.events);
}

function decodeOk(code: string) {
  const res = decodeGhostCode(code, SIM_VERSION);
  if (!res.ok) throw new Error(`decode failed: ${res.error}`);
  return res.ghost;
}

/** Re-encodes raw bytes as a code with a correct CRC (for parser fuzzing behind the CRC gate). */
function withCrc(body: Uint8Array): string {
  const out = new Uint8Array(body.length + 4);
  out.set(body);
  const c = crc32(body);
  out[body.length] = c & 255;
  out[body.length + 1] = (c >>> 8) & 255;
  out[body.length + 2] = (c >>> 16) & 255;
  out[body.length + 3] = (c >>> 24) & 255;
  return GHOST_PREFIX + encodeBase64Url(out);
}

function codeBytes(code: string): Uint8Array {
  const d = decodeBase64Url(code.slice(GHOST_PREFIX.length));
  if (!d) throw new Error('bad code');
  return d.bytes.slice(0, d.bytes.length - 4);
}

// ------------------------------------------------------------------------------------------------

describe('ghost code round trip', () => {
  it('1000 random command streams: encode → decode identical, toCommands equals the recorded commands', () => {
    const rng = makeRng(20261008);
    let totalCmds = 0;
    for (let iter = 0; iter < 1000; iter++) {
      const { all, mine, tickCount } = randomStream(rng);
      const rec = new Recorder(0);
      rec.pushAll(all);
      expect(rec.ok).toBe(true);
      const input = rec.input();
      const header = randomHeader(rng, tickCount);
      const code = encodeGhostCode(header, input);
      expect(code.startsWith('K1.')).toBe(true);
      const ghost = decodeOk(code);
      expect(ghost.header).toEqual(header);
      expect(ghost.code).toBe(code);
      expectInputEqual(ghost.input, input);
      const back = toCommands(ghost.input, 0);
      expect(back).toEqual(mine);
      // display alias decodes to the same thing
      const disp = toDisplayCode(code);
      expect(disp.startsWith(`KNT1-${ghostTag(header)}-`)).toBe(true);
      const viaDisplay = decodeOk(disp);
      expect(viaDisplay.header).toEqual(header);
      expect(viaDisplay.code).toBe(code);
      // ghost actor id is configurable
      if (iter % 50 === 0) {
        const asGhost = toCommands(ghost.input, 7);
        expect(asGhost).toEqual(mine.map((c) => ({ ...c, actorId: 7 })));
      }
      totalCmds += mine.length;
    }
    expect(totalCmds).toBeGreaterThan(500000);
  });

  it('ReplayCursor feeds the same commands tick by tick, reusing pooled objects', () => {
    const rng = makeRng(42);
    for (let iter = 0; iter < 60; iter++) {
      const { mine, tickCount } = randomStream(rng);
      const input = recordCommands(mine);
      const cur = new ReplayCursor(input, 0);
      const out: Command[] = [];
      const fed: Command[] = [];
      for (let t = 0; t <= tickCount; t++) {
        out.length = 0;
        const n = cur.commandsAt(t, out);
        expect(n).toBe(out.length);
        for (const c of out) fed.push({ tick: c.tick, actorId: c.actorId, cmd: c.cmd, args: c.args.slice() });
      }
      expect(cur.done).toBe(true);
      expect(fed).toEqual(mine);
      cur.reset();
      expect(cur.done).toBe(mine.length === 0);
    }
  });

  it('typical human flight survives the round trip exactly', () => {
    const cmds = humanFlight(120, 1);
    const input = recordCommands(cmds);
    expect(input.axisCount).toBe(3600);
    expect(input.events.length).toBe(2);
    const code = encodeGhostCode(typicalHeader(7200), input);
    const ghost = decodeOk(code);
    expect(toCommands(ghost.input, 0)).toEqual(cmds);
  });
});

describe('ghost code size (§4.G.8 target: 120 s typical flight ≤ 3000 chars)', () => {
  it('measures 60 s / 120 s typical / 120 s worst case', () => {
    const len = (cmds: Command[], seconds: number) => encodeGhostCode(typicalHeader(seconds * 60), recordCommands(cmds)).length;
    const stats = (seconds: number, style: HumanStyle) => {
      const v: number[] = [];
      for (let s = 1; s <= 20; s++) v.push(len(humanFlight(seconds, s, style), seconds));
      return { avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length), max: Math.max(...v), min: Math.min(...v) };
    };
    const typical60 = stats(60, {});
    const typical120 = stats(120, {});
    const smooth120 = stats(120, { tremor: 0.003 });
    const hyst120 = stats(120, { hyst: 0.25 });
    const busy120 = stats(120, { tremor: 0.015, busy: 2 });
    const worst120 = len(noisyFlight(120, 9), 120);
    const worst60 = len(noisyFlight(60, 9), 60);
    const canonical = len(humanFlight(120, 1), 120);
    console.log(
      [
        'GHOST CODE LENGTH (chars, 20 seeds each, header incl. name "Ayşe"):',
        `  (a)  60 s typical human:            avg ${typical60.avg}  min ${typical60.min}  max ${typical60.max}`,
        `  (b) 120 s typical human:            avg ${typical120.avg}  min ${typical120.min}  max ${typical120.max}  (seed 1: ${canonical})`,
        `      120 s calm thumb (low tremor):  avg ${smooth120.avg}  max ${smooth120.max}`,
        `      120 s typical + 0.25 hysteresis: avg ${hyst120.avg}  max ${hyst120.max}`,
        `      120 s aggressive (2× busy, 2× tremor): avg ${busy120.avg}  max ${busy120.max}`,
        `  (c) 120 s worst case uniform noise: ${worst120}   (60 s: ${worst60})`,
      ].join('\n'),
    );
    expect(typical120.max).toBeLessThanOrEqual(3000);
    expect(busy120.max).toBeLessThanOrEqual(3000);
    expect(typical60.max).toBeLessThanOrEqual(1500);
    // worst case is bounded too (≈ 6 bits/sample/axis after deflate)
    expect(worst120).toBeLessThan(10000);
  });

  it('encode/decode of a 120 s flight is fast', () => {
    const input = recordCommands(humanFlight(120, 3));
    const t0 = performance.now();
    let code = '';
    for (let i = 0; i < 20; i++) code = encodeGhostCode(typicalHeader(7200), input);
    const t1 = performance.now();
    for (let i = 0; i < 20; i++) decodeOk(code);
    const t2 = performance.now();
    console.log(`encode ${((t1 - t0) / 20).toFixed(2)} ms, decode ${((t2 - t1) / 20).toFixed(2)} ms per 120 s code`);
    expect((t2 - t1) / 20).toBeLessThan(50);
  });
});

describe('ghost code errors (never throw)', () => {
  const code = encodeGhostCode(typicalHeader(7200), recordCommands(humanFlight(120, 2)));
  const body = code.slice(3);

  it('every single-character substitution → crc error with TR/EN message', () => {
    const rng = makeRng(7);
    for (let i = 0; i < body.length; i++) {
      let c = body[i];
      while (c === body[i]) c = B64[int(rng, 0, 63)];
      const bad = GHOST_PREFIX + body.slice(0, i) + c + body.slice(i + 1);
      const res = decodeGhostCode(bad, SIM_VERSION);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe('crc');
        expect(res.message).toEqual(GHOST_ERROR_MESSAGES.crc);
        expect(res.message.tr.length).toBeGreaterThan(5);
        expect(res.message.en.length).toBeGreaterThan(5);
      }
    }
  });

  it('deleted / inserted / truncated characters are rejected', () => {
    const rng = makeRng(8);
    for (let k = 0; k < 400; k++) {
      const i = int(rng, 0, body.length - 1);
      const del = decodeGhostCode(GHOST_PREFIX + body.slice(0, i) + body.slice(i + 1), SIM_VERSION);
      const ins = decodeGhostCode(GHOST_PREFIX + body.slice(0, i) + B64[int(rng, 0, 63)] + body.slice(i), SIM_VERSION);
      const cut = decodeGhostCode(GHOST_PREFIX + body.slice(0, i), SIM_VERSION);
      for (const r of [del, ins, cut]) {
        expect(r.ok).toBe(false);
        if (!r.ok) expect(['crc', 'format']).toContain(r.error);
      }
    }
  });

  it('different SIM_VERSION → version error with the brief message', () => {
    const res = decodeGhostCode(code, SIM_VERSION + 1);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('version');
      expect(res.codeSimVersion).toBe(SIM_VERSION);
      expect(res.message.tr).toBe('Bu kod oyunun farklı bir sürümüyle kaydedilmiş');
      expect(res.message.en).toBe('This code was recorded with a different version of the game');
    }
    // a future format version is also a version error (checked right after the CRC)
    const bytes = codeBytes(code);
    bytes[0] = 2;
    const fut = decodeGhostCode(withCrc(bytes), SIM_VERSION);
    expect(fut.ok).toBe(false);
    if (!fut.ok) expect(fut.error).toBe('version');
  });

  it('garbage strings and non-strings never throw', () => {
    const rng = makeRng(9);
    const inputs: unknown[] = [
      '', 'K1.', 'KNT1-', 'K1.A', 'K1.AAAA', 'KNT1-G214-', 'KNT1-G214-A', 'hello', '🪂🪂🪂', 'K1.!!!!', 'K1.' + 'A'.repeat(100000),
      'x'.repeat(300000), null, undefined, 42, {}, [], 'K1.' + String.fromCharCode(0), 'KNT1-' + body.slice(0, 50), 'K1.' + body + body,
    ];
    for (let k = 0; k < 3000; k++) {
      const n = int(rng, 0, 400);
      let s = rng() < 0.5 ? 'K1.' : rng() < 0.5 ? 'KNT1-' : rng() < 0.5 ? 'KNT1-G' + int(rng, 1, 999) + '-' : '';
      const alpha = rng() < 0.7;
      for (let i = 0; i < n; i++) s += alpha ? B64[int(rng, 0, 63)] : String.fromCharCode(int(rng, 0, 0xffff));
      inputs.push(s);
    }
    for (const s of inputs) {
      let res: ReturnType<typeof decodeGhostCode> | undefined;
      expect(() => {
        res = decodeGhostCode(s, SIM_VERSION);
      }).not.toThrow();
      expect(res?.ok).toBe(false);
    }
  });

  it('bit flips behind a valid CRC (parser fuzz) never throw; zip bombs are rejected', () => {
    const rng = makeRng(10);
    const base = codeBytes(code);
    let rejected = 0;
    for (let k = 0; k < 3000; k++) {
      const b = base.slice();
      const flips = int(rng, 1, 4);
      for (let f = 0; f < flips; f++) {
        const i = rng() < 0.5 ? int(rng, 0, Math.min(40, b.length - 1)) : int(rng, 0, b.length - 1);
        b[i] ^= 1 << int(rng, 0, 7);
      }
      let res: ReturnType<typeof decodeGhostCode> | undefined;
      expect(() => {
        res = decodeGhostCode(withCrc(b), SIM_VERSION);
      }).not.toThrow();
      if (res && !res.ok) rejected++;
    }
    expect(rejected).toBeGreaterThan(2500);
    // random bodies with a valid CRC and the right versions
    for (let k = 0; k < 1000; k++) {
      const b = new Uint8Array(int(rng, 3, 300));
      for (let i = 0; i < b.length; i++) b[i] = int(rng, 0, 255);
      b[0] = 1;
      b[1] = SIM_VERSION;
      b[2] = 0;
      const res = decodeGhostCode(withCrc(b), SIM_VERSION);
      expect(res.ok).toBe(false);
    }
    // zip bomb: 4 MB of zeros deflates to a few KB
    const header = codeBytes(encodeGhostCode(typicalHeader(10), recordCommands([])));
    const hdrOnly = header.slice(0, header.length - deflateSync(new Uint8Array([0, 0])).length);
    const bomb = deflateSync(new Uint8Array(4 * 1024 * 1024), { level: 9 });
    const joined = new Uint8Array(hdrOnly.length + bomb.length);
    joined.set(hdrOnly);
    joined.set(bomb, hdrOnly.length);
    const t0 = performance.now();
    const res = decodeGhostCode(withCrc(joined), SIM_VERSION);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('invalid');
    expect(performance.now() - t0).toBeLessThan(2000);
  });

  it('tag mismatch in the display form is invalid', () => {
    const disp = toDisplayCode(code);
    expect(disp.startsWith('KNT1-G214-A')).toBe(true);
    const res = decodeGhostCode(disp.replace('KNT1-G214-', 'KNT1-G215-'), SIM_VERSION);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('invalid');
  });

  it('verifyGhostOutcome flags a re-simulation mismatch as "Kod geçersiz"', () => {
    const h = typicalHeader(7200);
    expect(verifyGhostOutcome(h, { tickCount: 7200, finalTimeMs: 127400, score: 48210, finalStateHash: 0xc0ffee42 })).toEqual({ ok: true });
    const bad = verifyGhostOutcome(h, { tickCount: 7200, finalTimeMs: 126000, score: 48210, finalStateHash: 1 });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.mismatch).toEqual(['finalTimeMs', 'finalStateHash']);
      expect(bad.message.tr).toBe('Kod geçersiz');
      expect(bad.message.en).toBe('Invalid code');
    }
  });
});

describe('ghost code input forms', () => {
  const header = typicalHeader(3600, 'Mehmet');
  const code = encodeGhostCode(header, recordCommands(humanFlight(60, 4)));
  const disp = toDisplayCode(code);

  it('accepts K1., KNT1-<tag>-, untagged KNT1- and codes embedded in text / links / line wraps', () => {
    const variants = [
      code,
      disp,
      'KNT1-' + code.slice(3),
      `  ${code}\n`,
      `KANAT · Günün Rotası #214 🪂 2:07.4 · Yakınlık 🟨🟨🟧🟥🟥 · ⭐⭐⭐\nDüello: ${disp}`,
      `https://kanat.example/duel?c=${code}&ref=share`,
      `kanat://duel/${disp}`,
      disp.replace(/(.{60})/g, '$1\n'),
      'K1.foo then the real one ' + code,
    ];
    for (const v of variants) {
      const g = decodeOk(v);
      expect(g.header).toEqual(header);
      expect(g.code).toBe(code);
    }
  });

  it('career / free tags and route numbers', () => {
    expect(careerRouteNumber('w1r1')).toBe(0);
    expect(careerRouteNumber('w3r2')).toBe(9);
    expect(careerRouteNumber('w5r4')).toBe(19);
    expect(careerRouteNumber('daily-3')).toBe(-1);
    for (let n = 0; n < 20; n++) expect(careerRouteNumber(careerRouteIdFromNumber(n) ?? '')).toBe(n);
    expect(ghostTag({ mode: 0, routeRef: 9 })).toBe('W3R2');
    expect(ghostTag({ mode: 1, routeRef: 214 })).toBe('G214');
    expect(ghostTag({ mode: 2, routeRef: 0 })).toBe('S1');
    const career = encodeGhostCode({ ...header, mode: 0, routeRef: 9 }, recordCommands([]));
    expect(toDisplayCode(career).startsWith('KNT1-W3R2-A')).toBe(true);
    expect(decodeOk(toDisplayCode(career)).header.routeRef).toBe(9);
  });

  it('player names are sanitized and limited to 16 UTF-8 bytes', () => {
    expect(sanitizePlayerName('  Ayşe   Nur ')).toBe('Ayşe Nur');
    expect(sanitizePlayerName('a' + String.fromCharCode(0x202e) + 'b' + String.fromCharCode(7) + 'c')).toBe('abc');
    expect(sanitizePlayerName('x'.repeat(30))).toBe('x'.repeat(16));
    expect(sanitizePlayerName('ğğğğğğğğğ')).toBe('ğğğğğğğğ'); // 2 bytes each
    expect(sanitizePlayerName('🦅🦅🦅🦅🦅')).toBe('🦅🦅🦅🦅'); // 4 bytes each
    for (const n of NAMES) expect(sanitizePlayerName(sanitizePlayerName(n))).toBe(sanitizePlayerName(n));
    const g = decodeOk(encodeGhostCode({ ...header, playerName: 'Çağrı' + String.fromCharCode(0x200f) + ' Ünlü 🪂🪂🪂' }, recordCommands([])));
    expect(g.header.playerName).toBe('Çağrı Ünlü'); // 16-byte cut lands on the space, which is trimmed
    const g2 = decodeOk(encodeGhostCode({ ...header, playerName: 'Ali 🪂🪂🪂' }, recordCommands([])));
    expect(g2.header.playerName).toBe('Ali 🪂🪂🪂');
  });
});

describe('Recorder contract', () => {
  it('ignores other actors, records order-preserving events, flags out-of-contract commands', () => {
    const r = new Recorder(0);
    r.push({ tick: 0, actorId: 1, cmd: 'axis', args: [5, 5] });
    r.push({ tick: 0, actorId: 0, cmd: 'axis', args: [1, 2] });
    r.push({ tick: 2, actorId: 0, cmd: 'parachute', args: [] });
    r.push({ tick: 2, actorId: 0, cmd: 'axis', args: [3, 4] }); // after an event in the same tick → event
    expect(r.axisCount).toBe(1);
    expect(r.eventCount).toBe(2);
    expect(toCommands(r.input(), 0)).toEqual([
      { tick: 0, actorId: 0, cmd: 'axis', args: [1, 2] },
      { tick: 2, actorId: 0, cmd: 'parachute', args: [] },
      { tick: 2, actorId: 0, cmd: 'axis', args: [3, 4] },
    ]);
    r.push({ tick: 1, actorId: 0, cmd: 'axis', args: [0, 0] });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('tick 1');
    r.reset();
    expect(r.ok).toBe(true);
    r.push({ tick: 0, actorId: 0, cmd: 'axis', args: [32, 0] });
    expect(r.ok).toBe(false);
    r.reset();
    r.push({ tick: 0, actorId: 0, cmd: 'flare', args: [1.5] });
    expect(r.ok).toBe(false);
    r.reset();
    r.push({ tick: 0, actorId: 0, cmd: 'tight', args: [2] });
    expect(r.ok).toBe(false);
    expect(() => recordCommands([{ tick: 0, actorId: 0, cmd: 'axis', args: [0] }])).toThrow(RangeError);
  });

  it('grows past its initial capacity', () => {
    const r = new Recorder(0, 16);
    for (let t = 0; t < 10000; t += 2) r.push({ tick: t, actorId: 0, cmd: 'axis', args: [(t / 2) % 63 - 31, 0] });
    expect(r.axisCount).toBe(5000);
    expect(r.input().sx[4999]).toBe((9998 / 2) % 63 - 31);
  });

  it('encode rejects caller bugs with RangeError (commands beyond tickCount, bad header)', () => {
    const input = recordCommands([{ tick: 100, actorId: 0, cmd: 'axis', args: [0, 0] }]);
    expect(() => encodeGhostCode(typicalHeader(50), input)).toThrow(RangeError);
    expect(() => encodeGhostCode({ ...typicalHeader(200), simVersion: 70000 }, input)).toThrow(RangeError);
    expect(() => encodeGhostCode({ ...typicalHeader(200), mode: 1, routeRef: 0 }, input)).toThrow(RangeError);
    expect(() => encodeGhostCode({ ...typicalHeader(200), seed: -1 }, input)).toThrow(RangeError);
    expect(encodeGhostCode(typicalHeader(100), input).startsWith('K1.A')).toBe(true);
  });
});
