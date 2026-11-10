// MAYIN TARLASI (yeni · grup 3): kamera 10–16 illik bir bölgeyi çerçeveler; tarla gecede, yalnız tarladaki iller ışıkta
// ve adlarıyla. Kural kartta yazar ("Ankara’ya komşu illere bas"), kurala uymayan her il mayın. Oyuncu haritada illere
// dokunur: güvenli il dokunduğu yerden oyuncunun rengine boyanır, kalkar, bayrak dikilir, sayaç "3/7" atar. Mayın patlar:
// ateş topu, yere yayılan şok halkası, duman, kıvılcım, kamera sarsılır, il kömür karası olur ve çöker, kart kızarır,
// bir can kırılır. İki can var: ikinci mayında tarla kapanır (ilk mayın parmak kayması olabilir, ikincisi değil).
//
// Puan (tür 'closest'): bulunan güvenli il sayısı (kısmi puan); eşitlikte az mayın, sonra erken bitiren.
//   err = −güvenli + 0,25 · mayın (iki mayın bir ilden azdır: il sayısı hep önce gelir); correct = tarla temiz.
// Cevap: mayınlar sırayla belirir (patlatılanlar kıvılcım yıldızıyla ve basanların renginde noktalarla), mayınlı iller
// karanlığa çöker, güvenli iller altın hatla ışıkta kalır; her güvenli ilde onu bulan oyuncuların bayrakları yan yana.
// Kartta her oyuncunun portresi, adı, bulduğu il ve bastığı mayın. Damga kartın soru satırında (harita cevabın kendisi).
//
// Veri: q (güvenli illerin kuralı), mayin (mayınların kuralı, kartın ikaz bandında), alan: [plaka…] (tarla; merkez
//       hariç), guvenli: [plaka…] (elle yazılır ve sınamada veriden doğrulanır: komşuluk, kıyı, plaka), merkez?: plaka
//       (kuralın dayandığı il: altın, tarlada değil), not?: cevapta ikaz bandına gelen bir cümle.
// Değer: { taps: [plaka, …] } (sırayla; sunucu yargıyı bundan kurar: ikinci mayından sonraki dokunuşlar sayılmaz).
// Çevrimiçi: publicView güvenli illeri taşımaz; her dokunuşu sunucu yanıtlar (act 'il' → ev { plaka, mayin }).
// Joker: yarı yarıya → mayın dedektörü: iki mayının üstünde sarı ikaz üçgeni.
// Seçim kolaylığı: kamera tarlayı daha yakından ve geniş çerçeveler, tarla illerinin beyaz dış hattı tam güçte. Dokunuş tam
// bir tarla ilinin üstünde değilse küçük bir yarıçapta (ekranın ~%5'i) en yakın tarla iline gider; fare üzerine gelince ve
// parmak basınca il kalkar ve parlak hatla çizilir.

import { css, esc, shuffle, pCorrect, clamp, buzz } from './util.js';
import { botTime } from './timing.js';
import { jokersOff } from './t_pick.js';
import { appOf, stamp, guard, onClose, onOpen, cardTop, pop, sfx, rule, stampLater, LOOK, ACT, DENEME_CSS } from './d_ortak.js';
import { setTimeout, clearTimeout } from '../core/clock.js';
import { katman, adlar, el as sv, CHECK, damga, damgaYeri, sigdir, cerceve, DAMGA_CSS } from './d_rota_katman.js';
import { setNightTone } from '../gfx/env.js';
import DATA from '../data/turkiye.json';

const PROV = DATA.provinces;
const BY_ID = new Map(PROV.map((p, i) => [p.id, i]));
/** Can sayısı: ikinci mayında tarla kapanır. */
export const CAN = 2;
const SCORCH = '#3a0d07'; // patlayan il: kömür karası, közlü kırmızı
const MISS = '#ece2c2'; // cevap: kimsenin (sen) bulamadığı güvenli il
const GOLD = '#ffd25a';
const FIRE = ['#fff6c8', '#ffd25a', '#ff9a2a', '#ff5a1f', '#c2200f', '#4a3a32'];

/** Dokunuşlardan sonuç (sunucu da aynı hesabı yapar): ok (güvenli il dizinleri), boom (mayın dizinleri), dead, all. */
export function sonuc(v, taps) {
	const G = Array.isArray(v.guvenli) ? v.guvenli : []; // çevrimiçi görünümde yok (cevapla gelir)
	const F = new Set(v.alan);
	const S = new Set(G);
	const seen = new Set();
	const ok = [];
	const boom = [];
	for (const id of Array.isArray(taps) ? taps : []) {
		const i = BY_ID.get(id);
		if (i == null || !F.has(i) || seen.has(i)) continue;
		seen.add(i);
		if (S.has(i)) ok.push(i);
		else {
			boom.push(i);
			if (boom.length >= CAN) break;
		}
	}
	return { ok, boom, dead: boom.length >= CAN, all: G.length > 0 && ok.length === G.length };
}

