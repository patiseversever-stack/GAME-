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
import { HOT } from '../quiz/timing.js';
import { RESULT_MS } from '../quiz/mac.js';
import { debugShot } from './debug.js';
import { autoFit, refitAll } from './fit.js';
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

/** Süre rengi (kalan oran f: 1 → 0): yeşil → sarı → turuncu → kırmızı (son çeyrekte tam kırmızı), aradaki tonlar yumuşak geçiş. */
const TCOL = [
	[1, [48, 209, 88]],
	[0.72, [255, 214, 10]],
	[0.48, [255, 149, 0]],
	[0.26, [255, 59, 48]],
	[0, [255, 40, 40]],
];
export function timeColor(f) {
	f = Math.max(0, Math.min(1, f));
	for (let k = 1; k < TCOL.length; k++) {
		const [fa, a] = TCOL[k - 1];
		const [fb, b] = TCOL[k];
		if (f >= fb) {
			const u = (f - fb) / (fa - fb || 1);
			return `rgb(${a.map((x, j) => Math.round(b[j] + (x - b[j]) * u)).join(',')})`;
		}
	}
	return 'rgb(255,69,58)';
}

export class UI {
	constructor(root, app, h = {}) {
		this.app = app;
		this.h = { campaign: () => this.showCampaign(), ...(h || {}) };
		this.fast = false;
		this.assets = {};
		// isimler/rozetler hiçbir ekranda "…" ile kesilmez: taşan yazı küçülerek sığar
		autoFit(document.body);
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
		this.cfg = { mode: 'ffa3', length: 'quick', region: 'random', bot: 'er', ...(store?.get?.('menu') || {}), rule: 'klasik' }; // kural her açılışta Klasik (KARARLAR 9)
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
		this._mapTop = 0.34; // harita sorusu kartının ekranı örttüğü pay (ilk tahmin; her soruda ölçülür)
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
			hud.dataset.n = m.players.length;
			this.el.classList.toggle('h34', m.players.length >= 3); // (kökte :has yerine sınıf: her DOM değişiminde yeniden eşleşme yok)
			hud.innerHTML = m.players
				.map((p) => {
					const tcol = m.mode?.teams ? m.players.find((x) => x.team === p.team)?.css : null;
					const team = m.mode?.teams ? `<span class="tm" style="--tc:${tcol}">${p.team ? 'B' : 'A'}</span>` : '';
					return `<div class="fl-pl" data-p="${p.i}" style="--pc:${p.css}"><span class="fl-av">${avatar(this.look(p))}</span>
						<div class="tx"><b>${esc(p.name)}</b><em>${p.score.toLocaleString('tr-TR')}</em></div>
						<span class="cs"><i></i><i></i><i></i></span><span class="sd">${ico('shield', { w: 3, c: '#4a2800' })}</span>${team}</div>`;
				})
				.join('');
			this._fitHud(hud);
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
		this._ruleChip(m);
	}

	/**
	 * Kural göstergesi (v2): üst çubuğun altında ince eğik şerit. Klasik: tur; Süreli: kalan süre (son dakika kırmızı);
	 * Hakimiyet: liderin il payı çubuğu ve eşik çizgisi; Ölüm maçı: ani ölüme kalan süre. Saniyede bir güncellenir
	 * (oyun saatiyle: duraklayınca durur). Soru açıkken gizlenir.
	 */
	_ruleChip(m) {
		let el = this.$.rule;
		if (!el) {
			el = this.$.rule = document.createElement('div');
			el.className = 'fl-kural off';
			this.el.appendChild(el);
		}
		const on = m.phase === 'fetih' && !m.over && !m.aborted && !this.fast && !this.$.hud.classList.contains('off') && !!m.rule;
		el.classList.toggle('off', !on);
		if (!on) {
			if (this._ruleT) clearInterval(this._ruleT);
			this._ruleT = 0;
			return;
		}
		const mm = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
		const draw = () => {
			if (m.over || m.phase !== 'fetih') return;
			let html = '';
			let hot = false;
			if (m.rule === 'klasik') html = m.rounds > 0 && m.round >= 1 ? `${ico('flag', { w: 2.6 })}<b>TUR ${Math.min(m.round, m.rounds)} / ${m.rounds}</b>` : `${ico('flag', { w: 2.6 })}<b>KLASİK</b>`;
			else if (m.rule === 'sureli') {
				const left = m.timeLeft();
				hot = left <= 60;
				html = `${ico('clock', { w: 2.6 })}<b>${mm(left)}</b><small>KALDI</small>`;
			} else if (m.rule === 'hakimiyet') {
				const top = m.sideShares()[0] || { share: 0, side: 0 };
				const goal = m.domShare();
				const lead = m.mode?.teams ? m.players.find((p) => p.team === top.side) : m.players[top.side];
				html = `${ico('crown', { w: 2.6 })}<span class="bar" style="--c:${lead?.css || '#ffd25a'}"><i style="width:${(Math.min(1, top.share / goal) * 100).toFixed(1)}%"></i></span><b>%${Math.round(top.share * 100)}</b><small>/ %${Math.round(goal * 100)}</small>`;
			} else if (m.rule === 'olum') {
				if (m.suddenDeath) {
					hot = true;
					html = `${ico('skull', { w: 2.6 })}<b>ANİ ÖLÜM</b>`;
				} else html = `${ico('skull', { w: 2.6 })}<small>ANİ ÖLÜM</small><b>${mm(Math.max(0, 30 * 60 - m.matchSec()))}</b>`;
			}
			if (html !== el._h) el.innerHTML = el._h = html;
			el.classList.toggle('hot', hot);
			// konum: üst çubuğun hemen altı (çubuk o karede yerleşmemiş olabilir: bir sonraki karede de ölç)
			// yerleşim ölçüsü (offset): çubuğun giriş kayması (transform) konumu bozmaz
			const place = () => {
				const h = this.$.hud;
				if (h.offsetHeight) el.style.top = `${h.offsetTop + h.offsetHeight + 6}px`;
			};
			place();
			requestAnimationFrame(place);
		};
		draw();
		if (!this._ruleT && m.rule !== 'klasik') this._ruleT = setInterval(draw, 1000);
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
		this.el.classList.add('toaston'); // kural göstergesi bildirimin altında kalmasın (aynı yer)
		setTimeout(() => {
			t.classList.add('bye');
			setTimeout(() => {
				t.remove();
				if (!box.children.length) this.el.classList.remove('toaston');
			}, 280);
		}, ms);
		return t;
	}

