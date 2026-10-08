// Live 3D main menu (integrator, §2.11): the pilot sits on the rim of a balloon basket (or on the launch rock of
// a ridge world) at dawn in the last played world, balloons rise, the camera drifts slowly around; the UI bottom
// sheet sits on top. No sim runs here; everything is visual time.
import * as THREE from 'three';
import type { ActiveMode } from '../../game/types.ts';
import type { Game } from '../../game/Game.ts';
import { UI } from '../../ui/UI.ts';
import type { FlightState, RouteDef } from '../../sim/types.ts';

const _look = new THREE.Vector3();

function seatedState(route: RouteDef): FlightState {
  const p = route.start.pos;
  const psi = (route.start.headingDeg * Math.PI) / 180;
  return {
    tick: 0,
    phase: 'landed',
    pos: [p[0], p[1], p[2]],
    prevPos: [p[0], p[1], p[2]],
    vel: [Math.sin(psi) * 0.01, 0, -Math.cos(psi) * 0.01],
    speed: 0,
    gamma: 0,
    psi,
    phi: 0,
    cl: 0.6,
    heightAGL: 0,
    prox: { d: Infinity, cls: 'none', nearest: [0, 0, 0], normal: [0, 1, 0], mult: 0, propId: -1 },
    score: 0,
    combo: 1,
    comboTime: 0,
    timeSec: 0,
    gateIndex: 0,
    gatesPassed: 0,
    gatesMissed: 0,
    inThermal: -1,
    inLandingZone: false,
    canopyOpen: false,
    assist: 'off',
    energy: 0,
  };
}

export class MenuMode implements ActiveMode {
  readonly kind = 'menu';
  readonly session = null;
  private readonly game: Game;
  private t = 0;
  private readonly state: FlightState;
  private readonly route: RouteDef | null;
  private readonly camPos = new THREE.Vector3();
  private rise: { from: THREE.Vector3; t: number } | null = null;

  /** `riseFrom`: start the camera at this position and glide into the menu framing (FTUE landing → menu). */
  constructor(game: Game, opts: { riseFrom?: THREE.Vector3; skipUi?: boolean } = {}) {
    this.game = game;
    const st = game.stage;
    this.route = st ? st.content.routes[0] : null;
    this.state = this.route ? seatedState(this.route) : seatedState({ start: { pos: [0, 0, 0], headingDeg: 0, speedKmh: 0, type: 'balon' } } as unknown as RouteDef);
    const s = game.scene;
    s.pilot.setSampler(null);
    s.pilot.event({ type: 'landed', tick: 0, distToTarget: 0, soft: false, points: 0 });
    s.pilot.setState(this.state, 1);
    for (const g of s.ghosts) g.visible = false;
    s.markers.build(null, s.tier);
    s.setSuit(game.profile.cosmetics.suit);
    game.app.input.setScheme('menu');
    game.audio.music.setWorld('menu');
    if (opts.riseFrom) this.rise = { from: opts.riseFrom.clone(), t: 0 };
    if (!opts.skipUi) UI.show('menu', game.vm.menu());
  }

  step(): void {
    // no sim in the menu
  }

  render(_alpha: number, dt: number): void {
    const s = this.game.scene;
    this.t += dt;
    const cam = s.camera;
    const p = this.state.pos;
    const psi = this.state.psi;
    // side view from outside the start balloon: pilot seated on the front rim in profile, the envelope and the
    // dawn valley behind; the pilot sits in the upper half (the UI sheet covers the bottom)
    const fx = Math.sin(psi);
    const fz = -Math.cos(psi);
    const ax = p[0] - fx;
    const az = p[2] - fz;
    const yaw = psi + Math.PI * 0.5 + Math.sin(this.t * 0.05) * 0.42;
    const r = 15 + Math.sin(this.t * 0.07) * 1.2;
    const portrait = cam.aspect < 1;
    const tx = ax + Math.sin(yaw) * r;
    const tz = az - Math.cos(yaw) * r;
    let ty = p[1] + 1.4 + Math.sin(this.t * 0.11) * 0.3;
    const g = this.game.stage ? this.game.stage.loaded.sampler.height(tx, tz) + 1.5 : -1e9;
    if (ty < g) ty = g;
    if (this.rise) {
      this.rise.t += dt / 3.2;
      const k = Math.min(1, this.rise.t);
      const e = k * k * (3 - 2 * k);
      this.camPos.set(tx, ty, tz).lerp(this.rise.from, 1 - e);
      // crane up while blending
      this.camPos.y += Math.sin(e * Math.PI) * 25;
      if (k >= 1) this.rise = null;
    } else this.camPos.set(tx, ty, tz);
    cam.position.copy(this.camPos);
    cam.up.set(0, 1, 0);
    _look.set(p[0], p[1] + (portrait ? -3.4 : -0.9), p[2]);
    cam.lookAt(_look);
    cam.fov += ((portrait ? 58 : 40) - cam.fov) * Math.min(1, dt * 3);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    s.pilot.setState(this.state, 1);
    s.pilot.update(dt, cam);
    s.props?.update(this.t * 0.6, cam, dt);
    s.vfx.update(dt, this.t, cam, null, null);
    s.markers.update(null, null, cam, dt);
    this.game.audio.setFlight(MENU_AUDIO);
  }

  back(): boolean {
    return false;
  }

  dispose(): void {
    this.game.scene.pilot.setSampler(this.game.stage?.loaded.sampler ?? null);
  }

  testState(): Record<string, unknown> {
    return { kind: 'menu', world: this.game.stage?.id ?? null, t: Math.round(this.t * 10) / 10 };
  }
}

const MENU_AUDIO = { speedMs: 6, bankRate: 0, prox: Infinity, mult: 0, combo: 1, inCloud: 0, canopy: false, phase: 'intro' as const, thermal: false };
