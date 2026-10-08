// KANAT audio engine (owner: audio). Raw Web Audio, everything synthesized in code.
//
// Lifecycle: prepare() during loading (pre-generates all PCM, chunked) → unlock() inside the first
// user gesture (creates/resumes the AudioContext; nothing ever auto-starts) → per frame setFlight()
// (allocation-free) + event() for SimEvents/UI/SÜRÜ events → suspend()/resume() for background or
// host pause → dispose(). The same graph can be attached to an OfflineAudioContext for measurement.
import type { Settings } from '../core/settings.ts';
import type { FlightPhase, FlightState, SimEvent, SurfaceClass } from '../sim/types.ts';
import { Ambience } from './ambience.ts';
import type { SuruAudioState } from './ambience.ts';
import { BufferCache, IR_KEY, SoundBank } from './bank.ts';
import { clamp } from './dsp.ts';
import { Haptics } from './haptics.ts';
import type { HapticSink } from './haptics.ts';
import { Mixer } from './mixer.ts';
import type { Volumes } from './mixer.ts';
import { MusicEngine } from './music/MusicEngine.ts';
import { THEMES, suruSection } from './music/patterns.ts';
import type { MusicWorld } from './music/patterns.ts';
import type { MusicTargets } from './music/MusicEngine.ts';
import { IntensityTracker } from './music/scheduler.ts';
import { Rng } from './rng.ts';
import { multToneMidi } from './scales.ts';
import { SFX } from './sfxLib.ts';
import type { SfxId } from './sfxLib.ts';
import { VoicePool } from './voices.ts';
import { WindEngine } from './wind.ts';
import type { WindInput } from './wind.ts';

export type { SuruAudioState } from './ambience.ts';
export type { MusicWorld } from './music/patterns.ts';
export type { HapticSink, HapticMode, HapticName } from './haptics.ts';

/** Per-frame flight input. Pass the same (reused) object every frame; all fields optional. */
export interface FlightAudioInput {
  /** Airspeed m/s (alias: `speed`). */
  speedMs?: number;
  speed?: number;
  /** Roll rate rad/s (sign = direction). */
  bankRate?: number;
  /** Distance to nearest surface in metres (Infinity if none). */
  prox?: number;
  /** Surface class of the nearest surface (fly-by texture). */
  proxCls?: SurfaceClass;
  /** Side of the nearest surface relative to the pilot: −1 left, +1 right, 0 unknown. */
  proxSide?: number;
  /** Proximity multiplier 0/1/2/3/5. */
  mult?: number;
  /** Combo K 1..3. */
  combo?: number;
  /** Cloud immersion 0..1 (or boolean). */
  inCloud?: number | boolean;
  canopy?: boolean;
  phase?: FlightPhase;
  /** Inside a thermal column (alternative to thermalEnter/Exit events). */
  thermal?: boolean;
}

/** Any event: a SimEvent, or an extra UI / SÜRÜ / flow event `{ type, ...params }`. */
export type AudioEvent = SimEvent | { type: string; [k: string]: unknown };

type Loose = Record<string, unknown>;

function num(e: Loose, k: string, d: number): number {
  const v = e[k];
  return typeof v === 'number' && Number.isFinite(v) ? v : d;
}

function str(e: Loose, k: string, d: string): string {
  const v = e[k];
  return typeof v === 'string' ? v : d;
}

type Ctor = new (opts?: AudioContextOptions) => AudioContext;

function audioCtor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

const FLYBY_D = 7;
/** Wind speed (m/s) used when no flight input arrives (menu, SÜRÜ, pause). */
const BREEZE = 6;

/** Public music controller (`engine.music`). Works before unlock: state is applied once running. */
export class MusicController {
  private readonly eng: AudioEngine;
  world: MusicWorld | null = null;
  manual: [boolean, boolean, boolean] | null = null;
  calm = false;

  constructor(eng: AudioEngine) {
    this.eng = eng;
  }

  /** 'kapadokya' … 'pamukkale' | 'menu' | 'suru' | null (silence music; wind stays). */
  setWorld(id: MusicWorld | null, opts?: { calm?: boolean }): void {
    this.world = id;
    if (opts && opts.calm !== undefined) this.calm = opts.calm;
    this.eng.onMusicChanged();
  }

