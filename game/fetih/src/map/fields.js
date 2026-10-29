// Harita alan dokuları: açılışta ekran kartında bir kez çizilir, sonra yalnızca okunur.
//
//   uBorder (RGBA8): r = en yakın il sınırına işaretli uzaklık (0.5 + 0.5 * d / RB; okurken |2r - 1| * RB),
//                    g = o sınırın öbür yanındaki il (255 deniz, 254 yabancı)
//   uWater  (RGBA8): r = kıyıya yakınlık (1 kıyıda, 0 RC uzakta), g = nehir (0.5 üstü nehir yatağı),
//                    b = göl içi, a = göl kıyısına yakınlık
//
// Sınır alanı bir uzaklık alanı olduğu için çizgiler her yakınlıkta keskin ve kenar yumuşatmalıdır;
// kalınlık ekran pikseline göre ayarlanır (fwidth). Komşu il kimliği sayesinde aynı sahibin illeri
// arasındaki sınır incelir: oyuncunun toprağı tek parça bir ülke gibi okunur.
//
// Yöntem: her sınır parçası çevresinde bir dikdörtgen çizilir; parça shader'da tam uzaklık hesaplanır.
//   - Sınır geçişi derinlik sınamalıdır (gl_FragDepth = uzaklık): her piksele en yakın parça yazılır,
//     öbür yanın kimliği de onunla birlikte.
//   - Su geçişi MAX karışımlıdır: her kanal kendi en büyük yakınlığını tutar.

import * as THREE from 'three';

export const FIELD_BOX = { x0: -58, z0: -28, w: 114, d: 57 };
export const RB = 1.25; // sınır uzaklığı aralığı (birim)
export const RC = 3.0; // kıyı yakınlığı aralığı
export const RL = 0.6; // göl kıyısı aralığı

const SEG_VS = /* glsl */ `
attribute vec4 seg;   // a.x, a.y(dünya z), b.x, b.y
attribute vec4 info;  // sınır: sol il, sağ il, -, -  | su: kanal (0 kıyı, 1 nehir, 3 göl kıyısı), yarıçap, -, -
uniform vec4 uBox;    // x0, z0, 1/w, 1/d
varying vec2 vP;
varying vec4 vSeg;
varying vec4 vInfo;
void main() {
	vP = position.xz;
	vSeg = seg;
	vInfo = info;
	vec2 uv = (position.xz - uBox.xy) * uBox.zw;
	gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
}`;

const BORDER_FS = /* glsl */ `
uniform float uR;
varying vec2 vP;
varying vec4 vSeg;
varying vec4 vInfo;
void main() {
	vec2 a = vSeg.xy, b = vSeg.zw;
	vec2 ab = b - a;
	float t = clamp(dot(vP - a, ab) / max(dot(ab, ab), 1e-9), 0.0, 1.0);
	float d = length(vP - a - ab * t);
	if (d > uR) discard;
	// dünya x/z düzleminde sol taraf: (x, -z) → saat yönünün tersi halkada içerisi
	float side = ab.x * (vP.y - a.y) - ab.y * (vP.x - a.x);
	// z = -y olduğundan işaret ters: side < 0 → sol (il a)
	float other = side < 0.0 ? vInfo.y : vInfo.x;
	gl_FragDepth = d / uR;
	// işaretli uzaklık (parçanın sol yanı +, sağ yanı -): doğrusal süzgeçte sıfır tam çizginin üstüne düşer.
	// İşaretsiz uzaklık iki doku hücresi arasında sıfıra inemiyordu (ince çizgi kesik kesik görünüyordu).
	float sd = side < 0.0 ? d : -d;
	gl_FragColor = vec4(0.5 + 0.5 * sd / uR, other / 255.0, 0.0, 1.0);
}`;

const WATER_FS = /* glsl */ `
varying vec2 vP;
varying vec4 vSeg;
varying vec4 vInfo;
void main() {
	vec2 a = vSeg.xy, b = vSeg.zw;
	vec2 ab = b - a;
	float t = clamp(dot(vP - a, ab) / max(dot(ab, ab), 1e-9), 0.0, 1.0);
	float d = length(vP - a - ab * t);
	float R = vInfo.y;
	float v = clamp(1.0 - d / R, 0.0, 1.0);
	float ch = vInfo.x;
	vec4 o = vec4(0.0);
	if (ch < 0.5) o.r = v;
	else if (ch < 1.5) o.g = v;
	else if (ch < 2.5) o.b = vInfo.z > 0.5 ? 0.75 : 1.0; // göl içi (üçgen); tuz gölü 0.75
	else o.a = v;
	gl_FragColor = o;
}`;

