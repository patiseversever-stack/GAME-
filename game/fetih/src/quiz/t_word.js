// Kelime tipleri: anagram ve mini çengel bulmaca (cross).

import { css, esc, shuffle, pCorrect, buzz, clamp, trUp, physicalKeys, chips, isLand, LAND } from './util.js';
import { botTime } from './timing.js';
import { layout, crossCount } from './crossgen.js';
import { setTimeout } from '../core/clock.js';

const FONT = `'Barlow Condensed','Lilita One',sans-serif`;
const SVG = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I_MIX = SVG('<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/>');
const I_UNDO = SVG('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>');
const I_CLR = SVG('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>');

const CSS = /* css */ `
/* anagram (v1.5): Şerit'in (adam asmaca) arena dili. Eğik kutular, tek renk eğik kartlar (lacivert, beyaz harf: renkli
   jokerlerle karışmaz), siyah plaka düğmeler. Dolan kutu
   beyaz zeminde koyu harf (her zaman okunur), sıradaki boş kutu altın çerçeveyle nabız atar; kullanılan kart çekilir, yerinde
   boş yuva kalır. Bütün canlandırmalar transform / opacity. */
.an{display:flex;flex-direction:column;align-items:center;gap:16px;margin:4px 0 10px;user-select:none;-webkit-user-select:none}
.an .an-word{display:flex;flex-wrap:nowrap;justify-content:center;gap:6px;max-width:100%}
.an .an-word s{flex:none;width:10px}
.an .an-word b{position:relative;flex:none;width:var(--sw,34px);height:min(calc(var(--sw,34px) * 1.28),48px);display:grid;place-items:center;overflow:hidden;cursor:pointer;
  transform:skewX(-8deg);border:0;border-radius:0;font:italic 800 min(calc(var(--sw,34px) * .84),32px)/1 ${FONT};color:#0e1430;
  background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.3),inset 0 -3px 0 rgba(255,255,255,.08);transition:background .18s,box-shadow .18s}
.an .an-word b.nx{box-shadow:inset 0 0 0 2.5px #ffd25a,0 0 14px rgba(255,210,90,.45);animation:anNx 1.1s ease-in-out infinite}
.an .an-word b.has{background:linear-gradient(180deg,#fff,#e2e8f5);box-shadow:0 3px 0 rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.9)}
.an .an-word b.in{animation:anSlam .26s cubic-bezier(.2,.9,.3,1.3) both}
.an .an-word.bad b.has{color:#fff;background:linear-gradient(180deg,#ff6a5a,#d42a1c);box-shadow:0 3px 0 #6e0c05}
.an .an-word.good b{color:#fff;background:linear-gradient(180deg,#7fe88a,#2fa84a);box-shadow:0 3px 0 #0f5a22,0 0 18px rgba(95,232,120,.5);text-shadow:0 2px 0 rgba(0,60,20,.35);
  animation:anWin .5s calc(var(--k,0) * 50ms) cubic-bezier(.2,.9,.3,1.3) both}
.an .an-word.shake{animation:anShake .45s}
.an-tiles{display:flex;flex-wrap:wrap;justify-content:center;gap:12px 9px;max-width:100%}
.an-k{position:relative;flex:none;width:var(--tw,50px);height:var(--th,58px);transform:skewX(-8deg);background:rgba(255,255,255,.035);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.13)}
.an .fl-tile.an-t{position:absolute;inset:0;width:auto;min-width:0;height:auto;padding:0;margin:0;border:0;border-radius:0;display:grid;place-items:center;cursor:pointer;
  font:italic 800 calc(var(--th,58px) * .62)/1 ${FONT};color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.45);
  background:linear-gradient(180deg,#2c3866 0,#1b2448 55%,#121834 100%);
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.88),inset 0 3px 0 rgba(255,255,255,.12),0 4px 0 rgba(0,0,0,.6),0 8px 14px rgba(0,0,0,.4);
  transition:transform .3s cubic-bezier(.2,.9,.3,1.25),opacity .22s,background .12s,color .12s}
.an .fl-tile.an-t::before{content:'';position:absolute;left:2px;right:2px;top:2px;height:44%;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,0));pointer-events:none}
.an .fl-tile.an-t:active{transform:translateY(3px) scale(.95);color:#1a1200;text-shadow:none;background:linear-gradient(180deg,#ffe066,#ffbb1f)}
.an .fl-tile.an-t.used{opacity:0;transform:scale(.35);pointer-events:none}
.an .fl-tile.an-t.pop{animation:anPop .32s cubic-bezier(.2,.9,.3,1.3) both}
.an-acts{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.an-b{display:inline-flex;align-items:center;gap:7px;height:40px;padding:0 15px;border:0;cursor:pointer;color:#fff;background:#0a0b14;
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.92),0 4px 14px rgba(0,0,0,.55);transform:skewX(-8deg);transition:transform .12s,opacity .2s;
  font:italic 800 16px/1 ${FONT};letter-spacing:.05em;text-transform:uppercase}
.an-b>*{transform:skewX(8deg)}
.an-b svg{flex:none;width:18px;height:18px;color:#ffd25a}
.an-b:active{transform:skewX(-8deg) scale(.93)}
.an-b.spin svg{animation:anSpin .45s cubic-bezier(.2,.9,.3,1.3)}
.an.done .an-tiles,.an.done .an-acts{opacity:.35;pointer-events:none}
@keyframes anNx{50%{box-shadow:inset 0 0 0 2.5px #ffd25a,0 0 22px rgba(255,210,90,.75)}}
@keyframes anSlam{0%{transform:skewX(-8deg) scale(1.45);opacity:0}100%{transform:skewX(-8deg)}}
@keyframes anWin{0%{transform:skewX(-8deg)}40%{transform:skewX(-8deg) translateY(-7px) scale(1.12)}100%{transform:skewX(-8deg)}}
@keyframes anShake{0%,100%{transform:none}15%{transform:translateX(-10px)}30%{transform:translateX(9px)}45%{transform:translateX(-7px)}60%{transform:translateX(5px)}75%{transform:translateX(-3px)}}
@keyframes anPop{0%{transform:scale(.6);opacity:0}100%{transform:none;opacity:1}}
@keyframes anSpin{to{transform:skewX(8deg) rotate(360deg)}}
/* çengel (v1.5): klavyesiz. Seçili kelimenin harfleri karışık kart (anagram kartları); dokunulan harf kelimenin sıradaki
   boş kutusuna oturur. Kutular arena dilinde: dolu kutu beyaz zeminde koyu harf, seçili kelime altın çerçeve, sıradaki
   kutu nabız. İpucu eğik siyah plakada büyük yazı. */
.xw{gap:12px}
.xw-grid{display:grid;gap:4px;justify-content:center;touch-action:manipulation}
.xw-c{position:relative;display:grid;place-items:center;cursor:pointer;border-radius:3px;font:italic 800 calc(var(--cs) * .6)/1 ${FONT};color:#0e1430;
  background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.24);transition:background .15s,box-shadow .15s}
.xw-c.void{visibility:hidden}
.xw-c sup{position:absolute;left:3px;top:2px;font:800 max(9px,calc(var(--cs) * .27))/1 ${FONT};font-style:normal;color:#ffd25a;pointer-events:none}
.xw-c.wd{background:rgba(255,210,90,.1);box-shadow:inset 0 0 0 2px rgba(255,210,90,.8)}
.xw-c.nx{box-shadow:inset 0 0 0 3px #ffd25a,0 0 14px rgba(255,210,90,.6);animation:anNx 1.1s ease-in-out infinite}
.xw-c.has{background:linear-gradient(180deg,#fff,#e2e8f5);box-shadow:0 3px 0 rgba(0,0,0,.45)}
.xw-c.has.wd{box-shadow:0 3px 0 rgba(0,0,0,.45),0 0 0 2.5px #ffd25a}
.xw-c.has sup{color:#9a6a00}
.xw-c.in{animation:xwIn .24s cubic-bezier(.2,.9,.3,1.3) both}
.xw-c.ok{color:#fff;background:linear-gradient(180deg,#7fe88a,#2fa84a);box-shadow:0 3px 0 #0f5a22}
.xw-c.bad{color:#fff;background:linear-gradient(180deg,#ff6a5a,#d42a1c);box-shadow:0 3px 0 #6e0c05}
.xw-c.ok sup,.xw-c.bad sup{color:rgba(255,255,255,.85)}
.xw-grid.shake{animation:anShake .45s}
.xw-clue{display:flex;align-items:stretch;gap:9px;width:100%;max-width:460px}
.xw-txt{flex:1;min-width:0;display:flex;align-items:center;gap:11px;min-height:54px;padding:7px 14px;transform:skewX(-8deg);background:#0a0b14;
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.92),0 4px 14px rgba(0,0,0,.5)}
.xw-txt>*{transform:skewX(8deg)}
.xw-txt b{flex:none;display:flex;align-items:center;gap:2px;height:34px;padding:0 9px;color:#1a1200;background:linear-gradient(180deg,#ffe066,#ffbb1f);box-shadow:0 2px 0 #8a5a00;
  font:italic 800 23px/1 ${FONT}}
.xw-txt b i{font-style:normal;font-size:18px}
.xw-txt span{min-width:0;font-weight:600;font-size:17px;line-height:1.2;color:#fff;text-wrap:balance}
.xw-nav{flex:none;width:46px;border:0;padding:0;cursor:pointer;display:grid;place-items:center;color:#ffd25a;background:#0a0b14;transform:skewX(-8deg);
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.92),0 4px 14px rgba(0,0,0,.5);transition:transform .12s}
.xw-nav svg{width:22px;height:22px;transform:skewX(8deg)}
.xw-nav:active{transform:skewX(-8deg) scale(.92)}
.xw .an-tiles{min-height:var(--th,58px)}
.xw .an-k.give{box-shadow:inset 0 0 0 1.5px rgba(255,210,90,.35)}
.an-b.gold{color:#1a1200;background:linear-gradient(180deg,#ffe066,#ffbb1f);box-shadow:inset 0 0 0 2px #fff,0 4px 0 #8a5a00,0 6px 14px rgba(0,0,0,.4)}
.an-b.gold svg{color:#1a1200}
.an-b.gold.hot{animation:xwHot 1s ease-in-out infinite}
.xw.done .xw-clue{opacity:.4;pointer-events:none}
/* kısa ekran (< 700 px, tam ekran kart; JS .sh): tahtaya yer açılsın diye ipucu plakası, kartlar ve düğmeler sıkı */
.xw.sh{gap:7px;margin:0 0 4px}
.xw.sh .xw-txt{min-height:42px;padding:5px 12px;gap:9px}
.xw.sh .xw-txt b{height:28px;padding:0 7px;font-size:19px}
.xw.sh .xw-txt b i{font-size:15px}
.xw.sh .xw-txt span{font-size:15px;line-height:1.18}
.xw.sh .xw-nav{width:40px}
.xw.sh .an-tiles{gap:8px 8px}
.xw.sh .an-acts{gap:8px}
.xw.sh .an-b{height:34px;padding:0 12px;gap:6px;font-size:14px}
.xw.sh .an-b svg{width:16px;height:16px}
@keyframes xwIn{0%{transform:scale(1.35);opacity:0}100%{transform:none}}
@keyframes xwHot{50%{box-shadow:inset 0 0 0 2px #fff,0 4px 0 #8a5a00,0 0 22px rgba(255,210,90,.9)}}
@keyframes flq-pop2{from{transform:scale(.4)}to{transform:scale(1)}}
${LAND}{
  .an{gap:9px;margin-bottom:4px}
  .an-tiles{gap:7px 7px}
  .an-b{height:34px;font-size:14px;padding:0 12px}
  .xw{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:start;gap:8px 12px}
  .xw-grid{grid-column:1;grid-row:1/4}
  .xw-clue,.xw .an-tiles,.xw .an-acts{grid-column:2}
  .xw-txt{min-height:44px}
  .xw-txt span{font-size:15px}
}
`;

