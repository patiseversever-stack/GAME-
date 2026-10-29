// Harita etiketleri ve oyuncu rozetleri (gece odağı), ekran uzayında HTML:
//   - il etiketi: ilin adı (plaka) + sahibi (altta sahibin renginde şerit: portre + ad); saldırı hedefinde
//     çapraz kılıç simgesi, tarafsız ilde sahip şeridi yok (yayılmada bayrak simgesi)
//   - rozet: oyuncunun kendisi için "SEN" (portre + ad, kendi renginde), botlarda adı: kimin toprağı olduğu
//     tek bakışta okunur
// İl adlarının 3B katmanı (labels.js) bu sırada susar. Her karede yalnızca transform yazılır; öğeler seçim
// değişince kurulur. Çakışan etiketler yukarı kayar, ekran kenarına ve üstteki/alttaki arayüze taşmaz.

import * as THREE from 'three';
import { esc, ico, avatar, shade } from './art.js';
import { setTimeout } from '../core/clock.js';

const lumOf = (css) => {
	const n = parseInt(String(css).slice(1), 16);
	return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
};
const up = (s) => String(s).toLocaleUpperCase('tr-TR');
const ICON = {
	attack: ['atk', 'swords', '#fff'],
	pick: ['pk', 'plus', '#fff'],
	cap: ['pk', 'castle', '#fff'],
	conq: ['cq', 'crown', '#4a2800'],
	src: ['src', 'arrow', '#fff'],
};

// rozet adayları: [x payı (genişlik), x sabit, y payı (yükseklik), y sabit, öncelik cezası, duruş]
// (merkez = çıkış noktası + pay*boyut + sabit; duruş: 0 üstte, 1 altta (ucu yukarı), 2 yanda (uçsuz))
const CAND = [
	[0, 0, -0.5, -3, 0, 0],
	[0, 0, 0.5, 12, 0.3, 1],
	[-0.42, 0, -0.5, -3, 0.15, 0],
	[0.42, 0, -0.5, -3, 0.15, 0],
	[-0.42, 0, 0.5, 12, 0.45, 1],
	[0.42, 0, 0.5, 12, 0.45, 1],
	[-0.5, -14, 0, 0, 0.6, 2],
	[0.5, 14, 0, 0, 0.6, 2],
];
const POSE = ['', 'pu', 'ps'];

export class Tags {
	constructor(ui) {
		this.ui = ui;
		this.el = ui.$.tags;
		this.items = [];
		this.map = new Map();
		this._v = new THREE.Vector3();
		this._s = { x: 0, y: 0, behind: false };
		this.W = 0;
		this.H = 0;
		this.top = 110;
		this.bot = 700;
		this.left = 8;
		this.right = 400;
		this._n = 0;
		this._na = 0;
		this._pts = null;
	}

	/**
	 * specs: [{i, kind: 'pick'|'attack'|'src'|'conq'|'plain', p: sahip oyuncu | null, role: 'SALDIRAN' …}]
	 * badges: [{p, i, castle}]: oyuncu rozeti (castle: kalenin üstünde, değilse ilin üstünde)
	 * tap: etiket dokunulabilir (seçim): dokunuş ili seçer.
	 */
	set(specs, { badges = [], tap = false } = {}) {
		const next = new Map();
		const list = [];
		const compact = specs.length > 8;
		const add = (key, make) => {
			let it = this.map.get(key);
			if (!it) {
				it = make();
				it.key = key;
				// sırayla belirir (yelpaze gibi; yalnızca opacity/transform geçişi)
				it.inner.style.transitionDelay = Math.min(list.length, 8) * 40 + 'ms';
				this.el.appendChild(it.el);
				// gece yeterince düşünce belirir (update): gündüz haritada etiket önce çıkmasın
				it.shown = false;
				it.w = 0;
				it.h = 0;
			}
			next.set(key, it);
			list.push(it);
		};
		for (const s of specs) add(`t${s.i}|${s.kind}|${s.p ? s.p.i : -1}|${s.role || ''}|${tap ? 1 : 0}|${compact ? 1 : 0}`, () => this._tag(s, tap, compact));
		for (const bd of badges) add(`b${bd.p.i}|${bd.i}|${bd.castle ? 1 : 0}|${bd.tail ? 1 : 0}`, () => this._badge(bd));
		for (const [k, it] of this.map) {
			if (next.has(k)) continue;
			const el = it.el;
			it.inner.style.transitionDelay = '0ms';
			el.classList.add('bye');
			el.classList.remove('on');
			setTimeout(() => el.remove(), 260);
		}
		this.map = next;
		this.items = list;
	}

