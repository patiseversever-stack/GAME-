// FİTİL (deneme): iki oyuncunun arasında fitili yanan bir top. Art arda kısa sorular gelir (doğru/yanlış ve
// karşılaştır, bankadan); iki oyuncu AYNI soruyu görür. İlk doğru cevap topu rakibe çevirir ve soruyu kapatır;
// yanlış cevap topu sana çevirir, o sorudan çıkarsın ve 0,8 sn kilitlenirsin (soru rakibe açık kalır). Fitilin süresi
// gizli ve rastgele (12–25 sn, sunucuda belirlenir). Patladığında top kime dönükse o kaybeder. Sıcak patates, fetih hâli.
//
// Neden rastgele basmak kârlı değil: hızlı ama rastgele basan, soruların yarısında topu kendine çevirir; o soruda
// rakip (bilgili) doğruyu bulup topu onda bırakır ve rastgele basan bir sonraki soruya 0,8 sn geç kalır. Top,
// zamanın büyük kısmında ona dönük kalır (sınama: test/deneme-icat3b.test.mjs benzetimi, rastgele basan bilgili bota
// karşı ~%70 kaybeder).
//
// Veri: pool: 'karisik' | kategori ('tarih', 'cografya', …), diff: en zor mini soru zorluğu. Sorular bankadan seçilir.
// Görünüm: items [{ t, q, o: [a, b], right, d }], fuse (sn, GİZLİ), start (top başta kime dönük: 0 ilk oyuncu).
// Değer: { side, me, vs }: side oyuncunun koltuğu (0/1); me ve vs birer oyuncu tanımı: { log: [[soru, şık, sn], …] }
//        (gerçek dokunuşlar, turun başından) ya da { sheet: [[şık, tepki sn], …] } (botun soru başına planı).
// judge turu iki tanımla yeniden oynatır (engine): patladığında top bana dönük değilse doğru. Sunucu da aynı
// motorla yargılar (iki oyuncunun log'u). Galeride bot rakibin planı kartta oynanır; tur bitince botun değeri de
// aynı turla güncellenir (iki sonuç çelişmesin).
// Süre: sabit tur (PROFILE.fitil round): kartın saati gizli (fitil saati ele vermesin).

import { css, esc, shuffle, pCorrect, buzz, clamp } from './util.js';
import { appOf, stamp, onClose, onOpen, sfx, stampLater, LOOK, DENEME_CSS } from './d_ortak.js';
import { clock, setTimeout, clearTimeout } from '../core/clock.js';
import { BANK } from '../data/bank.js';

export const QMAX = 6; // kimse cevaplamazsa mini soru kapanır (sn)
export const GAP = 0.8; // iki soru arası (topun dönüşü)
export const LOCK = 0.8; // yanlış cevaptan sonra kilit
export const AFTER = 2.5; // biri yanılınca soru öbürüne en çok bu kadar açık kalır
export const FUSE = [12, 25];
const N_ITEMS = 32;

// ---------------------------------------------------------------- tur motoru (istemci, sunucu ve judge aynı)

/**
 * Tur motoru. P: [oyuncu0, oyuncu1] ({ log } ya da { sheet }). adv(t): t anına kadar olan her şeyi işler (bot
 * cevapları, soru zaman aşımı, sonraki soru, patlama). act(p, k, c, t): oyuncu p, k. soruya c şıkkıyla t anında
 * cevap verir (geçersizse false). ev: olay listesi (arayüz okur).
 */
