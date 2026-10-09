// Gökyüzü katmanları: gök kubbesi, aşağıda uçsuz bucaksız bulut denizi, uzak bulut kümeleri,
// uzaktaki uçan adalar ve güneş parlaması. Hepsi ucuz: tek doku okumalı shader'lar.

import * as THREE from 'three';
import { Builder } from '../gfx/builder.js';
import { COMMON, LIGHT, FINISH } from '../gfx/shaderlib.js';
import { rng, TAU, lerp, noise1, smoothstep } from '../core/math.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildSky(G, tex, tier) {
	const group = new THREE.Group();

	// ---- gök kubbesi (opaklardan sonra, en uzak derinlikte) ----
	const dome = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), null);
	dome.frustumCulled = false;
	dome.renderOrder = 10;

	// ---- bulut denizi ----
	const seaMat = new THREE.ShaderMaterial({
		vertexShader: /* glsl */ `
			varying vec3 vW;
			void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
		fragmentShader: /* glsl */ `
			${COMMON}
			${FINISH}
			uniform sampler2D uNoise;
			uniform vec3 uCloudCol, uCloudShade;
			varying vec3 vW;
			void main() {
				vec2 uv = vW.xz * 0.0042 + uTime * vec2(0.0016, 0.0009);
				float a = texture2D(uNoise, uv).r;
				float b = texture2D(uNoise, uv * 2.9 + vec2(0.31, 0.17) - uTime * vec2(0.0021, -0.0012)).r;
				float d = a * 0.62 + b * 0.38;
				// güneşe doğru kaydırılmış örnekle sahte hacim ışığı: tepe güneş tarafında parlar
				float dl = texture2D(uNoise, uv + uSunDir.xz * 0.012).r * 0.62 + b * 0.38;
				float lit = clamp((d - dl) * 8.0 + 0.5, 0.0, 1.0);
				float dens = smoothstep(0.3, 0.7, d);
				// tepeler ışıkta parlar, aralar mevsimin doygun gölge renginde
				vec3 c = mix(uCloudShade, uCloudCol, dens * (0.4 + 0.6 * lit));
				// kabarık tepelerin güneşe bakan kenarı ışıkla yanar
				c += uSunCol * 0.12 * lit * dens * (1.0 - dens) * 4.0;
				vec3 v = normalize(vW - cameraPosition);
				float sd = max(dot(v, uSunDir), 0.0);
				// güneş yolu: güneşe bakınca bulut denizi altın gibi ışıldar
				c += uFogSun * (pow(sd, 5.0) * 0.45 + pow(sd, 28.0) * 0.7) * (0.3 + dens);
				float dist = length(vW.xz - cameraPosition.xz);
				// uzakta göğün ufkuyla aynı renge karışır (dikişsiz ufuk)
				c = mix(c, mix(uFogCol, uFogSun, pow(sd, 4.0)), smoothstep(140.0, 600.0, dist) * 0.96);
				gl_FragColor = finish(c, 1.0);
			}`,
		uniforms: { ...G, uNoise: { value: tex.cloudNoise } },
	});
	const sea = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800, 1, 1).rotateX(-Math.PI / 2), seaMat);
	sea.position.y = -48;
	sea.frustumCulled = false;
	sea.renderOrder = 5;

	// ---- uzak bulut kümeleri: kameraya dönük kartlar, uzaktan yakına sıralı ----
	const R = rng(2024);
	const nC = tier.clouds;
	const cPos = [];
	const cDat = [];
	const list = [];
	for (let i = 0; i < nC; i++) {
		const a = (i / nC) * TAU + R.range(-0.3, 0.3);
		const r = R.range(95, 240);
		list.push({ x: Math.cos(a) * r, y: R.range(-34, 26), z: Math.sin(a) * r, s: R.range(30, 72), k: R() });
	}
	list.sort((p, q) => Math.hypot(q.x, q.z) - Math.hypot(p.x, p.z));
	for (const c of list) {
		cPos.push(c.x, c.y, c.z);
		cDat.push(c.s, c.s * R.range(0.45, 0.62), c.k, R() * TAU);
	}
	const cloudGeo = new THREE.InstancedBufferGeometry();
	const q = new THREE.PlaneGeometry(1, 1);
	cloudGeo.setIndex(q.index);
	cloudGeo.setAttribute('position', q.getAttribute('position'));
	cloudGeo.setAttribute('iPos', new THREE.InstancedBufferAttribute(new Float32Array(cPos), 3));
	cloudGeo.setAttribute('iData', new THREE.InstancedBufferAttribute(new Float32Array(cDat), 4));
	cloudGeo.instanceCount = list.length;
	const cloudMat = new THREE.ShaderMaterial({
		vertexShader: /* glsl */ `
			${COMMON}
			attribute vec3 iPos; attribute vec4 iData;
			varying vec2 vUv; varying vec3 vW; varying float vK;
			void main() {
				vec3 c = iPos + vec3(sin(uTime * 0.02 + iData.w) * 6.0, 0.0, cos(uTime * 0.017 + iData.w) * 6.0);
				vec3 toCam = normalize(cameraPosition - c);
				vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
				vec3 up = cross(toCam, right);
				vec3 w = c + right * position.x * iData.x + up * position.y * iData.y;
				vW = w; vUv = position.xy + 0.5; vK = iData.z;
				gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
			}`,
		fragmentShader: /* glsl */ `
			${COMMON}
			${FINISH}
			uniform sampler2D uMap; uniform vec3 uCloudCol, uCloudShade;
			varying vec2 vUv; varying vec3 vW; varying float vK;
			void main() {
				vec4 t = texture2D(uMap, vUv);
				float a = clamp(t.a * 1.5, 0.0, 1.0);
				if (a < 0.01) discard;
				vec3 v = normalize(vW - cameraPosition);
				float sd = max(dot(v, uSunDir), 0.0);
				vec3 c = mix(uCloudShade, uCloudCol, t.g);
				// kontra ışıkta kenarlar ışık renginde yanar
				c += uFogSun * pow(sd, 5.0) * (1.0 - a) * 1.8;
				c += uSunCol * 0.1 * t.g * (1.0 - a);
				float dist = length(vW - cameraPosition);
				c = mix(c, mix(uFogCol, uFogSun, pow(sd, 4.0)), smoothstep(120.0, 420.0, dist) * 0.55);
				vec4 o = finish(c, 1.0);
				gl_FragColor = vec4(o.rgb * clamp(a, 0.0, 1.0), clamp(a, 0.0, 1.0));
			}`,
		uniforms: { ...G, uMap: { value: tex.cloud } },
		transparent: true,
		depthWrite: false,
		blending: THREE.CustomBlending,
		blendSrc: THREE.OneFactor,
		blendDst: THREE.OneMinusSrcAlphaFactor,
	});
	const clouds = new THREE.Mesh(cloudGeo, cloudMat);
	clouds.frustumCulled = false;
	clouds.renderOrder = 20;

	// ---- uzak uçan adalar: mevsim renklerinde küçük ağaçlı adacıklar ----
	const far = new Builder();
	const seasons = [
		[1.0, 0.72, 0.82],
		[0.42, 0.66, 0.3],
		[0.95, 0.66, 0.24],
		[0.92, 0.94, 1.0],
		[0.98, 0.78, 0.86],
		[0.5, 0.7, 0.34],
		[0.9, 0.55, 0.22],
	];
	for (let i = 0; i < 7; i++) {
		const a = (i / 7) * TAU + 0.5 + R.range(-0.2, 0.2);
		const r = R.range(115, 210);
		const c = V3(Math.cos(a) * r, R.range(-22, 18), Math.sin(a) * r);
		const s = R.range(5, 11);
		const col = seasons[i];
		// gövde: ters koni
		const SEG = 18;
		const base = far.count;
		for (let j = 0; j <= 4; j++) {
			const t = j / 4;
			const rr = s * Math.pow(1 - t, 1.3) + 0.2;
			for (let k = 0; k <= SEG; k++) {
				const th = (k / SEG) * TAU;
				const wob = 1 + 0.15 * noise1(th * 3 + i * 7 + t * 2);
				far.vert(c.x + Math.cos(th) * rr * wob, c.y - t * s * 1.6, c.z + Math.sin(th) * rr * wob, Math.cos(th), -0.3, Math.sin(th), 0.6, 0.52, 0.58, 0.8, 0, 0);
			}
		}
		for (let j = 0; j < 4; j++) for (let k = 0; k < SEG; k++) {
			const p = base + j * (SEG + 1) + k;
			far.quad(p, p + 1, p + SEG + 2, p + SEG + 1);
		}
		// üst: düz disk
		const top = far.vert(c.x, c.y + 0.3, c.z, 0, 1, 0, col[0] * 0.9, col[1] * 0.9, col[2] * 0.9, 1, 0, 0);
		for (let k = 0; k <= SEG; k++) {
			const th = (k / SEG) * TAU;
			const wob = 1 + 0.15 * noise1(th * 3 + i * 7);
			far.vert(c.x + Math.cos(th) * (s + 0.2) * wob, c.y, c.z + Math.sin(th) * (s + 0.2) * wob, 0, 1, 0, col[0] * 0.85, col[1] * 0.85, col[2] * 0.85, 1, 0, 0);
		}
		for (let k = 0; k < SEG; k++) far.tri(top, top + 1 + k, top + 2 + k);
		// birkaç küçük ağaç (top taçlı)
		for (let k = 0; k < 4; k++) {
			const ta = R() * TAU;
			const tr = R.range(0, s * 0.7);
			const p = V3(c.x + Math.cos(ta) * tr, c.y, c.z + Math.sin(ta) * tr);
			const h = R.range(1.6, 3.4);
			far.tube([p, p.clone().add(V3(0, h, 0))], [0.18, 0.1], 5, () => [0.85, 0.82, 0.8, 1]);
			const crown = new THREE.IcosahedronGeometry(h * 0.55, 1);
			const P = crown.getAttribute('position');
			const b0 = far.count;
			for (let v = 0; v < P.count; v++) {
				const n = V3(P.getX(v), P.getY(v), P.getZ(v)).normalize();
				far.vert(p.x + P.getX(v), p.y + h + P.getY(v) * 0.8, p.z + P.getZ(v), n.x, n.y, n.z, col[0], col[1], col[2], 1, 0, 0);
			}
			for (let t = 0; t < P.count; t += 3) far.tri(b0 + t, b0 + t + 1, b0 + t + 2);
		}
	}
	far.fixWinding();

	group.add(sea, clouds);
	return { group, dome, farGeo: far.build() };
}

/** Güneş parlaması: güneş yönünde dev bir hale; gövdenin arkasına girince derinlik testi gizler. */
export function buildSunGlare(glowTex, G) {
	const mat = new THREE.ShaderMaterial({
		vertexShader: /* glsl */ `
			uniform vec3 uSunDir; uniform float uSize;
			varying vec2 vUv;
			void main() {
				vec3 c = cameraPosition + uSunDir * 420.0;
				vec3 toCam = normalize(cameraPosition - c);
				vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
				vec3 up = cross(toCam, right);
				vec3 w = c + (right * position.x + up * position.y) * uSize;
				vUv = position.xy + 0.5;
				vec4 p = projectionMatrix * viewMatrix * vec4(w, 1.0);
				gl_Position = p.xyww;
			}`,
		fragmentShader: /* glsl */ `
			uniform sampler2D uMap; uniform vec3 uSunGlow; uniform float uK;
			varying vec2 vUv;
			void main() {
				float t = texture2D(uMap, vUv).r;
				vec2 q = vUv - 0.5;
				// ince yatay ışık çizgisi (anamorfik)
				float streak = exp(-abs(q.y) * 90.0) * exp(-abs(q.x) * 3.0) * 0.22;
				vec3 c = uSunGlow * (t * t * t * 0.32 + streak) * uK;
				gl_FragColor = vec4(c, 1.0);
			}`,
		uniforms: { uSunDir: G.uSunDir, uSunGlow: G.uSunGlow, uMap: { value: glowTex }, uSize: { value: 80 }, uK: { value: 1 } },
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	});
	const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
	m.frustumCulled = false;
	m.renderOrder = 30;
	return m;
}
