// Game shell (integrator): wires the platform App (FSM, loop, bridge, input, saves, perf), the 3D scene, audio
// and the DOM UI into one game. Boot sequence: loading screen → audio bank + first world in parallel → GPU world
// build → micro-benchmark (warms shaders) → program warm-up → bridge `ready` → FTUE film (first launch) or the
// live 3D menu. Every UI callback lands here and is routed to the active mode.
import type { App } from '../core/boot.ts';
import { closeTopLayer } from '../core/layers.ts';
import { onContextRestored } from '../core/context.ts';
import type { QualityTier, Settings } from '../core/settings.ts';
import type { VersionedDoc } from '../core/save.ts';
import type { Profile } from '../core/profile.ts';
import { attachVersionTapTrigger, openPerfPanel } from '../debug/perfPanel.ts';
import { registerTestHandlers } from '../debug/testApi.ts';
import type { AudioEngine } from '../audio/AudioEngine.ts';
import type { WorldId } from '../sim/types.ts';
import { UI } from '../ui/UI.ts';
import type { CosmeticKind, PhotoParams, SuruSub, UICallbacks, UnlockProps } from '../ui/types.ts';
import { Scene3D } from './Scene3D.ts';
import { WorldStore, type StageWorld } from './WorldStore.ts';
import { createMetaDoc, normaliseProfile, type MetaDoc } from './progress.ts';
import type { ActiveMode } from './types.ts';
import { FlightModeBase } from './FlightModeBase.ts';
import { ViewModels } from './viewModels.ts';
import { GameTestHooks } from './testHooks.ts';
import { MenuMode } from '../modes/menu/MenuMode.ts';
import { startCareer, startFtue } from '../modes/career/CareerMode.ts';
import { startDaily, shareDailyBest } from '../modes/daily/DailyMode.ts';
import { lookupDuelCode, startDuel } from '../modes/duel/DuelMode.ts';
import { startFree } from '../modes/free/FreeMode.ts';
import { startSuru } from './suru.ts';

export const GAME_VERSION = '1.0.0';

export class Game {
  readonly app: App;
  readonly root: HTMLElement;
  readonly audio: AudioEngine;
  readonly worlds = new WorldStore();
  readonly vm: ViewModels;
  scene!: Scene3D;
  meta!: VersionedDoc<MetaDoc>;
  stage: StageWorld | null = null;
  mode: ActiveMode | null = null;
  private pendingTier: QualityTier | null = null;
  private applyingTier = false;
  private lastSizeCheck = 0;
  private sizeKey = '';
  private worldSwitch: Promise<StageWorld> | null = null;
  readonly test: GameTestHooks;
  /** Incoming duel code from the URL (?c=K1.… / ?duel=…) — opens the duel after boot. */
  private deepLinkCode: string | null = null;

  constructor(app: App, root: HTMLElement, audio: AudioEngine) {
    this.app = app;
    this.root = root;
    this.audio = audio;
    this.vm = new ViewModels(this);
    this.test = new GameTestHooks(this);
  }

  get profile(): Profile {
    return this.app.save.value;
  }

  get settings(): Readonly<Settings> {
    return this.app.settings.value;
  }

  get metaDoc(): MetaDoc {
    return this.meta.value;
  }

  /** Persist profile + meta (debounced). */
  saveProgress(): void {
    this.app.save.scheduleSave(200);
    this.meta.scheduleSave(200);
  }

  // ---- boot ---------------------------------------------------------------------------------------

