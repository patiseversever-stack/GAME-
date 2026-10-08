// Photo Mode UI: sim frozen, HUD hidden. Tool rail (Görüş, Yatış, Pozlama, Odak, Diyafram, Filtre, Gren),
// one active control, frame/logo/hide-UI toggles, shutter (save via bridge). Postcard frame caption in Playfair.
import { h, ic } from '../dom.ts';
import { t, tk, fmtDate, fmtDec, upper } from '../i18n.ts';
import { PHOTO_FILTERS } from '../content.ts';
import type { PhotoParams, PhotoProps } from '../types.ts';
import type { ScreenDef } from './screen.ts';
import { eyebrow } from './common.ts';

type Tool = 'fov' | 'roll' | 'exposure' | 'focus' | 'aperture' | 'filter' | 'grain';
const TOOLS: { id: Tool; icon: string }[] = [
  { id: 'fov', icon: 'fov' },
  { id: 'roll', icon: 'roll' },
  { id: 'exposure', icon: 'exposure' },
  { id: 'focus', icon: 'focus' },
  { id: 'aperture', icon: 'aperture' },
  { id: 'filter', icon: 'filter' },
  { id: 'grain', icon: 'grain' },
];
const RANGE: Record<Exclude<Tool, 'filter'>, [number, number, number]> = {
  fov: [20, 90, 1],
  roll: [-15, 15, 0.5],
  exposure: [-2, 2, 0.1],
  focus: [0, 1, 0.01],
  aperture: [0, 1, 0.01],
  grain: [0, 1, 0.01],
};
/** Aperture 0..1 → f-number (f/16 … f/1.4). */
export function apertureF(v: number): number {
  return 16 * Math.pow(1.4 / 16, v);
}
function fmtTool(tool: Exclude<Tool, 'filter'>, v: number): string {
  switch (tool) {
    case 'fov': return `${Math.round(v)}°`;
    case 'roll': return `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmtDec(Math.abs(v), 1)}°`;
    case 'exposure': return `${v > 0 ? '+' : v < 0 ? '−' : '±'}${fmtDec(Math.abs(v), 1)} EV`;
    case 'focus': return `${Math.round(2 + v * v * 118)} m`;
    case 'aperture': return `f/${fmtDec(apertureF(v), 1)}`;
    case 'grain': return `${Math.round(v * 100)}`;
  }
}
const FILTER_TINT: Record<string, string> = {
  natural: 'linear-gradient(135deg,#8FB7D9,#E9D8B4)',
  golden: 'linear-gradient(135deg,#F2A541,#F6E1B0)',
  documentary: 'linear-gradient(135deg,#6E7B6A,#C9C1A8)',
  postcard: 'linear-gradient(135deg,#2EC4C6,#F2795C)',
  coldMorning: 'linear-gradient(135deg,#9FD3F0,#5B6E8C)',
  bw: 'linear-gradient(135deg,#1A1A1A,#E8E8E8)',
};

interface PhotoState extends PhotoProps {
  _tool?: Tool;
  _hidden?: boolean;
}

