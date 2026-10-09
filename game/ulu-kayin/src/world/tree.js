// Ulu Kayın: dev ak kayın gövdesi, yan dallar, taç, köprü dalları, kuş yuvası, kökler ve
// dört mevsimin yaprak kümeleri. Yaprak türü yüksekliğe göre seçilir: tepede kiraz çiçeği,
// ortada yaz yeşili, aşağıda güz altını, en altta kar.
//
// Oynanış için gölge yapan her şey basit şekillerle de kaydedilir (kapsül, elipsoit); bunlar
// görsel modellerle aynı ölçüdedir ve rüzgârda aynı formülle sallanır.
//
// İki ayrı tohumlu rastgele dizi var: R yerleşimi (dal, küme konumları = oynanış gölgeleri)
// belirler ve sırası korunur; V yalnızca görsel ayrıntılar içindir (kıvrım, renk, kart dağılımı).
// Böylece görsel ayrıntı eklemek bölümlerin gölge düzenini bozmaz.

import * as THREE from 'three';
import { Builder } from '../gfx/builder.js';
import { rng, TAU, clamp, smoothstep, lerp, noise1 } from '../core/math.js';
import { trunkRadius, TRUNK_TOP, PITCH, PATH_TOP, PATH_T, BRIDGES, bridgeOut, pathY, seasonWeights } from './layout.js';

/** Kök kanatlarının azimutları: son bölümde patikanın indiği taraftan uzak tutulur. */
const BUTTRESS = [4.85, 5.72, 0.48, 1.3];
const BUTTRESS_K = [1.6, 1.35, 1.75, 1.3];

/** Taç kollarının çıktığı azimutlar: buildTree belirler (tohumlu, her seferinde aynı). */
let CROWN_AZ = null;

/** Oluk profili: geniş yumuşak sırtlar, dar derin oluklar. Ortalaması sıfır (ortalama yarıçap korunur). */
const GK = 2.2;
const GM = Math.exp(-GK) * 2.6175; // e^-k · I0(k), k = 2.2
const groove = (x) => GM - Math.exp(GK * (Math.cos(x) - 1));

/**
 * Gövdenin görsel yüzey yarıçapı: burulmuş oluklar (gövde boyunca ters yönde yavaşça döner),
 * tabanda kök kanatları, tepede kollara ayrılan taç çatalı.
 * Ortalama yarıçap trunkRadius(y) ile aynı kalır; patika ve oynanış buna göre ölçülüdür.
 */
export function trunkSurfaceR(th, y) {
	const R = trunkRadius(y);
	const tw = th + y * 0.105;
	const fade = smoothstep(1.2, 4.5, y) * (1 - smoothstep(50.5, 53, y));
	const fl = 1 + fade * (0.058 * groove(5 * tw + 0.4) + 0.034 * groove(3 * (th + y * 0.06) + 1.9)) + 0.008 * Math.sin(11 * th - 0.4 * y);
	const yb = Math.max(y, 0);
	let bt = 0;
	if (yb < 9) {
		for (let i = 0; i < 4; i++) {
			// kanatlar yukarı doğru oluklara akar: azimut yükseldikçe kayar, ince bir sırt olur
			const a = BUTTRESS[i] - yb * 0.11;
			const d = Math.atan2(Math.sin(th - a), Math.cos(th - a));
			const wd = 0.028 + 0.05 * Math.exp(-yb / 1.4);
			bt += Math.exp(-(d * d) / wd) * BUTTRESS_K[i];
		}
		bt *= Math.exp(-yb / 1.9);
	}
	let crown = 0;
	if (y > 50.5 && CROWN_AZ) {
		const k = smoothstep(50.5, 54, y);
		for (let i = 0; i < CROWN_AZ.length; i++) {
			const d = Math.atan2(Math.sin(th - CROWN_AZ[i]), Math.cos(th - CROWN_AZ[i]));
			crown += Math.exp(-(d * d) / 0.07);
		}
		// kolların arası içe çöker, kollar dışa taşar: gövde çatallanır
		crown = k * (crown * 1.35 - 0.55) - smoothstep(53.2, 55.6, y) * 1.8;
	}
	return R * fl + bt + crown;
}

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const polar = (r, th, y) => V3(Math.cos(th) * r, y, Math.sin(th) * r);

/** Catmull-Rom ile seyrek kontrol noktalarından yumuşak eğri. */
function smoothPts(ctrl, per = 4) {
	const c = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
	return c.getPoints(Math.max(2, (ctrl.length - 1) * per));
}