  async start(): Promise<void> {
    const app = this.app;
    const t0 = performance.now();
    // canvas behind the UI
    const canvas = document.createElement('canvas');
    canvas.id = 'kanat-canvas';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    this.root.appendChild(canvas);
    const uiRoot = document.createElement('div');
    uiRoot.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    uiRoot.className = 'kanat-ui-root';
    this.root.appendChild(uiRoot);
    UI.mount(uiRoot, this.callbacks(), { settings: this.settings, safeArea: app.runtime.safeArea });
    (uiRoot.firstElementChild as HTMLElement | null)?.style.setProperty('pointer-events', 'auto');
    this.meta = createMetaDoc(app.store);
    const metaLoad = this.meta.load();
    normaliseProfile(this.profile);
    const firstWorld: WorldId = this.profile.ftue.done ? 'kapadokya' : 'kapadokya';
    UI.show('loading', { progress: 0, world: firstWorld });
    await UI.fontsReady.catch(() => undefined);

    this.scene = new Scene3D(canvas, app.perf.tier);
    const gl = this.scene.wr.renderer.getContext();
    app.attachCanvas(canvas, gl);
    if (app.perf.tier !== this.scene.tier) await this.scene.wr.setTier(app.perf.tier);
    this.resize(true);

    // parallel: audio bank, world data
    let pAudio = 0;
    let pWorld = 0;
    const progress = (): void => {
      const k = 0.2 * pAudio + 0.55 * pWorld;
      app.loadingProgress(k);
      UI.setLoadingProgress(k);
    };
    await metaLoad;
    const last = this.metaDoc.lastWorld;
    const worldId: WorldId = this.profile.ftue.done && this.profile.unlockedWorlds.includes(last) ? last : 'kapadokya';
    const [stage] = await Promise.all([
      this.worlds.get(worldId, (k) => {
        pWorld = k;
        progress();
      }),
      this.audio
        .prepare((k) => {
          pAudio = k;
          progress();
        })
        .catch((err) => console.warn('[game] audio bank failed', err)),
    ]);
    const tW = performance.now();
    await this.scene.setWorld(stage.loaded, stage.content);
    this.stage = stage;
    const tG = performance.now();
    app.loadingProgress(0.85);
    UI.setLoadingProgress(0.85);
    // micro-benchmark (≤ 1.5 s) doubles as shader warm-up, then the exact variants for the chosen tier
    if (app.perf.needsBenchmark) {
      try {
        await app.perf.benchmark((tier, mp) => this.scene.wr.drawBenchmark(tier, mp));
        await this.scene.setTier(app.perf.tier);
      } catch (err) {
        console.warn('[game] benchmark failed', err);
        await this.scene.setTier(app.perf.tier);
      }
    }
    const tB = performance.now();
    this.resize(true);
    await this.scene.warmup();
    const tC = performance.now();
    if (app.testMode) console.info(`[kanat] boot: data ${Math.round(tW - t0)} ms (world ${Math.round(stage.loadMs)} ms, content ${Math.round(stage.content.buildMs)} ms), gpu world ${Math.round(tG - tW)} ms, benchmark ${Math.round(tB - tG)} ms, warmup ${Math.round(tC - tB)} ms`);
    app.loadingProgress(1);
    UI.setLoadingProgress(1);

    this.wire();
    app.setLoopHandlers({
      step: () => this.mode?.step(),
      render: (alpha, dt) => this.renderFrame(alpha, dt),
    });
    app.perf.setRendererStatsSource(() => this.scene.wr.rendererStats());
    if (app.testMode) this.test.install();
    const code = this.readDeepLinkCode();
    this.deepLinkCode = code;
    app.ready();
    console.info(`[kanat] ready in ${Math.round(performance.now() - t0)} ms (tier ${app.perf.tier}, world ${worldId})`);
    // first launch = the §1 film; otherwise the live menu (or the deep-linked mode)
    const dl = app.runtime.deepLinkMode;
    if (this.deepLinkCode) {
      this.toMenu();
      void this.openDuel(this.deepLinkCode);
    } else if (app.testMode && new URLSearchParams(location.search).get('ftue') !== '1') {
      this.toMenu();
    } else if (!this.profile.ftue.done) {
      void startFtue(this);
    } else if (dl && dl !== 'menu') {
      this.toMenu();
      void this.openMode(dl);
    } else {
      this.toMenu();
    }
  }

  private readDeepLinkCode(): string | null {
    const q = new URLSearchParams(location.search);
    const c = q.get('c') ?? q.get('duel') ?? q.get('code');
    return c && c.length > 8 ? c : null;
  }

  // ---- wiring -------------------------------------------------------------------------------------

