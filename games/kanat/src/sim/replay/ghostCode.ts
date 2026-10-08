// Ghost / duel code format (owner: replay). BRIEF §4.G.8 (technical format), §2.5 Mod 3, §2.8.
// PURE: no DOM, no Date, no Math.random. Decoding never throws: every failure is a typed result.
//
//   code    = "K1." + base64url(nopad)( header | payload | crc32 )
//   header  = u8 formatVersion(=1) | u16 simVersion | u8 mode | varint routeRef | u32 seed | u8 flags
//             | varint suitId | varint tickCount | varint finalTimeMs | varint score | u32 finalStateHash
//             | [flags bit3] u8 nameLen (1..16) + UTF-8 name
//   payload = deflateRaw( axisTicks | sxStream | syStream | events )
//   crc32   = CRC-32/IEEE of header|payload, u32
//   Fixed-width integers are little-endian. See docs/decisions/replay.md for the full byte layout.

import { deflateSync, inflateSync } from 'fflate';
import type { Command } from '../types.ts';
import { decodeBase64Url, encodeBase64Url, isBase64UrlChar } from './base64url.ts';
import { ByteReader, ByteWriter } from './bytes.ts';
import { crc32 } from './crc32.ts';
import { unzigzag } from './varint.ts';
import { utf8Decode, utf8Encode } from './utf8.ts';

// ---------------------------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------------------------

export const GHOST_FORMAT_VERSION = 1;
/** Canonical technical prefix (§4.G.8). */
export const GHOST_PREFIX = 'K1.';
/** Readable display prefix (§2.5/§2.8): `KNT1-<tag>-<body>`, accepted on input as an alias. */
export const GHOST_DISPLAY_PREFIX = 'KNT1-';

/** Sim tick rate and the rate at which the input layer emits axis commands (one per 2 ticks). */
export const SIM_TICK_HZ = 60;
export const AXIS_SAMPLE_HZ = 30;
export const AXIS_TICK_STEP = SIM_TICK_HZ / AXIS_SAMPLE_HZ;

/** Command argument ranges (src/sim/types.ts Command contract). */
export const AXIS_MAX = 31;
export const FLARE_MAX = 31;
/** parachute / pause carry no defined args today; up to 3 small ints are tolerated for forward use. */
const GENERIC_MAX_ARGS = 3;
const GENERIC_ARG_LIMIT = 65535;

/** 2^18 ticks ≈ 72.8 min at 60 Hz — far above any flight; bounds decode work and memory. */
export const GHOST_MAX_TICKS = 262144;
export const GHOST_MAX_AXIS = 262144;
export const GHOST_MAX_EVENTS = 65536;
/** Longest accepted code body (base64url chars). WhatsApp's message limit is 65536 chars. */
export const GHOST_MAX_CODE_CHARS = 65536;
/** Longest pasted text scanned for a code. */
export const GHOST_MAX_INPUT_CHARS = 262144;
/** Inflate output cap (zip-bomb guard). */
export const GHOST_MAX_PAYLOAD_BYTES = 2097152;
export const PLAYER_NAME_MAX_BYTES = 16;
/** Upper bound for the free varint header fields (routeRef, suitId, finalTimeMs, score). 2^40. */
const HEADER_VARINT_LIMIT = 1099511627776;

export const GHOST_MODE = { career: 0, daily: 1, free: 2 } as const;
export type GhostMode = 0 | 1 | 2;

const FLAG_ASSIST = 1;
const FLAG_SLOW = 2;
const FLAG_GUIDE_WIND = 4;
const FLAG_NAME = 8;
const FLAG_KNOWN = 15;

export type CommandKind = Command['cmd'];
const KIND_NAMES: readonly CommandKind[] = ['axis', 'parachute', 'flare', 'tight', 'pause'];
const KIND_CODE: Record<CommandKind, number> = { axis: 0, parachute: 1, flare: 2, tight: 3, pause: 4 };

// ---------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------