// ---------------------------------------------------------------- çizimler (SVG; yazı yok)
/** Kapalı mayın (24 px): dikenli kara küre, parlama, kırmızı ışık. */
const MINE = (cls = '') =>
	`<g class="mn ${cls}">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M0 -6.2V-10.6" transform="rotate(${a})" class="sp"/>`).join('')}<circle r="7.4" class="bd"/><ellipse cx="-2.4" cy="-2.7" rx="2.3" ry="1.5" class="hl"/><rect x="-2.1" y="-10.4" width="4.2" height="2.6" rx=".8" class="cp"/><circle cy="-10.9" r="1.7" class="led"/></g>`;
/** Patlamış mayın: kıvılcım yıldızı ve çatlak küre. */
const STAR10 = (() => {
	let d = '';
	for (let k = 0; k < 20; k++) {
		const a = (k / 20) * Math.PI * 2 - Math.PI / 2;
		const r = k % 2 ? 6.2 : 14 - (k % 4) * 1.2;
		d += (k ? 'L' : 'M') + (Math.cos(a) * r).toFixed(1) + ' ' + (Math.sin(a) * r).toFixed(1);
	}
	return d + 'Z';
})();
const BOOMED = `<g class="mn bm"><path d="${STAR10}" class="st"/><path d="${STAR10}" transform="scale(.58)" class="st2"/><circle r="6" class="bd"/><path d="M-2.5 -3.6L-0.6 -0.8L-2.4 1.6L0.3 3.8M1.4 -4L0.6 -1.8L3 0.2" class="ck"/></g>`;
/** Bayrak: direk, dalgalanan flama (oyuncu rengi), gölge. */
const FLAG = (c, s = 1) =>
	`<g class="fg" transform="scale(${s})"><ellipse rx="5.5" ry="2.2" class="sh"/><path d="M0 0V-28" class="po"/><circle cy="-29.2" r="1.9" class="fi"/><path d="M0.6 -27.6C5.5 -26.4 9.6 -26.8 15.6 -24.2C10.4 -21.6 6.2 -20.8 0.6 -19.6Z" class="pn" style="fill:${c}"/></g>`;
/** Yarı yarıya: mayın dedektörünün ikaz üçgeni. */
const WARN = `<g class="wr"><path d="M0 -12L10.4 6H-10.4Z" class="tr"/><path d="M0 -5.6V0.6M0 3.4V3.6" class="ex"/></g>`;
/** Kartta (DOM): mayın simgesi ve can kalpleri. */
const MINE_ICO = `<svg class="ic" viewBox="-12 -12 24 24" aria-hidden="true">${MINE()}</svg>`;
const HEART = `<svg class="h" viewBox="0 0 24 22" aria-hidden="true"><path class="hb" d="M12 20.4s-8.4-5.3-8.4-11.4C3.6 5.6 6 3.4 8.9 3.4c1.5 0 2.5.7 3.1 1.6.6-.9 1.6-1.6 3.1-1.6 2.9 0 5.3 2.2 5.3 5.6 0 6.1-8.4 11.4-8.4 11.4z"/><path class="hk" d="M12.1 5.2l-1.7 3.6 2.6 2.1-2.1 3.7 1 2.4"/></svg>`;
const BOMB_MINI = `<svg viewBox="-12 -12 24 24" aria-hidden="true">${MINE()}</svg>`;

const CSS = /* css */ `
.yn-my{display:flex;flex-direction:column;gap:7px;container-type:inline-size}
/* ikaz bandı: sarı-siyah şerit, MAYIN rozeti ve mayınların kuralı */
.yn-my-tape{position:relative;display:flex;align-items:center;gap:8px;min-height:32px;padding:4px 14px 4px 19px;background:linear-gradient(90deg,#1a1408,#12141c 60%);
  box-shadow:inset 0 0 0 1.5px rgba(255,205,40,.5);clip-path:polygon(0 0,100% 0,calc(100% - 9px) 100%,0 100%);transition:background .3s}
.yn-my-tape::before{content:'';position:absolute;left:0;top:0;bottom:0;width:11px;background:repeating-linear-gradient(-45deg,#ffcf1a 0 5px,#16130a 5px 10px)}
.yn-my-tape .ic{flex:none;width:22px;height:22px;overflow:visible}
.yn-my-tape>b{flex:none;padding:2px 7px 1px;background:#ffcf1a;color:#16130a;font:italic 900 12.5px/1.15 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.14em;transform:skewX(-8deg)}
.yn-my-tape>span{min-width:0;font:600 13.5px/1.22 'Fredoka',sans-serif;color:#fff}
.yn-my.flash .yn-my-tape{animation:ynMyFlash .7s ease-out}
.yn-my.rv .yn-my-tape{background:linear-gradient(90deg,#08182e,#12141c 60%);box-shadow:inset 0 0 0 1.5px rgba(120,190,255,.45)}
.yn-my.rv .yn-my-tape::before{background:repeating-linear-gradient(-45deg,#6ab8ff 0 5px,#0a1426 5px 10px)}
.yn-my.rv .yn-my-tape>b{background:#6ab8ff;color:#06101f}
/* sayaç, güvenli il şeridi, canlar, BİTİR */
.yn-my-hud{position:relative;display:flex;align-items:center;gap:9px;min-height:46px}
.yn-my-hud .cnt{flex:none;display:flex;align-items:baseline;gap:2px;min-width:56px}
.yn-my-hud .cnt b{display:inline-block;font:400 34px/1 'Lilita One',sans-serif;color:${GOLD};text-shadow:0 3px 0 #3a2000}
.yn-my-hud .cnt b.pop{animation:ynMyPop .4s cubic-bezier(.3,1.8,.5,1)}
.yn-my-hud .cnt small{font:400 17px/1 'Lilita One',sans-serif;color:#cfe0ff}
.yn-my-hud .bar{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.yn-my-hud .bar small{font:italic 800 10.5px/1 'Barlow Condensed',sans-serif;letter-spacing:.2em;color:rgba(255,255,255,.6);white-space:nowrap}
.yn-my-hud .seg{display:flex;gap:3px;height:13px}
.yn-my-hud .seg i{flex:1;min-width:0;transform:skewX(-14deg);background:rgba(255,255,255,.12);box-shadow:inset 0 -2px 0 rgba(0,0,0,.3)}
.yn-my-hud .seg i.on{background:var(--pc);box-shadow:inset 0 -2px 0 rgba(0,0,0,.25),0 0 0 1.5px #fff;animation:ynMySeg .45s cubic-bezier(.3,1.8,.5,1)}
.yn-my-hud .can{flex:none;display:flex;gap:2px}
.yn-my-hud .h{width:25px;height:23px;overflow:visible}
.yn-my-hud .h .hb{fill:#ff3d5a;stroke:#fff;stroke-width:1.6;stroke-linejoin:round;transition:fill .3s}
.yn-my-hud .h .hk{fill:none;stroke:#1a0d12;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;opacity:0}
.yn-my-hud .h.off{animation:ynMyHeart .6s cubic-bezier(.3,1.6,.5,1) both}
.yn-my-hud .h.off .hb{fill:#3a3f52;stroke:rgba(255,255,255,.45)}
.yn-my-hud .h.off .hk{opacity:1}
.yn-my-hud .fl-send{flex:none;width:auto;min-width:80px;height:44px;padding:0 12px;font-size:17px}
.yn-my-hint{min-height:15px;font:600 12px/1.25 'Fredoka',sans-serif;color:#cfe0ff;text-align:center;opacity:.9;transition:color .2s}
.yn-my-hint.bad{color:#ff8f7a}
.yn-my.done .yn-my-hint,.yn-my.done .fl-send{visibility:hidden}
/* tarla kapandı: canlar bitti */
.yn-my-dead{position:absolute;inset:0;display:none;align-items:center;justify-content:center;gap:10px;background:linear-gradient(90deg,#7a0d06,#c2200f 50%,#7a0d06);clip-path:polygon(2% 0,100% 0,98% 100%,0 100%)}
.yn-my-dead b{font:italic 900 24px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.08em;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.4)}
.yn-my-dead svg{width:26px;height:26px;overflow:visible}
.yn-my.dead .yn-my-dead{display:flex;animation:ynMyPop .45s cubic-bezier(.3,1.7,.5,1)}
.yn-my.shk{animation:ynMyShk .45s}
/* cevap: oyuncu satırları (portre, ad, bulduğu il, mayın) */
.yn-my-sb{display:none;grid-template-columns:repeat(var(--c,2),minmax(0,1fr));gap:6px}
.yn-my.rv .yn-my-sb{display:grid}
.yn-my.rv .yn-my-hud,.yn-my.rv .yn-my-hint{display:none}
.yn-my-sb .r{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto auto;column-gap:7px;row-gap:3px;align-items:center;min-height:44px;padding:5px 8px 5px 5px;
  background:rgba(255,255,255,.06);box-shadow:inset 3px 0 0 var(--c);animation:ynMyRow .4s calc(var(--k) * 90ms) cubic-bezier(.2,.9,.3,1.2) both}
.yn-my-sb .r.win{background:linear-gradient(100deg,rgba(255,210,90,.24),rgba(255,210,90,.05));box-shadow:inset 3px 0 0 var(--c),inset 0 0 0 1.5px rgba(255,210,90,.75)}
.yn-my-sb .r>b.fl-who{grid-row:1 / 3;position:relative;inset:auto;top:auto;right:auto;margin:0;width:34px;height:34px;border-radius:9px;border:2px solid #fff;box-shadow:0 2px 0 rgba(0,0,0,.35);overflow:hidden;transform:skewX(-6deg)}
.yn-my-sb .r>b.fl-who.me{box-shadow:0 0 0 2px ${GOLD},0 2px 0 rgba(0,0,0,.35)}
.yn-my-sb .r>b.fl-who .fl-avs{display:block;width:100%;height:100%}
.yn-my-sb .nm{min-width:0;font:italic 800 13.5px/1.05 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#fff;white-space:nowrap;overflow:hidden}
.yn-my-sb .vl{min-width:0;display:flex;align-items:center;gap:6px}
.yn-my-sb .vl b{font:400 19px/1 'Lilita One',sans-serif;color:${GOLD}}
.yn-my-sb .vl b small{font-size:12.5px;color:#cfe0ff}
.yn-my-sb .vl u{flex:1;min-width:12px;height:5px;background:rgba(255,255,255,.14);overflow:hidden;transform:skewX(-14deg)}
.yn-my-sb .vl u i{display:block;height:100%;background:var(--c);transform-origin:0 50%;animation:ynMyBar .7s calc(var(--k) * 90ms + .2s) ease-out both}
.yn-my-sb .vl em{flex:none;display:flex;gap:1px}
.yn-my-sb .vl em svg{width:15px;height:15px;overflow:visible}
.yn-my-sb .r.dead .vl b{color:#ff9a8a}
.yn-my-sb .r.ok .nm::after{content:'';display:inline-block;width:9px;height:9px;margin-left:5px;border-radius:50%;background:#5ff08a;vertical-align:1px}
/* 3–4 oyuncu: tek satır, ad yok (portre ve renk yeter; adlar kart kapanınca sonuç ekranında) */
.yn-my-sb.k4 .r{padding:5px 5px 5px 4px;column-gap:5px}
.yn-my-sb.k4 .r>b.fl-who{width:30px;height:30px}
.yn-my-sb.k4 .nm{display:none}
.yn-my-sb.k4 .vl{flex-wrap:wrap;row-gap:2px;column-gap:4px}
.yn-my-sb.k4 .vl b{font-size:17px}
.yn-my-sb.k4 .vl u{display:none}
.yn-my-sb.k4 .vl em svg{width:13px;height:13px}
.yn-my-sb.k4 .r>.vl{grid-row:1 / 3}
@container (max-width:330px){.yn-my-tape>span{font-size:12.5px}.yn-my-hud{gap:7px}.yn-my-hud .cnt{min-width:50px}.yn-my-hud .cnt b{font-size:30px}.yn-my-hud .fl-send{min-width:72px;padding:0 9px;font-size:16px}.yn-my-hud .h{width:22px;height:21px}}
@media (max-height:640px){.yn-my-hint{display:none}}
@keyframes ynMyPop{0%{transform:scale(.5)}60%{transform:scale(1.25)}100%{transform:none}}
@keyframes ynMySeg{0%{transform:skewX(-14deg) scaleY(.2)}60%{transform:skewX(-14deg) scaleY(1.5)}100%{transform:skewX(-14deg)}}
@keyframes ynMyHeart{0%{transform:none}25%{transform:translateY(-5px) rotate(-14deg) scale(1.25)}100%{transform:translateY(2px) rotate(8deg) scale(.9)}}
@keyframes ynMyFlash{0%{background:#ff3a1a}100%{background:linear-gradient(90deg,#1a1408,#12141c 60%)}}
@keyframes ynMyShk{15%{transform:translateX(-8px) rotate(-.6deg)}35%{transform:translateX(7px) rotate(.5deg)}55%{transform:translateX(-5px)}75%{transform:translateX(3px)}100%{transform:none}}
@keyframes ynMyRow{from{opacity:0;transform:translateY(6px) scale(.96)}to{opacity:1;transform:none}}
@keyframes ynMyBar{from{transform:scaleX(0)}to{transform:none}}
.fl-ftxt.yn-my-bum{font-size:34px;color:#ff7a3a;letter-spacing:.02em}
.fl-ftxt.yn-my-ok{font-size:24px;color:${GOLD}}
`;

/** Harita katmanının (SVG) stili. */
const KCSS = /* css */ `
.yn-myk .mn .sp{stroke:#151821;stroke-width:2.7;stroke-linecap:round}
.yn-myk .mn .bd,.yn-my .mn .bd,.yn-my-sb .mn .bd{fill:#20232f;stroke:#000;stroke-width:.9}
.yn-myk .mn .hl,.yn-my .mn .hl{fill:#fff;opacity:.45}
.yn-myk .mn .cp,.yn-my .mn .cp{fill:#6b7080}
.yn-myk .mn .led,.yn-my .mn .led{fill:#ff3b2f}
.yn-my .mn .sp,.yn-my-sb .mn .sp{stroke:#e9edf7;stroke-width:2.4;stroke-linecap:round}
.yn-myk .mn .led,.yn-my-tape .mn .led{animation:ynMyLed .9s steps(2) infinite}
.yn-myk .mn.bm .st,.yn-my .mn.bm .st{fill:#ff8a1a;stroke:#fff3c4;stroke-width:1.2;stroke-linejoin:round}
.yn-myk .mn.bm .st2,.yn-my .mn.bm .st2{fill:#ffe27a}
.yn-myk .mn.bm .ck,.yn-my .mn.bm .ck{fill:none;stroke:#ff9a2a;stroke-width:1.1;stroke-linecap:round}
.yn-myk .pp{transform-box:fill-box;transform-origin:50% 50%;animation:ynMyMk .45s var(--d,0s) cubic-bezier(.3,1.8,.5,1) both}
.yn-myk .fg .sh{fill:rgba(0,0,0,.45)}
.yn-myk .fg .po{stroke:#eef2fb;stroke-width:2.3;stroke-linecap:round}
.yn-myk .fg .fi{fill:${GOLD};stroke:#4a3000;stroke-width:.6}
.yn-myk .fg .pn{stroke:#fff;stroke-width:1.3;stroke-linejoin:round;transform-box:fill-box;transform-origin:0 50%;animation:ynMyWave 1.3s ease-in-out infinite alternate}
.yn-myk .fd{transform-box:fill-box;transform-origin:50% 100%;animation:ynMyFlag .55s var(--d,0s) cubic-bezier(.3,1.8,.5,1) both}
.yn-myk .dot{stroke:#fff;stroke-width:1.6}
.yn-myk .ok{fill:none;stroke:#5ff08a;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
.yn-myk .okc{fill:rgba(6,30,14,.78);stroke:#5ff08a;stroke-width:1.6}
.yn-myk .mz{fill:${GOLD};stroke:#4a3000;stroke-width:1.2;stroke-linejoin:round}
.yn-myk .mzr{fill:none;stroke:${GOLD};stroke-width:2;opacity:.8;transform-box:fill-box;transform-origin:50% 50%;animation:ynMyRing 1.8s ease-out infinite}
.yn-myk .wr .tr{fill:#ffcf1a;stroke:#16130a;stroke-width:1.6;stroke-linejoin:round}
.yn-myk .wr .ex{stroke:#16130a;stroke-width:2.4;stroke-linecap:round}
/* mayın dedektörü taraması: tarlanın üstünde soluk, dönen bir dilim (soru boyunca) */
.yn-myk .tr{transition:opacity .5s}
.yn-myk .tr .rot{animation:ynMySweep 3.4s linear infinite}
.yn-myk .tr .ed{stroke:#ffe27a;stroke-width:1.6;opacity:.38;stroke-linecap:round}
.yn-myk .tr .rim{fill:none;stroke:rgba(255,226,122,.16);stroke-width:1.2;stroke-dasharray:2 7}
.yn-myk .tr.off{opacity:0}
/* seçim kolaylığı: üzerine gelinen / basılan tarla ili parlak hatla çizilir (soru boyunca; dokunuş en yakın tarla iline gider) */
.yn-myk .hv .hg{fill:none;stroke:rgba(255,236,170,.32);stroke-width:8;stroke-linejoin:round;stroke-linecap:round}
.yn-myk .hv .hc{fill:rgba(255,255,255,.08);stroke:#fff8dc;stroke-width:2.3;stroke-linejoin:round}
.yn-myk .hv.pr .hg{stroke:rgba(255,196,60,.5);stroke-width:12}
.yn-myk .hv.pr .hc{fill:rgba(255,210,90,.16);stroke:${GOLD};stroke-width:2.8}
@keyframes ynMySweep{to{transform:rotate(360deg)}}
/* patlama */
.yn-myk .bx .fl{transform-box:fill-box;transform-origin:50% 50%;animation:ynMyFlsh .32s ease-out forwards}
.yn-myk .bx .fb{transform-box:fill-box;transform-origin:50% 50%;animation:ynMyFb .7s cubic-bezier(.1,.8,.3,1) forwards}
.yn-myk .bx .sw{fill:none;stroke:#ffb347;stroke-width:5;transform-box:fill-box;transform-origin:50% 50%;animation:ynMySw .75s cubic-bezier(.15,.7,.3,1) forwards}
.yn-myk .bx .sw2{fill:none;stroke:#fff1c2;stroke-width:2;transform-box:fill-box;transform-origin:50% 50%;animation:ynMySw .9s .08s cubic-bezier(.15,.7,.3,1) both}
.yn-myk .bx .sm{fill:#4c4750;transform-box:fill-box;transform-origin:50% 50%;animation:ynMySm 1.3s var(--d,0s) ease-out both}
.yn-myk .bx .ash{fill:#2a1a14;transform-box:fill-box;transform-origin:50% 50%;animation:ynMyAsh 1.3s ease-out both}
@keyframes ynMyLed{50%{opacity:.25}}
@keyframes ynMyMk{0%{transform:translateY(-14px) scale(.2);opacity:0}60%{opacity:1}100%{transform:none;opacity:1}}
@keyframes ynMyFlag{0%{transform:translateY(-30px) scale(.3);opacity:0}55%{opacity:1}100%{transform:none;opacity:1}}
@keyframes ynMyWave{from{transform:skewY(-7deg) scaleX(.92)}to{transform:skewY(5deg) scaleX(1.05)}}
@keyframes ynMyRing{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.8);opacity:0}}
@keyframes ynMyFlsh{0%{transform:scale(.3);opacity:.9}100%{transform:scale(1);opacity:0}}
@keyframes ynMyFb{0%{transform:scale(.06);opacity:1}50%{opacity:1}100%{transform:scale(1);opacity:0}}
@keyframes ynMySw{0%{transform:scale(.08);opacity:1}100%{transform:scale(1);opacity:0}}
@keyframes ynMySm{0%{transform:translateY(0) scale(.2);opacity:0}25%{opacity:.75}100%{transform:translateY(-46px) scale(1.15);opacity:0}}
@keyframes ynMyAsh{0%{transform:scale(.2);opacity:0}30%{opacity:.85}100%{transform:scale(1);opacity:0}}
@media (prefers-reduced-motion:reduce){.yn-myk .fg .pn,.yn-myk .mzr,.yn-myk .tr .rot{animation:none}}
`;

/** Patlama sahnesi (SVG): flaş, ateş topu, yer şok halkası (kamera eğimiyle basık), duman, kül. */
function boomSVG(flat) {
	const id = 'ynfb' + Math.random().toString(36).slice(2, 8);
	return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="#fffbe6"/><stop offset=".25" stop-color="#ffe27a"/><stop offset=".5" stop-color="#ff8a1a"/><stop offset=".75" stop-color="#d8300f" stop-opacity=".85"/><stop offset="1" stop-color="#7a0d06" stop-opacity="0"/></radialGradient>
		<radialGradient id="${id}f"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
		<ellipse class="ash" rx="44" ry="${(44 * flat).toFixed(1)}"/>
		<circle class="fl" r="120" fill="url(#${id}f)"/>
		<ellipse class="sw" rx="78" ry="${(78 * flat).toFixed(1)}"/><ellipse class="sw2" rx="104" ry="${(104 * flat).toFixed(1)}"/>
		<circle class="fb" r="40" cy="-14" fill="url(#${id})"/>
		<circle class="sm" r="18" cx="-12" cy="-22" style="--d:.12s"/><circle class="sm" r="22" cx="10" cy="-30" style="--d:.2s"/><circle class="sm" r="15" cx="2" cy="-18" style="--d:.3s"/>`;
}

export const mayin = {
	time: 38,
	label: 'Mayın Tarlası',
	kind: 'closest',
	needsMap: true,
	jokers: ['yari'],
	// cevap filmi (mayınlar sırayla açılır, bayraklar dikilir): ui.reveal cevap ekranını en az bu kadar tutar
	revealMs: 4200,
	rule: 'En çok il bulan',
	// sonuç ekranının dili (öneri: ui.js _showResult "EN YAKIN SEN!" / "X daha yakın" / "EN YAKIN" yerine bunları okusun)
	birinci: 'EN ÇOK İL SENDE!',
	ustun: 'daha çok il buldu',
	rozet: 'EN ÇOK İL',
	fmt: (v, value) => `${sonuc(v, value?.taps).ok.length}/${v.n ?? v.guvenli?.length ?? 0} il`,
	sub: (v, value) => {
		const r = sonuc(v, value?.taps);
		return r.boom.length ? `${r.boom.length} mayın${r.dead ? ' · patladı' : ''}` : 'mayınsız';
	},
	prepare(q) {
		const alan = [...new Set((q.alan || []).map((id) => BY_ID.get(id)).filter((i) => i != null))];
		const F = new Set(alan);
		const guvenli = (q.guvenli || []).map((id) => BY_ID.get(id)).filter((i) => i != null && F.has(i));
		const merkez = q.merkez != null && BY_ID.has(q.merkez) ? BY_ID.get(q.merkez) : -1;
		const v = { q, alan, guvenli, merkez, can: CAN, n: guvenli.length };
		return stamp(v, q, (q2, k, P, text) => {
			text(q2.mayin);
			const n = guvenli.length;
			const m = alan.length - n;
			return {
				wait: 0.5 + 1.0, // kart + tarlanın ışıkları yanar, kamera oturur
				look: LOOK.orient + LOOK.map + 0.22 * alan.length, // tarlayı ve adları tara
				think: n * (1.1 + 0.45 * k) + 0.3 * m, // her güvenli il için karar; çekici mayınları ele
				act: n * (ACT.mapTap + 0.35) + ACT.confirm, // haritada bul, dokun; BİTİR
			};
		});
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('yn3-damga', DAMGA_CSS);
		css('yn3-mayin', CSS + KCSS);
		const app = appOf();
		const me = app?.match?.humanPlayer;
		const color = me?.css || '#ff3030';
		const n = v.n ?? v.guvenli?.length ?? 0;
		// güvenli iller yerelde görünümde; çevrimiçinde gizli (publicView): her dokunuşu sunucu yanıtlar (act 'il' →
		// ev 'il' { il, mayin }; arayüz api.act / api.wait sağlar, t_blitz.js gibi). Cevap gelene dek yeni dokunuş alınmaz.
		const known = Array.isArray(v.guvenli);
		const S = new Set(known ? v.guvenli : []);
		const F = new Set(v.alan);
		const online = !known && typeof api.act === 'function' && typeof api.wait === 'function';
		let pending = false;
		const HINT = `Tarladaki illere dokun · ${CAN} canın var`;
		el.innerHTML = `<div class="yn-my" style="--pc:${color}">
			<div class="yn-my-tape">${MINE_ICO}<b>MAYIN</b><span data-r="tx">${esc(v.q.mayin || '')}</span></div>
			<div class="yn-my-hud">
				<div class="cnt"><b>0</b><small>/${n}</small></div>
				<div class="bar"><small>GÜVENLİ İL</small><div class="seg">${'<i></i>'.repeat(n)}</div></div>
				<div class="can">${HEART.repeat(CAN)}</div>
				<button class="fl-send">BİTİR</button>
				<div class="yn-my-dead"><svg viewBox="-14 -14 28 28" aria-hidden="true">${BOOMED.replace('class="mn bm"', 'class="mn bm" transform="scale(.9)"')}</svg><b>PATLADIN!</b></div>
			</div>
			<div class="yn-my-hint">${HINT}</div>
			<div class="yn-my-sb"></div>
		</div>`;
		rule(el, 'En çok il bulan');
		const root = el.querySelector('.yn-my');
		const cnt = root.querySelector('.cnt b');
		const segs = [...root.querySelectorAll('.seg i')];
		const hearts = [...root.querySelectorAll('.can .h')];
		const hint = root.querySelector('.yn-my-hint');
		const taps = [];
		const seen = new Set();
		let found = 0;
		let booms = 0;
		let done = false;
		let over = false; // tarla kapandı (ikinci mayın ya da temiz): cevap gönderilene dek dokunuş sayılmaz
		let started = false;
		let rvd = false; // cevap çiziliyor: yer bulamayan işaret altındaki adı söndürür
		const sus = new Set(); // cevapta sönen adlar (il dizini)
		const hit = new Set(); // bu çizimde yer bulamayan işaretin altında kalan adlar
		const hitAt = new Map(); // ad → çakışmanın başladığı an (ms)
		const timers = [];
		const later = (fn, ms) => timers.push(setTimeout(() => el.isConnected && fn(), ms));
		const say = (t, bad = false) => {
			hint.textContent = t;
			hint.classList.toggle('bad', bad);
		};
		const finish = () => {
			if (done) return;
			done = true;
			root.classList.add('done');
			api.answer({ taps: taps.slice() });
		};
		root.querySelector('.fl-send').addEventListener('click', finish);
		const ctlBase = {
			lock() {
				done = true;
				root.classList.add('done');
			},
			value: () => ({ taps: taps.slice() }),
		};
		if (!app) return { ...ctlBase, reveal() {}, destroy() {} };

		const b = app.board;
		const g = guard(app);
		const frame = v.merkez >= 0 ? [...v.alan, v.merkez] : v.alan.slice();
		// karanlık harita: yalnız tarla (ve merkez) ışıkta; ışıklar açılışta merkezden dışa sırayla yanar
		const lit = v.merkez >= 0 ? [v.merkez] : [];
		const K = katman(app, 'yn-myk');
		let unAd = () => {};
		// seçim hattı (üzerine gelme, basma): işaretlerin altında, ilin kalkık yüzeyinin sınırında
		const hv = sv('g', { class: 'hv', style: 'visibility:hidden' }, K.svg);
		hv.innerHTML = '<path class="hg"/><path class="hc"/>';
		const [hvG, hvC] = hv.children;
		// işaretler: ilin 3B ad hapının üstüne oturur (ad: hapın ekrandaki gerçek yeri), patlama ilin tepesinde (top).
		// bx (işaretin kendi kutusu, çapa noktasına göre) verilen işaret yerini seçer: adın üstü (öntanımlı), sağı ya da
		// solu; komşu ilin adına ya da başka bir işarete binmeyen ilk yer. Kıyıda alt alta dizilen adlarda (İzmir, Aydın,
		// Muğla) üstteki yer bir üst ilin adının üstüydü.
		const marks = []; // { g, i, dx, dy, top, hid, bx, at }
		const o = {};
		const occ = []; // bu çizimde dolu kutular: görünen adlar (i) ve yerleşen işaretler (i = −1)
		const cut = (a, q) => Math.max(0, Math.min(a.r, q.r) - Math.max(a.l, q.l)) * Math.max(0, Math.min(a.b, q.b) - Math.max(a.t, q.t));
		const box = (x, y, bx) => ({ l: x + bx[0], t: y + bx[1], r: x + bx[2], b: y + bx[3], i: -1 });
		const cand = Array.from({ length: 6 }, () => [0, 0]);
		const scr = { l: 0, t: 0, r: 0, b: 0 };
		const place = (P, m) => {
			if (m.top) P.top(m.i, o);
			else P.ad(m.i, o);
			const hide = o.behind;
			if (hide !== m.hid) {
				m.hid = hide;
				m.g.style.visibility = hide ? 'hidden' : '';
			}
			if (hide) return;
			let x = o.x + m.dx;
			let y = o.y + m.dy;
			if (m.bx && !m.top) {
				// adayların sırası: adın üstü, üstte sağa ve sola kayık, sağı, solu, altı. Kendi adı görünmüyorsa (dar ekranda
				// elenmiş) işaret çapa noktasına iğne gibi oturur: yan adaylar noktanın hemen yanında
				const own = (La?.alpha?.[m.i] ?? 1) >= 0.35;
				const hw = own ? o.hw : 0;
				const hh = own ? o.hh * 0.82 : 0;
				const [x0, y0, x1, y1] = m.bx;
				const yc = o.y - (y0 + y1) / 2;
				cand[0][0] = x;
				cand[0][1] = y;
				cand[1][0] = x + hw * 0.72;
				cand[1][1] = y;
				cand[2][0] = x - hw * 0.72;
				cand[2][1] = y;
				cand[3][0] = o.x + hw + 3 - x0;
				cand[3][1] = yc;
				cand[4][0] = o.x - hw - 3 - x1;
				cand[4][1] = yc;
				cand[5][0] = x;
				cand[5][1] = o.y + hh + 3 - y0;
				scr.r = app._rc?.width || innerWidth;
				scr.b = app._rc?.height || innerHeight;
				const cost = (k) => {
					const r = box(cand[k][0], cand[k][1], m.bx);
					// ekran dışında kalan pay da binme sayılır (kesik işaret)
					let s = (r.r - r.l) * (r.b - r.t) - cut(r, scr);
					for (const q of occ) if (q.i !== m.i) s += cut(r, q);
					return s;
				};
				// üstü boşsa hep üstü; değilse önceki yer hâlâ boşsa o (kamera oynarken işaret gidip gelmesin); yoksa sıradaki
				// ilk boş yer; hiçbiri boş değilse en az binen
				let k = 0;
				if (cost(0) > 3) {
					if (m.at > 0 && cost(m.at) <= 3) k = m.at;
					else {
						let best = Infinity;
						for (let j = 0; j < cand.length; j++) {
							const c = cost(j);
							if (c <= 3) {
								k = j;
								break;
							}
							if (c < best) {
								best = c;
								k = j;
							}
						}
					}
				}
				m.at = k;
				x = cand[k][0];
				y = cand[k][1];
				const mb = box(x, y, m.bx);
				// cevapta en az binen yer de doluysa altındaki komşu ad söner; yalnız yarım saniyeden uzun süren çakışmada
				// (işaretler belirirken ve kamera oturuncaki anlık çakışmalar sayılmaz), sonra cevap boyunca sönük (gidip gelmesin)
				if (rvd && cost(k) > 3) for (const q of occ) if (q.i >= 0 && q.i !== m.i && cut(mb, q) > 3) hit.add(q.i);
				occ.push(mb);
			}
			m.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
		};
		const mark = (i, html, { dx = 0, dy = 0, cls = '', top = false, bx = null } = {}) => {
			const gEl = sv('g', { class: cls }, K.svg);
			gEl.innerHTML = html;
			const m = { g: gEl, i, dx, dy, top, hid: false, bx, at: 0 };
			marks.push(m);
			place(K.P, m); // hemen yerinde (bir sonraki çizimi beklemeden; köşede bir kare görünmesin)
			return m;
		};
		const La = app.board.labelLayer;
		K.on((P) => {
			occ.length = 0;
			for (const i of frame) {
				if ((La?.alpha?.[i] ?? 1) < 0.35) continue;
				P.ad(i, o);
				if (o.behind) continue;
				// görünen hap (hücrenin kenar payı düşülür)
				occ.push({ l: o.x - o.hw * 0.96, r: o.x + o.hw * 0.96, t: o.y - o.hh * 0.82, b: o.y + o.hh * 0.82, i });
			}
			hit.clear();
			for (const m of marks) place(P, m);
			if (rvd) {
				const now = performance.now();
				for (const i of hit) {
					if (!hitAt.has(i)) hitAt.set(i, now);
					else if (now - hitAt.get(i) > 500) sus.add(i);
				}
				for (const i of [...hitAt.keys()]) if (!hit.has(i)) hitAt.delete(i);
			}
		});
		const unmark = (m) => {
			const k = marks.indexOf(m);
			if (k >= 0) marks.splice(k, 1);
			m.g.remove();
		};
		// merkez il: altın elmas ve nabız halkası (il boyası ve kalkışı aşağıda, harita kurulurken)
		if (v.merkez >= 0) {
			mark(v.merkez, `<g class="pp"><circle r="13" class="mzr"/><path d="M0 -11L8 0L0 11L-8 0Z" class="mz"/><path d="M0 -5.2L1.5 -1.6L5.2 -1.4L2.3 1L3.3 4.6L0 2.6L-3.3 4.6L-2.3 1L-5.2 -1.4L-1.5 -1.6Z" fill="#fff"/></g>`, { dy: -25, bx: [-9, -12, 9, 12] });
		}
		// dedektör taraması: tarlanın ekrandaki ortasında, tarlayı saran yarıçapta dönen soluk dilim (altı ince dilimle solar)
		const sweep = sv('g', { class: 'tr', style: 'visibility:hidden' }, K.svg);
		sweep.innerHTML = `<circle class="rim" r="100"/><g class="rot">${[0, 1, 2, 3, 4, 5]
			.map((k) => {
				const a0 = (-(k + 1) * 9 * Math.PI) / 180;
				const a1 = (-k * 9 * Math.PI) / 180;
				return `<path d="M0 0L${(100 * Math.cos(a1)).toFixed(1)} ${(100 * Math.sin(a1)).toFixed(1)}A100 100 0 0 0 ${(100 * Math.cos(a0)).toFixed(1)} ${(100 * Math.sin(a0)).toFixed(1)}Z" fill="#ffd25a" opacity="${(0.13 - k * 0.02).toFixed(2)}"/>`;
			})
			.join('')}<path d="M0 0H100" class="ed"/></g>`;
		const sw = { x: 0, y: 0, r: 100 };
		K.on((P) => {
			let x0 = Infinity;
			let x1 = -Infinity;
			let y0 = Infinity;
			let y1 = -Infinity;
			for (const i of v.alan) {
				P.top(i, o);
				if (o.behind) continue;
				x0 = Math.min(x0, o.x);
				x1 = Math.max(x1, o.x);
				y0 = Math.min(y0, o.y);
				y1 = Math.max(y1, o.y);
			}
			if (!Number.isFinite(x0)) return;
			sw.x = (x0 + x1) / 2;
			sw.y = (y0 + y1) / 2;
			sw.r = Math.max(40, Math.hypot(x1 - x0, y1 - y0) * 0.55);
			// dilim çizimi 100 px yarıçaplı: ölçekle sarılır (yuvarlak kalsın; kamera eğimi basıklığı katman dışı)
			sweep.setAttribute('transform', `translate(${sw.x.toFixed(1)} ${sw.y.toFixed(1)}) scale(${(sw.r / 100).toFixed(3)})`);
			if (sweep.style.visibility) sweep.style.visibility = '';
		});
		// gece güvencesi: önceki kartın geç gelen temizliği (galeride hızlı geçişte) haritayı gündüze döndürürse gece yeniden kurulur
		let darkList = null;
		K.on(() => {
			if (darkList && b.nightTo < 1) {
				setNightTone(b.G, 'baskent');
				b.night(true, darkList.length ? darkList : null);
			}
		});
		// kadraj: tarlanın bütün illeri kartın altındaki alana (perspektif doğru; alttaki düğmelerden uzak)
		// harita kurulumu bir mikro görevde: önceki kartın temizliği (gözlemci) önce çalışsın. Galeride soru hızla değişince
		// eski kartın g.restore()'u yeni kartın karanlığından SONRA gelip sahip renklerini geri boyuyordu.
		queueMicrotask(() => {
			if (!el.isConnected) return;
			g.allActive();
			g.dark(lit);
			darkList = lit;
			if (v.merkez >= 0) {
				const mp = b.provinces[v.merkez];
				g.paint(v.merkez, '#d9a521', mp.x, mp.z);
				g.fx(v.merkez, 0.35, 1);
			}
			// adlar çakışmasız (dar ekranda küçük illerin adı yaklaşınca gelir); cevapta yer bulamayan işaretin altındaki ad
			// söner (sus): kalabalık tarlada (4 kişi, 320 px) işaret ada binmez
			unAd = adlar(app, frame, K, { gizle: sus });
			cerceve(app, frame, { top: cardTop(el), alt: 54, yan: 6, pitch: 1.22, dur: 0.9, arc: 4 });
		});
		const stopOpen = onOpen(el, () => {
			started = true;
			sfx(app, 'cue');
			// tarla kuruluyor: iller merkezden (ya da tarlanın ortasından) dışa doğru sırayla ışığa çıkar
			const bb = app.boundsOf(v.alan);
			const cx = v.merkez >= 0 ? b.provinces[v.merkez].x : (bb.x0 + bb.x1) / 2;
			const cz = v.merkez >= 0 ? b.provinces[v.merkez].z : (bb.z0 + bb.z1) / 2;
			const seq = v.alan.slice().sort((x, y) => Math.hypot(b.provinces[x].x - cx, b.provinces[x].z - cz) - Math.hypot(b.provinces[y].x - cx, b.provinces[y].z - cz));
			seq.forEach((i, k) =>
				later(() => {
					lit.push(i);
					g.dark(lit);
				}, 40 * k),
			);
		});
		// ---------------------------------------------------------------- seçim kolaylığı
		// Dokunuş tam bir tarla ilinin üstünde değilse (sınır çizgisi, küçük il, tarla dışına taşan parmak) küçük bir
		// yarıçapta (ekranın ~%5'i, 16–30 px) en yakın tarla iline gider: halka halka örneklenir, en çok örneği alan il.
		// Fare üzerine gelince ve parmak basınca il kalkar, parlak hatla çizilir (bırakınca dokunuş sayılır).
		const cv = app.canvas;
		const near = (cx, cy) => {
			const i0 = app.pickAt(cx, cy);
			if (i0 >= 0 && F.has(i0)) return i0;
			const r = cv.getBoundingClientRect();
			const R0 = clamp(Math.min(r.width, r.height) * 0.05, 16, 30);
			for (const f of [0.4, 0.7, 1]) {
				const hit = new Map();
				for (let k = 0; k < 12; k++) {
					const a = (k / 12) * Math.PI * 2 + f;
					const j = app.pickAt(cx + Math.cos(a) * R0 * f, cy + Math.sin(a) * R0 * f);
					if (j >= 0 && F.has(j)) hit.set(j, (hit.get(j) || 0) + 1);
				}
				if (hit.size) return [...hit].sort((x, y) => y[1] - x[1])[0][0];
			}
			return i0;
		};
		const so = {};
		const sp = {};
		const ringD = (P, i) => {
			let d = '';
			const p = b.provinces[i];
			const lift = b.liftOf(i) + 0.03;
			for (const r of p.rings) {
				const step = r.length > 400 ? 4 : 2;
				for (let k = 0; k < r.length; k += step) {
					const x = r[k];
					const z = -r[k + 1];
					P.at(x, z, b.heightAt(x, z) + lift, sp);
					if (sp.behind) return '';
					d += (k ? 'L' : 'M') + sp.x.toFixed(1) + ' ' + sp.y.toFixed(1);
				}
				d += 'Z';
			}
			return d;
		};
		let hov = -1;
		let press = false;
		K.on((P) => {
			if (hov < 0) return;
			const d = ringD(P, hov);
			hvG.setAttribute('d', d);
			hvC.setAttribute('d', d);
		});
		const setHov = (i, pr = false) => {
			if (done || over || !started || spec() || i < 0 || !F.has(i) || seen.has(i)) {
				i = -1;
				pr = false;
			}
			if (i === hov && pr === press) return;
			if (hov >= 0 && !seen.has(hov)) g.fx(hov, 0, 0);
			hov = i;
			press = pr;
			hv.classList.toggle('pr', pr);
			hv.style.visibility = i >= 0 ? '' : 'hidden';
			if (i >= 0) {
				g.fx(i, pr ? 0.26 : 0.15, pr ? 0.55 : 0.3);
				const d = ringD(K.P, i);
				hvG.setAttribute('d', d);
				hvC.setAttribute('d', d);
			}
		};
		let mv = null;
		let raf = 0;
		let down = null;
		const onMove = (e) => {
			if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) {
				down = null;
				setHov(-1); // kaydırma: basılı il bırakılır
			}
			if (e.pointerType !== 'mouse' || e.buttons) return;
			mv = e;
			if (!raf) raf = requestAnimationFrame(() => {
				raf = 0;
				if (mv && el.isConnected) setHov(near(mv.clientX, mv.clientY));
			});
		};
		const onDown = (e) => {
			down = { x: e.clientX, y: e.clientY };
			setHov(near(e.clientX, e.clientY), true);
		};
		const onUp = (e) => {
			down = null;
			if (e.pointerType === 'mouse') setHov(near(e.clientX, e.clientY));
			else setHov(-1);
		};
		const onLeave = () => setHov(-1);
		cv.addEventListener('pointermove', onMove);
		cv.addEventListener('pointerdown', onDown);
		cv.addEventListener('pointerup', onUp);
		cv.addEventListener('pointercancel', onLeave);
		cv.addEventListener('pointerleave', onLeave);
		const unHov = () => {
			cv.removeEventListener('pointermove', onMove);
			cv.removeEventListener('pointerdown', onDown);
			cv.removeEventListener('pointerup', onUp);
			cv.removeEventListener('pointercancel', onLeave);
			cv.removeEventListener('pointerleave', onLeave);
			if (raf) cancelAnimationFrame(raf);
			setHov(-1);
		};
		// tarla illerinin dış hattı: aydınlık illerde beyaz bant tam güçte (seçim sayısından bağımsız)
		const edge0 = b.uSelEdge ? b.uSelEdge.value : null;
		if (b.uSelEdge) b.uSelEdge.value = 1;
		// patlama (soru anı): yalnız insanın kendi dokunuşları
		const boomAt = (i, x, z) => {
			g.paint(i, SCORCH, x, z);
			g.fx(i, -0.22, 0);
			const flat = Math.max(0.35, Math.min(0.85, Math.sin(app.cam.pitch || 1)));
			const bx = mark(i, boomSVG(flat), { cls: 'bx', top: true });
			later(() => unmark(bx), 1400);
			mark(i, `<g class="pp">${BOOMED}</g>`, { dy: -26, bx: [-14, -14, 14, 14] });
			pop(app, x, z, 'BUM!', { colors: FIRE, n: 30, dist: 120, cls: 'dn yn-my-bum' });
			app.cam.impulse?.(0.9);
			sfx(app, 'tower');
			buzz(90);
			root.classList.remove('shk', 'flash');
			void root.offsetWidth;
			root.classList.add('shk', 'flash');
			const h = hearts[CAN - booms];
			h?.classList.add('off');
		};
		const spec = () => !!el.closest('.fl-q')?.classList.contains('spec'); // izlenen düello: dokunuş yok
		api.onMapTap(async (pt) => {
			if (done || over || pending || !started || spec()) return;
			K.P.at(pt.x, pt.z, null, so);
			const r0 = cv.getBoundingClientRect();
			const i = near(r0.left + so.x, r0.top + so.y);
			if (i < 0) return;
			if (i === v.merkez) {
				sfx(app, 'tap');
				app.ui.toast?.(`${b.provinces[i].name} kuralın merkezi, tarlada değil`, { tone: 'warn', ms: 1500 });
				return;
			}
			if (!F.has(i)) {
				sfx(app, 'tap');
				app.ui.toast?.('Tarlanın dışı: ışıklı illere dokun', { tone: 'warn', ms: 1400 });
				return;
			}
			if (seen.has(i)) {
				sfx(app, 'tap');
				return;
			}
			seen.add(i);
			const p = b.provinces[i];
			let safe;
			if (known) safe = S.has(i);
			else if (online) {
				pending = true;
				api.act('il', { il: p.id });
				const r = await api.wait('il', 3000);
				pending = false;
				if (!r || r.rejected || r.il !== p.id) {
					seen.delete(i); // yanıt yok ya da reddedildi: dokunuş sayılmadı, yeniden denenebilir
					return;
				}
				if (done || over) return;
				safe = !r.mayin;
			} else {
				seen.delete(i); // yargılayacak kimse yok (çevrimiçi görünüm, sunucu adımı yok)
				return;
			}
			taps.push(p.id);
			if (safe) {
				found++;
				g.paint(i, color, pt.x, pt.z);
				g.fx(i, 0.42, 0);
				mark(i, `<g class="fd">${FLAG(color, 1.1)}</g>`, { dx: 3, dy: -13, bx: [-6, -34.4, 17.2, 2.5] });
				segs[found - 1]?.classList.add('on');
				cnt.textContent = String(found);
				cnt.classList.remove('pop');
				void cnt.offsetWidth;
				cnt.classList.add('pop');
				const all = found === n;
				pop(app, p.x, p.z, all ? 'TEMİZ!' : '+1', { colors: [color, '#fff', GOLD], n: all ? 26 : 12, dist: all ? 110 : 60, cls: 'dn yn-my-ok' });
				if (found < 3) sfx(app, 'claim');
				else sfx(app, 'combo', { n: found - 1 });
				buzz(12);
				if (!booms) say(all ? 'Tarla temiz!' : `${p.name} güvenli · ${n - found} il kaldı`);
				if (all) {
					over = true;
					sfx(app, 'fetih', { delay: 0.15 });
					app.ui?.fx?.confetti?.(app.ui.el.clientWidth || 360, { n: 40 });
					later(finish, 650);
				}
			} else {
				booms++;
				boomAt(i, pt.x, pt.z);
				if (booms >= CAN) {
					over = true;
					root.classList.add('dead');
					say('İkinci mayın · tarla kapandı', true);
					sfx(app, 'eliminate', { delay: 0.35 });
					later(finish, 1000);
				} else say(`${p.name} mayınlıydı! · ${CAN - booms} canın kaldı`, true);
			}
		});
		const close = onClose(el, () => {
			stopOpen();
			unHov();
			for (const t of timers) clearTimeout(t);
			K.destroy();
			unAd();
			g.restore();
			if (b.uSelEdge && edge0 != null) b.uSelEdge.value = edge0;
		});
		return {
			...ctlBase,
			// yarı yarıya: mayın dedektörü iki mayını sarı üçgenle işaretler
			joker(e) {
				if (!Array.isArray(e?.mines)) return;
				for (const i of e.mines) if (!seen.has(i)) mark(i, `<g class="pp">${WARN}</g>`, { dy: -26, bx: [-10.5, -12.5, 10.5, 6.5] });
				app.ui.toast?.('Mayın dedektörü: iki mayın işaretlendi', { tone: 'good', ms: 2000 });
				sfx(app, 'kbPing', { n: 1 });
			},
			reveal(results) {
				jokersOff(el); // joker çubuğu kalkar: kart kısalır (kadraj aşağıda bundan sonra ölçülür)
				done = true;
				unHov();
				// çevrimiçinde güvenli iller cevapla gelir (sunucunun tam görünümü görünüme katılır); gelmediyse cevap çizilemez
				if (!Array.isArray(v.guvenli)) return;
				rvd = true;
				if (!known) for (const i of v.guvenli) S.add(i);
				root.classList.add('done', 'rv');
				sweep.classList.add('off');
				const tx = root.querySelector('[data-r=tx]');
				if (v.q.not) {
					tx.textContent = v.q.not;
					root.querySelector('.yn-my-tape>b').textContent = 'NOT';
				}
				// oyuncuların sonuçları: kim hangi güvenli ili buldu, kim hangi mayına bastı
				const all = results.map((r) => ({ r, s: sonuc(v, r.value?.taps) }));
				const meR = all.find((x) => x.r.p?.human);
				const okBy = new Map(); // güvenli il → onu bulanlar (oyuncu sırasıyla)
				const boomBy = new Map(); // mayın → ona basanlar
				const add = (M, i, r) => (M.get(i) || M.set(i, []).get(i)).push(r);
				for (const x of all) {
					for (const i of x.s.ok) add(okBy, i, x.r);
					for (const i of x.s.boom) add(boomBy, i, x.r);
				}
				// insanın dokunuşları (cevap kendi yolundan gelmediyse de) haritada
				const mine = new Set(meR?.s.ok || []);
				const mineB = new Set(meR?.s.boom || []);
				// mayınlar karanlığa çöker, güvenli iller altın hatla ışıkta kalır
				const litR = v.merkez >= 0 ? [...v.guvenli, v.merkez] : v.guvenli.slice();
				g.dark(litR);
				darkList = litR;
				for (const i of v.guvenli) {
					const p = b.provinces[i];
					if (mine.has(i)) {
						if (!seen.has(i)) g.paint(i, color, p.x, p.z);
						g.fx(i, 0.42, 0);
					} else {
						g.paint(i, MISS, p.x, p.z);
						g.fx(i, 0.3, 0);
					}
				}
				// eski işaretler (soru anı bayrakları, patlama kalıntıları) cevabın düzenine yer açar
				for (const m of marks.slice()) if (m.i !== v.merkez) unmark(m);
				const mines = v.alan.filter((i) => !S.has(i));
				mines.sort((x, y) => b.provinces[x].x - b.provinces[y].x); // batıdan doğuya sırayla belirir
				mines.forEach((i, k) => {
					const p = b.provinces[i];
					const hit = boomBy.get(i) || [];
					if (mineB.has(i) && !seen.has(i)) g.paint(i, SCORCH, p.x, p.z);
					if (mineB.has(i)) g.fx(i, -0.22, 0);
					const dots = hit.map((r, j) => `<circle class="dot" cx="${(j - (hit.length - 1) / 2) * 9}" cy="12.5" r="3.6" style="fill:${r.color}"/>`).join('');
					const xs = Math.max(14, ((hit.length - 1) / 2) * 9 + 3.8);
					mark(i, `<g class="pp" style="--d:${(0.15 + k * 0.11).toFixed(2)}s">${hit.length ? BOOMED : MINE()}${dots}</g>`, { dy: -27, bx: hit.length ? [-xs, -14, xs, 16.4] : [-11, -12.8, 11, 10.8] });
					later(() => sfx(app, 'tick'), 150 + k * 110);
				});
				// güvenli iller: onu bulanların bayrakları yan yana (oyuncu sırasıyla); kimse bulamadıysa yeşil halka
				v.guvenli.forEach((i, k) => {
					const who = okBy.get(i) || [];
					const d = (0.35 + mines.length * 0.11 + k * 0.08).toFixed(2);
					if (!who.length) {
						mark(i, `<g class="pp" style="--d:${d}s"><circle r="9" class="okc"/><path d="${CHECK}" class="ok" transform="scale(1.05)"/></g>`, { dy: -23, bx: [-10, -10, 10, 10] });
						return;
					}
					// 3–4 bayrak: dar ekranda (320–375 px) daha küçük küme (komşu adlar yerinde kalsın)
					const s = who.length > 2 ? ((app._rc?.width || innerWidth) < 380 ? 0.6 : 0.72) : 0.86;
					const html = who.map((r, j) => `<g transform="translate(${((j - (who.length - 1) / 2) * 13 * s).toFixed(1)} 0)">${FLAG(r.color, s)}</g>`).join('');
					const ex = ((who.length - 1) / 2) * 13 * s;
					mark(i, `<g class="fd" style="--d:${d}s">${html}</g>`, { dx: 2, dy: -13, bx: [-ex - 5.6 * s, -31.4 * s, ex + 15.8 * s, 2.4 * s] });
				});
				// kart: oyuncu satırları (portreleri arayüz .fl-who işaretlerinden çizer)
				const order = all.slice().sort((x, y) => x.r.err - y.r.err || x.r.time - y.r.time);
				const sb = root.querySelector('.yn-my-sb');
				const k4 = results.length > 2;
				sb.classList.toggle('k4', k4);
				sb.style.setProperty('--c', String(k4 ? results.length : Math.max(1, results.length)));
				sb.innerHTML = order
					.map(({ r, s }, k) => {
						const w = n ? Math.round((s.ok.length / n) * 100) : 0;
						const cls = `${k === 0 ? ' win' : ''}${s.dead ? ' dead' : ''}${s.all ? ' ok' : ''}`;
						return `<div class="r${cls}" style="--c:${r.color};--k:${k}"><b class="fl-who" style="background:${r.color}"></b><span class="nm">${esc(r.name)}</span><span class="vl"><b>${s.ok.length}<small>/${n}</small></b><u><i style="width:${w}%"></i></u>${
							s.boom.length ? `<em>${BOMB_MINI.repeat(s.boom.length)}</em>` : ''
						}</span></div>`;
					})
					.join('');
				sigdir([...sb.querySelectorAll('.nm')], 9);
				// kadraj: kart kısaldı (joker çubuğu yok, damga sorunun yerinde); tarla kartın altında kalan alana
				if (results.some((r) => r.p?.human)) damgaYeri(el); // damga sorunun yerinde: satır şimdi açılır, kadraj ondan sonra
				cerceve(app, frame, { top: cardTop(el), alt: 54, yan: 6, pitch: 1.12, dur: 0.9, arc: 3 });
				sfx(app, 'iaReveal');
				if (meR) {
					const order2 = order.map((x) => x.r);
					const win = order2[0] === meR.r;
					const s = meR.s;
					let text;
					let sub;
					if (s.all && !s.boom.length) {
						text = 'TARLA TEMİZ!';
						sub = `${n} güvenli ilin hepsi senin, mayınsız`;
					} else if (s.dead && !win) {
						text = 'PATLADIN!';
						sub = `${order2[0].name} ${sonuc(v, order2[0].value?.taps).ok.length} il buldu`;
					} else if (win) {
						text = s.all ? 'HEPSİ SENİN!' : `${s.ok.length} İL BULDUN!`;
						sub = `${s.ok.length}/${n} güvenli il${s.boom.length ? ` · ${s.boom.length} mayın` : ''}`;
					} else {
						const w = sonuc(v, order2[0].value?.taps);
						text = `${s.ok.length} İL`;
						sub = w.ok.length > s.ok.length ? `${order2[0].name} ${w.ok.length} il buldu` : w.boom.length < s.boom.length ? `Eşit: ${order2[0].name} daha az mayına bastı` : `Eşit: ${order2[0].name} daha erken bitirdi`;
					}
					// eşli: takım arkadaşı kazandıysa takımın kazandı (altın)
					const team = !win && !!app.match?.mode?.teams && order2[0].p?.team === meR.r.p?.team;
					if (team) sub = `Takımın kazandı · ${order2[0].name} ${sonuc(v, order2[0].value?.taps).ok.length} il buldu`;
					stampLater(app, text, win || team ? 'gold' : 'bad', sub);
					damga(el);
					if (win && s.all) later(() => sfx(app, 'fireworks'), 900);
				}
			},
			destroy: close,
		};
	},
	joker(id, v, R) {
		if (id !== 'yari') return null;
		const S = new Set(v.guvenli);
		return { mines: shuffle(v.alan.filter((i) => !S.has(i)), R).slice(0, 2) };
	},
	/** Çevrimiçi görünüm: güvenli iller sunucuda (her dokunuşu sunucu yanıtlar). */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.guvenli;
		delete o.q.guvenli;
		delete o.q.not;
		return o;
	},
	/** Sınama: doğru (bütün güvenli iller) ve yanlış (iki mayın) değer. */
	probe(v) {
		const S = new Set(v.guvenli);
		const mines = v.alan.filter((i) => !S.has(i));
		return { good: { taps: v.guvenli.map((i) => PROV[i].id) }, bad: { taps: [v.guvenli[0], ...mines.slice(0, 2)].map((i) => PROV[i].id) } };
	},
	judge(v, value) {
		const r = sonuc(v, value?.taps);
		return { correct: r.all, err: -r.ok.length + 0.25 * r.boom.length, score: r.ok.length };
	},
	bot(v, skill, R) {
		// bilinen güvenli iller önce (aralarına beceriye göre "güvenli sanılan" mayınlar karışır); sonra bilinmeyenler için
		// tahmin (acemi daha çok tahmin eder). İkinci mayında durur.
		const S = new Set(v.guvenli);
		const mines = v.alan.filter((i) => !S.has(i));
		const p = clamp(pCorrect(skill, v.q.diff) + 0.1, 0.15, 0.97);
		const known = shuffle(v.guvenli.filter(() => R() < p), R);
		const fooled = mines.filter(() => R() < (1 - p) * 0.4);
		const seq = known.slice();
		for (const m of fooled) seq.splice(Math.floor(R() * (seq.length + 1)), 0, m);
		if (R() < 0.3 + 0.5 * (1 - skill)) {
			const rest = shuffle([...v.guvenli.filter((i) => !known.includes(i)), ...mines.filter((m) => !fooled.includes(m))], R);
			seq.push(...rest.slice(0, Math.ceil(rest.length * (0.3 + 0.4 * R()))));
		}
		const taps = [];
		let boom = 0;
		for (const i of seq) {
			taps.push(PROV[i].id);
			if (!S.has(i) && ++boom >= CAN) break;
		}
		const f = Math.min(1, taps.length / Math.max(1, v.guvenli.length + 1));
		const time = clamp(botTime(v, R, skill, 0.2 + 0.45 * f, 0.55 + 0.45 * f), 1.5, v.sec || 30);
		return { value: { taps }, time };
	},
};
