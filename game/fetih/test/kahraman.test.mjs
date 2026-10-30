// Kahraman maketler: her yapıcı hatasız kurulur, üçgen bütçesine (≤ 60k; kademe 0'da ≤ 45k) sığar, kurulum
// süresi ölçülür. Arazi yerine düz zemin (node'da tahta yok).
//   node test/kahraman.test.mjs [--kinds=selimiye,galata] [--q=0]
import { HKit } from '../src/map/heroes.js';
import { HEROES } from '../src/map/hero_index.js';
import * as THREE from 'three';

const opt = Object.fromEntries(process.argv.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const kinds = opt.kinds ? opt.kinds.split(',') : Object.keys(HEROES);
let fail = 0;
const ok = (c, m) => {
	if (!c) {
		fail++;
		console.log('HATA ' + m);
	}
};
const rows = [];
for (const q of opt.q ? [Number(opt.q)] : [0, 2]) {
	for (const kind of kinds) {
		const k = new HKit();
		k.seg = q === 0 ? 0.75 : 1;
		k.hi = true;
		k.hf = (x, z) => 0.5 + Math.sin(x * 0.7) * 0.05 + Math.cos(z * 0.9) * 0.05;
		const sc = 2;
		k.site = { x: 3, y: 0.5, z: -2, s: sc, ry: 0.2 };
		k.tone = new THREE.Color(0.3, 0.45, 0.2);
		k.inv = 1 / sc;
		k.tagAt = () => 5;
		k.setTag(5);
		k.base(0.5, 1 / sc);
		let s = 7;
		const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
		const t0 = performance.now();
		k.push().move(3, 0.5, -2).rot(0, 0.2, 0).scale(sc);
		try {
			const it = HEROES[kind](k, R);
			if (it && typeof it.next === 'function') while (!it.next().done);
		} catch (e) {
			ok(false, `${kind}: kurulamadı: ${e.stack}`);
			continue;
		}
		k.pop();
		const t1 = performance.now();
		const g = k.buildHero('sync');
		const t2 = performance.now();
		const tris = k.count / 3;
		ok(Number.isInteger(tris), `${kind}: köşe sayısı 3'ün katı değil`);
		ok(k.U.n === k.count * 2 && k.I.n === k.count * 4, `${kind}: desen/bilgi tamponu eksik`);
		ok(tris <= (q === 0 ? 45000 : 60000), `${kind}: q${q} ${tris} üçgen (bütçe aşıldı)`);
		const p = g.getAttribute('position').array;
		let bad = 0;
		for (let i = 0; i < p.length; i++) if (!Number.isFinite(p[i])) bad++;
		ok(bad === 0, `${kind}: ${bad} geçersiz konum`);
		rows.push(`q${q} ${kind.padEnd(14)} ${String(tris).padStart(6)} üçgen  yapım ${Math.round(t1 - t0)} ms  örtme ${Math.round(t2 - t1)} ms`);
	}
}
console.log(rows.join('\n'));
console.log(fail ? `${fail} HATA` : `kahraman maketler: ${kinds.length} yapı temiz`);
process.exit(fail ? 1 : 0);
