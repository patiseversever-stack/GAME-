// Güvenli localStorage: özel pencere / kota / engellenmiş erişimde çökmez, bellekte devam eder.
const mem = new Map();
let ok = true;
try {
  const k = '__okey_probe__';
  localStorage.setItem(k, '1');
  localStorage.removeItem(k);
} catch {
  ok = false;
}

export function readJSON(key, fallback = null) {
  try {
    const raw = ok ? localStorage.getItem(key) : mem.get(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  const raw = JSON.stringify(value);
  try {
    if (ok) localStorage.setItem(key, raw);
    else mem.set(key, raw);
    return true;
  } catch {
    mem.set(key, raw);
    return false;
  }
}

export function removeKey(key) {
  try {
    if (ok) localStorage.removeItem(key);
  } catch {}
  mem.delete(key);
}
