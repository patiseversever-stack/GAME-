// Arayüz: başlık, bölümler, oyun içi gösterge (HUD), bitiş ekranları, duraklatma.
// DOM bir kez kurulur; oyun sırasında yalnızca metin ve transform değişir (yeniden düzen hesabı yok).

import { CSS } from './styles.js';

const ICON = {
	back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
	pause: '<svg viewBox="0 0 24 24"><path d="M9 6v12M15 6v12"/></svg>',
	close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
	hand: '<svg viewBox="0 0 24 24"><path d="M8 13V6a1.5 1.5 0 0 1 3 0v6M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V7a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6 7s-5-2-6.5-5L3 13.5c-.6-1 .6-2.2 1.6-1.5L8 15"/></svg>',
	wait: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/></svg>',
};

const HINTS = {
	drag: 'Parmağını sağa sola kaydır: <em>güneş</em> ağacın etrafında döner.',
	hide: 'Güneşi gövdenin <em>arkasına</em> sakla: ağacın gölgesi Zifir’i korur.',
	drops: '<em>Gece damlaları</em> ışıkta erir. Onları da gölgede tut.',
	bridge: 'Köprüde gövde uzakta kalır: <em>yaprakların</em> gölgesini kullan.',
	ledge: 'Güneş tepedeyken <em>üstteki patika</em> da gölge verir.',
	wait: '<em>Bekle</em>’ye basılı tut: Zifir durur, sen gölgeyi hazırlarsın.',
	gust: '<em>Sert rüzgâr</em> yaprakları savurur. Dinmesini bekle.',
	gate: 'Güneş batıyor. <em>Kök Kapısı</em>’na ulaş.',
	crystal: '<em>Kristaller</em> güneşi yansıtır. Güneşi biraz kaydır: ışın Zifir’e değmesin.',
	lock: 'Tomurcuk ışıkla açılır. Gölgenin kenarını ikisinin <em>arasına</em> düşür: ışık tomurcuğa değsin, Zifir’e değmesin.',
};

