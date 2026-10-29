// Minyatür Türkiye haritası: 81 il, gerçek kabartmalı tek parça bir maket.
//
// Bütün iller tek geometride birleşir; her köşe hangi ile ait olduğunu (pid) taşır. Yükseklik, normal ve
// doğa bilgisi köşelere pişirilir (terrain.js). İlin sahibi, boya dalgası, yükselmesi, parlaması ve
// seçilebilirliği küçük bir kayan noktalı durum dokusundan okunur: bir il fethedilince dokunun birkaç
// pikseli değişir, geometri yeniden kurulmaz. Tek çizim çağrısı.
//
// Okunurluk:
// - İl sınırları açılışta ekran kartında çizilen bir uzaklık alanından (fields.js) gelir: her yakınlıkta
//   keskin, piksel olarak en az kalınlıkta. Tarafsız il sınırı ince bir oyuk; sahipli ilin dış sınırı
//   sahibin renginde kalın bir şerit ve içe doğru ışıltı. Aynı sahibin iki ili arasında sınır incelir,
//   oyuncunun toprağı tek bir ülke gibi okunur.
// - select(list): seçilebilen iller hafifçe kalkar (alçak kaide), gündüz ışığında kalır; tarafsız hedef nötr
//   krem, sahipli hedef sahibinin renginde; temiz beyaz dış hat (ince koyu kıl çizgili) ve yumuşak nabız.
//   Altın parlama, hale ve bloom yok (v0.4: "fosforlu" değil). Diğer bütün iller gecede kalır: oyuncunun ve
//   sırası gelenin toprağı kendi renginde aydınlık ve kalın çizgili, başkalarınınki daha sönük ama renkli.
// - paint(i, renk, x, z): dokunulan noktadan dışa yayılan boya dalgası ve dalga cephesinde parlak çizgi.
// - showLabels(list | 'all' | null): il adları 3D yazı katmanında (labels.js).
//
// Arazi: Doğu yüksek yayla, Toroslar, Kuzey Anadolu Dağları, Kaçkar, karlı volkanlar; gerçek göller ve
// nehirler; kıyıda kumsal ya da falez. Hepsi aynı shader'da, ek çizim çağrısı olmadan.

import * as THREE from 'three';
import { COMMON, SHADOW, LIGHT, FINISH, PROV, MIST, glslColor as C } from '../gfx/shaderlib.js';
import DATA from '../data/turkiye.json';
import { Relief, buildBoardGeometry, BASE, VS, BOTTOM, LIFT } from './terrain.js';
import { bakeFields, FIELD_BOX, RB, RC, RL } from './fields.js';
import { Labels } from './labels.js';
import { Castle } from './castle.js';
import { Clouds, CloudFrame } from '../gfx/clouds.js';
import { Cues } from './cues.js';

export const REGIONS = {
	marmara: { name: 'Marmara', color: 0x8fd16a },
	karadeniz: { name: 'Karadeniz', color: 0x3fa45e },
	ege: { name: 'Ege', color: 0xb9d465 },
	akdeniz: { name: 'Akdeniz', color: 0xe8b85a },
	icanadolu: { name: 'İç Anadolu', color: 0xf0d27a },
	dogu: { name: 'Doğu Anadolu', color: 0xa9b79a },
	guneydogu: { name: 'Güneydoğu Anadolu', color: 0xe39a5c },
};

const SEL_LIFT = 0.26; // seçilebilir il bu kadar kalkar (hafif: alçak kaide)
const TOP = 0.5; // tipik kara yüksekliği (eski kullanım için; doğrusu heightAt)
const f = (v) => v.toFixed(4);

const PROV_VS = /* glsl */ `
${COMMON}
${PROV}
attribute float pid;
attribute vec4 bio;
attribute float surf;
attribute float cav;
varying vec3 vW;
varying vec3 vN;
varying vec4 vBio;
varying float vDepth;
varying float vCav;
flat varying float vPid;
flat varying vec4 vOwn;
flat varying vec4 vPrev;
flat varying vec4 vPaint;
flat varying vec4 vFx;
void main() {
	vOwn = provRow(pid, 0);
	vPrev = provRow(pid, 1);
	vPaint = provRow(pid, 2);
	vFx = provRow(pid, 3);
	float lift = vFx.x * ${f(LIFT)} + vFx.z * ${f(SEL_LIFT)};
	vec3 p = position;
	if (bio.w < 0.75) p.y += lift; // yüzey ve duvarın üst kenarı kalkar, alt kenar yerinde
	vec4 w = modelMatrix * vec4(p, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * normal);
	vBio = bio;
	vPid = pid;
	vDepth = surf + lift - p.y;
	vCav = cav * 0.7 + 0.55;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

const PROV_FS = /* glsl */ `
#define SHADOW_TAPS __TAPS__
#define TIER __TIER__
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
${PROV}
uniform sampler2D uBorder;
uniform sampler2D uWater;
uniform sampler2D uNoise;
uniform vec4 uFBox;
uniform vec2 uFRes;
uniform float uMe; // insan oyuncunun kimliği (gecede kendi toprağı aydınlık ve net)
uniform float uAct; // sırası gelen oyuncu (bot seçerken onun toprağı da net; -5: yok)
uniform float uSelAny; // gece odağında seçenekler arasından seçim sürüyor mu (1/0)
uniform float uSelEdge; // seçim dış hattının gücü: çok seçenekte (başkent, geniş yayılma) ince, beyaz ağ olmasın
varying vec3 vW;
varying vec3 vN;
varying vec4 vBio;
varying float vDepth;
varying float vCav;
flat varying float vPid;
flat varying vec4 vOwn;
flat varying vec4 vPrev;
flat varying vec4 vPaint;
flat varying vec4 vFx;

float lineAA(float d, float w, float px) {
	return 1.0 - smoothstep(w - px, w + px, d);
}

