// Harita verisi üretici: Natural Earth (kamu malı) il, ülke, göl ve nehir katmanlarından oyunun
// kullandığı minyatür Türkiye haritasını çıkarır.
//
//   Ham veri (bir kez indirilir, depoya girmez; hepsi aynı klasöre):
//     BASE=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson
//     curl -L -o raw/adm1.geojson   $BASE/ne_10m_admin_1_states_provinces.geojson
//     (Türkiye illeri adm1'den raw/tur.geojson olarak ayıklanır: iso_a2 == 'TR')
//     curl -L -o raw/ne_10m_admin_0_countries.geojson        $BASE/ne_10m_admin_0_countries.geojson
//     curl -L -o raw/ne_10m_lakes.geojson                    $BASE/ne_10m_lakes.geojson
//     curl -L -o raw/ne_10m_lakes_europe.geojson             $BASE/ne_10m_lakes_europe.geojson
//     curl -L -o raw/ne_10m_rivers_lake_centerlines.geojson  $BASE/ne_10m_rivers_lake_centerlines.geojson
//     curl -L -o raw/ne_10m_rivers_europe.geojson            $BASE/ne_10m_rivers_europe.geojson
//   node tools/geo.mjs [ham-klasör]
//
// Çıktılar:
//   src/data/turkiye.json : il çokgenleri (komşularla ortak köşeli, kıyıları yumuşatılmış), komşuluk,
//                           merkez, sınır yayları (sol/sağ il), komşu ülkeler, göller, nehirler
//   src/data/relief.json  : yükselti + doğa ızgarası (yükseklik, orman, yeşillik, dağlık, göl)
//
// Topoloji: iki ilin ortak sınırı tek bir "yay" olarak saklanır ve iki il de aynı noktaları kullanır.
// Böylece haritada iller arasında boşluk ya da üst üste binme olmaz; sınır çizgileri bu yaylardan çizilir.
//
// Yükselti: Natural Earth'te sayısal yükselti modeli yok. Ana dağ sıraları (Toroslar, Kuzey Anadolu,
// Kaçkar…), volkanlar (Ağrı, Erciyes, Süphan, Hasan…) ve il merkezlerinin gerçek yükseltileri elle
// girildi; aralar yumuşak ara değerleme ile doldurulur. Sonuç minyatür maket için abartılmış ama
// coğrafyaya sadık bir kabartmadır (Doğu yüksek, kıyılar alçak).
//
// Çıktı birimi: 1 enlem derecesi = K birim. x doğuya, y kuzeye (oyunda z = -y).

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RAW = process.argv[2] || 'raw';
const K = 6;
const LON0 = 35.2;
const LAT0 = 39.0;
const COS0 = Math.cos((LAT0 * Math.PI) / 180);
const proj = ([lon, lat]) => [(lon - LON0) * COS0 * K, (lat - LAT0) * K];
const KM = K / 111.2; // 1 km kaç birim

const read = (f) => JSON.parse(readFileSync(join(RAW, f), 'utf8'));

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

// ------------------------------------------------------------------ geometri yardımcıları

function ringArea(r) {
	let a = 0;
	for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
	return -a / 2; // saat yönünün tersi pozitif
}

// Douglas–Peucker (uçlar sabit)
function simplify(pts, tol) {
	if (pts.length < 3 || tol <= 0) return pts;
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
		const L2 = dx * dx + dy * dy;
		for (let i = a + 1; i < b; i++) {
			let d;
			if (L2 < 1e-12) d = Math.hypot(pts[i][0] - ax, pts[i][1] - ay);
			else d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / Math.sqrt(L2);
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

// Chaikin köşe kesme (açık yayda uçlar sabit)
function chaikin(pts, closed) {
	const out = [];
	const n = pts.length;
	if (closed) {
		for (let i = 0; i < n; i++) {
			const a = pts[i];
			const b = pts[(i + 1) % n];
			out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
		}
		return out;
	}
	out.push(pts[0]);
	for (let i = 0; i < n - 1; i++) {
		const a = pts[i];
		const b = pts[i + 1];
		if (i > 0) out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
		if (i < n - 2) out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
	}
	out.push(pts[n - 1]);
	return out;
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

function segDist(x, y, ax, ay, bx, by) {
	const dx = bx - ax;
	const dy = by - ay;
	const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1e-12)));
	return Math.hypot(x - ax - dx * t, y - ay - dy * t);
}

