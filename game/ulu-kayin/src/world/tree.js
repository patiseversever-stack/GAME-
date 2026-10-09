// Ulu Kayın: dev ak kayın gövdesi, yan dallar, taç, köprü dalları, kuş yuvası, kökler ve
// dört mevsimin yaprak kümeleri. Yaprak türü yüksekliğe göre seçilir: tepede kiraz çiçeği,
// ortada yaz yeşili, aşağıda güz altını, en altta kar.
//
// Oynanış için gölge yapan her şey basit şekillerle de kaydedilir (kapsül, elipsoit); bunlar
// görsel modellerle aynı ölçüdedir ve rüzgârda aynı formülle sallanır.

import * as THREE from 'three';
import { Builder } from '../gfx/builder.js';
import { rng, TAU, clamp, smoothstep, lerp } from '../core/math.js';
import { trunkRadius, TRUNK_TOP, PITCH, PATH_TOP, PATH_T, BRIDGES, bridgeOut, pathY, seasonWeights } from './layout.js';

/** Kök kanatlarının azimutları: son bölümde patikanın indiği taraftan uzak tutulur. */
const BUTTRESS = [4.85, 5.72, 0.48, 1.3];

/** Gövdenin görsel yüzey yarıçapı (kabuk dalgaları + kök kanatları + taç çatalı). */
export function trunkSurfaceR(th, y) {
	const R = trunkRadius(y);
	const fl = 1 + 0.022 * Math.sin(7 * th + 0.13 * y) + 0.014 * Math.sin(12 * th - 0.31 * y + 1.3);
	const yb = Math.max(y, 0);
	let bt = 0;
	for (const a of BUTTRESS) {
		const d = Math.atan2(Math.sin(th - a), Math.cos(th - a));
		bt += Math.exp(-(d * d) / 0.045) * 1.55;
	}
	bt *= Math.exp(-yb / 1.9);
	const crown = Math.pow(Math.max(0, Math.cos(5 * (th - 0.45))), 2) * 0.75 * smoothstep(49.5, 53.5, y);
	return R * fl + bt + crown;
}

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const polar = (r, th, y) => V3(Math.cos(th) * r, y, Math.sin(th) * r);

/** Catmull-Rom ile seyrek kontrol noktalarından yumuşak eğri. */
function smoothPts(ctrl, per = 4) {
	const c = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
	return c.getPoints(Math.max(2, (ctrl.length - 1) * per));
}

