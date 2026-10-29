// Çark, "Fetih!" kategori seçimi, düello sahnesi ve seçim sırası stilleri.

import { OUT, LAND } from './cssutil.js';

export const CSS_WHEEL = /* css */ `
/* ---------------------------------------------------------------- çark */
.fl-wheel{position:absolute;inset:0;display:grid;place-items:center;opacity:0;transition:opacity .22s;background:radial-gradient(circle at 50% 48%,rgba(8,14,34,.45),rgba(8,14,34,.88) 70%)}
.fl-wheel.on{opacity:1}
.fl-wh{display:flex;flex-direction:column;align-items:center;gap:30px;transition:opacity .2s,transform .3s}
.fl-wh.hide{display:none}
.fl-wh-cap{display:flex;align-items:center;gap:10px;padding:5px 18px 6px 5px;border-radius:18px;background:var(--panel);border:3px solid var(--gold);box-shadow:0 5px 0 var(--navy-d);transform:translateY(-14px);opacity:0}
.fl-wheel.on .fl-wh-cap{animation:flUp .35s .05s cubic-bezier(.3,1.5,.5,1) forwards}
.fl-wh-cap .fl-av{width:44px;height:44px;border-radius:13px}
.fl-wh-cap b{display:block;font-family:'Lilita One';font-weight:400;font-size:22px;line-height:1.05;letter-spacing:.02em}
.fl-wh-cap small{display:block;font-size:14px;color:#cfe0ff}
.fl-wh-box{position:relative;width:min(calc(84 * var(--vw)),370px);aspect-ratio:1;transform:scale(.6);opacity:0}
.fl-wheel.on .fl-wh-box{animation:flWhIn .45s cubic-bezier(.3,1.5,.5,1) forwards}
@keyframes flWhIn{to{transform:scale(1);opacity:1}}
.fl-wh-box>svg,.fl-wh-spin{position:absolute;inset:0;width:100%;height:100%}
.fl-wh-spin{will-change:transform}
.fl-wh-spin svg{width:100%;height:100%}
.fl-wh-rays{position:absolute;left:-30%;top:-30%;width:160%;height:160%;border-radius:50%;opacity:.35;
  background:repeating-conic-gradient(from 0deg,rgba(255,226,140,.5) 0deg 7deg,rgba(255,226,140,0) 7deg 18deg);
  -webkit-mask:radial-gradient(circle,#000 25%,transparent 68%);mask:radial-gradient(circle,#000 25%,transparent 68%);animation:flRot 24s linear infinite;will-change:transform}
.fl-wheel.done .fl-wh-rays{opacity:1;animation:flRot 6s linear infinite,flRaysPop .5s cubic-bezier(.3,1.5,.5,1)}
@keyframes flRot{to{transform:rotate(360deg)}}
@keyframes flRaysPop{from{opacity:.35}}
.fl-wh-box .bulbs circle{fill:#fff7d0;stroke:#c98a12;stroke-width:1.4}
.fl-wh-box .bulbs .b1{animation:flBulb 1s steps(1) infinite}
.fl-wh-box .bulbs .b0{animation:flBulb 1s .5s steps(1) infinite}
.fl-wheel.spinning .bulbs .b1{animation-duration:.24s}
.fl-wheel.spinning .bulbs .b0{animation-duration:.24s;animation-delay:.12s}
.fl-wheel.done .bulbs circle{animation:flBulb .16s steps(1) 6}
@keyframes flBulb{0%{opacity:1}50%{opacity:.3}}
.fl-wh-hl{opacity:0}
.fl-wheel.done .fl-wh-hl{animation:flHl .9s ease-out forwards}
@keyframes flHl{0%{opacity:0}25%{opacity:.75}100%{opacity:.32}}
.fl-wh-hub{position:absolute;left:50%;top:50%;width:17%;height:17%;margin:-8.5% 0 0 -8.5%;border-radius:50%;display:grid;place-items:center;overflow:hidden}
.fl-wh-hub b{font-family:'Lilita One';font-weight:400;font-size:min(calc(4.4 * var(--vw)),18px);color:#fff;${OUT('#7a1a0a', 1.5)}}
.fl-wh-hub.me{background:radial-gradient(circle at 45% 35%,#ff8a6a,#d8301e 70%);border:2px solid #fff}
.fl-wh-hub.me:not(.go){animation:flHubP .9s ease-in-out infinite}
@keyframes flHubP{50%{transform:scale(1.12)}}
.fl-wh-hub .fl-av{width:100%;height:100%;border-radius:50%;border:2px solid #fff;box-shadow:none}
.fl-wh-tk{position:absolute;left:50%;top:-8.5%;width:12%;margin-left:-6%;aspect-ratio:40/64;transform-origin:50% 26.5%;will-change:transform;z-index:2}
.fl-wh-tk svg{width:100%;height:100%;filter:drop-shadow(0 3px 0 rgba(0,0,0,.4))}
.fl-wh-res{min-height:56px;display:flex;align-items:center;gap:10px;padding:5px 22px 6px 6px;border-radius:20px;background:linear-gradient(var(--cc),var(--cd));border:3.5px solid #fff;box-shadow:0 6px 0 rgba(0,0,0,.4);opacity:0;transform:scale(.4)}
.fl-wh-res.on{animation:flResIn .5s cubic-bezier(.3,1.8,.5,1) forwards}
.fl-wh-res:empty{visibility:hidden}
@keyframes flResIn{to{opacity:1;transform:none}}
.fl-wh-res .ri{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:28px;background:#fff;box-shadow:inset 0 -3px 0 rgba(0,0,0,.12)}
.fl-wh-res b{display:block;font-family:'Lilita One';font-weight:400;font-size:30px;line-height:1;${OUT('var(--cd)', 2.5)}}
.fl-wh-res small{display:block;font-size:14px;margin-top:2px;${OUT('var(--cd)', 1)}}
.fl-wheel.fetih .fl-wh-res{box-shadow:0 0 0 4px #fff3b0,0 6px 0 rgba(0,0,0,.4),0 0 40px 10px rgba(255,210,90,.6)}

/* "Fetih!" kategori seçimi */
.fl-catpick{width:min(calc(calc(100 * var(--vw)) - 24px),420px);padding:14px;border-radius:26px;background:var(--panel);border:3px solid var(--gold);box-shadow:0 0 0 2.5px var(--gold-dd),0 8px 0 var(--navy-d),0 0 60px rgba(255,210,90,.35);
  transform:scale(.7);opacity:0}
.fl-wheel.pick .fl-catpick{animation:flWhIn .4s cubic-bezier(.3,1.6,.5,1) forwards}
.fl-catpick .hd{display:flex;flex-direction:column;align-items:center;margin:-46px 0 10px}
.fl-catpick .cr{width:66px;height:66px;border-radius:50%;display:grid;place-items:center;font-size:40px;background:radial-gradient(circle at 45% 35%,#fff6c8,#ffc93a 55%,#c98a12);border:4px solid #fff;box-shadow:0 5px 0 var(--gold-dd)}
.fl-catpick .hd b{margin-top:2px;font-family:'Lilita One';font-weight:400;font-size:36px;line-height:1;color:var(--gold);${OUT('#5a2a00', 3)}}
.fl-catpick .hd small{font-size:15px;color:#fff}
.fl-catpick .gr{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fl-catpick button{display:flex;align-items:center;gap:9px;min-height:60px;padding:6px 10px 7px 6px;border-radius:16px;text-align:left;font-size:16px;line-height:1.1;
  background:linear-gradient(var(--cc),var(--cd));border:3px solid #fff;box-shadow:0 5px 0 rgba(0,0,0,.4);transition:transform .08s;animation:flPopIn .35s calc(.15s + var(--k) * .05s) cubic-bezier(.3,1.7,.5,1) both;${OUT('rgba(0,0,0,.4)', 1)}}
.fl-catpick button:active{transform:translateY(4px)}
.fl-catpick button.chosen{animation:flPop .35s;box-shadow:0 0 0 4px var(--gold),0 5px 0 rgba(0,0,0,.4)}
.fl-catpick .ci{flex:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-size:24px;background:#fff}

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
  .fl-wh{flex-direction:row;gap:18px}
  .fl-wh-cap{flex-direction:column;text-align:center;padding:8px 12px;max-width:180px;transform:translateX(-14px)}
  .fl-wh-box{width:min(calc(78 * var(--vh)),330px)}
  .fl-wh-res{flex-direction:column;padding:10px 14px;min-width:150px;text-align:center}
  .fl-catpick{width:min(calc(calc(100 * var(--vw)) - 24px),620px);padding:10px 12px 12px}
  .fl-catpick .gr{grid-template-columns:1fr 1fr 1fr}
  .fl-catpick .hd{margin:-30px 0 6px;flex-direction:row;gap:10px}
  .fl-catpick .cr{width:50px;height:50px;font-size:30px}
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
