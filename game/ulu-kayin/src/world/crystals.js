// Işık kristalleri: dalların ucunda duran, güneşi yansıtan cam/buz parçaları.
// Her kristal, güneş hedef noktanın tam arkasındayken ışığı o noktaya yansıtacak açıyla durur.
// Bu dosya sabit görselleri kurar; ışının oyun içindeki hesabı game/beams.js'te.

import * as THREE from 'three';
import { Builder } from '../gfx/builder.js';
import { COMMON, LIGHT, FINISH } from '../gfx/shaderlib.js';
import { trunkRadius } from './layout.js';
import { DESIGN, levelSpan } from '../game/levels.js';
import { sunVector } from '../gfx/env.js';
import { lerp } from '../core/math.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const SEASON_TINT = {
	spring: [1.0, 0.86, 0.94],
	summer: [1.0, 0.86, 0.55],
	autumn: [1.0, 0.72, 0.4],
	winter: [0.78, 0.92, 1.08],
};

export function buildCrystals(curve, levels) {
	const list = [];
	const gems = new Builder();
	const twigs = new Builder();
	const tmp = {};
	levels.forEach((L, li) => {
		const D = DESIGN[li];
		if (!D.crystals) return;
		const [s0, s1] = levelSpan(curve, li);
		for (const [u, side, out, dh] of D.crystals) {
			const sT = s0 + (s1 - s0) * u;
			curve.sample(sT, tmp);
			const T = V3(tmp.x, tmp.y + 0.45, tmp.z);
			const azT = Math.atan2(tmp.z, tmp.x);
			const yC = tmp.y + dh;
			// kristali hedefin yanına koy; ışın gövdeye çarpmasın diye gerekirse açıyı genişlet
			let azC = azT + side * 1.15;
			let C;
			for (let k = 0; k < 8; k++) {
				const rC = trunkRadius(yC) + out;
				C = V3(Math.cos(azC) * rC, yC, Math.sin(azC) * rC);
				const d = V3().subVectors(T, C);
				const tt = -(C.x * d.x + C.z * d.z) / (d.x * d.x + d.z * d.z);
				const cl = tt > 0 && tt < 1 ? Math.hypot(C.x + d.x * tt, C.z + d.z * tt) : 99;
				if (cl > trunkRadius(yC) + 0.5) break;
				azC += side * 0.1;
			}
			const elev = lerp(D.elev[0], D.elev[1], u);
			const Ls = sunVector(azT + Math.PI, elev, V3());
			const toT = V3().subVectors(T, C).normalize();
			const n = V3().addVectors(Ls, toT).normalize();
			const tint = SEASON_TINT[L.season];
			// taşıyıcı dal: gövdeden kristale
			// ince, kıvrımlı bir sürgün: gövdeden yukarı kavis yapıp kristali taşır
			const Rt = trunkRadius(yC - 0.4);
			const base = V3(Math.cos(azC - side * 0.12) * Rt * 0.75, yC - 0.7, Math.sin(azC - side * 0.12) * Rt * 0.75);
			const m1 = V3(Math.cos(azC - side * 0.08) * (Rt + 1.2), yC - 0.55, Math.sin(azC - side * 0.08) * (Rt + 1.2));
			const m2 = V3(Math.cos(azC - side * 0.02) * (Rt + out * 0.62), yC - 0.85, Math.sin(azC - side * 0.02) * (Rt + out * 0.62));
			const tip = C.clone().addScaledVector(n, -0.36);
			const cur = new THREE.CatmullRomCurve3([base, m1, m2, tip]);
			const pts = cur.getPoints(14);
			twigs.setSway(C.x, C.y, C.z, 0);
			twigs.tube(pts, pts.map((_, i) => lerp(0.2, 0.05, Math.pow(i / 14, 0.7))), 6, (i, t) => [lerp(1, 0.55, t), lerp(1, 0.42, t), lerp(1, 0.36, t), 0.9], {
				sway: (i, t) => twigs.setSway(C.x, C.y, C.z, 0.45 * Math.pow(t, 1.6)),
			});
			// kristal: altıgen çift piramit, geniş yüzü ayna normaline bakar
			const a = Math.abs(n.y) > 0.9 ? V3(1, 0, 0) : V3(0, 1, 0);
			const e1 = V3().crossVectors(n, a).normalize();
			const e2 = V3().crossVectors(n, e1).normalize();
			const ring = [];
			for (let k = 0; k < 6; k++) {
				const ang = (k / 6) * Math.PI * 2 + 0.26;
				ring.push(C.clone().addScaledVector(e1, Math.cos(ang) * 0.4).addScaledVector(e2, Math.sin(ang) * 0.62));
			}
			const front = C.clone().addScaledVector(n, 0.16);
			const back = C.clone().addScaledVector(n, -0.2);
			const idx = list.length;
			gems.setSway(C.x, C.y, C.z, 0.45); // kristal, dalının ucuyla birlikte sallanır
			const face = (p0, p1, p2) => {
				const nn = V3().crossVectors(V3().subVectors(p1, p0), V3().subVectors(p2, p0)).normalize();
				for (const p of [p0, p1, p2]) gems.vert(p.x, p.y, p.z, nn.x, nn.y, nn.z, tint[0], tint[1], tint[2], idx, 0, 0);
				gems.tri(gems.count - 3, gems.count - 2, gems.count - 1);
			};
			for (let k = 0; k < 6; k++) {
				const r0 = ring[k];
				const r1 = ring[(k + 1) % 6];
				face(front, r0, r1);
				face(back, r1, r0);
			}
			list.push({ c: C, n, target: T, level: li, anchor: C.clone(), w: 0.45, tint, season: L.season });
		}
	});
	gems.fixWinding();
	twigs.fixWinding();
	return { list, gemGeo: gems.count ? gems.build() : null, twigGeo: twigs.count ? twigs.build() : null };
}

