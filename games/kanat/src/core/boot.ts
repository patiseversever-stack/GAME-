// Platform boot. main.ts (integrator) calls:
//
//   const app = await boot({ version: '1.0.0', root: document.getElementById('app')! });
//   … load worlds with app.loadingProgress(p) …
//   const gl = renderer.getContext(); app.attachCanvas(renderer.domElement, gl);
//   if (app.perf.needsBenchmark) await app.perf.benchmark((tier, mp) => worldRenderer.drawBenchmark(tier, mp));
//   app.setLoopHandlers({ step: (dt, tick) => mode.step(dt, tick), render: (alpha, dt) => mode.render(alpha, dt) });
//   app.ready();                                   // → menu, bridge `ready`, __game.ready() resolves, loop starts
//
// boot() owns: bridge + host commands, persistence (settings + save.v1), PerformanceDirector, GameLoop,
// InputManager, FSM + lifecycle (visibility, pagehide, context loss), test API (?test=1), perf panel source.

import type { BridgeLogEntry, UrlParams } from '../bridge/GameBridge.ts';
import { GameBridge, getBridge } from '../bridge/GameBridge.ts';
import { setPerfPanelSource } from '../debug/perfPanel.ts';
import { installTestApi, isTestMode, markTestReady, markTime, registerTestHandlers } from '../debug/testApi.ts';
import { InputManager } from '../input/InputManager.ts';
import { LocalAdapter } from '../net/NetAdapter.ts';
import { PerformanceDirector } from '../perf/PerformanceDirector.ts';
import { readPixelsSync } from '../perf/benchmark.ts';
import type { Command } from '../sim/types.ts';
import { embeddedPackInfo, initEmbeddedPack, isSingleFileBuild } from './assets.ts';
import type { ContextHandle } from './context.ts';
import { attachContextLossHandling, currentContext } from './context.ts';
import { EventBus } from './events.ts';
import type { AppEvents, HostProfile, SafeArea } from './fsm.ts';
import { AppFSM } from './fsm.ts';
import { layerNames } from './layers.ts';
import { applySafeAreaCss, installLifecycle, onFirstGesture } from './lifecycle.ts';
import type { FrameSample } from './loop.ts';
import { GameLoop } from './loop.ts';
import type { Profile } from './profile.ts';
import { MODE_IDS, SAVE_SCHEMA } from './profile.ts';
import type { ProfileStore } from './save.ts';
import { HostProfileStore, LocalProfileStore, VersionedDoc } from './save.ts';
import type { Lang, QualitySetting } from './settings.ts';
import { LANGS } from './settings.ts';
import { SettingsStore } from './settingsStore.ts';
import { visualClock } from './time.ts';

export interface BootOptions {
  version: string;
  modes?: string[];
  /** UI root; also the default input surface. */
  root?: HTMLElement | null;
  /** Element whose pointer events steer (default: root, else document.body). */
  inputSurface?: HTMLElement | null;
  /** Extra capabilities for the bridge `ready` event. */
  capabilities?: Record<string, unknown>;
  bridge?: GameBridge;
  /** Force the test API even without ?test=1 (dev pages). */
  forceTestApi?: boolean;
  /**
   * Optional audio hooks (src/audio/AudioEngine): wired to suspend/unsuspend, the first user gesture
   * (unlock) and the effective mute (user setting OR host `mute`).
   */
  audio?: { suspend?(): void; resume?(): void; unlock?(): void; setMuted?(muted: boolean): void };
}

export interface LoopHandlers {
  step?: (dtSec: number, tick: number) => void;
  render?: (alpha: number, frameDtSec: number, nowMs: number) => void;
  frameEnd?: (s: FrameSample) => void;
}

