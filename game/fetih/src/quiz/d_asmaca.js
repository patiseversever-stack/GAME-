// YENİ · deneme grubu: Adam Asmaca'nın klavyesiz iki mini oyun hali (kullanıcı ikisine bakıp birini seçecek).
//   A · KASA      kelime bir kasanın şifresi. Alttan yükselen çelik kadran parmakla çevrilir; harfe dokununca kadran o
//                 harfe döner ve harf denenir (okuma penceresine dokunmak da pencerdeki harfi dener). 6 yanlışta alarm.
//   B · HARF AVI  3×8 harf ızgarasında kelime yılan gibi saklı. Parmakla harfleri sırayla çizersin; komşu (çapraz da)
//                 harfler birleşir, geri çekince son harf silinir. Yanlış çizim bir hak yer ve sıradaki harfi ipucu açar.
// Cevap biçimi eski Adam asmaca ile aynı: { ok, wrong } (judge/bot da aynı), maç tarafı değişmez.
// Sözleşme: TYPES, ORDER, SAMPLES (bkz. deneme.js). Örnekler soru bankasındaki adam asmaca soruları.

import { css, esc, shuffle, pCorrect, buzz, trUp } from './util.js';
import { botTime, PROFILE } from './timing.js';
import { TYPES as BASE } from './types.js';
import { BANK } from '../data/bank.js';
import { setTimeout } from '../core/clock.js';

const ABC = [...'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'];

Object.assign(PROFILE, {
	asmaca_kasa: { ...PROFILE.hang },
	asmaca_av: { min: 16, max: 42, think: [3.5, 1.5] },
});

