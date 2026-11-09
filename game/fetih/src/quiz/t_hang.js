// ADAM ASMACA · ŞERİT (v1.4, kullanıcının seçtiği taslak): klavye yok.
//
// Kelimenin harfleri (her harf bir kart, tekrar edenler ayrı kart) eğik koyu bir şeritte bir ya da iki sıra iri, renkli
// eğik kart olarak karışık durur (oyunun arena dili: şıklar, jokerler, VS rozeti gibi eğik kesim, beyaz çerçeve, kalın
// alt gölge, Barlow Condensed italik). Kartlar büyük (48–60 px yüksek, 76 px'e kadar geniş): parmakla rahat seçilir.
// Kartlara sırayla dokun ya da parmağı karttan karta sürükle: kart beyaza döner, altın çerçeve alır, harfi kutusuna uçar,
// aralarında altın çizgi gerilir. Geri sürüklemek ya da son karta yeniden dokunmak son harfi bırakır. Bütün harfler
// seçilince kelime denenir:
//   doğru  → kartlar ortaya çekilir, kutular sırayla yeşile döner;
//   yanlış → çizgi kızarır, şerit sallanır, bir hak çubuğu söner (3 hak). DOĞRU YERDEKİ harfler kutularına sarıyla
//            kilitlenir ve kartları çekilir, kalanlar yeniden dizilir: her deneme kelimeyi biraz açar.
// Sürükleme yarım kalırsa ceza yok: harfler geri döner; şeridin boş yerine dokunmak yarım dizilişi siler. Sağ üstteki
// düğme kartları karıştırır. Masaüstünde harf tuşları da kart seçer, ⌫ son harfi bırakır.
//
// Bütün canlandırmalar transform / opacity (GPU); kare başına yerleşim okuması yok, çizgi yalnız değişince çizilir.
// Kart kısa: harita alanı klavyeli eski karttan büyük (412×892'de 356 px, eskisi 322 px).
//
// Cevap biçimi eski adam asmacayla aynı: { ok, wrong } (judge aynı; bot 3 hakka göre). Kart kapanınca (süre) lock().
// Jokerler ve hata ayıklama gizli .fl-key düğmeleriyle konuşur (eski klavyenin sözleşmesi): Yarı Yarıya harf açar →
// o harfin bütün kutuları kilitlenir, kartları çekilir; Seyirci önerisi .fl-key.sug → o harfin kartı ve kutusu parlar.
// Kelimede olmayan harfe basılırsa (yalnız hata ayıklama) ıska sayılır.
// Çevrimiçi: v.tiles kelimenin karışık harfleridir (anagram gibi, tipin doğası); sıra (v.word) gizli kalır.

import { css, esc, shuffle, buzz, trUp, pCorrect, KEYS, physicalKeys } from './util.js';
import { botTime } from './timing.js';
import { setTimeout } from '../core/clock.js';
import { appOf, sfx } from './d_ortak.js';

const MAX = 3; // yanlış deneme hakkı (kale burcu)
const ABC = KEYS.join('');

const MIX_SVG =
	'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/></svg>';

