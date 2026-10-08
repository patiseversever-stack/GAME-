// Flight HUD (§2.11): ≤ 6 instruments + pause, centre 40 % kept empty, 85 % opacity.
//   top-centre score / time (+ ghost delta) · bottom-centre proximity ring (180° arc, ×1/×2/×3/×5 slices,
//   big "×3", combo bar) · left speed · right altitude-AGL bar with landing-zone / bold-opening marker ·
//   edge arrow to the next gate · contextual PARAŞÜT button (88×88, mirrored in left-hand mode) · pause (44).
// update(state) is allocation-free in steady state: DOM nodes are cached and only written when the
// displayed (quantised) value changes; strings are only built on change.
import type { FlightState, SimEvent } from '../../sim/types.ts';
import { t, upper, fmtInt, fmtTime, fmtDelta, fmtDec, speedValue } from '../i18n.ts';
import { iconSvg } from '../icons.ts';
import { PROX_CB_WIDTH } from '../theme.ts';

export type FtueKind = 'jump' | 'drag' | 'parachute' | 'flare';
export type HudMode = 'career' | 'daily' | 'duel' | 'free';
export interface HudConfig {
  mode?: HudMode;
  colorBlind?: boolean;
  leftHanded?: boolean;
  bigHud?: boolean;
  /** Daily/duel-on-daily: show time instead of score. */
  metric?: 'score' | 'time';
  gatesTotal?: number;
}
export interface HudCallbacks {
  onPause(): void;
  onParachute(): void;
}

const TIERS = [1, 2, 3, 5] as const;
// Arc geometry (SVG units): centre (120,118), radius 96, 180° → 0°, 4 slices with 3° gaps.
const CX = 120;
const CY = 118;
const R = 96;
const SLICE = [
  [180, 135],
  [135, 90],
  [90, 45],
  [45, 0],
] as const;
const ALT_MAX = 600;
const ALT_H = 156; // px (unscaled)

