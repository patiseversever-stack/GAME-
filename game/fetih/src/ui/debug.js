// Ekran görüntüsü sahneleri (geliştirme): arayüzün her anını gerçek akışla kurar.
//   window.__fl.app.ui.debug({ show: 'q', type: 'choice', answer: 'right', reveal: true })
// show: title | menu | cmd | hud | banner | select | free | duel | q | wheel | fetih | rank | end
// q seçenekleri: type, cat, qid, duel (varsayılan: en yakın tipler herkese, diğerleri düello),
//   answer: 'right' | 'wrong' | 'partial' | 'drag', reveal: true, intro: true (düello girişiyle)
// Dönen Promise sahne kurulunca çözülür; görüntü zamanlaması için shot.mjs "wait" kullanılır.

import { Match } from '../game/match.js';
import { TYPES } from '../quiz/types.js';
import { QUESTIONS } from '../data/questions.js';
import { showCommander } from './menu.js';
import { duelIntro } from './duel.js';
import { sleep, setTimeout } from '../core/clock.js';


async function setup(ui, cfg = {}, { partial = false } = {}) {
	const app = ui.app;
	ui.fast = true;
	app.cinema.fast = true;
	app.resetBoard();
	const m = new Match(app, ui, { mode: 'ffa3', length: 'quick', region: 'ege', bot: 'er', seed: 11, ...cfg });
	app.match = m;
	for (const i of m.map) m.setOwner(i, -1, 0);
	await m.placeCapitals();
	if (partial) await m.expansionRound(1);
	else while (m.free().length) await m.expansionRound(1);
	ui.fast = false;
	app.cinema.fast = false;
	app.lowFps = false;
	app.cam.fit(app.boundsOf(m.map), { pitch: 0.98 });
	ui.hud(m);
	return m;
}

function attackOptions(m, p) {
	const set = new Set();
	for (const i of m.owned(p.i)) for (const j of m.neighbors(i)) if (m.owner(j) >= 0 && !m.ally(m.owner(j), p.i)) set.add(j);
	return [...set];
}

/** İnsan oyuncunun cevabını arayüz üstünden ver (gerçek dokunuş gibi). */
async function answer(ui, T, v, how) {
	const app = ui.app;
	const card = ui.$.q;
	const q = v.q;
	const type = q.type;
	if (type === 'choice' || type === 'tf') {
		const i = how === 'right' ? v.right : (v.right + 1) % (type === 'tf' ? 2 : 4);
		card.querySelector(`.fl-opt[data-i="${i}"]`)?.click();
	} else if (type === 'num') {
		const r = card.querySelector('.fl-range');
		const x = how === 'right' ? Math.round(q.ans + (q.max - q.min) * 0.03) : Math.round(q.ans + (q.max - q.min) * 0.22);
		r.value = String(Math.max(q.min, Math.min(q.max, x)));
		r.dispatchEvent(new Event('input'));
		if (how !== 'drag') card.querySelector('.fl-send')?.click();
	} else if (type === 'pin') {
		const t = v.target;
		const d = how === 'right' ? 0.8 : 5;
		app.onGround?.({ x: t.x + d, z: t.z - d * 0.6 });
		await sleep(250);
		if (how !== 'drag') card.querySelector('.fl-send')?.click();
	} else if (type === 'hang') {
		const word = [...new Set([...v.word].filter((c) => c !== ' '))];
		const keys = how === 'partial' ? [word[0], 'Ğ', word[1]] : how === 'right' ? word : ['Ğ', 'Q', 'X', 'W', 'Ç', 'Ö'];
		for (const k of keys) {
			card.querySelector(`.fl-key[data-k="${k}"]`)?.click();
			await sleep(60);
		}
	} else {
		// bilinmeyen tip: denetleyicinin değeri ya da null
		ui.current?.api.answer(ui.current.ctl.value?.() ?? null);
	}
}

