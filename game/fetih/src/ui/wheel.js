// Kategori çarkı: ışıklı altın jant, gölgeli dilimler, mandala çarpan dişler, yavaşlayıp oturan dönüş,
// sonuçta ışık patlaması. "Fetih!" dilimi altın ve ışınlı.
//
// Başarım: dönen disk tek bir katman (yalnızca transform değişir; içindeki SVG bir kez çizilir).
// Işık, parlama ve göbek dönmeyen üst katmanda. Ampuller adım adım yanıp söner (saniyede birkaç boyama).

import { CATS, WHEEL, FETIH_SLICE } from '../quiz/categories.js';
import { esc, ico, shade, avatar, SPARK } from './art.js';

const C = 160;
const R = 137;
const SHORT = { tarih: 'TARİH', cografya: 'COĞRAFYA', spor: 'SPOR', fetih: 'FETİH!', bilim: 'BİLİM', sanat: 'SANAT', eglence: 'KÜLTÜR' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pt = (a, r) => {
	const t = (a * Math.PI) / 180;
	return [C + r * Math.sin(t), C - r * Math.cos(t)];
};
const f1 = (v) => v.toFixed(1);

export const sliceOf = (k) => (k === 'fetih' ? FETIH_SLICE : CATS[k]) || { name: k, color: '#4a8cff', icon: 'M12 2.8l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.4l-5.4 2.9 1.2-6L3.3 9.1l6.1-.7z' };
export const shortName = (k) => SHORT[k] || sliceOf(k).name.toLocaleUpperCase('tr-TR');

function discSVG(keys) {
	const n = keys.length;
	const S = 360 / n;
	let defs = '';
	let body = '';
	keys.forEach((k, i) => {
		const c = sliceOf(k);
		const fet = k === 'fetih';
		const a0 = i * S;
		const a1 = (i + 1) * S;
		const [x0, y0] = pt(a0, R);
		const [x1, y1] = pt(a1, R);
		const light = fet ? '#fff6b8' : shade(c.color, 0.32);
		const dark = fet ? '#d88a00' : shade(c.color, -0.28);
		defs += `<radialGradient id="flw-g${i}" cx="${C}" cy="${C}" r="${R}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${light}"/><stop offset=".55" stop-color="${fet ? '#ffcf2a' : c.color}"/><stop offset="1" stop-color="${dark}"/></radialGradient>`;
		body += `<path d="M${C} ${C}L${f1(x0)} ${f1(y0)}A${R} ${R} 0 0 1 ${f1(x1)} ${f1(y1)}Z" fill="url(#flw-g${i})"/>`;
		if (fet) {
			// altın ışınlar ve parıltılar
			for (let j = 1; j < 6; j++) {
				const a = a0 + (S * j) / 6;
				const [rx0, ry0] = pt(a - 1.6, R - 4);
				const [rx1, ry1] = pt(a + 1.6, R - 4);
				body += `<path d="M${C} ${C}L${f1(rx0)} ${f1(ry0)}L${f1(rx1)} ${f1(ry1)}Z" fill="#fff" opacity=".22"/>`;
			}
			for (const [da, r, s] of [
				[0.22, 112, 0.5],
				[0.78, 104, 0.42],
				[0.5, 58, 0.36],
			]) {
				const [sx, sy] = pt(a0 + S * da, r);
				body += `<path d="${SPARK}" fill="#fff" transform="translate(${f1(sx - 12 * s)} ${f1(sy - 12 * s)}) scale(${s})"/>`;
			}
		}
		// yazı yayı
		const [tx0, ty0] = pt(a0 + 2.5, 115);
		const [tx1, ty1] = pt(a1 - 2.5, 115);
		defs += `<path id="flw-t${i}" d="M${f1(tx0)} ${f1(ty0)}A115 115 0 0 1 ${f1(tx1)} ${f1(ty1)}"/>`;
		const nm = shortName(k);
		const fs = nm.length > 8 ? 12.5 : nm.length > 6 ? 14 : 15.5;
		body += `<text font-family="Lilita One,system-ui" font-size="${fs}" letter-spacing=".6" fill="#fff" stroke="${fet ? '#8a4a00' : shade(c.color, -0.5)}" stroke-width="3.6" paint-order="stroke" stroke-linejoin="round" text-anchor="middle"><textPath href="#flw-t${i}" startOffset="50%">${esc(nm)}</textPath></text>`;
		// simge rozeti (yukarısı dışa bakar)
		const am = a0 + S / 2;
		const [ix, iy] = pt(am, 80);
		const rr = fet ? 25 : 22;
		body += `<g transform="translate(${f1(ix)} ${f1(iy)}) rotate(${f1(am)})">
<circle r="${rr + 3}" fill="${dark}" opacity=".55" cy="2.5"/><circle r="${rr}" fill="#fff"/><circle r="${rr}" fill="none" stroke="${fet ? '#ffb400' : shade(c.color, -0.15)}" stroke-width="3"/>
<g transform="translate(${-12 * (fet ? 1.55 : 1.35)} ${-12 * (fet ? 1.55 : 1.35)}) scale(${fet ? 1.55 : 1.35})"><path d="${c.icon}" fill="none" stroke="${fet ? '#e08a00' : c.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;
	});
	// dilim ayraçları ve dişler
	for (let i = 0; i < n; i++) {
		const a = i * S;
		const [x0, y0] = pt(a, 30);
		const [x1, y1] = pt(a, R);
		body += `<path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="rgba(0,0,0,.25)" stroke-width="7"/><path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="#fff" stroke-width="3.2"/>`;
	}
	for (let i = 0; i < n; i++) {
		const [px, py] = pt(i * S, 128);
		body += `<circle cx="${f1(px)}" cy="${f1(py + 1.5)}" r="6.4" fill="rgba(0,0,0,.35)"/><circle cx="${f1(px)}" cy="${f1(py)}" r="6.2" fill="#ffe680" stroke="#9a5a06" stroke-width="2.2"/><circle cx="${f1(px - 1.6)}" cy="${f1(py - 1.8)}" r="1.9" fill="#fff"/>`;
	}
	return `<svg class="disc" viewBox="0 0 320 320"><defs>${defs}</defs>${body}<circle cx="${C}" cy="${C}" r="${R}" fill="url(#flw-sh)"/></svg>`;
}

function backSVG(n) {
	let bulbs = '';
	const k = n * 2;
	for (let i = 0; i < k; i++) {
		const [x, y] = pt((i / k) * 360 + 360 / k / 2, 147);
		bulbs += `<circle class="b${i % 2}" cx="${f1(x)}" cy="${f1(y)}" r="4.6"/>`;
	}
	return `<svg class="back" viewBox="0 0 320 320"><defs>
<linearGradient id="flw-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b8"/><stop offset=".35" stop-color="#ffc93a"/><stop offset=".7" stop-color="#d88a10"/><stop offset="1" stop-color="#8a5206"/></linearGradient>
<radialGradient id="flw-sh" cx="160" cy="160" r="137" gradientUnits="userSpaceOnUse"><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>
</defs>
<ellipse cx="160" cy="172" rx="156" ry="152" fill="rgba(0,0,0,.4)"/>
<circle cx="160" cy="160" r="156" fill="url(#flw-rim)" stroke="#5a3404" stroke-width="3"/>
<circle cx="160" cy="160" r="148" fill="none" stroke="#a86a0a" stroke-width="10" opacity=".55"/>
<circle cx="160" cy="160" r="140" fill="#3a2204"/>
<g class="bulbs">${bulbs}</g></svg>`;
}

const FRONT = `<svg class="front" viewBox="0 0 320 320"><defs>
<linearGradient id="flw-gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="flw-hub" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff6c8"/><stop offset=".45" stop-color="#ffc93a"/><stop offset="1" stop-color="#9a5a06"/></radialGradient>
</defs>
<circle cx="160" cy="160" r="136" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="5"/>
<path d="M44 132C52 74 104 34 160 34s96 30 108 64C228 74 196 64 160 64 104 64 62 92 44 132z" fill="url(#flw-gl)"/>
<circle cx="160" cy="163" r="37" fill="rgba(0,0,0,.35)"/>
<circle cx="160" cy="160" r="36" fill="url(#flw-hub)" stroke="#5a3404" stroke-width="3"/>
<circle cx="160" cy="160" r="27" fill="#13234a" stroke="#7a4a06" stroke-width="2"/>
</svg>`;

const TICK = `<svg viewBox="0 0 40 64"><path d="M20 61L7.5 22A13.5 13.5 0 1 1 32.5 22z" fill="#d8301e" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
<path d="M20 52L11.5 22.5A9.5 9.5 0 0 1 20 9" fill="#ff8a6a" opacity=".6"/><circle cx="20" cy="17" r="6.2" fill="#ffd25a" stroke="#6a3a04" stroke-width="2.2"/><circle cx="18.4" cy="15.4" r="1.8" fill="#fff"/></svg>`;

export class WheelView {
	constructor(ui) {
		this.ui = ui;
		this.el = ui.$.wheel;
		this.keys = null;
		this.theta = 0;
		this.tau = 0;
		this.omega = 0;
	}

	build() {
		const keys = WHEEL.slice();
		this.keys = keys;
		this.S = 360 / keys.length;
		this.el.innerHTML = `<div class="fl-wh">
			<div class="fl-wh-cap"></div>
			<div class="fl-wh-box">
				<div class="fl-wh-rays"></div>
				${backSVG(keys.length)}
				<div class="fl-wh-spin">${discSVG(keys)}</div>
				<svg class="fl-wh-hl" viewBox="0 0 320 320"><path d="${this._wedge()}" fill="#fff"/></svg>
				${FRONT}
				<div class="fl-wh-hub"></div>
				<div class="fl-wh-tk">${TICK}</div>
			</div>
			<div class="fl-wh-res"></div>
		</div>`;
		const q = (s) => this.el.querySelector(s);
		this.$ = { box: q('.fl-wh-box'), spin: q('.fl-wh-spin'), tk: q('.fl-wh-tk'), hub: q('.fl-wh-hub'), cap: q('.fl-wh-cap'), res: q('.fl-wh-res'), hl: q('.fl-wh-hl'), wh: q('.fl-wh') };
	}

	_wedge() {
		const S = this.S;
		const [x0, y0] = pt(-S / 2, R);
		const [x1, y1] = pt(S / 2, R);
		return `M${C} ${C}L${f1(x0)} ${f1(y0)}A${R} ${R} 0 0 1 ${f1(x1)} ${f1(y1)}Z`;
	}

	_set(theta) {
		this.theta = theta;
		this.$.spin.style.transform = `rotate(${theta.toFixed(2)}deg)`;
	}

	_tick(dt) {
		// mandal: yaylı sönüm
		const st = Math.min(dt, 1 / 30);
		this.omega += (-320 * this.tau - 24 * this.omega) * st;
		this.tau += this.omega * st;
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
		const L = ui.look(p);
		const gen = ui._gen;
		const live = () => gen === ui._gen;
		el.classList.remove('done', 'spinning', 'fetih');
		$.res.className = 'fl-wh-res';
		$.res.innerHTML = '';
		$.cap.innerHTML = `<span class="fl-av" style="border-color:${p.css}">${avatar(L)}</span><div><b>${human ? 'SIRA SENDE' : esc(p.name).toLocaleUpperCase('tr-TR')}</b><small>${
			human ? 'Çarka dokun ve çevir!' : 'çarkı çeviriyor…'
		}</small></div>`;
		$.hub.innerHTML = human ? `<b>ÇEVİR</b>` : `<span class="fl-av">${avatar(L)}</span>`;
		$.hub.classList.toggle('me', human);
		$.hl.style.opacity = '';
		this._set(this.theta % 360);
		this.tau = 0;
		this.omega = 0;
		this._tick(0);
		el.style.display = '';
		void el.offsetWidth;
		el.classList.add('on');
		if (human) {
			await new Promise((res) => {
				let done = false;
				const go = () => {
					if (done) return;
					done = true;
					el.removeEventListener('pointerdown', go);
					clearTimeout(tm);
					res();
				};
				el.style.pointerEvents = 'auto';
				el.addEventListener('pointerdown', go);
				const tm = setTimeout(go, 4500);
			});
			el.style.pointerEvents = 'none';
		} else await sleep(ui.rm ? 150 : 400);
		if (!live()) return this.keys[pick];
		ui.sfx('wheel');
		el.classList.add('spinning');
		$.hub.classList.add('go');
		// geri çekilme (hazırlık), sonra dönüş
		const th0 = this.theta;
		if (!ui.rm) await this._anim(150, (k) => this._set(th0 - 9 * Math.sin((k * Math.PI) / 2)));
		const from = this.theta;
		const base = -(pick + 0.5) * S + jit * 0.7 * S;
		let tgt = base;
		const turns = ui.rm ? 1 : human ? 5 : 4;
		while (tgt < from + 360 * turns) tgt += 360;
		const over = ui.rm ? 0 : S * 0.1;
		const D = ui.rm ? 900 : human ? 3500 : 2500;
		let lastC = Math.floor(from / S);
		let lastT = 0;
		let prevTh = from;
		let prevNow = performance.now();
		const onFrame = (th) => {
			const now = performance.now();
			const dt = Math.max(1e-3, (now - prevNow) / 1000);
			const speed = Math.abs(th - prevTh) / dt;
			prevTh = th;
			prevNow = now;
			this._set(th);
			const c = Math.floor(th / S);
			if (c !== lastC) {
				lastC = c;
				this.tau = -(7 + Math.min(24, speed * 0.018));
				this.omega = 0;
				if (now - lastT > 45) {
					lastT = now;
					ui.sfx('tick', { speed });
				}
			}
			this._tick(dt);
		};
		await this._anim(D, (k) => onFrame(from + (tgt + over - from) * (1 - Math.pow(1 - k, 3.4))));
		if (over) await this._anim(320, (k) => onFrame(tgt + over * (1 - (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2))));
		this._set(tgt);
		// mandal dinlensin
		await this._anim(200, () => this._tick(1 / 60));
		this.theta = tgt % 360;
		this._set(this.theta);
		const key = this.keys[pick];
		if (!live()) return key;
		this.result(key, jit * 0.7 * S, p);
		await sleep(ui.rm ? 500 : key === 'fetih' ? 1350 : human ? 1150 : 950);
		if (!live()) return key;
		el.classList.remove('on');
		await sleep(230);
		if (!live()) return key;
		el.style.display = 'none';
		$.hub.classList.remove('go');
		return key;
	}

	result(key, off, p) {
		const ui = this.ui;
		const $ = this.$;
		const c = sliceOf(key);
		const fet = key === 'fetih';
		this.el.classList.remove('spinning');
		this.el.classList.add('done');
		this.el.classList.toggle('fetih', fet);
		$.hl.style.transform = `rotate(${off.toFixed(1)}deg)`;
		$.res.style.setProperty('--cc', fet ? '#f5b324' : c.color);
		$.res.style.setProperty('--cd', fet ? '#7a4a06' : shade(c.color, -0.45));
		$.res.innerHTML = `<span class="ri">${ico(c.icon, { w: 2.6, c: fet ? '#d88a00' : c.color })}</span><span class="rt"><b>${esc(fet ? 'FETİH!' : c.name)}</b>${
			fet ? `<small>${p.human ? 'Kategoriyi sen seç!' : esc(p.name) + ' kategori seçiyor'}</small>` : ''
		}</span>`;
		$.res.classList.add('on');
		ui.sfx(fet ? 'fetih' : 'reveal');
		const r = $.box.getBoundingClientRect();
		const x = r.left + r.width / 2;
		const y = r.top + r.height * 0.22;
		ui.fx.ring(x, r.top + r.height / 2, { color: fet ? '#ffd25a' : c.color, size: r.width * 1.5, life: 700 });
		ui.fx.burst(x, y, { n: fet ? 26 : 16, dist: r.width * 0.55, colors: fet ? ['#ffd25a', '#fff', '#ffb400'] : [c.color, '#fff', '#ffd25a'], kind: 'star', size: 14, life: 900 });
		if (fet) ui.fx.confetti(window.innerWidth, { n: 36, life: 2200 });
	}

	_anim(ms, fn) {
		const g = this.ui._gen;
		return new Promise((res) => this.ui.fx.tween(ms, (k) => g === this.ui._gen && fn(k), res));
	}

	/** "Fetih!" dilimi: oyuncu kategorisini seçer. */
	async choose(keys) {
		const ui = this.ui;
		const el = this.el;
		const host = document.createElement('div');
		host.className = 'fl-catpick';
		host.innerHTML = `<div class="hd"><span class="cr">${ico('crown', { w: 2.4, c: '#7a4a06' })}</span><b>FETİH!</b><small>Kategorini seç</small></div>
			<div class="gr">${keys
				.map((k, i) => {
					const c = CATS[k];
					return `<button data-c="${k}" style="--cc:${c.color};--cd:${shade(c.color, -0.42)};--k:${i}"><span class="ci">${ico(c.icon, { w: 2.5, c: c.color })}</span><b>${esc(c.name)}</b></button>`;
				})
				.join('')}</div>`;
		el.querySelector('.fl-wh')?.classList.add('hide');
		el.appendChild(host);
		el.style.display = '';
		el.style.pointerEvents = 'auto';
		void el.offsetWidth;
		el.classList.add('on', 'pick');
		const k = await new Promise((res) => {
			host.addEventListener('click', (e) => {
				const b = e.target.closest('[data-c]');
				if (b) {
					b.classList.add('chosen');
					res(b.dataset.c);
				}
			});
		});
		ui.sfx('tap');
		await sleep(ui.rm ? 50 : 380);
		el.classList.remove('on');
		el.style.pointerEvents = 'none';
		await sleep(230);
		host.remove();
		el.querySelector('.fl-wh')?.classList.remove('hide');
		el.classList.remove('pick');
		el.style.display = 'none';
		return k;
	}
}
