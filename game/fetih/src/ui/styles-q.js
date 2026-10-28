// Soru kartı stilleri ve soru tiplerinin ortak sınıfları.
//
// SORU TİPLERİ İÇİN ORTAK SINIFLAR (yeni tipler bunları kullanır; kart her tipi aynı dille gösterir):
//   .fl-opts > .fl-opt            şık ızgarası (2 sütun). .fl-opts.one: tek sütun, .fl-opts.three: 3 sütun
//       .fl-opt > i               şık harfi rozeti (A B C D), .fl-opt > span: şık yazısı
//       durumlar: .pick (oyuncu seçti) .right (doğru) .wrong (yanlış) .dim (soluk) .gone (joker ile elendi)
//       .fl-who                   cevap açılınca şıkka konan oyuncu işareti (arayüz portreye çevirir)
//   .fl-tf > .fl-opt.fl-yes / .fl-no   DOĞRU / YANLIŞ iki büyük düğme
//   .fl-send                      ana onay düğmesi (GÖNDER, ONAYLA); :disabled desteklenir
//   .fl-step                      küçük adım düğmesi (−10, +1 …)
//   .fl-range                     kaydırıcı (input type=range); dolu kısım --p ile çizilir (arayüz ayarlar)
//   .fl-num-val > b + small       büyük sayı göstergesi ve birimi
//   .fl-hint                      küçük açıklama satırı
//   .fl-keys > div > .fl-key      ekran klavyesi (.hit .miss)
//   .fl-word > b                  harf kutuları (s: boşluk), .fl-word.revealed: çözüldü
//   .fl-tiles > .fl-tile          dokunulabilir harf/kelime taşları (.on .used .right .wrong)
//   .fl-list > .fl-item           sıralanabilir liste (kronoloji): .fl-item > b sıra no, .pick .right .wrong .up .down
//   .fl-cols > .fl-col > .fl-item eşleştirme sütunları (.sel .paired .right .wrong), --pc: eş rengi
//   .fl-hilo > .fl-card2          iki büyük karşılaştırma kartı (yüksek mi alçak mı), .fl-card2 > b değer
//   .fl-emoji                     büyük emoji satırı
//   .fl-media > img|svg           görsel çerçevesi (.blur .sil .zoom)
//   .fl-grid > .fl-cell           bulmaca ızgarası (.on .right .blank)
//   .fl-proverb > u               atasözü boşluğu
//   .fl-guesses > .fl-guess, .fl-num-ans  eski tahmin sonuçları (arayüz kendi sonuç panelini çizer)
//
// "En yakın kazanır" tiplerinde (kind: 'closest') sonucu arayüz çizer: doğru cevap (q.ans, q.unit),
// sayı doğrusu (q.min..q.max) ve uzaklık çubukları (results[].err). Tip isterse T.fmt(v, value, r) ile
// bir tahminin yazısını verir. Haritalı tiplerde (needsMap) uzaklık km olarak yazılır.

import { OUT, LAND } from './cssutil.js';

