// Sınamalar için sahte dünya (çizim yok): gerçek il verisiyle harita, kale, sinema ve hızlı arayüz.
// test/kurallar.test.mjs ve test/net.test.mjs kullanır (test/sim.mjs kendi kopyasını taşır).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { WHEEL } from '../src/quiz/categories.js';

const here = dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(readFileSync(join(here, '../src/data/turkiye.json'), 'utf8'));

export class V3 {
	constructor(x = 0, y = 0, z = 0) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
	set(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
		return this;
	}
}

export function makeBoard() {
	const provinces = DATA.provinces.map((p, i) => ({ ...p, index: i, x: p.center[0], z: -p.center[1], owner: -1 }));
	const byId = new Map(provinces.map((p) => [p.id, p]));
	return {
		provinces,
		byId,
		count: provinces.length,
		region: (key) => provinces.filter((p) => p.region === key).map((p) => p.index),
		setOwner(i, p) {
			provinces[i].owner = p;
		},
		topAt: (i, out) => out.set(provinces[i].x, 0, provinces[i].z),
		pick(x, z) {
			let best = -1;
			let bd = 9;
			for (const p of provinces) {
				const d = Math.hypot(p.x - x, p.z - z);
				if (d < bd) {
					bd = d;
					best = p.index;
				}
			}
			return best;
		},
		fx() {},
		clearFx() {},
	};
}

export function makeCastle() {
	return {
		hp: 3,
		group: { visible: false },
		hit() {
			return --this.hp;
		},
		repair() {
			this.hp = 3;
		},
		place() {},
	};
}

export function memStore() {
	const m = {};
	return { get: (k) => m[k], set: (k, v) => (m[k] = JSON.parse(JSON.stringify(v))) };
}

export function makeApp(store = memStore()) {
	const noop = async () => {};
	return {
		V3,
		store,
		hooks: {},
		board: makeBoard(),
		castles: [0, 1, 2, 3].map(makeCastle),
		playerColors: [0xff3030, 0x2a6bff, 0xffbe12, 0x9b3dff],
		cinema: new Proxy({}, { get: () => noop }),
	};
}

/** Hızlı arayüz. hooks: { question(m, ctx), banner(title, sub), pick(m, options, text) } ile davranış değişir. */
export function makeUI(hooks = {}) {
	return {
		fast: true,
		hud() {},
		banner: async (...a) => hooks.banner?.(...a),
		toast: () => null,
		prompt() {},
		botPick: async () => {},
		ranking: async () => {},
		reveal: async () => {},
		wheel: async (m) => WHEEL[Math.floor(m.R() * WHEEL.length)],
		chooseCategory: async () => 'tarih',
		pickProvince: async (m, options, text) => (hooks.pick ? hooks.pick(m, options, text) : options[Math.floor(m.R() * options.length)]),
		jokers() {},
		end: async (m, ranking, rewards) => ({ ranking, rewards }),
		async question(m, ctx) {
			if (hooks.question) return hooks.question(m, ctx);
			if (!ctx.human) return { human: null };
			const b = ctx.T.bot(ctx.v, 0.6, m.R);
			return { human: { value: b.value, time: b.time } };
		},
	};
}
