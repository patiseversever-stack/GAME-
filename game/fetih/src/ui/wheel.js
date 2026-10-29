// Kategori çarkı: sade ve okunur. Düz zengin renkli dilimler, tek tip beyaz glifler, tek ince jant, temiz mandal,
// çarkın altında tek büyük ÇEVİR düğmesi; sonuçta kazanan dilim sakince öne çıkar (diğerleri kararır) ve altta
// büyük kategori kartı açılır. Yumuşak yavaşlama, hafif oturma; parıltı, ışın, ampul yok.
//
// Görünüm seçenekleri (sahibi seçene kadar, adres parametresi ?cark=a|b|c):
//   a · Sade         ince altın jant, düz dilimler, beyaz ayraçlar, büyük beyaz glifler, beyaz göbek
//   b · Madalyon     koyu metal jant (ince altın çizgiler), dilimde beyaz madalyon içinde renkli glif, portreli göbek
//   c · Kart dilimli koyu zemin üstünde aralıklı, yuvarlak köşeli dilim kartları; glif ve düz kısa ad
//
// Başarım (Mali-G52): dönen disk tek katman (SVG bir kez çizilir, kare başına yalnızca transform). Hızlıyken
// diskin içindeki bulanık kopya açılır (yalnızca opacity). Gölgeler duruk; filtre ve backdrop-filter yok.

import { CATS, WHEEL, FETIH_SLICE } from '../quiz/categories.js';
import { esc, shade, avatar, catIcon } from './art.js';
import { clock, sleep, setTimeout, clearTimeout, setInterval, clearInterval } from '../core/clock.js';

/** Görünüm seçeneği: ?cark=a|b|c (varsayılan a). */
export const STYLE = (() => {
	try {
		const v = new URLSearchParams(globalThis.location?.search || '').get('cark');
		return v === 'b' || v === 'c' ? v : 'a';
	} catch (e) {
		return 'a';
	}
})();

const C = 200; // görünüm kutusu 400×400
const G = {
	a: { R: 190, RI: 118, IS: 76, tip: 184, sep: 3.2 },
	b: { R: 181, RI: 114, IS: 40, tip: 176, sep: 2.4 },
	c: { R: 190, RI: 108, IS: 58, tip: 188, sep: 0, ri: 62, RL: 160 },
}[STYLE];
const W_PEG = 6; // mandalın dilim sınırına değdiği açı penceresi (derece)
const DEF = 16; // mandalın en büyük sapması (derece)
const SHORT = { tarih: 'TARİH', cografya: 'COĞRAFYA', spor: 'SPOR', fetih: 'FETİH', bilim: 'BİLİM', sanat: 'SANAT', eglence: 'KÜLTÜR' };
const GOLD = '#f5b324';
const pt = (a, r) => {
	const t = (a * Math.PI) / 180;
	return [C + r * Math.sin(t), C - r * Math.cos(t)];
};
const f1 = (v) => v.toFixed(1);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mix = (a, b) => {
	const h = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
	const [x, y] = [h(a), h(b)];
	return '#' + x.map((v, i) => Math.round((v + y[i]) / 2).toString(16).padStart(2, '0')).join('');
};

export const sliceOf = (k) => (k === 'fetih' ? FETIH_SLICE : CATS[k]) || { name: k, color: '#4a8cff', icon: 'M12 2.8l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.4l-5.4 2.9 1.2-6L3.3 9.1l6.1-.7z' };
export const shortName = (k) => SHORT[k] || sliceOf(k).name.toLocaleUpperCase('tr-TR');
const colorOf = (k) => (k === 'fetih' ? GOLD : sliceOf(k).color);

/** Tek tip beyaz çizgi glif (24'lük ızgara) SVG <g> olarak: merkez (x, y), boy s. */
const glyph = (d, x, y, s, color = '#fff', w = 2.1) =>
	`<g transform="translate(${f1(x - s / 2)} ${f1(y - s / 2)}) scale(${(s / 24).toFixed(3)})"><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
/** Tek başına glif (kart, düğme). */
export const glyphSVG = (k, color = '#fff', w = 2.1) => `<svg class="fl-gl" viewBox="0 0 24 24"><path d="${sliceOf(k).icon}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const wedge = (a0, a1, r) => {
	const [x0, y0] = pt(a0, r);
	const [x1, y1] = pt(a1, r);
	return `M${C} ${C}L${f1(x0)} ${f1(y0)}A${r} ${r} 0 0 1 ${f1(x1)} ${f1(y1)}Z`;
};