export class UI {
	constructor(root, h) {
		this.h = h;
		if (!document.getElementById('uk-style')) {
			const st = document.createElement('style');
			st.id = 'uk-style';
			st.textContent = CSS;
			document.head.appendChild(st);
		}
		const ui = document.createElement('div');
		ui.className = 'uk-ui';
		ui.innerHTML = /* html */ `
			<div class="uk-scr uk-title" data-s="title">
				<div class="top"><button class="uk-ico uk-tap" data-a="exit" aria-label="Ana oyuna dön">${ICON.back}</button><span></span></div>
				<div class="uk-brand"><div class="k">Gündönümü · İkinci Mod</div><h1>Ulu Kayın</h1><div class="tag">Güneş ağacın etrafında döner, gölgesi Zifir’in yoludur</div></div>
				<div class="acts"><button class="uk-btn pri uk-tap" data-a="play">Başla</button><div class="row"><button class="uk-btn gh uk-tap" data-a="levels">Bölümler</button><button class="uk-btn gh uk-tap" data-a="settings">Ayarlar</button></div></div>
			</div>
			<div class="uk-scr uk-levels" data-s="levels">
				<div class="hd"><button class="uk-ico uk-tap" data-a="title" aria-label="Geri">${ICON.back}</button><h5>Mevsimler</h5><span class="sp"></span></div>
				<div class="uk-list"></div>
			</div>
			<div class="uk-hud">
				<div class="top">
					<button class="uk-ico" data-a="pause" aria-label="Duraklat">${ICON.pause}</button>
					<div class="lvl"><small class="lk"></small><b class="lt"></b></div>
					<div class="uk-pill dp"><i></i><span class="dt">0/0</span></div>
				</div>
				<div class="uk-compass" aria-hidden="true">
					<svg viewBox="-60 -60 120 120">
						<circle class="orb" r="52"/>
						<path class="win" d=""/>
						<g class="bandg"><rect class="band" x="-21" y="0" width="42" height="58" rx="4"/></g>
						<circle class="trunk" r="20"/>
						<circle class="zif" cx="0" cy="34" r="6.5"/>
						<g class="sun"><g transform="translate(0 52)"><path class="ray" d="M0-13v-4M0 13v4M-13 0h-4M13 0h4M-9-9l-3-3M9 9l3 3M-9 9l-3 3M9-9l3-3"/><circle r="8.5"/></g></g>
					</svg>
				</div>
				<button class="uk-wait" aria-label="Bekle">${ICON.wait}<b>Bekle</b></button>
				<div class="uk-hint"></div>
				<div class="uk-hand"><i></i></div>
				<div class="uk-gust">Rüzgâr geliyor</div>
			</div>
			<div class="uk-card-title"><small></small><b></b><span></span></div>
			<div class="uk-lore"></div>
			<button class="uk-skip" data-a="skip">Geç ›</button>
			<div class="uk-scr uk-end" data-s="complete">
				<div class="k ck">Gölge korundu</div><h2 class="ct"></h2><div class="sub cs"></div>
				<div class="uk-stars"><div class="uk-star s0"><i></i><span>Yolu bitirdi</span></div><div class="uk-star s1"><i></i><span>Tüm damlalar</span></div><div class="uk-star s2"><i></i><span>Lekesiz</span></div></div>
				<div class="uk-dust"></div>
				<div class="acts"><button class="uk-btn pri uk-tap" data-a="next">Sonraki bölüm</button><div class="row"><button class="uk-btn gh uk-tap" data-a="retry">Tekrar</button><button class="uk-btn gh uk-tap" data-a="levels">Bölümler</button></div></div>
			</div>
			<div class="uk-scr uk-end" data-s="fail">
				<div class="k">Işık kazandı</div><h2>Zifir buharlaştı</h2><div class="sub fs"></div>
				<div class="uk-prog"><i class="fp"></i></div>
				<div class="uk-mercy fm"></div>
				<div class="acts"><button class="uk-btn pri uk-tap" data-a="retry">Tekrar</button><button class="uk-btn gh uk-tap" data-a="levels">Bölümler</button></div>
			</div>
			<div class="uk-scr uk-end" data-s="ending">
				<div class="k">Kök Kapısı açıldı</div><h2>Gece eve döndü</h2>
				<div class="sub">Zifir Ulu Kayın’ın köklerine ulaştı. Tün Ana’nın son yıldızı, karın altında ilk kez kıpırdıyor.</div>
				<div class="uk-dust ed"></div>
				<div class="acts"><button class="uk-btn pri uk-tap" data-a="levels">Mevsimler</button><button class="uk-btn gh uk-tap" data-a="exit">Gökyüzüne dön</button></div>
			</div>
			<div class="uk-scr uk-pause" data-s="pause">
				<div class="uk-card uk-tap">
					<h4>Duraklatıldı</h4>
					<button class="uk-btn pri" data-a="resume">Devam</button>
					<button class="uk-btn gh" data-a="retry">Yeniden başla</button>
					<button class="uk-btn gh" data-a="levels">Bölümler</button>
					<button class="uk-tog" data-t="sound">Ses <b></b></button>
					<button class="uk-tog" data-t="haptics">Titreşim <b></b></button>
					<button class="uk-tog" data-t="quality">Grafik <b></b></button>
					<button class="uk-tog" data-t="power">Pil <b></b></button>
				</div>
			</div>
			<div class="uk-toast"></div>
			<div class="uk-fade"></div>`;
		root.appendChild(ui);
		this.el = ui;
		const $ = (q) => ui.querySelector(q);
		this.$ = $;
		this.scr = {};
		ui.querySelectorAll('.uk-scr').forEach((e) => (this.scr[e.dataset.s] = e));
		this.hud = $('.uk-hud');
		this.lk = $('.lk');
		this.lt = $('.lt');
		this.dp = $('.dp');
		this.dt = $('.dt');
		this.sunG = $('.sun');
		this.bandG = $('.bandg');
		this.zifDot = $('.zif');
		this.hintEl = $('.uk-hint');
		this.hand = $('.uk-hand');
		this.gustEl = $('.uk-gust');
		this.toastEl = $('.uk-toast');
		this.titleCard = $('.uk-card-title');
		this.loreEl = $('.uk-lore');
		this.skipEl = $('.uk-skip');
		this.fadeEl = $('.uk-fade');
		this.waitBtn = $('.uk-wait');
		this._rel = null;
		this._hot = null;

		// düğmeler
		ui.addEventListener('click', (e) => {
			const b = e.target.closest('[data-a]');
			if (b) {
				e.stopPropagation();
				h.action(b.dataset.a);
				return;
			}
			const t = e.target.closest('[data-t]');
			if (t) {
				e.stopPropagation();
				h.toggle(t.dataset.t);
			}
		});
		// Bekle: basılı tut
		const wb = this.waitBtn;
		const down = (e) => {
			e.preventDefault();
			e.stopPropagation();
			try {
				wb.setPointerCapture(e.pointerId);
			} catch (er) {
				/* yok say */
			}
			wb.classList.add('dn');
			h.wait(true);
		};
		const up = () => {
			wb.classList.remove('dn');
			h.wait(false);
		};
		wb.addEventListener('pointerdown', down);
		wb.addEventListener('pointerup', up);
		wb.addEventListener('pointercancel', up);
		wb.addEventListener('lostpointercapture', up);
	}

