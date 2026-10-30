// Tufan filmi: tufan suyu, yağmur ve fırtına ışığı (d_tufan.js'in sahnesi). Haritanın koduna kanca yok:
//
//   su       haritanın deniz shader'ının başlığı (ortak ışık, sis, gece, bitiriş işlevleri) + kendi gövdesi. Yükselen bir
//            düzlem; bir kabartma dokusu (R: kara yüksekliği, G: seçenek ilinin sırası) suyun altında kalan araziyi
//            bilir: yeni kıyıda köpük ve ıslak bant, ilerleyen cephede çamurlu, çalkantılı köpük, su altında kalan
//            ova turkuazdan (sığda arazi seçilir) derin laciverte geçer, fırtınada dalga sırtları ve beyaz köpük,
//            batan ilde halka dalga ve kabarcıklar, şimşekte yüzey parlar. Düzlem ıslak bant payı (δ) kadar yukarıda
//            çizilir: suyun hemen üstündeki kara yarı saydam koyulaşır (ıslak kıyı), ek çizim yok.
//   yağmur   tek çizim: dünyaya sabit eğik çizgiler (hareket köşe shader'ında), kameranın önündeki kutuda.
//   fırtına  ortak ışık uniform'ları (doygunluk, pozlama, güneş, sis, gök) ölçülü kaydırılır; şimşek kısa bir
//            pozlama çakmasıdır. Hepsi kaydedilir ve soru bitince birebir geri konur. Ek geçiş yok.
//
// Kare başına bellek ayırma yok: bütün ara değerler önceden ayrılmış. İki yeni program (su, yağmur) ilk Tufan
// sorusunda kurulur; paralel derleme varsa arkada derlenir, hazır olunca su asıl denizin yerine geçer.

import * as THREE from 'three';
import { RC } from '../map/fields.js';

const inPoly = (x, y, r) => {
	let c = false;
	for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) if (r[i + 1] > y !== r[j + 1] > y && x < ((r[j] - r[i]) * (y - r[i + 1])) / (r[j + 1] - r[i + 1]) + r[i]) c = !c;
	return c;
};

// ---------------------------------------------------------------- su gövdesi (deniz shader'ının başlığına eklenir)