  /** Manual layer override (booleans or 0..1 levels; ≥ 0.5 = on). Applied on the next bar. */
  setIntensity(k1: boolean | number, k2: boolean | number, k3: boolean | number): void {
    const on = (v: boolean | number) => (typeof v === 'boolean' ? v : v >= 0.5);
    this.manual = [on(k1), on(k2), on(k3)];
    this.eng.onMusicChanged();
  }

  /** Return to automatic intensity (driven by setFlight / suru.setState). */
  clearIntensity(): void {
    this.manual = null;
    this.eng.onMusicChanged();
  }

  /** Free Flight calm layer: pad + sparse melody only. */
  setCalm(on: boolean): void {
    this.calm = on;
    this.eng.onMusicChanged();
  }
}

/** Public SÜRÜ controller (`engine.suru`). */
export class SuruController {
  private readonly eng: AudioEngine;
  state: SuruAudioState = { flockSize: 16, density: 0.3, timeFrac: 0, tight: false };

  constructor(eng: AudioEngine) {
    this.eng = eng;
  }

  setState(s: Partial<SuruAudioState>): void {
    const st = this.state;
    if (s.flockSize !== undefined) st.flockSize = s.flockSize;
    if (s.density !== undefined) st.density = s.density;
    if (s.timeFrac !== undefined) st.timeFrac = s.timeFrac;
    if (s.tight !== undefined) st.tight = s.tight;
    this.eng.onSuruChanged();
  }
}

export interface AttachOptions {
  /** Start music at full level instead of fading in (offline measurement). */
  instantMusic?: boolean;
  /** Destination override (defaults to ctx.destination). */
  destination?: AudioNode;
}

export class AudioEngine {
  readonly bank: SoundBank;
  readonly haptics: Haptics;
  readonly music: MusicController;
  readonly suru: SuruController;

  private ctx: BaseAudioContext | null = null;
  private ownsCtx = false;
  private offline = false;
  private built = false;
  private disposed = false;
  private mixer: Mixer | null = null;
  private cache: BufferCache | null = null;
  private sfx: VoicePool | null = null;
  private ui: VoicePool | null = null;
  private amb: VoicePool | null = null;
  private wind: WindEngine | null = null;
  private ambience: Ambience | null = null;
  private musicEng: MusicEngine | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly suspendReasons = new Set<string>();
  private readonly listeners: (() => void)[] = [];
  private instantMusic = false;
  private vol: Volumes = { master: 0.9, music: 0.7, sfx: 0.9, muted: false };

  // ---- flight state (scalars only: setFlight is allocation-free)
  private speed = 0;
  private bankRate = 0;
  private prox = Infinity;
  private proxCls: SurfaceClass = 'none';
  private proxSide = 0;
  private mult = 0;
  private combo = 1;
  private cloud = 0;
  private canopy = false;
  private phase: FlightPhase = 'intro';
  private thermalOn = false;
  private lastFlightCtx = 0;
  private readonly intensity = new IntensityTracker();
  // close-pass tracker
  private passArmed = true;
  private passIn = false;
  private passMin = Infinity;
  private passCls: SurfaceClass = 'none';
  private passSide = 0;
  private passLastAt = -10;
  private passAlt = 1;
  // misc
  private lastCloud = -1;
  private lastJumpAt = -10;
  private lastKusatmaRise = -10;
  private lastPumpCtx = 0;
  private musicDirty = true;
  private hasFlight = false;
  private pauseMuffled = false;
  private readonly rng = new Rng(0x41554449);

  constructor(opts: { haptics?: Haptics; bank?: SoundBank } = {}) {
    this.bank = opts.bank ?? new SoundBank();
    this.haptics = opts.haptics ?? new Haptics();
    this.music = new MusicController(this);
    this.suru = new SuruController(this);
  }

  // ===========================================================================================
  // Lifecycle

  /** Pre-generate every sound (call during loading): inline Web Worker, main-thread slices as fallback. */
  prepare(onProgress?: (k: number) => void): Promise<void> {
    return this.bank.prepare(12, onProgress);
  }

  get unlocked(): boolean {
    return !!this.ctx && (this.offline || (this.ctx as AudioContext).state === 'running');
  }

  get context(): BaseAudioContext | null {
    return this.ctx;
  }

  get ready(): boolean {
    return this.built;
  }