export function engine(v, P) {
	const n = v.items.length;
	const E = { t: 0, k: 0, open: true, qOpen: 0, qEnd: QMAX, nextOpen: 0, face: v.start ? 1 : 0, out: [false, false], lock: [0, 0], done: false, loser: -1, ev: [], score: [0, 0], wrong: [0, 0] };
	const sheetOf = (p) => {
		const s = P[p]?.sheet;
		return Array.isArray(s) && s.length ? s : null;
	};
	const due = (p) => {
		const s = sheetOf(p);
		if (!s || !E.open || E.out[p]) return Infinity;
		const a = s[E.k % s.length];
		if (!a || a[0] == null || !Number.isFinite(a[1])) return Infinity;
		return Math.max(E.qOpen + a[1], E.lock[p]);
	};
	const close = (t) => {
		E.open = false;
		E.nextOpen = t + GAP;
		E.ev.push({ type: 'close', k: E.k, t, face: E.face });
	};
	const answer = (p, c, t) => {
		const ok = c === v.items[E.k % n].right;
		if (ok) {
			E.score[p]++;
			E.face = 1 - p;
			E.ev.push({ type: 'ans', p, k: E.k, c, ok, t, face: E.face });
			return close(t);
		}
		E.wrong[p]++;
		E.face = p;
		E.out[p] = true;
		E.lock[p] = t + LOCK;
		E.qEnd = Math.min(E.qEnd, t + AFTER);
		E.ev.push({ type: 'ans', p, k: E.k, c, ok, t, face: E.face });
		if (E.out[1 - p]) close(t);
	};
	E.adv = (T) => {
		for (let guard = 0; guard < 10000 && !E.done; guard++) {
			let tn;
			let what;
			if (E.open) {
				const d0 = due(0);
				const d1 = due(1);
				const to = E.qEnd;
				tn = Math.min(d0, d1, to);
				what = tn === d0 ? 1 : tn === d1 ? 2 : 3;
			} else {
				tn = E.nextOpen;
				what = 4;
			}
			if (v.fuse <= tn && v.fuse <= T) {
				E.t = v.fuse;
				E.done = true;
				E.loser = E.face;
				E.ev.push({ type: 'boom', t: v.fuse, loser: E.face });
				return E;
			}
			if (tn > T) break;
			E.t = tn;
			if (what === 1 || what === 2) {
				const p = what - 1;
				const s = sheetOf(p);
				answer(p, s[E.k % s.length][0], tn);
			} else if (what === 3) close(tn);
			else {
				E.k++;
				E.open = true;
				E.qOpen = tn;
				E.qEnd = tn + QMAX;
				E.out[0] = E.out[1] = false;
				E.ev.push({ type: 'open', k: E.k, t: tn });
			}
		}
		if (!E.done) E.t = Math.max(E.t, T);
		return E;
	};
	E.act = (p, k, c, t) => {
		E.adv(t);
		if (E.done || !E.open || k !== E.k || E.out[p] || t < E.lock[p] || (c !== 0 && c !== 1)) return false;
		answer(p, c, t);
		return true;
	};
	E.ev.push({ type: 'open', k: 0, t: 0 });
	return E;
}

/** Değerden turu yeniden oynat: motor (bitmiş) ya da geçersizse null. */
export function replay(v, value) {
	if (!value || (value.side !== 0 && value.side !== 1) || !value.me || !value.vs || !Number.isFinite(v?.fuse)) return null;
	const P = [];
	P[value.side] = value.me;
	P[1 - value.side] = value.vs;
	const E = engine(v, P);
	const logs = [];
	for (let p = 0; p < 2; p++)
		for (const a of Array.isArray(P[p].log) ? P[p].log : []) if (Array.isArray(a) && Number.isFinite(a[2]) && a[2] >= 0) logs.push([p, a[0], a[1], a[2]]);
	logs.sort((x, y) => x[3] - y[3]);
	for (const [p, k, c, t] of logs) E.act(p, k, c, t);
	E.adv(v.fuse);
	return E;
}

/** Botun planı: her mini soru için [şık, tepki sn] (bilgi ve hız beceriyle artar). */
export function sheetFor(v, skill, R) {
	return v.items.map((it) => {
		const p = Math.min(0.96, pCorrect(skill, it.d) + 0.14);
		const ok = R() < p;
		const rt = 0.85 + (1 - clamp(skill, 0, 1)) * 1.4 + R() * 1.1 + (it.t === 'hilo' ? 0.35 : 0);
		return [ok ? it.right : 1 - it.right, Math.round(rt * 100) / 100];
	});
}

// ---------------------------------------------------------------- mini sorular (bankadan)

const len = (s) => [...String(s)].length;
let POOL = null;
function pool() {
	if (POOL) return POOL;
	POOL = BANK.filter((q) => {
		if (q.type === 'tf') return typeof q.ans === 'boolean' && len(q.q) <= 82;
		if (q.type === 'hilo') return q.left && q.right && len(q.q) <= 48 && len(q.left.t) <= 18 && len(q.right.t) <= 18 && q.left.v !== q.right.v;
		return false;
	});
	return POOL;
}

function pickItems(q, R) {
	const all = pool();
	const maxD = clamp(Number(q.diff) || 2, 1, 3);
	let list = all.filter((x) => (q.pool && q.pool !== 'karisik' ? x.cat === q.pool : true) && (x.diff || 2) <= maxD);
	if (list.length < N_ITEMS) list = all.filter((x) => (x.diff || 2) <= maxD);
	if (list.length < N_ITEMS) list = all;
	return shuffle(list, R)
		.slice(0, N_ITEMS)
		.map((x) => {
			if (x.type === 'tf') return { t: 'tf', q: x.q, o: ['DOĞRU', 'YANLIŞ'], right: x.ans ? 0 : 1, d: x.diff || 2 };
			const flip = R() < 0.5;
			const s = flip ? [x.right, x.left] : [x.left, x.right];
			return { t: 'hilo', q: x.q, o: [s[0].t, s[1].t], right: s[0].v > s[1].v ? 0 : 1, d: x.diff || 2 };
		});
}

// ---------------------------------------------------------------- görünüm

const FUSE_D = 'M60 30 C60 16 70 8 82 10 C94 12 96 26 106 24 C113 22 114 12 112 6';
let UID = 0;