export const CSS_Q = /* css */ `
/* ---------------------------------------------------------------- kart */
.fl-q{position:absolute;left:50%;bottom:calc(8px + var(--sab));width:min(calc(100vw - 12px),560px);transform:translate(-50%,60px);opacity:0;visibility:hidden;pointer-events:none;
  transition:opacity .22s,transform .38s cubic-bezier(.3,1.35,.5,1),visibility 0s .38s;--cc:#4a8cff;--cd:#1d47a8}
.fl-q.on{opacity:1;transform:translate(-50%,0);visibility:visible;transition:opacity .22s,transform .38s cubic-bezier(.3,1.35,.5,1)}
.fl-q.on .fl-qc,.fl-q.on .fl-qwho{pointer-events:auto}
.fl-qc{position:relative;padding:10px 12px 12px;border-radius:24px;background:var(--panel);border:3px solid var(--gold);
  box-shadow:0 0 0 2.5px var(--gold-dd),0 8px 0 var(--navy-d),0 16px 30px rgba(0,0,0,.4)}
.fl-qc::before{content:'';position:absolute;inset:3px 3px auto;height:44px;border-radius:20px 20px 10px 10px;background:linear-gradient(180deg,var(--cc),var(--cd));opacity:.95}
.fl-qc::after{content:'';position:absolute;inset:-6px;border-radius:28px;border:4px solid #ff4a3a;opacity:0;pointer-events:none}
.fl-q.hot .fl-qc::after{animation:flHot .5s ease-in-out infinite alternate}
@keyframes flHot{from{opacity:0}to{opacity:.85}}
.fl-qhead{position:relative;display:flex;align-items:center;gap:8px;height:36px;margin:-2px 0 0}
.fl-cat{display:flex;align-items:center;gap:6px;min-width:0;padding:3px 12px 3px 3px;border-radius:999px;background:rgba(0,0,0,.28);border:2px solid rgba(255,255,255,.5)}
.fl-cat .ci{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:16px;background:#fff}
.fl-cat .ci .fl-i path:last-child{stroke:var(--cd)}
.fl-cat b{font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${OUT('rgba(0,0,0,.35)', 1)}}
.fl-type{font-family:'Lilita One';font-size:13px;letter-spacing:.1em;white-space:nowrap;padding:3px 9px;border-radius:9px;color:var(--cd);background:#fff}
.fl-rule{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;${OUT('rgba(0,0,0,.4)', 1)}}
.fl-clock{position:relative;margin-left:auto;flex:none;width:46px;height:46px;margin-top:-4px;margin-right:-4px;border-radius:50%;display:grid;place-items:center;
  background:radial-gradient(circle at 50% 35%,#2f5299,#12234a);border:3px solid #fff;box-shadow:0 3px 0 rgba(0,0,0,.4)}
.fl-clock b{font-family:'Lilita One';font-weight:400;font-size:21px;line-height:1;${OUT('#0a1534', 1.5)}}
.fl-q.hot .fl-clock{background:radial-gradient(circle at 50% 35%,#ff7a5a,#c42a1a);animation:flBeat .5s ease-in-out infinite alternate}
@keyframes flBeat{from{transform:scale(1)}to{transform:scale(1.14)}}
.fl-tbar{position:relative;height:9px;margin:8px 2px 10px;border-radius:5px;background:#0a1534;overflow:hidden;box-shadow:inset 0 2px 0 rgba(0,0,0,.4)}
.fl-tbar i{position:absolute;inset:0;border-radius:5px;background:linear-gradient(180deg,#fff0a0,#ffc23a);transform-origin:0 50%;will-change:transform}
.fl-tbar i.run{animation:flTimer var(--tt,15s) linear forwards}
.fl-q.hot .fl-tbar i{background:linear-gradient(180deg,#ffa08a,#ff3a2a)}
.fl-q.rv .fl-tbar i,.fl-q.locked .fl-tbar i{animation-play-state:paused}
@keyframes flTimer{from{transform:scaleX(1)}to{transform:scaleX(0)}}
.fl-qtext{display:flex;align-items:center;justify-content:center;min-height:62px;padding:10px 14px 11px;border-radius:16px;text-align:center;
  font-size:clamp(18px,5vw,22px);line-height:1.25;font-weight:600;color:var(--tdark);background:linear-gradient(180deg,#fffdf6,var(--cream));border:2.5px solid #fff;box-shadow:0 4px 0 var(--cream-d),inset 0 -3px 0 rgba(0,0,0,.04);text-wrap:balance}
.fl-q.on .fl-qtext{animation:flQText .45s .08s cubic-bezier(.3,1.5,.5,1) both}
@keyframes flQText{from{opacity:0;transform:scale(.85)}}
.fl-qbody{position:relative;margin-top:12px}
.fl-q.on .fl-qbody{animation:flUp2 .35s .18s ease-out both}
@keyframes flUp2{from{opacity:0;transform:translateY(14px)}}
.fl-q.locked .fl-qbody,.fl-q.spec .fl-qbody{pointer-events:none}
.fl-q.spec .fl-rule{padding:1px 8px;border-radius:8px;background:rgba(0,0,0,.35);text-shadow:none}

/* oyuncular şeridi */
.fl-qwho{position:relative;z-index:2;display:flex;align-items:flex-end;justify-content:center;gap:6px;margin:0 6px -12px;pointer-events:none}
.fl-qp{position:relative;display:flex;align-items:center;gap:6px;min-width:0;padding:3px 10px 3px 3px;border-radius:14px;background:var(--ink);border:2.5px solid var(--pc);box-shadow:0 4px 0 rgba(0,0,0,.4)}
.fl-qp .fl-av{width:34px;height:34px;border-radius:10px;border-width:2px}
.fl-qp .nm{min-width:0}
.fl-qp .nm b{display:block;font-size:13px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fl-qp .nm small{display:block;font-size:9.5px;letter-spacing:.1em;line-height:1.1;color:var(--pc2,#cfe0ff)}
.fl-qp .st{position:absolute;left:22px;top:-7px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:14px;background:#3fc45a;border:2px solid #fff;opacity:0;transform:scale(.3)}
.fl-qp.done .st{opacity:1;transform:none;transition:opacity .15s,transform .3s cubic-bezier(.3,1.8,.5,1)}
.fl-qp.no .st{background:#ff4a3a}
.fl-qp.time .st{background:#ff9a2a}
.fl-qp .tt{position:absolute;right:-6px;top:-9px;padding:0 5px;border-radius:7px;font-family:'Lilita One';font-size:11.5px;line-height:16px;background:#fff;color:var(--tdark);opacity:0}
.fl-q.rv .fl-qp .tt{opacity:1;transition:opacity .2s .2s}
.fl-qp.win{border-color:var(--gold)}
.fl-qp.win::before{content:'';position:absolute;left:8px;top:-17px;width:24px;height:18px;background:var(--gold);-webkit-mask:var(--crown) center/contain no-repeat;mask:var(--crown) center/contain no-repeat;animation:flPopIn .4s cubic-bezier(.3,1.8,.5,1) both}
.fl-qwho.duel .fl-qp{flex:1;max-width:44%;padding:4px 10px 4px 4px}
.fl-qwho.duel .fl-qp .fl-av{width:44px;height:44px;border-radius:12px}
.fl-qwho.duel .fl-qp .nm b{font-size:15px}
.fl-qwho.duel .fl-qp.d{flex-direction:row-reverse;padding:4px 4px 4px 10px;text-align:right}
.fl-qwho.duel .fl-qp.d .st{left:auto;right:22px}
.fl-qwho.duel .fl-qp.d .tt{right:auto;left:-6px}
.fl-qvs{flex:none;display:flex;flex-direction:column;align-items:center;margin-bottom:6px}
.fl-qvs b{font-family:'Lilita One';font-weight:400;font-size:26px;line-height:.9;color:var(--gold);${OUT('#5a2a00', 2.5)}}
.fl-qvs span{margin-top:3px;max-width:96px;padding:1px 7px 2px;border-radius:7px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#c42a1a;border:1.5px solid #fff}

/* sonuç damgası */
.fl-stamp{position:absolute;left:50%;top:-18px;z-index:5;transform:translate(-50%,-100%) rotate(-6deg);pointer-events:none;opacity:0;white-space:nowrap;
  font-family:'Lilita One';font-size:min(13vw,52px);letter-spacing:.02em;padding:2px 22px 6px;border-radius:18px;border:4px solid #fff;color:#fff;background:var(--sc,#2fa84a);box-shadow:0 6px 0 var(--sd,#16661f),0 12px 26px rgba(0,0,0,.4);${OUT('var(--sd,#16661f)', 2.5)}}
.fl-stamp.on{animation:flStamp .45s cubic-bezier(.3,1.7,.5,1) forwards}
.fl-stamp.bad{--sc:#e53a2a;--sd:#7a120a}
.fl-stamp.warn{--sc:#ff8a2a;--sd:#8a3a00}
.fl-stamp.gold{--sc:#f5b324;--sd:#7a4a06}
.fl-stamp small{display:block;margin-top:-4px;font-family:'Fredoka';font-weight:600;font-size:15px;letter-spacing:0;text-align:center;text-shadow:none}
@keyframes flStamp{0%{opacity:0;transform:translate(-50%,-100%) rotate(-6deg) scale(2.4)}60%{opacity:1;transform:translate(-50%,-100%) rotate(-6deg) scale(.92)}100%{opacity:1;transform:translate(-50%,-100%) rotate(-6deg) scale(1)}}

/* haritalı soru: kart üst çubuğa iner, harita tamamen dokunulabilir */
.fl-q.map{top:calc(66px + var(--sat));bottom:auto;transform:translate(-50%,-40px)}
.fl-q.map.on{transform:translate(-50%,0)}
.fl-q.map .fl-qwho{display:none}
.fl-q.map .fl-qc{padding:8px 10px 10px;border-radius:20px}
.fl-q.map .fl-qc::before{height:38px;border-radius:16px 16px 8px 8px}
.fl-q.map .fl-qhead{height:30px}
.fl-q.map .fl-clock{width:40px;height:40px}
.fl-q.map .fl-tbar{margin:6px 2px 8px;height:7px}
.fl-q.map .fl-qtext{min-height:0;padding:7px 10px 8px;font-size:clamp(16px,4.4vw,19px)}
.fl-q.map .fl-qbody{margin-top:8px}
.fl-q.map .fl-stamp{top:calc(100vh - 150px - var(--sat) - var(--sab));font-size:min(10vw,40px);animation-name:flStampB}
@keyframes flStampB{0%{opacity:0;transform:translate(-50%,-50%) rotate(-6deg) scale(2.4)}60%{opacity:1;transform:translate(-50%,-50%) rotate(-6deg) scale(.92)}100%{opacity:1;transform:translate(-50%,-50%) rotate(-6deg) scale(1)}}

/* ---------------------------------------------------------------- şıklar */
.fl-opts{display:grid;grid-template-columns:1fr 1fr;gap:9px 9px}
.fl-opts.one{grid-template-columns:1fr;gap:8px}
.fl-opts.three{grid-template-columns:1fr 1fr 1fr}
.fl-opt{position:relative;display:flex;align-items:center;gap:9px;min-height:56px;padding:7px 12px 8px 7px;border-radius:16px;text-align:left;font-size:clamp(15.5px,4.3vw,18px);line-height:1.15;font-weight:600;
  color:var(--tdark);background:linear-gradient(180deg,#fff,#eef1f8);border:3px solid #fff;box-shadow:0 5px 0 #aab6cf,0 8px 12px rgba(0,0,0,.22);transition:transform .08s,opacity .25s}
.fl-opt:active{transform:translateY(4px);box-shadow:0 1px 0 #aab6cf,0 3px 6px rgba(0,0,0,.2)}
.fl-opt>i{flex:none;width:32px;height:32px;border-radius:10px;display:grid;place-items:center;font-style:normal;font-family:'Lilita One';font-size:18px;color:#fff;background:var(--lc,#3d7dff);box-shadow:inset 0 -3px 0 rgba(0,0,0,.2);${OUT('rgba(0,0,0,.25)', 1)}}
.fl-opt:nth-child(2)>i{--lc:#ff8a2a}.fl-opt:nth-child(3)>i{--lc:#2fbf6a}.fl-opt:nth-child(4)>i{--lc:#b45bff}.fl-opt:nth-child(5)>i{--lc:#ec4f93}.fl-opt:nth-child(6)>i{--lc:#17a2b8}
.fl-opt>span{min-width:0;overflow-wrap:anywhere}
.fl-opt.pick{background:linear-gradient(180deg,#fff7d2,#ffe08a);border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-d),0 5px 0 var(--gold-dd),0 8px 14px rgba(0,0,0,.25);animation:flPop .3s}
.fl-opt.pick::after{content:'';position:absolute;right:-8px;top:-10px;width:30px;height:30px;border-radius:10px;border:2.5px solid #fff;background:var(--me) center/cover;box-shadow:0 2px 0 rgba(0,0,0,.35);animation:flPopIn .3s cubic-bezier(.3,1.8,.5,1) both}
.fl-q.rv .fl-opt.pick::after{display:none}
.fl-q.locked .fl-opt:not(.pick):not(.right):not(.wrong){opacity:.6}
.fl-opt.right{color:#fff;background:linear-gradient(180deg,#7fe88a,#2fa84a);border-color:#fff;box-shadow:0 0 0 3px #d8ffd8,0 5px 0 var(--green-d),0 8px 18px rgba(40,200,80,.45);animation:flPop .45s;${OUT('rgba(0,60,20,.45)', 1)}}
.fl-opt.right>i{background:#fff;color:#2fa84a;text-shadow:none}
.fl-opt.wrong{color:#fff;background:linear-gradient(180deg,#ff8a78,#d53b2c);border-color:#fff;box-shadow:0 5px 0 #7a120a,0 8px 12px rgba(0,0,0,.25);animation:flShakeX .45s;${OUT('rgba(80,0,0,.45)', 1)}}
.fl-opt.wrong>i{background:#fff;color:#d53b2c;text-shadow:none}
.fl-opt.dim{opacity:.4}
.fl-opt.gone{opacity:.14;pointer-events:none;transform:scale(.95)}
.fl-who{position:absolute;top:-11px;right:-7px;width:30px;height:30px;border-radius:10px;overflow:hidden;border:2.5px solid #fff;box-shadow:0 2px 0 rgba(0,0,0,.4);animation:flPopIn .35s cubic-bezier(.3,1.8,.5,1) both}
.fl-who+.fl-who{right:21px;animation-delay:.08s}
.fl-who+.fl-who+.fl-who{right:49px;animation-delay:.16s}
.fl-who+.fl-who+.fl-who+.fl-who{right:77px;animation-delay:.24s}
.fl-who .fl-avs{width:100%;height:100%}

/* doğru / yanlış */
.fl-tf{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.fl-tf .fl-opt{justify-content:center;flex-direction:column;gap:2px;min-height:86px;font-family:'Lilita One';font-weight:400;font-size:26px;letter-spacing:.03em;color:#fff;border-color:#fff}
.fl-tf .fl-opt::before{content:'';width:34px;height:34px;background:#fff;-webkit-mask:var(--ok) center/contain no-repeat;mask:var(--ok) center/contain no-repeat}
.fl-tf .fl-no::before{-webkit-mask-image:var(--no);mask-image:var(--no)}
.fl-yes{background:linear-gradient(180deg,#6fe07a,#2a9a44)!important;box-shadow:0 6px 0 #146a2a,0 9px 14px rgba(0,0,0,.25)!important;${OUT('#0e5a20', 2)}}
.fl-no{background:linear-gradient(180deg,#ff8070,#cf3426)!important;box-shadow:0 6px 0 #7a120a,0 9px 14px rgba(0,0,0,.25)!important;${OUT('#6a0d05', 2)}}
.fl-tf .fl-opt:active{transform:translateY(5px)}
.fl-tf .fl-opt.pick{box-shadow:0 0 0 4px var(--gold),0 6px 0 var(--gold-dd)!important}
.fl-tf .fl-opt.right{box-shadow:0 0 0 4px #fff,0 0 22px 6px rgba(120,255,140,.8),0 6px 0 #146a2a!important}
.fl-tf .fl-opt.dim{opacity:.3;filter:grayscale(.6)}

/* ana onay ve adım düğmeleri */
.fl-send{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:11px 16px 13px;border-radius:16px;font-family:'Lilita One';font-weight:400;font-size:22px;letter-spacing:.05em;color:#4a2800;
  background:linear-gradient(180deg,#ffe680,#f5b324);border:3px solid #fff;box-shadow:0 6px 0 #a0620a,0 9px 14px rgba(0,0,0,.25);transition:transform .08s,opacity .2s;text-shadow:0 1px 0 rgba(255,255,255,.6)}
.fl-send:active{transform:translateY(4px);box-shadow:0 2px 0 #a0620a}
.fl-send:disabled{opacity:.45;filter:grayscale(.5)}
.fl-step{min-width:54px;padding:8px 10px 9px;border-radius:13px;font-family:'Lilita One';font-weight:400;font-size:17px;color:var(--tdark);background:linear-gradient(#fff,#e7ecf6);border:2.5px solid #fff;box-shadow:0 4px 0 #aab6cf;transition:transform .08s}
.fl-step:active{transform:translateY(3px);box-shadow:0 1px 0 #aab6cf}
.fl-hint{font-size:14px;line-height:1.25;color:#cfe0ff;text-align:center}

/* tahmin (sayı) */
.fl-num{display:flex;flex-direction:column;gap:10px;align-items:stretch;transition:opacity .2s}
.fl-num-val{display:flex;align-items:baseline;justify-content:center;gap:6px;padding:4px 12px 6px;border-radius:16px;background:#0a1534;border:2.5px solid rgba(255,255,255,.25);box-shadow:inset 0 3px 0 rgba(0,0,0,.4)}
.fl-num-val b{font-family:'Lilita One';font-weight:400;font-size:46px;line-height:1.05;color:var(--gold);${OUT('#3a2000', 2)}}
.fl-num-val small{font-size:19px;color:#fff;opacity:.9}
.fl-range{-webkit-appearance:none;appearance:none;width:100%;height:40px;margin:0;background:transparent;pointer-events:auto;touch-action:none;--p:50%}
.fl-range::-webkit-slider-runnable-track{height:16px;border-radius:8px;border:2.5px solid #fff;background:linear-gradient(90deg,#ffc23a var(--p),#0a1534 var(--p));box-shadow:0 3px 0 rgba(0,0,0,.35)}
.fl-range::-webkit-slider-thumb{-webkit-appearance:none;width:38px;height:38px;margin-top:-13px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff8d0,#ffc23a 60%,#e8980e);border:3.5px solid #fff;box-shadow:0 4px 0 #a0620a,0 6px 10px rgba(0,0,0,.35)}
.fl-range::-moz-range-track{height:12px;border-radius:8px;border:2.5px solid #fff;background:#0a1534}
.fl-range::-moz-range-progress{height:12px;border-radius:8px;background:#ffc23a}
.fl-range::-moz-range-thumb{width:32px;height:32px;border-radius:50%;background:#ffc23a;border:3.5px solid #fff;box-shadow:0 4px 0 #a0620a}
.fl-num-row{display:flex;gap:8px;justify-content:center}
.fl-num.sent{opacity:.65;pointer-events:none}
.fl-num-ans{text-align:center;margin-bottom:8px}
.fl-num-ans small{display:block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.75}
.fl-num-ans b{font-family:'Lilita One';font-weight:400;font-size:34px;color:#7dff9a;${OUT('#0a3a14', 2)}}
.fl-guesses{display:flex;flex-direction:column;gap:6px}
.fl-guess{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:12px;background:var(--ink)}
.fl-guess b{width:18px;height:18px;border-radius:6px;border:2px solid #fff}
.fl-guess em{margin-left:auto;font-style:normal;font-family:'Lilita One'}

/* haritada bul */
.fl-pin-hint{display:flex;align-items:center;gap:10px}
.fl-pin-hint span{flex:1;font-size:15px;line-height:1.2;color:#fff;padding-left:4px}
.fl-pin-hint span::before{content:'';display:inline-block;vertical-align:-4px;width:20px;height:20px;margin-right:6px;background:var(--gold);-webkit-mask:var(--pinm) center/contain no-repeat;mask:var(--pinm) center/contain no-repeat;animation:flBob2 1s ease-in-out infinite}
.fl-pin-hint .fl-send{width:auto;padding:9px 18px 11px;font-size:18px}
@keyframes flBob2{50%{transform:translateY(-3px)}}

/* adam asmaca, kelime: harf kutuları ve klavye */
.fl-hang{display:flex;flex-direction:column;gap:10px;align-items:center}
.fl-towers{display:flex;gap:5px;padding:4px 10px;border-radius:10px;background:#0a1534}
.fl-towers i{width:16px;height:20px;background:linear-gradient(#ffe680,#e8980e);-webkit-mask:var(--tw) center/contain no-repeat;mask:var(--tw) center/contain no-repeat;transition:transform .35s cubic-bezier(.5,0,.7,.4),opacity .35s;transform-origin:50% 100%}
.fl-towers i.down{transform:rotate(28deg) translateY(4px) scale(.85);opacity:.22}
.fl-word{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;max-width:100%}
.fl-word b{width:clamp(26px,7.4vw,36px);height:42px;border-radius:9px;display:grid;place-items:center;font-family:'Lilita One';font-weight:400;font-size:24px;color:var(--tdark);
  background:linear-gradient(#fffdf6,var(--cream));border:2px solid #fff;box-shadow:0 4px 0 var(--cream-d)}
.fl-word b:empty{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.35);box-shadow:0 4px 0 rgba(0,0,0,.3)}
.fl-word s{width:12px}
.fl-word.revealed b{color:#fff;background:linear-gradient(#7fe88a,#2fa84a);box-shadow:0 4px 0 var(--green-d);animation:flPop .4s}
.fl-keys{display:flex;flex-direction:column;gap:6px;width:100%}
.fl-keys div{display:flex;gap:4px;justify-content:center}
.fl-key{flex:1;max-width:38px;height:42px;border-radius:9px;font-family:'Lilita One';font-weight:400;font-size:18px;color:var(--tdark);background:linear-gradient(#fff,#e7ecf6);border:2px solid #fff;box-shadow:0 4px 0 #aab6cf;transition:transform .08s,opacity .2s}
.fl-key:active{transform:translateY(3px);box-shadow:0 1px 0 #aab6cf}
.fl-key.hit{color:#fff;background:linear-gradient(#7fe88a,#2fa84a);box-shadow:0 4px 0 var(--green-d)}
.fl-key.miss{color:#fff;background:linear-gradient(#c45a50,#8a2a22);box-shadow:0 4px 0 #4a0d08;opacity:.55}

/* yeni tipler için ortak parçalar */
.fl-tiles{display:flex;flex-wrap:wrap;gap:7px;justify-content:center}
.fl-tile{min-width:42px;height:46px;padding:0 10px;border-radius:11px;display:grid;place-items:center;font-family:'Lilita One';font-weight:400;font-size:22px;color:var(--tdark);background:linear-gradient(#fff,#e7ecf6);border:2.5px solid #fff;box-shadow:0 4px 0 #aab6cf;transition:transform .1s,opacity .2s}
.fl-tile:active{transform:translateY(3px)}
.fl-tile.on{background:linear-gradient(#fff7d2,#ffe08a);border-color:var(--gold);box-shadow:0 4px 0 var(--gold-dd)}
.fl-tile.used{opacity:.3}
.fl-tile.right{color:#fff;background:linear-gradient(#7fe88a,#2fa84a);box-shadow:0 4px 0 var(--green-d)}
.fl-tile.wrong{color:#fff;background:linear-gradient(#ff8a78,#d53b2c);box-shadow:0 4px 0 #7a120a}
.fl-list{display:flex;flex-direction:column;gap:7px}
.fl-item{position:relative;display:flex;align-items:center;gap:9px;min-height:46px;padding:6px 12px 7px 6px;border-radius:14px;font-size:16px;line-height:1.15;color:var(--tdark);text-align:left;
  background:linear-gradient(#fff,#eef1f8);border:2.5px solid #fff;box-shadow:0 4px 0 #aab6cf;transition:transform .2s cubic-bezier(.3,1.4,.5,1),opacity .2s}
.fl-item>b{flex:none;width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-family:'Lilita One';font-weight:400;font-size:16px;color:#fff;background:var(--pc,var(--navy-l))}
.fl-item.sel,.fl-item.pick{background:linear-gradient(#fff7d2,#ffe08a);border-color:var(--gold);box-shadow:0 4px 0 var(--gold-dd)}
.fl-item.paired{border-color:var(--pc);box-shadow:0 0 0 2px var(--pc),0 4px 0 #aab6cf}
.fl-item.right{color:#fff;background:linear-gradient(#7fe88a,#2fa84a);box-shadow:0 4px 0 var(--green-d)}
.fl-item.wrong{color:#fff;background:linear-gradient(#ff8a78,#d53b2c);box-shadow:0 4px 0 #7a120a}
.fl-item.up{transform:translateY(-6px)}.fl-item.down{transform:translateY(6px)}
.fl-item em{margin-left:auto;font-style:normal;font-family:'Lilita One';font-size:15px;opacity:.85}
.fl-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fl-col{display:flex;flex-direction:column;gap:7px}
.fl-hilo{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.fl-card2{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:110px;padding:10px;border-radius:18px;font-size:18px;line-height:1.15;text-align:center;color:var(--tdark);
  background:linear-gradient(#fff,#eef1f8);border:3px solid #fff;box-shadow:0 6px 0 #aab6cf;transition:transform .08s}
.fl-card2:active{transform:translateY(4px)}
.fl-card2>b{font-family:'Lilita One';font-weight:400;font-size:24px;color:var(--cd)}
.fl-card2.pick{border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-d),0 6px 0 var(--gold-dd)}
.fl-card2.right{color:#fff;background:linear-gradient(#7fe88a,#2fa84a);box-shadow:0 6px 0 var(--green-d)}
.fl-card2.wrong{color:#fff;background:linear-gradient(#ff8a78,#d53b2c);box-shadow:0 6px 0 #7a120a}
.fl-emoji{font-size:clamp(40px,12vw,58px);line-height:1.15;text-align:center;letter-spacing:.06em;padding:6px 10px;margin-bottom:10px;border-radius:16px;background:#0a1534;border:2.5px solid rgba(255,255,255,.25)}
.fl-media{position:relative;display:grid;place-items:center;height:min(34vh,200px);margin-bottom:10px;border-radius:16px;overflow:hidden;background:#0a1534;border:3px solid #fff;box-shadow:0 4px 0 rgba(0,0,0,.35)}
.fl-media>img,.fl-media>svg{width:100%;height:100%;object-fit:contain;transition:transform .6s,opacity .4s}
.fl-media.blur>img{filter:blur(10px)}
.fl-media.sil>img{filter:brightness(0)}
.fl-grid{display:grid;gap:3px;justify-content:center}
.fl-cell{width:30px;height:30px;border-radius:6px;display:grid;place-items:center;font-family:'Lilita One';font-size:17px;color:var(--tdark);background:var(--cream);box-shadow:0 2px 0 var(--cream-d)}
.fl-cell.blank{background:transparent;box-shadow:none}
.fl-cell.on{background:#ffe08a}
.fl-cell.right{color:#fff;background:#2fa84a}
.fl-proverb{font-size:19px;line-height:1.4;text-align:center}
.fl-proverb u{text-decoration:none;display:inline-block;min-width:70px;border-bottom:3px dashed var(--gold);color:var(--gold)}

/* ---------------------------------------------------------------- en yakın kazanır: sonuç paneli */
.fl-close{display:flex;flex-direction:column;gap:8px}
.fl-ans{display:flex;align-items:center;justify-content:center;gap:10px;padding:6px 12px 8px;border-radius:16px;background:linear-gradient(#2fa84a,#1d7a33);border:3px solid #fff;box-shadow:0 5px 0 #0f4a1d}
.fl-ans small{font-size:12px;letter-spacing:.12em;line-height:1.1;text-align:right;${OUT('#0f4a1d', 1)}}
.fl-ans b{font-family:'Lilita One';font-weight:400;font-size:38px;line-height:1;${OUT('#0f4a1d', 2.5)}}
.fl-ans em{font-style:normal;font-size:18px;${OUT('#0f4a1d', 1.5)}}
.fl-nline{position:relative;height:58px;margin:2px 18px 0}
.fl-nline .trk{position:absolute;left:0;right:0;top:36px;height:8px;border-radius:4px;background:#0a1534;border:2px solid rgba(255,255,255,.4)}
.fl-nline .tk{position:absolute;top:46px;font-size:10.5px;color:#cfe0ff;transform:translateX(-50%);white-space:nowrap}
.fl-nline .gl{position:absolute;top:22px;left:calc(var(--x) * 100%);width:4px;height:30px;margin-left:-2px;border-radius:2px;background:#7dff9a;box-shadow:0 0 0 2px #0f4a1d;animation:flPopIn .3s both}
.fl-nline .seg{position:absolute;top:37px;height:6px;left:calc(var(--a) * 100%);width:calc((var(--b) - var(--a)) * 100%);background:var(--c);opacity:.9;transform-origin:var(--o) 50%;animation:flGrow .6s .35s cubic-bezier(.2,.8,.3,1) both}
.fl-nline .mk{position:absolute;top:0;left:calc(var(--x) * 100%);width:30px;height:30px;margin-left:-15px;border-radius:50%;overflow:hidden;border:2.5px solid var(--c);background:var(--c);box-shadow:0 3px 0 rgba(0,0,0,.4);animation:flDrop .45s calc(var(--k) * .1s) cubic-bezier(.3,1.5,.5,1) both}
.fl-nline .mk::after{content:'';position:absolute;left:50%;bottom:-7px;margin-left:-4px;border:4px solid transparent;border-top:6px solid var(--c)}
@keyframes flGrow{from{transform:scaleX(0)}}
.fl-crs{display:flex;flex-direction:column;gap:6px}
.fl-cr{position:relative;display:grid;grid-template-columns:24px 30px minmax(0,1fr) auto;align-items:center;gap:8px;padding:5px 10px 5px 6px;border-radius:13px;background:var(--ink);border:2px solid rgba(255,255,255,.18);
  animation:flRowIn .35s calc(.25s + var(--k) * .12s) cubic-bezier(.3,1.4,.5,1) both}
.fl-cr .rk{font-family:'Lilita One';font-size:17px;text-align:center;color:#cfe0ff}
.fl-cr .fl-av{width:30px;height:30px;border-radius:9px;border-width:2px;border-color:var(--c)}
.fl-cr .nm{min-width:0}
.fl-cr .nm b{display:block;font-size:14.5px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fl-cr .bar{display:block;height:8px;margin-top:3px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden}
.fl-cr .bar u{display:block;height:100%;border-radius:4px;background:var(--c);transform-origin:0 50%;transform:scaleX(var(--w));animation:flGrow .7s calc(.45s + var(--k) * .12s) cubic-bezier(.2,.8,.3,1) both}
.fl-cr em{font-style:normal;text-align:right;font-family:'Lilita One';font-size:17px;line-height:1.05}
.fl-cr em small{display:block;font-family:'Fredoka';font-size:11px;color:#cfe0ff}
.fl-cr.win{border-color:var(--gold);background:linear-gradient(90deg,rgba(255,210,90,.28),var(--ink) 70%)}
.fl-cr.win .rk{color:var(--gold)}
.fl-cr .tag{display:inline-block;vertical-align:2px;margin-left:6px;padding:0 6px;border-radius:7px;font-family:'Lilita One';font-size:11px;letter-spacing:.06em;line-height:16px;color:#4a2800;background:var(--gold);border:1.5px solid #fff;animation:flPopIn .35s .9s both}
@keyframes flRowIn{from{opacity:0;transform:translateX(-18px)}}
.fl-q.map .fl-close{gap:5px}
.fl-q.map .fl-cr{padding:3px 8px 3px 5px}

/* ---------------------------------------------------------------- jokerler */
.fl-jk{display:flex;justify-content:center;gap:10px;margin-top:12px}
.fl-jk:empty{display:none}
.fl-jkb{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;width:70px;padding:5px 2px 5px;border-radius:14px;font-size:12px;line-height:1.1;letter-spacing:.02em;
  background:linear-gradient(#7a4ad8,#4a2a9a);border:2.5px solid #fff;box-shadow:0 4px 0 #2a1460;transition:transform .08s,opacity .2s}
.fl-jkb:active{transform:translateY(3px);box-shadow:0 1px 0 #2a1460}
.fl-jkb .ji{width:26px;height:26px;font-size:22px;display:grid;place-items:center}
.fl-jkb>i{position:absolute;right:-7px;top:-8px;min-width:20px;height:20px;padding:0 4px;border-radius:10px;font-style:normal;font-family:'Lilita One';font-size:13px;line-height:17px;text-align:center;color:#4a2800;background:var(--gold);border:2px solid #fff}
.fl-jkb:disabled,.fl-jkb.off{opacity:.38;filter:grayscale(.8)}
.fl-jkb.used{animation:flPop .4s}
.fl-q.locked .fl-jk,.fl-q.rv .fl-jk{opacity:.35;pointer-events:none}

${LAND}{
  .fl-q{left:auto;right:8px;bottom:auto;top:50%;width:min(52vw,480px);transform:translate(40px,-50%)}
  .fl-q.on{transform:translate(0,-50%)}
  .fl-qc{padding:8px 10px 10px}
  .fl-qtext{min-height:48px;padding:7px 12px 8px;font-size:clamp(16px,2.4vw,19px)}
  .fl-qbody{margin-top:9px}
  .fl-opt{min-height:46px}
  .fl-tf .fl-opt{min-height:66px}
  .fl-tbar{margin:6px 2px 8px}
  .fl-key{height:34px}
  .fl-word b{height:36px}
  .fl-num-val b{font-size:36px}
  .fl-q.map{top:calc(6px + var(--sat));transform:translate(0,-30px);width:min(46vw,440px)}
  .fl-q.map.on{transform:none}
  .fl-jk{margin-top:8px}
  .fl-stamp{left:auto;right:calc(100% + 18px);top:50%;transform:translate(0,-50%) rotate(-6deg);font-size:min(6vw,44px)}
  .fl-stamp.on{animation-name:flStampL}
  .fl-q.map .fl-stamp{top:calc(100vh - 110px);right:auto;left:50%;animation-name:flStampB}
  .fl-q.kc.rv:not(.map) .fl-qtext{display:none}
  .fl-q.kc.rv .fl-qbody{margin-top:6px}
  .fl-ans{padding:3px 10px 5px}
  .fl-ans b{font-size:28px}
  .fl-nline{height:50px}
  .fl-nline .trk{top:30px}.fl-nline .seg{top:31px}.fl-nline .gl{top:18px;height:26px}.fl-nline .tk{top:40px}
  .fl-nline .mk{width:26px;height:26px;margin-left:-13px}
  .fl-cr{padding:3px 8px 3px 5px}
  .fl-cr .fl-av{width:26px;height:26px}
}
@keyframes flStampL{0%{opacity:0;transform:translate(0,-50%) rotate(-6deg) scale(2.2)}60%{opacity:1;transform:translate(0,-50%) rotate(-6deg) scale(.92)}100%{opacity:1;transform:translate(0,-50%) rotate(-6deg) scale(1)}}
`;
