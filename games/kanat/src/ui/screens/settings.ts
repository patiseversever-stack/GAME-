// Settings. Common core block (identical structure across the 3 games): Grafik, FPS, Ultra 120 Hz, volumes,
// titreşim, dil, hareketi azalt, sol el modu. Then the KANAT block. About: reality line, credits, version
// label (5 taps → callbacks.openPerfPanel()).
import type { QualitySetting, QualityTier, Settings } from '../../core/settings.ts';
import { h, ic } from '../dom.ts';
import { t, fmtDec, type StringKey } from '../i18n.ts';
import type { SettingsProps } from '../types.ts';
import type { ScreenCtx, ScreenDef } from './screen.ts';
import { eyebrow, page } from './common.ts';

type Path = string;

function setPath(s: Settings, path: Path, value: unknown): Settings {
  const next: Settings = { ...s, kanat: { ...s.kanat } };
  const [a, b] = path.split('.');
  if (b) (next as unknown as Record<string, Record<string, unknown>>)[a][b] = value;
  else (next as unknown as Record<string, unknown>)[a] = value;
  return next;
}

interface Ctl {
  apply(path: Path, value: unknown): void;
}

function rowHead(label: string, sub?: string, icon?: string): HTMLElement {
  return h('span', { class: 'kn-set-text' }, h('span', { class: 'kn-set-label' }, icon ? ic(icon) : null, h('span', { text: label })), sub ? h('span', { class: 'kn-set-sub', text: sub }) : null);
}

function seg<T extends string | number>(ctl: Ctl, path: Path, label: string, value: T, opts: { v: T; label: string; sub?: string; grow?: number }[], sub?: string): HTMLElement {
  const bar = h('div', { class: 'kn-seg', role: 'radiogroup', 'aria-label': label });
  for (const o of opts) {
    const b = h('button', { type: 'button', role: 'radio', 'aria-pressed': String(o.v === value), 'aria-checked': String(o.v === value), style: o.grow ? `flex-grow:${o.grow}` : '' }, h('span', { text: o.label }), o.sub ? h('small', { text: o.sub }) : null);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (o.v !== value) ctl.apply(path, o.v);
    });
    bar.appendChild(b);
  }
  return h('div', { class: 'kn-set kn-set--seg' }, rowHead(label, sub), bar);
}

function toggle(ctl: Ctl, path: Path, label: string, value: boolean, sub?: string, icon?: string): HTMLElement {
  const row = h('button', { class: 'kn-set kn-set--toggle', type: 'button', role: 'switch', 'aria-checked': String(value) }, rowHead(label, sub, icon), h('span', { class: 'kn-switch' }));
  row.addEventListener('click', (e) => {
    e.stopPropagation();
    ctl.apply(path, !value);
  });
  return row;
}

function slider(ctl: Ctl, path: Path, label: string, value: number, min: number, max: number, step: number, fmt: (v: number) => string, sub?: string): HTMLElement {
  const out = h('span', { class: 'kn-set-value kn-num', text: fmt(value) });
  const input = h('input', { class: 'kn-range', type: 'range', min: String(min), max: String(max), step: String(step), value: String(value), 'aria-label': label });
  const fill = (v: number): void => input.style.setProperty('--kn-fill', `${(((v - min) / (max - min)) * 100).toFixed(1)}%`);
  fill(value);
  input.addEventListener('input', () => {
    const v = Number(input.value);
    out.textContent = fmt(v);
    fill(v);
  });
  input.addEventListener('change', () => ctl.apply(path, Number(input.value)));
  return h('div', { class: 'kn-set kn-set--slider' }, h('div', { class: 'kn-set-row' }, rowHead(label, sub), out), input);
}

function group(title: string, ...rows: (HTMLElement | null)[]): HTMLElement {
  return h('section', { class: 'kn-set-group' }, eyebrow(title, 'kn-set-group-title'), h('div', { class: 'kn-set-card kn-card' }, ...rows));
}

