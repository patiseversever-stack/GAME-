// PENALTI (YENİ 10 · grup 4): dört şıklı soru, kalenin dört köşesine dağılır (sol üst, sağ üst, sol alt, sağ alt).
// Her köşede bir hedef panosu şıkkı taşır; oyuncu köşeye dokunup şutu çeker. Kaleci rakiptir: başı rakibin portresi,
// forması rakibin rengi. Gece maçı, karlı derbi ya da akşam finali (soru verisindeki `hava`).
//
// Sahne (v2, sinematik): yayın kamerası penaltı noktasının arkasında. Derinlik katmanları: gökyüzü ve çatı saçağı, ışık
// kuleleri (parlama, huzme, pus), iki katlı tribün (yüzler, atkılar, flaşlar, ışık dalgası), LED pano, kale (altıgen örgülü
// arka ağ, yan ağlar, ağ tabanı, silindir gölgeli direkler), kaleci, hedef panoları, ışık havuzlu biçilmiş çim, top.
// Bütün çizim durağan SVG'dir (ölçülen boyda bir kez); canlı her şey yalnız transform/opacity ile ve Web Animations ya da
// CSS ile oynar (bileşikçide): kare başına ana iş parçacığında iş yok.
//
// İmza anı: dokununca krampon vurur, top kalkar ve ağır çekime girer: kamera itilir (tribün katmanı paralaksla yaklaşır,
// sahne hafifçe büyür), stat susar, sinema bantları iner. Cevap açılınca top falsoyla senin köşene kıvrılır, çizgiye
// yakın ağır çekime girer, sonra ağa gömülür; kaleci RAKİBİN KENDİ seçtiği köşeye uçar.
//   doğru  → GOL: ağ şişer, tribünde flaş yağmuru ve ışık patlaması, konfeti (kaleci aynı köşedeyse eldiveni sıyırır)
//   yanlış → kaleci aynı köşedeyse KURTARDI (top eldivende kalır); değilse DİREK, ÜSTTEN AUT ya da AUT
// Puan sıradan ve adil: doğru cevap goldür (tür 'exact'). 2–4 oyuncuda herkesin şutu, portreli top işaretiyle köşesinin
// dışında durur (üst köşeler üst direğin üstünde, alt köşeler kale çizgisinin altında): hiçbiri pano yazısına binmez.
//
// Veri: choice ile aynı { q, a: [doğru, y1, y2, y3], hava?: 'gece' | 'kar' | 'aksam' }. Görünüm { q, opts, right, hava }.
// Değer: köşe sırası 0..3 (opts sırası: 0 sol üst, 1 sağ üst, 2 sol alt, 3 sağ alt).
// Jokerler (tipin kendi etkisi, T.joker): yarı yarıya → iki yanlış köşeye bant çekilir; seyirci → köşe başına oy.
// Çevrimiçi: publicView doğru köşeyi (right) ve verideki şık sırasını (q.a) siler; ağ, kaleci ve top cevap ekranında
// (sonuçlar gelince) oynar. Yazılar kendi sığdırıcısıyla panoya sığar; kelime ortasından bölünmez (heceleme yok: sığmayan
// kelimede yazı küçülür).

import { css, esc, shuffle, pCorrect, buzz, clamp } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, stampLater, onClose, onOpen, sfx, LOOK } from './d_ortak.js';
import { clock, setTimeout, clearTimeout } from '../core/clock.js';

const CORNER = ['tl', 'tr', 'bl', 'br'];
const LETTER = ['A', 'B', 'C', 'D'];
const LCOL = ['#2f7bff', '#ff8a1f', '#22c46a', '#a24bff']; // arena şık harflerinin renkleri (styles-arena .fl-opt>i)
const HAVA = ['gece', 'kar', 'aksam'];
const SKIN = ['#e3b48c', '#c98f66', '#a9724e', '#f0cba6', '#8a5a3c'];

