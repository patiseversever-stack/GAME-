// Ortak GLSL parçaları.
//
// Görüntü tek geçişte biter: ışık, gölge, sis, ton eşleme, renk düzenleme, vinyet ve titreşim
// her malzemenin kendi fragment shader'ında yapılır. Ekrana sonradan "film efekti" geçişi
// uygulanmaz: mobil kartların en zayıf olduğu bellek trafiği en aza iner, MSAA bedava kalır.
//
// Sanat yönü: oyuncak minyatür şehir. Sıcak, parlak güneş; doygun ama temiz renkler; gölgeler
// siyah değil serin mavi-mor; cilalı domino taşlarında ıslak gibi parlayan ışık.

export const COMMON = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;   // güneşe doğru birim vektör
uniform vec3 uSunCol;   // doğrusal renk (şiddet dahil)
uniform vec3 uSkyTop;   // gökten gelen ortam ışığı
uniform vec3 uSkyHor;   // ufuktan gelen ortam ışığı
uniform vec3 uGround;   // yerden sekme
uniform vec3 uShadeTint;// gölgenin rengi (çarpan)
uniform vec3 uFogCol;
uniform vec3 uFogSun;
uniform vec4 uFogP;     // x yoğunluk, y başlangıç uzaklığı, z yükseklik azalımı, w güneş halesi üssü
uniform vec3 uRes;      // genişlik, yükseklik, vinyet gücü
uniform vec4 uGrade;    // x doygunluk, y kontrast, z pozlama, w titreşim
uniform vec3 uLift;
uniform vec3 uGain;
uniform vec3 uVigCol;
uniform vec4 uFocus;    // xyz odak (zincirin ucu), w yarıçap: odak çevresi hafif ışıltı
uniform vec4 uNightTone; // gece odağında arazinin tonu (env.js NIGHT_TONES): rgb çarpan, a doygunluk
uniform vec4 uNight;    // x gece (0 gündüz, 1 gece odağı), y ay kenarı gücü, z şafak (dönüşte sıcak ufuk), w yıldızlar
uniform vec4 uSpot;     // sinematik ışık havuzu (yakın çekim): xy ekran merkezi (0..1), z yarıçap (ekran yüksekliği), w güç
#ifndef FL_GLOBALS
#define FL_GLOBALS
// gece odağı: gLit 1 olan piksel gündüz renginde kalır (seçilebilir il, efekt ışığı); gRim ay kenarı;
// gRelit 1: piksel gece ışığıyla yeniden aydınlatıldı (finish() ayrıca karartmaz);
// gOwn 1: sahip rengi (gecede de tonunu korur: kırmızı ay ışığında pembeye kaçmaz)
float gLit = 0.0;
float gRim = 0.0;
float gRelit = 0.0;
float gOwn = 0.0;
#endif
// Gece paleti (doğrusal). v0.3: siyaha yakın lacivert gece, serin ay ışığı, düşük doygunluk.
// Aydınlık (seçilebilir) iller ekrandaki tek parlak ve renkli şey olsun; gece manzarası yalnızca ince
// ay kabartması ve birkaç sıcak şehir ışığıyla okunur. Ay kuzeybatıda, yüksekte.
const vec3 N_MOON = vec3(-0.3498, 0.7795, -0.5197);
const vec3 N_MOONC = vec3(0.187, 0.26, 0.46);
const vec3 N_SKY = vec3(0.022, 0.035, 0.085);
const vec3 N_GND = vec3(0.005, 0.006, 0.012);
const vec3 N_RIM = vec3(0.16, 0.22, 0.38);
const vec3 N_ZEN = vec3(0.0015, 0.0022, 0.006);
const vec3 N_HOR = vec3(0.008, 0.013, 0.03);
const vec3 N_FOG = vec3(0.006, 0.009, 0.02);
const vec3 N_WARM = vec3(1.0, 0.56, 0.2);
const vec3 DAWN = vec3(1.0, 0.5, 0.28);

