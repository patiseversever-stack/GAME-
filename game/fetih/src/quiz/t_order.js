// SIRALA (kronoloji): 4 öğeyi sürükleyerek küçükten büyüğe (ya da eskiden yeniye) diz.
// Veri: items: [{t, v, s?}, ×4]  (t metin, v sıralama değeri, s isteğe bağlı gösterim metni)
//       lo / hi: isteğe bağlı uç etiketleri ("en eski" / "en yeni").
// Değer (value): öğe indekslerinin sırası, örn. [2,0,3,1]
// Sıralama türü 'closest': err = ters çevrilmiş çift sayısı (0..6); 0 = tam doğru.

import { css, esc, shuffle, pCorrect, gauss, clamp, buzz, fmtNum, isLand, LAND } from './util.js';
import { botTime } from './timing.js';

// satır yüksekliği ve adım (px): dikey telefon / yatay (kısa ekran) / yatayda cevap açılınca
const GEO = { port: { row: 52, pitch: 60 }, land: { row: 40, pitch: 45 }, cmp: { row: 28, pitch: 33 } };

const CSS = /* css */ `
.fl-ord{display:flex;flex-direction:column;gap:6px}
.fl-ord-cap{font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.65;text-align:center}
.fl-ord-list{position:relative;touch-action:none;transition:height .3s}
.fl-ord-row{position:absolute;left:0;right:0;top:0;height:var(--row);display:flex;align-items:center;gap:10px;padding:0 12px 0 8px;border-radius:14px;
  background:linear-gradient(180deg,#3a5ba8,#2a4486);border:2px solid rgba(255,255,255,.22);box-shadow:0 4px 0 #142554;
  transition:transform .22s cubic-bezier(.3,1.3,.5,1),height .3s,background .25s,border-color .25s,box-shadow .25s;touch-action:none;cursor:grab;will-change:transform}
.fl-ord-row.drag{transition:none;z-index:5;border-color:#fff;box-shadow:0 10px 18px rgba(0,0,0,.45);cursor:grabbing;background:linear-gradient(180deg,#5f7fd2,#3f5fb2)}
.fl-ord-row.sel{border-color:var(--gold);box-shadow:0 0 0 3px rgba(255,210,90,.35),0 4px 0 #142554}
.fl-ord-row b{flex:none;width:28px;height:28px;border-radius:9px;background:rgba(255,255,255,.2);display:grid;place-items:center;font-family:'Lilita One';font-weight:400;font-size:16px}
.fl-ord-row span{flex:1;min-width:0;font-size:16px;line-height:1.15}
.fl-ord-row em{font-style:normal;font-family:'Lilita One';font-size:16px;color:var(--gold);opacity:0;transition:opacity .3s}
.fl-ord-row .fl-grip{flex:none;width:16px;height:16px;background:radial-gradient(circle,rgba(255,255,255,.55) 1.6px,transparent 2px) 0 0/8px 8px;opacity:.8}
.fl-ord-row.ok{background:linear-gradient(180deg,#4fd16a,#2a9a44);box-shadow:0 4px 0 #156a2a;border-color:#fff}
.fl-ord-row.bad{background:linear-gradient(180deg,#ff6a5a,#c8352a);box-shadow:0 4px 0 #7a1a12}
.fl-ord-row.fin{background:linear-gradient(180deg,#4fd16a,#2a9a44);box-shadow:0 4px 0 #156a2a;border-color:#fff}
.fl-ord-row.ok em,.fl-ord-row.bad em,.fl-ord-row.fin em{opacity:1;color:#fff}
.fl-ord .fl-send{margin-top:4px}
.fl-ord.sent .fl-send{display:none}
.fl-ord.sent .fl-grip{display:none}

.fl-ord.cmp .fl-ord-row{padding:0 10px 0 6px;gap:8px;border-radius:10px;box-shadow:0 2px 0 #142554}
.fl-ord.cmp .fl-ord-row b{width:20px;height:20px;border-radius:6px;font-size:13px}
.fl-ord.cmp .fl-ord-row span,.fl-ord.cmp .fl-ord-row em{font-size:13px}
.fl-ord.cmp .fl-ord-cap{display:none}
${LAND}{
  .fl-ord{display:grid;grid-template-columns:minmax(0,1fr) 88px;grid-template-rows:auto 1fr auto;column-gap:8px;row-gap:0}
  .fl-ord-list{grid-column:1;grid-row:1/4}
  .fl-ord-cap.lo{grid-column:2;grid-row:1;align-self:start;margin-top:2px}
  .fl-ord-cap.hi{grid-column:2;grid-row:3;align-self:end;margin-bottom:2px}
  .fl-ord .fl-send{grid-column:2;grid-row:2;align-self:center;margin:0;padding:16px 4px 18px;font-size:17px}
  .fl-ord-row span{font-size:15px}
  .fl-ord-row b{width:24px;height:24px;font-size:14px}
  .fl-ord.sent{display:block}
}
`;

