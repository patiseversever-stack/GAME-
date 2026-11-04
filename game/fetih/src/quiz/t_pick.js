// Seçmeli tipler: hilo, odd, emoji, proverb, riddle.
// Hepsi 'exact' türünde: bildi / bilemedi; eşitlikte hızlı olan kazanır.

import { css, esc, shuffle, pCorrect, mountChoice, buzz, fmtNum, clamp } from './util.js';
import { botTime } from './timing.js';
import { clock, setTimeout } from '../core/clock.js';

const CSS = /* css */ `
/* hilo · Arena v1 "Kefe" (v1.6): çapraz kesikle ayrılmış iki eğik levha, beyaz ve koyu; ortada altın çerçeveli VS elması.
   Cevapta değerler sayarak gelir, levhanın altındaki güç çubuğu büyüklükle orantılı dolar (yıl karşılaştırmasında çubuk yok,
   fark çipi konuşur); kazanan altınla parlar, kaybeden söner. Kesik (clip-path) iç levhada: parıltı (drop-shadow) düğmede. */
.fl-hilo{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:0;height:178px;margin:2px 0 0}
.fl-hl{position:relative;display:block;min-height:0;padding:0;border:0;border-radius:0;background:none;box-shadow:none;color:inherit;font:inherit;text-align:left;cursor:pointer;
  touch-action:manipulation;transition:transform .16s cubic-bezier(.3,1.4,.5,1),opacity .3s,filter .35s;-webkit-tap-highlight-color:transparent;animation:flHlIn .42s cubic-bezier(.2,1.25,.4,1) both}
.fl-hl.b{margin-left:-16px;animation-name:flHlInB;animation-delay:.06s}
.fl-hl .pl{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:14px 26px 14px 14px;overflow:hidden}
.fl-hl.a .pl{clip-path:polygon(0 0,100% 0,calc(100% - 26px) 100%,0 100%);background:linear-gradient(165deg,#ffffff,#e6e9f1);color:#0b0c12}
.fl-hl.b .pl{clip-path:polygon(26px 0,100% 0,100% 100%,0 100%);padding:14px 14px 14px 34px;background:linear-gradient(165deg,#2a2f42,#171a26);color:#fff;text-align:right;align-items:flex-end}
.fl-hl.b .pl::before{content:'';position:absolute;inset:0;clip-path:inherit;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);pointer-events:none}
.fl-hl .nm{display:block;max-width:100%;font:italic 900 28px/0.98 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.01em;text-transform:uppercase;text-wrap:balance;
  overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.fl-hl.long .nm{font-size:23px}
.fl-hl.xlong .nm{font-size:19px}
.fl-hl .vl{display:flex;align-items:baseline;gap:5px;min-height:44px}
.fl-hl.b .vl{flex-direction:row-reverse}
.fl-hl .val{font:italic 900 44px/1 'Barlow Condensed','Lilita One',sans-serif;font-variant-numeric:tabular-nums;color:transparent;-webkit-text-stroke:1.5px currentColor;opacity:.32;transition:opacity .25s,color .25s}
.fl-hl.a .val{-webkit-text-stroke-color:#0b0c12}
.fl-hl.b .val{-webkit-text-stroke-color:#fff}
.fl-hl .vl u{text-decoration:none;font:italic 800 14px/1 'Barlow Condensed',sans-serif;letter-spacing:.08em;text-transform:uppercase;opacity:0;transition:opacity .3s .2s}
.fl-hl .bar{position:absolute;left:14px;right:30px;bottom:9px;height:6px;background:rgba(11,12,18,.12);overflow:hidden}
.fl-hl.b .bar{left:34px;right:14px;background:rgba(255,255,255,.14)}
.fl-hl .bar i{position:absolute;top:0;bottom:0;left:0;width:0;background:currentColor;opacity:.55;transition:width .95s cubic-bezier(.2,.8,.2,1)}
.fl-hl.b .bar i{left:auto;right:0}
.fl-hilo.yil .bar{display:none}
/* seçim: levha öne çıkar, üstte altın şerit ve SEÇİMİN etiketi; öteki geri çekilir */
.fl-hl:active{transform:translateY(2px) scale(.985)}
.fl-hl .pl::after{content:'';position:absolute;left:0;right:0;top:0;height:5px;background:#ffc83a;transform:scaleX(0);transform-origin:left;transition:transform .25s}
.fl-hl.b .pl::after{transform-origin:right}
.fl-hl.pick{transform:translateY(-4px);filter:drop-shadow(0 8px 14px rgba(0,0,0,.5))}
.fl-hl.pick .pl::after{transform:scaleX(1)}
.fl-hl.pick::before{content:'SEÇİMİN';position:absolute;top:-11px;z-index:3;padding:3px 9px;background:#ffc83a;color:#1b1200;font:italic 900 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.18em;transform:skewX(-10deg)}
.fl-hl.a.pick::before{left:12px}.fl-hl.b.pick::before{right:12px}
.fl-hilo.chosen .fl-hl:not(.pick){opacity:.72}
/* cevap */
.fl-hl.show .val{color:currentColor;-webkit-text-stroke:0;opacity:1}
.fl-hl.show .vl u{opacity:.7}
.fl-hl.right{opacity:1!important;filter:drop-shadow(0 0 14px rgba(255,200,58,.55)) drop-shadow(0 6px 10px rgba(0,0,0,.45));animation:flHlWin .55s cubic-bezier(.3,1.6,.5,1)}
.fl-hl.right .bar i{background:#ffc83a;opacity:1}
.fl-hl.right .pl::after{transform:scaleX(1);background:#ffc83a}
.fl-hl.right::after{content:'♛ DOĞRU';position:absolute;bottom:-12px;z-index:3;padding:3px 10px;background:#ffc83a;color:#1b1200;font:italic 900 12px/1 'Barlow Condensed',sans-serif;letter-spacing:.14em;transform:skewX(-10deg);animation:flq-pop .4s .35s cubic-bezier(.3,1.6,.5,1) both}
.fl-hl.a.right::after{left:14px}.fl-hl.b.right::after{right:14px}
.fl-hl.lose{opacity:.5!important;filter:grayscale(.7)}
.fl-hl .fl-who{position:absolute;top:-8px;z-index:3;width:16px;height:16px;border-radius:50%;box-shadow:0 0 0 2.5px #0b0c12,0 0 0 4px rgba(255,255,255,.85)}
.fl-hl.a .fl-who{right:40px}.fl-hl.b .fl-who{left:44px}
.fl-hl.a .fl-who+.fl-who{right:62px}.fl-hl.b .fl-who+.fl-who{left:66px}
.fl-hl.a .fl-who+.fl-who+.fl-who{right:84px}.fl-hl.b .fl-who+.fl-who+.fl-who{left:88px}
/* VS elması: kesiğin tam ortasında */
.fl-hilo i.vs{position:absolute;left:50%;top:50%;z-index:4;width:46px;height:46px;margin:-23px 0 0 -31px;display:grid;place-items:center;font-style:normal;
  background:#0b0c12;transform:rotate(45deg);box-shadow:0 0 0 2px #ffc83a,0 0 0 5px #0b0c12,0 6px 16px rgba(0,0,0,.55);animation:flHlVs .45s .18s cubic-bezier(.3,1.7,.5,1) both}
.fl-hilo i.vs b{transform:rotate(-45deg);font:italic 900 19px/1 'Barlow Condensed','Lilita One',sans-serif;color:#ffc83a}
.fl-hilo .df{position:absolute;left:50%;bottom:-34px;z-index:4;transform:translateX(-50%) skewX(-10deg);white-space:nowrap;padding:5px 12px;background:#0b0c12;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.22);font:italic 800 13px/1 'Barlow Condensed',sans-serif;letter-spacing:.14em;color:#fff;animation:flq-pop .4s .9s cubic-bezier(.3,1.6,.5,1) both}
.fl-hilo .df b{color:#ffc83a;font-weight:900;letter-spacing:.04em;font-size:15px}
.fl-hilo.done{margin-bottom:30px}
@keyframes flHlIn{from{opacity:0;transform:translateX(-26px) skewX(6deg)}}
@keyframes flHlInB{from{opacity:0;transform:translateX(26px) skewX(6deg)}}
@keyframes flHlVs{from{opacity:0;transform:rotate(45deg) scale(.3)}}
@keyframes flHlWin{40%{transform:translateY(-6px) scale(1.03)}}
@media (prefers-reduced-motion:reduce){.fl-hl,.fl-hilo i.vs,.fl-hl.right,.fl-hl.right::after,.fl-hilo .df{animation:none}}
@media (max-height:700px){.fl-hilo{height:150px}.fl-hl .nm{font-size:24px}.fl-hl.long .nm{font-size:20px}.fl-hl .val{font-size:36px}}
/* odd */
.fl-odd .fl-opt{min-height:64px;justify-content:center;text-align:center;font-size:17px}
.fl-odd .fl-opt i{position:absolute;top:5px;left:5px;width:20px;height:20px;font-size:12px}
.fl-why{margin-top:10px;padding:9px 12px;border-radius:12px;background:rgba(255,210,90,.16);border:1.5px solid var(--line);font-size:14.5px;line-height:1.3;text-align:center;
  animation:flq-pop .35s cubic-bezier(.3,1.5,.5,1)}
.fl-why b{color:var(--gold)}
/* emoji */
.fl-emo{display:flex;justify-content:center;flex-wrap:wrap;gap:2px 6px;margin:0 0 12px;padding:10px 6px;border-radius:18px;background:radial-gradient(circle at 50% 40%,rgba(255,255,255,.18),rgba(255,255,255,.04));
  border:2px solid rgba(255,255,255,.14)}
.fl-emo span{font-size:clamp(42px,calc(13 * var(--vw)),60px);line-height:1.15;font-family:'Noto Color Emoji','Apple Color Emoji','Segoe UI Emoji',sans-serif;opacity:0;animation:flq-bounce .55s cubic-bezier(.3,1.7,.5,1) forwards}
/* proverb */
.fl-prv{margin:0 0 12px;padding:14px 12px;border-radius:18px;background:linear-gradient(180deg,rgba(255,235,190,.22),rgba(255,235,190,.1));border:2px solid rgba(255,210,90,.4);
  text-align:center;font-size:clamp(19px,calc(5.4 * var(--vw)),24px);line-height:1.5;text-wrap:balance}
.fl-prv::before{content:'❝';display:block;font-size:26px;line-height:.8;color:var(--gold);opacity:.8}
.fl-blank{display:inline-block;min-width:4.2em;padding:0 8px;margin:0 2px;border-radius:9px;background:rgba(0,0,0,.28);border-bottom:3px solid var(--gold);color:var(--gold);
  font-family:'Lilita One';animation:flq-pulse 1.1s ease-in-out infinite}
.fl-blank.set{animation:none;border-color:#fff;color:#fff}
.fl-blank.right{background:#2a9a44;border-color:#fff;color:#fff}
.fl-blank.wrong{background:#c8352a;border-color:#fff;color:#fff}
/* bilmece */
.fl-rid{display:flex;justify-content:center;margin:-2px 0 8px;font-size:44px;line-height:1.1;font-family:"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif;filter:drop-shadow(0 3px 0 rgba(0,0,0,.35))}
.fl-rid span{display:inline-block;animation:flq-float 2.2s ease-in-out infinite}
@keyframes flq-bounce{0%{transform:translateY(24px) scale(.3);opacity:0}100%{transform:none;opacity:1}}
@keyframes flq-pulse{50%{box-shadow:0 0 0 4px rgba(255,210,90,.35)}}
@keyframes flq-float{50%{transform:translateY(-4px) rotate(4deg)}}
`;

