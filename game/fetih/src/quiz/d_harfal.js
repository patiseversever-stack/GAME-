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
/* HARF PANOSU: perçinli koyu pano, ikiye bölünmüş döner kutular (her kutunun altında 100 puanlık jeton), kasa ve
   HARF AL kolu panonun başlığında; klavye panoyla aynı malzemeden, GÖNDER klavyenin son satırında. Harf alınca kutu
   döner, altındaki jeton düşer ve kasa 100 eksilir: puanın nereden gittiği gözle görülür. */
.dn-ha{display:flex;flex-direction:column;gap:10px;align-items:stretch;user-select:none;-webkit-user-select:none}
.fl-q.cover .dn-ha{flex:1 1 auto;justify-content:flex-start}
.fl-q.cover .dn-ha [data-r=kb]{margin-top:auto}
.ha-pano{position:relative;display:flex;flex-direction:column;gap:9px;padding:10px 12px 12px;border-radius:14px;
  background:radial-gradient(120% 90% at 50% 0%,#262b40 0%,#141724 70%),#141724;
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.1),inset 0 2px 0 rgba(255,255,255,.08),0 0 0 3px #0a0c14,0 14px 30px rgba(0,0,0,.55)}
.ha-pano::before,.ha-pano::after{content:'';position:absolute;top:8px;width:6px;height:6px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#8a93b0,#3a4058)}
.ha-pano::before{left:8px}.ha-pano::after{right:8px}
.ha-hd{display:flex;align-items:center;gap:10px;padding:0 6px}
.dn-ha-pts{flex:1;min-width:0;display:flex;align-items:baseline;gap:7px}
.dn-ha-pts small{font:italic 900 12px/1 'Barlow Condensed',sans-serif;letter-spacing:.18em;color:#8f97b8}
.dn-ha-pts b{font:400 34px/1 'Lilita One',sans-serif;color:#ffd25a;font-variant-numeric:tabular-nums;text-shadow:0 2px 0 #5a3a00,0 0 18px rgba(255,200,60,.35);transition:color .3s}
.dn-ha-pts b.drop{animation:dnHaDrop .45s}
.dn-ha-pts em{font-style:normal;font:italic 800 12px/1 'Barlow Condensed',sans-serif;letter-spacing:.1em;color:#8f97b8;white-space:nowrap}
.dn-ha-al{flex:none;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:108px;height:46px;padding:0 16px;border:0;border-radius:0;
  clip-path:polygon(9% 0,100% 0,91% 100%,0 100%);font:italic 900 20px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.1em;color:#fff;
  background:linear-gradient(180deg,#4fb6ff,#1a62c8);box-shadow:inset 0 2px 0 rgba(255,255,255,.35),inset 0 -4px 0 rgba(0,0,0,.25);transition:transform .08s,filter .2s;touch-action:manipulation}
.dn-ha-al small{font:800 10.5px/1 'Fredoka',sans-serif;letter-spacing:.06em;color:#ffe6a0;margin-top:3px}
.dn-ha-al:active{transform:translateY(2px) scale(.98)}
.dn-ha-al:disabled{filter:grayscale(.8) brightness(.6)}
/* kutular ve jetonlar aynı ızgarada: her jeton kendi kutusunun altında */
.dn-ha-w,.ha-chips{display:flex;gap:5px;justify-content:center;flex-wrap:nowrap}
.dn-ha-w b,.ha-chips i{flex:0 0 min(60px,calc((100% - (var(--n) - 1) * 5px) / var(--n)));min-width:0}
.dn-ha-w b{position:relative;aspect-ratio:4/5;border-radius:7px;display:grid;place-items:center;font:400 clamp(20px,calc(6.6 * var(--vw)),34px)/1 'Lilita One',sans-serif;color:#f7ecd0;
  background:linear-gradient(180deg,#323850 0 49%,#0c0e16 49% 51%,#262b3e 51% 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 3px 0 #07080d,0 5px 10px rgba(0,0,0,.4);transform-origin:50% 50%}
.dn-ha-w b::after{content:'';position:absolute;left:3px;right:3px;bottom:5px;height:3px;border-radius:2px;background:rgba(255,255,255,.08)}
.dn-ha-w b.cur::after{background:#ffd25a;box-shadow:0 0 10px #ffd25a;animation:dnHaCur 1s ease-in-out infinite}
.dn-ha-w b.al{color:#8fd8ff;text-shadow:0 0 12px rgba(80,180,255,.6);animation:dnHaFlip .5s ease-out}
.dn-ha-w b.free{color:#ffd25a;text-shadow:0 0 12px rgba(255,200,60,.6);animation:dnHaFlip .5s ease-out}
.dn-ha-w.shake{animation:flq-shake .38s}
.dn-ha-w.sent b:not(.al):not(.free){color:#fff3c4}
.dn-ha-w.rv b{animation:dnHaFlip .45s ease-out both;animation-delay:calc(var(--k) * 70ms)}
.dn-ha-w.rv.ok b{color:#fff;background:linear-gradient(180deg,#3fc46a 0 49%,#0b3a1c 49% 51%,#2aa356 51% 100%);text-shadow:0 2px 0 rgba(0,0,0,.25)}
.dn-ha-w.rv.no b{color:#fff;background:linear-gradient(180deg,#e2503e 0 49%,#4a0d08 49% 51%,#c23a2a 51% 100%)}
.ha-chips i{height:20px;display:grid;place-items:center;border-radius:10px;font:italic 900 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.04em;font-style:normal;color:#5a3a00;
  background:radial-gradient(circle at 40% 30%,#fff2b0,#f5b324 60%,#b8760a);box-shadow:inset 0 -2px 0 rgba(0,0,0,.2),0 2px 0 #6a4000;transition:transform .45s cubic-bezier(.5,0,.8,.5),opacity .45s,filter .45s}
.ha-chips i.gone{transform:translateY(8px) rotate(-14deg);opacity:.28;filter:grayscale(1);text-decoration:line-through;text-decoration-thickness:2px}
.ha-chips i.free{background:radial-gradient(circle at 40% 30%,#e8fff0,#7fe8a0 60%,#2a9a52);color:#0b3a1c;box-shadow:inset 0 -2px 0 rgba(0,0,0,.2),0 2px 0 #145a2a}
.ha-chips.win i:not(.gone){animation:dnHaWin .6s cubic-bezier(.3,1.6,.5,1) both;animation-delay:calc(var(--k) * 60ms)}
.dn-ha-g{min-height:18px;text-align:center;font:500 13.5px/1.3 'Fredoka',sans-serif;color:#aab4d6}
.dn-ha-g s{color:#ff9a8a;text-decoration-thickness:2px}
.dn-ha-g b{color:#7dff9a;font-weight:700}
/* klavye: panoyla aynı malzeme; GÖNDER son satırda */
.dn-ha .fl-keys{gap:5px}
.dn-ha .fl-keys div{gap:4px}
.dn-ha .fl-key{height:42px;max-width:36px;border:0;border-radius:7px;color:#f7ecd0;background:linear-gradient(180deg,#30364c,#22263a);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 3px 0 #07080d;font-size:18px}
.dn-ha .fl-key:active{transform:translateY(2px);box-shadow:0 1px 0 #07080d}
.dn-ha .fl-back{max-width:52px;flex:1.4}
.dn-ha .fl-keys .fl-send{flex:3.2;max-width:none;width:auto;height:42px;margin:0 0 0 2px;padding:0 8px;font-size:17px}
.dn-ha .fl-keys .fl-send:disabled{opacity:.45}
.dn-ha.done .fl-keys,.dn-ha.done .dn-ha-al{display:none}
@media (max-height:700px){.dn-ha .fl-key,.dn-ha .fl-keys .fl-send{height:36px}.dn-ha-w b,.ha-chips i{flex-basis:min(48px,calc((100% - (var(--n) - 1) * 5px) / var(--n)))}.dn-ha-pts b{font-size:30px}.dn-ha-al{height:42px}.ha-pano{gap:7px;padding:8px 10px 10px}}
@keyframes dnHaFlip{0%{transform:perspective(200px) rotateX(90deg)}60%{transform:perspective(200px) rotateX(-14deg)}100%{transform:none}}
@keyframes dnHaDrop{30%{color:#ff7a6a;transform:scale(.88)}}
@keyframes dnHaCur{50%{opacity:.35}}
@keyframes dnHaWin{40%{transform:translateY(-10px) scale(1.2)}100%{transform:none}}
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
	cover: true, // tam ekran harf panosu (harita gizli)
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
			<div class="ha-pano">
				<div class="ha-hd"><span class="dn-ha-pts"><small>KASA</small><b>${n * 100}</b><em>${n} HARF</em></span><button class="dn-ha-al">HARF AL<small>−100 puan</small></button></div>
				<div class="dn-ha-w" style="--n:${n}">${'<b></b>'.repeat(n)}</div>
				<div class="ha-chips" style="--n:${n}">${Array.from({ length: n }, (_, i) => `<i style="--k:${i}">100</i>`).join('')}</div>
			</div>
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
		const chips = [...root.querySelectorAll('.ha-chips i')];
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
			chips[i]?.classList.add(kind === 'al' ? 'gone' : 'free'); // alınan harfin jetonu düşer, bedava harfinki kalır
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
		root.querySelector('[data-r=kb]').lastElementChild?.append(send); // GÖNDER klavyenin son satırında
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
				if (mine?.ok) root.querySelector('.ha-chips')?.classList.add('win'); // kalan jetonlar kasaya zıplar
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
