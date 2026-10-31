// YENİ · deneme: Adam Asmaca'nın klavyesiz hali "GÜLLE" (kullanıcı onayına sunulur; onaylanırsa oyundaki adam
// asmacanın yerini alır). Önceki iki deneme (Kasa kadranı, Harf Avı çizimi) "harf bulmak çok uzun sürüyor" diye elendi.
//
// Kelime bir kale duvarına gizli (taş bloklar). Altta yalnızca birkaç büyük demir gülle: kelimenin harfleri + birkaç
// tuzak harf (en çok 13). Gülleye dokun ya da yukarı fırlat: harf kelimedeyse gülle yay çizip duvara çarpar, o harfin
// bütün blokları kırılıp harf yanar; tuzaksa duvardan seker, düşer ve bir kale burcu yıkılır. 3 burç giderse kaybedersin.
// 29 harf yerine 10–13 büyük hedef: aramak yok, düşünmek var (tuzaklar). Cevap biçimi eski adam asmacayla aynı
// ({ ok, wrong }; judge/bot aynı), maç tarafı değişmez.
// Sözleşme: TYPES, ORDER, SAMPLES (bkz. deneme.js). Örnekler soru bankasındaki adam asmaca soruları.

import { css, shuffle, buzz, trUp } from './util.js';
import { PROFILE } from './timing.js';
import { TYPES as BASE } from './types.js';
import { BANK } from '../data/bank.js';
import { setTimeout } from '../core/clock.js';
import { appOf, sfx } from './d_ortak.js';

const ABC = [...'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'];
// tuzak harf havuzu: Türkçede sık geçen harfler (tuzak inandırıcı olsun)
const COMMON = [...'AEİIRLNKMDYSTUOBÜŞZGÇHP'];
const MAX = 3;

Object.assign(PROFILE, { asmaca_gulle: { ...PROFILE.hang } });

