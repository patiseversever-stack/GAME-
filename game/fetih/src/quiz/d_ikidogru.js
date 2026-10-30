// İKİ DOĞRU BİR YALAN (deneme): üç şaşırtıcı bilgi, biri yalan; yalana dokun. Cevapta kartlar damgalanır
// (DOĞRU / YALAN) ve her kartın altında kısa bir açıklama açılır: doğruysa neden şaşırtıcı, yalansa doğrusu.
// Doğru bilgilerin her biri iki kaynakla doğrulandı (veride k: [kaynak, kaynak]); yalanlar inandırıcı ama kesin yanlış.
//
// Veri: f: [{ t: bilgi, n: açıklama, k?: [kaynak…] } ×3], lie: yalanın sırası (f içinde).
// Değer: seçilen kart (v.facts sırası). Tür 'exact'.
// Çevrimiçi: publicView yalnız bilgi metinlerini taşır; hangisinin yalan olduğu ve açıklamalar cevapta gelir.
// Joker: yarı yarıya → doğru bilgilerden biri "doğru" damgasıyla elenir; seyirci → kart başına oy yüzdesi.

import { css, esc, shuffle, pCorrect, buzz } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, rule, stampLater, sfx, LOOK, ACT } from './d_ortak.js';
import { setTimeout } from '../core/clock.js';

const CSS = /* css */ `
.dn-id{display:flex;flex-direction:column;gap:7px;user-select:none;-webkit-user-select:none}
.dn-id-c{position:relative;display:flex;align-items:flex-start;gap:9px;width:100%;padding:8px 11px 9px 8px;border-radius:16px;text-align:left;
  font-size:clamp(14px,calc(3.85 * var(--vw)),16.5px);line-height:1.24;font-weight:600;color:var(--tdark);background:linear-gradient(180deg,#fff,#eef1f8);border:3px solid #fff;
  box-shadow:0 5px 0 #aab6cf,0 8px 12px rgba(0,0,0,.22);transition:transform .08s,opacity .3s,background .25s,box-shadow .25s;touch-action:manipulation;
  animation:dnIdIn .4s cubic-bezier(.3,1.5,.5,1) both}
.dn-id-c:nth-child(2){animation-delay:.07s}.dn-id-c:nth-child(3){animation-delay:.14s}
.dn-id-c:active{transform:translateY(4px);box-shadow:0 1px 0 #aab6cf}
.dn-id-c>i{flex:none;width:30px;height:30px;margin-top:1px;border-radius:10px;display:grid;place-items:center;font-style:normal;font-family:'Lilita One';font-size:17px;color:#fff;background:var(--lc,#3d7dff);box-shadow:inset 0 -3px 0 rgba(0,0,0,.2)}
.dn-id-c:nth-child(2)>i{--lc:#ff8a2a}.dn-id-c:nth-child(3)>i{--lc:#2fbf6a}
.dn-id-c>div{flex:1;min-width:0}
.dn-id-c p{margin:0}
.dn-id-c.pick{background:linear-gradient(180deg,#fff7d2,#ffe08a);border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-d),0 5px 0 var(--gold-dd)}
.dn-id-c.gone{opacity:.35;pointer-events:none}
.dn-id-c.gone::after{content:'DOĞRU';position:absolute;right:10px;top:50%;transform:translateY(-50%) rotate(-8deg);padding:2px 8px;border-radius:7px;font-family:'Lilita One';font-size:15px;color:#2fa84a;border:2.5px solid #2fa84a}
.dn-id-c .dn-id-pl{display:block;height:6px;margin-top:6px;border-radius:3px;background:rgba(10,21,52,.12);overflow:hidden}
.dn-id-c .dn-id-pl u{display:block;height:100%;width:calc(var(--p) * 1%);background:linear-gradient(90deg,#b45bff,#ec4f93);transition:width .6s}
.dn-id-c .dn-id-pq{position:absolute;right:10px;bottom:4px;font-family:'Lilita One';font-size:13px;color:#b45bff}
/* cevap */
.dn-id.done .dn-id-c{pointer-events:none;animation:none}
.dn-id-c .dn-id-tg{position:absolute;right:-6px;top:-12px;padding:1px 9px 2px;border-radius:8px;font-family:'Lilita One';font-weight:400;font-size:15px;letter-spacing:.06em;color:#fff;border:2.5px solid #fff;
  box-shadow:0 3px 0 rgba(0,0,0,.35);transform:rotate(6deg);animation:dnIdTag .4s cubic-bezier(.3,1.8,.5,1) both}
.dn-id-c.ok{background:linear-gradient(180deg,#f2fff3,#d9f7de);border-color:#bff0c6;box-shadow:0 4px 0 #8fcf9b}
.dn-id-c.ok .dn-id-tg{background:#2fa84a}
.dn-id-c.lie{color:#fff;background:linear-gradient(180deg,#ff8a78,#d53b2c);border-color:#fff;box-shadow:0 0 0 3px #ffd0c8,0 5px 0 #7a120a,0 0 22px 4px rgba(255,90,74,.45);animation:dnIdLie .55s cubic-bezier(.3,1.6,.5,1)}
.dn-id-c.lie>i{background:#fff;color:#d53b2c}
.dn-id-c.lie .dn-id-tg{background:#1a0a0a;color:#ff8a78;border-color:#ff8a78;font-size:17px;transform:rotate(-7deg)}
.dn-id-c.lie p{text-decoration:line-through;text-decoration-color:rgba(255,255,255,.7);text-decoration-thickness:2px}
.dn-id-c .dn-id-nt{display:block;margin-top:5px;padding-top:5px;border-top:1.5px dashed rgba(10,21,52,.18);font-size:.82em;font-weight:500;line-height:1.3;color:#2a3a60;animation:dnIdNote .45s both}
.dn-id-c.lie .dn-id-nt{color:#fff;border-top-color:rgba(255,255,255,.45);text-decoration:none}
.dn-id-c .dn-id-nt b{font-weight:700}
.dn-id-c:nth-child(2) .dn-id-nt,.dn-id-c:nth-child(2) .dn-id-tg{animation-delay:.18s}.dn-id-c:nth-child(3) .dn-id-nt,.dn-id-c:nth-child(3) .dn-id-tg{animation-delay:.36s}
.dn-id-c .fl-who{top:-12px;right:auto;left:-8px}
.dn-id-c .fl-who+.fl-who{left:20px;right:auto}
@keyframes dnIdIn{from{opacity:0;transform:translateY(12px)}}
@keyframes dnIdTag{from{opacity:0;transform:scale(2.2) rotate(-12deg)}}
@keyframes dnIdLie{0%{transform:scale(1)}35%{transform:scale(1.05) rotate(-1.5deg)}70%{transform:scale(.98) rotate(1deg)}100%{transform:none}}
@keyframes dnIdNote{from{opacity:0;transform:translateY(-6px)}}
`;