// ---------------------------------------------------------------- anagram
export const anagram = {
	cover: 'kisa', // kısa ekranda (yükseklik < 720 px) tam ekran kart: harita şeridi yerine bulmacaya yer (ui.js)
	time: 26, // belge/yedek: bankanın ortancası (timing.test)
	label: 'Anagram',
	kind: 'exact',
	prepare(q, R) {
		const word = trUp(q.w);
		const letters = [...word].filter((c) => c !== ' ');
		let tiles = shuffle(letters, R);
		for (let k = 0; k < 20 && tiles.join('') === letters.join(''); k++) tiles = shuffle(letters, R);
		return { q, word, tiles };
	},
	mount(el, v, api) {
		css('word', CSS);
		const chars = [...v.word];
		const need = v.tiles.length;
		el.innerHTML = `<div class="an fl-ana">
			<div class="an-word fl-word" data-r="slots"></div>
			<div class="an-tiles" data-r="tiles">${v.tiles
				.map((c, i) => `<span class="an-k"><button type="button" class="fl-tile an-t" data-i="${i}">${esc(c)}</button></span>`)
				.join('')}</div>
			<div class="an-acts fl-ana-row"><button type="button" class="an-b" data-a="shuf">${I_MIX}<span>Karıştır</span></button><button type="button" class="an-b" data-a="undo">${I_UNDO}<span>Geri al</span></button><button type="button" class="an-b" data-a="clr">${I_CLR}<span>Temizle</span></button></div>
		</div>`;
		const root = el.querySelector('.an');
		const slotsEl = el.querySelector('[data-r=slots]');
		const tilesEl = el.querySelector('[data-r=tiles]');
		const socks = [...tilesEl.children];
		const tileBtns = socks.map((k) => k.firstElementChild);
		// ölçü: kutular tek sırada sığar; kartlar 7'ye kadar tek, fazlası iki sıra (parmakla rahat seçilir)
		const W = Math.min(Math.max(240, (el.closest('.fl-ui')?.clientWidth || innerWidth) - 40), 420);
		const gaps = chars.length - 1;
		const sp = chars.filter((c) => c === ' ').length;
		const sw = clamp(Math.floor((W - gaps * 6 - sp * 4) / Math.max(1, chars.length - sp)), 22, 40);
		const per = need <= 7 ? need : Math.ceil(need / 2);
		const tw = clamp(Math.floor((W - (per - 1) * 9) / per), 34, 58);
		const th = clamp(Math.round(tw * 1.16), 44, 62);
		root.style.setProperty('--sw', sw + 'px');
		root.style.setProperty('--tw', tw + 'px');
		root.style.setProperty('--th', th + 'px');
		let placed = -1; // son yerleşen kutu (yalnız o çarpma canlandırmasıyla gelir)
		let order = v.tiles.map((_, i) => i); // ekrandaki düzen: tile indeksleri
		const seq = []; // dolu yuvalar: tile indeksleri
		let tries = 0;
		let done = false;
		const text = () => seq.map((i) => v.tiles[i]).join('');
		const drawSlots = () => {
			let k = 0;
			slotsEl.innerHTML = chars
				.map((c) => {
					if (c === ' ') return '<s></s>';
					const i = k++;
					const has = seq[i] != null;
					const cls = has ? (i === placed ? 'has in' : 'has') : i === seq.length && !done ? 'nx' : '';
					return `<b data-s="${i}" class="${cls}" style="--k:${i}">${has ? esc(v.tiles[seq[i]]) : ''}</b>`;
				})
				.join('');
			placed = -1;
		};
		const drawTiles = () => {
			tilesEl.append(...order.map((i) => socks[i]));
			tileBtns.forEach((b, i) => {
				const was = b.classList.contains('used');
				const now = seq.includes(i);
				b.classList.toggle('used', now);
				if (was && !now) {
					b.classList.remove('pop');
					void b.offsetWidth;
					b.classList.add('pop');
				}
			});
		};
		const check = () => {
			if (seq.length < need) return;
			if (text() === v.word.replace(/ /g, '')) {
				done = true;
				root.classList.add('done');
				slotsEl.classList.add('good');
				buzz(20);
				api.answer({ ok: true, tries });
			} else {
				tries++;
				slotsEl.classList.add('bad', 'shake');
				buzz(30);
				done = true; // kısa kilit
				setTimeout(() => {
					slotsEl.classList.remove('bad', 'shake');
					seq.length = 0;
					done = false;
					drawSlots();
					drawTiles();
				}, 520);
			}
		};
		tilesEl.addEventListener('click', (e) => {
			const b = e.target.closest('.fl-tile');
			if (!b || done || b.classList.contains('used')) return;
			placed = seq.length;
			seq.push(Number(b.dataset.i));
			buzz(5);
			drawSlots();
			drawTiles();
			check();
		});
		slotsEl.addEventListener('click', (e) => {
			const b = e.target.closest('b');
			if (!b || done) return;
			const s = Number(b.dataset.s);
			if (s < seq.length) {
				seq.splice(s, 1);
				drawSlots();
				drawTiles();
			}
		});
		root.querySelector('.an-acts').addEventListener('click', (e) => {
			const btn = e.target.closest('[data-a]');
			const a = btn?.dataset.a;
			if (!a || done) return;
			if (a === 'clr') seq.length = 0;
			else if (a === 'undo') seq.pop();
			else {
				order = shuffle(order, Math.random);
				btn.classList.remove('spin');
				void btn.offsetWidth;
				btn.classList.add('spin');
			}
			buzz(5);
			drawSlots();
			drawTiles();
		});
		drawSlots();
		drawTiles();
		return {
			lock() {
				done = true;
			},
			value: () => ({ ok: false, tries }),
			reveal(results) {
				done = true;
				root.classList.add('done');
				slotsEl.classList.remove('bad', 'shake');
				slotsEl.classList.add('good');
				let k = 0;
				slotsEl.innerHTML = chars.map((c) => (c === ' ' ? '<s></s>' : `<b class="has" style="--k:${k++}">${esc(c)}</b>`)).join('');
				root.insertAdjacentHTML('beforeend', chips(results, (r) => (r.correct ? '✓' : '✗')));
			},
			destroy() {},
		};
	},
	judge(v, value) {
		if (!value || !value.ok) return { correct: false, err: 99 };
		return { correct: true, err: value.tries };
	},
	bot(v, skill, R) {
		const n = v.tiles.length;
		const ok = R() < clamp(pCorrect(skill, v.q.diff) - (n > 8 ? 0.08 : 0), 0.08, 0.95);
		return { value: { ok, tries: ok ? (R() < 0.25 ? 1 : 0) : 3 }, time: botTime(v, R, skill, 0.1, 0.9) };
	},
};

