// KAZI KAZAN: koyu, altın çizgili premium bir kazı kazan bileti. Metal folyonun altında 100 yapıdan birinin resmi
// (dist/yapi/<no>.webp, beyaz zemini saydam) kendi sahnesinde durur: temaya göre gündüz, gün batımı ya da gece göğü,
// arkasında ışık huzmeleri, ayağının dibinde gölge. Parmağınla kazırsın: madeni para izi gibi pürüzlü silgi, kenarında
// folyonun kalkık gölgesi, saçılan metal kırıntılar, kazıma sesi. Az kazıyan çok kazanır: "KALAN PUAN" her kazımada düşer.
//
// İmza anı (cevap): folyo soyulmaz; altın bir madeni para kendiliğinden belirir ve kalan folyoyu satır satır, sesiyle,
// kırıntısıyla kazıyarak temizler. Sonra sahne aydınlanır (yapı hafifçe öne gelir, huzmeler döner), resmin üstünden bir
// parıltı geçer, yapının adı ve yeri koyu cam bir plakada yükselir; biletin alt şeridinde herkesin puanı ve kazıdığı pay.
//
// Veri (src/data/ek/kazi.js): img (görsel no), a [doğru, y1, y2, y3], ad, il (Türkiye: plaka) ya da yer (yurt dışı),
//       alt (plakanın ikinci satırı), tema ('gunduz' | 'batim' | 'gece'), folyo ('gumus' | 'altin' | 'holo': zorluk 1–3).
// Değer: { i: şık, s: kazınan pay 0..1 }. Tür 'closest': doğruysa err = (100 − puan) / 100 (az kazıyan önde, eşitlikte
//        hız), yanlışsa err 2. Puan kuralı (puanOf): 100 − 90 · min(1, pay / 0,7); doğru cevap en az 10.
// Bot: botTime'dan bir cevap anı; o ana dek kazıdığı pay beceriyle azalır, doğruluk pCorrect + kazıdıkça artan tanıma payı.
// Görseller sayfanın yanında yoksa (yapiHazir() false) tip maçta seçilmez.
// Jokerler: yarı yarıya ve seyirci (şıklı tipin ortak etkileri).

import { css, esc, shuffle, pCorrect, mountChoice, buzz, clamp } from './util.js';
import { optFit } from './t_pick.js';
import { botTime } from './timing.js';
import { appOf, stamp, onClose, onOpen, rule, stampLater, sfx, LOOK, ACT, DENEME_CSS } from './d_ortak.js';
import { clock, setTimeout, clearTimeout } from '../core/clock.js';
import { degHz } from '../audio/scales.js';
import DATA from '../data/turkiye.json';

const ILLER = new Map(DATA.provinces.map((p) => [p.id, p.name]));

/** Puan kuralı: hiç kazımadan 100, payın %70'i kazınınca 10 (doğru cevabın tabanı). */
export const PUAN = { tam: 100, taban: 10, son: 0.7 };
export const puanOf = (s) => Math.round(PUAN.tam - (PUAN.tam - PUAN.taban) * clamp((Number(s) || 0) / PUAN.son, 0, 1));
/** Kazıma ızgarası (pay ölçümü): pencere bu kadar hücreye bölünür. */
const GX = 64;
const GY = 40;

// ---------------------------------------------------------------- görseller (sayfanın yanındaki yapi/ klasörü)
export const YAPI_BASE = 'yapi/';
let OK = typeof Image === 'undefined' ? true : null; // node (sunucu, testler): karar istemcide
/** Görseller sayfanın yanında mı? Bilinmiyorsa (yoklama sürüyor) true; yoklama başarısızsa false. */
export function yapiHazir() {
	if (OK === null) {
		OK = true;
		const im = new Image();
		im.onerror = () => (OK = false);
		im.src = YAPI_BASE + '01.webp';
	}
	return OK;
}
const IMG = new Map(); // no → HTMLImageElement (yüklenen ya da yüklenmekte)
/** Görseli önden indir (kart açılmadan). */
export function yapiOnyukle(q) {
	if (typeof Image === 'undefined' || !q?.img || IMG.has(q.img)) return IMG.get(q?.img);
	const im = new Image();
	im.decoding = 'async';
	im.src = `${YAPI_BASE}${q.img}.webp`;
	IMG.set(q.img, im);
	return im;
}

// ---------------------------------------------------------------- ses (oyunun ses motoru; yoksa sessiz)

function sesOf(app) {
	const sx = app?.sfx;
	const e = sx?.e;
	const ok = () => !!(e?.ctx && e.ctx.state === 'running' && !sx.muted);
	const safe = (fn) => {
		try {
			if (ok()) fn(e, e.ctx.currentTime + 0.01);
		} catch {
			/* ses yoksa sessiz */
		}
	};
	const R = (d) => degHz('rast', d);
	return {
		// kazıma: kısa, dar bantlı gürültü taneleri (hıza göre yüksek ve yoğun)
		kazi(sp) {
			safe((e, t) => {
				const v = Math.min(0.09, 0.025 + sp * 0.03);
				e.noise(t, 0.045 + Math.random() * 0.03, v, 2600 + Math.random() * 2600, 1800 + Math.random() * 1200, { q: 2.4, a: 0.004, pan: Math.random() * 0.5 - 0.25 });
			});
		},
		// ilk temas: madeni para tıkırtısı
		para() {
			safe((e, t) => {
				e.hit('tink', t, 0.28, 1.25);
				e.hit('tink', t + 0.05, 0.16, 1.6);
			});
		},
		// puan basamağı düştü (her 10 puanda bir): tahta tıkı
		basamak(n) {
			safe((e, t) => e.hit('woodTap', t, 0.22, 1.1 + (n % 5) * 0.06));
		},
		// otomatik kazıma: para düşer (çınlama), sonra satır satır hızlı kazıma (satır dönüşlerinde kısa vurgu)
		oto(ms, rows) {
			safe((e, t) => {
				e.hit('tink', t, 0.3, 1.1);
				e.hit('tink', t + 0.06, 0.2, 1.45);
				const d = ms / 1000;
				for (let k = 0; k < Math.round(d / 0.05); k++) {
					const tt = t + 0.12 + k * 0.05;
					e.noise(tt, 0.06, 0.07, 2400 + Math.random() * 2800, 1600 + Math.random() * 1400, { q: 2.2, a: 0.004, pan: Math.sin(k * 0.7) * 0.4 });
				}
				for (let r = 1; r < rows; r++) e.hit('crack', t + 0.12 + (d * r) / rows, 0.07, 1.2 + r * 0.05, (r % 2) - 0.5);
			});
		},
		// sahne aydınlanır, plaka yükselir: çan, kanun ve pirinç çınlaması
		plaka(good) {
			safe((e, t) => {
				e.noise(t, 0.35, 0.05, 2000, 7000, { q: 0.7, a: 0.03 });
				[7, 9, 11, 14].forEach((d, i) => e.hit('chime', t + i * 0.07, 0.16 - i * 0.02, R(d) / 880, -0.4 + i * 0.27));
				e.hit('clang', t + 0.34, 0.2, 1.35);
				if (good) for (const [i, d] of [[0, 7], [1, 9], [2, 11], [3, 14]]) e.pluck('kanun', R(d), t + 0.42 + i * 0.06, 0.32);
			});
		},
	};
}

// ---------------------------------------------------------------- görünüm

