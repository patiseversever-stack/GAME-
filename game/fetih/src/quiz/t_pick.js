// Seçmeli tipler: hilo, odd, proverb, riddle (bilmece: sır kartı).
// Hepsi 'exact' türünde: bildi / bilemedi; eşitlikte hızlı olan kazanır.

import { css, esc, shuffle, pCorrect, mountChoice, buzz, fmtNum, clamp, heceli } from './util.js';
import { botTime } from './timing.js';
import { clock, setTimeout } from '../core/clock.js';

const CSS = /* css */ `
/* hilo · Arena v1 "Kefe" (v1.6): çapraz kesikle ayrılmış iki eğik levha, beyaz ve koyu; ortada altın çerçeveli VS elması.
   Cevapta değerler sayarak gelir, levhanın altındaki güç çubuğu büyüklükle orantılı dolar (yıl karşılaştırmasında çubuk yok,
   fark çipi konuşur); kazanan altınla parlar, kaybeden söner. Kesik (clip-path) iç levhada: parıltı (drop-shadow) düğmede. */
.fl-hilo{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:0;height:178px;margin:2px 0 0}
.fl-hl{position:relative;display:block;min-height:0;padding:0;border:0;border-radius:0;background:none;box-shadow:none;color:inherit;font:inherit;text-align:left;cursor:pointer;
  touch-action:manipulation;transition:transform .16s cubic-bezier(.3,1.4,.5,1),opacity .3s,filter .35s;-webkit-tap-highlight-color:transparent;animation:flHlIn .42s cubic-bezier(.2,1.25,.4,1) both}
.fl-hl.b{margin-left:-16px;animation-name:flHlInB;animation-delay:.06s}
.fl-hl .pl{position:absolute;inset:0;display:block;overflow:hidden}
.fl-hl.a .pl{clip-path:polygon(0 0,100% 0,calc(100% - 26px) 100%,0 100%);background:linear-gradient(165deg,#ffffff,#e6e9f1);color:#0b0c12}
.fl-hl.b .pl{clip-path:polygon(26px 0,100% 0,100% 100%,0 100%);background:linear-gradient(165deg,#2a2f42,#171a26);color:#fff;text-align:right}
.fl-hl.b .pl::before{content:'';position:absolute;inset:0;clip-path:inherit;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);pointer-events:none}
/* isim: ilk satır tam genişlik, alt satırlar VS elmasının çevresinden dolanır (iç kenarda yüzen boşluk); yazı boyu JS'te kalan
   yüksekliğe sığana kadar küçülür (kelime bölünmez) */
.fl-hl .nm{position:absolute;top:14px;left:14px;right:18px;display:block;font:italic 900 28px/1.02 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.01em;text-transform:uppercase;text-wrap:balance;overflow-wrap:normal;word-break:normal;hyphens:none}
/* yüzen boşluk ilk satırın altından başlar ve yalnız kendi kutusu kadar yer tutar (shape-outside: border-box): satırlar
   yüzen öğenin margin kutusu kadar kısalır, margin-top'lu boşluk ilk satırı da daraltıyordu; dar levhada tek uzun kelime
   ("TUTUNAMAYANLAR") o daralmış satıra sığmayınca boşluğun altına, değerin üstüne iniyordu */
.fl-hl .nm::before{content:'';float:right;width:38px;height:92px;margin-top:1.1em;shape-outside:border-box}
.fl-hl.b .nm::before{float:left}
.fl-hl.b .nm{left:30px;right:14px}
.fl-hl .vl{position:absolute;left:14px;right:30px;bottom:16px;display:flex;align-items:baseline;gap:5px;min-height:44px;white-space:nowrap}
.fl-hl.b .vl{left:30px;right:14px}
.fl-hl.b .vl{flex-direction:row-reverse}
.fl-hl .val{font:italic 900 44px/1 'Barlow Condensed','Lilita One',sans-serif;font-variant-numeric:tabular-nums;color:transparent;-webkit-text-stroke:1.5px currentColor;opacity:.32;transition:opacity .25s,color .25s}
.fl-hl.a .val{-webkit-text-stroke-color:#0b0c12}
.fl-hl.b .val{-webkit-text-stroke-color:#fff}
.fl-hl .vl u{text-decoration:none;font:italic 800 14px/1 'Barlow Condensed',sans-serif;letter-spacing:.08em;text-transform:uppercase;opacity:0;transition:opacity .3s .2s}
.fl-hl .bar{position:absolute;left:14px;right:30px;bottom:9px;height:6px;background:rgba(11,12,18,.12);overflow:hidden}
.fl-hl.b .bar{left:34px;right:14px;background:rgba(255,255,255,.14)}
.fl-hl .bar i{position:absolute;top:0;bottom:0;left:0;width:0;background:currentColor;opacity:.55;transition:width .95s cubic-bezier(.2,.8,.2,1)}
.fl-hl.b .bar i{left:auto;right:0}
.fl-hilo.yil .bar{display:none}
/* seçim: levha öne çıkar, üstte altın şerit ve SEÇİMİN etiketi; öteki geri çekilir */
.fl-hl:active{transform:translateY(2px) scale(.985)}
.fl-hl .pl::after{content:'';position:absolute;left:0;right:0;top:0;height:5px;background:#ffc83a;transform:scaleX(0);transform-origin:left;transition:transform .25s}
.fl-hl.b .pl::after{transform-origin:right}
.fl-hl.pick{transform:translateY(-4px);filter:drop-shadow(0 8px 14px rgba(0,0,0,.5))}
.fl-hl.pick .pl::after{transform:scaleX(1)}
.fl-hl.pick::before{content:'SEÇİMİN';position:absolute;top:-11px;z-index:3;padding:3px 9px;background:#ffc83a;color:#1b1200;font:italic 900 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.18em;transform:skewX(-10deg)}
.fl-hl.a.pick::before{left:12px}.fl-hl.b.pick::before{right:12px}
.fl-hilo.chosen .fl-hl:not(.pick){opacity:.72}
/* cevap */
.fl-hl.show .val{color:currentColor;-webkit-text-stroke:0;opacity:1}
.fl-hl.show .vl u{opacity:.7}
.fl-hl.right{opacity:1!important;filter:drop-shadow(0 0 14px rgba(255,200,58,.55)) drop-shadow(0 6px 10px rgba(0,0,0,.45));animation:flHlWin .55s cubic-bezier(.3,1.6,.5,1)}
.fl-hl.right .bar i{background:#ffc83a;opacity:1}
.fl-hl.right .pl::after{transform:scaleX(1);background:#ffc83a}
.fl-hl.right::after{content:'♛ DOĞRU';position:absolute;bottom:-12px;z-index:3;padding:3px 10px;background:#ffc83a;color:#1b1200;font:italic 900 12px/1 'Barlow Condensed',sans-serif;letter-spacing:.14em;transform:skewX(-10deg);animation:flHlTag .4s .35s cubic-bezier(.3,1.6,.5,1) both}
.fl-hl.a.right::after{left:14px}.fl-hl.b.right::after{right:14px}
.fl-hl.lose{opacity:.5!important;filter:grayscale(.7)}
.fl-hl.show.pick::before{display:none}
/* kim neyi seçti: isim ile değerin arasındaki boşlukta, levhanın dış kenarına yaslı portreler (VS elmasından uzak) */
.fl-hl .wh{position:absolute;left:14px;bottom:66px;display:flex;align-items:center;gap:5px;min-height:26px;animation:flq-pop .35s .2s cubic-bezier(.3,1.6,.5,1) both}
.fl-hl.b .wh{left:auto;right:14px;justify-content:flex-end}
.fl-q .fl-hl .wh .fl-who,.fl-hl .wh .fl-who{position:relative;inset:auto;top:auto;right:auto;left:auto;margin:0;flex:none;width:24px;height:24px;border-radius:50%;
  border:2px solid currentColor;box-shadow:0 2px 6px rgba(0,0,0,.35);overflow:hidden;animation:none}
.fl-hl .wh .fl-who .fl-avs{width:100%;height:100%;display:block}
/* VS elması: kesiğin tam ortasında */
.fl-hilo i.vs{position:absolute;left:50%;top:50%;z-index:4;width:46px;height:46px;margin:-23px 0 0 -31px;display:grid;place-items:center;font-style:normal;
  background:#0b0c12;transform:rotate(45deg);box-shadow:0 0 0 2px #ffc83a,0 0 0 5px #0b0c12,0 6px 16px rgba(0,0,0,.55);animation:flHlVs .45s .18s cubic-bezier(.3,1.7,.5,1) both}
.fl-hilo i.vs b{transform:rotate(-45deg);font:italic 900 19px/1 'Barlow Condensed','Lilita One',sans-serif;color:#ffc83a}
.fl-hilo .df{position:absolute;left:50%;bottom:-34px;z-index:4;transform:translateX(-50%) skewX(-10deg);white-space:nowrap;max-width:calc(100% - 12px);overflow:hidden;text-overflow:clip;padding:5px 12px;background:#0b0c12;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.22);font:italic 800 13px/1 'Barlow Condensed',sans-serif;letter-spacing:.14em;color:#fff;animation:flHlDf .4s .9s cubic-bezier(.3,1.6,.5,1) both}
.fl-hilo .df.sm{font-size:11px;letter-spacing:.08em;padding:5px 9px}
.fl-hilo .df.sm b{font-size:13px}
.fl-hilo .df b{color:#ffc83a;font-weight:900;letter-spacing:.04em;font-size:15px}
.fl-hilo.done{margin-bottom:36px} /* fark satırı (bottom:-34px) gövdenin içinde: 30 px'te 4 px taşıyor, ortak yakınlaştırma (ui._coverFit) her adımda yine taşıdığı için 0,8'e dek iniyordu */
@keyframes flHlIn{from{opacity:0;transform:translateX(-26px) skewX(6deg)}}
@keyframes flHlInB{from{opacity:0;transform:translateX(26px) skewX(6deg)}}
@keyframes flHlVs{from{opacity:0;transform:rotate(45deg) scale(.3)}}
@keyframes flHlWin{40%{transform:translateY(-6px) scale(1.03)}}
/* (genel flq-pop transform'u ezer: ortalama ve eğiklik kaybolurdu) */
@keyframes flHlTag{from{opacity:0;transform:skewX(-10deg) scale(.5)}to{opacity:1;transform:skewX(-10deg)}}
@keyframes flHlDf{from{opacity:0;transform:translateX(-50%) skewX(-10deg) scale(.5)}to{opacity:1;transform:translateX(-50%) skewX(-10deg)}}
@media (prefers-reduced-motion:reduce){.fl-hl,.fl-hilo i.vs,.fl-hl.right,.fl-hl.right::after,.fl-hilo .df{animation:none}}
@media (max-height:700px){.fl-hilo{height:156px}.fl-hl .val{font-size:38px}}
/* odd */
.fl-odd .fl-opt{min-height:64px;justify-content:center;text-align:center;font-size:17px}
.fl-odd .fl-opt i{position:absolute;top:5px;left:5px;width:20px;height:20px;font-size:12px}
.fl-why{margin-top:10px;padding:9px 12px;border-radius:12px;background:rgba(255,210,90,.16);border:1.5px solid var(--line);font-size:14.5px;line-height:1.3;text-align:center;
  animation:flq-pop .35s cubic-bezier(.3,1.5,.5,1)}
.fl-why b{color:var(--gold)}
/* proverb */
.fl-prv{margin:0 0 12px;padding:14px 12px;border-radius:18px;background:linear-gradient(180deg,rgba(255,235,190,.22),rgba(255,235,190,.1));border:2px solid rgba(255,210,90,.4);
  text-align:center;font-size:clamp(19px,calc(5.4 * var(--vw)),24px);line-height:1.5;text-wrap:balance}
.fl-prv::before{content:'❝';display:block;font-size:26px;line-height:.8;color:var(--gold);opacity:.8}
.fl-blank{display:inline-block;min-width:4.2em;padding:0 8px;margin:0 2px;border-radius:9px;background:rgba(0,0,0,.28);border-bottom:3px solid var(--gold);color:var(--gold);
  font-family:'Lilita One';animation:flq-pulse 1.1s ease-in-out infinite}
.fl-blank.set{animation:none;border-color:#fff;color:#fff}
.fl-blank.right{background:#2a9a44;border-color:#fff;color:#fff}
.fl-blank.wrong{background:#c8352a;border-color:#fff;color:#fff}
/* bilmece: SIR KARTI — iki dizelik bilmece kartı (Arena v1 siyah/beyaz). Dizeler sırayla belirir; cevapta
   başlık "CEVAP · X" levhasına döner, dizelerdeki ipucu sözcükleri sırayla altı çizilerek yanar (neden o cevap). */
.fl-q.ri .fl-qtext,.fl-q:has(.fl-sir) .fl-qtext{display:none}
.fl-sir{position:relative;isolation:isolate;overflow:hidden;margin:2px 0 14px;padding:11px 58px 14px 15px;border-left:5px solid var(--cc,#fff);
  background:linear-gradient(180deg,#171c35,#0d1124);clip-path:polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%);transition:border-color .25s .2s}
.fl-sir::before{content:'';position:absolute;inset:0;z-index:-1;opacity:0;background:var(--rg,none);transition:opacity .4s .15s}
.fl-sir .hd{display:flex;align-items:center;gap:8px;min-height:20px;margin-bottom:7px;font:italic 800 12px/1.25 'Barlow Condensed',sans-serif;letter-spacing:.26em;color:var(--cc,#fff)}
.fl-sir .hd::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.25),transparent)}
.fl-sir .an{display:inline-block;padding:3px 10px 2px;background:#fff;color:#0d1124;font:400 17px/1.05 'Lilita One',sans-serif;letter-spacing:.02em;font-style:normal;
  transform:skewX(-8deg);box-shadow:0 3px 0 rgba(0,0,0,.3);animation:flRvAn .45s .1s cubic-bezier(.3,1.7,.5,1) both}
.fl-sir p{margin:0;font-family:'Fredoka',sans-serif;font-weight:700;font-size:20px;line-height:1.22;color:#fff;text-wrap:pretty;
  animation:flRvIn .45s cubic-bezier(.2,.9,.3,1) both;animation-delay:calc(.1s + var(--i) * .45s)}
.fl-sir.s-lg p{font-size:18.5px}
.fl-sir p+p{position:relative;margin-top:7px;padding-left:16px}
.fl-sir p+p::before{content:'';position:absolute;left:1px;top:.62em;width:9px;height:2px;background:rgba(255,255,255,.45)}
.fl-sir em{font-style:normal;background:linear-gradient(transparent 60%,rgba(255,210,90,.6) 60%,rgba(255,210,90,.6) 92%,transparent 92%) no-repeat 0 0/0% 100%;
  transition:background-size .45s cubic-bezier(.6,0,.2,1);transition-delay:calc(.45s + var(--j) * .28s)}
.fl-sir.s-on em{background-size:100% 100%}
/* filigran soru işareti: ölçüleri kendi boyuna bağlı (em); JS kart kısaysa küçültür. Dönerken de kartın içinde ve sağdaki
   yazısız payda kalır (58 px; kısa ekranda 44): 9° dönen kutu ~0,77 em. Eskiden 88/66 px'lik işaret kartın sağ ve üst
   kenarından taşıp kırpılıyordu, sonra da (88 px, right .2em) dönerken satır sonundaki yazıya biniyordu (412 px'te ";") */
.fl-sir .qm{position:absolute;right:.06em;top:50%;width:.62em;margin-top:-.56em;text-align:center;font:400 66px/1 'Lilita One',sans-serif;color:rgba(255,255,255,.09);
  animation:flRvQ 3.4s ease-in-out infinite;transition:opacity .2s}
.fl-sir.s-on .qm{opacity:0}
.fl-sir .sl{position:absolute;right:10px;top:50%;width:40px;height:40px;margin-top:-20px;border-radius:50%;display:grid;place-items:center;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.25);
  animation:flTfBig .5s .3s cubic-bezier(.3,1.8,.5,1) both}
.fl-sir .sl svg{width:24px;height:24px;fill:none;stroke:var(--rk,#0d1124);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
.fl-sir.s-ok{--rg:linear-gradient(100deg,rgba(40,190,95,.30),rgba(40,190,95,.06) 70%);--rk:#129a45;border-left-color:#3ad06e}
.fl-sir.s-no{--rg:linear-gradient(100deg,rgba(230,70,50,.30),rgba(230,70,50,.06) 70%);--rk:#c42a1a;border-left-color:#ff5a46}
.fl-sir.s-nt{--rg:linear-gradient(100deg,rgba(255,255,255,.12),transparent 70%);border-left-color:#fff}
.fl-sir.s-on::before{opacity:1}
.fl-sir.s-on .hd{color:#fff}
@keyframes flRvIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
/* küçük telefon (360×740 ve altı): kart sıkılaşır, jokerler ekranda kalır */
@media (max-height:800px),(max-width:380px){
  .fl-sir{padding:8px 44px 10px 12px;margin:0 0 10px}
  .fl-sir .hd{margin-bottom:4px;min-height:16px}
  .fl-sir p,.fl-sir.s-lg p{font-size:17px;line-height:1.18}
  .fl-sir p+p{margin-top:4px;padding-left:13px}
  .fl-sir .qm{font-size:50px}
  .fl-sir .sl{width:34px;height:34px;margin-top:-17px;right:6px}
  .fl-sir .an{font-size:15px}
}
@keyframes flRvQ{50%{transform:rotate(9deg) translateY(-3px)}}
@keyframes flRvAn{from{opacity:0;transform:skewX(-8deg) translateX(-10px) scale(.7)}to{opacity:1;transform:skewX(-8deg)}}
@keyframes flTfBig{from{transform:scale(0) rotate(-50deg)}to{transform:none}}
@keyframes flq-bounce{0%{transform:translateY(24px) scale(.3);opacity:0}100%{transform:none;opacity:1}}
@keyframes flq-pulse{50%{box-shadow:0 0 0 4px rgba(255,210,90,.35)}}
`;