const MAIN = (rc) => /* glsl */ `
uniform sampler2D uFH;
uniform vec4 uFHBox;
uniform vec4 uSunk; // seçenek illerinin batışı (0..1)
uniform vec4 uFl;   // x fırtına, y şimşek, z yükselme (cephe çalkantısı), w ıslak bant payı (birim)
uniform vec4 uSp;   // sıçrama: x, z, yaş (sn), yarıçap
void main() {
	vec2 uv = (vW.xz - uFBox.xy) * uFBox.zw;
	float eb = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
	float coast = texture(uWater, clamp(uv, 0.0, 1.0)).r * smoothstep(0.0, 0.06, eb);
	float L = vW.y - uFl.w; // gerçek su seviyesi: düzlem ıslak bant payı kadar yukarıda
	vec2 fh = texture(uFH, vec2((vW.x - uFHBox.x) * uFHBox.z, (-vW.z - uFHBox.y) * uFHBox.w)).rg;
	float id = floor(fh.y * 4.0 + 0.5);
	float sk = id < 0.5 ? 0.0 : id < 1.5 ? uSunk.x : id < 2.5 ? uSunk.y : id < 3.5 ? uSunk.z : uSunk.w;
	float land = fh.x - sk * 1.6;
	float depth = L - land;
	float t = uTime;
	vec2 p = vW.xz;
	float S = uFl.x;
	if (depth < 0.0) {
		// ıslak kıyı: suyun hemen üstündeki kara koyu ve parlak (yarı saydam: altındaki arazi görünür)
		float wk = smoothstep(-uFl.w, 0.0, depth);
		if (wk < 0.01) discard;
		float gl = smoothstep(0.82, 1.0, wk) * (0.5 + 0.5 * sin(t * 3.0 + p.x * 3.0 + p.y * 2.0));
		vec3 wc = mix(vec3(0.004, 0.012, 0.02), uSkyTop * 0.9 + uSunCol * 0.2, gl * 0.6) * (1.0 - uNight.x * 0.7);
		gl_FragColor = vec4(wc + vec3(0.6, 0.7, 0.9) * uFl.y * 0.15, wk * wk * mix(0.42, 0.3, uNight.x));
		return;
	}
	float drown = step(-0.3, fh.x); // suyun altında kalan kara (asıl deniz değil)
	float dist0 = (1.0 - coast) * ${rc} + max(L, 0.0) * 120.0;
	float dist = min(dist0, depth * 26.0 + 0.004);
	float ws = 1.0 + S * 0.8;
	vec2 g = vec2(0.0);
	g += vec2(0.6, 0.8) * cos(dot(p, vec2(0.6, 0.8)) * 0.9 + t * 1.2 * ws) * 0.05 * (1.0 + S * 1.4);
	g += vec2(-0.8, 0.5) * cos(dot(p, vec2(-0.8, 0.5)) * 1.7 + t * 1.7 * ws) * 0.035 * (1.0 + S);
	// fırtına dalgası: uzun, rüzgâr yönünde kabaran sırtlar
	float sw = dot(p, vec2(0.83, 0.56)) * 0.62 - t * (1.0 + 1.4 * S) + texture(uNoise, p * 0.05).r * 6.0;
	g += vec2(0.83, 0.56) * cos(sw) * 0.09 * S;
	float crest = pow(0.5 + 0.5 * sin(sw), 7.0);
#if TIER > 0
	g += (vec2(texture(uNoise, p * 1.1 / 64.0 + t * 0.0055).g, texture(uNoise, p * 1.1 / 64.0 - t * 0.0047 + 0.5).g) - 0.5) * (0.12 + 0.1 * S);
#endif
	vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
	vec3 V = normalize(cameraPosition - vW);
	vec3 deep = uSeaDeep * mix(0.93, 1.03, texture(uNoise, p * 0.04 / 8.0).a);
	vec3 base = mix(deep, uSea, smoothstep(2.2, 0.3, dist));
	base = mix(base, vec3(0.122, 0.768, 0.658), smoothstep(0.32, 0.02, dist) * 0.75);
	// su altında kalan ova: sığda turkuaz, derinleştikçe lacivert (yükselen deniz tarlaları yutar)
	vec3 dr = mix(vec3(0.03, 0.43, 0.5), vec3(0.004, 0.02, 0.075), smoothstep(0.012, 0.2, depth));
	base = mix(base, dr, drown * smoothstep(0.004, 0.04, depth) * 0.85);
	// ilerleyen cephe: çamurlu, bulanık sel suyu
	base = mix(base, vec3(0.3, 0.24, 0.11), uFl.z * drown * smoothstep(1.4, 0.1, dist) * 0.7);
	gWxW = wxAt(p);
	vec4 wx = gWxW * uWx.x;
	gWxK = 0.4 + 0.6 * smoothstep(0.15, 1.5, dist);
	base = mix(base, vec3(0.04, 0.63, 0.65), wx.b * smoothstep(4.5, 0.25, dist) * 0.55 * (1.0 - S));
	base *= mix(vec3(1.0), vec3(0.78, 0.94, 0.9), wx.r * 0.75);
	// fırtına: gri, soğuk deniz
	base = mix(base, vec3(dot(base, vec3(0.3, 0.55, 0.15))) * vec3(0.8, 0.92, 1.05), S * 0.4);
	float ndv = clamp(dot(N, V), 0.0, 1.0);
	float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
	vec3 c = base * (uSkyTop * 1.05 + uSunCol * 0.26 * max(dot(N, uSunDir), 0.0));
	c = mix(c, skyReflect(reflect(-V, N)), fres * 0.7);
	vec3 H = normalize(uSunDir + V);
	c += uSunCol * pow(max(dot(N, H), 0.0), 320.0) * 2.4 * (1.0 - S * 0.7);
	float wl = smoothstep(0.985, 1.0, sin(dot(p, vec2(0.42, 0.91)) * 1.1 + texture(uNoise, p * 0.22 / 16.0).r * 9.0 + t * 0.5)) * smoothstep(0.8, 2.6, dist) * texture(uNoise, p * 0.15 / 8.0 + 0.3).a;
	c += uSunCol * wl * 0.018;
	// kıyı köpüğü: kıyıya koşan dalga çizgileri + kıyı çizgisinde beyaz yaka; yükselirken cephe kalın ve çalkantılı
	float wave = sin(dist * 26.0 - t * (1.8 + 2.6 * uFl.z) + texture(uNoise, p * 0.8 / 32.0).b * 5.0) * 0.5 + 0.5;
	float foam = smoothstep(0.35, 0.08, dist) * smoothstep(0.72, 0.98, wave) * 0.55 + smoothstep(0.07, 0.015, dist);
	float ch = texture(uNoise, p * 0.9 / 16.0 + vec2(t * 0.05, -t * 0.04)).r;
	foam = max(foam, uFl.z * smoothstep(0.9, 0.02, dist) * smoothstep(0.3, 0.6, ch) * 0.95);
	// fırtına: açıkta sırtlarda beyaz köpük
	foam += S * crest * smoothstep(0.42, 0.72, texture(uNoise, p * 0.31 / 16.0 + t * 0.01).g) * smoothstep(0.5, 2.0, dist) * 1.1;
	if (uSp.w > 0.0) {
		// batan il: genişleyen halka dalga, içinde kaynayan kabarcıklar
		float r = length(p - uSp.xy);
		float age = uSp.z;
		float R = uSp.w * (0.35 + age * 0.85);
		foam += smoothstep(0.3 + age * 0.2, 0.0, abs(r - R)) * exp(-age * 1.1) * 0.95;
		float ins = smoothstep(uSp.w * 0.95, uSp.w * 0.25, r) * exp(-age * 0.8);
		vec2 bq = p * 4.5 + vec2(0.0, t * 0.5);
		vec2 bc = floor(bq);
		float bh = hash12(bc);
		float bub = step(0.62, bh) * smoothstep(0.34, 0.12, length(fract(bq) - 0.5)) * (0.5 + 0.5 * sin(t * 9.0 + bh * 40.0));
		foam += ins * (0.22 + bub * 0.9);
	}
	c = mix(c, vec3(1.0) * (uSkyTop + uSunCol * 0.32), clamp(foam, 0.0, 1.0) * 0.82);
	if (uNight.z > 0.001) c += DAWN * uNight.z * fres * 0.5;
	vec3 stars = vec3(0.0);
	if (uNight.x > 0.001) {
		vec3 R = reflect(-V, N);
		R.y = abs(R.y);
		vec3 Rc = reflect(-V, normalize(vec3(-g.x * 0.06, 1.0, -g.y * 0.06)));
		Rc.y = abs(Rc.y);
		vec3 body = mix(vec3(0.001, 0.0016, 0.005), vec3(0.002, 0.006, 0.012), smoothstep(2.2, 0.3, dist));
		float fr = 0.35 + 0.4 * pow(1.0 - ndv, 3.0);
		vec3 n = mix(body, nightSky(Rc) * 0.5, fr);
		stars = starField(Rc) * fr * 0.12 * uNight.x * (1.0 - S * 0.8);
		float mc = max(dot(Rc, N_MOON), 0.0);
		n += vec3(0.16, 0.2, 0.34) * pow(mc, 14.0) * 0.3;
		float m = max(dot(R, N_MOON), 0.0);
		n += vec3(0.7, 0.76, 0.9) * pow(m, 700.0) * 0.7 * (0.3 + 0.7 * smoothstep(0.6, 0.95, mc));
		n -= vec3(1.5, 1.55, 1.7) * smoothstep(0.99935, 0.99965, mc) * 0.5 * fr;
		n += vec3(0.1, 0.16, 0.26) * clamp(foam, 0.0, 1.0) * (0.05 + 0.1 * S);
		// gece kıyısı: soğuk ışıklı yaka (karanlıkta da yeni kıyı okunsun)
		n += vec3(0.3, 0.75, 0.95) * smoothstep(0.14, 0.0, dist) * 0.3;
		c = mix(c, n, uNight.x);
		gRelit = 1.0;
	}
	// şimşek: yüzey ve yansıma bir an bembeyaz
	c += vec3(0.62, 0.7, 0.9) * uFl.y * (0.12 + fres * 1.6 + crest * 0.2);
	c = applyFog(c, vW);
	c += stars;
	c = edgeMist(c, vW);
	// sığda yarı saydam: su altında kalan arazi seçilir
	float a = mix(1.0, mix(0.5, 1.0, smoothstep(0.0, 0.11, depth)), drown);
	gl_FragColor = finish(c, clamp(a + clamp(foam, 0.0, 1.0) * 0.6, 0.0, 1.0));
}`;