export interface GhostHeader {
  /** u16. The receiver rejects codes whose simVersion differs from its own SIM_VERSION. */
  simVersion: number;
  /** 0 Kariyer, 1 Günün Rotası, 2 Serbest. */
  mode: GhostMode;
  /** Kariyer: careerRouteNumber('w1r3') (0..19) · Günün Rotası: dailyIndex (>= 1) · Serbest: world index 0..4. */
  routeRef: number;
  /** u32 sim seed (Günün Rotası: dailySeed(dateKey); Kariyer: the route's fixed seed). */
  seed: number;
  /** Flight Assist ('full'/'low') or auto parachute used → 🛟 on cards. flags bit0. */
  assist: boolean;
  /** Yavaş Mod (0.8× sim speed) → 🐢. flags bit1. */
  slowMode: boolean;
  /** Rehber Rüzgâr (guide wind) active. flags bit2. */
  guideWind: boolean;
  suitId: number;
  /** Number of sim ticks the flight ran. */
  tickCount: number;
  /** Result time shown to the player, penalties included (Günün Rotası metric). */
  finalTimeMs: number;
  /** Final score (Kariyer metric). */
  score: number;
  /** u32 FlightSim.hash() after the last tick; the receiver's re-simulation must match it. */
  finalStateHash: number;
  /** '' = anonymous. Sanitized + truncated to 16 UTF-8 bytes ("Ayşe'nin hayaleti"). */
  playerName: string;
}

/** A recorded command that is not part of the axis stream (parachute, flare, tight, pause, off-stream axis). */
export interface GhostEvent {
  tick: number;
  cmd: CommandKind;
  args: number[];
}

/**
 * Compact recorded input of one actor. Axis commands live in three parallel typed arrays
 * (normally one sample per 2 ticks = 30 Hz); everything else is an event.
 * Replay order inside one tick: axis-stream commands first (stream order), then events (list order).
 */
export interface GhostInput {
  axisCount: number;
  /** Absolute tick of each axis sample, non-decreasing. Only [0, axisCount) is meaningful. */
  axisTick: Int32Array;
  sx: Int8Array;
  sy: Int8Array;
  /** Tick-ordered (non-decreasing). */
  events: GhostEvent[];
}

export interface GhostReplay {
  header: GhostHeader;
  input: GhostInput;
  /** Canonical `K1.` form of the decoded code. */
  code: string;
}

export type GhostErrorCode = 'format' | 'crc' | 'version' | 'invalid';

export interface LocalizedText {
  tr: string;
  en: string;
}

export type GhostDecodeResult =
  | { ok: true; ghost: GhostReplay }
  | { ok: false; error: GhostErrorCode; message: LocalizedText; codeSimVersion?: number };

export const GHOST_ERROR_MESSAGES: Readonly<Record<GhostErrorCode, LocalizedText>> = {
  format: { tr: 'Bu bir KANAT düello kodu değil', en: "This isn't a KANAT duel code" },
  crc: {
    tr: 'Kod eksik ya da bozuk kopyalanmış; kodun tamamını yeniden kopyala',
    en: 'The code is incomplete or damaged; copy the whole code again',
  },
  version: {
    tr: 'Bu kod oyunun farklı bir sürümüyle kaydedilmiş',
    en: 'This code was recorded with a different version of the game',
  },
  invalid: { tr: 'Kod geçersiz', en: 'Invalid code' },
};

export function ghostErrorMessage(error: GhostErrorCode, lang: 'tr' | 'en'): string {
  return GHOST_ERROR_MESSAGES[error][lang];
}

// ---------------------------------------------------------------------------------------------
// Validation helpers (shared by Recorder, encoder and decoder so they accept exactly the same set)
// ---------------------------------------------------------------------------------------------

function isIntIn(v: unknown, lo: number, hi: number): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
}

/** Argument check for one command kind. */
export function argsValid(cmd: CommandKind, a: readonly number[]): boolean {
  switch (cmd) {
    case 'axis':
      return a.length === 2 && isIntIn(a[0], -AXIS_MAX, AXIS_MAX) && isIntIn(a[1], -AXIS_MAX, AXIS_MAX);
    case 'flare':
      return a.length === 1 && isIntIn(a[0], 0, FLARE_MAX);
    case 'tight':
      return a.length === 1 && isIntIn(a[0], 0, 1);
    case 'parachute':
    case 'pause':
      if (a.length > GENERIC_MAX_ARGS) return false;
      for (let i = 0; i < a.length; i++) if (!isIntIn(a[i], -GENERIC_ARG_LIMIT, GENERIC_ARG_LIMIT)) return false;
      return true;
    default:
      return false;
  }
}

