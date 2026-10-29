// Menüler: canlı başlık logosu, yeni maç (resimli mod kartları, süre, bölge haritaları, rakip seviyesi),
// komutan seçimi (ad, renk, sancak, portre) ve bitiş ekranı (kürsü, ödüller, tekrar oyna).

import { MODES } from '../game/match.js';
import { esc, ico, avatar, bannerSVG, AVATARS, BANNERS, regionMap } from './art.js';
import { sleep } from '../core/clock.js';

export const REGION_NAMES = { marmara: 'Marmara', ege: 'Ege', akdeniz: 'Akdeniz', icanadolu: 'İç Anadolu', karadeniz: 'Karadeniz', dogu: 'Doğu Anadolu', guneydogu: 'Güneydoğu', all: 'Tüm Türkiye', random: 'Rastgele' };
const REGION_ORDER = ['random', 'all', 'marmara', 'ege', 'akdeniz', 'icanadolu', 'karadeniz', 'dogu', 'guneydogu'];
const BOTS = [
	['caylak', 'Çaylak', 1],
	['er', 'Er', 2],
	['usta', 'Usta', 3],
	['efsane', 'Efsane', 4],
];
const MODE_INFO = {
	'1v1': ['Düello', 'Bire bir, en kısa savaş'],
	ffa3: ['Üç cephe', 'Herkes tek başına'],
	ffa4: ['Büyük savaş', 'Dört komutan'],
	team: ['Eşli', "2'ye 2 takım"],
};
const KINDS = ['gokturk', 'yeniceri', 'sultan', 'kalpak'];

export const EMBLEM = `<svg class="fl-emb" viewBox="0 0 200 200"><defs>
<linearGradient id="fle-bl" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#dfe6f2"/><stop offset="1" stop-color="#9aa8c0"/></linearGradient>
<linearGradient id="fle-sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6a4a"/><stop offset="1" stop-color="#a8231a"/></linearGradient>
<linearGradient id="fle-gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b8"/><stop offset=".5" stop-color="#ffc93a"/><stop offset="1" stop-color="#b07a12"/></linearGradient>
<g id="fle-sw"><path d="M100 2l7 15v133H93V17z" fill="url(#fle-bl)" stroke="#3a4a6a" stroke-width="3"/><path d="M100 14v132" stroke="#fff" stroke-width="2" opacity=".8"/>
<rect x="70" y="148" width="60" height="12" rx="6" fill="url(#fle-gd)" stroke="#6a3a04" stroke-width="3"/><rect x="95" y="160" width="10" height="26" rx="3" fill="#7a3a14" stroke="#3a1a04" stroke-width="2.5"/><circle cx="100" cy="190" r="8" fill="url(#fle-gd)" stroke="#6a3a04" stroke-width="3"/></g></defs>
<use href="#fle-sw" transform="rotate(-128 100 100) translate(100 100) scale(.95) translate(-100 -100)"/><use href="#fle-sw" transform="rotate(128 100 100) translate(100 100) scale(.95) translate(-100 -100)"/>
<path d="M100 34l56 18v46c0 38-26 62-56 74-30-12-56-36-56-74V52z" fill="url(#fle-sh)" stroke="url(#fle-gd)" stroke-width="9" stroke-linejoin="round"/>
<path d="M100 46l44 14v38c0 31-21 51-44 61-23-10-44-30-44-61V60z" fill="none" stroke="#fff" stroke-width="2.5" opacity=".5"/>
<path d="M72 138V96h9v9h9v-9h20v9h9v-9h9v42z" fill="#fff"/><path d="M93 138v-14a7 7 0 0 1 14 0v14z" fill="#a8231a"/>
<path d="M66 82q34-26 68 0" stroke="#fff" stroke-width="4" fill="none" opacity=".35" stroke-linecap="round"/>
<path d="M76 30l8-18 16 12 16-12 8 18z" fill="url(#fle-gd)" stroke="#6a3a04" stroke-width="3" stroke-linejoin="round"/></svg>`;

// ------------------------------------------------------------------ başlık

