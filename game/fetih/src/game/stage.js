// Savaş sahnesi planı: saldırı hangi sınır noktasında, hangi yönde, hangi dizilişle oynanacak; ordular
// nereden yürüyecek, kamera hangi açıdan bakarsa arazi ve yapılar sahneyi örtmez.
//
// Sahra savaşı: iki ilin ortak sınırı boyunca aday noktalar denenir. Her noktada saldıranın safları kendi
// ilinde, savunanınki hedef ilde kalmalı; göl, deniz, kale tepesi ve başka il sınırı üstünde birim olmaz.
// Saflar sığmazsa diziliş küçülür (büyük il: iki blok × 5 × 3 piyade, okçular, atlılar; Yalova, Kilis gibi
// küçük illerde tek blok). Ünlü yapıya yakın sahne cezalı (savaşta yapı alçalır; nadir olsun). Yürüyüş
// mesafesi saldıranın ilinde kalacak kadar (en çok ~2,6 birim): ordu haritanın öbür ucuna koşmaz.
// Kuşatma: savunanlar kale kapısının önünde, saldıranlar karşısında, mancınıklar onların gerisinde; yön
// saldıranın ilinden kaleye doğru, sığacak açı aranır.
//
// Plan bir kez (saldırı başında) kurulur; kare başına iş yok.

import { SPEAR, BANNER, ARCHER, LORD, RIDER, CATAPULT, TREBUCHET } from '../gfx/battle.js';
import { Castle } from '../map/castle.js';

const LAT = 0.205; // saf aralığı (yan)
const DEP = 0.235; // saf aralığı (derinlik)
const BGAP = 0.34; // iki blok arası
const GAP = 0.36; // ön saf ile çarpışma hattı arası (iki cephe arası ≈ 0,72; çarpışmada mızraklar ortada kesişir)
const CASTLE_R = 2.4; // kalenin kayalık tepesi (ölçekli) + pay
export const SEL_LIFT = 0.26; // gece odağında aydınlık il bu kadar kalkık (board.js)

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// ------------------------------------------------------------------ dizilişler

/** Piyade blokları: cols × rows, nb blok yan yana; son safın ortasında sancaktar. */
function infantry(out, cols, rows, nb) {
	const bw = (cols - 1) * LAT;
	const W = nb * bw + (nb - 1) * BGAP;
	for (let b = 0; b < nb; b++) {
		const x0 = -W / 2 + b * (bw + BGAP);
		for (let r = 0; r < rows; r++)
			for (let c = 0; c < cols; c++) {
				const banner = r === rows - 1 && c === cols >> 1 && rows > 1;
				out.push({ lat: x0 + c * LAT + (Math.random() - 0.5) * 0.03, dep: r * DEP + (Math.random() - 0.5) * 0.025, rank: r, kind: banner ? BANNER : SPEAR });
			}
	}
	return { W, D: (rows - 1) * DEP };
}

/** Okçu safı: piyadenin arkasında, seyrek. */
function archers(out, n, W, dep) {
	const sp = n > 1 ? Math.min(0.26, W / (n - 1)) : 0;
	for (let i = 0; i < n; i++) out.push({ lat: (i - (n - 1) / 2) * sp, dep, rank: 9, kind: ARCHER });
}

/**
 * Diziliş: side 0 saldıran, 1 savunan; level 0 büyük … 3 en küçük, 4 dar kol. Dönen {slots, W (genişlik), D (derinlik),
 * machines}. Yerel: lat yan (sağ +), dep ön saftan geriye.
 */
