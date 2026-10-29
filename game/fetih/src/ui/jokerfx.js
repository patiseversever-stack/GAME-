// Joker arayüzü: soru kartındaki düğme çubuğu, etkilerin çizimi (elenen şıklar, seyirci oyları, daralan aralık,
// harita ipucu), botların joker rozetleri ve sabotaj perdesi. Yalnızca transform ve opacity canlanır.
//
// Sözleşme (Match çağırır, hepsi isteğe bağlı):
//   ui.jokers(list, cb)      list = Match.jokerList() [{id,name,short,color,icon,count,usable,why,armed,na}]; cb(id) → {ok, reason}
//   ui.jokerUsed(p, id, effect, cur)   bir oyuncu joker kullandı (insan: etki çizilir)
//   ui.sabotage(effect, cur)           insan oyuncuya sabotaj ulaştı
// Soru kartı tipi etkiyi kendisi uygulamak isterse `ctl.joker(effect)` tanımlar (örn. tahmin kaydırıcısı).

import { ico, esc, shade } from './art.js';
import { Fx } from './fx.js';
import { JOKERS } from '../game/jokers.js';
import { sleep, setTimeout } from '../core/clock.js';

const trUp = (s) => String(s).toLocaleUpperCase('tr-TR');
const yearish = (q, v) => !q.unit && Number.isInteger(v) && v >= 500 && v <= 2100;

// ------------------------------------------------------------------ düğme çubuğu

/** Kartın joker çubuğunu çiz. Uygulanamayan (na) jokerler hiç gösterilmez; kullanılamayanlar sönük ve nedenli. */
export function renderBar(ui, { pop = null } = {}) {
	const box = ui.$.q.querySelector('.fl-jk');
	if (!box) return;
	const cur = ui.current;
	const list = (ui._jk || []).filter((j) => j && j.id != null && !j.na);
	if (!cur || !cur.ctx.human || !list.length) {
		box.innerHTML = '';
		return;
	}
	const dead = !!cur.answered;
	box.innerHTML = list
		.map((j) => {
			const def = JOKERS[j.id] || {};
			const color = j.color || def.color || '#7a4ad8';
			const off = dead || j.usable === false || j.ready === false || (j.count != null && j.count <= 0);
			const label = j.short || def.short || j.label || j.id;
			return `<button class="fl-jkb${off ? ' off' : ''}${j.armed ? ' arm' : ''}${pop === j.id ? ' used' : ''}${j.count === 0 ? ' zero' : ''}" data-j="${esc(j.id)}" data-why="${esc(j.why || '')}" data-name="${esc(j.name || def.name || label)}"
				style="--jc:${color};--jl:${shade(color, 0.28)};--jd:${shade(color, -0.5)}" aria-label="${esc(j.name || label)}" aria-disabled="${off}">
				<span class="ji">${ico(j.icon || def.icon || 'star', { w: 2.5, o: 1.6, oc: 'rgba(0,0,0,.28)' })}</span><b>${esc(label)}</b>${j.count != null ? `<i>${esc(j.count)}</i>` : ''}</button>`;
		})
		.join('');
	box.onclick = (e) => {
		const b = e.target.closest('[data-j]');
		const c = ui.current;
		if (!b || !c || c.answered) return;
		if (b.classList.contains('off')) {
			// sönük düğme: nedenini söyle
			ui.sfx('wrong');
			ui.toast(`${b.dataset.name}: ${b.dataset.why || 'şu an kullanılamaz'}`, { tone: 'warn', icon: 'cross', ms: 1700 });
			return;
		}
		const ctr = Fx.center(b);
		ui.fx.burst(ctr.x, ctr.y, { n: 10, dist: 52, colors: [b.style.getPropertyValue('--jc'), '#fff', '#ffd25a'], kind: 'star', size: 10 });
		ui.sfx('joker', { id: b.dataset.j });
		let r = null;
		try {
			r = (ui._jkCb || ui.h.joker)?.(b.dataset.j, c.ctx);
		} catch (err) {
			console.error('joker', err);
		}
		if (r && r.ok === false) {
			ui.sfx('wrong');
			ui.toast(`${b.dataset.name}: ${r.reason || 'kullanılamadı'}`, { tone: 'warn', icon: 'cross', ms: 1700 });
		} else if (r && r.ok) renderBar(ui, { pop: b.dataset.j });
	};
}

