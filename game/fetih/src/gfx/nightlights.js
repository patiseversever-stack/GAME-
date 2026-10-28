// Gece ışıkları: gece odağında haritayı "büyülü gece manzarası"na çeviren bütün ışık noktaları.
// Tek örneklenmiş (instanced) dörtgen sistemi, tek çizim çağrısı, toplamalı karışım. Bütün konumlar
// açılışta bir kez hesaplanır; hareket ve parlaklık köşe shader'ında (kare başına CPU işi yalnızca
// dört kale konumu). Gündüz (uNight.x = 0) hiç çizilmez.
//
// Türler (iB.x):
//   0 pencere   : şehir ve köylerde yanan sıcak pencereler (nüfusla yoğunlaşır; büyük şehirde yüzlerce)
//   1 ışık tozu : ateş böceği gibi süzülen altın parçacıklar; seçilebilir (aydınlık) illerin üstünde
//                 yoğun, diğerlerinde çok seyrek
//   2 hale      : şehir ve ünlü yapıların çevresinde sıcak ışık halesi (q=0'da bloom yerine)
//   3 kale      : kalelerin meşale halesi (kale konumu uniform'dan)
//   4 bulut     : bulutların arasından sızan sıcak ışık (bulutla birlikte rüzgârda kayar)
//
// Pencere ve tozun ekrandaki boyu piksel olarak sınırlıdır (her yakınlıkta nokta gibi keskin).
// Dörtgen kameraya doğru çekilir: arazinin içine gömülüp kesilmez.

import * as THREE from 'three';
import { COMMON, PROV } from './shaderlib.js';
import { rng } from '../core/math.js';

// 2023 nüfusu (bin kişi), plakaya göre: şehir ışığının yoğunluğu ve yayılması
const POP = [
	0, 2270, 610, 750, 510, 340, 5800, 2700, 170, 1160, 1260, 230, 285, 360, 320, 275, 3200, 560, 200, 520, 1060, 1800, 415, 590, 240, 750, 900, 2150, 450,
	145, 275, 1680, 445, 1920, 15600, 4480, 275, 390, 1440, 370, 245, 2100, 2300, 580, 740, 1470, 1110, 870, 1050, 400, 310, 365, 770, 345, 1100, 1370, 330,
	220, 640, 1140, 600, 820, 90, 2170, 375, 1130, 420, 590, 435, 85, 260, 280, 630, 560, 200, 92, 205, 300, 250, 155, 560, 400,
];

const VS = /* glsl */ `
${COMMON}
${PROV}
attribute vec2 corner;
attribute vec4 iA; // x, y (zemin), z, boy (dünya birimi, yarıçap)
attribute vec4 iB; // tür, il (kale türünde kale sırası), evre, ton/güç
uniform float uPLift, uPSel, uDpr;
uniform vec4 uCastle[4];
varying vec2 vUv;
varying vec3 vCol;
varying float vKind;
void main() {
	float kind = iB.x;
	float ph = iB.z;
	float t = uTime;
	vec3 p = iA.xyz;
	float a = uNight.x;
	float px0 = 0.0;
	float px1 = 0.0;
	float pull = 0.0;
	vec3 col;
	if (kind < 2.5) {
		vec4 fx = provRow(iB.y, 3);
		float sel = fx.z;
		float dim = fx.w;
		p.y += fx.x * uPLift + fx.z * uPSel;
		if (kind < 0.5) {
			// pencere: hafif titrek, gündüz ışığındaki (aydınlık) ilde söner
			a *= (0.78 + 0.22 * sin(t * (0.8 + ph * 2.0) + ph * 40.0)) * (1.0 - sel * 0.9) * (1.0 - dim * 0.3);
			col = mix(vec3(1.0, 0.5, 0.16), vec3(1.0, 0.8, 0.46), iB.w) * 1.5;
			px0 = 2.0;
			px1 = 4.2;
			pull = 0.06;
		} else if (kind < 1.5) {
			// ışık tozu: süzülür, ağır ağır yükselir, nabız gibi yanıp söner
			float rise = fract(t * 0.07 + ph * 3.7);
			p.x += sin(t * 0.37 + ph * 6.28) * 0.3 + sin(t * 0.93 + ph * 17.0) * 0.07;
			p.z += cos(t * 0.29 + ph * 9.1) * 0.3 + sin(t * 0.71 + ph * 5.0) * 0.06;
			p.y += rise * 0.9 + sin(t * 0.53 + ph * 4.0) * 0.1;
			float pulse = 0.3 + 0.7 * pow(0.5 + 0.5 * sin(t * (1.4 + ph * 2.1) + ph * 30.0), 2.0);
			a *= mix(0.05, 1.0, sel) * pulse * sin(3.14159 * rise) * (1.0 - dim * 0.85);
			col = mix(vec3(1.0, 0.62, 0.2), vec3(1.0, 0.88, 0.55), iB.w) * 2.4;
			px0 = 3.4;
			px1 = 9.0;
		} else {
			// şehir / yapı halesi
			a *= iB.w * (1.0 - sel * 0.75) * (1.0 - dim * 0.4) * (0.9 + 0.1 * sin(t * 1.3 + ph * 9.0));
			col = vec3(1.0, 0.52, 0.2) * 0.42;
			p.y += 0.25;
			pull = iA.w * 0.8;
		}
	} else if (kind < 3.5) {
		vec4 cs = uCastle[int(iB.y + 0.5)];
		p = cs.xyz + vec3(0.0, 0.9, 0.0);
		a *= cs.w * iB.w * (0.85 + 0.15 * sin(t * 5.0 + ph * 3.0) * sin(t * 3.1));
		col = vec3(1.0, 0.55, 0.2) * 0.55;
		pull = iA.w * 0.7;
	} else {
		// bulutun altından ve aralarından sızan sıcak ışık (clouds.js ile aynı rüzgâr)
		float x = mod(iA.x + t * 0.35 + 80.0, 160.0) - 80.0;
		p = vec3(x, iA.y, iA.z);
		float dc = distance(cameraPosition, p);
		a *= iB.w * smoothstep(5.0, 14.0, dc) * smoothstep(80.0, 68.0, abs(x)) * (0.75 + 0.25 * sin(t * 0.4 + ph * 6.0));
		col = vec3(1.0, 0.6, 0.26) * 0.5;
	}
	vKind = kind;
	vUv = corner;
	vCol = col * a;
	if (a < 0.004) {
		gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // görünmez: kırpılır, piksel işi yok
		return;
	}
	p += normalize(cameraPosition - p) * pull;
	vec4 c = projectionMatrix * viewMatrix * vec4(p, 1.0);
	float ppu = uRes.y * projectionMatrix[1][1] * 0.5 / max(c.w, 1e-3);
	float h = iA.w * ppu;
	if (px1 > 0.0) h = clamp(h, px0 * uDpr, px1 * uDpr);
	c.xy += corner * h / uRes.xy * 2.0 * c.w;
	gl_Position = c;
}`;

