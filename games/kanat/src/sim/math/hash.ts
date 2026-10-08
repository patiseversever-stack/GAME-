// FNV-1a 32-bit hashing over quantized fields (brief §4.3 tick hash, §4.G.7 daily seed).
// Floats are quantized to integers before hashing so the hash is a statement about gameplay-relevant
// precision (mm, mrad), not about the last ulp.

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export class Fnv1a {
  h = FNV_OFFSET;

  reset(): this {
    this.h = FNV_OFFSET;
    return this;
  }

  /** Mix a 32-bit integer (4 bytes, little-endian order). */
  u32(v: number): this {
    let h = this.h;
    const x = v | 0;
    h = Math.imul(h ^ (x & 0xff), FNV_PRIME);
    h = Math.imul(h ^ ((x >>> 8) & 0xff), FNV_PRIME);
    h = Math.imul(h ^ ((x >>> 16) & 0xff), FNV_PRIME);
    h = Math.imul(h ^ ((x >>> 24) & 0xff), FNV_PRIME);
    this.h = h;
    return this;
  }

  /** Mix a float quantized as round(v * scale) (NaN → a fixed sentinel). Values beyond ±2^31 wrap (ToInt32). */
  q(v: number, scale: number): this {
    if (v !== v) return this.u32(0x7fc00000);
    const r = Math.round(v * scale);
    // Split into two 32-bit words so values beyond 2^31 still contribute deterministically.
    const hi = Math.floor(r / 4294967296);
    return this.u32(r - hi * 4294967296).u32(hi);
  }

  str(s: string): this {
    let h = this.h;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c < 0x80) {
        h = Math.imul(h ^ c, FNV_PRIME);
      } else {
        // UTF-16 code unit as two bytes (stable, not UTF-8 — only used for ASCII seeds in practice).
        h = Math.imul(h ^ (c & 0xff), FNV_PRIME);
        h = Math.imul(h ^ (c >>> 8), FNV_PRIME);
      }
    }
    this.h = h;
    return this;
  }

  value(): number {
    return this.h >>> 0;
  }
}

/** fnv1a32 of an ASCII string, e.g. fnv1a32("KANAT-GR-20261008") for the daily route seed. */
export function fnv1a32(s: string): number {
  return new Fnv1a().str(s).value();
}