float hash12(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
`;

export const SHADOW = /* glsl */ `
#ifndef SHADOW_TAPS
#define SHADOW_TAPS 1
#endif
uniform sampler2DShadow uShadowMap;
uniform mat4 uShadowMat;
uniform vec4 uShadowP; // x 1/çözünürlük, y normal kaydırma, z derinlik payı
float shadowAt(vec3 wp, vec3 n) {
	vec4 sc = uShadowMat * vec4(wp + n * uShadowP.y, 1.0);
	vec3 p = sc.xyz;
	vec2 e = abs(p.xy - 0.5);
	if (max(e.x, e.y) > 0.497 || p.z > 1.0) return 1.0;
	// haritanın kenarına doğru gölge yumuşakça söner (kapsam sınırı görünmesin)
	float fade = smoothstep(0.497, 0.43, max(e.x, e.y));
	p.z -= uShadowP.z;
#if SHADOW_TAPS > 1
	float o = uShadowP.x * 1.25;
	float s = texture(uShadowMap, vec3(p.xy + vec2(-o, -0.35 * o), p.z));
	s += texture(uShadowMap, vec3(p.xy + vec2(0.35 * o, -o), p.z));
	s += texture(uShadowMap, vec3(p.xy + vec2(o, 0.35 * o), p.z));
	s += texture(uShadowMap, vec3(p.xy + vec2(-0.35 * o, o), p.z));
	s *= 0.25;
#else
	float s = texture(uShadowMap, p);
#endif
	return mix(1.0, s, fade);
}
`;

export const LIGHT = /* glsl */ `
#ifndef FL_SPOT
#define FL_SPOT
/**
 * Sinematik ışık havuzu (yalnızca parça shader'ı): yakın çekimde aydınlık il(ler) ekranın ortasındaki
 * yumuşak bir ışık havuzunda kalır, kenara doğru geceye karışır (gece yakın çekimde de okunur).
 */
float spotK() {
	if (uSpot.w < 0.001) return 1.0;
	vec2 q = gl_FragCoord.xy / uRes.xy - uSpot.xy;
	q.x *= uRes.x / uRes.y * 0.95;
	return 1.0 - uSpot.w * smoothstep(uSpot.z, uSpot.z * 1.8, length(q));
}
#endif
/** Bu pikselin gece miktarı: aydınlık (gLit) pikseller gündüzde kalır (ışık havuzunun içinde). */
float nightK() {
	return uNight.x * (1.0 - clamp(gLit, 0.0, 1.0) * spotK());
}
float sh13(vec3 p) {
	p = fract(p * 0.1031);
	p += dot(p, p.zyx + 31.32);
	return fract((p.x + p.y) * p.z);
}
/** Yıldızlar (Gündönümü'nden): iki ölçekte hücre, uNight.w arttıkça tek tek belirir, göz kırpar. */
vec3 starField(vec3 d) {
	vec3 c = vec3(0.0);
	float on = uNight.w;
	// yıldızın en küçük boyu piksel cinsinden (kamera görüş açısı 32°): düşük çözünürlükte de okunur
	float pxa = 0.5735 / max(uRes.y, 1.0);
	vec3 sp = d * 250.0;
	float r = sh13(floor(sp));
	float th = 1.0 - 0.1 * on;
	if (r > th) {
		float l = length(fract(sp) - 0.5);
		float rad = clamp(2.3 * pxa * 250.0, 0.32, 0.48);
		c += mix(vec3(0.62, 0.74, 1.0), vec3(1.0, 0.86, 0.66), fract(r * 37.0)) * smoothstep(rad, rad * 0.15, l) * (r - th) * 20.0 * (0.72 + 0.28 * sin(uTime * (2.0 + r * 6.0) + r * 91.0));
	}
	sp = d * 64.0;
	r = sh13(floor(sp) + 17.3);
	th = 1.0 - 0.03 * on;
	if (r > th) {
		vec3 f = fract(sp) - 0.5;
		float l = length(f);
		float cr = max(0.1, 2.2 * pxa * 64.0);
		float s = smoothstep(cr, cr * 0.2, l) * 2.2 + smoothstep(0.42, 0.0, l) * 0.26 + (smoothstep(0.03, 0.0, abs(f.x)) + smoothstep(0.03, 0.0, abs(f.y))) * smoothstep(0.4, 0.0, l) * 0.35;
		c += mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.82, 0.6), fract(r * 53.0)) * s * (0.75 + 0.25 * sin(uTime * (1.3 + r * 3.0) + r * 40.0)) * smoothstep(th, th + 0.004, r);
	}
	return c;
}
/** Gece göğü: mor-lacivert geçiş, ay halesi ve diski, dönüşte şafak ışığı (yıldızlar ayrı). */
vec3 nightSky(vec3 d) {
	float h = d.y;
	vec3 c = mix(N_HOR, N_ZEN, pow(smoothstep(-0.03, 0.9, h), 0.55));
	float m = max(dot(d, N_MOON), 0.0);
	c += vec3(0.16, 0.2, 0.36) * (pow(m, 5.0) * 0.12 + pow(m, 48.0) * 0.4);
	c += vec3(1.5, 1.55, 1.7) * smoothstep(0.99935, 0.99965, m);
	c += DAWN * uNight.z * exp(-max(h, 0.0) * 4.0) * 0.55;
	return c;
}
/** Gece ışığı: ay (lavanta), gök (çivit), cilada ay parıltısı, siluette ay kenarı. */
vec3 moonShade(vec3 albedo, vec3 N, vec3 V, float ao, float sh, float gloss, float rimK) {
	float l = dot(albedo, vec3(0.3, 0.59, 0.11));
	// renkler solar (Purkinje) ama koyular kömür olmaz: ağaçlar ay ışığında seçilir.
	// Sahip rengi (gOwn) solmaz ve mor ışık almaz: kırmızı gecede koyu kırmızı kalır, pembeye kaçmaz.
	float ow = clamp(gOwn, 0.0, 1.0);
	// (sahip rengi tam doygun ama koyu: gece ilinde kırmızı derin kırmızı, aydınlık adadan ayrı okunur)
	// ton (uNightTone): a = arazinin korunan doygunluğu, rgb = renk çarpanı (sahip rengine dokunmaz)
	vec3 a = pow(max(mix(vec3(l), albedo, mix(uNightTone.a, 0.52, ow)), 0.0), vec3(0.8)) * (1.0 - 0.35 * ow);
	float w = clamp((dot(N, N_MOON) + 0.3) / 1.3, 0.0, 1.0);
	float up = N.y * 0.5 + 0.5;
	vec3 amb = mix(N_GND, N_SKY, smoothstep(0.1, 1.0, up)) * ao;
	amb = mix(amb, vec3(dot(amb, vec3(0.3, 0.59, 0.11))) * vec3(0.95, 0.98, 1.1) * 1.1, ow);
	vec3 c = a * (amb + mix(N_MOONC, vec3(0.3, 0.31, 0.36), ow) * w * w * mix(0.55, 1.0, sh));
	float ndv = clamp(dot(N, V), 0.0, 1.0);
	vec3 H = normalize(N_MOON + V);
	// ay parıltısı ve kenarı: sahip renginde soluk ve nötr (kırmızının üstüne lavanta binip pembeleştirmesin)
	vec3 sc = mix(N_MOONC, vec3(0.3, 0.3, 0.36), ow) * (1.0 - 0.6 * ow);
	c += sc * pow(max(dot(N, H), 0.0), mix(16.0, 140.0, gloss)) * mix(0.08, 1.6, gloss) * sh;
	c += N_RIM * pow(1.0 - ndv, 3.0) * (0.08 + rimK * 0.22) * ao * (0.4 + 0.6 * uNight.y) * (1.0 - 0.5 * ow);
	return c * mix(uNightTone.rgb, vec3(1.0), ow);
}
vec3 skyAmbient(vec3 N) {
	float up = N.y * 0.5 + 0.5;
	vec3 a = mix(uGround, uSkyHor, smoothstep(0.0, 0.55, up));
	return mix(a, uSkyTop, smoothstep(0.5, 1.0, up));
}
// gök yansıması (cilalı yüzeyler için): ufuk parlak, tepe derin mavi, güneş yönünde sıcak
vec3 skyReflect(vec3 R) {
	float h = clamp(R.y, -1.0, 1.0);
	vec3 c = mix(uSkyHor * 1.25, uSkyTop * 1.1, smoothstep(0.0, 0.7, h));
	c = mix(uGround * 0.9, c, smoothstep(-0.25, 0.05, h));
	float s = max(dot(R, uSunDir), 0.0);
	c += uSunCol * (pow(s, 600.0) * 6.0 + pow(s, 24.0) * 0.18);
	return c;
}
/**
 * Oyuncak ışığı: yumuşak sarılan güneş, yarı küre gök, serin gölge, kenar ışığı.
 * gloss: 0 mat, 1 cilalı. ao: ortam örtmesi.
 */
