// render-props in the REAL world scene (render-world's WorldRenderer: terrain, atmosphere, sky, post) with the
// sim's buildProps()/balloonsFor(), the pilot, VFX and route markers.
// URL: /dev/render-props.world.html?world=kapadokya&tier=high&shot=chase|chimney|balloons|vista|intro&t=0
import * as THREE from 'three';
import { registerAssetPack } from '../src/core/assets.ts';
import type { QualityTier } from '../src/core/settings.ts';
import { loadWorld } from '../src/content/worlds.ts';
import type { FlightState, PropInstance, WorldId } from '../src/sim/types.ts';
import { WorldRenderer } from '../src/render/WorldRenderer.ts';
import { atmosphereState } from '../src/render/shaders/atmosphere.ts';
import { PropsRenderer } from '../src/render/props/PropsRenderer.ts';
import { buildProps } from '../src/sim/world/props.ts';
import { balloonsFor, balloonPos } from '../src/sim/world/balloons.ts';
import { Pilot } from '../src/render/pilot/Pilot.ts';
import { VFX } from '../src/render/vfx/VFX.ts';

declare global { interface Window { __shotReady?: boolean; __kanatDev?: unknown } }

registerAssetPack(async (p) => {
  const r = await fetch(`/${p.replace(/^\.?\//, '')}`);
  return r.ok ? r.arrayBuffer() : null;
});

const q = new URLSearchParams(location.search);
const worldId = (q.get('world') ?? 'kapadokya') as WorldId;
const tier = (q.get('tier') ?? 'high') as QualityTier;
const shot = q.get('shot') ?? 'chase';
const canvas = document.getElementById('c') as HTMLCanvasElement;
const hud = document.getElementById('hud') as HTMLDivElement;

function state(pos: THREE.Vector3, psi: number, speed: number, phase: FlightState['phase'], ground: number): FlightState {
  const v: [number, number, number] = [Math.sin(psi) * speed, -speed * 0.3, -Math.cos(psi) * speed];
  return {
    tick: 0, phase, pos: [pos.x, pos.y, pos.z], prevPos: [pos.x, pos.y, pos.z], vel: v, speed, gamma: -0.28, psi, phi: 0.3,
    cl: 0.7, heightAGL: pos.y - ground, prox: { d: 30, cls: 'none', nearest: [pos.x, ground, pos.z], normal: [0, 1, 0], mult: 0, propId: -1 },
    score: 0, combo: 1, comboTime: 0, timeSec: 0, gateIndex: 0, gatesPassed: 0, gatesMissed: 0, inThermal: -1,
    inLandingZone: false, canopyOpen: false, assist: 'full', energy: 0,
  };
}