// ---------------------------------------------------------------- şık yazısı: kelime ortasından bölünmez
// Ortak kural (styles-q .fl-opt>span overflow-wrap:anywhere) dar sütunda tek kelimeyi harf ortasından böler, ui.js iki
// sütunu yalnız harf sayısıyla seçer (kelime boyuna bakmaz): 320 px'te "Konstantin/opolis", haritalı kartta "Gülşehi/r",
// cevapta portre gelince "Atıcıl/ık". Burada şık yazısı bölünmez; satırına sığmayan şık yarımşar piksel küçülür, tabanda da
// sığmıyorsa şıklar tek sütuna geçer (soru açılırken, kadraj kartın son boyunu ölçmeden önce). Cevapta yalnız küçülür
// (tek sütuna atlamaz). Tam ekran kartta küçültmeyi ortak sığdırıcı (fit.js) yapar; burada yalnız sütun kararı.
const OF_CSS = /* css */ `
.fl-opts.of{container-type:inline-size}
.fl-opts.of .fl-opt>span{overflow-wrap:normal}
/* cevap anı: portre payı daralttı, 11 px'te de sığmayan tek kelime hece sınırından iki satıra (Afyon-karahisar) */
.fl-opts.of .fl-opt>span.hy{white-space:normal;hyphens:manual;-webkit-hyphens:manual;line-height:1.05}
/* dar haritalı kart (şıklar ≤ 350 px; il adları): harf bloğu ve sağ boşluk ince, yazıya yer (iki sütun kalsın, kart haritayı
   kapatmasın). Kap sorgusu: galerinin telefon çerçevesinde (1280×720 → 325 px) de dar sayılır */
@container (max-width:350px){.fl-q.map .fl-opts.of:not(.one) .fl-opt{gap:8px}.fl-q.map .fl-opts.of:not(.one) .fl-opt:not(:has(>.fl-who)){padding-right:9px}.fl-q.map .fl-opts.of:not(.one) .fl-opt>i{width:29px}}
`;
export function optFit(el, { floor = 13 } = {}) {
	css('optfit', OF_CSS);
	const os = el.querySelector('.fl-opts');
	if (!os) return { refit() {} };
	os.classList.add('of');
	const spans = () => [...os.querySelectorAll('.fl-opt>span')];
	const over = (s) => s.scrollWidth > s.clientWidth + 1;
	let late = false;
	const run = () => {
		if (!os.isConnected) return;
		const cover = !!os.closest('.fl-q.cover');
		if (!cover) for (const s of spans()) if (!s.classList.contains('hy')) s.style.fontSize = '';
		for (const s of spans()) {
			if (s.classList.contains('hy')) continue;
			if (cover) {
				// tam ekran kart: fit.js tek kelimeyi tabanın %55'ine kadar küçültür; o boyda da sığmıyorsa tek sütun
				if (late || os.classList.contains('one') || !over(s)) continue;
				const f0 = s.style.fontSize;
				s.style.fontSize = Math.max(8.5, parseFloat(getComputedStyle(s.parentElement).fontSize) * 0.55) + 'px';
				const still = over(s);
				s.style.fontSize = f0;
				if (still) os.classList.add('one');
				continue;
			}
			if (!over(s)) continue;
			let px = parseFloat(getComputedStyle(s).fontSize) || 18;
			const lo = late ? 11 : floor;
			while (px > lo && over(s)) s.style.fontSize = `${(px -= 0.5)}px`;
			if (over(s) && !late && !os.classList.contains('one')) {
				os.classList.add('one'); // gözlemci yeniden ölçer
				return;
			}
		}
	};
	// cevapta hâlâ taşan (portrenin altına giren) yazı: hece sınırından iki satır; kutudan taşmayan en büyük boy (11–15 px)
	const hy = () => {
		if (!os.isConnected) return;
		for (const s of spans()) {
			if (s.classList.contains('hy') || s.children.length || s.parentElement.classList.contains('whod') || !over(s)) continue;
			const txt = s.textContent;
			if (/\s/.test(txt.trim()) || [...txt].length < 8) continue; // çok kelimeli yazı zaten satır kırar
			s.innerHTML = heceli(txt);
			s.classList.add('hy');
			const b = s.parentElement;
			const tall = () => b.scrollHeight > b.clientHeight + 1;
			let px = 15;
			s.style.fontSize = px + 'px';
			while (px > 11 && (over(s) || tall())) s.style.fontSize = `${(px -= 0.5)}px`;
		}
	};
	run();
	const mo = new MutationObserver(run); // ui.js tek sütuna geçirirse (uzun şık) baştan ölç
	mo.observe(os, { attributes: true, attributeFilter: ['class'] });
	requestAnimationFrame(run);
	document.fonts?.ready?.then(run);
	return {
		/** Cevap: portreler yazının payını daralttı. */
		refit() {
			late = true;
			run();
			hy();
			requestAnimationFrame(() => {
				run();
				hy();
			});
		},
	};
}