// ---------------------------------------------------------------- cross
/**
 * Dikey telefon (oyun dikey kilitli): tahtanın eni boyundan az olmasın. Kartta en 296–440 px, tahtanın boyu ise 128–300 px
 * (kısa ekranda 568 px'te ancak ~100 px); uzun kelime dikey düşünce (11 harf: 11 satır) tahta ekrana sığmaz, kutular
 * küçülür. Böyle tahta 90° çevrilir: satır ↔ sütun, yatay ↔ dikey; numaralar okuma sırasıyla yeniden verilir (bulmaca
 * aynı: kelimeler, kesişmeler, harfler). Hücre sırası layout() ile aynı kuralla kurulur.
 */
function wide(L) {
	if (L.rows <= L.cols) return L;
	const words = L.words.map((w) => ({ ...w, r: w.c, c: w.r, dir: w.dir === 'a' ? 'd' : 'a' }));
	const starts = [...new Set(words.map((p) => p.r * 100 + p.c))].sort((a, b) => a - b);
	for (const p of words) p.n = starts.indexOf(p.r * 100 + p.c) + 1;
	words.sort((a, b) => a.n - b.n || (a.dir === 'a' ? -1 : 1));
	const cells = [];
	const seen = new Set();
	for (const p of words)
		for (let i = 0; i < p.w.length; i++) {
			const r = p.r + (p.dir === 'd' ? i : 0);
			const c = p.c + (p.dir === 'a' ? i : 0);
			if (seen.has(r + ',' + c)) continue;
			seen.add(r + ',' + c);
			cells.push({ r, c, ch: p.w[i] });
		}
	return { ...L, rows: L.cols, cols: L.rows, words, cells };
}