function formation(side, siege, level, lo) {
	const s = [];
	const mach = [];
	let f;
	let arch = 0;
	let cav = 0;
	if (!siege) {
		const A = side === 0;
		// [sütun, saf, blok, okçu, atlı]; son düzey dar kol (boğaz, yarımada gibi ince yerler)
		const T = lo
			? A
				? [[4, 2, 2, 4, 1], [3, 2, 2, 3, 1], [3, 2, 1, 2, 1], [2, 2, 1, 1, 0], [2, 3, 1, 1, 0]]
				: [[3, 2, 2, 3, 1], [3, 2, 1, 2, 1], [2, 2, 1, 2, 0], [2, 1, 1, 1, 0], [2, 3, 1, 1, 0]]
			: A
				? [[5, 3, 2, 8, 3], [4, 3, 2, 6, 2], [3, 2, 2, 4, 1], [3, 2, 1, 2, 1], [2, 4, 1, 1, 0]]
				: [[5, 2, 2, 6, 1], [4, 2, 2, 4, 1], [3, 2, 2, 3, 1], [3, 2, 1, 2, 0], [2, 4, 1, 1, 0]];
		const [c, r, nb, na, nc] = T[Math.min(level, 4)];
		f = infantry(s, c, r, nb);
		arch = na;
		cav = nc;
	} else if (side === 0) {
		const T = lo ? [[3, 2, 2, 3, 2], [3, 2, 1, 2, 2], [2, 2, 1, 2, 1], [2, 1, 1, 1, 1], [2, 2, 1, 1, 1]] : [[4, 2, 2, 6, 3], [3, 2, 2, 4, 2], [3, 2, 1, 3, 2], [2, 2, 1, 2, 1], [2, 3, 1, 1, 1]];
		const [c, r, nb, na, nm] = T[Math.min(level, 4)];
		f = infantry(s, c, r, nb);
		arch = na;
		cav = 1;
		// makineler: ortada karşı ağırlıklı, yanlarda mancınık; her birinin iki kişilik mürettebatı
		const md = f.D + DEP + 0.62;
		const list = nm >= 3 ? [[0, md + 0.38, TREBUCHET], [-0.9, md, CATAPULT], [0.9, md, CATAPULT]] : nm === 2 ? [[-0.5, md + 0.2, TREBUCHET], [0.55, md, CATAPULT]] : [[0, md, CATAPULT]];
		for (const [lat, dep, kind] of list) {
			mach.push({ lat, dep, kind });
			for (const sx of [-1, 1]) s.push({ lat: lat + sx * 0.3, dep: dep + 0.22, rank: 8, kind: SPEAR });
		}
	} else {
		const T = lo ? [[4, 2, 1, 2], [3, 2, 1, 2], [3, 1, 1, 1], [2, 1, 1, 1], [2, 2, 1, 1]] : [[5, 2, 1, 4], [4, 2, 1, 3], [3, 2, 1, 2], [2, 2, 1, 1], [2, 3, 1, 1]];
		const [c, r, nb, na] = T[Math.min(level, 4)];
		f = infantry(s, c, r, nb);
		arch = na;
		cav = 0;
	}
	if (arch) archers(s, arch, Math.max(0.6, f.W * 0.9), f.D + DEP + (siege && side === 0 ? 0.05 : 0.08));
	// atlılar: komutan sağ kanatta, süvariler iki kanatta
	if (cav >= 1) s.push({ lat: f.W / 2 + 0.36, dep: 0.18, rank: 0, kind: LORD });
	if (cav >= 2) s.push({ lat: -f.W / 2 - 0.36, dep: 0.28, rank: 1, kind: RIDER });
	if (cav >= 3) s.push({ lat: f.W / 2 + 0.38, dep: 0.62, rank: 1, kind: RIDER });
	let W = f.W + (cav ? 0.8 : 0.2);
	let D = f.D + (arch ? DEP + 0.1 : 0);
	for (const m of mach) {
		W = Math.max(W, Math.abs(m.lat) * 2 + 0.6);
		D = Math.max(D, m.dep + 0.4);
	}
	return { slots: s, W, D, machines: mach, front: f.W };
}

// ------------------------------------------------------------------ plan

/**
 * Saldırının sahnesi. app: board, castles, props (yapılar), tier. src: saldıranın ili, target: hedef,
 * isCap: kuşatma (hedef savunanın başkenti). Dönen plan (battle.setup ve sinema kullanır):
 *   att/def: {ux, uz (yüz yönü), sx, sz (yürüyüş başı), ex, ez (bekleme yeri, ön saf ortası), slots}
 *   machines, line {x, z, w, y} çarpışma hattı, clear [ax, az, bx, bz, r] ağaç açıklığı,
 *   mid {x, y, z} sahne ortası, u {x, z} saldırı yönü, castle {x, y, z} | null, span (sahne boyu)
 */
