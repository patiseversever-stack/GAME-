// Touch / pointer / keyboard / gyro → sim Commands (§2.2, §2.6, §4.G.5).
//
//   flight  one-thumb "drag anywhere" relative stick → axis [sx, sy] (roll, pitch), 30 Hz, quantized
//           (landscape + "İki Başparmak": left half = roll, right half = pitch)
//   canopy  horizontal drag = turn (axis sx), drag down = flare [0..31]
//   suru    drag = direction (deadzone 0.10, no expo) → axis; finger down = Sıkı Dizi → tight [1], release → [0]
//           (two-thumb: left = direction, right hold = tight)
//   menu    nothing
// Left-hand mode mirrors UI only; it never changes the drag mapping.
// Commands come from a 64-slot ring pool (zero allocation in flight): consumers must copy anything
// they keep longer than the current tick (the replay Recorder copies into typed arrays).

import type { Command } from '../sim/types.ts';
import type { StickShape } from './gesture.ts';
import { effectiveExpo, gestureMath, shapeStick, STICK_TUNING } from './gesture.ts';
import type { GyroMode } from './gyro.ts';
import { GyroInput, requestGyroPermission } from './gyro.ts';
import { RelativeStick } from './stick.ts';

export type InputScheme = 'menu' | 'flight' | 'canopy' | 'suru';

export interface InputConfig {
  controlDir: 'natural' | 'pilot';
  sensitivity: number;
  expo: number;
  gyro: GyroMode;
  twoThumbs: boolean;
}

export interface StickVisual {
  active: boolean;
  anchorX: number;
  anchorY: number;
  fingerX: number;
  fingerY: number;
}

/** Read every frame by the UI (ghost thumb, Nefes arc). Mutated in place — never replaced. */
export interface InputVisual {
  scheme: InputScheme;
  twoThumb: boolean;
  radius: number;
  main: StickVisual;
  left: StickVisual;
  right: StickVisual;
  /** SÜRÜ: finger down (Sıkı Dizi). */
  holding: boolean;
  /** Shaped output floats (−1..1; y>0 = pull / screen-up in SÜRÜ). */
  x: number;
  y: number;
  /** Canopy flare 0..1. */
  flare: number;
  /** Last quantized axis. */
  qx: number;
  qy: number;
  source: 'none' | 'touch' | 'keyboard' | 'gyro';
}

const POOL = 64;

const K_LEFT = 1;
const K_RIGHT = 2;
const K_UP = 4;
const K_DOWN = 8;
const K_SPACE = 16;

const KEYMAP: Record<string, number> = {
  ArrowLeft: K_LEFT,
  KeyA: K_LEFT,
  ArrowRight: K_RIGHT,
  KeyD: K_RIGHT,
  ArrowUp: K_UP,
  KeyW: K_UP,
  ArrowDown: K_DOWN,
  KeyS: K_DOWN,
  Space: K_SPACE,
};

/** Digital key → analog axis: press ramps in ~0.2 s, release in ~0.12 s. */
function rampKey(cur: number, target: number, dt: number): number {
  const rate = target === 0 ? 8 : 5;
  const d = target - cur;
  const step = rate * dt;
  return Math.abs(d) <= step ? target : cur + Math.sign(d) * step;
}

function newVisual(): StickVisual {
  return { active: false, anchorX: 0, anchorY: 0, fingerX: 0, fingerY: 0 };
}

function copyVisual(dst: StickVisual, s: RelativeStick): void {
  dst.active = s.active;
  dst.anchorX = s.anchorX;
  dst.anchorY = s.anchorY;
  dst.fingerX = s.fingerX;
  dst.fingerY = s.fingerY;
}

export interface InputManagerOptions {
  /** Pointers starting on these elements are UI taps, not steering. */
  ignoreSelector?: string;
  /** Called on Escape (desktop) — boot routes it to the bridge `back` logic. */
  onBack?: () => void;
}

export class InputManager {
  readonly visual: InputVisual = {
    scheme: 'menu',
    twoThumb: false,
    radius: 45,
    main: newVisual(),
    left: newVisual(),
    right: newVisual(),
    holding: false,
    x: 0,
    y: 0,
    flare: 0,
    qx: 0,
    qy: 0,
    source: 'none',
  };
  readonly gyro = new GyroInput();
  private readonly stick = new RelativeStick();
  private readonly leftStick = new RelativeStick();
  private readonly rightStick = new RelativeStick();
  private readonly sticks: readonly RelativeStick[] = [this.stick, this.leftStick, this.rightStick];
  private scheme: InputScheme = 'menu';
  private cfg: InputConfig = { controlDir: 'natural', sensitivity: 1, expo: 0, gyro: 'off', twoThumbs: false };
  private viewW = 390;
  private viewH = 844;
  private ticksPerSample = 2;
  private keys = 0;
  private keyX = 0;
  private keyY = 0;
  private lastTight = -1;
  private lastFlare = -1;
  private readonly actions: { cmd: Command['cmd']; args: number[] }[] = [];
  private readonly pool: Command[] = [];
  private poolIdx = 0;
  private readonly out2 = new Float64Array(2);
  private readonly shape: StickShape = { deadzone: STICK_TUNING.deadzone, expoX: 0.35, expoY: 0.5, sensitivity: 1, invertY: false };
  private el: HTMLElement | null = null;
  private win: Window | null = null;
  private readonly ignoreSelector: string;
  private readonly onBack: (() => void) | undefined;

