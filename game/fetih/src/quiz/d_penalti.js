// PENALTI (YENİ 10 · grup 4): dört şıklı soru, kalenin dört köşesine dağılır (sol üst, sağ üst, sol alt, sağ alt).
// Her köşede bir hedef levhası şıkkı taşır; oyuncu köşeye dokunup şutu çeker. Kaleci rakiptir: başı rakibin portresi,
// forması rakibin rengi. Gece maçı, karlı derbi ya da akşam finali (soru verisindeki `hava`).
//
// İmza anı: dokununca top kalkar ve ağır çekime girer (kamera kaleye yaklaşır, stat susar). Cevap açılınca zaman geri
// gelir: top falsoyla senin köşene kıvrılır, kaleci RAKİBİN KENDİ seçtiği köşeye uçar.
//   doğru  → GOL: ağ dalgalanır, tribünde flaşlar patlar, konfeti yağar (kaleci aynı köşeye uçtuysa eldivenini sıyırır)
//   yanlış → kaleci aynı köşedeyse KURTARDI (top eldivende kalır); değilse DİREK, ÜSTTEN AUT ya da AUT
// Puan sıradan ve adil: doğru cevap goldür (tür 'exact'). 2–4 oyuncuda herkesin şutu, portreli top işaretiyle köşesinin
// dışında durur (üst köşeler üst direğin üstünde, alt köşeler kale çizgisinin altında): hiçbiri levha yazısına binmez.
//
// Veri: choice ile aynı { q, a: [doğru, y1, y2, y3], hava?: 'gece' | 'kar' | 'aksam' }. Görünüm { q, opts, right, hava }.
// Değer: köşe sırası 0..3 (opts sırası: 0 sol üst, 1 sağ üst, 2 sol alt, 3 sağ alt).
// Jokerler (tipin kendi etkisi, T.joker): yarı yarıya → iki yanlış köşeye bant çekilir; seyirci → köşe başına oy.
// Çevrimiçi: publicView doğru köşeyi (right) ve verideki şık sırasını (q.a) siler; ağ, kaleci ve top cevap ekranında
// (sonuçlar gelince) oynar. Yazılar kendi sığdırıcısıyla levhaya sığar (320 px'te 26 harflik şık üç satıra iner).

import { css, esc, shuffle, pCorrect, buzz, heceli, clamp } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, stampLater, onClose, onOpen, sfx, LOOK } from './d_ortak.js';
import { clock, setTimeout, clearTimeout } from '../core/clock.js';

const CORNER = ['tl', 'tr', 'bl', 'br'];
const LETTER = ['A', 'B', 'C', 'D'];
const LCOL = ['#2f7bff', '#ff8a1f', '#22c46a', '#a24bff']; // arena şık harflerinin renkleri (styles-arena .fl-opt>i)
const HAVA = ['gece', 'kar', 'aksam'];

