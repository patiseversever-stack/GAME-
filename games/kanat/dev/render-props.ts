// render-props dev page: turntable/studio + (when available) the real world scene.
// URL: /dev/render-props.html?item=balloon|chimney|tree|pilot|gulet|house|ruins|vfx|all&tier=low|medium|high|ultra&t=0
//      &view=near|mid|far|back  &pattern=N&palette=N (pilot)  &state=fly|jump|canopy|landed|crash|ghost (pilot)
import * as THREE from 'three';
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
const SUNS: Record<WorldId, { az: number; el: number; color: [number, number, number]; zen: string; hor: string; horSun: string; ground: string; fog: string }> = {
  kapadokya: { az: 95, el: 9, color: [1.0, 0.7, 0.45], zen: '#3E5F8A', hor: '#D9B9B4', horSun: '#F6C48E', ground: '#B8977C', fog: '#E6C9AE' },
  likya: { az: 248, el: 32, color: [1.0, 0.93, 0.84], zen: '#5FA8DE', hor: '#DCEEF8', horSun: '#EEF2EE', ground: '#A8A08C', fog: '#D6E8F2' },
  karadeniz: { az: 135, el: 22, color: [1.0, 0.98, 0.95], zen: '#6F8EA6', hor: '#DDE3E0', horSun: '#EEEDE2', ground: '#5E7046', fog: '#D5DCD8' },
  erciyes: { az: 225, el: 11, color: [1.0, 0.86, 0.72], zen: '#1F4E8C', hor: '#CFE3F5', horSun: '#F1E7DC', ground: '#D8DEE6', fog: '#CFE0F0' },
  pamukkale: { az: 268, el: 5, color: [1.0, 0.62, 0.38], zen: '#2B2D5B', hor: '#C7A2B8', horSun: '#FFC27A', ground: '#D9C2AE', fog: '#E8B9A0' },
};
const S = SUNS[worldId];
const sunDir = new THREE.Vector3(
  Math.sin((S.az * Math.PI) / 180) * Math.cos((S.el * Math.PI) / 180),
  Math.sin((S.el * Math.PI) / 180),
  -Math.cos((S.az * Math.PI) / 180) * Math.cos((S.el * Math.PI) / 180),
).normalize();

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    uZen: { value: new THREE.Color(S.zen) }, uHor: { value: new THREE.Color(S.hor) }, uHorSun: { value: new THREE.Color(S.horSun) },
    uGround: { value: new THREE.Color(S.ground) }, uSun: { value: sunDir }, uSunCol: { value: new THREE.Vector3(...S.color) },
  },
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix*vec4(position,0.0)).xyz); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
  fragmentShader: `uniform vec3 uZen, uHor, uHorSun, uGround, uSun, uSunCol; varying vec3 vDir;
    void main(){ vec3 d = normalize(vDir); float e = pow(max(d.y,0.0), 0.45);
      float side = pow(max(dot(normalize(d.xz+1e-5), normalize(uSun.xz+1e-5))*0.5+0.5, 0.0), 2.2);
      vec3 hz = mix(uHor, uHorSun, side); vec3 c = mix(hz, uZen, smoothstep(0.0, 1.0, e));
      c = mix(c, uGround * 0.8, smoothstep(0.0, -0.2, d.y));
      float mu = max(dot(d, uSun), 0.0); c += uSunCol * (pow(mu, 900.0) * 30.0 + pow(mu, 12.0) * 0.25);
      gl_FragColor = vec4(c * 1.15, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 32, 16), skyMat);
sky.frustumCulled = false;
scene.add(sky);
{
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat.clone());
  (envSky.material as THREE.ShaderMaterial).uniforms.uSunCol.value = new THREE.Vector3(...S.color).multiplyScalar(0.25);
  envScene.add(envSky);
  const rt = pm.fromScene(envScene, 0.02);
  scene.environment = rt.texture;
  scene.environmentIntensity = 0.9;
}
const sun = new THREE.DirectionalLight(new THREE.Color(...S.color), 3.6);
sun.position.copy(sunDir).multiplyScalar(500);
scene.add(sun);
scene.add(sun.target);
scene.fog = new THREE.Fog(new THREE.Color(S.fog), 400, 5000);

const groundMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(S.ground), roughness: 0.95 });
groundMat.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGW = (modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vGW;
    float gh(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    float gn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(gh(i),gh(i+vec2(1,0)),f.x), mix(gh(i+vec2(0,1)),gh(i+vec2(1,1)),f.x), f.y); }`)
    .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= 0.78 + 0.22*gn(vGW.xz*0.08) + 0.12*gn(vGW.xz*0.9) - 0.06;');
};
const ground = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000).rotateX(-Math.PI / 2), groundMat);
scene.add(ground);

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
sun.target.position.copy(camera.position);
sun.position.copy(camera.position).addScaledVector(sunDir, 500);

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
