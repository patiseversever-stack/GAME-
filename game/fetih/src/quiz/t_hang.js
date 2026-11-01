// ADAM ASMACA · HARF ÇEMBERİ (v1.4): klavye yok.
//
// Kelimenin harfleri (her harf bir sikke, tekrar edenler ayrı sikke) bir mühür çemberinin üstüne karışık dizilir.
// Parmağı sikkeden sikkeye sürükle (ya da sırayla dokun): altın ip harfleri birleştirir, üstteki kutular canlı dolar.
// Geri sürüklemek son harfi bırakır. Bütün harfler bağlanınca kelime denenir:
//   doğru  → kutular sırayla yeşile döner, sikkeler saçılır;
//   yanlış → bir burç yıkılır (3 hak). DOĞRU YERDEKİ harfler kutularına altınla kilitlenir ve sikkeleri çemberden
//            çekilir, kalanlar yeniden dizilir: her deneme kelimeyi biraz açar (adam asmacanın ruhu, harf harf açılış).
// Bütün harfler bağlanmadan parmak kalkarsa ceza yok: harfler geri döner. Ortadaki mühür çemberi karıştırır (ve yarım
// kalan dizilişi siler). Masaüstünde harf tuşları da sikke seçer, ⌫ son harfi bırakır.
//
// Cevap biçimi eski adam asmacayla aynı: { ok, wrong } (judge aynı; bot 3 hakka göre). Kart kapanınca (süre) lock().
// Jokerler ve hata ayıklama gizli .fl-key düğmeleriyle konuşur (eski klavyenin sözleşmesi): Yarı Yarıya harf açar →
// o harfin bütün kutuları kilitlenir, sikkeleri çekilir; Seyirci önerisi .fl-key.sug → o harfin sikkesi ve kutusu
// parlar. Kelimede olmayan harfe basılırsa (yalnız hata ayıklama) ıska sayılır.
// Çevrimiçi: v.tiles kelimenin karışık harfleridir (anagram gibi, tipin doğası); sıra (v.word) gizli kalır.

import { css, esc, shuffle, buzz, trUp, pCorrect, KEYS, physicalKeys } from './util.js';
import { botTime } from './timing.js';
import { setTimeout } from '../core/clock.js';
import { appOf, sfx } from './d_ortak.js';

const MAX = 3; // yanlış deneme hakkı (kale burcu)
const ABC = KEYS.join('');

const MIX_SVG =
	'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/></svg>';

