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
uniform vec4 uShadeFx;  // gölge büyüsü: x yıldız, y mürekkep parıltısı, z gölge sınırı ışıması, w bantlı ışık
uniform vec3 uTermCol;  // gölge sınırındaki sıcak hat
uniform vec3 uInkCol;   // gölgedeki yıldızların rengi
uniform vec3 uVigCol;   // vinyet tonu (ekran uzayında çarpan)
uniform vec4 uAtmo;     // x karesel sis, y en çok sis, z ufuk parlaması, w ışık tarafı sıcaklığı

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
	// dört örnek arası yumuşak ama net bir kenar: gölge çizgisi oyunun kendisi
	return smoothstep(0.08, 0.92, s * 0.25);
#else
	return texture(uShadowMap, p);
#endif
}
`;

export const LIGHT = /* glsl */ `
// Stilize ışık: iki bantlı yumuşak rampa, yarı küre gök ışığı, doygun serin gölge,
// gölge sınırında sıcak ince hat, kontra ışıkta kenar parlaması ve gölgede yaşayan gece.
// Hepsi birkaç çarpma; doku okuması yok.
vec3 skyAmbient(vec3 N) {
	float up = N.y * 0.5 + 0.5;
	vec3 a = mix(uGround, uSkyHor, smoothstep(0.0, 0.55, up));
	return mix(a, uSkyTop, smoothstep(0.5, 1.0, up));
}

// Gölgede yaşayan gece: Tün Ana'nın dağılmış yıldızları. Bakış yönüne bağlı (sonsuzdaki gök
// gibi), bu yüzden gölge bir pencere gibi gece göğünü gösterir. Ekranda ~7 css pikselde bir hücre.
vec3 nightInShade(vec3 V, float fres, float k) {
	vec3 d = -V;
	float K = 61.0 * max(uRes.y / max(uRes.x, 1.0), 1.0);
	vec2 q = vec2(atan(d.z, d.x) * K, d.y * K * 1.05);
	vec2 i = floor(q);
	vec2 f = fract(q) - 0.5;
	float h = hash12(i);
	vec2 o = vec2(fract(h * 37.1), fract(h * 91.7)) - 0.5;
	float r = length(f - o * 0.6);
	float star = smoothstep(0.24, 0.05, r) * step(0.9, h);
	float tw = 0.5 + 0.5 * sin(uTime * (1.4 + h * 4.0) + h * 91.0);
	star *= tw * tw * (0.45 + 0.55 * fract(h * 13.7));
	vec3 c = uInkCol * star * uShadeFx.x * 1.6;
	// ince mürekkep parıltısı: gölgedeki kenarlar Zifir'inki gibi mor-mavi ışır
	c += uInkCol * vec3(0.55, 0.5, 1.0) * fres * uShadeFx.y * 0.45;
	return c * k;
}

vec3 shadeLit(vec3 albedo, vec3 N, vec3 V, float ao, float sh, float wrapK, float rimK) {
	float ndl = dot(N, uSunDir);
	float w = clamp((ndl + wrapK) / (1.0 + wrapK), 0.0, 1.0);
	// iki bantlı rampa: grafik, net ama sert değil
	float soft = w * w * (3.0 - 2.0 * w);
	float band = smoothstep(0.03, 0.2, w) * 0.66 + smoothstep(0.45, 0.68, w) * 0.34;
	float diff = mix(soft, band, uShadeFx.w);
	float lit = diff * sh;
	vec3 amb = skyAmbient(N) * ao;
	// gölge: doygun, serin, temiz (bulanık mor değil)
	vec3 shadeCol = mix(uShadeTint, vec3(1.0), lit);
	vec3 c = albedo * (amb * shadeCol + uSunCol * lit);
	// gölge sınırı: aydınlık tarafta ince, sıcak, ışıyan hat (oyunun asıl çizgisi)
	float e = sh * (1.0 - sh) * 4.0;
	float t = diff * (1.0 - diff) * 4.0;
	vec3 glowAlb = albedo * 0.6 + 0.4;
	c += uTermCol * glowAlb * (e * e * diff + t * t * sh * 0.22) * uShadeFx.z;
	// kontra ışık: güneş nesnenin arkasındayken siluet kenarı ışık renginde yanar
	float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
	float back = clamp(dot(-V, uSunDir) * 0.6 + 0.4, 0.0, 1.0);
	c += uSunCol * fres * back * rimK * (0.25 + 0.75 * sh) * ao;
	// gece gölgede yaşar
	float shade = smoothstep(0.35, 0.9, 1.0 - lit);
	c += nightInShade(V, fres, shade * min(ao, 1.0));
	return c;
}

// Atmosfer: yakın plan net kalsın diye karesel sis, aşağıda bulut denizine doğru koyulaşır,
// güneşe doğru sıcak, karşı tarafta göğün rengi. k: uzaklık çarpanı (uzak adalar için büyük).
vec3 applyFogK(vec3 c, vec3 wp, float k) {
	vec3 d = wp - cameraPosition;
	float dist = length(d);
	vec3 v = d / max(dist, 1e-3);
	float hk = exp(-max(wp.y - uFogP.y, -40.0) * uFogP.z);
	float x = dist * uAtmo.x * (0.55 + 0.6 * hk) * k;
	float f = (1.0 - exp(-x * x)) * uAtmo.y;
	float s = pow(max(dot(v, uSunDir), 0.0), uFogP.w);
	return mix(c, mix(uFogCol, uFogSun, s), clamp(f, 0.0, 1.0));
}
vec3 applyFog(vec3 c, vec3 wp) {
	return applyFogK(c, wp, 1.0);
}
`;

export const FINISH = /* glsl */ `
vec3 acesFit(vec3 x) {
	return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
// Ton eşleme: orta tonlarda rengi koruyan (en parlak kanala göre) eğri ile kanal kanal ACES
// karışımı. Işık doygun ve sıcak kalır, yalnızca çok parlak yerler (güneş, parıltı) beyaza yanar.
vec3 tonemap(vec3 c) {
	float m = max(max(c.r, c.g), c.b);
	float mt = clamp((m * (2.51 * m + 0.03)) / (m * (2.43 * m + 0.59) + 0.14), 0.0, 1.0);
	vec3 hp = c * (mt / max(m, 1e-4));
	return mix(acesFit(c), hp, 0.62 * (1.0 - smoothstep(1.4, 7.0, m)));
}
// Ton eşleme + renk düzenleme + vinyet + titreşim. Her malzemenin son satırı.
vec4 finish(vec3 c, float a) {
	c = tonemap(c * uGrade.z);
	c = pow(c, vec3(1.0 / 2.2));
	c = c * uGain + uLift * (1.0 - c);
	float l = dot(c, vec3(0.299, 0.587, 0.114));
	c = mix(vec3(l), c, uGrade.x);
	c = (c - 0.5) * uGrade.y + 0.5;
	vec2 q = gl_FragCoord.xy / uRes.xy - 0.5;
	q.x *= uRes.x / uRes.y * 0.75;
	float vg = smoothstep(0.25, 0.95, length(q));
	// vinyet siyaha değil mevsimin derin tonuna çeker
	c *= mix(vec3(1.0), uVigCol, uRes.z * vg);
	c += vec3(1.0, 0.38, 0.1) * uDanger * vg * 0.6;
	c += (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * uGrade.w;
	return vec4(clamp(c, 0.0, 1.0), a);
}
`;
