// GÖLGE OYUNU (deneme): Karagöz perdesi. Arkadan fenerle aydınlatılmış kumaş bir perdeye bir yapının yalnız gölgesi
// düşer; fener yapının çevresinde ağır ağır döner, gölge değişir ve şekil netleşir. Oyuncu dört şıktan yapıyı seçer:
// ne kadar erken bilirse o kadar iyi (düelloda ikisi de bilirse hızlı olan kazanır). Cevapta perde iki yana aralanır,
// fener yanar, maketin kendisi altın ışıkta görünür ve kamera perdeden içeri süzülür. Shadowmatic hissi.
//
// Veri: model: kahraman maket yapıcısının adı (map/hero_index.js HEROES: 'anitkabir'…), a: [doğru, y1, y2, y3],
//       isteğe bağlı box: gölge düşüren parçanın yerel kutusu [[x0, y0, z0], [x1, y1, z1]] (vars. yapının tamamı;
//       avlu zemini, döşeme ve çim hiç gölge düşürmez), c: dönme merkezi (yerel), path: ışık yolu (bkz. lightAt)
// Değer: şık indeksi. Tür 'exact' (bildi/bilemedi; eşitlikte süre). Jokerler: 50/50 ve seyirci (şıklı tip).
//
// Sahne: soru boyunca maç sahnesi çizilmez; app.render bu kartın "gölge tiyatrosu"nu çizer (örnek özelliği olarak
// takılır, kart kapanınca silinir: sınıfın kendi render'ı geri gelir). Harita, kamera ve oyun durumu hiç değişmez.
//   perde    tek düzlem: sıcak, arkadan aydınlatılmış kumaş (atkı/çözgü iplikleri, hafif kırışık, kenarda kırmızı
//            mürekkeple Karagöz perdesi bordürü), fenerin sıcak odağı ve titremesi; gölge maskesi 5 dokunuşla süzülür.
//   gölge    maketin kendi geometrisi (gerçek kahraman maket; haritadaki ile aynı yapıcı) perde düzlemine fenerden
//            izdüşürülür (köşe shader'ında tek bölme): küçük bir maske hedefine (perde boyu, ≤512 px) 4 örnek fener
//            noktası tek çizimde (örneklemeli çizim) yazılır, her biri bir renk kanalına (MAX karışım: üst üste binen
//            üçgenler koyulaşmaz). Perde dört kanalın ortalamasıyla yumuşak yarı gölge alır (fener alevi küçük bir alan
//            ışığıdır). Tam ekran ek geçiş yok; maske yalnız perde kapalıyken çizilir.
//   ışık     "fener döner": ışığın maketin çerçevesindeki yönü soru saatine bağlı bir yoldan gider (lightAt): başta
//            tepeden ve yandan (plan gibi, tanınmaz), sona doğru alçak ve karşıdan (cephe silueti). Gölge perdenin
//            ortasında kalsın diye bu dönüş, fener sabitken maketin ters yönde dönmesiyle uygulanır (perdede aynı
//            görüntü). İki oyuncu aynı anda aynı gölgeyi görür.
//   cevap    perde ortadan ayrılıp iki yana toplanır (kıvrımlarıyla), fener alevi ve hale görünür, sıcak altın ön ışık
//            açılır, maket döner tablası üstünde dikilir, havada toz zerreleri; kamera perdeden içeri yaklaşır.
// Maket ilk kullanımda kare kare kurulur (≈10 ms dilimler), ortam örtmesi ardından pişer; soru kapanınca bütün
// geometri, malzeme ve hedef bırakılır. Kare başına bellek ayırma yok (bütün ara değerler önceden ayrılmış).
// Ses: oyunun ses motoru (fener çıtırtısı, uzaktan yumuşak def, açılışta ve cevapta ney); zarflar yumuşak.

import * as THREE from 'three';
import { css, shuffle, pCorrect, mountChoice } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, onClose, onOpen, sfx, LOOK, DENEME_CSS } from './d_ortak.js';
import { clock, setTimeout, clearTimeout, setInterval, clearInterval } from '../core/clock.js';
import { HKit, H } from '../map/heroes.js';
import { HEROES } from '../map/hero_index.js';
import { ney } from '../audio/voices.js';
import { degHz } from '../audio/scales.js';

// ---------------------------------------------------------------- tiyatronun ölçüleri (sahne birimi)

const CW = 1.72; // perde genişliği
const CH = 1.5; // perde yüksekliği
const FR = 0.13; // çerçeve kalınlığı
const MZ = -0.62; // maketin dönme merkezinin perdeye uzaklığı (perdenin arkası)
const LR = 3.2; // fenerin dönme merkezine uzaklığı
const LAMP = 0.035; // alevin yarıçapı (yarı gölgenin genişliği)
const FOV = 40;
const MS = 1.2; // maketin ölçeği (gölge perdenin üçte ikisini kaplasın)
const LY = 0.06; // fenerin yüksekliği
/** Sahne ölçüleri (sınama gölgeyi bunlarla yeniden çizer). */
export const STAGE = { CW, CH, MZ, LR, MS, LY };

/** Işık yolu: soru filminin payı u (0..1) → maketin çerçevesinde fenerin yönü { az, el } (radyan). */
export function lightAt(u, path = null, out = { az: 0, el: 0 }) {
	const K = path || PATH;
	const x = Math.min(1, Math.max(0, u));
	let i = 0;
	while (i < K.length - 2 && x > K[i + 1][0]) i++;
	const a = K[Math.max(0, i - 1)];
	const b = K[i];
	const c = K[i + 1];
	const d = K[Math.min(K.length - 1, i + 2)];
	const s = Math.min(1, Math.max(0, (x - b[0]) / Math.max(1e-6, c[0] - b[0])));
	// Catmull-Rom: hız kesintisiz (fener hiç durmaz, yalnız yavaşlar ve hızlanır)
	const cr = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s + (-p0 + 3 * p1 - 3 * p2 + p3) * s * s * s);
	out.az = cr(a[1], b[1], c[1], d[1]);
	out.el = Math.max(0, cr(a[2], b[2], c[2], d[2]));
	return out;
}
/**
 * Varsayılan ışık yolu [film payı, az, el]: tepeden ve yandan (plan gibi bir kütle), yan cepheye iner, üç çeyrek
 * alçak açıdan sütunlar birbirine karışır, sonda tam karşıdan: sütun aralıklarından ışık geçer.
 */
export const PATH = [
	[0, 0.82, 0.95],
	[0.3, 1.3, 0.62],
	[0.58, 0.62, 0.24],
	[0.8, 0.06, 0.05],
	[1, 0.0, 0.035],
];

/** Perde düzlemine (z = 0) izdüşüm: fener L'den geçen ışın dünya noktasını w'ye taşır. out.x/out.y. */
export function project(L, w, out) {
	const t = -L.z / Math.max(1e-4, w.z - L.z);
	out.x = L.x + (w.x - L.x) * t;
	out.y = L.y + (w.y - L.y) * t;
	return out;
}

