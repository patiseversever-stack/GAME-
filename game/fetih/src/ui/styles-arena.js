// Arena soru ekranı (v1.4, kullanıcı onaylı tasarım: ref/tasarim-v14-arena5-*.jpg).
// Eski kart stillerinin (styles-q.js, styles-play.js) ÜSTÜNE yazar; bu dosya CSS zincirinden çıkarılırsa eski görünüm döner.
//
// Yerleşim: soru kartı (.fl-q) haritalı olmayan sorularda bütün ekranı kaplar ama dokunulmaz (pointer-events: none):
//   üstte  .fl-qwho  düello afişi (saldıran | VS | savunan) ya da çok oyunculu afiş (2–4 eğik dilim)
//   altta  .fl-qc    koyu panel: kategori + büyük süre, parçalı süre çubuğu, beyaz büyük soru, açık zemin şıklar, renkli jokerler
// Arada harita ve savaş görünür (panel içeriği kadar yüksek, alttan büyür; uzun soru ve uzun şıkta yazı küçülür, şıklar tek sütun).
// Haritalı sorularda (.map) kart eskisi gibi üstte, aynı dille koyu panel.

export const CSS_ARENA = /* css */ `
/* ---------------------------------------------------------------- yerleşim */
.fl-q:not(.map){top:0;bottom:0;left:50%;width:min(calc(100 * var(--vw)),560px);display:flex;flex-direction:column;justify-content:space-between;transform:translate(-50%,0);
  transition:opacity .25s,visibility 0s .3s}
.fl-q.on:not(.map){transform:translate(-50%,0);transition:opacity .25s}
.fl-q:not(.map) .fl-qc{transform:translateY(40px);transition:transform .38s cubic-bezier(.25,1.2,.4,1)}
.fl-q.on:not(.map) .fl-qc{transform:none}
.fl-q:not(.map) .fl-qwho{transform:translateY(-110%);transition:transform .38s cubic-bezier(.25,1.2,.4,1)}
.fl-q.on:not(.map) .fl-qwho{transform:none}
.fl-ui.qon .fl-hud{opacity:0;pointer-events:none}
.fl-ui.qon .fl-pbtn{width:36px;height:36px}

/* ---------------------------------------------------------------- panel */
.fl-qc{padding:58px 12px calc(12px + var(--sab));border:0;border-radius:0;background:linear-gradient(180deg,rgba(7,8,15,0),rgba(7,8,15,.9) 42px,#07080f 64px);box-shadow:none}
.fl-qc::before{display:none}
.fl-qc::after{inset:auto 0 0;height:4px;border:0;border-radius:0;background:#ff3a2a}
.fl-q.hot .fl-qc::after{animation:flHot .5s ease-in-out infinite alternate}
.fl-qhead{height:auto;margin:0;gap:10px}
.fl-cat{max-width:70%;gap:7px;padding:4px 16px 4px 8px;border:0;border-radius:0;background:var(--cc);clip-path:polygon(0 0,100% 0,92% 100%,0 100%)}
.fl-cat .ci{width:22px;height:22px;font-size:13px}
.fl-cat b{font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:16px;letter-spacing:.12em;text-transform:uppercase;text-shadow:0 1px 0 rgba(0,0,0,.3)}
.fl-type{display:none}
.fl-rule{font-family:'Barlow Condensed','Fredoka',sans-serif;font-style:italic;font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.7);text-shadow:none}
.fl-clock{width:auto;height:auto;margin:0 0 0 auto;border:0;border-radius:0;background:none;box-shadow:none;display:flex;align-items:baseline;gap:3px}
.fl-clock b{font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:44px;line-height:.85;color:#fff;text-shadow:0 0 18px rgba(255,210,90,.45)}
.fl-clock::after{content:'SN';font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:16px;color:var(--gold)}
.fl-q.hot .fl-clock{background:none;animation:none}
.fl-q.hot .fl-clock b{color:#ff6a55;text-shadow:0 0 18px rgba(255,80,60,.6);animation:flBeat .5s ease-in-out infinite alternate}
.fl-tbar{height:7px;margin:8px 0 12px;border-radius:0;background:transparent;box-shadow:none;
  -webkit-mask:repeating-linear-gradient(90deg,#000 0 14px,transparent 14px 17px);mask:repeating-linear-gradient(90deg,#000 0 14px,transparent 14px 17px)}
.fl-tbar::before{content:'';position:absolute;inset:0;background:rgba(255,255,255,.16)}
.fl-tbar i{border-radius:0;background:#ffd25a;box-shadow:0 0 8px rgba(255,210,90,.6)}
.fl-q.hot .fl-tbar i{background:#ff5a3a}
.fl-qtext{display:block;min-height:0;padding:0 2px;margin-bottom:12px;border:0;border-radius:0;background:none;box-shadow:none;text-align:left;
  font-family:'Fredoka',sans-serif;font-weight:700;font-size:25px;line-height:1.18;letter-spacing:-.003em;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.5)}
.fl-q.qmid .fl-qtext{font-size:22px}
.fl-q.qlong .fl-qtext{font-size:20px}
.fl-qbody{margin-top:0}

/* ---------------------------------------------------------------- şıklar: açık zemin, koyu yazı, renkli harf bloğu */
.fl-opts{gap:8px}
.fl-opts.one{gap:7px}
.fl-opt{min-height:52px;padding:0 18px 0 0;gap:11px;border:0;border-radius:0;clip-path:polygon(0 0,100% 0,96% 100%,0 100%);
  background:linear-gradient(180deg,#fff,#e4e9f4);box-shadow:none;color:#0e1430;font-family:'Fredoka',sans-serif;font-weight:700;font-size:20px;line-height:1.12}
.fl-opts.one .fl-opt{min-height:46px;font-size:18.5px;clip-path:polygon(0 0,100% 0,98.4% 100%,0 100%)}
.fl-q.olong .fl-opts.one .fl-opt{font-size:17.5px}
.fl-opt:active{transform:translateY(2px);box-shadow:none;filter:brightness(.94)}
.fl-opt>i{align-self:stretch;width:38px;height:auto;border-radius:0;box-shadow:none;clip-path:polygon(0 0,100% 0,80% 100%,0 100%);
  font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:23px;text-shadow:0 2px 0 rgba(0,0,0,.25)}
.fl-opt:nth-child(1)>i{--lc:#2f7bff}.fl-opt:nth-child(2)>i{--lc:#ff8a1f}.fl-opt:nth-child(3)>i{--lc:#22c46a}.fl-opt:nth-child(4)>i{--lc:#a24bff}
.fl-opt.pick{background:linear-gradient(90deg,#ffe066,#ffbb1f);color:#1a1200;border:0;box-shadow:none;padding-right:50px}
.fl-opt.pick>i{background:#1a1200;color:#ffd25a;text-shadow:none}
/* seçenin avatarı: sağda, şıkkın içinde dikeyde ortalı */
.fl-opt.pick::after{right:16px;top:50%;width:28px;height:28px;transform:translateY(-50%);border-radius:7px;border:2px solid #1a1200;box-shadow:0 2px 0 rgba(0,0,0,.25);animation:none}
.fl-opts.one .fl-opt.pick::after{width:24px;height:24px;right:14px}
.fl-opt.right{background:linear-gradient(90deg,#5ff08a,#22b85a);color:#fff;border:0;box-shadow:none;${'text-shadow:0 1px 0 rgba(0,60,20,.35)'}}
.fl-opt.right>i{background:#fff;color:#1e9a4a;text-shadow:none}
.fl-opt.wrong{background:linear-gradient(90deg,#ff7a66,#d8392a);color:#fff;border:0;box-shadow:none;text-shadow:0 1px 0 rgba(80,0,0,.35)}
.fl-opt.wrong>i{background:#fff;color:#d8392a;text-shadow:none}
.fl-q.locked .fl-opt:not(.pick):not(.right):not(.wrong){opacity:.55}
/* aynı şıkkı seçenler: şıkkın içinde sağda, üst üste binen küçük avatarlar */
.fl-opt:has(.fl-who){padding-right:calc(20px + 17px * var(--wn,1))}
.fl-who{top:50%;right:14px;width:26px;height:26px;margin-top:-13px;border-radius:7px;border:2px solid #1a1200;box-shadow:0 2px 0 rgba(0,0,0,.25)}
.fl-who+.fl-who{right:31px}
.fl-who+.fl-who+.fl-who{right:48px}
.fl-who+.fl-who+.fl-who+.fl-who{right:65px}

/* ---------------------------------------------------------------- jokerler: renkli eğik karolar, simge + kalın küçük ad */
.fl-jk{gap:7px;margin-top:14px}
.fl-jkb{max-width:none;min-width:0;height:56px;padding:0;justify-content:center;gap:2px;border-radius:0;border:1.5px solid rgba(255,255,255,.5);transform:skewX(-8deg);
  background:linear-gradient(180deg,var(--jl),var(--jc) 70%,var(--jd));box-shadow:0 3px 0 rgba(0,0,0,.4)}
.fl-jkb::before{display:none}
.fl-jkb:active{transform:skewX(-8deg) translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.4)}
.fl-jkb .ji{width:23px;height:23px;font-size:23px;transform:skewX(8deg)}
.fl-jkb b{transform:skewX(8deg);font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.35)}
.fl-jkb>i{right:-5px;top:-8px;min-width:18px;height:18px;padding:0 4px;border-radius:4px;border:0;transform:skewX(8deg);background:#fff;color:#111;
  font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:13px;line-height:18px;box-shadow:0 2px 0 rgba(0,0,0,.35)}
.fl-jkb.zero>i{background:#5d6680;color:#e8eefc}
.fl-jkb.arm::after{inset:-5px;border-radius:0}

/* ---------------------------------------------------------------- ince afiş (seçenek 2): düello, çok oyunculu, takımlar */
.fl-q:not(.map) .fl-qwho{position:relative;margin:0;height:calc(58px + var(--sat));align-items:stretch;justify-content:stretch;gap:0;border:0;border-radius:0;background:#06070d;box-shadow:none;
  pointer-events:none;filter:drop-shadow(0 6px 14px rgba(0,0,0,.5))}
.fl-q:not(.map) .fl-qwho .fl-qp{position:relative;flex:1 1 0;min-width:0;max-width:none;display:flex;align-items:center;gap:8px;padding:var(--sat) 12px 0;border:0;border-radius:0;box-shadow:none;
  background:linear-gradient(160deg,var(--pc),color-mix(in srgb,var(--pc) 60%,#000))}
.fl-q:not(.map) .fl-qwho .fl-qp::after{content:'';position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.2) 0 22%,rgba(255,255,255,0) 22%);opacity:1;border-radius:0;pointer-events:none}
.fl-q:not(.map) .fl-qwho .fl-qp .fl-av{width:38px;height:38px;border-radius:10px;border:2.5px solid #fff;box-shadow:0 3px 0 rgba(0,0,0,.35);transform:skewX(-6deg)}
.fl-q:not(.map) .fl-qwho .fl-qp .nm{position:relative;z-index:1;display:flex;flex-direction:column;min-width:0}
.fl-q:not(.map) .fl-qwho .fl-qp .nm small{order:-1;margin:0;font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:800;font-size:9px;letter-spacing:.2em;line-height:1.1;color:rgba(255,255,255,.92)}
.fl-q:not(.map) .fl-qwho .fl-qp .nm b{font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:20px;line-height:.95;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 2px 0 rgba(0,0,0,.3)}
.fl-q:not(.map) .fl-qp .sc{display:block;font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:13px;line-height:1.05;color:#ffe680;text-shadow:0 1px 0 rgba(0,0,0,.4)}
/* düello: iki eğik yarı, ortada VS, altta hedef il */
.fl-q:not(.map) .fl-qwho.duel .fl-qp{clip-path:polygon(0 0,100% 0,84% 100%,0 100%);padding-right:54px}
.fl-q:not(.map) .fl-qwho.duel .fl-qp.d{flex-direction:row-reverse;text-align:right;padding:var(--sat) 12px 0 54px;margin-left:-12%;clip-path:polygon(16% 0,100% 0,100% 100%,0 100%);background:linear-gradient(200deg,var(--pc),color-mix(in srgb,var(--pc) 60%,#000))}
.fl-q:not(.map) .fl-qwho.duel .fl-qp.d .nm{align-items:flex-end}
.fl-q:not(.map) .fl-qwho .fl-qvs{position:absolute;left:50%;top:calc(var(--sat) + 12px);z-index:3;width:auto;height:auto;margin:0;border-radius:0;transform:translateX(-50%) skewX(-8deg);
  padding:1px 8px;background:#0a0b14;border:2px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.6)}
.fl-q:not(.map) .fl-qwho .fl-qvs b{font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:21px;line-height:1.05;letter-spacing:.04em;color:#ffd25a;text-shadow:none}
.fl-q:not(.map) .fl-qwho .fl-qvs span{position:absolute;left:50%;top:calc(100% + 8px);bottom:auto;max-width:150px;padding:2px 11px;border:0;border-radius:0;transform:translateX(-50%) skewX(8deg);
  background:#ffd25a;color:#1a1200;box-shadow:none;font-family:'Barlow Condensed',sans-serif;font-style:normal;font-weight:800;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;white-space:nowrap}
/* durum: cevapladı tiki avatar köşesinde; cevapta yanlışsa kırmızı, süre adın altında */
.fl-q:not(.map) .fl-qwho .fl-qp .st{z-index:2;left:36px;top:calc(var(--sat) + 32px);width:17px;height:17px;font-size:10px;border:2px solid #fff;background:#16c060}
.fl-q:not(.map) .fl-qwho.duel .fl-qp.d .st{left:auto;right:36px}
.fl-q:not(.map) .fl-qwho .fl-qp.no .st{background:#ff3a2a}
.fl-q:not(.map) .fl-qwho .fl-qp .tt{z-index:2;left:auto;right:auto;top:auto;bottom:-17px;padding:1px 6px;border-radius:0;font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:800;font-size:12px;line-height:1.2;color:#fff;background:#0a0b14}
.fl-q:not(.map) .fl-qwho.duel .fl-qp.a .tt{left:10px}
.fl-q:not(.map) .fl-qwho.duel .fl-qp.d .tt{right:10px}
.fl-q:not(.map) .fl-qwho .fl-qp.win .fl-av{box-shadow:0 0 0 3px var(--gold),0 0 16px rgba(255,210,90,.8)}
.fl-q:not(.map) .fl-qwho .fl-qp.win::before{z-index:3;left:18px;top:calc(var(--sat) - 2px);width:18px;height:13px}
.fl-q:not(.map) .fl-qwho.duel .fl-qp.d.win::before{left:auto;right:18px}
/* çok oyunculu: eğik paneller, birleşimlerde VS, sol altta sıra */
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp{gap:6px;padding:var(--sat) 6px 0 14px;clip-path:polygon(14px 0,100% 0,calc(100% - 14px) 100%,0 100%);margin-left:-11px}
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp:first-of-type{margin-left:0;padding-left:8px;clip-path:polygon(0 0,100% 0,calc(100% - 14px) 100%,0 100%)}
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp:last-of-type{clip-path:polygon(14px 0,100% 0,100% 100%,0 100%)}
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp .fl-av{width:32px;height:32px;border-radius:9px;border-width:2px}
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp .nm b{font-size:16px}
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp .sc{font-size:12px}
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp .st{left:auto;right:12px;top:calc(var(--sat) + 4px)}
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp .tt{left:14px}
.fl-q:not(.map) .fl-qwho .fl-qp .rk{position:absolute;z-index:2;left:4px;bottom:2px;font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:800;font-size:12px;color:rgba(255,255,255,.8)}
.fl-q:not(.map) .fl-qwho .vx{position:relative;z-index:3;flex:none;width:0;align-self:center;margin-top:var(--sat)}
.fl-q:not(.map) .fl-qwho .vx::before{content:'VS';position:absolute;left:-4px;top:50%;transform:translate(-50%,-50%) skewX(-8deg);padding:0 5px;background:#0a0b14;border:2px solid #fff;
  font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:800;font-size:14px;line-height:1.25;color:#ffd25a;box-shadow:0 3px 10px rgba(0,0,0,.6)}
.fl-q:not(.map) .fl-qwho:not(.duel)::after{content:attr(data-lb);position:absolute;left:50%;top:calc(var(--sat) + 62px);transform:translateX(-50%);white-space:nowrap;padding:2px 12px;background:#ffd25a;color:#1a1200;
  font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:10.5px;letter-spacing:.22em;clip-path:polygon(5% 0,100% 0,95% 100%,0 100%)}
.fl-q:not(.map) .fl-qwho:not(.duel):not([data-lb])::after{display:none}
/* takımlar: düello gibi iki yarı, her yarıda iki avatar yan yana + takım adı, puanı, isimler */
.fl-q:not(.map) .fl-tmh{position:relative;flex:1 1 0;min-width:0;display:flex;align-items:center;gap:9px;padding:var(--sat) 50px 0 10px;background:linear-gradient(160deg,var(--pc),color-mix(in srgb,var(--pc) 60%,#000));clip-path:polygon(0 0,100% 0,84% 100%,0 100%)}
.fl-q:not(.map) .fl-tmh.d{flex-direction:row-reverse;text-align:right;padding:var(--sat) 10px 0 50px;margin-left:-12%;clip-path:polygon(16% 0,100% 0,100% 100%,0 100%)}
.fl-q:not(.map) .fl-tmh .avs{display:flex;gap:5px}
.fl-q:not(.map) .fl-tmh .fl-qp{flex:none!important;padding:0!important;background:none!important;clip-path:none!important}
.fl-q:not(.map) .fl-tmh .fl-qp::after{display:none}
.fl-q:not(.map) .fl-tmh .fl-qp .nm{display:none}
.fl-q:not(.map) .fl-tmh .fl-qp .fl-av{width:34px;height:34px}
.fl-q:not(.map) .fl-tmh .fl-qp .st{left:auto;right:-4px;top:auto;bottom:-4px}
.fl-q:not(.map) .fl-tmh .fl-qp .tt{left:50%!important;transform:translateX(-50%);bottom:-19px}
.fl-q:not(.map) .fl-tmh .tn{display:flex;flex-direction:column;min-width:0}
.fl-q:not(.map) .fl-tmh.d .tn{align-items:flex-end}
.fl-q:not(.map) .fl-tmh .tn small{font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:800;font-size:9.5px;letter-spacing:.14em;white-space:nowrap}
.fl-q:not(.map) .fl-tmh .tn small i{color:#ffe680}
.fl-q:not(.map) .fl-tmh .tn b{font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:15px;line-height:.95;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fl-ui.qon .fl-pbtn{top:calc(var(--sat) + 70px)}

/* ---------------------------------------------------------------- sonuç damgası: harita alanının ortasında */
.fl-q:not(.map) .fl-stamp{top:44%;animation-name:flStampB}
.fl-stamp{font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border-radius:0;
  clip-path:none;transform:translate(-50%,-50%) skewX(-8deg)}
@keyframes flStampB{0%{opacity:0;transform:translate(-50%,-50%) skewX(-8deg) scale(1.9)}60%{opacity:1;transform:translate(-50%,-50%) skewX(-8deg) scale(.96)}100%{opacity:1;transform:translate(-50%,-50%) skewX(-8deg) scale(1)}}

/* ---------------------------------------------------------------- haritalı soru: üstte koyu panel */
.fl-q.map .fl-qc{padding:10px 12px 12px;border-radius:0 0 16px 16px;background:rgba(7,8,15,.94);border-bottom:2px solid rgba(255,210,90,.35);box-shadow:0 10px 26px rgba(0,0,0,.45)}
.fl-q.map{top:calc(var(--sat) + 4px);width:min(calc(100 * var(--vw) - 8px),560px)}
.fl-q.map .fl-qtext{font-size:20px;margin-bottom:8px}
.fl-q.map .fl-clock b{font-size:34px}

/* ---------------------------------------------------------------- doğru/yanlış: HÜKÜM (ref/tasarim-v14-tf-*.jpg)
   üstte İDDİA kartı; altta tek eğik levhanın iki yarısı (DOĞRU | YA DA | YANLIŞ); seçilen yarı genişler, öteki söner;
   cevapta iddia kartının TAMAMI hükme döner (yeşil/kırmızı silme + parıltı + büyük işaret). Levha ile jokerler arası geniş. */
.fl-q.tf .fl-qtext{position:relative;isolation:isolate;overflow:hidden;margin:0 0 14px;padding:12px 54px 15px 16px;border-left:5px solid var(--cc);
  background:linear-gradient(180deg,#151b33,#0d1124);clip-path:polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%);
  font-size:22px;line-height:1.2;text-shadow:none;text-wrap:balance;transition:border-color .25s .3s}
.fl-q.tf.qmid .fl-qtext{font-size:20px}
.fl-q.tf.qlong .fl-qtext{font-size:18.5px}
.fl-q.tf .fl-qtext::before{content:'İDDİA';display:block;margin-bottom:6px;font:italic 800 12px/1.25 'Barlow Condensed',sans-serif;letter-spacing:.26em;color:var(--cc);
  background:linear-gradient(90deg,rgba(255,255,255,.25),transparent) no-repeat 64px 55%/calc(100% - 64px) 1px}
.fl-q.tf .fl-qtext::after{content:'”';position:absolute;right:12px;top:-2px;font:400 64px/1 'Lilita One',sans-serif;color:rgba(255,255,255,.07);transition:opacity .2s}
.fl-q.tf .fl-qbody{margin-bottom:30px}
/* hüküm: kart dönüşür */
.fl-q.tfy{--vg:linear-gradient(160deg,#4fe07e,#129a45);--vk:#129a45}
.fl-q.tfn{--vg:linear-gradient(200deg,#ff6f5a,#b8261a);--vk:#c42a1a}
.fl-q.tf .fl-tfx{position:absolute;inset:0;z-index:-1;overflow:hidden;background:repeating-linear-gradient(115deg,rgba(255,255,255,.08) 0 10px,transparent 10px 22px),var(--vg);
  clip-path:polygon(0 0,0 0,-30px 100%,-30px 100%);animation:flTfWipe .55s .1s cubic-bezier(.75,0,.2,1) forwards}
.fl-q.tf .fl-tfx::after{content:'';position:absolute;top:0;bottom:0;left:0;width:60%;background:linear-gradient(105deg,transparent,rgba(255,255,255,.6) 50%,transparent);transform:translateX(-120%);animation:flTfGlint .6s .6s ease-out forwards}
.fl-q.tfy .fl-qtext,.fl-q.tfn .fl-qtext{border-left-color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.22);animation:flTfPunch .5s .45s cubic-bezier(.3,1.6,.5,1) both}
.fl-q.tfy .fl-qtext::before{content:'HÜKÜM · DOĞRU';color:#fff;background-image:linear-gradient(90deg,rgba(255,255,255,.6),transparent);background-position:118px 55%;background-size:calc(100% - 118px) 1px;animation:flTfFade .3s .35s both}
.fl-q.tfn .fl-qtext::before{content:'HÜKÜM · YANLIŞ';color:#fff;background-image:linear-gradient(90deg,rgba(255,255,255,.6),transparent);background-position:124px 55%;background-size:calc(100% - 124px) 1px;animation:flTfFade .3s .35s both}
.fl-q.tfy .fl-qtext::after,.fl-q.tfn .fl-qtext::after{opacity:0}
.fl-q.tf .fl-tfbig{position:absolute;right:10px;top:50%;width:40px;height:40px;margin-top:-20px;border-radius:50%;display:grid;place-items:center;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.22);
  animation:flTfBig .5s .5s cubic-bezier(.3,1.8,.5,1) both}
.fl-q.tf .fl-tfbig svg{width:26px;height:26px;fill:none;stroke:var(--vk);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
@keyframes flTfWipe{to{clip-path:polygon(0 0,calc(100% + 30px) 0,100% 100%,0 100%)}}
@keyframes flTfGlint{to{transform:translateX(220%)}}
@keyframes flTfPunch{0%,100%{transform:none}40%{transform:scale(1.03)}}
@keyframes flTfFade{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
@keyframes flTfBig{from{transform:scale(0) rotate(-50deg)}to{transform:none}}
/* hüküm levhası */
.fl-tf.vd{display:flex;gap:0;height:90px;filter:drop-shadow(0 8px 16px rgba(0,0,0,.45))}
.fl-q .fl-tf.vd .fl-opt{position:relative;flex:1;min-width:0;min-height:0;height:100%;padding:0 10px;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:10px;overflow:hidden;
  border:0;border-radius:0;color:#fff;font:italic 800 30px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.04em;text-shadow:0 3px 0 rgba(0,0,0,.25);
  box-shadow:none!important;opacity:1;transition:flex .32s cubic-bezier(.3,1.3,.5,1),filter .3s,font-size .25s}
.fl-q .fl-tf.vd .fl-yes{background:linear-gradient(160deg,#5ff08a,#16a64c)!important;clip-path:polygon(0 0,100% 0,calc(100% - 28px) 100%,0 100%);margin-right:-14px;padding-right:24px}
.fl-q .fl-tf.vd .fl-no{background:linear-gradient(200deg,#ff7a66,#c42a1a)!important;clip-path:polygon(28px 0,100% 0,100% 100%,0 100%);margin-left:-14px;padding-left:24px}
.fl-q .fl-tf.vd .fl-opt::before{content:'';position:absolute;inset:0;width:auto;height:auto;-webkit-mask:none;mask:none;pointer-events:none;
  background:repeating-linear-gradient(115deg,rgba(255,255,255,.07) 0 10px,transparent 10px 22px),linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0) 45%)}
.fl-q .fl-tf.vd .fl-opt:active{transform:translateY(2px)}
.fl-tf.vd .ic{position:relative;flex:none;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.95);box-shadow:0 3px 0 rgba(0,0,0,.2);transition:width .25s,height .25s}
.fl-tf.vd .ic svg{width:66%;height:66%;fill:none;stroke:#16a64c;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
.fl-tf.vd .fl-no .ic svg{stroke:#c42a1a}
.fl-tf.vd .fl-opt span{position:relative}
.fl-tfmid{position:relative;flex:none;width:0;z-index:2;pointer-events:none}
.fl-tfmid i{position:absolute;left:-4px;top:0;bottom:0;width:8px;background:#07080f;transform:skewX(-16deg)}
.fl-tfmid b{position:absolute;left:-6px;bottom:7px;transform:translateX(-50%) skewX(-8deg);padding:2px 7px;background:#07080f;border:2px solid #fff;font:italic 800 13px 'Barlow Condensed',sans-serif;letter-spacing:.12em;color:#ffd25a;white-space:nowrap;transition:opacity .2s}
/* seçim: seçilen yarı genişler, altın çerçeve; seçenin portresi yazının hemen yanında, altın halkalı "oy pulu" */
.fl-q .fl-tf.vd .fl-opt.pick{flex:1.3;box-shadow:inset 0 0 0 3px #ffe680!important}
.fl-q .fl-tf.vd:has(.pick) .fl-opt:not(.pick),.fl-q .fl-tf.vd .fl-opt.dim{flex:.7;font-size:22px;gap:6px;filter:saturate(.35) brightness(.6)}
.fl-q .fl-tf.vd:has(.pick) .fl-opt:not(.pick) .ic,.fl-q .fl-tf.vd .fl-opt.dim .ic{width:28px;height:28px}
.fl-q .fl-tf.vd:has(.pick) .fl-tfmid b,.fl-q.rv .fl-tfmid b{opacity:0}
.fl-q .fl-tf.vd .fl-opt.pick::after{content:'';position:relative;inset:auto;flex:none;width:34px;height:34px;margin:0 0 0 2px;transform:none;border-radius:50%;
  border:2.5px solid #fff;background:var(--me) center/cover;box-shadow:0 0 0 2.5px #ffd25a,0 3px 0 2px rgba(0,0,0,.3);animation:flPopIn .3s cubic-bezier(.3,1.8,.5,1) both}
.fl-q.rv .fl-tf.vd .fl-opt.pick::after{display:none}
/* cevap: doğru yarı parlar, öteki külleşir; cevaplayanların portreleri aynı yerde yan yana */
.fl-q .fl-tf.vd .fl-opt.right{flex:1.3;filter:none;box-shadow:inset 0 0 0 3px #fff!important}
.fl-q .fl-tf.vd .fl-opt.dim,.fl-q.locked .fl-tf.vd .fl-opt.dim{opacity:1;filter:grayscale(.85) brightness(.42)}
.fl-q .fl-tf.vd .fl-who{position:relative;inset:auto;flex:none;width:32px;height:32px;margin:0 0 0 -3px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 3px 0 rgba(0,0,0,.3);overflow:hidden;animation:flPopIn .3s cubic-bezier(.3,1.8,.5,1) both}
.fl-q .fl-tf.vd .fl-who:first-of-type{margin-left:2px}
.fl-q .fl-tf.vd .fl-opt.dim .fl-who{width:26px;height:26px;filter:grayscale(0)}
.fl-q.locked .fl-tf.vd .fl-opt{opacity:1}
`;