export function planStage(app, src, target, isCap) {
	const b = app.board;
	const lo = app.tier?.id === 0;
	const S = b.provinces[src];
	const T = b.provinces[target];
	const sites = app.props?.landmarks?.sites || [];
	// kaleler: kuşatılan kale hariç hepsinin tepesi yasak bölge
	let K = null;
	let KO = null;
	const keep = [];
	for (const k of app.castles || []) {
		if (!k.group.visible) continue;
		const p = k.group.position;
		if (isCap && b.pick(p.x, p.z) === target && !K) {
			K = { x: p.x, y: p.y, z: p.z };
			KO = k;
		} else keep.push(p.x, p.z);
	}
	if (isCap && !K) K = { x: T.x, y: b.heightAt(T.x, T.z), z: T.z };
	if (K) keep.push(K.x, K.z);
	const inS = (x, z) => b.inProv(src, x, z);
	const inT = (x, z) => b.inProv(target, x, z);
	const free = (x, z) => {
		if (b.lakeAt(x, z)) return false;
		for (let i = 0; i < keep.length; i += 2) if ((x - keep[i]) ** 2 + (z - keep[i + 1]) ** 2 < CASTLE_R * CASTLE_R) return false;
		return true;
	};
	const lines = isCap ? [] : b.sharedBorder(src, target);
	const amphib = !isCap && !lines.length;
	// kuşatmada saldıran iki ilde de durabilir; hiç yer yoksa (kale kıyıya ya da üçüncü bir ile dayalı) herhangi bir karada
	let relaxA = false;
	const allowA =
		isCap || amphib
			? (x, z) => (inS(x, z) || inT(x, z) || (relaxA && b.pick(x, z) >= 0)) && free(x, z)
			: (x, z) => inS(x, z) && free(x, z) && b.borderDist(x, z, 0.1) >= 0.1;
	// savunan kendi ilinde durur (kuşatmada da); hiç yer yoksa (kale ili taşıyorsa) saldıranın iline taşabilir
	let relaxD = false;
	const allowD = (x, z) => (inT(x, z) || (relaxD && inS(x, z))) && free(x, z) && (isCap || b.borderDist(x, z, 0.1) >= 0.1);
	// saldırı yönü (genel): saldıranın ilinden hedefe
	let dcx = T.x - S.x;
	let dcz = T.z - S.z;
	const dl = Math.hypot(dcx, dcz) || 1;
	dcx /= dl;
	dcz /= dl;

	// --- adaylar: çarpışma hattının ortası (B) ve saldırı yönü (u)
	const cands = [];
	if (isCap) {
		// kaleye saldıranın ilinden yaklaş: kale → saldıranın ili yönü çevresinde açılar
		const bl = b.sharedBorder(src, target);
		let ax = S.x;
		let az = S.z;
		if (bl.length) {
			const l = bl.reduce((a, c) => (c.length > a.length ? c : a));
			const k = (l.length >> 2) * 2;
			ax = l[k];
			az = l[k + 1];
		}
		const base = Math.atan2(K.x - ax, K.z - az);
		// kale çevresinde bütün yönler (sığmazsa ordu kaleyi öbür yandan da kuşatabilir), saldıranın ilinden yana ağır basar
		for (const da of [0, -0.35, 0.35, -0.7, 0.7, -1.05, 1.05, -1.4, 1.4, -1.8, 1.8, -2.25, 2.25, -2.7, 2.7, Math.PI]) cands.push({ a: base + da, pen: Math.abs(da) * 1.3 });
	} else if (amphib) {
		// ortak kara sınırı yok (İstanbul–Yalova): hedefin saldırana en yakın kıyısına çıkarma
		const r = T.rings[0];
		const pts = [];
		for (let k = 0; k < r.length; k += 2) pts.push([r[k], -r[k + 1], Math.hypot(r[k] - S.x, -r[k + 1] - S.z)]);
		pts.sort((p, q) => p[2] - q[2]);
		for (let i = 0; i < Math.min(6, pts.length); i++) {
			const [x, z] = pts[(i * 3) % pts.length];
			const ux = T.x - x;
			const uz = T.z - z;
			const l = Math.hypot(ux, uz) || 1;
			cands.push({ x: x + (ux / l) * 1.3, z: z + (uz / l) * 1.3, ux: ux / l, uz: uz / l, pen: i * 0.3 });
		}
	} else {
		// ortak sınır boyunca ~0,3 birim aralıkla (uzun sınırda en çok ~40 nokta); her noktada iki ordu arası
		// boşluk seçenekleri: sınır baraj gölünden ya da boğazdan geçiyorsa ordular suyun iki yakasında dizilir
		let total = 0;
		for (const l of lines) for (let k = 2; k < l.length; k += 2) total += Math.hypot(l[k] - l[k - 2], l[k + 1] - l[k - 1]);
		const step = Math.max(0.3, total / 40);
		let acc = 0;
		let along = 0;
		for (const l of lines)
			for (let k = 2; k < l.length; k += 2) {
				const x0 = l[k - 2];
				const z0 = l[k - 1];
				const sx = l[k] - x0;
				const sz = l[k + 1] - z0;
				const L = Math.hypot(sx, sz);
				if (L < 1e-6) continue;
				let t = acc;
				while (t < L) {
					const x = x0 + (sx * t) / L;
					const z = z0 + (sz * t) / L;
					// sınırın normali, hedefe bakan yana çevrilir; genel yönle harmanlanır (dik sınırda yan yan yürümesin)
					let nx = -sz / L;
					let nz = sx / L;
					if (inS(x + nx * 0.3, z + nz * 0.3) || inT(x - nx * 0.3, z - nz * 0.3)) {
						nx = -nx;
						nz = -nz;
					}
					let ux = nx * 0.6 + dcx * 0.4;
					let uz = nz * 0.6 + dcz * 0.4;
					const ul = Math.hypot(ux, uz) || 1;
					for (const gap of [0, 0.7, 1.4]) cands.push({ x, z, ux: ux / ul, uz: uz / ul, along: along + t, gap });
					t += step;
				}
				acc = t - L;
				along += L;
			}
		// sınırın ortasına yakın olan tercih (uç noktalar üçlü sınır kavşağına yakındır); boşluk az olsun
		for (const c of cands) c.pen = (Math.abs(c.along - total / 2) / Math.max(1, total)) * 2.2 + c.gap * 1.4;
	}

	// --- adayları puanla: dizilişin ayak izi örnekleri geçerli mi (büyükten küçüğe)
	const probe = (fx, fz, ux, uz, W, D, allow) => {
		// ön saf ortası (fx, fz), yüz yönü u; dikdörtgen W × D örneklenir (5 × 3)
		const vx = -uz;
		const vz = ux;
		let ok = 0;
		let n = 0;
		for (let j = 0; j < 3; j++)
			for (let i = 0; i < 5; i++) {
				const lat = (i / 4 - 0.5) * W;
				const dep = (j / 2) * D;
				const x = fx + vx * lat - ux * dep;
				const z = fz + vz * lat - uz * dep;
				n++;
				if (allow(x, z)) ok++;
			}
		return ok / n;
	};
	const geom = (c, fa, fd) => {
		// adayın geometrisi: ön saf ortaları ve yönler
		if (isCap) {
			const ux = Math.sin(c.a);
			const uz = Math.cos(c.a);
			const dfx = K.x - ux * (CASTLE_R + 0.1 + fd.D);
			const dfz = K.z - uz * (CASTLE_R + 0.1 + fd.D);
			const gap = 0.95;
			return { ux, uz, ax: dfx - ux * gap, az: dfz - uz * gap, dx: dfx, dz: dfz, bx: dfx - ux * gap * 0.5, bz: dfz - uz * gap * 0.5 };
		}
		const h = GAP + (c.gap || 0) / 2;
		return { ux: c.ux, uz: c.uz, ax: c.x - c.ux * h, az: c.z - c.uz * h, dx: c.x + c.ux * h, dz: c.z + c.uz * h, bx: c.x, bz: c.z };
	};
	const forms = [0, 1, 2, 3, 4].map((L) => [formation(0, isCap, L, lo), formation(1, isCap, L, lo)]);
	// her aday için sığan en büyük diziliş; puan: sığan asker sayısı, sınırın ortasına yakınlık, yapılardan uzaklık
	// sahnede gerçekten duracak askerler (saf saf denetim)
	const exact = (g, fa, fd) => {
		const vx = -g.uz;
		const vz = g.ux;
		let nA = 0;
		let nD = 0;
		for (const s of fa.slots) if (allowA(g.ax + vx * s.lat - g.ux * s.dep, g.az + vz * s.lat - g.uz * s.dep)) nA++;
		for (const s of fd.slots) if (allowD(g.dx - vx * s.lat + g.ux * s.dep, g.dz - vz * s.lat + g.uz * s.dep)) nD++;
		return { nA, nD };
	};
	// iki aşama: her aday ve diziliş ayak izi örnekleriyle kabaca puanlanır; en iyi 12 tanesi saf saf sayılır.
	// Puan: dengeli asker sayısı (savunan az kalırsa sahne boş görünür), sınırın ortasına yakınlık, yapılardan uzaklık
	const choose = () => {
		const list = [];
		for (const c of cands) {
			// yapıya yakın sahne: yapı savaşta alçalır, olabildiğince kaçın
			let lm = 0;
			const cx = isCap ? K.x - Math.sin(c.a) * 4 : c.x;
			const cz = isCap ? K.z - Math.cos(c.a) * 4 : c.z;
			for (const s of sites) {
				if (s.sea) continue;
				const d = Math.hypot(s.x - cx, s.z - cz);
				if (d < 3.2 + (s.r || 1)) lm += (3.2 + (s.r || 1) - d) * 2;
			}
			const pen = (c.pen || 0) * 2.5 + Math.min(10, lm);
			for (let L = 0; L < 5; L++) {
				const [fa, fd] = forms[L];
				const g = geom(c, fa, fd);
				const va = probe(g.ax, g.az, g.ux, g.uz, fa.W, fa.D, allowA);
				const vd = probe(g.dx, g.dz, -g.ux, -g.uz, fd.W, fd.D, allowD);
				const sc = Math.min(fa.slots.length * va, fd.slots.length * vd * 1.5) * (va > 0.85 && vd > 0.85 ? 1.25 : 0.7) - pen;
				list.push({ c, L, g, sc, pen, va, vd });
				if (va > 0.92 && vd > 0.92) break; // daha küçük diziliş gereksiz
			}
		}
		list.sort((a, b) => b.sc - a.sc);
		let best = null;
		for (const e of list.slice(0, 12)) {
			const [fa, fd] = forms[e.L];
			const { nA, nD } = exact(e.g, fa, fd);
			e.nA = nA;
			e.nD = nD;
			e.score = Math.min(nA, nD * 1.5) + (nA + nD) * 0.04 - e.pen;
			if (!best || e.score > best.score) best = e;
		}
		return best;
	};
	let best = choose();
	if (best.nD < 4) {
		relaxD = true;
		const b2 = choose();
		if (b2.score > best.score) best = b2;
		else relaxD = false;
	}
	if (isCap && best.nA < 8) {
		relaxA = true;
		const b2 = choose();
		if (b2.score > best.score) best = b2;
		else relaxA = false;
	}
	const { g, L } = best;
	const [fa, fd] = forms[L];
	const ux = g.ux;
	const uz = g.uz;
	const vx = -uz;
	const vz = ux;

	// --- saflar: geçerli olmayan yerler boş kalır (o asker çıkmaz)
	const att = [];
	for (const s of fa.slots) {
		const x = g.ax + vx * s.lat - ux * s.dep;
		const z = g.az + vz * s.lat - uz * s.dep;
		if (allowA(x, z)) att.push(s);
	}
	const def = [];
	for (const s of fd.slots) {
		// savunan karşıya bakar: sağ yanı saldıranınkinin tersi
		const x = g.dx - vx * s.lat + ux * s.dep;
		const z = g.dz - vz * s.lat + uz * s.dep;
		if (allowD(x, z)) def.push(s);
	}
	const machines = [];
	for (const m of fa.machines) {
		const x = g.ax + vx * m.lat - ux * m.dep;
		const z = g.az + vz * m.lat - uz * m.dep;
		if (allowA(x, z)) machines.push(m);
	}
	if (isCap && !machines.length && fa.machines.length) machines.push(fa.machines[0]); // kuşatmada en az bir makine
	// kuşatma: savunan okçular saldırana bakan surun üstünde (kale önünde yer olmasa da savunma görünür)
	if (isCap && KO) {
		const sc = Castle.scale;
		let bw = null;
		let bd = -2;
		for (const w of Castle.walls) {
			const mx = (w[0] + w[2]) / 2;
			const mz = (w[1] + w[3]) / 2;
			const l = Math.hypot(mx, mz) || 1;
			const d = -(mx / l) * ux - (mz / l) * uz; // surun dışa bakışı · saldırana doğru
			if (d > bd) {
				bd = d;
				bw = w;
			}
		}
		// kapı kulesinin üstü değil (ön surun ortası boş kalır)
		for (const t of lo ? [0.22, 0.36, 0.72] : [0.2, 0.34, 0.66, 0.8]) {
			const lx = bw[0] + (bw[2] - bw[0]) * t;
			const lz = bw[1] + (bw[3] - bw[1]) * t;
			def.push({ lat: 0, dep: 0, rank: 9, kind: ARCHER, fix: { x: K.x + lx * sc, z: K.z + lz * sc, rel: bw[4] * sc, castle: KO } });
		}
	}

	// --- yürüyüş: saldıran kendi ilinin içinden (il kenarına dayanmadan) başlar; en çok 1,9, en az 0,6 birim
	const deep = isCap || amphib ? allowA : (x, z) => allowA(x, z) && b.borderDist(x, z, 0.4) >= 0.4;
	let march = 0.6;
	for (const m of [1.9, 1.65, 1.4, 1.15, 0.9]) {
		const bx = g.ax - ux * m;
		const bz = g.az - uz * m;
		if (probe(bx, bz, ux, uz, fa.W, fa.D, deep) >= 0.8) {
			march = m;
			break;
		}
	}
	// çarpışma: ön saflar arasındaki boşluk karaysa ortada buluşurlar; su varsa (göl, boğaz) kıyıda durup ok atarlar
	const land = (x, z) => !b.lakeAt(x, z) && (inS(x, z) || inT(x, z));
	const gp = isCap ? 0.6 : (best.c.gap || 0);
	let lineLand = true;
	for (const l of [-0.33, 0, 0.33]) if (!land(g.bx + vx * l * fa.W, g.bz + vz * l * fa.W)) lineLand = false;
	const engage = 0.17 + (lineLand ? gp / 2 : 0);
	// zafer hücumu: saldıranlar hedef ilin karasında ne kadar ilerleyebilir (suya yürümesinler)
	let charge = 0.5;
	for (const d of [1.9, 1.6, 1.3, 1.0, 0.75]) {
		let ok = true;
		for (const l of [-0.35, 0, 0.35]) {
			const x = g.ax + ux * d + vx * l * fa.W;
			const z = g.az + uz * d + vz * l * fa.W;
			if (!land(x, z)) ok = false;
		}
		if (ok) {
			charge = d;
			break;
		}
	}
	// savunan safını kurar: biraz geriden öne çıkar
	let form = 0.75;
	if (probe(g.dx + ux * form, g.dz + uz * form, -ux, -uz, fd.W, fd.D, allowD) < 0.6) form = 0.35;

	const gy = (x, z) => b.groundAt(x, z) + SEL_LIFT;
	const lineW = Math.max(fa.front, fd.front ?? fd.W) + 0.3;
	const mx = (g.ax + g.dx) / 2;
	const mz = (g.az + g.dz) / 2;
	const r = Math.max(fa.W, fd.W) / 2 + 1.7;
	const rearA = march + fa.D + 0.5;
	const rearD = isCap ? 0.3 : fd.D + form + 0.5;
	const plan = {
		siege: isCap,
		amphib,
		level: L,
		u: { x: ux, z: uz },
		v: { x: vx, z: vz },
		att: { ux, uz, sx: g.ax - ux * march, sz: g.az - uz * march, ex: g.ax, ez: g.az, slots: att, W: fa.W, D: fa.D },
		def: { ux: -ux, uz: -uz, sx: g.dx + ux * form, sz: g.dz + uz * form, ex: g.dx, ez: g.dz, slots: def, W: fd.W, D: fd.D },
		machines,
		march,
		engage,
		charge,
		line: { x: g.bx, z: g.bz, w: lineW, y: SEL_LIFT },
		clear: [g.ax - ux * rearA, g.az - uz * rearA, g.dx + ux * rearD, g.dz + uz * rearD, r],
		mid: { x: mx, y: gy(mx, mz), z: mz },
		attC: { x: g.ax - ux * fa.D * 0.5, z: g.az - uz * fa.D * 0.5 },
		startC: { x: g.ax - ux * (march + fa.D * 0.5), z: g.az - uz * (march + fa.D * 0.5) },
		defC: { x: g.dx + ux * fd.D * 0.5, z: g.dz + uz * fd.D * 0.5 },
		castle: K,
		span: fa.D + fd.D + 2 * GAP + march,
		width: Math.max(fa.W, fd.W),
		src,
		target,
		dbg: { va: best.va, vd: best.vd, gap: best.c.gap || 0, score: best.score, n: cands.length, relax: relaxD, L },
	};
	for (const k of ['attC', 'startC', 'defC']) plan[k].y = gy(plan[k].x, plan[k].z);
	plan.sites = sites;
	return plan;
}

