// Minyatür Türkiye haritası: 81 il, her biri pahlı kalın bir karo (masa üstü maket gibi).
//
// Bütün iller tek geometride birleşir; her köşe hangi ile ait olduğunu (pid) taşır. İlin sahibi,
// rengi, yükselmesi ve parlaması küçük bir veri dokusundan okunur: bir il fethedilince yalnızca
// bu dokunun bir pikseli değişir, geometri yeniden kurulmaz. Tek çizim çağrısı.
//
// Karo kenarları toprak katmanları gösterir (kesilmiş pasta dilimi gibi), üstü bölgenin doğasıyla
// boyanır; sahibi olan ilde renk sahibin rengine döner ama arazi dokusu kaybolmaz.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COMMON, SHADOW, LIGHT, FINISH } from '../gfx/shaderlib.js';
import DATA from '../data/turkiye.json';

export const REGIONS = {
	marmara: { name: 'Marmara', color: 0x8fd16a },
	karadeniz: { name: 'Karadeniz', color: 0x3fa45e },
	ege: { name: 'Ege', color: 0xb9d465 },
	akdeniz: { name: 'Akdeniz', color: 0xe8b85a },
	icanadolu: { name: 'İç Anadolu', color: 0xf0d27a },
	dogu: { name: 'Doğu Anadolu', color: 0xa9b79a },
	guneydogu: { name: 'Güneydoğu Anadolu', color: 0xe39a5c },
};

const TOP = 0.62; // karo üstünün deniz seviyesinden yüksekliği
const BOTTOM = -0.5;