const COIN =
	'<svg viewBox="0 0 48 48" aria-hidden="true"><defs><radialGradient id="ynKzC" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#fff6c8"/><stop offset=".45" stop-color="#ffcf4a"/><stop offset="1" stop-color="#b07a12"/></radialGradient></defs><circle cx="24" cy="24" r="21" fill="url(#ynKzC)" stroke="#6a4400" stroke-width="2"/><circle cx="24" cy="24" r="15.5" fill="none" stroke="#8a5a00" stroke-width="1.6" stroke-dasharray="2 2.2"/><path d="M18 26.5l4 4 8-11" fill="none" stroke="#6a4400" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c-4 0-7 3-7 6.9 0 5 7 12.1 7 12.1s7-7.1 7-12.1c0-3.9-3-6.9-7-6.9zm0 9.6a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4z"/></svg>';
const GLOBE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5 10-11" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/></svg>';

// folyo renkleri: [degrade durakları], kabartma (açık, koyu), parıltı
const FOLYO = {
	gumus: { stops: ['#eef1f5', '#a9b1bc', '#dfe4ea', '#8f98a4', '#e9edf2'], hi: 'rgba(255,255,255,.5)', lo: 'rgba(40,48,60,.26)', shine: 'rgba(255,255,255,.75)', name: 'GÜMÜŞ' },
	altin: { stops: ['#fff0b8', '#d6a43a', '#ffe08a', '#b07d22', '#f7d774'], hi: 'rgba(255,250,220,.5)', lo: 'rgba(90,55,0,.28)', shine: 'rgba(255,248,210,.8)', name: 'ALTIN' },
	holo: { stops: ['#e9f1ff', '#b6c2d6', '#f0e6ff', '#9eb0c8', '#e4fbff'], hi: 'rgba(255,255,255,.5)', lo: 'rgba(40,40,80,.24)', shine: 'rgba(255,255,255,.8)', name: 'HOLOGRAM', rainbow: true },
};

