// Kategori çarkı ("kart dilimli"): koyu zemin üstünde aralıklı, yuvarlak köşeli dilim kartları; her kartta tek tip
// beyaz çizgi glif ve kısa düz ad. Çarkın altında tek büyük ÇEVİR düğmesi. Sonuçta kazanan kart sakince öne çıkar
// (hafif kalkar, ince beyaz çerçeve), diğerleri kararır ve altta büyük beyaz kategori kartı açılır. Yumuşak
// yavaşlama ve hafif oturma; parıltı, ışın, ampul yok. "Fetih!" diliminde kategori seçimi aynı kart dilinde.
//
// Okunurluk: çark dururken (bekleyişte ve sonuçta) alt yarıdaki kartların glif ve adı yerinde ters çevrilir, böylece
// her kart düz okunur (içerik ayrı ince bir katman; yalnızca durunca bir kez yeniden çizilir).
//
// Başarım (Mali-G52): dönen disk tek katman (SVG'ler bir kez çizilir, kare başına yalnızca transform). Hızlıyken
// diskin içindeki bulanık kopya açılır (yalnızca opacity). Gölgeler duruk; filtre ve backdrop-filter yok.

import { CATS, WHEEL, FETIH_SLICE } from '../quiz/categories.js';
import { esc, shade, avatar } from './art.js';
import { clock, sleep, setTimeout, clearTimeout, setInterval, clearInterval } from '../core/clock.js';

const C = 200; // görünüm kutusu 400×400
const RO = 190; // kartların dış yarıçapı
const RIN = 62; // iç yarıçap (göbek boşluğu)
const CR = 7; // kart köşe yarıçapı
const GAP = 4; // kartlar arası yarım aralık
const RI = 108; // glif merkezi
const IS = 56; // glif boyu
const RL = 160; // ad satırı
const FS = 20; // ad yazı boyu (bütün kartlarda aynı)
const LW = 112; // adın sığması gereken en çok genişlik
const NAVY = '#0e1736';
const W_PEG = 6; // mandalın kart sınırına değdiği açı penceresi (derece)
const DEF = 14; // mandalın en büyük sapması (derece)
const SHORT = { tarih: 'TARİH', cografya: 'COĞRAFYA', spor: 'SPOR', fetih: 'FETİH', bilim: 'BİLİM', sanat: 'SANAT', eglence: 'KÜLTÜR' };
const GOLD = '#f5b324';
const pt = (a, r) => {
	const t = (a * Math.PI) / 180;
	return [C + r * Math.sin(t), C - r * Math.cos(t)];
};
const f1 = (v) => v.toFixed(1);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const sliceOf = (k) => (k === 'fetih' ? FETIH_SLICE : CATS[k]) || { name: k, color: '#4a8cff', icon: 'M12 2.8l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.4l-5.4 2.9 1.2-6L3.3 9.1l6.1-.7z' };
export const shortName = (k) => SHORT[k] || sliceOf(k).name.toLocaleUpperCase('tr-TR');
const colorOf = (k) => (k === 'fetih' ? GOLD : sliceOf(k).color);

/** Tek tip beyaz çizgi glif (24'lük ızgara) SVG <g> olarak: merkez (x, y), boy s. */
const glyph = (d, x, y, s, color = '#fff', w = 2.1) =>
	`<g transform="translate(${f1(x - s / 2)} ${f1(y - s / 2)}) scale(${(s / 24).toFixed(3)})"><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
/** Tek başına glif (kart, düğme). */
export const glyphSVG = (k, color = '#fff', w = 2.1) =>
	`<svg class="fl-gl" viewBox="0 0 24 24"><path d="${sliceOf(k).icon}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/**
 * Aralıklı halka dilimi: kenarlar d kadar içeri kayık. Yuvarlak köşe için yolu aynı renkte, köşe yarıçapının iki katı
 * kalınlıkta yuvarlak birleşimli çizgiyle çizeriz (yol cr kadar içeriden geçer).
 */
