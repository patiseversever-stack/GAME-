// Yapıların yerleşimi ve arazi terasları (harita ağı kurulmadan ÖNCE çalışır: board.js).
//
// Neden burada: eğimli arazide yapı tek bir merkez yüksekliğine kurulunca yokuş yukarı taraftaki toprak (il
// rengiyle boyalı yüzey) yapının ve avlusunun üstüne çıkıp onları örtüyor, yokuş aşağı tarafta avlu havada
// kalıyordu. Çözüm "kaz-doldur teras": her yapının ayak izinde arazinin kendisi düzleştirilir (ortalama yükseklik,
// dışa doğru yumuşak geçiş). Harita ağı, avlu, birimler, etiketler ve kale aynı Relief.height'i okur: hepsi aynı
// düz zemini görür; ne gömülme, ne havada tabla, ne de yapay tümsek. Teras arazinin kendi dokusunda ve renginde.
//
// Yerleşim: gerçek yerin çevresinde (±3 birim) en iyi nokta aranır. Ceza: gövde komşu ile taşarsa (il seçimde
// kalkınca havada kalır), avlu denize/göle ya da komşuya taşarsa, il merkezine (kale ve il adı) yaklaşırsa, başka
// yapının avlusuna binerse, ayak izi eğimliyse (daha az kazı-dolgu); gerçek yerden uzaklaştıkça hafif ceza.

import { EXTRA_SITES } from './landmarks2.js';

// [yapı, boylam, enlem, ölçek, dönüş, il kimliği (plaka), merkezden en az uzaklık]
export const SITES = [
	['ayasofya', 28.9, 41.02, 1.9, 0.1, 34, 0, 'shore'],
	['galata', 28.97, 41.1, 1.8, 0, 34, 0, 'shore-w'],
	['kizkulesi', 29.004, 41.021, 1.05, 0, 34, 0, 'sea'],
	['kopru', 29.036, 41.052, 1.4, 0.15, 34, 0, 'sea'],
	['anitkabir', 32.84, 39.93, 2.45, 0, 6],
	['peri', 34.83, 38.64, 2.25, 0, 50],
	['nemrut', 38.74, 37.98, 2.3, 0, 2],
	['pamukkale', 29.12, 37.92, 2.25, 0, 20],
	['sumela', 39.66, 40.69, 2.0, 0, 61],
	['uzungol', 40.29, 40.62, 1.6, 0, 61],
	['celsus', 27.34, 37.94, 2.2, 0, 35],
	['saatkulesi', 27.13, 38.42, 1.54, 0, 35],
	['mevlana', 32.5, 37.87, 2.2, 0, 42],
	['selimiye', 26.56, 41.68, 2.1, 0, 22],
	['ishakpasa', 44.13, 39.52, 2.05, 0, 4],
	['safranbolu', 32.69, 41.25, 2.0, 0, 78],
	['gobekli', 38.92, 37.22, 1.89, 0, 63],
	['truva', 26.24, 39.96, 1.89, -0.3, 17],
	['aspendos', 31.17, 36.94, 1.82, Math.PI, 7], // (v1.4) çevrik: kamera basamakların üstünden sahne cephesine bakar
	['vankalesi', 43.34, 38.5, 1.82, 0.2, 65, 0, 'shore'],
	['kizkalesi', 34.15, 36.43, 1.54, 0, 33, 0, 'sea'],
	['bodrum', 27.43, 37.04, 1.61, 0, 48],
	['ciftemin', 41.28, 39.9, 1.82, 0, 25],
	// v0.9: 19 yeni yapı (landmarks2.js). Sona eklenir: eski 23 yapının yeri ve görünüşü aynı kalır.
	...EXTRA_SITES,
];

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

export const lonlat = (board, lon, lat) => {
	const m = board.data.meta;
	const c = Math.cos((m.lat0 * Math.PI) / 180);
	return [(lon - m.lon0) * c * m.K, -(lat - m.lat0) * m.K];
};

/** Harita ağıyla aynı ızgarada çift doğrusal yükseklik (dünya x, z). */
export function gridHeight(rel, st) {
	return (x, z) => {
		const y = -z;
		const gx = Math.floor(x / st);
		const gy = Math.floor(y / st);
		const fx = x / st - gx;
		const fy = y / st - gy;
		const h = (i, j) => rel.height((gx + i) * st, (gy + j) * st);
		const a = h(0, 0) + (h(1, 0) - h(0, 0)) * fx;
		const b = h(0, 1) + (h(1, 1) - h(0, 1)) * fx;
		return a + (b - a) * fy;
	};
}

/** Teras ölçüleri (yapı ölçeği sc): düz iç yarıçap ve yumuşak geçişin bittiği dış yarıçap. */
export const padR = (sc) => {
	const r0 = sc * 0.64;
	return [r0, r0 + Math.max(0.75, sc * 0.5)];
};

/**
 * Yerleşim planı: [{ kind, plate, index, x, z, sc, ry, where }]. board: il çokgenleri ve pick hazır (harita ağı
 * gerekmez). st: harita ızgara adımı.
 */
