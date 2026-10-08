// FlightSession (integrator): one flight on one route, reused by Kariyer, FTUE film, Günün Rotası, Hayalet
// Düello and Serbest Uçuş. Owns the deterministic 60 Hz FlightSim (driven by the platform GameLoop), input →
// quantized commands (recorded into the ghost Recorder BEFORE sim.step), ghost sims + ghost pilots, cameras
// (intro / follow / canopy / landing / crash replay), HUD, VFX, audio, haptics and the crash → hit-stop →
// slow-motion replay → retry (< 1 s) loop. Mode-specific behaviour (results, scoring metric, FTUE beats,
// free-flight rewind) plugs in through SessionHooks. Zero allocation per tick in steady state.
import * as THREE from 'three';
import type { App } from '../core/boot.ts';
import { pushLayer, type LayerHandle } from '../core/layers.ts';
import { markTime } from '../debug/testApi.ts';
import { FlightAudioAdapter, type AudioEngine } from '../audio/AudioEngine.ts';
import { createFlightStatsTracker, type FlightStatsTracker } from '../content/meta/flightStats.ts';
import type { AssistLevel as MetaAssist, FlightMode, FlightStats } from '../content/meta/types.ts';
import { FollowCamera, IntroCamera, ReplayDirector, type ReplayFrame } from '../render/camera/index.ts';
import { FlightSim, CrashBuffer, type AssistLevel } from '../sim/FlightSim.ts';
import { ProximityStripAccumulator } from '../sim/replay/proximityStrip.ts';
import { Recorder } from '../sim/replay/recorder.ts';
import { ReplayCursor } from '../sim/replay/playback.ts';
import { encodeGhostCode, type GhostHeader, type GhostInput, type GhostMode } from '../sim/replay/ghostCode.ts';
import { SIM_VERSION } from '../sim/version.ts';
import type { Command, FlightState, RouteDef, SimEvent } from '../sim/types.ts';
import { UI } from '../ui/UI.ts';
import type { FtueKind } from '../ui/hud/FlightHud.ts';
import { LineBot, type BotPolicy } from './bots/LineBot.ts';
import type { Scene3D } from './Scene3D.ts';
import type { StageWorld } from './WorldStore.ts';

export type SessionMode = 'career' | 'daily' | 'duel' | 'free' | 'ftue';
export type IntroKind = 'full' | 'skip' | 'film';

export interface SessionGhost {
  input: GhostInput;
  header: GhostHeader;
  name: string;
  color?: string;
}

export interface SessionOptions {
  mode: SessionMode;
  world: StageWorld;
  route: RouteDef;
  seed: number;
  metric: 'score' | 'time';
  assist: AssistLevel;
  guideWind: boolean;
  slowMode: boolean;
  autoParachute: boolean;
  freeFlight: boolean;
  intro: IntroKind;
  ghosts: SessionGhost[];
  playerName: string;
  /** Packed into the ghost header suitId (cosmetic + replay-relevant sim options, see packSuitId). */
  suitId: number;
  ghostMode: GhostMode;
  routeRef: number;
  /** Daily: missed gates add 2 s each to the result time. */
  gatePenaltySec: number;
  /** Seconds of HUD "Atla" wait before a gentle re-pulse (FTUE uses beats instead). */
  reduceMotion: boolean;
}

export interface SessionResult {
  kind: 'landed' | 'half';
  score: number;
  timeSec: number;
  /** Result time incl. gate penalties (ms). */
  resultTimeMs: number;
  stars: number;
  stats: FlightStats;
  strip: number[];
  code: string | null;
  header: GhostHeader | null;
  breakdown: FlightSim['breakdown'];
  gatesMissed: number;
  /** Player time minus ghost time per ghost (s, negative = player ahead), NaN when the ghost did not finish. */
  ghostDeltas: number[];
  crashes: number;
  distToTarget: number;
  assistUsed: boolean;
}

export interface SessionHooks {
  /** Flight finished (landed / half flight) — the mode shows results. */
  onFinished(r: SessionResult): void;
  /** Crash happened (before the replay). Return true to suppress the default replay + retry (free flight rewind). */
  onCrash?(e: Extract<SimEvent, { type: 'crash' }>, s: FlightSession): boolean;
  /** After every retry reset (dynamic help card etc.). */
  onRetry?(s: FlightSession): void;
  /** Every sim event (FTUE director, free-flight postcards). */
  onEvent?(e: SimEvent, s: FlightSession): void;
  /** Per render frame after the camera update (FTUE film camera can override). Return true if it drove the camera. */
  overrideCamera?(s: FlightSession, dt: number): boolean;
  /** Film intro: called each frame while the session waits in the intro. Return 'ready' to show the jump prompt. */
  filmUpdate?(t: number, dt: number, s: FlightSession): 'film' | 'ready' | 'jump';
  /** Player tapped while in the intro/ready phase. Return true when handled. */
  onIntroTap?(t: number, s: FlightSession): boolean;
}

type Phase = 'intro' | 'ready' | 'flight' | 'hitstop' | 'replay' | 'landed' | 'done';

/** Pack replay-relevant options with the cosmetic suit id: bits 0–11 suit, 12–13 assist (0 off, 1 low, 2 full), 14 auto parachute. */
export function packSuitId(suit: number, assist: AssistLevel, autoParachute: boolean): number {
  const a = assist === 'off' ? 0 : assist === 'low' ? 1 : 2;
  return (suit & 0xfff) | (a << 12) | (autoParachute ? 1 << 14 : 0);
}