function distToRing(x, y, r) {
	let md = Infinity;
	for (let i = 0, j = r.length - 1; i < r.length; j = i++) md = Math.min(md, segDist(x, y, r[j][0], r[j][1], r[i][0], r[i][1]));
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
	const edges = [(p) => p[0] >= x0, (p) => p[0] <= x1, (p) => p[1] >= y0, (p) => p[1] <= y1];
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
const linesOf = (g) => (g.type === 'LineString' ? [g.coordinates] : g.coordinates);
const round = (v) => Math.round(v * 1000) / 1000;
const flat = (r) => r.flatMap(([x, y]) => [round(x), round(y)]);

/** Kovalı parça dizini: noktaya yakın doğru parçalarını hızlı bulmak için. */
class SegIndex {
	constructor(cell = 1) {
		this.cell = cell;
		this.map = new Map();
		this.segs = [];
	}
	add(ax, ay, bx, by, tag = 0) {
		const i = this.segs.length;
		this.segs.push([ax, ay, bx, by, tag]);
		const c = this.cell;
		const x0 = Math.floor(Math.min(ax, bx) / c);
		const x1 = Math.floor(Math.max(ax, bx) / c);
		const y0 = Math.floor(Math.min(ay, by) / c);
		const y1 = Math.floor(Math.max(ay, by) / c);
		for (let X = x0; X <= x1; X++)
			for (let Y = y0; Y <= y1; Y++) {
				const k = X * 100000 + Y;
				let l = this.map.get(k);
				if (!l) this.map.set(k, (l = []));
				l.push(i);
			}
	}
	/** En yakın parçaya uzaklık (en çok R; bulamazsa R) ve parçanın etiketi. */
	near(x, y, R) {
		const c = this.cell;
		const n = Math.ceil(R / c);
		const X = Math.floor(x / c);
		const Y = Math.floor(y / c);
		let md = R;
		let tag = -1;
		let si = -1;
		for (let i = -n; i <= n; i++)
			for (let j = -n; j <= n; j++) {
				const l = this.map.get((X + i) * 100000 + (Y + j));
				if (!l) continue;
				for (const s of l) {
					const g = this.segs[s];
					const d = segDist(x, y, g[0], g[1], g[2], g[3]);
					if (d < md) {
						md = d;
						tag = g[4];
						si = s;
					}
				}
			}
		return { d: md, tag, seg: si };
	}
}

// ------------------------------------------------------------------ 1) şekiller: iller + komşu ülkeler

const tur = read('tur.geojson');
const adm0 = read('ne_10m_admin_0_countries.geojson');
const NB_A3 = new Set(['GRC', 'BGR', 'GEO', 'ARM', 'AZE', 'IRN', 'IRQ', 'SYR', 'CYP', 'CYN', 'LBN', 'ISR', 'PSX', 'JOR', 'RUS', 'UKR', 'ROU', 'MKD', 'SRB', 'ALB', 'EGY', 'SAU', 'KWT', 'MDA', 'KOS', 'MNE']);
const CLIP_LL = [17.2, 31.2, 53.2, 46.8]; // lon0, lat0, lon1, lat1

const shapes = []; // {owner, rings: [[ [lon,lat], ... ]]}  owner: plaka (1..81) ya da 1000+ (komşu)
for (const f of tur.features) {
	const id = Number(String(f.properties.iso_3166_2).split('-')[1]);
	const rings = [];
	for (const poly of polysOf(f.geometry)) {
		const ring = poly[0].slice(0, -1);
		const A = Math.abs(ringArea(ring.map(proj)));
		if (A < 0.07) continue; // çok küçük adacıklar
		rings.push(ring);
	}
	shapes.push({ owner: id, rings });
}
let nbIndex = 1000;
const nbNames = {};
for (const f of adm0.features) {
	const a3 = f.properties.ADM0_A3;
	if (!NB_A3.has(a3)) continue;
	const owner = nbIndex++;
	nbNames[owner] = a3;
	const rings = [];
	for (const poly of polysOf(f.geometry)) {
		let ring = poly[0].slice(0, -1);
		const cl = clipRing(ring, ...CLIP_LL);
		if (cl.length < 3) continue;
		if (cl.length !== ring.length) ring = cl; // kırpılan halkada yeni köşeler var (paylaşılmaz)
		const A = Math.abs(ringArea(ring.map(proj)));
		if (A < 0.12) continue;
		rings.push(ring);
	}
	if (rings.length) shapes.push({ owner, rings });
}

// halkaları saat yönünün tersine çevir (iç taraf solda)
for (const s of shapes) for (let i = 0; i < s.rings.length; i++) if (ringArea(s.rings[i].map(proj)) < 0) s.rings[i] = s.rings[i].reverse();

// ------------------------------------------------------------------ 2) topoloji: ortak yaylar

const vkey = (c) => `${c[0]},${c[1]}`;
const edgeOwners = new Map(); // "a|b" (sıralı) → Set(owner)
const ekey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
for (const s of shapes)
	for (const r of s.rings)
		for (let i = 0; i < r.length; i++) {
			const k = ekey(vkey(r[i]), vkey(r[(i + 1) % r.length]));
			let set = edgeOwners.get(k);
			if (!set) edgeOwners.set(k, (set = new Set()));
			set.add(s.owner);
		}
const sigOf = (a, b) => [...edgeOwners.get(ekey(a, b))].sort((x, y) => x - y).join(',');

const arcs = []; // {pts: [[lon,lat]], L, R}  (yürüme yönünde L solda)
const arcByKey = new Map();
const ringArcs = new Map(); // shape → [[{arc, rev}]]

function registerArc(pts, owner) {
	const fw = pts.map(vkey).join(';');
	const bw = pts.slice().reverse().map(vkey).join(';');
	const rev = bw < fw;
	const key = rev ? bw : fw;
	let a = arcByKey.get(key);
	if (!a) {
		a = { pts: rev ? pts.slice().reverse() : pts, L: -1, R: -1, i: arcs.length };
		arcs.push(a);
		arcByKey.set(key, a);
	}
	if (rev) a.R = owner;
	else a.L = owner;
	return { arc: a, rev };
}

for (const s of shapes) {
	const list = [];
	for (const r of s.rings) {
		const n = r.length;
		const keys = r.map(vkey);
		const sig = keys.map((k, i) => sigOf(k, keys[(i + 1) % n])); // i. kenarın sahipleri
		const junction = keys.map((k, i) => sig[(i + n - 1) % n] !== sig[i]);
		const starts = junction.map((j, i) => (j ? i : -1)).filter((i) => i >= 0);
		const refs = [];
		if (!starts.length) {
			// kapalı yay (tamamı tek komşuluk): kanonik başlangıç en küçük anahtar
			let m = 0;
			for (let i = 1; i < n; i++) if (keys[i] < keys[m]) m = i;
			const pts = [];
			for (let i = 0; i <= n; i++) pts.push(r[(m + i) % n]);
			refs.push(registerArc(pts, s.owner));
		} else {
			for (let q = 0; q < starts.length; q++) {
				const a = starts[q];
				const b = starts[(q + 1) % starts.length];
				const pts = [];
				let i = a;
				for (;;) {
					pts.push(r[i]);
					if (i === b && pts.length > 1) break;
					i = (i + 1) % n;
				}
				refs.push(registerArc(pts, s.owner));
			}
		}
		list.push(refs);
	}
	ringArcs.set(s, list);
}

// ------------------------------------------------------------------ 3) yayları sadeleştir ve yumuşat

const isProv = (o) => o >= 1 && o <= 81;
for (const a of arcs) {
	const P = a.pts.map(proj);
	const closed = vkey(a.pts[0]) === vkey(a.pts[a.pts.length - 1]) && a.pts.length > 3;
	const prov = isProv(a.L) || isProv(a.R);
	const coast = prov && (a.L < 0 || a.R < 0); // tek taraf il, öbür taraf deniz
	let q;
	if (prov) {
		q = simplify(P, coast ? 0.012 : 0.02);
		// kıyılar ve sınırlar: bir kez köşe kes (organik çizgi), sonra gereksiz noktaları at
		if (closed) {
			const body = q.slice(0, -1);
			let c = chaikin(body, true);
			if (coast) c = chaikin(c, true);
			c = simplify(c.concat([c[0]]), 0.004);
			q = c;
		} else {
			let c = chaikin(q, false);
			if (coast) c = chaikin(c, false);
			q = simplify(c, 0.004);
		}
	} else {
		// uzak komşu kıyıları: kaba
		const far = Math.min(...P.map(([x, y]) => Math.max(Math.abs(x) - 50, Math.abs(y) - 22, 0)));
		q = simplify(P, far > 0 ? 0.12 : 0.05);
		if (closed && q.length < 4) q = simplify(P, 0.02);
	}
	a.proj = q;
	a.closed = closed;
	a.coast = coast;
}

function buildRing(refs) {
	const out = [];
	for (const { arc, rev } of refs) {
		const p = rev ? arc.proj.slice().reverse() : arc.proj;
		for (let i = 0; i < p.length - 1; i++) out.push(p[i]);
	}
	return out;
}

// ------------------------------------------------------------------ 4) iller

const provinces = [];
for (const s of shapes) {
	if (!isProv(s.owner)) continue;
	const [name, region] = IL[s.owner];
	const rings = ringArcs.get(s).map(buildRing).filter((r) => r.length >= 3 && ringArea(r) > 0.05);
	let main = rings[0];
	let mainA = 0;
	for (const r of rings) {
		const A = ringArea(r);
		if (A > mainA) {
			mainA = A;
			main = r;
		}
	}
	const lp = labelPoint(main);
	provinces.push({ id: s.owner, name, region, rings, center: lp.p, inner: lp.r, area: mainA, nb: new Set() });
}
const byId = new Map(provinces.map((p) => [p.id, p]));
for (const a of arcs) {
	if (isProv(a.L) && isProv(a.R)) {
		byId.get(a.L).nb.add(a.R);
		byId.get(a.R).nb.add(a.L);
	}
}
// boğaz geçişleri: deniz ötesi komşuluklar (oyunda saldırılabilsin)
const SEA = [
	[34, 77], // İstanbul – Yalova
	[17, 59], // Çanakkale – Tekirdağ
	[34, 41],
];
for (const [a, b] of SEA) {
	byId.get(a).nb.add(b);
	byId.get(b).nb.add(a);
}

// sınır yayları (iller için): a sol il, b sağ (0 deniz, -1 yabancı kara)
const borders = [];
for (const a of arcs) {
	if (!isProv(a.L) && !isProv(a.R)) continue;
	let L = a.L;
	let R = a.R;
	let pts = a.proj;
	if (!isProv(L)) {
		// il hep solda olsun
		[L, R] = [R, L];
		pts = pts.slice().reverse();
	}
	borders.push({ a: L, b: isProv(R) ? R : R >= 1000 ? -1 : 0, pts: flat(pts) });
}

// komşu ülke kıyıları (deniz köpüğü ve sığlık için; kara sınırları hariç)
const nbCoast = [];
for (const a of arcs) {
	if (isProv(a.L) || isProv(a.R)) continue;
	if (a.L >= 0 && a.R >= 0) continue;
	const far = Math.min(...a.proj.map(([x, y]) => Math.max(Math.abs(x) - 58, Math.abs(y) - 28, 0)));
	if (far > 2) continue;
	nbCoast.push(flat(a.proj));
}

// komşu ülke halkaları (yalnızca görüntü)
const land = [];
for (const s of shapes) {
	if (isProv(s.owner)) continue;
	for (const refs of ringArcs.get(s)) {
		const r = buildRing(refs);
		if (r.length < 3 || ringArea(r) < 0.25) continue;
		land.push(flat(r));
	}
}

// ------------------------------------------------------------------ 5) göller ve nehirler

const provRings = provinces.flatMap((p) => p.rings.map((r) => ({ r, p })));
const inTurkey = (x, y) => provRings.some(({ r }) => pointInRing(x, y, r));
const provAt = (x, y) => {
	for (const { r, p } of provRings) if (pointInRing(x, y, r)) return p;
	return null;
};

// bilinen göl yüzeyi yükseltileri (m)
const LAKE_LEVEL = {
	'Lake Van': 1640, 'Lake Tuz': 905, 'Beyşehir': 1125, 'Eğirdir': 918, 'Keban Baraji': 845, 'Ataturk Barajt': 542,
	'Saksak Dagi': 693, 'İznik Gölü': 85, 'Kuş Gölü': 15, 'Ulubat Gölü': 7, 'Bafa Gölü': 2, 'Kyceiz Gölü': 1,
	'Çıldır': 1959, 'Sapanca Gölü': 30, 'Akşehir Gölü': 955, 'Burdur Gölü': 845, 'Salda Gölü': 1140, 'Hazar Dagi': 1248,
	'Erçek': 1803, 'Seyfe Gölü': 1110, 'Seyhan Baraji': 67, 'Durusu Golu': 5, 'Marmara Gölü': 79, 'Yay Gölü': 1072,
};
const LAKE_TR = {
	'Lake Van': 'Van Gölü', 'Lake Tuz': 'Tuz Gölü', 'Beyşehir': 'Beyşehir Gölü', 'Eğirdir': 'Eğirdir Gölü', 'Keban Baraji': 'Keban Baraj Gölü',
	'Ataturk Barajt': 'Atatürk Baraj Gölü', 'Saksak Dagi': 'Karakaya Baraj Gölü', 'Kyceiz Gölü': 'Köyceğiz Gölü', 'Hazar Dagi': 'Hazar Gölü',
	'Erçek': 'Erçek Gölü', 'Çıldır': 'Çıldır Gölü', 'Ulubat Gölü': 'Uluabat Gölü', 'Durusu Golu': 'Durusu Gölü', 'Seyhan Baraji': 'Seyhan Baraj Gölü',
};
const lakes = [];
for (const file of ['ne_10m_lakes.geojson', 'ne_10m_lakes_europe.geojson']) {
	for (const f of read(file).features) {
		if (!f.geometry) continue;
		for (const poly of polysOf(f.geometry)) {
			let r = poly[0].slice(0, -1).map(proj);
			if (ringArea(r) < 0) r = r.reverse();
			const A = ringArea(r);
			if (A < 0.035) continue;
			let cx = 0;
			let cy = 0;
			for (const [x, y] of r) {
				cx += x;
				cy += y;
			}
			cx /= r.length;
			cy /= r.length;
			if (!inTurkey(cx, cy)) continue;
			let q = simplify(r.concat([r[0]]), 0.01).slice(0, -1);
			q = chaikin(chaikin(q, true), true);
			q = simplify(q.concat([q[0]]), 0.004).slice(0, -1);
			const raw = f.properties.name || '';
			lakes.push({ name: LAKE_TR[raw] || raw || 'Göl', level: LAKE_LEVEL[raw] ?? null, area: round(A), ring: q });
		}
	}
}
lakes.sort((a, b) => b.area - a.area);

// nehirler: [ad, genişlik çarpanı, eşleşen NE adları (en az biri)]
const RIVERS = [
	['Kızılırmak', 1.0, (p) => /Kiz.?lirmak|Kızılırmak/.test(p.name || '')],
	['Fırat', 1.15, (p) => /^Firat$/.test(p.name || '') || /^Al Furat$/.test(p.name || '')],
	['Dicle', 1.0, (p) => /^Dicle$|^Tigris$/.test(p.name || '')],
	['Sakarya', 0.85, (p) => /Sakarya/.test(p.name || '')],
	['Yeşilırmak', 0.75, (p) => /Yeşilırmak|Kelkit/.test(p.name || '')],
	['Murat', 0.75, (p) => /^Murat$/.test(p.name || '')],
	['Aras', 0.75, (p) => /^Aras$/.test(p.name || '')],
	['Çoruh', 0.7, (p) => /Çoruh/.test(p.name || '')],
	['Ceyhan', 0.7, (p) => /^Ceyhan$/.test(p.name || '')],
	['Seyhan', 0.7, (p) => /^Seyhan$/.test(p.name || '')],
	['Büyük Menderes', 0.65, (p) => /Menderes/.test(p.name || '') && !/Küçük/.test(p.name || '')],
	['Gediz', 0.6, (p) => /^Gediz$/.test(p.name || '')],
	['Meriç', 0.8, (p) => /^Evros$/.test(p.name || '')],
	['Göksu', 0.55, (p) => /Göksu/.test(p.name || '')],
	['Filyos', 0.5, (p) => /Fliyos|Filyos/.test(p.name || '')],
	['Susurluk', 0.55, (p) => /Susurluk|^Simav$/.test(p.name || '')],
	['Porsuk', 0.45, (p) => /^Porsuk$/.test(p.name || '')],
	['Delice', 0.45, (p) => /^Delice$/.test(p.name || '')],
	['Ergene', 0.45, (p) => /^Ergene$/.test(p.name || '')],
];
const riverLines = [];
for (const file of ['ne_10m_rivers_lake_centerlines.geojson', 'ne_10m_rivers_europe.geojson']) {
	for (const f of read(file).features) {
		if (!f.geometry) continue;
		const def = RIVERS.find((d) => d[2](f.properties));
		if (!def) continue;
		for (const line of linesOf(f.geometry)) {
			const P = line.map(proj);
			// yalnızca Türkiye içindeki parçalar (dışarı çıkan uçlar kesilir)
			let cur = [];
			const flush = () => {
				if (cur.length >= 2) riverLines.push({ name: def[0], w: def[1], pts: cur });
				cur = [];
			};
			for (const p of P) {
				if (inTurkey(p[0], p[1])) cur.push(p);
				else flush();
			}
			flush();
		}
	}
}
const rivers = riverLines.map((r) => {
	let q = simplify(r.pts, 0.02);
	q = chaikin(chaikin(q, false), false);
	q = simplify(q, 0.006);
	return { name: r.name, w: r.w, pts: q };
});

// ------------------------------------------------------------------ 6) yükselti modeli

// il merkezleri ve bilinen düzlükler: [boylam, enlem, metre]
const SPOT = [
	// Trakya ve Marmara
	[26.56, 41.68, 42], [27.22, 41.73, 203], [27.51, 40.98, 10], [27.35, 41.4, 60], [27.8, 41.15, 150], [26.63, 40.85, 270], [28.97, 41.0, 90],
	[29.06, 40.19, 155], [27.88, 39.65, 139], [26.41, 40.15, 10], [29.98, 40.14, 500], [30.4, 40.78, 31], [29.92, 40.77, 10], [27.97, 40.35, 30],
	[28.16, 39.9, 120], [30.04, 39.9, 754], [29.51, 40.08, 300], [29.27, 40.66, 10], [26.7, 40.4, 50], [27.0, 39.95, 200], [28.5, 40.4, 20],
	// Ege
	[27.14, 38.42, 2], [27.43, 38.61, 70], [27.84, 37.85, 65], [29.09, 37.78, 350], [28.36, 37.21, 660], [29.4, 38.68, 900], [29.98, 39.42, 950],
	[30.54, 38.76, 1030], [27.37, 38.17, 90], [28.14, 38.48, 110], [28.51, 38.35, 190], [28.36, 37.93, 70], [29.06, 37.92, 160], [27.42, 37.04, 20],
	[28.27, 36.85, 10], [29.12, 36.62, 10], [29.74, 38.3, 840], [30.16, 38.07, 860], [31.05, 38.71, 1020], [26.85, 39.1, 30], [27.18, 39.12, 70],
	[28.12, 39.27, 300], [28.98, 38.95, 800], [27.98, 38.73, 120], [28.84, 39.39, 650], [28.9, 37.45, 700], [27.3, 37.75, 20], [29.62, 37.4, 1000],
	// Akdeniz
	[30.7, 36.9, 30], [30.55, 37.76, 1050], [30.29, 37.72, 950], [34.63, 36.8, 10], [35.32, 37.0, 23], [36.16, 36.2, 90], [36.25, 37.07, 120],
	[36.93, 37.58, 568], [31.44, 36.78, 20], [32.0, 36.55, 10], [32.84, 36.08, 20], [33.93, 36.38, 50], [29.64, 36.2, 10], [32.89, 36.64, 1200],
	[36.17, 36.59, 10], [36.57, 36.27, 150], [35.82, 37.02, 30], [36.1, 37.37, 100], [34.9, 36.9, 60], [35.6, 36.85, 10], [30.95, 37.2, 300],
	[31.6, 37.0, 50], [33.55, 36.65, 200],
	// İç Anadolu
	[32.86, 39.93, 938], [32.48, 37.87, 1016], [30.52, 39.78, 790], [35.48, 38.73, 1054], [37.02, 39.75, 1278], [34.8, 39.82, 1300],
	[34.16, 39.15, 985], [34.71, 38.62, 1150], [34.68, 37.97, 1229], [34.03, 38.37, 980], [33.22, 37.18, 1033], [33.51, 39.85, 750],
	[33.62, 40.6, 750], [33.4, 38.75, 905], [32.15, 39.58, 850], [32.93, 38.66, 960], [32.21, 38.24, 1100], [31.42, 38.36, 1050], [34.05, 37.51, 1050],
	[36.41, 39.35, 1250], [35.25, 39.2, 1050], [36.39, 38.72, 1500], [31.54, 39.45, 1070], [32.65, 40.47, 950], [33.9, 39.0, 1000], [33.0, 39.2, 1150],
	[32.0, 38.8, 1000], [33.7, 38.0, 1000], [36.0, 38.3, 1300], [37.3, 39.0, 1600], [35.8, 40.0, 1100],
	// Karadeniz
	[36.33, 41.29, 4], [39.72, 41.0, 30], [40.52, 41.02, 10], [41.82, 41.18, 500], [38.39, 40.91, 10], [37.88, 40.98, 10], [35.15, 42.03, 10],
	[33.78, 41.38, 800], [31.79, 41.45, 10], [31.61, 40.74, 725], [31.16, 40.84, 160], [32.62, 41.2, 300], [32.34, 41.63, 30], [34.95, 40.55, 800],
	[35.83, 40.65, 410], [36.55, 40.31, 620], [39.48, 40.46, 1210], [40.22, 40.26, 1550], [35.95, 41.55, 5], [36.67, 41.2, 5], [33.76, 41.98, 10],
	[33.0, 41.89, 10], [34.77, 41.47, 300], [36.96, 40.59, 350], [38.42, 40.29, 1350], [38.08, 40.16, 1150], [39.43, 40.13, 1400], [40.99, 40.48, 1200],
	[42.0, 40.54, 1300], [36.57, 40.69, 220], [37.33, 40.39, 500], [34.0, 40.9, 900], [32.0, 41.2, 400], [37.4, 40.95, 400], [39.0, 40.75, 1200],
	[40.0, 40.8, 1400], [41.3, 41.1, 600],
	// Doğu
	[41.27, 39.9, 1900], [43.1, 40.6, 1768], [42.7, 41.11, 1830], [43.05, 39.72, 1640], [44.04, 39.92, 850], [43.38, 38.5, 1727], [41.5, 38.75, 1350],
	[42.11, 38.4, 1545], [40.5, 38.88, 1150], [39.55, 39.1, 980], [39.22, 38.67, 1067], [38.31, 38.35, 964], [39.49, 39.75, 1185], [43.74, 37.57, 1720],
	[44.08, 39.55, 1600], [43.13, 40.15, 1300], [42.86, 39.23, 1650], [43.72, 38.99, 1700], [42.17, 40.04, 1600], [44.02, 38.05, 2300],
	[40.39, 39.78, 1450], [38.5, 39.26, 900], [38.74, 38.79, 800], [37.5, 38.55, 1100], [42.6, 38.75, 1700], [41.9, 39.5, 1750], [43.6, 40.25, 1800],
	[42.6, 40.6, 2000], [40.8, 39.3, 1700], [44.5, 38.6, 2000],
	// Güneydoğu
	[37.38, 37.07, 850], [38.79, 37.16, 518], [40.24, 37.91, 670], [40.74, 37.31, 1083], [41.13, 37.88, 540], [41.94, 37.93, 900], [42.46, 37.52, 1400],
	[38.28, 37.76, 670], [37.12, 36.72, 650], [39.03, 36.86, 375], [40.05, 36.85, 360], [41.2, 37.07, 470], [42.19, 37.33, 380], [37.98, 37.03, 400],
	[39.32, 37.75, 800], [39.75, 38.27, 1000], [41.34, 37.42, 1000], [41.9, 37.35, 800], [40.6, 37.1, 450], [38.0, 37.5, 700], [39.2, 38.0, 600],
	[40.9, 38.1, 800],
];

// dağ sıraları: her nokta [boylam, enlem, sırt yüksekliği m, yarı genişlik km]
const RANGES = [
	['Istranca', [[27.05, 41.95, 900, 22], [27.6, 41.83, 1000, 22], [28.1, 41.45, 650, 18]]],
	['Kaz Dağı', [[26.3, 39.55, 1100, 16], [26.85, 39.7, 1750, 20], [27.3, 39.8, 1200, 18]]],
	['Biga', [[26.9, 40.15, 800, 24], [27.5, 40.1, 850, 24]]],
	['Uludağ', [[28.8, 40.02, 1600, 18], [29.2, 40.07, 2450, 22], [29.6, 39.98, 1800, 20]]],
	['Samanlı', [[29.1, 40.6, 1000, 12], [29.6, 40.62, 1400, 14], [30.2, 40.55, 1300, 14]]],
	['Domaniç-Türkmen', [[29.45, 39.75, 1600, 18], [30.2, 39.3, 1750, 18], [30.8, 39.0, 1700, 16], [31.3, 38.9, 1900, 16]]],
	['Murat Dağı', [[29.45, 38.75, 1800, 16], [29.7, 38.95, 2300, 18], [29.85, 39.2, 1800, 15]]],
	['Şaphane', [[28.9, 39.15, 1700, 14], [29.25, 39.15, 1950, 14]]],
	['Bozdağlar', [[27.5, 38.4, 1300, 18], [28.0, 38.33, 2150, 20], [28.6, 38.4, 1800, 18], [29.0, 38.5, 1500, 15]]],
	['Aydın Dağları', [[27.4, 38.05, 1200, 14], [27.9, 38.07, 1750, 16], [28.5, 38.0, 1600, 14]]],
	['Menteşe', [[27.7, 37.35, 1200, 20], [28.2, 37.2, 1500, 24], [28.7, 37.05, 2250, 22], [29.2, 36.8, 2000, 22]]],
	['Teke', [[29.1, 36.55, 1900, 14], [29.55, 36.55, 3000, 20], [29.9, 36.7, 2600, 18]]],
	['Beydağları', [[30.1, 36.45, 2600, 16], [30.2, 36.65, 3070, 18], [30.35, 37.05, 2600, 18], [30.5, 37.35, 2400, 16]]],
	['Davraz', [[30.6, 37.7, 2600, 14], [30.9, 37.9, 2200, 14]]],
	['Honaz', [[29.25, 37.65, 2500, 12], [29.5, 37.4, 2300, 14], [29.8, 37.1, 2200, 16]]],
	['Sultan Dağları', [[30.9, 38.65, 2200, 15], [31.3, 38.3, 2600, 16], [31.7, 38.0, 2400, 15]]],
	['Orta Toroslar', [[31.0, 37.25, 2400, 25], [31.5, 37.0, 2500, 30], [32.0, 36.88, 2800, 32], [32.5, 36.75, 2300, 30], [33.0, 36.8, 2100, 30], [33.5, 36.95, 2200, 30], [34.0, 37.15, 2600, 30], [34.5, 37.37, 3450, 28], [34.9, 37.55, 3000, 25], [35.2, 37.8, 3750, 20], [35.5, 38.0, 3000, 22]]],
	['Binboğa', [[35.6, 38.1, 2800, 22], [36.1, 38.25, 2950, 22], [36.6, 38.4, 2600, 20], [37.2, 38.55, 2300, 20]]],
	['Nur Dağları', [[35.95, 36.15, 1500, 12], [36.15, 36.55, 2000, 14], [36.4, 37.0, 2250, 14], [36.6, 37.35, 1800, 12]]],
	['Güneydoğu Toroslar', [[36.9, 37.75, 2200, 22], [37.5, 37.95, 2500, 25], [38.2, 38.15, 2600, 25], [38.9, 38.35, 2500, 25], [39.5, 38.45, 2300, 25], [40.2, 38.55, 2500, 25], [40.9, 38.45, 2700, 25], [41.6, 38.35, 3000, 25], [42.2, 38.2, 3100, 25], [42.8, 37.95, 3300, 25], [43.3, 37.65, 3600, 25], [43.8, 37.45, 4100, 22], [44.3, 37.35, 3500, 20]]],
	['Mardin Eşiği', [[39.7, 37.45, 1100, 9], [40.4, 37.35, 1200, 10], [41.2, 37.35, 1150, 10], [41.8, 37.4, 1000, 10]]],
	['Köroğlu', [[30.9, 40.6, 1700, 18], [31.6, 40.55, 2350, 20], [32.3, 40.6, 2000, 18], [32.9, 40.75, 1700, 15]]],
	['Bolu Dağları', [[30.7, 40.85, 1500, 14], [31.4, 40.88, 1750, 15]]],
	['Küre', [[32.4, 41.6, 1200, 15], [33.0, 41.72, 1400, 15], [33.7, 41.8, 1500, 15], [34.4, 41.78, 1300, 15], [35.0, 41.6, 1100, 15]]],
	['Ilgaz', [[33.2, 41.05, 1900, 15], [33.75, 41.07, 2550, 17], [34.3, 41.02, 2000, 15]]],
	['Canik', [[35.0, 41.05, 1500, 15], [35.6, 40.95, 1700, 18], [36.2, 40.85, 1800, 18], [36.9, 40.72, 2000, 20], [37.6, 40.65, 2200, 20]]],
	['Giresun Dağları', [[38.0, 40.55, 2700, 22], [38.6, 40.5, 3100, 22], [39.2, 40.55, 2900, 22], [39.7, 40.62, 2800, 22], [40.2, 40.7, 3200, 20]]],
	['Kaçkar', [[40.5, 40.75, 3400, 18], [40.9, 40.8, 3750, 18], [41.15, 40.84, 3937, 18], [41.5, 40.98, 3400, 18], [41.9, 41.2, 3000, 16]]],
	['Yalnızçam', [[42.0, 41.35, 2800, 14], [42.35, 41.1, 3000, 15], [42.55, 40.85, 2900, 15]]],
	['Kelkit Güneyi', [[37.6, 40.2, 2200, 18], [38.4, 40.15, 2600, 20], [39.2, 40.2, 2700, 20], [39.9, 40.25, 2900, 20], [40.6, 40.3, 3100, 18], [41.3, 40.45, 3000, 16]]],
	['Akdağ', [[35.4, 39.55, 1900, 15], [35.9, 39.65, 2200, 16], [36.4, 39.75, 2000, 15]]],
	['Tecer', [[36.9, 39.45, 2100, 14], [37.5, 39.35, 2400, 14], [38.0, 39.3, 2300, 14]]],
	['Munzur', [[38.6, 39.4, 2800, 16], [39.1, 39.38, 3400, 18], [39.6, 39.4, 3300, 16], [40.1, 39.5, 2900, 15]]],
	['Palandöken', [[40.9, 39.75, 2900, 14], [41.3, 39.83, 3176, 15], [41.7, 39.8, 2900, 14]]],
	['Allahuekber', [[41.6, 40.2, 2900, 14], [42.1, 40.25, 3000, 15], [42.6, 40.4, 2900, 14]]],
	['Bingöl Dağları', [[40.6, 39.25, 2600, 15], [41.1, 39.3, 3250, 16], [41.6, 39.35, 2800, 15]]],
	['Aladağ', [[42.6, 39.45, 2700, 15], [43.1, 39.35, 3200, 16], [43.5, 39.25, 3400, 15]]],
	['Erek', [[43.4, 38.5, 3000, 12], [43.6, 38.25, 3200, 14], [43.9, 38.0, 3300, 15]]],
];

// volkanlar ve tek doruklar: [ad, boylam, enlem, metre, yarıçap km]
const PEAKS = [
	['Ağrı Dağı', 44.3, 39.7, 5137, 26], ['Küçük Ağrı', 44.42, 39.65, 3896, 12], ['Süphan', 42.83, 38.93, 4058, 18], ['Tendürek', 43.88, 39.37, 3584, 16],
	['Nemrut (Bitlis)', 42.23, 38.65, 2948, 13], ['Erciyes', 35.45, 38.53, 3917, 20], ['Hasan Dağı', 34.17, 38.13, 3268, 15], ['Melendiz', 34.58, 38.06, 2963, 11],
	['Karadağ', 33.12, 37.4, 2288, 10], ['Karacadağ', 39.83, 37.67, 1957, 38], ['Kaçkar Dağı', 41.16, 40.83, 3937, 8], ['Uludağ', 29.12, 40.07, 2543, 9],
	['Uludoruk', 43.97, 37.45, 4135, 10], ['Demirkazık', 35.15, 37.84, 3756, 8], ['Kızlar Sivrisi', 30.15, 36.61, 3070, 8], ['Honaz', 29.27, 37.67, 2571, 8],
	['Spil', 27.43, 38.55, 1513, 7], ['Babadağ', 29.18, 36.55, 1969, 6], ['Ilgaz', 33.73, 41.07, 2587, 7], ['Köroğlu', 31.85, 40.55, 2499, 8],
	['Medetsiz', 34.62, 37.4, 3524, 9], ['Munzur', 39.48, 39.38, 3463, 8], ['Palandöken', 41.27, 39.85, 3176, 7], ['Akdağ', 29.57, 36.53, 3016, 8],
	['Davraz', 30.75, 37.75, 2635, 6], ['Dedegöl', 31.28, 37.65, 2992, 8],
];

// orman kuşakları: [yoğunluk, yarı genişlik km, [[boylam, enlem], ...]]
const FOREST = [
	[0.85, 28, [[27.0, 41.85], [27.6, 41.75], [28.2, 41.4]]],
	[0.95, 34, [[29.6, 40.75], [30.3, 40.85], [30.9, 40.9], [31.5, 41.1], [32.2, 41.4], [32.9, 41.6], [33.7, 41.7], [34.5, 41.7], [35.0, 41.6]]],
	[0.8, 24, [[31.0, 40.65], [31.8, 40.6], [32.5, 40.65]]],
	[0.8, 22, [[33.2, 41.15], [34.0, 41.2]]],
	[0.75, 24, [[35.2, 41.2], [36.0, 41.0], [36.8, 40.85], [37.6, 40.8]]],
	[0.95, 26, [[37.8, 40.8], [38.6, 40.75], [39.4, 40.8], [40.2, 40.9], [40.9, 41.0], [41.5, 41.2], [42.0, 41.35]]],
	[0.7, 18, [[42.0, 41.3], [42.6, 41.45]]],
	[0.8, 18, [[42.45, 40.3], [42.85, 40.35]]],
	[0.7, 20, [[26.6, 39.65], [27.2, 39.75]]],
	[0.7, 20, [[28.8, 40.0], [29.6, 40.0]]],
	[0.55, 25, [[28.9, 39.5], [29.5, 39.6], [30.0, 39.4]]],
	[0.45, 18, [[27.6, 38.35], [28.5, 38.35]]],
	[0.35, 14, [[27.5, 38.0], [28.4, 37.95]]],
	[0.85, 30, [[27.5, 37.2], [28.2, 37.1], [28.8, 36.9], [29.3, 36.7]]],
	[0.7, 22, [[29.5, 36.6], [30.2, 36.6], [30.5, 37.0]]],
	[0.7, 25, [[31.2, 37.0], [32.0, 36.75], [32.8, 36.6], [33.5, 36.8], [34.3, 37.0], [35.0, 37.3]]],
	[0.5, 20, [[30.4, 37.6], [31.0, 37.6], [31.4, 37.5]]],
	[0.7, 14, [[36.1, 36.4], [36.4, 37.0]]],
	[0.55, 22, [[36.0, 37.4], [36.6, 37.6]]],
	[0.35, 30, [[39.0, 39.2], [40.0, 39.0], [40.8, 38.9]]],
	[0.25, 30, [[41.8, 38.0], [42.8, 37.6], [43.6, 37.4]]],
	[0.4, 20, [[26.9, 40.1], [27.4, 40.05]]],
];

// bölge iklimi: 0 kurak bozkır (altın sarısı) … 1 yağışlı (koyu yeşil)
const CLIMATE = { marmara: 0.72, karadeniz: 0.95, ege: 0.58, akdeniz: 0.55, icanadolu: 0.12, dogu: 0.42, guneydogu: 0.16 };

// tohumlu değer gürültüsü (ızgarada doğal düzensizlik)
function hash2(x, y) {
	let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const fx = x - ix;
	const fy = y - iy;
	const ux = fx * fx * (3 - 2 * fx);
	const uy = fy * fy * (3 - 2 * fy);
	const a = hash2(ix, iy);
	const b = hash2(ix + 1, iy);
	const c = hash2(ix, iy + 1);
	const d = hash2(ix + 1, iy + 1);
	return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1 + 7, y * 2.1 - 3) * 0.3 + vnoise(x * 4.3 - 11, y * 4.3 + 5) * 0.15;

const S = 0.4; // ızgara aralığı (birim)
const GX0 = -46;
const GY0 = -20.6;
const GW = Math.ceil((47.2 - GX0) / S) + 1;
const GH = Math.ceil((20.2 - GY0) / S) + 1;

// dizinler
const coastIdx = new SegIndex(1);
for (const a of arcs) {
	const sea = a.L < 0 || a.R < 0;
	if (!sea) continue;
	for (let i = 0; i < a.proj.length - 1; i++) coastIdx.add(a.proj[i][0], a.proj[i][1], a.proj[i + 1][0], a.proj[i + 1][1]);
}
const landRings = [...provRings.map((o) => o.r), ...land.map((f) => { const r = []; for (let i = 0; i < f.length; i += 2) r.push([f[i], f[i + 1]]); return r; })];
const landBox = landRings.map((r) => {
	let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
	for (const [x, y] of r) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
	return [x0, y0, x1, y1];
});
const isLand = (x, y) => landRings.some((r, i) => { const b = landBox[i]; return x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && pointInRing(x, y, r); });
const provBox = provRings.map(({ r }) => {
	let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
	for (const [x, y] of r) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
	return [x0, y0, x1, y1];
});
const provAtFast = (x, y) => {
	for (let i = 0; i < provRings.length; i++) {
		const b = provBox[i];
		if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && pointInRing(x, y, provRings[i].r)) return provRings[i].p;
	}
	return null;
};