const CSS = /* css */ `
/* ortak: harf yuvaları */
.as-slots{display:flex;justify-content:center;gap:4px;max-width:100%;perspective:400px}
.as-slots b{position:relative;flex:0 1 auto;width:var(--sw,34px);height:40px;display:grid;place-items:center;border-radius:6px;background:#151b33;
  box-shadow:inset 0 -3px 0 rgba(255,210,90,.45),inset 0 0 0 1px rgba(255,255,255,.08);font:400 23px/1 'Lilita One',sans-serif;color:#0e1430;transition:background .2s}
.as-slots s{flex:none;width:10px}
.as-slots b.on{background:linear-gradient(180deg,#fff,#e4e9f4);box-shadow:inset 0 -3px 0 #ffd25a;animation:asFlip .42s cubic-bezier(.3,1.4,.5,1) both}
.as-slots b.tip{background:linear-gradient(180deg,#3b2e0a,#251c06);color:#ffd25a;box-shadow:inset 0 -3px 0 #ffd25a,inset 0 0 0 1px rgba(255,210,90,.4);animation:asFlip .42s both}
.as-slots b.tr{background:rgba(255,210,90,.22);color:#fff;box-shadow:inset 0 -3px 0 #fff}
.as-slots b.miss{background:#2a0f14;color:#ff7a66;box-shadow:inset 0 -3px 0 #ff5a3a,inset 0 0 0 1px rgba(255,90,58,.5);animation:asFlip .42s both}
.as-slots.win b{background:linear-gradient(180deg,#5ff08a,#16a64c);color:#fff;text-shadow:0 2px 0 rgba(0,60,20,.35);box-shadow:inset 0 -3px 0 #0b6a2a;animation:asWin .5s calc(var(--k) * 45ms) cubic-bezier(.3,1.8,.5,1) both}
.as-slots.bad{animation:flq-shake .4s}
@keyframes asFlip{from{transform:rotateX(90deg)}to{transform:none}}
@keyframes asWin{40%{transform:translateY(-7px) scale(1.08)}100%{transform:none}}
.fl-q:not(.map):has(.as-kasa,.as-av) .fl-qbody{margin-bottom:24px}

/* ---------------- A · KASA */
.as-kasa{display:flex;flex-direction:column;align-items:center;gap:10px}
.as-dw{position:relative;width:100%;height:136px;overflow:hidden;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}
.as-dw.drag{cursor:grabbing}
.as-dial{position:absolute;left:50%;top:6px;width:var(--D);height:var(--D);margin-left:calc(var(--D) / -2);border-radius:50%;
  background:radial-gradient(circle,#0b0f20 0 calc(var(--r) - 38px),#141a33 calc(var(--r) - 37px) calc(var(--r) - 24px),#1d2546 calc(var(--r) - 23px) calc(var(--D) / 2 - 6px),#ffd25a calc(var(--D) / 2 - 5px) calc(var(--D) / 2 - 3px),#7a5a12 calc(var(--D) / 2 - 2px));
  box-shadow:0 -6px 24px rgba(0,0,0,.6),inset 0 2px 0 rgba(255,255,255,.08)}
/* çentikler (harf aralarında) ve tırtıklı iç halka */
.as-dial::before{content:'';position:absolute;inset:3px;border-radius:50%;
  background:repeating-conic-gradient(from calc(var(--st) / 2 - .5deg + var(--rot)),rgba(255,255,255,.28) 0 1deg,transparent 1deg var(--st));
  -webkit-mask:radial-gradient(circle,transparent calc(var(--D) / 2 - 15px),#000 calc(var(--D) / 2 - 14px) calc(var(--D) / 2 - 6px),transparent calc(var(--D) / 2 - 5px));
  mask:radial-gradient(circle,transparent calc(var(--D) / 2 - 15px),#000 calc(var(--D) / 2 - 14px) calc(var(--D) / 2 - 6px),transparent calc(var(--D) / 2 - 5px))}
.as-dial::after{content:'';position:absolute;inset:0;border-radius:50%;
  background:repeating-conic-gradient(from var(--rot),rgba(255,255,255,.07) 0 2deg,transparent 2deg 4deg);
  -webkit-mask:radial-gradient(circle,transparent calc(var(--r) - 38px),#000 calc(var(--r) - 37px) calc(var(--r) - 25px),transparent calc(var(--r) - 24px));
  mask:radial-gradient(circle,transparent calc(var(--r) - 38px),#000 calc(var(--r) - 37px) calc(var(--r) - 25px),transparent calc(var(--r) - 24px))}
.as-l{position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-17px 0 0 -17px;display:grid;place-items:center;border-radius:50%;
  transform:rotate(calc(var(--a) + var(--rot))) translateY(calc(var(--r) * -1)) rotate(calc((var(--a) + var(--rot)) * -1));
  font:400 23px/1 'Lilita One',sans-serif;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.45);transition:color .2s,opacity .2s}
.as-l.ok{color:#ffd25a}
.as-l.no{color:#ff6a55;opacity:.4}
.as-l.no::after{content:'';position:absolute;left:6px;right:6px;top:50%;height:2.5px;margin-top:-1px;background:#ff6a55;transform:rotate(-35deg);border-radius:2px}
.as-l.sug{animation:asSug .6s ease-in-out infinite alternate}
@keyframes asSug{to{background:rgba(236,79,147,.55);box-shadow:0 0 0 3px #ec4f93}}
/* okuma penceresi: kadranın tepesinde, dokununca penceredeki harf denenir */
.as-win{position:absolute;left:50%;top:0;z-index:3;width:56px;height:74px;margin-left:-28px;border-radius:0 0 12px 12px;border:3px solid #ffd25a;border-top:0;
  background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.04) 45%,rgba(255,210,90,.12));box-shadow:0 0 18px rgba(255,210,90,.45),inset 0 0 12px rgba(255,210,90,.25);
  display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;font:italic 800 10px 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:#ffd25a;pointer-events:none}
.as-win::before{content:'';position:absolute;left:50%;top:0;margin-left:-8px;border:8px solid transparent;border-top:9px solid #ffd25a}
.as-l.at{color:#fff;transform:rotate(calc(var(--a) + var(--rot))) translateY(calc(var(--r) * -1)) rotate(calc((var(--a) + var(--rot)) * -1)) scale(1.35);text-shadow:0 0 12px rgba(255,210,90,.9),0 2px 0 rgba(0,0,0,.5)}
.as-l.at.ok{color:#ffd25a}
.as-dw.err .as-win{border-color:#ff5a3a;box-shadow:0 0 22px rgba(255,90,58,.8)}
.as-dw.err .as-dial{animation:flq-shake .35s}
/* alarm lambaları: kadranın boş kalan sol üst köşesinde */
.as-alarm{position:absolute;left:2px;top:4px;z-index:3;display:flex;flex-direction:column;gap:5px;pointer-events:none}
.as-alarm small{font:italic 800 10px 'Barlow Condensed',sans-serif;letter-spacing:.2em;color:rgba(255,255,255,.55)}
.as-alarm div{display:flex;gap:5px}
.as-alarm i{width:11px;height:11px;border-radius:50%;background:#2a1216;box-shadow:inset 0 1px 2px rgba(0,0,0,.6),0 0 0 1.5px rgba(255,90,58,.35);transition:background .2s,box-shadow .2s}
.as-alarm i.on{background:radial-gradient(circle at 35% 35%,#ffb0a0,#ff3a2a 60%);box-shadow:0 0 10px #ff3a2a,0 0 0 1.5px #fff}
.as-hint{position:absolute;right:2px;top:4px;z-index:3;text-align:right;font:italic 800 10px/1.35 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:rgba(255,255,255,.5);pointer-events:none}
.as-emb{position:absolute;left:0;right:0;bottom:6px;z-index:1;text-align:center;font:italic 800 24px/1 'Barlow Condensed',sans-serif;letter-spacing:.5em;padding-left:.5em;color:rgba(255,210,90,.1);pointer-events:none;text-shadow:0 -1px 0 rgba(0,0,0,.6)}
.as-kasa.open .as-emb{color:rgba(95,240,138,.6);text-shadow:0 0 12px rgba(95,240,138,.7);transition:color .4s .5s}
.as-kasa.done .as-dw{pointer-events:none}
.as-kasa.open .as-dial{transition:transform 1s cubic-bezier(.3,1.2,.4,1);transform:rotate(360deg)}

/* ---------------- B · HARF AVI */
.as-av{display:flex;flex-direction:column;align-items:center;gap:10px}
.as-row{display:flex;align-items:center;justify-content:space-between;width:100%;font:italic 800 11px 'Barlow Condensed',sans-serif;letter-spacing:.18em;color:rgba(255,255,255,.55)}
.as-row .hp{display:flex;align-items:center;gap:5px}
.as-row .hp i{width:15px;height:17px;background:linear-gradient(#ffe680,#e8980e);-webkit-mask:var(--tw) center/contain no-repeat;mask:var(--tw) center/contain no-repeat;transition:transform .35s,opacity .35s;transform-origin:50% 100%}
.as-row .hp i.down{transform:rotate(28deg) translateY(3px) scale(.85);opacity:.2}
.as-grid{position:relative;display:grid;grid-template-columns:repeat(8,1fr);gap:5px;width:100%;touch-action:none;user-select:none;-webkit-user-select:none}
.as-c{position:relative;z-index:1;aspect-ratio:1/1;max-height:46px;display:grid;place-items:center;border-radius:9px;background:linear-gradient(180deg,#1d2546,#141a33);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),0 3px 0 #070a16;font:400 22px/1 'Lilita One',sans-serif;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.4);transition:background .15s,color .15s,transform .15s}
.as-c.in{background:linear-gradient(180deg,#ffe680,#ffbb1f);color:#3a1a00;text-shadow:none;box-shadow:0 3px 0 #a86a0a;transform:scale(1.06)}
.as-c.head{box-shadow:0 0 0 3px #fff,0 3px 0 #a86a0a,0 0 16px rgba(255,210,90,.9)}
.as-c.sug{animation:asSug .6s ease-in-out infinite alternate}
.as-grid svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;overflow:visible}
.as-grid polyline{fill:none;stroke:#ffd25a;stroke-width:14;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 6px rgba(255,210,90,.8))}
.as-grid.bad polyline{stroke:#ff5a3a;filter:drop-shadow(0 0 8px rgba(255,58,42,.9))}
.as-grid.bad .as-c.in{background:linear-gradient(180deg,#ff7a66,#c42a1a);color:#fff;box-shadow:0 3px 0 #7a120a}
.as-grid.bad{animation:flq-shake .4s}
.as-grid.win polyline{stroke:#5ff08a;filter:drop-shadow(0 0 8px rgba(95,240,138,.9))}
.as-grid.win .as-c.in{background:linear-gradient(180deg,#5ff08a,#16a64c);color:#fff;box-shadow:0 3px 0 #0b6a2a;animation:asWin .5s calc(var(--k) * 45ms) cubic-bezier(.3,1.8,.5,1) both}
.as-grid.show .as-c.ans{background:linear-gradient(180deg,#5ff08a,#16a64c);color:#fff;box-shadow:0 3px 0 #0b6a2a}
.as-av.done .as-grid{pointer-events:none}
.as-av .fl-key,.as-kasa .fl-key{display:none}
`;

