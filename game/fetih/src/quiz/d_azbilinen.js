// AZ BİLİNEN (deneme): Pointless tarzı çok cevaplı soru ("Ege Bölgesi'nden bir il"). Doğru cevaplar arasında en
// az seçilen en çok puanı alır: puan = 100 − seçilme yüzdesi; yanlış cevap 0. "İzmir" diyen güvende ama az puanlı,
// "Uşak" diyen kahraman. Listede tuzaklar da var (Balıkesir Marmara'da, Sultanahmet Sinan'ın değil).
//
// Seçilme yüzdeleri: çevrimdışında ve galeride elle konmuş TAHMİNİ oranlar (100 kişiden kaçının aklına gelir:
// tanınırlık tahmini); ekranda "tahmini oran" diye yazar. Çevrimiçinde gerçek oyuncu seçimlerinden birikir (sunucu
// istatistiği) ve bu değerlerin yerini alır.
//
// Veri: ans: [[ad, tahmini %, ...eşanlamlar]], wrong: [tuzak ad, …] (liste = ikisinin birleşimi, alfabetik).
// Değer: seçilen listedeki sıra (v.pool). Tür 'closest': err = seçilme yüzdesi (yanlış 100); correct = doğru cevap.
// Çevrimiçi: publicView yalnız listeyi taşır (hangisinin doğru olduğu ve oranlar cevapta gelir).
// Giriş: liste + arama (Türkçe harf ve küçük yazım hatası duyarsız: "usak", "afyon", "suleymaniye").
// Joker: yarı yarıya → listedeki tuzakların yarısı silinir.

import { css, esc, shuffle, pCorrect, clamp, buzz } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, rule, stampLater, sfx, LOOK, ACT } from './d_ortak.js';
import { setTimeout } from '../core/clock.js';

