// Arayüz: menüler, oyuncu kartları, sahne bayrakları, düello sahnesi, soru kartı, çark, sıralama,
// il seçimi, harita etiketleri ve iğneleri, bildirimler, jokerler, bitiş.
// Maç akışı her adımı bir Promise ile bekler. fast = true iken (benzetim) her şey anında biter.
//
// DESIGN.md sözleşmesi (korunur):
//   hud(m), banner(title, sub, {tone, short}), prompt(html), pickProvince(m, options, text), botPick(m, p, i),
//   question(m, ctx) → {human: {value, time}}, reveal(m, ctx), ranking(m, order, picks), wheel(m, p),
//   chooseCategory(m), end(m, ranking), title(on), showMenu(), update()
// Eklenenler (başka ajanlar ?. ile çağırabilir):
//   toast(text, {tone, icon, p, ms, html}), jokers(list, cb), addTime(sec), hideOptions(indices),
//   setAssets(map), look(p), current (o anki soru: {m, ctx, card, body, ctl}), reset(), debug(opts)

import * as THREE from 'three';
import { CSS } from './styles.js';
import { CATS, WHEEL } from '../quiz/categories.js';
import { esc, ico, ICONS, SPARK, AVATARS, avatar, avatarURL, lookOf, shade, rgbOf, hash, regionSymbols } from './art.js';
import { Fx } from './fx.js';
import { Tags } from './tags.js';
import { WheelView } from './wheel.js';
import { duelIntro } from './duel.js';
import { buildTitle, refreshTitle, showMenu, showCommander, showEnd } from './menu.js';
import { showCampaign } from './campaign.js';
import { renderBar, jokerUsed, sabotage, clearZone, showBotJokers } from './jokerfx.js';
import { questionTime } from '../game/jokers.js';
import { debugShot } from './debug.js';
import { buildPause, showPause } from './pause.js';
import { clock, sleep, setTimeout, clearTimeout, setInterval, clearInterval } from '../core/clock.js';

const svgURL = (inner, vb = '0 0 24 24') => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`)}")`;
const strokeURL = (d, c = '#000', w = 2.8) => svgURL(`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`);
const fillURL = (d) => svgURL(`<path d="${d}" fill="#000" fill-rule="evenodd"/>`);
const TOWER = 'M4 23V10L2.5 8.5V3h4v2.5h3V3h5v2.5h3V3h4v5.5L20 10v13zM10 23v-5a2 2 0 0 1 4 0v5z';
const CROWN = 'M2 21h20v-2.5H2zM3 17L2 6l5.5 4.5L12 3l4.5 7.5L22 6l-1 11z';
const PIN_SHAPE = (c) =>
	`<svg class="sh" viewBox="0 0 40 52"><path d="M20 50C20 50 3 31 3 20a17 17 0 1 1 34 0c0 11-17 30-17 30z" fill="${c}" stroke="#fff" stroke-width="3"/><path d="M20 50C20 50 3 31 3 20a17 17 0 1 1 34 0c0 11-17 30-17 30z" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1" transform="translate(0 1.5)"/></svg>`;
const GOAL = `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="rgba(255,255,255,.25)" stroke="#fff" stroke-width="3"/><circle cx="24" cy="24" r="14" fill="#e8402a" stroke="#fff" stroke-width="3"/><circle cx="24" cy="24" r="6" fill="#fff"/><path d="M24 1v9M24 38v9M1 24h9M38 24h9" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`;
const JK_ICON = [
	[/half|fifty|yari|50/, 'half'],
	[/time|sure|süre|extra|ekstra/, 'clock'],
	[/shield|kalkan/, 'shield'],
	[/second|ikinci|chance|sans|şans/, 'heart'],
	[/sabot/, 'bomb'],
	[/oracle|kahin|kâhin|seyirci|audience/, 'eye'],
];
const TONE_ICON = { info: 'star', good: 'check', bad: 'cross', warn: 'cross', gold: 'crown' };
const yearish = (q) => q && !q.unit && Number.isInteger(q.ans) && q.ans >= 500 && q.ans <= 2100 && /yıl/i.test(q.q || '');

export class UI {
	constructor(root, app, h = {}) {
		this.app = app;
		this.h = { campaign: () => this.showCampaign(), ...(h || {}) };
		this.fast = false;
		this.assets = {};
		const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
		this.rm = !!mq?.matches;
		mq?.addEventListener?.('change', (e) => {
			this.rm = e.matches;
			this.fx.rm = e.matches;
		});
		const st = document.createElement('style');
		st.textContent = CSS;
		root.appendChild(st);
		const el = document.createElement('div');
		el.className = 'fl-ui';
		el.lang = 'tr';
		const syms = regionSymbols(app.board.provinces);
		this.vb = syms.vb;
		el.innerHTML = `${syms.svg}
			<div class="fl-cine" data-r="cine"><i></i><i></i></div>
			<div class="fl-pins" data-r="pins"></div>
			<div class="fl-tags" data-r="tags"></div>
			<div class="fl-hud off" data-r="hud"></div>
			<div class="fl-toasts" data-r="toasts"></div>
			<div class="fl-prompt" data-r="prompt"></div>
			<div class="fl-rank" data-r="rank"></div>
			<div class="fl-q" data-r="q"></div>
			<div class="fl-wheel" data-r="wheel" style="display:none"></div>
			<div class="fl-duel" data-r="duel"></div>
			<div class="fl-banner" data-r="banner"></div>
			<div class="fl-fx" data-r="fx"></div>
			<div class="fl-scr fl-title" data-r="title"></div>
			<div class="fl-scr off" data-r="menu"></div>
			<div class="fl-scr off" data-r="cmd"></div>
			<div class="fl-scr fl-camp off" data-r="camp"></div>
			<div class="fl-scr fl-end off" data-r="end"></div>
			<button class="fl-pbtn off" data-r="pbtn"></button>
			<div class="fl-scr fl-pause off" data-r="pause"></div>`;
		const vars = {
			'--tw': fillURL(TOWER),
			'--crown': fillURL(CROWN),
			'--spk': fillURL(SPARK),
			'--pinm': fillURL(ICONS.pin),
			'--ok': strokeURL(ICONS.check, '#000', 3.4),
			'--no': strokeURL(ICONS.cross, '#000', 3.4),
			'--skull': strokeURL(ICONS.skull, '#fff', 2.2),
		};
		for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
		root.appendChild(el);
		this.el = el;
		this.$ = {};
		for (const n of el.querySelectorAll('[data-r]')) this.$[n.dataset.r] = n;
		el.addEventListener('pointerdown', (e) => {
			if (e.target.closest('button,input,.fl-qc,.fl-card,.fl-cbox,.fl-scr,.fl-wheel,.fl-duel')) e.stopPropagation();
		});
		el.addEventListener('click', (e) => {
			const b = e.target.closest('[data-a]');
			if (!b || !this.$.title.contains(b)) return;
			const a = b.dataset.a;
			this.sfx('tap');
			if (a === 'menu') this.showMenu();
			if (a === 'cmd') {
				this.$.title.classList.add('off');
				showCommander(this, () => this.title(true));
			}
			if (a === 'camp') this.h.campaign?.();
		});
		const store = app.store;
		this.cfg = { mode: 'ffa3', length: 'quick', region: 'random', bot: 'er', ...(store?.get?.('menu') || {}) };
		this.cmd = { name: 'Sen', avatar: 'gokturk', banner: 'duz', color: 0, skin: 0, ...(store?.get?.('commander') || {}) };
		this.fx = new Fx(this.$.fx, { low: app.tier?.id === 0, rm: this.rm });
		this.tags = new Tags(this);
		this.wheelView = new WheelView(this);
		this.pins = [];
		this.lines = [];
		this.labels = [];
		this.marks = [];
		this._lsort = [];
		this._v = new THREE.Vector3();
		this._v2 = new THREE.Vector3();
		this._s = { x: 0, y: 0 };
		this._s2 = { x: 0, y: 0 };
		this._jk = [];
		this._looks = new WeakMap();
		this._extra = 0;
		this.current = null;
		this._gen = 0;
		this.setAssets(app.hooks?.assets);
		// gece istemi yazı tipleri ilk gecede hazır olsun (yedek yazı tipiyle bir kare görünmesin)
		try {
			for (const f of ["italic 500 36px 'Cormorant Garamond'", "700 11px 'Manrope'", "500 11px 'Manrope'"]) document.fonts?.load(f, 'ĞğİıŞşÇçÖöÜü');
		} catch (e) {
			/* yazı tipi API'si yok */
		}
		buildTitle(this);
		buildPause(this);
	}

