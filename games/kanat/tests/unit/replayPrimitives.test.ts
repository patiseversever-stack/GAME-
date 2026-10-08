// Replay byte primitives: varint/zigzag, base64url, CRC-32, UTF-8, ByteReader (never throws).
import { describe, expect, it } from 'vitest';
import zlib from 'node:zlib';
import { VARINT_MAX, unzigzag, varintLength, writeVarint, zigzag } from '../../src/sim/replay/varint.ts';
import { ByteReader, ByteWriter } from '../../src/sim/replay/bytes.ts';
import { decodeBase64Url, encodeBase64Url } from '../../src/sim/replay/base64url.ts';
import { crc32 } from '../../src/sim/replay/crc32.ts';
import { utf8Decode, utf8Encode } from '../../src/sim/replay/utf8.ts';
import { fmix32, fnv1a32 } from '../../src/sim/replay/fnv1a.ts';

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('varint / zigzag', () => {
  it('zigzag maps 0,-1,1,-2,2 → 0..4 and round-trips large values', () => {
    expect([0, -1, 1, -2, 2].map(zigzag)).toEqual([0, 1, 2, 3, 4]);
    for (const n of [0, 1, -1, 63, -64, 2 ** 31, -(2 ** 31), 2 ** 40 + 3, -(2 ** 51)]) expect(unzigzag(zigzag(n))).toBe(n);
  });

  it('writer/reader round-trip random values of every width', () => {
    const r = rng(1);
    const w = new ByteWriter(4);
    const vals: number[] = [];
    for (let i = 0; i < 20000; i++) {
      const bits = Math.floor(r() * 53);
      const v = Math.floor(r() * 2 ** bits);
      vals.push(v);
      w.varint(v);
      w.svarint(0 - v);
      w.u8(v & 255);
      w.u16(v & 0xffff);
      w.u32(v % 4294967296);
    }
    w.varint(VARINT_MAX);
    const rd = new ByteReader(w.finish());
    for (const v of vals) {
      expect(rd.varint()).toBe(v);
      expect(rd.svarint()).toBe(0 - v);
      expect(rd.u8()).toBe(v & 255);
      expect(rd.u16()).toBe(v & 0xffff);
      expect(rd.u32()).toBe(v % 4294967296);
    }
    expect(rd.varint()).toBe(VARINT_MAX);
    expect(rd.atEnd).toBe(true);
    expect(rd.bad).toBe(false);
  });

  it('varintLength matches writeVarint', () => {
    const buf = new Uint8Array(16);
    for (const v of [0, 127, 128, 16383, 16384, 2 ** 21, 2 ** 35, VARINT_MAX]) expect(writeVarint(buf, 0, v)).toBe(varintLength(v));
  });

  it('reader flags truncation / overlong varints instead of throwing', () => {
    const rd = new ByteReader(new Uint8Array([0x80, 0x80]));
    expect(rd.varint()).toBe(0);
    expect(rd.bad).toBe(true);
    const over = new ByteReader(new Uint8Array(9).fill(0xff));
    over.varint();
    expect(over.bad).toBe(true);
    const short = new ByteReader(new Uint8Array([1, 2, 3]));
    expect(short.u32()).toBe(0);
    expect(short.bad).toBe(true);
    expect(short.bytes(5).length).toBe(0);
  });
});

describe('base64url (no padding)', () => {
  it('matches Node Buffer base64url for random lengths', () => {
    const r = rng(2);
    for (let n = 0; n < 300; n++) {
      const b = new Uint8Array(n);
      for (let i = 0; i < n; i++) b[i] = Math.floor(r() * 256);
      const s = encodeBase64Url(b);
      expect(s).toBe(Buffer.from(b).toString('base64url'));
      expect(s.includes('=')).toBe(false);
      const d = decodeBase64Url(s);
      expect(d?.canonical).toBe(true);
      expect(Array.from(d?.bytes ?? [])).toEqual(Array.from(b));
    }
  });

  it('rejects foreign characters and impossible lengths; flags non-canonical tails', () => {
    expect(decodeBase64Url('AAAAA')).toBeNull();
    expect(decodeBase64Url('AA+A')).toBeNull();
    expect(decodeBase64Url('AA/A')).toBeNull();
    expect(decodeBase64Url('AA=A')).toBeNull();
    expect(decodeBase64Url('AÄ')).toBeNull();
    expect(decodeBase64Url('AB')?.canonical).toBe(false); // 'B' sets an unused low bit
    expect(decodeBase64Url('AA')?.canonical).toBe(true);
    expect(decodeBase64Url('')?.bytes.length).toBe(0);
  });
});

describe('crc32', () => {
  it('matches zlib.crc32 and the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    const r = rng(3);
    for (let n = 0; n < 200; n++) {
      const b = new Uint8Array(n * 7);
      for (let i = 0; i < b.length; i++) b[i] = Math.floor(r() * 256);
      expect(crc32(b)).toBe(zlib.crc32(b));
      if (b.length > 4) expect(crc32(b, 2, b.length - 1)).toBe(zlib.crc32(b.subarray(2, b.length - 1)));
    }
  });
});

describe('utf8', () => {
  it('matches TextEncoder/TextDecoder on valid text', () => {
    for (const s of ['', 'Ayşe', 'ÇĞİÖŞÜçğıöşü', '🪂🦅', 'a' + String.fromCharCode(0x2028) + 'b', 'زهرة', '漢字']) {
      const b = utf8Encode(s);
      expect(Array.from(b)).toEqual(Array.from(new TextEncoder().encode(s)));
      expect(utf8Decode(b)).toBe(s);
    }
  });

  it('rejects malformed sequences', () => {
    const bad = [[0x80], [0xc0, 0x80], [0xc3], [0xe0, 0x80, 0x80], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80], [0xf8], [0xe2, 0x82]];
    for (const b of bad) expect(utf8Decode(Uint8Array.from(b))).toBeNull();
  });
});

describe('fnv1a32 / fmix32', () => {
  it('known FNV-1a vectors', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5);
    expect(fnv1a32('a')).toBe(0xe40c292c);
    expect(fnv1a32('foobar')).toBe(0xbf9cf968);
  });

  it('fmix32 is a bijection-like mixer (no collisions on 100k inputs)', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 100000; i++) seen.add(fmix32(i));
    expect(seen.size).toBe(100000);
    expect(fmix32(0)).toBe(0);
  });
});
