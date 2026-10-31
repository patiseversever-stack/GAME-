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
.fl-q:not(.map) .fl-qwho{position:relative;margin:0;height:calc(68px + var(--sat));align-items:stretch;justify-content:stretch;gap:0;border:0;border-radius:0;background:#06070d;box-shadow:none;
  pointer-events:none;filter:drop-shadow(0 6px 14px rgba(0,0,0,.5))}
.fl-q:not(.map) .fl-qwho .fl-qp{position:relative;flex:1 1 0;min-width:0;max-width:none;display:flex;align-items:center;gap:8px;padding:var(--sat) 12px 0;border:0;border-radius:0;box-shadow:none;
  background:linear-gradient(160deg,var(--pc),color-mix(in srgb,var(--pc) 60%,#000))}
.fl-q:not(.map) .fl-qwho .fl-qp::after{content:'';position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.2) 0 22%,rgba(255,255,255,0) 22%);opacity:1;border-radius:0;pointer-events:none}
.fl-q:not(.map) .fl-qwho .fl-qp .fl-av{width:44px;height:44px;border-radius:10px;border:2.5px solid #fff;box-shadow:0 3px 0 rgba(0,0,0,.35);transform:skewX(-6deg)}
.fl-q:not(.map) .fl-qwho .fl-qp .nm{position:relative;z-index:1;display:flex;flex-direction:column;min-width:0}
.fl-q:not(.map) .fl-qwho .fl-qp .nm small{order:-1;margin:0;font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:800;font-size:10px;letter-spacing:.2em;line-height:1.1;color:rgba(255,255,255,.92)}
.fl-q:not(.map) .fl-qwho .fl-qp .nm b{font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:23px;line-height:.95;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 2px 0 rgba(0,0,0,.3)}
.fl-q:not(.map) .fl-qp .sc{display:block;font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:14.5px;line-height:1.05;color:#ffe680;text-shadow:0 1px 0 rgba(0,0,0,.4)}
/* düello: iki eğik yarı, ortada VS, altta hedef il */
.fl-q:not(.map) .fl-qwho.duel .fl-qp{clip-path:polygon(0 0,100% 0,84% 100%,0 100%);padding-right:54px}
.fl-q:not(.map) .fl-qwho.duel .fl-qp.d{flex-direction:row-reverse;text-align:right;padding:var(--sat) 12px 0 54px;margin-left:-12%;clip-path:polygon(16% 0,100% 0,100% 100%,0 100%);background:linear-gradient(200deg,var(--pc),color-mix(in srgb,var(--pc) 60%,#000))}
.fl-q:not(.map) .fl-qwho.duel .fl-qp.d .nm{align-items:flex-end}
.fl-q:not(.map) .fl-qwho .fl-qvs{position:absolute;left:50%;top:calc(var(--sat) + 15px);z-index:3;width:auto;height:auto;margin:0;border-radius:0;transform:translateX(-50%) skewX(-8deg);
  padding:1px 8px;background:#0a0b14;border:2px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.6)}
.fl-q:not(.map) .fl-qwho .fl-qvs b{font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:21px;line-height:1.05;letter-spacing:.04em;color:#ffd25a;text-shadow:none}
.fl-q:not(.map) .fl-qwho .fl-qvs span{position:absolute;left:50%;top:calc(100% + 8px);bottom:auto;max-width:150px;padding:2px 11px;border:0;border-radius:0;transform:translateX(-50%) skewX(8deg);
  background:#ffd25a;color:#1a1200;box-shadow:none;font-family:'Barlow Condensed',sans-serif;font-style:normal;font-weight:800;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;white-space:nowrap}
/* durum: cevapladı tiki avatar köşesinde; cevapta yanlışsa kırmızı, süre adın altında */
.fl-q:not(.map) .fl-qwho .fl-qp .st{z-index:2;left:40px;top:calc(var(--sat) + 38px);width:18px;height:18px;font-size:10px;border:2px solid #fff;background:#16c060}
.fl-q:not(.map) .fl-qwho.duel .fl-qp.d .st{left:auto;right:40px}
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
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp .fl-av{width:38px;height:38px;border-radius:9px;border-width:2px}
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp .nm b{font-size:18px}
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp .sc{font-size:13px}
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp .st{left:auto;right:12px;top:calc(var(--sat) + 4px)}
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp .tt{left:14px}
.fl-q:not(.map) .fl-qwho .fl-qp .rk{position:absolute;z-index:2;left:4px;bottom:2px;font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:800;font-size:12px;color:rgba(255,255,255,.8)}
.fl-q:not(.map) .fl-qwho .vx{position:relative;z-index:3;flex:none;width:0;align-self:center;margin-top:var(--sat);font-size:0;color:transparent}
.fl-q:not(.map) .fl-qwho .vx::before{content:'VS';position:absolute;left:-4px;top:50%;transform:translate(-50%,-50%) skewX(-8deg);padding:0 5px;background:#0a0b14;border:2px solid #fff;
  font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:800;font-size:17px;line-height:1.25;color:#ffd25a;box-shadow:0 3px 10px rgba(0,0,0,.6)}
.fl-q:not(.map) .fl-qwho:not(.duel)::after{content:attr(data-lb);position:absolute;left:50%;top:calc(var(--sat) + 72px);transform:translateX(-50%);white-space:nowrap;padding:2px 12px;background:#ffd25a;color:#1a1200;
  font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:10.5px;letter-spacing:.22em;clip-path:polygon(5% 0,100% 0,95% 100%,0 100%)}
.fl-q:not(.map) .fl-qwho:not(.duel):not([data-lb])::after{display:none}
/* takımlar: düello gibi iki yarı, her yarıda iki avatar yan yana + takım adı, puanı, isimler */
.fl-q:not(.map) .fl-tmh{position:relative;flex:1 1 0;min-width:0;display:flex;align-items:center;gap:9px;padding:var(--sat) 50px 0 10px;background:linear-gradient(160deg,var(--pc),color-mix(in srgb,var(--pc) 60%,#000));clip-path:polygon(0 0,100% 0,84% 100%,0 100%)}
.fl-q:not(.map) .fl-tmh.d{flex-direction:row-reverse;text-align:right;padding:var(--sat) 10px 0 50px;margin-left:-12%;clip-path:polygon(16% 0,100% 0,100% 100%,0 100%)}
.fl-q:not(.map) .fl-tmh .avs{display:flex;gap:5px}
.fl-q:not(.map) .fl-tmh .fl-qp{flex:none!important;padding:0!important;background:none!important;clip-path:none!important}
.fl-q:not(.map) .fl-tmh .fl-qp::after{display:none}
.fl-q:not(.map) .fl-tmh .fl-qp .nm{display:none}
.fl-q:not(.map) .fl-tmh .fl-qp .fl-av{width:38px;height:38px}
.fl-q:not(.map) .fl-tmh .fl-qp .st{left:auto;right:-4px;top:auto;bottom:-4px}
.fl-q:not(.map) .fl-tmh .fl-qp .tt{left:50%!important;transform:translateX(-50%);bottom:-19px}
.fl-q:not(.map) .fl-tmh .tn{display:flex;flex-direction:column;min-width:0}
.fl-q:not(.map) .fl-tmh.d .tn{align-items:flex-end}
.fl-q:not(.map) .fl-tmh .tn small{font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:800;font-size:9.5px;letter-spacing:.14em;white-space:nowrap}
.fl-q:not(.map) .fl-tmh .tn small i{color:#ffe680}
.fl-q:not(.map) .fl-tmh .tn b{font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;font-size:15px;line-height:.95;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fl-ui.qon .fl-pbtn{top:calc(var(--sat) + 80px)}
/* ---------------------------------------------------------------- afiş v3: her ekranda aynı (ölçüler kart genişliğine
   oranlı: cqw), 12 harflik isimler kalın ve tek satır, puan koyu hap içinde (her renkte okunur), etiketler büyük.
   Yerleşim ızgara: üstte resim + (SALDIRAN/SAVUNAN) + puan, altta isim dilimin tam genişliğinde.
   Eşli: her yarıda takım etiketi + puan, altında iki satır [resim | isim]. VS: düello/ikili/eşli/3'lü alt kenarda, 4'lüde yok. */
.fl-q:not(.map){container-type:inline-size}
.fl-q:not(.map) .fl-qwho{height:calc(23cqw + var(--sat))}
/* premium ışık: keskin çapraz şerit yok; yukarıdan yumuşak ışık, resmin arkasında hafif parıltı, üstte ince ışık çizgisi, altta koyu kenar */
.fl-q:not(.map) .fl-qwho .fl-qp,.fl-q:not(.map) .fl-tmh{background:radial-gradient(70% 130% at 12% 20%,rgba(255,255,255,.16),rgba(255,255,255,0) 60%),linear-gradient(165deg,var(--pc),color-mix(in srgb,var(--pc) 58%,#000))}
.fl-q:not(.map) .fl-qwho.duel .fl-qp.d,.fl-q:not(.map) .fl-tmh.d,.fl-q:not(.map) .fl-qwho[style*="--n:2"]:not(.duel):not(.teams) .vx + .fl-qp{background:radial-gradient(70% 130% at 88% 20%,rgba(255,255,255,.16),rgba(255,255,255,0) 60%),linear-gradient(195deg,var(--pc),color-mix(in srgb,var(--pc) 58%,#000))}
.fl-q:not(.map) .fl-qwho .fl-qp::after,.fl-q:not(.map) .fl-tmh::after{content:'';position:absolute;inset:0;pointer-events:none;opacity:1;border-radius:0;
  background:linear-gradient(180deg,rgba(255,255,255,.2) 0,rgba(255,255,255,.07) 34%,rgba(255,255,255,0) 50%,rgba(0,0,0,.2) 100%);
  box-shadow:inset 0 1.5px 0 rgba(255,255,255,.4),inset 0 -3px 0 rgba(0,0,0,.28)}
.fl-q:not(.map) .fl-tmh .fl-qp::after{display:none}
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp{margin-left:-2.7cqw;clip-path:polygon(3.4cqw 0,100% 0,calc(100% - 3.4cqw) 100%,0 100%)}
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp:first-of-type{margin-left:0;clip-path:polygon(0 0,100% 0,calc(100% - 3.4cqw) 100%,0 100%)}
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp:last-of-type{clip-path:polygon(3.4cqw 0,100% 0,100% 100%,0 100%)}
.fl-q:not(.map) .fl-qwho .vx{align-self:stretch}
.fl-q:not(.map) .fl-qwho .fl-qp,.fl-q:not(.map) .fl-qwho.duel .fl-qp,.fl-q:not(.map) .fl-qwho.duel .fl-qp.d,
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp,.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp:first-of-type,
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .vx + .fl-qp,.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp:has(+ .vx){
  --pl:3cqw;--pr:3cqw;display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto auto auto;grid-template-areas:"av sb" "av sc" "nm nm";
  align-content:center;align-items:center;justify-items:start;column-gap:2cqw;row-gap:.6cqw;padding:var(--sat) var(--pr) 0 var(--pl)}
.fl-q:not(.map) .fl-qwho .fl-qp .nm{display:contents}
.fl-q:not(.map) .fl-qwho .fl-qp .fl-av{grid-area:av;align-self:center;width:var(--av,10cqw);height:var(--av,10cqw);border-radius:22%;border-width:2px}
.fl-q:not(.map) .fl-qwho .fl-qp .nm small{grid-area:sb;align-self:end;margin:0;font-size:2.6cqw;letter-spacing:.2em;line-height:1}
.fl-q:not(.map) .fl-qwho .fl-qp .nm b,.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp .nm b{grid-area:nm;position:relative;z-index:1;min-width:0;justify-self:stretch;
  font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:900;font-size:var(--nf,5.8cqw);line-height:1;letter-spacing:.01em;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:clip;padding-right:.6cqw;box-sizing:border-box;
  text-shadow:0 .5cqw 0 rgba(0,0,0,.45),0 0 1px rgba(0,0,0,.8);-webkit-text-stroke:.15cqw rgba(0,0,0,.25);paint-order:stroke fill}
.fl-q:not(.map) .fl-qwho .fl-qp .sc,.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp .sc{grid-area:sc;align-self:start;position:relative;z-index:1;display:inline-block;padding:.3cqw 1.4cqw .1cqw;border-radius:1cqw;
  background:rgba(6,7,13,.6);box-shadow:inset 0 0 0 1px rgba(255,230,128,.35);font-family:'Lilita One',sans-serif;font-style:normal;font-weight:400;font-size:var(--sf,3.6cqw);line-height:1.15;letter-spacing:.02em;color:#ffe680;text-shadow:none}
.fl-q:not(.map) .fl-qwho .fl-qp:not(:has(small)) .sc{align-self:center}
/* düello: saldıran solda, savunan aynalı; isim eğik dikişe kadar */
.fl-q:not(.map) .fl-qwho.duel .fl-qp{--pr:9cqw}
.fl-q:not(.map) .fl-qwho.duel .fl-qp.d,.fl-q:not(.map) .fl-qwho[style*="--n:2"]:not(.duel):not(.teams) .vx + .fl-qp{--pl:calc(12% + 7cqw);--pr:3cqw;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"sb av" "sc av" "nm nm";justify-items:end;text-align:right}
.fl-q:not(.map) .fl-qwho[style*="--n:2"]:not(.duel):not(.teams) .vx + .fl-qp{--pl:7cqw}
.fl-q:not(.map) .fl-qwho[style*="--n:2"]:not(.duel):not(.teams) .fl-qp:has(+ .vx){--pr:7cqw}
/* 3'lü ve 4'lü */
.fl-q:not(.map) .fl-qwho[style*="--n:3"]:not(.duel):not(.teams) .fl-qp{--av:8.4cqw;--nf:4.5cqw;--sf:3.3cqw;--pl:4.4cqw;--pr:3.6cqw}
.fl-q:not(.map) .fl-qwho[style*="--n:3"]:not(.duel):not(.teams) .fl-qp:first-of-type{--pl:2.4cqw}
.fl-q:not(.map) .fl-qwho[style*="--n:4"]:not(.duel):not(.teams) .fl-qp{--av:7.6cqw;--nf:3.75cqw;--sf:3cqw;--pl:3.6cqw;--pr:2.4cqw}
.fl-q:not(.map) .fl-qwho[style*="--n:4"]:not(.duel):not(.teams) .fl-qp:first-of-type{--pl:2cqw}
.fl-q:not(.map) .fl-qwho[style*="--n:4"]:not(.duel):not(.teams) .vx{display:none}
/* durum tiki, sıra rozeti: resmin köşesinde (ızgarada resimle aynı hücre) */
.fl-q:not(.map) .fl-qwho .fl-qp .st,.fl-q:not(.map) .fl-qwho.duel .fl-qp.d .st,.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp .st{position:relative;inset:auto;grid-area:av;align-self:end;justify-self:end;
  width:4.2cqw;height:4.2cqw;margin:0 -1.2cqw -1cqw 0;font-size:2.4cqw}
.fl-q:not(.map) .fl-qwho .fl-qp .rk,.fl-q:not(.map) .fl-qwho:is([style*="--n:3"],[style*="--n:4"]):not(.duel):not(.teams) .fl-qp .rk{position:relative;inset:auto;grid-area:av;align-self:start;justify-self:start;z-index:3;margin:-1.2cqw 0 0 -1.4cqw;
  padding:0 1cqw;border-radius:.8cqw;background:#0a0b14;box-shadow:0 0 0 1.5px rgba(255,255,255,.75);font-family:'Lilita One',sans-serif;font-style:normal;font-size:2.8cqw;line-height:1.35;color:#fff;opacity:1}
.fl-q:not(.map) .fl-qwho .fl-qp .tt{bottom:-5.4cqw;font-size:3cqw}
/* VS rozetleri ve etiketler */
.fl-q:not(.map) .fl-qwho .fl-qvs{top:auto;bottom:-4.2cqw;padding:.2cqw 2cqw}
.fl-q:not(.map) .fl-qwho .fl-qvs b{font-size:5.6cqw}
.fl-q:not(.map) .fl-qwho .fl-qvs span{top:calc(100% + 1.6cqw);max-width:60cqw;padding:.5cqw 3.2cqw;font-size:3.4cqw;letter-spacing:.2em}
.fl-q:not(.map) .fl-qwho .vx::before{top:auto;bottom:-4.4cqw;transform:translate(-50%,0) skewX(-8deg);padding:0 1.4cqw;font-size:4.4cqw}
.fl-q:not(.map) .fl-qwho:not(.duel)::after{top:calc(var(--sat) + 28.5cqw);padding:.5cqw 3.6cqw;font-size:3.4cqw;letter-spacing:.2em}
.fl-q:not(.map) .fl-qwho[style*="--n:4"]:not(.duel):not(.teams)::after{top:calc(var(--sat) + 25.5cqw)}
.fl-ui.qon .fl-pbtn{top:calc(var(--sat) + 28px + min(100vw, 560px) * .23)}
/* eşli */
.fl-q:not(.map) .fl-tmh,.fl-q:not(.map) .fl-tmh.d{display:grid;grid-template-columns:minmax(0,1fr);align-content:center;row-gap:.8cqw;padding:var(--sat) 10cqw 0 2.6cqw}
.fl-q:not(.map) .fl-tmh.d{padding:var(--sat) 2.6cqw 0 calc(12% + 9cqw);justify-items:end;text-align:right}
.fl-q:not(.map) .fl-tmh .tn{order:-1}
.fl-q:not(.map) .fl-tmh .tn small{font-size:3cqw;letter-spacing:.14em}
.fl-q:not(.map) .fl-tmh .tn small i{display:inline-block;padding:0 1.2cqw;border-radius:1cqw;background:rgba(6,7,13,.6);font-family:'Lilita One',sans-serif;font-style:normal;font-weight:400;font-size:3.4cqw;letter-spacing:.02em;color:#ffe680}
.fl-q:not(.map) .fl-tmh .avs{display:flex;flex-direction:column;gap:.8cqw;width:100%;min-width:0}
.fl-q:not(.map) .fl-tmh .fl-qp,.fl-q:not(.map) .fl-tmh .fl-qp.d{--av:6.8cqw;--nf:4.6cqw;display:grid!important;grid-template-columns:auto minmax(0,1fr);grid-template-areas:"av nm";column-gap:1.8cqw;align-items:center;width:100%;padding:0!important}
.fl-q:not(.map) .fl-tmh.d .fl-qp{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"nm av";justify-items:end}
.fl-q:not(.map) .fl-tmh .fl-qp .nm{display:contents}
.fl-q:not(.map) .fl-tmh .fl-qp .nm b{text-align:inherit;width:auto}
.fl-q:not(.map) .fl-tmh .fl-qp .st{width:3.6cqw;height:3.6cqw;margin:0 -1cqw -.8cqw 0;font-size:2cqw}
.fl-q:not(.map) .fl-tmh .fl-qp .sc,.fl-q:not(.map) .fl-tmh .fl-qp .nm small,.fl-q:not(.map) .fl-tmh .fl-qp .rk,.fl-q:not(.map) .fl-tmh .tn b{display:none}
`;
