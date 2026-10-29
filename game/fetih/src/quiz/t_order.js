// SIRALA: 3 öğeyi sürükleyerek (ya da iki satıra dokunup yer değiştirerek) istenen yönde diz.
// Veri: items: [{t, v, s?}, ×3]  (t metin, v sıralama değeri, s isteğe bağlı gösterim metni: "≈ 5 ton", "MÖ 44")
//       dir: 'desc' → büyükten küçüğe (yoksa küçükten büyüğe). Soru metni yönü açıkça söyler ("eskiden yeniye",
//            "yeniden eskiye", "büyükten küçüğe"…); metindeki yön ifadesi dir ile uyuşmalı (test/types.test.mjs).
//       lo / hi: isteğe bağlı uç etiketleri (en küçük ve en büyük değerin ucu); yoksa yön ifadesinden gelir.
//       unit: isteğe bağlı birim (cevapta değerin yanına yazılır, s yoksa).
// Ekran: solda yukarıdan aşağı 1-2-3 yuvaları ve iki uçta yönü söyleyen etiketler (artan: ▲ EN ESKİ … ▼ EN YENİ;
//        azalan: ▲ EN YENİ … ▼ EN ESKİ); aradaki kama büyük değerin ucunda kalınlaşır. Satırlar yuvalar arasında kayar.
// Değer (value): yukarıdan aşağı öğe indeksleri, örn. [2,0,1]
// Sıralama türü 'closest': err = istenen yöne göre ters çevrilmiş çift sayısı (3 öğede 0..3); 0 = tam doğru.
// Eşitlikte süre belirler (arayüz ve maç: err, sonra time).

import { css, esc, shuffle, pCorrect, clamp, buzz, fmtNum } from './util.js';
import { botTime } from './timing.js';
import { setTimeout } from '../core/clock.js';

const GAP = 12; // satırlar arası boşluk (px; CSS --gap ile aynı)