export async function debugShot(ui, o = {}) {
	const app = ui.app;
	ui.reset();
	app.start?.();
	const show = o.show || 'title';
	if (show === 'title') {
		app.resetBoard();
		app.cam.fit(app.boundsOf(app.board.provinces.map((p) => p.index)), { pitch: 0.9 });
		ui.title(true);
		return 'ok';
	}
	if (show === 'menu') {
		ui.showMenu();
		return 'ok';
	}
	if (show === 'cmd') {
		showCommander(ui, () => ui.title(true));
		return 'ok';
	}
	const m = await setup(ui, o.cfg || {}, { partial: show === 'free' });
	const p = m.players[0];
	const d = m.players[1];
	if (show === 'hud') {
		m.turn = o.turn ?? 0;
		ui.hud(m);
		if (o.toast !== false) ui.toast(`${d.name} Manisa'yı fethetti!`, { p: d });
		await sleep(200);
		const own = m.owned(p.i);
		if (own.length) m.setOwner(own[own.length - 1], p.i, 400);
		return 'ok';
	}
	if (show === 'banner') {
		ui.banner(o.title || 'FETİH', o.sub ?? 'Tur 1 / 3', { tone: o.tone ?? 'red' });
		return 'ok';
	}
	if (show === 'select' || show === 'free') {
		let options;
		let text;
		if (show === 'select') {
			options = attackOptions(m, p);
			text = 'Saldıracağın ili seç';
		} else {
			const free = m.free();
			const adj = free.filter((i) => m.neighbors(i).some((j) => m.owner(j) === p.i));
			options = adj.length ? adj : free;
			text = 'Bir il seç';
		}
		ui.pickProvince(m, options, text);
		if (o.bad) {
			await sleep(700);
			const own = m.owned(p.i)[0];
			const pt = app.toScreen(app.board.topAt(own, new app.V3()), {});
			const r = app.canvas.getBoundingClientRect();
			app.onTap?.(own, pt.x + r.left, pt.y + r.top);
		}
		return options.length;
	}
	if (show === 'duel') {
		const target = o.siege ? d.capital : m.owned(d.i).find((i) => i !== d.capital) ?? d.capital;
		const t = app.board.provinces[target];
		app.cam.focus(t.x, t.z + 1.5, { dist: 26, pitch: 0.8 });
		const q = m.pick({ cat: o.cat || 'tarih', types: [o.type || 'choice'] });
		duelIntro(ui, { attacker: p, defender: d, target, cat: q.cat, q, T: TYPES[q.type], title: o.siege ? 'KUŞATMA' : 'DÜELLO' });
		return 'ok';
	}
	if (show === 'wheel') {
		const sp = o.human ? p : d;
		ui.wheel(m, sp);
		if (o.human && o.tap !== false) {
			await sleep(o.tapAt ?? 700);
			ui.$.wheel.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		}
		return 'ok';
	}
	if (show === 'fetih') {
		ui.chooseCategory(m);
		return 'ok';
	}
	if (show === 'rank') {
		const order = m.players.map((x) => ({ p: x, i: x.i, name: x.name, color: x.css }));
		ui.ranking(m, order, [2, 1, 0, 0]);
		return 'ok';
	}
	if (show === 'end') {
		if (o.lose) p.score = Math.round(d.score * 0.6);
		else p.score = Math.max(...m.players.map((x) => x.score)) + 600;
		if (m.players[2] && o.dead) m.players[2].alive = false;
		m.stat[p.i] = { q: o.q ?? 12, correct: o.correct ?? 9 };
		const ranking = m.standings();
		// gerçek ödül kaydı (ilerleme ve sefer): o.cfg.campaign ile sefer sahnesi
		const rewards = m.finish(ranking);
		ui.end(m, ranking, rewards);
		return 'ok';
	}
	if (show === 'q') {
		// gerçek akış: m.ask → bot jokerleri, saat, joker düğmeleri, açıklama (insan cevabı o.answer ile verilir)
		const q = o.qid ? QUESTIONS.find((x) => x.id === o.qid) : m.pick({ cat: o.cat, types: [o.type || 'choice'] });
		const T = TYPES[q.type];
		const duel = o.duel ?? T.kind !== 'closest';
		const who = duel ? [p, d] : m.players.filter((x) => x.alive);
		const target = o.siege ? d.capital : m.owned(d.i).find((i) => i !== d.capital) ?? d.capital;
		const ctx = duel
			? { attacker: p, defender: d, target, cat: q.cat, title: o.tie ? 'EŞİTLİK BOZMA' : o.siege ? 'KUŞATMA' : 'DÜELLO', noIntro: !o.intro, phase: 'duel' }
			: { title: 'Herkes cevaplıyor', phase: 'yayilma' };
		if (duel && !T.needsMap) {
			const t = app.board.provinces[target];
			app.board.fx(target, 0.35, 1);
			app.cam.focus(t.x, t.z + 1.5, { dist: 26, pitch: 0.8 });
		}
		// o.bots: botların joker hakkını sıfırla (görüntü kararlı olsun), o.botJokers: ['yari'] gibi zorla
		for (const x of m.players) if (!x.human && o.botJokers !== undefined) for (const id of Object.keys(x.jk)) x.jk[id].left = (o.botJokers || []).includes(id) ? 1 : 0;
		const run = m.ask(q, who, ctx);
		const v = m.cur.v;
		// o.use: [{id, at}] ya da ['yari']: insan oyuncu joker kullanır
		for (const u of o.use || []) {
			const id = u.id || u;
			setTimeout(() => m.useJoker(id), u.at ?? 1500);
		}
		if (o.answer) {
			await sleep(o.answerAt ?? (o.intro ? 2600 : 900));
			await answer(ui, T, v, o.answer);
		}
		if (o.reveal) await run;
		return q.id;
	}
	return 'bilinmeyen sahne';
}