/**
 * Haritalı kartın cevap anı: joker çubuğu kalkar (cevapta işe yaramaz; tam ekran kartta ve Tufan'da da böyle). Kart kısalır,
 * harita ve cevap damgası (haritalı kartta ekranın altından 150 px yukarıda) kartın altında açıkta kalır: kısa ekranda damga
 * joker çubuğunun, Kimim'de ipucu satırlarının üstüne biniyordu. Kadraj (cardTop) bundan SONRA ölçülmeli.
 */
export function jokersOff(el) {
	css('dnrv', '.fl-q.dn-rv .fl-jk{display:none}');
	el.closest('.fl-q')?.classList.add('dn-rv');
}

/**
 * Haritalı kart soru boyunca büyürse (ipucu, deneme satırı) arayüzün yazı rozeti sınırı da kartın altına iner. Arayüz kartın
 * örttüğü payı (ui._mapTop) soru açılırken bir kez ölçer, harita rozetleri bu sınırın altına yerleşir (ui.js cutY). Kart
 * sonradan büyüyünce sınır eskide kalıyor, rozet kartın joker çubuğuna biniyordu (320×568'de İl Avı'nda üç yanlıştan sonra
 * "Kırklareli 1478 km"). Yalnız büyütür; arayüz sonraki soruda yeniden ölçer.
 */