  constructor(opts: InputManagerOptions = {}) {
    this.ignoreSelector = opts.ignoreSelector ?? 'button, a, input, select, textarea, label, [role="button"], [data-input-ignore]';
    this.onBack = opts.onBack;
    for (let i = 0; i < POOL; i++) this.pool.push({ tick: 0, actorId: 0, cmd: 'axis', args: [0, 0] });
    this.applyShape();
  }

  // ---- configuration -------------------------------------------------------------------------

  configure(c: Partial<InputConfig>): void {
    this.cfg = { ...this.cfg, ...c };
    this.gyro.mode = this.cfg.gyro;
    this.applyShape();
    this.updateTwoThumb();
  }

  get config(): Readonly<InputConfig> {
    return this.cfg;
  }

  setScheme(s: InputScheme): void {
    if (s === this.scheme) return;
    this.scheme = s;
    this.visual.scheme = s;
    this.lastTight = -1;
    this.lastFlare = -1;
    this.visual.flare = 0;
    this.applyShape();
  }

  get currentScheme(): InputScheme {
    return this.scheme;
  }

  /** Sim rate of the active mode (60 flight, 30 SÜRÜ) → axis sampled at 30 Hz either way. */
  setSimHz(hz: number): void {
    this.ticksPerSample = Math.max(1, Math.round(hz / 30));
  }

  setViewport(w: number, h: number): void {
    this.viewW = Math.max(1, w);
    this.viewH = Math.max(1, h);
    this.visual.radius = STICK_TUNING.radiusFrac * Math.min(this.viewW, this.viewH);
    this.updateTwoThumb();
  }

  private get landscape(): boolean {
    return this.viewW > this.viewH;
  }

  private updateTwoThumb(): void {
    const two = this.cfg.twoThumbs && this.landscape;
    if (two !== this.visual.twoThumb) this.releaseAll();
    this.visual.twoThumb = two;
  }

  private applyShape(): void {
    const suru = this.scheme === 'suru';
    this.shape.deadzone = suru ? STICK_TUNING.deadzoneSuru : STICK_TUNING.deadzone;
    this.shape.expoX = suru ? 0 : effectiveExpo(STICK_TUNING.expoRoll, this.cfg.expo);
    this.shape.expoY = suru ? 0 : effectiveExpo(STICK_TUNING.expoPitch, this.cfg.expo);
    this.shape.sensitivity = suru ? 1 : this.cfg.sensitivity;
    this.shape.invertY = !suru && this.cfg.controlDir === 'pilot';
  }

  // ---- pointer API (DOM-free, used by attach() and tests) ------------------------------------

  pointerDown(id: number, x: number, y: number, tMs = 0): boolean {
    if (this.scheme === 'menu') return false;
    const r = this.visual.radius;
    if (this.visual.twoThumb) {
      const s = x < this.viewW / 2 ? this.leftStick : this.rightStick;
      if (s.active) return false;
      s.begin(id, x, y, r, tMs);
    } else {
      if (this.stick.active) return false;
      this.stick.begin(id, x, y, r, tMs);
    }
    this.visual.source = 'touch';
    this.syncVisual();
    return true;
  }

  pointerMove(id: number, x: number, y: number): void {
    for (const s of this.sticks) if (s.active && s.pointerId === id) s.move(x, y);
    this.syncVisual();
  }

  pointerUp(id: number): void {
    for (const s of this.sticks) if (s.active && s.pointerId === id) s.end();
    this.syncVisual();
  }

  releaseAll(): void {
    this.stick.end();
    this.leftStick.end();
    this.rightStick.end();
    this.keys = 0;
    this.syncVisual();
  }

  private syncVisual(): void {
    copyVisual(this.visual.main, this.stick);
    copyVisual(this.visual.left, this.leftStick);
    copyVisual(this.visual.right, this.rightStick);
    this.visual.holding = this.isHolding();
  }

