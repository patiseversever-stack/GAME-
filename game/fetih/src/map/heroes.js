// Kahraman maketler (Kuşbakışı yakın çekimi): haritadaki birleşik maket (landmarks.js) uzaktan bakış için
// yalındır; Kuşbakışı sorusu açılınca kamera bir yapının dibine iner. O an yalnız O yapının yüksek ayrıntılı
// "kahraman" modeli kurulur (ilk kullanımda, tembel) ve haritadaki yalın kopyanın yerine konur; soru kapanınca
// kaldırılır (LOD takası). Birleşik maket hiç değişmez: haritanın çizim çağrısı ve üçgen bütçesi aynı kalır.
//
// Yöntem (gerçek doku indirilemez, her şey prosedürel):
//   1. Geometri: hero_*.js yapıcıları gerçek oranlarla modeller (kemerli cephe boşlukları gerçek oyuk, kasnak
//      pencereleri, şerefe, mukarnas dişleri, revaklar, sütun başlıkları…). Kademe 0'da segmentler azalır.
//   2. Desen koordinatı (köşe başına `pat`, yerel birim): kutu ve düz yüzlerde yüzün kendi düzleminde, tornada
//      (kubbe, külah, kasnak) geometrinin kendi açısal koordinatında. Shader bununla kesme taş sıraları, tuğla,
//      kurşun levha dikişleri, kiremit, çini, mermer damarı, döşeme taşı, kaya katmanı çizer; her biri yüzey
//      eğimini de değiştirir (ekran uzayı kabartma: derz içeri, taş dışarı). Uzaklaştıkça desen ortalama renge
//      söner (titreşim yok).
//   3. Ortam örtmesi: kurulurken CPU'da bir kez pişirilir (modelin hacim ızgarası + köşe başına 12 ışın): kemer
//      içleri, saçak altları, sütun dipleri, avlu köşeleri koyulaşır. Gölge haritası (yakın çekimde daralır)
//      güneş gölgesini verir.
//   4. Işık ve renk: haritanın aynı ışık, sis, bölge havası ve ton eşlemesi (shaderlib) — yapı sahneye oturur.
//
// Bellek: köşe başına 32 bayt (konum f32×3, normal i8×4, renk u8×4, bilgi u8×4, desen f32×2). Son 2 model
// önbellekte tutulur. Shader programı açılışta derlenir (yer tutucu geometriyle bir kez çizilir).

import * as THREE from 'three';
import { COMMON, SHADOW, LIGHT, FINISH, PROV } from '../gfx/shaderlib.js';
import { Kit } from '../gfx/kit.js';

/** Kahraman malzemeleri (köşe bilgisi x). Haritadaki M ile ilk 11'i aynı anlamda. */
export const H = {
	STONE: 0, WATER: 1, WIN: 2, GOLD: 3, LEAD: 4, FLAG: 5, FLAME: 6, LEAF: 7, GROUND: 8, TILE: 9, CLOTH: 10,
	ASHLAR: 11, BRICK: 12, RTILE: 13, ROCK: 14, PLASTER: 15, WOOD: 16, MARBLE: 17, PAVE: 18, GRASS: 19,
	TRAV: 20, MOSAIC: 21, CARVE: 22, BAND: 23, DIRT: 24, METAL: 25, GLAZE: 26,
};

// ------------------------------------------------------------------ shader

const VS = /* glsl */ `
${COMMON}
${PROV}
attribute vec4 col;  // sRGB renk; a: hareket grubu (0 durağan, 1.. balon)
attribute vec4 info; // x malzeme, y il (tag), z tabandan yükseklik ×100 (yerel), w ortam örtmesi ×255
attribute vec2 pat;  // desen koordinatı (yerel birim)
uniform float uPLift, uPSel;
uniform float uHS; // dünya birimi / yerel birim (yapının ölçeği)
uniform float uAO; // ortam örtmesinin bittiği an (uTime); belirme 0,35 sn
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying vec4 vI;
varying vec2 vP;
varying vec2 vSel;
varying float vGnd;
void main() {
	vec4 fx = provRow(info.y, 3);
	vec3 p = position;
	float id = info.x;
	float grp = floor(col.a * 255.0 + 0.5);
	// grup 200: avlunun dış halkaları (ground()); haritadaki ekran boyu kahramanında çizilmez, haritanın kendi
	// zemini kalır (yapının tabanı yalın kopyayla aynı yere oturur, kıyıda havada disk olmaz)
	vGnd = grp > 199.5 ? 1.0 : 0.0;
	if (grp > 0.5 && grp < 199.5) {
		// balon: süzülme (haritadaki maketle aynı hareket)
		float ph = grp * 0.37 * 7.31;
		p.y += sin(uTime * 0.6 + ph) * 0.14;
		p.x += sin(uTime * 0.27 + ph * 1.7) * 0.08;
		p.z += cos(uTime * 0.21 + ph * 2.3) * 0.04;
	}
	if (abs(id - ${H.FLAG}.0) < 0.5) {
		// bayrak: direkten uca büyüyen dalga (pat.x: direkten uzaklık oranı)
		float u = pat.x;
		float ph = uTime * 5.2 - u * 5.5;
		p.z += sin(ph) * 0.03 * u * uHS;
		p.y += sin(ph * 0.5 + 1.0) * 0.006 * u * uHS;
	}
	p.y += fx.x * uPLift + fx.z * uPSel;
	vW = p;
	vN = normal;
	vec3 c = col.rgb;
	vC = c * c * (c * 0.305306 + 0.682171) + 0.012523 * c; // sRGB → doğrusal
	vI = vec4(id, info.z * 0.01, mix(1.0, info.w / 255.0, clamp((uTime - uAO) / 0.35, 0.0, 1.0)), grp);
	vP = pat;
	vSel = fx.zw;
	gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FS = /* glsl */ `
#define SHADOW_TAPS __TAPS__
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
${PROV}
uniform float uHS;
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying vec4 vI;
varying vec2 vP;
varying vec2 vSel;

float hh(vec2 p) { return hash12(p * 1.731 + 17.3); }
// gürültü dokusu (uNoise): r 16, g 64, b 32, a 8 hücre
float nz(vec2 p) { return texture(uNoise, p).g; }
float nzL(vec2 p) { return texture(uNoise, p).a; }
float nzM(vec2 p) { return texture(uNoise, p).r; }
// çizgi: d merkeze uzaklık (hücre birimi), w yarı kalınlık, f piksel genişliği (hücre birimi)
float ln(float d, float w, float f) { return 1.0 - smoothstep(w - f, w + f, d); }
// desen sönümü: hücre başına ~6 pikselden az düşüyorsa desen ortalama tona söner (titreşim, "piksel" görünümü yok)
float farK(float f) { return 1.0 - smoothstep(0.06, 0.17, f); }

// --- desen sonuçları (genel)
vec3 gAlb;    // albedo çarpanı
float gH;     // kabartma yüksekliği (yerel birim)
float gGloss; // parıltı
float gAO;    // ek örtme (derz, oyuk)
float gFar;   // desen sönümü (1 yakın, 0 uzak)