export function tagFloor(app, top) {
	const ui = app?.ui;
	if (ui && typeof ui._mapTop === 'number' && top > ui._mapTop) ui._mapTop = top;
}

const choiceKind = (extra) => ({
	kind: 'exact',
	judge(v, value) {
		return { correct: value === v.right, err: value === v.right ? 0 : 1 };
	},
	...extra,
});

/** 4 şıklı tipler için ortak bot. [lo, hi]: cevap anının süre penceresindeki dilimi (timing.js botTime). */
function choiceBot(v, skill, R, [lo, hi] = [0.05, 0.8], bonus = 0) {
	const ok = R() < Math.min(0.96, pCorrect(skill, v.q.diff) + bonus);
	let value = v.right;
	if (!ok) do value = Math.floor(R() * v.opts.length); while (value === v.right);
	return { value, time: botTime(v, R, skill, lo, hi) };
}

/** a: [doğru, y1, y2, y3] → karıştırılmış şıklar */
function prepChoice(q, R, extra = {}) {
	const order = shuffle([0, 1, 2, 3], R);
	return { q, opts: order.map((i) => q.a[i]), right: order.indexOf(0), ...extra };
}

// ---------------------------------------------------------------- hilo
export const hilo = {
	cover: 'kisa', // kısa ekranda (yükseklik < 720 px) tam ekran kart: harita şeridi yerine bulmacaya yer (ui.js)
	time: 20,
	label: 'Karşılaştır',
	prepare(q, R) {
		const flip = R() < 0.5; // doğru taraf rastgele zaten veride; ekranda yerlerini de karıştır
		const sides = flip ? [q.right, q.left] : [q.left, q.right];
		return { q, sides, right: sides[0].v > sides[1].v ? 0 : 1 };
	},
	mount(el, v, api) {
		css('pick', CSS);
		const raw = String(v.q.unit || '').trim();
		const unit = raw.replace(/\s*\(.*?\)\s*/g, '').trim(); // "km² (yaklaşık)" → "km²"
		// Türkçe harfli düzenli ifadeler dizgiden (derleyici dizgiyi ASCII'ye kaçırır, düzenli ifade sabitini kaçırmaz: karakter
		// kümesi bildirmeyen sayfada /yaklaşık/ hiç eşleşmiyor, "≈" düşüyordu)
		const approx = new RegExp('yaklaşık', 'i').test(raw) || new RegExp('yaklaşık', 'i').test(v.q.prop || '');
		const mo = unit === 'MÖ' || unit === 'MS';
		// yıl karşılaştırması (icat, kuruluş, tamamlanma yılı…): güç çubuğu anlamsız, fark "yıl" olarak söylenir
		const year = mo || new RegExp('yıl', 'i').test(v.q.prop || '') || (!unit && v.sides.every((s) => Number.isInteger(s.v) && s.v >= 1000 && s.v <= 2100));
		el.innerHTML = `<div class="fl-hilo${year ? ' yil' : ''}" lang="tr">${v.sides
			.map(
				(s, i) =>
					`<button class="fl-hl ${'ab'[i]}" data-i="${i}" aria-label="${esc(s.t)}"><span class="pl"><span class="nm">${esc(s.t)}</span><span class="vl"><b class="val">?</b><u>${esc(unit)}</u></span><span class="bar"><i></i></span></span></button>`,
			)
			.join('')}<i class="vs"><b>VS</b></i></div>`;
		const box = el.querySelector('.fl-hilo');
		const btns = [...el.querySelectorAll('.fl-hl')];
		// sığdır: isim en çok 3 satır ve yatayda taşmadan (uzun tek kelime de), değer + birim levhanın içinde
		// isim: levhada değer satırının (ve varsa oyuncu rozetlerinin) üstünde kalan yüksekliğe sığana kadar küçülür
		const fitName = (b) => {
			const nm = b.querySelector('.nm');
			const wh = b.querySelector('.wh');
			// isim üstten başlar; altında rozet şeridi (varsa) ve değer satırı vardır
			const floor = (wh || b.querySelector('.vl')).getBoundingClientRect().top - 6;
			const avail = floor - nm.getBoundingClientRect().top;
			// yazının gerçek yüksekliği satırlardan (kutunun scrollHeight'ı VS çevresindeki yüzen boşlukla şişer)
			const rg = document.createRange();
			const rects = () => {
				rg.selectNodeContents(nm);
				return [...rg.getClientRects()];
			};
			const textH = () => {
				let bot = 0;
				for (const r of rects()) bot = Math.max(bot, r.bottom);
				return bot ? bot - nm.getBoundingClientRect().top : 0;
			};
			// ilk satır kutunun tepesinde mi: sığmayan uzun kelime yüzen boşluğun altına itilirse isim aşağı, değerin üstüne düşer
			const low = () => {
				const r = rects()[0];
				return !!r && r.top - nm.getBoundingClientRect().top > 4;
			};
			let px = 28;
			nm.style.fontSize = `${px}px`;
			// en çok 12 px'e kadar (eskiden 15: o boyda da sığmayan isim değerin üstüne biniyordu)
			while (px > 12 && (nm.scrollWidth > nm.clientWidth + 1 || textH() > avail || low())) nm.style.fontSize = `${(px -= 1)}px`;
		};
		const fitVal = (b) => {
			const vl = b.querySelector('.vl');
			const val = b.querySelector('.val');
			const u = b.querySelector('.vl u');
			// genişlik çocukların toplamından (b levhasında satır sağdan sola: taşma solda kalır, scrollWidth onu saymaz)
			const need = () => val.offsetWidth + (u.textContent ? u.offsetWidth + 5 : 0);
			let px = parseFloat(getComputedStyle(val).fontSize) || 44;
			while (px > 20 && need() > vl.clientWidth) val.style.fontSize = `${(px -= 2)}px`;
		};
		const fit = () => btns.forEach(fitName);
		fit();
		requestAnimationFrame(fit); // yazı tipi ve yerleşim oturduktan sonra bir kez daha
		let done = false;
		for (const b of btns)
			b.addEventListener('click', () => {
				if (done) return;
				done = true;
				b.classList.add('pick');
				box.classList.add('chosen');
				buzz();
				api.answer(Number(b.dataset.i));
			});
		const countUp = (node, to, dur = 900) => {
			const t0 = clock.now();
			const step = (t) => {
				if (!node.isConnected) return;
				const k = Math.min(1, (t - t0) / dur);
				const e = 1 - Math.pow(1 - k, 3);
				const x = Number.isInteger(to) ? Math.round(to * e) : to * e;
				node.firstChild.nodeValue = fmtNum(k < 1 ? x : to);
				if (k < 1) requestAnimationFrame(step);
			};
			requestAnimationFrame(step);
		};
		return {
			lock() {
				done = true;
			},
			reveal(results) {
				done = true;
				const vals = v.sides.map((s) => s.v);
				const max = Math.max(...vals.map(Math.abs), 1e-9);
				btns.forEach((b, i) => {
					const val = b.querySelector('.val');
					val.textContent = year && !mo ? String(Math.round(vals[i] * 0.6)) : '0';
					b.classList.add('show', i === v.right ? 'right' : 'lose');
					// son değerle ölç: sayım sırasında boy oynamasın diye en geniş hal (son değer) önceden yazılıp sığdırılır
					val.textContent = fmtNum(vals[i]);
					fitVal(b);
					val.textContent = year && !mo ? String(Math.round(vals[i] * 0.6)) : '0';
					countUp(val, vals[i], year && !mo ? 700 : 950);
					// güç çubuğu: büyüklükle orantılı (en küçüğü de görünsün diye %6 taban)
					const bar = b.querySelector('.bar i');
					requestAnimationFrame(() => (bar.style.width = `${Math.max(6, (Math.abs(vals[i]) / max) * 100).toFixed(1)}%`));
				});
				// fark çipi: "FARK 1.220 m" ya da yıllarda "FARK 3 yıl"; oran büyükse "× 3,2 KAT"
				const d = Math.abs(vals[0] - vals[1]);
				const lo = Math.min(...vals.map(Math.abs));
				const ratio = lo > 0 ? Math.max(...vals.map(Math.abs)) / lo : 0;
				const du = year ? 'yıl' : unit;
				const num = Number.isInteger(d) ? fmtNum(d) : Number(d.toFixed(1)).toLocaleString('tr-TR');
				const kat = !year && ratio >= 2 ? ` · <b>${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1).replace('.', ',')}</b> KAT` : '';
				box.insertAdjacentHTML('beforeend', `<span class="df${num.length + du.length + (kat ? 9 : 0) > 14 ? ' sm' : ''}">FARK ${approx ? '≈ ' : ''}<b>${num}</b> ${esc(du)}${kat}</span>`);
				box.classList.add('done');
				const dots = btns.map(() => []);
				for (const r of results) if (r.value != null && dots[r.value]) dots[r.value].push(`<b class="fl-who" style="background:${r.color}"></b>`);
				btns.forEach((b, i) => {
					if (!dots[i].length) return;
					b.querySelector('.vl').insertAdjacentHTML('beforebegin', `<span class="wh">${dots[i].join('')}</span>`);
					fitName(b);
				});
			},
			destroy() {},
		};
	},
	...choiceKind({
		bot(v, skill, R) {
			// değerler birbirine yakınsa bot da şaşırır
			const a = v.sides[0].v;
			const b = v.sides[1].v;
			const ratio = Math.max(a, b) / Math.max(1e-9, Math.min(a, b));
			const close = clamp((1.6 - ratio) * 0.35, 0, 0.3);
			const ok = R() < clamp(pCorrect(skill, v.q.diff) + 0.12 - close, 0.3, 0.96);
			return { value: ok ? v.right : 1 - v.right, time: botTime(v, R, skill, 0, 0.7) };
		},
	}),
};

