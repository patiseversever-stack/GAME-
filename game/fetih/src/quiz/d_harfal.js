// HARF AL (deneme): Kelime Oyunu'nun çekirdeği. Tanım ve boş kutular; her harf 100 puan. "HARF AL" rastgele bir
// kutuyu açar ve kazanılacak puanı 100 düşürür (son harf alınamaz). Bilince boş kutuları klavyeyle doldur ve GÖNDER:
// tek hak. Doğruysa kalan puan senin; yanlışsa 0. Eşit puanda hızlı olan önde.
//
// Veri: q: tanım, w: cevap (4–10 harf, tek kelime).
// Değer: { g: yazılan kelime, al: [alınan harflerin yeri…] }. Tür 'closest': err = alınan harf (bilemeyen 99).
// Çevrimiçi: publicView kelimeyi taşımaz (yalnız harf sayısı v.n); her HARF AL sunucuya sorulur
// (act 'harf' → { i, c }), gönderilen kelime sunucuda yargılanır.
// Joker: yarı yarıya → iki harf (kısa kelimede bir) BEDAVA açılır, puan düşmez.

import { css, esc, shuffle, pCorrect, clamp, buzz, keyboard, physicalKeys, trUp } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, rule, stampLater, sfx, LOOK, ACT } from './d_ortak.js';
import { setTimeout } from '../core/clock.js';

const CSS = /* css */ `
.dn-ha{display:flex;flex-direction:column;gap:9px;align-items:stretch;user-select:none;-webkit-user-select:none}
.dn-ha-top{display:flex;align-items:center;gap:10px}
.dn-ha-pts{flex:1;display:flex;align-items:baseline;gap:6px;padding:3px 12px 5px;border-radius:14px;background:#0a1534;border:2px solid rgba(255,255,255,.18);box-shadow:inset 0 3px 0 rgba(0,0,0,.35)}
.dn-ha-pts b{font-family:'Lilita One';font-weight:400;font-size:34px;line-height:1.05;color:var(--gold);font-variant-numeric:tabular-nums;text-shadow:0 2px 0 #3a2000;transition:color .3s}
.dn-ha-pts b.drop{animation:dnHaDrop .45s}
.dn-ha-pts small{font-family:'Manrope';font-weight:800;font-size:11px;letter-spacing:.16em;color:#8fa2cf}
.dn-ha-pts em{margin-left:auto;font-style:normal;font-size:12.5px;color:#9fb0d6}
.dn-ha-al{flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:104px;height:52px;padding:0 12px;border-radius:15px;
  font-family:'Lilita One';font-weight:400;font-size:20px;letter-spacing:.04em;line-height:1;color:#fff;background:linear-gradient(180deg,#5ec8ff,#1f7ab0);border:3px solid #fff;box-shadow:0 5px 0 #0c3e60,0 8px 12px rgba(0,0,0,.25);transition:transform .08s,opacity .2s}
.dn-ha-al small{font-family:'Manrope';font-weight:800;font-size:10.5px;letter-spacing:.08em;opacity:.9;margin-top:2px}
.dn-ha-al:active{transform:translateY(4px);box-shadow:0 1px 0 #0c3e60}
.dn-ha-al:disabled{opacity:.4;filter:grayscale(.6)}
.dn-ha-w{display:flex;gap:5px;justify-content:center;flex-wrap:nowrap}
.dn-ha-w b{flex:0 1 38px;min-width:0;height:46px;border-radius:10px;display:grid;place-items:center;font-family:'Lilita One';font-weight:400;font-size:clamp(20px,calc(6.2 * var(--vw)),27px);color:var(--tdark);
  background:linear-gradient(#fff,#e7ecf6);border:2.5px solid #fff;box-shadow:0 4px 0 #aab6cf;transition:background .2s}
.dn-ha-w b:empty{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.35);box-shadow:0 4px 0 rgba(0,0,0,.3)}
.dn-ha-w b.cur{border-color:var(--gold);box-shadow:0 0 0 2px var(--gold-d),0 4px 0 rgba(0,0,0,.3)}
.dn-ha-w b.al{color:#fff;background:linear-gradient(#5ec8ff,#1f7ab0);box-shadow:0 4px 0 #0c3e60;animation:dnHaFlip .5s ease-out}
.dn-ha-w b.free{color:#3a2200;background:linear-gradient(#ffe680,#f5b324);box-shadow:0 4px 0 #a0620a;animation:dnHaFlip .5s ease-out}
.dn-ha-w.shake{animation:flq-shake .38s}
.dn-ha-w.sent b:not(.al):not(.free){background:linear-gradient(#fff7d2,#ffe08a)}
.dn-ha-w.rv b{animation:dnHaFlip .45s ease-out both;animation-delay:calc(var(--k) * 70ms)}
.dn-ha-w.rv.ok b:not(.al):not(.free){color:#fff;background:linear-gradient(#7fe88a,#2fa84a);box-shadow:0 4px 0 var(--green-d)}
.dn-ha-w.rv.no b:not(.al):not(.free){color:#fff;background:linear-gradient(#ff8a78,#d53b2c);box-shadow:0 4px 0 #7a120a}
.dn-ha-g{text-align:center;font-size:13.5px;color:#cfe0ff;min-height:18px}
.dn-ha-g s{color:#ff9a8a;text-decoration-thickness:2px}
.dn-ha-g b{color:#7dff9a}
.dn-ha .fl-keys .fl-key{height:40px}
.dn-ha .fl-back{max-width:52px;flex:1.4}
.dn-ha.done .fl-keys,.dn-ha.done .fl-send,.dn-ha.done .dn-ha-al{display:none}
@keyframes dnHaFlip{0%{transform:rotateX(90deg)}60%{transform:rotateX(-14deg)}100%{transform:none}}
@keyframes dnHaDrop{30%{color:#ff7a6a;transform:scale(.88)}}
`;

