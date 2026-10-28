// Sinematik anlar: kamera hareketleri ve haritadaki görsel tepkiler. Her yöntem bir Promise döner;
// maç akışı bunları bekler. Hızlı benzetimde (fast) hepsi anında biter.

import * as THREE from 'three';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const _v = new THREE.Vector3();

export class Cinema {
	constructor(app) {
		this.app = app;
		this.fast = false;
	}

	wait(ms) {
		return this.fast ? Promise.resolve() : sleep(ms);
	}

	async overview(map) {
		const app = this.app;
		app.board.clearFx();
		app.cam.fit(app.boundsOf(map), { pitch: 0.98 });
		await this.wait(900);
	}

	async castleDrop(p, i) {
		const app = this.app;
		const k = app.castles[p.i];
		const top = app.board.topAt(i, _v);
		app.board.fx(i, 0.25, 1);
		// kale yukarıdan iner
		if (!this.fast) {
			const t0 = performance.now();
			const y0 = top.y + 8;
			await new Promise((res) => {
				const step = () => {
					const t = Math.min(1, (performance.now() - t0) / 520);
					const e = 1 - Math.pow(1 - t, 3);
					k.group.position.set(top.x, y0 + (top.y - y0) * e, top.z);
					if (t < 1) requestAnimationFrame(step);
					else res();
				};
				step();
			});
			app.cam.shake = 0.35;
			app.sfx?.play?.('castle');
		}
		k.place(app.board.topAt(i, _v));
		await this.wait(250);
		app.board.fx(i, 0, 0);
	}

	async claim(p, i) {
		const b = this.app.board;
		b.fx(i, 0.6, 1);
		this.app.sfx?.play?.('claim');
		await this.wait(380);
		b.fx(i, 0, 0);
	}

	async attack(p, d, target, isCap) {
		const app = this.app;
		const t = app.board.provinces[target];
		app.board.fx(target, 0.35, 1);
		app.cam.focus(t.x, t.z + 1.5, { dist: isCap ? 20 : 26, pitch: isCap ? 0.62 : 0.8 });
		app.sfx?.play?.(isCap ? 'siege' : 'attack');
		await this.wait(700);
	}

	async conquer(p, i) {
		const app = this.app;
		app.board.fx(i, 1, 1);
		app.cam.shake = 0.5;
		app.sfx?.play?.('conquer');
		await this.wait(650);
		app.board.fx(i, 0, 0);
		await this.wait(250);
	}

	async towerDown(p, d, i, left) {
		const app = this.app;
		app.cam.shake = 0.8;
		app.sfx?.play?.('tower');
		await this.wait(900);
		app.board.fx(i, 0, 0);
	}

	async defend(d, i) {
		const app = this.app;
		app.board.fx(i, 0.15, 0.6);
		app.sfx?.play?.('defend');
		await this.wait(600);
		app.board.fx(i, 0, 0);
	}

	async nobody(i) {
		await this.wait(400);
		this.app.board.fx(i, 0, 0);
	}

	async eliminated(d, by) {
		this.app.cam.shake = 1;
		this.app.sfx?.play?.('eliminate');
		await this.wait(1200);
	}
}
