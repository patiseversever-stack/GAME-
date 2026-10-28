// RESİMLİ SORU: blur (bulanıktan netleşir), zoom (çok yakından uzaklaşır), silhouette (siyah gölge),
// rebus (birkaç resim yan yana, birleşimi bul).
//
// Veri: img: 'varlık_kimliği' | ['kimlik1','kimlik2',…] (rebus), mode, ve cevap için
//       a: [doğru, y1, y2, y3]  (şıklı)  YA DA  w: 'KELİME' (klavyeyle yazılır).
// Kimlikler assets.js manifestinden gelir; gerçek görsel yoksa prosedürel çizim kullanılır.
//
// Değer: şıklıda { i, f }, yazılıda { ok, tries, f }; f = cevap anındaki süre oranı (0..1).
// Erken doğru cevap daha çok puan: judge → { correct, err (= f), score (100..40) }.
// Tür 'exact': doğru olanlar arasında hızlı olan öne geçer (eşitlik bozma `time` ile).

import { css, esc, shuffle, pCorrect, thinkTime, mountChoice, typedWord, clamp, trUp, chips, buzz } from './util.js';
import { ASSETS, drawAsset, drawSilhouette, assetFocus, whenReady } from './assets.js';

const CSS = /* css */ `
.fl-img{display:flex;flex-direction:column;gap:10px}
.fl-img-stage{position:relative;border-radius:18px;overflow:hidden;border:3px solid rgba(255,255,255,.85);box-shadow:0 6px 0 rgba(0,0,0,.35);background:#0d1630;line-height:0}
.fl-img-stage canvas{display:block;width:100%;height:auto}
.fl-img-rebus{display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;border-radius:18px;background:rgba(0,0,0,.25);border:2px solid rgba(255,255,255,.14)}
.fl-img-rebus .c{border-radius:14px;overflow:hidden;border:3px solid #fff;box-shadow:0 4px 0 rgba(0,0,0,.35);line-height:0;flex:none}
.fl-img-rebus .c canvas{display:block}
.fl-img-rebus .p{flex:none;font-family:'Lilita One';font-size:26px;color:var(--gold);text-shadow:0 2px 0 rgba(0,0,0,.4)}
.fl-img-bonus{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.9}
.fl-img-bonus i{flex:1;height:8px;border-radius:6px;background:rgba(255,255,255,.14);overflow:hidden;position:relative}
.fl-img-bonus i::after{content:'';position:absolute;inset:0;border-radius:6px;background:linear-gradient(90deg,#ffd25a,#ff8a3a);transform-origin:0 50%;transform:scaleX(var(--k,1))}
.fl-img-bonus b{font-family:'Lilita One';font-weight:400;font-size:15px;color:var(--gold);min-width:2.2em;text-align:right}
.fl-img-cap{position:absolute;left:0;right:0;bottom:0;padding:8px 10px;text-align:center;font-family:'Lilita One';font-size:20px;line-height:1.1;color:#fff;
  background:linear-gradient(180deg,transparent,rgba(10,16,34,.85));text-shadow:0 2px 0 rgba(0,0,0,.45);animation:flq-pop .35s cubic-bezier(.3,1.5,.5,1)}
.fl-img-cap.rb{position:static;background:none;padding:4px;font-size:22px;color:#7dff9a}
.fl-img-tag{position:absolute;left:8px;top:8px;padding:2px 9px;border-radius:999px;background:rgba(10,16,34,.75);font-size:11px;letter-spacing:.12em;text-transform:uppercase;line-height:1.5;border:1.5px solid rgba(255,255,255,.4)}
`;

const MODE_LABEL = { blur: 'Netleşen foto', zoom: 'Uzaklaşan foto', silhouette: 'Siluet', rebus: 'Resimli bulmaca' };
const MODE_TAG = { blur: 'bulanık', zoom: 'yakın çekim', silhouette: 'gölge' };
const LEVELS = [8, 11, 15, 21, 30, 44, 64, 96, 148, 230, 360, 480];
const ease = (x) => 1 - Math.pow(1 - x, 2.2);