// Görsel dil: oyunun arena dili (şıklar, jokerler, VS rozeti, afiş): eğik kesim (skewX −8°), keskin beyaz çerçeve, kalın
// alt gölge, Barlow Condensed italik 800, doygun renk blokları, segmentli altın halka (süre çubuğu gibi).
const FONT = `'Barlow Condensed','Lilita One',sans-serif`;
/** Karo renkleri (şık harf blokları ve joker paletinden): her harf kendi renginde. */
const PAL = [
	['#5a9bff', '#2f7bff', '#1a4fb8'],
	['#ffad55', '#ff8a1f', '#b9560a'],
	['#4fdc8a', '#22c46a', '#12803f'],
	['#c27cff', '#a24bff', '#6a22b8'],
	['#ff7eb0', '#ec4f93', '#a0225a'],
	['#4fd6e0', '#14b8c4', '#0b7880'],
	['#ff7a6a', '#e5483a', '#9a1d12'],
	['#ffd25a', '#f5b324', '#a36a06'],
];
const CSS = /* css */ `
.hr{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;margin:2px 0 12px;user-select:none;-webkit-user-select:none}
/* --------------------------------------------------- kelime şeridi: eğik kutular (şık dili) */
.hr-top{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;width:100%}
/* uzun kelime: kutular kendi sırasında tam genişlik, hak ve karıştır altında (JS: kutu tek sırada 20 px'ten dar kalırdı) */
.hr-top.two{flex-wrap:wrap;row-gap:8px}
.hr-top.two .hr-word{flex:1 0 100%}
.hr-word{display:flex;justify-content:center;gap:6px;max-width:100%}
.hr-word s{flex:none;width:10px}
.hr-s{position:relative;flex:none;width:var(--sw,34px);height:min(calc(var(--sw,34px) * 1.25),44px);display:grid;place-items:center;transform:skewX(-8deg);overflow:hidden;
  font:italic 800 min(calc(var(--sw,34px) * .8),30px)/1 ${FONT};color:#0e1430;
  background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.28),inset 0 -3px 0 rgba(255,255,255,.08)}
.hr-s.pv{background:linear-gradient(180deg,#fff,#e4e9f4);box-shadow:0 3px 0 rgba(0,0,0,.45);animation:hrSlam .26s cubic-bezier(.2,.9,.3,1.3) both}
.hr-s.lk{color:#1a1200;background:linear-gradient(180deg,#ffe066,#ffbb1f);box-shadow:0 3px 0 #8a5a00,0 0 16px rgba(255,190,40,.45);animation:hrSlam .36s cubic-bezier(.2,.9,.3,1.3) both}
.hr-s.bad{color:#fff;background:linear-gradient(180deg,#ff6a5a,#d42a1c);box-shadow:0 3px 0 #6e0c05;animation:hrNo .42s}
.hr-s.ok{color:#fff;background:linear-gradient(180deg,#7fe88a,#2fa84a);box-shadow:0 3px 0 #0f5a22,0 0 18px rgba(95,232,120,.5);text-shadow:0 2px 0 rgba(0,60,20,.35);
  animation:hrWin .5s calc(var(--k) * 50ms) cubic-bezier(.2,.9,.3,1.3) both}
.hr-s.miss{color:#ffd1cc;background:rgba(229,58,42,.25);box-shadow:inset 0 0 0 1.5px rgba(255,90,70,.7)}
.hr-s.sug{box-shadow:0 0 0 2.5px #ec4f93,0 0 16px rgba(236,79,147,.7)}
.hr-s::after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.75) 50%,transparent 65%);transform:translateX(-130%);pointer-events:none}
.hr-s.ok::after,.hr-s.lk::after{animation:hrWipe .6s calc(var(--k,0) * 50ms + .1s) ease-out}
@keyframes hrSlam{0%{transform:skewX(-8deg) scale(1.45);opacity:0}100%{transform:skewX(-8deg)}}
@keyframes hrNo{0%,100%{transform:skewX(-8deg)}20%{transform:skewX(-8deg) translateX(-6px)}40%{transform:skewX(-8deg) translateX(5px)}60%{transform:skewX(-8deg) translateX(-3px)}80%{transform:skewX(-8deg) translateX(2px)}}
@keyframes hrWin{0%{transform:skewX(-8deg)}40%{transform:skewX(-8deg) translateY(-7px) scale(1.12)}100%{transform:skewX(-8deg)}}
@keyframes hrWipe{to{transform:translateX(130%)}}
/* hak: üç eğik çubuk (süre çubuğu dili) */
.hr-hp{display:flex;gap:4px}
.hr-hp i{width:9px;height:20px;transform:skewX(-8deg);background:linear-gradient(180deg,#ffe066,#ffbb1f);box-shadow:0 2px 0 #8a5a00;transition:background .3s,box-shadow .3s,transform .4s cubic-bezier(.2,.9,.3,1.3)}
.hr-hp i.down{background:rgba(255,255,255,.12);box-shadow:none;transform:skewX(-8deg) scaleY(.6)}
/* --------------------------------------------------- sahne */
.hr-stage{position:relative;display:flex;justify-content:center;width:100%}
.hr-plat{position:relative;flex:none;width:var(--w);height:var(--h);touch-action:none}
.hr-face{position:absolute;inset:0;pointer-events:none}
.hr-plat.shake{animation:hrShake .45s}
@keyframes hrShake{0%,100%{transform:none}15%{transform:translateX(-10px)}30%{transform:translateX(9px)}45%{transform:translateX(-7px)}60%{transform:translateX(5px)}75%{transform:translateX(-3px)}}
/* çizgi: altın, koyu konturlu, beyaz çekirdek (yayın grafiği) */
.hr-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:2}
.hr-svg polyline,.hr-svg line{fill:none;stroke-linecap:round;stroke-linejoin:round;transition:stroke .2s,opacity .3s}
.hr-svg .gl{stroke:#1a1200;stroke-width:15px;opacity:.9}
.hr-svg .rp{stroke:#ffd25a;stroke-width:10px}
.hr-svg .fx{stroke:#fff8dc;stroke-width:3.5px}
.hr-svg .tl{stroke:#ffd25a;stroke-width:8px;opacity:.85}
.hr-svg.bad .rp,.hr-svg.bad .tl{stroke:#ff5a48}
.hr-svg.bad .fx{stroke:#ffd1cc}
.hr-svg.snap{opacity:0;transition:opacity .3s .15s}
/* karolar: eğik renkli blok, beyaz çerçeve, kalın alt gölge, üst parlaklık; seçilince beyaza döner (harf kendi renginde) */
.hr-t{position:absolute;left:0;top:0;z-index:3;width:var(--tw);height:var(--th);margin:calc(var(--th) / -2) 0 0 calc(var(--tw) / -2);display:grid;place-items:center;
  font:italic 800 calc(var(--th) * .66)/1 ${FONT};color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.3);
  background:linear-gradient(180deg,var(--c1) 0,var(--c2) 55%,var(--c3) 100%);
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.6),inset 0 2px 0 rgba(255,255,255,.35),0 4px 0 rgba(0,0,0,.5),0 8px 14px rgba(0,0,0,.35);
  transform:translate(var(--x),var(--y)) skewX(var(--sk,-8deg)) scale(var(--s,1));transition:transform .42s cubic-bezier(.2,.9,.3,1.25),opacity .3s,background .15s,color .15s;will-change:transform}
.hr-t::before{content:'';position:absolute;left:0;right:0;top:0;height:46%;background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0));pointer-events:none}
.hr-t.on{color:var(--c2);text-shadow:none;background:linear-gradient(180deg,#fff,#e4e9f4);
  box-shadow:0 0 0 3px #ffd25a,0 0 18px rgba(255,210,90,.75),0 4px 0 rgba(0,0,0,.5);transform:translate(var(--x),var(--y)) skewX(var(--sk,-8deg)) translateY(-3px) scale(calc(var(--s,1) * 1.1))}
.hr-t.nope{animation:hrNope .42s}
.hr-t.in{transform:translate(var(--x),var(--y)) skewX(var(--sk,-8deg)) scale(.3);opacity:0}
.hr-t.gone,.hr-t.suck{transform:translate(var(--x),var(--y)) skewX(var(--sk,-8deg)) scale(.2);opacity:0;pointer-events:none}
.hr-t.suck{transition:transform .42s cubic-bezier(.6,0,.8,.4),opacity .42s}
.hr-t.sug{box-shadow:0 0 0 3px #ec4f93,0 0 20px rgba(236,79,147,.8),0 4px 0 rgba(0,0,0,.5)}
@keyframes hrNope{0%,100%{}30%,70%{background:linear-gradient(180deg,#ff6a5a,#d42a1c);color:#fff}}
/* karıştır: VS rozeti gibi eğik siyah plaka, beyaz çerçeve, altın simge (kelime şeridinin sağında); seçerken kalan sayı */
.hr-mix{position:relative;flex:none;width:44px;height:34px;display:grid;place-items:center;border:0;padding:0;cursor:pointer;
  color:#ffd25a;background:#0a0b14;box-shadow:inset 0 0 0 2px #fff,0 4px 14px rgba(0,0,0,.6);transform:skewX(-8deg);transition:transform .15s}
.hr-mix svg{width:22px;height:22px;transform:skewX(8deg);transition:opacity .15s}
.hr-mix:active{transform:skewX(-8deg) scale(.9)}
.hr-mix.spin svg{animation:hrSpin .45s cubic-bezier(.2,.9,.3,1.3)}
.hr-mix.flash{animation:hrHub .6s cubic-bezier(.2,.9,.3,1.3)}
@keyframes hrSpin{to{transform:skewX(8deg) rotate(360deg)}}
@keyframes hrHub{40%{transform:skewX(-8deg) scale(1.35);background:#2fa84a}100%{transform:skewX(-8deg)}}
.hr-mix b{position:absolute;inset:0;display:grid;place-items:center;transform:skewX(8deg);font:italic 800 24px/1 ${FONT};color:#ffd25a;opacity:0;transition:opacity .15s}
.hr.drag .hr-mix svg{opacity:0}
.hr.drag .hr-mix b{opacity:1}
.hr.done .hr-plat{pointer-events:none}
.hr .fl-key{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);border:0;padding:0;margin:0;opacity:0;pointer-events:none}
.hr-fly{position:absolute;left:0;top:0;z-index:8;pointer-events:none;font:italic 800 28px/1 ${FONT};color:#fff;text-shadow:0 0 12px rgba(255,210,90,.95),0 2px 0 rgba(0,0,0,.4)}
.hr-spark{position:absolute;left:0;top:0;z-index:6;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;background:var(--c,#ffd25a);transform-origin:center;pointer-events:none}
/* şerit zemini: eğik koyu plaka */
.hr-face::before{content:'';position:absolute;inset:-8px -6px;transform:skewX(-8deg);background:linear-gradient(180deg,#121a3a,#0a0f24);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.12),0 10px 24px rgba(0,0,0,.5)}
`;

