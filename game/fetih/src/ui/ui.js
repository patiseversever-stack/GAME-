// Arayüz: menü, oyuncu kartları, tur bayrakları, soru kartı, çark, sıralama, harita iğneleri, bitiş.
// Maç akışı her adımı bir Promise ile bekler. fast = true iken (benzetim) her şey anında biter.

import * as THREE from 'three';
import { CSS } from './styles.js';
import { CATS, WHEEL, FETIH_SLICE } from '../quiz/categories.js';
import { MODES } from '../game/match.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const icon = (d) => `<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`;
const PIN = (c) => `<svg viewBox="0 0 26 36"><path d="M13 35C13 35 2 20 2 13a11 11 0 1 1 22 0c0 7-11 22-11 22z" fill="${c}" stroke="#fff" stroke-width="2.5"/><circle cx="13" cy="13" r="4.2" fill="#fff"/></svg>`;
const GOAL = `<svg viewBox="0 0 34 34"><circle cx="17" cy="17" r="14" fill="none" stroke="#fff" stroke-width="3"/><circle cx="17" cy="17" r="8" fill="#ffd25a" stroke="#fff" stroke-width="2.5"/><path d="M17 1v8M17 25v8M1 17h8M25 17h8" stroke="#fff" stroke-width="2.5"/></svg>`;
const REGION_NAMES = { marmara: 'Marmara', ege: 'Ege', akdeniz: 'Akdeniz', icanadolu: 'İç Anadolu', karadeniz: 'Karadeniz', dogu: 'Doğu Anadolu', guneydogu: 'Güneydoğu', all: 'Tüm Türkiye' };

export class UI {
	constructor(root, app, h) {
		this.app = app;
		this.h = h;
		this.fast = false;
		const st = document.createElement('style');
		st.textContent = CSS;
		root.appendChild(st);
		const el = document.createElement('div');
		el.className = 'fl-ui';
		el.lang = 'tr';
		el.innerHTML = `
			<div class="fl-pins" data-r="pins"></div>
			<div class="fl-hud" data-r="hud"></div>
			<div class="fl-banner" data-r="banner"><b></b><span></span></div>
			<div class="fl-prompt" data-r="prompt"></div>
			<div class="fl-rank" data-r="rank"></div>
			<div class="fl-q" data-r="q"></div>
			<div class="fl-wheel" data-r="wheel" style="display:none"></div>
			<div class="fl-scr fl-title" data-r="title">
				<div class="fl-logo"><span class="a">FETİH</span><span class="b">LİGİ</span><small>Bil, fethet, Türkiye'yi kazan.</small></div>
				<button class="fl-play" data-a="menu">OYNA</button>
			</div>
			<div class="fl-scr off" data-r="menu"></div>
			<div class="fl-scr fl-end off" data-r="end"></div>`;
		root.appendChild(el);
		this.el = el;
		this.$ = {};
		for (const n of el.querySelectorAll('[data-r]')) this.$[n.dataset.r] = n;
		el.addEventListener('pointerdown', (e) => {
			if (e.target.closest('button,.fl-q,.fl-card,input')) e.stopPropagation();
		});
		el.addEventListener('click', (e) => {
			const b = e.target.closest('[data-a]');
			if (!b) return;
			const a = b.dataset.a;
			if (a === 'menu') this.showMenu();
		});
		this.cfg = { mode: 'ffa3', length: 'quick', region: 'random', bot: 'er' };
		this.pins = [];
		this.labels = [];
		this._v = new THREE.Vector3();
	}

	// ---------------------------------------------------------------- menüler