// v0.5 (sinematik palet): bozkır hardal değil sıcak buğday-kehribar; geçiş kuşağı taze adaçayı yeşili;
// kıyı ve Karadeniz canlı zümrüt; yayla serin alp çayırı; dağ kayası mor-gri; doruklarda kar. Renk
// alanları birbirinden ton olarak ayrışır (çamurlu zeytin ara ton yok). Tarla deseni q=0'da da var
// (tek doku okuması), yakında ince tane dokusu: telefon ekranında keskin okunur.
vec3 terrainAlbedo(vec3 w, vec3 N, vec4 bio, float h, float coast, out float snowK, out float rockK) {
	float e = (h - ${f(BASE)}) / ${f(VS)};
	vec2 q = w.xz;
	vec4 f1 = texture(uNoise, q / 48.0);
	float n1 = f1.r;
	float n2 = f1.g;
	vec4 f3 = texture(uNoise, q / 12.0 + 0.5);
	float n3 = f3.g;
	float slope = 1.0 - N.y;
	float green = clamp(bio.y + (n1 - 0.5) * 0.3, 0.0, 1.0);
	vec3 dry = mix(${C('#c4a676')}, ${C('#dbc490')}, n2);
	vec3 lush = mix(${C('#3a8638')}, ${C('#5daa48')}, n2 * 0.8 + n3 * 0.2);
	vec3 mid = mix(${C('#76a250')}, ${C('#91b25c')}, n2);
	vec3 c = green < 0.5 ? mix(dry, mid, smoothstep(0.18, 0.5, green)) : mix(mid, lush, smoothstep(0.5, 0.85, green));
	// yayla: serin alp çayırı (çamurlu zeytin değil)
	c = mix(c, mix(${C('#7f9858')}, ${C('#93976a')}, n3), smoothstep(1500.0, 2400.0, e) * 0.65);
	// tarla deseni: düz, ormansız, alçak yerlerde parsel parsel (her ovada farklı yöne bakar)
	float farm = (1.0 - smoothstep(0.1, 0.4, bio.x)) * (1.0 - smoothstep(0.15, 0.45, bio.z)) * smoothstep(0.985, 0.998, N.y) * (1.0 - smoothstep(1300.0, 1800.0, e));
#if TIER > 0
	vec2 zone = floor(q * 0.16 + n1 * 0.6);
	float ang = hash12(zone) * 3.14159;
	vec2 rq = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q;
	vec2 fq = rq * vec2(1.7, 0.95) + vec2(n2 * 0.7, n1 * 0.9);
	vec2 cell = floor(fq);
	vec2 fr = fract(fq);
	float fpx = fwidth(fq.x) + fwidth(fq.y);
	float fade = 1.0 - smoothstep(0.3, 0.75, fpx);
	float r = hash12(cell + zone * 17.0);
	// buğday, taze ekin, nadas, sürülmüş toprak, ayçiçeği: sıcak ve yeşil parseller dengeli
	vec3 fc = c * (r < 0.2 ? vec3(1.16, 1.06, 0.62) : r < 0.4 ? vec3(0.6, 0.94, 0.48) : r < 0.55 ? vec3(1.04, 1.0, 0.9) : r < 0.75 ? vec3(0.84, 0.68, 0.54) : vec3(1.12, 1.06, 0.82));
	float edge = min(min(fr.x, 1.0 - fr.x), min(fr.y, 1.0 - fr.y));
	fc *= mix(0.8, 1.0, smoothstep(0.0, 0.05 + fpx, edge));
	c = mix(c, fc, farm * fade * 0.92);
#else
	// q=0: parsel yerine ucuz yamalı ekin lekeleri (hazır gürültüden)
	float pr = f3.r;
	vec3 pt = mix(vec3(0.8, 1.0, 0.66), vec3(1.0), smoothstep(0.34, 0.42, pr));
	pt = mix(pt, vec3(1.12, 0.98, 0.72), smoothstep(0.6, 0.68, pr));
	c = mix(c, c * pt * (0.94 + 0.12 * f3.b), farm * 0.85);
#endif
	// orman tabanı: derin, serin yeşil
	c = mix(c, mix(${C('#24552c')}, ${C('#356b36')}, n3), smoothstep(0.2, 0.65, bio.x) * 0.85);
	// kaya: dik yamaç ve sarp dağlar (serin mor-gri, açık damarlı)
	rockK = clamp(smoothstep(0.22, 0.5, slope + bio.z * 0.22 + (n2 - 0.5) * 0.22), 0.0, 1.0) * smoothstep(250.0, 1300.0, e);
	c = mix(c, mix(${C('#7b6f6c')}, ${C('#aea193')}, n3), rockK);
	// kar: yaz karı yalnızca en yüksek doruklarda (Ağrı, Süphan, Erciyes, Kaçkar, Cilo…), lekeli
	float snowLine = 3250.0 - 300.0 * n1 + slope * 900.0 + N.z * 200.0;
	snowK = smoothstep(snowLine - 120.0, snowLine + 180.0, e + (n3 - 0.5) * 300.0);
	c = mix(c, ${C('#f4f8ff')}, snowK);
	// kumsal: alçak kıyı
	float beach = smoothstep(0.93, 0.975, coast) * (1.0 - smoothstep(0.075, 0.12, h)) * (1.0 - rockK);
	c = mix(c, mix(${C('#e8d29a')}, ${C('#f4e4b4')}, n3), beach);
	// ince tane: yakında küçük ölçekli açık-koyu benek (düz renk değil, minyatür arazi dokusu)
	float grain = texture(uNoise, q / 3.0).g - 0.5;
	c *= 1.0 + grain * 0.16 * (1.0 - snowK * 0.7);
	return c;
}