  private wire(): void {
    const app = this.app;
    const bus = app.bus;
    window.addEventListener('resize', () => this.resize(true));
    bus.on('orientation', () => this.resize(true));
    bus.on('resumePrompt', ({ show }) => {
      if (show) UI.show('resume');
      else UI.close('resume');
    });
    bus.on('back', () => this.back());
    bus.on('locale', ({ lang }) => {
      if (lang !== this.settings.lang) return;
      UI.setLang(lang);
    });
    bus.on('safeArea', (a) => UI.setSafeArea(a));
    bus.on('state', ({ to }) => {
      if (to !== 'game') this.applyPendingTier();
    });
    app.settings.onChange(({ settings, changed }) => this.onSettings(settings, changed));
    this.onSettings(this.settings, ['init']);
    app.perf.on('tier', (e) => {
      this.pendingTier = e.to;
      if (app.fsm.state !== 'game') this.applyPendingTier();
    });
    app.perf.on('suggestion', () => UI.toast(UI_TEXT.suggestion(this.settings.lang), { icon: 'settings' }));
    this.audio.setHapticSink((pattern, _name, bridgeName) => {
      app.bridge.haptic((bridgeName as never) ?? (Array.isArray(pattern) ? pattern : [Number(pattern) || 20]));
    });
    onContextRestored(async () => {
      await this.scene.rebuildAfterContextLoss();
    });
  }

  private onSettings(s: Readonly<Settings>, changed: string[]): void {
    UI.setSettings(s as Settings);
    this.audio.applySettings(s as Settings);
    this.audio.setVolumes({ muted: this.app.effectiveMuted() });
    const f = this.mode?.session?.follow;
    if (f) {
      f.opts.distance = s.kanat.cameraDistance;
      f.opts.helmet = s.kanat.helmetCam;
      f.opts.comfort = s.kanat.comfortCamera;
      f.opts.reduceMotion = s.reduceMotion;
    }
    if (changed.includes('lang')) UI.setLang(s.lang);
  }

  private back(): void {
    if (this.mode?.back?.()) return;
    if (UI.back()) return;
    if (closeTopLayer()) return;
    this.app.bridge.exit();
  }

  // ---- size / tier -----------------------------------------------------------------------------------

  resize(force = false): void {
    const w = Math.max(1, this.root.clientWidth || window.innerWidth);
    const h = Math.max(1, this.root.clientHeight || window.innerHeight);
    const pr = this.app.perf.pixelRatioFor(w, h);
    const key = `${w}x${h}@${pr.toFixed(3)}`;
    if (!force && key === this.sizeKey) return;
    this.sizeKey = key;
    this.scene.setSize(w, h, pr);
    this.app.input.setViewport(w, h);
  }

  private applyPendingTier(): void {
    const t = this.pendingTier;
    if (!t || this.applyingTier || !this.scene || t === this.scene.tier) {
      this.pendingTier = null;
      return;
    }
    this.pendingTier = null;
    this.applyingTier = true;
    void this.scene
      .setTier(t)
      .catch((err) => console.warn('[game] tier change failed', err))
      .finally(() => {
        this.applyingTier = false;
        this.resize(true);
      });
  }

  // ---- frame -----------------------------------------------------------------------------------------

  private renderFrame(alpha: number, dt: number): void {
    const now = performance.now();
    if (now - this.lastSizeCheck > 500) {
      this.lastSizeCheck = now;
      this.resize(false);
    }
    const m = this.mode;
    if (this.applyingTier) return;
    if (m) m.render(alpha, dt);
    if (!m || !m.ownsRender) this.scene.render(dt);
  }

  // ---- world ---------------------------------------------------------------------------------------

