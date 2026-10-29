// Bölge havası (v0.7): her bölgenin kendi havası; yalnızca görsel, oynanışa dokunmaz.
//
//   Karadeniz     : vadilere ve kıyı ovasına çöken, ağır ağır sürüklenen ince sis; açık denizde sis
//                   kümeleri; serin, nemli yeşil ışık
//   Doğu Anadolu  : rüzgârla savrulan kar tozu (havada süzülen pırıltılı taneler), yaylada ince kırağı,
//                   karda pırıltı; berrak, soğuk ışık
//   Akdeniz       : altın güneş (yalnızca güneşli yüzeyde), kıyıda sıcak pus, turkuaz sığlık ve denizde
//                   güneş pırıltısı
//   ve hafif dokunuşlar: Ege zeytin-altın öğleden sonra, Güneydoğu kehribar, İç Anadolu kuru toz pusu,
//   Marmara'da meltem pusu.
//
// Bölge ağırlıkları açılışta CPU'da bir kez küçük bir dokuya pişirilir (192 × 96, il çokgenleri satır satır
// taranır; deniz ve komşu ülkeler en yakın bölgeyi alır ve kıyıdan uzaklaştıkça söner; sonra yumuşatılır).
// Işık tonu ve sis katmanları bütün malzemelerin applyFog'unda (shaderlib regionWx): ağaç, yapı, kale ve deniz
// aynı havanın içinde, ek çizim yok. Kar taneleri ve Karadeniz kıyı dağlarının yamacındaki sis tutamları (q≥1)
// tek örneklemeli çizim (dörtgenler; hareket köşe shader'ında, kare başına CPU işi yalnızca birkaç uniform).
//
// Okunurluk (kullanıcı: "haritayı çok kaplamasın, görünsün ama yoğun olmasın"): sis en yoğun yerde ~%28 ve
// yamalı, sahip renginde daha hafif; kar seyrek. Gece odağında (seçim, düello, fetih), harita sorusunda
// (hafifler) ve savaş sahnesinin çevresinde (açılır) söner. Uzaktan (bütün ülke) hafif, yaklaştıkça belirgin.

import * as THREE from 'three';
import { COMMON, FINISH } from './shaderlib.js';
import { FIELD_BOX } from '../map/fields.js';
import { rng } from '../core/math.js';

/** Bölge → [sis, kar, sıcak ışık, kuru toz]. */
export const REGION_WX = {
	karadeniz: [1, 0, 0, 0],
	marmara: [0.22, 0, 0, 0],
	dogu: [0, 1, 0, 0],
	akdeniz: [0, 0, 1, 0],
	ege: [0, 0, 0.4, 0],
	guneydogu: [0, 0, 0.55, 0.5],
	icanadolu: [0, 0, 0, 0.75],
};
// kıyıdan denize (ve komşu ülkeye) taşma uzunluğu (birim): sis açık denize uzanır, kar ve toz kıyıda kalır
const SPILL = [8, 3.5, 5, 2];

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** İki geçişli pah uzaklığı (yerinde): dist kaynaklarda 0, başka yerde büyük; lab verilirse etiket de yayılır. */
function chamfer(dist, lab, W, H, cw, ch) {
	const dg = Math.hypot(cw, ch);
	const relax = (k, kn, cost) => {
		if (dist[kn] + cost < dist[k]) {
			dist[k] = dist[kn] + cost;
			if (lab) lab[k] = lab[kn];
		}
	};
	for (let j = 0; j < H; j++)
		for (let i = 0; i < W; i++) {
			const k = j * W + i;
			if (i > 0) relax(k, k - 1, cw);
			if (j > 0) {
				relax(k, k - W, ch);
				if (i > 0) relax(k, k - W - 1, dg);
				if (i < W - 1) relax(k, k - W + 1, dg);
			}
		}
	for (let j = H - 1; j >= 0; j--)
		for (let i = W - 1; i >= 0; i--) {
			const k = j * W + i;
			if (i < W - 1) relax(k, k + 1, cw);
			if (j < H - 1) {
				relax(k, k + W, ch);
				if (i < W - 1) relax(k, k + W + 1, dg);
				if (i > 0) relax(k, k + W - 1, dg);
			}
		}
}

/**
 * Bölge ağırlık alanı: il çokgenleri hücre merkezlerinde satır satır taranır, boş hücreler (deniz, komşu
 * ülke) en yakın bölgeyi alır (iki geçişli pah uzaklığı), ağırlık kıyıdan uzaklaştıkça söner; sis kanalı
 * karada kıyıya yakınlıkla güçlenir (Karadeniz sisi kıyı dağlarına ve vadilerine çöker, iç yayla açık);
 * sonra iki kez kutu süzgeci (bölge geçişleri ~2 birimde yumuşak). Dönen: { texture, at(x, z, kanal) }.
 * coast: kıyı çizgileri (turkiye.json borders, b = 0: [x0, y0, x1, y1, …], y = -z).
 */
