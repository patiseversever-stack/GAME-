// Kelime tipleri: anagram ve mini çengel bulmaca (cross).

import { css, esc, shuffle, pCorrect, buzz, clamp, trUp, keyboard, physicalKeys, chips, isLand, LAND } from './util.js';
import { botTime } from './timing.js';
import { layout } from './crossgen.js';
import { setTimeout } from '../core/clock.js';

const CSS = /* css */ `
/* anagram */
.fl-ana{display:flex;flex-direction:column;align-items:center;gap:14px}
.fl-ana .fl-word b{cursor:pointer;touch-action:manipulation;transition:transform .12s,background .2s;border-bottom-color:rgba(255,210,90,.55)}
.fl-ana .fl-word b.has{background:rgba(255,255,255,.2);border-bottom-color:var(--gold);animation:flq-pop2 .22s cubic-bezier(.3,1.7,.5,1)}
.fl-ana .fl-word.bad b{background:#c8352a;border-bottom-color:#fff}
.fl-ana .fl-word.good b{background:#2a9a44;border-bottom-color:#fff}
.fl-tiles{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:100%}
.fl-tile{width:clamp(38px,calc(11.5 * var(--vw)),48px);height:clamp(44px,calc(13 * var(--vw)),54px);border-radius:12px;background:linear-gradient(180deg,#ffe27a,#f2b02a);color:#3a2000;border:2px solid #fff;
  box-shadow:0 5px 0 #a86a0a;font-family:'Lilita One';font-size:clamp(22px,calc(6.4 * var(--vw)),28px);touch-action:manipulation;transition:transform .12s,opacity .2s,box-shadow .12s}
.fl-tile:active{transform:translateY(4px);box-shadow:0 1px 0 #a86a0a}
.fl-tile.used{opacity:.18;transform:scale(.82);pointer-events:none}
.fl-ana-row{display:flex;gap:8px}
.fl-mini{padding:8px 14px;border-radius:12px;background:#2a4486;border:2px solid rgba(255,255,255,.2);font-size:14px;box-shadow:0 3px 0 #142554}
.fl-ana.done .fl-tiles,.fl-ana.done .fl-ana-row{opacity:.35;pointer-events:none}
/* çengel */
.fl-cross{display:flex;flex-direction:column;align-items:center;gap:8px}
.fl-xc-grid{display:grid;gap:3px;justify-content:center;touch-action:manipulation}
.fl-xc{position:relative;border-radius:7px;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.18);display:grid;place-items:center;
  font-family:'Lilita One';font-size:calc(var(--cs) * .5);color:#fff;transition:background .15s,border-color .15s}
.fl-xc.void{visibility:hidden}
.fl-xc.wd{background:rgba(255,210,90,.25);border-color:rgba(255,210,90,.6)}
.fl-xc.cur{background:rgba(255,210,90,.55);border-color:#fff;color:#3a2000;transform:scale(1.07);z-index:2}
.fl-xc sup{position:absolute;left:2px;top:0;font-family:'Fredoka';font-size:calc(var(--cs) * .28);line-height:1.1;opacity:.85}
.fl-xc.ok{background:#2a9a44;border-color:#fff}
.fl-xc.bad{background:#c8352a;border-color:#fff}
.fl-xc-clue{display:flex;align-items:center;gap:6px;width:100%}
.fl-xc-clue>div{flex:1;min-width:0;padding:7px 10px;border-radius:12px;background:rgba(0,0,0,.28);font-size:14.5px;line-height:1.2;min-height:46px;display:flex;align-items:center;gap:7px}
.fl-xc-clue b{flex:none;padding:2px 7px;border-radius:7px;background:var(--gold);color:#3a2000;font-family:'Lilita One';font-weight:400;font-size:14px}
.fl-xc-nav{flex:none;width:34px;height:46px;border-radius:10px;background:#2a4486;border:2px solid rgba(255,255,255,.2);font-size:14px}
.fl-xc-done{flex:none;padding:0 10px;height:46px;border-radius:10px;font-family:'Lilita One';font-size:14px;color:#3a2000;background:linear-gradient(180deg,#ffe27a,#f2b02a);border:2px solid #fff;box-shadow:0 3px 0 #a86a0a}
.fl-cross .fl-keys{gap:4px}
.fl-cross .fl-key{height:36px}
.fl-cross .fl-back{max-width:48px;flex:1.4}
.fl-cross.done .fl-keys,.fl-cross.done .fl-xc-nav,.fl-cross.done .fl-xc-done{opacity:.3;pointer-events:none}
@keyframes flq-pop2{from{transform:scale(.4)}to{transform:scale(1)}}
${LAND}{
  .fl-ana{gap:8px}
  .fl-tile{width:36px;height:40px;font-size:21px;border-radius:10px}
  .fl-tiles{gap:6px}
  .fl-cross{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:start;gap:6px 10px}
  .fl-xc-grid{grid-column:1;grid-row:1/3}
  .fl-xc-clue{grid-column:2;grid-row:1}
  .fl-cross>[data-r=kb]{grid-column:2;grid-row:2}
  .fl-cross .fl-key{height:32px;min-width:0}
}
`;

