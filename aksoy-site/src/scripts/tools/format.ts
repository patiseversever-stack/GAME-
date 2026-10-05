// Türkçe sayı biçimlendirme ve kullanıcı girişini okuma (virgül ya da nokta ondalık ayırıcı olabilir).

const cache = new Map<string, Intl.NumberFormat>();

/** tr-TR biçimlendirici: 1.273 · 0,25 · 12,9 */
export function nf(maxFrac: number, minFrac = 0, grouping = true): Intl.NumberFormat {
  const key = `${maxFrac}|${minFrac}|${grouping}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: maxFrac, minimumFractionDigits: minFrac, useGrouping: grouping });
    cache.set(key, f);
  }
  return f;
}

/** Sabit ondalık sayısıyla biçimlendir. */
export function fmtFixed(x: number, maxFrac: number, minFrac = 0, grouping = true): string {
  if (!Number.isFinite(x)) return '—';
  return nf(maxFrac, minFrac, grouping).format(x);
}

/** Büyüklüğe göre anlamlı hane: 1.273 · 318,3 · 12,5 · 2,38 · 0,125 */
export function fmt(x: number, grouping = true): string {
  if (!Number.isFinite(x)) return '—';
  const a = Math.abs(x);
  const d = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
  return nf(d, 0, grouping).format(x);
}

/** Giriş kutusuna yazılacak değer: binlik ayırıcı yok, ondalık virgül. */
export function fmtInput(x: number, maxFrac = 3): string {
  if (!Number.isFinite(x)) return '';
  return nf(maxFrac, 0, false).format(x);
}

/**
 * Kullanıcı girişini sayıya çevirir. "0,25", "0.25", " 12 " kabul edilir.
 * Binlik ayırıcı desteklenmez (girişlerde gerek yok); belirsiz girişte NaN döner.
 */
export function parseNum(raw: string): number {
  const s = raw.trim().replace(/\s+/g, '').replace(/[−–]/g, '-');
  if (!s) return NaN;
  if (!/^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/.test(s)) return NaN;
  return Number(s.replace(',', '.'));
}

/** En yakın adıma yuvarla (kayan nokta hatasını temizleyerek). */
export function roundTo(x: number, step: number): number {
  const r = Math.round(x / step + 1e-9) * step;
  return Number(r.toFixed(6));
}