const spots = SPOT.map(([lon, lat, m]) => [...proj([lon, lat]), m]);
const ranges = RANGES.map(([name, pts]) => pts.map(([lon, lat, m, w]) => [...proj([lon, lat]), m, w * KM]));
const peaks = PEAKS.map(([name, lon, lat, m, r]) => [...proj([lon, lat]), m, r * KM]);
const forests = FOREST.map(([d, w, pts]) => ({ d, w: w * KM, pts: pts.map(proj) }));
const lakeRings = lakes.map((l) => l.ring);
const riverIdx = new SegIndex(1);
for (const r of rivers) for (let i = 0; i < r.pts.length - 1; i++) riverIdx.add(r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1], r.w);

/** Polyline'a uzaklık ve o noktadaki ara değer (sırt yüksekliği, genişlik). */
function polyNear(x, y, pts) {
	let md = Infinity;
	let m = 0;
	let w = 0;
	for (let i = 0; i < pts.length - 1; i++) {
		const [ax, ay, am, aw] = pts[i];
		const [bx, by, bm, bw] = pts[i + 1];
		const dx = bx - ax;
		const dy = by - ay;
		const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1e-12)));
		const d = Math.hypot(x - ax - dx * t, y - ay - dy * t);
		if (d < md) {
			md = d;
			m = am + (bm - am) * t;
			w = aw + (bw - aw) * t;
		}
	}
	return [md, m, w];
}