/** values: item indeksleri sırası; ters çevrilmiş çift sayısı. */
export function inversions(seq, items) {
	let c = 0;
	for (let i = 0; i < seq.length; i++) for (let j = i + 1; j < seq.length; j++) if (items[seq[i]].v > items[seq[j]].v) c++;
	return c;
}

/** Uç etiketleri: veride lo / hi varsa onlar, yoksa soru metninden ("eskiden yeniye sırala" → en eski / en yeni). */
const ENDS = [
	[/yılın başından/i, ['yılın başı', 'yılın sonu']],
	[/eskiden yeniye|tahta çıkış|yıla göre|yıllarına|döneme göre/i, ['en eski', 'en yeni']],
	[/yakından uzağa/i, ['en yakın', 'en uzak']],
	[/kısadan uzuna/i, ['en kısa', 'en uzun']],
	[/yavaştan hızlıya/i, ['en yavaş', 'en hızlı']],
	[/hafiften ağıra|az olandan çok olana/i, ['en hafif', 'en ağır']],
	[/alfabe|sırasına göre diz/i, ['ilk', 'son']],
];
export function ends(q) {
	if (q.lo || q.hi) return [q.lo || 'en küçük', q.hi || 'en büyük'];
	for (const [re, e] of ENDS) if (re.test(q.q || '')) return e;
	return ['en küçük', 'en büyük'];
}