const CSS = /* css */ `
.gl{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:8px}
.fl-q:not(.map):has(.gl) .fl-qbody{margin-bottom:24px}
/* kale: mazgallı üst kenar + burçlar (hak) + taş bloklarda gizli kelime */
.gl-wall{position:relative;display:flex;flex-direction:column;align-items:center;gap:0;padding:12px 10px 8px;width:100%;
  background:linear-gradient(180deg,#2a2f45,#1b1f31);clip-path:polygon(0 8px,4% 8px,4% 0,9% 0,9% 8px,14% 8px,14% 0,19% 0,19% 8px,24% 8px,24% 0,29% 0,29% 8px,34% 8px,34% 0,39% 0,39% 8px,44% 8px,44% 0,49% 0,49% 8px,54% 8px,54% 0,59% 0,59% 8px,64% 8px,64% 0,69% 0,69% 8px,74% 8px,74% 0,79% 0,79% 8px,84% 8px,84% 0,89% 0,89% 8px,94% 8px,94% 0,99% 0,99% 8px,100% 8px,100% 100%,0 100%);
  box-shadow:inset 0 -3px 0 rgba(0,0,0,.35)}
.gl-wall::before{content:'';position:absolute;inset:8px 0 0;background:
  repeating-linear-gradient(0deg,transparent 0 17px,rgba(0,0,0,.28) 17px 19px),
  repeating-linear-gradient(90deg,transparent 0 34px,rgba(0,0,0,.2) 34px 36px);opacity:.55;pointer-events:none}
.gl-wall.hit{animation:glQuake .3s}
.gl-wall.bad{animation:flq-shake .4s}
@keyframes glQuake{30%{transform:translateY(2px)}60%{transform:translateY(-1px)}}
.gl-row{position:relative;display:flex;justify-content:center;gap:4px;perspective:420px}
.gl-row s{flex:none;width:12px}
.gl-b{position:relative;width:var(--sw,34px);height:42px;display:grid;place-items:center;border-radius:4px;
  background:linear-gradient(180deg,#4a5068,#353a52);box-shadow:inset 0 2px 0 rgba(255,255,255,.12),inset 0 -3px 0 rgba(0,0,0,.35),0 2px 0 rgba(0,0,0,.4);
  font:400 24px/1 'Lilita One',sans-serif;color:transparent}
.gl-b::after{content:'';position:absolute;inset:6px 8px;border-radius:2px;background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.08),transparent 60%)}
.gl-b.on{background:linear-gradient(180deg,#ffe680,#ffbb1f);color:#3a1a00;box-shadow:inset 0 -3px 0 #b06a00,0 0 16px rgba(255,190,40,.75);animation:glBreak .45s cubic-bezier(.3,1.6,.5,1) both}
.gl-b.on::after{display:none}
.gl-b.miss{background:linear-gradient(180deg,#5a1f1a,#3a1210);color:#ff8a76;box-shadow:inset 0 -3px 0 #ff5a3a;animation:glBreak .45s both}
.gl.win .gl-b{background:linear-gradient(180deg,#5ff08a,#16a64c);color:#fff;text-shadow:0 2px 0 rgba(0,60,20,.35);box-shadow:inset 0 -3px 0 #0b6a2a,0 0 14px rgba(95,240,138,.6);
  animation:glWin .5s calc(var(--k) * 50ms) cubic-bezier(.3,1.8,.5,1) both}
@keyframes glBreak{0%{transform:scale(1.25) rotateX(70deg);filter:brightness(2)}100%{transform:none}}
@keyframes glWin{40%{transform:translateY(-8px) scale(1.1)}100%{transform:none}}
.gl-hp{position:absolute;right:6px;top:-22px;display:flex;gap:5px;z-index:2;padding:2px 6px;background:#07080f}
.gl-hp i{width:17px;height:19px;background:linear-gradient(#ffe680,#e8980e);-webkit-mask:var(--tw) center/contain no-repeat;mask:var(--tw) center/contain no-repeat;transition:transform .45s cubic-bezier(.5,0,.7,.4),opacity .45s;transform-origin:50% 100%}
.gl-hp i.down{transform:rotate(35deg) translateY(5px) scale(.8);opacity:.15}
/* gülleler */
.gl-tray{display:flex;flex-wrap:wrap;justify-content:center;gap:9px 8px;width:100%;touch-action:none;user-select:none;-webkit-user-select:none}
.gl-ball{position:relative;width:var(--bs,46px);height:var(--bs,46px);border-radius:50%;display:grid;place-items:center;cursor:pointer;
  background:radial-gradient(circle at 32% 28%,#8a93b4 0,#3a4060 28%,#161a2c 70%,#0b0d18 100%);
  box-shadow:0 4px 0 #05060c,0 6px 12px rgba(0,0,0,.5),inset 0 -3px 6px rgba(0,0,0,.6);
  font:400 calc(var(--bs,46px) * .5)/1 'Lilita One',sans-serif;color:#ffd25a;text-shadow:0 2px 0 rgba(0,0,0,.7),0 0 10px rgba(255,190,40,.45);
  transition:transform .12s,opacity .25s,filter .25s;will-change:transform}
.gl-ball::before{content:'';position:absolute;left:22%;top:14%;width:26%;height:18%;border-radius:50%;background:rgba(255,255,255,.35);filter:blur(1px)}
.gl-ball:active{transform:scale(.92)}
.gl-ball.pull{transition:none}
.gl-ball.used{pointer-events:none;opacity:.22;filter:grayscale(1);transform:scale(.8)}
.gl-ball.used.ok{opacity:.35;filter:none}
.gl-ball.sug{animation:glSug .55s ease-in-out infinite alternate}
@keyframes glSug{to{box-shadow:0 0 0 3px #ec4f93,0 0 18px #ec4f93,0 4px 0 #05060c}}
.gl-fly{position:absolute;z-index:5;width:var(--bs,46px);height:var(--bs,46px);margin:calc(var(--bs,46px) / -2) 0 0 calc(var(--bs,46px) / -2);border-radius:50%;pointer-events:none;display:grid;place-items:center;
  background:radial-gradient(circle at 32% 28%,#ffe680 0,#ff9a1f 35%,#7a2a00 100%);box-shadow:0 0 18px #ff9a1f,0 0 40px rgba(255,120,30,.6);
  font:400 calc(var(--bs,46px) * .5)/1 'Lilita One',sans-serif;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.5)}
.gl-fly.cold{background:radial-gradient(circle at 32% 28%,#8a93b4 0,#3a4060 30%,#0b0d18 100%);box-shadow:0 4px 10px rgba(0,0,0,.6);color:#ff6a55}
.gl-spark{position:absolute;z-index:6;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:50%;background:var(--c,#ffd25a);pointer-events:none;box-shadow:0 0 8px var(--c,#ffd25a)}
.gl.done .gl-tray{pointer-events:none}
.gl .fl-key{display:none}
.gl-tip{font:italic 800 11px 'Barlow Condensed',sans-serif;letter-spacing:.2em;color:rgba(255,255,255,.5);margin-bottom:-4px}
`;