export function bakeRegionField(provinces, coast = [], W = 192, H = 96) {
	const B = FIELD_BOX;
	const cw = B.w / W;
	const ch = B.d / H;
	const keys = Object.keys(REGION_WX);
	const reg = new Int8Array(W * H).fill(-1);
	const xs = [];
	for (const p of provinces) {
		const ri = keys.indexOf(p.region);
		if (ri < 0) continue;
		const [, bz0, , bz1] = p.box;
		const j0 = Math.max(0, Math.floor((bz0 - B.z0) / ch - 0.5));
		const j1 = Math.min(H - 1, Math.ceil((bz1 - B.z0) / ch - 0.5));
		for (let j = j0; j <= j1; j++) {
			const y = -(B.z0 + (j + 0.5) * ch);
			xs.length = 0;
			for (const r of p.rings) {
				const n = r.length / 2;
				for (let i = 0, k = n - 1; i < n; k = i++) {
					const yi = r[i * 2 + 1];
					const yk = r[k * 2 + 1];
					if (yi > y !== yk > y) xs.push(r[i * 2] + ((r[k * 2] - r[i * 2]) * (y - yi)) / (yk - yi));
				}
			}
			xs.sort((a, b) => a - b);
			for (let k = 0; k + 1 < xs.length; k += 2) {
				const i0 = Math.max(0, Math.ceil((xs[k] - B.x0) / cw - 0.5));
				const i1 = Math.min(W - 1, Math.floor((xs[k + 1] - B.x0) / cw - 0.5));
				for (let i = i0; i <= i1; i++) reg[j * W + i] = ri;
			}
		}
	}
	// en yakın bölge (etiket uzaklıkla birlikte yayılır)
	const dist = new Float32Array(W * H);
	const src = Int8Array.from(reg);
	for (let k = 0; k < W * H; k++) dist[k] = reg[k] >= 0 ? 0 : 1e9;
	chamfer(dist, src, W, H, cw, ch);
	// kıyıya uzaklık: kıyı çizgileri yarım hücre aralıkla örneklenir
	const dc = new Float32Array(W * H).fill(1e9);
	const cell = (x, z) => {
		const i = Math.floor((x - B.x0) / cw);
		const j = Math.floor((z - B.z0) / ch);
		if (i >= 0 && j >= 0 && i < W && j < H) dc[j * W + i] = 0;
	};
	for (const p of coast)
		for (let i = 0; i + 3 < p.length; i += 2) {
			const n = Math.max(1, Math.ceil(Math.hypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]) / (cw * 0.5)));
			for (let k = 0; k <= n; k++) cell(p[i] + ((p[i + 2] - p[i]) * k) / n, -(p[i + 1] + ((p[i + 3] - p[i + 1]) * k) / n));
		}
	chamfer(dc, null, W, H, cw, ch);
	let F = new Float32Array(W * H * 4);
	for (let k = 0; k < W * H; k++) {
		const s = src[k];
		if (s < 0) continue;
		const wv = REGION_WX[keys[s]];
		for (let c = 0; c < 4; c++) F[k * 4 + c] = wv[c] * smooth(1 - dist[k] / SPILL[c]);
		if (reg[k] >= 0) F[k * 4] *= 0.22 + 0.78 * smooth(1 - dc[k] / 5.5); // sis karada kıyı kuşağında
	}
	// yumuşatma: ayrık kutu süzgeci (yarıçap 2 hücre), iki kez
	let T = new Float32Array(F.length);
	const R = 2;
	const n = 2 * R + 1;
	for (let pass = 0; pass < 2; pass++) {
		for (let j = 0; j < H; j++)
			for (let i = 0; i < W; i++)
				for (let c = 0; c < 4; c++) {
					let s = 0;
					for (let d = -R; d <= R; d++) s += F[(j * W + Math.min(W - 1, Math.max(0, i + d))) * 4 + c];
					T[(j * W + i) * 4 + c] = s / n;
				}
		for (let j = 0; j < H; j++)
			for (let i = 0; i < W; i++)
				for (let c = 0; c < 4; c++) {
					let s = 0;
					for (let d = -R; d <= R; d++) s += T[(Math.min(H - 1, Math.max(0, j + d)) * W + i) * 4 + c];
					F[(j * W + i) * 4 + c] = s / n;
				}
	}
	T = null;
	const data = new Uint8Array(F.length);
	for (let k = 0; k < F.length; k++) data[k] = Math.round(Math.min(1, Math.max(0, F[k])) * 255);
	const texture = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
	texture.magFilter = texture.minFilter = THREE.LinearFilter;
	texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
	texture.generateMipmaps = false;
	texture.colorSpace = THREE.NoColorSpace;
	texture.needsUpdate = true;
	/** CPU örneği (çift doğrusal): açılışta parçacık yerleşimi için. */
	const at = (x, z, c) => {
		const u = Math.min(W - 1, Math.max(0, (x - B.x0) / cw - 0.5));
		const v = Math.min(H - 1, Math.max(0, (z - B.z0) / ch - 0.5));
		const i = Math.min(W - 2, Math.floor(u));
		const j = Math.min(H - 2, Math.floor(v));
		const fx = u - i;
		const fy = v - j;
		const g = (ii, jj) => F[((j + jj) * W + i + ii) * 4 + c];
		return (g(0, 0) * (1 - fx) + g(1, 0) * fx) * (1 - fy) + (g(0, 1) * (1 - fx) + g(1, 1) * fx) * fy;
	};
	const idx = (x, z) => Math.min(H - 1, Math.max(0, Math.floor((z - B.z0) / ch))) * W + Math.min(W - 1, Math.max(0, Math.floor((x - B.x0) / cw)));
	/** Kıyıya uzaklık (birim, hücre çözünürlüğünde) ve kara mı (Türkiye ili). */
	const coastAt = (x, z) => dc[idx(x, z)];
	const land = (x, z) => reg[idx(x, z)] >= 0;
	return { texture, at, coastAt, land, W, H };
}