export const order = {
	time: 20,
	label: 'Sırala',
	kind: 'closest',
	keep: true, // arayüz sıralama tablosunu tahtanın altına ekler (tahtayı silmez)
	fmt: (v, value) => `${value.filter((k, i) => k === v.correct[i]).length}/${value.length} yerinde`,
	sub: (v, value, r) => (r.err === 0 ? 'tam isabet' : `sıra hatası ${r.err}`),
	prepare(q, R) {
		const idx = q.items.map((_, i) => i);
		const correct = idx.slice().sort((a, b) => q.items[a].v - q.items[b].v);
		let start = shuffle(idx, R);
		for (let k = 0; k < 12 && inversions(start, q.items) === 0; k++) start = shuffle(idx, R);
		return { q, start, correct };
	},
	mount(el, v, api) {
		css('order', CSS);
		const items = v.q.items;
		const n = items.length;
		const [lo, hi] = ends(v.q);
		let seq = v.start.slice();
		let G = isLand() ? GEO.land : GEO.port;
		el.innerHTML = `<div class="fl-ord" style="--row:${G.row}px">
			<div class="fl-ord-cap lo">▲ ${esc(lo)}</div>
			<div class="fl-ord-list" style="height:${n * G.pitch - (G.pitch - G.row)}px">${items
				.map((it, i) => `<div class="fl-ord-row" data-i="${i}"><b></b><span>${esc(it.t)}</span><em></em><i class="fl-grip"></i></div>`)
				.join('')}</div>
			<div class="fl-ord-cap hi">▼ ${esc(hi)}</div>
			<button class="fl-send">ONAYLA</button>
		</div>`;
		const root = el.querySelector('.fl-ord');
		const list = el.querySelector('.fl-ord-list');
		const rows = [...el.querySelectorAll('.fl-ord-row')];
		let done = false;
		let drag = null;
		let sel = -1;
		const place = (skip = -1) => {
			seq.forEach((k, slot) => {
				if (k === skip) return;
				rows[k].style.transform = `translateY(${slot * G.pitch}px)`;
				rows[k].firstChild.textContent = slot + 1;
			});
			if (skip >= 0) rows[skip].firstChild.textContent = seq.indexOf(skip) + 1;
		};
		// satır boyutunu değiştir (yatayda cevap açılınca tahta küçülür, sıralama tablosuna yer açılır)
		const setGeo = (g) => {
			G = g;
			root.style.setProperty('--row', g.row + 'px');
			list.style.height = n * g.pitch - (g.pitch - g.row) + 'px';
			place();
		};
		place();
		list.addEventListener('pointerdown', (e) => {
			if (done || drag) return;
			const row = e.target.closest('.fl-ord-row');
			if (!row) return;
			const i = Number(row.dataset.i);
			drag = { row, i, y0: e.clientY, base: seq.indexOf(i) * G.pitch, moved: false, id: e.pointerId };
			try {
				row.setPointerCapture(e.pointerId);
			} catch {
				/* yoksay */
			}
		});
		list.addEventListener('pointermove', (e) => {
			if (!drag || e.pointerId !== drag.id) return;
			const dy = e.clientY - drag.y0;
			if (!drag.moved) {
				if (Math.abs(dy) < 6) return;
				drag.moved = true;
				drag.row.classList.add('drag');
				rows.forEach((r) => r.classList.remove('sel'));
				sel = -1;
			}
			const y = clamp(drag.base + dy, -6, (n - 1) * G.pitch + 6);
			drag.row.style.transform = `translateY(${y}px) scale(1.03)`;
			const slot = clamp(Math.round(y / G.pitch), 0, n - 1);
			const cur = seq.indexOf(drag.i);
			if (slot !== cur) {
				seq.splice(cur, 1);
				seq.splice(slot, 0, drag.i);
				place(drag.i);
				buzz(6);
			}
		});
		const end = (e) => {
			if (!drag || e.pointerId !== drag.id) return;
			const d = drag;
			drag = null;
			d.row.classList.remove('drag');
			if (d.moved) return place();
			// dokunma: ilk dokunuş seçer, ikincisi yer değiştirir
			if (sel < 0) {
				sel = d.i;
				d.row.classList.add('sel');
			} else if (sel === d.i) {
				sel = -1;
				d.row.classList.remove('sel');
			} else {
				const a = seq.indexOf(sel);
				const b = seq.indexOf(d.i);
				[seq[a], seq[b]] = [seq[b], seq[a]];
				rows[sel].classList.remove('sel');
				sel = -1;
				place();
				buzz(8);
			}
		};
		list.addEventListener('pointerup', end);
		list.addEventListener('pointercancel', end);
		el.querySelector('.fl-send').addEventListener('click', () => {
			if (done) return;
			done = true;
			root.classList.add('sent');
			api.answer(seq.slice());
		});
		return {
			lock() {
				done = true;
				drag = null;
			},
			value: () => seq.slice(),
			reveal(results) {
				done = true;
				root.classList.add('sent');
				if (isLand()) {
					root.classList.add('cmp');
					setGeo(GEO.cmp);
				}
				rows.forEach((r) => r.classList.remove('sel', 'drag'));
				const right = v.correct;
				const unit = v.q.unit ? ' ' + v.q.unit : '';
				rows.forEach((r, i) => {
					r.classList.add(seq.indexOf(i) === right.indexOf(i) ? 'ok' : 'bad');
					r.querySelector('em').textContent = (items[i].s ?? fmtNum(items[i].v)) + (items[i].s ? '' : unit);
				});
				setTimeout(() => {
					seq = right.slice();
					rows.forEach((r) => r.classList.add('fin'));
					place();
				}, 750);
			},
			destroy() {},
		};
	},
	judge(v, value) {
		const max = (v.q.items.length * (v.q.items.length - 1)) / 2;
		if (!Array.isArray(value)) return { correct: false, err: max };
		const err = inversions(value, v.q.items);
		return { correct: err === 0, err };
	},
	bot(v, skill, R) {
		const seq = v.correct.slice();
		if (R() >= Math.min(0.97, pCorrect(skill, v.q.diff) + 0.05)) {
			// komşu yer değiştirmeleriyle yanılgı (1..3)
			const k = clamp(Math.round(Math.abs(gauss(R)) * (1.5 - skill) * 1.4) + 1, 1, 4);
			for (let j = 0; j < k; j++) {
				const a = Math.floor(R() * (seq.length - 1));
				[seq[a], seq[a + 1]] = [seq[a + 1], seq[a]];
			}
		}
		return { value: seq, time: botTime(v, R, skill, 0.1, 0.9) };
	},
};