const CSS = /* css */ `
.fl-ord{--row:clamp(56px,calc(7.3 * var(--vh)),70px);--rail:46px;display:flex;flex-direction:column;gap:8px;user-select:none;-webkit-user-select:none}
.fl-ord-end{display:flex;align-items:center;gap:8px;min-height:28px}
.fl-ord-end>b{flex:none;display:inline-flex;align-items:center;gap:7px;height:28px;margin-left:7px;padding:0 13px 0 3px;border-radius:999px;font-family:'Lilita One';font-weight:400;
  font-size:14.5px;letter-spacing:.07em;line-height:1;color:#3a2000;background:linear-gradient(180deg,#fff0a6,#f5b324);border:2px solid #fff;box-shadow:0 3px 0 #a0620a}
.fl-ord-end>b i{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:11px;line-height:1;color:#ffe27a;background:#3a2000}
.fl-ord-end.bot>b{color:#fff;background:linear-gradient(180deg,#5a7fd8,#2f4f9e);box-shadow:0 3px 0 #142554}
.fl-ord-end.bot>b i{color:#fff;background:#142554}
.fl-ord-hint{margin-left:auto;font-size:12.5px;line-height:1.15;text-align:right;color:#cfe0ff;opacity:.9;transition:opacity .3s}
.fl-ord.moved .fl-ord-hint,.fl-ord.sent .fl-ord-hint{opacity:0}
.fl-ord-main{position:relative;padding-left:var(--rail)}
.fl-ord-rail{position:absolute;left:0;top:-8px;bottom:-8px;width:var(--rail);pointer-events:none}
.fl-ord-rail::before{content:'';position:absolute;left:50%;top:0;bottom:0;width:16px;margin-left:-8px;opacity:.9;
  background:linear-gradient(180deg,rgba(255,241,176,.35),#f5b324);clip-path:polygon(38% 0,62% 0,100% 100%,0 100%)}
.fl-ord.desc .fl-ord-rail::before{background:linear-gradient(0deg,rgba(255,241,176,.35),#f5b324);clip-path:polygon(0 0,100% 0,62% 100%,38% 100%)}
.fl-ord-rail b{position:absolute;left:50%;top:0;width:32px;height:32px;margin-left:-16px;border-radius:50%;display:grid;place-items:center;font-family:'Lilita One';font-weight:400;font-size:18px;
  color:#3a2000;background:radial-gradient(circle at 40% 32%,#fffbe0,#ffd25a 62%,#e8980e);border:2.5px solid #fff;box-shadow:0 3px 0 #a0620a,0 4px 8px rgba(0,0,0,.3);transition:transform .25s}
.fl-ord-rail b.hot{transform:scale(1.18)}
.fl-ord-list{position:relative;margin-left:4px;touch-action:none;transition:height .3s}
.fl-ord-row{position:absolute;left:0;right:0;top:0;height:var(--row);display:flex;align-items:center;gap:10px;padding:0 8px 0 16px;border-radius:17px;color:var(--tdark);
  background:linear-gradient(180deg,#fff,#eef1f8);border:3px solid #fff;box-shadow:0 5px 0 #aab6cf,0 8px 12px rgba(0,0,0,.22);touch-action:none;cursor:grab;will-change:transform;
  transition:transform .26s cubic-bezier(.3,1.3,.5,1),background .25s,border-color .25s,box-shadow .25s,color .25s}
.fl-ord-row span{flex:1;min-width:0;font-size:clamp(16px,calc(4.5 * var(--vw)),19px);font-weight:600;line-height:1.14;text-wrap:balance;overflow-wrap:anywhere}
.fl-ord-row em{flex:none;max-width:44%;padding:4px 9px 5px;border-radius:10px;font-style:normal;font-family:'Lilita One';font-size:15.5px;line-height:1.05;text-align:center;
  color:#fff;background:rgba(0,0,0,.26);opacity:0;transform:scale(.6);transition:opacity .25s,transform .35s cubic-bezier(.3,1.6,.5,1)}
.fl-ord-row .fl-grip{flex:none;width:22px;height:30px;border-radius:7px;background:radial-gradient(circle,#97a3bf 2.1px,transparent 2.6px) 2px 1px/9px 9.5px}
.fl-ord-row.drag{transition:none;z-index:5;border-color:var(--gold);box-shadow:0 0 0 3px rgba(255,210,90,.55),0 16px 24px rgba(0,0,0,.45);cursor:grabbing}
.fl-ord-row.sel{background:linear-gradient(180deg,#fff7d2,#ffe08a);border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-d),0 5px 0 var(--gold-dd);animation:flq-ordsel 1s ease-in-out infinite}
.fl-ord-row.ok,.fl-ord-row.fin{color:#fff;background:linear-gradient(180deg,#7fe88a,#2fa84a);box-shadow:0 5px 0 var(--green-d),0 8px 14px rgba(40,200,80,.3);text-shadow:0 1px 0 rgba(0,60,20,.45)}
.fl-ord-row.bad{color:#fff;background:linear-gradient(180deg,#ff8a78,#d53b2c);box-shadow:0 5px 0 #7a120a;text-shadow:0 1px 0 rgba(80,0,0,.45)}
.fl-ord-row.ok em,.fl-ord-row.bad em,.fl-ord-row.fin em{opacity:1;transform:none}
.fl-ord.sent .fl-ord-row{cursor:default}
.fl-ord.sent .fl-grip{opacity:0}
.fl-ord .fl-send{margin-top:4px}
.fl-ord.sent .fl-send{display:none}
@keyframes flq-ordsel{50%{box-shadow:0 0 0 5px rgba(255,210,90,.6),0 5px 0 var(--gold-dd)}}
`;

/**
 * Yön ifadeleri: [artan, azalan, küçük değerin ucu, büyük değerin ucu]. Soru metninde tam bir tanesi geçer.
 * Azalan sorularda liste büyükten başlar; uç etiketleri de yönle birlikte yer değiştirir.
 */
export const DIRS = [
	[/eskiden yeniye/i, /yeniden eskiye/i, 'en eski', 'en yeni'],
	[/küçükten büyüğe/i, /büyükten küçüğe/i, 'en küçük', 'en büyük'],
	[/kısadan uzuna/i, /uzundan kısaya/i, 'en kısa', 'en uzun'],
	[/yakından uzağa/i, /uzaktan yakına/i, 'en yakın', 'en uzak'],
	[/yavaştan hızlıya/i, /hızlıdan yavaşa/i, 'en yavaş', 'en hızlı'],
	[/hafiften ağıra/i, /ağırdan hafife/i, 'en hafif', 'en ağır'],
	[/alçaktan yükseğe/i, /yüksekten alçağa/i, 'en alçak', 'en yüksek'],
	[/düşükten yükseğe/i, /yüksekten düşüğe/i, 'en düşük', 'en yüksek'],
	[/azdan çoğa/i, /çoktan aza/i, 'en az', 'en çok'],
	[/soğuktan sıcağa/i, /sıcaktan soğuğa/i, 'en soğuk', 'en sıcak'],
	[/yılın başından sonuna/i, /yılın sonundan başına/i, 'yılın başı', 'yılın sonu'],
	[/alfabe.*baştan sona/i, /alfabe.*sondan başa/i, "A'ya yakın", "Z'ye yakın"],
];