	// ---------------------------------------------------------------- yardımcılar

	sfx(name, opts) {
		try {
			this.app.sfx?.play?.(name, opts);
		} catch (e) {
			/* ses yoksa sessiz */
		}
	}

	wait(ms) {
		return this.fast ? Promise.resolve() : sleep(ms);
	}

	/** Oyuncunun portre görünümü (insan oyuncu: komutan ayarları; botlar: adından türetilir). */
	look(p) {
		let L = this._looks.get(p);
		if (!L) {
			L = lookOf(p, p.human ? this.cmd : null);
			// aynı maçtaki botlar farklı portre alsın
			if (!p.human && !p.look) {
				const m = this.app.match;
				const used = new Set((m?.players || []).filter((x) => x !== p).map((x) => (x.human ? this.cmd.avatar : this._looks.get(x)?.kind)));
				let k = hash(p.name + '#av') % AVATARS.length;
				for (let n = 0; n < AVATARS.length && used.has(AVATARS[k].id); n++) k = (k + 1) % AVATARS.length;
				L.kind = AVATARS[k].id;
			}
			if (!p.human) this._looks.set(p, L);
		}
		const out = p.human ? { ...L, color: p.css || L.color } : L;
		out.img = out.img || this.assets[`cmd-${out.kind}`] || null;
		return out;
	}

	cmdLook() {
		const cols = this.app.playerColors.map((c) => '#' + c.toString(16).padStart(6, '0'));
		return { kind: this.cmd.avatar, banner: this.cmd.banner, color: cols[this.cmd.color] || cols[0], skin: this.cmd.skin ?? 0, img: this.assets[`cmd-${this.cmd.avatar}`] || null };
	}

	/** Görsel adresleri (ASSETS.md): { 'cmd-gokturk': url, … }. Portreler varsa görseli kullanır. */
	setAssets(map) {
		Object.assign(this.assets, map || {});
	}

	setCommander(cm) {
		this.cmd = { ...this.cmd, ...cm };
		try {
			this.app.store?.set?.('commander', this.cmd);
		} catch (e) {
			/* depolama yok */
		}
		refreshTitle(this);
	}

	saveCfg() {
		try {
			this.app.store?.set?.('menu', this.cfg);
		} catch (e) {
			/* depolama yok */
		}
	}

	wallet() {
		return { xp: 0, gold: 0, ...(this.app.store?.get?.('wallet') || {}) };
	}

	saveWallet(w) {
		try {
			this.app.store?.set?.('wallet', w);
		} catch (e) {
			/* depolama yok */
		}
	}

	/** İstemci koordinatı → arayüz katmanı koordinatı. */
	local(x, y) {
		const r = this.el.getBoundingClientRect();
		return { x: x - r.left, y: y - r.top };
	}

	startMatch(cfg) {
		this.lastCfg = { ...cfg };
		const cols = this.app.playerColors;
		// renk tercihi maç akışına iletilir (cfg.commander.color: oyuncu renkleri dizisindeki sıra)
		return this.h.start?.({ ...cfg, humanName: this.cmd.name, commander: { ...this.cmd, colorHex: cols[this.cmd.color] } });
	}

	// ---------------------------------------------------------------- menüler

	showMenu() {
		this.$.end.classList.add('off');
		this.$.cmd.classList.add('off');
		showMenu(this);
	}

	title(on) {
		this.$.title.classList.toggle('off', !on);
		if (on) {
			this.$.hud.classList.add('off');
			this.$.menu.classList.add('off');
			refreshTitle(this);
		}
	}

	// ---------------------------------------------------------------- oyuncu kartları

	hud(m) {
		if (!m?.players) return;
		const hud = this.$.hud;
		const key = m.players.map((p) => p.i + ':' + p.name).join('|') + (m.mode?.teams ? ':t' : '');
		if (key !== this._hudKey || this._hudM !== m) {
			this._hudKey = key;
			this._hudM = m;
			hud.innerHTML = m.players
				.map((p) => {
					const tcol = m.mode?.teams ? m.players.find((x) => x.team === p.team)?.css : null;
					const team = m.mode?.teams ? `<span class="tm" style="--tc:${tcol}">${p.team ? 'B' : 'A'}</span>` : '';
					return `<div class="fl-pl" data-p="${p.i}" style="--pc:${p.css}"><span class="fl-av">${avatar(this.look(p))}</span>
						<div class="tx"><b>${esc(p.name)}</b><em>${p.score.toLocaleString('tr-TR')}</em></div>
						<span class="cs"><i></i><i></i><i></i></span><span class="sd">${ico('shield', { w: 3, c: '#4a2800' })}</span>${team}</div>`;
				})
				.join('');
			this._pl = m.players.map((p) => {
				const e = hud.querySelector(`[data-p="${p.i}"]`);
				return { e, em: e.querySelector('em'), cs: [...e.querySelectorAll('.cs i')], score: p.score, hp: 3, turn: false, dead: false, shd: false };
			});
		}
		if (!this.$.title.classList.contains('off') || !this.$.menu.classList.contains('off')) hud.classList.add('off');
		else hud.classList.remove('off');
		this.$.pbtn.classList.toggle('off', hud.classList.contains('off') || !!m.over || !!m.aborted || this.fast);
		for (const p of m.players) {
			const s = this._pl[p.i];
			if (!s) continue;
			const turn = m.turn === p.i;
			if (turn !== s.turn) s.e.classList.toggle('turn', (s.turn = turn));
			const dead = !p.alive;
			if (dead !== s.dead) s.e.classList.toggle('dead', (s.dead = dead));
			const shd = !!p.shield;
			if (shd !== s.shd) s.e.classList.toggle('shd', (s.shd = shd));
			const k = this.app.castles?.[p.i];
			const hp = p.alive ? (k ? k.hp : 3) : 0;
			if (hp !== s.hp) {
				s.cs.forEach((c, j) => {
					c.classList.toggle('off', j >= hp);
					if (!this.fast && j >= hp && j < s.hp) {
						c.classList.remove('hit');
						void c.offsetWidth;
						c.classList.add('hit');
					}
				});
				s.hp = hp;
			}
			if (p.score !== s.score) {
				const d = p.score - s.score;
				if (this.fast) s.em.textContent = p.score.toLocaleString('tr-TR');
				else {
					this.fx.count(s.em, s.score, p.score, 650);
					if (Math.abs(d) >= 50) {
						const f = document.createElement('span');
						f.className = 'd' + (d < 0 ? ' neg' : '');
						f.textContent = (d > 0 ? '+' : '−') + Math.abs(d).toLocaleString('tr-TR');
						s.e.appendChild(f);
						setTimeout(() => f.remove(), 1150);
					}
				}
				s.score = p.score;
			}
		}
	}

