// Domino taşları: binlerce taş tek çizimde (örneklemeli geometri), devrilme ekran kartında.
//
// Her taşın sabit bilgisi (konum, yön, boyut, iki yüz rengi) bir kez yüklenir. Kare başına
// yalnızca hareket eden taşların açısı (4 bayt) güncellenir; dönüşü vertex shader yapar.
// Böylece 5000 taşlık şehir bile düşük telefonda tek çizim çağrısı ve birkaç KB yükleme.
//
// Fizik: taş ön alt kenarı üzerinde dönen bir çubuk gibi düşer (θ'' = K·sin θ, K = 1.5g/h).
// Ucu sonraki taşa değince onu iter, kendisi ona yaslanır; yaslanma açısı öndeki taşın
// açısını izler. Gerçek domino dizisindeki gibi taşlar birbirinin üstüne yatar, sonuncusu
// yere kapanır. Bütün hesap yalnızca hareketli taşlar üzerinde döner.

import * as THREE from 'three';
import { createDominoLook } from './look.js';

export const ST = { STAND: 0, FALL: 1, LEAN: 2, DOWN: 3, MISSING: 5 };

const HALF_PI = Math.PI / 2;

export class Dominoes {
	/**
	 * @param {object} G ortak uniform'lar
	 * @param {number} cap en çok taş sayısı
	 * @param {object} tier kalite kademesi
	 */
	constructor(G, cap, tier) {
		this.G = G;
		this.cap = cap;
		this.n = 0;
		this.gravity = 7; // oyun yerçekimi (tempo): büyük taş daha ağır düşer
		this.x = new Float32Array(cap);
		this.y = new Float32Array(cap);
		this.z = new Float32Array(cap);
		this.yaw = new Float32Array(cap);
		this.w = new Float32Array(cap);
		this.h = new Float32Array(cap);
		this.t = new Float32Array(cap);
		this.st = new Uint8Array(cap);
		this.ang = new Float32Array(cap);
		this.vel = new Float32Array(cap);
		this.nextA = new Int32Array(cap).fill(-1);
		this.nextB = new Int32Array(cap).fill(-1);
		this.reachA = new Float32Array(cap);
		this.reachB = new Float32Array(cap);
		// yumuşak bağ: yalnızca tetikler, yaslanılmaz (resim alanında yana yayılma gibi)
		this.softA = new Uint8Array(cap);
		this.softB = new Uint8Array(cap);
		this.contact = new Float32Array(cap); // dokunduğu andaki açı
		this.rest = new Float32Array(cap); // yaslanınca varacağı açı
		this.lean = new Int32Array(cap).fill(-1);
		this.seq = new Float32Array(cap); // zincir boyunca uzaklık (varış süresi tahmini için)
		this.hitT = new Float32Array(cap).fill(-1);
		this.flash = new Float32Array(cap);
		this.lift = new Float32Array(cap);
		this.liftV = new Float32Array(cap);
		this.tag = new Int32Array(cap).fill(-1); // bölüm tarafının işareti (boşluk, makas…)
		this.active = new Int32Array(cap);
		this.nActive = 0;
		this.inActive = new Uint8Array(cap);
		this.time = 0;
		this.toppled = 0; // itilen taş sayısı (skor)
		this.onHit = null; // (i, j, speed) taş taşa çarptı
		this.onLand = null; // (i, speed) taş yere kapandı
		this.front = -1; // en son itilen taş
		this.frontT = -1;

		const geo = new THREE.InstancedBufferGeometry();
		const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
		geo.index = box.index;
		geo.setAttribute('position', box.getAttribute('position'));
		geo.setAttribute('normal', box.getAttribute('normal'));
		this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
		this.aYaw = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
		this.aDim = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
		this.aColA = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
		this.aColB = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
		this.aAnim = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
		this.aAnim.setUsage(THREE.DynamicDrawUsage);
		// malzeme türü: 0 cilalı boya, 1 altın, 2 cam, 3 neon (görünüm look.js'te)
		this.aMat = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
		geo.setAttribute('iPos', this.aPos);
		geo.setAttribute('iYaw', this.aYaw);
		geo.setAttribute('iDim', this.aDim);
		geo.setAttribute('iColA', this.aColA);
		geo.setAttribute('iColB', this.aColB);
		geo.setAttribute('iAnim', this.aAnim);
		geo.setAttribute('iMat', this.aMat);
		geo.instanceCount = 0;
		this.geo = geo;
		this._dirtyLo = cap;
		this._dirtyHi = -1;

		const look = createDominoLook(G, tier, geo);
		this.mesh = look.mesh;
		this.shadowMesh = look.shadowMesh;
		this.mat = look.mesh.material;
	}