const CSS = /* css */ `
.dn-ab{display:flex;flex-direction:column;gap:8px;user-select:none;-webkit-user-select:none}
.dn-ab-s{position:relative}
.dn-ab-s input{width:100%;height:42px;padding:0 38px 0 14px;border-radius:13px;font:inherit;font-family:'Fredoka';font-weight:600;font-size:16px;color:#fff;background:#0a1534;border:2px solid rgba(255,255,255,.22);
  box-shadow:inset 0 3px 0 rgba(0,0,0,.35);outline:none;user-select:text;-webkit-user-select:text}
.dn-ab-s input:focus{border-color:var(--gold)}
.dn-ab-s input::placeholder{color:#7f90b8}
.dn-ab-s::after{content:'';position:absolute;right:13px;top:50%;width:13px;height:13px;margin-top:-9px;border:2.5px solid #8fa2cf;border-radius:50%}
.dn-ab-s::before{content:'';position:absolute;right:10px;top:50%;width:2.5px;height:8px;margin-top:2px;background:#8fa2cf;transform:rotate(-45deg);border-radius:2px}
.dn-ab-l{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;max-height:calc(27 * var(--vh));overflow-y:auto;overscroll-behavior:contain;padding:2px 2px 4px;scrollbar-width:thin}
.dn-ab-i{min-height:40px;padding:5px 9px 6px;border-radius:12px;text-align:left;font-family:'Fredoka';font-weight:600;font-size:clamp(13.5px,calc(3.8 * var(--vw)),15.5px);line-height:1.12;color:var(--tdark);
  background:linear-gradient(180deg,#fff,#eef1f8);border:2px solid #fff;box-shadow:0 3px 0 #aab6cf;touch-action:manipulation;transition:transform .08s,opacity .25s}
.dn-ab-i:active{transform:translateY(2px);box-shadow:0 1px 0 #aab6cf}
.dn-ab-i.sel{background:linear-gradient(180deg,#fff7d2,#ffd25a);box-shadow:0 0 0 2.5px var(--gold-d),0 3px 0 var(--gold-dd)}
.dn-ab-i.gone{display:none}
.dn-ab-i.top{order:-1}
.dn-ab-none{grid-column:1/-1;padding:10px;text-align:center;font-size:13.5px;color:#9fb0d6}
.dn-ab-f{display:flex;align-items:center;gap:10px}
.dn-ab-f span{flex:1;min-width:0;font-size:13px;line-height:1.25;color:#cfe0ff}
.dn-ab-f span b{color:var(--gold);font-weight:700}
.dn-ab .fl-send{flex:none;width:auto;min-width:112px;height:46px;padding:0 16px;font-size:18px}
/* cevap: bütün doğru cevaplar, tahmini seçilme oranıyla */
.dn-ab.done .dn-ab-s,.dn-ab.done .dn-ab-l,.dn-ab.done .dn-ab-f{display:none}
.dn-ab-r{display:flex;flex-direction:column;gap:4px}
.dn-ab-h{display:flex;justify-content:space-between;align-items:baseline;padding:0 4px;font-family:'Manrope';font-weight:800;font-size:10.5px;letter-spacing:.12em;color:#8fa2cf}
.dn-ab-h em{font-style:normal;color:#ffb894;letter-spacing:.04em}
.dn-ab-bars{display:flex;flex-direction:column;gap:3px;max-height:calc(30 * var(--vh));overflow-y:auto;overscroll-behavior:contain;padding:2px 2px 2px 0;scrollbar-width:thin}
.dn-ab-b{position:relative;display:flex;align-items:center;gap:8px;min-height:25px;padding:2px 8px 3px;border-radius:9px;background:rgba(10,21,52,.75);overflow:hidden;
  animation:dnAbIn .35s both;animation-delay:calc(var(--k) * 45ms)}
.dn-ab-b>u{position:absolute;left:0;top:0;bottom:0;width:calc(var(--p) * 1%);background:linear-gradient(90deg,rgba(94,200,255,.38),rgba(94,200,255,.16));transform-origin:0 50%;animation:dnAbBar .7s cubic-bezier(.2,.8,.3,1) both;animation-delay:calc(120ms + var(--k) * 45ms)}
.dn-ab-b>span{position:relative;flex:1;min-width:0;font-size:13.5px;font-weight:600;color:#eef2fa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dn-ab-b>em{position:relative;flex:none;font-style:normal;font-family:'Manrope';font-weight:800;font-size:11.5px;color:#9fb0d6;font-variant-numeric:tabular-nums}
.dn-ab-b>b{position:relative;flex:none;min-width:40px;text-align:right;font-family:'Lilita One';font-weight:400;font-size:15px;color:#ffd25a;font-variant-numeric:tabular-nums}
.dn-ab-b.low>b{color:#7dff9a}
.dn-ab-b.me{background:linear-gradient(90deg,#3a2a00,#1a1530);box-shadow:0 0 0 2.5px var(--gold),0 0 16px rgba(255,210,90,.45)}
.dn-ab-b.me>u{background:linear-gradient(90deg,rgba(255,210,90,.6),rgba(255,210,90,.2))}
.dn-ab-b.me>span::after{content:'SEN';margin-left:6px;padding:0 5px 1px;border-radius:5px;font-family:'Manrope';font-weight:800;font-size:9.5px;letter-spacing:.08em;color:#3a2200;background:var(--gold);vertical-align:2px}
.dn-ab-b.bad{background:linear-gradient(90deg,#5a1610,#2a0e18);box-shadow:0 0 0 2px #ff5a4a}
.dn-ab-b.bad>b{color:#ff8a78}
.dn-ab-b .fl-who{position:relative;top:auto;right:auto;flex:none;width:20px;height:20px;border-radius:6px;border-width:2px}
.dn-ab-b .fl-who+.fl-who{right:auto}
@keyframes dnAbIn{from{opacity:0;transform:translateX(-10px)}}
@keyframes dnAbBar{from{transform:scaleX(0)}}
`;

