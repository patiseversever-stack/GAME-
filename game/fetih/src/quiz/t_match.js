// EŞLEŞTİR: sol sütundan bir öğeye, sonra sağ sütundan eşine dokun (ya da birinden ötekine çizgi çek);
// iki uç renkli bir bağla birleşir. İki çift bağlanınca kalan son çift kendiliğinden bağlanır; ONAYLA ile gönderilir.
// Veri: pairs: [[sol, sağ], ×3]
// Değer (value): value[solIndeks] = ekrandaki sağ sıra numarası (-1: bağlanmamış)
// Sıralama türü 'closest': err = yanlış ya da boş eşleşme sayısı (3 çiftte 0, 2 ya da 3); eşitlikte süre belirler.

import { css, esc, shuffle, pCorrect, buzz } from './util.js';
import { botTime } from './timing.js';
import { setTimeout } from '../core/clock.js';

// çift renkleri: lacivert panelde ve beyaz kartta ayrı ayrı seçilir
const COLORS = ['#ffb21a', '#18b4f0', '#f0509a', '#5ad16a'];

const CSS = /* css */ `
.fl-mat{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 58px minmax(0,1fr);align-items:stretch;user-select:none;-webkit-user-select:none}
.fl-mat-col{display:flex;flex-direction:column;gap:12px;grid-row:1}
.fl-mat-col.l{grid-column:1}.fl-mat-col.r{grid-column:3}
.fl-mat-it{position:relative;min-height:clamp(58px,calc(7.4 * var(--vh)),72px);padding:6px 10px 7px;border-radius:17px;display:flex;align-items:center;justify-content:center;text-align:center;
  font-size:clamp(15px,calc(4.2 * var(--vw)),18px);font-weight:600;line-height:1.14;text-wrap:balance;overflow-wrap:anywhere;color:var(--tdark);
  background:linear-gradient(180deg,#fff,#eef1f8);border:3px solid #fff;box-shadow:0 5px 0 #aab6cf,0 8px 12px rgba(0,0,0,.22);touch-action:none;
  transition:transform .14s,border-color .2s,background .2s,box-shadow .2s,color .2s}
.fl-mat-it:active{transform:translateY(3px)}
.fl-mat-it i{position:absolute;top:50%;width:18px;height:18px;margin-top:-9px;border-radius:50%;background:#dfe5f2;border:3px solid #fff;box-shadow:0 0 0 2px #aab6cf;transition:background .2s,box-shadow .2s,transform .25s cubic-bezier(.3,1.7,.5,1)}
.fl-mat-col.l .fl-mat-it i{right:-12px}
.fl-mat-col.r .fl-mat-it i{left:-12px}
.fl-mat-it.sel{background:linear-gradient(180deg,#fff7d2,#ffe08a);border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-d),0 5px 0 var(--gold-dd);transform:scale(1.04);animation:flq-matsel 1s ease-in-out infinite}
.fl-mat-it.sel i{background:var(--gold);transform:scale(1.2)}
.fl-mat-it.on{border-color:var(--c);box-shadow:0 0 0 2px var(--c),0 5px 0 #aab6cf,0 8px 12px rgba(0,0,0,.22)}
.fl-mat-it.on i{background:var(--c);box-shadow:0 0 0 2px var(--c);transform:scale(1.15)}
.fl-mat-it.tgt{border-color:var(--gold);transform:scale(1.04)}
.fl-mat-it.ok{color:#fff;background:linear-gradient(180deg,#7fe88a,#2fa84a);border-color:#fff;box-shadow:0 5px 0 var(--green-d),0 8px 14px rgba(40,200,80,.3);text-shadow:0 1px 0 rgba(0,60,20,.45)}
.fl-mat-it.bad{color:#fff;background:linear-gradient(180deg,#ff8a78,#d53b2c);border-color:#fff;box-shadow:0 5px 0 #7a120a;text-shadow:0 1px 0 rgba(80,0,0,.45)}
.fl-mat-it.ok i,.fl-mat-it.bad i{background:#fff;box-shadow:none}
.fl-mat svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.fl-mat path{fill:none;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset .32s ease-out,opacity .3s}
.fl-mat path.sh{stroke:#0a1534;stroke-width:10;opacity:.55}
.fl-mat path.ln{stroke-width:6}
.fl-mat path.in{stroke-dashoffset:0}
.fl-mat path.late{transition-delay:.18s}
.fl-mat path.drag{stroke:#fff;stroke-width:5;stroke-dasharray:none;stroke-dashoffset:0;transition:none;opacity:.9}
.fl-mat path.out{opacity:0}
.fl-mat-hint{margin:10px 0 -2px;font-size:12.5px;line-height:1.2;text-align:center;color:#cfe0ff;opacity:.9;transition:opacity .3s}
.fl-mat-hint.off{opacity:0}
.fl-mat-send{margin-top:8px;width:100%}
.fl-mat.sent~.fl-mat-send,.fl-mat.sent~.fl-mat-hint{display:none}
@keyframes flq-matsel{50%{box-shadow:0 0 0 5px rgba(255,210,90,.6),0 5px 0 var(--gold-dd)}}
`;

export const match = {
	time: 19,
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
			<div class="fl-mat-col l">${v.left.map((t, i) => `<button class="fl-mat-it" data-s="l" data-i="${i}">${esc(t)}<i></i></button>`).join('')}</div>
			<div class="fl-mat-col r">${v.right.map((t, i) => `<button class="fl-mat-it" data-s="r" data-i="${i}">${esc(t)}<i></i></button>`).join('')}</div>
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
			for (const cls of ['sh', 'ln']) {
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
				for (const g of paths.values()) g.querySelectorAll('path').forEach((p) => p.classList.add('out'));
				L.forEach((b, l) => {
					b.classList.remove('on');
					b.classList.add(m[l] >= 0 && v.ord[m[l]] === l ? 'ok' : 'bad');
				});
				Rt.forEach((b, j) => {
					const l = m.indexOf(j);
					b.classList.remove('on');
					b.classList.add(l >= 0 && v.ord[j] === l ? 'ok' : 'bad');
				});
				// doğru bağlar sırayla belirir
				setTimeout(() => {
					svg.innerHTML = '';
					paths.clear();
					L.forEach((b, l) => setTimeout(() => makePath(l, v.ord.indexOf(l), '#7dff9a'), l * 150));
					for (const b of [...L, ...Rt]) {
						b.classList.remove('bad');
						b.classList.add('ok');
					}
				}, 750);
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