const FS = /* glsl */ `
varying vec2 vUv;
varying vec3 vCol;
varying float vKind;
void main() {
	float r2 = dot(vUv, vUv);
	if (r2 > 1.0) discard;
	float a;
	if (vKind < 0.5) a = exp(-r2 * 9.0) * 1.3 + exp(-r2 * 2.5) * 0.12;
	else if (vKind < 1.5) a = exp(-r2 * 16.0) * 1.6 + exp(-r2 * 3.0) * 0.3;
	else {
		float k = 1.0 - r2;
		a = k * k * (0.35 + 0.65 * exp(-r2 * 3.0));
	}
	gl_FragColor = vec4(vCol * a, 0.0);
}`;

export class NightLights {
	/**
	 * @param G ortak uniform'lar
	 * @param tier kalite kademesi (q=0'da yarı yoğunluk)
	 * @param board harita (il örnekleme, yükseklik, durum dokusu)
	 * @param opts { landmarks: [{x,y,z,index}], castles: Castle[], clouds: Clouds }
	 */
	constructor(G, tier, board, { landmarks = [], castles = [], clouds = null } = {}) {
		this.G = G;
		this.board = board;
		this.castles = castles;
		const R = rng(4242);
		const lo = tier.id === 0;
		const A = [];
		const B = [];
		const add = (x, y, z, s, kind, pid, tone) => {
			A.push(x, y, z, s);
			B.push(kind, pid, R(), tone);
		};
		const relief = board.relief;
		const water = (x, z) => relief.bil(relief.La, x, -z) > 0.05;
		const dens = lo ? 0.55 : tier.id === 1 ? 0.8 : 1;
		const counts = [0, 0, 0, 0, 0];

		for (const p of board.provinces) {
			const pop = POP[p.id] || 300;
			const k = Math.sqrt(pop / 1000);
			// şehir: il merkezinin çevresinde yoğun, dışa doğru seyrelen pencereler
			const nCity = Math.round((6 + 9 * Math.sqrt(pop / 100)) * dens);
			const sig = 0.18 + 0.36 * k;
			let made = 0;
			for (let t = 0; t < nCity * 4 && made < nCity; t++) {
				// gauss benzeri dağılım (iki tekdüze toplamı), merkezde boşluk: kale ve il adı yeri
				const r = sig * Math.sqrt(-2 * Math.log(1 - R() * 0.999)) * 0.85;
				const a = R() * Math.PI * 2;
				const x = p.x + Math.cos(a) * r;
				const z = p.z + Math.sin(a) * r * 0.85;
				if (board.pick(x, z) !== p.index || water(x, z)) continue;
				add(x, board.heightAt(x, z) + 0.03, z, 0.05 + R() * 0.03, 0, p.index, R());
				made++;
			}
			counts[0] += made;
			// köyler: il geneline serpilmiş küçük ışık kümeleri (1–3 pencere)
			const nV = Math.round(p.area * 0.3 * dens);
			for (let v = 0; v < nV; v++) {
				const s = board.sample(p.index, R, 0.2);
				if (!s) continue;
				const m = 1 + Math.floor(R() * 3);
				for (let j = 0; j < m; j++) {
					const x = s[0] + (R() - 0.5) * 0.22;
					const z = s[1] + (R() - 0.5) * 0.22;
					if (board.pick(x, z) !== p.index || water(x, z)) continue;
					add(x, board.heightAt(x, z) + 0.03, z, 0.04 + R() * 0.02, 0, p.index, R() * 0.6);
					counts[0]++;
				}
			}
			// ışık tozu: her ilde aynı sayıda (seçilebilir her il kendi bulutunu taşısın)
			const nF = lo ? 9 : tier.id === 1 ? 13 : 16;
			for (let f = 0; f < nF; f++) {
				const s = board.sample(p.index, R, 0.25) || [p.x, p.z];
				add(s[0], board.heightAt(s[0], s[1]) + 0.15 + R() * 0.55, s[1], 0.07 + R() * 0.05, 1, p.index, R());
				counts[1]++;
			}
			// şehir halesi
			add(p.x, board.heightAt(p.x, p.z) + 0.1, p.z, 0.55 + 0.75 * k, 2, p.index, Math.min(0.85, 0.3 + 0.35 * k));
			counts[2]++;
		}
		// ünlü yapılar: sıcak hale + birkaç pencere
		for (const s of landmarks) {
			if (s.index == null) continue;
			add(s.x, s.y + 0.2, s.z, 0.85, 2, s.index, 0.55);
			counts[2]++;
		}
		// kaleler
		for (let i = 0; i < Math.min(4, castles.length); i++) {
			add(0, 0, 0, 2.6, 3, i, 0.7);
			counts[3]++;
		}
		// bulut arası ışık: her bulutun altında ve yanında
		if (clouds?.P) {
			const P = clouds.P;
			for (let i = 0; i < clouds.count; i++) {
				const s = P[i * 4 + 3];
				add(P[i * 4] + (R() - 0.5) * 1.5 * s, P[i * 4 + 1] - 0.6 * s, P[i * 4 + 2] + 0.9 * s, 3.2 * s + 1.2, 4, 0, 0.75);
				counts[4]++;
			}
		}
		this.counts = counts;
		const n = A.length / 4;
		this.count = n;
		const g = new THREE.InstancedBufferGeometry();
		g.setAttribute('corner', new THREE.Float32BufferAttribute([-1, -1, 1, -1, 1, 1, -1, 1], 2));
		g.setIndex([0, 1, 2, 0, 2, 3]);
		g.setAttribute('iA', new THREE.InstancedBufferAttribute(new Float32Array(A), 4));
		g.setAttribute('iB', new THREE.InstancedBufferAttribute(new Float32Array(B), 4));
		g.instanceCount = n;
		this.castleU = [0, 1, 2, 3].map(() => new THREE.Vector4(0, -50, 0, 0));
		this.uniforms = {
			...G,
			uState: { value: board.stateTex },
			uSelOn: board.uSelOn,
			uPLift: { value: board.liftUnit },
			uPSel: { value: board.selLiftUnit },
			uDpr: { value: 1 },
			uCastle: { value: this.castleU },
		};
		this.mat = new THREE.ShaderMaterial({
			vertexShader: VS,
			fragmentShader: FS,
			uniforms: this.uniforms,
			transparent: true,
			depthWrite: false,
			depthTest: true,
			blending: THREE.CustomBlending,
			blendSrc: THREE.OneFactor,
			blendDst: THREE.OneFactor,
			blendSrcAlpha: THREE.ZeroFactor,
			blendDstAlpha: THREE.OneFactor,
		});
		this.mesh = new THREE.Mesh(g, this.mat);
		this.mesh.frustumCulled = false;
		this.mesh.renderOrder = 12; // bulutlardan sonra: bulut aralarından sızan ışık bulutun üstüne biner
		this.mesh.onBeforeRender = (renderer) => {
			this.uniforms.uDpr.value = renderer.getPixelRatio();
		};
		this.triangles = n * 2;
	}

	/** Kare başına: kale konumları ve görünürlük (gündüz hiç çizilmez). */
	update() {
		const night = this.G.uNight.value.x;
		this.mesh.visible = night > 0.002 || this.warm;
		for (let i = 0; i < this.castleU.length; i++) {
			const k = this.castles[i];
			const u = this.castleU[i];
			if (k && k.group.visible) {
				const p = k.group.position;
				u.set(p.x, p.y, p.z, 1);
			} else u.w = 0;
		}
	}
}