/** Sıra sıra kesme taş: rh sıra yüksekliği, bl ortalama blok boyu (yerel birim). */
void ashlar(vec2 uv, float rh, float bl, float var, float bev) {
	float row = floor(uv.y / rh);
	float fy = fract(uv.y / rh);
	float L = bl * (0.7 + 0.6 * hh(vec2(row, 3.1)));
	float x = uv.x / L + hh(vec2(row, 9.7));
	float cl = floor(x);
	float fxx = fract(x);
	vec2 f = fwidth(uv) / vec2(L, rh);
	gFar = farK(max(f.x, f.y));
	float jx = min(fxx, 1.0 - fxx) * L / rh; // derz uzaklığı sıra yüksekliği biriminde
	float jy = min(fy, 1.0 - fy);
	float d = min(jx, jy);
	float m = ln(d, 0.05, max(f.y, f.x * L / rh) * 1.2);
	float id = hh(vec2(cl, row));
	float n = nz(uv * 3.1);
	gAlb = mix(vec3(1.0), vec3(0.9 + 0.2 * id) * (0.94 + 0.12 * n) * mix(vec3(1.0), vec3(1.03, 0.99, 0.94), hh(vec2(cl * 3.0, row))), var * gFar);
	gAlb *= mix(1.0, 0.74, m * gFar);
	gAO = mix(1.0, 0.82, m * gFar);
	gH = (smoothstep(0.0, bev, d) * 0.6 + n * 0.25) * rh * 0.22 * gFar;
}

/** Kurşun levha: pat geometrinin açısal koordinatı (x kaburga, y kat); dikişler kabarık. */
void lead(vec2 uv) {
	vec2 f = fwidth(uv);
	gFar = farK(max(f.x, f.y));
	float rx = min(fract(uv.x), 1.0 - fract(uv.x));
	float ry = min(fract(uv.y), 1.0 - fract(uv.y));
	float rib = ln(rx, 0.05, f.x * 1.3);
	float lap = ln(ry, 0.03, f.y * 1.3);
	float s = nzL(vec2(uv.x * 0.21, uv.y * 0.07));
	float n = nz(uv * vec2(0.6, 2.3));
	// oksit: yağmur izleri aşağı doğru akar, levhalar hafif ton farklı
	gAlb = vec3(0.92 + 0.14 * hh(floor(uv))) * (0.9 + 0.2 * n) * mix(vec3(1.0), vec3(0.93, 1.0, 1.05), s * gFar);
	gAlb = mix(vec3(1.0), gAlb, gFar);
	gAlb *= 1.0 + 0.12 * rib * gFar;
	gH = (rib * 0.012 + lap * 0.004 + n * 0.002) * gFar;
	gGloss = 0.42 + 0.2 * s;
}

/** Tuğla: ince sıralar, şaşırtmalı derz, açık harç. */
void brick(vec2 uv, float rh) {
	float row = floor(uv.y / rh);
	float fy = fract(uv.y / rh);
	float x = uv.x / (rh * 3.2) + 0.5 * mod(row, 2.0);
	float fxx = fract(x);
	vec2 f = fwidth(uv) / vec2(rh * 3.2, rh);
	gFar = farK(max(f.x, f.y));
	float d = min(min(fxx, 1.0 - fxx) * 3.2, min(fy, 1.0 - fy));
	float m = ln(d, 0.09, max(f.y, f.x * 3.2) * 1.2);
	float id = hh(vec2(floor(x), row));
	gAlb = mix(vec3(1.0), vec3(0.8 + 0.35 * id, 0.82 + 0.25 * id, 0.85 + 0.2 * id), gFar);
	gAlb = mix(gAlb, vec3(1.55, 1.45, 1.3), m * gFar);
	gAO = mix(1.0, 0.85, m * gFar);
	gH = smoothstep(0.0, 0.2, d) * rh * 0.15 * gFar;
}

/** Kiremit: eğim boyunca sıralar (y), yatay dalga (x); her kiremit hafif ton farklı. */
void rtile(vec2 uv) {
	float rh = 0.013;
	float row = floor(uv.y / rh);
	float fy = fract(uv.y / rh);
	float w = 0.011;
	float x = uv.x / w + 0.5 * mod(row, 2.0);
	float fxx = fract(x);
	vec2 f = fwidth(uv) / vec2(w, rh);
	gFar = farK(max(f.x, f.y));
	float bump = sin(fxx * 3.14159);
	float edge = smoothstep(0.75, 1.0, fy);
	float id = hh(vec2(floor(x), row));
	gAlb = mix(vec3(1.0), vec3(0.82 + 0.34 * id, 0.86 + 0.22 * id, 0.86 + 0.2 * id) * (1.0 - 0.32 * edge) * (0.82 + 0.25 * bump), gFar);
	gAO = mix(1.0, 0.8 + 0.2 * bump, gFar);
	gH = (bump * 0.5 + fy * 0.5) * rh * 0.5 * gFar;
}

/** Çini: kare karolar, ortada sekiz köşeli yıldız ve yaprak; kobalt, turkuaz, beyaz. */
void tile(vec2 uv, vec3 base) {
	float s = 0.026;
	vec2 c = fract(uv / s) - 0.5;
	vec2 f = fwidth(uv) / s;
	gFar = farK(max(f.x, f.y));
	vec2 a = abs(c);
	float r = length(c);
	float st = max(a.x + a.y, max(a.x, a.y) * 1.41421); // sekiz köşeli yıldız
	float star = 1.0 - smoothstep(0.34 - f.x, 0.34 + f.x, st);
	float ring = ln(abs(r - 0.24), 0.03, f.x * 1.5);
	float joint = ln(0.5 - max(a.x, a.y), 0.025, f.x * 1.5);
	vec3 white = vec3(0.92, 0.94, 0.95);
	vec3 cob = vec3(0.04, 0.12, 0.42);
	vec3 col = base;
	col = mix(col, white, ring);
	col = mix(col, cob, star * 0.85);
	col = mix(col, white, (1.0 - smoothstep(0.08, 0.1, r)));
	col = mix(col, vec3(0.75), joint);
	gAlb = mix(vec3(1.0), col / max(base, vec3(0.02)), gFar);
	gGloss = 0.75;
	gH = (1.0 - joint) * 0.0015 * gFar;
}

/** Mermer: açık zemin, ince damarlar, cilalı. */
void marble(vec2 uv) {
	float n = nzM(uv * 0.9) * 0.6 + nz(uv * 2.0) * 0.4;
	float v = ln(abs(fract(n * 5.0 + uv.y * 0.4) - 0.5), 0.03, fwidth(n * 5.0) + 0.01);
	gAlb = vec3(1.0) - vec3(0.12, 0.1, 0.08) * v - 0.04 * nz(uv * 6.0);
	gGloss = 0.45;
	gH = 0.0;
	gFar = 1.0;
}

/** Döşeme taşı: düzensiz dikdörtgen plakalar. */
void pave(vec2 uv, float sz) {
	float row = floor(uv.y / sz);
	float fy = fract(uv.y / sz);
	float L = sz * 1.5;
	float x = uv.x / L + hh(vec2(row, 1.3));
	float fxx = fract(x);
	vec2 f = fwidth(uv) / sz;
	gFar = farK(max(f.x, f.y));
	float d = min(min(fxx, 1.0 - fxx) * 1.5, min(fy, 1.0 - fy));
	float m = ln(d, 0.04, max(f.x, f.y) * 1.3);
	float id = hh(vec2(floor(x), row));
	gAlb = mix(vec3(1.0), vec3(0.85 + 0.3 * id) * (0.9 + 0.2 * nz(uv * 4.0)), gFar);
	gAlb *= mix(1.0, 0.6, m * gFar);
	gAO = mix(1.0, 0.85, m * gFar);
	gH = smoothstep(0.0, 0.1, d) * sz * 0.08 * gFar;
}

