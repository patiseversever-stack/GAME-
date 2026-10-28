// Oyuncunun başkent kalesi: kayalık bir tepe üstünde Osmanlı hisarı (Rumeli Hisarı esintili üçgen
// plan). Üç köşede üç büyük yuvarlak kule (her biri bir "can"), aralarında mazgallı surlar, önde kapı
// kulesi, ortada Selçuklu çini kuşaklı bir iç kale (donjon) ve tepesinde dalgalanan büyük sancak.
// Kule külahları, flamalar ve sancak sahibin renginde.
//
// Bütün kale tek geometri, tek çizim çağrısı. Kule yıkılması köşe shader'ında: kule çöker, dışa
// yatar, dibinde moloz yığını büyür. API (eski ile aynı): place(pos), hit() → kalan can, repair(),
// hp, update(dt), group, casters. Ek: towerPos(i, out) kulenin dünya konumu (parçacık efektleri için).

import * as THREE from 'three';
import { COMMON, SHADOW, LIGHT, FINISH } from '../gfx/shaderlib.js';
import { Kit, archShape } from '../gfx/kit.js';

const RT = 0.95; // kule çemberi yarıçapı
// kule sırası: 0 arka, 1 ön sağ, 2 ön sol
const TOWERS = [
	[0, -RT],
	[RT * 0.866, RT * 0.5],
	[-RT * 0.866, RT * 0.5],
];
const BASE_Y = 0.16;
const HIT_ORDER = [1, 2, 0]; // önce kameraya bakan kuleler düşsün

const VS = /* glsl */ `
${COMMON}
attribute vec3 color;
attribute float tag;
attribute float anim;
uniform vec3 uFall;
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying float vF;
varying float vL;
const vec3 T0 = vec3(${TOWERS[0][0].toFixed(4)}, ${BASE_Y.toFixed(3)}, ${TOWERS[0][1].toFixed(4)});
const vec3 T1 = vec3(${TOWERS[1][0].toFixed(4)}, ${BASE_Y.toFixed(3)}, ${TOWERS[1][1].toFixed(4)});
const vec3 T2 = vec3(${TOWERS[2][0].toFixed(4)}, ${BASE_Y.toFixed(3)}, ${TOWERS[2][1].toFixed(4)});
vec3 towerBase(float k) { return k < 0.5 ? T0 : k < 1.5 ? T1 : T2; }
float fallOf(float k) { return k < 0.5 ? uFall.x : k < 1.5 ? uFall.y : uFall.z; }
void main() {
	vec3 p = position;
	vec3 n = normal;
	float k = -1.0;
	if (tag > 0.5 && tag < 3.5) k = tag - 1.0;
	else if (tag > 7.5) k = tag - 8.0;
	// bayrak bezi: direkten uzaklaştıkça dalgalanır (anim = direkten uzaklık 0..1)
	if (anim > 0.0) {
		p.z += sin(p.x * 7.0 - uTime * 7.5 + p.y * 2.0) * 0.07 * anim;
		p.y += sin(p.x * 5.0 - uTime * 5.5) * 0.025 * anim;
	}
	vF = 0.0;
	if (k >= 0.0) {
		float f = fallOf(k);
		vec3 b = towerBase(k);
		vec3 l = p - b;
		// çök: kısal, dışa yat, biraz göm
		l.y *= 1.0 - 0.84 * f;
		vec2 o = normalize(b.xz);
		float a = f * 0.75;
		float lo = dot(l.xz, o);
		float ly = l.y;
		l.xz += o * (lo * (cos(a) - 1.0) + ly * sin(a));
		l.y = -lo * sin(a) + ly * cos(a);
		p = b + l;
		p.y -= f * 0.06;
		vF = f;
	} else if (tag > 3.5 && tag < 6.5) {
		// moloz: kule düştükçe büyür
		float kk = tag - 4.0;
		float f = fallOf(kk);
		vec3 b = towerBase(kk);
		p = b + (p - b) * smoothstep(0.15, 0.9, f);
	}
	vec4 w = modelMatrix * vec4(p, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * n);
	vC = color;
	vL = position.y;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FS = /* glsl */ `