	clear() {
		this.set([], { badges: [] });
	}

	/** Hatalı dokunuş: etiketler bir kez irkilir. */
	nudge() {
		for (const it of this.items) {
			it.el.classList.remove('nudge');
			void it.el.offsetWidth;
			it.el.classList.add('nudge');
		}
	}

	_ownerChip(p, role, compact) {
		const ink = lumOf(p.css) > 165;
		const L = this.ui.look(p);
		return `<span class="ow${ink ? ' lt' : ''}" style="--oc:${p.css}"><span class="fl-av">${avatar(L)}</span><b>${p.human ? 'SEN' : esc(up(p.name))}</b>${role && !compact ? `<em>${role}</em>` : ''}</span>`;
	}

	_tag(s, tap, compact) {
		const b = this.ui.app.board;
		const pv = b.provinces[s.i];
		const p = s.p || null;
		const el = document.createElement(tap ? 'button' : 'div');
		el.className = `fl-tag${tap ? ' tp' : ''}${p ? ' hasow' : ''}${compact ? ' cmp' : ''}`;
		if (p) el.style.setProperty('--oc', p.css);
		el.dataset.i = s.i;
		if (tap) el.addEventListener('click', () => this.ui._pickRes?.(s.i));
		const ic = ICON[s.kind];
		// kaynak ili simgesi (SALDIRAN): saldıranın renginde
		const icc = ic && s.kind === 'src' && p ? ` style="--ic1:${shade(p.css, 0.3)};--ic2:${p.css}"` : '';
		const icon = ic ? `<span class="ic ${ic[0]}"${icc}>${ico(ic[1], { w: ic[1] === 'swords' ? 2.4 : 2.8, c: ic[2] })}</span>` : '';
		const nm = up(pv.name);
		el.innerHTML = `<span class="in"><span class="pl${icon ? '' : ' noic'}${nm.length > 10 ? ' lg' : ''}">${icon}<b>${esc(nm)}</b></span>${p ? this._ownerChip(p, s.role, compact) : ''}</span>`;
		return { el, inner: el.firstChild, kind: 'tag', i: s.i, w: 0, h: 0, x: 0, y: 0, sc: 1 };
	}

	_badge(bd) {
		const p = bd.p;
		const el = document.createElement('div');
		el.className = `fl-tag bd${p.human ? ' me' : ''}`;
		el.style.setProperty('--oc', p.css);
		el.style.setProperty('--ol', shade(p.css, 0.22));
		el.style.setProperty('--od', shade(p.css, -0.2));
		const L = this.ui.look(p);
		el.innerHTML = `<span class="in"><span class="bn${lumOf(p.css) > 165 ? ' lt' : ''}"><span class="fl-av">${avatar(L)}</span><b>${p.human ? 'SEN' : esc(up(p.name))}</b></span><s></s></span>`;
		return { el, inner: el.firstChild, kind: 'badge', i: bd.i, p, castle: !!bd.castle, tail: !!bd.tail, w: 0, h: 0, x: 0, y: 0, sc: 1 };
	}

	_rect() {
		const ui = this.ui;
		const W = this.el.clientWidth;
		const H = this.el.clientHeight;
		if (W === this.W && H === this.H) return;
		this.W = W;
		this.H = H;
		const land = W > H && H < 560;
		const hud = ui.$.hud.getBoundingClientRect();
		const root = ui.el.getBoundingClientRect();
		this.top = land ? 14 : Math.max(60, hud.bottom - root.top) + 26;
		this.left = land ? 176 : 8;
		this.right = W - 8;
	}

	/** Okların ekrandaki örnek noktaları (kuyruktan uca, kareler arası çizgi boyunca). */
	_arrowPoints(cues) {
		const app = this.ui.app;
		const v = this._v;
		const s = this._s;
		const pts = this._pts || (this._pts = new Float32Array(28 * 14 * 2));
		let n = 0;
		for (const g of cues.segs) {
			v.set(g.tx, g.ty, g.tz);
			app.toScreen(v, s);
			const ax = s.x;
			const ay = s.y;
			v.set(g.ex, g.ey, g.ez);
			app.toScreen(v, s);
			for (let k = 0; k < 14 && n < 28 * 14; k++) {
				const u = k / 13;
				pts[n * 2] = ax + (s.x - ax) * u;
				pts[n * 2 + 1] = ay + (s.y - ay) * u;
				n++;
			}
		}
		this._na = n;
	}