// ---------------------------------------------------------------- ortak
const word0 = (q) => trUp(q.w);
const slotsHTML = (chars) => chars.map((c, i) => (c === ' ' ? '<s></s>' : `<b data-i="${i}"></b>`)).join('');
const slotW = (n) => `--sw:${Math.min(34, Math.floor((370 - (n - 1) * 4) / n))}px`;
const base = {
	kind: 'exact',
	judge: BASE.hang.judge,
	bot: BASE.hang.bot,
};

// ---------------------------------------------------------------- A · KASA
export const asmaca_kasa = {
	...base,
	time: BASE.hang.time,
	label: 'Adam asmaca · Kasa',
	prepare(q) {
		return { q, word: word0(q) };
	},
	mount(el, v, api) {
		css('asmaca', CSS);
		const chars = [...v.word];
		const MAX = 6;
		const N = ABC.length;
		const ST = 360 / N;
		const shown = chars.map((c) => c === ' ' || !ABC.includes(c));
		el.innerHTML = `<div class="as-kasa">
			<div class="as-slots" style="${slotW(chars.length)}">${slotsHTML(chars)}</div>
			<div class="as-dw">
				<div class="as-alarm"><small>ALARM</small><div>${'<i></i>'.repeat(MAX)}</div></div>
				<div class="as-hint">ÇEVİR<br>YA DA DOKUN</div>
				<div class="as-dial">${ABC.map((c, i) => `<span class="as-l" data-k="${c}" style="--a:${(i * ST).toFixed(3)}deg">${c}</span>`).join('')}</div>
				<div class="as-win">DENE</div>
				<div class="as-emb">KASA</div>
			</div>
			${ABC.map((c) => `<button class="fl-key" data-k="${c}"></button>`).join('')}
		</div>`;
		const root = el.querySelector('.as-kasa');
		const slots = [...el.querySelectorAll('.as-slots b')];
		const slotsEl = el.querySelector('.as-slots');
		const dw = el.querySelector('.as-dw');
		const dial = el.querySelector('.as-dial');
		const leds = [...el.querySelectorAll('.as-alarm i')];
		const L = [...el.querySelectorAll('.as-l')];
		const W = Math.min(dw.clientWidth || 380, 420);
		const D = Math.round(W * 1.02);
		const r = D / 2 - 30;
		dial.style.setProperty('--D', D + 'px');
		dial.style.setProperty('--r', r + 'px');
		dial.style.setProperty('--st', ST + 'deg');
		chars.forEach((c, i) => shown[i] && c !== ' ' && slots.find((s) => +s.dataset.i === i)?.classList.add('on'));
		for (const s of slots) if (shown[+s.dataset.i]) s.textContent = chars[+s.dataset.i];

		let rot = 0;
		let wrong = 0;
		let done = false;
		let anim = 0;
		const used = new Set();
		const at = () => (((Math.round(-rot / ST) % N) + N) % N);
		let lastAt = -1;
		const paint = () => {
			dial.style.setProperty('--rot', rot.toFixed(2) + 'deg');
			const k = at();
			if (k !== lastAt) {
				L[lastAt]?.classList.remove('at');
				L[k].classList.add('at');
				if (lastAt >= 0) buzz(3);
				lastAt = k;
			}
		};
		paint();
		let pending = null; // yarıda kalan dönüşün işi (hızlı ardışık dokunuşta kaybolmasın)
		const tween = (to, ms, then) => {
			cancelAnimationFrame(anim);
			if (pending) {
				const f = pending;
				pending = null;
				f();
			}
			pending = then || null;
			const from = rot;
			const t0 = performance.now();
			const step = (t) => {
				const p = Math.min(1, (t - t0) / ms);
				const e = 1 - Math.pow(1 - p, 3);
				rot = from + (to - from) * e;
				paint();
				if (p < 1) anim = requestAnimationFrame(step);
				else if (pending) {
					const f = pending;
					pending = null;
					f();
				}
			};
			anim = requestAnimationFrame(step);
		};
		const snapTo = (k, then) => {
			let target = -k * ST;
			while (target - rot > 180) target -= 360;
			while (target - rot < -180) target += 360;
			tween(target, Math.min(520, 160 + Math.abs(target - rot) * 2.2), then);
		};
		const flash = () => {
			dw.classList.remove('err');
			void dw.offsetWidth;
			dw.classList.add('err');
			setTimeout(() => dw.classList.remove('err'), 420);
		};
		const fire = (k) => {
			if (done) return;
			const c = ABC[k];
			if (used.has(c)) return flash();
			used.add(c);
			let hit = false;
			chars.forEach((x, i) => {
				if (x === c && !shown[i]) {
					shown[i] = true;
					hit = true;
					const s = slots.find((b) => +b.dataset.i === i);
					if (s) {
						s.textContent = c;
						s.style.animationDelay = `${(i % 6) * 40}ms`;
						s.classList.add('on');
					}
				}
			});
			L[k].classList.add(hit ? 'ok' : 'no');
			if (hit) buzz(12);
			else {
				leds[wrong]?.classList.add('on');
				wrong++;
				buzz(40);
				flash();
			}
			if (shown.every(Boolean)) {
				done = true;
				root.classList.add('done', 'open');
				slots.forEach((s, i) => s.style.setProperty('--k', i));
				slotsEl.classList.add('win');
				api.answer({ ok: true, wrong });
			} else if (wrong >= MAX) {
				done = true;
				root.classList.add('done');
				slotsEl.classList.add('bad');
				api.answer({ ok: false, wrong });
			}
		};
		// sürükle: kadran parmağı izler; fırlatınca süzülür ve en yakın harfte durur (denemez). Dokun: o harfe dön ve dene.
		const degPx = 180 / (Math.PI * r);
		let drag = null;
		dw.addEventListener('pointerdown', (e) => {
			if (done) return;
			cancelAnimationFrame(anim);
			if (pending) {
				const f = pending;
				pending = null;
				f();
			}
			dw.setPointerCapture?.(e.pointerId);
			drag = { x: e.clientX, rot0: rot, moved: false, t: performance.now(), lx: e.clientX, vx: 0, target: e.target };
			dw.classList.add('drag');
		});
		dw.addEventListener('pointermove', (e) => {
			if (!drag) return;
			const dx = e.clientX - drag.x;
			if (Math.abs(dx) > 6) drag.moved = true;
			const now = performance.now();
			const dt = Math.max(1, now - drag.t);
			drag.vx = 0.7 * drag.vx + 0.3 * ((e.clientX - drag.lx) / dt);
			drag.lx = e.clientX;
			drag.t = now;
			if (drag.moved) {
				rot = drag.rot0 + dx * degPx;
				paint();
			}
		});
		const up = (e) => {
			if (!drag) return;
			const d = drag;
			drag = null;
			dw.classList.remove('drag');
			if (done) return;
			if (d.moved) {
				const fling = Math.max(-260, Math.min(260, d.vx * 260 * degPx));
				const k = (((Math.round(-(rot + fling) / ST) % N) + N) % N);
				let target = -k * ST;
				const goal = rot + fling;
				while (target - goal > 180) target -= 360;
				while (target - goal < -180) target += 360;
				tween(target, 380 + Math.abs(fling) * 2.4);
				return;
			}
			const hitL = e.target.closest?.('.as-l') || document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.as-l');
			const k = hitL ? L.indexOf(hitL) : at();
			snapTo(k, () => fire(k));
		};
		dw.addEventListener('pointerup', up);
		dw.addEventListener('pointercancel', () => {
			drag = null;
			dw.classList.remove('drag');
		});
		// jokerler gizli .fl-key düğmelerine basar (harf açan joker) ya da .sug ekler (seyirci önerisi): kadrana yansıt
		for (const b of el.querySelectorAll('.fl-key'))
			b.addEventListener('click', () => {
				const k = ABC.indexOf(b.dataset.k);
				if (k >= 0) snapTo(k, () => fire(k));
			});
		new MutationObserver(() => {
			for (const b of el.querySelectorAll('.fl-key.sug')) L[ABC.indexOf(b.dataset.k)]?.classList.add('sug');
		}).observe(root, { subtree: true, attributes: true, attributeFilter: ['class'] });
		return {
			lock() {
				done = true;
				root.classList.add('done');
			},
			reveal() {
				chars.forEach((c, i) => {
					if (shown[i]) return;
					const s = slots.find((b) => +b.dataset.i === i);
					if (s) {
						s.textContent = c;
						s.classList.add('miss');
					}
				});
			},
			destroy() {
				cancelAnimationFrame(anim);
			},
		};
	},
};

