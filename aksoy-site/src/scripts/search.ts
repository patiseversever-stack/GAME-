// Arama paleti (Ctrl/⌘+K veya "/"): kodla ve ustanın diliyle arama.
// "elmas uç" → uç, "klavuz" → kılavuz gibi yazımlar eşleşir; kodlar boşluksuz da bulunur (cnmg120408).
import { drawingSvg } from '../lib/drawings';
import type { Drawing, InsertShape } from '../data/types';

interface Row { s: string; u?: string; c: string; n: string; d: Drawing; h?: InsertShape; k: string; sc: string; b: string[]; w: string; i?: string }

const root = document.querySelector<HTMLElement>('[data-search]');
const input = document.querySelector<HTMLInputElement>('[data-search-input]');
const results = document.querySelector<HTMLElement>('[data-search-results]');
const hintHTML = results?.innerHTML ?? '';

let data: Row[] | null = null;
let loading: Promise<Row[]> | null = null;
let sel = 0;
let current: Row[] = [];

const TR: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', i̇: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
export function norm(s: string) {
  return s
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]|i̇/g, (c) => TR[c] ?? c)
    .replace(/[^a-z0-9.,/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const compact = (s: string) => norm(s).replace(/[\s.,/-]+/g, '');

const SYN: [RegExp, string][] = [
  [/\belmas uc(u|lari|lar)?\b/g, 'uc'],
  [/\bsert (metal|maden) uc\b/g, 'uc'],
  [/\binsert\b/g, 'uc'],
  [/\bklavuz\b/g, 'kilavuz'],
  [/\bkalavuz\b/g, 'kilavuz'],
  [/\bu ?matkap\b/g, 'uclu matkap u-matkap'],
  [/\bfreze cakisi\b/g, 'freze cakisi kafasi'],
  [/\bpens\b/g, 'pens er'],
];

function expand(q: string) {
  let n = norm(q);
  for (const [re, rep] of SYN) n = n.replace(re, rep);
  return n;
}

function score(r: Row, q: string, qc: string, terms: string[]) {
  const code = compact(r.c);
  let s = 0;
  if (qc.length >= 2 && code.startsWith(qc)) s += 120 - (code.length - qc.length);
  else if (qc.length >= 3 && code.includes(qc)) s += 70;
  const hay = norm(`${r.c} ${r.n} ${r.k} ${r.sc} ${r.b.join(' ')} ${r.w}`);
  let all = true;
  for (const t of terms) {
    if (hay.includes(t)) s += t.length > 2 ? 12 : 4;
    else all = false;
  }
  if (all && terms.length) s += 25;
  if (!all && s < 60) return 0;
  return s;
}

/** Harf sayısını koruyarak küçük harfe ve Türkçe karakterlerin ASCII karşılığına çevirir (vurgu konumu için) */
function fold(s: string) {
  let out = '';
  for (const ch of s) {
    const l = ch.toLocaleLowerCase('tr');
    const m = TR[l] ?? l;
    out += m.length === 1 ? m : ch;
  }
  return out;
}
function hl(text: string, q: string) {
  const escape = (t: string) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
  const t = q.trim().split(/\s+/)[0];
  if (!t || t.length < 2) return escape(text);
  const i = fold(text).indexOf(fold(t));
  if (i < 0) return escape(text);
  return `${escape(text.slice(0, i))}<mark>${escape(text.slice(i, i + t.length))}</mark>${escape(text.slice(i + t.length))}`;
}

async function ensure() {
  if (data) return data;
  loading ??= fetch('/arama.json').then((r) => r.json());
  data = await loading;
  return data!;
}

function draw(q: string) {
  if (!results) return;
  if (!q.trim()) { results.innerHTML = hintHTML; current = []; return; }
  const ex = expand(q);
  const terms = ex.split(' ').filter(Boolean);
  const qc = compact(q);
  current = (data ?? [])
    .map((r) => ({ r, s: score(r, ex, qc, terms) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 30)
    .map((x) => x.r);
  sel = 0;
  if (!current.length) {
    results.innerHTML = `<div class="search__hint"><p><strong>“${q.replace(/[<>&]/g, '')}”</strong> için katalogda sonuç yok.</p><p>Aradığınız kodu WhatsApp’tan sorun; listede olmayan ürünler de tedarik edilir.</p><p><a class="btn btn--wa btn--sm" target="_blank" rel="noopener" href="https://wa.me/905356101989?text=${encodeURIComponent(`Merhaba, ${q} için teklif almak istiyorum.`)}">WhatsApp’tan sor</a></p></div>`;
    return;
  }
  results.innerHTML = current
    .map(
      (r, i) => `<a class="sres" role="option" id="sr-${i}" aria-selected="${i === sel}" href="${r.u ?? `/urun/${r.s}`}">
      <span class="sres__thumb">${r.i ? `<img src="${r.i}" alt="" width="96" height="72" loading="lazy" decoding="async" />` : drawingSvg(r.d, r.h)}</span>
      <span><span class="sres__code">${hl(r.c, q)}</span><br /><span class="sres__name">${hl(r.n, q)}</span></span>
      <span class="sres__cat">${r.sc}</span></a>`,
    )
    .join('');
}

function move(d: number) {
  if (!current.length || !results) return;
  sel = (sel + d + current.length) % current.length;
  results.querySelectorAll('.sres').forEach((el, i) => el.setAttribute('aria-selected', String(i === sel)));
  results.querySelector(`#sr-${sel}`)?.scrollIntoView({ block: 'nearest' });
}

export async function openSearch(prefill = '') {
  if (!root || !input) return;
  root.classList.add('is-open');
  root.setAttribute('aria-hidden', 'false');
  (window as any).__lockScroll?.(true);
  input.value = prefill;
  setTimeout(() => input.focus(), 30);
  await ensure();
  draw(input.value);
}
function closeSearch() {
  if (!root) return;
  root.classList.remove('is-open');
  root.setAttribute('aria-hidden', 'true');
  (window as any).__lockScroll?.(false);
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.closest('[data-search-open]')) { e.preventDefault(); openSearch(); return; }
  const chip = t.closest<HTMLButtonElement>('[data-search-chip]');
  if (chip && input) { input.value = chip.textContent || ''; ensure().then(() => draw(input.value)); input.focus(); return; }
  if (root && t === root) closeSearch();
});
input?.addEventListener('input', () => { ensure().then(() => draw(input.value)); });
addEventListener('keydown', (e) => {
  const open = root?.classList.contains('is-open');
  if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !open && !(e.target as HTMLElement).closest('input,textarea,select'))) {
    e.preventDefault();
    open ? closeSearch() : openSearch();
    return;
  }
  if (!open) return;
  if (e.key === 'Escape') closeSearch();
  else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
  else if (e.key === 'Enter' && current[sel]) { e.preventDefault(); location.href = current[sel].u ?? `/urun/${current[sel].s}`; }
});