const CSS = /* css */ `
.fl-q.dn-fz-card .fl-clock,.fl-q.dn-fz-card .fl-tbar{visibility:hidden}
.fl-q.dn-fz-card.dn-boom .fl-qc{animation:dnFzShake .7s cubic-bezier(.36,.07,.19,.97) both}
.dn-fz{display:flex;flex-direction:column;gap:8px;--red:#ff4a2a}
.dn-fz-ar{position:relative;height:142px;border-radius:18px;overflow:hidden;background:radial-gradient(120% 90% at 50% 100%,#2a1a3a 0,#120c22 55%,#0a0816 100%);border:2px solid rgba(255,255,255,.12);box-shadow:inset 0 -18px 30px rgba(0,0,0,.45)}
.dn-fz-ar::before{content:'';position:absolute;inset:0;background:radial-gradient(60% 70% at var(--hx,50%) 70%,rgba(255,120,40,.0),rgba(255,120,40,0));transition:background .5s}
.dn-fz.warm .dn-fz-ar::before{background:radial-gradient(55% 75% at var(--hx,50%) 72%,rgba(255,120,40,.28),rgba(255,120,40,0))}
.dn-fz.danger .dn-fz-ar{animation:dnFzDanger .55s ease-in-out infinite alternate}
.dn-fz-fl{position:absolute;left:12px;right:12px;bottom:16px;height:6px;border-radius:4px;background:linear-gradient(90deg,var(--ca) 0 50%,var(--cb) 50%);opacity:.35}
.dn-fz-pl{position:absolute;bottom:10px;width:78px;display:flex;flex-direction:column;align-items:center;gap:3px;transition:transform .3s}
.dn-fz-pl.a{left:6px}.dn-fz-pl.b{right:6px}
.dn-fz-pl i{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-family:'Lilita One';font-size:22px;color:#fff;background:var(--pc);border:3px solid #fff;box-shadow:0 3px 0 rgba(0,0,0,.4);transition:box-shadow .3s,filter .3s}
.dn-fz-pl b{max-width:78px;font-family:'Fredoka';font-weight:600;font-size:12.5px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dn-fz-pl small{font-family:'Lilita One';font-size:11px;letter-spacing:.06em;color:#ffb4a0;opacity:0;transform:translateY(3px);transition:opacity .25s,transform .25s}
.dn-fz-pl.hot i{box-shadow:0 0 0 3px var(--red),0 0 18px rgba(255,80,40,.85),0 3px 0 rgba(0,0,0,.4);animation:dnFzHot .5s ease-in-out infinite alternate}
.dn-fz-pl.hot small{opacity:1;transform:none}
.dn-fz-pl.burnt i{background:#1a1414;filter:grayscale(1) brightness(.55);box-shadow:0 0 0 3px #3a2a2a,0 3px 0 rgba(0,0,0,.4);animation:none}
.dn-fz-pl.burnt small{opacity:1;color:#ff6a4a}
.dn-fz-pl.win i{box-shadow:0 0 0 3px #ffd25a,0 0 22px rgba(255,210,90,.9),0 3px 0 rgba(0,0,0,.4);animation:none}
.dn-fz-pl.win small{opacity:1;color:#ffd25a}
.dn-fz-bomb{position:absolute;left:50%;top:6px;width:120px;height:120px;margin-left:-60px;transform:translateX(var(--bx,0px));transition:transform .55s cubic-bezier(.3,1.5,.45,1)}
.dn-fz-bomb>div{position:absolute;inset:0;transform-origin:60px 112px;transform:rotate(var(--br,0deg));transition:transform .55s cubic-bezier(.3,1.7,.45,1)}
.dn-fz-bomb svg{position:absolute;inset:0;width:120px;height:120px;overflow:visible}
.dn-fz-body{transform-origin:60px 74px}
.dn-fz.warm .dn-fz-body{animation:dnFzBeat 1s ease-in-out infinite}
.dn-fz.danger .dn-fz-body{animation-duration:.42s}
.dn-fz-heat{opacity:0;transition:opacity .6s}
.dn-fz.warm .dn-fz-heat{opacity:.35}
.dn-fz.danger .dn-fz-heat{animation:dnFzHeat .42s ease-in-out infinite alternate}
.dn-fz-burn{stroke-dasharray:var(--L) var(--L);stroke-dashoffset:0}
.dn-fz.run .dn-fz-burn{animation:dnFzBurn var(--F) linear forwards}
.dn-fz-sp{position:absolute;left:0;top:0;width:0;height:0;offset-path:path('${FUSE_D}');offset-distance:100%;offset-rotate:0deg}
.dn-fz.run .dn-fz-sp{animation:dnFzSpark var(--F) linear forwards}
.fl-q.locked .dn-fz-burn,.fl-q.locked .dn-fz-sp{animation-play-state:paused}
.dn-fz-sp b{position:absolute;left:-15px;top:-15px;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle,#fff 0 14%,#ffe27a 24%,rgba(255,150,40,.75) 42%,rgba(255,90,20,0) 70%);animation:dnFzFlick .09s steps(2) infinite alternate}
.dn-fz-sp s{position:absolute;left:-9px;top:-9px;width:18px;height:18px;background:#fff6c8;clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%);animation:dnFzStar .35s linear infinite}
.dn-fz-sp i{position:absolute;left:-2px;top:-2px;width:4px;height:4px;border-radius:50%;background:#ffd35a;box-shadow:0 0 6px #ff9a2a;animation:dnFzEmber .7s ease-out infinite;animation-delay:calc(var(--k) * -.09s)}
.dn-fz-ar.boom .dn-fz-bomb{transition:none}
.dn-fz-ar.boom .dn-fz-bomb>div{animation:dnFzPop .35s ease-in forwards}
.dn-fz-ar.boom .dn-fz-sp{display:none}
.dn-fz-ring{position:absolute;left:50%;top:76px;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;border:6px solid #ffd25a;opacity:0;pointer-events:none}
.dn-fz-ar.boom .dn-fz-ring{animation:dnFzRing .6s ease-out forwards}
.dn-fz-ar .boomt{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.3);font-family:'Lilita One';font-size:46px;color:#ffd25a;-webkit-text-stroke:3px #6a1a00;text-shadow:0 5px 0 #6a1a00;opacity:0;pointer-events:none;letter-spacing:.02em}
.dn-fz-ar.boom .boomt{animation:dnFzBoomT 1s .08s cubic-bezier(.3,1.7,.5,1) forwards}
.dn-fz-tag{position:absolute;left:50%;top:6px;transform:translateX(-50%);padding:2px 10px;border-radius:9px;font-family:'Lilita One';font-size:11px;letter-spacing:.1em;color:#ffd0c0;background:rgba(255,60,30,.22);border:1.5px solid rgba(255,90,60,.6);opacity:0;transition:opacity .3s}
.dn-fz.danger .dn-fz-tag{opacity:1;animation:dnFzBlink .42s steps(2) infinite}
.dn-fz-q{position:relative;display:flex;flex-direction:column;gap:7px}
.dn-fz-qt{position:relative;display:flex;align-items:center;gap:8px;min-height:44px;padding:6px 10px;border-radius:12px;background:rgba(0,0,0,.28);font-size:clamp(14.5px,calc(4 * var(--vw,4px)),17px);line-height:1.2}
.dn-fz-qt em{flex:none;font-style:normal;font-family:'Lilita One';font-size:11px;letter-spacing:.08em;padding:2px 6px;border-radius:6px;background:var(--gold);color:#3a2000}
.dn-fz-qt.in{animation:dnFzIn .32s cubic-bezier(.3,1.4,.5,1)}
.dn-fz-o{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dn-fz-o .fl-opt{justify-content:center;text-align:center;min-height:52px;font-family:'Lilita One';font-weight:400;letter-spacing:.02em;font-size:clamp(15px,calc(4.4 * var(--vw,4px)),19px);padding:6px 8px}
.dn-fz-o .fl-opt.ok{background:linear-gradient(180deg,#b8ffc8,#58d878);border-color:#2fa84a;color:#0a3a14}
.dn-fz-o .fl-opt.no{background:linear-gradient(180deg,#ffc8bc,#ff7a62);border-color:#d83a20;color:#4a0a00;animation:flq-shake .38s}
.dn-fz-o .fl-opt.dim{opacity:.45}
.dn-fz-o .fl-opt .fw{position:absolute;right:-6px;top:-9px;padding:1px 6px;border-radius:8px;font-family:'Fredoka';font-weight:600;font-size:11px;color:#fff;background:var(--pc);border:2px solid #fff;animation:flPopIn .3s cubic-bezier(.3,1.8,.5,1) both}
.dn-fz-lk{position:absolute;inset:auto 0 0 0;height:52px;display:grid;place-items:center;border-radius:14px;background:rgba(10,12,30,.72);font-family:'Lilita One';font-size:15px;letter-spacing:.06em;color:#ffb4a0;opacity:0;pointer-events:none;transition:opacity .15s}
.dn-fz-lk.on{opacity:1;pointer-events:auto}
.dn-fz-lk u{position:absolute;left:10px;right:10px;bottom:6px;height:4px;border-radius:3px;background:#ff6a4a;transform-origin:0 50%;text-decoration:none}
.dn-fz-lk.on u{animation:dnShrink .8s linear forwards}
.dn-fz-res{display:flex;justify-content:center;gap:10px;font-size:13px;color:#cfe0ff}
.dn-fz-res b{font-family:'Lilita One';font-weight:400;color:#fff}
.dn-fz-flash{position:absolute;inset:0;pointer-events:none;z-index:40;background:radial-gradient(circle at var(--fx,50%) var(--fy,40%),#fff 0,#ffe08a 18%,rgba(255,120,40,.55) 40%,rgba(255,60,20,0) 75%);animation:dnFzFlash .75s ease-out forwards}
@keyframes dnFzBurn{to{stroke-dashoffset:var(--L)}}
@keyframes dnFzSpark{from{offset-distance:100%}to{offset-distance:0%}}
@keyframes dnFzFlick{from{transform:scale(.85);opacity:.85}to{transform:scale(1.15);opacity:1}}
@keyframes dnFzStar{to{transform:rotate(360deg)}}
@keyframes dnFzEmber{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(calc(var(--dx) * 1px),calc(var(--dy) * 1px)) scale(.2);opacity:0}}
@keyframes dnFzBeat{0%,100%{transform:scale(1)}40%{transform:scale(1.07)}60%{transform:scale(.98)}}
@keyframes dnFzHeat{from{opacity:.3}to{opacity:.85}}
@keyframes dnFzHot{from{transform:translateY(0)}to{transform:translateY(-3px)}}
@keyframes dnFzDanger{from{box-shadow:inset 0 -18px 30px rgba(0,0,0,.45),inset 0 0 0 0 rgba(255,60,30,0)}to{box-shadow:inset 0 -18px 30px rgba(0,0,0,.45),inset 0 0 26px 4px rgba(255,60,30,.55)}}
@keyframes dnFzBlink{50%{opacity:.35}}
@keyframes dnFzPop{0%{transform:scale(1)}60%{transform:scale(1.35);filter:brightness(3)}100%{transform:scale(1.9);opacity:0;filter:brightness(4)}}
@keyframes dnFzRing{0%{transform:scale(.4);opacity:1;border-width:10px}100%{transform:scale(7);opacity:0;border-width:1px}}
@keyframes dnFzBoomT{0%{opacity:0;transform:translate(-50%,-50%) scale(.3) rotate(-8deg)}35%{opacity:1;transform:translate(-50%,-50%) scale(1.15) rotate(-4deg)}100%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(-4deg)}}
@keyframes dnFzIn{from{transform:translateX(26px);opacity:0}to{transform:none;opacity:1}}
@keyframes dnFzFlash{0%{opacity:1}100%{opacity:0}}
@keyframes dnFzShake{10%,90%{transform:translate(-2px,1px)}20%,80%{transform:translate(5px,-3px) rotate(.6deg)}30%,50%,70%{transform:translate(-9px,4px) rotate(-1deg)}40%,60%{transform:translate(9px,-4px) rotate(1deg)}}
@keyframes dnShrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}
`;