/** Gövde yüzeyinin analitik normali. */
function trunkNormal(th, y, out) {
	const e = 0.01;
	const r = trunkSurfaceR(th, y);
	const rT = (trunkSurfaceR(th + e, y) - trunkSurfaceR(th - e, y)) / (2 * e);
	const rY = (trunkSurfaceR(th, y + e) - trunkSurfaceR(th, y - e)) / (2 * e);
	const c = Math.cos(th);
	const s = Math.sin(th);
	const tx = rT * c - r * s;
	const tz = rT * s + r * c;
	// N = Sy × St; Sy = (rY c, 1, rY s), St = (tx, 0, tz)
	out.set(tz, rY * (s * tx - c * tz), -tx);
	return out.normalize();
}

export function buildTree(curve, tier) {
	const R = rng(1453); // yerleşim (oynanış) — çağrı sırası değişmemeli
	const VR = rng(2024); // görsel ayrıntı
	const T = tier;
	const density = T.leafDensity;
	const hi = T.id >= 1;

	const branches = new Builder(); // dallar (rüzgârla sallanır, kamera açıklığı)
	const extras = new Builder(); // kuş yuvası (köşe renkli)
	const caps = []; // oynanış kapsülleri
	const clusters = []; // yaprak kümeleri

	// ------------------------------------------------------------------------------------------
	// Dal yardımcıları
	// ------------------------------------------------------------------------------------------
	const barkCol = (thick) => (i, t) => {
		// kalın dallar ak, ince uçlar kızılımsı-kahve (kayın sürgünleri)
		const k = smoothstep(0.3, 0.06, thick * (1 - t * 0.9));
		const w = 0.97 + 0.03 * Math.sin(i * 0.7);
		return [lerp(1, 0.5, k) * w, lerp(0.99, 0.35, k) * w, lerp(0.97, 0.3, k) * w, lerp(0.86, 1, t)];
	};

	/** Gövdeden çıkan bir noktanın dışarıda olup olmadığı. */
	const outside = (p) => Math.hypot(p.x, p.z) > trunkSurfaceR(Math.atan2(p.z, p.x), p.y) - 0.05;

	/**
	 * Bir dalı geometriye ve oynanış kapsüllerine ekler.
	 * anchor: sallanma çapası (dalın ucu), w0/w1: dalın başında ve ucundaki sallanma ağırlığı.
	 * Kalınlık: gövdeden çıktığı yerde kabarık bir yaka, sonra uca doğru doğal incelme ve
	 * hafif boğumlar (boru gibi düz görünmesin).
	 */
	const addBranch = (ctrl, r0, r1, anchor, w0, w1, segs = 7, opt = {}) => {
		const pts = smoothPts(ctrl, opt.per || 5);
		const n = pts.length;
		const ph = R() * 10;
		// gövdeden çıkış noktası
		let iExit = 0;
		if (opt.fromTrunk !== false) {
			while (iExit < n - 1 && !outside(pts[iExit])) iExit++;
		}
		const tExit = iExit / (n - 1);
		const collar = opt.collar ?? 0.55;
		const rad = pts.map((_, i) => {
			const t = i / (n - 1);
			const taper = r1 + (r0 - r1) * Math.pow(1 - t, opt.taper ?? 1.7);
			const knob = 1 + 0.07 * noise1(i * 0.55 + ph) * (1 - t * 0.6);
			const tc = Math.max(0, t - tExit);
			const fl = 1 + collar * Math.exp(-tc * 9) * (t < tExit ? 1 : 1);
			return taper * knob * fl;
		});
		branches.tube(pts, rad, segs, barkCol(r0), {
			uvScale: 0.6,
			sway: (i, t) => branches.setSway(anchor.x, anchor.y, anchor.z, lerp(w0, w1, Math.pow(t, 1.6))),
		});
		if (opt.noCaps !== true) {
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
		}
		branches.setSway(0, 0, 0, 0);
		return pts;
	};

	/** İnce sürgün (oynanışa girmez): kümelerin içine uzanan çıplak dal uçları. */
	const addTwig = (a, b, r, anchor, w0, w1) => {
		const mid = a.clone().lerp(b, 0.5).add(V3(VR.range(-0.25, 0.25), VR.range(0.05, 0.3), VR.range(-0.25, 0.25)));
		const pts = smoothPts([a, mid, b], 2);
		branches.tube(pts, pts.map((_, i) => lerp(r, 0.022, i / (pts.length - 1))), 3, () => [0.55, 0.4, 0.33, 1], {
			uvScale: 0.6,
			sway: (i, t) => branches.setSway(anchor.x, anchor.y, anchor.z, lerp(w0, w1, t)),
		});
		branches.setSway(0, 0, 0, 0);
	};

	const addCluster = (c, r, anchor, w, forceType = -1, flat = 1) => {
		clusters.push({ c: c.clone(), r, rx: r * 1.15, ry: r * 0.78 * flat, rz: r * 1.15, anchor, w, type: forceType });
	};

	/** Kümeye birkaç çıplak sürgün: yaprak arasından dal iskeleti görünsün. */
	const twigsInto = (from, c, r, anchor, w) => {
		const nT = r > 1.1 ? 2 : 1;
		for (let k = 0; k < nT; k++) {
			const end = c.clone().add(V3(VR.range(-0.7, 0.7) * r, VR.range(-0.1, 0.5) * r, VR.range(-0.7, 0.7) * r));
			addTwig(from, end, 0.06, anchor, w * 0.8, w);
		}
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
		// zarif S kıvrımı: dal önce yukarı kalkar, sonra yana kıvrılıp ucunda hafifçe sarkar
		const wob = VR.range(0.06, 0.12) * VR.sign();
		const ctrl = [
			polar(Rt * 0.55, az, y - 0.35),
			polar(Rt + 0.55, az + drift * 0.1, y + 0.05),
			polar(Rt + L * 0.3, az + drift * 0.4 + wob, y + L * rise * 0.38 + kink * 0.6),
			polar(Rt + L * 0.58, az + drift * 0.75 - wob * 0.6, y + L * rise * 0.78 - kink * 0.3),
			polar(Rt + L * 0.82, az + drift * 1.0 + wob * 0.3, y + L * rise * 0.98),
			polar(Rt + L, az + drift * 1.2, y + L * rise),
		];
		const tip = ctrl[5];
		const sw = L / 8;
		const r0 = lerp(0.42, 0.7, (L - 4.5) / 5);
		const pts = addBranch(ctrl, r0, 0.05, tip, 0, sw, 8, { per: 4 });
		sb.r0 = r0;
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
			const mid2 = p.clone().lerp(end, 0.25).add(V3(0, 0.12, 0));
			const wA = sw * Math.pow(t, 1.6);
			addBranch([p, mid2, mid, end], lerp(r0, 0.07, t) * 0.55, 0.035, tip, wA, wA + 0.25, 5, { fromTrunk: false, collar: 0.25, per: 3 });
			if (!winter) {
				const cr = R.range(1.05, 1.6);
				addCluster(end, cr, tip, wA + 0.25);
				twigsInto(end, end, cr * 0.6, tip, wA + 0.25);
			} else if (R() < 0.7) addCluster(end.clone().add(V3(0, 0.12, 0)), R.range(0.35, 0.5), tip, wA + 0.25, 3, 0.7);
		}
		// uçta ve dal boyunca kümeler
		if (!winter) {
			const r1 = R.range(1.5, 2.2);
			addCluster(tip, r1, tip, sw);
			const pm = pts[Math.round(pts.length * 0.72)];
			addCluster(pm, R.range(1.2, 1.8), tip, sw * 0.6);
			twigsInto(pts[pts.length - 4], tip, r1 * 0.6, tip, sw);
		} else {
			// kış: dalların üstünde kar topakları
			for (const t of [0.4, 0.62, 0.84]) {
				const p = pts[Math.round(t * (pts.length - 1))];
				addCluster(p.clone().add(V3(0, 0.22, 0)), R.range(0.38, 0.6), tip, sw * Math.pow(t, 1.6), 3, 0.6);
			}
			// çıplak kış dalının ucunda incecik sürgünler
			for (let k = 0; k < 3; k++) {
				const a = pts[Math.round((0.55 + k * 0.15) * (pts.length - 1))];
				const e = a.clone().add(V3(VR.range(-1, 1), VR.range(0.5, 1.3), VR.range(-1, 1)));
				addTwig(a, e, 0.05, tip, sw * 0.7, sw);
			}
		}
	}

	// ------------------------------------------------------------------------------------------
	// Taç: gövde 53 m'de altı ana kola ayrılır; kollar çiçekli dev bir şemsiye taşır.
	// ------------------------------------------------------------------------------------------
	const limbs = 6;
	const limbAz = [];
	const limbData = [];
	for (let i = 0; i < limbs; i++) {
		const az = 0.45 + (i / limbs) * TAU + R.range(-0.18, 0.18);
		const L = R.range(12.5, 16);
		const up = R.range(7, 10);
		limbAz.push(az + 0.05);
		limbData.push({ az, L, up });
	}
	CROWN_AZ = limbAz;
	for (let i = 0; i < limbs; i++) {
		const { az, L, up } = limbData[i];
		const ctrl = [
			polar(0.8, az, TRUNK_TOP - 3.5),
			polar(2.6, az + 0.05, TRUNK_TOP + 0.4),
			polar(5.4, az + 0.12, TRUNK_TOP + up * 0.45),
			polar(L * 0.75, az + 0.2, TRUNK_TOP + up * 0.85),
			polar(L, az + 0.26, TRUNK_TOP + up * 0.8),
		];
		const tip = ctrl[4];
		const pts = addBranch(ctrl, 1.75, 0.12, tip, 0, 0.9, hi ? 10 : 8, { fromTrunk: false, collar: 0.08, taper: 1.0 });
		// her koldan ikincil dallar ve bol çiçek
		for (let k = 0; k < 5; k++) {
			const t = 0.32 + k * 0.15;
			const p = pts[Math.round(t * (pts.length - 1))];
			const a2 = az + R.range(-1.1, 1.1);
			const len = R.range(3.8, 6.5);
			const end = p.clone().add(V3(Math.cos(a2) * len, R.range(0.6, 3.4), Math.sin(a2) * len));
			const mid = p.clone().lerp(end, 0.5).add(V3(0, 0.6, 0));
			addBranch([p, mid, end], lerp(1.3, 0.14, t) * 0.5, 0.05, tip, 0.9 * t, 1.1, 6, { fromTrunk: false, collar: 0.3 });
			const cr = R.range(2.3, 3.1);
			addCluster(end, cr, tip, 1.1);
			addCluster(mid.clone().add(V3(0, 1.0, 0)), R.range(1.8, 2.4), tip, 0.9);
			// aşağı sarkan salkım: tacın altını doldurur
			if (R() < 0.6) addCluster(end.clone().add(V3(0, -1.6, 0)), R.range(1.4, 1.9), tip, 1.1, -1, 1.25);
			void cr;
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
	// Köprü dalları: patika gövdeden ayrılıp dışarı kıvrıldığı yerde, altta kalın bir dalın
	// üstüne oturur (eski çapraz payandalar ve halatlar yerine: kamerada daha sade).
	// Üstte gölge veren yapraklı dal; üçüncü köprüde dev kuş yuvası.
	// ------------------------------------------------------------------------------------------
	const tmp = {};
	const nests = [];
	for (const b of BRIDGES) {
		const half = (Math.acos(clamp(2 / b.out - 1, -1, 1)) / Math.PI) * b.w;
		const th0 = b.th - half;
		const th1 = b.th + half;
		const s0 = curve.sAtTheta(th0);
		const s1 = curve.sAtTheta(th1);
		curve.sample(curve.sAtTheta(b.th), tmp);
		const apex = V3(tmp.x, tmp.y, tmp.z);
		const out = V3(tmp.sx, 0, tmp.sz);

		// Taşıyıcı dal: gövdeden köprünün altına kavisle uzanır, tahtaları sırtında taşır,
		// dış kenarın biraz ötesinde yukarı kıvrılıp küçük bir sürgünle biter.
		{
			const azA = Math.atan2(apex.z, apex.x);
			const yA = apex.y - PATH_T;
			const rA = Math.hypot(apex.x, apex.z);
			const RtA = trunkRadius(yA - 2.2);
			const rr0 = 0.38 + b.out * 0.03;
			const ctrl = [
				polar(RtA * 0.6, azA - 0.05, yA - 2.6),
				polar(RtA + 0.6, azA - 0.03, yA - 1.9),
				polar(lerp(RtA, rA, 0.45), azA, yA - rr0 - 0.55),
				polar(rA - 0.4, azA + 0.01, yA - rr0 * 0.8 - 0.06),
				polar(rA + 1.25, azA + 0.02, yA - 0.2),
				polar(rA + 1.9, azA + 0.03, yA + 0.5),
			];
			const p = smoothPts(ctrl, 5);
			const n = p.length;
			let iExit = 0;
			while (iExit < n - 1 && !outside(p[iExit])) iExit++;
			const rad = p.map((_, i) => {
				const t = i / (n - 1);
				const tc = Math.max(0, (i - iExit) / (n - 1));
				return (0.05 + (rr0 - 0.05) * Math.pow(1 - t, 0.9)) * (1 + 0.5 * Math.exp(-tc * 9)) * (1 + 0.06 * noise1(i * 0.6));
			});
			branches.tube(p, rad, 8, barkCol(rr0), { uvScale: 0.6 });
			for (let i = 0; i < n - 1; i += 2) {
				const j = Math.min(n - 1, i + 2);
				if (rad[i] < 0.1) break;
				caps.push({ a: p[i].clone(), b: p[j].clone(), r: (rad[i] + rad[j]) * 0.46, anchor: null, wa: 0, wb: 0 });
			}
			// uçta küçük bir yaprak öbeği (kar katında karlı)
			const tipB = p[n - 1];
			const lt = { blossom: 0, green: 1, gold: 2, snow: 3 }[b.leaves];
			if (lt === 3) addCluster(tipB.clone().add(V3(0, 0.1, 0)), 0.45, tipB, 0.2, 3, 0.7);
			else addCluster(tipB.clone().add(V3(0, 0.25, 0)), 0.85, tipB, 0.3, lt);
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
		const opts = addBranch(over, 0.5, 0.07, tip, 0, wTip, 8);
		// (eski halat ve payandaların yerine taşıyıcı dal var; R dizisi korunur)
		for (let k = 0; k < 2; k++) {
			const s = lerp(s0, s1, 0.32 + k * 0.36);
			curve.sample(s, tmp);
		}
		// köprü yayı boyunca yan dallar: kümeler yürüyüş yolunun 2.6+ birim üstünde
		const nCl = b.nest ? 3 : 2;
		for (let k = 0; k < nCl; k++) {
			const s = lerp(s0, s1, nCl === 2 ? 0.3 + k * 0.4 : 0.2 + k * 0.3);
			curve.sample(s, tmp);
			const p = opts[Math.round(lerp(0.55, 0.95, k / Math.max(1, nCl - 1)) * (opts.length - 1))];
			const end = V3(tmp.x, Math.max(tmp.y + 3.9, p.y + 0.3), tmp.z).addScaledVector(V3(tmp.sx, 0, tmp.sz), R.range(0.2, 0.9));
			const mid = p.clone().lerp(end, 0.5).add(V3(0, 0.45, 0));
			addBranch([p, mid, end], 0.16, 0.04, tip, wTip * 0.7, wTip, 5, { fromTrunk: false, collar: 0.3 });
			if (leafType === 3) addCluster(end.clone().add(V3(0, 0.15, 0)), 0.6, tip, wTip, 3, 0.7);
			else addCluster(end.clone().add(V3(0, 0.35, 0)), R.range(1.55, 1.95), tip, wTip, leafType);
		}
		if (leafType !== 3) addCluster(tip.clone().add(V3(0, 0.5, 0)), R.range(1.6, 2.1), tip, wTip, leafType);
		if (b.nest) nests.push({ c: apex.clone(), out });
	}

	// ------------------------------------------------------------------------------------------
	// Yerdeki kökler: kök kanatlarından adanın karına yayılır; kalın, kıvrımlı, yer yer karın
	// altına dalıp yeniden çıkar.
	// ------------------------------------------------------------------------------------------
	for (let bi = 0; bi < BUTTRESS.length; bi++) {
		const a = BUTTRESS[bi];
		const Rt = trunkRadius(0);
		for (const da of [-0.12, 0.1]) {
			const L = R.range(6.5, 9.5);
			const az = a + da;
			const ctrl = [
				polar(Rt * 0.7, az, 1.6),
				polar(Rt + 0.9, az + da * 0.5, 0.55),
				polar(Rt + L * 0.35, az + da * 1.3 + R.range(-0.08, 0.08), 0.08),
				polar(Rt + L * 0.6, az + da * 1.8 + R.range(-0.1, 0.1), -0.08),
				polar(Rt + L * 0.82, az + da * 2.2, 0.0),
				polar(Rt + L, az + da * 2.5, -0.5),
			];
			addBranch(ctrl, R.range(0.6, 0.8) * (0.85 + BUTTRESS_K[bi] * 0.12), 0.14, ctrl[5], 0, 0, 9, { fromTrunk: false, collar: 0.2 });
		}
	}

	branches.fixWinding();

	// ------------------------------------------------------------------------------------------
	// Gövde: halkalar halinde, analitik normal, kabuk dokusu silindirik eşlenir.
	// Köşe rengi resimsi büyük değer farkları taşır: sırtlar açık, oluk dipleri sıcak ve koyu,
	// geniş gümüşi/kremsi lekeler; tabanda toprak ve yaşlı kabuğun koyuluğu.
	// ------------------------------------------------------------------------------------------
	const trunk = new Builder();
	const SEG = hi ? 84 : 60;
	const Y0 = -4;
	const Y1 = TRUNK_TOP + 2.6;
	const dy = hi ? 0.48 : 0.6;
	const rings = Math.ceil((Y1 - Y0) / dy) + 1;
	const N = new THREE.Vector3();
	const UT = 3; // dokunun çevredeki tekrar sayısı
	const VT = 1 / 6.5; // dikey ölçek
	// dal dipleri: gövdede çevrelerine hafif kapanma gölgesi
	const bases = sideBranches.map((b) => ({ y: b.y, az: b.az }));
	const trunkCol = (th, y, out) => {
		const tw = th + y * 0.105;
		const fade = smoothstep(1.2, 4.5, y) * (1 - smoothstep(50.5, 53, y));
		const g5 = groove(5 * tw + 0.4);
		const g3 = groove(3 * (th + y * 0.06) + 1.9);
		const cav = smoothstep(0.0, -0.55, g5 * 0.65 + g3 * 0.35) * fade; // oluk dibi
		const ridge = smoothstep(0.1, 0.3, g5) * fade;
		// geniş lekeler (θ'da tamsayı frekans: dikişsiz)
		const pA = 0.5 + 0.5 * (0.6 * Math.sin(2 * th + y * 0.17 + 1.3) + 0.4 * Math.sin(3 * th - y * 0.11 + 0.4));
		const pB = 0.5 + 0.5 * Math.sin(y * 0.31 + Math.sin(th * 2 + 0.7) * 1.2);
		let r = lerp(0.95, 1.02, pA);
		let g = lerp(0.95, 1.0, pA);
		let b = lerp(0.97, 0.96, pA);
		// serin gümüşi kuşaklar
		const cool = smoothstep(0.75, 0.95, pB) * 0.06;
		r -= cool;
		g -= cool * 0.7;
		// oluk dibi: sıcak, koyu (iç kabuk); sırt: hafif açık
		r = lerp(r, 0.8, cav * 0.55);
		g = lerp(g, 0.68, cav * 0.55);
		b = lerp(b, 0.62, cav * 0.55);
		r *= 1 + ridge * 0.03;
		g *= 1 + ridge * 0.03;
		b *= 1 + ridge * 0.02;
		// taban: toprak ve yaşlı kabuk
		const dirt = 1 - smoothstep(-0.5, 3.2, y);
		r = lerp(r, 0.6, dirt);
		g = lerp(g, 0.53, dirt);
		b = lerp(b, 0.5, dirt);
		// taç yakını hafif sıcak
		const warm = smoothstep(44, 53, y);
		out[0] = r * lerp(1, 1.02, warm);
		out[1] = g * lerp(1, 0.99, warm);
		out[2] = b * lerp(1, 0.95, warm);
		out[3] = 1 - cav * 0.3;
		return out;
	};
	const col4 = [0, 0, 0, 0];
	for (let j = 0; j < rings; j++) {
		const y = Math.min(Y1, Y0 + j * dy);
		for (let i = 0; i <= SEG; i++) {
			const th = (i / SEG) * TAU;
			const r = trunkSurfaceR(th, y);
			const c = Math.cos(th);
			const s = Math.sin(th);
			trunkNormal(th, y, N);
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
			// taç çatalının iç kısmı koyu
			if (y > 52) ao *= 1 - 0.35 * smoothstep(52, 55.5, y) * smoothstep(3.2, 1.8, r);
			trunkCol(th, y, col4);
			trunk.vert(c * r, y, s * r, N.x, N.y, N.z, col4[0], col4[1], col4[2], clamp(ao * col4[3], 0.2, 1), (i / SEG) * UT, y * VT);
		}
	}
	const ring = SEG + 1;
	for (let j = 0; j < rings - 1; j++) {
		for (let i = 0; i < SEG; i++) {
			const a = j * ring + i;
			trunk.quad(a, a + 1, a + ring + 1, a + ring);
		}
	}
	// tepe kapağı (kolların arasında, aşağıdan görünmez)
	const cc = trunk.vert(0, Y1 + 0.2, 0, 0, 1, 0, 0.7, 0.62, 0.55, 0.5, 0, 0);
	for (let i = 0; i < SEG; i++) trunk.tri(cc, (rings - 1) * ring + i + 1, (rings - 1) * ring + i);

	// ------------------------------------------------------------------------------------------
	// Kabuk gözleri: ak kayının simgesi olan büyük koyu badem izler ve dal diplerinin üstündeki
	// "kaş" (ters V). Dokuda değil, gövde yüzeyine oturan ince geometri: tekrar etmez, keskin kalır.
	// ------------------------------------------------------------------------------------------
	const surf = (th, y, off) => {
		const r = trunkSurfaceR(th, y) + off;
		return [Math.cos(th) * r, y, Math.sin(th) * r];
	};
	/** Yüzeye oturan çokgen: yerel (s yatay yay, t dikey) noktalardan merkezli halkalar. */
	const decalLens = (thC, yC, hw, hh, col, off, pointed = 0.8) => {
		const rC = trunkSurfaceR(thC, yC);
		const K = 14;
		const center = trunk.count;
		const put = (s, t, cl) => {
			const th = thC + s / rC;
			const y = yC + t;
			const p = surf(th, y, off);
			trunkNormal(th, y, N);
			trunk.vert(p[0], p[1], p[2], N.x, N.y, N.z, cl[0], cl[1], cl[2], cl[3], (th / TAU) * UT, y * VT);
		};
		put(0, 0, col);
		for (const rho of [0.5, 1]) {
			for (let k = 0; k < K; k++) {
				const a = (k / K) * TAU;
				const sa = Math.sin(a);
				put(Math.cos(a) * hw * rho, sa * Math.pow(Math.abs(sa), pointed) * hh * rho, col);
			}
		}
		for (let k = 0; k < K; k++) {
			const k1 = (k + 1) % K;
			trunk.tri(center, center + 1 + k, center + 1 + k1);
			const a0 = center + 1 + k;
			const a1 = center + 1 + k1;
			trunk.quad(a0, a0 + K, a1 + K, a1);
		}
	};
	/** Yüzeye oturan sivrilen fırça darbesi (kaş kolları). */
	const decalStroke = (thC, yC, pts2, w0, w1, col, off) => {
		const rC = trunkSurfaceR(thC, yC);
		const n = pts2.length;
		const start = trunk.count;
		for (let i = 0; i < n; i++) {
			const [s, t] = pts2[i];
			const [s2, t2] = pts2[Math.min(n - 1, i + 1)];
			const [s1, t1] = pts2[Math.max(0, i - 1)];
			let dx = s2 - s1;
			let dyy = t2 - t1;
			const l = Math.hypot(dx, dyy) || 1;
			dx /= l;
			dyy /= l;
			const w = lerp(w0, w1, Math.pow(i / (n - 1), 0.8));
			for (const sg of [-1, 1]) {
				const ss = s - dyy * w * sg;
				const tt = t + dx * w * sg;
				const th = thC + ss / rC;
				const y = yC + tt;
				const p = surf(th, y, off);
				trunkNormal(th, y, N);
				trunk.vert(p[0], p[1], p[2], N.x, N.y, N.z, col[0], col[1], col[2], col[3], (th / TAU) * UT, y * VT);
			}
		}
		for (let i = 0; i < n - 1; i++) {
			const a = start + i * 2;
			trunk.quad(a, a + 1, a + 3, a + 2);
		}
	};
	const DARK = [0.13, 0.11, 0.1, 0.8];
	const KNOT = [0.42, 0.35, 0.31, 0.85];
	const pathNear = (th, y, m) => {
		const base = ((th % TAU) + TAU) % TAU;
		for (let thA = base; thA < 60; thA += TAU) {
			const yp = pathY(thA);
			if (y > yp - 1.3 - m && y < yp + 0.5 + m && bridgeOut(thA) < 1.2) return true;
		}
		return false;
	};
	// büyük gözler
	let nEyes = 0;
	const eyes = [];
	for (let tries = 0; tries < 600 && nEyes < (hi ? 30 : 24); tries++) {
		const th = VR() * TAU;
		const y = VR.range(4, 46.5);
		if (pathNear(th, y, 0.4)) continue;
		let clash = false;
		for (const b of bases) if (Math.abs(b.y - y) < 1.6 && Math.abs(Math.atan2(Math.sin(th - b.az), Math.cos(th - b.az))) < 0.6) clash = true;
		// iki göz yan yana gelmesin (yüz gibi görünmesin)
		for (const e of eyes) if (Math.abs(e.y - y) < 2.2 && Math.abs(Math.atan2(Math.sin(th - e.th), Math.cos(th - e.th))) < 1.0) clash = true;
		if (clash) continue;
		eyes.push({ th, y });
		const w = VR.range(0.45, 0.95) * (VR() < 0.2 ? 1.5 : 1);
		decalLens(th, y, w, w * VR.range(0.3, 0.42), DARK, 0.035, 0.9);
		if (w > 0.6) decalLens(th, y + w * 0.02, w * 0.42, w * 0.1, KNOT, 0.05, 0.6);
		nEyes++;
	}
	// dal diplerinin üstünde kaşlar
	for (const b of sideBranches) {
		if (VR() < 0.35 || pathNear(b.az, b.y + 0.6, 0)) continue;
		const r0 = b.r0 || 0.5;
		const yA = b.y + r0 * 1.45 + 0.2;
		const span = r0 * 1.9 + 0.3;
		const tilt = VR.range(-0.08, 0.08);
		for (const sg of [-1, 1]) {
			const P = [];
			for (let k = 0; k <= 5; k++) {
				const t = k / 5;
				P.push([sg * span * t, -t * r0 * 0.95 + Math.sin(t * Math.PI) * 0.1 + tilt * sg * t]);
			}
			decalStroke(b.az, yA, P, 0.06 + r0 * 0.07, 0.012, DARK, 0.035);
		}
	}
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
	// Kartlar neredeyse dik (atlastaki yukarıdan aşağı ışık geçişi korunur); renk sapması
	// kart kart değil küme küme (kumlanma yok), küme içinde üst kartlar açık, alttakiler koyu.
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
		const type = k.type;
		const ncards = Math.max(5, Math.round(density * clamp(k.r * k.r * (type === 3 ? 7 : 5.2), 6, 30)));
		// küme rengi: hafif ton kayması
		const hue = R.range(-1, 1);
		const val = R.range(0.94, 1.05);
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
			const rot = R.range(-0.36, 0.36) * (tt === 3 ? 0.6 : 1);
			iData.push(size, rot, tt, R());
			// değer: kümenin üstü açık, altı koyu; kart başına yalnızca küçük sapma
			const up = py / Math.max(0.01, k.ry * 0.82);
			const b = val * (1 + 0.07 * up) * R.range(0.97, 1.03);
			if (tt === 0) iTint.push(b * (1 + hue * 0.015), b * (1 - Math.abs(hue) * 0.03), b * (1 + hue * 0.03));
			else if (tt === 1) iTint.push(b * (1 + hue * 0.07), b * (1 + hue * 0.015), b * (1 - hue * 0.08));
			else if (tt === 2) iTint.push(b * (1 + hue * 0.02), b * (1 + hue * 0.07), b * (1 - hue * 0.06));
			else iTint.push(b, b, b * 1.01);
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
	// Kuş yuvası: köprünün tepesinde, yolun etrafını saran örgülü bir çanak: kuru dal ve saman
	// halkaları, dışa taşan çöpler ve üç benekli mavi yumurta.
	// ------------------------------------------------------------------------------------------
	const nest = extras;
	for (const n of nests) {
		const straw = (v) => (VR() < 0.35 ? [0.82 * v, 0.66 * v, 0.42 * v, 0.95] : [0.55 * v, 0.4 * v, 0.28 * v, 0.9]);
		for (let ring2 = 0; ring2 < 11; ring2++) {
			const pts = [];
			const f = ring2 / 10;
			const rr = 1.25 + f * 0.55 + VR.range(-0.08, 0.12);
			const y0 = n.c.y - 0.62 + f * 0.62;
			const a0 = VR() * TAU;
			const wav = VR.range(2, 4) | 0;
			for (let k = 0; k <= 30; k++) {
				const a = a0 + (k / 30) * TAU * 1.04;
				const wob = 0.07 * Math.sin(a * 5 + ring2 * 2.1);
				pts.push(V3(n.c.x + Math.cos(a) * (rr + wob), y0 + Math.sin(a * wav + ring2) * 0.07, n.c.z + Math.sin(a) * (rr + wob)));
			}
			const v = VR.range(0.85, 1.1);
			const cl = straw(v);
			nest.tube(pts, pts.map(() => VR.range(0.055, 0.1)), 5, () => cl, { capEnd: false });
		}
		// dışa taşan çöpler
		for (let k = 0; k < 22; k++) {
			const a = VR() * TAU;
			const rr = 1.55 + VR.range(0, 0.2);
			const p0 = V3(n.c.x + Math.cos(a) * rr, n.c.y - VR.range(0.1, 0.5), n.c.z + Math.sin(a) * rr);
			const dir = V3(Math.cos(a + VR.range(-1.2, 1.2)), VR.range(-0.3, 0.5), Math.sin(a + VR.range(-1.2, 1.2))).normalize();
			const p1 = p0.clone().addScaledVector(dir, VR.range(0.6, 1.2));
			const cl = straw(VR.range(0.85, 1.05));
			nest.tube([p0, p0.clone().lerp(p1, 0.5).add(V3(0, 0.05, 0)), p1], [0.04, 0.03, 0.015], 4, () => cl, { capEnd: false });
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
				const spk = Math.sin(P.getX(v) * 80) * Math.sin(P.getZ(v) * 70) > 0.6 ? 0.72 : 1;
				nest.vert(p.x + P.getX(v), p.y + sy, p.z + P.getZ(v), Nn.getX(v), Nn.getY(v), Nn.getZ(v), 0.66 * spk, 0.86 * spk, 0.95 * spk, 1, 0, 0);
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
