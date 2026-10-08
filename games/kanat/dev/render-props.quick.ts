// render-props dev page: turntable/studio + (when available) the real world scene.
// URL: /dev/render-props.html?item=balloon|chimney|tree|pilot|gulet|house|ruins|vfx|all&tier=low|medium|high|ultra&t=0
//      &view=near|mid|far|back  &pattern=N&palette=N (pilot)  &state=fly|jump|canopy|landed|crash|ghost (pilot)
import * as THREE from 'three';
import { makeBackdrop } from './render-props.backdrop.ts';
import type { QualityTier } from '../src/core/settings.ts';
import type { BalloonDef, PropInstance, PropPrimitive, WorldId } from '../src/sim/types.ts';
import { ChimneyLayer } from '../src/render/props/chimneys.ts';
import { BalloonLayer } from '../src/render/props/balloons.ts';
import { tierConfig } from '../src/render/props/tiers.ts';
import { flatSampler, demoProps, demoBalloons } from './render-props.demo.ts';

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
const grp = new THREE.Group(); scene.add(grp);
const ch = new ChimneyLayer(grp, cfg, 2000);
const bl = new BalloonLayer(grp, cfg, 64);
let simTime = tParam;
function lookFrom(px: number, py: number, pz: number, tx: number, ty: number, tz: number, fov = 60): void {
  camera.position.set(px, py, pz); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(tx, ty, tz);
}
const propList: PropInstance[] = demoProps(item, sampler);
const balloons: BalloonDef[] = item === 'balloon' || item === 'all' ? demoBalloons(item === 'balloon' ? 9 : 40) : [];
ch.build(propList.filter(p => p.type === 'chimney'), propList.filter(p => p.type === 'chimneyCap'));
if (balloons.length) bl.build(balloons);
if (item === 'balloon') {
  if (view === 'near') lookFrom(-26, 6, 18, 0, 14, 0, 55);
  else if (view === 'back') lookFrom(-70, 4, -10, 20, 22, 0, 50);
  else if (view === 'far') lookFrom(-380, 60, 260, 0, 30, 0, 45);
  else lookFrom(60, 8, 70, 0, 18, 0, 55);
} else if (item === 'chimney') {
  if (view === 'near') lookFrom(4.2, 2.2, 6.2, 0, 4.5, 0, 70);
  else if (view === 'far') lookFrom(-150, 70, 240, 0, 10, 0, 45);
  else if (view === 'back') lookFrom(-60, 12, 30, 20, 14, 0, 55);
  else lookFrom(46, 14, 58, 0, 12, 0, 55);
} else lookFrom(50, 18, 60, 0, 6, 0, 55);
let frames = 0;
let last = performance.now();
const clock = new THREE.Timer();
function frame(): void {
  clock.update();
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (params.get('anim') === '1') simTime += dt;
  camera.updateMatrixWorld(); ch.update(camera); if (balloons.length) bl.update(simTime, camera, simTime);
  bd.update(camera, now / 1000, renderer.domElement.width, renderer.domElement.height);
  renderer.render(scene, camera);
  frames++;
  const pf = { calls: ch.calls() + bl.calls(), triangles: ch.triangles() + bl.triangles(), instances: ch.stats };
  const info = renderer.info.render;
  hud.textContent = `KANAT render-props · ${item} · ${tier} · ${view}\ncalls ${info.calls}  tris ${info.triangles}\nprops calls ${pf.calls} tris ${pf.triangles}\n${JSON.stringify(pf.instances)}`;
  if (frames === 6) window.__shotReady = true;
  requestAnimationFrame(frame);
}
window.__kanatDev = { scene, camera, renderer, cfg };
requestAnimationFrame(frame);