	showMenu() {
		this.$.title.classList.add('off');
		const c = this.cfg;
		const seg = (key, opts, cls = '') =>
			`<div class="fl-seg ${cls}">${opts.map(([v, l]) => `<button data-k="${key}" data-v="${v}" class="${c[key] === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
		this.$.menu.innerHTML = `<div class="fl-card">
			<h3>Yeni Maç</h3>
			<div class="fl-lbl">Oyuncular</div>${seg('mode', Object.entries(MODES).map(([k, m]) => [k, m.label]))}
			<div class="fl-lbl">Süre</div>${seg('length', [['quick', 'Hızlı'], ['long', 'Uzun']], 'c3')}
			<div class="fl-lbl">Harita</div>${seg('region', [['random', 'Rastgele'], ['ege', 'Ege'], ['marmara', 'Marmara'], ['karadeniz', 'Karadeniz'], ['akdeniz', 'Akdeniz'], ['icanadolu', 'İç Anadolu'], ['dogu', 'Doğu'], ['all', 'Türkiye']])}
			<div class="fl-lbl">Rakipler</div>${seg('bot', [['caylak', 'Çaylak'], ['er', 'Er'], ['usta', 'Usta'], ['efsane', 'Efsane']])}
			<button class="fl-go" data-go="1">SAVAŞA BAŞLA</button>
		</div>`;
		this.$.menu.classList.remove('off');
		this.$.menu.onclick = (e) => {
			const b = e.target.closest('button');
			if (!b) return;
			if (b.dataset.k) {
				c[b.dataset.k] = b.dataset.v;
				for (const x of this.$.menu.querySelectorAll(`[data-k="${b.dataset.k}"]`)) x.classList.toggle('on', x === b);
				if (b.dataset.k === 'length' && b.dataset.v === 'long') {
					c.region = 'all';
					for (const x of this.$.menu.querySelectorAll('[data-k="region"]')) x.classList.toggle('on', x.dataset.v === 'all');
				}
			}
			if (b.dataset.go) {
				this.$.menu.classList.add('off');
				const regions = ['ege', 'marmara', 'karadeniz', 'akdeniz', 'icanadolu', 'dogu', 'guneydogu'];
				const region = c.region === 'random' ? regions[Math.floor(Math.random() * regions.length)] : c.region;
				this.h.start({ ...c, region });
			}
		};
	}

	title(on) {
		this.$.title.classList.toggle('off', !on);
		if (on) this.$.hud.innerHTML = '';
	}

	// ---------------------------------------------------------------- oyuncu kartları

	hud(m) {
		const html = m.players
			.map((p) => {
				const k = this.app.castles[p.i];
				const hp = [0, 1, 2].map((j) => `<i class="${p.alive && j < k.hp ? '' : 'off'}"></i>`).join('');
				return `<div class="fl-pl ${p.alive ? '' : 'dead'} ${m.turn === p.i ? 'turn' : ''}" style="${m.mode.teams ? `border-bottom-color:${p.team ? '#3d7dff' : '#ff4d4d'}` : ''}">
					<span class="fl-av" style="background:${p.css}">${esc(p.name[0])}</span>
					<div><b>${esc(p.name)}</b><em>${p.score.toLocaleString('tr-TR')}</em></div>
					<span class="fl-hp">${hp}</span></div>`;
			})
			.join('');
		if (html !== this._hud) {
			this._hud = html;
			this.$.hud.innerHTML = html;
		}
	}

	// ---------------------------------------------------------------- tur bayrağı ve ipucu

	async banner(title, sub, { tone = '', short = false } = {}) {
		if (this.fast) return;
		const b = this.$.banner;
		b.className = `fl-banner ${tone}`;
		b.querySelector('b').textContent = title;
		b.querySelector('span').textContent = sub || '';
		b.querySelector('span').style.display = sub ? '' : 'none';
		await sleep(30);
		b.classList.add('on');
		this.app.sfx?.play?.('banner');
		await sleep(short ? 800 : 1150);
		b.classList.remove('on');
		await sleep(220);
	}

	prompt(html) {
		const p = this.$.prompt;
		if (!html) return p.classList.remove('on');
		p.innerHTML = html;
		p.classList.add('on');
	}

	// ---------------------------------------------------------------- il seçimi

	async pickProvince(m, options, text) {
		const app = this.app;
		const b = app.board;
		if (this.fast) return m.botChoose(m.players[0], options, 'free');
		for (const i of options) b.fx(i, 0.18, 0.75);
		this.showLabels(options);
		this.prompt(`<em>${esc(text)}</em>`);
		app.cam.fit(app.boundsOf(m.map), { pitch: 0.98 });
		const pick = await new Promise((res) => {
			app.onTap = (idx) => {
				if (options.includes(idx)) res(idx);
			};
		});
		app.onTap = null;
		for (const i of options) b.fx(i, 0, 0);
		this.showLabels([]);
		this.prompt(null);
		this.app.sfx?.play?.('tap');
		return pick;
	}