	// ---------------------------------------------------------------- sahne bayrağı ve bildirim

	async banner(title, sub, { tone = '', short = false } = {}) {
		if (this.fast) return;
		const b = this.$.banner;
		const T = String(title || '');
		const icon = /YAYILMA/.test(T) ? 'flag' : /FETİH/.test(T) ? 'swords' : /KUŞATMA/.test(T) ? 'castle' : /EŞİTLİK/.test(T) ? 'scales' : /ZAFER/.test(T) ? 'crown' : 'star';
		const tn = tone || (/KUŞATMA/.test(T) ? 'red' : 'blue');
		b.className = `fl-banner t-${tn}`;
		b.innerHTML = `<div class="band"><i></i></div><div class="row"><div class="emb">${ico(icon, { w: 2.6, o: 2, oc: 'rgba(0,0,0,.3)' })}</div><b>${[...T]
			.map((c, k) => `<i style="--k:${k}">${c === ' ' ? '&nbsp;' : esc(c)}</i>`)
			.join('')}</b></div>${sub ? `<span>${esc(sub)}</span>` : ''}`;
		const g = this._gen;
		void b.offsetWidth;
		b.classList.add('on');
		this.sfx('banner', { title: T });
		await sleep(this.rm ? 700 : short ? 1000 : 1400);
		if (g !== this._gen) return;
		b.classList.add('out');
		await sleep(280);
		if (g !== this._gen) return;
		b.className = 'fl-banner';
		b.innerHTML = '';
	}

	/** Kısa bildirim. tone: info | good | bad | warn | gold. p: portresi gösterilecek oyuncu. */
	toast(text, { tone = 'info', icon = null, p = null, ms = 2300, html = false } = {}) {
		if (this.fast) return null;
		const box = this.$.toasts;
		while (box.children.length >= 3) box.firstChild.remove();
		const t = document.createElement('div');
		t.className = `fl-toast ${tone}`;
		const lead = p
			? `<span class="fl-av" style="border-color:${p.css}">${avatar(this.look(p))}</span>`
			: `<span class="ti">${ico(icon || TONE_ICON[tone] || 'star', { w: 2.8 })}</span>`;
		t.innerHTML = `${lead}<span>${html ? text : esc(text)}</span>`;
		box.appendChild(t);
		setTimeout(() => {
			t.classList.add('bye');
			setTimeout(() => t.remove(), 280);
		}, ms);
		return t;
	}

	/**
	 * Gece istemi (Gündönümü tonu): ince, geniş aralıklı altın üst satır, italik serif başlık, aralıklı
	 * küçük harfli ipucu. html: `<span class="ey">…</span><b>…</b><small>…</small>`.
	 */
	prompt(html, { tone = '', icon = null } = {}) {
		const p = this.$.prompt;
		if (!html) {
			this._cap = null;
			return p.classList.remove('on');
		}
		p.className = `fl-prompt ${tone} on`;
		p.innerHTML = `<span class="pt">${html}</span>`;
	}

	/** Gece altyazısı (bot seçimi, saldırı, fetih): üst satır, başlık, alt satır. null → kapat. */
	caption(eyebrow, title, sub = null, { tone = '', p = null } = {}) {
		if (this.fast) return;
		if (eyebrow == null) {
			if (this._cap) this.prompt(null);
			return;
		}
		const key = `${eyebrow}|${title}|${sub}`;
		if (this._cap === key) return;
		const dot = p ? `<i class="pd" style="--pc:${p.css}"></i>` : '';
		this.prompt(`<span class="ey">${dot}${esc(String(eyebrow).toLocaleUpperCase('tr-TR'))}</span><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`, { tone: `cap ${tone}` });
		this._cap = key;
	}

	// ---------------------------------------------------------------- il seçimi

	/** İnsan il seçer. sec: seçim süresi; dolunca null döner (seçimi Match bot kuralıyla yapar). */
	async pickProvince(m, options, text, sec = 0) {
		const app = this.app;
		const b = app.board;
		const me = m.players.find((p) => p.human) || m.players[0];
		const capital = m.phase === 'baskent';
		if (this.fast) return m.botChoose(me, options, capital ? 'capital' : 'free');
		m.turn = me.i;
		this.hud(m);
		const attack = options.some((i) => b.provinces[i].owner >= 0 && b.provinces[i].owner !== me.i);
		this._selOn(m, options, attack, me, capital);
		const head = esc(String(text || (attack ? 'Saldıracağın ili seç' : 'Bir il seç')));
		const hint = capital ? 'Parlayan bir ile dokun, kalen oraya kurulur' : attack ? 'Saldırmak için parlayan bir ile dokun' : 'Parlayan bir ile dokun, senin olsun';
		const ey = capital ? 'BAŞKENT · SIRA SENDE' : attack ? 'FETİH · SIRA SENDE' : 'YAYILMA · SIRA SENDE';
		const tm = sec ? `<i class="tm"><u></u><em>${sec}</em></i>` : '';
		this.prompt(`<span class="ey">${ey}</span><b>${head}</b><small>${hint}</small>${tm}`, { tone: (attack ? 'red' : '') + (sec ? ' timed' : '') });
		app.cam.fit(app.boundsOf(m.map), { pitch: 0.98 });
		let tick = 0;
		const pick = await new Promise((res) => {
			this._pickRes = res;
			app.onTap = (idx, x, y) => {
				if (options.includes(idx)) return res(idx);
				this._badTap(m, me, idx, x, y, attack, options);
			};
			if (!sec) return;
			// süre: altın çizgi erir, son 3 sn kızarır; dolunca seçim boş döner
			const box = this.$.prompt.querySelector('.tm');
			const em = box.querySelector('em');
			const t0 = clock.now();
			let last = sec;
			tick = setInterval(() => {
				const left = Math.max(0, sec - (clock.now() - t0) / 1000);
				box.style.setProperty('--k', (left / sec).toFixed(3));
				const s = Math.ceil(left);
				if (s !== last) {
					last = s;
					em.textContent = String(s);
					box.classList.toggle('hot', s <= 3);
					if (s <= 3 && s > 0) this.sfx('count', { left: s });
				}
				if (left <= 0) res(null);
			}, 100);
		});
		clearInterval(tick);
		app.onTap = null;
		this._pickRes = null;
		this._selOff(options);
		this.prompt(null);
		if (pick != null) this.sfx('tap');
		return pick;
	}

	_selOn(m, options, attack, me = null, capital = false) {
		const b = this.app.board;
		this._selList = options;
		if (typeof b.select === 'function') {
			try {
				b.select(options, { attack, me: me ? me.i : null });
			} catch (e) {
				for (const i of options) b.fx(i, 0.18, 0.75);
			}
		} else for (const i of options) b.fx(i, 0.18, 0.75);
		// etiketler: ilin adı + sahibi (saldırıda çapraz kılıç); oyuncunun kendi toprağında "SEN" rozeti
		this.selNames(options, capital ? [] : this.homeBadges(m, me, options));
	}

	_selOff(options) {
		const b = this.app.board;
		if (typeof b.select === 'function') {
			try {
				b.select(null);
			} catch (e) {
				/* yoksay */
			}
		}
		for (const i of options) b.fx(i, 0, 0);
		this.tagsOff();
		this._selList = null;
	}

