// Kamera: masa üstü haritaya eğik bakış. Odak noktası, uzaklık, yön ve eğim yumuşakça hedeflerine
// kayar (kritik sönümlü), parmakla kaydırma ve iki parmakla yakınlaştırma desteklenir.
//
//   orbit : başlık ekranı, haritanın üstünde ağır dönüş
//   fit   : bir bölgeyi ya da bütün haritayı ekrana sığdır
//   focus : bir ile sinematik yaklaşma (saldırı, kuşatma)

import * as THREE from 'three';

const _v = new THREE.Vector3();

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
		this.shake = 0;
		this.aspect = 1;
		this.bounds = null;
	}

	setAspect(a) {
		this.aspect = a;
		if (this.bounds && this.mode === 'fit') this.fit(this.bounds, this._fitOpt);
	}

	/** Dikdörtgen bölgeyi (dünya x/z) ekrana sığdır. */
	fit(b, { pitch = 0.98, yaw = 0, pad = 1.12 } = {}) {
		this.mode = 'fit';
		this.bounds = b;
		this._fitOpt = { pitch, yaw, pad };
		this.goal.set((b.x0 + b.x1) / 2, 0, (b.z0 + b.z1) / 2);
		const w = (b.x1 - b.x0) * pad;
		const d = (b.z1 - b.z0) * pad;
		const vfov = THREE.MathUtils.degToRad(this.cam.fov);
		const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.aspect);
		// eğik bakışta derinlik ekranda kısalır: sin(eğim)
		const needH = (d * Math.sin(pitch)) / 2 / Math.tan(vfov / 2);
		const needW = w / 2 / Math.tan(hfov / 2);
		this.distTo = Math.max(needH, needW) + 2;
		this.pitchTo = pitch;
		this.yawTo = yaw;
	}

	focus(x, z, { dist = 18, pitch = 0.78, yaw = null } = {}) {
		this.mode = 'focus';
		this.goal.set(x, 0, z);
		this.distTo = dist;
		this.pitchTo = pitch;
		if (yaw != null) this.yawTo = yaw;
	}

	/** Kullanıcı kaydırması: ekran pikseli → dünya kayması. */
	pan(dx, dy, h) {
		// parmak sağa → harita sağa (odak sola); parmak aşağı → harita bize doğru (odak kuzeye)
		const s = (this.dist * 0.9) / h;
		const c = Math.cos(this.yaw);
		const sn = Math.sin(this.yaw);
		const fz = dy * s / Math.max(0.45, Math.sin(this.pitch));
		this.goal.x -= dx * s * c - fz * sn;
		this.goal.z -= fz * c + dx * s * sn;
		this.mode = 'free';
	}

	zoom(f) {
		this.distTo = THREE.MathUtils.clamp(this.distTo * f, 8, 140);
	}

	update(dt) {
		this.t += dt;
		if (this.mode === 'orbit') {
			this.yawTo = Math.sin(this.t * 0.08) * 0.35;
			this.goal.set(Math.sin(this.t * 0.05) * 6, 0, 2);
			this.distTo = 84;
			this.pitchTo = 0.9;
		}
		const k = 1 - Math.exp(-this.k * dt);
		this.target.lerp(this.goal, k);
		this.dist += (this.distTo - this.dist) * k;
		this.yaw += (this.yawTo - this.yaw) * k;
		this.pitch += (this.pitchTo - this.pitch) * k;
		const c = this.cam;
		const cp = Math.cos(this.pitch);
		c.position.set(
			this.target.x - Math.sin(this.yaw) * cp * this.dist,
			this.target.y + Math.sin(this.pitch) * this.dist,
			this.target.z + Math.cos(this.yaw) * cp * this.dist,
		);
		if (this.shake > 0) {
			const s = this.shake * this.shake * 0.3;
			c.position.x += (Math.random() - 0.5) * s;
			c.position.y += (Math.random() - 0.5) * s;
			this.shake = Math.max(0, this.shake - dt * 2);
		}
		c.lookAt(_v.copy(this.target));
		c.updateMatrixWorld();
	}
}
