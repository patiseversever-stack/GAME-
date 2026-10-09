// Ortam (gökyüzü, güneş, sis, renk düzenleme) ve bütün malzemelerin paylaştığı uniform'lar.
// Her mevsim bir "ortam ön ayarı"dır; geçişlerde ön ayarlar yumuşakça karıştırılır.
//
// Sanat yönü: her mevsim günün başka bir saati.
//   ilkbahar = şafak (gül-şeftali ışık, turkuaz gök), yaz = öğle (kobalt gök, ak-altın ışık),
//   güz = altın saat (kehribar ışık, erik-mor / çam yeşili gölge), kış = gün batımı
//   (eflatun-turuncu gök, buz mavisi gölge), gece = ay ışığı ve yıldızlar.
// Kural: ışık sıcak ve parlak, gölge doygun ve serin; ikisi asla aynı griye düşmez.
// "Gece gölgelerde yaşar": gölgede kalan her yüzeyde Tün Ana'nın yıldız kırıntıları kıpırdar.

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
		// gölge büyüsü: x yıldız kırıntısı, y mürekkep parıltısı, z gölge sınırı ışıması, w bantlı ışık
		uShadeFx: { value: new THREE.Vector4(1, 0.3, 0.8, 0.6) },
		uTermCol: { value: new THREE.Color() }, // gölge sınırındaki sıcak ince hat
		uInkCol: { value: new THREE.Color() }, // gölgedeki yıldız ve mürekkep parıltısı rengi
		uVigCol: { value: new THREE.Color() }, // vinyetin çektiği renk (siyah değil, mevsimin derin tonu)
		// atmosfer: x uzaklık sisi (karesel), y en çok sis, z ufuk parlaması, w ışık tarafı sıcaklığı
		uAtmo: { value: new THREE.Vector4(0.006, 0.9, 0.5, 0.6) },
		// gökyüzüne özel
		uZenith: { value: new THREE.Color() },
		uSkyMid: { value: new THREE.Color() },
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
 *   elev: güneşin yüksekliği (derece; yalnızca menülerde, bölümler kendi gün akışını verir)
 *   shadeFx: [yıldız, mürekkep parıltısı, gölge sınırı ışıması, bantlı ışık]
 *   atmo: [karesel sis yoğunluğu, en çok sis, ufuk parlaması, ışık tarafı sıcaklığı]
 */