function bombSVG(id) {
	return `<svg viewBox="0 0 120 120">
		<defs>
			<radialGradient id="dnfzg${id}" cx="38%" cy="32%" r="72%"><stop offset="0" stop-color="#6c7896"/><stop offset=".35" stop-color="#2a3044"/><stop offset="1" stop-color="#05070e"/></radialGradient>
			<radialGradient id="dnfzh${id}" cx="50%" cy="55%" r="60%"><stop offset="0" stop-color="#ff7a2a"/><stop offset="1" stop-color="#ff2a10" stop-opacity="0"/></radialGradient>
			<linearGradient id="dnfzc${id}" x1="0" x2="1"><stop offset="0" stop-color="#3a3f4e"/><stop offset=".45" stop-color="#9aa3b8"/><stop offset="1" stop-color="#2a2e3a"/></linearGradient>
			<mask id="dnfzm${id}" maskUnits="userSpaceOnUse" x="0" y="-10" width="130" height="60"><path class="dn-fz-burn" d="${FUSE_D}" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/></mask>
		</defs>
		<ellipse cx="60" cy="114" rx="34" ry="5" fill="rgba(0,0,0,.45)"/>
		<path d="${FUSE_D}" fill="none" stroke="#2a1c12" stroke-width="2" stroke-linecap="round" opacity=".7"/>
		<g mask="url(#dnfzm${id})">
			<path d="${FUSE_D}" fill="none" stroke="#d8b27a" stroke-width="5.5" stroke-linecap="round"/>
			<path d="${FUSE_D}" fill="none" stroke="#8a6234" stroke-width="5.5" stroke-dasharray="2.2 3" opacity=".8"/>
			<path d="${FUSE_D}" fill="none" stroke="#ff5a2a" stroke-width="5.5" stroke-dasharray="var(--D) 999" opacity=".55"/>
		</g>
		<g class="dn-fz-body">
			<circle cx="60" cy="74" r="40" fill="url(#dnfzg${id})" stroke="#000" stroke-width="2.5"/>
			<circle class="dn-fz-heat" cx="60" cy="74" r="40" fill="url(#dnfzh${id})"/>
			<ellipse cx="45" cy="56" rx="13" ry="8" fill="#fff" opacity=".28" transform="rotate(-30 45 56)"/>
			<ellipse cx="41" cy="53" rx="4.5" ry="2.6" fill="#fff" opacity=".75" transform="rotate(-30 41 53)"/>
			<rect x="49" y="27" width="22" height="12" rx="3" fill="url(#dnfzc${id})" stroke="#000" stroke-width="2"/>
			<path d="M33 92 Q60 108 87 92" fill="none" stroke="#000" stroke-width="2" opacity=".35"/>
		</g>
	</svg>`;
}

