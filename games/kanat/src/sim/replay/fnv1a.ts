// FNV-1a 32-bit over UTF-8 bytes + murmur3 fmix32 finalizer (owner: replay). PURE.

import { utf8Encode } from './utf8.ts';

export const FNV1A32_OFFSET = 0x811c9dc5;
export const FNV1A32_PRIME = 0x01000193;

/** FNV-1a 32 of the string's UTF-8 bytes (= of the ASCII bytes for ASCII input). Unsigned. */
export function fnv1a32(s: string): number {
  const b = utf8Encode(s);
  let h = FNV1A32_OFFSET;
  for (let i = 0; i < b.length; i++) h = Math.imul(h ^ b[i], FNV1A32_PRIME);
  return h >>> 0;
}

/** murmur3 32-bit finalizer: spreads every input bit over the output (used before `% n` picks). */
export function fmix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}
