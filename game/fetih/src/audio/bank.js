// Ses bankası: pişirilmiş efektleri ve müzik döngülerini saklar, pişirme işlerini tek tek (sırayla) çalıştırır.
//
// - Tek iş aynı anda: telefonda kare hızını bozmasın; işler arasında kısa bekleme.
// - Öncelik: 0 şimdi gerekli müzik · 1 canlı çalınıp tamponu henüz hazır olmayan efekt · 2 temel efektler ·
//   3 sıradaki olası müzik · 4 kalan efektler.
// - Gizli sayfada beklenir. Pişirme başarısız olursa (bağlam yok, bellek) o ses bir daha denenmez; efekt canlı çalınmaya
//   devam eder, müzik sessiz kalır (oyun etkilenmez).
// - Müzik döngüleri bellek tavanını aşınca en eski kullanılan (çalmayan) döngü atılır; gerekirse yeniden pişirilir.
import { canBake, renderSfx, renderTheme, sfxToBuffer, toBuffers } from './bake.js';

const gap = (ms) => new Promise((r) => (typeof setTimeout === 'function' ? setTimeout(r, ms) : r()));

export class Bank {
	constructor({ low = false, can = true } = {}) {
		this.low = low;
		this.can = can && canBake();
		this.sfx = new Map(); // anahtar → {buf, dur, gain}
		this.music = new Map(); // tema → {stems, len, sr, sync, hot, bytes, used}
		this.q = [];
		this.run = null;
		this.fail = new Set();
		this.waiters = new Map();
		this.paused = false;
		this.protect = () => []; // çalan / istenen temalar atılmasın
		this.cap = low ? 22e6 : 44e6;
		this.log = null; // hata ayıklama: (iş, ms) çağrılır
	}

	get bytes() {
		let n = 0;
		for (const m of this.music.values()) n += m.bytes;
		for (const s of this.sfx.values()) n += s.buf.length * s.buf.numberOfChannels * 4;
		return n;
	}

	has(key) {
		return this.sfx.has(key) || this.music.has(key);
	}

	/** Efekt işi: key = çalma anahtarı, name = tarif adı, opts = tarife giden (nicemlenmiş) seçenekler. */
	requestSfx(key, name, opts, prio = 2) {
		this._add({ kind: 'sfx', key, name, opts, prio });
	}

	requestMusic(name, prio = 3) {
		this._add({ kind: 'music', key: 'music:' + name, name, prio });
	}

	_add(job) {
		if (!this.can || this.fail.has(job.key)) return;
		if (job.kind === 'sfx' ? this.sfx.has(job.key) : this.music.has(job.name)) return;
		if (this.run && this.run.key === job.key) return;
		const ex = this.q.find((j) => j.key === job.key);
		if (ex) {
			if (job.prio < ex.prio) ex.prio = job.prio;
		} else this.q.push(job);
		this.pump();
	}

	/** Anahtar hazır olunca bir kez çağrılır (zaten hazırsa hemen). */
	once(key, cb) {
		let l = this.waiters.get(key);
		if (!l) this.waiters.set(key, (l = []));
		l.push(cb);
	}

	_fire(key) {
		const l = this.waiters.get(key);
		if (!l) return;
		this.waiters.delete(key);
		for (const cb of l) {
			try {
				cb();
			} catch (e) {
				/* yok say */
			}
		}
	}

	pause() {
		this.paused = true;
	}
	resume() {
		this.paused = false;
		this.pump();
	}

	async pump() {
		if (this.run || this.paused || !this.q.length || !this.can) return;
		// önceliği düşük sayı önce (aynı önceliklerde eklenme sırası)
		let bi = 0;
		for (let i = 1; i < this.q.length; i++) if (this.q[i].prio < this.q[bi].prio) bi = i;
		const job = this.q.splice(bi, 1)[0];
		this.run = job;
		const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
		try {
			if (job.kind === 'sfx') {
				const r = await renderSfx(job.name, job.opts, { low: this.low });
				if (r) this.sfx.set(job.key, { buf: sfxToBuffer(r), dur: r.dur, gain: r.gain });
				else this.fail.add(job.key);
			} else {
				const r = await renderTheme(job.name, { low: this.low });
				const stems = toBuffers(r);
				const bytes = stems.reduce((a, b) => a + b.length * b.numberOfChannels * 4, 0);
				this.music.set(job.name, { stems, len: r.len, sr: r.sr, sync: r.sync, hot: r.hot, bytes, used: Date.now() });
				this._evict();
			}
			this._fire(job.key);
		} catch (err) {
			this.fail.add(job.key);
			this._fire(job.key);
		}
		if (this.log) this.log(job, typeof performance !== 'undefined' ? performance.now() - t0 : 0);
		this.run = null;
		await gap(job.kind === 'music' ? 300 : 30);
		this.pump();
	}

	touch(name) {
		const m = this.music.get(name);
		if (m) m.used = Date.now();
	}

	_evict() {
		let total = 0;
		for (const m of this.music.values()) total += m.bytes;
		if (total <= this.cap) return;
		const keep = new Set(this.protect());
		const list = [...this.music.entries()].filter(([n]) => !keep.has(n)).sort((a, b) => a[1].used - b[1].used);
		for (const [n, m] of list) {
			if (total <= this.cap) break;
			this.music.delete(n);
			total -= m.bytes;
		}
	}
}
