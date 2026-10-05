// Teklif Sepeti: ürünler tarayıcıda (localStorage) tutulur, tek bir WhatsApp mesajına dönüştürülür.
// Sipariş veya ödeme yoktur; site hiçbir veriyi sunucuya göndermez. Liste bağlantı olarak paylaşılabilir.
import { drawingSvg } from '../lib/drawings';
import { productImage } from '../lib/product-image';
import { site } from '../data/site';
import { trapTab, searchOpen } from './a11y';
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
const ANY_BRAND = 'Marka fark etmez';

function load(): QuoteItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    // Eski yazım ("farketmez") ile kaydedilmiş sepetler yeni yazıma çevrilir
    return Array.isArray(v) ? v.map((it: QuoteItem) => (it.brand === 'Marka farketmez' ? { ...it, brand: ANY_BRAND } : it)) : [];
  } catch {
    return [];
  }
}
let items: QuoteItem[] = load();

const MAX_QTY = 9999;
const clampQty = (n: number) => Math.min(MAX_QTY, Math.max(1, Math.round(n) || 1));
function store() {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* gizli sekme: yalnızca bu oturumda tutulur */ }
  dispatchEvent(new CustomEvent('quote:change', { detail: items }));
}
function save() {
  store();
  render();
}
/** Adet ve marka değişiminde liste yeniden çizilmez: odak ve imleç yerinde kalır */
function saveQuiet() {
  store();
  updateSend();
  updateSum();
}
/** Başlık altındaki özet: kalem ve toplam adet */
function updateSum() {
  const el = document.querySelector<HTMLElement>('[data-quote-sum]');
  if (!el) return;
  const pcs = items.reduce((s, i) => s + i.qty, 0);
  el.textContent = items.length ? `${items.length} kalem · ${pcs.toLocaleString('tr-TR')} adet` : 'Fiyat sorma listesi';
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

/* ---------- Teslim, termin ve konum ---------- */
const OSTIM = { lat: 39.9805, lng: 32.7495 }; // Ostim / İvedik OSB
interface Loc { lat: number; lng: number; acc: number; place: string; km: number; inArea: boolean | null }
let loc: Loc | null = null;
try { const raw = sessionStorage.getItem('aksoy-konum'); if (raw) loc = JSON.parse(raw); } catch { /* yok say */ }
const radio = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? '';
const mapsLink = (l: { lat: number; lng: number }) => `https://maps.google.com/?q=${l.lat.toFixed(6)},${l.lng.toFixed(6)}`;
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function message() {
  // Her ürün: kod ve adet ilk satırda, açıklama altında (ad kodu tekrar ediyorsa yazılmaz)
  const lc = (s: string) => s.toLocaleLowerCase('tr');
  const lines = items.flatMap((it, i) => {
    const brand = it.brand && it.brand !== ANY_BRAND ? `, ${it.brand}` : '';
    const head = `${i + 1}) ${it.code} - ${it.qty} adet${brand}`;
    return lc(it.name).includes(lc(it.code)) ? [head] : [head, `    ${it.name}`];
  });
  const f = firma?.value.trim();
  const n = note?.value.trim();
  const teslim = radio('q-teslim');
  const termin = radio('q-termin');
  const meta = [
    f ? `Firma: ${f}` : '',
    teslim ? `Teslim: ${teslim}` : '',
    termin ? `Ne zaman lazım: ${termin}` : '',
    loc && teslim !== "Ostim'den gelip alırım" ? `Konum: ${loc.place ? `${loc.place} ` : ''}${mapsLink(loc)}` : '',
    n ? `Not: ${n}` : '',
  ].filter(Boolean);
  return ['Merhaba, aşağıdaki ürünler için fiyat ve termin öğrenmek istiyorum.', '', ...lines, ...(meta.length ? ['', ...meta] : [])].join('\n');
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
    // Ürün sayfasında ürün sepetteyse düğme, seçilen adet ve markayla sepeti günceller
    if (lbl) lbl.textContent = inList ? (btn.dataset.qtyFrom ? 'Sepeti güncelle' : 'Sepette ✓') : btn.dataset.labelAdd || 'Teklif sepetine ekle';
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
        <div class="qitem__thumb">${(() => { const im = productImage({ drawing: it.drawing, shape: it.shape, code: it.code, name: it.name }); return im ? `<img src="${im.small}" alt="" width="64" height="48" loading="lazy" />` : drawingSvg(it.drawing, it.shape); })()}</div>
        <div class="qitem__main">
          <a class="qitem__code" href="/urun/${it.slug}">${esc(it.code)}</a>
          <div class="qitem__name">${esc(it.name)}</div>
          <div class="qitem__row">
            ${it.brands.length ? `<label class="qitem__brand"><span class="sr-only">Marka tercihi</span><select data-brand>${opts}</select></label>` : '<span></span>'}
            <div class="stepper"><button type="button" data-dec aria-label="Azalt">−</button><input type="number" inputmode="numeric" min="1" max="9999" value="${it.qty}" aria-label="Adet" data-qty /><button type="button" data-inc aria-label="Artır">+</button></div>
          </div>
        </div>
        <button type="button" class="qitem__remove" data-remove aria-label="${esc(it.code)} sepetten çıkar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h14M10 4h4M7 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h5.4a1.5 1.5 0 0 0 1.5-1.3L17 7M10.2 10.5v6.5M13.8 10.5v6.5"/></svg></button>
      </li>`;
    })
    .join('');
  updateSend();
  updateSum();
}

export function addToQuote(p: Omit<QuoteItem, 'qty' | 'brand'> & { qty?: number; brand?: string }) {
  const found = items.find((i) => i.slug === p.slug);
  const toast = (window as any).__toast;
  if (found) {
    // Kartın + düğmesi (adet seçilmeden): ürün zaten sepette, adedi sepette değiştirilir
    if (p.qty === undefined) { toast?.(`${p.code} zaten sepette; adedi sepetten değiştirebilirsiniz`); return; }
    // Ürün sayfası: sayfadaki son seçim (adet ve marka) sepettekinin yerine geçer
    found.qty = clampQty(p.qty);
    found.brand = p.brand ?? ANY_BRAND;
    save();
    toast?.(`${p.code} güncellendi: ${found.qty} adet${found.brand !== ANY_BRAND ? `, ${found.brand}` : ''}`);
    return;
  }
  items.push({ ...p, qty: clampQty(p.qty ?? 10), brand: p.brand ?? ANY_BRAND });
  save();
  toast?.(`${p.code} teklif sepetine eklendi`);
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
      addToQuote({ ...p, qty: qtyInput ? clampQty(parseInt(qtyInput.value, 10)) : undefined, brand: brandSel?.value || undefined });
      if (add.dataset.open === 'true') openQuote();
    } catch { /* bozuk veri */ }
    return;
  }
  if (t.closest('[data-quote-open]')) { e.preventDefault(); openQuote(); return; }
  if (t.closest('[data-quote-close]') || t.closest('[data-quote-scrim]')) { closeQuote(); return; }
  const li = t.closest<HTMLElement>('.qitem');
  if (li) {
    const idx = Number(li.dataset.idx);
    const qtyEl = li.querySelector<HTMLInputElement>('[data-qty]');
    if (t.closest('[data-inc]') || t.closest('[data-dec]')) {
      items[idx].qty = clampQty(items[idx].qty + (t.closest('[data-inc]') ? 1 : -1));
      if (qtyEl) qtyEl.value = String(items[idx].qty);
      saveQuiet();
    } else if (t.closest('[data-remove]')) {
      const code = items[idx].code;
      items.splice(idx, 1);
      save();
      // Odak kaybolmasın: yerine gelen satıra, liste boşaldıysa kapat düğmesine geç
      const rows = list?.querySelectorAll<HTMLElement>('.qitem');
      const next = rows?.[Math.min(idx, rows.length - 1)]?.querySelector<HTMLElement>('.qitem__code');
      (next ?? drawer?.querySelector<HTMLElement>('[data-quote-close]'))?.focus({ preventScroll: true });
      (window as any).__toast?.(`${code} sepetten çıkarıldı`);
    }
  }
});
document.addEventListener('change', (e) => {
  const t = e.target as HTMLElement;
  const li = t.closest<HTMLElement>('.qitem');
  if (!li) return;
  const idx = Number(li.dataset.idx);
  if (t.matches('[data-qty]')) { items[idx].qty = clampQty(parseInt((t as HTMLInputElement).value, 10)); (t as HTMLInputElement).value = String(items[idx].qty); saveQuiet(); }
  if (t.matches('[data-brand]')) { items[idx].brand = (t as HTMLSelectElement).value; saveQuiet(); }
});
/* Firma, not, teslim ve termin sekme açık kaldıkça sayfalar arasında korunur (sessionStorage) */
const FORM_KEY = 'aksoy-teklif-form';
function saveForm() {
  try { sessionStorage.setItem(FORM_KEY, JSON.stringify({ f: firma?.value ?? '', n: note?.value ?? '', t: radio('q-teslim'), z: radio('q-termin') })); } catch { /* yok say */ }
}
try {
  const v = JSON.parse(sessionStorage.getItem(FORM_KEY) || 'null');
  if (v) {
    if (firma) firma.value = v.f ?? '';
    if (note) note.value = v.n ?? '';
    for (const [name, val] of [['q-teslim', v.t], ['q-termin', v.z]] as const) {
      const r = [...document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)].find((x) => x.value === val);
      if (r) r.checked = true;
    }
    updateSend();
  }
} catch { /* yok say */ }
firma?.addEventListener('input', () => { updateSend(); saveForm(); });
note?.addEventListener('input', () => { updateSend(); saveForm(); });
document.querySelectorAll('input[name="q-teslim"], input[name="q-termin"]').forEach((r) => r.addEventListener('change', () => { updateSend(); renderLoc(); saveForm(); }));

/* Konum: tarayıcı izin verirse alınır, ilçe adı OpenStreetMap'ten bulunur, haritada gösterilir.
   Sunucuya gitmez; yalnızca bu sekmede (sessionStorage) tutulur ve kullanıcının göndereceği WhatsApp mesajına eklenir. */
const locWrap = $<HTMLElement>('[data-q-loc]');
const locBtn = $<HTMLButtonElement>('[data-q-loc-btn]');
const locCard = $<HTMLElement>('[data-q-loc-card]');
const locMap = $<HTMLElement>('[data-q-loc-map]');
const locPlace = $<HTMLElement>('[data-q-loc-place]');
const locMeta = $<HTMLElement>('[data-q-loc-meta]');
const locOpen = $<HTMLAnchorElement>('[data-q-loc-open]');
const locMsg = $<HTMLElement>('[data-q-loc-msg]');
const AREA = site.serviceAreas.map((c) => c.toLocaleLowerCase('tr'));
function renderLoc() {
  const pickup = radio('q-teslim') === "Ostim'den gelip alırım";
  locWrap?.toggleAttribute('hidden', pickup);
  if (!locCard || !locBtn) return;
  locCard.hidden = !loc;
  locBtn.hidden = !!loc;
  if (!loc) { if (locMap) locMap.innerHTML = ''; return; }
  const d = 0.008;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${loc.lng - d * 1.6},${loc.lat - d},${loc.lng + d * 1.6},${loc.lat + d}&layer=mapnik&marker=${loc.lat},${loc.lng}`;
  if (locMap && locMap.dataset.src !== src) {
    locMap.dataset.src = src;
    // Harita yalnızca önizleme: klavye odağı içine girmesin (Haritada aç bağlantısı var)
    locMap.innerHTML = `<iframe title="Konumunuz haritada" src="${src}" loading="lazy" tabindex="-1" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  }
  if (locPlace) locPlace.textContent = loc.place || 'Konumunuz eklendi';
  const km = Math.round(loc.km);
  const area = loc.inArea === null ? '' : loc.inArea ? ' · Sahada teslim bölgemizde' : ' · Bölge dışı, kargoyla göndeririz';
  if (locMeta) locMeta.textContent = `Ostim'e yaklaşık ${km < 1 ? '1' : km.toLocaleString('tr-TR')} km${area}`;
  if (locOpen) locOpen.href = mapsLink(loc);
}
async function placeName(lat: number, lng: number) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&accept-language=tr`, { signal: ctrl.signal });
    clearTimeout(t);
    const a = (await r.json()).address ?? {};
    const ilce = a.town || a.county || a.city_district || a.district || a.suburb || '';
    const il = a.province || a.city || a.state || '';
    return { place: [a.suburb && a.suburb !== ilce ? a.suburb : '', ilce, il].filter(Boolean).join(', '), il: String(il) };
  } catch {
    return { place: '', il: '' };
  }
}
locBtn?.addEventListener('click', () => {
  if (!locMsg) return;
  if (!('geolocation' in navigator)) { locMsg.textContent = 'Tarayıcınız konum vermiyor. Adresi not kısmına yazabilirsiniz.'; return; }
  locBtn.disabled = true;
  locBtn.classList.add('is-busy');
  locMsg.textContent = 'Konumunuz alınıyor…';
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      const km = distanceKm(OSTIM, { lat, lng });
      loc = { lat, lng, acc: accuracy, place: '', km, inArea: null };
      renderLoc();
      updateSend();
      locMsg.textContent = 'Konum eklendi, yer adı aranıyor…';
      const p = await placeName(lat, lng);
      if (loc) {
        loc.place = p.place;
        loc.inArea = p.il ? AREA.some((c) => p.il.toLocaleLowerCase('tr').includes(c)) : km < 60 ? true : null;
        try { sessionStorage.setItem('aksoy-konum', JSON.stringify(loc)); } catch { /* yok say */ }
      }
      locMsg.textContent = accuracy > 500 ? `Konum yaklaşık (±${Math.round(accuracy)} m). Gerekirse adresi not kısmına ekleyin.` : '';
      renderLoc();
      updateSend();
      locBtn.disabled = false;
      locBtn.classList.remove('is-busy');
    },
    (err) => {
      locMsg.textContent = err.code === err.PERMISSION_DENIED
        ? 'Konum izni verilmedi. Sorun değil, adresi not kısmına yazabilirsiniz.'
        : 'Konum alınamadı. Adresi not kısmına yazabilirsiniz.';
      locBtn.disabled = false;
      locBtn.classList.remove('is-busy');
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
  );
});
$<HTMLButtonElement>('[data-q-loc-clear]')?.addEventListener('click', () => {
  loc = null;
  try { sessionStorage.removeItem('aksoy-konum'); } catch { /* yok say */ }
  if (locMsg) locMsg.textContent = '';
  renderLoc();
  updateSend();
  locBtn?.focus();
});
renderLoc();
document.querySelector('[data-quote-copy]')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(message());
    (window as any).__toast?.('Liste panoya kopyalandı');
  } catch {
    (window as any).__toast?.('Kopyalanamadı, metni elle seçin');
  }
});
/* Paylaşılan liste: ?liste=slug:adet,slug:adet. Usta listeyi hazırlar, satın almaya bağlantı olarak gönderir;
   bağlantıyı açan kişinin sepetine aynı ürünler eklenir. Ürün bilgisi arama dizininden okunur. */
function shareUrl() {
  const q = items.map((it) => { const b = it.brands.indexOf(it.brand) + 1; return `${it.slug}:${it.qty}${b ? `:${b}` : ''}`; }).join(',');
  return `${location.origin}/urunler?liste=${q}`;
}
document.querySelector('[data-quote-share]')?.addEventListener('click', async () => {
  const url = shareUrl();
  const text = `Teklif listesi (${items.length} ürün)`;
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: text, text, url }); return; }
    await navigator.clipboard.writeText(url);
    (window as any).__toast?.('Liste bağlantısı kopyalandı');
  } catch (err) {
    if ((err as Error)?.name !== 'AbortError') (window as any).__toast?.('Paylaşılamadı, bağlantıyı adres çubuğundan kopyalayın');
  }
});
async function importShared() {
  const params = new URLSearchParams(location.search);
  const raw = params.get('liste');
  if (!raw) return;
  params.delete('liste');
  const rest = params.toString();
  history.replaceState(history.state, '', location.pathname + (rest ? `?${rest}` : '') + location.hash);
  const want = raw.split(',').map((x) => x.split(':')).filter(([s]) => /^[a-z0-9-]{2,80}$/.test(s ?? ''))
    .slice(0, 60).map(([s, q, b]) => ({ slug: s, qty: Math.min(9999, Math.max(1, parseInt(q, 10) || 1)), b: parseInt(b, 10) || 0 }));
  if (!want.length) return;
  try {
    const idx: { s: string; c: string; n: string; d: string; h?: string; b: string[] }[] = await (await fetch('/arama.json')).json();
    let n = 0;
    for (const w of want) {
      const p = idx.find((r) => r.s === w.slug);
      if (!p) continue;
      const found = items.find((i) => i.slug === p.s);
      if (found) found.qty = clampQty(Math.max(found.qty, w.qty));
      else items.push({ slug: p.s, code: p.c, name: p.n, drawing: p.d as Drawing, shape: p.h as InsertShape | undefined, brands: p.b, brand: p.b[w.b - 1] ?? ANY_BRAND, qty: w.qty });
      n++;
    }
    if (!n) return;
    save();
    openQuote();
    (window as any).__toast?.(`Paylaşılan listeden ${n} ürün sepete eklendi`);
  } catch { /* dizin alınamadı */ }
}
importShared();

/* Ürün sayfası: ürün sepetteyse adet ve marka alanları sepetteki değerle açılır */
{
  const main = document.querySelector<HTMLElement>('[data-pdp-main]');
  const it = main && items.find((i) => i.slug === main.dataset.slug);
  const qtyIn = document.querySelector<HTMLInputElement>('#pdp-adet');
  const brandSel = document.querySelector<HTMLSelectElement>('#pdp-marka');
  if (it && qtyIn) {
    qtyIn.value = String(it.qty);
    if (brandSel && [...brandSel.options].some((o) => o.value === it.brand)) brandSel.value = it.brand;
    qtyIn.dispatchEvent(new Event('input', { bubbles: true }));
    brandSel?.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
addEventListener('keydown', (e) => {
  if (!drawer?.classList.contains('is-open') || searchOpen()) return;
  if (e.key === 'Escape') closeQuote();
  else trapTab(e, drawer);
});
addEventListener('storage', (e) => { if (e.key === KEY) { items = load(); render(); } });

render();