  private isHolding(): boolean {
    if ((this.keys & K_SPACE) !== 0) return true;
    return this.visual.twoThumb ? this.rightStick.active : this.stick.active;
  }

  get touching(): boolean {
    return this.stick.active || this.leftStick.active || this.rightStick.active;
  }

  // ---- keyboard ------------------------------------------------------------------------------

  keyDown(code: string, repeat = false): boolean {
    if (code === 'Escape') {
      if (!repeat) this.onBack?.();
      return true;
    }
    if (code === 'KeyP' && !repeat && this.scheme === 'flight') {
      this.queueAction('parachute');
      return true;
    }
    const bit = KEYMAP[code];
    if (!bit) return false;
    if (bit === K_SPACE && !repeat && this.scheme === 'flight') this.queueAction('parachute');
    this.keys |= bit;
    this.visual.holding = this.isHolding();
    return true;
  }

  keyUp(code: string): void {
    const bit = KEYMAP[code];
    if (bit) this.keys &= ~bit;
    this.visual.holding = this.isHolding();
  }

  // ---- actions -------------------------------------------------------------------------------

  /** UI buttons (PARAŞÜT) and keyboard enqueue one-shot commands for the next sampled tick. */
  queueAction(cmd: 'parachute' | 'pause'): void {
    if (this.actions.length < 8) this.actions.push({ cmd, args: [] });
  }

  /** Neutral gyro attitude ("Atla"). */
  calibrateGyro(): void {
    this.gyro.calibrate();
  }

  requestGyroPermission(): ReturnType<typeof requestGyroPermission> {
    return requestGyroPermission();
  }

  // ---- sampling ------------------------------------------------------------------------------

  private take(tick: number, actorId: number, cmd: Command['cmd'], a0?: number, a1?: number): Command {
    const c = this.pool[this.poolIdx];
    this.poolIdx = (this.poolIdx + 1) % POOL;
    c.tick = tick;
    c.actorId = actorId;
    c.cmd = cmd;
    c.args.length = 0;
    if (a0 !== undefined) c.args.push(a0);
    if (a1 !== undefined) c.args.push(a1);
    return c;
  }

  private stepKeys(): void {
    const dt = this.ticksPerSample / 60;
    const tx = ((this.keys & K_RIGHT) !== 0 ? 1 : 0) - ((this.keys & K_LEFT) !== 0 ? 1 : 0);
    const ty = ((this.keys & K_UP) !== 0 ? 1 : 0) - ((this.keys & K_DOWN) !== 0 ? 1 : 0);
    this.keyX = rampKey(this.keyX, tx, dt);
    this.keyY = rampKey(this.keyY, ty, dt);
  }

  /**
   * Called by the mode once per sim tick BEFORE stepping the sim. Pushes this tick's commands:
   * on 30 Hz sample ticks (every 2nd tick at 60 Hz) one `axis` (always, on the grid — matches
   * src/sim/replay/recorder.ts), then `flare`/`tight` when they changed; queued actions every tick.
   */
  sample(tick: number, out: Command[], actorId = 0): void {
    // Order inside a tick matters for the replay Recorder: axis (stream) first, then events
    // (flare / tight / parachute). An axis after an event in the same tick would leave the stream.
    if (this.scheme !== 'menu' && tick % this.ticksPerSample === 0) this.sampleAxes(tick, out, actorId);
    for (const a of this.actions) out.push(this.take(tick, actorId, a.cmd));
    this.actions.length = 0;
  }