export function buildTitle(ui) {
	const t = ui.$.title;
	const letters = [...'FETİH'].map((c, k) => `<i style="--k:${k}">${c}</i>`).join('');
	t.innerHTML = `<div class="fl-logo">
			<div class="rays"></div>
			<div class="emb">${EMBLEM}</div>
			<div class="w1">${letters}</div>
			<div class="w2"><span>LİGİ</span><i class="sh"></i></div>
			<small>Bil, fethet, Türkiye'yi kazan!</small>
		</div>
		<div class="fl-tbtns">
			<button class="fl-btn big red fl-play" data-a="menu">${ico('swords', { w: 2.8 })}OYNA</button>
			<div class="row">
				<button class="fl-btn navy fl-cmdb" data-a="cmd"><span class="fl-av" data-r="tav"></span><span class="tx"><small>KOMUTAN</small><b data-r="tnm"></b></span></button>
				<button class="fl-btn navy" data-a="camp" ${ui.h.campaign ? '' : 'disabled'}>${ico('map', { w: 2.4 })}<span class="tx"><small>SEFER</small><b data-r="tcs">${ui.h.campaign ? 'Başla' : 'Yakında'}</b></span></button>
			</div>
		</div>
		<div class="fl-prof" data-r="prof"><span class="lv"><small>SEV</small><b data-r="plv">1</b></span><div class="xb"><u data-r="pxp"></u></div>
			<span class="gd"><span class="coin">${ico('coin', { w: 2.2, c: '#7a4a06' })}</span><b data-r="pgd">0</b></span></div>`;
	refreshTitle(ui);
}

export function refreshTitle(ui) {
	const t = ui.$.title;
	const L = ui.cmdLook();
	const av = t.querySelector('[data-r=tav]');
	if (av) {
		av.innerHTML = avatar(L);
		av.style.borderColor = L.color;
	}
	const nm = t.querySelector('[data-r=tnm]');
	if (nm) nm.textContent = ui.cmd.name;
	// ilerleme şeridi (seviye, XP, altın) ve sefer yıldızları
	const pg = ui.app.progress;
	if (pg) {
		const li = pg.levelInfo;
		const set = (r, v) => {
			const e = t.querySelector(`[data-r=${r}]`);
			if (e) e.textContent = v;
		};
		set('plv', li.level);
		set('pgd', pg.gold.toLocaleString('tr-TR'));
		const u = t.querySelector('[data-r=pxp]');
		if (u) u.style.transform = `scaleX(${li.max ? 1 : (li.into / li.need).toFixed(3)})`;
	}
	const cp = ui.app.campaign;
	if (cp) {
		const n = cp.totalStars();
		const e = t.querySelector('[data-r=tcs]');
		if (e) e.textContent = n ? `★ ${n} / ${cp.maxStars()}` : 'Başla';
	}
}

// ------------------------------------------------------------------ yeni maç

function modeArt(ui, key) {
	const cols = ui.app.playerColors.map((c) => '#' + c.toString(16).padStart(6, '0'));
	const head = (i, cls = '') => `<span class="fl-av h ${cls}" style="border-color:${cols[i]}">${avatar({ kind: KINDS[i], color: cols[i], skin: i, banner: 'duz' })}</span>`;
	const vs = '<b class="vs">VS</b>';
	if (key === '1v1') return `<div class="art a2">${head(0)}${vs}${head(1)}</div>`;
	if (key === 'ffa3') return `<div class="art a3">${head(0)}${head(1)}${head(2)}</div>`;
	if (key === 'ffa4') return `<div class="art a4">${head(0)}${head(1)}${head(2)}${head(3)}</div>`;
	return `<div class="art at"><span class="tm r">${head(0)}${head(2)}</span>${vs}<span class="tm b">${head(1)}${head(3)}</span></div>`;
}