/** Aralıklı halka dilimi (c): kenarlar d kadar içeri, köşeler yuvarlak (aynı renkte cr kalınlıkta yuvarlak çizgiyle). */
function cardSlice(a0, a1, ri, ro, d) {
	const rad = (a) => (a * Math.PI) / 180;
	const u = (a) => [Math.sin(rad(a)), -Math.cos(rad(a))];
	const n = (a) => [Math.cos(rad(a)), Math.sin(rad(a))];
	const P = (a, r, s) => {
		const [ux, uy] = u(a);
		const [nx, ny] = n(a);
		const rr = Math.sqrt(Math.max(1, r * r - d * d));
		return [C + ux * rr + s * nx * d, C + uy * rr + s * ny * d];
	};
	const o0 = P(a0, ro, 1);
	const o1 = P(a1, ro, -1);
	const i1 = P(a1, ri, -1);
	const i0 = P(a0, ri, 1);
	const q = (p) => `${f1(p[0])} ${f1(p[1])}`;
	return `M${q(i0)}L${q(o0)}A${ro} ${ro} 0 0 1 ${q(o1)}L${q(i1)}A${ri} ${ri} 0 0 0 ${q(i0)}Z`;
}

// ---------------------------------------------------------------- dilimler

/** Bir dilimin tanımları ve gövdesi (disk ve öne çıkan dilim aynı çizimi kullanır). */
function slicePart(keys, i, uid) {
	const n = keys.length;
	const S = 360 / n;
	const k = keys[i];
	const c = colorOf(k);
	const a0 = i * S;
	const a1 = a0 + S;
	const am = a0 + S / 2;
	const id = `${uid}_${i}`;
	const icon = sliceOf(k).icon;
	const defs = `<radialGradient id="${id}s" cx="${C}" cy="${C}" r="${G.R}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${shade(c, -0.16)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, 0.07)}"/></radialGradient>`;
	let body = '';
	if (STYLE === 'c') {
		const cr = 7;
		const d = cardSlice(a0, a1, G.ri + cr, G.R - cr, 4 + cr);
		body += `<path d="${d}" fill="url(#${id}s)" stroke="url(#${id}s)" stroke-width="${cr * 2}" stroke-linejoin="round"/>`;
		body += `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="${cr * 2 + 1}" stroke-linejoin="round" transform="translate(0 0)"/>`;
		body += `<path d="${d}" fill="url(#${id}s)" stroke="url(#${id}s)" stroke-width="${cr * 2 - 2}" stroke-linejoin="round"/>`;
	} else body += `<path d="${wedge(a0, a1, G.R + 2)}" fill="url(#${id}s)"/>`;
	// yukarısı dışa bakan grup: glif (ve c'de düz ad)
	let inner = '';
	if (STYLE === 'b') {
		inner += `<circle cx="${C}" cy="${C - G.RI + 2.5}" r="35" fill="rgba(0,0,0,.18)"/><circle cx="${C}" cy="${C - G.RI}" r="34" fill="#fff"/>`;
		inner += glyph(icon, C, C - G.RI, G.IS, shade(c, -0.12), 2.2);
	} else inner += glyph(icon, C, C - G.RI, G.IS, '#fff', STYLE === 'a' ? 2 : 2.1);
	if (STYLE === 'c') {
		const nm = shortName(k);
		const fs = clamp(108 / (nm.length * 0.62), 14, 21);
		inner += `<text x="${C}" y="${f1(C - G.RL + fs * 0.36)}" font-family="Lilita One,system-ui" font-size="${f1(fs)}" letter-spacing=".6" fill="#fff" text-anchor="middle">${esc(nm)}</text>`;
	}
	body += `<g transform="rotate(${f1(am)} ${C} ${C})">${inner}</g>`;
	return { defs, body };
}

function discSVG(keys) {
	const n = keys.length;
	const S = 360 / n;
	let defs = '';
	let body = '';
	if (STYLE === 'c') body += `<circle cx="${C}" cy="${C}" r="196" fill="#0e1736"/>`;
	keys.forEach((k, i) => {
		const p = slicePart(keys, i, 'flwd');
		defs += p.defs;
		body += p.body;
	});
	// ince ayraçlar (a, b)
	if (G.sep) {
		let d = '';
		for (let i = 0; i < n; i++) {
			const [x0, y0] = pt(i * S, 30);
			const [x1, y1] = pt(i * S, G.R + 2);
			d += `M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}`;
		}
		body += `<path d="${d}" stroke="#fff" stroke-width="${G.sep}" stroke-linecap="round" opacity="${STYLE === 'a' ? 0.95 : 0.85}"/>`;
	}
	return `<svg class="disc" viewBox="0 0 400 400"><defs>${defs}</defs>${body}</svg>`;
}