export const img = {
	time: 20,
	label: 'Resimli',
	kind: 'exact',
	prepare(q, R) {
		const ids = Array.isArray(q.img) ? q.img : [q.img];
		const mode = q.mode || 'blur';
		const v = { q, ids, mode, label: MODE_LABEL[mode] || 'Resimli soru' };
		if (q.a) {
			const order = shuffle([0, 1, 2, 3], R);
			v.opts = order.map((i) => q.a[i]);
			v.right = order.indexOf(0);
		} else v.word = trUp(q.w);
		return v;
	},
	mount(el, v, api) {
		css('img', CSS);
		const T = img.time;
		const span = T * 0.85 * 1000; // bonus bu sürede erir
		const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
		const cssW = Math.min(el.clientWidth || 340, 380);
		const typed = !!v.word;
		const stageW = cssW;
		const stageH = Math.round(stageW * (typed ? 0.5 : 0.62));
		const multi = v.mode === 'rebus';
		const bonus = v.mode === 'blur' || v.mode === 'zoom';
		el.innerHTML = `<div class="fl-img">
			${multi ? '<div class="fl-img-rebus"></div>' : '<div class="fl-img-stage"><canvas></canvas><span class="fl-img-tag">' + esc(MODE_TAG[v.mode] || '') + '</span></div>'}
			${bonus ? '<div class="fl-img-bonus"><span>hız bonusu</span><i></i><b>100</b></div>' : ''}
			<div data-r="ans"></div>
		</div>`;
		const root = el.querySelector('.fl-img');
		const ansEl = el.querySelector('[data-r=ans]');
		const bonusEl = el.querySelector('.fl-img-bonus');
		const t0 = performance.now();
		let done = false;
		let alive = true;
		const fNow = () => clamp((performance.now() - t0) / span, 0, 1);

		// ------- tuvaller
		let canvas = null;
		let g = null;
		const cw = Math.round(stageW * dpr);
		const ch = Math.round(stageH * dpr);
		const asp = ch / cw;
		const mk = (w, h) => {
			const c = document.createElement('canvas');
			c.width = w;
			c.height = h;
			return c;
		};
		let rebusCanvases = [];
		if (multi) {
			const n = v.ids.length;
			const rw = el.querySelector('.fl-img-rebus');
			const cell = Math.floor((stageW - 16 - (n - 1) * 26) / n);
			const px = Math.round(cell * dpr);
			v.ids.forEach((id, i) => {
				if (i) rw.insertAdjacentHTML('beforeend', '<span class="p">+</span>');
				const d = document.createElement('div');
				d.className = 'c';
				const c = mk(px, px);
				c.style.width = cell + 'px';
				c.style.height = cell + 'px';
				d.appendChild(c);
				rw.appendChild(d);
				rebusCanvases.push({ c, id });
			});
		} else {
			canvas = el.querySelector('canvas');
			canvas.width = cw;
			canvas.height = ch;
			g = canvas.getContext('2d');
			g.imageSmoothingEnabled = true;
		}
		const id0 = v.ids[0];

		// ------- kipler
		const sil = mk(cw, ch);
		let levels = null;
		const buildLevels = () => {
			const src = mk(480, Math.round(480 * asp));
			drawAsset(src.getContext('2d'), id0, src.width, src.height, {});
			levels = LEVELS.map((w) => {
				const c = mk(w, Math.max(2, Math.round(w * asp)));
				const x = c.getContext('2d');
				x.imageSmoothingQuality = 'high';
				x.drawImage(src, 0, 0, c.width, c.height);
				return c;
			});
			// kademeli küçültme: büyük adımlarda tırtıklanmayı önler
			for (let i = levels.length - 2; i >= 0; i--) {
				const x = levels[i].getContext('2d');
				x.imageSmoothingQuality = 'high';
				x.clearRect(0, 0, levels[i].width, levels[i].height);
				x.drawImage(levels[i + 1], 0, 0, levels[i].width, levels[i].height);
			}
		};
		let lastKey = -1;
		let curS = 16;
		const focus = assetFocus(id0);
		const draw = (f, final = false) => {
			if (multi) {
				for (const r of rebusCanvases) drawAsset(r.c.getContext('2d'), r.id, r.c.width, r.c.height, {});
				return;
			}
			if (v.mode === 'blur') {
				if (final) {
					drawAsset(g, id0, cw, ch, {});
					return;
				}
				if (!levels) buildLevels();
				const p = clamp(f / 0.85, 0, 1);
				const i = Math.min(LEVELS.length - 1, Math.floor(Math.pow(p, 0.75) * (LEVELS.length - 1) + 0.0001));
				if (i === lastKey) return;
				lastKey = i;
				g.drawImage(levels[i], 0, 0, cw, ch);
			} else if (v.mode === 'zoom') {
				const s = final ? 1 : Math.exp(Math.log(16) * (1 - ease(clamp(f / 0.85, 0, 1))));
				const key = Math.round(s * 40);
				if (key === lastKey && !final) return;
				lastKey = key;
				curS = s;
				drawAsset(g, id0, cw, ch, { view: { fx: focus[0], fy: focus[1], s } });
			} else if (v.mode === 'silhouette') {
				if (final) drawAsset(g, id0, cw, ch, {});
				else if (lastKey < 0) {
					lastKey = 1;
					drawSilhouette(g, id0, cw, ch, sil);
				}
			}
		};
		const ready = whenReady(v.ids, () => {
			lastKey = -1;
			levels = null;
			draw(fNow());
		});
		void ready;
		draw(0);
		// ------- döngü
		const tick = () => {
			if (!alive || !el.isConnected) return;
			if (!done) {
				const f = fNow();
				draw(f);
				if (bonusEl) {
					const k = 1 - clamp(f / 1, 0, 1);
					bonusEl.querySelector('i').style.setProperty('--k', k.toFixed(3));
					bonusEl.querySelector('b').textContent = String(Math.round(40 + 60 * k));
				}
				requestAnimationFrame(tick);
			}
		};
		requestAnimationFrame(tick);

		// ------- cevap alanı
		let ctl;
		let tw = null;
		let tries = 0;
		if (typed) {
			tw = typedWord(ansEl, v.word, {
				onFull(guess) {
					if (guess === v.word.replace(/ /g, '')) {
						done = true;
						tw.lock();
						api.answer({ ok: true, tries, f: fNow() });
					} else {
						tries++;
						tw.shake();
						setTimeout(() => !done && tw.clear(), 380);
					}
				},
			});
		} else {
			ctl = mountChoice(ansEl, v, api, { wrap: (i) => ({ i, f: fNow() }) });
		}
		return {
			lock() {
				done = true;
				ctl?.lock();
				tw?.lock();
			},
			value: () => null,
			reveal(results) {
				done = true;
				alive = false;
				const answerText = typed ? v.word : v.opts[v.right];
				if (ctl) ctl.reveal(results, (x) => x?.i);
				if (tw) tw.fill(v.word);
				// resmi netle / renklendir
				if (multi) {
					draw(1);
					root.insertAdjacentHTML('beforeend', `<div class="fl-img-cap rb">${esc(answerText)}</div>`);
				} else {
					const stage = el.querySelector('.fl-img-stage');
					stage.querySelector('.fl-img-tag')?.remove();
					if (v.mode === 'zoom') {
						// kalan yakınlaştırmayı hızlıca aç
						const a = performance.now();
						const s0 = curS;
						const step = (t) => {
							const k = clamp((t - a) / 500, 0, 1);
							drawAsset(g, id0, cw, ch, { view: { fx: focus[0], fy: focus[1], s: Math.exp(Math.log(s0) * (1 - ease(k))) } });
							if (k < 1 && el.isConnected) requestAnimationFrame(step);
						};
						requestAnimationFrame(step);
					} else draw(1, true);
					stage.insertAdjacentHTML('beforeend', `<div class="fl-img-cap">${esc(answerText)}</div>`);
				}
				const mine = results;
				root.insertAdjacentHTML('beforeend', chips(mine, (r) => (r.correct ? '✓ ' + Math.round(r.score ?? 0) : '✗')));
			},
			destroy() {
				alive = false;
			},
		};
	},
	judge(v, value) {
		if (!value) return { correct: false, err: 99, score: 0 };
		const ok = v.word ? !!value.ok : value.i === v.right;
		const f = clamp(value.f ?? 1, 0, 1);
		return { correct: ok, err: ok ? f : 99, score: ok ? Math.round(100 - 60 * f) : 0 };
	},
	bot(v, skill, R) {
		const time = thinkTime(R, 3, v.mode === 'rebus' ? 9 : 10);
		const f = clamp(time / (img.time * 0.85), 0, 1);
		let p = pCorrect(skill, v.q.diff);
		if (v.mode === 'blur' || v.mode === 'zoom') p *= Math.min(1, 0.55 + f * 1.1);
		if (v.word) p *= 0.85; // yazmak daha zor
		const ok = R() < clamp(p, 0.05, 0.96);
		let value;
		if (v.word) value = { ok, tries: ok ? 0 : 2, f };
		else {
			let i = v.right;
			if (!ok) do i = Math.floor(R() * 4); while (i === v.right);
			value = { i, f };
		}
		return { value, time: v.word ? time + 3 : time };
	},
};

export { ASSETS };
