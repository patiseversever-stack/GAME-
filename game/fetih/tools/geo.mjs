// Harita verisi üretici: Natural Earth (kamu malı) il ve ülke sınırlarından oyunun kullandığı
// sade Türkiye haritasını çıkarır → src/data/turkiye.json
//
//   Ham veri (bir kez indirilir, depoya girmez):
//     curl -L -o raw/adm1.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
//     curl -L -o raw/adm0.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
//     (ikisinden Türkiye illeri raw/tur.geojson, komşu ülkeler raw/nb.geojson olarak ayıklanır)
//   node tools/geo.mjs
//
// Çıktı birimi: 1 enlem derecesi = K birim. x doğuya, y kuzeye.

import { readFileSync, writeFileSync } from 'node:fs';

const K = 6;
const LON0 = 35.2;
const LAT0 = 39.0;
const COS0 = Math.cos((LAT0 * Math.PI) / 180);
const proj = ([lon, lat]) => [(lon - LON0) * COS0 * K, (lat - LAT0) * K];

// plaka → [ad, bölge]
const IL = {
	1: ['Adana', 'akdeniz'], 2: ['Adıyaman', 'guneydogu'], 3: ['Afyonkarahisar', 'ege'], 4: ['Ağrı', 'dogu'],
	5: ['Amasya', 'karadeniz'], 6: ['Ankara', 'icanadolu'], 7: ['Antalya', 'akdeniz'], 8: ['Artvin', 'karadeniz'],
	9: ['Aydın', 'ege'], 10: ['Balıkesir', 'marmara'], 11: ['Bilecik', 'marmara'], 12: ['Bingöl', 'dogu'],
	13: ['Bitlis', 'dogu'], 14: ['Bolu', 'karadeniz'], 15: ['Burdur', 'akdeniz'], 16: ['Bursa', 'marmara'],
	17: ['Çanakkale', 'marmara'], 18: ['Çankırı', 'icanadolu'], 19: ['Çorum', 'karadeniz'], 20: ['Denizli', 'ege'],
	21: ['Diyarbakır', 'guneydogu'], 22: ['Edirne', 'marmara'], 23: ['Elazığ', 'dogu'], 24: ['Erzincan', 'dogu'],
	25: ['Erzurum', 'dogu'], 26: ['Eskişehir', 'icanadolu'], 27: ['Gaziantep', 'guneydogu'], 28: ['Giresun', 'karadeniz'],
	29: ['Gümüşhane', 'karadeniz'], 30: ['Hakkari', 'dogu'], 31: ['Hatay', 'akdeniz'], 32: ['Isparta', 'akdeniz'],
	33: ['Mersin', 'akdeniz'], 34: ['İstanbul', 'marmara'], 35: ['İzmir', 'ege'], 36: ['Kars', 'dogu'],
	37: ['Kastamonu', 'karadeniz'], 38: ['Kayseri', 'icanadolu'], 39: ['Kırklareli', 'marmara'], 40: ['Kırşehir', 'icanadolu'],
	41: ['Kocaeli', 'marmara'], 42: ['Konya', 'icanadolu'], 43: ['Kütahya', 'ege'], 44: ['Malatya', 'dogu'],
	45: ['Manisa', 'ege'], 46: ['Kahramanmaraş', 'akdeniz'], 47: ['Mardin', 'guneydogu'], 48: ['Muğla', 'ege'],
	49: ['Muş', 'dogu'], 50: ['Nevşehir', 'icanadolu'], 51: ['Niğde', 'icanadolu'], 52: ['Ordu', 'karadeniz'],
	53: ['Rize', 'karadeniz'], 54: ['Sakarya', 'marmara'], 55: ['Samsun', 'karadeniz'], 56: ['Siirt', 'guneydogu'],
	57: ['Sinop', 'karadeniz'], 58: ['Sivas', 'icanadolu'], 59: ['Tekirdağ', 'marmara'], 60: ['Tokat', 'karadeniz'],
	61: ['Trabzon', 'karadeniz'], 62: ['Tunceli', 'dogu'], 63: ['Şanlıurfa', 'guneydogu'], 64: ['Uşak', 'ege'],
	65: ['Van', 'dogu'], 66: ['Yozgat', 'icanadolu'], 67: ['Zonguldak', 'karadeniz'], 68: ['Aksaray', 'icanadolu'],
	69: ['Bayburt', 'karadeniz'], 70: ['Karaman', 'icanadolu'], 71: ['Kırıkkale', 'icanadolu'], 72: ['Batman', 'guneydogu'],
	73: ['Şırnak', 'guneydogu'], 74: ['Bartın', 'karadeniz'], 75: ['Ardahan', 'dogu'], 76: ['Iğdır', 'dogu'],
	77: ['Yalova', 'marmara'], 78: ['Karabük', 'karadeniz'], 79: ['Kilis', 'guneydogu'], 80: ['Osmaniye', 'akdeniz'],
	81: ['Düzce', 'karadeniz'],
};