// ------------------------------------------------------------------ kamera

/** Kamera yönü (yaw): yatay bakış yönü (dx, dz) olan açı (kamera.js: bakış = (sin yaw, -cos yaw)). */
export const yawOf = (dx, dz) => Math.atan2(dx, -dz);

/**
 * Eylem eksenine göre kamera açısı: φ = 0 saldıranın tam arkası, π/2 yanı, π karşısı (savunanın arkası);
 * s = ±1 kameranın eksenin hangi yanında kaldığı (180° kuralı: bir savaşın bütün çekimleri aynı yanda).
 */
export function yawAt(plan, s, phi) {
	const u = plan.u;
	const v = plan.v;
	const c = Math.cos(phi);
	const sn = Math.sin(phi) * s;
	// kamera konumu yönü: c·(-u) + sn·v; bakış bunun tersi
	return yawOf(c * u.x - sn * v.x, c * u.z - sn * v.z);
}

/**
 * Kadraj uzaklığı: seçilen ordu dikdörtgenleri (which: 'att' | 'def' | 'both' | 'start' | 'all') bu açıdan
 * ekrana sığsın (yatay ve dikey, pay ile). Telefon dikeyde yatay görüş dar: yan bakışta saflar kırpılmasın.
 */
export function stageDist(app, plan, c, yaw, pitch, which = 'both', { pad = 1.18, min = 7, max = 24 } = {}) {
	const cam = app.camera;
	const vt = Math.tan((cam.fov * Math.PI) / 360);
	const ht = vt * (app.cam.aspect || cam.aspect || 1);
	const dx = Math.sin(yaw);
	const dz = -Math.cos(yaw);
	let H = 0;
	let V = 0;
	const add = (x, z) => {
		const ox = x - c.x;
		const oz = z - c.z;
		H = Math.max(H, Math.abs(ox * -dz + oz * dx));
		V = Math.max(V, Math.abs(ox * dx + oz * dz));
	};
	const rect = (fx, fz, ux, uz, W, D) => {
		const vx = -uz;
		const vz = ux;
		for (const [l, d] of [[-0.5, 0], [0.5, 0], [-0.5, 1], [0.5, 1]]) add(fx + vx * l * W - ux * d * D, fz + vz * l * W - uz * d * D);
	};
	const A = plan.att;
	const D = plan.def;
	if (which === 'start' || which === 'all') rect(A.sx, A.sz, A.ux, A.uz, A.W, A.D);
	if (which !== 'def' && which !== 'start') rect(A.ex, A.ez, A.ux, A.uz, A.W, A.D);
	if (which !== 'att' && which !== 'start') rect(D.ex, D.ez, D.ux, D.uz, D.W, D.D);
	if (plan.castle && (which === 'all' || which === 'both')) add(plan.castle.x, plan.castle.z);
	const needW = (H * pad) / ht;
	const needV = ((V * Math.sin(pitch) + 0.5 * Math.cos(pitch)) * pad) / vt;
	return clamp(Math.max(needW, needV) + 1.2, min, max);
}

