// Kariyer (integrator): career route flights, the first-launch FTUE film (ftue.ts), results → progress (stars,
// PB, Usta tasks, XP/rank, unlocks, cosmetics, badges, flight-log stamp, PB ghost code), dynamic help after 3
// crashes in the same section, the "Ters mi?" card, the assist step-down offer and "Sonraki".
import { routeMeta, ROUTE_META } from '../../content/meta/routes.meta.ts';
import { DYNAMIC_HELP, sectionOf, shouldOfferAssistDown, recordAssisted } from '../../content/meta/flightRules.ts';
import { unlockCardModes } from '../../content/meta/features.ts';
import { careerRouteNumber, GHOST_MODE } from '../../sim/replay/ghostCode.ts';
import type { RouteDef } from '../../sim/types.ts';
import { UI } from '../../ui/UI.ts';
import { careerShareText, renderShareCard } from '../../ui/share/index.ts';
import type { ResultsProps, UnlockProps } from '../../ui/types.ts';
import { getLang } from '../../ui/i18n.ts';
import { FlightModeBase } from '../../game/FlightModeBase.ts';
import type { IntroKind, SessionOptions, SessionResult } from '../../game/FlightSession.ts';
import { packSuitId } from '../../game/FlightSession.ts';
import type { Game } from '../../game/Game.ts';
import type { StageWorld } from '../../game/WorldStore.ts';
import { suitId } from '../../game/cosmetics.ts';
import { routeSeed } from '../../game/routes/worldContent.ts';
import { applyCareerFlight, isRouteUnlocked, routesLanded } from '../../game/progress.ts';
import type { ProgressDelta } from '../../game/progress.ts';
import { baseResultsProps, duelCodeText, shareText } from '../../game/results.ts';
import { grabFrame } from '../../game/frameGrab.ts';
import { taskVM } from '../../game/viewModels.ts';
import { FtueDirector } from './ftue.ts';
import { PhotoController } from '../free/photo.ts';
import { MenuMode } from '../menu/MenuMode.ts';

export function careerSessionOptions(game: Game, stage: StageWorld, route: RouteDef, intro: IntroKind, ftue: boolean, assistOverride?: 'full'): SessionOptions {
  const s = game.settings.kanat;
  const meta = routeMeta(route.id);
  const guideWind = (meta?.guideWindDefault ?? false) && !s.guideWindDone;
  const assist = assistOverride ?? s.flightAssist;
  const suit = suitId(game.profile.cosmetics.suit);
  return {
    mode: ftue ? 'ftue' : 'career',
    world: stage,
    route,
    seed: routeSeed(route.id),
    metric: 'score',
    assist,
    guideWind: ftue ? true : guideWind,
    slowMode: s.slowMode,
    autoParachute: s.autoParachute,
    freeFlight: false,
    intro,
    ghosts: [],
    playerName: game.app.runtime.hostProfile.displayName ?? game.profile.displayName ?? '',
    suitId: packSuitId(suit, assist, s.autoParachute),
    ghostMode: GHOST_MODE.career,
    routeRef: careerRouteNumber(route.id),
    gatePenaltySec: 0,
    reduceMotion: game.settings.reduceMotion,
  };
}

export async function startCareer(game: Game, routeId: string, intro: IntroKind, assistOverride?: 'full'): Promise<void> {
  const meta = routeMeta(routeId);
  if (!meta) return;
  const stage = await game.ensureWorld(meta.world);
  const route = stage.content.routes.find((r) => r.id === routeId);
  if (!route) return;
  const played = (game.profile.routes[routeId]?.plays ?? 0) > 0;
  const mode = new CareerMode(game, stage, route, played && intro === 'full' ? 'full' : intro, false, assistOverride);
  game.setMode(mode);
  mode.begin();
}

/** First launch: the §1 film on W1·R1 (no menu). */
export async function startFtue(game: Game): Promise<void> {
  const stage = await game.ensureWorld('kapadokya');
  const route = stage.content.routes[0];
  const mode = new CareerMode(game, stage, route, 'film', true);
  game.setMode(mode);
  mode.begin();
}

export class CareerMode extends FlightModeBase {
  readonly kind: string;
  readonly stage: StageWorld;
  readonly route: RouteDef;
  readonly ftue: FtueDirector | null;
  private delta: ProgressDelta | null = null;
  private helpPending = false;
  private photoCtl: PhotoController | null = null;
  private autoMenuTimer = 0;

