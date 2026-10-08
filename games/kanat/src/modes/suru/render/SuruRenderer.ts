// SÜRÜ.io scene orchestrator (three.js r186, WebGL2). Reads a FlockRenderSource (offline: the full sim;
// online: any approximation implementing the same interface), interpolates with the sim alpha, drives the
// sunset (sun 6° → −1°, 3200 K → 2200 K, blue hour at 3:00) and renders without a post chain (§3.6):
// tone mapping, grade and vignette live in the materials. Tier changes only touch visuals (§5.G).

import * as THREE from 'three';
import type { QualityTier } from '../../../core/settings.ts';
import type { FlockRenderSource, SuruEvent, SuruLayout } from '../sim/types.ts';
import { BirdLayer, SHOW_SHAPES } from './Birds.ts';
import type { ShowShape } from './Birds.ts';
import { Effects, lightningAt } from './Effects.ts';
import { Environment } from './Environment.ts';
import { createGlobals } from './glsl.ts';
import type { SuruGlobals } from './glsl.ts';
import { SkyWater } from './SkyWater.ts';
import { SuruCamera } from './SuruCamera.ts';

const DEG = Math.PI / 180;

export interface SuruRenderStats {
  drawCalls: number;
  triangles: number;
  programs: number;
  birdTris: number;
  tier: QualityTier;
  pixelRatio: number;
}

const DPR_CAP: Record<QualityTier, number> = { low: 1.25, medium: 1.75, high: 2.25, ultra: 3 };

function lerpColor(out: THREE.Color, a: string, b: string, k: number): void {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  out.copy(ca).lerp(cb, k);
}