export const asmaca_gulle = {
	kind: 'exact',
	judge: BASE.hang.judge,
	bot: BASE.hang.bot,
	time: BASE.hang.time,
	label: 'Adam asmaca',
	prepare(q, R = Math.random) {
		const word = trUp(q.w);
		const uniq = [...new Set([...word].filter((c) => ABC.includes(c)))];
		const nTrap = uniq.length >= 8 ? 3 : 4;
		const traps = shuffle(COMMON.filter((c) => !uniq.includes(c)), R).slice(0, Math.min(nTrap, 13 - uniq.length));
		return { q, word, balls: shuffle([...uniq, ...traps], R) };
	},
	mount(el, v, api) {
		css('gulle', CSS);
		const app = appOf();
		const chars = [...v.word];
		const n = chars.length;
		const sw = Math.min(34, Math.floor((360 - (n - 1) * 4) / n));
		const bs = v.balls.length > 12 ? 42 : v.balls.length > 10 ? 44 : 48;
		const shown = chars.map((c) => !ABC.includes(c));
		el.innerHTML = `<div class="gl" style="--sw:${sw}px;--bs:${bs}px">
			<div class="gl-hp">${'<i></i>'.repeat(MAX)}</div>
			<div class="gl-wall">
				<div class="gl-row">${chars.map((c, i) => (c === ' ' ? '<s></s>' : `<b class="gl-b${shown[i] ? ' on' : ''}" data-i="${i}">${shown[i] ? c : ''}</b>`)).join('')}</div></div>
			<div class="gl-tip">GÜLLEYE DOKUN YA DA FIRLAT</div>
			<div class="gl-tray" style="max-width:${v.balls.length > 7 ? Math.ceil(v.balls.length / 2) * (bs + 8) : 999}px">${v.balls.map((c, i) => `<b class="gl-ball" data-i="${i}">${c}</b>`).join('')}</div>
			${v.balls.map((c) => `<button class="fl-key" data-k="${c}"></button>`).join('')}
		</div>`;
		const root = el.querySelector('.gl');
		const wall = el.querySelector('.gl-wall');
		const blocks = [...el.querySelectorAll('.gl-b')];
		const balls = [...el.querySelectorAll('.gl-ball')];
		const hp = [...el.querySelectorAll('.gl-hp i')];
		let wrong = 0;
		let done = false;
		const rel = (e) => {
			const a = e.getBoundingClientRect();
			const b = root.getBoundingClientRect();
			return [a.left - b.left + a.width / 2, a.top - b.top + a.height / 2];
		};
		const sparks = (x, y, c, k = 10) => {
			for (let i = 0; i < k; i++) {
				const s = document.createElement('i');
				s.className = 'gl-spark';
				s.style.cssText = `left:${x}px;top:${y}px;--c:${c}`;
				root.appendChild(s);
				const a = Math.random() * Math.PI * 2;
				const d = 18 + Math.random() * 30;
				s.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d - 8}px) scale(.3)`, opacity: 0 }], {
					duration: 380 + Math.random() * 200,
					easing: 'cubic-bezier(.2,.7,.4,1)',
				}).onfinish = () => s.remove();
			}
		};
		/** Gülle uçuşu: başlangıçtan hedefe yay; bitince cb. */
		const fly = (from, to, letter, cold, cb, extra) => {
			const f = document.createElement('i');
			f.className = 'gl-fly' + (cold ? ' cold' : '');
			f.textContent = letter;
			f.style.left = from[0] + 'px';
			f.style.top = from[1] + 'px';
			root.appendChild(f);
			const dx = to[0] - from[0];
			const dy = to[1] - from[1];
			const peak = Math.min(-40, dy * 0.35 - 30);
			const kf = [
				{ transform: 'translate(0,0) scale(1) rotate(0)' },
				{ transform: `translate(${dx * 0.5}px,${dy * 0.5 + peak}px) scale(1.15) rotate(200deg)`, offset: 0.5 },
				{ transform: `translate(${dx}px,${dy}px) scale(.7) rotate(380deg)` },
				...(extra || []),
			];
			const an = f.animate(kf, { duration: extra ? 760 : 380, easing: 'cubic-bezier(.35,.1,.6,1)', fill: 'forwards' });
			an.onfinish = () => {
				f.remove();
				cb?.();
			};
			return an;
		};
		const fire = (k) => {
			if (done) return;
			const b = balls[k];
			if (!b || b.classList.contains('used')) return;
			const c = v.balls[k];
			b.classList.add('used');
			const from = rel(b);
			const hits = blocks.filter((x) => chars[+x.dataset.i] === c && !shown[+x.dataset.i]);
			sfx(app, 'whoosh', { volume: 0.6 });
			buzz(8);
			if (hits.length) {
				b.classList.add('ok');
				hits.forEach((x) => (shown[+x.dataset.i] = true));
				// birden çok blok: gülle havada bölünür, her parça kendi bloğuna
				hits.forEach((x, j) =>
					fly(from, rel(x), c, false, () => {
						x.textContent = c;
						x.classList.add('on');
						const [px, py] = rel(x);
						sparks(px, py, '#ffd25a', 9);
						if (j === 0) {
							wall.classList.remove('hit');
							void wall.offsetWidth;
							wall.classList.add('hit');
							sfx(app, 'tap');
							buzz(14);
						}
					}),
				);
				if (shown.every(Boolean)) {
					done = true;
					root.classList.add('done');
					api.answer({ ok: true, wrong });
					setTimeout(() => {
						blocks.forEach((x, i) => {
							x.style.setProperty('--k', i);
							x.textContent = chars[+x.dataset.i];
						});
						root.classList.add('win');
						sfx(app, 'cheer');
					}, 420);
				}
			} else {
				// tuzak: duvara çarpar, seker ve düşer; bir burç yıkılır
				const [wx, wy] = rel(wall);
				const to = [wx + (Math.random() - 0.5) * 120, wy + 6];
				const fall = [{ transform: `translate(${to[0] - from[0] + 30}px,${to[1] - from[1] + 70}px) scale(.6) rotate(520deg)`, opacity: 0 }];
				fly(from, to, c, true, null, fall);
				setTimeout(() => {
					sparks(to[0], to[1], '#ff6a55', 8);
					wall.classList.remove('bad');
					void wall.offsetWidth;
					wall.classList.add('bad');
					hp[wrong]?.classList.add('down');
					wrong++;
					sfx(app, 'crumble', { volume: 0.7 });
					buzz(45);
					if (wrong >= MAX && !done) {
						done = true;
						root.classList.add('done');
						api.answer({ ok: false, wrong });
					}
				}, 300);
			}
		};
		// dokun ya da fırlat: gülle parmakla biraz yukarı çekilir; bırakınca (ya da dokununca) atılır
		for (const b of balls) {
			let st = null;
			b.addEventListener('pointerdown', (e) => {
				if (done) return;
				st = { y: e.clientY, x: e.clientX };
				b.setPointerCapture?.(e.pointerId);
				b.classList.add('pull');
			});
			b.addEventListener('pointermove', (e) => {
				if (!st) return;
				const dy = Math.max(-26, Math.min(0, e.clientY - st.y));
				const dx = Math.max(-10, Math.min(10, (e.clientX - st.x) * 0.3));
				b.style.transform = `translate(${dx}px,${dy}px) scale(${1 + -dy / 200})`;
			});
			const end = (e, fireIt) => {
				if (!st) return;
				st = null;
				b.classList.remove('pull');
				b.style.transform = '';
				if (fireIt) fire(+b.dataset.i);
			};
			b.addEventListener('pointerup', (e) => end(e, true));
			b.addEventListener('pointercancel', (e) => end(e, false));
		}
		// jokerler: harf açan joker gizli düğmeye basar (gülle atılır); seyirci önerisi .sug ile gülleyi yakar
		for (const k of el.querySelectorAll('.fl-key'))
			k.addEventListener('click', () => {
				const i = v.balls.indexOf(k.dataset.k);
				if (i >= 0) fire(i);
			});
		new MutationObserver(() => {
			for (const k of el.querySelectorAll('.fl-key.sug')) balls[v.balls.indexOf(k.dataset.k)]?.classList.add('sug');
		}).observe(root, { subtree: true, attributes: true, attributeFilter: ['class'] });
		return {
			lock() {
				done = true;
				root.classList.add('done');
			},
			reveal() {
				if (root.classList.contains('win')) return;
				blocks.forEach((x) => {
					if (shown[+x.dataset.i]) return;
					x.textContent = chars[+x.dataset.i];
					x.classList.add('miss');
				});
			},
			destroy() {},
		};
	},
};

export const TYPES = { asmaca_gulle };

export const ORDER = [['asmaca_gulle', 'Adam Asmaca · Gülle', 'Harf güllesini kaleye fırlat, kelimeyi aç']];

const HANG = BANK.filter((q) => q.type === 'hang').sort((a, b) => a.id.localeCompare(b.id));
const pickS = () => {
	const out = [];
	for (const d of [1, 2, 3]) out.push(...HANG.filter((q) => q.diff === d && !out.includes(q)).slice(0, 2));
	return out.slice(0, 6);
};
export const SAMPLES = { asmaca_gulle: pickS() };
