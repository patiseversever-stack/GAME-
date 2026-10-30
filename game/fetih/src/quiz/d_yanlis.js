// YANLIŞI BUL (deneme): bir cümlede tek kelime yanlış. Önce yanlış kelimeye dokun (dokun, İŞARETLE ya da aynı
// kelimeye ikinci dokunuş), yer doğruysa üç seçenek açılır: doğrusunu seç. İkisini de bilen TAM, yalnız yeri bulan
// YARIM puan alır; yanlış kelimeyi işaretleyen puansız kalır. Cevapta yanlış kelimenin üstü çizilir, doğrusu kayarak
// yerine oturur, altında kısa bir not açılır. (Duolingo'nun dokun-düzelt kalıbı, bilgi yarışmasına uyarlanmış.)
//
// Veri: t: 'Cümle, yanlış kelime {süslü} ayraçta.' (ayracın hemen ardındaki noktalama ayrı kalır),
//       ok: doğrusu, alt: [iki yanlış seçenek], n: cevap notu (isteğe bağlı).
// Değer: { w: işaretlenen kelime (v.words sırası), f: seçilen seçenek (v.opts sırası) ya da null }.
// Tür 'closest': err 0 tam, 1 yarım (yer doğru), 2 yanlış kelime; correct = tam.
// Çevrimiçi: istemci yalnız kelimeleri görür (v.words). Yer sunucuya sorulur (act 'yer' { w } → { ok, opts }):
// doğruysa seçenekler o an gelir; publicView yanlışın yerini, seçenekleri ve notu taşımaz.
// Joker: yarı yarıya → yanlış kelimeyle birlikte üç aday kalır, öbür kelimeler söner; seçeneklerden biri elenir.

import { css, esc, shuffle, pCorrect, clamp, buzz } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, rule, stampLater, sfx, LOOK, ACT } from './d_ortak.js';
import { setTimeout } from '../core/clock.js';