// ---------------------------------------------------------------- odd
export const odd = {
	// kısa ekranda (yükseklik < 720 px) tam ekran kart (ui.js): cevaptaki "neden farklı" kutusu alttaki kartın payına
	// sığmıyordu (320×568'de joker çubuğunun altında kalıyordu, 360×640'ta gövde 0,7'ye küçülüp açıklama 10 px'e iniyordu);
	// tam ekran kartta cevap anında joker çubuğu da kalkar
	cover: 'kisa',
	time: 20,
	label: 'Farklı olan',
	prepare(q, R) {
		const ord = shuffle([0, 1, 2, 3], R);
		return { q, opts: ord.map((i) => q.opts[i]), right: ord.indexOf(q.odd) };
	},
	mount(el, v, api) {
		css('pick', CSS);
		el.innerHTML = '<div class="fl-odd"></div><div data-r="why"></div>';
		const box = el.querySelector('.fl-odd');
		const ctl = mountChoice(box, v, api);
		const f = optFit(box);
		return {
			lock: ctl.lock,
			reveal(results) {
				ctl.reveal(results);
				f.refit();
				ctl.btns.forEach((b, i) => i !== v.right && !b.classList.contains('wrong') && b.classList.add('dim'));
				if (v.q.why) el.querySelector('[data-r=why]').innerHTML = `<div class="fl-why"><b>${esc(v.opts[v.right])}</b> farklı: ${esc(v.q.why)}</div>`;
			},
			destroy() {},
		};
	},
	...choiceKind({ bot: (v, s, R) => choiceBot(v, s, R, [0.05, 0.8]) }),
};