	/**
	 * Rozet: okların çıktığı noktanın üstünde, okları örtmüyorsa; örtüyorsa altında ya da yanında
	 * (en az ok noktasını örten aday; önceki seçime hafif ağırlık: kamera kayarken titremesin).
	 */
	_placeBadge(it, w, h) {
		const px = it.px;
		const py = it.py;
		const pts = this._pts;
		const n = this._na;
		let best = 0;
		let bs = Infinity;
		for (let c = 0; c < CAND.length; c++) {
			const k = CAND[c];
			const cx = Math.min(this.right - w / 2, Math.max(this.left + w / 2, px + k[0] * w + k[1]));
			const cy = py + k[2] * h + k[3];
			const x0 = cx - w / 2 - 6;
			const x1 = cx + w / 2 + 6;
			const y0 = cy - h / 2 - 6;
			const y1 = cy + h / 2 + 6;
			let sc = k[4] + (c === it.slot ? -0.6 : 0);
			for (let q = 0; q < n; q++) {
				const X = pts[q * 2];
				const Y = pts[q * 2 + 1];
				if (X > x0 && X < x1 && Y > y0 && Y < y1) sc += 1;
			}
			// üst ve alt sınır: arayüze taşmasın
			if (y0 < this.top) sc += (this.top - y0) / 8;
			if (y1 > this.bot) sc += (y1 - this.bot) / 8;
			if (sc < bs) {
				bs = sc;
				best = c;
			}
		}
		it.slot = best;
		const k = CAND[best];
		it.cx = px + k[0] * w + k[1];
		it.cy = py + k[2] * h + k[3];
		const pose = POSE[k[5]];
		if (it.pose !== pose) {
			it.pose = pose;
			it.el.classList.toggle('pu', pose === 'pu');
			it.el.classList.toggle('ps', pose === 'ps');
		}
	}