  /** Make `id` the scene's world (loads + builds GPU content; disposes the previous world). */
  async ensureWorld(id: WorldId): Promise<StageWorld> {
    if (this.stage && this.stage.id === id) return this.stage;
    if (this.worldSwitch) await this.worldSwitch.catch(() => undefined);
    if (this.stage && this.stage.id === id) return this.stage;
    const p = (async () => {
      UI.show('loading', { progress: 0, world: id });
      const st = await this.worlds.get(id, (k) => UI.setLoadingProgress(k * 0.7));
      this.setMode(null);
      await this.scene.setWorld(st.loaded, st.content);
      UI.setLoadingProgress(0.92);
      await this.scene.warmup();
      this.stage = st;
      this.worlds.evictExcept([id]);
      this.resize(true);
      return st;
    })();
    this.worldSwitch = p;
    try {
      return await p;
    } finally {
      this.worldSwitch = null;
    }
  }

  /** Warm the CPU side of a world (results screen preloads the next route's world). */
  preloadWorld(id: WorldId): void {
    if (this.stage?.id === id) return;
    void this.worlds.get(id).catch(() => undefined);
  }

  // ---- modes -----------------------------------------------------------------------------------------

  setMode(m: ActiveMode | null): void {
    if (this.mode && this.mode !== m) this.mode.dispose();
    this.mode = m;
    if (m?.session) this.onSettings(this.settings, []);
  }

  toMenu(): void {
    const fsm = this.app.fsm;
    if (fsm.state === 'game' || fsm.state === 'result' || fsm.state === 'mode') fsm.go('menu');
    this.setMode(new MenuMode(this));
  }

  async openMode(id: string): Promise<void> {
    if (id === 'daily') await startDaily(this);
    else if (id === 'free') await startFree(this, this.stage?.id ?? 'kapadokya');
    else if (id === 'suru') await startSuru(this, 'league');
    else if (id === 'career') await startCareer(this, this.vm.continueRouteId(), 'full');
  }

  async openDuel(code: string): Promise<void> {
    const res = await lookupDuelCode(this, code);
    if (res.ok) UI.show('duel', { code, ghost: res.ghost });
    else UI.show('duel', { code, error: res.error });
  }

  private flight(): FlightModeBase | null {
    return this.mode instanceof FlightModeBase ? this.mode : null;
  }

  // ---- UI callbacks -----------------------------------------------------------------------------------