const CSS = /* css */ `
.hr{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:4px;user-select:none;-webkit-user-select:none}
/* --------------------------------------------------- kelime şeridi: boş kutu lacivert oyuk, dolarken fildişi, kilitte altın */
.hr-word{display:flex;justify-content:center;gap:5px;max-width:100%}
.hr-word s{flex:none;width:10px}
.hr-s{position:relative;flex:none;width:var(--sw,36px);height:calc(var(--sw,36px) * 1.22);max-height:46px;border-radius:9px;display:grid;place-items:center;
  font:400 calc(min(var(--sw,36px), 38px) * .66)/1 'Lilita One',sans-serif;color:#1b2340;
  background:linear-gradient(180deg,#0c1430,#16224a);box-shadow:inset 0 3px 6px rgba(0,0,0,.55),inset 0 -1px 0 rgba(255,214,120,.35),0 1px 0 rgba(255,255,255,.06)}
.hr-s::after{content:'';position:absolute;left:22%;right:22%;bottom:6px;height:2px;border-radius:2px;background:rgba(255,214,120,.38)}
.hr-s.pv,.hr-s.lk,.hr-s.ok,.hr-s.bad,.hr-s.miss{box-shadow:none}
.hr-s.pv::after,.hr-s.lk::after,.hr-s.ok::after,.hr-s.bad::after,.hr-s.miss::after{display:none}
.hr-s.pv{background:linear-gradient(180deg,#fffaf0,#efe1c2);box-shadow:0 3px 0 #b9a27a,0 0 0 1.5px rgba(255,255,255,.7) inset;animation:hrPop .22s cubic-bezier(.3,1.7,.5,1)}
.hr-s.lk{color:#4a2600;background:linear-gradient(180deg,#ffe58a,#f2b52a);box-shadow:0 3px 0 #a8660a,0 0 14px rgba(255,190,50,.55);animation:hrLock .5s cubic-bezier(.3,1.6,.5,1) both}
.hr-s.bad{color:#fff;background:linear-gradient(180deg,#ff7a6a,#c8352a);box-shadow:0 3px 0 #6e140c;animation:hrNo .42s}
.hr-s.ok{color:#fff;text-shadow:0 2px 0 rgba(0,70,20,.35);background:linear-gradient(180deg,#7ef09a,#1fae55);box-shadow:0 3px 0 #0b6a2c,0 0 16px rgba(95,240,138,.55);
  animation:hrWin .55s calc(var(--k) * 55ms) cubic-bezier(.3,1.8,.5,1) both}
.hr-s.miss{color:#ffd2c8;background:linear-gradient(180deg,#5a2a30,#3a161c);box-shadow:0 3px 0 #1d0a0d}
.hr-s.sug{box-shadow:0 0 0 2.5px #ec4f93,0 0 16px #ec4f93,inset 0 3px 6px rgba(0,0,0,.5)}
@keyframes hrPop{0%{transform:scale(.6)}100%{transform:none}}
@keyframes hrLock{0%{transform:translateY(10px) scale(.7);filter:brightness(1.8)}100%{transform:none}}
@keyframes hrNo{0%,100%{transform:none}25%{transform:translateX(-4px) rotate(-3deg)}75%{transform:translateX(4px) rotate(3deg)}}
@keyframes hrWin{0%{transform:none}40%{transform:translateY(-9px) scale(1.12)}100%{transform:none}}
/* --------------------------------------------------- sahne: hak (burçlar), çember, ipucu */
.hr-stage{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px}
.hr-hp{position:absolute;right:calc(50% - var(--d) / 2 - 34px);top:4px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:7px 5px;border-radius:12px;
  background:linear-gradient(180deg,rgba(10,18,44,.9),rgba(6,10,26,.9));box-shadow:inset 0 0 0 1px rgba(255,214,120,.22)}
.hr-hp i{width:15px;height:17px;background:linear-gradient(#ffe680,#e8980e);-webkit-mask:var(--tw) center/contain no-repeat;mask:var(--tw) center/contain no-repeat;
  transition:transform .5s cubic-bezier(.5,0,.7,.4),opacity .5s;transform-origin:50% 100%}
.hr-hp i.down{transform:rotate(38deg) translateY(4px) scale(.8);opacity:.16}
/* mühür çemberi: altın kenar, lacivert kadife, ortada Selçuklu yıldızı (iki dönük kare), dışta ince yazı halkası */
.hr-ring{position:relative;width:var(--d);height:var(--d);border-radius:50%;touch-action:none;flex:none;
  background:conic-gradient(from 210deg,#7a4d10,#ffe08a 12%,#b9781a 26%,#fff0b8 38%,#9a6012 52%,#ffd56a 66%,#7a4d10 80%,#f7cf6a 92%,#7a4d10);
  box-shadow:0 14px 28px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.5)}
.hr-disc{position:absolute;inset:5px;border-radius:50%;overflow:hidden;
  background:radial-gradient(circle at 50% 38%,#24346e 0,#141f48 46%,#0a1130 80%,#070b20 100%);box-shadow:inset 0 0 0 1.5px rgba(0,0,0,.6),inset 0 10px 24px rgba(120,160,255,.12),inset 0 -14px 26px rgba(0,0,0,.55)}
.hr-disc::before,.hr-disc::after{content:'';position:absolute;left:50%;top:50%;width:46%;height:46%;margin:-23% 0 0 -23%;border:1.5px solid rgba(255,214,120,.16);border-radius:4px}
.hr-disc::after{transform:rotate(45deg)}
.hr-disc i{position:absolute;inset:9%;border-radius:50%;border:1px dashed rgba(255,214,120,.13)}
.hr-ring.shake{animation:hrShake .42s}
@keyframes hrShake{0%,100%{transform:none}20%{transform:translateX(-7px) rotate(-2deg)}40%{transform:translateX(6px) rotate(2deg)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}
.hr-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:2}
.hr-svg polyline,.hr-svg line{fill:none;stroke-linecap:round;stroke-linejoin:round}
.hr-svg .gl{stroke:rgba(255,190,60,.5);stroke-width:calc(var(--c) * .34);filter:blur(5px)}
.hr-svg .rp{stroke:#ffcf4a;stroke-width:calc(var(--c) * .2)}
.hr-svg .hi{stroke:rgba(255,250,225,.9);stroke-width:calc(var(--c) * .06)}
.hr-svg .tl{stroke:#ffcf4a;stroke-width:calc(var(--c) * .2);opacity:.75}
/* sikkeler: fildişi, kabartma yazı, altın halka; seçilince altına döner ve büyür */
.hr-t{position:absolute;left:0;top:0;z-index:3;width:var(--c);height:var(--c);margin:calc(var(--c) / -2) 0 0 calc(var(--c) / -2);border-radius:50%;display:grid;place-items:center;
  font:400 calc(var(--c) * .52)/1 'Lilita One',sans-serif;color:#1b2340;
  background:radial-gradient(circle at 35% 28%,#fffdf6 0,#f6ead0 46%,#dcc49a 100%);
  box-shadow:0 0 0 2px #c9a35a,0 0 0 3.5px rgba(30,20,0,.45),0 5px 10px rgba(0,0,0,.45),inset 0 -3px 5px rgba(120,80,20,.28),inset 0 2px 2px rgba(255,255,255,.8);
  transform:translate(var(--x),var(--y));transition:transform .42s cubic-bezier(.3,1.25,.5,1),opacity .3s,background .15s,color .15s;will-change:transform}
.hr-t::after{content:'';position:absolute;inset:-6px;border-radius:50%;border:2px solid #ffd25a;opacity:0;transform:scale(.7);pointer-events:none}
.hr-t.on{color:#3a1d00;background:radial-gradient(circle at 35% 28%,#fff6c8 0,#ffd560 50%,#e09a1c 100%);
  box-shadow:0 0 0 2px #fff1b0,0 0 0 4px rgba(120,60,0,.5),0 0 22px rgba(255,190,50,.8),inset 0 -3px 5px rgba(150,80,0,.35)}
.hr-t.on::after{animation:hrRip .45s ease-out}
.hr-t.gone{opacity:0;transform:translate(var(--x),var(--y)) scale(.2);pointer-events:none}
.hr-t.sug{box-shadow:0 0 0 2.5px #ec4f93,0 0 20px #ec4f93,0 5px 10px rgba(0,0,0,.45)}
@keyframes hrRip{0%{opacity:.9;transform:scale(.8)}100%{opacity:0;transform:scale(1.45)}}
.hr.win .hr-t{opacity:0;transform:translate(var(--x),var(--y)) scale(1.6);transition:transform .5s cubic-bezier(.2,.8,.3,1),opacity .5s}
/* orta mühür: karıştır */
.hr-mix{position:absolute;left:50%;top:50%;z-index:2;width:calc(var(--d) * .25);height:calc(var(--d) * .25);margin:calc(var(--d) * -.125) 0 0 calc(var(--d) * -.125);border-radius:50%;
  display:grid;place-items:center;border:0;cursor:pointer;color:#ffe08a;padding:0;
  background:radial-gradient(circle at 40% 32%,#2e417e,#16224c 70%);box-shadow:0 0 0 1.5px rgba(255,214,120,.55),0 0 0 4px rgba(10,16,40,.9),0 4px 10px rgba(0,0,0,.5);transition:transform .15s}
.hr-mix svg{width:44%;height:44%;filter:drop-shadow(0 1px 1px rgba(0,0,0,.6))}
.hr-mix:active{transform:scale(.9)}
.hr-mix.spin svg{animation:hrSpin .45s cubic-bezier(.3,1.4,.5,1)}
@keyframes hrSpin{to{transform:rotate(360deg)}}
.hr-mix b{position:absolute;inset:0;display:grid;place-items:center;font:400 calc(var(--d) * .085)/1 'Lilita One',sans-serif;color:#fff3cc;opacity:0;transition:opacity .15s}
.hr.drag .hr-mix svg{opacity:0}
.hr.drag .hr-mix b{opacity:1}
.hr-tip{font:800 10.5px/1 'Manrope',system-ui,sans-serif;letter-spacing:.22em;margin-right:-.22em;color:rgba(255,232,180,.62);text-transform:uppercase;transition:opacity .4s}
.hr.used .hr-tip{opacity:0}
.hr.done .hr-ring{pointer-events:none}
.hr .fl-key{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);border:0;padding:0;margin:0;opacity:0;pointer-events:none}
.hr-spark{position:absolute;z-index:6;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:50%;background:var(--c,#ffd25a);pointer-events:none;box-shadow:0 0 8px var(--c,#ffd25a)}
`;