/** Maketin dönüşü: maket yerelinden sahneye (fener (0, ly, MZ − LR) noktasında sabit). */
export function modelMatrix(az, el, c, m = new THREE.Matrix4()) {
	const rx = _m1.makeRotationX(-el);
	const ry = _m2.makeRotationY(az);
	m.makeTranslation(0, el * 0.06, MZ).multiply(rx).multiply(ry).multiply(_m4.makeScale(MS, MS, MS)).multiply(_m3.makeTranslation(-c[0], -c[1], -c[2]));
	return m;
}
const _m1 = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _m3 = new THREE.Matrix4();
const _m4 = new THREE.Matrix4();

// ---------------------------------------------------------------- maket (kahraman yapıcısı, sahne başında)

/** Kahraman maketi düz zeminde, sahne başında kurar (üreteç; yapıcı `yield` ettikçe dilimlenir). Dönen: geometri. */
export function* buildModel(kind, low = false) {
	const k = new HKit();
	k.seg = low ? 0.75 : 1;
	k.hi = true;
	k.hf = () => 0;
	k.site = { x: 0, y: 0, z: 0, s: 1, ry: 0 };
	k.tone = { r: 0.42, g: 0.4, b: 0.3 };
	k.inv = 1;
	k.tagAt = () => 0;
	k.setTag(0);
	k.base(0, 1);
	let s = 1;
	for (const ch of kind) s = (s * 31 + ch.charCodeAt(0)) % 2147483647;
	const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
	k.push().move(0, 0, 0);
	const it = HEROES[kind](k, R);
	if (it && typeof it.next === 'function') while (!it.next().done) yield;
	k.pop();
	return k.buildHero(true);
}

/** Gölge düşüren parça mı (köşe): avlu halkası (grup 200), döşeme, zemin ve çim düşürmez. Sınama ve shader aynı. */
export const NO_SHADOW = [H.PAVE, H.GROUND, H.GRASS, H.DIRT];

// ---------------------------------------------------------------- shader'lar

const NOISE = /* glsl */ `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
vec3 finish(vec3 c){ c = 1.0 - exp(-c * 1.25); return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
`;

const KEEP = /* glsl */ `
uniform vec3 uB0;
uniform vec3 uB1;
float keepOf(vec4 col, vec4 info){
	float g = floor(col.a * 255.0 + 0.5);
	float m = info.x;
	bool no = g > 199.5 ${NO_SHADOW.map((id) => `|| abs(m - ${id}.0) < 0.5`).join(' ')};
	return no ? 0.0 : 1.0;
}
bool outBox(vec3 p){ return any(lessThan(p, uB0)) || any(greaterThan(p, uB1)); }
uniform vec3 uC0;
uniform vec3 uC1;
bool inCut(vec3 p){ return all(greaterThan(p, uC0)) && all(lessThan(p, uC1)); }
`;

// gölge maskesi: 4 fener örneği, örnek başına bir kanal
const SH_VS = /* glsl */ `
attribute vec4 col;
attribute vec4 info;
uniform mat4 uModel;
uniform vec3 uL[4];
uniform vec4 uRect; // perde: merkez x, y, yarı genişlik, yarı yükseklik
${KEEP}
varying vec3 vL;
varying float vK;
flat varying int vCh;
void main(){
	vL = position;
	vK = keepOf(col, info);
	vCh = gl_InstanceID;
	vec3 L = uL[gl_InstanceID];
	vec3 w = (uModel * vec4(position, 1.0)).xyz;
	float t = -L.z / max(w.z - L.z, 1e-4);
	vec2 s = L.xy + (w.xy - L.xy) * t;
	gl_Position = vec4((s - uRect.xy) / uRect.zw, 0.0, 1.0);
}`;
const SH_FS = /* glsl */ `
${KEEP}
varying vec3 vL;
varying float vK;
flat varying int vCh;
void main(){
	if (vK < 0.5 || outBox(vL) || inCut(vL)) discard;
	vec4 o = vec4(0.0);
	if (vCh == 0) o.r = 1.0; else if (vCh == 1) o.g = 1.0; else if (vCh == 2) o.b = 1.0; else o.a = 1.0;
	gl_FragColor = o;
}`;

// ortak ışık: fenerin perdedeki aydınlığı (sahne konumunda)
const LAMP_GL = /* glsl */ `
uniform vec3 uLamp;
uniform float uI;    // fener (titreme dahil)
uniform float uKey;  // cevapta altın ön ışık 0..1
uniform float uFade; // sahnenin belirişi 0..1
uniform float uTime;
float lampAt(vec2 p){
	float d0 = max(0.2, -uLamp.z);
	vec2 r = p - uLamp.xy;
	float r2 = dot(r, r);
	float k = d0 * d0 / (d0 * d0 + r2);
	return uI * k * sqrt(k) * (0.3 + 0.7 * exp(-r2 * 2.4));
}
`;