/** Why `c` cannot go into a ghost code, or null when it can. */
export function commandProblem(c: Command): string | null {
  if (!isIntIn(c.tick, 0, GHOST_MAX_TICKS)) return 'tick out of range';
  if (typeof c.cmd !== 'string' || !Object.hasOwn(KIND_CODE, c.cmd)) return 'unknown cmd';
  if (!Array.isArray(c.args) || !argsValid(c.cmd, c.args)) return `bad ${c.cmd} args`;
  return null;
}

/** Code-point ranges removed from player names: C0/C1 controls, soft hyphen, bidi marks/overrides/isolates, invisible operators, BOM. */
const NAME_STRIP_RANGES: readonly (readonly [number, number])[] = [
  [0x0000, 0x001f],
  [0x007f, 0x009f],
  [0x00ad, 0x00ad],
  [0x061c, 0x061c],
  [0x180e, 0x180e],
  [0x200b, 0x200b],
  [0x200e, 0x200f],
  [0x2028, 0x202e],
  [0x2060, 0x2064],
  [0x2066, 0x206f],
  [0xfeff, 0xfeff],
  [0xfff9, 0xfffb],
];

function isStrippedCodePoint(cp: number): boolean {
  if (cp >= 0xd800 && cp <= 0xdfff) return true; // lone surrogate
  for (const [lo, hi] of NAME_STRIP_RANGES) if (cp >= lo && cp <= hi) return true;
  return false;
}

/** Joiners / variation selectors that must not dangle at the end after truncation. */
function isTrailingJoiner(cp: number): boolean {
  return cp === 0x200c || cp === 0x200d || cp === 0xfe0e || cp === 0xfe0f;
}

/**
 * Player name as stored in codes: control/bidi/invisible characters removed, whitespace collapsed,
 * trimmed, cut to 16 UTF-8 bytes on a code-point boundary. Idempotent.
 */
export function sanitizePlayerName(name: string): string {
  let cleaned = '';
  for (const ch of String(name)) {
    if (!isStrippedCodePoint(ch.codePointAt(0) ?? 0)) cleaned += ch;
  }
  const collapsed = cleaned.replace(/\s+/g, ' ').trim();
  const kept: string[] = [];
  let bytes = 0;
  for (const ch of collapsed) {
    const cp = ch.codePointAt(0) ?? 0;
    const n = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (bytes + n > PLAYER_NAME_MAX_BYTES) break;
    bytes += n;
    kept.push(ch);
  }
  while (kept.length > 0) {
    const last = kept[kept.length - 1];
    if (last !== ' ' && !isTrailingJoiner(last.codePointAt(0) ?? 0)) break;
    kept.pop();
  }
  return kept.join('');
}

/** 'w1r1'…'w5r4' → 0…19; -1 for anything else. */
export function careerRouteNumber(routeId: string): number {
  const m = /^w([1-5])r([1-4])$/.exec(routeId);
  return m ? (Number(m[1]) - 1) * 4 + (Number(m[2]) - 1) : -1;
}

/** 0…19 → 'w1r1'…'w5r4'; null outside the 20 career routes. */
export function careerRouteIdFromNumber(n: number): string | null {
  if (!isIntIn(n, 0, 19)) return null;
  return `w${Math.floor(n / 4) + 1}r${(n % 4) + 1}`;
}

/** Readable tag used in `KNT1-<tag>-…`: G214 (Günün Rotası #214), W1R3 (Kariyer), S1 (Serbest, world 1). */
export function ghostTag(h: Pick<GhostHeader, 'mode' | 'routeRef'>): string {
  if (h.mode === 1) return `G${h.routeRef}`;
  if (h.mode === 0) {
    const id = careerRouteIdFromNumber(h.routeRef);
    return id !== null ? id.toUpperCase() : `R${h.routeRef}`;
  }
  return `S${h.routeRef + 1}`;
}

