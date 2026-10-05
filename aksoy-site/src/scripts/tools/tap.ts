// Kılavuz matkap çapı — hesaplayıcı ve aranabilir tablo (tarayıcı tarafı).
import { minorDia, cutDrill, formDrill, suggestDrill, isStandard, pitchesFor } from './tap-data';
import { parseNum, fmtFixed, fmtInput } from './format';

const root = document.querySelector<HTMLElement>('[data-tap]');
if (root) initCalc(root);
initTable();

function initCalc(root: HTMLElement) {
  const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const inD = $<HTMLInputElement>('#tap-d');
  const inP = $<HTMLInputElement>('#tap-p');
  const sizeChips = [...root.querySelectorAll<HTMLButtonElement>('[data-sizes] [data-d]')];
  const pitchHost = $('[data-pitches]');
  const std = $('[data-std]');
  const notes = $('[data-notes]');
  const nameEl = $('[data-name]');
  const speed = $<HTMLAnchorElement>('[data-speed-link]');
  const wa = $<HTMLAnchorElement>('[data-tap-wa]');
  const live = $('[data-live]');
  const waNumber = (wa.href.match(/wa\.me\/(\d+)/) ?? [])[1] ?? '';
  const res = (k: string) => $(`[data-res="${k}"]`);
  const f2 = (x: number) => fmtFixed(x, 2);
  const f3 = (x: number) => fmtFixed(x, 3);
  let pitchesForD = NaN;

  function setErr(key: 'd' | 'p', msg: string) {
    const el = $(`[data-field="${key}"]`);
    el.toggleAttribute('data-invalid', !!msg);
    el.querySelector('[data-msg]')!.textContent = msg;
    (key === 'd' ? inD : inP).setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function renderPitches(d: number) {
    if (d === pitchesForD) return;
    pitchesForD = d;
    const list = Number.isFinite(d) ? pitchesFor(d) : [];
    pitchHost.innerHTML = list.length
      ? list.map((x) => `<button type="button" class="tl-chip" data-p="${x.p}" aria-pressed="false">${f2(x.p)}${x.coarse ? '<small>kaba</small>' : ''}</button>`).join('')
      : '<span class="calc-hint">Bu çap için standart hatve listesi yok; hatveyi elle girin.</span>';
  }

  function update(announce = false) {
    const d = parseNum(inD.value);
    const p = parseNum(inP.value);
    let ok = true;
    if (!(d > 0)) { setErr('d', Number.isNaN(d) ? 'Bir sayı girin (ör. 10).' : 'Çap sıfırdan büyük olmalı.'); ok = false; }
    else if (d > 300) { setErr('d', 'Bu araç 300 mm’ye kadar çaplar içindir.'); ok = false; }
    else setErr('d', '');
    if (!(p > 0)) { setErr('p', Number.isNaN(p) ? 'Bir sayı girin (ör. 1,5).' : 'Hatve sıfırdan büyük olmalı.'); ok = false; }
    else if (d > 0 && p >= d / 3) { setErr('p', 'Hatve bu çap için çok büyük; değerleri kontrol edin.'); ok = false; }
    else setErr('p', '');

    renderPitches(d);
    sizeChips.forEach((c) => c.setAttribute('aria-pressed', String(Number(c.dataset.d) === d)));
    pitchHost.querySelectorAll<HTMLButtonElement>('[data-p]').forEach((c) => c.setAttribute('aria-pressed', String(Number(c.dataset.p) === p)));

    const set = (k: string, v: string, f: string) => {
      const el = res(k);
      el.toggleAttribute('data-empty', v === '—');
      el.querySelector('[data-v]')!.textContent = v;
      el.querySelector('[data-f]')!.textContent = f;
    };

    if (!ok) {
      set('drill', '—', 'Matkap Ø ≈ D − P');
      set('minor', '—', 'D1 min = D − 1,0825 × P');
      set('form', '—', '≈ D − 0,45 × P');
      nameEl.textContent = '—';
      std.hidden = true;
      notes.innerHTML = '<p class="tl-note tl-note--error">Kırmızı işaretli alanı düzeltin.</p>';
      markRow(NaN, NaN);
      // Bağlantılar eski (geçerli) değerleri taşımasın
      speed.href = '/teknik-araclar/kesme-hizi-hesaplama#kilavuz';
      if (waNumber) wa.href = `https://wa.me/${waNumber}?text=${encodeURIComponent('Merhaba Aksoy Kesici Takımlar, kılavuz ve matkap için teklif almak istiyorum.')}`;
      return;
    }

    const kind = isStandard(d, p);
    const nm = `M${fmtFixed(d, 1)} × ${f2(p)}`;
    nameEl.textContent = nm;
    const cut = cutDrill(d, p);
    const sug = suggestDrill(d, p);
    const md = minorDia(d, p);
    const tail = sug.fromTable ? 'standart tablo değeri' : 'D − P’ye en yakın 0,1 mm adım (6H içinde)';
    set('drill', f2(sug.drill), Math.abs(sug.drill - cut) < 1e-9
      ? `D − P = ${fmtFixed(d, 2)} − ${f2(p)} = ${f2(cut)} mm · ${tail}`
      : `D − P = ${fmtFixed(d, 2)} − ${f2(p)} = ${f2(cut)} mm → ${f2(sug.drill)} mm · ${tail}`);
    set('minor', md.max !== null ? `${f3(md.min)}–${f3(md.max)}` : `≥ ${f3(md.min)}`,
      md.max !== null ? `D1 min = D − 1,0825 × P = ${f3(md.min)} · maks = min + TD1(6H)` : 'D1 min = D − 1,0825 × P · bu hatve için TD1 tablosu yok');
    set('form', `≈ ${f2(formDrill(d, p))}`, `≈ D − 0,45 × P = ${fmtFixed(d, 2)} − 0,45 × ${f2(p)} · üretici tablosu esastır`);

    std.hidden = false;
    std.dataset.kind = kind;
    std.innerHTML =
      kind === 'coarse' ? `<b>M${fmtFixed(d, 1)}</b> — ISO metrik kaba diş, hatve ${f2(p)} mm.`
      : kind === 'fine' ? `<b>${nm}</b> — ISO metrik ince diş.`
      : kind === 'other' ? `${nm} standart ISO metrik hatvelerden biri değil. Hatveyi kontrol edin.`
      : `M${fmtFixed(d, 1)} için standart hatve listesi bu araçta yok; hesap yine de D − P kuralıyla yapıldı.`;
    notes.innerHTML = '';

    speed.href = `/teknik-araclar/kesme-hizi-hesaplama?d=${d}&p=${p}#kilavuz`;
    if (waNumber) {
      const txt = `Merhaba Aksoy Kesici Takımlar, ${kind === 'coarse' ? `M${fmtFixed(d, 1)}` : nm} kılavuz ve ${f2(sug.drill)} mm matkap için teklif almak istiyorum.`;
      wa.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(txt)}`;
    }
    markRow(d, p);
    if (announce) live.textContent = `${nm}: matkap ${f2(sug.drill)} milimetre.`;
  }

  // Kullanıcının kendi seçtiği hatve: çap yazılırken ("1" → "12") ara değerler yüzünden kaybolmasın
  let userP = parseNum(inP.value);
  inD.addEventListener('input', () => {
    const d = parseNum(inD.value);
    // Çap standartsa: seçilen hatve o çapa uyuyorsa korunur, uymuyorsa kaba hatve önerilir.
    const list = d > 0 ? pitchesFor(d) : [];
    const p = parseNum(inP.value);
    if (list.length) {
      if (list.some((x) => x.p === userP)) inP.value = fmtInput(userP);
      else if (!list.some((x) => x.p === p)) inP.value = fmtInput(list[0].p);
    }
    update();
  });
  inP.addEventListener('input', () => { userP = parseNum(inP.value); update(); });
  for (const inp of [inD, inP]) {
    inp.addEventListener('change', () => {
      const v = parseNum(inp.value);
      if (v > 0) inp.value = fmtInput(v);
      update(true);
    });
  }
  sizeChips.forEach((c) =>
    c.addEventListener('click', () => {
      const d = Number(c.dataset.d);
      inD.value = fmtInput(d);
      inP.value = fmtInput(pitchesFor(d)[0].p);
      userP = pitchesFor(d)[0].p;
      update(true);
    }),
  );
  pitchHost.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-p]');
    if (!b) return;
    inP.value = fmtInput(Number(b.dataset.p));
    userP = Number(b.dataset.p);
    update(true);
  });
  update();
}

function markRow(d: number, p: number) {
  document.querySelectorAll<HTMLTableRowElement>('[data-tap-rows] tr').forEach((tr) =>
    tr.classList.toggle('is-current', Number(tr.dataset.d) === d && Number(tr.dataset.p) === p),
  );
}

function initTable() {
  const search = document.querySelector<HTMLInputElement>('[data-tap-search]');
  const rows = [...document.querySelectorAll<HTMLTableRowElement>('[data-tap-rows] tr')];
  const count = document.querySelector<HTMLElement>('[data-tap-count]');
  const empty = document.querySelector<HTMLElement>('[data-tap-empty]');
  const kinds = [...document.querySelectorAll<HTMLButtonElement>('[data-kind]')].filter((b) => b.tagName === 'BUTTON');
  if (!search || !rows.length) return;
  let kind = 'all';
  const norm = (s: string) => s.toLocaleLowerCase('tr').replace(/\s+/g, '').replace(/,/g, '.').replace(/[×*]/g, 'x');
  function apply() {
    const q = norm(search!.value);
    let n = 0;
    for (const tr of rows) {
      const tokens = (tr.dataset.key || '').split(' ');
      const show = (kind === 'all' || tr.dataset.kind === kind) && (!q || tokens.some((t) => t.startsWith(q)));
      tr.hidden = !show;
      if (show) n++;
    }
    if (count) count.textContent = `${n} satır`;
    if (empty) empty.hidden = n > 0;
  }
  search.addEventListener('input', apply);
  kinds.forEach((b) =>
    b.addEventListener('click', () => {
      kind = b.dataset.kind || 'all';
      kinds.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      apply();
    }),
  );
}