/** Soru metnindeki yön ifadeleri: [{ dir, lo, hi }] (sınama için hepsi; oyun ilkini kullanır). */
export function phrases(text) {
	const out = [];
	for (const [up, down, lo, hi] of DIRS) {
		if (up.test(text || '')) out.push({ dir: 'asc', lo, hi });
		if (down.test(text || '')) out.push({ dir: 'desc', lo, hi });
	}
	return out;
}

/**
 * Sorunun sıralama yönü ve uç etiketleri: { dir: 'asc'|'desc', lo, hi, top, bottom }.
 * lo/hi en küçük ve en büyük değerin ucu; top/bottom listenin üstünde ve altında yazan etiket.
 */
export function direction(q) {
	const p = phrases(q?.q)[0];
	const dir = q?.dir === 'desc' || q?.dir === 'asc' ? q.dir : p?.dir || 'asc';
	const lo = q?.lo || p?.lo || 'en küçük';
	const hi = q?.hi || p?.hi || 'en büyük';
	return { dir, lo, hi, top: dir === 'desc' ? hi : lo, bottom: dir === 'desc' ? lo : hi };
}

/** Ters çevrilmiş çift sayısı: seq yukarıdan aşağı öğe indeksleri; dir yönüne göre (asc: küçük üstte). */
export function inversions(seq, items, dir = 'asc') {
	const s = dir === 'desc' ? -1 : 1;
	let c = 0;
	for (let i = 0; i < seq.length; i++) for (let j = i + 1; j < seq.length; j++) if (s * (items[seq[i]].v - items[seq[j]].v) > 0) c++;
	return c;
}

const up = (s) => String(s).toLocaleUpperCase('tr-TR');

