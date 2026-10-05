// Kesme hızı hesaplayıcısı: alan tanımları, kaydırıcı ölçekleri ve saf hesap fonksiyonu.
// Sayfa ilk durumu sunucuda bu fonksiyonla üretir; tarayıcı betiği aynı fonksiyonla günceller.
import type { Op } from './cutting-data';
import { rpm, cuttingSpeed, feedRev, feedMill, feedTap, mrrTurn, mrrMill, mrrDrill } from './cutting-data';
import { fmt, fmtFixed } from './format';
import { isStandard } from './tap-data';

export type Mode = 'vc2n' | 'n2vc';

export interface FieldDef {
  key: string;
  sym: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  log?: boolean;
  int?: boolean;
  optional?: boolean;
  slider?: boolean;
  /** Yalnızca bu hesap yönünde görünür */
  mode?: Mode;
}

const vc = (value: number): FieldDef => ({ key: 'vc', sym: 'Vc', label: 'Kesme hızı', unit: 'm/dk', min: 1, max: 1500, step: 1, value, log: true, mode: 'vc2n' });
const n = (value: number, max: number): FieldDef => ({ key: 'n', sym: 'n', label: 'Devir', unit: 'dev/dk', min: 10, max, step: 1, value, log: true, int: true, mode: 'n2vc' });
const nmax: FieldDef = { key: 'nmax', sym: 'nₘₐₓ', label: 'Tezgâh maks. devri', unit: 'dev/dk', min: 1, max: 100000, step: 1, value: NaN, optional: true, slider: false, int: true };

export const FIELDS: Record<Op, FieldDef[]> = {
  torna: [
    { key: 'd', sym: 'D', label: 'İşlenen çap', unit: 'mm', min: 1, max: 1000, step: 0.1, value: 50, log: true },
    vc(250),
    n(1500, 10000),
    { key: 'fn', sym: 'fn', label: 'Devir başına ilerleme', unit: 'mm/dev', min: 0.01, max: 1.5, step: 0.01, value: 0.25 },
    { key: 'ap', sym: 'ap', label: 'Kesme derinliği', unit: 'mm', min: 0.1, max: 15, step: 0.1, value: 2 },
    nmax,
  ],
  freze: [
    { key: 'd', sym: 'D', label: 'Takım çapı', unit: 'mm', min: 0.5, max: 315, step: 0.1, value: 10, log: true },
    vc(165),
    n(5000, 40000),
    { key: 'z', sym: 'z', label: 'Ağız (diş) sayısı', unit: 'adet', min: 1, max: 24, step: 1, value: 4, int: true },
    { key: 'fz', sym: 'fz', label: 'Diş başına ilerleme', unit: 'mm/diş', min: 0.005, max: 0.6, step: 0.005, value: 0.04 },
    { key: 'ap', sym: 'ap', label: 'Eksenel kesme derinliği', unit: 'mm', min: 0.1, max: 60, step: 0.1, value: 5 },
    { key: 'ae', sym: 'ae', label: 'Radyal kesme genişliği', unit: 'mm', min: 0.1, max: 200, step: 0.1, value: 3 },
    nmax,
  ],
  delme: [
    { key: 'd', sym: 'D', label: 'Matkap çapı', unit: 'mm', min: 0.5, max: 80, step: 0.1, value: 10, log: true },
    vc(95),
    n(3000, 30000),
    { key: 'fn', sym: 'fn', label: 'Devir başına ilerleme', unit: 'mm/dev', min: 0.01, max: 1, step: 0.005, value: 0.15 },
    nmax,
  ],
  kilavuz: [
    { key: 'd', sym: 'D', label: 'Diş anma çapı (M)', unit: 'mm', min: 1, max: 64, step: 0.1, value: 10, log: true },
    { key: 'p', sym: 'P', label: 'Hatve', unit: 'mm', min: 0.2, max: 6, step: 0.05, value: 1.5 },
    { key: 'vc', sym: 'Vc', label: 'Kesme hızı', unit: 'm/dk', min: 0.5, max: 80, step: 0.5, value: 11, log: true, mode: 'vc2n' },
    n(350, 6000),
    nmax,
  ],
};

/* --------------------------------------------------------------- Kaydırıcı ölçeği */

export const SLIDER_MAX = 1000;

export function toSlider(f: FieldDef, v: number): number {
  if (!Number.isFinite(v)) return 0;
  const c = Math.min(f.max, Math.max(f.min, v));
  if (f.log) return Math.round((SLIDER_MAX * Math.log(c / f.min)) / Math.log(f.max / f.min));
  return Math.round(((c - f.min) / (f.max - f.min)) * SLIDER_MAX);
}

