// Katalog, kategori ve ürün sayfalarının istemci kodu.
// - /urunler: sunucuda basılmış ürün kartlarını süzer (hidden), adresle eşitler (?kategori=…&iso=P,M&q=…)
// - /kategori/*: alt grup sekmeleri (kaydırma takibi)
// - /urun/*: adet seçici ve mobil yapışkan teklif çubuğu

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lenis = () => (window as any).__lenis as { scrollTo: (t: number | Element, o?: object) => void } | null;
const lockScroll = (on: boolean) => (window as any).__lockScroll?.(on);

/* --------------------------------------------------------------------------
   Metin normalleştirme (search.ts ile aynı mantık: Türkçe harf duyarsız, eş anlamlılar)
   -------------------------------------------------------------------------- */
const TR: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', i̇: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
function norm(s: string) {
  return s
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]|i̇/g, (c) => TR[c] ?? c)
    .replace(/[^a-z0-9.,/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const compact = (s: string) => norm(s).replace(/[\s.,/-]+/g, '');
const SYN: [RegExp, string][] = [
  [/\belmas uc(u|lari|lar)?\b/g, 'elmas uc'],
  [/\bsert (metal|maden) uc(u|lari|lar)?\b/g, 'uc'],
  [/\b(klavuz|kalavuz|kilavuz)(u|lar|lari)?\b/g, 'kilavuz'],
  [/\bu ?matkap(lar|lari)?\b/g, 'uclu matkap'],
];
/** Arama terimleri: eş anlamlılar + basit çoğul eki atma ("matkaplar" → "matkap") */
function terms(q: string) {
  let n = norm(q);
  for (const [re, rep] of SYN) n = n.replace(re, rep);
  return n
    .split(' ')
    .filter(Boolean)
    .map((t) => (t.length > 5 ? t.replace(/(lari|leri|lar|ler)$/, '') : t));
}

/* --------------------------------------------------------------------------
   Katalog süzme
   -------------------------------------------------------------------------- */
type Facet = 'cat' | 'brand' | 'iso' | 'shape';
interface Item { el: HTMLElement; idx: number; cat: string; sub: string; brands: string[]; iso: string[]; shape: string; hay: string; head: string; code: string }
interface State { cat: string; sub: string; brand: Set<string>; iso: Set<string>; shape: Set<string>; q: string }

function initCatalog(root: HTMLElement) {
  const $ = <T extends Element = HTMLElement>(s: string, el: ParentNode = document) => el.querySelector<T>(s);
  const $$ = <T extends Element = HTMLElement>(s: string, el: ParentNode = document) => [...el.querySelectorAll<T>(s)];

  const items: Item[] = $$('[data-item]', root).map((el, idx) => ({
    el,
    idx,
    head: ` ${norm(`${el.dataset.code ?? ''} ${el.querySelector('.pcard__name')?.textContent ?? ''}`)}`,
    cat: el.dataset.cat ?? '',
    sub: el.dataset.sub ?? '',
    brands: (el.dataset.brands ?? '').split(' ').filter(Boolean),
    iso: (el.dataset.iso ?? '').split(' ').filter(Boolean),
    shape: el.dataset.shape ?? '',
    hay: ` ${norm(el.dataset.text ?? '')}`,
    code: compact(el.dataset.code ?? ''),
  }));
  const total = items.length;

  const btns = $$<HTMLButtonElement>('[data-f]');
  const valid = (f: string) => new Set(btns.filter((b) => b.dataset.f === f).map((b) => b.dataset.v ?? ''));
  const V = { cat: valid('cat'), sub: valid('sub'), brand: valid('brand'), iso: valid('iso'), shape: valid('shape') };
  const subParent: Record<string, string> = {};
  btns.filter((b) => b.dataset.f === 'sub').forEach((b) => (subParent[b.dataset.v!] = b.dataset.parent!));
  const labelOf = (f: string, v: string) => btns.find((b) => b.dataset.f === f && b.dataset.v === v)?.dataset.label ?? v;

  const input = $<HTMLInputElement>('[data-q]', root)!;
  const qClear = $<HTMLButtonElement>('[data-q-clear]', root);
  const grid = $('[data-grid]', root)!;
  const empty = $('[data-empty]', root);
  const emptyWa = $<HTMLAnchorElement>('[data-empty-wa]', root);
  const chips = $<HTMLUListElement>('[data-chips]', root)!;
  const counts = $$('[data-count]', root);
  const fcount = $('[data-fcount]', root);
  const showBtn = $<HTMLButtonElement>('[data-flt-show]', root);
  const clearBtns = $$<HTMLButtonElement>('[data-clear]', root);
  const metaClear = $<HTMLButtonElement>('.cmeta__clear', root);

  /* ---- Durum <-> adres ---- */
  const list = (s: string | null, up = false) =>
    (s ?? '').split(',').map((x) => (up ? x.trim().toUpperCase() : x.trim().toLowerCase())).filter(Boolean);
  function readUrl(): State {
    const u = new URLSearchParams(location.search);
    let cat = (u.get('kategori') ?? '').toLowerCase();
    let sub = (u.get('alt') ?? '').toLowerCase();
    if (!V.cat.has(cat)) cat = '';
    if (!V.sub.has(sub)) sub = '';
    if (sub) cat = subParent[sub] ?? cat;
    return {
      cat,
      sub,
      brand: new Set(list(u.get('marka')).filter((v) => V.brand.has(v))),
      iso: new Set(list(u.get('iso'), true).filter((v) => V.iso.has(v))),
      shape: new Set(list(u.get('sekil'), true).filter((v) => V.shape.has(v))),
      q: (u.get('q') ?? '').slice(0, 80),
    };
  }
  function writeUrl() {
    const u = new URLSearchParams();
    if (st.cat) u.set('kategori', st.cat);
    if (st.sub) u.set('alt', st.sub);
    if (st.brand.size) u.set('marka', [...st.brand].join(','));
    if (st.iso.size) u.set('iso', [...st.iso].join(','));
    if (st.shape.size) u.set('sekil', [...st.shape].join(','));
    if (st.q.trim()) u.set('q', st.q.trim());
    const qs = u.toString().replace(/%2C/g, ',');
    history.replaceState(history.state, '', `${location.pathname}${qs ? `?${qs}` : ''}`);
  }

  const st = readUrl();
  input.value = st.q;

  // Dar ekranda kısa ipucu metni
  const phLong = input.placeholder;
  const phMq = matchMedia('(max-width: 600px)');
  const setPh = () => { input.placeholder = phMq.matches ? input.dataset.phShort ?? phLong : phLong; };
  phMq.addEventListener('change', setPh);
  setPh();

  /* ---- Eşleştirme ---- */
  let qTerms: string[] = [];
  let qCompact = '';
  function setQuery(q: string) {
    st.q = q;
    qTerms = terms(q);
    qCompact = compact(q);
  }
  setQuery(st.q);

  const matchQ = (it: Item) => {
    if (!qTerms.length) return true;
    if (qCompact.length >= 2 && it.code.includes(qCompact)) return true;
    // Her terim bir kelimenin başında geçmeli: "uc" → "uç" eşleşir, "buc…" eşleşmez
    return qTerms.every((t) => it.hay.includes(` ${t}`));
  };
  /** Sorgu varken alaka sırası: kod başı > kod içi > ad/kodda tüm terimler > yalnızca anahtar kelime */
  const rank = (it: Item) =>
    (qCompact.length >= 2 && it.code.startsWith(qCompact) ? 4 : qCompact.length >= 2 && it.code.includes(qCompact) ? 3 : 0) +
    (qTerms.length && qTerms.every((t) => it.head.includes(` ${t}`)) ? 2 : 0);
  let lastOrder = items.map((i) => i.idx).join(',');
  function reorder() {
    const ranked = qTerms.length ? [...items].sort((a, b) => rank(b) - rank(a) || a.idx - b.idx) : items;
    const key = ranked.map((i) => i.idx).join(',');
    if (key === lastOrder) return;
    lastOrder = key;
    grid.append(...ranked.map((i) => i.el));
  }

  function test(it: Item, skip?: Facet) {
    if (skip !== 'cat') {
      if (st.sub && it.sub !== st.sub) return false;
      if (st.cat && it.cat !== st.cat) return false;
    }
    if (skip !== 'brand' && st.brand.size && !it.brands.some((b) => st.brand.has(b))) return false;
    if (skip !== 'iso' && st.iso.size && !it.iso.some((g) => st.iso.has(g))) return false;
    if (skip !== 'shape' && st.shape.size && !st.shape.has(it.shape)) return false;
    return matchQ(it);
  }

  const activeCount = () => (st.cat || st.sub ? 1 : 0) + st.brand.size + st.iso.size + st.shape.size;

  /* ---- Çizim ---- */
  let ready = false;
  function render() {
    let n = 0;
    for (const it of items) {
      const ok = test(it);
      if (it.el.hidden === ok) {
        // Yeniden görünen kart kısa bir girişle belirir (ilk çizimde değil)
        if (ok && ready && !reduce) it.el.classList.add('is-enter');
        it.el.hidden = !ok;
      }
      if (ok) n++;
    }

    // Her seçenek için "diğer filtreler geçerliyken" kaç ürün kalır
    const c = { cat: new Map<string, number>(), sub: new Map<string, number>(), brand: new Map<string, number>(), iso: new Map<string, number>(), shape: new Map<string, number>() };
    const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
    let catAll = 0;
    for (const it of items) {
      if (test(it, 'cat')) { catAll++; inc(c.cat, it.cat); inc(c.sub, it.sub); }
      if (test(it, 'brand')) it.brands.forEach((b) => inc(c.brand, b));
      if (test(it, 'iso')) it.iso.forEach((g) => inc(c.iso, g));
      if (it.shape && test(it, 'shape')) inc(c.shape, it.shape);
    }

    for (const b of btns) {
      const f = b.dataset.f as keyof typeof c;
      const v = b.dataset.v ?? '';
      let on = false;
      let num = 0;
      if (f === 'cat') { on = v ? st.cat === v : !st.cat; num = v ? c.cat.get(v) ?? 0 : catAll; }
      else if (f === 'sub') { on = st.sub === v; num = c.sub.get(v) ?? 0; }
      else { on = (st as any)[f].has(v); num = c[f].get(v) ?? 0; }
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('is-zero', num === 0 && !on);
      const nEl = b.querySelector('[data-n]');
      if (nEl) nEl.textContent = String(num);
    }
    $$('[data-sub-of]').forEach((ul) => { ul.hidden = ul.dataset.subOf !== st.cat; });

    reorder();
    counts.forEach((el) => (el.textContent = String(n)));
    const ac = activeCount();
    if (fcount) { fcount.textContent = String(ac); fcount.hidden = ac === 0; }
    if (showBtn) showBtn.textContent = n ? `${n} ürünü göster` : 'Sonuç yok';
    const anything = ac > 0 || !!st.q.trim();
    if (metaClear) metaClear.hidden = !anything;
    if (qClear) qClear.hidden = !input.value;

    grid.hidden = n === 0;
    if (empty) {
      empty.hidden = n !== 0;
      if (emptyWa) {
        const q = st.q.trim();
        emptyWa.href = `https://wa.me/905356101989?text=${encodeURIComponent(q ? `Merhaba, “${q}” için teklif almak istiyorum. Katalogda bulamadım.` : 'Merhaba, katalogda bulamadığım bir ürün için teklif almak istiyorum.')}`;
      }
    }
    renderChips();
    writeUrl();
  }

  function chip(label: string, remove: () => void, g?: string) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fchip';
    if (g) b.dataset.g = g;
    b.setAttribute('aria-label', `Filtreyi kaldır: ${label}`);
    const s = document.createElement('span');
    s.textContent = label;
    b.append(s);
    b.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg>');
    b.addEventListener('click', () => {
      const idx = [...chips.children].indexOf(li);
      remove();
      update(false);
      const next = chips.querySelectorAll<HTMLButtonElement>('.fchip')[idx] ?? chips.querySelector<HTMLButtonElement>('.fchip:last-of-type');
      (next ?? input).focus({ preventScroll: true });
    });
    li.append(b);
    return li;
  }
  function renderChips() {
    const out: HTMLLIElement[] = [];
    if (st.q.trim()) out.push(chip(`“${st.q.trim()}”`, () => { input.value = ''; setQuery(''); }));
    if (st.cat) out.push(chip(labelOf('cat', st.cat), () => { st.cat = ''; st.sub = ''; }));
    if (st.sub) out.push(chip(labelOf('sub', st.sub), () => { st.sub = ''; }));
    st.iso.forEach((v) => out.push(chip(labelOf('iso', v), () => st.iso.delete(v), v)));
    st.shape.forEach((v) => out.push(chip(`Şekil ${labelOf('shape', v)}`, () => st.shape.delete(v))));
    st.brand.forEach((v) => out.push(chip(labelOf('brand', v), () => st.brand.delete(v))));
    chips.replaceChildren(...out);
    chips.hidden = out.length === 0;
  }

  /** Masaüstünde liste çok aşağıdaysa sonuçların başına dön */
  const cres = $('.cres', root)!;
  function toResultsTop() {
    if (sheetOpen) return;
    const top = cres.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 68) - 12;
    if (scrollY > top + 40) {
      const l = lenis();
      if (l) l.scrollTo(top, { duration: 0.8 });
      else scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  let sheetDirty = false;
  function update(scroll = true) {
    render();
    if (sheetOpen) sheetDirty = true;
    else if (scroll) toResultsTop();
  }

  /* ---- Olaylar ---- */
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-f]');
    if (!b) return;
    const f = b.dataset.f!;
    const v = b.dataset.v ?? '';
    if (f === 'cat') {
      if (!v || st.cat === v) { st.cat = ''; st.sub = ''; }
      else { st.cat = v; st.sub = ''; }
    } else if (f === 'sub') {
      st.sub = st.sub === v ? '' : v;
      st.cat = subParent[v] ?? st.cat;
    } else {
      const set = (st as any)[f] as Set<string>;
      set.has(v) ? set.delete(v) : set.add(v);
    }
    update(!b.closest('.cquick'));
  });

  clearBtns.forEach((b) =>
    b.addEventListener('click', () => {
      st.cat = ''; st.sub = '';
      st.brand.clear(); st.iso.clear(); st.shape.clear();
      if (!b.closest('[data-flt]')) { input.value = ''; setQuery(''); }
      update(!sheetOpen);
      if (!b.closest('[data-flt]')) input.focus({ preventScroll: true });
    }),
  );

  let qTimer = 0;
  input.addEventListener('input', () => {
    clearTimeout(qTimer);
    if (qClear) qClear.hidden = !input.value;
    qTimer = window.setTimeout(() => { setQuery(input.value); render(); }, 110);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(qTimer);
      setQuery(input.value);
      render();
      if (matchMedia('(pointer: coarse)').matches) input.blur();
    } else if (e.key === 'Escape' && input.value) {
      e.stopPropagation();
      input.value = '';
      setQuery('');
      render();
    }
  });
  qClear?.addEventListener('click', () => { input.value = ''; setQuery(''); render(); input.focus(); });

  /* ---- Mobil filtre paneli (alt sayfa) ---- */
  const sheet = $<HTMLElement>('[data-flt]', root)!;
  const scrim = $<HTMLElement>('[data-flt-scrim]', root);
  const openBtn = $<HTMLButtonElement>('[data-flt-open]', root);
  const mq = matchMedia('(max-width: 960px)');
  let sheetOpen = false;
  let lastFocus: HTMLElement | null = null;

  function setSheet(open: boolean) {
    if (open === sheetOpen) return;
    sheetOpen = open;
    sheet.classList.toggle('is-open', open);
    scrim?.classList.toggle('is-open', open);
    openBtn?.setAttribute('aria-expanded', String(open));
    if (open) {
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      lastFocus = document.activeElement as HTMLElement;
      lockScroll(true);
      setTimeout(() => $<HTMLElement>('[data-flt-close]', sheet)?.focus({ preventScroll: true }), 60);
    } else {
      sheet.removeAttribute('role');
      sheet.removeAttribute('aria-modal');
      lockScroll(false);
      lastFocus?.focus?.({ preventScroll: true });
      // Panelde seçim yapıldıysa sonuçların başına dön
      if (sheetDirty) { sheetDirty = false; requestAnimationFrame(toResultsTop); }
    }
  }
  openBtn?.addEventListener('click', () => setSheet(true));
  $$('[data-flt-close]', sheet).forEach((b) => b.addEventListener('click', () => setSheet(false)));
  scrim?.addEventListener('click', () => setSheet(false));
  mq.addEventListener('change', () => { if (!mq.matches) setSheet(false); });
  addEventListener('keydown', (e) => {
    if (!sheetOpen) return;
    if (e.key === 'Escape') { setSheet(false); return; }
    if (e.key === 'Tab') {
      const f = $$<HTMLElement>('button:not([hidden]), a[href], input', sheet).filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Aşağı kaydırarak kapatma (tutamaç ve başlık)
  const head = $<HTMLElement>('.flt__head', sheet);
  let y0 = 0, dy = 0, dragging = false;
  head?.addEventListener('touchstart', (e) => { if (!sheetOpen) return; dragging = true; y0 = e.touches[0].clientY; dy = 0; sheet.style.transition = 'none'; }, { passive: true });
  head?.addEventListener('touchmove', (e) => { if (!dragging) return; dy = Math.max(0, e.touches[0].clientY - y0); sheet.style.transform = `translateY(${dy}px)`; }, { passive: true });
  head?.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    sheet.style.transition = '';
    sheet.style.transform = '';
    if (dy > 90) setSheet(false);
  });

  render();
  ready = true;
}

