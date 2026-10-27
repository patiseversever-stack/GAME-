// Arayüz efektleri: kıvılcım, konfeti, şok halkası, uçan yazı ve sayı sayma.
// Parçacıklar kısa ömürlü DOM öğeleridir; yalnızca transform ve opacity canlandırılır.
// Kademe 0'da (düşük cihaz) ve "azaltılmış hareket" açıkken sayı yarıya iner ya da hiç çıkmaz.

const PALETTE = ['#ffd25a', '#ffffff', '#ff7a5a', '#7dff9a', '#6ac8ff'];

export class Fx {
	constructor(layer, opts = {}) {
		this.layer = layer;
		this.low = !!opts.low;
		this.rm = !!opts.rm;
		this._tw = [];
		this._raf = 0;
		this._step = (now) => this._run(now);
	}

	_n(n) {
		if (this.rm) return 0;
		return this.low ? Math.ceil(n * 0.5) : n;
	}

	_org() {
		const r = this.layer.getBoundingClientRect();
		this._ox = r.left;
		this._oy = r.top;
	}

	_add(cls, x, y, style, life) {
		const e = document.createElement('i');
		e.className = cls;
		e.style.cssText = `left:${(x - this._ox).toFixed(1)}px;top:${(y - this._oy).toFixed(1)}px;${style}`;
		this.layer.appendChild(e);
		setTimeout(() => e.remove(), life + 60);
		return e;
	}

	/** Bir noktadan dışa kıvılcım/yıldız patlaması. */
	burst(x, y, { n = 14, colors = PALETTE, dist = 90, life = 750, size = 10, kind = 'spark', up = 0 } = {}) {
		const k = this._n(n);
		this._org();
		for (let i = 0; i < k; i++) {
			const a = (i / k) * Math.PI * 2 + Math.random() * 0.6;
			const d = dist * (0.55 + Math.random() * 0.6);
			const dx = Math.cos(a) * d;
			const dy = Math.sin(a) * d - up;
			const s = size * (0.6 + Math.random() * 0.8);
			const c = colors[i % colors.length];
			this._add(
				`fl-p ${kind}`,
				x,
				y,
				`--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;--r:${Math.round(Math.random() * 360)}deg;--s:${s.toFixed(1)}px;--c:${c};animation-duration:${life}ms`,
				life,
			);
		}
	}

	/** Genişleyen şok halkası. */
	ring(x, y, { color = '#fff', size = 160, life = 600 } = {}) {
		if (this.rm) return;
		this._org();
		this._add('fl-ring', x, y, `--s:${size}px;--c:${color};animation-duration:${life}ms`, life);
	}

	/** Uçan yazı (+200, DOĞRU! …). */
	text(x, y, html, { cls = '', life = 1100 } = {}) {
		this._org();
		const e = this._add(`fl-ftxt ${cls}`, x, y, `animation-duration:${life}ms`, life);
		e.innerHTML = html;
		return e;
	}

	/** Ekranın üstünden yağan konfeti. */
	confetti(w, { n = 40, life = 2600 } = {}) {
		const k = this._n(n);
		const cs = ['#ffd25a', '#ff5a4a', '#4a8cff', '#5fd35a', '#b45bff', '#ffffff'];
		this._org();
		const ox = this._ox;
		for (let i = 0; i < k; i++) {
			const x = ox + Math.random() * w;
			const dx = (Math.random() - 0.5) * 160;
			const dy = 500 + Math.random() * 500;
			const l = life * (0.7 + Math.random() * 0.5);
			this._add(
				'fl-p conf',
				x,
				this._oy - 20,
				`--dx:${dx.toFixed(0)}px;--dy:${dy.toFixed(0)}px;--r:${Math.round(360 + Math.random() * 720)}deg;--s:${(7 + Math.random() * 7).toFixed(1)}px;--c:${cs[i % cs.length]};animation-duration:${l.toFixed(0)}ms;animation-delay:${(Math.random() * 600).toFixed(0)}ms`,
				l + 600,
			);
		}
	}

	/** Öğenin ekran ortası. */
	static center(el) {
		const r = el.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
	}

	// ------------------------------------------------------------ küçük ara değer motoru

	/** ms boyunca fn(t: 0..1) çağırır; done sonunda. Yalnızca etkin ara değer varken kare ister. */
	tween(ms, fn, done) {
		const t = { t0: performance.now(), ms: Math.max(1, ms), fn, done };
		this._tw.push(t);
		if (!this._raf) this._raf = requestAnimationFrame(this._step);
		return t;
	}

	_run(now) {
		this._raf = 0;
		const list = this._tw;
		for (let i = list.length - 1; i >= 0; i--) {
			const t = list[i];
			if (t.dead) {
				list.splice(i, 1);
				continue;
			}
			const k = Math.min(1, (now - t.t0) / t.ms);
			try {
				t.fn(k);
			} catch (e) {
				/* öğe kaldırılmış olabilir */
			}
			if (k >= 1) {
				list.splice(i, 1);
				t.done?.();
			}
		}
		if (list.length) this._raf = requestAnimationFrame(this._step);
	}

	/** Sayıyı from → to say (yazı olarak). */
	count(el, from, to, ms = 700, fmt = (x) => Math.round(x).toLocaleString('tr-TR')) {
		if (el._tw) el._tw.dead = true;
		let last = '';
		const tw = this.tween(ms, (k) => {
			const e = 1 - Math.pow(1 - k, 3);
			const s = fmt(from + (to - from) * e);
			if (s !== last) el.textContent = last = s;
		});
		el._tw = tw;
		return tw;
	}
}
