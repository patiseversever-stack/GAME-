// KAÇIŞ ODASI (YENİ 10 · grup 4): bir soru, art arda üç oda; zorluk odadan odaya artar. Her odada kısa bir soru ve
// pirinç levhalı üç kapı var. Doğru kapı gıcırdayarak açılır, kamera kapıdan geçip meşalelerin titreştiği 3B koridorda
// (CSS 3B) bir sonraki odaya koşar. Yanlış kapı tuzaktır: kapı çarparak kapanır, kırmızı alarm çalar, demir parmaklık
// iner, kaçış orada biter. Üçüncü odayı geçen gün ışığına çıkar: "ÇIKIŞ!". Bütün koşu süreyle sınırlı (~30 sn).
//
// Üç kaçış teması (verideki `tema`): saray (Topkapı: taş duvar, çini kuşak, sivri kemerli ceviz kapılar, meşaleler),
// lab (laboratuvar: beyaz fayans, lombozlu çelik kapılar, titreyen floresanlar), stad (stadyum: beton tünel, kulüp
// şeridi, havalandırmalı soyunma odası kapıları, kafesli lambalar).
//
// Puan: geçilen oda sayısı (kısmi puan). Tür 'closest': err = 3 − geçilen oda; kaçamayanlar arasında eşitlikte o odaya
// önce varan önde (err'e binde bir payla, varış saniyesi). Üç odayı geçen kaçmıştır (err 0); kaçanlar arasında arayüz
// cevap süresine bakar (önce kaçan önde). Süre dolarsa o ana kadar geçilen odalar sayılır (ctl.value).
//
// Veri: { q: başlık, tema, cikis: çıkış kapısının adı, rooms: [{ ad, q, a: [doğru, y1, y2], d }] } (d: odanın zorluğu).
// Görünüm: v.rooms [{ ad, q, opts (karışık), d }], v.key [odanın doğru kapısı] (key yalnız sunucuda; publicView siler).
// Değer: { picks: [kapı…], at: [sn…] } (at: kartın açılışından o kapıya dokunuşa). Cevap ekranı: KAÇIŞ PLANI, her
// oyuncunun portresi durduğu kapının önünde (tuzak), odasında (süre) ya da çıkışta.
// Çevrimiçi (öneri, bkz. rapor): her kapı act 'kapi' { k, i } olarak sunucuya gider, sunucu { ok } döner; publicView'da
// anahtar yoktur, istemci bekler. Anahtarsız görünümde kart kapıları tuzaksız açar, hüküm cevap ekranında.

import { css, esc, shuffle, pCorrect, buzz, heceli, clamp } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, stampLater, onClose, onOpen, sfx, LOOK, ACT, OPEN } from './d_ortak.js';
import { clock, setTimeout, clearTimeout, setInterval, clearInterval } from '../core/clock.js';

export const TRANS = 1.75; // doğru kapı: açılış + koridor koşusu + yeni oda (sn; bu sürede dokunuş yok)
export const TRAP = 1.1; // yanlış kapı: çarpma, alarm, parmaklık; ardından cevap gider
export const EXIT = 1.4; // son kapı: koridor, gün ışığı, ÇIKIŞ
const TEMA = {
	saray: { ad: 'TOPKAPI SARAYI', isik: 'ates' },
	lab: { ad: 'LABORATUVAR', isik: 'neon' },
	stad: { ad: 'STADYUM', isik: 'lamba' },
};
const len = (s) => [...String(s ?? '')].length;
const f1 = (x) => (Math.round(x * 10) / 10).toString();

/** Koşunun hükmü: kaç oda geçildi, nerede durdu ('cikis' | 'tuzak' | 'sure'), tuzak kapısı. */
export function kacisOf(v, value) {
	const picks = Array.isArray(value?.picks) ? value.picks : [];
	const R = v.rooms.length;
	let n = 0;
	while (n < R && Number.isInteger(picks[n]) && v.key && picks[n] === v.key[n]) n++;
	const stop = n === R ? 'cikis' : Number.isInteger(picks[n]) ? 'tuzak' : 'sure';
	return { n, stop, door: stop === 'tuzak' ? picks[n] : null, at: Array.isArray(value?.at) ? value.at : [] };
}