// ---------------------------------------------------------------- yağmur

const RAIN_VS = /* glsl */ `
attribute vec3 aC; // x: yan (-1/1), y: uç (0 baş, 1 kuyruk), z: sıra (miktar eşiği)
uniform vec4 uRB;  // kutu merkezi, boyu
uniform vec4 uRP;  // zaman, çizgi boyu, miktar, kalınlık
uniform vec2 uWind;
varying float vA;
varying float vS;
void main() {
	float S = uRB.w;
	vec3 w;
	w.x = uRB.x + (fract((position.x * S - uRB.x) / S + 0.5) - 0.5) * S;
	w.z = uRB.z + (fract((position.y * S - uRB.z) / S + 0.5) - 0.5) * S;
	float fall = uRP.x * (0.8 + position.z * 0.4) * S * 0.9;
	w.y = uRB.y + (fract((position.z * 7.31 * S - fall - uRB.y) / S + 0.5) - 0.5) * S;
	vec3 rel = (w - uRB.xyz) / S;
	w.xz += uWind * (w.y - uRB.y);
	vec3 dir = normalize(vec3(-uWind.x, -1.0, -uWind.y));
	vec3 tc = cameraPosition - w;
	vec3 side = normalize(cross(dir, tc)) * uRP.w * length(tc);
	vec3 pos = w - dir * uRP.y * aC.y + side * aC.x;
	float edge = 1.0 - smoothstep(0.3, 0.5, max(max(abs(rel.x), abs(rel.z)), abs(rel.y)));
	vA = (1.0 - aC.y * 0.85) * edge;
	vS = aC.x;
	gl_Position = aC.z < uRP.z ? projectionMatrix * viewMatrix * vec4(pos, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}`;