export function showMenu(ui) {
	ui.$.title.classList.add('off');
	ui.$.hud.classList.add('off');
	const c = ui.cfg;
	const b = ui.app.board;
	const count = (k) => (k === 'all' ? b.count : k === 'random' ? 0 : b.region(k).length);
	const L = ui.cmdLook();
	const modes = Object.entries(MODES)
		.map(
			([k, m], i) => `<button class="fl-mode ${c.mode === k ? 'on' : ''}" data-k="mode" data-v="${k}" style="--k:${i}">${modeArt(ui, k)}
			<span class="lb"><b>${esc(m.label)}</b><small>${esc(MODE_INFO[k]?.[1] || '')}</small></span><i class="ck">${ico('check', { w: 3.4 })}</i></button>`,
		)
		.join('');
	const lens = [
		['quick', 'HIZLI', 'bölge ve çevresi', 'bolt'],
		['long', 'UZUN', '15–20 dk · tüm Türkiye', 'hourglass'],
	]
		.map(
			([k, t, s, icn]) => `<button class="fl-len ${c.length === k ? 'on' : ''}" data-k="length" data-v="${k}"><span class="li">${ico(icn, { w: 2.4 })}</span>
			<span class="lb"><b>${t}</b><small>${s}</small></span><i class="ck">${ico('check', { w: 3.4 })}</i></button>`,
		)
		.join('');
	const maps = REGION_ORDER.map(
		(k) => `<button class="fl-map ${c.region === k ? 'on' : ''} ${k === 'random' ? 'rnd' : ''}" data-k="region" data-v="${k}">
			${k === 'random' ? `<span class="mm-r">${regionMap('random', ui.vb)}<span class="dice">${ico('dice', { w: 2.2 })}</span></span>` : regionMap(k, ui.vb)}
			<b>${esc(REGION_NAMES[k])}</b><small>${k === 'random' ? 'sürpriz bölge' : k === 'all' ? count(k) + ' il' : 've çevresi'}</small><i class="ck">${ico('check', { w: 3.4 })}</i></button>`,
	).join('');
	const bots = BOTS.map(
		([k, t, n]) => `<button class="fl-bot ${c.bot === k ? 'on' : ''}" data-k="bot" data-v="${k}"><span class="st">${
			n === 4 ? ico('crown', { w: 2.2 }) : Array.from({ length: n }, () => ico('star', { w: 2 })).join('')
		}</span><b>${t}</b></button>`,
	).join('');
	ui.$.menu.className = 'fl-scr fl-menu';
	ui.$.menu.innerHTML = `<div class="fl-mtop">
			<button class="fl-ib" data-a="back" aria-label="Geri">${ico('back', { w: 3 })}</button>
			<h2>YENİ MAÇ</h2>
			<button class="fl-cmdchip" data-a="cmd"><span class="fl-av" style="border-color:${L.color}">${avatar(L)}</span><b>${esc(ui.cmd.name)}</b>${ico('edit', { w: 2.4 })}</button>
		</div>
		<div class="fl-mbody">
			<section class="s-mode"><h4>${ico('users', { w: 2.4 })}MAÇ TÜRÜ</h4><div class="fl-modes">${modes}</div></section>
			<section class="s-len"><h4>${ico('clock', { w: 2.4 })}SÜRE</h4><div class="fl-lens">${lens}</div></section>
			<section class="s-map"><h4>${ico('map', { w: 2.4 })}HARİTA</h4><div class="fl-maps">${maps}</div></section>
			<section class="s-bot"><h4>${ico('bot', { w: 2.4 })}RAKİPLER</h4><div class="fl-bots">${bots}</div></section>
		</div>
		<div class="fl-mfoot"><button class="fl-btn big red" data-go="1">${ico('swords', { w: 2.8 })}SAVAŞA BAŞLA</button></div>`;
	ui.$.menu.classList.remove('off');
	const set = (k, v) => {
		c[k] = v;
		for (const x of ui.$.menu.querySelectorAll(`[data-k="${k}"]`)) x.classList.toggle('on', x.dataset.v === v);
	};
	ui.$.menu.onclick = (e) => {
		const bt = e.target.closest('button');
		if (!bt) return;
		ui.sfx('tap');
		if (bt.dataset.k) {
			set(bt.dataset.k, bt.dataset.v);
			// uzun maç tüm Türkiye'de oynanır; tek bölge hızlıdır
			if (bt.dataset.k === 'length') set('region', bt.dataset.v === 'long' ? 'all' : c.region === 'all' ? 'random' : c.region);
			if (bt.dataset.k === 'region') set('length', bt.dataset.v === 'all' ? 'long' : 'quick');
			ui.saveCfg();
		}
		if (bt.dataset.a === 'back') {
			ui.$.menu.classList.add('off');
			ui.title(true);
		}
		if (bt.dataset.a === 'cmd') showCommander(ui, () => showMenu(ui));
		if (bt.dataset.go) {
			ui.$.menu.classList.add('off');
			const regions = ['ege', 'marmara', 'karadeniz', 'akdeniz', 'icanadolu', 'dogu', 'guneydogu'];
			const region = c.region === 'random' ? regions[Math.floor(Math.random() * regions.length)] : c.region;
			ui.startMatch({ ...c, region });
		}
	};
}