  /**
   * Create/resume the AudioContext. MUST be called from a user-gesture handler (pointerup/touchend/
   * click/keydown). Safe to call repeatedly (also resumes after iOS interruptions).
   */
  unlock(): Promise<boolean> {
    if (this.disposed) return Promise.resolve(false);
    if (!this.ctx) {
      const C = audioCtor();
      if (!C) return Promise.resolve(false);
      // iOS 16.4+: respect the ring/silent switch and mix with other apps' audio.
      try {
        const nav = navigator as Navigator & { audioSession?: { type: string } };
        if (nav.audioSession) nav.audioSession.type = 'ambient';
      } catch {
        // unsupported
      }
      let ctx: AudioContext;
      try {
        ctx = new C({ latencyHint: 'interactive' });
      } catch {
        return Promise.resolve(false);
      }
      this.ownsCtx = true;
      this.attachContext(ctx);
      // Legacy iOS unlock: play one silent sample inside the gesture.
      try {
        const b = ctx.createBuffer(1, 1, 22050);
        const s = ctx.createBufferSource();
        s.buffer = b;
        s.connect(ctx.destination);
        s.start(0);
      } catch {
        // ignore
      }
      ctx.onstatechange = () => this.onStateChange();
    }
    const ctx = this.ctx as AudioContext;
    if (this.offline) return Promise.resolve(true);
    if (ctx.state !== 'running' && this.suspendReasons.size === 0) {
      // resume() is invoked synchronously inside the gesture; awaiting afterwards is fine.
      return ctx.resume().then(
        () => {
          this.startTimer();
          return (ctx.state as string) === 'running';
        },
        () => false,
      );
    }
    this.startTimer();
    return Promise.resolve(ctx.state === 'running');
  }

  /**
   * Attach to an existing context (OfflineAudioContext for measurement, or a host-provided one).
   * The graph is built immediately when the bank is ready, otherwise as soon as prepare() finishes.
   */
  attachContext(ctx: BaseAudioContext, opts: AttachOptions = {}): void {
    if (this.ctx) return;
    this.ctx = ctx;
    this.offline = typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;
    this.instantMusic = !!opts.instantMusic;
    const build = () => {
      if (this.disposed || this.built || this.ctx !== ctx) return;
      // A context we own is the only consumer of the bank: drop JS copies after upload.
      const cache = new BufferCache(ctx, this.bank, this.ownsCtx);
      this.cache = cache;
      const mixer = new Mixer(ctx, cache.getAtContextRate(IR_KEY), opts.destination ?? ctx.destination);
      this.mixer = mixer;
      this.sfx = new VoicePool(ctx, cache, mixer.sfxIn, 16);
      this.ui = new VoicePool(ctx, cache, mixer.uiIn, 6);
      this.amb = new VoicePool(ctx, cache, mixer.ambIn, 8);
      this.wind = new WindEngine(ctx, cache, mixer.ambIn);
      this.ambience = new Ambience(ctx, cache, this.amb, mixer.ambIn);
      this.musicEng = new MusicEngine(ctx, cache, mixer.musicIn, mixer.verbIn);
      if (this.instantMusic) this.musicEng.fadeIn = 0;
      mixer.setVolumes(this.vol);
      if (this.pauseMuffled) mixer.muffle(true);
      this.built = true;
      this.musicDirty = true;
      this.updateWind();
      this.pump();
      if (!this.offline) this.startTimer();
    };
    if (this.bank.ready) build();
    else void this.bank.prepare().then(build);
  }

  private onStateChange(): void {
    const ctx = this.ctx as AudioContext | null;
    if (!ctx) return;
    const st = ctx.state as string;
    if (st === 'running') this.startTimer();
    else this.stopTimer();
    // 'interrupted' (iOS call/Siri) or an OS-initiated suspend: the next gesture or visibility
    // change re-runs unlock() → resume().
  }