  private callbacks(): UICallbacks {
    return {
      getMenu: () => this.vm.menu(),
      getWorlds: () => this.vm.worlds(),
      getRoutes: (w) => this.vm.routes(w),
      getModes: () => this.vm.modes(),
      getDaily: () => this.vm.daily(),
      getSuru: () => this.vm.suru(),
      getCollection: () => this.vm.collection(),
      getSettings: () => this.vm.settingsProps(),

      onContinue: () => void startCareer(this, this.vm.continueRouteId(), 'full'),
      onPlayRoute: (id) => void startCareer(this, id, 'full'),
      onPlayDaily: () => void startDaily(this),
      onShareDaily: () => void shareDailyBest(this),
      onDuelSubmit: (code) => lookupDuelCode(this, code),
      onDuelStart: (code) => void startDuel(this, code),
      onFreeFlight: (w) => void startFree(this, w),
      onSuru: (sub: SuruSub) => void startSuru(this, sub),
      onRankTap: () => {
        const c = this.vm.collection();
        UI.show('collection', { ...c, tab: 'badges' });
      },

      onPause: () => this.flight()?.pause(),
      onResume: () => this.flight()?.resume(),
      onRestart: () => {
        UI.close('pause');
        this.flight()?.restart();
      },
      onPhotoMode: () => (this.flight() as unknown as { photo?: () => void } | null)?.photo?.(),
      onQuitToMenu: () => {
        UI.close('pause');
        this.toMenu();
      },
      onExit: () => this.app.bridge.exit(),
      onParachute: () => this.flight()?.parachute(),

      onResultsRetry: () => this.flight()?.restart(),
      onResultsShare: () => this.flight()?.share(),
      onResultsDuelCode: () => this.flight()?.duelCode(),
      onResultsNext: () => this.flight()?.next(),
      onRematchCode: () => this.flight()?.duelCode(),

      onSettingsChange: (next, path) => {
        this.audio.event({ type: 'uiToggle' });
        this.app.settings.set(next);
        void path;
      },
      openPerfPanel: () => openPerfPanel(),
      onVersionLabel: (el) => attachVersionTapTrigger(el),
      onEquip: (kind: CosmeticKind, id: string) => this.equip(kind, id),
      onPhotoChange: (p: PhotoParams) => (this.mode as unknown as { photoChange?: (p: PhotoParams) => void } | null)?.photoChange?.(p),
      onPhotoSave: () => void (this.mode as unknown as { photoSave?: () => Promise<void> } | null)?.photoSave?.(),
      onPhotoExit: () => (this.mode as unknown as { photoExit?: () => void } | null)?.photoExit?.(),

      onHelpChoice: (c) => (this.mode as unknown as { helpChoice?: (c: string) => void } | null)?.helpChoice?.(c),
      onInvertedAnswer: (flip) => {
        this.profile.ftue.invertAsked = true;
        if (flip) this.app.settings.set({ kanat: { controlDir: this.settings.kanat.controlDir === 'natural' ? 'pilot' : 'natural' } });
        this.saveProgress();
        this.flight()?.resume();
      },
      onAssistOffAnswer: (off) => {
        this.profile.ftue.helpOfferDeclined = !off;
        if (off) this.app.settings.set({ kanat: { flightAssist: 'low', guideWindDone: true } });
        else this.app.settings.set({ kanat: { guideWindDone: false } });
        this.saveProgress();
      },
      onUnlockSeen: (kind: UnlockProps['kind'], world?: WorldId) => {
        const id = kind === 'world' && world ? `world:${world}` : kind;
        if (!this.metaDoc.seenUnlocks.includes(id)) this.metaDoc.seenUnlocks.push(id);
        if (kind !== 'world' && !this.profile.ftue.introducedModes.includes(kind as never)) this.profile.ftue.introducedModes.push(kind as never);
        this.saveProgress();
        (this.mode as unknown as { onCardClosed?: () => void } | null)?.onCardClosed?.();
      },
      onResumeTap: () => this.app.fsm.confirmResume(),
      onToastAction: () => undefined,

      readClipboard: async () => {
        try {
          return await navigator.clipboard.readText();
        } catch {
          return '';
        }
      },
      onUiSound: (cue: string) => {
        const map: Record<string, string> = { tap: 'uiTap', back: 'uiBack', open: 'uiSwish', star: 'star', tick: 'tally', toggle: 'uiToggle', confirm: 'uiConfirm', reward: 'reward' };
        this.audio.event({ type: map[cue] ?? 'uiTap' });
      },
      onHaptic: (p) => void this.app.bridge.haptic(p),
    } as UICallbacks;
  }

  private equip(kind: CosmeticKind, id: string): void {
    const ref = `${kind}:${id}`;
    if (!this.profile.cosmetics.owned.includes(ref) && !(kind === 'pattern' && id === '')) return;
    const s = this.profile.cosmetics.suit;
    if (kind === 'pattern') s.pattern = id;
    else if (kind === 'palette') s.palette = id;
    else s.trail = id;
    this.scene.setSuit(s);
    this.saveProgress();
    UI.update('collection', this.vm.collection());
  }

  // ---- results helpers ----------------------------------------------------------------------------------

  /** Show unlock cards (world / modes) one after another. */
  queueUnlockCards(cards: UnlockProps[]): void {
    const seen = this.metaDoc.seenUnlocks;
    const list = cards.filter((c) => !seen.includes(c.kind === 'world' && c.world ? `world:${c.world}` : c.kind));
    if (!list.length) return;
    const first = list[0];
    UI.show('unlock', first);
    const id = first.kind === 'world' && first.world ? `world:${first.world}` : first.kind;
    seen.push(id);
    this.saveProgress();
    if (list.length > 1) {
      const rest = list.slice(1);
      const timer = window.setInterval(() => {
        if (!UI.isOpen('unlock')) {
          window.clearInterval(timer);
          this.queueUnlockCards(rest);
        }
      }, 400);
    }
  }
}

const UI_TEXT = {
  suggestion: (lang: string): string => (lang === 'en' ? 'Medium is recommended for smoother play' : 'Akıcılık için Orta önerilir'),
};

export { registerTestHandlers };