// ------------------------------------------------------------------ etkiler

const stagger = (list, fn, gap = 140) => list.forEach((x, k) => setTimeout(() => fn(x, k), k * gap));

/** Bir oyuncu joker kullandı. İnsansa etki kartta çizilir; değilse küçük rozet. */
export function jokerUsed(ui, p, id, effect, cur) {
	const def = JOKERS[id];
	if (!def || ui.fast) return;
	if (!p.human) {
		botBadge(ui, p, id, effect);
		return;
	}
	const card = ui.$.q;
	const ctl = ui._ctl;
	const toast = (text, tone = 'good') => ui.toast(text, { tone, icon: def.icon, ms: 2000 });
	switch (effect.kind) {
		case 'hide':
			stagger(effect.hide, (i) => {
				const b = card.querySelector(`.fl-opt[data-i="${i}"]`);
				if (!b) return;
				b.classList.add('gone');
				b.disabled = true;
				const c = Fx.center(b);
				ui.fx.burst(c.x, c.y, { n: 6, dist: 40, colors: ['#9fd4ff', '#fff'], size: 8, life: 450 });
			});
			toast(`${def.name}: ${effect.hide.length} yanlış şık elendi`);
			break;
		case 'poll': {
			// elenmiş şıklar varsa (yarı yarıya sonrası) oylar kalan şıklar arasında yeniden oranlanır
			const btns = [...card.querySelectorAll('.fl-opt[data-i], .fl-hl[data-i]')].filter((x) => !x.classList.contains('gone'));
			const sum = btns.reduce((a, x) => a + (effect.pct[Number(x.dataset.i)] || 0), 0) || 1;
			for (const b of btns) {
				const pc = Math.round(((effect.pct[Number(b.dataset.i)] || 0) / sum) * 100);
				b.insertAdjacentHTML('beforeend', `<u class="jp" style="--w:${(pc / 100).toFixed(2)}"><i></i></u><s class="jq">%${pc}</s>`);
			}
			toast('Seyirci oylarını verdi');
			break;
		}
		case 'range':
			if (ctl?.joker) ctl.joker(effect);
			else {
				const r = card.querySelector('.fl-range');
				if (r) {
					r.min = String(effect.min);
					r.max = String(effect.max);
					r.value = String(Math.round((effect.min + effect.max) / 2));
					r.dispatchEvent(new Event('input', { bubbles: true }));
				}
			}
			toast('Cevap bu aralıkta');
			break;
		case 'crowd': {
			const host = card.querySelector('.fl-num');
			const q = cur?.v?.q || {};
			if (host) {
				const t = yearish(q, effect.value) ? String(effect.value) : effect.value.toLocaleString('tr-TR');
				host.insertAdjacentHTML('afterbegin', `<div class="fl-crowd">${ico('eye', { w: 2.4 })}<span>Seyirci tahmini <b>~${esc(t)}</b> ${esc(effect.unit || '')}</span></div>`);
			}
			toast('Seyirci tahminini söyledi');
			break;
		}
		case 'letters':
			if (effect.hint) {
				// önerilen harf zaten açıldıysa sözcükteki henüz basılmamış ilk harfe kayar
				const free = (L) => {
					const k = card.querySelector(`.fl-key[data-k="${L}"]`);
					return k && !k.disabled ? k : null;
				};
				let key = free(effect.letters[0]);
				if (!key) for (const L of new Set([...(cur?.v?.word || '')])) if ((key = free(L))) break;
				key?.classList.add('sug');
				toast(`Seyirci "${key ? key.dataset.k : effect.letters[0]}" harfini öneriyor`);
			} else {
				stagger(effect.letters, (L) => card.querySelector(`.fl-key[data-k="${L}"]`)?.click(), 260);
				toast(`${def.name}: ${effect.letters.join(', ')} harfi açıldı`);
			}
			break;
		case 'zone': {
			const b = ui.app.board;
			for (const i of effect.provinces) b.fx(i, effect.crowd ? 0.5 : 0.35, 1);
			ui._zone = effect.provinces;
			toast(effect.crowd ? 'Seyirci: yakınlarda bir yer' : 'Cevap parlayan bölgede');
			break;
		}
		case 'time': {
			const ck = card.querySelector('.fl-clock');
			if (ck) {
				const c = Fx.center(ck);
				ui.fx.text(c.x, c.y + 30, `+${effect.add} sn`, { cls: 'good' });
			}
			toast(`+${effect.add} saniye`);
			break;
		}
		case 'shield':
			toast('Kalkan hazır: ilk yenilgin yok sayılır');
			break;
		case 'second':
			toast('İkinci şans hazır: yanlışta yeni soru');
			break;
		case 'sabotage':
			for (const i of effect.victims) card.querySelector(`.fl-qp[data-p="${i}"]`)?.classList.add('sab');
			toast('Sabotaj! Rakibin süresi kısalıyor', 'warn');
			break;
		case 'custom':
			ctl?.joker?.(effect.data);
			break;
		default:
			break;
	}
}

