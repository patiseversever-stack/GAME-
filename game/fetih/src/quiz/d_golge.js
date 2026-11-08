// GÖLGE OYUNU: Karagöz perdesi. Arkadan fenerle aydınlatılmış sıcak bir kumaşa bir yapının yalnız gölgesi düşer
// (Kazı Kazan’ın 99 yapı görselinden: görselin saydam olmayan her pikseli kapkara). Başta fener yanda: gölge yamuk,
// basık ve bulanık; süre ilerledikçe fener öne gelir, gölge düzelir ve netleşir. Perdenin altında üç ipucu sırayla
// açılır: bölge ya da kıta, yapının türü, adın ilk harfi. Erken bilen kazanır (düelloda ikisi de bilirse hızlı olan).
//
// İmza anı (cevap): perde ortadan ikiye ayrılıp kıvrılarak iki yana toplanır; gölge söner, aynı yerde yapının kendisi
// renkleriyle, sıcak altın ışıkta belirir (gölge gerçeğe dönüşür), arkada huzmeler döner, havada toz zerreleri uçar,
// adı ve yeri koyu cam bir plakada yükselir.
//
// Veri (src/data/ek/golge.js + kazi.js): img, a [doğru, y1, y2, y3], ad, il ya da yer, alt, ipucu [bölge, tür, harf].
// Değer: şık indeksi. Tür 'exact' (bildi/bilemedi; eşitlikte süre). Jokerler: 50/50 ve seyirci (şıklı tip).
// Görseller sayfanın yanında yoksa (yapiHazir() false) tip maçta seçilmez. Harita arkada çizilmez (tam ekran kart).

import { css, esc, shuffle, pCorrect, mountChoice, clamp } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, onClose, onOpen, sfx, rule, stampLater, LOOK, DENEME_CSS } from './d_ortak.js';
import { setTimeout, clearTimeout } from '../core/clock.js';
import { yapiOnyukle, YAPI_BASE } from './d_kazi.js';
import { ney } from '../audio/voices.js';
import { degHz } from '../audio/scales.js';
import DATA from '../data/turkiye.json';

const ILLER = new Map(DATA.provinces.map((p) => [p.id, p.name]));

/** Filmin payları: ipuçlarının açıldığı anlar (filmin oranı olarak). Film, soru süresinin %86’sı. */
export const IPUCU_AN = [0.28, 0.52, 0.76];
export const filmOf = (sec) => Math.max(8, Math.min(sec || 20, 40) * 0.86);

// ---------------------------------------------------------------- ses (oyunun ses motoru; yoksa sessiz)

function sesOf(app) {
	const sx = app?.sfx;
	const e = sx?.e;
	const ok = () => !!(e?.ctx && e.ctx.state === 'running' && !sx.muted);
	const U = (d) => degHz('ussak', d);
	const safe = (fn) => {
		try {
			if (ok()) fn(e, e.ctx.currentTime + 0.02);
		} catch {
			/* ses yoksa sessiz */
		}
	};
	return {
		// perde aydınlanır: ney nefesi ve fener çıtırtısı
		open() {
			safe((e, t) => {
				ney(e, t + 0.15, U(4), 2.2, 0.055, { attack: 0.9, release: 1.2, scoop: 30 });
				for (let i = 0; i < 4; i++) e.noise(t + Math.random() * 0.6, 0.03, 0.015, 2600 + Math.random() * 2400, 1500, { q: 1.6, a: 0.003, pan: Math.random() * 0.6 - 0.3 });
			});
		},
		// ipucu açıldı: def ve ince çan
		ipucu(k) {
			safe((e, t) => {
				e.hit('def', t, 0.06, 0.95 + k * 0.04, -0.2);
				e.hit('chime', t + 0.08, 0.07, U(7 + k * 2) / 880, 0.2);
			});
		},
		// cevap: kumaş hışırtısı, ney yükselir, çan
		reveal(good) {
			safe((e, t) => {
				e.noise(t, 1.1, 0.04, 700, 3400, { q: 0.7, a: 0.4 });
				ney(e, t + 0.25, U(2), 0.8, 0.07, { attack: 0.3, release: 0.4, scoop: 40 });
				ney(e, t + 0.95, U(good ? 7 : 4), 2.2, 0.075, { attack: 0.35, release: 1.5, scoop: 30 });
				e.hit('chime', t + 1.0, 0.12, U(11) / 880, 0.2);
			});
		},
	};
}