const CSS = /* css */ `
.dn-yb{display:flex;flex-direction:column;gap:9px;user-select:none;-webkit-user-select:none}
.dn-yb-st{display:flex;gap:6px;align-items:center;justify-content:center}
.dn-yb-st span{display:flex;align-items:center;gap:6px;padding:3px 10px 4px 4px;border-radius:99px;font-size:12.5px;font-weight:700;color:#9fb0d6;background:rgba(10,18,44,.55);border:1.5px solid rgba(255,255,255,.12);transition:all .25s}
.dn-yb-st span i{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-family:'Lilita One';font-size:13px;color:#0a1534;background:#8fa2cf}
.dn-yb-st span.on{color:#fff;border-color:var(--gold);background:rgba(255,210,90,.14)}
.dn-yb-st span.on i{background:var(--gold)}
.dn-yb-st span.ok{color:#7dff9a;border-color:rgba(125,255,154,.5)}
.dn-yb-st span.ok i{background:#7dff9a}
.dn-yb-st b{width:14px;height:2px;background:rgba(255,255,255,.2);border-radius:2px}
.dn-yb-s{display:flex;flex-wrap:wrap;gap:6px 5px;justify-content:center;padding:10px 8px 11px;border-radius:16px;background:#0a1534;border:2px solid rgba(255,255,255,.14);box-shadow:inset 0 3px 0 rgba(0,0,0,.35)}
.dn-yb-c{position:relative;display:inline-flex;align-items:baseline;padding:4px 8px 6px;border-radius:10px;font-family:'Fredoka';font-weight:600;font-size:clamp(16px,calc(4.4 * var(--vw)),19px);line-height:1.1;
  color:var(--tdark);background:linear-gradient(180deg,#fff,#e9eef8);border:2px solid #fff;box-shadow:0 3px 0 #9aa8c4;touch-action:manipulation;transition:transform .1s,opacity .3s,background .15s,box-shadow .15s}
.dn-yb-c:active{transform:translateY(2px);box-shadow:0 1px 0 #9aa8c4}
.dn-yb-c small{font-size:.9em;opacity:.7}
.dn-yb-c.sel{background:linear-gradient(180deg,#fff7d2,#ffd25a);border-color:#fff;box-shadow:0 0 0 2.5px var(--gold-d),0 3px 0 var(--gold-dd);transform:translateY(-2px)}
.dn-yb-c.dim{opacity:.28;pointer-events:none}
.dn-yb-c.got{background:linear-gradient(180deg,#ffe7a0,#ffb63a);border-color:#fff;box-shadow:0 0 0 3px #fff3,0 0 18px 4px rgba(255,190,60,.55),0 3px 0 #a0620a;animation:dnYbGot .5s cubic-bezier(.3,1.7,.5,1)}
.dn-yb-c.miss{color:#fff;background:linear-gradient(180deg,#ff8a78,#d53b2c);box-shadow:0 3px 0 #7a120a;animation:flShakeX .45s}
.dn-yb-c.mine::before{content:'';position:absolute;left:50%;bottom:-7px;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:var(--gold)}
.dn-yb-c.fix{background:none;border-color:transparent;box-shadow:none;padding:4px 2px 6px;gap:0;overflow:visible}
.dn-yb-c.fix del{position:relative;display:inline-block;max-width:var(--w);overflow:hidden;white-space:nowrap;text-decoration:none;color:#ff8a78;animation:dnYbOut .35s .95s ease-in forwards}
.dn-yb-c.fix del::after{content:'';position:absolute;left:-2px;right:-2px;top:52%;height:3px;border-radius:2px;background:#ff5a4a;transform-origin:0 50%;animation:dnYbStrike .35s .35s ease-out both}
.dn-yb-c.fix ins{display:inline-block;padding:4px 8px 6px;margin:-4px 0 -6px;border-radius:10px;text-decoration:none;color:#fff;background:linear-gradient(180deg,#7fe88a,#2fa84a);border:2px solid #fff;box-shadow:0 0 16px 3px rgba(125,255,154,.5),0 3px 0 var(--green-d);
  opacity:0;transform:translateY(-22px) scale(.7);animation:dnYbIn .5s 1.1s cubic-bezier(.3,1.6,.5,1) forwards}
.dn-yb-c .fl-who{top:-14px;right:-10px;width:24px;height:24px;border-radius:8px}
.dn-yb-row{display:flex;align-items:center;gap:10px;min-height:46px}
.dn-yb-msg{flex:1;min-width:0;font-size:13.5px;line-height:1.25;color:#cfe0ff}
.dn-yb-msg.warn{color:#ffb894}
.dn-yb-msg.good{color:#7dff9a}
.dn-yb .fl-send{flex:none;width:auto;min-width:118px;height:46px;padding:0 14px;font-size:17px}
.dn-yb-o{display:grid;gap:8px}
.dn-yb-o.three{grid-template-columns:repeat(3,minmax(0,1fr))}
.dn-yb-o:empty{display:none}
.dn-yb-o .fl-opt{min-height:50px;padding:6px 8px 7px;justify-content:center;text-align:center;animation:dnYbUp .35s cubic-bezier(.3,1.5,.5,1) both}
.dn-yb-o .fl-opt:nth-child(2){animation-delay:.06s}.dn-yb-o .fl-opt:nth-child(3){animation-delay:.12s}
.dn-yb-o .fl-opt>span{overflow-wrap:normal}
.dn-yb-n{display:flex;gap:8px;align-items:flex-start;padding:8px 10px 9px;border-radius:13px;background:rgba(10,18,44,.6);border:1.5px solid rgba(255,210,90,.35);font-size:13.5px;line-height:1.3;color:#e6edff;animation:dnYbUp .4s 1.5s both}
.dn-yb-n i{flex:none;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-family:'Lilita One';font-size:13px;color:#3a2200;background:var(--gold)}
.dn-yb.done .dn-yb-row,.dn-yb.done .dn-yb-st{display:none}
@keyframes dnYbGot{0%{transform:scale(1)}40%{transform:scale(1.18) rotate(-3deg)}100%{transform:scale(1)}}
@keyframes dnYbStrike{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes dnYbOut{to{max-width:0;opacity:0;margin-right:-2px}}
@keyframes dnYbIn{to{opacity:1;transform:none}}
@keyframes dnYbUp{from{opacity:0;transform:translateY(10px)}}
`;

