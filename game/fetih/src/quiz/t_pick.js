// Seçmeli tipler: hilo, odd, emoji, proverb, riddle.
// Hepsi 'exact' türünde: bildi / bilemedi; eşitlikte hızlı olan kazanır.

import { css, esc, shuffle, pCorrect, thinkTime, mountChoice, buzz, fmtNum, clamp } from './util.js';
import { clock, setTimeout } from '../core/clock.js';

const CSS = /* css */ `
/* hilo */
.fl-hilo{display:grid;grid-template-columns:1fr 1fr;gap:10px;position:relative}
.fl-hl{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:150px;padding:12px 8px;border-radius:18px;text-align:center;
  border:2.5px solid rgba(255,255,255,.3);box-shadow:0 6px 0 rgba(0,0,0,.35);touch-action:manipulation;transition:transform .15s,opacity .3s,filter .3s}
.fl-hl.a{background:linear-gradient(160deg,#4a7be0,#2a4aa8)}
.fl-hl.b{background:linear-gradient(160deg,#f08a3a,#c8501a)}
.fl-hl:active{transform:translateY(3px)}
.fl-hl strong{font-family:'Lilita One';font-weight:400;font-size:clamp(20px,calc(6 * var(--vw)),27px);line-height:1.05;text-wrap:balance;text-shadow:0 2px 0 rgba(0,0,0,.35)}
.fl-hl small{font-size:12px;letter-spacing:.1em;text-transform:uppercase;opacity:.8}
.fl-hl .val{font-family:'Lilita One';font-size:30px;min-height:36px;color:var(--gold);text-shadow:0 2px 0 rgba(0,0,0,.4);opacity:0;transform:scale(.6);transition:opacity .25s,transform .35s cubic-bezier(.3,1.6,.5,1)}
.fl-hl .val u{display:block;text-decoration:none;font-family:'Fredoka';font-size:12px;color:#fff;opacity:.85}
.fl-hl.show .val{opacity:1;transform:scale(1)}
.fl-hl.pick{outline:3px solid #fff;outline-offset:2px;transform:scale(1.03)}
.fl-hl.right{border-color:#7dff9a;box-shadow:0 0 0 3px rgba(125,255,154,.45),0 6px 0 rgba(0,0,0,.35)}
.fl-hl.right::before{content:'♛';position:absolute;top:-16px;left:50%;transform:translateX(-50%);font-size:26px;color:var(--gold);text-shadow:0 2px 0 #6a3a00}
.fl-hl.lose{opacity:.55;filter:saturate(.6)}
.fl-hilo i.vs{position:absolute;left:50%;top:50%;width:38px;height:38px;margin:-19px 0 0 -19px;border-radius:50%;display:grid;place-items:center;font-style:normal;
  font-family:'Lilita One';font-size:15px;background:#101a33;border:2.5px solid var(--gold);color:var(--gold);z-index:2}
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

/** 4 şıklı tipler için ortak bot. */
function choiceBot(v, skill, R, [base, span] = [3, 6], bonus = 0) {
	const ok = R() < Math.min(0.96, pCorrect(skill, v.q.diff) + bonus);
	let value = v.right;
	if (!ok) do value = Math.floor(R() * v.opts.length); while (value === v.right);
	return { value, time: thinkTime(R, base, span) };
}

/** a: [doğru, y1, y2, y3] → karıştırılmış şıklar */
function prepChoice(q, R, extra = {}) {
	const order = shuffle([0, 1, 2, 3], R);
	return { q, opts: order.map((i) => q.a[i]), right: order.indexOf(0), ...extra };
}

// ---------------------------------------------------------------- hilo
export const hilo = {
	time: 10,
	label: 'Karşılaştır',
	prepare(q, R) {
		const flip = R() < 0.5; // doğru taraf rastgele zaten veride; ekranda yerlerini de karıştır
		const sides = flip ? [q.right, q.left] : [q.left, q.right];
		return { q, sides, right: sides[0].v > sides[1].v ? 0 : 1 };
	},
	mount(el, v, api) {
		css('pick', CSS);
		const unit = v.q.unit || '';
		el.innerHTML = `<div class="fl-hilo">${v.sides
			.map((s, i) => `<button class="fl-hl ${'ab'[i]}" data-i="${i}"><strong>${esc(s.t)}</strong><small>${esc(v.q.prop || '')}</small><div class="val">?</div></button>`)
			.join('')}<i class="vs">VS</i></div>`;
		const btns = [...el.querySelectorAll('.fl-hl')];
		let done = false;
		for (const b of btns)
			b.addEventListener('click', () => {
				if (done) return;
				done = true;
				b.classList.add('pick');
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
				btns.forEach((b, i) => {
					const val = b.querySelector('.val');
					val.innerHTML = `0<u>${esc(unit)}</u>`;
					b.classList.add('show', i === v.right ? 'right' : 'lose');
					countUp(val, v.sides[i].v);
				});
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
			return { value: ok ? v.right : 1 - v.right, time: thinkTime(R, 1.8, 4) };
		},
	}),
};

// ---------------------------------------------------------------- odd
export const odd = {
	time: 15,
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
	...choiceKind({ bot: (v, s, R) => choiceBot(v, s, R, [3, 6]) }),
};

// ---------------------------------------------------------------- emoji
export const emoji = {
	time: 15,
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
	...choiceKind({ bot: (v, s, R) => choiceBot(v, s, R, [2.5, 6]) }),
};

// ---------------------------------------------------------------- proverb
export const proverb = {
	time: 15,
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
	...choiceKind({ bot: (v, s, R) => choiceBot(v, s, R, [3, 6], 0.03) }),
};

// ---------------------------------------------------------------- riddle
export const riddle = {
	time: 20,
	label: 'Bilmece',
	prepare: (q, R) => prepChoice(q, R),
	mount(el, v, api) {
		css('pick', CSS);
		el.innerHTML = '<div class="fl-rid"><span>🧞</span></div><div data-r="o"></div>';
		const ctl = mountChoice(el.querySelector('[data-r=o]'), v, api);
		return { lock: ctl.lock, reveal: (r) => ctl.reveal(r), destroy() {} };
	},
	...choiceKind({ bot: (v, s, R) => choiceBot(v, s, R, [4, 8], -0.02) }),
};