const CSS = /* css */ `
.yn-kz{--ac:#d9e6ff;--ac2:#8fb4ff;display:flex;flex-direction:column;gap:9px;min-height:0;user-select:none;-webkit-user-select:none}
.fl-q.cover .yn-kz{flex:1 1 auto}
.yn-kz.f-altin{--ac:#ffd25a;--ac2:#ff9a1f}
.yn-kz.f-holo{--ac:#8af3ff;--ac2:#ff7ad8}
/* bilet: koyu lacivert, altın kılçık çizgiler, yanlarda kesik, üstte logo ve kalan puan, altta oyuncular */
.yn-kz-bilet{position:relative;flex:1 1 auto;display:flex;flex-direction:column;gap:7px;padding:8px 10px 8px;border-radius:14px;isolation:isolate;
  background:
    radial-gradient(120% 70% at 50% 0%,color-mix(in srgb,var(--ac) 16%,transparent),transparent 60%),
    repeating-linear-gradient(115deg,rgba(255,255,255,.028) 0 1px,transparent 1px 7px),
    repeating-linear-gradient(65deg,rgba(255,255,255,.022) 0 1px,transparent 1px 9px),
    linear-gradient(170deg,#121a3c 0%,#0a1028 55%,#060a1c 100%);
  box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--ac) 70%,transparent),inset 0 0 0 4.5px rgba(0,0,0,.35),inset 0 0 0 5.5px color-mix(in srgb,var(--ac) 28%,transparent),0 14px 30px rgba(0,0,0,.55),0 0 26px color-mix(in srgb,var(--ac) 14%,transparent)}
.yn-kz-bilet::before,.yn-kz-bilet::after{content:'';position:absolute;top:50%;width:14px;height:14px;margin-top:-7px;border-radius:50%;background:#070a1a;box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--ac) 55%,transparent)}
.yn-kz-bilet::before{left:-7px}.yn-kz-bilet::after{right:-7px}
.yn-kz-ust{flex:none;display:flex;align-items:center;gap:8px;min-height:30px;padding:0 4px}
.yn-kz-logo{flex:none;display:flex;align-items:center;gap:6px;transform:skewX(-8deg)}
.yn-kz-logo b{font:400 21px/1 'Lilita One',sans-serif;letter-spacing:.02em;background:linear-gradient(180deg,#fff 0%,var(--ac) 60%,var(--ac2) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 0 rgba(0,0,0,.5)) drop-shadow(0 0 10px color-mix(in srgb,var(--ac) 40%,transparent))}
.yn-kz-logo small{padding:3px 6px 2px;font:italic 800 10px/1 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:#0a0f24;background:linear-gradient(180deg,#fff,var(--ac));box-shadow:0 0 10px color-mix(in srgb,var(--ac) 45%,transparent)}
.yn-kz-puan{flex:1 1 auto;min-width:0;display:grid;grid-template-columns:1fr auto;grid-template-rows:auto auto;align-items:end;column-gap:7px;row-gap:3px}
.yn-kz-puan small{grid-column:1;grid-row:1;justify-self:end;font:italic 800 10px/1 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:rgba(220,230,255,.72);white-space:nowrap}
.yn-kz-puan b{grid-column:2;grid-row:1/3;min-width:2.1em;text-align:right;font:italic 900 30px/.9 'Barlow Condensed','Lilita One',sans-serif;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.5),0 0 14px color-mix(in srgb,var(--ac) 55%,transparent);transition:color .3s}
.yn-kz-puan b.bump{animation:ynKzBump .32s cubic-bezier(.3,1.6,.5,1)}
.yn-kz-puan i{grid-column:1;grid-row:2;justify-self:stretch;height:8px;display:flex;gap:2px;transform:skewX(-12deg)}
.yn-kz-puan i u{flex:1;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);transition:background .25s,box-shadow .25s}
.yn-kz-puan i u.on{background:linear-gradient(180deg,#b6ffc4,#29c45a);box-shadow:0 0 6px rgba(80,230,120,.45)}
.yn-kz-puan.mid i u.on{background:linear-gradient(180deg,#ffe58a,#ffaf1f);box-shadow:0 0 6px rgba(255,190,60,.45)}
.yn-kz-puan.low i u.on{background:linear-gradient(180deg,#ffb0a0,#ff4a32);box-shadow:0 0 6px rgba(255,90,60,.45)}
.yn-kz-puan.mid b{color:#ffe7a0}.yn-kz-puan.low b{color:#ffb4a4}
/* pencere: sahne (gök, huzme, yapı, gölge), folyo, parıltı, ipucu, para, plaka */
.yn-kz-pen{position:relative;flex:1 1 auto;min-height:96px;max-height:96cqw;border-radius:9px;overflow:hidden;background:#0b1230;container-type:size;
  box-shadow:0 0 0 1.5px rgba(0,0,0,.6),0 0 0 3px color-mix(in srgb,var(--ac) 75%,transparent),0 0 0 4.5px rgba(0,0,0,.45),0 0 18px color-mix(in srgb,var(--ac) 22%,transparent)}
.yn-kz-pen canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.yn-kz-sah{position:absolute;inset:0;overflow:hidden}
.yn-kz-sah.t-gunduz{background:radial-gradient(70% 55% at 72% 18%,rgba(255,244,214,.55),transparent 60%),linear-gradient(180deg,#1d4f8f 0%,#3f86c4 52%,#9cc9e8 78%,#26476d 78.4%,#14284a 100%)}
.yn-kz-sah.t-batim{background:radial-gradient(60% 50% at 30% 62%,rgba(255,190,110,.65),transparent 62%),linear-gradient(180deg,#24124a 0%,#7a2c6a 40%,#e3794a 70%,#ffc27a 78%,#3a1f3e 78.4%,#1a1028 100%)}
.yn-kz-sah.t-gece{background:radial-gradient(1.2px 1.2px at 12% 18%,#fff 98%,transparent),radial-gradient(1px 1px at 28% 9%,#fff 98%,transparent),radial-gradient(1.4px 1.4px at 47% 22%,#fff 98%,transparent),radial-gradient(1px 1px at 63% 12%,#fff 98%,transparent),radial-gradient(1.2px 1.2px at 86% 27%,#fff 98%,transparent),radial-gradient(1px 1px at 92% 7%,#fff 98%,transparent),radial-gradient(1px 1px at 6% 41%,#fff 98%,transparent),radial-gradient(42% 34% at 80% 16%,rgba(200,220,255,.35),transparent 70%),linear-gradient(180deg,#050a22 0%,#0f1d4a 58%,#24396e 78%,#101a3a 78.4%,#070c22 100%)}
.yn-kz-hz{position:absolute;left:50%;top:58%;width:180cqmax;height:180cqmax;margin:-90cqmax 0 0 -90cqmax;border-radius:50%;opacity:.32;transition:opacity 1s;
  background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.22) 0deg 6deg,transparent 6deg 18deg);-webkit-mask:radial-gradient(closest-side,#000 0%,rgba(0,0,0,.6) 35%,transparent 72%);mask:radial-gradient(closest-side,#000 0%,rgba(0,0,0,.6) 35%,transparent 72%)}
.yn-kz-gl{position:absolute;left:50%;bottom:7%;width:70%;height:12%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.55),transparent)}
.yn-kz-yap{position:absolute;left:50%;bottom:9%;display:block;max-width:86%;max-height:80%;width:auto;height:auto;transform:translateX(-50%);transform-origin:50% 100%;
  filter:drop-shadow(0 8px 10px rgba(0,0,0,.45)) brightness(.9) saturate(.92);transition:transform 1.6s cubic-bezier(.25,.8,.3,1),filter 1.2s ease-out,opacity .4s}
.yn-kz-yap.yok{opacity:0}
.yn-kz-bek{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:italic 800 13px/1 'Barlow Condensed',sans-serif;letter-spacing:.14em;color:rgba(255,255,255,.55)}
.yn-kz-pen .yn-kz-fol{touch-action:none;cursor:pointer;transition:opacity .35s}
.yn-kz.lock .yn-kz-fol{cursor:default}
.yn-kz-pen .yn-kz-sim{pointer-events:none;mix-blend-mode:screen}
.yn-kz-ip{position:absolute;left:50%;top:50%;z-index:3;display:flex;flex-direction:column;align-items:center;gap:4px;transform:translate(-50%,-50%);pointer-events:none;transition:opacity .35s,transform .35s}
.yn-kz-ip span{position:relative;width:48px;height:48px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.35));animation:ynKzSwipe 1.6s ease-in-out infinite}
.yn-kz-ip span svg,.yn-kz-para svg{width:100%;height:100%;display:block}
.yn-kz-ip b{padding:3px 10px 4px;transform:skewX(-8deg);font:italic 900 14px/1.1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.12em;color:#fff;background:rgba(8,12,32,.86);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--ac) 70%,transparent);white-space:nowrap}
.yn-kz-ip.gone{opacity:0;transform:translate(-50%,-40%) scale(.9)}
.yn-kz-para{position:absolute;left:0;top:0;z-index:4;width:40px;height:40px;margin:-20px 0 0 -20px;pointer-events:none;opacity:0;filter:drop-shadow(0 0 10px rgba(255,210,90,.85)) drop-shadow(0 6px 6px rgba(0,0,0,.4));transition:opacity .2s}
.yn-kz-para.on{opacity:1}
.yn-kz-kir{position:absolute;left:0;top:0;z-index:4;width:var(--s,4px);height:var(--s,4px);border-radius:1px;pointer-events:none;background:var(--c,#cfd5dd);box-shadow:inset 0 0 0 .5px rgba(0,0,0,.25);animation:ynKzKir .7s cubic-bezier(.25,.6,.45,1) forwards}
.yn-kz-isi{position:absolute;inset:-10% -60%;z-index:4;pointer-events:none;opacity:0;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,0) 42%,rgba(255,255,255,.8) 50%,rgba(255,255,255,0) 58%,transparent 62%);mix-blend-mode:screen;transform:translateX(-70%)}
/* imza anı: sahne aydınlanır, yapı öne gelir ve plakaya yer açar, huzmeler döner, parıltı geçer */
.yn-kz.ac .yn-kz-yap{filter:drop-shadow(0 8px 12px rgba(0,0,0,.5)) drop-shadow(0 0 18px color-mix(in srgb,var(--ac) 30%,transparent)) brightness(1.06) saturate(1.06);transform:translate(-50%,var(--ty,-12cqh)) scale(var(--sc,.9))}
.yn-kz-gl{transition:transform 1.6s cubic-bezier(.25,.8,.3,1)}
.yn-kz.ac .yn-kz-gl{transform:translate(-50%,var(--ty,-12cqh)) scale(var(--sc,.9))}
.yn-kz.ac .yn-kz-hz{opacity:.6;animation:ynKzHz 9s linear infinite}
.yn-kz.ac .yn-kz-isi{animation:ynKzGlint .85s .25s cubic-bezier(.45,.1,.3,1) both}
/* plaka: koyu cam, altın kenar; ad, yer, bir satır bilgi */
.yn-kz-pl{position:absolute;left:50%;bottom:4%;z-index:5;width:max-content;max-width:92%;display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 14px 6px;
  transform:translate(-50%,40%);opacity:0;pointer-events:none;text-align:center;color:#fff;
  background:linear-gradient(180deg,rgba(20,28,64,.92),rgba(6,10,28,.94));box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--ac) 80%,transparent),inset 0 1px 0 rgba(255,255,255,.25),0 10px 22px rgba(0,0,0,.6),0 0 22px color-mix(in srgb,var(--ac) 30%,transparent);clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)}
.yn-kz-pl b{max-width:100%;font:400 clamp(15px,5.2cqw,22px)/1.05 'Lilita One',sans-serif;letter-spacing:.02em;text-wrap:balance;background:linear-gradient(180deg,#fff 30%,var(--ac));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 1px 0 rgba(0,0,0,.6))}
.yn-kz-pl span{display:flex;align-items:center;justify-content:center;gap:5px;max-width:100%;font:italic 800 clamp(12px,3.6cqw,14px)/1.1 'Barlow Condensed',sans-serif;letter-spacing:.06em;color:rgba(230,238,255,.9);text-transform:uppercase}
.yn-kz-pl span svg{flex:none;width:13px;height:13px;fill:#ff6a5a;color:var(--ac)}
.yn-kz-pl span em{flex:none;padding:0 5px;font:italic 900 12px/16px 'Barlow Condensed',sans-serif;letter-spacing:.06em;color:#0a0f24;background:var(--ac);font-style:normal;transform:skewX(-8deg)}
.yn-kz-pl i{max-width:100%;font:500 clamp(11.5px,3.4cqw,13.5px)/1.2 'Fredoka',sans-serif;font-style:normal;color:rgba(255,240,200,.86);text-wrap:balance}
.yn-kz.ac .yn-kz-pl{animation:ynKzPlaka .55s .45s cubic-bezier(.3,1.5,.5,1) both}
/* alt şerit: oyuncular (soruda rakiplerin kazıdığı pay, cevapta herkesin puanı) */
.yn-kz-oy{flex:none;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:5px 7px;min-height:28px;padding:0 2px}
.yn-kz-oy>small{flex:none;font:italic 800 10px/1 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:rgba(220,230,255,.6)}
.yn-kz-c{position:relative;flex:none;display:flex;align-items:center;gap:5px;height:28px;padding:0 9px 0 3px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1.5px var(--pc,#fff);transform:skewX(-8deg)}
.yn-kz-c>*{transform:skewX(8deg)}
.yn-kz-c .fl-av{flex:none;width:22px;height:22px;border-radius:4px;overflow:hidden;box-shadow:0 0 0 1.5px #fff}
.yn-kz-c .fl-av svg{display:block;width:100%;height:100%}
.yn-kz-c b{font:italic 900 15px/1 'Barlow Condensed','Lilita One',sans-serif;color:#fff;white-space:nowrap}
.yn-kz-c small{font:italic 800 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.04em;color:rgba(255,255,255,.72);white-space:nowrap}
.yn-kz-c i{flex:none;width:14px;height:14px;color:#7dff9a;opacity:0;transform:skewX(8deg) scale(.4);transition:opacity .2s,transform .3s cubic-bezier(.3,1.7,.5,1)}
.yn-kz-c i svg{display:block;width:100%;height:100%}
.yn-kz-c.done i{opacity:1;transform:skewX(8deg) scale(1)}
.yn-kz-c.no i{color:#ff7a66}
.yn-kz-c.win{background:linear-gradient(90deg,#ffe066,#ffbb1f);box-shadow:inset 0 0 0 1.5px #fff,0 0 14px rgba(255,210,90,.55)}
.yn-kz-c.win b,.yn-kz-c.win small{color:#1a1200}
.yn-kz-c.win i{color:#1a7a3a}
.yn-kz-c.me .fl-av{box-shadow:0 0 0 2px #ffd25a}
.yn-kz.ac.iyi .yn-kz-bilet{animation:ynKzIyi 1.2s .5s ease-in-out 2 alternate}
@keyframes ynKzIyi{to{box-shadow:inset 0 0 0 1.5px var(--ac),inset 0 0 0 4.5px rgba(0,0,0,.35),inset 0 0 0 5.5px color-mix(in srgb,var(--ac) 50%,transparent),0 14px 30px rgba(0,0,0,.55),0 0 40px color-mix(in srgb,var(--ac) 45%,transparent)}}
.yn-kz.rv .yn-kz-c{animation:ynKzRow .4s calc(.2s + var(--k,0) * .09s) cubic-bezier(.2,.9,.3,1.3) both}
.yn-kz .fl-opts{gap:8px}
.yn-kz .fl-opt{min-height:48px}
@media (max-height:700px){
  .yn-kz{gap:7px}
  .yn-kz-bilet{gap:5px;padding:6px 8px 6px}
  .yn-kz-logo b{font-size:18px}
  .yn-kz-puan b{font-size:26px}
  .yn-kz .fl-opt{min-height:42px;font-size:17px}
  .yn-kz-oy{min-height:24px}
  .yn-kz-c{height:24px}
  .yn-kz-c .fl-av{width:19px;height:19px}
  .yn-kz.rv .yn-kz-ust{display:none}
}
/* kısa ekran: logo gider, rakipler ve kalan puan tek satırda (pencere kazımaya yetecek kadar uzun kalır) */
@media (max-height:640px){
  .yn-kz-bilet{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto minmax(0,1fr);gap:5px 8px}
  .yn-kz-ust{grid-column:2;grid-row:1;min-height:24px;padding:0 2px 0 0}
  .yn-kz-logo{display:none}
  .yn-kz-puan{grid-template-columns:62px auto}
  .yn-kz-puan b{font-size:23px}
  .yn-kz-oy{grid-column:1;grid-row:1;justify-content:flex-start;min-height:24px}
  .yn-kz-oy>small{display:none}
  .yn-kz.rv .yn-kz-oy{grid-column:1/3}
  .yn-kz-pen{grid-column:1/3;grid-row:2;min-height:84px}
  .yn-kz .fl-opts{gap:6px}
  .yn-kz .fl-opt{min-height:38px;font-size:16px}
}
@container (max-height:170px){
  .yn-kz-pl{padding:3px 12px 4px;gap:1px}
  .yn-kz-pl b{font-size:15px}
  .yn-kz-pl i{display:none}
}
@container (max-width:370px){
  .yn-kz.rv .yn-kz-c small,.yn-kz.rv .yn-kz-c i{display:none}
  .yn-kz.rv .yn-kz-c{padding-right:8px}
  .yn-kz.rv .yn-kz-c.no{box-shadow:inset 0 0 0 1.5px #ff7a66;background:rgba(120,20,10,.45)}
  .yn-kz.rv .yn-kz-c b{font-size:14px}
}
@keyframes ynKzBump{0%{transform:scale(1.22)}100%{transform:none}}
@keyframes ynKzSwipe{0%,100%{transform:translate(-14px,4px) rotate(-12deg)}50%{transform:translate(14px,-4px) rotate(10deg)}}
@keyframes ynKzKir{0%{opacity:1;transform:translate(var(--x0),var(--y0)) rotate(0)}100%{opacity:0;transform:translate(var(--x1),var(--y1)) rotate(var(--r,180deg))}}
@keyframes ynKzGlint{0%{opacity:0;transform:translateX(-70%)}15%{opacity:1}85%{opacity:1}100%{opacity:0;transform:translateX(70%)}}
@keyframes ynKzPlaka{0%{opacity:0;transform:translate(-50%,40%) scale(.92)}100%{opacity:1;transform:translate(-50%,0)}}
@keyframes ynKzRow{0%{opacity:0;transform:skewX(-8deg) translateY(10px) scale(.9)}100%{opacity:1;transform:skewX(-8deg)}}
@keyframes ynKzHz{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.yn-kz-ip span,.yn-kz.ac .yn-kz-hz{animation:none}}
`;