export const order = {
	time: 20,
	label: 'Sırala',
	kind: 'closest',
	keep: true, // arayüz sıralama tablosunu tahtanın altına ekler (tahtayı silmez)
	fmt: (v, value) => `${value.filter((k, i) => k === v.correct[i]).length}/${value.length} yerinde`,
	sub: (v, value, r) => (r.err === 0 ? 'tam isabet' : `sıra hatası ${r.err}`),
	prepare(q, R) {
		const { dir } = direction(q);
		const idx = q.items.map((_, i) => i);
		const correct = idx.slice().sort((a, b) => (dir === 'desc' ? q.items[b].v - q.items[a].v : q.items[a].v - q.items[b].v));
		let start = shuffle(idx, R);
		// başlangıç hiçbir zaman doğru sıra değil (gerekirse bir kaydır: belirlenimci)
		if (inversions(start, q.items, dir) === 0) start = start.slice(1).concat(start[0]);
		return { q, dir, start, correct };
	},
	mount(el, v, api) {
		css('order', CSS);
		const items = v.q.items;
		const n = items.length;
		const D = direction(v.q);
		let seq = v.start.slice();
		el.innerHTML = `<div class="fl-ord ${D.dir}">
			<div class="fl-ord-end top"><b><i>▲</i>${esc(up(D.top))}</b><span class="fl-ord-hint">Sürükle ya da iki satıra dokun</span></div>
			<div class="fl-ord-main">
				<div class="fl-ord-rail">${items.map((_, k) => `<b>${k + 1}</b>`).join('')}</div>
				<div class="fl-ord-list">${items
					.map((it, i) => `<div class="fl-ord-row" data-i="${i}"><span>${esc(it.t)}</span><em></em><i class="fl-grip"></i></div>`)
					.join('')}</div>
			</div>
			<div class="fl-ord-end bot"><b><i>▼</i>${esc(up(D.bottom))}</b></div>
			<button class="fl-send">ONAYLA</button>
		</div>`;
		const root = el.querySelector('.fl-ord');
		const list = el.querySelector('.fl-ord-list');
		const rows = [...el.querySelectorAll('.fl-ord-row')];
		const marks = [...el.querySelectorAll('.fl-ord-rail b')];
		let done = false;
		let drag = null;
		let sel = -1;
		// satır boyu CSS'ten (--row, ekran boyuna göre); adım = boy + boşluk
		let row = 64;
		let pitch = row + GAP;
		const measure = () => {
			const h = rows[0]?.offsetHeight;
			if (h > 0) {
				row = h;
				pitch = h + GAP;
			}
			list.style.height = n * pitch - GAP + 'px';
			marks.forEach((m, k) => (m.style.top = 8 + k * pitch + row / 2 - 16 + 'px'));
		};
		const place = (skip = -1) => {
			measure();
			seq.forEach((k, slot) => {
				if (k !== skip) rows[k].style.transform = `translateY(${slot * pitch}px)`;
			});
		};
		const lit = (slot) => marks.forEach((m, k) => m.classList.toggle('hot', k === slot));
		const moved = () => root.classList.add('moved');
		place();
		list.addEventListener('pointerdown', (e) => {
			if (done || drag) return;
			const r = e.target.closest('.fl-ord-row');
			if (!r) return;
			const i = Number(r.dataset.i);
			measure();
			drag = { row: r, i, y0: e.clientY, base: seq.indexOf(i) * pitch, moved: false, id: e.pointerId };
			try {
				r.setPointerCapture(e.pointerId);
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
				rows.forEach((x) => x.classList.remove('sel'));
				sel = -1;
				moved();
			}
			const y = clamp(drag.base + dy, -8, (n - 1) * pitch + 8);
			drag.row.style.transform = `translateY(${y}px) scale(1.03) rotate(-.6deg)`;
			const slot = clamp(Math.round(y / pitch), 0, n - 1);
			lit(slot);
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
			lit(-1);
			if (d.moved) return place();
			// dokunma: ilk dokunuş seçer, ikincisi yer değiştirir
			if (done) return;
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
				moved();
				place();
				buzz(8);
			}
		};
		list.addEventListener('pointerup', end);
		list.addEventListener('pointercancel', end);
		el.querySelector('.fl-send').addEventListener('click', () => {
			if (done) return;
			done = true;
			rows.forEach((x) => x.classList.remove('sel'));
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
				drag = null;
				root.classList.add('sent');
				rows.forEach((x) => x.classList.remove('sel', 'drag'));
				lit(-1);
				const right = v.correct;
				const unit = v.q.unit ? ' ' + v.q.unit : '';
				rows.forEach((x, i) => {
					x.classList.add(seq.indexOf(i) === right.indexOf(i) ? 'ok' : 'bad');
					x.querySelector('em').textContent = items[i].s ?? fmtNum(items[i].v) + unit;
				});
				// önce oyuncunun dizisi (yeşil/kırmızı, değerleriyle), sonra satırlar doğru yerlerine kayar
				setTimeout(() => {
					seq = right.slice();
					rows.forEach((x) => x.classList.add('fin'));
					place();
				}, 800);
			},
			destroy() {},
		};
	},
	judge(v, value) {
		const n = v.q.items.length;
		const max = (n * (n - 1)) / 2;
		if (!Array.isArray(value) || value.length !== n || new Set(value).size !== n || value.some((k) => !(k >= 0 && k < n))) return { correct: false, err: max };
		const err = inversions(value, v.q.items, v.dir || direction(v.q).dir);
		return { correct: err === 0, err };
	},
	bot(v, skill, R) {
		const seq = v.correct.slice();
		const n = seq.length;
		if (n > 1 && R() >= Math.min(0.97, pCorrect(skill, v.q.diff) + 0.05)) {
			// yanılgı: çoğunlukla değeri birbirine en yakın iki komşu karışır (1 ters çift), bazen bir öğe yanlış uca
			// kayar (n−1), nadiren yön ters okunur (dizi tümden ters)
			const u = R();
			if (n > 2 && u < 0.05 + 0.08 * (1 - skill)) seq.reverse();
			else if (n > 2 && u < 0.4) {
				if (R() < 0.5) seq.push(seq.shift());
				else seq.unshift(seq.pop());
			} else {
				const vals = seq.map((k) => v.q.items[k].v);
				const span = Math.max(1e-9, Math.max(...vals) - Math.min(...vals));
				const w = vals.slice(1).map((x, a) => 1 / (Math.abs(x - vals[a]) / span + 0.08));
				let r = R() * w.reduce((s, x) => s + x, 0);
				let a = 0;
				for (; a < w.length - 1; a++) if ((r -= w[a]) <= 0) break;
				[seq[a], seq[a + 1]] = [seq[a + 1], seq[a]];
			}
		}
		return { value: seq, time: botTime(v, R, skill, 0.1, 0.9) };
	},
};