	/** İl etiketi tanımları: [{i, kind, p (sahip oyuncu ya da null), role}]. */
	tagSpecs(m, list, kind, roles = null) {
		const b = this.app.board;
		// çok seçenek (bağlantısız harita): yalnızca ilk 14'ü adlanır, hepsi yine de aydınlık ve dokunulur
		return (list.length > 14 ? list.slice(0, 14) : list).map((i) => {
			const o = b.provinces[i].owner;
			return { i, kind, p: o >= 0 ? m?.players?.[o] || null : null, role: roles?.[i] || null };
		});
	}

	/** Oyuncunun toprağında rozet: okların çıktığı yerde (hedeflere en çok ok çıkan il); ok yoksa başkentte. */
	homeBadges(m, p, targets = []) {
		if (!p) return [];
		const b = this.app.board;
		const cs = b.cues;
		if (cs?.on && cs.main >= 0 && cs.tails.has(cs.main)) return [{ p, i: cs.main, tail: true }];
		const best = p.capital >= 0 ? p.capital : (m?.owned?.(p.i) || [])[0] ?? -1;
		if (best < 0) return [];
		const k = this.app.castles?.[p.i];
		return [{ p, i: best, castle: best === p.capital && !!k?.group.visible }];
	}

	/** Gece odağı etiketlerini göster (3B il adları susar). */
	tagsOn(specs, { badges = [], tap = false } = {}) {
		if (this.fast) return;
		this.app.board.labelLayer?.suspend?.(true);
		this.tags.set(specs, { badges, tap });
	}

	tagsOff() {
		this.tags.clear();
		this.app.board.labelLayer?.suspend?.(false);
		this.app.board.labelLayer?.show?.([]); // seçim adları bitti: genel kipe dön
	}

	/**
	 * Seçim adları: haritanın 3B ad katmanında küçük haplar (DOM etiketi yok). Az seçenekte hepsi görünür;
	 * çok seçenekte yalnızca yakınlaştıkça görünen alandakiler, üst üste binmeden. badges: "SEN" rozeti.
	 */
	selNames(list, badges = []) {
		if (this.fast) return;
		const b = this.app.board;
		this.tags.set([], { badges, tap: false });
		b.labelLayer?.suspend?.(false);
		b.showLabels?.(list, { zoom: list.length > 6 });
	}

	_badTap(m, me, idx, x, y, attack, options) {
		const b = this.app.board;
		const pr = this.$.prompt;
		pr.classList.remove('shake');
		void pr.offsetWidth;
		pr.classList.add('shake');
		this.sfx('wrong');
		if (x != null) {
			const p = this.local(x, y);
			const e = document.createElement('i');
			e.className = 'fl-tapx';
			e.innerHTML = ico('cross', { w: 3.4, c: '#ff5a4a' });
			e.style.left = p.x + 'px';
			e.style.top = p.y + 'px';
			this.$.fx.appendChild(e);
			setTimeout(() => e.remove(), 600);
		}
		const pv = idx >= 0 ? b.provinces[idx] : null;
		const o = pv ? pv.owner : -1;
		let msg;
		if (!pv) msg = 'Orası deniz. Parlayan illerden birine dokun.';
		else if (o === me.i) msg = `${pv.name} zaten senin.`;
		else if (!m.inMap?.has(idx)) msg = `${pv.name} bu maçın haritasında değil.`;
		else if (m.phase === 'baskent') msg = o >= 0 ? `${pv.name} başka bir oyuncunun başkenti.` : `${pv.name} bir başkente komşu. Parlayan illerden birini seç.`;
		else if (o >= 0 && m.ally?.(o, me.i)) msg = `${pv.name} takım arkadaşının.`;
		else if (attack) msg = `${pv.name} sınırında değil. Yalnızca komşu illere saldırabilirsin.`;
		else if (o >= 0) msg = `${pv.name} dolu. Parlayan boş illerden birini seç.`;
		else msg = `${pv.name} topraklarına komşu değil.`;
		this.toast(msg, { tone: 'warn', ms: 2000 });
		// seçilebilenler bir kez daha parlasın
		if (typeof b.select !== 'function') {
			for (const i of options) b.fx(i, 0.32, 1);
			setTimeout(() => {
				if (this._selList === options) for (const i of options) b.fx(i, 0.18, 0.75);
			}, 380);
		}
		this.tags.nudge();
	}

	async botPick(m, p, i) {
		if (this.fast) return;
		m.turn = p.i;
		this.hud(m);
		this.app.board.fx(i, 0.3, 1);
		await sleep(380);
		this.app.board.fx(i, 0, 0);
	}

	/** İlin üstünde kısa süreli oyuncu işareti (portre + ad). */
	mark(i, p, ms = 900) {
		if (this.fast) return;
		const e = document.createElement('div');
		e.className = 'fl-label mark pop';
		e.style.setProperty('--oc', p.css);
		e.innerHTML = `<span class="fl-av">${avatar(this.look(p))}</span>`; // ad haritadaki etikette; burada yalnız portre
		this.$.pins.appendChild(e);
		const mk = { el: e, i, w: 0, h: 0 };
		this.marks.push(mk);
		setTimeout(() => {
			e.remove();
			const k = this.marks.indexOf(mk);
			if (k >= 0) this.marks.splice(k, 1);
		}, ms);
	}

