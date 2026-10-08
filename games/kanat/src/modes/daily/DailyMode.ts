// Günün Rotası (integrator): same route for everyone today (derived in dailyRoute.ts), time metric (+2 s per
// missed gate), unlimited attempts, personal-best ghost on later attempts, time-based stars (dailyStars),
// share card `KANAT · Günün Rotası #N 🪂 m:ss.t · Yakınlık … · ⭐⭐⭐` + duel line.
import { dailyStars, DAILY_RULES } from '../../content/meta/progression.ts';
import { showsAssistMark } from '../../content/meta/flightRules.ts';
import { dailyInfoAt, type DailyInfo } from '../../sim/replay/daily.ts';
import { decodeGhostCode, GHOST_MODE, toDisplayCode } from '../../sim/replay/ghostCode.ts';
import { SIM_VERSION } from '../../sim/version.ts';
import type { RouteDef } from '../../sim/types.ts';
import { UI } from '../../ui/UI.ts';
import { getLang } from '../../ui/i18n.ts';
import { dailyShareText, renderShareCard } from '../../ui/share/index.ts';
import type { ResultsProps } from '../../ui/types.ts';
import { FlightModeBase } from '../../game/FlightModeBase.ts';
import type { SessionGhost, SessionOptions, SessionResult } from '../../game/FlightSession.ts';
import { packSuitId } from '../../game/FlightSession.ts';
import type { Game } from '../../game/Game.ts';
import type { StageWorld } from '../../game/WorldStore.ts';
import { suitId } from '../../game/cosmetics.ts';
import { applyDailyFlight } from '../../game/progress.ts';
import { baseResultsProps, duelCodeText, shareText, stripDigits } from '../../game/results.ts';
import { grabFrame } from '../../game/frameGrab.ts';
import { deriveDailyRoute } from './dailyRoute.ts';

export async function startDaily(game: Game, introSkip = false): Promise<void> {
  const info = dailyInfoAt(Date.now());
  const stage = await game.ensureWorld(info.world);
  const { route, botSec } = deriveDailyRoute(stage, info);
  const mode = new DailyMode(game, stage, route, info, botSec, introSkip);
  game.setMode(mode);
  mode.begin();
}

/** Share today's best from the daily card (no flight needed). */
export async function shareDailyBest(game: Game): Promise<void> {
  const info = dailyInfoAt(Date.now());
  const d = game.profile.daily[String(info.index)];
  if (!d || d.bestTimeMs <= 0) return;
  const strip = d.strip.split('').map((c) => [0, 1, 2, 3, 5][Number(c)] ?? 0);
  const code = game.profile.ghosts[`daily-${info.index}`];
  const text = dailyShareText({ n: info.index, timeSec: d.bestTimeMs / 1000, strip, stars: d.stars, duelCode: code ? toDisplayCode(code) : undefined, assisted: d.assist }, getLang());
  await shareText(game, text);
}

function pbGhost(game: Game, info: DailyInfo): SessionGhost | null {
  const code = game.profile.ghosts[`daily-${info.index}`];
  if (!code) return null;
  const r = decodeGhostCode(code, SIM_VERSION);
  if (!r.ok) return null;
  return { input: r.ghost.input, header: r.ghost.header, name: getLang() === 'en' ? 'Your best' : 'En iyin' };
}

export class DailyMode extends FlightModeBase {
  readonly kind = 'daily';
  readonly stage: StageWorld;
  readonly route: RouteDef;
  readonly info: DailyInfo;
  readonly botSec: number;