/** Küçük, belirlenimci rastgele (tribün dizilişi soruya göre sabit; her açılışta aynı). */
function rngOf(s) {
	let h = 2166136261;
	for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
	return () => {
		h = (h + 0x6d2b79f5) | 0;
		let t = Math.imul(h ^ (h >>> 15), 1 | h);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const f1 = (x) => (Math.round(x * 10) / 10).toString();
const ease = (t) => 1 - Math.pow(1 - t, 2.2);
const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// ---------------------------------------------------------------- stil
const CSS = /* css */ `
.yn-pk{position:relative;flex:1 1 auto;min-height:198px;display:flex;flex-direction:column;user-select:none;-webkit-user-select:none;--cc2:var(--cc,#ff8a1e)}
.pk-st{position:relative;flex:1 1 auto;min-height:198px;border-radius:16px;overflow:hidden;isolation:isolate;background:#040818;
  box-shadow:0 0 0 1.5px rgba(255,255,255,.16),0 0 0 4px rgba(4,8,24,.9),0 16px 34px rgba(0,0,0,.6)}
.pk-st::after{content:'';position:absolute;inset:0;z-index:10;border-radius:inherit;pointer-events:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset 0 0 0 1px rgba(255,255,255,.06)}
/* kamera: ağır çekimde sahne hafifçe büyür, uzak katman (tribün) paralaksla daha çok yaklaşır */
.pk-cam{position:absolute;inset:0;transform-origin:50% 46%;transition:transform 1s cubic-bezier(.2,.8,.25,1)}
.yn-pk.slow .pk-cam{transform:scale(1.035)}
.pk-far{position:absolute;inset:0;z-index:0;pointer-events:none;transition:transform 1.1s cubic-bezier(.2,.8,.25,1)}
.yn-pk.slow .pk-far{transform:scale(1.12)}
.pk-bg,.pk-crowd,.pk-beams{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.pk-crowd{transform-origin:50% 100%}
.yn-pk.roar .pk-crowd{animation:pkJump .3s ease-in-out 6 alternate}
.pk-beams{animation:pkBeam 5s ease-in-out infinite alternate}
.yn-pk.slow .pk-beams{animation-duration:9s}
.pk-haze{position:absolute;left:0;right:0;pointer-events:none;background:linear-gradient(180deg,rgba(150,180,255,0),rgba(150,180,255,.13) 55%,rgba(190,210,255,.2) 82%,rgba(150,180,255,0))}
.yn-pk[data-hava=aksam] .pk-haze{background:linear-gradient(180deg,rgba(255,170,120,0),rgba(255,170,120,.16) 60%,rgba(255,200,150,.22) 84%,rgba(255,170,120,0))}
.pk-glow{position:absolute;left:0;right:0;pointer-events:none;opacity:0;background:radial-gradient(70% 90% at 50% 60%,rgba(255,250,225,.55),rgba(255,250,225,.12) 55%,transparent 80%)}
.yn-pk.roar .pk-glow{animation:pkGlow .55s ease-out 3}
.pk-fls{position:absolute;inset:0;pointer-events:none}
.pk-fls i{position:absolute;width:var(--r);height:var(--r);margin:calc(var(--r) / -2) 0 0 calc(var(--r) / -2);border-radius:50%;background:radial-gradient(circle,#fff 0 30%,rgba(255,255,255,.55) 45%,rgba(255,255,255,0) 70%);opacity:0;
  animation:pkFlash var(--du) ease-out var(--dl) infinite}
.yn-pk.slow .pk-fls{opacity:.25;transition:opacity .4s}
.yn-pk.roar .pk-fls{opacity:1}
.yn-pk.roar .pk-fls i{animation:pkFlashB .7s ease-out calc(var(--dl) * .1) 3}
.pk-led{position:absolute;left:0;right:0;overflow:hidden;pointer-events:none;box-shadow:0 0 10px color-mix(in srgb,var(--cc2) 50%,transparent)}
.pk-led i{position:absolute;left:0;top:0;bottom:0;width:200%;opacity:.92;
  background:repeating-linear-gradient(90deg,var(--cc2) 0 9%,#0b1030 9% 10%,#ffd25a 10% 19%,#0b1030 19% 20%,#fff 20% 23%,#0b1030 23% 25%);animation:pkLed 3.2s linear infinite}
.pk-led::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(0,0,0,.35) 0 1px,transparent 1px 3px),linear-gradient(180deg,rgba(255,255,255,.25),transparent 45%,rgba(0,0,0,.35))}
.yn-pk.roar .pk-led i{animation-duration:.5s}
.pk-sw{position:absolute;left:-35%;width:35%;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent);animation:pkSweep 7s linear infinite}
.yn-pk.roar .pk-sw{animation-duration:1s}
.pk-flag{position:absolute;pointer-events:none;width:var(--fw);height:var(--fh2)}
.pk-flag b{position:absolute;left:0;top:0;width:var(--fw);height:var(--fh);background:linear-gradient(180deg,color-mix(in srgb,var(--c) 70%,#fff),var(--c) 40%,color-mix(in srgb,var(--c) 70%,#000));clip-path:polygon(0 0,100% 0,82% 50%,100% 100%,0 100%);transform-origin:0 50%;
  animation:pkFlag 1.1s ease-in-out var(--dl) infinite alternate}
.pk-flag::before{content:'';position:absolute;left:-1px;top:0;bottom:0;width:1.5px;background:#c8d0dc}
.pk-net{position:absolute;left:0;top:0;width:100%;height:100%;z-index:1;overflow:visible;pointer-events:none}
.pk-net .mesh{transform-box:view-box}
.pk-net .rip{fill:none;stroke:#fff;stroke-width:2;opacity:0}
.pk-snow{position:absolute;inset:0;z-index:4;pointer-events:none;overflow:hidden}
.pk-snow i{position:absolute;top:-8px;width:var(--s);height:var(--s);border-radius:50%;opacity:.9;background:radial-gradient(circle,#fff 0 50%,rgba(255,255,255,.7) 62%,rgba(255,255,255,0) 74%)}
/* sinema bantları (ağır çekim): panoların altında, yazıya binmez */
.pk-lb{position:absolute;left:0;right:0;z-index:4;height:var(--lb,8px);background:#000;pointer-events:none;transform:scaleY(0);transition:transform .55s cubic-bezier(.2,.8,.25,1)}
.pk-lb.t{top:0;transform-origin:50% 0}
.pk-lb.b{bottom:0;transform-origin:50% 100%}
.yn-pk.slow .pk-lb{transform:none}
/* kaleci: gövde SVG, başı oyuncunun portresi. Panoların altında durur (yazıya binmez); yalnız uçuşta öne geçer */
.pk-kp{position:absolute;z-index:3;transform-origin:50% 64%;pointer-events:none}
.pk-kp.fly{z-index:8}
.pk-kp .kp-in{position:absolute;inset:0;transform-origin:50% 100%;animation:pkIdle 1.9s ease-in-out infinite}
.yn-pk.slow .pk-kp .kp-in{animation:pkCrouch .5s ease-out forwards}
.pk-kp.dive .kp-in{animation:none}
.pk-kp svg.kp-fig{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.pk-kp .kp-arm{transform-box:view-box;transition:transform .2s cubic-bezier(.3,1.4,.5,1)}
.pk-kp .kp-arm.l{transform-origin:31px 41px}
.pk-kp .kp-arm.r{transform-origin:69px 41px}
.yn-pk.slow .pk-kp .kp-arm.l{transform:rotate(-12deg)}
.yn-pk.slow .pk-kp .kp-arm.r{transform:rotate(12deg)}
.pk-kp.reach .kp-arm.l{transform:rotate(128deg)}
.pk-kp.reach .kp-arm.r{transform:rotate(-128deg)}
.pk-kp.hold .kp-arm.l{transform:rotate(-42deg)}
.pk-kp.hold .kp-arm.r{transform:rotate(42deg)}
.pk-kp.sad .kp-arm.l{transform:rotate(-22deg)}
.pk-kp.sad .kp-arm.r{transform:rotate(22deg)}
.pk-kp .kp-ball{opacity:0;transition:opacity .1s}
.pk-kp.hold .kp-ball{opacity:1}
.pk-kp .kp-head{position:absolute;left:50%;top:0;width:31%;aspect-ratio:1;transform:translateX(-50%);border-radius:50%;overflow:hidden;
  box-shadow:0 0 0 2px #fff,0 0 0 3.5px var(--kc),0 0 12px color-mix(in srgb,var(--kc) 60%,transparent),0 4px 8px rgba(0,0,0,.5);background:var(--kc)}
.pk-kp .kp-head .fl-av{width:100%;height:100%;border:0;border-radius:0;box-shadow:none}
.pk-kp.sad .kp-head{transform:translateX(-50%) rotate(-9deg) translateY(5%)}
/* hedef panoları: koyu cam, renkli ince kenar, köşe nişangâhı, üstte cam parıltısı; arkadaki ağ ve kaleci sezilir */
.pk-t{position:absolute;z-index:5;display:flex;align-items:center;justify-content:center;padding:5px 7px;border-radius:9px;text-align:center;overflow:hidden;
  background:linear-gradient(180deg,rgba(30,48,108,.72),rgba(8,14,42,.78) 62%,rgba(5,9,30,.84));
  box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--lc) 82%,#fff),inset 0 0 20px color-mix(in srgb,var(--lc) 26%,transparent),0 0 0 1px rgba(0,0,0,.5),0 6px 14px rgba(0,0,0,.5);
  color:#fff;transition:transform .12s,box-shadow .2s,background .25s,opacity .25s}
.pk-t:not(:disabled):active{transform:scale(.96)}
.pk-t::before{content:'';position:absolute;inset:5px;pointer-events:none;opacity:.85;
  background:linear-gradient(var(--lc),var(--lc)) left top/10px 2px,linear-gradient(var(--lc),var(--lc)) left top/2px 10px,
  linear-gradient(var(--lc),var(--lc)) right top/10px 2px,linear-gradient(var(--lc),var(--lc)) right top/2px 10px,
  linear-gradient(var(--lc),var(--lc)) left bottom/10px 2px,linear-gradient(var(--lc),var(--lc)) left bottom/2px 10px,
  linear-gradient(var(--lc),var(--lc)) right bottom/10px 2px,linear-gradient(var(--lc),var(--lc)) right bottom/2px 10px;background-repeat:no-repeat}
.pk-t>.gl{position:absolute;left:0;right:0;top:0;height:48%;pointer-events:none;border-radius:9px 9px 0 0;background:linear-gradient(180deg,rgba(255,255,255,.13),rgba(255,255,255,0))}
.pk-t>.sw{position:absolute;top:-10%;bottom:-10%;left:-60%;width:45%;pointer-events:none;transform:skewX(-18deg);background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);animation:pkTSw 5.5s ease-in-out var(--sd) infinite}
.pk-t .pk-tx{position:relative;display:block;max-width:100%;max-height:100%;font:700 15px/1.08 'Fredoka',sans-serif;letter-spacing:-.005em;overflow-wrap:normal;word-break:normal;hyphens:none;
  text-shadow:0 1px 0 rgba(0,0,0,.6),0 0 10px rgba(0,0,0,.35)}
.pk-l{position:absolute;z-index:7;width:21px;height:19px;margin:-9.5px 0 0 -10.5px;display:grid;place-items:center;transform:skewX(-10deg);
  background:linear-gradient(180deg,color-mix(in srgb,var(--lc) 70%,#fff),var(--lc) 45%,color-mix(in srgb,var(--lc) 75%,#000));
  font:italic 900 14px/1 'Barlow Condensed','Lilita One',sans-serif;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.35);box-shadow:0 0 0 1.5px #fff,0 2px 5px rgba(0,0,0,.5);pointer-events:none}
.yn-pk.pick .pk-t:not(.aim){opacity:.5}
.pk-t.aim{background:linear-gradient(180deg,color-mix(in srgb,var(--me) 62%,#16224e),color-mix(in srgb,var(--me) 34%,#060c26));
  box-shadow:inset 0 0 0 2.5px #fff,0 0 0 3px var(--me),0 0 24px color-mix(in srgb,var(--me) 75%,transparent)}
.pk-t.aim::before{opacity:0}
.pk-t.aim::after{content:'';position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;pointer-events:none;
  box-shadow:0 0 0 2px rgba(255,255,255,.9),inset 0 0 0 2px rgba(255,255,255,.45);animation:pkAim .9s ease-in-out infinite alternate}
.pk-t.gone{opacity:.24!important;pointer-events:none;background:linear-gradient(180deg,rgba(40,46,66,.85),rgba(18,22,36,.9));box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.2)}
.pk-t.gone::before{opacity:0}
.pk-t.gone::after{content:'';position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(-35deg,rgba(255,210,90,.85) 0 7px,rgba(20,20,20,.85) 7px 14px);-webkit-mask:linear-gradient(transparent 38%,#000 38% 62%,transparent 62%);mask:linear-gradient(transparent 38%,#000 38% 62%,transparent 62%)}
.pk-t.ok{opacity:1!important;background:linear-gradient(180deg,#3ee07a,#15a04a 60%,#0e7a37);box-shadow:inset 0 0 0 2.5px #fff,0 0 0 3px #7dff9a,0 0 28px rgba(90,255,140,.7)}
.pk-t.ok::before,.pk-t.no::before{opacity:0}
.pk-t.no{opacity:1!important;background:linear-gradient(180deg,#ec5a45,#b0281c 60%,#861a12);box-shadow:inset 0 0 0 2px rgba(255,255,255,.85),0 0 16px rgba(255,80,60,.45)}
.pk-t.dim{opacity:.38!important}
.pk-t.ok>.sw,.pk-t.no>.sw,.pk-t.gone>.sw,.pk-t.dim>.sw{display:none}
.pk-t.hit{animation:pkHit .46s cubic-bezier(.3,1.6,.5,1)}
.pk-t .pk-pc{position:absolute;left:7px;right:7px;bottom:3px;height:4px;border-radius:2px;background:rgba(255,255,255,.14);overflow:hidden;pointer-events:none}
.pk-t .pk-pc i{position:absolute;inset:0;background:linear-gradient(90deg,#ff9cc8,#ec4f93);transform-origin:0 50%;transform:scaleX(var(--w));animation:flGrow .8s cubic-bezier(.2,.8,.3,1) both}
.pk-poll{position:absolute;z-index:7;padding:1px 7px;transform:translate(-50%,-50%) skewX(-10deg);font:italic 900 13px/17px 'Barlow Condensed','Lilita One',sans-serif;color:#fff;background:linear-gradient(180deg,#ff7ab4,#ec4f93);
  box-shadow:0 0 0 1.5px #fff,0 2px 0 rgba(0,0,0,.35);white-space:nowrap;pointer-events:none;animation:flPopIn .35s .2s cubic-bezier(.3,1.8,.5,1) both}
/* kale çerçevesi: silindir gölgeli direkler ve üst direk panoların üstünde (pano içte, çerçeveye değmez) */
.pk-fr{position:absolute;z-index:6;pointer-events:none}
.pk-fr i{position:absolute;background:linear-gradient(90deg,#7f8aa3,#dfe5ef 22%,#fff 42%,#f4f7fb 58%,#b4bdcf 80%,#6f7a92);box-shadow:0 0 0 1px rgba(6,12,30,.55),0 4px 10px rgba(0,0,0,.5),0 0 10px rgba(220,235,255,.25)}
.pk-fr i.bar{background:linear-gradient(180deg,#f4f7fb,#fff 30%,#e2e8f1 55%,#9aa5bb 85%,#6f7a92)}
.pk-fr i.post::before{content:'';position:absolute;left:-30%;right:-30%;bottom:-3px;height:5px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.6),rgba(0,0,0,0))}
.pk-fr.shake{animation:pkPost .5s cubic-bezier(.36,.07,.19,.97)}
/* karlı derbi: direk diplerinde kar yığını, üst direkte kar (panoların altında: yazıya binmez) */
.yn-pk[data-hava=kar] .pk-fr i.post::after{content:'';position:absolute;left:-7px;right:-7px;bottom:-4px;height:9px;border-radius:50% 50% 30% 30%;background:radial-gradient(60% 90% at 50% 100%,#fff,#e8f2ff 70%,rgba(232,242,255,0))}
.pk-fr .snow{position:absolute;left:-2px;right:-2px;height:6px;top:-4px;border-radius:6px 6px 2px 2px;background:radial-gradient(circle at 10% 100%,#fff 0 5px,transparent 6px) 0 0/16px 6px repeat-x,#fff;opacity:.95}
/* top: dış öğe konum ve ölçek, iç öğe dönüş (bileşikçide), üstte dönmeyen ışık ve gölge; arkasında hız izi */
.pk-ball{position:absolute;z-index:8;left:0;top:0;pointer-events:none;will-change:transform}
.pk-ball .spin{position:absolute;inset:0}
.pk-ball svg{width:100%;height:100%;overflow:visible;display:block}
.pk-ball .sh{position:absolute;inset:0;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle at 34% 28%,rgba(255,255,255,.7),rgba(255,255,255,0) 32%),radial-gradient(circle at 50% 50%,rgba(0,0,0,0) 52%,rgba(10,16,40,.5) 72%);box-shadow:0 0 0 1px rgba(10,16,40,.35)}
.pk-gh{position:absolute;z-index:8;left:0;top:0;border-radius:50%;pointer-events:none;opacity:0;background:radial-gradient(circle,rgba(255,255,255,.8),rgba(220,235,255,.35) 45%,rgba(220,235,255,0) 70%)}
.pk-boot{position:absolute;z-index:7;pointer-events:none;transform-origin:20% 18%;transform:rotate(-16deg)}
.pk-boot svg{width:100%;height:100%;overflow:visible}
.pk-shadow{position:absolute;z-index:2;left:0;top:0;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.6),rgba(0,0,0,0));pointer-events:none}
.pk-spot{position:absolute;z-index:1;border-radius:50%;background:radial-gradient(closest-side,#fff,#e8eef8 60%,rgba(232,238,248,.4));opacity:.9;pointer-events:none}
.pk-hint{position:absolute;z-index:7;left:50%;display:flex;align-items:center;gap:6px;transform:translate(-50%,-50%) skewX(-10deg);padding:3px 12px;white-space:nowrap;pointer-events:none;
  font:italic 900 13px/1.25 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.16em;color:#1a1200;background:linear-gradient(180deg,#ffe58a,#ffd25a 45%,#f0b52e);box-shadow:0 0 0 1.5px rgba(255,255,255,.7),0 3px 0 rgba(0,0,0,.35),0 0 16px rgba(255,210,90,.45);
  animation:pkHint 1.1s ease-in-out infinite alternate;transition:opacity .25s}
.pk-hint::before,.pk-hint::after{content:'';width:0;height:0;border:4px solid transparent;border-left:5px solid #1a1200;border-right:0}
.pk-hint::after{transform:scaleX(-1)}
.yn-pk.pick .pk-hint,.yn-pk.rv .pk-hint{opacity:0}
.pk-tag{position:absolute;z-index:7;display:flex;align-items:center;gap:6px;height:26px;padding:0 10px 0 3px;transform:translateY(-50%) skewX(-10deg);pointer-events:none;
  background:linear-gradient(90deg,rgba(6,10,26,.9),rgba(10,18,48,.86));box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.3),inset 3px 0 0 var(--tc,#ffd25a),0 4px 10px rgba(0,0,0,.45)}
.pk-tag>*{transform:skewX(10deg)}
.pk-tag .fl-av{width:20px;height:20px;border-radius:5px;border-width:1.5px;box-shadow:none}
.pk-tag small{font:italic 800 10px/1 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:color-mix(in srgb,var(--tc,#ffd25a) 55%,#fff)}
.pk-tag b{font:italic 900 14px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.04em;color:#fff;white-space:nowrap;text-transform:uppercase}
.pk-tag.short b{display:none}
.yn-pk.slow .pk-tag,.yn-pk.rv .pk-tag{opacity:0;transition:opacity .3s}
.yn-pk.rv .pk-boot{opacity:0;transition:opacity .35s .75s}
/* şut işaretleri (cevap): portreli top, oyuncu rengi halka, köşesinin dışında bir sırada */
.pk-mk{position:absolute;z-index:7;width:var(--mk);height:var(--mk);margin:calc(var(--mk) / -2) 0 0 calc(var(--mk) / -2);border-radius:50%;pointer-events:none;
  box-shadow:0 0 0 2.5px var(--c),0 0 0 4px rgba(255,255,255,.9),0 4px 8px rgba(0,0,0,.5);background:var(--c);animation:pkMk .42s var(--dl) cubic-bezier(.3,1.7,.5,1) both}
.pk-mk .fl-av{width:100%;height:100%;border:0;border-radius:50%;box-shadow:none}
.pk-mk.me{box-shadow:0 0 0 2.5px var(--c),0 0 0 4.5px #ffd25a,0 0 14px rgba(255,210,90,.8),0 4px 8px rgba(0,0,0,.5)}
.pk-mk>u{position:absolute;right:-5px;bottom:-4px;width:15px;height:15px;border-radius:50%;display:grid;place-items:center;background:#16c060;box-shadow:0 0 0 1.5px #fff;text-decoration:none}
.pk-mk>u.no{background:#ff3a2a}
.pk-mk>u.kp{background:#1a2a6a}
.pk-mk>u svg{width:9px;height:9px}
.pk-fx{position:absolute;inset:0;z-index:9;pointer-events:none;overflow:hidden}
.pk-fx .cf{position:absolute;top:-12px;width:var(--w);height:var(--h);background:var(--c);border-radius:1px;animation:pkConf var(--d) var(--dl) cubic-bezier(.25,.6,.4,1) both}
.pk-fx .rg{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:3px solid #fff;animation:pkRing .7s ease-out both}
.pk-fx .bg{position:absolute;width:var(--s);height:var(--s);margin:calc(var(--s) / -2) 0 0 calc(var(--s) / -2);border-radius:50%;
  background:radial-gradient(closest-side,rgba(255,255,255,0) 34%,rgba(255,255,255,.5) 52%,rgba(220,255,230,.18) 66%,rgba(255,255,255,0));animation:pkBulge .8s cubic-bezier(.2,.9,.3,1) both}
.pk-flash{position:absolute;inset:0;z-index:9;pointer-events:none;background:radial-gradient(70% 60% at 50% 30%,rgba(255,255,255,.75),rgba(255,255,255,.1) 60%,transparent);animation:pkWhite .7s ease-out both}
.pk-call{position:absolute;z-index:9;left:50%;transform:translate(-50%,-50%);pointer-events:none;white-space:nowrap;font:400 48px/1 'Lilita One',sans-serif;letter-spacing:.02em;color:#ffd25a;
  -webkit-text-stroke:3px #5a2a00;paint-order:stroke fill;text-shadow:0 5px 0 #5a2a00,0 0 28px rgba(255,190,60,.7);animation:pkCall 1.45s cubic-bezier(.3,1.6,.5,1) both}
.pk-call.bad{color:#ff6a5a;-webkit-text-stroke-color:#5a0a06;text-shadow:0 5px 0 #5a0a06,0 0 24px rgba(255,60,40,.6)}
.pk-call.save{color:#9fd8ff;-webkit-text-stroke-color:#0a2a5a;text-shadow:0 5px 0 #0a2a5a,0 0 24px rgba(90,170,255,.7)}
.pk-vig{position:absolute;inset:0;z-index:4;pointer-events:none;background:radial-gradient(95% 85% at 50% 48%,transparent 62%,rgba(0,0,12,.45))}
.pk-vig::after{content:'';position:absolute;inset:0;opacity:0;transition:opacity .5s;background:radial-gradient(70% 65% at 50% 45%,transparent 50%,rgba(0,0,10,.6))}
.yn-pk.slow .pk-vig::after{opacity:1}
.yn-pk.near .pk-vig::after{opacity:1;background:radial-gradient(60% 55% at 50% 45%,transparent 40%,rgba(0,0,10,.72))}
.yn-pk[data-hava=kar] .pk-vig{background:radial-gradient(95% 85% at 50% 45%,transparent 60%,rgba(200,225,255,.22))}
.yn-pk[data-hava=aksam] .pk-st{background:#1f0f2a}
.fl-q.hot .yn-pk .pk-kp .kp-in{animation-duration:.85s}
.fl-q.hot .yn-pk .pk-led i{background:repeating-linear-gradient(90deg,#ff3a2a 0 12.5%,#2a0806 12.5% 25%);animation-duration:.8s}
@keyframes pkFlash{0%,86%{opacity:0;transform:scale(.4)}90%{opacity:1;transform:scale(1.4)}100%{opacity:0;transform:scale(.6)}}
@keyframes pkFlashB{0%{opacity:0}12%{opacity:1;transform:scale(1.7)}100%{opacity:0;transform:scale(.6)}}
@keyframes pkGlow{0%{opacity:0}18%{opacity:1}100%{opacity:0}}
@keyframes pkJump{to{transform:translateY(-3px)}}
@keyframes pkBeam{from{opacity:.6}to{opacity:1}}
@keyframes pkLed{to{transform:translateX(-50%)}}
@keyframes pkFlag{from{transform:skewY(-7deg) scaleX(.94)}to{transform:skewY(6deg) scaleX(1.02)}}
@keyframes pkSweep{from{transform:translateX(0)}to{transform:translateX(400%)}}
@keyframes pkTSw{0%,62%{transform:translateX(0) skewX(-18deg)}100%{transform:translateX(420%) skewX(-18deg)}}
@keyframes pkIdle{0%,100%{transform:translateX(0) translateY(0)}25%{transform:translateX(-3%) translateY(-1.2%)}50%{transform:translateX(0) translateY(0)}75%{transform:translateX(3%) translateY(-1.2%)}}
@keyframes pkCrouch{to{transform:scaleY(.93) scaleX(1.04)}}
@keyframes pkAim{from{transform:scale(.82);opacity:.55}to{transform:scale(1.08);opacity:1}}
@keyframes pkHit{0%{transform:scale(1)}30%{transform:scale(1.07) rotate(-1.5deg)}60%{transform:scale(.97) rotate(1deg)}100%{transform:none}}
@keyframes pkPost{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(3px)}30%,50%,70%{transform:translateX(-4px)}40%,60%{transform:translateX(4px)}}
@keyframes pkMk{0%{opacity:0;transform:translateY(calc(var(--fy,0px))) scale(.3)}100%{opacity:1;transform:none}}
@keyframes pkConf{0%{opacity:1;transform:translate(0,0) rotate(0)}85%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y)) rotate(var(--r))}}
@keyframes pkRing{0%{opacity:.95;transform:scale(.3)}100%{opacity:0;transform:scale(var(--s,4))}}
@keyframes pkBulge{0%{opacity:0;transform:scale(.25)}25%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.35)}}
@keyframes pkWhite{0%{opacity:0}15%{opacity:1}100%{opacity:0}}
@keyframes pkCall{0%{opacity:0;transform:translate(-50%,-50%) scale(.3) rotate(-10deg)}22%{opacity:1;transform:translate(-50%,-50%) scale(1.18) rotate(-4deg)}70%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(-4deg)}100%{opacity:0;transform:translate(-50%,-62%) scale(1.06) rotate(-4deg)}}
@keyframes pkHint{from{transform:translate(-50%,-50%) skewX(-10deg) scale(1)}to{transform:translate(-50%,-50%) skewX(-10deg) scale(1.06)}}
@media (prefers-reduced-motion:reduce){.pk-kp .kp-in,.pk-fls i,.pk-beams,.pk-hint,.pk-sw,.pk-flag b,.pk-led i,.pk-t>.sw{animation:none}.pk-cam,.pk-far{transition:none}}
`;

// ---------------------------------------------------------------- çizimler

/** Top (klasik siyah beyaz yamalar; ışık ve gölge dönmeyen ayrı katmanda). id: kart başına tekil adlar. */
const ballSVG = (id) => `<svg viewBox="-50 -50 100 100" aria-hidden="true"><defs><radialGradient id="pkb${id}" cx=".42" cy=".4" r=".7"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#eef2f8"/><stop offset="1" stop-color="#b9c2d3"/></radialGradient>
	<clipPath id="pkc${id}"><circle r="47"/></clipPath></defs>
	<circle r="47" fill="url(#pkb${id})"/>
	<g clip-path="url(#pkc${id})" fill="#161c2e"><path d="M0-17 16-5 10 14H-10L-16-5z"/><path d="M0-47 12-38 8-27H-8L-12-38z"/><path d="M45-14 47 2 35 8 27-4 33-17z"/><path d="M28 38 16 47 8 40 12 27 25 26z"/><path d="M-28 38-16 47-8 40-12 27-25 26z"/><path d="M-45-14-47 2-35 8-27-4-33-17z"/></g>
	<g stroke="#161c2e" stroke-width="2.2" fill="none" clip-path="url(#pkc${id})"><path d="M0-17V-27M16-5 27-4M10 14 12 27M-10 14-12 27M-16-5-27-4"/></g>
	<circle r="47" fill="none" stroke="#161c2e" stroke-width="2.4"/></svg>`;

/**
 * Kaleci gövdesi (100×150; başı ayrı HTML portre, genişliğin %31'i). Bekleme duruşu: dizler kırık, kollar açık, eldivenler
 * öne dönük. Forma --kc, koyu tonu --kd, açık tonu --kl; soldan arka ışık (ince açık çizgi), sağ yarı gölgede.
 */
const keeperSVG = (id) => `<svg class="kp-fig" viewBox="0 0 100 150" aria-hidden="true"><defs>
	<linearGradient id="pkj${id}" x1="0" x2="1"><stop offset="0" stop-color="var(--kl)"/><stop offset=".3" stop-color="var(--kc)"/><stop offset=".72" stop-color="var(--kc)"/><stop offset="1" stop-color="var(--kd)"/></linearGradient>
	<linearGradient id="pkk${id}" x1="0" x2="1"><stop offset="0" stop-color="#e9b892"/><stop offset=".55" stop-color="#c98f66"/><stop offset="1" stop-color="#9a6646"/></linearGradient>
	<linearGradient id="pkg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4ff9a"/><stop offset=".55" stop-color="#d4ef3a"/><stop offset="1" stop-color="#93ad12"/></linearGradient></defs>
	<ellipse cx="50" cy="147" rx="30" ry="4.2" fill="rgba(0,0,0,.45)"/>
	<path d="M42 96 34 120 31 140" stroke="url(#pkk${id})" stroke-width="9.5" stroke-linecap="round" fill="none"/><path d="M58 96 66 120 69 140" stroke="url(#pkk${id})" stroke-width="9.5" stroke-linecap="round" fill="none"/>
	<path d="M34.2 119 31.2 139" stroke="var(--kd)" stroke-width="10.5" stroke-linecap="round"/><path d="M65.8 119 68.8 139" stroke="var(--kd)" stroke-width="10.5" stroke-linecap="round"/>
	<path d="M33.5 122.5h-1M66.5 122.5h1" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M29.2 121.6l9.6 1.4M70.8 121.6l-9.6 1.4" stroke="rgba(255,255,255,.85)" stroke-width="2"/>
	<path d="M23 142q8-6 15 0l1 5H22zM77 142q-8-6-15 0l-1 5h17z" fill="#0f1322"/><path d="M23 146.5h16M61 146.5h16" stroke="var(--kc)" stroke-width="1.4"/>
	<path d="M31 84h38l4 19H55l-5-7-5 7H27z" fill="#121828"/><path d="M31 84h38v4H31z" fill="var(--kd)"/><path d="M30 90 28 102M70 90l2 12" stroke="var(--kc)" stroke-width="2.2"/>
	<g class="kp-arm l"><path d="M31 41 18 61 13 74" stroke="url(#pkj${id})" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M29 43 17 62" stroke="rgba(255,255,255,.28)" stroke-width="2" stroke-linecap="round" fill="none"/>
		<path d="M5 74c0-6 4-9 8.5-9s8.5 3 8.5 9v5c0 4-3.5 7-8.5 7S5 83 5 79z" fill="url(#pkg${id})" stroke="#1b2408" stroke-width="1.4"/><path d="M6 74h15" stroke="#1b2408" stroke-width="1.6"/><path d="M9.5 79v5M13.5 79v6M17.5 79v5" stroke="rgba(27,36,8,.5)" stroke-width="1"/></g>
	<g class="kp-arm r"><path d="M69 41 82 61 87 74" stroke="url(#pkj${id})" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
		<path d="M95 74c0-6-4-9-8.5-9S78 68 78 74v5c0 4 3.5 7 8.5 7s8.5-3 8.5-7z" fill="url(#pkg${id})" stroke="#1b2408" stroke-width="1.4"/><path d="M79 74h15" stroke="#1b2408" stroke-width="1.6"/><path d="M82.5 79v5M86.5 79v6M90.5 79v5" stroke="rgba(27,36,8,.5)" stroke-width="1"/></g>
	<path d="M44 28h12v10H44z" fill="#b7805b"/>
	<path d="M30 39q20-8 40 0l3 22-3 25H30l-3-25z" fill="url(#pkj${id})" stroke="rgba(0,0,0,.4)" stroke-width="1.1"/>
	<path d="M30 39q-2 8-2.5 18" stroke="rgba(255,255,255,.4)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
	<path d="M50 39 70 39 73 61 70 86H50z" fill="rgba(0,0,0,.14)"/>
	<path d="M29 58 50 50 71 58v6L50 56 29 64z" fill="var(--kl)" opacity=".55"/>
	<path d="M42 37.5 50 46 58 37.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
	<circle cx="60" cy="47" r="3.2" fill="rgba(255,255,255,.85)"/><circle cx="60" cy="47" r="1.6" fill="var(--kd)"/>
	<path d="M47 63h6v18h-4V67l-3 1z" fill="rgba(255,255,255,.9)"/>
	<g class="kp-ball" transform="translate(50 70)"><circle r="10.5" fill="#f2f5fa" stroke="#1b2133" stroke-width="1.6"/><path d="M0-4 4-1 2.5 3.5h-5L-4-1z" fill="#1b2133"/></g>
	</svg>`;

/** Şutçunun kramponu (yandan): şutçu renginde konç, koyu saya, renkli kavisli şerit, beyaz taban, dişler. */
const bootSVG = (id) => `<svg viewBox="0 0 120 70" aria-hidden="true"><defs><linearGradient id="pkbt${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4466"/><stop offset=".55" stop-color="#1a2038"/><stop offset="1" stop-color="#0c1022"/></linearGradient>
	<linearGradient id="pkso${id}" x1="0" x2="1"><stop offset="0" stop-color="color-mix(in srgb,var(--me) 65%,#fff)"/><stop offset=".5" stop-color="var(--me)"/><stop offset="1" stop-color="color-mix(in srgb,var(--me) 60%,#000)"/></linearGradient></defs>
	<path d="M10-34h26v50H10z" fill="url(#pkso${id})"/><path d="M10-20h26v4H10zM10-12h26v4H10z" fill="#fff" opacity=".9"/>
	<path d="M8 22Q9 10 30 12L70 21Q97 29 109 44Q113 52 105 56H14Q6 54 6 44Z" fill="url(#pkbt${id})" stroke="rgba(0,0,0,.5)" stroke-width="1.4"/>
	<path d="M20 44Q52 22 104 46" fill="none" stroke="var(--me)" stroke-width="5" stroke-linecap="round"/><path d="M22 47Q52 28 101 49" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
	<path d="M32 16q10 2 18 5" stroke="rgba(255,255,255,.35)" stroke-width="2" fill="none" stroke-linecap="round"/>
	<path d="M10 56H106Q108 62 100 63H14Q8 62 10 56Z" fill="#eef1f6"/><path d="M22 63h7v5h-7zM44 63h7v5h-7zM70 63h7v5h-7zM90 63h7v5h-7z" fill="#8a93a8"/>
	<ellipse cx="88" cy="38" rx="11" ry="3.4" fill="#fff" opacity=".22" transform="rotate(22 88 38)"/></svg>`;

const ICO = {
	ok: '<svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5 10-11" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
	no: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>',
	kum: '<svg viewBox="0 0 24 24"><path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
	kp: '<svg viewBox="0 0 24 24"><path d="M6 13V7a1.5 1.5 0 0 1 3 0v4V5a1.5 1.5 0 0 1 3 0v6V6a1.5 1.5 0 0 1 3 0v6-3a1.5 1.5 0 0 1 3 0v6c0 4-3 7-7 7s-6-2.5-6-6z" fill="#d8f24a" stroke="#fff" stroke-width="1.2"/></svg>',
};

/**
 * Stadyum, ölçülen boyda. Durağan SVG (gökyüzü, çatı saçağı, ışık kulesi gövdeleri, tribün gövdesi, LED pano yuvası,
 * ışık havuzlu çim ve çizgiler), ayrı katmanda seyirci (gol anında zıplar), huzmeler ve parlamalar (nefes alır); flaşlar,
 * bayraklar, LED akışı ve ışık dalgası küçük HTML katmanlarında yalnız transform/opacity ile oynar.
 */
function stadium(L, hava, team, seed) {
	const { W, H, gw, gy, gh, gb } = L;
	const R = rngOf(seed);
	const dusk = hava === 'aksam';
	const sky = dusk
		? '<stop offset="0" stop-color="#1e1048"/><stop offset=".45" stop-color="#7a2a6a"/><stop offset=".8" stop-color="#ff7a4a"/><stop offset="1" stop-color="#ffc06a"/>'
		: hava === 'kar'
			? '<stop offset="0" stop-color="#0a1430"/><stop offset=".6" stop-color="#22385f"/><stop offset="1" stop-color="#4a6a96"/>'
			: '<stop offset="0" stop-color="#030720"/><stop offset=".55" stop-color="#0c1a52"/><stop offset="1" stop-color="#22357a"/>';
	const standTop = Math.max(5, Math.round(gy * 0.42));
	const standBot = gb - gh * 0.3; // tribünün dibi kalenin arkasında (LED pano)
	const midY = standTop + (standBot - standTop) * 0.36; // iki katın arası (ışıklı korkuluk bandı)
	const band = clamp((standBot - standTop) * 0.045, 3, 7);
	const pal = dusk ? ['#2a1830', '#3a2238', '#4a2a3a', '#20142a', '#5a3448'] : hava === 'kar' ? ['#243458', '#2e4068', '#3a4c78', '#1a2848', '#5a6a90'] : ['#1a2550', '#243166', '#2e3a74', '#141d44', '#38407a', '#4a5590'];
	let heads = '';
	const flashes = [];
	/** Bir tribün katı: satır satır gövde + baş; uzak katta yüzler küçük ve sık. */
	const tier = (y0, y1, rh0) => {
		const rows = Math.max(2, Math.round((y1 - y0) / rh0));
		const rh = (y1 - y0) / rows;
		for (let r = 0; r < rows; r++) {
			const base = y0 + rh * (r + 1);
			const sz = rh * (0.27 + 0.03 * (r / rows));
			const bw = sz * 2.4;
			const bh = rh * 0.46;
			heads += `<rect x="0" y="${f1(base - rh * 0.14)}" width="${W}" height="${f1(rh * 0.14 + 0.4)}" fill="rgba(0,0,0,.4)"/>`;
			for (let x = -R() * sz * 2.4; x < W + sz * 3; x += sz * 2.5 * (0.86 + R() * 0.28)) {
				const tc = R() < 0.26 ? team[R() < 0.5 ? 0 : 1] : R() < 0.08 ? '#e8ecf4' : pal[Math.floor(R() * pal.length)];
				const yb = base - rh * 0.14 - (R() - 0.5) * rh * 0.08;
				const hy = yb - bh - sz * 0.75;
				heads += `<rect x="${f1(x - bw / 2)}" y="${f1(yb - bh)}" width="${f1(bw)}" height="${f1(bh + 0.5)}" rx="${f1(sz * 0.8)}" fill="${tc}"/><circle cx="${f1(x)}" cy="${f1(hy)}" r="${f1(sz)}" fill="${SKIN[Math.floor(R() * SKIN.length)]}"/>`;
				if (R() < 0.05) heads += `<rect x="${f1(x - sz * 1.9)}" y="${f1(hy - sz * 2)}" width="${f1(sz * 3.8)}" height="${f1(sz * 0.8)}" fill="${team[R() < 0.5 ? 0 : 1]}"/><rect x="${f1(x - sz * 1.9)}" y="${f1(hy - sz * 1.7)}" width="${f1(sz * 3.8)}" height="${f1(sz * 0.22)}" fill="#fff" opacity=".8"/>`;
				if (R() < 0.05 && x > 3 && x < W - 3 && flashes.length < 26) flashes.push({ x, y: hy, r: Math.max(2.4, sz * 1.5), dl: R() * 3.4, du: 2.6 + R() * 2.6 });
			}
		}
	};
	const rhT = clamp((standBot - standTop) / 18, 5.5, 11);
	tier(standTop, midY, rhT * 0.82);
	tier(midY + band, standBot, rhT * 1.08);
	// ışık kuleleri: çatı saçağında iki lamba bloğu, çevresinde parlama ve yatay mercek çizgisi (huzme katmanında)
	const lw = clamp(W * 0.13, 30, 64);
	const ly = Math.max(3, standTop * 0.34);
	const rigs = [W * 0.13, W * 0.87];
	const rig = (x) => {
		let dots = '';
		for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) dots += `<rect x="${f1(x - lw / 2 + 2 + (i * (lw - 4)) / 5)}" y="${f1(ly + 1.5 + j * 4.5)}" width="${f1((lw - 4) / 5 - 1.2)}" height="3.4" rx="1" fill="#fffbe6"/>`;
		return `<rect x="${f1(x - lw / 2 - 1.5)}" y="${f1(ly - 0.5)}" width="${f1(lw + 3)}" height="12" rx="2" fill="#1c2442" stroke="#3a466e" stroke-width=".8"/>${dots}`;
	};
	const glare = (x) =>
		`<circle cx="${f1(x)}" cy="${f1(ly + 6)}" r="${f1(lw * 1.05)}" fill="url(#pkgl${seed})"/><ellipse cx="${f1(x)}" cy="${f1(ly + 6)}" rx="${f1(W * 0.26)}" ry="1.3" fill="url(#pkls${seed})"/><circle cx="${f1(x)}" cy="${f1(ly + 6)}" r="${f1(lw * 0.32)}" fill="#fffdf0" opacity=".85"/>`;
	const beam = (x, side) => {
		const bx = W / 2 + side * W * 0.08;
		return `<path d="M${f1(x - lw * 0.45)} ${f1(ly + 8)} L${f1(x + lw * 0.45)} ${f1(ly + 8)} L${f1(bx + W * 0.2)} ${f1(H)} L${f1(bx - W * 0.2)} ${f1(H)}Z" fill="url(#pkbm${seed})"/>`;
	};
	const sun = dusk ? `<circle cx="${f1(W * 0.7)}" cy="${f1(standTop + 2)}" r="${f1(W * 0.36)}" fill="url(#pkgl${seed})" opacity=".9"/><circle cx="${f1(W * 0.7)}" cy="${f1(standTop + 2)}" r="${f1(Math.max(10, W * 0.06))}" fill="#fff0b8"/>` : '';
	const stars = dusk ? '' : Array.from({ length: 22 }, (_, i) => `<circle cx="${f1((i * 97.3) % W)}" cy="${f1(((i * 41.7) % Math.max(6, standTop - 2)) + 1)}" r="${i % 3 ? 0.6 : 1}" fill="#fff" opacity="${0.22 + (i % 4) * 0.12}"/>`).join('');
	// çatı saçakları: iki yan tribünün çatısı köşelerden içe uzanır (gökyüzünü çerçeveler)
	const roof = `<path d="M0 0H${f1(W * 0.34)}L${f1(W * 0.2)} ${f1(standTop * 0.85)}L0 ${f1(standTop * 1.3)}Z" fill="#070b1c"/><path d="M${W} 0H${f1(W * 0.66)}L${f1(W * 0.8)} ${f1(standTop * 0.85)}L${W} ${f1(standTop * 1.3)}Z" fill="#070b1c"/>
		<path d="M${f1(W * 0.34)} 0L${f1(W * 0.2)} ${f1(standTop * 0.85)}L0 ${f1(standTop * 1.3)}M${f1(W * 0.66)} 0L${f1(W * 0.8)} ${f1(standTop * 0.85)}L${W} ${f1(standTop * 1.3)}" stroke="rgba(160,180,230,.35)" stroke-width="1" fill="none"/>`;
	// bayraklar: iki takımın rengi (şutçu, kaleci)
	const fh = clamp(rhT * 1.1, 8, 15);
	const flags = [
		{ x: W * 0.3, c: team[0], k: 0 },
		{ x: W * 0.62, c: team[1], k: 1 },
		...(W > 360 ? [{ x: W * 0.46, c: team[0], k: 2 }] : []),
	].map((f) => ({ ...f, y: standTop + fh * 0.2, h: fh }));
	// korkuluk bandı: küçük ışıklar dizisi
	let rail = `<rect x="0" y="${f1(midY)}" width="${W}" height="${f1(band)}" fill="#060a1c"/><rect x="0" y="${f1(midY)}" width="${W}" height=".8" fill="rgba(200,215,255,.45)"/>`;
	for (let x = 4; x < W; x += 9) rail += `<circle cx="${f1(x)}" cy="${f1(midY + band * 0.55)}" r=".9" fill="${x % 18 < 9 ? '#ffe9a8' : team[0]}" opacity=".85"/>`;
	// LED pano: kalenin arkasında, ağın ardından görünür
	const ledY = standBot - 1;
	const ledH = Math.max(6, gh * 0.09);
	// saha: biçme bantları yakına doğru kalınlaşır, dikey şeritler kaçış noktasına toplanır; kalenin önünde ışık havuzu
	const pTop = ledY + ledH;
	const grassA = hava === 'kar' ? '#5c8c6c' : dusk ? '#3b7a33' : '#2a7a37';
	const grassB = hava === 'kar' ? '#527f62' : dusk ? '#336a2c' : '#22672f';
	let grass = `<rect x="0" y="${f1(pTop)}" width="${W}" height="${f1(H - pTop)}" fill="${grassB}"/>`;
	let y0 = pTop;
	let hh = Math.max(3, (gb - y0) * 0.5);
	for (let k = 0; y0 < H; k++) {
		if (k % 2 === 0) grass += `<rect x="0" y="${f1(y0)}" width="${W}" height="${f1(hh + 0.5)}" fill="${grassA}"/>`;
		y0 += hh;
		hh *= 1.32;
	}
	const vx = W / 2;
	const vy = gb - gh * 0.9; // kaçış noktası (göz hizası)
	const sw = W * 0.16; // dikey şerit genişliği (alt kenarda)
	const xAt = (xb, y) => vx + ((xb - vx) * (y - vy)) / (H - vy);
	for (let i = -6; i < 6; i += 2) {
		const a = vx + i * sw;
		const b = a + sw;
		grass += `<path d="M${f1(xAt(a, pTop))} ${f1(pTop)}L${f1(xAt(b, pTop))} ${f1(pTop)}L${f1(b)} ${f1(H)}L${f1(a)} ${f1(H)}Z" fill="rgba(255,255,255,.055)"/>`;
	}
	const pool = `<ellipse cx="${f1(W / 2)}" cy="${f1(gb + (H - gb) * 0.3)}" rx="${f1(W * 0.62)}" ry="${f1((H - gb) * 0.95 + gh * 0.2)}" fill="url(#pkpl${seed})"/>`;
	const ln = 'rgba(255,255,255,.85)';
	const y6 = gb + (L.by - gb) * 0.42; // altı pas çizgisi (kalenin önünde, perspektifte geniş)
	const lines = `<path d="M0 ${f1(gb)}H${W}" stroke="${ln}" stroke-width="2"/><path d="M0 ${f1(y6)}H${W}" stroke="${ln}" stroke-width="2.4"/>
		<path d="M${f1(xAt(W / 2 - gw * 0.98, gb))} ${f1(gb)}L${f1(W / 2 - gw * 1.1)} ${f1(y6)}M${f1(xAt(W / 2 + gw * 0.98, gb))} ${f1(gb)}L${f1(W / 2 + gw * 1.1)} ${f1(y6)}" stroke="${ln}" stroke-width="2" fill="none"/>`;
	const snowPatch = hava === 'kar' ? Array.from({ length: 16 }, () => `<ellipse cx="${f1(R() * W)}" cy="${f1(gb + R() * (H - gb))}" rx="${f1(6 + R() * 16)}" ry="${f1(2 + R() * 4)}" fill="#fff" opacity="${f1(0.18 + R() * 0.25)}"/>`).join('') : '';
	const edge = `<rect x="0" y="${f1(pTop)}" width="${W}" height="${f1(H - pTop)}" fill="url(#pked${seed})"/>`;
	const vb = `viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"`;
	const bg = `<svg class="pk-bg" ${vb}><defs>
		<linearGradient id="pksk${seed}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${f1(standTop + 8)}">${sky}</linearGradient>
		<radialGradient id="pkgl${seed}"><stop offset="0" stop-color="#fff8d8" stop-opacity=".95"/><stop offset=".35" stop-color="#fff2c0" stop-opacity=".35"/><stop offset="1" stop-color="#fff8d8" stop-opacity="0"/></radialGradient>
		<radialGradient id="pkpl${seed}"><stop offset="0" stop-color="#f6ffd8" stop-opacity=".34"/><stop offset=".55" stop-color="#e8ffc8" stop-opacity=".12"/><stop offset="1" stop-color="#e8ffc8" stop-opacity="0"/></radialGradient>
		<linearGradient id="pked${seed}" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".4"/><stop offset=".25" stop-color="#000" stop-opacity="0"/><stop offset=".75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>
		</defs>
		<rect width="${W}" height="${H}" fill="url(#pksk${seed})"/>${stars}${sun}
		<path d="M0 ${f1(standTop + 3)} Q${f1(W / 2)} ${f1(standTop - 6)} ${W} ${f1(standTop + 3)} V${f1(standBot)} H0Z" fill="${dusk ? '#22122c' : '#0a1130'}"/>
		<path d="M0 ${f1(standTop + 3)} Q${f1(W / 2)} ${f1(standTop - 6)} ${W} ${f1(standTop + 3)}" stroke="rgba(200,215,255,.35)" stroke-width="1" fill="none"/>
		${roof}${rigs.map(rig).join('')}<rect x="0" y="${f1(ledY)}" width="${W}" height="${f1(ledH)}" fill="#070b1e"/>${grass}${pool}${snowPatch}${lines}${edge}</svg>`;
	const crowd = `<svg class="pk-crowd" ${vb}><defs><linearGradient id="pkcf${seed}" gradientUnits="userSpaceOnUse" x1="0" y1="${f1(standTop)}" x2="0" y2="${f1(standBot)}"><stop offset="0" stop-color="#040818" stop-opacity=".62"/><stop offset=".5" stop-color="#040818" stop-opacity=".3"/><stop offset="1" stop-color="#040818" stop-opacity=".12"/></linearGradient></defs>
		${heads}<rect x="0" y="${f1(standTop)}" width="${W}" height="${f1(standBot - standTop)}" fill="url(#pkcf${seed})"/>${rail}</svg>`;
	const beams = `<svg class="pk-beams" ${vb}><defs><linearGradient id="pkbm${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe0" stop-opacity="${dusk ? 0.16 : 0.3}"/><stop offset=".55" stop-color="#fffbe0" stop-opacity="${dusk ? 0.05 : 0.09}"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/></linearGradient>
		<linearGradient id="pkls${seed}"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
		<radialGradient id="pkgl${seed}b"><stop offset="0" stop-color="#fff8d8" stop-opacity=".9"/><stop offset="1" stop-color="#fff8d8" stop-opacity="0"/></radialGradient></defs>
		${beam(rigs[0], -1)}${beam(rigs[1], 1)}${rigs.map(glare).join('').replaceAll(`url(#pkgl${seed})`, `url(#pkgl${seed}b)`)}</svg>`;
	return { bg, crowd, beams, flashes, flags, led: { y: ledY + 1, h: ledH - 2 }, stand: { top: standTop, bot: standBot }, pTop };
}

/** Ağ: altıgen örgülü arka ağ ve tavan, baklava örgülü yan ağlar, koyu ağ tabanı, arka direkler; dalga halkaları. */
function netSVG(L, seed) {
	const { W, H, gx, gy, gw, gh, gb } = L;
	const bx0 = gx + gw * 0.07;
	const bx1 = gx + gw * 0.93;
	const by0 = gy + gh * 0.1;
	const by1 = gb - gh * 0.12;
	const s = Math.max(3.6, gw / 70); // altıgen kenarı
	const hw = s * 1.732;
	const hex = `M0 ${f1(s / 2)}L${f1(hw / 2)} 0L${f1(hw)} ${f1(s / 2)}M0 ${f1(s / 2)}V${f1(s * 1.5)}M${f1(hw)} ${f1(s / 2)}V${f1(s * 1.5)}M0 ${f1(s * 1.5)}L${f1(hw / 2)} ${f1(s * 2)}L${f1(hw)} ${f1(s * 1.5)}M${f1(hw / 2)} ${f1(s * 2)}V${f1(s * 3)}`;
	const m = Math.max(6, gw / 38);
	return `<svg class="pk-net" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs>
		<pattern id="pkh${seed}" width="${f1(hw)}" height="${f1(s * 3)}" patternUnits="userSpaceOnUse" x="${f1(bx0)}" y="${f1(by0)}"><path d="${hex}" stroke="rgba(235,242,255,.5)" stroke-width="1" fill="none"/></pattern>
		<pattern id="pkm2${seed}" width="${f1(m)}" height="${f1(m)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0H${f1(m)}M0 0V${f1(m)}" stroke="rgba(235,242,255,.3)" stroke-width="1"/></pattern>
		<linearGradient id="pkfl${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03140a" stop-opacity=".55"/><stop offset="1" stop-color="#03140a" stop-opacity=".15"/></linearGradient>
		<radialGradient id="pkbk${seed}" cx=".5" cy=".55" r=".7"><stop offset="0" stop-color="#060c24" stop-opacity=".15"/><stop offset="1" stop-color="#060c24" stop-opacity=".5"/></radialGradient>
		</defs>
		<path d="M${f1(gx)} ${f1(gb)} L${f1(bx0)} ${f1(by1)} H${f1(bx1)} L${f1(gx + gw)} ${f1(gb)}Z" fill="url(#pkfl${seed})"/>
		<rect x="${f1(bx0)}" y="${f1(by0)}" width="${f1(bx1 - bx0)}" height="${f1(by1 - by0)}" fill="url(#pkbk${seed})"/>
		<g class="mesh">
		<path d="M${f1(gx)} ${f1(gy)} L${f1(bx0)} ${f1(by0)} L${f1(bx0)} ${f1(by1)} L${f1(gx)} ${f1(gb)}Z" fill="rgba(4,8,24,.38)"/>
		<path d="M${f1(gx + gw)} ${f1(gy)} L${f1(bx1)} ${f1(by0)} L${f1(bx1)} ${f1(by1)} L${f1(gx + gw)} ${f1(gb)}Z" fill="rgba(4,8,24,.38)"/>
		<path d="M${f1(gx)} ${f1(gy)} L${f1(bx0)} ${f1(by0)} H${f1(bx1)} L${f1(gx + gw)} ${f1(gy)}Z" fill="url(#pkh${seed})" opacity=".75"/>
		<path d="M${f1(gx)} ${f1(gy)} L${f1(bx0)} ${f1(by0)} L${f1(bx0)} ${f1(by1)} L${f1(gx)} ${f1(gb)}Z" fill="url(#pkm2${seed})"/>
		<path d="M${f1(gx + gw)} ${f1(gy)} L${f1(bx1)} ${f1(by0)} L${f1(bx1)} ${f1(by1)} L${f1(gx + gw)} ${f1(gb)}Z" fill="url(#pkm2${seed})"/>
		<rect class="back" x="${f1(bx0)}" y="${f1(by0)}" width="${f1(bx1 - bx0)}" height="${f1(by1 - by0)}" fill="url(#pkh${seed})"/>
		<path d="M${f1(bx0)} ${f1(by1)} L${f1(gx)} ${f1(gb)} M${f1(bx1)} ${f1(by1)} L${f1(gx + gw)} ${f1(gb)} M${f1(bx0)} ${f1(by0)} V${f1(by1)} H${f1(bx1)} V${f1(by0)} H${f1(bx0)}" stroke="rgba(235,242,255,.55)" stroke-width="1.3" fill="none"/>
		<path d="M${f1(gx)} ${f1(gy)} L${f1(bx0)} ${f1(by0)} M${f1(gx + gw)} ${f1(gy)} L${f1(bx1)} ${f1(by0)}" stroke="rgba(200,210,230,.75)" stroke-width="2" fill="none"/>
		</g><circle class="rip a" r="6"/><circle class="rip b" r="6"/></svg>`;
}

// ---------------------------------------------------------------- tip

/** Kaçan şutun biçimi (yanlış cevap, kaleci başka köşede): üst köşede üst direk ya da üstten aut, altta direk ya da aut. */
function missOf(c, key) {
	const h = rngOf(key)();
	if (c < 2) return h < 0.5 ? 'direk' : 'ust';
	return h < 0.5 ? 'direk' : 'aut';
}
const CALL = { gol: ['GOL!', ''], kurtardi: ['KURTARDI!', 'save'], direk: ['DİREK!', 'bad'], ust: ['ÜSTTEN AUT!', 'bad'], aut: ['AUT!', 'bad'] };
/** Kalkış ve ağır çekim: top u=0.24'e fırlar, sonra cevap gelene dek süzülür (CREEP sn boyunca, bileşikçide). */
const CREEP = 9;
const uAt = (s) => (s < 0.24 ? 0.24 * ease(s / 0.24) : 0.24 + 0.12 * (1 - Math.exp(-(s - 0.24) / 2.2)));
const GHOST = [0.5, 0.3, 0.16]; // hız izinin saydamlıkları (topun ardında)
/** Cevap uçuşu: zaman payı → yol payı. Önce hızlı, çizgiye yakın ağır çekim (%50–86), sonra ağa gömülür. */
const lane = (tau) => (tau < 0.5 ? 0.88 * (1 - Math.pow(1 - tau / 0.5, 1.7)) : tau < 0.86 ? 0.88 + 0.095 * ((tau - 0.5) / 0.36) : 0.975 + 0.025 * Math.pow((tau - 0.86) / 0.14, 1.3));

let UID = 0;

export const penalti = {
	time: 20,
	label: 'Penaltı',
	kind: 'exact',
	cover: true, // tam ekran stadyum (harita gizli)
	revealMs: 3600, // cevap filmi: şut, çizgide ağır çekim, kalecinin uçuşu, gol ya da kaçan top, herkesin şut işareti
	jokers: ['yari', 'kahin'],
	prepare(q, R) {
		const order = shuffle([0, 1, 2, 3], R);
		const v = { q, opts: order.map((i) => q.a[i]), right: order.indexOf(0), hava: HAVA.includes(q.hava) ? q.hava : 'gece' };
		// iş: soru + dört pano (şık yazıları ve köşeler arası bakış), sahneye bir bakış (kaleci, top), köşeye dokun
		return stamp(v, q, (q2, k, P, text) => {
			for (const o of q.a) text(o);
			return { look: LOOK.orient + 5 * LOOK.gaze };
		});
	},
	/** Çevrimiçi görünüm: doğru köşe ve verideki şık sırası yok. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.right;
		delete o.q.a;
		return o;
	},
	judge(v, value) {
		const ok = Number.isInteger(value) && value === v.right;
		return { correct: ok, err: ok ? 0 : 1 };
	},
	bot(v, skill, R) {
		const ok = R() < pCorrect(skill, v.q.diff);
		let value = v.right;
		if (!ok) do value = Math.floor(R() * 4); while (value === v.right);
		return { value, time: botTime(v, R, skill, 0.05, 0.8) };
	},
	/** Sınama örneği (test/deneme.test.mjs): doğru köşe ve yanındaki köşe. */
	ornek(v) {
		return { good: v.right, bad: (v.right + 1) % 4 };
	},
	joker(id, v, R) {
		if (id === 'yari') {
			const wrong = shuffle([0, 1, 2, 3].filter((i) => i !== v.right), R);
			return { hide: wrong.slice(0, 2).sort((a, b) => a - b) };
		}
		if (id === 'kahin') {
			// seyirci: doğru köşeye %42–78 (zor soruda daha az), ara sıra (%12) kalabalık yanılır
			const d = clamp(Number(v.q.diff) || 2, 1, 3);
			const pr = 0.42 + R() * 0.2 + (3 - d) * 0.08;
			let top = v.right;
			if (R() < 0.12) do top = Math.floor(R() * 4); while (top === v.right);
			const w = [0, 1, 2, 3].map((i) => (i === top ? 0 : 0.35 + R()));
			const s = w.reduce((a, b) => a + b, 0) || 1;
			const pct = w.map((x) => Math.round((x / s) * (100 - Math.round(pr * 100))));
			pct[top] = 100 - pct.reduce((a, b) => a + b, 0);
			return { pct };
		}
		return null;
	},
	mount(el, v, api) {
		css('penalti', CSS);
		const app = appOf();
		const card = el.closest('.fl-q');
		const m = app?.match;
		const cur = m?.cur && m.cur.v === v ? m.cur : null;
		const ctx = cur?.ctx || {};
		const id = ++UID;
		// oyuncular: kartın afişindeki plakalardan (portre, ad, renk); şutçu insan, kaleci onun rakibi
		const plates = [...(card?.querySelectorAll('.fl-qwho .fl-qp[data-p]') || [])];
		const P = plates.map((e) => {
			const i = Number(e.dataset.p);
			const p = m?.players?.[i];
			return { i, p, name: p?.name || e.querySelector('.nm b')?.textContent || '', color: p?.css || getComputedStyle(e).getPropertyValue('--pc').trim() || '#888', av: e.querySelector('.fl-av')?.outerHTML || '', human: !!p?.human, team: p?.team, score: p?.score || 0 };
		});
		if (!P.length) P.push({ i: -1, name: 'Sen', color: '#e8343c', av: '', human: true }, { i: -2, name: 'Kaleci', color: '#2f6bff', av: '', human: false });
		const shooter = P.find((x) => x.human) || P.find((x) => x.i === ctx.attacker?.i) || P[0];
		const duel = !!(ctx.attacker && ctx.defender);
		let keeper = null;
		if (duel) keeper = P.find((x) => x !== shooter && (x.i === ctx.defender.i || x.i === ctx.attacker.i));
		if (!keeper) {
			const foes = P.filter((x) => x !== shooter && (m?.mode?.teams && shooter.team != null ? x.team !== shooter.team : true));
			keeper = (foes.length ? foes : P.filter((x) => x !== shooter)).slice().sort((a, b) => b.score - a.score)[0] || null;
		}
		const kc = keeper?.color || '#2f6bff';
		const human = P.some((x) => x.human);
		el.innerHTML = `<div class="yn-pk" data-hava="${v.hava}" style="--me:${esc(shooter.color)};--kc:${esc(kc)};--kd:color-mix(in srgb,${esc(kc)} 55%,#000);--kl:color-mix(in srgb,${esc(kc)} 62%,#fff)">
			<div class="pk-st"><div class="pk-cam">
				<div class="pk-far"></div><div class="pk-netw"></div>${v.hava === 'kar' ? '<div class="pk-snow"></div>' : ''}
				<div class="pk-spot"></div><div class="pk-shadow"></div>
				<div class="pk-kp"><div class="kp-in">${keeperSVG(id)}<div class="kp-head">${keeper?.av || ''}</div></div></div>
				<i class="pk-lb t"></i><i class="pk-lb b"></i>
				${v.opts.map((o, i) => `<button class="pk-t ${CORNER[i]}" data-i="${i}" style="--lc:${LCOL[i]};--sd:${(i * 1.3 + 0.6).toFixed(1)}s" aria-label="${LETTER[i]}: ${esc(o)}"><i class="gl"></i><i class="sw"></i><b class="pk-tx">${esc(o)}</b></button>`).join('')}
				<div class="pk-fr"><i class="post l"></i><i class="post r"></i><i class="bar">${v.hava === 'kar' ? '<s class="snow"></s>' : ''}</i></div>
				${LETTER.map((x, i) => `<span class="pk-l" style="--lc:${LCOL[i]}">${x}</span>`).join('')}
				<div class="pk-boot">${bootSVG(id)}</div>${GHOST.map(() => '<i class="pk-gh"></i>').join('')}<div class="pk-ball"><div class="spin">${ballSVG(id)}</div><i class="sh"></i></div>
				${human ? '<span class="pk-hint">KÖŞENİ SEÇ</span>' : ''}
				${keeper ? `<span class="pk-tag k" style="--tc:${esc(kc)}">${keeper.av}<small>KALECİ</small><b>${esc(keeper.name)}</b></span>` : ''}
				<div class="pk-vig"></div><div class="pk-fx"></div>
			</div></div></div>`;
		const root = el.querySelector('.yn-pk');
		const st = root.querySelector('.pk-st');
		const camEl = root.querySelector('.pk-cam');
		const far = root.querySelector('.pk-far');
		const kp = root.querySelector('.pk-kp');
		const ball = root.querySelector('.pk-ball');
		const spin = ball.querySelector('.spin');
		const ghosts = [...root.querySelectorAll('.pk-gh')];
		const boot = root.querySelector('.pk-boot');
		const shadow = root.querySelector('.pk-shadow');
		const spot = root.querySelector('.pk-spot');
		const tiles = [...root.querySelectorAll('.pk-t')];
		const chips = [...root.querySelectorAll('.pk-l')];
		const fr = root.querySelector('.pk-fr');
		const fx = root.querySelector('.pk-fx');
		const hint = root.querySelector('.pk-hint');
		const tagK = root.querySelector('.pk-tag.k');
		const timers = [];
		const later = (fn, ms) => timers.push(setTimeout(fn, ms));
		let L = null;
		let done = false;
		let revealed = false;
		let alive = true;
		let flight = null; // ağır çekim: { t0, path, c, anims }
		let frozen = false; // cevap: kale yerinde kalır, sahne aşağı büyür
		let pollPct = null;

		// ------------------------------------------------------------ yerleşim (ölçülen sahne boyuna göre)
		const place = (e, x, y, w, h) => {
			e.style.left = f1(x) + 'px';
			e.style.top = f1(y) + 'px';
			if (w != null) e.style.width = f1(w) + 'px';
			if (h != null) e.style.height = f1(h) + 'px';
		};
		const layout = () => {
			const W = st.clientWidth;
			const H = st.clientHeight;
			if (!W || !H || (L && L.W === W && L.H === H)) return;
			const mk = clamp(Math.round(W * 0.082), 24, 34);
			// cevapta joker çubuğu kalkar, sahne yalnız aşağı doğru büyür: kale yerinde kalır (şut anında sıçramasın),
			// yalnız saha uzar; alt köşelerin şut işaretleri kale çizgisinin altına
			const keep = frozen && L && L.W === W;
			let pad, laneT, laneB, gw, gh, gy;
			if (keep) ({ pad, laneT, laneB, gw, gh, gy } = L);
			else {
				pad = clamp(Math.round(W * 0.03), 6, 14);
				laneT = clamp(Math.round(H * 0.11), mk + 6, 48);
				laneB = clamp(Math.round(H * 0.05), 6, 32);
				const ballZ = clamp(Math.round(H * 0.2), 38, 150);
				gw = Math.min(W - 2 * pad, 560);
				gh = Math.max(104, Math.min(gw * 0.64, H - laneT - laneB - ballZ - 6));
				const extra = Math.max(0, H - laneT - laneB - ballZ - gh);
				gy = Math.round(laneT + extra * 0.5);
			}
			const gx = Math.round((W - gw) / 2);
			const gb = gy + gh;
			const pt = clamp(Math.round(gw * 0.024), 5, 12);
			const ix = gx + pt;
			const iy = gy + pt;
			const iw = gw - 2 * pt;
			const ih = gh - pt;
			const cg = clamp(Math.round(iw * 0.2), 54, 112);
			const mg = clamp(Math.round(ih * 0.07), 6, 18);
			const ins = clamp(Math.round(iw * 0.016), 3, 8);
			const pw = (iw - cg - 2 * ins) / 2;
			const ph = (ih - mg - 2 * ins) / 2;
			const pan = [
				{ x: ix + ins, y: iy + ins },
				{ x: ix + iw - ins - pw, y: iy + ins },
				{ x: ix + ins, y: iy + ih - ins - ph },
				{ x: ix + iw - ins - pw, y: iy + ih - ins - ph },
			].map((p) => ({ ...p, w: pw, h: ph, cx: p.x + pw / 2, cy: p.y + ph / 2 }));
			const kh = ih * 0.92;
			const kw = kh * (100 / 150);
			const bs = keep ? L.bs : clamp(Math.round(Math.min(W * 0.12, (H - gb - laneB) * 0.56)), 26, 64);
			const by = keep ? L.by : gb + laneB + (H - gb - laneB) * 0.47;
			// alt köşelerin şut işaretleri: kale çizgisinin altında (cevapta künye ve krampon söner, yer açılır)
			const mby = gb + clamp((H - gb) * 0.28, mk * 0.5 + 6, mk * 0.5 + 16);
			L = { W, H, pad, laneT, laneB, gx, gy, gw, gh, gb, pt, ix, iy, iw, ih, cg, pan, kw, kh, kx: W / 2 - kw / 2, ky: gb - kh, bs, bx: W / 2, by, mk, mby };
			root.style.setProperty('--mk', L.mk + 'px');
			root.style.setProperty('--lb', f1(clamp(H * 0.035, 6, 16)) + 'px');
			const S = stadium(L, v.hava, [shooter.color, kc], `${v.q.id || 'pk'}${id}`);
			const fl = S.flags.map((f) => `<span class="pk-flag" style="left:${f1(f.x)}px;top:${f1(f.y - f.h * 1.7)}px;--fw:${f1(f.h * 1.6)}px;--fh:${f1(f.h)}px;--fh2:${f1(f.h * 1.7)}px;--c:${esc(f.c)};--dl:-${f.k * 0.4}s"><b></b></span>`).join('');
			const fs = S.flashes.map((f) => `<i style="left:${f1(f.x)}px;top:${f1(f.y)}px;--r:${f1(f.r * 2)}px;--dl:${f1(f.dl)}s;--du:${f1(f.du)}s"></i>`).join('');
			const sh = S.stand.bot - S.stand.top;
			far.innerHTML = `${S.bg}${S.crowd}<div class="pk-fls">${fs}</div><i class="pk-sw" style="top:${f1(S.stand.top)}px;height:${f1(sh)}px"></i><i class="pk-glow" style="top:${f1(S.stand.top)}px;height:${f1(sh)}px"></i>${fl}${S.beams}<div class="pk-led" style="top:${f1(S.led.y)}px;height:${f1(Math.max(2, S.led.h))}px"><i></i></div><i class="pk-haze" style="top:${f1(S.stand.top + sh * 0.35)}px;height:${f1(S.pTop - S.stand.top - sh * 0.35 + (gb - S.pTop) * 0.6)}px"></i>`;
			root.querySelector('.pk-netw').innerHTML = netSVG(L, `${id}`);
			const snow = root.querySelector('.pk-snow');
			if (snow) {
				// kar: tanecikler açık değerli WAAPI devinimiyle düşer (bileşikçide); azaltılmış devinimde yerinde durur
				const R = rngOf(v.q.id || 'kar');
				const still = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
				const flakes = Array.from({ length: 26 }, (_, k) => ({ x: R() * W, y: R() * H, s: k % 6 ? 3 + R() * 2.6 : 6.5 + R() * 2.5, d: (k % 6 ? 3.4 + R() * 3 : 2.2 + R()) * 1000, dl: R(), dx: (R() - 0.5) * 40 }));
				snow.innerHTML = flakes.map((f) => `<i style="left:${f1(f.x)}px;${still ? `top:${f1(f.y)}px;` : ''}--s:${f1(f.s)}px"></i>`).join('');
				if (!still)
					[...snow.children].forEach((e, k) => {
						const f = flakes[k];
						e.animate?.([{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(${f1(f.dx)}px,${f1(H + 16)}px,0)` }], { duration: Math.round(f.d), delay: -Math.round(f.dl * f.d), iterations: Infinity, easing: 'linear' });
					});
			}
			tiles.forEach((t, i) => place(t, pan[i].x, pan[i].y, pan[i].w, pan[i].h));
			const cx = [gx, gx + gw, gx, gx + gw];
			chips.forEach((c, i) => place(c, cx[i] + (i % 2 ? -pt / 2 : pt / 2), i < 2 ? gy + pt / 2 : gb - pt * 0.2 - 12));
			place(fr, gx, gy, gw, gh);
			const [pl, pr, bar] = fr.children;
			place(pl, 0, 0, pt, gh);
			place(pr, gw - pt, 0, pt, gh);
			place(bar, 0, 0, gw, pt);
			place(kp, L.kx, L.ky, kw, kh);
			const sw0 = bs * 0.95;
			shadow.style.width = f1(sw0) + 'px';
			shadow.style.height = f1(sw0 * 0.28) + 'px';
			for (const g of ghosts) g.style.width = g.style.height = bs + 'px';
			if (!flight && !revealed) setBall(L.bx, by, 1);
			place(spot, L.bx - bs * 0.42, by + bs * 0.32, bs * 0.84, bs * 0.26);
			if (hint) place(hint, W / 2, laneT * 0.5 + 2);
			// şutçunun kramponu topun solunda (dokununca vurur)
			const bw2 = bs * 1.9;
			place(boot, L.bx - bs * 0.42 - bw2 * 0.9, by + bs * 0.5 - bw2 * 0.52, bw2, bw2 * (70 / 120));
			if (tagK) {
				// kalecinin künyesi topun sağında; sığmazsa yalnız portre ve KALECİ (top yazının üstüne binmesin)
				tagK.classList.remove('short');
				tagK.style.left = f1(L.bx + bs * 0.75 + 8) + 'px';
				tagK.style.top = f1(Math.min(H - 16, by + bs * 0.1)) + 'px';
				if (tagK.offsetLeft + tagK.offsetWidth > W - 6) tagK.classList.add('short');
			}
			fit();
			if (pollPct) poll(pollPct);
		};
		/** Topun dönüşümü (merkez x, y, ölçek k) ve yerdeki gölgesi (kale çizgisine doğru küçülür). */
		const tfOf = (x, y, k) => `translate(${f1(x - L.bs / 2)}px,${f1(y - L.bs / 2)}px) scale(${k.toFixed(3)})`;
		const shadowOf = (x, y, k) => {
			const sw0 = L.bs * 0.95;
			const gy0 = L.by + L.bs * 0.42;
			const t = clamp((L.by - y) / Math.max(1, L.by - L.gy), 0, 1);
			const yy = gy0 + (L.gb - gy0) * Math.min(1, t * 1.1);
			return { transform: `translate(${f1(x - sw0 / 2)}px,${f1(yy - sw0 * 0.14)}px) scale(${k.toFixed(3)})`, opacity: 1 - t * 0.6 };
		};
		const setBall = (x, y, k) => {
			ball.style.width = ball.style.height = L.bs + 'px';
			ball.style.transform = tfOf(x, y, k);
			for (const g of ghosts) g.style.opacity = '0';
			const s = shadowOf(x, y, k);
			shadow.style.transform = s.transform;
			shadow.style.opacity = String(s.opacity);
		};

		// ------------------------------------------------------------ pano yazısı: kutuya sığan en büyük boy
		const fit = () => {
			for (const t of tiles) {
				const tx = t.querySelector('.pk-tx');
				if (!tx || !t.clientWidth) continue;
				const maxW = t.clientWidth - 12;
				const maxH = t.clientHeight - 9;
				const hi = clamp(Math.min(t.clientHeight * 0.36, t.clientWidth * 0.17), 11, 21);
				const over = () => tx.scrollWidth > maxW + 0.5 || tx.scrollHeight > maxH + 0.5; // (max-height kırpar: içerik boyu ölçülür)
				let lo = 8.5;
				let up = hi;
				tx.style.fontSize = up + 'px';
				if (!over()) continue;
				for (let k = 0; k < 9 && up - lo > 0.4; k++) {
					const mid = (lo + up) / 2;
					tx.style.fontSize = mid + 'px';
					if (over()) up = mid;
					else lo = mid;
				}
				tx.style.fontSize = Math.floor(lo * 2) / 2 + 'px';
			}
		};
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => layout()) : null;
		ro?.observe(st);
		layout();
		requestAnimationFrame(layout);
		document.fonts?.ready?.then(() => {
			if (alive) fit();
		});

		// ------------------------------------------------------------ şut: kalkış, ağır çekim, devam
		/** Uçuş yolu (ikinci derece Bezier, falso): yan sapmayla başlar, köşeye kıvrılır. */
		const pathTo = (tx, ty) => {
			const side = tx < L.bx ? -1 : 1;
			const cx = L.bx + (tx - L.bx) * 0.08 - side * L.W * 0.16;
			const cy = L.by + (ty - L.by) * 0.78;
			return { x0: L.bx, y0: L.by, cx, cy, x1: tx, y1: ty };
		};
		const at = (p, u) => ({ x: (1 - u) * (1 - u) * p.x0 + 2 * u * (1 - u) * p.cx + u * u * p.x1, y: (1 - u) * (1 - u) * p.y0 + 2 * u * (1 - u) * p.cy + u * u * p.y1 });
		const kOf = (u, k1) => 1 + (k1 - 1) * Math.pow(u, 0.85);
		const K1 = 0.42; // kale düzlemindeki ölçek
		/** Krampon vuruşu: ayak bileğinden öne savrulur, geri çekilir. */
		const swing = () =>
			boot.animate(
				[
					{ transform: 'rotate(-16deg)' },
					{ transform: 'rotate(-30deg) translateX(-4%)', offset: 0.3 },
					{ transform: 'rotate(14deg) translateX(10%)', offset: 0.55 },
					{ transform: 'rotate(8deg) translateX(8%)', offset: 0.75 },
					{ transform: 'rotate(-16deg)' },
				],
				{ duration: 620, easing: 'cubic-bezier(.3,.7,.4,1)' },
			);
		/** Kamera itişi: uzak katman hedef köşeye doğru yaklaşır (paralaks). */
		const aimCam = (tx, ty) => {
			far.style.transformOrigin = `${f1(tx)}px ${f1(ty)}px`;
		};
		/**
		 * Kalkış (dokununca): top u=0.24'e fırlar, sonra ağır çekimde süzülür (cevap gelene dek). Bütünü tek bir Web Animations
		 * devinimi (bileşikçide; kare başına ana iş parçacığında iş yok); hız izi ve gölge aynı yoldan.
		 */
		const kick = (c) => {
			if (!L || flight) return;
			const t = L.pan[c];
			const path = pathTo(t.cx, t.cy);
			flight = { t0: clock.now(), path, c, anims: [] };
			aimCam(t.cx, t.cy);
			const S = [0, 0.04, 0.08, 0.12, 0.16, 0.2, 0.24, 0.4, 0.7, 1.1, 1.7, 2.5, 3.6, 5, 7, CREEP];
			const pts = S.map((s) => {
				const u = uAt(s);
				const p = at(path, u);
				return { ...p, k: kOf(u, K1), offset: s / CREEP };
			});
			const dur = CREEP * 1000;
			flight.anims.push(ball.animate(pts.map((p) => ({ transform: tfOf(p.x, p.y, p.k), offset: p.offset })), { duration: dur, fill: 'forwards' }));
			ghosts.forEach((g, j) =>
				flight.anims.push(g.animate(pts.map((p, i) => ({ transform: tfOf(p.x, p.y, p.k), opacity: S[i] > 0 && S[i] <= 0.24 ? GHOST[j] : 0, offset: p.offset })), { duration: dur, delay: (j + 1) * 34, fill: 'both' })),
			);
			flight.anims.push(shadow.animate(pts.map((p) => ({ ...shadowOf(p.x, p.y, p.k), offset: p.offset })), { duration: dur, fill: 'forwards' }));
			flight.anims.push(spin.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(330deg)', offset: 0.03 }, { transform: 'rotate(800deg)' }], { duration: dur, fill: 'forwards' }));
			swing();
			sfx(app, 'tap', { rate: 0.55 });
			sfx(app, 'whoosh');
			buzz(14);
			// ağır çekimde stat susar, kalp atışı: cevap gelene dek her 0,6 sn bir tok vuruş
			for (const ms of [380, 980, 1580]) later(() => !revealed && alive && sfx(app, 'count', { left: 2 }), ms);
		};
		/**
		 * Kalan uçuş ve ardından gelen (düşüş, sekme, sönme): tek bir Web Animations devinimi. Kare hızından bağımsızdır
		 * (yavaş telefonda ve denetim aracında da son kare doğru: aracın finish()'i sona sarar); son durum öğenin kendi
		 * stilidir. Çizgiye yakın ağır çekim (lane). tail: [{ x, y, k, o, ms }] uçuştan sonraki duraklar.
		 */
		const fly = (path, u0, ms, tail = []) => {
			let from = null;
			if (flight?.anims) {
				// ağır çekimdeki yerinden (ekrandaki gerçek dönüşüm) yeni yola yumuşakça geçilir
				const mm = /matrix\(([^)]+)\)/.exec(getComputedStyle(ball).transform || '');
				if (mm) {
					const n = mm[1].split(',').map(Number);
					from = { x: n[4] + L.bs / 2, y: n[5] + L.bs / 2 };
				}
				for (const a of flight.anims) a.cancel();
			}
			flight = { ...(flight || {}), fast: true, anims: [] };
			const total = ms + tail.reduce((a, t) => a + t.ms, 0);
			const q0 = at(path, u0);
			const N = 20;
			const pts = [];
			for (let i = 0; i <= N; i++) {
				const tau = i / N;
				const u = u0 + (1 - u0) * lane(tau);
				const p = at(path, u);
				if (from && tau < 0.25) {
					const b = 1 - easeIO(tau / 0.25);
					p.x += (from.x - q0.x) * b;
					p.y += (from.y - q0.y) * b;
				}
				pts.push({ x: p.x, y: p.y, k: kOf(u, K1), o: 1, offset: (tau * ms) / total, slow: tau > 0.5 && tau < 0.86 });
			}
			let t = ms;
			for (const s of tail) {
				t += s.ms;
				pts.push({ x: s.x, y: s.y, k: s.k, o: s.o, offset: t / total, easing: s.ease || 'linear', tail: true });
			}
			const last = pts[pts.length - 1];
			ball.style.width = ball.style.height = L.bs + 'px';
			ball.style.transform = tfOf(last.x, last.y, last.k);
			ball.style.opacity = String(last.o);
			ball.animate(
				pts.map((p) => ({ transform: tfOf(p.x, p.y, p.k), opacity: p.o, offset: p.offset, ...(p.easing ? { easing: p.easing } : {}) })),
				{ duration: total, easing: 'linear' },
			);
			ghosts.forEach((g, j) => {
				g.style.opacity = '0';
				g.animate(
					pts.map((p, i) => ({ transform: tfOf(p.x, p.y, p.k), opacity: p.tail || i === 0 ? 0 : p.slow ? GHOST[j] * 0.4 : GHOST[j], offset: p.offset })),
					{ duration: total, delay: (j + 1) * 30, fill: 'backwards', easing: 'linear' },
				);
			});
			spin.style.transform = 'rotate(1100deg)';
			spin.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(700deg)', offset: (0.5 * ms) / total }, { transform: 'rotate(900deg)', offset: (0.86 * ms) / total }, { transform: 'rotate(1100deg)' }], { duration: total, easing: 'linear' });
			const s0 = shadowOf(pts[0].x, pts[0].y, pts[0].k);
			shadow.style.opacity = '0';
			shadow.animate([{ ...s0 }, { ...shadowOf(pts[N].x, pts[N].y, pts[N].k), opacity: 0 }], { duration: Math.min(ms, 520) });
		};

		// ------------------------------------------------------------ dokunuş
		const pick = (i) => {
			if (done || revealed || !human) return;
			done = true;
			root.classList.add('pick', 'slow');
			tiles[i].classList.add('aim');
			for (const t of tiles) t.disabled = true;
			kick(i);
			api.answer(i);
		};
		for (const t of tiles) t.addEventListener('click', () => pick(Number(t.dataset.i)));
		if (!human) for (const t of tiles) t.disabled = true;
		const stopOpen = onOpen(el, () => {
			if (alive && L) layout();
		});

		// ------------------------------------------------------------ jokerler
		const poll = (pct) => {
			pollPct = pct;
			for (const e of root.querySelectorAll('.pk-poll,.pk-pc')) e.remove();
			if (!L || revealed) return;
			const sum = tiles.reduce((a, t, i) => a + (t.classList.contains('gone') ? 0 : pct[i] || 0), 0) || 1;
			tiles.forEach((t, i) => {
				if (t.classList.contains('gone')) return;
				const pc = Math.round(((pct[i] || 0) / sum) * 100);
				t.insertAdjacentHTML('beforeend', `<span class="pk-pc" style="--w:${(pc / 100).toFixed(2)}"><i></i></span>`);
				const p = L.pan[i];
				// oy etiketi panonun dışında: üst köşelerde üst direğin üstü, altta kale çizgisinin altı (yazıya binmez)
				const y = i < 2 ? L.gy - L.laneT * 0.5 : L.gb + Math.max(9, L.laneB * 0.5);
				const x = i % 2 ? p.x + p.w - 26 : p.x + 26;
				camEl.insertAdjacentHTML('beforeend', `<span class="pk-poll" style="left:${f1(x)}px;top:${f1(y)}px">%${pc}</span>`);
			});
		};

		// ------------------------------------------------------------ cevap filmi
		const confetti = (n, cols) => {
			if (!L) return;
			const R = rngOf(`${v.q.id}cf`);
			let h = '';
			for (let k = 0; k < n; k++) {
				const x = L.gx + R() * L.gw;
				h += `<i class="cf" style="left:${f1(x)}px;--w:${f1(4 + R() * 5)}px;--h:${f1(6 + R() * 7)}px;--c:${cols[k % cols.length]};--x:${f1((R() - 0.5) * 120)}px;--y:${f1(L.H * (0.55 + R() * 0.5))}px;--r:${Math.round(360 + R() * 900)}deg;--d:${Math.round(1300 + R() * 900)}ms;--dl:${Math.round(R() * 260)}ms"></i>`;
			}
			fx.insertAdjacentHTML('beforeend', h);
			later(() => {
				for (const e of fx.querySelectorAll('.cf')) e.remove();
			}, 2800);
		};
		const rings = (x, y, s = 4) => {
			fx.insertAdjacentHTML('beforeend', `<i class="rg" style="left:${f1(x)}px;top:${f1(y)}px;--s:${s}"></i><i class="rg" style="left:${f1(x)}px;top:${f1(y)}px;--s:${s * 1.6};animation-delay:.12s"></i>`);
			later(() => {
				for (const e of fx.querySelectorAll('.rg')) e.remove();
			}, 1200);
		};
		/** Ağın şişmesi: çarpma noktasında gerilen örgü (panonun üstünde görünür), kısa sürer. */
		const bulge = (x, y) => {
			fx.insertAdjacentHTML('beforeend', `<i class="bg" style="left:${f1(x)}px;top:${f1(y)}px;--s:${f1(L.gw * 0.42)}px"></i>`);
			later(() => fx.querySelector('.bg')?.remove(), 900);
		};
		const call = (kind, y) => {
			const [t, cls] = CALL[kind] || ['', ''];
			if (!t) return;
			fx.insertAdjacentHTML('beforeend', `<b class="pk-call ${cls}" style="top:${f1(y)}px;font-size:${f1(Math.min(clamp(L.W * 0.15, 30, 64), (L.W - 28) / ([...t].length * 0.66)))}px">${esc(t)}</b>`); // uzun hüküm (ÜSTTEN AUT!) sahneye sığar
			later(() => fx.querySelector('.pk-call')?.remove(), 1600);
		};
		/** Kalecinin uçuşu: köşeye (ya da ortada kalır); sonunda kalkıp ortaya döner. */
		const DIVE = 1900;
		const dive = (c, catchIt, tHit = 560) => {
			if (!L) return;
			kp.classList.add('dive', 'fly');
			if (c == null) {
				kp.animate([{ transform: 'none' }, { transform: 'translateY(-4%) scale(1.03)' }, { transform: 'none' }], { duration: 700, easing: 'ease-out' });
				later(() => kp.classList.remove('fly'), 700);
				return;
			}
			const p = L.pan[c];
			const left = c % 2 === 0;
			const top = c < 2;
			const kx = L.W / 2;
			const ky = L.ky + L.kh * 0.64;
			const inner = left ? p.x + p.w * 0.7 : p.x + p.w * 0.3;
			const dx = (inner - kx) * (top ? 0.78 : 0.95);
			const dy = top ? -L.ih * 0.34 : (p.cy - ky) * 0.55 + L.kh * 0.12;
			const a = (left ? -1 : 1) * (top ? 46 : 84);
			const land = top ? L.kh * 0.08 : dy;
			later(() => kp.classList.add('reach'), 60);
			// kaleci topun gelişine göre zamanlanır: köşeye top varmadan hemen önce ulaşır, top gelince orada asılı kalır
			const o2 = clamp((tHit * 0.86) / DIVE, 0.2, 0.5);
			const o3 = Math.min(0.8, o2 + 0.26);
			const o4 = Math.min(0.9, o3 + 0.14);
			const anim = kp.animate(
				[
					{ transform: 'translate(0,0) rotate(0deg)', offset: 0 },
					{ transform: `translate(${f1(dx * 0.12)}px,${f1(-L.kh * 0.06)}px) rotate(${f1(a * 0.15)}deg)`, offset: o2 * 0.28 },
					{ transform: `translate(${f1(dx)}px,${f1(dy)}px) rotate(${f1(a)}deg)`, offset: o2 },
					{ transform: `translate(${f1(dx * 1.03)}px,${f1(dy * 1.02)}px) rotate(${f1(a * 1.06)}deg)`, offset: o2 + 0.08 },
					{ transform: `translate(${f1(dx * 1.04)}px,${f1(land)}px) rotate(${f1(top ? a * 1.75 : a * 1.06)}deg)`, offset: o3 },
					{ transform: `translate(${f1(dx * 1.04)}px,${f1(land)}px) rotate(${f1(top ? a * 1.75 : a * 1.06)}deg)`, offset: o4 },
					{ transform: 'translate(0,0) rotate(0deg)', offset: 1 },
				],
				{ duration: DIVE, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'none' },
			);
			later(() => {
				kp.classList.remove('reach');
				if (catchIt) kp.classList.add('hold');
			}, Math.max(500, tHit));
			later(() => kp.classList.remove('fly'), DIVE - 80);
			anim.finished.then(() => kp.classList.remove('fly', 'dive'), () => {});
		};
		/** Herkesin şut işareti: köşesinin dışında (üstte direğin üstü, altta çizginin altı), portreli top. */
		const markers = (results, kpI, kval) => {
			if (!L) return;
			const lanes = [[], [], [], [], []];
			for (const r of results) {
				const c = Number.isInteger(r.value) && r.value >= 0 && r.value < 4 ? r.value : 4;
				lanes[c].push(r);
			}
			let h = '';
			let k = 0;
			lanes.forEach((list, c) => {
				list.forEach((r, j) => {
					const pl = P.find((x) => x.i === r.i);
					const isK = r.i === kpI && kval != null;
					const gap = L.mk + 5;
					let x;
					let y;
					if (c === 4) {
						// şut yok (süre doldu): alt sıranın ortasında, kum saatiyle
						x = L.W / 2 + (j - (list.length - 1) / 2) * gap;
						y = L.mby;
					} else {
						const left = c % 2 === 0;
						const x0 = left ? L.gx + L.mk * 1.15 : L.gx + L.gw - L.mk * 1.15;
						x = x0 + (left ? 1 : -1) * j * gap;
						y = c < 2 ? L.gy - L.laneT * 0.5 : L.mby;
					}
					const badge = c === 4 ? `<u class="kp">${ICO.kum}</u>` : `<u class="${isK ? 'kp' : r.correct ? 'ok' : 'no'}">${isK ? ICO.kp : r.correct ? ICO.ok : ICO.no}</u>`;
					h += `<span class="pk-mk${pl?.human ? ' me' : ''}" style="left:${f1(x)}px;top:${f1(y)}px;--c:${esc(r.color)};--dl:${Math.round(k * 90)}ms;--fy:${c < 2 ? -10 : 10}px">${pl?.av || ''}${badge}</span>`;
					k++;
				});
			});
			camEl.insertAdjacentHTML('beforeend', h);
		};

		const close = onClose(el, () => {
			alive = false;
			stopOpen();
			ro?.disconnect();
			for (const a of flight?.anims || []) a.cancel();
			for (const t of timers) clearTimeout(t);
		});

		return {
			lock() {
				done = true;
				for (const t of tiles) t.disabled = true;
			},
			joker(e) {
				if (revealed || done) return;
				if (Array.isArray(e?.hide)) {
					for (const i of e.hide) {
						const t = tiles[i];
						if (!t) continue;
						t.classList.add('gone');
						t.disabled = true;
					}
					app?.ui?.toast?.('İki yanlış köşeye bant çekildi', { tone: 'good', ms: 1800 });
					if (pollPct) poll(pollPct);
				} else if (Array.isArray(e?.pct)) {
					poll(e.pct);
					app?.ui?.toast?.('Tribün köşeleri gösteriyor', { tone: 'good', ms: 1800 });
				}
			},
			reveal(results) {
				// cevapta joker çubuğu kalkar, sahne aşağı büyür: kale yerinde kalır, saha uzar (eşzamanlı ölçüm)
				frozen = true;
				layout();
				revealed = true;
				done = true;
				root.classList.add('rv');
				for (const e of root.querySelectorAll('.pk-poll,.pk-pc')) e.remove();
				for (const t of tiles) t.disabled = true;
				const byI = new Map(results.map((r) => [r.i, r]));
				const sr = byI.get(shooter.i) || null;
				const kr = keeper ? byI.get(keeper.i) || null : null;
				const kval = Number.isInteger(kr?.value) ? kr.value : null;
				const c = Number.isInteger(sr?.value) ? sr.value : null;
				const out = c == null ? 'yok' : sr.correct ? 'gol' : kval === c ? 'kurtardi' : missOf(c, `${v.q.id}|${shooter.name}`);
				// kaleci rakibin kendi seçtiği köşeye uçar (hemen), top senin köşene kıvrılır; çizgiye yakın ağır çekim
				const u0 = flight?.t0 != null ? uAt(Math.min(CREEP, (clock.now() - flight.t0) / 1000)) : 0;
				const ms = Math.round(820 * (1 - u0) + 260);
				if (c == null) root.classList.remove('slow');
				dive(kval, out === 'kurtardi', c == null ? 560 : ms);
				if (c != null && L) {
					tiles[c].classList.add('aim');
					root.classList.add('pick', 'slow');
					const p = L.pan[c];
					const left = c % 2 === 0;
					let tx = p.cx;
					let ty = p.cy;
					if (out === 'kurtardi') {
						tx = left ? p.x + p.w * 0.72 : p.x + p.w * 0.28;
						ty = p.cy + (c < 2 ? p.h * 0.1 : -p.h * 0.05);
					} else if (out === 'direk') {
						if (c < 2) {
							tx = p.cx + (left ? -p.w * 0.18 : p.w * 0.18);
							ty = L.gy + L.pt * 0.5;
						} else {
							tx = left ? L.gx + L.pt * 0.5 : L.gx + L.gw - L.pt * 0.5;
							ty = p.cy;
						}
					} else if (out === 'ust') {
						tx = p.cx + (left ? -p.w * 0.1 : p.w * 0.1);
						ty = L.gy - L.laneT * 0.55;
					} else if (out === 'aut') {
						tx = left ? L.gx - L.mk * 0.6 : L.gx + L.gw + L.mk * 0.6;
						ty = p.cy + p.h * 0.1;
					}
					aimCam(tx, ty);
					const path = pathTo(tx, ty);
					if (!flight) {
						swing();
						sfx(app, 'tap', { rate: 0.55 });
					}
					sfx(app, 'whoosh');
					// uçuşun ardı: gol → ağda süzülüp düşer; kurtarış → eldivende kalır (top söner, kalecinin elinde görünür);
					// direk → sekip dışarı; üstten ya da yandan aut → tribüne, kenara kaçar. Hepsi sonunda söner.
					const bxo = left ? -L.bs : L.W + L.bs;
					const tail =
						out === 'gol'
							? [{ x: tx, y: ty + (L.gb - ty - L.bs * K1) * 0.45, k: K1, o: 1, ms: 260, ease: 'ease-in' }, { x: tx, y: L.gb - L.bs * K1 * 0.6, k: K1 * 0.9, o: 0, ms: 300 }]
							: out === 'kurtardi'
								? [{ x: tx, y: ty, k: K1, o: 0, ms: 40 }]
								: out === 'direk'
									? c < 2
										? [{ x: left ? tx - L.W * 0.08 : tx + L.W * 0.08, y: L.gy - L.laneT * 0.4, k: 0.55, o: 1, ms: 240, ease: 'ease-out' }, { x: left ? tx - L.W * 0.16 : tx + L.W * 0.16, y: L.by - L.bs, k: 0.75, o: 0, ms: 380, ease: 'ease-in' }]
										: [{ x: (tx + bxo) / 2, y: ty + L.H * 0.06, k: 0.55, o: 1, ms: 260, ease: 'ease-out' }, { x: bxo, y: ty + L.H * 0.25, k: 0.62, o: 0, ms: 360 }]
									: out === 'ust'
										? [{ x: tx + (left ? -1 : 1) * L.W * 0.08, y: -L.bs, k: K1 * 0.8, o: 0, ms: 520, ease: 'ease-out' }]
										: [{ x: bxo, y: ty - L.H * 0.06, k: K1 * 0.8, o: 0, ms: 520, ease: 'ease-out' }];
					fly(path, u0, ms, tail);
					later(() => alive && root.classList.add('near'), Math.round(ms * 0.5));
					later(() => {
						if (!alive) return;
						root.classList.remove('near', 'slow');
						const host = st.getBoundingClientRect();
						const scl = host.width / Math.max(1, L.W);
						const ux = host.left + tx * scl;
						const uy = host.top + ty * scl;
						camEl.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-3px,2px)' }, { transform: 'translate(3px,-2px)' }, { transform: 'none' }], { duration: 260 });
						if (out === 'gol') {
							tiles[c].classList.add('hit');
							const net = root.querySelector('.pk-net .mesh');
							net?.animate([{ transform: 'none' }, { transform: `translate(${f1((tx - L.W / 2) * 0.05)}px,${f1(-L.gh * 0.05)}px) scale(1.07)` }, { transform: `translate(${f1((L.W / 2 - tx) * 0.012)}px,0) scale(.985)` }, { transform: 'scale(1.01)' }, { transform: 'none' }], { duration: 760, easing: 'ease-out' });
							for (const [cl, dl] of [['a', 0], ['b', 140]]) {
								const rp = root.querySelector(`.pk-net .rip.${cl}`);
								if (!rp) continue;
								rp.setAttribute('cx', f1(tx));
								rp.setAttribute('cy', f1(ty));
								rp.animate([{ opacity: 1, r: '4px', strokeWidth: '4px' }, { opacity: 0, r: `${f1(L.gw * 0.3)}px`, strokeWidth: '1px' }], { duration: 760, delay: dl, easing: 'ease-out' });
							}
							bulge(tx, ty);
							rings(tx, ty, 5);
							root.classList.add('roar');
							later(() => root.classList.remove('roar'), 1900);
							fx.insertAdjacentHTML('beforeend', '<i class="pk-flash"></i>');
							later(() => fx.querySelector('.pk-flash')?.remove(), 800);
							confetti(46, [shooter.color, '#ffd25a', '#ffffff', '#7dff9a', '#ff6ab0']);
							app?.ui?.fx?.burst(ux, uy, { n: 18, dist: 120, colors: ['#ffd25a', '#fff', '#7dff9a'], kind: 'star', size: 13, life: 850 });
							sfx(app, 'cheer');
							sfx(app, 'fireworks');
							later(() => sfx(app, 'fireworks', { pan: 0.6 }), 260);
							buzz([30, 40, 60]);
						} else if (out === 'kurtardi') {
							rings(tx, ty, 3);
							sfx(app, 'defend');
							buzz(40);
						} else if (out === 'direk') {
							fr.classList.remove('shake');
							void fr.offsetWidth;
							fr.classList.add('shake');
							rings(tx, ty, 2.5);
							sfx(app, 'defend');
							buzz([40, 30, 40]);
						} else sfx(app, 'whoosh');
						call(out, L.gy + L.gh * (out === 'gol' ? 0.42 : 0.5));
						// köşelerin hükmü: doğru yeşil, seçilen yanlışlar kırmızı, öbürleri sönük
						tiles.forEach((t, i) => {
							t.classList.remove('aim');
							t.classList.toggle('ok', i === v.right);
						});
					}, ms);
				} else if (L) {
					// şut yok (süre doldu): top noktada kalır; kalecinin uçuşu ve doğru köşe yine görünür
					later(() => tiles.forEach((t, i) => t.classList.toggle('ok', i === v.right)), 520);
				}
				// hüküm: seçilen yanlışlar kırmızı, kimsenin seçmediği yanlışlar sönük
				const picked = new Set(results.map((r) => r.value).filter((x) => Number.isInteger(x)));
				const verdict = () =>
					tiles.forEach((t, i) => {
						t.classList.remove('aim');
						t.classList.toggle('ok', i === v.right);
						t.classList.toggle('no', i !== v.right && picked.has(i));
						t.classList.toggle('dim', i !== v.right && !picked.has(i));
						t.classList.remove('gone');
					});
				later(() => {
					root.classList.remove('pick');
					verdict();
				}, c == null ? 560 : ms + 260);
				later(() => markers(results, keeper?.i, kval), c == null ? 700 : ms + 380);
				later(() => {
					if (out === 'gol') kp.classList.add('sad');
				}, ms + 600);
				// damga sorunun yerinde (arayüz: tam ekran kartta başlıkla sahne arası)
				const meR = results.find((r) => r.p?.human);
				if (meR && app && c != null) {
					const kn = keeper?.name || 'Kaleci';
					const right = v.opts[v.right];
					const sub =
						out === 'gol'
							? kval === c
								? `${kn} uzandı ama yetişemedi`
								: kval == null
									? `${kn} kıpırdayamadı`
									: `${kn} öbür köşeye uçtu`
							: out === 'kurtardi'
								? `${kn} köşeni okudu · doğrusu ${right}`
								: `Doğrusu: ${right}`;
					stampLater(app, CALL[out][0], out === 'gol' ? 'gold' : 'bad', sub);
				}
			},
			destroy: close,
		};
	},
};