function assertHeader(h: GhostHeader): void {
  const bad = (what: string): never => {
    throw new RangeError(`ghost header: invalid ${what}`);
  };
  if (!isIntIn(h.simVersion, 0, 0xffff)) bad('simVersion');
  if (h.mode !== 0 && h.mode !== 1 && h.mode !== 2) bad('mode');
  if (!isIntIn(h.routeRef, h.mode === 1 ? 1 : 0, HEADER_VARINT_LIMIT)) bad('routeRef');
  if (!isIntIn(h.seed, 0, 0xffffffff)) bad('seed');
  if (!isIntIn(h.suitId, 0, HEADER_VARINT_LIMIT)) bad('suitId');
  if (!isIntIn(h.tickCount, 0, GHOST_MAX_TICKS)) bad('tickCount');
  if (!isIntIn(h.finalTimeMs, 0, HEADER_VARINT_LIMIT)) bad('finalTimeMs');
  if (!isIntIn(h.score, 0, HEADER_VARINT_LIMIT)) bad('score');
  if (!isIntIn(h.finalStateHash, 0, 0xffffffff)) bad('finalStateHash');
  if (typeof h.playerName !== 'string') bad('playerName');
}

function assertInput(inp: GhostInput, tickCount: number): void {
  const bad = (what: string): never => {
    throw new RangeError(`ghost input: ${what}`);
  };
  const n = inp.axisCount;
  if (!isIntIn(n, 0, GHOST_MAX_AXIS)) bad('axisCount');
  if (inp.axisTick.length < n || inp.sx.length < n || inp.sy.length < n) bad('axis arrays shorter than axisCount');
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = inp.axisTick[i];
    if (t < prev || t > tickCount) bad(`axis tick ${t} out of order or beyond tickCount`);
    prev = t;
    if (inp.sx[i] < -AXIS_MAX || inp.sx[i] > AXIS_MAX || inp.sy[i] < -AXIS_MAX || inp.sy[i] > AXIS_MAX) bad('axis value');
  }
  if (inp.events.length > GHOST_MAX_EVENTS) bad('too many events');
  prev = 0;
  for (const e of inp.events) {
    if (!isIntIn(e.tick, prev, tickCount)) bad(`event tick ${e.tick} out of order or beyond tickCount`);
    prev = e.tick;
    if (!Object.hasOwn(KIND_CODE, e.cmd) || !Array.isArray(e.args) || !argsValid(e.cmd, e.args)) bad(`event ${e.cmd} args`);
  }
}

// ---------------------------------------------------------------------------------------------
// Encode
// ---------------------------------------------------------------------------------------------

function writeValueStream(w: ByteWriter, v: Int8Array, n: number): void {
  // Delta from previous sample (starts at 0) → zigzag varint; a run of r zero deltas → (0, r-1).
  let prev = 0;
  let i = 0;
  while (i < n) {
    const d = v[i] - prev;
    if (d !== 0) {
      w.svarint(d);
      prev = v[i];
      i++;
    } else {
      let run = 1;
      while (i + run < n && v[i + run] === prev) run++;
      w.u8(0);
      w.varint(run - 1);
      i += run;
    }
  }
}

/** Raw (pre-deflate) payload bytes. Exposed for size diagnostics and tests. */
export function encodePayloadRaw(inp: GhostInput): Uint8Array {
  const n = inp.axisCount;
  const w = new ByteWriter(n * 2 + 64);
  w.varint(n);
  if (n > 0) {
    const t = inp.axisTick;
    w.varint(t[0]);
    // Tick deltas as (dt, run-1) pairs: a regular 30 Hz stream is a single pair (2, n-2).
    let i = 1;
    while (i < n) {
      const dt = t[i] - t[i - 1];
      let run = 1;
      while (i + run < n && t[i + run] - t[i + run - 1] === dt) run++;
      w.varint(dt);
      w.varint(run - 1);
      i += run;
    }
    writeValueStream(w, inp.sx, n);
    writeValueStream(w, inp.sy, n);
  }
  w.varint(inp.events.length);
  let prev = 0;
  for (const e of inp.events) {
    w.varint(e.tick - prev);
    prev = e.tick;
    w.u8(KIND_CODE[e.cmd] | (e.args.length << 4));
    for (let k = 0; k < e.args.length; k++) w.svarint(e.args[k]);
  }
  return w.finish();
}

