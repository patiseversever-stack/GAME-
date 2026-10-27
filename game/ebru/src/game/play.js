// Oyun kuralları: kandil kayığını limana ulaştır, kara mürekkep alevi söndürmesin.
//
// Kontroller:
//   sürükle → su parmağın hızıyla akar, kayık ve boyalar akıntıya kapılır
//   dokun   → seçili boyadan bir damla açılır; damla çevresindeki her şeyi halka halka iter
//
// Kare sırası (App.frame): input → Game.update(dt) → [içeride fluid.step] → çizim.

import { LEVELS, PALETTES, A } from './levels.js';
import { rng, clamp } from '../core/math.js';
import { applyPalette } from '../gfx/water.js';

const DROP_R = 0.07;
const DROP_DUR = 0.45;

export class Game {
	constructor(app) {
		this.app = app;
		this.fluid = app.fluid;
		this.boat = app.boat;
		this.harbor = app.harbor;
		this.leaves = app.leaves;
		this.ui = app.ui;
		this.state = 'title';
		this.levelIndex = 0;
		this.L = null;
		this.t = 0;
		this.color = 0;
		this.dropsUsed = 0;
		this.got = 0;
		this.inkExp = 0;
		this._tmp = { x: 0, y: 0 };
		this._probe = [];
		for (let i = 0; i < 32; i++) this._probe.push({ x: 0, y: 0, r: 0.02 });
		this.nextDrip = 0;
		this.dripRnd = rng(1);
		this.endT = 0;
	}

	startLevel(i) {
		const L = LEVELS[i % LEVELS.length];
		this.levelIndex = i % LEVELS.length;
		this.L = L;
		const P = PALETTES[L.palette];
		const f = this.fluid;
		f.reset();
		applyPalette(this.app.waterMat, P);
		this.app.backdrop.setPalette(L.colors.map((c) => P.pal[c]));

		// ustanın hazırlığı: battal taşları, sonra tarak
		const p = L.prep;
		const rnd = rng(p.seed);
		for (let k = 0; k < p.stones; k++) {
			const x = rnd.range(0.03, 0.97);
			const y = rnd.range(0.03, A - 0.03);
			f.drop(x, y, rnd.range(p.rMin, p.rMax), rnd.pick(p.colors), 0);
		}
		for (const c of p.combs || []) f.comb(...c);
		for (const k of L.inks) f.drop(k[0], k[1], k[2], 6, 0);

		this.boat.place(L.boat[0], L.boat[1]);
		this.harbor.place(L.harbor[0], L.harbor[1], L.harbor[2]);
		this.leaves.set(L.leaves.map(([x, y]) => ({ x, y })));
		// hazırlık damlaları iterken nesneler henüz yoktu: başlangıçta mürekkebin altında kalmasınlar
		this.t = 0;
		this.color = L.colors[0];
		this.dropsUsed = 0;
		this.got = 0;
		this.inkExp = 0;
		this.endT = 0;
		this.dripRnd = rng(p.seed * 7 + 3);
		this.nextDrip = L.drip ? L.drip.every : Infinity;
		this.state = 'play';
		this.ui.level(L, this);
	}

	/** Parmak sürüklemesi (tekne koordinatı). */
	drag(ax, ay, bx, by, vx, vy) {
		if (this.state !== 'play') return;
		this.fluid.stroke(ax, ay, bx, by, vx, vy, 0.055, 0.85);
	}

	/** Dokunma: damla. */
	tap(x, y) {
		if (this.state !== 'play') return;
		if (x < 0 || x > 1 || y < 0 || y > A) return;
		this.fluid.drop(x, y, DROP_R, this.color, DROP_DUR);
		this.dropsUsed++;
		this.app.sfx?.play?.('drop');
	}

	selectColor(c) {
		this.color = c;
	}