// ------------------------------------------------------------------ kar tozu ve sis tutamları

const VS = /* glsl */ `
${COMMON}
attribute vec2 corner;
attribute vec4 iA; // x, zemin y, z, boy (dünya birimi, yarıçap)
attribute vec4 iB; // tür (0 kar, 1 sis), evre, ağırlık, hız
uniform float uDpr;
varying vec2 vUv;
varying vec3 vCol;
varying float vA;
varying float vKind;
varying vec2 vSeed;
void main() {
	float t = uTime;
	float ph = iB.y;
	vec3 p = iA.xyz;
	float a = uWx.x * iB.z;
	vUv = corner;
	vKind = iB.x;
	vSeed = vec2(ph * 7.0, ph * 3.0);
	vec4 c;
	if (iB.x > 0.5) {
		// sis tutamı: kıyı boyunca ağır ağır gidip gelir, nefes alır gibi büyüyüp küçülür
		float R = iA.w * (0.88 + 0.12 * sin(t * 0.23 + ph * 17.0));
		p.x += sin(t * iB.w + ph * 6.28) * 1.6;
		p.z += cos(t * iB.w * 0.7 + ph * 9.0) * 0.35;
		a *= (0.8 + 0.2 * sin(t * 0.31 + ph * 11.0)) * wxStage(p.xz);
		// kameranın dibindeki tutam ekranı kaplamasın
		a *= smoothstep(R * 1.5, R * 4.5, distance(cameraPosition, p));
		if (a < 0.004) {
			gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
			vA = 0.0;
			vCol = vec3(0.0);
			return;
		}
		p += normalize(cameraPosition - p) * R * 0.9; // kameraya doğru çekilir: yamaca gömülüp kesilmesin
		c = projectionMatrix * viewMatrix * vec4(p, 1.0);
		float ppu = uRes.y * projectionMatrix[1][1] * 0.5 / max(c.w, 1e-3);
		vec2 hs = vec2(2.1, 1.0) * R * ppu; // yatay uzun sis şeridi
		hs *= min(1.0, uRes.y * 0.4 / hs.y);
		vCol = (uSkyTop * 1.3 + uSunCol * 0.3) * vec3(1.0, 1.0, 0.95) * 1.12;
		vA = a * 0.17; // tek tutam en çok ~%17 örter: harita altında okunur
		c.xy += corner * hs / uRes.xy * 2.0 * c.w;
		gl_Position = c;
		return;
	}
	// kar tozu: ağır ağır düşer, rüzgârla doğu-güneydoğuya savrulur, yolda hafifçe döner (tane tane, kar fırtınası değil)
	float H = 2.2;
	float u = fract(ph * 7.31 + t * iB.w / H); // 0 tepede, 1 yerde
	p.y += 0.05 + (1.0 - u) * H;
	p.xz += vec2(0.86, 0.5) * (u - 0.5) * 1.6;
	p.xz += vec2(sin(t * 0.9 + ph * 40.0), cos(t * 0.7 + ph * 23.0)) * 0.13;
	a *= smoothstep(0.0, 0.18, u) * smoothstep(1.0, 0.82, u);
	a *= wxStage(p.xz);
	// kameraya çok yakın tane ekranı kirletmesin; bütün ülke görünümünde seyrek pırıltı (yakında belirgin)
	float cd = distance(cameraPosition, p);
	a *= smoothstep(3.5, 8.0, cd) * mix(0.5, 1.0, smoothstep(125.0, 45.0, cd));
	if (a < 0.004) {
		gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // görünmez: kırpılır, piksel işi yok
		vA = 0.0;
		vCol = vec3(0.0);
		return;
	}
	c = projectionMatrix * viewMatrix * vec4(p, 1.0);
	float ppu = uRes.y * projectionMatrix[1][1] * 0.5 / max(c.w, 1e-3);
	float h = iA.w * ppu;
	float hc = clamp(h, 2.2 * uDpr, 5.5 * uDpr);
	a *= clamp(h / hc * 1.6, 0.6, 1.0); // uzakta piksel boyuna kırpılan tane biraz söner (kum gibi durmasın)
	// pırıltı: tane arada bir güneşi yakalar
	float gl = pow(max(sin(t * (1.6 + fract(ph * 31.0) * 2.4) + ph * 60.0), 0.0), 18.0);
	vCol = vec3(0.96, 0.98, 1.04) * (uSkyTop * 1.4 + uSunCol * 0.4) * (1.0 + gl * 1.4);
	vA = min(1.0, a * (1.0 + gl * 0.6));
	c.xy += corner * hc / uRes.xy * 2.0 * c.w;
	gl_Position = c;
}`;