/** Folyonun durgun yüzü: metal degrade, ince fırça dokusu, kabartma desen, kenar gölgesi ve ortada soru işaretli madalyon. */
function folyoCiz(c, f, seed, etiket = '') {
	const ctx = c.getContext('2d');
	const W = c.width;
	const H = c.height;
	ctx.globalCompositeOperation = 'source-over';
	ctx.globalAlpha = 1;
	ctx.clearRect(0, 0, W, H);
	const g = ctx.createLinearGradient(0, 0, W, H);
	f.stops.forEach((s, i) => g.addColorStop(i / (f.stops.length - 1), s));
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, W, H);
	if (f.rainbow) {
		// hologram: yarı saydam gökkuşağı bantları
		const h = ctx.createLinearGradient(0, H, W, 0);
		['#ff8ad8', '#8ad8ff', '#a8ff9a', '#fff38a', '#ff9a8a', '#c49aff', '#8affef'].forEach((s, i, a) => h.addColorStop(i / (a.length - 1), s));
		ctx.globalAlpha = 0.34;
		ctx.fillStyle = h;
		ctx.fillRect(0, 0, W, H);
		ctx.globalAlpha = 1;
	}
	// fırça dokusu: yatay ince çizgiler (rastgele açık-koyu)
	let s = seed || 7;
	const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
	const u = Math.max(1, Math.round(H / 220));
	for (let y = 0; y < H; y += u) {
		const k = R();
		ctx.fillStyle = k < 0.5 ? `rgba(255,255,255,${(0.05 + k * 0.1).toFixed(3)})` : `rgba(30,35,45,${(0.02 + (k - 0.5) * 0.08).toFixed(3)})`;
		ctx.fillRect(0, y, W, u);
	}
	// kabartma desen: eğik satırlarda KAZI KAZAN (açık ve koyu kayık iki kopya)
	const fs = Math.max(10, Math.round(H * 0.07));
	ctx.save();
	ctx.translate(W / 2, H / 2);
	ctx.rotate(-0.32);
	ctx.font = `italic 900 ${fs}px "Barlow Condensed","Lilita One",sans-serif`;
	ctx.textBaseline = 'middle';
	const row = 'KAZI · KAZAN · '.repeat(8);
	const step = fs * 1.9;
	for (let y = -H; y < H; y += step) {
		const off = ((y / step) % 2) * fs * 2.2;
		ctx.fillStyle = f.lo;
		ctx.fillText(row, -W * 1.2 + off + 1, y + 1);
		ctx.fillStyle = f.hi;
		ctx.fillText(row, -W * 1.2 + off - 0.6, y - 0.6);
	}
	ctx.restore();
	// kenar gölgesi: folyo pencereye gömülü dursun
	const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
	v.addColorStop(0, 'rgba(0,0,0,0)');
	v.addColorStop(1, 'rgba(10,14,30,.28)');
	ctx.fillStyle = v;
	ctx.fillRect(0, 0, W, H);
	// orta madalyon: kabartma halka ve soru işareti (nereden başlanacağını söyler)
	const r = Math.min(W, H) * 0.2;
	const cx = W / 2;
	const cy = H / 2;
	ctx.lineWidth = Math.max(2, r * 0.09);
	ctx.strokeStyle = f.lo;
	ctx.beginPath();
	ctx.arc(cx + 1.5, cy + 1.5, r, 0, Math.PI * 2);
	ctx.stroke();
	ctx.strokeStyle = f.hi;
	ctx.beginPath();
	ctx.arc(cx - 1, cy - 1, r, 0, Math.PI * 2);
	ctx.stroke();
	ctx.font = `400 ${Math.round(r * 1.25)}px "Lilita One",sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = f.lo;
	ctx.fillText('?', cx + 2, cy + 3);
	ctx.fillStyle = f.hi;
	ctx.fillText('?', cx - 1, cy);
	// baskı: bilet türü ve seri numarası (sağ alt köşe; kazınınca o da gider)
	if (etiket) {
		const es = Math.max(9, Math.round(H * 0.055));
		ctx.font = `italic 800 ${es}px "Barlow Condensed",sans-serif`;
		ctx.textAlign = 'right';
		ctx.textBaseline = 'alphabetic';
		ctx.fillStyle = f.lo;
		ctx.fillText(etiket, W - es * 0.8 + 1, H - es * 0.7 + 1);
		ctx.fillStyle = 'rgba(255,255,255,.7)';
		ctx.fillText(etiket, W - es * 0.8, H - es * 0.7);
	}
	// kenarda ince parlak çerçeve
	ctx.strokeStyle = 'rgba(255,255,255,.35)';
	ctx.lineWidth = 2;
	ctx.strokeRect(1, 1, W - 2, H - 2);
}

/** Oyuncu portresi: kartın afişindeki plakadan (yoksa baş harf). */
function avOf(card, p) {
	const html = p?.i != null ? card?.querySelector(`.fl-qwho .fl-qp[data-p="${p.i}"] .fl-av`)?.innerHTML : '';
	return `<span class="fl-av">${html || esc([...String(p?.name || '?')][0] || '?')}</span>`;
}

/** Otomatik kazımanın yolu: pencerede satır satır gidip gelen bir çizgi (CSS piksel). Satır arası fırçanın 1,4 yarıçapı. */
export function otoYol(w, h, r) {
	const gap = r * 1.4;
	const rows = Math.max(2, Math.ceil((h + r * 0.6) / gap));
	const pts = [];
	for (let k = 0; k < rows; k++) {
		const y = Math.min(h, r * 0.35 + k * gap);
		const a = [-r * 0.6, y];
		const b = [w + r * 0.6, y + gap * 0.18];
		if (k % 2) pts.push(b, a);
		else pts.push(a, b);
	}
	return { pts, rows };
}

// en son açılan kart (eski kartın zamanlayıcıları yenisini bozmasın)
let LIVE = 0;

export const kazi = {
	time: 24,
	label: 'Kazı Kazan',
	kind: 'closest',
	cover: true, // tam ekran bilet (harita gizli)
	calm: true, // harita arkada durgun (klasik tiplerle aynı işaret)
	jokers: ['yari', 'kahin'],
	revealMs: 3200, // otomatik kazıma + aydınlanma + plaka
	rule: 'Az kazı, çok kazan',
	fmt: (v, value) => {
		const j = kazi.judge(v, value);
		return j.correct ? `${j.score} puan` : 'yanlış';
	},
	sub: (v, value) => `%${Math.round(clamp(Number(value?.s) || 0, 0, 1) * 100)} kazıdı`,
	prepare(q, R) {
		const order = shuffle([0, 1, 2, 3], R);
		const v = { q, opts: order.map((i) => q.a[i]), right: order.indexOf(0) };
		return stamp(v, q, (q2, k, P, text) => {
			for (const a of q2.a) text(a);
			return {
				wait: 0.5 + 0.4,
				look: LOOK.orient + 4 * LOOK.gaze + LOOK.image,
				// kazıma: birkaç geçiş (yavaş oyuncu ~%30'u 4 sn'de), sonra şık
				act: 4 + ACT.tap,
			};
		});
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('kazi', CSS);
		const app = appOf();
		const me = ++LIVE;
		const q = v.q;
		const card = el.closest('.fl-q');
		const f = FOLYO[q.folyo] || FOLYO.gumus;
		const sesA = sesOf(app);
		const cur = app?.match?.cur;
		const who = cur?.who || [];
		const human = who.find((p) => p.human) || app?.match?.humanPlayer || null;
		const foes = (cur?.bots || []).filter((b) => b?.p && b.p !== human);
		const serial = String(1000 + ((q.id || '').split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9000, 7) % 9000));
		const tema = ['gunduz', 'batim', 'gece'].includes(q.tema) ? q.tema : 'gunduz';
		el.innerHTML = `<div class="yn-kz f-${esc(q.folyo || 'gumus')}">
			<div class="yn-kz-bilet">
				<div class="yn-kz-ust"><span class="yn-kz-logo"><b>KAZI KAZAN</b><small>${esc(f.name)}</small></span>
					<span class="yn-kz-puan"><small>KALAN PUAN</small><b>100</b><i>${'<u class="on"></u>'.repeat(10)}</i></span></div>
				<div class="yn-kz-pen">
					<div class="yn-kz-sah t-${tema}"><i class="yn-kz-hz"></i><i class="yn-kz-gl"></i><img class="yn-kz-yap yok" alt="" draggable="false"></div>
					<canvas class="yn-kz-fol" aria-label="kazı kazan folyosu: parmağınla kazı"></canvas><canvas class="yn-kz-sim"></canvas>
					<div class="yn-kz-ip"><span>${COIN}</span><b>PARMAĞINLA KAZI</b></div><i class="yn-kz-para">${COIN}</i><i class="yn-kz-isi"></i><div class="yn-kz-pl"></div></div>
				<div class="yn-kz-oy">${foes.length && !foes.some((b) => human && b.p.team != null && b.p.team === human.team) ? '<small>RAKİP</small>' : ''}${foes.map((b, k) => `<span class="yn-kz-c" data-p="${b.p.i}" style="--pc:${esc(b.p.css || '#888')};--k:${k}">${avOf(card, b.p)}<b>%0</b></span>`).join('')}</div>
			</div>
			<div data-r="o"></div>
		</div>`;
		rule(el, 'Az kazı, çok kazan');
		const root = el.querySelector('.yn-kz');
		const pen = root.querySelector('.yn-kz-pen');
		const sah = pen.querySelector('.yn-kz-sah');
		const yap = pen.querySelector('.yn-kz-yap');
		const cvF = pen.querySelector('.yn-kz-fol');
		const cvS = pen.querySelector('.yn-kz-sim');
		const ip = pen.querySelector('.yn-kz-ip');
		const para = pen.querySelector('.yn-kz-para');
		const plaka = pen.querySelector('.yn-kz-pl');
		const meter = root.querySelector('.yn-kz-puan');
		const meterB = meter.querySelector('b');
		const segs = [...meter.querySelectorAll('u')];
		const oy = root.querySelector('.yn-kz-oy');
		const chips = new Map([...oy.querySelectorAll('.yn-kz-c')].map((c) => [Number(c.dataset.p), c]));
		// kazıma durumu: ızgara (pay), normalize çizgiler (boy değişince yeniden çizilir)
		const grid = new Uint8Array(GX * GY);
		let hits = 0;
		const strokes = [];
		let stroke = null;
		let locked = false;
		let shown = 100;
		let t0 = 0; // kartın açıldığı an (oyun saati)
		let raf = 0;
		let auto = false; // otomatik kazıma sürüyor ya da bitti (folyo artık oyuncunun değil)
		const frac = () => hits / (GX * GY);
		const lock = () => {
			locked = true;
			root.classList.add('lock');
			stroke = null;
		};
		const c = mountChoice(root.querySelector('[data-r=o]'), v, api, {
			wrap: (i) => ({ i, s: Math.round(frac() * 1000) / 1000 }),
			onPick: () => {
				lock();
				sfx(app, 'tap');
			},
		});
		const fit = optFit(root.querySelector('[data-r=o]')); // şık yazısı kelime ortasından bölünmez (t_pick.js)
		// ---------------------------------------------------------------- yapının resmi (önden indirilmiş olabilir)
		let picOk = false;
		let picWait = [];
		const picDone = (ok) => {
			if (LIVE !== me) return;
			picOk = ok;
			if (ok) yap.classList.remove('yok');
			else if (!sah.querySelector('.yn-kz-bek')) sah.insertAdjacentHTML('beforeend', '<span class="yn-kz-bek">GÖRSEL YÜKLENEMEDİ</span>');
			const w = picWait;
			picWait = [];
			for (const fn of w) fn();
		};
		{
			const im = yapiOnyukle(q);
			yap.src = im ? im.src : `${YAPI_BASE}${q.img}.webp`;
			if (yap.complete && yap.naturalWidth) picDone(true);
			else {
				yap.addEventListener('load', () => picDone(true), { once: true });
				yap.addEventListener('error', () => picDone(false), { once: true });
			}
		}
		// ---------------------------------------------------------------- folyo: boy, çizim, kazıma
		let fw = 0;
		let fh = 0;
		let dpr = 1;
		let rect = null;
		const fctx = cvF.getContext('2d');
		const brushPx = () => clamp((rect?.width || 300) * 0.06, 13, 24);
		// pürüzlü madeni para izi: kenarında folyonun kalkık gölgesi, sonra birkaç kayık daire silinir; pay ızgarası (mark)
		const stampAt = (nx, ny, r, k, mark = true) => {
			const x = nx * fw;
			const y = ny * fh;
			const rr = r * dpr;
			fctx.globalCompositeOperation = 'source-atop';
			fctx.fillStyle = 'rgba(20,24,34,.22)';
			fctx.beginPath();
			fctx.arc(x + rr * 0.08, y + rr * 0.12, rr * 1.12, 0, Math.PI * 2);
			fctx.fill();
			fctx.globalCompositeOperation = 'destination-out';
			fctx.fillStyle = '#000';
			for (let i = 0; i < 4; i++) {
				const a = (k * 2.39996 + i * 1.7) % (Math.PI * 2);
				const d = rr * (i ? 0.32 : 0);
				fctx.beginPath();
				fctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr * (i ? 0.72 : 0.86), 0, Math.PI * 2);
				fctx.fill();
			}
			// ince çizik izleri (yarı saydam)
			fctx.globalAlpha = 0.45;
			fctx.lineWidth = Math.max(1, dpr * 0.8);
			fctx.strokeStyle = '#000';
			fctx.beginPath();
			for (let i = 0; i < 3; i++) {
				const o = (i - 1) * rr * 0.55;
				fctx.moveTo(x - rr * 0.9, y + o);
				fctx.lineTo(x + rr * 0.9, y + o + rr * 0.15);
			}
			fctx.stroke();
			fctx.globalAlpha = 1;
			fctx.globalCompositeOperation = 'source-over';
			if (!mark) return;
			const rx = (r * 0.95) / (rect.width || 1);
			const ry = (r * 0.95) / (rect.height || 1);
			const gx0 = Math.max(0, Math.floor((nx - rx) * GX));
			const gx1 = Math.min(GX - 1, Math.floor((nx + rx) * GX));
			const gy0 = Math.max(0, Math.floor((ny - ry) * GY));
			const gy1 = Math.min(GY - 1, Math.floor((ny + ry) * GY));
			for (let j = gy0; j <= gy1; j++)
				for (let i = gx0; i <= gx1; i++) {
					const dx = ((i + 0.5) / GX - nx) / rx;
					const dy = ((j + 0.5) / GY - ny) / ry;
					if (dx * dx + dy * dy > 1) continue;
					const p = j * GX + i;
					if (!grid[p]) {
						grid[p] = 1;
						hits++;
					}
				}
		};
		const segment = (a, b, r, mark = true) => {
			const dx = (b[0] - a[0]) * (rect.width || 1);
			const dy = (b[1] - a[1]) * (rect.height || 1);
			const len = Math.hypot(dx, dy);
			const n = Math.max(1, Math.ceil(len / (r * 0.38)));
			for (let i = 1; i <= n; i++) {
				const t = i / n;
				stampAt(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r, (stroke?.k || 0) + i, mark);
			}
			if (mark && stroke) stroke.k += n;
		};
		const size = () => {
			const r = pen.getBoundingClientRect();
			if (r.width < 10 || r.height < 10) return false;
			const d = Math.min(2, window.devicePixelRatio || 1);
			const W = Math.round(r.width * d);
			const H = Math.round(r.height * d);
			rect = r;
			if (W === fw && H === fh) return true;
			fw = W;
			fh = H;
			dpr = W / r.width;
			cvF.width = W;
			cvF.height = H;
			cvS.width = W;
			cvS.height = H;
			folyoCiz(cvF, f, 7 + (q.diff || 1), `${f.name} · No ${serial}`);
			// eski çizgiler yeni boyda yeniden (pay ızgarası değişmez)
			const r0 = brushPx();
			for (const s of strokes) {
				stampAt(s.p[0][0], s.p[0][1], r0, 0, false);
				for (let i = 1; i < s.p.length; i++) segment(s.p[i - 1], s.p[i], r0, false);
			}
			return true;
		};
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => !auto && size()) : null;
		ro?.observe(pen);
		requestAnimationFrame(() => el.isConnected && size());
		// kazıma puanı göstergesi
		const setMeter = (p) => {
			if (p === shown) return;
			const step0 = Math.floor(shown / 10);
			shown = p;
			meterB.textContent = String(p);
			meterB.classList.remove('bump');
			void meterB.offsetWidth;
			meterB.classList.add('bump');
			const on = Math.ceil(p / 10);
			segs.forEach((u, i) => u.classList.toggle('on', i < on));
			meter.classList.toggle('mid', p < 70 && p >= 40);
			meter.classList.toggle('low', p < 40);
			if (Math.floor(p / 10) < step0) sesA.basamak(step0);
		};
		let meterRaf = 0;
		const meterLater = () => {
			if (meterRaf) return;
			meterRaf = requestAnimationFrame(() => {
				meterRaf = 0;
				setMeter(puanOf(frac()));
			});
		};
		// folyo kırıntısı (gap: en az bu kadar ms arayla)
		let lastKir = 0;
		const kirinti = (nx, ny, gap = 38, n = 1) => {
			const t = clock.now();
			if (t - lastKir < gap) return;
			lastKir = t;
			for (let k = 0; k < n; k++) {
				const e = document.createElement('i');
				e.className = 'yn-kz-kir';
				const px = nx * rect.width;
				const py = ny * rect.height;
				const dx = (Math.random() - 0.5) * 46;
				const col = f.stops[Math.floor(Math.random() * f.stops.length)];
				e.style.cssText = `--s:${(2.5 + Math.random() * 3.5).toFixed(1)}px;--c:${col};--x0:${px.toFixed(0)}px;--y0:${py.toFixed(0)}px;--x1:${(px + dx).toFixed(0)}px;--y1:${(py + 18 + Math.random() * 28).toFixed(0)}px;--r:${Math.round(Math.random() * 540 - 270)}deg`;
				pen.appendChild(e);
				setTimeout(() => e.remove(), 760);
			}
		};
		const toN = (ev) => {
			const r = rect || pen.getBoundingClientRect();
			return [clamp((ev.clientX - r.left) / r.width, 0, 1), clamp((ev.clientY - r.top) / r.height, 0, 1)];
		};
		let lastSnd = 0;
		let lastBuzz = 0;
		let first = true;
		cvF.addEventListener('pointerdown', (ev) => {
			if (locked || auto || !t0) return;
			if (!rect && !size()) return;
			rect = pen.getBoundingClientRect();
			ev.preventDefault();
			try {
				cvF.setPointerCapture(ev.pointerId);
			} catch {
				/* yoksay */
			}
			const p = toN(ev);
			stroke = { id: ev.pointerId, p: [p], k: 0, t: clock.now() };
			strokes.push(stroke);
			stampAt(p[0], p[1], brushPx(), 0);
			if (first) {
				first = false;
				ip.classList.add('gone');
				sesA.para();
			}
			kirinti(p[0], p[1]);
			meterLater();
		});
		cvF.addEventListener('pointermove', (ev) => {
			if (!stroke || stroke.id !== ev.pointerId || locked) return;
			const p = toN(ev);
			const a = stroke.p[stroke.p.length - 1];
			const d = Math.hypot((p[0] - a[0]) * rect.width, (p[1] - a[1]) * rect.height);
			if (d < 2) return;
			stroke.p.push(p);
			segment(a, p, brushPx());
			kirinti(p[0], p[1]);
			const t = clock.now();
			const sp = d / Math.max(8, t - (stroke.t || t));
			stroke.t = t;
			if (t - lastSnd > 45) {
				lastSnd = t;
				sesA.kazi(Math.min(2, sp));
			}
			if (t - lastBuzz > 90) {
				lastBuzz = t;
				buzz(3);
			}
			meterLater();
		});
		const end = (ev) => {
			if (stroke && stroke.id === ev.pointerId) stroke = null;
		};
		cvF.addEventListener('pointerup', end);
		cvF.addEventListener('pointercancel', end);
		// ---------------------------------------------------------------- parıltı: folyonun kalanında gezen ışık bandı
		const sctx = cvS.getContext('2d');
		let simOn = false;
		const shimmer = (tl) => {
			// her 2,6 sn'de bir 1,2 sn'lik süpürme; arada tuval boş (kare başına iş yok)
			const P = 2.6;
			const ph = ((tl + 1.6) % P) / 1.2;
			if (ph > 1) {
				if (simOn) {
					sctx.clearRect(0, 0, cvS.width, cvS.height);
					simOn = false;
				}
				return;
			}
			simOn = true;
			const W = cvS.width;
			const H = cvS.height;
			sctx.globalCompositeOperation = 'source-over';
			sctx.clearRect(0, 0, W, H);
			const x = -W * 0.6 + ph * W * 2.2;
			const g = sctx.createLinearGradient(x - W * 0.25, 0, x + W * 0.25, H * 0.4);
			g.addColorStop(0, 'rgba(255,255,255,0)');
			g.addColorStop(0.5, f.shine);
			g.addColorStop(1, 'rgba(255,255,255,0)');
			sctx.fillStyle = g;
			sctx.fillRect(0, 0, W, H);
			if (f.rainbow) {
				const h = sctx.createLinearGradient(x - W * 0.4, H, x + W * 0.4, 0);
				['rgba(255,120,220,0)', 'rgba(255,120,220,.5)', 'rgba(120,220,255,.5)', 'rgba(160,255,140,.5)', 'rgba(160,255,140,0)'].forEach((s, i, a) => h.addColorStop(i / (a.length - 1), s));
				sctx.fillStyle = h;
				sctx.fillRect(0, 0, W, H);
			}
			// yalnız kalan folyonun üstünde
			sctx.globalCompositeOperation = 'destination-in';
			sctx.drawImage(cvF, 0, 0);
			sctx.globalCompositeOperation = 'source-over';
		};
		// rakiplerin kazıdığı pay (botun planı: cevap anına dek doğrusal)
		const foeTick = (tq) => {
			for (const b of foes) {
				const ch = chips.get(b.p.i);
				if (!ch || ch.classList.contains('done')) continue;
				const s = clamp(Number(b.value?.s) || 0, 0, 1);
				const tEnd = Math.max(0.6, (b.time || 6) - 0.7);
				const k = clamp((tq - 0.8) / Math.max(0.3, tEnd - 0.8), 0, 1);
				const sv = Math.round(s * k * 100);
				const bb = ch.querySelector('b');
				if (bb.textContent !== `%${sv}`) bb.textContent = `%${sv}`;
				if (tq >= (b.time || 1e9)) {
					ch.classList.add('done');
					bb.textContent = `%${Math.round(s * 100)}`;
					if (!ch.querySelector('i')) ch.insertAdjacentHTML('beforeend', `<i>${CHECK}</i>`);
				}
			}
		};
		let revealed = false;
		const frame = () => {
			raf = 0;
			if (LIVE !== me || !el.isConnected) return;
			const tl = (clock.now() - t0) / 1000;
			if (!auto && !locked) shimmer(tl);
			else if (simOn) {
				sctx.clearRect(0, 0, cvS.width, cvS.height);
				simOn = false;
			}
			if (!revealed) foeTick(tl);
			if (!revealed) raf = requestAnimationFrame(frame);
		};
		const stopOpen = onOpen(el, () => {
			t0 = clock.now();
			if (!rect) size();
			raf = requestAnimationFrame(frame);
		});
		// ---------------------------------------------------------------- imza: altın para kalan folyoyu kendisi kazır
		let autoRaf = 0;
		const otoKazi = (ms, done) => {
			auto = true;
			if (!fw || !fh || !rect) {
				// folyo hiç boyanmadıysa (kart ölçülmeden cevap geldi): resim yine açılır
				cvF.style.opacity = '0';
				return done();
			}
			const w = rect.width;
			const h = rect.height;
			const r = clamp(Math.min(w, h) * 0.13, 20, 42);
			const { pts, rows } = otoYol(w, h, r);
			const seg = [];
			let L = 0;
			for (let i = 1; i < pts.length; i++) {
				const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
				seg.push([L, d]);
				L += d;
			}
			const at = (x) => {
				let i = 0;
				while (i < seg.length - 1 && seg[i][0] + seg[i][1] < x) i++;
				const k = clamp((x - seg[i][0]) / (seg[i][1] || 1), 0, 1);
				const a = pts[i];
				const b = pts[i + 1];
				return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
			};
			sesA.oto(ms, rows);
			para.classList.add('on');
			const a0 = clock.now();
			let last = at(0);
			let k = 0;
			const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2) * 0.35 + x * 0.65; // yumuşak kalkış ve iniş
			const step = () => {
				autoRaf = 0;
				if (LIVE !== me || !el.isConnected) return;
				const u = Math.min(1, (clock.now() - a0) / ms);
				const p = at(ease(u) * L);
				segment([last[0] / w, last[1] / h], [p[0] / w, p[1] / h], r, false);
				k++;
				para.style.transform = `translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px) rotate(${(u * 900).toFixed(0)}deg)`;
				kirinti(clamp(p[0] / w, 0, 1), clamp(p[1] / h, 0, 1), 22, 2);
				if (k % 3 === 0) buzz(2);
				last = p;
				if (u < 1) autoRaf = requestAnimationFrame(step);
				else {
					para.classList.remove('on');
					cvF.style.opacity = '0'; // kalan kılçık kırıntılar
					done();
				}
			};
			autoRaf = requestAnimationFrame(step);
		};
		const close = onClose(el, () => {
			stopOpen();
			cancelAnimationFrame(raf);
			cancelAnimationFrame(autoRaf);
			if (meterRaf) cancelAnimationFrame(meterRaf);
			ro?.disconnect();
			if (LIVE === me) LIVE++;
		});
		return {
			lock() {
				lock();
				c.lock();
			},
			reveal(results) {
				lock();
				c.reveal(results, (val) => (val && Number.isInteger(val.i) ? val.i : null));
				fit.refit();
				ip.classList.add('gone');
				const meR = results.find((r) => r.p?.human);
				// kendi puanım: gönderdiğim değerden (denetim araçları da aynı yoldan cevaplar)
				if (meR?.value) setMeter(meR.value.i === v.right ? puanOf(meR.value.s) : 0);
				// plaka: ad; Türkiye'de il adı ve plaka numarası, yurt dışında şehir ve ülke; bir satır bilgi
				const il = q.il ? ILLER.get(q.il) || '' : '';
				const yer = q.il ? `${PIN}${esc(il)}<em>${String(q.il).padStart(2, '0')}</em>` : `${GLOBE}${esc(q.yer || '')}`;
				plaka.innerHTML = `<b>${esc(q.ad || q.a[0])}</b><span>${yer}</span>${q.alt ? `<i>${esc(q.alt)}</i>` : ''}`;
				// alt şerit: herkesin sonucu (sıralı): portre, puan ya da YANLIŞ, kazıdığı pay
				const order = results.slice().sort((a, b) => a.err - b.err || a.time - b.time);
				revealed = true;
				oy.innerHTML = order
					.map((r, k) => {
						const j = kazi.judge(v, r.value);
						const s = Math.round(clamp(Number(r.value?.s) || 0, 0, 1) * 100);
						const win = k === 0 && j.correct;
						return `<span class="yn-kz-c done${j.correct ? '' : ' no'}${win ? ' win' : ''}${r.p?.human ? ' me' : ''}" style="--pc:${esc(r.color)};--k:${k}">${avOf(card, r.p)}<b>${r.value == null ? '—' : j.correct ? j.score : 'YANLIŞ'}</b>${r.value == null ? '' : `<small>%${s}</small>`}<i>${j.correct ? CHECK : CROSS}</i></span>`;
					})
					.join('');
				root.classList.add('rv');
				// aydınlanmada yapı plakanın üstüne sığar: alt kenarı plakanın 6 px üstünde, tepesi pencerenin %4'ünden aşağıda
				const sigdir = () => {
					const P = pen.getBoundingClientRect();
					const B = yap.getBoundingClientRect(); // dönüşümsüz (henüz .ac yok)
					if (!P.height || !B.height) return;
					const plTop = P.bottom - P.height * 0.04 - plaka.offsetHeight;
					const room = plTop - 6 - (P.top + P.height * 0.04);
					const sc = clamp(room / B.height, 0.45, 1);
					yap.style.setProperty('--sc', sc.toFixed(3));
					yap.style.setProperty('--ty', `${(plTop - 6 - B.bottom).toFixed(1)}px`);
					const gl = sah.querySelector('.yn-kz-gl');
					gl.style.setProperty('--sc', sc.toFixed(3));
					gl.style.setProperty('--ty', `${(plTop - 6 - B.bottom).toFixed(1)}px`);
				};
				// imza anı: önce para kazır, sonra sahne aydınlanır ve plaka yükselir. Resim yüklenmekteyse en çok 1,2 sn beklenir.
				const reduce = !!matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
				const go = () => {
					if (LIVE !== me || !el.isConnected || auto) return;
					size(); // alt şerit ve başlık değişti: folyo yeni boyda (otomatik kazıma doğru yere düşsün)
					otoKazi(reduce ? 250 : 1250, () => {
						if (LIVE !== me || !el.isConnected) return;
						sigdir();
						root.classList.add('ac');
						root.classList.toggle('iyi', !!meR?.correct);
						setTimeout(() => sesA.plaka(!!meR?.correct), 380);
					});
				};
				if (picOk || !q.img) go();
				else {
					picWait.push(go);
					setTimeout(go, 1200);
				}
				if (meR && app) {
					const j = kazi.judge(v, meR.value);
					const s = Math.round(clamp(Number(meR.value?.s) || 0, 0, 1) * 100);
					if (meR.value == null) stampLater(app, 'CEVAP YOK', 'warn', `Doğrusu: ${q.a[0]}`);
					else if (j.correct) stampLater(app, `${j.score} PUAN!`, 'gold', s ? `Folyonun %${s} kadarını kazıyıp bildin` : 'Hiç kazımadan bildin!');
					else stampLater(app, 'YANLIŞ', 'bad', `Doğrusu: ${q.a[0]}`);
				}
			},
			destroy: close,
		};
	},
	/** Çevrimiçi görünüm: doğru şık, ad, yer ve bilgi yok (görsel numarası resmi göstermek için gerekir; Gölge'deki gibi). */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.right;
		delete o.q.a;
		delete o.q.ad;
		delete o.q.alt;
		delete o.q.il;
		delete o.q.yer;
		return o;
	},
	judge(v, value) {
		if (!value || typeof value !== 'object' || !Number.isInteger(value.i)) return { correct: false, err: Infinity };
		const ok = value.i === v.right;
		const p = ok ? puanOf(value.s) : 0;
		return { correct: ok, err: ok ? (100 - p) / 100 : 2, score: p };
	},
	/** Ortak sınama: hiç kazımadan doğru (100 puan) ve yarısını kazıyıp yanlış. */
	ornek(v) {
		return { good: { i: v.right, s: 0 }, bad: { i: (v.right + 1) % 4, s: 0.5 } };
	},
	bot(v, skill, R) {
		const d = clamp(Number(v.q.diff) || 2, 1, 3);
		// cevap anı botTime'dan; o ana dek kazınan pay: usta az kazıyıp tanır, acemi çok kazır
		const time = botTime(v, R, skill, 0.12, 0.85);
		const s = clamp(0.04 + Math.max(0, time - 1.4) * 0.034 * (1.5 - 0.7 * clamp(skill, 0, 1)) * (0.8 + 0.12 * d) * (0.75 + R() * 0.5), 0.03, 0.7);
		const ok = R() < clamp(pCorrect(skill, d) + Math.min(0.16, s * 0.35), 0.08, 0.97);
		let i = v.right;
		if (!ok) do i = Math.floor(R() * 4); while (i === v.right);
		return { value: { i, s: Math.round(s * 1000) / 1000 }, time };
	},
};