// ---------------------------------------------------------------- görünüm

const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor"/></svg>';
const PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c-4 0-7 3-7 6.9 0 5 7 12.1 7 12.1s7-7.1 7-12.1c0-3.9-3-6.9-7-6.9zm0 9.6a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4z"/></svg>';
const GLOBE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
const IP_AD = ['BÖLGE', 'TÜR', 'İLK HARF'];

const CSS = /* css */ `
.gg{--film:20s;display:flex;flex-direction:column;gap:8px;min-height:0}
.fl-q.cover .gg{flex:1 1 auto}
/* sahne: çerçeve, perdenin arkası (altın ışıklı oda ve yapı), perde (iki kanat), gölge, fener ışığı, plaka */
.gg-sah{position:relative;flex:1 1 auto;min-height:110px;max-height:74cqw;border-radius:10px;overflow:hidden;container-type:size;background:#140a04;
  box-shadow:0 0 0 2px #2a1406,0 0 0 4px #c8962e,0 0 0 5.5px #5a1a0e,0 14px 28px rgba(0,0,0,.55),0 0 30px rgba(255,150,60,.18)}
.gg-arka{position:absolute;inset:0;background:radial-gradient(70% 60% at 50% 62%,#6a3a14 0%,#2a1408 55%,#0d0703 100%)}
.gg-hz{position:absolute;left:50%;top:60%;width:180cqmax;height:180cqmax;margin:-90cqmax 0 0 -90cqmax;border-radius:50%;opacity:0;transition:opacity 1.2s .4s;
  background:repeating-conic-gradient(from 0deg,rgba(255,210,130,.28) 0deg 6deg,transparent 6deg 18deg);-webkit-mask:radial-gradient(closest-side,#000,rgba(0,0,0,.5) 35%,transparent 72%);mask:radial-gradient(closest-side,#000,rgba(0,0,0,.5) 35%,transparent 72%)}
.gg-zemin{position:absolute;left:50%;bottom:6%;width:74%;height:13%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(closest-side,rgba(255,190,110,.35),transparent)}
.gg-yap,.gg-gol{position:absolute;left:50%;bottom:10%;max-width:80%;max-height:74%;width:auto;height:auto;transform-origin:50% 100%;pointer-events:none;user-select:none}
.gg-yap{opacity:0;transform:translateX(-50%) scale(.94);filter:drop-shadow(0 10px 14px rgba(0,0,0,.6)) brightness(.6) sepia(.4);transition:opacity .9s .35s,transform 1.6s .3s cubic-bezier(.25,.8,.3,1),filter 1.4s .4s}
.gg-toz{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 1s .6s;
  background:radial-gradient(1.5px 1.5px at 18% 30%,rgba(255,226,170,.9) 98%,transparent),radial-gradient(1px 1px at 32% 62%,rgba(255,226,170,.8) 98%,transparent),radial-gradient(1.5px 1.5px at 66% 24%,rgba(255,226,170,.9) 98%,transparent),radial-gradient(1px 1px at 80% 54%,rgba(255,226,170,.8) 98%,transparent),radial-gradient(1.2px 1.2px at 48% 44%,rgba(255,226,170,.85) 98%,transparent),radial-gradient(1px 1px at 88% 30%,rgba(255,226,170,.7) 98%,transparent),radial-gradient(1.2px 1.2px at 10% 70%,rgba(255,226,170,.75) 98%,transparent);
  background-size:100% 100%}
/* perde: sıcak, arkadan aydınlatılmış kumaş; atkı ve çözgü iplikleri; iki kanat kesintisiz tek kumaş gibi görünür */
.gg-perde{position:absolute;inset:0}
.gg-pl,.gg-pr{position:absolute;top:0;bottom:0;width:50.5%;transition:transform 1.25s cubic-bezier(.6,.05,.25,1);
  background:repeating-linear-gradient(0deg,rgba(90,40,10,.07) 0 1px,transparent 1px 3px),repeating-linear-gradient(90deg,rgba(90,40,10,.06) 0 1px,transparent 1px 3px),
    radial-gradient(75% 85% at 50% 58%,#fff1c8 0%,#ffd890 22%,#f2a752 52%,#b4561c 82%,#5a240a 100%);background-size:auto,auto,200% 100%}
.gg-pl{left:0;transform-origin:0 50%;background-position:0 0,0 0,0 0}
.gg-pr{right:0;transform-origin:100% 50%;background-position:0 0,0 0,100% 0}
.gg-pl::after,.gg-pr::after{content:'';position:absolute;inset:0;opacity:0;transition:opacity .5s;background:repeating-linear-gradient(90deg,rgba(60,20,0,.42) 0 5px,rgba(255,230,180,.12) 5px 9px,rgba(60,20,0,.18) 9px 14px)}
/* gölge: görselin kendisi kapkara; fener yanda başlar (yamuk, basık, bulanık), öne geldikçe düzelir ve netleşir */
.gg-golk{position:absolute;inset:0;pointer-events:none;transition:opacity .45s}
.gg-gol{opacity:.55;mix-blend-mode:multiply;filter:brightness(0) blur(14px);transform:translateX(-50%) skewX(22deg) scaleX(.5) scaleY(.9);animation:ggNet var(--film) cubic-bezier(.3,.1,.4,1) forwards;transition:opacity .55s}
.gg-alev{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;background:radial-gradient(48% 42% at 50% 60%,rgba(255,200,120,.32),transparent 70%);animation:ggAlev 2.7s steps(9,end) infinite}
.gg-cer{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 0 3px #2a1406,inset 0 0 0 5px rgba(200,150,46,.85),inset 0 0 0 8px rgba(122,28,18,.9),inset 0 0 0 9.5px rgba(200,150,46,.5),inset 0 0 46px rgba(40,10,0,.75)}
.gg-cer::before,.gg-cer::after{content:'';position:absolute;bottom:12px;width:14px;height:14px;transform:rotate(45deg);background:#c8962e;box-shadow:0 0 0 2px #5a1a0e}
.gg-cer::before{left:12px}.gg-cer::after{right:12px}
/* imza anı */
.gg.ac .gg-pl{transform:translateX(-82%) scaleX(.22)}
.gg.ac .gg-pr{transform:translateX(82%) scaleX(.22)}
.gg.ac .gg-pl::after,.gg.ac .gg-pr::after{opacity:1}
.gg.ac .gg-golk{opacity:0} /* gölge söner: sarmalayıcı söner (gölgenin kendi opaklığını netleşme devinimi tutar) */
.gg.ac .gg-gol{animation-play-state:paused}
.gg.ac .gg-alev{opacity:0;transition:opacity .4s}
.gg.ac .gg-yap{opacity:1;filter:drop-shadow(0 10px 14px rgba(0,0,0,.6)) drop-shadow(0 0 22px rgba(255,190,90,.4)) brightness(1.04) saturate(1.05);transform:translate(-50%,var(--ty,-12cqh)) scale(var(--sc,.9))}
.gg.ac .gg-hz{opacity:.55;animation:ggHz 10s linear infinite}
.gg.ac .gg-toz{opacity:1;animation:ggToz 6s linear infinite}
.gg-pl2{position:absolute;left:50%;bottom:4%;z-index:5;width:max-content;max-width:92%;display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 14px 6px;
  transform:translate(-50%,40%);opacity:0;pointer-events:none;text-align:center;color:#fff;background:linear-gradient(180deg,rgba(40,20,8,.94),rgba(14,7,2,.96));
  box-shadow:inset 0 0 0 1.5px #ffd25a,inset 0 1px 0 rgba(255,255,255,.2),0 10px 22px rgba(0,0,0,.6),0 0 22px rgba(255,190,90,.3);clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)}
.gg-pl2 b{max-width:100%;font:400 clamp(15px,5.2cqw,22px)/1.05 'Lilita One',sans-serif;letter-spacing:.02em;text-wrap:balance;background:linear-gradient(180deg,#fff 30%,#ffd25a);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 1px 0 rgba(0,0,0,.6))}
.gg-pl2 span{display:flex;align-items:center;justify-content:center;gap:5px;max-width:100%;font:italic 800 clamp(12px,3.6cqw,14px)/1.1 'Barlow Condensed',sans-serif;letter-spacing:.06em;color:rgba(255,236,210,.92);text-transform:uppercase}
.gg-pl2 span svg{flex:none;width:13px;height:13px;fill:#ff6a5a;color:#ffd25a}
.gg-pl2 span em{flex:none;padding:0 5px;font:italic 900 12px/16px 'Barlow Condensed',sans-serif;color:#1a0d00;background:#ffd25a;font-style:normal;transform:skewX(-8deg)}
.gg-pl2 i{max-width:100%;font:500 clamp(11.5px,3.4cqw,13.5px)/1.2 'Fredoka',sans-serif;font-style:normal;color:rgba(255,236,200,.86);text-wrap:balance}
.gg.ac .gg-pl2{animation:ggPlaka .55s .9s cubic-bezier(.3,1.5,.5,1) both}
@container (max-height:170px){.gg-pl2{padding:3px 12px 4px;gap:1px}.gg-pl2 b{font-size:15px}.gg-pl2 i{display:none}}
/* ipuçları: perdenin üst kenarında üç eğik plaka; kilitliyken süre dolduran ince çubuk, açılınca döner ve altın ışır.
   Cevapta söner (plaka ve resim konuşur). Gölge ve resim plakaların altında başlar (tepeleri %18'den aşağıda). */
.gg-ip{position:absolute;left:14px;right:14px;top:12px;z-index:4;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;transition:opacity .4s}
.gg.ac .gg-ip{opacity:0}
.gg-i{position:relative;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:1px;min-height:32px;padding:3px 8px 4px;transform:skewX(-8deg);background:rgba(18,26,58,.86);box-shadow:inset 0 0 0 1.5px rgba(255,210,90,.3),0 4px 10px rgba(40,10,0,.35);overflow:hidden}
.gg-i>*{transform:skewX(8deg)}
.gg-i small{font:italic 800 9.5px/1 'Barlow Condensed',sans-serif;letter-spacing:.14em;color:rgba(255,226,180,.72);white-space:nowrap}
.gg-i b{display:flex;align-items:center;gap:4px;min-width:0;font:600 12.5px/1.12 'Fredoka',sans-serif;color:#fff;overflow-wrap:anywhere}
.gg-i b svg{flex:none;width:11px;height:11px;color:rgba(255,226,180,.55)}
.gg-i b.harf{font:400 17px/1 'Lilita One',sans-serif;color:#ffd25a}
.gg-i u{position:absolute;left:0;bottom:0;height:2.5px;width:100%;background:linear-gradient(90deg,#ffd25a,#ff8a3a);transform-origin:0 50%;transform:skewX(8deg) scaleX(0);animation:ggDol var(--d,5s) linear forwards}
.gg-i.acik{background:linear-gradient(170deg,rgba(80,44,12,.94),rgba(42,20,6,.94));box-shadow:inset 0 0 0 1.5px #ffd25a,0 0 14px rgba(255,190,90,.4);animation:ggAc .5s cubic-bezier(.3,1.5,.5,1)}
.gg-i.acik u{display:none}
.gg.rv .gg-i u{animation-play-state:paused}
.gg-yap,.gg-gol{max-height:68%}
@container (max-height:230px){.gg-yap,.gg-gol{max-height:58%;bottom:8%}}
/* şıklar: uzun adda bile iki sütun (ortak kural 17 harfi geçince tek sütuna dizer; burada perdeye yer kalsın): ad heceden bölünür */
.gg .fl-opts{gap:7px}
.gg .fl-opts.one{grid-template-columns:1fr 1fr}
.gg .fl-opt{min-height:46px}
.gg .fl-opts.one .fl-opt{font-size:16.5px;line-height:1.12}
.gg .fl-opt>span{overflow-wrap:normal;word-break:normal;hyphens:none;line-height:1.12} /* kelime ortadan bölünmez; sığmazsa yazı küçülür (sigdir) */
@media (max-height:700px){
  .gg{gap:6px}
  .gg .fl-opt{min-height:42px;font-size:16.5px}
}
@media (max-height:600px){
  .gg-sah{min-height:84px}
  .gg .fl-opts{gap:6px}
  .gg .fl-opt{min-height:38px;font-size:15.5px}
  .gg .fl-opts.one .fl-opt{font-size:15px}
}
@keyframes ggDol{to{transform:skewX(8deg) scaleX(1)}}
@keyframes ggNet{0%{opacity:.5;filter:brightness(0) blur(14px);transform:translateX(-50%) skewX(22deg) scaleX(.5) scaleY(.9)}38%{opacity:.68;filter:brightness(0) blur(8px);transform:translateX(-50%) skewX(12deg) scaleX(.72) scaleY(.95)}72%{opacity:.8;filter:brightness(0) blur(3px);transform:translateX(-50%) skewX(4deg) scaleX(.92)}100%{opacity:.86;filter:brightness(0) blur(.4px);transform:translateX(-50%)}}
@keyframes ggAlev{0%,100%{opacity:.9}11%{opacity:.72}23%{opacity:1}37%{opacity:.8}52%{opacity:.95}64%{opacity:.7}78%{opacity:1}90%{opacity:.84}}
@keyframes ggHz{to{transform:rotate(360deg)}}
@keyframes ggToz{0%{background-position:0 0}100%{background-position:0 -30px}}
@keyframes ggPlaka{0%{opacity:0;transform:translate(-50%,40%) scale(.92)}100%{opacity:1;transform:translate(-50%,0)}}
@keyframes ggAc{0%{transform:skewX(-8deg) rotateX(90deg)}100%{transform:skewX(-8deg)}}
@media (prefers-reduced-motion:reduce){.gg-alev,.gg.ac .gg-hz,.gg.ac .gg-toz{animation:none}}
`;