/** Kaydırıcı konumundan değer; log ölçekte "güzel" adıma yuvarlanır (≈ 2,5 anlamlı hane). */
export function fromSlider(f: FieldDef, s: number): number {
  const t = s / SLIDER_MAX;
  if (f.log) {
    const v = f.min * Math.pow(f.max / f.min, t);
    if (f.int) return Math.max(f.min, Math.round(v / (v >= 1000 ? 10 : 1)) * (v >= 1000 ? 10 : 1));
    const step = Math.pow(10, Math.floor(Math.log10(v)) - 2) * 5;
    return Number((Math.round(v / step) * step).toPrecision(6));
  }
  const v = f.min + t * (f.max - f.min);
  return Number((Math.round(v / f.step) * f.step).toFixed(6));
}

/* --------------------------------------------------------------- Hesap */

export interface ResultItem {
  key: string;
  label: string;
  sym: string;
  unit: string;
  value: number;
  text: string;
  formula: string;
  primary?: boolean;
  badge?: string;
}

export interface CalcOutput {
  results: ResultItem[];
  errors: Record<string, string>;
  warnings: string[];
  infos: string[];
  /** Hesapta kullanılan (sınırlanmış olabilecek) devir ve kesme hızı */
  nEff: number;
  vcEff: number;
}

const ok = (x: number) => Number.isFinite(x) && x > 0;
const f = (x: number) => fmt(x);