	update() {
		const items = this.items;
		if (!items.length) return;
		const app = this.ui.app;
		const b = app.board;
		this._rect();
		const { W, H } = this;
		const land = W > H && H < 560;
		this.bot = H - (this.ui.$.prompt.classList.contains('on') ? (land ? 165 : 200) : 28);
		const v = this._v;
		const s = this._s;
		// 1) ekrana izdüşüm: etiket ilin üstünde ortalı (cx, cy merkez); rozet okların çıktığı yerin/kalenin tepesinde
		const cues = b.cues?.on ? b.cues : null;
		this._na = 0; // ok örnek noktaları (rozet yerleşimi için), gerektiğinde bir kez hesaplanır
		let arrowsDone = false;
		const P = app.camera.projectionMatrix.elements;
		// geceye geçiş ~0,8 sn: etiketler gece oturunca (ya da zaten gecedeyse hemen) belirir
		const ready = b.nightAmt > 0.3 || b.nightTo < 0.5;
		if (ready) {
			for (const it of items) {
				if (!it.shown) {
					it.shown = true;
					it.el.classList.add('on');
				}
			}
		}
		// yazı tipi geç yüklenirse (Türkçe harf eki) ölçüler bir süre yenilenir
		const remeasure = (this._n = (this._n + 1) % 20) === 0;
		for (const it of items) {
			if (!it.w || remeasure) {
				it.w = it.inner.offsetWidth || it.w || 90;
				it.h = it.inner.offsetHeight || it.h || 50;
			}
			let lift = 0;
			if (it.kind === 'badge') {
				const k = it.castle ? app.castles?.[it.p.i] : null;
				const tl = it.tail && cues ? cues.tails.get(it.i) : null;
				if (tl) v.set(tl.x, tl.y + 0.2, tl.z);
				else if (k && k.group.visible) v.copy(k.group.position).y += 2.05;
				else {
					b.labelAt(it.i, v);
					v.y += 0.45;
				}
			} else {
				b.labelAt(it.i, v);
				lift = 1;
			}
			app.toScreen(v, s);
			it.px = s.x;
			it.py = s.y;
			it.far = s.behind;
			if (it.kind === 'badge' && it.tail && cues && !arrowsDone) {
				arrowsDone = true;
				this._arrowPoints(cues);
			}
			// yakınlaştıkça büyür: küçük il üstünde dev etiket olmasın (0,74 .. 1)
			if (lift) {
				const cw = Math.max(1e-3, app.camera.matrixWorldInverse.elements[2] * v.x + app.camera.matrixWorldInverse.elements[6] * v.y + app.camera.matrixWorldInverse.elements[10] * v.z + app.camera.matrixWorldInverse.elements[14]);
				const ppu = (H * P[5] * 0.5) / Math.abs(cw);
				it.sc = Math.min(1, Math.max(0.74, (ppu * (b.provinces[it.i].inner || 3)) / 62));
			} else it.sc = 1;
			const w = it.w * it.sc;
			const h = it.h * it.sc;
			it.cx = s.x;
			it.cy = it.kind === 'badge' ? s.y - 3 - h / 2 : s.y - 4 + (h - 26 * it.sc) / 2 - 2; // etiketin plakası ilin merkezinde
			if (it.kind === 'badge' && it.tail && this._na) this._placeBadge(it, w, h);
			// ok ucu varsa etiket ucun ötesinde durur (ok etiketin altında kalmasın): ok yönünde kay
			const tp = lift && cues ? cues.tips.get(it.i) : null;
			if (tp) {
				v.set(tp.x, tp.y, tp.z);
				app.toScreen(v, s);
				const tx = s.x;
				const ty = s.y;
				v.set(tp.bx, tp.by, tp.bz);
				app.toScreen(v, s);
				let dx = tx - s.x;
				let dy = ty - s.y;
				const dl = Math.hypot(dx, dy) || 1;
				dx /= dl;
				dy /= dl;
				const m = 14; // ucun çevresindeki boşluk
				for (let k = 0; k < 40; k++) {
					if (Math.abs(it.cx - tx) < w / 2 + m && Math.abs(it.cy - ty) < h / 2 + m) {
						it.cx += dx * 4;
						it.cy += dy * 4;
					} else break;
				}
			}
			it.ew = w;
			it.eh = h;
		}
		// 2) çakışma giderme: rozetler yerinde, etiketler birbirinden ve rozetten ayrılır (az kayma, önce küçük eksen)
		const gap = 3;
		const lo = this.left;
		const hi = this.right;
		for (let iter = 0; iter < 8; iter++) {
			let moved = false;
			for (let a = 0; a < items.length; a++) {
				const A = items[a];
				for (let c = a + 1; c < items.length; c++) {
					const B = items[c];
					const ox = (A.ew + B.ew) / 2 + gap - Math.abs(A.cx - B.cx);
					const oy = (A.eh + B.eh) / 2 + gap - Math.abs(A.cy - B.cy);
					if (ox <= 0 || oy <= 0) continue;
					moved = true;
					// rozet sabit: yalnızca etiket kayar
					const fa = A.kind === 'badge' ? 0 : B.kind === 'badge' ? 1 : 0.5;
					const fb = 1 - fa;
					if (oy <= ox * 1.15) {
						const dir = A.cy <= B.cy ? -1 : 1; // A üstte kalır
						A.cy += dir * oy * fa;
						B.cy -= dir * oy * fb;
					} else {
						const dir = A.cx <= B.cx ? -1 : 1;
						A.cx += dir * ox * fa;
						B.cx -= dir * ox * fb;
					}
				}
			}
			// ekranın ve arayüzün içinde kalsın (rozet yalnızca yatayda kıstırılır: ucu okların çıktığı yerde kalsın)
			for (const it of items) {
				it.cx = Math.min(hi - it.ew / 2, Math.max(lo + it.ew / 2, it.cx));
				if (it.kind === 'badge') continue;
				it.cy = Math.min(this.bot - it.eh / 2, Math.max(this.top + it.eh / 2, it.cy));
			}
			if (!moved) break;
		}
		// 3) yaz
		for (const it of items) {
			const far = it.kind === 'badge'
				? it.far || it.px < lo - 30 || it.px > hi + 30 || it.py < this.top - 30 || it.py > this.bot + 80
				: it.far || it.py < this.top - 90 || it.py > this.bot + 120 || it.px < lo - 110 || it.px > hi + 110;
			if (it.farNow !== far) {
				it.farNow = far;
				it.el.classList.toggle('far', far);
			}
			it.el.style.transform = `translate3d(${(it.cx - it.ew / 2).toFixed(1)}px,${(it.cy - it.eh / 2).toFixed(1)}px,0) scale(${it.sc.toFixed(3)})`;
		}
	}
}