// ---------------------------------------------------------------- B · HARF AVI
const COLS = 8;
const ROWS = 3;
const near = (a, b) => a !== b && Math.abs((a % COLS) - (b % COLS)) <= 1 && Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS)) <= 1;
/** Izgarada n uzunlukta, kendini kesmeyen rastgele yol (8 komşu). Düz çizgileri az, kıvrımlıyı çok sever. */
function snake(n, R) {
	for (let tries = 0; tries < 400; tries++) {
		const path = [Math.floor(R() * COLS * ROWS)];
		const dfs = () => {
			if (path.length === n) return true;
			const cur = path[path.length - 1];
			const nb = shuffle(
				[...Array(COLS * ROWS).keys()].filter((c) => near(c, cur) && !path.includes(c)),
				R,
			);
			for (const c of nb) {
				path.push(c);
				if (dfs()) return true;
				path.pop();
			}
			return false;
		};
		if (dfs()) {
			// tamamen düz yol çok kolay: en az iki yön değişimi iste (kısa kelimelerde bir)
			let turns = 0;
			for (let i = 2; i < path.length; i++) if (path[i] - path[i - 1] !== path[i - 1] - path[i - 2]) turns++;
			if (turns >= Math.min(2, n - 2)) return path;
		}
	}
	return [...Array(n).keys()];
}

