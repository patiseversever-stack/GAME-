// Teklif Sepeti: ürünler tarayıcıda (localStorage) tutulur, tek bir WhatsApp mesajına dönüştürülür.
// Sipariş veya ödeme yoktur; site hiçbir veriyi sunucuya göndermez.
import { drawingSvg } from '../lib/drawings';
import { site } from '../data/site';
import type { Drawing, InsertShape } from '../data/types';

export interface QuoteItem {
  slug: string;
  code: string;
  name: string;
  drawing: Drawing;
  shape?: InsertShape;
  brands: string[];
  brand: string;
  qty: number;
}

const KEY = 'aksoy-teklif-v1';
const ANY_BRAND = 'Marka farketmez';

function load(): QuoteItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
let items: QuoteItem[] = load();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* gizli sekme: yalnızca bu oturumda tutulur */ }
  render();
  dispatchEvent(new CustomEvent('quote:change', { detail: items }));
}

const $ = <T extends Element>(s: string) => document.querySelector<T>(s);
const drawer = $<HTMLElement>('[data-quote-drawer]');
const scrim = $<HTMLElement>('[data-quote-scrim]');
const list = $<HTMLUListElement>('[data-quote-list]');
const empty = $<HTMLElement>('[data-quote-empty]');
const fields = $<HTMLElement>('[data-quote-fields]');
const foot = $<HTMLElement>('[data-quote-foot]');
const send = $<HTMLAnchorElement>('[data-quote-send]');
const firma = $<HTMLInputElement>('#q-firma');
const note = $<HTMLTextAreaElement>('#q-not');

let lastFocus: HTMLElement | null = null;
export function openQuote() {
  if (!drawer) return;
  lastFocus = document.activeElement as HTMLElement;
  drawer.classList.add('is-open');
  scrim?.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  (window as any).__lockScroll?.(true);
  setTimeout(() => drawer.querySelector<HTMLElement>('[data-quote-close]')?.focus(), 50);
}
export function closeQuote() {
  if (!drawer) return;
  drawer.classList.remove('is-open');
  scrim?.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  (window as any).__lockScroll?.(false);
  lastFocus?.focus?.();
}

function message() {
  const lines = items.map((it, i) => {
    const brand = it.brand && it.brand !== ANY_BRAND ? ` — Marka: ${it.brand}` : '';
    return `${i + 1}) ${it.code} — ${it.name}${brand} — ${it.qty} adet`;
  });
  const f = firma?.value.trim();
  const n = note?.value.trim();
  return [
    `Merhaba ${site.name},`,
    'Aşağıdaki ürünler için teklif rica ediyorum:',
    '',
    ...lines,
    '',
    f ? `Firma: ${f}` : '',
    n ? `Not: ${n}` : '',
    '(Web sitesi teklif sepeti)',
  ]
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
    .join('\n')
    .trim();
}

