// Döşenebilir gürültü dokusu: shader'larda pahalı karma (hash) gürültüsü yerine tek doku okuması.
// Açılışta CPU'da bir kez üretilir (256×256). Kanallar farklı sıklıkta değer gürültüsü:
//   r: 16 hücre, g: 64 hücre, b: 32 hücre (kayık), a: 8 hücre — hepsi dokunun kenarında sarar.
// Mobil kartlarda (Mali-G52) arazi parçası başına onlarca işlem kazandırır.

import * as THREE from 'three';

function hash(x, y, s) {
	let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s, 2246822519)) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function tileNoise(u, v, cells, seed) {
	const x = u * cells;
	const y = v * cells;
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const fx = x - ix;
	const fy = y - iy;
	const sx = fx * fx * (3 - 2 * fx);
	const sy = fy * fy * (3 - 2 * fy);
	const w = (a) => ((a % cells) + cells) % cells;
	const a = hash(w(ix), w(iy), seed);
	const b = hash(w(ix + 1), w(iy), seed);
	const c = hash(w(ix), w(iy + 1), seed);
	const d = hash(w(ix + 1), w(iy + 1), seed);
	return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

let TEX = null;

export function noiseTexture() {
	if (TEX) return TEX;
	const N = 256;
	const data = new Uint8Array(N * N * 4);
	for (let j = 0; j < N; j++)
		for (let i = 0; i < N; i++) {
			const u = (i + 0.5) / N;
			const v = (j + 0.5) / N;
			const k = (j * N + i) * 4;
			data[k] = Math.round(255 * tileNoise(u, v, 16, 1));
			data[k + 1] = Math.round(255 * tileNoise(u, v, 64, 2));
			data[k + 2] = Math.round(255 * tileNoise(u + 0.37, v + 0.11, 32, 3));
			data[k + 3] = Math.round(255 * tileNoise(u, v, 8, 4));
		}
	TEX = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
	TEX.wrapS = TEX.wrapT = THREE.RepeatWrapping;
	TEX.magFilter = THREE.LinearFilter;
	TEX.minFilter = THREE.LinearMipmapLinearFilter;
	TEX.generateMipmaps = true;
	TEX.colorSpace = THREE.NoColorSpace;
	TEX.needsUpdate = true;
	return TEX;
}

/** GLSL: dokudan gürültü. tex(q / 48) → r ≈ 0.33/birim, g ≈ 1.33/birim, b ≈ 0.67/birim, a ≈ 0.17/birim */
export const NOISE = /* glsl */ `
uniform sampler2D uNoise;
vec4 tnoise(vec2 q) { return texture(uNoise, q); }
`;