/** Sikke boyu (px): çember çapına ve sikke sayısına göre. */
const coinSize = (d, n) => Math.round((n <= 5 ? 0.25 : n <= 7 ? 0.225 : n <= 9 ? 0.195 : 0.178) * d);

export const hang = {
	time: 23,
	label: 'Adam asmaca',
	kind: 'exact',
	prepare(q, R = Math.random) {
		const word = trUp(q.w);
		const letters = [...word].filter((c) => c !== ' ');
		// karışık; kelimenin kendisi (ya da ilk üç harfi aynı sırada) okunmasın
		let tiles = shuffle(letters, R);
		for (let k = 0; k < 8 && letters.length > 2 && tiles.slice(0, 3).join('') === letters.slice(0, 3).join(''); k++) tiles = shuffle(letters, R);
		return { q, word, tiles };
	},
	mount(el, v, api) {
		css('hang-ring', CSS);
		const app = appOf();
		const word = [...v.word];
		const n = word.length;
		const free = () => word.map((c, i) => i).filter((i) => word[i] !== ' ' && !lock[i]); // açılmamış konumlar
		const lock = word.map((c) => c === ' ');
		const vw = Math.min(innerWidth || 400, 560);
		const D = Math.round(Math.max(172, Math.min(236, vw * 0.6, (innerHeight || 800) * 0.27)));
		const C = coinSize(D, v.tiles.length);
		const RAD = D / 2 - C / 2 - 9;
		const sw = Math.min(38, Math.floor((Math.min(vw - 40, 380) - (n - 1) * 5) / n));
		el.innerHTML = `<div class="hr" style="--d:${D}px;--c:${C}px;--sw:${sw}px">
			<div class="hr-word">${word.map((c, i) => (c === ' ' ? '<s></s>' : `<b class="hr-s" data-i="${i}"></b>`)).join('')}</div>
			<div class="hr-stage">
				<div class="hr-hp" aria-label="Hak">${'<i></i>'.repeat(MAX)}</div>
				<div class="hr-ring">
					<div class="hr-disc"><i></i></div>
					<svg class="hr-svg" viewBox="0 0 ${D} ${D}"><polyline class="gl"/><polyline class="rp"/><polyline class="hi"/><line class="tl"/></svg>
					<button class="hr-mix" aria-label="Karıştır">${MIX_SVG}<b></b></button>
					${v.tiles.map((c, i) => `<b class="hr-t" data-i="${i}">${esc(c)}</b>`).join('')}
				</div>
				<div class="hr-tip">Harfleri sırayla birleştir</div>
			</div>
			${[...ABC].map((k) => `<button class="fl-key" data-k="${k}" tabindex="-1" aria-hidden="true"></button>`).join('')}
		</div>`;
		const root = el.querySelector('.hr');
		const ring = el.querySelector('.hr-ring');
		const mix = el.querySelector('.hr-mix');
		const cnt = mix.querySelector('b');
		const slots = new Map([...el.querySelectorAll('.hr-s')].map((s) => [+s.dataset.i, s]));
		const hp = [...el.querySelectorAll('.hr-hp i')];
		const [pGl, pRp, pHi] = el.querySelectorAll('.hr-svg polyline');
		const tail = el.querySelector('.hr-svg line');
		const T = v.tiles.map((c, i) => ({ c, i, el: el.querySelector(`.hr-t[data-i="${i}"]`), on: true, x: 0, y: 0 }));
		let path = [];
		let wrong = 0;
		let done = false;
		let busy = false; // deneme sonucu canlanırken giriş yok
		let rot = -Math.PI / 2;

		// ------------------------------------------------ dizilim: çemberdeki sikkeler eşit aralıkla (üstten başlar)
		const layout = () => {
			const on = T.filter((t) => t.on);
			on.forEach((t, k) => {
				const a = rot + (k / on.length) * Math.PI * 2;
				t.x = D / 2 + RAD * Math.cos(a);
				t.y = D / 2 + RAD * Math.sin(a);
				t.el.style.setProperty('--x', t.x.toFixed(1) + 'px');
				t.el.style.setProperty('--y', t.y.toFixed(1) + 'px');
			});
		};
		layout();

		// ------------------------------------------------ çizim: ip (sikke merkezleri), kuyruk (parmağa), canlı kutular
		let finger = null;
		const draw = () => {
			const pts = path.map((t) => `${t.x.toFixed(1)},${t.y.toFixed(1)}`).join(' ');
			for (const p of [pGl, pRp, pHi]) p.setAttribute('points', path.length > 1 ? pts : '');
			const last = path[path.length - 1];
			if (last && finger) {
				tail.setAttribute('x1', last.x);
				tail.setAttribute('y1', last.y);
				tail.setAttribute('x2', finger[0]);
				tail.setAttribute('y2', finger[1]);
				tail.style.display = '';
			} else tail.style.display = 'none';
			const fr = free();
			fr.forEach((pos, j) => {
				const s = slots.get(pos);
				const t = path[j];
				const want = t ? t.c : '';
				if (s.textContent !== want) {
					s.textContent = want;
					s.classList.toggle('pv', !!t);
				}
			});
			for (const t of T) t.el.classList.toggle('on', path.includes(t));
			const left = T.filter((t) => t.on).length - path.length;
			cnt.textContent = path.length ? String(left || '✓') : '';
		};
		draw();

		const add = (t) => {
			path.push(t);
			root.classList.add('used');
			sfx(app, 'tap', { vol: 0.55, rate: 0.9 + path.length * 0.07 });
			buzz(6);
		};
		const pop = () => {
			path.pop();
			sfx(app, 'tap', { vol: 0.35, rate: 0.7 });
		};
		const clear = () => {
			path = [];
			finger = null;
			root.classList.remove('drag');
			draw();
		};

		// ------------------------------------------------ kıvılcım (kutu ya da sikke üstünde)
		const relOf = (e) => {
			const a = e.getBoundingClientRect();
			const b = root.getBoundingClientRect();
			return [a.left - b.left + a.width / 2, a.top - b.top + a.height / 2];
		};
		const sparks = (x, y, c, k = 8) => {
			for (let i = 0; i < k; i++) {
				const s = document.createElement('i');
				s.className = 'hr-spark';
				s.style.cssText = `left:${x}px;top:${y}px;--c:${c}`;
				root.appendChild(s);
				const a = Math.random() * Math.PI * 2;
				const d = 16 + Math.random() * 26;
				s.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d - 6}px) scale(.3)`, opacity: 0 }], {
					duration: 360 + Math.random() * 220,
					easing: 'cubic-bezier(.2,.7,.4,1)',
				}).onfinish = () => s.remove();
			}
		};

		// ------------------------------------------------ sonuç
		const finish = (ok) => {
			done = true;
			root.classList.add('done');
			api.answer({ ok, wrong });
		};
		const win = () => {
			path = [];
			finger = null;
			root.classList.remove('drag');
			draw();
			for (const pos of slots.keys()) lock[pos] = true; // kutular artık çizimin dışında (kart kilitlenince boşalmasın)
			let k = 0;
			for (const [pos, s] of slots) {
				s.textContent = word[pos];
				s.classList.remove('pv', 'lk', 'bad', 'sug');
				s.style.setProperty('--k', k++);
				s.classList.add('ok');
			}
			root.classList.add('win');
			finish(true);
			sfx(app, 'right');
			setTimeout(() => {
				for (const s of slots.values()) {
					const [x, y] = relOf(s);
					sparks(x, y, '#7ef09a', 4);
				}
			}, 120);
			buzz(25);
		};
		/** Konumu altına kilitle; bu harfin çemberdeki sikkesi (verilmişse o sikke) çekilir. */
		const lockAt = (pos, tile = null) => {
			lock[pos] = true;
			const t = tile || T.find((x) => x.on && x.c === word[pos]);
			if (t) {
				t.on = false;
				t.el.classList.add('gone');
				t.el.classList.remove('sug');
			}
			const s = slots.get(pos);
			s.textContent = word[pos];
			s.classList.remove('pv', 'bad', 'sug');
			s.classList.add('lk');
		};
		const allOpen = () => word.every((c, i) => lock[i]);
		const miss = () => {
			hp[wrong]?.classList.add('down');
			wrong++;
			ring.classList.remove('shake');
			void ring.offsetWidth;
			ring.classList.add('shake');
			sfx(app, 'wrong', { vol: 0.8 });
			setTimeout(() => sfx(app, 'crumble', { vol: 0.6 }), 160);
			buzz(45);
			if (wrong >= MAX) {
				finish(false);
				return true;
			}
			return false;
		};
		/** Bütün harfler bağlandı: dene. */
		const submit = () => {
			const fr = free();
			if (path.length !== fr.length) return;
			const pairs = fr.map((pos, j) => [pos, path[j]]);
			if (pairs.every(([pos, t]) => t.c === word[pos])) return win();
			busy = true;
			finger = null;
			root.classList.remove('drag');
			// doğru yerdeki harfler kilitlenir; yanlış yerdekiler kızarır ve boşalır
			const good = pairs.filter(([pos, t]) => t.c === word[pos]);
			for (const [pos] of pairs) {
				const s = slots.get(pos);
				if (good.some(([p]) => p === pos)) continue;
				s.classList.remove('pv');
				s.classList.add('bad');
			}
			const over = miss();
			setTimeout(() => {
				for (const [pos, t] of good) {
					lockAt(pos, t);
					const [x, y] = relOf(slots.get(pos));
					sparks(x, y, '#ffd25a', 6);
				}
				if (good.length) sfx(app, 'coin', { vol: 0.6 });
				for (const [pos] of pairs) {
					const s = slots.get(pos);
					if (!lock[pos]) {
						s.classList.remove('bad');
						s.textContent = '';
					}
				}
				path = [];
				layout();
				draw();
				busy = false;
				if (!over && allOpen()) win();
			}, 430);
		};

		// ------------------------------------------------ giriş: sürükle ya da dokun
		let down = null; // { moved, popOnUp }
		let rect = null;
		const at = (e) => [((e.clientX - rect.left) / rect.width) * D, ((e.clientY - rect.top) / rect.height) * D];
		const hit = (x, y, r = C * 0.5) => {
			let best = null;
			let bd = r * r;
			for (const t of T) {
				if (!t.on) continue;
				const d = (t.x - x) ** 2 + (t.y - y) ** 2;
				if (d < bd) {
					bd = d;
					best = t;
				}
			}
			return best;
		};
		ring.addEventListener('pointerdown', (e) => {
			if (done || busy || e.target.closest('.hr-mix')) return;
			rect = ring.getBoundingClientRect();
			const [x, y] = at(e);
			const t = hit(x, y, C * 0.62);
			if (!t) {
				if (path.length) clear(); // boş kadifeye dokunmak yarım dizilişi siler
				return;
			}
			ring.setPointerCapture?.(e.pointerId);
			down = { moved: false, popOnUp: false, x: e.clientX, y: e.clientY };
			if (!path.length) add(t);
			else if (path[path.length - 1] === t) down.popOnUp = true;
			else if (!path.includes(t)) add(t);
			finger = [x, y];
			root.classList.add('drag');
			draw();
		});
		ring.addEventListener('pointermove', (e) => {
			if (!down || done || busy) return;
			if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) down.moved = true;
			const [x, y] = at(e);
			finger = [x, y];
			const t = hit(x, y, C * 0.44);
			if (t) {
				if (!path.includes(t)) {
					add(t);
					down.popOnUp = false;
				} else if (path.length > 1 && path[path.length - 2] === t) {
					pop(); // geri sürükleme: son harfi bırak
					down.popOnUp = false;
				}
			}
			draw();
		});
		const up = (e, cancel = false) => {
			if (!down) return;
			const d = down;
			down = null;
			finger = null;
			if (done || busy) return;
			if (cancel) return clear();
			if (!d.moved && d.popOnUp) pop();
			const all = path.length === free().length;
			if (all) {
				draw();
				return submit();
			}
			if (d.moved && path.length > 1) {
				// sürükleme yarım kaldı: harfler geri döner (ceza yok)
				for (const pos of free()) slots.get(pos).classList.remove('pv');
				return clear();
			}
			root.classList.remove('drag');
			draw();
		};
		ring.addEventListener('pointerup', (e) => up(e));
		ring.addEventListener('pointercancel', (e) => up(e, true));
		mix.addEventListener('click', () => {
			if (done || busy) return;
			rot += Math.PI * (0.35 + Math.random() * 0.5);
			const on = T.filter((t) => t.on);
			const sh = shuffle(on, Math.random);
			// sırayı karıştır (dizi içindeki yerler): T dizisinde "on" olanların sırası değişir
			const order = T.map((t) => (t.on ? sh.shift() : t));
			T.splice(0, T.length, ...order);
			mix.classList.remove('spin');
			void mix.offsetWidth;
			mix.classList.add('spin');
			sfx(app, 'whoosh', { vol: 0.45 });
			path = [];
			layout();
			draw();
		});

		// masaüstü: harf tuşu sikke seçer, ⌫ bırakır
		const offKeys = physicalKeys(root, {
			onKey(k) {
				if (done || busy) return;
				const t = T.find((x) => x.on && x.c === k && !path.includes(x));
				if (!t) return;
				add(t);
				draw();
				if (path.length === free().length) submit();
			},
			onBack() {
				if (done || busy || !path.length) return;
				pop();
				draw();
			},
		});

		// ------------------------------------------------ jokerler ve hata ayıklama: gizli harf düğmeleri
		for (const k of el.querySelectorAll('.fl-key'))
			k.addEventListener('click', () => {
				if (done || k.disabled) return;
				k.disabled = true;
				const L = k.dataset.k;
				const at2 = word.map((c, i) => i).filter((i) => word[i] === L && !lock[i]);
				if (!at2.length) {
					if (!word.includes(L)) miss();
					return;
				}
				path = [];
				for (const pos of at2) {
					lockAt(pos);
					const [x, y] = relOf(slots.get(pos));
					sparks(x, y, '#ffd25a', 6);
				}
				sfx(app, 'coin', { vol: 0.6 });
				layout();
				draw();
				if (allOpen()) win();
			});
		// seyirci önerisi: .fl-key.sug → o harfin sikkesi ve ilk açılmamış kutusu parlar
		const mo = new MutationObserver(() => {
			for (const k of el.querySelectorAll('.fl-key.sug')) {
				const L = k.dataset.k;
				T.find((t) => t.on && t.c === L)?.el.classList.add('sug');
				const pos = word.findIndex((c, i) => c === L && !lock[i]);
				if (pos >= 0) slots.get(pos)?.classList.add('sug');
			}
		});
		mo.observe(root, { subtree: true, attributes: true, attributeFilter: ['class'] });

		return {
			lock() {
				done = true;
				root.classList.add('done');
				clear();
			},
			reveal() {
				if (root.classList.contains('win')) return;
				clear();
				for (const [pos, s] of slots) {
					if (lock[pos]) continue;
					s.textContent = word[pos];
					s.classList.remove('pv', 'bad', 'sug');
					s.classList.add('miss');
				}
			},
			destroy() {
				mo.disconnect();
				offKeys?.();
			},
		};
	},
	judge(v, value) {
		if (!value) return { correct: false, err: 99 };
		return { correct: !!value.ok, err: value.ok ? value.wrong : 99 };
	},
	bot(v, skill, R) {
		const ok = R() < pCorrect(skill, v.q.diff) + 0.05;
		const wrong = ok ? Math.floor(R() * MAX) : MAX;
		return { value: { ok, wrong }, time: botTime(v, R, skill, 0.15, 0.95) };
	},
};
