// Base64 (standard or url-safe) → bytes. Uses Uint8Array.fromBase64 when the engine has it.

export function base64ToBytes(b64: string): Uint8Array {
  let clean = b64.replace(/[^A-Za-z0-9+/=_-]/g, '');
  if (clean.includes('-') || clean.includes('_')) clean = clean.replace(/-/g, '+').replace(/_/g, '/');
  const fromB64 = (Uint8Array as unknown as { fromBase64?: (s: string) => Uint8Array }).fromBase64;
  if (typeof fromB64 === 'function') {
    try {
      return fromB64(clean);
    } catch {
      // fall back to atob (e.g. missing padding)
    }
  }
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
