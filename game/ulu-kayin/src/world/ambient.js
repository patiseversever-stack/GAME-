// Ortam canlılığı: mevsim parçacıkları (taçyaprağı, polen, güz yaprağı, kar, ateş böceği),
// ışık sütunları ve ağacın çevresinde süzülen kuş sürüsü.
// Hareketin tamamı vertex shader'da zamana göre hesaplanır: işlemci her kare hiçbir şey yapmaz.

import * as THREE from 'three';
import { COMMON, FINISH } from '../gfx/shaderlib.js';
import { rng, TAU } from '../core/math.js';

const quadGeo = (count) => {
	const g = new THREE.InstancedBufferGeometry();
	const q = new THREE.PlaneGeometry(1, 1);
	g.setIndex(q.index);
	g.setAttribute('position', q.getAttribute('position'));
	g.instanceCount = count;
	return g;
};

// ---------------------------------------------------------------------------------------------
// Mevsim parçacıkları: odak noktasının çevresinde sonsuz bir kutu (sarmalanarak tekrar eder).
// ---------------------------------------------------------------------------------------------
export function seasonParticles(G, atlas, count) {
	const R = rng(808);
	const g = quadGeo(count);
	const seed = new Float32Array(count * 4);
	for (let i = 0; i < seed.length; i++) seed[i] = R();
	g.setAttribute('iSeed', new THREE.InstancedBufferAttribute(seed, 4));
	const u = {
		...G,
		uMap: { value: atlas },
		uCenter: { value: new THREE.Vector3() },
		uSeason: { value: new THREE.Vector4(1, 0, 0, 0) }, // bahar, yaz, güz, kış ağırlıkları
		uFire: { value: 0 }, // ateş böceği (alacakaranlık)
		uCount: { value: 1 },
	};
	const mat = new THREE.ShaderMaterial({
		vertexShader: /* glsl */ `
			${COMMON}
			attribute vec4 iSeed;
			uniform vec3 uCenter; uniform vec4 uSeason; uniform float uFire; uniform float uCount;
			varying vec2 vUv; varying vec4 vCol; varying float vType;
			const vec3 BOX = vec3(30.0, 22.0, 30.0);
			void main() {
				// türü seç: mevsim ağırlıklarına göre
				float r = iSeed.w;
				float type = 3.0; // kar
				if (r < uSeason.x) type = 0.0;
				else if (r < uSeason.x + uSeason.y) type = 1.0;
				else if (r < uSeason.x + uSeason.y + uSeason.z) type = 2.0;
				bool fire = fract(r * 7.13) < uFire * 0.35;
				if (fire) type = 4.0;
				float alive = step(fract(r * 3.7), uCount);
				vec3 drift = vec3(uWind.x, 0.0, uWind.y) * (0.6 + (uWind.z + uWind.w * 2.5) * 2.2);
				float t = uTime;
				vec3 vel; float size; float spin;
				if (type < 0.5) { vel = vec3(0.0, -0.55, 0.0) + drift; size = 0.12; spin = 1.6; }
				else if (type < 1.5) { vel = vec3(0.0, 0.05 * sin(iSeed.x * 40.0), 0.0) + drift * 0.3; size = 0.045; spin = 0.0; }
				else if (type < 2.5) { vel = vec3(0.0, -0.95, 0.0) + drift * 1.3; size = 0.17; spin = 2.6; }
				else if (type < 3.5) { vel = vec3(0.0, -0.75, 0.0) + drift * 0.5; size = 0.065; spin = 0.4; }
				else { vel = vec3(0.0, 0.08 * sin(t * 0.7 + iSeed.y * 30.0), 0.0); size = 0.09; spin = 0.0; }
				vec3 p = iSeed.xyz * BOX + vel * t;
				// süzülme: yaprak gibi sağa sola salınım
				p.x += sin(t * 1.3 + iSeed.y * 40.0) * 0.6;
				p.z += cos(t * 1.1 + iSeed.x * 40.0) * 0.6;
				p.y += sin(t * 2.0 + iSeed.z * 30.0) * 0.15;
				// odak çevresindeki kutuya sar
				vec3 rel = mod(p - uCenter + BOX * 0.5, BOX) - BOX * 0.5;
				vec3 w = uCenter + rel;
				vec3 toCam = cameraPosition - w;
				float dc = length(toCam);
				toCam /= dc;
				vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
				vec3 up = cross(toCam, right);
				float a = iSeed.x * 6.28 + t * spin * (0.5 + iSeed.z);
				vec2 q = vec2(position.x * cos(a) - position.y * sin(a), position.x * sin(a) + position.y * cos(a));
				// yaprak dönerken incelir (3B takla hissi)
				q.x *= mix(1.0, abs(sin(t * spin * 0.7 + iSeed.y * 9.0)) * 0.8 + 0.2, step(0.5, spin));
				// kutu kenarında ve kameraya çok yakınken söner
				float edge = 1.0 - smoothstep(0.38, 0.5, max(max(abs(rel.x) / BOX.x, abs(rel.y) / BOX.y), abs(rel.z) / BOX.z));
				float near = smoothstep(0.8, 2.5, dc);
				float fade = edge * near * alive;
				w += (right * q.x + up * q.y) * size * fade;
				float cell = type < 0.5 ? 0.0 : type < 1.5 ? 3.0 : type < 2.5 ? 1.0 : type < 3.5 ? 2.0 : 3.0;
				vUv = (position.xy + 0.5) * 0.5 + vec2(mod(cell, 2.0), 1.0 - floor(cell / 2.0)) * 0.5;
				vec3 col = type < 0.5 ? vec3(1.0, 0.82, 0.9) : type < 1.5 ? vec3(1.6, 1.35, 0.7) : type < 2.5 ? mix(vec3(1.0, 0.62, 0.2), vec3(0.9, 0.3, 0.12), fract(iSeed.z * 5.0)) : type < 3.5 ? vec3(1.0) : vec3(2.2, 1.9, 0.9);
				vCol = vec4(col, fade);
				vType = type;
				gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
			}`,
		fragmentShader: /* glsl */ `
			${COMMON}
			${FINISH}
			uniform sampler2D uMap;
			varying vec2 vUv; varying vec4 vCol; varying float vType;
			void main() {
				vec4 t = texture2D(uMap, vUv);
				float a = t.a * vCol.a;
				if (a < 0.03) discard;
				vec3 light = uSkyTop * 0.9 + uSunCol * 0.32;
				vec3 c = (vType > 0.5 && vType < 1.5) || vType > 3.5 ? vCol.rgb * (0.6 + uSunCol * 0.25) : t.rgb * vCol.rgb * light;
				vec4 o = finish(c, 1.0);
				gl_FragColor = vec4(o.rgb * a, a);
			}`,
		uniforms: u,
		transparent: true,
		depthWrite: false,
		blending: THREE.CustomBlending,
		blendSrc: THREE.OneFactor,
		blendDst: THREE.OneMinusSrcAlphaFactor,
	});
	const mesh = new THREE.Mesh(g, mat);
	mesh.frustumCulled = false;
	mesh.renderOrder = 22;
	return { mesh, u };
}

