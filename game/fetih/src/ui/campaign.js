// Sefer ekranı: bölge bölge sahneler, bölge komutanı (patron), yıldızlar, kilitler ve sahne ayrıntı sayfası.
// Veri app.campaign'dan gelir (src/game/campaign.js); başlatma ui.startCampaign(id) ile maça bağlanır.

import { esc, ico, avatar, regionMap } from './art.js';
import { MODES } from '../game/match.js';
import { STAR_RULES, REGION_ORDER } from '../game/campaign.js';
import { ALL_ITEMS, botLook } from '../game/commanders.js';

const COLORS = { ege: '#2fb6a5', marmara: '#e8693a', akdeniz: '#f2a51a', icanadolu: '#c98a3c', karadeniz: '#33b86b', guneydogu: '#d8503f', dogu: '#7a8fe8', all: '#ffd25a' };
const STAR = 'M12 2.8l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.4l-5.4 2.9 1.2-6L3.3 9.1l6.1-.7z';
const stars = (n, max = 3) => `<span class="sr">${Array.from({ length: max }, (_, k) => `<i class="${k < n ? 'on' : ''}"><svg viewBox="0 0 24 24"><path d="${STAR}"/></svg></i>`).join('')}</span>`;

/** Rakibin portresi: kostümü arayüz portresine, rengi bölgeye bağlar. */
function face(opp, color) {
	const L = botLook(opp) || { kind: 'kalpak', banner: 'duz', skin: 0 };
	return `<span class="fl-av" style="border-color:${color}">${avatar({ kind: L.kind, banner: L.banner, skin: L.skin, color })}</span>`;
}