/* --------------------------------------------------------------------------
   Kategori sayfası: alt grup sekmeleri
   -------------------------------------------------------------------------- */
function initSubnav(nav: HTMLElement) {
  const links = [...nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  const targets = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean) as HTMLElement[];
  const track = nav.querySelector<HTMLElement>('[data-subnav-track]') ?? nav;

  function setActive(id: string) {
    links.forEach((a) => {
      const on = a.hash.slice(1) === id;
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
      if (on) {
        const r = a.offsetLeft - (track.clientWidth - a.offsetWidth) / 2;
        track.scrollTo({ left: r, behavior: reduce ? 'auto' : 'smooth' });
      }
    });
  }

  nav.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;
    const el = document.getElementById(decodeURIComponent(a.hash.slice(1)));
    if (!el) return;
    e.preventDefault();
    e.stopPropagation(); // Lenis'in kendi çapa kaydırması devreye girmesin
    const l = lenis();
    if (l) l.scrollTo(el, { duration: 1 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(history.state, '', a.hash);
    setActive(el.id);
  });

  const seen = new Map<string, boolean>();
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => seen.set(en.target.id, en.isIntersecting));
      const first = targets.find((t) => seen.get(t.id));
      if (first) setActive(first.id);
    },
    { rootMargin: '-35% 0px -55% 0px' },
  );
  targets.forEach((t) => io.observe(t));
}

