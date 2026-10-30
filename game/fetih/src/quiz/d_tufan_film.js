// Tufan filmi: tufan suyu, yağmur, şimşek ve fırtına ışığı (d_tufan.js'in sahnesi). Haritanın koduna kanca yok:
//
//   su       haritanın deniz shader'ının başlığı (ortak ışık, sis, gece, bitiriş işlevleri) + kendi gövdesi. Yükselen bir
//            düzlem; bir kabartma dokusu (R: kara yüksekliği, G: seçenek ilinin sırası) suyun altında kalan araziyi
//            bilir: yeni kıyıda köpük ve ıslak bant, ilerleyen cephede çamurlu, çalkantılı köpük, su altında kalan ova
//            turkuazdan (sığda arazi seçilir) derin laciverte geçer, fırtınada dalga sırtları ve beyaz köpük, yağmurda
//            damla halkaları, batan ilde halka dalga ve kabarcıklar, şimşekte çakan yerin çevresinde yumuşak yansıma.
//            İnce ayrıntı uzakta söner (piksel alanına göre): uzak denizde kıpırtı/karıncalanma yok.
//   yağmur   tek çizim: dünyaya sabit eğik çizgiler (hareket köşe shader'ında), kameranın önündeki kutuda.
//   şimşek   tek çizim: seyrek çakışta tampona yeniden yazılan dallanan çizgi (beyaz çekirdek + mavi hale, toplamalı).
//   fırtına  ortak ışık uniform'ları ölçülü kaydırılır (gündüz biraz serin ve koyu, gece maviliği korunur); şimşek
//            sahneyi beyaza boyamaz: gök ve sis hafifçe açılır, karanlıklara yumuşak bir ışık eklenir, ağır söner.
//            Hepsi kaydedilir ve soru bitince birebir geri konur. Ek geçiş yok.
//
// Kare başına bellek ayırma yok: bütün ara değerler önceden ayrılmış. Üç yeni program (su, yağmur, şimşek) ilk Tufan
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
uniform vec4 uBolt; // şimşek: x, z, ışık 0..1, yarıçap
uniform float uRain; // yağmur 0..1 (damla halkaları)
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
	// uzakta ince ayrıntı söner (piksel başına düşen alan büyükse kıpırtı/karıncalanma olmasın)
	float px = fwidth(p.x) + fwidth(p.y);
	float near = 1.0 - smoothstep(0.05, 0.22, px);
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
	g += vec2(0.83, 0.56) * cos(sw) * 0.09 * S * (0.35 + 0.65 * near);
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
	foam += S * crest * smoothstep(0.42, 0.72, texture(uNoise, p * 0.31 / 16.0 + t * 0.01).g) * smoothstep(0.5, 2.0, dist) * 0.9 * near;
#if TIER > 0
	// yağmur: suda açılıp sönen damla halkaları (yakında)
	if (uRain > 0.01 && near > 0.01) {
		vec2 rq = p * 2.4;
		vec2 rc = floor(rq);
		float rh = hash12(rc);
		vec2 ro = fract(rq) - 0.5 - (vec2(hash12(rc + 1.7), hash12(rc + 5.3)) - 0.5) * 0.5;
		float ph = fract(t * 1.1 + rh * 7.0);
		float rr = length(ro);
		float ring = smoothstep(0.04, 0.0, abs(rr - ph * 0.45)) * (1.0 - ph) * step(0.35, rh);
		foam += ring * uRain * near * 0.55;
	}
