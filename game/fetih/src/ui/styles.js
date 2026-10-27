// Arayüz stilleri (temel): renk belirteçleri, oyuncu kartları, sahne bayrakları, bildirimler,
// il seçimi, harita etiketleri ve iğneleri, parçacıklar.
//
// Kurallar:
// - Her yazı düz bir panel ya da kalın kontur üstünde: altta haritanın hangi rengi olursa olsun okunur.
// - Animasyonlar yalnızca transform ve opacity. backdrop-filter yok. Gölgeler duruk (canlandırılmaz).
// - "Azaltılmış hareket" açıkken süs animasyonları kapanır, geçişler kısalır.
// - Dikey ve yatay telefon: yatay düzen @media (orientation:landscape) and (max-height:560px).
//
// Diğer stil dosyaları: styles-q.js (soru kartı ve soru tiplerinin ortak sınıfları),
// styles-wheel.js (çark, düello sahnesi, sıralama), styles-menu.js (başlık, menüler, bitiş).

import { CSS_Q } from './styles-q.js';
import { CSS_WHEEL } from './styles-wheel.js';
import { CSS_MENU } from './styles-menu.js';
import { OUT, LAND } from './cssutil.js';
import { TR_FONTS } from './trglyphs.js';

const BASE = /* css */ `
.fl-ui{position:absolute;inset:0;pointer-events:none;font-family:'Fredoka',system-ui,sans-serif;font-weight:600;color:#fff;overflow:hidden;
  -webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;
  --gold:#ffd25a;--gold-l:#fff1b0;--gold-d:#c98a12;--gold-dd:#7a4a06;--ink:#0d1733;--navy:#152a57;--navy-l:#22407e;--navy-d:#0a1534;
  --cream:#fff8ea;--cream-d:#e9d9b6;--tdark:#1d2547;--red:#ff5a4a;--red-d:#a8231a;--green:#4fd16a;--green-d:#17702c;--blue:#4a8cff;--blue-d:#1d47a8;
  --panel:linear-gradient(180deg,#22407e,#152a57 60%,#12234a);--sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px)}
.fl-ui *,.fl-ui *::before,.fl-ui *::after{box-sizing:border-box}
:where(.fl-ui button){font:inherit;color:inherit;border:0;background:none;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.fl-ui button{pointer-events:auto}
.fl-ui button:disabled{cursor:default}
.fl-ui svg{display:block}
.fl-i{width:1em;height:1em;flex:none}
.fl-big{font-family:'Lilita One',system-ui,sans-serif;font-weight:400}
.fl-avs,.fl-avi{width:100%;height:100%;display:block}
.fl-avi{position:absolute;inset:0;object-fit:cover}
.fl-av{position:relative;display:block;flex:none;overflow:hidden;border-radius:28%;border:2.5px solid #fff;background:#24345e;box-shadow:0 3px 0 rgba(0,0,0,.35)}

/* ortak 3B düğme: yüz + alt kenar gölgesi (basınca yüz iner; yalnızca transform canlanır) */
.fl-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:'Lilita One';font-weight:400;font-size:20px;letter-spacing:.02em;
  padding:10px 20px 12px;border-radius:16px;color:#fff;border:3px solid #fff;background:linear-gradient(180deg,var(--b1,#4f8fff),var(--b2,#2a5ad8));
  box-shadow:0 6px 0 var(--b3,#163a8f),0 10px 16px rgba(0,0,0,.28);transition:transform .08s;${OUT('rgba(0,0,0,.35)', 1.5)}}
.fl-btn:active{transform:translateY(4px);box-shadow:0 2px 0 var(--b3,#163a8f),0 4px 8px rgba(0,0,0,.25)}
.fl-btn.red{--b1:#ff7d5c;--b2:#e3402a;--b3:#8a1d0c}
.fl-btn.green{--b1:#72e36a;--b2:#2fa83c;--b3:#16661f}
.fl-btn.gold{--b1:#ffe680;--b2:#f5b324;--b3:#a0620a;color:#4a2800;text-shadow:0 1px 0 rgba(255,255,255,.5)}
.fl-btn.navy{--b1:#2f5299;--b2:#1d3770;--b3:#0b1839;border-color:rgba(255,255,255,.5)}
.fl-btn.big{font-size:30px;padding:14px 40px 17px;border-radius:22px;border-width:4px}
.fl-btn:disabled{filter:grayscale(.7);opacity:.6}
.fl-btn .fl-i{width:1.1em;height:1.1em}

/* ---------------------------------------------------------------- oyuncu kartları (HUD) */
.fl-hud{position:absolute;top:calc(8px + var(--sat));left:50%;transform:translateX(-50%);display:flex;gap:6px;width:min(calc(100vw - 16px),600px);justify-content:center;transition:opacity .3s,transform .3s}
.fl-hud.off{opacity:0;transform:translate(-50%,-30px)}
.fl-pl{position:relative;flex:1 1 0;min-width:0;max-width:150px;display:flex;align-items:center;gap:6px;padding:4px 7px 9px 4px;border-radius:15px;
  background:var(--panel);border:2.5px solid rgba(255,255,255,.2);box-shadow:0 4px 0 var(--navy-d),0 6px 10px rgba(0,0,0,.25);transition:transform .25s cubic-bezier(.3,1.6,.5,1),opacity .3s}
.fl-pl .fl-av{width:38px;height:38px;border-radius:11px;border-color:var(--pc)}
.fl-pl .tx{min-width:0;flex:1}
.fl-pl b{display:block;font-size:12.5px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fl-pl em{display:block;font-style:normal;font-family:'Lilita One';font-size:17px;line-height:1.05;color:var(--gold);${OUT('#3a2300', 1)}}
.fl-pl .cs{position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);display:flex;gap:3px;padding:2px 6px;border-radius:8px;background:var(--navy-d);border:1.5px solid rgba(255,255,255,.25)}
.fl-pl .cs i{width:13px;height:13px;background:var(--pc);-webkit-mask:var(--tw) center/contain no-repeat;mask:var(--tw) center/contain no-repeat;transition:opacity .3s,transform .3s}
.fl-pl .cs i.off{opacity:.22;transform:scale(.7) rotate(18deg)}
.fl-pl .cs i.hit{animation:flCrack .6s}
.fl-pl .tm{position:absolute;top:-6px;right:-5px;padding:0 5px;border-radius:6px;font-size:9.5px;line-height:15px;letter-spacing:.06em;background:var(--tc);border:1.5px solid #fff}
.fl-pl.turn{transform:translateY(3px) scale(1.06);border-color:var(--gold);z-index:1}
.fl-pl.turn::after{content:'SIRA';position:absolute;left:50%;bottom:-25px;transform:translateX(-50%);padding:1px 8px 2px;border-radius:7px;font-family:'Lilita One';font-size:11px;letter-spacing:.08em;
  color:#3a2000;background:linear-gradient(#ffe680,#f5b324);border:2px solid #fff;animation:flBob 1s ease-in-out infinite}
.fl-pl.dead{opacity:.5}
.fl-pl.dead .fl-av::after{content:'';position:absolute;inset:0;background:rgba(10,16,34,.55) var(--skull) center/60% no-repeat}
.fl-pl .d{position:absolute;right:6px;top:-4px;font-family:'Lilita One';font-size:15px;color:#7dff9a;pointer-events:none;${OUT('#0a3a14', 1.5)};animation:flDelta 1.1s ease-out forwards}
.fl-pl .d.neg{color:#ff8a7a;${OUT('#4a0a0a', 1.5)}}
@keyframes flDelta{0%{opacity:0;transform:translateY(8px) scale(.6)}20%{opacity:1;transform:translateY(0) scale(1.15)}70%{opacity:1;transform:translateY(-10px)}100%{opacity:0;transform:translateY(-18px)}}
@keyframes flCrack{0%,100%{transform:none}30%{transform:scale(1.5) rotate(-12deg)}60%{transform:scale(.8) rotate(12deg)}}
@keyframes flBob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(3px)}}

/* ---------------------------------------------------------------- sahne bayrağı (YAYILMA, FETİH…) */
.fl-banner{position:absolute;left:0;right:0;top:36%;height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;visibility:hidden;--t1:#ff7a4a;--t2:#c8301e;--t3:#5a0d05}
.fl-banner.on{visibility:visible}
.fl-banner.t-gold{--t1:#ffd25a;--t2:#d88a10;--t3:#5a3300}
.fl-banner.t-red{--t1:#ff6a4a;--t2:#c42a1a;--t3:#4a0805}
.fl-banner.t-blue{--t1:#5aa0ff;--t2:#2a5ad8;--t3:#0a1d5a}
.fl-banner.t-purple{--t1:#c07aff;--t2:#7a3ad8;--t3:#2a0a5a}
.fl-banner .band{position:absolute;left:-5%;right:-5%;top:-64px;height:128px;transform:scaleY(0);opacity:0;overflow:hidden;
  background:linear-gradient(180deg,rgba(0,0,0,0),var(--t3) 18%,var(--t3) 82%,rgba(0,0,0,0));}
.fl-banner .band::before,.fl-banner .band::after{content:'';position:absolute;left:0;right:0;height:4px;background:linear-gradient(90deg,transparent,var(--t1) 20%,#fff 50%,var(--t1) 80%,transparent)}
.fl-banner .band::before{top:22px}.fl-banner .band::after{bottom:22px}
.fl-banner .band i{position:absolute;top:0;bottom:0;left:0;width:30%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.28),transparent);transform:translateX(-120%) skewX(-20deg)}
.fl-banner .row{position:relative;display:flex;align-items:center;gap:14px}
.fl-banner .emb{position:relative;flex:none;width:58px;height:58px;border-radius:17px;display:grid;place-items:center;font-size:36px;opacity:0;
  background:linear-gradient(var(--t1),var(--t2));border:3.5px solid #fff;box-shadow:0 5px 0 var(--t3);transform:rotate(45deg) scale(0)}
.fl-banner .emb .fl-i{transform:rotate(-45deg)}
.fl-banner b{position:relative;display:flex;font-family:'Lilita One';font-weight:400;font-size:min(16vw,76px);line-height:1;letter-spacing:.03em;color:#fff;${OUT('var(--t2)', 4)}}
.fl-banner b i{display:block;font-style:normal;opacity:0;transform:translateY(-40px) scale(2.2)}
.fl-banner span{position:relative;margin-top:6px;padding:5px 18px 6px;border-radius:999px;font-size:17px;background:var(--ink);border:2.5px solid var(--t1);opacity:0;transform:translateY(10px)}
.fl-banner.on .band{animation:flBand .32s cubic-bezier(.2,.9,.3,1) forwards}
.fl-banner.on .band i{animation:flShine .9s .25s ease-in-out forwards}
.fl-banner.on .emb{animation:flEmb .45s .08s cubic-bezier(.3,1.8,.5,1) forwards}
.fl-banner.on b i{animation:flLetter .42s calc(.12s + var(--k) * .045s) cubic-bezier(.3,1.5,.5,1) forwards}
.fl-banner.on span{animation:flUp .3s .45s ease-out forwards}
.fl-banner.out{animation:flOut .28s ease-in forwards}
@keyframes flBand{to{transform:scaleY(1);opacity:1}}
@keyframes flShine{to{transform:translateX(420%) skewX(-20deg)}}
@keyframes flEmb{to{opacity:1;transform:rotate(45deg) scale(1)}}
@keyframes flLetter{to{opacity:1;transform:none}}
@keyframes flUp{to{opacity:1;transform:none}}
@keyframes flOut{to{opacity:0;transform:translateX(-8%) scale(1.04)}}

/* ---------------------------------------------------------------- bildirimler */
.fl-toasts{position:absolute;left:50%;top:calc(82px + var(--sat));transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;width:min(calc(100vw - 32px),420px)}
.fl-toast{display:flex;align-items:center;gap:8px;max-width:100%;padding:7px 14px 8px 8px;border-radius:14px;font-size:15px;line-height:1.2;background:var(--ink);border:2.5px solid var(--tc,var(--gold));
  box-shadow:0 4px 0 rgba(0,0,0,.4);animation:flToastIn .3s cubic-bezier(.3,1.5,.5,1) both}
.fl-toast .ti{flex:none;width:28px;height:28px;border-radius:9px;display:grid;place-items:center;font-size:18px;background:var(--tc,var(--gold))}
.fl-toast .fl-av{width:28px;height:28px;border-radius:9px;border-width:2px}
.fl-toast.warn{--tc:#ff8a3a}.fl-toast.bad{--tc:#ff5a4a}.fl-toast.good{--tc:#3fc45a}.fl-toast.info{--tc:#4a8cff}
.fl-toast.bye{animation:flToastOut .25s ease-in forwards}
@keyframes flToastIn{from{opacity:0;transform:translateY(-16px) scale(.9)}}
@keyframes flToastOut{to{opacity:0;transform:translateY(-12px) scale(.95)}}

/* ---------------------------------------------------------------- il seçimi ipucu */
.fl-prompt{position:absolute;left:50%;bottom:calc(16px + var(--sab));display:flex;align-items:center;gap:12px;max-width:calc(100vw - 24px);padding:10px 20px 12px 12px;border-radius:20px;
  background:var(--panel);border:3px solid var(--pt,var(--gold));box-shadow:0 6px 0 var(--navy-d),0 12px 20px rgba(0,0,0,.35);opacity:0;transform:translate(-50%,30px) scale(.9);transition:opacity .25s,transform .3s cubic-bezier(.3,1.5,.5,1)}
.fl-prompt.on{opacity:1;transform:translate(-50%,0)}
.fl-prompt.red{--pt:#ff6a4a}
.fl-prompt .pi{flex:none;width:50px;height:50px;border-radius:15px;display:grid;place-items:center;font-size:32px;background:linear-gradient(var(--gold),#e8980e);border:3px solid #fff;box-shadow:0 4px 0 var(--gold-dd)}
.fl-prompt.red .pi{background:linear-gradient(#ff7d5c,#d8341f);box-shadow:0 4px 0 #6a1206}
.fl-prompt .pi .fl-i{animation:flTap 1.2s ease-in-out infinite}
.fl-prompt .pt b{display:block;font-family:'Lilita One';font-weight:400;font-size:clamp(19px,5.4vw,24px);line-height:1.05;letter-spacing:.02em;color:#fff}
.fl-prompt .pt small{display:block;margin-top:3px;font-size:14px;line-height:1.2;color:#cfe0ff}
.fl-prompt.shake{animation:flShakeP .4s}
@keyframes flShakeP{0%,100%{transform:translate(-50%,0)}20%{transform:translate(calc(-50% - 10px),0)}40%{transform:translate(calc(-50% + 9px),0)}60%{transform:translate(calc(-50% - 6px),0)}80%{transform:translate(calc(-50% + 4px),0)}}
@keyframes flTap{0%,100%{transform:translateY(0)}40%{transform:translateY(4px) scale(.92)}60%{transform:translateY(4px) scale(.92)}}

/* ---------------------------------------------------------------- harita üstü: etiketler, iğneler, çizgiler */
.fl-pins{position:absolute;inset:0;overflow:hidden}
.fl-label{position:absolute;left:0;top:0;display:flex;align-items:center;gap:5px;padding:3px 9px 4px 5px;border-radius:10px;white-space:nowrap;font-size:13px;line-height:1.1;
  background:var(--ink);border:2px solid rgba(255,255,255,.85);box-shadow:0 3px 0 rgba(0,0,0,.4);will-change:transform}
.fl-label::after{content:'';position:absolute;left:50%;bottom:-7px;margin-left:-6px;border:6px solid transparent;border-bottom:0;border-top:7px solid rgba(255,255,255,.85)}
.fl-label>i{width:12px;height:12px;flex:none;border-radius:4px;background:var(--oc,#8a94b0);border:1.5px solid #fff}
.fl-label .fl-i{width:14px;height:14px;margin-left:1px}
.fl-ui .fl-label.opt{pointer-events:auto;font-size:14px;padding:4px 10px 5px 6px;border-color:var(--gold);color:#fff}
.fl-label.opt::after{border-top-color:var(--gold)}
.fl-label.opt span{animation:none}
.fl-label.mark{padding:2px 8px 3px 2px;border-color:var(--oc);gap:5px}
.fl-label.mark .fl-av{width:24px;height:24px;border-radius:8px;border-width:2px}
.fl-label.mark::after{border-top-color:var(--oc)}
.fl-label.pop{animation:flPopIn .35s cubic-bezier(.3,1.7,.5,1) both}
.fl-pin{position:absolute;left:0;top:0;width:40px;height:52px;margin:-50px 0 0 -20px;will-change:transform}
.fl-pin .pb{position:absolute;inset:0;animation:flDrop .4s cubic-bezier(.3,1.5,.5,1) both}
.fl-pin svg.sh{position:absolute;inset:0}
.fl-pin .fl-av{position:absolute;left:5px;top:4px;width:30px;height:30px;border-radius:50%;border-width:2px;box-shadow:none}
.fl-pin.goal{width:48px;height:48px;margin:-24px 0 0 -24px}
.fl-pin.goal .pb{animation:flGoal .5s cubic-bezier(.3,1.6,.5,1) both}
.fl-pin .km{position:absolute;left:50%;top:-20px;transform:translateX(-50%);padding:1px 6px;border-radius:7px;font-family:'Lilita One';font-size:13px;white-space:nowrap;background:var(--ink);border:1.5px solid #fff}
.fl-line{position:absolute;left:0;top:0;height:0;border-top:3px dashed #fff;transform-origin:0 50%;opacity:.9;will-change:transform}
.fl-tapx{position:absolute;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;border:4px solid #ff5a4a;display:grid;place-items:center;font-size:26px;animation:flTapX .55s ease-out forwards}
@keyframes flTapX{0%{opacity:1;transform:scale(.4)}60%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.25)}}
@keyframes flDrop{from{opacity:0;transform:translateY(-40px) scale(.6)}}
@keyframes flGoal{from{opacity:0;transform:scale(2.4)}}
@keyframes flPopIn{from{opacity:0;transform:scale(.4)}}

/* ---------------------------------------------------------------- parçacıklar */
.fl-fx{position:absolute;inset:0;overflow:hidden}
.fl-p{position:absolute;left:0;top:0;width:var(--s);height:var(--s);margin:calc(var(--s) / -2) 0 0 calc(var(--s) / -2);background:var(--c);border-radius:50%;
  animation:flPart .7s cubic-bezier(.15,.7,.3,1) forwards;will-change:transform,opacity}
.fl-p.star{border-radius:0;-webkit-mask:var(--spk) center/contain no-repeat;mask:var(--spk) center/contain no-repeat}
.fl-p.conf{border-radius:2px;width:calc(var(--s) * .6);animation:flConf 2.4s linear forwards}
@keyframes flPart{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(var(--r)) scale(.3)}}
@keyframes flConf{0%{opacity:1;transform:translate(0,0) rotate(0)}85%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(var(--r))}}
.fl-ring{position:absolute;left:0;top:0;width:var(--s);height:var(--s);margin:calc(var(--s) / -2) 0 0 calc(var(--s) / -2);border-radius:50%;border:6px solid var(--c);animation:flRing .6s ease-out forwards}
@keyframes flRing{0%{opacity:1;transform:scale(.15)}100%{opacity:0;transform:scale(1)}}
.fl-ftxt{position:absolute;left:0;top:0;transform:translate(-50%,-50%);font-family:'Lilita One';font-size:28px;white-space:nowrap;color:#fff;${OUT('#1a2a5a', 3)};animation:flFtxt 1.1s ease-out forwards}
@keyframes flFtxt{0%{opacity:0;transform:translate(-50%,-30%) scale(.5)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}30%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-110%)}}

@keyframes flPop{0%{transform:scale(1)}35%{transform:scale(1.08)}100%{transform:scale(1)}}
@keyframes flShakeX{0%,100%{transform:none}20%{transform:translateX(-7px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}

${LAND}{
  .fl-hud{left:8px;top:calc(6px + var(--sat));transform:none;flex-direction:column;width:auto;gap:12px}
  .fl-hud.off{transform:translateX(-30px)}
  .fl-pl{flex:none;width:150px;max-width:none}
  .fl-pl.turn{transform:translateX(6px) scale(1.04)}
  .fl-pl.turn::after{left:auto;right:-46px;bottom:auto;top:50%;transform:translateY(-50%);animation:flBobX 1s ease-in-out infinite}
  .fl-toasts{top:calc(10px + var(--sat))}
  .fl-banner{top:42%}
  .fl-banner b{font-size:min(11vw,70px)}
}
@keyframes flBobX{0%,100%{transform:translateY(-50%) translateX(0)}50%{transform:translateY(-50%) translateX(-3px)}}
`;

const RM = /* css */ `
@media (prefers-reduced-motion:reduce){
  .fl-ui *,.fl-ui *::before,.fl-ui *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.12s!important}
  .fl-banner.on b i,.fl-banner.on .emb,.fl-banner.on .band,.fl-banner.on span{animation-delay:0s!important}
}`;

// TR_FONTS: Ğ ğ İ Ş ş eki (gömülü alt kümelerde yok; bkz. trfont.py)
export const CSS = TR_FONTS + BASE + CSS_Q + CSS_WHEEL + CSS_MENU + RM;