// ---------------------------------------------------------------- proverb
export const proverb = {
	time: 20,
	label: 'Atasözü',
	prepare: (q, R) => prepChoice(q, R),
	mount(el, v, api) {
		css('pick', CSS);
		const [pre, post] = v.q.text.split('___');
		el.innerHTML = `<div class="fl-prv">${esc(pre)}<span class="fl-blank">&nbsp;?&nbsp;</span>${esc(post || '')}</div><div data-r="o"></div>`;
		const blank = el.querySelector('.fl-blank');
		const ctl = mountChoice(el.querySelector('[data-r=o]'), v, api, {
			onPick(i) {
				blank.textContent = v.opts[i];
				blank.classList.add('set');
			},
		});
		const f = optFit(el.querySelector('[data-r=o]'));
		return {
			lock: ctl.lock,
			reveal(results) {
				ctl.reveal(results);
				f.refit();
				const mine = ctl.mine;
				blank.classList.add('set');
				if (mine === v.right) blank.classList.add('right');
				else {
					if (mine != null) blank.classList.add('wrong');
					blank.textContent = v.opts[mine ?? v.right];
					setTimeout(() => {
						blank.classList.remove('wrong');
						blank.classList.add('right');
						blank.textContent = v.opts[v.right];
					}, 650);
				}
			},
			destroy() {},
		};
	},
	...choiceKind({ bot: (v, s, R) => choiceBot(v, s, R, [0.05, 0.75], 0.03) }),
};