const EMBERS = [
	[-18, -22],
	[14, -26],
	[24, -8],
	[-24, -4],
	[6, -30],
	[-10, -28],
	[20, 10],
	[-16, 12],
];

export const fitil = {
	time: 30,
	label: 'Fitil',
	kind: 'exact',
	jokers: [], // yarı yarıya ve seyirci yok (iki şıklı, saniyelik sorular); süre ve kalkan tur boyunca anlamsız değil ama etkisiz
	prepare(q, R) {
		const items = pickItems(q, R);
		const fuse = Math.round((FUSE[0] + R() * (FUSE[1] - FUSE[0])) * 10) / 10;
		const v = { q, items, fuse, start: R() < 0.5 ? 0 : 1 };
		return stamp(v, q, () => ({ wait: 0.5 + (FUSE[0] + FUSE[1]) / 2, look: LOOK.orient + LOOK.gaze, act: 10 * 0.75 }));
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('fitil', CSS);
		const app = appOf();
		const card = el.closest('.fl-q');
		card?.classList.add('dn-fz-card');
		// rakip: galeri ve maçta sorunun bot kaydı (planı kartta oynanır); yoksa yerel bir bot
		const cur = app?.match?.cur;
		const botE = cur?.bots?.[0];
		const foe = botE?.p || { name: 'Rakip', css: '#e04a3a' };
		const me = cur?.who?.find((p) => p !== botE?.p) || { name: 'Sen', css: '#2f8cff' };
		const foeSpec = botE?.value?.me?.sheet ? { sheet: botE.value.me.sheet } : { sheet: sheetFor(v, 0.6, Math.random) };
		const id = ++UID;
		const L = 84.2; // fitil yolunun boyu (FUSE_D, birim)
		const F = FUSE[1];
		el.innerHTML = `<div class="dn-fz" style="--L:${L};--F:${F}s;--D:${((L * (F - FUSE[0])) / F).toFixed(1)}">
			<div class="dn-fz-ar" style="--ca:${esc(me.css)};--cb:${esc(foe.css)}">
				<div class="dn-fz-fl"></div>
				<div class="dn-fz-tag">HER AN PATLAYABİLİR</div>
				<div class="dn-fz-pl a" style="--pc:${esc(me.css)}"><small>TOP SENDE!</small><i>${esc([...String(me.name)][0] || '?')}</i><b>${esc(me.name)}</b></div>
				<div class="dn-fz-pl b" style="--pc:${esc(foe.css)}"><small>TOP ONDA</small><i>${esc([...String(foe.name)][0] || '?')}</i><b>${esc(foe.name)}</b></div>
				<div class="dn-fz-bomb"><div>${bombSVG(id)}<span class="dn-fz-sp"><b></b><s></s>${EMBERS.map(([dx, dy], k) => `<i style="--k:${k};--dx:${dx};--dy:${dy}"></i>`).join('')}</span></div></div>
				<div class="dn-fz-ring"></div><div class="boomt">BOOM!</div>
			</div>
			<div class="dn-fz-q">
				<div class="dn-fz-qt"></div>
				<div class="dn-fz-o"><button class="fl-opt" data-i="0"></button><button class="fl-opt" data-i="1"></button></div>
				<div class="dn-fz-lk"><span>KİLİT</span><u></u></div>
			</div>
			<div class="dn-fz-res"><span>Doğru: <b data-r="s0">0</b></span><span>Rakip: <b data-r="s1">0</b></span></div>
		</div>`;
		const root = el.firstElementChild;
		const ar = root.querySelector('.dn-fz-ar');
		const bomb = root.querySelector('.dn-fz-bomb');
		const plA = root.querySelector('.dn-fz-pl.a');
		const plB = root.querySelector('.dn-fz-pl.b');
		const qt = root.querySelector('.dn-fz-qt');
		const btns = [...root.querySelectorAll('.dn-fz-o .fl-opt')];
		const lk = root.querySelector('.dn-fz-lk');
		const s0 = root.querySelector('[data-r=s0]');
		const s1 = root.querySelector('[data-r=s1]');
		const log = [];
		const E = engine(v, [{ log }, foeSpec]);
		let seen = 0;
		let t0 = 0;
		let raf = 0;
		let shown = -1;
		let face = -1;
		let stage = 0;
		let nextTick = 0;
		let over = false;
		let lockT = 0;
		const timers = [];
		const later = (fn, ms) => timers.push(setTimeout(fn, ms));
		const now = () => (clock.now() - t0) / 1000;
		const setFace = (f) => {
			if (f === face) return;
			const first = face < 0;
			face = f;
			bomb.style.setProperty('--bx', f === 0 ? '-58px' : '58px');
			bomb.firstElementChild.style.setProperty('--br', f === 0 ? '-14deg' : '14deg');
			ar.style.setProperty('--hx', f === 0 ? '24%' : '76%');
			plA.classList.toggle('hot', f === 0);
			plB.classList.toggle('hot', f === 1);
			if (!first) {
				sfx(app, f === 0 ? 'sabotage' : 'whoosh');
				if (f === 0) buzz(18);
			}
		};
		const show = (k) => {
			if (k === shown) return;
			shown = k;
			const it = v.items[k % v.items.length];
			qt.innerHTML = `<em>${it.t === 'tf' ? 'DOĞRU MU?' : 'HANGİSİ?'}</em><span>${esc(it.q)}</span>`;
			qt.classList.remove('in');
			void qt.offsetWidth;
			qt.classList.add('in');
			btns.forEach((b, i) => {
				b.className = 'fl-opt';
				b.disabled = false;
				b.textContent = it.o[i];
			});
		};
		const lockUI = (until) => {
			lockT = until;
			lk.classList.remove('on');
			void lk.offsetWidth;
			lk.classList.add('on');
			later(() => lk.classList.remove('on'), LOCK * 1000);
		};
		const handle = (e) => {
			if (e.type === 'open') show(e.k);
			else if (e.type === 'ans') {
				const b = btns[e.c];
				if (e.p === 0) {
					b.classList.add(e.ok ? 'ok' : 'no');
					if (e.ok) {
						sfx(app, 'right');
						buzz(10);
						btns[1 - e.c].classList.add('dim');
					} else {
						sfx(app, 'wrong');
						buzz([30, 30, 30]);
						btns.forEach((x) => (x.disabled = true));
						lockUI(e.t + LOCK);
					}
				} else {
					// rakip: doğruysa şık yeşillenir (soru kapandı); yanlışsa yalnız "yanıldı" (hangi şık olduğu söylenmez)
					const tagB = e.ok ? b : qt;
					tagB.insertAdjacentHTML('beforeend', `<span class="fw" style="--pc:${esc(foe.css)}">${esc(foe.name)} ${e.ok ? '✓' : '✗'}</span>`);
					if (e.ok) {
						b.classList.add('ok');
						btns[1 - e.c].classList.add('dim');
					}
					sfx(app, e.ok ? 'tap' : 'star');
				}
				s0.textContent = String(E.score[0]);
				s1.textContent = String(E.score[1]);
				setFace(e.face);
			} else if (e.type === 'close') {
				const it = v.items[e.k % v.items.length];
				btns.forEach((b) => (b.disabled = true));
				if (!btns[it.right].classList.contains('ok')) btns[it.right].classList.add('ok');
				setFace(e.face);
			} else if (e.type === 'boom') boom(e.loser);
		};
		const boom = (loser) => {
			if (over) return;
			over = true;
			cancelAnimationFrame(raf);
			btns.forEach((b) => (b.disabled = true));
			lk.classList.remove('on');
			root.classList.remove('run');
			ar.classList.add('boom');
			card?.classList.add('dn-boom');
			(loser === 0 ? plA : plB).classList.add('burnt');
			(loser === 0 ? plA : plB).querySelector('small').textContent = 'YANDI!';
			(loser === 0 ? plB : plA).classList.add('win');
			(loser === 0 ? plB : plA).classList.remove('hot');
			(loser === 0 ? plB : plA).querySelector('small').textContent = 'KURTULDU';
			// patlama: ekran parlaması, kıvılcım ve duman, sarsıntı (harita da sarsılır), titreşim
			const host = app?.ui?.el || document.body;
			const r = bomb.getBoundingClientRect();
			const u = host.getBoundingClientRect();
			const cx = r.left + r.width / 2;
			const cy = r.top + r.height * 0.62;
			const fl = document.createElement('div');
			fl.className = 'dn-fz-flash';
			fl.style.setProperty('--fx', ((cx - u.left) / Math.max(1, u.width)) * 100 + '%');
			fl.style.setProperty('--fy', ((cy - u.top) / Math.max(1, u.height)) * 100 + '%');
			host.appendChild(fl);
			setTimeout(() => fl.remove(), 800);
			const fx = app?.ui?.fx;
			fx?.burst(cx, cy, { n: 36, dist: 190, colors: ['#fff6c8', '#ffd25a', '#ff8a2a', '#ff3a1a'], kind: 'spark', size: 14, life: 900 });
			fx?.burst(cx, cy, { n: 14, dist: 120, colors: ['#3a3440', '#5a5260', '#2a2430'], size: 22, life: 1300, up: 40 });
			app?.cam?.impulse?.(1);
			sfx(app, 'catapult');
			sfx(app, 'crumble');
			buzz([90, 40, 160]);
			later(() => card?.classList.remove('dn-boom'), 800);
			const value = { side: 0, me: { log: log.slice() }, vs: foeSpec };
			// botun kaydı da aynı turla (galeri/maç sonucu iki taraf için tutarlı)
			if (botE) {
				botE.value = { side: 1, me: foeSpec, vs: { log: log.slice() } };
				botE.time = Math.min(v.sec || 30, v.fuse + 0.2);
			}
			later(() => api.answer(value), 650);
		};
		const frame = () => {
			if (!el.isConnected || over) return;
			const t = now();
			E.adv(t);
			while (seen < E.ev.length && !over) handle(E.ev[seen++]);
			if (over) return;
			// gerilim: 8. sn ısınır, 12. sn'den sonra (en erken patlama) her an patlayabilir; tik sıklaşır
			if (stage < 1 && t >= 8) {
				stage = 1;
				root.classList.add('warm');
			}
			if (stage < 2 && t >= FUSE[0]) {
				stage = 2;
				root.classList.add('danger');
				sfx(app, 'cue');
			}
			if (t >= nextTick) {
				sfx(app, 'tick');
				if (stage === 2) buzz(5);
				nextTick = t + (stage === 2 ? Math.max(0.24, 0.5 - (t - FUSE[0]) * 0.025) : stage === 1 ? 0.7 : 1);
			}
			raf = requestAnimationFrame(frame);
		};
		btns.forEach((b, i) =>
			b.addEventListener('click', () => {
				if (over || !t0 || b.disabled) return;
				const t = now();
				if (t < lockT) return;
				const k = E.k;
				if (E.act(0, k, i, t)) {
					log.push([k, i, t]); // motorun oynadığı anın aynısı (yargı yeniden oynatınca aynı sonuç)
					while (seen < E.ev.length && !over) handle(E.ev[seen++]);
				}
			}),
		);
		setFace(v.start ? 1 : 0);
		show(0);
		btns.forEach((b) => (b.disabled = true));
		const stopOpen = onOpen(el, () => {
			t0 = clock.now();
			btns.forEach((b) => (b.disabled = false));
			root.classList.add('run');
			sfx(app, 'whoosh');
			raf = requestAnimationFrame(frame);
		});
		const close = onClose(el, () => {
			stopOpen();
			cancelAnimationFrame(raf);
			for (const t of timers) clearTimeout(t);
			card?.classList.remove('dn-fz-card', 'dn-boom');
		});
		return {
			lock() {
				btns.forEach((b) => (b.disabled = true));
			},
			value: () => ({ side: 0, me: { log: log.slice() }, vs: foeSpec }),
			reveal(results) {
				const meR = results.find((r) => r.p?.human);
				if (!meR) return;
				const Er = replay(v, meR.value);
				const n = Er ? Er.score[meR.value.side] : 0;
				stampLater(app, meR.correct ? 'KURTULDUN!' : 'PATLADI!', meR.correct ? 'gold' : 'bad', `${n} doğru · fitil ${String(v.fuse).replace('.', ',')} sn yandı`);
			},
			destroy: close,
		};
	},
	/** Çevrimiçi görünüm: fitilin süresi ve mini soruların cevapları sunucuda. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.fuse;
		for (const it of o.items) delete it.right;
		return o;
	},
	/** Sınama yardımcısı: her soruyu 1 sn'de bilen oyuncu (kazanır) ve hiç basmayan (bilen rakibe karşı kaybeder). */
	probe(v) {
		const all = { sheet: v.items.map((it) => [it.right, 1]) };
		return { good: { side: 0, me: all, vs: { sheet: v.items.map((it) => [1 - it.right, 2.5]) } }, bad: { side: 0, me: { sheet: [] }, vs: all } };
	},
	judge(v, value) {
		const E = replay(v, value);
		if (!E) return { correct: false, err: 1 };
		const ok = E.loser !== value.side;
		return { correct: ok, err: ok ? 0 : 1, score: E.score[value.side] };
	},
	fmt(v, value) {
		const E = replay(v, value);
		return E ? (E.loser === value.side ? 'patladı' : 'kurtuldu') : '—';
	},
	sub(v, value) {
		const E = replay(v, value);
		return E ? `${E.score[value.side]} doğru` : '';
	},
	bot(v, skill, R) {
		// botun planı: her mini soruya bilgi ve hızına göre cevap; turu sıradan bir rakibe karşı oynar (galeri ve maç
		// kartı rakibin gerçek dokunuşlarıyla günceller)
		const sheet = sheetFor(v, skill, R);
		const vs = sheetFor(v, 0.55, R);
		return { value: { side: 1, me: { sheet }, vs: { sheet: vs } }, time: Math.min((v.sec || 30) - 0.1, v.fuse + 0.2) };
	},
};
