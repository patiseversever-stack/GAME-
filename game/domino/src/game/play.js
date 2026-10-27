// Oyun kuralları.
//
//   ready : kamera ilk taşta, "dokun ve başlat"
//   run   : zincir akıyor; boşluklara zincir gelmeden dokunup taş koy (son anda koymak "Mükemmel")
//   end   : zincir durdu; devrilen taş oranına göre yıldız
//
// Kare sırası: App.frame → Game.update(dt) → çizim.

import * as THREE from 'three';
import { LEVELS } from './levels.js';
import { ChainBuilder } from '../domino/chain.js';
import { ST } from '../domino/dominoes.js';

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

export class Game {
	constructor(app) {
		this.app = app;
		this.d = app.dominoes;
		this.dir = app.director;
		this.ui = app.ui;
		this.state = 'title';
		this.levelIndex = 0;
		this.L = null;
		this.info = null;
		this.slots = [];
		this.combo = 0;
		this.score = 0;
		this.front = new THREE.Vector3();
		this.frontYaw = 0;
		this.speed = 3; // zincirin ölçülen hızı (birim/sn)
		this._lastSeq = 0;
		this._lastSeqT = 0;
		this.endT = 0;
		this.timeScale = 1;
		this.shotIdx = 0;
		this.started = false;
		this.d.onHit = (i, j, w) => this._hit(i, j, w);
		this.d.onLand = (i, v) => this._land(i, v);
		this._clickT = 0;
	}

	/** Bölümü kur (dünya App tarafından kurulur, zincir burada). */
	setup(i) {
		const L = LEVELS[i % LEVELS.length];
		this.levelIndex = i % LEVELS.length;
		this.L = L;
		const d = this.d;
		d.clear();
		const b = new ChainBuilder(d);
		const info = L.build(b, d);
		this.info = info;
		this.roads = b.roads;
		this.slots = info.slots.map((s) => {
			d.setMissing(s.i, true);
			return { i: s.i, state: 'empty', x: d.x[s.i], z: d.z[s.i], yaw: d.yaw[s.i], w: d.w[s.i], h: d.h[s.i], t: d.t[s.i], seq: d.seq[s.i], eta: 99, glow: 0 };
		});
		d.finalize();
		this.app.ghosts.set(this.slots);
		this.total = d.n;
		this.combo = 0;
		this.score = 0;
		this.perfects = 0;
		this.started = false;
		this.shotIdx = 0;
		this.endT = 0;
		this.dir.shot = null;
		this.front.set(d.x[info.start], 0.6, d.z[info.start]);
		this.frontYaw = d.yaw[info.start];
		return { level: L, roads: b.roads };
	}

	ready() {
		this.state = 'ready';
		this.dir.follow(this.front, this.frontYaw);
		this.dir.shot = { dist: 9, height: 5.5, side: 1.05 };
		this.ui.level?.(this.L, this);
		this.ui.hint?.('Zinciri başlatmak için <em>dokun</em>');
	}

	start() {
		if (this.state !== 'ready') return;
		this.state = 'run';
		this.started = true;
		this.dir.shot = null;
		this.d.push(this.info.start, 3.4);
		this.ui.hint?.(null);
		this.app.sfx?.play?.('start');
	}

	/** Dünyaya dokunma (yer düzlemindeki nokta). */
	tap(x, z) {
		if (this.state === 'ready') return this.start();
		if (this.state !== 'run') return;
		// en yakın boş yuva
		let best = null;
		let bd = 3.2;
		for (const s of this.slots) {
			if (s.state !== 'empty') continue;
			const dd = Math.hypot(s.x - x, s.z - z);
			if (dd < bd) {
				bd = dd;
				best = s;
			}
		}
		if (!best) return;
		this._fill(best);
	}