	clear() {
		this.n = 0;
		this.nActive = 0;
		this.inActive.fill(0);
		this.nextA.fill(-1);
		this.nextB.fill(-1);
		this.softA.fill(0);
		this.softB.fill(0);
		this.lean.fill(-1);
		this.hitT.fill(-1);
		this.tag.fill(-1);
		this.toppled = 0;
		this.front = -1;
		this.frontT = -1;
		this.time = 0;
		this.geo.instanceCount = 0;
	}

	/** Taş ekle. yaw: düşme yönü, size: boy çarpanı, mat: malzeme türü. Dönen: indeks. */
	add(x, z, yaw, size, colA, colB, y = 0, mat = 0) {
		const i = this.n++;
		if (i >= this.cap) throw new Error('domino kapasitesi aşıldı');
		this.x[i] = x;
		this.y[i] = y;
		this.z[i] = z;
		this.yaw[i] = yaw;
		this.w[i] = 0.5 * size;
		this.h[i] = 1.0 * size;
		this.t[i] = 0.16 * size;
		this.st[i] = ST.STAND;
		this.ang[i] = 0;
		this.vel[i] = 0;
		this.flash[i] = 0;
		this.lift[i] = 0;
		this.liftV[i] = 0;
		this.aPos.array.set([x, y, z], i * 3);
		this.aYaw.array[i] = yaw;
		this.aDim.array.set([this.w[i], this.h[i], this.t[i]], i * 3);
		this.aColA.array.set([colA.r, colA.g, colA.b], i * 3);
		this.aColB.array.set([colB.r, colB.g, colB.b], i * 3);
		this.aAnim.array.set([0, 0, 0, 1], i * 4);
		this.aMat.array[i] = mat;
		return i;
	}

	/**
	 * a'nın sonraki taşı b (çatal için ikinci çağrı nextB'yi doldurur).
	 * reach verilirse temas açısı odur; soft bağ yalnızca tetikler (a, b'ye yaslanmaz).
	 */
	link(a, b, { reach = null, soft = false } = {}) {
		const gap = this.gapBetween(a, b);
		const r = reach ?? (gap >= this.h[a] ? 9 : Math.asin(Math.max(0.02, gap) / this.h[a]));
		if (this.nextA[a] < 0) {
			this.nextA[a] = b;
			this.reachA[a] = r;
			this.softA[a] = soft ? 1 : 0;
		} else {
			this.nextB[a] = b;
			this.reachB[a] = r;
			this.softB[a] = soft ? 1 : 0;
		}
	}

	/** a'nın ön yüzü ile b'nin arka yüzü arasındaki boşluk (a'nın düşme yönünde). */
	gapBetween(a, b) {
		const fa = [Math.sin(this.yaw[a]), Math.cos(this.yaw[a])];
		const fb = [Math.sin(this.yaw[b]), Math.cos(this.yaw[b])];
		const ax = this.x[a] + fa[0] * this.t[a] * 0.5;
		const az = this.z[a] + fa[1] * this.t[a] * 0.5;
		const bx = this.x[b] - fb[0] * this.t[b] * 0.5;
		const bz = this.z[b] - fb[1] * this.t[b] * 0.5;
		return (bx - ax) * fa[0] + (bz - az) * fa[1];
	}