export const asmaca_av = {
	...base,
	time: BASE.hang.time,
	label: 'Adam asmaca · Harf Avı',
	prepare(q, R = Math.random) {
		const word = word0(q);
		const letters = [...word].filter((c) => c !== ' ');
		const path = snake(letters.length, R);
		// boş hücreler: kelimenin harfleri (yanıltıcı) ve sık Türkçe harfler karışık
		const pool = [...letters, ...letters, ...'AEİRLNKMDYSTUOBÜŞZĞÇ'];
		const grid = Array.from({ length: COLS * ROWS }, () => pool[Math.floor(R() * pool.length)]);
		path.forEach((c, i) => (grid[c] = letters[i]));
		return { q, word, grid, path };
	},
	mount(el, v, api) {
		css('asmaca', CSS);
		const chars = [...v.word];
		const letters = chars.filter((c) => c !== ' ');
		const target = letters.join('');
		const MAX = 3;
		el.innerHTML = `<div class="as-av">
			<div class="as-slots" style="${slotW(chars.length)}">${slotsHTML(chars)}</div>
			<div class="as-row"><span>HARFLERİ SIRAYLA ÇİZ</span><span class="hp">HAK ${'<i></i>'.repeat(MAX)}</span></div>
			<div class="as-grid">${v.grid.map((c, i) => `<b class="as-c" data-c="${i}">${esc(c)}</b>`).join('')}<svg><polyline points=""/></svg></div>
			${[...new Set(letters)].map((c) => `<button class="fl-key" data-k="${c}"></button>`).join('')}
		</div>`;
		const root = el.querySelector('.as-av');
		const gridEl = el.querySelector('.as-grid');
		const cells = [...el.querySelectorAll('.as-c')];
		const line = el.querySelector('polyline');
		const slotsEl = el.querySelector('.as-slots');
		const slots = [...el.querySelectorAll('.as-slots b')];
		const hp = [...el.querySelectorAll('.as-row .hp i')];
		const pos = chars.map((c, i) => i).filter((i) => chars[i] !== ' '); // harf sırası → yuva indeksi
		const tips = new Set(); // ipucu açılan harf sıraları
		let path = [];
		let wrong = 0;
		let done = false;
		const center = (c) => {
			const b = cells[c];
			return [b.offsetLeft + b.offsetWidth / 2, b.offsetTop + b.offsetHeight / 2];
		};
		const paintSlots = () => {
			slots.forEach((s, k) => {
				const n = pos.indexOf(+s.dataset.i);
				const tr = n < path.length ? v.grid[path[n]] : null;
				s.classList.toggle('tr', !!tr);
				s.classList.toggle('tip', tips.has(n) && !tr);
				s.textContent = tr || (tips.has(n) ? letters[n] : '');
			});
		};
		const paint = () => {
			cells.forEach((b, i) => {
				b.classList.toggle('in', path.includes(i));
				b.classList.toggle('head', path[path.length - 1] === i && !done);
				const k = path.indexOf(i);
				if (k >= 0) b.style.setProperty('--k', k);
			});
			line.setAttribute('points', path.map((c) => center(c).join(',')).join(' '));
			paintSlots();
		};
		const cellAt = (e) => {
			const r = gridEl.getBoundingClientRect();
			const x = e.clientX - r.left;
			const y = e.clientY - r.top;
			return cellXY(x, y);
		};
		const cellXY = (x, y) => {
			for (let i = 0; i < cells.length; i++) {
				const b = cells[i];
				const cx = b.offsetLeft + b.offsetWidth / 2;
				const cy = b.offsetTop + b.offsetHeight / 2;
				if (Math.hypot(x - cx, y - cy) < b.offsetWidth * 0.42) return i;
			}
			return -1;
		};
		const add = (c) => {
			if (c < 0) return;
			const last = path[path.length - 1];
			if (c === last) return;
			if (path.length >= 2 && c === path[path.length - 2]) {
				path.pop();
				buzz(4);
				return paint();
			}
			if (path.includes(c)) return;
			if (path.length && !near(c, last)) return;
			if (path.length >= letters.length) return;
			path.push(c);
			buzz(6);
			paint();
		};
		const lose = () => {
			hp[wrong]?.classList.add('down');
			wrong++;
			buzz(40);
			// her yanlış çizim sıradaki harfi ipucu olarak açar
			for (let n = 0; n < letters.length; n++)
				if (!tips.has(n)) {
					tips.add(n);
					break;
				}
		};
		const check = () => {
			if (path.length < 2) {
				path = [];
				return paint();
			}
			const got = path.map((c) => v.grid[c]).join('');
			if (got === target) {
				done = true;
				root.classList.add('done');
				gridEl.classList.add('win');
				slots.forEach((s, i) => s.style.setProperty('--k', i));
				paint();
				slotsEl.classList.add('win');
				api.answer({ ok: true, wrong });
				return;
			}
			if (path.length < letters.length) {
				// kısa çizim: ceza yok, yuvalar sallanır
				slotsEl.classList.remove('bad');
				void slotsEl.offsetWidth;
				slotsEl.classList.add('bad');
				path = [];
				return paint();
			}
			gridEl.classList.add('bad');
			lose();
			setTimeout(() => {
				gridEl.classList.remove('bad');
				path = [];
				paint();
				if (wrong >= MAX) {
					done = true;
					root.classList.add('done');
					api.answer({ ok: false, wrong });
				}
			}, 420);
		};
		let down = false;
		let last = null; // son parmak noktası (ızgaraya göre)
		gridEl.addEventListener('pointerdown', (e) => {
			if (done || gridEl.classList.contains('bad')) return;
			gridEl.setPointerCapture?.(e.pointerId);
			down = true;
			path = [];
			const r = gridEl.getBoundingClientRect();
			last = [e.clientX - r.left, e.clientY - r.top];
			add(cellAt(e));
		});
		// hızlı kaydırmada kareler arası olaylar birleşir: son noktadan bu noktaya 6 px adımlarla örnekle, hücre atlanmasın
		gridEl.addEventListener('pointermove', (e) => {
			if (!down) return;
			const r = gridEl.getBoundingClientRect();
			const evs = e.getCoalescedEvents?.() || [];
			for (const ev of evs.length ? evs : [e]) {
				const x = ev.clientX - r.left;
				const y = ev.clientY - r.top;
				const n = Math.max(1, Math.ceil(Math.hypot(x - last[0], y - last[1]) / 6));
				for (let k = 1; k <= n; k++) add(cellXY(last[0] + ((x - last[0]) * k) / n, last[1] + ((y - last[1]) * k) / n));
				last = [x, y];
			}
		});
		const up = () => {
			if (!down) return;
			down = false;
			check();
		};
		gridEl.addEventListener('pointerup', up);
		gridEl.addEventListener('pointercancel', up);
		// jokerler: harf açan joker ipucu yuvası açar; seyirci önerisi o harfin yoldaki hücresini yakar
		for (const k of el.querySelectorAll('.fl-key'))
			k.addEventListener('click', () => {
				letters.forEach((c, n) => c === k.dataset.k && tips.add(n));
				paintSlots();
			});
		new MutationObserver(() => {
			for (const k of el.querySelectorAll('.fl-key.sug')) {
				const n = letters.indexOf(k.dataset.k);
				if (n >= 0) cells[v.path[n]]?.classList.add('sug');
			}
		}).observe(root, { subtree: true, attributes: true, attributeFilter: ['class'] });
		requestAnimationFrame(paint);
		return {
			lock() {
				done = true;
				root.classList.add('done');
			},
			reveal() {
				if (gridEl.classList.contains('win')) return;
				path = v.path.slice();
				gridEl.classList.add('show');
				v.path.forEach((c) => cells[c].classList.add('ans'));
				paint();
				slots.forEach((s) => {
					const n = pos.indexOf(+s.dataset.i);
					s.textContent = letters[n];
					s.className = 'miss';
				});
			},
			destroy() {},
		};
	},
};

export const TYPES = { asmaca_kasa, asmaca_av };

export const ORDER = [
	['asmaca_kasa', 'Adam Asmaca A · Kasa', 'Kadranı çevir, harfe dokun, kasayı aç'],
	['asmaca_av', 'Adam Asmaca B · Harf Avı', 'Harfleri sırayla çizerek kelimeyi bul'],
];

const HANG = BANK.filter((q) => q.type === 'hang').sort((a, b) => a.id.localeCompare(b.id));
const pickS = () => {
	const out = [];
	for (const d of [1, 2, 3]) out.push(...HANG.filter((q) => q.diff === d && !out.includes(q)).slice(0, 2));
	return out.slice(0, 6);
};
export const SAMPLES = { asmaca_kasa: pickS(), asmaca_av: pickS() };