const choiceKind = (extra) => ({
	kind: 'exact',
	judge(v, value) {
		return { correct: value === v.right, err: value === v.right ? 0 : 1 };
	},
	...extra,
});

/** 4 şıklı tipler için ortak bot. [lo, hi]: cevap anının süre penceresindeki dilimi (timing.js botTime). */
function choiceBot(v, skill, R, [lo, hi] = [0.05, 0.8], bonus = 0) {
	const ok = R() < Math.min(0.96, pCorrect(skill, v.q.diff) + bonus);
	let value = v.right;
	if (!ok) do value = Math.floor(R() * v.opts.length); while (value === v.right);
	return { value, time: botTime(v, R, skill, lo, hi) };
}

/** a: [doğru, y1, y2, y3] → karıştırılmış şıklar */
function prepChoice(q, R, extra = {}) {
	const order = shuffle([0, 1, 2, 3], R);
	return { q, opts: order.map((i) => q.a[i]), right: order.indexOf(0), ...extra };
}

// ---------------------------------------------------------------- hilo
export const hilo = {
	time: 20,
	label: 'Karşılaştır',
	prepare(q, R) {
		const flip = R() < 0.5; // doğru taraf rastgele zaten veride; ekranda yerlerini de karıştır
		const sides = flip ? [q.right, q.left] : [q.left, q.right];
		return { q, sides, right: sides[0].v > sides[1].v ? 0 : 1 };
	},
	mount(el, v, api) {
		css('pick', CSS);
		const raw = String(v.q.unit || '').trim();
		const unit = raw.replace(/\s*\(.*?\)\s*/g, '').trim(); // "km² (yaklaşık)" → "km²"
		const approx = /yaklaşık/i.test(raw) || /yaklaşık/i.test(v.q.prop || '');
		const mo = unit === 'MÖ' || unit === 'MS';
		// yıl karşılaştırması (icat, kuruluş, tamamlanma yılı…): güç çubuğu anlamsız, fark "yıl" olarak söylenir
		const year = mo || /yıl/i.test(v.q.prop || '') || (!unit && v.sides.every((s) => Number.isInteger(s.v) && s.v >= 1000 && s.v <= 2100));
		const size = (t) => (t.length > 22 ? ' xlong' : t.length > 13 ? ' long' : '');
		el.innerHTML = `<div class="fl-hilo${year ? ' yil' : ''}" lang="tr">${v.sides
			.map(
				(s, i) =>
					`<button class="fl-hl ${'ab'[i]}${size(s.t)}" data-i="${i}" aria-label="${esc(s.t)}"><span class="pl"><span class="nm">${esc(s.t)}</span><span class="vl"><b class="val">?</b><u>${esc(unit)}</u></span><span class="bar"><i></i></span></span></button>`,
			)
			.join('')}<i class="vs"><b>VS</b></i></div>`;
		const box = el.querySelector('.fl-hilo');
		const btns = [...el.querySelectorAll('.fl-hl')];
		let done = false;
		for (const b of btns)
			b.addEventListener('click', () => {
				if (done) return;
				done = true;
				b.classList.add('pick');
				box.classList.add('chosen');
				buzz();
				api.answer(Number(b.dataset.i));
			});
		const countUp = (node, to, dur = 900) => {
			const t0 = clock.now();
			const step = (t) => {
				if (!node.isConnected) return;
				const k = Math.min(1, (t - t0) / dur);
				const e = 1 - Math.pow(1 - k, 3);
				const x = Number.isInteger(to) ? Math.round(to * e) : to * e;
				node.firstChild.nodeValue = fmtNum(k < 1 ? x : to);
				if (k < 1) requestAnimationFrame(step);
			};
			requestAnimationFrame(step);
		};
		return {
			lock() {
				done = true;
			},
			reveal(results) {
				done = true;
				const vals = v.sides.map((s) => s.v);
				const max = Math.max(...vals.map(Math.abs), 1e-9);
				btns.forEach((b, i) => {
					const val = b.querySelector('.val');
					val.textContent = year && !mo ? String(Math.round(vals[i] * 0.6)) : '0';
					b.classList.add('show', i === v.right ? 'right' : 'lose');
					countUp(val, vals[i], year && !mo ? 700 : 950);
					// güç çubuğu: büyüklükle orantılı (en küçüğü de görünsün diye %6 taban)
					const bar = b.querySelector('.bar i');
					requestAnimationFrame(() => (bar.style.width = `${Math.max(6, (Math.abs(vals[i]) / max) * 100).toFixed(1)}%`));
				});
				// fark çipi: "FARK 1.220 m" ya da yıllarda "FARK 3 yıl"; oran büyükse "× 3,2 KAT"
				const d = Math.abs(vals[0] - vals[1]);
				const lo = Math.min(...vals.map(Math.abs));
				const ratio = lo > 0 ? Math.max(...vals.map(Math.abs)) / lo : 0;
				const du = year ? 'yıl' : unit;
				const num = Number.isInteger(d) ? fmtNum(d) : Number(d.toFixed(1)).toLocaleString('tr-TR');
				const kat = !year && ratio >= 2 ? ` · <b>${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1).replace('.', ',')}</b> KAT` : '';
				box.insertAdjacentHTML('beforeend', `<span class="df">FARK ${approx ? '≈ ' : ''}<b>${num}</b> ${esc(du)}${kat}</span>`);
				box.classList.add('done');
				for (const r of results) if (r.value != null) btns[r.value]?.insertAdjacentHTML('beforeend', `<b class="fl-who" style="background:${r.color}"></b>`);
			},
			destroy() {},
		};
	},
	...choiceKind({
		bot(v, skill, R) {
			// değerler birbirine yakınsa bot da şaşırır
			const a = v.sides[0].v;
			const b = v.sides[1].v;
			const ratio = Math.max(a, b) / Math.max(1e-9, Math.min(a, b));
			const close = clamp((1.6 - ratio) * 0.35, 0, 0.3);
			const ok = R() < clamp(pCorrect(skill, v.q.diff) + 0.12 - close, 0.3, 0.96);
			return { value: ok ? v.right : 1 - v.right, time: botTime(v, R, skill, 0, 0.7) };
		},
	}),
};

