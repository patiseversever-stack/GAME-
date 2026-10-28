// EŞLEŞTİR: sol sütundan bir öğeye, sonra sağ sütundan eşine dokun; renkli bir bağlantı çizgisi çizilir.
// Veri: pairs: [[sol, sağ], ×4]
// Değer (value): value[solIndeks] = ekrandaki sağ sıra numarası (-1: bağlanmamış)
// Sıralama türü 'closest': err = yanlış ya da boş eşleşme sayısı (0..4).

import { css, esc, shuffle, pCorrect, thinkTime, buzz, chips } from './util.js';

const COLORS = ['#ffd25a', '#5ad1ff', '#ff7ab8', '#9dff7a'];

const CSS = /* css */ `
.fl-mat{position:relative;display:grid;grid-template-columns:1fr 54px 1fr;align-items:stretch}
.fl-mat-col{display:flex;flex-direction:column;gap:8px;grid-row:1}
.fl-mat-col.l{grid-column:1}.fl-mat-col.r{grid-column:3}
.fl-mat-it{position:relative;min-height:54px;padding:6px 10px;border-radius:14px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:14.5px;line-height:1.15;
  background:linear-gradient(180deg,#3a5ba8,#2a4486);border:2.5px solid rgba(255,255,255,.22);box-shadow:0 4px 0 #142554;touch-action:manipulation;
  transition:transform .12s,border-color .2s,background .2s}
.fl-mat-it:active{transform:translateY(2px)}
.fl-mat-it.sel{border-color:#fff;background:linear-gradient(180deg,#6a7fc8,#4a5fa8);transform:scale(1.04)}
.fl-mat-it.on{border-color:var(--c)}
.fl-mat-it.on::after{content:'';position:absolute;top:50%;width:12px;height:12px;margin-top:-6px;border-radius:50%;background:var(--c);border:2px solid #fff}
.fl-mat-col.l .fl-mat-it.on::after{right:-8px}
.fl-mat-col.r .fl-mat-it.on::after{left:-8px}
.fl-mat-it.ok{background:linear-gradient(180deg,#4fd16a,#2a9a44);border-color:#fff;box-shadow:0 4px 0 #156a2a}
.fl-mat-it.bad{background:linear-gradient(180deg,#ff6a5a,#c8352a);box-shadow:0 4px 0 #7a1a12}
.fl-mat svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.fl-mat path{fill:none;stroke-width:5;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset .3s ease-out,opacity .3s}
.fl-mat path.in{stroke-dashoffset:0}
.fl-mat path.out{opacity:0}
.fl-mat-send{margin-top:10px;width:100%}
.fl-mat.sent .fl-mat-send{display:none}
`;

