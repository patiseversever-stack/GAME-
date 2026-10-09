// Arayüz: başlık, bölümler, oyun içi gösterge (HUD), bitiş ekranları, duraklatma.
// DOM bir kez kurulur; oyun sırasında yalnızca metin, sınıf ve transform değişir (yeniden düzen hesabı yok).
// Her metin koyu mürekkep bir panelin ya da perdenin üstündedir: parlak bahar sahnesinde de okunur.

import { CSS } from './styles.js';

// ---- simgeler (24×24, çizgi) ----
const sv = (d, cls = '') => `<svg viewBox="0 0 24 24"${cls ? ` class="${cls}"` : ''} aria-hidden="true">${d}</svg>`;
const ICON = {
	back: sv('<path d="M15 5l-7 7 7 7"/>'),
	pause: sv('<path d="M9 6.5v11M15 6.5v11"/>'),
	play: sv('<path d="M8.5 5.8v12.4c0 .7.8 1.1 1.4.7l9.2-6.2c.5-.4.5-1.1 0-1.4L9.9 5.1c-.6-.4-1.4 0-1.4.7z"/>', 'f'),
	path: sv('<path d="M8 14.5h8.6a3.8 3.8 0 0 0 .8-7.5 5.5 5.5 0 0 0-10.7-.3A3.9 3.9 0 0 0 8 14.5z"/><path d="M12 14.5v5M12 17l-2.3-1.8M12 16l2.3-1.6M8.5 21.5c1.4-.3 2.5-1 3.5-2.2 1 1.2 2.1 1.9 3.5 2.2"/>'),
	gear: sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
	retry: sv('<path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4"/><path d="M4.5 4v4.5H9"/>'),
	next: sv('<path d="M5 12h13M13 6l6 6-6 6"/>'),
	home: sv('<path d="M4 11.5L12 4l8 7.5M6.5 9.5V20h11V9.5"/>'),
	sound: sv('<path d="M4 9.5v5h3.5l5 4v-13l-5 4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/>'),
	vibe: sv('<rect x="8" y="3.5" width="8" height="17" rx="2"/><path d="M4.5 8.5v7M19.5 8.5v7"/>'),
	gem: sv('<path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z"/>'),
	battery: sv('<rect x="3" y="7.5" width="15.5" height="9" rx="2"/><path d="M21 10.5v3M6.5 10.5v3M9.5 10.5v3"/>'),
	hand: sv('<path d="M8 13V6a1.5 1.5 0 0 1 3 0v6M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V7a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6 7s-5-2-6.5-5L3 13.5c-.6-1 .6-2.2 1.6-1.5L8 15"/>'),
	hourglass: sv('<path d="M6.5 3h11M6.5 21h11"/><path d="M8 3v2.5c0 2.3 4 4.2 4 6.5s-4 4.2-4 6.5V21M16 3v2.5c0 2.3-4 4.2-4 6.5s4 4.2 4 6.5V21"/>'),
	drop: sv('<path d="M12 3.2c3.6 4.4 6.2 7.5 6.2 10.8a6.2 6.2 0 0 1-12.4 0c0-3.3 2.6-6.4 6.2-10.8z"/>'),
	sun: sv('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>'),
	shade: sv('<circle cx="15.5" cy="8" r="3.8"/><path d="M15.5 1.8v1.4M21.7 8h-1.4M19.9 3.6l-1 1M19.9 12.4l-1-1"/><rect class="f" x="7" y="2.5" width="5.6" height="19" rx="1.6"/><path d="M7 15.5l-4.5 3.5M7 19.5l-2.5 2"/>'),
	leaf: sv('<path d="M5 19.5C5 10.5 10 5 20 4c-.6 10-6 15.5-15 15.5z"/><path d="M5 19.5l8.5-8.5"/>'),
	ledge: sv('<path d="M3 8h18M6 8v2.5M18 8v2.5M5 18h14"/><path d="M8.5 11.5L6.5 16M12.5 11.5l-2 4.5M16.5 11.5l-2 4.5"/>'),
	wind: sv('<path d="M3 8.5h11a3 3 0 1 0-3-3M3 12.5h15.5a3 3 0 1 1-3 3M3 16.5h7"/>'),
	gate: sv('<path d="M5 21V11a7 7 0 0 1 14 0v10M3.5 21h17M12 21v-5.5"/>'),
	crystal: sv('<path d="M12 2.5l5 6-5 13-5-13z"/><path d="M7 8.5h10M12 2.5v19"/>'),
	bud: sv('<path d="M12 21v-6.5"/><path d="M12 14.5c-3.4 0-5.4-2.9-5.4-6.4 1.8.6 3.9-1.2 5.4-4.6 1.5 3.4 3.6 5.2 5.4 4.6 0 3.5-2 6.4-5.4 6.4z"/><path d="M12 18c-2 0-3.5-1-4.5-2.5M12 18c2 0 3.5-1 4.5-2.5"/>'),
	birds: sv('<path d="M3 9.5c1.5-1.8 3.3-1.8 4.5 0 1.2-1.8 3-1.8 4.5 0M12 15.5c1.5-1.8 3.3-1.8 4.5 0 1.2-1.8 3-1.8 4.5 0M5.5 19.5c1.2-1.4 2.6-1.4 3.6 0 1-1.4 2.4-1.4 3.6 0"/>'),
	lock: sv('<rect x="5" y="10.5" width="14" height="10" rx="2.6"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
	check: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
	star: sv('<path d="M12 2.8l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.6l-5.6 3.2 1.3-6.2L3 9.3l6.3-.7z"/>', 'f'),
	blossom: sv('<g class="f"><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9"/><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(72 12 12)"/><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(144 12 12)"/><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(216 12 12)"/><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(288 12 12)"/></g><circle cx="12" cy="12" r="2.2" class="c"/>'),
	sleaf: sv('<path class="f" d="M5 19.5C5 10.5 10 5 20 4c-.6 10-6 15.5-15 15.5z"/><path class="c" d="M5 19.5l8.5-8.5"/>'),
	maple: sv('<path class="f" d="M12 2.5l1.6 3.8 3.4-1.5-.9 4.2 4.4.5-2.9 3.1 2.2 2.4-4.4.3.6 3.4L12 16.4l-4 2.3.6-3.4-4.4-.3 2.2-2.4L3.5 9.5l4.4-.5L7 4.8l3.4 1.5z"/><path class="c" d="M12 16.4v5"/>'),
	flake: sv('<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.5 4l2.5 2.5L14.5 4M9.5 20l2.5-2.5 2.5 2.5M4 10.5l3.4.9-.9 3.4M20 13.5l-3.4-.9.9-3.4M5 13.6l3.4-.9-.9-3.4M19 10.4l-3.4.9.9 3.4"/>'),
};

// Gündönümü amblemi: yarısı Kün Ata (altın güneş), yarısı Tün Ana (mürekkep gece); ortada Ulu Kayın.
const EMBLEM = `<svg class="emb" viewBox="-40 -40 80 80" aria-hidden="true">
	<g class="er">${Array.from({ length: 9 }, (_, i) => {
		const a = (-80 + i * 20) * (Math.PI / 180);
		return `<path d="M${(Math.cos(a) * 29).toFixed(1)} ${(Math.sin(a) * 29).toFixed(1)}L${(Math.cos(a) * 36).toFixed(1)} ${(Math.sin(a) * 36).toFixed(1)}"/>`;
	}).join('')}</g>
	<g class="es"><circle cx="-31" cy="-10" r="1.4"/><circle cx="-26" cy="14" r="1"/><circle cx="-33" cy="6" r=".9"/><circle cx="-20" cy="-27" r="1.1"/></g>
	<circle class="en" r="23"/>
	<path class="ed" d="M0-23A23 23 0 0 1 0 23Z"/>
	<path class="et" d="M0 23V-6M0 4l-7-7M0-1l7-8M0-6l-4-7M0-6l3-8"/>
	<circle class="eo" r="23"/>
</svg>`;

// Güneş ışınları (bitiş ekranı madalyonunun arkasında yavaşça döner)
const RAYS = `<svg viewBox="-100 -100 200 200" aria-hidden="true">${Array.from({ length: 16 }, (_, i) => `<path transform="rotate(${i * 22.5})" d="M-5 -34L0 -98L5 -34Z"/>`).join('')}</svg>`;

const HINTS = {
	drag: ['hand', 'Parmağını sağa sola kaydır: <em>güneş</em> ağacın çevresinde döner.'],
	hide: ['shade', 'Güneşi <em>gövdenin arkasına</em> al. Ağacın gölgesi Zifir’i korur.'],
	drops: ['drop', '<em>Gece damlalarını</em> topla. Işıkta erirler, onları da gölgede tut.'],
	bridge: ['leaf', 'Köprüde gövde uzakta: <em>yaprakların gölgesine</em> sığın.'],
	ledge: ['ledge', 'Güneş tepedeyken <em>üstteki patika</em> da gölge verir.'],
	wait: ['hourglass', '<em>Bekle</em>’ye basılı tut: Zifir durur, sen gölgeyi hazırlarsın.'],
	gust: ['wind', '<em>Sert rüzgâr</em> yaprakları savurur. <em>Bekle</em>, dinsin.'],
	gate: ['gate', 'Güneş batıyor. Zifir’i <em>Kök Kapısı</em>’na ulaştır!'],
	crystal: ['crystal', '<em>Kristaller</em> ışığı yansıtır. Işın Zifir’e değmesin.'],
	lock: ['bud', 'Tomurcuk ışıkla açılır: ona <em>ışık</em>, Zifir’e <em>gölge</em> düşür.'],
};

const SEASON = {
	spring: { name: 'Bahar', sub: 'Çiçekli taç', icon: ICON.blossom },
	summer: { name: 'Yaz', sub: 'Yeşil gövde', icon: ICON.sleaf },
	autumn: { name: 'Güz', sub: 'Altın dallar', icon: ICON.maple },
	winter: { name: 'Kış', sub: 'Karlı kökler', icon: ICON.flake },
};

const ABILITY = {
	flock: { icon: ICON.birds, label: 'Sürü' },
};

// Türkçe iyelik eki (%60’ı, %50’si, %30’u, %100’ü); belirtme hâli için sonuna n + son ünlü eklenir.
const POSS1 = ['ı', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'];
const POSS10 = ['ı', 'u', 'si', 'u', 'ı', 'si', 'ı', 'i', 'i', 'ı'];
function possOf(n) {
	if (n >= 100) return 'ü';
	return n % 10 ? POSS1[n % 10] : POSS10[n / 10];
}
const accOf = (n) => {
	const p = possOf(n);
	return p + 'n' + p.slice(-1);
};

function reducedMotion() {
	try {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	} catch (e) {
		return false;
	}
}

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
		ui.lang = 'tr';
		const tog = (t, ic, label) => `<button class="uk-tog" data-t="${t}">${ic}<span>${label}</span><b></b></button>`;
		const star = (k, label) => `<div class="uk-star s${k}"><div class="sh"><i></i><b></b></div><span>${label}</span></div>`;
		ui.innerHTML = /* html */ `
			<div class="uk-scr uk-title" data-s="title">
				<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
				<div class="foot"></div>
				<div class="top"><button class="uk-ico uk-tap" data-a="exit" aria-label="Ana oyuna dön">${ICON.back}</button></div>
				<div class="uk-brand">
					${EMBLEM}
					<div class="k"><i></i>Gündönümü · İkinci Mod<i></i></div>
					<h1 data-t="Ulu Kayın"><span>Ulu Kayın</span></h1>
					<div class="tag">Güneşi çevir, gölgede kal.</div>
				</div>
				<div class="acts">
					<button class="uk-btn pri uk-tap" data-a="play">${ICON.play}<b>Başla</b></button>
					<div class="row"><button class="uk-btn gh uk-tap" data-a="levels">${ICON.path}Bölümler</button><button class="uk-btn gh uk-tap" data-a="settings">${ICON.gear}Ayarlar</button></div>
				</div>
			</div>
			<div class="uk-scr uk-levels" data-s="levels">
				<div class="hd"><button class="uk-ico uk-tap" data-a="title" aria-label="Geri">${ICON.back}</button><div class="ttl"><small>Ulu Kayın’ın yolu</small><h5>Mevsimler</h5></div><div class="uk-dpill"><i>✦</i><b class="dsum">0</b></div></div>
				<div class="uk-list"></div>
			</div>
			<div class="uk-hud">
				<div class="top">
					<button class="uk-ico" data-a="pause" aria-label="Duraklat">${ICON.pause}</button>
					<div class="uk-pill dp"><i></i><span class="dt">0/0</span></div>
				</div>
				<div class="lvl"><small class="lk"></small><b class="lt"></b><div class="pg"><i class="pf"></i><div class="ph"><i></i></div></div></div>
				<div class="uk-streak"><b class="sn">×0</b><small>Gölge serisi</small></div>
				<div class="uk-pop"></div><div class="uk-pop"></div><div class="uk-pop"></div>
				<div class="uk-compass" aria-hidden="true">
					<svg viewBox="-64 -64 128 128">
						<defs>
							<radialGradient id="uk-cg" r="0.6"><stop offset="0" stop-color="#fff0cc"/><stop offset="1" stop-color="#e9a95a"/></radialGradient>
							<linearGradient id="uk-cs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c0820"/><stop offset="1" stop-color="#2a1d5a"/></linearGradient>
							<clipPath id="uk-cc"><circle r="44"/></clipPath>
						</defs>
						<circle class="base" r="62"/>
						<circle class="trk" r="53"/>
						<path class="win" d=""/>
						<circle class="gnd" r="44"/>
						<g clip-path="url(#uk-cc)"><g class="bandg"><path class="band" d="M-13.5 0H13.5L17 48H-17Z"/></g></g>
						<circle class="trunk" r="13"/>
						<g transform="translate(0 30)"><circle class="halo" r="13"/><circle class="zif" r="7.5"/><circle class="eye" cx="-2.6" cy="-1.2" r="1.5"/><circle class="eye" cx="2.6" cy="-1.2" r="1.5"/></g>
						<g class="sun"><g transform="translate(0 53)"><circle class="glow" r="15"/><path class="ray" d="M0-11.5v-3.5M0 11.5v3.5M-11.5 0h-3.5M11.5 0h3.5M-8.1-8.1l-2.5-2.5M8.1 8.1l2.5 2.5M-8.1 8.1l-2.5 2.5M8.1-8.1l2.5-2.5"/><circle class="disc" r="8"/></g></g>
					</svg>
					<div class="cs">Gölgede</div>
				</div>
				<button class="uk-ab" data-a="ability:flock" aria-label="Yetenek"><span class="ai"></span><small class="al"></small><span class="pp"><i></i><i></i><i></i><i></i></span></button>
				<button class="uk-wait" aria-label="Bekle">${ICON.hourglass}<b>Bekle</b></button>
				<div class="uk-gust">${ICON.wind}<span>Rüzgâr geliyor</span></div>
				<div class="uk-hint"><i class="hi"></i><p></p></div>
				<div class="uk-hand"><i class="tr"></i><span class="fg">${ICON.hand}</span></div>
			</div>
			<div class="uk-card-title"><i class="bd"></i><small></small><b></b><span></span></div>
			<div class="uk-lore"><i class="orn"></i><p></p></div>
			<button class="uk-skip" data-a="skip">Geç<span>›</span></button>
			<div class="uk-scr uk-end" data-s="complete">
				<div class="uk-sheet">
					<div class="rays">${RAYS}</div>
					<div class="med">${ICON.sun}</div>
					<div class="k ck"></div><h2 class="ct"></h2><div class="ban">Gölge korundu</div><div class="sub cs2"></div>
					<div class="uk-stars">${star(0, 'Yol tamam')}${star(1, 'Tüm damlalar')}${star(2, 'Gölgede kaldı')}</div>
					<div class="uk-dust cd"><i>✦</i><b class="cdn">+0</b><span>ışık tozu</span></div>
					<div class="acts"><button class="uk-btn pri uk-tap" data-a="next"><b>Sonraki bölüm</b>${ICON.next}</button><div class="row"><button class="uk-btn gh uk-tap" data-a="retry">${ICON.retry}Tekrar</button><button class="uk-btn gh uk-tap" data-a="levels">${ICON.path}Bölümler</button></div></div>
				</div>
			</div>
			<div class="uk-scr uk-end fail" data-s="fail">
				<div class="uk-sheet">
					<div class="med">${ICON.drop}</div>
					<div class="k">Işık kazandı</div><h2>Zifir buharlaştı</h2>
					<div class="uk-prog"><i class="fp"></i><div class="fz"><i></i></div><span class="g0"></span><span class="g1">${ICON.gate}</span></div>
					<div class="sub fs"></div>
					<div class="uk-mercy fm">${ICON.sun}<p><b>Güneş yumuşadı.</b> Bir sonraki denemede ışık daha az yakacak.</p></div>
					<div class="acts"><button class="uk-btn pri uk-tap" data-a="retry">${ICON.retry}<b>Tekrar dene</b></button><button class="uk-btn gh uk-tap" data-a="levels">${ICON.path}Bölümler</button></div>
				</div>
			</div>
			<div class="uk-scr uk-end night" data-s="ending">
				<div class="uk-sheet">
					<div class="rays">${RAYS}</div>
					<div class="med">${EMBLEM}</div>
					<div class="k">Kök Kapısı açıldı</div><h2>Gece eve döndü</h2>
					<div class="sub">Zifir, Ulu Kayın’ın köklerine ulaştı. Tün Ana’nın son yıldızı karın altında ilk kez kıpırdıyor.</div>
					<div class="uk-dust ed"><i>✦</i><b class="edn">0</b><span>ışık tozu</span></div>
					<div class="acts"><button class="uk-btn pri uk-tap" data-a="levels">${ICON.path}<b>Mevsimler</b></button><button class="uk-btn gh uk-tap" data-a="exit">${ICON.home}Gökyüzüne dön</button></div>
				</div>
			</div>
			<div class="uk-scr uk-pause" data-s="pause">
				<div class="uk-card uk-tap">
					<h4>Duraklatıldı</h4>
					<div class="cb">
						<button class="uk-btn pri" data-a="resume">Devam</button>
						<button class="uk-btn gh" data-a="retry">Yeniden başla</button>
						<button class="uk-btn gh" data-a="levels">Bölümler</button>
					</div>
					<div class="ct">
						${tog('sound', ICON.sound, 'Ses')}
						${tog('haptics', ICON.vibe, 'Titreşim')}
						${tog('quality', ICON.gem, 'Grafik')}
						${tog('power', ICON.battery, 'Pil')}
					</div>
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
		this.pgF = $('.pg .pf');
		this.pgH = $('.pg .ph');
		this.streakEl = $('.uk-streak');
		this.streakN = $('.uk-streak .sn');
		this.pops = [...ui.querySelectorAll('.uk-pop')];
		this.compassEl = $('.uk-compass');
		this.compassTxt = $('.uk-compass .cs');
		this.sunG = $('.sun');
		this.bandG = $('.bandg');
		this.zifDot = $('.zif');
		this.abEl = $('.uk-ab');
		this.hintEl = $('.uk-hint');
		this.hintIc = $('.uk-hint .hi');
		this.hintTx = $('.uk-hint p');
		this.hand = $('.uk-hand');
		this.gustEl = $('.uk-gust');
		this.toastEl = $('.uk-toast');
		this.titleCard = $('.uk-card-title');
		this.loreEl = $('.uk-lore');
		this.loreTx = $('.uk-lore p');
		this.skipEl = $('.uk-skip');
		this.fadeEl = $('.uk-fade');
		this.waitBtn = $('.uk-wait');
		this._rel = null;
		this._hot = null;
		this._streak = 0;
		this._pg = -1;
		this._pi = 0;
		this._pk = false;
		this._rolls = [];

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
		if (name !== 'complete' && name !== 'ending') this._stopRolls();
	}

	hudOn(on) {
		this.hud.classList.toggle('on', on);
	}

	setLevel(info) {
		this.lk.textContent = info.kicker;
		this.lt.textContent = info.title;
		this.hud.dataset.season = info.season || '';
		// yeni bölüm: seri ve ilerleme sıfırdan
		this.streak(0);
		this._pg = -1;
		this.progress(0);
		this.hud.classList.remove('pg');
	}

	setDrops(got, total, fx) {
		this.dt.textContent = `${got}/${total}`;
		this.dp.style.display = total ? '' : 'none';
		this.dp.classList.toggle('full', total > 0 && got >= total);
		if (fx === 'pop' || fx === 'bad') {
			this._dpk = !this._dpk;
			this.dp.classList.remove('pop0', 'pop1', 'bad0', 'bad1');
			this.dp.classList.add(`${fx}${this._dpk ? 0 : 1}`);
		}
	}

	/** Pusula: rel = güneşin Zifir'e göre açısı (0: Zifir tarafında, π: gövdenin arkasında). */
	compass(rel, hot) {
		const deg = Math.round(((rel * 180) / Math.PI) * 2) / 2;
		if (deg !== this._rel) {
			this._rel = deg;
			this.sunG.setAttribute('transform', `rotate(${deg})`);
			this.bandG.setAttribute('transform', `rotate(${deg + 180})`);
		}
		hot = !!hot;
		if (hot !== this._hot) {
			this._hot = hot;
			this.compassEl.classList.toggle('hot', hot);
			this.compassTxt.textContent = hot ? 'Işıkta!' : 'Gölgede';
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
		const R = 53;
		const pt = (a) => `${(-R * Math.sin(a)).toFixed(1)} ${(R * Math.cos(a)).toFixed(1)}`;
		const large = a1 - a0 > Math.PI ? 1 : 0;
		el.setAttribute('d', `M ${pt(a0)} A ${R} ${R} 0 ${large} 1 ${pt(a1)}`);
	}

	hint(key) {
		if (!key) {
			if (this._hint !== null) {
				this.hintEl.classList.remove('on');
				this.hand.classList.remove('on');
			}
			this._hint = null;
			return;
		}
		if (this._hint === key) return;
		this._hint = key;
		const [ic, html] = HINTS[key] || ['sun', key];
		this.hintIc.innerHTML = ICON[ic] || ICON.sun;
		this.hintTx.innerHTML = html;
		this.hintEl.classList.add('on');
		this.hand.classList.toggle('on', key === 'drag');
	}

	gust(on) {
		on = !!on;
		if (on !== this._gust) {
			this._gust = on;
			this.gustEl.classList.toggle('on', on);
			this.hud.classList.toggle('gst', on);
		}
	}

	/** Gölge serisi sayacı: n > 0 iken görünür, her artışta zıplar. */
	streak(n) {
		n = Math.max(0, n | 0);
		if (n === this._streak) return;
		const prev = this._streak;
		this._streak = n;
		if (!n) {
			this.streakEl.classList.remove('on');
			return;
		}
		this.streakN.textContent = `×${n}`;
		this.streakEl.classList.add('on');
		this.streakEl.classList.toggle('hot', n >= 5);
		if (n > prev) {
			// iki eş animasyon arasında geçiş: yeniden düzen hesabı olmadan baştan oynar
			this._sk = !this._sk;
			this.streakEl.classList.toggle('p0', this._sk);
			this.streakEl.classList.toggle('p1', !this._sk);
		}
	}

	/** Kısa uçan geri bildirim yazısı (üst ortada). tone: 'good' | 'bad' | 'gold'. */
	pop(text, tone = 'good') {
		if (!text) return;
		const now = performance.now();
		if (text === this._popT && now - this._popAt < 300) return; // her kare çağrılırsa yığılmasın
		this._popT = text;
		this._popAt = now;
		this._pi = (this._pi + 1) % this.pops.length;
		this._pk = !this._pk; // havuz tek sayılı: her öğe sırayla a/b alır, animasyon baştan başlar
		const e = this.pops[this._pi];
		e.textContent = text;
		e.className = `uk-pop ${tone === 'bad' || tone === 'gold' ? tone : 'good'} ${this._pk ? 'a' : 'b'}`;
	}

	/** Bölüm ilerlemesi (0..1): bölüm adının altındaki ince yol çizgisi. */
	progress(u) {
		const q = Math.round(Math.min(1, Math.max(0, +u || 0)) * 300) / 300;
		if (q === this._pg) return;
		this._pg = q;
		if (q > 0) this.hud.classList.add('pg');
		this.pgF.style.transform = `scaleX(${q})`;
		this.pgH.style.transform = `translateX(${(q * 100).toFixed(2)}%)`;
	}

	/** Yetenek düğmesi (ör. 'flock'): state {count 0..4, ready, active}; null gizler. */
	ability(id, state) {
		const e = this.abEl;
		if (!state) {
			if (this._abKey) e.classList.remove('on');
			this._abKey = null;
			return;
		}
		const n = Math.max(0, Math.min(4, state.count | 0));
		const key = `${id}:${n}:${state.ready ? 1 : 0}:${state.active ? 1 : 0}`;
		if (key === this._abKey) return;
		if (id !== this._abId) {
			this._abId = id;
			const A = ABILITY[id] || { icon: ICON.gem, label: '' };
			e.dataset.a = `ability:${id}`;
			e.querySelector('.ai').innerHTML = A.icon;
			e.querySelector('.al').textContent = A.label;
		}
		this._abKey = key;
		e.querySelectorAll('.pp i').forEach((p, k) => p.classList.toggle('on', k < n));
		e.classList.toggle('ready', !!state.ready && !state.active);
		e.classList.toggle('active', !!state.active);
		e.classList.add('on');
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
		if (!text) {
			this.loreEl.classList.remove('on');
			this._lore = null;
			return;
		}
		if (text === this._lore) return;
		this._lore = text;
		this.loreTx.textContent = text;
		this._lk = !this._lk;
		this.loreTx.className = this._lk ? 'a' : 'b';
		this.loreEl.classList.add('on');
	}

	skip(on) {
		this.skipEl.classList.toggle('on', on);
	}

	fade(on) {
		this.fadeEl.classList.toggle('on', on);
	}

	renderLevels(levels, prog) {
		const stars = prog.stars || [];
		const groups = [];
		levels.forEach((L, i) => {
			let g = groups[groups.length - 1];
			if (!g || g.s !== L.season) groups.push((g = { s: L.season, items: [] }));
			g.items.push(i);
		});
		const cur = (stars[prog.unlocked] || 0) === 0 ? prog.unlocked : -1;
		const cardHtml = (i) => {
			const L = levels[i];
			const lock = i > prog.unlocked;
			const st = stars[i] || 0;
			const state = lock ? 'lock' : i === cur ? 'cur' : st ? 'done' : 'open';
			const node = lock ? ICON.lock : state === 'cur' ? ICON.play : state === 'done' ? ICON.check : `<b>${i + 1}</b>`;
			const right =
				state === 'cur'
					? `<span class="go">Oyna</span>`
					: lock
						? ''
						: `<span class="st">${[0, 1, 2].map((k) => `<i class="${k < st ? 'on' : ''}">${ICON.star}</i>`).join('')}</span>`;
			return `<button class="uk-lv uk-tap ${state}" data-a="lv:${i}" data-s="${L.season}">
				<span class="no">${node}</span>
				<span class="cd"><span class="tx"><small>${i + 1}. bölüm${L.finale ? ' · son' : ''}</small><b>${L.title}</b></span>${right}</span></button>`;
		};
		this.$('.uk-list').innerHTML = groups
			.map((g) => {
				const S = SEASON[g.s] || { name: g.s, sub: '', icon: ICON.sun };
				const got = g.items.reduce((a, i) => a + (stars[i] || 0), 0);
				const open = g.items[0] <= prog.unlocked;
				return `<section class="uk-ssn${open ? '' : ' lock'}" data-s="${g.s}">
					<header><i class="ic">${S.icon}</i><span class="nm"><b>${S.name}</b><span>${S.sub}</span></span><em>${ICON.star}${got}/${g.items.length * 3}</em></header>
					${g.items.map(cardHtml).join('')}</section>`;
			})
			.join('');
		this.$('.dsum').textContent = String(prog.dust || 0);
		// sıradaki bölüm görünür olsun (liste ekrana sığmıyorsa)
		const list = this.$('.uk-list');
		const c = list.querySelector('.uk-lv.cur');
		if (c && list.scrollHeight > list.clientHeight + 4) list.scrollTop = Math.max(0, c.offsetTop - list.clientHeight * 0.45);
	}

	/** Sayıyı sıfırdan yuvarlayarak yaz (bitiş ekranları). */
	_roll(el, to, delay, fmt) {
		const job = { t: 0, r: 0 };
		this._rolls.push(job);
		if (!to || reducedMotion()) {
			el.textContent = fmt(to || 0);
			return;
		}
		el.textContent = fmt(0);
		job.t = setTimeout(() => {
			const t0 = performance.now();
			let last = -1;
			const step = (now) => {
				const k = Math.min(1, (now - t0) / 1000);
				const v = Math.round(to * (1 - Math.pow(1 - k, 3)));
				if (v !== last) {
					last = v;
					el.textContent = fmt(v);
				}
				if (k < 1) job.r = requestAnimationFrame(step);
				else el.parentNode.classList.add('done');
			};
			job.r = requestAnimationFrame(step);
		}, delay);
	}

	_stopRolls() {
		for (const j of this._rolls) {
			clearTimeout(j.t);
			cancelAnimationFrame(j.r);
		}
		this._rolls.length = 0;
	}

	showComplete({ title, kicker, stars, dust, last }) {
		this.card(null);
		this._stopRolls();
		this.$('.ck').textContent = kicker;
		this.$('.ct').textContent = title;
		this.$('.cs2').textContent = last ? 'Son bölüm' : '';
		this.$('.cs2').style.display = last ? '' : 'none';
		const n = stars.filter(Boolean).length;
		this.$('.ban').textContent = n === 3 ? 'Kusursuz gölge!' : 'Gölge korundu';
		this._starT && this._starT.forEach(clearTimeout);
		this._starT = [];
		['.s0', '.s1', '.s2'].forEach((q, i) => {
			const e = this.$(q);
			e.classList.remove('on');
			if (stars[i]) this._starT.push(setTimeout(() => e.classList.add('on'), 450 + i * 300));
		});
		const d = this.$('.cd');
		d.classList.remove('done');
		d.style.display = dust ? '' : 'none';
		this._roll(this.$('.cdn'), dust, 450 + 3 * 300, (v) => `+${v}`);
		this.$('[data-s=complete] [data-a=next]').style.display = last ? 'none' : '';
		this.show('complete');
	}

	showFail({ progress, mercy }) {
		this.card(null);
		const p = Math.round(Math.min(1, Math.max(0, progress)) * 100);
		this.$('.fs').innerHTML = p >= 2 ? `Yolun <b>%${p}’${accOf(p)}</b> yürüdün. Biraz daha!` : 'Güneşi gövdenin arkasında tut.';
		const fp = this.$('.fp');
		const fz = this.$('.fz');
		// önce sıfırla, sonra animasyonla dolsun
		fp.style.transition = fz.style.transition = 'none';
		fp.style.transform = 'scaleX(0)';
		fz.style.transform = 'translateX(0%)';
		void fp.offsetWidth;
		fp.style.transition = fz.style.transition = '';
		fp.style.transform = `scaleX(${p / 100})`;
		fz.style.transform = `translateX(${p}%)`;
		this.$('.fm').style.display = mercy ? '' : 'none';
		this.show('fail');
	}

	showEnding(dustTotal) {
		this.card(null);
		this._stopRolls();
		const d = this.$('.ed');
		d.classList.remove('done');
		d.style.display = dustTotal ? '' : 'none';
		this._roll(this.$('.edn'), dustTotal, 900, (v) => `${v}`);
		this.show('ending');
	}

	setToggles(v) {
		const set = (k, txt, on) => {
			const b = this.$(`[data-t=${k}] b`);
			if (b) {
				b.textContent = txt;
				b.parentNode.classList.toggle('off', !on);
			}
		};
		set('sound', v.sound ? 'Açık' : 'Kapalı', v.sound);
		set('haptics', v.haptics ? 'Açık' : 'Kapalı', v.haptics);
		set('quality', { auto: 'Otomatik', 0: 'Düşük', 1: 'Orta', 2: 'Yüksek' }[v.quality] || 'Otomatik', true);
		set('power', { auto: 'Otomatik', saver: 'Tasarruf', performance: 'Performans' }[v.power] || 'Otomatik', true);
	}

	setPlayLabel(txt) {
		this.$('[data-a=play] b').textContent = txt;
	}
}
