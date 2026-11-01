// Yapı işçisi: ayrıntılı (kahraman) maketlerin kurulumu ve ortam örtmesi ana iş parçacığının dışında. Harita
// kaydırılırken ya da kamera filmi akarken yakına gelen yapının modeli burada kurulur; kare hiç beklemez.
// (Eskiden kurulum ana iş parçacığında ~10 ms dilimlerle arka arkaya koşuyordu: büyük yapılarda yarım saniye takılma.)
//
// Ana taraf (heroes.js) yapının çevresindeki arazi düğüm yüksekliklerini (harita ızgarası) ve yakın illerin
// çokgenlerini gönderir; işçi landmarks.js'in kit.hf'ini ve board.pick'ini birebir aynı hesapla yeniden kurar.
// İleti: { id, kind, site, tone, seg, minPart?, cluster?, grid: { st, gx0, gy0, nx, ny, h }, provs: [{ index, box, rings }] }
//      → { id, ok, n, tris, ms, pos, nor, col, info, pat } (diziler aktarılır)
import { HKit } from './herokit.js';
import { HEROES } from './hero_index.js';

function inPoly(x, y, flat) {
	let inside = false;
	const n = flat.length / 2;
	for (let i = 0, j = n - 1; i < n; j = i++) {
		const xi = flat[i * 2];
		const yi = flat[i * 2 + 1];
		const xj = flat[j * 2];
		const yj = flat[j * 2 + 1];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

self.onmessage = (e) => {
	const m = e.data;
	const t0 = performance.now();
	try {
		const { st, gx0, gy0, nx, ny, h } = m.grid;
		const node = (i, j) => {
			const a = Math.min(nx - 1, Math.max(0, i - gx0));
			const b = Math.min(ny - 1, Math.max(0, j - gy0));
			return h[b * nx + a];
		};
		// landmarks.js gridHeight ile aynı: harita ağı düğümleri arasında çift doğrusal
		const hf = (x, z) => {
			const y = -z;
			const gx = Math.floor(x / st);
			const gy = Math.floor(y / st);
			const fx = x / st - gx;
			const fy = y / st - gy;
			const a = node(gx, gy) + (node(gx + 1, gy) - node(gx, gy)) * fx;
			const b = node(gx, gy + 1) + (node(gx + 1, gy + 1) - node(gx, gy + 1)) * fx;
			return a + (b - a) * fy;
		};
		// board.pick ile aynı: illerin sırasıyla kutu + çokgen sınaması
		const pick = (x, z) => {
			const y = -z;
			for (const p of m.provs) {
				const b = p.box;
				if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) continue;
				for (const r of p.rings) if (inPoly(x, y, r)) return p.index;
			}
			return -1;
		};
		const site = m.site;
		const k = new HKit();
		k.seg = m.seg;
		// uzak sürüm (landmarks.js): küçük parça eşiği ve köşe kümeleme (yapı ölçeği cinsinden)
		k.minPart = (m.minPart || 0) * site.s;
		k.hi = true;
		k.hf = hf;
		k.site = { x: site.x, y: site.y, z: site.z, s: site.s, ry: site.ry };
		k.tone = { r: m.tone[0], g: m.tone[1], b: m.tone[2], clone() { return { ...this }; } };
		k.inv = 1 / site.s;
		k.tagAt = (tx, tz) => {
			const i = pick(tx, tz);
			return i >= 0 ? i : site.index;
		};
		k.setTag(site.index);
		k.base(site.y, 1 / site.s);
		let s = 1;
		for (const ch of m.kind) s = (s * 31 + ch.charCodeAt(0)) % 2147483647;
		const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
		k.push().move(site.x, site.y, site.z).rot(0, site.ry, 0).scale(site.s);
		const it = HEROES[m.kind](k, R);
		if (it && typeof it.next === 'function') while (!it.next().done);
		k.pop();
		if (m.cluster) k.cluster(m.cluster * site.s);
		const g = k.buildHero('sync');
		const A = (n) => g.getAttribute(n).array;
		const out = { id: m.id, ok: true, n: k.count, tris: k.count / 3, ms: Math.round(performance.now() - t0), pos: A('position'), nor: A('normal'), col: A('col'), info: A('info'), pat: A('pat') };
		self.postMessage(out, [out.pos.buffer, out.nor.buffer, out.col.buffer, out.info.buffer, out.pat.buffer]);
	} catch (err) {
		self.postMessage({ id: m.id, ok: false, err: String(err && err.message) });
	}
};