const PROV_VS = /* glsl */ `
${COMMON}
attribute float pid;
attribute vec3 terrain;
uniform sampler2D uState;  // r,g,b sahip rengi, a sahiplik gücü
uniform sampler2D uState2; // r yükselme, g parlama, b titreşim
uniform float uCount;
varying vec3 vW;
varying vec3 vN;
varying vec3 vTerr;
varying vec4 vOwn;
varying vec3 vFx;
varying float vTop;
void main() {
	vec2 suv = vec2((pid + 0.5) / uCount, 0.5);
	vOwn = texture2D(uState, suv);
	vFx = texture2D(uState2, suv).rgb;
	vec3 p = position;
	float lift = vFx.r * 1.4;
	// yükselen karo: üst yüz kalkar, alt yerinde (kenar uzar)
	p.y += lift * smoothstep(${BOTTOM.toFixed(2)}, ${TOP.toFixed(2)}, p.y);
	vec4 w = modelMatrix * vec4(p, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * normal);
	vTerr = terrain;
	vTop = smoothstep(0.55, 0.9, normal.y);
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

const PROV_FS = /* glsl */ `
#define SHADOW_TAPS __TAPS__
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
varying vec3 vW;
varying vec3 vN;
varying vec3 vTerr;
varying vec4 vOwn;
varying vec3 vFx;
varying float vTop;
void main() {
	vec3 N = normalize(vN);
	vec3 V = normalize(cameraPosition - vW);
	// üst: arazi dokusu (tarla, çayır, taşlık) + sahip rengi
	vec2 q = vW.xz;
	float n1 = vnoise(q * 0.9);
	float n2 = vnoise(q * 3.7);
	float fields = step(0.5, fract((q.x * 0.7 + q.y * 0.45) * 1.6 + n1 * 0.6)) * 0.06;
	vec3 terr = vTerr * (0.86 + 0.18 * n1 + 0.08 * n2 - fields);
	vec3 own = vOwn.rgb * (0.9 + 0.14 * n1 + 0.06 * n2);
	vec3 top = mix(terr, mix(terr, own, 0.82), vOwn.a);
	// kenar: toprak katmanları
	float y = vW.y;
	float band = step(0.5, fract(y * 3.1 + n2 * 0.3));
	vec3 soil = mix(vec3(0.24, 0.13, 0.07), vec3(0.34, 0.2, 0.11), band);
	soil = mix(soil, vec3(0.5, 0.36, 0.22), smoothstep(0.35, 0.6, y) * 0.5);
	// kenarın üst şeridi sahibin rengiyle boyalı (bayrak şeridi gibi)
	soil = mix(soil, own * 0.85, vOwn.a * smoothstep(0.3, 0.5, y + vFx.r * 1.4) * 0.8);
	vec3 alb = mix(soil, top, vTop);
	float sh = shadowAt(vW, N);
	float ao = mix(0.55, 1.0, smoothstep(-0.4, 0.6, y));
	vec3 c = shade(alb, N, V, ao, sh, 0.08 + 0.12 * vOwn.a, 0.5);
	// parlama: seçili/hedef il nabız gibi ışır
	float glow = vFx.g * (0.55 + 0.45 * sin(uTime * 6.0 + vFx.b * 6.28));
	c += (vOwn.a > 0.01 ? own : vec3(1.0, 0.9, 0.6)) * glow * 0.55;
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

const DEPTH_VS = PROV_VS;
const DEPTH_FS = /* glsl */ `void main() { gl_FragColor = vec4(1.0); }`;

const LAND_FS = /* glsl */ `
#define SHADOW_TAPS __TAPS__
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
varying vec3 vW;
varying vec3 vN;
void main() {
	vec3 N = normalize(vN);
	float n = vnoise(vW.xz * 0.6);
	vec3 alb = mix(vec3(0.17, 0.19, 0.16), vec3(0.14, 0.18, 0.15), n);
	alb = mix(vec3(0.14, 0.11, 0.09), alb, smoothstep(0.5, 0.9, N.y));
	float sh = shadowAt(vW, N);
	vec3 c = shade(alb, N, normalize(cameraPosition - vW), 0.9, sh, 0.05, 0.2);
	// komşu ülkeler sisli ve soluk: göz Türkiye'de kalsın
	c = mix(c, uFogCol * 0.55, 0.14);
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;
const LAND_VS = /* glsl */ `
varying vec3 vW;
varying vec3 vN;
void main() {
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * normal);
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SEA_VS = /* glsl */ `
varying vec3 vW;
varying vec2 vUv;
void main() {
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	vUv = uv;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;
const SEA_FS = /* glsl */ `
${COMMON}
${LIGHT}
${FINISH}
uniform sampler2D uCoast; // kıyıya yakınlık (bulanık kara maskesi)
uniform vec3 uSea, uSeaDeep;
uniform vec4 uCoastBox;   // x0, z0, 1/genişlik, 1/derinlik
varying vec3 vW;
varying vec2 vUv;
void main() {
	vec2 cuv = (vW.xz - uCoastBox.xy) * uCoastBox.zw;
	float coast = texture2D(uCoast, cuv).r;
	float t = uTime;
	vec2 p = vW.xz;
	vec2 g = vec2(0.0);
	g += vec2(0.6, 0.8) * cos(dot(p, vec2(0.6, 0.8)) * 0.7 + t * 1.1) * 0.06;
	g += vec2(-0.8, 0.5) * cos(dot(p, vec2(-0.8, 0.5)) * 1.4 + t * 1.6) * 0.04;
	g += (vec2(vnoise(p * 0.9 + t * 0.3), vnoise(p * 0.9 - t * 0.27)) - 0.5) * 0.1;
	vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
	vec3 V = normalize(cameraPosition - vW);
	vec3 base = mix(uSeaDeep, uSea, smoothstep(0.05, 0.75, coast));
	base = mix(base, vec3(0.5, 0.92, 0.88), smoothstep(0.75, 0.97, coast) * 0.55);
	float ndv = clamp(dot(N, V), 0.0, 1.0);
	float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
	vec3 c = base * (uSkyTop * 0.95 + uSunCol * 0.3 * max(dot(N, uSunDir), 0.0));
	c = mix(c, skyReflect(reflect(-V, N)), fres * 0.75);
	vec3 H = normalize(uSunDir + V);
	c += uSunCol * pow(max(dot(N, H), 0.0), 260.0) * 2.0;
	// kıyı köpüğü: kıyıya paralel nefes alan çizgiler
	float wave = sin(coast * 30.0 - t * 2.0 + vnoise(p * 0.7) * 4.0) * 0.5 + 0.5;
	float foam = smoothstep(0.82, 0.95, coast) * smoothstep(0.6, 0.95, wave) * 0.7 + smoothstep(0.96, 0.995, coast);
	c = mix(c, vec3(1.0) * (uSkyTop + uSunCol * 0.3), clamp(foam, 0.0, 1.0) * 0.85);
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

// ------------------------------------------------------------------ yardımcılar

const ringToShape = (flat) => {
	const s = new THREE.Shape();
	for (let i = 0; i < flat.length; i += 2) {
		const x = flat[i];
		const y = flat[i + 1];
		if (i === 0) s.moveTo(x, y);
		else s.lineTo(x, y);
	}
	s.closePath();
	return s;
};

export function pointInPoly(x, y, flat) {
	let inside = false;
	const n = flat.length / 2;
	for (let i = 0, j = n - 1; i < n; j = i++) {
		const xi = flat[i * 2];
		const yi = flat[i * 2 + 1];
		const xj = flat[j * 2];
		const yj = flat[j * 2 + 1];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

function edgeDist(x, y, flat) {
	let md = Infinity;
	const n = flat.length / 2;
	for (let i = 0, j = n - 1; i < n; j = i++) {
		const ax = flat[j * 2];
		const ay = flat[j * 2 + 1];
		const dx = flat[i * 2] - ax;
		const dy = flat[i * 2 + 1] - ay;
		const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1e-9)));
		md = Math.min(md, Math.hypot(x - ax - dx * t, y - ay - dy * t));
	}
	return md;
}

/** Kıyı maskesi: bütün karaların bulanık siluet dokusu (denizin sığ rengi ve köpük için). */
function coastTexture(polys, box) {
	const W = 1024;
	const H = Math.round((W * box.d) / box.w);
	const cv = document.createElement('canvas');
	cv.width = W;
	cv.height = H;
	const g = cv.getContext('2d');
	g.fillStyle = '#000';
	g.fillRect(0, 0, W, H);
	const px = (x) => ((x - box.x0) / box.w) * W;
	const pz = (z) => ((z - box.z0) / box.d) * H;
	const draw = (blur, alpha) => {
		g.filter = `blur(${blur}px)`;
		g.fillStyle = `rgba(255,255,255,${alpha})`;
		for (const f of polys) {
			g.beginPath();
			for (let i = 0; i < f.length; i += 2) {
				const X = px(f[i]);
				const Z = pz(-f[i + 1]);
				if (i === 0) g.moveTo(X, Z);
				else g.lineTo(X, Z);
			}
			g.closePath();
			g.fill();
		}
	};
	draw(26, 0.55);
	draw(9, 0.5);
	draw(2, 0.6);
	g.filter = 'none';
	const t = new THREE.CanvasTexture(cv);
	t.colorSpace = THREE.NoColorSpace;
	t.flipY = false;
	return t;
}

// ------------------------------------------------------------------ harita

export class Board {
	constructor(G, tier) {
		this.G = G;
		this.tier = tier;
		this.data = DATA;
		this.provinces = DATA.provinces.map((p, i) => ({
			...p,
			index: i,
			x: p.center[0],
			z: -p.center[1],
			owner: -1,
		}));
		this.byId = new Map(this.provinces.map((p) => [p.id, p]));
		this.group = new THREE.Group();
		const N = this.provinces.length;
		this.count = N;
		const taps = String(tier.shadowTaps);

		// il durumu dokuları
		this.state = new Uint8Array(N * 4);
		this.state2 = new Uint8Array(N * 4);
		this.stateTex = new THREE.DataTexture(this.state, N, 1, THREE.RGBAFormat);
		this.state2Tex = new THREE.DataTexture(this.state2, N, 1, THREE.RGBAFormat);
		for (const t of [this.stateTex, this.state2Tex]) {
			t.magFilter = t.minFilter = THREE.NearestFilter;
			t.colorSpace = THREE.NoColorSpace;
			t.needsUpdate = true;
		}
		this.lift = new Float32Array(N);
		this.liftTo = new Float32Array(N);
		this.glow = new Float32Array(N);
		this.glowTo = new Float32Array(N);

		// --- il karoları
		const parts = [];
		const depth = TOP - BOTTOM - 0.24;
		const extr = { depth, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelOffset: -0.17, bevelSegments: 2, curveSegments: 4 };
		const col = new THREE.Color();
		for (const p of this.provinces) {
			col.setHex(REGIONS[p.region].color); // sRGB → doğrusal
			// aynı bölgedeki iller tonca hafif ayrışsın
			const v = 0.92 + ((p.id * 37) % 17) / 100;
			for (const r of p.rings) {
				const g = new THREE.ExtrudeGeometry(ringToShape(r), extr);
				g.rotateX(-Math.PI / 2);
				g.translate(0, BOTTOM + 0.12, 0);
				const n = g.getAttribute('position').count;
				g.setAttribute('pid', new THREE.BufferAttribute(new Float32Array(n).fill(p.index), 1));
				const tc = new Float32Array(n * 3);
				for (let i = 0; i < n; i++) {
					tc[i * 3] = col.r * v;
					tc[i * 3 + 1] = col.g * v;
					tc[i * 3 + 2] = col.b * v;
				}
				g.setAttribute('terrain', new THREE.BufferAttribute(tc, 3));
				g.deleteAttribute('uv');
				g.clearGroups();
				parts.push(g);
			}
		}
		const geo = mergeGeometries(parts, false);
		geo.computeBoundingSphere();
		const uniforms = { ...G, uState: { value: this.stateTex }, uState2: { value: this.state2Tex }, uCount: { value: N } };
		this.mat = new THREE.ShaderMaterial({ vertexShader: PROV_VS, fragmentShader: PROV_FS.replace('__TAPS__', taps), uniforms });
		this.mesh = new THREE.Mesh(geo, this.mat);
		this.mesh.matrixAutoUpdate = false;
		this.group.add(this.mesh);
		this.shadowMesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: DEPTH_VS, fragmentShader: DEPTH_FS, uniforms }));
		this.shadowMesh.matrixAutoUpdate = false;

		// --- komşu ülkeler (alçak, soluk)
		const lparts = [];
		for (const r of DATA.land) {
			const g = new THREE.ExtrudeGeometry(ringToShape(r), { depth: 0.5, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelOffset: -0.08, bevelSegments: 1 });
			g.rotateX(-Math.PI / 2);
			g.translate(0, -0.5, 0);
			g.deleteAttribute('uv');
			g.clearGroups();
			lparts.push(g);
		}
		const lgeo = mergeGeometries(lparts, false);
		this.land = new THREE.Mesh(lgeo, new THREE.ShaderMaterial({ vertexShader: LAND_VS, fragmentShader: LAND_FS.replace('__TAPS__', taps), uniforms: { ...G } }));
		this.land.matrixAutoUpdate = false;
		this.group.add(this.land);

		// --- deniz
		const box = { x0: -100, z0: -60, w: 200, d: 120 };
		const allPolys = [...this.provinces.flatMap((p) => p.rings), ...DATA.land];
		const coast = coastTexture(allPolys, box);
		this.sea = new THREE.Mesh(
			new THREE.PlaneGeometry(box.w, box.d, 1, 1).rotateX(-Math.PI / 2),
			new THREE.ShaderMaterial({
				vertexShader: SEA_VS,
				fragmentShader: SEA_FS,
				uniforms: { ...G, uCoast: { value: coast }, uCoastBox: { value: new THREE.Vector4(box.x0, box.z0, 1 / box.w, 1 / box.d) } },
			}),
		);
		this.sea.position.set(box.x0 + box.w / 2, 0, box.z0 + box.d / 2);
		this.sea.updateMatrix();
		this.sea.matrixAutoUpdate = false;
		this.group.add(this.sea);
		this.top = TOP;
	}

	/** İlin sahibini ve rengini ayarla (renk null → tarafsız). */
	setOwner(index, owner, color) {
		const p = this.provinces[index];
		p.owner = owner;
		const s = this.state;
		if (color) {
			const c = new THREE.Color(color);
			s[index * 4] = Math.round(c.r * 255);
			s[index * 4 + 1] = Math.round(c.g * 255);
			s[index * 4 + 2] = Math.round(c.b * 255);
			s[index * 4 + 3] = 255;
		} else s[index * 4 + 3] = 0;
		this.stateTex.needsUpdate = true;
	}

	/** Yükselme (0..1) ve parlama (0..1) hedefleri; yumuşakça varılır. */
	fx(index, lift, glow) {
		if (lift != null) this.liftTo[index] = lift;
		if (glow != null) this.glowTo[index] = glow;
	}

	clearFx() {
		this.liftTo.fill(0);
		this.glowTo.fill(0);
	}

	update(dt) {
		let dirty = false;
		const k = 1 - Math.exp(-8 * dt);
		const s2 = this.state2;
		for (let i = 0; i < this.count; i++) {
			const l = this.lift[i] + (this.liftTo[i] - this.lift[i]) * k;
			const g = this.glow[i] + (this.glowTo[i] - this.glow[i]) * k;
			if (Math.abs(l - this.lift[i]) > 1e-4 || Math.abs(g - this.glow[i]) > 1e-4) {
				this.lift[i] = l;
				this.glow[i] = g;
				s2[i * 4] = Math.round(l * 255);
				s2[i * 4 + 1] = Math.round(g * 255);
				s2[i * 4 + 2] = (i * 47) % 255;
				dirty = true;
			}
		}
		if (dirty) this.state2Tex.needsUpdate = true;
	}

	/** İlin dünya konumundaki tepe noktası (kale, bayrak, kamera için). */
	topAt(index, out) {
		const p = this.provinces[index];
		return out.set(p.x, TOP + this.lift[index] * 1.4, p.z);
	}

	/** Dünya noktası → il indeksi (yoksa -1). */
	pick(x, z) {
		const y = -z;
		for (const p of this.provinces) for (const r of p.rings) if (pointInPoly(x, y, r)) return p.index;
		return -1;
	}

	/** İlin içinde, kenardan en az m uzaklıkta rastgele nokta (süsler için). */
	sample(index, R, m = 0.35) {
		const p = this.provinces[index];
		const r = p.rings[0];
		let minx = Infinity;
		let miny = Infinity;
		let maxx = -Infinity;
		let maxy = -Infinity;
		for (let i = 0; i < r.length; i += 2) {
			minx = Math.min(minx, r[i]);
			maxx = Math.max(maxx, r[i]);
			miny = Math.min(miny, r[i + 1]);
			maxy = Math.max(maxy, r[i + 1]);
		}
		for (let k = 0; k < 30; k++) {
			const x = minx + R() * (maxx - minx);
			const y = miny + R() * (maxy - miny);
			if (pointInPoly(x, y, r) && edgeDist(x, y, r) > m) return [x, -y];
		}
		return null;
	}

	/** Bölgedeki illerin indeksleri. */
	region(key) {
		return this.provinces.filter((p) => p.region === key).map((p) => p.index);
	}
}
