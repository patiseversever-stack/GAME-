// render-props dev page: turntable/studio + (when available) the real world scene.
// URL: /dev/render-props.html?item=balloon|chimney|tree|pilot|gulet|house|ruins|vfx|all&tier=low|medium|high|ultra&t=0
//      &view=near|mid|far|back  &pattern=N&palette=N (pilot)  &state=fly|jump|canopy|landed|crash|ghost (pilot)
import * as THREE from 'three';
import { makeBackdrop } from './render-props.backdrop.ts';
import type { QualityTier } from '../src/core/settings.ts';
import type { BalloonDef, PropInstance, PropPrimitive, WorldId } from '../src/sim/types.ts';
import { PropsRenderer } from '../src/render/props/PropsRenderer.ts';
import { tierConfig } from '../src/render/props/tiers.ts';
import { Pilot } from '../src/render/pilot/Pilot.ts';
import { SUIT_PATTERN_NAMES } from '../src/render/pilot/suitPatterns.ts';
import { VFX } from '../src/render/vfx/VFX.ts';
import { flatSampler, demoProps, demoBalloons, demoFlightState } from './render-props.demo.ts';

declare global {
  interface Window { __shotReady?: boolean; __kanatDev?: unknown }
}

const params = new URLSearchParams(location.search);
const item = params.get('item') ?? 'balloon';
const tier = (params.get('tier') ?? 'high') as QualityTier;
const tParam = Number(params.get('t') ?? '0');
const view = params.get('view') ?? 'mid';
const worldParam = (params.get('world') ?? '') as WorldId | '';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const hud = document.getElementById('hud') as HTMLDivElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier !== 'low', powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 20000);

// ---------------------------------------------------------------------------------------------------------------
// Studio backdrop: dawn gradient sky (also baked to PMREM for reflections), warm low sun, soft ground.
const worldId: WorldId = worldParam || (item === 'tree' ? 'karadeniz' : item === 'gulet' ? 'likya' : item === 'house' ? 'karadeniz' : item === 'ruins' ? 'pamukkale' : 'kapadokya');
const bd = makeBackdrop(renderer, scene, worldId, 0);
const sunDir = bd.sunDir;


// ---------------------------------------------------------------------------------------------------------------
const cfg = tierConfig(tier);
const sampler = flatSampler(0);
const props = new PropsRenderer(scene, tier);
let pilot: Pilot | null = null;
let ghost: Pilot | null = null;
let vfx: VFX | null = null;
let simTime = tParam;

function lookFrom(px: number, py: number, pz: number, tx: number, ty: number, tz: number, fov = 60): void {
  camera.position.set(px, py, pz);
  camera.fov = fov;
  camera.updateProjectionMatrix();
  camera.lookAt(tx, ty, tz);
}

const propList: PropInstance[] = demoProps(item, sampler);
const balloons: BalloonDef[] = item === 'balloon' || item === 'all' || item === 'vfx' ? demoBalloons(item === 'balloon' ? 9 : 40) : [];
props.build(worldId, propList, balloons, sampler, { renderer, sunDir: [sunDir.x, sunDir.y, sunDir.z] });

if (item === 'balloon') {
  if (view === 'near') lookFrom(-26, 6, 18, 0, 14, 0, 55);
  else if (view === 'back') lookFrom(-70, 4, -10, 20, 22, 0, 50); // looking east into the low sun: translucency
  else if (view === 'far') lookFrom(-380, 60, 260, 0, 30, 0, 45);
  else lookFrom(60, 8, 70, 0, 18, 0, 55);
} else if (item === 'chimney') {
  if (view === 'near') lookFrom(4.2, 2.2, 6.2, 0, 4.5, 0, 70);
  else if (view === 'far') lookFrom(-150, 70, 240, 0, 10, 0, 45);
  else if (view === 'back') lookFrom(-60, 12, 30, 20, 14, 0, 55);
  else lookFrom(46, 14, 58, 0, 12, 0, 55);
} else if (item === 'tree') {
  if (view === 'near') lookFrom(9, 4, 14, 0, 6, 0, 60);
  else if (view === 'far') lookFrom(-200, 60, 200, 0, 10, 0, 45);
  else lookFrom(42, 12, 48, 0, 9, 0, 55);
} else if (item === 'pilot') {
  pilot = new Pilot(scene, tier, { sampler });
  const pat = Number(params.get('pattern') ?? '0');
  const pal = Number(params.get('palette') ?? '0');
  pilot.setSuit({ pattern: pat, palette: pal });
  const st = params.get('state') ?? 'fly';
  if (st === 'ghost') {
    ghost = new Pilot(scene, tier, { ghost: true, ghostColor: '#7FE3FF', sampler });
  }
  const fs = demoFlightState(st === 'ghost' ? 'fly' : st, simTime);
  pilot.setState(fs, tParam);
  ghost?.setState(fs, tParam);
  const p = fs.pos;
  if (ghost) ghost.object.position.x += 1.2;
  if (view === 'near') lookFrom(p[0] + 2.4, p[1] + 1.4, p[2] + 2.6, p[0], p[1], p[2], 50);
  else if (view === 'top') lookFrom(p[0] + 0.01, p[1] + 4.2, p[2] + 0.5, p[0], p[1], p[2], 55);
  else if (view === 'far') lookFrom(p[0] + 18, p[1] + 9, p[2] + 22, p[0], p[1] - 4, p[2], 45);
  else lookFrom(p[0] + 0.6, p[1] + 1.4, p[2] + 4.6, p[0], p[1] + 0.1, p[2] - 3, 70);
} else if (item === 'vfx') {
  pilot = new Pilot(scene, tier, { sampler });
  vfx = new VFX(scene, tier);
  vfx.setWorld(worldId, sampler);
  vfx.attachProps(props);
  const fs = demoFlightState('fly', simTime);
  pilot.setState(fs, tParam);
  lookFrom(fs.pos[0] + 1.2, fs.pos[1] + 1.6, fs.pos[2] + 5.2, fs.pos[0], fs.pos[1], fs.pos[2] - 6, 74);
} else {
  if (view === 'near') lookFrom(14, 6, 18, 0, 4, 0, 60);
  else if (view === 'far') lookFrom(-220, 90, 260, 0, 10, 0, 45);
  else lookFrom(50, 18, 60, 0, 6, 0, 55);
}

let frames = 0;
let last = performance.now();
const clock = new THREE.Timer();
function frame(): void {
  clock.update();
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (params.get('anim') === '1') simTime += dt;
  props.update(simTime, camera, dt);
  if (pilot) pilot.update(dt, camera);
  if (ghost) ghost.update(dt, camera);
  if (vfx && pilot) vfx.update(dt, simTime, camera, demoFlightState('fly', simTime), pilot);
  bd.update(camera, now / 1000, renderer.domElement.width, renderer.domElement.height);
  renderer.render(scene, camera);
  frames++;
  const pf = props.perf();
  const info = renderer.info.render;
  hud.textContent = `KANAT render-props · ${item} · ${tier} · ${view}\ncalls ${info.calls}  tris ${info.triangles}\nprops calls ${pf.calls} tris ${pf.triangles}\n${JSON.stringify(pf.instances)}${pilot ? '\nsuit: ' + SUIT_PATTERN_NAMES[pilot.suit.pattern] : ''}`;
  if (frames === 6) window.__shotReady = true;
  requestAnimationFrame(frame);
}
window.__kanatDev = { props, scene, camera, renderer, cfg };
requestAnimationFrame(frame);
