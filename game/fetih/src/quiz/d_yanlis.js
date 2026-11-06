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
/* DÜZELTME MASASI: çizgili kâğıt, kırmızı kalemle daire, sarı yapışkan notlar */
.dn-yb{display:flex;flex-direction:column;gap:12px;user-select:none;-webkit-user-select:none}
.fl-q.cover .dn-yb{flex:1 1 auto;justify-content:center;gap:16px}
/* üst afiş daralmasın: cevap içeriği küçültülmeden önce kartı taşırınca afiş sıkışıp damga yanlış yere konuyordu
   (asıl düzeltme ortak: styles-arena .fl-qwho{flex:none}) */
.fl-q.cover.t-yanlis .fl-qwho{flex:none}
.fl-q.cover .dn-yb-pp{padding:40px 16px 22px 44px;background:repeating-linear-gradient(180deg,transparent 0 45px,rgba(60,110,210,.22) 45px 46.5px) 0 39px/100% 100% no-repeat,linear-gradient(180deg,#fffdf4,#f6edd6)}
.fl-q.cover .dn-yb-c{height:46px;font-size:clamp(20px,calc(5.8 * var(--vw)),25px);line-height:34px}
.fl-q.cover .dn-yb-o .fl-opt{min-height:74px}
.dn-yb-st{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px}
.dn-yb-st span{display:flex;align-items:center;gap:7px;padding:5px 12px 5px 5px;border-radius:12px;font:italic 900 15px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.08em;color:rgba(255,255,255,.45);background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.12);transition:all .25s}
.dn-yb-st span[data-s="2"]{justify-self:end}
.dn-yb-st span i{flex:none;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;font-style:normal;font-size:15px;color:#0a1534;background:rgba(255,255,255,.25)}
.dn-yb-st span.on{color:#fff;background:rgba(232,52,60,.22);box-shadow:inset 0 0 0 2px #ff6a5a,0 0 16px rgba(255,90,74,.35)}
.dn-yb-st span.on i{background:#ff6a5a;color:#fff}
.dn-yb-st span.ok{color:#7dff9a;background:rgba(62,224,122,.14);box-shadow:inset 0 0 0 2px #3ee07a}
.dn-yb-st span.ok i{background:#3ee07a}
.dn-yb-st b{width:34px;height:3px;border-radius:2px;background:linear-gradient(90deg,rgba(255,255,255,.2),rgba(255,255,255,.2))}
.dn-yb-st span.ok~b,.dn-yb-st span.ok+b{background:#3ee07a}
.dn-yb-pp{position:relative;padding:34px 14px 16px 40px;border-radius:6px;transform:rotate(-.4deg);
  background:repeating-linear-gradient(180deg,transparent 0 37px,rgba(60,110,210,.22) 37px 38.5px) 0 33px/100% 100% no-repeat,linear-gradient(180deg,#fffdf4,#f6edd6);
  box-shadow:0 1px 0 #e2d4b2,0 3px 0 #d8c8a2,0 5px 0 #cdbb90,0 14px 26px rgba(0,0,0,.5)}
.dn-yb-pp::before{content:'';position:absolute;left:28px;top:0;bottom:0;width:2px;background:rgba(232,52,60,.55)}
.dn-yb-pp::after{content:'';position:absolute;left:9px;top:46px;width:10px;height:10px;border-radius:50%;background:#1a1f3a;box-shadow:0 56px 0 #1a1f3a,0 112px 0 #1a1f3a;opacity:.18}
.dn-yb-hd{position:absolute;left:40px;right:12px;top:9px;display:flex;align-items:center;justify-content:space-between;font:italic 900 12px/1 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:#9a8a6a}
.dn-yb-hd b{padding:3px 8px;border-radius:4px;color:#c8241a;letter-spacing:.1em;box-shadow:inset 0 0 0 2px #c8241a;transform:rotate(2deg)}
.dn-yb-s{position:relative;display:flex;flex-wrap:wrap;align-items:flex-end;column-gap:7px;row-gap:0;min-height:38px}
.dn-yb-c{position:relative;display:inline-flex;align-items:baseline;height:38px;padding:4px 3px 6px;border:0;border-radius:6px;background:none;
  font:700 clamp(18px,calc(5.1 * var(--vw)),22px)/28px 'Fredoka',sans-serif;color:#1a1f3a;touch-action:manipulation;transition:color .15s,opacity .3s,transform .1s}
.dn-yb-c>span{border-bottom:2px dotted rgba(26,31,58,.22)}
.dn-yb-c:active{transform:translateY(1px)}
.dn-yb-c small{font-size:.9em;opacity:.75}
.dn-yb-c.sel{color:#c8241a}
.dn-yb-c.sel>span{border-bottom-color:transparent}
.dn-yb-c.sel::after,.dn-yb-c.mine::after{content:'';position:absolute;left:-7px;right:-7px;top:1px;bottom:3px;border:3px solid #e8343c;border-radius:52% 46% 55% 44%/58% 52% 46% 50%;transform:rotate(-4deg);pointer-events:none;animation:ybPen .32s cubic-bezier(.3,1.6,.5,1) both}
.dn-yb-c.dim{opacity:.22;pointer-events:none}
.dn-yb-c.got{color:#c8241a}
.dn-yb-c.got::after{border-color:#e8343c;box-shadow:0 0 14px rgba(255,80,60,.45)}
.dn-yb-c.miss{color:#8a8a8a}
.dn-yb-c.miss>span{text-decoration:line-through;text-decoration-color:#8a8a8a}
.dn-yb-c.miss::after{border-color:#9a9a9a}
.dn-yb-c.fix{padding:4px 2px 6px;overflow:visible}
.dn-yb-c.fix::after{display:none}
.dn-yb-c.fix del{position:relative;display:inline-block;max-width:var(--w);overflow:hidden;white-space:nowrap;text-decoration:none;color:#c8241a;animation:dnYbOut .35s 1.1s ease-in forwards}
.dn-yb-c.fix del::after{content:'';position:absolute;left:-2px;right:-2px;top:50%;height:3.5px;border-radius:2px;background:#e8343c;transform-origin:0 50%;transform:rotate(-4deg);animation:dnYbStrike .35s .35s ease-out both}
.dn-yb-c.fix ins{position:relative;display:inline-block;padding:0 6px;border-radius:6px;text-decoration:none;color:#fff;background:linear-gradient(180deg,#4fd06a,#1f9a4a);box-shadow:0 0 0 2px #fff,0 0 18px rgba(62,224,122,.6),0 3px 0 #0f5a2a;
  transform:translateY(-26px) scale(.6);animation:dnYbIn .5s 1.2s cubic-bezier(.3,1.6,.5,1) forwards}
/* kim hangi kelimeyi işaretledi: kelimenin hemen sağında satır içi küçük portre (üst satıra, komşu kelimeye binmez) */
.dn-yb-c .fl-who{position:relative;inset:auto;flex:none;align-self:center;width:20px;height:20px;margin:0 -1px 0 4px;border-radius:6px;border-width:2px}
.dn-yb-c .fl-who+.fl-who{right:auto;margin-left:-8px}
.dn-yb-row{display:flex;align-items:center;gap:10px;min-height:52px}
.dn-yb-msg{flex:1;min-width:0;font:600 14px/1.25 'Fredoka',sans-serif;color:#cfe0ff}
.dn-yb-msg.warn{color:#ffb894}
.dn-yb-msg.good{color:#7dff9a}
.dn-yb .fl-send{flex:none;width:auto;min-width:136px;height:52px;padding:0 16px;font-size:18px;display:flex;align-items:center;gap:8px;justify-content:center}
.dn-yb .fl-send::before{content:'';width:18px;height:18px;flex:none;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3 21l3.8-1 11-11-2.8-2.8-11 11z' fill='%23c8241a'/%3E%3Cpath d='M15.6 5.6l2.8 2.8 1.8-1.8a1.4 1.4 0 0 0 0-2l-.8-.8a1.4 1.4 0 0 0-2 0z' fill='%231a1f3a'/%3E%3C/svg%3E") center/contain no-repeat}
.dn-yb-o{display:grid;gap:10px;padding-top:4px}
.dn-yb-o.three{grid-template-columns:repeat(3,minmax(0,1fr))}
.dn-yb-o:empty{display:none}
.dn-yb-o .fl-opt{min-height:62px;padding:8px 6px;justify-content:center;text-align:center;border:0;border-radius:3px;clip-path:none;color:#2a1a00;
  font:400 clamp(17px,calc(4.8 * var(--vw)),21px)/1.1 'Lilita One',sans-serif;background:linear-gradient(180deg,#fff4a0,#ffe45a);box-shadow:0 6px 10px rgba(0,0,0,.35),inset 0 -6px 10px rgba(180,140,0,.18);
  transform:rotate(-2deg);animation:ybNote .4s cubic-bezier(.3,1.6,.5,1) both}
.dn-yb-o .fl-opt::before{content:'';position:absolute;left:50%;top:-6px;width:38px;height:12px;margin-left:-19px;background:rgba(255,255,255,.55);transform:rotate(3deg);box-shadow:0 1px 2px rgba(0,0,0,.15)}
.dn-yb-o .fl-opt>i{display:none}
.dn-yb-o .fl-opt:nth-child(2){transform:rotate(1.5deg);animation-delay:.07s;background:linear-gradient(180deg,#ffd0e4,#ffa8cc)}
.dn-yb-o .fl-opt:nth-child(3){transform:rotate(-1deg);animation-delay:.14s;background:linear-gradient(180deg,#c8f4ff,#8ee4ff)}
.dn-yb-o .fl-opt>span{overflow-wrap:normal}
.dn-yb-o .fl-opt.pick{box-shadow:0 0 0 3px #fff,0 0 0 6px #e8343c,0 6px 10px rgba(0,0,0,.35)}
.dn-yb-o .fl-opt.right{background:linear-gradient(180deg,#7fe88a,#2fa84a);color:#fff;box-shadow:0 0 0 3px #fff,0 0 22px rgba(62,224,122,.6)}
.dn-yb-o .fl-opt.wrong{background:linear-gradient(180deg,#ff8a78,#d53b2c);color:#fff}
.dn-yb-o .fl-opt.dim{opacity:.35}
.dn-yb-o .fl-opt.gone{opacity:.12;pointer-events:none}
.dn-yb-n{position:relative;display:flex;gap:10px;align-items:flex-start;padding:10px 12px 11px 12px;border-radius:6px;transform:rotate(.6deg);background:linear-gradient(180deg,#fffdf4,#f3e7c8);box-shadow:0 8px 16px rgba(0,0,0,.4);
  font:500 14.5px/1.35 'Fredoka',sans-serif;color:#2a2a3a;animation:dnYbUp .4s 1.5s both}
.dn-yb-n i{flex:none;padding:2px 7px;border-radius:4px;font-style:normal;font:italic 900 11px/1.4 'Barlow Condensed',sans-serif;letter-spacing:.12em;color:#fff;background:#1f9a4a}
.dn-yb.done .dn-yb-row,.dn-yb.done .dn-yb-st{display:none}
@media (max-height:720px){.dn-yb-pp{padding:30px 10px 10px 34px}.dn-yb-pp::before{left:24px}.dn-yb-o .fl-opt{min-height:48px}.dn-yb .fl-send{height:46px}
  .fl-q.cover .dn-yb{gap:10px}
  .fl-q.cover .dn-yb-pp{padding:34px 12px 12px 38px;background:repeating-linear-gradient(180deg,transparent 0 39px,rgba(60,110,210,.22) 39px 40.5px) 0 33px/100% 100% no-repeat,linear-gradient(180deg,#fffdf4,#f6edd6)}
  .fl-q.cover .dn-yb-pp::before{left:26px}
  .fl-q.cover .dn-yb-c{height:40px;font-size:clamp(18px,calc(5.2 * var(--vw)),22px);line-height:30px}
  .fl-q.cover .dn-yb-o .fl-opt{min-height:50px}
  .fl-q.cover .dn-yb-n{padding:8px 10px 9px;font-size:13.5px;line-height:1.3}}
/* en kısa ekran (≤600 px, 320×568): gövde ancak %64'e küçülerek sığıyordu (etiketler 8, not 7–9 px). Adım şeridi,
   kâğıt, kelime satırları ve İŞARETLE satırı sıkışır; cetvel çizgileri yeni satır boyuna (36 px) oturur. */
@media (max-height:600px){
  .fl-q.cover .dn-yb{gap:6px}
  .dn-yb-st span{gap:6px;padding:3px 10px 3px 3px;font-size:13px}
  .dn-yb-st span i{width:21px;height:21px;border-radius:6px;font-size:13px}
  .fl-q.cover .dn-yb-pp{padding:28px 10px 8px 34px;background:repeating-linear-gradient(180deg,transparent 0 35px,rgba(60,110,210,.22) 35px 36.5px) 0 28px/100% 100% no-repeat,linear-gradient(180deg,#fffdf4,#f6edd6)}
  .fl-q.cover .dn-yb-pp::before{left:24px}
  .dn-yb-pp::after{left:7px;top:38px;box-shadow:0 48px 0 #1a1f3a,0 96px 0 #1a1f3a}
  .dn-yb-hd{left:34px;right:10px;top:7px;font-size:11px}
  .fl-q.cover .dn-yb-c{height:36px;font-size:clamp(16px,calc(5 * var(--vw)),20px);line-height:28px}
  .dn-yb-row{min-height:44px}
  .dn-yb .fl-send{height:42px;min-width:124px;font-size:16px}
  .fl-q.cover .dn-yb-o .fl-opt{min-height:40px}
  .fl-q.cover .dn-yb-n{padding:7px 9px 8px;font-size:13.5px;line-height:1.26}
}
/* kısa ekran, cevap: doğrusu cümlenin içinde yeşil; seçenekler (kim neyi seçti) içerik genişliğinde notlar olarak
   satırlara dizilir (kısa olanlar aynı satırı paylaşır), alçak ve sık; kural yazısı (dar kartta kendi satırı) kalkar.
   Eskiden üç tam genişlik şerit gövdeyi %70'e küçültüyor, NOT ve not yazısı 8 px'e düşüyordu. */
@media (max-height:720px){
  .fl-q.cover.t-yanlis.rv .fl-rule{display:none}
  .fl-q.cover .dn-yb.done .dn-yb-o:not(.three){display:flex;flex-wrap:wrap;gap:6px 8px}
  .fl-q.cover .dn-yb.done .dn-yb-o .fl-opt{flex:1 1 auto;min-height:38px;padding-top:5px;padding-bottom:5px} /* yan paylar ortak kuraldan: portreli şıkta yazı portrenin solunda kalır */
  .fl-q.cover .dn-yb.done .dn-yb-o.three{gap:8px}
}
@keyframes ybPen{0%{transform:rotate(-14deg) scale(.6)}100%{transform:rotate(-4deg) scale(1)}}
/* girişler yukarıdan (aşağı kayan not gövdenin altından taşıp _coverFit'i boş yere küçültmeye zorluyordu) */
@keyframes ybNote{0%{transform:translateY(-12px) rotate(-8deg) scale(.85)}}
@keyframes dnYbStrike{from{transform:rotate(-4deg) scaleX(0)}to{transform:rotate(-4deg) scaleX(1)}}
@keyframes dnYbOut{to{max-width:0;opacity:0;margin-right:-2px}}
@keyframes dnYbIn{to{transform:none}}
@keyframes dnYbUp{from{transform:translateY(-8px)}}
@media (prefers-reduced-motion:reduce){.dn-yb-c::after,.dn-yb-o .fl-opt{animation:none}}
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
	cover: true, // tam ekran düzeltme masası
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
			<div class="dn-yb-st"><span class="on" data-s="1"><i>1</i>YANLIŞI BUL</span><b></b><span data-s="2"><i>2</i>DÜZELT</span></div>
			<div class="dn-yb-pp"><div class="dn-yb-hd"><span>DÜZELTME MASASI</span><b>1 KELİME YANLIŞ</b></div>
			<div class="dn-yb-s">${v.words.map((x, i) => `<button class="dn-yb-c" data-i="${i}"><span>${esc(x.w)}</span>${x.p ? `<small>${esc(x.p)}</small>` : ''}</button>`).join('')}</div></div>
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
				// düzeltme oturunca (eski kelime daralıp kalkınca) cümle bir satır kısalabilir: bir sınıf değişikliğiyle gövde
				// yeniden ölçülsün (_coverFit animasyonları izlemez; yoksa ilk, uzun hâlin küçültmesi kalıyordu)
				c.addEventListener('animationend', (e) => e.animationName === 'dnYbIn' && c.classList.add('oturdu'));
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
				if (v.q.n) root.insertAdjacentHTML('beforeend', `<div class="dn-yb-n"><i>NOT</i><span>${esc(v.q.n)}</span></div>`);
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