	/** İl adları (seçim sırasında): liste → etiketler (ad + sahip), boş → kapat ve 3B genel adlara dön. */
	showLabels(list, { m = this.app.match, tap = false } = {}) {
		if (list && list.length) this.tagsOn(this.tagSpecs(m, list, 'plain'), { tap });
		else this.tagsOff();
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
		const duel = !!(ctx.attacker && ctx.defender);
		const tie = /EŞİTLİK/i.test(ctx.title || '');
		const gen = ++this._gen;
		// düello girişi yalnızca saldırı sorusunda (maç phase: 'duel' verir); eşitlik bozmada yok
		if (duel && !tie && ctx.phase === 'duel' && !ctx.noIntro) await duelIntro(this, ctx);
		if (gen !== this._gen) return { human: null };
		const card = this.$.q;
		const cat = CATS[q.cat] || CATS[ctx.cat] || { name: 'Genel Kültür', color: '#4a8cff', icon: ICONS.star };
		const map = !!T.needsMap;
		const closest = T.kind === 'closest';
		const sec = v.sec ?? T.time; // süre bütçesi sorunun verisinden (quiz/timing.js), maçla aynı
		const prov = ctx.target != null ? app.board.provinces[ctx.target] : null;
		const siege = duel && prov && ctx.defender.capital === ctx.target;
		this._extra = 0;
		this._floor = 0;
		this._jkCb = null;
		const plate = (p, k, sub) =>
			`<div class="fl-qp ${k}" data-p="${p.i}" style="--pc:${p.css}"><span class="fl-av">${avatar(this.look(p))}</span><span class="nm"><b>${esc(p.name)}</b>${
				sub ? `<small>${sub}</small>` : ''
			}</span><i class="st">${ico('check', { w: 3.4 })}</i><span class="tt"></span></div>`;
		const whoHTML = duel
			? `${plate(ctx.attacker, 'a', 'SALDIRAN')}<div class="fl-qvs"><b>VS</b>${prov ? `<span>${esc(prov.name)}</span>` : ''}</div>${plate(ctx.defender, 'd', siege ? 'KALE' : 'SAVUNAN')}`
			: who.map((p) => plate(p, '', '')).join('');
		const rule = !human ? 'İzliyorsun' : tie ? 'Eşitlik bozma' : closest ? 'En yakın kazanır' : '';
		card.className = `fl-q${map ? ' map' : ''}${closest ? ' kc' : ''}${human ? '' : ' spec'}`;
		card.style.setProperty('--cc', cat.color);
		card.style.setProperty('--cd', shade(cat.color, -0.4));
		card.style.setProperty('--me', human ? avatarURL(this.look(human)) : 'none');
		card.innerHTML = `<div class="fl-qwho${duel ? ' duel' : ''}">${whoHTML}</div>
			<div class="fl-qc">
				<div class="fl-qhead"><span class="fl-cat"><span class="ci">${ico(cat.icon, { w: 2.6, c: cat.color })}</span><b>${esc(cat.name)}</b></span><span class="fl-type">${esc(
					String(T.label || '').toLocaleUpperCase('tr-TR'),
				)}</span>${rule ? `<span class="fl-rule">${esc(rule)}</span>` : ''}<span class="fl-clock"><b>${sec}</b></span></div>
				<div class="fl-tbar"><i></i></div>
				<div class="fl-qtext">${esc(q.q)}</div>
				<div class="fl-qbody"></div>
				<div class="fl-jk"></div>
			</div>
			<div class="fl-stamp"></div>`;
		const body = card.querySelector('.fl-qbody');
		const clockB = card.querySelector('.fl-clock b');
		let answerRes;
		let answered = false;
		const done = new Promise((r) => (answerRes = r));
		let t0 = clock.now();
		let tapHandler = null;
		let cur = null;
		const finish = (val) => {
			if (answered) return;
			answered = true;
			if (cur) cur.answered = true;
			answerRes(val);
		};
		const api = {
			answer: (value) => finish({ value, time: (clock.now() - t0) / 1000 }),
			onMapTap: (fn) => (tapHandler = fn),
			showPin: (p) => this.setPins([{ x: p.x, z: p.z, p: human }]),
		};
		let ctl;
		try {
			ctl = T.mount(body, v, api) || {};
		} catch (e) {
			console.error('soru tipi çizilemedi', e);
			body.innerHTML = '<div class="fl-hint">Bu soru gösterilemedi.</div>';
			ctl = {};
		}
		this._ctl = ctl;
		cur = { m, ctx, card, body, ctl, api, answered, finish };
		this.current = cur;
		this._enhance(body, v);
		this._renderJokers();
		if (map) {
			const bb = app.boundsOf(app.board.provinces.map((p) => p.index));
			if (!(innerWidth > innerHeight && innerHeight < 560)) bb.z0 -= (bb.z1 - bb.z0) * 0.5;
			app.cam.fit(bb, { pitch: 1.05 });
			app.onGround = (pt) => tapHandler?.(pt);
		}
		await sleep(20);
		card.classList.add('on');
		this.sfx('question', { type: q.type, cat: q.cat });
		t0 = clock.now();
		showBotJokers(this, ctx.botJokers, gen);
		// botların "cevapladı" işaretleri
		const spectate = !human;
		const maxBot = Math.max(0.1, ...bots.map((b) => b.time));
		const scale = spectate ? Math.min(1, 2.6 / maxBot) : 1;
		this._bar = card.querySelector('.fl-tbar i');
		this._t0 = t0;
		this._sec = spectate ? Math.min(sec, maxBot * scale + 0.4) : sec;
		this._runBar(0);
		const timers = bots.map((b) => setTimeout(() => this._answered(b.p.i), Math.min(b.time, sec) * 1000 * scale));
		let result = null;
		let tick = 0;
		this._cancel = () => {
			clearInterval(tick);
			for (const t of timers) clearTimeout(t);
			finish({ value: null, time: 0, aborted: true });
		};
		if (human) {
			let lastS = -1;
			let hot = false;
			tick = setInterval(() => {
				const t = (clock.now() - t0) / 1000;
				// ekstra süre ve sabotaj: saat Match'te tutulur (ctx.clock.extra), çubuk ve sayaç buna uyar
				const ex = ctx.clock ? ctx.clock.extra : this._extra;
				if (ex !== this._extra) {
					// sabotajdan sonra en az 3 sn kalır (alt sınır bir kez konur, sürekli kayan bir pencere değil)
					if (ex < this._extra) this._floor = Math.max(this._floor, t + 3);
					this._clockFx(ex - this._extra);
					this._extra = ex;
					this._runBar(t);
				}
				const total = questionTime(sec, this._extra, this._floor);
				const left = Math.max(0, total - t);
				const s = Math.ceil(left);
				if (s !== lastS) {
					lastS = s;
					clockB.textContent = String(s);
					const h = left <= 5 && left > 0;
					if (h !== hot) card.classList.toggle('hot', (hot = h));
					if (h) this.sfx('count', { left: s });
				}
				if (left <= 0) {
					let val = null;
					try {
						val = ctl.value ? ctl.value() : null;
					} catch (e) {
						val = null;
					}
					finish({ value: val, time: total, timeout: true });
				}
			}, 100);
			result = await done;
			clearInterval(tick);
			if (result.aborted) return { human: null };
			try {
				ctl.lock?.();
			} catch (e) {
				/* yoksay */
			}
			card.classList.add('locked');
			card.classList.remove('hot');
			this._renderJokers();
			this._answered(human.i);
			this.sfx(result.timeout ? 'timeout' : 'answer');
			if (result.timeout) this.stamp('SÜRE DOLDU', 'warn');
			// botlar hâlâ düşünüyorsa kısa bir bekleme (en çok 1.2 sn)
			const rest = Math.max(0, Math.min(1.2, Math.max(0, ...bots.map((b) => b.time)) - result.time));
			await sleep(rest * 1000);
			if (gen !== this._gen) return { human: null };
		} else {
			await Promise.race([sleep(Math.min(2.8, maxBot * scale) * 1000 + 200), done]);
			if (answered) return { human: null };
		}
		for (const t of timers) clearTimeout(t);
		for (const b of bots) this._answered(b.p.i);
		app.onGround = null;
		this._cancel = null;
		return { human: result };
	}

	_answered(i) {
		const e = this.$.q.querySelector(`.fl-qp[data-p="${i}"]`);
		if (e && !e.classList.contains('done')) {
			e.classList.add('done');
			this.sfx('answered', { player: i });
		}
	}

	_runBar(elapsed) {
		const bar = this._bar;
		if (!bar) return;
		const total = Math.max(this._sec + this._extra, this._floor);
		bar.classList.remove('run');
		void bar.offsetWidth;
		bar.style.setProperty('--tt', total + 's');
		bar.style.animationDelay = `-${Math.max(0, elapsed).toFixed(2)}s`;
		bar.classList.add('run');
	}

	/** Tiplerin çizdiği gövdeye ortak dokunuşlar: uzun şıklar tek sütun, kaydırıcı dolgusu, yıl biçimi. */
	_enhance(body, v) {
		const opts = body.querySelector('.fl-opts');
		if (opts) {
			const long = [...opts.querySelectorAll('.fl-opt')].some((b) => (b.textContent || '').trim().length > 24);
			if (long) opts.classList.add('one');
		}
		for (const r of body.querySelectorAll('.fl-range')) {
			const fill = () => {
				const mn = Number(r.min) || 0;
				const mx = Number(r.max) || 100;
				r.style.setProperty('--p', (((Number(r.value) - mn) / (mx - mn || 1)) * 100).toFixed(1) + '%');
			};
			fill();
			r.addEventListener('input', fill);
			for (const s of body.querySelectorAll('.fl-step')) s.addEventListener('click', () => setTimeout(fill, 0));
		}
		// yıllar binlik ayraçsız (1.453 değil 1453)
		if (yearish(v?.q)) {
			const val = body.querySelector('.fl-num-val b');
			if (val) {
				const fix = () => {
					const t = val.textContent;
					if (/\d\.\d{3}/.test(t)) val.textContent = t.replace(/\./g, '');
				};
				fix();
				new MutationObserver(fix).observe(val, { childList: true, characterData: true, subtree: true });
			}
		}
	}