  private sampleAxes(tick: number, out: Command[], actorId: number): void {
    this.stepKeys();
    const m = gestureMath();
    const two = this.visual.twoThumb;
    const o = this.out2;

    // raw unit-disk vector, screen space (+y down)
    let rx: number;
    let ry: number;
    if (two) {
      rx = this.leftStick.vx;
      ry = this.scheme === 'suru' ? this.leftStick.vy : this.rightStick.vy;
    } else {
      rx = this.stick.vx;
      ry = this.stick.vy;
    }
    const touchActive = this.touching;
    const keyActive = this.keyX !== 0 || this.keyY !== 0;
    if (!touchActive && keyActive) {
      rx = this.keyX;
      ry = -this.keyY;
      this.visual.source = 'keyboard';
    }

    if (this.scheme === 'flight') {
      shapeStick(rx, ry, this.shape, o);
      let x = o[0];
      let y = o[1];
      if (this.gyro.mode !== 'off' && this.gyro.hasData) {
        const s = this.shape;
        const gx = m.expo(Math.max(-1, Math.min(1, this.gyro.roll * s.sensitivity)), s.expoX);
        x = this.gyro.mode === 'roll' ? gx : Math.max(-1, Math.min(1, x + gx));
        if (this.gyro.mode === 'full') {
          const gp = s.invertY ? -this.gyro.pitch : this.gyro.pitch;
          y = Math.max(-1, Math.min(1, y + m.expo(Math.max(-1, Math.min(1, gp * s.sensitivity)), s.expoY)));
        }
        if (!touchActive && !keyActive) this.visual.source = 'gyro';
      }
      this.emitAxis(tick, actorId, x, y, out);
    } else if (this.scheme === 'canopy') {
      shapeStick(rx, 0, this.shape, o);
      const turn = this.gyro.mode !== 'off' && this.gyro.hasData && !touchActive ? this.gyro.roll : o[0];
      this.emitAxis(tick, actorId, turn, 0, out);
      // downward drag = flare (dy > 0 in screen space); keyboard: Down arrow or Space
      let flare = Math.max(0, ry) / STICK_TUNING.flareFullR;
      if (!touchActive && ((this.keys & K_DOWN) !== 0 || (this.keys & K_SPACE) !== 0)) flare = 1;
      const q = m.quantizeFlare(flare);
      this.visual.flare = q / 31;
      if (q !== this.lastFlare) {
        this.lastFlare = q;
        out.push(this.take(tick, actorId, 'flare', q));
      }
    } else {
      // suru: direction, deadzone 0.10, no expo, +y = screen up
      shapeStick(rx, ry, this.shape, o);
      this.emitAxis(tick, actorId, o[0], o[1], out);
      const tight = this.isHolding() ? 1 : 0;
      this.visual.holding = tight === 1;
      if (tight !== this.lastTight) {
        this.lastTight = tight;
        out.push(this.take(tick, actorId, 'tight', tight));
      }
    }
    if (!touchActive && !keyActive && this.visual.source !== 'gyro') this.visual.source = 'none';
  }

  private emitAxis(tick: number, actorId: number, x: number, y: number, out: Command[]): void {
    const m = gestureMath();
    const qx = m.quantizeAxis(x);
    const qy = m.quantizeAxis(y);
    this.visual.x = x;
    this.visual.y = y;
    this.visual.qx = qx;
    this.visual.qy = qy;
    out.push(this.take(tick, actorId, 'axis', qx, qy));
  }

  // ---- DOM wiring ----------------------------------------------------------------------------

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const t = e.target as Element | null;
    if (t && typeof t.closest === 'function' && t.closest(this.ignoreSelector)) return;
    const r = this.el!.getBoundingClientRect();
    if (r.width !== this.viewW || r.height !== this.viewH) this.setViewport(r.width, r.height);
    if (this.pointerDown(e.pointerId, e.clientX - r.left, e.clientY - r.top, e.timeStamp)) {
      try {
        this.el!.setPointerCapture(e.pointerId);
      } catch {
        // synthetic pointers cannot be captured
      }
      e.preventDefault();
    }
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.touching) return;
    const r = this.el!.getBoundingClientRect();
    this.pointerMove(e.pointerId, e.clientX - r.left, e.clientY - r.top);
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    this.pointerUp(e.pointerId);
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    const t = e.target as Element | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if (this.keyDown(e.code, e.repeat) && this.scheme !== 'menu') e.preventDefault();
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keyUp(e.code);
  };

  private readonly onBlur = (): void => {
    this.releaseAll();
  };

  private readonly onResize = (): void => {
    if (!this.el) return;
    const r = this.el.getBoundingClientRect();
    this.setViewport(r.width, r.height);
  };

  /** Listen on the game surface (usually the full-screen container behind the UI). */
  attach(el: HTMLElement, win: Window = window): void {
    this.detach();
    this.el = el;
    this.win = win;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerUp);
    el.addEventListener('lostpointercapture', this.onPointerUp);
    win.addEventListener('keydown', this.onKeyDown);
    win.addEventListener('keyup', this.onKeyUp);
    win.addEventListener('blur', this.onBlur);
    win.addEventListener('resize', this.onResize);
    this.gyro.attach(win as never);
    this.onResize();
  }

  detach(): void {
    const el = this.el;
    const win = this.win;
    if (el) {
      el.removeEventListener('pointerdown', this.onPointerDown);
      el.removeEventListener('pointermove', this.onPointerMove);
      el.removeEventListener('pointerup', this.onPointerUp);
      el.removeEventListener('pointercancel', this.onPointerUp);
      el.removeEventListener('lostpointercapture', this.onPointerUp);
    }
    if (win) {
      win.removeEventListener('keydown', this.onKeyDown);
      win.removeEventListener('keyup', this.onKeyUp);
      win.removeEventListener('blur', this.onBlur);
      win.removeEventListener('resize', this.onResize);
      this.gyro.detach(win as never);
    }
    this.el = null;
    this.win = null;
    this.releaseAll();
  }
}