// ---------------------------------------------------------------- stil
const CSS = /* css */ `
.yn-kc{position:relative;flex:1 1 auto;min-height:214px;display:flex;flex-direction:column;user-select:none;-webkit-user-select:none;
  --wall:#6a4a2e;--wall2:#4a301c;--wallJ:rgba(20,10,4,.55);--side:#3a2414;--floor:#3a261a;--ceil:#1c1108;--trim:#e0b04a;--door:#5a321a;--door2:#2e180a;
  --plq:#f2cf78;--plq2:#b07c2a;--ink:#2a1606;--lamp:#ffb33a;--glow:255,168,60;--alarm:255,40,30}
.yn-kc[data-tema=lab]{--wall:#d9e2ea;--wall2:#b4c2ce;--wallJ:rgba(90,110,130,.45);--side:#9aaab8;--floor:#59636e;--ceil:#262e38;--trim:#18b7a6;--door:#8d9aa8;--door2:#56626e;
  --plq:#f4d98a;--plq2:#b08a34;--ink:#22180a;--lamp:#d8fbff;--glow:150,240,255}
.yn-kc[data-tema=stad]{--wall:#6c727c;--wall2:#545a64;--wallJ:rgba(20,24,30,.5);--side:#454b54;--floor:#23272e;--ceil:#121418;--trim:var(--cc,#ff8a1e);--door:#2c4a80;--door2:#1a2c52;
  --plq:#f2cf78;--plq2:#b07c2a;--ink:#221608;--lamp:#fff3cf;--glow:255,236,190}
.kc-st{position:relative;flex:1 1 auto;min-height:214px;border-radius:16px;overflow:hidden;isolation:isolate;background:#05060c;
  box-shadow:0 0 0 2px rgba(255,255,255,.13),0 14px 30px rgba(0,0,0,.55)}
.kc-st.shake{animation:kcShake .45s cubic-bezier(.36,.07,.19,.97)}
/* ---------------------------------------------------------------- oda (tek kaçış noktalı perspektif) */
.kc-room{position:absolute;inset:0;transform-origin:0 0;will-change:transform,opacity}
.kc-room>.pl{position:absolute;inset:0}
.kc-ceil{background:linear-gradient(180deg,#000 0,var(--ceil) 70%);clip-path:polygon(0 0,100% 0,var(--bR) var(--bT),var(--bL) var(--bT))}
.yn-kc[data-tema=saray] .kc-ceil{background:repeating-linear-gradient(90deg,rgba(0,0,0,.45) 0 3px,transparent 3px 34px),linear-gradient(180deg,#0a0603,var(--ceil))}
.yn-kc[data-tema=lab] .kc-ceil{background:linear-gradient(90deg,transparent 30%,rgba(220,250,255,.55) 30% 70%,transparent 70%) 50% calc(var(--bT) * .45)/40% 5px no-repeat,linear-gradient(180deg,#0c1016,var(--ceil))}
.kc-floor{background:linear-gradient(0deg,var(--floor),color-mix(in srgb,var(--floor) 70%,#000));clip-path:polygon(var(--bL) var(--bB),var(--bR) var(--bB),100% 100%,0 100%)}
.kc-run{clip-path:polygon(calc(50% - var(--bw) * .17) var(--bB),calc(50% + var(--bw) * .17) var(--bB),82% 100%,18% 100%)}
.yn-kc[data-tema=saray] .kc-run{background:linear-gradient(90deg,#d4a83a 0 4%,#8a1620 4% 96%,#d4a83a 96%),#8a1620;opacity:.95}
.yn-kc[data-tema=lab] .kc-run{background:repeating-linear-gradient(90deg,#f2c21a 0 9px,#222 9px 18px);opacity:.75;clip-path:polygon(calc(50% - var(--bw) * .17) var(--bB),calc(50% - var(--bw) * .14) var(--bB),24% 100%,18% 100%,18% 100%);display:none}
.yn-kc[data-tema=stad] .kc-run{background:linear-gradient(90deg,transparent 0 46%,rgba(255,255,255,.75) 46% 54%,transparent 54%);opacity:.6}
.kc-lw{background:linear-gradient(90deg,#000,var(--side) 85%);clip-path:polygon(0 0,var(--bL) var(--bT),var(--bL) var(--bB),0 100%)}
.kc-rw{background:linear-gradient(270deg,#000,var(--side) 85%);clip-path:polygon(100% 0,var(--bR) var(--bT),var(--bR) var(--bB),100% 100%)}
.kc-pers{position:absolute;inset:0;pointer-events:none}
.kc-pers svg{position:absolute;inset:0;width:100%;height:100%}
.kc-back{position:absolute;left:var(--bL);top:var(--bT);width:var(--bw);height:var(--bh);overflow:visible;
  background:linear-gradient(0deg,rgba(0,0,0,.45),transparent 30%,transparent 80%,rgba(0,0,0,.35)),
    repeating-linear-gradient(0deg,var(--wallJ) 0 1.5px,transparent 1.5px calc(var(--bh) / 9)),
    repeating-linear-gradient(90deg,var(--wallJ) 0 1.5px,transparent 1.5px calc(var(--bw) / 7)),linear-gradient(180deg,var(--wall),var(--wall2));
  box-shadow:inset 0 0 calc(var(--bw) * .12) rgba(0,0,0,.6)}
.yn-kc[data-tema=lab] .kc-back{background:linear-gradient(0deg,rgba(0,40,60,.25),transparent 30%),linear-gradient(180deg,transparent 0 13%,var(--trim) 13% 16%,transparent 16%),
  repeating-linear-gradient(0deg,var(--wallJ) 0 1px,transparent 1px calc(var(--bh) / 12)),repeating-linear-gradient(90deg,var(--wallJ) 0 1px,transparent 1px calc(var(--bw) / 16)),linear-gradient(180deg,var(--wall),var(--wall2))}
.yn-kc[data-tema=stad] .kc-back{background:linear-gradient(180deg,transparent 0 9%,var(--trim) 9% 14%,#fff 14% 15.5%,transparent 15.5%),linear-gradient(0deg,rgba(0,0,0,.4),transparent 35%),
  radial-gradient(120% 80% at 50% 120%,rgba(0,0,0,.35),transparent 60%),linear-gradient(180deg,var(--wall),var(--wall2))}
.kc-band{position:absolute;left:0;right:0;top:4%;height:7%;pointer-events:none}
.yn-kc[data-tema=saray] .kc-band{background:radial-gradient(circle at 50% 50%,#f4f0e6 0 22%,#1f5fae 23% 38%,#f4f0e6 39% 46%,transparent 47%) 0 50%/calc(var(--bh) * .07) 100%,linear-gradient(#123e7a,#0d2e5c);
  box-shadow:0 2px 0 var(--trim),0 -2px 0 var(--trim)}
.yn-kc[data-tema=lab] .kc-band,.yn-kc[data-tema=stad] .kc-band{display:none}
/* kapılar: çerçeve, ardında ışık (koridor ya da tuzak), 3B dönen kanat, pirinç levha */
.kc-door{position:absolute;bottom:0;perspective:var(--dp,500px);perspective-origin:50% 40%;transition:filter .2s}
.kc-door:disabled{cursor:default}
.kc-door .dr-fr{position:absolute;inset:-6% -9% 0;background:linear-gradient(90deg,var(--door2),color-mix(in srgb,var(--wall) 60%,#000) 20%,color-mix(in srgb,var(--wall) 60%,#000) 80%,var(--door2));box-shadow:0 0 0 2px rgba(0,0,0,.5);pointer-events:none}
.kc-door .dr-hole{position:absolute;inset:0;background:radial-gradient(60% 70% at 50% 60%,rgba(var(--glow),.95),rgba(var(--glow),.35) 45%,#0a0503 85%);pointer-events:none}
.kc-door .dr-hole::after{content:'';position:absolute;left:38%;right:38%;top:30%;bottom:0;background:linear-gradient(180deg,rgba(255,255,255,.75),rgba(var(--glow),.3));clip-path:polygon(40% 0,60% 0,100% 100%,0 100%);opacity:.6}
.kc-door.trap .dr-hole{background:radial-gradient(60% 70% at 50% 60%,rgba(var(--alarm),1),rgba(var(--alarm),.45) 45%,#100000 85%)}
.kc-door .dr-leaf{position:absolute;inset:0;transform-origin:0 50%;transform-style:preserve-3d;transition:transform .5s cubic-bezier(.25,.7,.25,1)}
.kc-door.d2 .dr-leaf{transform-origin:100% 50%}
.kc-door .dr-f{position:absolute;inset:0;backface-visibility:hidden;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(90deg,rgba(0,0,0,.35),transparent 12% 88%,rgba(0,0,0,.35)),repeating-linear-gradient(90deg,var(--door) 0 calc(25% - 1.5px),var(--door2) calc(25% - 1.5px) 25%);
  box-shadow:inset 0 0 0 2px var(--door2),inset 0 0 14px rgba(0,0,0,.5)}
.kc-door .dr-b{position:absolute;inset:0;backface-visibility:hidden;transform:rotateY(180deg);background:linear-gradient(90deg,var(--door2),var(--door))}
.yn-kc[data-tema=saray] .kc-door .dr-fr,.yn-kc[data-tema=saray] .kc-door .dr-hole,.yn-kc[data-tema=saray] .kc-door .dr-f,.yn-kc[data-tema=saray] .kc-door .dr-b{clip-path:polygon(0 100%,0 24%,10% 12%,30% 5%,50% 0,70% 5%,90% 12%,100% 24%,100% 100%)}
.yn-kc[data-tema=saray] .kc-door .dr-f::before{content:'';position:absolute;inset:8% 8% 4%;background:radial-gradient(circle,var(--trim) 0 1.6px,transparent 2.2px) 0 0/calc(var(--dw) * .21) calc(var(--dw) * .21);opacity:.85}
.yn-kc[data-tema=lab] .kc-door .dr-f{background:linear-gradient(180deg,transparent 0 84%,#f2c21a 84% 86%,#222 86% 88%,#f2c21a 88% 90%,transparent 90%),linear-gradient(90deg,#6c7886,#a8b4c2 35%,#c4cfda 50%,#8e9aa8);border-radius:6px}
.yn-kc[data-tema=lab] .kc-door .dr-f::before{content:'';position:absolute;left:50%;top:9%;width:42%;aspect-ratio:1;transform:translateX(-50%);border-radius:50%;
  background:radial-gradient(circle at 35% 35%,rgba(200,255,255,.9),rgba(40,140,170,.85) 45%,#0a2a3a 70%);box-shadow:0 0 0 3px #56626e,0 0 0 5px #c4cfda}
.yn-kc[data-tema=lab] .kc-door .dr-fr{border-radius:8px 8px 0 0;background:linear-gradient(90deg,#3a4450,#7a8692 30%,#7a8692 70%,#3a4450)}
.yn-kc[data-tema=stad] .kc-door .dr-f{background:repeating-linear-gradient(180deg,transparent 0 5px,rgba(0,0,0,.4) 5px 7px) 50% 8%/60% 16% no-repeat,linear-gradient(90deg,var(--door2),var(--door) 30% 70%,var(--door2));border-radius:3px}
.kc-door .dr-pl{position:absolute;left:7%;right:7%;top:var(--pt,34%);height:var(--ph,36%);display:flex;align-items:center;justify-content:center;padding:3px 4px;border-radius:4px;text-align:center;
  background:linear-gradient(180deg,#fff3c4,var(--plq) 30%,var(--plq2) 100%);box-shadow:inset 0 0 0 1.5px rgba(80,50,10,.6),inset 0 2px 0 rgba(255,255,255,.7),0 3px 6px rgba(0,0,0,.55)}
.kc-door .dr-pl::before,.kc-door .dr-pl::after{content:'';position:absolute;top:50%;width:4px;height:4px;margin-top:-2px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff6d0,#7a5216);pointer-events:none}
.kc-door .dr-pl::before{left:3px}.kc-door .dr-pl::after{right:3px}
.kc-door .dr-tx{display:block;max-width:100%;font:700 14px/1.06 'Fredoka',sans-serif;color:var(--ink);text-shadow:0 1px 0 rgba(255,255,255,.55);overflow-wrap:normal;word-break:normal;hyphens:manual}
.kc-door::after{content:'';position:absolute;left:6%;right:6%;bottom:-3px;height:5px;border-radius:50%;pointer-events:none;
  background:radial-gradient(closest-side,rgba(var(--glow),.95),rgba(var(--glow),.35) 55%,rgba(var(--glow),0));animation:kcGlow 1.6s ease-in-out infinite alternate}
.kc-door .dr-knob{position:absolute;top:58%;width:7%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff6d0,#9a6a1a 60%,#4a2a06);pointer-events:none;right:9%}
.kc-door.d2 .dr-knob{right:auto;left:9%}
.kc-door:not(:disabled):active .dr-f{filter:brightness(1.18)}
.kc-door.open .dr-leaf{transform:rotateY(104deg)}
.kc-door.d2.open .dr-leaf{transform:rotateY(-104deg)}
.kc-door.ask .dr-leaf{animation:kcAsk .3s ease-in-out infinite alternate}
.kc-door.d2.ask .dr-leaf{animation-name:kcAskR}
.kc-door.crack .dr-leaf{transform:rotateY(30deg);transition-duration:.22s}
.kc-door.d2.crack .dr-leaf{transform:rotateY(-30deg)}
.kc-door.slam .dr-leaf{transition:none;animation:kcSlam .32s cubic-bezier(.5,0,.75,0) both}
.kc-door.d2.slam .dr-leaf{animation-name:kcSlamR}
.kc-door.gone{filter:grayscale(.7) brightness(.55);pointer-events:none}
.kc-door.gone .dr-f::after{content:'';position:absolute;left:-6%;right:-6%;top:40%;height:20%;transform:rotate(-12deg);
  background:linear-gradient(180deg,#b07a3a,#7a4a1a);box-shadow:0 3px 4px rgba(0,0,0,.5),0 calc(var(--dw) * .55) 0 -2px #8a5a2a}
.kc-door .dr-pc{position:absolute;left:50%;bottom:6%;transform:translateX(-50%);padding:1px 6px;border-radius:7px;font:italic 900 12px/16px 'Barlow Condensed','Lilita One',sans-serif;color:#fff;background:#ec4f93;
  box-shadow:0 0 0 2px #fff;white-space:nowrap;animation:flPopIn .35s .2s cubic-bezier(.3,1.8,.5,1) both}
.yn-kc.busy .kc-door,.yn-kc.over .kc-door{pointer-events:none}
.yn-kc.alarm .kc-door:not(.trap){filter:saturate(.4) brightness(.6)}
/* ışıklar: saray meşale, lab floresan, stad kafesli lamba; hepsi titreşir. Kap arka duvarın içinde, kapılardan önce:
   ışık duvarın üstüne düşer, kapılar ve levhalar ışığın üstünde kalır (yerleşim oda koordinatında: kap duvarın köşesini geri alır).
   Parıltı düz karışımla: screen karışımı her karede ayrı bir çizim geçişi istiyordu (yazılım çizicide ekran 1,5–2 kat yavaştı) */
.kc-lamps{position:absolute;left:calc(var(--bL) * -1);top:calc(var(--bT) * -1);width:0;height:0;pointer-events:none}
.kc-lamp{position:absolute;width:var(--lw);height:calc(var(--lw) * 2);margin-left:calc(var(--lw) / -2);pointer-events:none}
.kc-lamp .gl{position:absolute;left:50%;top:30%;width:calc(var(--lw) * 7);height:calc(var(--lw) * 7);margin:calc(var(--lw) * -3.5) 0 0 calc(var(--lw) * -3.5);border-radius:50%;
  background:radial-gradient(closest-side,rgba(var(--glow),.62),rgba(var(--glow),.14) 60%,transparent);animation:kcGlow 1.3s ease-in-out infinite alternate}
.kc-lamp .br{position:absolute;left:30%;right:30%;top:55%;height:45%;background:linear-gradient(90deg,#2a1a0a,#7a5a2a,#2a1a0a);border-radius:2px}
.kc-lamp .fl{position:absolute;left:12%;right:12%;top:0;height:62%;border-radius:50% 50% 45% 45%/62% 62% 38% 38%;transform-origin:50% 100%;
  background:radial-gradient(60% 50% at 50% 70%,#fff8d0,#ffd23a 40%,#ff7a1a 70%,rgba(255,60,10,0) 100%);animation:kcFlame .16s ease-in-out infinite alternate}
.kc-lamp .fl::after{content:'';position:absolute;inset:30% 26% 6%;border-radius:inherit;background:#fffbe8;opacity:.8}
.yn-kc[data-tema=lab] .kc-lamp .fl{left:-40%;right:-40%;top:18%;height:16%;border-radius:4px;background:linear-gradient(180deg,#fff,#c8fbff);box-shadow:0 0 8px 2px rgba(160,245,255,.9);animation:kcNeon 3.1s steps(1) infinite}
.yn-kc[data-tema=lab] .kc-lamp .fl::after{display:none}
.yn-kc[data-tema=lab] .kc-lamp .br{top:12%;height:28%;left:-48%;right:-48%;background:#3a4450}
.yn-kc[data-tema=lab] .kc-lamp .gl{animation:kcNeonG 3.1s steps(1) infinite}
.yn-kc[data-tema=stad] .kc-lamp .fl{left:10%;right:10%;top:8%;height:48%;border-radius:50%;background:radial-gradient(circle at 45% 40%,#fff,#fff0c0 50%,#d8a040);
  box-shadow:0 0 10px 3px rgba(255,236,190,.8);animation:kcBulb 2.2s ease-in-out infinite}
.yn-kc[data-tema=stad] .kc-lamp .fl::after{inset:0;border-radius:50%;background:repeating-linear-gradient(90deg,transparent 0 3px,rgba(40,30,20,.8) 3px 4px),repeating-linear-gradient(0deg,transparent 0 3px,rgba(40,30,20,.8) 3px 4px);opacity:.7}
.fl-q.hot .yn-kc .kc-lamp .fl{animation-duration:.07s}
.fl-q.hot .yn-kc .kc-lamp .gl{animation-duration:.25s}
.kc-shade{position:absolute;inset:0;pointer-events:none;background:radial-gradient(90% 80% at 50% 55%,transparent 45%,rgba(0,0,0,.55))}
/* zorluk arttıkça oda kararır: ikinci basamakta gölge koyulaşır, en zorda kenarlarda kızıl bir nabız atar, ışıklar huzursuzlaşır
   (gölge kapıların ve ışıkların altında: levha yazısına hiçbir şey binmez) */
.kc-shade::after{content:'';position:absolute;inset:0;opacity:0;background:radial-gradient(78% 68% at 50% 58%,transparent 36%,rgba(var(--alarm),.3))}
.yn-kc[data-zor="2"] .kc-shade{background:radial-gradient(86% 76% at 50% 55%,transparent 38%,rgba(0,0,0,.7))}
.yn-kc[data-zor="3"] .kc-shade{background:radial-gradient(80% 70% at 50% 55%,transparent 30%,rgba(0,0,0,.82))}
.yn-kc[data-zor="3"] .kc-shade::after{animation:kcDread 2.4s ease-in-out infinite alternate}
.yn-kc[data-tema=saray][data-zor="3"] .kc-lamp .fl{animation-duration:.1s}
.yn-kc[data-tema=lab][data-zor="3"] .kc-lamp .fl,.yn-kc[data-tema=lab][data-zor="3"] .kc-lamp .gl{animation-duration:1.4s}
.yn-kc[data-tema=stad][data-zor="3"] .kc-lamp .fl{animation-duration:.9s}
.kc-bars{position:absolute;left:var(--bL);top:var(--bT);width:var(--bw);height:var(--bh);transform:translateY(-104%);pointer-events:none;visibility:hidden;
  background:repeating-linear-gradient(90deg,transparent 0 calc(var(--bw) / 14 - 5px),#2a2c30 calc(var(--bw) / 14 - 5px) calc(var(--bw) / 14 - 3px),#9aa0a8 calc(var(--bw) / 14 - 3px) calc(var(--bw) / 14 - 1px),#2a2c30 calc(var(--bw) / 14 - 1px) calc(var(--bw) / 14)),
    repeating-linear-gradient(180deg,transparent 0 calc(var(--bh) / 5 - 4px),#55595f calc(var(--bh) / 5 - 4px) calc(var(--bh) / 5));
  -webkit-mask:linear-gradient(180deg,#000 92%,transparent);mask:linear-gradient(180deg,#000 92%,transparent)}
.kc-bars::after{content:'';position:absolute;left:0;right:0;bottom:4%;height:6px;background:repeating-linear-gradient(90deg,#9aa0a8 0 calc(var(--bw) / 14 - 4px),transparent calc(var(--bw) / 14 - 4px) calc(var(--bw) / 14));clip-path:polygon(0 0,100% 0,100% 100%,0 100%)}
.yn-kc.trapped .kc-bars{visibility:visible;animation:kcBars .42s cubic-bezier(.55,0,.6,1.6) forwards}
/* ---------------------------------------------------------------- koridor (gerçek CSS 3B): kamera meşalelerin arasından koşar */
.kc-cor{position:absolute;inset:0;display:none;opacity:0;pointer-events:none;perspective:var(--P);perspective-origin:50% var(--po,50%);overflow:hidden;background:#030202}
.kc-cor.on{display:block}
.kc-tun{position:absolute;left:50%;top:var(--po,50%);width:0;height:0;transform-style:preserve-3d}
.kc-tun>i,.kc-tun>div{position:absolute;left:0;top:0;display:block;backface-visibility:visible}
.kc-tun .fw{width:var(--cw);height:var(--sl);transform-origin:50% 0;background:linear-gradient(180deg,color-mix(in srgb,var(--floor) 80%,#000),var(--floor));
  background-image:repeating-linear-gradient(180deg,rgba(0,0,0,.35) 0 2px,transparent 2px 36px),linear-gradient(90deg,rgba(0,0,0,.5),transparent 25% 75%,rgba(0,0,0,.5))}
.yn-kc[data-tema=saray] .kc-tun .fw{background:linear-gradient(90deg,transparent 0 32%,#8a1620 32% 68%,transparent 68%),repeating-linear-gradient(180deg,rgba(0,0,0,.35) 0 2px,transparent 2px 40px),var(--floor)}
.kc-tun .cw2{width:var(--cw);height:var(--sl);transform-origin:50% 0;background:repeating-linear-gradient(180deg,rgba(0,0,0,.5) 0 4px,transparent 4px 60px),var(--ceil)}
.kc-tun .sw{width:var(--sl);height:var(--ch);background:repeating-linear-gradient(90deg,var(--wallJ) 0 2px,transparent 2px 46px),repeating-linear-gradient(0deg,var(--wallJ) 0 2px,transparent 2px 30px),linear-gradient(180deg,var(--wall),var(--wall2))}
.kc-tun .sw.l{transform-origin:0 50%}.kc-tun .sw.r{transform-origin:100% 50%}
.kc-tun .tq{display:block}
.kc-tun .tq.g{width:calc(var(--lw) * 9);height:calc(var(--lw) * 9)}
.kc-tun .tq.f{width:calc(var(--lw) * 1.6);height:calc(var(--lw) * 2.6)}
.kc-tun .tq>i{position:absolute;inset:0;display:block}
.kc-tun .tg{border-radius:50%;background:radial-gradient(closest-side,rgba(var(--glow),.6),rgba(var(--glow),.15) 55%,transparent);animation:kcGlow .9s ease-in-out infinite alternate}
.kc-tun .tf{border-radius:50% 50% 45% 45%/62% 62% 38% 38%;transform-origin:50% 100%;
  background:radial-gradient(60% 50% at 50% 70%,#fff8d0,#ffd23a 40%,#ff7a1a 70%,rgba(255,60,10,0));animation:kcFlame .14s ease-in-out infinite alternate}
.yn-kc[data-tema=lab] .kc-tun .tf{inset:35% -120%;border-radius:3px;background:#e8fdff;box-shadow:0 0 10px 3px rgba(150,240,255,.9);animation:kcNeon 2.3s steps(1) infinite}
.yn-kc[data-tema=stad] .kc-tun .tf{inset:20% 0;border-radius:50%;background:radial-gradient(circle,#fff,#ffe9b0 60%,#c89030);box-shadow:0 0 12px 4px rgba(255,236,190,.8);animation:kcBulb 1.6s ease-in-out infinite}
.kc-tun .ew{width:var(--cw);height:var(--ch);background:linear-gradient(180deg,var(--wall),var(--wall2));box-shadow:inset 0 0 60px rgba(0,0,0,.7)}
.kc-tun .ew i{position:absolute;bottom:0;width:var(--edw);height:var(--edh);background:radial-gradient(60% 70% at 50% 60%,rgba(var(--glow),.75),#0a0503 85%);box-shadow:0 0 0 3px rgba(0,0,0,.6)}
.kc-tun .ew.out{background:radial-gradient(55% 65% at 50% 70%,#fff 0 30%,#fff3c4 45%,rgba(255,230,150,.6) 62%,var(--wall2) 80%)}
.kc-tun .ew.out i{display:none}
.kc-tun .fog{width:var(--cw);height:var(--ch);background:radial-gradient(closest-side,transparent 30%,rgba(0,0,0,.55));pointer-events:none}
/* ---------------------------------------------------------------- üst şerit: oda, ilerleme, rakiplerin koşusu */
.kc-hud{position:absolute;left:0;right:0;top:0;z-index:5;display:flex;align-items:flex-start;justify-content:space-between;gap:6px;padding:7px 8px 0;pointer-events:none}
.kc-lb{display:flex;align-items:center;gap:7px;min-width:0;padding:3px 10px 3px 4px;transform:skewX(-8deg);background:rgba(4,6,14,.82);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.28)}
.kc-lb>*{transform:skewX(8deg)}
.kc-lb b{flex:none;display:grid;place-items:center;min-width:30px;height:26px;padding:0 4px;background:var(--trim);font:italic 900 19px/1 'Barlow Condensed','Lilita One',sans-serif;color:#1a1000;letter-spacing:.02em}
.kc-lb b small{font-size:.62em;opacity:.8}
.kc-lb span{display:flex;flex-direction:column;min-width:0}
.kc-lb em{font:italic 800 9.5px/1.15 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:rgba(255,255,255,.7);font-style:italic;white-space:nowrap}
.kc-lb strong{font:italic 900 14px/1.1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.06em;color:#fff;white-space:nowrap}
.kc-pips{display:flex;gap:3px;margin-top:2px}
.kc-pips i{width:12px;height:4px;background:rgba(255,255,255,.22);transform:skewX(-12deg)}
.kc-pips i.on{background:#7dff9a;box-shadow:0 0 6px rgba(125,255,154,.8)}
.kc-pips i.at{background:var(--trim)}
.kc-pips i.x{background:#ff4a3a}
.kc-ops{position:absolute;left:0;right:0;bottom:6px;z-index:5;display:flex;justify-content:center;gap:6px;pointer-events:none}
.kc-ops.top{top:9px;bottom:auto;left:auto;right:8px;justify-content:flex-end}
.kc-op{position:relative;display:flex;align-items:center;gap:4px;height:26px;padding:0 6px 0 2px;transform:skewX(-8deg);background:rgba(4,6,14,.84);box-shadow:inset 0 0 0 1.5px var(--c)}
.kc-op>*{transform:skewX(8deg)}
.kc-op .fl-av{width:21px;height:21px;border-radius:6px;border-width:1.5px;box-shadow:none}
.kc-op .pp{display:flex;gap:2px}
.kc-op .pp i{width:7px;height:9px;background:rgba(255,255,255,.22);transform:skewX(-12deg)}
.kc-op .pp i.on{background:#7dff9a}.kc-op .pp i.at{background:#ffd25a}.kc-op .pp i.x{background:#ff4a3a}
.kc-op b{display:none}
.kc-op b svg{width:12px;height:12px;display:block}
.kc-op.ok b,.kc-op.no b{display:block}
.kc-op.ok .pp,.kc-op.no .pp{display:none}
.kc-op.ok{background:linear-gradient(90deg,#1c7a3a,#0c3a1a)}
.kc-op.no{background:linear-gradient(90deg,#9a1a12,#3a0806)}
.kc-op.bump{animation:kcBump .4s cubic-bezier(.3,1.7,.5,1)}
/* ---------------------------------------------------------------- etkiler: giriş, alarm, gün ışığı, büyük yazı */
.kc-fx{position:absolute;inset:0;z-index:6;pointer-events:none;overflow:hidden}
.kc-in{position:absolute;left:50%;top:var(--inY,50%);transform:translate(-50%,-50%);display:flex;align-items:center;gap:8px;max-width:var(--bw,92%);height:var(--inH,24px);padding:0 12px;white-space:nowrap;
  background:rgba(4,6,14,.88);box-shadow:inset 0 0 0 1.5px var(--trim),0 6px 18px rgba(0,0,0,.6);animation:kcIntro 2.6s ease-in-out both}
.kc-in.nx{animation-duration:1.9s}
.kc-in.sm em{display:none}
.kc-in b{font:400 clamp(12px,calc(var(--inH,24px) * .62),18px)/1 'Lilita One',sans-serif;color:#fff;letter-spacing:.01em}
.kc-in em{font:italic 800 clamp(9px,calc(var(--inH,24px) * .42),12px)/1 'Barlow Condensed',sans-serif;letter-spacing:.14em;color:var(--trim);font-style:italic}
.kc-al{position:absolute;inset:0;opacity:0;background:radial-gradient(80% 75% at 50% 50%,rgba(var(--alarm),.08),rgba(var(--alarm),.6))}
.yn-kc.alarm .kc-al{animation:kcAlarm .55s ease-in-out infinite alternate}
.kc-bcn{position:absolute;left:50%;top:-30%;width:150%;height:130%;margin-left:-75%;opacity:0;background:conic-gradient(from 0deg at 50% 0%,transparent 0 160deg,rgba(255,50,30,.5) 175deg,transparent 190deg 340deg,rgba(255,50,30,.4) 352deg,transparent 360deg);transform-origin:50% 0}
.yn-kc.alarm .kc-bcn{opacity:1;animation:kcSpin 1.1s linear infinite}
.kc-big{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);white-space:nowrap;padding:10px 22px 12px;text-align:center;font:400 46px/1 'Lilita One',sans-serif;letter-spacing:.02em;color:#fff;
  background:radial-gradient(closest-side,rgba(10,0,0,.78),rgba(10,0,0,.55) 70%,transparent);
  -webkit-text-stroke:3px #000;paint-order:stroke fill;text-shadow:0 5px 0 rgba(0,0,0,.6);animation:kcBig 1.1s cubic-bezier(.3,1.6,.5,1) both}
.kc-big.bad{color:#ff5a4a;-webkit-text-stroke-color:#4a0604;text-shadow:0 5px 0 #4a0604,0 0 26px rgba(255,40,30,.8)}
.kc-big small{display:block;margin-top:6px;text-align:center;font:italic 900 15px/1.1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.14em;-webkit-text-stroke:0;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.8)}
.kc-wo{position:absolute;inset:0;background:#fff;opacity:0}
.kc-out{position:absolute;inset:0;z-index:7;display:none;overflow:hidden;background:linear-gradient(180deg,#5ab8ff 0%,#a8dcff 45%,#fff2c8 78%,#ffe08a 100%)}
.yn-kc.out .kc-out{display:block;animation:kcOut .5s ease-out both}
.kc-out .ray{position:absolute;left:50%;top:62%;width:260%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;
  background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.55) 0 7deg,transparent 7deg 22deg);-webkit-mask:radial-gradient(closest-side,#000 20%,transparent 70%);mask:radial-gradient(closest-side,#000 20%,transparent 70%);animation:kcSpin 14s linear infinite}
.kc-out .sun{position:absolute;left:50%;top:62%;width:34%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#fff 0 40%,#fff6c8 55%,rgba(255,220,120,0) 72%)}
.kc-out svg{position:absolute;left:0;right:0;bottom:0;width:100%;height:30%}
.kc-out .ttl{position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);text-align:center;white-space:nowrap;animation:kcBig 1s .15s cubic-bezier(.3,1.6,.5,1) both}
.kc-out .ttl b{display:block;font:400 54px/1 'Lilita One',sans-serif;color:#ffd25a;-webkit-text-stroke:3px #6a3a00;paint-order:stroke fill;text-shadow:0 5px 0 #6a3a00,0 0 30px rgba(255,255,255,.8)}
.kc-out .ttl small{display:block;margin-top:6px;font:italic 900 14px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.18em;color:#3a2400}
.kc-out .cf{position:absolute;top:-10px;width:var(--w);height:var(--h);background:var(--c);animation:kcConf var(--d) var(--dl) cubic-bezier(.25,.6,.4,1) both}
/* ---------------------------------------------------------------- cevap: KAÇIŞ PLANI (mavi plan kâğıdı) */
.kc-map{position:absolute;inset:0;z-index:8;display:none;flex-direction:column;gap:3px;padding:8px 10px 8px;overflow:hidden;
  background:linear-gradient(rgba(140,190,255,.08) 1px,transparent 1px) 0 0/14px 14px,linear-gradient(90deg,rgba(140,190,255,.08) 1px,transparent 1px) 0 0/14px 14px,linear-gradient(180deg,#0c2350,#081a3c 60%,#06122c)}
.yn-kc.rv .kc-map{display:flex;animation:kcMap .45s ease-out both}
.km-hd{flex:none;display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:0 2px 2px;border-bottom:1.5px solid rgba(160,205,255,.35)}
.km-hd b{font:italic 900 15px/1.1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.16em;color:#fff}
.km-hd small{font:italic 800 10.5px/1.1 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:#9fc8ff;white-space:nowrap}
.km-body{position:relative;flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:space-between}
.km-route{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.km-route path{fill:none;stroke:#ffd25a;stroke-width:2.5;stroke-dasharray:6 5;stroke-linecap:round;opacity:.9;animation:kcDash 1.2s .35s ease-out both}
.km-ex{position:relative;flex:none;display:flex;align-items:center;gap:8px;min-height:calc(var(--av) + 10px);padding:3px 8px;background:linear-gradient(90deg,rgba(255,224,120,.28),rgba(255,224,120,.06));
  box-shadow:inset 0 0 0 1.5px rgba(255,214,110,.7);animation:kcRow .35s calc(var(--k) * 110ms + .15s) ease-out both}
.km-ex .sun{flex:none;width:22px;height:22px;border-radius:50%;background:radial-gradient(circle,#fff 0 30%,#ffd25a 45%,rgba(255,200,80,0) 72%);box-shadow:0 0 14px rgba(255,220,120,.9)}
.km-ex>span{display:flex;flex-direction:column;min-width:0;flex:1 1 auto}
.km-ex b{font:italic 900 14px/1.05 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.12em;color:#ffe08a;white-space:nowrap}
.km-ex small{display:block;font:italic 800 9.5px/1.1 'Barlow Condensed',sans-serif;letter-spacing:.12em;color:rgba(255,236,190,.75);overflow-wrap:normal}
.km-ex .avs{flex:0 1 auto;display:flex;flex-direction:row;flex-wrap:wrap;justify-content:flex-end;gap:7px}
.km-r{position:relative;flex:none;display:grid;grid-template-columns:var(--lbw) 1fr 1fr 1fr;column-gap:5px;row-gap:2px;animation:kcRow .35s calc(var(--k) * 110ms + .15s) ease-out both}
.km-lb{grid-row:1 / span 2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:0}
.km-lb b{font:italic 900 22px/.9 'Barlow Condensed','Lilita One',sans-serif;color:#fff}
.km-lb small{max-width:100%;font:italic 800 8.5px/1.05 'Barlow Condensed',sans-serif;letter-spacing:.08em;color:#9fc8ff;text-align:center;overflow-wrap:normal}
.km-lb .avs{display:flex;flex-wrap:wrap;justify-content:center;gap:2px}
.km-d{position:relative;display:flex;align-items:center;justify-content:center;min-height:var(--dh);padding:3px 4px 3px;text-align:center;border-radius:5px 5px 0 0;
  background:rgba(10,30,70,.75);box-shadow:inset 0 0 0 1.5px rgba(160,205,255,.45);color:rgba(220,235,255,.85)}
.km-d span{display:block;max-width:100%;font:700 12px/1.05 'Fredoka',sans-serif;overflow-wrap:normal;word-break:normal;hyphens:manual}
.km-d.ok{background:linear-gradient(180deg,rgba(60,210,110,.55),rgba(20,120,60,.55));box-shadow:inset 0 0 0 2px #7dff9a,0 0 12px rgba(90,255,140,.35);color:#fff}
.km-d.tr{background:linear-gradient(180deg,rgba(230,60,40,.6),rgba(120,16,10,.6));box-shadow:inset 0 0 0 2px #ff6a5a;color:#fff}
.km-d.tr::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:repeating-linear-gradient(90deg,transparent 0 9px,rgba(0,0,0,.35) 9px 11px);opacity:.6}
.km-ln{display:flex;align-items:center;justify-content:center;gap:3px;min-height:calc(var(--av) + 4px)}
.km-av{position:relative;flex:none;width:var(--av);height:var(--av);border-radius:50%;box-shadow:0 0 0 2px var(--c),0 0 0 3.5px rgba(255,255,255,.85);background:var(--c);animation:flPopIn .35s calc(var(--k) * 90ms + .6s) cubic-bezier(.3,1.8,.5,1) both}
.km-av .fl-av{width:100%;height:100%;border:0;border-radius:50%;box-shadow:none}
.km-av.me{box-shadow:0 0 0 2px var(--c),0 0 0 4px #ffd25a,0 0 10px rgba(255,210,90,.8)}
.km-av>u{position:absolute;right:-4px;bottom:-3px;width:13px;height:13px;border-radius:50%;display:grid;place-items:center;background:#ff3a2a;box-shadow:0 0 0 1.5px #fff;text-decoration:none}
.km-av>u.ok{background:#16c060}.km-av>u.t{background:#5a6a8a}
.km-av>u svg{width:8px;height:8px}
.km-in{position:relative;flex:none;display:flex;align-items:center;justify-content:center;gap:6px;height:14px;font:italic 800 9.5px/1 'Barlow Condensed',sans-serif;letter-spacing:.3em;color:#9fc8ff;animation:kcRow .35s .1s ease-out both}
.km-in::before,.km-in::after{content:'';flex:1 1 auto;height:1.5px;background:rgba(160,205,255,.35)}
@keyframes kcShake{10%,90%{transform:translate(-2px,1px)}20%,80%{transform:translate(4px,-2px)}30%,50%,70%{transform:translate(-7px,3px)}40%,60%{transform:translate(7px,-3px)}}
@keyframes kcSlam{0%{transform:rotateY(30deg)}82%{transform:rotateY(-3deg)}100%{transform:rotateY(0)}}
@keyframes kcSlamR{0%{transform:rotateY(-30deg)}82%{transform:rotateY(3deg)}100%{transform:rotateY(0)}}
@keyframes kcBars{0%{transform:translateY(-104%)}100%{transform:translateY(0)}}
@keyframes kcAsk{from{transform:rotateY(0)}to{transform:rotateY(9deg)}}
@keyframes kcAskR{from{transform:rotateY(0)}to{transform:rotateY(-9deg)}}
@keyframes kcGlow{from{opacity:.75;transform:scale(.94)}to{opacity:1;transform:scale(1.06)}}
@keyframes kcFlame{0%{transform:scaleY(1) skewX(-3deg)}50%{transform:scaleY(1.12) skewX(2deg)}100%{transform:scaleY(.9) skewX(4deg)}}
@keyframes kcNeon{0%,42%,46%,100%{opacity:1}43%,45%,71%{opacity:.25}72%{opacity:1}}
@keyframes kcNeonG{0%,42%,46%,100%{opacity:1}43%,45%,71%{opacity:.2}72%{opacity:1}}
@keyframes kcBulb{0%,100%{opacity:1}48%{opacity:.82}52%{opacity:.6}56%{opacity:.95}}
@keyframes kcBump{0%{transform:skewX(-8deg) scale(1)}40%{transform:skewX(-8deg) scale(1.18)}100%{transform:skewX(-8deg) scale(1)}}
@keyframes kcIntro{0%{opacity:0;transform:translate(-50%,-50%) scaleX(.6)}10%{opacity:1;transform:translate(-50%,-50%)}84%{opacity:1;transform:translate(-50%,-50%)}100%{opacity:0;transform:translate(-50%,-50%) scaleX(1.06)}}
@keyframes kcAlarm{from{opacity:.35}to{opacity:1}}
@keyframes kcDread{from{opacity:.25}to{opacity:1}}
@keyframes kcSpin{to{transform:rotate(360deg)}}
@keyframes kcBig{0%{opacity:0;transform:translate(-50%,-50%) scale(.3) rotate(-8deg)}30%{opacity:1;transform:translate(-50%,-50%) scale(1.15) rotate(-3deg)}100%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(-3deg)}}
@keyframes kcOut{from{opacity:0}to{opacity:1}}
@keyframes kcConf{0%{opacity:1;transform:translate(0,0) rotate(0)}85%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y)) rotate(var(--r))}}
@keyframes kcMap{from{opacity:0;transform:scale(1.03)}to{opacity:1;transform:none}}
@keyframes kcRow{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes kcDash{from{stroke-dashoffset:300}to{stroke-dashoffset:0}}
@media (prefers-reduced-motion:reduce){.kc-lamp .fl,.kc-lamp .gl,.kc-tun .tf,.kc-tun .tg,.kc-out .ray,.kc-bcn,.yn-kc .kc-shade::after{animation:none}.yn-kc[data-zor="3"] .kc-shade::after{opacity:.7}}
`;