export const photoScreen: ScreenDef<PhotoState> = {
  layer: 'overlay',
  onBack(_p, ctx) {
    ctx.cb.onPhotoExit?.();
  },
  render(p, ctx) {
    const tool: Tool = p._tool ?? 'fov';
    const params = p.params;
    const set = (patch: Partial<PhotoParams>, rerender = true): void => {
      const next = { ...params, ...patch };
      ctx.cb.onPhotoChange?.(next);
      if (rerender) ctx.rerender({ ...p, params: next });
      else p.params = next;
    };
    const root = h('section', { class: `kn-photo ${p._hidden ? 'is-hidden' : ''}`.trim() });

    // Frame overlay (what the saved image will carry).
    if (params.frame || params.logo) {
      const caption = p.postcard ? tk(`pc.${p.postcard.id}`) : p.world ? tk(`world.${p.world}`) : '';
      root.appendChild(
        h(
          'div',
          { class: `kn-photo-frame ${params.frame ? 'has-frame' : ''}`.trim() },
          params.frame ? h('div', { class: 'kn-photo-cap' }, h('span', { class: 'kn-serif kn-photo-place', text: caption }), p.date ? h('span', { class: 'kn-eyebrow', text: upper(fmtDate(p.date.y, p.date.m, p.date.d)) }) : null) : null,
          params.logo ? h('span', { class: 'kn-wordmark kn-wordmark--xs kn-photo-logo', text: t('app.name') }) : null,
        ),
      );
    }

    if (p._hidden) {
      const tap = h('button', { class: 'kn-photo-reveal', type: 'button', 'aria-label': t('photo.tapToShow') }, h('span', { class: 'kn-chip', text: t('photo.tapToShow') }));
      tap.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.rerender({ ...p, _hidden: false });
      });
      root.appendChild(tap);
      return root;
    }

    const iconToggle = (name: string, label: string, on: boolean, fn: () => void): HTMLButtonElement => {
      const b = h('button', { class: `kn-btn kn-btn--icon kn-photo-tg ${on ? 'is-on' : ''}`.trim(), type: 'button', 'aria-label': label, 'aria-pressed': String(on) }, ic(name));
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.sound('toggle');
        fn();
      });
      return b;
    };
    const close = h('button', { class: 'kn-btn kn-btn--icon', type: 'button', 'aria-label': t('common.close') }, ic('close'));
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      ctx.back();
    });
    const top = h(
      'header',
      { class: 'kn-photo-top' },
      close,
      eyebrow(t('photo.title'), 'kn-photo-title'),
      h(
        'div',
        { class: 'kn-photo-toggles' },
        iconToggle('frame', t('photo.frame'), params.frame, () => set({ frame: !params.frame })),
        iconToggle('sparkle', t('photo.logo'), params.logo, () => set({ logo: !params.logo })),
        iconToggle('eyeOff', t('photo.hideUi'), false, () => ctx.rerender({ ...p, _hidden: true })),
      ),
    );

    const rail = h('div', { class: 'kn-photo-rail kn-hscroll', role: 'tablist' });
    for (const tl of TOOLS) {
      const b = h('button', { class: `kn-photo-tool ${tl.id === tool ? 'is-on' : ''}`.trim(), type: 'button', role: 'tab', 'aria-pressed': String(tl.id === tool) }, ic(tl.icon), h('span', { text: t(`photo.${tl.id}` as 'photo.fov') }));
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.rerender({ ...p, _tool: tl.id });
      });
      rail.appendChild(b);
    }

    let control: HTMLElement;
    if (tool === 'filter') {
      control = h('div', { class: 'kn-photo-filters kn-hscroll' });
      for (const f of PHOTO_FILTERS) {
        const lock = p.lockedFilters?.find((x) => x.id === f);
        const b = h('button', { class: `kn-filter ${f === params.filter ? 'is-on' : ''} ${lock ? 'is-locked' : ''}`.trim(), type: 'button', 'aria-pressed': String(f === params.filter), disabled: !!lock }, h('i', { style: `background:${FILTER_TINT[f]}` }, lock ? ic('lock') : null), h('span', { text: lock ? t('photo.filterLocked', { n: lock.postcards }) : t(`filter.${f}` as 'filter.natural') }));
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!lock) set({ filter: f });
        });
        control.appendChild(b);
      }
    } else {
      const [min, max, step] = RANGE[tool];
      const v = params[tool];
      const out = h('span', { class: 'kn-photo-val kn-display-600 kn-num', text: fmtTool(tool, v) });
      const input = h('input', { class: 'kn-range', type: 'range', min: String(min), max: String(max), step: String(step), value: String(v), 'aria-label': t(`photo.${tool}` as 'photo.fov') });
      const fill = (x: number): void => input.style.setProperty('--kn-fill', `${(((x - min) / (max - min)) * 100).toFixed(1)}%`);
      fill(v);
      input.addEventListener('input', () => {
        const x = Number(input.value);
        out.textContent = fmtTool(tool, x);
        fill(x);
        set({ [tool]: x } as Partial<PhotoParams>, false);
      });
      control = h('div', { class: 'kn-photo-slider' }, h('div', { class: 'kn-row' }, eyebrow(t(`photo.${tool}` as 'photo.fov')), h('span', { class: 'kn-grow' }), out), input);
    }

    const shutter = h('button', { class: 'kn-shutter', type: 'button', 'aria-label': t('photo.save') }, h('i'));
    shutter.addEventListener('click', (e) => {
      e.stopPropagation();
      ctx.sound('photo');
      ctx.cb.onPhotoSave?.();
      ctx.toast(t('photo.saved'), { icon: 'save', ms: 2200 });
    });

    const found = p.postcard ? h('div', { class: 'kn-photo-found kn-chip kn-chip--pos' }, ic('postcard'), h('span', { text: `${t('photo.postcardFound')} · ${tk(`pc.${p.postcard.id}`)}` })) : null;
    root.append(top, found ?? '', h('div', { class: 'kn-photo-panel kn-panel' }, rail, h('div', { class: 'kn-photo-ctl' }, control, shutter)));
    return root;
  },
};