/** Kaya: katman çizgileri (yükseklik), çatlaklar ve leke. */
void rock(vec2 uv, float y) {
	// katman çizgileri yüksekliğe bağlı (kaya boyunca yatay), lekeler ve ince pürüz; kabartma hafif (kaya
	// biçimi geometriden gelir, desen yalnız yüzey dokusu)
	float n = nzM(uv * 0.3 + y * 0.15);
	float n2 = nz(uv * 0.45);
	float strata = sin((y + n * 0.06) * 70.0);
	vec2 f = fwidth(uv * 0.45 * 64.0);
	float k = farK(max(f.x, f.y) * 0.5);
	gAlb = vec3(0.9 + 0.14 * n) * (0.95 + 0.06 * strata) * mix(1.0, 0.92 + 0.16 * n2, k);
	gAlb *= mix(vec3(1.0), vec3(1.05, 1.0, 0.93), nzL(uv * 0.15));
	gH = (n2 * 0.0022 * k + strata * 0.0005);
	gFar = 1.0;
}

/** Sıva / badana: lekeler, dipte toz. */
void plaster(vec2 uv, float y) {
	float n = nzM(uv * 0.5) * 0.6 + nz(uv * 3.0) * 0.4;
	gAlb = vec3(0.93 + 0.1 * n) * mix(vec3(0.86, 0.84, 0.8), vec3(1.0), smoothstep(0.0, 0.08, y));
	gH = n * 0.0015;
	gFar = 1.0;
}

/** Ahşap: yatay tahtalar, damar. */
void wood(vec2 uv) {
	float rh = 0.008;
	float row = floor(uv.y / rh);
	float fy = fract(uv.y / rh);
	vec2 f = fwidth(uv) / rh;
	gFar = farK(f.y);
	float g = nz(vec2(uv.x * 0.8, row * 0.37));
	gAlb = mix(vec3(1.0), vec3(0.85 + 0.25 * hh(vec2(row, 2.0))) * (0.88 + 0.24 * g), gFar);
	float m = ln(min(fy, 1.0 - fy), 0.06, f.y * 1.2);
	gAlb *= mix(1.0, 0.55, m * gFar);
	gH = smoothstep(0.0, 0.15, min(fy, 1.0 - fy)) * rh * 0.15 * gFar;
}

/** Oyma süsleme (taş kabartma): geçmeli geometrik örgü. */
void carve(vec2 uv) {
	float s = 0.03;
	vec2 c = uv / s;
	float a = sin(c.x * 3.14159) * sin(c.y * 3.14159);
	float b = sin((c.x + c.y) * 2.2214) * sin((c.x - c.y) * 2.2214);
	float v = max(abs(a), abs(b) * 0.9);
	vec2 f = fwidth(c);
	gFar = farK(max(f.x, f.y));
	float rid = smoothstep(0.55, 0.8, v);
	gAlb = mix(vec3(1.0), vec3(0.78 + 0.3 * rid), gFar);
	gAO = mix(1.0, 0.75 + 0.25 * rid, gFar);
	gH = rid * 0.004 * gFar;
}

/** Mozaik: küçük taşlar, bordür ve madalyon (Zeugma). */
void mosaic(vec2 uv) {
	float s = 0.0045;
	vec2 g = floor(uv / s);
	vec2 fc = fract(uv / s);
	vec2 f = fwidth(uv) / s;
	gFar = farK(max(f.x, f.y));
	vec2 q = uv - vec2(0.32, 0.2); // oda zemininin ortası (desen koordinatı geometrinin kendi 0..1 yüzü × 0,64 × 0,4)
	float r = length(q);
	float ang = atan(q.y, q.x);
	vec3 terr = vec3(0.62, 0.3, 0.18);
	vec3 cream = vec3(0.92, 0.85, 0.7);
	vec3 dark = vec3(0.16, 0.12, 0.1);
	vec3 ochre = vec3(0.8, 0.58, 0.25);
	vec3 col = cream;
	// madalyon: halkalar ve yüz silueti yerine çiçek
	col = mix(col, terr, step(abs(r - 0.12), 0.012));
	col = mix(col, dark, step(abs(r - 0.15), 0.006));
	float petal = 0.06 + 0.03 * cos(ang * 8.0);
	col = mix(col, ochre, step(r, petal));
	col = mix(col, terr, step(r, 0.025));
	// meander bordür
	vec2 b = abs(q);
	float edge = max(b.x / 0.32, b.y / 0.2);
	float mband = step(0.86, edge) * step(edge, 0.96);
	float mz = step(0.5, fract((q.x + q.y) * 18.0)) ;
	col = mix(col, mix(dark, cream, mz), mband);
	col = mix(col, terr, step(0.97, edge) * step(edge, 1.0));
	float id = hh(g);
	col *= 0.9 + 0.2 * id;
	float m = ln(min(min(fc.x, 1.0 - fc.x), min(fc.y, 1.0 - fc.y)), 0.08, max(f.x, f.y));
	col *= mix(1.0, 0.7, m * gFar);
	gAlb = col / max(vC, vec3(0.05));
	gH = (1.0 - m) * 0.0006 * gFar;
	gGloss = 0.2;
}

