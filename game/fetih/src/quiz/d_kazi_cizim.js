// KAZI KAZAN · resim çizimi: kahraman maketin (map/hero_index.js HEROES, haritadaki yakın çekimle aynı yapıcı) renkli
// "kartpostalı", WebGL'siz, CPU'da. Neden CPU: kartın resmi tek bir durgun karedir; WebGL'in olmadığı ya da yazılımla
// çizildiği ortamda (denetimdeki SwiftShader) da birebir aynı görünür, oyunun tuvaline ve gölge sistemine hiç dokunmaz.
//
//   tarama    z tamponlu üçgen taraması, ertelenmiş gölgelendirme (piksel başına üçgen kimliği + perspektif düzeltmeli
//             ağırlıklar; her piksel bir kez gölgelendirilir), 2×2 örnekleme (kenarlar yumuşak)
//   ışık      güneş (ya da ay) + gölge haritası (ışıktan dik izdüşüm, 3×3 yumuşatma), gök/yer yarı küresi, maketin pişmiş
//             ortam örtmesi (herokit bakeAO), metal/çini/su parıltısı, kenar ışığı; gece pencere ve alev ışığı
//   sahne     sonsuz zemin (kara ya da dalgalı deniz, gök yansımalı), ufukta sis, gökyüzü (degrade, güneş halesi,
//             bulut, yıldız), kenar kararması, ton eşleme
//   işçi      resim ana iş parçacığının dışında çizilir: oyunun kendi yapı işçisinin kodu (heroworker.js, derlemede
//             __HERO_WORKER__, olduğu gibi) maketi kurar ve örtmeyi pişirir, aynı işçide bu çizici tarar (kazıma ve
//             balonlar hiç takılmaz); önce çeyrek boy bir ön izleme gelir, sonra tam resim. İşçi yoksa (sınama, eski tarayıcı) aynı iş ana iş parçacığında üreteçle, ~8 ms'lik
//             dilimlerle akar (zemin bile küçük parçalara bölünür: tek dilim uzun sürmez)
//
// Dışa: TEMA (gündüz, batım, gece), lin, modelKur(kind, düşük) üreteci, ciz(geo, sahne, çıktı) üreteci,
// cizici() (çizicinin kendi kendine yeten fabrikası: işçiye metin olarak gider), kaziIsci(), yedek(ctx, …).

import { HKit } from '../map/heroes.js';
import { HEROES } from '../map/hero_index.js';

/** '#rrggbb' → doğrusal renk. */
export const lin = (hex) => {
	const v = parseInt(String(hex).slice(1), 16);
	const f = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
	return [f(((v >> 16) & 255) / 255), f(((v >> 8) & 255) / 255), f((v & 255) / 255)];
};

/**
 * Temalar (doğrusal renk): key güneş/ay, sky/gnd yarı küre dolgusu, rim kenar ışığı, skyTop/skyHor gök degradesi,
 * sun* hale ve disk, fog ufuk sisi, ground zemin, water deniz, stars, clouds, emit gece ışıkları, expo pozlama.
 */
export const TEMA = {
	gunduz: {
		key: [3.3, 3.0, 2.55], sky: [0.36, 0.5, 0.85], gnd: [0.26, 0.24, 0.16], rim: [0.3, 0.42, 0.7],
		skyTop: [0.05, 0.2, 0.7], skyHor: [0.5, 0.68, 0.94], sunC: [1, 0.88, 0.65], sunGlow: 0.55, sunDisc: 5, sunPow: 40,
		fog: [0.5, 0.68, 0.94], fogD: 0.11, ground: lin('#a8a56a'), clouds: 0.9, cloudC: [1, 1, 1], vig: 0.36, expo: 1.05,
	},
	batim: {
		key: [3.6, 1.85, 0.8], sky: [0.34, 0.24, 0.4], gnd: [0.34, 0.17, 0.09], rim: [1, 0.45, 0.22],
		skyTop: [0.09, 0.07, 0.3], skyHor: [1, 0.42, 0.16], sunC: [1, 0.6, 0.22], sunGlow: 1.6, sunDisc: 9, sunPow: 10,
		fog: [0.95, 0.45, 0.24], fogD: 0.2, ground: lin('#a07e58'), clouds: 0.55, cloudC: [1, 0.55, 0.42], vig: 0.42, expo: 1.18,
	},
	gece: {
		key: [0.75, 0.9, 1.35], sky: [0.07, 0.1, 0.24], gnd: [0.03, 0.03, 0.05], rim: [0.25, 0.38, 0.8],
		skyTop: [0.008, 0.014, 0.06], skyHor: [0.07, 0.11, 0.3], sunC: [0.85, 0.9, 1], sunGlow: 0.3, sunDisc: 7, sunPow: 70,
		fog: [0.07, 0.11, 0.3], fogD: 0.2, ground: lin('#1d4468'), water: true, stars: true, emit: [1.7, 1.05, 0.38], vig: 0.5, expo: 1.45,
	},
};

