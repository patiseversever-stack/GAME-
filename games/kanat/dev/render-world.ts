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

let propsUpdate: ((t: number) => void) | null = null;

async function main(): Promise<void> {
  const t0 = performance.now();
  const wr = WorldRenderer.create(canvas, tier, { preserveDrawingBuffer: true });
  window.__rw = wr;
  wr.setSize(window.innerWidth, window.innerHeight);
  if (q.get('scale')) wr.kr.setRenderScale(Number(q.get('scale')));
  else wr.kr.setRenderScale(1);
  const world = await loadWorld(worldId, { ktx2: false });
  const tLoad = performance.now();
  await wr.loadWorld(world);
  const tReady = performance.now();
  if (q.get('debug') === 'magenta') wr.setDebugMagenta(true);
  if (q.get('props')) {
    try {
      const [{ PropsRenderer }, { buildProps }, { balloonsFor, balloonPos }] = await Promise.all([
        import('../src/render/props/PropsRenderer.ts'),
        import('../src/sim/world/props.ts'),
        import('../src/sim/world/balloons.ts'),
      ]);
      const pr = new PropsRenderer(wr.propsRoot, tier);
      const props = buildProps(worldId, world.sampler, world.config as never);
      const seed = (world.config.props?.balloons?.seed as number | undefined) ?? 7;
      const balloons = balloonsFor(worldId, world.sampler, seed);
      pr.setBalloonPositionFn(balloonPos as never);
      const sd = atmosphereState.sunDirection;
      pr.build(worldId, props, balloons, world.sampler, { renderer: wr.renderer, sunDir: [sd.x, sd.y, sd.z] });
      (window as unknown as { __props: unknown }).__props = pr;
      propsUpdate = (t: number) => pr.update(t, wr.camera, 1 / 60);
      await wr.warmup();
    } catch (e) {
      console.error('props failed', e);
    }
  }
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
  // Generic shot finders: &cliff=1 → 3 m from the steepest nearby face; &run=1 → 5 m AGL along a valley floor.
  const sm = world.sampler;
  const cx = Number(q.get('cx') ?? 0);
  const cz = Number(q.get('cz') ?? 0);
  const R = Number(q.get('r') ?? 2200);
  if (q.get('cliff')) {
    let best = -1, bx = cx, bz = cz;
    for (let z = cz - R; z <= cz + R; z += 20) for (let x = cx - R; x <= cx + R; x += 20) {
      if (x < sm.bounds.minX || x > sm.bounds.maxX || z < sm.bounds.minZ || z > sm.bounds.maxZ) continue;
      if (world.terrain.hasSea && sm.height(x, z) < 2) continue;
      const sd = sm.slopeDeg(x, z);
      if (sd > best) { best = sd; bx = x; bz = z; }
    }
    const n = [0, 0, 0];
    sm.normal(bx, bz, n);
    const hl = Math.hypot(n[0], n[2]) || 1;
    const px = bx + (n[0] / hl) * 3.5, pz = bz + (n[2] / hl) * 3.5;
    const py = Math.max(sm.height(bx, bz) + 1.0, sm.height(px, pz) + 1.5);
    // Look along the face (tangent), slightly toward it.
    const tx = -n[2] / hl, tz = n[0] / hl;
    const lx = tx * 0.94 - (n[0] / hl) * 0.34, lz = tz * 0.94 - (n[2] / hl) * 0.34;
    const yaw = (Math.atan2(lx, -lz) * 180) / Math.PI;
    applyBookmark(cam, { name: 'cliff', pos: [px, py, pz], yaw, pitch: 4, fov: Number(q.get('fov') ?? 80) });
    console.log('CLIFF slope ' + best.toFixed(1) + ' at ' + bx.toFixed(0) + ',' + bz.toFixed(0));
  } else if (q.get('run')) {
    let best = Infinity, bx = cx, bz = cz;
    for (let z = cz - R; z <= cz + R; z += 40) for (let x = cx - R; x <= cx + R; x += 40) {
      if (x < sm.bounds.minX + 300 || x > sm.bounds.maxX - 300 || z < sm.bounds.minZ + 300 || z > sm.bounds.maxZ - 300) continue;
      const h0 = sm.height(x, z);
      if (world.terrain.hasSea && h0 < 3) continue;
      // Valley-ness: surrounding terrain at 150 m much higher than here.
      let ring = 0;
      for (let k = 0; k < 8; k++) ring += sm.height(x + Math.cos(k * 0.785) * 150, z + Math.sin(k * 0.785) * 150);
      const score = h0 - ring / 8;
      if (score < best) { best = score; bx = x; bz = z; }
    }
    // Heading that stays lowest over 250 m.
    let bestYaw = 0, bestH = Infinity;
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      let mx = -Infinity;
      for (let d = 30; d <= 250; d += 30) mx = Math.max(mx, sm.height(bx + Math.sin(a) * d, bz - Math.cos(a) * d));
      if (mx < bestH) { bestH = mx; bestYaw = (a * 180) / Math.PI; }
    }
    applyBookmark(cam, { name: 'run', pos: [bx, sm.height(bx, bz) + 5, bz], yaw: bestYaw, pitch: -2, fov: Number(q.get('fov') ?? 84) });
    console.log('RUN valley ' + best.toFixed(1) + ' at ' + bx.toFixed(0) + ',' + bz.toFixed(0) + ' yaw ' + bestYaw.toFixed(0));
  }
  const dt = Number(q.get('t') ?? 0);
  if (q.get('horizon')) {
    // §9.G-3: N deterministic random cameras inside the play bounds (+ edges), background & skirts magenta.
    wr.setDebugMagenta(true);
    const n = Number(q.get('horizon'));
    const gl = wr.renderer.getContext();
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    let seed = 1234567;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    let worst = 0, total = 0, bad = 0;
    const b = sm.bounds;
    for (let i = 0; i < n; i++) {
      const x = b.minX + rnd() * (b.maxX - b.minX);
      const z = b.minZ + rnd() * (b.maxZ - b.minZ);
      const agl = [3, 8, 30, 120, 400, 1200][i % 6];
      const yaw = rnd() * 360;
      const pitch = -25 + rnd() * 35;
      const gy = Math.max(sm.height(x, z), world.terrain.hasSea ? 0 : -1e9);
      applyBookmark(cam, { name: 'h', pos: [x, gy + agl, z], yaw, pitch, fov: 86 });
      wr.render(1 / 60);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      // Magenta below the horizon line only counts as a hole; sky magenta is expected above the horizon.
      let m = 0;
      const horizonRow = (() => {
        // Ground point at the fog-fade distance along the view heading: rays below it must hit terrain.
        const fe = wr.params.terrain.viewDistance;
        const yr = (yaw * Math.PI) / 180;
        const v = new THREE.Vector3(cam.position.x + Math.sin(yr) * fe, gy, cam.position.z - Math.cos(yr) * fe).project(cam);
        return Math.round((v.y * 0.5 + 0.5) * h);
      })();
      for (let yy = 0; yy < Math.min(h, horizonRow - 2); yy++) {
        for (let xx = 0; xx < w; xx++) {
          const o = (yy * w + xx) * 4;
          if (px[o] > 230 && px[o + 1] < 40 && px[o + 2] > 230) m++;
        }
      }
      total += m;
      if (m > 0) bad++;
      worst = Math.max(worst, m);
    }
    console.log('HORIZON ' + JSON.stringify({ world: worldId, tier, cams: n, badCams: bad, magentaPixels: total, worst }));
    wr.setDebugMagenta(false);
  }
  if (q.get('perf')) {
    const rows: Record<string, unknown>[] = [];
    for (const b of bms) {
      applyBookmark(cam, b);
      propsUpdate?.(2);
      wr.render(1 / 60);
      const p = wr.perf();
      rows.push({ bm: b.name, calls: p.calls, tris: p.triangles, nodes: p.terrainNodes, programs: p.programs, textures: p.textures, texMB: Math.round(p.textureMB * 10) / 10, mp: Math.round(p.megapixels * 100) / 100 });
    }
    window.__perf = rows;
    console.log('PERF ' + JSON.stringify({ world: worldId, tier, rows }));
    applyBookmark(cam, bms[0]);
  }
  propsUpdate?.(dt + 2);
  wr.render(dt + 1 / 60);
  propsUpdate?.(dt + 2);
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