// en son açılan Gölge kartı: eski kartın zamanlayıcıları yenisini bozmasın
let LIVE = 0;

/** İpuçları: [bölge ya da kıta, yapının türü, adın ilk harfi]. Türkiye’de coğrafi bölge turkiye.json’dan. */
const BOLGE = { akdeniz: 'Akdeniz', guneydogu: 'Güneydoğu Anadolu', ege: 'Ege', dogu: 'Doğu Anadolu', karadeniz: 'Karadeniz', icanadolu: 'İç Anadolu', marmara: 'Marmara' };
const IL_BOLGE = new Map(DATA.provinces.map((p) => [p.id, p.region]));
export function ipucuOf(q) {
	const b = q.ip1 || (q.il ? BOLGE[IL_BOLGE.get(q.il)] || '' : q.kita || ''); // Türkiye’de bölgenin adı (Marmara), dışarıda kıta
	const harf = [...String(q.a?.[0] || '').trim()][0]?.toLocaleUpperCase('tr') || '';
	return [b, q.tur || '', harf];
}

export const golge = {
	time: 24,
	label: 'Gölge Oyunu',
	kind: 'exact',
	cover: true, // tam ekran perde (harita arkada çizilmez)
	calm: true,
	rule: 'Erken bilen kazanır',
	prepare(q, R) {
		const order = shuffle([0, 1, 2, 3], R);
		const v = { q, opts: order.map((i) => q.a[i]), right: order.indexOf(0), ipucu: ipucuOf(q) };
		stamp(v, q, (q2, k, P, text) => {
			for (const a of q2.a) text(a);
			return {
				// perde aydınlanır, gölge birkaç saniye netleşir; ipuçları sırayla açılır
				wait: 0.5 + 1 + 4,
				look: LOOK.orient + 4 * LOOK.gaze + LOOK.image,
			};
		});
		return v;
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('golge2', CSS);
		const app = appOf();
		const me = ++LIVE;
		const q = v.q;
		const FILM = filmOf(v.sec);
		const ip = v.ipucu || ipucuOf(q);
		const sesA = sesOf(app);
		el.innerHTML = `<div class="gg" style="--film:${FILM.toFixed(2)}s">
			<div class="gg-sah">
				<div class="gg-arka"><i class="gg-hz"></i><i class="gg-zemin"></i><img class="gg-yap" alt="" draggable="false"><i class="gg-toz"></i></div>
				<div class="gg-perde"><i class="gg-pl"></i><i class="gg-pr"></i></div>
				<i class="gg-golk"><img class="gg-gol" alt="" draggable="false"></i><i class="gg-alev"></i><i class="gg-cer"></i>
				<div class="gg-ip">${IP_AD.map((ad, k) => `<div class="gg-i" data-k="${k}" style="--d:${(FILM * IPUCU_AN[k]).toFixed(2)}s"><small>${ad}</small><b>${LOCK}<span>…</span></b><u></u></div>`).join('')}</div><div class="gg-pl2"></div>
			</div>
			<div data-r="o"></div>
		</div>`;
		rule(el, 'Erken bilen kazanır');
		const root = el.querySelector('.gg');
		const sah = root.querySelector('.gg-sah');
		const yap = sah.querySelector('.gg-yap');
		const gol = sah.querySelector('.gg-gol');
		const plaka = sah.querySelector('.gg-pl2');
		const ips = [...root.querySelectorAll('.gg-i')];
		const c = mountChoice(root.querySelector('[data-r=o]'), v, api, { onPick: () => sfx(app, 'tap') });
		// şık yazısı kelime ortasından bölünmez: bir kelime sığmıyorsa ya da ad iki satırı aşıyorsa o şıkkın yazısı
		// yarım piksel adımlarla küçülür (en az 11 px). Boy değişince, yazı tipi yüklenince yeniden ölçülür.
		const opts = root.querySelector('[data-r=o]');
		const sigdir = () => {
			for (const sp of opts.querySelectorAll('.fl-opt>span')) {
				sp.style.fontSize = '';
				let fs = parseFloat(getComputedStyle(sp).fontSize) || 16;
				const tasar = () => sp.scrollWidth > sp.clientWidth + 0.5 || Math.round(sp.offsetHeight / (fs * 1.12)) > 2;
				while (fs > 11 && tasar()) {
					fs -= 0.5;
					sp.style.fontSize = fs + 'px';
				}
			}
		};
		queueMicrotask(sigdir);
		requestAnimationFrame(() => el.isConnected && sigdir());
		// ortak arayüz uzun adda şık ızgarasına sınıf ekler (yazı boyu değişir): sınıf değişince ve kart oturunca yeniden ölç
		const moOpt = typeof MutationObserver !== 'undefined' ? new MutationObserver(() => el.isConnected && sigdir()) : null;
		const os0 = opts.querySelector('.fl-opts');
		if (os0) moOpt?.observe(os0, { attributes: true, attributeFilter: ['class'] });
		const card0 = el.closest('.fl-q');
		if (card0) moOpt?.observe(card0, { attributes: true, attributeFilter: ['class'] });
		// gerçek saatle (oyun saati duraklayınca da: galeri, duraklatma) ve yazı tipleri yüklenince
		for (const ms of [120, 450, 1200]) globalThis.setTimeout(() => el.isConnected && sigdir(), ms);
		const fontYuk = () => el.isConnected && sigdir();
		document.fonts?.addEventListener?.('loadingdone', fontYuk);
		document.fonts?.ready?.then(() => el.isConnected && sigdir());
		let optW = 0;
		const roOpt = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
			const w = Math.round(opts.clientWidth);
			if (w === optW || !el.isConnected) return; // yalnız genişlik değişince (küçültme yüksekliği değiştirir: döngü olmasın)
			optW = w;
			sigdir();
		}) : null;
		roOpt?.observe(opts);
		// görsel: gölge ve gerçek resim aynı dosya (önden indirilmiş olabilir)
		const im = yapiOnyukle(q);
		const src = im ? im.src : `${YAPI_BASE}${q.img}.webp`;
		yap.src = src;
		gol.src = src;
		// ipuçları: filmin belli anlarında açılır (oyun saatiyle: duraklatınca bekler)
		const timers = [];
		const ac = (k, ses = true) => {
			const d = ips[k];
			if (!d || d.classList.contains('acik') || !ip[k]) return; // çevrimiçinde ilk harf sunucudan gelir
			d.classList.add('acik');
			d.querySelector('b').outerHTML = k === 2 ? `<b class="harf">${esc(ip[2])}</b>` : `<b>${esc(ip[k])}</b>`;
			if (ses) sesA.ipucu(k);
		};
		const stopOpen = onOpen(el, () => {
			sesA.open();
			IPUCU_AN.forEach((u, k) => timers.push(setTimeout(() => LIVE === me && el.isConnected && !root.classList.contains('rv') && ac(k), FILM * u * 1000)));
		});
		const close = onClose(el, () => {
			stopOpen();
			roOpt?.disconnect();
			moOpt?.disconnect();
			document.fonts?.removeEventListener?.('loadingdone', fontYuk);
			for (const t of timers) clearTimeout(t);
			if (LIVE === me) LIVE++;
		});
		return {
			lock() {
				c.lock();
			},
			/** Çevrimiçi: sunucudan gelen ipucu (ilk harf, zamanı gelince). */
			ipucu(k, text) {
				ip[k] = String(text || '');
				ac(k);
			},
			reveal(results) {
				c.reveal(results);
				if (!ip[2]) ip[2] = ipucuOf(q)[2] || '';
				for (const t of timers) clearTimeout(t);
				root.classList.add('rv');
				IP_AD.forEach((_, k) => ac(k, false));
				const il = q.il ? ILLER.get(q.il) || '' : '';
				const yer = q.il ? `${PIN}${esc(il)}<em>${String(q.il).padStart(2, '0')}</em>` : `${GLOBE}${esc(q.yer || '')}`;
				plaka.innerHTML = `<b>${esc(q.ad || q.a[0])}</b><span>${yer}</span>${q.alt ? `<i>${esc(q.alt)}</i>` : ''}`;
				// yapı plakanın üstüne sığar: alt kenarı plakanın 6 px üstünde, tepesi sahnenin %4'ünden aşağıda
				const P = sah.getBoundingClientRect();
				const B = yap.getBoundingClientRect();
				if (P.height && B.height) {
					const plTop = P.bottom - P.height * 0.04 - plaka.offsetHeight;
					const room = plTop - 6 - (P.top + P.height * 0.04);
					const sc = clamp(room / (B.height / 0.94), 0.45, 1);
					yap.style.setProperty('--sc', sc.toFixed(3));
					yap.style.setProperty('--ty', `${(plTop - 6 - B.bottom).toFixed(1)}px`);
				}
				const meR = results.find((r) => r.p?.human);
				const good = !!(meR && golge.judge(v, meR.value).correct);
				requestAnimationFrame(() => {
					if (LIVE !== me || !el.isConnected) return;
					root.classList.add('ac');
					sesA.reveal(good);
				});
				if (meR && app) {
					if (meR.value == null) stampLater(app, 'CEVAP YOK', 'warn', `Doğrusu: ${q.a[0]}`);
					else if (good) stampLater(app, 'BİLDİN!', 'gold', `${Math.max(0.1, meR.time || 0).toFixed(1)} sn’de`);
					else stampLater(app, 'YANLIŞ', 'bad', `Doğrusu: ${q.a[0]}`);
				}
			},
			destroy: close,
		};
	},
	/**
	 * Çevrimiçi görünüm: doğru şık, ad, yer, bilgi ve ilk harf yok (şıkların baş harfleri farklı: harf cevabın kendisi).
	 * İlk harf sunucudan, açılma anında gelir (sunucu.js ADIM.golge → 'ipucu'). Görsel numarası gölge için gerekir.
	 */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		if (Array.isArray(o.ipucu)) o.ipucu[2] = '';
		delete o.right;
		delete o.q.a;
		delete o.q.ad;
		delete o.q.alt;
		delete o.q.il;
		delete o.q.yer;
		return o;
	},
	judge(v, value) {
		return { correct: value === v.right, err: value === v.right ? 0 : 1 };
	},
	/** Ortak sınama için doğru ve yanlış örnek. */
	probe(v) {
		return { good: v.right, bad: (v.right + 1) % 4 };
	},
	bot(v, skill, R) {
		// bot da gölge netleştikçe ve ipuçları açıldıkça bilir: cevap anındaki açık ipucu başına +%8
		const time = botTime(v, R, skill, 0.3, 0.95);
		const F = filmOf(v.sec);
		const acik = IPUCU_AN.filter((u) => time >= F * u).length;
		const ok = R() < Math.min(0.96, pCorrect(skill, v.q.diff) + 0.04 + 0.08 * acik);
		let value = v.right;
		if (!ok) do value = Math.floor(R() * 4); while (value === v.right);
		return { value, time };
	},
};