	/**
	 * Gece istemi (Gündönümü tonu): ince, geniş aralıklı altın üst satır, italik serif başlık, aralıklı
	 * küçük harfli ipucu. html: `<span class="ey">…</span><b>…</b><small>…</small>`.
	 */
	prompt(html, { tone = '', icon = null } = {}) {
		const p = this.$.prompt;
		const L = this.app.board?.labelLayer;
		if (!html) {
			this._cap = null;
			L?.avoid(null);
			return p.classList.remove('on');
		}
		p.className = `fl-prompt ${tone} on`;
		p.innerHTML = `<span class="pt">${html}</span>`;
		// il adları istemin altında kalmasın (3D yazı katmanı DOM'u bilmez): istemin yazı kutusu yasak alan
		L?.avoid(p.firstChild);
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

	/**
	 * Kim kime: saldıranın ve savunanın portresi, adı (kendi renginde) ve rolü, arada kılıçlar; üstte hedef il.
	 * Saldırı filminin başından düello sorusuna kadar ekranın altında kalır (12 karakterlik adlar kesilmeden sığar).
	 */
	versusCaption(p, d, target, { siege = false } = {}) {
		if (this.fast) return;
		const key = `vs|${p.i}|${d.i}|${target}|${siege}`;
		if (this._cap === key) return;
		const me = (q) => (q.human ? ' me' : '');
		// insan koltuğu "SEN" ile işaretlenir (adı zaten "Sen" ise tekrar edilmez)
		const you = (q) => (q.human && String(q.name).toLocaleUpperCase('tr-TR') !== 'SEN' ? 'SEN · ' : '');
		const side = (q, role, k) =>
			`<span class="vss ${k}${me(q)}" style="--pc:${q.css}"><span class="fl-av">${avatar(this.look(q))}</span><span class="vsn"><i>${you(q)}${role}</i><em>${esc(q.name)}</em></span></span>`;
		this.prompt(
			`<span class="ey">${siege ? 'KUŞATMA' : 'SALDIRI'}</span><b>${esc(target)}</b><span class="vsr">${side(p, 'SALDIRAN', 'a')}<span class="vsx">${ico('swords', { w: 2.6 })}</span>${side(d, siege ? 'KALESİ' : 'SAVUNAN', 'd')}</span>`,
			{ tone: 'cap red vs' },
		);
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
		// metin: düz yazı ya da { head, ey, hint } (v2 zincir: başlık sade kalır, sayaç üst etikette, onarım ipucu altta)
		const T = text && typeof text === 'object' ? text : { head: text };
		const head = esc(String(T.head || (attack ? 'Saldıracağın ili seç' : 'Bir il seç')));
		const hint = esc(T.hint || (capital ? 'Parlayan bir ile dokun, kalen oraya kurulur' : attack ? 'Saldırmak için parlayan bir ile dokun' : 'Parlayan bir ile dokun, senin olsun'));
		const ey = esc(T.ey || (capital ? 'BAŞKENT · SIRA SENDE' : attack ? 'FETİH · SIRA SENDE' : 'YAYILMA · SIRA SENDE'));
		// süre: dairesel sayaç (ortada saniye, altın halka erir)
		const tm = sec ? `<i class="tm"><svg viewBox="0 0 48 48"><circle class="bg" cx="24" cy="24" r="20"/><circle class="fg" cx="24" cy="24" r="20" pathLength="100"/></svg><em>${sec}</em></i>` : '';
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
			// süre: halka erir, son 3 sn kızarır ve atar; dolunca seçim boş döner
			const box = this.$.prompt.querySelector('.tm');
			const em = box.querySelector('em');
			const fg = box.querySelector('.fg');
			const t0 = clock.now();
			let last = sec;
			tick = setInterval(() => {
				const left = Math.max(0, sec - (clock.now() - t0) / 1000);
				fg.style.strokeDashoffset = (100 * (1 - left / sec)).toFixed(2);
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
		// harita sorusu: kamera hemen (düello girişi sürerken) yükselip bütün haritaya süzülür; kart açıldığında
		// harita yerine oturmuş olur
		if (T.needsMap) this._mapFrame(this._mapTop, { dur: 1.6, arc: 12 });
		// düello girişi yalnızca saldırı sorusunda (maç phase: 'duel' verir); eşitlik bozmada yok
		const intro = duel && !tie && ctx.phase === 'duel' && !ctx.noIntro;
		if (intro) await duelIntro(this, ctx);
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
		// joker geri çağrısı (_jkCb) burada SİLİNMEZ: Match.ask onu soru kartı açılmadan hemen önce
		// refreshJokers → ui.jokers(list, cb) ile kurar. Eskiden burada null'lanıyordu; insanın joker düğmeleri
		// hiçbir şey yapmıyordu (v0.8 gece denetimi). Maçtan çıkınca reset() temizler.
		// Arena afişi (v1.4): plaka = avatar + ad + puan (+ sıra); cevapladı/doğru/yanlış .st, süre .tt
		const score = (p) => (Number.isFinite(p.score) ? `<span class="sc">${p.score.toLocaleString('tr-TR')}</span>` : '');
		const ranks = new Map(
			who
				.slice()
				.sort((a, b) => (b.score || 0) - (a.score || 0))
				.map((p, k) => [p.i, k + 1]),
		);
		const plate = (p, k, sub, rk = 0) =>
			`<div class="fl-qp ${k}" data-p="${p.i}" style="--pc:${p.css}">${rk ? `<span class="rk">${rk}.</span>` : ''}<span class="fl-av">${avatar(this.look(p))}</span><span class="nm"><b>${esc(p.name)}</b>${
				sub ? `<small>${sub}</small>` : ''
			}${score(p)}</span><i class="st">${ico('check', { w: 3.4 })}</i><span class="tt"></span></div>`;
		const teams = !duel && !!m.mode?.teams && who.length > 2;
		const half = (tm, k) => {
			const ps = who.filter((p) => p.team === tm);
			const sum = ps.reduce((a, p) => a + (p.score || 0), 0);
			return `<div class="fl-tmh ${k}" style="--pc:${ps[0]?.css || '#888'}"><div class="avs">${ps.map((p) => plate(p, '', '')).join('')}</div><div class="tn"><small>TAKIM ${tm ? 'B' : 'A'} · <i>${sum.toLocaleString(
				'tr-TR',
			)}</i></small>${ps.map((p) => `<b>${esc(p.name)}</b>`).join('')}</div></div>`;
		};
		const whoHTML = duel
			? `${plate(ctx.attacker, 'a', 'SALDIRAN')}<div class="fl-qvs"><b>VS</b>${prov ? `<span>${esc(prov.name)}</span>` : ''}</div>${plate(ctx.defender, 'd', siege ? 'KALE' : 'SAVUNAN')}`
			: teams
				? `${half(0, 'a')}<div class="fl-qvs"><b>VS</b></div>${half(1, 'd')}`
				: who.map((p, k) => (k ? '<i class="vx">VS</i>' : '') + plate(p, '', '', who.length > 2 ? ranks.get(p.i) : 0)).join('');
		const lbl = ctx.phase === 'altin' ? 'ALTIN SORU' : teams ? 'TAKIMLAR · HERKES CEVAPLIYOR' : ctx.phase === 'yayilma' ? 'YAYILMA · HERKES CEVAPLIYOR' : '';
		const rule = ctx.predict ? `Tahmin et · +20` : !human ? 'İzliyorsun' : ctx.phase === 'altin' ? 'Altın soru' : tie ? 'Eşitlik bozma' : closest ? T.rule || 'En yakın kazanır' : '';
		// tam ekran kart: tip her zaman ister (cover: true) ya da yalnız kısa ekranda ('kisa': yükseklik < 720 px; bulmaca tipleri)
		const cover = !map && (T.cover === 'kisa' ? (this.el.clientHeight || innerHeight) < 720 : !!T.cover);
		card.className = `fl-q t-${q.type}${map ? ' map' : ''}${closest ? ' kc' : ''}${human ? '' : ' spec'}${cover ? ' cover' : ''}`;
		if (cover && T.stampAt) card.dataset.st = T.stampAt; // damganın oturacağı alan (yoksa sorunun yeri)
		else delete card.dataset.st;
		card.dataset.qid = q.id || ''; // denetim araçları açık sorunun kimliğini okur
		card.style.setProperty('--cc', cat.color);
		card.style.setProperty('--cd', shade(cat.color, -0.4));
		card.style.setProperty('--me', human ? avatarURL(this.look(human)) : 'none');
		const qlen = String(q.q || '').length;
		card.classList.toggle('qmid', qlen > 50 && qlen <= 80);
		card.classList.toggle('qlong', qlen > 80);
		card.innerHTML = `<div class="fl-qwho${duel ? ' duel' : teams ? ' teams' : ''}" style="--n:${who.length}"${lbl ? ` data-lb="${lbl}"` : ''}>${whoHTML}</div>
			<div class="fl-qc">${cover ? `<div class="fl-cvt">${esc(String(T.label || '').toLocaleUpperCase('tr-TR'))}</div>` : ''}
				<div class="fl-qhead"><span class="fl-cat"><span class="ci">${ico(cat.icon, { w: 2.6, c: cat.color })}</span><b>${esc(cat.name)}</b></span><span class="fl-type">${esc(
					String(T.label || '').toLocaleUpperCase('tr-TR'),
				)}</span>${rule ? `<span class="fl-rule">${esc(rule)}</span>` : ''}<span class="fl-clock"><b>${sec}</b></span></div>
				<div class="fl-tbar"><i></i></div>
				<div class="fl-qtext">${esc(q.q)}</div>
				<div class="fl-qbody"></div>
				<div class="fl-jk"></div>
			</div>
			<div class="fl-stamp"></div>`;
		this._fitNames(card);
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
			// harita sorusu: ilk dokunuşta iğnenin çevresine yaklaş (kart payı korunur; iki parmakla yine yaklaşılır/uzaklaşılır)
			zoomTo: (p) => {
				const c = app.cam;
				c.shot(p.x, p.z, { dist: Math.max(60, c.dist * 0.45), pitch: c.pitch, yaw: c.yaw, dur: 0.55, lens: this._mapTop / 2 });
			},
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
		this._coverFit(card, body);
		// Arena: şıklar kısaysa 2×2, biri uzunsa ince tek sütun (kart ekranın yarısını aşmasın)
		const os = body.querySelector('.fl-opts');
		if (os && !os.classList.contains('three') && !os.classList.contains('one')) {
			const mx = Math.max(0, ...[...os.children].map((b) => (b.querySelector('span')?.textContent || b.textContent).trim().length));
			if (mx > 17) os.classList.add('one');
			card.classList.toggle('olong', mx > 34);
		}
		this._renderJokers();
		if (map) {
			// kartın gerçek boyu ölçülür: kadraj tahminden farklıysa yumuşakça düzeltilir
			const top = this._cardTop();
			if (Math.abs(top - this._mapTop) > 0.012) this._mapFrame(top, { dur: 0.7 });
			this._mapTop = top;
			app.onGround = (pt) => tapHandler?.(pt);
			// düello girişi yoksa kart kameranın süzülüşü bitmeye yakın açılır (ikisi birbirine karışmasın)
			if (!intro) await sleep(this.rm ? 0 : 950);
			if (gen !== this._gen) return { human: null };
		}
		await sleep(20);
		card.classList.add('on');
		this.el.classList.toggle('qon', !map); // haritasız soruda üst oyuncu kartları afişe yer açar
		this.app.calmQ = !map && !!T.calm; // klasik soru tipi: harita arkada durgun (kare hızı: core/quality.js)
		this.el.classList.toggle('qmap', map); // haritalı soruda üst şerit gizlenir, duraklat düğmesi alta iner
		this.el.classList.toggle('qcover', cover || (!map && !!T.sahne)); // tam ekran kart ya da kendi sahnesini çizen tip (Gölge): haritanın il etiketleri ve iğneleri susar
		// tam ekran kart giriş devinimini bitirince (≈ 450 ms) arkadaki harita çizimi durur (app.js frame); kendi sahnesini
		// haritayla çizen tip (T.sahne) hariç
		clearTimeout(this._coverT);
		this.app.coverQ = false;
		if (cover && !T.sahne) this._coverT = setTimeout(() => {
			if (gen === this._gen && card.classList.contains('on')) this.app.coverQ = true;
		}, 450);
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
				// süre rengi: yalnız saat ve çubukta (kartın bütün alt ağacı her 100 ms'de yeniden stillenmesin), değişince
				const tc = timeColor(total > 0 ? left / total : 0);
				if (tc !== this._tc) {
					this._tc = tc;
					this._tcEls = this._tcEls?.[0]?.isConnected ? this._tcEls : [card.querySelector('.fl-clock'), card.querySelector('.fl-tbar')].filter(Boolean);
					for (const e of this._tcEls) e.style.setProperty('--tcol', tc);
				}
				if (s !== lastS) {
					lastS = s;
					clockB.textContent = String(s);
					const h = left <= HOT && left > 0; // son HOT sn kırmızı: süre bütçesi bunu hesaba katar (timing.js)
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

	/** HUD'daki isimler de (en çok 12 harf) kesilmeden tek satıra sığsın. */
	_fitHud(hud) {
		const fit = () => {
			for (const b of hud.querySelectorAll('.fl-pl .tx b')) {
				b.style.fontSize = '';
				let fs = parseFloat(getComputedStyle(b).fontSize) || 14;
				for (let k = 0; k < 40 && b.scrollWidth > b.clientWidth + 0.5 && fs > 9; k++) b.style.fontSize = (fs -= 0.5) + 'px';
			}
		};
		requestAnimationFrame(fit);
		document.fonts?.load?.('italic 900 20px "Barlow Condensed"').then(fit, () => {});
		setTimeout(fit, 400);
		setTimeout(fit, 1200);
	}

	/** Afişteki isimler kesilmeden sığsın: ortak sığdırıcıya (fit.js) bırak; kart açılış animasyonu oturunca bir tur daha ölç. */
	_fitNames() {
		refitAll();
		setTimeout(refitAll, 300);
		setTimeout(refitAll, 1000);
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

	/**
	 * Haritasız kart (tam ekran ya da klasik): gövdenin içeriği ekrana sığmazsa (kısa ekran, en uzun soru, cevap notları) içerik orantılı küçülür
	 * (CSS zoom, en az 0,64): hiçbir şey kaydırmaya ya da kesilmeye kalmaz. İçerik ve sınıflar değiştikçe yeniden ölçülür.
	 */
	_coverFit(card, body) {
		this._cfo?.disconnect();
		this._cfo = null;
		if (card.classList.contains('map') || typeof ResizeObserver === 'undefined') return; // haritalı kart: harita payı korunur
		let raf = 0;
		let refits = 0;
		const fit = () => {
			raf = 0;
			if (!body.isConnected) return this._cfo?.disconnect();
			const kids = [...body.children];
			for (const k of kids) ro.observe(k); // içerik kendi boyunu değiştirince (sahne, satır içi stil) de ölç
			const set = (z) => {
				for (const k of kids) k.style.zoom = z === 1 ? '' : String(z);
			};
			const gap = () => body.scrollHeight - body.clientHeight;
			set(1);
			let z = 1;
			const g1 = gap();
			if (g1 > 1) {
				// sığan EN BÜYÜK ölçek aranır (ikiye bölme): oran tahmini satır kırılımı ve ölçeklenmeyen boşluklar yüzünden
				// gereğinden küçük çıkıyordu (en uzun Az Bilinen cevabında altta 80 px boşluk)
				let lo = 0.64;
				let hi = 1;
				set(lo);
				const g0 = gap();
				if (g0 > 1) z = g0 < g1 - 2 ? lo : 1; // en küçükte de sığmıyor: küçültme işe yarıyorsa en küçük, yaramıyorsa (mutlak konumlu taşma) hiç
				else {
					for (let i = 0; i < 6 && hi - lo > 0.015; i++) {
						const mid = Math.round(((lo + hi) / 2) * 100) / 100;
						set(mid);
						if (gap() > 1) hi = mid;
						else lo = mid;
					}
					z = lo;
				}
				set(z);
			}
			// kartın üst kenarı (oyun alanında): harita yazıları bunun altına girmez (tags.js)
			const qcE = card.querySelector('.fl-qc');
			if (qcE) this._qcTop = qcE.getBoundingClientRect().top - this.el.getBoundingClientRect().top;
			const changed = body.dataset.fz !== undefined && body.dataset.fz !== String(z);
			body.dataset.fz = String(z);
			// ölçek değişince yazı sığdırma (fit.js) yeni genişliğe göre yeniden; salınmasın diye kart başına sınırlı
			if (changed && refits < 4) {
				refits++;
				refitAll();
			}
		};
		const kick = () => {
			if (!raf) raf = requestAnimationFrame(fit);
		};
		const ro = new ResizeObserver(kick);
		ro.observe(body);
		const mo = new MutationObserver(kick);
		mo.observe(body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
		// giriş devinimi sürerken ölçülen boy (aşağıdan kayan kart taşma sayılır) devinim bitince yeniden ölçülür
		body.addEventListener('animationend', kick);
		body.addEventListener('transitionend', kick);
		document.fonts?.ready?.then(kick);
		this._cfo = {
			disconnect: () => {
				ro.disconnect();
				mo.disconnect();
				body.removeEventListener('animationend', kick);
				body.removeEventListener('transitionend', kick);
				if (raf) cancelAnimationFrame(raf);
				this._cfo = null;
			},
		};
		kick();
	}

	stamp(text, tone = '', sub = '') {
		const s = this.$.q.querySelector('.fl-stamp');
		if (!s) return;
		// haritasız soru (dikey ekran): damga oyuncu afişiyle kart arasındaki harita alanının ortasında. Yüzdeyle (%44)
		// konumlanınca uzun kartlarda (adam asmaca) sorunun üstüne biniyordu.
		s.style.top = '';
		const q = this.$.q;
		const qc = !q.classList.contains('map') && q.querySelector('.fl-qc');
		s.style.left = '';
		s.style.removeProperty('--k');
		q.classList.remove('stamped');
		let fit = null;
		const coverSt = !!(qc && q.classList.contains('cover'));
		// tam ekran tip: harita boşluğu yok. Damga tipin gösterdiği alana (Göz Kararı: resim, Halat/Mancınık: sahne)
		// ya da sorunun yerine oturur: başlık satırının altından cevapların başladığı yere kadar; soru yazısı o an
		// gizlenir (cevap belli), damga alana sığacak kadar küçülür. Cevaplara, sahnedeki yazılara binmez.
		const coverBox = () => {
			const zone = (q.dataset.st && q.querySelector(q.dataset.st)) || null;
			const c = qc.getBoundingClientRect();
			if (zone) return zone.getBoundingClientRect();
			const hd = q.querySelector('.fl-qhead').getBoundingClientRect();
			const bd = q.querySelector('.fl-qbody');
			const first = [...bd.children].find((e) => e.getBoundingClientRect().height > 0);
			const bt = first ? first.getBoundingClientRect().top : bd.getBoundingClientRect().top;
			q.classList.add('stamped');
			return { left: c.left + 10, right: c.right - 10, top: hd.bottom + 3, bottom: bt - 3 };
		};
		const coverPlace = (box) => {
			const r = q.getBoundingClientRect();
			s.style.top = Math.round((box.top + box.bottom) / 2 - r.top) + 'px';
			s.style.left = Math.round((box.left + box.right) / 2 - r.left) + 'px';
		};
		const coverK = (box) => {
			// doğal boyu (dönüşümsüz) ölç, eğiklik (skewX −8°) payıyla alana sığdır
			const w0 = s.offsetWidth + s.offsetHeight * 0.15;
			const h0 = s.offsetHeight;
			const k = Math.max(0.45, Math.min(1, (box.right - box.left - 6) / w0, (box.bottom - box.top - 2) / h0));
			s.style.setProperty('--k', k.toFixed(3));
		};
		if (coverSt) {
			fit = coverBox();
			coverPlace(fit);
		} else if (qc) {
			const r = q.getBoundingClientRect();
			const who = q.querySelector('.fl-qwho');
			const top0 = who ? who.getBoundingClientRect().bottom : r.top;
			const bot = qc.getBoundingClientRect().top;
			if (bot - top0 > 90) s.style.top = Math.round((top0 + bot) / 2 - r.top) + 'px';
		}
		s.className = `fl-stamp ${tone}`;
		s.innerHTML = `${esc(text)}${sub ? `<small>${esc(sub)}</small>` : ''}`;
		if (fit) coverK(fit);
		// haritadaki yazı rozetleri damganın altına girmesin (yerleşim engeli; kart kapanınca setPins([]) siler)
		const measure = () => {
			if (!s.isConnected || !s.textContent) return (this._stampBox = null);
			const r = s.getBoundingClientRect();
			const u = this.el.getBoundingClientRect();
			this._stampBox = { l: r.left - u.left - 4, r: r.right - u.left + 4, t: r.top - u.top - 4, b: r.bottom - u.top + 4 };
		};
		let held = false; // cevap alanı kuralı (aşağıda) damgayı taşıdıysa yeniden yerleştirme onu bozmaz
		requestAnimationFrame(measure);
		setTimeout(() => {
			// yerleşim oturduktan sonra (afiş, sığdırma ölçeği) alan yeniden ölçülür; kaydıysa damga yeni yerine
			if (coverSt && !held && s.isConnected && s.textContent && q.contains(qc)) {
				const b = coverBox();
				const r = q.getBoundingClientRect();
				const cy = Math.round((b.top + b.bottom) / 2 - r.top);
				const cx = Math.round((b.left + b.right) / 2 - r.left);
				if (Math.abs(cy - parseFloat(s.style.top)) > 2 || Math.abs(cx - parseFloat(s.style.left)) > 2) {
					coverPlace(b);
					coverK(b);
				}
			}
			measure();
		}, 600); // giriş devinimi (ölçek) bitince gerçek boyu
		// v1.5: damga cevap alanının (çengel tahtası, kelime kutuları) üstüne binmez: doğru cevap görülsün. Binecekse alanın
		// hemen üstüne kayar; oraya da sığmıyorsa kısa görünüp kaybolur.
		const zone = !q.classList.contains('map') && q.querySelector('.xw-grid,.an-word,.hr-word,.fl-word');
		if (zone) {
			const qr = q.getBoundingClientRect();
			const zr = zone.getBoundingClientRect();
			const h = s.offsetHeight || 84;
			const cy = s.style.top ? parseFloat(s.style.top) : s.offsetTop; // damganın ortası (kart birimi)
			const zt = zr.top - qr.top;
			const zb = zr.bottom - qr.top;
			if (cy + h / 2 > zt && cy - h / 2 < zb) {
				const who = q.querySelector('.fl-qwho');
				const minC = (who ? who.getBoundingClientRect().bottom - qr.top : 0) + h / 2 - 24;
				const want = zt - h / 2 - 6;
				s.style.top = Math.round(Math.max(minC, want)) + 'px';
				held = true;
				if (want < minC - 4) s.classList.add('brief');
			}
		}
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
		refitAll(); // şıklara portre geldi: yazının payı daraldı (styles-arena .fl-opt:has(>.fl-who))
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
		// v1.5: kartta yalnız doğru cevap görünür (damga ve oyuncu satırları cevabın üstüne binmez); sonuç kart kapanınca
		// kendi ekranında (_showResult), şehir filmi sonuç ekranı kapanınca başlar
		const me = results.find((r) => r.p.human);
		if (me) this.sfx((closest ? order[0] === me : me.correct) ? 'right' : 'wrong');
		else this.sfx('reveal');
		if (T.needsMap) this._mapReveal(v, results);
		// tip kendi cevap filmini isteyebilir (T.revealMs, ör. Tufan'da deniz yükselişi); dokununca yine erken geçilir.
		// Maçta süreyi soru düzeni verir (ctx.film, quiz/mac.js filmMs): insanın içinde olduğu anda tam film, iki botun
		// düellosunda ve çok oyunculu yayılmada kısa sürüm; çevrimiçinde sunucunun 'reveal' olayındaki süre
		const film = Number.isFinite(ctx.film) ? ctx.film : Number(T.revealMs) || 0;
		// süre: cevap anı (tipin filmi tam oynar: Tufan'da deniz yükselişi 11 sn) + ardından sonuç ekranı. Eskiden çevrimiçi
		// toplamı tutturmak için sonuç ekranı filmden düşülüyordu ve uzun filmler erken kesiliyordu; şimdi sunucu sonuç
		// ekranının süresini de bekler (match.js RESULT_MS)
		const resMs = me ? RESULT_MS : 1500;
		const ansMs = Number.isFinite(ctx.film) ? Math.max(closest ? 3000 : 1900, Math.min(15000, film)) : Math.max(closest ? 2200 : 1600, Math.min(15000, film));
		await this._hold(ansMs);
		if (gen !== this._gen) return;
		clearTimeout(this._coverT);
		this.app.coverQ = false;
		card.classList.remove('on');
		this.el.classList.remove('qon', 'qmap', 'qcover');
		this.app.calmQ = false;
		this.setPins([]);
		await sleep(220);
		if (gen !== this._gen) return;
		card.className = 'fl-q';
		// yayılmada sonuç ekranı il payıyla (SEÇİM SIRASI) tek ekran: ranking() gösterir, burada ikinci kez sıralanmaz
		this._pend = null;
		if (ctx.phase === 'yayilma') {
			this._pend = { results, closest, T, v, me, gen };
			this.current = null;
			return;
		}
		const res = this._showResult(results, order, closest, T, v, me, { m });
		await this._hold(resMs, res);
		res.classList.remove('on');
		await sleep(200);
		if (gen !== this._gen) return;
		this.current = null;
	}

	/**
	 * Sonuç ekranı (v1.5): soru kartı kapanınca haritanın ortasında büyük sonuç (BİLDİN! / 2. SIRADASIN…) ve oyuncu
	 * satırları (sıra, portre, ad, süre ya da yakınlık). Arena dili: eğik plakalar, kazanan altın.
	 */
	_showResult(results, order, closest, T, v, me, { m = null, picks = null } = {}) {
		let el = this._res;
		if (!el) {
			el = this._res = document.createElement('div');
			el.className = 'fl-res';
		}
		if (!el.isConnected) this.el.appendChild(el);
		let st = '';
		let tone = '';
		let sub = '';
		const w = order[0];
		const teams = !!m?.mode?.teams;
		const tcol = (t) => m.players.find((x) => x.team === t)?.css || '#888';
		if (me) {
			if (closest) {
				const rank = order.indexOf(me);
				if (rank === 0) {
					st = me.err === 0 || (T.needsMap && me.correct) ? 'TAM İSABET!' : T.birinci || 'EN YAKIN SEN!'; // tipe özel sözcük (puanlı tipler)
					tone = 'gold';
				} else if (teams && w.p.team === me.p.team) {
					st = 'TAKIMIN KAZANDI';
					tone = 'gold';
					sub = T.rozet ? `${w.name} · ${T.rozet.toLocaleLowerCase('tr-TR')}` : `${w.name} en yakın`;
				} else {
					st = `${rank + 1}. SIRADASIN`;
					tone = 'bad';
					sub = `${w.name} ${T.ustun || 'daha yakın'}`;
				}
			} else if (me.correct) st = 'BİLDİN!';
			else if (me.value == null) {
				st = 'SÜRE DOLDU';
				tone = 'warn';
			} else {
				st = 'BİLEMEDİN';
				tone = 'bad';
			}
		} else if (closest || w?.correct) {
			// izlenen düello: kazanan takım arkadaşınsa altın, rakibinse kırmızı; insan yoksa altın
			const hu = m?.players?.find((p) => p.human);
			// 3–4 kişide izlenen düello nötr (altın); eşlide rakip takım kazandıysa kırmızı
			const mine = teams && hu ? w.p.team === hu.team : null;
			st = mine ? 'TAKIMIN KAZANDI' : `${w.name} KAZANDI`;
			sub = mine ? w.name : '';
			tone = mine === false ? 'bad' : 'gold';
		} else {
			st = 'KİMSE BİLEMEDİ';
			tone = 'warn';
		}
		const rows = order
			.map((r, k) => {
				const { val, sub: rs, ok } = this._resVal(T, v, r, closest);
				const win = k === 0 && (closest ? ok : r.correct);
				const tag = win ? `<i class="rt">${closest ? (r.err === 0 || (T.needsMap && r.correct) ? 'TAM İSABET' : T.rozet || 'EN YAKIN') : 'EN HIZLI'}</i>` : '';
				const no = !closest && !r.correct;
				const tm = teams ? `<span class="tm" style="--tc:${tcol(r.p.team)}">${r.p.team ? 'B' : 'A'}</span>` : '';
				const pk = picks ? `<span class="pk${picks[k] ? '' : ' z'}">${picks[k] ? `+${picks[k]}<small>İL</small>` : '—'}</span>` : '';
				return `<div class="rs-r${win ? ' win' : ''}${no ? ' no' : ''}${r.p.human ? ' me' : ''}" style="--c:${r.color};--k:${k}"><span class="rk">${k + 1}</span><span class="fl-av">${avatar({ ...this.look(r.p), img: null })}</span><b>${tm}${esc(r.name)}</b>${tag}<em>${val}<small>${rs}</small></em>${pk}</div>`;
			})
			.join('');
		el.classList.toggle('n4', order.length >= 4);
		el.classList.toggle('sira', !!picks);
		if (picks) el.innerHTML = this._draftHTML(order, picks, closest, T, v, me, st, tone, teams, tcol, m);
		else el.innerHTML = `<div class="fl-stamp ${tone}">${esc(st)}${sub ? `<small>${esc(sub)}</small>` : ''}</div><div class="rs-rows">${rows}</div>`;
		void el.offsetWidth;
		el.classList.add('on');
		if (me && (closest ? w === me : me.correct)) {
			const s = el.querySelector('.fl-stamp, .sr-r.me .sr-av');
			if (s) setTimeout(() => {
				if (!s.isConnected) return;
				const c = Fx.center(s);
				this.fx.burst(c.x, c.y, { n: 18, dist: 140, kind: 'star', size: 14, life: 900 });
			}, 260);
		}
		return el;
	}

	/**
	 * SEÇİM SIRASI (v1.5e, yayılma): soru sonucu ve il payı tek ekran, ince ve sade. Koyu cam satırlar (ince çizgi kenar,
	 * solda oyuncu renginde şerit), küçük sıra numarası (birinci altın, üstünde taç), ad en çok iki satır (sefer patronları
	 * 21 harfe dek), altında doğru/yanlış ve süre ya da yakınlık; sağda il payı rakamla (+1 … +8, tüm Türkiye haritasında
	 * birinci 8 il alabilir) ve oyuncu renginde bayrak imi. Bütün hareket transform/opacity.
	 */
	_draftHTML(order, picks, closest, T, v, me, st, tone, teams, tcol, m) {
		const flag = `<svg viewBox="0 0 16 18" aria-hidden="true"><path d="M3 1.5v15" stroke="rgba(255,255,255,.75)" stroke-width="1.6" stroke-linecap="round"/><path d="M4 2.2h9.5l-2.8 3.5 2.8 3.5H4z" fill="var(--c)"/></svg>`;
		const crown = `<svg class="sr-cr" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS.crown}" fill="#ffd25a"/></svg>`;
		const rows = order
			.map((r, k) => {
				const { val, sub } = this._resVal(T, v, r, closest);
				const hit = closest ? r.value != null && r.err === 0 : r.correct;
				const mark = r.value == null ? '' : `<i class="${hit ? 'ok' : 'no'}">${ico(hit ? 'check' : 'cross', { w: 3.8 })}</i>`;
				const n = picks[k] || 0;
				const tm = teams ? `<span class="tm" style="--tc:${tcol(r.p.team)}">${r.p.team ? 'B' : 'A'}</span>` : '';
				return `<div class="sr-r${k === 0 ? ' win' : ''}${r.p.human ? ' me' : ''}${n ? '' : ' z'}" style="--c:${r.color};--k:${k}">
					<span class="sr-n">${k === 0 ? crown : ''}${k + 1}</span>
					<span class="sr-av"><span class="fl-av">${avatar({ ...this.look(r.p), img: null })}</span>${r.p.human ? '<em>SEN</em>' : ''}</span>
					<span class="sr-who"><b>${tm}<span class="nm">${esc(r.name)}</span></b><small>${mark}<span>${val}</span><u>${sub}</u></small></span>
					<span class="sr-pk">${n ? `<b>${flag}+${n}</b><small>İL</small>` : '<b>—</b><small>İL YOK</small>'}</span>
				</div>`;
			})
			.join('');
		const pt = tone || 'ok';
		const mine = me ? picks[order.indexOf(me)] || 0 : 0;
		const pill = `<div class="sr-me ${pt}"><b>${esc(st)}</b>${me ? `<span>${mine ? `${mine} il seçiyorsun` : 'bu tur il yok'}</span>` : ''}</div>`;
		const tur = m?.phase === 'yayilma' && m.expRound && m.expT ? ` · TUR ${m.expRound}/${m.expT}` : '';
		return `<div class="sr-h"><small>YAYILMA${tur}</small><h3>SEÇİM SIRASI</h3></div>${pill}<div class="sr-rows">${rows}</div>`;
	}

	/**
	 * İzleme özeti (v2): iki botun düellosu (ya da botun tarafsız ili / onarımı) soru kartı açılmadan özetlenir: altta eğik
	 * koyu kart, iki portre, BİLDİ / BİLEMEDİ ve süre (yakınlıkta değer). Eşlide takım arkadaşının düellosu daha uzun ve
	 * sorunun metni ile doğru cevap da görünür. Dokununca geçer; ardından il el değiştirme filmi oynar.
	 */
	async botDuel(m, ctx) {
		if (this.fast) return;
		const { results, T, v, q } = ctx;
		const closest = T.kind === 'closest';
		const order = results.slice();
		const viewer = m.players.find((p) => p.human);
		const ally = !!m.mode?.teams && !!viewer && results.some((r) => r.p !== viewer && r.p.team === viewer.team);
		const tgt = ctx.target != null && ctx.target >= 0 ? this.app.board.provinces[ctx.target]?.name : '';
		const head = ctx.phase === 'neutral' ? 'TARAFSIZ İL' : ctx.phase === 'repair' ? 'KULE ONARIMI' : ctx.title === 'KUŞATMA' ? 'KUŞATMA' : ctx.title === 'EŞİTLİK BOZMA' ? 'EŞİTLİK' : 'DÜELLO';
		const row = (r) => {
			const hit = closest ? null : r.correct;
			const { val } = this._resVal(T, v, r, closest);
			const tag = closest ? `<em>${val}</em>` : `<em class="${hit ? 'ok' : 'no'}">${hit ? 'BİLDİ' : r.value == null ? 'SÜRE DOLDU' : 'BİLEMEDİ'}</em>`;
			return `<div class="bd-p${!closest && hit ? ' ok' : ''}" style="--c:${r.color}"><span class="fl-av">${avatar({ ...this.look(r.p), img: null })}</span><b>${esc(r.name)}</b>${tag}<small>${(r.time ?? 0).toFixed(1)} sn</small></div>`;
		};
		let el = this._bd;
		if (!el) {
			el = this._bd = document.createElement('div');
			el.className = 'fl-bd';
			this.el.appendChild(el);
		}
		let extra = '';
		if (ally && q) {
			const ans = Array.isArray(v?.opts) && Number.isInteger(v?.right) ? v.opts[v.right] : q.ans != null && typeof q.ans !== 'object' ? `${q.ans}${q.unit ? ' ' + q.unit : ''}` : '';
			extra = `<div class="bd-q"><span>${esc(String(q.q || '').slice(0, 120))}</span>${ans !== '' ? `<b>${esc(String(ans))}</b>` : ''}</div>`;
		}
		this.caption(null); // saldırı altyazısı kartın üstünden taşmasın
		el.innerHTML = `<div class="bd-h"><span>${head}</span>${tgt ? `<b>${esc(tgt)}</b>` : ''}</div>${extra}<div class="bd-rows${order.length === 1 ? ' one' : ''}">${order.map(row).join(order.length === 2 ? '<i class="vs">VS</i>' : '')}</div>`;
		void el.offsetWidth;
		el.classList.add('on');
		await this._hold(ally ? 3400 : 1800, el);
		el.classList.remove('on');
		await sleep(180);
	}

	/** Atla düğmesi (botların sırasında): on=false gizler. */
	skipBtn(on, act = null) {
		let b = this._skip;
		if (!b) {
			b = this._skip = document.createElement('button');
			b.className = 'fl-skip off';
			b.innerHTML = `<b>ATLA</b><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5l8 7-8 7zM12 5l8 7-8 7z" fill="currentColor"/></svg>`;
			b.addEventListener('click', () => {
				this.sfx('tap');
				b.classList.add('off');
				const f = this._skipAct;
				this._skipAct = null;
				f?.();
			});
			this.el.appendChild(b);
		}
		if (on && act) this._skipAct = act;
		b.classList.toggle('off', !on || this.fast);
	}

	/** İnsan elendi, maç sürüyor: İZLE ya da SONUCU GÖR. Dönüş: 'izle' | 'sonuc'. */
	elimChoice(m, by) {
		if (this.fast) return Promise.resolve('sonuc');
		let el = this._elim;
		if (!el) {
			el = this._elim = document.createElement('div');
			el.className = 'fl-elim';
			this.el.appendChild(el);
		}
		const left = m.players.filter((p) => p.alive).length;
		el.innerHTML = `<div class="fl-stamp bad">ELENDİN<small>${esc(by?.name || '')} kaleni yıktı · ${left} komutan sürüyor</small></div>
			<div class="el-b"><button class="fl-btn" data-a="izle">İZLE</button><button class="fl-btn red" data-a="sonuc">SONUCU GÖR</button></div>`;
		void el.offsetWidth;
		el.classList.add('on');
		return new Promise((res) => {
			el.onclick = (e) => {
				const b = e.target.closest('[data-a]');
				if (!b) return;
				this.sfx('tap');
				el.classList.remove('on');
				el.onclick = null;
				res(b.dataset.a);
			};
		});
	}

	/** Sonuç satırının değeri: yakınlık tiplerinde fark / km / tipin biçimi; ötekilerde süre. */
	_resVal(T, v, r, closest) {
		if (!closest) {
			if (r.value == null) return { val: '—', sub: 'cevap yok', ok: false };
			return { val: `${(r.time ?? 0).toFixed(1)} sn`, sub: r.correct ? 'doğru' : 'yanlış', ok: r.correct };
		}
		const q = v.q || {};
		const map = !!T.needsMap;
		const yr = yearish(q);
		const fmt = (x) => (yr ? String(Math.round(x)) : (Math.round(Number(x) * 100) / 100).toLocaleString('tr-TR'));
		const unit = q.unit || '';
		const ok = Number.isFinite(r.err) && r.value != null;
		if (!ok) return { val: '—', sub: 'cevap yok', ok };
		let val;
		if (typeof T.fmt === 'function') val = esc(T.fmt(v, r.value, r));
		else if (map) val = `${Math.round(r.err).toLocaleString('tr-TR')} km`;
		else if (typeof r.value === 'number') val = `${fmt(r.value)}${unit ? ' ' + esc(unit) : ''}`;
		else val = fmt(r.err);
		const sub = typeof T.sub === 'function' ? esc(T.sub(v, r.value, r)) : map ? (r.correct ? 'tam isabet' : 'uzaklık') : r.err === 0 ? 'tam isabet' : `fark ${fmt(r.err)}`;
		return { val, sub, ok };
	}

	/** Bekle; kart (ya da verilen öğe) açıkken dokunulursa (en az 0.8 sn sonra) erken geç. */
	_hold(ms, el = null) {
		return new Promise((res) => {
			const t0 = clock.now();
			const card = el || this.$.q;
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
			w.parentElement?.style.setProperty('--wn', w.parentElement.querySelectorAll('.fl-who').length);
			w.style.borderColor = '#fff';
			if (r.p?.human) w.classList.add('me');
			w.innerHTML = avatar({ ...this.look(r.p), img: null });
		}
		// şık rozetleri v2: seçilen şık boş kart olur, seçenlerin portreleri ortada yan yana (yazı yer tutar, kutu boyu
		// oynamaz; styles-arena .fl-whos). Doğru/Yanlış levhasında simgenin altında bir sıra.
		for (const b of card.querySelectorAll('.fl-opt')) {
			const ws = [...b.children].filter((c) => c.classList.contains('fl-who'));
			if (!ws.length) continue;
			const tf = !!b.closest('.fl-tf.vd');
			const host = (!tf && b.querySelector(':scope>span')) || b;
			let box = host.querySelector(':scope>.fl-whos');
			if (!box) {
				box = document.createElement('span');
				box.className = 'fl-whos';
				host.appendChild(box);
			}
			for (const w of ws) box.appendChild(w);
			box.style.setProperty('--wn', box.children.length);
			b.classList.add('whod');
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
				const tag = k === 0 && ok ? `<span class="tag">${r.err === 0 || (map && r.correct) ? 'TAM İSABET' : T.rozet || 'EN YAKIN'}</span>` : '';
				return `<div class="fl-cr ${k === 0 && ok ? 'win' : ''}" style="--c:${r.color};--k:${k}"><span class="rk">${k + 1}</span><span class="fl-av">${avatar({ ...this.look(r.p), img: null })}</span>
					<span class="nm"><b>${esc(r.name)}${tag}</b><i class="bar"><u style="--w:${w.toFixed(3)}"></u></i></span><em>${val}<small>${sub}</small></em></div>`;
			})
			.join('');
		// v1.5: oyuncu satırları kartta değil, sonuç ekranında (_showResult); kartta yalnız doğru cevap (sayı doğrusu)
		void rows;
		if (html) {
			const panel = `<div class="fl-close">${html}</div>`;
			// T.keep: tip kendi cevap tahtasını (sıralama, eşleşme...) korur
			if (T.keep) body.insertAdjacentHTML('beforeend', panel);
			else body.innerHTML = panel;
		}
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
		const b = { x0: Math.min(...xs) - 6, x1: Math.max(...xs) + 6, z0: Math.min(...zs) - 5, z1: Math.max(...zs) + 5 };
		// sonuç kartı büyüdü: tahminler kartın altında kalan alana ortalanır (aynı eğim, lens kaydırma)
		app.cam.fit(b, { pitch: 1.02, top: this._cardTop(), dur: 1.1, arc: 3 });
	}

	/** Kartın ekranın üstünden örttüğü pay: alt kenarı + nefes payı (yerleşimden, dönüşümsüz). */
	_cardTop() {
		const c = this.$.q;
		const H = this.el.clientHeight || innerHeight;
		return Math.min(0.62, Math.max(0, (c.offsetTop + c.offsetHeight + 14) / H));
	}

	/** Harita sorusu kadrajı: bütün Türkiye aynı eğimde, üstteki kartın altında kalan boş alana ortalanmış. */
	_mapFrame(top, opt = {}) {
		const app = this.app;
		const bb = (this._allB ||= app.boundsOf(app.board.provinces.map((p) => p.index)));
		app.cam.fit({ ...bb }, { pitch: 1.3, pad: 1.03, top, ...opt }); // (yataydan 74°, eskiden 58°: kuzey basılmasın, her yer eşit hassas)
	}

	setPins(list) {
		if (!list.length) this._stampBox = null;
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
			return { el: e, x: p.x, z: p.z, km: !!(p.km && !p.goal), goal: !!p.goal };
		});
	}

	/**
	 * Pin cevabı: iğnelerin "km" yazıları birbirine, başka iğnelere, hedef bayrağına binmesin, kartın arkasına ve ekran
	 * kenarının dışına çıkmasın. Aday yerler: iğnenin üstü, ucunun altı, sağı, solu; ilk boş olan seçilir. Hiçbiri boş
	 * değilse en az binen (yazı üstüne yazı en ağır, iğne gövdesi orta, hedef bayrağı hafif). Yazı ekranın içine kaydırılır.
	 * Sınıf ve kayma yalnız değişince yazılır.
	 */
	_kmPlace(P) {
		const K = P.filter((p) => p.km);
		if (!K.length) return;
		const SW = this.el.clientWidth || innerWidth;
		const SH = this.el.clientHeight || innerHeight;
		const ov = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
		const obs = [];
		for (const p of P) {
			if (p.w || p.sx == null) continue; // yazı rozetleri değil, iğneler
			obs.push(p.goal ? { l: p.sx - 24, r: p.sx + 24, t: p.sy - 24, b: p.sy + 24, p, k: 0.3 } : { l: p.sx - 20, r: p.sx + 20, t: p.sy - 50, b: p.sy + 2, p, k: 1 });
		}
		// haritalı soruda kartın altı engel: yazı kartın arkasına girmesin
		const top = this.el.classList.contains('qmap') && this._mapTop ? this._mapTop * SH - 4 : 2;
		obs.push({ l: -1e5, r: 1e5, t: -1e5, b: top, p: null, k: 10 });
		K.sort((a, b) => a.sy - b.sy);
		for (const p of K) {
			p.kw ??= p.el.querySelector('.km')?.offsetWidth || 44;
			const w = p.kw + 6;
			const at = (cx, t, b, m) => {
				const l0 = cx - w / 2;
				const kx = Math.max(4 - l0, Math.min(0, SW - 4 - (l0 + w))); // ekranın içine kaydır
				return { l: l0 + kx, r: l0 + kx + w, t, b, m, kx };
			};
			const C = [
				at(p.sx, p.sy - 72, p.sy - 49, ''),
				at(p.sx, p.sy + 3, p.sy + 26, 'kd'),
				at(p.sx + 22 + w / 2, p.sy - 38, p.sy - 15, 'kr'),
				at(p.sx - 22 - w / 2, p.sy - 38, p.sy - 15, 'kl'),
			];
			const cost = (R) => obs.reduce((a, B) => a + (B.p === p ? 0 : ov(R, B) * B.k), 0) + (R.b > SH - 4 ? 1e4 : 0);
			// kararsız kalmasın: şimdiki yer boşsa ondan çıkılmaz
			const cur = C.find((c) => c.m === (p.km0 || ''));
			let best = cur && cost(cur) === 0 ? cur : null;
			if (!best) {
				let bc = Infinity;
				for (const c of C) {
					const v = cost(c);
					if (v < bc - 0.5) {
						bc = v;
						best = c;
					}
					if (v === 0) break;
				}
			}
			if (best.m !== (p.km0 || '')) {
				if (p.km0) p.el.classList.remove(p.km0);
				if (best.m) p.el.classList.add(best.m);
				p.km0 = best.m;
			}
			const kx = Math.round(best.kx);
			if (kx !== p.kx0) {
				p.kx0 = kx;
				p.el.style.setProperty('--kx', kx + 'px');
			}
			obs.push({ ...best, p: null, k: 10 });
		}
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
		const P = this.pins;
		for (const p of P) {
			app.toScreen(v.set(p.x, hb ? b.heightAt(p.x, p.z) : top, p.z), s);
			p.sx = s.x;
			p.sy = s.y;
			if (p.w == null && p.el.classList.contains('dn-tag')) {
				p.w = p.el.firstElementChild?.offsetWidth || 0;
				p.h = p.el.firstElementChild?.offsetHeight || 0;
			}
			p.ty = 0;
		}
		this._kmPlace(P);
		// yazı rozetleri (v1.7): öncelik sırasıyla BOŞ yere yerleşir. Önce kendi yeri, sonra bir önceki karedeki yeri (titremesin),
		// sonra kademeli adaylar (yukarı, aşağı, yanlar, çaprazlar). Engeller: önce yerleşen rozetler, cevap damgası, ekran
		// kenarı ve (haritalı soruda) kartın altı. Boş yer yoksa kendi yerinde kalır. Büyük rozet (cevap) önce yerleşir.
		const SW = this.el.clientWidth || innerWidth;
		const SH = this.el.clientHeight || innerHeight;
		const nowT = performance.now();
		let cutY = this.el.classList.contains('qmap') && this._mapTop ? this._mapTop * SH - 8 : -1e9;
		const boxes = this._stampBox ? [this._stampBox] : [];
		// duraklat düğmesi de engel: rozet onun altına girmesin (yeri yarım saniyede bir ölçülür; her kare yerleşim okutmaz)
		if (!this._pbT || nowT - this._pbT > 500) {
			this._pbT = nowT;
			const pb = this.$.pbtn;
			const vis = pb && !pb.classList.contains('off') && pb.offsetWidth > 0;
			if (vis) {
				const r = pb.getBoundingClientRect();
				const u = this.el.getBoundingClientRect();
				this._pbBox = { l: r.left - u.left - 4, r: r.right - u.left + 4, t: r.top - u.top - 4, b: r.bottom - u.top + 4 };
			} else this._pbBox = null;
		}
		if (this._pbBox) boxes.push(this._pbBox);
		// kartın gerçek alt kenarı: kadraj payı (_mapTop) %62'de kırpılır ve kart sonradan uzayabilir (joker çubukları,
		// ipucu satırı); yazı rozetleri bu gerçek kenarın altına inmezse kartın üstüne binerdi
		if (this.el.classList.contains('qmap') && (!this._cbT || nowT - this._cbT > 500)) {
			this._cbT = nowT;
			const c = this.$.q;
			this._cardBot = c && c.offsetHeight ? c.offsetTop + c.offsetHeight + 6 : 0;
		}
		if (this.el.classList.contains('qmap') && this._cardBot) cutY = Math.max(cutY, this._cardBot);
		const tags = P.filter((p) => p.w);
		for (const p of tags) p.big ??= p.el.classList.contains('big');
		if (tags.length > 1) tags.sort((x, y) => y.big - x.big);
		for (const p of tags) {
			const w = p.w + 6;
			const h = p.h + 5;
			const bx = p.w + 12 < SW ? Math.min(SW - p.w / 2 - 6, Math.max(p.w / 2 + 6, p.sx)) : p.sx;
			const box = (ox, oy) => ({ l: bx + ox - w / 2, r: bx + ox + w / 2, t: p.sy + oy - 6 - h, b: p.sy + oy - 4 });
			const free = (ox, oy) => {
				const R = box(ox, oy);
				if (R.l < 2 || R.r > SW - 2 || R.t < cutY || R.b > SH - 4) return false;
				for (const B of boxes) if (R.l < B.r && B.l < R.r && R.t < B.b && B.t < R.b) return false;
				return true;
			};
			// binme payı: adayın öbür kutularla kesişim alanı (boş yer yoksa en az binen aday seçilir)
			const cost = (ox2, oy2) => {
				const R = box(ox2, oy2);
				let c = R.l < 2 || R.r > SW - 2 || R.b > SH - 4 ? 1e6 : 0;
				if (R.t < cutY) c += 1e5;
				for (const B of boxes) c += Math.max(0, Math.min(R.r, B.r) - Math.max(R.l, B.l)) * Math.max(0, Math.min(R.b, B.b) - Math.max(R.t, B.t));
				return c;
			};
			let ox = 0;
			let oy = 0;
			// yapışkanlık (zıplamasın): önceki yeri boşsa orada kalır; kendi yerine ancak orası 0,6 sn boş kalınca döner
			const homeFree = free(0, 0);
			p.homeT = homeFree ? (p.homeT ?? nowT) : null;
			const stay = p.lox != null && (p.lox || p.loy) && free(p.lox, p.loy) && !(homeFree && nowT - p.homeT > 600);
			if (stay) {
				ox = p.lox;
				oy = p.loy;
			} else if (!homeFree) {
				{
					let found = false;
					let bestC = cost(0, 0);
					for (let k = 1; k <= 9 && !found; k++)
						for (const [cx, cy] of [[0, -k * h], [0, k * h], [-k * w * 0.55, 0], [k * w * 0.55, 0], [-k * w * 0.5, -k * h], [k * w * 0.5, -k * h], [-k * w * 0.5, k * h], [k * w * 0.5, k * h]]) {
							if (free(cx, cy)) {
								ox = cx;
								oy = cy;
								found = true;
								break;
							}
							const c = cost(cx, cy) + Math.hypot(cx, cy) * 0.5; // eşitlikte yakın aday
							if (c < bestC) {
								bestC = c;
								ox = cx;
								oy = cy;
							}
						}
				}
			}
			// cevabın büyük rozeti hiç gizlenmez: kartın altına giriyorsa kartın hemen altına iner
			if (p.big && cutY > 0) oy = Math.max(oy, cutY + 2 - (p.sy - 6 - h));
			p.lox = ox;
			p.loy = oy;
			p.bx = bx;
			boxes.push(box(ox, oy));
		}
		// yumuşak geçiş süreye bağlı (~80 ms zaman sabiti): kare hızından bağımsız (30 fps'te de, yavaş cihazda da aynı)
		const kT = 1 - Math.exp(-Math.min(0.5, (nowT - (this._tagT || nowT)) / 1000) / 0.08);
		this._tagT = nowT;
		for (const p of P) {
			if (p.w) {
				const k = p.dx == null ? 1 : kT;
				p.dx = (p.dx ?? p.lox) + (p.lox - (p.dx ?? p.lox)) * k;
				p.dy = (p.dy ?? p.loy) + (p.loy - (p.dy ?? p.loy)) * k;
				// haritalı soruda kartın altına giren yazı rozeti gizlenir (kartın üstüne binmesin)
				const off = p.sx < -4 || p.sx > SW + 4 || p.sy < -4 || p.sy > SH + 4; // ait olduğu yer ekranın dışında
				const hide = off || (!p.big && p.sy + p.dy - 6 - (p.h || 0) < cutY);
				if (hide !== p.hid) {
					p.hid = hide;
					p.el.style.opacity = hide ? '0' : '';
				}
				p.el.style.transform = `translate(${(p.bx + p.dx).toFixed(1)}px,${(p.sy + p.dy).toFixed(1)}px)`;
			} else p.el.style.transform = `translate(${p.sx.toFixed(1)}px,${p.sy.toFixed(1)}px)`;
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
		const pd = this._pend;
		this._pend = null;
		if (pd && pd.gen === this._gen) {
			// sonuç + il payı tek ekran (v1.5): order maçın sıralaması (match.rank), sonuç nesneleri aynı
			const g = this._gen;
			const res = this._showResult(pd.results, order, pd.closest, pd.T, pd.v, pd.me, { m, picks });
			await this._hold(pd.me ? 2800 : 2000, res);
			if (g !== this._gen) return;
			res.classList.remove('on');
			await sleep(220);
			return;
		}
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
		if (this._ruleT) clearInterval(this._ruleT);
		this._ruleT = 0;
		this.$.rule?.classList.add('off');
		this._bd?.classList.remove('on');
		this._skip?.classList.add('off');
		this._elim?.classList.remove('on');
		try {
			this._cancel?.();
		} catch (e) {
			/* yoksay */
		}
		this._cancel = null;
		const $ = this.$;
		$.q.className = 'fl-q';
		$.q.innerHTML = '';
		clearTimeout(this._coverT);
		this.app.coverQ = false;
		this.el.classList.remove('qon', 'qmap', 'qcover');
		this.app.calmQ = false;
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
		this._jkCb = null; // biten maçın joker geri çağrısı yeni maça kalmasın
		this._jk = [];
	}

	debug(opts) {
		return debugShot(this, opts);
	}
}