function ring(a0, a1, ri, ro, d) {
	const rad = (a) => (a * Math.PI) / 180;
	const P = (a, r, s) => {
		const rr = Math.sqrt(Math.max(1, r * r - d * d));
		return [C + Math.sin(rad(a)) * rr + s * Math.cos(rad(a)) * d, C - Math.cos(rad(a)) * rr + s * Math.sin(rad(a)) * d];
	};
	const q = (p) => `${f1(p[0])} ${f1(p[1])}`;
	return `M${q(P(a0, ri, 1))}L${q(P(a0, ro, 1))}A${ro} ${ro} 0 0 1 ${q(P(a1, ro, -1))}L${q(P(a1, ri, -1))}A${ri} ${ri} 0 0 0 ${q(P(a0, ri, 1))}Z`;
}
/** Kartın iç yolu (çizgiyle yuvarlatılacak). */
const cardPath = (a0, a1) => ring(a0, a1, RIN + CR, RO - CR, GAP + CR);

// ---------------------------------------------------------------- kartlar

/** Kartın renk gradyanı ve gövdesi (içerik ayrı). */
function cardPart(keys, i, uid) {
	const S = 360 / keys.length;
	const c = colorOf(keys[i]);
	const id = `${uid}_${i}`;
	const d = cardPath(i * S, (i + 1) * S);
	const defs = `<radialGradient id="${id}" cx="${C}" cy="${C}" r="${RO}" gradientUnits="userSpaceOnUse"><stop offset=".3" stop-color="${shade(c, -0.18)}"/><stop offset=".7" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, 0.08)}"/></radialGradient>`;
	// dış ince açık kenar: yolu biraz kalın beyaz (soluk), üstüne kart
	const body = `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="${CR * 2 + 1.6}" stroke-linejoin="round"/><path d="${d}" fill="url(#${id})" stroke="url(#${id})" stroke-width="${CR * 2}" stroke-linejoin="round"/>`;
	return { defs, body };
}

/** Kartın içeriği (glif + ad). flip: yerinde ters çevir (alt yarıda düz okunsun). */
function contentPart(keys, i, flip) {
	const S = 360 / keys.length;
	const k = keys[i];
	const nm = shortName(k);
	const est = nm.length * 0.6 * FS + (nm.length - 1) * 0.6;
	const fit = est > LW ? ` textLength="${LW}" lengthAdjust="spacingAndGlyphs"` : '';
	const ly = C - RL;
	const turn = (cy) => (flip ? ` transform="rotate(180 ${C} ${f1(cy)})"` : '');
	return `<g transform="rotate(${f1(i * S + S / 2)} ${C} ${C})"><g${turn(C - RI)}>${glyph(sliceOf(k).icon, C, C - RI, IS)}</g><text${turn(ly)} x="${C}" y="${f1(
		ly + FS * 0.36,
	)}" font-family="Lilita One,system-ui" font-size="${FS}" letter-spacing=".6" fill="#fff" text-anchor="middle"${fit}>${esc(nm)}</text></g>`;
}

function discSVG(keys) {
	let defs = '';
	let body = `<circle cx="${C}" cy="${C}" r="196" fill="${NAVY}"/>`;
	keys.forEach((k, i) => {
		const p = cardPart(keys, i, 'flwd');
		defs += p.defs;
		body += p.body;
	});
	return `<svg class="disc" viewBox="0 0 400 400"><defs>${defs}</defs>${body}</svg>`;
}

/** İçerik katmanı: theta açısında dururken alt yarıdaki kartlar ters çevrilir. */
function contentSVG(keys, theta) {
	const S = 360 / keys.length;
	let b = '';
	keys.forEach((k, i) => {
		const sa = ((((i + 0.5) * S + theta) % 360) + 360) % 360; // kart ortasının ekrandaki açısı (0: tepe)
		b += contentPart(keys, i, sa > 90 && sa < 270);
	});
	return `<svg class="fl-wh-ct" viewBox="0 0 400 400">${b}</svg>`;
}