void main() {
	vec3 N = normalize(vN);
	vec3 V = normalize(cameraPosition - vW);
	float lift = vFx.x * ${f(LIFT)} + vFx.z * ${f(SEL_LIFT)};
	float h = vW.y - lift;
	bool skirt = vBio.w > 0.25;
	vec2 uv = (vW.xz - uFBox.xy) * uFBox.zw;
	// işaretli alan çizgide tam sıfır; işaretsiz alan il içindeki sahte sıfırları (işaret dönüşü) bastırır (fields.js)
	vec4 bt = texture(uBorder, uv);
	float d = max(abs(bt.r * 2.0 - 1.0), bt.b - 0.065) * ${f(RB)};
	float px = max(fwidth(d), 1e-4);
	float nb = floor(texelFetch(uBorder, ivec2(uv * uFRes), 0).g * 255.0 + 0.5);
	vec4 fw = texture(uWater, uv);
	float coast = fw.r;
	vec4 f1 = texture(uNoise, vW.xz / 48.0);

	// --- boya dalgası: dalga içinde yeni sahip, dışında eski
	float dO = distance(vW.xz, vPaint.xy);
	float pw = max(fwidth(dO), 1e-4);
	float painted = 1.0 - smoothstep(vPaint.z - pw, vPaint.z + pw, dO);
	float ownerId = painted > 0.5 ? vOwn.w : vPrev.w;
	float ownedK = mix(vPrev.w >= 0.0 ? 1.0 : 0.0, vOwn.w >= 0.0 ? 1.0 : 0.0, painted);
	vec3 ownCol = vPrev.w >= 0.0 ? mix(vPrev.rgb, vOwn.rgb, painted) : vOwn.rgb;
	float rimW = max(0.22, 5.0 * pw);
	float rim = exp(-pow((dO - vPaint.z) / rimW, 2.0)) * vPaint.w;

	// --- komşu: sınırın öbür yanı
	float nbOwner = nb > 254.5 ? -3.0 : -2.0;
	float nbSel = 0.0;
	if (nb < 250.0 && d < ${f(RB * 0.97)}) {
		nbOwner = texelFetch(uState, ivec2(int(nb), 0), 0).w;
		nbSel = texelFetch(uState, ivec2(int(nb), 3), 0).z;
	}
	float same = (ownerId >= 0.0 && abs(nbOwner - ownerId) < 0.5) ? 1.0 : 0.0;

	float snowK, rockK;
	vec3 alb = terrainAlbedo(vW, N, vBio, h, coast, snowK, rockK);

	// --- sahip boyası: arazinin açık-koyu dokusu korunur
	float lum = dot(alb, vec3(0.3, 0.59, 0.11));
	// güçlü, doygun sahip rengi (Supercell): arazi dokusu yalnızca hafif parlaklık farkı olarak kalır;
	// ışıkta beyaza/pembeye kaçmasın diye albedo orta tonda tutulur
	// (orman tabanı gibi koyu yerler sahip renginde kara leke olmasın: parlaklık farkı sınırlı)
	vec3 tint = ownCol * (0.62 + 0.65 * lum);
	// gece (v0.4): kimin toprağı olduğu bir bakışta okunur. Oyuncunun kendisi (uMe) ve sırası gelen oyuncu
	// (uAct) tam renkte ve aydınlık, başkalarınınki daha sönük ama renk tonu belli (kahverengi leke değil)
	float mineE = abs(ownerId - uMe) < 0.5 ? 1.0 : 0.0;
	float hiE = max(mineE, abs(ownerId - uAct) < 0.5 ? 1.0 : 0.0);
	float sel = vFx.z;
	float nkE = uNight.x * (1.0 - sel);
	float ownW = ownedK * (0.9 - snowK * 0.3) * (1.0 - nkE * mix(0.26, 0.0, hiE));
	alb = mix(alb, tint, ownW);
	// seçilebilir tarafsız il: haritanın kendi rengi kalır (düz krem boya soluk ve beyaz görünüyordu);
	// gece odağında aydınlık kalması ve beyaz dış hat onu zaten ayırır, burada yalnızca hafif canlanır
	float freeSel = sel * (1.0 - ownedK);
	alb = mix(alb, alb * 1.08 + 0.015, freeSel * uSelLit);
	gOwn = ownW;

	// --- sınırlar
	float glow = vFx.y;
	float pulse = 0.5 + 0.5 * sin(uTime * 3.6 + vPid * 1.3); // yumuşak nabız (0..1)
	// il sınırı (v0.5): keskin koyu oluk (yarım piksel kenar yumuşatma, gri bulanık çizgi değil) ve iki yanında
	// ince açık sırt: her il kabartmalı bir oyun taşı gibi ayrı okunur
	float wG = max(0.014, 0.85 * px);
	float isLand = nb > 254.5 ? 0.3 : 1.0;
	float groove = (1.0 - smoothstep(wG - 0.6 * px, wG + 0.6 * px, d)) * isLand;
	float ridgeL = smoothstep(wG + 0.2 * px, wG + 1.0 * px, d) * (1.0 - smoothstep(wG + 1.6 * px, wG + 2.8 * px, d)) * isLand * (1.0 - same * ownedK) * smoothstep(0.09, 0.03, px);
	float ownEdge = ownedK * (1.0 - same);
	// gecede oyuncunun (ve sırası gelenin) toprağının dış çizgisi daha kalın ve keskin
	float wBand = max(0.08, mix(2.3, 3.3, hiE * uNight.x) * px);
	float band = lineAA(d, wBand, px) * ownEdge;
	float inner = exp(-d / 0.42) * ownEdge;
	// sahipli ilin dış sınırı: içe doğru renk ışıltısı + kalın parlak şerit + ince koyu dış çizgi
	alb = mix(alb, ownCol * 1.1, inner * 0.3);
	// oluk gri değil koyu mürekkep (sıcak kahve-mor): açık bozkırda da yeşilde de keskin okunur
	alb = mix(alb, ${C('#3a2a2c')}, groove * mix(0.78, 0.14, same * ownedK));
	alb *= 1.0 + ridgeL * 0.2;
	alb = mix(alb, ownCol * 0.92, band);
	// şeridin iç kenarında parlak çizgi (cilalı oyun taşı kenarı), dışta koyu çizgi
	alb = mix(alb, ownCol * 1.8 + 0.14, lineAA(abs(d - wBand * 0.8), max(0.011, 0.45 * px), px) * ownEdge * 0.75);
	alb *= 1.0 - lineAA(d, max(0.016, 0.55 * px), px) * ownEdge * 0.55;

	// --- su: göller ve nehirler
	float lakeIn = step(0.3, fw.b);
	float salt = lakeIn * (1.0 - step(0.9, fw.b));
	float shoreD = (1.0 - fw.a) * ${f(RL)};
	float sd = mix(shoreD, -shoreD, lakeIn);
	float lpx = max(fwidth(sd), 1e-4);
	float lake = 1.0 - smoothstep(-lpx, lpx, sd);
	float rpx = max(fwidth(fw.g), 1e-4);
	float river = smoothstep(0.5 - rpx, 0.5 + rpx, fw.g) * (1.0 - lake);
	float water = max(lake, river) * (skirt ? 0.0 : 1.0);

	float gloss = 0.06 + 0.1 * ownedK + snowK * 0.15;
	float ao = vCav; // kabartma çukurluğu (terrain.js): vadi koyu, sırt açık
	alb *= mix(1.0, vCav, 0.4);
	if (skirt) {
		// il duvarı: toprak katmanları (pasta dilimi), kıyıda falez
		float dep = vDepth;
		float n = texture(uNoise, vec2((vW.x - vW.z) * 2.0, dep * 5.0) / 64.0).g;
		vec3 soil = mix(${C('#7b4a2b')}, ${C('#a06838')}, step(0.5, fract(dep * 3.4 + n * 0.5)));
		soil = mix(soil, ${C('#6c625b')}, smoothstep(0.55, 1.0, dep));
		vec3 cliff = mix(${C('#c9b495')}, ${C('#a8927a')}, step(0.5, fract(vW.y * 9.0 + n * 0.6)));
		soil = mix(soil, cliff, smoothstep(0.94, 0.99, coast) * step(-0.02, vW.y));
		soil = mix(alb, soil, smoothstep(0.015, 0.05, dep));
		// üst şerit sahibin renginde (bayrak şeridi)
		soil = mix(soil, ownCol * 0.95, ownedK * (1.0 - smoothstep(0.07, 0.11, dep)) * step(0.015, dep));
		alb = soil;
		gOwn *= 1.0 - smoothstep(0.07, 0.11, dep);
		ao = mix(0.45, 1.0, exp(-dep * 1.2));
		gloss = 0.04;
	}

	float sh = shadowAt(vW, N);
	// kabartma ışığı abartılır (yalnız ışıkta): tepeden bakışta da dağlar, sırtlar ve vadiler hacimli okunur
	vec3 NL = skirt ? N : normalize(vec3(N.x * 1.7, N.y, N.z * 1.7));
	gLit = sel * uSelLit; // gece odağı: yalnızca seçilebilir il gündüz ışığında kalır (komşuya hale yok)
	float nk = nightK();
	vec3 c;
	if (water > 0.01) {
		// su yüzeyi: dalgacık, gök yansıması, güneş pırıltısı
		vec2 g = vec2(texture(uNoise, vW.xz * 3.0 / 64.0 + uTime * 0.006).g, texture(uNoise, vW.xz * 3.9 / 64.0 - uTime * 0.005 + 0.4).g) - 0.5;
		vec3 WN = normalize(vec3(g.x * 0.25, 1.0, g.y * 0.25));
		vec3 deep = mix(${C('#1d6db0')}, ${C('#2f8fc4')}, river);
		vec3 shal = ${C('#4cc6d6')};
		vec3 wc = mix(shal, deep, smoothstep(0.0, 0.35, -sd) * lake + river * 0.5);
		wc = mix(wc, mix(${C('#f2e9ea')}, ${C('#e7b9c4')}, f1.b), salt * 0.85);
		float ndv = clamp(dot(WN, V), 0.0, 1.0);
		float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
		vec3 wcol = wc * (skyAmbient(WN) * 0.9 + uSunCol * 0.32 * sh);
		wcol = mix(wcol, skyReflect(reflect(-V, WN)), fres * 0.6);
		vec3 H = normalize(uSunDir + V);
		wcol += uSunCol * pow(max(dot(WN, H), 0.0), 180.0) * 1.6 * sh;
		// kıyı köpüğü
		wcol = mix(wcol, vec3(1.0) * (uSkyTop + uSunCol * 0.35), lineAA(abs(sd), 0.018 + lpx, lpx) * lake * 0.7);
		if (nk > 0.001) {
			// gece gölü: gök aynası, yıldızlar, ay parıltısı
			vec3 R = reflect(-V, WN);
			R.y = abs(R.y);
			vec3 nw = mix(wc * vec3(0.02, 0.03, 0.06), nightSky(R) + starField(normalize(vec3(R.x, R.y * 1.02, R.z))) * 0.15, 0.7);
			nw += vec3(0.7, 0.76, 0.9) * pow(max(dot(R, N_MOON), 0.0), 220.0) * 0.5;
			nw = mix(nw, vec3(0.04, 0.07, 0.12), lineAA(abs(sd), 0.018 + lpx, lpx) * lake * 0.3);
			wcol = mix(wcol, nw, nk);
		}
		vec3 lc = shade(alb, NL, V, ao, sh, gloss, 0.35);
		c = mix(lc, wcol, water);
	} else {
		c = shade(alb, NL, V, ao, sh, gloss, 0.35);
	}

	// gece (v0.4): sahipli toprak kendi renginde aydınlık. Oyuncunun (ve sırası gelenin) toprağı parlak ve net,
	// başkalarınınki sönük ama rengi belli. Parlama yok: renk, ay ışığıyla verilen kabartmaya oturur.
	if (nk > 0.001 && ownedK > 0.01 && !skirt && water < 0.5) {
		float dm = clamp(dot(NL, N_MOON) * 0.5 + 0.5, 0.0, 1.0);
		float ol = dot(ownCol, vec3(0.3, 0.59, 0.11));
		float yel = smoothstep(0.34, 0.62, ol);
		// açık renkler (sarı) gecede daha çok ışık ister, yoksa kahverengi okunur; koyu renkler (mavi) de biraz
		float boost = 1.0 + 1.1 * yel + 0.7 * (1.0 - smoothstep(0.12, 0.3, ol));
		float E = mix(0.03, 0.095, hiE) * boost;
		float Dd = mix(0.1, 0.3, hiE) * boost;
		vec3 Lc = ownCol * (E + Dd * dm * dm * mix(0.55, 1.0, sh)) * (0.62 + 0.8 * lum);
		c = mix(c, Lc, ownedK * nk * 0.92);
	}
	// gece: sahiplerin dış çizgisi kendi renginde ışır; tüm il sınırlarında ince soluk çizgi (harita yapısı okunur)
	if (nk > 0.001) {
		c += ownCol * (band * mix(0.3, 0.6, hiE) + inner * mix(0.02, 0.07, hiE)) * nk * (skirt ? 0.4 : 1.0);
		float hair = lineAA(d, max(0.022, 1.0 * px), px) * (skirt ? 0.0 : 1.0) * (nb > 254.5 ? 0.0 : 1.0);
		c += vec3(0.32, 0.42, 0.66) * hair * nk * (1.0 - 0.7 * ownedK) * 0.2;
		// kıyı çizgisi: kara ile deniz ayrışsın (ay ışığında ince soğuk parıltı)
		c += vec3(0.28, 0.4, 0.66) * smoothstep(0.935, 0.99, coast) * (skirt ? 0.0 : 1.0) * nk * 0.07;
	}
	// --- seçim (v0.4): hedef kendi renginde (tarafsızsa krem), temiz beyaz dış hat, yumuşak nabız.
	// Altın parlama, hale ve iç ışıltı yok: sahip rengi ve sarı arazi çizgiyle karışmaz.
	float sp = mix(1.0, spotK(), uNight.x); // yakın çekimde ışık havuzunun dışı
	float bk = 0.55 + 0.45 * sp;
	vec3 white = vec3(1.0, 0.985, 0.95);
	float wOut = max(0.06, 3.0 * px) * (0.88 + 0.24 * pulse);
	float fwD = max(fwidth(vDepth), 1e-4);
	// yüzeyde: il içinde sınıra bitişik bant; duvarda: üst kenarda ince çizgi
	float edgeW = skirt ? 1.0 - smoothstep(1.2 * fwD, 2.8 * fwD, vDepth) : lineAA(d, wOut, px);
	c = mix(c, white * 1.6, edgeW * sel * bk * (0.82 + 0.18 * pulse) * uSelEdge);
	// beyaz bandın iç kenarında ince koyu çizgi: açık dolguda (krem, sarı) bant ayrı okunur
	c *= 1.0 - (skirt ? 0.0 : lineAA(abs(d - wOut - 0.9 * px), max(0.012, 0.55 * px), px)) * sel * bk * 0.3;
	// en dışta koyu kıl çizgi: beyaz bant komşu aydınlık ya da açık renkli yüzeyden ayrı okunur
	c = mix(c, vec3(0.012, 0.016, 0.034), (skirt ? 0.0 : lineAA(d, max(0.024, 0.85 * px), px)) * sel * bk * 0.9);
	// kalkık ilin duvarı gölgede (beyaz çizgi öne çıksın)
	if (skirt) c *= mix(1.0, 0.5, uNight.x * sel * smoothstep(0.03, 0.12, vDepth));
	// yumuşak nabız: dolgu çok hafif parlar
	c *= 1.0 + sel * sp * 0.05 * pulse;
	// gündüze çıkmayan seçim (başkent: uSelLit düşük): bütün harita koyu, premium gece (gölgede renk yarı
	// kararır, pencere ışıkları seçilir); seçilemeyen boş il (rakip başkente komşu) belirgin biçimde daha koyu.
	// Rakip başkent (sahipli il) kararmaz: kendi renginde seçilir
	c *= 1.0 - uSelOn * (1.0 - uSelLit) * uNight.x * (0.5 + 0.38 * (1.0 - sel) * uSelAny) * (1.0 - ownedK);
	// eski parlama (fx: kale inişi, fetih anı): yalnızca hafif aydınlanma, kenar ışıması yok
	vec3 gcol = ownedK > 0.5 ? ownCol : vec3(1.0, 0.95, 0.85);
	c = c * (1.0 + 0.14 * glow * sp * (skirt ? 0.0 : 1.0)) + gcol * glow * sp * (skirt ? 0.0 : 0.035 * (0.7 + 0.3 * sin(uTime * 6.0 + vPid * 0.7)));
	// boya dalgası cephesi
	c += (ownCol * 1.8 + vec3(0.9)) * rim * (skirt ? 0.3 : 1.0);

	// seçim kipi ve maç dışı iller sönük
	c = provDim(c, sel, vFx.w);
#if TIER > 0
	// bulut gölgeleri (gecede yok: aydınlık hedefte çamurlu leke olmasın)
	float cs = smoothstep(0.58, 0.82, texture(uNoise, vW.xz / 160.0 + uTime * vec2(0.0019, 0.0008)).a) * (1.0 - uNight.x);
	c *= 1.0 - cs * 0.16;
#endif
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

const DEPTH_VS = /* glsl */ `
${PROV}
attribute float pid;
attribute vec4 bio;
uniform float uDrop;
void main() {
	vec4 fx = provRow(pid, 3);
	vec3 p = position;
	p.y += fx.x * ${f(LIFT)} + fx.z * ${f(SEL_LIFT)} - uDrop;
	gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
}`;
const DEPTH_FS = /* glsl */ `void main() { gl_FragColor = vec4(1.0); }`;

// komşu ülkeler: boyanmamış alçı maket (göz Türkiye'de kalsın)
const LAND_VS = /* glsl */ `
varying vec3 vW;
varying vec3 vN;
void main() {
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * normal);
	gl_Position = projectionMatrix * viewMatrix * w;
}`;
const LAND_FS = /* glsl */ `
#define SHADOW_TAPS __TAPS__
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
${MIST}
uniform sampler2D uWater;
uniform vec4 uFBox;
uniform float uSelOn;
varying vec3 vW;
varying vec3 vN;
void main() {
	// alçı kabartma: yumuşak tepeler (sahte normal)
	// (döndürülmüş alan: değer gürültüsünün kare ızgara izi görünmesin)
	vec2 nq = mat2(0.8, -0.6, 0.6, 0.8) * vW.xz * 0.32 / 16.0;
	float h0 = texture(uNoise, nq).r;
	vec3 N = normalize(vec3((h0 - texture(uNoise, nq + vec2(0.0125, 0.0)).r) * 1.2, 1.0, (h0 - texture(uNoise, nq + vec2(0.0, 0.0125)).r) * 1.2));
	vec2 uv = (vW.xz - uFBox.xy) * uFBox.zw;
	float coast = (uv.x > 0.0 && uv.y > 0.0 && uv.x < 1.0 && uv.y < 1.0) ? texture(uWater, uv).r : 0.0;
	float n = texture(uNoise, vW.xz * 0.5 / 16.0).r;
	float n2 = texture(uNoise, vW.xz * 2.3 / 64.0).g;
	vec3 alb = mix(${C('#c6c0b1')}, ${C('#d3cdbd')}, n) * (0.94 + 0.08 * n2);
	alb = mix(alb, ${C('#e6dcc4')}, smoothstep(0.93, 0.99, coast));
	alb = mix(${C('#9d8f7c')}, alb, smoothstep(0.6, 0.95, N.y));
	float sh = shadowAt(vW, N);
	vec3 c = shade(alb, N, normalize(cameraPosition - vW), 0.95, sh, 0.03, 0.2);
	c = mix(c, mix(uFogCol * 0.8, N_FOG, nightK()), 0.22);
	c = applyFog(c, vW);
	c = edgeMist(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

const SEA_VS = /* glsl */ `
varying vec3 vW;
void main() {
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;
const SEA_FS = /* glsl */ `
#define TIER __TIER__
${COMMON}
${LIGHT}
${FINISH}
${MIST}
uniform sampler2D uWater;
uniform vec4 uFBox;
uniform vec3 uSea, uSeaDeep;
uniform float uSelOn;
varying vec3 vW;
void main() {
	vec2 uv = (vW.xz - uFBox.xy) * uFBox.zw;
	float eb = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
	float coast = texture(uWater, clamp(uv, 0.0, 1.0)).r * smoothstep(0.0, 0.06, eb);
	float dist = (1.0 - coast) * ${f(RC)}; // kıyıya uzaklık (birim)
	float t = uTime;
	vec2 p = vW.xz;
	vec2 g = vec2(0.0);
	g += vec2(0.6, 0.8) * cos(dot(p, vec2(0.6, 0.8)) * 0.9 + t * 1.2) * 0.05;
	g += vec2(-0.8, 0.5) * cos(dot(p, vec2(-0.8, 0.5)) * 1.7 + t * 1.7) * 0.035;
#if TIER > 0
	g += (vec2(texture(uNoise, p * 1.1 / 64.0 + t * 0.0055).g, texture(uNoise, p * 1.1 / 64.0 - t * 0.0047 + 0.5).g) - 0.5) * 0.12;
#endif
	vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
	vec3 V = normalize(cameraPosition - vW);
	// derinlik: kıyıda turkuaz sığlık, açıkta lacivert
	vec3 deep = uSeaDeep * mix(0.93, 1.03, texture(uNoise, p * 0.04 / 8.0).a);
	vec3 base = mix(deep, uSea, smoothstep(2.2, 0.3, dist));
	base = mix(base, ${C('#62e3d4')}, smoothstep(0.32, 0.02, dist) * 0.75);
	float ndv = clamp(dot(N, V), 0.0, 1.0);
	float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
	vec3 c = base * (uSkyTop * 1.05 + uSunCol * 0.26 * max(dot(N, uSunDir), 0.0));
	c = mix(c, skyReflect(reflect(-V, N)), fres * 0.7);
	vec3 H = normalize(uSunDir + V);
	c += uSunCol * pow(max(dot(N, H), 0.0), 320.0) * 2.4;
	// kıyı köpüğü: kıyıya paralel nefes alan çizgiler + kıyı çizgisinde beyaz yaka
	// açık denizde ağır kayan ince dalga çizgileri
	float wl = smoothstep(0.985, 1.0, sin(dot(p, vec2(0.42, 0.91)) * 1.1 + texture(uNoise, p * 0.22 / 16.0).r * 9.0 + t * 0.5)) * smoothstep(0.8, 2.6, dist) * texture(uNoise, p * 0.15 / 8.0 + 0.3).a;
	c += uSunCol * wl * 0.018;
	float wave = sin(dist * 26.0 - t * 1.8 + texture(uNoise, p * 0.8 / 32.0).b * 5.0) * 0.5 + 0.5;
	float foam = smoothstep(0.35, 0.08, dist) * smoothstep(0.72, 0.98, wave) * 0.55 + smoothstep(0.07, 0.015, dist);
	c = mix(c, vec3(1.0) * (uSkyTop + uSunCol * 0.32), clamp(foam, 0.0, 1.0) * 0.82);
	// şafak: deniz ufku ısınır
	if (uNight.z > 0.001) c += DAWN * uNight.z * fres * 0.5;
	vec3 stars = vec3(0.0);
	if (uNight.x > 0.001) {
		// gece denizi: durgun bir gök aynası. Mor-lacivert gök, yıldızlar (sakin normalle, titremesin),
		// dalgacıklarda ay yolu; kıyıda soğuk ışıklı köpük (biyolüminesans)
		vec3 R = reflect(-V, N);
		R.y = abs(R.y);
		vec3 Rc = reflect(-V, normalize(vec3(-g.x * 0.06, 1.0, -g.y * 0.06)));
		Rc.y = abs(Rc.y);
		vec3 body = mix(vec3(0.001, 0.0016, 0.005), vec3(0.002, 0.006, 0.012), smoothstep(2.2, 0.3, dist));
		float fr = 0.35 + 0.4 * pow(1.0 - ndv, 3.0);
		vec3 n = mix(body, nightSky(Rc) * 0.5, fr);
		// yıldızlar sisten sonra eklenir (uzak denizde de seçilsin)
		stars = starField(Rc) * fr * 0.12 * uNight.x;
		// ay yolu: sakin yüzeyde geniş yumuşak ışık, dalgacıklarda pırıltı
		float mc = max(dot(Rc, N_MOON), 0.0);
		n += vec3(0.16, 0.2, 0.34) * pow(mc, 14.0) * 0.3;
		float m = max(dot(R, N_MOON), 0.0);
		n += vec3(0.7, 0.76, 0.9) * pow(m, 700.0) * 0.7 * (0.3 + 0.7 * smoothstep(0.6, 0.95, mc));
		n -= vec3(1.5, 1.55, 1.7) * smoothstep(0.99935, 0.99965, mc) * 0.5 * fr; // ay diski yansıması leke gibi durmasın
		n += vec3(0.1, 0.16, 0.26) * clamp(foam, 0.0, 1.0) * 0.05;
		c = mix(c, n, uNight.x);
		gRelit = 1.0;
	}
	c = applyFog(c, vW);
	c += stars;
	c = edgeMist(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

// ------------------------------------------------------------------ yardımcılar

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

// boya dalgası cephesi: hızlı çıkış ama cephe il boyunca görünür kalsın
const waveEase = (t) => {
	const u = Math.min(1, Math.max(0, t));
	return u * (2 - u) * 0.85 + u * 0.15;
};

// ------------------------------------------------------------------ harita

export class Board {
	/**
	 * @param G ortak uniform'lar
	 * @param tier kalite kademesi
	 * @param renderer alan dokularını açılışta çizmek için (yoksa sınır çizgisi olmadan çalışır)
	 */
	constructor(G, tier, renderer = null) {
		this.G = G;
		this.tier = tier;
		this.data = DATA;
		this.relief = new Relief();
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
		this.top = TOP;
		this.liftUnit = LIFT;
		this.selLiftUnit = SEL_LIFT;
		const taps = String(tier.shadowTaps);
		const tierId = String(tier.id);
		for (const p of this.provinces) {
			p.y = this.relief.height(p.x, -p.z);
			// il sınırının en uzak noktası (boya dalgası süresi için)
			let bx0 = Infinity;
			let bx1 = -Infinity;
			let bz0 = Infinity;
			let bz1 = -Infinity;
			for (const r of p.rings)
				for (let k = 0; k < r.length; k += 2) {
					bx0 = Math.min(bx0, r[k]);
					bx1 = Math.max(bx1, r[k]);
					bz0 = Math.min(bz0, -r[k + 1]);
					bz1 = Math.max(bz1, -r[k + 1]);
				}
			p.box = [bx0, bz0, bx1, bz1];
		}

		// --- il durumu dokusu (kayan noktalı, N × 4)
		this.S = new Float32Array(N * 4 * 4);
		this.stateTex = new THREE.DataTexture(this.S, N, 4, THREE.RGBAFormat, THREE.FloatType);
		this.stateTex.magFilter = this.stateTex.minFilter = THREE.NearestFilter;
		this.stateTex.colorSpace = THREE.NoColorSpace;
		this.stateTex.generateMipmaps = false;
		for (let i = 0; i < N; i++) {
			this._row(i, 0).set([0, 0, 0, -1]);
			this._row(i, 1).set([0, 0, 0, -1]);
			this._row(i, 2).set([this.provinces[i].x, this.provinces[i].z, 1e5, 0]);
		}
		this.stateTex.needsUpdate = true;
		this.state2Tex = this.stateTex; // eski adı (geri uyum)
		this.lift = new Float32Array(N);
		this.liftTo = new Float32Array(N);
		this.glow = new Float32Array(N);
		this.glowTo = new Float32Array(N);
		this.sel = new Float32Array(N);
		this.selTo = new Float32Array(N);
		this.dim = new Float32Array(N);
		this.dimTo = new Float32Array(N);
		this.ownerHex = []; // oyuncu kimliği → renk (sRGB onaltılık): oklar, etiketler
		this.wave = this.provinces.map(() => ({ on: false, t: 0, dur: 1, maxR: 1, flash: 0 }));
		this.uSelOn = { value: 0 };
		this.selOnTo = 0;
		this.nightTo = 0;
		this._nightOff = -1;
		this._np = 0; // gece geçişinin doğrusal ilerlemesi (0..1)
		this._rising = false;
		this.nightIn = 0.8; // gündüz → gece (sn)
		this.nightOut = 1.1; // gece → şafak → gündüz (sn)
		this.onNight = null; // (on) => {}: gece başlarken/biterken (sinema kamerayı kaldırır)
		this._c = new THREE.Color();

		// --- alan dokuları (sınır uzaklığı, kıyı, nehir, göl)
		const res = tier.id === 0 ? 1536 : 2048;
		this.fields = renderer ? bakeFields(renderer, DATA, (id) => this.byId.get(id).index, res) : null;
		const blank = new THREE.DataTexture(new Uint8Array([255, 255, 0, 0]), 1, 1);
		blank.needsUpdate = true;
		const fBox = this.fields ? this.fields.box : new THREE.Vector4(FIELD_BOX.x0, FIELD_BOX.z0, 1 / FIELD_BOX.w, 1 / FIELD_BOX.d);
		const fieldU = {
			uBorder: { value: this.fields ? this.fields.border.texture : blank },
			uWater: { value: this.fields ? this.fields.water.texture : blank },
			uFBox: { value: fBox },
			uFRes: { value: this.fields ? this.fields.res : new THREE.Vector2(1, 1) },
		};
		this.fieldUniforms = fieldU;

		// --- il yüzeyleri ve duvarları
		const step = tier.id === 0 ? 0.5 : tier.id === 1 ? 0.4 : 0.33;
		const built = buildBoardGeometry(this.provinces, this.relief, step);
		this.geoStats = { vertices: built.vertices, triangles: built.triangles };
		const geo = built.geometry;
		this.uMe = { value: -5 };
		this.uAct = { value: -5 };
		this.uSelEdge = { value: 1 };
		this.uSelAny = { value: 0 };
		const uniforms = { ...G, ...fieldU, uState: { value: this.stateTex }, uSelOn: this.uSelOn, uMe: this.uMe, uAct: this.uAct, uSelEdge: this.uSelEdge, uSelAny: this.uSelAny };
		this.uniforms = uniforms;
		this.mat = new THREE.ShaderMaterial({
			vertexShader: PROV_VS,
			fragmentShader: PROV_FS.replace('__TAPS__', taps).replace('__TIER__', tierId),
			uniforms,
		});
		this.mesh = new THREE.Mesh(geo, this.mat);
		this.mesh.matrixAutoUpdate = false;
		this.group.add(this.mesh);
		// gölge: kaba kabartma (yalnızca yüzey), biraz alçaltılmış (kendi gölgesi kirlenmesin)
		// q=0: harita gölge yapmaz (yalnızca ağaç, yapı ve kaleler), gölge geçişi hafif kalsın
		const sbuilt = tier.id === 0 ? { geometry: emptyGeo(), triangles: 0 } : buildBoardGeometry(this.provinces, this.relief, 1.3, { skirts: false });
		this.shadowGeoStats = { triangles: sbuilt.triangles };
		this.shadowMesh = new THREE.Mesh(
			sbuilt.geometry,
			new THREE.ShaderMaterial({ vertexShader: DEPTH_VS, fragmentShader: DEPTH_FS, uniforms: { uState: uniforms.uState, uSelOn: this.uSelOn, uDrop: { value: 0.1 } } }),
		);
		this.shadowMesh.matrixAutoUpdate = false;

		// --- komşu ülkeler (alçak, soluk)
		const lgeo = landCaps(DATA.land, 0.03);
		this.land = new THREE.Mesh(
			lgeo,
			new THREE.ShaderMaterial({ vertexShader: LAND_VS, fragmentShader: LAND_FS.replace('__TAPS__', taps), uniforms: { ...G, ...fieldU, uSelOn: this.uSelOn } }),
		);
		this.land.matrixAutoUpdate = false;
		this.group.add(this.land);

		// --- deniz: ufka kadar
		this.sea = new THREE.Mesh(
			new THREE.PlaneGeometry(2400, 2400, 1, 1).rotateX(-Math.PI / 2),
			new THREE.ShaderMaterial({ vertexShader: SEA_VS, fragmentShader: SEA_FS.replace('__TIER__', tierId), uniforms: { ...G, ...fieldU, uSelOn: this.uSelOn } }),
		);
		this.sea.renderOrder = 2; // karadan sonra: örtülen deniz pikseli hiç boyanmaz
		this.sea.matrixAutoUpdate = false;
		this.sea.updateMatrix();
		this.group.add(this.sea);

		// --- il adı noktaları ve yazı katmanı
		this.labels = this.provinces.map((p) => this.labelAt(p.index, new THREE.Vector3(), true));
		this.labelLayer = new Labels(G, this);
		this.group.add(this.labelLayer.mesh);
		Castle.board = this;
		// --- bulutlar (harita çevresinde)
		this.clouds = new Clouds(G, tier);
		this.group.add(this.clouds.mesh);
		this.cloudFrame = new CloudFrame(G, tier); // gece bulut çerçevesi (ekran kenarı)
		this.group.add(this.cloudFrame.mesh);
		// seçim işaretleri: sınırdan hedefe altın oklar ve hedef rozetleri (tek çizim)
		this.cues = new Cues(G, this);
		this.group.add(this.cues.mesh);
	}

	_row(i, r) {
		const o = (r * this.count + i) * 4;
		return this.S.subarray(o, o + 4);
	}

	_setRow(i, r, a, b, c, d) {
		const o = (r * this.count + i) * 4;
		const S = this.S;
		S[o] = a;
		S[o + 1] = b;
		S[o + 2] = c;
		S[o + 3] = d;
		this.stateTex.needsUpdate = true;
	}

	// ---------------------------------------------------------------- sahiplik ve boya

	/**
	 * İlin sahibini ve rengini ayarla (renk null → tarafsız). ox/oz verilirse boya dalgası o noktadan
	 * yayılır; verilmezse anında boyanır (ama önceki renk saklanır: hemen ardından paint() çağrılırsa
	 * dalga eski renkten başlar).
	 */
	setOwner(index, owner, color, ox, oz) {
		const p = this.provinces[index];
		p.owner = owner;
		if (owner >= 0 && color != null) this.ownerHex[owner] = this._c.set(color).getHex(); // oklar ve etiketler için sahip rengi
		const o = (0 * this.count + index) * 4;
		const S = this.S;
		// önceki = şimdiki
		this._setRow(index, 1, S[o], S[o + 1], S[o + 2], S[o + 3]);
		if (color != null && owner >= 0) {
			const c = this._c.set(color);
			this._setRow(index, 0, c.r, c.g, c.b, owner);
		} else this._setRow(index, 0, 0, 0, 0, -1);
		if (ox != null && oz != null) this._wave(index, ox, oz);
		else {
			this.wave[index].on = false;
			this._setRow(index, 2, p.x, p.z, 1e5, 0);
		}
	}

	/**
	 * Boya dalgası: il, dünya noktasından (ox, oz) dışa doğru bu renge boyanır; cephede parlak çizgi.
	 * setOwner'dan hemen sonra aynı renkle çağrılırsa eski renkten başlar. Nokta verilmezse il merkezi.
	 * Dönen: dalga süresi (saniye).
	 */
	paint(index, color, ox, oz) {
		const p = this.provinces[index];
		const o = index * 4;
		const S = this.S;
		const c = this._c.set(color);
		const same = Math.abs(S[o] - c.r) + Math.abs(S[o + 1] - c.g) + Math.abs(S[o + 2] - c.b) < 1e-3 && S[o + 3] >= 0;
		if (!same) {
			this._setRow(index, 1, S[o], S[o + 1], S[o + 2], S[o + 3]);
			this._setRow(index, 0, c.r, c.g, c.b, p.owner >= 0 ? p.owner : 99);
		}
		return this._wave(index, ox ?? p.x, oz ?? p.z);
	}

	_wave(index, ox, oz) {
		const p = this.provinces[index];
		let maxR = 0;
		for (const r of p.rings)
			for (let k = 0; k < r.length; k += 2) maxR = Math.max(maxR, Math.hypot(r[k] - ox, -r[k + 1] - oz));
		const w = this.wave[index];
		w.on = true;
		w.t = 0;
		w.maxR = maxR + 0.3;
		w.dur = Math.min(1.6, Math.max(0.85, 0.6 + maxR * 0.09));
		w.flash = 1;
		w.ox = ox;
		w.oz = oz;
		this._setRow(index, 2, ox, oz, 0, 1);
		return w.dur;
	}

	/** İki ilin ortak sınırının orta noktası (saldırı dalgası buradan başlasın). Yoksa a'nın merkezi. */
	borderPoint(a, b, out = new THREE.Vector3()) {
		const ida = this.provinces[a].id;
		const idb = this.provinces[b].id;
		let best = null;
		let bl = -1;
		for (const s of DATA.borders) {
			if (!((s.a === ida && s.b === idb) || (s.a === idb && s.b === ida))) continue;
			if (s.pts.length > bl) {
				bl = s.pts.length;
				best = s.pts;
			}
		}
		if (!best) return out.set(this.provinces[a].x, this.provinces[a].y, this.provinces[a].z);
		const k = (best.length >> 2) * 2;
		const x = best[k];
		const y = best[k + 1];
		return out.set(x, this.relief.height(x, y), -y);
	}

	// ---------------------------------------------------------------- vurgu

	/** Yükselme (0..1) ve parlama (0..1) hedefleri; yumuşakça varılır. */
	fx(index, lift, glow) {
		if (lift != null) this.liftTo[index] = lift;
		if (glow != null) this.glowTo[index] = glow;
	}

	clearFx() {
		this.liftTo.fill(0);
		this.glowTo.fill(0);
	}

	/** Seçilebilir iller: gece odağı; yalnızca bunlar gündüz renginde, kalkık ve altın hatlı. null → gündüz. */
	select(list, { attack = false, me = null, act = null } = {}) {
		if (me != null) this.uMe.value = me;
		const on = !!(list && list.length);
		// sırası gelen oyuncu (insan seçerken kendisi, bot seçerken bot): toprağı gecede net, oklar onun renginde
		this.uAct.value = on ? (act != null ? act : this.uMe.value) : -5;
		// dış hat: az seçenekte belirgin; çokta ince (beyaz ağ olmasın); başkentte (bütün harita seçilebilir) yok
		if (on) this.uSelEdge.value = list.length <= 6 ? 1 : this.G.uSelLit.value < 1 ? 0 : 0.3;
		this.night(on, list);
		this.cues.hide(); // seçimde ok yok: seçilebilir iller parlar, etiketler adlarını söyler (ok yalnız saldırı yürüyüşünde)
	}

	/**
	 * Gece odağı: on → sahne ~0.6 sn'de geceye geçer, list (aydınlık iller) gündüzde kalır, kalkar, altın
	 * hatla parlar. off → kısa bir beklemeden sonra (hold sn; hemen ardından gelen yeni seçim titretmesin)
	 * gündüze döner.
	 */
	night(on, list = null, { hold = 0.3, fast = false } = {}) {
		if (on) {
			this._fastIn = fast; // hızlı düşüş (gündüzden doğrudan bir ana kesme)
			this._nightOff = -1;
			this.selTo.fill(0);
			if (list) for (const i of list) this.selTo[i] = 1;
			this.uSelAny.value = list && list.length > 1 ? 1 : 0; // gerçek bir seçim (tek il: seçilmiş, karar verildi)
			this.selOnTo = 1;
			if (this.nightTo < 1) this.onNight?.(true);
			this.nightTo = 1;
		} else if (hold <= 0) {
			this._nightOff = -1;
			this._day();
		} else if (this.nightTo > 0 && this._nightOff < 0) this._nightOff = hold;
	}

	_day() {
		this.cues.hide();
		this.selTo.fill(0);
		this.selOnTo = 0;
		if (this.nightTo > 0) this.onNight?.(false);
		this.nightTo = 0;
	}

	/** Şu an gece mi (0..1). */
	get nightAmt() {
		return this.G.uNight.value.x;
	}

	/** Maçın oynandığı iller (dışarıdakiler kalıcı olarak sönük). null → hepsi etkin. */
	setActive(list) {
		this.dimTo.fill(list ? 1 : 0);
		if (list) for (const i of list) this.dimTo[i] = 0;
	}

	/** İl adları: dizi (vurgulu), 'all' (sığanlar) ya da null (kapalı). */
	showLabels(list, opts) {
		this.labelLayer.show(list, opts);
	}

	update(dt) {
		Castle.warmed = true;
		if (this._nightOff >= 0) {
			this._nightOff -= dt;
			if (this._nightOff <= 0) {
				this._nightOff = -1;
				this._day();
			}
		}
		const nu = this.G.uNight?.value;
		if (nu) {
			// ~1 sn sinematik geçiş: gök kararır, yıldızlar ardından tek tek belirir; dönüşte şafak
			const to = this.nightTo;
			const up = to > this._np;
			if (up) this._rising = true;
			else if (to < this._np) this._rising = false;
			const step = dt / (up ? (this._fastIn ? 0.35 : this.nightIn) : this.nightOut);
			this._np = up ? Math.min(to, this._np + step) : Math.max(to, this._np - step);
			const p = this._np;
			nu.x = p * p * (3 - 2 * p);
			const sw = Math.min(1, Math.max(0, (p - 0.35) / 0.65));
			nu.w = sw * sw * (3 - 2 * sw);
			nu.z = this._rising ? 0 : Math.sin(Math.PI * Math.min(1, p * 1.15)) * 0.9 * (p > 0 ? 1 : 0);
			this.cloudFrame.update(0); // v0.3: gece bulut çerçevesi kaldırıldı (ucuz duruyordu)
			this.clouds.mesh.visible = nu.x < 0.995; // tombul bulutlar gecede söner
		}
		const k = 1 - Math.exp(-8 * dt);
		const N = this.count;
		const S = this.S;
		let dirty = false;
		for (let i = 0; i < N; i++) {
			const l = this.lift[i] + (this.liftTo[i] - this.lift[i]) * k;
			const g = this.glow[i] + (this.glowTo[i] - this.glow[i]) * k;
			const s = this.sel[i] + (this.selTo[i] - this.sel[i]) * Math.min(1, k * 1.3);
			const d = this.dim[i] + (this.dimTo[i] - this.dim[i]) * k;
			if (Math.abs(l - this.lift[i]) + Math.abs(g - this.glow[i]) + Math.abs(s - this.sel[i]) + Math.abs(d - this.dim[i]) > 1e-4) {
				this.lift[i] = l;
				this.glow[i] = g;
				this.sel[i] = s;
				this.dim[i] = d;
				const o = (3 * N + i) * 4;
				S[o] = l;
				S[o + 1] = g;
				S[o + 2] = s;
				S[o + 3] = d;
				dirty = true;
			}
			const w = this.wave[i];
			if (w.on) {
				w.t += dt;
				const o = (2 * N + i) * 4;
				const u = w.t / w.dur;
				S[o + 2] = w.maxR * waveEase(u);
				S[o + 3] = u < 1 ? 1 : Math.max(0, 1 - (u - 1) * 3);
				if (u >= 1.35) {
					w.on = false;
					S[o + 2] = 1e5;
					S[o + 3] = 0;
				}
				dirty = true;
			}
		}
		this.labelLayer.update(dt);
		this.cues.update(dt);
		const so = this.uSelOn.value + (this.selOnTo - this.uSelOn.value) * Math.min(1, k * 1.3);
		this.uSelOn.value = Math.abs(so - this.selOnTo) < 1e-3 ? this.selOnTo : so;
		if (dirty) this.stateTex.needsUpdate = true;
	}

	// ---------------------------------------------------------------- konum sorguları

	/** Dünya noktasındaki kara yüksekliği (yükselme hariç). */
	heightAt(x, z) {
		return this.relief.height(x, -z);
	}

	/** İlin şu anki toplam yükselmesi (birim). */
	liftOf(index) {
		return this.lift[index] * LIFT + this.sel[index] * SEL_LIFT;
	}

	/** İlin dünya konumundaki tepe noktası (kale, bayrak, kamera için). */
	topAt(index, out) {
		const p = this.provinces[index];
		return out.set(p.x, p.y + this.liftOf(index), p.z);
	}

	/** İl adının dünya noktası (rest: yükselme hariç). */
	labelAt(index, out, rest = false) {
		const p = this.provinces[index];
		const dz = Math.min(0.85, p.inner * 0.5);
		const x = p.x;
		const z = p.z + dz;
		const y = Math.max(this.relief.height(x, -z), p.y) + 0.35 + (rest ? 0 : this.liftOf(index));
		return out.set(x, y, z);
	}

	/** Dünya noktası → il indeksi (yoksa -1). */
	pick(x, z) {
		const y = -z;
		for (const p of this.provinces) {
			const b = p.box;
			if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) continue;
			for (const r of p.rings) if (pointInPoly(x, y, r)) return p.index;
		}
		return -1;
	}

	/** Işın → il (kabartmalı yüzeyle kesişim). out: çarpma noktası. Dönen il indeksi ya da -1. */
	raycast(ray, out) {
		const o = ray.origin;
		const d = ray.direction;
		if (d.y > -1e-4) return -1;
		// y = 3 ile y = 0 düzlemleri arasında yürü
		let t0 = Math.max(0, (3 - o.y) / d.y);
		const t1 = (0 - o.y) / d.y;
		const n = 72;
		const dt = (t1 - t0) / n;
		// kalkmış il varsa yüksekliğe onu da kat (kalkık ilin üstüne ya da duvarına dokunulabilsin)
		let lifted = false;
		for (let i = 0; i < this.count && !lifted; i++) if (this.liftOf(i) > 0.02) lifted = true;
		const ground = (x, z) => {
			const g = this.relief.height(x, -z);
			if (!lifted) return g;
			const idx = this.pick(x, z);
			return idx >= 0 ? g + this.liftOf(idx) : g;
		};
		let prev = t0;
		let hit = -1;
		for (let i = 0; i <= n; i++) {
			const t = t0 + dt * i;
			const y = o.y + d.y * t;
			if (y <= ground(o.x + d.x * t, o.z + d.z * t)) {
				// ikiye bölerek incelt
				let a = prev;
				let b = t;
				for (let k = 0; k < 8; k++) {
					const m = (a + b) / 2;
					if (o.y + d.y * m <= ground(o.x + d.x * m, o.z + d.z * m)) b = m;
					else a = m;
				}
				hit = b;
				break;
			}
			prev = t;
		}
		if (hit < 0) hit = t1;
		out.set(o.x + d.x * hit, o.y + d.y * hit, o.z + d.z * hit);
		return this.pick(out.x, out.z);
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

function emptyGeo() {
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
	g.setIndex([]);
	return g;
}

/** Komşu ülkeler: düz kapak (deniz üstünde ince), yukarı bakan normal. */
function landCaps(rings, y) {
	const pos = [];
	const v = [];
	for (const r of rings) {
		v.length = 0;
		for (let i = 0; i < r.length; i += 2) v.push(new THREE.Vector2(r[i], r[i + 1]));
		const faces = THREE.ShapeUtils.triangulateShape(v, []);
		for (const f of faces) {
			// dünyada yukarı baksın
			const A = v[f[0]], B = v[f[1]], Cc = v[f[2]];
			const cr = (B.x - A.x) * (Cc.y - A.y) - (B.y - A.y) * (Cc.x - A.x);
			for (const k of cr > 0 ? [f[0], f[1], f[2]] : [f[0], f[2], f[1]]) pos.push(v[k].x, y, -v[k].y);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	const n = new Float32Array(pos.length);
	for (let i = 1; i < n.length; i += 3) n[i] = 1;
	g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
	g.computeBoundingSphere();
	return g;
}
