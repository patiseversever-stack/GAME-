// Başlık, yeni maç menüsü, komutan seçimi ve bitiş ekranı stilleri.

import { OUT, LAND } from './cssutil.js';

export const CSS_MENU = /* css */ `
.fl-scr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;pointer-events:auto;transition:opacity .3s,visibility 0s;padding:0 16px}
.fl-scr.off{opacity:0;pointer-events:none;visibility:hidden;transition:opacity .3s,visibility 0s .3s}
.fl-ib{flex:none;width:46px;height:46px;border-radius:14px;display:grid;place-items:center;font-size:24px;background:linear-gradient(#2f5299,#1d3770);border:3px solid rgba(255,255,255,.7);box-shadow:0 4px 0 #0b1839;transition:transform .08s}
.fl-ib:active{transform:translateY(3px)}

/* ---------------------------------------------------------------- başlık */
.fl-title{justify-content:space-between;padding:calc(7vh + var(--sat)) 16px calc(5vh + var(--sab));background:linear-gradient(180deg,rgba(8,14,32,.75),rgba(8,14,32,0) 42%,rgba(8,14,32,0) 58%,rgba(8,14,32,.8))}
.fl-logo{position:relative;display:flex;flex-direction:column;align-items:center}
.fl-logo .rays{position:absolute;left:50%;top:38%;width:min(150vw,760px);aspect-ratio:1;margin-left:min(-75vw,-380px);transform:translateY(-50%);border-radius:50%;opacity:.55;pointer-events:none;
  background:repeating-conic-gradient(rgba(255,226,140,.55) 0deg 6deg,rgba(255,226,140,0) 6deg 18deg);-webkit-mask:radial-gradient(circle,#000 12%,transparent 60%);mask:radial-gradient(circle,#000 12%,transparent 60%);animation:flRot2 40s linear infinite}
@keyframes flRot2{from{transform:translateY(-50%) rotate(0)}to{transform:translateY(-50%) rotate(360deg)}}
.fl-logo .emb{position:relative;width:min(38vw,170px);aspect-ratio:1;margin-bottom:-22px;animation:flEmbIn .7s cubic-bezier(.3,1.6,.5,1) both,flFloat 3.4s 1s ease-in-out infinite}
.fl-emb{width:100%;height:100%;filter:drop-shadow(0 6px 0 rgba(0,0,0,.35))}
@keyframes flEmbIn{from{opacity:0;transform:scale(.2) rotate(-30deg)}}
@keyframes flFloat{50%{transform:translateY(-6px)}}
.fl-logo .w1{position:relative;display:flex;font-family:'Lilita One';font-size:min(23vw,112px);line-height:.92;letter-spacing:.01em}
.fl-logo .w1 i{display:block;font-style:normal;color:#fff;${OUT('#14245a', 6)};animation:flDropL .55s calc(.25s + var(--k) * .08s) cubic-bezier(.3,1.6,.5,1) both,flWave 2.8s calc(1.4s + var(--k) * .14s) ease-in-out infinite}
@keyframes flDropL{from{opacity:0;transform:translateY(-120px) scale(1.4)}}
@keyframes flWave{0%,100%{transform:none}50%{transform:translateY(-5px)}}
.fl-logo .w2{position:relative;margin-top:6px;padding:3px 34px 8px;border-radius:16px;overflow:hidden;background:linear-gradient(180deg,#ffe98a,#f5b324 60%,#e0950e);border:4.5px solid #fff;box-shadow:0 7px 0 #8a5206,0 12px 22px rgba(0,0,0,.35);animation:flPopIn .45s .7s cubic-bezier(.3,1.7,.5,1) both}
.fl-logo .w2 span{display:block;font-family:'Lilita One';font-size:min(12vw,56px);line-height:1;letter-spacing:.08em;color:#5a3000;text-shadow:0 2px 0 rgba(255,255,255,.55)}
.fl-logo .w2 .sh{position:absolute;top:0;bottom:0;left:0;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.75),transparent);transform:translateX(-150%) skewX(-20deg);animation:flShn 3.2s 1.4s ease-in-out infinite}
@keyframes flShn{0%{transform:translateX(-150%) skewX(-20deg)}35%,100%{transform:translateX(320%) skewX(-20deg)}}
.fl-logo small{display:block;margin-top:16px;padding:5px 16px 6px;border-radius:999px;font-size:17px;background:rgba(10,21,52,.85);border:2px solid rgba(255,210,90,.6);animation:flUp .4s 1s ease-out both;opacity:0;transform:translateY(10px)}
.fl-tbtns{display:flex;flex-direction:column;align-items:center;gap:16px;width:min(100%,400px);animation:flUp .45s 1.1s ease-out both;opacity:0;transform:translateY(20px)}
.fl-play{width:100%;font-size:clamp(30px,10vw,40px);padding:14px 20px 18px;animation:flPulse 1.6s 2s ease-in-out infinite}
.fl-play .fl-i{font-size:38px}
@keyframes flPulse{0%,100%{transform:none}50%{transform:scale(1.04)}}
.fl-tbtns .row{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%}
.fl-tbtns .row .fl-btn{justify-content:flex-start;gap:8px;padding:6px 10px 8px 6px;font-size:17px;text-align:left}
.fl-tbtns .row .fl-btn .fl-i{font-size:28px;margin-left:4px}
.fl-tbtns .fl-av{width:38px;height:38px;border-radius:11px;border-width:2.5px}
.fl-tbtns .tx{min-width:0}
.fl-tbtns .tx small{display:block;font-family:'Fredoka';font-size:11px;letter-spacing:.12em;color:#cfe0ff;text-shadow:none}
.fl-tbtns .tx b{display:block;font-weight:400;font-size:18px;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* ---------------------------------------------------------------- yeni maç */
.fl-menu{justify-content:flex-start;gap:0;padding:0;background:linear-gradient(180deg,rgba(9,17,42,.9),rgba(9,17,42,.97))}
.fl-mtop{display:flex;align-items:center;gap:10px;width:100%;max-width:640px;padding:calc(10px + var(--sat)) 12px 8px}
.fl-mtop h2{flex:1;margin:0;font-family:'Lilita One';font-weight:400;font-size:28px;letter-spacing:.03em;color:var(--gold);${OUT('#3a2000', 2)}}
.fl-cmdchip{display:flex;align-items:center;gap:7px;max-width:44%;padding:3px 10px 3px 3px;border-radius:14px;background:var(--ink);border:2.5px solid rgba(255,255,255,.6);box-shadow:0 3px 0 rgba(0,0,0,.4)}
.fl-cmdchip .fl-av{width:36px;height:36px;border-radius:10px;border-width:2px}
.fl-cmdchip b{min-width:0;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fl-cmdchip .fl-i{font-size:16px;opacity:.8}
.fl-mbody{flex:1;min-height:0;width:100%;max-width:640px;overflow-y:auto;overflow-x:hidden;touch-action:pan-y;padding:0 12px 12px;-webkit-overflow-scrolling:touch}
.fl-mbody section{margin-top:clamp(10px,2.4vh,24px)}
.fl-mbody h4{display:flex;align-items:center;gap:6px;margin:0 0 7px 2px;font-size:13px;letter-spacing:.16em;color:var(--gold)}
.fl-mbody h4 .fl-i{font-size:16px}
.fl-mbody button{position:relative;transition:transform .12s cubic-bezier(.3,1.5,.5,1)}
.fl-mbody button:active{transform:scale(.96)}
.fl-mbody .ck{position:absolute;right:-7px;top:-8px;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:16px;font-style:normal;background:#2fa84a;border:2.5px solid #fff;box-shadow:0 2px 0 rgba(0,0,0,.4);opacity:0;transform:scale(.3);transition:opacity .15s,transform .25s cubic-bezier(.3,1.8,.5,1)}
.fl-mbody .on .ck{opacity:1;transform:none}
.fl-modes{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fl-mode{display:flex;flex-direction:column;border-radius:18px;overflow:visible;background:var(--panel);border:3px solid rgba(255,255,255,.2);box-shadow:0 5px 0 var(--navy-d);text-align:left;animation:flPopIn .35s calc(var(--k) * .05s) cubic-bezier(.3,1.5,.5,1) both}
.fl-mode.on{border-color:var(--gold);box-shadow:0 0 0 2px var(--gold-d),0 5px 0 var(--gold-dd)}
.fl-mode .art{position:relative;height:clamp(64px,10vh,88px);margin:3px 3px 0;border-radius:14px 14px 8px 8px;display:flex;align-items:center;justify-content:center;gap:4px;overflow:hidden;
  background:linear-gradient(160deg,#3a6ad0,#1d3770);}
.fl-mode .art::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(-30deg,rgba(255,255,255,.07) 0 10px,transparent 10px 26px)}
.fl-mode.on .art{background:linear-gradient(160deg,#ffcf4a,#d8780e)}
.fl-mode .h{position:relative;width:44px;height:44px;border-radius:13px;border-width:2.5px}
.fl-mode .a3 .h:nth-child(2){transform:translateY(-8px) scale(1.12);z-index:1}
.fl-mode .a4{gap:2px}.fl-mode .a4 .h{width:34px;height:34px}
.fl-mode .tm{display:flex;padding:3px;border-radius:12px;gap:2px}
.fl-mode .tm .h{width:32px;height:32px}
.fl-mode .tm.r{background:#ff4d4d}.fl-mode .tm.b{background:#3d7dff}
.fl-mode .vs{position:relative;font-family:'Lilita One';font-weight:400;font-size:18px;color:var(--gold);${OUT('#3a1a00', 2)}}
.fl-mode .lb{padding:5px 10px 8px}
.fl-mode .lb b,.fl-len .lb b{display:block;font-family:'Lilita One';font-weight:400;font-size:21px;line-height:1.05}
.fl-mode .lb small,.fl-len .lb small{display:block;font-size:12.5px;line-height:1.15;color:#cfe0ff}
.fl-lens{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fl-len{display:flex;align-items:center;gap:9px;padding:7px 10px 8px 7px;border-radius:16px;text-align:left;background:var(--panel);border:3px solid rgba(255,255,255,.2);box-shadow:0 5px 0 var(--navy-d)}
.fl-len.on{border-color:var(--gold);box-shadow:0 0 0 2px var(--gold-d),0 5px 0 var(--gold-dd)}
.fl-len .li{flex:none;width:42px;height:42px;border-radius:12px;display:grid;place-items:center;font-size:26px;background:linear-gradient(#4f8fff,#2a5ad8);border:2px solid #fff}
.fl-len.on .li{background:linear-gradient(#ffe680,#f5b324)}
.fl-len.on .li .fl-i path:last-child{stroke:#7a4a06}
.fl-maps{display:flex;gap:9px;overflow-x:auto;overflow-y:hidden;touch-action:pan-x;padding:9px 4px 9px;margin:-9px -12px 0;padding-left:12px;scroll-snap-type:x proximity;scrollbar-width:none}
.fl-maps::-webkit-scrollbar{display:none}
.fl-map{flex:none;width:126px;display:flex;flex-direction:column;align-items:center;padding:6px 6px 7px;border-radius:16px;scroll-snap-align:start;background:var(--panel);border:3px solid rgba(255,255,255,.2);box-shadow:0 5px 0 var(--navy-d)}
.fl-map.on{border-color:var(--gold);box-shadow:0 0 0 2px var(--gold-d),0 5px 0 var(--gold-dd)}
.fl-map:last-child{margin-right:12px}
.fl-mm{width:100%;height:clamp(48px,8vh,64px);margin-bottom:4px;overflow:visible}
.fl-mm .base{fill:#36548c;stroke:#0d1733;stroke-width:.3}
.fl-mm .hi{fill:#ffcf4a;stroke:#7a4a06;stroke-width:.3}
.fl-map:not(.on) .fl-mm .hi{fill:#9ad06a;stroke:#2a5a1a}
.fl-map .mm-r{position:relative;width:100%}
.fl-map .mm-r .fl-mm{opacity:.5}
.fl-map .dice{position:absolute;left:50%;top:50%;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:10px;display:grid;place-items:center;font-size:24px;background:linear-gradient(#ff7d5c,#d8341f);border:2.5px solid #fff;box-shadow:0 3px 0 rgba(0,0,0,.35)}
.fl-map b{font-size:14px;line-height:1.1;white-space:nowrap}
.fl-map small{font-size:11.5px;color:#cfe0ff}
.fl-bots{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.fl-bot{display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 4px 8px;border-radius:14px;background:var(--panel);border:3px solid rgba(255,255,255,.2);box-shadow:0 4px 0 var(--navy-d)}
.fl-bot .st{display:flex;font-size:14px;height:18px;align-items:center}
.fl-bot .st .fl-i path:last-child{fill:#ffd25a;stroke:#ffd25a}
.fl-bot b{font-size:14.5px}
.fl-bot.on{color:#4a2800;background:linear-gradient(#ffe680,#f5b324);border-color:#fff;box-shadow:0 4px 0 var(--gold-dd)}
.fl-bot.on .st .fl-i path:last-child{fill:#c42a1a;stroke:#c42a1a}
.fl-mfoot{width:100%;max-width:640px;padding:10px 12px calc(12px + var(--sab));background:linear-gradient(180deg,rgba(9,17,42,0),rgba(9,17,42,.95) 30%)}
.fl-mfoot .fl-btn{width:100%}

/* ---------------------------------------------------------------- komutan */
.fl-cmd{background:rgba(6,11,28,.9);padding:calc(10px + var(--sat)) 10px calc(10px + var(--sab))}
.fl-cbox{display:flex;flex-direction:column;width:min(100%,460px);max-height:100%;padding:10px 12px 14px;border-radius:26px;background:var(--panel);border:3px solid var(--gold);box-shadow:0 0 0 2.5px var(--gold-dd),0 8px 0 var(--navy-d);animation:flPopIn .35s cubic-bezier(.3,1.5,.5,1) both}
.fl-cbox .hd{display:flex;align-items:center;gap:10px}
.fl-cbox h2{margin:0;font-family:'Lilita One';font-weight:400;font-size:26px;color:var(--gold);${OUT('#3a2000', 2)}}
.fl-cbox .top{display:flex;align-items:center;gap:14px;margin:10px 0 6px}
.fl-cbox .pv{position:relative;flex:none;width:120px;height:120px}
.fl-cbox .pv .flag{position:absolute;left:-30px;top:-14px;width:54px;transform:rotate(-14deg)}
.fl-cbox .pv .fl-av{position:absolute;inset:0;border-radius:28px;border-width:4px;box-shadow:0 6px 0 rgba(0,0,0,.4)}
.fl-cbox .nmf{flex:1;min-width:0}
.fl-cbox label{display:block;font-size:11px;letter-spacing:.14em;color:var(--gold);margin:0 0 4px 2px}
.fl-cbox input{width:100%;padding:9px 12px;border-radius:12px;font:inherit;font-size:20px;color:var(--tdark);background:var(--cream);border:2.5px solid #fff;outline:0;box-shadow:inset 0 3px 0 rgba(0,0,0,.08);pointer-events:auto;-webkit-user-select:text;user-select:text}
.fl-cbox input:focus{border-color:var(--gold)}
.fl-cbox .nmf small{display:block;margin:5px 0 0 2px;font-size:13px;color:#cfe0ff}
.fl-cbox .sk{display:flex;gap:7px;margin-top:7px}
.fl-cbox .sk button{width:26px;height:26px;border-radius:50%;border:2.5px solid rgba(255,255,255,.4)}
.fl-cbox .sk .s0{background:#f4cba3}.fl-cbox .sk .s1{background:#eab68a}.fl-cbox .sk .s2{background:#d89c6c}.fl-cbox .sk .s3{background:#b97d52}
.fl-cbox .sk button.on{border-color:#fff;box-shadow:0 0 0 3px var(--gold)}
.fl-cbox .sc{flex:1;min-height:0;overflow-y:auto;touch-action:pan-y;margin:0 -4px 12px;padding:0 4px}
.fl-cbox h4{margin:10px 0 6px 2px;font-size:12px;letter-spacing:.16em;color:var(--gold)}
.fl-cbox .avs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.fl-cbox .avs button{aspect-ratio:1;border-radius:16px;padding:3px;background:var(--ink);border:2.5px solid rgba(255,255,255,.2);transition:transform .12s}
.fl-cbox .avs .fl-av{width:100%;height:100%;border-radius:12px;border-width:0;box-shadow:none}
.fl-cbox .avs button.on{border-color:var(--gold);box-shadow:0 0 0 2px var(--gold-d);transform:scale(1.05)}
.fl-cbox .cos{display:flex;gap:10px}
.fl-cbox .cos button{width:46px;height:46px;border-radius:14px;background:var(--c);border:3px solid rgba(255,255,255,.35);box-shadow:0 4px 0 rgba(0,0,0,.4)}
.fl-cbox .cos button.on{border-color:#fff;box-shadow:0 0 0 3px var(--gold),0 4px 0 rgba(0,0,0,.4)}
.fl-cbox .bns{display:grid;grid-template-columns:repeat(6,1fr);gap:7px}
.fl-cbox .bns button{height:62px;padding:4px 7px;border-radius:12px;background:var(--ink);border:2.5px solid rgba(255,255,255,.2)}
.fl-cbox .bns button svg{width:100%;height:100%}
.fl-cbox .bns button.on{border-color:var(--gold);box-shadow:0 0 0 2px var(--gold-d)}
.fl-cbox>.fl-btn{width:100%}

/* ---------------------------------------------------------------- bitiş */
.fl-end{background:radial-gradient(circle at 50% 30%,rgba(30,52,110,.85),rgba(6,11,28,.95) 75%);padding:calc(10px + var(--sat)) 12px calc(12px + var(--sab))}
.fl-ein{display:flex;flex-direction:column;align-items:center;gap:12px;width:min(100%,460px)}
.fl-end .hdr{position:relative;display:flex;flex-direction:column;align-items:center}
.fl-end .hdr .rays{position:absolute;left:50%;top:50%;width:420px;height:420px;margin:-210px 0 0 -210px;border-radius:50%;opacity:0;pointer-events:none;
  background:repeating-conic-gradient(rgba(255,226,140,.6) 0deg 8deg,rgba(255,226,140,0) 8deg 20deg);-webkit-mask:radial-gradient(circle,#000 10%,transparent 62%);mask:radial-gradient(circle,#000 10%,transparent 62%)}
.fl-end.win .hdr .rays{opacity:1;animation:flRot 18s linear infinite}
.fl-end .hdr b{position:relative;font-family:'Lilita One';font-weight:400;font-size:min(17vw,80px);line-height:1;color:var(--gold);${OUT('#5a2a00', 5)};animation:flStampIn .6s .1s cubic-bezier(.3,1.7,.5,1) both}
.fl-end.lose .hdr b{color:#cfe0ff;${OUT('#14245a', 5)}}
.fl-end .hdr span{position:relative;margin-top:6px;padding:4px 14px 5px;border-radius:999px;font-size:16px;background:var(--ink);border:2px solid rgba(255,210,90,.6);animation:flUp .35s .45s ease-out both;opacity:0;transform:translateY(10px)}
@keyframes flStampIn{from{opacity:0;transform:scale(2.6)}}
.fl-podium{display:flex;align-items:flex-end;justify-content:center;gap:8px;width:100%;margin-top:4px}
.fl-podium .pd{flex:1;max-width:140px;display:flex;flex-direction:column;align-items:center}
.fl-podium .who{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0;max-width:100%;margin-bottom:6px;animation:flDrop .5s calc(.9s - var(--k) * .2s) cubic-bezier(.3,1.5,.5,1) both}
.fl-podium .hs{display:flex;gap:2px}
.fl-podium .fl-av{width:58px;height:58px;border-radius:17px;border-width:3px}
.fl-podium .p1 .fl-av{width:76px;height:76px;border-radius:22px}
.fl-podium .hs .fl-av+.fl-av{margin-left:-12px}
.fl-podium .crown{width:40px;height:30px;margin-bottom:-4px;display:grid;place-items:center;font-size:34px;color:#7a4a06;filter:drop-shadow(0 3px 0 rgba(0,0,0,.3))}
.fl-podium .crown .fl-i path:last-child{fill:#ffd25a}
.fl-podium .who b{max-width:100%;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:1px 8px;border-radius:8px;background:var(--ink)}
.fl-podium .me .who b{background:var(--gold);color:#4a2800}
.fl-podium .who em{font-style:normal;font-family:'Lilita One';font-size:18px;color:var(--gold);${OUT('#3a2000', 1.5)}}
.fl-podium .ped{position:relative;width:100%;border-radius:12px 12px 4px 4px;display:flex;justify-content:center;padding-top:6px;transform-origin:50% 100%;animation:flRise .5s calc(.6s - var(--k) * .2s) cubic-bezier(.3,1.4,.5,1) both;
  background:linear-gradient(180deg,var(--p1),var(--p2));border:3px solid #fff;border-bottom:0;box-shadow:inset 0 -10px 0 rgba(0,0,0,.15)}
.fl-podium .ped span{font-family:'Lilita One';font-size:34px;line-height:1;color:#fff;${OUT('rgba(0,0,0,.35)', 2)}}
.fl-podium .p1 .ped{height:110px;--p1:#ffe680;--p2:#e0950e}
.fl-podium .p2 .ped{height:80px;--p1:#f0f4fa;--p2:#9aa8c0}
.fl-podium .p3 .ped{height:60px;--p1:#ffc89a;--p2:#b8682a}
@keyframes flRise{from{transform:scaleY(0)}}
.fl-rest{display:flex;flex-direction:column;gap:6px;width:100%}
.fl-rest .rr{display:flex;align-items:center;gap:8px;padding:4px 10px 4px 6px;border-radius:12px;background:var(--ink);border:2px solid rgba(255,255,255,.15);animation:flRowIn .35s 1s both}
.fl-rest .rr.me{border-color:var(--gold)}
.fl-rest .n{width:22px;text-align:center;font-family:'Lilita One';font-size:17px}
.fl-rest .fl-av{width:30px;height:30px;border-radius:9px;border-width:2px}
.fl-rest b{flex:1;font-size:15px}
.fl-rest em{font-style:normal;font-family:'Lilita One';color:var(--gold)}
.fl-rew{display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border-radius:18px;background:var(--panel);border:2.5px solid rgba(255,210,90,.55);box-shadow:0 5px 0 var(--navy-d);animation:flUp .4s .8s ease-out both;opacity:0;transform:translateY(12px)}
.fl-rew .xp{flex:1;display:flex;align-items:center;gap:8px;min-width:0}
.fl-rew .lv{flex:none;width:52px;height:52px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 45% 35%,#7a9cff,#2a4ab8);border:3px solid #fff}
.fl-rew .lv small{font-size:7.5px;letter-spacing:.1em;line-height:1}
.fl-rew .lv b{font-family:'Lilita One';font-weight:400;font-size:22px;line-height:1}
.fl-rew .lv.up{animation:flPop .5s}
.fl-rew .bar{position:relative;flex:1;height:24px;border-radius:12px;overflow:hidden;background:#0a1534;border:2.5px solid #fff}
.fl-rew .bar u{position:absolute;inset:0;background:linear-gradient(#a0c0ff,#4a7aff);transform-origin:0 50%}
.fl-rew .bar span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:4px;font-size:13px;${OUT('#0a1534', 1.5)}}
.fl-rew .bar span b{font-family:'Lilita One';font-weight:400;font-size:15px}
.fl-rew .gd{flex:none;display:flex;align-items:center;gap:5px;padding:4px 10px 4px 4px;border-radius:999px;background:#0a1534;border:2px solid var(--gold)}
.fl-rew .coin{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:22px;background:radial-gradient(circle at 45% 35%,#fff3b0,#f5b324 60%,#b07a12);border:2px solid #fff}
.fl-rew .gd b{font-family:'Lilita One';font-weight:400;font-size:19px;color:var(--gold)}
.fl-rew .gd small{font-size:10px;letter-spacing:.1em;color:#cfe0ff}
.fl-end .btns{display:grid;grid-template-columns:auto 1fr;gap:10px;width:100%;animation:flUp .4s 1.1s ease-out both;opacity:0;transform:translateY(12px)}
.fl-end .btns .fl-btn.big{font-size:clamp(19px,6.4vw,26px);padding:12px 10px 15px}

${LAND}{
  .fl-title{flex-direction:row;justify-content:space-around;padding:calc(12px + var(--sat)) 24px calc(12px + var(--sab))}
  .fl-logo .emb{width:min(26vh,120px)}
  .fl-logo .w1{font-size:min(19vh,92px)}
  .fl-logo .w2 span{font-size:min(10vh,44px)}
  .fl-tbtns{width:min(42vw,380px)}
  .fl-mbody{display:grid;grid-template-columns:1fr 1fr;column-gap:16px;align-content:start;max-width:900px}
  .fl-mtop,.fl-mfoot{max-width:900px}
  .fl-mtop{padding-top:calc(6px + var(--sat));padding-bottom:4px}
  .fl-mtop h2{font-size:24px}
  .fl-mbody section{margin-top:6px;min-width:0}
  .fl-modes{grid-template-columns:repeat(4,1fr);gap:7px}
  .fl-mode .art{height:52px}
  .fl-mode .h{width:30px;height:30px;border-radius:9px}
  .fl-mode .a4 .h,.fl-mode .tm .h{width:24px;height:24px}
  .fl-mode .lb{padding:3px 7px 5px}
  .fl-mode .lb b{font-size:16px}
  .fl-mode .lb small{font-size:10.5px}
  .fl-maps{margin:-9px 0 0;padding-left:4px}
  .fl-map{width:98px}
  .fl-mm{height:40px}
  .fl-mfoot{padding-top:4px}
  .fl-mfoot .fl-btn.big{font-size:24px;padding:9px 20px 12px}
  .fl-cbox{width:min(100%,760px);display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto 1fr auto;column-gap:16px}
  .fl-cbox .hd{grid-column:1/3}
  .fl-cbox .top{grid-row:2;flex-direction:column;align-items:stretch;width:220px;margin:6px 0}
  .fl-cbox .pv{width:100px;height:100px;align-self:center}
  .fl-cbox .sc{grid-row:2;grid-column:2;margin-bottom:8px}
  .fl-cbox .avs{grid-template-columns:repeat(8,1fr)}
  .fl-cbox>.fl-btn{grid-column:1/3}
  .fl-ein{display:grid;grid-template-columns:1fr 1fr;grid-template-areas:'h h' 'p r' 'p b' 'p x';column-gap:18px;row-gap:10px;width:min(100%,840px);align-items:end}
  .fl-end .hdr{grid-area:h}
  .fl-end .hdr b{font-size:min(13vh,60px)}
  .fl-podium{grid-area:p}
  .fl-rest{grid-area:x}
  .fl-rew{grid-area:r}
  .fl-end .btns{grid-area:b}
  .fl-podium .p1 .ped{height:80px}.fl-podium .p2 .ped{height:58px}.fl-podium .p3 .ped{height:44px}
}
`;