/**
 * Encodes a finished flight into a canonical `K1.` code.
 * Throws RangeError for out-of-contract input (a caller bug, never user data).
 */
export function encodeGhostCode(header: GhostHeader, input: GhostInput): string {
  assertHeader(header);
  assertInput(input, header.tickCount);
  const name = sanitizePlayerName(header.playerName);
  const nameBytes = utf8Encode(name);
  let flags = 0;
  if (header.assist) flags |= FLAG_ASSIST;
  if (header.slowMode) flags |= FLAG_SLOW;
  if (header.guideWind) flags |= FLAG_GUIDE_WIND;
  if (nameBytes.length > 0) flags |= FLAG_NAME;

  const raw = encodePayloadRaw(input);
  const packed = deflateSync(raw, { level: 9, mem: 8 });

  const w = new ByteWriter(64 + packed.length);
  w.u8(GHOST_FORMAT_VERSION);
  w.u16(header.simVersion);
  w.u8(header.mode);
  w.varint(header.routeRef);
  w.u32(header.seed);
  w.u8(flags);
  w.varint(header.suitId);
  w.varint(header.tickCount);
  w.varint(header.finalTimeMs);
  w.varint(header.score);
  w.u32(header.finalStateHash);
  if (nameBytes.length > 0) {
    w.u8(nameBytes.length);
    w.bytes(nameBytes);
  }
  w.bytes(packed);
  w.u32(crc32(w.buf, 0, w.len));
  return GHOST_PREFIX + encodeBase64Url(w.finish());
}

// ---------------------------------------------------------------------------------------------
// Decode
// ---------------------------------------------------------------------------------------------

const STAGE: Record<GhostErrorCode, number> = { format: 0, crc: 1, version: 2, invalid: 3 };

function fail(error: GhostErrorCode, codeSimVersion?: number): GhostDecodeResult {
  return codeSimVersion === undefined
    ? { ok: false, error, message: GHOST_ERROR_MESSAGES[error] }
    : { ok: false, error, message: GHOST_ERROR_MESSAGES[error], codeSimVersion };
}

function readValueStream(r: ByteReader, out: Int8Array, n: number): boolean {
  let prev = 0;
  let i = 0;
  while (i < n) {
    const tok = r.varint();
    if (r.bad) return false;
    if (tok !== 0) {
      prev += unzigzag(tok);
      if (prev < -AXIS_MAX || prev > AXIS_MAX) return false;
      out[i++] = prev;
    } else {
      const run = r.varint() + 1;
      if (r.bad || i + run > n) return false;
      out.fill(prev, i, i + run);
      i += run;
    }
  }
  return true;
}

function parsePayload(raw: Uint8Array, tickCount: number): GhostInput | null {
  const r = new ByteReader(raw);
  const n = r.varint();
  if (r.bad || n > GHOST_MAX_AXIS) return null;
  const axisTick = new Int32Array(n);
  const sx = new Int8Array(n);
  const sy = new Int8Array(n);
  if (n > 0) {
    let t = r.varint();
    if (r.bad || t > tickCount) return null;
    axisTick[0] = t;
    let i = 1;
    while (i < n) {
      const dt = r.varint();
      const run = r.varint() + 1;
      if (r.bad || i + run > n || t + dt * run > tickCount) return null;
      for (let k = 0; k < run; k++) {
        t += dt;
        axisTick[i++] = t;
      }
    }
    if (!readValueStream(r, sx, n) || !readValueStream(r, sy, n)) return null;
  }
  const evCount = r.varint();
  if (r.bad || evCount > GHOST_MAX_EVENTS) return null;
  const events: GhostEvent[] = [];
  let tick = 0;
  for (let e = 0; e < evCount; e++) {
    tick += r.varint();
    const type = r.u8();
    if (r.bad || tick > tickCount) return null;
    const kind = type & 15;
    const argc = type >> 4;
    if (kind >= KIND_NAMES.length) return null;
    const cmd = KIND_NAMES[kind];
    const args: number[] = [];
    for (let k = 0; k < argc; k++) args.push(r.svarint());
    if (r.bad || !argsValid(cmd, args)) return null;
    events.push({ tick, cmd, args });
  }
  if (!r.atEnd) return null;
  return { axisCount: n, axisTick, sx, sy, events };
}