export function planSites(board, st) {
	const rel = board.relief;
	const hf = gridHeight(rel, st);
	const water = (x, z) => board.pick(x, z) < 0 || rel.bil(rel.La, x, -z) > 0.05;
	const range = (x, z, r) => {
		let lo = hf(x, z);
		let hi = lo;
		for (const f of [0.5, 1])
			for (let i = 0; i < 8; i++) {
				const a = (i / 8) * Math.PI * 2;
				const h = hf(x + Math.cos(a) * r * f, z + Math.sin(a) * r * f);
				if (h < lo) lo = h;
				if (h > hi) hi = h;
			}
		return hi - lo;
	};
	const out = [];
	for (const [kind, lon, lat, sc, ry, plate, , where] of SITES) {
		const p = board.byId.get(plate);
		if (!p) continue;
		let [x, z] = lonlat(board, lon, lat);
		if (where !== 'sea' && where !== 'lake') {
			const minD = Math.max(1.9, 2.2 + sc * 0.42); // kale yarıçapı (≈2,2) + yapı gövdesi
			const rc = sc * 0.42;
			const rp = sc * 0.7;
			const inP = (tx, tz) => p.rings.some((r) => inPoly(tx, -tz, r));
			const x0 = x;
			const z0 = z;
			let best = -1e9;
			for (let gx = -3; gx <= 3.001; gx += 0.4)
				for (let gz = -3; gz <= 3.001; gz += 0.4) {
					const cx = x0 + gx;
					const cz = z0 + gz;
					if (!inP(cx, cz)) continue;
					if (where === 'shore-w' && gx > 0.2) continue; // Galata boğazın Avrupa yakasında kalsın
					let sco = -Math.hypot(gx, gz) * 0.6;
					const cd = Math.hypot(cx - p.x, cz - p.z);
					if (cd < minD) sco -= (minD - cd) * 6;
					for (let i = 0; i < 8; i++) {
						const a = (i / 8) * Math.PI * 2 + 0.2;
						const ca = Math.cos(a);
						const sa = Math.sin(a);
						if (!inP(cx + ca * rc, cz + sa * rc) && !water(cx + ca * rc, cz + sa * rc)) sco -= 5;
						const px = cx + ca * rp;
						const pz = cz + sa * rp;
						if (water(px, pz)) sco -= String(where).startsWith('shore') ? 0.2 : 2;
						else if (!inP(px, pz)) sco -= 0.8;
					}
					// eğim: düz yer seçilsin (teras daha az kazı-dolgu ister, çevresiyle daha doğal birleşir)
					sco -= range(cx, cz, sc * 0.6) * 4;
					for (const o of out) {
						if (o.wet) continue;
						const lim = (o.r + sc * 0.72) * 0.92;
						const d = Math.hypot(cx - o.x, cz - o.z);
						if (d < lim) sco -= (lim - d) * 8;
					}
					if (sco > best) {
						best = sco;
						x = cx;
						z = cz;
					}
				}
		}
		const wet = where === 'sea' || where === 'lake'; // suda (ada): yerleşim aranmaz, öteki yapılar kaçınmaz
		out.push({ kind, plate, index: p.index, x, z, sc, ry, where, wet, r: wet ? 0.6 : sc * 0.72 });
	}
	return out;
}

/**
 * Teraslar: karadaki her yapı için ayak izindeki doğal arazinin ortalama yüksekliği (kaz-doldur). Relief.setPads
 * bunları yüksekliğe katar. Dönüş: [{ x, y (kuzey = -z), h, r0, r1 }].
 */
export function padsOf(plan, rel, st) {
	const hf = gridHeight(rel, st);
	const pads = [];
	for (const s of plan) {
		if (s.wet) continue;
		const [r0, r1] = padR(s.sc);
		let sum = hf(s.x, s.z) * 2;
		let n = 2;
		for (const f of [0.35, 0.7, 1])
			for (let i = 0; i < 12; i++) {
				const a = (i / 12) * Math.PI * 2;
				sum += hf(s.x + Math.cos(a) * r0 * f, s.z + Math.sin(a) * r0 * f);
				n++;
			}
		const h = sum / n;
		// dik yamaçta geçiş bandı yükseklik farkıyla genişler (en çok ~1:2,5 eğim): teras kenarında sert set ya da
		// koyu uçurum bandı olmaz (Sumela, Uzungöl, Nemrut, İshak Paşa)
		let dev = 0;
		for (const f of [1, 1.4, 1.9])
			for (let i = 0; i < 12; i++) {
				const a = (i / 12) * Math.PI * 2;
				dev = Math.max(dev, Math.abs(hf(s.x + Math.cos(a) * r0 * f, s.z + Math.sin(a) * r0 * f) - h));
			}
		pads.push({ x: s.x, y: -s.z, h, r0, r1: Math.max(r1, r0 + dev * 2.5) });
	}
	return pads;
}
