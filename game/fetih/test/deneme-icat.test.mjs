// Deneme grubu "icat" (Gölge Oyunu) sınaması:  node test/deneme-icat.test.mjs
// deneme.test.mjs ile aynı yol (esbuild ile paketlenip çalıştırılır). Denetler: galeriye kayıt; sözleşme; her örnekte
// süre (en az 20 sn), belirlenimcilik, JSON görünüm, publicView doğru şıkkı taşımıyor, judge doğru/yanlış/boş, probe,
// botlar süre içinde ve usta acemiden iyi. GÖLGE: maket gerçekten kurulur (kahraman yapıcısı), gölge düşüren parça
// shader'daki kurallarla süzülür, ışık yolunun her anında fenerden perdeye izdüşürülüp küçük bir ızgaraya taranır:
// gölge perdeye sığar (kırpılmaz), başta tanınmaz bir kütle (sütun aralığı yok), sonda sütun aralıklarından ışık geçer.
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BODY = /* js */ `
import * as THREE from 'three';
import { TYPES, SAMPLES, ORDER } from './src/quiz/deneme-icat.js';
import { DENEME_TYPES, DENEME_ORDER } from './src/quiz/deneme.js';
import { PROFILE } from './src/quiz/timing.js';
import { buildModel, lightAt, modelMatrix, project, STAGE, NO_SHADOW, PATH } from './src/quiz/d_golge.js';
import { HEROES } from './src/map/hero_index.js';
import { rng } from './src/core/math.js';

let fails = 0;
let checks = 0;
const ok = (c, m) => {
	checks++;
	if (!c) {
		fails++;
		if (fails <= 60) console.log('  HATA: ' + m);
	}
};

for (const [t] of ORDER) ok(DENEME_TYPES[t] === TYPES[t] && DENEME_ORDER.some((o) => o[0] === t), t + ': galeriye kayıtlı değil');

for (const [type, list] of Object.entries(SAMPLES)) {
	const T = TYPES[type];
	ok(T && typeof T.time === 'number' && T.label && T.kind === 'exact', type + ': sözleşme');
	for (const f of ['prepare', 'mount', 'judge', 'bot', 'publicView', 'probe']) ok(typeof T?.[f] === 'function', type + ': ' + f + '()');
	ok(PROFILE[type] && PROFILE[type].min >= 20, type + ': süre profili en az 20 sn');
	for (const q of list) {
		const v = T.prepare(q, rng(7));
		ok(Number.isInteger(v.sec) && v.sec >= 20, q.id + ': süre ' + v.sec);
		ok(v.fast < v.med && v.med <= v.slow + 1e-9, q.id + ': hızlı < ortanca ≤ yavaş');
		ok(T.prepare(q, rng(7)).sec === v.sec && T.prepare(q, rng(7)).right === v.right, q.id + ': belirlenimci değil');
		ok(JSON.stringify(JSON.parse(JSON.stringify(v))) === JSON.stringify(v), q.id + ': görünüm JSON değil');
		ok(new Set(q.a).size === 4 && v.opts.length === 4 && v.opts[v.right] === q.a[0], q.id + ': şıklar');
		ok(!!HEROES[q.model], q.id + ': maket yapıcısı yok ' + q.model);
		const pv = T.publicView(v);
		ok(pv.right == null && !pv.q.a && Array.isArray(pv.opts) && pv.opts.length === 4, q.id + ': publicView doğru şıkkı sızdırıyor');
		const { good, bad } = T.probe(v);
		const jg = T.judge(v, good);
		const jb = T.judge(v, bad);
		ok(jg.correct === true && jb.correct === false && jg.err < jb.err, q.id + ': judge');
		ok(T.judge(v, null).correct === false, q.id + ': boş cevap kabul edildi');
		const rate = [0, 0];
		for (let k = 0; k < 400; k++) {
			const skill = k % 2 ? 0.9 : 0.2;
			const b = T.bot(v, skill, rng(1000 + k));
			ok(b.time >= 1 && b.time <= v.sec + 1e-9, q.id + ': bot süresi ' + b.time);
			ok(Number.isInteger(b.value) && b.value >= 0 && b.value < 4, q.id + ': bot cevabı');
			if (T.judge(v, b.value).correct) rate[k % 2]++;
		}
		ok(rate[1] > rate[0], q.id + ': usta bot acemiden iyi değil');

		// ---------------------------------------------------------------- gölge
		const it = buildModel(q.model);
		let s;
		while (!(s = it.next()).done);
		const g = s.value;
		const P = g.getAttribute('position').array;
		const C = g.getAttribute('col').array;
		const I = g.getAttribute('info').array;
		const n = P.length / 3;
		const box = q.box || [[-9, -9, -9], [9, 9, 9]];
		const cut = q.cut || [[1, 1, 1], [0, 0, 0]];
		const inB = (k, b) => P[k * 3] >= b[0][0] && P[k * 3] <= b[1][0] && P[k * 3 + 1] >= b[0][1] && P[k * 3 + 1] <= b[1][1] && P[k * 3 + 2] >= b[0][2] && P[k * 3 + 2] <= b[1][2];
		const keepV = (k) => C[k * 4 + 3] < 200 && !NO_SHADOW.includes(I[k * 4]) && inB(k, box) && !inB(k, cut);
		const tris = [];
		for (let k = 0; k < n; k += 3) if (keepV(k) && keepV(k + 1) && keepV(k + 2)) tris.push(k);
		ok(tris.length > 600, q.id + ': gölge düşüren üçgen az (' + tris.length + ')');
		const { CW, CH, MZ, LR, LY } = STAGE;
		const L = new THREE.Vector3(0, LY, MZ - LR);
		const M = new THREE.Matrix4();
		const w = new THREE.Vector3();
		const o = { x: 0, y: 0 };
		const GW = 344;
		const GH = 300;
		const shade = (u) => {
			const a = lightAt(u, q.path);
			modelMatrix(a.az, a.el, q.c || [0, 0.15, 0], M);
			const grid = new Uint8Array(GW * GH);
			const xy = new Float32Array(6);
			let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
			for (const k of tris) {
				for (let j = 0; j < 3; j++) {
					w.set(P[(k + j) * 3], P[(k + j) * 3 + 1], P[(k + j) * 3 + 2]).applyMatrix4(M);
					project(L, w, o);
					xy[j * 2] = ((o.x + CW / 2) / CW) * GW;
					xy[j * 2 + 1] = ((o.y + CH / 2) / CH) * GH;
					x0 = Math.min(x0, o.x); x1 = Math.max(x1, o.x); y0 = Math.min(y0, o.y); y1 = Math.max(y1, o.y);
				}
				// üçgeni tara (piksel merkezleri)
				const [ax, ay, bx, by, cx, cy] = xy;
				const d = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
				if (Math.abs(d) < 1e-9) continue;
				const lx = Math.max(0, Math.floor(Math.min(ax, bx, cx))), hx = Math.min(GW - 1, Math.ceil(Math.max(ax, bx, cx)));
				const ly = Math.max(0, Math.floor(Math.min(ay, by, cy))), hy = Math.min(GH - 1, Math.ceil(Math.max(ay, by, cy)));
				for (let py = ly; py <= hy; py++)
					for (let px = lx; px <= hx; px++) {
						const X = px + 0.5, Y = py + 0.5;
						const w0 = ((bx - X) * (cy - Y) - (cx - X) * (by - Y)) / d;
						const w1 = ((cx - X) * (ay - Y) - (ax - X) * (cy - Y)) / d;
						if (w0 >= 0 && w1 >= 0 && w0 + w1 <= 1) grid[py * GW + px] = 1;
					}
			}
			return { grid, x0, x1, y0, y1 };
		};
		// gölgenin bir yatay çizgisindeki ışık aralıkları (gölgenin içinde kalan boşluklar)
		const gaps = (grid, row) => {
			let first = -1, last = -1;
			for (let x = 0; x < GW; x++) if (grid[row * GW + x]) { if (first < 0) first = x; last = x; }
			let n = 0;
			for (let x = first + 1; x <= last; x++) if (!grid[row * GW + x] && grid[row * GW + x - 1]) n++;
			return n;
		};
		const maxGaps = (sh) => {
			let best = 0;
			for (let r = 0; r < GH; r += 2) best = Math.max(best, gaps(sh.grid, r));
			return best;
		};
		for (const u of [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]) {
			const sh = shade(u);
			ok(sh.x0 > -CW / 2 + 0.05 && sh.x1 < CW / 2 - 0.05 && sh.y0 > -CH / 2 + 0.05 && sh.y1 < CH / 2 - 0.05, q.id + ': gölge perdeye sığmıyor (u ' + u + ': ' + [sh.x0, sh.x1, sh.y0, sh.y1].map((x) => x.toFixed(2)) + ')');
		}
		const g0 = maxGaps(shade(0));
		const g1 = maxGaps(shade(1));
		const area = (sh) => sh.grid.reduce((a, b) => a + b, 0) / (GW * GH);
		ok(g0 <= 2, q.id + ': başta gölge tanınmaz olmalı (sütun aralığı ' + g0 + ')');
		ok(g1 >= 8, q.id + ': sonda sütun aralıkları görünmeli (' + g1 + ')');
		const a1 = area(shade(1));
		ok(a1 > 0.12 && a1 < 0.5, q.id + ': sondaki gölge perdenin uygun payı değil (' + a1.toFixed(2) + ')');
		console.log('  ' + q.id + ': ' + tris.length + ' gölge üçgeni, aralık başta ' + g0 + ' sonda ' + g1 + ', alan %' + Math.round(a1 * 100));
	}
}
// ışık yolu sürekli (fener sıçramaz)
let jump = 0;
for (let k = 1; k <= 200; k++) {
	const a = lightAt((k - 1) / 200);
	const b = lightAt(k / 200);
	jump = Math.max(jump, Math.abs(b.az - a.az) + Math.abs(b.el - a.el));
}
ok(jump < 0.05, 'ışık yolu sıçrıyor (' + jump.toFixed(3) + ')');
ok(PATH[0][0] === 0 && PATH[PATH.length - 1][0] === 1, 'ışık yolu 0..1');

console.log(checks + ' denetim, ' + fails + ' hata');
process.exitCode = fails ? 1 : 0;
`;

const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'icat-sinama.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'warning' });
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