/** Hızla dönerken açılan bulanık kopya: kart renkleri birbirine akar. */
function blurCSS(keys) {
	const n = keys.length;
	const S = 360 / n;
	const cs = keys.map(colorOf);
	// ilk kartın ortasından başlar: başlangıç ve bitiş aynı düz renkte kalır, yazılım çizicide dikiş çizgisi çıkmaz
	const st = [`${cs[0]} 0deg ${f1(S * 0.2)}deg`];
	for (let i = 1; i < n; i++) st.push(`${cs[i]} ${f1(i * S - S * 0.2)}deg ${f1(i * S + S * 0.2)}deg`);
	st.push(`${cs[0]} ${f1(360 - S * 0.2)}deg 360deg`);
	return `radial-gradient(circle closest-side,${NAVY} 0 32%,rgba(14,23,54,0) 35%,rgba(255,255,255,.1) 58%,rgba(255,255,255,0) 72%,rgba(255,255,255,.08) 86%,rgba(255,255,255,0) 94%),conic-gradient(from ${f1(
		S / 2,
	)}deg,${st.join(',')})`;
}

// ---------------------------------------------------------------- zemin, göbek, mandal (duruk)

const BACK = `<svg class="back" viewBox="0 0 400 400"><ellipse cx="200" cy="210" rx="199" ry="196" fill="rgba(0,0,0,.34)"/><circle cx="200" cy="200" r="198" fill="${NAVY}"/><circle cx="200" cy="200" r="197" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="2"/></svg>`;

const hubHTML = (L) =>
	`<svg viewBox="0 0 100 100"><circle cx="50" cy="53" r="48" fill="rgba(0,0,0,.28)"/><circle cx="50" cy="50" r="48" fill="${NAVY}"/><circle cx="50" cy="50" r="45" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="3"/></svg><span class="fl-av">${avatar(
		L,
	)}</span>`;

// Mandal: küçük beyaz üçgen, ince lacivert kenar; döndürme noktası üst ortası (30, 22)
const TICK = `<svg viewBox="0 0 60 64" overflow="visible"><path d="M17 22h26L30 48z" fill="rgba(0,0,0,.32)" stroke="rgba(0,0,0,.32)" stroke-width="6" stroke-linejoin="round" transform="translate(0 3)"/><path d="M17 22h26L30 47z" fill="${NAVY}" stroke="${NAVY}" stroke-width="8.5" stroke-linejoin="round"/><path d="M17 22h26L30 47z" fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="round"/></svg>`;

// ---------------------------------------------------------------- görünüm

export class WheelView {
	constructor(ui) {
		this.ui = ui;
		this.el = ui.$.wheel;
		this.keys = null;
		this.theta = 0;
		this.tau = 0; // mandal açısı
		this.omega = 0;
	}

	build() {
		const keys = WHEEL.slice();
		this.keys = keys;
		this.S = 360 / keys.length;
		this.el.innerHTML = `<div class="fl-wh">
			<div class="fl-wh-cap"></div>
			<div class="fl-wh-stage"><div class="fl-wh-box">
				${BACK}
				<div class="fl-wh-spin">${discSVG(keys)}<div class="fl-wh-ctw"></div><div class="fl-wh-blur" style="background:${blurCSS(keys)}"></div></div>
				<div class="fl-wh-dim"><svg viewBox="0 0 400 400"><path d="M2 200a198 198 0 1 0 396 0a198 198 0 1 0-396 0z${this._wedge(199)}" fill="#050a1c" fill-rule="evenodd"/></svg></div>
				<div class="fl-wh-pop"><div class="pz"></div></div>
				<div class="fl-wh-hub"></div>
				<div class="fl-wh-tk">${TICK}</div>
			</div></div>
			<div class="fl-wh-act"><button class="fl-btn big go" type="button">ÇEVİR</button><div class="st"></div><div class="fl-wh-card"></div></div>
		</div>`;
		const q = (s) => this.el.querySelector(s);
		this.$ = {
			wh: q('.fl-wh'),
			box: q('.fl-wh-box'),
			spin: q('.fl-wh-spin'),
			ct: q('.fl-wh-ctw'),
			blur: q('.fl-wh-blur'),
			tk: q('.fl-wh-tk'),
			hub: q('.fl-wh-hub'),
			cap: q('.fl-wh-cap'),
			dim: q('.fl-wh-dim'),
			pop: q('.fl-wh-pop'),
			pz: q('.fl-wh-pop .pz'),
			st: q('.fl-wh-act .st'),
			card: q('.fl-wh-card'),
		};
		this._blurOp = -1;
		this._orient();
	}