export const cross = {
	cover: 'kisa', // kısa ekranda (yükseklik < 720 px) tam ekran kart: harita şeridi yerine bulmacaya yer (ui.js)
	time: 45, // belge/yedek: bankanın ortancası (timing.test; v1.5: 3–4 kelime, kartlarla)
	label: 'Çengel',
	kind: 'closest',
	keep: true, // arayüz sıralama tablosunu tahtanın altına ekler
	fmt: (v, value, r) => `${v.L.cells.length - r.err}/${v.L.cells.length} harf`,
	sub: (v, value, r) => (r.err === 0 ? 'tam isabet' : `${r.err} eksik ya da yanlış`),
	prepare(q, R) {
		const all = q.words.map((x) => ({ w: trUp(x.w), clue: x.clue }));
		// v1.5: 3 kelime (uzunsa) ya da 4 (kısaysa); kesişen, küçük tahtayı veren alt küme seçilir
		const k = crossCount(all);
		let best = null;
		for (let t = 0; t < (k < all.length ? 14 : 1); t++) {
			const sub = k < all.length ? shuffle(all, R).slice(0, k) : all;
			const L = layout(sub, R);
			const score = (L.ok ? 1000 : 0) - L.rows * L.cols - Math.abs(L.rows - L.cols) * 1.5;
			if (!best || score > best.score) best = { L, score };
		}
		const L = wide(best.L);
		// her kelimenin karışık harfleri (klavye yerine kartlar; çevrimiçinde kelimenin kendisi gizli kalır, kartlar gelir)
		for (const w of L.words) {
			const ch = [...w.w];
			let tl = shuffle(ch, R);
			for (let j = 0; j < 8 && ch.length > 2 && tl.join('') === ch.join(''); j++) tl = shuffle(ch, R);
			w.tiles = tl;
		}
		return { q, L };
	},
	mount(el, v, api) {
		css('word', CSS);
		const { L } = v;
		const land = isLand();
		// ölçüler oyun alanından (pencereden değil: galerinin telefon çerçevesinde 1280×720 → 325×704)
		const ui = el.closest('.fl-ui');
		const W = Math.min(Math.max(240, (ui?.clientWidth || innerWidth) - 32), 440);
		const H0 = ui?.clientHeight || innerHeight;
		// kısa ekran (tam ekran kart, < 700 px): ipucu plakası, harf kartları, düğmeler ve aralıklar sıkı (.xw.sh). Yoksa
		// 568 px'te gövde ancak ~0,64 yakınlaştırmayla sığıyor, tahta harfleri 8 px'e iniyordu, düğmeler joker çubuğunun
		// altında kalıyordu
		const short = !land && H0 < 700;
		// kutu boyu: genişliğe ve (dikeyde) tahta yüksekliğine sığar; 3–4 kelimede iri kutular. Tahta yüksekliği ekranla
		// küçülür (740 px'te 300, 568 px'te 128): kısa telefonda bulmaca ipucu, harf kartları ve düğmelerle birlikte sığar
		const BH = clamp(H0 - 440, 128, 300);
		const cs = land
			? clamp(Math.min(Math.floor((210 - (L.cols - 1) * 4) / L.cols), Math.floor((210 - (L.rows - 1) * 4) / L.rows)), 18, 36)
			: clamp(Math.min(Math.floor((W - (L.cols - 1) * 4) / L.cols), Math.floor((BH - (L.rows - 1) * 4) / L.rows)), 20, 50);
		const idxAt = new Map(L.cells.map((c, i) => [c.r + ',' + c.c, i]));
		const wordsAt = L.cells.map(() => ({}));
		const len = (w) => w.len ?? [...w.w].length;
		L.words.forEach((w, wi) => {
			for (let i = 0; i < len(w); i++) {
				const r = w.r + (w.dir === 'd' ? i : 0);
				const c = w.c + (w.dir === 'a' ? i : 0);
				wordsAt[idxAt.get(r + ',' + c)][w.dir] = wi;
			}
		});
		const cellsOf = (wi) => {
			const w = L.words[wi];
			return Array.from({ length: len(w) }, (_, i) => idxAt.get(w.r + (w.dir === 'd' ? i : 0) + ',' + (w.c + (w.dir === 'a' ? i : 0))));
		};
		const grid = Array.from({ length: L.rows * L.cols }, (_, k) => {
			const r = Math.floor(k / L.cols);
			const c = k % L.cols;
			const i = idxAt.get(r + ',' + c);
			const num = L.words.find((w) => w.r === r && w.c === c)?.n;
			return i == null ? '<div class="xw-c void"></div>' : `<div class="xw-c" data-i="${i}">${num ? `<sup>${num}</sup>` : ''}<span></span></div>`;
		}).join('');
		const chev = (d) => SVG(d < 0 ? '<path d="m15 18-6-6 6-6"/>' : '<path d="m9 18 6-6-6-6"/>');
		const I_OK = SVG('<path d="M20 6 9 17l-5-5"/>');
		el.innerHTML = `<div class="an xw${short ? ' sh' : ''}">
			<div class="xw-grid" style="--cs:${cs}px;grid-template-columns:repeat(${L.cols},${cs}px);grid-auto-rows:${cs}px">${grid}</div>
			<div class="xw-clue"><button type="button" class="xw-nav" data-d="-1" aria-label="önceki kelime">${chev(-1)}</button><div class="xw-txt" data-r="clue"></div><button type="button" class="xw-nav" data-d="1" aria-label="sonraki kelime">${chev(1)}</button></div>
			<div class="an-tiles" data-r="bank"></div>
			<div class="an-acts"><button type="button" class="an-b" data-a="undo">${I_UNDO}<span>Geri al</span></button><button type="button" class="an-b" data-a="clr">${I_CLR}<span>Kelimeyi sil</span></button><button type="button" class="an-b gold" data-a="done">${I_OK}<span>Bitir</span></button></div>
		</div>`;
		const root = el.querySelector('.xw');
		const gridEl = root.querySelector('.xw-grid');
		const cellEls = L.cells.map((c, i) => root.querySelector(`.xw-c[data-i="${i}"]`));
		const clueEl = root.querySelector('[data-r=clue]');
		const bankEl = root.querySelector('[data-r=bank]');
		const doneBtn = root.querySelector('[data-a=done]');
		const letters = L.cells.map(() => '');
		const owner = L.cells.map(() => -1); // harfi hangi kelime koydu
		const cardOf = L.cells.map(() => -1); // o kelimenin kaçıncı kartı
		const hist = L.words.map(() => []); // kelime başına yerleştirme sırası (geri al)
		const banks = L.words.map((w) => (w.tiles ? w.tiles.slice() : shuffle([...w.w], Math.random)));
		const maxBank = Math.max(...banks.map((b) => b.length));
		const per = maxBank <= 7 ? maxBank : Math.ceil(maxBank / 2);
		const tw = clamp(Math.floor(((land ? 260 : W) - (per - 1) * 9) / per), 34, land || short ? 44 : 56);
		root.style.setProperty('--tw', tw + 'px');
		root.style.setProperty('--th', clamp(Math.round(tw * 1.12), 40, short ? 48 : 60) + 'px');
		const known = L.cells.every((c) => c.ch);
		let wi = 0;
		let done = false;
		let placed = -1;
		const empties = (k) => cellsOf(k).filter((i) => !letters[i]);
		/** Kelimenin kart durumları: kullanıldı (bu kelime koydu) / verildi (kesişen kutu öteki kelimeden dolu, aynı harf). */
		const cardState = (k) => {
			const st = banks[k].map(() => '');
			for (const i of cellsOf(k)) if (owner[i] === k && cardOf[i] >= 0) st[cardOf[i]] = 'used';
			for (const i of cellsOf(k)) {
				if (!letters[i] || owner[i] === k) continue;
				const j = banks[k].findIndex((ch, x) => !st[x] && ch === letters[i]);
				if (j >= 0) st[j] = 'give';
			}
			return st;
		};
		const draw = () => {
			const mine = cellsOf(wi);
			const inWord = new Set(mine);
			const nx = done ? -1 : mine.find((i) => !letters[i]) ?? -1;
			cellEls.forEach((e, i) => {
				e.classList.toggle('wd', inWord.has(i));
				e.classList.toggle('nx', i === nx);
				e.classList.toggle('has', !!letters[i]);
				e.classList.toggle('in', i === placed);
				e.lastChild.textContent = letters[i];
			});
			placed = -1;
			const w = L.words[wi];
			clueEl.innerHTML = `<b>${w.n}<i>${w.dir === 'a' ? '→' : '↓'}</i></b><span>${esc(w.clue)}</span>`;
			const st = cardState(wi);
			bankEl.innerHTML = banks[wi].map((ch, j) => `<span class="an-k${st[j] === 'give' ? ' give' : ''}"><button type="button" class="fl-tile an-t${st[j] ? ' used' : ''}" data-j="${j}">${esc(ch)}</button></span>`).join('');
			doneBtn.classList.toggle('hot', letters.every((x) => x));
		};
		const filled = () => letters.every((x) => x);
		const wrongCount = () => L.cells.reduce((s, c, i) => s + (letters[i] === c.ch ? 0 : 1), 0);
		const finish = () => {
			if (done) return;
			done = true;
			root.classList.add('done');
			draw();
			api.answer(letters.slice());
		};
		const nextWord = () => {
			for (let d = 1; d <= L.words.length; d++) {
				const k = (wi + d) % L.words.length;
				if (empties(k).length) return k;
			}
			return wi;
		};
		const afterFill = () => {
			if (filled()) {
				if (known && wrongCount() === 0) return finish();
				if (known) {
					gridEl.classList.remove('shake');
					void gridEl.offsetWidth;
					gridEl.classList.add('shake');
					buzz(30);
				}
				return;
			}
			if (!empties(wi).length) {
				// kelime doldu: bir sonraki boş kelimeye geç
				setTimeout(() => {
					if (done || empties(wi).length) return;
					wi = nextWord();
					draw();
				}, 260);
			}
		};
		const put = (j) => {
			if (done) return;
			const st = cardState(wi);
			if (st[j]) return;
			const i = empties(wi)[0];
			if (i == null) return;
			letters[i] = banks[wi][j];
			owner[i] = wi;
			cardOf[i] = j;
			hist[wi].push(i);
			placed = i;
			buzz(5);
			draw();
			afterFill();
		};
		const take = (i) => {
			letters[i] = '';
			const k = owner[i];
			owner[i] = -1;
			cardOf[i] = -1;
			if (k >= 0) hist[k] = hist[k].filter((x) => x !== i);
		};
		const undo = () => {
			const h = hist[wi];
			if (h.length) take(h[h.length - 1]);
			draw();
		};
		const clearWord = () => {
			for (const i of cellsOf(wi)) if (owner[i] === wi) take(i);
			draw();
		};
		bankEl.addEventListener('click', (e) => {
			const b = e.target.closest('.an-t');
			if (b) put(Number(b.dataset.j));
		});
		gridEl.addEventListener('click', (e) => {
			const c = e.target.closest('.xw-c:not(.void)');
			if (!c || done) return;
			const i = Number(c.dataset.i);
			const w = wordsAt[i];
			const inCur = cellsOf(wi).includes(i);
			if (inCur && letters[i] && owner[i] === wi) take(i); // kendi harfine dokun: kartı geri al
			else if (inCur && w.a != null && w.d != null && !letters[i]) wi = L.words[wi].dir === 'a' ? w.d : w.a; // kesişimde yön değiştir
			else if (!inCur) wi = w[L.words[wi].dir] ?? w.a ?? w.d;
			buzz(4);
			draw();
		});
		root.querySelector('.xw-clue').addEventListener('click', (e) => {
			const d = e.target.closest('.xw-nav')?.dataset.d;
			if (!d || done) return;
			wi = (wi + Number(d) + L.words.length) % L.words.length;
			buzz(4);
			draw();
		});
		root.querySelector('.an-acts').addEventListener('click', (e) => {
			const a = e.target.closest('[data-a]')?.dataset.a;
			if (!a || done) return;
			if (a === 'done') return finish();
			if (a === 'undo') undo();
			else clearWord();
			buzz(5);
		});
		// masaüstü: harf tuşu kartı seçer, ⌫ geri alır, oklar kelime değiştirir
		const stop = physicalKeys(root, {
			onKey(ch) {
				const st = cardState(wi);
				const j = banks[wi].findIndex((x, q) => !st[q] && x === ch);
				if (j >= 0) put(j);
			},
			onBack: () => !done && undo(),
			onArrow(k) {
				if (done) return;
				const d = k === 'ArrowRight' || k === 'ArrowDown' ? 1 : -1;
				wi = (wi + d + L.words.length) % L.words.length;
				draw();
			},
		});
		draw();
		return {
			lock() {
				done = true;
			},
			value: () => letters.slice(),
			reveal(results) {
				done = true;
				stop();
				root.classList.add('done');
				cellEls.forEach((e, i) => {
					e.classList.remove('wd', 'nx', 'in');
					if (L.cells[i].ch) e.classList.add(letters[i] === L.cells[i].ch ? 'ok' : 'bad');
				});
				if (root.closest('.fl-q.cover')) {
					// tam ekran kart: kartlar ve düğmeler kalkar, tahta boşalan yere büyür (kısa ekranda çözüm okunsun; joker
					// çubuğu da cevapta kalkar)
					bankEl.style.display = 'none';
					root.querySelector('.an-acts').style.display = 'none';
					requestAnimationFrame(() => {
						if (!root.isConnected) return;
						const z0 = root.style.zoom; // ui._coverFit'in yakınlaştırması: ölçü onsuz
						root.style.zoom = '';
						const st = getComputedStyle(root);
						const avail = el.clientHeight - (parseFloat(getComputedStyle(el).paddingTop) || 0) - parseFloat(st.marginTop) - parseFloat(st.marginBottom) - (root.offsetHeight - gridEl.offsetHeight) - 4;
						root.style.zoom = z0;
						const c2 = clamp(Math.min(Math.floor((W - (L.cols - 1) * 4) / L.cols), Math.floor((avail - (L.rows - 1) * 4) / L.rows)), cs, 50);
						if (c2 <= cs) return;
						gridEl.style.setProperty('--cs', c2 + 'px');
						gridEl.style.gridTemplateColumns = `repeat(${L.cols},${c2}px)`;
						gridEl.style.gridAutoRows = c2 + 'px';
					});
				} else bankEl.style.visibility = 'hidden';
				setTimeout(() => {
					cellEls.forEach((e, i) => {
						if (!L.cells[i].ch) return;
						letters[i] = L.cells[i].ch;
						e.lastChild.textContent = letters[i];
						e.classList.remove('bad');
						e.classList.add('ok', 'has');
					});
				}, 800);
			},
			destroy: stop,
		};
	},
	judge(v, value) {
		const n = v.L.cells.length;
		if (!Array.isArray(value)) return { correct: false, err: n };
		let err = 0;
		v.L.cells.forEach((c, i) => {
			if (value[i] !== c.ch) err++;
		});
		return { correct: err === 0, err };
	},
	bot(v, skill, R) {
		const p = clamp(pCorrect(skill, v.q.diff) + 0.05, 0.1, 0.96);
		// kelime kelime çözer: bilinmeyen kelimenin yalnızca kesişen harfleri doğru çıkar
		const known = v.L.words.map(() => R() < p);
		const value = v.L.cells.map((c) => c.ch);
		let miss = 0;
		v.L.words.forEach((w, wi) => {
			if (known[wi]) return;
			for (let i = 0; i < w.w.length; i++) {
				if (R() < 0.55) {
					const r = w.r + (w.dir === 'd' ? i : 0);
					const cc = w.c + (w.dir === 'a' ? i : 0);
					const k = v.L.cells.findIndex((x) => x.r === r && x.c === cc);
					if (value[k] === v.L.cells[k].ch) {
						value[k] = '';
						miss++;
					}
				}
			}
		});
		return { value, time: botTime(v, R, skill, 0.2, 1) };
	},
};