const PLANE_VS = /* glsl */ `
varying vec2 vUv;
varying vec3 vW;
void main(){
	vUv = uv;
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

// perde: arkadan aydınlatılmış kumaş
const CLOTH_FS = /* glsl */ `
${NOISE}
${LAMP_GL}
uniform sampler2D uMask;
uniform vec2 uTx;   // maske dokusu: 1 / boy
uniform float uOpen; // 0 kapalı, 1 aralanmış
uniform float uShK;  // gölgenin gücü
varying vec2 vUv;
varying vec3 vW;
const vec2 SZ = vec2(${CW.toFixed(3)}, ${CH.toFixed(3)});
void main(){
	vec2 uv = vUv;
	// perde ortadan ayrılır: her yarı kendi kenarına toplanır (kumaş koordinatı gerilir, kıvrımlar sıklaşır)
	bool left = uv.x < 0.5;
	float xh = left ? uv.x : 1.0 - uv.x;
	float e = 0.5 * (1.0 - 0.86 * uOpen);
	if (xh > e) discard;
	float src = xh * 0.5 / e;
	vec2 cu = vec2(left ? src : 1.0 - src, uv.y);
	vec2 p = cu * SZ;
	// atkı ve çözgü: kalın-ince iplik (slub) bantları; ince dokuma uzakta söner (titreşim yok)
	float fw = fwidth(p.x * 260.0);
	float fade = clamp(1.6 - fw, 0.0, 1.0);
	float warp = vn(vec2(p.x * 260.0, p.y * 2.0)) - 0.5;
	float weft = vn(vec2(p.y * 240.0, p.x * 2.5)) - 0.5;
	float grid = sin(p.x * 1600.0) * sin(p.y * 1500.0);
	float weave = 1.0 + (warp * 0.16 + weft * 0.13) * (0.4 + 0.6 * fade) + grid * 0.05 * clamp(1.0 - fwidth(p.x * 1600.0) * 0.6, 0.0, 1.0);
	// kumaşın kendi dokusu: lekeler, hafif kırışıklar (gergin perde)
	float blot = vn(p * 3.1) * 0.6 + vn(p * 9.7) * 0.4;
	float wr = sin(p.x * 6.0 + sin(p.y * 2.2) * 1.4) * 0.03 + sin(p.y * 11.0 + p.x * 3.0) * 0.012;
	float t = (0.93 + 0.1 * blot + wr) * weave;
	// toplanan kıvrımlar (açılırken)
	float folds = 0.5 + 0.5 * cos(src * 6.2832 * 7.0);
	t *= 1.0 - uOpen * (0.62 * folds * folds) ;
	// kenar: çerçevenin gölgesi
	float de = min(min(cu.x, 1.0 - cu.x) * SZ.x, min(cu.y, 1.0 - cu.y) * SZ.y);
	t *= 0.55 + 0.45 * smoothstep(0.0, 0.07, de);
	// Karagöz perdesi bordürü: iki ince çizgi ve aralarında baklava zinciri (kırmızı mürekkep; ışık içinden geçer)
	bool horiz = min(cu.y, 1.0 - cu.y) * SZ.y < min(cu.x, 1.0 - cu.x) * SZ.x;
	float along = horiz ? p.x : p.y;
	float aa = fwidth(de) * 1.2 + 1e-4;
	float ink = 0.0;
	ink = max(ink, 1.0 - smoothstep(0.0025, 0.0025 + aa, abs(de - 0.042)));
	ink = max(ink, 1.0 - smoothstep(0.0018, 0.0018 + aa, abs(de - 0.112)));
	float cc = (de - 0.077) / 0.026;
	float dz = abs(fract(along / 0.07) - 0.5) * 2.0 * 0.07 / 0.052 + abs(cc);
	ink = max(ink, (1.0 - smoothstep(0.08, 0.08 + aa * 30.0, abs(dz - 0.82))) * step(abs(cc), 1.2));
	ink = max(ink, (1.0 - smoothstep(0.1, 0.1 + aa * 30.0, dz)) * 0.8 * step(abs(cc), 1.2));
	// köşelerde rumi yelpaze
	vec2 q = vec2(min(cu.x, 1.0 - cu.x) * SZ.x, min(cu.y, 1.0 - cu.y) * SZ.y) - 0.042;
	float rq = length(q);
	float fan = (1.0 - smoothstep(0.0, aa * 2.0, abs(rq - 0.16))) + (1.0 - smoothstep(0.0, aa * 2.0, abs(rq - 0.135))) * 0.7;
	float pet = step(rq, 0.13) * step(0.07, rq) * (1.0 - smoothstep(0.25, 0.25 + aa * 40.0, abs(fract(atan(q.y, q.x) / 1.5708 * 5.0) - 0.5)));
	ink = max(ink, (fan + pet * 0.55) * step(0.0, min(q.x, q.y)));
	vec3 inkC = mix(vec3(1.0), vec3(0.62, 0.14, 0.06), clamp(ink, 0.0, 1.0) * 0.72);
	// gölge: dört kanalın ortalaması, küçük süzgeç
	vec2 su = uv;
	vec4 m = texture2D(uMask, su) * 0.36 + (texture2D(uMask, su + vec2(uTx.x, 0.0)) + texture2D(uMask, su - vec2(uTx.x, 0.0)) + texture2D(uMask, su + vec2(0.0, uTx.y)) + texture2D(uMask, su - vec2(0.0, uTx.y))) * 0.16;
	float s = dot(m, vec4(0.25)) * uShK;
	float L = lampAt(vW.xy);
	vec3 base = vec3(1.0, 0.57, 0.24) * 1.1;
	vec3 c = base * t * L * inkC;
	// gölge koyu ama kara değil (odadaki saçılma), yarı gölgede sıcak, doygun bir kenar
	c = mix(c, vec3(0.03, 0.011, 0.005) * t * (0.4 + L * 0.4), s * 0.95);
	c *= mix(vec3(1.0), vec3(1.35, 0.78, 0.45), 4.0 * s * (1.0 - s) * 0.55);
	// cevapta önden vuran altın ışık kumaşın ön yüzünde
	c += vec3(0.9, 0.6, 0.3) * t * uKey * 0.18 * (1.0 - 0.5 * folds * uOpen);
	gl_FragColor = vec4(finish(c * uFade), 1.0);
}`;

// perdenin çevresindeki duvar: koyu, perdenin ışığından sıcak bir hale; silik kalem işi yıldızlar
const WALL_FS = /* glsl */ `
${NOISE}
${LAMP_GL}
varying vec2 vUv;
varying vec3 vW;
void main(){
	vec2 p = vW.xy;
	vec2 d = max(abs(p) - vec2(${(CW / 2).toFixed(3)}, ${(CH / 2).toFixed(3)}), 0.0);
	float r2 = dot(d, d);
	float glow = uI * 0.5 / (1.0 + r2 * 9.0) + uI * 0.12 / (1.0 + r2 * 1.5);
	// kalem işi: sekiz kollu yıldız ızgarası, çok silik
	vec2 g = fract(p / 0.32) - 0.5;
	float st = max(abs(g.x) + abs(g.y), max(abs(g.x), abs(g.y)) * 1.414);
	float pat = 1.0 - smoothstep(0.0, fwidth(st) * 1.5 + 1e-4, abs(st - 0.3));
	float n = vn(p * 7.0) * 0.5 + vn(p * 23.0) * 0.5;
	vec3 c = vec3(0.07, 0.035, 0.025) * (0.75 + 0.5 * n);
	c = c * glow * (1.0 + pat * 0.18);
	c += vec3(0.05, 0.03, 0.015) * uKey * 0.4;
	gl_FragColor = vec4(finish(c * uFade), 1.0);
}`;

const LIT_VS = /* glsl */ `
varying vec3 vW;
varying vec3 vN;
varying vec3 vO;
void main(){
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * normal);
	vO = position;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

// çerçeve (ceviz, altın filato) ve peşdahta: perdenin ışığı + cevapta altın ön ışık
const WOOD_FS = /* glsl */ `
${NOISE}
${LAMP_GL}
uniform vec3 uCol;
uniform float uGold;
varying vec3 vW;
varying vec3 vN;
varying vec3 vO;
void main(){
	vec3 N = normalize(vN);
	vec3 V = normalize(cameraPosition - vW);
	// perdeden gelen ışık: perdenin en yakın noktası (iç pervaz) ve odaya saçılan ışık (perdenin önünden dolgu)
	vec3 cp = vec3(clamp(vW.x, ${(-CW / 2).toFixed(3)}, ${(CW / 2).toFixed(3)}), clamp(vW.y, ${(-CH / 2).toFixed(3)}, ${(CH / 2).toFixed(3)}), 0.0);
	vec3 Ld = cp - vW;
	float dl = length(Ld) + 0.02;
	float Ec = lampAt(cp.xy) * 1.4 / (1.0 + dl * dl * 220.0) * max(dot(N, Ld / dl), 0.0);
	vec3 F = vec3(0.0, 0.1, 0.9) - vW;
	float fd = length(F);
	vec3 Fn = F / fd;
	float Ef = uI * 0.75 / (1.0 + fd * fd * 0.9);
	float dif = max(dot(N, Fn), 0.0) * 0.85 + 0.15;
	float grain = 0.72 + 0.28 * vn(vec2(vO.x * 5.0 + vO.y * 1.5, vO.y * 70.0 + vn(vO.xy * 8.0) * 5.0));
	vec3 base = uCol * mix(grain, 1.0, uGold);
	vec3 K = normalize(vec3(0.55, 0.65, 0.9));
	float kd = max(dot(N, K), 0.0);
	float shin = mix(28.0, 90.0, uGold);
	float sp = pow(max(dot(N, normalize(K + V)), 0.0), shin) * mix(0.1, 1.6, uGold);
	float spf = pow(max(dot(N, normalize(Fn + V)), 0.0), shin) * mix(0.06, 1.3, uGold);
	vec3 lc = vec3(1.0, 0.62, 0.3);
	vec3 c = base * lc * (Ef * dif * 2.6 + Ec * 3.0) + lc * (Ef * spf + Ec * spf * 2.0);
	c += base * vec3(1.0, 0.75, 0.45) * uKey * (kd * 2.0 + 0.2) + vec3(1.0, 0.8, 0.5) * sp * uKey * 1.5;
	c += base * vec3(0.03, 0.025, 0.04);
	gl_FragColor = vec4(finish(c * uFade), 1.0);
}`;

