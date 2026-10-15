// Bölge öncelikli sadeleştirme. Bölgeler: kafa (y > ycut), eller (|x| > xh ve y < hy), geri kalan.
// Kullanım: node decimate.mjs in.glb out.glb '{"ycut":0.63,"xh":0.43,"hy":0.25,"head":13000,"hands":4000,"rest":13000}'
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptSimplifier} from 'meshoptimizer';
const [,, inp, out, cfgS] = process.argv;
const cfg = JSON.parse(cfgS);
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const pos = prim.getAttribute('POSITION').getArray(), nrm = prim.getAttribute('NORMAL').getArray(), uv = prim.getAttribute('TEXCOORD_0').getArray();
let idx = Uint32Array.from(prim.getIndices().getArray());
const nv = pos.length / 3;
const attrs = new Float32Array(nv * 3); attrs.set(nrm);
const region = new Uint8Array(nv); // 0 geri kalan, 1 eller, 2 kafa
for (let i = 0; i < nv; i++) {
  const x = pos[i*3], y = pos[i*3+1];
  region[i] = y > cfg.ycut ? 2 : (Math.abs(x) > cfg.xh && y < cfg.hy ? 1 : 0);
}
const triIn = (ix, r) => { let c = 0; for (let t = 0; t < ix.length; t += 3) if (region[ix[t]] === r || region[ix[t+1]] === r || region[ix[t+2]] === r) c++; return c; };
console.log('ham üçgen', idx.length/3, 'bölgeler', [0,1,2].map(r => triIn(idx, r)));
const W = [0.6, 0.6, 0.6];
for (const [r, target] of [[0, cfg.rest], [1, cfg.hands], [2, cfg.head]]) {
  const lock = new Uint8Array(nv); for (let i = 0; i < nv; i++) lock[i] = region[i] === r ? 0 : 1;
  const cur = idx.length / 3, inR = triIn(idx, r);
  const [ni, err] = MeshoptSimplifier.simplifyWithAttributes(idx, pos, 3, attrs, 3, W, lock, Math.max(3, (cur - inR + target) * 3), 0.25);
  idx = ni; console.log('bölge', r, '→', triIn(idx, r), 'hata', err.toFixed(4));
}
const remap = new Int32Array(nv).fill(-1); let n = 0;
for (const v of idx) if (remap[v] < 0) remap[v] = n++;
const P = new Float32Array(n*3), N = new Float32Array(n*3), U = new Float32Array(n*2);
for (let v = 0; v < nv; v++) { const r = remap[v]; if (r < 0) continue; P.set(pos.subarray(v*3, v*3+3), r*3); N.set(nrm.subarray(v*3, v*3+3), r*3); U.set(uv.subarray(v*2, v*2+2), r*2); }
const I = new Uint32Array(idx.length); for (let k = 0; k < idx.length; k++) I[k] = remap[idx[k]];
prim.getAttribute('POSITION').setArray(P); prim.getAttribute('NORMAL').setArray(N); prim.getAttribute('TEXCOORD_0').setArray(U);
prim.getIndices().setArray(n < 65536 ? new Uint16Array(I) : I);
await io.write(out, doc);
console.log('sonuç üçgen', I.length/3, 'köşe', n);