async function main(): Promise<void> {
  const wr = WorldRenderer.create(canvas, tier, { preserveDrawingBuffer: true });
  wr.setSize(window.innerWidth, window.innerHeight);
  wr.kr.setRenderScale(1);
  const world = await loadWorld(worldId, { ktx2: false });
  await wr.loadWorld(world);
  const s = world.sampler;
  const sd = atmosphereState.sunDirection;
  const props = buildProps(worldId, s, world.config as never);
  const balloons = balloonsFor(worldId, s, (world.config.props?.balloons?.seed as number | undefined) ?? 7);
  const pr = new PropsRenderer(wr.propsRoot, tier);
  pr.setBalloonPositionFn(balloonPos as never);
  pr.build(worldId, props, balloons, s, { renderer: wr.renderer, sunDir: [sd.x, sd.y, sd.z] });
  const pilot = new Pilot(wr.scene, tier, { sampler: s });
  pilot.setRenderer(wr.renderer);
  pilot.setSunDirection(sd.x, sd.y, sd.z);
  pilot.setSuit({ pattern: q.get('pattern') ?? 'kilim', palette: q.get('palette') ?? 'safak', canopy: 'safak' });
  const vfx = new VFX(wr.scene, tier);
  vfx.setWorld(worldId, s);
  vfx.attachProps(pr);
  vfx.setViewport(wr.renderer.domElement.width, wr.renderer.domElement.height);
  const cam = wr.camera;
  const t = Number(q.get('t') ?? '0');
  // pick a scene anchor: densest chimney cluster (or first prop / balloon)
  const ch = props.filter((p) => p.type === 'chimney' || p.type === 'tree');
  let anchor: PropInstance | undefined = ch[0];
  let best = -1;
  for (let i = 0; i < Math.min(ch.length, 400); i++) {
    let n = 0;
    for (let j = 0; j < ch.length; j++) if (ch[j].type === 'chimney' && Math.hypot(ch[j].pos[0] - ch[i].pos[0], ch[j].pos[2] - ch[i].pos[2]) < 90) n++;
    if (n > best) { best = n; anchor = ch[i]; }
  }
  const sunAz = Math.atan2(sd.x, -sd.z);
  let fs: FlightState;
  const P = new THREE.Vector3();
  if (shot === 'balloons' && balloons.length) {
    const c = new Float64Array(3);
    balloonPos(balloons[0], t, c);
    P.set(c[0] - 70, c[1] - 10, c[2] + 40);
    const psi = Math.atan2(c[0] - P.x, -(c[2] - P.z));
    fs = state(P, psi, 52, 'flying', s.height(P.x, P.z));
    cam.position.set(P.x - Math.sin(psi) * 6, P.y + 2, P.z + Math.cos(psi) * 6);
    cam.lookAt(c[0], c[1], c[2]);
  } else if (shot === 'vista') {
    const a = anchor ? anchor.pos : [0, s.height(0, 0), 0];
    P.set(a[0] + 40, a[1] + 60, a[2] + 40);
    fs = state(P, sunAz + Math.PI, 50, 'flying', s.height(P.x, P.z));
    cam.position.set(a[0] - Math.sin(sunAz) * 420, a[1] + 160, a[2] + Math.cos(sunAz) * 420);
    cam.lookAt(a[0], a[1] + 20, a[2]);
  } else {
    const a = anchor ? anchor.pos : [0, s.height(0, 0), 0];
    // fly past the cluster with the sun to the side (cross light)
    const psi = sunAz + Math.PI / 2;
    const gx = a[0] - Math.sin(psi) * 30 + Math.cos(psi) * 9, gz = a[2] + Math.cos(psi) * 30 + Math.sin(psi) * 9;
    P.set(gx, s.height(gx, gz) + (shot === 'chimney' ? 9 : 14), gz);
    fs = state(P, psi, 55, 'flying', s.height(P.x, P.z));
    if (shot === 'chimney') { cam.position.set(a[0] - Math.sin(psi) * 34 + Math.cos(psi) * 16, a[1] + 8, a[2] + Math.cos(psi) * 34 + Math.sin(psi) * 16); cam.lookAt(a[0], a[1] + 10, a[2]); }
    else { cam.position.set(P.x - Math.sin(psi) * 5.2 + 0.8, P.y + 1.6, P.z + Math.cos(psi) * 5.2); cam.lookAt(P.x + Math.sin(psi) * 12, P.y - 1.2, P.z - Math.cos(psi) * 12); }
  }
  cam.fov = 74; cam.updateProjectionMatrix();
  pilot.setState(fs, 1);
  for (let k = 0; k < 30; k++) pilot.update(1 / 30, cam);
  await wr.warmup();
  let frames = 0;
  const loop = (): void => {
    pr.update(t, cam, 1 / 60);
    pilot.update(1 / 60, cam, wr.renderer);
    vfx.update(1 / 60, t, cam, fs, pilot);
    wr.render(1 / 60, cam);
    frames++;
    const pf = pr.perf();
    const info = wr.renderer.info.render;
    hud.textContent = `KANAT render-props · ${worldId} · ${tier} · ${shot}\ncalls ${info.calls} tris ${info.triangles}\nprops calls ${pf.calls} tris ${pf.triangles}\n${JSON.stringify(pf.instances)}`;
    if (frames === 4) window.__shotReady = true;
    requestAnimationFrame(loop);
  };
  window.__kanatDev = { wr, pr, pilot, vfx };
  loop();
}

main().catch((e) => { console.error(e); hud.textContent = String(e); });
