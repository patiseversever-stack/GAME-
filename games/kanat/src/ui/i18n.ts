// i18n: TR (default) + EN key tables, ICU-like message formatting, locale-aware formatting helpers.
// Pure module (no DOM) so it runs in Node tests. BRIEF §2.13:
//  - no string concatenation for sentences (one key per sentence, params inside),
//  - uppercase with toLocaleUpperCase('tr-TR') (i → İ, ı → I),
//  - numbers: TR 48.210 / EN 48,210; decimals TR 0,42 / EN 0.42,
//  - sport time m:ss.d in both languages (2:07.4), speed TR km/s / EN km/h.
import { TR, type StringKey } from './strings/tr.ts';
import { EN } from './strings/en.ts';

export type Lang = 'tr' | 'en';
export type { StringKey };
export type Params = Record<string, string | number | undefined>;

const TABLES: Record<Lang, Record<string, string>> = { tr: TR, en: EN };
let current: Lang = 'tr';
const listeners = new Set<(lang: Lang) => void>();

export function getLang(): Lang {
  return current;
}

/** Switches language and notifies listeners (UI re-renders the visible screens). */
export function setLang(lang: Lang): void {
  if (lang !== 'tr' && lang !== 'en') return;
  if (lang === current) return;
  current = lang;
  for (const cb of listeners) cb(lang);
}

/** Subscribe to language changes. Returns an unsubscribe function. */
export function onLangChange(cb: (lang: Lang) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Translate a key. Params are substituted with the ICU-like syntax documented in strings/tr.ts. */
export function t(key: StringKey, params?: Params, lang: Lang = current): string {
  const msg = TABLES[lang][key] ?? TABLES.tr[key] ?? key;
  return params || msg.includes('{') ? formatMessage(msg, params ?? {}, lang) : msg;
}

/** Dynamic-key variant (e.g. `route.${id}`). Returns `fallback` (default: the key) if missing. */
export function tk(key: string, params?: Params, fallback?: string, lang: Lang = current): string {
  const msg = TABLES[lang][key] ?? TABLES.tr[key];
  if (msg === undefined) return fallback ?? key;
  return formatMessage(msg, params ?? {}, lang);
}

export function hasKey(key: string): boolean {
  return key in TABLES.tr;
}

/** Locale-correct uppercase (Turkish dotted/dotless i). Never use CSS text-transform for this. */
export function upper(s: string, lang: Lang = current): string {
  return s.toLocaleUpperCase(lang === 'tr' ? 'tr-TR' : 'en-US');
}

// ---------------------------------------------------------------- number / time formatting
const MINUS = '−';

function groupDigits(intStr: string, sep: string): string {
  let out = '';
  const n = intStr.length;
  for (let i = 0; i < n; i++) {
    if (i > 0 && (n - i) % 3 === 0) out += sep;
    out += intStr.charAt(i);
  }
  return out;
}

/** Integer with thousands grouping: TR 48.210, EN 48,210. Negative uses a true minus sign. */
export function fmtInt(n: number, lang: Lang = current): string {
  if (!Number.isFinite(n)) return '–';
  const r = Math.round(n);
  const s = groupDigits(String(Math.abs(r)), lang === 'tr' ? '.' : ',');
  return r < 0 ? MINUS + s : s;
}

/** Fixed decimals with locale separators: TR 1,5 / EN 1.5 (grouping applied to the integer part). */
export function fmtDec(n: number, digits = 1, lang: Lang = current): string {
  if (!Number.isFinite(n)) return '–';
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(digits);
  const [ip, fp] = fixed.split('.');
  const s = groupDigits(ip, lang === 'tr' ? '.' : ',') + (fp ? (lang === 'tr' ? ',' : '.') + fp : '');
  return neg && Number(fixed) !== 0 ? MINUS + s : s;
}

/** Sport time m:ss.d (same in both languages, matches the share card): 127.46 → "2:07.4". Truncates. */
export function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00.0';
  const tenths = Math.floor(sec * 10 + 1e-6);
  const m = Math.floor(tenths / 600);
  const s = Math.floor((tenths % 600) / 10);
  const d = tenths % 10;
  return `${m}:${s < 10 ? '0' : ''}${s}.${d}`;
}

/** Signed delta with locale decimals: −0,42 / +0.42. Zero renders as ±0,00. */
export function fmtDelta(sec: number, digits = 2, lang: Lang = current): string {
  const abs = fmtDec(Math.abs(sec), digits, lang);
  if (Number(Math.abs(sec).toFixed(digits)) === 0) return `±${abs}`;
  return (sec < 0 ? MINUS : '+') + abs;
}

/** Signed integer delta: +1.240 / −310. */
export function fmtIntDelta(n: number, lang: Lang = current): string {
  const r = Math.round(n);
  return (r < 0 ? MINUS : '+') + fmtInt(Math.abs(r), lang);
}

/** m/s → displayed speed value (km/h for both; the unit label differs: TR "km/s", EN "km/h"). */
export function speedValue(ms: number): number {
  return Math.round(ms * 3.6);
}
export function speedUnit(lang: Lang = current): string {
  return TABLES[lang]['hud.speedUnit'];
}

/** Ordinal: TR "1." · EN "1st". */
export function ordinal(n: number, lang: Lang = current): string {
  if (lang === 'tr') return `${n}.`;
  const m100 = n % 100;
  const m10 = n % 10;
  const suf = m100 >= 11 && m100 <= 13 ? 'th' : m10 === 1 ? 'st' : m10 === 2 ? 'nd' : m10 === 3 ? 'rd' : 'th';
  return `${n}${suf}`;
}

