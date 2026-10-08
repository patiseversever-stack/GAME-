// Minimal strict UTF-8 codec (owner: replay). PURE — no TextEncoder/TextDecoder dependency,
// so the sim module behaves identically in V8, JSC and Node.

/** UTF-8 bytes of a string. Lone surrogates are encoded as U+FFFD. */
export function utf8Encode(s: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let cp = s.charCodeAt(i);
    if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < s.length) {
      const lo = s.charCodeAt(i + 1);
      if (lo >= 0xdc00 && lo <= 0xdfff) {
        cp = 0x10000 + ((cp - 0xd800) << 10) + (lo - 0xdc00);
        i++;
      } else cp = 0xfffd;
    } else if (cp >= 0xd800 && cp <= 0xdfff) cp = 0xfffd;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
  }
  return Uint8Array.from(out);
}

/** Strict UTF-8 decode (rejects overlong forms, surrogates, > U+10FFFF, truncation). Null on error. */
export function utf8Decode(b: Uint8Array): string | null {
  let s = '';
  let i = 0;
  while (i < b.length) {
    const c = b[i];
    let cp: number;
    let need: number;
    let min: number;
    if (c < 0x80) {
      s += String.fromCharCode(c);
      i++;
      continue;
    } else if (c >= 0xc2 && c <= 0xdf) {
      cp = c & 0x1f;
      need = 1;
      min = 0x80;
    } else if (c >= 0xe0 && c <= 0xef) {
      cp = c & 0x0f;
      need = 2;
      min = 0x800;
    } else if (c >= 0xf0 && c <= 0xf4) {
      cp = c & 0x07;
      need = 3;
      min = 0x10000;
    } else return null;
    if (i + need >= b.length) return null;
    for (let k = 1; k <= need; k++) {
      const cc = b[i + k];
      if ((cc & 0xc0) !== 0x80) return null;
      cp = (cp << 6) | (cc & 63);
    }
    if (cp < min || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return null;
    s += String.fromCodePoint(cp);
    i += need + 1;
  }
  return s;
}
