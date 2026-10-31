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
.fl-ui.qon .fl-pbtn{top:calc(var(--sat) + 116px);width:36px;height:36px}

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

/* ---------------------------------------------------------------- düello afişi */
.fl-q:not(.map) .fl-qwho{margin:0;height:auto;align-items:stretch;justify-content:stretch;gap:0;pointer-events:none;filter:drop-shadow(0 8px 18px rgba(0,0,0,.55))}
.fl-qwho.duel{height:calc(100px + var(--sat));border:0;border-radius:0;background:none;box-shadow:none}
.fl-qwho.duel .fl-qp{flex:1 1 0;min-width:0;max-width:none;gap:11px;padding:var(--sat) 66px 0 14px;border:0;border-radius:0;box-shadow:none;
  background:linear-gradient(100deg,var(--pc),color-mix(in srgb,var(--pc) 62%,#000));clip-path:polygon(0 0,100% 0,82% 100%,0 100%)}
.fl-qwho.duel .fl-qp.d{flex-direction:row-reverse;padding:var(--sat) 14px 0 66px;background:linear-gradient(260deg,var(--pc),color-mix(in srgb,var(--pc) 62%,#000));clip-path:polygon(18% 0,100% 0,100% 100%,0 100%);text-align:right}
.fl-qwho.duel .fl-qp::after{display:none}
.fl-qwho.duel .fl-qp+.fl-qvs+.fl-qp{margin-left:-14%}
.fl-qwho.duel .fl-qp .fl-av{width:54px;height:54px;border-radius:12px;border:3px solid #fff;box-shadow:0 4px 0 rgba(0,0,0,.35);transform:skewX(-6deg)}
.fl-qwho.duel .fl-qp .nm small{order:-1;margin:0 0 1px;font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:800;font-size:11px;letter-spacing:.22em;color:rgba(255,255,255,.9)}
.fl-qwho.duel .fl-qp .nm{display:flex;flex-direction:column}
.fl-qwho.duel .fl-qp.d .nm{align-items:flex-end}
.fl-qwho.duel .fl-qp .nm b{font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:30px;line-height:.95;text-transform:uppercase;text-shadow:0 2px 0 rgba(0,0,0,.3)}
.fl-qp .sc{display:block;font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:16px;line-height:1.05;color:#ffe680;text-shadow:0 1px 0 rgba(0,0,0,.4)}
.fl-qwho.duel .fl-qvs{position:absolute;left:50%;top:calc(var(--sat) + 26px);z-index:3;width:auto;height:auto;margin:0;border-radius:0;transform:translateX(-50%) skewX(-8deg);
  padding:3px 11px;background:#0a0b14;border:2.5px solid #fff;box-shadow:0 6px 20px rgba(0,0,0,.6)}
.fl-qwho.duel .fl-qvs b{font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:30px;line-height:1;letter-spacing:.04em;color:#ffd25a;text-shadow:none}
.fl-qwho.duel .fl-qvs span{top:calc(100% + 34px);bottom:auto;max-width:150px;padding:3px 13px;border:0;border-radius:0;transform:translateX(-50%) skewX(8deg);
  background:#ffd25a;color:#1a1200;box-shadow:none;font-family:'Barlow Condensed',sans-serif;font-style:normal;font-weight:800;font-size:11.5px;letter-spacing:.26em;text-transform:uppercase;clip-path:polygon(6% 0,100% 0,94% 100%,0 100%)}
/* cevapladı: köşede yeşil etiket; cevap açılınca süre ya da çarpı */
.fl-qwho.duel .fl-qp .st{left:52px;top:calc(var(--sat) + 62px);width:20px;height:20px;font-size:12px;border:2px solid #fff;background:#16c060}
.fl-qwho.duel .fl-qp.d .st{left:auto;right:52px}
.fl-qwho.duel .fl-qp.no .st{background:#ff3a2a}
.fl-qwho.duel .fl-qp .tt{left:auto;right:76px;top:auto;bottom:10px;font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:800;font-size:14px;color:#fff;background:rgba(0,0,0,.35);padding:1px 6px;border-radius:0}
.fl-qwho.duel .fl-qp.d .tt{right:auto;left:76px}
.fl-q.rv .fl-qwho.duel .fl-qp .nm small{visibility:visible}
.fl-qwho.duel .fl-qp.win .fl-av{box-shadow:0 0 0 3px var(--gold),0 0 18px rgba(255,210,90,.8)}
.fl-qwho.duel .fl-qp.win::before{left:30px;top:calc(var(--sat) + 4px)}
.fl-qwho.duel .fl-qp.d.win::before{left:auto;right:30px}

/* ---------------------------------------------------------------- çok oyunculu afiş (yayılma, altın soru): eğik dilimler */
.fl-q:not(.map) .fl-qwho:not(.duel){height:calc(94px + var(--sat));gap:0}
.fl-q:not(.map) .fl-qwho:not(.duel) .fl-qp{flex:1 1 0;min-width:0;flex-direction:column;justify-content:center;gap:3px;padding:calc(var(--sat) + 8px) 4px 0;border:0;border-left:5px solid #0a0b14;border-radius:0;box-shadow:none;
  background:linear-gradient(180deg,var(--pc),color-mix(in srgb,var(--pc) 62%,#000));text-align:center}
.fl-q:not(.map) .fl-qwho:not(.duel) .fl-qp:first-child{border-left:0}
.fl-q:not(.map) .fl-qwho:not(.duel) .fl-qp .fl-av{width:40px;height:40px;border-radius:10px;border:2.5px solid #fff;box-shadow:0 3px 0 rgba(0,0,0,.35)}
.fl-q:not(.map) .fl-qwho:not(.duel) .fl-qp .nm b{font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:17px;line-height:1;text-transform:uppercase}
.fl-q:not(.map) .fl-qwho:not(.duel) .fl-qp .sc{font-size:13px}
.fl-q:not(.map) .fl-qwho:not(.duel) .fl-qp .st{left:auto;right:10px;top:calc(var(--sat) + 8px);width:18px;height:18px;font-size:11px;border:2px solid #fff;background:#16c060}
.fl-q:not(.map) .fl-qwho:not(.duel) .fl-qp.no .st{background:#ff3a2a}
.fl-q:not(.map) .fl-qwho:not(.duel) .fl-qp .tt{left:50%;right:auto;top:auto;bottom:-20px;transform:translateX(-50%);font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:800;font-size:12px;color:#fff;background:#0a0b14;padding:1px 6px;border-radius:0}
.fl-q:not(.map) .fl-qwho:not(.duel)::after{content:attr(data-lb);position:absolute;left:50%;top:calc(var(--sat) + 98px);transform:translateX(-50%);white-space:nowrap;padding:3px 14px;background:#ffd25a;color:#1a1200;
  font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:11.5px;letter-spacing:.24em;clip-path:polygon(5% 0,100% 0,95% 100%,0 100%)}

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
`;
