// base64url (RFC 4648 §5) without padding (owner: replay). PURE.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const LOOKUP = /* @__PURE__ */ buildLookup();

function buildLookup(): Int8Array {
  const t = new Int8Array(128).fill(-1);
  for (let i = 0; i < ALPHABET.length; i++) t[ALPHABET.charCodeAt(i)] = i;
  return t;
}

/** True for the 64 base64url characters. */
export function isBase64UrlChar(code: number): boolean {
  return code < 128 && LOOKUP[code] >= 0;
}

export function encodeBase64Url(bytes: Uint8Array): string {
  const out: string[] = [];
  const n = bytes.length;
  let i = 0;
  for (; i + 3 <= n; i += 3) {
    const v = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out.push(ALPHABET[(v >>> 18) & 63], ALPHABET[(v >>> 12) & 63], ALPHABET[(v >>> 6) & 63], ALPHABET[v & 63]);
  }
  const rest = n - i;
  if (rest === 1) {
    const v = bytes[i] << 16;
    out.push(ALPHABET[(v >>> 18) & 63], ALPHABET[(v >>> 12) & 63]);
  } else if (rest === 2) {
    const v = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out.push(ALPHABET[(v >>> 18) & 63], ALPHABET[(v >>> 12) & 63], ALPHABET[(v >>> 6) & 63]);
  }
  return out.join('');
}

export interface Base64Decoded {
  bytes: Uint8Array;
  /** False when the unused low bits of the last character are non-zero (a damaged/hand-edited code). */
  canonical: boolean;
}

/** Decodes unpadded base64url. Returns null for a foreign character or an impossible length (len % 4 === 1). */
export function decodeBase64Url(s: string): Base64Decoded | null {
  const len = s.length;
  if (len % 4 === 1) return null;
  const outLen = Math.floor((len * 3) / 4);
  const bytes = new Uint8Array(outLen);
  let o = 0;
  let acc = 0;
  let bits = 0;
  for (let i = 0; i < len; i++) {
    const c = s.charCodeAt(i);
    const v = c < 128 ? LOOKUP[c] : -1;
    if (v < 0) return null;
    acc = ((acc << 6) | v) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[o++] = (acc >>> bits) & 0xff;
    }
  }
  const canonical = bits === 0 || (acc & ((1 << bits) - 1)) === 0;
  return { bytes, canonical };
}