varying float vGnd;
uniform float uLodMode; // 1: haritadaki ekran boyu kahramanı (avlunun dış halkaları çizilmez)
uniform float uFade; // haritada ekran boyuna göre geliş (herolod.js): yalın kopyayla tamamlayıcı titreşimli geçiş
void main() {
	// aynı ekran eşiği yalın kopyada ters yönde (landmarks.js): ikisi birlikte her pikseli tam bir kez örter
	if (uFade < 0.999 && fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) >= uFade) discard;
	if (uLodMode > 0.5 && vGnd > 0.5) discard;
	vec3 N = normalize(vN);
	vec3 V = normalize(cameraPosition - vW);
	float id = floor(vI.x + 0.5);
	float hgt = vI.y;
	if (dot(N, V) < 0.0 && id == ${H.FLAG}.0) N = -N;
	vec2 uv = vP;
	gAlb = vec3(1.0);
	gH = 0.0;
	gGloss = 0.1;
	gAO = 1.0;
	gFar = 1.0;
	float rimK = 0.5;
	bool bare = false;
	vec3 base = vC;
	if (id == ${H.ASHLAR}.0) ashlar(uv, 0.019, 0.042, 1.0, 0.18);
	else if (id == ${H.BAND}.0) {
		// almaşık duvar: taş sıraları arasında tuğla kuşaklar (Bizans, Selçuklu)
		float b = fract(uv.y / 0.09);
		if (b < 0.3) { brick(uv, 0.0055); base = vec3(0.55, 0.22, 0.14); gAlb *= vC.r > 0.4 ? vec3(1.0) : vec3(1.0); }
		else ashlar(uv, 0.02, 0.04, 1.0, 0.15);
	}
	else if (id == ${H.BRICK}.0) brick(uv, 0.0062);
	else if (id == ${H.LEAD}.0) lead(uv);
	else if (id == ${H.RTILE}.0) rtile(uv);
	else if (id == ${H.TILE}.0) tile(uv, vC);
	else if (id == ${H.GLAZE}.0) {
		// sırlı düz çini: ince derzli kareler, cam gibi parlak, karo karo ton farkı
		vec2 c = uv / 0.018;
		vec2 f = fwidth(c);
		gFar = farK(max(f.x, f.y));
		vec2 q = fract(c);
		float j = max(ln(min(q.x, 1.0 - q.x), 0.04, f.x), ln(min(q.y, 1.0 - q.y), 0.04, f.y));
		gAlb = mix(vec3(1.0), vec3(0.92 + 0.16 * hh(floor(c))) * mix(1.0, 0.72, j), gFar);
		gGloss = 0.8;
		gH = (1.0 - j) * 0.001 * gFar;
	}
	else if (id == ${H.MARBLE}.0) marble(uv);
	else if (id == ${H.PAVE}.0) { pave(uv, 0.022); bare = true; }
	else if (id == ${H.ROCK}.0 || id == ${H.TRAV}.0) {
		rock(uv, hgt);
		if (id == ${H.TRAV}.0) { gAlb = mix(gAlb, vec3(1.0), 0.6); gGloss = 0.3; }
	}
	else if (id == ${H.PLASTER}.0) plaster(uv, hgt);
	else if (id == ${H.WOOD}.0) wood(uv);
	else if (id == ${H.CARVE}.0) carve(uv);
	else if (id == ${H.MOSAIC}.0) { mosaic(uv); bare = true; }
	else if (id == ${H.STONE}.0) { gAlb = vec3(0.93 + 0.12 * nz(uv * 3.0)) * (0.95 + 0.08 * nzM(uv * 0.6)); gH = nz(uv * 5.0) * 0.001; }
	else if (id == ${H.GRASS}.0 || id == ${H.DIRT}.0 || id == ${H.GROUND}.0) {
		float n = nzM(uv * 0.4) * 0.5 + nz(uv * 2.5) * 0.5;
		gAlb = vec3(0.82 + 0.36 * n);
		if (id == ${H.GRASS}.0) gAlb *= mix(vec3(1.08, 0.96, 0.8), vec3(0.9, 1.05, 0.95), nzL(uv * 0.3));
		gH = n * 0.0012;
		bare = true;
		rimK = 0.15;
	}
	else if (id == ${H.LEAF}.0) {
		float n = nz(uv * 6.0);
		gAlb = vec3(0.75 + 0.5 * n) * mix(vec3(1.0), vec3(1.08, 1.06, 0.8), nzM(uv));
		gH = n * 0.0035;
		rimK = 0.9;
	}
	else if (id == ${H.WIN}.0) {
		// cam ve kayıtlar: koyu cam gökyüzünü yansıtır, ince doğrama ızgarası
		vec2 g = fract(uv / vec2(0.012, 0.016));
		vec2 f = fwidth(uv) / vec2(0.012, 0.016);
		float fr = max(ln(min(g.x, 1.0 - g.x), 0.06, f.x), ln(min(g.y, 1.0 - g.y), 0.05, f.y)) * (1.0 - smoothstep(0.15, 0.4, max(f.x, f.y)));
		gAlb = mix(vec3(1.0), vec3(3.2, 2.8, 2.3), fr);
		gGloss = mix(0.95, 0.2, fr);
		bare = true;
	}
	else if (id == ${H.WATER}.0) {
		float t = uTime;
		vec2 q = vW.xz / uHS;
		float w = nz(q * 1.4 + vec2(t * 0.05, t * 0.03)) + nz(q * 2.1 - vec2(t * 0.04, -t * 0.02));
		gH = w * 0.004;
		gGloss = 0.95;
		bare = true;
	}
	else if (id == ${H.GOLD}.0) gGloss = 0.92;
	else if (id == ${H.METAL}.0) gGloss = 0.7;
	else if (id == ${H.CLOTH}.0 || id == ${H.FLAG}.0) { gGloss = 0.2; bare = true; }
	else if (id == ${H.FLAME}.0) bare = true;
	// kabartma: desen yüksekliğinin ekran uzayı türevi (teğet gerekmez)
	float hW = gH * uHS;
	vec3 dpx = dFdx(vW);
	vec3 dpy = dFdy(vW);
	float dhx = dFdx(hW);
	float dhy = dFdy(hW);
	vec3 r1 = cross(dpy, N);
	vec3 r2 = cross(N, dpx);
	float det = dot(dpx, r1);
	vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
	vec3 Np = normalize(abs(det) * N - grad);
	if (dot(Np, Np) > 0.5 && abs(det) > 1e-12) N = Np;
	vec3 alb = base * gAlb * 0.92;
	// pişmiş örtme (ızgara ışınları) + dipte toprak koyuluğu + desen oyukları
	float ao = vI.z * gAO;
	if (!bare) ao *= mix(0.72, 1.0, smoothstep(0.0, 0.06, hgt));
	// zemin seviyesindeki kir ve yağmur izi
	if (!bare && id != ${H.GOLD}.0 && id != ${H.WIN}.0) alb *= mix(vec3(0.78, 0.74, 0.7), vec3(1.0), smoothstep(0.0, 0.05, hgt));
	float sh = shadowAt(vW, normalize(vN));
	gLit = 1.0; // kahraman sahnenin öznesi: gece odağında da ışık havuzunda
	gPool = poolK(vW.xz);
	vec3 c = shade(alb, N, V, ao, sh, gGloss, rimK);
	if (id == ${H.GOLD}.0) c += uSunCol * alb * 0.3;
	if (id == ${H.WATER}.0) c = mix(c, skyReflect(reflect(-V, N)) * 0.8, 0.35);
	if (id == ${H.FLAME}.0) c = vec3(1.0, 0.52, 0.16) * (2.2 + 0.8 * sin(uTime * 17.0 + vW.x * 30.0));
	c = provDim(c, vSel.x, vSel.y);
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

