// Kesme hızı hesaplayıcısının canlı 3D simülasyonu: hesaplayıcının yaydığı değerleri sahneye
// ve göstergelere taşır. Sahne (three.js) yalnızca bölüm ekrana yaklaşınca yüklenir.
import { fmt } from '../tools/format';
import { ISO_GROUPS } from '../tools/cutting-data';
import type { Op, Iso } from '../tools/cutting-data';
import type { SimApi, SimInput } from './sim';
import { canUse3D } from '../gl';

interface CalcDetail {
  op: Op; iso: Iso; v: Record<string, number>; nEff: number; vcEff: number; vf: number; range: [number, number] | null;
}

const stage = document.querySelector<HTMLElement>('[data-sim]');
const calc = document.querySelector<HTMLElement>('[data-calc]');
if (stage && calc) init(stage, calc);


/** Talaşın ve kesmenin durumu: ustanın tezgâh başında gördüğü şey */
function statusOf(d: CalcDetail, zone: SimInput['zone']): [string, string] {
  const sync = d.op === 'kilavuz' ? ' Senkron: her turda bir hatve iner.' : '';
  if (zone === 'none') return ['warn', 'Bu takım malzemesi bu grup için önerilmez; katalog değerine bakın.'];
  if (zone === 'above') {
    if (d.iso === 'N') return ['hot', 'Vc aralığın üstünde: talaş uca yapışabilir, uç ömrü kısalır.' + sync];
    return ['hot', 'Vc aralığın üstünde: talaş maviye döner, uç fazla ısınır ve çabuk aşınır.' + sync];
  }
  if (zone === 'below') {
    if (d.iso === 'N') return ['cold', 'Vc aralığın altında: alüminyum uca sıvanır (yığıntı talaş), yüzey matlaşır.' + sync];
    return ['cold', 'Vc aralığın altında: yığıntı talaş oluşabilir, yüzey bozulur, verim düşer.' + sync];
  }
  const ok: Record<Iso, string> = {
    P: 'Talaş saman sarısı, kısa ve kıvrık: kesme dengeli.',
    M: 'Uzun, sünek talaş: ilerlemeyi fazla düşürmeyin, yoksa yüzey pekleşir.',
    K: 'Kırık talaş ve grafit tozu: dökümde normal.',
    N: 'Uzun parlak talaş: alüminyumda yüksek hız uygun.',
    S: 'Kısa ve sıcak talaş: ısı uçta toplanır, bol soğutma şart.',
    H: 'Kızgın, kıvılcımlı talaş: sert işlemede normal.',
  };
  return ['ok', ok[d.iso] + sync];
}

function init(stage: HTMLElement, calc: HTMLElement) {
  if (!canUse3D()) { stage.hidden = true; return; }
  // Yerleşim: masaüstünde sonuç sütununun tepesinde; mobilde sonuç sayılarının hemen altında
  // (ekrana yapışmaz, girişlerin üstüne binmez)
  const sticky = calc.querySelector<HTMLElement>('.calc-out__sticky');
  const notes = calc.querySelector<HTMLElement>('[data-notes]');
  const mq = matchMedia('(max-width: 960px)');
  const place = () => {
    if (mq.matches) notes?.before(stage);
    else sticky?.prepend(stage);
  };
  place();
  mq.addEventListener('change', place);

  const $ = (s: string) => stage.querySelector<HTMLElement>(s);
  const hud = { n: $('[data-sim-n]'), vc: $('[data-sim-vc]'), vf: $('[data-sim-vf]'), mat: $('[data-sim-mat]'), st: $('[data-sim-status]'), stT: $('[data-sim-status-t]') };
  const pauseBtn = $('[data-sim-pause]');

  let api: SimApi | null = null;
  let last: CalcDetail | null = (calc as HTMLElement & { calcLast?: CalcDetail }).calcLast ?? null;

  function toInput(d: CalcDetail): SimInput {
    const vc = d.vcEff;
    let zone: SimInput['zone'] = 'in';
    let vcRel = 1;
    if (!d.range) zone = 'none';
    else {
      const [min, max] = d.range;
      vcRel = vc / ((min + max) / 2);
      zone = vc < min ? 'below' : vc > max ? 'above' : 'in';
    }
    return { op: d.op, iso: d.iso, d: d.v.d, n: d.nEff, vc, vf: d.vf, fn: d.v.fn, fz: d.v.fz, z: d.v.z, ap: d.v.ap, ae: d.v.ae, p: d.v.p, vcRel, zone };
  }
  function render(d: CalcDetail) {
    const inp = toInput(d);
    if (hud.n) hud.n.textContent = fmt(d.nEff);
    if (hud.vc) hud.vc.textContent = fmt(d.vcEff);
    if (hud.vf) hud.vf.textContent = fmt(d.vf);
    const g = ISO_GROUPS.find((x) => x.g === d.iso);
    if (hud.mat && g) hud.mat.textContent = `${g.g} · ${g.name}`;
    const [z, t] = statusOf(d, inp.zone);
    if (hud.st) hud.st.dataset.zone = z;
    if (hud.stT) hud.stT.textContent = t;
    api?.set(inp);
  }
  calc.addEventListener('calc:update', (e) => {
    last = (e as CustomEvent<CalcDetail>).detail;
    render(last);
  });
  if (last) render(last);

  pauseBtn?.addEventListener('click', () => {
    const on = pauseBtn.getAttribute('aria-pressed') !== 'true';
    pauseBtn.setAttribute('aria-pressed', String(on));
    pauseBtn.setAttribute('aria-label', on ? 'Simülasyonu oynat' : 'Simülasyonu duraklat');
    api?.pause(on);
  });

  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    import('./sim').then((m) => {
      api = m.startSim(stage);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) pauseBtn?.setAttribute('aria-pressed', 'true');
      if (last) api.set(toInput(last));
      stage.classList.add('is-live');
    }).catch(() => { stage.hidden = true; });
  }, { rootMargin: '400px 0px' });
  io.observe(stage);
}