	async botPick(m, p, i) {
		if (this.fast) return;
		this.app.board.fx(i, 0.3, 1);
		await sleep(380);
		this.app.board.fx(i, 0, 0);
	}

	showLabels(list) {
		for (const l of this.labels) l.el.remove();
		this.labels = list.map((i) => {
			const e = document.createElement('div');
			e.className = 'fl-label';
			e.textContent = this.app.board.provinces[i].name;
			this.$.pins.appendChild(e);
			return { el: e, i };
		});
	}

	// ---------------------------------------------------------------- soru

	async question(m, ctx) {
		const { q, v, T, who, bots, human } = ctx;
		const app = this.app;
		if (this.fast) {
			// benzetim: insan da bot gibi cevaplar
			const hb = human ? T.bot(v, 0.6, m.R) : null;
			return { human: hb ? { value: hb.value, time: hb.time } : null };
		}
		const card = this.$.q;
		const cat = CATS[q.cat];
		const duel = ctx.attacker && ctx.defender;
		const vs = duel
			? `<span class="fl-vs"><i style="background:${ctx.attacker.css}">${esc(ctx.attacker.name[0])}</i>⚔<i style="background:${ctx.defender.css}">${esc(ctx.defender.name[0])}</i></span>`
			: '';
		card.innerHTML = `<div class="fl-qtop">
				<span class="fl-cat" style="background:${cat.color}">${icon(cat.icon)}${esc(cat.name)}</span>
				<span class="fl-type">${esc(T.label)}</span>${vs}
				<span class="fl-timer" data-r="timer"><svg viewBox="0 0 40 40"><circle class="bg" cx="20" cy="20" r="16"/><circle class="fg" cx="20" cy="20" r="16" stroke-dasharray="100.5" stroke-dashoffset="0"/></svg><b>${T.time}</b></span>
			</div>
			<div class="fl-answered">${who.map((p) => `<i data-p="${p.i}" style="background:${p.css}"></i>`).join('')}</div>
			<div class="fl-qtext">${esc(q.q)}</div>
			<div class="fl-qbody"></div>`;
		const body = card.querySelector('.fl-qbody');
		const timer = card.querySelector('[data-r=timer]');
		const fg = timer.querySelector('.fg');
		const tb = timer.querySelector('b');
		let answerRes;
		const answered = new Promise((r) => (answerRes = r));
		let tapHandler = null;
		const api = {
			answer: (value) => answerRes({ value, time: (performance.now() - t0) / 1000 }),
			onMapTap: (fn) => (tapHandler = fn),
			showPin: (p) => this.setPins([{ x: p.x, z: p.z, color: human.css, me: true }]),
		};
		const ctl = T.mount(body, v, api);
		this._ctl = ctl;
		if (T.needsMap) {
			app.cam.fit(app.boundsOf(app.board.provinces.map((p) => p.index)), { pitch: 1.05 });
			app.onGround = (pt) => tapHandler?.(pt);
		}
		await sleep(20);
		card.classList.add('on');
		app.sfx?.play?.('question');
		const t0 = performance.now();
		// botların "cevapladı" işaretleri
		const spectate = !human;
		const scale = spectate ? Math.min(1, 2.6 / Math.max(...bots.map((b) => b.time), 0.1)) : 1;
		const timers = bots.map((b) =>
			setTimeout(() => card.querySelector(`[data-p="${b.p.i}"]`)?.classList.add('on'), Math.min(b.time, T.time) * 1000 * scale),
		);
		let result = null;
		if (human) {
			const tick = setInterval(() => {
				const t = (performance.now() - t0) / 1000;
				const left = Math.max(0, T.time - t);
				fg.setAttribute('stroke-dashoffset', String(100.5 * (1 - left / T.time)));
				tb.textContent = String(Math.ceil(left));
				timer.classList.toggle('hot', left < 4);
				if (left <= 0) answerRes({ value: ctl.value ? ctl.value() : null, time: T.time, timeout: true });
			}, 100);
			result = await answered;
			clearInterval(tick);
			ctl.lock?.();
			card.querySelector(`[data-p="${human.i}"]`)?.classList.add('on');
			app.sfx?.play?.(result.timeout ? 'timeout' : 'answer');
			// botlar hâlâ düşünüyorsa kısa bir bekleme (en çok 1.2 sn)
			const rest = Math.max(0, Math.min(1.2, Math.max(0, ...bots.map((b) => b.time)) - result.time));
			await sleep(rest * 1000);
		} else {
			await sleep(Math.min(2.8, Math.max(...bots.map((b) => b.time)) * scale) * 1000 + 200);
		}
		for (const t of timers) clearTimeout(t);
		for (const b of bots) card.querySelector(`[data-p="${b.p.i}"]`)?.classList.add('on');
		app.onGround = null;
		return { human: result };
	}

