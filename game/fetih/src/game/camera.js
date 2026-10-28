// Kamera: masa üstü haritaya eğik bakış. Durum: odak noktası (target), uzaklık, yön (yaw), eğim (pitch).
//
//   orbit  : başlık ekranı, haritanın üstünde ağır dönüş
//   fit    : bir bölgeyi ya da bütün haritayı ekrana sığdır (yumuşak yaylı geçiş)
//   focus  : bir noktaya sinematik yaklaşma
//   shot   : süreli, yumuşatılmış (ease) ve kavisli (arc: yolda hafif yükselir) geçiş; bitince
//            isteğe bağlı sürüklenme (yörünge dönüşü, yavaş yaklaşma) sürer
//   path   : anahtar karelerden geçen uçuş (açılış: Türkiye üstünden maç bölgesine)
//   free   : parmakla kaydırma / iki parmakla yakınlaştırma; ataletli, maç bölgesine sınırlı ve
//            sınırda lastik gibi geri yaylanır
//
// Kare başına nesne üretilmez: bütün ara değerler önceden ayrılmış.

import * as THREE from 'three';

const _v = new THREE.Vector3();
const TAU = Math.PI * 2;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const wrapPi = (a) => a - TAU * Math.round(a / TAU);
const crom = (p0, p1, p2, p3, t) => {
	const t2 = t * t;
	return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t2 * t);
};

function state() {
	return { x: 0, z: 0, dist: 0, yaw: 0, pitch: 0 };
}

export class MapCamera {
	constructor(camera) {
		this.cam = camera;
		this.mode = 'orbit';
		this.t = 0;
		this.target = new THREE.Vector3(0, 0, 0);
		this.goal = new THREE.Vector3(0, 0, 0);
		this.dist = 90;
		this.distTo = 90;
		this.yaw = 0; // 0: güneyden kuzeye bakış
		this.yawTo = 0;
		this.pitch = 0.95; // yataydan açı
		this.pitchTo = 0.95;
		this.k = 2.2;
		this.shake = 0; // sarsıntı "travması" 0..1+ (kare kare söner)
		this.aspect = 1;
		this.bounds = null; // son sığdırılan kutu
		this.limit = null; // kullanıcı kaydırmasının sınırı (maç bölgesi)
		// geçiş
		this.sh = { on: false, t: 0, dur: 1, arc: 0, ease: easeInOut, a: state(), b: state(), yawRate: 0, distRate: 0, distMin: 6, pitchDip: 0 };
		// uçuş yolu (en çok 8 anahtar)
		this.pathKeys = Array.from({ length: 8 }, state);
		this.pathN = 0;
		this.pathT = 0;
		this.pathDur = 1;
		// serbest kip: atalet
		this.vel = new THREE.Vector2();
		this._acc = new THREE.Vector2();
		this.dragging = false;
		this.zoomMin = 9;
		this.zoomMax = 140;
		this._roll = 0;
	}

	setAspect(a) {
		this.aspect = a;
		if (this.bounds && this.mode === 'fit') this.fit(this.bounds, { ...this._fitOpt, dur: 0.3 });
	}