export function unpackSuitId(v: number): { suit: number; assist: AssistLevel; autoParachute: boolean } {
  const a = (v >> 12) & 3;
  return { suit: v & 0xfff, assist: a === 0 ? 'off' : a === 1 ? 'low' : 'full', autoParachute: ((v >> 14) & 1) === 1 };
}

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _ndc = new THREE.Vector3();
const STRIDE = CrashBuffer.STRIDE;

interface GhostRun {
  spec: SessionGhost;
  sim: FlightSim;
  cursor: ReplayCursor;
  gateTick: Int32Array;
  finishTick: number;
  cmds: Command[];
}

export class FlightSession {
  readonly app: App;
  readonly scene: Scene3D;
  readonly audio: AudioEngine;
  readonly opts: SessionOptions;
  readonly hooks: SessionHooks;
  sim: FlightSim;
  readonly route: RouteDef;
  phase: Phase = 'intro';
  private readonly cmds: Command[] = [];
  private readonly recorder = new Recorder(0, 8192);
  private stats: FlightStatsTracker;
  private readonly strip = new ProximityStripAccumulator();
  private readonly audioAdapter = new FlightAudioAdapter();
  readonly follow: FollowCamera;
  private readonly intro: IntroCamera;
  private readonly replay: ReplayDirector;
  private introT = 0;
  private phaseT = 0;
  private readonly ghosts: GhostRun[] = [];
  private readonly playerGateTick: Int32Array;
  private bot: LineBot | null = null;
  botPolicy: BotPolicy | null = null;
  crashes = 0;
  private replayFrames: ReplayFrame[] = [];
  private replayT = 0;
  private replayEnd = 0;
  private readonly replayState: FlightState;
  /** Touchdown pose: the sim publishes the glider's (deploy-point) position after touchdown, so the last canopy
   *  position is kept here for the pilot / landing camera (ARAYÜZ İSTEĞİ flight: FlightSim posX after touchdown). */
  private readonly landedState: FlightState;
  private readonly lastCanopyPos = new Float64Array(3);
  private hasCanopyPos = false;
  private readonly recentEvents: SimEvent[] = [];
  /** Sim events of the current render frame (route markers). */
  private readonly frameEvents: SimEvent[] = [];
  private layer: LayerHandle | null = null;
  private readonly tapHandler: (e: PointerEvent) => void;
  private slowmoT = 0;
  private warnT = 0;
  private finishedResult: SessionResult | null = null;
  private landCamYaw = 0;
  private landCamPos = new THREE.Vector3();
  private canopyCamPos = new THREE.Vector3();
  private canopyCamInit = false;
  private cloud = 0;
  private gatesTotal: number;
  private readonly lineCum: Float64Array;
  private readonly lineTotal: number;
  private lineSeg = 0;
  private invertCount = 0;
  private invertLatch = 0;
  invertCardEnabled = false;
  /** FTUE: force the HUD hint (null = automatic hints off). */
  ftueHint: FtueKind | null = null;
  private hintShown: FtueKind | null = null;
  private disposed = false;
  private wasJumpPhase = false;
  /** Render-time offset (s) applied to the balloons during the intro (balloons rise toward their t=0 pose). */
  introBalloonLead = 0;
  private stepsThisFrame = 0;
  private paused = false;
  /** Photo mode etc.: when set and returning true, it drives the camera instead of the gameplay cameras. */
  cameraOverride: ((dt: number) => boolean) | null = null;

