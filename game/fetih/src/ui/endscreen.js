// Bitiş ekranı: kürsü, sefer yıldızları, ödül dökümü (XP, altın, seviye), açılanlar ve ödüllü reklam kancası.
// rw: Match.finish() çıktısı { won, stars, xp, gold, progress:{lines, levelUps, level…}, campaign:{stars, unlocked, regions, items…} };
// yoksa (hata ayıklama sahnesi) basit yedek ödül gösterilir. Dönen değer: 'menu' | 'again' | 'next' | 'camp'.

import { esc, ico, avatar } from './art.js';
import { levelOf } from '../game/progress.js';
import { STAR_RULES, REGION_NAMES } from '../game/campaign.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => Math.round(n).toLocaleString('tr-TR');
const STAR = 'M12 2.8l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.4l-5.4 2.9 1.2-6L3.3 9.1l6.1-.7z';

export async function showEnd(ui, m, ranking, rw = null) {
	const el = ui.$.end;
	const team = !!m.mode.teams;
	const me = m.players.find((p) => p.human);
	const place = team ? ranking.findIndex((t) => t.players.includes(me)) : ranking.indexOf(me);
	const won = place === 0;
	const prog = ui.app.progress;
	const camp = rw?.campaign || null;
	const entry = (r) => {
		if (team)
			return {
				name: r.players.map((p) => p.name).join(' & '),
				score: r.score,
				color: r.players[0].css,
				heads: r.players.map((p) => `<span class="fl-av" style="border-color:${p.css}">${avatar(ui.look(p))}</span>`).join(''),
				me: r.players.includes(me),
			};
		return { name: r.name, score: r.score, color: r.css, heads: `<span class="fl-av" style="border-color:${r.css}">${avatar(ui.look(r))}</span>`, me: !!r.human };
	};
	const E = ranking.map(entry);
	const order = E.length >= 3 ? [1, 0, 2] : E.length === 2 ? [1, 0] : [0];
	const podium = order
		.filter((k) => E[k])
		.map((k) => {
			const e = E[k];
			return `<div class="pd p${k + 1} ${e.me ? 'me' : ''}" style="--c:${e.color};--k:${k}">
				<div class="who">${k === 0 ? `<span class="crown">${ico('crown', { w: 2.4, c: '#7a4a06' })}</span>` : ''}<div class="hs">${e.heads}</div>
				<b>${esc(e.name)}</b><em>${fmt(e.score)}</em></div>
				<div class="ped"><span>${k + 1}</span></div></div>`;
		})
		.join('');
	const rest = E.slice(3)
		.map((e, j) => `<div class="rr ${e.me ? 'me' : ''}"><span class="n">${j + 4}</span>${e.heads}<b>${esc(e.name)}</b><em>${fmt(e.score)}</em></div>`)
		.join('');
	const owned = me ? m.owned(me.i).length : 0;

	// ---- ödül verisi (ilerleme maçtan önce kaydedildi; çubuk önceki XP'den başlar)
	const pr = rw?.progress || null;
	let xp0;
	let xpGain;
	let goldGain;
	let lines = [];
	let ups = [];
	if (pr) {
		xpGain = pr.xp;
		ups = pr.levelUps || [];
		goldGain = pr.gold + ups.reduce((a, u) => a + (u.gold || 0), 0);
		lines = pr.lines || [];
		xp0 = Math.max(0, prog.xp - pr.xp);
	} else {
		// hata ayıklama sahnesi: kayıt yok, yer tutucu ödül
		xpGain = Math.round((me?.score || 0) / 25) + (won ? 120 : 40) + owned * 5;
		goldGain = (won ? 60 : 15) + owned * 2;
		xp0 = prog ? prog.xp : 0;
		lines = [{ label: won ? 'Zafer' : 'Katılım', xp: xpGain, gold: goldGain }];
	}
	const L0 = levelOf(xp0);
	const frac = (x) => {
		const l = levelOf(x);
		return l.max ? 1 : l.into / l.need;
	};
	const title = won ? 'ZAFER!' : place === 1 ? 'İKİNCİ!' : 'MAÇ BİTTİ';
	const sub = me ? `${place + 1}. oldun · ${owned} il · ${fmt(me.score)} puan` : 'Maç sona erdi';

	// ---- sefer bloğu
	let campHTML = '';
	if (camp) {
		const st = ui.app.campaign.stage(m.stageDef?.id);
		const notes = [];
		if (camp.boss && camp.firstClear) notes.push(`<span class="nt gold">${ico('crown', { w: 2.6, c: '#4a2800' })}Bölge komutanı yenildi!</span>`);
		for (const k of camp.regions || []) notes.push(`<span class="nt">${ico('map', { w: 2.6 })}Yeni bölge: ${esc(REGION_NAMES[k] || k)}</span>`);
		const stageNames = (camp.unlocked || []).filter((id) => !(camp.regions || []).length || !/-1$/.test(id)).map((id) => ui.app.campaign.stage(id)?.name).filter(Boolean);
		for (const n of stageNames.slice(0, 2)) notes.push(`<span class="nt">${ico('flag', { w: 2.6 })}Yeni sahne: ${esc(n)}</span>`);
		for (const it of camp.items || []) notes.push(`<span class="nt gold">${ico('star', { w: 2.6, c: '#4a2800' })}Yeni ödül: ${esc(it.name)}</span>`);
		campHTML = `<div class="fl-cres">
			<div class="cs-h"><small>${esc(ui.app.campaign.regionName(st?.region))} · SEFER</small><b>${esc(st?.name || '')}</b></div>
			<div class="cs-stars">${[0, 1, 2]
				.map((k) => `<span class="sx ${k < camp.stars ? 'on' : ''}" style="--k:${k}"><svg viewBox="0 0 24 24"><path d="${STAR}"/></svg></span>`)
				.join('')}</div>
			<ul class="cs-rules">${STAR_RULES.map((t, k) => `<li class="${k < camp.stars ? 'ok' : ''}">${ico(k < camp.stars ? 'check' : 'star', { w: 3 })}<span>${esc(t)}</span></li>`).join('')}</ul>
			${notes.length ? `<div class="cs-notes">${notes.join('')}</div>` : ''}
		</div>`;
	}

	const lineHTML = lines
		.slice(0, 6)
		.map(
			(l, k) =>
				`<div class="ln" style="--k:${k}"><span>${esc(l.label)}</span>${l.xp ? `<b class="x">+${fmt(l.xp)} XP</b>` : ''}${l.gold ? `<b class="g">+${fmt(l.gold)}</b>` : ''}</div>`,
		)
		.join('');

	let primary = ['again', ico('replay', { w: 2.8 }), 'TEKRAR OYNA', 'green'];
	let secondary = ['menu', ico('home', { w: 2.6 }), 'MENÜ'];
	if (camp) {
		const nextId = ui.app.campaign.next();
		secondary = ['camp', ico('map', { w: 2.6 }), 'SEFER'];
		if (won && nextId) primary = ['next', ico('arrow', { w: 3 }), 'SONRAKİ SAHNE', 'green'];
		else if (won) primary = ['camp', ico('map', { w: 2.8 }), 'SEFER HARİTASI', 'green'];
		else primary = ['again', ico('replay', { w: 2.8 }), 'TEKRAR DENE', 'red'];
	}
	el.className = `fl-scr fl-end ${won ? 'win' : 'lose'}${camp ? ' camp' : ''}`;
	el.innerHTML = `<div class="fl-ein">
		<div class="hdr"><div class="rays"></div><b>${title}</b><span>${esc(sub)}</span></div>
		<div class="fl-podium n${Math.min(3, E.length)}">${podium}</div>
		${rest ? `<div class="fl-rest">${rest}</div>` : ''}
		<div class="fl-rewbox">
			${campHTML}
			<div class="fl-rew">
				<div class="xp"><span class="lv"><small>SEVİYE</small><b data-r="lv">${L0.level}</b></span><div class="bar"><u data-r="xpb" style="transform:scaleX(${frac(xp0).toFixed(3)})"></u><span><b data-r="xpn">+0</b> XP</span></div></div>
				<div class="gd"><span class="coin">${ico('coin', { w: 2.2, c: '#7a4a06' })}</span><b data-r="gd">+0</b><small>ALTIN</small></div>
			</div>
			<div class="fl-lines" data-r="lines">${lineHTML}</div>
			<div class="fl-lvups" data-r="ups"></div>
			${pr ? `<button class="fl-btn gold fl-adbtn" data-x="ad">${ico('bolt', { w: 2.6, c: '#4a2800' })}<span>REKLAM İZLE · ÖDÜL ×2</span></button>` : ''}
		</div>
		<div class="btns"><button class="fl-btn navy" data-x="${secondary[0]}">${secondary[1]}${secondary[2]}</button><button class="fl-btn big ${primary[3]}" data-x="${primary[0]}">${primary[1]}${primary[2]}</button></div>
	</div>`;
	el.classList.remove('off');
	ui.sfx(won ? 'win' : 'lose');
	if (won) setTimeout(() => ui.fx.confetti(innerWidth, { n: 60, life: 3000 }), 350);
	const q = (s) => el.querySelector(s);

	// ---- sayaçlar ve seviye çubuğu
	const levelUp = (u) => {
		const unl = (u.unlocks || []).map((x) => esc(x.name)).join(', ');
		const j = u.joker ? ` · ${esc({ yari: 'Yarı Yarıya', sure: 'Ekstra Süre', kalkan: 'Kalkan', ikinci: 'İkinci Şans', sabotaj: 'Sabotaj', kahin: 'Seyirci' }[u.joker] || u.joker)} jokeri` : '';
		q('[data-r=ups]').insertAdjacentHTML('beforeend', `<div class="up">${ico('crown', { w: 2.6, c: '#4a2800' })}<b>SEVİYE ${u.level}!</b><span>+${u.gold} altın${j}${unl ? ' · ' + unl : ''}</span></div>`);
	};
	const animate = (from, to, ms = 1100) => {
		const bar = q('[data-r=xpb]');
		const lv = q('[data-r=lv]');
		let last = levelOf(from).level;
		ui.fx.tween(ms, (k) => {
			const e = 1 - Math.pow(1 - k, 3);
			const x = from + (to - from) * e;
			bar.style.transform = `scaleX(${frac(x).toFixed(3)})`;
			const l = levelOf(x).level;
			if (l !== last) {
				last = l;
				lv.textContent = String(l);
				lv.parentElement.classList.remove('up');
				void lv.offsetWidth;
				lv.parentElement.classList.add('up');
				ui.sfx('levelup');
			}
		});
	};
	const counters = { xp: xpGain, gold: goldGain };
	setTimeout(() => {
		ui.fx.count(q('[data-r=xpn]'), 0, counters.xp, 900, (x) => '+' + fmt(x));
		ui.fx.count(q('[data-r=gd]'), 0, counters.gold, 900, (x) => '+' + fmt(x));
		animate(xp0, xp0 + xpGain);
		ui.sfx('coin');
		ups.forEach((u, k) => setTimeout(() => levelUp(u), 700 + k * 450));
	}, 900);

	// ---- düğmeler (reklam: yerinde kalır, ekran kapanmaz)
	let adBusy = false;
	const act = await new Promise((res) => {
		el.onclick = async (e) => {
			const b = e.target.closest('[data-x]');
			if (!b) return;
			if (b.dataset.x !== 'ad') return res(b.dataset.x);
			if (adBusy || !prog || !pr) return;
			adBusy = true;
			ui.sfx('tap');
			const r = await prog.watchAd('maç_ikiye_katla');
			if (!r.ok) {
				adBusy = false;
				ui.toast(r.reason || 'Reklam gösterilemedi', { tone: 'warn', icon: 'cross' });
				return;
			}
			// ödül ikiye katlanır: aynı XP ve altın bir kez daha eklenir
			const before = prog.xp;
			const more = prog.addXp(pr.xp);
			prog.addGold(pr.gold);
			counters.xp += pr.xp;
			counters.gold += pr.gold + more.reduce((a, u) => a + (u.gold || 0), 0);
			ui.fx.count(q('[data-r=xpn]'), xpGain, counters.xp, 700, (x) => '+' + fmt(x));
			ui.fx.count(q('[data-r=gd]'), goldGain, counters.gold, 700, (x) => '+' + fmt(x));
			animate(before, prog.xp, 800);
			more.forEach((u) => levelUp(u));
			b.classList.add('done');
			b.querySelector('span').textContent = 'ÖDÜL İKİYE KATLANDI';
			b.disabled = true;
			ui.sfx('coin');
			if (r.simulated) ui.toast('Deneme: reklam SDK’sı bağlı değil, ödül doğrudan verildi', { tone: 'info', icon: 'bolt', ms: 2600 });
		};
	});
	ui.sfx('tap');
	el.onclick = null;
	el.classList.add('off');
	await sleep(50);
	return act;
}