  private startTimer(): void {
    if (this.timer || this.offline || this.disposed || !this.built) return;
    if (this.suspendReasons.size) return;
    this.timer = setInterval(() => this.pump(), 25);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Pause all audio (background, host `pause`). Reasons stack: resume only when all cleared. */
  suspend(reason = 'host'): void {
    this.suspendReasons.add(reason);
    this.stopTimer();
    const ctx = this.ctx as AudioContext | null;
    if (ctx && !this.offline && ctx.state === 'running') void ctx.suspend().catch(() => undefined);
  }

  resume(reason = 'host'): void {
    this.suspendReasons.delete(reason);
    if (this.suspendReasons.size) return;
    const ctx = this.ctx as AudioContext | null;
    if (!ctx || this.offline) return;
    if (ctx.state !== 'running') {
      void ctx.resume().then(() => this.startTimer(), () => undefined);
    } else this.startTimer();
  }

  /**
   * Convenience wiring: unlock on the first gesture (and re-resume after iOS interruptions),
   * suspend on visibilitychange/pagehide. Returns a remover. Optional — hosts may wire their own.
   */
  installAutoLifecycle(target: Window = window): () => void {
    const gesture = () => {
      void this.unlock();
    };
    const opts: AddEventListenerOptions = { passive: true, capture: true };
    for (const ev of ['pointerup', 'touchend', 'click', 'keydown']) target.addEventListener(ev, gesture, opts);
    const vis = () => {
      if (target.document.hidden) this.suspend('hidden');
      else this.resume('hidden');
    };
    const hide = () => this.suspend('hidden');
    const show = () => this.resume('hidden');
    target.document.addEventListener('visibilitychange', vis);
    target.addEventListener('pagehide', hide);
    target.addEventListener('pageshow', show);
    const remove = () => {
      for (const ev of ['pointerup', 'touchend', 'click', 'keydown']) target.removeEventListener(ev, gesture, opts);
      target.document.removeEventListener('visibilitychange', vis);
      target.removeEventListener('pagehide', hide);
      target.removeEventListener('pageshow', show);
    };
    this.listeners.push(remove);
    return remove;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopTimer();
    for (const r of this.listeners) r();
    this.listeners.length = 0;
    this.musicEng?.dispose();
    this.ambience?.dispose();
    this.wind?.dispose();
    this.sfx?.dispose();
    this.ui?.dispose();
    this.amb?.dispose();
    this.mixer?.dispose();
    this.haptics.reset();
    const ctx = this.ctx as AudioContext | null;
    if (ctx && this.ownsCtx && typeof ctx.close === 'function') void ctx.close().catch(() => undefined);
    this.ctx = null;
    this.built = false;
  }

  // ===========================================================================================
  // Settings

  setVolumes(v: Partial<Volumes>): void {
    if (v.master !== undefined) this.vol.master = v.master;
    if (v.music !== undefined) this.vol.music = v.music;
    if (v.sfx !== undefined) this.vol.sfx = v.sfx;
    if (v.muted !== undefined) this.vol.muted = v.muted;
    this.mixer?.setVolumes(this.vol);
  }

  /** Apply the shared Settings block (volumes, mute, haptics mode). */
  applySettings(s: Settings): void {
    this.setVolumes({ master: s.masterVolume, music: s.musicVolume, sfx: s.sfxVolume, muted: s.muted });
    this.haptics.setMode(s.haptics);
  }

  /** Pause overlay: music + world sounds muffled (not silent); UI sounds stay clear. */
  setPauseMuffle(on: boolean): void {
    this.pauseMuffled = on;
    this.mixer?.muffle(on);
  }

  setHapticSink(sink: HapticSink | null): void {
    this.haptics.setSink(sink);
  }

  // ===========================================================================================
  // Per-frame flight input (allocation-free)

  setFlight(f: FlightAudioInput): void {
    const ctxNow = this.ctx ? this.ctx.currentTime : 0;
    const dt = this.hasFlight ? clamp(ctxNow - this.lastFlightCtx, 0, 0.25) : 0;
    this.hasFlight = true;
    this.lastFlightCtx = ctxNow;
    if (f.speedMs !== undefined) this.speed = f.speedMs;
    else if (f.speed !== undefined) this.speed = f.speed;
    if (f.bankRate !== undefined) this.bankRate = f.bankRate;
    if (f.prox !== undefined) this.prox = f.prox;
    if (f.proxCls !== undefined) this.proxCls = f.proxCls;
    if (f.proxSide !== undefined) this.proxSide = f.proxSide;
    if (f.mult !== undefined) this.mult = f.mult;
    if (f.combo !== undefined) this.combo = f.combo;
    if (f.inCloud !== undefined) this.cloud = typeof f.inCloud === 'boolean' ? (f.inCloud ? 1 : 0) : clamp(f.inCloud, 0, 1);
    if (f.canopy !== undefined) this.canopy = f.canopy;
    if (f.phase !== undefined && f.phase !== this.phase) this.onPhase(f.phase);
    if (f.thermal !== undefined && f.thermal !== this.thermalOn) this.setThermal(f.thermal);

    this.intensity.update(this.speed, this.combo, this.mult, dt);
    this.haptics.update();
    if (!this.built) return;
    this.updateWind();
    if (Math.abs(this.cloud - this.lastCloud) > 0.02) {
      this.lastCloud = this.cloud;
      this.mixer?.cloud(this.cloud);
    }
    this.trackClosePass(ctxNow);
    this.musicDirty = true;
    // Keep the scheduler fed even if the timer is throttled.
    if (ctxNow - this.lastPumpCtx > 0.05) this.pump();
  }

  private readonly windIn: WindInput = { speedMs: 0, bankRate: 0, canopy: false, cloud: 0 };

  private updateWind(): void {
    const w = this.wind;
    if (!w) return;
    const wi = this.windIn;
    wi.speedMs = this.speed;
    wi.bankRate = this.bankRate;
    wi.canopy = this.canopy;
    wi.cloud = this.cloud;
    w.update(wi);
    this.ambience?.setWindMask(clamp((this.speed - 20) / 40, 0, 1));
  }

  private onPhase(p: FlightPhase): void {
    const prev = this.phase;
    this.phase = p;
    const now = this.ctx ? this.ctx.currentTime : 0;
    if (p === 'jump' && now - this.lastJumpAt > 1) this.play('jump');
    if (p !== 'crashed' && prev === 'crashed') this.mixer?.crashFilter(false);
    if (p === 'intro') {
      this.intensity.reset();
      this.mixer?.crashFilter(false);
    }
    if (p === 'crashed' || p === 'landed' || p === 'halfFlight' || p === 'intro') this.setThermal(false);
  }

  private setThermal(on: boolean): void {
    this.thermalOn = on;
    this.haptics.setThermal(on);
    this.ambience?.setThermal(on);
  }

  private trackClosePass(now: number): void {
    if (this.phase !== 'flying' && this.phase !== 'jump') {
      this.passIn = false;
      return;
    }
    const d = this.prox;
    if (d < FLYBY_D) {
      if (!this.passIn) {
        this.passIn = true;
        this.passMin = d;
        this.passCls = this.proxCls;
        this.passSide = this.proxSide;
        this.passArmed = true;
      } else if (d < this.passMin) {
        this.passMin = d;
        this.passCls = this.proxCls;
        this.passSide = this.proxSide;
      } else if (this.passArmed && d > this.passMin + 0.6 && now - this.passLastAt > 0.35) {
        // Closest approach just passed → "vuuş".
        this.flyBy(this.passCls, this.passSide, this.passMin);
        this.passArmed = false;
        this.passLastAt = now;
      }
      // Re-arm when the surface recedes noticeably then approaches again (skimming a ridge line).
      if (!this.passArmed && d > this.passMin + 2.5) {
        this.passArmed = true;
        this.passMin = d;
      }
    } else if (this.passIn) {
      if (this.passArmed && now - this.passLastAt > 0.35) {
        this.flyBy(this.passCls, this.passSide, this.passMin);
        this.passLastAt = now;
      }
      this.passIn = false;
      this.passMin = Infinity;
    }
  }

  private flyBy(cls: SurfaceClass | string, side: number, d: number): void {
    const key: SfxId = cls === 'water' ? 'flyWater' : cls === 'tree' ? 'flyTree' : 'flyRock';
    const near = clamp(1 - d / FLYBY_D, 0, 1);
    const sp = clamp(this.speed / 60, 0.3, 1.2);
    const db = SFX[key].db - 14 * (1 - near) + 4 * (sp - 1);
    let s = side;
    if (!s) {
      this.passAlt = -this.passAlt;
      s = this.passAlt * 0.3;
    }
    const pan = clamp(s, -1, 1) * 0.85;
    const rate = clamp(0.82 + this.speed / 160, 0.8, 1.35);
    this.amb?.play(key, db, SFX[key].prio, pan * 0.3, rate, 0, pan, 0.12);
  }

  // ===========================================================================================
  // Events

  event(e: AudioEvent): void {
    const x = e as unknown as Loose;
    const now = this.ctx ? this.ctx.currentTime : 0;
    switch (e.type) {
      // ---------------------------------------------------------------- flight SimEvents
      case 'wingsOpen':
        this.play('wingsOpen');
        this.haptics.play('kanat');
        this.mixer?.duck(2, 0.4);
        break;
      case 'multUp': {
        const m = num(x, 'mult', 1);
        const mm = m >= 5 ? 5 : m >= 3 ? 3 : m >= 2 ? 2 : 1;
        const key: SfxId = mm === 5 ? 'mult5' : mm === 3 ? 'mult3' : mm === 2 ? 'mult2' : 'mult1';
        // Clips are rendered in C (C5 E5 G5 C6); movable-do transposes them to the music tonic.
        const pc = this.musicEng ? this.musicEng.tonicPc() : 0;
        const st = multToneMidi(mm, pc) - multToneMidi(mm, 0);
        this.play(key, 0, 0, Math.pow(2, st / 12));
        this.haptics.play('çift');
        break;
      }
      case 'comboBreak':
        this.play('comboBreak');
        this.haptics.play('yumuşak');
        break;
      case 'graze': {
        const s = clamp(num(x, 'strength', 1), 0, 1);
        const side = num(x, 'side', 0);
        this.play('graze', -4 + 4 * s, clamp(side, -1, 1) * 0.75, 0.96 + 0.08 * s);
        this.haptics.play('hafif');
        this.mixer?.duck(4, 0.35);
        break;
      }
      case 'closePass':
        this.flyBy(str(x, 'cls', 'rock'), num(x, 'side', 0), num(x, 'd', 3));
        break;
      case 'gate': {
        const chain = Math.max(1, num(x, 'chain', 1));
        const steps = [0, 2, 4, 7, 9];
        const st = steps[Math.min(steps.length - 1, chain - 1)];
        this.play('gateChime', 0, 0, Math.pow(2, st / 12));
        this.haptics.play('kapı');
        this.mixer?.duck(2.5, 0.5);
        break;
      }
      case 'gateMissed':
        this.play('gateMiss');
        break;
      case 'thermalEnter':
        this.setThermal(true);
        break;
      case 'thermalExit':
        this.setThermal(false);
        break;
      case 'balloonThread':
        this.play('burner');
        this.play('warmChime', 0, 0, 1, 0.12);
        this.haptics.play('orta');
        this.mixer?.duck(5, 1.2);
        break;
      case 'bounce': {
        const cls = str(x, 'cls', 'rock');
        this.play(cls === 'water' ? 'bounceWater' : 'bounceScrape');
        this.haptics.play('orta');
        break;
      }
      case 'crash':
        this.play('crashVumf');
        this.mixer?.duck(3, 0.6);
        this.mixer?.crashFilter(true);
        this.setThermal(false);
        this.haptics.play('çarpma');
        break;
      case 'enterLandingZone':
        this.play('landingCue');
        this.haptics.play('hafif');
        break;
      case 'parachuteOpen':
        this.play('parachutePat');
        this.play('silkRustle', 0, 0, 1, 0.06);
        this.haptics.play('paraşüt');
        this.mixer?.duck(3, 0.8);
        break;
      case 'landed': {
        const soft = x.soft === true;
        this.play(soft ? 'landSoft' : 'landThud');
        this.haptics.play(soft ? 'hafif' : 'orta');
        this.setThermal(false);
        break;
      }
      case 'halfFlight':
        this.play('halfFlight');
        break;
      // ---------------------------------------------------------------- flow extras
      case 'jump':
        this.lastJumpAt = now;
        this.play('jump');
        this.haptics.play('hafif');
        break;
      case 'burner':
        if (x.far === true) this.amb?.play('burnerFar', SFX.burnerFar.db, 1, num(x, 'pan', 0));
        else this.play('burner', 0, num(x, 'pan', 0));
        break;
      case 'star':
        this.play('starTok', 0, 0, 1 + 0.03 * num(x, 'index', 0));
        this.haptics.play('yıldız');
        this.mixer?.duck(5, 0.6);
        break;
      case 'tally':
        this.play('tallyTick', 0, 0, 1 + 0.02 * (num(x, 'i', 0) % 12));
        break;
      case 'tallyEnd':
        this.play('tallyEnd');
        break;
      case 'uiTap':
        this.play('uiTap');
        break;
      case 'uiSwish':
        this.play('uiSwish');
        break;
      case 'uiConfirm':
        this.play('uiConfirm');
        break;
      case 'uiBack':
        this.play('uiBack');
        break;
      case 'uiToggle':
        this.play('uiToggle');
        break;
      case 'reward':
        this.play('reward');
        this.haptics.play('yıldız');
        break;
      case 'photo':
        this.play('photoShutter');
        this.haptics.play('hafif');
        break;
      case 'collisionWarn':
        this.play('collisionBeep', 0, clamp(num(x, 'side', 0), -1, 1) * 0.7);
        this.haptics.play('uyarı');
        break;
      case 'restart':
        this.mixer?.crashFilter(false);
        this.intensity.reset();
        this.setThermal(false);
        break;
      // ---------------------------------------------------------------- SÜRÜ.io
      case 'suruJoin':
        this.play('joinFlutter', -6 + 6 * clamp(num(x, 'count', 10) / 30, 0, 1), num(x, 'pan', 0));
        break;
      case 'suruConvert':
        this.play('convertTicks', -6 + 6 * clamp(Math.log10(1 + num(x, 'count', 5)) / 2, 0, 1), num(x, 'pan', 0), 0.95 + this.rng.next() * 0.1);
        break;
      case 'kusatmaStart':
        this.lastKusatmaRise = now;
        this.play('kusatmaRise', 0, num(x, 'pan', 0));
        break;
      case 'kusatma':
        this.play('kusatmaChord', 0, num(x, 'pan', 0) * 0.4);
        if (now - this.lastKusatmaRise > 2) this.play('kusatmaRise', -2, num(x, 'pan', 0), 1, 0.05);
        this.play('convertTicks', -2, -num(x, 'pan', 0) * 0.5, 1, 0.45);
        this.mixer?.duck(7, 2.2);
        this.haptics.play('kuşatma');
        break;
      case 'hawkWarn':
        this.play('hawkWhistle', 0, num(x, 'pan', 0));
        this.haptics.play('hafif');
        break;
      case 'gustWarn':
        this.amb?.play('gustWhoosh', SFX.gustWhoosh.db, 2, num(x, 'pan', 0) * 0.3, 1, 0, num(x, 'pan', 0), 1.6);
        break;
      case 'stormStart':
        this.ambience?.setStorm(true);
        break;
      case 'stormEnd':
        this.ambience?.setStorm(false);
        break;
      case 'thunder':
        this.amb?.play('thunder', SFX.thunder.db, 2, num(x, 'pan', 0));
        break;
      case 'lighthouse':
      case 'sunsetBell':
        this.play('sunsetBell');
        this.mixer?.duck(4, 2.0);
        break;
      case 'roundEnd':
        this.play('roundEnd', x.win === false ? -3 : 0);
        this.mixer?.duck(6, 2.5);
        this.haptics.play('orta');
        break;
      case 'eliminated':
        this.play('eliminated');
        this.haptics.play('yumuşak');
        break;
      case 'breathEmpty':
        this.play('breathEmpty');
        break;
      default:
        break;
    }
  }

  /** Play a library sound directly (dB offset, pan, rate, delay). */
  play(id: SfxId, dbOffset = 0, pan = 0, rate = 1, delay = 0): boolean {
    const def = SFX[id];
    if (!def || def.loop) return false;
    const pool = def.bus === 'ui' ? this.ui : def.bus === 'amb' ? this.amb : this.sfx;
    if (!pool) return false;
    return pool.play(id, def.db + dbOffset, def.prio, pan, rate, delay);
  }

  // ===========================================================================================
  // Music / SÜRÜ plumbing

  /** @internal called by MusicController */
  onMusicChanged(): void {
    this.musicDirty = true;
    if (this.built) this.pump();
  }

  /** @internal called by SuruController */
  onSuruChanged(): void {
    this.ambience?.setSuru(this.suru.state);
    this.musicDirty = true;
  }

  private readonly targets: MusicTargets = { world: null, k1: false, k2: false, k3: false, calm: false, section: 0 };
  private lastScene: MusicWorld | null | undefined = undefined;

  /** Resolve the music targets (world, layers, section) from controllers + flight/SÜRÜ state. */
  private musicTargets(): MusicTargets {
    const tg = this.targets;
    const mc = this.music;
    const world = mc.world;
    tg.world = world;
    tg.calm = mc.calm;
    tg.k1 = tg.k2 = tg.k3 = false;
    tg.section = 0;
    if (!world) return tg;
    if (mc.manual) {
      tg.k1 = mc.manual[0];
      tg.k2 = mc.manual[1];
      tg.k3 = mc.manual[2];
    } else if (world === 'suru') {
      const s = this.suru.state;
      tg.k1 = s.flockSize >= 30;
      tg.k2 = s.flockSize >= 120 || s.tight;
      tg.k3 = s.flockSize >= 250;
    } else if (world === 'menu' || !this.hasFlight) {
      const idle = THEMES[world].idle;
      tg.k1 = idle[0];
      tg.k2 = idle[1];
      tg.k3 = idle[2];
    } else {
      tg.k1 = this.intensity.k1;
      tg.k2 = this.intensity.k2;
      tg.k3 = this.intensity.k3;
    }
    if (world === 'suru') tg.section = suruSection(this.suru.state.timeFrac);
    return tg;
  }

  /** Scheduler tick: runs from a 25 ms timer (real time) or manually (offline rendering). */
  pump(): void {
    const ctx = this.ctx;
    if (!ctx || !this.built) return;
    const now = ctx.currentTime;
    this.lastPumpCtx = now;
    // No flight input for a while (menu, SÜRÜ, pause screens) → wind relaxes to a gentle breeze.
    if (!this.offline && (!this.hasFlight || now - this.lastFlightCtx > 0.6) && Math.abs(this.speed - BREEZE) > 0.05) {
      this.speed += (BREEZE - this.speed) * (this.hasFlight ? 0.05 : 1);
      this.bankRate *= 0.9;
      this.updateWind();
    }
    if (this.musicDirty) {
      this.musicDirty = false;
      const tg = this.musicTargets();
      this.musicEng?.apply(tg);
      if (this.lastScene !== tg.world) {
        this.lastScene = tg.world;
        this.ambience?.setScene(tg.world ? THEMES[tg.world].ambience : []);
      }
    }
    this.musicEng?.pump();
    this.ambience?.pump();
  }

  /**
   * Slow-changing music intensity for audio-reactive visuals: 0..3 active layers, changes at most
   * once per bar (≤ 1 Hz) so visuals driven by it cannot flash above 3 Hz (§2.13).
   */
  musicIntensity(): number {
    const p = this.musicEng?.current;
    if (!p) return 0;
    const g = p.gates.active;
    return (g[0] ? 1 : 0) + (g[1] ? 1 : 0) + (g[2] ? 1 : 0);
  }

  /** Diagnostics for the dev page / perf panel. */
  stats(): { state: string; voices: number; sfx: number; bankMs: number; bankMB: number; section: number } {
    const ctx = this.ctx as AudioContext | null;
    return {
      state: ctx ? (this.offline ? 'offline' : String(ctx.state)) : 'none',
      voices: this.musicEng?.current?.voices ?? 0,
      sfx: (this.sfx?.active() ?? 0) + (this.ui?.active() ?? 0) + (this.amb?.active() ?? 0),
      bankMs: Math.round(this.bank.genMs),
      bankMB: Math.round((this.bank.bytes() / 1048576) * 10) / 10,
      section: this.targets.section,
    };
  }
}

/** Fills a reusable FlightAudioInput from the sim's FlightState (bank rate + proximity side). */
export class FlightAudioAdapter {
  readonly out: FlightAudioInput = {
    speedMs: 0,
    bankRate: 0,
    prox: Infinity,
    proxCls: 'none',
    proxSide: 0,
    mult: 0,
    combo: 1,
    inCloud: 0,
    canopy: false,
    phase: 'intro',
    thermal: false,
  };
  private prevPhi = 0;
  private prevT = -1;