// sayfa windows-1252 okunabilir: düzenli ifadede ASCII dışı harf yok (esbuild dizeleri kaçışlar, düzenli ifadeyi değil)
const norm = (s) => trUp(String(s ?? '')).replace(/[^A-Z\u00C7\u011E\u0130\u00D6\u015E\u00DC]/g, '');

/** Puan: doğruysa (harf − alınan) × 100, değilse 0. */
function score(v, value) {
	if (!value || typeof value.g !== 'string') return { ok: false, pts: 0, al: 0, none: true };
	const al = Array.isArray(value.al) ? new Set(value.al.filter((i) => Number.isInteger(i) && i >= 0 && i < v.n)).size : 0;
	const ok = norm(value.g) === v.word && al < v.n;
	return { ok, pts: ok ? (v.n - al) * 100 : 0, al };
}

export const harfal = {
	time: 30,
	label: 'Harf Al',
	kind: 'closest',
	keep: true,
	jokers: ['yari'],
	fmt: (v, value) => `${score(v, value).pts} puan`,
	sub: (v, value) => {
		const s = score(v, value);
		if (!s.ok) return 'bilemedi';
		return s.al ? `${s.al} harf aldı` : 'harf almadan!';
	},
	prepare(q) {
		const word = norm(q.w);
		const v = { q, word, n: [...word].length };
		return stamp(v, q, (q2, k, P) => ({
			look: LOOK.orient + v.n * LOOK.gaze,
			// tanımı çöz (zorlukla), gerekirse harf al ve deseni yeniden düşün
			think: P.think[0] + P.think[1] * k + v.n * 0.25,
			act: v.n * ACT.tap * 0.8 + ACT.tap + ACT.confirm,
		}));
	},
	mount(el, v, api) {
		css('harfal', CSS);
		const app = appOf();
		const word = [...(v.word || '')];
		const n = v.n;
		const slot = Array.from({ length: n }, () => ({ c: '', open: '' })); // open: 'al' | 'free'
		const al = [];
		let done = false;
		el.innerHTML = `<div class="dn-ha">
			<div class="dn-ha-top"><span class="dn-ha-pts"><b>${n * 100}</b><small>PUAN</small><em>${n} harf</em></span><button class="dn-ha-al">HARF AL<small>−100 PUAN</small></button></div>
			<div class="dn-ha-w">${'<b></b>'.repeat(n)}</div>
			<div class="dn-ha-g">Bilince boş kutuları doldur</div>
			<div data-r="kb"></div>
			<button class="fl-send" disabled>GÖNDER</button>
		</div>`;
		rule(el, 'Az harf al');
		const root = el.querySelector('.dn-ha');
		const boxes = [...root.querySelectorAll('.dn-ha-w b')];
		const wEl = root.querySelector('.dn-ha-w');
		const ptsEl = root.querySelector('.dn-ha-pts b');
		const alBtn = root.querySelector('.dn-ha-al');
		const send = root.querySelector('.fl-send');
		const gEl = root.querySelector('.dn-ha-g');
		const pts = () => (n - al.length) * 100;
		const draw = () => {
			const cur = slot.findIndex((s) => !s.c);
			boxes.forEach((b, i) => {
				b.textContent = slot[i].c;
				b.classList.toggle('cur', i === cur && !done);
			});
			send.disabled = done || cur >= 0;
			alBtn.disabled = done || slot.filter((s) => !s.open).length <= 1;
		};
		const open = (i, kind) => {
			slot[i] = { c: word[i], open: kind };
			const b = boxes[i];
			b.classList.remove('al', 'free');
			void b.offsetWidth;
			b.classList.add(kind);
		};
		const take = () => {
			if (done) return;
			const closed = slot.map((s, i) => (s.open ? -1 : i)).filter((i) => i >= 0);
			if (closed.length <= 1) return;
			// çevrimdışı: rastgele kapalı kutu (çevrimiçinde act 'harf' sunucuya sorulur)
			const i = closed[Math.floor(Math.random() * closed.length)];
			al.push(i);
			// açılan kutuya yazılmış harf varsa yazılanlar sola kayar
			const typed = slot.filter((s) => !s.open && s.c).map((s) => s.c);
			slot.forEach((s) => !s.open && (s.c = ''));
			open(i, 'al');
			for (const c of typed) {
				const j = slot.findIndex((s) => !s.c);
				if (j < 0) break;
				slot[j].c = c;
			}
			ptsEl.textContent = String(pts());
			ptsEl.classList.remove('drop');
			void ptsEl.offsetWidth;
			ptsEl.classList.add('drop');
			const fx = app?.ui?.fx;
			if (fx) {
				const r = boxes[i].getBoundingClientRect();
				fx.text(r.left + r.width / 2, r.top - 6, '−100', { cls: 'bad', life: 800 });
			}
			sfx(app, 'tap');
			buzz(10);
			draw();
		};
		alBtn.addEventListener('click', take);
		const onKey = (k) => {
			if (done) return;
			const j = slot.findIndex((s) => !s.c);
			if (j < 0) return;
			slot[j].c = k;
			buzz(4);
			draw();
		};
		const onBack = () => {
			if (done) return;
			for (let j = n - 1; j >= 0; j--)
				if (!slot[j].open && slot[j].c) {
					slot[j].c = '';
					break;
				}
			draw();
		};
		const submit = () => {
			if (done || slot.some((s) => !s.c)) return;
			done = true;
			wEl.classList.add('sent');
			gEl.textContent = `${pts()} puan için gönderildi`;
			sfx(app, 'tap');
			buzz(10);
			draw();
			api.answer({ g: slot.map((s) => s.c).join(''), al: al.slice() });
		};
		send.addEventListener('click', submit);
		keyboard(root.querySelector('[data-r=kb]'), { onKey, onBack });
		const off = physicalKeys(root, { onKey, onBack });
		const onEnter = (e) => {
			if (!root.isConnected) return document.removeEventListener('keydown', onEnter);
			if (e.key === 'Enter') submit();
		};
		document.addEventListener('keydown', onEnter);
		draw();
		return {
			lock() {
				done = true;
				draw();
			},
			value: () => (slot.every((s) => s.c) ? { g: slot.map((s) => s.c).join(''), al: al.slice() } : null),
			joker(e) {
				if (!e?.open) return;
				for (const i of e.open) if (!slot[i]?.open) open(i, 'free');
				// bedava harfin yerine yazılmış harf varsa yazılanları yeniden diz
				const typed = slot.filter((s) => !s.open && s.c).map((s) => s.c);
				slot.forEach((s) => !s.open && (s.c = ''));
				for (const c of typed) {
					const j = slot.findIndex((s) => !s.c);
					if (j >= 0) slot[j].c = c;
				}
				draw();
				app?.ui?.toast?.(`${e.open.length} harf bedava açıldı`, { tone: 'good', ms: 1800 });
			},
			reveal(results) {
				done = true;
				off();
				document.removeEventListener('keydown', onEnter);
				root.classList.add('done');
				const meR = results.find((r) => r.p?.human);
				const mine = meR ? score(v, meR.value) : null;
				const guess = meR?.value?.g ? norm(meR.value.g) : '';
				boxes.forEach((b, i) => {
					b.textContent = word[i];
					b.style.setProperty('--k', i);
				});
				wEl.classList.remove('sent');
				wEl.classList.add('rv', mine?.ok ? 'ok' : 'no');
				gEl.innerHTML = mine?.ok ? `Cevap <b>${esc(v.word)}</b> · ${al.length ? `${al.length} harf aldın` : 'hiç harf almadın!'}` : guess ? `Senin cevabın <s>${esc(guess)}</s> · doğrusu <b>${esc(v.word)}</b>` : `Doğrusu <b>${esc(v.word)}</b>`;
				if (mine?.ok) {
					ptsEl.textContent = String(mine.pts);
					const fx = app?.ui?.fx;
					if (fx) {
						const r = wEl.getBoundingClientRect();
						setTimeout(() => fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 18, dist: 110, colors: ['#7dff9a', '#ffd25a', '#fff'], kind: 'star', size: 12, life: 800 }), n * 70);
					}
				} else ptsEl.textContent = '0';
				if (meR && app) {
					const order = results.slice().sort((a, b2) => a.err - b2.err || a.time - b2.time);
					const win = order[0] === meR;
					if (mine.ok) stampLater(app, `+${mine.pts} PUAN`, win ? 'gold' : '', win ? (mine.al ? '' : 'Harf almadan bildin!') : order[0].err === mine.al ? `${order[0].name} daha hızlıydı` : `${order[0].name} ${(v.n - order[0].err) * 100} puan aldı`);
					else stampLater(app, mine.none ? 'SÜRE DOLDU' : 'BİLEMEDİN', 'bad', `Cevap: ${v.word}`);
				}
				setTimeout(() => {
					const w = el.closest('.fl-q')?.querySelector('.fl-cr.win .tag');
					if (w) w.textContent = 'KAZANDI';
				}, 0);
			},
			destroy() {
				off();
				document.removeEventListener('keydown', onEnter);
			},
		};
	},
	joker(id, v, R) {
		if (id !== 'yari') return null;
		const k = v.n >= 6 ? 2 : 1;
		return { open: shuffle([...Array(v.n).keys()], R).slice(0, k).sort((a, b) => a - b) };
	},
	/** Çevrimiçi görünüm: kelime yok, yalnız harf sayısı (her HARF AL act 'harf' ile sunucuya sorulur). */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.word;
		delete o.q.w;
		return o;
	},
	judge(v, value) {
		const s = score(v, value);
		return { correct: s.ok, err: s.ok ? s.al : 99, pts: s.pts };
	},
	bot(v, skill, R) {
		const p = clamp(pCorrect(skill, v.q.diff) + 0.1, 0.08, 0.95);
		// zayıf bot daha çok harf alır; zorluk arttıkça herkes alır
		const need = Math.round(clamp((1 - skill) * v.n * 0.45 + (v.q.diff - 1) * 0.7 + R() * 1.6 - 0.4, 0, v.n - 2));
		const al = shuffle([...Array(v.n).keys()], R).slice(0, need);
		const ok = R() < p;
		let g = v.word;
		if (!ok) {
			const w = [...v.word];
			const i = Math.floor(R() * w.length);
			w[i] = w[i] === 'A' ? 'E' : 'A';
			g = w.join('');
		}
		return { value: { g, al }, time: botTime(v, R, skill, ok ? 0.1 : 0.4, ok ? 0.9 : 1) };
	},
	ornek(v) {
		return { good: { g: v.word, al: [] }, bad: { g: v.word.slice(1) + 'X', al: [0] } };
	},
};