function decodeBody(body: string, tag: string | null, expectedSimVersion: number): GhostDecodeResult {
  if (body.length === 0 || body.length > GHOST_MAX_CODE_CHARS) return fail('format');
  const dec = decodeBase64Url(body);
  if (dec === null) return fail('format');
  const bytes = dec.bytes;
  const n = bytes.length;
  // A too-short or non-canonical body is a truncated / damaged copy of a real code.
  if (n < 8 || !dec.canonical) return fail('crc');
  const stored = (bytes[n - 4] | (bytes[n - 3] << 8) | (bytes[n - 2] << 16) | (bytes[n - 1] << 24)) >>> 0;
  if (crc32(bytes, 0, n - 4) !== stored) return fail('crc');
  if (bytes[0] !== GHOST_FORMAT_VERSION) return fail('version');
  const codeSimVersion = bytes[1] | (bytes[2] << 8);
  if (codeSimVersion !== expectedSimVersion) return fail('version', codeSimVersion);

  const r = new ByteReader(bytes, 3, n - 4);
  const mode = r.u8();
  const routeRef = r.varint();
  const seed = r.u32();
  const flags = r.u8();
  const suitId = r.varint();
  const tickCount = r.varint();
  const finalTimeMs = r.varint();
  const score = r.varint();
  const finalStateHash = r.u32();
  if (r.bad || mode > 2 || (flags & ~FLAG_KNOWN) !== 0) return fail('invalid');
  if (mode === 1 && routeRef < 1) return fail('invalid');
  if (
    routeRef > HEADER_VARINT_LIMIT ||
    suitId > HEADER_VARINT_LIMIT ||
    tickCount > GHOST_MAX_TICKS ||
    finalTimeMs > HEADER_VARINT_LIMIT ||
    score > HEADER_VARINT_LIMIT
  ) {
    return fail('invalid');
  }
  let playerName = '';
  if (flags & FLAG_NAME) {
    const len = r.u8();
    if (r.bad || len < 1 || len > PLAYER_NAME_MAX_BYTES) return fail('invalid');
    const nameBytes = r.bytes(len);
    const s = r.bad ? null : utf8Decode(nameBytes);
    if (s === null) return fail('invalid');
    playerName = sanitizePlayerName(s);
  }
  const packed = bytes.subarray(r.pos, n - 4);
  let raw: Uint8Array;
  try {
    raw = inflateSync(packed, { out: new Uint8Array(GHOST_MAX_PAYLOAD_BYTES + 1) });
  } catch {
    return fail('invalid');
  }
  if (raw.length > GHOST_MAX_PAYLOAD_BYTES) return fail('invalid');
  const input = parsePayload(raw, tickCount);
  if (input === null) return fail('invalid');
  const header: GhostHeader = {
    simVersion: codeSimVersion,
    mode: mode as GhostMode,
    routeRef,
    seed,
    assist: (flags & FLAG_ASSIST) !== 0,
    slowMode: (flags & FLAG_SLOW) !== 0,
    guideWind: (flags & FLAG_GUIDE_WIND) !== 0,
    suitId,
    tickCount,
    finalTimeMs,
    score,
    finalStateHash,
    playerName,
  };
  if (tag !== null && tag !== ghostTag(header)) return fail('invalid');
  return { ok: true, ghost: { header, input, code: GHOST_PREFIX + body } };
}

interface Candidate {
  body: string;
  tag: string | null;
}

const TAG_RE = /^[B-Z][A-Z0-9]{0,11}$/;
const MAX_CANDIDATES = 8;