/** Kristal malzemesi: yüzeyli parıltı, gökkuşağı kırılması, aydınlanınca içten yanar. */
export function crystalMaterial(G, count) {
	return new THREE.ShaderMaterial({
		vertexShader: /* glsl */ `
			${COMMON}
			attribute vec4 color;
			attribute vec4 aSway;
			varying vec3 vN; varying vec3 vW; varying vec3 vTint; varying float vIdx;
			void main() {
				vec4 w = modelMatrix * vec4(position, 1.0);
				w.xyz += windSway(aSway.xyz, aSway.w);
				vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vTint = color.rgb; vIdx = color.a;
				gl_Position = projectionMatrix * viewMatrix * w;
			}`,
		fragmentShader: /* glsl */ `
			${COMMON}
			${LIGHT}
			${FINISH}
			uniform float uLit[${Math.max(1, count)}];
			varying vec3 vN; varying vec3 vW; varying vec3 vTint; varying float vIdx;
			vec3 hue(float h) { return clamp(abs(fract(h + vec3(0.0, 0.333, 0.667)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }
			void main() {
				// kameraya çok yakınsa titreşimli desenle sön
				float dc = length(vW - cameraPosition);
				float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
				if (smoothstep(6.0, 2.5, dc) > ign) discard;
				vec3 N = normalize(vN);
				if (!gl_FrontFacing) N = -N;
				vec3 V = normalize(cameraPosition - vW);
				float lit = uLit[int(vIdx + 0.5)];
				float fr = pow(1.0 - abs(dot(N, V)), 2.0);
				vec3 c = vTint * (skyAmbient(N) * 0.7 + 0.08);
				c += hue(dot(N, V) * 1.7 + dot(N, uSunDir) * 0.6) * fr * 0.9;
				float sp = pow(max(dot(N, normalize(uSunDir + V)), 0.0), 60.0);
				c += uSunCol * sp * (0.4 + lit * 2.0);
				c += vTint * vec3(0.9, 0.8, 0.6) * lit * (0.6 + 0.4 * sin(uTime * 6.0 + vIdx));
				gl_FragColor = finish(applyFog(c, vW), 1.0);
			}`,
		uniforms: { ...G, uLit: { value: new Array(Math.max(1, count)).fill(0) } },
		side: THREE.DoubleSide,
	});
}