function arcPath(a0: number, a1: number): string {
  const g = 1.6;
  const s = ((a0 - g) * Math.PI) / 180;
  const e = ((a1 + g) * Math.PI) / 180;
  const x0 = CX + R * Math.cos(s);
  const y0 = CY - R * Math.sin(s);
  const x1 = CX + R * Math.cos(e);
  const y1 = CY - R * Math.sin(e);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** Proximity distance → arc angle (deg): 30 m → 180°, 15 → 135°, 7 → 90°, 3 → 45°, 0 → 0°. */
export function proxAngle(d: number): number {
  if (!(d < 30)) return 180;
  if (d >= 15) return 135 + ((d - 15) / 15) * 45;
  if (d >= 7) return 90 + ((d - 7) / 8) * 45;
  if (d >= 3) return 45 + ((d - 3) / 4) * 45;
  return Math.max(0, (d / 3) * 45);
}
/** AGL → bar position 0 (bottom) .. 1 (top), sqrt scale so the last 100 m get room. */
export function altFrac(agl: number): number {
  const v = agl <= 0 ? 0 : agl >= ALT_MAX ? 1 : Math.sqrt(agl / ALT_MAX);
  return v;
}

export class FlightHud {
  readonly el: HTMLElement;
  private cb: HudCallbacks;
  private cfg: Required<Pick<HudConfig, 'mode' | 'colorBlind' | 'leftHanded' | 'bigHud' | 'metric'>> & { gatesTotal: number } = {
    mode: 'career',
    colorBlind: false,
    leftHanded: false,
    bigHud: false,
    metric: 'score',
    gatesTotal: 0,
  };
  // cached nodes
  private nTop!: HTMLElement;
  private nScore!: HTMLElement;
  private nDelta!: HTMLElement;
  private nGates!: HTMLElement;
  private nRing!: HTMLElement;
  private nSlices: SVGPathElement[] = [];
  private nNeedle!: SVGGElement;
  private nMult!: HTMLElement;
  private nCombo!: HTMLElement;
  private nComboTxt!: HTMLElement;
  private nSpeed!: HTMLElement;
  private nSpeedUnit!: HTMLElement;
  private nAlt!: HTMLElement;
  private nAltMark!: HTMLElement;
  private nAltVal!: HTMLElement;
  private nAltTarget!: HTMLElement;
  private nArrow!: HTMLElement;
  private nChute!: HTMLButtonElement;
  private nChuteLabel!: HTMLElement;
  private nPause!: HTMLButtonElement;
  private nPops: HTMLElement[] = [];
  private nFtue!: HTMLElement;
  private nWarn!: HTMLElement;
  // last written values (sentinels force first write)
  private vScore = NaN;
  private vTenths = -1;
  private vSpeed = -1;
  private vAlt = -1;
  private vAltPos = -1;
  private vMult = -1;
  private vAngle = -1;
  private vCombo = -1;
  private vChute = -1; // -1 = unknown (forces a write), 0/1
  private vZone = -1;
  private vGates = -1;
  private vArrow = NaN;
  private vIntro = -1;
  private popIdx = 0;
  private deltaTimer = 0;
  private pulseTimer = 0;
  private breakTimer = 0;
  private vw = 390;
  private vh = 844;
  private visible = true;
  private ftueKind: FtueKind | null = null;
  private onResize = (): void => {
    this.vw = window.innerWidth;
    this.vh = window.innerHeight;
    this.vArrow = NaN;
  };

  constructor(parent: HTMLElement, cb: HudCallbacks) {
    this.cb = cb;
    this.el = document.createElement('div');
    this.el.className = 'kn-hud';
    this.build();
    parent.appendChild(this.el);
    this.onResize();
    window.addEventListener('resize', this.onResize);
  }

  private build(): void {
    const el = this.el;
    let slices = '';
    for (let i = 0; i < 4; i++) slices += `<path class="kn-ring-slice" data-tier="${TIERS[i]}" d="${arcPath(SLICE[i][0], SLICE[i][1])}"/>`;
    let ticks = '';
    for (let a = 0; a <= 180; a += 15) {
      const r0 = R + 9;
      const r1 = R + (a % 45 === 0 ? 15 : 12);
      const rad = (a * Math.PI) / 180;
      ticks += `M${(CX + r0 * Math.cos(rad)).toFixed(1)} ${(CY - r0 * Math.sin(rad)).toFixed(1)}L${(CX + r1 * Math.cos(rad)).toFixed(1)} ${(CY - r1 * Math.sin(rad)).toFixed(1)}`;
    }
    let altTicks = '';
    for (const m of [0, 25, 50, 100, 200, 300, 400, 600]) {
      const y = ALT_H - altFrac(m) * ALT_H;
      altTicks += `<i class="${m % 100 === 0 ? 'is-major' : ''}" style="top:${y.toFixed(1)}px"></i>`;
    }
    const b0 = ALT_H - altFrac(90) * ALT_H;
    const b1 = ALT_H - altFrac(60) * ALT_H;
    el.innerHTML = `
<button class="kn-hud-pause" type="button" aria-label="">${iconSvg('pause')}</button>
<div class="kn-hud-top"><div class="kn-hud-score kn-display kn-num">0</div><div class="kn-hud-sub"><span class="kn-hud-gates kn-num"></span><span class="kn-hud-delta kn-num"></span></div></div>
<div class="kn-hud-pops"><div class="kn-pop"></div><div class="kn-pop"></div><div class="kn-pop"></div></div>
<div class="kn-hud-speed"><b class="kn-display kn-num">0</b><span class="kn-hud-unit"></span></div>
<div class="kn-hud-alt"><div class="kn-alt-bar">${altTicks}<span class="kn-alt-band" style="top:${b0.toFixed(1)}px;height:${(b1 - b0).toFixed(1)}px"></span><span class="kn-alt-target">${iconSvg('target')}</span><span class="kn-alt-mark"><i></i><b class="kn-num">0</b></span></div><span class="kn-hud-unit">m</span></div>
<div class="kn-hud-ring"><svg viewBox="0 0 240 130" aria-hidden="true"><path class="kn-ring-ticks" d="${ticks}"/>${slices}<g class="kn-ring-needle"><circle cx="${CX - R}" cy="${CY}" r="5.5"/></g></svg><div class="kn-ring-center"><div class="kn-ring-mult kn-display kn-num"></div><div class="kn-ring-combo"><span class="kn-combo-bar"><i></i></span><span class="kn-combo-txt kn-num"></span></div></div></div>
<div class="kn-hud-arrow">${iconSvg('arrow')}</div>
<button class="kn-hud-chute" type="button"><span class="kn-chute-ring"></span>${iconSvg('parachute')}<span class="kn-chute-label"></span></button>
<div class="kn-hud-ftue"></div>
<div class="kn-hud-warn"></div>`;
    const q = <T extends Element>(s: string): T => el.querySelector(s) as T;
    this.nPause = q('.kn-hud-pause');
    this.nTop = q('.kn-hud-top');
    this.nScore = q('.kn-hud-score');
    this.nDelta = q('.kn-hud-delta');
    this.nGates = q('.kn-hud-gates');
    this.nRing = q('.kn-hud-ring');
    this.nSlices = Array.from(el.querySelectorAll<SVGPathElement>('.kn-ring-slice'));
    this.nNeedle = q('.kn-ring-needle');
    this.nMult = q('.kn-ring-mult');
    this.nCombo = q('.kn-combo-bar i');
    this.nComboTxt = q('.kn-combo-txt');
    this.nSpeed = q('.kn-hud-speed b');
    this.nSpeedUnit = q('.kn-hud-speed .kn-hud-unit');
    this.nAlt = q('.kn-hud-alt');
    this.nAltMark = q('.kn-alt-mark');
    this.nAltVal = q('.kn-alt-mark b');
    this.nAltTarget = q('.kn-alt-target');
    this.nArrow = q('.kn-hud-arrow');
    this.nChute = q('.kn-hud-chute');
    this.nChuteLabel = q('.kn-chute-label');
    this.nPops = Array.from(el.querySelectorAll<HTMLElement>('.kn-pop'));
    this.nFtue = q('.kn-hud-ftue');
    this.nWarn = q('.kn-hud-warn');
    this.nPause.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cb.onPause();
    });
    this.nChute.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.cb.onParachute();
    });
    this.refreshLabels();
    this.setArrow(null);
  }

  /** Re-applies translated labels (call after a language change). */
  refreshLabels(): void {
    this.nPause.setAttribute('aria-label', t('hud.pause'));
    this.nSpeedUnit.textContent = t('hud.speedUnit');
    this.nChuteLabel.textContent = upper(t('hud.parachute'));
    this.nChute.setAttribute('aria-label', t('hud.parachute'));
    if (this.ftueKind) this.ftue(this.ftueKind);
  }

  configure(c: HudConfig): void {
    if (c.mode) {
      this.cfg.mode = c.mode;
      this.cfg.metric = c.metric ?? (c.mode === 'daily' ? 'time' : 'score');
    } else if (c.metric) this.cfg.metric = c.metric;
    if (c.colorBlind !== undefined) this.cfg.colorBlind = c.colorBlind;
    if (c.leftHanded !== undefined) this.cfg.leftHanded = c.leftHanded;
    if (c.bigHud !== undefined) this.cfg.bigHud = c.bigHud;
    if (c.gatesTotal !== undefined) this.cfg.gatesTotal = c.gatesTotal;
    this.el.classList.toggle('is-free', this.cfg.mode === 'free');
    this.el.classList.toggle('is-time', this.cfg.metric === 'time');
    // Colour-blind: slice thickness grows with tier.
    for (let i = 0; i < this.nSlices.length; i++) this.nSlices[i].style.strokeWidth = this.cfg.colorBlind ? String(PROX_CB_WIDTH[TIERS[i]]) : '';
    this.reset();
  }

  /** Clears cached values so the next update writes everything (new flight). */
  reset(): void {
    this.vScore = NaN;
    this.vTenths = -1;
    this.vSpeed = -1;
    this.vAlt = -1;
    this.vAltPos = -1;
    this.vMult = -1;
    this.vAngle = -1;
    this.vCombo = -1;
    this.vGates = -1;
    this.vIntro = -1;
    this.vChute = -1;
    this.vZone = -1;
    this.nDelta.classList.remove('is-on');
    for (const p of this.nPops) p.classList.remove('is-on');
  }

  setVisible(v: boolean): void {
    if (v === this.visible) return;
    this.visible = v;
    this.el.classList.toggle('is-hidden', !v);
  }

  /** Per-frame update. No allocation unless a displayed value changes. */
  update(s: FlightState): void {
    const intro = s.phase === 'intro' || s.phase === 'jump' ? 1 : 0;
    if (intro !== this.vIntro) {
      this.vIntro = intro;
      this.el.classList.toggle('is-intro', intro === 1);
    }
    // --- top: score or time
    if (this.cfg.metric === 'time') {
      const tenths = Math.floor(s.timeSec * 10 + 1e-6);
      if (tenths !== this.vTenths) {
        this.vTenths = tenths;
        this.nScore.textContent = fmtTime(tenths / 10);
      }
    } else if (this.cfg.mode !== 'free') {
      const sc = Math.round(s.score);
      if (sc !== this.vScore) {
        this.vScore = sc;
        this.nScore.textContent = fmtInt(sc);
      }
    }
    if (this.cfg.gatesTotal > 0 && s.gatesPassed !== this.vGates) {
      this.vGates = s.gatesPassed;
      this.nGates.textContent = `${s.gatesPassed}/${this.cfg.gatesTotal}`;
    }
    // --- speed (km/h value; unit label per language)
    const sp = speedValue(s.speed);
    if (sp !== this.vSpeed) {
      this.vSpeed = sp;
      this.nSpeed.textContent = String(sp);
    }
    // --- altitude AGL
    const agl = Math.max(0, Math.round(s.heightAGL));
    if (agl !== this.vAlt) {
      this.vAlt = agl;
      this.nAltVal.textContent = String(agl);
      const pos = Math.round((1 - altFrac(agl)) * ALT_H * 2) / 2;
      if (pos !== this.vAltPos) {
        this.vAltPos = pos;
        this.nAltMark.style.transform = `translateY(${pos}px)`;
      }
    }
    // --- proximity ring
    const m = s.prox.mult;
    if (m !== this.vMult) {
      const up = m > this.vMult && this.vMult >= 0;
      this.vMult = m;
      for (let i = 0; i < 4; i++) {
        const on = TIERS[i] <= m;
        this.nSlices[i].classList.toggle('is-on', on);
      }
      this.nRing.dataset.tier = String(m);
      this.nMult.textContent = m > 0 ? `×${m}` : '';
      if (up && m > 0) this.pulse();
    }
    const ang = Math.round(proxAngle(s.prox.d) * 2) / 2;
    if (ang !== this.vAngle) {
      this.vAngle = ang;
      this.nNeedle.style.transform = `rotate(${180 - ang}deg)`;
    }
    const combo = Math.round(s.combo * 100);
    if (combo !== this.vCombo) {
      this.vCombo = combo;
      const k = Math.max(0, Math.min(1, (s.combo - 1) / 2));
      this.nCombo.style.transform = `scaleX(${k.toFixed(3)})`;
      this.nComboTxt.textContent = combo > 100 ? `${fmtDec(s.combo, 2)}` : '';
    }
    // --- parachute button (contextual; Free Flight: always while flying)
    const flying = s.phase === 'flying';
    const showChute = flying && !s.canopyOpen && (s.inLandingZone || this.cfg.mode === 'free') ? 1 : 0;
    if (showChute !== this.vChute) {
      this.vChute = showChute;
      this.nChute.classList.toggle('is-on', showChute === 1);
      this.nChute.classList.toggle('is-pulse', showChute === 1 && this.cfg.mode !== 'free');
    }
    const zone = s.inLandingZone ? 1 : 0;
    if (zone !== this.vZone) {
      this.vZone = zone;
      this.nAlt.classList.toggle('is-zone', zone === 1);
    }
  }

  /** Discrete sim events → popups and pulses. */
  onEvent(e: SimEvent): void {
    switch (e.type) {
      case 'graze':
        this.popup(t('hud.graze'), e.points, 'graze');
        break;
      case 'balloonThread':
        this.popup(t('hud.balloon'), e.points, 'balloon');
        break;
      case 'gate':
        this.popup(e.chain > 1 ? `${t('hud.gate')} · ${t('hud.chain', { n: e.chain })}` : t('hud.gate'), e.points, 'gate');
        break;
      case 'gateMissed':
        if (this.cfg.metric === 'time') this.popup(t('hud.gateMissed'), 0, 'miss', `+${fmtDec(2, 1)}`);
        break;
      case 'thermalEnter':
        this.popup(t('hud.thermal'), 100, 'thermal');
        break;
      case 'multUp':
        this.pulse();
        break;
      case 'comboBreak':
        this.nRing.classList.add('is-broken');
        clearTimeout(this.breakTimer);
        this.breakTimer = window.setTimeout(() => this.nRing.classList.remove('is-broken'), 700);
        break;
      case 'parachuteOpen':
        if (e.auto && e.heightAGL < 30) this.popup(t('hud.emergency'), 0, 'miss');
        else if (e.heightAGL >= 60 && e.heightAGL <= 90) this.popup(t('hud.bold'), 300, 'gate');
        this.vChute = -1;
        break;
      case 'landed':
        if (e.soft) this.popup(t('hud.soft'), 300, 'gate');
        break;
      default:
        break;
    }
  }

  /** Ghost delta at a gate (seconds, negative = ahead). Shown ~3 s. null hides. */
  setGhostDelta(sec: number | null): void {
    clearTimeout(this.deltaTimer);
    if (sec === null) {
      this.nDelta.classList.remove('is-on');
      return;
    }
    this.nDelta.textContent = fmtDelta(sec, 2);
    this.nDelta.classList.toggle('is-ahead', sec <= 0);
    this.nDelta.classList.add('is-on');
    this.deltaTimer = window.setTimeout(() => this.nDelta.classList.remove('is-on'), 3000);
  }

  /**
   * Edge arrow toward the next gate when it is off-screen. `angleRad`: screen-space direction from the
   * screen centre (0 = up, clockwise). null hides the arrow (gate on screen or none).
   */
  setArrow(angleRad: number | null): void {
    if (angleRad === null) {
      if (this.vArrow === this.vArrow) {
        this.vArrow = NaN;
        this.nArrow.classList.remove('is-on');
      }
      return;
    }
    const a = Math.round(angleRad * 100) / 100;
    if (a === this.vArrow) return;
    this.vArrow = a;
    const rx = this.vw / 2 - 34;
    const ry = this.vh / 2 - 92;
    const x = Math.sin(a) * rx;
    const y = -Math.cos(a) * ry;
    this.nArrow.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${a.toFixed(3)}rad)`;
    this.nArrow.classList.add('is-on');
  }

  /** Assist "Az": edge pulse on the obstacle side (≤ 2 Hz). null clears. */
  setWarning(side: 'left' | 'right' | 'top' | 'bottom' | null): void {
    this.nWarn.dataset.side = side ?? '';
    this.nWarn.classList.toggle('is-on', side !== null);
  }

  /** FTUE overlays: pulsing thumb + "Atla", ghost-thumb drag, parachute thumb, flare "Çek" arrow. */
  ftue(kind: FtueKind | null): void {
    this.ftueKind = kind;
    const f = this.nFtue;
    f.className = `kn-hud-ftue ${kind ? `is-${kind}` : ''}`;
    if (!kind) {
      f.innerHTML = '';
      return;
    }
    const thumb = '<span class="kn-thumb"><i></i><i></i></span>';
    if (kind === 'jump') f.innerHTML = `<div class="kn-ftue-jump">${thumb}<b class="kn-display">${upper(t('ftue.jump'))}</b></div>`;
    else if (kind === 'drag') f.innerHTML = `<div class="kn-ftue-drag"><span class="kn-ftue-trail"></span>${thumb}</div>`;
    else if (kind === 'parachute') f.innerHTML = `<div class="kn-ftue-chute">${thumb}</div>`;
    else f.innerHTML = `<div class="kn-ftue-flare">${iconSvg('chevronDown', 'kn-icon kn-ftue-arrow')}<b class="kn-display">${upper(t('ftue.pull'))}</b></div>`;
  }

  private pulse(): void {
    this.nRing.classList.remove('is-pulse');
    void this.nRing.offsetWidth;
    this.nRing.classList.add('is-pulse');
    clearTimeout(this.pulseTimer);
    this.pulseTimer = window.setTimeout(() => this.nRing.classList.remove('is-pulse'), 420);
  }

  private popup(title: string, points: number, kind: string, suffix?: string): void {
    const p = this.nPops[this.popIdx];
    this.popIdx = (this.popIdx + 1) % this.nPops.length;
    p.className = 'kn-pop';
    p.dataset.kind = kind;
    const pts = suffix ?? (points > 0 ? `+${fmtInt(points)}` : '');
    p.innerHTML = `<b class="kn-display">${upper(title)}</b>${pts ? `<span class="kn-display kn-num">${pts}</span>` : ''}`;
    void p.offsetWidth;
    p.classList.add('is-on');
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    clearTimeout(this.deltaTimer);
    clearTimeout(this.pulseTimer);
    clearTimeout(this.breakTimer);
    this.el.remove();
  }
}