	stamp(text, tone = '', sub = '') {
		const s = this.$.q.querySelector('.fl-stamp');
		if (!s) return;
		s.className = `fl-stamp ${tone}`;
		s.innerHTML = `${esc(text)}${sub ? `<small>${esc(sub)}</small>` : ''}`;
		void s.offsetWidth;
		s.classList.add('on');
	}

	async reveal(m, ctx) {
		if (this.fast) return;
		const { T, v, results } = ctx;
		const card = this.$.q;
		const ctl = this._ctl;
		const gen = this._gen;
		card.classList.add('rv', 'locked');
		card.classList.remove('hot');
		clearZone(this);
		this._renderJokers();
		try {
			ctl?.reveal?.(results);
		} catch (e) {
			console.error('cevap gösterilemedi', e);
		}
		this._whoAvatars(card, results);
		const closest = T.kind === 'closest';
		const order = results.slice().sort((a, b) => (closest ? a.err - b.err || a.time - b.time : (b.correct ? 1 : 0) - (a.correct ? 1 : 0) || a.time - b.time));
		for (const r of results) {
			const e = card.querySelector(`.fl-qp[data-p="${r.i}"]`);
			if (!e) continue;
			e.classList.add('done');
			e.querySelector('.tt').textContent = r.value == null ? '—' : (r.time ?? 0).toFixed(1) + ' sn';
			if (!closest) {
				e.classList.toggle('no', !r.correct);
				if (!r.correct) e.querySelector('.st').innerHTML = ico('cross', { w: 3.4 });
			}
		}
		if (closest) {
			this._closest(card, T, v, order);
			card.querySelector(`.fl-qp[data-p="${order[0].i}"]`)?.classList.add('win');
		}
		const rt = card.querySelector('.fl-opt.right,.fl-card2.right,.fl-word.revealed,.fl-item.right,.fl-tile.right');
		if (rt) {
			const c = Fx.center(rt);
			this.fx.burst(c.x, c.y, { n: 14, dist: 80, colors: ['#7dff9a', '#fff', '#ffd25a'], kind: 'star', size: 12 });
		}
		for (const w of card.querySelectorAll('.fl-opt.wrong,.fl-card2.wrong')) {
			const c = Fx.center(w);
			this.fx.burst(c.x, c.y, { n: 7, dist: 44, colors: ['#ff5a4a', '#ffb0a0'], size: 9, life: 500 });
		}
		const me = results.find((r) => r.p.human);
		if (me) {
			if (closest) {
				const rank = order.indexOf(me);
				if (rank === 0) this.stamp(me.err === 0 ? 'TAM İSABET!' : 'EN YAKIN SEN!', 'gold');
				else this.stamp(`${rank + 1}. SIRADASIN`, 'bad', `${order[0].name} daha yakın`);
				this.sfx(rank === 0 ? 'right' : 'wrong');
			} else {
				this.stamp(me.correct ? 'BİLDİN!' : me.value == null ? 'SÜRE DOLDU' : 'BİLEMEDİN', me.correct ? '' : me.value == null ? 'warn' : 'bad');
				this.sfx(me.correct ? 'right' : 'wrong');
			}
			if (me.correct || (closest && order[0] === me)) {
				const s = card.querySelector('.fl-stamp');
				if (s) {
					const c = Fx.center(s);
					this.fx.burst(c.x, c.y, { n: 18, dist: 140, kind: 'star', size: 14, life: 900 });
				}
			}
		} else this.sfx('reveal');
		if (T.needsMap) this._mapReveal(v, results);
		await this._hold(closest ? 3000 : 1900);
		if (gen !== this._gen) return;
		card.classList.remove('on');
		this.setPins([]);
		await sleep(260);
		if (gen !== this._gen) return;
		card.className = 'fl-q';
		this.current = null;
	}

	/** Bekle; kart açıkken dokunulursa (en az 0.8 sn sonra) erken geç. */
	_hold(ms) {
		return new Promise((res) => {
			const t0 = clock.now();
			const card = this.$.q;
			let tm = 0;
			const end = () => {
				clearTimeout(tm);
				card.removeEventListener('pointerdown', skip);
				this._cancel = null;
				res();
			};
			const skip = () => {
				if (clock.now() - t0 > 800) end();
			};
			tm = setTimeout(end, ms);
			card.addEventListener('pointerdown', skip);
			this._cancel = end;
		});
	}

	/** Tiplerin koyduğu .fl-who renk işaretlerini oyuncu portrelerine çevir. */
	_whoAvatars(card, results) {
		const byRGB = new Map(results.map((r) => [rgbOf(r.color), r]));
		for (const w of card.querySelectorAll('.fl-who')) {
			if (w.dataset.av) continue;
			const r = byRGB.get(w.style.backgroundColor) || results.find((x) => x.color === w.style.background);
			if (!r) continue;
			w.dataset.av = '1';
			w.style.borderColor = '#fff';
			w.innerHTML = avatar({ ...this.look(r.p), img: null });
		}
	}