/** Hızla dönerken açılan bulanık kopya: dilim renkleri birbirine akar. */
function blurCSS(keys) {
	const n = keys.length;
	const S = 360 / n;
	const cs = keys.map(colorOf);
	const edge = mix(cs[n - 1], cs[0]);
	const st = [`${edge} 0deg`];
	cs.forEach((c, i) => st.push(`${c} ${f1(i * S + S * 0.3)}deg ${f1((i + 1) * S - S * 0.3)}deg`));
	st.push(`${edge} 360deg`);
	const hole = STYLE === 'c' ? '#0e1736 0 31%,rgba(14,23,54,0) 34%,' : 'rgba(0,0,0,.18) 0 30%,rgba(0,0,0,0) 45%,';
	return `radial-gradient(circle closest-side,${hole}rgba(255,255,255,.1) 58%,rgba(255,255,255,0) 72%),conic-gradient(${st.join(',')})`;
}

// ---------------------------------------------------------------- jant, göbek, mandal (duruk)

function backSVG() {
	const shadow = `<ellipse cx="200" cy="210" rx="199" ry="196" fill="rgba(0,0,0,.34)"/>`;
	if (STYLE === 'a')
		return `<svg class="back" viewBox="0 0 400 400"><defs><linearGradient id="flw-ra" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset=".45" stop-color="#e6ad3c"/><stop offset="1" stop-color="#a26812"/></linearGradient></defs>
${shadow}<circle cx="200" cy="200" r="198" fill="url(#flw-ra)"/><circle cx="200" cy="200" r="197.2" fill="none" stroke="#fff6d6" stroke-opacity=".55" stroke-width="1.2"/></svg>`;
	if (STYLE === 'b')
		return `<svg class="back" viewBox="0 0 400 400"><defs><linearGradient id="flw-rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34416a"/><stop offset=".5" stop-color="#1a2446"/><stop offset="1" stop-color="#0c1230"/></linearGradient></defs>
${shadow}<circle cx="200" cy="200" r="198" fill="url(#flw-rb)"/><circle cx="200" cy="200" r="196" fill="none" stroke="#e9b84a" stroke-width="1.6"/><circle cx="200" cy="200" r="183" fill="none" stroke="#e9b84a" stroke-width="2.4"/></svg>`;
	return `<svg class="back" viewBox="0 0 400 400">${shadow}<circle cx="200" cy="200" r="198" fill="#0e1736"/><circle cx="200" cy="200" r="197" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="2"/></svg>`;
}

const FRONT =
	STYLE === 'c'
		? ''
		: `<svg class="front" viewBox="0 0 400 400"><circle cx="200" cy="200" r="${G.R - 1}" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="3"/>${
				STYLE === 'a' ? `<circle cx="200" cy="200" r="${G.R + 0.6}" fill="none" stroke="#6a440c" stroke-width="1.6"/>` : ''
			}</svg>`;

/** Göbek: a beyaz disk ve altın taç; b ve c portreli koyu disk. */
function hubHTML(L) {
	if (STYLE === 'a')
		return `<svg viewBox="0 0 100 100"><circle cx="50" cy="53" r="47" fill="rgba(0,0,0,.22)"/><circle cx="50" cy="50" r="47" fill="#fff"/><circle cx="50" cy="50" r="40" fill="none" stroke="#e6ebf4" stroke-width="2"/>${glyph(
			FETIH_SLICE.icon,
			50,
			50,
			38,
			'#e6a21e',
			2.2,
		)}</svg>`;
	const ring = STYLE === 'b' ? '#e9b84a' : 'rgba(255,255,255,.85)';
	return `<svg viewBox="0 0 100 100"><circle cx="50" cy="53" r="48" fill="rgba(0,0,0,.28)"/><circle cx="50" cy="50" r="48" fill="#0e1736"/><circle cx="50" cy="50" r="45" fill="none" stroke="${ring}" stroke-width="3"/></svg><span class="fl-av">${avatar(
		L,
	)}</span>`;
}

