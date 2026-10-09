// Arayüz stilleri: ana oyunla aynı renkler ve yazı tipleri (fildişi/altın, mürekkep mor üstünde).
// Okunurluk kuralı: hiçbir yazı 3B sahnenin üstünde çıplak durmaz; ya koyu bir panelde ya da koyu bir perdede.
// Bilerek hafif: backdrop-filter / filter yok (3B tuvalin üstünde her karede yeniden hesaplanır, kasar),
// animasyonlar yalnızca transform ve opacity.

export const CSS = /* css */ `
.uk-root{--ivory:#fff6e8;--ivory2:rgba(255,246,232,.82);--ivory3:rgba(255,246,232,.6);
  --gold:#f5c66e;--gold2:#ffe0a0;--gold3:#e9a14a;--violet:#b3a6ff;--violet2:#7d6bea;--ember:#ff8a4c;--ember2:#ffc29a;
  --ink:#120d22;--ink2:#1c1533;--line:rgba(255,224,160,.24);--line2:rgba(255,224,160,.5);
  --panel:linear-gradient(180deg,rgba(38,29,68,.95) 0%,rgba(19,13,36,.95) 100%);
  --pshadow:0 10px 28px rgba(6,3,16,.5),inset 0 1px 0 rgba(255,240,210,.1);
  --tsh:0 1px 2px rgba(6,3,16,.95),0 2px 14px rgba(6,3,16,.75);
  --sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px);--sal:env(safe-area-inset-left,0px);--sar:env(safe-area-inset-right,0px);
  --serif:'Cormorant Garamond',Georgia,'Times New Roman',serif;--sans:'Manrope',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  font-family:var(--sans);color:var(--ivory);-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.uk-root *{box-sizing:border-box;margin:0;padding:0}
.uk-canvas{position:absolute;inset:0;display:block;touch-action:none;outline:none}
.uk-ui{position:absolute;inset:0;pointer-events:none;-webkit-font-smoothing:antialiased}
/* :where → özgüllük düşük kalır; .uk-ico, .uk-lv gibi sınıfların arka planı ezilmez */
:where(.uk-ui) button{font-family:var(--sans);-webkit-appearance:none;appearance:none;border:0;background:none;color:inherit;cursor:pointer;touch-action:manipulation;pointer-events:auto;text-align:inherit}
.uk-ui svg{display:block;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.uk-ui svg .f,.uk-ui svg.f{fill:currentColor;stroke:none}
.uk-scr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;opacity:0;visibility:hidden;transition:opacity .45s ease,visibility 0s linear .45s}
.uk-scr.on{opacity:1;visibility:visible;transition:opacity .45s ease,visibility 0s}
.uk-scr.on .uk-tap{pointer-events:auto}

/* ---- düğmeler ---- */
.uk-btn{position:relative;height:60px;min-width:240px;padding:0 32px;border-radius:999px;font-weight:800;font-size:16px;letter-spacing:.13em;text-transform:uppercase;white-space:nowrap;
  display:inline-flex;align-items:center;justify-content:center;gap:10px;transition:transform .18s cubic-bezier(.3,1.6,.5,1),opacity .3s}
.uk-btn b{font-weight:800}
.uk-btn svg{width:20px;height:20px;flex:none;stroke-width:2.4}
.uk-btn:active{transform:scale(.94)}
.uk-btn.pri{color:#2e1906;background:linear-gradient(180deg,#fff4d6 0%,#ffd98a 48%,#eba24b 100%);
  box-shadow:0 12px 30px rgba(255,165,60,.32),0 3px 0 #b86e22,inset 0 1px 0 #fff,inset 0 -3px 8px rgba(160,80,10,.28)}
.uk-btn.pri::after{content:"";position:absolute;inset:-5px;border-radius:inherit;border:1.5px solid rgba(255,224,160,.6);animation:ukHalo 2.6s ease-in-out infinite;pointer-events:none}
@keyframes ukHalo{0%,100%{opacity:.15;transform:scale(1)}50%{opacity:.85;transform:scale(1.035)}}
.uk-btn.gh{height:52px;min-width:0;padding:0 22px;font-size:14px;letter-spacing:.11em;color:var(--ivory);background:var(--panel);border:1px solid var(--line2);box-shadow:var(--pshadow)}
.uk-btn.gh svg{width:18px;height:18px;color:var(--gold2)}
.uk-ico{width:48px;height:48px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:var(--ivory);background:var(--panel);border:1px solid var(--line2);box-shadow:var(--pshadow);
  transition:transform .18s cubic-bezier(.3,1.6,.5,1)}
.uk-ico:active{transform:scale(.9)}
.uk-ico svg{width:22px;height:22px;stroke-width:2.4}

/* ---- başlık ---- */
.uk-title{justify-content:flex-start;padding:calc(var(--sat) + 14px) 20px calc(var(--sab) + 30px)}
.uk-title .sky{position:absolute;left:0;right:0;top:0;height:calc(var(--sat) + 440px);pointer-events:none;
  background:radial-gradient(1px 1px at 12% 18%,#fff 60%,transparent),radial-gradient(1.2px 1.2px at 84% 12%,#fff 60%,transparent),radial-gradient(1px 1px at 70% 30%,#fff 60%,transparent),
  radial-gradient(1px 1px at 26% 36%,#fff 60%,transparent),radial-gradient(1.4px 1.4px at 92% 40%,#ffe9c0 60%,transparent),radial-gradient(1px 1px at 6% 44%,#fff 60%,transparent),
  linear-gradient(180deg,rgba(11,7,25,.95) 0%,rgba(11,7,25,.9) 50%,rgba(11,7,25,.66) 70%,rgba(11,7,25,.24) 86%,rgba(11,7,25,0) 100%)}
.uk-title .sky i{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff6e0;box-shadow:0 0 6px 1px rgba(255,236,190,.8);animation:ukTw 3.2s ease-in-out infinite}
.uk-title .sky i:nth-child(1){left:18%;top:9%}.uk-title .sky i:nth-child(2){left:78%;top:22%;animation-delay:-1.1s}.uk-title .sky i:nth-child(3){left:9%;top:30%;animation-delay:-2.3s}
.uk-title .sky i:nth-child(4){left:90%;top:6%;animation-delay:-.6s}.uk-title .sky i:nth-child(5){left:60%;top:5%;animation-delay:-1.8s}.uk-title .sky i:nth-child(6){left:36%;top:46%;animation-delay:-2.8s;opacity:.6}
.uk-title .sky i:nth-child(7){left:66%;top:44%;animation-delay:-1.4s}
@keyframes ukTw{0%,100%{opacity:.25}50%{opacity:1}}
.uk-title .foot{position:absolute;left:0;right:0;bottom:0;height:34%;pointer-events:none;background:linear-gradient(0deg,rgba(11,7,25,.92) 0%,rgba(11,7,25,.66) 40%,rgba(11,7,25,0) 100%)}
.uk-title .top{position:relative;width:100%;display:flex}
.uk-brand{position:relative;text-align:center;margin-top:clamp(0px,2vh,24px);display:flex;flex-direction:column;align-items:center}
.emb{width:70px;height:70px;overflow:visible}
.emb .er path{stroke:var(--gold);stroke-width:2.6}
.emb .es circle{fill:#d9d0ff;stroke:none}
.emb .en{fill:#1a1236;stroke:none}
.emb .ed{fill:#f5c66e}
.emb .et{stroke:#fff6e8;stroke-width:2.4}
.emb .eo{fill:none;stroke:var(--gold2);stroke-width:1.6}
.uk-brand .k{display:flex;align-items:center;gap:10px;margin-top:14px;font-size:12px;font-weight:800;letter-spacing:.28em;white-space:nowrap;text-transform:uppercase;color:var(--gold2);text-shadow:var(--tsh)}
.uk-brand .k i{width:clamp(12px,6vw,30px);height:1.5px;background:linear-gradient(90deg,rgba(255,224,160,0),var(--gold))}
.uk-brand .k i:last-child{transform:scaleX(-1)}
.uk-brand h1{position:relative;font-family:var(--serif);font-style:italic;font-weight:700;font-size:clamp(64px,20vw,112px);line-height:1.02;margin-top:2px;padding:0 .1em;letter-spacing:-.005em;white-space:nowrap}
.uk-brand h1::before{content:attr(data-t);position:absolute;left:0;right:0;top:0;padding:inherit;color:transparent;text-shadow:0 3px 0 rgba(70,34,6,.75),0 8px 30px rgba(6,3,16,.85),0 0 60px rgba(255,180,90,.35)}
.uk-brand h1 span{position:relative;display:block;background:linear-gradient(180deg,#fffbf2 10%,#ffe6b0 45%,#f5b964 75%,#dd8c3a 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.uk-brand .tag{margin-top:4px;font-family:var(--serif);font-style:italic;font-weight:600;font-size:clamp(20px,5.8vw,25px);color:var(--ivory);text-shadow:var(--tsh)}
.uk-title .acts{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;margin-top:auto}
.uk-title .row{display:flex;gap:12px}
.uk-title .row .uk-btn{min-width:140px}

/* ---- bölümler (mevsim yolu) ---- */
.uk-levels{padding:calc(var(--sat) + 12px) 16px 0;background:linear-gradient(180deg,rgba(11,7,25,.94) 0%,rgba(11,7,25,.8) 26%,rgba(11,7,25,.74) 60%,rgba(11,7,25,.92) 100%)}
.uk-levels .hd{width:100%;max-width:560px;display:flex;align-items:center;gap:12px;flex:none}
.uk-levels .ttl{flex:1;text-align:center}
.uk-levels .ttl small{display:block;font-size:11px;font-weight:800;letter-spacing:.3em;text-transform:uppercase;color:var(--gold2)}
.uk-levels .ttl h5{font-family:var(--serif);font-style:italic;font-weight:700;font-size:34px;line-height:1.05}
.uk-dpill{height:40px;min-width:48px;padding:0 13px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;background:var(--panel);border:1px solid var(--line2);box-shadow:var(--pshadow);font-weight:800;font-size:15px;color:var(--gold2);font-variant-numeric:tabular-nums}
.uk-dpill i{font-style:normal;font-size:14px}
.uk-list{flex:1;min-height:0;width:100%;max-width:560px;overflow-y:auto;overflow-x:hidden;padding:10px 0 calc(var(--sab) + 22px);pointer-events:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;scrollbar-width:none}
.uk-list::-webkit-scrollbar{display:none}
.uk-ssn{position:relative;padding-bottom:8px}
.uk-ssn[data-s=spring]{--sc:#ffb3cf;--sc2:#ff86b0}.uk-ssn[data-s=summer]{--sc:#a8e57c;--sc2:#6cc048}
.uk-ssn[data-s=autumn]{--sc:#ffc361;--sc2:#f0902c}.uk-ssn[data-s=winter]{--sc:#cfe0ff;--sc2:#93b2ee}
.uk-ssn::before{content:"";position:absolute;left:22px;top:44px;bottom:0;width:2px;margin-left:-1px;background:linear-gradient(180deg,var(--sc),rgba(255,246,232,.14))}
.uk-ssn:last-child::before{bottom:40px}
.uk-ssn header{position:relative;display:flex;align-items:center;gap:12px;height:48px}
.uk-ssn .ic{flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,#2e2350,#150f2b);border:2px solid var(--sc);box-shadow:0 0 16px rgba(0,0,0,.4)}
.uk-ssn .ic svg{width:24px;height:24px;color:var(--sc)}
.uk-ssn .ic svg .c{fill:#fff6e8;stroke:#fff6e8}
.uk-ssn .ic svg path.c{fill:none;stroke:#1a1236;stroke-width:1.6}
.uk-ssn .nm{flex:1;display:flex;align-items:baseline;gap:10px;min-width:0}
.uk-ssn .nm b{font-size:14px;font-weight:800;letter-spacing:.26em;text-transform:uppercase;color:var(--sc);text-shadow:var(--tsh)}
.uk-ssn .nm span{font-family:var(--serif);font-style:italic;font-weight:600;font-size:18px;color:var(--ivory2);text-shadow:var(--tsh);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uk-ssn header em{display:inline-flex;align-items:center;gap:4px;font-style:normal;font-size:14px;font-weight:800;color:var(--gold2);font-variant-numeric:tabular-nums;text-shadow:var(--tsh)}
.uk-ssn header em svg{width:15px;height:15px}
.uk-ssn.lock .ic{border-color:rgba(255,246,232,.25)}.uk-ssn.lock .ic svg{color:rgba(255,246,232,.35)}.uk-ssn.lock .nm b{color:var(--ivory3)}
.uk-lv{position:relative;display:flex;align-items:center;gap:10px;width:100%;margin-top:8px;transition:transform .18s cubic-bezier(.3,1.6,.5,1)}
.uk-lv:active{transform:scale(.97)}
.uk-lv .no{position:relative;z-index:1;flex:none;width:32px;height:32px;margin:0 6px;border-radius:50%;display:grid;place-items:center;background:#1a1236;border:2px solid var(--sc);color:var(--sc)}
.uk-lv .no b{font-size:14px;font-weight:800}
.uk-lv .no svg{width:16px;height:16px;stroke-width:3}
.uk-lv.done .no{background:var(--sc);color:#1a1236}
.uk-lv.cur .no{background:linear-gradient(180deg,#fff2cc,#f5b65c);border-color:#fff2cc;color:#3a2008}
.uk-lv.cur .no svg{width:14px;height:14px;margin-left:2px}
.uk-lv.cur .no::after{content:"";position:absolute;inset:-7px;border-radius:50%;border:2px solid var(--gold2);animation:ukRing 1.6s ease-out infinite}
.uk-lv.lock .no{border-color:rgba(255,246,232,.25);color:var(--ivory3);background:#150f2b}
.uk-lv .cd{flex:1;min-width:0;display:flex;align-items:center;gap:10px;min-height:68px;padding:10px 16px;border-radius:18px;background:var(--panel);border:1px solid var(--line);box-shadow:var(--pshadow);border-left:3px solid var(--sc)}
.uk-lv .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.uk-lv small{font-size:11px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--gold2)}
.uk-lv .tx b{font-family:var(--serif);font-style:italic;font-weight:700;font-size:25px;line-height:1.08;color:var(--ivory);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uk-lv .st{display:flex;gap:2px;flex:none}
.uk-lv .st i{width:19px;height:19px;color:rgba(255,246,232,.2)}
.uk-lv .st i svg{width:100%;height:100%}
.uk-lv .st i.on{color:#ffd26e}
.uk-lv .go{flex:none;padding:7px 14px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#3a2008;background:linear-gradient(180deg,#fff2cc,#f5b65c)}
.uk-lv.cur .cd{border-color:rgba(255,224,160,.8);border-left-color:var(--sc);box-shadow:0 0 0 1px rgba(255,224,160,.35),0 0 26px rgba(255,190,100,.28),var(--pshadow)}
.uk-lv.lock .cd{background:rgba(17,12,32,.88);border-color:rgba(255,246,232,.1);border-left-color:rgba(255,246,232,.2);box-shadow:none}
.uk-lv.lock .tx b{color:var(--ivory3)}.uk-lv.lock small{color:rgba(255,224,160,.55)}

/* ---- oyun içi ---- */
.uk-hud{--cw:clamp(118px,33vw,140px);position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity .4s,visibility 0s linear .4s;pointer-events:none}
.uk-hud.on{opacity:1;visibility:visible;transition:opacity .4s,visibility 0s}
.uk-hud .top{position:absolute;left:0;right:0;top:0;padding:calc(var(--sat) + 12px) calc(var(--sar) + 14px) 0 calc(var(--sal) + 14px);display:flex;align-items:flex-start;justify-content:space-between;pointer-events:none}
.uk-hud .lvl{position:absolute;left:50%;top:calc(var(--sat) + 10px);transform:translateX(-50%);min-width:150px;max-width:calc(100% - 196px);padding:6px 18px 9px;border-radius:18px;text-align:center;
  background:var(--panel);border:1px solid var(--line);box-shadow:var(--pshadow)}
.uk-hud .lvl small{display:block;font-size:11px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:var(--gold2);white-space:nowrap}
.uk-hud .lvl b{display:block;font-family:var(--serif);font-style:italic;font-weight:700;font-size:22px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uk-hud .pg{position:relative;height:4px;margin-top:5px;border-radius:4px;background:rgba(255,246,232,.14);display:none}
.uk-hud.pg .pg{display:block}
.uk-hud .pf{position:absolute;inset:0;border-radius:inherit;background:linear-gradient(90deg,var(--violet2),var(--gold2));transform-origin:0 50%;transform:scaleX(0)}
.uk-hud .ph{position:absolute;inset:0}
.uk-hud .ph i{position:absolute;left:-6px;top:-4px;width:12px;height:12px;border-radius:50%;background:#140e26;border:2px solid var(--violet);box-shadow:0 0 8px rgba(179,166,255,.9)}
.uk-pill{height:48px;padding:0 16px 0 13px;border-radius:999px;display:inline-flex;align-items:center;gap:9px;font-weight:800;font-size:19px;font-variant-numeric:tabular-nums;
  background:var(--panel);border:1px solid var(--line2);box-shadow:var(--pshadow)}
.uk-pill i{width:14px;height:19px;border-radius:50% 50% 50% 50%/62% 62% 40% 40%;background:radial-gradient(circle at 40% 70%,#3a2c6c,#0e0a1c 70%);box-shadow:0 0 0 2px #c4b9ff,0 0 12px rgba(179,166,255,.85);transform:rotate(180deg)}
.uk-pill.full{border-color:#c4b9ff;color:#e6e0ff}
.uk-pill.pop0{animation:ukBumpA .35s cubic-bezier(.3,1.8,.5,1)}.uk-pill.pop1{animation:ukBumpB .35s cubic-bezier(.3,1.8,.5,1)}
@keyframes ukBumpA{0%{transform:scale(1.25)}100%{transform:scale(1)}}@keyframes ukBumpB{0%{transform:scale(1.25)}100%{transform:scale(1)}}
.uk-pill.bad0{animation:ukShakeA .4s;border-color:var(--ember)}.uk-pill.bad1{animation:ukShakeB .4s;border-color:var(--ember)}
@keyframes ukShakeA{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
@keyframes ukShakeB{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}

/* gölge serisi */
.uk-streak{position:absolute;right:calc(var(--sar) + 14px);top:calc(var(--sat) + 70px);min-width:86px;padding:5px 12px 7px;border-radius:16px;display:flex;flex-direction:column;align-items:center;
  background:var(--panel);border:1.5px solid rgba(179,166,255,.7);box-shadow:0 0 18px rgba(125,107,234,.35),var(--pshadow);opacity:0;transform:scale(.6);transform-origin:100% 0;transition:opacity .25s,transform .35s cubic-bezier(.3,1.7,.5,1)}
.uk-streak.on{opacity:1;transform:none}
.uk-streak b{display:block;font-size:26px;font-weight:800;line-height:1.05;color:#efeaff;text-shadow:0 0 14px rgba(179,166,255,.9);font-variant-numeric:tabular-nums}
.uk-streak small{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--violet);white-space:nowrap}
.uk-streak.hot{border-color:var(--gold2);box-shadow:0 0 22px rgba(255,200,110,.45),var(--pshadow)}
.uk-streak.hot b{color:var(--gold2);text-shadow:0 0 14px rgba(255,190,90,.9)}.uk-streak.hot small{color:var(--gold2)}
.uk-streak.p0 b{animation:ukPopA .5s cubic-bezier(.3,1.9,.5,1)}.uk-streak.p1 b{animation:ukPopB .5s cubic-bezier(.3,1.9,.5,1)}
@keyframes ukPopA{0%{transform:scale(1.8)}100%{transform:scale(1)}}@keyframes ukPopB{0%{transform:scale(1.8)}100%{transform:scale(1)}}

/* uçan geri bildirim */
.uk-pop{position:absolute;left:50%;top:calc(var(--sat) + 136px);padding:7px 18px;border-radius:999px;font-size:18px;font-weight:800;letter-spacing:.02em;white-space:nowrap;
  background:var(--panel);border:1.5px solid rgba(179,166,255,.7);color:#e9e4ff;box-shadow:var(--pshadow);opacity:0;transform:translate(-50%,0);pointer-events:none}
.uk-pop.gold{border-color:var(--gold2);color:var(--gold2);box-shadow:0 0 20px rgba(255,200,110,.4),var(--pshadow)}
.uk-pop.bad{border-color:var(--ember);color:var(--ember2);background:linear-gradient(180deg,rgba(70,26,14,.95),rgba(36,12,8,.95))}
.uk-pop.a{animation:ukFloatA 1.3s ease-out forwards}.uk-pop.b{animation:ukFloatB 1.3s ease-out forwards}
@keyframes ukFloatA{0%{opacity:0;transform:translate(-50%,14px) scale(.6)}14%{opacity:1;transform:translate(-50%,0) scale(1.1)}24%{transform:translate(-50%,0) scale(1)}72%{opacity:1;transform:translate(-50%,-14px) scale(1)}100%{opacity:0;transform:translate(-50%,-38px) scale(.96)}}
@keyframes ukFloatB{0%{opacity:0;transform:translate(-50%,14px) scale(.6)}14%{opacity:1;transform:translate(-50%,0) scale(1.1)}24%{transform:translate(-50%,0) scale(1)}72%{opacity:1;transform:translate(-50%,-14px) scale(1)}100%{opacity:0;transform:translate(-50%,-38px) scale(.96)}}

/* güneş pusulası: ortada ağaç, altta Zifir, kenarda güneş, gövdenin gölgesi koyu şerit */
.uk-compass{position:absolute;left:calc(var(--sal) + 12px);bottom:calc(var(--sab) + 14px);width:var(--cw);height:var(--cw);pointer-events:none}
.uk-compass svg{width:100%;height:100%;overflow:visible}
.uk-compass .base{fill:#160f2c;stroke:rgba(255,224,160,.55);stroke-width:1.5}
.uk-compass .trk{fill:none;stroke:rgba(255,224,160,.28);stroke-width:1.5;stroke-dasharray:1.5 4.5}
.uk-compass .gnd{fill:url(#uk-cg);opacity:.92}
.uk-compass .band{fill:url(#uk-cs);opacity:.94}
.uk-compass .trunk{fill:#f6efe2;stroke:#2a1f48;stroke-width:2}
.uk-compass .bark{stroke:#3a2f4e;stroke-width:1.8}
.uk-compass .zif{fill:#140e26;stroke:#c4b9ff;stroke-width:2.4}
.uk-compass .eye{fill:#fff6e8}
.uk-compass .halo{fill:#b3a6ff;opacity:.28}
.uk-compass.hot .zif{stroke:#ff8a4c}
.uk-compass.hot .halo{fill:#ff8a4c;animation:ukHot .5s ease-in-out infinite alternate}
@keyframes ukHot{0%{opacity:.25}100%{opacity:.85}}
.uk-compass .sun .glow{fill:#ffd36e;opacity:.3}
.uk-compass .sun .disc{fill:#ffd66e;stroke:#fff4cc;stroke-width:2}
.uk-compass .sun .ray{stroke:#ffcf6a;stroke-width:2.6}
.uk-compass .win{fill:none;stroke:#ffe0a0;stroke-width:8;stroke-linecap:round;animation:ukWin 1.1s ease-in-out infinite}
@keyframes ukWin{0%,100%{opacity:.45}50%{opacity:1}}
.uk-compass .cs{position:absolute;left:50%;top:-38px;transform:translateX(-50%);padding:4px 12px 5px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;
  background:#1d1540;border:1.5px solid #b3a6ff;color:#e6e0ff;box-shadow:0 4px 12px rgba(6,3,16,.5)}
.uk-compass.hot .cs{background:#47190b;border-color:var(--ember);color:#ffd9bf}

/* Bekle ve yetenek */
.uk-wait{position:absolute;right:calc(var(--sar) + 14px);bottom:calc(var(--sab) + 18px);width:94px;height:94px;border-radius:50%;pointer-events:auto;touch-action:none;color:var(--ivory);
  background:radial-gradient(circle at 50% 30%,#3e2f78,#171030 72%);border:2px solid rgba(179,166,255,.75);
  display:flex;align-items:center;justify-content:center;flex-direction:column;gap:3px;transition:transform .15s,border-color .2s;box-shadow:0 10px 26px rgba(6,3,16,.55),inset 0 1px 0 rgba(255,255,255,.14)}
.uk-wait b{font-size:13px;letter-spacing:.16em;text-transform:uppercase;font-weight:800}
.uk-wait svg{width:28px;height:28px;stroke-width:2.2}
.uk-wait.dn{transform:scale(.92);border-color:var(--gold2);background:radial-gradient(circle at 50% 30%,#5e4a9e,#251a4a 72%)}
.uk-wait::after{content:"";position:absolute;inset:-9px;border-radius:50%;border:2.5px solid var(--gold2);opacity:0;pointer-events:none}
.uk-hud.gst .uk-wait{border-color:var(--gold2)}
.uk-hud.gst .uk-wait::after{animation:ukRing 1s ease-out infinite}
@keyframes ukRing{0%{opacity:.95;transform:scale(.88)}100%{opacity:0;transform:scale(1.28)}}
.uk-ab{position:absolute;right:calc(var(--sar) + 122px);bottom:calc(var(--sab) + 31px);width:68px;height:68px;border-radius:50%;color:var(--ivory);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;background:var(--panel);border:2px solid var(--line2);box-shadow:var(--pshadow);
  opacity:0;visibility:hidden;transform:scale(.6);transition:opacity .3s,transform .35s cubic-bezier(.3,1.7,.5,1),visibility 0s linear .3s}
.uk-ab.on{opacity:1;visibility:visible;transform:none;transition:opacity .3s,transform .35s cubic-bezier(.3,1.7,.5,1)}
.uk-ab:active{transform:scale(.9)}
.uk-ab .ai svg{width:28px;height:28px}
.uk-ab .al{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;line-height:1}
.uk-ab .pp{position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);display:flex;gap:4px;padding:3px 6px;border-radius:999px;background:#140e26;border:1px solid var(--line)}
.uk-ab .pp i{width:7px;height:7px;border-radius:50%;background:rgba(255,246,232,.2)}
.uk-ab .pp i.on{background:var(--gold2);box-shadow:0 0 5px rgba(255,210,120,.9)}
.uk-ab::after{content:"";position:absolute;inset:-8px;border-radius:50%;border:2px solid var(--gold2);opacity:0;pointer-events:none}
.uk-ab.ready{border-color:var(--gold2);color:var(--gold2);box-shadow:0 0 22px rgba(255,200,110,.45),var(--pshadow)}
.uk-ab.ready::after{animation:ukRing 1.3s ease-out infinite}
.uk-ab.active{background:radial-gradient(circle at 50% 35%,#6a55c0,#251a4a);border-color:#d6ceff;color:#fff}

/* ipucu kartı: kontrollerin hemen üstünde, simgeli tek cümle */
.uk-hint{position:absolute;left:50%;bottom:calc(var(--sab) + var(--cw) + 56px);width:min(calc(100% - 24px),440px);display:flex;align-items:center;gap:14px;padding:13px 18px 13px 13px;border-radius:20px;
  background:var(--panel);border:1px solid var(--line2);box-shadow:0 14px 34px rgba(6,3,16,.55),inset 0 1px 0 rgba(255,240,210,.1);
  opacity:0;transform:translate(-50%,12px);transition:opacity .35s,transform .45s cubic-bezier(.2,1.4,.4,1);pointer-events:none}
.uk-hint.on{opacity:1;transform:translate(-50%,0)}
.uk-hint .hi{flex:none;width:50px;height:50px;border-radius:15px;display:grid;place-items:center;color:#3a2008;background:linear-gradient(180deg,#fff2cc,#f2b25a);box-shadow:inset 0 1px 0 #fff,0 4px 12px rgba(240,160,70,.3)}
.uk-hint .hi svg{width:28px;height:28px;stroke-width:2.1}
.uk-hint p{text-wrap:balance;font-size:16px;line-height:1.38;font-weight:500;color:var(--ivory)}
.uk-hint em{font-style:normal;color:var(--gold2);font-weight:800}
.uk-hand{position:absolute;left:50%;bottom:calc(var(--sab) + var(--cw) + 176px);width:200px;height:56px;margin-left:-100px;opacity:0;transition:opacity .3s;pointer-events:none}
.uk-hand.on{opacity:1}
.uk-hand .tr{position:absolute;left:10px;right:10px;top:50%;height:3px;margin-top:-1.5px;border-radius:3px;background:linear-gradient(90deg,rgba(255,224,160,0),rgba(255,224,160,.9) 30%,rgba(255,224,160,.9) 70%,rgba(255,224,160,0))}
.uk-hand .tr::before,.uk-hand .tr::after{content:"";position:absolute;top:50%;width:11px;height:11px;margin-top:-6px;border:solid var(--gold2);border-width:0 0 3px 3px;transform:rotate(45deg)}
.uk-hand .tr::before{left:4px}.uk-hand .tr::after{right:4px;transform:rotate(-135deg)}
.uk-hand .fg{position:absolute;left:50%;top:6px;width:52px;height:52px;margin-left:-26px;border-radius:50%;display:grid;place-items:center;color:#2e1906;background:radial-gradient(circle at 50% 35%,#fff6dc,#f6c66e);
  box-shadow:0 0 0 4px rgba(255,224,160,.3),0 8px 20px rgba(6,3,16,.5)}
.uk-hand .fg svg{width:30px;height:30px;stroke-width:1.9}
.uk-hand.on .fg{animation:ukSwipe 1.8s ease-in-out infinite}
@keyframes ukSwipe{0%,100%{transform:translateX(-64px)}50%{transform:translateX(64px)}}

.uk-gust{position:absolute;right:calc(var(--sar) + 14px);bottom:calc(var(--sab) + 126px);display:flex;align-items:center;gap:8px;padding:8px 15px 8px 12px;border-radius:999px;
  background:linear-gradient(180deg,rgba(78,34,14,.96),rgba(42,16,8,.96));border:1.5px solid var(--ember);color:#ffdcc4;font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;
  box-shadow:0 0 20px rgba(255,120,60,.35),var(--pshadow);opacity:0;transform:translateY(8px);transition:opacity .3s,transform .35s cubic-bezier(.3,1.6,.5,1)}
.uk-gust svg{width:20px;height:20px;color:var(--ember2)}
.uk-gust.on{opacity:1;transform:none}
.uk-gust.on svg{animation:ukGustI .6s ease-in-out infinite alternate}
@keyframes ukGustI{0%{transform:translateX(-2px)}100%{transform:translateX(3px)}}

.uk-toast{text-wrap:balance;position:absolute;left:50%;top:calc(var(--sat) + 82px);max-width:calc(100% - 32px);padding:11px 18px;border-radius:16px;font-size:15px;font-weight:700;line-height:1.35;text-align:center;
  background:var(--panel);border:1px solid var(--line2);box-shadow:var(--pshadow);opacity:0;transform:translate(-50%,-8px);transition:opacity .3s,transform .3s}
.uk-toast.on{opacity:1;transform:translate(-50%,0)}

/* ---- bölüm adı kartı (sinematik şerit) ---- */
.uk-card-title{position:absolute;left:0;right:0;top:27%;padding:22px 16px 24px;text-align:center;opacity:0;transition:opacity .5s;pointer-events:none}
.uk-card-title .bd{position:absolute;inset:0;background:linear-gradient(90deg,rgba(11,7,25,0) 0%,rgba(11,7,25,.86) 20%,rgba(11,7,25,.86) 80%,rgba(11,7,25,0) 100%);transform:scaleX(.5);transition:transform .8s cubic-bezier(.2,.9,.3,1)}
.uk-card-title .bd::before,.uk-card-title .bd::after{content:"";position:absolute;left:10%;right:10%;height:1.5px;background:linear-gradient(90deg,rgba(255,224,160,0),var(--gold),rgba(255,224,160,0))}
.uk-card-title .bd::before{top:0}.uk-card-title .bd::after{bottom:0}
.uk-card-title.on{opacity:1}.uk-card-title.on .bd{transform:none}
.uk-card-title small{position:relative;display:block;font-size:13px;font-weight:800;letter-spacing:.36em;text-transform:uppercase;color:var(--gold2)}
.uk-card-title b{position:relative;display:block;margin-top:2px;font-family:var(--serif);font-style:italic;font-weight:700;font-size:clamp(46px,13.5vw,74px);line-height:1.06;color:var(--ivory);text-shadow:0 3px 0 rgba(6,3,16,.5),0 6px 24px rgba(6,3,16,.8);
  transform:translateY(10px);transition:transform .9s cubic-bezier(.2,.9,.3,1)}
.uk-card-title.on b{transform:none}
.uk-card-title span{position:relative;display:block;font-family:var(--serif);font-style:italic;font-weight:600;font-size:21px;color:var(--gold2)}
.uk-card-title span:empty{display:none}

/* ---- açılış efsanesi ---- */
.uk-lore{position:absolute;left:0;right:0;bottom:0;padding:120px 28px calc(var(--sab) + 70px);text-align:center;opacity:0;transition:opacity .9s;pointer-events:none;
  background:linear-gradient(0deg,rgba(11,7,25,.94) 0%,rgba(11,7,25,.78) 42%,rgba(11,7,25,0) 100%)}
.uk-lore.on{opacity:1}
.uk-lore .orn{display:block;width:120px;height:10px;margin:0 auto 14px;background:radial-gradient(circle,var(--gold2) 0 2.5px,transparent 3px),linear-gradient(90deg,rgba(255,224,160,0),var(--gold) 45%,var(--gold) 55%,rgba(255,224,160,0)) center/100% 1.5px no-repeat}
.uk-lore p{text-wrap:balance;max-width:520px;margin:0 auto;font-family:var(--serif);font-style:italic;font-weight:600;font-size:clamp(23px,6.6vw,30px);line-height:1.28;color:var(--ivory);text-shadow:var(--tsh)}
.uk-lore p.a{animation:ukLoreA .9s ease-out}.uk-lore p.b{animation:ukLoreB .9s ease-out}
@keyframes ukLoreA{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:none}}@keyframes ukLoreB{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:none}}
.uk-skip{position:absolute;right:calc(var(--sar) + 14px);top:calc(var(--sat) + 14px);height:42px;padding:0 16px 0 18px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;
  font-size:13px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:var(--ivory);background:var(--panel);border:1px solid var(--line2);box-shadow:var(--pshadow);opacity:0;visibility:hidden;transition:opacity .4s,visibility 0s linear .4s}
.uk-skip span{font-size:20px;line-height:1;margin-top:-2px;color:var(--gold2)}
.uk-skip.on{opacity:1;visibility:visible;transition:opacity .4s,visibility 0s}
.uk-fade{position:absolute;inset:0;background:#0d0a1e;opacity:0;transition:opacity .5s;pointer-events:none}
.uk-fade.on{opacity:1}

/* ---- bitiş ekranları ---- */
.uk-end{justify-content:center;padding:calc(var(--sat) + 16px) 16px calc(var(--sab) + 16px);background:radial-gradient(ellipse at 50% 45%,rgba(11,7,25,.55) 0%,rgba(11,7,25,.88) 75%)}
.uk-sheet{position:relative;width:min(100%,384px);margin-top:44px;padding:58px 22px 22px;border-radius:30px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;
  background:linear-gradient(180deg,rgba(40,30,72,.98) 0%,rgba(18,12,34,.98) 100%);border:1px solid var(--line2);box-shadow:0 26px 60px rgba(6,3,16,.6),inset 0 1px 0 rgba(255,240,210,.12);
  transform:translateY(18px) scale(.97);transition:transform .55s cubic-bezier(.2,1.25,.4,1)}
.uk-scr.on .uk-sheet{transform:none}
.uk-sheet .rays{position:absolute;left:50%;top:-118px;width:240px;height:240px;margin-left:-120px;pointer-events:none;opacity:.9}
.uk-sheet .rays svg{width:100%;height:100%;fill:rgba(255,214,130,.22);stroke:none;animation:ukSpin 30s linear infinite}
@keyframes ukSpin{to{transform:rotate(360deg)}}
.uk-sheet .med{position:absolute;left:50%;top:-46px;width:92px;height:92px;margin-left:-46px;border-radius:50%;display:grid;place-items:center;color:#3a2008;
  background:radial-gradient(circle at 50% 32%,#fff6d8,#ffd27a 55%,#e48e36);border:3px solid #fff0c8;box-shadow:0 0 0 7px rgba(255,210,120,.16),0 0 40px rgba(255,190,90,.5),0 10px 24px rgba(6,3,16,.5)}
.uk-sheet .med svg{width:50px;height:50px;stroke-width:2}
.uk-end .k{font-size:12px;font-weight:800;letter-spacing:.32em;text-transform:uppercase;color:var(--gold2)}
.uk-end h2{font-family:var(--serif);font-style:italic;font-weight:700;font-size:clamp(40px,11vw,50px);line-height:1.04;color:var(--ivory)}
.uk-end .ban{margin-top:2px;padding:5px 16px;border-radius:999px;font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#2e1906;background:linear-gradient(180deg,#fff2cc,#f5b65c)}
.uk-end .sub{text-wrap:balance;font-family:var(--serif);font-style:italic;font-weight:600;font-size:20px;line-height:1.3;color:var(--ivory2);max-width:330px}
.uk-end .sub b{font-family:var(--sans);font-style:normal;font-weight:800;font-size:17px;color:var(--gold2)}
.uk-stars{display:flex;justify-content:center;align-items:flex-end;gap:8px;margin:12px 0 4px}
.uk-star{width:96px;display:flex;flex-direction:column;align-items:center;gap:8px;font-size:12.5px;font-weight:700;line-height:1.2;color:var(--ivory3)}
.uk-star .sh{position:relative;width:60px;height:60px}
.uk-star.s1 .sh{width:76px;height:76px}
.uk-star .sh i,.uk-star .sh b{position:absolute;inset:0;clip-path:polygon(50% 2%,62% 35%,97% 36%,69% 58%,79% 93%,50% 73%,21% 93%,31% 58%,3% 36%,38% 35%)}
.uk-star .sh i{background:rgba(255,246,232,.13)}
.uk-star .sh b{background:linear-gradient(180deg,#fff8de 0%,#ffd76e 45%,#ef9535 100%);opacity:0;transform:scale(.2) rotate(-40deg);transition:transform .6s cubic-bezier(.3,1.9,.45,1),opacity .2s}
.uk-star .sh::after{content:"";position:absolute;inset:-14px;border-radius:50%;border:2.5px solid var(--gold2);opacity:0;pointer-events:none}
.uk-star.on{color:var(--ivory)}
.uk-star.on .sh b{opacity:1;transform:none}
.uk-star.on .sh::after{animation:ukBurst .75s ease-out}
@keyframes ukBurst{0%{opacity:1;transform:scale(.35)}100%{opacity:0;transform:scale(1.5)}}
.uk-dust{display:inline-flex;align-items:center;gap:8px;margin-top:4px;padding:9px 20px;border-radius:999px;font-size:16px;font-weight:800;color:var(--gold2);
  background:rgba(255,210,120,.1);border:1px solid rgba(255,210,120,.4);font-variant-numeric:tabular-nums;transition:transform .3s cubic-bezier(.3,1.8,.5,1)}
.uk-dust i{font-style:normal}
.uk-dust b{font-size:20px;color:#fff1cc}
.uk-dust span{font-weight:700;color:var(--ivory2)}
.uk-dust.done{animation:ukBumpA .4s cubic-bezier(.3,1.8,.5,1)}
.uk-end .acts{display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:14px;width:100%}
.uk-end .acts .uk-btn.pri{width:100%;min-width:0}
.uk-end .row{display:flex;gap:10px;width:100%}
.uk-end .row .uk-btn{flex:1}
.uk-end .acts > .uk-btn.gh{width:100%}
/* başarısız */
.uk-end.fail .med{color:#e6e0ff;background:radial-gradient(circle at 50% 32%,#4a3a8c,#1a1236 70%);border-color:var(--ember);box-shadow:0 0 0 7px rgba(255,138,76,.16),0 0 36px rgba(255,120,60,.4),0 10px 24px rgba(6,3,16,.5)}
.uk-end.fail .med svg{stroke-width:2.2}
.uk-end.fail .k{color:var(--ember2)}
.uk-prog{position:relative;width:100%;max-width:290px;height:10px;margin:18px 0 8px;border-radius:10px;background:rgba(255,246,232,.12)}
.uk-prog .fp{position:absolute;inset:0;border-radius:inherit;background:linear-gradient(90deg,var(--violet2),var(--ember));transform-origin:0 50%;transform:scaleX(0);transition:transform 1s cubic-bezier(.2,.8,.3,1) .35s}
.uk-prog .fz{position:absolute;inset:0;transition:transform 1s cubic-bezier(.2,.8,.3,1) .35s}
.uk-prog .fz i{position:absolute;left:-10px;top:-5px;width:20px;height:20px;border-radius:50%;background:#140e26;border:2.5px solid var(--ember);box-shadow:0 0 10px rgba(255,138,76,.8)}
.uk-prog .g0{position:absolute;left:-4px;top:1px;width:8px;height:8px;border-radius:50%;background:var(--violet)}
.uk-prog .g1{position:absolute;right:-16px;top:-11px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;color:var(--gold2);background:#1a1236;border:1.5px solid var(--line2)}
.uk-prog .g1 svg{width:17px;height:17px}
.uk-mercy{display:flex;gap:12px;align-items:center;text-align:left;margin-top:8px;padding:12px 14px;border-radius:16px;font-size:15px;line-height:1.4;color:var(--ivory);
  background:rgba(255,200,110,.1);border:1px solid rgba(255,210,120,.35)}
.uk-mercy svg{flex:none;width:30px;height:30px;color:var(--gold2)}
.uk-mercy b{color:var(--gold2);font-weight:800}
/* final */
.uk-end.night{background:radial-gradient(ellipse at 50% 40%,rgba(11,7,25,.45) 0%,rgba(11,7,25,.9) 75%)}
.uk-end.night .med{background:radial-gradient(circle at 50% 35%,#2e2356,#120c26);border-color:var(--gold2)}
.uk-end.night .med .emb{width:66px;height:66px}

/* ---- duraklat / ayarlar ---- */
.uk-pause{justify-content:center;padding:calc(var(--sat) + 12px) 16px calc(var(--sab) + 12px);background:rgba(9,6,20,.72)}
.uk-card{width:min(100%,360px);padding:22px 20px 20px;border-radius:30px;display:flex;flex-direction:column;gap:12px;align-items:stretch;
  background:linear-gradient(180deg,rgba(40,30,72,.98) 0%,rgba(18,12,34,.98) 100%);border:1px solid var(--line2);box-shadow:0 26px 60px rgba(6,3,16,.6),inset 0 1px 0 rgba(255,240,210,.12);
  transform:translateY(14px) scale(.97);transition:transform .45s cubic-bezier(.2,1.25,.4,1)}
.uk-scr.on .uk-card{transform:none}
.uk-card h4{font-family:var(--serif);font-style:italic;font-weight:700;font-size:36px;line-height:1.1;text-align:center}
.uk-card .cb,.uk-card .ct{display:flex;flex-direction:column;gap:10px}
.uk-card .ct{padding-top:14px;border-top:1px solid rgba(255,224,160,.16);gap:8px}
.uk-card .uk-btn{min-width:0;width:100%}
.uk-card .uk-btn.pri{height:58px}
.uk-tog{display:flex;align-items:center;gap:12px;height:52px;padding:0 10px 0 14px;border-radius:16px;font-size:16px;font-weight:700;color:var(--ivory);
  background:rgba(255,246,232,.06);border:1px solid rgba(255,246,232,.1);transition:transform .15s}
.uk-tog:active{transform:scale(.97)}
.uk-tog svg{width:22px;height:22px;flex:none;color:var(--gold2)}
.uk-tog span{flex:1;text-align:left}
.uk-tog b{min-width:96px;padding:6px 12px;border-radius:999px;text-align:center;font-size:13px;font-weight:800;color:#2e1906;background:linear-gradient(180deg,#fff2cc,#f5b65c)}
.uk-tog.off b{color:var(--ivory2);background:rgba(255,246,232,.1)}
.uk-tog.off svg{color:var(--ivory3)}

/* ---- yatay ve kısa ekran ---- */
@media (max-height:700px) and (orientation:portrait){
  .emb{width:56px;height:56px}.uk-brand .k{margin-top:10px}
  .uk-sheet{padding-top:52px;gap:4px}.uk-stars{margin:8px 0 2px}.uk-end .acts{margin-top:10px}
  .uk-lv .cd{min-height:60px;padding:8px 14px}.uk-lv .tx b{font-size:23px}
}
@media (orientation:landscape) and (max-height:520px){
  .uk-title{padding-top:calc(var(--sat) + 10px);padding-bottom:calc(var(--sab) + 16px)}
  .uk-title .sky{height:calc(var(--sat) + 300px)}.uk-title .foot{height:34%}
  .uk-brand{margin-top:-30px}.emb{width:46px;height:46px}.uk-brand .k{margin-top:6px}
  .uk-brand h1{font-size:72px}.uk-brand .tag{font-size:20px;margin-top:0}
  .uk-title .acts{flex-direction:row;gap:12px}.uk-title .acts .uk-btn.pri{min-width:220px}
  .uk-levels .hd{max-width:none}.uk-levels .ttl h5{font-size:28px}
  .uk-list{max-width:none;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-content:start}
  .uk-ssn .nm span{display:none}.uk-ssn header{height:44px}
  .uk-lv .cd{min-height:0;padding:9px 12px;flex-direction:column;align-items:flex-start;gap:4px}
  .uk-lv .tx b{font-size:21px}.uk-lv .no{margin:0 4px 0 6px}
  .uk-hud{--cw:112px}
  .uk-hud .lvl{max-width:300px}
  .uk-hint{left:calc(var(--sal) + var(--cw) + 26px);right:calc(var(--sar) + 220px);width:auto;max-width:520px;bottom:calc(var(--sab) + 16px);transform:translateY(12px)}
  .uk-hint.on{transform:none}
  .uk-hand{bottom:calc(var(--sab) + 130px)}
  .uk-wait{width:84px;height:84px}
  .uk-ab{right:calc(var(--sar) + 110px);bottom:calc(var(--sab) + 26px);width:62px;height:62px}
  .uk-gust{bottom:calc(var(--sab) + 114px)}
  .uk-card-title{top:22%}
  .uk-lore{padding-top:70px;padding-bottom:calc(var(--sab) + 34px)}
  .uk-end{justify-content:center}
  .uk-sheet{width:min(100%,660px);margin-top:0;padding:16px 22px 16px;display:grid;grid-template-columns:1fr 1fr;column-gap:22px;row-gap:4px;align-items:center}
  .uk-sheet .rays,.uk-sheet .med{display:none}
  .uk-sheet > *{grid-column:1;justify-self:center}
  .uk-sheet .acts,.uk-sheet .uk-mercy{grid-column:2;grid-row:1 / span 6;margin:0;justify-self:stretch}
  .uk-pop{top:calc(var(--sat) + 84px)}
  .uk-sheet .uk-mercy{grid-row:1 / span 2;align-self:end}
  .uk-end.fail .uk-sheet .acts{grid-row:3 / span 4;align-self:start}
  .uk-end h2{font-size:40px}.uk-stars{margin:4px 0 0}.uk-star .sh{width:46px;height:46px}.uk-star.s1 .sh{width:56px;height:56px}
  .uk-card{width:min(100%,640px);display:grid;grid-template-columns:1fr 1fr;column-gap:18px;row-gap:10px;padding:16px 20px}
  .uk-card h4{grid-column:1 / span 2;font-size:30px}
  .uk-card .ct{padding-top:0;border-top:0}
}
@media (prefers-reduced-motion:reduce){
  .uk-btn.pri::after,.uk-title .sky i,.uk-lv.cur .no::after,.uk-compass .win,.uk-compass.hot .halo,.uk-hud.gst .uk-wait::after,.uk-ab.ready::after,
  .uk-sheet .rays svg,.uk-gust.on svg,.uk-hand.on .fg{animation:none}
  .uk-pop.a,.uk-pop.b{animation-name:ukFadeOnly}
  @keyframes ukFadeOnly{0%{opacity:0;transform:translate(-50%,0)}15%,75%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,0)}}
  .uk-streak.p0 b,.uk-streak.p1 b,.uk-pill.pop0,.uk-pill.pop1,.uk-pill.bad0,.uk-pill.bad1,.uk-star.on .sh::after,.uk-dust.done,.uk-lore p.a,.uk-lore p.b{animation:none}
  .uk-star .sh b{transform:none}
}
`;
