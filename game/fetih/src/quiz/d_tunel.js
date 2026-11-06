// ZAMAN TÜNELİ (yeni 5 · tam ekran): dikey bir zaman tünelinde yılı belli iki çapa olay durur. Üstteki rampadan sırayla
// üç olay kartı gelir; her kartı tünelde doğru boşluğa sürükle (ya da boşluğa dokun). Doğruysa kart kilitlenir, yılı
// mekanik sayaçta hane hane dönerek açılır, tünelin rayından ışık geçer; yanlışsa kart kızarır ve gerçek yerine kayar
// (yılı yine açılır: sonraki kart ona göre yerleşir). Puan doğru yerleştirme sayısı (0–3).
//
// Sıralama tipinden farkı: liste bir kerede dizilmez. Tek kart, yılı bilinen olaylara karşı araya sokulur; yıllar adım
// adım açılır ve her kartla boşluk sayısı artar (3, 4, 5): son kart en ince ayarı ister.
//
// Veri: q: tema cümlesi, anchors: [[olay, yıl], [olay, yıl]], cards: [[olay, yıl] × 3] (veriliş sırası). Bütün yıllar
//       birbirinden farklı.
// Görünüm: anchors [{ t, y }], cards [{ t }], years [kartların yılı] (GİZLİ).
// Değer: { g: [boşluk × 3], t: [sn × 3] }: k. kartın konduğu boşluk (o anki tünelde 0..k+2, null: konmadı) ve anı. Tünelin
//        o anki hâli belirlenimci (yanlış kart da gerçek yerine kayar); judge aynı tüneli yeniden kurar.
// Tür 'closest': err = 3 − doğru (eşitlikte saat: üçüncü kart konunca cevap gider).
// Çevrimiçi: publicView kartların yılını taşımaz; her yerleştirme sunucuya sorulur (act 'yer' { k, g } → { ok, y, g }).
// Joker: yarı yarıya → her kart için yanlış boşlukların yarısı kapanır (kırmızı çarpı).

import { css, esc, pCorrect, clamp, buzz, shuffle } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, rule, stampLater, sfx, onOpen, onClose, LOOK } from './d_ortak.js';
import { clock, setTimeout, clearTimeout } from '../core/clock.js';

const N = 3; // kart sayısı
const DRAG = 1.8; // timing.js ACT.move (sürükle-bırak), ACT.tap
const TAP = 0.75;

/** k. karttan önceki tünelin yılları (artan): iki çapa + önceki kartlar (yanlış konanlar da gerçek yerinde). */
export function tunelYillari(v, k) {
	return [v.anchors[0].y, v.anchors[1].y, ...v.years.slice(0, k)].sort((a, b) => a - b);
}
/** k. kartın doğru boşluğu: o anki tünelde kendisinden eski olay sayısı. */
export function dogruBosluk(v, k) {
	const y = v.years[k];
	return tunelYillari(v, k).filter((x) => x < y).length;
}
/** Değerin kart kart sonucu: marks[k] = true (doğru), false (yanlış), null (konmadı). */
export function puan(v, value) {
	const g = Array.isArray(value?.g) ? value.g : [];
	const marks = v.years.map((_, k) => (Number.isInteger(g[k]) && g[k] >= 0 && g[k] <= k + 2 ? g[k] === dogruBosluk(v, k) : null));
	return { ok: marks.filter((m) => m === true).length, marks };
}