const ICO = {
	ok: '<svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5 10-11" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
	no: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>',
	kum: '<svg viewBox="0 0 24 24"><path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
};

/**
 * Odanın tek kaçış noktalı perspektif çizgileri (durağan): taban karoları ve tavan kirişleri kaçış noktasına (arka duvarın
 * ortası) koşar, yan duvarlarda taş sıraları. Ölçülen sahne boyunda çizilir.
 */
function roomLines(G, tema) {
	const { W, H, bL, bT, bw, bh } = G;
	const vx = W / 2;
	const vy = bT + bh * 0.5;
	const bB = bT + bh;
	const bR = bL + bw;
	const ink = tema === 'lab' ? 'rgba(60,80,100,.55)' : 'rgba(0,0,0,.42)';
	const hi = tema === 'lab' ? 'rgba(255,255,255,.18)' : 'rgba(255,220,170,.07)';
	let d = '';
	let h = '';
	// taban: kaçış noktasından arka duvarın alt kenarındaki noktalardan geçen çizgiler, yakına doğru açılır
	const n = 8;
	for (let i = 0; i <= n; i++) {
		const xb = bL + (bw * i) / n;
		const t = (H - vy) / (bB - vy);
		d += `M${f1(xb)} ${f1(bB)}L${f1(vx + (xb - vx) * t)} ${f1(H)}`;
	}
	// taban: derinlik sıraları (yakına doğru aralık büyür)
	for (let k = 1; k <= 5; k++) {
		const y = vy + (bB - vy) / (1 - k * 0.16);
		if (y >= H) break;
		const t = (y - vy) / (bB - vy);
		d += `M${f1(vx + (bL - vx) * t)} ${f1(y)}H${f1(vx + (bR - vx) * t)}`;
	}
	// tavan kirişleri
	for (let i = 1; i < 6; i++) {
		const xb = bL + (bw * i) / 6;
		const t = (vy - 0) / (vy - bT);
		d += `M${f1(xb)} ${f1(bT)}L${f1(vx + (xb - vx) * t)} 0`;
	}
	// yan duvarlar: taş sıraları kaçış noktasına
	for (let k = 1; k < 8; k++) {
		const yb = bT + (bh * k) / 8;
		const tl = (0 - vx) / (bL - vx);
		h += `M${f1(bL)} ${f1(yb)}L0 ${f1(vy + (yb - vy) * tl)}M${f1(bR)} ${f1(yb)}L${W} ${f1(vy + (yb - vy) * tl)}`;
	}
	return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}${h}" stroke="${ink}" stroke-width="1.2" fill="none"/><path d="${d}" stroke="${hi}" stroke-width="1" fill="none" transform="translate(0 1)"/>
		<path d="M${f1(bL)} ${f1(bB)}H${f1(bR)}M${f1(bL)} ${f1(bT)}H${f1(bR)}M${f1(bL)} ${f1(bT)}V${f1(bB)}M${f1(bR)} ${f1(bT)}V${f1(bB)}" stroke="rgba(0,0,0,.55)" stroke-width="2" fill="none"/></svg>`;
}

/** Çıkışın ufuk çizgisi (temaya göre): selvi ve kubbe, şehir, stadyum çatısı. */
function skyline(tema) {
	if (tema === 'saray')
		return `<svg viewBox="0 0 400 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 120V96h40l6-30 6 30h30V80q20-30 40 0v16h60V60l4-14 4 14v36h40V84q24-36 48 0v12h32l7-34 7 34h40V120z" fill="#2a3a2a"/><path d="M0 120V108h400v12z" fill="#1a281a"/></svg>`;
	if (tema === 'lab')
		return `<svg viewBox="0 0 400 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 120V84h30V60h34v24h20V40h40v44h24V70h30v14h36V50h44v34h22V64h32v20h30v-30h38v66z" fill="#2c4058"/><path d="M0 120V104h400v16z" fill="#1c2c40"/></svg>`;
	return `<svg viewBox="0 0 400 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 120V70q200-50 400 0v50z" fill="#3a4a5a"/><path d="M20 72q180-40 360 0" fill="none" stroke="#c8d4e0" stroke-width="3"/><path d="M0 120V98q200-14 400 0v22z" fill="#2c8a3c"/></svg>`;
}

export const kacis = {
	time: 30,
	label: 'Kaçış Odası',
	kind: 'closest',
	keep: true,
	cover: true, // tam ekran kaçış odası (harita gizli)
	rule: 'Doğru kapıyı aç, kaç',
	revealMs: 4200, // cevap: kaçış planı açılır (~1,6 sn), herkes durduğu kapıya oturur; okumaya pay
	jokers: ['yari', 'kahin'],
	// sonuç ekranı (ui.js _showResult): kimse kaçamadıysa en derine inen birinci; kaçan (err 0) arayüzün TAM İSABET'i
	birinci: 'EN UZAĞA SEN!',
	rozet: 'EN DERİNE',
	fmt: (v, value) => {
		const r = kacisOf(v, value);
		return r.stop === 'cikis' ? 'KAÇTI' : `${r.n} oda`;
	},
	sub: (v, value) => {
		const r = kacisOf(v, value);
		return r.stop === 'cikis' ? `${v.rooms.length} oda geçti` : r.stop === 'tuzak' ? `${r.n + 1}. odada tuzak` : `${r.n + 1}. odada süre doldu`;
	},
	prepare(q, R) {
		const rooms = q.rooms.map((r) => {
			const o = shuffle([0, 1, 2], R);
			return { ad: r.ad, q: r.q, opts: o.map((i) => r.a[i]), d: clamp(Math.round(r.d || q.diff || 2), 1, 3), key: o.indexOf(0) };
		});
		const v = { q, tema: TEMA[q.tema] ? q.tema : 'saray', cikis: q.cikis || 'ÇIKIŞ', rooms: rooms.map(({ key, ...r }) => r), key: rooms.map((r) => r.key) };
		// iş: her odada soru + üç levha (oku, kapılar arası bak), düşün (odanın zorluğu), dokun; aradaki koşular bekleme
		return stamp(v, q, (q2, k, P, text) => {
			let look = LOOK.orient + LOOK.gaze;
			let think = 0;
			let act = 0;
			for (const r of q.rooms) {
				text(r.q);
				for (const a of r.a) text(a);
				look += 3 * LOOK.gaze;
				think += (P.think?.[0] || 2) + (P.think?.[1] || 0.8) * (clamp(Math.round(r.d || q.diff || 2), 1, 3) - 1);
				act += ACT.tap;
			}
			return { wait: OPEN + (q.rooms.length - 1) * TRANS, look, think, act };
		});
	},
	/** Çevrimiçi görünüm: doğru kapılar (key) ve verideki şık sırası yok. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.key;
		delete o.q.rooms;
		return o;
	},
	judge(v, value) {
		if (!value || !Array.isArray(value.picks)) return { correct: false, err: v.rooms.length + 1, rooms: 0 };
		const r = kacisOf(v, value);
		const R = v.rooms.length;
		// eşit odada önce varan önde: o odanın kapısına varış (son doğru kapı + koşu) binde bir payla
		const t = r.n > 0 && r.n < R ? Number(r.at[r.n - 1]) : 0;
		const tie = Number.isFinite(t) ? clamp(t, 0, 99) / 1000 : 0;
		return { correct: r.n === R, err: R - r.n + tie, rooms: r.n };
	},
	bot(v, skill, R) {
		// botun koşusu: toplam süre botTime'dan (hızlı–ortanca/yavaş insan arası), odalara okuma ve düşünme payıyla dağılır;
		// her odada doğruluk odanın zorluğuna göre (üç kapı: dört şıktan biraz kolay)
		const sec = v.sec || 30;
		const T = botTime(v, R, skill, 0.15, 1);
		const w = v.rooms.map((r) => len(r.q) / 20 + 0.45 * r.opts.reduce((s, o) => s + len(o), 0) / 20 + 1 + 0.9 * (r.d - 1));
		const sw = w.reduce((a, b) => a + b, 0) || 1;
		const busy = 0.6 + (v.rooms.length - 1) * TRANS;
		const pool = Math.max(v.rooms.length * 1.1, T - busy);
		const picks = [];
		const at = [];
		let t = 0.6;
		for (let k = 0; k < v.rooms.length; k++) {
			t += (pool * w[k]) / sw;
			if (t > sec - 0.2) return { value: { picks, at }, time: sec };
			const ok = R() < Math.min(0.97, pCorrect(skill, v.rooms[k].d) + 0.06);
			let p = v.key[k];
			if (!ok) do p = Math.floor(R() * v.rooms[k].opts.length); while (p === v.key[k]);
			picks.push(p);
			at.push(Math.round(t * 100) / 100);
			if (!ok) return { value: { picks, at }, time: Math.min(sec, t + TRAP) };
			if (k < v.rooms.length - 1) t += TRANS;
		}
		return { value: { picks, at }, time: Math.min(sec, t + EXIT) };
	},
	/** Sınama örneği (test/deneme.test.mjs): üç doğru kapı ve ilk odada tuzak. */
	ornek(v) {
		return { good: { picks: v.key.slice(), at: [4, 10, 16] }, bad: { picks: [(v.key[0] + 1) % 3], at: [3] } };
	},
	joker(id, v, R) {
		if (id === 'yari') return { hide: v.rooms.map((r, k) => shuffle([0, 1, 2].filter((i) => i !== v.key[k]), R)[0]) };
		if (id === 'kahin')
			return {
				pct: v.rooms.map((r, k) => {
					const pr = 0.46 + R() * 0.2 + (3 - r.d) * 0.08;
					let top = v.key[k];
					if (R() < 0.12) top = (v.key[k] + 1 + Math.floor(R() * 2)) % 3;
					const o = [0, 1, 2].map((i) => (i === top ? 0 : 0.3 + R()));
					const s = o.reduce((a, b) => a + b, 0) || 1;
					const pct = o.map((x) => Math.round((x / s) * (100 - Math.round(pr * 100))));
					pct[top] = 100 - pct.reduce((a, b) => a + b, 0);
					return pct;
				}),
			};
		return null;
	},
	mount(el, v, api) {
		css('kacis', CSS);
		const app = appOf();
		const card = el.closest('.fl-q');
		const m = app?.match;
		const cur = m?.cur && m.cur.v === v ? m.cur : null;
		const N = v.rooms.length;
		// doğru kapılar: yerelde görünümde; çevrimiçinde gizli (publicView), kapı sunucuya sorulur (act 'kapi' → ev 'kapi'
		// { k, ok }; arayüz api.act / api.wait sağlar, t_blitz.js gibi). Cevapta tam görünüm gelirse plan onunla çizilir.
		let key = Array.isArray(v.key) ? v.key : null;
		const online = !key && typeof api.act === 'function' && typeof api.wait === 'function';
		// oyuncular: afişteki plakalar (portre, ad, renk); botların planı galeride ve maçta canlı oynar (üst şeritte)
		const plates = [...(card?.querySelectorAll('.fl-qwho .fl-qp[data-p]') || [])];
		const P = plates.map((e) => {
			const i = Number(e.dataset.p);
			const p = m?.players?.[i];
			const b = cur?.bots?.find((x) => x.p?.i === i);
			return { i, p, name: p?.name || e.querySelector('.nm b')?.textContent || '', color: p?.css || getComputedStyle(e).getPropertyValue('--pc').trim() || '#888', av: e.querySelector('.fl-av')?.outerHTML || '', human: !!p?.human, plan: b?.value || null };
		});
		const me = P.find((x) => x.human) || null;
		const ops = P.filter((x) => x !== me && x.plan);
		const T = TEMA[v.tema];
		const doorsHTML = (k) =>
			v.rooms[k].opts
				.map(
					(o, i) =>
						`<button class="kc-door d${i}" data-i="${i}" aria-label="${i + 1}. kapı: ${esc(o)}"><span class="dr-fr"></span><span class="dr-hole"></span><span class="dr-leaf"><span class="dr-f"><b class="dr-pl"><span class="dr-tx">${heceli(o)}</span></b><i class="dr-knob"></i></span><span class="dr-b"></span></span></button>`,
				)
				.join('');
		el.innerHTML = `<div class="yn-kc" data-tema="${v.tema}">
			<div class="kc-st">
				<div class="kc-room"><i class="pl kc-ceil"></i><i class="pl kc-floor"></i><i class="pl kc-run"></i><i class="pl kc-lw"></i><i class="pl kc-rw"></i><div class="kc-pers"></div><i class="kc-shade"></i>
					<div class="kc-back"><i class="kc-band"></i><div class="kc-lamps"></div><div class="kc-doors">${doorsHTML(0)}</div></div>
					<i class="kc-bars"></i></div>
				<div class="kc-cor"><div class="kc-tun"></div></div>
				<div class="kc-hud"><div class="kc-lb"><b>1<small>/${N}</small></b><span><em>${esc(T.ad)}</em><strong>${esc(v.rooms[0].ad)}</strong><span class="kc-pips">${v.rooms.map((_, k) => `<i class="${k ? '' : 'at'}"></i>`).join('')}</span></span></div>