const DEPTH_VS = /* glsl */ `
uniform float uTime;
${PROV}
attribute vec4 col;
attribute vec4 info;
attribute vec2 pat;
uniform float uPLift, uPSel, uHS;
void main() {
	float id = info.x;
	// yere serili zemin, su ve alev gölge yapmaz
	if (abs(id - ${H.WATER}.0) < 0.5 || abs(id - ${H.FLAME}.0) < 0.5 || abs(id - ${H.PAVE}.0) < 0.5 || abs(id - ${H.GRASS}.0) < 0.5 || abs(id - ${H.GROUND}.0) < 0.5 || abs(id - ${H.MOSAIC}.0) < 0.5) {
		gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
		return;
	}
	vec4 fx = provRow(info.y, 3);
	vec3 p = position;
	float grp = floor(col.a * 255.0 + 0.5);
	if (grp > 0.5 && grp < 199.5) p.y += sin(uTime * 0.6 + grp * 0.37 * 7.31) * 0.14;
	p.y += fx.x * uPLift + fx.z * uPSel;
	gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const DEPTH_FS = /* glsl */ `void main(){ gl_FragColor = vec4(1.0); }`;

// ------------------------------------------------------------------ kit

const S_LUT = (() => {
	const t = new Uint8Array(4097);
	for (let i = 0; i <= 4096; i++) {
		const c = i / 4096;
		t[i] = Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
	}
	return t;
})();
const toS8 = (c) => S_LUT[Math.max(0, Math.min(4096, Math.round(c * 4096)))];
const _mm = new THREE.Matrix4();
const _ta = new THREE.Matrix4();
const _nm = new THREE.Matrix3();
const _v3 = new THREE.Vector3();
const _s3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const PRIM = new Map(); // parça önbelleği (bütün kahramanlar ortak)

/** Büyüyen Float32 tampon (kurulum sırasında dizi push'u yerine). */
class FBuf {
	constructor(n = 1 << 15) {
		this.a = new Float32Array(n);
		this.n = 0;
	}
	need(k) {
		if (this.n + k <= this.a.length) return;
		let m = this.a.length * 2;
		while (m < this.n + k) m *= 2;
		const b = new Float32Array(m);
		b.set(this.a.subarray(0, this.n));
		this.a = b;
	}
}

/**
 * Kahraman kiti: Kit'in bütün parçaları + malzeme kimliği, desen koordinatı ve hareket grubu. Varsayılan yumuşak
 * normal (geometrinin kendi normali); flat() düz gölgeleme (yontulmuş taş, çokgen gövde). Köşeler doğrudan
 * Float32 tamponlara yazılır (geometri başına dönüşüm ve normal hesabı tek döngüde).
 *   k.mc(H.ASHLAR, '#d9c7a4')   malzeme + renk
 *   k.uvGeo(su, sv)             sonraki parçalar geometrinin açısal koordinatıyla (kubbe kaburgası, külah)
 *   k.uvBox()                   yüz düzleminde (vars.)
 *   k.uvS(s)                    desen ölçeği (büyük taş için < 1)
 */
export class HKit extends Kit {
	constructor() {
		super();
		this.P = new FBuf(1 << 17);
		this.N = new FBuf(1 << 17);
		this.Cl = new FBuf(1 << 17);
		this.U = new FBuf(1 << 16);
		this.I = new FBuf(1 << 17);
		this._smooth = true;
		this._uvm = 0;
		this._su = 1;
		this._sv = 1;
		this._us = 1;
		this.inv = 1; // 1 / yapı ölçeği (dünya → yerel)
		this._grp = 0;
	}
	get count() {
		return this.P.n / 3;
	}
	get uvs() {
		return this.U.a;
	}
	mc(id, hex, k = 1) {
		this.color(hex, k);
		this._mat = id;
		return this;
	}
	flat() {
		this._smooth = false;
		return this;
	}
	soft() {
		this._smooth = true;
		return this;
	}
	uvGeo(su = 1, sv = 1) {
		this._uvm = 1;
		this._su = su;
		this._sv = sv;
		return this;
	}
	uvBox() {
		this._uvm = 0;
		return this;
	}
	uvS(s = 1) {
		this._us = s;
		return this;
	}
	group(g) {
		this._grp = g;
		return this;
	}

	add(geo, local = null) {
		const M = local ? _mm.multiplyMatrices(this.m, local) : this.m;
		this._geo(geo, M);
		geo.dispose();
		return this;
	}

	/** Geometriyi (dizinli ya da değil) geçerli malzeme ve desen kipiyle yaz; kopya üretmeden. */
	_geo(g, M) {
		const pa = g.getAttribute('position');
		const na = this._smooth ? g.getAttribute('normal') : null;
		const ua = this._uvm === 1 ? g.getAttribute('uv') : null;
		const ca = g.getAttribute('color');
		this._write(pa.array, pa.itemSize, na ? na.array : null, ua ? ua.array : null, M, this._hs, null, g.index ? g.index.array : null, ca ? ca.array : null);
	}

	drape(geo, hf, lift = 0, tf = null) {
		const pa = geo.getAttribute('position');
		this._write(pa.array, pa.itemSize, null, null, this.m, 0, { hf, lift, y0: this.m.elements[13], tf }, geo.index ? geo.index.array : null);
		geo.dispose();
		return this;
	}

	// --- sık parçalar: geometri bir kez kurulur ve önbellekten yazılır (kurulumda bellek çöpü az)
	_prim(key, make, M) {
		let g = PRIM.get(key);
		if (!g) {
			if (PRIM.size > 900) PRIM.clear();
			g = make();
			PRIM.set(key, g);
		}
		this._geo(g, M);
		return this;
	}
	_atM(x, y, z, ry = 0, sy = 1) {
		_ta.compose(_v3.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _s3.set(1, sy, 1));
		return _mm.multiplyMatrices(this.m, _ta);
	}
	box(w, h, d, x = 0, y = 0, z = 0, ry = 0) {
		return this._prim(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), this._atM(x, y, z, ry));
	}
	cyl(rt, rb, h, seg = 8, x = 0, y = 0, z = 0, open = false) {
		const n = this._n(seg);
		return this._prim(`c${rt},${rb},${h},${n},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, n, 1, open).translate(0, h / 2, 0), this._atM(x, y, z));
	}
	cone(r, h, seg = 8, x = 0, y = 0, z = 0, ry = 0) {
		const n = this._n(seg);
		return this._prim(`k${r},${h},${n}`, () => new THREE.ConeGeometry(r, h, n, 1, true).translate(0, h / 2, 0), this._atM(x, y, z, ry));
	}
	dome(r, seg = 10, x = 0, y = 0, z = 0, sy = 1) {
		const n = this._n(seg);
		return this._prim(`d${r},${n}`, () => new THREE.SphereGeometry(r, n, Math.max(2, Math.round(n / 2)), 0, Math.PI * 2, 0, Math.PI / 2), this._atM(x, y, z, 0, sy));
	}
	sphere(r, seg = 8, x = 0, y = 0, z = 0, sy = 1) {
		const n = this._n(seg);
		return this._prim(`s${r},${n}`, () => new THREE.SphereGeometry(r, n, Math.max(3, Math.round(n * 0.6))), this._atM(x, y, z, 0, sy));
	}
	/** Önbellekli serbest geometri (ağaç tacı, kaya): make() bir kez çağrılır. */
	cached(key, make, local) {
		return this._prim(key, make, _mm.multiplyMatrices(this.m, local));
	}

	/** csrc: köşe başına doğrusal renk (geometrinin `color` özniteliği; arazi parçası, kaya yüzü): k.color yerine. */
	_write(src, isz, nsrc, uvsrc, M, hs, dr, idx = null, csrc = null) {
		const cnt = idx ? idx.length : (src.length / isz) | 0;
		const tri = cnt - (cnt % 3);
		if (!tri) return;
		const e = M.elements;
		const P = this.P, N = this.N, Cl = this.Cl, U = this.U, I = this.I;
		P.need(tri * 3);
		N.need(tri * 3);
		Cl.need(tri * 3);
		U.need(tri * 2);
		I.need(tri * 4);
		const p0 = P.n;
		const pa = P.a;
		for (let i = 0; i < tri; i++) {
			const v = idx ? idx[i] : i;
			const x = src[v * isz], y = src[v * isz + 1], z = src[v * isz + 2];
			let wx = e[0] * x + e[4] * y + e[8] * z + e[12];
			let wy = e[1] * x + e[5] * y + e[9] * z + e[13];
			const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
			if (dr) wy = dr.hf(wx, wz) + (wy - dr.y0) + dr.lift;
			pa[p0 + i * 3] = wx;
			pa[p0 + i * 3 + 1] = wy;
			pa[p0 + i * 3 + 2] = wz;
		}
		// normaller: yumuşakta geometrinin normali (normal matrisiyle), düzde yüz normali
		const na = N.a;
		const n0 = N.n;
		if (nsrc) {
			const m = _nm.getNormalMatrix(M).elements;
			for (let i = 0; i < tri; i++) {
				const v = idx ? idx[i] : i;
				const x = nsrc[v * 3], y = nsrc[v * 3 + 1], z = nsrc[v * 3 + 2];
				const nx = m[0] * x + m[3] * y + m[6] * z;
				const ny = m[1] * x + m[4] * y + m[7] * z;
				const nz = m[2] * x + m[5] * y + m[8] * z;
				const l = Math.hypot(nx, ny, nz) || 1;
				na[n0 + i * 3] = nx / l;
				na[n0 + i * 3 + 1] = ny / l;
				na[n0 + i * 3 + 2] = nz / l;
			}
		} else {
			for (let t = 0; t < tri; t += 3) {
				const a = p0 + t * 3;
				const ux = pa[a + 3] - pa[a], uy = pa[a + 4] - pa[a + 1], uz = pa[a + 5] - pa[a + 2];
				const vx = pa[a + 6] - pa[a], vy = pa[a + 7] - pa[a + 1], vz = pa[a + 8] - pa[a + 2];
				let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
				const l = Math.hypot(nx, ny, nz) || 1;
				nx /= l;
				ny /= l;
				nz /= l;
				for (let j = 0; j < 3; j++) {
					na[n0 + (t + j) * 3] = nx;
					na[n0 + (t + j) * 3 + 1] = ny;
					na[n0 + (t + j) * 3 + 2] = nz;
				}
			}
		}
		// renk (yüksekliğe göre geçiş), bilgi (malzeme, il, yükseklik, grup)
		const ca = Cl.a, ia = I.a;
		const c0 = Cl.n, i0 = I.n;
		const gr = this._grad;
		const col = this._col;
		for (let i = 0; i < tri; i++) {
			const y = pa[p0 + i * 3 + 1];
			const h = (y - this._base) * hs;
			if (csrc) {
				const v = (idx ? idx[i] : i) * 3;
				ca[c0 + i * 3] = csrc[v];
				ca[c0 + i * 3 + 1] = csrc[v + 1];
				ca[c0 + i * 3 + 2] = csrc[v + 2];
			} else if (gr) {
				let t = Math.min(1, Math.max(0, (h - gr[2]) / (gr[3] - gr[2])));
				t = t * t * (3 - 2 * t);
				ca[c0 + i * 3] = gr[0][0] + (gr[1][0] - gr[0][0]) * t;
				ca[c0 + i * 3 + 1] = gr[0][1] + (gr[1][1] - gr[0][1]) * t;
				ca[c0 + i * 3 + 2] = gr[0][2] + (gr[1][2] - gr[0][2]) * t;
			} else {
				ca[c0 + i * 3] = col[0];
				ca[c0 + i * 3 + 1] = col[1];
				ca[c0 + i * 3 + 2] = col[2];
			}
			ia[i0 + i * 4] = this._mat;
			ia[i0 + i * 4 + 1] = dr && dr.tf ? dr.tf(pa[p0 + i * 3], pa[p0 + i * 3 + 2]) : this._tag;
			ia[i0 + i * 4 + 2] = h;
			ia[i0 + i * 4 + 3] = this._grp;
		}
		// desen koordinatı (yerel birim)
		const ua = U.a;
		const u0 = U.n;
		if (uvsrc) {
			for (let i = 0; i < tri; i++) {
				const v = idx ? idx[i] : i;
				ua[u0 + i * 2] = uvsrc[v * 2] * this._su;
				ua[u0 + i * 2 + 1] = uvsrc[v * 2 + 1] * this._sv;
			}
		} else {
			const s = this.inv * this._us;
			for (let t = 0; t < tri; t += 3) {
				const a = p0 + t * 3;
				const ux = pa[a + 3] - pa[a], uy = pa[a + 4] - pa[a + 1], uz = pa[a + 5] - pa[a + 2];
				const vx = pa[a + 6] - pa[a], vy = pa[a + 7] - pa[a + 1], vz = pa[a + 8] - pa[a + 2];
				const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
				const l = Math.hypot(nx, ny, nz) || 1;
				if (Math.abs(ny / l) > 0.72) {
					for (let j = 0; j < 3; j++) {
						ua[u0 + (t + j) * 2] = pa[a + j * 3] * s;
						ua[u0 + (t + j) * 2 + 1] = pa[a + j * 3 + 2] * s;
					}
				} else {
					const hl = Math.hypot(nx, nz) || 1;
					const tx = -nz / hl;
					const tz = nx / hl;
					for (let j = 0; j < 3; j++) {
						ua[u0 + (t + j) * 2] = (pa[a + j * 3] * tx + pa[a + j * 3 + 2] * tz) * s;
						ua[u0 + (t + j) * 2 + 1] = pa[a + j * 3 + 1] * s;
					}
				}
			}
		}
		P.n += tri * 3;
		N.n += tri * 3;
		Cl.n += tri * 3;
		U.n += tri * 2;
		I.n += tri * 4;
	}

	/**
	 * Derlenmiş, sıkıştırılmış geometri. Ortam örtmesi: aoOn 'sync' ise hemen pişirilir; true ise iş
	 * g.userData.ao üreteci olarak döner (Heroes kare kare dilimler, bitince yumuşakça belirir).
	 */
	buildHero(aoOn = true) {
		const n = this.count;
		const pos = this.P.a.slice(0, n * 3);
		const nor = new Int8Array(n * 4);
		const col = new Uint8Array(n * 4);
		const info = new Uint8Array(n * 4);
		const pat = this.U.a.slice(0, n * 2);
		const na = this.N.a, ca = this.Cl.a, ia = this.I.a;
		// sRGB tablosu (doğrusal → 8 bit)
		for (let i = 0; i < n; i++) {
			nor[i * 4] = Math.round(na[i * 3] * 127);
			nor[i * 4 + 1] = Math.round(na[i * 3 + 1] * 127);
			nor[i * 4 + 2] = Math.round(na[i * 3 + 2] * 127);
			col[i * 4] = toS8(ca[i * 3]);
			col[i * 4 + 1] = toS8(ca[i * 3 + 1]);
			col[i * 4 + 2] = toS8(ca[i * 3 + 2]);
			col[i * 4 + 3] = ia[i * 4 + 3];
			info[i * 4] = ia[i * 4];
			info[i * 4 + 1] = ia[i * 4 + 1];
			info[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(ia[i * 4 + 2] * 100)));
			info[i * 4 + 3] = 255;
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
		g.setAttribute('normal', new THREE.BufferAttribute(nor, 4, true));
		g.setAttribute('col', new THREE.BufferAttribute(col, 4, true));
		g.setAttribute('info', new THREE.BufferAttribute(info, 4));
		g.setAttribute('pat', new THREE.BufferAttribute(pat, 2));
		g.computeBoundingSphere();
		if (aoOn) {
			const job = bakeAO(pos, nor, info, n);
			if (aoOn === 'sync') while (!job.next().done);
			else g.userData.ao = job;
		}
		return g;
	}
}