const RAIN_FS = /* glsl */ `
uniform vec4 uRCol; // rgb, şimşek
varying float vA;
varying float vS;
void main() {
	float a = vA * (1.0 - vS * vS) * 0.34;
	gl_FragColor = vec4(uRCol.rgb + uRCol.a * 0.8, a * (1.0 + uRCol.a));
}`;

function rainOf(n) {
	const pos = new Float32Array(n * 4 * 3);
	const ac = new Float32Array(n * 4 * 3);
	const ix = new Uint16Array(n * 6);
	let s = 1234567;
	const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
	for (let i = 0; i < n; i++) {
		const rx = rnd();
		const rz = rnd();
		const ry = rnd();
		const rank = rnd();
		for (let k = 0; k < 4; k++) {
			const o = (i * 4 + k) * 3;
			pos[o] = rx;
			pos[o + 1] = rz;
			pos[o + 2] = ry;
			ac[o] = k & 1 ? 1 : -1;
			ac[o + 1] = k < 2 ? 0 : 1;
			ac[o + 2] = rank;
		}
		const v = i * 4;
		ix.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], i * 6);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setAttribute('aC', new THREE.BufferAttribute(ac, 3));
	g.setIndex(new THREE.BufferAttribute(ix, 1));
	const U = {
		uRB: { value: new THREE.Vector4(0, 0, 0, 30) },
		uRP: { value: new THREE.Vector4(0, 1, 0, 0.0011) },
		uWind: { value: new THREE.Vector2(0.28, 0.12) },
		uRCol: { value: new THREE.Vector4(0.62, 0.68, 0.76, 0) },
	};
	const m = new THREE.ShaderMaterial({ vertexShader: RAIN_VS, fragmentShader: RAIN_FS, uniforms: U, transparent: true, depthWrite: false });
	const mesh = new THREE.Mesh(g, m);
	mesh.frustumCulled = false;
	mesh.matrixAutoUpdate = false;
	mesh.renderOrder = 4;
	mesh.visible = false;
	return { mesh, U };
}

