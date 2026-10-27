// Sinematik kamera yönetmeni.
//
//   orbit  : başlık ekranı, ada etrafında ağır tur
//   follow : zincirin ucunu izler; yön değişimlerini yumuşatır, biraz ileriye bakar
//   end    : bitişte geri çekilip yükselir, şehri bütün olarak gösterir
//
// Bütün hareket kritik sönümlü yaklaşmayla: sarsıntısız, kare hızından bağımsız.

import * as THREE from 'three';
import { damp } from '../core/math.js';

const _v = new THREE.Vector3();

export class Director {
	constructor(camera) {
		this.cam = camera;
		this.mode = 'orbit';
		this.t = 0;
		this.pos = new THREE.Vector3(40, 34, 40);
		this.look = new THREE.Vector3(0, 0, 0);
		this.dir = 0; // takip edilen yön açısı (yumuşatılmış)
		this.dist = 10.5;
		this.height = 11;
		this.side = 0.6; // yandan bakış açısı (radyan)
		this.shot = null; // geçici çekim ayarı {dist, height, side}
		this.shake = 0;
		this.portrait = 1;
		this._goalPos = new THREE.Vector3();
		this._goalLook = new THREE.Vector3();
		this.ease = 0;
	}

	setAspect(a) {
		this.portrait = a < 1 ? THREE.MathUtils.clamp(1 / a, 1, 2.3) : 1;
	}

	update(dt, front, frontYaw) {
		this.t += dt;
		const c = this.cam;
		if (this.mode === 'free') return; // geliştirme: kamera elle konumlandı
		if (this.mode === 'orbit') {
			const a = this.t * 0.07 + 0.6;
			const r = 52 + 10 * (this.portrait - 1);
			this._goalPos.set(Math.cos(a) * r, 30 + 6 * (this.portrait - 1), Math.sin(a) * r);
			this._goalLook.set(0, -2, 0);
			this.pos.lerp(this._goalPos, 1 - Math.exp(-2.5 * dt));
			this.look.lerp(this._goalLook, 1 - Math.exp(-2.5 * dt));
		} else if (this.mode === 'follow' || this.mode === 'end') {
			// yönü yumuşat (en kısa açı farkı)
			let d = frontYaw - this.dir;
			d = Math.atan2(Math.sin(d), Math.cos(d));
			this.dir += d * (1 - Math.exp(-1.6 * dt));
			const s = this.shot || {};
			const pk = this.portrait;
			// çekim değişince uzaklık ve yükseklik yavaşça yeni değerine kayar
			this.dist = damp(this.dist, s.dist ?? 10.5, 1.1, dt);
			this.height = damp(this.height, s.height ?? 11, 1.1, dt);
			this.side = damp(this.side, s.side ?? 0.6, 1.1, dt);
			const dist = this.dist * (0.75 + 0.25 * pk);
			const height = this.height * (0.8 + 0.2 * pk);
			const side = this.side;
			const fx = Math.sin(this.dir);
			const fz = Math.cos(this.dir);
			// ileriye bakış: zincirin gideceği yeri görelim
			this._goalLook.set(front.x + fx * 2.2, front.y * 0.5, front.z + fz * 2.2);
			const back = Math.cos(side);
			const lat = Math.sin(side);
			this._goalPos.set(
				this._goalLook.x - fx * dist * back + fz * dist * lat,
				height,
				this._goalLook.z - fz * dist * back - fx * dist * lat,
			);
			if (this.mode === 'end') {
				this._goalPos.y += 10;
				this._goalPos.x += (this._goalPos.x - this._goalLook.x) * 0.6;
				this._goalPos.z += (this._goalPos.z - this._goalLook.z) * 0.6;
			}
			const kl = this.ease < 1 ? 1.5 + 2.5 * this.ease : 4.0;
			this.ease = Math.min(1, this.ease + dt * 0.6);
			this.look.lerp(this._goalLook, 1 - Math.exp(-kl * dt));
			this.pos.lerp(this._goalPos, 1 - Math.exp(-kl * 0.62 * dt));
		}
		c.position.copy(this.pos);
		if (this.shake > 0) {
			const k = this.shake * this.shake * 0.35;
			c.position.x += (Math.random() - 0.5) * k;
			c.position.y += (Math.random() - 0.5) * k;
			c.position.z += (Math.random() - 0.5) * k;
			this.shake = Math.max(0, this.shake - dt * 2.2);
		}
		_v.copy(this.look);
		c.lookAt(_v);
		c.updateMatrixWorld();
	}

	follow(front, yaw) {
		this.mode = 'follow';
		this.dir = yaw;
		this.ease = 0;
		this._goalLook.copy(front);
	}
}