// ---------------------------------------------------------------- riddle
export const riddle = {
	time: 26, // iki dizelik bilmece: dizeler okunur, ipuçları tartılır (timing.test ortancası)
	label: 'Bilmece',
	prepare: (q, R) => prepChoice(q, R),
	mount(el, v, api) {
		css('pick', CSS);
		el.closest('.fl-q')?.classList.add('ri');
		// ipucu sözcükleri (q.k) dizede işaretlenir; cevap açılınca sırayla yanar
		let j = 0;
		const mark = (s) => {
			let h = esc(s);
			for (const k of v.q.k || []) {
				const e = esc(k);
				if (h.includes(e)) h = h.replace(e, `<em style="--j:${j++}">${e}</em>`);
			}
			return h;
		};
		const lines = String(v.q.q || '').split('\n');
		const long = String(v.q.q || '').length > 92;
		el.innerHTML = `<div class="fl-sir${long ? ' s-lg' : ''}"><div class="hd"><span>BİL BAKALIM</span></div>${lines
			.map((s, i) => `<p style="--i:${i}">${mark(s)}</p>`)
			.join('')}<span class="qm">?</span></div><div data-r="o"></div>`;
		const card = el.querySelector('.fl-sir');
		// filigran kartın boyuna sığsın: dönüşle birlikte işaretin dikey payı ~1,1 em
		const qm = card.querySelector('.qm');
		const fitQm = () => {
			if (!qm.isConnected) return;
			qm.style.fontSize = '';
			const base = parseFloat(getComputedStyle(qm).fontSize) || 88;
			const h = card.clientHeight;
			if (h) qm.style.fontSize = Math.max(30, Math.min(base, Math.floor((h - 16) / 1.16))) + 'px';
		};
		fitQm();
		requestAnimationFrame(fitQm);
		const ctl = mountChoice(el.querySelector('[data-r=o]'), v, api);
		const f = optFit(el.querySelector('[data-r=o]'));
		return {
			lock: ctl.lock,
			reveal(results) {
				ctl.reveal(results);
				f.refit();
				const mine = ctl.mine;
				const st = mine == null ? 'nt' : mine === v.right ? 'ok' : 'no';
				card.classList.add('s-on', 's-' + st);
				card.querySelector('.hd').innerHTML = `<span>CEVAP</span><b class="an">${esc(String(v.opts[v.right] ?? '').toLocaleUpperCase('tr-TR'))}</b>`;
				card.insertAdjacentHTML('beforeend', `<span class="sl"><svg viewBox="0 0 24 24"><path d="${st === 'no' ? 'M6 6l12 12M18 6L6 18' : 'M5 12.5l4.5 4.5L19 7'}"/></svg></span>`);
			},
			destroy() {},
		};
	},
	...choiceKind({ bot: (v, s, R) => choiceBot(v, s, R, [0.1, 0.85], -0.02) }),
};