	show(name) {
		for (const [k, e] of Object.entries(this.scr)) e.classList.toggle('on', k === name);
	}

	hudOn(on) {
		this.hud.classList.toggle('on', on);
		this.hud.querySelectorAll('[data-a],.uk-wait').forEach((b) => (b.style.pointerEvents = on ? 'auto' : 'none'));
	}

	setLevel(info) {
		this.lk.textContent = info.kicker;
		this.lt.textContent = info.title;
	}

	setDrops(got, total, fx) {
		this.dt.textContent = `${got}/${total}`;
		this.dp.style.display = total ? '' : 'none';
		if (fx === 'pop') {
			this.dp.classList.add('pop');
			setTimeout(() => this.dp.classList.remove('pop'), 220);
		} else if (fx === 'bad') {
			this.dp.classList.remove('bad');
			void this.dp.offsetWidth;
			this.dp.classList.add('bad');
		}
	}

	/** Pusula: rel = güneşin Zifir'e göre açısı (0: Zifir tarafında, π: gövdenin arkasında). */
	compass(rel, hot) {
		const deg = Math.round((rel * 180) / Math.PI * 2) / 2;
		if (deg !== this._rel) {
			this._rel = deg;
			this.sunG.setAttribute('transform', `rotate(${deg})`);
			this.bandG.setAttribute('transform', `rotate(${deg + 180})`);
		}
		if (hot !== this._hot) {
			this._hot = hot;
			this.zifDot.classList.toggle('hot', hot);
		}
	}

	/** Pusulada güneşin gitmesi gereken aralık (kilit yardımı). a0, a1: Zifir'e göre açı (radyan). */
	lockArc(a0, a1) {
		const el = this.$('.uk-compass .win');
		if (a0 == null) {
			if (this._arc) el.setAttribute('d', '');
			this._arc = null;
			return;
		}
		const key = `${a0.toFixed(2)}:${a1.toFixed(2)}`;
		if (key === this._arc) return;
		this._arc = key;
		const pt = (a) => `${(-52 * Math.sin(a)).toFixed(1)} ${(52 * Math.cos(a)).toFixed(1)}`;
		const large = a1 - a0 > Math.PI ? 1 : 0;
		el.setAttribute('d', `M ${pt(a0)} A 52 52 0 ${large} 1 ${pt(a1)}`);
	}