// ---------------------------------------------------------------- odd
export const odd = {
	time: 20,
	label: 'Farklı olan',
	prepare(q, R) {
		const ord = shuffle([0, 1, 2, 3], R);
		return { q, opts: ord.map((i) => q.opts[i]), right: ord.indexOf(q.odd) };
	},
	mount(el, v, api) {
		css('pick', CSS);
		el.innerHTML = '<div class="fl-odd"></div><div data-r="why"></div>';
		const box = el.querySelector('.fl-odd');
		const ctl = mountChoice(box, v, api);
		return {
			lock: ctl.lock,
			reveal(results) {
				ctl.reveal(results);
				ctl.btns.forEach((b, i) => i !== v.right && !b.classList.contains('wrong') && b.classList.add('dim'));
				if (v.q.why) el.querySelector('[data-r=why]').innerHTML = `<div class="fl-why"><b>${esc(v.opts[v.right])}</b> farklı: ${esc(v.q.why)}</div>`;
			},
			destroy() {},
		};
	},
	...choiceKind({ bot: (v, s, R) => choiceBot(v, s, R, [0.05, 0.8]) }),
};

// ---------------------------------------------------------------- emoji
export const emoji = {
	time: 20,
	label: 'Emoji',
	prepare: (q, R) => prepChoice(q, R),
	mount(el, v, api) {
		css('pick', CSS);
		// her emoji ayrı bir kutu (bayrak/ZWJ dizileri ve renk tonları tek parça)
		const parts = v.q.e.match(/\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?|[\u{1F3FB}-\u{1F3FF}])*|\S/gu) || [];
		el.innerHTML = `<div class="fl-emo">${parts.map((e, i) => `<span style="animation-delay:${0.08 + i * 0.12}s">${e}</span>`).join('')}</div><div data-r="o"></div>`;
		const ctl = mountChoice(el.querySelector('[data-r=o]'), v, api);
		return { lock: ctl.lock, reveal: (r) => ctl.reveal(r), destroy() {} };
	},
	...choiceKind({ bot: (v, s, R) => choiceBot(v, s, R, [0.05, 0.8]) }),
};

