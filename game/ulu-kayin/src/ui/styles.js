// Arayüz stilleri: ana oyunla aynı renkler ve yazı tipleri. Bilerek hafif:
// backdrop-filter / filter: blur yok (3B tuvalin üstünde her karede yeniden hesaplanır, kasar),
// animasyonlar yalnızca transform ve opacity.

export const CSS = /* css */ `
.uk-root{--ivory:#fff4e2;--ivory-dim:rgba(255,244,226,.66);--gold:#f2c46d;--gold2:#ffdf9e;--ink:#120e1f;--violet:#9d8cff;
  --glass:rgba(24,18,42,.62);--glass-b:rgba(255,240,220,.2);
  --sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px);--sal:env(safe-area-inset-left,0px);--sar:env(safe-area-inset-right,0px);
  --serif:'Cormorant Garamond',Georgia,'Times New Roman',serif;--sans:'Manrope',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  font-family:var(--sans);color:var(--ivory);-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.uk-root *{box-sizing:border-box;margin:0;padding:0}
.uk-canvas{position:absolute;inset:0;display:block;touch-action:none;outline:none}
.uk-ui{position:absolute;inset:0;pointer-events:none}
.uk-ui button{font-family:var(--sans);-webkit-appearance:none;appearance:none;border:0;background:none;color:inherit;cursor:pointer;touch-action:manipulation;pointer-events:auto}
.uk-scr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;opacity:0;visibility:hidden;transition:opacity .45s ease,visibility 0s linear .45s}
.uk-scr.on{opacity:1;visibility:visible;transition:opacity .45s ease,visibility 0s}
.uk-scr.on .uk-tap{pointer-events:auto}

.uk-btn{position:relative;height:56px;min-width:210px;padding:0 32px;border-radius:999px;font-weight:800;font-size:15px;letter-spacing:.14em;text-transform:uppercase;
  display:inline-flex;align-items:center;justify-content:center;gap:10px;transition:transform .18s cubic-bezier(.3,1.6,.5,1),opacity .3s}
.uk-btn:active{transform:scale(.94)}
.uk-btn.pri{color:#2a1a08;background:linear-gradient(180deg,#fff0c8 0%,#f6cf7c 46%,#e7a94e 100%);
  box-shadow:0 10px 30px rgba(255,176,80,.34),inset 0 1px 0 rgba(255,255,255,.85),inset 0 -2px 6px rgba(150,80,10,.25)}
.uk-btn.pri::after{content:"";position:absolute;inset:-3px;border-radius:inherit;border:1px solid rgba(255,226,160,.45);animation:ukHalo 2.6s ease-in-out infinite;pointer-events:none}
@keyframes ukHalo{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:.9;transform:scale(1.04)}}
.uk-btn.gh{height:46px;min-width:0;padding:0 22px;font-size:12px;color:var(--ivory);background:var(--glass);border:1px solid var(--glass-b)}
.uk-ico{width:46px;height:46px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--glass);border:1px solid var(--glass-b);transition:transform .18s cubic-bezier(.3,1.6,.5,1)}
.uk-ico:active{transform:scale(.9)}
.uk-ico svg{width:20px;height:20px;stroke:var(--ivory);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}

/* ---- başlık ---- */
.uk-title{justify-content:flex-start;padding:calc(var(--sat) + 18px) 20px calc(var(--sab) + 30px);background:linear-gradient(180deg,rgba(20,14,40,.45) 0%,rgba(20,14,40,0) 34%)}
.uk-title .top{width:100%;display:flex;justify-content:space-between}
.uk-brand{text-align:center;margin-top:1vh}
.uk-brand .k{font-size:11px;letter-spacing:.42em;text-transform:uppercase;color:var(--gold2);opacity:.9}
.uk-brand h1{font-family:var(--serif);font-style:italic;font-weight:600;font-size:clamp(54px,15vw,92px);line-height:.95;margin-top:10px;
  background:linear-gradient(180deg,#fffaf0 0%,#ffe2a6 60%,#f0b25e 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  text-shadow:0 6px 40px rgba(255,190,110,.25)}
.uk-brand .tag{margin-top:14px;font-family:var(--serif);font-style:italic;font-size:19px;color:var(--ivory-dim)}
.uk-title .acts{display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:auto}
.uk-title .row{display:flex;gap:10px}

/* ---- bölümler ---- */
.uk-levels{padding:calc(var(--sat) + 14px) 16px calc(var(--sab) + 16px);background:linear-gradient(180deg,rgba(14,10,30,.0) 0%,rgba(14,10,30,.55) 40%,rgba(14,10,30,.8) 100%)}
.uk-levels .hd{width:100%;max-width:520px;display:flex;align-items:center;gap:12px}
.uk-levels .hd h5{font-family:var(--serif);font-style:italic;font-weight:600;font-size:30px;flex:1;text-align:center}
.uk-levels .hd .sp{width:46px}
.uk-list{width:100%;max-width:520px;margin-top:auto;display:grid;grid-template-columns:1fr 1fr;gap:10px;pointer-events:auto;overflow:auto;max-height:72vh;padding-bottom:4px}
.uk-lv{position:relative;text-align:left;padding:14px 14px 12px;border-radius:18px;background:var(--glass);border:1px solid var(--glass-b);min-height:96px;display:flex;flex-direction:column;gap:4px;
  transition:transform .18s cubic-bezier(.3,1.6,.5,1)}
.uk-lv:active{transform:scale(.96)}
.uk-lv small{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--gold2)}
.uk-lv b{font-family:var(--serif);font-style:italic;font-weight:600;font-size:21px;line-height:1.05}
.uk-lv .st{margin-top:auto;display:flex;gap:4px}
.uk-lv .st i{width:12px;height:12px;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);background:rgba(255,236,204,.18)}
.uk-lv .st i.on{background:linear-gradient(180deg,#fff6d8,#ffd37a 55%,#f29a3c)}
.uk-lv.lock{opacity:.42}
.uk-lv.lock::after{content:"";position:absolute;right:14px;top:14px;width:12px;height:14px;border:2px solid var(--ivory-dim);border-radius:3px 3px 4px 4px;border-top-width:6px}
.uk-lv .sw{position:absolute;right:12px;bottom:12px;width:26px;height:26px;border-radius:50%;opacity:.95}
.uk-lv[data-s=spring] .sw{background:radial-gradient(circle at 35% 35%,#ffe6ee,#f7a9c4 60%,#c0608a)}
.uk-lv[data-s=summer] .sw{background:radial-gradient(circle at 35% 35%,#b8f08a,#5fa040 60%,#2f6a28)}
.uk-lv[data-s=autumn] .sw{background:radial-gradient(circle at 35% 35%,#ffe28a,#f0a030 60%,#b0501e)}
.uk-lv[data-s=winter] .sw{background:radial-gradient(circle at 35% 35%,#ffffff,#cfdcf6 60%,#8a9ad0)}

/* ---- oyun içi ---- */
.uk-hud{position:absolute;inset:0;opacity:0;transition:opacity .4s;pointer-events:none}
.uk-hud.on{opacity:1}
.uk-hud .top{position:absolute;left:0;right:0;top:0;padding:calc(var(--sat) + 12px) 14px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.uk-hud .lvl{text-align:center;flex:1;padding-top:2px;text-shadow:0 2px 12px rgba(20,10,40,.6)}
.uk-hud .lvl small{display:block;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold2)}
.uk-hud .lvl b{font-family:var(--serif);font-style:italic;font-weight:600;font-size:22px}
.uk-pill{height:38px;min-width:64px;padding:0 13px;border-radius:999px;background:var(--glass);border:1px solid var(--glass-b);display:inline-flex;align-items:center;gap:7px;font-weight:800;font-size:14px;transition:transform .25s cubic-bezier(.3,1.8,.5,1)}
.uk-pill i{width:11px;height:15px;border-radius:50% 50% 50% 50%/62% 62% 40% 40%;background:radial-gradient(circle at 40% 70%,#2c2152,#0e0a1c 70%);box-shadow:0 0 0 1.5px #b9adff,0 0 10px rgba(157,140,255,.7)}
.uk-pill.pop{transform:scale(1.18)}
.uk-pill.bad{animation:ukShake .4s}
@keyframes ukShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}

.uk-compass{position:absolute;left:calc(var(--sal) + 14px);bottom:calc(var(--sab) + 18px);width:118px;height:118px;border-radius:50%;
  background:radial-gradient(circle,rgba(24,18,42,.72) 0%,rgba(24,18,42,.6) 70%,rgba(24,18,42,0) 72%);pointer-events:none}
.uk-compass svg{width:100%;height:100%;overflow:visible}
.uk-compass .orb{fill:none;stroke:rgba(255,244,226,.22);stroke-width:1.5;stroke-dasharray:2 5}
.uk-compass .band{fill:rgba(18,12,40,.85)}
.uk-compass .win{fill:none;stroke:#ffdf9e;stroke-width:7;stroke-linecap:round;opacity:.9;animation:ukWin 1.2s ease-in-out infinite}
@keyframes ukWin{0%,100%{opacity:.45}50%{opacity:1}}
.uk-compass .trunk{fill:#efe9e0;stroke:rgba(0,0,0,.25);stroke-width:1}
.uk-compass .zif{fill:#120e1f;stroke:#b9adff;stroke-width:2}
.uk-compass .zif.hot{stroke:#ff9a3a}
.uk-compass .sun circle{fill:#ffe6a0;stroke:#fff6d8;stroke-width:2}
.uk-compass .sun .ray{stroke:#ffd27a;stroke-width:2;stroke-linecap:round}

.uk-wait{position:absolute;right:calc(var(--sar) + 16px);bottom:calc(var(--sab) + 22px);width:94px;height:94px;border-radius:50%;pointer-events:auto;touch-action:none;
  background:radial-gradient(circle at 50% 35%,rgba(60,46,110,.9),rgba(20,14,40,.9));border:1.5px solid rgba(185,173,255,.55);
  display:flex;align-items:center;justify-content:center;flex-direction:column;gap:2px;transition:transform .15s,border-color .2s;box-shadow:0 8px 26px rgba(10,6,30,.45)}
.uk-wait b{font-size:12px;letter-spacing:.2em;text-transform:uppercase;font-weight:800}
.uk-wait svg{width:22px;height:22px;stroke:var(--ivory);fill:none;stroke-width:2.4;stroke-linecap:round}
.uk-wait.dn{transform:scale(.92);border-color:#ffdf9e}


.uk-hint{position:absolute;left:50%;top:calc(var(--sat) + 74px);transform:translate(-50%,-8px);width:min(88vw,420px);padding:14px 18px;border-radius:18px;
  background:rgba(22,16,40,.78);border:1px solid var(--glass-b);font-size:14.5px;line-height:1.45;text-align:center;opacity:0;transition:opacity .35s,transform .35s;pointer-events:none}
.uk-hint.on{opacity:1;transform:translate(-50%,0)}
.uk-hint em{font-style:normal;color:var(--gold2);font-weight:800}
.uk-hand{position:absolute;left:50%;bottom:30%;width:46px;height:46px;margin-left:-23px;opacity:0;pointer-events:none;transition:opacity .3s}
.uk-hand.on{opacity:1;animation:ukSwipe 1.8s ease-in-out infinite}
.uk-hand i{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,#fff6dc 0%,#ffd98a 45%,rgba(255,200,110,0) 70%)}
@keyframes ukSwipe{0%{transform:translateX(-70px)}50%{transform:translateX(70px)}100%{transform:translateX(-70px)}}
.uk-gust{position:absolute;left:50%;top:calc(var(--sat) + 70px);transform:translateX(-50%);padding:8px 16px;border-radius:999px;background:rgba(22,16,40,.78);border:1px solid rgba(255,223,158,.4);
  font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:800;color:var(--gold2);opacity:0;transition:opacity .3s}
.uk-gust.on{opacity:1}
.uk-toast{position:absolute;left:50%;bottom:calc(var(--sab) + 150px);transform:translateX(-50%);padding:8px 14px;border-radius:999px;background:rgba(22,16,40,.82);font-size:12px;opacity:0;transition:opacity .3s}
.uk-toast.on{opacity:1}

/* ---- bitiş ekranları ---- */
.uk-end{justify-content:center;gap:18px;padding:24px;background:radial-gradient(ellipse at center,rgba(14,10,30,.35) 0%,rgba(14,10,30,.78) 75%)}
.uk-end .k{font-size:11px;letter-spacing:.38em;text-transform:uppercase;color:var(--gold2)}
.uk-end h2{font-family:var(--serif);font-style:italic;font-weight:600;font-size:48px;line-height:1;text-align:center}
.uk-end .sub{font-family:var(--serif);font-style:italic;font-size:18px;color:var(--ivory-dim);text-align:center;max-width:340px}
.uk-stars{display:flex;gap:14px;margin:6px 0}
.uk-star{display:flex;flex-direction:column;align-items:center;gap:6px;width:86px;text-align:center;font-size:10.5px;letter-spacing:.06em;color:var(--ivory-dim)}
.uk-star i{width:46px;height:46px;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);background:rgba(255,236,204,.16);transform:scale(.6);transition:transform .5s cubic-bezier(.3,1.8,.5,1)}
.uk-star.on i{background:linear-gradient(180deg,#fff6d8,#ffd37a 55%,#f29a3c);transform:scale(1)}
.uk-star.on{color:var(--ivory)}
.uk-dust{font-size:15px;font-weight:800;color:var(--gold2)}
.uk-end .acts{display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:6px}
.uk-end .row{display:flex;gap:10px}
.uk-prog{width:220px;height:6px;border-radius:6px;background:rgba(255,236,204,.14);overflow:hidden}
.uk-prog i{display:block;height:100%;background:linear-gradient(90deg,#9d8cff,#ffd37a);border-radius:6px}
.uk-mercy{font-size:13px;color:var(--ivory-dim);text-align:center;max-width:300px}
.uk-mercy b{color:var(--gold2)}

.uk-pause{justify-content:center;background:rgba(14,10,30,.6)}
.uk-card{width:min(86vw,340px);padding:22px 20px;border-radius:24px;background:rgba(26,20,46,.94);border:1px solid var(--glass-b);display:flex;flex-direction:column;gap:10px;align-items:stretch}
.uk-card h4{font-family:var(--serif);font-style:italic;font-weight:600;font-size:30px;text-align:center;margin-bottom:6px}
.uk-card .uk-btn{min-width:0;width:100%}
.uk-tog{display:flex;justify-content:space-between;align-items:center;height:44px;padding:0 16px;border-radius:14px;background:rgba(255,244,226,.06);font-size:14px;font-weight:600}
.uk-tog b{color:var(--gold2);font-weight:800}

.uk-card-title{position:absolute;left:0;right:0;top:34%;text-align:center;opacity:0;transition:opacity .6s,transform .8s;transform:translateY(10px);pointer-events:none;text-shadow:0 4px 30px rgba(10,6,30,.6)}
.uk-card-title.on{opacity:1;transform:none}
.uk-card-title small{display:block;font-size:12px;letter-spacing:.42em;text-transform:uppercase;color:var(--gold2)}
.uk-card-title b{display:block;font-family:var(--serif);font-style:italic;font-weight:600;font-size:clamp(40px,11vw,64px);margin-top:6px}
.uk-card-title span{display:block;margin-top:8px;font-family:var(--serif);font-style:italic;font-size:18px;color:var(--ivory-dim)}

.uk-lore{position:absolute;left:0;right:0;bottom:calc(var(--sab) + 70px);padding:0 28px;text-align:center;font-family:var(--serif);font-style:italic;font-size:22px;line-height:1.35;opacity:0;transition:opacity .9s;pointer-events:none;text-shadow:0 3px 18px rgba(10,6,30,.75)}
.uk-lore.on{opacity:1}
.uk-skip{position:absolute;right:calc(var(--sar) + 16px);top:calc(var(--sat) + 16px);font-size:12px;letter-spacing:.2em;text-transform:uppercase;font-weight:800;color:var(--ivory-dim);padding:10px 12px;opacity:0;transition:opacity .4s}
.uk-skip.on{opacity:1;pointer-events:auto}
.uk-fade{position:absolute;inset:0;background:#0d0a1e;opacity:0;transition:opacity .5s;pointer-events:none}
.uk-fade.on{opacity:1}
@media (orientation:landscape) and (max-height:520px){
  .uk-brand{margin-top:2vh}.uk-brand h1{font-size:56px}.uk-list{grid-template-columns:repeat(4,1fr);max-height:60vh}
  .uk-compass{width:96px;height:96px}.uk-wait{width:80px;height:80px}
}
`;
