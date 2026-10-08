// Debug probe: print height profiles of a baked world. node tools/terrain/probe.ts <world> <x0,z0,x1,z1> [n]
import type { WorldId } from '../../src/sim/types.ts';
import { loadWorldNode } from './loadNode.ts';

const id = process.argv[2] as WorldId;
const [x0, z0, x1, z1] = (process.argv[3] ?? '-2000,0,2000,0').split(',').map(Number);
const n = Number(process.argv[4] ?? 21);
const w = loadWorldNode(id);
const vs = w.config.geo.verticalScale;
const rows: string[] = [];
for (let k = 0; k < n; k++) {
  const t = k / (n - 1);
  const x = x0 + (x1 - x0) * t;
  const z = z0 + (z1 - z0) * t;
  const h = w.sampler.baseHeight(x, z);
  rows.push(`${x.toFixed(0).padStart(6)} ${z.toFixed(0).padStart(6)}  h=${h.toFixed(1).padStart(7)}  raw=${(h / vs).toFixed(1).padStart(7)}  slope=${w.sampler.slopeDeg(x, z).toFixed(1)}`);
}
console.log(rows.join('\n'));