  fill(s: FlightState, inCloud = 0): FlightAudioInput {
    const o = this.out;
    const dt = this.prevT < 0 ? 0 : s.timeSec - this.prevT;
    o.bankRate = dt > 1e-4 ? (s.phi - this.prevPhi) / dt : 0;
    this.prevPhi = s.phi;
    this.prevT = s.timeSec;
    o.speedMs = s.speed;
    o.prox = s.prox.d;
    o.proxCls = s.prox.cls;
    // Right vector for heading ψ (0 = −z, clockwise to +x): (cos ψ, 0, sin ψ).
    const rx = Math.cos(s.psi);
    const rz = Math.sin(s.psi);
    const lat = (s.prox.nearest[0] - s.pos[0]) * rx + (s.prox.nearest[2] - s.pos[2]) * rz;
    o.proxSide = Number.isFinite(lat) ? (lat > 0.3 ? 1 : lat < -0.3 ? -1 : 0) : 0;
    o.mult = s.prox.mult;
    o.combo = s.combo;
    o.inCloud = inCloud;
    o.canopy = s.canopyOpen;
    o.phase = s.phase;
    o.thermal = s.inThermal >= 0;
    return o;
  }
}

let shared: AudioEngine | null = null;

/** App-wide engine instance (created lazily; no AudioContext until unlock()). */
export function getAudioEngine(): AudioEngine {
  if (!shared) shared = new AudioEngine();
  return shared;
}
