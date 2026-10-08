// Common shell of every flight mode (integrator): owns one FlightSession, routes pause / restart / quit /
// parachute / results buttons, and switches the FSM (game ↔ result ↔ menu). Subclasses (src/modes/*) build the
// session options and turn a SessionResult into progress + the results screen.
import type { SessionResult } from './FlightSession.ts';
import { FlightSession, type SessionHooks, type SessionOptions } from './FlightSession.ts';
import type { ActiveMode } from './types.ts';
import type { Game } from './Game.ts';
import { UI } from '../ui/UI.ts';
import type { BotPolicy } from './bots/LineBot.ts';
import { BOT_POLICIES } from './bots/LineBot.ts';

export abstract class FlightModeBase implements ActiveMode {
  abstract readonly kind: string;
  readonly game: Game;
  session: FlightSession;
  lastResult: SessionResult | null = null;
  protected disposed = false;

  constructor(game: Game, opts: SessionOptions, hooks: Partial<SessionHooks> = {}) {
    this.game = game;
    this.session = new FlightSession(game.app, game.scene, game.audio, opts, {
      onFinished: (r) => this.finished(r),
      ...hooks,
    });
  }

  /** Start: FSM → game, flight screen, HUD. */
  begin(): void {
    const fsm = this.game.app.fsm;
    if (fsm.state !== 'game') fsm.go('game', { mode: this.kind });
    else fsm.go('game', { mode: this.kind, restart: true });
    this.session.begin();
    this.game.app.bridge.started(this.kind);
    this.game.app.bridge.analytics('flight_start', { mode: this.kind, route: this.session.route.id });
  }

  step(): void {
    this.session.step();
  }

  render(alpha: number, dt: number): void {
    this.session.render(alpha, dt);
  }

  private finished(r: SessionResult): void {
    this.lastResult = r;
    this.game.app.bridge.ended({ mode: this.kind, score: r.score, stars: r.stars, durationSec: Math.round(r.timeSec * 10) / 10, result: r.kind === 'half' ? 'half' : 'landed' } as never);
    if (this.game.app.fsm.state === 'game') this.game.app.fsm.go('result', { mode: this.kind });
    this.onFinished(r);
  }

  /** Mode-specific results (progress + UI). */
  protected abstract onFinished(r: SessionResult): void;

  // ---- UI actions ----------------------------------------------------------------------------------

  pause(): void {
    this.session.pause();
  }

  resume(): void {
    this.session.resume();
  }

  /** Pause menu "Yeniden" / results "Tekrar". */
  restart(): void {
    UI.close('results');
    const fsm = this.game.app.fsm;
    if (fsm.state === 'result') fsm.go('game', { mode: this.kind, restart: true });
    else if (fsm.state === 'game') fsm.go('game', { mode: this.kind, restart: true });
    this.session.restart();
    UI.hud.setVisible(true);
  }

  parachute(): void {
    this.game.app.input.queueAction('parachute');
  }

  quit(): void {
    this.game.toMenu();
  }

  /** Results "Sonraki" (career) — default: back to the menu. */
  next(): void {
    this.game.toMenu();
  }

  share(): void {
    // subclasses build the share card
  }

  duelCode(): void {
    // subclasses copy/share the ghost code
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.session.dispose();
  }

  testState(): Record<string, unknown> {
    return { kind: this.kind, ...this.session.testState(), result: this.lastResult ? { kind: this.lastResult.kind, score: this.lastResult.score, stars: this.lastResult.stars, timeMs: this.lastResult.resultTimeMs, code: this.lastResult.code ? this.lastResult.code.length : 0 } : null };
  }

  hash(): number {
    return this.session.sim.hash();
  }

  stepN(n: number): void {
    this.session.stepN(n);
  }

  input(cmd: unknown): void {
    const c = cmd as { cmd?: string; args?: number[] };
    if (c && c.cmd === 'parachute') this.game.app.input.queueAction('parachute');
  }

  bot(policy: string | null): void {
    const p = policy && (BOT_POLICIES as readonly string[]).includes(policy) ? (policy as BotPolicy) : null;
    this.session.setBot(p);
  }
}