	/** Kutuyu (dünya x/z) bu eğimde ekrana sığdıran uzaklık. */
	fitDist(b, pitch = 0.98, pad = 1.12) {
		const w = (b.x1 - b.x0) * pad;
		const d = (b.z1 - b.z0) * pad;
		const vfov = THREE.MathUtils.degToRad(this.cam.fov);
		const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.aspect);
		// eğik bakışta derinlik ekranda kısalır: sin(eğim)
		const needH = (d * Math.sin(pitch)) / 2 / Math.tan(vfov / 2);
		const needW = w / 2 / Math.tan(hfov / 2);
		return Math.max(needH, needW) + 2;
	}

	/** Dikdörtgen bölgeyi (dünya x/z) ekrana sığdır: yumuşak, kavisli geçiş. */
	fit(b, { pitch = 0.98, yaw = 0, pad = 1.12, dur = null, arc = null } = {}) {
		this.bounds = b;
		this._fitOpt = { pitch, yaw, pad };
		const x = (b.x0 + b.x1) / 2;
		const z = (b.z0 + b.z1) / 2;
		const dist = this.fitDist(b, pitch, pad);
		this.shot(x, z, { dist, pitch, yaw, dur, arc });
		this.mode = 'fit';
	}

	/** Noktaya yaklaş (eski API). */
	focus(x, z, { dist = 18, pitch = 0.78, yaw = null, dur = null, arc = null, yawRate = 0, distRate = 0 } = {}) {
		this.shot(x, z, { dist, pitch, yaw: yaw ?? this.yaw, dur, arc, yawRate, distRate });
		this.mode = 'focus';
	}

	/**
	 * Süreli geçiş. dur verilmezse yol uzunluğundan (0.45..1.3 sn). arc: yolda uzaklığa eklenen kavis
	 * (verilmezse yolun uzunluğuyla orantılı). Bitince yawRate (rad/sn) ve distRate (sn başına oran)
	 * ile sürüklenir: yörünge ve yavaş yaklaşma çekimleri.
	 */
	shot(x, z, { dist = this.dist, pitch = this.pitch, yaw = this.yaw, dur = null, arc = null, yawRate = 0, distRate = 0, distMin = 6, ease = null } = {}) {
		const s = this.sh;
		const moving = s.on && s.t < s.dur;
		s.a.x = this.target.x;
		s.a.z = this.target.z;
		s.a.dist = this.dist;
		s.a.yaw = this.yaw;
		s.a.pitch = this.pitch;
		s.b.x = x;
		s.b.z = z;
		s.b.dist = dist;
		s.b.yaw = s.a.yaw + wrapPi(yaw - s.a.yaw);
		s.b.pitch = pitch;
		const travel = Math.hypot(x - s.a.x, z - s.a.z);
		const zoom = Math.abs(Math.log(dist / Math.max(1, this.dist)));
		s.dur = dur ?? clamp(0.45 + travel * 0.018 + zoom * 0.5, 0.45, 1.3);
		s.arc = arc ?? Math.min(travel * 0.35, 30);
		s.ease = ease || (moving ? easeOut : easeInOut);
		s.t = 0;
		s.on = true;
		s.yawRate = yawRate;
		s.distRate = distRate;
		s.distMin = distMin;
		this.goal.set(x, 0, z);
		this.distTo = dist;
		this.yawTo = s.b.yaw;
		this.pitchTo = pitch;
		this.mode = 'shot';
		this.vel.set(0, 0);
	}

	/** Noktanın çevresinde yörünge: geçişle varır, sonra döner. */
	orbitAt(x, z, { dist = 22, pitch = 0.55, yaw = this.yaw, rate = 0.35, dur = null, distRate = 0 } = {}) {
		this.shot(x, z, { dist, pitch, yaw, dur, arc: 0, yawRate: rate, distRate });
	}

	/** Anahtar karelerden geçen uçuş: keys [{x, z, dist, yaw, pitch}] (ilki şimdiki durum olabilir). */
	path(keys, dur = 2) {
		const n = Math.min(8, keys.length);
		for (let i = 0; i < n; i++) Object.assign(this.pathKeys[i], keys[i]);
		this.pathN = n;
		this.pathT = 0;
		this.pathDur = dur;
		this.mode = 'path';
		this.sh.on = false;
		const e = this.pathKeys[n - 1];
		this.goal.set(e.x, 0, e.z);
		this.distTo = e.dist;
		this.yawTo = e.yaw;
		this.pitchTo = e.pitch;
	}

	/** Şimdiki geçişi/uçuşu bitir (dokunarak atlama). */
	finish() {
		if (this.mode === 'path') this.pathT = this.pathDur;
		else if (this.sh.on) this.sh.t = Math.max(this.sh.t, this.sh.dur);
	}

	/** Sarsıntı darbesi (0..1). */
	impulse(a) {
		this.shake = Math.min(1.4, Math.max(this.shake, a));
	}

	/** Kullanıcı kaydırmasının sınırı: maç bölgesinin kutusu (null: sınırsız). */
	setLimit(b) {
		this.limit = b ? { ...b } : null;
		if (b) this.zoomMax = Math.max(30, this.fitDist(b, 0.98) * 1.25);
		else this.zoomMax = 140;
	}

	// ------------------------------------------------------------- kullanıcı girdisi

	grab() {
		this.dragging = true;
		this.vel.set(0, 0);
		this._acc.set(0, 0);
	}

	release() {
		this.dragging = false;
	}

	_toFree() {
		if (this.mode === 'free') return;
		this.mode = 'free';
		this.sh.on = false;
		this.goal.copy(this.target);
		this.distTo = this.dist;
		this.yawTo = this.yaw;
		this.pitchTo = this.pitch;
	}

	/** Kullanıcı kaydırması: ekran pikseli → dünya kayması. */
	pan(dx, dy, h) {
		this._toFree();
		this.dragging = true;
		// parmak sağa → harita sağa (odak sola); parmak aşağı → harita bize doğru (odak kuzeye)
		const s = (this.dist * 0.9) / h;
		const c = Math.cos(this.yaw);
		const sn = Math.sin(this.yaw);
		const fz = (dy * s) / Math.max(0.45, Math.sin(this.pitch));
		let mx = -(dx * s * c - fz * sn);
		let mz = -(fz * c + dx * s * sn);
		// lastik: sınır dışına çıktıkça hareket zorlaşır
		const L = this._lim();
		if (L) {
			const g = this.goal;
			if ((g.x < L.x0 && mx < 0) || (g.x > L.x1 && mx > 0)) mx /= 1 + Math.max(L.x0 - g.x, g.x - L.x1) * 0.6;
			if ((g.z < L.z0 && mz < 0) || (g.z > L.z1 && mz > 0)) mz /= 1 + Math.max(L.z0 - g.z, g.z - L.z1) * 0.6;
		}
		this.goal.x += mx;
		this.goal.z += mz;
		this._acc.x += mx;
		this._acc.y += mz;
	}

	zoom(f) {
		this._toFree();
		// sınırların biraz dışına esner, bırakınca geri gelir
		const lo = this.zoomMin * 0.85;
		const hi = this.zoomMax * 1.15;
		let d = this.distTo * f;
		if (d < this.zoomMin) d = this.distTo * Math.pow(f, 0.35);
		if (d > this.zoomMax) d = this.distTo * Math.pow(f, 0.35);
		this.distTo = clamp(d, lo, hi);
	}

	_lim() {
		const L = this.limit;
		if (!L) return null;
		const b = this.bounds;
		const m = 2;
		const o = (this._L ||= { x0: 0, x1: 0, z0: 0, z1: 0 });
		// sınır: maç bölgesi ∪ son sığdırılan görünüm (harita sorusunda bütün Türkiye)
		o.x0 = Math.min(L.x0, b ? b.x0 : L.x0) - m;
		o.x1 = Math.max(L.x1, b ? b.x1 : L.x1) + m;
		o.z0 = Math.min(L.z0, b ? b.z0 : L.z0) - m;
		o.z1 = Math.max(L.z1, b ? b.z1 : L.z1) + m;
		return o;
	}

	// ------------------------------------------------------------- kare

	update(dt) {
		this.t += dt;
		if (this.mode === 'orbit') {
			this.yawTo = Math.sin(this.t * 0.08) * 0.35;
			this.goal.set(Math.sin(this.t * 0.05) * 6, 0, 2);
			this.distTo = 84;
			this.pitchTo = 0.9;
			this._damp(dt, this.k);
		} else if (this.mode === 'path') {
			this._path(dt);
		} else if (this.mode === 'free') {
			this._free(dt);
		} else if (this.sh.on) {
			this._shot(dt);
		} else this._damp(dt, this.k);
		this._apply(dt);
	}

	_damp(dt, k) {
		const a = 1 - Math.exp(-k * dt);
		this.target.lerp(this.goal, a);
		this.dist += (this.distTo - this.dist) * a;
		this.yaw += (this.yawTo - this.yaw) * a;
		this.pitch += (this.pitchTo - this.pitch) * a;
	}

	_shot(dt) {
		const s = this.sh;
		s.t += dt;
		if (s.t < s.dur) {
			const u = s.t / s.dur;
			const e = s.ease(u);
			const bump = Math.sin(Math.PI * e);
			this.target.x = s.a.x + (s.b.x - s.a.x) * e;
			this.target.z = s.a.z + (s.b.z - s.a.z) * e;
			// uzaklık logaritmik ara değer + kavis
			this.dist = Math.exp(Math.log(s.a.dist) + (Math.log(s.b.dist) - Math.log(s.a.dist)) * e) + s.arc * bump;
			this.yaw = s.a.yaw + (s.b.yaw - s.a.yaw) * e;
			this.pitch = s.a.pitch + (s.b.pitch - s.a.pitch) * e + s.arc * 0.004 * bump;
			return;
		}
		// vardı: sürüklenme (yörünge / yavaş yaklaşma)
		this.target.x = s.b.x;
		this.target.z = s.b.z;
		this.pitch = s.b.pitch;
		if (s.yawRate) this.yaw += s.yawRate * dt;
		else this.yaw = s.b.yaw;
		if (s.distRate) {
			s.b.dist = Math.max(s.distMin, s.b.dist * (1 + s.distRate * dt));
		}
		this.dist = s.b.dist;
		this.yawTo = this.yaw;
		this.distTo = this.dist;
		this.goal.set(this.target.x, 0, this.target.z);
	}

	_path(dt) {
		this.pathT = Math.min(this.pathDur, this.pathT + dt);
		const K = this.pathKeys;
		const n = this.pathN;
		const u = easeInOut(this.pathT / this.pathDur) * (n - 1);
		const i = Math.min(n - 2, Math.floor(u));
		const f = u - i;
		const p0 = K[Math.max(0, i - 1)];
		const p1 = K[i];
		const p2 = K[i + 1];
		const p3 = K[Math.min(n - 1, i + 2)];
		this.target.x = crom(p0.x, p1.x, p2.x, p3.x, f);
		this.target.z = crom(p0.z, p1.z, p2.z, p3.z, f);
		this.dist = Math.max(4, crom(p0.dist, p1.dist, p2.dist, p3.dist, f));
		this.yaw = crom(p0.yaw, p1.yaw, p2.yaw, p3.yaw, f);
		this.pitch = crom(p0.pitch, p1.pitch, p2.pitch, p3.pitch, f);
		if (this.pathT >= this.pathDur) {
			// son kareye yerleş: sığdırma kipi gibi dur
			const e = K[n - 1];
			this.target.set(e.x, 0, e.z);
			this.dist = e.dist;
			this.yaw = e.yaw;
			this.pitch = e.pitch;
			this.mode = 'fit';
			this.sh.on = false;
		}
	}

	_free(dt) {
		// atalet: bırakınca kayma sürer ve söner
		if (this.dragging) {
			if (dt > 0) {
				const k = 1 - Math.exp(-dt * 20);
				this.vel.x += (this._acc.x / dt - this.vel.x) * k;
				this.vel.y += (this._acc.y / dt - this.vel.y) * k;
			}
			this._acc.set(0, 0);
		} else {
			this.goal.x += this.vel.x * dt;
			this.goal.z += this.vel.y * dt;
			this.vel.multiplyScalar(Math.exp(-dt * 3.2));
		}
		// lastik: parmak yokken sınırın içine yaylan
		const L = this._lim();
		if (L && !this.dragging) {
			const k = 1 - Math.exp(-dt * 7);
			const cx = clamp(this.goal.x, L.x0, L.x1);
			const cz = clamp(this.goal.z, L.z0, L.z1);
			if (cx !== this.goal.x) this.vel.x *= 0.8;
			if (cz !== this.goal.z) this.vel.y *= 0.8;
			this.goal.x += (cx - this.goal.x) * k;
			this.goal.z += (cz - this.goal.z) * k;
		}
		if (!this.dragging) {
			const cd = clamp(this.distTo, this.zoomMin, this.zoomMax);
			this.distTo += (cd - this.distTo) * (1 - Math.exp(-dt * 6));
		}
		const a = 1 - Math.exp(-dt * 14);
		this.target.lerp(this.goal, a);
		this.dist += (this.distTo - this.dist) * (1 - Math.exp(-dt * 10));
		this.yaw += (this.yawTo - this.yaw) * (1 - Math.exp(-dt * 4));
		this.pitch += (this.pitchTo - this.pitch) * (1 - Math.exp(-dt * 4));
	}

	_apply(dt) {
		const c = this.cam;
		const cp = Math.cos(this.pitch);
		c.position.set(
			this.target.x - Math.sin(this.yaw) * cp * this.dist,
			this.target.y + Math.sin(this.pitch) * this.dist,
			this.target.z + Math.cos(this.yaw) * cp * this.dist,
		);
		_v.copy(this.target);
		let roll = 0;
		if (this.shake > 0.001) {
			// yumuşak gürültü (sinüs toplamı): titrek değil, gövdeden sarsıntı
			const s = this.shake * this.shake;
			const t = this.t * 31;
			const a = s * this.dist * 0.012;
			c.position.x += (Math.sin(t * 1.1) + Math.sin(t * 2.3 + 1.7) * 0.5) * a;
			c.position.y += (Math.sin(t * 1.3 + 0.6) + Math.sin(t * 2.9 + 2.1) * 0.5) * a;
			_v.x += Math.sin(t * 0.9 + 3.1) * a * 0.4;
			roll = Math.sin(t * 0.7 + 0.3) * s * 0.02;
			this.shake = Math.max(0, this.shake - dt * 1.8);
		}
		c.lookAt(_v);
		if (roll) c.rotateZ(roll);
		c.updateMatrixWorld();
	}
}
