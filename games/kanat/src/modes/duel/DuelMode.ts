// Hayalet Düello (integrator): paste / deep-link a code → decode (crc → SIM_VERSION) → headless re-simulation →
// verifyGhostOutcome (forged/broken codes are rejected, TR/EN) → ghost card → race with up to 3 translucent ghosts
// (rival, your best, Usta bot), each driven by its own FlightSim + ReplayCursor; per-gate split on the HUD; result
// "Kazandın · 0,8 sn" + Rövanş Kodu. A received code ignores mode/world locks once (§2.5 Mod 3).
import { routeMeta } from '../../content/meta/routes.meta.ts';
import { DAILY_RULES } from '../../content/meta/progression.ts';
import { FlightSim } from '../../sim/FlightSim.ts';
import { dateKeyForDailyIndex, dailyInfo } from '../../sim/replay/daily.ts';
import { careerRouteIdFromNumber, decodeGhostCode, encodeGhostCode, GHOST_MODE, verifyGhostOutcome, type GhostHeader, type GhostReplay } from '../../sim/replay/ghostCode.ts';
import { ReplayCursor } from '../../sim/replay/playback.ts';
import { Recorder } from '../../sim/replay/recorder.ts';
import { SIM_VERSION } from '../../sim/version.ts';
import type { Command, RouteDef } from '../../sim/types.ts';
import { UI } from '../../ui/UI.ts';
import { getLang } from '../../ui/i18n.ts';
import type { DuelLookup, ResultsProps } from '../../ui/types.ts';
import { FlightModeBase } from '../../game/FlightModeBase.ts';
import { packSuitId, unpackSuitId, type SessionGhost, type SessionOptions, type SessionResult } from '../../game/FlightSession.ts';
import type { Game } from '../../game/Game.ts';
import type { StageWorld } from '../../game/WorldStore.ts';
import { suitId } from '../../game/cosmetics.ts';
import { LineBot } from '../../game/bots/LineBot.ts';
import { routeSeed } from '../../game/routes/worldContent.ts';
import { applyCareerFlight, isWorldUnlocked, recordDuelOutcome } from '../../game/progress.ts';
import { baseResultsProps, duelCodeText, shareText } from '../../game/results.ts';
import { deriveDailyRoute } from '../daily/dailyRoute.ts';

interface Resolved {
  replay: GhostReplay;
  stage: StageWorld;
  route: RouteDef;
  isDaily: boolean;
  penalty: number;
}

const verified = new Map<string, Resolved>();

async function resolveRoute(game: Game, h: GhostHeader): Promise<{ stage: StageWorld; route: RouteDef; isDaily: boolean } | null> {
  if (h.mode === GHOST_MODE.career) {
    const id = careerRouteIdFromNumber(h.routeRef);
    const m = id ? routeMeta(id) : null;
    if (!id || !m) return null;
    const stage = await game.worlds.get(m.world);
    const route = stage.content.routes.find((r) => r.id === id);
    return route ? { stage, route, isDaily: false } : null;
  }
  if (h.mode === GHOST_MODE.daily) {
    const key = dateKeyForDailyIndex(h.routeRef);
    const info = dailyInfo(key);
    const stage = await game.worlds.get(info.world);
    return { stage, route: deriveDailyRoute(stage, info).route, isDaily: true };
  }
  return null;
}

/** Re-simulate a ghost headlessly; returns its outcome for verifyGhostOutcome. */
function resimulate(stage: StageWorld, route: RouteDef, h: GhostHeader, rep: GhostReplay, penalty: number): { tickCount: number; finalTimeMs: number; score: number; finalStateHash: number } {
  const u = unpackSuitId(h.suitId);
  const sim = new FlightSim({
    world: stage.id,
    sampler: stage.loaded.sampler,
    route,
    propIndex: stage.content.propIndex,
    balloons: stage.content.balloons,
    seed: h.seed,
    assist: u.assist,
    guideWind: h.guideWind,
    slowMode: h.slowMode,
    autoParachute: u.autoParachute,
    water: stage.water.length ? stage.water : undefined,
    skipIntro: true,
  });
  const cur = new ReplayCursor(rep.input, 0);
  const cmds: Command[] = [];
  const max = Math.min(h.tickCount + 2, 60 * 600);
  while (sim.state.tick < h.tickCount && sim.state.tick < max) {
    cmds.length = 0;
    cur.commandsAt(sim.state.tick, cmds);
    const before = sim.state.tick;
    sim.step(cmds);
    sim.drainEvents();
    if (sim.state.tick === before) break;
  }
  const st = sim.state;
  return { tickCount: st.tick, finalTimeMs: Math.round((st.timeSec + penalty * st.gatesMissed) * 1000), score: Math.round(st.score), finalStateHash: sim.hash() >>> 0 };
}