  constructor(game: Game, stage: StageWorld, route: RouteDef, intro: IntroKind, ftue: boolean, assistOverride?: 'full') {
    const director = ftue ? new FtueDirector(game) : null;
    super(game, careerSessionOptions(game, stage, route, intro, ftue, assistOverride), {
      filmUpdate: director ? (t, dt, s) => director.filmUpdate(t, dt, s) : undefined,
      onIntroTap: director ? (t, s) => director.onIntroTap(t, s) : undefined,
      onEvent: (e, s) => {
        director?.onEvent(e, s);
      },
      onCrash: (e, s) => {
        this.countCrash(s.sim.state.gatesPassed);
        void e;
        return false;
      },
      onRetry: () => this.afterRetry(),
    });
    this.kind = ftue ? 'ftue' : 'career';
    this.stage = stage;
    this.route = route;
    this.ftue = director;
    if (director) {
      director.attach(this.session);
      this.session.introBalloonLead = 8;
    }
    this.session.invertCardEnabled = !ftue && !game.profile.ftue.invertAsked;
    this.session.invertAsk = () => {
      this.session.pause();
      UI.close('pause');
      UI.show('inverted');
    };
    if (assistOverride) this.session.ftueHint = null;
  }

  override render(alpha: number, dt: number): void {
    super.render(alpha, dt);
    this.ftue?.render(dt, this.session);
    this.photoCtl?.render(dt);
  }

  // ---- dynamic help (3 crashes in one section) ---------------------------------------------------------

  private countCrash(gatesPassed: number): void {
    const meta = this.game.metaDoc;
    const key = `${this.route.id}:${sectionOf(gatesPassed)}`;
    meta.sectionCrashes[key] = (meta.sectionCrashes[key] ?? 0) + 1;
    this.game.saveProgress();
    if (meta.sectionCrashes[key] >= DYNAMIC_HELP.crashesPerSection && !this.game.profile.ftue.dynamicHelpOff && !this.ftue) {
      meta.sectionCrashes[key] = 0;
      this.helpPending = true;
    }
  }

  private afterRetry(): void {
    if (!this.helpPending) return;
    this.helpPending = false;
    this.session.pause();
    UI.close('pause');
    UI.show('help');
  }

  helpChoice(c: string): void {
    if (c === 'assist') {
      // fresh session with Tam Yardım (the sim's assist level is fixed per flight for replay determinism)
      void startCareer(this.game, this.route.id, 'skip', 'full');
      return;
    }
    if (c === 'line') {
      this.game.scene.markers.setGuideLine(true);
    }
    this.session.resume();
  }

  // ---- photo mode (pause → Foto Modu) ------------------------------------------------------------------

  photo(): void {
    UI.close('pause');
    this.photoCtl = new PhotoController(this.game, this.session, () => {
      this.photoCtl = null;
      this.session.pause();
    });
  }

  photoChange(p: Parameters<PhotoController['change']>[0]): void {
    this.photoCtl?.change(p);
  }

  async photoSave(): Promise<void> {
    await this.photoCtl?.save();
  }

  photoExit(): void {
    this.photoCtl?.exit();
  }

  // ---- results --------------------------------------------------------------------------------------

