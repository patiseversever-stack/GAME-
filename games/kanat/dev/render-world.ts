// render-world dev page: renders a still for screenshots / budget measurements.
// URL: ?world=kapadokya&tier=low&cam=x,y,z,yaw,pitch | &bm=0..9 | &agl=5 (cam y relative to ground)
//      &fov=74&t=0&debug=magenta&hud=1&perf=1 (logs renderer.info for all 10 bookmarks)
import * as THREE from 'three';
import { registerAssetPack } from '../src/core/assets.ts';
import type { QualityTier } from '../src/core/settings.ts';
import { loadWorld } from '../src/content/worlds.ts';
import type { WorldId } from '../src/sim/types.ts';
import { WorldRenderer, applyBookmark } from '../src/render/WorldRenderer.ts';
import { atmosphereState, atmosphereUniforms } from '../src/render/shaders/atmosphere.ts';

declare global {
  interface Window {
    __shotReady?: boolean;
    __rw?: WorldRenderer;
    __perf?: unknown;
  }
}

registerAssetPack(async (p) => {
  const r = await fetch(`/${p.replace(/^\.?\//, '')}`);
  return r.ok ? r.arrayBuffer() : null;
});

const q = new URLSearchParams(location.search);
const worldId = (q.get('world') ?? 'kapadokya') as WorldId;
const tier = (q.get('tier') ?? 'low') as QualityTier;
const canvas = document.getElementById('c') as HTMLCanvasElement;
const hud = document.getElementById('hud') as HTMLDivElement;

async function main(): Promise<void> {
  const t0 = performance.now();
  const wr = WorldRenderer.create(canvas, tier, { preserveDrawingBuffer: true });
  window.__rw = wr;
  wr.setSize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  if (q.get('scale')) wr.kr.setRenderScale(Number(q.get('scale')));
  else wr.kr.setRenderScale(1);
  const world = await loadWorld(worldId, { ktx2: false });
  const tLoad = performance.now();
  await wr.loadWorld(world);
  const tReady = performance.now();
  if (q.get('debug') === 'magenta') wr.setDebugMagenta(true);
  // Look overrides for tuning: &prelit= &fogd= &gfd= &exp= &sun=
  const U = atmosphereUniforms;
  if (q.get('fogd')) U.kFog.value[0] = Number(q.get('fogd'));
  if (q.get('gfd')) U.kGroundFog.value[0] = Number(q.get('gfd'));
  if (q.get('tdebug') && wr.terrain) (wr.terrain.mesh.material.uniforms.uTDebug.value as THREE.Vector4).y = Number(q.get('tdebug'));
  if (q.get('rill')) wr.terrain?.setRills(Number(q.get('rill')), 1600);
  if (q.get('prelit')) wr.terrain?.setPrelit(Number(q.get('prelit')), 1, Number(q.get('pg') ?? 1));
  if (q.get('exp')) { atmosphereState.grade.exposure = Number(q.get('exp')); wr.kr.setExposure(Number(q.get('exp'))); }
  const cam = wr.camera;
  const bms = wr.bookmarks(worldId);
  const camStr = q.get('cam');
  if (camStr) {
    const [x, y, z, yaw, pitch] = camStr.split(',').map(Number);
    let yy = y;
    if (q.get('agl') !== null) yy = world.sampler.height(x, z) + Number(q.get('agl'));
    applyBookmark(cam, { name: 'url', pos: [x, yy, z], yaw: yaw ?? 0, pitch: pitch ?? 0, fov: Number(q.get('fov') ?? 74) });
  } else {
    const b = bms[Number(q.get('bm') ?? 0)] ?? bms[0];
    applyBookmark(cam, { ...b, fov: Number(q.get('fov') ?? b.fov) });
  }
  const dt = Number(q.get('t') ?? 0);
  if (q.get('perf')) {
    const rows: Record<string, unknown>[] = [];
    for (const b of bms) {
      applyBookmark(cam, b);
      wr.render(1 / 60);
      const p = wr.perf();
      rows.push({ bm: b.name, calls: p.calls, tris: p.triangles, nodes: p.terrainNodes, programs: p.programs, textures: p.textures, texMB: Math.round(p.textureMB * 10) / 10, mp: Math.round(p.megapixels * 100) / 100 });
    }
    window.__perf = rows;
    console.log('PERF ' + JSON.stringify({ world: worldId, tier, rows }));
    applyBookmark(cam, bms[0]);
  }
  wr.render(dt + 1 / 60);
  wr.render(1 / 60);
  const p = wr.perf();
  const info = `${worldId} ${tier} calls ${p.calls} tris ${p.triangles} nodes ${p.terrainNodes} prog ${p.programs} tex ${p.textures} ~${p.textureMB.toFixed(0)}MB  ${p.megapixels.toFixed(2)}MP  load ${(tLoad - t0).toFixed(0)}ms build ${(tReady - tLoad).toFixed(0)}ms`;
  console.log(info);
  if (q.get('hud')) hud.textContent = info;
  window.__shotReady = true;
  if (q.get('live')) {
    let last = performance.now();
    const loop = (now: number) => {
      wr.render((now - last) / 1000);
      last = now;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

main().catch((e) => {
  console.error(e);
  hud.textContent = String(e?.stack ?? e);
  window.__shotReady = true;
});

export { THREE };