// ---------------------------------------------------------------- proverb
export const proverb = {
	time: 20,
	label: 'Atasözü',
	prepare: (q, R) => prepChoice(q, R),
	mount(el, v, api) {
		css('pick', CSS);
		const [pre, post] = v.q.text.split('___');
		el.innerHTML = `<div class="fl-prv">${esc(pre)}<span class="fl-blank">&nbsp;?&nbsp;</span>${esc(post || '')}</div><div data-r="o"></div>`;
		const blank = el.querySelector('.fl-blank');
		const ctl = mountChoice(el.querySelector('[data-r=o]'), v, api, {
			onPick(i) {
				blank.textContent = v.opts[i];
				blank.classList.add('set');
			},
		});
		return {
			lock: ctl.lock,
			reveal(results) {
				ctl.reveal(results);
				const mine = ctl.mine;
				blank.classList.add('set');
				if (mine === v.right) blank.classList.add('right');
				else {
					if (mine != null) blank.classList.add('wrong');
					blank.textContent = v.opts[mine ?? v.right];
					setTimeout(() => {
						blank.classList.remove('wrong');
						blank.classList.add('right');
						blank.textContent = v.opts[v.right];
					}, 650);
				}
			},
			destroy() {},
		};
	},
	...choiceKind({ bot: (v, s, R) => choiceBot(v, s, R, [0.05, 0.75], 0.03) }),
};

// ---------------------------------------------------------------- riddle
export const riddle = {
	time: 23,
	label: 'Bilmece',
	prepare: (q, R) => prepChoice(q, R),
	mount(el, v, api) {
		css('pick', CSS);
		el.innerHTML = '<div class="fl-rid"><span>🧞</span></div><div data-r="o"></div>';
		const ctl = mountChoice(el.querySelector('[data-r=o]'), v, api);
		return { lock: ctl.lock, reveal: (r) => ctl.reveal(r), destroy() {} };
	},
	...choiceKind({ bot: (v, s, R) => choiceBot(v, s, R, [0.1, 0.85], -0.02) }),
};