	/** En yakın kazanır: doğru cevap, sayı doğrusu ve uzaklık çubukları. */
	_closest(card, T, v, order) {
		const body = card.querySelector('.fl-qbody');
		const q = v.q || {};
		const map = !!T.needsMap;
		const num = !map && typeof q.ans === 'number';
		const yr = yearish(q);
		const fmt = (x) => (yr ? String(Math.round(x)) : (Math.round(Number(x) * 100) / 100).toLocaleString('tr-TR'));
		const unit = q.unit || '';
		let html = '';
		if (num) {
			html += `<div class="fl-ans"><small>DOĞRU<br>CEVAP</small><b data-r="ans">${fmt(q.ans)}</b>${unit ? `<em>${esc(unit)}</em>` : ''}</div>`;
			const vals = order.filter((r) => r.value != null).map((r) => Number(r.value));
			let lo = Math.min(q.ans, ...vals);
			let hi = Math.max(q.ans, ...vals);
			const pad = Math.max((hi - lo) * 0.14, Math.abs(q.ans) * 0.02, 1);
			lo -= pad;
			hi += pad;
			if (q.min != null) lo = Math.max(q.min, lo);
			if (q.max != null) hi = Math.min(q.max, hi);
			if (hi <= lo) hi = lo + 1;
			const X = (x) => Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
			const ax = X(q.ans);
			let segs = '';
			let mks = '';
			order.forEach((r, k) => {
				if (r.value == null) return;
				const x = X(Number(r.value));
				segs += `<i class="seg" style="--a:${Math.min(ax, x).toFixed(4)};--b:${Math.max(ax, x).toFixed(4)};--c:${r.color};--o:${x < ax ? '100%' : '0%'}"></i>`;
				mks += `<b class="mk" style="--x:${x.toFixed(4)};--c:${r.color};--k:${k}">${avatar({ ...this.look(r.p), img: null })}</b>`;
			});
			const span = hi - lo;
			const tick = (x) => (yr ? String(Math.round(x)) : (span >= 20 ? Math.round(x) : Math.round(x * 10) / 10).toLocaleString('tr-TR'));
			html += `<div class="fl-nline"><i class="trk"></i>${segs}<i class="gl" style="--x:${ax.toFixed(4)}"></i>${mks}<span class="tk" style="left:0">${tick(lo)}</span><span class="tk" style="left:100%">${tick(hi)}</span></div>`;
		}
		const fin = order.filter((r) => Number.isFinite(r.err));
		const maxErr = Math.max(0, ...fin.map((r) => r.err));
		const minErr = Math.min(0, ...fin.map((r) => r.err)); // yıldırım turu gibi eksi hatalı (skor) tipler için
		const spread = maxErr - minErr;
		const rows = order
			.map((r, k) => {
				const ok = Number.isFinite(r.err) && r.value != null;
				const w = !ok ? 0 : spread <= 0 ? 1 : Math.max(0.06, 1 - (r.err - minErr) / (spread * 1.15));
				// tip kendi biçimini verebilir: T.fmt(v, value, result) → yazı
				let val;
				if (!ok) val = '—';
				else if (typeof T.fmt === 'function') val = esc(T.fmt(v, r.value, r));
				else if (map) val = `${Math.round(r.err).toLocaleString('tr-TR')} km`;
				else if (typeof r.value === 'number') val = `${fmt(r.value)}${unit ? ' ' + esc(unit) : ''}`;
				else val = fmt(r.err);
				const sub = !ok ? 'cevap yok' : typeof T.sub === 'function' ? esc(T.sub(v, r.value, r)) : map ? (r.correct ? 'tam isabet' : 'uzaklık') : r.err === 0 ? 'tam isabet' : `fark ${fmt(r.err)}`;
				const tag = k === 0 && ok ? `<span class="tag">${r.err === 0 || (map && r.correct) ? 'TAM İSABET' : 'EN YAKIN'}</span>` : '';
				return `<div class="fl-cr ${k === 0 && ok ? 'win' : ''}" style="--c:${r.color};--k:${k}"><span class="rk">${k + 1}</span><span class="fl-av">${avatar({ ...this.look(r.p), img: null })}</span>
					<span class="nm"><b>${esc(r.name)}${tag}</b><i class="bar"><u style="--w:${w.toFixed(3)}"></u></i></span><em>${val}<small>${sub}</small></em></div>`;
			})
			.join('');
		const panel = `<div class="fl-close">${html}<div class="fl-crs">${rows}</div></div>`;
		// T.keep: tip kendi cevap tahtasını (sıralama, eşleşme...) korur; sıralama altına eklenir
		if (T.keep) body.insertAdjacentHTML('beforeend', panel);
		else body.innerHTML = panel;
		const ans = body.querySelector('[data-r=ans]');
		if (ans && !this.rm) this.fx.count(ans, q.min ?? 0, q.ans, 800, fmt);
	}

	_mapReveal(v, results) {
		const app = this.app;
		const tg = v.target;
		if (!tg) return;
		this.setPins([{ x: tg.x, z: tg.z, goal: true }, ...results.filter((r) => r.value).map((r) => ({ x: r.value.x, z: r.value.z, p: r.p, km: Number.isFinite(r.err) ? Math.round(r.err) + ' km' : '' }))]);
		this.lines = results
			.filter((r) => r.value)
			.map((r) => {
				const e = document.createElement('i');
				e.className = 'fl-line';
				e.style.borderTopColor = r.color;
				this.$.pins.insertBefore(e, this.$.pins.firstChild);
				return { el: e, a: r.value, b: tg };
			});
		// kamera hedefi ve tahminleri birlikte görsün
		const xs = [tg.x, ...results.filter((r) => r.value).map((r) => r.value.x)];
		const zs = [tg.z, ...results.filter((r) => r.value).map((r) => r.value.z)];
		const b = { x0: Math.min(...xs) - 6, x1: Math.max(...xs) + 6, z0: Math.min(...zs) - 5, z1: Math.max(...zs) + 9 };
		if (!(innerWidth > innerHeight && innerHeight < 560)) b.z0 -= (b.z1 - b.z0) * 0.6;
		else b.x1 += (b.x1 - b.x0) * 0.8;
		try {
			app.cam.fit(b, { pitch: 1.0 });
		} catch (e) {
			/* yoksay */
		}
	}

	setPins(list) {
		for (const p of this.pins) p.el.remove();
		for (const l of this.lines) l.el.remove();
		this.lines = [];
		this.pins = list.map((p) => {
			const e = document.createElement('div');
			e.className = `fl-pin${p.goal ? ' goal' : ''}`;
			if (p.goal) e.innerHTML = `<div class="pb">${GOAL}</div>`;
			else {
				const c = p.p?.css || p.color || '#ff4d4d';
				e.innerHTML = `<div class="pb">${PIN_SHAPE(c)}${p.p ? `<span class="fl-av">${avatar({ ...this.look(p.p), img: null })}</span>` : ''}${p.km ? `<span class="km">${esc(p.km)}</span>` : ''}</div>`;
			}
			this.$.pins.appendChild(e);
			return { el: e, x: p.x, z: p.z };
		});
	}

	/** Her kare: iğneleri, çizgileri ve il adlarını ekrana izdüşür. */
	update() {
		const app = this.app;
		const v = this._v;
		const s = this._s;
		const top = app.board.top;
		const b = app.board;
		// sinematik şeritler: gece odağında üstten ve alttan kayarak girer (yalnızca durum değişince DOM'a yazılır)
		const cine = !this.fast && b.nightTo > 0;
		if (cine !== this._cine) {
			this._cine = cine;
			this.$.cine.classList.toggle('on', cine);
		}
		const hb = typeof b.heightAt === 'function';
		for (const p of this.pins) {
			app.toScreen(v.set(p.x, hb ? b.heightAt(p.x, p.z) : top, p.z), s);
			p.el.style.transform = `translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px)`;
		}
		for (const l of this.lines) {
			app.toScreen(v.set(l.a.x, hb ? b.heightAt(l.a.x, l.a.z) : top, l.a.z), s);
			app.toScreen(this._v2.set(l.b.x, hb ? b.heightAt(l.b.x, l.b.z) : top, l.b.z), this._s2);
			const dx = this._s2.x - s.x;
			const dy = this._s2.y - s.y;
			l.el.style.transform = `translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px) rotate(${Math.atan2(dy, dx).toFixed(4)}rad) scaleX(${Math.hypot(dx, dy).toFixed(1)})`;
		}
		const L = this._lsort;
		if (L.length) {
			for (const l of L) {
				app.board.topAt(l.i, v);
				app.toScreen(v, s);
				if (!l.w) {
					l.w = l.el.offsetWidth || 60;
					l.h = l.el.offsetHeight || 22;
				}
				l.x = s.x;
				l.y = s.y - 8;
			}
			// üst üste binenleri yukarı it (y'ye göre sıralı, en fazla birkaç geçiş)
			L.sort((a, b) => b.y - a.y);
			for (let i = 1; i < L.length; i++) {
				const a = L[i];
				for (let j = 0; j < i; j++) {
					const o = L[j];
					if (Math.abs(a.x - o.x) < (a.w + o.w) / 2 + 2 && a.y > o.y - o.h - 2 && a.y < o.y + a.h) a.y = o.y - o.h - 3;
				}
			}
			for (const l of L) l.el.style.transform = `translate(${(l.x - l.w / 2).toFixed(1)}px,${(l.y - l.h).toFixed(1)}px)`;
		}
		for (const mk of this.marks) {
			app.board.topAt(mk.i, v);
			app.toScreen(v, s);
			if (!mk.w) {
				mk.w = mk.el.offsetWidth || 80;
				mk.h = mk.el.offsetHeight || 28;
			}
			mk.el.style.transform = `translate(${(s.x - mk.w / 2).toFixed(1)}px,${(s.y - mk.h - 8).toFixed(1)}px)`;
		}
		this.tags.update();
	}

