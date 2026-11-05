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
/* YALAN MAKİNESİ: titreyen iğne, üç dosya kartı, mürekkepli DOĞRU / YALAN damgaları */
.dn-id{display:flex;flex-direction:column;gap:10px;user-select:none;-webkit-user-select:none}
.fl-q.cover .dn-id{flex:1 1 auto;gap:14px}
.fl-q.cover .dn-id-c{flex:1 1 0;min-height:0;max-height:170px;font-size:clamp(16px,calc(4.7 * var(--vw)),20px)}
.fl-q.cover .dn-id-c>div{display:flex;flex-direction:column;justify-content:center}
.fl-q.cover .dn-id-c>i b{font-size:30px}
.fl-q.cover .id-pg{flex:none;height:62px}
/* cevap: kartlar içerik kadar uzar (not eklenir), yazı biraz küçülür; hiçbir şey üst üste binmez */
.fl-q.cover .dn-id.done{gap:10px}
.fl-q.cover .dn-id.done .dn-id-c{flex:0 0 auto;max-height:none;font-size:clamp(14.5px,calc(4 * var(--vw)),17px)}
.fl-q.cover .dn-id.done .id-pg{height:44px}
.id-pg{position:relative;height:54px;border-radius:12px;overflow:hidden;background:linear-gradient(180deg,#f4f8f2,#e2ecdf);box-shadow:inset 0 0 0 2px #0b1a10,0 6px 14px rgba(0,0,0,.4)}
.id-pg::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 11px,rgba(40,120,60,.18) 11px 12px),repeating-linear-gradient(180deg,transparent 0 10px,rgba(40,120,60,.12) 10px 11px)}
.id-pg svg{position:absolute;left:0;top:0;width:200%;height:100%;animation:idScroll 3.2s linear infinite}
.id-pg path{fill:none;stroke:#c8241a;stroke-width:2;stroke-linejoin:round;transform-origin:50% 50%;transform-box:fill-box;transition:transform .3s}
.dn-id.hot .id-pg path{transform:scaleY(1.9)}
.dn-id.done .id-pg path{transform:scaleY(2.6);stroke:#e8343c}
.dn-id.done.ok .id-pg path{transform:scaleY(.5);stroke:#1f9a4a}
.id-pg b{position:absolute;left:10px;top:7px;padding:2px 7px;border-radius:4px;font:italic 900 11px/1.2 'Barlow Condensed',sans-serif;letter-spacing:.14em;color:#fff;background:#0b1a10}
.id-pg i{position:absolute;right:10px;top:8px;width:10px;height:10px;border-radius:50%;background:#e8343c;box-shadow:0 0 8px #e8343c;animation:idBlink 1s steps(2) infinite}
.dn-id-c{position:relative;display:flex;align-items:stretch;gap:0;width:100%;padding:0;border:0;border-radius:6px;text-align:left;overflow:visible;
  font:600 clamp(15px,calc(4.25 * var(--vw)),18px)/1.28 'Fredoka',sans-serif;color:#1d2238;background:linear-gradient(180deg,#fffdf6,#f1e8d2);
  box-shadow:0 2px 0 #d9c9a2,0 4px 0 #c9b688,0 10px 18px rgba(0,0,0,.45);transition:transform .1s,opacity .3s,box-shadow .2s;touch-action:manipulation;
  animation:dnIdIn .45s cubic-bezier(.3,1.5,.5,1) both}
.dn-id-c:nth-child(3){animation-delay:.08s}.dn-id-c:nth-child(4){animation-delay:.16s}
.dn-id-c:active{transform:translateY(3px)}
.dn-id-c>i{flex:none;width:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:6px 0 0 6px;font-style:normal;color:#fff;background:var(--lc,#3d6bd8);box-shadow:inset -3px 0 0 rgba(0,0,0,.18)}
.dn-id-c>i small{font:italic 900 9px/1 'Barlow Condensed',sans-serif;letter-spacing:.12em;opacity:.85}
.dn-id-c>i b{font:400 24px/1 'Lilita One',sans-serif}
.dn-id-c:nth-child(3)>i{--lc:#d9761a}.dn-id-c:nth-child(4)>i{--lc:#1f9a6a}
.dn-id-c>div{flex:1;min-width:0;padding:12px 13px 13px}
.dn-id-c p{margin:0}
.dn-id-c::after{content:'';position:absolute;left:56px;top:-6px;width:42px;height:13px;background:rgba(200,200,190,.6);transform:rotate(4deg);box-shadow:0 1px 2px rgba(0,0,0,.2)}
.dn-id-c.pick{box-shadow:0 0 0 3px #fff,0 0 0 6px #e8343c,0 10px 18px rgba(0,0,0,.45)}
.dn-id-c.pick::before{content:'ŞÜPHELİ';position:absolute;right:10px;bottom:-11px;z-index:2;padding:2px 9px;border-radius:5px;font:italic 900 13px/1.2 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.1em;color:#fff;background:#e8343c;box-shadow:0 3px 0 #7a0e14}
.dn-id-c.gone{opacity:.4;pointer-events:none}
.dn-id-c.gone::before{content:'DOĞRU';position:absolute;right:14px;top:50%;transform:translateY(-50%) rotate(-10deg);padding:3px 10px;border-radius:6px;font:400 17px/1 'Lilita One',sans-serif;color:#1f9a4a;box-shadow:inset 0 0 0 3px #1f9a4a}
.dn-id-c .dn-id-pl{display:block;height:7px;margin-top:8px;border-radius:4px;background:rgba(10,21,52,.12);overflow:hidden}
.dn-id-c .dn-id-pl u{display:block;height:100%;width:calc(var(--p) * 1%);background:linear-gradient(90deg,#b45bff,#ec4f93);transition:width .6s}
.dn-id-c .dn-id-pq{position:absolute;right:12px;bottom:5px;font-family:'Lilita One';font-size:13px;color:#b45bff;text-decoration:none}
/* cevap: damgalar */
.dn-id.done .dn-id-c{pointer-events:none;animation:none}
.dn-id-c .dn-id-tg{position:absolute;right:8px;top:-12px;z-index:2;padding:3px 10px 4px;border-radius:7px;font:400 17px/1 'Lilita One',sans-serif;letter-spacing:.08em;
  color:var(--sc);background:#fffdf6;box-shadow:inset 0 0 0 3px var(--sc),0 3px 8px rgba(0,0,0,.3);transform:rotate(-6deg);animation:dnIdTag .42s cubic-bezier(.3,1.8,.5,1) both}
.dn-id-c.ok{--sc:#1f9a4a}
.dn-id-c.ok>div{padding-top:16px}
.dn-id-c.lie{--sc:#c8241a;background:linear-gradient(180deg,#ffe6e0,#ffc9bf);box-shadow:0 0 0 3px #e8343c,0 0 26px rgba(255,60,40,.55),0 10px 18px rgba(0,0,0,.45);animation:dnIdLie .55s cubic-bezier(.3,1.6,.5,1)}
.dn-id-c.lie>i{background:#c8241a}
.dn-id-c.lie>div{padding-top:16px}
.dn-id-c.lie .dn-id-tg{font-size:20px;color:#fff;background:#c8241a;box-shadow:0 0 0 2.5px #fff,0 4px 10px rgba(0,0,0,.35);transform:rotate(5deg)}
.dn-id-c.lie p{text-decoration:line-through;text-decoration-color:rgba(200,36,26,.75);text-decoration-thickness:2.5px}
.dn-id-c .dn-id-nt{display:block;margin-top:7px;padding-top:7px;border-top:1.5px dashed rgba(10,21,52,.2);font-size:.82em;font-weight:500;line-height:1.32;color:#2a3a60;text-decoration:none;animation:dnIdNote .45s both}
.dn-id-c .dn-id-nt b{font-weight:800;color:#1f9a4a}
.dn-id-c.lie .dn-id-nt{color:#5a1a14;text-decoration:none}
.dn-id-c.lie .dn-id-nt b{color:#c8241a}
.dn-id-c:nth-child(3) .dn-id-nt,.dn-id-c:nth-child(3) .dn-id-tg{animation-delay:.18s}.dn-id-c:nth-child(4) .dn-id-nt,.dn-id-c:nth-child(4) .dn-id-tg{animation-delay:.36s}
.dn-id-c .fl-who{top:-12px;right:auto;left:-8px}
.dn-id-c .fl-who+.fl-who{left:20px;right:auto}
@media (max-height:700px){.id-pg{height:40px}.dn-id-c>div{padding:9px 10px 10px}.dn-id{gap:8px}}
@keyframes idScroll{to{transform:translateX(-50%)}}
@keyframes idBlink{50%{opacity:.2}}
@keyframes dnIdIn{from{transform:translateY(14px) rotate(-1deg)}}
@keyframes dnIdTag{from{transform:scale(2.2) rotate(-16deg)}}
@keyframes dnIdLie{0%{transform:scale(1)}35%{transform:scale(1.04) rotate(-1.2deg)}70%{transform:scale(.99) rotate(.8deg)}100%{transform:none}}
@keyframes dnIdNote{from{transform:translateY(-6px)}}
@media (prefers-reduced-motion:reduce){.id-pg svg,.id-pg i{animation:none}}
`;

/** Yalan makinesinin iğne izi (iki kat genişlik: kayarak döner). */
function needle(seed) {
	let s = seed >>> 0 || 7;
	const R = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
	const pts = [];
	for (let x = 0; x <= 400; x += 5) {
		const spike = R() < 0.08 ? (R() - 0.5) * 34 : 0;
		pts.push(`${x},${(27 + Math.sin(x * 0.11) * 6 + (R() - 0.5) * 7 + spike).toFixed(1)}`);
	}
	const half = pts.join(' L');
	// ikinci yarı ilkinin kopyası (kesintisiz kayma)
	return `<svg viewBox="0 0 800 54" preserveAspectRatio="none" aria-hidden="true"><path d="M${half} ${pts.map((p) => { const [x, y] = p.split(','); return `L${+x + 400},${y}`; }).join(' ')}"/></svg>`;
}

export const ikidogru = {
	time: 25,
	label: 'İki Doğru Bir Yalan',
	kind: 'exact',
	cover: true, // tam ekran yalan makinesi
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
		el.innerHTML = `<div class="dn-id"><div class="id-pg">${needle([...String(v.q.id || '')].reduce((h, c) => h * 31 + c.charCodeAt(0), 7))}<b>YALAN MAKİNESİ</b><i></i></div>${v.facts.map((t, i) => `<button class="dn-id-c" data-i="${i}"><i><small>DOSYA</small><b>${i + 1}</b></i><div><p>${esc(t)}</p></div></button>`).join('')}</div>`;
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
					if (note) c.querySelector('div').insertAdjacentHTML('beforeend', `<span class="dn-id-nt"><b>${lie ? 'Gerçek:' : 'Neden şaşırtıcı:'}</b> ${esc(note)}</span>`);
				});
				for (const r of results) if (Number.isInteger(r.value) && cards[r.value]) cards[r.value].insertAdjacentHTML('beforeend', `<b class="fl-who" style="background:${r.color}"></b>`);
				const fx = app?.ui?.fx;
				if (fx) {
					const rc = cards[v.right].getBoundingClientRect();
					setTimeout(() => fx.burst(rc.right - 30, rc.top + 6, { n: 12, dist: 60, colors: ['#ff5a4a', '#fff'], kind: 'star', size: 10, life: 600 }), 120);
				}
				const meR = results.find((r) => r.p?.human);
				root.classList.toggle('ok', !!meR?.correct);
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
