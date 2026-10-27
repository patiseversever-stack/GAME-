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
	vec3 c = albedo * amb * shadeCol + albedo * uSunCol * lit;
	// cila: güneş parıltısı + gök yansıması (Fresnel)
	float ndv = clamp(dot(N, V), 0.0, 1.0);
	float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
	vec3 H = normalize(uSunDir + V);
	float spec = pow(max(dot(N, H), 0.0), mix(16.0, 140.0, gloss)) * mix(0.15, 2.2, gloss) * sh;
	vec3 R = reflect(-V, N);
	c += uSunCol * spec * (0.6 + 0.4 * fres);
	c += skyReflect(R) * fres * gloss * 0.55 * ao;
	// kenar ışığı: siluet sıcak ışıkla parlar
	float rim = pow(1.0 - ndv, 3.0) * rimK;
	c += uSunCol * rim * (0.25 + 0.75 * sh) * 0.35 * ao;
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
	return mix(c, mix(uFogCol, uFogSun, s), clamp(f, 0.0, 1.0));
}
`;

export const FINISH = /* glsl */ `
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
vec4 finish(vec3 c, float a) {
	c = tonemap(c * uGrade.z);
	c = pow(c, vec3(1.0 / 2.2));
	c = c * uGain + uLift * (1.0 - c);
	float l = dot(c, vec3(0.299, 0.587, 0.114));
	c = mix(vec3(l), c, uGrade.x);
	c = (c - 0.5) * uGrade.y + 0.5;
	vec2 q = gl_FragCoord.xy / uRes.xy - 0.5;
	q.x *= uRes.x / uRes.y * 0.8;
	float vg = smoothstep(0.3, 0.95, length(q));
	c *= mix(vec3(1.0), uVigCol, uRes.z * vg);
	c += (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * uGrade.w;
	return vec4(clamp(c, 0.0, 1.0), a);
}
`;