// ---------------------------------------------------------------------------------------------
// Işık sütunları: güneşe doğru bakınca gövdenin kenarından ve yaprak aralarından süzülen ışık.
// Ekseni güneş yönünde, kameraya dönük uzun kartlar; derinlik testi gövdenin arkasında gizler.
// ---------------------------------------------------------------------------------------------
export function lightShafts(G, tex, count) {
	const R = rng(55);
	const g = quadGeo(count);
	const d = new Float32Array(count * 4);
	for (let i = 0; i < count; i++) {
		const a = R() * TAU;
		const r = R.range(2.5, 7.5);
		d.set([Math.cos(a) * r, R.range(-1, 5), Math.sin(a) * r, R()], i * 4);
	}
	g.setAttribute('iOff', new THREE.InstancedBufferAttribute(d, 4));
	const u = { ...G, uMap: { value: tex }, uCenter: { value: new THREE.Vector3() }, uK: { value: 1 } };
	const mat = new THREE.ShaderMaterial({
		vertexShader: /* glsl */ `
			${COMMON}
			attribute vec4 iOff;
			uniform vec3 uCenter; uniform float uNight;
			varying vec2 vUv; varying float vA;
			void main() {
				vec3 c = uCenter + iOff.xyz;
				vec3 ax = -uSunDir; // ışığın aktığı yön
				vec3 toCam = normalize(cameraPosition - c);
				vec3 side = normalize(cross(ax, toCam));
				float len = 16.0, wid = 1.6 + iOff.w * 2.2;
				vec3 w = c + ax * position.y * len + side * position.x * wid;
				vUv = position.xy + 0.5;
				// yalnızca güneşe doğru bakarken ve güneş alçakken belirgin
				vec3 vd = normalize(c - cameraPosition);
				float look = pow(max(dot(vd, uSunDir), 0.0), 2.0);
				float flick = 0.75 + 0.25 * sin(uTime * (0.6 + iOff.w) + iOff.w * 20.0);
				vA = look * flick * (1.0 - uNight);
				gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
			}`,
		fragmentShader: /* glsl */ `
			${COMMON}
			uniform sampler2D uMap; uniform float uK;
			varying vec2 vUv; varying float vA;
			void main() {
				float t = texture2D(uMap, vUv).a;
				vec3 c = uFogSun * t * vA * uK * 0.22;
				gl_FragColor = vec4(c, 1.0);
			}`,
		uniforms: u,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		side: THREE.DoubleSide,
	});
	const mesh = new THREE.Mesh(g, mat);
	mesh.frustumCulled = false;
	mesh.renderOrder = 24;
	return { mesh, u };
}