#endif
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
	// şimşek: suda yumuşak yansıma (çakan yerin çevresinde, parlak yüzeyde daha çok)
	if (uBolt.z > 0.001) {
		vec2 bd = (p - uBolt.xy) / uBolt.w;
		c += vec3(0.5, 0.6, 0.95) * uBolt.z * (0.04 + fres * 0.5) * (0.35 + exp(-dot(bd, bd)));
	}
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
uniform vec4 uRP;  // zaman, çizgi boyu, miktar, piksel açısı (birim/uzaklık)
uniform vec2 uWind;
varying float vA;
varying float vS;
void main() {
	float S = uRB.w;
	vec3 w;
	w.x = uRB.x + (fract((position.x * S - uRB.x) / S + 0.5) - 0.5) * S;
	w.z = uRB.z + (fract((position.y * S - uRB.z) / S + 0.5) - 0.5) * S;
	float fall = uRP.x * (0.85 + position.z * 0.3) * S * 1.1;
	w.y = uRB.y + (fract((position.z * 7.31 * S - fall - uRB.y) / S + 0.5) - 0.5) * S;
	vec3 rel = (w - uRB.xyz) / S;
	w.xz += uWind * (w.y - uRB.y);
	vec3 dir = normalize(vec3(-uWind.x, -1.0, -uWind.y));
	vec3 tc = cameraPosition - w;
	float dc = length(tc);
	// kalınlık: ekranda ~1,6 px (yakındaki damla biraz daha kalın), boy: hıza göre hareket izi
	vec3 side = normalize(cross(dir, tc)) * uRP.w * dc * (1.6 + 1.2 * smoothstep(0.5, 0.1, dc / S));
	vec3 pos = w - dir * uRP.y * (0.7 + position.z * 0.6) * aC.y + side * aC.x;
	float edge = 1.0 - smoothstep(0.32, 0.5, max(max(abs(rel.x), abs(rel.z)), abs(rel.y)));
	vA = (1.0 - aC.y * 0.9) * edge;
	vS = aC.x;
	gl_Position = aC.z < uRP.z ? projectionMatrix * viewMatrix * vec4(pos, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}`;
const RAIN_FS = /* glsl */ `
uniform vec4 uRCol; // rgb, saydamlık
varying float vA;
varying float vS;
void main() {
	gl_FragColor = vec4(uRCol.rgb, vA * (1.0 - vS * vS) * uRCol.a);
}`;

function rainOf(n) {
	const pos = new Float32Array(n * 4 * 3);
	const ac = new Float32Array(n * 4 * 3);
	const ix = new Uint16Array(n * 6);
	let s = 1234567;
	const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
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
		uRP: { value: new THREE.Vector4(0, 1, 0, 0.001) },
		uWind: { value: new THREE.Vector2(0.22, 0.1) },
		uRCol: { value: new THREE.Vector4(0.8, 0.85, 0.92, 0.5) },
	};
	const m = new THREE.ShaderMaterial({ vertexShader: RAIN_VS, fragmentShader: RAIN_FS, uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide });
	const mesh = new THREE.Mesh(g, m);
	mesh.frustumCulled = false;
	mesh.matrixAutoUpdate = false;
	mesh.renderOrder = 4;
	mesh.visible = false;
	return { mesh, U };
}

// ---------------------------------------------------------------- şimşek: dallanan ışık çizgisi (tek çizim)
// Her çakışta (8–15 sn'de bir) önceden ayrılmış tampona yeniden yazılır: ana kanal orta nokta kaydırmasıyla, birkaç
// dal; her parça iki katman (ince beyaz çekirdek, geniş mavi hale), kameraya dönük şerit, toplamalı karışım.

const BOLT_SEG = 160;
const BOLT_VS = /* glsl */ `
attribute vec3 aO; // parçanın öbür ucu
attribute vec3 aC; // x: yan (-1/1, uçta ters), y: kalınlık (px), z: parlaklık
uniform float uPx; // piksel açısı (birim/uzaklık)
varying float vS;
varying float vB;
varying float vW;
void main() {
	vec3 tc = cameraPosition - position;
	vec3 side = normalize(cross(aO - position, tc));
	vec3 p = position + side * aC.x * aC.y * uPx * length(tc);
	vS = sign(aC.x);
	vB = aC.z;
	vW = aC.y;
	gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const BOLT_FS = /* glsl */ `
uniform float uI;
varying float vS;
varying float vB;
varying float vW;
void main() {
	float k = 1.0 - vS * vS;
	float core = step(vW, 4.0);
	vec3 col = mix(vec3(0.45, 0.55, 1.0) * 0.6, vec3(1.0, 0.98, 1.0) * 1.3, core);
	gl_FragColor = vec4(col * k * k * vB * uI, 1.0);
}`;

function boltOf() {
	const N = BOLT_SEG * 2 * 4;
	const pos = new Float32Array(N * 3);
	const oth = new Float32Array(N * 3);
	const ac = new Float32Array(N * 3);
	const ix = new Uint16Array(BOLT_SEG * 2 * 6);
	for (let q = 0; q < BOLT_SEG * 2; q++) {
		const v = q * 4;
		ix.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], q * 6);
	}
	const g = new THREE.BufferGeometry();
	const aP = new THREE.BufferAttribute(pos, 3);
	const aO = new THREE.BufferAttribute(oth, 3);
	const aC = new THREE.BufferAttribute(ac, 3);
	g.setAttribute('position', aP);
	g.setAttribute('aO', aO);
	g.setAttribute('aC', aC);
	g.setIndex(new THREE.BufferAttribute(ix, 1));
	g.setDrawRange(0, 0);
	const U = { uPx: { value: 0.001 }, uI: { value: 0 } };
	const m = new THREE.ShaderMaterial({ vertexShader: BOLT_VS, fragmentShader: BOLT_FS, uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
	const mesh = new THREE.Mesh(g, m);
	mesh.frustumCulled = false;
	mesh.matrixAutoUpdate = false;
	mesh.renderOrder = 5;
	mesh.visible = false;
	// 2B çizgi (u yatay, v dikey 1 → 0) parçaları; yeniden kullanılan dizi
	const segs = new Float32Array(BOLT_SEG * 5); // u0, v0, u1, v1, parlaklık
	let ns = 0;
	let seed = 1;
	const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
	const line = (u0, v0, u1, v1, depth, rough, br, branch) => {
		// orta nokta kaydırması (özyinelemeli), uçlardan dal
		if (depth === 0 || ns >= BOLT_SEG) {
			if (ns < BOLT_SEG) segs.set([u0, v0, u1, v1, br], ns++ * 5);
			return;
		}
		const L = Math.hypot(u1 - u0, v1 - v0);
		const mu = (u0 + u1) / 2 + (rnd() - 0.5) * rough * L;
		const mv = (v0 + v1) / 2 + (rnd() - 0.5) * rough * L * 0.3;
		line(u0, v0, mu, mv, depth - 1, rough, br, branch);
		line(mu, mv, u1, v1, depth - 1, rough, br, branch);
		if (branch && depth >= 3 && rnd() < 0.42) {
			const dl = L * (0.35 + rnd() * 0.4);
			const ang = (rnd() < 0.5 ? -1 : 1) * (0.35 + rnd() * 0.5);
			line(mu, mv, mu + Math.sin(ang) * dl, mv - Math.cos(ang) * dl, depth - 2, rough * 1.1, br * 0.45, false);
		}
	};
	return {
		mesh,
		U,
		/** Yeni çakış: O (zemin), dikey boy H, yatay eksen (rx, rz) dünyada. */
		strike(ox, oy, oz, H, rx, rz, sd) {
			seed = 1 + Math.floor(sd * 2147483000);
			ns = 0;
			line(0, 1, (rnd() - 0.5) * 0.35, 0, 6, 0.55, 1, true);
			let q = 0;
			const put = (k, x, y, z, xo, yo, zo, side, w, br) => {
				pos[k * 3] = x;
				pos[k * 3 + 1] = y;
				pos[k * 3 + 2] = z;
				oth[k * 3] = xo;
				oth[k * 3 + 1] = yo;
				oth[k * 3 + 2] = zo;
				ac[k * 3] = side;
				ac[k * 3 + 1] = w;
				ac[k * 3 + 2] = br;
			};
			for (let i = 0; i < ns; i++) {
				const o = i * 5;
				const x0 = ox + rx * segs[o] * H;
				const y0 = oy + segs[o + 1] * H;
				const z0 = oz + rz * segs[o] * H;
				const x1 = ox + rx * segs[o + 2] * H;
				const y1 = oy + segs[o + 3] * H;
				const z1 = oz + rz * segs[o + 2] * H;
				const br = segs[o + 4];
				for (const [w, b] of [
					[2.8, br],
					[15, br * 0.55],
				]) {
					const v = q * 4;
					put(v, x0, y0, z0, x1, y1, z1, -1, w, b);
					put(v + 1, x0, y0, z0, x1, y1, z1, 1, w, b);
					put(v + 2, x1, y1, z1, x0, y0, z0, 1, w, b); // uçta öbür uç ters yönde: yan da ters
					put(v + 3, x1, y1, z1, x0, y0, z0, -1, w, b);
					q++;
				}
			}
			aP.needsUpdate = aO.needsUpdate = aC.needsUpdate = true;
			g.setDrawRange(0, q * 6);
		},
	};
}

/** Şimşek eğrileri (yaş sn): çizginin kendisi kısa ve doğal kırpışır; sahne ışığı yumuşak gelir, ağır söner. */
export const boltAt = (d) => (d < 0 || d > 0.9 ? 0 : d < 0.04 ? d / 0.04 : d < 0.08 ? 1 - ((d - 0.04) / 0.04) * 0.6 : d < 0.13 ? 0.4 + ((d - 0.08) / 0.05) * 0.5 : 0.9 * Math.exp(-(d - 0.13) * 8));
export const glowAt = (d) => (d < 0 || d > 3 ? 0 : d < 0.08 ? d / 0.08 : Math.exp(-(d - 0.08) * 2.6));

// ---------------------------------------------------------------- fırtına ışığı (ortak uniform'lar; kaydet, kaydır, geri koy)
// Ölçülü: gündüz fırtınası biraz serin ve koyu (renk kaybolmaz), gece maviliği korunur. Şimşek sahneyi beyaza
// boyamaz: gök ve sis hafifçe mavi-beyaza açılır, karanlıklara yumuşak bir ışık eklenir.

const STORM_FOG = new THREE.Color('#5c6d84');
const STORM_ZEN = new THREE.Color('#2a3850');
const STORM_HOR = new THREE.Color('#6b7d95');
const STORM_SKY = new THREE.Color('#7b8ea8');
const STORM_SUN = new THREE.Color('#c9d4e6');
const GLOW = new THREE.Color('#b9c8ff');
const GOLD = new THREE.Color('#ffd49a');
const GLOW_LIFT = new THREE.Color(0.05, 0.065, 0.12);

function stormOf(G) {
	const keys = ['uSunCol', 'uFogCol', 'uZenith', 'uHorizon', 'uSkyTop', 'uGain', 'uLift'];
	const saved = {};
	let on = false;
	const sv = { grade: new THREE.Vector4(), fogP: new THREE.Vector4(), vig: 0 };
	const tmp = new THREE.Color();
	const save = () => {
		for (const k of keys) saved[k] = (saved[k] || new THREE.Color()).copy(G[k].value);
		sv.grade.copy(G.uGrade.value);
		sv.fogP.copy(G.uFogP.value);
		sv.vig = G.uRes.value.z;
		on = true;
	};
	return {
		/** S: fırtına 0..1, L: şimşek ışığı 0..1 (yumuşak), gold: fırtına sonrası altın güneş 0..1, night: gece 0..1 */
		apply(S, L, gold, night = 0) {
			if (!on) save();
			const d = S * (1 - night);
			G.uGrade.value.set(sv.grade.x * (1 - 0.08 * d), sv.grade.y * (1 + 0.04 * d), sv.grade.z * (1 - 0.17 * d + 0.08 * gold), sv.grade.w);
			G.uFogP.value.set(sv.fogP.x * (1 + 0.45 * d), sv.fogP.y, sv.fogP.z, sv.fogP.w);
			G.uRes.value.z = sv.vig + 0.16 * d;
			tmp.copy(saved.uSunCol);
			G.uSunCol.value.copy(saved.uSunCol).multiply(STORM_SUN).lerp(tmp, 1 - 0.7 * d).lerp(GOLD, gold * 0.42);
			G.uFogCol.value.copy(saved.uFogCol).lerp(STORM_FOG, 0.45 * d).lerp(GLOW, L * 0.18);
			G.uZenith.value.copy(saved.uZenith).lerp(STORM_ZEN, 0.65 * d).lerp(GLOW, L * 0.22);
			G.uHorizon.value.copy(saved.uHorizon).lerp(STORM_HOR, 0.45 * d).lerp(GLOW, L * 0.3).lerp(GOLD, gold * 0.2);
			G.uSkyTop.value.copy(saved.uSkyTop).lerp(STORM_SKY, 0.4 * d).lerp(GLOW, L * 0.12);
			G.uGain.value.copy(saved.uGain).lerp(GOLD, gold * 0.14);
			G.uLift.value.copy(GLOW_LIFT).multiplyScalar(L * (0.5 + night)).add(saved.uLift);
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
		uBolt: { value: new THREE.Vector4(0, 0, 0, 10) },
		uRain: { value: 0 },
	};
	const mat = new THREE.ShaderMaterial({
		vertexShader: src.vertexShader,
		fragmentShader: src.fragmentShader.slice(0, cut) + MAIN(RC.toFixed(4)),
		uniforms: { ...src.uniforms, ...U },
		transparent: true,
		// kıyı sahanlığıyla neredeyse aynı düzlemde kalınca uzakta derinlik kavgası (çizgili kıyı) olmasın
		polygonOffset: true,
		polygonOffsetFactor: -2,
		polygonOffsetUnits: -2,
	});
	const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 1, 1).rotateX(-Math.PI / 2), mat);
	mesh.renderOrder = 2;
	mesh.matrixAutoUpdate = false;
	mesh.frustumCulled = false;
	mesh.visible = false;
	b.group.add(mesh);
	const tier = app.tier?.id ?? 1;
	const rain = rainOf([450, 900, 1300][tier] || 900);
	app.scene.add(rain.mesh);
	const bolt = boltOf();
	app.scene.add(bolt.mesh);
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
		bolt,
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
			bolt.mesh.visible = false;
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
		bolt.mesh.visible = true;
		if (r?.compileAsync) {
			const p1 = r.compileAsync(mesh, app.camera, app.scene);
			const p2 = r.compileAsync(rain.mesh, app.camera, app.scene);
			const p3 = r.compileAsync(bolt.mesh, app.camera, app.scene);
			fl.ready = Promise.all([p1, p2, p3]).catch(() => {});
		} else r?.compile?.(mesh, app.camera, app.scene);
	} catch {
		/* ilk çizimde derlenir */
	}
	mesh.visible = false;
	rain.mesh.visible = false;
	bolt.mesh.visible = false;
	FL = fl;
	return fl;
}

