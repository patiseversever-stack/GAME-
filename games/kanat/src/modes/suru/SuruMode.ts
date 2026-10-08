// SÜRÜ.io mode controller: mount(container, deps) → fixed-step 30 Hz sim (accumulator, ≤ 5 catch-up steps),
// touch → commands (identical to bot commands), render with interpolation, DOM HUD, events → audio/haptic
// hooks, round end → results callback, instant new round (< 2 s), FTUE (45 s, textless), practice and the seeded
// "Sürü Günü" sub-mode.

import type { QualityTier } from '../../core/settings.ts';
import { SURU } from './sim/config.ts';
import { SuruSim } from './sim/SuruSim.ts';
import type { FlockStats, SuruCommand, SuruEvent } from './sim/types.ts';
import { createRound, FTUE_SPOTS } from './round.ts';
import type { Round, SuruSubMode } from './round.ts';
import { LEAGUE_NAMES } from './ai/personalities.ts';
import type { League } from './ai/personalities.ts';
import { SuruRenderer } from './render/SuruRenderer.ts';
import type { ShowShape } from './render/Birds.ts';
import { SuruHud } from './hud/SuruHud.ts';
import type { Lang } from './hud/SuruHud.ts';
import { SuruInput } from './input.ts';

export type { ShowShape } from './render/Birds.ts';
export type { SuruSubMode } from './round.ts';

export type HapticPattern = 'hafif' | 'orta' | 'güçlü' | 'çift' | 'yıldız';

/** Audio hook payload: every sim event (+ player relation, screen pan, distance) and a few UI-side events. */
export type SuruAudioEvent =
  | (SuruEvent & { player: boolean; pan: number; dist: number })
  | { type: 'tight'; tick: number; player: true; pan: 0; dist: 0 }
  | { type: 'wide'; tick: number; player: true; pan: 0; dist: 0 };

/** Continuous mix state for the murmur drone / music (§2.12): poll every frame or at 10 Hz. */
export interface SuruAudioState {
  size: number;
  /** 0..1 local density proxy (flock size, tighter = denser) — opens the murmur filter */
  density: number;
  tight: boolean;
  breath: number;
  /** 0 at 0:00 → 1 at 3:00 (music: major → soft minor → blue-hour pad) */
  sunset: number;
  inStorm: boolean;
  outsideRing: boolean;
  /** nearest enemy leader distance (m) — contact tension */
  enemyDist: number;
  paused: boolean;
}

export interface SuruRoundResult {
  subMode: SuruSubMode;
  dayIndex: number | null;
  seed: number;
  layoutId: string;
  place: number;
  of: number;
  player: FlockStats;
  all: FlockStats[];
  lpDelta: number;
  winner: number;
  shareText: string;
  /** largest single siege count / conversion wave this round (highlight clip hint) */
  highlightTick: number;
}

export interface SuruModeDeps {
  tier?: QualityTier;
  lang?: Lang;
  league?: League;
  subMode?: SuruSubMode;
  seed?: number;
  /** "Sürü Günü" index (host computes it from the TR date, §2.5) */
  dayIndex?: number;
  layoutId?: string;
  twoThumbs?: boolean;
  leftHanded?: boolean;
  showShape?: ShowShape;
  /** run the FTUE first (first launch) */
  ftue?: boolean;
  onEvent?: (e: SuruAudioEvent) => void;
  onHaptic?: (p: HapticPattern) => void;
  onRoundEnd?: (r: SuruRoundResult) => void;
  onFtueDone?: () => void;
  onExit?: () => void;
  /** dev / test only */
  dev?: { autopilot?: boolean; hideHud?: boolean; noLoop?: boolean };
}

export interface SuruModeHandle {
  readonly round: Round;
  readonly renderer: SuruRenderer;
  readonly hud: SuruHud;
  startRound(opts?: { subMode?: SuruSubMode; seed?: number; dayIndex?: number; layoutId?: string }): void;
  pause(): void;
  resume(): void;
  setTier(t: QualityTier): void;
  audioState(): SuruAudioState;
  /** dev: advance the sim headlessly by `sec` seconds (bots + autopilot), no rendering */
  advance(sec: number): void;
  /** dev: advance until the n-th event of `type` (optionally involving `flock`), then `extraSec` more */
  advanceUntil(type: SuruEvent['type'], n: number, extraSec: number, maxSec?: number): SuruEvent | null;
  /** dev: render one frame now (dt seconds of visual time) */
  renderFrame(dt: number): void;
  /** dev: camera follows this flock (0 = player) */
  follow(flock: number): void;
  dispose(): void;
}