	/** Durunca içerik katmanını bu açıya göre yeniden çiz (alt yarıdaki kartlar düz okunsun). */
	_orient() {
		this.$.ct.innerHTML = contentSVG(this.keys, this.theta);
	}

	_wedge(r) {
		const [x0, y0] = pt(-this.S / 2, r);
		const [x1, y1] = pt(this.S / 2, r);
		return `M${C} ${C}L${f1(x0)} ${f1(y0)}A${r} ${r} 0 0 1 ${f1(x1)} ${f1(y1)}Z`;
	}

	_set(theta) {
		this.theta = theta;
		this.$.spin.style.transform = `rotate(${theta.toFixed(2)}deg)`;
	}

	_blur(v) {
		const o = Math.round(v * 20) / 20;
		if (o === this._blurOp) return;
		this._blurOp = o;
		this.$.blur.style.opacity = String(o);
	}

	/**
	 * Mandal: kart sınırı yaklaşınca iter (sınırla birlikte sapar), sınır geçince yay gibi geri döner.
	 * Hızlıyken sınır aralığı kareden kısa olabilir: geçişte doğrudan sapma verilir.
	 */
	_flap(th, dt, speed, crossed, dir) {
		const S = this.S;
		const u = ((th % S) + S) % S; // son geçen sınırın tepeye uzaklığı
		let push = 0;
		if (dir >= 0 && u > S - W_PEG) push = -(u - (S - W_PEG)) / W_PEG;
		else if (dir < 0 && u < W_PEG) push = (W_PEG - u) / W_PEG;
		if (crossed) {
			const kick = DEF * clamp(speed / 520, 0.5, 1);
			this.tau = dir >= 0 ? Math.min(this.tau, -kick) : Math.max(this.tau, kick);
			this.omega = 0;
		}
		const n = 2;
		const h = Math.min(dt, 1 / 30) / n;
		for (let s = 0; s < n; s++) {
			this.omega += (-900 * this.tau - 24 * this.omega) * h;
			this.tau += this.omega * h;
		}
		const tc = push * DEF;
		if ((dir >= 0 && tc < this.tau) || (dir < 0 && tc > this.tau)) {
			this.tau = tc;
			this.omega = 0;
		}
		this.$.tk.style.transform = `rotate(${this.tau.toFixed(2)}deg)`;
	}

