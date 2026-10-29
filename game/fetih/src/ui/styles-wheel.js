// Çark, "Fetih!" kategori seçimi, düello sahnesi ve seçim sırası stilleri.
// Çark: jant, disk, bulanık disk, göbek, mandal ve sonuç kartı ayrı katmanlar; canlanan yalnızca transform ve
// opacity (gölgeler duruk, filtre yok).

import { OUT, LAND } from './cssutil.js';

export const CSS_WHEEL = /* css */ `
/* ---------------------------------------------------------------- çark */
/* --ws: çarkın genişliği; dar ya da kısa ekranda küçülür, üstte HUD ve duraklat düğmesi için yer kalır */
.fl-wheel{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:opacity .25s;
  --ws:min(calc(90 * var(--vw)),390px,calc((calc(100 * var(--vh)) - 330px) / 1.04));
  padding:calc(var(--sat) + 100px) 0 calc(var(--sab) + min(40px,calc(4 * var(--vh))));
  background:linear-gradient(180deg,rgba(4,8,20,.32) 0,rgba(4,8,20,.32) calc(var(--sat) + 92px),rgba(4,8,20,.82) calc(var(--sat) + 190px),rgba(4,8,20,.9))}
.fl-wheel.on{opacity:1}
.fl-wh{display:flex;flex-direction:column;align-items:center}
.fl-wh.hide{display:none}
@keyframes flRot{to{transform:rotate(360deg)}}

/* başlık: kimin sırası (sade: portre, ad, tek satır) */
.fl-wh-cap{display:flex;align-items:center;gap:12px;margin-bottom:20px;opacity:0;transform:translateY(-10px)}
.fl-wheel.on .fl-wh-cap{animation:flCapIn .35s .05s ease-out forwards}
@keyframes flCapIn{to{opacity:1;transform:none}}
.fl-wh-cap .av{flex:none;width:46px;height:46px;border-radius:50%;padding:2.5px;background:var(--pc,#fff)}
.fl-wh-cap .av .fl-av{width:100%;height:100%;border-radius:50%;border:2px solid #0e1736;box-shadow:none}
.fl-wh-cap b{display:block;font-family:'Lilita One';font-weight:400;font-size:26px;line-height:1.05;letter-spacing:.01em;color:#fff;white-space:nowrap}
.fl-wh-cap small{display:block;margin-top:2px;font-family:'Manrope',system-ui,sans-serif;font-weight:700;font-size:13px;color:#aebbd8;white-space:nowrap}

/* sahne: giriş hafif büyüyerek, çıkış sönerek */
.fl-wh-stage{position:relative;width:var(--ws);margin-top:calc(var(--ws) * .06);opacity:0;transform:scale(.88)}
.fl-wheel.on .fl-wh-stage{animation:flWhIn .42s cubic-bezier(.2,.9,.3,1.1) forwards}
@keyframes flWhIn{to{opacity:1;transform:none}}
.fl-wheel.out .fl-wh-stage,.fl-wheel.out .fl-wh-cap,.fl-wheel.out .fl-wh-act{opacity:1;transform:none;animation:flWhOut .26s ease-in forwards}
@keyframes flWhOut{to{opacity:0;transform:scale(.96)}}
.fl-wh-box{position:relative;width:100%;aspect-ratio:1}
.fl-wh-box>svg,.fl-wh-spin,.fl-wh-dim,.fl-wh-pop{position:absolute;left:0;top:0;width:100%;height:100%}
.fl-wh-spin{will-change:transform}
.fl-wh-spin>svg{width:100%;height:100%}
.fl-wh-blur{position:absolute;inset:5%;border-radius:50%;opacity:0;will-change:opacity}
.fl-wh.sb .fl-wh-blur{inset:7.5%}

/* sonuç: diğerleri kararır, kazanan dilim sakince öne çıkar */
.fl-wh-dim{opacity:0;will-change:opacity;pointer-events:none}
.fl-wh-dim svg{width:100%;height:100%}
.fl-wheel.done .fl-wh-dim{opacity:.58;transition:opacity .4s ease-out}
.fl-wh-pop{pointer-events:none}
.fl-wh-pop .pz{position:absolute;inset:0;opacity:0}
.fl-wh-pop .pz>svg{position:absolute;inset:0;width:100%;height:100%}
.fl-wheel.done .fl-wh-pop .pz{animation:flSliceUp .45s cubic-bezier(.2,.9,.3,1.15) forwards}
@keyframes flSliceUp{0%{opacity:0;transform:none}30%{opacity:1}100%{opacity:1;transform:translateY(-2.2%) scale(1.045)}}

/* göbek */
.fl-wh-hub{position:absolute;left:39%;top:39%;width:22%;height:22%;display:grid;place-items:center;z-index:2;pointer-events:none}
.fl-wh.sb .fl-wh-hub{left:37%;top:37%;width:26%;height:26%}
.fl-wh.sc .fl-wh-hub{left:36.5%;top:36.5%;width:27%;height:27%}
.fl-wh-hub>svg{position:absolute;inset:0;width:100%;height:100%}
.fl-wh-hub .fl-av{position:relative;width:76%;height:76%;border-radius:50%;border:0;box-shadow:none}

/* mandal: jantın tepesinde, dilim sınırlarına değince hafifçe sapar */
.fl-wh-tk{position:absolute;left:50%;top:-10%;width:14%;margin-left:-7%;aspect-ratio:60/64;transform-origin:50% 21.9%;will-change:transform;z-index:3;pointer-events:none}
.fl-wh.sb .fl-wh-tk{top:-8%}
.fl-wh.sc .fl-wh-tk{top:-6.2%;width:12%;margin-left:-6%}
.fl-wh-tk svg{width:100%;height:100%}

/* çarkın altı: tek büyük ÇEVİR düğmesi; bot sırasında durum yazısı; sonuçta kategori kartı */
.fl-wh-act{position:relative;width:var(--ws);height:96px;margin-top:22px;opacity:0}
.fl-wheel.on .fl-wh-act{animation:flCapIn .35s .12s ease-out forwards}
.fl-wh-act>*{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);transition:opacity .2s,transform .25s}
.fl-wh-act .go{width:62%;--b1:#ffd54a;--b2:#f2a414;--b3:#9a5a06;color:#3a2200;font-size:clamp(24px,calc(7.4 * var(--vw)),30px);letter-spacing:.06em;text-shadow:0 1px 0 rgba(255,255,255,.45);opacity:0;pointer-events:none}
.fl-wheel.me.idle .fl-wh-act .go{opacity:1;pointer-events:auto;animation:flGoBreath 1.6s ease-in-out infinite}
@keyframes flGoBreath{0%,100%{transform:translate(-50%,-50%)}50%{transform:translate(-50%,-50%) scale(1.04)}}
.fl-wheel.press .fl-wh-act .go{transform:translate(-50%,calc(-50% + 4px))}
.fl-wh-act .st{white-space:nowrap;font-family:'Manrope',system-ui,sans-serif;font-weight:700;font-size:14px;letter-spacing:.04em;color:#c9d4ee;opacity:0}
.fl-wheel.bot:not(.done) .fl-wh-act .st{opacity:1}
.fl-wh-card{display:flex;align-items:center;gap:14px;width:min(94%,350px);padding:12px 22px 12px 12px;border-radius:22px;background:#fff;
  box-shadow:0 2px 0 rgba(0,0,0,.08),0 14px 30px rgba(0,0,0,.4);opacity:0;transform:translate(-50%,-38%) scale(.96)}
.fl-wheel.done .fl-wh-card{opacity:1;transform:translate(-50%,-50%);transition:opacity .3s .12s ease-out,transform .4s .12s cubic-bezier(.2,.9,.3,1.1)}
.fl-wh-card .ic{flex:none;width:64px;height:64px;border-radius:18px;display:grid;place-items:center;background:var(--cc)}
.fl-wh-card .ic .fl-gl{width:62%;height:62%}
.fl-wh-card .tx{min-width:0;display:flex;flex-direction:column}
.fl-wh-card b{font-family:'Lilita One';font-weight:400;font-size:calc(30px * var(--fz,1));line-height:1.05;color:#14214a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fl-wh-card small{margin-top:3px;font-family:'Manrope',system-ui,sans-serif;font-weight:700;font-size:14px;color:#5b6a8c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* "Fetih!" kategori seçimi: taçlı başlık, süre çubuğu, büyük kategori kartları */
.fl-catpick{position:relative;width:min(calc(calc(100 * var(--vw)) - 24px),420px);display:flex;flex-direction:column;align-items:center;margin-top:calc(-1 * min(36px,calc(4 * var(--vh))))}
.fl-catpick .hd{position:relative;display:flex;flex-direction:column;align-items:center;margin-bottom:14px}
.fl-catpick .cr{position:relative;width:min(96px,calc(11 * var(--vh)));aspect-ratio:1;display:grid;place-items:center;transform:scale(0) rotate(-40deg)}
.fl-wheel.pick .fl-catpick .cr{animation:flMedIn .55s .05s cubic-bezier(.3,1.7,.5,1) forwards}
.fl-catpick .cr .fl-ci{position:relative;width:100%;height:100%}
.fl-catpick .hd b{position:relative;margin-top:-4px;font-family:'Lilita One';font-weight:400;font-size:clamp(38px,min(calc(12 * var(--vw)),calc(6.2 * var(--vh))),54px);line-height:1;letter-spacing:.03em;color:#ffe066;${OUT('#5a2a00', 3.5)};
  opacity:0;transform:scale(1.8)}
.fl-wheel.pick .fl-catpick .hd b{animation:flTitleIn .4s .15s cubic-bezier(.3,1.5,.5,1) forwards}
@keyframes flTitleIn{to{opacity:1;transform:none}}
.fl-catpick .hd small{position:relative;margin-top:7px;font-family:'Manrope',system-ui,sans-serif;font-weight:800;font-size:12.5px;letter-spacing:.24em;margin-right:-.24em;text-transform:uppercase;color:#fff4dc;text-shadow:0 1px 3px rgba(0,0,0,.9)}
.fl-catpick .tm{position:relative;display:flex;align-items:center;gap:10px;margin-top:10px;width:min(250px,64%)}
.fl-catpick .tm .br{flex:1;height:11px;border-radius:6px;overflow:hidden;background:rgba(255,255,255,.14);box-shadow:inset 0 2px 0 rgba(0,0,0,.4),0 0 0 2px rgba(0,0,0,.35)}
.fl-catpick .tm .br i{display:block;height:100%;border-radius:6px;background:linear-gradient(180deg,#fff4b0,#ffc21a 60%,#e08a0a);transform-origin:0 50%;animation:flTimer 8s linear forwards}
@keyframes flTimer{from{transform:scaleX(1)}to{transform:scaleX(0)}}
.fl-catpick .tm em{flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-family:'Lilita One';font-size:19px;color:#3a2000;
  background:radial-gradient(circle at 45% 35%,#fff6c8,#ffc93a 60%,#c98a12);border:2.5px solid #fff;box-shadow:0 3px 0 rgba(0,0,0,.4)}
.fl-catpick .tm.hot .br i{background:linear-gradient(180deg,#ffb4a4,#ff5a3a 60%,#c42a1a)}
.fl-catpick .tm.hot em{color:#fff;background:radial-gradient(circle at 45% 35%,#ff9a8a,#e8402a 60%,#8a1406);animation:flBeat .5s ease-in-out infinite alternate}
.fl-catpick .gr{width:100%;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.fl-catpick button{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-height:clamp(80px,calc(12.5 * var(--vh)),124px);padding:8px 8px 11px;border-radius:20px;overflow:hidden;
  background:linear-gradient(180deg,var(--cl) 0%,var(--cc) 46%,var(--cd) 100%);border:3px solid rgba(255,255,255,.95);
  box-shadow:inset 0 3px 0 rgba(255,255,255,.35),inset 0 -5px 0 rgba(0,0,0,.16),0 0 0 2px var(--ce),0 6px 0 var(--ce),0 10px 18px rgba(0,0,0,.35);
  transition:transform .08s,opacity .25s;animation:flCardIn .42s calc(.14s + var(--k) * .05s) cubic-bezier(.3,1.6,.5,1) backwards}
@keyframes flCardIn{from{opacity:0;transform:translateY(26px) scale(.7)}}
.fl-catpick button::before{content:'';position:absolute;left:0;right:0;top:0;height:46%;background:linear-gradient(180deg,rgba(255,255,255,.26),rgba(255,255,255,0));pointer-events:none}
.fl-catpick button:active{transform:translateY(4px)}
.fl-catpick .ci{position:relative;width:min(64px,calc(16 * var(--vw)),calc(7.6 * var(--vh)));aspect-ratio:1}
.fl-catpick .ci .fl-ci{width:100%;height:100%}
.fl-catpick button b{position:relative;font-family:'Lilita One';font-weight:400;font-size:clamp(16px,calc(5 * var(--vw)),21px);line-height:1.05;letter-spacing:.02em;text-align:center;color:#fff;${OUT('var(--ce)', 2)}}
.fl-catpick.chosen button:not(.chosen){opacity:.32;transform:scale(.93)}
.fl-catpick button.chosen{z-index:1;animation:flChosen .5s cubic-bezier(.3,1.7,.5,1) forwards;box-shadow:inset 0 3px 0 rgba(255,255,255,.35),0 0 0 2px var(--ce),0 0 0 6px #ffd25a,0 6px 0 var(--ce),0 0 34px 6px rgba(255,214,90,.6)}
@keyframes flChosen{0%{transform:none}40%{transform:scale(1.12)}100%{transform:scale(1.05)}}

@media (prefers-reduced-motion:reduce){
  .fl-ui .fl-catpick .tm .br i{animation-duration:var(--sec,8s)!important}
}

/* ---------------------------------------------------------------- düello sahnesi */
.fl-duel{position:absolute;inset:0;display:none;pointer-events:auto;overflow:hidden}
.fl-duel.on{display:block}
.fl-duel .dz{position:absolute;inset:0;background:linear-gradient(160deg,var(--c),var(--c2));transform:translateX(var(--from));animation:flSlideIn .4s cubic-bezier(.2,.9,.3,1) forwards}
.fl-duel .dz::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(-30deg,rgba(255,255,255,.07) 0 14px,rgba(255,255,255,0) 14px 40px)}
.fl-duel .dz::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at var(--gx) var(--gy),rgba(255,255,255,.35),rgba(255,255,255,0) 45%)}
.fl-duel .dz.a{--from:-105%;--gx:30%;--gy:25%;clip-path:polygon(0 0,100% 0,100% 40%,0 60%)}
.fl-duel .dz.d{--from:105%;--gx:70%;--gy:75%;clip-path:polygon(0 60%,100% 40%,100% 100%,0 100%)}
@keyframes flSlideIn{to{transform:none}}
.fl-duel .slash{position:absolute;left:-30%;right:-30%;top:50%;height:10px;margin-top:-5px;background:linear-gradient(90deg,transparent,#fff 15%,#fff6c8 50%,#fff 85%,transparent);
  box-shadow:0 0 18px 6px rgba(255,230,140,.8);transform:rotate(var(--sa,-12deg)) scaleX(0);animation:flSlash .3s .3s ease-out forwards}
@keyframes flSlash{to{transform:rotate(var(--sa,-12deg)) scaleX(1)}}
.fl-duel .lay{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:calc(calc(4.5 * var(--vh)) + var(--sat)) 5% calc(calc(4.5 * var(--vh)) + var(--sab))}
.fl-duel .sd{display:flex;flex-direction:column;align-items:center;gap:8px;width:min(calc(56 * var(--vw)),240px)}
.fl-duel .sd.a{align-self:flex-start;animation:flSideA .45s .12s cubic-bezier(.2,1.3,.4,1) both}
.fl-duel .sd.d{align-self:flex-end;flex-direction:column-reverse;animation:flSideD .45s .12s cubic-bezier(.2,1.3,.4,1) both}
@keyframes flSideA{from{opacity:0;transform:translate(-60%,-10%) rotate(-8deg) scale(.7)}}
@keyframes flSideD{from{opacity:0;transform:translate(60%,10%) rotate(8deg) scale(.7)}}
.fl-duel .mid{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0}
.fl-duel .pt{position:relative;width:min(calc(40 * var(--vw)),calc(21 * var(--vh)),176px);aspect-ratio:1}
.fl-duel .pt .flag{position:absolute;left:-26%;top:-8%;width:44%;transform:rotate(-10deg);opacity:.95}
.fl-duel .sd.d .pt .flag{left:auto;right:-26%;transform:rotate(10deg)}
.fl-duel .pt .fl-av{position:absolute;inset:0;border-radius:26%;border:5px solid #fff;box-shadow:0 8px 0 rgba(0,0,0,.35),0 0 0 4px var(--pc)}
.fl-duel .nm{display:flex;flex-direction:column;align-items:center;padding:4px 18px 6px;border-radius:14px;background:var(--ink);border:3px solid #fff;box-shadow:0 5px 0 rgba(0,0,0,.4)}
.fl-duel .nm b{font-family:'Lilita One';font-weight:400;font-size:min(calc(8 * var(--vw)),32px);line-height:1;letter-spacing:.02em;max-width:calc(52 * var(--vw));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fl-duel .nm small{font-size:12px;letter-spacing:.16em;color:var(--gold)}
.fl-duel .nm .hp{display:flex;gap:3px;margin-top:3px}
.fl-duel .nm .hp i{width:15px;height:15px;background:var(--gold);-webkit-mask:var(--tw) center/contain no-repeat;mask:var(--tw) center/contain no-repeat}
.fl-duel .nm .hp i.off{opacity:.25}
.fl-duel .vs{position:relative;width:min(110px,calc(13 * var(--vh)));aspect-ratio:1;display:grid;place-items:center;opacity:0;transform:scale(3.2);animation:flVs .38s .42s cubic-bezier(.3,1.5,.5,1) forwards}
.fl-duel .vs .sw{position:absolute;inset:-8%;opacity:.9}
.fl-duel .vs .sw .fl-i{width:100%;height:100%}
.fl-duel .vs b{position:relative;font-family:'Lilita One';font-weight:400;font-size:min(70px,calc(8.5 * var(--vh)));line-height:1;color:var(--gold);letter-spacing:-.02em;${OUT('#5a1a00', 5)}}
@keyframes flVs{to{opacity:1;transform:scale(1)}}
.fl-duel .flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;animation:flFlash .45s .48s ease-out}
@keyframes flFlash{0%{opacity:0}15%{opacity:.75}100%{opacity:0}}
.fl-duel.on .shk{animation:flShk .32s .5s}
@keyframes flShk{0%,100%{transform:none}25%{transform:translate(-7px,4px)}50%{transform:translate(6px,-5px)}75%{transform:translate(-3px,3px)}}
.fl-duel .shk{position:absolute;inset:0}
.fl-duel .rib{display:flex;flex-direction:column;align-items:center;gap:4px;max-width:calc(calc(100 * var(--vw)) - 24px);transform:scaleX(0);animation:flRib .35s .7s cubic-bezier(.3,1.4,.5,1) forwards}
@keyframes flRib{to{transform:none}}
.fl-duel .rib .k{display:flex;align-items:center;gap:6px;padding:2px 12px 3px;border-radius:9px;font-family:'Lilita One';font-size:14px;letter-spacing:.14em;color:#4a2800;background:linear-gradient(#ffe680,#f5b324);border:2px solid #fff}
.fl-duel .rib .k .fl-i{font-size:16px}
.fl-duel .rib>b{display:block;padding:4px 30px 7px;font-family:'Lilita One';font-weight:400;font-size:min(calc(9 * var(--vw)),40px);line-height:1;letter-spacing:.03em;white-space:nowrap;color:#fff;background:linear-gradient(#e8402a,#a8231a);border:3px solid #fff;border-radius:12px;box-shadow:0 6px 0 #5a0d05;${OUT('#5a0d05', 2.5)}}
.fl-duel .rib .c{display:flex;align-items:center;gap:6px;padding:3px 12px 4px 4px;border-radius:999px;font-size:15px;background:var(--ink);border:2.5px solid var(--cc)}
.fl-duel .rib .c .ci{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:15px;background:var(--cc)}
.fl-duel.siege .rib>b{background:linear-gradient(#5a3a2a,#2a1a10);box-shadow:0 6px 0 #120a05}
.fl-duel.siege .rib .k{background:linear-gradient(#ff8a6a,#d8301e);color:#fff}
.fl-duel .skip{position:absolute;right:12px;bottom:calc(10px + var(--sab));font-size:12px;letter-spacing:.1em;padding:3px 10px;border-radius:8px;background:rgba(10,21,52,.85);border:1.5px solid rgba(255,255,255,.4);opacity:0;animation:flUp .3s 1s forwards}
.fl-duel.out{animation:flDuelOut .3s ease-in forwards}
@keyframes flDuelOut{to{opacity:0;transform:scale(1.06)}}

/* ---------------------------------------------------------------- seçim sırası */
.fl-rank{position:absolute;left:50%;top:46%;width:min(calc(calc(100 * var(--vw)) - 32px),380px);padding:12px 12px 14px;border-radius:24px;background:var(--panel);border:3px solid var(--gold);box-shadow:0 0 0 2.5px var(--gold-dd),0 8px 0 var(--navy-d);
  opacity:0;transform:translate(-50%,-50%) scale(.8);transition:opacity .25s,transform .35s cubic-bezier(.3,1.5,.5,1)}
.fl-rank.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
.fl-rank h4{display:flex;align-items:center;justify-content:center;gap:8px;margin:0 0 8px;font-family:'Lilita One';font-weight:400;font-size:24px;color:var(--gold);${OUT('#3a2000', 2)}}
.fl-rank h4 .fl-i{font-size:24px}
.fl-rank .rw{display:flex;align-items:center;gap:10px;padding:5px 10px 5px 5px;border-radius:14px;margin-top:6px;background:var(--ink);border:2px solid rgba(255,255,255,.15);animation:flRowIn .35s calc(.15s + var(--k) * .12s) cubic-bezier(.3,1.4,.5,1) both}
.fl-rank .rw:first-of-type{border-color:var(--gold);background:linear-gradient(90deg,rgba(255,210,90,.3),var(--ink) 70%)}
.fl-rank .md{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-family:'Lilita One';font-size:17px;color:#3a2000;background:linear-gradient(#e8eef8,#9aa8c0);border:2px solid #fff}
.fl-rank .rw:nth-of-type(1) .md{background:linear-gradient(#fff1a0,#f5b324)}
.fl-rank .rw:nth-of-type(2) .md{background:linear-gradient(#fff,#b8c4d8)}
.fl-rank .rw:nth-of-type(3) .md{background:linear-gradient(#ffc89a,#c8763a)}
.fl-rank .fl-av{width:36px;height:36px;border-radius:11px;border-width:2px}
.fl-rank .rw>b{flex:1;min-width:0;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fl-rank .rw>em{flex:none;font-style:normal;font-family:'Lilita One';font-size:17px;padding:1px 10px 2px;border-radius:9px;color:#fff;background:#2fa84a;border:2px solid #fff}
.fl-rank .rw>em.z{background:#46557a}

${LAND}{
  .fl-duel .dz.a{clip-path:polygon(0 0,57% 0,43% 100%,0 100%)}
  .fl-duel .dz.d{clip-path:polygon(57% 0,100% 0,100% 100%,43% 100%)}
  .fl-duel .slash{left:50%;right:auto;top:-10%;bottom:-10%;width:10px;height:auto;margin:0 0 0 -5px;background:linear-gradient(180deg,transparent,#fff 15%,#fff6c8 50%,#fff 85%,transparent);transform:rotate(var(--sa,15deg)) scaleY(0);animation-name:flSlashL}
  .fl-duel .lay{flex-direction:row;align-items:center;padding:calc(10px + var(--sat)) 4% calc(10px + var(--sab))}
  .fl-duel .sd{width:calc(28 * var(--vw));align-self:center!important}
  .fl-duel .sd.d{flex-direction:column}
  .fl-duel .pt{width:min(calc(22 * var(--vw)),calc(42 * var(--vh)))}
  .fl-duel .mid{flex:1;gap:10px}
  .fl-duel .vs{width:min(110px,calc(24 * var(--vh)))}
  .fl-duel .vs b{font-size:min(70px,calc(15 * var(--vh)))}
  .fl-rank{top:50%}
}
@keyframes flSlashL{to{transform:rotate(var(--sa,15deg)) scaleY(1)}}
`;