vec3 shade(vec3 albedo, vec3 N, vec3 V, float ao, float sh, float gloss, float rimK) {
	float ndl = dot(N, uSunDir);
	float w = clamp((ndl + 0.18) / 1.18, 0.0, 1.0);
	float diff = w * w * (3.0 - 2.0 * w);
	float lit = diff * sh;
	vec3 amb = skyAmbient(N) * ao;
	vec3 shadeCol = mix(uShadeTint, vec3(1.0), lit);
	// gece odağındaki aydınlık il: gündüz ışığı ama biraz yumuşak (v0.4: kırmızı turuncuya, sarı neona kaçmasın)
	float sunK = 1.0 - 0.28 * uNight.x * clamp(gLit, 0.0, 1.0);
	vec3 c = albedo * amb * shadeCol + albedo * uSunCol * lit * sunK;
	// cila: güneş parıltısı + gök yansıması (Fresnel)
	float ndv = clamp(dot(N, V), 0.0, 1.0);
	float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
	vec3 H = normalize(uSunDir + V);
	float spec = pow(max(dot(N, H), 0.0), mix(16.0, 140.0, gloss)) * mix(0.15, 2.2, gloss) * sh;
	vec3 R = reflect(-V, N);
	c += uSunCol * spec * (0.6 + 0.4 * fres) * sunK;
	c += skyReflect(R) * fres * gloss * 0.55 * ao;
	// kenar ışığı: siluet sıcak ışıkla parlar
	float rim = pow(1.0 - ndv, 3.0) * rimK;
	gRim = pow(1.0 - ndv, 2.5);
	c += uSunCol * rim * (0.25 + 0.75 * sh) * 0.35 * ao;
	float nk = nightK();
	// dönüşte şafak: gündüz ışığı bir an sıcak, altın
	if (uNight.z > 0.001) c *= mix(vec3(1.0), vec3(1.2, 0.97, 0.82), uNight.z * (1.0 - nk));
	if (nk > 0.001) {
		c = mix(c, moonShade(albedo, N, V, ao, sh, gloss, rimK), nk);
		gRelit = 1.0;
	}
	return c;
}
vec3 applyFog(vec3 c, vec3 wp) {
	vec3 d = wp - cameraPosition;
	float dist = length(d);
	vec3 v = d / max(dist, 1e-3);
	float x = max(dist - uFogP.y, 0.0) * uFogP.x;
	float hk = exp(-max(wp.y, 0.0) * uFogP.z);
	float f = 1.0 - exp(-x * x * hk);
	float s = pow(max(dot(v, uSunDir), 0.0), uFogP.w);
	vec3 fc = mix(uFogCol, uFogSun, s);
	float nk = nightK();
	if (uNight.z > 0.001) fc = mix(fc, fc * vec3(1.15, 0.86, 0.74) + DAWN * 0.12, uNight.z * (1.0 - nk));
	if (nk > 0.001) {
		fc = mix(fc, N_FOG, nk);
		// gece pusu: uzak yerler mor sise gömülür (derinlik, Gündönümü'ndeki gibi); sahip rengi daha az
		f = max(f, (1.0 - exp(-max(dist - 34.0, 0.0) * 0.02)) * 0.5 * nk * (1.0 - 0.5 * clamp(gOwn, 0.0, 1.0)));
	}
	return mix(c, fc, clamp(f, 0.0, 1.0));
}
`;

export const FINISH = /* glsl */ `
#ifndef FL_SPOT
#define FL_SPOT
/**
 * Sinematik ışık havuzu (yalnızca parça shader'ı): yakın çekimde aydınlık il(ler) ekranın ortasındaki
 * yumuşak bir ışık havuzunda kalır, kenara doğru geceye karışır (gece yakın çekimde de okunur).
 */