	/** Çarkı göster, çevir, sonucu döndür. pick: dilim, jit: -0.5..0.5 (dilim içi konum). */
	async spin(m, p, pick, jit) {
		const ui = this.ui;
		if (!this.keys || this.keys.join() !== WHEEL.join()) this.build();
		const el = this.el;
		const $ = this.$;
		const S = this.S;
		const human = !!p.human;
		const rm = !!ui.rm;
		const L = ui.look(p);
		const gen = ui._gen;
		const live = () => gen === ui._gen;
		const key = this.keys[pick];
		el.className = 'fl-wheel';
		$.wh.classList.remove('hide');
		$.pz.innerHTML = '';
		$.card.innerHTML = '';
		$.cap.style.setProperty('--pc', p.css);
		$.cap.innerHTML = `<span class="av"><span class="fl-av">${avatar(L)}</span></span><div class="tx"><b>${human ? 'Sıra sende' : esc(p.name)}</b><small>${
			human ? 'Çarkı çevir, düello kategorini öğren' : 'çarkı çeviriyor'
		}</small></div>`;
		$.st.textContent = human ? '' : `${p.name} çeviriyor…`;
		$.hub.innerHTML = hubHTML(L);
		this._set(this.theta % 360);
		this._orient();
		this._blurOp = -1;
		this._blur(0);
		this.tau = 0;
		this.omega = 0;
		this._flap(this.theta, 0, 0, false, 1);
		el.style.display = '';
		void el.offsetWidth;
		el.classList.add('on', human ? 'me' : 'bot', 'idle');
		let flick = 0;
		if (human) {
			flick = await this._await(live);
			el.style.pointerEvents = 'none';
		} else await sleep(rm ? 150 : 420);
		if (!live()) return key;
		el.classList.remove('idle', 'grab');
		el.classList.add('spinning');
		ui.sfx('wheel');
		const dir = flick < 0 ? -1 : 1;
		// kısa geri çekilme (hazırlık): dokununca; parmakla fırlatınca hazırlığı oyuncu yaptı
		if (!rm && !flick) {
			const th0 = this.theta;
			const back = human ? 9 : 6;
			let pt0 = clock.now();
			await this._anim(human ? 220 : 140, (k) => {
				const now = clock.now();
				const dt = (now - pt0) / 1000;
				pt0 = now;
				const th = th0 - back * (1 - Math.pow(1 - k, 3));
				this._set(th);
				this._flap(th, dt, 0, false, -1);
			});
			if (!live()) return key;
		}
		// hedef: seçilen dilimin ortası (+ titreşim) mandalın altında
		const from = this.theta;
		const base = -(pick + 0.5) * S + jit * 0.7 * S;
		const v0 = Math.abs(flick);
		const turns = rm ? 1 : human ? (flick ? clamp(3.5 + v0 / 650, 4, 7) : 5) : 3.2;
		let tgt = base;
		if (dir > 0) {
			tgt = base + 360 * Math.ceil((from - base) / 360);
			while (tgt < from + 360 * turns) tgt += 360;
		} else {
			tgt = base - 360 * Math.ceil((base - from) / 360);
			while (tgt > from - 360 * turns) tgt -= 360;
		}
		const P = 3; // yavaşlama eğrisi (çıkış hızı = Δ·P/D)
		const over = rm ? 0 : dir * S * 0.08;
		const span = Math.abs(tgt + over - from);
		let D = rm ? 900 : human ? 3400 : 2100;
		if (flick && !rm) D = clamp((span * P) / Math.max(v0, 400), 2900, 4300);
		let lastC = Math.floor(from / S);
		let lastT = -1e9;
		let prevTh = from;
		let prevNow = clock.now();
		let sp = 0;
		const onFrame = (th) => {
			const now = clock.now();
			const dt = Math.max(1e-3, (now - prevNow) / 1000);
			const v = Math.abs(th - prevTh) / dt;
			sp = sp ? sp + (v - sp) * 0.5 : v;
			prevTh = th;
			prevNow = now;
			this._set(th);
			const c = Math.floor(th / S);
			const crossed = c !== lastC;
			if (crossed) {
				lastC = c;
				if (now - lastT > 42) {
					lastT = now;
					ui.sfx('tick', { speed: sp });
				}
			}
			this._flap(th, dt, sp, crossed, dir);
			if (!rm) this._blur(clamp((sp - 320) / 1100, 0, 0.85));
		};
		await this._anim(D, (k) => onFrame(from + (tgt + over - from) * (1 - Math.pow(1 - k, P))));
		if (!live()) return key;
		// hafif oturma: mandal diski yumuşakça geri iter
		if (over) await this._anim(human ? 520 : 400, (k) => onFrame(tgt + over * (1 - k) * (1 - k) * (1 + 2 * k)));
		this._set(tgt);
		this._blur(0);
		await this._anim(rm ? 60 : 140, () => this._flap(this.theta, 1 / 60, 0, false, dir));
		this.theta = ((tgt % 360) + 360) % 360;
		this._set(this.theta);
		if (!live()) return key;
		this.result(key, jit * 0.7 * S, p, pick);
		await sleep(rm ? 900 : key === 'fetih' ? 1600 : human ? 1400 : 1000);
		if (!live()) return key;
		el.classList.add('out');
		el.classList.remove('on');
		await sleep(rm ? 120 : 260);
		if (!live()) return key;
		el.style.display = 'none';
		el.className = 'fl-wheel';
		return key;
	}

