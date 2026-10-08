// Serbest Uçuş (integrator): no gates, no score, no failure — a crash rewinds 3 s (soft fade, no replay), the
// parachute opens anywhere, calm music layer, postcard frames glint within 150 m (collected in Foto Modu).
import { POSTCARD_RULES } from '../../content/meta/postcards.ts';
import { GHOST_MODE } from '../../sim/replay/ghostCode.ts';
import { CrashBuffer } from '../../sim/FlightSim.ts';
import type { RouteDef, WorldId } from '../../sim/types.ts';
import { WORLD_IDS } from '../../sim/types.ts';
import { UI } from '../../ui/UI.ts';
import { t, tk } from '../../ui/i18n.ts';
import { FlightModeBase } from '../../game/FlightModeBase.ts';
import type { FlightSession, SessionOptions, SessionResult } from '../../game/FlightSession.ts';
import type { Game } from '../../game/Game.ts';
import type { StageWorld } from '../../game/WorldStore.ts';
import { applyFreeFlight } from '../../game/progress.ts';
import { baseResultsProps } from '../../game/results.ts';
import { PhotoController } from './photo.ts';
import { postcardAnchors } from './postcards.ts';

export async function startFree(game: Game, world: WorldId): Promise<void> {
  const w = (WORLD_IDS as readonly string[]).includes(world) ? world : 'kapadokya';
  const stage = await game.ensureWorld(w);
  const route = stage.content.routes[0];
  const mode = new FreeMode(game, stage, route);
  game.setMode(mode);
  mode.begin();
}

const row = new Float64Array(CrashBuffer.STRIDE);

export class FreeMode extends FlightModeBase {
  readonly kind = 'free';
  readonly stage: StageWorld;
  readonly route: RouteDef;
  private photoCtl: PhotoController | null = null;
  private readonly glinted = new Set<string>();
  private checkT = 0;
  private flownSec = 0;
  private rewindFade = 0;

  constructor(game: Game, stage: StageWorld, route: RouteDef) {
    const s = game.settings.kanat;
    const opts: SessionOptions = {
      mode: 'free',
      world: stage,
      route,
      seed: 1,
      metric: 'score',
      assist: s.flightAssist,
      guideWind: false,
      slowMode: s.slowMode,
      autoParachute: false,
      freeFlight: true,
      intro: 'skip',
      ghosts: [],
      playerName: '',
      suitId: 0,
      ghostMode: GHOST_MODE.free,
      routeRef: WORLD_IDS.indexOf(stage.id),
      gatePenaltySec: 0,
      reduceMotion: game.settings.reduceMotion,
    };
    super(game, opts, {
      onCrash: (_e, ses) => {
        this.rewind(ses);
        return true;
      },
    });
    this.stage = stage;
    this.route = route;
  }

  /** Crash → soft 3 s rewind (no replay, no failure). */
  private rewind(s: FlightSession): void {
    const cb = s.sim.crashBuffer;
    if (cb.count < 2) return;
    cb.read(0, row);
    const sampler = this.stage.loaded.sampler;
    const x = row[1];
    const z = row[3];
    const ground = Math.max(this.stage.loaded.config.hasSea ? 0 : -1e9, sampler.height(x, z));
    const y = Math.max(row[2], ground + 35);
    const speed = Math.max(40, row[10]);
    s.sim.teleport(x, y, z, speed, 0, row[7]);
    s.follow.reset();
    this.game.audio.event({ type: 'restart' });
    this.rewindFade = 0.6;
  }

  override render(alpha: number, dt: number): void {
    super.render(alpha, dt);
    this.photoCtl?.render(dt);
    if (this.rewindFade > 0) this.rewindFade -= dt;
    const st = this.session.state;
    if (st.phase === 'flying' || st.phase === 'canopy') this.flownSec += dt;
    this.checkT += dt;
    if (this.checkT > 0.5) {
      this.checkT = 0;
      // postcard glints (once per card per flight)
      for (const a of postcardAnchors(this.stage)) {
        if (this.glinted.has(a.id) || this.game.profile.postcards.includes(a.id)) continue;
        const dx = a.pos[0] - st.pos[0];
        const dy = a.pos[1] - st.pos[1];
        const dz = a.pos[2] - st.pos[2];
        if (dx * dx + dy * dy + dz * dz < POSTCARD_RULES.revealRadiusM * POSTCARD_RULES.revealRadiusM) {
          this.glinted.add(a.id);
          this.game.scene.vfx.burst('sparkle', a.pos[0], a.pos[1], a.pos[2], 1.2);
          UI.toast(`${tk(`postcard.${a.id}`, undefined, t('collection.postcards'))}`, { icon: 'postcard', ms: 2600 });
        }
      }
    }
  }

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

  protected onFinished(r: SessionResult): void {
    applyFreeFlight(this.game.profile, this.game.metaDoc, this.flownSec, Date.now(), r.stats);
    this.flownSec = 0;
    this.game.saveProgress();
    UI.show('results', { ...baseResultsProps('free', this.stage.id, r, 0, 0), rows: [{ kind: 'flight', value: r.timeSec }], stars: 0, half: false, hasNext: false });
    UI.hud.setVisible(false);
  }

  override quit(): void {
    if (this.flownSec > 0) {
      applyFreeFlight(this.game.profile, this.game.metaDoc, this.flownSec, Date.now());
      this.flownSec = 0;
      this.game.saveProgress();
    }
    super.quit();
  }

  override dispose(): void {
    this.photoCtl?.exit();
    super.dispose();
  }
}