	// ---------------------------------------------------------------- jokerler (çizim: jokerfx.js)

	/**
	 * Joker çubuğu: list = Match.jokerList() ya da [{id, label, count, ready}].
	 * Dokununca cb(id, ctx) ya da h.joker(id, ctx) çağrılır; dönüş {ok, reason} ise hata bildirimi gösterilir.
	 */
	jokers(list, cb) {
		this._jk = Array.isArray(list) ? list.filter((j) => j && j.id != null) : [];
		if (typeof cb === 'function') this._jkCb = cb;
		this._renderJokers();
	}

	_renderJokers() {
		renderBar(this);
	}

	/** Bir oyuncu joker kullandı (Match çağırır): insansa etki kartta, botsa rozet olarak görünür. */
	jokerUsed(p, id, effect, cur) {
		jokerUsed(this, p, id, effect, cur);
	}

	/** İnsan oyuncuya rakip sabotajı ulaştı (süre Match'te kısaldı). */
	sabotage(effect) {
		sabotage(this, effect);
	}

	/** Saat değişti (ekstra süre ya da sabotaj): sayaç kısa süre vurgulanır. */
	_clockFx(delta) {
		const ck = this.$.q.querySelector('.fl-clock');
		if (!ck || !delta) return;
		ck.classList.remove('up', 'dn');
		void ck.offsetWidth;
		ck.classList.add(delta > 0 ? 'up' : 'dn');
		setTimeout(() => ck.classList.remove('up', 'dn'), 900);
	}

	/** Ekstra süre jokeri (hata ayıklama): insan oyuncunun süresine sn ekler. */
	addTime(sec = 10) {
		if (!this.current || this.current.answered) return;
		const el = (clock.now() - this._t0) / 1000;
		this._clockFx(sec);
		this._extra += sec;
		this._runBar(el);
		const ck = this.$.q.querySelector('.fl-clock');
		if (ck) {
			const c = Fx.center(ck);
			this.fx.text(c.x, c.y + 30, `+${sec} sn`, { cls: 'good' });
		}
	}

	/** Yarı yarıya jokeri (hata ayıklama): verilen şık sıralarını eler (.fl-opt[data-i]). */
	hideOptions(indices = []) {
		for (const i of indices) {
			const b = this.$.q.querySelector(`.fl-opt[data-i="${i}"]`);
			if (b) {
				b.classList.add('gone');
				b.disabled = true;
			}
		}
	}

	// ---------------------------------------------------------------- sefer

	showCampaign() {
		this.$.title.classList.add('off');
		showCampaign(this);
	}

	/** Sefer sahnesini başlat (sefer ekranı ve bitiş ekranı çağırır). */
	startCampaign(id) {
		const camp = this.app.campaign;
		if (!camp?.stage(id)) return;
		const cfg = camp.cfgFor(id);
		this.$.camp.classList.add('off');
		this.startMatch(cfg);
	}

	// ---------------------------------------------------------------- sıralama

	async ranking(m, order, picks) {
		if (this.fast) return;
		const r = this.$.rank;
		r.innerHTML = `<h4>${ico('flag', { w: 2.6 })}SEÇİM SIRASI</h4>${order
			.map(
				(o, k) =>
					`<div class="rw" style="--k:${k}"><span class="md">${k + 1}</span><span class="fl-av" style="border-color:${o.color}">${avatar(this.look(o.p || o))}</span><b>${esc(o.name)}</b><em class="${
						picks[k] ? '' : 'z'
					}">${picks[k] ? `+${picks[k]} il` : '—'}</em></div>`,
			)
			.join('')}`;
		const g = this._gen;
		r.classList.add('on');
		this.sfx('rank');
		await sleep(this.rm ? 1000 : 1700);
		if (g !== this._gen) return;
		r.classList.remove('on');
		await sleep(220);
	}

	// ---------------------------------------------------------------- çark

	async wheel(m, p) {
		const n = WHEEL.length;
		const pick = Math.floor(m.R() * n);
		m.turn = p.i;
		this.hud(m);
		if (this.fast) return WHEEL[pick];
		const jit = m.R() - 0.5;
		return this.wheelView.spin(m, p, pick, jit);
	}

	async chooseCategory(m, sec = 0) {
		if (this.fast) return 'tarih';
		return this.wheelView.choose(Object.keys(CATS), sec);
	}

	// ---------------------------------------------------------------- bitiş

	async end(m, ranking, rewards = null) {
		m.turn = -1;
		this.hud(m);
		if (this.fast) return ranking;
		this.$.hud.classList.add('off');
		const prog = this.app.progress;
		// ara reklam kancası (reklamsız pakette hiç); gerçek SDK app.hooks.interstitial ile bağlanır
		if (rewards && prog?.interstitialDue()) {
			prog.noteInterstitialShown();
			try {
				await this.app.hooks?.interstitial?.();
			} catch (e) {
				/* reklam gösterilemedi: maç akışı sürer */
			}
		}
		const act = await showEnd(this, m, ranking, rewards);
		if (act === 'again' && this.lastCfg) setTimeout(() => this.startMatch(this.lastCfg), 0);
		else if (act === 'next' && rewards?.campaign) {
			const id = this.app.campaign.next();
			if (id) setTimeout(() => this.startCampaign(id), 0);
			else this.showCampaign();
		} else if (act === 'camp') this.showCampaign();
		else this.showMenu();
		return ranking;
	}

	// ---------------------------------------------------------------- duraklatma (çizim: pause.js)

	/** Duraklatma ekranı ve donmuş arayüz (CSS animasyonları durur). App.pause / resume çağırır. */
	paused(on) {
		this.el.classList.toggle('paused', on);
		showPause(this, on);
	}

	// ---------------------------------------------------------------- sıfırlama ve geliştirme

	/** Açık her şeyi kapat (maçtan çıkış, ekran görüntüsü sahneleri). */
	reset() {
		this._gen++;
		try {
			this._cancel?.();
		} catch (e) {
			/* yoksay */
		}
		this._cancel = null;
		const $ = this.$;
		$.q.className = 'fl-q';
		$.q.innerHTML = '';
		$.wheel.classList.remove('on', 'pick', 'done', 'spinning', 'fetih');
		$.wheel.style.display = 'none';
		$.wheel.style.pointerEvents = 'none';
		$.wheel.querySelector('.fl-catpick')?.remove();
		$.wheel.querySelector('.fl-wh')?.classList.remove('hide');
		$.duel.className = 'fl-duel';
		$.duel.innerHTML = '';
		$.banner.className = 'fl-banner';
		$.rank.classList.remove('on');
		$.toasts.innerHTML = '';
		$.fx.innerHTML = '';
		this.prompt(null);
		this.setPins([]);
		this.tagsOff();
		for (const mk of this.marks) mk.el.remove();
		this.marks = [];
		clearZone(this);
		for (const k of ['menu', 'cmd', 'end', 'title', 'camp', 'pause', 'pbtn', 'hud']) $[k].classList.add('off');
		this.el.classList.remove('paused');
		this.app.onTap = null;
		this.app.onGround = null;
		this._pickRes = null;
		this.current = null;
	}

	debug(opts) {
		return debugShot(this, opts);
	}
}
