// SÜRÜ.io adapter (integrator): mounts the SÜRÜ agent's controller (src/modes/suru/SuruMode.ts `mount`) inside the
// game root, drives it from the platform loop (`dev.noLoop` + renderFrame), and wires audio (engine.suru +
// SÜRÜ events), haptics (bridge), results → League Points / XP / badges / flight-log, share and exit.
import { mount, type SuruAudioEvent, type SuruModeHandle, type SuruRoundResult, type HapticPattern } from '../modes/suru/SuruMode.ts';
import type { League } from '../modes/suru/ai/personalities.ts';
import { dailyInfoAt } from '../sim/replay/daily.ts';
import { UI } from '../ui/UI.ts';
import { getLang } from '../ui/i18n.ts';
import type { SuruSub } from '../ui/types.ts';
import type { ActiveMode } from './types.ts';
import type { Game } from './Game.ts';
import { applySuruRoundResult } from './progress.ts';

const LEAGUES = ['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const;

export class SuruMode implements ActiveMode {
  readonly kind = 'suru';
  readonly session = null;
  readonly ownsRender = true;
  private readonly game: Game;
  private readonly sub: SuruSub;
  private handle: SuruModeHandle | null = null;
  private container: HTMLElement | null = null;
  private audioT = 0;
  private offs: (() => void)[] = [];
  private lastResult: SuruRoundResult | null = null;
  private rounds = 0;

  constructor(game: Game, sub: SuruSub) {
    this.game = game;
    this.sub = sub;
  }

  async begin(): Promise<void> {
    const g = this.game;
    const fsm = g.app.fsm;
    if (fsm.state !== 'game') fsm.go('game', { mode: 'suru' });
    UI.show('flight');
    UI.hud.setVisible(false);
    const c = document.createElement('div');
    c.className = 'kanat-suru';
    c.style.cssText = 'position:absolute;inset:0;z-index:3;';
    // above the world canvas, under the KANAT UI layer
    g.root.insertBefore(c, g.root.children[1] ?? null);
    this.container = c;
    const info = dailyInfoAt(Date.now());
    const league = Math.max(0, LEAGUES.indexOf(g.profile.suru.league)) as League;
    const firstTime = !g.metaDoc.seenUnlocks.includes('suruFtue');
    this.handle = mount(c, {
      tier: g.app.perf.tier,
      lang: getLang(),
      league,
      subMode: this.sub,
      dayIndex: info.index,
      seed: (Date.now() & 0x7fffffff) >>> 0,
      twoThumbs: g.settings.kanat.twoThumbs,
      leftHanded: g.settings.leftHanded,
      ftue: firstTime,
      onEvent: (e) => this.onEvent(e),
      onHaptic: (p: HapticPattern) => void g.app.bridge.haptic(p as never),
      onRoundEnd: (r) => this.onRoundEnd(r),
      onFtueDone: () => {
        if (!g.metaDoc.seenUnlocks.includes('suruFtue')) g.metaDoc.seenUnlocks.push('suruFtue');
        g.saveProgress();
      },
      onExit: () => g.toMenu(),
      dev: { noLoop: true },
    });
    g.app.input.setScheme('menu');
    g.audio.music.setWorld('suru');
    g.app.bridge.started('suru');
    this.offs.push(
      g.app.bus.on('resumePrompt', ({ show }) => {
        if (!show) this.handle?.resume();
      }),
      g.app.bus.on('suspend', () => this.handle?.pause()),
    );
  }

  private onEvent(e: SuruAudioEvent): void {
    const a = this.game.audio;
    switch (e.type) {
      case 'capture':
        if (e.player) a.event({ type: 'suruJoin', pan: e.pan });
        break;
      case 'convertWave':
        if (e.player) a.event({ type: 'suruConvert', count: e.count, pan: e.pan });
        break;
      case 'siegeProgress':
        if (e.player && e.coverage > 0.5) a.event({ type: 'kusatmaStart', pan: e.pan });
        break;
      case 'siege':
        if (e.player) a.event({ type: 'kusatma', pan: e.pan });
        break;
      case 'hawkWarn':
        a.event({ type: 'hawkWarn', pan: e.pan });
        break;
      case 'gustWarn':
        a.event({ type: 'gustWarn', pan: e.pan });
        break;
      case 'stormSpawn':
        a.event({ type: 'stormStart' });
        break;
      case 'ringStart':
        a.event({ type: 'sunsetBell' });
        break;
      case 'roundEnd':
        a.event({ type: 'roundEnd', win: e.winner === 1 });
        break;
      case 'eliminated':
        if (e.player) a.event({ type: 'eliminated' });
        break;
      case 'breathless':
        if (e.player) a.event({ type: 'breathEmpty' });
        break;
      default:
        break;
    }
  }

  private onRoundEnd(r: SuruRoundResult): void {
    const g = this.game;
    this.lastResult = r;
    this.rounds++;
    const info = dailyInfoAt(Date.now());
    const k = info.dateKey;
    const dayKey = `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;
    const sub: 'league' | 'day' | 'practice' = r.subMode === 'daily' ? 'day' : r.subMode === 'practice' || r.subMode === 'ftue' ? 'practice' : 'league';
    applySuruRoundResult(
      g.profile,
      g.metaDoc,
      { placement: r.place, flocks: r.of, peakSize: r.player.peakSize, converted: r.player.converted, wildCollected: r.player.wildCollected, sieges: r.player.sieges, survivedToSunset: !r.player.eliminated, survivalSec: r.player.survivalSec },
      sub,
      dayKey,
      Date.now(),
    );
    g.saveProgress();
    g.app.bridge.ended({ mode: 'suru', score: r.player.peakSize, stars: 0, durationSec: Math.round(r.player.survivalSec), result: r.place === 1 ? 'win' : 'finish' } as never);
    g.app.bridge.analytics('suru_round', { place: r.place, of: r.of, sub });
  }

  step(): void {
    // the SÜRÜ controller runs its own 30 Hz accumulator inside renderFrame
  }

  render(_alpha: number, dt: number): void {
    const h = this.handle;
    if (!h) return;
    h.renderFrame(dt);
    this.audioT += dt;
    if (this.audioT > 0.1) {
      this.audioT = 0;
      const s = h.audioState();
      this.game.audio.suru.setState({ flockSize: s.size, density: s.density, timeFrac: s.sunset, tight: s.tight });
    }
  }

  back(): boolean {
    if (UI.top() && UI.top() !== 'flight') return false;
    this.game.toMenu();
    return true;
  }

  dispose(): void {
    for (const f of this.offs) f();
    this.offs = [];
    this.handle?.dispose();
    this.handle = null;
    this.container?.remove();
    this.container = null;
  }

  testState(): Record<string, unknown> {
    const h = this.handle;
    const sim = h?.round.sim;
    return {
      kind: 'suru',
      sub: this.sub,
      tick: sim?.tick ?? 0,
      timeSec: sim ? Math.round(sim.timeSec * 10) / 10 : 0,
      flocks: sim?.flockCount ?? 0,
      playerSize: sim ? sim.flockCountArr[1] + 1 : 0,
      roundOver: sim?.roundOver ?? false,
      rounds: this.rounds,
      result: this.lastResult ? { place: this.lastResult.place, of: this.lastResult.of, peak: this.lastResult.player.peakSize } : null,
    };
  }

  hash(): number {
    return this.handle?.round.sim.hashState() ?? 0;
  }

  stepN(n: number): void {
    // 60 Hz test ticks → SÜRÜ 30 Hz seconds
    this.handle?.advance(n / 60);
  }

  bot(policy: string | null): void {
    if (policy) this.handle?.advance(0);
  }
}