// ---------------------------------------------------------------- fırtına ışığı (ortak uniform'lar; kaydet, kaydır, geri koy)

const STORM_FOG = new THREE.Color('#48535f');
const STORM_ZEN = new THREE.Color('#222b36');
const STORM_HOR = new THREE.Color('#5a6571');
const STORM_SKY = new THREE.Color('#6a7686');
const FLASH = new THREE.Color('#dfe8ff');
const GOLD = new THREE.Color('#ffd9a0');
const FLASH_LIFT = new THREE.Color(0.3, 0.34, 0.46);

function stormOf(G) {
	const keys = ['uSunCol', 'uFogCol', 'uZenith', 'uHorizon', 'uSkyTop', 'uGain', 'uLift'];
	const saved = {};
	let on = false;
	const sv = { grade: new THREE.Vector4(), fogP: new THREE.Vector4(), vig: 0 };
	const save = () => {
		for (const k of keys) saved[k] = (saved[k] || new THREE.Color()).copy(G[k].value);
		sv.grade.copy(G.uGrade.value);
		sv.fogP.copy(G.uFogP.value);
		sv.vig = G.uRes.value.z;
		on = true;
	};
	return {
		/** S: fırtına 0..1, F: şimşek 0..1, gold: fırtına sonrası altın güneş 0..1, night: gece odağı 0..1 */
		apply(S, F, gold, night = 0) {
			if (!on) save();
			G.uGrade.value.set(sv.grade.x * (1 - 0.42 * S), sv.grade.y * (1 + 0.06 * S), sv.grade.z * (1 - 0.27 * S + 0.85 * F + 0.08 * gold), sv.grade.w);
			G.uFogP.value.set(sv.fogP.x * (1 + 0.6 * S), sv.fogP.y, sv.fogP.z, sv.fogP.w);
			G.uRes.value.z = sv.vig + 0.24 * S;
			G.uSunCol.value.copy(saved.uSunCol).multiplyScalar(1 - 0.6 * S).lerp(FLASH, F * 0.7).lerp(GOLD, gold * 0.35);
			G.uFogCol.value.copy(saved.uFogCol).lerp(STORM_FOG, 0.6 * S * (1 - night)).lerp(FLASH, F * 0.35);
			G.uZenith.value.copy(saved.uZenith).lerp(STORM_ZEN, 0.7 * S).lerp(FLASH, F * 0.5);
			G.uHorizon.value.copy(saved.uHorizon).lerp(STORM_HOR, 0.6 * S).lerp(FLASH, F * 0.5).lerp(GOLD, gold * 0.25);
			G.uSkyTop.value.copy(saved.uSkyTop).lerp(STORM_SKY, 0.45 * S).lerp(FLASH, F * 0.3);
			G.uGain.value.copy(saved.uGain).lerp(GOLD, gold * 0.12);
			// şimşek: karanlık da aydınlanır (gecede bütün harita bir an mavi-beyaz)
			G.uLift.value.copy(saved.uLift).lerp(FLASH_LIFT, F * (0.35 + 0.4 * night));
		},
		restore() {
			if (!on) return;
			on = false;
			for (const k of keys) G[k].value.copy(saved[k]);
			G.uGrade.value.copy(sv.grade);
			G.uFogP.value.copy(sv.fogP);
			G.uRes.value.z = sv.vig;
		},
	};
}

// ---------------------------------------------------------------- tufan (tahta başına bir kez kurulur)

let FL = null;

/**
 * Tufan sahnesi: { mesh, rain, on(), off(), level(m birim), setOpts(idx), U (su uniform'ları), R (yağmur uniform'ları),
 * storm, hAt(x, z), pidAt(x, z), ready (derleme sözü) }. Kare sürücüsü fl.tick: on() ile off() arasında her çizimin
 * başında (scene.onBeforeRender; off() eskisini geri koyar).
 */