  protected onFinished(r: SessionResult): void {
    const game = this.game;
    const p = game.profile;
    const bench = this.stage.content.bench[this.route.id] ?? { expertScore: this.route.expertScore, expertTimeSec: 90 };
    const landedBefore = routesLanded(p);
    const delta = applyCareerFlight(p, game.metaDoc, r.stats, bench, Date.now(), { countsRecords: true });
    this.delta = delta;
    if (this.ftue) p.ftue.done = true;
    if (r.code && delta.newBest && r.code.length <= 8000) p.ghosts[this.route.id] = r.code;
    game.saveProgress();
    void game.app.flush();
    const props: ResultsProps = {
      ...baseResultsProps('career', this.stage.id, r, this.route.gates.length, 0),
      routeId: this.route.id,
      prevStars: delta.prevStars,
      newBest: delta.newBest && delta.prevBest > 0,
      pbDelta: delta.prevBest > 0 && r.kind === 'landed' ? r.score - delta.prevBest : undefined,
      hasNext: this.nextRouteId() !== null,
      assisted: recordAssisted(r.stats),
      slow: r.stats.slowMode,
      tasksDone: delta.tasksThisFlight.map((id) => {
        const m = routeMeta(this.route.id);
        const task = m?.usta.find((t) => t.id === id);
        return task ? taskVM(task, true, bench) : null;
      }).filter((x): x is NonNullable<typeof x> => x !== null),
    };
    UI.show('results', props);
    UI.hud.setVisible(false);
    // unlock cards: one combined mode card + new worlds
    const cards: UnlockProps[] = [];
    const landedAfter = routesLanded(p);
    if (landedAfter > landedBefore) for (const m of unlockCardModes(landedAfter)) if (m === 'daily' || m === 'suru' || m === 'duel' || m === 'free' || m === 'weekly') cards.push({ kind: m });
    for (const w of delta.worlds) cards.push({ kind: 'world', world: w });
    // assist step-down offer (W1 R2–R3, once)
    const offer = shouldOfferAssistDown({ ...r.stats, assist: r.stats.assist }, p.ftue.helpOfferDeclined || game.settings.kanat.flightAssist !== 'full');
    if (this.ftue) {
      // §1 film ending: stars stamp, then the camera rises into the live menu with the combined unlock card
      this.autoMenuTimer = window.setTimeout(() => this.ftueToMenu(cards), 4600);
    } else {
      if (cards.length) window.setTimeout(() => game.queueUnlockCards(cards), 2600);
      else if (offer) window.setTimeout(() => UI.show('assistOff'), 2600);
    }
    // preload the next route's world while the results are up
    const nxt = this.nextRouteId();
    const nm = nxt ? routeMeta(nxt) : null;
    if (nm && nm.world !== this.stage.id) game.preloadWorld(nm.world);
  }

  private ftueToMenu(cards: UnlockProps[]): void {
    if (this.disposed || this.game.mode !== this) return;
    const from = this.game.scene.camera.position.clone();
    UI.close('results');
    this.game.app.fsm.go('menu');
    this.game.setMode(new MenuMode(this.game, { riseFrom: from }));
    if (cards.length) window.setTimeout(() => this.game.queueUnlockCards(cards), 1200);
  }

  private nextRouteId(): string | null {
    const i = ROUTE_META.findIndex((m) => m.id === this.route.id);
    for (let k = i + 1; k < ROUTE_META.length; k++) {
      const id = ROUTE_META[k].id;
      if (isRouteUnlocked(this.game.profile, id)) return id;
      break;
    }
    return null;
  }

  override restart(): void {
    window.clearTimeout(this.autoMenuTimer);
    super.restart();
  }

  override next(): void {
    window.clearTimeout(this.autoMenuTimer);
    const id = this.nextRouteId();
    if (id) void startCareer(this.game, id, 'full');
    else this.game.toMenu();
  }

  override quit(): void {
    window.clearTimeout(this.autoMenuTimer);
    super.quit();
  }

  override async share(): Promise<void> {
    window.clearTimeout(this.autoMenuTimer);
    const r = this.lastResult;
    if (!r) return;
    const lang = getLang();
    const text = careerShareText({ world: this.stage.id, routeId: this.route.id, stars: r.stars, score: r.score, strip: r.strip, duelCode: undefined, assisted: recordAssisted(r.stats), slow: r.stats.slowMode }, lang);
    let image: string | undefined;
    try {
      const hero = grabFrame(this.game);
      image = await renderShareCard({ world: this.stage.id, hero: hero ?? undefined, routeId: this.route.id, metric: { kind: 'score', value: r.score }, strip: r.strip, stars: r.stars, line: this.route.line.map((q) => [q[0], q[2]] as [number, number]), lang, colorBlind: this.game.settings.kanat.colorBlind });
    } catch (err) {
      console.warn('[career] share card failed', err);
    }
    await shareText(this.game, text, image);
  }

  override async duelCode(): Promise<void> {
    window.clearTimeout(this.autoMenuTimer);
    const r = this.lastResult;
    if (!r?.code) return;
    await shareText(this.game, duelCodeText(r.code, getLang()));
  }

  override dispose(): void {
    window.clearTimeout(this.autoMenuTimer);
    this.photoCtl?.exit();
    this.ftue?.dispose();
    super.dispose();
  }

  override testState(): Record<string, unknown> {
    return { ...super.testState(), ftue: this.ftue?.state() ?? null, delta: this.delta ? { xp: this.delta.xpAfter - this.delta.xpBefore, newStars: this.delta.newStars, tasks: this.delta.newTasks, badges: this.delta.badges, modes: this.delta.modes } : null };
  }
}
