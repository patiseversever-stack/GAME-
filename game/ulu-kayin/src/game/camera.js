// Kamera: oyunda Zifir'i ağacın dışından, biraz yukarıdan ve geriden izler; yolun ilerisini gösterir.
// Sinematik anlarda (açılış uçuşu, bölüm geçişi) yumuşak eğriler üzerinde süzülür.

import * as THREE from 'three';
import { damp, lerp, clamp, easeInOut } from '../core/math.js';

const V3 = () => new THREE.Vector3();

export class CameraRig {
	constructor() {
		this.cam = new THREE.PerspectiveCamera(52, 1, 0.3, 1400);
		this.pos = V3();
		this.look = V3();
		this.tPos = V3();
		this.tLook = V3();
		this.aspect = 1;
		this.mode = 'follow';
		this.cine = null;
		this.shake = 0;
		this.zoom = 1; // 1 normal; >1 uzaklaşır
		this._tmp = V3();
		this._tmp2 = V3();
		this.lag = 0.42;
	}

	resize(w, h) {
		this.aspect = w / h;
		this.cam.aspect = this.aspect;
		// dikey ekranda yatay görüşü korumak için dikey açı genişler
		this.baseFov = this.aspect < 1 ? lerp(66, 54, clamp((this.aspect - 0.45) / 0.55, 0, 1)) : 50;
		this.cam.fov = this.baseFov;
		this.cam.updateProjectionMatrix();
	}

	/** Takip hedefini hesaplar: p Zifir'in konumu, ahead ilerideki patika noktası. */
	followTarget(p, ahead, out = this.tPos, look = this.tLook) {
		const az = Math.atan2(p.z, p.x);
		const r = Math.hypot(p.x, p.z);
		const portrait = this.aspect < 1;
		const dist = (portrait ? 10.2 : 8.6) * this.zoom;
		const height = (portrait ? 4.2 : 3.3) * this.zoom;
		const ca = az - this.lag;
		out.set(Math.cos(ca) * (r + dist), p.y + height, Math.sin(ca) * (r + dist));
		look.copy(p).lerp(ahead, 0.35);
		look.y += portrait ? 0.2 : 0.55;
		return out;
	}

	snap() {
		this.pos.copy(this.tPos);
		this.look.copy(this.tLook);
	}

	/**
	 * Sinematik uçuş: keys = [{t, pos: Vector3, look: Vector3, fov?}], süre key'lerin son t'si.
	 * Bitince onDone çağrılır ve takip moduna geçilir.
	 */
	play(keys, onDone) {
		this.cine = { keys, t: 0, dur: keys[keys.length - 1].t, onDone };
		const P = keys.map((k) => k.pos);
		const L = keys.map((k) => k.look);
		this.cine.cp = new THREE.CatmullRomCurve3(P, false, 'centripetal');
		this.cine.cl = new THREE.CatmullRomCurve3(L, false, 'centripetal');
		this.mode = 'cine';
	}

	skipCine() {
		if (!this.cine) return;
		this.cine.t = this.cine.dur;
	}

	update(dt) {
		const cam = this.cam;
		if (this.mode === 'cine' && this.cine) {
			const c = this.cine;
			c.t = Math.min(c.dur, c.t + dt);
			// zaman boyunca eşit hız değil: başta ve sonda yumuşak
			const k = c.keys;
			let i = 0;
			while (i < k.length - 2 && c.t > k[i + 1].t) i++;
			const seg = (c.t - k[i].t) / Math.max(1e-4, k[i + 1].t - k[i].t);
			const u = (i + easeInOut(clamp(seg, 0, 1))) / (k.length - 1);
			c.cp.getPoint(u, this.pos);
			c.cl.getPoint(u, this.look);
			const f0 = k[i].fov ?? this.baseFov;
			const f1 = k[i + 1].fov ?? this.baseFov;
			cam.fov = lerp(f0, f1, easeInOut(clamp(seg, 0, 1)));
			cam.updateProjectionMatrix();
			if (c.t >= c.dur) {
				this.mode = 'follow';
				this.cine = null;
				if (c.onDone) c.onDone();
			}
		} else if (this.mode === 'follow') {
			this.pos.x = damp(this.pos.x, this.tPos.x, 3.2, dt);
			this.pos.y = damp(this.pos.y, this.tPos.y, 3.6, dt);
			this.pos.z = damp(this.pos.z, this.tPos.z, 3.2, dt);
			this.look.x = damp(this.look.x, this.tLook.x, 5, dt);
			this.look.y = damp(this.look.y, this.tLook.y, 5, dt);
			this.look.z = damp(this.look.z, this.tLook.z, 5, dt);
			if (Math.abs(cam.fov - this.baseFov) > 0.01) {
				cam.fov = damp(cam.fov, this.baseFov, 3, dt);
				cam.updateProjectionMatrix();
			}
		}
		cam.position.copy(this.pos);
		if (this.shake > 0.001) {
			const s = this.shake;
			cam.position.x += (Math.random() - 0.5) * s;
			cam.position.y += (Math.random() - 0.5) * s;
			this.shake = damp(this.shake, 0, 6, dt);
		}
		cam.lookAt(this.look);
		cam.updateMatrixWorld();
	}
}