const TR_VOWELS = 'aeıioöuü';
const TR_HARMONY: Record<string, string> = { a: 'ı', ı: 'ı', e: 'i', i: 'i', o: 'u', u: 'u', ö: 'ü', ü: 'ü' };

/** Possessive of a name: TR genitive with vowel harmony (Ayşe’nin, Mehmet’in, Can’ın, Umut’un, Öykü’nün) · EN Ayşe’s. */
export function possessive(name: string, lang: Lang = current): string {
  const n = name.trim();
  if (!n) return n;
  if (lang === 'en') return /s$/i.test(n) ? `${n}’` : `${n}’s`;
  const lower = n.toLocaleLowerCase('tr-TR');
  let last = '';
  for (let i = lower.length - 1; i >= 0; i--) {
    const c = lower.charAt(i);
    if (TR_VOWELS.includes(c)) { last = c; break; }
  }
  const endsVowel = TR_VOWELS.includes(lower.charAt(lower.length - 1));
  const v = TR_HARMONY[last] ?? 'i';
  return `${n}’${endsVowel ? 'n' : ''}${v}n`;
}

/** Long date: "8 Ekim 2026" / "8 October 2026". */
export function fmtDate(y: number, month: number, day: number, lang: Lang = current): string {
  return formatMessage(TABLES[lang]['date.long'], { d: String(day), month: TABLES[lang][`month.${month}`] ?? String(month), y: String(y) }, lang);
}

// ---------------------------------------------------------------- message formatter
/** Finds the index of the matching '}' for the '{' at `open`. */
function matchBrace(msg: string, open: number): number {
  let depth = 0;
  for (let i = open; i < msg.length; i++) {
    const c = msg.charAt(i);
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function parseOptions(src: string): Map<string, string> {
  const out = new Map<string, string>();
  let i = 0;
  while (i < src.length) {
    while (i < src.length && /\s/.test(src.charAt(i))) i++;
    const keyStart = i;
    while (i < src.length && src.charAt(i) !== '{' && !/\s/.test(src.charAt(i))) i++;
    const key = src.slice(keyStart, i);
    while (i < src.length && /\s/.test(src.charAt(i))) i++;
    if (src.charAt(i) !== '{') break;
    const end = matchBrace(src, i);
    if (end < 0) break;
    out.set(key, src.slice(i + 1, end));
    i = end + 1;
  }
  return out;
}

function evalArg(inner: string, params: Params, lang: Lang): string {
  const c1 = inner.indexOf(',');
  const name = (c1 < 0 ? inner : inner.slice(0, c1)).trim();
  const raw = params[name];
  if (c1 < 0) return raw === undefined ? `{${name}}` : typeof raw === 'number' ? fmtInt(raw, lang) : raw;
  const rest = inner.slice(c1 + 1);
  const c2 = rest.indexOf(',');
  const type = (c2 < 0 ? rest : rest.slice(0, c2)).trim();
  const num = typeof raw === 'number' ? raw : Number(raw);
  switch (type) {
    case 'number':
      return fmtInt(num, lang);
    case 'decimal':
      return fmtDec(num, 1, lang);
    case 'decimal2':
      return fmtDec(num, 2, lang);
    case 'time':
      return fmtTime(num);
    case 'delta':
      return fmtDelta(num, 2, lang);
    case 'ordinal':
      return ordinal(num, lang);
    case 'possessive':
      return possessive(String(raw ?? ''), lang);
    case 'upper':
      return upper(String(raw ?? ''), lang);
    case 'plural': {
      const opts = parseOptions(c2 < 0 ? '' : rest.slice(c2 + 1));
      const exact = opts.get(`=${num}`);
      const pick = exact ?? (num === 1 ? opts.get('one') : undefined) ?? opts.get('other') ?? '';
      return formatMessage(pick, params, lang, num);
    }
    case 'select': {
      const opts = parseOptions(c2 < 0 ? '' : rest.slice(c2 + 1));
      const pick = opts.get(String(raw)) ?? opts.get('other') ?? '';
      return formatMessage(pick, params, lang);
    }
    default:
      return raw === undefined ? '' : String(raw);
  }
}

/** Formats an ICU-like message. `#` inside a plural branch is the locale-formatted count. */
export function formatMessage(msg: string, params: Params, lang: Lang = current, pluralNum?: number): string {
  let out = '';
  let i = 0;
  while (i < msg.length) {
    const c = msg.charAt(i);
    if (c === '{') {
      const end = matchBrace(msg, i);
      if (end < 0) { out += msg.slice(i); break; }
      out += evalArg(msg.slice(i + 1, end), params, lang);
      i = end + 1;
    } else if (c === '#' && pluralNum !== undefined) {
      out += fmtInt(pluralNum, lang);
      i++;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

// ---------------------------------------------------------------- content name helpers
export function worldName(id: string, lang: Lang = current): string {
  return tk(`world.${id}`, undefined, id, lang);
}
export function worldShort(id: string, lang: Lang = current): string {
  return tk(`worldShort.${id}`, undefined, id, lang);
}
export function routeName(id: string, lang: Lang = current): string {
  return tk(`route.${id}`, undefined, id, lang);
}

/** All keys of the default table (used by tests and the gallery). */
export function allKeys(): StringKey[] {
  return Object.keys(TR) as StringKey[];
}
export function tableFor(lang: Lang): Readonly<Record<string, string>> {
  return TABLES[lang];
}