	/** Taşı kayıp (boşluk) yap: görünmez, zincir buradan geçemez. */
	setMissing(i, on) {
		this.st[i] = on ? ST.MISSING : ST.STAND;
		this.aAnim.array[i * 4 + 3] = on ? 0 : 1;
		this._dirty(i);
	}

	/** Boşluğa taş koy: yukarıdan düşüp zıplayarak yerine oturur. */
	place(i) {
		if (this.st[i] !== ST.MISSING) return false;
		this.st[i] = ST.STAND;
		this.lift[i] = 2.6 * this.h[i];
		this.liftV[i] = 0;
		this.flash[i] = 1;
		this.aAnim.array[i * 4 + 3] = 1;
		this._activate(i);
		return true;
	}

	finalize() {
		this.geo.instanceCount = this.n;
		for (const a of [this.aPos, this.aYaw, this.aDim, this.aColA, this.aColB, this.aAnim, this.aMat]) {
			a.clearUpdateRanges();
			a.needsUpdate = true;
		}
	}

	/** Zinciri başlat: i taşına ileri doğru itiş. */
	push(i, omega = 3.2) {
		if (this.st[i] !== ST.STAND) return;
		this._trigger(i, omega, -1);
	}

	_trigger(i, omega, from) {
		this.st[i] = ST.FALL;
		this.vel[i] = omega;
		this.ang[i] = Math.max(this.ang[i], 0.04);
		this.hitT[i] = this.time;
		this.toppled++;
		this.flash[i] = 0.55;
		this.front = i;
		this.frontT = this.time;
		this._activate(i);
		if (this.onHit && from >= 0) this.onHit(from, i, omega);
	}

	_activate(i) {
		if (this.inActive[i]) return;
		this.inActive[i] = 1;
		this.active[this.nActive++] = i;
	}

	_dirty(i) {
		if (i < this._dirtyLo) this._dirtyLo = i;
		if (i > this._dirtyHi) this._dirtyHi = i;
	}

	update(dt) {
		this.time += dt;
		const A = this.aAnim.array;
		let k = 0;
		for (let a = 0; a < this.nActive; a++) {
			const i = this.active[a];
			let live = false;
			const s = this.st[i];
			if (s === ST.FALL) {
				live = true;
				const K = (1.5 * this.gravity) / this.h[i];
				this.vel[i] += K * Math.sin(this.ang[i] + 0.12) * dt;
				this.ang[i] += this.vel[i] * dt;
				// sonraki taşlara değdi mi? (çatalda iki taş birden itilir)
				this._reach(i);
				if (this.st[i] === ST.FALL && this.ang[i] >= HALF_PI) {
					// yere kapandı: küçük sekme
					this.ang[i] = HALF_PI;
					const v = this.vel[i];
					if (v > 1.2) {
						this.vel[i] = -v * 0.22;
						if (this.onLand) this.onLand(i, v);
					} else {
						this.vel[i] = 0;
						this.st[i] = ST.DOWN;
						live = false;
					}
				}
			} else if (s === ST.LEAN) {
				// öndeki taşın açısını izleyerek yaslan
				const j = this.lean[i];
				const pj = Math.min(1, this.ang[j] / 1.25);
				const target = this.contact[i] + (this.rest[i] - this.contact[i]) * pj;
				this.ang[i] += (target - this.ang[i]) * (1 - Math.exp(-28 * dt));
				live = Math.abs(target - this.ang[i]) > 0.003 || this.st[j] === ST.FALL;
				// çatalın öteki kolu yaslanırken de itilebilir
				this._reach(i);
			} else if (s === ST.STAND && this.lift[i] > 0) {
				// yerine düşen taş: yerçekimi + sekme
				live = true;
				this.liftV[i] -= 60 * dt;
				this.lift[i] += this.liftV[i] * dt;
				if (this.lift[i] <= 0) {
					this.lift[i] = 0;
					if (this.liftV[i] < -4) this.liftV[i] *= -0.28;
					else this.liftV[i] = 0;
				}
				live = this.lift[i] > 0 || this.liftV[i] !== 0;
			}
			if (this.flash[i] > 0) {
				this.flash[i] = Math.max(0, this.flash[i] - dt * 3.5);
				live = live || this.flash[i] > 0;
			}
			A[i * 4] = this.ang[i];
			A[i * 4 + 1] = this.lift[i];
			A[i * 4 + 2] = this.flash[i];
			this._dirty(i);
			if (live) this.active[k++] = i;
			else this.inActive[i] = 0;
		}
		this.nActive = k;
		if (this._dirtyHi >= this._dirtyLo) {
			this.aAnim.clearUpdateRanges();
			this.aAnim.addUpdateRange(this._dirtyLo * 4, (this._dirtyHi - this._dirtyLo + 1) * 4);
			this.aAnim.needsUpdate = true;
			this._dirtyLo = this.cap;
			this._dirtyHi = -1;
		}
	}