// ------------------------------------------------------------------ ortam örtmesi (CPU, bir kez)

// yarım küre yönleri (+z çevresinde, kosinüs ağırlıklı): 12 ışın
const DIRS = (() => {
	const d = [];
	const n = 10;
	for (let i = 0; i < n; i++) {
		const u = (i + 0.5) / n;
		const r = Math.sqrt(u);
		const a = i * 2.39996;
		d.push([Math.cos(a) * r, Math.sin(a) * r, Math.sqrt(1 - u)]);
	}
	return d;
})();

/**
 * Hacim ızgarası ortam örtmesi: model ~96 hücrelik ızgaraya örneklenir (yüzey hücreleri dolu), her köşeden normal
 * yarı küresinde 12 ışın birkaç hücre yürür; yakın engel çok, uzak az karartır. Aynı konum ve normaldeki köşeler
 * bir kez hesaplanır.
 */
function* bakeAO(pos, nor, info, n) {
	let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
	for (let i = 0; i < n; i++) {
		const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
		if (x < x0) x0 = x;
		if (y < y0) y0 = y;
		if (z < z0) z0 = z;
		if (x > x1) x1 = x;
		if (y > y1) y1 = y;
		if (z > z1) z1 = z;
	}
	const ext = Math.max(x1 - x0, z1 - z0, (y1 - y0) * 0.6);
	const vs = ext / 100;
	const nx = Math.ceil((x1 - x0) / vs) + 3;
	const ny = Math.ceil((y1 - y0) / vs) + 3;
	const nz = Math.ceil((z1 - z0) / vs) + 3;
	if (nx * ny * nz > 4e6) return;
	const grid = new Uint8Array(nx * ny * nz);
	const ox = x0 - vs, oy = y0 - vs, oz = z0 - vs;
	const iv = 1 / vs;
	const mark = (x, y, z) => {
		const i = ((x - ox) * iv) | 0;
		const j = ((y - oy) * iv) | 0;
		const k = ((z - oz) * iv) | 0;
		grid[(j * nz + k) * nx + i] = 1;
	};
	// yüzeyleri örnekle (su, alev, bayrak, balon kumaşı engel değil)
	for (let t = 0; t + 2 < n; t += 3) {
		if (t % 6000 === 0) yield;
		const id = info[t * 4];
		if (id === H.WATER || id === H.FLAME || id === H.FLAG || id === H.CLOTH) continue;
		const a = t * 3;
		const ax = pos[a], ay = pos[a + 1], az = pos[a + 2];
		const ux = pos[a + 3] - ax, uy = pos[a + 4] - ay, uz = pos[a + 5] - az;
		const wx = pos[a + 6] - ax, wy = pos[a + 7] - ay, wz = pos[a + 8] - az;
		const L = Math.max(Math.hypot(ux, uy, uz), Math.hypot(wx, wy, wz), Math.hypot(wx - ux, wy - uy, wz - uz));
		const m = Math.min(400, Math.max(1, Math.ceil(L * iv * 1.6)));
		for (let i = 0; i <= m; i++)
			for (let j = 0; i + j <= m; j++) {
				const s = i / m;
				const r = j / m;
				mark(ax + ux * s + wx * r, ay + uy * s + wy * r, az + uz * s + wz * r);
			}
	}
	const STEPS = 8;
	const cache = new Map();
	for (let i = 0; i < n; i++) {
		if (i % 3000 === 0) yield;
		const px = pos[i * 3], py = pos[i * 3 + 1], pz = pos[i * 3 + 2];
		const qx = nor[i * 4] / 127, qy = nor[i * 4 + 1] / 127, qz = nor[i * 4 + 2] / 127;
		const key = ((Math.round((px - ox) * iv * 2) * 512 + Math.round((py - oy) * iv * 2)) * 512 + Math.round((pz - oz) * iv * 2)) * 16777216 + (nor[i * 4] + 128) * 65536 + (nor[i * 4 + 1] + 128) * 256 + (nor[i * 4 + 2] + 128);
		let ao = cache.get(key);
		if (ao == null) {
			// normal çevresinde dik taban
			let tx, ty, tz;
			if (Math.abs(qy) < 0.9) {
				tx = qz;
				ty = 0;
				tz = -qx;
			} else {
				tx = 0;
				ty = -qz;
				tz = qy;
			}
			let l = Math.hypot(tx, ty, tz) || 1;
			tx /= l;
			ty /= l;
			tz /= l;
			const bx = qy * tz - qz * ty;
			const by = qz * tx - qx * tz;
			const bz = qx * ty - qy * tx;
			const sx = px + qx * vs * 1.6;
			const sy = py + qy * vs * 1.6;
			const sz = pz + qz * vs * 1.6;
			let occ = 0;
			for (const [dx0, dy0, dz0] of DIRS) {
				const dx = tx * dx0 + bx * dy0 + qx * dz0;
				const dy = ty * dx0 + by * dy0 + qy * dz0;
				const dz = tz * dx0 + bz * dy0 + qz * dz0;
				for (let s = 0; s < STEPS; s++) {
					const d = vs * (0.6 + s * 1.05);
					const ii = ((sx + dx * d - ox) * iv) | 0;
					const jj = ((sy + dy * d - oy) * iv) | 0;
					const kk = ((sz + dz * d - oz) * iv) | 0;
					if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz) {
						// ızgara dışı: aşağısı toprak (yarım engel), yukarısı açık gök
						if (jj < 0) occ += 0.5 * (1 - s / STEPS);
						break;
					}
					if (grid[(jj * nz + kk) * nx + ii]) {
						occ += 1 - (s / STEPS) * 0.7;
						break;
					}
				}
			}
			ao = Math.max(0, 1 - (occ / DIRS.length) * 1.15);
			ao = 0.18 + 0.82 * ao;
			cache.set(key, ao);
		}
		info[i * 4 + 3] = Math.round(ao * 255);
	}
}