	async reveal(m, ctx) {
		if (this.fast) return;
		const { T, v, results } = ctx;
		const ctl = this._ctl;
		ctl?.reveal(results);
		if (T.needsMap) {
			this.setPins([
				{ x: v.target.x, z: v.target.z, goal: true },
				...results.filter((r) => r.value).map((r) => ({ x: r.value.x, z: r.value.z, color: r.color })),
			]);
		}
		this.app.sfx?.play?.(results.some((r) => r.p.human && r.correct) ? 'right' : 'reveal');
		await sleep(T.kind === 'closest' ? 2300 : 1700);
		this.$.q.classList.remove('on');
		this.setPins([]);
		await sleep(250);
	}

	setPins(list) {
		for (const p of this.pins) p.el.remove();
		this.pins = list.map((p) => {
			const e = document.createElement('div');
			e.className = `fl-pin ${p.goal ? 'goal' : ''}`;
			e.innerHTML = p.goal ? GOAL : PIN(p.color);
			this.$.pins.appendChild(e);
			return { el: e, x: p.x, z: p.z };
		});
	}

	/** Her kare: iğneleri ve il adlarını ekrana izdüşür. */
	update() {
		const app = this.app;
		const v = this._v;
		const s = { x: 0, y: 0 };
		for (const p of this.pins) {
			app.toScreen(v.set(p.x, app.board.top, p.z), s);
			p.el.style.transform = `translate(${s.x}px,${s.y}px)`;
		}
		for (const l of this.labels) {
			app.board.topAt(l.i, v);
			app.toScreen(v, s);
			l.el.style.transform = `translate(${s.x}px,${s.y - 16}px) translate(-50%,-50%)`;
		}
	}

	async ranking(m, order, picks) {
		if (this.fast) return;
		const r = this.$.rank;
		r.innerHTML = `<h4>Seçim sırası</h4>${order
			.map((o, k) => `<div><b>${k + 1}</b><i style="background:${o.color}"></i><span>${esc(o.name)}</span><em>${picks[k] ? `+${picks[k]} il` : '—'}</em></div>`)
			.join('')}`;
		r.classList.add('on');
		await sleep(1500);
		r.classList.remove('on');
		await sleep(200);
	}

	// ---------------------------------------------------------------- çark