/**
 * Kahraman maketi düz zeminde kurar (yapıcı yield ettikçe dilimlenir; d_golge.js buildModel ile aynı kurulum). Dönen:
 * geometri (pişmemiş örtme g.userData.ao üretecinde).
 */
export function* modelKur(kind, low = false) {
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
	const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
	k.push().move(0, 0, 0);
	const it = HEROES[kind](k, R);
	if (it && typeof it.next === 'function') while (!it.next().done) yield;
	k.pop();
	return k.buildHero(true);
}

/**
 * Çizici fabrikası: bütün yardımcılar içeride, dışarıdan hiçbir ada dokunmaz (yalnız Math, tipli diziler, performance).
 * Böylece kaziIsci() aynı kodu Function.prototype.toString ile işçiye gönderir; ana iş parçacığı da aynısını kullanır.
 */
export function cizici() {
	const S_LIN = new Float32Array(256);
	for (let i = 0; i < 256; i++) {
		const c = i / 255;
		S_LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	}
	const hash = (x, y) => {
		let h = (x * 374761393 + y * 668265263) | 0;
		h = Math.imul(h ^ (h >>> 13), 1274126177);
		return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
	};
	const vnoise = (x, y) => {
		const xi = Math.floor(x);
		const yi = Math.floor(y);
		const fx = x - xi;
		const fy = y - yi;
		const u = fx * fx * (3 - 2 * fx);
		const v = fy * fy * (3 - 2 * fy);
		const a = hash(xi, yi);
		const b = hash(xi + 1, yi);
		const c = hash(xi, yi + 1);
		const d = hash(xi + 1, yi + 1);
		return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
	};
	const GROUND = 250; // zemin diskinin malzeme kimliği (maketlerde yok)
	const SHINY = new Set([1, 3, 4, 25, 26]); // su, altın, kurşun, metal, sırlı çini
	const GLOW = new Set([2, 6]); // pencere, alev (gece yanar)

	/**
	 * Kartpostalı çiz (üreteç). geo: { pos, nor, col, info } (kahraman öznitelikleri), o: { W, H, ss, yaw, pitch, fov,
	 * fill, box, panX, panY, light: [x, y, z] (yüzeyden ışığa, birim), theme, groundY, slice (ms) }. out.rgba: W×H RGBA.
	 */
	function* ciz(geo, o, out) {
		const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
		const { pos: P0, nor: N0, col: C0, info: I0 } = geo;
		const n0 = P0.length / 3;
		// model kutusu; dış avlu halkası (grup 200) çizilmez: zemini sahnenin kendi düzlemi verir
		let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
		const keepT = new Uint8Array(n0 / 3);
		let kept = 0;
		for (let t = 0; t < n0 / 3; t++) {
			if (C0[t * 12 + 3] > 199) continue;
			keepT[t] = 1;
			kept++;
			for (let j = 0; j < 3; j++) {
				const i = (t * 3 + j) * 3;
				const x = P0[i], y = P0[i + 1], z = P0[i + 2];
				if (x < x0) x0 = x;
				if (x > x1) x1 = x;
				if (y < y0) y0 = y;
				if (y > y1) y1 = y;
				if (z < z0) z0 = z;
				if (z > z1) z1 = z;
			}
		}
		// zemin: kutupsal ızgara (halka × dilim): büyük tek üçgenler yerine küçük parçalar, tarama sık sık dilimlenir
		const RINGS = [0, 0.35, 0.8, 1.5, 2.6, 4.4, 7.5, 13, 22, 40];
		const SEG = 40;
		const gy = o.groundY ?? -0.004;
		const nG = SEG * (1 + (RINGS.length - 2) * 2);
		const nT = kept + nG;
		const n = nT * 3;
		const pos = new Float32Array(n * 3);
		const nor = new Int8Array(n * 4);
		const col = new Uint8Array(n * 4);
		const info = new Uint8Array(n * 4);
		let w = 0;
		for (let t = 0; t < n0 / 3; t++) {
			if (!keepT[t]) continue;
			for (let j = 0; j < 3; j++) {
				const i = t * 3 + j;
				pos[w * 3] = P0[i * 3];
				pos[w * 3 + 1] = P0[i * 3 + 1];
				pos[w * 3 + 2] = P0[i * 3 + 2];
				for (let k = 0; k < 4; k++) {
					nor[w * 4 + k] = N0[i * 4 + k];
					col[w * 4 + k] = C0[i * 4 + k];
					info[w * 4 + k] = I0[i * 4 + k];
				}
				w++;
			}
		}
		const gv = (px, pz) => {
			pos[w * 3] = px;
			pos[w * 3 + 1] = gy;
			pos[w * 3 + 2] = pz;
			nor[w * 4 + 1] = 127;
			info[w * 4] = GROUND;
			info[w * 4 + 3] = 255;
			w++;
		};
		for (let r = 0; r < RINGS.length - 1; r++) {
			const r0 = RINGS[r];
			const r1 = RINGS[r + 1];
			for (let s = 0; s < SEG; s++) {
				const a0 = (s / SEG) * Math.PI * 2;
				const a1 = ((s + 1) / SEG) * Math.PI * 2;
				const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
				if (r === 0) {
					gv(0, 0);
					gv(c1 * r1, s1 * r1);
					gv(c0 * r1, s0 * r1);
				} else {
					gv(c0 * r0, s0 * r0);
					gv(c1 * r1, s1 * r1);
					gv(c0 * r1, s0 * r1);
					gv(c0 * r0, s0 * r0);
					gv(c1 * r0, s1 * r0);
					gv(c1 * r1, s1 * r1);
				}
			}
		}
		const ss = o.ss || 2;
		const W = o.W * ss;
		const H = o.H * ss;
		const box = o.box || [[x0, y0, z0], [x1, y1, z1]];
		const cx = (box[0][0] + box[1][0]) / 2;
		const cy = (box[0][1] + box[1][1]) / 2;
		const cz = (box[0][2] + box[1][2]) / 2;
		// kamera: yaw (dikey eksen çevresinde), pitch (aşağı bakış); kutu kadrajın fill kadarını doldurur
		const yaw = o.yaw || 0;
		const pitch = o.pitch ?? 0.2;
		const fwd = [-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
		const right = [Math.cos(yaw), 0, -Math.sin(yaw)];
		let up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
		if (up[1] < 0) up = [-up[0], -up[1], -up[2]];
		const tf = Math.tan(((o.fov || 30) * Math.PI) / 360);
		const asp = W / H;
		const fill = o.fill || 0.85;
		let dist = 0;
		for (let k = 0; k < 8; k++) {
			const px = box[k & 1][0] - cx;
			const py = box[(k >> 1) & 1][1] - cy;
			const pz = box[(k >> 2) & 1][2] - cz;
			const vx = px * right[0] + py * right[1] + pz * right[2];
			const vy = px * up[0] + py * up[1] + pz * up[2];
			const vz = px * fwd[0] + py * fwd[1] + pz * fwd[2];
			dist = Math.max(dist, Math.abs(vx) / (tf * asp * fill) - vz, Math.abs(vy) / (tf * fill) - vz);
		}
		const cam = [cx - fwd[0] * dist, cy - fwd[1] * dist, cz - fwd[2] * dist];
		// mercek kaydırma: kadraj (ufuk ve maket) ekranda kayar, bakış açısı değişmez
		const fy = H / 2 / tf;
		const ox = W / 2 + (o.panX || 0) * W;
		const oy = H / 2 + (o.panY || 0) * H;
		const sx = new Float32Array(n);
		const sy = new Float32Array(n);
		const iw = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			const px = pos[i * 3] - cam[0];
			const py = pos[i * 3 + 1] - cam[1];
			const pz = pos[i * 3 + 2] - cam[2];
			const vz = Math.max(0.02, px * fwd[0] + py * fwd[1] + pz * fwd[2]);
			iw[i] = 1 / vz;
			sx[i] = ox + ((px * right[0] + py * right[1] + pz * right[2]) / vz) * fy;
			sy[i] = oy - ((px * up[0] + py * up[1] + pz * up[2]) / vz) * fy;
		}
		const th = o.theme; // tema nesnesi (TEMA'dan; işçiye yapısal kopya gider)
		const L = o.light || [0.4, 0.75, 0.5];
		const lh = Math.hypot(L[0], L[2]) || 1;
		const lr = [L[2] / lh, 0, -L[0] / lh];
		const lu = [L[1] * lr[2] - L[2] * lr[1], L[2] * lr[0] - L[0] * lr[2], L[0] * lr[1] - L[1] * lr[0]];
		const SM = o.sm || 640;
		const rad = Math.max(x1 - x0, y1 - y0, z1 - z0) * 0.78 + 0.1;
		const lx = new Float32Array(n);
		const ly = new Float32Array(n);
		const lz = new Float32Array(n);
		const mx = (x0 + x1) / 2;
		const my = (y0 + y1) / 2;
		const mz = (z0 + z1) / 2;
		for (let i = 0; i < n; i++) {
			const px = pos[i * 3] - mx;
			const py = pos[i * 3 + 1] - my;
			const pz = pos[i * 3 + 2] - mz;
			lx[i] = (((px * lr[0] + py * lr[1] + pz * lr[2]) / rad) * 0.5 + 0.5) * SM;
			ly[i] = (((px * lu[0] + py * lu[1] + pz * lu[2]) / rad) * 0.5 + 0.5) * SM;
			lz[i] = px * L[0] + py * L[1] + pz * L[2];
		}
		const slice = o.slice || 8;
		let t0 = now();
		// 1) gölge haritası (yalnız maket gölge düşürür)
		const smap = new Float32Array(SM * SM).fill(-1e9);
		for (let t = 0; t < kept; t++) {
			depth(lx, ly, lz, t * 3, SM, smap);
			if ((t & 15) === 0 && now() - t0 > slice) {
				yield;
				t0 = now();
			}
		}
		// 2) ana tarama: 1/w (büyük = yakın), üçgen kimliği, ağırlıklar
		const zb = new Float32Array(W * H);
		const tid = new Int32Array(W * H).fill(-1);
		const b0 = new Float32Array(W * H);
		const b1 = new Float32Array(W * H);
		for (let t = 0; t < nT; t++) {
			tri(sx, sy, iw, t, W, H, zb, tid, b0, b1);
			if ((t & 15) === 0 && now() - t0 > slice) {
				yield;
				t0 = now();
			}
		}
		// 3) gölgelendirme
		const img = new Float32Array(W * H * 3);
		const key = th.key;
		const sky = th.sky;
		const gnd = th.gnd;
		const fogC = th.fog;
		const gcol = th.ground;
		const water = !!th.water;
		const emit = th.emit;
		const rim = th.rim;
		const fogD = th.fogD;
		const sk = [0, 0, 0];
		for (let y = 0; y < H; y++) {
			for (let x = 0; x < W; x++) {
				const p = y * W + x;
				const t = tid[p];
				const dxs = (x + 0.5 - ox) / fy;
				const dys = -(y + 0.5 - oy) / fy;
				let rx = fwd[0] + right[0] * dxs + up[0] * dys;
				let ry = fwd[1] + right[1] * dxs + up[1] * dys;
				let rz = fwd[2] + right[2] * dxs + up[2] * dys;
				const rl = Math.hypot(rx, ry, rz);
				rx /= rl;
				ry /= rl;
				rz /= rl;
				let r, g, b;
				if (t < 0) {
					skyAt(th, rx, ry, rz, L, sk);
					r = sk[0];
					g = sk[1];
					b = sk[2];
				} else {
					const a1 = b0[p];
					const a2 = b1[p];
					const a0 = 1 - a1 - a2;
					const i0 = t * 3;
					const i1 = i0 + 1;
					const i2 = i0 + 2;
					const mat = info[i0 * 4];
					const wx = pos[i0 * 3] * a0 + pos[i1 * 3] * a1 + pos[i2 * 3] * a2;
					const wy = pos[i0 * 3 + 1] * a0 + pos[i1 * 3 + 1] * a1 + pos[i2 * 3 + 1] * a2;
					const wz = pos[i0 * 3 + 2] * a0 + pos[i1 * 3 + 2] * a1 + pos[i2 * 3 + 2] * a2;
					let vx = cam[0] - wx;
					let vy = cam[1] - wy;
					let vz = cam[2] - wz;
					const vl = Math.hypot(vx, vy, vz) || 1;
					vx /= vl;
					vy /= vl;
					vz /= vl;
					let nx, ny, nz, cr, cg, cb, ao;
					const isG = mat === GROUND;
					if (isG) {
						nx = 0;
						ny = 1;
						nz = 0;
						cr = gcol[0];
						cg = gcol[1];
						cb = gcol[2];
						ao = 1;
						if (water) {
							// dalga: iki ölçekli gürültüden eğim (uzakta söner: titreşim olmasın)
							const fade = 1 / (1 + vl * 0.35);
							const e = 0.03;
							const hN = (u, v) => vnoise(u * 11, v * 7) * 0.6 + vnoise(u * 27 + 5, v * 19) * 0.4;
							const h0 = hN(wx, wz);
							nx = -(hN(wx + e, wz) - h0) * 0.5 * fade;
							nz = -(hN(wx, wz + e) - h0) * 0.5 * fade;
							const l = Math.hypot(nx, 1, nz);
							nx /= l;
							ny = 1 / l;
							nz /= l;
						} else {
							const k = 0.86 + 0.26 * (vnoise(wx * 3.1, wz * 3.1) * 0.55 + vnoise(wx * 13, wz * 13) * 0.45);
							cr *= k;
							cg *= k;
							cb *= k;
						}
					} else {
						nx = (nor[i0 * 4] * a0 + nor[i1 * 4] * a1 + nor[i2 * 4] * a2) / 127;
						ny = (nor[i0 * 4 + 1] * a0 + nor[i1 * 4 + 1] * a1 + nor[i2 * 4 + 1] * a2) / 127;
						nz = (nor[i0 * 4 + 2] * a0 + nor[i1 * 4 + 2] * a1 + nor[i2 * 4 + 2] * a2) / 127;
						const nl = Math.hypot(nx, ny, nz) || 1;
						nx /= nl;
						ny /= nl;
						nz /= nl;
						if (nx * vx + ny * vy + nz * vz < 0) {
							nx = -nx;
							ny = -ny;
							nz = -nz;
						}
						cr = S_LIN[col[i0 * 4]] * a0 + S_LIN[col[i1 * 4]] * a1 + S_LIN[col[i2 * 4]] * a2;
						cg = S_LIN[col[i0 * 4 + 1]] * a0 + S_LIN[col[i1 * 4 + 1]] * a1 + S_LIN[col[i2 * 4 + 1]] * a2;
						cb = S_LIN[col[i0 * 4 + 2]] * a0 + S_LIN[col[i1 * 4 + 2]] * a1 + S_LIN[col[i2 * 4 + 2]] * a2;
						ao = (info[i0 * 4 + 3] * a0 + info[i1 * 4 + 3] * a1 + info[i2 * 4 + 3] * a2) / 255;
					}
					// gölge (3×3 yumuşatma)
					const px = wx - mx;
					const py = wy - my;
					const pz = wz - mz;
					const u = (((px * lr[0] + py * lr[1] + pz * lr[2]) / rad) * 0.5 + 0.5) * SM;
					const v = (((px * lu[0] + py * lu[1] + pz * lu[2]) / rad) * 0.5 + 0.5) * SM;
					const d = px * L[0] + py * L[1] + pz * L[2];
					const ndl0 = nx * L[0] + ny * L[1] + nz * L[2];
					const bias = 0.003 + 0.012 * (1 - Math.abs(ndl0));
					const ui = Math.floor(u);
					const vi = Math.floor(v);
					let sh = 0;
					for (let j = -1; j <= 1; j++)
						for (let i = -1; i <= 1; i++) {
							const uu = ui + i;
							const vv = vi + j;
							if (uu < 0 || vv < 0 || uu >= SM || vv >= SM || smap[vv * SM + uu] <= d + bias) sh++;
						}
					sh /= 9;
					const ndl = ndl0 > 0 ? ndl0 : 0;
					const hem = ny * 0.5 + 0.5;
					let hx = L[0] + vx;
					let hy = L[1] + vy;
					let hz = L[2] + vz;
					const hl = Math.hypot(hx, hy, hz) || 1;
					const ndh = Math.max(0, (nx * hx + ny * hy + nz * hz) / hl);
					const shiny = SHINY.has(mat) || (water && isG);
					const sp = shiny ? Math.pow(ndh, isG ? 110 : 60) * (isG ? 3.2 : 1.3) * sh : Math.pow(ndh, 16) * 0.05 * sh;
					const fres = Math.pow(1 - Math.max(0, nx * vx + ny * vy + nz * vz), 4);
					const lk = ndl * sh;
					const aoK = isG ? 0.92 + 0.08 * sh : 0.22 + 0.78 * ao;
					const ar = sky[0] * hem + gnd[0] * (1 - hem);
					const ag = sky[1] * hem + gnd[1] * (1 - hem);
					const ab = sky[2] * hem + gnd[2] * (1 - hem);
					r = cr * (key[0] * lk + ar * aoK) + key[0] * sp + fres * rim[0] * aoK * (isG ? 0 : 1);
					g = cg * (key[1] * lk + ag * aoK) + key[1] * sp + fres * rim[1] * aoK * (isG ? 0 : 1);
					b = cb * (key[2] * lk + ab * aoK) + key[2] * sp + fres * rim[2] * aoK * (isG ? 0 : 1);
					if (water && isG) {
						// gök yansıması (Fresnel)
						const rdy = ry - 2 * (rx * nx + ry * ny + rz * nz) * ny;
						skyAt(th, rx - 2 * (rx * nx + ry * ny + rz * nz) * nx, Math.abs(rdy), rz - 2 * (rx * nx + ry * ny + rz * nz) * nz, L, sk, true);
						const f = 0.2 + 0.7 * fres;
						r = r * (1 - f) + sk[0] * f;
						g = g * (1 - f) + sk[1] * f;
						b = b * (1 - f) + sk[2] * f;
					}
					if (emit && GLOW.has(mat)) {
						r += emit[0];
						g += emit[1];
						b += emit[2];
					}
					// ufuk sisi (maketin ötesinden başlar)
					const fd = 1 - Math.exp(-Math.max(0, vl - dist * 0.92) * fogD);
					r += (fogC[0] - r) * fd;
					g += (fogC[1] - g) * fd;
					b += (fogC[2] - b) * fd;
				}
				img[p * 3] = r;
				img[p * 3 + 1] = g;
				img[p * 3 + 2] = b;
			}
			if (now() - t0 > slice) {
				yield;
				t0 = now();
			}
		}
		// 4) küçültme (ss × ss), ton eşleme, kenar kararması
		const ow = o.W;
		const oh = o.H;
		const rgba = new Uint8ClampedArray(ow * oh * 4);
		const ex = th.expo || 1.2;
		const vig = th.vig || 0;
		const k2 = 1 / (ss * ss);
		const TM = new Float32Array(1025);
		for (let i = 0; i <= 1024; i++) TM[i] = Math.pow(1 - Math.exp(-((i / 1024) * 6) * ex), 1 / 2.2) * 255;
		const tm = (c) => {
			const f = c <= 0 ? 0 : c >= 6 ? 1024 : (c / 6) * 1024;
			const i = f | 0;
			return TM[i] + (TM[Math.min(1024, i + 1)] - TM[i]) * (f - i);
		};
		for (let y = 0; y < oh; y++) {
			for (let x = 0; x < ow; x++) {
				let r = 0;
				let g = 0;
				let b = 0;
				for (let j = 0; j < ss; j++)
					for (let i = 0; i < ss; i++) {
						const p = ((y * ss + j) * W + x * ss + i) * 3;
						r += tm(img[p]);
						g += tm(img[p + 1]);
						b += tm(img[p + 2]);
					}
				const ux = x / ow - 0.5;
				const uy = y / oh - 0.5;
				const vg = (1 - vig * (ux * ux * 1.1 + uy * uy * 1.5)) * k2;
				const q = (y * ow + x) * 4;
				rgba[q] = r * vg;
				rgba[q + 1] = g * vg;
				rgba[q + 2] = b * vg;
				rgba[q + 3] = 255;
			}
			if ((y & 3) === 0 && now() - t0 > slice) {
				yield;
				t0 = now();
			}
		}
		out.rgba = rgba;
		out.W = ow;
		out.H = oh;
		return out;
	}

	/** Gök: degrade, güneş/ay halesi ve diski, bulut, yıldız. refl: su yansıması (yıldız ve disk sönük). */
	function skyAt(th, rx, ry, rz, L, out, refl = false) {
		const e = ry < -0.2 ? -0.2 : ry;
		const k = Math.sqrt(Math.min(1, Math.max(0, e / 0.55)));
		const top = th.skyTop;
		const hor = th.skyHor;
		let r = hor[0] + (top[0] - hor[0]) * k;
		let g = hor[1] + (top[1] - hor[1]) * k;
		let b = hor[2] + (top[2] - hor[2]) * k;
		const cs = rx * L[0] + ry * L[1] + rz * L[2];
		if (cs > 0) {
			const glow = Math.pow(cs, th.sunPow || 30) * th.sunGlow + (refl ? 0 : Math.pow(cs, 1800) * th.sunDisc);
			r += th.sunC[0] * glow;
			g += th.sunC[1] * glow;
			b += th.sunC[2] * glow;
		}
		if (th.clouds && e > 0) {
			const q = 1 / (e + 0.1);
			const cu = rx * q;
			const cv = rz * q;
			const c = vnoise(cu * 1.5 + 3, cv * 1.5) * 0.6 + vnoise(cu * 4.3, cv * 4.3 + 7) * 0.4;
			const m = Math.max(0, Math.min(1, (c - 0.52) / 0.26)) * Math.min(1, e * 7) * th.clouds;
			r += (th.cloudC[0] - r) * m;
			g += (th.cloudC[1] - g) * m;
			b += (th.cloudC[2] - b) * m;
		}
		if (th.stars && !refl && e > 0.03) {
			const hs = hash(Math.floor((Math.atan2(rx, rz) + 4) * 300), Math.floor(e * 480));
			if (hs > 0.996) {
				const s = ((hs - 0.996) / 0.004) * Math.min(1, e * 5);
				r += s * 0.9;
				g += s * 0.92;
				b += s;
			}
		}
		out[0] = r;
		out[1] = g;
		out[2] = b;
	}

	/** Gölge haritası taraması: en büyük (ışığa en yakın) derinlik. */
	function depth(X, Y, Z, i, S, buf) {
		const ax = X[i], ay = Y[i], bx = X[i + 1], by = Y[i + 1], cx = X[i + 2], cy = Y[i + 2];
		const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
		if (area > -1e-9 && area < 1e-9) return;
		const az = Z[i], bz = Z[i + 1], cz = Z[i + 2];
		const mnx = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
		const mxx = Math.min(S - 1, Math.ceil(Math.max(ax, bx, cx)));
		const mny = Math.max(0, Math.floor(Math.min(ay, by, cy)));
		const mxy = Math.min(S - 1, Math.ceil(Math.max(ay, by, cy)));
		const inv = 1 / area;
		for (let y = mny; y <= mxy; y++) {
			const py = y + 0.5;
			for (let x = mnx; x <= mxx; x++) {
				const px = x + 0.5;
				const w0 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) * inv;
				if (w0 < -1e-6) continue;
				const w1 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) * inv;
				if (w1 < -1e-6) continue;
				const w2 = 1 - w0 - w1;
				if (w2 < -1e-6) continue;
				const z = az * w0 + bz * w1 + cz * w2;
				const p = y * S + x;
				if (z > buf[p]) buf[p] = z;
			}
		}
	}

	/** Ana tarama: z sınaması, üçgen kimliği ve perspektif düzeltmeli ağırlıklar. */
	function tri(X, Y, IW, t, W, H, zb, tid, B0, B1) {
		const i = t * 3;
		const ax = X[i], ay = Y[i], bx = X[i + 1], by = Y[i + 1], cx = X[i + 2], cy = Y[i + 2];
		const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
		if (area > -1e-9 && area < 1e-9) return;
		const aw = IW[i], bw = IW[i + 1], cw = IW[i + 2];
		const mnx = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
		const mxx = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
		const mny = Math.max(0, Math.floor(Math.min(ay, by, cy)));
		const mxy = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
		if (mnx > mxx || mny > mxy) return;
		const inv = 1 / area;
		for (let y = mny; y <= mxy; y++) {
			const py = y + 0.5;
			for (let x = mnx; x <= mxx; x++) {
				const px = x + 0.5;
				const w0 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) * inv;
				if (w0 < -1e-6) continue;
				const w1 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) * inv;
				if (w1 < -1e-6) continue;
				const w2 = 1 - w0 - w1;
				if (w2 < -1e-6) continue;
				const z = aw * w0 + bw * w1 + cw * w2;
				const p = y * W + x;
				if (z <= zb[p]) continue;
				zb[p] = z;
				tid[p] = t;
				B0[p] = (w1 * bw) / z;
				B1[p] = (w2 * cw) / z;
			}
		}
	}

	return { ciz };
}