	/** İnsan: dokunuş (0), parmakla fırlatma (derece/sn, yön işaretli) ya da süre dolunca kendiliğinden (0). */
	_await(live) {
		const el = this.el;
		const $ = this.$;
		return new Promise((res) => {
			let done = false;
			let grab = null;
			let tm = 0;
			const off = () => {
				el.removeEventListener('pointerdown', down);
				el.removeEventListener('pointermove', move);
				el.removeEventListener('pointerup', up);
				el.removeEventListener('pointercancel', up);
				clearTimeout(tm);
			};
			const fin = (v) => {
				if (done) return;
				done = true;
				off();
				res(v);
			};
			const arm = (ms) => {
				clearTimeout(tm);
				tm = setTimeout(() => fin(grab ? grab.v || 0 : 0), ms);
			};
			const ang = (e, r) => (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180) / Math.PI;
			const down = (e) => {
				if (!live()) return fin(0);
				const r = $.box.getBoundingClientRect();
				const dx = e.clientX - (r.left + r.width / 2);
				const dy = e.clientY - (r.top + r.height / 2);
				const d = Math.hypot(dx, dy) / (r.width / 2);
				// göbek, düğme ya da çark dışı: dokunuş; disk: tut ve çevir
				if (d < 0.3 || d > 1.02 || !e.isPrimary) {
					el.classList.add('press');
					return fin(0);
				}
				grab = { r, a: ang(e, r), th: this.theta, last: [[clock.now(), this.theta]], moved: false, v: 0 };
				el.classList.add('grab');
				try {
					el.setPointerCapture(e.pointerId);
				} catch (er) {
					/* yoksay */
				}
				arm(4000);
			};
			const move = (e) => {
				if (!grab) return;
				let da = ang(e, grab.r) - grab.a;
				da = ((((da + 180) % 360) + 360) % 360) - 180;
				grab.a += da;
				const th = this.theta + da;
				if (Math.abs(th - grab.th) > 3) grab.moved = true;
				this._set(th);
				const now = clock.now();
				grab.last.push([now, th]);
				while (grab.last.length > 2 && now - grab.last[0][0] > 90) grab.last.shift();
				const [t0, a0] = grab.last[0];
				grab.v = now > t0 ? ((th - a0) / (now - t0)) * 1000 : 0;
				this._flap(th, 1 / 60, Math.abs(grab.v), false, grab.v >= 0 ? 1 : -1);
			};
			const up = () => {
				if (!grab) return;
				const now = clock.now();
				const stale = now - grab.last[grab.last.length - 1][0] > 120;
				const v = stale ? 0 : grab.v;
				if (!grab.moved) {
					el.classList.add('press');
					return fin(0);
				}
				// yavaş bırakış: sürüklediği yönde normal dönüş
				fin(Math.abs(v) > 160 ? v : (this.theta >= grab.th ? 1 : -1) * 700);
			};
			el.style.pointerEvents = 'auto';
			el.addEventListener('pointerdown', down);
			el.addEventListener('pointermove', move);
			el.addEventListener('pointerup', up);
			el.addEventListener('pointercancel', up);
			arm(4500);
		});
	}

	/** Kazanan kart sakince öne çıkar, diğerleri kararır; altta kategori kartı. */
	result(key, off, p, pick) {
		const ui = this.ui;
		const $ = this.$;
		const c = sliceOf(key);
		const col = colorOf(key);
		const fet = key === 'fetih';
		const el = this.el;
		el.classList.remove('spinning');
		el.classList.add('done');
		el.classList.toggle('fetih', fet);
		const rot = `rotate(${off.toFixed(1)}deg)`;
		$.dim.style.transform = rot;
		$.pop.style.transform = rot;
		// öne çıkan kart: aynı çizim tepeye döndürülmüş; dışında ince beyaz çerçeve ve soluk hale
		const S = this.S;
		const d = cardPath(-S / 2, S / 2);
		const part = cardPart(this.keys, pick, 'flwp');
		$.pz.innerHTML = `<svg viewBox="0 0 400 400" overflow="visible"><defs>${part.defs}</defs>
<path d="${d}" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-opacity=".14" stroke-width="${CR * 2 + 16}" stroke-linejoin="round"/>
<path d="${d}" fill="#fff" stroke="#fff" stroke-width="${CR * 2 + 7}" stroke-linejoin="round"/>
<g transform="rotate(${f1(-(pick + 0.5) * S)} 200 200)">${part.body}${contentPart(this.keys, pick, false)}</g></svg>`;
		// içerik katmanı yeni duruşa göre (kararan kartlar düz okunsun): kısa sönüp yeniden belirir
		const ct = $.ct;
		ct.classList.add('swap');
		setTimeout(() => {
			this._orient();
			ct.classList.remove('swap');
		}, ui.rm ? 0 : 170);
		const nm = fet ? 'Fetih!' : c.name;
		const sub = fet ? (p.human ? 'Kategoriyi sen seçiyorsun' : `${p.name} kategori seçiyor`) : `${c.name} sorusu geliyor`;
		$.card.style.setProperty('--cc', col);
		$.card.style.setProperty('--fz', Math.min(1, 12 / nm.length).toFixed(3)); // uzun adlar karta sığsın
		$.card.innerHTML = `<span class="ic">${glyphSVG(key, '#fff', 2.2)}</span><span class="tx"><b>${esc(nm)}</b><small>${esc(sub)}</small></span>`;
		ui.sfx(fet ? 'fetih' : 'reveal');
	}