/** Haritadaki joker ipucu parıltısını kapat. */
export function clearZone(ui) {
	if (!ui._zone) return;
	const b = ui.app.board;
	for (const i of ui._zone) b.fx(i, 0, 0);
	ui._zone = null;
}

/** Bot joker kullandı: oyuncu plakasında rozet + kısa bildirim. */
function botBadge(ui, p, id, effect) {
	const def = JOKERS[id];
	const plate = ui.$.q.querySelector(`.fl-qp[data-p="${p.i}"]`);
	if (plate && !plate.querySelector(`.jb[data-j="${id}"]`)) {
		plate.insertAdjacentHTML('beforeend', `<i class="jb" data-j="${id}" style="--jc:${def.color}">${ico(def.icon, { w: 2.8 })}</i>`);
	}
	if (id === 'sabotaj' && effect?.victims) for (const i of effect.victims) ui.$.q.querySelector(`.fl-qp[data-p="${i}"]`)?.classList.add('sab');
	ui.toast(`${p.name}: ${def.name}!`, { p, tone: 'info', ms: 1700 });
	ui.sfx('joker', { id, bot: true });
}

/** Kart açılınca, soru başında botların kullandığı jokerleri sırayla göster. */
export async function showBotJokers(ui, list, gen) {
	if (!list || !list.length || ui.fast) return;
	for (let k = 0; k < list.length; k++) {
		await sleep(k ? 520 : 650);
		if (gen !== ui._gen || !ui.current) return;
		const u = list[k];
		botBadge(ui, u.p, u.id, null);
	}
}

// ------------------------------------------------------------------ sabotaj

/** İnsan oyuncuya sabotaj ulaştı: ekran kararır, kart sarsılır, süre kısalır. */
export function sabotage(ui, effect) {
	if (ui.fast) return;
	const card = ui.$.q;
	const qc = card.querySelector('.fl-qc');
	if (!qc || ui.current?.answered) return;
	let veil = qc.querySelector('.fl-sab');
	if (!veil) {
		veil = document.createElement('div');
		veil.className = 'fl-sab';
		veil.innerHTML = `<span>${ico('bolt', { w: 2.6, c: '#ffd25a' })}<b>SABOTAJ!</b><em>−${effect.cut} sn</em></span>`;
		qc.appendChild(veil);
	}
	veil.style.setProperty('--ms', (effect.blurMs || 2000) + 'ms');
	veil.classList.remove('on');
	qc.classList.remove('shk');
	void veil.offsetWidth;
	veil.classList.add('on');
	qc.classList.add('shk');
	setTimeout(() => {
		veil.classList.remove('on');
		qc.classList.remove('shk');
	}, (effect.blurMs || 2000) + 100);
	const by = ui.app.match?.players?.[effect.by];
	ui.sfx('sabotage');
	ui.toast(`${by ? by.name + ' sana sabotaj yaptı' : 'Sabotaj!'}: −${effect.cut} sn`, { p: by || null, tone: 'bad', icon: 'bolt', ms: 2300 });
}