	update(dt) {
		const f = this.fluid;
		this.t += dt;
		const playing = this.state === 'play';
		if (playing && this.L.drip && this.t >= this.nextDrip) {
			this.nextDrip = this.t + this.L.drip.every;
			this._drip();
		}

		f.step(dt);

		// nesneler: akıntıya kapıl, damla ve tarak itişleriyle kay
		const s = f.sample;
		const b = this.boat;
		if (playing || this.state === 'won') {
			this._float(b, s.vx[0], s.vy[0], 7, dt, b.r);
			for (let i = 0; i < this.leaves.list.length; i++) {
				const l = this.leaves.list[i];
				if (l.got) {
					l.t += dt;
					continue;
				}
				this._float(l, s.vx[i + 1], s.vy[i + 1], 10, dt, 0.014);
				if (playing && Math.hypot(l.x - b.x, l.y - b.y) < b.r + 0.016) {
					l.got = true;
					l.t = 0;
					this.got++;
					this.ui.leaf(this.got, this.leaves.list.length);
					this.app.sfx?.play?.('leaf');
				}
			}
		}

		if (playing) {
			// kara mürekkep: alev titrer, uzun kalırsa söner
			const ink = s.inkMax[0];
			if (ink > 0.5) this.inkExp += dt;
			else this.inkExp = Math.max(0, this.inkExp - dt * 0.6);
			b.life = clamp(1 - this.inkExp / 0.45, 0, 1);
			if (b.life <= 0) this._end(false);
			// liman
			const d = Math.hypot(b.x - this.harbor.x, b.y - this.harbor.y);
			if (d < this.harbor.r * 0.7) this._end(true);
			this.ui.tick(this);
		} else if (this.state === 'won') {
			this.endT += dt;
			b.x += (this.harbor.x - b.x) * (1 - Math.exp(-3 * dt));
			b.y += (this.harbor.y - b.y) * (1 - Math.exp(-3 * dt));
			this.harbor.mat.uniforms.uPulse.value = Math.min(1, this.endT * 2) * (1 - Math.min(1, this.endT / 3));
		} else if (this.state === 'lost') {
			this.endT += dt;
		}

		// yoklama: kayık + varaklar (sonuç bir iki kare sonra gelir)
		const pr = this._probe;
		pr[0].x = b.x;
		pr[0].y = b.y;
		pr[0].r = b.r * 0.75;
		let n = 1;
		for (const l of this.leaves.list) {
			pr[n].x = l.x;
			pr[n].y = l.y;
			pr[n].r = 0.01;
			n++;
		}
		f.probe(pr.slice(0, n));

		b.sync(this.t);
		this.leaves.sync(this.t);
		const W = this.app.waterMat.uniforms;
		W.uGlow.value.set(b.x, b.y / A, 0.9 * b.life, 0.13);
	}

	_float(o, wvx, wvy, k, dt, r) {
		const e = 1 - Math.exp(-k * dt);
		o.vx += (wvx - o.vx) * e;
		o.vy += (wvy - o.vy) * e;
		o.x += o.vx * dt;
		o.y += o.vy * dt;
		this.fluid.displace(o.x, o.y, this._tmp);
		o.x = this._tmp.x;
		o.y = this._tmp.y;
		const m = r + 0.006;
		if (o.x < m) {
			o.x = m;
			o.vx = Math.abs(o.vx) * 0.3;
		} else if (o.x > 1 - m) {
			o.x = 1 - m;
			o.vx = -Math.abs(o.vx) * 0.3;
		}
		if (o.y < m) {
			o.y = m;
			o.vy = Math.abs(o.vy) * 0.3;
		} else if (o.y > A - m) {
			o.y = A - m;
			o.vy = -Math.abs(o.vy) * 0.3;
		}
	}

	/** Mürekkep hokkası damlatır: kayıktan uzak bir yere kara damla düşer. */
	_drip() {
		const r = this.dripRnd;
		const b = this.boat;
		for (let k = 0; k < 12; k++) {
			const x = r.range(0.1, 0.9);
			const y = r.range(0.15, A - 0.15);
			if (Math.hypot(x - b.x, y - b.y) < 0.28) continue;
			if (Math.hypot(x - this.harbor.x, y - this.harbor.y) < 0.2) continue;
			this.fluid.drop(x, y, this.L.drip.r, 6, 0.7);
			this.app.sfx?.play?.('ink');
			this.ui.toast('Hokkadan mürekkep damladı');
			return;
		}
	}

	_end(won) {
		this.state = won ? 'won' : 'lost';
		this.endT = 0;
		const stars = won ? 1 + (this.t <= this.L.par ? 1 : 0) + (this.got === this.leaves.list.length ? 1 : 0) : 0;
		this.result = { won, stars, time: this.t, got: this.got, total: this.leaves.list.length, drops: this.dropsUsed };
		this.app.sfx?.play?.(won ? 'win' : 'fail');
		setTimeout(() => this.ui.end(this.result, this.L), won ? 1400 : 900);
	}

	action(a) {
		if (a === 'play') this.startLevel(this.levelIndex);
		else if (a === 'retry') this.startLevel(this.levelIndex);
		else if (a === 'next') this.startLevel(this.levelIndex + 1);
		else if (a.startsWith('color:')) this.selectColor(Number(a.slice(6)));
	}
}
