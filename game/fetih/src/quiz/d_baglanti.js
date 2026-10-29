// BAĞLANTI DUVARI (deneme): 12 taş, dörderli 3 gizli grup. Dört taş seç, DENE'ye bas; doğruysa taşlar grubun
// rengiyle üste dizilir ve grubun adı açılır. İki grup bulununca kalan dört taş kendiliğinden son grubu kurar.
// Üç yanlış hakkı var (kalpler); "üçü doğru, biri yanlış" uyarısı da verir. Her duvarda tuzak taşlar vardır: iki
// gruba da uyan bir taş (Yıldırım: padişah lakabı mı, hava olayı mı?) sayım yapılarak çözülür. Only Connect'in
// "Connecting Wall"u ve NYT Connections'ın telefona uygun, düelloya sığan kısa hali.
//
// Veri: groups: [{ n: 'grubun adı', w: [4 kelime] }, ×3]  (12 kelimenin hepsi farklı; çözüm tek olmalı)
// Değer: { tries: [[taş, taş, taş, taş], …] } (gönderilen dörtlüler; taş = v.tiles sırası). Sunucu yeniden yargılar.
// Tür 'closest': err = 10·(bulunamayan grup) + yanlış deneme; correct = bütün gruplar.
// Çevrimiçi: istemci yalnız taş yazılarını görür (v.tiles); her deneme sunucuya sorulur (act 'grup' → ev { ok, bir }).
// Joker: yarı yarıya → henüz bulunmamış bir gruptan iki taş parlar.

import { css, esc, shuffle, pCorrect, clamp, buzz } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, rule, stampLater, sfx, LOOK, ACT } from './d_ortak.js';
import { setTimeout } from '../core/clock.js';

const COLORS = [
	['#ffd25a', '#3a2000', '#a0620a'],
	['#6fdc7e', '#063a14', '#2a8a3e'],
	['#5ec8ff', '#06243a', '#1f7ab0'],
];
const LIVES = 3;

const CSS = /* css */ `
.dn-bg{display:flex;flex-direction:column;gap:8px;user-select:none;-webkit-user-select:none}
.dn-bg-found{display:flex;flex-direction:column;gap:6px}
.dn-bg-found:empty{display:none}
.dn-bg-grp{position:relative;padding:6px 10px 7px;border-radius:14px;text-align:center;color:var(--gt);background:var(--gc);border:2.5px solid #fff;box-shadow:0 4px 0 var(--gd);
  animation:dnGrp .45s cubic-bezier(.3,1.5,.5,1) both}
.dn-bg-grp b{display:block;font-family:'Lilita One';font-weight:400;font-size:15px;letter-spacing:.06em;line-height:1.1;text-transform:uppercase}
.dn-bg-grp span{display:block;font-size:13.5px;font-weight:600;line-height:1.2;opacity:.92}
.dn-bg-grp.miss{opacity:.55;filter:saturate(.5);border-style:dashed}
.dn-bg-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.dn-bg-t{position:relative;min-height:clamp(46px,calc(6.2 * var(--vh)),58px);padding:4px 6px;border-radius:14px;display:flex;align-items:center;justify-content:center;text-align:center;
  font-family:'Fredoka';font-weight:600;font-size:clamp(14px,calc(4.1 * var(--vw)),17px);line-height:1.1;overflow-wrap:anywhere;color:var(--tdark);
  background:linear-gradient(180deg,#fff,#eef1f8);border:3px solid #fff;box-shadow:0 4px 0 #aab6cf,0 6px 10px rgba(0,0,0,.2);touch-action:manipulation;
  transition:transform .12s,background .18s,border-color .18s,box-shadow .18s,opacity .25s}
.dn-bg-t:active{transform:translateY(3px)}
.dn-bg-t.sel{background:linear-gradient(180deg,#fff7d2,#ffe08a);border-color:var(--gold);box-shadow:0 0 0 2.5px var(--gold-d),0 4px 0 var(--gold-dd);transform:translateY(-2px)}
.dn-bg-t.hint{animation:dnHint 1s ease-in-out infinite}
.dn-bg-t.out{animation:dnOut .35s ease-in forwards;pointer-events:none}
.dn-bg-t.shake{animation:flq-shake .38s}
.dn-bg-row{display:flex;align-items:center;gap:10px}
.dn-bg-lives{display:flex;gap:4px;align-items:center}
.dn-bg-lives svg{width:21px;height:19px;fill:#ff5a6a;stroke:#fff;stroke-width:1.6;filter:drop-shadow(0 2px 0 rgba(0,0,0,.35));transition:opacity .3s,transform .3s}
.dn-bg-lives svg.gone{opacity:.2;transform:scale(.7);fill:#8a94b0}
.dn-bg-msg{flex:1;min-width:0;font-size:13px;line-height:1.2;color:#cfe0ff}
.dn-bg-msg.warn{color:#ffb894}
.dn-bg-msg.good{color:#7dff9a}
.dn-bg .fl-send{flex:none;width:auto;min-width:96px;height:46px;padding:0 16px;font-size:18px}
.dn-bg.done .dn-bg-row{display:none}
.dn-bg.done .dn-bg-grid{display:none}
@keyframes dnGrp{from{opacity:0;transform:scale(.8)}}
@keyframes dnOut{to{opacity:0;transform:scale(.6)}}
@keyframes dnHint{50%{box-shadow:0 0 0 4px rgba(125,255,154,.75),0 4px 0 #aab6cf}}
`;
const HEART = '<svg viewBox="0 0 24 22"><path d="M12 20.5S1.5 14 1.5 7.2a5.2 5.2 0 0 1 10.5-1.4 5.2 5.2 0 0 1 10.5 1.4C22.5 14 12 20.5 12 20.5z"/></svg>';

