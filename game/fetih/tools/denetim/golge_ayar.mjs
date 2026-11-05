// Gölge Oyunu maket ayarı:  node tools/denetim/golge_ayar.mjs [kimlik,kimlik]
// Her örnek için gölge düşüren üçgenlerin kutusundan dönme merkezi (c) ve ışık yolunun her anında perdeye (kenar payı
// 0,1) sığan en büyük ölçek (s) önerilir; başta/sonda gölge aralığı ve sondaki alan payı yazılır (sınamanın ölçüsü).
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const want = (process.argv[2] || '').split(',').filter(Boolean);
const BODY = `
import * as THREE from 'three';
import { SAMPLES } from './src/quiz/deneme-icat.js';
import { buildModel, lightAt, modelMatrix, project, STAGE, NO_SHADOW } from './src/quiz/d_golge.js';
const WANT = ${JSON.stringify(want)};
const { CW, CH, MZ, LR, LY } = STAGE;
const L = new THREE.Vector3(0, LY, MZ - LR);
const GW = 344, GH = 300;
for (const q of SAMPLES.golge) {
	if (WANT.length && !WANT.includes(q.id)) continue;
	const it = buildModel(q.model); let st; while (!(st = it.next()).done);
	const g = st.value;
	const P = g.getAttribute('position').array, C = g.getAttribute('col').array, I = g.getAttribute('info').array;
	const n = P.length / 3;
	const box = q.box || [[-9, -9, -9], [9, 9, 9]];
	const cut = q.cut || [[1, 1, 1], [0, 0, 0]];
	const inB = (k, b) => P[k * 3] >= b[0][0] && P[k * 3] <= b[1][0] && P[k * 3 + 1] >= b[0][1] && P[k * 3 + 1] <= b[1][1] && P[k * 3 + 2] >= b[0][2] && P[k * 3 + 2] <= b[1][2];
	const keepV = (k) => C[k * 4 + 3] < 200 && !NO_SHADOW.includes(I[k * 4]) && inB(k, box) && !inB(k, cut);
	const tris = [];
	const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
	for (let k = 0; k < n; k += 3) if (keepV(k) && keepV(k + 1) && keepV(k + 2)) { tris.push(k); for (let j = 0; j < 3; j++) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], P[(k + j) * 3 + a]); hi[a] = Math.max(hi[a], P[(k + j) * 3 + a]); } }
	const c = q.c && !process.env.YENI ? q.c : [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2].map((x) => +x.toFixed(3));
	const M = new THREE.Matrix4(), w = new THREE.Vector3(), o = { x: 0, y: 0 };
	const shade = (u, s, grid = null) => {
		const a = lightAt(u, q.path); modelMatrix(a.az, a.el, c, M, s);
		let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
		const xy = new Float32Array(6);
		for (const k of tris) {
			for (let j = 0; j < 3; j++) { w.set(P[(k + j) * 3], P[(k + j) * 3 + 1], P[(k + j) * 3 + 2]).applyMatrix4(M); project(L, w, o); x0 = Math.min(x0, o.x); x1 = Math.max(x1, o.x); y0 = Math.min(y0, o.y); y1 = Math.max(y1, o.y); xy[j * 2] = ((o.x + CW / 2) / CW) * GW; xy[j * 2 + 1] = ((o.y + CH / 2) / CH) * GH; }
			if (!grid) continue;
			const [ax, ay, bx, by, cx, cy] = xy; const d = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay); if (Math.abs(d) < 1e-9) continue;
			for (let py = Math.max(0, Math.floor(Math.min(ay, by, cy))); py <= Math.min(GH - 1, Math.ceil(Math.max(ay, by, cy))); py++) for (let px = Math.max(0, Math.floor(Math.min(ax, bx, cx))); px <= Math.min(GW - 1, Math.ceil(Math.max(ax, bx, cx))); px++) {
				const X = px + .5, Y = py + .5; const w0 = ((bx - X) * (cy - Y) - (cx - X) * (by - Y)) / d; const w1 = ((cx - X) * (ay - Y) - (ax - X) * (cy - Y)) / d; if (w0 >= 0 && w1 >= 0 && w0 + w1 <= 1) grid[py * GW + px] = 1; }
		}
		return { x0, x1, y0, y1 };
	};
	const fits = (s) => { for (let u = 0; u <= 1.0001; u += 0.05) { const b = shade(u, s); if (!(b.x0 > -CW / 2 + 0.1 && b.x1 < CW / 2 - 0.1 && b.y0 > -CH / 2 + 0.1 && b.y1 < CH / 2 - 0.1)) return false; } return true; };
	let s = 2.5; while (s > 0.15 && !fits(s)) s -= 0.02; s = +s.toFixed(2);
	const gaps = (grid) => { let best = 0; for (let r = 0; r < GH; r++) { let f = -1, l = -1; for (let x = 0; x < GW; x++) if (grid[r * GW + x]) { if (f < 0) f = x; l = x; } let m = 0; for (let x = f + 1; x <= l; x++) if (!grid[r * GW + x] && grid[r * GW + x - 1]) m++; best = Math.max(best, m); } return best; };
	const g0 = new Uint8Array(GW * GH), g1 = new Uint8Array(GW * GH);
	shade(0, s, g0); shade(1, s, g1);
	const area = g1.reduce((a, b) => a + b, 0) / (GW * GH);
	if (process.env.CIZ) {
		const fs = await import('node:fs');
		for (const u of [0, 0.5, 1]) {
			const gr = new Uint8Array(GW * GH);
			shade(u, q.s && !process.env.YENI ? q.s : s, gr);
			const head = 'P5' + String.fromCharCode(10) + GW + ' ' + GH + String.fromCharCode(10) + '255' + String.fromCharCode(10);
			const px = new Uint8Array(GW * GH);
			for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) px[(GH - 1 - y) * GW + x] = gr[y * GW + x] ? 30 : 236;
			fs.writeFileSync(process.env.CIZ + '/' + q.id + '_' + u + '.pgm', Buffer.concat([Buffer.from(head), Buffer.from(px)]));
		}
	}
	console.log(q.id.padEnd(8), q.model.padEnd(12), 'c', JSON.stringify(c), 's', s, 'aralık', gaps(g0), '→', gaps(g1), 'alan %' + Math.round(area * 100), 'üçgen', tris.length);
}
`;
const r = await build({ stdin: { contents: BODY, resolveDir: root, loader: 'js' }, bundle: true, write: false, format: 'esm', platform: 'node', loader: { '.json': 'json' }, logLevel: 'silent' });
await import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'));
