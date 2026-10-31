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
import { H, HKit, bakeAO } from './herokit.js';

export { H, HKit };

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
	// (v1.4) arazi yapının altında düz teras olduğundan kahraman kendi avlusunu da çizer: yapının planına uyan avlu
	// (Anıtkabir'de yuvarlatılmış dikdörtgen); yalın kopyanın yuvarlak avlusu titreşimle çekilir, köşelerden taşmaz
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
		// durağan su (havuz, traverten, göl): desen zamanla kaymaz (yüzey "yeniden çiziliyor" gibi kıpırdamasın);
		// canlılığı gök yansıması ve güneş parıltısı verir, bakış açısıyla doğal olarak değişir
		vec2 q = vW.xz / uHS;
		float w = nz(q * 1.4) + nz(q * 2.1 + vec2(3.7, 1.3));
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
	// okunurluk çizgisi yalnız yapıda (doğal yüzeyde değil: kaya, toprak, çimen, döşeme, traverten çizgilenmesin)
	bool natural = id == ${H.ROCK}.0 || id == ${H.GRASS}.0 || id == ${H.DIRT}.0 || id == ${H.GROUND}.0 || id == ${H.PAVE}.0 || id == ${H.TRAV}.0 || id == ${H.LEAF}.0;
	if (!bare && !natural) c = structInk(c, N, normalize(vN), vW);
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

/**
 * Yapı işçisi (heroworker.js; derlemede metin olarak gömülür: __HERO_WORKER__). Kurulamazsa null: kurulum eskisi gibi
 * ana iş parçacığında dilimlerle. Tek işçi, istekler sırayla.
 */
let HW;
function heroWorker() {
	if (HW !== undefined) return HW;
	HW = null;
	try {
		// eslint-disable-next-line no-undef
		const code = typeof __HERO_WORKER__ !== 'undefined' ? __HERO_WORKER__ : null;
		if (!code || typeof Worker !== 'function' || typeof Blob !== 'function' || typeof URL === 'undefined') return HW;
		const w = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
		const calls = new Map();
		let id = 0;
		w.onerror = () => {
			HW = null;
			for (const c of calls.values()) c(null);
			calls.clear();
		};
		w.onmessage = (e) => {
			const c = calls.get(e.data.id);
			calls.delete(e.data.id);
			c?.(e.data.ok ? e.data : null);
		};
		HW = {
			build(msg) {
				return new Promise((res) => {
					const i = ++id;
					calls.set(i, res);
					w.postMessage({ ...msg, id: i });
				});
			},
		};
	} catch (e) {
		HW = null;
	}
	return HW;
}

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
		this._store(site.kind, g);
		return g;
	}

	/** Önbelleğe koy: son birkaç model (en eski önce; gösterilen atılmaz). */
	_store(kind, g) {
		this.cache.set(kind, g);
		const max = this.shared ? this.shared.max : 2;
		for (const [old, og] of this.cache) {
			if (this.cache.size <= max) break;
			if (old === kind || (this.shared ? this.shared.used(old) : this.active && this.active.kind === old)) continue;
			this.cache.delete(old);
			og.dispose();
		}
	}

	/**
	 * İşçide kur (ana iş parçacığı yalnız ~200 arazi düğümü okur ve yakın illerin çokgenlerini gönderir). Dönen söz:
	 * geometri ya da null (işçi yok/başarısız).
	 */
	_workerBuild(site) {
		const wk = heroWorker();
		if (!wk) return null;
		const st = this.lm.gridStep || 0.4;
		const rel = this.board.relief;
		const R = site.s * 1.7 + 0.8;
		const gx0 = Math.floor((site.x - R) / st);
		const gx1 = Math.ceil((site.x + R) / st) + 1;
		const gy0 = Math.floor((-site.z - R) / st);
		const gy1 = Math.ceil((-site.z + R) / st) + 1;
		const nx = gx1 - gx0 + 1;
		const ny = gy1 - gy0 + 1;
		const h = new Float64Array(nx * ny);
		for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) h[j * nx + i] = rel.height((gx0 + i) * st, (gy0 + j) * st);
		const provs = [];
		for (const p of this.board.provinces) {
			const b = p.box;
			if (b[2] < site.x - R || b[0] > site.x + R || b[3] < site.z - R || b[1] > site.z + R) continue;
			provs.push({ index: p.index, box: b, rings: p.rings });
		}
		const t = site.tone;
		const msg = { kind: site.kind, site: { x: site.x, y: site.y, z: site.z, s: site.s, ry: site.ry, index: site.index }, tone: [t.r, t.g, t.b], seg: this.tier.id === 0 ? 0.75 : 1, grid: { st, gx0, gy0, nx, ny, h }, provs };
		return wk.build(msg).then((r) => {
			if (!r) return null;
			const g = new THREE.BufferGeometry();
			g.setAttribute('position', new THREE.BufferAttribute(r.pos, 3));
			g.setAttribute('normal', new THREE.BufferAttribute(r.nor, 4, true));
			g.setAttribute('col', new THREE.BufferAttribute(r.col, 4, true));
			g.setAttribute('info', new THREE.BufferAttribute(r.info, 4));
			g.setAttribute('pat', new THREE.BufferAttribute(r.pat, 2));
			g.computeBoundingSphere();
			g.userData.tris = r.tris;
			this.stats = { kind: site.kind, tris: r.tris, build: 0, wall: r.ms, worker: true };
			return g;
		});
	}

	/**
	 * Kahramanı iste: önbellekteyse hemen gösterir; değilse ~10 ms'lik dilimlerle kurar (kare akmaya devam eder) ve
	 * hazır olunca gösterip done(site) çağırır. sync: hemen kur ve göster. Dönüş: hemen gösterildiyse true.
	 */
	request(site, done = null, sync = false, show = true, noWorker = false) {
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
		const end = (g) => {
			this._pending = null;
			if (show) this._show(site, g);
			done?.(site);
		};
		// işçide kur: ana iş parçacığı beklemez (sync istenmediyse)
		if (!sync && !noWorker) {
			const pr = this._workerBuild(site);
			if (pr) {
				const token = { site, show, done, worker: true };
				this._pending = token;
				pr.then((g) => {
					if (g) {
						// sonuç geç kalmış olsa da (iptal) önbelleğe girer: aynı yapı bir daha kurulmaz
						if (!this.cache.has(site.kind)) this._store(site.kind, g);
						else g.dispose();
					}
					if (this._pending !== token) return;
					const gg = this.cache.get(site.kind);
					if (gg) end(gg);
					else {
						// işçi başarısız: eski yol (ana iş parçacığında dilimli)
						this._pending = null;
						this.request(site, done, false, show, true);
					}
				});
				return false;
			}
		}
		const job = this._job(site);
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
		if (p.worker) {
			// işçideki kurulum beklenemez (eşzamanlı isteniyor): ana iş parçacığında hemen kur (nadir: Kuşbakışı açılışı)
			this._pending = null;
			this.request(p.site, p.done, true, p.show, true);
			return;
		}
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
