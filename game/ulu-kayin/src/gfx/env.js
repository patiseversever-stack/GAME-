// Ortam (gökyüzü, güneş, sis, renk düzenleme) ve bütün malzemelerin paylaştığı uniform'lar.
// Her mevsim bir "ortam ön ayarı"dır; geçişlerde ön ayarlar yumuşakça karıştırılır.

import * as THREE from 'three';

const C = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);

/** Bütün malzemelerde ortak uniform nesneleri (aynı nesneler paylaşılır, kopyalanmaz). */
export function createGlobals() {
	return {
		uTime: { value: 0 },
		uSunDir: { value: new THREE.Vector3(0, 1, 0) },
		uSunCol: { value: new THREE.Color() },
		uSkyTop: { value: new THREE.Color() },
		uSkyHor: { value: new THREE.Color() },
		uGround: { value: new THREE.Color() },
		uShadeTint: { value: new THREE.Color() },
		uFogCol: { value: new THREE.Color() },
		uFogSun: { value: new THREE.Color() },
		uFogP: { value: new THREE.Vector4(0.004, 0, 0.03, 6) },
		uRes: { value: new THREE.Vector3(1, 1, 0.3) },
		uLift: { value: new THREE.Color(0, 0, 0) },
		uGain: { value: new THREE.Color(1, 1, 1) },
		uGrade: { value: new THREE.Vector4(1, 1, 1, 1.2 / 255) },
		uWind: { value: new THREE.Vector4(1, 0, 0.3, 0) },
		uFocus: { value: new THREE.Vector4(0, -999, 0, 1.6) },
		uDanger: { value: 0 },
		// gölge
		uShadowMap: { value: null },
		uShadowMat: { value: new THREE.Matrix4() },
		uShadowP: { value: new THREE.Vector4(1 / 1024, 0.06, 0.0012, 1) },
		// gökyüzüne özel
		uZenith: { value: new THREE.Color() },
		uHorizon: { value: new THREE.Color() },
		uSunGlow: { value: new THREE.Color() },
		uSunDisc: { value: new THREE.Color() },
		uNight: { value: 0 },
		uCloudCol: { value: new THREE.Color() },
		uCloudShade: { value: new THREE.Color() },
	};
}

/**
 * Mevsim ön ayarları. Renkler doğrusal uzayda, ışık şiddetleri HDR (1'in üstü olabilir);
 * ton eşleme bunları ekrana yumuşakça sığdırır.
 *   elev: güneşin yüksekliği (derece)
 */
export const ENVS = {
	// İlkbahar sabahı: pembe-altın ışık, ferah mavi gök.
	spring: {
		elev: 34,
		sun: C('#ffe4c8', 3.0),
		zenith: C('#4a7bd0'), horizon: C('#f6d2d4'),
		sunGlow: C('#ffc9a6', 1.3), sunDisc: C('#fff3df', 1),
		skyTop: C('#8aa4dc', 0.56), skyHor: C('#e9c9d4', 0.46), ground: C('#b8928a', 0.32),
		shade: C('#dcd6ee', 1),
		fog: C('#e4c6d2'), fogSun: C('#ffdcc0', 1.1), fogP: [0.0026, 4, 0.03, 7],
		cloud: C('#fff1ee', 1.15), cloudShade: C('#a48fba', 0.85),
		lift: C('#2a1c46', 0.06), gain: C('#fff6f2'), grade: [1.16, 1.1, 0.95], vignette: 0.34,
		night: 0,
	},
	// Yaz öğlesi: yüksek güneş, derin mavi, zümrüt yeşil.
	summer: {
		elev: 58,
		sun: C('#fff3dc', 3.2),
		zenith: C('#2a68d4'), horizon: C('#bfe0f2'),
		sunGlow: C('#fff0d0', 1.1), sunDisc: C('#ffffff', 1),
		skyTop: C('#86aae6', 0.56), skyHor: C('#c4dae6', 0.44), ground: C('#97a070', 0.32),
		shade: C('#d6dcee', 1),
		fog: C('#c9e2f0'), fogSun: C('#fff1d8', 1.05), fogP: [0.0022, 4, 0.032, 8],
		cloud: C('#ffffff', 1.25), cloudShade: C('#93a9cc', 0.9),
		lift: C('#0e1a40', 0.05), gain: C('#fbfdff'), grade: [1.18, 1.1, 0.95], vignette: 0.3,
		night: 0,
	},
	// Güz ikindisi: alçak altın güneş, kehribar sis, uzun gölgeler.
	autumn: {
		elev: 22,
		sun: C('#ffc88a', 3.2),
		zenith: C('#5671b8'), horizon: C('#f2bc88'),
		sunGlow: C('#ffb070', 1.5), sunDisc: C('#fff0d0', 1),
		skyTop: C('#9496c8', 0.54), skyHor: C('#e2b08c', 0.44), ground: C('#a6765a', 0.32),
		shade: C('#dccfe6', 1),
		fog: C('#e0b48e'), fogSun: C('#ffc488', 1.2), fogP: [0.003, 4, 0.028, 6],
		cloud: C('#ffe2c2', 1.15), cloudShade: C('#9c7c98', 0.8),
		lift: C('#2a1430', 0.06), gain: C('#fff2e4'), grade: [1.16, 1.1, 0.95], vignette: 0.36,
		night: 0,
	},
	// Kış alacakaranlığı: ufka değen güneş, mor-mavi kar, ilk yıldızlar.
	winter: {
		elev: 8,
		sun: C('#ff9e6a', 3.0),
		zenith: C('#262c6a'), horizon: C('#ee8a6c'),
		sunGlow: C('#ff8a5a', 1.7), sunDisc: C('#ffd8b0', 1),
		skyTop: C('#7078b8', 0.56), skyHor: C('#c890a8', 0.42), ground: C('#8a88b0', 0.36),
		shade: C('#d0ccec', 1),
		fog: C('#8f7cae'), fogSun: C('#ff9f78', 1.25), fogP: [0.0032, 4, 0.026, 5],
		cloud: C('#ffc4ae', 1.05), cloudShade: C('#5e5490', 0.78),
		lift: C('#1c1040', 0.07), gain: C('#fff0ec'), grade: [1.1, 1.08, 1.0], vignette: 0.4,
		night: 0.35,
	},
	// Gece (kapıya varınca): ay ışığı ve yıldızlar.
	night: {
		elev: 30,
		sun: C('#9fb4ff', 0.9),
		zenith: C('#0b0d2a'), horizon: C('#3a3570'),
		sunGlow: C('#8fa2ff', 0.6), sunDisc: C('#e8eeff', 0.6),
		skyTop: C('#3a4290', 0.3), skyHor: C('#4a3f80', 0.24), ground: C('#2a2850', 0.22),
		shade: C('#b0b4f0', 1),
		fog: C('#2a2756'), fogSun: C('#5a62b0', 1), fogP: [0.003, 4, 0.026, 6],
		cloud: C('#8a90d0', 0.7), cloudShade: C('#2a2a5a', 0.7),
		lift: C('#0a0a28', 0.08), gain: C('#e8ecff'), grade: [1.05, 1.1, 1.05], vignette: 0.44,
		night: 1,
	},
};