export function floodOf(app) {
	const b = app?.board;
	const src = b?.sea?.material;
	if (!src?.fragmentShader || !b.relief || !b.G) return null;
	if (FL && FL.b === b) return FL;
	const cut = src.fragmentShader.indexOf('void main()');
	if (cut < 0 || !/uniform sampler2D uWater/.test(src.fragmentShader)) return null;
	// kabartma ızgarası: il içi kara yüksekliği, dışı (deniz, komşu ülke) derin; il sırası (kamera ve seçenekler için)
	const rel = b.relief;
	const m = rel.m;
	const W = m.w;
	const H = m.h;
	const st = m.step;
	const h = new Float32Array(W * H).fill(-0.4);
	const pid = new Uint8Array(W * H);
	b.provinces.forEach((p, pi) => {
		const [bx0, bz0, bx1, bz1] = p.box;
		const i0 = Math.max(0, Math.floor((bx0 - m.x0) / st));
		const i1 = Math.min(W - 1, Math.ceil((bx1 - m.x0) / st));
		const j0 = Math.max(0, Math.floor((-bz1 - m.y0) / st));
		const j1 = Math.min(H - 1, Math.ceil((-bz0 - m.y0) / st));
		for (let j = j0; j <= j1; j++)
			for (let i = i0; i <= i1; i++) {
				const x = m.x0 + i * st;
				const y = m.y0 + j * st;
				for (const r of p.rings)
					if (inPoly(x, y, r)) {
						h[j * W + i] = rel.height(x, y);
						pid[j * W + i] = pi + 1;
						break;
					}
			}
	});
	const hd = new Uint16Array(W * H * 2);
	for (let k = 0; k < W * H; k++) hd[k * 2] = THREE.DataUtils.toHalfFloat(h[k]);
	const tex = new THREE.DataTexture(hd, W, H, THREE.RGFormat, THREE.HalfFloatType);
	tex.minFilter = tex.magFilter = THREE.LinearFilter;
	tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
	tex.colorSpace = THREE.NoColorSpace;
	tex.generateMipmaps = false;
	tex.needsUpdate = true;
	const U = {
		uFH: { value: tex },
		uFHBox: { value: new THREE.Vector4(m.x0 - st / 2, m.y0 - st / 2, 1 / (W * st), 1 / (H * st)) },
		uSunk: { value: new THREE.Vector4() },
		uFl: { value: new THREE.Vector4() },
		uSp: { value: new THREE.Vector4() },
	};
	const mat = new THREE.ShaderMaterial({
		vertexShader: src.vertexShader,
		fragmentShader: src.fragmentShader.slice(0, cut) + MAIN(RC.toFixed(4)),
		uniforms: { ...src.uniforms, ...U },
		transparent: true,
	});
	const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 1, 1).rotateX(-Math.PI / 2), mat);
	mesh.renderOrder = 2;
	mesh.matrixAutoUpdate = false;
	mesh.frustumCulled = false;
	mesh.visible = false;
	b.group.add(mesh);
	const tier = app.tier?.id ?? 1;
	const rain = rainOf([320, 640, 900][tier] || 640);
	app.scene.add(rain.mesh);
	const cell = (x, z) => {
		const i = Math.round((x - m.x0) / st);
		const j = Math.round((-z - m.y0) / st);
		return i < 0 || j < 0 || i >= W || j >= H ? -1 : j * W + i;
	};
	let opts = [];
	const fl = {
		b,
		mesh,
		rain: rain.mesh,
		U,
		R: rain.U,
		storm: stormOf(b.G),
		tick: null,
		live: false,
		prevBR: null,
		ready: Promise.resolve(),
		/** İl sırası (0: il dışı) ve kara yüksekliği (il dışı -0.4). */
		pidAt(x, z) {
			const k = cell(x, z);
			return k < 0 ? 0 : pid[k];
		},
		hAt(x, z) {
			const k = cell(x, z);
			return k < 0 ? -0.4 : h[k];
		},
		/** Seçenek illeri (sırayla 1..4) dokunun G kanalına: batan ilin üstünde su derinleşir. */
		setOpts(idx) {
			const want = new Map(idx.map((i, k) => [i + 1, (k + 1) / 4]));
			const old = new Set(opts.map((i) => i + 1));
			for (let k = 0; k < W * H; k++) {
				const q = pid[k];
				if (!q) continue;
				const g = want.get(q);
				if (g !== undefined) hd[k * 2 + 1] = THREE.DataUtils.toHalfFloat(g);
				else if (old.has(q)) hd[k * 2 + 1] = 0;
			}
			opts = idx.slice();
			tex.needsUpdate = true;
		},
		level(y) {
			mesh.position.y = y + U.uFl.value.w;
			mesh.updateMatrix();
		},
		on() {
			U.uSunk.value.set(0, 0, 0, 0);
			U.uSp.value.set(0, 0, 0, 0);
			fl.live = true;
			if (scene.onBeforeRender !== drive) {
				fl.prevBR = Object.prototype.hasOwnProperty.call(scene, 'onBeforeRender') ? scene.onBeforeRender : null;
				scene.onBeforeRender = drive;
			}
			fl.level(0);
			mesh.visible = true;
			b.sea.visible = false;
		},
		off() {
			fl.tick = null;
			fl.live = false;
			if (scene.onBeforeRender === drive) {
				if (fl.prevBR) scene.onBeforeRender = fl.prevBR;
				else delete scene.onBeforeRender;
			}
			mesh.visible = false;
			rain.mesh.visible = false;
			b.sea.visible = true;
			fl.storm.restore();
		},
	};
	// kare sürücüsü: sahnenin çizim başında (bütün malzemeler aynı karenin ışığını görsün); yalnız tufan sürerken
	const scene = app.scene;
	const drive = () => fl.tick?.();
	// derleme: soru anında (cevaptan önce); paralel derleme varsa arkada, hazır olunca su görünür
	try {
		const r = app.renderer;
		mesh.visible = true;
		rain.mesh.visible = true;
		if (r?.compileAsync) {
			const p1 = r.compileAsync(mesh, app.camera, app.scene);
			const p2 = r.compileAsync(rain.mesh, app.camera, app.scene);
			fl.ready = Promise.all([p1, p2]).catch(() => {});
		} else r?.compile?.(mesh, app.camera, app.scene);
	} catch {
		/* ilk çizimde derlenir */
	}
	mesh.visible = false;
	rain.mesh.visible = false;
	FL = fl;
	return fl;
}

