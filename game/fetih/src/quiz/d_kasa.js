// KASA SOYGUNU (yeni · grup 1): cevap bir sayı (yıl, adet, yükseklik). Ekranı ağır, perçinli çelik bir kasa kapısı
// kaplar; kapının pirinç şifre panosunda cevabın basamak sayısı kadar (2–4) dönen tambur. Oyuncu her tamburu parmakla
// yukarı-aşağı çevirir, oklara ya da penceredeki komşu rakama dokunur (her adımda mekanik tık, fırlatınca savrulup
// yerine oturur), sonra kasanın kolunu çevirir: AÇ.
//
// İmza an: tamburlar soldan sağa yoklanır. Doğru rakam "tak" diye oturur ve yeşil yanar; ilk yanlış rakam kırmızı
// çakar ve kilidi TIKAR (sağındakiler yoklanmaz, söner). Hepsi doğruysa sürgüler çekilir, kapı menteşesinde 3B açılır,
// içeriden altın ışık ve altın taşar; değilse kırmızı alarm döner, kapı sarsılır. Cevapta herkesin şifresi avatarlı
// küçük fişlerde (rakam rakam yeşil / kırmızı / sönük), doğru şifre pirinç levhada.
//
// Kural "Kilit soldan açılır": puan soldan art arda doğru tambur sayısıdır. Yıl ve büyüklükte bilgi soldan gelir
// (yüzyıl → onyıl → yıl): "19xx" diyen iki tambur açar, 1023 gibi savrulan tahmin bir. Eşit tamburda sayıca yakın olan,
// o da eşitse hızlı olan önde. Bu yüzden örnek cevaplar basamak sınırına (1999 / 2000 gibi) yaslanmaz.
// Gerilim: STETOSKOP (soru başına bir kez). Bir tamburu dinlersin: o anki rakam "büyük / küçük / tam" çıkar, elenen
// rakamlar tamburda söner. Bedeli yarım tambur: eşit tamburda dinlemeyen önde, ama dinleyip bir tambur fazla açan yine
// önde. Tür 'closest': err = (n − açılan) + 0,5 · dinleme + 0,49 · |şifre − cevap| / 10^n; doğru = bütün tamburlar.
//
// Veri: { q, ans (10..9999 tam sayı; basamak sayısı = tambur), unit?, not? (cevapta fişlerin altında NOT satırı) }.
// Değer: { c: '1923' (n hane), h: [dinlenen tambur] }.
// Film: kol çekilince yoklama hemen başlar (tambur başına 0,36 sn), fişler kapı/alarmdan sonra gelir. Cevap kol çekilmeden
// gelirse (süre bitti) film kısa sürer (~1,4 sn): son görünüm denetimin ölçtüğü anda ekranda olsun.
// Çevrimiçi: cevap v.hedef'te, publicView siler; yoklama ve kapı filmi cevap ekranında oynar. Stetoskop sunucuya
// sorulmalı (act 'dinle' { k, d } → { k, yön }); o kanca kurulana dek cevabı bilmeyen istemcide düğme kapalıdır.
// Jokerler: yarı yarıya → bir tamburun rakamı açılır (altın, kilitli); seyirci → kalabalığın şifresi tamburlarda işaretli.

import { css, esc, pCorrect, gauss, buzz, clamp } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, rule, stampLater, sfx, onClose, onOpen, LOOK, ACT } from './d_ortak.js';
import { clock, setTimeout, clearTimeout } from '../core/clock.js';

const STEP = 0.45; // timing.js ACT.step (orada dışa açık değil): bir adımlık dokunuş
const ARC = (Math.PI * 2) / 10; // tamburda iki rakam arası açı
const ABL = ['’dan', '’den', '’den', '’ten', '’ten', '’ten', '’dan', '’den', '’den', '’dan']; // 4’ten, 6’dan …
const rmq = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let UID = 0;

// ---------------------------------------------------------------- yargı (sunucu da aynı hesabı yapar)

const hedefStr = (v) => String(v.hedef).padStart(v.n, '0');
/** Şifre yoklaması: { lead (soldan doğru), hint (dinleme), dist (sayıca uzaklık), open } ya da geçersizse null. */
export function yokla(v, value) {
	const n = v?.n;
	if (v?.hedef == null || !value || typeof value.c !== 'string' || value.c.length !== n || !/^\d+$/.test(value.c)) return null;
	const a = hedefStr(v);
	let lead = 0;
	while (lead < n && value.c[lead] === a[lead]) lead++;
	const hint = Array.isArray(value.h) && value.h.length ? 1 : 0;
	return { lead, hint, dist: Math.abs(Number(value.c) - v.hedef), open: lead === n, a };
}

// ---------------------------------------------------------------- çizim parçaları

const svgUp = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15.5 12 8.5l7 7"/></svg>';
const svgDn = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5 12 15.5l7-7"/></svg>';
const svgSteth =
	'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 3.2v4.6a4.2 4.2 0 0 0 8.4 0V3.2M9.7 12v2.6a4.9 4.9 0 0 0 9.8 0v-2.2" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><circle cx="19.5" cy="10.2" r="2.3" fill="none" stroke="currentColor" stroke-width="2.1"/><circle cx="5.5" cy="3" r="1.2" fill="currentColor"/><circle cx="13.9" cy="3" r="1.2" fill="currentColor"/></svg>';
const svgCheck = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5 10-11" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Kasanın kolu: dört kollu çelik çark, pirinç göbek. */
function wheelSVG(id) {
	const spokes = [45, 135, 225, 315]
		.map((a) => `<g transform="rotate(${a})"><rect x="12" y="-4.2" width="31" height="8.4" rx="3" fill="url(#ksS${id})" stroke="#1c232e" stroke-width="1.2"/><circle cx="44" cy="0" r="7" fill="url(#ksK${id})" stroke="#1c232e" stroke-width="1.2"/><circle cx="42.6" cy="-2" r="2.2" fill="#fff" opacity=".55"/></g>`)
		.join('');
	return `<svg class="ks-cark" viewBox="-54 -54 108 108" aria-hidden="true"><defs>
		<linearGradient id="ksS${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef2f7"/><stop offset=".45" stop-color="#a7b0bf"/><stop offset="1" stop-color="#4c5566"/></linearGradient>
		<radialGradient id="ksK${id}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#c3cbd8"/><stop offset="1" stop-color="#3c4454"/></radialGradient>
		<radialGradient id="ksH${id}" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#fff4c8"/><stop offset=".38" stop-color="#f0c45a"/><stop offset=".8" stop-color="#9a6a16"/><stop offset="1" stop-color="#5a3a08"/></radialGradient></defs>
		<circle r="50" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="3" opacity=".5"/>
		<g class="ks-kol">${spokes}<circle r="19" fill="url(#ksH${id})" stroke="#4a2e06" stroke-width="1.6"/><circle r="14.5" fill="none" stroke="rgba(90,58,8,.55)" stroke-width="1.2"/></g>
	</svg>`;
}