function baseElev(x, y) {
	let sw = 0;
	let s = 0;
	for (const [sx, sy, m] of spots) {
		const d2 = (x - sx) ** 2 + (y - sy) ** 2;
		const w = 1 / Math.pow(d2 + 1.2, 1.6);
		sw += w;
		s += w * m;
	}
	return s / sw;
}

const smooth = (a, b, x) => {
	const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

const N = GW * GH;
const E = new Float32Array(N); // metre
const ROUGH = new Float32Array(N);
const FOR = new Float32Array(N);
const GREEN = new Float32Array(N);
const LAKE = new Float32Array(N);
const LANDM = new Uint8Array(N);
const CLIM = new Float32Array(N);
console.time('kabartma');
for (let j = 0; j < GH; j++) {
	for (let i = 0; i < GW; i++) {
		const x = GX0 + i * S;
		const y = GY0 + j * S;
		const k = j * GW + i;
		const landHere = isLand(x, y);
		LANDM[k] = landHere ? 1 : 0;
		const p = provAtFast(x, y);
		CLIM[k] = p ? CLIMATE[p.region] : -1;
		let e = baseElev(x, y);
		let rough = 0;
		// dağ sıraları: sırt boyunca gürültüyle doruklar ve geçitler
		for (const r of ranges) {
			const [d, m, w] = polyNear(x, y, r);
			if (d > w * 1.6) continue;
			const t = d / w;
			const bump = Math.exp(-2.6 * t * t);
			const crest = m * (0.74 + 0.4 * fbm(x * 0.55 + 3, y * 0.55 - 1));
			e = e + Math.max(0, crest - e) * bump;
			rough = Math.max(rough, bump * Math.min(1, crest / 2500));
		}
		for (const [px, py, m, r] of peaks) {
			const d = Math.hypot(x - px, y - py);
			if (d > r) continue;
			const t = d / r;
			const cone = Math.pow(1 - t, 1.7);
			e = Math.max(e, e * (1 - cone) + m * cone);
			rough = Math.max(rough, cone * Math.min(1, m / 2500));
		}
		// doğal düzensizlik
		e += (fbm(x * 0.9, y * 0.9) - 0.5) * (90 + 260 * rough);
		// nehir vadileri
		const rv = riverIdx.near(x, y, 0.9);
		if (rv.d < 0.9) {
			const v = 1 - smooth(0, 0.9, rv.d);
			e = e - v * Math.min(e * 0.18, 220);
		}
		// kıyı: kıyıda yükselti sıfıra iner; dağlık kıyıda falez kalır
		const c = coastIdx.near(x, y, 3);
		const dc = landHere ? c.d : -c.d;
		const cliff = Math.min(1, Math.max(0, (e - 250) / 1000)) * 260;
		if (dc >= 0) e = cliff + (e - cliff) * smooth(0, 0.35 + 1.3 * (1 - rough), dc);
		else e = cliff;
		E[k] = Math.max(0, e);
		ROUGH[k] = rough;
	}
}
// göller: içi düz göl seviyesi, kıyısı yumuşak çanak
const lakeIdx = new SegIndex(1);
lakes.forEach((l, li) => {
	for (let i = 0; i < l.ring.length; i++) {
		const a = l.ring[i];
		const b = l.ring[(i + 1) % l.ring.length];
		lakeIdx.add(a[0], a[1], b[0], b[1], li);
	}
});
for (const l of lakes) {
	if (l.level != null) continue;
	// bilinmeyen göl: kıyısındaki en düşük model yükseltisi
	let m = Infinity;
	for (const [x, y] of l.ring) {
		const i = Math.round((x - GX0) / S);
		const j = Math.round((y - GY0) / S);
		if (i >= 0 && j >= 0 && i < GW && j < GH) m = Math.min(m, E[j * GW + i]);
	}
	l.level = Math.round(Number.isFinite(m) ? m : 500);
}
for (let j = 0; j < GH; j++)
	for (let i = 0; i < GW; i++) {
		const x = GX0 + i * S;
		const y = GY0 + j * S;
		const k = j * GW + i;
		const n = lakeIdx.near(x, y, 1.2);
		if (n.tag < 0) continue;
		const l = lakes[n.tag];
		const inside = pointInRing(x, y, l.ring);
		const lvl = l.level;
		if (inside) {
			E[k] = lvl;
			LAKE[k] = 1;
			ROUGH[k] = 0;
		} else {
			const t = smooth(0, 1.2, n.d);
			E[k] = lvl + Math.max(0, E[k] - lvl) * t + 8 * (1 - t);
			ROUGH[k] *= t;
			LAKE[k] = Math.max(LAKE[k], (1 - t) * 0.5);
		}
	}
// iklim: bölge değerlerinin yumuşatılmış hali (bölge sınırları kesin çizgi olmasın)
const CL2 = new Float32Array(N);
{
	const R = 5;
	for (let j = 0; j < GH; j++)
		for (let i = 0; i < GW; i++) {
			let s = 0;
			let w = 0;
			for (let b = -R; b <= R; b++)
				for (let a = -R; a <= R; a++) {
					const ii = i + a;
					const jj = j + b;
					if (ii < 0 || jj < 0 || ii >= GW || jj >= GH) continue;
					const v = CLIM[jj * GW + ii];
					if (v < 0) continue;
					const ww = Math.exp(-(a * a + b * b) / (R * R * 0.5));
					s += v * ww;
					w += ww;
				}
			CL2[j * GW + i] = w > 0 ? s / w : 0.5;
		}
}
for (let j = 0; j < GH; j++)
	for (let i = 0; i < GW; i++) {
		const x = GX0 + i * S;
		const y = GY0 + j * S;
		const k = j * GW + i;
		const e = E[k];
		let g = CL2[k];
		// nehir boyları ve göl kıyıları yeşil; yükseklerde çayır
		const rv = riverIdx.near(x, y, 1.2);
		g += (1 - smooth(0, 1.2, rv.d)) * 0.25;
		g += LAKE[k] * 0.2;
		g += (fbm(x * 0.35 + 9, y * 0.35) - 0.5) * 0.25;
		GREEN[k] = Math.max(0, Math.min(1, g));
		// orman
		let f = 0;
		for (const z of forests) {
			const [d] = polyNear(x, y, z.pts.map((p) => [p[0], p[1], 0, 0]));
			if (d > z.w * 1.5) continue;
			f = Math.max(f, z.d * Math.exp(-2.2 * (d / z.w) ** 2));
		}
		const treeLine = 1 - smooth(1700, 2400, e);
		f *= treeLine * (0.65 + 0.7 * fbm(x * 1.3 - 4, y * 1.3 + 8));
		f *= 1 - LAKE[k];
		FOR[k] = Math.max(0, Math.min(1, f));
	}
console.timeEnd('kabartma');

// nehirlerin akış yönü: kaynak (yüksek uç) başta olsun; genişlik akış boyunca artar
const sampleE = (x, y) => {
	const i = Math.max(0, Math.min(GW - 1, Math.round((x - GX0) / S)));
	const j = Math.max(0, Math.min(GH - 1, Math.round((y - GY0) / S)));
	return E[j * GW + i];
};
for (const r of rivers) {
	const a = r.pts[0];
	const b = r.pts[r.pts.length - 1];
	if (sampleE(a[0], a[1]) < sampleE(b[0], b[1])) r.pts.reverse();
}

// ızgarayı baytlara çevir: yükseklik karekök ölçekli (alçakta hassas), diğerleri doğrusal
const EMAX = 5200;
const bytes = new Uint8Array(N * 5);
for (let k = 0; k < N; k++) {
	bytes[k * 5] = Math.round(255 * Math.sqrt(Math.min(1, E[k] / EMAX)));
	bytes[k * 5 + 1] = Math.round(255 * FOR[k]);
	bytes[k * 5 + 2] = Math.round(255 * GREEN[k]);
	bytes[k * 5 + 3] = Math.round(255 * Math.min(1, ROUGH[k]));
	bytes[k * 5 + 4] = Math.round(255 * LAKE[k]);
}

// ------------------------------------------------------------------ çıktı

const out = {
	meta: { K, lon0: LON0, lat0: LAT0, cos0: round(COS0 * 1e3) / 1e3, source: 'Natural Earth (kamu malı); yükselti modeli elle (gerçek doruk ve il yükseltileri)' },
	provinces: provinces
		.sort((a, b) => a.id - b.id)
		.map((p) => ({ id: p.id, name: p.name, region: p.region, center: p.center.map(round), inner: round(p.inner), area: round(p.area), nb: [...p.nb].sort((a, b) => a - b), rings: p.rings.map(flat) })),
	borders,
	land,
	nbCoast,
	lakes: lakes.map((l) => ({ name: l.name, level: l.level, ring: flat(l.ring) })),
	rivers: rivers.map((r) => ({ name: r.name, w: r.w, pts: flat(r.pts) })),
	peaks: PEAKS.map(([name, lon, lat, m]) => ({ name, p: proj([lon, lat]).map(round), m })),
};
writeFileSync('src/data/turkiye.json', JSON.stringify(out));
const relief = {
	meta: { x0: GX0, y0: GY0, step: S, w: GW, h: GH, emax: EMAX, ch: ['yükseklik(karekök)', 'orman', 'yeşillik', 'dağlık', 'göl'] },
	data: Buffer.from(bytes).toString('base64'),
};
writeFileSync('src/data/relief.json', JSON.stringify(relief));

const pts = out.provinces.reduce((s, p) => s + p.rings.reduce((t, r) => t + r.length / 2, 0), 0);
const bpts = borders.reduce((s, b) => s + b.pts.length / 2, 0);
console.log(`iller: ${out.provinces.length}, il köşesi: ${pts}, sınır yayı: ${borders.length} (${bpts} köşe), kara parçası: ${land.length}, göl: ${lakes.length}, nehir: ${rivers.length}`);
console.log(`turkiye.json ${(JSON.stringify(out).length / 1024).toFixed(0)} KB, relief.json ${(JSON.stringify(relief).length / 1024).toFixed(0)} KB (${GW}×${GH})`);
const lonely = out.provinces.filter((p) => !p.nb.length).map((p) => p.name);
console.log('komşusuz:', lonely.join(', ') || 'yok');
console.log('göller:', lakes.map((l) => `${l.name}(${l.level})`).join(', '));
console.log('nehirler:', [...new Set(rivers.map((r) => r.name))].join(', '));