export function leagueFromLp(totalLp: number): League {
  return Math.max(0, Math.min(4, Math.floor(totalLp / SURU.LEAGUE_SIZE))) as League;
}

/** Apply a round's LP: no demotion from a reached league, LP never below 0 inside a league (§2.6). */
export function applyLeaguePoints(state: { league: League; lp: number }, delta: number): { league: League; lp: number } {
  let league = state.league;
  let lp = state.lp + delta;
  while (lp >= SURU.LEAGUE_SIZE && league < 4) {
    lp -= SURU.LEAGUE_SIZE;
    league = (league + 1) as League;
  }
  if (lp < 0) lp = 0;
  return { league, lp };
}

export function mount(container: HTMLElement, deps: SuruModeDeps = {}): SuruModeHandle {
  const lang: Lang = deps.lang ?? 'tr';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;';
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.appendChild(canvas);
  const renderer = new SuruRenderer(canvas, deps.tier ?? 'high');
  const hud = new SuruHud(container, lang);
  if (deps.dev?.hideHud) hud.setVisible(false);
  const input = new SuruInput(canvas, { twoThumbs: deps.twoThumbs, leftHanded: deps.leftHanded });
  // fonts (Barlow Condensed / Inter) from the UI module; HUD falls back gracefully meanwhile
  void import('../../ui/fonts.ts').then((m) => m.loadFonts()).catch(() => undefined);

  let subMode: SuruSubMode = deps.ftue ? 'ftue' : (deps.subMode ?? 'league');
  let seed = (deps.seed ?? (Date.now() & 0x7fffffff)) >>> 0;
  let round: Round = createRound({ seed, subMode, dayIndex: deps.dayIndex, layoutId: deps.layoutId, league: deps.league ?? 0, player: deps.dev?.autopilot ? 'utility' : 'human' });
  let sim: SuruSim = round.sim;
  const cmds: SuruCommand[] = [];
  let acc = 0;
  let last = -1;
  let raf = 0;
  let paused = false;
  let ended = false;
  let resultsShown = false;
  let endT = 0;
  let playerOut = false;
  let watching = false;
  let lastSX = 0;
  let lastSZ = 0;
  let lastTight = -1;
  let now = 0;
  let hapticBudget = 0;
  let highlightTick = 0;
  let highlightScore = 0;
  const dir = { x: 0, y: 0 };
  // FTUE
  let ftueStep = 0;
  let ftueT = 0;
  let ftueCaptures = 0;
  let ftueHold = 0;

  const setupRound = (): void => {
    sim = round.sim;
    renderer.setRound(round.layout, sim, 1);
    renderer.setLighthouse(round.layout.lighthouse.x, round.layout.lighthouse.z);
    hud.setNames(round.meta.map((m) => ({ name: m.name[lang], isBot: m.isBot })));
    hud.showResults(null);
    acc = 0;
    ended = false;
    resultsShown = false;
    playerOut = false;
    watching = false;
    lastSX = lastSZ = 0;
    lastTight = -1;
    endT = 0;
    ftueStep = 0;
    ftueT = 0;
    ftueCaptures = 0;
    ftueHold = 0;
    highlightTick = 0;
    highlightScore = 0;
    renderer.setSpectate(0);
    emit({ type: 'roundStart', tick: 0 });
  };

  const emit = (e: SuruEvent): void => {
    if (!deps.onEvent) return;
    let x = Number.NaN;
    let z = Number.NaN;
    if ('x' in e && 'z' in e) {
      x = e.x;
      z = e.z;
    }
    let pan = 0;
    let dist = 0;
    if (!Number.isNaN(x)) {
      const cam = renderer.camera.cam.position;
      const dx = x - cam.x;
      const dz = z - cam.z;
      dist = Math.hypot(dx, dz);
      // screen right = (−fwd.y, fwd.x) in xz
      const f = renderer.camera.fwd;
      pan = Math.max(-1, Math.min(1, (dx * -f.y + dz * f.x) / 60));
    }
    const player =
      ('flock' in e && e.flock === 1) || ('attacker' in e && e.attacker === 1) || ('target' in e && e.target === 1) || ('to' in e && e.to === 1) || ('from' in e && e.from === 1) || e.type === 'roundStart' || e.type === 'roundEnd' || e.type === 'ringStart';
    deps.onEvent({ ...e, player, pan, dist } as SuruAudioEvent);
  };

  const haptic = (p: HapticPattern, ms: number): void => {
    if (!deps.onHaptic) return;
    // fatigue cap: ≤ 150 ms of haptics per second (§2.12)
    if (hapticBudget + ms > 150) return;
    hapticBudget += ms;
    deps.onHaptic(p);
  };

  const handleEvents = (events: SuruEvent[]): void => {
    if (events.length === 0) return;
    renderer.onEvents(events);
    for (const e of events) {
      emit(e);
      switch (e.type) {
        case 'siege':
          if (e.attacker === 1) {
            hud.announce('siege', now);
            haptic('güçlü', 60);
          } else if (e.target === 1) {
            hud.announce('sieged', now, false, '#F5F1E8');
            haptic('güçlü', 60);
          }
          if (e.count > highlightScore) {
            highlightScore = e.count * 3;
            highlightTick = e.tick;
          }
          break;
        case 'capture':
          if (e.flock === 1) haptic('hafif', 12);
          break;
        case 'convertWave':
          if (e.to === 1) haptic('hafif', 10);
          if (e.count > highlightScore) {
            highlightScore = e.count;
            highlightTick = e.tick;
          }
          break;
        case 'hawkWarn':
          if (e.target === 1 && e.hawk === 0) {
            hud.announce('hawk', now, true);
            haptic('çift', 30);
          }
          break;
        case 'hawkScatter':
          if (e.flock === 1) haptic('orta', 25);
          break;
        case 'gustWarn':
          hud.announce('gust', now, true);
          break;
        case 'stormSpawn':
          hud.announce('storm', now, true);
          break;
        case 'ringStart':
          hud.announce('sunset', now, true, '#FFB36B');
          break;
        case 'breathless':
          if (e.flock === 1) {
            hud.announce('breathless', now, true);
            haptic('çift', 30);
          }
          break;
        case 'lone':
          if (e.flock === 1) hud.announce('lone', now, false, '#F5F1E8');
          break;
        case 'recovered':
          if (e.flock === 1) hud.announce('recovered', now, true);
          break;
        case 'eliminated':
          if (e.flock === 1) {
            playerOut = true;
            hud.announce('eliminated', now, false, '#F5F1E8');
            haptic('orta', 40);
          }
          break;
        case 'roundEnd':
          ended = true;
          endT = 0;
          renderer.startShow(e.winner, deps.showShape ?? 'kalp');
          if (e.winner === 1) haptic('yıldız', 40);
          break;
        default:
          break;
      }
      if (e.type === 'siege' && round.setup.subMode === 'ftue' && e.attacker === 1) ftueStep = 4;
      if (e.type === 'capture' && e.flock === 1) ftueCaptures++;
    }
  };

  const playerCommands = (T: number): void => {
    if (deps.dev?.autopilot) return;
    const st = input.poll();
    let sx = 0;
    let sz = 0;
    if (st.dirX !== 0 || st.dirY !== 0) {
      const f = renderer.camera.fwd;
      const rx = -f.y;
      const rz = f.x;
      dir.x = f.x * st.dirY + rx * st.dirX;
      dir.y = f.y * st.dirY + rz * st.dirX;
      sx = Math.round(dir.x * 127);
      sz = Math.round(dir.y * 127);
    }
    if (sx !== lastSX || sz !== lastSZ) {
      cmds.push({ tick: T, actorId: 1, cmd: 'steer', args: [sx, sz] });
      lastSX = sx;
      lastSZ = sz;
    }
    const tg = st.tight ? 1 : 0;
    if (tg !== lastTight) {
      cmds.push({ tick: T, actorId: 1, cmd: 'tight', args: [tg] });
      if (lastTight !== -1 && deps.onEvent) deps.onEvent(tg ? { type: 'tight', tick: T, player: true, pan: 0, dist: 0 } : { type: 'wide', tick: T, player: true, pan: 0, dist: 0 });
      lastTight = tg;
    }
  };

  const stepSim = (): void => {
    cmds.length = 0;
    const T = sim.tick;
    round.bots.update(T, cmds);
    if (!playerOut) playerCommands(T);
    sim.step(cmds);
    handleEvents(sim.drainEvents());
  };

  const showResults = (): void => {
    resultsShown = true;
    const all = sim.stats();
    const me = all[0];
    const place = me.rank || sim.flockCount;
    const lpDelta = round.setup.subMode === 'ftue' || round.setup.subMode === 'practice' ? 0 : SuruSim.leaguePoints(place, me.sieges);
    const title = round.setup.subMode === 'daily' ? `${hud.t('daily')} #${round.setup.dayIndex ?? 0}` : place === 1 ? hud.t('winner') : round.layout.name[lang];
    const share = buildShare(place, sim.flockCount, me, round.setup.subMode ?? 'league', round.setup.dayIndex ?? 0, lang, !me.eliminated);
    hud.showResults(
      {
        place,
        of: sim.flockCount,
        title,
        peak: me.peakSize,
        converted: me.converted,
        wild: me.wildCollected,
        sieges: me.sieges,
        survivalSec: me.survivalSec,
        lpDelta,
        leagueName: `${hud.t('league')} · ${LEAGUE_NAMES[deps.league ?? 0][lang]}`,
        eliminatedEarly: !sim.roundOver,
      },
      {
        again: () => handle.startRound(),
        watch: () => {
          watching = true;
          hud.showResults(null);
          let best = 0;
          for (let f = 2; f <= sim.flockCount; f++) if (sim.flockAlive[f] && (best === 0 || sim.flockCountArr[f] > sim.flockCountArr[best])) best = f;
          renderer.setSpectate(best);
        },
        share: () => share,
        exit: () => deps.onExit?.(),
      },
    );
    deps.onRoundEnd?.({
      subMode: round.setup.subMode ?? 'league',
      dayIndex: round.setup.subMode === 'daily' ? (round.setup.dayIndex ?? 0) : null,
      seed,
      layoutId: round.layout.id,
      place,
      of: sim.flockCount,
      player: me,
      all,
      lpDelta,
      winner: sim.winner,
      shareText: share,
      highlightTick,
    });
  };

  const ftueUpdate = (dt: number): void => {
    if (round.setup.subMode !== 'ftue') return;
    ftueT += dt;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.72;
    const st = input.state;
    if (ftueStep === 0) {
      // ghost thumb drags toward the wild group ahead
      const k = (ftueT % 1.8) / 1.8;
      hud.ghostAt(true, cx, cy - k * 70, true);
      if (ftueCaptures >= 1) {
        ftueStep = 1;
        ftueT = 0;
      }
    } else if (ftueStep === 1) {
      // release: thumb lifts away (open wings → two groups join)
      const k = (ftueT % 1.6) / 1.6;
      hud.ghostAt(k < 0.75, cx, cy - 10 - k * 24, false);
      if (ftueCaptures >= 3 || ftueT > 14) {
        ftueStep = 2;
        ftueT = 0;
      }
    } else if (ftueStep === 2) {
      // hold: thumb pressed, breath arc visible
      hud.ghostAt(!st.touching, cx, cy, true);
      if (st.touching) ftueHold += dt;
      if (ftueHold > 1.6 || ftueT > 9) {
        ftueStep = 3;
        ftueT = 0;
        hud.ghostAt(false);
      }
    } else if (ftueStep === 3) {
      // glowing arc around the sleeping flock → complete the ring
      renderer.setGhostArc(true, sim.leaderX[2], sim.leaderZ[2], sim.flockRadius(2) + 9);
    } else if (ftueStep === 4) {
      renderer.setGhostArc(false);
      hud.ghostAt(false);
      ftueStep = 5;
      ftueT = 0;
    } else if (ftueStep === 5 && ftueT > 2.2) {
      ftueStep = 6;
      deps.onFtueDone?.();
      handle.startRound({ subMode: deps.subMode && deps.subMode !== 'ftue' ? deps.subMode : 'practice' });
      return;
    }
    // hard stop at 45 s of tutorial (+ grace for the siege)
    if (ftueStep < 4 && sim.timeSec > 60) ftueStep = 4;
    void FTUE_SPOTS;
  };

  const frame = (dt: number): void => {
    now += dt;
    hapticBudget = Math.max(0, hapticBudget - dt * 150);
    if (!paused) {
      acc += dt;
      let steps = 0;
      while (acc >= SURU.DT && steps < 5 && !sim.roundOver) {
        stepSim();
        acc -= SURU.DT;
        steps++;
      }
      if (steps >= 5 || sim.roundOver) acc = Math.min(acc, SURU.DT);
      if (ended) endT += dt;
    }
    const alpha = sim.roundOver ? 1 : Math.min(1, acc / SURU.DT);
    renderer.frame(alpha, paused ? 0 : dt, sim.timeSec + alpha * SURU.DT);
    hud.update(sim, 1, now, sim.roundTicks / SURU.TICK_HZ, { x: renderer.camera.fwd.x, z: renderer.camera.fwd.y });
    const st = input.state;
    hud.showBreath(st.touching && !playerOut && !paused, st.anchorX - canvas.getBoundingClientRect().left, st.anchorY - canvas.getBoundingClientRect().top, sim.flockBreath[1] / 100, sim.flockBreathless[1] === 1);
    ftueUpdate(dt);
    // results: after the 3 s Sürü Gösterisi, or right away when the player is out (watch option)
    if (!resultsShown && round.setup.subMode !== 'ftue') {
      if (ended && endT > 3.2) showResults();
      else if (playerOut && !watching && !ended) showResults();
    }
    if (watching && ended && endT > 3.2 && !resultsShown) showResults();
  };

  const loop = (ts: number): void => {
    raf = requestAnimationFrame(loop);
    const dt = last < 0 ? 1 / 60 : Math.min(0.1, Math.max(0, (ts - last) / 1000));
    last = ts;
    frame(dt);
  };

  const onVis = (): void => {
    if (document.hidden) handle.pause();
  };
  const onResize = (): void => renderer.resize();
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('resize', onResize);
  hud.onPause = () => (paused ? handle.resume() : handle.pause());

  const handle: SuruModeHandle = {
    get round() {
      return round;
    },
    renderer,
    hud,
    startRound(opts) {
      if (opts?.subMode) subMode = opts.subMode;
      seed = (opts?.seed ?? (seed * 1664525 + 1013904223)) >>> 0;
      round = createRound({
        seed,
        subMode: subMode === 'ftue' && round.setup.subMode === 'ftue' ? 'practice' : subMode,
        dayIndex: opts?.dayIndex ?? deps.dayIndex,
        layoutId: opts?.layoutId,
        league: deps.league ?? 0,
        player: deps.dev?.autopilot ? 'utility' : 'human',
      });
      setupRound();
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      last = -1;
    },
    setTier(t) {
      renderer.setTier(t);
    },
    audioState() {
      const size = sim.flockAlive[1] ? sim.flockCountArr[1] + 1 : 0;
      let enemy = 1e9;
      for (let f = 2; f <= sim.flockCount; f++) {
        if (!sim.flockAlive[f]) continue;
        enemy = Math.min(enemy, Math.hypot(sim.leaderX[f] - sim.leaderX[1], sim.leaderZ[f] - sim.leaderZ[1]));
      }
      const x = sim.leaderX[1];
      const z = sim.leaderZ[1];
      return {
        size,
        density: Math.min(1, (size / 400) * (sim.flockMode[1] === 1 ? 1.4 : 1)),
        tight: sim.flockMode[1] === 1,
        breath: sim.flockBreath[1],
        sunset: Math.min(1, sim.timeSec / 180),
        inStorm: sim.flockInStorm[1] === 1,
        outsideRing: sim.ringActive && x * x + z * z > sim.ringRadius * sim.ringRadius,
        enemyDist: enemy,
        paused,
      };
    },
    advance(sec) {
      const n = Math.round(sec * SURU.TICK_HZ);
      for (let k = 0; k < n && !sim.roundOver; k++) stepSim();
      renderer.skipOpening();
    },
    advanceUntil(type, n, extraSec, maxSec = 200) {
      let seen = 0;
      let hit: SuruEvent | null = null;
      const maxT = Math.round(maxSec * SURU.TICK_HZ);
      while (!sim.roundOver && sim.tick < maxT && !hit) {
        cmds.length = 0;
        const T = sim.tick;
        round.bots.update(T, cmds);
        sim.step(cmds);
        const ev = sim.drainEvents();
        renderer.onEvents(ev);
        for (const e of ev) if (e.type === type && ++seen >= n) hit = e;
      }
      if (hit) handle.advance(extraSec);
      renderer.skipOpening();
      return hit;
    },
    renderFrame(dt) {
      frame(dt);
    },
    follow(flock) {
      renderer.setSpectate(flock);
    },
    dispose() {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onResize);
      input.dispose();
      hud.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };

  renderer.resize();
  setupRound();
  renderer.warmup();
  if (!deps.dev?.noLoop) raf = requestAnimationFrame(loop);
  return handle;
}

function buildShare(place: number, of: number, me: FlockStats, sub: SuruSubMode, day: number, lang: Lang, standing: boolean): string {
  const tr = lang === 'tr';
  const head = sub === 'daily' ? (tr ? `KANAT · SÜRÜ.io · Sürü Günü #${day}` : `KANAT · SÜRÜ.io · Flock Day #${day}`) : 'KANAT · SÜRÜ.io';
  const parts = [`${head} 🐦 ${place}./${of}`, tr ? `Zirve ${me.peakSize} kuş` : `Peak ${me.peakSize} birds`];
  if (me.sieges > 0) parts.push(tr ? `🌀 Kuşatma ×${me.sieges}` : `🌀 Encircle ×${me.sieges}`);
  if (standing) parts.push(tr ? '🌅 Gün batımına kadar ayakta' : '🌅 Standing at sunset');
  return parts.join(' · ');
}