	async wheel(m, p) {
		const n = WHEEL.length;
		const pick = Math.floor(m.R() * n);
		m.turn = p.i;
		this.hud(m);
		if (this.fast) return WHEEL[pick];
		const w = this.$.wheel;
		const R = 100;
		const slices = WHEEL.map((k, i) => {
			const c = k === 'fetih' ? FETIH_SLICE : CATS[k];
			const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
			const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
			const x0 = 110 + Math.cos(a0) * R;
			const y0 = 110 + Math.sin(a0) * R;
			const x1 = 110 + Math.cos(a1) * R;
			const y1 = 110 + Math.sin(a1) * R;
			const am = (a0 + a1) / 2;
			const ix = 110 + Math.cos(am) * 64;
			const iy = 110 + Math.sin(am) * 64;
			return `<path d="M110 110L${x0} ${y0}A${R} ${R} 0 0 1 ${x1} ${y1}Z" fill="${c.color}" stroke="#fff" stroke-width="3"/>
				<g transform="translate(${ix - 13} ${iy - 13}) scale(1.1)"><path d="${c.icon}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>`;
		}).join('');
		w.innerHTML = `<div class="fl-wheel-box"><div class="ptr"></div>
			<svg viewBox="0 0 220 220"><g class="spin">${slices}<circle cx="110" cy="110" r="22" fill="#101a33" stroke="#ffd25a" stroke-width="4"/></g></svg>
			<div class="fl-wheel-cap">${p.human ? 'Çarkı çevir!' : esc(p.name) + ' çeviriyor…'}</div></div>`;
		w.style.display = '';
		await sleep(20);
		w.classList.add('on');
		const spin = w.querySelector('.spin');
		if (p.human) {
			await new Promise((res) => {
				const go = () => {
					w.removeEventListener('pointerdown', go);
					res();
				};
				w.style.pointerEvents = 'auto';
				w.addEventListener('pointerdown', go);
				setTimeout(go, 2500);
			});
			w.style.pointerEvents = 'none';
		} else await sleep(450);
		// dilimin ortası işaretçinin altına gelsin
		const deg = 360 * 5 - ((pick + 0.5) / n) * 360 + (m.R() - 0.5) * (300 / n);
		spin.style.transform = `rotate(${deg}deg)`;
		this.app.sfx?.play?.('wheel');
		await sleep(2350);
		const key = WHEEL[pick];
		const c = key === 'fetih' ? FETIH_SLICE : CATS[key];
		w.querySelector('.fl-wheel-cap').innerHTML = `<span style="color:${c.color}">${esc(c.name)}</span>`;
		await sleep(700);
		w.classList.remove('on');
		await sleep(220);
		w.style.display = 'none';
		return key;
	}

	async chooseCategory(m) {
		if (this.fast) return 'tarih';
		const w = this.$.wheel;
		w.innerHTML = `<div class="fl-card"><h3>Kategorini seç</h3><div class="fl-catpick">${Object.entries(CATS)
			.map(([k, c]) => `<button data-c="${k}" style="background:${c.color}">${icon(c.icon)}${esc(c.name)}</button>`)
			.join('')}</div></div>`;
		w.style.display = '';
		w.style.pointerEvents = 'auto';
		await sleep(20);
		w.classList.add('on');
		const k = await new Promise((res) => {
			w.onclick = (e) => {
				const b = e.target.closest('[data-c]');
				if (b) res(b.dataset.c);
			};
		});
		w.onclick = null;
		w.classList.remove('on');
		w.style.pointerEvents = 'none';
		await sleep(220);
		w.style.display = 'none';
		return k;
	}

	// ---------------------------------------------------------------- bitiş

	async end(m, ranking) {
		m.turn = -1;
		this.hud(m);
		if (this.fast) return ranking;
		const team = !!m.mode.teams;
		const rows = team
			? ranking.map((t, k) => `<div><b>${k + 1}</b><i style="background:${t.team ? '#3d7dff' : '#ff4d4d'}"></i><span>${t.players.map((p) => esc(p.name)).join(' & ')}</span><em>${t.score.toLocaleString('tr-TR')}</em></div>`)
			: ranking.map((p, k) => `<div><b>${k + 1}</b><i style="background:${p.css}"></i><span>${esc(p.name)}</span><em>${p.score.toLocaleString('tr-TR')}</em></div>`);
		const meWon = team ? ranking[0].players.some((p) => p.human) : ranking[0].human;
		this.$.end.innerHTML = `<div class="fl-card"><h3>${meWon ? 'ZAFER!' : 'Maç bitti'}</h3>
			<div class="fl-podium">${rows.join('')}</div>
			<button class="fl-go" data-x="again">TEKRAR OYNA</button></div>`;
		this.$.end.classList.remove('off');
		this.app.sfx?.play?.(meWon ? 'win' : 'lose');
		await new Promise((res) => {
			this.$.end.onclick = (e) => {
				if (e.target.closest('[data-x]')) res();
			};
		});
		this.$.end.classList.add('off');
		this.showMenu();
		return ranking;
	}
}