export interface App {
  readonly version: string;
  readonly modes: string[];
  readonly fsm: AppFSM;
  readonly bus: EventBus<AppEvents>;
  readonly bridge: GameBridge;
  readonly store: ProfileStore;
  readonly settings: SettingsStore;
  readonly save: VersionedDoc<Profile>;
  readonly perf: PerformanceDirector;
  readonly loop: GameLoop;
  readonly input: InputManager;
  readonly net: LocalAdapter<Command>;
  readonly urlParams: UrlParams;
  readonly testMode: boolean;
  readonly runtime: { hostMuted: boolean; safeArea: SafeArea; hostProfile: HostProfile; deepLinkMode: string | null };
  /** True when sound must be silent (user setting OR host mute). */
  effectiveMuted(): boolean;
  setLoopHandlers(h: LoopHandlers): void;
  /** Register the game canvas: context-loss handling, device fingerprint/static guess, perf probe. */
  attachCanvas(canvas: HTMLCanvasElement, gl: WebGLRenderingContext | WebGL2RenderingContext): ContextHandle;
  loadingProgress(p: number): void;
  /** First interactive screen is up: FSM → menu (or deep-link mode), bridge `ready`, loop start. */
  ready(): void;
  /** Run once on the first user gesture (AudioEngine.unlock, gyro permission). */
  onFirstGesture(fn: () => void): () => void;
  /** Persist everything now (pagehide, before exit). */
  flush(): Promise<void>;
  /** Platform summary for the test API / debugging. */
  summary(): Record<string, unknown>;
}

let booted: App | null = null;