/** Parçaları dikdörtgen olarak dizer: her parça R kadar şişirilir. */
function segGeometry(list) {
	// list: [{ax, az, bx, bz, R, i0, i1, i2, i3}]
	const n = list.length;
	const pos = new Float32Array(n * 4 * 3);
	const seg = new Float32Array(n * 4 * 4);
	const info = new Float32Array(n * 4 * 4);
	const idx = new Uint32Array(n * 6);
	for (let k = 0; k < n; k++) {
		const s = list[k];
		let dx = s.bx - s.ax;
		let dz = s.bz - s.az;
		const L = Math.hypot(dx, dz) || 1e-6;
		dx /= L;
		dz /= L;
		const R = s.R * 1.02;
		// dikdörtgen köşeleri: uçlardan R taşar
		const px = -dz * R;
		const pz = dx * R;
		const ax = s.ax - dx * R;
		const az = s.az - dz * R;
		const bx = s.bx + dx * R;
		const bz = s.bz + dz * R;
		const C = [ax + px, az + pz, ax - px, az - pz, bx - px, bz - pz, bx + px, bz + pz];
		for (let c = 0; c < 4; c++) {
			const v = k * 4 + c;
			pos[v * 3] = C[c * 2];
			pos[v * 3 + 1] = 0;
			pos[v * 3 + 2] = C[c * 2 + 1];
			seg.set([s.ax, s.az, s.bx, s.bz], v * 4);
			info.set([s.i0, s.i1, s.i2 || 0, s.i3 || 0], v * 4);
		}
		idx.set([k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3], k * 6);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setAttribute('seg', new THREE.BufferAttribute(seg, 4));
	g.setAttribute('info', new THREE.BufferAttribute(info, 4));
	g.setIndex(new THREE.BufferAttribute(idx, 1));
	return g;
}

/** Göl çokgenlerini üçgenler (b kanalı = göl içi). */
function lakeFillGeometry(lakes) {
	const pos = [];
	const seg = [];
	const info = [];
	for (const l of lakes) {
		const r = l.ring;
		const v = [];
		for (let i = 0; i < r.length; i += 2) v.push(new THREE.Vector2(r[i], r[i + 1]));
		const faces = THREE.ShapeUtils.triangulateShape(v, []);
		const salt = /Tuz/.test(l.name) ? 1 : 0;
		for (const f of faces)
			for (const k of f) {
				pos.push(v[k].x, 0, -v[k].y);
				seg.push(0, 0, 0, 0);
				info.push(2, 1, salt, 0);
			}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('seg', new THREE.Float32BufferAttribute(seg, 4));
	g.setAttribute('info', new THREE.Float32BufferAttribute(info, 4));
	return g;
}

/**
 * Alan dokularını çizer. data: turkiye.json; indexOf: plaka → il indeksi.
 * Dönen: { border, water, res }
 */
export function bakeFields(renderer, data, indexOf, res) {
	const W = res;
	const H = res >> 1;
	const box = FIELD_BOX;
	const uBox = new THREE.Vector4(box.x0, box.z0, 1 / box.w, 1 / box.d);
	const mk = (depth, linear) =>
		new THREE.WebGLRenderTarget(W, H, {
			depthBuffer: depth,
			stencilBuffer: false,
			type: THREE.UnsignedByteType,
			format: THREE.RGBAFormat,
			minFilter: linear ? THREE.LinearFilter : THREE.NearestFilter,
			magFilter: linear ? THREE.LinearFilter : THREE.NearestFilter,
			generateMipmaps: false,
		});
	const border = mk(true, true);
	const water = mk(false, true);
	for (const t of [border.texture, water.texture]) t.colorSpace = THREE.NoColorSpace;

	// --- sınır parçaları
	const bl = [];
	for (const b of data.borders) {
		const L = indexOf(b.a);
		const R = b.b > 0 ? indexOf(b.b) : b.b === 0 ? 255 : 254;
		const p = b.pts;
		for (let i = 0; i + 3 < p.length; i += 2) bl.push({ ax: p[i], az: -p[i + 1], bx: p[i + 2], bz: -p[i + 3], R: RB, i0: L, i1: R });
	}
	// --- su parçaları: il kıyıları, komşu kıyıları, nehirler, göl kıyıları
	const wl = [];
	for (const b of data.borders) {
		if (b.b !== 0) continue;
		const p = b.pts;
		for (let i = 0; i + 3 < p.length; i += 2) wl.push({ ax: p[i], az: -p[i + 1], bx: p[i + 2], bz: -p[i + 3], R: RC, i0: 0, i1: RC });
	}
	for (const p of data.nbCoast || []) for (let i = 0; i + 3 < p.length; i += 2) wl.push({ ax: p[i], az: -p[i + 1], bx: p[i + 2], bz: -p[i + 3], R: RC, i0: 0, i1: RC });
	for (const r of data.rivers) {
		const p = r.pts;
		const n = p.length / 2;
		for (let i = 0; i + 3 < p.length; i += 2) {
			// nehir akış boyunca genişler (kaynak → ağız)
			const t = i / 2 / Math.max(1, n - 1);
			const w = (0.035 + 0.05 * Math.sqrt(t)) * r.w;
			wl.push({ ax: p[i], az: -p[i + 1], bx: p[i + 2], bz: -p[i + 3], R: w * 2, i0: 1, i1: w * 2 });
		}
	}
	for (const l of data.lakes) {
		const p = l.ring;
		const n = p.length;
		for (let i = 0; i < n; i += 2) {
			const j = (i + 2) % n;
			wl.push({ ax: p[i], az: -p[i + 1], bx: p[j], bz: -p[j + 1], R: RL, i0: 3, i1: RL });
		}
	}

	const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	const scene = new THREE.Scene();
	const bmat = new THREE.ShaderMaterial({
		vertexShader: SEG_VS,
		fragmentShader: BORDER_FS,
		uniforms: { uBox: { value: uBox }, uR: { value: RB } },
		depthTest: true,
		depthWrite: true,
		depthFunc: THREE.LessDepth,
		side: THREE.DoubleSide, // dünya z = -y: üçgen sarımı ters döner, hiçbiri elenmesin
	});
	const wmat = new THREE.ShaderMaterial({
		vertexShader: SEG_VS,
		fragmentShader: WATER_FS,
		uniforms: { uBox: { value: uBox } },
		depthTest: false,
		depthWrite: false,
		side: THREE.DoubleSide,
		blending: THREE.CustomBlending,
		blendEquation: THREE.MaxEquation,
		blendSrc: THREE.OneFactor,
		blendDst: THREE.OneFactor,
		blendEquationAlpha: THREE.MaxEquation,
		blendSrcAlpha: THREE.OneFactor,
		blendDstAlpha: THREE.OneFactor,
	});
	const bg = segGeometry(bl);
	const wg = segGeometry(wl);
	const lg = lakeFillGeometry(data.lakes);
	const bm = new THREE.Mesh(bg, bmat);
	const wm = new THREE.Mesh(wg, wmat);
	const lm = new THREE.Mesh(lg, wmat);
	for (const m of [bm, wm, lm]) m.frustumCulled = false;

	const prevRT = renderer.getRenderTarget();
	const prevClear = renderer.getClearColor(new THREE.Color());
	const prevAlpha = renderer.getClearAlpha();
	const prevAuto = renderer.autoClear;
	renderer.autoClear = false;

	renderer.setRenderTarget(border);
	renderer.setClearColor(0x000000, 0);
	// boş pikseller: en uzak, deniz
	renderer.setClearColor(new THREE.Color(1, 1, 0), 1);
	renderer.clear(true, true, false);
	scene.add(bm);
	renderer.render(scene, cam);
	scene.remove(bm);

	renderer.setRenderTarget(water);
	renderer.setClearColor(0x000000, 0);
	renderer.clear(true, false, false);
	scene.add(wm, lm);
	renderer.render(scene, cam);
	scene.remove(wm, lm);

	renderer.setRenderTarget(prevRT);
	renderer.setClearColor(prevClear, prevAlpha);
	renderer.autoClear = prevAuto;
	bg.dispose();
	wg.dispose();
	lg.dispose();
	bmat.dispose();
	wmat.dispose();
	return { border, water, res: new THREE.Vector2(W, H), box: uBox, segments: bl.length + wl.length };
}