function updateSend() {
  if (send) send.href = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message())}`;
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function render() {
  const total = items.reduce((s, i) => s + 1, 0);
  document.querySelectorAll<HTMLElement>('[data-quote-count]').forEach((b) => {
    const prev = b.textContent;
    b.textContent = String(total);
    b.classList.toggle('has-items', total > 0);
    if (prev !== String(total) && total > 0) {
      b.classList.remove('bump');
      void b.offsetWidth;
      b.classList.add('bump');
    }
  });
  document.querySelectorAll<HTMLElement>('[data-quote-add]').forEach((btn) => {
    const slug = btn.dataset.slug;
    const inList = items.some((i) => i.slug === slug);
    btn.classList.toggle('is-added', inList);
    const lbl = btn.querySelector('[data-label]');
    if (lbl) lbl.textContent = inList ? 'Sepette ✓' : btn.dataset.labelAdd || 'Teklif sepetine ekle';
  });
  if (!list) return;
  const has = items.length > 0;
  empty?.toggleAttribute('hidden', has);
  fields?.toggleAttribute('hidden', !has);
  foot?.toggleAttribute('hidden', !has);
  list.innerHTML = items
    .map((it, idx) => {
      const opts = [ANY_BRAND, ...it.brands]
        .map((b) => `<option ${b === it.brand ? 'selected' : ''}>${esc(b)}</option>`)
        .join('');
      return `<li class="qitem" data-idx="${idx}">
        <div class="qitem__thumb">${drawingSvg(it.drawing, it.shape)}</div>
        <div>
          <a class="qitem__code" href="/urun/${it.slug}">${esc(it.code)}</a>
          <div class="qitem__name">${esc(it.name)}</div>
          ${it.brands.length ? `<div class="qitem__brand"><select aria-label="Marka tercihi" data-brand>${opts}</select></div>` : ''}
        </div>
        <div class="qitem__right">
          <div class="stepper"><button type="button" data-dec aria-label="Azalt">−</button><input type="number" inputmode="numeric" min="1" max="9999" value="${it.qty}" aria-label="Adet" data-qty /><button type="button" data-inc aria-label="Artır">+</button></div>
          <button type="button" class="qitem__remove" data-remove>Çıkar</button>
        </div>
      </li>`;
    })
    .join('');
  updateSend();
}

export function addToQuote(p: Omit<QuoteItem, 'qty' | 'brand'> & { qty?: number; brand?: string }) {
  const found = items.find((i) => i.slug === p.slug);
  if (found) found.qty += p.qty ?? 10;
  else items.push({ ...p, qty: p.qty ?? 10, brand: p.brand ?? ANY_BRAND });
  save();
  (window as any).__toast?.(`${p.code} teklif sepetine eklendi`);
}

/* Olay bağlama */
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const add = t.closest<HTMLElement>('[data-quote-add]');
  if (add) {
    e.preventDefault();
    try {
      const p = JSON.parse(add.dataset.product || '{}');
      const qtyInput = add.dataset.qtyFrom ? document.querySelector<HTMLInputElement>(add.dataset.qtyFrom) : null;
      const brandSel = add.dataset.brandFrom ? document.querySelector<HTMLSelectElement>(add.dataset.brandFrom) : null;
      addToQuote({ ...p, qty: qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : undefined, brand: brandSel?.value || undefined });
      if (add.dataset.open === 'true') openQuote();
    } catch { /* bozuk veri */ }
    return;
  }
  if (t.closest('[data-quote-open]')) { e.preventDefault(); openQuote(); return; }
  if (t.closest('[data-quote-close]') || t.closest('[data-quote-scrim]')) { closeQuote(); return; }
  const li = t.closest<HTMLElement>('.qitem');
  if (li) {
    const idx = Number(li.dataset.idx);
    if (t.closest('[data-inc]')) { items[idx].qty = Math.min(9999, items[idx].qty + 1); save(); }
    else if (t.closest('[data-dec]')) { items[idx].qty = Math.max(1, items[idx].qty - 1); save(); }
    else if (t.closest('[data-remove]')) { items.splice(idx, 1); save(); }
  }
});
document.addEventListener('change', (e) => {
  const t = e.target as HTMLElement;
  const li = t.closest<HTMLElement>('.qitem');
  if (!li) return;
  const idx = Number(li.dataset.idx);
  if (t.matches('[data-qty]')) { items[idx].qty = Math.min(9999, Math.max(1, parseInt((t as HTMLInputElement).value, 10) || 1)); save(); }
  if (t.matches('[data-brand]')) { items[idx].brand = (t as HTMLSelectElement).value; save(); }
});
firma?.addEventListener('input', updateSend);
note?.addEventListener('input', updateSend);
document.querySelector('[data-quote-copy]')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(message());
    (window as any).__toast?.('Liste panoya kopyalandı');
  } catch {
    (window as any).__toast?.('Kopyalanamadı — metni elle seçin');
  }
});
addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer?.classList.contains('is-open')) closeQuote(); });
addEventListener('storage', (e) => { if (e.key === KEY) { items = load(); render(); } });

render();