</div>
				<div class="kc-ops">${ops.map((o) => `<span class="kc-op" data-i="${o.i}" style="--c:${esc(o.color)}">${o.av}<span class="pp">${v.rooms.map((_, k) => `<i class="${k ? '' : 'at'}"></i>`).join('')}</span><b></b></span>`).join('')}</div>
				<div class="kc-fx"><i class="kc-bcn"></i><i class="kc-al"></i><i class="kc-wo"></i>${me ? `<div class="kc-in"><b>${esc(v.q.q)}</b><em>${N} ODA · TUZAĞA DÜŞME</em></div>` : ''}</div>
				<div class="kc-out"><i class="ray"></i><i class="sun"></i>${skyline(v.tema)}<div class="ttl"><b>ÇIKIŞ!</b><small>${esc(v.cikis)}</small></div></div>
				<div class="kc-map"></div>
			</div></div>`;
		const root = el.querySelector('.yn-kc');
		const st = root.querySelector('.kc-st');
		const roomEl = root.querySelector('.kc-room');
		const doorsEl = root.querySelector('.kc-doors');
		const lampsEl = root.querySelector('.kc-lamps');
		const cor = root.querySelector('.kc-cor');
		const tun = root.querySelector('.kc-tun');
		const fx = root.querySelector('.kc-fx');
		const lb = root.querySelector('.kc-lb');
		const mapEl = root.querySelector('.kc-map');
		const opsEl = root.querySelector('.kc-ops');
		const qt = card?.querySelector('.fl-qtext');
		const timers = [];
		const later = (fn, ms) => timers.push(setTimeout(fn, ms));
		let G = null; // yerleşim
		let room = 0;
		let busy = false;
		let over = false;
		let revealed = false;
		let alive = true;
		let t0 = null; // kart açıldı (oyun saati, ms)
		const picks = [];
		const at = [];
		let hide = null;
		let pct = null;
		const now = () => (t0 == null ? 0 : (clock.now() - t0) / 1000);

		// ------------------------------------------------------------ yerleşim (ölçülen sahneye göre)
		const layout = () => {
			const W = st.clientWidth;
			const H = st.clientHeight;
			if (!W || !H || (G && G.W === W && G.H === H)) return;
			const hud = 40;
			// rakiplerin koşu çipleri: sığarsa üst şeridin sağında (kapılara yer kalır), sığmazsa tabanda (kapıların önünde)
			// şeridin en geniş hali (en uzun oda adıyla) ölçülür: oda değişince ad uzasa da çiplere değmez
			const strong = lb.querySelector('strong');
			const was = strong.textContent;
			strong.textContent = v.rooms.reduce((a, r) => (len(r.ad) > len(a) ? r.ad : a), '');
			const lbW = lb.offsetWidth || 170;
			strong.textContent = was;
			const opsW = ops.length * 58 + Math.max(0, ops.length - 1) * 6;
			const topOps = ops.length > 0 && opsW + lbW + 26 <= W;
			opsEl.classList.toggle('top', topOps);
			const foot = ops.length && !topOps ? 32 : 6;
			const avail = H - hud - foot;
			const bw = Math.round(W * 0.88);
			const bh = Math.round(Math.min(avail * 0.84, bw * 0.8));
			const bL = Math.round((W - bw) / 2);
			const bT = Math.round(hud + (avail - bh) * 0.4);
			const dw = bw * 0.255;
			const gap = (bw - 3 * dw) / 4;
			const dh = bh * 0.82;
			G = { W, H, hud, bw, bh, bL, bT, dw, gap, dh, lw: clamp(Math.round(gap * 0.72), 9, 22) };
			const s = root.style;
			s.setProperty('--bL', bL + 'px');
			s.setProperty('--bR', bL + bw + 'px');
			s.setProperty('--bT', bT + 'px');
			s.setProperty('--bB', bT + bh + 'px');
			s.setProperty('--bw', bw + 'px');
			s.setProperty('--bh', bh + 'px');
			s.setProperty('--dw', dw.toFixed(1) + 'px');
			s.setProperty('--lw', G.lw + 'px');
			placeDoors();
			root.querySelector('.kc-pers').innerHTML = roomLines(G, v.tema);
			const lamp = (x, y, k, sc = 1) => `<i class="kc-lamp" style="left:${f1(x)}px;top:${f1(y)}px;--lw:${f1(G.lw * sc)}px"><i class="gl"></i><i class="br"></i><i class="fl" style="animation-delay:-${(k * 0.37).toFixed(2)}s"></i></i>`;
			// meşaleler: kapıların arasındaki dört sütunda ve iki yan duvarda (yan duvar yakında: daha iri)
			// hepsi arka duvarın altında (z sırası): ışıkları kapıların ve levhaların üstüne düşmez, yazıya binmez
			lampsEl.innerHTML =
				[0, 1, 2, 3].map((k) => lamp(bL + gap / 2 + k * (dw + gap), bT + bh - dh - G.lw * 0.9, k)).join('') +
				(bL >= 12 ? lamp(bL * 0.5, bT + bh * 0.22, 5, clamp(bL / G.lw / 1.6, 0.8, 1.6)) + lamp(W - bL * 0.5, bT + bh * 0.22, 6, clamp(bL / G.lw / 1.6, 0.8, 1.6)) : '');
			// giriş şeridi: duvarın tepesiyle kapıların arasında (levhalara binmez)
			s.setProperty('--inY', f1(bT + (bh - dh) * 0.5) + 'px');
			s.setProperty('--inH', f1(clamp((bh - dh) * 0.78, 16, 30)) + 'px');
			buildTunnel();
			fit();
			if (revealed) drawRoute();
		};
		const placeDoors = () => {
			if (!G) return;
			[...doorsEl.children].forEach((d, i) => {
				d.style.left = f1(G.gap + i * (G.dw + G.gap)) + 'px';
				d.style.width = f1(G.dw) + 'px';
				d.style.height = f1(G.dh) + 'px';
				d.style.setProperty('--dp', Math.round(G.dw * 4) + 'px');
				d.style.setProperty('--pt', v.tema === 'lab' ? '52%' : '36%');
				d.style.setProperty('--ph', v.tema === 'lab' ? '30%' : '34%');
			});
		};
		/** Levha yazısı: kutuya sığan en büyük boy (kelime ortasından bölünmez; uzun kelime hece yerinden). */
		const fitBox = (tx, box, hi, lo = 8.5) => {
			if (!tx || !box.clientWidth) return;
			const cs = getComputedStyle(box);
			const maxW = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
			const maxH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
			const over = () => tx.scrollWidth > maxW + 0.5 || tx.offsetHeight > maxH + 0.5;
			let up = hi;
			tx.style.fontSize = up + 'px';
			if (!over()) return;
			for (let k = 0; k < 9 && up - lo > 0.4; k++) {
				const mid = (lo + up) / 2;
				tx.style.fontSize = mid + 'px';
				if (over()) up = mid;
				else lo = mid;
			}
			tx.style.fontSize = Math.floor(lo * 2) / 2 + 'px';
		};
		/** Şerit tek satır: sığmazsa alt yazı düşer, yine sığmazsa başlık küçülür (yazı kesilmez). */
		const fitIn = (e) => {
			const b = e.querySelector('b');
			e.classList.remove('sm');
			if (b) b.style.fontSize = '';
			if (e.scrollWidth <= e.clientWidth + 0.5) return;
			e.classList.add('sm');
			for (let k = 0; k < 8 && b && e.scrollWidth > e.clientWidth + 0.5; k++) b.style.fontSize = Math.max(9, parseFloat(getComputedStyle(b).fontSize) * 0.92).toFixed(1) + 'px';
		};
		const fit = () => {
			if (!G) return;
			for (const d of doorsEl.children) fitBox(d.querySelector('.dr-tx'), d.querySelector('.dr-pl'), clamp(G.dw * 0.2, 11, 19));
			for (const e of fx.querySelectorAll('.kc-in')) fitIn(e);
		};

		// ------------------------------------------------------------ koridor (CSS 3B): bölümlü taban, tavan, yan duvarlar, meşaleler
		const buildTunnel = () => {
			if (!G) return;
			const { W, H } = G;
			const Pd = Math.round(W * 0.9);
			const cw = W;
			const ch = Math.round(H * 0.92);
			const segs = 7;
			const sl = Math.round(W * 0.8);
			const LEN = segs * sl;
			// kapının ekrandaki yeri: koridorun bakış noktası odanın arka duvarının ortası (geçişte kayma olmasın)
			const po = ((G.bT + G.bh * 0.5) / H) * 100;
			cor.style.setProperty('--P', Pd + 'px');
			cor.style.setProperty('--po', po.toFixed(1) + '%');
			const s = tun.style;
			s.setProperty('--cw', cw + 'px');
			s.setProperty('--ch', ch + 'px');
			s.setProperty('--sl', sl + 'px');
			s.setProperty('--edw', f1(cw * (G.dw / G.bw)) + 'px');
			s.setProperty('--edh', f1(ch * (G.dh / G.bh)) + 'px');
			let h = '';
			for (let k = 0; k < segs; k++) {
				const z = -k * sl;
				h += `<i class="fw" style="transform:translate3d(${-cw / 2}px,${ch / 2}px,${z}px) rotateX(-90deg)"></i>`;
				h += `<i class="cw2" style="transform:translate3d(${-cw / 2}px,${-ch / 2}px,${z}px) rotateX(-90deg)"></i>`;
				h += `<i class="sw l" style="transform:translate3d(${-cw / 2}px,${-ch / 2}px,${z}px) rotateY(90deg)"></i>`;
				h += `<i class="sw r" style="transform:translate3d(${cw / 2 - sl}px,${-ch / 2}px,${z}px) rotateY(-90deg)"></i>`;
			}
			// meşaleler: iki yanda, bölüm başına bir çift (kamera aralarından koşar)
			const lw = G.lw * 1.6;
			for (let k = 0; k < segs * 2; k++) {
				const z = -(k + 0.5) * (sl / 2);
				for (const sd of [-1, 1]) {
					// sarıcı 3B'de yerleşir, içteki öğe titreşir (devinimin transform'u yerleşimi ezmesin)
					const x = sd * (cw / 2 - lw * 0.6);
					const d = `animation-delay:-${((k * 0.13) % 0.5).toFixed(2)}s`;
					h += `<i class="tq g" style="--lw:${f1(lw)}px;transform:translate3d(${f1(x - lw * 4.5)}px,${f1(-ch * 0.1 - lw * 4.5)}px,${f1(z)}px) rotateY(${sd * 90}deg)"><i class="tg" style="${d}"></i></i>`;
					h += `<i class="tq f" style="--lw:${f1(lw)}px;transform:translate3d(${f1(x - sd * lw * 1.2 - lw * 0.8)}px,${f1(-ch * 0.1 - lw * 2.6)}px,${f1(z)}px)"><i class="tf" style="${d}"></i></i>`;
				}
			}
			h += `<div class="ew" style="transform:translate3d(${-cw / 2}px,${-ch / 2}px,${-LEN}px)">${[0, 1, 2].map((i) => `<i style="left:${f1(cw * ((G.gap + i * (G.dw + G.gap)) / G.bw))}px"></i>`).join('')}</div>`;
			tun.innerHTML = h;
			G.cor = { Pd, cw, ch, sl, LEN, stop: LEN - Pd * (cw / G.bw - 1) };
		};
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => layout()) : null;
		ro?.observe(st);
		layout();
		requestAnimationFrame(layout);
		document.fonts?.ready?.then(() => alive && fit());

		// ------------------------------------------------------------ oda değişimi: soru yazısı, şerit, kapılar
		const showRoom = (k) => {
			room = k;
			// odanın zorluğu atmosferi belirler (gölge, kızıl nabız, ışıkların titremesi)
			root.dataset.zor = String(clamp(Math.round(v.rooms[k].d || 1), 1, 3));
			if (k > 0 && me && !over) {
				// yeni odaya varış şeridi: odanın adı, sırası, zorlaştıysa uyarı (duvarın tepesinde; levhalara binmez)
				const r = v.rooms[k];
				const up = (r.d || 1) > (v.rooms[k - 1].d || 1);
				for (const e of fx.querySelectorAll('.kc-in')) e.remove();
				fx.insertAdjacentHTML('beforeend', `<div class="kc-in nx"><b>${esc(r.ad)}</b><em>${k === N - 1 ? 'SON ODA' : `${k + 1}. ODA`}${up ? ' · DAHA ZOR' : ''}</em></div>`);
			}
			doorsEl.innerHTML = doorsHTML(k);
			placeDoors();
			fit();
			applyJokers();
			lb.querySelector('b').innerHTML = `${k + 1}<small>/${N}</small>`;
			lb.querySelector('strong').textContent = v.rooms[k].ad;
			[...lb.querySelectorAll('.kc-pips i')].forEach((p, j) => (p.className = j < k ? 'on' : j === k ? 'at' : ''));
			if (qt) {
				qt.textContent = v.rooms[k].q;
				qt.animate?.([{ opacity: 0, transform: 'translateX(24px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.3,1.3,.5,1)' });
			}
			for (const d of doorsEl.children) d.addEventListener('click', () => pick(Number(d.dataset.i)));
			if (!me || over) for (const d of doorsEl.children) d.disabled = true;
		};
		const applyJokers = () => {
			const ds = [...doorsEl.children];
			if (hide && Number.isInteger(hide[room])) {
				const d = ds[hide[room]];
				if (d) {
					d.classList.add('gone');
					d.disabled = true;
				}
			}
			if (pct?.[room]) {
				const live = ds.filter((d) => !d.classList.contains('gone'));
				const sum = live.reduce((a, d) => a + (pct[room][Number(d.dataset.i)] || 0), 0) || 1;
				for (const d of live) d.querySelector('.dr-f').insertAdjacentHTML('beforeend', `<s class="dr-pc">%${Math.round(((pct[room][Number(d.dataset.i)] || 0) / sum) * 100)}</s>`);
			}
		};
		if (qt) qt.textContent = v.rooms[0].q;
		showRoom(0);

		// ------------------------------------------------------------ kapıya dokunuş
		const done = (ms) =>
			later(() => {
				if (alive) api.answer({ picks: picks.slice(), at: at.slice() });
			}, ms);
		/** Şerit (giriş ya da varış) kapıya dokununca hızla söner: geçişin ve TUZAK! yazısının önünde kalmasın. */
		const dropIn = () => {
			for (const e of fx.querySelectorAll('.kc-in')) {
				const o = getComputedStyle(e).opacity;
				e.style.animation = 'none';
				const a = e.animate?.([{ opacity: o }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
				if (a) a.finished.then(() => e.remove(), () => {});
				else e.remove();
			}
		};
		let asking = false;
		async function pick(i) {
			if (!me || busy || over || revealed || asking || t0 == null) return;
			const d = doorsEl.children[i];
			if (!d || d.classList.contains('gone')) return;
			const t = Math.round(now() * 100) / 100;
			for (const x of doorsEl.children) x.disabled = true;
			dropIn();
			let ok = true; // görünümde anahtar da sunucu da yoksa (olmamalı) kapı açılır; hükmü cevapta judge verir
			if (key) ok = key[room] === i;
			else if (online) {
				// sunucunun yanıtına dek tokmak oynar (ağ payı); yanıt yoksa ya da reddedildiyse kapılar yeniden açılır
				const k = room;
				asking = true;
				d.classList.add('ask');
				api.act('kapi', { k, i });
				const r = await api.wait('kapi', 3000);
				asking = false;
				d.classList.remove('ask');
				if (!alive || over || revealed) return;
				if (r && (r.rejected || r.late || r.k !== k)) {
					if (!r.late) for (const x of doorsEl.children) if (!x.classList.contains('gone')) x.disabled = false;
					return;
				}
				// yanıt yoksa (sunucuda adım yok ya da ağ koptu) koşu donmasın: kapı açılır, hükmü cevapta sunucunun judge'ı verir
				ok = r ? !!r.ok : true;
			}
			picks.push(i);
			at.push(t);
			if (!ok) return trap(d);
			if (room >= N - 1) return escape(d, i);
			advance(d, i);
		}
		/** Doğru kapı: gıcırdayarak açılır, oda kapıya yaklaşıp söner, koridor koşusu, yeni oda. */
		function advance(d, i, last = false) {
			busy = true;
			root.classList.add('busy');
			d.classList.add('open');
			sfx(app, 'catapult');
			buzz(12);
			const ms = TRANS * 1000;
			const W = G.W;
			const H = G.H;
			// kapının ortası (oda katmanında)
			const dcx = G.bL + G.gap + i * (G.dw + G.gap) + G.dw / 2;
			const dcy = G.bT + G.bh - G.dh / 2;
			const k = Math.max(3.2, (H / G.dh) * 1.25);
			const push = roomEl.animate(
				[
					{ transform: 'none', opacity: 1 },
					{ transform: `translate(${f1(W / 2 - dcx * k)}px,${f1(H * 0.5 - dcy * k)}px) scale(${k.toFixed(2)})`, opacity: 1, offset: 0.85 },
					{ transform: `translate(${f1(W / 2 - dcx * k * 1.1)}px,${f1(H * 0.5 - dcy * k * 1.1)}px) scale(${(k * 1.1).toFixed(2)})`, opacity: 0 },
				],
				{ duration: 520, delay: 330, easing: 'cubic-bezier(.55,0,.8,.4)', fill: 'both' },
			);
			// koridor: kamera meşalelerin arasından koşar (uç duvar sonraki odanın yerine oturur). Koridor yalnız geçişte
			// çizim ağacında (display): boştayken onlarca 3B katman telefonda ve ekran görüntüsünde boşuna çizilmesin
			cor.classList.add('on');
			tun.querySelector('.ew')?.classList.toggle('out', last);
			cor.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: 720, fill: 'both' });
			const run = tun.animate(
				[
					{ transform: 'translate3d(0,0,0)' },
					{ transform: `translate3d(0,${f1(-G.H * 0.012)}px,${f1(G.cor.stop * 0.35)}px)`, offset: 0.3 },
					{ transform: `translate3d(0,${f1(G.H * 0.01)}px,${f1(G.cor.stop * 0.7)}px)`, offset: 0.62 },
					{ transform: `translate3d(0,0,${f1(G.cor.stop)}px)` },
				],
				{ duration: last ? 820 : 900, delay: 760, easing: 'cubic-bezier(.35,.1,.3,1)', fill: 'both' },
			);
			later(() => sfx(app, 'whoosh'), 760);
			if (last) return { push, run };
			later(() => {
				if (!alive) return;
				showRoom(room + 1);
				push.cancel();
				roomEl.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
				cor.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).finished.then(() => {
					run.cancel();
					cor.getAnimations().forEach((a) => a.cancel());
					cor.classList.remove('on');
				}, () => {});
				later(() => {
					busy = false;
					root.classList.remove('busy');
					if (!over && me) for (const x of doorsEl.children) if (!x.classList.contains('gone')) x.disabled = false;
				}, 200);
			}, ms - 220);
			return { push, run };
		}
		/** Son kapı: koridorun ucunda gün ışığı; beyaz patlama, ÇIKIŞ! */
		function escape(d, i) {
			over = true;
			advance(d, i, true);
			lb.querySelectorAll('.kc-pips i').forEach((p) => (p.className = 'on'));
			later(() => {
				if (!alive) return;
				fx.querySelector('.kc-wo').animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 700, easing: 'ease-out' });
				later(() => {
					if (!alive) return;
					root.classList.add('out');
					confetti();
					sfx(app, 'dawn');
					sfx(app, 'cheer');
					buzz([30, 50, 80]);
				}, 260);
			}, 1380);
			done(EXIT * 1000 + 500);
		}
		/** Yanlış kapı: aralanır (kırmızı ışık), çarpar; alarm, parmaklık, TUZAK! */
		function trap(d) {
			over = true;
			busy = true;
			root.classList.add('busy');
			d.classList.add('trap', 'crack');
			sfx(app, 'kbLock');
			later(() => {
				if (!alive) return;
				d.classList.remove('crack');
				d.classList.add('slam');
				st.classList.remove('shake');
				void st.offsetWidth;
				st.classList.add('shake');
				sfx(app, 'tower', { soft: true });
				buzz([60, 40, 90]);
				app?.cam?.impulse?.(0.4);
			}, 300);
			later(() => {
				if (!alive) return;
				root.classList.add('alarm');
				sfx(app, 'sabotage');
			}, 420);
			later(() => {
				if (!alive) return;
				root.classList.add('trapped');
				sfx(app, 'crumble');
			}, 560);
			later(() => {
				if (!alive) return;
				fx.insertAdjacentHTML('beforeend', `<b class="kc-big bad">TUZAK!<small>${room + 1}. ODADA KAPANA KISILDIN</small></b>`);
				[...lb.querySelectorAll('.kc-pips i')].forEach((p, j) => (p.className = j < room ? 'on' : j === room ? 'x' : ''));
			}, 650);
			done(TRAP * 1000);
		}
		const confetti = () => {
			const out = root.querySelector('.kc-out');
			let h = '';
			const cols = ['#ffd25a', '#fff', '#ff6a5a', '#5ad1ff', '#7dff9a', me?.color || '#ffd25a'];
			for (let k = 0; k < 40; k++)
				h += `<i class="cf" style="left:${(k * 37) % 100}%;--w:${4 + (k % 4)}px;--h:${6 + (k % 5)}px;--c:${cols[k % cols.length]};--x:${((k * 53) % 120) - 60}px;--y:${G ? Math.round(G.H * (0.7 + (k % 5) * 0.08)) : 300}px;--r:${400 + ((k * 97) % 600)}deg;--d:${1400 + ((k * 61) % 900)}ms;--dl:${(k * 23) % 400}ms"></i>`;
			out.insertAdjacentHTML('beforeend', h);
		};

		// ------------------------------------------------------------ açılış ve rakiplerin canlı koşusu
		const tick = setInterval(() => {
			if (!alive || t0 == null || revealed) return;
			const e = now();
			for (const o of ops) {
				const chip = root.querySelector(`.kc-op[data-i="${o.i}"]`);
				if (!chip) continue;
				const pl = o.plan;
				let n = 0;
				let x = null;
				for (let k = 0; k < (pl.picks || []).length; k++) {
					if (!(pl.at?.[k] <= e)) break;
					if (key && pl.picks[k] !== key[k]) {
						x = 'no';
						break;
					}
					n = k + 1;
				}
				const st2 = x || (n >= N ? 'ok' : '');
				if (chip.dataset.s !== st2 + n) {
					const first = chip.dataset.s == null;
					chip.dataset.s = st2 + n;
					chip.className = `kc-op ${st2}`;
					chip.querySelector('b').innerHTML = st2 === 'ok' ? ICO.ok : st2 === 'no' ? ICO.no : '';
					[...chip.querySelectorAll('.pp i')].forEach((p, j) => (p.className = j < n ? 'on' : j === n ? (x ? 'x' : 'at') : ''));
					if (!first) {
						// rakip ilerledi: şeridindeki çip zıplar (soruyu okurken bildirim kutusu açılmaz); kaçtıysa kısa bir ses
						chip.classList.remove('bump');
						void chip.offsetWidth;
						chip.classList.add('bump');
						if (st2 === 'ok') sfx(app, 'answered', { player: o.i });
					}
				}
			}
		}, 150);
		/** Açılış: kamera odaya süzülür, ışıklar soldan sağa birer birer yanar (meşale tutuşur, floresan titreyip açılır, lamba ısınır). */
		const enter = () => {
			if (!G || !alive || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
			const z = 1.1;
			roomEl.animate?.([{ transform: `translate(${f1((G.W / 2) * (1 - z))}px,${f1((G.bT + G.bh * 0.6) * (1 - z))}px) scale(${z})` }, { transform: 'none' }], {
				duration: 1200,
				easing: 'cubic-bezier(.2,.65,.25,1)',
			});
			const ls = [...lampsEl.querySelectorAll('.kc-lamp')].sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left));
			ls.forEach((l, j) => {
				for (const e of l.querySelectorAll('.fl,.gl'))
					e.animate?.([{ opacity: 0 }, { opacity: 0, offset: 0.3 }, { opacity: 1, offset: 0.45 }, { opacity: 0.2, offset: 0.62 }, { opacity: 1 }], { duration: 480, delay: 180 + j * 95, fill: 'backwards' });
			});
		};
		const stopOpen = onOpen(el, () => {
			t0 = clock.now();
			sfx(app, 'whoosh');
			enter();
		});
		const close = onClose(el, () => {
			alive = false;
			stopOpen();
			ro?.disconnect();
			clearInterval(tick);
			for (const t of timers) clearTimeout(t);
		});

		// ------------------------------------------------------------ cevap: KAÇIŞ PLANI
		let drawRoute = () => {};
		const buildMap = (results) => {
			const runs = results.map((r) => ({ r, pl: P.find((x) => x.i === r.i), k: kacisOf(v, r.value), none: !r.value || !Array.isArray(r.value.picks) }));
			const av = (x, badge, kk) => `<span class="km-av${x.pl?.human ? ' me' : ''}" style="--c:${esc(x.r.color)};--k:${kk}">${x.pl?.av || ''}<u class="${badge}">${badge === 'ok' ? ICO.ok : badge === 't' ? ICO.kum : ICO.no}</u></span>`;
			let kk = 0;
			const escd = runs.filter((x) => !x.none && x.k.stop === 'cikis');
			const rows = [];
			for (let k = N - 1; k >= 0; k--) {
				const r = v.rooms[k];
				const trapped = (j) => runs.filter((x) => !x.none && x.k.stop === 'tuzak' && x.k.n === k && x.k.door === j);
				const timed = runs.filter((x) => (x.none && k === 0) || (!x.none && x.k.stop === 'sure' && x.k.n === k));
				const doors = r.opts
					.map((o, j) => {
						const ok = key && key[k] === j;
						const tr = trapped(j).length > 0;
						return `<div class="km-d${ok ? ' ok' : tr ? ' tr' : ''}"><span>${heceli(o)}</span></div>`;
					})
					.join('');
				const lanes = r.opts.map((_, j) => `<div class="km-ln">${trapped(j).map((x) => av(x, 'no', kk++)).join('')}</div>`).join('');
				rows.push(
					`<div class="km-r" style="--k:${N - k}"><div class="km-lb"><b>${k + 1}</b><small>${esc(r.ad)}</small>${timed.length ? `<span class="avs">${timed.map((x) => av(x, 't', kk++)).join('')}</span>` : ''}</div>${doors}${lanes}</div>`,
				);
			}
			mapEl.innerHTML = `<div class="km-hd"><b>KAÇIŞ PLANI</b><small>${esc(T.ad)}</small></div><div class="km-body"><svg class="km-route" aria-hidden="true"><path d=""/></svg>
				<div class="km-ex" style="--k:${N + 1}"><i class="sun"></i><span><b>ÇIKIŞ</b><small>${esc(v.cikis)}</small></span><span class="avs">${escd.map((x) => av(x, 'ok', kk++)).join('')}</span></div>
				${rows.join('')}<div class="km-in">GİRİŞ</div></div>`;
			// boyutlar: portre ve kapı yüksekliği haritanın boyuna göre (dört oyuncu bir kapıda yan yana sığar)
			const H = mapEl.clientHeight || G?.H || 300;
			const Wm = mapEl.clientWidth || G?.W || 300;
			const lbw = clamp(Math.round(Wm * 0.15), 40, 64);
			const colW = (Wm - 20 - lbw - 15) / 3;
			const n4 = Math.max(1, ...runs.map(() => 1), ...[...mapEl.querySelectorAll('.km-ln')].map((l) => l.children.length));
			const avs = clamp(Math.floor(Math.min((colW - 3 * (n4 - 1)) / n4, (H - 70) / 13)), 15, 26);
			mapEl.style.setProperty('--av', avs + 'px');
			mapEl.style.setProperty('--lbw', lbw + 'px');
			mapEl.style.setProperty('--dh', clamp(Math.round((H - 60 - 3 * (avs + 6) - avs - 16) / 3), 26, 64) + 'px');
			// sığmazsa (dört oyuncu, kısa ekran) kapı ve portre küçülür; en sonunda plan bütünüyle küçülür (kesilen yazı yok)
			let dh = parseFloat(mapEl.style.getPropertyValue('--dh'));
			let av2 = avs;
			for (let k = 0; k < 12 && mapEl.scrollHeight > mapEl.clientHeight + 1; k++) {
				dh = Math.max(22, dh - 4);
				av2 = Math.max(14, av2 - 1);
				mapEl.style.setProperty('--dh', dh + 'px');
				mapEl.style.setProperty('--av', av2 + 'px');
			}
			const bodyM = mapEl.querySelector('.km-body');
			if (mapEl.scrollHeight > mapEl.clientHeight + 1 && bodyM) bodyM.style.zoom = String(Math.max(0.6, (mapEl.clientHeight - 30) / (bodyM.scrollHeight + 2)).toFixed(3));
			for (const d of mapEl.querySelectorAll('.km-d')) fitBox(d.querySelector('span'), d, clamp(colW * 0.16, 10.5, 15), 8);
			for (const s of mapEl.querySelectorAll('.km-lb small')) fitBox(s, s.parentElement, 9, 6.5);
			const exS = mapEl.querySelector('.km-ex small');
			if (exS) fitBox(exS, exS.parentElement, 9.5, 7);
			drawRoute = () => {
				const body = mapEl.querySelector('.km-body');
				const path = mapEl.querySelector('.km-route path');
				if (!body || !path || !key) return;
				const ok = [...mapEl.querySelectorAll('.km-d.ok')];
				const ex = mapEl.querySelector('.km-ex');
				const inn = mapEl.querySelector('.km-in');
				const pt = (e, fy) => ({ x: e.offsetLeft + e.offsetWidth / 2, y: e.offsetTop + e.offsetHeight * fy });
				// rows yukarıdan aşağı (3, 2, 1): yol girişten yukarı, her doğru kapının ortasından geçer
				const pts = [pt(inn, 0.5), ...ok.slice().reverse().flatMap((d) => {
					const r = d.parentElement;
					const p = { x: r.offsetLeft + d.offsetLeft + d.offsetWidth / 2, y: r.offsetTop + d.offsetTop };
					return [{ x: p.x, y: p.y + d.offsetHeight + 2 }, { x: p.x, y: p.y - 2 }];
				}), { x: ex.offsetLeft + ex.offsetWidth / 2, y: ex.offsetTop + ex.offsetHeight }];
				path.setAttribute('d', pts.map((p, j) => `${j ? 'L' : 'M'}${f1(p.x)} ${f1(p.y)}`).join(' '));
			};
			drawRoute();
		};

		return {
			lock() {
				over = true;
				for (const d of doorsEl.children) d.disabled = true;
			},
			value: () => ({ picks: picks.slice(), at: at.slice() }),
			joker(e) {
				if (revealed || over) return;
				if (Array.isArray(e?.hide)) {
					hide = e.hide;
					applyJokers();
					app?.ui?.toast?.('Her odada bir tuzak kapı tahtayla kapandı', { tone: 'good', ms: 1800 });
				} else if (Array.isArray(e?.pct)) {
					pct = e.pct;
					for (const s of doorsEl.querySelectorAll('.dr-pc')) s.remove();
					applyJokers();
					app?.ui?.toast?.('Seyirci her odada kapıları gösteriyor', { tone: 'good', ms: 1800 });
				}
			},
			reveal(results) {
				revealed = true;
				over = true;
				if (Array.isArray(v.key)) key = v.key; // çevrimiçinde cevapla gelen tam görünüm
				root.classList.add('rv');
				root.classList.remove('alarm', 'busy');
				for (const e of fx.querySelectorAll('.kc-in')) e.remove();
				buildMap(results);
				later(drawRoute, 60);
				// damga sorunun yerinde (arayüz: tam ekran kartta başlıkla sahne arası)
				const meR = results.find((r) => r.p?.human);
				if (!meR || !app) return;
				const order = results.slice().sort((a, b) => a.err - b.err || a.time - b.time);
				const win = order[0];
				const mk = kacisOf(v, meR.value);
				const wk = kacisOf(v, win.value);
				if (mk.stop === 'cikis') stampLater(app, 'KAÇTIN!', 'gold', win === meR ? `${N} oda · ${(meR.time ?? 0).toFixed(1).replace('.', ',')} sn` : `${win.name} daha önce kaçtı`);
				else if (win === meR) stampLater(app, 'EN UZAĞA SEN!', 'gold', `${mk.n} oda geçtin · kimse kaçamadı`);
				else {
					const bySub = wk.stop === 'cikis' ? `${win.name} kaçtı` : `${win.name} ${wk.n} oda geçti`;
					stampLater(app, mk.stop === 'tuzak' ? 'TUZAĞA DÜŞTÜN' : 'SÜRE DOLDU', 'bad', `${mk.n + 1}. odada kaldın · ${bySub}`);
				}
			},
			destroy: close,
		};
	},
};
