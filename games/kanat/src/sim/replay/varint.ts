// Unsigned LEB128 varints + zigzag mapping (owner: replay).
// PURE: arithmetic only (no 32-bit truncation), so values up to 2^53 - 1 round-trip.

/** Largest unsigned value a replay varint may carry (Number.MAX_SAFE_INTEGER). */
export const VARINT_MAX = 9007199254740991;
/** 8 bytes x 7 bits = 56 bits >= 53 bits, so a longer varint is malformed. */
export const VARINT_MAX_BYTES = 8;

/** Maps a signed safe integer onto an unsigned one: 0,-1,1,-2,2 -> 0,1,2,3,4. Valid for |n| <= 2^52 - 1. */
export function zigzag(n: number): number {
  return n >= 0 ? n * 2 : -n * 2 - 1;
}

/** Inverse of {@link zigzag}. */
export function unzigzag(u: number): number {
  return u % 2 === 0 ? u / 2 : -(u + 1) / 2;
}

/** Number of bytes `writeVarint` uses for `u` (u >= 0). */
export function varintLength(u: number): number {
  let n = 1;
  while (u >= 128) {
    u = Math.floor(u / 128);
    n++;
  }
  return n;
}

/**
 * Writes `u` (non-negative safe integer) at `pos` and returns the new position.
 * The caller guarantees `buf` has `varintLength(u)` bytes of room.
 */
export function writeVarint(buf: Uint8Array, pos: number, u: number): number {
  while (u >= 128) {
    buf[pos++] = (u % 128) | 128;
    u = Math.floor(u / 128);
  }
  buf[pos++] = u;
  return pos;
}