export const match = {
	time: 25,
	label: 'Eşleştir',
	kind: 'closest',
	prepare(q, R) {
		const n = q.pairs.length;
		const idx = q.pairs.map((_, i) => i);
		let ord = shuffle(idx, R);
		for (let k = 0; k < 12 && ord.every((x, i) => x === i); k++) ord = shuffle(idx, R);
		// ord[j]: j. sağ konumda gösterilen çiftin indeksi
		return { q, n, ord, left: q.pairs.map((p) => p[0]), right: ord.map((i) => q.pairs[i][1]) };
	},
	mount(el, v, api) {
		css('match', CSS);
		const n = v.n;
		el.innerHTML = `<div class="fl-mat">
			<svg></svg>
			<div class="fl-mat-col l">${v.left.map((t, i) => `<button class="fl-mat-it" data-s="l" data-i="${i}">${esc(t)}</button>`).join('')}</div>
			<div class="fl-mat-col r">${v.right.map((t, i) => `<button class="fl-mat-it" data-s="r" data-i="${i}">${esc(t)}</button>`).join('')}</div>
		</div>
		<button class="fl-send fl-mat-send" disabled>ONAYLA</button>`;
		const root = el.querySelector('.fl-mat');
		const svg = root.querySelector('svg');
		const L = [...root.querySelectorAll('.l .fl-mat-it')];
		const Rt = [...root.querySelectorAll('.r .fl-mat-it')];
		const send = el.querySelector('.fl-mat-send');
		const m = Array(n).fill(-1); // sol → sağ
		let sel = null;
		let done = false;
		const paths = new Map();

		const anchor = (b, side) => ({ x: side === 'l' ? b.offsetLeft + b.offsetWidth : b.offsetLeft, y: b.offsetTop + b.offsetHeight / 2 });
		const makePath = (l, r, color, cls = '') => {
			const a = anchor(L[l], 'l');
			const b = anchor(Rt[r], 'r');
			const dx = (b.x - a.x) * 0.55;
			const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			p.setAttribute('d', `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`);
			p.setAttribute('pathLength', '1');
			p.style.stroke = color;
			if (cls) p.classList.add(cls);
			svg.appendChild(p);
			requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('in')));
			return p;
		};
		const clearSel = () => {
			sel = null;
			for (const b of [...L, ...Rt]) b.classList.remove('sel');
		};
		const paint = () => {
			L.forEach((b, i) => {
				b.classList.toggle('on', m[i] >= 0);
				b.style.setProperty('--c', COLORS[i]);
			});
			Rt.forEach((b, j) => {
				const l = m.indexOf(j);
				b.classList.toggle('on', l >= 0);
				if (l >= 0) b.style.setProperty('--c', COLORS[l]);
			});
			send.disabled = m.some((x) => x < 0);
		};
		const drop = (l) => {
			if (m[l] < 0) return;
			const p = paths.get(l);
			if (p) {
				p.classList.add('out');
				setTimeout(() => p.remove(), 300);
				paths.delete(l);
			}
			m[l] = -1;
		};
		const connect = (l, r) => {
			drop(l);
			const prev = m.indexOf(r);
			if (prev >= 0) drop(prev);
			m[l] = r;
			paths.set(l, makePath(l, r, COLORS[l]));
			buzz(10);
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
			const b = e.target.closest('.fl-mat-it');
			if (b) tap(b.dataset.s, Number(b.dataset.i));
		});
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
			reveal(results) {
				done = true;
				root.classList.add('sent');
				clearSel();
				for (const p of paths.values()) p.classList.add('out');
				const okL = [];
				L.forEach((b, l) => {
					const good = m[l] >= 0 && v.ord[m[l]] === l;
					okL.push(good);
					b.classList.remove('on');
					b.classList.add(good ? 'ok' : 'bad');
				});
				Rt.forEach((b, j) => {
					const l = m.indexOf(j);
					b.classList.remove('on');
					b.classList.add(l >= 0 && v.ord[j] === l ? 'ok' : 'bad');
				});
				// doğru çizgiler sırayla belirir
				setTimeout(() => {
					svg.innerHTML = '';
					for (const p of paths.values()) p.remove();
					L.forEach((b, l) => setTimeout(() => makePath(l, v.ord.indexOf(l), '#7dff9a'), l * 140));
					L.concat(Rt).forEach((b) => b.classList.remove('bad'));
					L.concat(Rt).forEach((b) => b.classList.add('ok'));
				}, 700);
				root.insertAdjacentHTML('afterend', chips(results, (r) => (r.err === 0 ? '✓' : r.value ? 4 - r.err + '/4' : '—')));
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
		// doğru eşleşmeyi bul; bilmeyen bot en az iki öğeyi karıştırır
		const m = v.ord.map((_, j) => j).map((j) => v.ord.indexOf(j)); // sol l → sağ konum
		if (R() >= Math.min(0.96, pCorrect(skill, v.q.diff) + 0.08)) {
			const k = 2 + (R() < 0.35 ? 1 : 0) + (R() < 0.15 ? 1 : 0);
			const picks = shuffle([...m.keys()], R).slice(0, Math.min(k, v.n));
			const vals = picks.map((l) => m[l]);
			picks.forEach((l, i) => (m[l] = vals[(i + 1) % picks.length]));
		}
		return { value: m, time: thinkTime(R, 7, 9) };
	},
};