export function buildTree(curve, tier) {
	const R = rng(1453);
	const T = tier;
	const density = T.leafDensity;

	const branches = new Builder(); // dallar (rüzgârla sallanır, kamera açıklığı)
	const extras = new Builder(); // köprü halatları, payandalar, kuş yuvası (köşe renkli)
	const caps = []; // oynanış kapsülleri
	const clusters = []; // yaprak kümeleri

	// ------------------------------------------------------------------------------------------
	// Dal yardımcıları
	// ------------------------------------------------------------------------------------------
	const barkCol = (thick) => (i, t) => {
		// kalın dallar ak, ince uçlar kızılımsı-kahve (kayın sürgünleri)
		const k = smoothstep(0.35, 0.08, thick * (1 - t * 0.85));
		return [lerp(1, 0.52, k), lerp(1, 0.38, k), lerp(1, 0.33, k), lerp(0.85, 1, t)];
	};

	/**
	 * Bir dalı geometriye ve oynanış kapsüllerine ekler.
	 * anchor: sallanma çapası (dalın ucu), w0/w1: dalın başında ve ucundaki sallanma ağırlığı.
	 */
	const addBranch = (ctrl, r0, r1, anchor, w0, w1, segs = 7) => {
		const pts = smoothPts(ctrl, 4);
		const n = pts.length;
		const ph = R() * 10;
		// kalınlık: uca doğru incelir, boyunca hafif boğumlanır (boru gibi düz görünmesin)
		const rad = pts.map((_, i) => {
			const t = i / (n - 1);
			return lerp(r0, r1, Math.pow(t, 0.7)) * (1 + 0.1 * Math.sin(i * 1.9 + ph) * (1 - t)) * (1 + 0.35 * Math.exp(-t * 14));
		});
		branches.tube(pts, rad, segs, barkCol(r0), {
			uvScale: 0.6,
			sway: (i, t) => branches.setSway(anchor.x, anchor.y, anchor.z, lerp(w0, w1, Math.pow(t, 1.6))),
		});
		for (let i = 0; i < n - 1; i += 2) {
			const j = Math.min(n - 1, i + 2);
			const ra = rad[i];
			if (ra < 0.1) break;
			caps.push({
				a: pts[i].clone(),
				b: pts[j].clone(),
				r: (ra + rad[j]) * 0.5 * 0.92,
				anchor,
				wa: lerp(w0, w1, Math.pow(i / (n - 1), 1.6)),
				wb: lerp(w0, w1, Math.pow(j / (n - 1), 1.6)),
			});
		}
		branches.setSway(0, 0, 0, 0);
		return pts;
	};

	const addCluster = (c, r, anchor, w, forceType = -1, flat = 1) => {
		clusters.push({ c: c.clone(), r, rx: r * 1.15, ry: r * 0.78 * flat, rz: r * 1.15, anchor, w, type: forceType });
	};

	// ------------------------------------------------------------------------------------------
	// Yan dallar: patikanın iki geçişinin tam ortasından çıkar (yürüyüşe çarpmaz).
	// ------------------------------------------------------------------------------------------
	const sideBranches = [];
	for (let y = 4.5; y < 48.5; y += R.range(1.55, 2.3)) {
		const pass = ((PATH_TOP - y) / PITCH) * TAU;
		const az = pass + Math.PI + R.range(-0.55, 0.55);
		// köprülerin yakınına dal koyma
		let near = false;
		for (const b of BRIDGES) {
			const dy = Math.abs(pathY(b.th) - y);
			const da = Math.abs(Math.atan2(Math.sin(az - b.th), Math.cos(az - b.th)));
			if (dy < 4.5 && da < b.w + 0.7) near = true;
		}
		if (near) continue;
		sideBranches.push({ y, az });
		// bazen aynı yükseklikte karşı yöne ikinci dal
		if (R() < 0.35) {
			const az2 = az + R.range(-0.9, 0.9) + (R() < 0.5 ? 0.9 : -0.9);
			sideBranches.push({ y: y + R.range(-0.4, 0.4), az: az2 });
		}
	}

	for (const sb of sideBranches) {
		const { y, az } = sb;
		const Rt = trunkRadius(y);
		const winter = y < 13;
		// Uzunluk sınırlı: kamera yörüngesine (gövdeden ~10 birim) uzanıp görüşü kapatmasın.
		const L = (winter ? R.range(4, 6) : R.range(4.8, 7.4)) * (y > 40 ? 1.12 : 1);
		const drift = R.range(-0.22, 0.22);
		const rise = R.range(0.3, 0.55);
		const kink = R.range(-0.35, 0.35);
		const ctrl = [
			polar(Rt * 0.55, az, y - 0.2),
			polar(Rt + 0.7, az + drift * 0.15, y + 0.15),
			polar(Rt + L * 0.42, az + drift * 0.5, y + L * rise * 0.3 + kink),
			polar(Rt + L * 0.75, az + drift * 0.8, y + L * rise * 0.7 - kink * 0.5),
			polar(Rt + L, az + drift * 1.2, y + L * rise),
		];
		const tip = ctrl[4];
		const sw = L / 8;
		const r0 = lerp(0.42, 0.7, (L - 4.5) / 5);
		const pts = addBranch(ctrl, r0, 0.07, tip, 0, sw);
		// alt dallar
		const nTw = winter ? 2 : R.range(1, 3.6) | 0;
		for (let k = 0; k < nTw; k++) {
			const t = R.range(0.45, 0.85);
			const p = pts[Math.round(t * (pts.length - 1))];
			const dir = V3(Math.cos(az + drift), 0, Math.sin(az + drift));
			const side = V3(-dir.z, 0, dir.x).multiplyScalar(R.sign() * R.range(0.6, 1));
			const len = R.range(1.8, 3.4);
			const end = p.clone().addScaledVector(dir, len * 0.55).addScaledVector(side, len * 0.6).add(V3(0, len * R.range(0.25, 0.6), 0));
			const mid = p.clone().lerp(end, 0.5).add(V3(0, 0.15, 0));
			const wA = sw * Math.pow(t, 1.6);
			addBranch([p, mid, end], lerp(r0, 0.07, t) * 0.55, 0.04, tip, wA, wA + 0.25, 5);
			if (!winter) addCluster(end, R.range(1.05, 1.6), tip, wA + 0.25);
			else if (R() < 0.7) addCluster(end.clone().add(V3(0, 0.12, 0)), R.range(0.35, 0.5), tip, wA + 0.25, 3, 0.7);
		}
		// uçta ve dal boyunca kümeler
		if (!winter) {
			addCluster(tip, R.range(1.5, 2.2), tip, sw);
			addCluster(pts[Math.round(pts.length * 0.72)], R.range(1.2, 1.8), tip, sw * 0.6);
		} else {
			// kış: dalların üstünde kar topakları
			for (const t of [0.4, 0.62, 0.84]) {
				const p = pts[Math.round(t * (pts.length - 1))];
				addCluster(p.clone().add(V3(0, 0.22, 0)), R.range(0.38, 0.6), tip, sw * Math.pow(t, 1.6), 3, 0.6);
			}
		}
	}

	// ------------------------------------------------------------------------------------------
	// Taç: gövde 53 m'de beş ana kola ayrılır; kollar çiçekli dev bir şemsiye taşır.
	// ------------------------------------------------------------------------------------------
	const limbs = 6;
	for (let i = 0; i < limbs; i++) {
		const az = 0.45 + (i / limbs) * TAU + R.range(-0.18, 0.18);
		const L = R.range(12.5, 16);
		const up = R.range(7, 10);
		const ctrl = [
			polar(0.8, az, TRUNK_TOP - 3.5),
			polar(2.6, az + 0.05, TRUNK_TOP + 0.4),
			polar(5.4, az + 0.12, TRUNK_TOP + up * 0.45),
			polar(L * 0.75, az + 0.2, TRUNK_TOP + up * 0.85),
			polar(L, az + 0.26, TRUNK_TOP + up * 0.8),
		];
		const tip = ctrl[4];
		const pts = addBranch(ctrl, 1.3, 0.14, tip, 0, 0.9, 9);
		// her koldan ikincil dallar ve bol çiçek
		for (let k = 0; k < 5; k++) {
			const t = 0.32 + k * 0.15;
			const p = pts[Math.round(t * (pts.length - 1))];
			const a2 = az + R.range(-1.1, 1.1);
			const len = R.range(3.8, 6.5);
			const end = p.clone().add(V3(Math.cos(a2) * len, R.range(0.6, 3.4), Math.sin(a2) * len));
			const mid = p.clone().lerp(end, 0.5).add(V3(0, 0.6, 0));
			addBranch([p, mid, end], lerp(1.3, 0.14, t) * 0.5, 0.06, tip, 0.9 * t, 1.1, 6);
			addCluster(end, R.range(2.3, 3.1), tip, 1.1);
			addCluster(mid.clone().add(V3(0, 1.0, 0)), R.range(1.8, 2.4), tip, 0.9);
			// aşağı sarkan salkım: tacın altını doldurur
			if (R() < 0.6) addCluster(end.clone().add(V3(0, -1.6, 0)), R.range(1.4, 1.9), tip, 1.1, -1, 1.25);
		}
		addCluster(tip.clone().add(V3(0, 0.6, 0)), R.range(2.6, 3.3), tip, 0.9);
		addCluster(pts[Math.round(pts.length * 0.6)].clone().add(V3(0, 1.5, 0)), R.range(2.4, 3.0), tip, 0.6);
	}
	// tepe: kolların arasını kapatan çiçek kubbesi
	for (let i = 0; i < 14; i++) {
		const a = R() * TAU;
		const r = R.range(0, 9);
		addCluster(polar(r, a, TRUNK_TOP + R.range(8.5, 12) - r * 0.25), R.range(2.6, 3.4), polar(r, a, TRUNK_TOP + 9), 0.6);
	}
	// başlangıç platformunu gölgeleyen sarkan çiçek salkımları
	for (let i = 0; i < 6; i++) {
		const a = R.range(-0.8, 1.6);
		const r = trunkRadius(PATH_TOP) + R.range(1.2, 4.5);
		addCluster(polar(r, a, PATH_TOP + R.range(3.6, 5.5)), R.range(1.5, 2.1), polar(r, a, PATH_TOP + 5), 0.5);
	}

	// ------------------------------------------------------------------------------------------
	// Köprü dalları: patikanın gövdeden ayrılıp dışarı kıvrıldığı yerde yürüyüş yolunu taşıyan
	// kalın dal; üstünde gölge veren yapraklı sürgünler. Üçüncü köprüde dev kuş yuvası.
	// ------------------------------------------------------------------------------------------
	const tmp = {};
	const nests = [];
	for (const b of BRIDGES) {
		// Taşıyıcı dal yalnızca patikanın gövdeden belirgin ayrıldığı kısımda; uçları çaprazlama gövdeye dalar.
		const half = (Math.acos(clamp(2 / b.out - 1, -1, 1)) / Math.PI) * b.w;
		const th0 = b.th - half;
		const th1 = b.th + half;
		const s0 = curve.sAtTheta(th0);
		const s1 = curve.sAtTheta(th1);
		curve.sample(curve.sAtTheta(b.th), tmp);
		const apex = V3(tmp.x, tmp.y, tmp.z);
		const out = V3(tmp.sx, 0, tmp.sz);
		// Asma köprü: gövdeye yakın kısımda çapraz payandalar, uzak kısımda yukarıdaki dala halatlar.
		const struts = [];
		for (let s = s0 - 1.5; s <= s1 + 1.5; s += 1.7) {
			curve.sample(s, tmp);
			const off = Math.hypot(tmp.x, tmp.z) - trunkRadius(tmp.y);
			if (off < 1.5 || off > 3.6) continue;
			const a = V3(tmp.x, tmp.y - PATH_T + 0.02, tmp.z);
			const rr = trunkRadius(tmp.y - 2.2) - 0.15;
			const azT = Math.atan2(tmp.z, tmp.x);
			const bb = polar(rr, azT, tmp.y - 2.4);
			extras.tube([a, bb], [0.08, 0.1], 5, () => [0.42, 0.27, 0.17, 0.95], { capEnd: true, capStart: true });
			struts.push(s);
		}

		// Gölge dalı: köprünün üstünde, gövdeden (iki patika geçişinin ortasından) dışarı uzanan
		// yapraklı dal. Güneşi doğru açıya getirirsen yaprakların gölgesi köprüye düşer.
		const leafType = { blossom: 0, green: 1, gold: 2, snow: 3 }[b.leaves];
		const yB = pathY(b.th) + PITCH * 0.5;
		const Rt = trunkRadius(yB);
		const reach = trunkRadius(pathY(b.th)) + b.out + 1.6;
		const azB = b.th + R.range(-0.12, 0.12);
		const over = [
			polar(Rt * 0.55, azB, yB - 0.2),
			polar(Rt + 0.9, azB, yB + 0.1),
			polar(lerp(Rt, reach, 0.55), azB + 0.06, yB + 0.75),
			polar(reach, azB + 0.12, yB + 1.35),
		];
		const tip = over[3];
		const wTip = leafType === 3 ? 0.4 : 0.75;
		const opts = addBranch(over, 0.5, 0.08, tip, 0, wTip, 7);
		// halatlar: köprünün uzak kısmını yukarıdaki dala asar (iki yandan)
		for (let k = 0; k < 4; k++) {
			const s = lerp(s0, s1, 0.18 + k * 0.21);
			curve.sample(s, tmp);
			const off = Math.hypot(tmp.x, tmp.z) - trunkRadius(tmp.y);
			if (off < 3.0) continue;
			const p = opts[Math.round(lerp(0.45, 0.9, k / 3) * (opts.length - 1))];
			for (const side of [-1, 1]) {
				const a = V3(tmp.x + tmp.sx * 0.85 * side, tmp.y + 0.72, tmp.z + tmp.sz * 0.85 * side);
				extras.tube([a, p.clone().add(V3(0, -0.15, 0))], [0.026, 0.026], 4, () => [0.62, 0.5, 0.36, 1], { capEnd: false });
			}
		}
		// köprü yayı boyunca yan dallar: kümeler yürüyüş yolunun 2.6+ birim üstünde
		const nCl = b.nest ? 3 : 2;
		for (let k = 0; k < nCl; k++) {
			const s = lerp(s0, s1, nCl === 2 ? 0.3 + k * 0.4 : 0.2 + k * 0.3);
			curve.sample(s, tmp);
			const p = opts[Math.round(lerp(0.55, 0.95, k / Math.max(1, nCl - 1)) * (opts.length - 1))];
			const end = V3(tmp.x, Math.max(tmp.y + 3.9, p.y + 0.3), tmp.z).addScaledVector(V3(tmp.sx, 0, tmp.sz), R.range(0.2, 0.9));
			const mid = p.clone().lerp(end, 0.5).add(V3(0, 0.45, 0));
			addBranch([p, mid, end], 0.16, 0.05, tip, wTip * 0.7, wTip, 5);
			if (leafType === 3) addCluster(end.clone().add(V3(0, 0.15, 0)), 0.6, tip, wTip, 3, 0.7);
			else addCluster(end.clone().add(V3(0, 0.35, 0)), R.range(1.55, 1.95), tip, wTip, leafType);
		}
		if (leafType !== 3) addCluster(tip.clone().add(V3(0, 0.5, 0)), R.range(1.6, 2.1), tip, wTip, leafType);
		if (b.nest) nests.push({ c: apex.clone(), out });
	}

	// ------------------------------------------------------------------------------------------
	// Yerdeki kökler: kök kanatlarından adanın karına yayılır.
	// ------------------------------------------------------------------------------------------
	for (const a of BUTTRESS) {
		const Rt = trunkRadius(0);
		for (const da of [-0.12, 0.1]) {
			const L = R.range(6.5, 9.5);
			const az = a + da;
			// yarı gömülü, kıvrımlı: karın altından yer yer yükselip yeniden dalar
			const ctrl = [
				polar(Rt * 0.7, az, 1.2),
				polar(Rt + 1.2, az + da * 0.6, 0.35),
				polar(Rt + L * 0.35, az + da * 1.3 + R.range(-0.08, 0.08), 0.05),
				polar(Rt + L * 0.6, az + da * 1.8 + R.range(-0.1, 0.1), -0.1),
				polar(Rt + L * 0.82, az + da * 2.2, -0.05),
				polar(Rt + L, az + da * 2.5, -0.5),
			];
			addBranch(ctrl, R.range(0.6, 0.8), 0.18, ctrl[5], 0, 0, 8);
		}
	}

	branches.fixWinding();

	// ------------------------------------------------------------------------------------------
	// Gövde: halkalar halinde, analitik normal, kabuk dokusu silindirik eşlenir.
	// ------------------------------------------------------------------------------------------
	const trunk = new Builder();
	const SEG = T.id >= 1 ? 72 : 52;
	const Y0 = -4;
	const Y1 = TRUNK_TOP + 1.6;
	const dy = 0.42;
	const rings = Math.ceil((Y1 - Y0) / dy) + 1;
	const e = 0.01;
	const N = new THREE.Vector3();
	const St = new THREE.Vector3();
	const Sy = new THREE.Vector3();
	// dal dipleri: gövdede çevrelerine hafif kapanma gölgesi
	const bases = sideBranches.map((b) => ({ y: b.y, az: b.az }));
	for (let j = 0; j < rings; j++) {
		const y = Math.min(Y1, Y0 + j * dy);
		for (let i = 0; i <= SEG; i++) {
			const th = (i / SEG) * TAU;
			const r = trunkSurfaceR(th, y);
			const rT = (trunkSurfaceR(th + e, y) - trunkSurfaceR(th - e, y)) / (2 * e);
			const rY = (trunkSurfaceR(th, y + e) - trunkSurfaceR(th, y - e)) / (2 * e);
			const c = Math.cos(th);
			const s = Math.sin(th);
			St.set(rT * c - r * s, 0, rT * s + r * c);
			Sy.set(rY * c, 1, rY * s);
			N.crossVectors(Sy, St).normalize();
			// ortam kapanması
			let ao = 1;
			// patikanın altı: tahtanın gövdeye değdiği yerin hemen altında koyu çizgi
			const base = ((th % TAU) + TAU) % TAU;
			for (let thA = base; ; thA += TAU) {
				const yp = pathY(thA);
				if (yp < -1) break;
				const hug = 1 - smoothstep(0.5, 1.3, bridgeOut(thA));
				if (hug <= 0) continue;
				const d = yp - y; // + : köşe patikanın altında
				if (d > 0 && d < 4) ao *= 1 - hug * (0.42 * Math.exp(-((d - 0.5) ** 2) / 0.35) + 0.18 * Math.exp(-((d - 1.6) ** 2) / 1.6));
				else if (d <= 0 && d > -0.6) ao *= 1 - hug * 0.22 * Math.exp(-(d * d) / 0.03);
			}
			// zemin
			ao *= 0.5 + 0.5 * smoothstep(-0.6, 2.2, y);
			// dal dipleri
			for (const b of bases) {
				const dyb = y - b.y;
				if (Math.abs(dyb) > 1.6) continue;
				const da = Math.atan2(Math.sin(th - b.az), Math.cos(th - b.az));
				ao *= 1 - 0.3 * Math.exp(-(da * da) / 0.05 - (dyb * dyb) / 0.6) * (dyb < 0 ? 1.2 : 0.6);
			}
			// renk: tabanda toprakla kirlenmiş, taç yakınında daha sıcak
			const dirt = 1 - smoothstep(-0.5, 2.5, y);
			const warm = smoothstep(44, 52, y);
			const cr = lerp(1, 0.72, dirt) * lerp(1, 1.02, warm);
			const cg = lerp(1, 0.66, dirt) * lerp(1, 0.99, warm);
			const cb = lerp(1, 0.62, dirt) * lerp(1, 0.96, warm);
			trunk.vert(c * r, y, s * r, N.x, N.y, N.z, cr, cg, cb, clamp(ao, 0.2, 1), (i / SEG) * 4, y / 5.6);
		}
	}
	const ring = SEG + 1;
	for (let j = 0; j < rings - 1; j++) {
		for (let i = 0; i < SEG; i++) {
			const a = j * ring + i;
			trunk.quad(a, a + 1, a + ring + 1, a + ring);
		}
	}
	// tepe kapağı
	const cc = trunk.vert(0, Y1 + 0.3, 0, 0, 1, 0, 0.9, 0.88, 0.85, 0.7, 0, 0);
	for (let i = 0; i < SEG; i++) trunk.tri(cc, (rings - 1) * ring + i + 1, (rings - 1) * ring + i);
	trunk.fixWinding();

	// ------------------------------------------------------------------------------------------
	// Patikanın üstünde boşluk bırak: Zifir'in yürüdüğü koridora giren kümeleri küçült ya da kaldır.
	// ------------------------------------------------------------------------------------------
	for (let ci = clusters.length - 1; ci >= 0; ci--) {
		const k = clusters[ci];
		for (let i = 0; i < curve.n; i += 2) {
			const dyc = k.c.y - curve.Y[i];
			if (dyc < -6 || dyc > 8) continue;
			const dh = Math.hypot(k.c.x - curve.X[i], k.c.z - curve.Z[i]);
			const roomH = dh - 1.2; // yatayda koridor kenarına uzaklık
			if (roomH > k.rx) continue;
			// koridor: tahtanın 0.6 altı ile 2.2 üstü arası
			if (dyc - k.ry > 2.2 || dyc + k.ry < -0.6) continue;
			const fitV = dyc > 0.8 ? dyc - 2.2 : -0.6 - dyc;
			const fit = Math.max(roomH, fitV);
			const scale = fit / k.rx;
			if (scale < 0.45) {
				k.r = 0;
				break;
			}
			k.r *= scale;
			k.rx *= scale;
			k.ry *= scale;
			k.rz *= scale;
		}
		if (k.r < 0.3) clusters.splice(ci, 1);
	}

	// ------------------------------------------------------------------------------------------
	// Yaprak kartları (örneklemeli): her kümede yoğunluğa göre kart, türü yükseklikten.
	// ------------------------------------------------------------------------------------------
	const iPos = [];
	const iCl = [];
	const iData = [];
	const iTint = [];
	const iSway = [];
	const sw4 = [0, 0, 0, 0];
	const occl = [];
	for (const k of clusters) {
		seasonWeights(k.c.y, sw4);
		let type = k.type;
		const ncards = Math.max(5, Math.round(density * clamp(k.r * k.r * (type === 3 ? 7 : 5.2), 6, 30)));
		for (let n = 0; n < ncards; n++) {
			let tt = type;
			if (tt < 0) {
				// geçiş bölgelerinde iki mevsim karışır
				let x = R();
				tt = 0;
				while (tt < 3 && x > sw4[tt]) {
					x -= sw4[tt];
					tt++;
				}
				if (tt === 3) tt = sw4[2] > 0.05 ? 2 : 1; // kış kümeleri ayrıca konuldu
			}
			// elipsoidin içinde, yüzeye yakın
			const u = R() * TAU;
			const v = Math.acos(R.range(-0.85, 1));
			const rr = Math.pow(R(), 0.35);
			const px = Math.sin(v) * Math.cos(u) * k.rx * rr * 0.82;
			const py = Math.cos(v) * k.ry * rr * 0.82;
			const pz = Math.sin(v) * Math.sin(u) * k.rz * rr * 0.82;
			iPos.push(k.c.x + px, k.c.y + py, k.c.z + pz);
			iCl.push(k.c.x, k.c.y, k.c.z, k.r);
			const size = k.r * (tt === 3 ? R.range(0.9, 1.25) : R.range(0.85, 1.2));
			iData.push(size, R() * TAU, tt, R());
			// renk sapması
			const b = R.range(0.86, 1.1);
			if (tt === 0) iTint.push(b * R.range(0.97, 1.04), b, b * R.range(0.95, 1.05));
			else if (tt === 1) iTint.push(b * R.range(0.9, 1.05), b, b * R.range(0.85, 1));
			else if (tt === 2) iTint.push(b * R.range(0.98, 1.06), b * R.range(0.85, 1.05), b * R.range(0.8, 1));
			else iTint.push(b, b, b);
			iSway.push(k.anchor.x, k.anchor.y, k.anchor.z, k.w);
		}
		// oyun için elipsoit (biraz küçük: gölgenin seyrek kenarı oyuncuyu cezalandırmasın)
		occl.push({ c: k.c, rx: k.rx * 0.78, ry: k.ry * 0.78, rz: k.rz * 0.78, anchor: k.anchor, w: k.w, snow: type === 3 });
	}
	const leafGeo = new THREE.InstancedBufferGeometry();
	const quad = new THREE.PlaneGeometry(1, 1);
	leafGeo.setIndex(quad.index);
	leafGeo.setAttribute('position', quad.getAttribute('position'));
	leafGeo.setAttribute('iPos', new THREE.InstancedBufferAttribute(new Float32Array(iPos), 3));
	leafGeo.setAttribute('iCluster', new THREE.InstancedBufferAttribute(new Float32Array(iCl), 4));
	leafGeo.setAttribute('iData', new THREE.InstancedBufferAttribute(new Float32Array(iData), 4));
	leafGeo.setAttribute('iTint', new THREE.InstancedBufferAttribute(new Float32Array(iTint), 3));
	leafGeo.setAttribute('iSway', new THREE.InstancedBufferAttribute(new Float32Array(iSway), 4));
	leafGeo.instanceCount = iPos.length / 3;
	leafGeo.boundingSphere = new THREE.Sphere(V3(0, 30, 0), 60);

	// ------------------------------------------------------------------------------------------
	// Kuş yuvası: köprünün tepesinde, yolun etrafını saran dal halkaları ve üç mavi yumurta.
	// ------------------------------------------------------------------------------------------
	const nest = extras;
	for (const n of nests) {
		for (let ring2 = 0; ring2 < 9; ring2++) {
			const pts = [];
			const rr = 1.55 + R.range(-0.15, 0.25);
			const y0 = n.c.y - 0.42 + ring2 * 0.07;
			const a0 = R() * TAU;
			for (let k = 0; k <= 26; k++) {
				const a = a0 + (k / 26) * TAU * 1.05;
				const wob = R.range(-0.08, 0.08);
				pts.push(V3(n.c.x + Math.cos(a) * (rr + wob), y0 + Math.sin(a * 3 + ring2) * 0.08, n.c.z + Math.sin(a) * (rr + wob)));
			}
			nest.tube(pts, pts.map(() => R.range(0.06, 0.12)), 4, () => { const v = R.range(0.8, 1.1); return [0.86 * v, 0.64 * v, 0.42 * v, 0.95]; }, { capEnd: false });
		}
		for (let k = 0; k < 3; k++) {
			const a = Math.atan2(n.out.z, n.out.x) + Math.PI * 0.5 + (k - 1) * 0.35;
			const p = V3(n.c.x + Math.cos(a) * 1.15, n.c.y - 0.1, n.c.z + Math.sin(a) * 1.15);
			const egg = new THREE.SphereGeometry(0.2, 12, 8);
			const P = egg.getAttribute('position');
			const Nn = egg.getAttribute('normal');
			const base = nest.count;
			for (let v = 0; v < P.count; v++) {
				const sy = P.getY(v) * 1.3;
				const spk = Math.sin(P.getX(v) * 80) * Math.sin(P.getZ(v) * 70) > 0.6 ? 0.75 : 1;
				nest.vert(p.x + P.getX(v), p.y + sy, p.z + P.getZ(v), Nn.getX(v), Nn.getY(v), Nn.getZ(v), 0.62 * spk, 0.82 * spk, 0.92 * spk, 1, 0, 0);
			}
			const I = egg.index.array;
			for (let t = 0; t < I.length; t += 3) nest.tri(base + I[t], base + I[t + 1], base + I[t + 2]);
		}
	}
	nest.fixWinding();

	return {
		trunk: trunk.build(),
		branches: branches.build(),
		nest: nest.count ? nest.build() : null,
		leaves: leafGeo,
		caps,
		ellipsoids: occl,
	};
}