  constructor(app: App, scene: Scene3D, audio: AudioEngine, opts: SessionOptions, hooks: SessionHooks) {
    this.app = app;
    this.scene = scene;
    this.audio = audio;
    this.opts = opts;
    this.hooks = hooks;
    this.route = opts.route;
    this.gatesTotal = opts.route.gates.length;
    this.playerGateTick = new Int32Array(Math.max(1, this.gatesTotal)).fill(-1);
    this.sim = this.makeSim(opts.assist, opts.autoParachute, 0, opts.seed, opts.guideWind, opts.slowMode);
    this.stats = this.newTracker();
    this.follow = new FollowCamera(scene.camera, opts.world.loaded.sampler);
    this.intro = new IntroCamera(scene.camera, opts.world.loaded.sampler);
    this.intro.setRoute(opts.route);
    this.replay = new ReplayDirector(scene.camera, opts.world.loaded.sampler);
    this.replayState = cloneState(this.sim.state);
    this.landedState = cloneState(this.sim.state);
    // route line arc length (progress for the proximity strip)
    const line = opts.route.line;
    this.lineCum = new Float64Array(Math.max(1, line.length));
    let tot = 0;
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1];
      const b = line[i];
      tot += Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[2] - a[2]) * (b[2] - a[2]));
      this.lineCum[i] = tot;
    }
    this.lineTotal = tot > 1 ? tot : 1;
    // ghosts
    opts.ghosts.slice(0, 3).forEach((g, k) => {
      const u = unpackSuitId(g.header.suitId);
      const sim = this.makeSim(u.assist, u.autoParachute, k + 1, g.header.seed, g.header.guideWind, g.header.slowMode);
      this.ghosts.push({ spec: g, sim, cursor: new ReplayCursor(g.input, k + 1), gateTick: new Int32Array(Math.max(1, this.gatesTotal)).fill(-1), finishTick: -1, cmds: [] });
      const p = scene.ghosts[k];
      p.name = g.name;
      if (g.color) p.setGhostColor(g.color);
      p.visible = true;
    });
    for (let k = opts.ghosts.length; k < scene.ghosts.length; k++) scene.ghosts[k].visible = false;
    // scene: route visuals
    scene.markers.build(opts.route, scene.tier);
    scene.vfx.setReduceMotion(opts.reduceMotion);
    this.follow.reset();
    this.tapHandler = (e: PointerEvent) => this.onTap(e);
    window.addEventListener('pointerdown', this.tapHandler, true);
    this.resetVisuals();
    if (opts.intro === 'skip') this.jump();
  }

  private makeSim(assist: AssistLevel, autoParachute: boolean, actorId: number, seed: number, guideWind: boolean, slowMode: boolean): FlightSim {
    const o = this.opts;
    return new FlightSim({
      world: o.world.id,
      sampler: o.world.loaded.sampler,
      route: o.route,
      propIndex: o.world.content.propIndex,
      balloons: o.world.content.balloons,
      seed,
      assist,
      guideWind,
      freeFlight: o.freeFlight,
      slowMode,
      autoParachute,
      water: o.world.water.length ? o.world.water : undefined,
      actorId,
    });
  }

  private newTracker(): FlightStatsTracker {
    const o = this.opts;
    const mode: FlightMode = o.mode === 'ftue' ? 'career' : o.mode;
    const assist: MetaAssist = o.guideWind ? 'guide' : o.assist;
    return createFlightStatsTracker({ routeId: o.route.id, world: o.world.id, mode, gatesTotal: this.gatesTotal, assist, slowMode: o.slowMode });
  }

  // ---- lifecycle ---------------------------------------------------------------------------------

  /** Called by the mode once the flight screen is up. */
  begin(): void {
    UI.show('flight');
    UI.hud.configure({ mode: this.opts.mode === 'ftue' ? 'career' : this.opts.mode, metric: this.opts.metric, gatesTotal: this.opts.freeFlight ? 0 : this.gatesTotal });
    UI.hud.reset();
    UI.hud.setVisible(true);
    this.layer = pushLayer('flight', () => {
      this.pause();
      return false;
    });
    this.app.input.setSimHz(60);
    this.app.loop.setStepHz(60);
    if (this.phase === 'intro' && this.opts.intro === 'full') this.audio.music.setWorld(this.opts.world.id, { calm: this.opts.freeFlight });
    else this.audio.music.setWorld(this.opts.world.id, { calm: this.opts.freeFlight });
  }

  get state(): FlightState {
    return this.sim.state;
  }

  get isFlying(): boolean {
    return this.phase === 'flight';
  }

  setBot(policy: BotPolicy | null): void {
    this.botPolicy = policy;
    this.bot = policy ? new LineBot(this.route, this.opts.world.loaded.sampler, policy, this.opts.seed ^ 0x51, 0) : null;
    if (this.bot && this.phase === 'flight') {
      // keep the bot's line progress in sync with a flight already under way
      this.bot.progress(this.sim.state.pos[0], this.sim.state.pos[2]);
    }
    if (policy && (this.phase === 'intro' || this.phase === 'ready')) this.jump();
  }

  /** Begin the jump (from intro/ready). Audio unlock happens through the platform first-gesture hook. */
  jump(): void {
    if (this.phase !== 'intro' && this.phase !== 'ready') return;
    this.sim.beginJump();
    for (const g of this.ghosts) g.sim.beginJump();
    this.phase = 'flight';
    this.phaseT = 0;
    this.wasJumpPhase = true;
    this.scene.pilot.setSampler(null);
    this.scene.resetTrails();
    this.app.input.calibrateGyro();
    this.audio.event({ type: 'jump' });
    UI.hud.ftue(null);
    this.hintShown = null;
    this.follow.reset();
    markTime('jump');
    markTime('controllable');
  }

  pause(): void {
    if (this.paused || this.phase === 'done') return;
    this.paused = true;
    this.app.fsm.pause('user');
    this.audio.setPauseMuffle(true);
    this.app.input.releaseAll();
    UI.show('pause', {
      mode: this.opts.mode === 'ftue' ? 'career' : this.opts.mode,
      photoAllowed: this.opts.mode === 'career' || this.opts.mode === 'free',
      routeId: this.opts.mode === 'career' || this.opts.mode === 'ftue' ? this.route.id : undefined,
      world: this.opts.world.id,
      timeSec: this.sim.state.timeSec,
      score: Math.round(this.sim.state.score),
    });
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    UI.close('pause');
    this.audio.setPauseMuffle(false);
    this.app.fsm.resume('user');
  }

  get isPaused(): boolean {
    return this.paused;
  }

  /** Full restart of the route (pause menu "Yeniden", results "Tekrar"). Intro is skipped on retries. */
  restart(): void {
    if (this.paused) this.resume();
    this.retry();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener('pointerdown', this.tapHandler, true);
    this.layer?.pop();
    this.layer = null;
    if (this.paused) {
      this.paused = false;
      this.audio.setPauseMuffle(false);
      this.app.fsm.resume('user');
    }
    this.app.loop.setTimeScale(1);
    UI.hud.ftue(null);
    UI.hud.setGhostDelta(null);
    UI.hud.setArrow(null);
    UI.hud.setWarning(null);
    for (const g of this.scene.ghosts) g.visible = false;
    this.scene.markers.build(null, this.scene.tier);
    this.scene.markers.setGuideLine(false);
    this.scene.pilot.setSampler(this.opts.world.loaded.sampler);
    this.app.input.setScheme('menu');
  }

  // ---- input taps (intro skip, jump, replay skip) ------------------------------------------------

  private onTap(e: PointerEvent): void {
    const t = e.target as Element | null;
    if (t && typeof t.closest === 'function' && t.closest('button, a, input, [role="button"], .kn-modal, .kn-panel')) return;
    if (this.paused) return;
    if (this.phase === 'intro' || this.phase === 'ready') {
      if (this.hooks.onIntroTap?.(this.introT, this)) return;
      if (this.phase === 'ready') this.jump();
      else if (this.opts.intro === 'full' && this.introT > 1) this.endIntro();
    } else if (this.phase === 'replay') {
      this.retry();
    }
  }

  private endIntro(): void {
    this.phase = 'ready';
    this.phaseT = 0;
    UI.hud.ftue('jump');
  }

  // ---- fixed step ----------------------------------------------------------------------------------

  /** One 60 Hz tick (platform loop, FSM 'game', not paused). */
  step(): void {
    if (this.phase !== 'flight') return;
    const sim = this.sim;
    const st = sim.state;
    if (st.phase === 'crashed' || st.phase === 'landed' || (st.phase === 'halfFlight' && !st.canopyOpen && st.heightAGL < 0.5)) return;
    const tick = st.tick;
    const cmds = this.cmds;
    cmds.length = 0;
    if (this.bot) {
      this.bot.commands(st, cmds);
    } else {
      this.app.input.sample(tick, cmds);
    }
    this.recorder.pushAll(cmds);
    this.trackInvert(st, cmds);
    sim.step(cmds);
    this.stepsThisFrame++;
    // ghosts
    for (let k = 0; k < this.ghosts.length; k++) {
      const g = this.ghosts[k];
      const gs = g.sim;
      if (gs.phase === 'landed' || gs.phase === 'crashed') continue;
      g.cmds.length = 0;
      g.cursor.commandsAt(gs.state.tick, g.cmds);
      gs.step(g.cmds);
      const evs = gs.drainEvents();
      for (let i = 0; i < evs.length; i++) {
        const e = evs[i];
        if (e.type === 'gate' && e.index < g.gateTick.length) {
          g.gateTick[e.index] = e.tick;
          if (k === 0 && this.playerGateTick[e.index] >= 0) this.showSplit(e.index);
        } else if (e.type === 'landed') g.finishTick = e.tick;
      }
    }
    // events
    const evs = sim.drainEvents();
    for (let i = 0; i < evs.length; i++) this.dispatch(evs[i]);
    // last canopy position (touchdown pose workaround)
    const ps = sim.state.phase;
    if ((ps === 'canopy' || ps === 'halfFlight') && sim.state.canopyOpen) {
      this.lastCanopyPos[0] = sim.state.pos[0];
      this.lastCanopyPos[1] = sim.state.pos[1];
      this.lastCanopyPos[2] = sim.state.pos[2];
      this.hasCanopyPos = true;
    }
    // per-tick stats
    this.stats.sample(sim.state);
    if (sim.state.phase === 'flying') this.strip.add(this.progress(sim.state.pos[0], sim.state.pos[2]), sim.state.prox.mult, sim.dt);
    // input scheme follows the flight phase
    const ph = sim.state.phase;
    this.app.input.setScheme(ph === 'canopy' || ph === 'halfFlight' ? 'canopy' : ph === 'jump' || ph === 'flying' ? 'flight' : 'menu');
  }

  /** Route progress 0..1 by arc length (monotonic nearest segment search). */
  progress(x: number, z: number): number {
    const line = this.route.line;
    const n = line.length;
    if (n < 2) return 0;
    let best = Infinity;
    let bestS = this.lineCum[this.lineSeg];
    const i1 = Math.min(n - 1, this.lineSeg + 3);
    for (let i = this.lineSeg; i < i1; i++) {
      const a = line[i];
      const b = line[i + 1];
      const ex = b[0] - a[0];
      const ez = b[2] - a[2];
      const l2 = ex * ex + ez * ez;
      let t = l2 > 1e-6 ? ((x - a[0]) * ex + (z - a[2]) * ez) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = a[0] + ex * t - x;
      const dz = a[2] + ez * t - z;
      const d = dx * dx + dz * dz;
      if (d < best) {
        best = d;
        bestS = this.lineCum[i] + (this.lineCum[i + 1] - this.lineCum[i]) * t;
        if (t >= 0.999 && i + 1 > this.lineSeg && i + 1 < n - 1) this.lineSeg = i + 1;
      }
    }
    return bestS / this.lineTotal;
  }

  private dispatch(e: SimEvent): void {
    const s = this.scene;
    UI.hud.onEvent(e);
    this.audio.event(e);
    s.pilot.event(e);
    s.vfx.event(e);
    this.stats.event(e);
    if (this.recentEvents.length >= 64) this.recentEvents.shift();
    this.recentEvents.push(e);
    if (this.frameEvents.length < 64) this.frameEvents.push(e);
    switch (e.type) {
      case 'wingsOpen':
        this.scene.pilot.setSampler(this.opts.world.loaded.sampler);
        break;
      case 'graze':
        if (!this.opts.reduceMotion) {
          this.slowmoT = 0.15;
          this.app.loop.setTimeScale(0.85);
        }
        break;
      case 'gate':
        if (e.index < this.playerGateTick.length) {
          this.playerGateTick[e.index] = e.tick;
          if (this.ghosts.length > 0 && this.ghosts[0].gateTick[e.index] >= 0) this.showSplit(e.index);
        }
        break;
      case 'warning':
        UI.hud.setWarning(e.side < 0 ? 'left' : 'right');
        this.warnT = 0.5;
        this.audio.event({ type: 'collisionWarn', side: e.side });
        break;
      case 'crash':
        this.onCrash(e);
        break;
      case 'landed':
        this.onLanded();
        break;
      default:
        break;
    }
    this.hooks.onEvent?.(e, this);
  }

  private showSplit(i: number): void {
    const g = this.ghosts[0];
    if (!g || g.gateTick[i] < 0 || this.playerGateTick[i] < 0) return;
    const dt = (this.playerGateTick[i] - g.gateTick[i]) * this.sim.dt;
    UI.hud.setGhostDelta(dt);
  }

  /** "Ters mi?" — 3 clear pushes against the needed pitch while lining up for the first gate (§2.2). */
  private trackInvert(st: FlightState, cmds: Command[]): void {
    if (!this.invertCardEnabled || st.phase !== 'flying' || st.gateIndex !== 0 || this.route.gates.length === 0) return;
    let sy = 0;
    let has = false;
    for (let i = 0; i < cmds.length; i++) if (cmds[i].cmd === 'axis') {
      sy = cmds[i].args[1];
      has = true;
    }
    if (!has) return;
    const g = this.route.gates[0];
    const dy = g.pos[1] - st.pos[1];
    const wrong = (dy > 10 && sy < -20) || (dy < -10 && sy > 20);
    if (wrong && this.invertLatch === 0) {
      this.invertLatch = 1;
      this.invertCount++;
      if (this.invertCount >= 3) {
        this.invertCardEnabled = false;
        this.invertAsk?.();
      }
    } else if (!wrong && Math.abs(sy) < 8) this.invertLatch = 0;
  }

  /** Set by the mode: show the "Ters mi?" card. */
  invertAsk: (() => void) | null = null;

  // ---- crash → hit-stop → replay → retry ---------------------------------------------------------

  private onCrash(e: Extract<SimEvent, { type: 'crash' }>): void {
    this.crashes++;
    markTime('crash');
    UI.hud.setWarning(null);
    if (this.hooks.onCrash?.(e, this)) return;
    this.phase = 'hitstop';
    this.phaseT = 0;
    this.app.loop.setTimeScale(1);
  }

  private startReplay(): void {
    const cb = this.sim.crashBuffer;
    const n = cb.count;
    const frames = this.replayFrames;
    frames.length = 0;
    const row = new Float64Array(STRIDE);
    for (let i = 0; i < n; i++) {
      cb.read(i, row);
      frames.push({ t: row[0] / 60, pos: [row[1], row[2], row[3]], vel: [row[4], row[5], row[6]], phi: row[9], d: row[11] });
    }
    if (frames.length < 2) {
      this.retry();
      return;
    }
    const t0 = frames[0].t;
    const t1 = frames[frames.length - 1].t;
    this.replay.plan(frames, this.recentEvents, 60, t0, t1);
    this.replayT = t0;
    this.replayEnd = t1 + 0.9;
    this.phase = 'replay';
    this.phaseT = 0;
    markTime('replayStart');
  }

  /** Back to the route start, intro skipped, control in < 1 s. */
  retry(): void {
    this.sim.resetToStart();
    for (const g of this.ghosts) {
      g.sim.resetToStart();
      g.cursor.reset();
      g.gateTick.fill(-1);
      g.finishTick = -1;
    }
    this.recorder.reset();
    this.stats = this.newTracker();
    this.strip.reset();
    this.playerGateTick.fill(-1);
    this.recentEvents.length = 0;
    this.lineSeg = 0;
    this.hasCanopyPos = false;
    this.bot?.reset();
    this.app.loop.setTimeScale(1);
    this.finishedResult = null;
    this.phase = 'intro';
    this.resetVisuals();
    UI.show('flight');
    UI.hud.reset();
    UI.hud.setGhostDelta(null);
    this.audio.event({ type: 'restart' });
    markTime('retry');
    this.jump();
    this.hooks.onRetry?.(this);
  }

  private resetVisuals(): void {
    this.scene.pilot.setSampler(null);
    this.scene.pilot.setState(this.sim.state, 1);
    this.scene.markers.reset();
    this.follow.reset();
    this.canopyCamInit = false;
  }

  // ---- landing --------------------------------------------------------------------------------------

  /** Touchdown pose for rendering (see landedState). */
  private fillLandedState(): void {
    const ls = this.landedState;
    const st = this.sim.state;
    Object.assign(ls, st, { pos: ls.pos, prevPos: ls.prevPos, vel: ls.vel, prox: ls.prox });
    const src = this.hasCanopyPos ? this.lastCanopyPos : st.pos;
    const g = this.opts.world.loaded.sampler.height(src[0], src[2]);
    for (let j = 0; j < 3; j++) {
      ls.pos[j] = src[j];
      ls.prevPos[j] = src[j];
      ls.vel[j] = 0;
    }
    ls.pos[1] = Math.max(g, src[1]);
    ls.prevPos[1] = ls.pos[1];
    ls.vel[0] = Math.sin(st.psi) * 0.01;
    ls.vel[2] = -Math.cos(st.psi) * 0.01;
  }

  private onLanded(): void {
    this.phase = 'landed';
    this.phaseT = 0;
    this.fillLandedState();
    const st = this.landedState;
    this.landCamPos.copy(this.scene.camera.position);
    this.landCamYaw = Math.atan2(this.landCamPos.x - st.pos[0], this.landCamPos.z - st.pos[2]);
    this.finishedResult = this.buildResult();
  }

  private buildResult(): SessionResult {
    const sim = this.sim;
    const st = sim.state;
    const half = sim.phase === 'halfFlight';
    const timeSec = st.timeSec;
    const resultTimeMs = Math.round((timeSec + this.opts.gatePenaltySec * st.gatesMissed) * 1000);
    const stars = sim.stars();
    const stats = this.stats.finish({ score: st.score, timeSec, stars });
    let code: string | null = null;
    let header: GhostHeader | null = null;
    if (this.recorder.ok && !this.opts.freeFlight) {
      const assistFlag = (this.opts.assist !== 'off' && st.assistUsed === true) || this.opts.guideWind || this.opts.autoParachute;
      header = {
        simVersion: SIM_VERSION,
        mode: this.opts.ghostMode,
        routeRef: this.opts.routeRef,
        seed: this.opts.seed >>> 0,
        assist: assistFlag,
        slowMode: this.opts.slowMode,
        guideWind: this.opts.guideWind,
        suitId: this.opts.suitId,
        tickCount: st.tick,
        finalTimeMs: resultTimeMs,
        score: Math.round(st.score),
        finalStateHash: sim.hash() >>> 0,
        playerName: this.opts.playerName,
      };
      try {
        code = encodeGhostCode(header, this.recorder.input());
      } catch (err) {
        console.warn('[session] ghost code not encodable', err);
        code = null;
      }
    }
    const ghostDeltas = this.ghosts.map((g) => {
      if (g.finishTick < 0) return Number.NaN;
      return (st.tick - g.finishTick) * sim.dt;
    });
    return {
      kind: half ? 'half' : 'landed',
      score: Math.round(st.score),
      timeSec,
      resultTimeMs,
      stars,
      stats,
      strip: this.stripTiers(),
      code,
      header,
      breakdown: { ...sim.breakdown },
      gatesMissed: st.gatesMissed,
      ghostDeltas,
      crashes: this.crashes,
      distToTarget: sim.distToTarget,
      assistUsed: st.assistUsed === true,
    };
  }

  /** Proximity strip as multiplier tiers (0 ⬜, 1 🟩, 2 🟨, 3 🟧, 5 🟥) for the UI / share card. */
  private stripTiers(): number[] {
    const s = this.strip.result();
    return s.tiers.map((t) => [0, 1, 2, 3, 5][t]);
  }

  /** Seconds at ×3 or closer (Günün Rotası ⭐⭐⭐ rule). */
  x3Seconds(): number {
    return this.strip.timeAtOrAbove(3);
  }

  /** Force the end of the flight now (tests: half flight / landing evaluation). */
  finishNow(): SessionResult {
    const r = this.buildResult();
    this.phase = 'done';
    return r;
  }

  // ---- render ---------------------------------------------------------------------------------------

  render(alpha: number, dt: number): void {
    const s = this.scene;
    const sim = this.sim;
    const st = sim.state;
    const steps = this.stepsThisFrame;
    this.stepsThisFrame = 0;
    if (this.slowmoT > 0) {
      this.slowmoT -= dt;
      if (this.slowmoT <= 0) this.app.loop.setTimeScale(1);
    }
    if (this.warnT > 0) {
      this.warnT -= dt;
      if (this.warnT <= 0) UI.hud.setWarning(null);
    }
    this.phaseT += dt;
    let camDone = false;
    let propsTime = sim.timeSec;
    let pilotState: FlightState = st;
    let pilotAlpha = alpha;
    switch (this.phase) {
      case 'intro': {
        if (!this.paused) this.introT += dt;
        propsTime = Math.min(0, this.introT - this.introBalloonLead);
        if (this.opts.intro === 'film') {
          const r = this.hooks.filmUpdate ? this.hooks.filmUpdate(this.introT, dt, this) : 'ready';
          camDone = true;
          if (r === 'ready') {
            this.phase = 'ready';
            this.phaseT = 0;
          } else if (r === 'jump') this.jump();
        } else {
          const done = this.intro.update(this.introT);
          camDone = true;
          if (done) this.endIntro();
        }
        break;
      }
      case 'ready':
        propsTime = 0;
        if (this.opts.intro === 'film' && this.hooks.filmUpdate) {
          const r = this.hooks.filmUpdate(this.introT + this.phaseT, dt, this);
          if (r === 'jump') this.jump();
        } else this.intro.update(5.99);
        camDone = true;
        break;
      case 'hitstop':
        camDone = true; // frozen frame (80 ms single hit-stop)
        if (this.phaseT >= 0.08) this.startReplay();
        break;
      case 'replay': {
        const ts = this.replay.update(this.replayT, dt);
        const scale = this.opts.reduceMotion ? 1 : ts;
        this.replayT += dt * scale;
        this.fillReplayState(this.replayT);
        pilotState = this.replayState;
        pilotAlpha = 1;
        propsTime = this.replayT;
        camDone = true;
        if (this.replayT >= this.replayEnd) this.retry();
        break;
      }
      case 'landed':
        this.landedCamera(dt);
        pilotState = this.landedState;
        pilotAlpha = 1;
        camDone = true;
        if (this.phaseT > (this.opts.mode === 'ftue' ? 0.1 : 2.2) && this.finishedResult) {
          const r = this.finishedResult;
          this.finishedResult = null;
          this.phase = 'done';
          this.hooks.onFinished(r);
        }
        break;
      case 'done':
        if (this.hasCanopyPos) {
          pilotState = this.landedState;
          pilotAlpha = 1;
        }
        break;
      default:
        break;
    }
    // half flight under canopy ends at touchdown (no 'landed' phase change): watch for it
    if (this.phase === 'flight' && st.phase === 'halfFlight' && !st.canopyOpen && st.heightAGL < 0.6) {
      this.onLanded();
    }
    if (this.cameraOverride && this.cameraOverride(dt)) camDone = true;
    if (!camDone && this.jumpCamera(st, alpha)) camDone = true;
    if (!camDone && this.hooks.overrideCamera?.(this, dt)) camDone = true;
    if (!camDone) {
      if (st.phase === 'canopy' || (st.phase === 'halfFlight' && st.canopyOpen)) this.canopyCamera(dt, alpha);
      else this.follow.update(st, dt, st.prox, alpha);
    }
    // pilot + ghosts
    s.pilot.setState(pilotState, pilotAlpha);
    s.pilot.update(dt, s.camera);
    for (let k = 0; k < this.ghosts.length; k++) {
      const gp = s.ghosts[k];
      gp.setState(this.ghosts[k].sim.state, alpha);
      gp.update(dt, s.camera);
    }
    s.props?.update(propsTime, s.camera, dt);
    s.vfx.update(dt, propsTime, s.camera, this.phase === 'replay' ? null : st, s.pilot);
    s.markers.update(this.phase === 'replay' ? null : st, this.frameEvents, s.camera, dt);
    this.frameEvents.length = 0;
    // HUD + audio
    if (this.phase === 'flight' || this.phase === 'landed') UI.hud.update(st);
    this.updateArrow(st);
    this.cloud = s.wr.cloudImmersion(st.pos[0], st.pos[1], st.pos[2]);
    this.audio.setFlight(this.audioAdapter.fill(this.phase === 'replay' ? this.replayState : st, this.cloud));
    this.autoHints(st);
    void steps;
  }

  private fillReplayState(t: number): void {
    const f = this.replayFrames;
    const rs = this.replayState;
    if (f.length === 0) return;
    let i = 0;
    while (i < f.length - 2 && f[i + 1].t < t) i++;
    const a = f[i];
    const b = f[Math.min(f.length - 1, i + 1)];
    const k = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 1;
    for (let j = 0; j < 3; j++) {
      rs.pos[j] = a.pos[j] + (b.pos[j] - a.pos[j]) * k;
      rs.prevPos[j] = rs.pos[j];
      rs.vel[j] = a.vel[j] + (b.vel[j] - a.vel[j]) * k;
    }
    rs.speed = Math.sqrt(rs.vel[0] * rs.vel[0] + rs.vel[1] * rs.vel[1] + rs.vel[2] * rs.vel[2]);
    rs.psi = Math.atan2(rs.vel[0], -rs.vel[2]);
    const hz = Math.sqrt(rs.vel[0] * rs.vel[0] + rs.vel[2] * rs.vel[2]);
    rs.gamma = Math.atan2(rs.vel[1], hz > 1e-3 ? hz : 1e-3);
    rs.phi = a.phi + (b.phi - a.phi) * k;
    const last = f[f.length - 1].t;
    rs.phase = t >= last - 1 / 60 ? 'crashed' : 'flying';
    rs.prox.d = a.d;
  }

  /** Balloon starts: the start balloon's basket/envelope sits right behind the pilot, so the first second of the
   *  jump is filmed from above-front outside the envelope; then a cut to the follow camera (§1 "yukarıdan takip"). */
  private jumpCamera(st: FlightState, alpha: number): boolean {
    if (this.phase !== 'flight' || this.route.start.type !== 'balon') return false;
    const inJump = st.phase === 'jump' || (st.phase === 'flying' && st.timeSec < 1.1);
    if (!inJump) {
      if (this.wasJumpPhase) {
        this.wasJumpPhase = false;
        this.follow.reset();
      }
      return false;
    }
    this.wasJumpPhase = true;
    const cam = this.scene.camera;
    const p = this.route.start.pos;
    const hd = (this.route.start.headingDeg * Math.PI) / 180;
    const fx = Math.sin(hd);
    const fz = -Math.cos(hd);
    cam.position.set(p[0] + fx * 8 + fz * -5.5, p[1] + 4.5, p[2] + fz * 8 + fx * 5.5);
    cam.up.set(0, 1, 0);
    _v2.set(st.prevPos[0] + (st.pos[0] - st.prevPos[0]) * alpha, st.prevPos[1] + (st.pos[1] - st.prevPos[1]) * alpha - 1.5, st.prevPos[2] + (st.pos[2] - st.prevPos[2]) * alpha);
    cam.lookAt(_v2);
    cam.fov = cam.aspect < 1 ? 70 : 50;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    return true;
  }

  private canopyCamera(dt: number, alpha: number): void {
    const st = this.sim.state;
    const cam = this.scene.camera;
    const px = st.prevPos[0] + (st.pos[0] - st.prevPos[0]) * alpha;
    const py = st.prevPos[1] + (st.pos[1] - st.prevPos[1]) * alpha;
    const pz = st.prevPos[2] + (st.pos[2] - st.prevPos[2]) * alpha;
    const hx = Math.sin(st.psi);
    const hz = -Math.cos(st.psi);
    _v.set(px - hx * 13, py + 3.5, pz - hz * 13);
    const g = this.opts.world.loaded.sampler.height(_v.x, _v.z) + 2;
    if (_v.y < g) _v.y = g;
    if (!this.canopyCamInit) {
      this.canopyCamPos.copy(_v);
      this.canopyCamInit = true;
    }
    this.canopyCamPos.lerp(_v, 1 - Math.exp(-dt * 2.2));
    cam.position.copy(this.canopyCamPos);
    cam.up.set(0, 1, 0);
    _v2.set(px + hx * 6, py + 1.2, pz + hz * 6);
    cam.lookAt(_v2);
    const portrait = cam.aspect < 1;
    cam.fov += ((portrait ? 70 : 50) - cam.fov) * Math.min(1, dt * 2);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }

  private landedCamera(dt: number): void {
    const st = this.landedState;
    const cam = this.scene.camera;
    this.landCamYaw += dt * 0.18;
    const r = 11 + this.phaseT * 1.5;
    const h = 3 + this.phaseT * 2.5;
    _v.set(st.pos[0] + Math.sin(this.landCamYaw) * r, st.pos[1] + h, st.pos[2] + Math.cos(this.landCamYaw) * r);
    const g = this.opts.world.loaded.sampler.height(_v.x, _v.z) + 1.5;
    if (_v.y < g) _v.y = g;
    this.landCamPos.lerp(_v, 1 - Math.exp(-dt * 2.5));
    cam.position.copy(this.landCamPos);
    cam.up.set(0, 1, 0);
    cam.lookAt(st.pos[0], st.pos[1] + 1, st.pos[2]);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }

  private updateArrow(st: FlightState): void {
    if (this.phase !== 'flight' || st.phase !== 'flying' || this.opts.freeFlight) {
      UI.hud.setArrow(null);
      return;
    }
    let tx: number;
    let ty: number;
    let tz: number;
    if (st.gateIndex < this.route.gates.length) {
      const g = this.route.gates[st.gateIndex].pos;
      tx = g[0];
      ty = g[1];
      tz = g[2];
    } else {
      const l = this.route.landing.center;
      tx = l[0];
      ty = l[1];
      tz = l[2];
    }
    const cam = this.scene.camera;
    _ndc.set(tx, ty, tz).project(cam);
    // behind the camera → flip
    _v.set(tx, ty, tz).sub(cam.position);
    cam.getWorldDirection(_v2);
    const behind = _v.dot(_v2) < 0;
    let x = _ndc.x;
    let y = _ndc.y;
    if (behind) {
      x = -x;
      y = -y;
    }
    if (!behind && Math.abs(x) < 0.85 && Math.abs(y) < 0.8) {
      UI.hud.setArrow(null);
      return;
    }
    UI.hud.setArrow(Math.atan2(x * cam.aspect, y));
  }

  /** Contextual one-word hints (FTUE film & first flights): drag, parachute, flare. */
  private autoHints(st: FlightState): void {
    let want: FtueKind | null = this.ftueHint;
    if (want === null && this.opts.mode === 'ftue' && this.phase === 'flight') {
      if (st.phase === 'flying' && st.inLandingZone && !st.canopyOpen) want = 'parachute';
      else if ((st.phase === 'canopy' || st.phase === 'halfFlight') && st.heightAGL < 4 && st.heightAGL > 0.4) want = 'flare';
      else if (st.phase === 'flying' && st.timeSec > 1.2 && st.timeSec < 5 && st.gatesPassed === 0) want = 'drag';
    }
    if (this.phase === 'ready') want = 'jump';
    if (want !== this.hintShown) {
      this.hintShown = want;
      UI.hud.ftue(want);
    }
  }

  /** Serializable summary (test API). */
  testState(): Record<string, unknown> {
    const st = this.sim.state;
    return {
      session: this.phase,
      mode: this.opts.mode,
      route: this.route.id,
      world: this.opts.world.id,
      tick: st.tick,
      phase: st.phase,
      pos: [Math.round(st.pos[0] * 10) / 10, Math.round(st.pos[1] * 10) / 10, Math.round(st.pos[2] * 10) / 10],
      speed: Math.round(st.speed * 10) / 10,
      agl: Math.round(st.heightAGL * 10) / 10,
      score: Math.round(st.score),
      timeSec: Math.round(st.timeSec * 100) / 100,
      gatesPassed: st.gatesPassed,
      gatesMissed: st.gatesMissed,
      gates: this.gatesTotal,
      inZone: st.inLandingZone,
      canopy: st.canopyOpen,
      mult: st.prox.mult,
      crashes: this.crashes,
      bot: this.botPolicy,
      ghosts: this.ghosts.map((g) => ({ name: g.spec.name, tick: g.sim.state.tick, phase: g.sim.phase })),
      paused: this.paused,
    };
  }

  /** Test API: advance n ticks deterministically regardless of rendering. */
  stepN(n: number): void {
    this.follow.reset();
    this.canopyCamInit = false;
    for (let i = 0; i < n; i++) {
      if (this.phase === 'intro' || this.phase === 'ready') this.jump();
      if (this.phase === 'hitstop' || this.phase === 'replay') this.retry();
      if (this.phase !== 'flight') break;
      this.step();
      const st = this.sim.state;
      if (this.phase !== 'flight') break;
      if (st.phase === 'halfFlight' && !st.canopyOpen && st.heightAGL < 0.6) {
        this.onLanded();
        break;
      }
    }
  }
}

function cloneState(s: FlightState): FlightState {
  return {
    ...s,
    pos: [s.pos[0], s.pos[1], s.pos[2]],
    prevPos: [s.prevPos[0], s.prevPos[1], s.prevPos[2]],
    vel: [s.vel[0], s.vel[1], s.vel[2]],
    prox: { ...s.prox, nearest: [0, 0, 0], normal: [0, 1, 0] },
  };
}