export const hang = {
	cover: 'kisa', // kısa ekranda (yükseklik < 720 px) tam ekran kart: harita şeridi yerine bulmacaya yer (ui.js)
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
		const lock = word.map((c) => c === ' ');
		const free = () => word.map((c, i) => i).filter((i) => !lock[i]); // açılmamış konumlar
		// genişlik oyun alanından (pencereden değil): galerinin telefon çerçevesinde (1280×720'de 325 px) şerit taşmasın
		const vw = Math.min(el.closest('.fl-ui')?.clientWidth || innerWidth || 400, 560);
		// şerit: bir (≤5 harf) ya da iki sıra kart; genişlik ekrana, kart boyu sıraya göre
		const nt = v.tiles.length;
		const GX = 10;
		const GY = 12;
		const W = Math.round(Math.min(vw - 36, 380));
		const rows = nt <= 5 ? 1 : 2;
		const colsMax = Math.ceil(nt / rows);
		const TW = Math.round(Math.min(76, (W - 12 - (colsMax - 1) * GX) / colsMax));
		const TH = Math.round(Math.min(60, Math.max(48, TW * 0.86)));
		const H = rows * TH + (rows - 1) * GY + 8;
		const K = Math.max(TW, TH);
		// kelime kutuları: kısa kelimede hak çubukları ve karıştır düğmesiyle aynı sırada (110 px onlara); uzun kelimede o sırada
		// kutu 20 px'ten dar kalır (320 px'te 10 harf: 11 px kutu, 9 px harf), o zaman kutular tek başına tam genişlik bir sıra,
		// hak ve karıştır altında ortada
		const WT = Math.min(vw - 40, 380);
		const sp = word.filter((c) => c === ' ').length;
		const sw1 = Math.floor((WT - 110 - (n - 1) * 6) / n);
		const two = sw1 < 20;
		const sw = Math.min(40, two ? Math.floor((WT - (n - 1) * 6 - sp * 10) / Math.max(1, n - sp)) : sw1);
		const mixBtn = `<button class="hr-mix" aria-label="Karıştır">${MIX_SVG}<b></b></button>`;
		el.innerHTML = `<div class="hr" style="--w:${W}px;--h:${H}px;--tw:${TW}px;--th:${TH}px;--sw:${sw}px">
			<div class="hr-top${two ? ' two' : ''}"><div class="hr-word">${word.map((c, i) => (c === ' ' ? '<s></s>' : `<b class="hr-s" data-i="${i}"></b>`)).join('')}</div><div class="hr-hp" aria-label="Hak">${'<i></i>'.repeat(MAX)}</div>${mixBtn}</div>
			<div class="hr-stage">
				<div class="hr-plat">
					<div class="hr-face"></div>
					<svg class="hr-svg" viewBox="0 0 ${W} ${H}"><polyline class="gl"/><polyline class="rp"/><polyline class="fx"/><line class="tl"/></svg>
					${v.tiles.map((c, i) => `<b class="hr-t in" data-i="${i}" style="--c1:${PAL[i % 8][0]};--c2:${PAL[i % 8][1]};--c3:${PAL[i % 8][2]}"><span>${esc(c)}</span></b>`).join('')}
				</div>
			</div>
			${[...ABC].map((k) => `<button class="fl-key" data-k="${k}" tabindex="-1" aria-hidden="true"></button>`).join('')}
		</div>`;
		const root = el.querySelector('.hr');
		const ring = el.querySelector('.hr-plat');
		const svg = el.querySelector('.hr-svg');
		const mix = el.querySelector('.hr-mix');
		const cnt = mix.querySelector('b');
		const slots = new Map([...el.querySelectorAll('.hr-s')].map((s) => [+s.dataset.i, s]));
		const hp = [...el.querySelectorAll('.hr-hp i')];
		const [pGl, pRp, pFx] = svg.querySelectorAll('polyline');
		const tail = svg.querySelector('line');
		const T = v.tiles.map((c, i) => ({ c, i, el: el.querySelector(`.hr-t[data-i="${i}"]`), on: true, x: W / 2, y: H / 2, s: 1 }));
		let path = [];
		let wrong = 0;
		let done = false;
		let busy = false; // deneme sonucu canlanırken giriş yok
		const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

		const setPos = (t) => {
			t.el.style.setProperty('--x', t.x.toFixed(1) + 'px');
			t.el.style.setProperty('--y', t.y.toFixed(1) + 'px');
			t.el.style.setProperty('--s', t.s.toFixed(3));
		};
		// ------------------------------------------------ dizilim: satırlar ortalı (kalan kart azaldıkça tek sıraya iner)
		const layout = () => {
			const on = T.filter((t) => t.on);
			const m = on.length;
			const r = m <= colsMax ? 1 : 2;
			const per = Math.ceil(m / r);
			on.forEach((t, k) => {
				const row = Math.floor(k / per);
				const inRow = row === r - 1 ? m - per * (r - 1) : per;
				const c = k - row * per;
				const rw = inRow * TW + (inRow - 1) * GX;
				t.x = W / 2 - rw / 2 + c * (TW + GX) + TW / 2;
				t.y = r === 1 ? H / 2 : H / 2 + (row ? 1 : -1) * ((TH + GY) / 2);
				setPos(t);
			});
		};
		// açılış: kartlar ortadan yerlerine sırayla açılır
		for (const t of T) setPos(t);
		requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				layout();
				T.forEach((t, k) => {
					t.el.style.transitionDelay = reduce ? '0ms' : k * 38 + 'ms';
					t.el.classList.remove('in');
				});
				setTimeout(() => T.forEach((t) => (t.el.style.transitionDelay = '')), 700);
			}),
		);

		// ------------------------------------------------ çizim: çizgi, kuyruk, canlı kutular, kalan sayısı
		let finger = null;
		const draw = () => {
			const pts = path.map((t) => `${t.x.toFixed(1)},${t.y.toFixed(1)}`).join(' ');
			const show = path.length > 1 ? pts : '';
			pGl.setAttribute('points', show);
			pRp.setAttribute('points', show);
			pFx.setAttribute('points', show);
			const last = path[path.length - 1];
			if (last && finger) {
				tail.setAttribute('x1', last.x);
				tail.setAttribute('y1', last.y);
				tail.setAttribute('x2', finger[0]);
				tail.setAttribute('y2', finger[1]);
				tail.style.display = '';
			} else tail.style.display = 'none';
			if (!root.classList.contains('win'))
				free().forEach((pos, j) => {
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

		const relOf = (e) => {
			const a = e.getBoundingClientRect();
			const b = root.getBoundingClientRect();
			return [a.left - b.left + a.width / 2, a.top - b.top + a.height / 2];
		};
		/** Harf sikkeden kutusuna uçar (yalnız transform / opacity). */
		const fly = (t, slot) => {
			if (reduce || !slot) return;
			const [x0, y0] = relOf(t.el);
			const [x1, y1] = relOf(slot);
			const f = document.createElement('i');
			f.className = 'hr-fly';
			f.textContent = t.c;
			root.appendChild(f);
			const w = f.offsetWidth / 2;
			const h = f.offsetHeight / 2;
			f.animate(
				[
					{ transform: `translate(${x0 - w}px,${y0 - h}px) scale(1.15)`, opacity: 1 },
					{ transform: `translate(${(x0 + x1) / 2 - w}px,${Math.min(y0, y1) - 22 - h}px) scale(1.05)`, opacity: 1, offset: 0.55 },
					{ transform: `translate(${x1 - w}px,${y1 - h}px) scale(.8)`, opacity: 0 },
				],
				{ duration: 230, easing: 'cubic-bezier(.3,.6,.5,1)', fill: 'forwards' },
			).onfinish = () => f.remove();
		};
		const sparks = (x, y, c, k = 8, d0 = 16, d1 = 30) => {
			for (let i = 0; i < k; i++) {
				const s = document.createElement('i');
				s.className = 'hr-spark';
				s.style.setProperty('--c', c);
				root.appendChild(s);
				const a = (i / k) * Math.PI * 2 + Math.random() * 0.5;
				const d = d0 + Math.random() * (d1 - d0);
				s.animate([{ transform: `translate(${x}px,${y}px) scale(1)`, opacity: 1 }, { transform: `translate(${x + Math.cos(a) * d}px,${y + Math.sin(a) * d}px) scale(.25)`, opacity: 0 }], {
					duration: 420 + Math.random() * 240,
					easing: 'cubic-bezier(.2,.7,.4,1)',
				}).onfinish = () => s.remove();
			}
		};

		const add = (t) => {
			path.push(t);
			root.classList.add('used');
			fly(t, slots.get(free()[path.length - 1]));
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

		// ------------------------------------------------ sonuç
		const finish = (ok) => {
			done = true;
			root.classList.add('done');
			api.answer({ ok, wrong });
		};
		const win = () => {
			finger = null;
			root.classList.remove('drag');
			for (const pos of slots.keys()) lock[pos] = true; // kutular artık çizimin dışında (kart kilitlenince boşalmasın)
			root.classList.add('win');
			// kartlar ortaya çekilir, karıştır düğmesi yeşil parlar ve kıvılcım saçar
			T.forEach((t, k) => {
				if (!t.on) return;
				t.el.style.transitionDelay = k * 28 + 'ms';
				t.x = W / 2;
				t.y = H / 2;
				setPos(t);
				t.el.classList.add('suck');
			});
			path = [];
			draw();
			let k = 0;
			for (const [pos, s] of slots) {
				s.textContent = word[pos];
				s.classList.remove('pv', 'lk', 'bad', 'sug');
				s.style.setProperty('--k', k++);
				s.classList.add('ok');
			}
			finish(true);
			sfx(app, 'right');
			setTimeout(() => {
				mix.classList.add('flash');
				const [x, y] = relOf(mix);
				sparks(x, y, '#ffd25a', 14, H * 0.25, W * 0.42);
				sparks(x, y, '#7fe88a', 8, H * 0.15, W * 0.3);
				sfx(app, 'sparkle', { vol: 0.6 });
			}, 360);
			buzz(25);
		};
		/** Konumu sarıya kilitle; bu harfin şeritteki kartı (verilmişse o kart) çekilir. */
		const lockAt = (pos, tile = null) => {
			lock[pos] = true;
			const t = tile || T.find((x) => x.on && x.c === word[pos]);
			if (t) {
				t.on = false;
				t.el.classList.add('gone');
				t.el.classList.remove('sug', 'on');
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
			draw();
			// ip kızarıp kopar; yanlış yerdeki sikkeler sarsılır, kutuları kızarır; doğru yerdekiler altına kilitlenir
			svg.classList.add('bad');
			const good = pairs.filter(([pos, t]) => t.c === word[pos]);
			for (const [pos, t] of pairs) {
				if (good.some(([p]) => p === pos)) continue;
				const s = slots.get(pos);
				s.classList.remove('pv');
				s.classList.add('bad');
				t.el.classList.remove('nope');
				void t.el.offsetWidth;
				t.el.classList.add('nope');
			}
			const over = miss();
			setTimeout(() => svg.classList.add('snap'), 120);
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
				for (const t of T) t.el.classList.remove('nope');
				path = [];
				svg.classList.remove('bad', 'snap');
				layout();
				draw();
				busy = false;
				if (!over && allOpen()) win();
			}, 520);
		};

		// ------------------------------------------------ giriş: sürükle ya da dokun
		let down = null; // { moved, popOnUp }
		let rect = null;
		const at = (e) => [((e.clientX - rect.left) / rect.width) * W, ((e.clientY - rect.top) / rect.height) * H];
		const hit = (x, y, r) => {
			let best = null;
			let bd = Infinity;
			for (const t of T) {
				if (!t.on) continue;
				const d = (t.x - x) ** 2 + (t.y - y) ** 2;
				const rr = r * t.s;
				if (d < rr * rr && d < bd) {
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
			const t = hit(x, y, K * 0.62);
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
			const t = hit(x, y, K * 0.48);
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
			if (path.length === free().length) {
				draw();
				return submit();
			}
			if (d.moved && path.length > 1) return clear(); // sürükleme yarım kaldı: harfler geri döner (ceza yok)
			root.classList.remove('drag');
			draw();
		};
		ring.addEventListener('pointerup', (e) => up(e));
		ring.addEventListener('pointercancel', (e) => up(e, true));
		mix.addEventListener('click', () => {
			if (done || busy) return;
			const sh = shuffle(
				T.filter((t) => t.on),
				Math.random,
			);
			const order = T.map((t) => (t.on ? sh.shift() : t));
			T.splice(0, T.length, ...order);
			T.forEach((t, k) => (t.el.style.transitionDelay = k * 22 + 'ms'));
			setTimeout(() => T.forEach((t) => (t.el.style.transitionDelay = '')), 650);
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
		// classList.add, sınıf zaten olsa da bir 'class' değişimi kaydı üretir: koşulsuz eklemek gözlemciyi kendi kendine
		// tetikler, sonsuz döngüde sayfa donardı (Seyirci jokeri). Yalnız eksikse eklenir.
		const sug = (e) => e && !e.classList.contains('sug') && e.classList.add('sug');
		const mo = new MutationObserver(() => {
			for (const k of el.querySelectorAll('.fl-key.sug')) {
				const L = k.dataset.k;
				sug(T.find((t) => t.on && t.c === L)?.el);
				const pos = word.findIndex((c, i) => c === L && !lock[i]);
				if (pos >= 0) sug(slots.get(pos));
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