const _a = new THREE.Color();
const _b = new THREE.Color();

/**
 * İki ön ayar arasında karışım uygular (t: 0 → a, 1 → b). sunAz: güneşin ağaç etrafındaki açısı,
 * elevDeg: verilirse güneş yüksekliği (bölümün kendi gün akışı).
 */
export function applyEnv(G, a, b, t, sunAz, elevDeg = null) {
	const mixC = (target, ca, cb) => target.copy(_a.copy(ca).lerp(_b.copy(cb), t));
	const mixN = (x, y) => x + (y - x) * t;

	const elev = THREE.MathUtils.degToRad(elevDeg == null ? mixN(a.elev, b.elev) : elevDeg);
	G.uSunDir.value.set(Math.cos(elev) * Math.cos(sunAz), Math.sin(elev), Math.cos(elev) * Math.sin(sunAz));
	mixC(G.uSunCol.value, a.sun, b.sun);
	mixC(G.uZenith.value, a.zenith, b.zenith);
	mixC(G.uHorizon.value, a.horizon, b.horizon);
	mixC(G.uSunGlow.value, a.sunGlow, b.sunGlow);
	mixC(G.uSunDisc.value, a.sunDisc, b.sunDisc);
	mixC(G.uSkyTop.value, a.skyTop, b.skyTop);
	mixC(G.uSkyHor.value, a.skyHor, b.skyHor);
	mixC(G.uGround.value, a.ground, b.ground);
	mixC(G.uShadeTint.value, a.shade, b.shade);
	mixC(G.uFogCol.value, a.fog, b.fog);
	mixC(G.uFogSun.value, a.fogSun, b.fogSun);
	mixC(G.uCloudCol.value, a.cloud, b.cloud);
	mixC(G.uCloudShade.value, a.cloudShade, b.cloudShade);
	mixC(G.uLift.value, a.lift, b.lift);
	mixC(G.uGain.value, a.gain, b.gain);
	G.uFogP.value.set(mixN(a.fogP[0], b.fogP[0]), mixN(a.fogP[1], b.fogP[1]), mixN(a.fogP[2], b.fogP[2]), mixN(a.fogP[3], b.fogP[3]));
	G.uGrade.value.x = mixN(a.grade[0], b.grade[0]);
	G.uGrade.value.y = mixN(a.grade[1], b.grade[1]);
	G.uGrade.value.z = mixN(a.grade[2], b.grade[2]);
	G.uRes.value.z = mixN(a.vignette, b.vignette);
	G.uNight.value = mixN(a.night, b.night);
	return elev;
}

/** Güneş yönü (oyunun gölge testi için, shader'daki uSunDir ile aynı). */
export function sunVector(az, elevDeg, out) {
	const e = THREE.MathUtils.degToRad(elevDeg);
	return out.set(Math.cos(e) * Math.cos(az), Math.sin(e), Math.cos(e) * Math.sin(az));
}
