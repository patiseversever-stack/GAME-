// UI view-models (integrator): builds the props every screen asks for (src/ui/types.ts) from the save, the meta
// counters, the design data (src/content/meta) and the loaded world content. Ids + numbers only; the UI resolves
// every visible string through i18n.
import { levelProgress } from '../content/meta/progression.ts';
import { ROUTE_META, routeMeta, routesOfWorld, ustaI18n, resolveUstaTarget } from '../content/meta/routes.meta.ts';
import { SUIT_PATTERNS, PALETTES, TRAILS } from '../content/meta/cosmetics.ts';
import { visibleBadges, modeOn, enabledWorlds } from '../content/meta/features.ts';
import { POSTCARDS } from '../content/meta/postcards.ts';
import type { UstaTask } from '../content/meta/types.ts';
import { dailyInfoAt } from '../sim/replay/daily.ts';
import type { WorldId } from '../sim/types.ts';
import { WORLD_IDS } from '../sim/types.ts';
import { WORLD_UNLOCK_STARS } from '../ui/content.ts';
import type { BadgeId } from '../ui/content.ts';
import type {
  CollectionProps,
  CosmeticVM,
  DailyProps,
  MenuProps,
  ModesProps,
  RoutesProps,
  RouteVM,
  SettingsProps,
  SuruProps,
  UstaTaskVM,
  WorldsProps,
} from '../ui/types.ts';
import type { ProxTier } from '../ui/theme.ts';
import type { Game } from './Game.ts';
import { continueRoute, isModeUnlocked, isRouteUnlocked, isWorldUnlocked, lockRouteFor, totalStars, worldStars } from './progress.ts';
import { dailyRouteSummary } from '../modes/daily/dailyRoute.ts';

const LEAGUE_INDEX: Record<string, number> = { bronze: 0, silver: 1, gold: 2, platinum: 3, diamond: 4 };

export const CREDITS = [
  'KANAT — Claude Code otonom oyun stüdyosu',
  'Arazi: AWS Terrain Tiles (Terrarium) — Mapzen / Tilezen; kaynak veri: SRTM, GMTED, ETOPO1 (kamu malı / açık lisanslar).',
  'Yazı tipleri: Google Fonts (SIL Open Font License).',
  'Ses ve müzik: tamamı kodla sentezlenmiştir (örnek kayıt yok).',
  'three.js (MIT), postprocessing (Zlib), fflate (MIT).',
].join('\n');

export function taskVM(task: UstaTask, done: boolean, bench?: { expertScore: number; expertTimeSec: number }): UstaTaskVM {
  const i = ustaI18n(task, bench);
  const type = i.key.replace(/^usta\./, '');
  const target = resolveUstaTarget(task, bench);
  return { id: task.id, type, count: i.params.count, value: target ?? i.params.value, done };
}

export class ViewModels {
  private readonly game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  continueRouteId(): string {
    return continueRoute(this.game.profile, this.game.metaDoc);
  }

  private bench(routeId: string): { expertScore: number; expertTimeSec: number } | undefined {
    const st = this.game.stage;
    const b = st?.content.bench[routeId];
    if (b) return b;
    const other = this.game.worlds.peek(routeMeta(routeId)?.world ?? 'kapadokya');
    return other?.content.bench[routeId];
  }

  menu(): MenuProps {
    const p = this.game.profile;
    const meta = this.game.metaDoc;
    const lp = levelProgress(p.xp);
    const info = dailyInfoAt(Date.now());
    const d = p.daily[String(info.index)];
    const routeId = this.continueRouteId();
    const anyFlown = Object.keys(p.routes).length > 0;
    return {
      continueRoute: anyFlown || p.ftue.done ? { routeId, stars: p.routes[routeId]?.stars ?? 0 } : undefined,
      daily: {
        n: info.index,
        world: info.world,
        bestSec: d && d.bestTimeMs > 0 ? d.bestTimeMs / 1000 : undefined,
        stars: d?.stars,
        unlocked: modeOn('daily') && isModeUnlocked(p, 'daily'),
        lockRoute: lockRouteFor('daily'),
      },
      rank: { level: lp.level, xp: lp.into, xpNext: lp.span },
      suru: { unlocked: modeOn('suru') && isModeUnlocked(p, 'suru'), league: LEAGUE_INDEX[p.suru.league] ?? 0, lp: p.suru.lp, lockRoute: lockRouteFor('suru') },
      modes: { duel: isModeUnlocked(p, 'duel'), free: isModeUnlocked(p, 'free') },
      collection: { postcards: p.postcards.length, badges: p.badges.length },
      world: meta.lastWorld,
    };
  }

  worlds(): WorldsProps {
    const p = this.game.profile;
    const ts = totalStars(p);
    const on = enabledWorlds();
    return {
      totalStars: ts,
      worlds: WORLD_IDS.filter((w) => on.includes(w)).map((w) => ({ id: w, stars: worldStars(p, w), unlocked: isWorldUnlocked(p, w), unlockAt: WORLD_UNLOCK_STARS[w] })),
      focus: this.game.metaDoc.lastWorld,
    };
  }