/** Cümleyi kelimelere böl: { w: kelime, p: ardındaki noktalama }; yanlış kelime {…} ayracında. */
export function words(t) {
	const out = [];
	let bad = -1;
	for (const m of String(t).matchAll(/\{([^}]+)\}([^\s{]*)|(\S+)/g)) {
		if (m[1] != null) {
			bad = out.length;
			out.push({ w: m[1], p: m[2] || '' });
		} else {
			const [, w, p] = m[3].match(/^(.*?)([.,;:!?\u2026\u201D"\u2019)]*)$/);
			out.push({ w: w || m[3], p: w ? p : '' });
		}
	}
	return { list: out, bad };
}

/** Sonuç: 0 tam, 1 yarım (yer doğru), 2 yanlış kelime, 3 cevap yok. */
const grade = (v, value) => {
	if (!value || !Number.isInteger(value.w)) return 3;
	if (value.w !== v.bad) return 2;
	return value.f === v.right ? 0 : 1;
};
const LABEL = ['TAM PUAN', 'YARIM PUAN', 'PUAN YOK', '—'];

export const yanlis = {
	time: 25,
	label: 'Yanlışı Bul',
	kind: 'closest',
	keep: true,
	jokers: ['yari'],
	fmt: (v, value) => LABEL[grade(v, value)],
	sub: (v, value) => ['yer + düzeltme', 'yer doğru, düzeltme yanlış', 'yanlış kelime', 'cevap yok'][grade(v, value)],
	prepare(q, R) {
		const { list, bad } = words(q.t);
		const opts = shuffle([q.ok, ...q.alt], R);
		const v = { q, words: list, bad, opts, right: opts.indexOf(q.ok) };
		return stamp(v, q, (q2, k, P, text) => {
			text(list.map((x) => x.w + x.p).join(' '));
			text(opts.join(' '), 0.6);
			return {
				wait: 0.4, // seçeneklerin açılması
				look: LOOK.orient + list.length * 0.12,
				// cümleyi tart, şüpheliyi seç (kelime sayısıyla), sonra doğrusunu hatırla
				think: P.think[0] + P.think[1] * k + list.length * 0.12,
				act: 2 * ACT.tap + ACT.confirm,
			};
		});
	},
	mount(el, v, api) {
		css('yanlis', CSS);
		const app = appOf();
		el.innerHTML = `<div class="dn-yb">
			<div class="dn-yb-st"><span class="on" data-s="1"><i>1</i>Yanlışı bul</span><b></b><span data-s="2"><i>2</i>Düzelt</span></div>
			<div class="dn-yb-s">${v.words.map((x, i) => `<button class="dn-yb-c" data-i="${i}"><span>${esc(x.w)}</span>${x.p ? `<small>${esc(x.p)}</small>` : ''}</button>`).join('')}</div>
			<div class="dn-yb-row"><span class="dn-yb-msg">Yanlış olan kelimeye dokun</span><button class="fl-send" disabled>İŞARETLE</button></div>
			<div class="dn-yb-o"></div>
		</div>`;
		rule(el, 'Bul ve düzelt');
		const root = el.querySelector('.dn-yb');
		const chips = [...root.querySelectorAll('.dn-yb-c')];
		const msg = root.querySelector('.dn-yb-msg');
		const send = root.querySelector('.fl-send');
		const optsEl = root.querySelector('.dn-yb-o');
		const steps = [...root.querySelectorAll('.dn-yb-st span')];
		let sel = -1;
		let w = null;
		let f = null;
		let done = false;
		let hideOpt = -1;
		const say = (text, tone = '') => {
			msg.textContent = text;
			msg.className = `dn-yb-msg ${tone}`;
		};
		const burst = (node, colors) => {
			const fx = app?.ui?.fx;
			if (!fx || !node) return;
			const r = node.getBoundingClientRect();
			fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 14, dist: 70, colors, kind: 'star', size: 11, life: 650 });
		};
		const end = () => {
			if (done) return;
			done = true;
			send.disabled = true;
			api.answer({ w, f });
		};
		const showOpts = () => {
			const long = v.opts.some((o) => [...o].length > 9);
			optsEl.className = `dn-yb-o${long ? '' : ' three'}`;
			optsEl.innerHTML = v.opts.map((o, i) => `<button class="fl-opt" data-i="${i}"><span>${esc(o)}</span></button>`).join('');
			if (hideOpt >= 0) optsEl.children[hideOpt]?.classList.add('gone');
		};
		const mark = () => {
			if (done || w != null || sel < 0) return;
			w = sel;
			send.disabled = true;
			const c = chips[w];
			c.classList.remove('sel');
			c.classList.add('mine');
			// çevrimdışı: yer burada yargılanır (çevrimiçinde act 'yer' sunucuya sorulur)
			if (w === v.bad) {
				c.classList.add('got');
				burst(c, ['#ffd25a', '#fff']);
				sfx(app, 'right');
				buzz(14);
				steps[0].className = 'ok';
				steps[1].className = 'on';
				say('Yeri buldun: yarım puan cepte! Şimdi doğrusunu seç', 'good');
				send.style.display = 'none';
				showOpts();
			} else {
				c.classList.add('miss');
				sfx(app, 'wrong');
				buzz(40);
				say('Bu kelime doğruydu…', 'warn');
				setTimeout(end, 450);
			}
		};
		root.querySelector('.dn-yb-s').addEventListener('click', (e) => {
			const b = e.target.closest('.dn-yb-c');
			if (!b || done || w != null) return;
			const i = Number(b.dataset.i);
			if (i === sel) return mark(); // aynı kelimeye ikinci dokunuş: işaretle
			chips[sel]?.classList.remove('sel');
			sel = i;
			b.classList.add('sel');
			send.disabled = false;
			say(`“${v.words[i].w}” yanlış mı? İşaretle`);
			sfx(app, 'tap');
			buzz(5);
		});
		send.addEventListener('click', mark);
		optsEl.addEventListener('click', (e) => {
			const b = e.target.closest('.fl-opt');
			if (!b || done || b.classList.contains('gone')) return;
			f = Number(b.dataset.i);
			b.classList.add('pick');
			buzz(8);
			end();
		});
		return {
			lock() {
				done = true;
				send.disabled = true;
			},
			value: () => (w == null ? null : { w, f }),
			joker(e) {
				if (!e) return;
				for (const i of e.dim || []) if (i !== w) chips[i]?.classList.add('dim');
				if (sel >= 0 && chips[sel].classList.contains('dim')) {
					chips[sel].classList.remove('sel');
					sel = -1;
					send.disabled = true;
				}
				hideOpt = e.hide ?? -1;
				if (hideOpt >= 0) optsEl.children[hideOpt]?.classList.add('gone');
				app?.ui?.toast?.('Üç aday kaldı, bir seçenek elendi', { tone: 'good', ms: 1800 });
			},
			reveal(results) {
				done = true;
				root.classList.add('done');
				for (const c of chips) c.classList.remove('sel', 'dim');
				// yanlış kelime: üstü çizilir, doğrusu kayarak yerine oturur
				const c = chips[v.bad];
				const span = c.querySelector('span');
				const wpx = Math.ceil(span.getBoundingClientRect().width) + 4;
				c.classList.remove('got', 'mine', 'miss');
				c.classList.add('fix');
				c.style.setProperty('--w', `${wpx}px`);
				span.outerHTML = `<del>${esc(v.words[v.bad].w)}</del><ins>${esc(v.q.ok)}</ins>`;
				setTimeout(() => burst(c, ['#7dff9a', '#fff', '#ffd25a']), 1250);
				// oyuncuların işaretlediği kelimeler
				for (const r of results) {
					const i = r.value?.w;
					if (!Number.isInteger(i) || !chips[i]) continue;
					if (i !== v.bad) chips[i].classList.add('miss');
					chips[i].insertAdjacentHTML('beforeend', `<b class="fl-who" style="background:${r.color}"></b>`);
				}
				// seçenekler: doğrusu yeşil, yanlış seçim kırmızı
				if (!optsEl.children.length) showOpts();
				[...optsEl.children].forEach((b, i) => {
					b.classList.remove('gone');
					if (i === v.right) b.classList.add('right');
					else b.classList.add('dim');
				});
				for (const r of results) {
					const fi = r.value?.f;
					if (r.value?.w !== v.bad || !Number.isInteger(fi)) continue;
					const b = optsEl.children[fi];
					if (!b) continue;
					if (fi !== v.right) b.classList.replace('dim', 'wrong');
					b.insertAdjacentHTML('beforeend', `<b class="fl-who" style="background:${r.color}"></b>`);
				}
				if (v.q.n) root.insertAdjacentHTML('beforeend', `<div class="dn-yb-n"><i>i</i><span>${esc(v.q.n)}</span></div>`);
				const meR = results.find((r) => r.p?.human);
				if (meR && app) {
					const g = grade(v, meR.value);
					const order = results.slice().sort((a, b2) => a.err - b2.err || a.time - b2.time);
					const win = order[0] === meR;
					const other = win ? '' : order[0].err === g ? `${order[0].name} daha hızlıydı` : `${order[0].name} ${order[0].err === 0 ? 'tam bildi' : 'daha iyiydi'}`;
					if (g === 0) stampLater(app, 'TAM PUAN!', win ? 'gold' : '', other || 'Buldun ve düzelttin');
					else if (g === 1) stampLater(app, 'YARIM PUAN', win ? 'gold' : 'warn', other || 'Yer doğru, düzeltme yanlış');
					else stampLater(app, g === 3 ? 'SÜRE DOLDU' : 'BULAMADIN', 'bad', `Yanlış kelime: ${v.words[v.bad].w}`);
				}
				setTimeout(() => {
					const w = el.closest('.fl-q')?.querySelector('.fl-cr.win .tag');
					if (w) w.textContent = 'KAZANDI';
				}, 0);
			},
			destroy() {},
		};
	},
	joker(id, v, R) {
		if (id !== 'yari') return null;
		const others = shuffle(
			v.words.map((_, i) => i).filter((i) => i !== v.bad),
			R,
		);
		const wrongOpts = v.opts.map((_, i) => i).filter((i) => i !== v.right);
		return { dim: others.slice(2).sort((a, b) => a - b), hide: wrongOpts[Math.floor(R() * wrongOpts.length)] };
	},
	/** Çevrimiçi görünüm: yalnız kelimeler. Yanlışın yeri, seçenekler ve not sunucuda (act 'yer'). */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.bad;
		delete o.right;
		delete o.opts;
		for (const k of ['t', 'ok', 'alt', 'n']) delete o.q[k];
		return o;
	},
	judge(v, value) {
		const g = grade(v, value);
		return { correct: g === 0, err: g, half: g === 1 };
	},
	bot(v, skill, R) {
		const p = pCorrect(skill, v.q.diff);
		const found = R() < clamp(p + 0.12, 0.1, 0.97);
		if (!found) {
			const others = v.words.map((_, i) => i).filter((i) => i !== v.bad && [...v.words[i].w].length > 2);
			return { value: { w: others[Math.floor(R() * others.length)], f: null }, time: botTime(v, R, skill, 0.1, 0.7) };
		}
		const fix = R() < clamp(p + 0.05, 0.08, 0.95);
		const wrong = v.opts.map((_, i) => i).filter((i) => i !== v.right);
		return { value: { w: v.bad, f: fix ? v.right : wrong[Math.floor(R() * wrong.length)] }, time: botTime(v, R, skill, 0.15, 0.95) };
	},
	/** Sınama için doğru ve yanlış örnek cevap. */
	ornek(v) {
		return { good: { w: v.bad, f: v.right }, bad: { w: (v.bad + 1) % v.words.length, f: null } };
	},
};