// maket (cevapta): kahraman maketin köşe rengi ve ortam örtmesi; altın ön ışık, arkadan fener (kenar ışığı)
const MODEL_VS = /* glsl */ `
attribute vec4 col;
attribute vec4 info;
${KEEP}
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying vec3 vL;
varying vec2 vI;
varying float vK;
void main(){
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * normal);
	vec3 c = col.rgb;
	vC = c * c * (c * 0.305306 + 0.682171) + 0.012523 * c;
	vL = position;
	vI = vec2(info.x, info.w / 255.0);
	vK = keepOf(col, info);
	gl_Position = projectionMatrix * viewMatrix * w;
}`;
const MODEL_FS = /* glsl */ `
${NOISE}
${LAMP_GL}
${KEEP}
uniform float uShow;
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying vec3 vL;
varying vec2 vI;
varying float vK;
void main(){
	if (vK < 0.5 || outBox(vL)) discard;
	vec3 N = normalize(vN);
	if (!gl_FrontFacing) N = -N;
	vec3 V = normalize(cameraPosition - vW);
	vec3 K = normalize(vec3(-0.25, 0.72, 0.9)); // altın ön ışık: önden, yukarıdan, kameranın biraz solundan
	vec3 Lp = uLamp - vW;
	float ld = length(Lp);
	vec3 Ln = Lp / ld;
	float ao = mix(0.35, 1.0, vI.y);
	float gold = 1.0 - step(0.5, abs(vI.x - ${H.GOLD}.0));
	float kd = max(dot(N, K), 0.0);
	float rim = pow(1.0 - max(dot(N, V), 0.0), 2.5) * max(dot(N, Ln) * 0.6 + 0.4, 0.0);
	float back = max(dot(N, Ln), 0.0) * uI * 1.1 / (1.0 + ld * ld * 0.15);
	vec3 Hk = normalize(K + V);
	float sp = pow(max(dot(N, Hk), 0.0), mix(30.0, 90.0, gold)) * mix(0.18, 2.2, gold);
	vec3 key = vec3(1.0, 0.7, 0.36) * 1.9;
	vec3 sky = mix(vec3(0.03, 0.028, 0.05), vec3(0.11, 0.075, 0.06), N.y * 0.5 + 0.5);
	vec3 c = vC * (key * kd * uKey + sky * ao * (0.5 + uKey) + vec3(1.0, 0.55, 0.22) * back * 1.4) * ao;
	c += key * sp * uKey * ao + vec3(1.0, 0.62, 0.28) * rim * uI * 0.8;
	gl_FragColor = vec4(finish(c * uShow * uFade), 1.0);
}`;

// sahnenin ardındaki perde (cevapta): fenerin halesi
const BACK_FS = /* glsl */ `
${NOISE}
${LAMP_GL}
varying vec2 vUv;
varying vec3 vW;
void main(){
	vec2 d = vW.xy - uLamp.xy;
	float g = exp(-dot(d, d) * 0.9) * 0.5 + exp(-dot(d, d) * 0.15) * 0.12;
	float n = 0.85 + 0.15 * vn(vW.xy * vec2(14.0, 1.5));
	vec3 c = vec3(0.55, 0.22, 0.07) * g * n * (uI + uKey * 0.6);
	gl_FragColor = vec4(finish(c * uFade), 1.0);
}`;

// alev ve hale (toplamalı billboard)
const FLAME_VS = /* glsl */ `
uniform vec3 uPos;
uniform float uSize;
varying vec2 vQ;
void main(){
	vQ = position.xy;
	vec4 c = viewMatrix * vec4(uPos, 1.0);
	c.xy += position.xy * uSize;
	gl_Position = projectionMatrix * c;
}`;
const FLAME_FS = /* glsl */ `
${NOISE}
uniform float uAmt;
uniform float uTime;
uniform float uCore;
varying vec2 vQ;
void main(){
	vec2 q = vQ;
	float r = length(q);
	float halo = exp(-r * r * 6.0) * 0.55 + exp(-r * 2.6) * 0.25;
	// alev: damla biçimi, titrek
	vec2 f = q * vec2(1.0, 0.55) * 3.2;
	f.x += sin(uTime * 9.0 + q.y * 6.0) * 0.06 * (q.y + 0.4);
	f.y += 0.15;
	float fl = exp(-dot(f, f) * 3.0) * (0.85 + 0.15 * vn(vec2(uTime * 12.0, q.y * 5.0)));
	vec3 c = vec3(1.0, 0.55, 0.2) * halo + vec3(1.0, 0.85, 0.55) * fl * uCore * 2.0;
	gl_FragColor = vec4(c * uAmt, 1.0);
}`;

// toz zerreleri (cevapta ışığın içinde süzülür)
const DUST_VS = /* glsl */ `
attribute vec4 seed;
uniform float uTime;
uniform float uPx;
varying float vA;
void main(){
	vec3 p = position;
	float t = uTime * (0.03 + seed.w * 0.04);
	p += vec3(sin(t * 3.0 + seed.x * 6.28) * 0.08, fract(seed.y + t * 0.6) * 0.9 - 0.45, cos(t * 2.0 + seed.z * 6.28) * 0.08);
	vec4 c = viewMatrix * vec4(p, 1.0);
	gl_Position = projectionMatrix * c;
	gl_PointSize = uPx * (0.6 + seed.w) / max(0.3, -c.z);
	vA = (0.4 + 0.6 * sin(uTime * (1.0 + seed.x) + seed.z * 20.0) * 0.5 + 0.3) * smoothstep(0.0, 0.15, fract(seed.y + t * 0.6)) * (1.0 - smoothstep(0.8, 1.0, fract(seed.y + t * 0.6)));
}`;
const DUST_FS = /* glsl */ `
uniform float uAmt;
varying float vA;
void main(){
	vec2 q = gl_PointCoord - 0.5;
	float a = exp(-dot(q, q) * 18.0) * vA * uAmt;
	gl_FragColor = vec4(vec3(1.0, 0.78, 0.45) * a, 1.0);
}`;

// ---------------------------------------------------------------- tiyatro

const EASE = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const EASE2 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));