function collectCandidates(text: string, out: Candidate[]): void {
  let from = 0;
  while (out.length < MAX_CANDIDATES) {
    const a = text.indexOf(GHOST_PREFIX, from);
    const b = text.indexOf(GHOST_DISPLAY_PREFIX, from);
    if (a < 0 && b < 0) return;
    const display = b >= 0 && (a < 0 || b < a);
    const start = display ? b + GHOST_DISPLAY_PREFIX.length : a + GHOST_PREFIX.length;
    let end = start;
    while (end < text.length && isBase64UrlChar(text.charCodeAt(end))) end++;
    let body = text.slice(start, end);
    let tag: string | null = null;
    if (display && body.length > 0 && body[0] !== 'A') {
      // Tagged display form KNT1-G214-<body>; bodies of format version 1..3 always start with 'A'.
      const dash = body.indexOf('-');
      if (dash > 0 && TAG_RE.test(body.slice(0, dash))) {
        tag = body.slice(0, dash);
        body = body.slice(dash + 1);
      }
    }
    out.push({ body, tag });
    from = end > start ? end : start;
  }
}

/**
 * Decodes a ghost/duel code. Accepts `K1.<body>`, `KNT1-<body>` and `KNT1-<tag>-<body>`, also when
 * embedded in a longer pasted text (share card, deep link) or broken by line wraps.
 * Never throws. `expectedSimVersion` = the running game's SIM_VERSION.
 */
export function decodeGhostCode(text: unknown, expectedSimVersion: number): GhostDecodeResult {
  try {
    if (typeof text !== 'string' || text.length === 0 || text.length > GHOST_MAX_INPUT_CHARS) return fail('format');
    const cands: Candidate[] = [];
    collectCandidates(text, cands);
    if (/\s/.test(text)) collectCandidates(text.replace(/\s+/g, ''), cands);
    let best: GhostDecodeResult | null = null;
    for (const c of cands) {
      const res = decodeBody(c.body, c.tag, expectedSimVersion);
      if (res.ok) return res;
      if (best === null || (!best.ok && STAGE[res.error] > STAGE[best.error])) best = res;
    }
    return best ?? fail('format');
  } catch {
    return fail('invalid');
  }
}

/**
 * Readable share form `KNT1-<tag>-<body>` (e.g. `KNT1-G214-AQ…`). Returns the input unchanged when
 * it is not a well-formed canonical code.
 */
export function toDisplayCode(code: string): string {
  if (!code.startsWith(GHOST_PREFIX)) return code;
  const body = code.slice(GHOST_PREFIX.length);
  const dec = decodeBase64Url(body);
  if (dec === null) return code;
  const r = new ByteReader(dec.bytes, 3, Math.max(3, dec.bytes.length - 4));
  const mode = r.u8();
  const routeRef = r.varint();
  if (r.bad || mode > 2) return code;
  return `${GHOST_DISPLAY_PREFIX}${ghostTag({ mode: mode as GhostMode, routeRef })}-${body}`;
}

// ---------------------------------------------------------------------------------------------
// Verification after re-simulation (anti-cheat, §2.5 Mod 3)
// ---------------------------------------------------------------------------------------------

export interface GhostOutcome {
  tickCount: number;
  finalTimeMs: number;
  score: number;
  finalStateHash: number;
}

export type GhostVerifyResult =
  | { ok: true }
  | { ok: false; error: 'invalid'; message: LocalizedText; mismatch: (keyof GhostOutcome)[] };

/**
 * Compares what the receiver's re-simulation produced with what the code claims.
 * Any difference (reported time ≠ replayed time, …) → "Kod geçersiz".
 */
export function verifyGhostOutcome(header: GhostHeader, observed: GhostOutcome): GhostVerifyResult {
  const mismatch: (keyof GhostOutcome)[] = [];
  if (header.tickCount !== observed.tickCount) mismatch.push('tickCount');
  if (header.finalTimeMs !== observed.finalTimeMs) mismatch.push('finalTimeMs');
  if (header.score !== observed.score) mismatch.push('score');
  if (header.finalStateHash >>> 0 !== observed.finalStateHash >>> 0) mismatch.push('finalStateHash');
  return mismatch.length === 0 ? { ok: true } : { ok: false, error: 'invalid', message: GHOST_ERROR_MESSAGES.invalid, mismatch };
}
