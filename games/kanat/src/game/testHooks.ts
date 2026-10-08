// window.__game handlers (integrator, §9.2; only with ?test=1): state / hash / goto / input / step / bot / perf /
// freezeVisuals on top of the platform registry. goto resolves once the mode is controllable (FSM 'game').
import { registerTestHandlers, markTime } from '../debug/testApi.ts';
import { visualClock } from '../core/time.ts';
import type { QualityTier } from '../core/settings.ts';
import type { WorldId } from '../sim/types.ts';
import type { Game } from './Game.ts';
import { startCareer, startFtue } from '../modes/career/CareerMode.ts';
import { startDaily } from '../modes/daily/DailyMode.ts';
import { startDuel } from '../modes/duel/DuelMode.ts';
import { startFree } from '../modes/free/FreeMode.ts';
import { startSuru } from './suru.ts';
import { UI } from '../ui/UI.ts';

export class GameTestHooks {
  private readonly game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  install(): void {
    const g = this.game;
    registerTestHandlers(
      {
        state: () => this.state(),
        hash: () => g.mode?.hash?.() ?? 0,
        goto: (mode, level, seed) => this.goto(mode, level, seed),
        input: (cmd) => g.mode?.input?.(cmd),
        step: (n) => {
          g.mode?.stepN?.(Math.max(0, Math.floor(Number(n) || 0)));
          return this.state();
        },
        bot: (policy) => g.mode?.bot?.(policy),
        perf: () => ({ platform: g.app.perf.snapshot(window.innerWidth, window.innerHeight), scene: g.scene.perf(), heapMB: heapMB() }),
        setTier: (t: QualityTier) => {
          g.app.perf.forceTier(t);
          return t;
        },
        freezeVisuals: (on) => {
          visualClock.freeze(on);
          return on;
        },
      },
      'integrator',
    );
  }

  state(): Record<string, unknown> {
    const g = this.game;
    return {
      fsm: g.app.fsm.state,
      paused: g.app.fsm.paused,
      world: g.stage?.id ?? null,
      ui: UI.top(),
      screens: UI.top() ? [UI.top()] : [],
      mode: g.mode ? g.mode.testState() : null,
      profile: { xp: g.profile.xp, ftueDone: g.profile.ftue.done, routes: Object.fromEntries(Object.entries(g.profile.routes).map(([k, v]) => [k, v.stars])), modes: g.profile.unlockedModes, badges: g.profile.badges.length },
      settings: { lang: g.settings.lang, quality: g.settings.quality },
      tier: g.scene.tier,
    };
  }

  async goto(mode: string, level?: string | number, seed?: number): Promise<unknown> {
    const g = this.game;
    void seed;
    const lv = level === undefined ? undefined : String(level);
    switch (mode) {
      case 'menu':
        g.toMenu();
        break;
      case 'ftue':
        g.profile.ftue.done = false;
        await startFtue(g);
        break;
      case 'career':
        await startCareer(g, lv && /^w[1-5]r[1-4]$/.test(lv) ? lv : 'w1r1', 'skip');
        break;
      case 'daily':
        await startDaily(g, true);
        break;
      case 'duel':
        if (lv) await startDuel(g, lv);
        break;
      case 'free':
        await startFree(g, (lv as WorldId) ?? 'kapadokya');
        break;
      case 'suru':
        await startSuru(g, lv === 'daily' || lv === 'day' ? 'daily' : lv === 'practice' ? 'practice' : 'league');
        break;
      default:
        throw new Error(`goto: unknown mode ${mode}`);
    }
    markTime(`goto:${mode}`);
    return this.state();
  }
}

function heapMB(): number {
  const m = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return m ? Math.round(m.usedJSHeapSize / 1e5) / 10 : NaN;
}