  routes(world: WorldId): RoutesProps {
    const p = this.game.profile;
    const st = this.game.stage?.id === world ? this.game.stage : this.game.worlds.peek(world);
    const routes: RouteVM[] = routesOfWorld(world).map((m) => {
      const rec = p.routes[m.id];
      const def = st?.content.routes.find((r) => r.id === m.id);
      const bench = this.bench(m.id);
      return {
        id: m.id,
        difficulty: m.difficulty,
        stars: rec?.stars ?? 0,
        bestScore: rec && rec.bestScore > 0 ? rec.bestScore : undefined,
        bestTimeSec: rec && rec.bestTimeMs > 0 ? rec.bestTimeMs / 1000 : undefined,
        tasks: m.usta.map((t, i) => taskVM(t, rec?.tasks[i] === true, bench)),
        locked: !isRouteUnlocked(p, m.id),
        startType: m.startType,
        line: def ? def.line.map((q) => [q[0], q[2]] as [number, number]) : undefined,
      };
    });
    const sel = routes.find((r) => !r.locked && r.stars === 0)?.id ?? routes[0]?.id;
    return { world, stars: worldStars(p, world), routes, selected: sel };
  }

  modes(): ModesProps {
    const p = this.game.profile;
    const info = dailyInfoAt(Date.now());
    return {
      careerStars: totalStars(p),
      daily: { unlocked: isModeUnlocked(p, 'daily'), lockRoute: lockRouteFor('daily'), n: info.index },
      duel: { unlocked: isModeUnlocked(p, 'duel'), lockRoute: lockRouteFor('duel') },
      free: { unlocked: isModeUnlocked(p, 'free'), lockRoute: lockRouteFor('free'), worlds: WORLD_IDS.filter((w) => isWorldUnlocked(p, w) && enabledWorlds().includes(w)) },
      suru: { unlocked: isModeUnlocked(p, 'suru'), lockRoute: lockRouteFor('suru'), league: LEAGUE_INDEX[p.suru.league] ?? 0, lp: p.suru.lp, dayN: info.index },
    };
  }

  daily(): DailyProps {
    const p = this.game.profile;
    const info = dailyInfoAt(Date.now());
    const d = p.daily[String(info.index)];
    const y = Number(info.dateKey.slice(0, 4));
    const m = Number(info.dateKey.slice(4, 6));
    const dd = Number(info.dateKey.slice(6, 8));
    const sum = dailyRouteSummary(this.game, info);
    const strip = d && d.strip ? (d.strip.split('').map((c) => [0, 1, 2, 3, 5][Number(c)] ?? 0) as ProxTier[]) : undefined;
    return {
      n: info.index,
      world: info.world,
      date: { y, m, d: dd },
      difficulty: info.difficulty,
      gates: sum.gates,
      bestSec: d && d.bestTimeMs > 0 ? d.bestTimeMs / 1000 : undefined,
      stars: d?.stars,
      strip,
      attempts: d?.attempts ?? 0,
      botSec: sum.botSec,
      assisted: d?.assist,
      slow: false,
    };
  }

  suru(): SuruProps {
    const p = this.game.profile;
    const info = dailyInfoAt(Date.now());
    const day = p.suru.days[`${info.dateKey.slice(0, 4)}-${info.dateKey.slice(4, 6)}-${info.dateKey.slice(6, 8)}`];
    return { league: LEAGUE_INDEX[p.suru.league] ?? 0, lp: p.suru.lp, dayN: info.index, dayBestPlace: day?.rank, dayFlocks: undefined };
  }

  collection(): CollectionProps {
    const p = this.game.profile;
    const owned = new Set(p.cosmetics.owned);
    const vm = (kind: 'pattern' | 'palette' | 'trail', id: string, src: { kind: string; routeId?: string; level?: number; world?: WorldId; stamps?: number }): CosmeticVM => {
      const s = src.kind;
      const source =
        s === 'start' ? { kind: 'start' as const }
        : s === 'usta' ? { kind: 'usta' as const, routeId: src.routeId }
        : s === 'rank' ? { kind: 'rank' as const, n: src.level }
        : s === 'postcards' ? { kind: 'postcards' as const, world: src.world }
        : s === 'weekly' ? { kind: 'weekly' as const }
        : { kind: 'log' as const, n: src.stamps ?? 7 };
      return { id, unlocked: owned.has(`${kind}:${id}`) || s === 'start', source };
    };
    const got = new Set(p.postcards);
    const badges = new Set(p.badges);
    return {
      tab: 'postcards',
      postcards: POSTCARDS.map((pc) => ({ id: pc.id, world: pc.world, got: got.has(pc.id) })),
      patterns: SUIT_PATTERNS.map((c) => vm('pattern', c.id, c.source as never)),
      palettes: PALETTES.map((c) => vm('palette', c.id, c.source as never)),
      trails: TRAILS.map((c) => vm('trail', c.id, c.source as never)),
      equipped: { pattern: p.cosmetics.suit.pattern, palette: p.cosmetics.suit.palette, trail: p.cosmetics.suit.trail },
      badges: visibleBadges().map((b) => ({ id: b.id as BadgeId, got: badges.has(b.id) })),
    };
  }

  settingsProps(inFlight = false): SettingsProps {
    const app = this.game.app;
    return {
      settings: app.settings.value as SettingsProps['settings'],
      currentTier: app.perf.tier,
      ultraCapable: app.perf.ultra120Available(app.loop.refreshHz),
      version: app.version,
      credits: CREDITS,
      inFlight: inFlight || app.fsm.state === 'game',
    };
  }
}

export { ROUTE_META };