// tünel: kaybolma noktası (üstte, geçmiş) ve ışınlar duran bir SVG; halkalar ve ışık çizgileri HTML katmanları, yalnız
// transform/opacity ile canlanır (çizim her karede yenilenmez: telefonda ve yazılım GL'de ucuz)
const RINGS = 7;
function tunnelSVG() {
	const rays = [8, 22, 36, 64, 78, 92].map((x) => `<line x1="50" y1="9" x2="${x}" y2="100"/>`).join('');
	return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
		<defs><radialGradient id="tnVp" cx=".5" cy=".09" r=".5"><stop offset="0" stop-color="#d9b8ff" stop-opacity=".55"/><stop offset=".3" stop-color="#7a5cff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
		<rect width="100" height="100" fill="url(#tnVp)"/>
		<g class="tn-rays">${rays}</g>
	</svg>${Array.from({ length: RINGS }, (_, i) => `<i class="tn-ring" style="--i:${i}"></i>`).join('')}${[-62, -38, -20, 20, 38, 62, -78, 78, -50, 50]
		.map((a, i) => `<i class="tn-st" style="--r:${90 + a}deg;--i:${i}"><b></b></i>`)
		.join('')}`;
}
/** Kaybolma noktasındaki saat kadranı: kartlar kilitlenince akrep ve yelkovan hızla döner. */
function clockSVG() {
	const ticks = Array.from({ length: 12 }, (_, i) => {
		const a = (i * Math.PI) / 6;
		const r0 = i % 3 ? 15.5 : 13.5;
		return `<line x1="${(20 + Math.sin(a) * r0).toFixed(2)}" y1="${(20 - Math.cos(a) * r0).toFixed(2)}" x2="${(20 + Math.sin(a) * 17.5).toFixed(2)}" y2="${(20 - Math.cos(a) * 17.5).toFixed(2)}"/>`;
	}).join('');
	return `<svg class="tn-clock" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" class="tn-cf"/><g class="tn-tk">${ticks}</g>
		<line class="tn-hh" x1="20" y1="20" x2="20" y2="10.5"/><line class="tn-mh" x1="20" y1="20" x2="20" y2="5.5"/><circle cx="20" cy="20" r="2.2" fill="#ffd25a"/></svg>`;
}

const CHECK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4.5 12.5l5 5 10-11' fill='none' stroke='%23fff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";
const CROSS = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 6l12 12M18 6 6 18' fill='none' stroke='%23fff' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E";
const ANCHOR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 4.2a2 2 0 1 0 0 .1M12 6.4V20M7 10h10M4.5 13.5c0 4 3.3 6.5 7.5 6.5s7.5-2.5 7.5-6.5' fill='none' stroke='%231a1200' stroke-width='2.6' stroke-linecap='round'/%3E%3C/svg%3E";

const CSS = /* css */ `
/* ZAMAN TÜNELİ: üstte kart rampası (veriliş sırası, rakiplerin ilerleyişi), altında neon tünel. Tünel derinliği: kaybolma
   noktası üstte (geçmiş), halkalar izleyiciye akar; solda ışıklı ray, raydaki her istasyonda bir olay plakası (yıl sayacı +
   ad). Boşluk düğmeleri saydam ve plakaların altında (plaka dokunuşu geçirir): her boşluk komşu iki plakanın ortasına dek
   uzanır, en kısa ekranda da en az 40 px. Satır yerleri JS'te (çeviri), tünelin boyu baştan beş olaya göre ayrılır. */
.fl-q.t-tunel .fl-qbody{padding-top:8px}
/* bildirim (joker, "kalmadı") tam ekran kartın başlığının yerine oturur: başlık o an söner (arayüzün kural göstergesiyle aynı yol) */
.fl-ui.toaston .fl-q.t-tunel .fl-cvt{opacity:0;transition:opacity .15s}
.yn-tn{--rh:46px;--gp:10px;--ep:30px;--rx:40px;position:relative;flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:10px;user-select:none;-webkit-user-select:none}
/* rampa */
.tn-dock{position:relative;z-index:5;flex:none;display:flex;flex-direction:column;gap:6px}
.tn-dh{display:flex;align-items:center;gap:8px;min-height:22px}
.tn-step{flex:none;display:flex;align-items:baseline;gap:4px;padding:3px 10px 2px 8px;font:italic 900 12px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.14em;color:#1a1200;
  background:linear-gradient(180deg,#ffe08a,#f0b43a);clip-path:polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%);box-shadow:inset 0 -2px 0 rgba(0,0,0,.18)}
.tn-step b{font-size:16px;letter-spacing:.02em}
.tn-step i{font-style:normal;opacity:.7}
.tn-pips{display:flex;gap:4px}
.tn-pips i{width:16px;height:6px;border-radius:3px;background:rgba(255,255,255,.18);transition:background .3s,box-shadow .3s}
.tn-pips i.on{background:#ffd25a;box-shadow:0 0 8px rgba(255,210,90,.7)}
.tn-pips i.ok{background:#46e0ff;box-shadow:0 0 8px rgba(70,224,255,.7)}
.tn-pips i.no{background:#ff5a4a}
.tn-race{margin-left:auto;display:flex;gap:8px}
.tn-rv{display:flex;align-items:center;gap:4px}
.tn-rv .tn-av{width:20px;height:20px;border-radius:6px}
.tn-rv u{display:flex;gap:2px;text-decoration:none}
.tn-rv u i{width:5px;height:12px;border-radius:2px;background:rgba(255,255,255,.18);transition:background .25s}
.tn-rv u i.on{background:var(--pc)}
.tn-slot{position:relative;height:60px;border-radius:12px;background:repeating-linear-gradient(135deg,rgba(255,255,255,.05) 0 8px,transparent 8px 16px);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.12)}
.tn-card{position:absolute;inset:0;display:flex;align-items:center;gap:11px;padding:0 12px 0 10px;border-radius:12px;touch-action:none;cursor:grab;
  background:linear-gradient(180deg,#fffaf0,#efe4c8);color:#1a1f3a;box-shadow:0 2px 0 #d9c9a2,0 4px 0 #b9a47a,0 12px 22px rgba(0,0,0,.5);will-change:transform}
.tn-card::before{content:'';position:absolute;left:-1px;top:8px;bottom:8px;width:6px;background:radial-gradient(circle,#0b0f22 2.2px,transparent 2.6px) 50% 0/6px 9px repeat-y}
.tn-card::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(105deg,transparent 0 38%,rgba(255,255,255,.75) 48%,transparent 58% 100%) no-repeat;
  background-size:220% 100%;background-position:130% 0;animation:tnShine 3.6s ease-in-out 1.2s infinite}
.tn-card .tn-yr i:not(.set){color:#ffd25a;text-shadow:0 0 8px rgba(255,210,90,.75)}
.tn-slot::before{content:'';position:absolute;inset:-3px;border-radius:15px;box-shadow:0 0 0 1.5px rgba(255,210,90,.35),0 0 18px rgba(255,210,90,.22);pointer-events:none}
.tn-card.in{animation:tnIn .42s cubic-bezier(.3,1.5,.5,1) both}
.tn-where{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 10px;opacity:0;transition:opacity .15s;pointer-events:none;
  font:italic 900 15px/1 'Barlow Condensed',sans-serif;letter-spacing:.12em;color:#ffd25a;text-shadow:0 0 10px rgba(255,210,90,.55);white-space:nowrap}
.tn-where b{color:#fff;font-size:18px}
.yn-tn.drag .tn-where{opacity:1}
.tn-card.lift{cursor:grabbing;transition:none;box-shadow:0 2px 0 #d9c9a2,0 4px 0 #b9a47a,0 22px 34px rgba(0,0,0,.6),0 0 0 3px #ffd25a}
.tn-card.back{transition:transform .32s cubic-bezier(.3,1.4,.5,1)}
.tn-card.gone{visibility:hidden}
.tn-card .tn-yr{flex:none;font-size:22px}
.tn-card .tn-yr i{color:#ffd25a}
.tn-card .tn-nm{flex:1 1 auto;min-width:0;font:400 19px/1.08 'Lilita One',sans-serif;letter-spacing:.01em;color:#1a1f3a}
.tn-grip{flex:none;width:14px;height:24px;background:radial-gradient(circle,rgba(26,31,58,.45) 1.6px,transparent 2px) 0 0/7px 8px}
.tn-hint{flex:none;display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:2px 7px;text-align:center;font:600 12.5px/1.25 'Fredoka',sans-serif;color:#b8c2e6}
.tn-hint .o,.tn-hint .n{display:inline-flex;align-items:center;gap:3px;padding:2px 7px 1px;font:italic 900 12.5px/1 'Barlow Condensed',sans-serif;letter-spacing:.12em;color:#fff;
  clip-path:polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)}
.tn-hint .o{background:linear-gradient(180deg,#9a6bff,#6a3fd8)}
.tn-hint .n{background:linear-gradient(180deg,#3fd6ff,#1a8fd0)}
.tn-hint .o::before,.tn-hint .n::after{content:'';width:0;height:0;border:4px solid transparent}
.tn-hint .o::before{border-bottom:6px solid #fff;border-top:0}
.tn-hint .n::after{border-top:6px solid #fff;border-bottom:0}
.tn-hint em{font-style:normal;color:#ffd25a;font-weight:700}
.tn-hint .t{flex:1 0 100%;color:#9fabd6}
/* yıl sayacı: dört hane, ortadan bölünmüş pencere (döner levha) */
.tn-yr{display:flex;gap:2px;font:italic 900 20px/1 'Barlow Condensed','Lilita One',sans-serif}
.tn-yr i{display:block;width:.64em;padding:.12em 0 .1em;text-align:center;font-style:normal;color:#fff;border-radius:3px;
  background:linear-gradient(180deg,#232a4a 0 48%,#05070f 48% 52%,#161b34 52% 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 0 rgba(0,0,0,.45)}
.tn-yr i.spin{color:#9fe8ff;animation:tnFlip .09s linear infinite}
.tn-yr i.set{animation:tnSet .32s cubic-bezier(.3,1.8,.5,1)}
/* tünel */
.tn-tube{position:relative;flex:1 1 auto;min-height:calc(5 * var(--rh) + 4 * var(--gp) + 2 * var(--ep));border-radius:16px;overflow:hidden;
  background:radial-gradient(120% 70% at 50% 0%,#24124a 0%,#0c0a24 55%,#05060f 100%);box-shadow:inset 0 0 0 1.5px rgba(150,120,255,.28),inset 0 -20px 40px rgba(0,0,0,.5),0 12px 26px rgba(0,0,0,.5)}
.tn-bg{position:absolute;inset:0;z-index:0;pointer-events:none}
.tn-bg>svg:first-child{position:absolute;inset:0;width:100%;height:100%}
.tn-rays line{stroke:rgba(150,140,255,.11);stroke-width:.35;vector-effect:non-scaling-stroke}
/* halka: tünelin çerçevesi kaybolma noktasından büyüyerek gelir (renk sırayla mor, mavi, camgöbeği) */
.tn-ring{position:absolute;inset:2%;border-radius:9%;box-shadow:inset 0 0 0 2px var(--rc,#8a6bff),0 0 12px color-mix(in srgb,var(--rc,#8a6bff) 55%,transparent);
  transform-origin:50% 9%;opacity:0;will-change:transform,opacity;animation:tnRing 5.6s linear infinite;animation-delay:calc(var(--i) * -.8s)}
.tn-ring:nth-of-type(3n+1){--rc:#b86bff}.tn-ring:nth-of-type(3n+2){--rc:#5a8cff}.tn-ring:nth-of-type(3n){--rc:#46e0ff}
.tn-tube.warp .tn-ring{animation-duration:1.4s}
/* ışık çizgisi: kaybolma noktasından kendi açısıyla dışa kayan kısa parıltı */
.tn-st{position:absolute;left:50%;top:9%;width:0;height:0;transform:rotate(var(--r))}
.tn-st b{position:absolute;left:0;top:-1px;width:26px;height:2px;border-radius:1px;background:linear-gradient(90deg,rgba(220,230,255,0),rgba(230,240,255,.9));
  opacity:0;will-change:transform,opacity;animation:tnSt 2.6s linear infinite;animation-delay:calc(var(--i) * -.27s)}
.tn-tube.warp .tn-st b{animation-duration:.7s}
.tn-bg .tn-clock{position:absolute;z-index:0;left:50%;top:calc(9% - 17px);width:34px;height:34px;margin-left:-17px;pointer-events:none;filter:drop-shadow(0 0 6px rgba(190,150,255,.8))}
.tn-cf{fill:rgba(16,10,40,.85);stroke:#b88bff;stroke-width:1.6}
.tn-tk line{stroke:#d9c6ff;stroke-width:1.4;stroke-linecap:round}
.tn-hh,.tn-mh{stroke:#ffd25a;stroke-width:2.4;stroke-linecap:round;transform-origin:20px 20px}
.tn-mh{stroke:#fff;stroke-width:1.6;animation:tnHand 12s linear infinite}
.tn-hh{animation:tnHand 144s linear infinite}
.tn-tube.warp .tn-mh{animation-duration:.6s}
.tn-tube.warp .tn-hh{animation-duration:4s}
.tn-tube.flash{animation:tnFlash .7s ease-out}
.tn-tube.flash.no{animation:tnFlashNo .7s ease-out}
.tn-rail{position:absolute;z-index:1;left:18px;top:12px;bottom:12px;width:4px;border-radius:2px;background:linear-gradient(180deg,#b86bff,#5a8cff 55%,#46e0ff);
  box-shadow:0 0 10px rgba(120,140,255,.75);overflow:hidden}
.tn-rail::after{content:'';position:absolute;left:0;right:0;top:0;height:30%;background:linear-gradient(180deg,transparent,rgba(255,255,255,.95),transparent);will-change:transform;animation:tnFlow 2.4s linear infinite}
/* uç levhaları: tünelin tepesi ESKİ (geçmiş, mor), dibi YENİ (bugün, camgöbeği); oklar zamanın yönünü gösterir. Plakalar
   --ep payının içine hiç girmez: levha onlara binmez */
.tn-end{position:absolute;z-index:1;right:10px;display:flex;align-items:center;gap:6px;height:18px;padding:0 10px 0 8px;pointer-events:none;
  font:italic 900 14px/1 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:#fff;clip-path:polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)}
.tn-end small{font-size:10px;letter-spacing:.2em;opacity:.78}
.tn-end::before{content:'';width:0;height:0;border:5px solid transparent}
.tn-end.top{top:6px;background:linear-gradient(180deg,rgba(150,100,255,.95),rgba(98,58,210,.95));box-shadow:0 0 14px rgba(150,100,255,.55)}
.tn-end.top::before{border-bottom:7px solid #fff;border-top:0;margin-top:-2px}
.tn-end.bot{bottom:6px;background:linear-gradient(180deg,rgba(60,214,255,.95),rgba(24,140,206,.95));box-shadow:0 0 14px rgba(60,214,255,.5)}
.tn-end.bot::before{border-top:7px solid #fff;border-bottom:0;margin-bottom:-2px}
.tn-gaps,.tn-items{position:absolute;inset:0}
.tn-gaps{z-index:2}
.tn-items{z-index:3;pointer-events:none}
.tn-gap{position:absolute;left:0;right:0;margin:0;padding:0;border:0;background:none;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.tn-gap:disabled{cursor:default}
.tn-node{position:absolute;left:9px;top:var(--ny);width:22px;height:22px;margin-top:-11px;border-radius:50%;background:#0c0f24;box-shadow:0 0 0 2px #ffd25a,0 0 12px rgba(255,210,90,.55);
  transition:transform .2s,opacity .2s,box-shadow .2s;pointer-events:none}
.tn-node::before,.tn-node::after{content:'';position:absolute;left:50%;top:50%;width:10px;height:2.6px;margin:-1.3px 0 0 -5px;border-radius:2px;background:#ffd25a}
.tn-node::after{transform:rotate(90deg)}
.tn-line{position:absolute;left:var(--rx);right:10px;top:var(--ny);height:0;border-top:2px dashed rgba(255,210,90,.35);opacity:0;transition:opacity .2s;pointer-events:none}
.tn-gap.hot .tn-node,.tn-gap:active .tn-node{transform:scale(1.25);box-shadow:0 0 0 2.5px #fff,0 0 18px rgba(255,210,90,.9)}
.tn-gap.hot .tn-line,.tn-gap:active .tn-line{opacity:1}
.tn-gaps.nudge .tn-node{animation:tnNudge .5s ease-in-out 2}
.tn-gaps.nudge .tn-line{opacity:.8;transition:opacity .2s}
.tn-gap.cut .tn-node{box-shadow:0 0 0 2px #ff5a4a;background:#2a0c10}
.tn-gap.cut .tn-node::before,.tn-gap.cut .tn-node::after{background:#ff5a4a;transform:rotate(45deg)}
.tn-gap.cut .tn-node::after{transform:rotate(-45deg)}
.yn-tn.drag .tn-node,.yn-tn.busy .tn-node,.yn-tn.over .tn-node{opacity:0}
.tn-ghost{position:absolute;z-index:2;left:var(--rx);right:8px;top:0;height:var(--rh);border-radius:10px;border:2px dashed #ffd25a;background:rgba(255,210,90,.08);opacity:0;transition:opacity .15s,transform .2s;pointer-events:none}
.tn-ghost.on{opacity:1}
.tn-ghost{display:flex;align-items:center;justify-content:center;gap:8px;font:italic 900 13px/1 'Barlow Condensed',sans-serif;letter-spacing:.12em;color:#ffd25a;text-shadow:0 0 10px rgba(255,210,90,.6);
  box-shadow:0 0 18px rgba(255,210,90,.25),inset 0 0 18px rgba(255,210,90,.12)}
.tn-ghost b{font-weight:900;color:#fff}
/* ilk hamle öğreticisi: parlayan bir parmak izi karttan tünele iner (hedef boşluk göstermez: hep tünelin ortası) */
.tn-tut{position:absolute;z-index:6;left:50%;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;pointer-events:none;opacity:0;
  background:radial-gradient(circle,rgba(255,255,255,.95) 0 28%,rgba(255,210,90,.55) 32%,rgba(255,210,90,0) 70%);box-shadow:0 0 0 2px rgba(255,255,255,.85);
  animation:tnTut 1.7s cubic-bezier(.45,0,.3,1) 2 forwards}
/* poll (seyirci): boşluk düğmesi oy yüzdesine döner, en çok oy alan altın */
.tn-gap.poll .tn-node{left:3px;width:calc(var(--rx) - 7px);height:18px;margin-top:-9px;border-radius:9px;display:grid;place-items:center;
  font:italic 900 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.02em;color:#ffe7a0;box-shadow:0 0 0 1.5px rgba(255,210,90,.75)}
.tn-gap.poll .tn-node::before,.tn-gap.poll .tn-node::after{display:none}
.tn-gap.poll.top .tn-node{background:#ffd25a;color:#1a1200;box-shadow:0 0 0 2px #fff,0 0 14px rgba(255,210,90,.9)}
.tn-gap.poll.cut .tn-node{font-size:0}
.tn-gap.poll.cut .tn-node::before,.tn-gap.poll.cut .tn-node::after{display:block;left:50%;width:10px;margin-left:-5px}
/* kilit anı: yılın dev gölgesi tünelin derinliğinden geçip söner (arka katman; bitince kaldırılır) */
.tn-big{position:absolute;z-index:0;left:0;right:0;top:46%;text-align:center;pointer-events:none;font:italic 900 86px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.04em;
  color:transparent;-webkit-text-stroke:1.5px rgba(150,230,255,.55);animation:tnBig 1.1s cubic-bezier(.2,.8,.3,1) forwards}
.tn-big.no{-webkit-text-stroke-color:rgba(255,140,120,.6)}
/* plaka */
.tn-it{position:absolute;left:var(--rx);right:8px;top:0;height:var(--rh);display:flex;align-items:center;gap:9px;padding:0 9px 0 7px;border-radius:10px;
  background:linear-gradient(180deg,rgba(32,38,78,.96),rgba(18,22,50,.96));box-shadow:inset 0 0 0 1.5px rgba(160,170,255,.28),0 6px 14px rgba(0,0,0,.4);
  transition:transform .4s cubic-bezier(.3,1.25,.45,1),box-shadow .3s,background .3s;will-change:transform}
.tn-it .tn-nm{flex:1 1 auto;min-width:0;font:600 15px/1.1 'Fredoka',sans-serif;color:#eef2ff}
.tn-dot{position:absolute;left:calc(-1 * var(--rx) + 12px);top:50%;width:16px;height:16px;margin-top:-8px;border-radius:50%;background:#c9d4ff;box-shadow:0 0 0 3px #0c0f24,0 0 10px rgba(200,210,255,.8)}
.tn-it.a{background:linear-gradient(180deg,rgba(60,48,18,.96),rgba(34,26,10,.96));box-shadow:inset 0 0 0 1.5px rgba(255,210,90,.55),0 6px 14px rgba(0,0,0,.4)}
.tn-it.a .tn-dot{background:#ffd25a;box-shadow:0 0 0 3px #0c0f24,0 0 12px rgba(255,210,90,.9)}
.tn-it.a .tn-yr i{color:#ffe7a0}
.tn-it.a::after{content:'';flex:none;width:16px;height:16px;opacity:.85;background:#ffd25a url("${ANCHOR}") 50% 50%/12px no-repeat;border-radius:50%}
.tn-it.c.ok{background:linear-gradient(180deg,rgba(16,96,120,.97),rgba(8,44,66,.97));box-shadow:inset 0 0 0 2.5px #46e0ff,0 0 22px rgba(70,224,255,.6),0 6px 14px rgba(0,0,0,.4)}
.tn-it.c.ok::after,.tn-it.c.no::after{content:'';flex:none;width:20px;height:20px;border-radius:50%;background:#1fb85a url("${CHECK}") 50% 50%/13px no-repeat;box-shadow:0 0 0 2px rgba(255,255,255,.85)}
.tn-it.c.no::after{background:#e8343c url("${CROSS}") 50% 50%/11px no-repeat}
.yn-tn.rv .tn-it.c::after{display:none}
.tn-it.c.ok .tn-dot{background:#46e0ff;box-shadow:0 0 0 3px #0c0f24,0 0 14px #46e0ff}
.tn-it.c.no{background:linear-gradient(180deg,rgba(120,26,34,.97),rgba(64,12,18,.97));box-shadow:inset 0 0 0 2.5px #ff5a4a,0 0 20px rgba(255,90,74,.55),0 6px 14px rgba(0,0,0,.4)}
.tn-it.c.no .tn-dot{background:#ff5a4a;box-shadow:0 0 0 3px #0c0f24,0 0 14px #ff5a4a}
.tn-it.c.no .tn-yr i{color:#ffb4aa}
.tn-it.c.miss{background:linear-gradient(180deg,rgba(40,44,70,.96),rgba(24,26,44,.96));box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35),0 6px 14px rgba(0,0,0,.4)}
/* giriş: çapalar kaybolma noktasından (geçmişin derinliğinden) yuvalarına uçar (transform yerleşim için: translate/scale ayrı) */
.tn-it.enter{animation:tnEnter .75s cubic-bezier(.2,.9,.3,1.15) both;animation-delay:calc(var(--o) * 140ms)}
.tn-it.shake{animation:tnShake .42s}
.tn-it.mv{z-index:2;transition:transform .55s cubic-bezier(.45,0,.3,1),box-shadow .3s;box-shadow:inset 0 0 0 2.5px #ff5a4a,0 0 26px rgba(255,90,74,.7),0 16px 26px rgba(0,0,0,.6)}
.tn-it.land .tn-dot::after{content:'';position:absolute;inset:-4px;border-radius:50%;border:3px solid currentColor;animation:tnShock .7s ease-out forwards}
.tn-it.c.ok.land .tn-dot{color:#46e0ff}.tn-it.c.no.land .tn-dot{color:#ff5a4a}
.tn-it.sweep{animation:tnSweep .55s ease-out both;animation-delay:calc(var(--o) * 110ms)}
.tn-beam{position:absolute;z-index:1;left:14px;width:12px;height:var(--rh);border-radius:6px;background:radial-gradient(closest-side,rgba(255,255,255,.95),rgba(70,224,255,.6) 45%,rgba(70,224,255,0));
  pointer-events:none;animation:tnBeam .8s ease-out forwards}
.tn-beam.no{background:radial-gradient(closest-side,rgba(255,240,240,.95),rgba(255,90,74,.6) 45%,rgba(255,90,74,0))}
/* cevap: rampa damga bandına döner; kart plakalarında oyuncuların portreleri (doğru/yanlış rozetli) */
.tn-vd{display:none;flex:none;height:62px}
.yn-tn.rv .tn-vd,.yn-tn.vd .tn-vd{display:block}
.yn-tn.rv .tn-dock,.yn-tn.vd .tn-dock{display:none}
.tn-who{flex:none;display:grid;grid-auto-flow:column;grid-template-rows:auto;gap:3px 4px}
.tn-who.n3,.tn-who.n4{grid-template-rows:auto auto;grid-auto-columns:min-content}
.tn-av{position:relative;width:22px;height:22px;border-radius:7px;box-shadow:0 0 0 2px var(--pc),0 2px 0 rgba(0,0,0,.4);overflow:visible}
.tn-av .fl-av{display:block;width:100%;height:100%;border:0;border-radius:7px;box-shadow:none;transform:none;overflow:hidden}
.tn-who .tn-av{animation:tnPop .35s cubic-bezier(.3,1.8,.5,1) both;animation-delay:calc(var(--o) * 70ms + .5s)}
.tn-who .tn-av::after{content:'';position:absolute;right:-5px;bottom:-5px;width:13px;height:13px;border-radius:50%;box-shadow:0 0 0 1.5px #0c0f24}
.tn-who .tn-av.ok::after{background:#1fb85a url("${CHECK}") 50% 50%/9px no-repeat}
.tn-who .tn-av.no::after{background:#e8343c url("${CROSS}") 50% 50%/8px no-repeat}
.tn-who .tn-av.none{opacity:.45}
.tn-who .tn-av.me{box-shadow:0 0 0 2px #ffd25a,0 0 9px rgba(255,210,90,.7),0 2px 0 rgba(0,0,0,.4)}
.yn-tn.rv.pm{--rh:54px}
.yn-tn.rv.pm .tn-who{gap:2px 3px;margin-right:2px}
.yn-tn.rv.pm .tn-av{width:20px;height:20px;border-radius:6px}
.yn-tn.rv.pm .tn-who .tn-av::after{width:11px;height:11px;right:-4px;bottom:-4px;background-size:7px}
@keyframes tnIn{0%{transform:translateY(-22px) rotate(-3deg);opacity:0}100%{transform:none;opacity:1}}
@keyframes tnFlip{0%{transform:scaleY(1)}50%{transform:scaleY(.25)}100%{transform:scaleY(1)}}
@keyframes tnSet{0%{transform:scale(1.5);color:#fff}100%{transform:none}}
@keyframes tnRing{0%{transform:scale(.06);opacity:0}12%{opacity:.75}70%{opacity:.4}100%{transform:scale(1.5);opacity:0}}
@keyframes tnFlow{0%{transform:translateY(-100%)}100%{transform:translateY(340%)}}
@keyframes tnSt{0%{transform:translateX(8px) scaleX(.3);opacity:0}15%{opacity:.85}100%{transform:translateX(260px) scaleX(1.6);opacity:0}}
@keyframes tnHand{to{transform:rotate(360deg)}}
@keyframes tnFlash{0%{box-shadow:inset 0 0 0 2px #46e0ff,inset 0 0 60px rgba(70,224,255,.55),0 12px 26px rgba(0,0,0,.5)}}
@keyframes tnFlashNo{0%{box-shadow:inset 0 0 0 2px #ff5a4a,inset 0 0 60px rgba(255,90,74,.5),0 12px 26px rgba(0,0,0,.5)}}
@keyframes tnShake{20%{margin-left:-7px}40%{margin-left:7px}60%{margin-left:-5px}80%{margin-left:4px}}
@keyframes tnShock{0%{transform:scale(.6);opacity:1}100%{transform:scale(3.2);opacity:0}}
@keyframes tnSweep{0%{filter:brightness(1)}35%{filter:brightness(1.9) saturate(1.3)}100%{filter:none}}
@keyframes tnBeam{0%{transform:scaleY(1);opacity:1}100%{transform:scaleY(9);opacity:0}}
@keyframes tnEnter{0%{translate:0 -60%;scale:.3;opacity:0;filter:brightness(2.4)}55%{opacity:1}100%{translate:0 0;scale:1;opacity:1;filter:none}}
@keyframes tnNudge{50%{transform:scale(1.35);box-shadow:0 0 0 2.5px #fff,0 0 20px rgba(255,210,90,1)}}
@keyframes tnShine{0%{background-position:130% 0}45%,100%{background-position:-30% 0}}
@keyframes tnTut{0%{transform:translateY(var(--y0)) scale(.6);opacity:0}15%{transform:translateY(var(--y0)) scale(1);opacity:1}75%{transform:translateY(var(--y1)) scale(1);opacity:1}100%{transform:translateY(var(--y1)) scale(1.5);opacity:0}}
@keyframes tnBig{0%{transform:translateY(-50%) scale(2.2);opacity:0}25%{opacity:1}100%{transform:translateY(-50%) scale(1);opacity:0}}
@keyframes tnPop{0%{transform:scale(.3);opacity:0}100%{transform:none;opacity:1}}
@media (max-height:720px){
  .yn-tn{--rh:38px;--gp:6px;--ep:27px;gap:8px}
  .tn-dock{gap:5px}
  .tn-slot{height:50px}
  .tn-card .tn-nm{font-size:17px}
  .tn-hint .t{display:none}
  .tn-it .tn-nm{font-size:14px}
  .tn-yr{font-size:18px}
  .tn-vd{height:54px}
  .yn-tn.rv.pm{--rh:48px}
}
@media (max-height:600px){
  /* en kısa ekran (320×568): tünele yer: soru yazısı ve kural satırı (dar kartta kendi satırı) kalkar */
  .fl-q.t-tunel .fl-qtext,.fl-q.t-tunel .fl-qhead .fl-rule{display:none}
  .fl-q.t-tunel .fl-tbar{margin-bottom:4px}
  .yn-tn{--rh:32px;--gp:4px;--ep:23px;--rx:36px;gap:5px}
  .fl-q.t-tunel .fl-qbody{padding-top:6px}
  .tn-dock{gap:4px}
  .tn-dh{min-height:16px}
  .tn-step{font-size:12px}.tn-step b{font-size:15px}
  .tn-slot{height:44px}
  .tn-card{gap:8px}
  .tn-card .tn-yr{font-size:17px}
  .tn-card .tn-nm{font-size:16px}
  .tn-it{gap:7px;padding:0 7px 0 6px}
  .tn-it .tn-nm{font-size:13px;line-height:1.05}
  .tn-yr{font-size:16px}
  .tn-node{left:7px;width:20px;height:20px;margin-top:-10px}
  .tn-rail{left:16px}
  .tn-end{height:16px;font-size:12.5px;gap:5px}.tn-end small{display:none}.tn-end.top{top:4px}.tn-end.bot{bottom:4px}
  .tn-hint{font-size:11.5px}.tn-hint .o,.tn-hint .n{font-size:11.5px;padding:1px 6px 0}
  .tn-vd{height:50px}
  .tn-av{width:19px;height:19px}
  .yn-tn.rv.pm{--rh:44px}
  .yn-tn.rv.pm .tn-av{width:18px;height:18px}
}
@media (prefers-reduced-motion:reduce){.tn-ring,.tn-rail::after,.tn-st b,.tn-mh,.tn-hh,.tn-it.enter,.tn-card::after{animation:none}.tn-tut{display:none}.tn-ring{opacity:.25;transform:scale(calc(.3 + var(--i) * .15))}}
`;

const pad4 = (y) => String(y).padStart(4, ' ');
const digits = (y, cls = '') => [...pad4(y)].map((d) => `<i class="${cls}">${esc(d)}</i>`).join('');
const QMARK = '<i>?</i><i>?</i><i>?</i><i>?</i>';

export const tunel = {
	time: 38,
	label: 'Zaman Tüneli',
	kind: 'closest',
	cover: true, // tam ekran neon tünel (harita gizli): beş istasyonlu dikey tünel telefonun boyunu ister
	calm: true, // harita arkada durgun (klasik tiplerle aynı işaret)
	keep: true,
	stampAt: '.tn-vd', // cevap damgası rampanın yerinde (sorunun alanı), tünele ve plakalara binmez
	rule: 'En çok doğru',
	birinci: 'TÜNELİN USTASI SEN!', // sonuç ekranı (ui.js): "EN YAKIN" yerine tipin sözcükleri
	ustun: 'seni geçti', // eşit doğruda hızlı olan önde: "daha çok" demez
	rozet: 'EN ÇOK DOĞRU',
	revealMs: 4200,
	jokers: ['yari', 'kahin'],
	fmt: (v, value) => `${puan(v, value).ok}/${N} doğru`,
	sub: (v, value) => {
		const s = puan(v, value);
		const put = s.marks.filter((m) => m != null).length;
		if (!put) return 'kart koymadı';
		if (s.ok === N) return 'kusursuz tünel';
		return put < N ? `${N - put} kart konmadı` : `${N - s.ok} kart kaydı`;
	},
	prepare(q) {
		const anchors = q.anchors.map(([t, y]) => ({ t: String(t), y: Number(y) }));
		const cards = q.cards.map(([t]) => ({ t: String(t) }));
		const { anchors: _a, cards: _c, ...pub } = q;
		const v = { q: pub, anchors, cards, years: q.cards.map(([, y]) => Number(y)) };
		return stamp(v, q, (q2, k, P, text) => {
			for (const a of anchors) {
				text(a.t);
				text(String(a.y));
			}
			for (const c of cards) text(c.t);
			let look = LOOK.orient + 2 * LOOK.gaze;
			for (let i = 0; i < N; i++) look += LOOK.gaze + (2 + i) * 0.14; // kartı oku, büyüyen tüneli tara
			return {
				wait: 0.5 + N * 0.85, // her yerleştirmenin kilit canlandırması (sayaç, gerçek yerine kayış)
				look,
				// yılı hatırla, komşularla karşılaştır; sonraki kartlar daha ince (boşluk sayısı artar)
				think: N * (P.think[0] + P.think[1] * k) + 0.5 * N,
				act: N * (0.6 * DRAG + 0.4 * TAP),
			};
		});
	},
	mount(el, v, api) {
		css('yeni5-tunel', CSS);
		const app = appOf();
		const card = el.closest('.fl-q');
		const avOf = (i) => card?.querySelector(`.fl-qwho .fl-qp[data-p="${i}"] .fl-av`)?.outerHTML || '<span class="fl-av"></span>';
		const cur = app?.match?.cur;
		const bots = cur?.v === v ? cur.bots || [] : [];
		el.innerHTML = `<div class="yn-tn">
			<div class="tn-vd"></div>
			<div class="tn-dock">
				<div class="tn-dh"><span class="tn-step">KART <b>1</b><i>/${N}</i></span><span class="tn-pips">${'<i></i>'.repeat(N)}</span>
					<span class="tn-race">${bots.map((b) => `<span class="tn-rv" data-p="${b.p.i}" style="--pc:${esc(b.p.css || '#888')}"><span class="tn-av">${avOf(b.p.i)}</span><u>${'<i></i>'.repeat(N)}</u></span>`).join('')}</span></div>
				<div class="tn-slot"><span class="tn-where">TÜNELE BIRAK</span><div class="tn-card" role="button" aria-label="Olay kartı: sürükle"><span class="tn-yr">${QMARK}</span><b class="tn-nm"></b><span class="tn-grip"></span></div></div>
				<div class="tn-hint"><span class="o">ESKİ</span>yukarıda<span class="n">YENİ</span>aşağıda<span class="t">Kartı <em>sürükle</em> ya da doğru boşluğa <em>dokun</em></span></div>
			</div>
			<div class="tn-tube"><div class="tn-bg">${tunnelSVG()}${clockSVG()}</div><i class="tn-rail"></i><span class="tn-end top">ESKİ<small>GEÇMİŞ</small></span><span class="tn-end bot">YENİ<small>BUGÜN</small></span>
				<div class="tn-gaps"></div><div class="tn-ghost"></div><div class="tn-items"></div></div>
		</div>`;
		rule(el, 'En çok doğru');
		const root = el.querySelector('.yn-tn');
		const tube = root.querySelector('.tn-tube');
		const itemsEl = root.querySelector('.tn-items');
		const gapsEl = root.querySelector('.tn-gaps');
		const ghost = root.querySelector('.tn-ghost');
		const whereEl = root.querySelector('.tn-where');
		const cardEl = root.querySelector('.tn-card');
		const nameEl = cardEl.querySelector('.tn-nm');
		const stepEl = root.querySelector('.tn-step b');
		const pips = [...root.querySelectorAll('.tn-pips i')];
		const timers = [];
		const later = (fn, ms) => {
			const h = setTimeout(fn, ms);
			timers.push(h);
			return h;
		};
		const fx = () => app?.ui?.fx;
		const G = new Array(N).fill(null); // değer: kart başına boşluk
		const T = new Array(N).fill(null);
		let step = 0;
		let t0 = 0;
		let done = false; // cevap gitti ya da kilitlendi
		let busy = false; // kart uçuyor / kilitleniyor
		let cut = null; // yarı yarıya: kart başına kapalı boşluklar
		let poll = null; // seyirci: kart başına boşlukların oy yüzdesi
		let settle = Promise.resolve(); // son yerleştirmenin canlandırması (cevap ekranı bunun ardından)
		const now = () => (t0 ? Math.round(((clock.now() - t0) / 1000) * 10) / 10 : 0);

		// tüneldeki olaylar (yıla göre sıralı): { t, y, kind: 'a' | 'c', k, el }
		const list = v.anchors.map((a) => ({ t: a.t, y: a.y, kind: 'a', k: -1, el: null })).sort((a, b) => a.y - b.y);
		const plate = (it, yrHTML) => {
			const e = document.createElement('div');
			e.className = `tn-it ${it.kind}`;
			e.innerHTML = `<i class="tn-dot"></i><span class="tn-yr">${yrHTML}</span><b class="tn-nm">${esc(it.t)}</b>`;
			itemsEl.appendChild(e);
			it.el = e;
			return e;
		};
		for (const it of list) plate(it, digits(it.y));

		// ---------------------------------------------------------------- yerleşim (yerel px; _coverFit ölçeğinden bağımsız)
		const geo = () => {
			const cs = getComputedStyle(root);
			return { rh: parseFloat(cs.getPropertyValue('--rh')) || 44, gp: parseFloat(cs.getPropertyValue('--gp')) || 8, ep: parseFloat(cs.getPropertyValue('--ep')) || 20, H: tube.clientHeight || 300 };
		};
		/**
		 * m olay (+ istenirse g boşluğunda bir yuva): satırların tepesi. Aralık tünele yayılır (az olayda geniş, dolunca en az
		 * --gp): tünel her an dolu görünür, erken kartlarda boşluklar da büyük.
		 */
		const lay = (m, open = -1) => {
			const { rh, gp: g0, ep, H } = geo();
			const slots = m + (open >= 0 ? 1 : 0);
			const gp = clamp((H - slots * rh - 2 * ep) / Math.max(1, slots), g0, 64);
			const total = slots * rh + Math.max(0, slots - 1) * gp;
			const top0 = Math.max(ep, (H - total) / 2);
			const ys = [];
			for (let i = 0; i < m; i++) ys.push(top0 + (i + (open >= 0 && i >= open ? 1 : 0)) * (rh + gp));
			return { ys, ghost: open >= 0 ? top0 + open * (rh + gp) : null, rh, gp, H };
		};
		let shown = -1;
		const place = (open = -1, instant = false) => {
			const L = lay(list.length, open);
			list.forEach((it, i) => {
				it.top = L.ys[i];
				if (instant) it.el.style.transition = 'none';
				it.el.style.transform = `translateY(${L.ys[i].toFixed(1)}px)`;
				if (instant) {
					void it.el.offsetWidth;
					it.el.style.transition = '';
				}
			});
			if (L.ghost != null) {
			ghost.style.transform = `translateY(${L.ghost.toFixed(1)}px)`;
			// yuvanın adı: komşu yıllarla (yılı açılmış olaylar), kart buraya düşerse ne demek
			const m = list.length;
			const yr = (it) => `<b>${esc(String(it.y))}</b>`;
			ghost.innerHTML = open === 0 ? `${yr(list[0])} ÖNCESİ` : open >= m ? `${yr(list[m - 1])} SONRASI` : `${yr(list[open - 1])} İLE ${yr(list[open])} ARASI`;
		}
		// rampadaki boş yuva sürüklerken kartın nereye düşeceğini söyler (kart parmağın altında yuvayı örter)
		whereEl.innerHTML = L.ghost != null ? ghost.innerHTML : 'TÜNELE BIRAK';
			ghost.classList.toggle('on', L.ghost != null);
			shown = open;
			return L;
		};
		/** Boşluk düğmeleri: her boşluk komşu iki plakanın ortasından ortasına (uçlarda tünelin kenarına) uzanır. */
		const gaps = () => {
			const L = lay(list.length);
			const m = list.length;
			const mid = (i) => L.ys[i] + L.rh / 2;
			const off = Math.max(L.gp / 2, 12);
			let html = '';
			for (let j = 0; j <= m; j++) {
				const top = j === 0 ? 0 : mid(j - 1);
				const bot = j === m ? L.H : mid(j);
				const ny = (j === 0 ? L.ys[0] - off : j === m ? L.ys[m - 1] + L.rh + off : (L.ys[j - 1] + L.rh + L.ys[j]) / 2) - top;
				const a = j === 0 ? `${list[0].t} öncesi` : j === m ? `${list[m - 1].t} sonrası` : `${list[j - 1].t} ile ${list[j].t} arası`;
				const isCut = !!cut?.[step]?.includes(j);
				const pv = poll?.[step];
				const pc = pv ? pv[j] ?? 0 : null;
				const top1 = pv && pc === Math.max(...pv.filter((_, g) => !cut?.[step]?.includes(g)));
				html += `<button class="tn-gap${isCut ? ' cut' : ''}${pv ? ' poll' : ''}${top1 && !isCut ? ' top' : ''}" data-g="${j}" style="top:${top.toFixed(1)}px;height:${(bot - top).toFixed(1)}px;--ny:${ny.toFixed(1)}px" aria-label="${esc(a)}${pv ? ` · seyirci %${pc}` : ''}"${isCut ? ' disabled' : ''}><i class="tn-line"></i><i class="tn-node">${pv && !isCut ? `%${pc}` : ''}</i></button>`;
			}
			gapsEl.innerHTML = html;
		};
		const refresh = () => {
			if (busy) return; // kart uçarken satırlar yerinde (uçuş bitince kendisi yerleştirir)
			place(shown, !root.classList.contains('rv'));
			if (!done && step < N) gaps();
		};
		// tünelin boyu ölçülünce (yazı tipi, sığdırma) satırlar yerine
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => refresh()) : null;
		ro?.observe(tube);

		// ---------------------------------------------------------------- rampa
		const deal = (first = false) => {
			if (step >= N) return;
			nameEl.textContent = v.cards[step].t;
			stepEl.textContent = String(step + 1);
			pips.forEach((p, i) => p.classList.toggle('on', i === step && !p.classList.contains('ok') && !p.classList.contains('no')));
			cardEl.className = 'tn-card';
			cardEl.style.transform = '';
			cardEl.querySelector('.tn-yr').innerHTML = QMARK;
			void cardEl.offsetWidth;
			cardEl.classList.add('in');
			if (!first) sfx(app, 'whoosh', { vol: 0.6 });
			gaps();
		};

		// ---------------------------------------------------------------- yıl sayacı (imza anı): haneler döner, soldan sağa kilitlenir
		const spin = (yrEl, y, delay = 0, cls = '') =>
			new Promise((res) => {
				const ds = [...pad4(y)];
				yrEl.innerHTML = ds.map(() => '<i class="spin">0</i>').join('');
				const cells = [...yrEl.children];
				let alive = true;
				const roll = () => {
					if (!alive || !yrEl.isConnected) return;
					cells.forEach((c) => c.classList.contains('spin') && (c.textContent = String(Math.floor(Math.random() * 10))));
					later(roll, 55);
				};
				later(roll, delay);
				ds.forEach((d, i) =>
					later(
						() => {
							const c = cells[i];
							c.className = `set ${cls}`;
							c.textContent = d;
							sfx(app, 'bzCount', { n: i * 3 });
							if (i === ds.length - 1) {
								alive = false;
								res();
							}
						},
						delay + 260 + i * 140,
					),
				);
			});
		const beam = (it, ok) => {
			const b = document.createElement('i');
			b.className = `tn-beam${ok ? '' : ' no'}`;
			b.style.top = `${(it.top || 0).toFixed(1)}px`;
			tube.appendChild(b);
			later(() => b.remove(), 900);
		};
		const burstAt = (node, colors, text = '', cls = 'dn dn-gold') => {
			const f = fx();
			if (!f || !node) return;
			const r = node.getBoundingClientRect();
			f.burst(r.left + r.width * 0.3, r.top + r.height / 2, { n: 16, dist: 80, colors, kind: 'star', size: 11, life: 700 });
			if (text) f.text(r.left + r.width / 2, r.top - 4, text, { cls, life: 1000 });
		};
		/** Kilit anı: yılın dev gölgesi tünelin derinliğinden geçer (arka katman, bitince kalkar). */
		const bigYear = (y, ok) => {
			const b = document.createElement('i');
			b.className = `tn-big${ok ? '' : ' no'}`;
			b.textContent = String(y);
			b.addEventListener('animationend', () => b.remove());
			tube.querySelector('.tn-bg').appendChild(b);
			later(() => b.remove(), 1300);
		};
		/** İlk hamle öğreticisi: parlayan parmak izi karttan tünelin ortasına iki kez iner, boşluklar nabız gibi atar. */
		let tut = null;
		const stopTut = () => {
			tut?.remove();
			tut = null;
		};
		const tutorial = () => {
			if (done || step || drag || G[0] != null) return;
			const rr = root.getBoundingClientRect();
			const zf = rr.height / (root.offsetHeight || 1) || 1;
			const c = cardEl.getBoundingClientRect();
			const tb = tube.getBoundingClientRect();
			tut = document.createElement('i');
			tut.className = 'tn-tut';
			tut.style.setProperty('--y0', `${((c.top + c.height / 2 - rr.top) / zf).toFixed(1)}px`);
			tut.style.setProperty('--y1', `${((tb.top + tb.height * 0.52 - rr.top) / zf).toFixed(1)}px`);
			tut.addEventListener('animationend', stopTut);
			root.appendChild(tut);
			gapsEl.classList.remove('nudge');
			void gapsEl.offsetWidth;
			gapsEl.classList.add('nudge');
			later(() => gapsEl.classList.remove('nudge'), 1100);
			later(stopTut, 3600);
		};
		root.addEventListener('pointerdown', stopTut, true);
		const flash = (ok) => {
			tube.classList.remove('flash', 'no', 'warp');
			void tube.offsetWidth;
			tube.classList.add('flash', 'warp');
			if (!ok) tube.classList.add('no');
			later(() => tube.classList.remove('warp'), 900);
		};

		// ---------------------------------------------------------------- yerleştirme
		const commit = (g) => {
			if (done || busy || step >= N || !t0) return;
			if (cut?.[step]?.includes(g)) return;
			busy = true;
			root.classList.add('busy');
			const k = step;
			G[k] = g;
			T[k] = now();
			const want = dogruBosluk(v, k);
			const ok = g === want;
			const it = { t: v.cards[k].t, y: v.years[k], kind: 'c', k, el: null };
			const e = plate(it, QMARK);
			list.splice(g, 0, it);
			// kart rampadan yuvasına uçar (FLIP): yerel birimde başlangıç farkı
			const zf = tube.getBoundingClientRect().height / (tube.clientHeight || 1) || 1;
			const L = place(-1);
			const from = cardEl.getBoundingClientRect();
			e.style.transition = 'none';
			e.style.transform = `translateY(${L.ys[g].toFixed(1)}px)`;
			const to = e.getBoundingClientRect();
			e.style.transform = `translate(${((from.left - to.left) / zf).toFixed(1)}px,${(L.ys[g] + (from.top - to.top) / zf).toFixed(1)}px) scale(1.04)`;
			void e.offsetWidth;
			e.style.transition = 'transform .42s cubic-bezier(.35,1.25,.5,1)';
			e.style.transform = `translateY(${L.ys[g].toFixed(1)}px)`;
			cardEl.classList.remove('lift', 'back', 'in');
			cardEl.classList.add('gone');
			gapsEl.innerHTML = '';
			sfx(app, 'whoosh', { vol: 0.5 });
			buzz(8);
			let fin;
			settle = new Promise((r) => (fin = r));
			const lastCard = k === N - 1;
			if (lastCard) {
				// cevap hemen gider (saat bu an); canlandırma kartta sürer, cevap ekranı onu bekler
				done = true;
				api.answer({ g: G.slice(), t: T.slice() });
			}
			later(async () => {
				e.style.transition = '';
				if (ok) {
					e.classList.add('ok', 'land');
					sfx(app, 'kbLock');
					buzz(14);
					beam(it, true);
					flash(true);
					pips[k].className = 'ok';
					bigYear(it.y, true);
					await spin(e.querySelector('.tn-yr'), it.y, 0);
					burstAt(e, ['#46e0ff', '#fff', '#ffd25a'], 'DOĞRU YER!');
					sfx(app, 'right', { n: k + 1 });
				} else {
					e.classList.add('no', 'shake');
					sfx(app, 'wrong');
					buzz([30, 40, 30]);
					flash(false);
					pips[k].className = 'no';
					await new Promise((r) => later(r, 460));
					// gerçek yerine kayar (kırmızı), yılı açılır
					list.splice(list.indexOf(it), 1);
					list.splice(want, 0, it);
					e.classList.remove('shake');
					e.classList.add('mv'); // kayan kart komşularının üstünden geçer
					place(-1);
					sfx(app, 'whoosh', { vol: 0.45, rate: 0.8 });
					await new Promise((r) => later(r, 560));
					e.classList.remove('mv');
					e.classList.add('land');
					beam(it, false);
					bigYear(it.y, false);
					await spin(e.querySelector('.tn-yr'), it.y, 0);
					burstAt(e, ['#ff8a7a', '#fff'], `DOĞRUSU ${it.y}`, 'dn dn-hot');
				}
				later(() => e.classList.remove('land'), 700);
				step++;
				busy = false;
				root.classList.remove('busy');
				if (step < N && !done) later(() => deal(), 260);
				else {
					root.classList.add('over');
					later(() => sweep(), 300);
				}
				fin();
			}, 440);
		};
		/** Tünel tamam: olaylar eskiden yeniye sırayla parlar, halkalar hızlanır. */
		const sweep = () => {
			list.forEach((it, i) => {
				it.el.style.setProperty('--o', i);
				it.el.classList.remove('sweep');
				void it.el.offsetWidth;
				it.el.classList.add('sweep');
			});
			flash(true);
			sfx(app, 'combo', { n: 3 });
		};

		// ---------------------------------------------------------------- dokunuş: boşluğa dokun
		gapsEl.addEventListener('pointerdown', (e) => {
			const b = e.target.closest('.tn-gap');
			if (!b || b.disabled || done || busy) return;
			for (const x of gapsEl.querySelectorAll('.hot')) x.classList.remove('hot');
			b.classList.add('hot');
		});
		gapsEl.addEventListener('pointerleave', () => {
			for (const x of gapsEl.querySelectorAll('.hot')) x.classList.remove('hot');
		});
		gapsEl.addEventListener('click', (e) => {
			const b = e.target.closest('.tn-gap');
			if (!b || b.disabled) return;
			commit(Number(b.dataset.g));
		});

		// ---------------------------------------------------------------- sürükle-bırak
		let drag = null;
		const targetOf = (clientY) => {
			const r = tube.getBoundingClientRect();
			const zf = r.height / (tube.clientHeight || 1) || 1;
			const y = (clientY - r.top) / zf;
			if (y < -24) return null;
			// yuva gösteriliyorsa ve parmak yuvanın içindeyse yerinde kalır (titreme yok)
			if (shown >= 0) {
				const L = lay(list.length, shown);
				if (y >= L.ghost - L.gp && y <= L.ghost + L.rh + L.gp) return shown;
			}
			const L0 = lay(list.length);
			let g = 0;
			for (const top of L0.ys) if (top + L0.rh / 2 < y) g++;
			return g;
		};
		cardEl.addEventListener('pointerdown', (e) => {
			if (done || busy || !t0 || step >= N || (e.button != null && e.button > 0)) return;
			e.preventDefault();
			drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, on: false, g: null };
			try {
				cardEl.setPointerCapture(e.pointerId);
			} catch {
				/* yok say */
			}
		});
		cardEl.addEventListener('pointermove', (e) => {
			if (!drag || e.pointerId !== drag.id) return;
			const dx = e.clientX - drag.x0;
			const dy = e.clientY - drag.y0;
			if (!drag.on) {
				if (Math.hypot(dx, dy) < 6) return;
				drag.on = true;
				cardEl.classList.remove('in', 'back');
				cardEl.classList.add('lift');
				root.classList.add('drag');
				sfx(app, 'tap');
				buzz(6);
			}
			const zf = cardEl.getBoundingClientRect().width / (cardEl.offsetWidth || 1) || 1;
			const rot = clamp(dx / 30, -5, 5);
			cardEl.style.transform = `translate(${(dx / zf).toFixed(1)}px,${(dy / zf).toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(1.03)`;
			let g = targetOf(e.clientY);
			if (g != null && cut?.[step]?.includes(g)) g = null;
			if (g !== drag.g) {
				drag.g = g;
				place(g == null ? -1 : g);
				if (g != null) sfx(app, 'tick', { vol: 0.3, rate: 1.1 + g * 0.08 });
			}
		});
		const drop = (e) => {
			if (!drag || e.pointerId !== drag.id) return;
			const d = drag;
			drag = null;
			root.classList.remove('drag');
			if (!d.on) {
				// karta dokunup bıraktı: boşluklar nabız gibi atar (sürükle ya da boşluğa dokun)
				gapsEl.classList.remove('nudge');
				void gapsEl.offsetWidth;
				gapsEl.classList.add('nudge');
				later(() => gapsEl.classList.remove('nudge'), 1100);
				sfx(app, 'tap');
				return;
			}
			if (d.g != null && !done && !busy) {
				shown = -1;
				ghost.classList.remove('on');
				commit(d.g);
				return;
			}
			// tünelin dışına bırakıldı: kart rampaya döner
			place(-1);
			cardEl.classList.remove('lift');
			cardEl.classList.add('back');
			cardEl.style.transform = '';
		};
		cardEl.addEventListener('pointerup', drop);
		cardEl.addEventListener('pointercancel', drop);

		// ---------------------------------------------------------------- rakipler: botun planı kartta oynanır (yalnız ilerleyiş)
		const raceOf = (i) => [...(root.querySelector(`.tn-rv[data-p="${i}"]`)?.querySelectorAll('u i') || [])];
		const stopOpen = onOpen(el, () => {
			t0 = clock.now();
			sfx(app, 'whoosh');
			list.forEach((it, o) => {
				it.el.style.setProperty('--o', o);
				it.el.classList.add('enter');
				later(() => it.el.classList.remove('enter'), 1100 + o * 140);
			});
			flash(true);
			later(tutorial, 900);
			for (const b of bots) {
				const ts = Array.isArray(b.value?.t) ? b.value.t : [];
				ts.forEach((t, k) => Number.isFinite(t) && later(() => !done && raceOf(b.p.i)[k]?.classList.add('on'), t * 1000));
			}
		});
		const close = onClose(el, () => {
			stopOpen();
			ro?.disconnect();
			for (const t of timers) clearTimeout(t);
		});

		place(-1, true);
		deal(true);
		requestAnimationFrame(refresh);

		return {
			lock() {
				done = true;
				drag = null;
				stopTut();
				// süre doldu (kart kaldı): damga bandı hemen açılır, arayüzün "SÜRE DOLDU" damgası rampanın yerine otursun. Üç kart
				// konduysa açmaz: son kartın kilidi oynarken tünel kaymasın (bandı cevap ekranı açar)
				if (G.some((g) => g == null)) root.classList.add('vd');
				root.classList.remove('drag');
				cardEl.classList.remove('lift');
				cardEl.style.transform = '';
				gapsEl.innerHTML = '';
				if (shown >= 0) place(-1);
			},
			value: () => ({ g: G.slice(), t: T.slice() }),
			joker(e) {
				if (Array.isArray(e?.poll)) {
					poll = e.poll;
					if (!busy && !done && step < N) gaps();
					app?.ui?.toast?.('Seyirci oyunu verdi', { tone: 'good', ms: 1600 });
					return;
				}
				if (!Array.isArray(e?.cut)) return;
				cut = e.cut;
				if (!busy && !done && step < N) gaps();
				app?.ui?.toast?.('Yanlış boşlukların yarısı kapandı', { tone: 'good', ms: 1600 });
			},
			reveal(results) {
				const run = () => {
					done = true;
					root.classList.add('rv', 'over');
					root.classList.toggle('pm', results.length > 2); // 3–4 oyuncu: portreler iki sıra, plakalar biraz yüksek
					gapsEl.innerHTML = '';
					ghost.classList.remove('on');
					const meR = results.find((r) => r.p?.human);
					const mine = meR ? puan(v, meR.value) : { ok: 0, marks: v.years.map(() => null) };
					// bütün kartlar gerçek yerinde (konmamış olanlar da): yıllar açılır
					const spins = [];
					v.cards.forEach((c, k) => {
						let it = list.find((x) => x.k === k);
						if (!it) {
							it = { t: c.t, y: v.years[k], kind: 'c', k, el: null };
							plate(it, QMARK);
							list.push(it);
							spins.push(it);
						}
						const m = mine.marks[k];
						it.el.classList.remove('ok', 'no', 'miss');
						it.el.classList.add(m === true ? 'ok' : m === false ? 'no' : 'miss');
					});
					list.sort((a, b) => a.y - b.y);
					place(-1, !spins.length);
					spins.forEach((it, i) => spin(it.el.querySelector('.tn-yr'), it.y, 120 + i * 160));
					// kart plakalarında herkesin sonucu: portre + doğru/yanlış rozeti (senin portren altın halkalı)
					const res = results.map((r) => ({ r, s: puan(v, r.value) }));
					const nP = res.length;
					for (const it of list) {
						if (it.kind !== 'c') continue;
						const box = document.createElement('span');
						box.className = `tn-who n${nP}`;
						box.innerHTML = res
							.map(({ r, s }, o) => {
								const m = s.marks[it.k];
								return `<span class="tn-av ${m === true ? 'ok' : m === false ? 'no' : 'none'}${r.p?.human ? ' me' : ''}" style="--pc:${esc(r.color)};--o:${o}">${avOf(r.i)}</span>`;
							})
							.join('');
						it.el.appendChild(box);
					}
					later(sweep, 650);
					if (meR && app) {
						const order = results.slice().sort((a, b) => a.err - b.err || a.time - b.time);
						const win = order[0] === meR;
						const w0 = order[0] ? puan(v, order[0].value).ok : 0;
						const why = win ? '' : w0 > mine.ok ? `${order[0].name} ${w0} doğru yaptı` : `${order[0].name} daha hızlıydı`;
						if (mine.ok === N) stampLater(app, 'KUSURSUZ TÜNEL!', win ? 'gold' : '', why || 'Üç kart da doğru yerde');
						else if (meR.value == null || mine.marks.every((m) => m == null)) stampLater(app, 'SÜRE DOLDU', 'bad', why || 'Kartlar gerçek yerinde');
						else stampLater(app, `${mine.ok}/${N} DOĞRU`, win ? 'gold' : 'bad', why || `${N - mine.ok} kart yerine kaydı`);
					}
				};
				// son kartın kilit canlandırması sürüyorsa önce o biter
				settle.then(() => (el.isConnected ? run() : null));
			},
			destroy: close,
		};
	},
	joker(id, v, R) {
		if (id === 'kahin') {
			// seyirci: kart başına boşlukların oy yüzdesi (toplam 100). Doğru boşluk çoğunlukla önde, ama zorlukla ve yakın
			// yıllı kartta seyirci de yanılır: oyun komşu boşluklara yayılır (yanlış boşluğa en çok oy düşebilir)
			const diff = clamp(Math.round(Number(v.q?.diff) || 2), 1, 3);
			return {
				poll: v.years.map((y, k) => {
					const want = dogruBosluk(v, k);
					const m = k + 3;
					const near = Math.min(...tunelYillari(v, k).map((x) => Math.abs(x - y)));
					const p = clamp(0.66 - 0.07 * diff - 0.03 * k - (near <= 5 ? 0.06 : near <= 20 ? 0.03 : 0) + R() * 0.12, 0.3, 0.85);
					const w = Array.from({ length: m }, (_, g) => (g === want ? 0 : (1 / (1 + Math.abs(g - want))) * (0.6 + R())));
					const sw = w.reduce((a, b) => a + b, 0) || 1;
					const pct = w.map((x) => Math.round((x / sw) * (100 - Math.round(p * 100))));
					pct[want] = 100 - pct.reduce((a, b) => a + b, 0);
					return pct;
				}),
			};
		}
		if (id !== 'yari') return null;
		// her kart için yanlış boşlukların yarısı (en az biri) kapanır
		return {
			cut: v.years.map((_, k) => {
				const want = dogruBosluk(v, k);
				const wrong = shuffle(
					Array.from({ length: k + 3 }, (_, g) => g).filter((g) => g !== want),
					R,
				);
				return wrong.slice(0, Math.max(1, Math.floor(wrong.length / 2))).sort((a, b) => a - b);
			}),
		};
	},
	/** Çevrimiçi görünüm: kartların yılı yok (her yerleştirme sunucuya sorulur). */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.years;
		return o;
	},
	judge(v, value) {
		const s = puan(v, value);
		return { correct: s.ok === N, err: N - s.ok, score: s.ok };
	},
	bot(v, skill, R) {
		// kart başına doğruluk: beceri ve zorluk; komşusuna yakın yıllı kart ve sonraki (çok boşluklu) kartlar zor. Yanılan bot
		// çoğunlukla bir yan boşluğa koyar. Anlar insan gibi: ilk kart (okuma, alışma) uzun, sonrakiler daha kısa.
		const p0 = pCorrect(skill, v.q.diff);
		const Tt = botTime(v, R, skill, 0.15, 0.95);
		const fr = [0.3 + R() * 0.1, 0.62 + R() * 0.1, 1];
		const g = [];
		const t = [];
		for (let k = 0; k < N; k++) {
			const want = dogruBosluk(v, k);
			const m = k + 2;
			const near = Math.min(...tunelYillari(v, k).map((y) => Math.abs(y - v.years[k])));
			const pk = clamp(p0 + 0.14 - 0.05 * k - (near <= 5 ? 0.14 : near <= 20 ? 0.07 : 0), 0.08, 0.97);
			let x = want;
			if (R() >= pk) {
				const dir = want === 0 ? 1 : want === m ? -1 : R() < 0.5 ? -1 : 1;
				x = clamp(want + dir * (R() < 0.8 ? 1 : 2), 0, m);
				if (x === want) x = want < m ? want + 1 : want - 1;
			}
			g.push(x);
			t.push(Math.round(Tt * fr[k] * 10) / 10);
		}
		return { value: { g, t }, time: Math.max(1, t[N - 1]) };
	},
	/** Sınama: üç kartı da doğru ve hepsini yanlış yere koyan cevap. */
	ornek(v) {
		const good = v.years.map((_, k) => dogruBosluk(v, k));
		return { good: { g: good, t: [4, 9, 14] }, bad: { g: good.map((x, k) => (x === 0 ? 1 : x - 1) % (k + 3)), t: [4, 9, 14] } };
	},
};