#define SHADOW_TAPS __TAPS__
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
uniform vec3 uOwner;
uniform float uFade;
uniform float uLit;
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying float vF;
varying float vL;
void main() {
	vec3 N = normalize(vN);
	vec3 alb = vC;
	float gloss = 0.08;
	bool own = vC.r < -0.5;
	if (own) {
		// sahip rengi (g: parlaklık çarpanı); külahlar kurşun gibi hafif cilalı
		alb = uOwner * vC.g;
		gloss = 0.35;
	} else if (vC.b > 0.0 && vC.r > 0.0) {
		// taş dokusu: sıra sıra kesme taş
		float row = floor(vL * 16.0);
		float b = hash12(vec2(row, floor((vW.x + vW.z) * 9.0 + row * 0.5)));
		alb *= 0.9 + 0.16 * b;
		alb *= 1.0 - 0.1 * (1.0 - smoothstep(0.0, 0.08, abs(fract(vL * 16.0) - 0.5) - 0.42));
	}
	alb *= 1.0 - vF * 0.35; // yıkılan kule kararır
	float sh = shadowAt(vW, N);
	vec3 V = normalize(cameraPosition - vW);
	vec3 c = shade(alb, N, V, 1.0, sh, gloss, 0.6);
	c = applyFog(c, vW);
	gLit = uLit; // gece odağında ilin aydınlıksa kale de aydınlık
	gl_FragColor = finish(c * uFade, 1.0);
}`;

const DEPTH_FS = /* glsl */ `void main() { gl_FragColor = vec4(1.0); }`;

const STONE = '#e2d2b0';
const STONE2 = '#cdb893';
const DARK = '#3a2a22';
const GOLD = '#f2c14e';
const TILE = '#22a99b';
const OWN = (k, kit) => kit.raw(-1, k, 0);

function towerParts(kit, k) {
	const [x, z] = TOWERS[k];
	kit.setTag(1 + k);
	kit.push().move(x, BASE_Y, z);
	kit.color(STONE2).cyl(0.36, 0.4, 0.14, 12);
	kit.color(STONE).cyl(0.29, 0.33, 1.05, 12, 0, 0.1);
	// kordon ve konsollu parapet
	kit.color(STONE2).cyl(0.35, 0.3, 0.1, 12, 0, 1.12);
	kit.color(STONE).cyl(0.35, 0.35, 0.07, 12, 0, 1.22);
	kit.merlonRing(0.33, 1.29, 9, 0.08, 0.08, 0.07);
	// mazgal delikleri (dışa bakan)
	const a = Math.atan2(z, x);
	kit.color(DARK);
	for (const [da, y] of [[0, 0.45], [0.6, 0.75], [-0.6, 0.75], [0, 0.95]]) kit.box(0.04, 0.12, 0.05, Math.cos(a + da) * 0.31, y, Math.sin(a + da) * 0.31, -(a + da));
	// kurşun külah (sahip rengi) + altın alem
	OWN(1.0, kit).cone(0.39, 0.66, 12, 0, 1.24);
	OWN(0.7, kit).cyl(0.4, 0.4, 0.03, 12, 0, 1.22);
	kit.color(GOLD).cyl(0.012, 0.012, 0.16, 4, 0, 1.86).sphere(0.035, 6, 0, 1.95);
	kit.pop();
	// flama
	kit.setTag(8 + k);
	kit.push().move(x, BASE_Y + 1.98, z);
	kit.color('#6b4a2e').cyl(0.01, 0.01, 0.22, 4);
	pennant(kit, 0.26, 0.12, 0.2);
	kit.pop();
}

function pennant(kit, L, H, y) {
	// üçgen flama: anim = direkten uzaklık
	const n = 6;
	const pos = [];
	for (let i = 0; i < n; i++) {
		const x0 = (i / n) * L;
		const x1 = ((i + 1) / n) * L;
		const h0 = H * (1 - i / n);
		const h1 = H * (1 - (i + 1) / n);
		pos.push(x0, y - h0 / 2, 0, x1, y - h1 / 2, 0, x1, y + h1 / 2, 0, x0, y - h0 / 2, 0, x1, y + h1 / 2, 0, x0, y + h0 / 2, 0);
	}
	addCloth(kit, pos, L);
}

function flag(kit, W, H, y) {
	const n = 8;
	const pos = [];
	for (let i = 0; i < n; i++) {
		const x0 = (i / n) * W;
		const x1 = ((i + 1) / n) * W;
		pos.push(x0, y - H, 0, x1, y - H, 0, x1, y, 0, x0, y - H, 0, x1, y, 0, x0, y, 0);
	}
	addCloth(kit, pos, W);
}

function addCloth(kit, pos, L) {
	// iki yüzlü bez: ön ve arka (ters sarım)
	const back = [];
	for (let i = 0; i < pos.length; i += 9) back.push(pos[i], pos[i + 1], pos[i + 2], pos[i + 6], pos[i + 7], pos[i + 8], pos[i + 3], pos[i + 4], pos[i + 5]);
	for (const arr of [pos, back]) {
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
		const start = kit.count;
		OWN(1.05, kit).add(g);
		for (let i = start; i < kit.count; i++) kit.anim[i] = Math.max(0.001, (kit.pos[i * 3] - kit.m.elements[12]) / L);
	}
}

function castleGeo(tier) {
	const kit = new Kit();
	kit.seg = tier.id === 0 ? 0.75 : 1;
	// --- kayalık tepe (yamaçlı arazide de oturur)
	kit.setTag(0);
	const R = [1.78, 1.62, 1.46, 1.34];
	const g = new THREE.LatheGeometry(
		[
			[R[0], -0.8],
			[R[1], -0.3],
			[R[2], 0.02],
			[R[3], 0.14],
			[1.2, 0.17],
		].map(([r, y]) => new THREE.Vector2(r, y)),
		Math.round(11 * kit.seg),
	);
	const p = g.getAttribute('position');
	for (let i = 0; i < p.count; i++) {
		const a = Math.atan2(p.getZ(i), p.getX(i));
		const j = 1 + 0.09 * Math.sin(a * 5 + 1.3) + 0.05 * Math.sin(a * 11);
		if (p.getY(i) < 0.1) p.setXYZ(i, p.getX(i) * j, p.getY(i), p.getZ(i) * j);
	}
	kit.color('#8b7a66').add(g);
	kit.color('#6aa04a').cyl(1.2, 1.34, 0.04, 11, 0, 0.13);
	// avlu
	kit.color('#b9a585').cyl(0.75, 0.78, 0.03, 10, 0, BASE_Y);
	// --- surlar (kuleler arası) + mazgallar
	for (let k = 0; k < 3; k++) {
		const [x0, z0] = TOWERS[k];
		const [x1, z1] = TOWERS[(k + 1) % 3];
		const L = Math.hypot(x1 - x0, z1 - z0);
		const ry = -Math.atan2(z1 - z0, x1 - x0);
		const mx = (x0 + x1) / 2;
		const mz = (z0 + z1) / 2;
		kit.color(STONE2).box(L, 0.1, 0.24, mx, BASE_Y, mz, ry);
		kit.color(STONE).box(L - 0.3, 0.58, 0.17, mx, BASE_Y + 0.08, mz, ry);
		// dış yüzde mazgallar
		const ox = Math.cos(ry + Math.PI / 2);
		const oz = -Math.sin(ry + Math.PI / 2);
		const sgn = ox * mx + oz * mz > 0 ? 1 : -1;
		const dx = (x1 - x0) / L;
		const dz = (z1 - z0) / L;
		const nx = -dz * sgn * 0.0;
		kit.merlons(x0 + dx * 0.25, z0 + dz * 0.25, x1 - dx * 0.25, z1 - dz * 0.25, BASE_Y + 0.66, 0.08, 0.075, 0.17, 0.065);
		kit.color(DARK);
		for (const t of [0.3, 0.5, 0.7]) kit.box(0.03, 0.1, 0.18, x0 + (x1 - x0) * t + nx, BASE_Y + 0.36, z0 + (z1 - z0) * t, ry);
	}
	// --- kapı kulesi (önde, iki ön kule arasında)
	const gz = RT * 0.5 + 0.02;
	kit.color(STONE).box(0.46, 0.86, 0.3, 0, BASE_Y, gz);
	kit.merlons(-0.2, gz + 0.12, 0.2, gz + 0.12, BASE_Y + 0.86, 0.08, 0.07, 0.07, 0.06);
	kit.merlons(-0.2, gz - 0.12, 0.2, gz - 0.12, BASE_Y + 0.86, 0.08, 0.07, 0.07, 0.06);
	kit.color(TILE).box(0.47, 0.04, 0.31, 0, BASE_Y + 0.72, gz);
	kit.color('#5a3a22').slab(archShape(0.2, 0.36), 0.04, 0, BASE_Y, gz + 0.15);
	kit.color(GOLD).box(0.08, 0.05, 0.02, 0, BASE_Y + 0.42, gz + 0.16);
	// --- iç kale (donjon): kare gövde, çini kuşağı, mazgal, piramit külah, büyük sancak
	const kz = -0.12;
	kit.color(STONE2).box(0.72, 0.12, 0.72, 0, BASE_Y, kz);
	kit.color(STONE).box(0.64, 1.36, 0.64, 0, BASE_Y + 0.1, kz);
	kit.color(TILE).box(0.66, 0.07, 0.66, 0, BASE_Y + 1.2, kz);
	kit.color('#f4efe2').box(0.665, 0.02, 0.665, 0, BASE_Y + 1.19, kz);
	kit.color(STONE).box(0.72, 0.08, 0.72, 0, BASE_Y + 1.46, kz);
	for (const [a, b, c, d] of [[-0.33, -0.33, 0.33, -0.33], [0.33, -0.33, 0.33, 0.33], [0.33, 0.33, -0.33, 0.33], [-0.33, 0.33, -0.33, -0.33]]) kit.merlons(a, b + kz, c, d + kz, BASE_Y + 1.54, 0.09, 0.08, 0.08, 0.06);
	kit.color(DARK);
	for (const [x, z, ry] of [[0, kz + 0.325, 0], [0.325, kz, Math.PI / 2], [-0.325, kz, Math.PI / 2]]) {
		kit.box(0.05, 0.16, 0.02, x, BASE_Y + 0.55, z, ry);
		kit.box(0.05, 0.16, 0.02, x, BASE_Y + 0.9, z, ry);
	}
	OWN(1.0, kit).cone(0.5, 0.6, 4, 0, BASE_Y + 1.5, kz, Math.PI / 4);
	kit.color(GOLD).cyl(0.015, 0.015, 0.2, 4, 0, BASE_Y + 2.06, kz).sphere(0.04, 6, 0, BASE_Y + 2.2, kz);
	// sancak direği ve bezi
	kit.color('#6b4a2e').cyl(0.018, 0.022, 0.95, 5, 0.06, BASE_Y + 2.0, kz);
	kit.color(GOLD).sphere(0.035, 6, 0.06, BASE_Y + 2.96, kz);
	kit.setTag(7);
	kit.push().move(0.075, 0, kz);
	flag(kit, 0.62, 0.38, BASE_Y + 2.9);
	kit.pop();
	// --- üç kule
	for (let k = 0; k < 3; k++) towerParts(kit, k);
	// --- moloz yığınları (kule düşünce büyür)
	for (let k = 0; k < 3; k++) {
		const [x, z] = TOWERS[k];
		kit.setTag(4 + k);
		const o = [x * 1.25, z * 1.25];
		kit.color(STONE2).ico(0.22, o[0], BASE_Y + 0.02, o[1], 0.55).ico(0.14, o[0] + 0.16, BASE_Y, o[1] - 0.1, 0.6);
		kit.color(STONE).ico(0.12, o[0] - 0.15, BASE_Y, o[1] + 0.08, 0.7).box(0.14, 0.1, 0.1, o[0] + 0.05, BASE_Y + 0.08, o[1] + 0.12, 0.6);
	}
	return kit.build();
}

let SHARED = null;

/** Yıkılma eğrisi: önce hızlı, sonda yumuşak. */
const fallEase = (f) => 1 - Math.pow(1 - f, 2.2);

export class Castle {
	constructor(G, tier, owner, color) {
		this.owner = owner;
		this.group = new THREE.Group();
		const taps = String(tier.shadowTaps);
		if (!SHARED) SHARED = castleGeo(tier);
		this.fall = new THREE.Vector3();
		this.uniforms = { ...G, uOwner: { value: new THREE.Color(color) }, uFade: { value: 1 }, uFall: { value: this.fall }, uLit: { value: 0 } };
		const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS.replace('__TAPS__', taps), uniforms: this.uniforms, side: THREE.DoubleSide });
		this.mesh = new THREE.Mesh(SHARED, mat);
		this.mesh.frustumCulled = false;
		this.group.add(this.mesh);
		this.group.scale.setScalar(1.25);
		// gölge kopyası: aynı geometri ve aynı çökme, yalnızca derinlik; görünürlük kaleyi izler
		const dm = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: DEPTH_FS, uniforms: this.uniforms, side: THREE.DoubleSide });
		const c = new THREE.Mesh(SHARED, dm);
		c.matrixAutoUpdate = false;
		c.frustumCulled = false;
		const grp = this.group;
		// açılıştaki ilk gölge çiziminde görünür (derinlik shader'ı oyun sırasında derlenmesin)
		Object.defineProperty(c, 'visible', { get: () => grp.visible || !Castle.warmed, set: () => {} });
		this.casters = [c];
		this.towers = [0, 1, 2].map((i) => ({ alive: 1, fall: 0, i }));
		this._last = new THREE.Vector3(1e9, 0, 0);
		this._prov = -1;
		this.hp = 3;
	}

	/** Kaleyi koy: x/z verilen nokta, yükseklik o noktadaki arazi (+ ilin yükselmesi). */
	place(pos) {
		this.group.position.copy(pos);
		const b = Castle.board;
		this._prov = b ? b.pick(pos.x, pos.z) : -1;
		if (b) this.group.position.y = b.heightAt(pos.x, pos.z) + (this._prov >= 0 ? b.liftOf(this._prov) : 0);
		this._last.copy(this.group.position);
	}

	/** Bir kule düşer. Kalan can döner. */
	hit() {
		const i = HIT_ORDER.find((k) => this.towers[k].alive);
		if (i == null) return 0;
		this.towers[i].alive = 0;
		this.hp--;
		this.lastHit = i;
		return this.hp;
	}

	repair() {
		for (const t of this.towers) {
			t.alive = 1;
			t.fall = 0;
		}
		this.fall.set(0, 0, 0);
		this.hp = 3;
	}

	/** Kulenin (i: 0..2, varsayılan son yıkılan) tepe noktasının dünya konumu. */
	towerPos(i = this.lastHit ?? 1, out = new THREE.Vector3()) {
		const [x, z] = TOWERS[i];
		out.set(x, BASE_Y + 1.4, z);
		this.group.updateMatrixWorld();
		return out.applyMatrix4(this.group.matrixWorld);
	}

	update(dt) {
		// il kalkınca kale de kalkar (konumu başka biri canlandırmıyorsa)
		const b = Castle.board;
		const gp = this.group.position;
		if (b && this._prov >= 0 && gp.equals(this._last)) {
			gp.y = b.heightAt(gp.x, gp.z) + b.liftOf(this._prov);
			this._last.copy(gp);
		}
		this.uniforms.uLit.value = b && this._prov >= 0 ? b.sel[this._prov] : 0;
		for (const t of this.towers) {
			if (t.alive) continue;
			t.fall = Math.min(1, t.fall + dt * 1.4);
		}
		this.fall.set(fallEase(this.towers[0].fall), fallEase(this.towers[1].fall), fallEase(this.towers[2].fall));
		this.group.updateMatrixWorld();
		for (const c of this.casters) c.matrix.copy(this.mesh.matrixWorld);
	}
}

/** Harita (Board kurulunca kendini yazar): kaleler araziye oturur ve ilin yükselmesini izler. */
Castle.board = null;
/** İlk kare çizilince true (o ana kadar gölge kopyaları ısınma için görünür). */
Castle.warmed = false;