/** Ana iş parçacığının çizicisi (işçi yokken ve sınamada). */
export const ciz = cizici().ciz;

/**
 * Kazı Kazan işçisi (tek, tembel): oyunun yapı işçisinin kodu + bu çizici. İstek: { hero: yapı işçisi iletisi, opt: çizim
 * seçenekleri (tema nesnesiyle) } → söz: { rgba, W, H } ya da null (işçi yok, yapı kurulamadı, çizim çöktü). Yapı işçisinin
 * kendi yanıtı (postMessage) aynı işçide yakalanır, geometri çiziciye gider; ana iş parçacığına yalnız resim döner.
 */
let KW;
export function kaziIsci() {
	if (KW !== undefined) return KW;
	KW = null;
	try {
		// eslint-disable-next-line no-undef
		const hero = typeof __HERO_WORKER__ !== 'undefined' ? __HERO_WORKER__ : null;
		if (!hero || typeof Worker !== 'function' || typeof Blob !== 'function' || typeof URL === 'undefined') return KW;
		const ek = `;(function(){var H=self.onmessage;var C=(${cizici.toString()})();self.onmessage=function(e){var m=e.data;if(!m||!m.kazi){if(H)H.call(self,e);return;}var g=null;var P=self.postMessage;self.postMessage=function(r){g=r;};try{H.call(self,{data:m.hero});}catch(x){g=null;}finally{self.postMessage=P;}if(!g||!g.ok){P.call(self,{id:m.id,ok:false});return;}var geo={pos:g.pos,nor:g.nor,col:g.col,info:g.info};if(m.pre){try{var o1={};var i1=C.ciz(geo,m.pre,o1);while(!i1.next().done);P.call(self,{id:m.id,ok:true,pre:true,rgba:o1.rgba,W:o1.W,H:o1.H},[o1.rgba.buffer]);}catch(x){}}var out={};try{var it=C.ciz(geo,m.opt,out);while(!it.next().done);}catch(x){P.call(self,{id:m.id,ok:false,err:String(x&&x.message)});return;}P.call(self,{id:m.id,ok:true,rgba:out.rgba,W:out.W,H:out.H},[out.rgba.buffer]);};})();`;
		const w = new Worker(URL.createObjectURL(new Blob([hero, ek], { type: 'text/javascript' })));
		const calls = new Map();
		let id = 0;
		const fail = () => {
			KW = null;
			for (const c of calls.values()) c.res(null);
			calls.clear();
		};
		w.onerror = fail;
		w.onmessage = (e) => {
			const d = e.data || {};
			const c = calls.get(d.id);
			if (!c) return;
			const r = d.ok ? { rgba: d.rgba, W: d.W, H: d.H } : null;
			if (d.pre) return void (r && c.pre?.(r)); // ön izleme: aynı istek sürüyor
			calls.delete(d.id);
			c.res(r);
		};
		KW = {
			/** hero: yapı işçisi iletisi; opt: tam resim; pre (isteğe bağlı): önce çizilen küçük resim, onPre ile gelir. */
			ciz(hero, opt, pre = null, onPre = null) {
				return new Promise((res) => {
					const k = ++id;
					calls.set(k, { res, pre: onPre });
					try {
						w.postMessage({ kazi: true, id: k, hero: { ...hero, id: k }, opt, pre });
					} catch {
						calls.delete(k);
						res(null);
					}
				});
			},
		};
	} catch {
		KW = null;
	}
	return KW;
}