/* --------------------------------------------------------------------------
   Ürün sayfası: adet seçici ve yapışkan çubuk
   -------------------------------------------------------------------------- */
function initPdp(root: HTMLElement) {
  const qty = root.querySelector<HTMLInputElement>('#pdp-adet');
  const clamp = (n: number) => Math.min(9999, Math.max(1, Math.round(n) || 1));
  root.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b) =>
    b.addEventListener('click', () => {
      if (!qty) return;
      const step = Number(b.dataset.step);
      const v = clamp(parseInt(qty.value, 10) || 1);
      // 10'un katlarına yaslan: ustalar uçları 10'lu kutu ile alır
      const big = Math.abs(step) >= 10;
      qty.value = String(clamp(big ? (step > 0 ? Math.floor(v / 10) * 10 + 10 : Math.ceil(v / 10) * 10 - 10) : v + step));
      qty.dispatchEvent(new Event('change', { bubbles: true }));
    }),
  );
  qty?.addEventListener('change', () => { qty.value = String(clamp(parseInt(qty.value, 10))); });
  qty?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); root.querySelector<HTMLButtonElement>('[data-pdp-main]')?.click(); } });

  // Kopyala: ürün kodu
  root.querySelector<HTMLButtonElement>('[data-copy-code]')?.addEventListener('click', async (e) => {
    const code = (e.currentTarget as HTMLElement).dataset.copyCode ?? '';
    try { await navigator.clipboard.writeText(code); (window as any).__toast?.(`${code} kopyalandı`); }
    catch { (window as any).__toast?.('Kopyalanamadı'); }
  });

  // Yapışkan çubuktaki özet: "20 adet · KORLOY"
  const brand = root.querySelector<HTMLSelectElement>('#pdp-marka');
  const sum = document.querySelector<HTMLElement>('[data-bar-sum]');
  const syncSum = () => { if (sum && qty) sum.textContent = `${clamp(parseInt(qty.value, 10))} adet · ${brand?.value ?? ''}`; };
  qty?.addEventListener('change', syncSum);
  qty?.addEventListener('input', syncSum);
  brand?.addEventListener('change', syncSum);
  syncSum();

  const bar = document.querySelector<HTMLElement>('[data-pdp-bar]');
  const main = root.querySelector<HTMLElement>('[data-pdp-main]');
  const footer = document.querySelector<HTMLElement>('.site-footer');
  if (!bar || !main) return;
  let mainGone = false, footVisible = false;
  const sync = () => {
    const on = mainGone && !footVisible;
    bar.classList.toggle('is-on', on);
    bar.toggleAttribute('inert', !on);
    bar.setAttribute('aria-hidden', String(!on));
    document.body.classList.toggle('has-pdp-bar', on);
  };
  new IntersectionObserver(([en]) => { mainGone = !en.isIntersecting && en.boundingClientRect.top < 0; sync(); }).observe(main);
  if (footer) new IntersectionObserver(([en]) => { footVisible = en.isIntersecting; sync(); }).observe(footer);
  sync();
}

/* -------------------------------------------------------------------------- */
const catalogRoot = document.querySelector<HTMLElement>('[data-catalog]');
if (catalogRoot) initCatalog(catalogRoot);
document.querySelectorAll<HTMLElement>('[data-subnav]').forEach(initSubnav);
const pdp = document.querySelector<HTMLElement>('[data-pdp]');
if (pdp) initPdp(pdp);