export class SuruRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: SuruCamera;
  readonly globals: SuruGlobals;
  readonly birds: BirdLayer;
  readonly effects: Effects;
  readonly env: Environment;
  readonly skyWater: SkyWater;
  private source: FlockRenderSource | null = null;
  private player = 1;
  private tier: QualityTier;
  private visTime = 0;
  private lighthouseOn = 0;
  private show = { k: 0, flock: 1, shape: 0, x: 0, z: 0, scale: 34 };
  private showActive = false;
  private showT = 0;
  private spectate = 0;
  private readonly canvas: HTMLCanvasElement;
  private contextLost = false;
  private readonly onLost: (e: Event) => void;
  private readonly onRestored: () => void;
  /** override the time of day (dev/screenshots); null = follow the sim clock */
  timeOfDayOverride: number | null = null;

  constructor(canvas: HTMLCanvasElement, tier: QualityTier) {
    this.canvas = canvas;
    this.tier = tier;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: tier !== 'low', powerPreference: 'high-performance', alpha: false, stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.autoClear = true;
    this.globals = createGlobals();
    this.camera = new SuruCamera(1);
    this.birds = new BirdLayer(this.scene, this.globals, this.renderer);
    this.skyWater = new SkyWater(this.scene, this.globals, null);
    this.env = new Environment(this.scene, this.globals);
    this.effects = new Effects(this.scene, this.globals);
    this.setTier(tier);
    this.onLost = (e: Event) => {
      e.preventDefault();
      this.contextLost = true;
    };
    this.onRestored = () => {
      this.contextLost = false;
      // three re-uploads geometry/programs lazily; render targets must be recreated
      this.birds.setTier(this.tier);
      this.skyWater.setOwnTexture(this.birds.ownRT ? this.birds.ownRT.texture : null);
    };
    canvas.addEventListener('webglcontextlost', this.onLost, false);
    canvas.addEventListener('webglcontextrestored', this.onRestored, false);
  }

  setTier(t: QualityTier): void {
    this.tier = t;
    this.birds.setTier(t);
    this.skyWater.setTier(t);
    this.env.setTier(t);
    this.effects.setTier(t);
    this.skyWater.setOwnTexture(this.birds.ownRT ? this.birds.ownRT.texture : null);
    this.resize();
  }

  get tierName(): QualityTier {
    return this.tier;
  }

  resize(): void {
    const w = this.canvas.clientWidth || this.canvas.width || 390;
    const h = this.canvas.clientHeight || this.canvas.height || 844;
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, DPR_CAP[this.tier]);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.setAspect(w / h);
  }

  setRound(layout: SuruLayout, source: FlockRenderSource, player: number): void {
    this.source = source;
    this.player = player;
    this.spectate = 0;
    this.env.build(layout);
    this.skyWater.setLayout(layout);
    this.lighthouseOn = 0;
    this.showActive = false;
    this.show.k = 0;
    this.effects.setGhostArc(false);
    this.camera.startOpening();
  }

  /** follow another flock (spectating after elimination); 0 = player */
  setSpectate(flock: number): void {
    this.spectate = flock;
  }

  skipOpening(): void {
    if (this.camera.mode === 'opening') this.camera.mode = 'play';
  }

  /** start the winner's Sürü Gösterisi (render-only morph + rising camera) */
  startShow(flock: number, shape: ShowShape = 'kalp'): void {
    const src = this.source;
    if (!src || flock <= 0) return;
    this.showActive = true;
    this.showT = 0;
    const n = src.flockCountArr[flock] + 1;
    this.show.flock = flock;
    this.show.shape = Math.max(0, SHOW_SHAPES.indexOf(shape));
    this.show.scale = Math.max(16, Math.min(70, 2.2 * Math.sqrt(n) + 10));
    this.show.x = src.leaderX[flock];
    this.show.z = src.leaderZ[flock];
    this.camera.startEnd();
  }

  get showing(): boolean {
    return this.showActive;
  }

  setGhostArc(on: boolean, x = 0, z = 0, r = 12): void {
    this.effects.setGhostArc(on, x, z, r);
  }

  /** React to sim events (visual only). */
  onEvents(events: readonly SuruEvent[]): void {
    for (const e of events) {
      if (e.type === 'siege') {
        this.effects.shockwave(e.x, e.z, e.attacker, this.visTime);
        if (e.attacker === this.player || e.target === this.player) this.camera.kusatmaPunch();
      }
    }
  }

  private updateSky(simTime: number): void {
    const g = this.globals;
    const p = Math.min(1.08, Math.max(0, (this.timeOfDayOverride ?? simTime) / 180));
    // sun 6° → −1° over the round (keeps sinking a little after 3:00 during the show)
    const el = (6 - 7 * p) * DEG;
    const az = -3 * DEG; // straight up the screen: the glitter path runs behind the flocks
    g.uSunDir.value.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    // 3200 K → 2200 K, dimming as the sun touches the horizon
    const kc = Math.min(1, p);
    const sun = g.uSunColor.value;
    lerpColor(sun, '#FFB46B', '#FF932C', kc);
    sun.convertSRGBToLinear();
    const sunI = 2.6 * (0.12 + 0.88 * smooth(-0.025, 0.09, Math.sin(el)));
    sun.multiplyScalar(sunI);
    // sky palette: warm sunset → blue hour
    const kb = smooth(0.5, 1.02, p);
    lerpColor(g.uSkyZenith.value, '#1C2340', '#0D1330', kb);
    lerpColor(g.uSkyMid.value, '#6B3F69', '#2B2E5C', kb);
    lerpColor(g.uSkyLow.value, '#E0735A', '#594A80', kb);
    lerpColor(g.uSkyHorizon.value, '#FFC48A', '#C98670', kb);
    for (const c of [g.uSkyZenith.value, g.uSkyMid.value, g.uSkyLow.value, g.uSkyHorizon.value]) c.convertSRGBToLinear();
    g.uSkyHorizon.value.multiplyScalar(1.35 - 0.55 * kb);
    g.uSkyLow.value.multiplyScalar(1.1 - 0.3 * kb);
    lerpColor(g.uSea.value, '#2A3550', '#1B2440', kb);
    g.uSea.value.convertSRGBToLinear();
    g.uNight.value = smooth(0.72, 1.04, p);
    g.uExposure.value = 1.0 + 0.55 * smooth(0.6, 1.05, p);
  }

  /**
   * Render one frame. `alpha` = sim interpolation factor (0..1 between prev and curr tick), `dt` = real frame
   * time (s), `simTime` = sim seconds (drives the sunset).
   */
  frame(alpha: number, dt: number, simTime: number): void {
    const src = this.source;
    if (!src || this.contextLost) return;
    this.visTime += dt;
    // wrapped visual time (highp precision on mobile GPUs; all motions are periodic in < 600 s)
    const g = this.globals;
    g.uTime.value = this.visTime % 600;
    this.updateSky(simTime + (this.showActive ? this.showT * 2 : 0));
    // storm / gust / ring / lighthouse uniforms
    const st = src.storm;
    const sx = st.prevX + (st.x - st.prevX) * alpha;
    const sz = st.prevZ + (st.z - st.prevZ) * alpha;
    g.uStorm.value.set(sx, sz, st.radius, st.active ? 1 : 0);
    g.uLightning.value = lightningAt(this.visTime, st.active);
    const gu = src.gust;
    g.uGust.value.set(gu.dirX, gu.dirZ, gu.offset, gu.phase);
    g.uGustMix.value = gu.phase === 2 ? 1 : 0;
    g.uRing.value.set(src.ringRadius, src.ringActive ? 1 : 0, 0, 0);
    const lhTarget = src.ringActive ? 1 : 0;
    this.lighthouseOn += (lhTarget - this.lighthouseOn) * Math.min(1, dt * 1.2);
    const lay = this.env;
    // birds
    this.birds.uploadTick(src);
    if (this.showActive) {
      this.showT += dt;
      this.show.k = Math.min(1, this.showT / 1.6);
    }
    this.birds.update(src, alpha, this.player, this.show);
    this.effects.update(src, alpha, this.visTime, this.player, (t, a) => t === this.player || a === this.player);
    lay.update(this.lighthouseOn, this.visTime);
    // camera subject: player leader (or spectated flock)
    let f = this.spectate > 0 ? this.spectate : this.player;
    if (!(f <= src.flockCount && (src.flockAlive[f] || src.flockElimTick[f] >= 0))) f = 1;
    const lx = src.leaderPrevX[f] + (src.leaderX[f] - src.leaderPrevX[f]) * alpha;
    const lz = src.leaderPrevZ[f] + (src.leaderZ[f] - src.leaderPrevZ[f]) * alpha;
    const vx = (src.leaderX[f] - src.leaderPrevX[f]) * 30;
    const vz = (src.leaderZ[f] - src.leaderPrevZ[f]) * 30;
    this.camera.update(dt, lx, lz, vx, vz, src.flockRadius(f), this.showActive ? { x: this.show.x, z: this.show.z, scale: this.show.scale } : undefined);
    g.uCamPos.value.copy(this.camera.cam.position);
    // lighthouse uniform for the water reflection
    g.uLighthouse.value.set(this.lighthousePos.x, this.lighthousePos.y, this.lighthouseOn, 0);
    this.skyWater.follow(this.camera.cam.position);
    this.birds.renderOwnership();
    this.renderer.render(this.scene, this.camera.cam);
  }

  private readonly lighthousePos = new THREE.Vector2();
  setLighthouse(x: number, z: number): void {
    this.lighthousePos.set(x, z);
  }

  /** Compile every program once (no hitch on first use, §5.5). */
  warmup(): void {
    this.renderer.compile(this.scene, this.camera.cam);
    this.renderer.compile(this.birds.ownScene, this.birds.ownCamera);
  }

  stats(): SuruRenderStats {
    const info = this.renderer.info;
    return {
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      programs: info.programs ? info.programs.length : 0,
      birdTris: this.birds.triangles,
      tier: this.tier,
      pixelRatio: this.renderer.getPixelRatio(),
    };
  }

  dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    this.birds.dispose();
    this.effects.dispose();
    this.env.dispose();
    this.skyWater.dispose();
    this.renderer.dispose();
  }
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