/** Çerçeve şekli: dikdörtgen, üstte ogee (kemerli) tepelik; iç boşluk perde boyu. */
function frameShape(w, h, f, crest) {
	const s = new THREE.Shape();
	const X = w / 2 + f;
	const Y0 = -h / 2 - f;
	const Y1 = h / 2 + f;
	s.moveTo(-X, Y0);
	s.lineTo(X, Y0);
	s.lineTo(X, Y1);
	// tepelik: iki yanda S kıvrımı, ortada sivri uç
	const cw = w * 0.34;
	s.lineTo(cw + 0.06, Y1);
	s.bezierCurveTo(cw * 0.55, Y1, cw * 0.45, Y1 + crest * 0.95, 0, Y1 + crest);
	s.bezierCurveTo(-cw * 0.45, Y1 + crest * 0.95, -cw * 0.55, Y1, -cw - 0.06, Y1);
	s.lineTo(-X, Y1);
	s.lineTo(-X, Y0);
	const hole = new THREE.Path();
	hole.moveTo(-w / 2, -h / 2);
	hole.lineTo(-w / 2, h / 2);
	hole.lineTo(w / 2, h / 2);
	hole.lineTo(w / 2, -h / 2);
	hole.lineTo(-w / 2, -h / 2);
	s.holes.push(hole);
	return s;
}

