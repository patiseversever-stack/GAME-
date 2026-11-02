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
.fl-q:not(.map) .fl-qwho .fl-qp .fl-av{grid-area:av;align-self:center;width:var(--av,10cqw);height:var(--av,10cqw);border-radius:22%;border-width:.5cqw}
.fl-q:not(.map) .fl-qwho .fl-qp .nm small{grid-area:sb;align-self:end;margin:0;font-size:2.6cqw;letter-spacing:.2em;line-height:1}
.fl-q:not(.map) .fl-qwho .fl-qp .nm b,.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp .nm b{grid-area:nm;position:relative;z-index:1;min-width:0;justify-self:stretch;
  font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:900;font-size:var(--nf,5.8cqw);line-height:1;letter-spacing:.01em;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:clip;padding-right:.6cqw;box-sizing:border-box;
  text-shadow:0 .5cqw 0 rgba(0,0,0,.45),0 0 1px rgba(0,0,0,.8);-webkit-text-stroke:.15cqw rgba(0,0,0,.25);paint-order:stroke fill}
.fl-q:not(.map) .fl-qwho .fl-qp .sc,.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp .sc{grid-area:sc;align-self:start;position:relative;z-index:1;display:inline-block;padding:.3cqw 1.4cqw .1cqw;border-radius:1cqw;
  background:rgba(6,7,13,.6);box-shadow:inset 0 0 0 1px rgba(255,230,128,.35);font-family:'Lilita One',sans-serif;font-style:normal;font-weight:400;font-size:var(--sf,4.6cqw);line-height:1.15;letter-spacing:.02em;color:#ffe680;text-shadow:none}
.fl-q:not(.map) .fl-qwho .fl-qp:not(:has(small)) .sc{align-self:center}
/* başlıksız dilimler (yayılma, 3/4'lü): puan resmin tam ortasında (boş başlık satırı yok) */
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp:not(:has(small)),.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp:has(+ .vx):not(:has(small)),.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .vx + .fl-qp:not(:has(small)){grid-template-rows:auto auto;grid-template-areas:"av sc" "nm nm"}
.fl-q:not(.map) .fl-qwho[style*="--n:2"]:not(.duel):not(.teams) .vx + .fl-qp:not(:has(small)){grid-template-rows:auto auto;grid-template-areas:"sc av" "nm nm"}
.fl-q:not(.map) .fl-qwho:not(.duel):not(.teams) .fl-qp:not(:has(small)) .sc{align-self:center}
/* düello: saldıran solda, savunan aynalı; isim eğik dikişe kadar */
.fl-q:not(.map) .fl-qwho.duel .fl-qp{--pr:9cqw}
.fl-q:not(.map) .fl-qwho.duel .fl-qp.d,.fl-q:not(.map) .fl-qwho[style*="--n:2"]:not(.duel):not(.teams) .vx + .fl-qp{--pl:calc(12% + 7cqw);--pr:3cqw;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"sb av" "sc av" "nm nm";justify-items:end;text-align:right}
.fl-q:not(.map) .fl-qwho[style*="--n:2"]:not(.duel):not(.teams) .vx + .fl-qp{--pl:7cqw}
.fl-q:not(.map) .fl-qwho[style*="--n:2"]:not(.duel):not(.teams) .fl-qp:has(+ .vx){--pr:7cqw}
/* 3'lü ve 4'lü */
.fl-q:not(.map) .fl-qwho[style*="--n:3"]:not(.duel):not(.teams) .fl-qp{--av:8.4cqw;--nf:4.5cqw;--sf:3.9cqw;--pl:4.4cqw;--pr:3.6cqw}
.fl-q:not(.map) .fl-qwho[style*="--n:3"]:not(.duel):not(.teams) .fl-qp:first-of-type{--pl:2.4cqw}
.fl-q:not(.map) .fl-qwho[style*="--n:4"]:not(.duel):not(.teams) .fl-qp{--av:7.6cqw;--nf:3.75cqw;--sf:3.2cqw;--pl:3.6cqw;--pr:2.4cqw}
.fl-q:not(.map) .fl-qwho[style*="--n:4"]:not(.duel):not(.teams) .fl-qp:first-of-type{--pl:2cqw}
.fl-q:not(.map) .fl-qwho[style*="--n:4"]:not(.duel):not(.teams) .vx{display:none}
/* 4'lü: dikey kart: resim üstte ortada, altında isim, altında puan */
.fl-q:not(.map) .fl-qwho[style*="--n:4"]:not(.duel):not(.teams) .fl-qp,.fl-q:not(.map) .fl-qwho[style*="--n:4"]:not(.duel):not(.teams) .fl-qp:not(:has(small)){
  --av:8.6cqw;--nf:3.9cqw;--sf:3.4cqw;--pl:3.8cqw;--pr:3.2cqw;grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto auto;grid-template-areas:"av" "nm" "sc";justify-items:center;row-gap:.7cqw;text-align:center}
.fl-q:not(.map) .fl-qwho[style*="--n:4"]:not(.duel):not(.teams) .fl-qp:first-of-type{--pl:2.4cqw}
.fl-q:not(.map) .fl-qwho[style*="--n:4"]:not(.duel):not(.teams) .fl-qp:last-of-type{--pr:2.4cqw}
.fl-q:not(.map) .fl-qwho[style*="--n:4"]:not(.duel):not(.teams) .fl-qp .nm b{text-align:center;padding:0 .3cqw}
.fl-q:not(.map) .fl-qwho[style*="--n:4"]:not(.duel):not(.teams) .fl-qp .sc,.fl-q:not(.map) .fl-qwho[style*="--n:4"]:not(.duel):not(.teams) .fl-qp:not(:has(small)) .sc{align-self:center;justify-self:center}
.fl-q:not(.map) .fl-qwho[style*="--n:4"]:not(.duel):not(.teams) .fl-qp .st{justify-self:center;margin:0 -9.4cqw -1cqw 0}
/* sıra rozetleri yok */
.fl-q:not(.map) .fl-qwho .fl-qp .rk,.fl-q:not(.map) .fl-qwho:is([style*="--n:3"],[style*="--n:4"]):not(.duel):not(.teams) .fl-qp .rk{display:none}
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
/* VS rozeti v2: altın degrade çerçeve, koyu iç, parlayan altın yazı; birleşim dikişinin alt ucunda ortalı */
.fl-q:not(.map) .fl-qwho .fl-qvs,.fl-q:not(.map) .fl-qwho .vx::before{border:.55cqw solid transparent;border-radius:1.4cqw;
  background:linear-gradient(180deg,#2b3150,#0b0d18) padding-box,linear-gradient(135deg,#fff4b8,#ffc23a 40%,#b8730a 75%,#ffe27a) border-box;
  box-shadow:0 .8cqw 2cqw rgba(0,0,0,.65),0 0 0 .35cqw rgba(6,7,13,.85),0 0 2.4cqw rgba(255,190,40,.35)}
.fl-q:not(.map) .fl-qwho .fl-qvs b,.fl-q:not(.map) .fl-qwho .vx::before{color:#ffe27a;text-shadow:0 0 1.6cqw rgba(255,190,40,.75),0 .3cqw 0 rgba(0,0,0,.6);letter-spacing:.06em}
.fl-q:not(.map) .fl-qwho .fl-qvs{padding:.1cqw 2.4cqw .3cqw}
.fl-q:not(.map) .fl-qwho .vx::before{left:-3cqw;padding:.1cqw 1.8cqw .3cqw;font-size:4.6cqw;line-height:1.2}
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
/* düello ve eşli: iki yarı tam eşit; dikiş tam ortadan geçer (üstte %50+4cqw, altta %50-4cqw) */
.fl-q:not(.map) .fl-qwho.duel .fl-qp,.fl-q:not(.map) .fl-tmh{flex:0 0 calc(50% + 4cqw);margin-left:0;clip-path:polygon(0 0,100% 0,calc(100% - 8cqw) 100%,0 100%)}
.fl-q:not(.map) .fl-qwho.duel .fl-qp.d,.fl-q:not(.map) .fl-tmh.d{flex:0 0 calc(50% + 4cqw);margin-left:-8cqw;clip-path:polygon(8cqw 0,100% 0,100% 100%,0 100%)}
.fl-q:not(.map) .fl-qwho.duel .fl-qp.d{--pl:12cqw}
.fl-q:not(.map) .fl-tmh.d{padding-left:12cqw}
.fl-q:not(.map) .fl-tmh .fl-qp .sc,.fl-q:not(.map) .fl-tmh .fl-qp .nm small,.fl-q:not(.map) .fl-tmh .fl-qp .rk,.fl-q:not(.map) .fl-tmh .tn b{display:none}

/* 1'e 1 (düello, yayılma): VS rozeti afişin içinde, dikişin tam ortasında; ANKARA etiketi alt kenarda */
.fl-q:not(.map) .fl-qwho.duel .fl-qvs{top:calc(var(--sat) + 11.5cqw);bottom:auto;transform:translate(-50%,-50%) skewX(-8deg)}
.fl-q:not(.map) .fl-qwho.duel .fl-qvs span{top:calc(100% + 9cqw)}
.fl-q:not(.map) .fl-qwho.duel .fl-qp{--pr:11.5cqw}
.fl-q:not(.map) .fl-qwho.duel .fl-qp.d{--pl:15.5cqw;--pr:3cqw}
.fl-q:not(.map) .fl-qwho[style*="--n:2"]:not(.duel):not(.teams) .vx::before{top:calc(50% + var(--sat) / 2);bottom:auto;left:-1.5cqw;transform:translate(-50%,-50%) skewX(-8deg)}
.fl-q:not(.map) .fl-qwho[style*="--n:2"]:not(.duel):not(.teams) .fl-qp:has(+ .vx){--pr:10cqw}
.fl-q:not(.map) .fl-qwho[style*="--n:2"]:not(.duel):not(.teams) .vx + .fl-qp{--pl:10cqw}
.fl-q:not(.map) .fl-qwho[style*="--n:2"]:not(.duel):not(.teams)::after{top:calc(var(--sat) + 25cqw)}
/* ---------------------------------------------------------------- sonuç damgası: harita alanının ortasında */
.fl-q:not(.map) .fl-stamp{top:44%;animation-name:flStampB}
.fl-q:not(.map) .fl-stamp.brief.on{animation:flStampB .45s cubic-bezier(.3,1.7,.5,1) forwards,flStampOut .4s 1.8s ease-in forwards}
@keyframes flStampOut{to{opacity:0;transform:translate(-50%,-50%) skewX(-8deg) scale(.85)}}
.fl-stamp{font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border-radius:0;
  clip-path:none;transform:translate(-50%,-50%) skewX(-8deg)}
@keyframes flStampB{0%{opacity:0;transform:translate(-50%,-50%) skewX(-8deg) scale(1.9)}60%{opacity:1;transform:translate(-50%,-50%) skewX(-8deg) scale(.96)}100%{opacity:1;transform:translate(-50%,-50%) skewX(-8deg) scale(1)}}

/* ---------------------------------------------------------------- sonuç ekranı (v1.5): kart kapanınca haritanın ortasında
   büyük sonuç ve oyuncu satırları (eğik plakalar, kazanan altın). Kartta yalnız doğru cevap kalır, hiçbir şey üst üste binmez. */
.fl-res{position:absolute;inset:0;z-index:40;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;
  padding:0 max(16px,env(safe-area-inset-right,0px)) 6% max(16px,env(safe-area-inset-left,0px));opacity:0;pointer-events:none;transition:opacity .25s;
  background:radial-gradient(ellipse at 50% 46%,rgba(3,5,12,.72) 0,rgba(3,5,12,.86) 70%)}
.fl-res.on{opacity:1;pointer-events:auto}
.fl-res .fl-stamp{position:relative;left:auto;top:auto;opacity:1;transform:skewX(-8deg);animation:rsSt .45s cubic-bezier(.3,1.7,.5,1) both}
@keyframes rsSt{0%{opacity:0;transform:skewX(-8deg) scale(1.9)}60%{opacity:1;transform:skewX(-8deg) scale(.96)}100%{opacity:1;transform:skewX(-8deg)}}
.rs-rows{width:min(100%,400px);display:flex;flex-direction:column;gap:10px}
.rs-r{display:flex;align-items:center;gap:11px;min-height:58px;padding:0 18px 0 0;color:#fff;background:#0a0b14;transform:skewX(-8deg);
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.9),0 6px 18px rgba(0,0,0,.5);animation:rsIn .38s calc(var(--k) * 90ms + .3s) cubic-bezier(.2,.9,.3,1.2) both}
.rs-r>*{transform:skewX(8deg)}
.rs-r .rk{flex:none;align-self:stretch;width:46px;display:grid;place-items:center;transform:none;background:var(--c);
  font:italic 800 28px/1 'Barlow Condensed','Lilita One',sans-serif;text-shadow:0 2px 0 rgba(0,0,0,.3);box-shadow:inset -2px 0 0 rgba(255,255,255,.9)}
.rs-r .fl-av{flex:none;width:40px;height:40px}
.rs-r b{flex:1;min-width:0;font-weight:700;font-size:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rs-r b i{display:inline-block;margin-left:8px;padding:3px 7px;vertical-align:2px;font:italic 800 12px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.06em;color:#1a1200;background:#ffd25a}
.rs-r.win b i{color:#ffd25a;background:#1a1200}
.rs-r em{flex:none;text-align:right;font:italic 800 23px/1 'Barlow Condensed','Lilita One',sans-serif}
.rs-r em small{display:block;margin-top:3px;font:600 12.5px/1 'Fredoka',sans-serif;opacity:.82}
.rs-r.win{color:#1a1200;background:linear-gradient(90deg,#ffe066,#ffbb1f);box-shadow:inset 0 0 0 2px #fff,0 0 26px rgba(255,210,90,.55),0 6px 18px rgba(0,0,0,.45)}
.rs-r.no em{color:#ff9a88}
@keyframes rsIn{0%{opacity:0;transform:skewX(-8deg) translateX(-40px)}100%{opacity:1;transform:skewX(-8deg)}}
/* takım (eşli) rozeti, insanın satırı, 4 kişide alçak satır */
.rs-r b .tm{display:inline-grid;place-items:center;width:18px;height:18px;margin-right:7px;vertical-align:2px;font:italic 800 12px/1 'Barlow Condensed','Lilita One',sans-serif;color:#fff;background:var(--tc);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.7)}
.rs-r.me:not(.win){box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55),0 6px 18px rgba(0,0,0,.45)}
.fl-res.n4 .rs-r{min-height:50px}
.fl-res.n4 .rs-rows{gap:8px}
.fl-res.n4 .rs-r .fl-av{width:34px;height:34px}
.fl-res.n4 .rs-r b{font-size:17px}

/* ---------------------------------------------------------------- SEÇİM SIRASI (v1.5e, yayılma): ince, sade, premium. Koyu
   cam satırlar (ince çizgi kenar, solda oyuncu renginde şerit), küçük numara (birinci altın + taç), ad iki satıra dek,
   il payı rakamla (+1 … +8). Kalın kontur, büyük blok ve zincir yok. */
.fl-res.sira{gap:12px;background:repeating-conic-gradient(from -4deg at 50% 16%,rgba(255,210,90,.028) 0 5deg,transparent 5deg 15deg),radial-gradient(ellipse at 50% 28%,rgba(30,22,6,.55) 0,rgba(3,5,12,.9) 60%)}
.sr-h{display:flex;flex-direction:column;align-items:center;gap:4px;animation:srH .5s cubic-bezier(.2,1.2,.4,1) both}
.sr-h small{display:flex;align-items:center;gap:9px;font:italic 700 11.5px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.3em;color:rgba(255,214,110,.85)}
.sr-h small::before,.sr-h small::after{content:'';width:28px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,210,90,.8))}
.sr-h small::after{transform:scaleX(-1)}
.sr-h h3{margin:0;transform:skewX(-8deg);font:italic 800 34px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.06em;
  background:linear-gradient(180deg,#fff3c4 0,#ffd25a 55%,#e9a21c 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
  filter:drop-shadow(0 1px 0 rgba(90,50,0,.9)) drop-shadow(0 0 14px rgba(255,190,60,.22))}
.sr-me{display:flex;align-items:baseline;gap:8px;padding:5px 12px 6px;transform:skewX(-8deg);color:#fff;background:rgba(14,18,34,.85);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),inset 2px 0 0 #8fa3d8;animation:srIn .4s .15s cubic-bezier(.2,.9,.3,1.1) both}
.sr-me>*{transform:skewX(8deg)}
.sr-me b{font:italic 800 15px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.08em}
.sr-me span{font:500 12px/1 'Fredoka',sans-serif;opacity:.75}
.sr-me.ok{box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),inset 2px 0 0 #3fe07a}.sr-me.ok b{color:#7dff9a}
.sr-me.gold{box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),inset 2px 0 0 #ffd25a}.sr-me.gold b{color:#ffd25a}
.sr-me.bad{box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),inset 2px 0 0 #ff5a48}.sr-me.bad b{color:#ff8a78}
.sr-me.warn{box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),inset 2px 0 0 #ff9a3a}.sr-me.warn b{color:#ffb070}
.sr-rows{width:min(100%,380px);display:flex;flex-direction:column;gap:6px}
.sr-r{position:relative;display:flex;align-items:center;gap:10px;min-height:54px;padding:6px 12px 6px 0;color:#f2f5fc;transform:skewX(-8deg);overflow:hidden;
  background:linear-gradient(90deg,rgba(22,27,48,.92),rgba(10,13,26,.9));box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),inset 3px 0 0 var(--c),0 6px 16px rgba(0,0,0,.35);
  animation:srIn .4s calc(var(--k) * 90ms + .3s) cubic-bezier(.2,.9,.3,1.05) both}
.sr-r>*{transform:skewX(8deg)}
.sr-r.me{box-shadow:inset 0 0 0 1px rgba(255,255,255,.42),inset 3px 0 0 var(--c),0 6px 16px rgba(0,0,0,.35)}
.sr-r.win{background:linear-gradient(90deg,rgba(255,200,70,.16),rgba(22,20,14,.92) 55%,rgba(10,13,26,.9));box-shadow:inset 0 0 0 1px rgba(255,210,90,.6),inset 3px 0 0 var(--c),0 0 18px rgba(255,190,60,.16),0 6px 16px rgba(0,0,0,.35)}
.sr-r.win.me{box-shadow:inset 0 0 0 1px rgba(255,210,90,.75),inset 3px 0 0 var(--c),0 0 18px rgba(255,190,60,.2),0 6px 16px rgba(0,0,0,.35)}
.sr-r.win::after{content:'';position:absolute;inset:0;pointer-events:none;transform:translateX(-110%);background:linear-gradient(100deg,transparent 35%,rgba(255,236,170,.16) 50%,transparent 65%);animation:srShine 1s 1s ease-out both}
.sr-n{position:relative;flex:none;width:34px;padding-left:6px;text-align:center;font:italic 800 21px/1 'Barlow Condensed','Lilita One',sans-serif;color:rgba(255,255,255,.5)}
.sr-r.win .sr-n{color:#ffd25a}
.sr-cr{position:absolute;left:50%;top:-12px;width:14px;height:14px;margin-left:-4px;animation:srCr .45s 1s cubic-bezier(.3,1.8,.5,1) both}
.sr-r .fl-av{flex:none;width:36px;height:36px;box-shadow:0 0 0 1.5px var(--c)}
.sr-who{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.sr-who b{display:flex;align-items:center;gap:6px;min-width:0;font:600 15.5px/1.12 'Fredoka',sans-serif}
.sr-who b .nm{min-width:0;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:break-word}
.sr-who b .tm{flex:none;display:inline-grid;place-items:center;width:15px;height:15px;font:italic 800 10px/1 'Barlow Condensed','Lilita One',sans-serif;color:#fff;background:var(--tc)}
.sr-av{position:relative;flex:none;display:flex}
.sr-av em{position:absolute;left:50%;bottom:-5px;transform:translateX(-50%);padding:1px 4px;font:italic 800 8.5px/1.15 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.1em;font-style:normal;color:#0b0e1a;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.5)}
.sr-who small{display:flex;align-items:center;gap:5px;min-width:0;white-space:nowrap;font:600 12px/1 'Fredoka',sans-serif;color:rgba(232,238,252,.62)}
.sr-who small span{flex:none;font:italic 700 13.5px/1 'Barlow Condensed','Lilita One',sans-serif;color:rgba(242,245,252,.9)}
.sr-who small u{min-width:0;overflow:hidden;text-overflow:ellipsis;text-decoration:none}
.sr-who small i{flex:none;display:grid;place-items:center;width:13px;height:13px;border-radius:50%}
.sr-who small i svg{width:8px;height:8px}
.sr-who small i.ok{background:#2fbf5a}.sr-who small i.no{background:#d9483a}
.sr-pk{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:3px;min-width:44px}
.sr-pk b{display:flex;align-items:center;gap:4px;font:italic 800 24px/1 'Barlow Condensed','Lilita One',sans-serif;color:#ffd25a;animation:srPk .4s calc(var(--k) * 90ms + .7s) cubic-bezier(.3,1.7,.5,1) both}
.sr-pk b svg{width:13px;height:15px}
.sr-pk small{font:italic 700 9.5px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.2em;color:rgba(255,214,110,.7)}
.sr-r.z .sr-pk b{color:rgba(255,255,255,.3);font-size:20px}
.sr-r.z .sr-pk small{color:rgba(255,255,255,.3)}
.sr-r.z .sr-av,.sr-r.z .sr-who{opacity:.72}
.fl-res.sira.n4 .sr-r{min-height:50px}
@keyframes srH{0%{opacity:0;transform:translateY(-10px) scale(1.08)}100%{opacity:1;transform:none}}
@keyframes srIn{0%{opacity:0;transform:skewX(-8deg) translateX(-28px)}100%{opacity:1;transform:skewX(-8deg)}}
@keyframes srPk{0%{opacity:0;transform:scale(.4)}100%{opacity:1;transform:none}}
@keyframes srCr{0%{opacity:0;transform:translateY(-8px) scale(.5)}100%{opacity:1;transform:none}}
@keyframes srShine{0%{transform:translateX(-110%)}100%{transform:translateX(110%)}}
/* dar telefon (320–340 px) */
@media (max-width:340px){.sr-h h3{font-size:30px}.sr-r{gap:8px;padding-right:9px}.sr-n{width:28px;font-size:18px}.sr-r .fl-av{width:32px;height:32px}.sr-who b{font-size:14.5px}.sr-pk{min-width:38px}.sr-pk b{font-size:21px}.sr-who small{flex-wrap:wrap;row-gap:3px}.sr-who small u{overflow:visible}}
@media (prefers-reduced-motion:reduce){.sr-h,.sr-me,.sr-r,.sr-pk b,.sr-cr{animation:none}.sr-r.win::after{display:none}}
@media (orientation:landscape) and (max-height:520px){.fl-res{gap:12px;padding-bottom:0}.rs-r{min-height:46px}.rs-rows{gap:7px}.fl-res.sira{gap:7px}.sr-h h3{font-size:26px}.sr-r{min-height:44px}.sr-rows{gap:5px}}

/* ---------------------------------------------------------------- sırala (v1.5c): krem, ince, premium. Krem kart satırlar
   (lacivert yazı, ince altın kenar, alçak gölge), küçük altın eğik numaralar, ince uç etiketleri; seçili altın çerçeve,
   doğru/yanlış açık yeşil/kırmızı zemin ve kenar şeridi. Satır 44 px, ONAYLA alçak: haritaya yer kalır. */
.fl-q .fl-ord{--row:clamp(42px,calc(5 * var(--vh)),48px);--rail:32px;gap:6px}
.fl-q .fl-ord-end{min-height:20px}
.fl-q .fl-ord-end>b{height:20px;margin-left:2px;padding:0 8px 0 4px;gap:5px;border:0;border-radius:0;transform:skewX(-8deg);color:#ffd25a;background:rgba(255,210,90,.08);
  box-shadow:inset 0 0 0 1px rgba(255,210,90,.5);font:italic 800 12px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.1em}
.fl-q .fl-ord-end>b i{width:11px;height:11px;border-radius:0;font-size:7px;color:#0a0b14;background:#ffd25a}
.fl-q .fl-ord-end.bot>b{color:#a9c6ff;background:rgba(140,180,255,.08);box-shadow:inset 0 0 0 1px rgba(160,195,255,.5)}
.fl-q .fl-ord-end.bot>b i{background:#a9c6ff}
.fl-q .fl-ord-hint{font-size:11px;opacity:.65}
.fl-q .fl-ord-rail::before{width:2px;margin-left:-1px;clip-path:none;background:linear-gradient(180deg,rgba(255,210,90,.1),rgba(255,210,90,.75))}
.fl-q .fl-ord.desc .fl-ord-rail::before{clip-path:none;background:linear-gradient(0deg,rgba(255,210,90,.1),rgba(255,210,90,.75))}
.fl-q .fl-ord-rail b{width:22px;height:22px;margin-left:-11px;border:0;border-radius:0;transform:skewX(-8deg);color:#1a1200;background:linear-gradient(180deg,#ffe066,#f5b324);
  box-shadow:0 2px 0 #8a5a00;font:italic 800 15px/1 'Barlow Condensed','Lilita One',sans-serif}
.fl-q .fl-ord-rail b.hot{transform:skewX(-8deg) scale(1.15)}
.fl-q .fl-ord-row{padding:0 10px 0 14px;gap:8px;border:0;border-radius:9px;clip-path:none;transform-origin:center;color:#1c2442;
  background:linear-gradient(180deg,#fffaf0,#efe5cf);box-shadow:inset 0 0 0 1px rgba(176,140,70,.45),inset 0 1px 0 #fff,0 3px 0 #9c8a66,0 6px 12px rgba(0,0,0,.28)}
.fl-q .fl-ord-row span{font-family:'Fredoka',sans-serif;font-weight:600;font-size:clamp(14.5px,calc(3.9 * var(--vw)),16px);line-height:1.12}
.fl-q .fl-ord-row .fl-grip{width:14px;height:20px;opacity:.6;background:radial-gradient(circle,#a8946c 1.5px,transparent 2px) 1px 1px/6.5px 6.5px}
.fl-q .fl-ord-row.drag{background:linear-gradient(180deg,#fffdf6,#f7ecd2);box-shadow:inset 0 0 0 2px #e8a917,0 0 0 3px rgba(255,210,90,.35),0 14px 22px rgba(0,0,0,.45)}
.fl-q .fl-ord-row.sel{background:linear-gradient(180deg,#fff8dc,#fbe6a6);box-shadow:inset 0 0 0 2px #e8a917,0 3px 0 #a8770c,0 0 14px rgba(255,210,90,.4);animation:none}
.fl-q .fl-ord-row.ok,.fl-q .fl-ord-row.fin{color:#123a1e;background:linear-gradient(180deg,#f1fbef,#cdeecf);box-shadow:inset 0 0 0 1px rgba(47,168,74,.55),inset 4px 0 0 #2fa84a,0 3px 0 #5f9a68;text-shadow:none}
.fl-q .fl-ord-row.bad{color:#4a1410;background:linear-gradient(180deg,#fdf0ee,#f5cfc9);box-shadow:inset 0 0 0 1px rgba(213,59,44,.55),inset 4px 0 0 #d53b2c,0 3px 0 #a3655d;text-shadow:none}
.fl-q .fl-ord-row em{padding:2px 7px;border-radius:0;color:#ffd25a;background:#1c2442;transform:skewX(-8deg) scale(.6);font:italic 800 14px/1.05 'Barlow Condensed','Lilita One',sans-serif}
.fl-q .fl-ord-row.ok em,.fl-q .fl-ord-row.bad em,.fl-q .fl-ord-row.fin em{transform:skewX(-8deg)}

/* ---------------------------------------------------------------- onay düğmesi (soru kartında): alçak, harita görünür kalır */
.fl-q .fl-send{padding:7px 14px 8px;border-radius:12px;border-width:2px;font-size:18px;box-shadow:0 4px 0 #a0620a,0 6px 10px rgba(0,0,0,.25)}
.fl-q .fl-send:active{transform:translateY(3px);box-shadow:0 1px 0 #a0620a}

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

/* ---------------------------------------------------------------- atasözü: renkli çini kartı (ref/tasarim-v14-atasozu-*.jpg)
   "Atasözünü tamamla." satırı kartın başlığına taşınır; kart mor→eflatun, üstünde soluk sekiz köşeli çini yıldızları;
   boşluk altın hap (nabız gibi parlar) → seçince beyaz → cevapta yeşil/kırmızı. */
.fl-q:not(.map):has(.fl-prv) .fl-qtext{display:none}
.fl-q .fl-prv{position:relative;overflow:hidden;margin:2px 0 14px;padding:12px 16px 18px;border:0;border-radius:0;color:#fff;text-align:center;
  font-family:'Fredoka',sans-serif;font-weight:700;font-size:23px;line-height:1.5;text-shadow:0 2px 0 rgba(40,0,60,.35);text-wrap:balance;
  clip-path:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px);
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='46' height='46' viewBox='0 0 46 46'%3E%3Cg fill='none' stroke='%23ffd25a' stroke-opacity='.075' stroke-width='1.4'%3E%3Crect x='14' y='14' width='18' height='18'/%3E%3Crect x='14' y='14' width='18' height='18' transform='rotate(45 23 23)'/%3E%3C/g%3E%3C/svg%3E") center/46px 46px,
    radial-gradient(70% 110% at 100% 0%,rgba(226,58,140,.42),transparent 62%),radial-gradient(70% 120% at 0% 100%,rgba(84,62,240,.45),transparent 62%),
    linear-gradient(160deg,#1c1640,#120e28 55%,#1a0e28);
  box-shadow:inset 0 0 0 1.5px rgba(190,150,255,.28);transition:box-shadow .3s}
.fl-q .fl-prv::after{content:'';position:absolute;left:14px;right:0;top:0;height:3px;background:linear-gradient(90deg,#6a4bff,#d6337f 55%,#ffd25a)}
.fl-q .fl-prv::before{content:'❝  ATASÖZÜNÜ TAMAMLA  ❞';display:block;margin:0 0 6px;font:italic 800 13px/1.2 'Barlow Condensed',sans-serif;letter-spacing:.24em;color:#ffd25a;opacity:1;text-shadow:0 1px 0 rgba(0,0,0,.3);
  background:linear-gradient(90deg,transparent,rgba(255,210,90,.6)) no-repeat 0 55%/14% 1px,linear-gradient(90deg,rgba(255,210,90,.6),transparent) no-repeat 100% 55%/14% 1px}
.fl-q .fl-prv:has(.fl-blank.right){box-shadow:inset 0 0 0 3px #5ff08a,inset 0 0 30px rgba(95,240,138,.35)}
.fl-q .fl-blank{min-width:3.6em;padding:0 12px;margin:0 3px;border:0;border-radius:10px;background:linear-gradient(180deg,#ffe680,#ffbb1f);color:#3a1a00;text-shadow:none;
  font-family:'Lilita One',sans-serif;line-height:1.3;box-shadow:0 3px 0 #b06a00,0 0 0 2px rgba(255,255,255,.55);position:relative}
.fl-q .fl-blank::after{content:'';position:absolute;inset:-2px;border-radius:12px;box-shadow:0 0 0 2px rgba(255,255,255,.9),0 0 18px rgba(255,210,90,.9);pointer-events:none;opacity:0;will-change:opacity;animation:flPrvGlow 1.1s ease-in-out infinite alternate}
.fl-q .fl-blank:is(.set,.right,.wrong)::after{animation:none;opacity:0}
.fl-q .fl-blank.set{background:#fff;color:#4b1fb0;box-shadow:0 3px 0 #b9a8e8,0 0 0 2px #ffd25a;animation:flPrvPop .35s cubic-bezier(.3,1.8,.5,1)}
.fl-q .fl-blank.right{background:linear-gradient(180deg,#5ff08a,#16a64c);color:#fff;text-shadow:0 2px 0 rgba(0,60,20,.35);box-shadow:0 3px 0 #0b6a2a,0 0 0 2px #fff,0 0 18px rgba(95,240,138,.8);animation:flPrvPop .45s cubic-bezier(.3,1.8,.5,1)}
.fl-q .fl-blank.wrong{background:linear-gradient(180deg,#ff7a66,#c42a1a);color:#fff;text-shadow:0 2px 0 rgba(80,0,0,.35);box-shadow:0 3px 0 #7a120a,0 0 0 2px #fff;animation:flPrvShake .4s ease-in-out}
@keyframes flPrvGlow{to{opacity:1}}
@keyframes flPrvPop{0%{transform:scale(.7)}100%{transform:none}}
@keyframes flPrvShake{0%,100%{transform:none}25%{transform:translateX(-6px) rotate(-3deg)}75%{transform:translateX(6px) rotate(3deg)}}
.fl-q:not(.map):has(.fl-prv) .fl-qbody{margin-bottom:22px}

/* ---------------------------------------------------------------- maç HUD'u (soru dışı üst şerit): afiş dilinde, daha ince
   Tam genişlik eğik renkli dilimler; resim + kalın isim (12 harf, tek satır) + koyu hapta puan + kale burçları.
   4'lü: resim üstte ortada, altında isim, puan ve burçlar. */
.fl-hud{container-type:inline-size;top:var(--sat);left:50%;width:min(calc(100 * var(--vw)),560px);gap:0;justify-content:stretch;filter:drop-shadow(0 5px 12px rgba(0,0,0,.5))}
.fl-hud.off{transform:translate(-50%,-110%)}
.fl-hud .fl-pl{--pl:3cqw;--pr:3cqw;--av:9cqw;flex:1 1 0;max-width:none;min-width:0;display:grid;grid-template-columns:auto auto minmax(0,1fr);grid-template-areas:"av nm nm" "av sc cs";
  align-content:center;align-items:center;justify-items:start;column-gap:1.8cqw;row-gap:.6cqw;height:calc(16cqw + var(--sat) * 0);padding:0 var(--pr) 0 var(--pl);margin-left:-2.7cqw;border:0;border-radius:0;
  background:radial-gradient(70% 130% at 12% 20%,rgba(255,255,255,.16),rgba(255,255,255,0) 60%),linear-gradient(165deg,var(--pc),color-mix(in srgb,var(--pc) 58%,#000));
  clip-path:polygon(3.4cqw 0,100% 0,calc(100% - 3.4cqw) 100%,0 100%);box-shadow:none;transform:none}
.fl-hud .fl-pl:first-child{margin-left:0;--pl:2.4cqw;clip-path:polygon(0 0,100% 0,calc(100% - 3.4cqw) 100%,0 100%)}
.fl-hud .fl-pl:last-of-type{clip-path:polygon(3.4cqw 0,100% 0,100% 100%,0 100%)}
.fl-hud .fl-pl::before{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.2) 0,rgba(255,255,255,.07) 34%,rgba(255,255,255,0) 50%,rgba(0,0,0,.2) 100%);
  box-shadow:inset 0 1.5px 0 rgba(255,255,255,.4),inset 0 -3px 0 rgba(0,0,0,.28)}
.fl-hud .fl-pl .tx{display:contents}
.fl-hud .fl-pl .fl-av{grid-area:av;position:relative;z-index:1;width:var(--av);height:var(--av);border-radius:22%;border:.5cqw solid #fff;box-shadow:0 .6cqw 0 rgba(0,0,0,.3)}
.fl-hud .fl-pl .tx b{grid-area:nm;position:relative;z-index:1;justify-self:stretch;min-width:0;padding-right:.6cqw;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:clip;
  font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:900;font-size:var(--nf,4.6cqw);line-height:1;letter-spacing:.01em;text-transform:uppercase;color:#fff;
  text-shadow:0 .5cqw 0 rgba(0,0,0,.45),0 0 1px rgba(0,0,0,.8)}
.fl-hud .fl-pl .tx em{grid-area:sc;position:relative;z-index:1;padding:.2cqw 1.3cqw 0;border-radius:1cqw;background:rgba(6,7,13,.6);box-shadow:inset 0 0 0 1px rgba(255,230,128,.35);
  font-family:'Lilita One',sans-serif;font-size:var(--sf,3.8cqw);line-height:1.15;color:#ffe680;text-shadow:none}
.fl-hud .fl-pl .cs{grid-area:cs;position:relative;z-index:1;inset:auto;transform:none;flex-direction:row;gap:.6cqw;justify-self:start}
.fl-hud .fl-pl .cs i{width:3cqw;height:3.4cqw;background:#fff;filter:drop-shadow(0 .3cqw 0 rgba(0,0,0,.35))}
.fl-hud .fl-pl .cs i.off{opacity:.25}
.fl-hud .fl-pl .sd{left:calc(var(--pl) - 1.4cqw);top:1cqw;width:5cqw;height:5cqw;z-index:3}
.fl-hud .fl-pl .tm{top:.8cqw;right:calc(var(--pr) + .4cqw);z-index:3;font-size:2.6cqw;line-height:1.5;padding:0 1.2cqw;border-radius:1cqw}
.fl-hud .fl-pl .d{z-index:3;right:var(--pr);top:auto;bottom:.6cqw;font-size:4cqw}
/* sıra: dilim parlar, altın iç çerçeve, altında SIRA etiketi */
.fl-hud .fl-pl.turn{transform:none;filter:brightness(1.12)}
.fl-hud .fl-pl.turn::before{box-shadow:inset 0 -1.1cqw 0 #ffd25a,inset 0 -2.6cqw 2.4cqw -1cqw rgba(255,210,90,.55),inset 0 1.5px 0 rgba(255,255,255,.4)}
.fl-hud .fl-pl.turn::after{display:none}
.fl-hud .fl-pl.dead{opacity:.55;filter:grayscale(.6)}
/* 1'e 1: sağdaki oyuncu aynalı, resmi sağ köşede */
.fl-hud[data-n="2"] .fl-pl:last-of-type{--pl:7cqw;--pr:2.4cqw;grid-template-columns:minmax(0,1fr) auto auto;grid-template-areas:"nm nm av" "cs sc av";justify-items:end;text-align:right;
  background:radial-gradient(70% 130% at 88% 20%,rgba(255,255,255,.16),rgba(255,255,255,0) 60%),linear-gradient(195deg,var(--pc),color-mix(in srgb,var(--pc) 58%,#000))}
.fl-hud[data-n="2"] .fl-pl:last-of-type .cs{justify-self:end}
.fl-hud[data-n="2"] .fl-pl:first-child{--pr:7cqw}
.fl-hud[data-n="2"] .fl-pl:last-of-type .sd{left:auto;right:calc(var(--pr) - 1.4cqw)}
/* 3'lü ve 4'lü: dikey (resim üstte ortada, altında isim, altında puan + burçlar) */
.fl-hud:is([data-n="3"],[data-n="4"]) .fl-pl{--pl:3.6cqw;--pr:2.6cqw;grid-template-columns:auto auto;grid-template-areas:"av av" "nm nm" "sc cs";justify-items:center;justify-content:center;row-gap:.5cqw;column-gap:1cqw;height:19cqw}
.fl-hud[data-n="3"] .fl-pl{--av:8cqw;--nf:4.4cqw;--sf:3.6cqw}
.fl-hud[data-n="4"] .fl-pl{--av:7.4cqw;--nf:3.7cqw;--sf:3.2cqw}
.fl-hud:is([data-n="3"],[data-n="4"]) .fl-pl:first-child{--pl:2.2cqw}
.fl-hud:is([data-n="3"],[data-n="4"]) .fl-pl:last-of-type{--pr:2.2cqw}
.fl-hud:is([data-n="3"],[data-n="4"]) .fl-pl .tx b{text-align:center}
.fl-hud[data-n="4"] .fl-pl .cs i{width:2.4cqw;height:2.8cqw}
/* duraklat düğmesi HUD'un altında */
.fl-pbtn{top:calc(var(--sat) + 10px + min(calc(100 * var(--vw)),560px) * .2)}
.fl-ui.h34 .fl-pbtn{top:calc(var(--sat) + 10px + min(calc(100 * var(--vw)),560px) * .22)}

/* ---------------------------------------------------------------- süre rengi: ilk tasarım (parçalı çubuk, büyük italik rakam)
   (renk 100 ms adımlarla değişir; geçiş canlandırması yok: süre boyunca her karede yeniden boyama olmasın)
   üstüne kalan süreyle akan renk (ui.js timeColor → --tcol: yeşil → sarı → turuncu → kırmızı; kırmızıya erken döner). */
.fl-q:not(.map){--tcol:rgb(48,209,88)}
.fl-q:not(.map) .fl-tbar i,.fl-q.hot:not(.map) .fl-tbar i{background:var(--tcol);box-shadow:0 0 8px color-mix(in srgb,var(--tcol) 70%,transparent)}
.fl-q:not(.map) .fl-clock b{text-shadow:0 0 18px color-mix(in srgb,var(--tcol) 55%,transparent)}
.fl-q:not(.map) .fl-clock::after{color:var(--tcol)}
.fl-q.hot:not(.map) .fl-clock b{color:#ff6a55;text-shadow:0 0 18px rgba(255,80,60,.65)}

/* haritalı soru: üst şerit kartın altında kalmasın diye gizli; duraklat düğmesi sağ altta (kartın düğmeleriyle çakışmaz) */
.fl-ui.qmap .fl-hud{opacity:0;pointer-events:none}
.fl-ui.qmap .fl-pbtn{top:auto;bottom:calc(var(--sab) + 14px)}
/* ---------------------------------------------------------------- kural göstergesi (v2): üst çubuğun altında ince eğik
   şerit; soru açıkken gizli */
.fl-rule{position:absolute;left:50%;top:80px;z-index:6;display:flex;align-items:center;gap:7px;padding:4px 12px 5px;pointer-events:none;
  transform:translateX(-50%) skewX(-8deg);color:#ffd25a;background:rgba(8,10,20,.84);box-shadow:inset 0 0 0 1px rgba(255,210,90,.45),0 4px 12px rgba(0,0,0,.45);
  transition:opacity .25s;font:italic 800 15px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.08em}
.fl-rule>*{transform:skewX(8deg)}
.fl-rule .fl-i{width:15px;height:15px}
.fl-rule small{font-size:11px;letter-spacing:.14em;opacity:.75}
.fl-rule .bar{position:relative;width:86px;height:7px;background:rgba(255,255,255,.14);transform:none}
.fl-rule .bar i{position:absolute;left:0;top:0;bottom:0;background:var(--c);box-shadow:0 0 8px var(--c);transition:width .6s}
.fl-rule .bar::after{content:'';position:absolute;right:-1px;top:-3px;bottom:-3px;width:2px;background:#fff}
.fl-rule.hot{color:#ff8a78;box-shadow:inset 0 0 0 1px rgba(255,90,72,.7),0 4px 12px rgba(0,0,0,.45);animation:flRuleHot 1s ease-in-out infinite}
@keyframes flRuleHot{50%{opacity:.7}}
.fl-rule.off,.fl-ui.qon .fl-rule,.fl-ui.qmap .fl-rule,.fl-ui.paused .fl-rule{opacity:0}

/* ---------------------------------------------------------------- izleme özeti (v2): iki botun düellosu, soru kartı yok.
   Altta eğik koyu kart: başlık (DÜELLO · il), iki portre, BİLDİ/BİLEMEDİ ve süre; eşlide takım arkadaşında soru + cevap */
.fl-bd{position:absolute;left:50%;bottom:calc(18px + var(--sab));z-index:30;width:min(calc(100 * var(--vw) - 24px),420px);padding:10px 12px 12px;
  transform:translate(-50%,24px) skewX(-6deg);opacity:0;pointer-events:none;color:#f2f5fc;background:linear-gradient(180deg,rgba(14,18,34,.94),rgba(6,8,16,.96));
  box-shadow:inset 0 0 0 1px rgba(255,210,90,.4),0 10px 26px rgba(0,0,0,.5);transition:opacity .2s,transform .3s cubic-bezier(.2,.9,.3,1.1)}
.fl-bd.on{opacity:1;transform:translate(-50%,0) skewX(-6deg);pointer-events:auto}
.fl-bd>*{transform:skewX(6deg)}
.fl-bd .bd-h{display:flex;align-items:baseline;justify-content:center;gap:8px;margin-bottom:8px;font:italic 800 12px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.24em;color:#ffd25a}
.fl-bd .bd-h b{font:600 15px/1 'Fredoka',sans-serif;letter-spacing:0;color:#fff}
.fl-bd .bd-q{display:flex;flex-direction:column;gap:4px;margin:0 2px 9px;padding:7px 9px;font:600 13px/1.25 'Fredoka',sans-serif;background:rgba(255,255,255,.06);box-shadow:inset 3px 0 0 #ffd25a}
.fl-bd .bd-q b{color:#7dff9a;font-size:14px}
.fl-bd .bd-rows{display:flex;align-items:center;gap:8px}
.fl-bd .bd-rows.one{justify-content:center}
.fl-bd .vs{flex:none;font:italic 900 16px/1 'Barlow Condensed','Lilita One',sans-serif;color:#ffd25a;font-style:normal}
.fl-bd .bd-p{flex:1;min-width:0;display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto auto;column-gap:8px;align-items:center;padding:6px 8px;
  background:rgba(255,255,255,.05);box-shadow:inset 3px 0 0 var(--c)}
.fl-bd .bd-rows.one .bd-p{flex:0 1 260px}
.fl-bd .bd-p .fl-av{grid-row:1/4;width:38px;height:38px;box-shadow:0 0 0 1.5px var(--c)}
.fl-bd .bd-p b{min-width:0;font:600 14.5px/1.1 'Fredoka',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fl-bd .bd-p em{font:italic 800 14px/1.1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.06em;font-style:normal;color:#ffd25a}
.fl-bd .bd-p em.ok{color:#7dff9a}.fl-bd .bd-p em.no{color:#ff8a78}
.fl-bd .bd-p small{font:500 11px/1 'Fredoka',sans-serif;opacity:.6}
.fl-bd .bd-p.ok{background:linear-gradient(90deg,rgba(63,224,122,.16),rgba(255,255,255,.04))}
/* Atla düğmesi (botların sırası) */
.fl-skip{position:absolute;right:calc(12px + env(safe-area-inset-right,0px));top:calc(var(--sat) + 132px);z-index:31;display:flex;align-items:center;gap:6px;padding:8px 14px 9px;
  border:0;transform:skewX(-8deg);color:#1a1200;background:linear-gradient(180deg,#ffe066,#f5b324);box-shadow:0 3px 0 #8a5a00,0 8px 16px rgba(0,0,0,.4);transition:opacity .2s,transform .2s}
.fl-skip>*{transform:skewX(8deg)}
.fl-skip b{font:italic 800 16px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.12em}
.fl-skip svg{width:18px;height:18px}
.fl-skip.off{opacity:0;pointer-events:none;transform:skewX(-8deg) translateY(10px)}
/* elenme seçimi */
.fl-elim{position:absolute;inset:0;z-index:45;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;opacity:0;pointer-events:none;
  background:radial-gradient(ellipse at 50% 45%,rgba(3,5,12,.7),rgba(3,5,12,.88) 70%);transition:opacity .25s}
.fl-elim.on{opacity:1;pointer-events:auto}
.fl-elim .fl-stamp{position:relative;left:auto;top:auto;opacity:1;transform:skewX(-8deg)}
.fl-elim .el-b{display:flex;gap:12px}
.fl-elim .el-b .fl-btn{min-width:140px}
`;