// ------------------------------------------------------------------ komutan

export function showCommander(ui, back) {
	const el = ui.$.cmd;
	const cm = { ...ui.cmd };
	const cols = ui.app.playerColors.map((c) => '#' + c.toString(16).padStart(6, '0'));
	const draw = () => {
		const L = { kind: cm.avatar, banner: cm.banner, color: cols[cm.color] || cols[0], skin: cm.skin ?? 0 };
		el.querySelector('[data-r=prev]').innerHTML = `<span class="flag">${bannerSVG(L.banner, L.color)}</span><span class="fl-av" style="border-color:${L.color}">${avatar(L)}</span>`;
		el.querySelector('[data-r=kind]').textContent = AVATARS.find((a) => a.id === cm.avatar)?.name || '';
		for (const b of el.querySelectorAll('[data-av]')) {
			b.classList.toggle('on', b.dataset.av === cm.avatar);
			b.querySelector('.fl-av').innerHTML = avatar({ ...L, kind: b.dataset.av });
		}
		for (const b of el.querySelectorAll('[data-co]')) b.classList.toggle('on', Number(b.dataset.co) === cm.color);
		for (const b of el.querySelectorAll('[data-bn]')) {
			b.classList.toggle('on', b.dataset.bn === cm.banner);
			b.innerHTML = bannerSVG(b.dataset.bn, L.color, { pole: false });
		}
		for (const b of el.querySelectorAll('[data-sk]')) b.classList.toggle('on', Number(b.dataset.sk) === (cm.skin ?? 0));
	};
	el.className = 'fl-scr fl-cmd';
	el.innerHTML = `<div class="fl-cbox">
		<div class="hd"><button class="fl-ib" data-a="x" aria-label="Kapat">${ico('back', { w: 3 })}</button><h2>KOMUTANIN</h2></div>
		<div class="top"><div class="pv" data-r="prev"></div>
			<div class="nmf"><label>KOMUTAN ADI</label><input data-r="name" maxlength="12" value="${esc(cm.name)}" autocomplete="off" spellcheck="false" enterkeyhint="done"><small data-r="kind"></small>
			<div class="sk">${[0, 1, 2, 3].map((k) => `<button data-sk="${k}" class="s${k}" aria-label="Ten ${k + 1}"></button>`).join('')}</div></div></div>
		<div class="sc"><h4>PORTRE</h4><div class="avs">${AVATARS.map((a) => `<button data-av="${a.id}" title="${esc(a.name)}"><span class="fl-av"></span></button>`).join('')}</div>
		<h4>RENK</h4><div class="cos">${cols.map((c, i) => `<button data-co="${i}" style="--c:${c}" aria-label="Renk ${i + 1}"></button>`).join('')}</div>
		<h4>SANCAK</h4><div class="bns">${BANNERS.map((b) => `<button data-bn="${b.id}" title="${esc(b.name)}"></button>`).join('')}</div></div>
		<button class="fl-btn big green" data-a="ok">${ico('check', { w: 3 })}TAMAM</button>
	</div>`;
	draw();
	el.classList.remove('off');
	const inp = el.querySelector('[data-r=name]');
	const close = (save) => {
		if (save) {
			cm.name = (inp.value || '').trim().slice(0, 12) || 'Sen';
			ui.setCommander(cm);
		}
		inp.blur();
		el.classList.add('off');
		el.onclick = null;
		back?.();
	};
	inp.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') inp.blur();
	});
	el.onclick = (e) => {
		const b = e.target.closest('button');
		if (!b) return;
		ui.sfx('tap');
		if (b.dataset.av) cm.avatar = b.dataset.av;
		if (b.dataset.co) cm.color = Number(b.dataset.co);
		if (b.dataset.bn) cm.banner = b.dataset.bn;
		if (b.dataset.sk) cm.skin = Number(b.dataset.sk);
		if (b.dataset.a === 'ok') return close(true);
		if (b.dataset.a === 'x') return close(false);
		draw();
	};
}

// ------------------------------------------------------------------ bitiş (ayrı dosyada)

export { showEnd } from './endscreen.js';