float spotK() {
	if (uSpot.w < 0.001) return 1.0;
	vec2 q = gl_FragCoord.xy / uRes.xy - uSpot.xy;
	q.x *= uRes.x / uRes.y * 0.95;
	return 1.0 - uSpot.w * smoothstep(uSpot.z, uSpot.z * 1.8, length(q));
}
#endif
vec3 acesFit(vec3 x) {
	return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
// orta tonlarda rengi koruyan ton eşleme: ışık doygun kalır, yalnızca çok parlak yerler beyaza yanar
vec3 tonemap(vec3 c) {
	float m = max(max(c.r, c.g), c.b);
	float mt = clamp((m * (2.51 * m + 0.03)) / (m * (2.43 * m + 0.59) + 0.14), 0.0, 1.0);
	vec3 hp = c * (mt / max(m, 1e-4));
	return mix(acesFit(c), hp, 0.7 * (1.0 - smoothstep(1.2, 6.0, m)));
}
// Yedek gece (shade() kullanmayan malzemeler için): Gündönümü gibi renk tonu korunur, mavi-mora kayar;
// ay kenarı lavanta. Yeniden aydınlatılan pikseller (gRelit) buraya girmez.
vec3 nightGrade(vec3 c) {
	float l = dot(c, vec3(0.3, 0.59, 0.11));
	vec3 n = mix(vec3(l), c, 0.3) * vec3(0.07, 0.085, 0.15) + vec3(0.001, 0.0015, 0.004);
	n += N_RIM * gRim * 0.25 * uNight.y;
	return n;
}
vec4 finish(vec3 c, float a) {
	float nk = uNight.x * (1.0 - clamp(gLit, 0.0, 1.0) * spotK());
	if (nk > 0.001 && gRelit < 0.5) c = mix(c, nightGrade(c), nk);
	// gecede aydınlık ada: biraz kısık pozlama (beyaza yanmasın, sahip rengi doygun kalsın)
	c *= 1.0 - 0.14 * (uNight.x - nk);
	c = tonemap(c * uGrade.z);
	c = pow(c, vec3(1.0 / 2.2));
	c = c * uGain + uLift * (1.0 - c);
	// gece: gölgeler mora kalkar (Gündönümü), aydınlık adalar canlı kalır
	// (yalnızca gece pikselinde; sahip rengine az: kırmızı pembeleşmesin)
	c += vec3(0.004, 0.008, 0.02) * nk * (1.0 - c);
	float l = dot(c, vec3(0.299, 0.587, 0.114));
	// gecede aydınlık ada biraz daha doygun (soluk krem değil, canlı gündüz rengi)
	c = mix(vec3(l), c, uGrade.x * (1.0 + 0.1 * (uNight.x - nk)));
	c = (c - 0.5) * uGrade.y + 0.5;
	vec2 q = gl_FragCoord.xy / uRes.xy - 0.5;
	q.x *= uRes.x / uRes.y * 0.8;
	float vg = smoothstep(0.3, 0.95, length(q));
	c *= mix(vec3(1.0), mix(uVigCol, vec3(0.04, 0.05, 0.09), uNight.x), (uRes.z + 0.32 * uNight.x) * vg);
	c += (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * uGrade.w;
	return vec4(clamp(c, 0.0, 1.0), a);
}
`;

// İl durumu dokusu (harita, ağaçlar, yapılar ve kaleler ortak okur). Genişlik il sayısı, 4 satır:
//   0: sahip rengi rgb, sahip kimliği (-1 tarafsız)
//   1: önceki renk rgb, önceki kimlik (boya dalgası buradan başlar)
//   2: dalga merkezi x, z, dalga yarıçapı, parlama
//   3: yükselme, parlama (nabız), seçilebilirlik, sönüklük (maç dışı)
export const PROV = /* glsl */ `
#ifndef FL_GLOBALS
#define FL_GLOBALS
float gLit = 0.0;
float gRim = 0.0;
float gRelit = 0.0;
float gOwn = 0.0;
#endif
uniform sampler2D uState;
uniform float uSelOn;   // seçim kipi açık (0..1): seçilemeyen iller kararır
vec4 provRow(float pid, int row) {
	return texelFetch(uState, ivec2(int(pid + 0.5), row), 0);
}
/** Seçim kipinde seçilemeyen ve maç dışı iller: renk solar, kararır. */
vec3 provDim(vec3 c, float sel, float dim) {
	// seçim kipinde gri karartma yok: gece odağı finish() içinde; seçilebilir il aydınlık kalır
	gLit = max(gLit, sel);
	float k = clamp(dim * 0.7, 0.0, 1.0);
	float l = dot(c, vec3(0.3, 0.59, 0.11));
	c = mix(c, vec3(l) * vec3(0.9, 0.95, 1.08), k * 0.72);
	return c * (1.0 - 0.42 * k);
}
`;

// Haritanın çevresi yumuşak bir pusa gömülür: göz Türkiye'de kalır, uzak kara parçalarının kesik
// kenarları görünmez (mobil oyun haritalarındaki bulut çerçevesi gibi).
export const MIST = /* glsl */ `
uniform sampler2D uNoise;
vec3 edgeMist(vec3 c, vec3 w) {
	vec2 q = w.xz + vec2(uTime * 0.17, 0.0);
	// değer gürültüsü ızgaraya hizalı: katmanlar döndürülmüş eksenlerde okunur, yoksa pus kare kare görünür
	vec2 q2 = mat2(0.8, -0.6, 0.6, 0.8) * q;
	vec2 q3 = mat2(0.28, 0.96, -0.96, 0.28) * q;
	float n = texture(uNoise, q * 0.07 / 8.0).a * 0.5 + texture(uNoise, q2 * 0.19 / 16.0 + 0.3).r * 0.32 + texture(uNoise, q3 * 0.46 / 64.0 + 0.7).g * 0.18;
	float e = length(w.xz / vec2(68.0, 36.0)) + (n - 0.5) * 0.22;
	float m = smoothstep(0.97, 1.32, e);
	// bulut denizi: tepeleri beyaz, aralar açık gök mavisi
	vec3 mc = mix(uFogCol * vec3(0.92, 0.98, 1.06), vec3(1.0, 1.0, 1.02) * (uSkyTop * 0.6 + uSunCol * 0.24), smoothstep(0.35, 0.75, n));
	if (uNight.x > 0.001) {
		// gece: karanlık ufuk pusu (lacivert-siyah), ay tarafında çok hafif gümüş; ışık sızıntısı yok
		vec3 nm = mix(vec3(0.003, 0.004, 0.01), vec3(0.018, 0.024, 0.045), smoothstep(0.32, 0.8, n));
		nm += DAWN * uNight.z * 0.25;
		mc = mix(mc, nm, uNight.x);
	}
	return mix(c, mc, m);
}
`;

/** sRGB onaltılık renk → GLSL doğrusal vec3 sabiti (shader derlenirken gömülür). */
export function glslColor(hex, k = 1) {
	const v = typeof hex === 'number' ? hex : parseInt(hex.replace('#', ''), 16);
	const f = (c) => {
		c /= 255;
		return (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)) * k;
	};
	return `vec3(${f((v >> 16) & 255).toFixed(4)}, ${f((v >> 8) & 255).toFixed(4)}, ${f(v & 255).toFixed(4)})`;
}