/** Arama için sadeleştir: küçük harf, Türkçe harfler düz, harf ve rakam dışı yok. */
export const sade = (s) =>
	String(s ?? '')
		.toLocaleLowerCase('tr-TR')
		// sayfa windows-1252 okunabilir: düzenli ifadede ASCII dışı harf yok (esbuild dizeleri kaçışlar, düzenli ifadeyi değil)
		.replace(/[\u00E7\u011F\u0131\u00F6\u015F\u00FC\u00E2\u00EE\u00FB]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' })[c])
		.replace(/[^a-z0-9]/g, '');

function lev(a, b) {
	if (a === b) return 0;
	const m = a.length;
	const n = b.length;
	let prev = Array.from({ length: n + 1 }, (_, j) => j);
	for (let i = 1; i <= m; i++) {
		const cur = [i];
		for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
		prev = cur;
	}
	return prev[n];
}

/**
 * Yazım hatasına dayanıklı arama: sorgu bir adın (ya da eşanlamının) herhangi bir kelimesinin başıyla en çok
 * ⌊uzunluk/4⌋ harf farkla eşleşirse ya da adın içinde geçerse bulunur. Dönen: uyan sıralar (iyi eşleşen önce).
 */
export function ara(names, query, alias = []) {
	const q = sade(query);
	if (!q) return names.map((_, i) => i);
	const tol = Math.floor(q.length / 4);
	const hits = [];
	names.forEach((name, i) => {
		let best = 99;
		for (const full of [name, ...(alias[i] || [])]) {
			const s = sade(full);
			if (s.includes(q)) best = Math.min(best, s.startsWith(q) ? 0 : 1);
			// kelime kelime ve boşluksuz bütün ad ("neilarmstrng") üzerinden
			for (const w of [...String(full).split(/[\s'\u2019-]+/), full]) {
				const sw = sade(w);
				if (!sw) continue;
				const d = Math.min(lev(q, sw.slice(0, q.length)), lev(q, sw.slice(0, q.length + 1)), lev(q, sw));
				if (d <= tol) best = Math.min(best, 1 + d);
			}
		}
		if (best < 99) hits.push([best, i]);
	});
	return hits.sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((h) => h[1]);
}

const pick = (v, value) => (Number.isInteger(value) && value >= 0 && value < v.pool.length ? value : -1);

export const azbilinen = {
	time: 30,
	label: 'Az Bilinen',
	kind: 'closest',
	keep: true,
	jokers: ['yari'],
	fmt: (v, value) => {
		const i = pick(v, value);
		return i < 0 || v.pct[i] < 0 ? '0 puan' : `${100 - v.pct[i]} puan`;
	},
	sub: (v, value) => {
		const i = pick(v, value);
		if (i < 0) return 'cevap yok';
		return v.pct[i] < 0 ? `${v.pool[i]} · yanlış` : v.pool[i];
	},
	prepare(q) {
		const items = [...q.ans.map(([n, p, ...al]) => ({ n, p, al })), ...q.wrong.map((n) => ({ n, p: -1, al: [] }))].sort((a, b) => a.n.localeCompare(b.n, 'tr'));
		const v = { q, pool: items.map((x) => x.n), alias: items.map((x) => x.al), pct: items.map((x) => x.p) };
		return stamp(v, q, (q2, k, P, text) => {
			text(v.pool.join(' '), 0.3); // listeyi göz gezdirerek tarar
			return {
				look: LOOK.orient + v.pool.length * 0.12,
				// doğruları hatırla, hangisinin az bilindiğini tart
				think: P.think[0] + P.think[1] * k,
				act: 2 * ACT.tap + ACT.confirm + 1, // kaydır ya da ara
			};
		});
	},
	mount(el, v, api) {
		css('azbilinen', CSS);
		const app = appOf();
		el.innerHTML = `<div class="dn-ab">
			<label class="dn-ab-s"><input type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Ara ya da listeden seç (${v.pool.length})" aria-label="Cevap ara"></label>
			<div class="dn-ab-l">${v.pool.map((n, i) => `<button class="dn-ab-i" data-i="${i}">${esc(n)}</button>`).join('')}<div class="dn-ab-none" hidden>Listede yok: başka türlü yaz</div></div>
			<div class="dn-ab-f"><span>Doğru ama <b>az bilinen</b> cevap çok puan</span><button class="fl-send" disabled>GÖNDER</button></div>
		</div>`;
		rule(el, 'Nadiri kazanır');
		const root = el.querySelector('.dn-ab');
		const input = root.querySelector('input');
		const list = root.querySelector('.dn-ab-l');
		const items = [...list.querySelectorAll('.dn-ab-i')];
		const none = list.querySelector('.dn-ab-none');
		const info = root.querySelector('.dn-ab-f span');
		const send = root.querySelector('.fl-send');
		const hidden = new Set();
		let sel = -1;
		let done = false;
		const filter = () => {
			const hits = ara(v.pool, input.value, v.alias);
			const set = new Set(hits);
			const q = input.value.trim();
			items.forEach((b, i) => {
				b.classList.toggle('gone', hidden.has(i) || !set.has(i));
				b.classList.toggle('top', !!q && hits[0] === i);
			});
			none.hidden = items.some((b) => !b.classList.contains('gone'));
		};
		input.addEventListener('input', filter);
		input.addEventListener('keydown', (e) => {
			if (e.key !== 'Enter') return;
			const first = items.find((b) => b.classList.contains('top') && !b.classList.contains('gone')) || items.find((b) => !b.classList.contains('gone'));
			if (first) choose(Number(first.dataset.i));
			input.blur();
		});
		const choose = (i) => {
			if (done) return;
			items[sel]?.classList.remove('sel');
			sel = i;
			items[i].classList.add('sel');
			info.innerHTML = `Seçimin: <b>${esc(v.pool[i])}</b>`;
			send.disabled = false;
			sfx(app, 'tap');
			buzz(5);
		};
		list.addEventListener('click', (e) => {
			const b = e.target.closest('.dn-ab-i');
			if (b) choose(Number(b.dataset.i));
		});
		send.addEventListener('click', () => {
			if (done || sel < 0) return;
			done = true;
			send.disabled = true;
			input.disabled = true;
			info.innerHTML = `<b>${esc(v.pool[sel])}</b> gönderildi`;
			buzz(10);
			api.answer(sel);
		});
		return {
			lock() {
				done = true;
				send.disabled = true;
				input.disabled = true;
			},
			value: () => (sel >= 0 ? sel : null),
			joker(e) {
				if (!e?.hide) return;
				for (const i of e.hide) if (i !== sel) hidden.add(i);
				filter();
				app?.ui?.toast?.(`${e.hide.length} tuzak listeden silindi`, { tone: 'good', ms: 1800 });
			},
			reveal(results) {
				done = true;
				root.classList.add('done');
				input.blur();
				const meR = results.find((r) => r.p?.human);
				const mine = meR ? pick(v, meR.value) : -1;
				const ok = v.pct.map((p, i) => (p >= 0 ? i : -1)).filter((i) => i >= 0).sort((a, b) => v.pct[b] - v.pct[a]);
				const minP = Math.min(...ok.map((i) => v.pct[i]));
				const who = (i) =>
					results
						.filter((r) => pick(v, r.value) === i)
						.map((r) => `<b class="fl-who" style="background:${r.color}"></b>`)
						.join('');
				const row = (i, k) =>
					`<div class="dn-ab-b${i === mine ? ' me' : ''}${v.pct[i] === minP ? ' low' : ''}" style="--p:${v.pct[i]};--k:${k}"><u></u><span>${esc(v.pool[i])}</span>${who(i)}<em>%${v.pct[i]}</em><b>+${100 - v.pct[i]}</b></div>`;
				const badRows = [...new Set(results.map((r) => pick(v, r.value)).filter((i) => i >= 0 && v.pct[i] < 0))]
					.map((i) => `<div class="dn-ab-b bad${i === mine ? ' me' : ''}" style="--p:0;--k:0"><u></u><span>${esc(v.pool[i])} · doğru değil</span>${who(i)}<b>0</b></div>`)
					.join('');
				root.insertAdjacentHTML(
					'beforeend',
					`<div class="dn-ab-r"><div class="dn-ab-h"><span>${ok.length} DOĞRU CEVAP · SEÇİLME ORANI</span><em>tahmini oran</em></div><div class="dn-ab-bars">${badRows}${ok.map((i, k) => row(i, k + 1)).join('')}</div></div>`,
				);
				const me = root.querySelector('.dn-ab-b.me');
				if (me) {
					const box = root.querySelector('.dn-ab-bars');
					setTimeout(() => (box.scrollTop = Math.max(0, me.offsetTop - box.offsetTop - box.clientHeight / 2 + 12)), 60);
				}
				if (meR && app) {
					const order = results.slice().sort((a, b2) => a.err - b2.err || a.time - b2.time);
					const win = order[0] === meR;
					if (mine >= 0 && v.pct[mine] >= 0) {
						const pts = 100 - v.pct[mine];
						const tag = v.pct[mine] === minP ? 'En az bilinen cevap!' : pts >= 80 ? 'Az bilinen cevap!' : pts < 40 ? 'Doğru ama herkes bunu der' : '';
						stampLater(app, `+${pts} PUAN`, win ? 'gold' : '', win ? tag : `${order[0].name} daha az bilineni buldu`);
					} else stampLater(app, mine >= 0 ? 'YANLIŞ CEVAP' : 'SÜRE DOLDU', 'bad', mine >= 0 ? `${v.pool[mine]} doğru cevaplardan değil` : '');
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
		const wrong = v.pct.map((p, i) => (p < 0 ? i : -1)).filter((i) => i >= 0);
		return { hide: shuffle(wrong, R).slice(0, Math.ceil(wrong.length / 2)).sort((a, b) => a - b) };
	},
	/** Çevrimiçi görünüm: yalnız liste (alfabetik); doğrular ve oranlar cevapta gelir. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.pct;
		delete o.alias; // eşanlamlar yalnız doğru cevaplarda var: hangisinin doğru olduğunu ele verir
		delete o.q.ans;
		delete o.q.wrong;
		return o;
	},
	judge(v, value) {
		const i = pick(v, value);
		if (i < 0) return { correct: false, err: 101 };
		const p = v.pct[i];
		return p < 0 ? { correct: false, err: 100, pts: 0 } : { correct: true, err: p, pts: 100 - p };
	},
	bot(v, skill, R) {
		const p = clamp(pCorrect(skill, v.q.diff) + 0.15, 0.1, 0.96);
		const ok = v.pct.map((x, i) => (x >= 0 ? i : -1)).filter((i) => i >= 0);
		const bad = v.pct.map((x, i) => (x < 0 ? i : -1)).filter((i) => i >= 0);
		let value;
		if (R() < p) {
			// acemi bilineni söyler, usta az bilinene oynar
			const ex = 1.1 - 2.2 * skill;
			const w = ok.map((i) => (v.pct[i] + 3) ** ex);
			let r = R() * w.reduce((a, b) => a + b, 0);
			value = ok[ok.length - 1];
			for (let k = 0; k < ok.length; k++) if ((r -= w[k]) <= 0) {
				value = ok[k];
				break;
			}
		} else value = bad[Math.floor(R() * bad.length)];
		return { value, time: botTime(v, R, skill, 0.15, 0.95) };
	},
	ornek(v) {
		const ok = v.pct.map((x, i) => (x >= 0 ? i : -1)).filter((i) => i >= 0);
		return { good: ok.reduce((a, b) => (v.pct[b] < v.pct[a] ? b : a)), bad: v.pct.findIndex((x) => x < 0) };
	},
};