// ---------------------------------------------------------------------------------------------
// Kuş sürüsü: ağacın çevresinde dalgalanarak dönen, kanat çırpan siluetler.
// ---------------------------------------------------------------------------------------------
export function birdFlock(G, count) {
	const R = rng(4242);
	// tek kuş: gövde + iki kanat (6 köşe), y koordinatındaki işaret kanat ucunu belirtir
	const base = new THREE.BufferGeometry();
	const P = new Float32Array([
		0, 0, 0.35, -0.08, 0, -0.2, 0.08, 0, -0.2, // gövde
		0, 0, 0.12, -1.0, 0, -0.1, 0, 0, -0.18, // sol kanat
		0, 0, 0.12, 1.0, 0, -0.1, 0, 0, -0.18, // sağ kanat
	]);
	base.setAttribute('position', new THREE.BufferAttribute(P, 3));
	const g = new THREE.InstancedBufferGeometry();
	g.setAttribute('position', base.getAttribute('position'));
	const d = new Float32Array(count * 4);
	for (let i = 0; i < count; i++) {
		const flock = i % 2;
		d.set([R.range(0, TAU) * 0.15 + flock * Math.PI, R.range(-1.5, 1.5), R.range(-1.5, 1.5), R()], i * 4);
	}
	g.setAttribute('iBird', new THREE.InstancedBufferAttribute(d, 4));
	g.instanceCount = count;
	const u = { ...G, uCenterY: { value: 30 } };
	const mat = new THREE.ShaderMaterial({
		vertexShader: /* glsl */ `
			${COMMON}
			attribute vec4 iBird;
			uniform float uCenterY;
			varying vec3 vW;
			void main() {
				float spd = 0.07 + iBird.w * 0.015;
				float ang = iBird.x + uTime * spd;
				float rad = 24.0 + iBird.y * 2.0 + sin(uTime * 0.21 + iBird.w * 6.0) * 3.0;
				vec3 c = vec3(cos(ang) * rad, uCenterY + 9.0 + iBird.z * 1.6 + sin(uTime * 0.37 + iBird.w * 9.0) * 2.5, sin(ang) * rad);
				vec3 fwd = normalize(vec3(-sin(ang), 0.0, cos(ang)));
				vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
				vec3 p = position;
				float flap = sin(uTime * 9.0 + iBird.w * 30.0);
				p.y += abs(p.x) * flap * 0.55;
				float s = 0.55 + iBird.w * 0.25;
				vec3 w = c + (right * p.x + vec3(0.0, 1.0, 0.0) * p.y + fwd * p.z) * s;
				vW = w;
				gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
			}`,
		fragmentShader: /* glsl */ `
			${COMMON}
			${FINISH}
			varying vec3 vW;
			void main() {
				vec3 c = vec3(0.05, 0.04, 0.08) + uSkyHor * 0.08;
				float d = length(vW - cameraPosition);
				float f = 1.0 - exp(-d * uFogP.x * 1.3);
				gl_FragColor = finish(mix(c, uFogCol, f), 1.0);
			}`,
		uniforms: u,
		side: THREE.DoubleSide,
	});
	const mesh = new THREE.Mesh(g, mat);
	mesh.frustumCulled = false;
	return { mesh, u };
}