const FS = /* glsl */ `
${COMMON}
${FINISH}
varying vec2 vUv;
varying vec3 vCol;
varying float vA;
varying float vKind;
varying vec2 vSeed;
void main() {
	if (vKind > 0.5) {
		// sis: yumuşak, kenarı gürültüyle dağınık tutam; altı biraz gölgeli (hacim)
		vec2 u = vUv;
		float n = texture(uNoise, u * vec2(0.22, 0.14) + vSeed + vec2(uTime * 0.003, 0.0)).a * 0.6 + texture(uNoise, u * vec2(0.5, 0.3) + vSeed.yx + vec2(uTime * 0.006, 0.0)).r * 0.4;
		float m = smoothstep(1.0, 0.15, length(u) + (n - 0.5) * 0.8);
		float a = vA * m * m;
		if (a < 0.002) discard;
		gl_FragColor = finish(vCol * mix(0.9, 1.04, u.y * 0.5 + 0.5), a);
		return;
	}
	float r2 = dot(vUv, vUv);
	if (r2 > 1.0) discard;
	gl_FragColor = finish(vCol, vA * exp(-r2 * 2.6));
}`;

export class Weather {
	/**
	 * @param G ortak uniform'lar (uRegion, uWx… burada doldurulur)
	 * @param tier kalite kademesi (q0: yalnız ışık tonu, sis katmanı ve az kar tanesi; q≥1 sis tutamları)
	 * @param board harita (il çokgenleri, yükseklik)
	 */
	constructor(G, tier, board) {
		this.G = G;
		this.board = board;
		const field = bakeRegionField(board.provinces, board.data.borders.filter((b) => b.b === 0).map((b) => b.pts));
		this.field = field;
		G.uRegion.value = field.texture;
		G.uWxBox.value.set(FIELD_BOX.x0, FIELD_BOX.z0, 1 / FIELD_BOX.w, 1 / FIELD_BOX.d);
		G.uWx.value.set(1, 0, tier.id, 0);
		this.calmTo = 1; // harita sorusunda hafifler
		this.calmK = 1;
		const R = rng(7331);
		const A = [];
		const Bv = [];
		const boxOf = (key, pad) => {
			const b = [Infinity, Infinity, -Infinity, -Infinity];
			for (const p of board.provinces)
				if (p.region === key) {
					b[0] = Math.min(b[0], p.box[0] - pad);
					b[1] = Math.min(b[1], p.box[1] - pad);
					b[2] = Math.max(b[2], p.box[2] + pad);
					b[3] = Math.max(b[3], p.box[3] + pad);
				}
			return b;
		};

		// --- sis tutamları (q≥1): Karadeniz kıyısında, denizde sis kümeleri ve kıyı dağlarının yamacında asılı
		// tutamlar; birbirinden aralıklı (üst üste binip yoğunlaşmasın)
		const nMist = tier.id === 0 ? 0 : tier.id === 1 ? 10 : 16;
		const kb = boxOf('karadeniz', 4);
		const mist = [];
		for (let k = 0; k < 6000 && mist.length < nMist; k++) {
			const x = kb[0] + R() * (kb[2] - kb[0]);
			const z = kb[1] + R() * (kb[3] - kb[1]);
			// yalnız karada: kıyıdan biraz içeride, yamaçta (deniz sisi shader katmanında; üst üste binmesin)
			if (!field.land(x, z) || field.at(x, z, 0) < 0.5) continue;
			const dc = field.coastAt(x, z);
			const gy = board.heightAt(x, z);
			if (dc < 0.9 || dc > 4 || gy < 0.3 || gy > 1.4 || mist.some((m) => Math.hypot(m[0] - x, (m[1] - z) * 1.8) < 4.5)) continue;
			mist.push([x, z]);
			A.push(x, gy + 0.3 + R() * 0.25, z, 1.3 + R() * 0.9);
			Bv.push(1, R(), 0.7 + 0.3 * R(), 0.05 + R() * 0.05);
		}
		this.mistCount = mist.length;

		// --- kar taneleri: Doğu'da (yükseklerde daha sık), ağırlık alanıyla seyrelerek komşu bölgelere taşar
		const want = tier.id === 0 ? 160 : tier.id === 1 ? 600 : 1000;
		const db = boxOf('dogu', 3);
		let snow = 0;
		for (let k = 0; k < want * 40 && snow < want; k++) {
			const x = db[0] + R() * (db[2] - db[0]);
			const z = db[1] + R() * (db[3] - db[1]);
			const g = field.at(x, z, 1);
			if (g < 0.04) continue;
			const y = Math.max(0.03, board.heightAt(x, z));
			const e = (y - 0.05) / 0.00054;
			const w = g * (0.4 + 0.6 * smooth((e - 900) / 1700));
			if (R() > w) continue;
			A.push(x, y, z, 0.06 + R() * 0.04);
			Bv.push(0, R(), 0.55 + 0.45 * R(), 0.1 + R() * 0.09);
			snow++;
		}
		this.snowCount = snow;
		const n = A.length / 4;
		this.count = n;
		const g = new THREE.InstancedBufferGeometry();
		g.setAttribute('corner', new THREE.Float32BufferAttribute([-1, -1, 1, -1, 1, 1, -1, 1], 2));
		g.setIndex([0, 1, 2, 0, 2, 3]);
		g.setAttribute('iA', new THREE.InstancedBufferAttribute(new Float32Array(A), 4));
		g.setAttribute('iB', new THREE.InstancedBufferAttribute(new Float32Array(Bv), 4));
		g.instanceCount = n;
		this.uniforms = { ...G, uDpr: { value: 1 } };
		this.mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: this.uniforms, transparent: true, depthWrite: false, depthTest: true });
		this.mesh = new THREE.Mesh(g, this.mat);
		this.mesh.frustumCulled = false;
		this.mesh.renderOrder = 11; // bulutlardan sonra, gece ışıklarından önce; il adları ve oklar hep üstte
		this.mesh.onBeforeRender = (renderer) => {
			this.uniforms.uDpr.value = renderer.getPixelRatio();
		};
		this.triangles = n * 2;
	}

	/** Harita sorusu ("X nerede?"): hava hafifler, harita net kalır. */
	calm(on) {
		this.calmTo = on ? 0.3 : 1;
	}

	/** Kare başına: güç (gece, harita sorusu), kamera yakınlığı, savaş açıklığı. Nesne üretmez. */
	update(dt, cam) {
		const G = this.G;
		const U = G.uWx.value;
		this.calmK += (this.calmTo - this.calmK) * Math.min(1, dt * 2.5);
		// gece odağında söner (seçilebilir iller ve düello havasız, net); şafakla geri gelir
		U.x = this.calmK * (1 - G.uNight.value.x);
		// yakınlık: bütün ülke görünümünde hafif, bölge ve yakın çekimde tam
		const d = cam ? cam.dist : 90;
		U.y = smooth((115 - d) / 85);
		// savaş sahnesi: ağaçların alçaldığı kapsülün çevresinde hava açılır (açıklık gücüyle büyür)
		const cr = G.uClearR.value;
		if (cr.y > 0.001) {
			G.uWxStage.value.copy(G.uClear.value);
			U.w = (cr.x + 6) * cr.y;
		} else U.w = 0;
		this.mesh.visible = U.x > 0.003 && this.count > 0;
	}
}