	hint(key) {
		if (!key) {
			this.hintEl.classList.remove('on');
			this.hand.classList.remove('on');
			this._hint = null;
			return;
		}
		if (this._hint === key) return;
		this._hint = key;
		this.hintEl.innerHTML = HINTS[key] || key;
		this.hintEl.classList.add('on');
		this.hand.classList.toggle('on', key === 'drag');
	}

	gust(on) {
		if (on !== this._gust) {
			this._gust = on;
			this.gustEl.classList.toggle('on', on);
		}
	}

	toast(text, ms = 2200) {
		this.toastEl.textContent = text;
		this.toastEl.classList.add('on');
		clearTimeout(this._toastT);
		this._toastT = setTimeout(() => this.toastEl.classList.remove('on'), ms);
	}

	card(kicker, title, sub) {
		if (!kicker) {
			this.titleCard.classList.remove('on');
			return;
		}
		this.titleCard.querySelector('small').textContent = kicker;
		this.titleCard.querySelector('b').textContent = title;
		this.titleCard.querySelector('span').textContent = sub || '';
		this.titleCard.classList.add('on');
	}

	lore(text) {
		if (!text) this.loreEl.classList.remove('on');
		else {
			this.loreEl.textContent = text;
			this.loreEl.classList.add('on');
		}
	}

	skip(on) {
		this.skipEl.classList.toggle('on', on);
	}

	fade(on) {
		this.fadeEl.classList.toggle('on', on);
	}

	renderLevels(levels, prog) {
		const list = this.$('.uk-list');
		list.innerHTML = levels
			.map((L, i) => {
				const lock = i > prog.unlocked;
				const st = prog.stars[i] || 0;
				return `<button class="uk-lv uk-tap${lock ? ' lock' : ''}" data-a="lv:${i}" data-s="${L.season}">
					<small>${L.kicker}</small><b>${L.title}</b>
					<span class="st">${[0, 1, 2].map((k) => `<i class="${k < st ? 'on' : ''}"></i>`).join('')}</span><span class="sw"></span></button>`;
			})
			.join('');
	}

	showComplete({ title, kicker, stars, dust, last }) {
		this.$('.ck').textContent = kicker;
		this.$('.ct').textContent = title;
		this.$('.cs').textContent = last ? 'Son bölüm' : '';
		['.s0', '.s1', '.s2'].forEach((q, i) => {
			const e = this.$(q);
			e.classList.remove('on');
			if (stars[i]) setTimeout(() => e.classList.add('on'), 350 + i * 260);
		});
		this.$('.uk-dust').textContent = dust ? `+${dust} ışık tozu` : '';
		this.$('[data-s=complete] [data-a=next]').style.display = last ? 'none' : '';
		this.show('complete');
	}

	showFail({ progress, mercy }) {
		this.$('.fs').textContent = `Yolun %${Math.round(progress * 100)}’i`;
		this.$('.fp').style.width = `${Math.round(progress * 100)}%`;
		this.$('.fm').innerHTML = mercy ? `<b>Güneş yumuşuyor:</b> bir sonraki denemede ışık daha az yakar.` : '';
		this.show('fail');
	}

	showEnding(dustTotal) {
		this.$('.ed').textContent = dustTotal ? `Toplam ${dustTotal} ışık tozu` : '';
		this.show('ending');
	}

	setToggles(v) {
		const set = (k, txt) => {
			const b = this.$(`[data-t=${k}] b`);
			if (b) b.textContent = txt;
		};
		set('sound', v.sound ? 'Açık' : 'Kapalı');
		set('haptics', v.haptics ? 'Açık' : 'Kapalı');
		set('quality', { auto: 'Otomatik', 0: 'Düşük', 1: 'Orta', 2: 'Yüksek' }[v.quality] || 'Otomatik');
		set('power', { auto: 'Otomatik', saver: 'Tasarruf', performance: 'Performans' }[v.power] || 'Otomatik');
	}

	setPlayLabel(txt) {
		this.$('[data-a=play]').textContent = txt;
	}
}