/** Yağmur kutusu: kameranın önünde (kamera ile odak arası), boyu uzaklıkla; miktar 0..1, şimşek 0..1, gece 0..1. */
export function rainFrame(fl, cam, amount, flash, t, night = 0) {
	const R = fl.R;
	const c = cam.cam.position;
	const tg = cam.target;
	const d = Math.max(6, cam.dist);
	const S = R.uRB.value.w;
	// kutu boyu yalnız belirgin değişince güncellenir (dünyaya sabit damlalar kaymasın; değişim kesmelerde olur)
	const want = d * 0.62;
	const Sz = Math.abs(want - S) / S > 0.3 ? want : S;
	R.uRB.value.set(c.x + (tg.x - c.x) * 0.42, c.y + (tg.y - c.y) * 0.42, c.z + (tg.z - c.z) * 0.42, Sz);
	R.uRP.value.set(t, Sz * 0.09, amount, 0.0012);
	R.uRCol.value.set(0.62 - 0.34 * night, 0.68 - 0.32 * night, 0.76 - 0.26 * night, flash);
	fl.rain.visible = amount > 0.01;
}

/** Şimşek eğrisi: çift çakma ve sönüş (yaş sn). */
export const flashAt = (d) => (d < 0 ? 0 : d < 0.07 ? 1 : d < 0.13 ? 0.2 : d < 0.21 ? 0.75 : d < 1 ? 0.75 * Math.exp(-(d - 0.21) * 9) : 0);

/** İlin yükselmesini doğrudan sür (kolaylaştırma gecikmesi olmadan): tahta lift'ten liftTo'ya bir kare yaklaşır. */
export function holdLift(b, i, y) {
	b.liftTo[i] = y;
	b.lift[i] = y + 0.01;
}
