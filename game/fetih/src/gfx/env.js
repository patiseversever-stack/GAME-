// Ortam: bütün malzemelerin paylaştığı uniform'lar ve gün ön ayarları.
// Renkler doğrusal uzayda; ışık şiddetleri 1'in üstüne çıkabilir, ton eşleme sığdırır.

import * as THREE from 'three';
import { noiseTexture } from './noise.js';

const C = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);

export function createGlobals() {
	return {
		uTime: { value: 0 },
		uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
		uSunCol: { value: new THREE.Color() },
		uSkyTop: { value: new THREE.Color() },
		uSkyHor: { value: new THREE.Color() },
		uGround: { value: new THREE.Color() },
		uShadeTint: { value: new THREE.Color() },
		uFogCol: { value: new THREE.Color() },
		uFogSun: { value: new THREE.Color() },
		uFogP: { value: new THREE.Vector4(0.012, 30, 0.02, 8) },
		uRes: { value: new THREE.Vector3(1, 1, 0.35) },
		uGrade: { value: new THREE.Vector4(1.1, 1.05, 1, 1.2 / 255) },
		uLift: { value: new THREE.Color(0, 0, 0) },
		uGain: { value: new THREE.Color(1, 1, 1) },
		uVigCol: { value: new THREE.Color() },
		uFocus: { value: new THREE.Vector4(0, -99, 0, 3) },
		uNight: { value: new THREE.Vector4(0, 1, 0, 0) }, // gece odağı (board.night)
		uSpot: { value: new THREE.Vector4(0.5, 0.5, 0.3, 0) }, // gece ışık havuzu (nightlights.focus)
		uNoise: { value: noiseTexture() }, // döşenebilir gürültü (noise.js)
		uShadowMap: { value: null },
		uShadowMat: { value: new THREE.Matrix4() },
		uShadowP: { value: new THREE.Vector4(1 / 1024, 0.04, 0.0008, 1) },
		// gök
		uZenith: { value: new THREE.Color() },
		uHorizon: { value: new THREE.Color() },
		uSunGlow: { value: new THREE.Color() },
		uSea: { value: new THREE.Color() },
		uSeaDeep: { value: new THREE.Color() },
	};
}

/**
 * Gün ön ayarları. sunAz/sunEl derece.
 *   ogle: parlak öğleden sonra (oyuncak kasabanın ana ışığı)
 *   aksam: altın saat
 */
export const ENVS = {
	ogle: {
		sunAz: 128,
		sunEl: 48,
		sun: C('#fff1d8', 2.6),
		skyTop: C('#7fb4ff', 0.62),
		skyHor: C('#bfe2ff', 0.62),
		ground: C('#ffd7a8', 0.42),
		shade: C('#b4c4ff', 1),
		fog: C('#cfe9ff'),
		fogSun: C('#fff1d4'),
		fogP: [0.0105, 34, 0.03, 8],
		zenith: C('#2f7fe0'),
		horizon: C('#c9ecff'),
		sunGlow: C('#fff0c8', 1.2),
		sea: C('#24b8c8'),
		seaDeep: C('#145f9c'),
		grade: [1.16, 1.06, 1.0],
		lift: C('#10204a', 0.05),
		gain: C('#fffaf2'),
		vignette: 0.32,
		vig: C('#2d3b8a'),
	},
	aksam: {
		sunAz: 205,
		sunEl: 18,
		sun: C('#ffbf80', 2.7),
		skyTop: C('#8a90ff', 0.55),
		skyHor: C('#ffc0a0', 0.6),
		ground: C('#ff9a70', 0.4),
		shade: C('#a898ff', 1),
		fog: C('#ffd0b0'),
		fogSun: C('#ffb070'),
		fogP: [0.012, 30, 0.03, 6],
		zenith: C('#3a4fb8'),
		horizon: C('#ffc69a'),
		sunGlow: C('#ffb070', 1.4),
		sea: C('#3aa0c8'),
		seaDeep: C('#24407e'),
		grade: [1.18, 1.07, 1.0],
		lift: C('#2a1050', 0.06),
		gain: C('#fff2e4'),
		vignette: 0.4,
		vig: C('#3a2a7a'),
	},
};

/**
 * Harita ışığı (oyunun ana ayarı): batı-güneybatıdan, kameranın solundan gelen ılık öğleden sonra
 * güneşi. Kabartma soldan aydınlanır (batı yamaçları parlak, doğu yamaçları gölgede), minyatürlerin
 * kameraya bakan yüzü yarı ışıkta kalır. Gölgeler serin mavi-mor; deniz canlı turkuazdan laciverde.
 */
ENVS.harita = {
	sunAz: 148,
	sunEl: 41,
	sun: C('#fff1db', 3.0),
	skyTop: C('#8fbaff', 0.6),
	skyHor: C('#c4e1ff', 0.52),
	ground: C('#ffdcb0', 0.3),
	shade: C('#a9b4ff', 1),
	fog: C('#cfe6ff'),
	fogSun: C('#fff1d4'),
	fogP: [0.0021, 110, 0.02, 8],
	zenith: C('#3d86e6'),
	horizon: C('#cfeeff'),
	sunGlow: C('#fff0c8', 1.2),
	sea: C('#22a6dc'),
	seaDeep: C('#1a66bd'),
	grade: [1.1, 1.07, 1.0],
	lift: C('#10204a', 0.04),
	gain: C('#fffaf2'),
	vignette: 0.3,
	vig: C('#24306e'),
};

export function applyEnv(G, e) {
	const az = THREE.MathUtils.degToRad(e.sunAz);
	const el = THREE.MathUtils.degToRad(e.sunEl);
	G.uSunDir.value.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();
	G.uSunCol.value.copy(e.sun);
	G.uSkyTop.value.copy(e.skyTop);
	G.uSkyHor.value.copy(e.skyHor);
	G.uGround.value.copy(e.ground);
	G.uShadeTint.value.copy(e.shade);
	G.uFogCol.value.copy(e.fog);
	G.uFogSun.value.copy(e.fogSun);
	G.uFogP.value.set(...e.fogP);
	G.uZenith.value.copy(e.zenith);
	G.uHorizon.value.copy(e.horizon);
	G.uSunGlow.value.copy(e.sunGlow);
	G.uSea.value.copy(e.sea);
	G.uSeaDeep.value.copy(e.seaDeep);
	G.uGrade.value.x = e.grade[0];
	G.uGrade.value.y = e.grade[1];
	G.uGrade.value.z = e.grade[2];
	G.uLift.value.copy(e.lift);
	G.uGain.value.copy(e.gain);
	G.uRes.value.z = e.vignette;
	G.uVigCol.value.copy(e.vig);
}