	_fill(s) {
		if (!this.d.place(s.i)) return;
		s.state = 'filled';
		// zamanlama: zincir yuvaya ne kadar yakındı?
		const eta = s.eta;
		let text;
		let tone;
		if (eta < 0.75) {
			this.combo++;
			this.perfects++;
			text = this.combo > 1 ? `MÜKEMMEL ×${this.combo}` : 'MÜKEMMEL!';
			tone = 'gold';
			this.score += 300 * this.combo;
			this.dir.shake = Math.max(this.dir.shake, 0.35);
			this.slowmo = 0.5;
		} else if (eta < 2.0) {
			this.combo++;
			text = 'HARİKA!';
			tone = 'good';
			this.score += 150 * this.combo;
		} else {
			this.combo = 0;
			text = 'İYİ';
			tone = 'ok';
			this.score += 60;
		}
		const p = this._screen(s.x, s.h * 1.2, s.z);
		this.ui.pop?.(text, p.x, p.y, tone);
		this.app.sfx?.play?.('place', { perfect: tone === 'gold' });
		this.app.puffs.emit(s.x, 0.1, s.z, 0.9, 1, 1, 1, 6, 1.2, 0.5);
		navigator.vibrate?.(tone === 'gold' ? 25 : 12);
	}

	_hit(i, j, w) {
		// tıkırtı sesi: hız ve boyla perdelenir, çok sık tetiklenmesin
		const d = this.d;
		const now = this.app.time;
		if (now - this._clickT > 0.012) {
			this._clickT = now;
			this.app.sfx?.play?.('click', { size: d.h[j], speed: w });
		}
		if (d.h[j] > 1.6) {
			d.tip(i, _v);
			this.app.puffs.emit(_v.x, 0.2, _v.z, d.h[j] * 0.5, 1, 0.95, 0.85, 3, 0.4 * d.h[j], 0.8);
			this.dir.shake = Math.max(this.dir.shake, Math.min(1, d.h[j] * 0.08));
		}
	}

	_land(i, v) {
		const d = this.d;
		if (d.h[i] < 1.3 && Math.random() > 0.35) return;
		const s = Math.sin(d.yaw[i]);
		const c = Math.cos(d.yaw[i]);
		const r = d.h[i] * 0.9;
		this.app.puffs.emit(d.x[i] + s * r, 0.1, d.z[i] + c * r, 0.5 * d.h[i], 1, 0.96, 0.9, d.h[i] > 2 ? 8 : 2, 0.5 * d.h[i], 0.7);
		if (d.h[i] > 2.5) {
			this.dir.shake = Math.max(this.dir.shake, Math.min(1.2, d.h[i] * 0.12));
			this.app.sfx?.play?.('thud', { size: d.h[i] });
		}
	}

	_screen(x, y, z) {
		_w.set(x, y, z).project(this.app.camera);
		const r = this.app.canvas.getBoundingClientRect();
		return { x: (_w.x * 0.5 + 0.5) * r.width, y: (-_w.y * 0.5 + 0.5) * r.height };
	}