/** Küçük, belirlenimci rastgele (tribün dizilişi soruya göre sabit; her açılışta aynı). */
function rngOf(s) {
	let h = 2166136261;
	for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
	return () => {
		h = (h + 0x6d2b79f5) | 0;
		let t = Math.imul(h ^ (h >>> 15), 1 | h);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const f1 = (x) => (Math.round(x * 10) / 10).toString();
const ease = (t) => 1 - Math.pow(1 - t, 2.2);
const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// ---------------------------------------------------------------- stil
const CSS = /* css */ `
.yn-pk{position:relative;flex:1 1 auto;min-height:198px;display:flex;flex-direction:column;user-select:none;-webkit-user-select:none;--cc2:var(--cc,#ff8a1e)}
.pk-st{position:relative;flex:1 1 auto;min-height:198px;border-radius:16px;overflow:hidden;isolation:isolate;background:#060b22;
  box-shadow:0 0 0 2px rgba(255,255,255,.13),0 14px 30px rgba(0,0,0,.55)}
.pk-cam{position:absolute;inset:0;transform-origin:50% 46%;transition:transform .9s cubic-bezier(.2,.8,.25,1)}
.yn-pk.slow .pk-cam{transform:scale(1.045)}
.pk-bg{position:absolute;inset:0;width:100%;height:100%;z-index:0}
.pk-bg .fl{opacity:0;transform-box:fill-box;transform-origin:50% 50%;animation:pkFlash 3.2s ease-out infinite}
.pk-bg .crowd{transform-box:fill-box;transform-origin:50% 100%}
.yn-pk.roar .pk-bg .crowd{animation:pkJump .32s ease-in-out 4 alternate}
.yn-pk.roar .pk-bg .fl{animation:pkFlashB .9s ease-out 2}
.pk-bg .beam{mix-blend-mode:screen;animation:pkBeam 4.5s ease-in-out infinite alternate}
.pk-bg .led{transform-box:fill-box;animation:pkLed 2.4s linear infinite}
.pk-net{position:absolute;left:0;top:0;width:100%;height:100%;z-index:1;overflow:visible;pointer-events:none}
.pk-net .mesh{transform-box:view-box}
.pk-net .rip{fill:none;stroke:#fff;stroke-width:2;opacity:0}
.pk-snow{position:absolute;inset:0;z-index:4;pointer-events:none;overflow:hidden}
.pk-snow i{position:absolute;top:-8px;width:var(--s);height:var(--s);border-radius:50%;background:#fff;opacity:.85;box-shadow:0 0 4px rgba(255,255,255,.7);
  animation:pkSnow var(--d) linear var(--dl) infinite}
/* kaleci: gövde SVG, başı oyuncunun portresi. Levhaların altında durur (yazıya binmez); yalnız uçuşta öne geçer */
.pk-kp{position:absolute;z-index:3;transform-origin:50% 64%;pointer-events:none}
.pk-kp.fly{z-index:8}
.pk-kp .kp-in{position:absolute;inset:0;transform-origin:50% 100%;animation:pkIdle 1.7s ease-in-out infinite}
.yn-pk.slow .pk-kp .kp-in{animation:pkCrouch .5s ease-out forwards}
.pk-kp.dive .kp-in{animation:none}
.pk-kp svg.kp-fig{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.pk-kp .kp-arm{transform-box:view-box;transition:transform .18s cubic-bezier(.3,1.4,.5,1)}
.pk-kp .kp-arm.l{transform-origin:33px 57px;transform:rotate(18deg)}
.pk-kp .kp-arm.r{transform-origin:67px 57px;transform:rotate(-18deg)}
.pk-kp.reach .kp-arm.l{transform:rotate(168deg)}
.pk-kp.reach .kp-arm.r{transform:rotate(-168deg)}
.pk-kp.hold .kp-arm.l{transform:rotate(-38deg)}
.pk-kp.hold .kp-arm.r{transform:rotate(38deg)}
.pk-kp.sad .kp-arm.l{transform:rotate(4deg)}
.pk-kp.sad .kp-arm.r{transform:rotate(-4deg)}
.pk-kp .kp-ball{opacity:0;transition:opacity .1s}
.pk-kp.hold .kp-ball{opacity:1}
.pk-kp .kp-head{position:absolute;left:50%;top:0;width:40%;aspect-ratio:1;transform:translateX(-50%);border-radius:50%;overflow:hidden;
  box-shadow:0 0 0 2.5px #fff,0 0 0 4.5px var(--kc),0 4px 8px rgba(0,0,0,.5);background:var(--kc)}
.pk-kp .kp-head .fl-av{width:100%;height:100%;border:0;border-radius:0;box-shadow:none}
.pk-kp.sad .kp-head{transform:translateX(-50%) rotate(-9deg) translateY(4%)}
/* hedef levhaları: kalenin köşelerinde koyu cam pano, renkli kenar ve köşe harfi */
.pk-t{position:absolute;z-index:5;display:flex;align-items:center;justify-content:center;padding:5px 7px;border-radius:7px;text-align:center;
  background:linear-gradient(180deg,rgba(14,26,66,.9),rgba(7,13,38,.94));box-shadow:inset 0 0 0 2px var(--lc),inset 0 0 18px color-mix(in srgb,var(--lc) 35%,transparent),0 4px 10px rgba(0,0,0,.45);
  color:#fff;transition:transform .12s,box-shadow .2s,background .25s,opacity .25s,filter .25s}
.pk-t:not(:disabled):active{transform:scale(.96)}
.pk-t::before{content:'';position:absolute;inset:4px;border-radius:5px;pointer-events:none;opacity:.22;
  background:radial-gradient(circle at 50% 50%,transparent 0 18%,var(--lc) 19% 22%,transparent 23% 38%,var(--lc) 39% 42%,transparent 43%)}
.pk-t .pk-tx{position:relative;display:block;max-width:100%;max-height:100%;font:700 15px/1.08 'Fredoka',sans-serif;letter-spacing:-.005em;overflow-wrap:normal;word-break:normal;hyphens:manual;
  text-shadow:0 1px 0 rgba(0,0,0,.55)}
.pk-l{position:absolute;z-index:7;width:20px;height:20px;margin:-10px 0 0 -10px;display:grid;place-items:center;transform:skewX(-8deg);background:var(--lc);
  font:italic 900 14px/1 'Barlow Condensed','Lilita One',sans-serif;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.3);box-shadow:0 0 0 2px #fff,0 2px 4px rgba(0,0,0,.4);pointer-events:none}
.yn-pk.pick .pk-t:not(.aim){opacity:.62;filter:saturate(.6)}
.pk-t.aim{background:linear-gradient(180deg,color-mix(in srgb,var(--me) 55%,#0e1a42),color-mix(in srgb,var(--me) 30%,#070d26));
  box-shadow:inset 0 0 0 3px #fff,0 0 0 3px var(--me),0 0 22px color-mix(in srgb,var(--me) 75%,transparent)}
.pk-t.aim::after{content:'';position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;pointer-events:none;
  box-shadow:0 0 0 2px rgba(255,255,255,.9),inset 0 0 0 2px rgba(255,255,255,.5);animation:pkAim .9s ease-in-out infinite alternate}
.pk-t.gone{opacity:.16!important;pointer-events:none;filter:grayscale(1)}
.pk-t.gone::after{content:'';position:absolute;inset:-2px;border-radius:7px;pointer-events:none;
  background:repeating-linear-gradient(-35deg,rgba(255,210,90,.8) 0 7px,rgba(20,20,20,.8) 7px 14px);-webkit-mask:linear-gradient(transparent 38%,#000 38% 62%,transparent 62%);mask:linear-gradient(transparent 38%,#000 38% 62%,transparent 62%)}
.pk-t.ok{opacity:1!important;filter:none!important;background:linear-gradient(180deg,#38d46e,#159a46);box-shadow:inset 0 0 0 2.5px #fff,0 0 0 3px #7dff9a,0 0 26px rgba(90,255,140,.65)}
.pk-t.ok::before{opacity:0}
.pk-t.no{opacity:1!important;filter:none!important;background:linear-gradient(180deg,#e2503e,#a8231a);box-shadow:inset 0 0 0 2px rgba(255,255,255,.85),0 0 16px rgba(255,80,60,.45)}
.pk-t.no::before{opacity:0}
.pk-t.dim{opacity:.42!important}
.pk-t.hit{animation:pkHit .42s cubic-bezier(.3,1.6,.5,1)}
.pk-t .pk-pc{position:absolute;left:6px;right:6px;bottom:3px;height:4px;border-radius:2px;background:rgba(255,255,255,.14);overflow:hidden;pointer-events:none}
.pk-t .pk-pc i{position:absolute;inset:0;background:linear-gradient(90deg,#ff9cc8,#ec4f93);transform-origin:0 50%;transform:scaleX(var(--w));animation:flGrow .8s cubic-bezier(.2,.8,.3,1) both}
.pk-poll{position:absolute;z-index:7;padding:1px 7px;border-radius:8px;transform:translate(-50%,-50%);font:italic 900 13px/17px 'Barlow Condensed','Lilita One',sans-serif;color:#fff;background:#ec4f93;
  box-shadow:0 0 0 2px #fff,0 2px 0 rgba(0,0,0,.35);white-space:nowrap;pointer-events:none;animation:flPopIn .35s .2s cubic-bezier(.3,1.8,.5,1) both}
/* kale çerçevesi: direkler ve üst direk levhaların üstünde (levha içte, çerçeveye değmez) */
.pk-fr{position:absolute;z-index:6;pointer-events:none}
.pk-fr i{position:absolute;background:linear-gradient(90deg,#c9d2e2,#fff 38%,#fff 55%,#aab4c8);box-shadow:0 0 0 1.2px rgba(10,20,40,.55),0 3px 8px rgba(0,0,0,.45)}
.pk-fr i.bar{background:linear-gradient(180deg,#fff,#fff 45%,#b8c2d6)}
.pk-fr.shake{animation:pkPost .5s cubic-bezier(.36,.07,.19,.97)}
.pk-fr .snow{position:absolute;left:-2px;right:-2px;height:7px;top:-5px;border-radius:6px 6px 2px 2px;background:radial-gradient(circle at 10% 100%,#fff 0 5px,transparent 6px) 0 0/16px 7px repeat-x,#fff;opacity:.95;filter:drop-shadow(0 -1px 1px rgba(160,200,255,.7))}
.pk-ball{position:absolute;z-index:8;left:0;top:0;pointer-events:none;will-change:transform}
.pk-ball svg{width:100%;height:100%;overflow:visible}
.pk-ball.trail::before{content:'';position:absolute;inset:6%;border-radius:50%;box-shadow:0 0 14px 6px rgba(255,255,255,.45)}
.pk-shadow{position:absolute;z-index:2;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.55),rgba(0,0,0,0));pointer-events:none}
.pk-spot{position:absolute;z-index:1;border-radius:50%;background:#f4f8ff;opacity:.9;pointer-events:none}
.pk-hint{position:absolute;z-index:7;left:50%;transform:translate(-50%,-50%) skewX(-8deg);padding:3px 12px;white-space:nowrap;pointer-events:none;
  font:italic 900 13px/1.25 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.14em;color:#1a1200;background:var(--gold,#ffd25a);box-shadow:0 3px 0 rgba(0,0,0,.35);
  animation:pkHint 1.1s ease-in-out infinite alternate;transition:opacity .25s}
.yn-pk.pick .pk-hint,.yn-pk.rv .pk-hint{opacity:0}
.pk-tag{position:absolute;z-index:7;display:flex;align-items:center;gap:6px;height:26px;padding:0 10px 0 3px;transform:translateY(-50%) skewX(-8deg);border-radius:0;pointer-events:none;
  background:rgba(6,10,26,.82);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35)}
.pk-tag>*{transform:skewX(8deg)}
.pk-tag .fl-av{width:20px;height:20px;border-radius:5px;border-width:1.5px;box-shadow:none}
.pk-tag small{font:italic 800 10px/1 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:var(--tc,#ffd25a)}
.pk-tag b{font:italic 900 14px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.04em;color:#fff;white-space:nowrap;text-transform:uppercase}
.pk-tag.short b{display:none}
/* şut işaretleri (cevap): portreli top, oyuncu rengi halka, köşesinin dışında bir sırada */
.pk-mk{position:absolute;z-index:7;width:var(--mk);height:var(--mk);margin:calc(var(--mk) / -2) 0 0 calc(var(--mk) / -2);border-radius:50%;pointer-events:none;
  box-shadow:0 0 0 2.5px var(--c),0 0 0 4px rgba(255,255,255,.9),0 4px 8px rgba(0,0,0,.5);background:var(--c);animation:pkMk .42s var(--dl) cubic-bezier(.3,1.7,.5,1) both}
.pk-mk .fl-av{width:100%;height:100%;border:0;border-radius:50%;box-shadow:none}
.pk-mk.me{box-shadow:0 0 0 2.5px var(--c),0 0 0 4.5px #ffd25a,0 0 14px rgba(255,210,90,.8),0 4px 8px rgba(0,0,0,.5)}
.pk-mk>u{position:absolute;right:-5px;bottom:-4px;width:15px;height:15px;border-radius:50%;display:grid;place-items:center;background:#16c060;box-shadow:0 0 0 1.5px #fff;text-decoration:none}
.pk-mk>u.no{background:#ff3a2a}
.pk-mk>u.kp{background:#1a2a6a}
.pk-mk>u svg{width:9px;height:9px}
.pk-fx{position:absolute;inset:0;z-index:9;pointer-events:none;overflow:hidden}
.pk-fx .cf{position:absolute;top:-12px;width:var(--w);height:var(--h);background:var(--c);border-radius:1px;animation:pkConf var(--d) var(--dl) cubic-bezier(.25,.6,.4,1) both}
.pk-fx .rg{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:3px solid #fff;animation:pkRing .7s ease-out both}
.pk-flash{position:absolute;inset:0;z-index:9;pointer-events:none;background:radial-gradient(70% 60% at 50% 30%,rgba(255,255,255,.75),rgba(255,255,255,.1) 60%,transparent);animation:pkWhite .7s ease-out both}
.pk-call{position:absolute;z-index:9;left:50%;transform:translate(-50%,-50%);pointer-events:none;white-space:nowrap;font:400 48px/1 'Lilita One',sans-serif;letter-spacing:.02em;color:#ffd25a;
  -webkit-text-stroke:3px #5a2a00;paint-order:stroke fill;text-shadow:0 5px 0 #5a2a00,0 0 28px rgba(255,190,60,.7);animation:pkCall 1.45s cubic-bezier(.3,1.6,.5,1) both}
.pk-call.bad{color:#ff6a5a;-webkit-text-stroke-color:#5a0a06;text-shadow:0 5px 0 #5a0a06,0 0 24px rgba(255,60,40,.6)}
.pk-call.save{color:#9fd8ff;-webkit-text-stroke-color:#0a2a5a;text-shadow:0 5px 0 #0a2a5a,0 0 24px rgba(90,170,255,.7)}
.pk-vig{position:absolute;inset:0;z-index:4;pointer-events:none;opacity:0;transition:opacity .5s;background:radial-gradient(75% 70% at 50% 45%,transparent 55%,rgba(0,0,10,.6))}
.yn-pk.slow .pk-vig{opacity:1}
.yn-pk[data-hava=aksam] .pk-st{background:#2a1530}
@keyframes pkFlash{0%,86%{opacity:0;transform:scale(.4)}90%{opacity:1;transform:scale(1.4)}100%{opacity:0;transform:scale(.6)}}
@keyframes pkFlashB{0%{opacity:0}12%{opacity:1;transform:scale(1.6)}100%{opacity:0;transform:scale(.6)}}
@keyframes pkJump{to{transform:translateY(-3px)}}
@keyframes pkBeam{from{opacity:.55}to{opacity:.9}}
@keyframes pkLed{to{transform:translateX(-50%)}}
@keyframes pkSnow{from{transform:translate(0,0)}to{transform:translate(var(--x),calc(var(--H) + 16px))}}
@keyframes pkIdle{0%,100%{transform:translateX(0) translateY(0)}25%{transform:translateX(-3%) translateY(-1.5%)}50%{transform:translateX(0) translateY(0)}75%{transform:translateX(3%) translateY(-1.5%)}}
@keyframes pkCrouch{to{transform:scaleY(.93) scaleX(1.04)}}
@keyframes pkAim{from{transform:scale(.82);opacity:.55}to{transform:scale(1.08);opacity:1}}
@keyframes pkHit{0%{transform:scale(1)}30%{transform:scale(1.07) rotate(-1.5deg)}60%{transform:scale(.97) rotate(1deg)}100%{transform:none}}
@keyframes pkPost{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(3px)}30%,50%,70%{transform:translateX(-4px)}40%,60%{transform:translateX(4px)}}
@keyframes pkMk{0%{opacity:0;transform:translateY(calc(var(--fy,0px))) scale(.3)}100%{opacity:1;transform:none}}
@keyframes pkConf{0%{opacity:1;transform:translate(0,0) rotate(0)}85%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y)) rotate(var(--r))}}
@keyframes pkRing{0%{opacity:.95;transform:scale(.3)}100%{opacity:0;transform:scale(var(--s,4))}}
@keyframes pkWhite{0%{opacity:0}15%{opacity:1}100%{opacity:0}}
@keyframes pkCall{0%{opacity:0;transform:translate(-50%,-50%) scale(.3) rotate(-10deg)}22%{opacity:1;transform:translate(-50%,-50%) scale(1.18) rotate(-4deg)}70%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(-4deg)}100%{opacity:0;transform:translate(-50%,-62%) scale(1.06) rotate(-4deg)}}
@keyframes pkHint{from{transform:translate(-50%,-50%) skewX(-8deg) scale(1)}to{transform:translate(-50%,-50%) skewX(-8deg) scale(1.06)}}
@media (prefers-reduced-motion:reduce){.pk-kp .kp-in,.pk-bg .fl,.pk-bg .beam,.pk-snow i,.pk-hint{animation:none}}
`;

// ---------------------------------------------------------------- çizimler

/** Top (klasik siyah beyaz, gölgeli küre). id: kart başına tekil degrade adı. */
const ballSVG = (id) => `<svg viewBox="-50 -50 100 100" aria-hidden="true"><defs><radialGradient id="pkb${id}" cx="-.28" cy="-.32" r="1.05" fx="-.3" fy="-.34"><stop offset="0" stop-color="#fff"/><stop offset=".62" stop-color="#e9eef6"/><stop offset="1" stop-color="#8f99ad"/></radialGradient>
	<clipPath id="pkc${id}"><circle r="47"/></clipPath></defs>
	<g class="spin"><circle r="47" fill="url(#pkb${id})" stroke="#1b2133" stroke-width="3"/>
	<g clip-path="url(#pkc${id})" fill="#1b2133"><path d="M0-17 16-5 10 14H-10L-16-5z"/><path d="M0-47 12-38 8-27H-8L-12-38z"/><path d="M45-14 47 2 35 8 27-4 33-17z"/><path d="M28 38 16 47 8 40 12 27 25 26z"/><path d="M-28 38-16 47-8 40-12 27-25 26z"/><path d="M-45-14-47 2-35 8-27-4-33-17z"/></g>
	<g stroke="#1b2133" stroke-width="2.4" fill="none" clip-path="url(#pkc${id})"><path d="M0-17V-27M16-5 27-4M10 14 12 27M-10 14-12 27M-16-5-27-4"/></g></g>
	<ellipse cx="-16" cy="-22" rx="13" ry="8" fill="#fff" opacity=".55" transform="rotate(-30 -16 -22)"/></svg>`;

/** Kaleci gövdesi (100×150; başı ayrı HTML portre). Renkler: --kc forma, --kd koyu ton. */
const keeperSVG = (id) => `<svg class="kp-fig" viewBox="0 0 100 150" aria-hidden="true"><defs><linearGradient id="pkj${id}" x1="0" x2="1"><stop offset="0" stop-color="var(--kc)"/><stop offset=".62" stop-color="var(--kc)"/><stop offset="1" stop-color="var(--kd)"/></linearGradient></defs>
	<ellipse cx="50" cy="147" rx="27" ry="4" fill="rgba(0,0,0,.4)"/>
	<path d="M41 98 37 124 35 141" stroke="#e8c39e" stroke-width="10" stroke-linecap="round" fill="none"/><path d="M59 98 63 124 65 141" stroke="#e8c39e" stroke-width="10" stroke-linecap="round" fill="none"/>
	<path d="M37.5 117 35.6 140" stroke="var(--kd)" stroke-width="11" stroke-linecap="round"/><path d="M62.5 117 64.4 140" stroke="var(--kd)" stroke-width="11" stroke-linecap="round"/>
	<path d="M28 142q7-5 13 0l1 5H27zM72 142q-7-5-13 0l-1 5h15z" fill="#151a2a"/>
	<path d="M30 86h40l3 18H55l-5-6-5 6H27z" fill="#151a2a"/><path d="M30 86h40v4H30z" fill="var(--kd)"/>
	<g class="kp-arm l"><path d="M33 57 22 80 19 92" stroke="url(#pkj${id})" stroke-width="10.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="18.5" cy="95" r="7.5" fill="#d8f24a" stroke="#18220a" stroke-width="1.6"/><path d="M14 92h9" stroke="#18220a" stroke-width="1.4"/></g>
	<g class="kp-arm r"><path d="M67 57 78 80 81 92" stroke="url(#pkj${id})" stroke-width="10.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="81.5" cy="95" r="7.5" fill="#d8f24a" stroke="#18220a" stroke-width="1.6"/><path d="M77 92h9" stroke="#18220a" stroke-width="1.4"/></g>
	<path d="M31 52q19-9 38 0l4 36H27z" fill="url(#pkj${id})" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>
	<path d="M41 51q9 7 18 0" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
	<path d="M33 66h34M32 74h36" stroke="rgba(255,255,255,.22)" stroke-width="2.2"/>
	<path d="M48 61h6v20h-4V65l-3 1z" fill="rgba(255,255,255,.88)"/>
	<g class="kp-ball" transform="translate(50 71)"><circle r="10.5" fill="#f2f5fa" stroke="#1b2133" stroke-width="1.6"/><path d="M0-4 4-1 2.5 3.5h-5L-4-1z" fill="#1b2133"/></g>
	</svg>`;

const ICO = {
	ok: '<svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5 10-11" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
	no: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>',
	kp: '<svg viewBox="0 0 24 24"><path d="M6 13V7a1.5 1.5 0 0 1 3 0v4V5a1.5 1.5 0 0 1 3 0v6V6a1.5 1.5 0 0 1 3 0v6-3a1.5 1.5 0 0 1 3 0v6c0 4-3 7-7 7s-6-2.5-6-6z" fill="#d8f24a" stroke="#fff" stroke-width="1.2"/></svg>',
};

/** Sahne zemini (gökyüzü, ışık kuleleri, tribün, LED pano, saha): ölçülen boyda, bozulmadan çizilir. */
function bgSVG(L, hava, team, seed) {
	const { W, H, gx, gw, gy, gb } = L;
	const R = rngOf(seed);
	const sky = hava === 'aksam'
		? '<stop offset="0" stop-color="#1c1240"/><stop offset=".45" stop-color="#6a2a6a"/><stop offset=".8" stop-color="#ff7a4a"/><stop offset="1" stop-color="#ffb46a"/>'
		: hava === 'kar'
			? '<stop offset="0" stop-color="#0a1430"/><stop offset=".6" stop-color="#1e3460"/><stop offset="1" stop-color="#3a5a8a"/>'
			: '<stop offset="0" stop-color="#050a26"/><stop offset=".55" stop-color="#0e1d55"/><stop offset="1" stop-color="#22357a"/>';
	const standTop = Math.max(6, gy - Math.min(46, H * 0.16));
	const standBot = gb - (gb - gy) * 0.34; // tribünün dibi kalenin arkasında (LED pano)
	// tribün katları: yüzler (küçük daireler), arada atkılar (iki oyuncunun renkleri)
	const rows = Math.max(3, Math.min(9, Math.round((standBot - standTop) / 11)));
	const rh = (standBot - standTop) / rows;
	const pal = hava === 'aksam' ? ['#2a1830', '#3a2238', '#4a2a3a', '#20142a'] : ['#1a2550', '#243166', '#2e3a74', '#141d44', '#38407a'];
	let heads = '';
	let flash = '';
	for (let r = 0; r < rows; r++) {
		const y = standTop + rh * (r + 0.62);
		const sz = rh * (0.3 + 0.06 * (r / rows));
		const step = sz * 2.25;
		heads += `<rect x="0" y="${f1(standTop + rh * r + rh * 0.78)}" width="${W}" height="${f1(rh * 0.22 + 0.5)}" fill="rgba(0,0,0,.35)"/>`;
		for (let x = -R() * step; x < W + step; x += step * (0.85 + R() * 0.3)) {
			const tc = R() < 0.18 ? team[R() < 0.5 ? 0 : 1] : pal[Math.floor(R() * pal.length)];
			heads += `<circle cx="${f1(x)}" cy="${f1(y + (R() - 0.5) * rh * 0.2)}" r="${f1(sz)}" fill="${tc}"/>`;
			if (R() < 0.05) flash += `<circle class="fl" cx="${f1(x)}" cy="${f1(y - sz)}" r="${f1(Math.max(1.6, sz * 0.7))}" fill="#fff" style="animation-delay:${f1(R() * 3.2)}s;animation-duration:${f1(2.4 + R() * 2.4)}s"/>`;
		}
	}
	// ışık kuleleri ve huzmeleri (gece, kar); akşamda güneş
	const lamp = (x, side) => {
		const y = Math.max(4, standTop - 2);
		const w = Math.min(46, W * 0.13);
		let dots = '';
		for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) dots += `<circle cx="${f1(x + (i + 0.5) * (w / 4) - w / 2)}" cy="${f1(y + 3 + j * 5)}" r="1.7" fill="#fffbe6"/>`;
		const bx = x + side * -W * 0.35;
		return `<path class="beam" d="M${f1(x - w / 2)} ${f1(y + 6)} L${f1(x + w / 2)} ${f1(y + 6)} L${f1(bx + W * 0.18)} ${f1(gb)} L${f1(bx - W * 0.18)} ${f1(gb)}Z" fill="url(#pkbm${seed})" opacity=".7"/>
			<rect x="${f1(x - w / 2 - 2)}" y="${f1(y - 1)}" width="${f1(w + 4)}" height="14" rx="2" fill="#2a3352"/>${dots}<circle cx="${f1(x)}" cy="${f1(y + 6)}" r="${f1(w * 0.7)}" fill="url(#pkgl${seed})"/>`;
	};
	const lights = hava === 'aksam'
		? `<circle cx="${f1(W * 0.78)}" cy="${f1(standTop + 6)}" r="${f1(W * 0.09)}" fill="#ffe0a0" opacity=".9"/><circle cx="${f1(W * 0.78)}" cy="${f1(standTop + 6)}" r="${f1(W * 0.3)}" fill="url(#pkgl${seed})" opacity=".8"/>`
		: lamp(W * 0.12, -1) + lamp(W * 0.88, 1);
	const stars = hava === 'aksam' ? '' : Array.from({ length: 18 }, (_, i) => `<circle cx="${f1((i * 97.3) % W)}" cy="${f1(((i * 41.7) % Math.max(8, standTop - 4)) + 2)}" r="${i % 3 ? 0.7 : 1.1}" fill="#fff" opacity="${0.25 + (i % 4) * 0.12}"/>`).join('');
	// LED pano: kalenin arkasında, ağın ardından görünür
	const ledY = standBot - 2;
	const ledH = Math.max(6, (gb - gy) * 0.1);
	const led = `<rect x="0" y="${f1(ledY)}" width="${W}" height="${f1(ledH)}" fill="#0a0f24"/><g clip-path="url(#pkld${seed})"><g class="led"><rect x="0" y="${f1(ledY + 1)}" width="${W * 2}" height="${f1(ledH - 2)}" fill="url(#pkle${seed})"/></g></g>`;
	// saha: kale çizgisinin önü; biçme şeritleri yakına doğru kalınlaşır (perspektif)
	const grassA = hava === 'kar' ? '#5e8f6e' : hava === 'aksam' ? '#3d7a34' : '#2c7a38';
	const grassB = hava === 'kar' ? '#557f63' : hava === 'aksam' ? '#356c2e' : '#256b31';
	let grass = `<rect x="0" y="${f1(ledY + ledH)}" width="${W}" height="${f1(H - ledY - ledH)}" fill="${grassB}"/>`;
	let y0 = ledY + ledH;
	let hh = Math.max(3, (gb - y0) * 0.5);
	for (let k = 0; y0 < H; k++) {
		if (k % 2 === 0) grass += `<rect x="0" y="${f1(y0)}" width="${W}" height="${f1(hh + 0.5)}" fill="${grassA}"/>`;
		y0 += hh;
		hh *= 1.32;
	}
	const ln = 'rgba(255,255,255,.82)';
	const six = (gb + (H - gb) * 0.42).toFixed(1);
	const lines = `<path d="M0 ${f1(gb)}H${W}" stroke="${ln}" stroke-width="2"/>
		<path d="M${f1(gx - gw * 0.32)} ${f1(gb)} L${f1(gx - gw * 0.5)} ${six} H${f1(gx + gw * 1.5)} L${f1(gx + gw * 1.32)} ${f1(gb)}" fill="none" stroke="${ln}" stroke-width="2.2"/>`;
	const snowPatch = hava === 'kar' ? Array.from({ length: 16 }, () => `<ellipse cx="${f1(R() * W)}" cy="${f1(gb + R() * (H - gb))}" rx="${f1(6 + R() * 16)}" ry="${f1(2 + R() * 4)}" fill="#fff" opacity="${f1(0.18 + R() * 0.25)}"/>`).join('') : '';
	return `<svg class="pk-bg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs>
		<linearGradient id="pksk${seed}" x1="0" y1="0" x2="0" y2="1">${sky}</linearGradient>
		<linearGradient id="pkbm${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe0" stop-opacity=".55"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/></linearGradient>
		<radialGradient id="pkgl${seed}"><stop offset="0" stop-color="#fff8d8" stop-opacity=".9"/><stop offset="1" stop-color="#fff8d8" stop-opacity="0"/></radialGradient>
		<linearGradient id="pkle${seed}" x1="0" x2="1"><stop offset="0" stop-color="var(--cc2)"/><stop offset=".125" stop-color="#ffd25a"/><stop offset=".25" stop-color="var(--cc2)"/><stop offset=".375" stop-color="#ffffff"/><stop offset=".5" stop-color="var(--cc2)"/><stop offset=".625" stop-color="#ffd25a"/><stop offset=".75" stop-color="var(--cc2)"/><stop offset=".875" stop-color="#ffffff"/><stop offset="1" stop-color="var(--cc2)"/></linearGradient>
		<clipPath id="pkld${seed}"><rect x="0" y="${f1(ledY)}" width="${W}" height="${f1(ledH)}"/></clipPath>
		</defs>
		<rect width="${W}" height="${H}" fill="url(#pksk${seed})"/>${stars}
		<path d="M0 ${f1(standTop)} Q${f1(W / 2)} ${f1(standTop - 10)} ${W} ${f1(standTop)} V${f1(standBot)} H0Z" fill="${hava === 'aksam' ? '#24142e' : '#0b1230'}"/>
		<g class="crowd">${heads}</g>${flash}${lights}${led}${grass}${snowPatch}${lines}</svg>`;
}

/** Ağ (arka ağ ve yan ağlar, baklava örgüsü) ve dalga halkaları. */
function netSVG(L, seed) {
	const { W, H, gx, gy, gw, gh, gb } = L;
	const bx0 = gx + gw * 0.07;
	const bx1 = gx + gw * 0.93;
	const by0 = gy + gh * 0.1;
	const by1 = gb - gh * 0.12;
	const m = Math.max(7, gw / 34);
	return `<svg class="pk-net" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs>
		<pattern id="pkm${seed}" width="${f1(m)}" height="${f1(m)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0H${f1(m)}M0 0V${f1(m)}" stroke="rgba(255,255,255,.42)" stroke-width="1.1"/></pattern>
		<pattern id="pkm2${seed}" width="${f1(m * 0.8)}" height="${f1(m * 0.8)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0H${f1(m)}M0 0V${f1(m)}" stroke="rgba(255,255,255,.28)" stroke-width="1"/></pattern>
		</defs>
		<g class="mesh">
		<path d="M${f1(gx)} ${f1(gy)} L${f1(bx0)} ${f1(by0)} L${f1(bx0)} ${f1(by1)} L${f1(gx)} ${f1(gb)}Z" fill="rgba(4,8,24,.35)"/>
		<path d="M${f1(gx + gw)} ${f1(gy)} L${f1(bx1)} ${f1(by0)} L${f1(bx1)} ${f1(by1)} L${f1(gx + gw)} ${f1(gb)}Z" fill="rgba(4,8,24,.35)"/>
		<path d="M${f1(gx)} ${f1(gy)} L${f1(bx0)} ${f1(by0)} H${f1(bx1)} L${f1(gx + gw)} ${f1(gy)}Z" fill="url(#pkm2${seed})"/>
		<path d="M${f1(gx)} ${f1(gy)} L${f1(bx0)} ${f1(by0)} L${f1(bx0)} ${f1(by1)} L${f1(gx)} ${f1(gb)}Z" fill="url(#pkm2${seed})"/>
		<path d="M${f1(gx + gw)} ${f1(gy)} L${f1(bx1)} ${f1(by0)} L${f1(bx1)} ${f1(by1)} L${f1(gx + gw)} ${f1(gb)}Z" fill="url(#pkm2${seed})"/>
		<rect class="back" x="${f1(bx0)}" y="${f1(by0)}" width="${f1(bx1 - bx0)}" height="${f1(by1 - by0)}" fill="url(#pkm${seed})"/>
		<path d="M${f1(bx0)} ${f1(by1)} L${f1(gx)} ${f1(gb)} M${f1(bx1)} ${f1(by1)} L${f1(gx + gw)} ${f1(gb)} M${f1(bx0)} ${f1(by0)} V${f1(by1)} H${f1(bx1)} V${f1(by0)}" stroke="rgba(255,255,255,.5)" stroke-width="1.4" fill="none"/>
		</g><circle class="rip a" r="6"/><circle class="rip b" r="6"/></svg>`;
}

// ---------------------------------------------------------------- tip

/** Kaçan şutun biçimi (yanlış cevap, kaleci başka köşede): üst köşede üst direk ya da üstten aut, altta direk ya da aut. */
function missOf(c, key) {
	const h = rngOf(key)();
	if (c < 2) return h < 0.5 ? 'direk' : 'ust';
	return h < 0.5 ? 'direk' : 'aut';
}
const CALL = { gol: ['GOL!', ''], kurtardi: ['KURTARDI!', 'save'], direk: ['DİREK!', 'bad'], ust: ['ÜSTTEN AUT!', 'bad'], aut: ['AUT!', 'bad'] };

let UID = 0;

export const penalti = {
	time: 20,
	label: 'Penaltı',
	kind: 'exact',
	cover: true, // tam ekran stadyum (harita gizli)
	revealMs: 3600, // cevap filmi: şut, kalecinin uçuşu, gol ya da kaçan top, herkesin şut işareti
	jokers: ['yari', 'kahin'],
	prepare(q, R) {
		const order = shuffle([0, 1, 2, 3], R);
		const v = { q, opts: order.map((i) => q.a[i]), right: order.indexOf(0), hava: HAVA.includes(q.hava) ? q.hava : 'gece' };
		// iş: soru + dört levha (şık yazıları ve köşeler arası bakış), sahneye bir bakış (kaleci, top), köşeye dokun
		return stamp(v, q, (q2, k, P, text) => {
			for (const o of q.a) text(o);
			return { look: LOOK.orient + 5 * LOOK.gaze };
		});
	},
	/** Çevrimiçi görünüm: doğru köşe ve verideki şık sırası yok. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.right;
		delete o.q.a;
		return o;
	},
	judge(v, value) {
		const ok = Number.isInteger(value) && value === v.right;
		return { correct: ok, err: ok ? 0 : 1 };
	},
	bot(v, skill, R) {
		const ok = R() < pCorrect(skill, v.q.diff);
		let value = v.right;
		if (!ok) do value = Math.floor(R() * 4); while (value === v.right);
		return { value, time: botTime(v, R, skill, 0.05, 0.8) };
	},
	/** Sınama örneği (test/deneme.test.mjs): doğru köşe ve yanındaki köşe. */
	ornek(v) {
		return { good: v.right, bad: (v.right + 1) % 4 };
	},
	joker(id, v, R) {
		if (id === 'yari') {
			const wrong = shuffle([0, 1, 2, 3].filter((i) => i !== v.right), R);
			return { hide: wrong.slice(0, 2).sort((a, b) => a - b) };
		}
		if (id === 'kahin') {
			// seyirci: doğru köşeye %42–78 (zor soruda daha az), ara sıra (%12) kalabalık yanılır
			const d = clamp(Number(v.q.diff) || 2, 1, 3);
			let pr = 0.42 + R() * 0.2 + (3 - d) * 0.08;
			let top = v.right;
			if (R() < 0.12) do top = Math.floor(R() * 4); while (top === v.right);
			const w = [0, 1, 2, 3].map((i) => (i === top ? 0 : 0.35 + R()));
			const s = w.reduce((a, b) => a + b, 0) || 1;
			const pct = w.map((x) => Math.round((x / s) * (100 - Math.round(pr * 100))));
			pct[top] = 100 - pct.reduce((a, b) => a + b, 0);
			return { pct };
		}
		return null;
	},
	mount(el, v, api) {
		css('penalti', CSS);
		const app = appOf();
		const card = el.closest('.fl-q');
		const m = app?.match;
		const cur = m?.cur && m.cur.v === v ? m.cur : null;
		const ctx = cur?.ctx || {};
		const id = ++UID;
		// oyuncular: kartın afişindeki plakalardan (portre, ad, renk); şutçu insan, kaleci onun rakibi
		const plates = [...(card?.querySelectorAll('.fl-qwho .fl-qp[data-p]') || [])];
		const P = plates.map((e) => {
			const i = Number(e.dataset.p);
			const p = m?.players?.[i];
			return { i, p, name: p?.name || e.querySelector('.nm b')?.textContent || '', color: p?.css || getComputedStyle(e).getPropertyValue('--pc').trim() || '#888', av: e.querySelector('.fl-av')?.outerHTML || '', human: !!p?.human, team: p?.team, score: p?.score || 0 };
		});
		if (!P.length) P.push({ i: -1, name: 'Sen', color: '#e8343c', av: '', human: true }, { i: -2, name: 'Kaleci', color: '#2f6bff', av: '', human: false });
		const shooter = P.find((x) => x.human) || P.find((x) => x.i === ctx.attacker?.i) || P[0];
		const duel = !!(ctx.attacker && ctx.defender);
		let keeper = null;
		if (duel) keeper = P.find((x) => x !== shooter && (x.i === ctx.defender.i || x.i === ctx.attacker.i));
		if (!keeper) {
			const foes = P.filter((x) => x !== shooter && (m?.mode?.teams && shooter.team != null ? x.team !== shooter.team : true));
			keeper = (foes.length ? foes : P.filter((x) => x !== shooter)).slice().sort((a, b) => b.score - a.score)[0] || null;
		}
		const kc = keeper?.color || '#2f6bff';
		const human = P.some((x) => x.human);
		el.innerHTML = `<div class="yn-pk" data-hava="${v.hava}" style="--me:${esc(shooter.color)};--kc:${esc(kc)};--kd:color-mix(in srgb,${esc(kc)} 58%,#000)">
			<div class="pk-st"><div class="pk-cam">
				<div class="pk-bgw"></div><div class="pk-netw"></div>${v.hava === 'kar' ? '<div class="pk-snow"></div>' : ''}
				<div class="pk-spot"></div><div class="pk-shadow"></div>
				<div class="pk-kp"><div class="kp-in">${keeperSVG(id)}<div class="kp-head">${keeper?.av || ''}</div></div></div>
				${v.opts.map((o, i) => `<button class="pk-t ${CORNER[i]}" data-i="${i}" style="--lc:${LCOL[i]}" aria-label="${LETTER[i]}: ${esc(o)}"><b class="pk-tx">${heceli(o)}</b></button>`).join('')}
				<div class="pk-fr"><i class="post l"></i><i class="post r"></i><i class="bar">${v.hava === 'kar' ? '<s class="snow"></s>' : ''}</i></div>
				${LETTER.map((x, i) => `<span class="pk-l" style="--lc:${LCOL[i]}">${x}</span>`).join('')}
				<div class="pk-ball">${ballSVG(id)}</div>
				${human ? '<span class="pk-hint">KÖŞENİ SEÇ</span>' : ''}
				${keeper ? `<span class="pk-tag k" style="--tc:${esc(kc)}">${keeper.av}<small>KALECİ</small><b>${esc(keeper.name)}</b></span>` : ''}
				<div class="pk-vig"></div><div class="pk-fx"></div>
			</div></div></div>`;
		const root = el.querySelector('.yn-pk');
		const st = root.querySelector('.pk-st');
		const camEl = root.querySelector('.pk-cam');
		const kp = root.querySelector('.pk-kp');
		const ball = root.querySelector('.pk-ball');
		const shadow = root.querySelector('.pk-shadow');
		const spot = root.querySelector('.pk-spot');
		const tiles = [...root.querySelectorAll('.pk-t')];
		const chips = [...root.querySelectorAll('.pk-l')];
		const fr = root.querySelector('.pk-fr');
		const fx = root.querySelector('.pk-fx');
		const hint = root.querySelector('.pk-hint');
		const tagK = root.querySelector('.pk-tag.k');
		const timers = [];
		const later = (fn, ms) => timers.push(setTimeout(fn, ms));
		let L = null;
		let done = false;
		let revealed = false;
		let mine = null;
		let alive = true;
		let flight = null; // ağır çekim: { u, t0, raf }
		let pollPct = null;

		// ------------------------------------------------------------ yerleşim (ölçülen sahne boyuna göre)
		const place = (e, x, y, w, h) => {
			e.style.left = f1(x) + 'px';
			e.style.top = f1(y) + 'px';
			if (w != null) e.style.width = f1(w) + 'px';
			if (h != null) e.style.height = f1(h) + 'px';
		};
		const layout = () => {
			const W = st.clientWidth;
			const H = st.clientHeight;
			if (!W || !H || (L && L.W === W && L.H === H)) return;
			const pad = clamp(Math.round(W * 0.03), 6, 14);
			const laneT = clamp(Math.round(H * 0.12), 26, 44);
			const laneB = clamp(Math.round(H * 0.11), 26, 40);
			const ballZ = clamp(Math.round(H * 0.2), 42, 130);
			const gw = Math.min(W - 2 * pad, 560);
			const gh = Math.max(104, Math.min(gw * 0.6, H - laneT - laneB - ballZ));
			const extra = Math.max(0, H - laneT - laneB - ballZ - gh);
			const gy = Math.round(laneT + extra * 0.42);
			const gx = Math.round((W - gw) / 2);
			const gb = gy + gh;
			const pt = clamp(Math.round(gw * 0.024), 5, 12);
			const ix = gx + pt;
			const iy = gy + pt;
			const iw = gw - 2 * pt;
			const ih = gh - pt;
			const cg = clamp(Math.round(iw * 0.2), 54, 112);
			const mg = clamp(Math.round(ih * 0.07), 6, 18);
			const ins = clamp(Math.round(iw * 0.016), 3, 8);
			const pw = (iw - cg - 2 * ins) / 2;
			const ph = (ih - mg - 2 * ins) / 2;
			const pan = [
				{ x: ix + ins, y: iy + ins },
				{ x: ix + iw - ins - pw, y: iy + ins },
				{ x: ix + ins, y: iy + ih - ins - ph },
				{ x: ix + iw - ins - pw, y: iy + ih - ins - ph },
			].map((p) => ({ ...p, w: pw, h: ph, cx: p.x + pw / 2, cy: p.y + ph / 2 }));
			const kh = ih * 0.9;
			const kw = kh * (100 / 150);
			const bs = clamp(Math.round(Math.min(W * 0.1, ballZ * 0.62)), 26, 54);
			const by = gb + laneB + (H - gb - laneB) * 0.5;
			L = { W, H, pad, laneT, laneB, gx, gy, gw, gh, gb, pt, ix, iy, iw, ih, cg, pan, kw, kh, kx: W / 2 - kw / 2, ky: gb - kh, bs, bx: W / 2, by, mk: clamp(Math.round(W * 0.082), 24, 34) };
			root.style.setProperty('--mk', L.mk + 'px');
			root.querySelector('.pk-bgw').innerHTML = bgSVG(L, v.hava, [shooter.color, kc], `${v.q.id || 'pk'}${id}`);
			root.querySelector('.pk-netw').innerHTML = netSVG(L, `${id}`);
			const snow = root.querySelector('.pk-snow');
			if (snow) {
				const R = rngOf(v.q.id || 'kar');
				snow.style.setProperty('--H', H + 'px');
				snow.innerHTML = Array.from({ length: 34 }, () => `<i style="left:${f1(R() * W)}px;--s:${f1(1.6 + R() * 2.6)}px;--d:${f1(3.4 + R() * 3)}s;--dl:${f1(-R() * 6)}s;--x:${f1((R() - 0.5) * 40)}px"></i>`).join('');
			}
			tiles.forEach((t, i) => place(t, pan[i].x, pan[i].y, pan[i].w, pan[i].h));
			const cx = [gx, gx + gw, gx, gx + gw];
			chips.forEach((c, i) => place(c, cx[i] + (i % 2 ? -pt / 2 : pt / 2), i < 2 ? gy + pt / 2 : gb - pt * 0.2 - 12));
			place(fr, gx, gy, gw, gh);
			const [pl, pr, bar] = fr.children;
			place(pl, 0, 0, pt, gh);
			place(pr, gw - pt, 0, pt, gh);
			place(bar, 0, 0, gw, pt);
			place(kp, L.kx, L.ky, kw, kh);
			if (!flight && !revealed) setBall(bs, L.bx, by, 1, 0);
			place(spot, L.bx - bs * 0.42, by + bs * 0.32, bs * 0.84, bs * 0.26);
			if (hint) place(hint, W / 2, laneT * 0.5 + 2);
			if (tagK) {
				// kalecinin künyesi topun solunda; sığmazsa yalnız portre ve KALECİ (top yazının üstüne binmesin)
				tagK.classList.remove('short');
				tagK.style.left = f1(Math.max(6, gx)) + 'px';
				tagK.style.top = f1(Math.min(H - 16, by + bs * 0.05)) + 'px';
				if (tagK.offsetLeft + tagK.offsetWidth > W / 2 - bs * 0.62 - 6) tagK.classList.add('short');
			}
			fit();
			if (pollPct) poll(pollPct);
		};
		/** Top: konum (merkez), ölçek, dönüş; gölgesi yerde (kale çizgisine doğru küçülür). */
		const setBall = (s, x, y, k, rot, sh = true) => {
			const d = s * k;
			ball.style.width = ball.style.height = s + 'px';
			ball.style.transform = `translate(${f1(x - s / 2)}px,${f1(y - s / 2)}px) scale(${k.toFixed(3)})`;
			const g = ball.querySelector('.spin');
			if (g) g.setAttribute('transform', `rotate(${Math.round(rot)})`);
			if (sh && L) {
				const gy0 = L.by + L.bs * 0.42;
				const t = clamp((L.by - y) / Math.max(1, L.by - L.gy), 0, 1);
				const yy = gy0 + (L.gb - gy0) * Math.min(1, t * 1.1);
				const w = d * 0.95;
				place(shadow, x - w / 2, yy - w * 0.14, w, w * 0.28);
				shadow.style.opacity = String(1 - t * 0.6);
			}
		};

		// ------------------------------------------------------------ levha yazısı: kutuya sığan en büyük boy
		const fit = () => {
			for (const t of tiles) {
				const tx = t.querySelector('.pk-tx');
				if (!tx || !t.clientWidth) continue;
				const maxW = t.clientWidth - 12;
				const maxH = t.clientHeight - 9;
				const hi = clamp(Math.min(t.clientHeight * 0.36, t.clientWidth * 0.17), 11, 21);
				const over = () => tx.scrollWidth > maxW + 0.5 || tx.offsetHeight > maxH + 0.5;
				let lo = 8.5;
				let up = hi;
				tx.style.fontSize = up + 'px';
				if (!over()) continue;
				for (let k = 0; k < 9 && up - lo > 0.4; k++) {
					const mid = (lo + up) / 2;
					tx.style.fontSize = mid + 'px';
					if (over()) up = mid;
					else lo = mid;
				}
				tx.style.fontSize = Math.floor(lo * 2) / 2 + 'px';
			}
		};
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => layout()) : null;
		ro?.observe(st);
		layout();
		requestAnimationFrame(layout);
		document.fonts?.ready?.then(() => {
			if (alive) fit();
		});

		// ------------------------------------------------------------ şut: kalkış, ağır çekim, devam
		/** Uçuş yolu (ikinci derece Bezier, falso): yan sapmayla başlar, köşeye kıvrılır. */
		const pathTo = (tx, ty) => {
			const side = tx < L.bx ? -1 : 1;
			const cx = L.bx + (tx - L.bx) * 0.08 - side * L.W * 0.16;
			const cy = L.by + (ty - L.by) * 0.78;
			return { x0: L.bx, y0: L.by, cx, cy, x1: tx, y1: ty };
		};
		const at = (p, u) => ({ x: (1 - u) * (1 - u) * p.x0 + 2 * u * (1 - u) * p.cx + u * u * p.x1, y: (1 - u) * (1 - u) * p.y0 + 2 * u * (1 - u) * p.cy + u * u * p.y1 });
		const kOf = (u, k1) => 1 + (k1 - 1) * Math.pow(u, 0.85);
		const K1 = 0.42; // kale düzlemindeki ölçek
		/** Kalkış (dokununca): top u=0.22'ye fırlar, sonra ağır çekimde süzülür (cevap gelene dek). */
		const kick = (c) => {
			if (!L || flight) return;
			const t = L.pan[c];
			const path = pathTo(t.cx, t.cy);
			flight = { u: 0, t0: clock.now(), path, raf: 0, c, fast: null };
			ball.classList.add('trail');
			sfx(app, 'tap', { rate: 0.55 });
			sfx(app, 'whoosh');
			buzz(14);
			const step = () => {
				if (!alive || !flight || flight.fast) return;
				const s = (clock.now() - flight.t0) / 1000;
				flight.u = s < 0.24 ? 0.24 * ease(s / 0.24) : 0.24 + 0.1 * (1 - Math.exp(-(s - 0.24) / 2.2));
				const p = at(flight.path, flight.u);
				setBall(L.bs, p.x, p.y, kOf(flight.u, K1), s * 140);
				flight.raf = requestAnimationFrame(step);
			};
			flight.raf = requestAnimationFrame(step);
		};
		/** Kalan uçuş: u'dan 1'e (hedef cevaba göre), sonra çarpma. */
		const fly = (path, u0, ms, onEnd, spin0 = 0) => {
			const t0 = clock.now();
			if (flight) cancelAnimationFrame(flight.raf);
			const f = flight || { u: 0 };
			f.fast = true;
			flight = f;
			const step = () => {
				if (!alive) return;
				const k = clamp((clock.now() - t0) / ms, 0, 1);
				const u = u0 + (1 - u0) * (1 - Math.pow(1 - k, 1.6));
				const p = at(path, u);
				setBall(L.bs, p.x, p.y, kOf(u, K1), spin0 + k * 520);
				if (k < 1) f.raf = requestAnimationFrame(step);
				else onEnd?.();
			};
			f.raf = requestAnimationFrame(step);
		};
		/** Sekme ya da kaçış: noktadan dışarı (ölçek k0 → k1), sonunda söner. */
		const bounce = (x0, y0, x1, y1, k0, k1, ms) => {
			const t0 = clock.now();
			const step = () => {
				if (!alive) return;
				const k = clamp((clock.now() - t0) / ms, 0, 1);
				const e = ease(k);
				setBall(L.bs, x0 + (x1 - x0) * e, y0 + (y1 - y0) * e - Math.sin(k * Math.PI) * L.H * 0.08, k0 + (k1 - k0) * e, 600 + k * 400, false);
				ball.style.opacity = String(1 - Math.max(0, k - 0.55) / 0.45);
				shadow.style.opacity = '0';
				if (k < 1) requestAnimationFrame(step);
			};
			requestAnimationFrame(step);
		};

		// ------------------------------------------------------------ dokunuş
		const pick = (i) => {
			if (done || revealed || !human) return;
			done = true;
			mine = i;
			root.classList.add('pick', 'slow');
			tiles[i].classList.add('aim');
			for (const t of tiles) t.disabled = true;
			kick(i);
			api.answer(i);
		};
		for (const t of tiles) t.addEventListener('click', () => pick(Number(t.dataset.i)));
		if (!human) for (const t of tiles) t.disabled = true;
		const stopOpen = onOpen(el, () => {
			if (alive && L) layout();
		});

		// ------------------------------------------------------------ jokerler
		const poll = (pct) => {
			pollPct = pct;
			for (const e of root.querySelectorAll('.pk-poll,.pk-pc')) e.remove();
			if (!L || revealed) return;
			const sum = tiles.reduce((a, t, i) => a + (t.classList.contains('gone') ? 0 : pct[i] || 0), 0) || 1;
			tiles.forEach((t, i) => {
				if (t.classList.contains('gone')) return;
				const pc = Math.round(((pct[i] || 0) / sum) * 100);
				t.insertAdjacentHTML('beforeend', `<span class="pk-pc" style="--w:${(pc / 100).toFixed(2)}"><i></i></span>`);
				const p = L.pan[i];
				// oy etiketi levhanın dışında: üst köşelerde üst direğin üstü, altta kale çizgisinin altı (yazıya binmez)
				const y = i < 2 ? L.gy - L.laneT * 0.5 : L.gb + L.laneB * 0.5;
				const x = i % 2 ? p.x + p.w - 26 : p.x + 26;
				root.querySelector('.pk-cam').insertAdjacentHTML('beforeend', `<span class="pk-poll" style="left:${f1(x)}px;top:${f1(y)}px">%${pc}</span>`);
			});
		};

		// ------------------------------------------------------------ cevap filmi
		const confetti = (n, cols) => {
			if (!L) return;
			const R = rngOf(`${v.q.id}cf`);
			let h = '';
			for (let k = 0; k < n; k++) {
				const x = L.gx + R() * L.gw;
				h += `<i class="cf" style="left:${f1(x)}px;--w:${f1(4 + R() * 5)}px;--h:${f1(6 + R() * 7)}px;--c:${cols[k % cols.length]};--x:${f1((R() - 0.5) * 120)}px;--y:${f1(L.H * (0.55 + R() * 0.5))}px;--r:${Math.round(360 + R() * 900)}deg;--d:${Math.round(1300 + R() * 900)}ms;--dl:${Math.round(R() * 260)}ms"></i>`;
			}
			fx.insertAdjacentHTML('beforeend', h);
			later(() => {
				for (const e of fx.querySelectorAll('.cf')) e.remove();
			}, 2800);
		};
		const rings = (x, y, s = 4) => {
			fx.insertAdjacentHTML('beforeend', `<i class="rg" style="left:${f1(x)}px;top:${f1(y)}px;--s:${s}"></i><i class="rg" style="left:${f1(x)}px;top:${f1(y)}px;--s:${s * 1.6};animation-delay:.12s"></i>`);
			later(() => {
				for (const e of fx.querySelectorAll('.rg')) e.remove();
			}, 1200);
		};
		const call = (kind, y) => {
			const [t, cls] = CALL[kind] || ['', ''];
			if (!t) return;
			fx.insertAdjacentHTML('beforeend', `<b class="pk-call ${cls}" style="top:${f1(y)}px;font-size:${f1(clamp(L.W * 0.15, 34, 64))}px">${esc(t)}</b>`);
			later(() => fx.querySelector('.pk-call')?.remove(), 1600);
		};
		/** Kalecinin uçuşu: köşeye (ya da ortada kalır); 1,7 sn sonunda kalkıp ortaya döner. */
		const dive = (c, catchIt, tHit = 560) => {
			if (!L) return;
			kp.classList.add('dive', 'fly');
			if (c == null) {
				kp.animate([{ transform: 'none' }, { transform: 'translateY(-4%) scale(1.03)' }, { transform: 'none' }], { duration: 700, easing: 'ease-out' });
				later(() => kp.classList.remove('fly'), 700);
				return;
			}
			const p = L.pan[c];
			const left = c % 2 === 0;
			const top = c < 2;
			const kx = L.W / 2;
			const ky = L.ky + L.kh * 0.64;
			const inner = left ? p.x + p.w * 0.78 : p.x + p.w * 0.22;
			const dx = (inner - kx) * 0.92;
			const dy = top ? (p.cy - ky) * 0.58 : (p.cy - ky) * 0.7 + L.kh * 0.1;
			const a = (left ? -1 : 1) * (top ? 64 : 86);
			const land = top ? Math.min(L.gb - ky - L.kh * 0.12, (L.pan[2].cy - ky) * 0.6) : dy;
			later(() => kp.classList.add('reach'), 60);
			const anim = kp.animate(
				[
					{ transform: 'translate(0,0) rotate(0deg)', offset: 0 },
					{ transform: `translate(${f1(dx * 0.12)}px,${f1(-L.kh * 0.06)}px) rotate(${f1(a * 0.15)}deg)`, offset: 0.07 },
					{ transform: `translate(${f1(dx)}px,${f1(dy)}px) rotate(${f1(a)}deg)`, offset: 0.24 },
					{ transform: `translate(${f1(dx * 1.03)}px,${f1(land)}px) rotate(${f1(a * 1.08)}deg)`, offset: 0.42 },
					{ transform: `translate(${f1(dx * 1.03)}px,${f1(land)}px) rotate(${f1(a * 1.08)}deg)`, offset: 0.62 },
					{ transform: 'translate(0,0) rotate(0deg)', offset: 1 },
				],
				{ duration: 1750, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'none' },
			);
			later(() => {
				kp.classList.remove('reach');
				if (catchIt) kp.classList.add('hold');
			}, Math.max(480, tHit));
			later(() => kp.classList.remove('fly'), 1650);
			anim.finished.then(() => kp.classList.remove('fly', 'dive'), () => {});
		};
		/** Herkesin şut işareti: köşesinin dışında (üstte direğin üstü, altta çizginin altı), portreli top. */
		const markers = (results, kpI, kval) => {
			if (!L) return;
			const lanes = [[], [], [], [], []];
			for (const r of results) {
				const c = Number.isInteger(r.value) && r.value >= 0 && r.value < 4 ? r.value : 4;
				lanes[c].push(r);
			}
			let h = '';
			let k = 0;
			lanes.forEach((list, c) => {
				list.forEach((r, j) => {
					const pl = P.find((x) => x.i === r.i);
					const isK = r.i === kpI && kval != null;
					const gap = L.mk + 5;
					let x;
					let y;
					if (c === 4) {
						x = L.W - L.gx - L.mk * 0.7 - j * gap;
						y = L.by;
					} else {
						const left = c % 2 === 0;
						const x0 = left ? L.gx + L.mk * 1.15 : L.gx + L.gw - L.mk * 1.15;
						x = x0 + (left ? 1 : -1) * j * gap;
						y = c < 2 ? L.gy - L.laneT * 0.5 : L.gb + L.laneB * 0.52;
					}
					const badge = c === 4 ? '' : `<u class="${isK ? 'kp' : r.correct ? 'ok' : 'no'}">${isK ? ICO.kp : r.correct ? ICO.ok : ICO.no}</u>`;
					h += `<span class="pk-mk${pl?.human ? ' me' : ''}" style="left:${f1(x)}px;top:${f1(y)}px;--c:${esc(r.color)};--dl:${Math.round(k * 90)}ms;--fy:${c < 2 ? -10 : 10}px">${pl?.av || ''}${badge}</span>`;
					k++;
				});
			});
			camEl.insertAdjacentHTML('beforeend', h);
		};

		const close = onClose(el, () => {
			alive = false;
			stopOpen();
			ro?.disconnect();
			if (flight) cancelAnimationFrame(flight.raf);
			for (const t of timers) clearTimeout(t);
		});

		return {
			lock() {
				done = true;
				for (const t of tiles) t.disabled = true;
			},
			joker(e) {
				if (revealed || done) return;
				if (Array.isArray(e?.hide)) {
					for (const i of e.hide) {
						const t = tiles[i];
						if (!t) continue;
						t.classList.add('gone');
						t.disabled = true;
					}
					app?.ui?.toast?.('İki yanlış köşeye bant çekildi', { tone: 'good', ms: 1800 });
					if (pollPct) poll(pollPct);
				} else if (Array.isArray(e?.pct)) {
					poll(e.pct);
					app?.ui?.toast?.('Tribün köşeleri gösteriyor', { tone: 'good', ms: 1800 });
				}
			},
			reveal(results) {
				if (!L) layout();
				revealed = true;
				done = true;
				root.classList.add('rv');
				root.classList.remove('slow');
				for (const e of root.querySelectorAll('.pk-poll,.pk-pc')) e.remove();
				for (const t of tiles) t.disabled = true;
				const byI = new Map(results.map((r) => [r.i, r]));
				const sr = byI.get(shooter.i) || null;
				const kr = keeper ? byI.get(keeper.i) || null : null;
				const kval = Number.isInteger(kr?.value) ? kr.value : null;
				const c = Number.isInteger(sr?.value) ? sr.value : null;
				const out = c == null ? 'yok' : sr.correct ? 'gol' : kval === c ? 'kurtardi' : missOf(c, `${v.q.id}|${shooter.name}`);
				// kaleci rakibin kendi seçtiği köşeye uçar (hemen), top senin köşene kıvrılır
				const u0 = flight?.u || 0;
				const ms = Math.round(560 * (1 - u0) + 120);
				dive(kval, out === 'kurtardi', c == null ? 560 : ms);
				if (c != null && L) {
					tiles[c].classList.add('aim');
					root.classList.add('pick');
					const p = L.pan[c];
					const left = c % 2 === 0;
					let tx = p.cx;
					let ty = p.cy;
					if (out === 'kurtardi') {
						tx = left ? p.x + p.w * 0.72 : p.x + p.w * 0.28;
						ty = p.cy + (c < 2 ? p.h * 0.1 : -p.h * 0.05);
					} else if (out === 'direk') {
						if (c < 2) {
							tx = p.cx + (left ? -p.w * 0.18 : p.w * 0.18);
							ty = L.gy + L.pt * 0.5;
						} else {
							tx = left ? L.gx + L.pt * 0.5 : L.gx + L.gw - L.pt * 0.5;
							ty = p.cy;
						}
					} else if (out === 'ust') {
						tx = p.cx + (left ? -p.w * 0.1 : p.w * 0.1);
						ty = L.gy - L.laneT * 0.55;
					} else if (out === 'aut') {
						tx = left ? L.gx - L.mk * 0.6 : L.gx + L.gw + L.mk * 0.6;
						ty = p.cy + p.h * 0.1;
					}
					const path = pathTo(tx, ty);
					if (!flight) {
						ball.classList.add('trail');
						sfx(app, 'tap', { rate: 0.55 });
					}
					sfx(app, 'whoosh');
					fly(path, u0, ms, () => {
						if (!alive) return;
						const host = st.getBoundingClientRect();
						const scl = host.width / Math.max(1, L.W);
						const ux = host.left + tx * scl;
						const uy = host.top + ty * scl;
						camEl.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-3px,2px)' }, { transform: 'translate(3px,-2px)' }, { transform: 'none' }], { duration: 260 });
						if (out === 'gol') {
							tiles[c].classList.add('hit');
							const net = root.querySelector('.pk-net .mesh');
							net?.animate([{ transform: 'none' }, { transform: `translate(${f1((tx - L.W / 2) * 0.03)}px,${f1(-L.gh * 0.03)}px) scale(1.035)` }, { transform: 'scale(.99)' }, { transform: 'none' }], { duration: 620, easing: 'ease-out' });
							for (const [cl, dl] of [['a', 0], ['b', 140]]) {
								const rp = root.querySelector(`.pk-net .rip.${cl}`);
								if (!rp) continue;
								rp.setAttribute('cx', f1(tx));
								rp.setAttribute('cy', f1(ty));
								rp.animate([{ opacity: 0.9, r: '4px' }, { opacity: 0, r: `${f1(L.gw * 0.22)}px` }], { duration: 700, delay: dl, easing: 'ease-out' });
							}
							rings(tx, ty, 5);
							root.classList.add('roar');
							later(() => root.classList.remove('roar'), 1600);
							fx.insertAdjacentHTML('beforeend', '<i class="pk-flash"></i>');
							later(() => fx.querySelector('.pk-flash')?.remove(), 800);
							confetti(46, [shooter.color, '#ffd25a', '#ffffff', '#7dff9a', '#ff6ab0']);
							app?.ui?.fx?.burst(ux, uy, { n: 18, dist: 120, colors: ['#ffd25a', '#fff', '#7dff9a'], kind: 'star', size: 13, life: 850 });
							sfx(app, 'cheer');
							sfx(app, 'fireworks');
							later(() => sfx(app, 'fireworks', { pan: 0.6 }), 260);
							buzz([30, 40, 60]);
							// top ağda süzülüp düşer, söner
							const t0 = clock.now();
							const drop = () => {
								if (!alive) return;
								const k = clamp((clock.now() - t0) / 520, 0, 1);
								setBall(L.bs, tx, ty + (L.gb - ty - L.bs * K1) * k * k, K1 * (1 - 0.1 * k), 900, false);
								ball.style.opacity = String(1 - Math.max(0, k - 0.4) / 0.6);
								shadow.style.opacity = '0';
								if (k < 1) requestAnimationFrame(drop);
							};
							requestAnimationFrame(drop);
						} else if (out === 'kurtardi') {
							ball.style.opacity = '0';
							shadow.style.opacity = '0';
							rings(tx, ty, 3);
							sfx(app, 'defend');
							buzz(40);
						} else if (out === 'direk') {
							fr.classList.remove('shake');
							void fr.offsetWidth;
							fr.classList.add('shake');
							rings(tx, ty, 2.5);
							sfx(app, 'defend');
							buzz([40, 30, 40]);
							const bx = left ? -L.bs : L.W + L.bs;
							bounce(tx, ty, c < 2 ? (left ? tx - L.W * 0.12 : tx + L.W * 0.12) : bx, c < 2 ? L.by - L.bs : ty + L.H * 0.25, K1, c < 2 ? 0.75 : 0.62, 620);
						} else {
							sfx(app, 'whoosh');
							bounce(tx, ty, out === 'ust' ? tx + (left ? -1 : 1) * L.W * 0.08 : left ? -L.bs : L.W + L.bs, out === 'ust' ? -L.bs : ty - L.H * 0.06, K1, K1 * 0.8, 560);
						}
						call(out, L.gy + L.gh * (out === 'gol' ? 0.42 : 0.5));
						// köşelerin hükmü: doğru yeşil, seçilen yanlışlar kırmızı, öbürleri sönük
						tiles.forEach((t, i) => {
							t.classList.remove('aim');
							t.classList.toggle('ok', i === v.right);
						});
					});
				} else if (L) {
					// şut yok (süre doldu): top noktada kalır; kalecinin uçuşu ve doğru köşe yine görünür
					later(() => tiles.forEach((t, i) => t.classList.toggle('ok', i === v.right)), 520);
				}
				// hüküm: seçilen yanlışlar kırmızı, kimsenin seçmediği yanlışlar sönük
				const picked = new Set(results.map((r) => r.value).filter((x) => Number.isInteger(x)));
				const verdict = () =>
					tiles.forEach((t, i) => {
						t.classList.remove('aim');
						t.classList.toggle('ok', i === v.right);
						t.classList.toggle('no', i !== v.right && picked.has(i));
						t.classList.toggle('dim', i !== v.right && !picked.has(i));
						t.classList.remove('gone');
					});
				later(() => {
					root.classList.remove('pick');
					verdict();
				}, c == null ? 560 : 900);
				later(() => markers(results, keeper?.i, kval), c == null ? 700 : 1000);
				later(() => {
					if (out === 'gol') kp.classList.add('sad');
				}, 1500);
				// damga sorunun yerinde (arayüz: tam ekran kartta başlıkla sahne arası)
				const meR = results.find((r) => r.p?.human);
				if (meR && app && c != null) {
					const kn = keeper?.name || 'Kaleci';
					const right = v.opts[v.right];
					const sub =
						out === 'gol'
							? kval === c
								? `${kn} uzandı ama yetişemedi`
								: kval == null
									? `${kn} kıpırdayamadı`
									: `${kn} öbür köşeye uçtu`
							: out === 'kurtardi'
								? `${kn} köşeni okudu · doğrusu ${right}`
								: `Doğrusu: ${right}`;
					stampLater(app, CALL[out][0], out === 'gol' ? 'gold' : 'bad', sub);
				}
			},
			destroy: close,
		};
	},
};