/** Yağmur kutusu: kameranın önünde (yakın), boyu uzaklıkla; miktar 0..1, gece 0..1. Piksel açısı kameradan. */
export function rainFrame(fl, cam, amount, t, night = 0, px = 0.001) {
	const R = fl.R;
	const c = cam.cam.position;
	const tg = cam.target;
	const d = Math.max(6, cam.dist);
	const S = R.uRB.value.w;
	// kutu boyu yalnız belirgin değişince güncellenir (dünyaya sabit damlalar kaymasın)
	const want = d * 0.45;
	const Sz = Math.abs(want - S) / S > 0.3 ? want : S;
	R.uRB.value.set(c.x + (tg.x - c.x) * 0.3, c.y + (tg.y - c.y) * 0.3, c.z + (tg.z - c.z) * 0.3, Sz);
	R.uRP.value.set(t, Sz * 0.11, amount, px);
	R.uRCol.value.set(0.8 - 0.3 * night, 0.85 - 0.28 * night, 0.92 - 0.2 * night, 0.42 - 0.12 * night);
	fl.rain.visible = amount > 0.01;
}

/** İlin yükselmesini doğrudan sür (kolaylaştırma gecikmesi olmadan): tahta lift'ten liftTo'ya bir kare yaklaşır. */
export function holdLift(b, i, y) {
	b.liftTo[i] = y;
	b.lift[i] = y + 0.01;
}