	update(dt) {
		const d = this.d;
		// yavaş çekim: mükemmel anlarda kısa süre
		if (this.slowmo > 0) {
			this.slowmo -= dt;
			this.timeScale = 0.45 + 0.55 * Math.max(0, 1 - this.slowmo / 0.5) ** 2;
		} else this.timeScale += (1 - this.timeScale) * Math.min(1, dt * 4);
		const sdt = dt * this.timeScale;
		if (this.state === 'run' || this.state === 'end') d.update(sdt);

		// zincirin ucu: düşmekte olan taşların ağırlık merkezi ve ortalama yönü
		let n = 0;
		let sx = 0;
		let sz = 0;
		let fx = 0;
		let fz = 0;
		let spread = 0;
		let maxSeq = -1;
		for (let a = 0; a < d.nActive; a++) {
			const i = d.active[a];
			if (d.st[i] !== ST.FALL) continue;
			const wgt = d.h[i];
			sx += d.x[i] * wgt;
			sz += d.z[i] * wgt;
			fx += Math.sin(d.yaw[i]) * wgt;
			fz += Math.cos(d.yaw[i]) * wgt;
			n += wgt;
			if (d.seq[i] > maxSeq) maxSeq = d.seq[i];
		}
		if (n > 0) {
			sx /= n;
			sz /= n;
			for (let a = 0; a < d.nActive; a++) {
				const i = d.active[a];
				if (d.st[i] !== ST.FALL) continue;
				spread = Math.max(spread, Math.hypot(d.x[i] - sx, d.z[i] - sz));
			}
			this.front.x += (sx - this.front.x) * Math.min(1, dt * 6);
			this.front.z += (sz - this.front.z) * Math.min(1, dt * 6);
			this.frontYaw = Math.atan2(fx, fz);
			// hız tahmini
			if (maxSeq > this._lastSeq) {
				const dtS = d.time - this._lastSeqT;
				if (dtS > 0.05) {
					const v = (maxSeq - this._lastSeq) / dtS;
					if (v < 30) this.speed += (v - this.speed) * 0.3;
					this._lastSeq = maxSeq;
					this._lastSeqT = d.time;
				}
			}
			this.frontSeq = maxSeq;
		}
		this.spread = spread;

		// çekimler: belirli taşa gelince kamera ayarı değişir
		const shots = this.info?.shots || [];
		while (this.shotIdx < shots.length && d.hitT[shots[this.shotIdx].at] >= 0) {
			this.dir.shot = shots[this.shotIdx];
			this.shotIdx++;
		}
		if (this.state === 'run' && spread > 3 && !(this.dir.shot && this.dir.shot.mode)) {
			this.dir.shot = { dist: 13 + spread * 0.9, height: 9 + spread * 0.6, side: 0.7 };
		}

		// yuvalar: varış süresi, görünüm, kaçırma
		const G = this.app.ghosts;
		for (let k = 0; k < this.slots.length; k++) {
			const s = this.slots[k];
			if (s.state === 'empty') {
				const ahead = s.seq - (this.frontSeq ?? -99);
				s.eta = this.started ? Math.max(0, ahead / Math.max(0.5, this.speed)) : 99;
				if (this.started && ahead < -1.2) {
					s.state = 'missed';
					this.combo = 0;
					const p = this._screen(s.x, 1.4, s.z);
					this.ui.pop?.('KAÇTI!', p.x, p.y, 'bad');
					this.app.sfx?.play?.('miss');
				}
				const near = this.started ? Math.max(0, Math.min(1, 1 - s.eta / 4)) : 0;
				G.state(k, 1, Math.sin(this.app.time * 6 + k) * 0.5 + 0.5, near, near > 0.75 ? 1 : near * 0.4);
			} else G.state(k, 0, 0, 0, 0);
		}
		G.flush();

		if (this.state === 'run') {
			this.ui.tick?.(this);
			if (this.started && d.nActive === 0) {
				this.state = 'end';
				this.endT = 0;
			}
		} else if (this.state === 'end') {
			this.endT += dt;
			if (this.endT > 1.0 && this.dir.mode !== 'end') {
				this.dir.mode = 'end';
				this._finish();
			}
		}
		this.app.G.uFocus.value.set(this.front.x, 0, this.front.z, 3);
	}

	_finish() {
		const pct = this.d.toppled / this.total;
		const stars = pct >= 0.995 ? 3 : pct >= 0.9 ? 2 : pct >= 0.7 ? 1 : 0;
		this.result = { pct, stars, score: this.score + this.d.toppled * 10, perfects: this.perfects, toppled: this.d.toppled, total: this.total };
		this.app.sfx?.play?.(stars > 0 ? 'win' : 'fail');
		setTimeout(() => this.ui.end?.(this.result, this.L), 900);
	}

	action(a) {
		if (a === 'play') this.app.loadLevel(this.levelIndex, true);
		else if (a === 'retry') this.app.loadLevel(this.levelIndex, true);
		else if (a === 'next') this.app.loadLevel(this.levelIndex + 1, true);
	}
}