/** Kasanın içi: raflarda altın külçeler ve sikkeler. */
function insideSVG() {
	const bar = (x, y, w = 34, h = 13) =>
		`<g transform="translate(${x},${y})"><path d="M${4},0 H${w - 4} L${w},${h} H0Z" fill="url(#ksG)" stroke="#6a4206" stroke-width=".9"/><path d="M${4},0 H${w - 4} L${w - 6},${h * 0.35} H6Z" fill="#fff6c8" opacity=".55"/></g>`;
	const rows = [];
	for (let i = 0; i < 5; i++) rows.push(bar(18 + i * 36, 150));
	for (let i = 0; i < 4; i++) rows.push(bar(36 + i * 36, 137));
	for (let i = 0; i < 3; i++) rows.push(bar(54 + i * 36, 124));
	for (let i = 0; i < 2; i++) rows.push(bar(72 + i * 36, 111));
	const coins = [[30, 166], [52, 170], [150, 168], [176, 165], [196, 170], [110, 171]]
		.map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="${7 + (i % 2)}" ry="3.2" fill="url(#ksG)" stroke="#6a4206" stroke-width=".8"/>`)
		.join('');
	return `<svg class="ks-hazine" viewBox="0 0 220 180" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><defs>
		<linearGradient id="ksG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b0"/><stop offset=".45" stop-color="#f2c044"/><stop offset="1" stop-color="#a8700e"/></linearGradient></defs>
		<path d="M0 176 H220" stroke="#3a2608" stroke-width="5"/>${rows.join('')}${coins}</svg>`;
}

const CSS = /* css */ `
.yn-kasa{position:relative;flex:1 1 auto;display:flex;flex-direction:column;gap:8px;min-height:0;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.yn-kasa .ks-sahne{position:relative;flex:1 1 auto;min-height:204px;overflow:hidden;border-radius:18px;
  background:radial-gradient(130% 80% at 50% -10%,#2a3557 0%,#121a36 46%,#070a18 100%);box-shadow:0 0 0 1.5px rgba(255,255,255,.12),0 14px 30px rgba(0,0,0,.55)}
/* cevapta sahne küçülebilir: 320'lik ekranda 4 koltuk (2×2 fiş) + NOT, arayüzün ölçeğine gerek kalmadan sığar */
.yn-kasa.fis .ks-sahne{min-height:100px}
/* çerçeve (kasanın gövdesi): koyu çelik, eğik kenar, perçinler */
.yn-kasa .ks-kasa{position:absolute;inset:var(--m);border-radius:14px;perspective:var(--persp,1200px);
  background:linear-gradient(160deg,#3a4558 0%,#1f2735 55%,#141a25 100%);
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.14),inset 0 2px 0 rgba(255,255,255,.12),0 10px 24px rgba(0,0,0,.6)}
.yn-kasa .ks-pc{position:absolute;pointer-events:none;background:radial-gradient(circle at 40% 35%,#c7d0de 0 1.4px,#5a6578 1.9px,#1a2130 2.8px,transparent 3.3px) 0 0/var(--rp) var(--rp)}
.yn-kasa .ks-pc.t,.yn-kasa .ks-pc.b{left:calc(var(--f) * .5);right:calc(var(--f) * .5);height:8px}
.yn-kasa .ks-pc.t{top:calc(var(--f) * .5 - 4px)}.yn-kasa .ks-pc.b{bottom:calc(var(--f) * .5 - 4px)}
.yn-kasa .ks-pc.l,.yn-kasa .ks-pc.r{top:calc(var(--f) * .5 + 6px);bottom:calc(var(--f) * .5 + 6px);width:8px}
.yn-kasa .ks-pc.l{left:calc(var(--f) * .5 - 4px)}.yn-kasa .ks-pc.r{right:calc(var(--f) * .5 - 4px)}
.yn-kasa .ks-fener{position:absolute;left:50%;top:calc(var(--f) * .5 - 5px);width:22px;height:10px;margin-left:-11px;border-radius:11px 11px 3px 3px;z-index:3;
  background:radial-gradient(circle at 50% 80%,#ff8a7a,#8a1a12 70%);box-shadow:0 0 0 1.5px #1a2130;opacity:.55}
/* içerisi: kapının arkası, altın */
.yn-kasa .ks-ic{position:absolute;inset:var(--f);border-radius:9px;overflow:hidden;
  background:radial-gradient(80% 70% at 50% 60%,#5a3a0c 0%,#24170a 60%,#0d0804 100%);box-shadow:inset 0 0 26px rgba(0,0,0,.85)}
.yn-kasa .ks-hazine{position:absolute;left:8%;right:8%;bottom:4%;height:62%;width:84%}
.yn-kasa .ks-isin{position:absolute;inset:-40%;opacity:0;transition:opacity 1s .3s;will-change:transform;
  background:repeating-conic-gradient(from 0deg at 50% 50%,rgba(255,226,140,.34) 0 7deg,rgba(255,226,140,0) 7deg 20deg);animation:ksDon 18s linear infinite paused}
.yn-kasa.nur .ks-isin{animation-play-state:running}
.yn-kasa .ks-nur{position:absolute;inset:0;opacity:0;transition:opacity .9s .2s;
  background:radial-gradient(60% 55% at 50% 62%,rgba(255,244,200,.95) 0%,rgba(255,200,80,.55) 38%,rgba(255,170,40,0) 75%)}
.yn-kasa.nur .ks-isin{opacity:1}.yn-kasa.nur .ks-nur{opacity:1}
.yn-kasa.nur .ks-kasa{box-shadow:inset 0 0 0 1.5px rgba(255,230,160,.5),inset 0 2px 0 rgba(255,255,255,.12),0 0 34px 6px rgba(255,196,70,.45),0 10px 24px rgba(0,0,0,.6);transition:box-shadow .9s .2s}
.yn-kasa.nur .ks-sahne{background:radial-gradient(90% 70% at 50% 55%,#5a4418 0%,#1d1a2c 55%,#070a18 100%);transition:background .9s}
/* kapı: çelik plaka, iç bordür, tam yüz; menteşesinde döner */
.yn-kasa .ks-kapi{position:absolute;inset:var(--f);border-radius:9px;transform-origin:0 50%;transform-style:preserve-3d;
  transition:transform 1.25s cubic-bezier(.55,.02,.22,1)}
/* kapının yüzü: tornada işlenmiş çelik (iç içe parlak halkalar, kasa kapılarının "perlage" işçiliği), eğik kenar */
.yn-kasa .ks-yuz{position:absolute;inset:0;border-radius:9px;backface-visibility:hidden;
  background:repeating-radial-gradient(circle at var(--wx,50%) var(--wy,68%),rgba(255,255,255,.05) 0 1px,rgba(0,0,0,.05) 1px 2.5px),
    conic-gradient(from 20deg at var(--wx,50%) var(--wy,68%),rgba(255,255,255,.16),rgba(255,255,255,0) 16%,rgba(255,255,255,.12) 50%,rgba(255,255,255,0) 66%,rgba(255,255,255,.16)),
    radial-gradient(110% 80% at 28% 10%,rgba(255,255,255,.16),rgba(255,255,255,0) 58%),
    linear-gradient(170deg,#6b7b94 0%,#4a586f 40%,#323d4f 78%,#283141 100%);
  box-shadow:inset 0 2px 0 rgba(255,255,255,.3),inset 2px 0 0 rgba(255,255,255,.12),inset 0 -3px 0 rgba(0,0,0,.35),inset -2px 0 0 rgba(0,0,0,.25),0 8px 18px rgba(0,0,0,.65)}
/* iç bordür: perçinli çerçeve şeridi */
.yn-kasa .ks-yuz::before{content:'';position:absolute;inset:calc(var(--p) * .42);border-radius:7px;pointer-events:none;
  border:2px solid rgba(0,0,0,.28);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12),0 0 0 1px rgba(255,255,255,.08)}
.yn-kasa .ks-yuz::after{content:'';position:absolute;inset:calc(var(--p) * .42 - 4px);pointer-events:none;
  background:radial-gradient(circle at 40% 35%,#d4dbe6 0 1.2px,#59647a 1.7px,#1a2130 2.5px,transparent 3px) 0 0/var(--rp) var(--rp);
  -webkit-mask:linear-gradient(#000 0 0) top/100% 8px no-repeat,linear-gradient(#000 0 0) bottom/100% 8px no-repeat,linear-gradient(#000 0 0) left/8px 100% no-repeat,linear-gradient(#000 0 0) right/8px 100% no-repeat;
  mask:linear-gradient(#000 0 0) top/100% 8px no-repeat,linear-gradient(#000 0 0) bottom/100% 8px no-repeat,linear-gradient(#000 0 0) left/8px 100% no-repeat,linear-gradient(#000 0 0) right/8px 100% no-repeat}
/* çeliğin üstünden ağır ağır geçen ışık (sonsuz; yazıların altında) */
.yn-kasa .ks-parla{position:absolute;inset:0;border-radius:9px;overflow:hidden;pointer-events:none;backface-visibility:hidden}
.yn-kasa .ks-parla::before{content:'';position:absolute;top:-20%;bottom:-20%;left:0;width:38%;transform:translateX(-160%) skewX(-18deg);will-change:transform;
  background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.09) 45%,rgba(255,255,255,.16) 50%,rgba(255,255,255,.09) 55%,rgba(255,255,255,0));animation:ksParla 6.5s 1.2s ease-in-out infinite}
.yn-kasa.acik .ks-parla,.yn-kasa.alarm .ks-parla{display:none}
@keyframes ksParla{0%{transform:translateX(-160%) skewX(-18deg)}38%,100%{transform:translateX(340%) skewX(-18deg)}}
.yn-kasa .ks-kal{position:absolute;top:0;bottom:0;left:100%;width:20px;transform-origin:0 50%;transform:rotateY(90deg);border-radius:0 6px 6px 0;
  background:linear-gradient(90deg,#2b3442,#5d6a80 45%,#2b3442)}
.yn-kasa .ks-arka{position:absolute;inset:0;border-radius:9px;transform:rotateY(180deg);backface-visibility:hidden;
  background:repeating-linear-gradient(0deg,#3a4558 0 14px,#2a3342 14px 16px),#303a4a;box-shadow:inset 0 0 0 3px #1b222d}
/* sürgüler: kapının sağ kenarından çerçeveye girer; açılırken kapıya çekilir */
.yn-kasa .ks-sg{position:absolute;right:calc(var(--f) * -1 + 2px);width:calc(var(--f) + 8px);height:14px;margin-top:-7px;border-radius:4px;
  background:linear-gradient(180deg,#fff1b8,#e2ad44 45%,#8a5a14);box-shadow:0 0 0 1px #3a2404,inset 0 1px 0 rgba(255,255,255,.6);transition:transform .35s cubic-bezier(.5,0,.3,1)}
.yn-kasa.surgu .ks-sg{transform:translateX(calc(var(--f) * -1 - 4px))}
.yn-kasa .ks-mn{position:absolute;left:calc(var(--f) * .5 - 6px);width:12px;height:14%;z-index:3;border-radius:6px;
  background:linear-gradient(90deg,#2b3442,#a7b0bf 45%,#3a4454);box-shadow:0 0 0 1px #10151e,0 3px 6px rgba(0,0,0,.5)}
/* içerik ızgarası: üstte (ya da solda) şifre panosu, altta (sağda) kol ve stetoskop */
.yn-kasa .ks-ici{position:absolute;inset:var(--p);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--gy);backface-visibility:hidden}
.yn-kasa.genis .ks-ici{flex-direction:row;gap:var(--gx)}
.yn-kasa .ks-pano{position:relative;display:flex;gap:var(--g);padding:var(--pp);border-radius:12px;
  background:linear-gradient(180deg,#ffe9a8 0%,#e3b04c 36%,#b9822a 70%,#7a5212 100%);
  box-shadow:inset 0 0 0 1.5px #5a3a08,inset 0 2px 0 rgba(255,250,220,.8),inset 0 -2px 0 rgba(60,36,0,.5),0 6px 14px rgba(0,0,0,.55)}
.yn-kasa .ks-pano::before,.yn-kasa .ks-pano::after{content:'';position:absolute;top:5px;width:6px;height:6px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff6d0,#7a5212 70%)}
.yn-kasa .ks-pano::before{left:5px}.yn-kasa .ks-pano::after{right:5px}
.yn-kasa .ks-tb{position:relative;display:flex;flex-direction:column;align-items:stretch;gap:4px;width:var(--dw)}
.yn-kasa .ks-ok{display:grid;place-items:center;height:var(--ah);padding:0;border:0;border-radius:8px;cursor:pointer;color:#3a2404;touch-action:manipulation;
  background:linear-gradient(180deg,#fff5d2,#e9c46a 60%,#c9952e);box-shadow:inset 0 0 0 1.5px #7a5212,inset 0 1.5px 0 #fffbe8,0 3px 0 #6a440c;transition:transform .06s,filter .15s}
.yn-kasa .ks-ok svg{width:58%;max-width:26px;height:auto;fill:none;stroke:currentColor;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round}
.yn-kasa .ks-ok:active{transform:translateY(2px);box-shadow:inset 0 0 0 1.5px #7a5212,0 1px 0 #6a440c;filter:brightness(.95)}
.yn-kasa .ks-pen{position:relative;height:var(--dh);border-radius:8px;overflow:hidden;cursor:ns-resize;touch-action:none;outline:none;
  background:#1a140a;box-shadow:inset 0 0 0 2px #4a2e06,0 0 0 2px #2a1a04,inset 0 0 12px rgba(0,0,0,.6);transition:box-shadow .25s}
.yn-kasa .ks-pen:focus-visible{box-shadow:inset 0 0 0 2px #4a2e06,0 0 0 2px #2a1a04,0 0 0 4px #6ac8ff}
.yn-kasa .ks-pen canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.yn-kasa .ks-pen::after{content:'';position:absolute;inset:0;pointer-events:none;border-radius:8px;opacity:0;transition:opacity .25s}
.yn-kasa .ks-tb.ok .ks-pen{box-shadow:inset 0 0 0 2px #0e5a28,0 0 0 2.5px #3ee07a,0 0 18px 2px rgba(62,224,122,.75);animation:ksTak .3s ease-out}
.yn-kasa .ks-tb.no .ks-pen{box-shadow:inset 0 0 0 2px #6a0a08,0 0 0 2.5px #ff4a3a,0 0 18px 2px rgba(255,70,50,.8);animation:ksSars .42s}
.yn-kasa .ks-tb.no .ks-pen::after{background:rgba(255,40,20,.35);animation:ksCak .5s ease-out forwards}
.yn-kasa .ks-tb.jam .ks-pen{box-shadow:inset 0 0 0 2px #1a1206,0 0 0 2px #2a2418}
.yn-kasa .ks-tb.jam .ks-ok,.yn-kasa.kontrol .ks-ok,.yn-kasa.rv .ks-ok{opacity:.35;pointer-events:none}
.yn-kasa.fis .ks-ok,.yn-kasa.fis .ks-alt{display:none}
.yn-kasa[data-yer=alt] .ks-ici,.yn-kasa[data-yer=yan] .ks-ici{justify-content:flex-start}
.yn-kasa .ks-tb.altin .ks-pen{box-shadow:inset 0 0 0 2px #7a4e06,0 0 0 2.5px #ffd25a,0 0 14px 1px rgba(255,210,90,.6)}
.yn-kasa .ks-tb.altin .ks-ok{opacity:.35;pointer-events:none}
/* dinleme: stetoskobun göğüs ucu tamburun üstünde, ses halkaları */
.yn-kasa.dinle .ks-tb:not(.altin) .ks-pen{animation:ksDinle 1s ease-in-out infinite;cursor:pointer}
.yn-kasa .ks-kul{position:absolute;left:50%;top:50%;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;pointer-events:none;opacity:0;z-index:2;
  background:radial-gradient(circle at 38% 32%,#ffffff,#b8c2d2 45%,#4c5566 80%);box-shadow:0 0 0 2px #1c232e,0 4px 10px rgba(0,0,0,.5)}
.yn-kasa .ks-tb.dinliyor .ks-kul{animation:ksKul 1.2s ease-out forwards}
.yn-kasa .ks-tb.dinliyor .ks-kul::before,.yn-kasa .ks-tb.dinliyor .ks-kul::after{content:'';position:absolute;inset:-4px;border-radius:50%;border:2px solid #6ac8ff;animation:ksDalga .5s .15s ease-out 2 both}
.yn-kasa .ks-tb.dinliyor .ks-kul::after{animation-delay:.42s}
/* alt sıra: kol (AÇ) ve stetoskop */
/* dikeyde kol kapının ekseninde, stetoskop sağında; yan yanada alt alta */
.yn-kasa .ks-alt{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;column-gap:calc(var(--gx) + var(--wd) * .13);width:100%}
.yn-kasa .ks-alt .ks-ty{grid-column:2}
.yn-kasa .ks-alt .ks-st{grid-column:3;justify-self:start}
.yn-kasa.genis .ks-alt{display:flex;flex-direction:column;align-items:center;width:auto;gap:calc(6px + var(--wd) * .13)}
.yn-kasa .ks-ty{position:relative;flex:none;width:var(--wd);height:var(--wd)}
/* kolun ardındaki kilit aynası: oyulmuş iç içe halkalar */
.yn-kasa .ks-halka{position:absolute;inset:-13%;border-radius:50%;pointer-events:none;
  background:repeating-radial-gradient(circle,rgba(255,255,255,0) 0 5px,rgba(255,255,255,.08) 5px 6px,rgba(0,0,0,.18) 6px 7px),radial-gradient(circle,#4f5d74 0,#3a465a 62%,#263040 100%);
  box-shadow:inset 0 2px 0 rgba(255,255,255,.22),inset 0 -2px 4px rgba(0,0,0,.45),0 0 0 2px rgba(0,0,0,.3),0 0 0 4px rgba(255,255,255,.06),0 6px 14px rgba(0,0,0,.4)}
.yn-kasa .ks-halka::before{content:'';position:absolute;inset:3px;border-radius:50%;
  background:repeating-conic-gradient(from -1deg,rgba(255,236,190,.8) 0 2deg,rgba(255,236,190,0) 2deg 12deg);
  -webkit-mask:radial-gradient(circle,transparent calc(50% - 6px),#000 calc(50% - 5.5px) 50%,transparent calc(50% + .5px));mask:radial-gradient(circle,transparent calc(50% - 6px),#000 calc(50% - 5.5px) 50%,transparent calc(50% + .5px))}
.yn-kasa .ks-teker{position:relative;width:100%;height:100%;padding:0;border:0;border-radius:50%;cursor:pointer;touch-action:none;
  background:radial-gradient(circle,rgba(0,0,0,0) 54%,rgba(0,0,0,.35) 56%,rgba(255,255,255,.07) 64%,rgba(0,0,0,0) 66%),radial-gradient(circle,#3d495c 0,#2a3342 70%,#222a37 100%);
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.1),inset 0 -3px 8px rgba(0,0,0,.4),0 4px 12px rgba(0,0,0,.5)}
.yn-kasa .ks-teker svg{position:absolute;inset:-6%;width:112%;height:112%}
.yn-kasa .ks-teker .ks-kol{transition:transform .5s cubic-bezier(.3,1.4,.5,1)}
.yn-kasa .ks-teker b{position:relative;z-index:1;display:block;font:400 calc(var(--wd) * .2)/1 'Lilita One',sans-serif;letter-spacing:.04em;color:#3a2404;text-shadow:0 1px 0 rgba(255,245,200,.7)}
.yn-kasa .ks-teker:active{filter:brightness(1.08)}
.yn-kasa .ks-teker::after{content:'';position:absolute;inset:-3px;border-radius:50%;pointer-events:none;opacity:0;box-shadow:0 0 0 2px rgba(255,210,90,.55),0 0 18px rgba(255,210,90,.5)}
.yn-kasa .ks-teker.hazir::after{animation:ksHazir 1.6s ease-in-out infinite}
.yn-kasa .ks-st{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-width:66px;height:var(--sh);padding:4px 10px;border:0;border-radius:12px;cursor:pointer;touch-action:manipulation;
  color:#dff2ff;background:linear-gradient(180deg,#2c5a86,#1a3a5e 60%,#132a46);box-shadow:inset 0 0 0 1.5px #6ac8ff,inset 0 2px 0 rgba(255,255,255,.18),0 3px 0 #0a1830}
.yn-kasa .ks-st svg{width:22px;height:22px}
.yn-kasa .ks-st b{font:italic 900 13px/1 'Barlow Condensed',sans-serif;letter-spacing:.14em}
.yn-kasa .ks-st small{font:italic 800 10px/1 'Barlow Condensed',sans-serif;letter-spacing:.08em;color:#9fd8ff;white-space:nowrap}
.yn-kasa.dinle .ks-st{background:linear-gradient(180deg,#6ac8ff,#2c8ad8);color:#071a30;box-shadow:inset 0 0 0 1.5px #dff2ff,0 0 16px rgba(106,200,255,.7)}
.yn-kasa.dinle .ks-st small{color:#071a30}
.yn-kasa .ks-st:disabled{opacity:.42;cursor:default;filter:saturate(.4)}
.yn-kasa.cekildi .ks-teker .ks-kol{transform:rotate(90deg)}
.yn-kasa.cekildi .ks-teker::after{animation:none;opacity:0}
.yn-kasa.cekildi .ks-st,.yn-kasa.rv .ks-st{opacity:.38;pointer-events:none}
.yn-kasa.rv .ks-alt{opacity:0;visibility:hidden;transition:opacity .3s,visibility 0s .3s}
/* alarm: tepedeki fenerden dönen kırmızı ışık ve kırmızı nabız (sonlu: söner) */
.yn-kasa .ks-alarm{position:absolute;inset:0;z-index:5;pointer-events:none;opacity:0;overflow:hidden;border-radius:18px}
.yn-kasa .ks-alarm i{position:absolute;left:50%;top:0;width:260%;height:260%;margin:-130% 0 0 -130%;
  background:conic-gradient(from 0deg,rgba(255,40,30,.55) 0 22deg,rgba(255,40,30,0) 40deg 180deg,rgba(255,40,30,.55) 180deg 202deg,rgba(255,40,30,0) 220deg 360deg)}
.yn-kasa .ks-alarm::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 50px 12px rgba(255,30,20,.75)}
.yn-kasa.alarm .ks-alarm{animation:ksAlarm 2.6s ease-in-out forwards}
.yn-kasa.alarm .ks-alarm i{animation:ksDon .8s linear 3}
.yn-kasa.alarm .ks-fener{opacity:1;animation:ksFener .4s steps(2) 6}
.yn-kasa.alarm .ks-kapi{animation:ksSars .55s .05s}
/* kapı açılır: sürgüler, menteşe, ışık */
.yn-kasa.acik .ks-kapi{transform:rotateY(-80deg)}
.yn-kasa .ks-perde{position:absolute;inset:0;z-index:5;pointer-events:none;opacity:0;transition:opacity .4s;background:radial-gradient(70% 60% at 50% 50%,rgba(4,6,14,.72),rgba(4,6,14,.4))}
.yn-kasa.levha[data-yer=orta]:not(.acik) .ks-perde{opacity:1}
.yn-kasa .ks-not{display:none;flex:none;align-items:flex-start;gap:8px;padding:7px 10px 8px;border-radius:8px;background:linear-gradient(180deg,#fbf3e0,#ece0c4);box-shadow:0 3px 0 rgba(0,0,0,.35);
  font:600 12.5px/1.3 'Fredoka',sans-serif;color:#2a1d0c;transform-origin:50% 100%;animation:ksFis .42s .3s cubic-bezier(.2,.9,.3,1.25) both}
.yn-kasa .ks-not b{flex:none;padding:3px 6px 2px;border-radius:4px;background:#2a8a4a;color:#fff;font:italic 900 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.12em;transform:skewX(-8deg)}
.yn-kasa.fis .ks-not{display:flex}
/* doğru şifre levhası ve fişler */
.yn-kasa .ks-yer{position:absolute;z-index:6;display:none;align-items:center;justify-content:center;pointer-events:none}
.yn-kasa.levha .ks-yer{display:flex}
.yn-kasa .ks-levha{display:flex;flex-direction:column;align-items:center;gap:3px;max-width:100%;padding:7px 16px 8px;border-radius:10px;animation:ksLevha .45s cubic-bezier(.3,1.6,.5,1) both;
  background:linear-gradient(180deg,#fff0b8 0%,#ebbb52 45%,#b37a20 100%);box-shadow:inset 0 0 0 2px #6a420a,inset 0 0 0 3.5px rgba(255,244,200,.75),0 10px 22px rgba(0,0,0,.6)}
.yn-kasa .ks-levha small{font:italic 900 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.24em;color:#5a3a08}
.yn-kasa .ks-levha b{font:400 var(--lf,32px)/1 'Lilita One',sans-serif;letter-spacing:.1em;color:#3a2404;text-shadow:0 1px 0 rgba(255,250,220,.6);white-space:nowrap}
.yn-kasa .ks-levha b u{text-decoration:none;font-size:.46em;letter-spacing:.02em;margin-left:5px}
.yn-kasa .ks-levha em{max-width:30ch;font:600 11.5px/1.25 'Fredoka',sans-serif;font-style:normal;text-align:center;color:#4a2e06}
.yn-kasa.acik .ks-levha{background:linear-gradient(180deg,#fff7d6 0%,#ffd25a 50%,#d99a24 100%)}
.yn-kasa .ks-bilet{display:none;flex:none;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;container-type:inline-size}
.yn-kasa.fis .ks-bilet{display:grid}
.yn-kasa .ks-b{position:relative;display:grid;grid-template-columns:22px 30px minmax(0,1fr) auto;grid-template-rows:auto auto;align-items:center;column-gap:6px;row-gap:3px;min-height:52px;padding:5px 8px 5px 0;
  border-radius:7px;color:#2a1d0c;background:linear-gradient(180deg,#fbf3e0,#e9ddc2);box-shadow:0 3px 0 rgba(0,0,0,.38),inset 0 0 0 1px rgba(90,60,10,.25);
  transform-origin:50% 100%;animation:ksFis .42s calc(var(--k) * 110ms) cubic-bezier(.2,.9,.3,1.25) both}
.yn-kasa .ks-b.win{background:linear-gradient(180deg,#fff6cf,#ffd769);box-shadow:0 3px 0 rgba(0,0,0,.38),inset 0 0 0 2px #c8901e,0 0 16px rgba(255,210,90,.45)}
.yn-kasa .ks-b .rk{grid-row:1/3;align-self:stretch;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:7px 0 0 7px;color:#fff;background:var(--c);
  font:italic 900 15px/1 'Barlow Condensed','Lilita One',sans-serif;
  -webkit-mask:radial-gradient(circle at 100% 7px,transparent 2.6px,#000 3px) 0 0/100% 10px;mask:radial-gradient(circle at 100% 7px,transparent 2.6px,#000 3px) 0 0/100% 10px}
.yn-kasa .ks-b .fl-who{position:static;grid-row:1/3;width:30px;height:30px;margin:0;border-radius:8px;border:2px solid #fff;box-shadow:0 2px 0 rgba(0,0,0,.3);overflow:hidden}
.yn-kasa .ks-b .fl-who.me{box-shadow:0 0 0 2px #ffd25a,0 2px 0 rgba(0,0,0,.3)}
.yn-kasa .ks-b .nm{grid-column:3;min-width:0;font:700 13px/1.1 'Fredoka',sans-serif;white-space:nowrap;overflow:hidden}
.yn-kasa .ks-b .tg{grid-column:4;justify-self:end;display:flex;align-items:center;gap:3px;padding:2px 6px 3px;border-radius:5px;white-space:nowrap;
  font:italic 900 12px/1 'Barlow Condensed',sans-serif;letter-spacing:.06em;color:#fff;background:#4a5266}
.yn-kasa .ks-b .tg svg{width:12px;height:12px}
.yn-kasa .ks-b .tg.ac{background:#1a1200;color:#ffd25a}
.yn-kasa .ks-b .kd{grid-column:3/5;display:flex;align-items:center;gap:3px;min-width:0}
.yn-kasa .ks-b .kd i{flex:none;width:17px;height:19px;display:grid;place-items:center;border-radius:4px;font:400 14px/1 'Lilita One',sans-serif;font-style:normal;color:#6a5e48;background:#d6cbb0}
.yn-kasa .ks-b .kd i.ok{color:#fff;background:#25a552}
.yn-kasa .ks-b .kd i.no{color:#fff;background:#e2392c}
.yn-kasa .ks-b .kd i.jam{color:#8f846c;background:#cfc4a8}
.yn-kasa .ks-b .rk svg{width:11px;height:11px;flex:none}
.yn-kasa .ks-b .rk b{font:inherit}
/* dar fiş (iki sütunda 340 px'ten dar sıra: 320'lik ekran, masaüstü çerçevesi): yazılı etiket kalkar, ad bütün satırı alır;
   "açtı" ve "dinledi" işaretleri sıra numarasının şeridinde */
@container (max-width:339px){
  .yn-kasa .ks-b{grid-template-columns:19px 26px minmax(0,1fr);column-gap:5px;padding-right:6px}
  .yn-kasa .ks-b .tg{display:none}
  .yn-kasa .ks-b .fl-who{width:26px;height:26px}
  .yn-kasa .ks-b .kd{grid-column:3;gap:2px}
  .yn-kasa .ks-b .kd i{width:15px;height:18px;font-size:13px}
}
.yn-kasa .ks-b.dar{grid-template-columns:19px 26px minmax(0,1fr)}
.yn-kasa .ks-b.dar .tg{display:none}
.yn-kasa .ks-b.dar .kd{grid-column:3}
.yn-kasa .ks-b .kd .yok{font:600 12px/1 'Fredoka',sans-serif;color:#7a6a50}
@keyframes ksDon{to{transform:rotate(360deg)}}
@keyframes ksSars{20%{transform:translateX(-5px)}45%{transform:translateX(5px)}70%{transform:translateX(-3px)}90%{transform:translateX(2px)}}
@keyframes ksCak{0%{opacity:1}100%{opacity:0}}
@keyframes ksTak{0%{transform:none}35%{transform:translateY(3px)}70%{transform:translateY(-1px)}100%{transform:none}}
@keyframes ksAlarm{0%{opacity:0}10%{opacity:1}30%{opacity:.55}45%{opacity:1}65%{opacity:.55}80%{opacity:.9}100%{opacity:0}}
@keyframes ksFener{to{filter:brightness(2.2) drop-shadow(0 0 10px #ff3a2a)}}
@keyframes ksHazir{0%,100%{opacity:0}50%{opacity:1}}
@keyframes ksDinle{0%,100%{box-shadow:inset 0 0 0 2px #4a2e06,0 0 0 2px #2a1a04}50%{box-shadow:inset 0 0 0 2px #4a2e06,0 0 0 3px #6ac8ff,0 0 14px rgba(106,200,255,.7)}}
@keyframes ksKul{0%{opacity:0;transform:translateY(-18px) scale(.6)}18%{opacity:1;transform:none}82%{opacity:1;transform:none}100%{opacity:0;transform:scale(.8)}}
@keyframes ksDalga{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(2.1)}}
@keyframes ksLevha{0%{opacity:0;transform:scale(.7)}70%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:none}}
/* fiş ve NOT alttan büyüyerek gelir (alt kenar yerinde): arayüzün sığdırma ölçümü giriş sırasında da son boyu görür */
@keyframes ksFis{0%{opacity:0;transform:scale(.94)}100%{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.yn-kasa .ks-isin,.yn-kasa .ks-teker.hazir::after,.yn-kasa.dinle .ks-pen,.yn-kasa .ks-parla::before{animation:none}.yn-kasa .ks-kapi{transition-duration:.01s}}
`;

// ---------------------------------------------------------------- tambur (tuval): silindir izdüşümü, yay fiziği

class Drum {
	constructor(pen, k, hooks) {
		this.pen = pen;
		this.cv = pen.querySelector('canvas');
		this.ctx = this.cv.getContext('2d');
		this.k = k;
		this.hooks = hooks;
		this.pos = 0; // sürekli konum (rakam = yuvarlanmış konumun 10'a kalanı)
		this.vel = 0;
		this.target = 0;
		this.mode = 'idle'; // idle | drag | coast | spring
		this.state = ''; // '' | ok | no | jam | altin
		this.hint = null; // { d, rel }: stetoskop (elenen rakamlar söner)
		this.crowd = null; // seyircinin rakamı
		this.last = 0; // son tık atan tam konum
		this.dirty = true;
	}
	get digit() {
		return ((Math.round(this.target ?? this.pos) % 10) + 10) % 10;
	}
	get shown() {
		return ((Math.round(this.pos) % 10) + 10) % 10;
	}
	/** Hedefe yay ile git (kısa yoldan); d: adım (+1 yukarı). */
	nudge(d) {
		this.target = Math.round(this.mode === 'spring' ? this.target : this.pos) + d;
		this.vel += d * 5;
		this.mode = 'spring';
		this.hooks.wake();
	}
	/** Bir rakama kısa yoldan dön. */
	to(digit, kick = 0) {
		const cur = Math.round(this.mode === 'spring' ? this.target : this.pos);
		const now = ((cur % 10) + 10) % 10;
		let d = digit - now;
		if (d > 5) d -= 10;
		if (d < -5) d += 10;
		this.target = cur + d;
		this.vel += kick;
		this.mode = 'spring';
		this.hooks.wake();
	}
	/** Hemen yerine oturt (kol çekildi). */
	settle() {
		const t = Math.round(this.mode === 'spring' ? this.target : this.pos);
		this.pos = this.target = t;
		this.vel = 0;
		this.mode = 'idle';
		this.dirty = true;
	}
	step(dt) {
		if (this.mode === 'coast') {
			this.pos += this.vel * dt;
			this.vel *= Math.exp(-dt * 3.2);
			if (Math.abs(this.vel) < 2.2) {
				this.target = Math.round(this.pos + this.vel * 0.12);
				this.mode = 'spring';
			}
		} else if (this.mode === 'spring') {
			const k = 160;
			const c = 2 * Math.sqrt(k) * 0.62; // az sönümlü: hafif sekip oturur
			this.vel += (k * (this.target - this.pos) - c * this.vel) * dt;
			this.pos += this.vel * dt;
			if (Math.abs(this.target - this.pos) < 0.003 && Math.abs(this.vel) < 0.03) {
				this.pos = this.target;
				this.vel = 0;
				this.mode = 'idle';
			}
		}
		const r = Math.round(this.pos);
		if (r !== this.last) {
			this.last = r;
			this.hooks.tick(this, Math.abs(this.vel));
		}
		if (this.mode !== 'idle') this.dirty = true;
		return this.mode !== 'idle';
	}
	/** Gerekiyorsa yeniden çiz (karede bir kez). */
	paint() {
		if (!this.dirty) return;
		this.draw();
		this.dirty = false;
	}
	size() {
		const b = this.pen.getBoundingClientRect();
		const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
		const w = Math.max(1, Math.round(b.width * dpr));
		const h = Math.max(1, Math.round(b.height * dpr));
		if (this.cv.width !== w || this.cv.height !== h) {
			this.cv.width = w;
			this.cv.height = h;
		}
		this.cell = Math.max(8, b.height * 0.6 * Math.sin(ARC)); // bir rakamlık sürükleme (ekran px)
		this.dirty = true;
		this.draw();
	}
	draw() {
		const c = this.ctx;
		const W = this.cv.width;
		const H = this.cv.height;
		if (W < 4 || H < 4) return;
		c.setTransform(1, 0, 0, 1, 0, 0);
		c.clearRect(0, 0, W, H);
		const st = this.state;
		// silindir gövdesi: fildişi, kenarlarda gölge
		const g = c.createLinearGradient(0, 0, 0, H);
		const mid = st === 'ok' ? '#e4ffe9' : st === 'no' ? '#ffe2dc' : st === 'altin' ? '#fff2c4' : st === 'jam' ? '#a9a08c' : '#f6efdc';
		g.addColorStop(0, '#231c10');
		g.addColorStop(0.17, st === 'jam' ? '#6a6252' : '#a2957a');
		g.addColorStop(0.5, mid);
		g.addColorStop(0.83, st === 'jam' ? '#6a6252' : '#a2957a');
		g.addColorStop(1, '#231c10');
		c.fillStyle = g;
		c.fillRect(0, 0, W, H);
		// ince yiv çizgileri (dönen yüzey hissi)
		c.globalAlpha = 0.08;
		c.fillStyle = '#3a2a10';
		for (let x = W * 0.08; x < W; x += Math.max(3, W / 14)) c.fillRect(x, 0, Math.max(1, W / 90), H);
		c.globalAlpha = 1;
		const R = H * 0.6;
		const cy = H / 2;
		const fs = H * 0.52;
		c.font = `400 ${fs.toFixed(1)}px "Lilita One","Fredoka",sans-serif`;
		c.textAlign = 'center';
		c.textBaseline = 'middle';
		const base = Math.floor(this.pos);
		for (let i = base - 2; i <= base + 3; i++) {
			const a = (i - this.pos) * ARC;
			if (Math.abs(a) >= Math.PI / 2 - 0.02) continue;
			const y = cy - R * Math.sin(a); // büyük rakamlar yukarıda: üstteki komşu bir fazlası
			const sc = Math.cos(a);
			const d = ((i % 10) + 10) % 10;
			const center = Math.abs(a) < ARC / 2;
			let alpha = 0.1 + 0.9 * sc * sc * sc * sc; // komşu rakamlar sönük: okunan rakam öne çıkar
			const h = this.hint;
			const out = h && ((h.rel > 0 && d <= h.d) || (h.rel < 0 && d >= h.d) || (h.rel === 0 && d !== h.d));
			if (out) alpha *= 0.28;
			let col = '#20160a';
			if (center && st === 'ok') col = '#0f8a3a';
			else if (center && st === 'no') col = '#c8231a';
			else if (st === 'jam') col = '#4a4232';
			else if (center && st === 'altin') col = '#8a5600';
			else if (h && h.rel === 0 && d === h.d) col = '#0f6a9a';
			c.save();
			c.translate(W / 2, y);
			c.scale(1, sc);
			c.globalAlpha = alpha;
			if (center && (st === 'ok' || st === 'altin')) {
				c.shadowColor = st === 'ok' ? 'rgba(40,220,110,.9)' : 'rgba(255,200,60,.9)';
				c.shadowBlur = H * 0.12;
			}
			c.fillStyle = col;
			c.fillText(String(d), 0, fs * 0.05);
			c.restore();
			if (this.crowd === d) {
				// seyircinin rakamı: pembe işaret
				c.save();
				c.globalAlpha = 0.9 * sc;
				c.fillStyle = '#ec4f93';
				c.beginPath();
				const ty = y;
				c.moveTo(W * 0.05, ty - H * 0.06);
				c.lineTo(W * 0.15, ty);
				c.lineTo(W * 0.05, ty + H * 0.06);
				c.fill();
				c.restore();
			}
		}
		// üst ve alt gölge, ortada okuma çizgileri ve cam parıltısı
		const sh = c.createLinearGradient(0, 0, 0, H);
		sh.addColorStop(0, 'rgba(10,6,2,.85)');
		sh.addColorStop(0.24, 'rgba(10,6,2,0)');
		sh.addColorStop(0.76, 'rgba(10,6,2,0)');
		sh.addColorStop(1, 'rgba(10,6,2,.85)');
		c.fillStyle = sh;
		c.fillRect(0, 0, W, H);
		c.fillStyle = st === 'no' ? 'rgba(200,30,20,.8)' : st === 'ok' ? 'rgba(20,150,70,.75)' : 'rgba(150,40,20,.55)';
		const lh = Math.max(1, H * 0.012);
		c.fillRect(0, cy - H * 0.27, W, lh);
		c.fillRect(0, cy + H * 0.27 - lh, W, lh);
		const gl = c.createLinearGradient(0, 0, 0, H * 0.5);
		gl.addColorStop(0, 'rgba(255,255,255,0)');
		gl.addColorStop(0.55, 'rgba(255,255,255,.16)');
		gl.addColorStop(1, 'rgba(255,255,255,0)');
		c.fillStyle = gl;
		c.fillRect(0, H * 0.1, W, H * 0.32);
	}
}

// ---------------------------------------------------------------- tip

export const kasa = {
	time: 26,
	label: 'Kasa Soygunu',
	kind: 'closest',
	cover: true, // tam ekran kasa kapısı (harita gizli)
	calm: true, // harita arkada durgun (klasik tiplerle aynı işaret)
	keep: true,
	rule: 'Kilit soldan açılır',
	jokers: ['yari', 'kahin'],
	revealMs: 6800, // yoklama + kapı/alarm + fişler
	fmt: (v, value) => `${value && typeof value.c === 'string' ? value.c : '—'}${v.q.unit ? ' ' + v.q.unit : ''}`,
	sub: (v, value) => {
		const y = yokla(v, value);
		if (!y) return '';
		return `${y.open ? 'kasayı açtı' : `${y.lead}/${v.n} tambur`}${y.hint ? ' · dinledi' : ''}`;
	},
	prepare(q) {
		const { ans, ...pub } = q;
		const n = clamp(String(Math.abs(Math.round(Number(ans) || 0))).length, 2, 4);
		const v = { q: pub, n, hedef: Math.round(Number(ans)) };
		return stamp(v, q, (q2, k, P, text) => {
			text(q.unit);
			return {
				look: LOOK.orient + (n + 1) * LOOK.gaze, // tamburlar ve kol
				// cevabı hatırla, sonra basamak basamak kur (soldan: yüzyıl, onyıl…)
				think: P.think[0] + P.think[1] * k + 0.4 * n,
				// tambur başına: tamburu bul, ortalama 2,5 adım çevir (sarmal: en çok 5); sonra kolu çevir. Stetoskop isteğe
				// bağlı (DİNLE + tambur + 1,2 sn dinleme): beklenen payı 0,8 sn
				act: n * (0.5 + 2.5 * STEP) + ACT.confirm + 0.8,
			};
		});
	},
	mount(el, v, api) {
		css('yn-kasa', CSS);
		const app = appOf();
		const n = v.n;
		const id = ++UID;
		const known = v.hedef != null;
		const rm = rmq();
		el.innerHTML = `<div class="yn-kasa" style="--n:${n}">
			<div class="ks-sahne">
				<div class="ks-kasa">
					<i class="ks-pc t"></i><i class="ks-pc b"></i><i class="ks-pc l"></i><i class="ks-pc r"></i>
					<div class="ks-ic">${insideSVG()}<i class="ks-isin"></i><i class="ks-nur"></i></div>
					<i class="ks-mn" style="top:18%"></i><i class="ks-mn" style="bottom:18%"></i>
					<div class="ks-kapi">
						<div class="ks-arka"></div><div class="ks-yuz"></div><i class="ks-parla"></i><i class="ks-kal"></i>
						<i class="ks-sg" style="top:24%"></i><i class="ks-sg" style="top:50%"></i><i class="ks-sg" style="top:76%"></i>
						<div class="ks-ici">
							<div class="ks-pano">${Array.from(
								{ length: n },
								(_, k) => `<div class="ks-tb" data-k="${k}">
								<button class="ks-ok" data-k="${k}" data-d="1" aria-label="${k + 1}. tambur: bir artır">${svgUp}</button>
								<div class="ks-pen" data-k="${k}" role="spinbutton" tabindex="0" aria-label="${k + 1}. tambur" aria-valuemin="0" aria-valuemax="9" aria-valuenow="0"><canvas></canvas><i class="ks-kul"></i></div>
								<button class="ks-ok" data-k="${k}" data-d="-1" aria-label="${k + 1}. tambur: bir azalt">${svgDn}</button></div>`,
							).join('')}</div>
							<div class="ks-alt">
								<div class="ks-ty"><i class="ks-halka"></i><button class="ks-teker hazir" aria-label="Kolu çevir: kasayı aç">${wheelSVG(id)}<b>AÇ</b></button></div>
								<button class="ks-st" aria-label="Stetoskop: bir tamburu dinle (yarım tambur bedel)">${svgSteth}<b>DİNLE</b><small>−½ tambur</small></button>
							</div>
						</div>
					</div>
					<i class="ks-fener"></i>
				</div>
				<div class="ks-alarm"><i></i></div>
				<div class="ks-perde"></div>
				<div class="ks-yer"></div>
			</div>
			<div class="ks-bilet"></div>
			${known && v.q.not ? `<div class="ks-not"><b>NOT</b><span>${esc(v.q.not)}</span></div>` : ''}
		</div>`;
		rule(el, 'Kilit soldan açılır');
		const root = el.querySelector('.yn-kasa');
		const sahne = root.querySelector('.ks-sahne');
		const tbs = [...root.querySelectorAll('.ks-tb')];
		const pens = [...root.querySelectorAll('.ks-pen')];
		const teker = root.querySelector('.ks-teker');
		const stBtn = root.querySelector('.ks-st');
		const yer = root.querySelector('.ks-yer');
		const bilet = root.querySelector('.ks-bilet');
		if (!known) {
			stBtn.disabled = true; // çevrimiçi: dinleme sunucuya sorulmalı (bkz. dosya başı)
			stBtn.querySelector('small').textContent = 'çevrimiçi kapalı';
		}
		let done = false; // kol çekildi ya da süre bitti
		let listen = false;
		let hint = null; // { k, d, rel }
		let checkP = null; // yoklama filmi (Promise)
		let alive = true;
		const timers = new Set();
		const wait = (ms) =>
			new Promise((res) => {
				const t = setTimeout(() => {
					timers.delete(t);
					res();
				}, rm ? Math.min(ms, 120) : ms);
				timers.add(t);
			});

		// ------------------------------------------------ tamburlar ve kare döngüsü
		let raf = 0;
		let lastT = 0;
		let tickAt = 0;
		const loop = () => {
			raf = 0;
			if (!alive || !root.isConnected) return;
			const now = clock.now();
			// geç gelen karede alt adımlar: yay yavaş cihazda da gerçek sürede oturur
			let rem = Math.min(0.3, Math.max(0.001, (now - lastT) / 1000));
			lastT = now;
			let any = false;
			while (rem > 1e-4) {
				const h = Math.min(1 / 90, rem);
				rem -= h;
				any = false;
				for (const d of drums) any = d.step(h, rem > 1e-4) || any;
				if (!any) break;
			}
			for (const d of drums) d.paint();
			if (any) raf = requestAnimationFrame(loop);
		};
		const wake = () => {
			if (raf || !alive) return;
			lastT = clock.now();
			raf = requestAnimationFrame(loop);
		};
		const hooks = {
			wake,
			tick(d, speed) {
				const now = clock.now();
				pens[d.k].setAttribute('aria-valuenow', String(d.shown));
				if (now - tickAt < 28) return;
				tickAt = now;
				sfx(app, 'tick', { speed: Math.min(900, 120 + speed * 40) });
				if (speed < 14) buzz(3);
			},
		};
		const drums = pens.map((p, k) => new Drum(p, k, hooks));
		const code = () => drums.map((d) => d.digit).join('');
		const lockedK = (k) => done || drums[k].state === 'altin' || tbs[k].classList.contains('dinliyor');

		// ------------------------------------------------ yerleşim (sahne boyuna göre: dikey ya da yan yana)
		// Soru: tambur panosu + kol (dikey: kol altta; dar ve alçak sahnede yan yana: kol sağda). Cevap (fişler açıkken):
		// oklar ve kol kalkar; doğru şifre levhası panonun altına (ya da sağına), sığmazsa kapının ortasına oturur.
		let lay = null;
		const fit = () => {
			const W = sahne.clientWidth;
			const H = sahne.clientHeight;
			if (!W || !H) return;
			const m = clamp(Math.round(Math.min(W, H) * 0.022), 5, 9); // sahne kenarı
			const f = clamp(Math.round(Math.min(W, H) * 0.045), 9, 18); // çerçeve kalınlığı
			const p = clamp(Math.round(Math.min(W, H) * 0.05), 9, 20); // kapının iç payı
			const iw = W - 2 * m - 2 * f - 2 * p;
			const ih = H - 2 * m - 2 * f - 2 * p;
			const comp = root.classList.contains('fis');
			const g = clamp(Math.round(iw * 0.02), 4, 8);
			const pp = clamp(Math.round(iw * 0.025), 6, 10);
			const gy = clamp(Math.round(ih * 0.04), 6, 14);
			const gx = clamp(Math.round(iw * 0.04), 8, 16);
			const sh = 46; // stetoskop düğmesi
			let L;
			if (!comp) {
				const ah = clamp(Math.round(ih * 0.13), 40, 46);
				const tall = () => {
					const dw = Math.min(70, (iw - 2 * pp - (n - 1) * g) / n);
					// tambur penceresi önce (en çok 1,55 × genişlik), kol kalan yerin çoğunu alır (kilit aynası payıyla)
					let dh = Math.min(dw * 1.55, 112, ih - 2 * pp - 2 * ah - 8 - gy - 62);
					let wd = clamp(Math.round(Math.min(iw * 0.4, (ih - 2 * pp - 2 * ah - 8 - gy - dh) / 1.2)), 62, 132);
					if (dh < 56) {
						const cut = Math.min(56 - dh, wd - 62);
						wd -= cut;
						dh += cut;
					}
					return { wide: false, ah, wd, dw, dh };
				};
				const wide = () => {
					let wd = clamp(Math.round(Math.min(iw * 0.3, ih * 0.62)), 60, 112);
					if (wd * 1.26 + 6 + sh > ih) wd = Math.max(52, Math.floor((ih - 6 - sh) / 1.26)); // kol, kilit aynası ve stetoskop alt alta
					const dw = Math.min(70, (iw - Math.max(wd, 70) - gx - 2 * pp - (n - 1) * g) / n);
					return { wide: true, ah, wd, dw, dh: Math.min(ih - 2 * pp - 2 * ah - 8, dw * 1.55, 112) };
				};
				const a = tall();
				const b = wide();
				const sc = (x) => Math.min(x.dw, x.dh / 1.3);
				// yan yana: dikeyde tambur sığmıyorsa ve yanda daha büyük çıkıyorsa
				L = (a.dh >= 54 && a.dw >= 40) || sc(b) <= sc(a) + 2 ? a : b;
				L.slot = '';
			} else {
				const dwT = Math.min(70, (iw - 2 * pp - (n - 1) * g) / n);
				const dhT = Math.min(ih - 2 * pp - gy - 62, dwT * 1.4, 96);
				const dwW = Math.min(70, (iw - 150 - gx - 2 * pp - (n - 1) * g) / n);
				const dhW = Math.min(ih - 2 * pp, dwW * 1.4, 96);
				if (dhT >= 44) L = { wide: false, dw: dwT, dh: dhT, slot: 'alt' };
				else if (dwW >= 34 && dhW >= 44) L = { wide: true, dw: dwW, dh: dhW, slot: 'yan' };
				else L = { wide: false, dw: dwT, dh: Math.min(ih - 2 * pp, dwT * 1.4, 96), slot: 'orta' };
				L.ah = 0;
				L.wd = 0;
			}
			L.dw = Math.floor(L.dw);
			L.dh = Math.floor(L.dh);
			lay = { W, H, m, f, p, gy, gx, ...L };
			const s = root.style;
			s.setProperty('--m', m + 'px');
			s.setProperty('--f', f + 'px');
			s.setProperty('--p', p + 'px');
			s.setProperty('--rp', clamp(Math.round(Math.min(W, H) * 0.06), 14, 24) + 'px');
			s.setProperty('--pl', clamp(Math.round(Math.min(W, H) * 0.075), 16, 30) + 'px');
			s.setProperty('--persp', Math.round(Math.max(W, 260) * 3.2) + 'px'); // her boyda aynı derinlik hissi
			s.setProperty('--g', g + 'px');
			s.setProperty('--pp', pp + 'px');
			s.setProperty('--ah', L.ah + 'px');
			s.setProperty('--dw', L.dw + 'px');
			s.setProperty('--dh', Math.max(40, L.dh) + 'px');
			s.setProperty('--wd', Math.max(48, L.wd) + 'px');
			s.setProperty('--sh', sh + 'px');
			s.setProperty('--gy', gy + 'px');
			s.setProperty('--gx', gx + 'px');
			root.classList.toggle('genis', L.wide);
			root.dataset.yer = L.slot;
			for (const d of drums) d.size();
			place();
			// tornalanmış yüzün merkezi kolun ekseninde (kapı yüzüne göre yüzde)
			const ty = root.querySelector('.ks-ty');
			const kp = root.querySelector('.ks-kapi');
			if (ty?.offsetWidth && kp?.offsetHeight) {
				const o = off(ty);
				const k0 = off(kp);
				s.setProperty('--wy', (((o.y - k0.y + o.h / 2) / kp.offsetHeight) * 100).toFixed(1) + '%');
				s.setProperty('--wx', (((o.x - k0.x + o.w / 2) / kp.offsetWidth) * 100).toFixed(1) + '%');
			}
		};
		/** Öğenin sahnedeki yeri (yerleşim pikseli; dönüşümler, açık kapının 3B dönüşü dahil, sayılmaz). */
		const off = (e) => {
			let x = 0;
			let y = 0;
			for (let c = e; c && c !== sahne; c = c.offsetParent) {
				x += c.offsetLeft;
				y += c.offsetTop;
			}
			return { x, y, w: e.offsetWidth, h: e.offsetHeight };
		};
		/** Levhanın yeri: panonun altı (dikey), sağı (yan yana) ya da kapının ortası. */
		const place = () => {
			if (!lay) return;
			const { W, H, m, f, gy, gx } = lay;
			const pn = off(root.querySelector('.ks-pano'));
			const e0 = m + f + 4;
			let box;
			const slot = root.classList.contains('acik') ? 'orta' : lay.slot; // kapı açıldıysa pano kapıyla gitti: levha hazinenin önünde
			if (slot === 'alt') box = { left: e0, top: pn.y + pn.h + gy * 0.5, width: W - 2 * e0, height: H - e0 - (pn.y + pn.h + gy * 0.5) };
			else if (slot === 'yan') box = { left: pn.x + pn.w + gx * 0.5, top: e0, width: W - e0 - (pn.x + pn.w + gx * 0.5), height: H - 2 * e0 };
			else box = { left: e0, top: e0, width: W - 2 * e0, height: H - 2 * e0 };
			Object.assign(yer.style, { left: box.left + 'px', top: box.top + 'px', width: Math.max(0, box.width) + 'px', height: Math.max(0, box.height) + 'px' });
			const lf = clamp(Math.min((box.width - 30) / (n * 0.78 + (v.q.unit ? 1.1 : 0.2)), box.height * 0.46), 18, 38);
			root.style.setProperty('--lf', lf.toFixed(1) + 'px');
		};
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => fit()) : null;
		ro?.observe(sahne);
		fit();
		document.fonts?.load?.('400 40px "Lilita One"').then(() => {
			for (const d of drums) d.size();
		}, () => {});
		// açılış: kart açılınca tamburlar karışık hızla döner, sırayla sıfıra oturur (kasa "karıştırılır")
		drums.forEach((d, k) => {
			d.pos = d.last = rm ? 0 : -(7 + k * 3);
			d.target = 0;
		});
		let introT = 0;
		const offOpen = onOpen(el, () => {
			introT = setTimeout(() => {
				if (!alive) return;
				for (const d of drums) {
					if (d.mode === 'idle' && !done) {
						d.mode = rm ? 'idle' : 'spring';
						d.dirty = true;
					}
				}
				wake();
			}, 260);
		});

		// ------------------------------------------------ girdi: oklar, sürükleme, dokunma, klavye
		root.addEventListener('click', (e) => {
			const b = e.target.closest('.ks-ok');
			if (!b) return;
			const k = Number(b.dataset.k);
			if (lockedK(k) || listen) return;
			drums[k].nudge(Number(b.dataset.d));
			sfx(app, 'tap');
		});
		pens.forEach((pen, k) => {
			let drag = null;
			pen.addEventListener('pointerdown', (e) => {
				if (lockedK(k)) return;
				if (listen) {
					e.preventDefault();
					return listenTo(k);
				}
				pen.setPointerCapture?.(e.pointerId);
				const d = drums[k];
				drag = { id: e.pointerId, y0: e.clientY, pos0: d.pos, t0: clock.now(), moved: false, s: [[clock.now(), d.pos]] };
				d.mode = 'drag';
				d.vel = 0;
				e.preventDefault();
			});
			pen.addEventListener('pointermove', (e) => {
				if (!drag || e.pointerId !== drag.id) return;
				const d = drums[k];
				const dy = e.clientY - drag.y0;
				if (Math.abs(dy) > 6) drag.moved = true;
				if (!drag.moved) return;
				d.pos = drag.pos0 + dy / d.cell; // parmak aşağı: üstteki (büyük) rakam pencereye iner
				const now = clock.now();
				drag.s.push([now, d.pos]);
				if (drag.s.length > 6) drag.s.shift();
				d.dirty = true;
				d.step(0);
				d.paint();
				wake();
			});
			const up = (e) => {
				if (!drag || e.pointerId !== drag.id) return;
				const d = drums[k];
				const dt = clock.now() - drag.t0;
				if (!drag.moved && dt < 450) {
					// dokunma: penceredeki üst komşu (bir fazlası) ya da alt komşu ortaya gelir
					const r = pen.getBoundingClientRect();
					const fy = (e.clientY - r.top) / (r.height || 1);
					d.mode = 'idle';
					d.target = Math.round(d.pos);
					if (fy < 0.42) d.nudge(1);
					else if (fy > 0.58) d.nudge(-1);
					else d.nudge(0);
				} else {
					const s = drag.s;
					const a0 = s[0];
					const a1 = s[s.length - 1];
					const vel = a1[0] > a0[0] ? ((a1[1] - a0[1]) / (a1[0] - a0[0])) * 1000 : 0;
					d.vel = clamp(vel, -40, 40);
					d.mode = Math.abs(d.vel) > 3 ? 'coast' : 'spring';
					d.target = Math.round(d.pos);
					wake();
				}
				drag = null;
			};
			pen.addEventListener('pointerup', up);
			pen.addEventListener('pointercancel', up);
			pen.addEventListener('keydown', (e) => {
				if (lockedK(k)) return;
				if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
					drums[k].nudge(e.key === 'ArrowUp' ? 1 : -1);
					e.preventDefault();
				} else if (/^[0-9]$/.test(e.key)) {
					drums[k].to(Number(e.key), 3);
					pens[k + 1]?.focus();
					e.preventDefault();
				} else if (e.key === 'Enter') {
					pull();
					e.preventDefault();
				}
			});
		});

		// ------------------------------------------------ stetoskop
		const toast = (t, tone = 'good') => app?.ui?.toast?.(t, { tone, ms: 2200 });
		stBtn.addEventListener('click', () => {
			if (done || hint || !known) return;
			listen = !listen;
			root.classList.toggle('dinle', listen);
			sfx(app, 'tap');
			if (listen) toast('Dinlemek için bir tambura dokun', 'info');
		});
		const listenTo = async (k) => {
			if (!listen || hint || done) return;
			listen = false;
			root.classList.remove('dinle');
			const d = drums[k];
			d.settle();
			const dg = d.digit;
			const a = Number(hedefStr(v)[k]);
			const rel = a > dg ? 1 : a < dg ? -1 : 0;
			hint = { k, d: dg, rel };
			stBtn.disabled = true;
			stBtn.querySelector('small').textContent = 'dinlendi';
			tbs[k].classList.add('dinliyor');
			sfx(app, 'iaHint');
			for (let i = 0; i < 3; i++) {
				await wait(260);
				if (!alive) return;
				sfx(app, 'tick', { speed: 40 });
			}
			await wait(220);
			if (!alive) return;
			tbs[k].classList.remove('dinliyor');
			d.hint = { d: dg, rel };
			d.dirty = true;
			wake();
			if (rel === 0) {
				sfx(app, 'kbPing', { n: 1 });
				toast(`${k + 1}. tambur doğru: ${dg}`, 'good');
			} else {
				sfx(app, 'kbPing', { n: 0 });
				toast(`${k + 1}. tambur: rakam ${dg}${ABL[dg]} ${rel > 0 ? 'büyük' : 'küçük'}`, 'info');
			}
			buzz(10);
		};

		// ------------------------------------------------ kol: AÇ (dokun ya da çevir)
		const pull = () => {
			if (done) return;
			done = true;
			listen = false;
			root.classList.remove('dinle');
			for (const d of drums) d.settle();
			wake();
			const c = code();
			root.classList.add('cekildi');
			teker.classList.remove('hazir');
			sfx(app, 'answer');
			sfx(app, 'defend');
			buzz(22);
			api.answer({ c, h: hint ? [hint.k] : [] });
			if (known) checkP = wait(420).then(() => check(c));
		};
		let turn = null;
		teker.addEventListener('pointerdown', (e) => {
			if (done) return;
			const r = teker.getBoundingClientRect();
			turn = { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2, a0: Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)), deg: 0 };
			teker.setPointerCapture?.(e.pointerId);
		});
		teker.addEventListener('pointermove', (e) => {
			if (!turn || e.pointerId !== turn.id || done) return;
			let da = Math.atan2(e.clientY - turn.cy, e.clientX - turn.cx) - turn.a0;
			if (da > Math.PI) da -= Math.PI * 2;
			if (da < -Math.PI) da += Math.PI * 2;
			turn.deg = clamp((da * 180) / Math.PI, 0, 100);
			const kol = teker.querySelector('.ks-kol');
			kol.style.transition = 'none';
			kol.style.transform = `rotate(${turn.deg.toFixed(1)}deg)`;
			if (turn.deg > 62) {
				kol.style.transition = '';
				kol.style.transform = '';
				turn = null;
				pull();
			}
		});
		const turnEnd = (e) => {
			if (!turn || e.pointerId !== turn.id) return;
			const kol = teker.querySelector('.ks-kol');
			kol.style.transition = '';
			kol.style.transform = '';
			turn = null;
		};
		teker.addEventListener('pointerup', turnEnd);
		teker.addEventListener('pointercancel', turnEnd);
		teker.addEventListener('click', () => pull());

		// ------------------------------------------------ yoklama filmi: soldan sağa, sonra kapı ya da alarm
		const fx = () => app?.ui?.fx;
		const burstAt = (elx, o) => {
			const f = fx();
			if (!f || !elx?.isConnected) return;
			const r = elx.getBoundingClientRect();
			f.burst(r.left + r.width / 2, r.top + r.height / 2, o);
		};
		const openDoor = async (quick = false) => {
			root.classList.add('surgu');
			sfx(app, 'whoosh');
			await wait(quick ? 150 : 420);
			if (!alive) return;
			root.classList.add('acik');
			place();
			sfx(app, 'castle');
			buzz(30);
			await wait(quick ? 150 : 520);
			if (!alive) return;
			root.classList.add('nur');
			sfx(app, 'coin');
			const ic = root.querySelector('.ks-ic');
			burstAt(ic, { n: 22, dist: 150, colors: ['#ffd25a', '#fff3b0', '#f2a51a', '#ffffff'], kind: 'star', size: 13, life: 1100 });
			if (quick) return;
			await wait(280);
			burstAt(ic, { n: 14, dist: 110, colors: ['#ffd25a', '#fff8d8'], size: 9, life: 900 });
		};
		const alarm = () => {
			root.classList.add('alarm');
			sfx(app, 'sabotage');
			buzz(60);
		};
		/** Tamburları soldan yokla; dönüş: yoklama sonucu. quick: kol çekilmeden gelen cevap (süre bitti): kısa film. */
		const check = async (c, quick = false) => {
			const y = yokla(v, { c, h: hint ? [hint.k] : [] });
			if (!y || !alive) return y;
			root.classList.add('kontrol');
			for (let k = 0; k < n; k++) {
				if (!alive) return y;
				tbs[k].classList.remove('altin');
				if (k < y.lead) {
					drums[k].state = 'ok';
					tbs[k].classList.add('ok');
					sfx(app, 'bzRight', { n: k * 2 + (k === n - 1 ? 2 : 0) });
					buzz(12);
				} else {
					drums[k].state = 'no';
					tbs[k].classList.add('no');
					sfx(app, 'bzWrong');
					buzz(45);
					for (let j = k + 1; j < n; j++) {
						drums[j].state = 'jam';
						tbs[j].classList.remove('altin');
						tbs[j].classList.add('jam');
					}
					for (const d of drums) d.dirty = true;
					wake();
					break;
				}
				drums[k].dirty = true;
				wake();
				await wait(rm ? 60 : quick ? 170 : 360);
			}
			await wait(quick ? 80 : 260);
			if (!alive) return y;
			if (y.open) await openDoor(quick);
			else alarm();
			return y;
		};

		// ------------------------------------------------ cevap: levha, fişler, damga
		const ticket = (r, k, win) => {
			const y = yokla(v, r.value);
			const digits = y ? [...r.value.c].map((ch, i) => `<i class="${i < y.lead ? 'ok' : i === y.lead ? 'no' : 'jam'}">${ch}</i>`).join('') : `<span class="yok">şifre yok</span>`;
			const tag = y ? (y.open ? `<span class="tg ac">AÇTI</span>` : `<span class="tg">${y.lead}/${n}</span>`) : '<span class="tg">—</span>';
			// sıra şeridi: numara, altında "açtı" ve "dinledi" işaretleri (dar fişte etiketin yerini tutar)
			const marks = (y?.open ? svgCheck : '') + (y?.hint ? svgSteth : '');
			return `<div class="ks-b${win ? ' win' : ''}" style="--c:${esc(r.color)};--k:${k}"><span class="rk"><b>${k + 1}</b>${marks}</span><b class="fl-who" style="background:${esc(r.color)}"></b><span class="nm">${esc(r.name)}</span>${tag}<span class="kd">${digits}</span></div>`;
		};
		/** Fişteki adlar sığsın: yazı küçülür; en küçükte de sığmazsa fiş dar biçime geçer (etiket kalkar, ad bütün satırı alır). */
		const fitNames = () => {
			for (const e of bilet.querySelectorAll('.nm')) {
				const b = e.closest('.ks-b');
				b.classList.remove('dar');
				for (let pass = 0; pass < 2; pass++) {
					e.style.fontSize = '';
					let fs = 13;
					for (let i = 0; i < 12 && e.scrollWidth > e.clientWidth + 0.5 && fs > 9; i++) e.style.fontSize = (fs -= 0.5) + 'px';
					if (e.scrollWidth <= e.clientWidth + 0.5 || b.classList.contains('dar')) break;
					b.classList.add('dar');
				}
			}
		};
		const plate = () => {
			if (!known) return;
			const u = v.q.unit ? `<u>${esc(v.q.unit)}</u>` : '';
			yer.innerHTML = `<div class="ks-levha"><small>DOĞRU ŞİFRE</small><b>${esc(hedefStr(v))}${u}</b></div>`;
			root.classList.add('levha');
			place();
		};

		onClose(el, cleanup); // kart kapanınca: kare döngüsü, zamanlayıcılar, gözlemciler durur
		return {
			lock() {
				done = true;
				listen = false;
				root.classList.remove('dinle');
				teker.classList.remove('hazir');
			},
			value: () => ({ c: code(), h: hint ? [hint.k] : [] }),
			joker(e) {
				if (!e || done) return;
				if (e.kind === 'acik' && drums[e.k]) {
					const d = drums[e.k];
					d.to(e.d, 4);
					d.state = 'altin';
					tbs[e.k].classList.add('altin');
					sfx(app, 'kbLock');
					toast(`${e.k + 1}. tambur açıldı: ${e.d}`, 'good');
				} else if (e.kind === 'kalabalik' && typeof e.c === 'string') {
					[...e.c].forEach((ch, k) => {
						if (!drums[k]) return;
						drums[k].crowd = Number(ch);
						drums[k].dirty = true;
					});
					wake();
					toast(`Seyirci şifresi: ${e.c} (pembe işaretler)`, 'info');
				}
			},
			reveal(results) {
				done = true;
				listen = false;
				root.classList.remove('dinle');
				root.classList.add('rv');
				const order = results.slice().sort((a, b) => a.err - b.err || a.time - b.time);
				const win = order[0];
				const me = results.find((r) => r.p?.human);
				// fişler hemen kurulur (arayüz avatarları şimdi koyar), yoklama bitince görünür
				bilet.innerHTML = order.map((r, k) => ticket(r, k, k === 0 && r.value != null)).join('');
				bilet.querySelectorAll('.fl-who').forEach((w, k) => order[k]?.p?.human && w.classList.add('me'));
				const quick = !checkP; // kol çekilmedi (süre bitti ya da cevap dışarıdan): film kısa, sonuç hemen
				const run = async () => {
					if (!checkP && known) {
						const mc = me && me.value && typeof me.value.c === 'string' && me.value.c.length === n ? me.value.c : null;
						if (mc) {
							// kol çekilmedi (süre bitti ya da cevap dışarıdan geldi): tamburlar oyuncunun şifresine döner
							[...mc].forEach((ch, k) => drums[k].to(Number(ch), 2));
							root.classList.add('cekildi');
							sfx(app, 'defend');
							checkP = wait(200).then(() => check(mc, true));
						} else {
							// izleyici ya da cevapsız: tamburlar doğru şifreye döner; biri açtıysa kapı açılır
							[...hedefStr(v)].forEach((ch, k) => {
								drums[k].to(Number(ch), 2);
								drums[k].state = 'altin';
								tbs[k].classList.add('altin');
							});
							checkP = wait(300).then(() => (results.some((r) => r.correct) ? openDoor(true) : alarm()));
						}
					}
					await checkP;
					await wait(quick ? 120 : 420);
					if (!alive) return;
					plate();
					root.classList.add('fis');
					fit(); // sahne küçüldü: yerleşim hemen (gözlemciyi beklemeden)
					fitNames();
					requestAnimationFrame(fitNames);
					sfx(app, 'reveal');
					if (me && app) {
						const y = yokla(v, me.value);
						const mine = win === me;
						if (!y) stampLater(app, 'KASA KAPALI KALDI', 'warn', known ? `Şifre ${hedefStr(v)}` : '');
						else if (y.open && mine) stampLater(app, 'KASA SENİN!', 'gold', y.hint ? 'Dinleyerek açtın' : `Şifre ${hedefStr(v)}`);
						else if (y.open) stampLater(app, 'AÇTIN AMA…', 'gold', `${win.name} ${win.correct && !yokla(v, win.value)?.hint && y.hint ? 'dinlemeden açtı' : 'daha hızlıydı'}`);
						else if (mine) stampLater(app, 'EN YAKIN SEN!', 'gold', `${y.lead}/${n} tambur açtın`);
						else stampLater(app, 'ALARM!', 'bad', win.correct ? `${win.name} kasayı açtı` : `${win.name} ${yokla(v, win.value)?.lead ?? 0}/${n} tambur açtı`);
					}
					setTimeout(() => {
						const w = el.closest('.fl-q')?.querySelector('.fl-cr.win .tag');
						if (w && win?.value != null) w.textContent = win.correct ? 'KASAYI AÇTI' : 'EN ÇOK TAMBUR';
					}, 0);
				};
				run();
			},
			destroy() {
				cleanup();
			},
		};
		function cleanup() {
			alive = false;
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
			for (const t of timers) clearTimeout(t);
			timers.clear();
			clearTimeout(introT);
			ro?.disconnect();
			offOpen?.();
		}
	},
	joker(id, v, R) {
		const n = v.n;
		const a = hedefStr(v);
		if (id === 'yari') {
			// en çok işe yarayan basamak: 3–4 tamburda sondan bir önceki (onyıl), 2 tamburda son
			const k = n >= 3 ? n - 2 : n - 1;
			return { kind: 'acik', k, d: Number(a[k]) };
		}
		if (id === 'kahin') {
			// kalabalık sayıca yakın bir şifre söyler (zorlukla açılır); tam isabet de olabilir
			const sig = Math.max(1, Math.abs(v.hedef) * (0.008 + 0.012 * (v.q.diff || 2)));
			const x = clamp(Math.round(v.hedef + gauss(R) * sig), 10 ** (n - 1), 10 ** n - 1);
			return { kind: 'kalabalik', c: String(x).padStart(n, '0') };
		}
		return null;
	},
	/** Çevrimiçi görünüm: cevap (v.hedef) ve not yok; tambur sayısı kalır. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.hedef;
		delete o.q.ans;
		delete o.q.not;
		return o;
	},
	judge(v, value) {
		const y = yokla(v, value);
		if (!y) return { correct: false, err: v.n + 1 };
		return { correct: y.open, err: v.n - y.lead + 0.5 * y.hint + 0.49 * (y.dist / 10 ** v.n) };
	},
	bot(v, skill, R) {
		const n = v.n;
		const ans = v.hedef;
		const d = v.q.diff || 2;
		const lo = 10 ** (n - 1);
		const hi = 10 ** n - 1;
		const know = R() < pCorrect(skill, d) * 0.8 + 0.04;
		let x = ans;
		if (!know) {
			// yanılgı: sayıca yakın ama tam değil (acemi daha geniş savrulur)
			const sig = Math.max(1.2, Math.abs(ans) * (0.012 + 0.022 * d) * (1.35 - skill) + 3 * (1.3 - skill));
			for (let t = 0; t < 10 && x === ans; t++) x = Math.round(ans + gauss(R) * sig);
			if (x === ans) x = ans + (R() < 0.5 ? -1 : 1);
			x = clamp(x, lo, hi);
			if (x === ans) x = ans === hi ? ans - 1 : ans + 1;
		}
		let c = String(x).padStart(n, '0');
		const h = [];
		// stetoskop: emin olmayan bot bazen dinler (acemi daha sık); ilk yanlış tamburu dinler, çoğu kez düzeltir
		if (!know && R() < 0.16 + 0.24 * (1 - skill)) {
			const a = String(ans).padStart(n, '0');
			let k = 0;
			while (k < n && c[k] === a[k]) k++;
			if (k < n) {
				h.push(k);
				if (R() < 0.5 + 0.3 * skill) c = c.slice(0, k) + a[k] + c.slice(k + 1);
			}
		}
		return { value: { c, h }, time: botTime(v, R, skill, 0.12, 0.92) };
	},
	/** Sınama örneği (test/deneme.test.mjs): doğru şifre ve ilk tamburu yanlış şifre. */
	ornek(v) {
		const a = hedefStr(v);
		const bad = String((Number(a[0]) % 9) + 1) + a.slice(1);
		return { good: { c: a, h: [] }, bad: { c: bad === a ? '9' + a.slice(1) : bad, h: [] } };
	},
};
