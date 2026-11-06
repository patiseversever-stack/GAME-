// EŞLEŞTİR: sol sütundan bir öğeye, sonra sağ sütundan eşine dokun (ya da birinden ötekine çizgi çek);
// iki uç renkli bir bağla birleşir. İki çift bağlanınca kalan son çift kendiliğinden bağlanır; ONAYLA ile gönderilir.
// Veri: pairs: [[sol, sağ], ×3]
// Değer (value): value[solIndeks] = ekrandaki sağ sıra numarası (-1: bağlanmamış)
// Sıralama türü 'closest': err = yanlış ya da boş eşleşme sayısı (3 çiftte 0, 2 ya da 3); eşitlikte süre belirler.

import { css, esc, shuffle, pCorrect, buzz } from './util.js';
import { botTime } from './timing.js';
import { setTimeout } from '../core/clock.js';

// çift renkleri: krem kart ve lacivert panelde okunan, doygunluğu kısık tonlar (neon yok)
const COLORS = ['#3d8fd6', '#d9577a', '#e0a21c', '#8a6fd1'];
const OK = '#2fa84a';
const BAD = '#d53b2c';

// v1.5c: eski düzen (iki sütun kart, iç kenarda yuva, aralarında bağ) krem/premium arena dilinde: krem kart, ince altın
// kenar, alçak gölge; bağ gölgeli tek renk çizgi, çizilirken bir kez kayan ince ışıltı. Kartlar kademeli girer, bağlanınca
// kısa bir parıltı. Hareket transform/opacity ya da küçük SVG çizgisi.
const CSS = /* css */ `
.fl-mat{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 46px minmax(0,1fr);align-items:stretch;user-select:none;-webkit-user-select:none}
.fl-mat-col{display:flex;flex-direction:column;gap:7px;grid-row:1}
.fl-mat-col.l{grid-column:1}.fl-mat-col.r{grid-column:3}
.fl-mat-it{--c:#e8a917;position:relative;isolation:isolate;overflow:visible;min-height:clamp(46px,calc(5.7 * var(--vh)),54px);padding:5px 12px;margin:0;border:0;border-radius:10px;
  display:flex;align-items:center;justify-content:center;text-align:center;font:600 clamp(14px,calc(3.8 * var(--vw)),16px)/1.12 'Fredoka',sans-serif;
  text-wrap:balance;overflow-wrap:anywhere;color:#1c2442;background:linear-gradient(180deg,#fffaf0,#efe5cf);
  box-shadow:inset 0 0 0 1px rgba(176,140,70,.45),inset 0 1px 0 #fff,0 3px 0 #9c8a66,0 6px 12px rgba(0,0,0,.28);touch-action:none;
  transition:transform .2s cubic-bezier(.3,1.5,.5,1),background .25s,box-shadow .25s,color .25s;animation:flq-matinL .5s cubic-bezier(.2,.9,.3,1) backwards;animation-delay:calc(var(--k) * 70ms + 60ms)}
.fl-mat-col.r .fl-mat-it{animation-name:flq-matinR}
.fl-mat-it::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;
  background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.75) 50%,transparent 65%) no-repeat;background-size:250% 100%;background-position:120% 0}
.fl-mat-it:active{transform:translateY(2px)}
.fl-mat-it i{position:absolute;top:50%;z-index:1;width:14px;height:14px;margin-top:-7px;border-radius:50%;background:#efe5cf;box-shadow:0 0 0 2px #fffaf0,0 0 0 3.5px rgba(156,138,102,.9);
  transition:background .2s,box-shadow .2s,transform .25s cubic-bezier(.3,1.7,.5,1)}
.fl-mat-col.l .fl-mat-it i{right:-9px}
.fl-mat-col.r .fl-mat-it i{left:-9px}
.fl-mat-it.sel,.fl-mat-it.tgt{background:linear-gradient(180deg,#fff8dc,#fbe6a6);box-shadow:inset 0 0 0 2px #e8a917,0 3px 0 #a8770c,0 0 16px rgba(255,210,90,.45);transform:translateY(-2px)}
.fl-mat-it.sel i,.fl-mat-it.tgt i{background:#e8a917;transform:scale(1.15)}
.fl-mat-it.sel::after{opacity:1;animation:flq-matglint 1.6s ease-in-out infinite}
.fl-mat-it.on{box-shadow:inset 0 0 0 2px var(--c),inset 0 1px 0 #fff,0 3px 0 #9c8a66,0 6px 12px rgba(0,0,0,.28)}
.fl-mat-it.on i{background:var(--c);transform:scale(1.1)}
.fl-mat-it.zap::after{opacity:1;animation:flq-matglint .6s ease-out 1 forwards}
.fl-mat-it.ok,.fl-mat-it.fix{color:#123a1e;background:linear-gradient(180deg,#f1fbef,#cdeecf);box-shadow:inset 0 0 0 1px rgba(47,168,74,.6),0 3px 0 #5f9a68,0 6px 12px rgba(0,0,0,.25)}
.fl-mat-it.bad{color:#4a1410;background:linear-gradient(180deg,#fdf0ee,#f5cfc9);box-shadow:inset 0 0 0 1px rgba(213,59,44,.6),0 3px 0 #a3655d,0 6px 12px rgba(0,0,0,.25)}
.fl-mat-col.l .fl-mat-it.ok,.fl-mat-col.l .fl-mat-it.fix{box-shadow:inset 0 0 0 1px rgba(47,168,74,.6),inset 4px 0 0 #2fa84a,0 3px 0 #5f9a68,0 6px 12px rgba(0,0,0,.25)}
.fl-mat-col.r .fl-mat-it.ok,.fl-mat-col.r .fl-mat-it.fix{box-shadow:inset 0 0 0 1px rgba(47,168,74,.6),inset -4px 0 0 #2fa84a,0 3px 0 #5f9a68,0 6px 12px rgba(0,0,0,.25)}
.fl-mat-col.l .fl-mat-it.bad,.fl-mat-col.l .fl-mat-it.fix{box-shadow:inset 0 0 0 1px rgba(213,59,44,.6),inset 4px 0 0 #d53b2c,0 3px 0 #a3655d,0 6px 12px rgba(0,0,0,.25)}
.fl-mat-col.r .fl-mat-it.bad,.fl-mat-col.r .fl-mat-it.fix{box-shadow:inset 0 0 0 1px rgba(213,59,44,.6),inset -4px 0 0 #d53b2c,0 3px 0 #a3655d,0 6px 12px rgba(0,0,0,.25)}
.fl-mat-col.l .fl-mat-it.fix{box-shadow:inset 0 0 0 1px rgba(47,168,74,.6),inset 4px 0 0 #d53b2c,0 3px 0 #5f9a68,0 6px 12px rgba(0,0,0,.25)}
.fl-mat-col.r .fl-mat-it.fix{box-shadow:inset 0 0 0 1px rgba(47,168,74,.6),inset -4px 0 0 #d53b2c,0 3px 0 #5f9a68,0 6px 12px rgba(0,0,0,.25)}
.fl-mat-it.ok i,.fl-mat-it.fix i{background:#2fa84a}
.fl-mat-it.bad i{background:#d53b2c}
.fl-mat svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.fl-mat path{fill:none;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset .4s cubic-bezier(.5,0,.2,1),opacity .3s,stroke .3s}
.fl-mat path.sh{stroke:#05091a;stroke-width:8;opacity:.5}
.fl-mat path.ln{stroke-width:4.5}
.fl-mat path.in{stroke-dashoffset:0}
.fl-mat path.late{transition-delay:.18s}
.fl-mat path.sp{stroke:#fff;stroke-width:2;stroke-dasharray:.08 1.2;stroke-dashoffset:.08;opacity:0;transition:none}
.fl-mat path.sp.in{animation:flq-matspark .7s .15s cubic-bezier(.4,0,.6,1) 1 both}
.fl-mat path.sp.late.in{animation-delay:.33s}
.fl-mat path.drag{stroke:#ffd25a;stroke-width:3.5;stroke-dasharray:none;stroke-dashoffset:0;transition:none;opacity:.9}
.fl-mat path.out{opacity:0}
.fl-mat-hint{margin:8px 0 -2px;font-size:11px;line-height:1.2;text-align:center;color:#cfe0ff;opacity:.65;transition:opacity .3s}
.fl-mat-hint.off{opacity:0}
.fl-mat-send{margin-top:8px;width:100%}
.fl-mat.sent~.fl-mat-send,.fl-mat.sent~.fl-mat-hint{display:none}
@keyframes flq-matinL{0%{opacity:0;transform:translateX(-24px)}}
@keyframes flq-matinR{0%{opacity:0;transform:translateX(24px)}}
@keyframes flq-matglint{0%{background-position:120% 0}100%{background-position:-20% 0}}
@keyframes flq-matspark{0%{stroke-dashoffset:.08;opacity:.85}85%{opacity:.85}100%{stroke-dashoffset:-1;opacity:0}}
@media (prefers-reduced-motion:reduce){.fl-mat-it{animation:none}.fl-mat path.sp{display:none}}
`;