	/** i'nin ucu sonraki taşlara yetişti mi? Düşen taş ilk değdiğine yaslanır, ötekini de iter. */
	_reach(i) {
		const na = this.nextA[i];
		const nb = this.nextB[i];
		if (na >= 0 && this.ang[i] >= this.reachA[i]) this._contact(i, na, this.softA[i]);
		if (nb >= 0 && this.ang[i] >= this.reachB[i]) this._contact(i, nb, this.softB[i]);
	}

	_contact(i, n, soft) {
		if (this.st[n] === ST.MISSING || this.hitT[n] >= 0) {
			// boşluk ya da zaten devrilmiş: devrilmişse ona yaslan
			if (this.st[n] !== ST.MISSING && !soft && this.st[i] === ST.FALL) this._touch(i, n);
			return;
		}
		if (soft || this.st[i] !== ST.FALL) {
			if (this.st[n] === ST.STAND) this._trigger(n, Math.max(1.5, this.vel[i] * 0.78), i);
		} else this._touch(i, n);
	}

	_touch(i, j) {
		const sj = this.st[j];
		if (sj === ST.MISSING) return; // boşluk: uç havada kalır, taş yere düşer
		this.st[i] = ST.LEAN;
		this.lean[i] = j;
		this.contact[i] = this.ang[i];
		const D = this.gapBetween(i, j) + this.t[i];
		this.rest[i] = Math.min(1.45, Math.asin(Math.min(1, D / this.h[i])) + 0.5);
		if (sj === ST.STAND) {
			// itiş: açısal hız boy oranıyla aktarılır (büyük taş daha yavaş başlar)
			const w = Math.max(1.5, this.vel[i] * Math.sqrt(this.h[i] / this.h[j]) * 0.78);
			this._trigger(j, w, i);
			// çatal: öteki kol da aynı anda itilir (taş birine yaslanınca ötekine yetişemeyebilir)
			const o = this.nextA[i] === j ? this.nextB[i] : this.nextA[i];
			const os = this.nextA[i] === j ? this.softB[i] : this.softA[i];
			if (o >= 0 && !os && this.st[o] === ST.STAND && this.hitT[o] < 0) this._trigger(o, w, i);
		}
	}

	/** i taşının ucunun yaklaşık dünya konumu (kamera ve parçacıklar için). */
	tip(i, out) {
		const a = this.ang[i];
		const h = this.h[i] * 0.75;
		const s = Math.sin(this.yaw[i]);
		const c = Math.cos(this.yaw[i]);
		out.set(this.x[i] + s * Math.sin(a) * h, this.y[i] + Math.cos(a) * h + this.lift[i], this.z[i] + c * Math.sin(a) * h);
		return out;
	}
}