export async function lookupDuelCode(game: Game, code: string): Promise<DuelLookup> {
  const dec = decodeGhostCode(code, SIM_VERSION);
  if (!dec.ok) return { ok: false, error: dec.error === 'version' ? 'version' : 'invalid' };
  const h = dec.ghost.header;
  const res = await resolveRoute(game, h);
  if (!res) return { ok: false, error: 'invalid' };
  const penalty = res.isDaily ? DAILY_RULES.missedGatePenaltySec : 0;
  await new Promise((r) => setTimeout(r, 0));
  const out = resimulate(res.stage, res.route, h, dec.ghost, penalty);
  const v = verifyGhostOutcome(h, out);
  if (!v.ok) {
    console.warn('[duel] verification failed', v.mismatch);
    return { ok: false, error: 'invalid' };
  }
  verified.set(code.trim(), { replay: dec.ghost, stage: res.stage, route: res.route, isDaily: res.isDaily, penalty });
  const name = h.playerName || (getLang() === 'en' ? 'Pilot' : 'Pilot');
  return {
    ok: true,
    ghost: {
      name,
      route: res.isDaily ? { kind: 'daily', n: h.routeRef } : { kind: 'career', routeId: res.route.id },
      metric: res.isDaily ? { kind: 'time', sec: h.finalTimeMs / 1000 } : { kind: 'score', value: h.score },
      oneTime: !isWorldUnlocked(game.profile, res.stage.id),
    },
  };
}

/** Usta bot ghost: the expert bot flies the route headlessly and records a ghost input. */
function expertGhost(stage: StageWorld, route: RouteDef, seed: number, penalty: number, mode: 0 | 1, routeRef: number): SessionGhost | null {
  const sim = new FlightSim({ world: stage.id, sampler: stage.loaded.sampler, route, propIndex: stage.content.propIndex, balloons: stage.content.balloons, seed, assist: 'off', water: stage.water.length ? stage.water : undefined, skipIntro: true });
  const bot = new LineBot(route, stage.loaded.sampler, 'expert', 7);
  const rec = new Recorder(0);
  const cmds: Command[] = [];
  for (let i = 0; i < 60 * 240; i++) {
    cmds.length = 0;
    bot.commands(sim.state, cmds);
    rec.pushAll(cmds);
    sim.step(cmds);
    sim.drainEvents();
    if (sim.phase === 'landed' || sim.phase === 'crashed') break;
    if (sim.phase === 'halfFlight' && !sim.state.canopyOpen) break;
  }
  if (sim.phase !== 'landed') return null;
  const st = sim.state;
  const header: GhostHeader = {
    simVersion: SIM_VERSION,
    mode,
    routeRef,
    seed,
    assist: false,
    slowMode: false,
    guideWind: false,
    suitId: packSuitId(0, 'off', false),
    tickCount: st.tick,
    finalTimeMs: Math.round((st.timeSec + penalty * st.gatesMissed) * 1000),
    score: Math.round(st.score),
    finalStateHash: sim.hash() >>> 0,
    playerName: 'Usta',
  };
  return { input: rec.input(), header, name: 'Usta', color: '#FFE08A' };
}

export async function startDuel(game: Game, code: string): Promise<void> {
  let r = verified.get(code.trim());
  if (!r) {
    const res = await lookupDuelCode(game, code);
    if (!res.ok) {
      UI.show('duel', { code, error: res.error });
      return;
    }
    r = verified.get(code.trim());
    if (!r) return;
  }
  const stage = await game.ensureWorld(r.stage.id);
  // the duel unlocks itself (code received → mode open)
  if (!game.profile.unlockedModes.includes('duel')) game.profile.unlockedModes.push('duel');
  const mode = new DuelMode(game, stage, r, code);
  game.setMode(mode);
  mode.begin();
}