function ringArea(r) {
	let a = 0;
	for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
	return a / 2;
}

// Douglas–Peucker
function simplify(pts, tol) {
	if (pts.length < 4) return pts;
	const keep = new Uint8Array(pts.length);
	keep[0] = keep[pts.length - 1] = 1;
	const stack = [[0, pts.length - 1]];
	while (stack.length) {
		const [a, b] = stack.pop();
		let md = 0;
		let mi = -1;
		const [ax, ay] = pts[a];
		const [bx, by] = pts[b];
		const dx = bx - ax;
		const dy = by - ay;
		const L = Math.hypot(dx, dy) || 1e-9;
		for (let i = a + 1; i < b; i++) {
			const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L;
			if (d > md) {
				md = d;
				mi = i;
			}
		}
		if (md > tol && mi > 0) {
			keep[mi] = 1;
			stack.push([a, mi], [mi, b]);
		}
	}
	return pts.filter((_, i) => keep[i]);
}

function simplifyRing(r, tol) {
	// halkayı en uzak iki noktadan böl, iki yarıyı ayrı sadeleştir (kapalı halkada DP)
	const pts = r.slice(0, -1);
	let far = 0;
	let fd = 0;
	for (let i = 1; i < pts.length; i++) {
		const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2;
		if (d > fd) {
			fd = d;
			far = i;
		}
	}
	const a = simplify(pts.slice(0, far + 1), tol);
	const b = simplify(pts.slice(far).concat([pts[0]]), tol);
	return a.concat(b.slice(1, -1));
}

function pointInRing(x, y, r) {
	let inside = false;
	for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
		const [xi, yi] = r[i];
		const [xj, yj] = r[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

function distToRing(x, y, r) {
	let md = Infinity;
	for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
		const [ax, ay] = r[j];
		const [bx, by] = r[i];
		const dx = bx - ax;
		const dy = by - ay;
		const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1e-9)));
		md = Math.min(md, Math.hypot(x - ax - dx * t, y - ay - dy * t));
	}
	return md;
}

/** Kale ve yazı noktası: halkanın içinde, kenarlardan en uzak nokta (ızgara araması + inceltme). */
function labelPoint(r) {
	let minx = Infinity;
	let miny = Infinity;
	let maxx = -Infinity;
	let maxy = -Infinity;
	for (const [x, y] of r) {
		minx = Math.min(minx, x);
		miny = Math.min(miny, y);
		maxx = Math.max(maxx, x);
		maxy = Math.max(maxy, y);
	}
	let best = [(minx + maxx) / 2, (miny + maxy) / 2];
	let bd = -1;
	let step = Math.max(maxx - minx, maxy - miny) / 24;
	let cx = best[0];
	let cy = best[1];
	let span = Math.max(maxx - minx, maxy - miny);
	for (let pass = 0; pass < 4; pass++) {
		for (let x = cx - span / 2; x <= cx + span / 2; x += step)
			for (let y = cy - span / 2; y <= cy + span / 2; y += step) {
				if (!pointInRing(x, y, r)) continue;
				const d = distToRing(x, y, r);
				if (d > bd) {
					bd = d;
					best = [x, y];
				}
			}
		cx = best[0];
		cy = best[1];
		span = step * 3;
		step /= 4;
	}
	return { p: best, r: bd };
}

// Sutherland–Hodgman: halkayı dikdörtgene kırp
function clipRing(r, x0, y0, x1, y1) {
	const edges = [
		(p) => p[0] >= x0,
		(p) => p[0] <= x1,
		(p) => p[1] >= y0,
		(p) => p[1] <= y1,
	];
	const cut = [
		(a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])],
		(a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])],
		(a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0],
		(a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1],
	];
	let out = r;
	for (let e = 0; e < 4; e++) {
		const inp = out;
		out = [];
		for (let i = 0; i < inp.length; i++) {
			const a = inp[(i + inp.length - 1) % inp.length];
			const b = inp[i];
			const ia = edges[e](a);
			const ib = edges[e](b);
			if (ib) {
				if (!ia) out.push(cut[e](a, b));
				out.push(b);
			} else if (ia) out.push(cut[e](a, b));
		}
		if (!out.length) break;
	}
	return out;
}