export const match = {
	cover: 'kisa', // kısa ekranda (yükseklik < 720 px) tam ekran kart: harita şeridi yerine bulmacaya yer (ui.js)
	time: 22,
	label: 'Eşleştir',
	kind: 'closest',
	keep: true, // arayüz sıralama tablosunu tahtanın altına ekler (tahtayı silmez)
	fmt: (v, value, r) => `${v.n - r.err}/${v.n} doğru`,
	sub: (v, value, r) => (r.err === 0 ? 'tam isabet' : `${r.err} yanlış`),
	prepare(q, R) {
		const n = q.pairs.length;
		const idx = q.pairs.map((_, i) => i);
		let ord = shuffle(idx, R);
		// sağ sütun hiçbir zaman sol ile hizalı başlamaz (gerekirse bir kaydır: belirlenimci)
		if (n > 1 && ord.every((x, i) => x === i)) ord = ord.slice(1).concat(ord[0]);
		// ord[j]: j. sağ konumda gösterilen çiftin indeksi
		return { q, n, ord, left: q.pairs.map((p) => p[0]), right: ord.map((i) => q.pairs[i][1]) };
	},
	mount(el, v, api) {
		css('match', CSS);
		const n = v.n;
		el.innerHTML = `<div class="fl-mat">
			<svg></svg>
			<div class="fl-mat-col l">${v.left.map((t, i) => `<button class="fl-mat-it" data-s="l" data-i="${i}" style="--k:${i}">${esc(t)}<i></i></button>`).join('')}</div>
			<div class="fl-mat-col r">${v.right.map((t, i) => `<button class="fl-mat-it" data-s="r" data-i="${i}" style="--k:${i + 0.5}">${esc(t)}<i></i></button>`).join('')}</div>
		</div>
		<div class="fl-mat-hint">Bir öğeye, sonra eşine dokun</div>
		<button class="fl-send fl-mat-send" disabled>ONAYLA</button>`;
		const root = el.querySelector('.fl-mat');
		const svg = root.querySelector('svg');
		const L = [...root.querySelectorAll('.l .fl-mat-it')];
		const Rt = [...root.querySelectorAll('.r .fl-mat-it')];
		const send = el.querySelector('.fl-mat-send');
		const hint = el.querySelector('.fl-mat-hint');
		const m = Array(n).fill(-1); // sol → sağ
		let sel = null;
		let done = false;
		const paths = new Map();

		// bağ uçları: kartların iç kenarındaki yuvaların ortası (çizgi kartların altından yuvaya girer)
		const anchor = (b, side) => ({ x: side === 'l' ? b.offsetLeft + b.offsetWidth : b.offsetLeft, y: b.offsetTop + b.offsetHeight / 2 });
		const curve = (a, b) => {
			const dx = (b.x - a.x) * 0.55;
			return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
		};
		const makePath = (l, r, color, late = false) => {
			const d = curve(anchor(L[l], 'l'), anchor(Rt[r], 'r'));
			const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			for (const cls of ['sh', 'ln', 'sp']) {
				const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				p.setAttribute('d', d);
				p.setAttribute('pathLength', '1');
				p.classList.add(cls);
				if (late) p.classList.add('late');
				if (cls === 'ln') p.style.stroke = color;
				g.appendChild(p);
			}
			svg.appendChild(g);
			requestAnimationFrame(() => requestAnimationFrame(() => g.querySelectorAll('path').forEach((p) => p.classList.add('in'))));
			return g;
		};
		// bağlanan iki kartta kısa bir parıltı
		const zap = (...bs) => {
			for (const b of bs) {
				b.classList.remove('zap');
				void b.offsetWidth;
				b.classList.add('zap');
				setTimeout(() => b.classList.remove('zap'), 700);
			}
		};
		const clearSel = () => {
			sel = null;
			for (const b of [...L, ...Rt]) b.classList.remove('sel');
		};
		const paint = () => {
			L.forEach((b, i) => {
				b.classList.toggle('on', m[i] >= 0);
				b.style.setProperty('--c', COLORS[i % COLORS.length]);
			});
			Rt.forEach((b, j) => {
				const l = m.indexOf(j);
				b.classList.toggle('on', l >= 0);
				if (l >= 0) b.style.setProperty('--c', COLORS[l % COLORS.length]);
			});
			send.disabled = m.some((x) => x < 0);
		};
		const drop = (l) => {
			if (m[l] < 0) return;
			const g = paths.get(l);
			if (g) {
				g.querySelectorAll('path').forEach((p) => p.classList.add('out'));
				setTimeout(() => g.remove(), 300);
				paths.delete(l);
			}
			m[l] = -1;
		};
		const link = (l, r, late = false) => {
			drop(l);
			const prev = m.indexOf(r);
			if (prev >= 0) drop(prev);
			m[l] = r;
			paths.set(l, makePath(l, r, COLORS[l % COLORS.length], late));
			setTimeout(() => zap(L[l], Rt[r]), late ? 380 : 200);
		};
		const connect = (l, r) => {
			link(l, r);
			buzz(10);
			hint.classList.add('off');
			// tek çift kaldıysa o da bağlanır (seçenek kalmadı): oyuncu yalnızca ONAYLA'ya basar
			const freeL = m.map((x, i) => (x < 0 ? i : -1)).filter((i) => i >= 0);
			const freeR = Rt.map((_, j) => j).filter((j) => m.indexOf(j) < 0);
			if (freeL.length === 1 && freeR.length === 1) link(freeL[0], freeR[0], true);
		};
		const tap = (side, i) => {
			if (done) return;
			if (sel && sel.side !== side) {
				const l = side === 'l' ? i : sel.i;
				const r = side === 'l' ? sel.i : i;
				clearSel();
				connect(l, r);
			} else {
				// aynı sütun: bağlıysa çözüp yeniden seç
				if (side === 'l') drop(i);
				else {
					const l = m.indexOf(i);
					if (l >= 0) drop(l);
				}
				clearSel();
				sel = { side, i };
				(side === 'l' ? L : Rt)[i].classList.add('sel');
			}
			paint();
		};
		root.addEventListener('click', (e) => {
			if (Date.now() < noClick) return;
			const b = e.target.closest('.fl-mat-it');
			if (b) tap(b.dataset.s, Number(b.dataset.i));
		});
		// sürükle-bırak: bir öğeden karşı sütundaki öğeye çizgi çek (dokunup dokunma yolu da çalışır)
		let dg = null;
		let rub = null;
		let noClick = 0;
		const sideOf = (x, y) => document.elementFromPoint(x, y)?.closest?.('.fl-mat-it');
		root.addEventListener('pointerdown', (e) => {
			const b = done ? null : e.target.closest('.fl-mat-it');
			if (b) dg = { b, side: b.dataset.s, i: Number(b.dataset.i), x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, tgt: null };
		});
		root.addEventListener('pointermove', (e) => {
			if (!dg || e.pointerId !== dg.id) return;
			if (!dg.moved) {
				if (Math.hypot(e.clientX - dg.x, e.clientY - dg.y) < 10) return;
				dg.moved = true;
				try {
					root.setPointerCapture(e.pointerId);
				} catch {
					/* yoksay */
				}
				clearSel();
				dg.b.classList.add('sel');
				rub = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				rub.classList.add('drag');
				svg.appendChild(rub);
			}
			const rc = root.getBoundingClientRect();
			const a = anchor(dg.b, dg.side);
			rub.setAttribute('d', curve(a, { x: e.clientX - rc.left, y: e.clientY - rc.top }));
			const t = sideOf(e.clientX, e.clientY);
			const ok = t && t.dataset.s !== dg.side ? t : null;
			if (ok !== dg.tgt) {
				dg.tgt?.classList.remove('tgt');
				ok?.classList.add('tgt');
				dg.tgt = ok;
			}
		});
		const dragEnd = (e) => {
			if (!dg || e.pointerId !== dg.id) return;
			const d = dg;
			dg = null;
			if (!d.moved) return;
			noClick = Date.now() + 80;
			rub?.remove();
			rub = null;
			d.tgt?.classList.remove('tgt');
			d.b.classList.remove('sel');
			const t = e.type === 'pointerup' ? sideOf(e.clientX, e.clientY) : null;
			if (t && t.dataset.s !== d.side && !done) {
				const l = d.side === 'l' ? d.i : Number(t.dataset.i);
				const r = d.side === 'l' ? Number(t.dataset.i) : d.i;
				clearSel();
				connect(l, r);
				paint();
			}
		};
		root.addEventListener('pointerup', dragEnd);
		root.addEventListener('pointercancel', dragEnd);
		send.addEventListener('click', () => {
			if (done || send.disabled) return;
			done = true;
			clearSel();
			root.classList.add('sent');
			api.answer(m.slice());
		});
		paint();
		return {
			lock() {
				done = true;
			},
			value: () => m.slice(),
			reveal() {
				done = true;
				root.classList.add('sent');
				clearSel();
				const good = (l) => m[l] >= 0 && v.ord[m[l]] === l;
				// 1) senin bağların yeşil/kırmızı yanar
				for (const [l, g] of paths) g.querySelectorAll('.ln').forEach((p) => (p.style.stroke = good(l) ? OK : BAD));
				L.forEach((b, l) => {
					b.classList.remove('on', 'zap');
					b.classList.add(good(l) ? 'ok' : 'bad');
				});
				Rt.forEach((b, j) => {
					const l = m.indexOf(j);
					b.classList.remove('on', 'zap');
					b.classList.add(l >= 0 && v.ord[j] === l ? 'ok' : 'bad');
				});
				// 2) yanlış bağlar söner, doğruları sırayla çizilir; yanlış kartlar yeşile döner (dış kenarda kırmızı iz kalır)
				setTimeout(() => {
					let k = 0;
					for (let l = 0; l < n; l++) {
						if (good(l)) continue;
						const g = paths.get(l);
						if (g) {
							g.querySelectorAll('path').forEach((p) => p.classList.add('out'));
							setTimeout(() => g.remove(), 320);
							paths.delete(l);
						}
						const r = v.ord.indexOf(l);
						setTimeout(() => {
							makePath(l, r, OK);
							for (const b of [L[l], Rt[r]]) {
								b.classList.remove('bad');
								b.classList.add('fix');
							}
							setTimeout(() => zap(L[l], Rt[r]), 260);
						}, 120 + k++ * 170);
					}
				}, 1000);
			},
			destroy() {},
		};
	},
	judge(v, value) {
		if (!Array.isArray(value)) return { correct: false, err: v.n };
		let err = 0;
		for (let l = 0; l < v.n; l++) if (value[l] == null || value[l] < 0 || v.ord[value[l]] !== l) err++;
		return { correct: err === 0, err };
	},
	bot(v, skill, R) {
		// doğru eşleşmeyi bul; bilmeyen bot iki öğeyi karıştırır (bazen üçünü birden kaydırır)
		const m = v.ord.map((_, l) => v.ord.indexOf(l)); // sol l → sağ konum
		if (R() >= Math.min(0.96, pCorrect(skill, v.q.diff) + 0.08)) {
			const k = Math.min(v.n, 2 + (R() < 0.3 ? 1 : 0) + (R() < 0.12 ? 1 : 0));
			const picks = shuffle([...m.keys()], R).slice(0, k);
			const vals = picks.map((l) => m[l]);
			picks.forEach((l, i) => (m[l] = vals[(i + 1) % picks.length]));
		}
		return { value: m, time: botTime(v, R, skill, 0.1, 0.9) };
	},
};