/**
 * Yedek resim (maket kurulamazsa ya da tarama çökerse): temanın göğü, ufuk ve zemin, ortada sisli bir anıt silueti
 * (cevabı ele vermez). Kart hiçbir zaman boş ya da bozuk görünmez.
 */
export function yedek(ctx, W, H, theme = 'gunduz', siluet = true) {
	const th = TEMA[theme] || TEMA.gunduz;
	const css = (c, a = 1) => `rgba(${c.map((x) => Math.round(Math.pow(Math.min(1, x * 0.9), 1 / 2.2) * 255)).join(',')},${a})`;
	const g = ctx.createLinearGradient(0, 0, 0, H);
	g.addColorStop(0, css(th.skyTop));
	g.addColorStop(0.62, css(th.skyHor));
	g.addColorStop(0.62, css(th.water ? th.ground : th.ground.map((x) => x * 0.8)));
	g.addColorStop(1, css(th.ground.map((x) => x * 0.55)));
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, W, H);
	if (!siluet) return;
	// siluet: kubbe, iki kule, kaide (her yapıya uyan yalın bir anıt)
	ctx.fillStyle = css(th.gnd.map((x) => x * 0.6 + 0.02), 0.85);
	const cx = W / 2;
	const by = H * 0.66;
	const s = H * 0.34;
	ctx.beginPath();
	ctx.rect(cx - s * 0.9, by - s * 0.32, s * 1.8, s * 0.32);
	ctx.arc(cx, by - s * 0.32, s * 0.45, Math.PI, 0);
	ctx.rect(cx - s * 0.82, by - s * 1.05, s * 0.12, s * 0.75);
	ctx.rect(cx + s * 0.7, by - s * 1.05, s * 0.12, s * 0.75);
	ctx.fill();
}