export const ikidogru = {
	time: 25,
	label: 'İki Doğru Bir Yalan',
	kind: 'exact',
	jokers: ['yari', 'kahin'],
	prepare(q, R) {
		const order = shuffle([0, 1, 2], R);
		const v = { q, facts: order.map((i) => q.f[i].t), notes: order.map((i) => q.f[i].n), right: order.indexOf(q.lie) };
		return stamp(v, q, (q2, k, P, text) => {
			for (const t of v.facts) text(t);
			return {
				look: LOOK.orient + 3 * LOOK.gaze,
				// her bilgiyi tart: hangisi fazla iyi, hangisi tanıdık değil
				think: P.think[0] + P.think[1] * k,
				act: ACT.tap,
			};
		});
	},
	mount(el, v, api) {
		css('ikidogru', CSS);
		const app = appOf();
		el.innerHTML = `<div class="dn-id">${v.facts.map((t, i) => `<button class="dn-id-c" data-i="${i}"><i>${i + 1}</i><div><p>${esc(t)}</p></div></button>`).join('')}</div>`;
		rule(el, 'Yalanı bul');
		const root = el.querySelector('.dn-id');
		const cards = [...root.querySelectorAll('.dn-id-c')];
		let done = false;
		root.addEventListener('click', (e) => {
			const b = e.target.closest('.dn-id-c');
			if (!b || done || b.classList.contains('gone')) return;
			done = true;
			b.classList.add('pick');
			sfx(app, 'tap');
			buzz(8);
			api.answer(Number(b.dataset.i));
		});
		return {
			lock() {
				done = true;
			},
			joker(e) {
				if (!e) return;
				if (e.hide != null) {
					cards[e.hide]?.classList.add('gone');
					app?.ui?.toast?.('Bir doğru bilgi elendi: yalan kalan ikisinde', { tone: 'good', ms: 1800 });
				}
				if (e.pct) {
					cards.forEach((c, i) => c.querySelector('div').insertAdjacentHTML('beforeend', `<span class="dn-id-pl" style="--p:${e.pct[i]}"><u></u></span><s class="dn-id-pq">%${e.pct[i]}</s>`));
					app?.ui?.toast?.('Seyirci yalanı oyladı', { tone: 'good', ms: 1800 });
				}
			},
			reveal(results) {
				done = true;
				root.classList.add('done');
				cards.forEach((c, i) => {
					const lie = i === v.right;
					c.classList.remove('pick', 'gone');
					c.querySelectorAll('.dn-id-pl,.dn-id-pq').forEach((x) => x.remove());
					c.classList.add(lie ? 'lie' : 'ok');
					c.insertAdjacentHTML('beforeend', `<b class="dn-id-tg">${lie ? 'YALAN' : 'DOĞRU'}</b>`);
					const note = v.notes?.[i] || v.q.f?.find((x) => x.t === v.facts[i])?.n;
					if (note) c.querySelector('div').insertAdjacentHTML('beforeend', `<span class="dn-id-nt">${esc(note)}</span>`);
				});
				for (const r of results) if (Number.isInteger(r.value) && cards[r.value]) cards[r.value].insertAdjacentHTML('beforeend', `<b class="fl-who" style="background:${r.color}"></b>`);
				const fx = app?.ui?.fx;
				if (fx) {
					const rc = cards[v.right].getBoundingClientRect();
					setTimeout(() => fx.burst(rc.right - 30, rc.top + 6, { n: 12, dist: 60, colors: ['#ff5a4a', '#fff'], kind: 'star', size: 10, life: 600 }), 120);
				}
				const meR = results.find((r) => r.p?.human);
				if (meR && app) {
					if (meR.correct) stampLater(app, 'YALANI YAKALADIN!', 'gold');
					else if (meR.value != null) stampLater(app, 'KANDIN!', 'bad', `Yalan ${v.right + 1}. bilgiydi`);
				}
			},
			destroy() {},
		};
	},
	joker(id, v, R) {
		const truths = [0, 1, 2].filter((i) => i !== v.right);
		if (id === 'yari') return { hide: truths[Math.floor(R() * 2)] };
		if (id === 'kahin') {
			// seyirci: yalan çoğunlukla bulunur (zorlukla azalır), kalan oy doğrulara dağılır
			const pr = Math.round(100 * Math.max(0.38, 0.78 - 0.1 * (v.q.diff || 2) + (R() - 0.5) * 0.1));
			const a = Math.round((100 - pr) * (0.35 + R() * 0.3));
			const pct = [0, 0, 0];
			pct[v.right] = pr;
			pct[truths[0]] = a;
			pct[truths[1]] = 100 - pr - a;
			return { pct };
		}
		return null;
	},
	/** Çevrimiçi görünüm: yalnız bilgi metinleri; yalanın yeri ve açıklamalar cevapta gelir. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.right;
		delete o.notes;
		delete o.q.f;
		delete o.q.lie;
		return o;
	},
	judge(v, value) {
		const ok = Number.isInteger(value) && value === v.right;
		return { correct: ok, err: ok ? 0 : 1 };
	},
	bot(v, skill, R) {
		const ok = R() < pCorrect(skill, v.q.diff) + 0.08;
		let value = v.right;
		if (!ok) value = [0, 1, 2].filter((i) => i !== v.right)[Math.floor(R() * 2)];
		return { value, time: botTime(v, R, skill, 0.1, 0.9) };
	},
	ornek(v) {
		return { good: v.right, bad: (v.right + 1) % 3 };
	},
};