export const ENVS = {
	// İlkbahar şafağı: gül-şeftali ışık, turkuaz-camgöbeği gök, serin mavi gölgeler.
	spring: {
		elev: 34,
		sun: C('#ffc9a0', 2.25),
		zenith: C('#1c8fc4'), skyMid: C('#5fcfe0'), horizon: C('#ffcfb4'),
		sunGlow: C('#ffb08a', 1.25), sunDisc: C('#fff4e4', 1),
		skyTop: C('#98a8ff', 0.66), skyHor: C('#98b0ff', 0.6), ground: C('#ff98b0', 0.36),
		shade: C('#e8eeff', 1),
		term: C('#ff8a50', 1.6), ink: C('#c9d6ff', 1),
		fog: C('#ffd2c0'), fogSun: C('#ffc49a', 1.05), fogP: [0.0024, 4, 0.03, 6],
		atmo: [1 / 210, 0.85, 0.55, 0.5],
		cloud: C('#fff0e8', 1.15), cloudShade: C('#7f8fd6', 0.8),
		lift: C('#1a2a6a', 0.05), gain: C('#fff8f2'), grade: [1.2, 1.08, 1.0], vignette: 0.42, vig: C('#2b2a78'),
		shadeFx: [1.0, 0.8, 1.3, 0.55],
		night: 0,
	},
	// Yaz öğlesi: yüksek güneş, derin kobalt gök, ak-altın ışık, zümrüt yeşil.
	summer: {
		elev: 58,
		sun: C('#fff0d0', 2.45),
		zenith: C('#0d3fb8'), skyMid: C('#2f86e6'), horizon: C('#b4ecff'),
		sunGlow: C('#fff2c8', 1.1), sunDisc: C('#ffffff', 1),
		skyTop: C('#88a4ff', 0.68), skyHor: C('#a4b8f0', 0.62), ground: C('#a0d080', 0.3),
		shade: C('#e0e8ff', 1),
		term: C('#ffc050', 1.4), ink: C('#bfe0ff', 1),
		fog: C('#bfeaff'), fogSun: C('#fff4d8', 1.05), fogP: [0.002, 4, 0.032, 8],
		atmo: [1 / 230, 0.8, 0.4, 0.35],
		cloud: C('#ffffff', 1.25), cloudShade: C('#6f98e0', 0.85),
		lift: C('#06205a', 0.05), gain: C('#fbfdff'), grade: [1.24, 1.1, 1.0], vignette: 0.38, vig: C('#0d2a6e'),
		shadeFx: [0.9, 0.7, 1.2, 0.6],
		night: 0,
	},
	// Güz altın saati: alçak kehribar güneş, erik-mor ve çam yeşili gölgeler, uzun ışık.
	autumn: {
		elev: 22,
		sun: C('#ffb868', 2.5),
		zenith: C('#1d4f7c'), skyMid: C('#4f8fa8'), horizon: C('#ffb468'),
		sunGlow: C('#ff9a40', 1.45), sunDisc: C('#fff0c8', 1),
		skyTop: C('#8888f0', 0.5), skyHor: C('#9480ec', 0.42), ground: C('#ff8850', 0.32),
		shade: C('#f0eaff', 1),
		term: C('#ff7a28', 1.6), ink: C('#ffd6a8', 0.9),
		fog: C('#f2b27a'), fogSun: C('#ffaa58', 1.15), fogP: [0.0028, 4, 0.028, 6],
		atmo: [1 / 190, 0.85, 0.65, 0.6],
		cloud: C('#ffd8a6', 1.15), cloudShade: C('#8a5c9c', 0.75),
		lift: C('#3a1040', 0.05), gain: C('#fff4e6'), grade: [1.22, 1.1, 1.0], vignette: 0.44, vig: C('#3a1450'),
		shadeFx: [0.95, 0.8, 1.4, 0.6],
		night: 0,
	},
	// Kış gün batımı: ufka değen güneş, eflatun-turuncu gök, şeftali kar, buz mavisi gölge.
	winter: {
		elev: 8,
		sun: C('#ffb890', 2.3),
		zenith: C('#231a66'), skyMid: C('#b0407f'), horizon: C('#ff9a58'),
		sunGlow: C('#ff7a48', 1.6), sunDisc: C('#ffe0b8', 1),
		skyTop: C('#a8bcff', 1.05), skyHor: C('#98b0ff', 0.65), ground: C('#c090e0', 0.36),
		shade: C('#d0dcff', 1),
		term: C('#ff6a6a', 1.6), ink: C('#d8e6ff', 1),
		fog: C('#c86a8a'), fogSun: C('#ff9468', 1.2), fogP: [0.003, 4, 0.026, 5],
		atmo: [1 / 200, 0.85, 0.7, 0.65],
		cloud: C('#ffb69a', 1.05), cloudShade: C('#5a4aa8', 0.75),
		lift: C('#1a1050', 0.06), gain: C('#fff2ee'), grade: [1.2, 1.08, 1.0], vignette: 0.46, vig: C('#2a1260'),
		shadeFx: [1.15, 0.8, 1.4, 0.6],
		night: 0.35,
	},
	// Gece (kapıya varınca): ay ışığı, mürekkep mavisi gölgeler, gölgelerde bol yıldız.
	night: {
		elev: 30,
		sun: C('#a6bcff', 0.5),
		zenith: C('#050824'), skyMid: C('#141a52'), horizon: C('#3a3a86'),
		sunGlow: C('#8fa2ff', 0.6), sunDisc: C('#eef2ff', 0.7),
		skyTop: C('#4058c8', 0.22), skyHor: C('#3a46b0', 0.2), ground: C('#282868', 0.14),
		shade: C('#c0c8ff', 1),
		term: C('#9a7aff', 0.8), ink: C('#e0e8ff', 1.2),
		fog: C('#1e2060'), fogSun: C('#4a56b0', 1), fogP: [0.003, 4, 0.026, 6],
		atmo: [1 / 200, 0.85, 0.35, 0.2],
		cloud: C('#6a74c8', 0.42), cloudShade: C('#141440', 0.7),
		lift: C('#06082a', 0.08), gain: C('#e8ecff'), grade: [1.14, 1.1, 0.95], vignette: 0.5, vig: C('#04041a'),
		shadeFx: [1.7, 0.9, 0.6, 0.6],
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
	mixC(G.uSkyMid.value, a.skyMid, b.skyMid);
	mixC(G.uHorizon.value, a.horizon, b.horizon);
	mixC(G.uSunGlow.value, a.sunGlow, b.sunGlow);
	mixC(G.uSunDisc.value, a.sunDisc, b.sunDisc);
	mixC(G.uSkyTop.value, a.skyTop, b.skyTop);
	mixC(G.uSkyHor.value, a.skyHor, b.skyHor);
	mixC(G.uGround.value, a.ground, b.ground);
	mixC(G.uShadeTint.value, a.shade, b.shade);
	mixC(G.uTermCol.value, a.term, b.term);
	mixC(G.uInkCol.value, a.ink, b.ink);
	mixC(G.uFogCol.value, a.fog, b.fog);
	mixC(G.uFogSun.value, a.fogSun, b.fogSun);
	mixC(G.uCloudCol.value, a.cloud, b.cloud);
	mixC(G.uCloudShade.value, a.cloudShade, b.cloudShade);
	mixC(G.uLift.value, a.lift, b.lift);
	mixC(G.uGain.value, a.gain, b.gain);
	// vinyet ekran uzayında çarpar: doğrusal rengin kabaca ekran karşılığı (karekök)
	const vg = mixC(G.uVigCol.value, a.vig, b.vig);
	vg.setRGB(Math.sqrt(vg.r), Math.sqrt(vg.g), Math.sqrt(vg.b), THREE.LinearSRGBColorSpace);
	G.uFogP.value.set(mixN(a.fogP[0], b.fogP[0]), mixN(a.fogP[1], b.fogP[1]), mixN(a.fogP[2], b.fogP[2]), mixN(a.fogP[3], b.fogP[3]));
	G.uAtmo.value.set(mixN(a.atmo[0], b.atmo[0]), mixN(a.atmo[1], b.atmo[1]), mixN(a.atmo[2], b.atmo[2]), mixN(a.atmo[3], b.atmo[3]));
	G.uShadeFx.value.set(mixN(a.shadeFx[0], b.shadeFx[0]), mixN(a.shadeFx[1], b.shadeFx[1]), mixN(a.shadeFx[2], b.shadeFx[2]), mixN(a.shadeFx[3], b.shadeFx[3]));
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