export function compute(op: Op, mode: Mode, v: Record<string, number>): CalcOutput {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];
  const infos: string[] = [];
  const need = (k: string) => {
    const x = v[k];
    if (Number.isNaN(x)) errors[k] = 'Bir sayı girin (ör. 0,25).';
    else if (!(x > 0)) errors[k] = 'Değer sıfırdan büyük olmalı.';
  };
  const def = FIELDS[op];
  for (const fd of def) {
    if (fd.mode && fd.mode !== mode) continue;
    if (fd.optional) {
      const x = v[fd.key];
      if (x !== undefined && !Number.isNaN(x) && !(x > 0)) errors[fd.key] = 'Boş bırakın ya da sıfırdan büyük bir değer girin.';
      continue;
    }
    need(fd.key);
    if (fd.int && ok(v[fd.key]) && !Number.isInteger(v[fd.key])) errors[fd.key] = 'Tam sayı girin.';
  }

  const D = v.d;
  // Fiziksel sınırlar
  if (op === 'torna' && ok(v.ap) && ok(D) && v.ap >= D / 2) errors.ap = 'Kesme derinliği yarıçaptan (D/2) küçük olmalı.';
  if (op === 'freze' && ok(v.ae) && ok(D) && v.ae > D) errors.ae = 'Radyal genişlik ae, takım çapı D’yi aşamaz.';
  if (op === 'kilavuz' && ok(v.p) && ok(D) && v.p >= D / 3) errors.p = 'Hatve bu çap için çok büyük; değerleri kontrol edin.';

  // Devir / kesme hızı
  let nCalc = NaN;
  let vcIn = NaN;
  if (mode === 'vc2n') {
    vcIn = v.vc;
    if (ok(vcIn) && ok(D) && !errors.d) nCalc = rpm(vcIn, D);
  } else {
    nCalc = ok(v.n) && !errors.n ? v.n : NaN;
    if (ok(nCalc) && ok(D)) vcIn = cuttingSpeed(nCalc, D);
  }
  let nEff = nCalc;
  let limited = false;
  const nm = v.nmax;
  if (ok(nm) && ok(nCalc) && nCalc > nm + 1e-9) {
    if (mode === 'vc2n') {
      nEff = nm;
      limited = true;
      warnings.push(`Hesaplanan devir (${f(nCalc)} dev/dk) tezgâh sınırını (${f(nm)} dev/dk) aşıyor. Sınırda gerçek kesme hızı Vc = ${f(cuttingSpeed(nm, D))} m/dk olur; ilerleme ve talaş hacmi bu devirle hesaplandı.`);
    } else {
      warnings.push(`Girilen devir tezgâh sınırının (${f(nm)} dev/dk) üstünde.`);
    }
  }
  const vcEff = ok(nEff) && ok(D) ? cuttingSpeed(nEff, D) : NaN;

  const results: ResultItem[] = [];
  const push = (r: Omit<ResultItem, 'text'>) => results.push({ ...r, text: ok(r.value) ? f(r.value) : '—' });

  if (mode === 'vc2n') {
    push({
      key: 'n', label: 'Devir', sym: 'n', unit: 'dev/dk', value: nEff, primary: true, badge: limited ? 'Tezgâh sınırı' : undefined,
      formula: ok(nCalc) ? `n = 1000 × Vc / (π × D) = 1000 × ${f(vcIn)} / (π × ${f(D)})${limited ? ` = ${f(nCalc)} → sınır ${f(nm)}` : ''}` : 'n = 1000 × Vc / (π × D)',
    });
  } else {
    push({
      key: 'vc', label: 'Kesme hızı', sym: 'Vc', unit: 'm/dk', value: vcIn, primary: true,
      formula: ok(vcIn) ? `Vc = π × D × n / 1000 = π × ${f(D)} × ${f(nCalc)} / 1000` : 'Vc = π × D × n / 1000',
    });
  }
  const nTxt = f(nEff);

  if (op === 'torna') {
    const vf = ok(nEff) && ok(v.fn) ? feedRev(v.fn, nEff) : NaN;
    push({ key: 'vf', label: 'İlerleme hızı', sym: 'Vf', unit: 'mm/dk', value: vf, formula: ok(vf) ? `Vf = fn × n = ${f(v.fn)} × ${nTxt}` : 'Vf = fn × n' });
    const q = ok(vcEff) && ok(v.ap) && ok(v.fn) && !errors.ap ? mrrTurn(vcEff, v.ap, v.fn) : NaN;
    push({ key: 'q', label: 'Talaş kaldırma', sym: 'Q', unit: 'cm³/dk', value: q, formula: ok(q) ? `Q = Vc × ap × fn = ${f(vcEff)} × ${f(v.ap)} × ${f(v.fn)}` : 'Q = Vc × ap × fn' });
  }
  if (op === 'freze') {
    const zOk = ok(v.z) && !errors.z;
    const vf = ok(nEff) && ok(v.fz) && zOk ? feedMill(v.fz, v.z, nEff) : NaN;
    push({ key: 'vf', label: 'Tabla ilerlemesi', sym: 'Vf', unit: 'mm/dk', value: vf, formula: ok(vf) ? `Vf = fz × z × n = ${f(v.fz)} × ${v.z} × ${nTxt}` : 'Vf = fz × z × n' });
    const q = ok(vf) && ok(v.ap) && ok(v.ae) && !errors.ae ? mrrMill(v.ap, v.ae, vf) : NaN;
    push({ key: 'q', label: 'Talaş kaldırma', sym: 'Q', unit: 'cm³/dk', value: q, formula: ok(q) ? `Q = ap × ae × Vf / 1000 = ${f(v.ap)} × ${f(v.ae)} × ${f(vf)} / 1000` : 'Q = ap × ae × Vf / 1000' });
    const fnv = ok(v.fz) && zOk ? v.fz * v.z : NaN;
    push({ key: 'fn', label: 'Devir başına ilerleme', sym: 'fn', unit: 'mm/dev', value: fnv, formula: ok(fnv) ? `fn = fz × z = ${f(v.fz)} × ${v.z}` : 'fn = fz × z' });
    if (ok(v.ae) && ok(D) && !errors.ae && v.ae < D / 2) infos.push('ae, D/2’den küçük: talaş incelir. Aynı talaş kalınlığı için fz biraz artırılabilir (talaş inceltme).');
  }
  if (op === 'delme') {
    const vf = ok(nEff) && ok(v.fn) ? feedRev(v.fn, nEff) : NaN;
    push({ key: 'vf', label: 'İlerleme hızı', sym: 'Vf', unit: 'mm/dk', value: vf, formula: ok(vf) ? `Vf = fn × n = ${f(v.fn)} × ${nTxt}` : 'Vf = fn × n' });
    const q = ok(vcEff) && ok(v.fn) ? mrrDrill(vcEff, D, v.fn) : NaN;
    push({ key: 'q', label: 'Talaş kaldırma', sym: 'Q', unit: 'cm³/dk', value: q, formula: ok(q) ? `Q = Vc × D × fn / 4 = ${f(vcEff)} × ${f(D)} × ${f(v.fn)} / 4` : 'Q = Vc × D × fn / 4' });
  }
  if (op === 'kilavuz') {
    const vf = ok(nEff) && ok(v.p) && !errors.p ? feedTap(v.p, nEff) : NaN;
    push({ key: 'vf', label: 'İlerleme hızı', sym: 'Vf', unit: 'mm/dk', value: vf, formula: ok(vf) ? `Vf = P × n = ${f(v.p)} × ${nTxt}` : 'Vf = P × n' });
    push({ key: 'fr', label: 'Devir başına ilerleme', sym: 'f', unit: 'mm/dev', value: ok(v.p) && !errors.p ? v.p : NaN, formula: 'f = P (senkron kılavuz çekmede hatveye eşit)' });
    if (ok(D) && ok(v.p) && !errors.p) {
      const s = isStandard(D, v.p);
      const name = `M${fmtFixed(D, 1)}${s === 'coarse' ? '' : ` × ${fmtFixed(v.p, 2)}`}`;
      if (s === 'coarse') infos.push(`${name}: ISO metrik kaba diş (hatve ${fmtFixed(v.p, 2)} mm).`);
      else if (s === 'fine') infos.push(`${name}: ISO metrik ince diş.`);
      else if (s === 'other') infos.push(`M${fmtFixed(D, 1)} × ${fmtFixed(v.p, 2)} standart ISO metrik hatvelerden biri değil; hatveyi kontrol edin.`);
    }
  }
  return { results, errors, warnings, infos, nEff, vcEff };
}
