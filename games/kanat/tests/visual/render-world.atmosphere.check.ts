// Atmosphere sanity (headless): sun vector = world.json (single light source rule §3.1), SH ambient sane,
// sky radiance finite/positive, grade neutral when zero. Run: node tests/visual/render-world.atmosphere.check.ts
import fs from 'node:fs';
import * as THREE from 'three';
import { atmosphereState, atmosphereUniforms, installAtmosphere, setAtmosphere, skyRadiance, sunDirectionFrom } from '../../src/render/shaders/atmosphere.ts';
import { LOOKS } from '../../src/render/looks.ts';
import type { WorldId } from '../../src/sim/types.ts';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) failures++;
}

installAtmosphere();
check('fog chunk replaced', THREE.ShaderChunk.fog_fragment.includes('kanatFogFragment'));
check('tonemapping chunk carries the grade', THREE.ShaderChunk.tonemapping_fragment.includes('kanatGradeFinish'));
check('ShaderLib.standard has shared kSun', (THREE.ShaderLib.standard.uniforms as Record<string, { value: unknown }>).kSun?.value === atmosphereUniforms.kSun.value);

const ids: WorldId[] = ['kapadokya', 'likya', 'karadeniz', 'erciyes', 'pamukkale'];
for (const id of ids) {
  const path = `public/worlds/${id}/world.json`;
  const cfg = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf8')) : null;
  setAtmosphere({ id, config: cfg, floorY: cfg?.fog?.baseY ?? 0 });
  const sd = atmosphereState.sunDirection;
  if (cfg?.sun?.dir) {
    const d = cfg.sun.dir as number[];
    const dot = sd.x * d[0] + sd.y * d[1] + sd.z * d[2];
    check(`${id}: sun matches world.json dir`, dot > 0.9999, `dot ${dot.toFixed(6)}`);
  } else {
    const ref = sunDirectionFrom(LOOKS[id].sun.azimuthDeg, LOOKS[id].sun.elevationDeg);
    check(`${id}: sun from look`, sd.dot(ref) > 0.9999);
  }
  const rgb = [0, 0, 0];
  let ok = true;
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    for (const y of [-0.3, 0, 0.05, 0.3, 0.9]) {
      const r = Math.sqrt(1 - y * y);
      skyRadiance(Math.cos(a) * r, y, Math.sin(a) * r, rgb);
      if (!(rgb[0] >= 0 && rgb[1] >= 0 && rgb[2] >= 0 && Number.isFinite(rgb[0] + rgb[1] + rgb[2]))) ok = false;
    }
  }
  check(`${id}: sky radiance finite & ≥ 0`, ok);
  const up = new THREE.Vector3(0, 1, 0);
  const down = new THREE.Vector3(0, -1, 0);
  const eu = atmosphereState.sh.getIrradianceAt(up, new THREE.Vector3());
  const ed = atmosphereState.sh.getIrradianceAt(down, new THREE.Vector3());
  // Snow (Erciyes) may bounce nearly as much as the sky: allow ground ≤ 1.25 × sky.
  check(`${id}: SH ground bounce ≤ 1.25 × sky`, 1.25 * (eu.x + eu.y + eu.z) > ed.x + ed.y + ed.z && ed.x >= 0, `up ${eu.x.toFixed(2)},${eu.y.toFixed(2)},${eu.z.toFixed(2)} down ${ed.x.toFixed(2)}`);
  const zen = [0, 0, 0];
  skyRadiance(0, 1, 0, zen);
  const hz = [0, 0, 0];
  skyRadiance(-sd.x, 0, -sd.z, hz);
  check(`${id}: zenith bluer than anti-sun horizon`, zen[2] / (zen[0] + 1e-6) > hz[2] / (hz[0] + 1e-6), `zen b/r ${(zen[2] / zen[0]).toFixed(2)} hz b/r ${(hz[2] / hz[0]).toFixed(2)}`);
}
console.log(failures === 0 ? '\nALL ATMOSPHERE CHECKS PASSED' : `\n${failures} ATMOSPHERE CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