export function showCampaign(ui) {
	const el = ui.$.camp;
	const camp = ui.app.campaign;
	const prog = ui.app.progress;

	const lockWhy = (r) => {
		if (r.key === 'all') return 'Bütün bölge komutanlarını yen';
		const prev = REGION_ORDER[REGION_ORDER.indexOf(r.key) - 1];
		if (prev && !camp.regionCleared(prev)) return `Önce ${camp.regionName(prev)} komutanını yen`;
		return `${r.needStars} yıldız gerekli (sende ${camp.totalStars()})`;
	};

	const draw = () => {
		const regs = camp.regions();
		const next = camp.next();
		const total = camp.totalStars();
		const body = regs
			.map((r) => {
				const col = COLORS[r.key] || '#4a8cff';
				const boss = r.boss;
				const nodes = r.stages
					.map((s) => {
						const cls = ['nd', s.boss ? 'boss' : '', !s.unlocked ? 'lock' : '', s.id === next ? 'cur' : '', s.stars ? 'won' : ''].filter(Boolean).join(' ');
						const inner = !s.unlocked ? ico('shield', { w: 2.8, c: '#9fb0d6' }) : s.boss ? ico('crown', { w: 2.6, c: '#4a2800' }) : `<b>${s.n}</b>`;
						return `<button class="${cls}" data-s="${s.id}" aria-label="${esc(s.name)}"><span class="cc">${inner}</span>${stars(s.stars)}<small>${esc(s.name)}</small></button>`;
					})
					.join('<i class="cn"></i>');
				const why = !r.unlocked ? `<div class="why">${ico('shield', { w: 2.8, c: '#ffd25a' })}<span>${esc(lockWhy(r))}</span></div>` : '';
				return `<section class="rg ${r.unlocked ? '' : 'lock'} ${r.cleared ? 'done' : ''}" data-r="${r.key}" style="--rc:${col}">
					<header><span class="mp">${r.key === 'all' ? regionMap('all', ui.vb) : regionMap(r.key, ui.vb)}</span>
						<div class="nm"><b>${esc(r.name)}</b>${r.cleared ? `<em>${ico('crown', { w: 2.6, c: '#4a2800' })}Fethedildi</em>` : `<small>Komutan: ${esc(boss?.name || '')}</small>`}</div>
						<div class="bs">${boss ? face(boss, col) : ''}<span class="st">${ico('star', { w: 2.6, c: '#ffd25a' })}<b>${r.stars}/${r.maxStars}</b></span></div></header>
					${why}
					<div class="nodes">${nodes}</div>
				</section>`;
			})
			.join('');
		el.innerHTML = `<div class="fl-ctop"><button class="fl-ib" data-a="back" aria-label="Geri">${ico('back', { w: 3 })}</button><h2>SEFER</h2>
				<span class="chip">${ico('star', { w: 2.6, c: '#ffd25a' })}<b>${total}</b><small>/ ${camp.maxStars()}</small></span>
				<span class="chip g">${ico('coin', { w: 2.4, c: '#ffd25a' })}<b>${prog.gold.toLocaleString('tr-TR')}</b></span></div>
			<div class="fl-cbody" data-r="body">${body}</div>
			<div class="fl-sheet" data-r="sheet"></div>`;
	};

	const openSheet = (id) => {
		const st = camp.stage(id);
		const sh = camp.status(id);
		const col = COLORS[st.region] || '#4a8cff';
		const rewards = ALL_ITEMS.filter((it) => it.unlock?.campaign === st.region);
		const opp = st.opp
			.map(
				(o) => `<div class="op ${o.boss ? 'boss' : ''}">${face(o, col)}<div><b>${esc(o.name)}${o.boss ? `<em>KOMUTAN</em>` : o.ally ? '<em class="al">TAKIM</em>' : ''}</b><small>${esc(o.title)}</small><q>${esc(o.quote)}</q></div></div>`,
			)
			.join('');
		const sheet = el.querySelector('[data-r=sheet]');
		sheet.innerHTML = `<div class="box" style="--rc:${col}">
			<div class="hd"><div><small>${esc(camp.regionName(st.region))} · ${st.boss ? 'KOMUTAN SAHNESİ' : 'SAHNE ' + st.n}</small><h3>${esc(st.name)}</h3></div>${stars(sh.stars)}</div>
			<div class="meta"><span>${ico('users', { w: 2.4 })}${esc(MODES[st.mode]?.label || st.mode)}</span><span>${ico(st.length === 'long' ? 'hourglass' : 'bolt', { w: 2.4 })}${st.length === 'long' ? 'Uzun' : 'Hızlı'}</span>${
				st.perks?.startProvinces ? `<span class="pk">${ico('flag', { w: 2.4 })}Rakip +${st.perks.startProvinces} il önde</span>` : ''
			}</div>
			<div class="ops">${opp}</div>
			<ul class="rules">${STAR_RULES.map((t, k) => `<li class="${k < sh.stars ? 'ok' : ''}">${ico(k < sh.stars ? 'check' : 'star', { w: 3 })}<span>${esc(t)}</span><i>${'★'.repeat(k + 1)}</i></li>`).join('')}</ul>
			${rewards.length && st.boss ? `<div class="rw">${ico('crown', { w: 2.6, c: '#4a2800' })}<span>Ödül: <b>${rewards.map((r) => esc(r.name)).join(', ')}</b></span></div>` : ''}
			<div class="bt"><button class="fl-btn navy" data-a="close">${ico('back', { w: 2.8 })}GERİ</button><button class="fl-btn big green" data-a="go" data-s="${id}">${ico('swords', { w: 2.8 })}BAŞLA</button></div>
		</div>`;
		sheet.classList.add('on');
		ui.sfx('tap');
	};

	draw();
	el.className = 'fl-scr fl-camp';
	// sıradaki sahnenin bölgesi görünür olsun
	const nxt = camp.next();
	if (nxt) {
		const reg = camp.stage(nxt)?.region;
		setTimeout(() => el.querySelector(`.rg[data-r="${reg}"]`)?.scrollIntoView({ block: 'center' }), 30);
	}
	el.onclick = (e) => {
		const b = e.target.closest('button');
		if (!b) return;
		if (b.dataset.a === 'back') {
			ui.sfx('tap');
			el.classList.add('off');
			ui.title(true);
			return;
		}
		if (b.dataset.a === 'close') {
			ui.sfx('tap');
			el.querySelector('[data-r=sheet]').classList.remove('on');
			return;
		}
		if (b.dataset.a === 'go') {
			ui.sfx('tap');
			el.onclick = null;
			ui.startCampaign(b.dataset.s);
			return;
		}
		if (b.dataset.s) {
			const sh = camp.status(b.dataset.s);
			if (!sh.unlocked) {
				ui.sfx('wrong');
				const st = camp.stage(b.dataset.s);
				const reg = camp.regions().find((r) => r.key === st.region);
				ui.toast(!reg.unlocked ? lockWhy(reg) : 'Önce önceki sahneyi geç', { tone: 'warn', icon: 'shield', ms: 2000 });
				return;
			}
			openSheet(b.dataset.s);
		}
	};
	// kapanan sayfaya dışarıdan dokunma
	el.onpointerdown = (e) => {
		const sh = el.querySelector('[data-r=sheet]');
		if (sh?.classList.contains('on') && e.target === sh) sh.classList.remove('on');
	};
}