/** Gönderilen dörtlülerden sonuç (sunucu da aynı hesabı yapar): { found: [grup, …], bad, lost }. */
function score(v, tries) {
	const found = [];
	let bad = 0;
	for (const t of Array.isArray(tries) ? tries : []) {
		if (bad >= LIVES || found.length >= v.n - 1) break;
		if (!Array.isArray(t) || t.length !== 4 || new Set(t).size !== 4) continue;
		const g = v.key[t[0]];
		if (g != null && t.every((k) => v.key[k] === g) && !found.includes(g)) found.push(g);
		else bad++;
	}
	// sondan bir önceki grup bulununca son grup kendiliğinden kurulur
	if (found.length === v.n - 1) for (let g = 0; g < v.n; g++) if (!found.includes(g)) found.push(g);
	return { found, bad, lost: bad >= LIVES };
}

export const baglanti = {
	time: 45,
	label: 'Bağlantı',
	kind: 'closest',
	keep: true,
	jokers: ['yari'],
	fmt: (v, value) => `${score(v, value?.tries).found.length}/${v.n} grup`,
	sub: (v, value) => {
		const s = score(v, value?.tries);
		return s.bad ? `${s.bad} yanlış` : 'hatasız';
	},
	prepare(q, R) {
		const all = [];
		q.groups.forEach((g, gi) => g.w.forEach((w) => all.push({ t: w, g: gi })));
		const tiles = shuffle(all, R);
		const v = { q, n: q.groups.length, tiles: tiles.map((x) => x.t), key: tiles.map((x) => x.g), names: q.groups.map((g) => g.n) };
		return stamp(v, q, (q2, k, P, text) => {
			for (const t of v.tiles) text(t);
			const groups = v.n - 1; // son grup kendiliğinden kurulur
			return {
				wait: 0.5 + 0.45 * groups, // bulunan grubun yerine oturması
				look: LOOK.orient + v.tiles.length * LOOK.gaze,
				// grup başına: dört ortak taşı bul, tuzağı sayarak ele (zorlukla artar)
				think: groups * (P.think[0] + P.think[1] * k),
				// her grup 4 dokunuş + DENE; ortalama bir yanlış deneme daha (4 dokunuş + DENE)
				act: (groups + 1) * (4 * ACT.tap + ACT.confirm),
			};
		});
	},
	mount(el, v, api) {
		css('baglanti', CSS);
		const app = appOf();
		el.innerHTML = `<div class="dn-bg">
			<div class="dn-bg-found"></div>
			<div class="dn-bg-grid">${v.tiles.map((t, i) => `<button class="dn-bg-t" data-i="${i}">${esc(t)}</button>`).join('')}</div>
			<div class="dn-bg-row"><span class="dn-bg-lives">${HEART.repeat(LIVES)}</span><span class="dn-bg-msg">Ortak yanı olan 4 taş seç</span><button class="fl-send" disabled>DENE</button></div>
		</div>`;
		rule(el, 'Çok grup bul');
		const root = el.querySelector('.dn-bg');
		const shelf = root.querySelector('.dn-bg-found');
		const btns = [...root.querySelectorAll('.dn-bg-t')];
		const lives = [...root.querySelectorAll('.dn-bg-lives svg')];
		const msg = root.querySelector('.dn-bg-msg');
		const send = root.querySelector('.fl-send');
		const sel = new Set();
		const tries = [];
		const found = [];
		let bad = 0;
		let done = false;
		const say = (text, tone = '') => {
			msg.textContent = text;
			msg.className = `dn-bg-msg ${tone}`;
		};
		const shelve = (g, miss = false) => {
			const [c, t, d] = COLORS[g % COLORS.length];
			const words = v.tiles.filter((_, i) => v.key[i] === g);
			shelf.insertAdjacentHTML('beforeend', `<div class="dn-bg-grp${miss ? ' miss' : ''}" style="--gc:${c};--gt:${t};--gd:${d}"><b>${esc(v.names[g])}</b><span>${words.map(esc).join(' · ')}</span></div>`);
		};
		const take = (g) => {
			found.push(g);
			btns.forEach((b, i) => {
				if (v.key[i] === g) {
					b.classList.remove('sel', 'hint');
					b.classList.add('out');
					setTimeout(() => (b.style.display = 'none'), 340);
				}
			});
			setTimeout(() => shelve(g), 200);
		};
		const finish = () => {
			if (done) return;
			done = true;
			send.disabled = true;
			setTimeout(() => api.answer({ tries: tries.map((t) => t.slice()) }), 650);
		};
		root.querySelector('.dn-bg-grid').addEventListener('click', (e) => {
			const b = e.target.closest('.dn-bg-t');
			if (!b || done || b.classList.contains('out')) return;
			const i = Number(b.dataset.i);
			if (sel.has(i)) sel.delete(i);
			else if (sel.size < 4) sel.add(i);
			else return;
			b.classList.toggle('sel', sel.has(i));
			send.disabled = sel.size !== 4;
			sfx(app, 'tap');
			buzz(5);
		});
		send.addEventListener('click', () => {
			if (done || sel.size !== 4) return;
			const t = [...sel].sort((a, b) => a - b);
			tries.push(t);
			const g = v.key[t[0]];
			const same = t.every((k) => v.key[k] === g);
			if (same && !found.includes(g)) {
				sel.clear();
				take(g);
				sfx(app, 'right');
				buzz(14);
				if (found.length === v.n - 1) {
					// son grup kendiliğinden
					const last = [...Array(v.n).keys()].find((x) => !found.includes(x));
					say('Son grup kendiliğinden kuruldu!', 'good');
					setTimeout(() => take(last), 420);
					finish();
				} else say(`Grup bulundu: ${v.names[g]}`, 'good');
				send.disabled = true;
				return;
			}
			// yanlış: bir hak gider; dörtten üçü aynı gruptaysa söyle
			bad++;
			lives[LIVES - bad]?.classList.add('gone');
			const counts = {};
			for (const k of t) counts[v.key[k]] = (counts[v.key[k]] || 0) + 1;
			const three = Object.values(counts).some((c) => c === 3);
			for (const k of t) {
				const b = btns[k];
				b.classList.remove('shake');
				void b.offsetWidth;
				b.classList.add('shake');
			}
			sfx(app, 'wrong');
			buzz(40);
			if (bad >= LIVES) {
				say('Haklar bitti: duvar kapandı', 'warn');
				finish();
			} else say(three ? 'Üçü doğru, biri yanlış!' : `Bu dörtlü bir grup değil · ${LIVES - bad} hak kaldı`, 'warn');
		});
		return {
			lock() {
				done = true;
				send.disabled = true;
			},
			value: () => ({ tries: tries.map((t) => t.slice()) }),
			joker(e) {
				if (!e?.pair) return;
				for (const i of e.pair) if (!btns[i].classList.contains('out')) btns[i].classList.add('hint');
				app?.ui?.toast?.('Parlayan iki taş aynı grupta', { tone: 'good', ms: 1800 });
			},
			reveal(results) {
				done = true;
				root.classList.add('done');
				for (let g = 0; g < v.n; g++) if (!found.includes(g)) shelve(g, true);
				const meR = results.find((r) => r.p?.human);
				if (meR && app) {
					const order = results.slice().sort((a, b2) => a.err - b2.err || a.time - b2.time);
					const s = score(v, meR.value?.tries);
					const win = order[0] === meR;
					if (s.found.length === v.n) stampLater(app, s.bad ? 'ÇÖZDÜN!' : 'KUSURSUZ!', win ? 'gold' : 'bad', win ? 'Duvar yıkıldı' : `${order[0].name} daha hızlıydı`);
					else stampLater(app, `${s.found.length}/${v.n} GRUP`, win ? 'gold' : 'bad', win ? '' : `${order[0].name} daha çok buldu`);
				}
				setTimeout(() => {
					const w = el.closest('.fl-q')?.querySelector('.fl-cr.win .tag');
					if (w) w.textContent = 'KAZANDI';
				}, 0);
			},
			destroy() {},
		};
	},
	joker(id, v, R) {
		if (id !== 'yari') return null;
		const g = Math.floor(R() * v.n);
		const idx = v.key.map((x, i) => (x === g ? i : -1)).filter((i) => i >= 0);
		return { pair: shuffle(idx, R).slice(0, 2) };
	},
	judge(v, value) {
		const s = score(v, value?.tries);
		return { correct: s.found.length === v.n, err: 10 * (v.n - s.found.length) + s.bad, groups: s.found.length };
	},
	bot(v, skill, R) {
		// her grup için: bulma olasılığı beceri ve zorlukla; her tuzak bir yanlış deneme riski
		const p = clamp(pCorrect(skill, v.q.diff) + 0.1, 0.1, 0.95);
		const order = shuffle([...Array(v.n).keys()], R);
		const tries = [];
		let bad = 0;
		let got = 0;
		const groupTiles = (g) => v.key.map((x, i) => (x === g ? i : -1)).filter((i) => i >= 0);
		for (const g of order) {
			if (got >= v.n - 1 || bad >= LIVES) break;
			while (bad < LIVES && R() > p) {
				// yanlış dörtlü: bu gruptan üç taş + başka gruptan bir taş
				const t = groupTiles(g).slice(0, 3);
				const other = v.key.findIndex((x) => x !== g);
				tries.push([...t, other].sort((a, b) => a - b));
				bad++;
			}
			if (bad >= LIVES) break;
			tries.push(groupTiles(g));
			got++;
		}
		const all = got >= v.n - 1;
		return { value: { tries }, time: all ? botTime(v, R, skill, 0.25, 1) : v.sec || 45 };
	},
};
