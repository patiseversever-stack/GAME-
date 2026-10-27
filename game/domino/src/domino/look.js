// Domino taşlarının görünümü: örneklemeli geometrinin vertex/fragment shader'ları.
// Fizik (dominoes.js) yalnızca öznitelikleri yazar; burada okunur:
//   iPos, iYaw, iDim (genişlik, boy, kalınlık), iColA (ön/yan), iColB (arka yüz),
//   iAnim (x açı, y yukarı kayma, z parlama, w görünürlük), iMat (0 boya, 1 altın, 2 cam, 3 neon)

import * as THREE from 'three';
import { COMMON, SHADOW, LIGHT, FINISH } from '../gfx/shaderlib.js';

const VS = /* glsl */ `
${COMMON}
attribute vec3 iPos;
attribute float iYaw;
attribute vec3 iDim;
attribute vec3 iColA;
attribute vec3 iColB;
attribute vec4 iAnim; // x açı, y yukarı kayma, z parlama, w görünürlük
attribute float iMat;
varying vec3 vW;
varying vec3 vL;
varying vec3 vLN;
varying vec3 vCol;
varying vec3 vDim;
varying vec2 vRot;
varying float vFlash;
void main() {
	vec3 p = position * iDim;
	float a = iAnim.x;
	float ca = cos(a), sa = sin(a);
	float hz = iDim.z * 0.5;
	vec3 q = vec3(p.x, p.y, p.z - hz);
	q = vec3(q.x, q.y * ca - q.z * sa, q.y * sa + q.z * ca);
	q.z += hz;
	q *= iAnim.w;
	q.y += iAnim.y;
	float cy = cos(iYaw), sy = sin(iYaw);
	vec3 w = vec3(q.x * cy + q.z * sy, q.y, -q.x * sy + q.z * cy) + iPos;
	vW = w;
	vL = position;
	vLN = normal;
	vDim = iDim;
	vRot = vec2(a, iYaw);
	vCol = normal.z < -0.5 ? iColB : iColA;
	vFlash = iAnim.z;
	gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const FS = /* glsl */ `
#define SHADOW_TAPS __TAPS__
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
varying vec3 vW;
varying vec3 vL;
varying vec3 vLN;
varying vec3 vCol;
varying vec3 vDim;
varying vec2 vRot;
varying float vFlash;
vec3 toWorld(vec3 n) {
	float ca = cos(vRot.x), sa = sin(vRot.x);
	n = vec3(n.x, n.y * ca - n.z * sa, n.y * sa + n.z * ca);
	float cy = cos(vRot.y), sy = sin(vRot.y);
	return vec3(n.x * cy + n.z * sy, n.y, -n.x * sy + n.z * cy);
}
void main() {
	// pah (yuvarlatılmış kenar): yüzün iki teğet ekseninde kenara yakınlık normali büker.
	// Geometri 12 üçgenlik düz kutu ama kenarlar cilalı oyuncak gibi ışık yakalar.
	vec3 ln = vLN;
	vec3 edge = vec3(0.5 - abs(vL.x), min(vL.y, 1.0 - vL.y), 0.5 - abs(vL.z)) * vDim;
	float rb = 0.035 * clamp(vDim.y, 0.6, 3.0);
	vec3 k = 1.0 - smoothstep(vec3(0.0), vec3(rb), edge);
	k *= 1.0 - abs(ln); // yüzün kendi ekseni bükülmez
	vec3 bent = ln + vec3(sign(vL.x), sign(vL.y - 0.5), sign(vL.z)) * k * 0.85;
	vec3 N = normalize(toWorld(normalize(bent)));
	vec3 V = normalize(cameraPosition - vW);
	float sh = shadowAt(vW, N);
	// ortam örtmesi: yere yakın koyu, ayrıca kenar diplerinde hafif
	float ao = mix(0.55, 1.0, smoothstep(0.0, 0.7, vW.y)) * (1.0 - 0.18 * (k.x + k.y + k.z));
	vec3 alb = vCol;
	// yüzde çok ince bir ortası çizgisi (gerçek oyuncak taş gibi), sadece geniş yüzlerde
	float mid = (1.0 - smoothstep(0.004, 0.012, abs(vL.y - 0.5) * vDim.y)) * step(0.5, abs(ln.z));
	alb *= 1.0 - mid * 0.25;
	vec3 c = shade(alb, N, V, ao, sh, 0.85, 0.6);
	c += alb * vFlash * 1.6 + vec3(1.0, 0.95, 0.8) * vFlash * 0.4;
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

const DEPTH_FS = /* glsl */ `
void main() { gl_FragColor = vec4(1.0); }`;


/** geo: Dominoes'un örneklemeli geometrisi. Dönen: {mesh, shadowMesh}. */
export function createDominoLook(G, tier, geo) {
	const mat = new THREE.ShaderMaterial({
		vertexShader: VS,
		fragmentShader: FS.replace('__TAPS__', String(tier.shadowTaps)),
		uniforms: { ...G },
	});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.frustumCulled = false;
	const depthMat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: DEPTH_FS, uniforms: { ...G } });
	const shadowMesh = new THREE.Mesh(geo, depthMat);
	shadowMesh.frustumCulled = false;
	return { mesh, shadowMesh };
}