// ------------------------------------------------------------------ yönetici

/**
 * Kahramanların yöneticisi: tek mesh + tek gölge mesh'i; geometri soru açılınca kurulur. Shader açılışta derlenir
 * (yer tutucu üçgen bir kez çizilir, sonra gizlenir). Haritadaki ekran boyuna göre ayrıntı (herolod.js) aynı sınıftan
 * birkaç yuva kurar: shared { cache, max, used(kind) } ile model önbelleği ortak (aynı yapı iki kez kurulmaz).
 */
export class Heroes {
	constructor(G, tier, board, lm, builders, shared = null) {
		this.G = G;
		this.tier = tier;
		this.board = board;
		this.lm = lm;
		this.builders = builders;
		this.shared = shared;
		this.cache = shared ? shared.cache : new Map();
		this.active = null;
		this.uHS = { value: 2 };
		this.uAO = { value: 1e9 };
		this.uFade = { value: 1 };
		this.uLodMode = { value: 0 };
		const ph = new THREE.BufferGeometry();
		ph.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -90, 0, 0.01, -90, 0, 0, -90, 0.01]), 3));
		ph.setAttribute('normal', new THREE.BufferAttribute(new Int8Array([0, 127, 0, 0, 0, 127, 0, 0, 0, 127, 0, 0]), 4, true));
		ph.setAttribute('col', new THREE.BufferAttribute(new Uint8Array(12), 4, true));
		ph.setAttribute('info', new THREE.BufferAttribute(new Uint8Array(12), 4));
		ph.setAttribute('pat', new THREE.BufferAttribute(new Float32Array(6), 2));
		this.placeholder = ph;
		const uniforms = { ...G, uState: { value: board.stateTex }, uSelOn: board.uSelOn, uPLift: { value: board.liftUnit }, uPSel: { value: board.selLiftUnit }, uHS: this.uHS, uAO: this.uAO, uFade: this.uFade, uLodMode: this.uLodMode };
		this.mesh = new THREE.Mesh(ph, new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS.replace('__TAPS__', String(tier.shadowTaps)), uniforms, side: THREE.DoubleSide }));
		this.caster = new THREE.Mesh(ph, new THREE.ShaderMaterial({ vertexShader: DEPTH_VS, fragmentShader: DEPTH_FS, uniforms, side: THREE.DoubleSide }));
		for (const m of [this.mesh, this.caster]) {
			m.frustumCulled = false;
			m.matrixAutoUpdate = false;
			// açılışta bir kez çizilir (program derlensin), sonra yalnız etkinken
			m.onBeforeRender = () => {
				if (!this.active) m.visible = false;
			};
		}
		this.stats = null;
	}

	has(kind) {
		return !!this.builders[kind];
	}

	/**
	 * Kurulum işi (üreteç): yapıcı da üreteçse (`*yapı(k, R) { …; yield; … }`) parça parça ilerler. Bitince
	 * geometriyi önbelleğe koyar ve döndürür.
	 */
	*_job(site) {
		const t0 = performance.now();
		let busy = 0;
		const k = new HKit();
		k.seg = this.tier.id === 0 ? 0.75 : 1;
		k.hi = true;
		k.hf = this.lm.hf;
		k.site = { x: site.x, y: site.y, z: site.z, s: site.s, ry: site.ry };
		k.tone = site.tone;
		k.inv = 1 / site.s;
		k.tagAt = (tx, tz) => {
			const i = this.board.pick(tx, tz);
			return i >= 0 ? i : site.index;
		};
		k.setTag(site.index);
		k.base(site.y, 1 / site.s);
		let s = 1;
		for (const ch of site.kind) s = (s * 31 + ch.charCodeAt(0)) % 2147483647;
		const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
		k.push().move(site.x, site.y, site.z).rot(0, site.ry, 0).scale(site.s);
		const it = this.builders[site.kind](k, R);
		if (it && typeof it.next === 'function') {
			for (;;) {
				const t = performance.now();
				const r = it.next();
				busy += performance.now() - t;
				if (r.done) break;
				yield;
			}
		} else busy = performance.now() - t0;
		k.pop();
		const t1 = performance.now();
		const g = k.buildHero(true);
		busy += performance.now() - t1;
		this.stats = { kind: site.kind, tris: k.count / 3, build: Math.round(busy), wall: Math.round(performance.now() - t0) };
		g.userData.tris = k.count / 3;
		this.cache.set(site.kind, g);
		// önbellek: son birkaç model (en eski önce; gösterilen atılmaz)
		const max = this.shared ? this.shared.max : 2;
		for (const [old, og] of this.cache) {
			if (this.cache.size <= max) break;
			if (old === site.kind || (this.shared ? this.shared.used(old) : this.active && this.active.kind === old)) continue;
			this.cache.delete(old);
			og.dispose();
		}
		return g;
	}

	/**
	 * Kahramanı iste: önbellekteyse hemen gösterir; değilse ~10 ms'lik dilimlerle kurar (kare akmaya devam eder) ve
	 * hazır olunca gösterip done(site) çağırır. sync: hemen kur ve göster. Dönüş: hemen gösterildiyse true.
	 */
	request(site, done = null, sync = false, show = true) {
		this.cancel();
		if (!site || !this.has(site.kind)) {
			done?.(null);
			return false;
		}
		const g0 = this.cache.get(site.kind);
		if (g0) {
			this.cache.delete(site.kind);
			this.cache.set(site.kind, g0);
			if (show) this._show(site, g0);
			done?.(site);
			return true;
		}
		const job = this._job(site);
		const end = (g) => {
			this._pending = null;
			if (show) this._show(site, g);
			done?.(site);
		};
		if (sync) {
			let r;
			while (!(r = job.next()).done);
			end(r.value);
			return true;
		}
		this._pending = { job, end };
		const pump = () => {
			const p = this._pending;
			if (!p || p.job !== job) return;
			const t0 = performance.now();
			while (performance.now() - t0 < 10) {
				const r = job.next();
				if (r.done) return end(r.value);
			}
			this._build = setTimeout(pump, 0);
		};
		this._build = setTimeout(pump, 0);
		return false;
	}

	/** Bekleyen kurulumu hemen bitir (kart açıldı, film başlıyor). */
	finish() {
		const p = this._pending;
		if (!p) return;
		clearTimeout(this._build);
		let r;
		while (!(r = p.job.next()).done);
		p.end(r.value);
	}

	/** Kurulum sürüyor mu. */
	get busy() {
		return !!this._pending;
	}

	/** Bekleyen kurulumu bırak (önbelleğe girmez). */
	cancel() {
		clearTimeout(this._build);
		this._pending = null;
	}

	/** Kahramanı göster (yalın kopya landmarks.js'te gizlenir). */
	_show(site, g) {
		this.active = site;
		this.uHS.value = site.s;
		this.mesh.geometry = g;
		this.caster.geometry = g;
		this.mesh.visible = this.caster.visible = true;
		// ortam örtmesi kare kare (≈5 ms dilimler; kurulum anında tek seferde takılmasın), bitince yumuşakça belirir
		const job = g.userData.ao;
		clearTimeout(this._pump);
		if (!job) this.uAO.value = -100;
		else {
			this.uAO.value = 1e9;
			const pump = () => {
				if (this.mesh.geometry !== g) return;
				const t0 = performance.now();
				while (performance.now() - t0 < 6) {
					if (job.next().done) {
						g.userData.ao = null;
						g.getAttribute('info').needsUpdate = true;
						this.uAO.value = this.G.uTime.value;
						return;
					}
				}
				this._pump = setTimeout(pump, 0);
			};
			this._pump = setTimeout(pump, 0);
		}
	}

	/** Örtme işini hemen bitir (ekran görüntüsü, sınama). */
	finishAO() {
		const g = this.mesh.geometry;
		const job = g?.userData?.ao;
		if (!job) return;
		clearTimeout(this._pump);
		while (!job.next().done);
		g.userData.ao = null;
		g.getAttribute('info').needsUpdate = true;
		this.uAO.value = -100;
	}

	hide() {
		this.cancel();
		clearTimeout(this._pump);
		this.active = null;
		this.mesh.visible = this.caster.visible = false;
		this.mesh.geometry = this.placeholder;
		this.caster.geometry = this.placeholder;
	}
}
