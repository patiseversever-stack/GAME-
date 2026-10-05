// Kesme hızı hesaplayıcısı — tarayıcı tarafı. Hesap ve HTML üretimi cutting-calc.ts’te (saf, test edilir).
import { OPS, TOOL_LABEL, VC, isRange, midVc } from './cutting-data';
import type { Op, Iso, ToolMat } from './cutting-data';
import { FIELDS, compute, resultsHtml, notesHtml, suggestHtml, toSlider, fromSlider, sugAxis } from './cutting-calc';
import type { Mode, FieldDef, CalcOutput } from './cutting-calc';
import { parseNum, fmtInput, fmt } from './format';

const root = document.querySelector<HTMLElement>('[data-calc]');
if (root) init(root);

function init(root: HTMLElement) {
  const $ = <T extends Element = HTMLElement>(s: string, el: ParentNode = root) => el.querySelector<T>(s)!;
  const $$ = <T extends Element = HTMLElement>(s: string, el: ParentNode = root) => [...el.querySelectorAll<T>(s)];

  const tabs = $$<HTMLButtonElement>('[data-tab]');
  const panel = $('[data-panel]');
  const sug = $('[data-suggest]');
  const notes = $('[data-notes]');
  const live = $('[data-live]');
  const outOp = $('[data-out-op]');
  const dock = $('[data-dock]');
  const toolLabels = $$<HTMLElement>('[data-tool-label]');

  const state = {
    op: 'torna' as Op,
    iso: 'P' as Iso,
    tool: JSON.parse(root.dataset.defaultTools || '{}') as Record<Op, ToolMat>,
    mode: { torna: 'vc2n', freze: 'vc2n', delme: 'vc2n', kilavuz: 'vc2n' } as Record<Op, Mode>,
    last: null as CalcOutput | null,
  };

  const opEl = (op: Op) => $(`[data-op="${op}"]`);
  const fieldEl = (op: Op, key: string) => $(`[data-field="${key}"]`, opEl(op));
  const def = (op: Op, key: string) => FIELDS[op].find((f) => f.key === key)!;
  const inputOf = (op: Op, key: string) => $<HTMLInputElement>('[data-input]', fieldEl(op, key));
  const rangeOf = (op: Op, key: string) => fieldEl(op, key).querySelector<HTMLInputElement>('[data-range]');

  /* ---------------- değerler */
  function readValues(op: Op): Record<string, number> {
    const v: Record<string, number> = {};
    for (const f of FIELDS[op]) {
      const raw = inputOf(op, f.key).value;
      if (f.optional && raw.trim() === '') continue;
      v[f.key] = parseNum(raw);
    }
    return v;
  }

  function setValue(op: Op, key: string, value: number, fromRange = false) {
    const inp = inputOf(op, key);
    if (!fromRange) syncRange(op, def(op, key), value);
    inp.value = fmtInput(value, def(op, key).int ? 0 : 3);
  }

  function syncRange(op: Op, f: FieldDef, value: number) {
    const r = rangeOf(op, f.key);
    if (!r || !Number.isFinite(value) || value <= 0) return;
    const s = toSlider(f, value);
    r.value = String(s);
    r.style.setProperty('--p', `${s / 10}%`);
    r.setAttribute('aria-valuetext', `${fmt(value)} ${f.unit}`);
  }

  /* ---------------- öneri */
  function currentVc(): number {
    const out = state.last;
    if (state.mode[state.op] === 'vc2n') return parseNum(inputOf(state.op, 'vc').value);
    return out ? out.results[0].value : NaN;
  }

  function renderSuggest() {
    sug.innerHTML = suggestHtml(state.op, state.tool[state.op], state.iso);
    updateMarker();
  }

  function updateMarker() {
    const bar = sug.querySelector<HTMLElement>('.calc-sug__bar');
    const status = sug.querySelector<HTMLElement>('[data-sug-status]');
    if (!bar || !status) return;
    const min = Number(bar.dataset.min), max = Number(bar.dataset.max), hi = sugAxis(max);
    const vc = currentVc();
    const marker = bar.querySelector<HTMLElement>('[data-marker]')!;
    if (!(vc > 0)) {
      marker.hidden = true;
      status.textContent = '';
      return;
    }
    marker.hidden = false;
    bar.style.setProperty('--m', `${Math.min(100, (vc / hi) * 100).toFixed(2)}%`);
    const where = vc < min ? 'below' : vc > max ? 'above' : 'in';
    status.dataset.where = where;
    status.textContent = `Şu an ${fmt(vc)} m/dk · ${where === 'in' ? 'aralıkta' : where === 'below' ? 'aralığın altında' : 'aralığın üstünde'}`;
  }

  /** Seçilen malzeme/takım için orta değeri Vc alanına yazar. */
  function applySuggestion(op: Op) {
    const cell = VC[op][state.tool[op]][state.iso];
    if (!isRange(cell)) return;
    setValue(op, 'vc', midVc(cell));
  }

  /* ---------------- hesap */
  function update(announce = false) {
    const op = state.op;
    const mode = state.mode[op];
    const out = compute(op, mode, readValues(op));
    state.last = out;

    // alan hataları
    for (const f of FIELDS[op]) {
      const el = fieldEl(op, f.key);
      const msg = $('[data-msg]', el);
      const err = out.errors[f.key];
      el.toggleAttribute('data-invalid', !!err && !el.hidden);
      inputOf(op, f.key).setAttribute('aria-invalid', err ? 'true' : 'false');
      msg.textContent = err && !el.hidden ? err : '';
    }
    $(`[data-res="${op}"]`).innerHTML = resultsHtml(out);
    notes.innerHTML = notesHtml(out);
    updateMarker();

    // mobil özet şeridi
    const p = out.results[0];
    const s = out.results[1];
    $('[data-dock-k]').textContent = p.sym;
    $('[data-dock-v]').textContent = p.text;
    $('[data-dock-u]').textContent = p.unit;
    $('[data-dock-s]').textContent = s ? `${s.sym} ${s.text} ${s.unit}` : '';

    if (announce) {
      live.textContent = out.results
        .filter((r) => r.text !== '—')
        .map((r) => `${r.label} ${r.text} ${r.unit}`)
        .join(', ');
    }
  }

  /* ---------------- işlem sekmeleri */
  const hashFor: Record<Op, string> = { torna: 'tornalama', freze: 'frezeleme', delme: 'delme', kilavuz: 'kilavuz' };
  function setOp(op: Op, focus = false, writeHash = true) {
    state.op = op;
    tabs.forEach((t) => {
      const on = t.dataset.tab === op;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    panel.setAttribute('aria-labelledby', `tab-${op}`);
    OPS.forEach((o) => {
      opEl(o.id).hidden = o.id !== op;
      $(`[data-res="${o.id}"]`).hidden = o.id !== op;
    });
    outOp.textContent = OPS.find((o) => o.id === op)!.label;
    // takım malzemesi etiketleri ve seçimi
    toolLabels.forEach((l) => (l.textContent = TOOL_LABEL[op][l.dataset.toolLabel as ToolMat]));
    $$<HTMLInputElement>('[data-tool]').forEach((i) => (i.checked = i.value === state.tool[op]));
    renderSuggest();
    update();
    if (writeHash) history.replaceState(null, '', `${location.pathname}${location.search}#${hashFor[op]}`);
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => setOp(t.dataset.tab as Op));
    t.addEventListener('keydown', (e) => {
      const k = e.key;
      let j = -1;
      if (k === 'ArrowRight') j = (i + 1) % tabs.length;
      else if (k === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      else if (k === 'Home') j = 0;
      else if (k === 'End') j = tabs.length - 1;
      if (j >= 0) {
        e.preventDefault();
        setOp(tabs[j].dataset.tab as Op, true);
      }
    });
  });

  /* ---------------- malzeme ve takım */
  $$<HTMLInputElement>('[data-iso]').forEach((r) =>
    r.addEventListener('change', () => {
      state.iso = r.value as Iso;
      // Malzeme tüm işlemler için ortak: her sekmenin Vc’sine yeni başlangıç değeri yazılır.
      OPS.forEach((o) => applySuggestion(o.id));
      renderSuggest();
      update(true);
    }),
  );
  $$<HTMLInputElement>('[data-tool]').forEach((r) =>
    r.addEventListener('change', () => {
      state.tool[state.op] = r.value as ToolMat;
      applySuggestion(state.op);
      renderSuggest();
      update(true);
    }),
  );
  sug.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-apply]');
    if (!b) return;
    if (state.mode[state.op] === 'n2vc') setMode(state.op, 'vc2n');
    setValue(state.op, 'vc', Number(b.dataset.apply));
    update(true);
  });

  /* ---------------- hesap yönü */
  function setMode(op: Op, mode: Mode) {
    const prev = state.mode[op];
    if (prev === mode) return;
    // Geçişte karşı alanı mevcut sonuçla doldur: kullanıcı kaldığı yerden devam eder.
    const out = compute(op, prev, readValues(op));
    if (mode === 'n2vc' && out.nEff > 0) setValue(op, 'n', Math.round(out.nEff));
    if (mode === 'vc2n' && out.results[0].value > 0) setValue(op, 'vc', Math.round(out.results[0].value));
    state.mode[op] = mode;
    $$<HTMLInputElement>('[data-mode]', opEl(op)).forEach((i) => (i.checked = i.value === mode));
    $$<HTMLElement>('[data-mode-only]', opEl(op)).forEach((el) => (el.hidden = el.dataset.modeOnly !== mode));
  }
  OPS.forEach((o) =>
    $$<HTMLInputElement>('[data-mode]', opEl(o.id)).forEach((r) =>
      r.addEventListener('change', () => {
        setMode(o.id, r.value as Mode);
        update(true);
      }),
    ),
  );

  /* ---------------- alanlar */
  OPS.forEach((o) =>
    FIELDS[o.id].forEach((f) => {
      const inp = inputOf(o.id, f.key);
      const rng = rangeOf(o.id, f.key);
      inp.addEventListener('input', () => {
        const v = parseNum(inp.value);
        if (v > 0) syncRange(o.id, f, v);
        if (o.id === 'kilavuz' && (f.key === 'd' || f.key === 'p')) syncTapChips();
        update();
      });
      inp.addEventListener('change', () => {
        const v = parseNum(inp.value);
        if (Number.isFinite(v) && v > 0) inp.value = fmtInput(v, f.int ? 0 : 3);
        update(true);
      });
      // Enter: odaktan çıkmadan biçimle
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') inp.dispatchEvent(new Event('change'));
      });
      if (rng) {
        rng.addEventListener('input', () => {
          const v = fromSlider(f, Number(rng.value));
          rng.style.setProperty('--p', `${Number(rng.value) / 10}%`);
          rng.setAttribute('aria-valuetext', `${fmt(v)} ${f.unit}`);
          setValue(o.id, f.key, v, true);
          if (o.id === 'kilavuz' && (f.key === 'd' || f.key === 'p')) syncTapChips();
          update();
        });
        rng.addEventListener('change', () => update(true));
      }
    }),
  );

  /* ---------------- kılavuz hızlı seçim */
  const tapChips = $$<HTMLButtonElement>('[data-tap-sizes] [data-d]');
  function syncTapChips() {
    const d = parseNum(inputOf('kilavuz', 'd').value);
    const p = parseNum(inputOf('kilavuz', 'p').value);
    tapChips.forEach((c) => c.setAttribute('aria-pressed', String(Number(c.dataset.d) === d && Number(c.dataset.p) === p)));
  }
  tapChips.forEach((c) =>
    c.addEventListener('click', () => {
      setValue('kilavuz', 'd', Number(c.dataset.d));
      setValue('kilavuz', 'p', Number(c.dataset.p));
      syncTapChips();
      update(true);
    }),
  );

  /* ---------------- mobil özet şeridi: sonuçlar görünürken gizle */
  const outWrap = $('[data-out-wrap]');
  if ('IntersectionObserver' in window) {
    let inputsVisible = false;
    let outVisible = false;
    const sync = () => dock.toggleAttribute('data-hidden', outVisible || !inputsVisible);
    new IntersectionObserver(([e]) => { outVisible = e.isIntersecting; sync(); }, { threshold: 0.15 }).observe(outWrap);
    new IntersectionObserver(([e]) => { inputsVisible = e.isIntersecting; sync(); }, { rootMargin: '-30% 0px 0px 0px' }).observe($('.calc-in'));
  }

  /* ---------------- adres: #kilavuz, ?d=10&p=1.5 */
  const fromHash = (Object.entries(hashFor).find(([, h]) => `#${h}` === location.hash)?.[0] ?? null) as Op | null;
  const q = new URLSearchParams(location.search);
  const qd = parseNum(q.get('d') ?? ''), qp = parseNum(q.get('p') ?? '');
  if (qd > 0 && qd <= 64) setValue('kilavuz', 'd', qd);
  if (qp > 0 && qp <= 6) setValue('kilavuz', 'p', qp);
  syncTapChips();
  setOp(fromHash ?? 'torna', false, false);
}
