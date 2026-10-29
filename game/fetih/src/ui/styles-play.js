// Oynanış arayüzü stilleri: joker düğmeleri ve etkileri, sabotaj perdesi, HUD kalkan rozeti, başlıktaki ilerleme şeridi,
// sefer ekranı ve sahne sayfası, bitiş ekranının ödül/yıldız bölümleri.
// Kurallar (DESIGN.md): animasyon yalnızca transform ve opacity; backdrop-filter yok; gölgeler duruk.

import { OUT, LAND } from './cssutil.js';

export const CSS_PLAY = /* css */ `
/* ---------------------------------------------------------------- joker çubuğu (soru kartı) */
.fl-jk{display:flex;justify-content:center;gap:6px;margin-top:12px}
.fl-jk:empty{display:none}
.fl-jkb{position:relative;flex:1 1 0;min-width:44px;max-width:62px;padding:6px 0 5px;display:flex;flex-direction:column;align-items:center;gap:2px;border-radius:15px;
  border:2.5px solid #fff;background:linear-gradient(180deg,var(--jl),var(--jc) 72%);box-shadow:0 4px 0 var(--jd),0 6px 8px rgba(0,0,0,.28);transition:transform .08s,opacity .2s}
.fl-jkb::before{content:'';position:absolute;left:6px;right:6px;top:3px;height:9px;border-radius:6px 6px 9px 9px;background:linear-gradient(rgba(255,255,255,.45),rgba(255,255,255,0));pointer-events:none}
.fl-jkb:active{transform:translateY(3px);box-shadow:0 1px 0 var(--jd)}
.fl-jkb .ji{width:28px;height:28px;font-size:28px;display:grid;place-items:center}
.fl-jkb b{font-family:'Lilita One';font-weight:400;font-size:11.5px;line-height:1;letter-spacing:.02em;${OUT('var(--jd)', 1)}}
.fl-jkb>i{position:absolute;right:-6px;top:-9px;min-width:21px;height:21px;padding:0 4px;border-radius:11px;font-style:normal;font-family:'Lilita One';font-size:13.5px;line-height:17px;text-align:center;
  color:#4a2800;background:var(--gold);border:2px solid #fff;box-shadow:0 2px 0 rgba(0,0,0,.3)}
.fl-jkb.zero>i{background:#6f7d99;color:#e8eefc}
.fl-jkb.off{opacity:.5;filter:grayscale(.7)}
.fl-jkb.arm{opacity:1;filter:none;border-color:var(--gold)}
.fl-jkb.arm::after{content:'';position:absolute;inset:-6px;border-radius:19px;border:3px solid var(--gold);pointer-events:none;animation:flJkRing 1s ease-in-out infinite alternate}
.fl-jkb.used{animation:flPop .4s}
.fl-q.locked .fl-jk,.fl-q.rv .fl-jk{opacity:.35;pointer-events:none}
@keyframes flJkRing{from{opacity:.3;transform:scale(.95)}to{opacity:1;transform:scale(1.04)}}

/* joker etkileri */
.fl-opt .jp,.fl-hl .jp{position:absolute;left:10px;right:10px;bottom:5px;height:7px;border-radius:4px;background:rgba(10,21,52,.2);overflow:hidden;pointer-events:none}
.fl-hl .jp{bottom:7px;background:rgba(0,0,0,.3)}
.jp i{display:block;height:100%;border-radius:4px;background:linear-gradient(#ff9cc8,#ec4f93);transform-origin:0 50%;transform:scaleX(var(--w,0));animation:flGrow .85s cubic-bezier(.2,.8,.3,1) both}
.jq{position:absolute;right:7px;top:-9px;padding:0 7px;border-radius:9px;text-decoration:none;font-family:'Lilita One';font-size:12.5px;line-height:17px;color:#fff;background:#ec4f93;border:2px solid #fff;box-shadow:0 2px 0 rgba(0,0,0,.3);animation:flPopIn .35s .3s cubic-bezier(.3,1.8,.5,1) both}
.fl-crowd{display:flex;align-items:center;justify-content:center;gap:7px;padding:5px 10px 6px;border-radius:13px;font-size:14px;background:rgba(236,79,147,.22);border:2px solid #ec4f93;animation:flPopIn .35s cubic-bezier(.3,1.6,.5,1) both}
.fl-crowd .fl-i{font-size:19px;flex:none}
.fl-crowd b{font-family:'Lilita One';font-weight:400;font-size:18px;color:var(--gold)}
.fl-num.narrow .fl-num-val{border-color:#2f9bd8;box-shadow:0 0 0 3px rgba(47,155,216,.4)}
.fl-key.sug{box-shadow:0 0 0 3px #ec4f93,0 4px 0 #aab6cf;animation:flSug .6s ease-in-out infinite alternate}
@keyframes flSug{to{transform:translateY(-3px) scale(1.12)}}

/* bot joker rozeti (oyuncu plakasında) */
.fl-qp .jb{position:absolute;left:-7px;bottom:-10px;width:25px;height:25px;border-radius:50%;display:grid;place-items:center;font-size:15px;background:var(--jc);border:2px solid #fff;box-shadow:0 2px 0 rgba(0,0,0,.35);animation:flPopIn .4s cubic-bezier(.3,1.8,.5,1) both}
.fl-qwho.duel .fl-qp.d .jb{left:auto;right:-7px}
.fl-qp.sab{border-color:#e0583a}

/* sabotaj perdesi */
.fl-sab{position:absolute;inset:-3px;border-radius:24px;display:grid;place-items:center;pointer-events:none;opacity:0;z-index:6;background:radial-gradient(circle at 50% 45%,rgba(70,16,26,.8),rgba(14,6,20,.95) 80%)}
.fl-sab.on{animation:flSabV var(--ms,2s) ease-out both}
.fl-sab span{display:flex;flex-direction:column;align-items:center;gap:0;animation:flSabT .5s cubic-bezier(.3,1.7,.5,1) both}
.fl-sab .fl-i{font-size:48px}
.fl-sab b{font-family:'Lilita One';font-weight:400;font-size:36px;line-height:1.05;color:var(--gold);${OUT('#3a0a0a', 3)}}
.fl-sab em{font-style:normal;font-family:'Lilita One';font-size:22px;color:#ff8a78;${OUT('#3a0a0a', 2)}}
.fl-qc.shk{animation:flSabShk .5s}
@keyframes flSabV{0%{opacity:0}10%,60%{opacity:1}100%{opacity:0}}
@keyframes flSabT{from{opacity:0;transform:scale(2.2)}}
@keyframes flSabShk{10%{transform:translateX(-9px)}30%{transform:translateX(8px)}50%{transform:translateX(-6px)}70%{transform:translateX(5px)}90%{transform:translateX(-2px)}}
.fl-clock.up{animation:flPop .5s}
.fl-clock.dn{animation:flShakeX .5s}

/* HUD: kalkan rozeti */
.fl-pl .sd{position:absolute;left:-6px;top:-6px;width:23px;height:23px;border-radius:50%;display:none;place-items:center;font-size:13px;background:var(--gold);border:2px solid #fff;box-shadow:0 2px 0 rgba(0,0,0,.35)}
.fl-pl.shd .sd{display:grid;animation:flPopIn .4s cubic-bezier(.3,1.8,.5,1) both}

/* ---------------------------------------------------------------- başlık: ilerleme şeridi */
.fl-prof{position:absolute;left:12px;right:12px;top:calc(10px + var(--sat));display:flex;align-items:center;gap:8px;pointer-events:none;animation:flUp .4s .6s ease-out both;opacity:0;transform:translateY(8px)}
.fl-prof .lv{flex:none;width:42px;height:42px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 45% 35%,#7a9cff,#2a4ab8);border:3px solid #fff;box-shadow:0 3px 0 rgba(0,0,0,.35)}
.fl-prof .lv small{font-size:7px;letter-spacing:.1em;line-height:1}
.fl-prof .lv b{font-family:'Lilita One';font-weight:400;font-size:20px;line-height:1}
.fl-prof .xb{flex:1;max-width:130px;height:14px;border-radius:8px;background:#0a1534;border:2.5px solid #fff;overflow:hidden;box-shadow:0 3px 0 rgba(0,0,0,.35)}
.fl-prof .xb u{display:block;height:100%;background:linear-gradient(#a0c0ff,#4a7aff);transform-origin:0 50%;transform:scaleX(0)}
.fl-prof .gd{margin-left:auto;display:flex;align-items:center;gap:5px;padding:3px 13px 3px 3px;border-radius:999px;background:#0a1534;border:2px solid var(--gold);box-shadow:0 3px 0 rgba(0,0,0,.35)}
.fl-prof .coin{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:20px;background:radial-gradient(circle at 45% 35%,#fff3b0,#f5b324 60%,#b07a12);border:2px solid #fff}
.fl-prof .gd b{font-family:'Lilita One';font-weight:400;font-size:18px;color:var(--gold)}

/* ---------------------------------------------------------------- sefer */
.fl-camp{justify-content:flex-start;gap:0;padding:0;background:linear-gradient(180deg,rgba(9,17,42,.93),rgba(9,17,42,.98))}
.fl-ctop{display:flex;align-items:center;gap:8px;width:100%;max-width:640px;padding:calc(10px + var(--sat)) 12px 8px}
.fl-ctop h2{flex:1;margin:0;font-family:'Lilita One';font-weight:400;font-size:28px;letter-spacing:.03em;color:var(--gold);${OUT('#3a2000', 2)}}
.fl-ctop .chip{display:flex;align-items:center;gap:4px;padding:3px 11px 3px 7px;border-radius:999px;background:var(--ink);border:2px solid rgba(255,210,90,.6)}
.fl-ctop .chip .fl-i{font-size:19px}
.fl-ctop .chip b{font-family:'Lilita One';font-weight:400;font-size:17px;color:var(--gold)}
.fl-ctop .chip small{font-size:12px;color:#cfe0ff}
.fl-cbody{flex:1;min-height:0;width:100%;max-width:640px;overflow-y:auto;overflow-x:hidden;touch-action:pan-y;padding:6px 12px 24px;display:flex;flex-direction:column;gap:14px;-webkit-overflow-scrolling:touch}
.rg{position:relative;flex:none;border-radius:22px;background:var(--panel);border:3px solid var(--rc);box-shadow:0 5px 0 var(--navy-d),0 8px 14px rgba(0,0,0,.3);overflow:hidden}
.rg header{display:flex;align-items:center;gap:10px;padding:8px 10px 8px 10px;background:linear-gradient(90deg,var(--rc),rgba(21,42,87,0) 88%)}
.rg .mp{flex:none;width:84px}
.rg .fl-mm{width:100%;height:46px;margin:0}
.rg .fl-mm .base{fill:rgba(10,21,52,.55);stroke:rgba(255,255,255,.25)}
.rg .fl-mm .hi{fill:#fff;stroke:#0d1733;stroke-width:.4}
.rg .nm{flex:1;min-width:0}
.rg .nm b{display:block;font-family:'Lilita One';font-weight:400;font-size:21px;line-height:1.05;${OUT('rgba(0,0,0,.45)', 2)}}
.rg .nm small{display:block;font-size:12px;color:#fff;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rg .nm em{display:inline-flex;align-items:center;gap:4px;margin-top:2px;padding:1px 9px 2px 6px;border-radius:999px;font-style:normal;font-size:12px;color:#4a2800;background:var(--gold);border:2px solid #fff}
.rg .bs{position:relative;flex:none;display:flex;flex-direction:column;align-items:center;gap:3px}
.rg .bs .fl-av{width:46px;height:46px;border-radius:14px}
.rg .bs .st{display:flex;align-items:center;gap:3px;padding:0 7px 0 4px;border-radius:999px;background:var(--ink);border:1.5px solid rgba(255,255,255,.3)}
.rg .bs .st .fl-i{font-size:13px}
.rg .bs .st b{font-family:'Lilita One';font-weight:400;font-size:12.5px}
.rg .why{display:flex;align-items:center;gap:7px;margin:8px 10px 0;padding:5px 10px;border-radius:12px;font-size:13.5px;background:rgba(0,0,0,.35);border:2px dashed rgba(255,210,90,.6)}
.rg .why .fl-i{font-size:18px;flex:none}
.rg .nodes{display:flex;align-items:flex-start;justify-content:space-between;padding:12px 10px 12px}
.rg.lock .nodes{opacity:.55}
.rg .nd{position:relative;flex:1 1 0;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0}
.rg .nd .cc{position:relative;width:54px;height:54px;border-radius:50%;display:grid;place-items:center;font-size:24px;background:radial-gradient(circle at 40% 30%,#7ba4ff,#2a56d6);border:3.5px solid #fff;box-shadow:0 5px 0 #14308a,0 8px 10px rgba(0,0,0,.3);transition:transform .08s}
.rg .nd .cc b{font-family:'Lilita One';font-weight:400;${OUT('#14308a', 2)}}
.rg .nd .cc .fl-i{font-size:26px}
.rg .nd:active .cc{transform:translateY(3px)}
.rg .nd.won .cc{background:radial-gradient(circle at 40% 30%,#97f594,#2fa83c);box-shadow:0 5px 0 #16661f,0 8px 10px rgba(0,0,0,.3)}
.rg .nd.won .cc b{${OUT('#16661f', 2)}}
.rg .nd.boss .cc{width:62px;height:62px;margin-top:-5px;background:radial-gradient(circle at 40% 30%,#ffe680,#e0950e);box-shadow:0 5px 0 #8a5206,0 8px 10px rgba(0,0,0,.3)}
.rg .nd.boss .cc .fl-i{font-size:32px}
.rg .nd.lock .cc{background:#2a375e;box-shadow:0 5px 0 #121b36;border-color:rgba(255,255,255,.3)}
.rg .nd.cur .cc::after{content:'';position:absolute;inset:-8px;border-radius:50%;border:3px solid var(--gold);animation:flJkRing 1s ease-in-out infinite alternate;pointer-events:none}
.rg .cn{flex:0 0 8px;height:5px;margin-top:25px;border-radius:3px;background:rgba(255,255,255,.28)}
.sr{display:flex;gap:1px}
.sr i{width:16px;height:16px;display:block}
.sr svg{width:100%;height:100%;fill:#31406d;stroke:#0a1534;stroke-width:1.4;stroke-linejoin:round}
.sr i.on svg{fill:#ffd25a;stroke:#7a4a06}
.rg .nd small{display:block;min-height:24px;max-width:78px;font-size:10.5px;line-height:1.15;text-align:center;opacity:.9}
.fl-sheet{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;background:rgba(5,9,22,.66);opacity:0;visibility:hidden;transition:opacity .25s,visibility 0s .25s;pointer-events:auto}
.fl-sheet.on{opacity:1;visibility:visible;transition:opacity .25s}
.fl-sheet .box{width:min(100%,520px);max-height:92%;overflow-y:auto;padding:14px 14px calc(14px + var(--sab));border-radius:26px 26px 0 0;background:var(--panel);border:3px solid var(--rc);border-bottom:0;transform:translateY(100%);transition:transform .32s cubic-bezier(.3,1.15,.5,1);display:flex;flex-direction:column;gap:9px}
.fl-sheet.on .box{transform:none}
.fl-sheet .hd{display:flex;align-items:center;justify-content:space-between;gap:10px}
.fl-sheet .hd small{display:block;font-size:11px;letter-spacing:.14em;color:#cfe0ff}
.fl-sheet .hd h3{margin:0;font-family:'Lilita One';font-weight:400;font-size:26px;line-height:1.05;color:var(--gold);${OUT('#3a2000', 2)}}
.fl-sheet .hd .sr i{width:22px;height:22px}
.fl-sheet .meta{display:flex;flex-wrap:wrap;gap:6px}
.fl-sheet .meta span{display:inline-flex;align-items:center;gap:5px;padding:2px 10px 3px 7px;border-radius:999px;font-size:13.5px;background:var(--ink);border:2px solid rgba(255,255,255,.22)}
.fl-sheet .meta .pk{border-color:#ff8a78;color:#ffd0c8}
.fl-sheet .ops{display:flex;flex-direction:column;gap:6px}
.fl-sheet .op{display:flex;align-items:center;gap:10px;padding:5px 10px 5px 6px;border-radius:15px;background:var(--ink);border:2px solid rgba(255,255,255,.14)}
.fl-sheet .op.boss{border-color:var(--gold)}
.fl-sheet .op .fl-av{width:48px;height:48px;border-radius:14px}
.fl-sheet .op b{display:block;font-size:16px;line-height:1.1}
.fl-sheet .op b em{margin-left:6px;padding:0 7px;border-radius:7px;font-style:normal;font-family:'Lilita One';font-weight:400;font-size:11px;letter-spacing:.06em;vertical-align:2px;color:#4a2800;background:var(--gold)}
.fl-sheet .op b em.al{background:#7dff9a}
.fl-sheet .op small{display:block;font-size:12px;color:#cfe0ff}
.fl-sheet .op q{display:block;margin-top:1px;font-size:12.5px;font-style:italic;color:#ffe9a8}
.fl-sheet .rules{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.fl-sheet .rules li{display:flex;align-items:center;gap:7px;padding:3px 10px;border-radius:11px;font-size:14px;background:rgba(10,21,52,.7);color:#b7c5e8}
.fl-sheet .rules li.ok{color:#7dff9a}
.fl-sheet .rules li span{flex:1}
.fl-sheet .rules li i{font-style:normal;color:var(--gold);letter-spacing:.05em;font-size:13px}
.fl-sheet .rules .fl-i{font-size:16px;flex:none}
.fl-sheet .rw{display:flex;align-items:center;gap:7px;padding:5px 12px 6px 8px;border-radius:13px;font-size:14px;color:#4a2800;background:linear-gradient(#ffe680,#f5b324);border:2px solid #fff}
.fl-sheet .bt{display:grid;grid-template-columns:auto 1fr;gap:10px;margin-top:2px}
.fl-sheet .bt .fl-btn.big{font-size:clamp(20px,calc(6.6 * var(--vw)),26px);padding:11px 10px 14px}

/* ---------------------------------------------------------------- bitiş: ödül ve yıldızlar */
.fl-end{overflow-y:auto;justify-content:flex-start;touch-action:pan-y}
.fl-ein{margin:auto 0}
.fl-end .btns{position:sticky;bottom:calc(-1 * var(--sab));z-index:2;padding:8px 0 2px;background:linear-gradient(rgba(6,11,28,0),rgba(6,11,28,.92) 28%)}
.fl-end .btns .fl-btn.big{font-size:clamp(17px,calc(5.3 * var(--vw)),24px);padding:11px 8px 14px}
.fl-end.camp .fl-ein{gap:8px}
.fl-end.camp .fl-cres{padding:6px 10px 8px}
.fl-end.camp .cs-rules{font-size:12.5px;gap:2px;margin-top:4px}
.fl-end.camp .cs-stars{margin:2px 0 0}
.fl-end.camp .fl-lines .ln{padding:2px 8px}
.fl-end.camp .fl-adbtn{padding:5px 12px 8px;font-size:16px}
.fl-end.camp .fl-rew{padding:6px 8px}
.fl-end.camp .hdr b{font-size:min(calc(13 * var(--vw)),58px)}
.fl-end.camp .fl-podium .p1 .ped{height:60px}
.fl-end.camp .fl-podium .p2 .ped{height:44px}
.fl-end.camp .fl-podium .p3 .ped{height:34px}
.fl-end.camp .fl-podium .fl-av{width:46px;height:46px}
.fl-end.camp .fl-podium .p1 .fl-av{width:60px;height:60px}
.fl-end.camp .fl-podium .ped span{font-size:26px}
.fl-rewbox{display:flex;flex-direction:column;gap:8px;width:100%}
.fl-cres{padding:8px 12px 10px;border-radius:18px;text-align:center;background:var(--panel);border:2.5px solid rgba(255,210,90,.55);box-shadow:0 5px 0 var(--navy-d);animation:flUp .4s .7s ease-out both;opacity:0;transform:translateY(12px)}
.fl-cres .cs-h small{display:block;font-size:11px;letter-spacing:.14em;color:#cfe0ff}
.fl-cres .cs-h b{font-family:'Lilita One';font-weight:400;font-size:22px;line-height:1.1;color:var(--gold)}
.cs-stars{display:flex;justify-content:center;align-items:flex-end;gap:8px;margin:6px 0 2px}
.cs-stars .sx{width:46px;height:46px}
.cs-stars .sx:nth-child(2){margin-bottom:8px;width:54px;height:54px}
.cs-stars .sx svg{width:100%;height:100%;fill:#2a375e;stroke:#0a1534;stroke-width:1.2;stroke-linejoin:round}
.cs-stars .sx.on svg{fill:#ffd25a;stroke:#7a4a06;animation:flStarIn .6s calc(1s + var(--k) * .35s) cubic-bezier(.3,1.9,.5,1) both}
@keyframes flStarIn{0%{opacity:0;transform:scale(2.4) rotate(-40deg)}100%{opacity:1;transform:none}}
.cs-rules{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:3px;text-align:left;font-size:13.5px}
.cs-rules li{display:flex;align-items:center;gap:6px;color:#9fb0d6}
.cs-rules li.ok{color:#7dff9a}
.cs-rules .fl-i{font-size:15px;flex:none}
.cs-notes{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:8px}
.nt{display:inline-flex;align-items:center;gap:5px;padding:3px 11px 3px 7px;border-radius:999px;font-size:13px;background:var(--ink);border:2px solid rgba(255,255,255,.3);animation:flPopIn .4s 1.9s cubic-bezier(.3,1.7,.5,1) both}
.nt .fl-i{font-size:16px}
.nt.gold{color:#4a2800;background:var(--gold);border-color:#fff}
.fl-lines{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.fl-lines .ln{display:flex;align-items:center;gap:6px;padding:3px 9px;border-radius:10px;font-size:12.5px;background:rgba(10,21,52,.8);border:1.5px solid rgba(255,255,255,.14);animation:flRowIn .35s calc(1.1s + var(--k) * .08s) both}
.fl-lines .ln span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fl-lines .ln b{font-family:'Lilita One';font-weight:400;font-size:13.5px}
.fl-lines .ln .x{color:#a9c4ff}
.fl-lines .ln .g{color:var(--gold)}
.fl-lvups{display:flex;flex-direction:column;gap:5px;empty-cells:hide}
.fl-lvups .up{display:flex;align-items:center;gap:7px;padding:4px 12px 5px 8px;border-radius:13px;font-size:13px;color:#4a2800;background:linear-gradient(#ffe680,#f5b324);border:2px solid #fff;animation:flPopIn .45s cubic-bezier(.3,1.7,.5,1) both}
.fl-lvups .up b{font-family:'Lilita One';font-weight:400;font-size:17px;white-space:nowrap}
.fl-lvups .up span{flex:1;min-width:0}
.fl-adbtn{width:100%;font-size:18px;padding:8px 14px 11px;animation:flUp .4s 1.5s ease-out both;opacity:0;transform:translateY(8px)}
.fl-adbtn.done{filter:grayscale(.6);opacity:.7;animation:none}
${LAND}{
  .fl-rew{grid-area:auto}
  .fl-rewbox{grid-area:r}
  .fl-cbody{padding-bottom:12px}
  .rg .nd .cc{width:46px;height:46px}
  .rg .nd.boss .cc{width:52px;height:52px}
  .fl-prof{left:8px;right:auto;gap:6px}
  .fl-prof .gd{margin-left:6px}
  .fl-sheet .box{max-height:100%}
}
`;
