// Growable byte writer + bounds-checked, non-throwing byte reader (owner: replay).
// PURE. Little-endian for fixed-width fields.

import { VARINT_MAX, VARINT_MAX_BYTES, varintLength, writeVarint, zigzag, unzigzag } from './varint.ts';

export class ByteWriter {
  buf: Uint8Array;
  len = 0;

  constructor(initialCapacity = 256) {
    this.buf = new Uint8Array(initialCapacity > 16 ? initialCapacity : 16);
  }

  private ensure(extra: number): void {
    const need = this.len + extra;
    if (need <= this.buf.length) return;
    let cap = this.buf.length * 2;
    while (cap < need) cap *= 2;
    const next = new Uint8Array(cap);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  }

  u8(v: number): void {
    this.ensure(1);
    this.buf[this.len++] = v & 0xff;
  }

  u16(v: number): void {
    this.ensure(2);
    this.buf[this.len++] = v & 0xff;
    this.buf[this.len++] = (v >>> 8) & 0xff;
  }

  u32(v: number): void {
    this.ensure(4);
    this.buf[this.len++] = v & 0xff;
    this.buf[this.len++] = (v >>> 8) & 0xff;
    this.buf[this.len++] = (v >>> 16) & 0xff;
    this.buf[this.len++] = (v >>> 24) & 0xff;
  }

  /** Unsigned varint (non-negative safe integer). */
  varint(u: number): void {
    this.ensure(varintLength(u));
    this.len = writeVarint(this.buf, this.len, u);
  }

  /** Signed varint (zigzag). */
  svarint(n: number): void {
    this.varint(zigzag(n));
  }

  bytes(src: Uint8Array): void {
    this.ensure(src.length);
    this.buf.set(src, this.len);
    this.len += src.length;
  }

  /** Copy of the written bytes. */
  finish(): Uint8Array {
    return this.buf.slice(0, this.len);
  }

  reset(): void {
    this.len = 0;
  }
}

/**
 * Reader that never throws: any out-of-bounds or malformed read sets `bad` and returns 0.
 * Callers check `bad` once after a group of reads.
 */
export class ByteReader {
  readonly buf: Uint8Array;
  pos: number;
  readonly end: number;
  bad = false;

  constructor(buf: Uint8Array, start = 0, end = buf.length) {
    this.buf = buf;
    this.pos = start;
    this.end = end;
  }

  get remaining(): number {
    return this.end - this.pos;
  }

  get atEnd(): boolean {
    return this.pos === this.end;
  }

  u8(): number {
    if (this.pos + 1 > this.end) return this.fail();
    return this.buf[this.pos++];
  }

  u16(): number {
    if (this.pos + 2 > this.end) return this.fail();
    const b = this.buf;
    const v = b[this.pos] | (b[this.pos + 1] << 8);
    this.pos += 2;
    return v;
  }

  u32(): number {
    if (this.pos + 4 > this.end) return this.fail();
    const b = this.buf;
    const p = this.pos;
    const v = (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0;
    this.pos += 4;
    return v;
  }

  varint(): number {
    let result = 0;
    let scale = 1;
    for (let i = 0; i < VARINT_MAX_BYTES; i++) {
      if (this.pos >= this.end) return this.fail();
      const byte = this.buf[this.pos++];
      result += (byte & 127) * scale;
      if (byte < 128) {
        if (result > VARINT_MAX) return this.fail();
        return result;
      }
      scale *= 128;
    }
    return this.fail();
  }

  svarint(): number {
    const u = this.varint();
    return this.bad ? 0 : unzigzag(u);
  }

  /** View (not a copy) of the next `n` bytes, or an empty view when out of bounds. */
  bytes(n: number): Uint8Array {
    if (n < 0 || this.pos + n > this.end) {
      this.fail();
      return this.buf.subarray(0, 0);
    }
    const v = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return v;
  }

  private fail(): number {
    this.bad = true;
    this.pos = this.end;
    return 0;
  }
}