export class DuelMode extends FlightModeBase {
  readonly kind = 'duel';
  readonly stage: StageWorld;
  readonly route: RouteDef;
  readonly r: Resolved;
  readonly code: string;

  constructor(game: Game, stage: StageWorld, r: Resolved, code: string) {
    const s = game.settings.kanat;
    const h = r.replay.header;
    const ghosts: SessionGhost[] = [{ input: r.replay.input, header: h, name: h.playerName || 'Pilot' }];
    const pbKey = r.isDaily ? `daily-${h.routeRef}` : r.route.id;
    const pb = game.profile.ghosts[pbKey];
    if (pb) {
      const d = decodeGhostCode(pb, SIM_VERSION);
      if (d.ok) ghosts.push({ input: d.ghost.input, header: d.ghost.header, name: getLang() === 'en' ? 'Your best' : 'En iyin' });
    }
    const ex = expertGhost(stage, r.route, h.seed, r.penalty, r.isDaily ? GHOST_MODE.daily : GHOST_MODE.career, h.routeRef);
    if (ex) ghosts.push(ex);
    const opts: SessionOptions = {
      mode: 'duel',
      world: stage,
      route: r.route,
      seed: r.isDaily ? h.seed : routeSeed(r.route.id),
      metric: r.isDaily ? 'time' : 'score',
      assist: s.flightAssist,
      guideWind: false,
      slowMode: false,
      autoParachute: s.autoParachute,
      freeFlight: false,
      intro: 'full',
      ghosts,
      playerName: game.app.runtime.hostProfile.displayName ?? '',
      suitId: packSuitId(suitId(game.profile.cosmetics.suit), s.flightAssist, s.autoParachute),
      ghostMode: r.isDaily ? GHOST_MODE.daily : GHOST_MODE.career,
      routeRef: h.routeRef,
      gatePenaltySec: r.penalty,
      reduceMotion: game.settings.reduceMotion,
    };
    super(game, opts);
    this.stage = stage;
    this.route = r.route;
    this.r = r;
    this.code = code;
  }

  protected onFinished(res: SessionResult): void {
    const game = this.game;
    const h = this.r.replay.header;
    const landed = res.kind === 'landed';
    let won: boolean | null;
    let deltaSec: number;
    if (this.r.isDaily) {
      deltaSec = (res.resultTimeMs - h.finalTimeMs) / 1000;
      won = !landed ? false : deltaSec < 0 ? true : deltaSec > 0 ? false : null;
    } else {
      deltaSec = Number.isFinite(res.ghostDeltas[0]) ? res.ghostDeltas[0] : 0;
      won = !landed ? false : res.score > h.score ? true : res.score < h.score ? false : null;
    }
    recordDuelOutcome(game.metaDoc, won === true, false);
    if (!this.r.isDaily) {
      const bench = this.stage.content.bench[this.route.id] ?? { expertScore: this.route.expertScore, expertTimeSec: 90 };
      applyCareerFlight(game.profile, game.metaDoc, { ...res.stats, mode: 'duel' }, bench, Date.now(), { countsRecords: isWorldUnlocked(game.profile, this.stage.id) });
    }
    game.saveProgress();
    const props: ResultsProps = {
      ...baseResultsProps('duel', this.stage.id, res, this.route.gates.length, this.r.penalty),
      routeId: this.r.isDaily ? undefined : this.route.id,
      dailyN: this.r.isDaily ? h.routeRef : undefined,
      timeSec: this.r.isDaily ? res.resultTimeMs / 1000 : res.timeSec,
      duel: { won, deltaSec: Math.abs(deltaSec), opponent: h.playerName || 'Pilot' },
      hasNext: false,
    };
    UI.show('results', props);
    UI.hud.setVisible(false);
  }

  override async duelCode(): Promise<void> {
    const r = this.lastResult;
    if (!r?.code) return;
    await shareText(this.game, duelCodeText(r.code, getLang()));
  }

  override async share(): Promise<void> {
    await this.duelCode();
  }
}

export { encodeGhostCode };
