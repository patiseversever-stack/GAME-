// Sanal saat (sınama): setTimeout / setInterval / performance.now sanal zamanla çalışır. Bekleyen bütün işler (söz
// zincirleri) bitince en yakın zamanlayıcıya atlanır; 20 sn'lik Halat turu, 11 sn'lik Tufan filmi ve sunucunun tur
// zamanlaması gerçek zamanda beklemeden, ama gerçek sırasıyla oynanır. core/clock.js ve net.js zamanlayıcıları
// globalThis üzerinden aldığı için ikisi de sanal saate bağlanır.
//   const S = kur(); await S.surdur(m.run()); S.now() (ms) · S.kaldir() eski saati geri koyar.
const G = globalThis;

export function kur() {
	const real = { setTimeout: G.setTimeout, clearTimeout: G.clearTimeout, setInterval: G.setInterval, clearInterval: G.clearInterval, now: G.performance.now.bind(G.performance), setImmediate: G.setImmediate };
	let now = 0;
	let seq = 0;
	const q = new Map(); // id → { t, fn, args, every }
	const add = (fn, ms, args, every) => {
		const id = ++seq;
		q.set(id, { t: now + Math.max(0, Number(ms) || 0), fn, args, every, n: id });
		return id;
	};
	G.setTimeout = (fn, ms = 0, ...args) => add(fn, ms, args, 0);
	G.setInterval = (fn, ms = 0, ...args) => add(fn, ms, args, Math.max(1, Number(ms) || 1));
	G.clearTimeout = (id) => q.delete(id);
	G.clearInterval = (id) => q.delete(id);
	Object.defineProperty(G.performance, 'now', { value: () => now, configurable: true, writable: true });
	const tick = () => new Promise((r) => real.setImmediate(r));
	return {
		now: () => now,
		/** Söz bitene dek sanal zamanı sür. */
		async surdur(p, limitMs = 6 * 3600 * 1000) {
			let done = false;
			let err = null;
			let val;
			p.then(
				(v) => ((done = true), (val = v)),
				(e) => ((done = true), (err = e)),
			);
			while (!done) {
				await tick();
				if (done) break;
				if (!q.size) {
					await tick();
					if (!q.size && !done) throw new Error('sanal saat: bekleyen zamanlayıcı yok, söz bitmedi');
					continue;
				}
				let best = null;
				for (const e of q.values()) if (!best || e.t < best.t || (e.t === best.t && e.n < best.n)) best = e;
				const id = [...q.entries()].find(([, e]) => e === best)[0];
				now = Math.max(now, best.t);
				if (best.every) best.t = now + best.every;
				else q.delete(id);
				best.fn(...best.args);
				if (now > limitMs) throw new Error('sanal saat: süre sınırı aşıldı');
			}
			if (err) throw err;
			return val;
		},
		kaldir() {
			G.setTimeout = real.setTimeout;
			G.clearTimeout = real.clearTimeout;
			G.setInterval = real.setInterval;
			G.clearInterval = real.clearInterval;
			Object.defineProperty(G.performance, 'now', { value: real.now, configurable: true, writable: true });
		},
	};
}