	_anim(ms, fn) {
		const g = this.ui._gen;
		return new Promise((res) => this.ui.fx.tween(ms, (k) => g === this.ui._gen && fn(k), res));
	}

	/** "Fetih!" dilimi: kategoriyi oyuncu seçer. sec: süre; dolunca rastgele bir kategori seçilir. */
	async choose(keys, sec = 0) {
		const ui = this.ui;
		const el = this.el;
		const host = document.createElement('div');
		host.className = 'fl-catpick';
		host.innerHTML = `<div class="hd"><span class="cr">${glyphSVG('fetih', '#fff', 2.2)}</span><b>Fetih!</b><small>Düello kategorini sen seç</small>${
			sec ? `<div class="tm"><span class="br"><i style="--sec:${sec}s;animation-duration:${sec}s"></i></span><em>${sec}</em></div>` : ''
		}</div>
			<div class="gr">${keys
				.map((k, i) => {
					const c = CATS[k];
					return `<button data-c="${k}" aria-label="${esc(c.name)}" style="--cc:${c.color};--cd:${shade(c.color, -0.2)};--cl:${shade(c.color, 0.08)};--k:${i}"><span class="ci">${glyphSVG(
						k,
						'#fff',
						2.1,
					)}</span><b>${esc(shortName(k))}</b></button>`;
				})
				.join('')}</div>`;
		el.className = 'fl-wheel';
		el.querySelector('.fl-wh')?.classList.add('hide');
		el.appendChild(host);
		el.style.display = '';
		el.style.pointerEvents = 'auto';
		void el.offsetWidth;
		el.classList.add('on', 'pick');
		ui.sfx('whoosh');
		let tick = 0;
		const k = await new Promise((res) => {
			host.addEventListener('click', (e) => {
				const b = e.target.closest('[data-c]');
				if (!b || host.classList.contains('chosen')) return;
				b.classList.add('chosen');
				host.classList.add('chosen');
				res(b.dataset.c);
			});
			if (!sec) return;
			const em = host.querySelector('.hd em');
			const tmEl = host.querySelector('.hd .tm');
			const t0 = clock.now();
			let lastS = sec;
			tick = setInterval(() => {
				const left = Math.max(0, sec - (clock.now() - t0) / 1000);
				const s = Math.ceil(left);
				if (s !== lastS) {
					lastS = s;
					em.textContent = String(s);
					if (s <= 3 && s > 0) {
						tmEl.classList.add('hot');
						ui.sfx('count', { left: s });
					}
				}
				if (left > 0) return;
				const all = host.querySelectorAll('[data-c]');
				all[Math.floor(Math.random() * all.length)].click(); // süre doldu: rastgele kategori
			}, 100);
		});
		clearInterval(tick);
		ui.sfx('tap');
		el.style.pointerEvents = 'none';
		await sleep(ui.rm ? 300 : 620);
		el.classList.remove('on');
		await sleep(240);
		host.remove();
		el.querySelector('.fl-wh')?.classList.remove('hide');
		el.classList.remove('pick');
		el.style.display = 'none';
		return k;
	}
}
