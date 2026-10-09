// Ortak GLSL parçaları.
//
// Görüntü tek geçişte biter: ışık, gölge, sis, ton eşleme, renk düzenleme, vinyet ve titreşim
// (dithering) her malzemenin kendi fragment shader'ında yapılır. Ekrana sonradan ikinci bir
// "film efekti" geçişi uygulanmaz; mobil kartların en zayıf olduğu bellek trafiği böylece
// en aza iner ve çoklu örneklemeli kenar yumuşatma (MSAA) neredeyse bedava kalır.

export const COMMON = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;   // güneşe doğru birim vektör
uniform vec3 uSunCol;   // doğrusal renk (şiddet dahil)
uniform vec3 uSkyTop;   // gök ortam ışığı (yukarıdan)
uniform vec3 uSkyHor;   // ufuk
uniform vec3 uGround;   // yerden sekme ışığı
uniform vec3 uShadeTint;// gölgedeki serin ton
uniform vec3 uFogCol;
uniform vec3 uFogSun;   // güneşe bakarken sisin rengi
uniform vec4 uFogP;     // x yoğunluk, y yükseklik referansı, z yükseklik azalımı, w güneş halesi üssü
uniform vec3 uRes;      // genişlik, yükseklik, vinyet gücü
uniform vec3 uLift;
uniform vec3 uGain;
uniform vec4 uGrade;    // x doygunluk, y kontrast, z pozlama, w titreşim gücü
uniform vec4 uWind;     // xy yön, z sürekli güç, w ani rüzgâr
uniform float uDanger;  // Zifir yanarken ekran kenarı sıcak parlar

float hash12(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}

// Rüzgâr: JS tarafındaki windSway() ile aynı formül; oynanış gölge testi görüntüyle birebir uyuşur.
vec3 windSway(vec3 anchor, float amount) {
	float ph = dot(anchor.xz, vec2(0.071, 0.053)) + anchor.y * 0.037;
	float base = sin(uTime * 1.3 + ph * 6.2831) * 0.6 + sin(uTime * 2.7 + ph * 11.0) * 0.4;
	float gust = uWind.w * (0.65 + 0.35 * sin(uTime * 5.1 + ph * 17.0));
	float k = (uWind.z * base + gust) * amount;
	return vec3(uWind.x * k, sin(uTime * 2.1 + ph * 9.0) * 0.18 * amount * (uWind.z + uWind.w), uWind.y * k);
}
`;

export const SHADOW = /* glsl */ `
#ifndef SHADOW_TAPS
#define SHADOW_TAPS 1
#endif
uniform sampler2DShadow uShadowMap;
uniform mat4 uShadowMat;
uniform vec4 uShadowP; // x 1/çözünürlük, y normal kaydırma, z derinlik payı, w kapsama
// Harita dışındaki uzak yerler için gövdenin analitik gölgesi (dikey konik silindir).
float trunkShadow(vec3 p) {
	vec2 L = uSunDir.xz;
	float t = -dot(p.xz, L) / max(dot(L, L), 1e-4);
	if (t <= 0.0) return 1.0;
	float y = p.y + uSunDir.y * t;
	if (y > 53.5) return 1.0;
	float yy = clamp(y, 0.0, 52.0);
	float R = 3.05 + 0.95 * (1.0 - yy / 52.0) + 1.9 * exp(-max(y, 0.0) / 2.3);
	return smoothstep(R - 0.25, R + 0.35, length(p.xz + L * t));
}
float shadowAt(vec3 wp, vec3 n) {
	vec4 sc = uShadowMat * vec4(wp + n * uShadowP.y, 1.0);
	vec3 p = sc.xyz;
	vec2 e = abs(p.xy - 0.5);
	if (max(e.x, e.y) > 0.497 || p.z > 1.0) return trunkShadow(wp);
	p.z -= uShadowP.z;
#if SHADOW_TAPS > 1
	float o = uShadowP.x * 1.35;
	float s = texture(uShadowMap, vec3(p.xy + vec2(-o, -0.35 * o), p.z));
	s += texture(uShadowMap, vec3(p.xy + vec2(0.35 * o, -o), p.z));
	s += texture(uShadowMap, vec3(p.xy + vec2(o, 0.35 * o), p.z));
	s += texture(uShadowMap, vec3(p.xy + vec2(-0.35 * o, o), p.z));
	return s * 0.25;
#else
	return texture(uShadowMap, p);
#endif
}
`;

export const LIGHT = /* glsl */ `
// Stilize ışık: yumuşak geçişli güneş, yarı küre gök ışığı, serin gölge tonu,
// kontra ışıkta kenar parlaması. Hepsi birkaç çarpma; doku okuması yok.
vec3 skyAmbient(vec3 N) {
	float up = N.y * 0.5 + 0.5;
	vec3 a = mix(uGround, uSkyHor, smoothstep(0.0, 0.55, up));
	return mix(a, uSkyTop, smoothstep(0.5, 1.0, up));
}

vec3 shadeLit(vec3 albedo, vec3 N, vec3 V, float ao, float sh, float wrapK, float rimK) {
	float ndl = dot(N, uSunDir);
	float diff = clamp((ndl + wrapK) / (1.0 + wrapK), 0.0, 1.0);
	diff = diff * diff * (3.0 - 2.0 * diff);
	float lit = diff * sh;
	vec3 amb = skyAmbient(N) * ao;
	// Gölgede kalan yüzey serin-mor ton alır (oyunun okunur kalması için ışık sıcak, gölge serin).
	vec3 shadeCol = mix(uShadeTint, vec3(1.0), lit);
	vec3 c = albedo * (amb * shadeCol + uSunCol * lit);
	// Kontra ışık: güneş nesnenin arkasındayken siluet kenarı altın renkte yanar.
	float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
	float back = clamp(dot(-V, uSunDir) * 0.6 + 0.4, 0.0, 1.0);
	c += uSunCol * fres * back * rimK * (0.25 + 0.75 * sh) * ao;
	return c;
}

vec3 applyFog(vec3 c, vec3 wp) {
	vec3 d = wp - cameraPosition;
	float dist = length(d);
	vec3 v = d / max(dist, 1e-3);
	float hk = exp(-max(wp.y - uFogP.y, -40.0) * uFogP.z);
	float f = 1.0 - exp(-dist * uFogP.x * (0.25 + hk));
	float s = pow(max(dot(v, uSunDir), 0.0), uFogP.w);
	return mix(c, mix(uFogCol, uFogSun, s), clamp(f, 0.0, 1.0));
}
`;

export const FINISH = /* glsl */ `
vec3 acesFit(vec3 x) {
	return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
// Ton eşleme + renk düzenleme + vinyet + titreşim. Her malzemenin son satırı.
vec4 finish(vec3 c, float a) {
	c = acesFit(c * uGrade.z);
	c = pow(c, vec3(1.0 / 2.2));
	c = c * uGain + uLift * (1.0 - c);
	float l = dot(c, vec3(0.299, 0.587, 0.114));
	c = mix(vec3(l), c, uGrade.x);
	c = (c - 0.5) * uGrade.y + 0.5;
	vec2 q = gl_FragCoord.xy / uRes.xy - 0.5;
	q.x *= uRes.x / uRes.y * 0.75;
	float vg = smoothstep(0.25, 0.95, length(q));
	c *= 1.0 - uRes.z * vg;
	c += vec3(1.0, 0.38, 0.1) * uDanger * vg * 0.6;
	c += (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * uGrade.w;
	return vec4(clamp(c, 0.0, 1.0), a);
}
`;