/** Mandal: a beyaz damla, b altın damla, c küçük beyaz üçgen. Döndürme noktası (30, 14). */
const TICK = {
	a: `<svg viewBox="0 0 60 64" overflow="visible"><path d="M30 63L17 33a14 14 0 1 1 26 0z" fill="rgba(0,0,0,.3)"/><path d="M30 60L17 30a14 14 0 1 1 26 0z" fill="#fff"/><circle cx="30" cy="18" r="5.5" fill="#1b2a52"/></svg>`,
	b: `<svg viewBox="0 0 60 64" overflow="visible"><defs><linearGradient id="flw-tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".5" stop-color="#e9b84a"/><stop offset="1" stop-color="#a8721a"/></linearGradient></defs><path d="M30 63L17 33a14 14 0 1 1 26 0z" fill="rgba(0,0,0,.35)"/><path d="M30 60L17 30a14 14 0 1 1 26 0z" fill="url(#flw-tg)" stroke="#6a440c" stroke-width="1.4" stroke-linejoin="round"/><circle cx="30" cy="18" r="5.5" fill="#0e1736"/></svg>`,
	c: `<svg viewBox="0 0 60 64" overflow="visible"><path d="M18 22h24L30 47z" fill="rgba(0,0,0,.3)" stroke="rgba(0,0,0,.3)" stroke-width="5" stroke-linejoin="round" transform="translate(0 3)"/><path d="M18 22h24L30 46z" fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="round"/></svg>`,
}[STYLE];

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
		this.el.innerHTML = `<div class="fl-wh s${STYLE}">
			<div class="fl-wh-cap"></div>
			<div class="fl-wh-stage"><div class="fl-wh-box">
				${backSVG()}
				<div class="fl-wh-spin">${discSVG(keys)}<div class="fl-wh-blur" style="background:${blurCSS(keys)}"></div></div>
				<div class="fl-wh-dim"><svg viewBox="0 0 400 400"><path d="M2 200a198 198 0 1 0 396 0a198 198 0 1 0-396 0z${this._wedge(199)}" fill="#050a1c" fill-rule="evenodd"/></svg></div>
				<div class="fl-wh-pop"><div class="pz"></div></div>
				${FRONT}
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
	}

	_wedge(r) {
		const S = this.S;
		return wedge(-S / 2, S / 2, r);
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
	 * Mandal: dilim sınırı yaklaşınca iter (sınırla birlikte sapar), sınır geçince yay gibi geri döner.
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
			this.omega += (-900 * this.tau - 22 * this.omega) * h;
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
		} else await sleep(rm ? 150 : 450);
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
			await this._anim(human ? 220 : 150, (k) => {
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
		const turns = rm ? 1 : human ? (flick ? clamp(3.5 + v0 / 650, 4, 7) : 5) : 3.4;
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
		let D = rm ? 900 : human ? 3400 : 2200;
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
		// hafif oturma: mandal diski geri iter
		if (over) await this._anim(human ? 520 : 420, (k) => onFrame(tgt + over * (1 - k) * (1 - k) * (1 + 2 * k)));
		this._set(tgt);
		this._blur(0);
		await this._anim(rm ? 60 : 140, () => this._flap(this.theta, 1 / 60, 0, false, dir));
		this.theta = ((tgt % 360) + 360) % 360;
		this._set(this.theta);
		if (!live()) return key;
		this.result(key, jit * 0.7 * S, p, pick);
		await sleep(rm ? 700 : key === 'fetih' ? 1600 : human ? 1400 : 1050);
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

	/** Kazanan dilim sakince öne çıkar, diğerleri kararır; altta kategori kartı. */
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
		const part = slicePart(this.keys, pick, 'flwp');
		const w = STYLE === 'c' ? cardSlice(-this.S / 2, this.S / 2, G.ri, G.R, 4) : this._wedge(G.R + 1);
		const line = STYLE === 'b' ? '#ffe08a' : '#fff';
		$.pz.innerHTML = `<svg viewBox="0 0 400 400" overflow="visible"><defs>${part.defs}</defs>
<path d="${w}" fill="none" stroke="${line}" stroke-opacity=".22" stroke-width="16" stroke-linejoin="round"/>
<g transform="rotate(${f1(-(pick + 0.5) * this.S)} 200 200)">${part.body}</g>
<path d="${w}" fill="none" stroke="${line}" stroke-width="3.5" stroke-linejoin="round"/></svg>`;
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
		host.innerHTML = `<div class="hd"><span class="cr">${catIcon('fetih', GOLD)}</span><b>FETİH!</b><small>Düello kategorini seç</small>${
			sec ? `<div class="tm"><span class="br"><i style="--sec:${sec}s;animation-duration:${sec}s"></i></span><em>${sec}</em></div>` : ''
		}</div>
			<div class="gr">${keys
				.map((k, i) => {
					const c = CATS[k];
					return `<button data-c="${k}" style="--cc:${c.color};--cl:${shade(c.color, 0.32)};--cd:${shade(c.color, -0.28)};--ce:${shade(c.color, -0.6)};--k:${i}"><span class="ci">${catIcon(
						k,
						c.color,
					)}</span><b>${esc(c.name)}</b></button>`;
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
		await sleep(ui.rm ? 120 : 620);
		el.classList.remove('on');
		await sleep(240);
		host.remove();
		el.querySelector('.fl-wh')?.classList.remove('hide');
		el.classList.remove('pick');
		el.style.display = 'none';
		return k;
	}
}