const polysOf = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
const round = (v) => Math.round(v * 1000) / 1000;
const flat = (r) => r.flatMap(([x, y]) => [round(x), round(y)]);

// ------------------------------------------------------------------ iller
const tur = JSON.parse(readFileSync('raw/tur.geojson', 'utf8'));
const provinces = [];
const keyOwners = new Map(); // ham köşe → iller (komşuluk)
for (const f of tur.features) {
	const id = Number(String(f.properties.iso_3166_2).split('-')[1]);
	const [name, region] = IL[id];
	const rings = [];
	let main = null;
	let mainA = 0;
	for (const poly of polysOf(f.geometry)) {
		const outer = poly[0];
		for (const c of outer) {
			const k = `${c[0].toFixed(4)},${c[1].toFixed(4)}`;
			if (!keyOwners.has(k)) keyOwners.set(k, new Set());
			keyOwners.get(k).add(id);
		}
		const pr = outer.map(proj);
		const A = Math.abs(ringArea(pr));
		if (A < 0.12) continue; // çok küçük adacıklar
		let s = simplifyRing(pr, 0.05);
		if (ringArea(s) < 0) s = s.reverse(); // saat yönünün tersi
		rings.push(s);
		if (A > mainA) {
			mainA = A;
			main = s;
		}
	}
	const lp = labelPoint(main);
	provinces.push({ id, name, region, rings, center: lp.p, inner: lp.r, area: mainA, nb: new Set() });
}
// komşuluk: en az iki ortak ham köşe
const pairCount = new Map();
for (const owners of keyOwners.values()) {
	if (owners.size < 2) continue;
	const ids = [...owners];
	for (let i = 0; i < ids.length; i++)
		for (let j = i + 1; j < ids.length; j++) {
			const k = ids[i] < ids[j] ? `${ids[i]}-${ids[j]}` : `${ids[j]}-${ids[i]}`;
			pairCount.set(k, (pairCount.get(k) || 0) + 1);
		}
}
const byId = new Map(provinces.map((p) => [p.id, p]));
for (const [k, n] of pairCount) {
	if (n < 2) continue;
	const [a, b] = k.split('-').map(Number);
	byId.get(a).nb.add(b);
	byId.get(b).nb.add(a);
}
// boğaz geçişleri: deniz ötesi komşuluklar (oyunda saldırılabilsin)
const SEA = [
	[34, 77], // İstanbul – Yalova
	[17, 59], // Çanakkale – Tekirdağ (Gelibolu karada zaten olabilir)
	[34, 41],
];
for (const [a, b] of SEA) {
	byId.get(a).nb.add(b);
	byId.get(b).nb.add(a);
}

// ------------------------------------------------------------------ komşu ülkeler (yalnızca kara görüntüsü)
const nb = JSON.parse(readFileSync('raw/nb.geojson', 'utf8'));
const land = [];
const SKIP = new Set(['USA', 'FRA']);
for (const f of nb.features) {
	if (SKIP.has(f.properties.a3)) continue;
	for (const poly of polysOf(f.geometry)) {
		const pr = poly[0].map(proj);
		const cl = clipRing(pr, -85, -48, 85, 48);
		if (cl.length < 3) continue;
		const A = Math.abs(ringArea(cl));
		if (A < 0.3) continue;
		let s = simplifyRing(cl.concat([cl[0]]), 0.12);
		if (s.length < 3) continue;
		if (ringArea(s) < 0) s = s.reverse();
		land.push(flat(s));
	}
}

const out = {
	meta: { K, lon0: LON0, lat0: LAT0, source: 'Natural Earth (public domain)' },
	provinces: provinces
		.sort((a, b) => a.id - b.id)
		.map((p) => ({ id: p.id, name: p.name, region: p.region, center: p.center.map(round), inner: round(p.inner), area: round(p.area), nb: [...p.nb].sort((a, b) => a - b), rings: p.rings.map(flat) })),
	land,
};
writeFileSync('src/data/turkiye.json', JSON.stringify(out));
const pts = out.provinces.reduce((s, p) => s + p.rings.reduce((t, r) => t + r.length / 2, 0), 0);
console.log(`iller: ${out.provinces.length}, köşe: ${pts}, kara parçası: ${land.length}, boyut: ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);
const lonely = out.provinces.filter((p) => !p.nb.length).map((p) => p.name);
console.log('komşusuz:', lonely.join(', ') || 'yok');
console.log('örnek komşular: İstanbul', out.provinces[33].nb, ' Ankara', out.provinces[5].nb);