export async function boot(opts: BootOptions): Promise<App> {
  if (booted) return booted;
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const bus = new EventBus<AppEvents>();
  const fsm = new AppFSM(bus);
  const bridge = opts.bridge ?? getBridge();
  const urlParams = bridge.urlParams;
  const testMode = opts.forceTestApi === true || isTestMode();
  const modes = opts.modes ?? [...MODE_IDS];
  bridge.loading(0); // the host can show progress right away

  // ---- errors → host ----
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (e) => {
      const msg = e.message || String(e.error ?? 'error');
      bridge.error(msg, false);
      bus.emit('error', { message: msg, fatal: false });
    });
    window.addEventListener('unhandledrejection', (e) => {
      const r = e.reason as { message?: string } | undefined;
      const msg = `unhandledrejection: ${r?.message ?? String(e.reason)}`;
      bridge.error(msg, false);
      bus.emit('error', { message: msg, fatal: false });
    });
  }

  // ---- single-file pack ----
  if (isSingleFileBuild() && typeof document !== 'undefined') initEmbeddedPack(document);

  // ---- persistence ----
  const local = new LocalProfileStore();
  const store: ProfileStore = bridge.hasHost() ? new HostProfileStore(bridge, local) : local;
  const settings = new SettingsStore(store);
  const save = new VersionedDoc<Profile>(store, SAVE_SCHEMA);
  await Promise.all([settings.load(), save.load()]);

  // ---- performance ----
  const perf = new PerformanceDirector({ quality: settings.value.quality, kv: local.kv });

  // ---- loop ----
  let handlers: LoopHandlers = {};
  const loop = new GameLoop({
    step: (dt, tick) => handlers.step?.(dt, tick),
    render: (alpha, dt, nowMs) => {
      visualClock.advance(dt);
      handlers.render?.(alpha, dt, nowMs);
    },
    frameEnd: (s) => {
      perf.frame(s);
      handlers.frameEnd?.(s);
    },
  });
  loop.setFpsMode(settings.value.fps);
  loop.setUltra120(settings.value.ultra120);

  // ---- input ----
  const input = new InputManager({ onBack: () => bridge.receive({ v: 1, type: 'back', payload: {} }) });
  input.configure(settings.value.kanat);
  const surface = opts.inputSurface ?? opts.root ?? (typeof document !== 'undefined' ? document.body : null);
  if (surface) input.attach(surface);

  const net = new LocalAdapter<Command>(() => loop.tick);

  // ---- runtime state from the host ----
  const runtime: App['runtime'] = {
    hostMuted: false,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    hostProfile: {},
    deepLinkMode: urlParams.mode ?? null,
  };
  const emitMute = (): void => {
    const s = settings.value;
    const effective = s.muted || runtime.hostMuted;
    opts.audio?.setMuted?.(effective);
    bus.emit('mute', { muted: s.muted, hostMuted: runtime.hostMuted, effective });
  };

  // ---- apply settings ----
  const applyLang = (lang: Lang): void => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
    bus.emit('locale', { lang });
  };
  bridge.setHapticLevel(settings.value.haptics);
  applyLang(settings.value.lang);
  settings.onChange(({ settings: s, changed }) => {
    if (changed.includes('lang')) applyLang(s.lang);
    if (changed.includes('quality')) {
      perf.setQuality(s.quality);
      bus.emit('quality', { quality: s.quality });
    }
    if (changed.includes('fps')) loop.setFpsMode(s.fps);
    if (changed.includes('ultra120')) loop.setUltra120(s.ultra120);
    if (changed.includes('haptics')) bridge.setHapticLevel(s.haptics);
    if (changed.includes('muted')) emitMute();
    if (changed.some((k) => k.startsWith('kanat.'))) input.configure(s.kanat);
    // Settings toggles run inside the click handler → still a user gesture for the iOS motion prompt.
    if (changed.includes('kanat.gyro') && s.kanat.gyro !== 'off') void input.requestGyroPermission();
    bus.emit('settings', { settings: s, changed });
  });

  // ---- host commands ----
  bridge.on('pause', () => fsm.pause('host'));
  bridge.on('resume', () => fsm.resume('host'));
  bridge.on('mute', (p) => {
    runtime.hostMuted = p.muted === true;
    emitMute();
  });
  bridge.on('setLocale', (p) => {
    const lang = String(p.lang ?? '').slice(0, 2).toLowerCase();
    if ((LANGS as readonly string[]).includes(lang)) settings.set({ lang: lang as Lang });
  });
  bridge.on('setSafeArea', (p) => {
    const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(400, v)) : 0);
    runtime.safeArea = { top: n(p.top), right: n(p.right), bottom: n(p.bottom), left: n(p.left) };
    if (typeof document !== 'undefined') applySafeAreaCss(runtime.safeArea);
    bus.emit('safeArea', runtime.safeArea);
  });
  bridge.on('setQuality', (p) => {
    const q = p.tier as QualitySetting;
    if (['auto', 'ultra', 'high', 'medium', 'low'].includes(q)) settings.set({ quality: q });
  });
  bridge.on('setProfile', (p) => {
    runtime.hostProfile = {
      displayName: typeof p.displayName === 'string' ? p.displayName.slice(0, 40) : runtime.hostProfile.displayName,
      avatarUrl: typeof p.avatarUrl === 'string' ? p.avatarUrl.slice(0, 2048) : runtime.hostProfile.avatarUrl,
    };
    bus.emit('hostProfile', runtime.hostProfile);
  });
  bridge.on('back', () => bus.emit('back', {}));
  bridge.applyUrlParams();

  // ---- FSM ↔ loop ↔ perf ----
  const syncSim = (): void => loop.setSimEnabled(fsm.simRunning);
  bus.on('suspend', () => {
    loop.stop();
    input.releaseAll();
    opts.audio?.suspend?.();
    void flush();
  });
  bus.on('unsuspend', () => {
    if (readyCalled) loop.start();
    opts.audio?.resume?.();
    perf.grace(1500);
  });
  if (typeof window !== 'undefined') {
    onFirstGesture(() => {
      opts.audio?.unlock?.();
      if (settings.value.kanat.gyro !== 'off') void input.requestGyroPermission();
    });
  }
  bus.on('pause', syncSim);
  bus.on('resume', syncSim);
  bus.on('resumePrompt', syncSim);
  bus.on('state', ({ to }) => {
    syncSim();
    perf.grace(1000);
    // natural breaks: menus, mode select, results, restarts
    if (to === 'menu' || to === 'mode' || to === 'result' || to === 'game') perf.naturalBreak();
    if (to !== 'game') input.setScheme('menu');
  });
  bus.on('orientation', ({ width, height }) => input.setViewport(width, height));
  perf.on('report', (r) => bridge.perf(r.tier, r.fpsP50, r.fpsP90));
  perf.on('tier', (e) => {
    const snap = perf.snapshot();
    bridge.perf(e.to, snap.fpsP50, snap.fpsP90);
  });

  const flush = async (): Promise<void> => {
    await Promise.all([settings.flush(), save.flush()]);
  };

  if (typeof window !== 'undefined') installLifecycle(fsm, { onFlush: () => void flush() });

  // ---- debug ----
  setPerfPanelSource(() => perf.snapshot(typeof window !== 'undefined' ? window.innerWidth : 0, typeof window !== 'undefined' ? window.innerHeight : 0));
  let readyCalled = false;

  const summary = (): Record<string, unknown> => {
    const s = settings.value;
    return {
      version: opts.version,
      state: fsm.state,
      paused: fsm.paused,
      pauseReasons: fsm.pauseReasons(),
      suspended: fsm.suspended,
      resumePrompt: fsm.resumePromptVisible,
      visible: fsm.isVisible,
      contextLost: fsm.isContextLost,
      simRunning: fsm.simRunning,
      loopRunning: loop.running,
      tick: loop.tick,
      refreshHz: loop.refreshHz,
      renderEvery: loop.renderEvery,
      lang: s.lang,
      quality: s.quality,
      tier: perf.tier,
      fps: s.fps,
      muted: s.muted,
      hostMuted: runtime.hostMuted,
      effectiveMuted: s.muted || runtime.hostMuted,
      safeArea: runtime.safeArea,
      hostProfile: runtime.hostProfile,
      deepLinkMode: runtime.deepLinkMode,
      layers: layerNames(),
      bridge: { transport: bridge.transport(), ...bridge.stats },
      store: store.kind,
      hostStorage: store instanceof HostProfileStore ? store.hostStorageActive : null,
      settingsLoaded: settings.lastLoad,
      saveLoaded: save.lastLoad,
      pack: embeddedPackInfo(),
      single: isSingleFileBuild(),
      orientation: typeof window !== 'undefined' ? (window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape') : 'portrait',
      history: fsm.history.slice(-10),
      bootMs: Math.round(bootMs),
    };
  };

  if (testMode) {
    installTestApi(
      {
        app: summary,
        emit: (type, payload) => bridge.send(type as never, payload as never),
        bridgeLog: (): BridgeLogEntry[] => bridge.log.slice(),
        confirmResume: () => fsm.confirmResume(),
        loseContext: () => currentContext()?.forceLoss() ?? false,
        restoreContext: () => currentContext()?.forceRestore() ?? false,
      },
      true,
    );
    registerTestHandlers(
      {
        setTier: (t) => perf.forceTier(t),
        perf: () => perf.snapshot(),
        freezeVisuals: (on) => visualClock.freeze(on),
      },
      'platform',
    );
  }

  const app: App = {
    version: opts.version,
    modes,
    fsm,
    bus,
    bridge,
    store,
    settings,
    save,
    perf,
    loop,
    input,
    net,
    urlParams,
    testMode,
    runtime,
    effectiveMuted: () => settings.value.muted || runtime.hostMuted,
    setLoopHandlers(h) {
      handlers = h;
    },
    attachCanvas(canvas, gl) {
      const handle = attachContextLossHandling(canvas, fsm, gl);
      perf.attachGL(gl);
      loop.setProbe(readPixelsSync(gl), 1000);
      return handle;
    },
    loadingProgress(p) {
      bridge.loading(p);
    },
    ready() {
      if (readyCalled) return;
      readyCalled = true;
      if (fsm.state === 'boot') fsm.go('loading');
      if (fsm.state === 'loading') fsm.go('menu');
      bridge.loading(1);
      bridge.ready(opts.version, modes, opts.capabilities ?? {});
      if (!fsm.suspended) loop.start();
      markTestReady();
    },
    onFirstGesture: (fn) => onFirstGesture(fn),
    flush,
    summary,
  };

  fsm.go('loading');
  emitMute();
  const bootMs = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  markTime('boot');
  if (typeof document !== 'undefined') document.documentElement.dataset.kanatBoot = 'ok';
  booted = app;
  return app;
}

/** The booted app (null before boot()). */
export function getApp(): App | null {
  return booted;
}