/**
 * Kameradan odak noktasına görüş ne kadar örtülü: ışın boyunca arazi (kalkık iller dahil), kaleler ve
 * ünlü yapılar. 0 = açık. (Ağaçlar savaş alanında zaten alçalır.)
 */
export function occlusion(app, plan, px, py, pz, yaw, pitch, dist) {
	const b = app.board;
	const cp = Math.cos(pitch);
	const cx = px - Math.sin(yaw) * cp * dist;
	const cy = py + Math.sin(pitch) * dist;
	const cz = pz + Math.cos(yaw) * cp * dist;
	let s = 0;
	const N = 18;
	for (let i = 1; i < N; i++) {
		const t = 0.05 + (i / N) * 0.9;
		const x = px + (cx - px) * t;
		const z = pz + (cz - pz) * t;
		const y = py + (cy - py) * t;
		let g = b.groundAt(x, z);
		if (b.inProv(plan.src, x, z) || b.inProv(plan.target, x, z)) g += SEL_LIFT;
		// arazi: ışın yere yakın geçerse de say (dağ sırtı kadrajı bölmesin, ön planı yamaç kaplamasın)
		s += Math.max(0, g + 0.12 - y) * 2 + Math.max(0, 0.6 - (y - g)) * 0.5;
		for (const st of plan.sites) {
			if (st.sea) continue;
			const d = Math.hypot(x - st.x, z - st.z);
			if (d < (st.r || 1) * 0.8 && y < st.y + (st.r || 1) * 1.8) s += 0.8; // yapı gövdesi (minare, kule dahil)
		}
		for (const k of app.castles || []) {
			if (!k.group.visible) continue;
			const p = k.group.position;
			if (plan.castle && Math.abs(p.x - plan.castle.x) + Math.abs(p.z - plan.castle.z) < 0.01 && t < 0.02) continue;
			const d = Math.hypot(x - p.x, z - p.z);
			if (d < 1.6 && y < p.y + 3.2) s += 1.2;
		}
	}
	return s;
}

/**
 * Örtülmeyen en iyi açı: base çevresindeki sapmalardan (offs) en az örtüleni; eşitlikte base'e yakın olan.
 * Hepsi örtülüyse eğim artırılarak yeniden denenir. Dönen {yaw, pitch}.
 */
export function clearView(app, plan, p, base, offs, pitch, dist) {
	let best = null;
	for (let k = 0; k < 3; k++) {
		const pt = clamp(pitch + k * 0.14, 0.2, 1.3);
		for (const o of offs) {
			const yaw = base + o;
			const sc = occlusion(app, plan, p.x, p.y, p.z, yaw, pt, dist) + Math.abs(o) * 0.12 + k * 0.5;
			if (!best || sc < best.sc) best = { sc, yaw, pitch: pt };
		}
		if (best.sc < 0.5) break;
	}
	return best;
}