  constructor(game: Game, stage: StageWorld, route: RouteDef, info: DailyInfo, botSec: number, introSkip: boolean) {
    const s = game.settings.kanat;
    const attempts = game.profile.daily[String(info.index)]?.attempts ?? 0;
    const ghost = pbGhost(game, info);
    const opts: SessionOptions = {
      mode: 'daily',
      world: stage,
      route,
      seed: info.seed,
      metric: 'time',
      assist: s.flightAssist,
      guideWind: false,
      slowMode: false, // K-08: same conditions for everyone
      autoParachute: s.autoParachute,
      freeFlight: false,
      intro: introSkip || attempts > 0 ? 'skip' : 'full',
      ghosts: ghost ? [ghost] : [],
      playerName: game.app.runtime.hostProfile.displayName ?? '',
      suitId: packSuitId(suitId(game.profile.cosmetics.suit), s.flightAssist, s.autoParachute),
      ghostMode: GHOST_MODE.daily,
      routeRef: info.index,
      gatePenaltySec: DAILY_RULES.missedGatePenaltySec,
      reduceMotion: game.settings.reduceMotion,
    };
    super(game, opts);
    this.stage = stage;
    this.route = route;
    this.info = info;
    this.botSec = botSec;
  }

  protected onFinished(r: SessionResult): void {
    const game = this.game;
    const landed = r.kind === 'landed';
    const stars = dailyStars(landed, r.timeSec, r.gatesMissed, this.botSec, this.session.x3Seconds());
    r.stars = stars;
    r.stats.stars = landed ? stars : 0;
    const assisted = showsAssistMark(r.stats.assist, r.assistUsed);
    const prev = game.profile.daily[String(this.info.index)];
    const delta = applyDailyFlight(game.profile, game.metaDoc, r.stats, { index: this.info.index, timeMs: r.resultTimeMs, strip: stripDigits(r), assist: assisted }, Date.now());
    if (r.code && delta.newBest && r.code.length <= 8000) game.profile.ghosts[`daily-${this.info.index}`] = r.code;
    game.saveProgress();
    const props: ResultsProps = {
      ...baseResultsProps('daily', this.stage.id, r, this.route.gates.length, DAILY_RULES.missedGatePenaltySec),
      dailyN: this.info.index,
      stars: landed ? stars : 0,
      prevStars: prev?.stars ?? 0,
      newBest: delta.newBest && (prev?.bestTimeMs ?? 0) > 0,
      pbDelta: prev && prev.bestTimeMs > 0 && landed ? (r.resultTimeMs - prev.bestTimeMs) / 1000 : undefined,
      ghostDelta: Number.isFinite(r.ghostDeltas[0]) ? r.ghostDeltas[0] : undefined,
      hasNext: false,
      assisted,
    };
    UI.show('results', props);
    UI.hud.setVisible(false);
  }

  override async share(): Promise<void> {
    const r = this.lastResult;
    if (!r || r.kind !== 'landed') return;
    const lang = getLang();
    const text = dailyShareText({ n: this.info.index, timeSec: r.resultTimeMs / 1000, strip: r.strip, stars: r.stars, duelCode: r.code ? toDisplayCode(r.code) : undefined, assisted: showsAssistMark(r.stats.assist, r.assistUsed) }, lang);
    let image: string | undefined;
    try {
      const hero = grabFrame(this.game);
      const y = Number(this.info.dateKey.slice(0, 4));
      const m = Number(this.info.dateKey.slice(4, 6));
      const d = Number(this.info.dateKey.slice(6, 8));
      image = await renderShareCard({ world: this.stage.id, hero: hero ?? undefined, dailyN: this.info.index, metric: { kind: 'time', sec: r.resultTimeMs / 1000 }, strip: r.strip, stars: r.stars, line: this.route.line.map((q) => [q[0], q[2]] as [number, number]), date: { y, m, d }, lang, colorBlind: this.game.settings.kanat.colorBlind });
    } catch (err) {
      console.warn('[daily] share card failed', err);
    }
    await shareText(this.game, text, image);
  }

  override async duelCode(): Promise<void> {
    const r = this.lastResult;
    if (!r?.code) return;
    await shareText(this.game, duelCodeText(r.code, getLang()));
  }

  override testState(): Record<string, unknown> {
    return { ...super.testState(), daily: { n: this.info.index, world: this.info.world, botSec: this.botSec, gates: this.route.gates.length } };
  }
}