const TIER_KEY: Record<QualityTier, StringKey> = { ultra: 'settings.q.ultra', high: 'settings.q.high', medium: 'settings.q.medium', low: 'settings.q.low' };

export const settingsScreen: ScreenDef<SettingsProps> = {
  layer: 'page',
  render(p, ctx) {
    const s = p.settings;
    const k = s.kanat;
    const ctl: Ctl = {
      apply(path, value) {
        ctx.sound('toggle');
        const next = setPath(s, path, value);
        ctx.cb.onSettingsChange?.(next, path);
        // Re-render first (stack props updated), then apply: a language change re-renders the whole stack.
        ctx.rerender({ ...p, settings: next });
        ctx.applySettings(next);
      },
    };
    const pct = (v: number): string => `${Math.round(v * 100)}`;
    const qOpts: { v: QualitySetting; label: string; sub?: string; grow?: number }[] = [
      { v: 'auto', label: t('settings.q.auto'), sub: t('settings.q.autoNow', { tier: t(TIER_KEY[p.currentTier]) }), grow: 1.7 },
      { v: 'ultra', label: t('settings.q.ultra') },
      { v: 'high', label: t('settings.q.high') },
      { v: 'medium', label: t('settings.q.medium') },
      { v: 'low', label: t('settings.q.low') },
    ];

    // Version label: 5 taps → hidden perf panel (§5.6).
    let taps = 0;
    let tapTimer = 0;
    const version = h('button', { class: 'kn-version kn-eyebrow', type: 'button', text: t('about.version', { v: p.version }) });
    version.addEventListener('click', (e) => {
      e.stopPropagation();
      taps++;
      clearTimeout(tapTimer);
      tapTimer = window.setTimeout(() => (taps = 0), 1600);
      if (taps >= 5) {
        taps = 0;
        ctx.cb.openPerfPanel?.();
      }
    });
    ctx.onCleanup(() => clearTimeout(tapTimer));

    const body = h(
      'div',
      { class: 'kn-settings' },
      // ---------- common core ----------
      group(
        t('settings.sec.general'),
        seg(ctl, 'quality', t('settings.graphics'), s.quality, qOpts),
        seg(ctl, 'fps', t('settings.fps'), s.fps, [
          { v: 60, label: '60' },
          { v: 30, label: '30', sub: t('settings.fps30sub') },
        ]),
        p.ultraCapable ? toggle(ctl, 'ultra120', t('settings.ultra120'), s.ultra120, t('settings.ultra120Sub')) : null,
        seg(ctl, 'lang', t('settings.lang'), s.lang, [
          { v: 'tr', label: t('settings.lang.tr') },
          { v: 'en', label: t('settings.lang.en') },
        ]),
        seg(ctl, 'haptics', t('settings.haptics'), s.haptics, [
          { v: 'on', label: t('settings.haptics.on') },
          { v: 'low', label: t('settings.haptics.low') },
          { v: 'off', label: t('settings.haptics.off') },
        ]),
      ),
      group(
        t('settings.sec.sound'),
        slider(ctl, 'masterVolume', t('settings.master'), s.masterVolume, 0, 1, 0.05, pct),
        slider(ctl, 'musicVolume', t('settings.music'), s.musicVolume, 0, 1, 0.05, pct),
        slider(ctl, 'sfxVolume', t('settings.sfx'), s.sfxVolume, 0, 1, 0.05, pct),
      ),
      group(
        t('settings.sec.access'),
        toggle(ctl, 'reduceMotion', t('settings.reduceMotion'), s.reduceMotion, t('settings.reduceMotionSub')),
        toggle(ctl, 'leftHanded', t('settings.leftHanded'), s.leftHanded, t('settings.leftHandedSub')),
      ),
      // ---------- KANAT ----------
      group(
        t('settings.sec.flight'),
        seg(
          ctl,
          'kanat.controlDir',
          t('settings.controlDir'),
          k.controlDir,
          [
            { v: 'natural', label: t('settings.controlDir.natural') },
            { v: 'pilot', label: t('settings.controlDir.pilot') },
          ],
          k.controlDir === 'natural' ? t('settings.controlDir.naturalSub') : t('settings.controlDir.pilotSub'),
        ),
        slider(ctl, 'kanat.sensitivity', t('settings.sensitivity'), k.sensitivity, 0.6, 1.5, 0.05, (v) => `${fmtDec(v, 2)}×`),
        slider(ctl, 'kanat.expo', t('settings.expo'), k.expo, 0, 0.7, 0.05, (v) => fmtDec(v, 2), t('settings.expoSub')),
        seg(ctl, 'kanat.gyro', t('settings.gyro'), k.gyro, [
          { v: 'off', label: t('settings.gyro.off') },
          { v: 'roll', label: t('settings.gyro.roll') },
          { v: 'full', label: t('settings.gyro.full') },
        ]),
        toggle(ctl, 'kanat.twoThumbs', t('settings.twoThumbs'), k.twoThumbs, t('settings.twoThumbsSub')),
      ),
      group(
        t('settings.sec.camera'),
        seg(ctl, 'kanat.cameraDistance', t('settings.cameraDistance'), k.cameraDistance, [
          { v: 'near', label: t('settings.cam.near') },
          { v: 'normal', label: t('settings.cam.normal') },
          { v: 'far', label: t('settings.cam.far') },
        ]),
        toggle(ctl, 'kanat.helmetCam', t('settings.helmetCam'), k.helmetCam, t('settings.helmetCamSub')),
        toggle(ctl, 'kanat.comfortCamera', t('settings.comfortCamera'), k.comfortCamera, t('settings.comfortCameraSub')),
        toggle(ctl, 'kanat.bigHud', t('settings.bigHud'), k.bigHud),
        toggle(ctl, 'kanat.colorBlind', t('settings.colorBlind'), k.colorBlind, t('settings.colorBlindSub')),
        h('div', { class: 'kn-set-swatches', 'aria-hidden': 'true' }, ...[1, 2, 3, 5].map((tier) => h('span', { class: 'kn-swatch-prox' }, h('i', { style: `background:var(--kn-p${tier})` }), h('b', { class: 'kn-display kn-num', text: `×${tier}` })))),
      ),
      group(
        t('settings.sec.assist'),
        seg(
          ctl,
          'kanat.flightAssist',
          t('settings.flightAssist'),
          k.flightAssist,
          [
            { v: 'full', label: t('settings.assist.full') },
            { v: 'low', label: t('settings.assist.low') },
            { v: 'off', label: t('settings.assist.off') },
          ],
          t('settings.assistSub', { a: k.flightAssist }),
        ),
        toggle(ctl, 'kanat.autoParachute', t('settings.autoParachute'), k.autoParachute, t('settings.autoParachuteSub')),
        toggle(ctl, 'kanat.slowMode', t('settings.slowMode'), k.slowMode, t('settings.slowModeSub'), 'turtle'),
      ),
      // ---------- about ----------
      h(
        'section',
        { class: 'kn-set-group kn-about' },
        eyebrow(t('settings.sec.about'), 'kn-set-group-title'),
        h(
          'div',
          { class: 'kn-set-card kn-card kn-about-card' },
          h('div', { class: 'kn-wordmark kn-wordmark--sm', text: t('app.name') }),
          h('p', { class: 'kn-serif kn-about-reality', text: t('about.reality') }),
          h('div', { class: 'kn-about-credits' }, eyebrow(t('about.credits')), h('pre', { class: 'kn-credits', text: p.credits })),
          h('p', { class: 'kn-caption', text: t('about.respect') }),
          version,
        ),
      ),
    );
    return page(ctx, { title: t('settings.title'), cls: 'kn-page--settings', body });
  },
};

export type { ScreenCtx };