// ---------------------------------------------------------------- anagram
export const anagram = {
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
		el.innerHTML = `<div class="fl-ana">
			<div class="fl-word" data-r="slots"></div>
			<div class="fl-tiles" data-r="tiles">${v.tiles.map((c, i) => `<button class="fl-tile" data-i="${i}">${c}</button>`).join('')}</div>
			<div class="fl-ana-row"><button class="fl-mini" data-a="shuf">🔀 Karıştır</button><button class="fl-mini" data-a="clr">⌫ Temizle</button></div>
		</div>`;
		const root = el.querySelector('.fl-ana');
		const slotsEl = el.querySelector('[data-r=slots]');
		const tilesEl = el.querySelector('[data-r=tiles]');
		const tileBtns = [...tilesEl.children];
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
					return `<b data-s="${i}" class="${seq[i] != null ? 'has' : ''}">${seq[i] != null ? v.tiles[seq[i]] : ''}</b>`;
				})
				.join('');
		};
		const drawTiles = () => {
			tilesEl.append(...order.map((i) => tileBtns[i]));
			tileBtns.forEach((b, i) => b.classList.toggle('used', seq.includes(i)));
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
		root.querySelector('.fl-ana-row').addEventListener('click', (e) => {
			const a = e.target.closest('[data-a]')?.dataset.a;
			if (!a || done) return;
			if (a === 'clr') seq.length = 0;
			else order = shuffle(order, Math.random);
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
				slotsEl.innerHTML = chars.map((c) => (c === ' ' ? '<s></s>' : `<b class="has">${c}</b>`)).join('');
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
export const cross = {
	time: 63, // belge/yedek: bankanın ortancası (timing.test)
	label: 'Çengel',
	kind: 'closest',
	keep: true, // arayüz sıralama tablosunu tahtanın altına ekler
	fmt: (v, value, r) => `${v.L.cells.length - r.err}/${v.L.cells.length} harf`,
	sub: (v, value, r) => (r.err === 0 ? 'tam isabet' : `${r.err} eksik ya da yanlış`),
	prepare(q, R) {
		const words = q.words.map((x) => ({ w: trUp(x.w), clue: x.clue }));
		const L = layout(words, R);
		return { q, L };
	},
	mount(el, v, api) {
		css('word', CSS);
		const { L } = v;
		// yatay kısa ekranda tahta solda (en çok ~200 px), ipucu ve klavye sağda
		const cs = isLand()
			? clamp(Math.min(Math.floor((200 - (L.cols - 1) * 3) / L.cols), Math.floor((200 - (L.rows - 1) * 3) / L.rows)), 18, 34)
			: clamp(Math.floor((Math.min((el.closest('.fl-ui')?.clientWidth || innerWidth) * 0.96, 520) - 36 - (L.cols - 1) * 3) / L.cols), 26, 44);
		const idxAt = new Map(L.cells.map((c, i) => [c.r + ',' + c.c, i]));
		// her hücre için hangi kelimeler (yatay/dikey) geçiyor
		const wordsAt = L.cells.map(() => ({}));
		L.words.forEach((w, wi) => {
			for (let i = 0; i < w.w.length; i++) {
				const r = w.r + (w.dir === 'd' ? i : 0);
				const c = w.c + (w.dir === 'a' ? i : 0);
				wordsAt[idxAt.get(r + ',' + c)][w.dir] = wi;
			}
		});
		const cellsOf = (wi) => {
			const w = L.words[wi];
			return Array.from({ length: w.w.length }, (_, i) => idxAt.get(w.r + (w.dir === 'd' ? i : 0) + ',' + (w.c + (w.dir === 'a' ? i : 0))));
		};
		const grid = Array.from({ length: L.rows * L.cols }, (_, k) => {
			const r = Math.floor(k / L.cols);
			const c = k % L.cols;
			const i = idxAt.get(r + ',' + c);
			const num = L.words.find((w) => w.r === r && w.c === c)?.n;
			return i == null ? '<div class="fl-xc void"></div>' : `<div class="fl-xc" data-i="${i}">${num ? `<sup>${num}</sup>` : ''}<span></span></div>`;
		}).join('');
		el.innerHTML = `<div class="fl-cross">
			<div class="fl-xc-grid" style="--cs:${cs}px;grid-template-columns:repeat(${L.cols},${cs}px);grid-auto-rows:${cs}px">${grid}</div>
			<div class="fl-xc-clue"><button class="fl-xc-nav" data-d="-1" aria-label="önceki">◀</button><div data-r="clue"></div><button class="fl-xc-nav" data-d="1" aria-label="sonraki">▶</button><button class="fl-xc-done">BİTİR</button></div>
			<div data-r="kb"></div>
		</div>`;
		const root = el.querySelector('.fl-cross');
		const cellEls = L.cells.map((c, i) => root.querySelector(`.fl-xc[data-i="${i}"]`));
		const clueEl = root.querySelector('[data-r=clue]');
		const letters = L.cells.map(() => '');
		let cur = 0; // seçili hücre
		let wi = 0; // seçili kelime
		let done = false;
		const arrow = (d) => (d === 'a' ? '→' : '↓');
		const select = (i, prefer) => {
			cur = i;
			const w = wordsAt[i];
			wi = prefer != null && w[prefer] != null ? w[prefer] : w[L.words[wi]?.dir] != null ? w[L.words[wi].dir] : (w.a ?? w.d);
			draw();
		};
		const draw = () => {
			const inWord = new Set(cellsOf(wi));
			cellEls.forEach((e, i) => {
				e.classList.toggle('wd', inWord.has(i));
				e.classList.toggle('cur', i === cur);
				e.lastChild.textContent = letters[i];
			});
			const w = L.words[wi];
			clueEl.innerHTML = `<b>${w.n}${arrow(w.dir)}</b><span>${esc(w.clue)}</span>`;
		};
		const filled = () => letters.every((x) => x);
		const wrongCount = () => L.cells.reduce((s, c, i) => s + (letters[i] === c.ch ? 0 : 1), 0);
		const finish = () => {
			if (done) return;
			done = true;
			root.classList.add('done');
			api.answer(letters.slice());
		};
		const step = (dir) => {
			const cs2 = cellsOf(wi);
			const k = cs2.indexOf(cur) + dir;
			if (k >= 0 && k < cs2.length) cur = cs2[k];
		};
		const onKey = (ch) => {
			if (done) return;
			letters[cur] = ch;
			buzz(4);
			// bir sonraki boş hücreye, yoksa sonrakine
			const cs2 = cellsOf(wi);
			const from = cs2.indexOf(cur);
			const next = cs2.slice(from + 1).find((i) => !letters[i]) ?? cs2[from + 1];
			if (next != null) cur = next;
			draw();
			if (filled()) {
				if (wrongCount() === 0) finish();
				else {
					root.querySelector('.fl-xc-grid').classList.remove('shake');
					void root.offsetWidth;
					root.querySelector('.fl-xc-grid').classList.add('shake');
					buzz(30);
				}
			}
		};
		const onBack = () => {
			if (done) return;
			if (letters[cur]) letters[cur] = '';
			else {
				step(-1);
				letters[cur] = '';
			}
			draw();
		};
		keyboard(root.querySelector('[data-r=kb]'), { onKey, onBack });
		const stop = physicalKeys(root, {
			onKey,
			onBack,
			onArrow(k) {
				const w = L.words[wi];
				const d = k === 'ArrowRight' || k === 'ArrowDown' ? 1 : -1;
				if ((k === 'ArrowLeft' || k === 'ArrowRight') && w.dir === 'a') step(d);
				else if ((k === 'ArrowUp' || k === 'ArrowDown') && w.dir === 'd') step(d);
				else {
					const other = w.dir === 'a' ? 'd' : 'a';
					if (wordsAt[cur][other] != null) wi = wordsAt[cur][other];
				}
				draw();
			},
		});
		root.querySelector('.fl-xc-grid').addEventListener('click', (e) => {
			const c = e.target.closest('.fl-xc:not(.void)');
			if (!c || done) return;
			const i = Number(c.dataset.i);
			const w = wordsAt[i];
			if (i === cur && w.a != null && w.d != null) select(i, L.words[wi].dir === 'a' ? 'd' : 'a');
			else select(i);
			buzz(4);
		});
		root.querySelector('.fl-xc-clue').addEventListener('click', (e) => {
			if (done) return;
			if (e.target.closest('.fl-xc-done')) return finish();
			const d = e.target.closest('.fl-xc-nav')?.dataset.d;
			if (!d) return;
			wi = (wi + Number(d) + L.words.length) % L.words.length;
			const cs2 = cellsOf(wi);
			cur = cs2.find((i) => !letters[i]) ?? cs2[0];
			draw();
		});
		// ilk seçim: ilk kelimenin ilk hücresi
		wi = 0;
		cur = cellsOf(0)[0];
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
					e.classList.remove('wd', 'cur');
					e.classList.add(letters[i] === L.cells[i].ch ? 'ok' : 'bad');
				});
				setTimeout(() => {
					cellEls.forEach((e, i) => {
						letters[i] = L.cells[i].ch;
						e.lastChild.textContent = letters[i];
						e.classList.remove('bad');
						e.classList.add('ok');
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