/** Tepelikteki ay-yıldız yerine sade bir rozet: altın halka (perdenin üstünde). */
function makeTheater(tier) {
	const scene = new THREE.Scene();
	const U = {
		uLamp: { value: new THREE.Vector3(0, 0, MZ - LR) },
		uI: { value: 0 },
		uKey: { value: 0 },
		uFade: { value: 0 },
		uTime: { value: 0 },
	};
	const own = []; // bırakılacaklar
	const keep = (x) => (own.push(x), x);
	const mask = keep(new THREE.WebGLRenderTarget(tier === 0 ? 320 : 512, tier === 0 ? 280 : 448, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false }));
	// perde
	const cloth = new THREE.Mesh(
		keep(new THREE.PlaneGeometry(CW, CH)),
		keep(
			new THREE.ShaderMaterial({
				vertexShader: PLANE_VS,
				fragmentShader: CLOTH_FS,
				uniforms: { ...U, uMask: { value: mask.texture }, uTx: { value: new THREE.Vector2(1.0 / mask.width, 1.0 / mask.height) }, uOpen: { value: 0 }, uShK: { value: 1 } },
			}),
		),
	);
	scene.add(cloth);
	// duvar (perdenin çevresi)
	const wall = new THREE.Mesh(keep(new THREE.PlaneGeometry(14, 12)), keep(new THREE.ShaderMaterial({ vertexShader: PLANE_VS, fragmentShader: WALL_FS, uniforms: U })));
	wall.position.z = -0.05;
	// duvar perdenin ardını örtmesin: perde boyunda delik (dört şerit yerine tek düzlem: delik shader'da değil, geometride)
	const wg = new THREE.ShapeGeometry(frameShape(CW, CH, 6, 0));
	wall.geometry.dispose();
	wall.geometry = keep(wg);
	scene.add(wall);
	// çerçeve: ceviz, kabartmalı (yiv), tepelik
	const wood = (col, gold = 0) => keep(new THREE.ShaderMaterial({ vertexShader: LIT_VS, fragmentShader: WOOD_FS, uniforms: { ...U, uCol: { value: new THREE.Color(col) }, uGold: { value: gold } } }));
	const fg = keep(new THREE.ExtrudeGeometry(frameShape(CW, CH, FR, 0.26), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.022, bevelSegments: tier === 0 ? 2 : 3, curveSegments: 18 }));
	const frame = new THREE.Mesh(fg, wood('#3a2416'));
	frame.position.z = -0.02;
	scene.add(frame);
	// altın filato: perdenin hemen çevresinde ince bir çıta
	const gg = keep(new THREE.ExtrudeGeometry(frameShape(CW, CH, 0.022, 0), { depth: 0.01, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2, curveSegments: 4 }));
	const gold = new THREE.Mesh(gg, wood('#c9973c', 1));
	gold.position.z = 0.045;
	scene.add(gold);
	// tepelikte altın rozet
	const rg = keep(new THREE.TorusGeometry(0.055, 0.012, 8, 32));
	const ros = new THREE.Mesh(rg, gold.material);
	ros.position.set(0, CH / 2 + FR + 0.1, 0.06);
	scene.add(ros);
	const rg2 = keep(new THREE.CircleGeometry(0.03, 20));
	const ros2 = new THREE.Mesh(rg2, gold.material);
	ros2.position.set(0, CH / 2 + FR + 0.1, 0.07);
	scene.add(ros2);
	// peşdahta: perdenin altındaki raf
	const ledge = new THREE.Mesh(keep(new THREE.BoxGeometry(CW + FR * 2 + 0.16, 0.06, 0.32)), frame.material);
	ledge.position.set(0, -CH / 2 - FR - 0.03, 0.1);
	scene.add(ledge);
	const lip = new THREE.Mesh(keep(new THREE.BoxGeometry(CW + FR * 2 + 0.18, 0.014, 0.012)), gold.material);
	lip.position.set(0, -CH / 2 - FR - 0.003, 0.262);
	scene.add(lip);
	// sahnenin ardı: maket, döner tabla, fener, toz
	const back = new THREE.Group();
	back.visible = false;
	scene.add(back);
	const pivot = new THREE.Group();
	pivot.matrixAutoUpdate = false;
	back.add(pivot);
	const plinth = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.5, 0.54, 0.07, 48)), wood('#2a1a10'));
	const pring = new THREE.Mesh(keep(new THREE.TorusGeometry(0.5, 0.008, 6, 64)), gold.material);
	pring.rotation.x = Math.PI / 2;
	const flame = new THREE.Mesh(
		keep(new THREE.PlaneGeometry(2, 2)),
		keep(new THREE.ShaderMaterial({ vertexShader: FLAME_VS, fragmentShader: FLAME_FS, uniforms: { uPos: U.uLamp, uSize: { value: 0.32 }, uAmt: { value: 0 }, uTime: U.uTime, uCore: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })),
	);
	flame.frustumCulled = false;
	flame.renderOrder = 5;
	back.add(flame);
	// sahnenin ardı: fenerin çevresinde sıcak bir hale, kenarlara doğru karanlık (yalnız cevapta)
	const bd = new THREE.Mesh(keep(new THREE.PlaneGeometry(9, 6)), keep(new THREE.ShaderMaterial({ vertexShader: PLANE_VS, fragmentShader: BACK_FS, uniforms: U })));
	bd.position.set(0, 0.4, MZ - LR - 0.6);
	back.add(bd);
	const N = tier === 0 ? 50 : 110;
	const dp = new Float32Array(N * 3);
	const ds = new Float32Array(N * 4);
	let sd = 7;
	const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
	for (let i = 0; i < N; i++) {
		dp[i * 3] = (r() - 0.5) * 1.6;
		dp[i * 3 + 1] = (r() - 0.5) * 0.5 + 0.05;
		dp[i * 3 + 2] = MZ - 0.9 + r() * 1.4;
		for (let k = 0; k < 4; k++) ds[i * 4 + k] = r();
	}
	const dg = keep(new THREE.BufferGeometry());
	dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
	dg.setAttribute('seed', new THREE.BufferAttribute(ds, 4));
	const dust = new THREE.Points(dg, keep(new THREE.ShaderMaterial({ vertexShader: DUST_VS, fragmentShader: DUST_FS, uniforms: { uTime: U.uTime, uPx: { value: 6 }, uAmt: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
	dust.frustumCulled = false;
	dust.renderOrder = 6;
	back.add(dust);
	const cam = new THREE.PerspectiveCamera(FOV, 1, 0.05, 40);
	return { scene, U, own, mask, cloth, wall, frame, back, pivot, plinth, pring, flame, dust, cam, wood };
}

// ---------------------------------------------------------------- ses (oyunun ses motoru; yoksa sessiz)

function sesOf(app) {
	const sx = app?.sfx;
	const e = sx?.e;
	const ok = () => !!(e?.ctx && e.ctx.state === 'running' && !sx.muted);
	const U = (d) => degHz('ussak', d);
	const safe = (fn) => {
		try {
			if (ok()) fn(e, e.ctx.currentTime + 0.02);
		} catch {
			/* ses yoksa sessiz */
		}
	};
	return {
		// fener çıtırtısı: kısa, çok kısık, dar bant gürültü kıvılcımları
		crackle(n = 1, vol = 1) {
			safe((e, t) => {
				for (let i = 0; i < n; i++) {
					const tt = t + Math.random() * 0.22;
					e.noise(tt, 0.02 + Math.random() * 0.03, (0.012 + Math.random() * 0.02) * vol, 2600 + Math.random() * 2400, 1500, { q: 1.6, a: 0.003, pan: Math.random() * 0.6 - 0.3 });
				}
			});
		},
		// uzaktan def: düm … tek-tek, kısık (soru boyunca yumuşak bir usul)
		def(k, vol = 1) {
			safe((e, t) => {
				const v = 0.05 * vol;
				e.hit('def', t, v * (k % 2 ? 0.75 : 1), 0.92, -0.25);
				e.hit('tek', t + 0.45, v * 0.45, 1.1, 0.25);
				e.hit('tek', t + 0.68, v * 0.35, 1.12, 0.25);
			});
		},
		// ney: perde aydınlanınca uzun, yumuşak bir nefes (Uşşak)
		open() {
			safe((e, t) => {
				ney(e, t + 0.15, U(4), 2.4, 0.06, { attack: 0.9, release: 1.2, scoop: 30 });
				ney(e, t + 2.3, U(3), 1.6, 0.05, { attack: 0.5, release: 1.4, scoop: 20 });
			});
		},
		// cevap: ney yükselir, perde hışırtısı, çan
		reveal() {
			safe((e, t) => {
				e.noise(t, 1.3, 0.035, 900, 3200, { q: 0.7, a: 0.5 });
				ney(e, t + 0.3, U(2), 0.9, 0.07, { attack: 0.35, release: 0.4, scoop: 40 });
				ney(e, t + 1.05, U(4), 2.4, 0.075, { attack: 0.35, release: 1.6, scoop: 30 });
				e.hit('chime', t + 1.1, 0.12, U(11) / 880, 0.2);
			});
		},
	};
}

// ---------------------------------------------------------------- tip

const CSS = /* css */ `
.dn-gg{display:flex;flex-direction:column;gap:9px}
.dn-gg-top{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#ffe2b8}
.dn-gg-top .sc{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#2a160c;border:2px solid var(--gold);box-shadow:0 0 12px rgba(255,170,70,.45)}
.dn-gg-top .sc svg{width:16px;height:16px}
.dn-gg-bar{flex:1;height:8px;border-radius:6px;background:rgba(255,255,255,.14);overflow:hidden;position:relative}
.dn-gg-bar i{position:absolute;inset:0;border-radius:6px;background:linear-gradient(90deg,#ffd25a,#ff8a3a);transform-origin:0 50%}
.dn-gg-bar i.run{animation:dnShrink var(--t,20s) linear forwards}
.fl-q.locked .dn-gg-bar i{animation-play-state:paused}
.dn-gg-top b{font-family:'Lilita One';font-weight:400;font-size:14px;letter-spacing:.04em;color:var(--gold)}
.dn-gg .fl-opt{min-height:50px}
@keyframes dnShrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}
`;
const LANTERN =
	'<svg viewBox="0 0 24 24" fill="none" stroke="#ffd25a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M12 3v2M8 7h8l1 3-1 8H8l-1-8z"/><path d="M12 15.5c-1.3 0-2-1-2-2 0-1.4 2-3 2-3s2 1.6 2 3c0 1-.7 2-2 2z" fill="#ffb347" stroke="none"/><path d="M7 21h10"/></svg>';

// en son açılan Gölge kartı: eski kartın kapanışı yeni kartın sahnesini bozmasın
let LIVE = 0;
// varsayılan gölge kutusu (yerel): yapının tamamı
const ALL = [[-9, -9, -9], [9, 9, 9]];

/**
 * Kartın bıraktığı boş alan (tuvalin dikey payı, 0 üst): düelloda kart altta (alan: üstteki puan şeridi ile kart
 * arası), herkes-cevaplıyor sahnesinde üstte (alan: kartın altı). out = [y0, y1].
 */
function freeArea(el, app, out) {
	const card = el.closest('.fl-q');
	const cv = app.canvas?.getBoundingClientRect?.();
	if (!card || !cv || !cv.height) {
		out[0] = 0.36;
		out[1] = 1;
		return out;
	}
	const b = card.getBoundingClientRect();
	const H = cv.height;
	if (b.top + b.height / 2 > cv.top + H / 2) {
		const hud = app.ui?.el?.querySelector?.('.fl-hud');
		const hb = hud?.getBoundingClientRect?.();
		const top = hb && hb.height > 0 && hb.bottom < b.top ? hb.bottom + 6 : cv.top;
		out[0] = (top - cv.top) / H;
		out[1] = (b.top - 4 - cv.top) / H;
	} else {
		out[0] = (b.bottom + 6 - cv.top) / H;
		out[1] = 1;
	}
	out[0] = Math.min(0.9, Math.max(0, out[0]));
	out[1] = Math.min(1, Math.max(out[0] + 0.1, out[1]));
	return out;
}

export const golge = {
	time: 24,
	label: 'Gölge Oyunu',
	kind: 'exact',
	prepare(q, R) {
		const order = shuffle([0, 1, 2, 3], R);
		const v = { q, opts: order.map((i) => q.a[i]), right: order.indexOf(0) };
		stamp(v, q, (q2, k, P, text) => {
			for (const a of q2.a) text(a);
			return {
				// perde aydınlanır, gölge birkaç saniye döner: ortalama oyuncu şekli bir süre izler
				wait: 0.5 + 1 + 4,
				look: LOOK.orient + 4 * LOOK.gaze + LOOK.image,
			};
		});
		return v;
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('golge', CSS);
		const app = appOf();
		el.innerHTML = `<div class="dn-gg">
			<div class="dn-gg-top"><span class="sc">${LANTERN}</span><span>Fener dönüyor</span><span class="dn-gg-bar"><i></i></span><b>ERKEN BİL</b></div>
			<div data-r="o"></div>
		</div>`;
		const c = mountChoice(el.querySelector('[data-r=o]'), v, api, { onPick: () => sfx(app, 'tap') });
		const bar = el.querySelector('.dn-gg-bar i');
		const FILM = Math.max(8, Math.min(v.sec || 20, 40) * 0.86);
		bar.style.setProperty('--t', FILM + 's');
		const r = app?.renderer;
		if (!app || !r || !HEROES[v.q.model]) return { lock: c.lock, reveal: (res) => c.reveal(res), destroy() {} };
		const me = ++LIVE;
		const q = v.q;
		const tier = app.tier?.id ?? 1;
		const T = makeTheater(tier);
		const { U, cloth, cam, pivot, back, flame, dust, mask } = T;
		const box = q.box || ALL;
		const c0 = q.c || [0, 0.15, 0];
		const sesA = sesOf(app);
		// gölge ve maket: geometri hazır olunca kurulur
		let geo = null;
		let shadowMesh = null;
		let model = null;
		const shScene = new THREE.Scene();
		const shCam = new THREE.Camera();
		const L4 = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
		const M = new THREE.Matrix4();
		const B0 = new THREE.Vector3(...box[0]);
		const B1 = new THREE.Vector3(...box[1]);
		// gölgeden çıkarılan iç kütle (Anıtkabir'de Şeref Holü'nün iç salonu: sütun aralıklarından ışık geçsin)
		const C0 = new THREE.Vector3(...(q.cut ? q.cut[0] : [1, 1, 1]));
		const C1 = new THREE.Vector3(...(q.cut ? q.cut[1] : [0, 0, 0]));
		const shMat = new THREE.ShaderMaterial({
			vertexShader: SH_VS,
			fragmentShader: SH_FS,
			uniforms: { uModel: { value: M }, uL: { value: L4 }, uRect: { value: new THREE.Vector4(0, 0, CW / 2, CH / 2) }, uB0: { value: B0 }, uB1: { value: B1 }, uC0: { value: C0 }, uC1: { value: C1 } },
			blending: THREE.CustomBlending,
			blendEquation: THREE.MaxEquation,
			blendSrc: THREE.OneFactor,
			blendDst: THREE.OneFactor,
			depthTest: false,
			depthWrite: false,
			side: THREE.DoubleSide,
		});
		T.own.push(shMat);
		const mdMat = new THREE.ShaderMaterial({ vertexShader: MODEL_VS, fragmentShader: MODEL_FS, uniforms: { ...U, uB0: { value: B0 }, uB1: { value: B1 }, uShow: { value: 0 } }, side: THREE.DoubleSide });
		T.own.push(mdMat);
		let job = null;
		let jobT = 0;
		let aoT = 0;
		const ready = (g) => {
			job = null;
			if (LIVE !== me || !el.isConnected) return g.dispose();
			geo = g;
			// gölge: aynı öznitelikler, 4 örnek (fener alevinin 4 noktası) tek çizimde
			const ig = new THREE.InstancedBufferGeometry();
			for (const n of ['position', 'col', 'info']) ig.setAttribute(n, g.getAttribute(n));
			ig.instanceCount = 4;
			T.own.push(ig, g);
			shadowMesh = new THREE.Mesh(ig, shMat);
			shadowMesh.frustumCulled = false;
			shScene.add(shadowMesh);
			model = new THREE.Mesh(g, mdMat);
			model.frustumCulled = false;
			model.matrixAutoUpdate = false;
			pivot.add(model);
			// döner tabla: maketin tabanının altında (gölge kutusunun tabanı)
			const by = Math.max(-0.2, box[0][1]);
			T.plinth.position.set(c0[0], by - 0.035, c0[2]);
			T.pring.position.set(c0[0], by - 0.002, c0[2]);
			pivot.add(T.plinth, T.pring);
			// ortam örtmesi kare kare (≈6 ms dilimler)
			const ao = g.userData.ao;
			if (ao) {
				const pump = () => {
					if (LIVE !== me || !el.isConnected) return;
					const t0 = performance.now();
					while (performance.now() - t0 < 6) {
						if (ao.next().done) {
							g.userData.ao = null;
							g.getAttribute('info').needsUpdate = true;
							return;
						}
					}
					aoT = setTimeout(pump, 0);
				};
				aoT = setTimeout(pump, 0);
			}
		};
		{
			const it = buildModel(q.model, tier === 0);
			job = it;
			const pump = () => {
				if (job !== it) return;
				const t0 = performance.now();
				while (performance.now() - t0 < 10) {
					const s = it.next();
					if (s.done) return ready(s.value);
				}
				jobT = setTimeout(pump, 0);
			};
			jobT = setTimeout(pump, 0);
		}
		const finishJob = () => {
			if (!job) return;
			clearTimeout(jobT);
			const it = job;
			let s;
			while (!(s = it.next()).done);
			ready(s.value);
		};
		// zamanlama: sahne kartla belirir (mount), film kart açılınca başlar (soru saati); cevap anı ayrı
		const tm = clock.now();
		let t0 = 0;
		let tR = 0;
		let tick = 0;
		let lastW = 0;
		let lastH = 0;
		let lastY0 = -1;
		let lastY1 = -1;
		let nextArea = 0;
		const sz = new THREE.Vector2();
		const save = new THREE.Color();
		const camFrom = new THREE.Vector3();
		const camTo = new THREE.Vector3();
		const look = new THREE.Vector3();
		const lookTo = new THREE.Vector3(0, -0.2, MZ); // maket kadrajın üst yarısında (cevap damgası altta kalır)
		const area = [0, 1];
		let dFit = 5;
		let yN = 0;
		let dModel = 2;
		const fit = (tl) => {
			r.getDrawingBufferSize(sz);
			// boş alan (kartın üstünde ya da altında) çeyrek saniyede bir ölçülür (DOM okuması kare başına değil)
			if (tl >= nextArea) {
				nextArea = tl + 0.25;
				freeArea(el, app, area);
			}
			if (sz.x === lastW && sz.y === lastH && Math.abs(area[0] - lastY0) < 0.003 && Math.abs(area[1] - lastY1) < 0.003) return;
			lastW = sz.x;
			lastH = sz.y;
			lastY0 = area[0];
			lastY1 = area[1];
			const asp = sz.x / Math.max(1, sz.y);
			cam.aspect = asp;
			const tf = Math.tan(((FOV / 2) * Math.PI) / 180);
			const a = Math.max(0.18, area[1] - area[0]);
			// cevap kadrajı: döner tabla ve maket boş alanı doldursun
			dModel = Math.max((0.8 * MS) / (asp * tf), (0.46 * MS) / (a * tf), 1.2);
			const hw = CW / 2 + FR + 0.12;
			const hh = (CH + FR * 2 + 0.34) / 2;
			dFit = Math.max(hw / (asp * tf * 0.96), hh / (a * tf * 0.96));
			// kadrajın ortası: boş alanın ortası (perde biraz yukarıda: tepelik ve peşdahta dengesi)
			yN = 1 - 2 * ((area[0] + area[1]) / 2);
		};
		// fener yönü ve sahnenin o anki hali (soru saatine bağlı)
		let az = 0;
		let el0 = 0;
		const LA = { az: 0, el: 0 };
		const state = () => {
			const now = clock.now();
			const tq = t0 ? (now - t0) / 1000 : 0;
			const tl = (now - tm) / 1000;
			const tr = tR ? (now - tR) / 1000 : -1;
			U.uTime.value = tl;
			// fener: yanarken yavaşça açılır, alev titrer (birkaç sinüs: belirlenimci)
			const ign = EASE(tl / 1.4);
			const fl = 1 + 0.05 * Math.sin(tl * 13.1) + 0.035 * Math.sin(tl * 7.3 + 1.2) + 0.025 * Math.sin(tl * 23.7 + 0.4) + 0.02 * Math.sin(tl * 3.1);
			U.uFade.value = EASE(tl / 0.6);
			const open = tr < 0 ? 0 : EASE(tr / 1.7);
			U.uI.value = 1.12 * ign * fl * (1 - open * 0.3);
			U.uKey.value = tr < 0 ? 0 : EASE((tr - 0.35) / 1.6);
			cloth.material.uniforms.uOpen.value = open;
			cloth.material.uniforms.uShK.value = 1 - EASE(tr / 0.9);
			// ışık yolu: film boyunca; cevapta maket dikilir ve döner tablada ağır ağır döner
			if (tr < 0) {
				lightAt(tq / FILM, q.path, LA);
				az = LA.az;
				el0 = LA.el;
			}
			let a = az;
			let e = el0;
			if (tr >= 0) {
				const k = EASE(tr / 2.2);
				a = az + (0.62 - az) * k + Math.max(0, tr - 2.2) * 0.07;
				e = el0 * (1 - k);
			}
			modelMatrix(a, e, c0, M);
			pivot.matrix.copy(M);
			pivot.matrixWorldNeedsUpdate = true;
			if (model) model.material.uniforms.uShow.value = EASE(tr / 1.2);
			// fener noktası: hafif sallanır; 4 örnek alevin çevresinde (yavaş döner)
			const lx = Math.sin(tl * 0.7) * 0.012;
			const ly = LY + Math.sin(tl * 1.3) * 0.006;
			// perdedeki sıcak odak fenerin dönüşünü izler (gölge izdüşümü sabit fenerden: L4)
			U.uLamp.value.set(lx - Math.sin(a) * 0.22, ly + e * 0.16, MZ - LR);
			const ph = tl * 0.9;
			for (let i = 0; i < 4; i++) {
				const an = ph + (i * Math.PI) / 2;
				L4[i].set(lx + Math.cos(an) * LAMP, ly + Math.sin(an) * LAMP * 0.8, MZ - LR);
			}
			// sahnenin ardı: cevapta görünür
			back.visible = tr >= 0;
			flame.material.uniforms.uAmt.value = open;
			dust.material.uniforms.uAmt.value = EASE((tr - 0.6) / 1.5);
			dust.material.uniforms.uPx.value = (sz.y || 800) * 0.012;
			// kamera: perdenin önü; cevapta perdeden içeri, maketin yanına süzülür
			fit(tl);
			camFrom.set(0, 0.02, dFit);
			look.set(0, 0, 0);
			if (tr >= 0) {
				const k = EASE2(tr / 3.6);
				const drift = Math.max(0, tr - 3.6) * 0.05;
				const dd = dModel;
				const ddd = dd * (1 - 0.08 * Math.min(1, drift * 2)); // yerleşince ağır ağır yaklaşmaya devam
				camTo.set(Math.sin(0.5 + drift) * ddd, 0.1 + 0.03 * Math.sin(tr * 0.4), MZ + Math.cos(0.5 + drift) * ddd);
				camFrom.lerp(camTo, k);
				look.lerp(lookTo, k);
			}
			cam.position.copy(camFrom);
			cam.lookAt(look);
			cam.updateProjectionMatrix();
			cam.projectionMatrix.elements[9] = -yN;
			cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
			return tr;
		};
		// app.render yerine: önce gölge maskesi (perde kapalıyken), sonra tiyatro
		const render = () => {
			if (LIVE !== me) return;
			const tr = state();
			r.getClearColor(save);
			const sa = r.getClearAlpha();
			if (shadowMesh && tr < 1) {
				r.setRenderTarget(mask);
				r.setClearColor(0x000000, 0);
				r.clear(true, false, false);
				r.render(shScene, shCam);
			}
			r.setRenderTarget(null);
			r.setClearColor(0x050304, 1);
			r.clear();
			r.render(T.scene, cam);
			r.setClearColor(save, sa);
		};
		// ilk boş maske (geometri hazır olana dek gölgesiz perde)
		{
			const prev = r.getRenderTarget();
			r.setRenderTarget(mask);
			r.getClearColor(save);
			const sa = r.getClearAlpha();
			r.setClearColor(0x000000, 0);
			r.clear(true, false, false);
			r.setClearColor(save, sa);
			r.setRenderTarget(prev);
		}
		app.render = render;
		// haritanın iğne katmanı (il adları, etiketler) tiyatronun üstünde kalmasın
		const pins = app.ui?.$?.pins;
		if (pins) pins.style.visibility = 'hidden';
		let k = 0;
		const stopOpen = onOpen(el, () => {
			finishJob();
			t0 = clock.now();
			bar.classList.add('run');
			sesA.open();
			sesA.crackle(2, 0.7);
			// fener çıtırtısı ve uzak def: soru boyunca, seyrek ve kısık
			tick = setInterval(() => {
				if (!el.isConnected || LIVE !== me) return clearInterval(tick);
				k++;
				if (Math.random() < 0.45) sesA.crackle(1 + (Math.random() < 0.3 ? 1 : 0), tR ? 0.5 : 1);
				if (!tR && k % 10 === 4) sesA.def(k / 10 | 0, Math.min(1, k / 30));
			}, 250);
		});
		const close = onClose(el, () => {
			stopOpen();
			clearInterval(tick);
			clearTimeout(jobT);
			clearTimeout(aoT);
			job = null;
			if (pins && LIVE === me) pins.style.visibility = '';
			if (app.render === render) delete app.render; // sınıfın kendi çizimi geri gelir
			for (const x of T.own) x.dispose?.();
			if (LIVE === me) LIVE++;
		});
		return {
			lock: c.lock,
			reveal(results) {
				c.reveal(results);
				finishJob();
				if (!tR) tR = clock.now();
				bar.classList.remove('run');
				sesA.reveal();
				sesA.crackle(3, 0.8);
			},
			destroy: close,
		};
	},
	/**
	 * Çevrimiçi görünüm: doğru şık gizli. Maketin adı istemciye gitmek zorunda (tipin doğası: gölgeyi istemci
	 * çizer); hile yapan bir istemci adı şıklarla eşleştirebilir: çevrimiçi sürümde maket anlamsız bir kimlikle
	 * gönderilmeli (sunucu kimlik → yapıcı eşlemesini maç başında verir) ya da sunucu gölge maskesini kendisi çizer.
	 */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.right;
		delete o.q.a;
		return o;
	},
	judge(v, value) {
		return { correct: value === v.right, err: value === v.right ? 0 : 1 };
	},
	/** Ortak sınama için doğru ve yanlış örnek. */
	probe(v) {
		return { good: v.right, bad: (v.right + 1) % 4 };
	},
	bot(v, skill, R) {
		const ok = R() < Math.min(0.95, pCorrect(skill, v.q.diff) + 0.05);
		let value = v.right;
		if (!ok) do value = Math.floor(R() * 4); while (value === v.right);
		// bot da gölge biraz netleşince bilir
		return { value, time: botTime(v, R, skill, 0.3, 0.95) };
	},
};
