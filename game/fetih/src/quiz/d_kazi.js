// KAZI KAZAN (YENİ): gümüş folyolu bir kazı kazan bileti. Folyonun altında oyunun kendi 3B kahraman maketlerinden birinin
// renkli kartpostalı var (gündüz, gün batımı ya da mehtap). Parmağınla kazırsın: madeni para izi gibi pürüzlü bir silgi,
// kenarında folyonun kalkık gölgesi, saçılan gümüş kırıntılar ve kazıma sesi. Az kazıyan çok kazanır: biletteki
// "KALAN PUAN" göstergesi her kazımada düşer. Dört şıktan yapıyı seçersin.
//
// İmza anı (cevap): bütün folyo köşesinden soyulur (arka yüzü kıvrılır, gölgesi resme düşer), resmin üstünden bir parıltı
// geçer, yapının adı ve ili pirinç bir plaka olarak yükselir; biletin alt şeridinde her oyuncunun puanı ve kazıdığı pay.
//
// Veri: model (map/hero_index.js HEROES), a: [doğru, y1, y2, y3], il (plaka), ad (plakadaki ad), alt (ikinci satır),
//       tema ('gunduz' | 'batim' | 'gece'), folyo ('gumus' | 'altin' | 'holo'),
//       kadraj { yaw, pitch, el, az, box, fill, panY, gy, ground? } (kamera, ışık yönü, kutu)
// Değer: { i: şık, s: kazınan pay 0..1 }. Tür 'closest': doğruysa err = (100 − puan) / 100 (puan 100 → 10: az kazıyan
//        önde, eşitlikte hız), yanlışsa err 2. Puan kuralı (puanOf): 100 − 90 · min(1, pay / 0,7); doğru cevap en az 10.
// Bot: botTime'dan bir cevap anı; o ana dek kazıdığı pay beceriyle azalır (usta az kazıyıp tanır), doğruluk
//      pCorrect + kazıdıkça artan tanıma payı. Galeride rakiplerin kazıdığı pay biletin alt şeridinde canlı akar.
// Resim: d_kazi_cizim.js (CPU taraması; WebGL'siz, her ortamda aynı). Kurulamazsa yedek gök + anıt silueti.
// Jokerler: yarı yarıya ve seyirci (şıklı tipin ortak etkileri).

import { css, esc, shuffle, pCorrect, mountChoice, buzz, clamp } from './util.js';
import { optFit } from './t_pick.js';
import { botTime } from './timing.js';
import { appOf, stamp, onClose, onOpen, rule, stampLater, sfx, LOOK, ACT, DENEME_CSS } from './d_ortak.js';
import { clock, setTimeout, clearTimeout } from '../core/clock.js';
import { HEROES } from '../map/hero_index.js';
import { modelKur, ciz, yedek, TEMA } from './d_kazi_cizim.js';
import { degHz } from '../audio/scales.js';
import DATA from '../data/turkiye.json';

const ILLER = new Map(DATA.provinces.map((p) => [p.id, p.name]));

/** Puan kuralı: hiç kazımadan 100, payın %70'i kazınınca 10 (doğru cevabın tabanı). */
export const PUAN = { tam: 100, taban: 10, son: 0.7 };
export const puanOf = (s) => Math.round(PUAN.tam - (PUAN.tam - PUAN.taban) * clamp((Number(s) || 0) / PUAN.son, 0, 1));
/** Kazıma ızgarası (pay ölçümü): pencere bu kadar hücreye bölünür. */
const GX = 64;
const GY = 40;

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
		// soyulma: bantın sökülmesi gibi yükselen hışırtı + kıtır kıtır kopma
		soy() {
			safe((e, t) => {
				e.noise(t, 1.05, 0.11, 350, 4200, { q: 0.8, a: 0.15 });
				for (let i = 0; i < 14; i++) e.hit('crack', t + 0.05 + i * 0.065 + Math.random() * 0.03, 0.08 + Math.random() * 0.06, 0.9 + Math.random() * 0.9, Math.random() - 0.5);
			});
		},
		// parıltı ve plaka: çan, kanun ve pirinç çınlaması
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
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5 10-11" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/></svg>';

// folyo renkleri: [degrade durakları], kabartma (açık, koyu), parıltı
const FOLYO = {
	gumus: { stops: ['#eef1f5', '#a9b1bc', '#dfe4ea', '#8f98a4', '#e9edf2'], hi: 'rgba(255,255,255,.55)', lo: 'rgba(40,48,60,.28)', shine: 'rgba(255,255,255,.75)', back: '#e8e3d6', name: 'GÜMÜŞ' },
	altin: { stops: ['#fff0b8', '#d6a43a', '#ffe08a', '#b07d22', '#f7d774'], hi: 'rgba(255,250,220,.55)', lo: 'rgba(90,55,0,.3)', shine: 'rgba(255,248,210,.8)', back: '#efe2c2', name: 'ALTIN' },
	holo: { stops: ['#e9f1ff', '#b6c2d6', '#f0e6ff', '#9eb0c8', '#e4fbff'], hi: 'rgba(255,255,255,.55)', lo: 'rgba(40,40,80,.26)', shine: 'rgba(255,255,255,.8)', back: '#e6e8f2', name: 'HOLOGRAM', rainbow: true },
};

const CSS = /* css */ `
.yn-kz{--kz-a:#c8263a;--kz-b:#7a0f22;--kz-t:#ffd25a;display:flex;flex-direction:column;gap:9px;min-height:0;user-select:none;-webkit-user-select:none}
.fl-q.cover .yn-kz{flex:1 1 auto}
.yn-kz.f-altin{--kz-a:#3b1d6e;--kz-b:#1c0c3a;--kz-t:#ffd25a}
.yn-kz.f-holo{--kz-a:#0f3a6e;--kz-b:#081a3a;--kz-t:#7ef0ff}
/* bilet: kenar kesikli, guilloche zemin, üstte logo ve kalan puan, altta oyuncular */
.yn-kz-bilet{position:relative;flex:1 1 auto;display:flex;flex-direction:column;gap:7px;padding:8px 10px 8px;border-radius:14px;
  background:repeating-radial-gradient(circle at 0 0,rgba(255,255,255,.07) 0 1px,transparent 1.5px 7px),repeating-radial-gradient(circle at 100% 100%,rgba(255,255,255,.06) 0 1px,transparent 1.5px 9px),linear-gradient(160deg,var(--kz-a),var(--kz-b));
  box-shadow:inset 0 0 0 2px rgba(255,214,120,.55),inset 0 0 0 5px rgba(0,0,0,.18),inset 0 0 0 6.5px rgba(255,214,120,.25),0 12px 26px rgba(0,0,0,.5)}
.yn-kz-bilet::before,.yn-kz-bilet::after{content:'';position:absolute;top:50%;width:14px;height:14px;margin-top:-7px;border-radius:50%;background:#090c1b;box-shadow:inset 0 0 0 2px rgba(255,214,120,.45)}
.yn-kz-bilet::before{left:-7px}.yn-kz-bilet::after{right:-7px}
.yn-kz-ust{flex:none;display:flex;align-items:center;gap:8px;min-height:30px;padding:0 4px}
.yn-kz-logo{flex:none;display:flex;align-items:baseline;gap:5px;transform:skewX(-8deg);font-family:'Lilita One',sans-serif;font-size:21px;line-height:1;letter-spacing:.02em;color:var(--kz-t);text-shadow:0 2px 0 rgba(0,0,0,.45),0 0 12px rgba(255,200,80,.35)}
.yn-kz-logo i{font-style:normal;color:#fff}
.yn-kz-logo small{align-self:center;padding:2px 6px 2px;border-radius:4px;font:italic 800 10px/1 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:#1a1200;background:var(--kz-t);text-shadow:none}
.yn-kz-puan{flex:1 1 auto;min-width:0;display:grid;grid-template-columns:1fr auto;grid-template-rows:auto auto;align-items:end;column-gap:7px;row-gap:3px}
.yn-kz-puan small{grid-column:1;grid-row:1;justify-self:end;font:italic 800 10px/1 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:rgba(255,255,255,.78);white-space:nowrap}
.yn-kz-puan b{grid-column:2;grid-row:1/3;min-width:2.1em;text-align:right;font:italic 900 30px/.9 'Barlow Condensed','Lilita One',sans-serif;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.45),0 0 14px rgba(255,210,90,.5);transition:color .3s}
.yn-kz-puan b.bump{animation:ynKzBump .32s cubic-bezier(.3,1.6,.5,1)}
.yn-kz-puan i{grid-column:1;grid-row:2;justify-self:stretch;height:8px;display:flex;gap:2px}
.yn-kz-puan i u{flex:1;border-radius:2px;background:rgba(0,0,0,.35);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);transition:background .25s}
.yn-kz-puan i u.on{background:linear-gradient(180deg,#9dffb0,#29c45a)}
.yn-kz-puan.mid i u.on{background:linear-gradient(180deg,#ffe58a,#ffaf1f)}
.yn-kz-puan.low i u.on{background:linear-gradient(180deg,#ffb0a0,#ff4a32)}
.yn-kz-puan.mid b{color:#ffe7a0}.yn-kz-puan.low b{color:#ffb4a4}
/* pencere: resim, folyo, ipucu, plaka, parıltı */
.yn-kz-pen{position:relative;flex:1 1 auto;min-height:96px;max-height:96cqw;border-radius:9px;overflow:hidden;background:#1a2036;
  box-shadow:0 0 0 2px #2a1a08,0 0 0 4px rgba(255,214,120,.8),0 0 0 5.5px rgba(0,0,0,.4)}
.yn-kz-pen{container-type:size}
.yn-kz-pen canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.yn-kz-pen .yn-kz-res{object-fit:cover;transform-origin:50% 0;transition:transform 1.5s cubic-bezier(.3,.7,.3,1)}
.yn-kz.rv .yn-kz-pen .yn-kz-res{transform:translateY(-8%) scale(1.05)}
.yn-kz-pen .yn-kz-fol{touch-action:none;cursor:pointer}
.yn-kz.lock .yn-kz-fol{cursor:default}
.yn-kz-pen .yn-kz-sim{pointer-events:none;mix-blend-mode:screen}
.yn-kz-ip{position:absolute;left:50%;top:50%;z-index:3;display:flex;flex-direction:column;align-items:center;gap:4px;transform:translate(-50%,-50%);pointer-events:none;transition:opacity .35s,transform .35s}
.yn-kz-ip span{position:relative;width:48px;height:48px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.35));animation:ynKzSwipe 1.6s ease-in-out infinite}
.yn-kz-ip span svg{width:100%;height:100%}
.yn-kz-ip b{padding:3px 10px 4px;border-radius:999px;font:italic 900 14px/1.1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.12em;color:#fff;background:rgba(14,18,36,.82);box-shadow:0 0 0 1.5px rgba(255,255,255,.35);white-space:nowrap}
.yn-kz-ip.gone{opacity:0;transform:translate(-50%,-40%) scale(.9)}
.yn-kz-kir{position:absolute;left:0;top:0;width:var(--s,4px);height:var(--s,4px);border-radius:1px;pointer-events:none;background:var(--c,#cfd5dd);box-shadow:inset 0 0 0 .5px rgba(0,0,0,.25);animation:ynKzKir .7s cubic-bezier(.25,.6,.45,1) forwards}
.yn-kz-isi{position:absolute;inset:-10% -60%;z-index:4;pointer-events:none;opacity:0;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.0) 42%,rgba(255,255,255,.85) 50%,rgba(255,255,255,0) 58%,transparent 62%);mix-blend-mode:screen;transform:translateX(-70%)}
.yn-kz.rv .yn-kz-isi{animation:ynKzGlint .85s 1.05s cubic-bezier(.45,.1,.3,1) both}
/* plaka: pirinç, vidalı; cevapta pencerenin altından yükselir */
.yn-kz-pl{position:absolute;left:50%;bottom:5%;z-index:5;max-width:88%;display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 26px 6px;border-radius:7px;
  transform:translate(-50%,140%);opacity:0;pointer-events:none;color:#2a1800;text-align:center;
  background:linear-gradient(180deg,#fff1b8 0%,#e7c06a 30%,#c08a2c 62%,#f0cf7c 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.8),inset 0 -2px 0 rgba(90,50,0,.45),0 0 0 1.5px #6a4204,0 8px 16px rgba(0,0,0,.55)}
.yn-kz-pl::before,.yn-kz-pl::after{content:'';position:absolute;top:50%;width:8px;height:8px;margin-top:-4px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff7d0,#9a6a1a 70%);box-shadow:0 0 0 1px #5a3a04}
.yn-kz-pl::before{left:9px}.yn-kz-pl::after{right:9px}
.yn-kz-pl b{max-width:100%;white-space:nowrap;font:400 clamp(16px,5.4cqw,23px)/1.05 'Lilita One',sans-serif;letter-spacing:.03em;text-transform:uppercase;text-shadow:0 1px 0 rgba(255,255,255,.55)}
.yn-kz-pl span{display:flex;align-items:center;gap:5px;max-width:100%;white-space:nowrap;font:600 clamp(11.5px,3.5cqw,14px)/1.15 'Fredoka',sans-serif;color:#4a2c00}
.yn-kz-pl span svg{flex:none;width:14px;height:14px;fill:#a5281a}
.yn-kz-pl span i.alt{font-style:normal}
.yn-kz-pl span em{flex:none;padding:0 5px;border-radius:3px;font:italic 900 12px/16px 'Barlow Condensed',sans-serif;letter-spacing:.06em;color:#fff;background:#2a3a8a;font-style:normal}
.yn-kz.rv .yn-kz-pl{animation:ynKzPlaka .55s 1.55s cubic-bezier(.3,1.5,.5,1) both}
/* alt şerit: oyuncular (soruda rakiplerin kazıdığı pay, cevapta herkesin puanı) */
.yn-kz-oy{flex:none;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:5px 7px;min-height:28px;padding:0 2px}
.yn-kz-oy>small{flex:none;font:italic 800 10px/1 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:rgba(255,255,255,.6)}
.yn-kz-c{position:relative;flex:none;display:flex;align-items:center;gap:5px;height:28px;padding:0 9px 0 3px;border-radius:7px;background:rgba(0,0,0,.32);box-shadow:inset 0 0 0 1.5px var(--pc,#fff);transform:skewX(-8deg)}
.yn-kz-c>*{transform:skewX(8deg)}
.yn-kz-c .fl-av{flex:none;width:22px;height:22px;border-radius:5px;overflow:hidden;box-shadow:0 0 0 1.5px #fff}
.yn-kz-c .fl-av svg{display:block;width:100%;height:100%}
.yn-kz-c b{font:italic 900 15px/1 'Barlow Condensed','Lilita One',sans-serif;color:#fff;white-space:nowrap}
.yn-kz-c small{font:italic 800 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.04em;color:rgba(255,255,255,.75);white-space:nowrap}
.yn-kz-c i{flex:none;width:14px;height:14px;color:#7dff9a;opacity:0;transform:skewX(8deg) scale(.4);transition:opacity .2s,transform .3s cubic-bezier(.3,1.7,.5,1)}
.yn-kz-c i svg{display:block;width:100%;height:100%}
.yn-kz-c.done i{opacity:1;transform:skewX(8deg) scale(1)}
.yn-kz-c.no i{color:#ff7a66}
.yn-kz-c.win{background:linear-gradient(90deg,#ffe066,#ffbb1f);box-shadow:inset 0 0 0 1.5px #fff,0 0 14px rgba(255,210,90,.55)}
.yn-kz-c.win b,.yn-kz-c.win small{color:#1a1200}
.yn-kz-c.win i{color:#1a7a3a}
.yn-kz-c.me .fl-av{box-shadow:0 0 0 2px #ffd25a}
.yn-kz.rv.iyi .yn-kz-bilet{animation:ynKzIyi 1.2s 1.6s ease-in-out 2 alternate}
@keyframes ynKzIyi{from{box-shadow:inset 0 0 0 2px rgba(255,214,120,.55),inset 0 0 0 5px rgba(0,0,0,.18),inset 0 0 0 6.5px rgba(255,214,120,.25),0 12px 26px rgba(0,0,0,.5)}to{box-shadow:inset 0 0 0 2px rgba(255,234,150,.95),inset 0 0 0 5px rgba(0,0,0,.18),inset 0 0 0 6.5px rgba(255,214,120,.5),0 0 30px rgba(255,210,90,.6),0 12px 26px rgba(0,0,0,.5)}}
.yn-kz.rv .yn-kz-c{animation:ynKzRow .4s calc(1.7s + var(--k,0) * .09s) cubic-bezier(.2,.9,.3,1.3) both}
.yn-kz .fl-opts{gap:8px}
.yn-kz .fl-opt{min-height:48px}
@media (max-height:700px){
  .yn-kz{gap:7px}
  .yn-kz-bilet{gap:5px;padding:6px 8px 6px}
  .yn-kz-logo{font-size:18px}
  .yn-kz-puan b{font-size:26px}
  .yn-kz .fl-opt{min-height:42px;font-size:17px}
  .yn-kz-oy{min-height:24px}
  .yn-kz-c{height:24px}
  .yn-kz-c .fl-av{width:19px;height:19px}
}
@media (max-height:600px){
  .yn-kz-ust{min-height:24px}
  .yn-kz-logo small{display:none}
  .yn-kz-pen{min-height:84px}
  .yn-kz .fl-opts{gap:6px}
  .yn-kz .fl-opt{min-height:38px;font-size:16px}
}
@container (max-width:330px){.yn-kz-pl span i.alt{display:none}}
@container (max-height:150px){
  .yn-kz-pl{bottom:5%;padding:2px 20px 3px;border-radius:5px;gap:0}
  .yn-kz-pl b{font-size:15px}
  .yn-kz-pl span{font-size:11px}
  .yn-kz-pl span svg{width:11px;height:11px}
  .yn-kz-pl span i.alt{display:none}
}
@container (max-width:370px){
  .yn-kz.rv .yn-kz-c small,.yn-kz.rv .yn-kz-c i{display:none}
  .yn-kz.rv .yn-kz-c{padding-right:8px}
  .yn-kz.rv .yn-kz-c.no{box-shadow:inset 0 0 0 1.5px #ff7a66;background:rgba(120,20,10,.45)}
  .yn-kz.rv .yn-kz-c b{font-size:14px}
}
@media (max-height:700px){.yn-kz.rv .yn-kz-ust{display:none}}
@keyframes ynKzBump{0%{transform:scale(1.22)}100%{transform:none}}
@keyframes ynKzSwipe{0%,100%{transform:translate(-14px,4px) rotate(-12deg)}50%{transform:translate(14px,-4px) rotate(10deg)}}
@keyframes ynKzKir{0%{opacity:1;transform:translate(var(--x0),var(--y0)) rotate(0)}100%{opacity:0;transform:translate(var(--x1),var(--y1)) rotate(var(--r,180deg))}}
@keyframes ynKzGlint{0%{opacity:0;transform:translateX(-70%)}15%{opacity:1}85%{opacity:1}100%{opacity:0;transform:translateX(70%)}}
@keyframes ynKzPlaka{0%{opacity:0;transform:translate(-50%,140%) rotate(-3deg)}100%{opacity:1;transform:translate(-50%,0) rotate(0)}}
@keyframes ynKzRow{0%{opacity:0;transform:skewX(-8deg) translateY(10px) scale(.9)}100%{opacity:1;transform:skewX(-8deg)}}
@media (prefers-reduced-motion:reduce){.yn-kz-ip span{animation:none}}
`;

/** Folyonun durgun yüzü: metal degrade, ince fırça dokusu, kabartma desen ve ortada soru işaretli madalyon. */
function folyoCiz(c, f, seed, etiket = '') {
	const ctx = c.getContext('2d');
	const W = c.width;
	const H = c.height;
	ctx.globalCompositeOperation = 'source-over';
	ctx.clearRect(0, 0, W, H);
	const g = ctx.createLinearGradient(0, 0, W, H);
	f.stops.forEach((s, i) => g.addColorStop(i / (f.stops.length - 1), s));
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, W, H);
	if (f.rainbow) {
		// hologram: yarı saydam gökkuşağı bantları ve inci parıltısı
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
	// kabartma desen: eğik satırlarda KAZI KAZAN ve yıldızlar (açık ve koyu kayık iki kopya)
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

// en son açılan kart (eski kartın zamanlayıcıları yenisini bozmasın)
let LIVE = 0;
// çizilmiş resimler (soru kimliği + boy): galeride aynı örneğe dönünce hemen hazır
const RESIM = new Map();

export const kazi = {
	time: 24,
	label: 'Kazı Kazan',
	kind: 'closest',
	cover: true, // tam ekran bilet (harita gizli)
	calm: true, // harita arkada durgun (klasik tiplerle aynı işaret)
	jokers: ['yari', 'kahin'],
	revealMs: 3200, // soyulma + parıltı + plaka
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
		el.innerHTML = `<div class="yn-kz f-${esc(q.folyo || 'gumus')}">
			<div class="yn-kz-bilet">
				<div class="yn-kz-ust"><span class="yn-kz-logo">KAZI<i>KAZAN</i></span>
					<span class="yn-kz-puan"><small>KALAN PUAN</small><b>100</b><i>${'<u class="on"></u>'.repeat(10)}</i></span></div>
				<div class="yn-kz-pen"><canvas class="yn-kz-res"></canvas><canvas class="yn-kz-fol" aria-label="kazı kazan folyosu: parmağınla kazı"></canvas><canvas class="yn-kz-sim"></canvas>
					<div class="yn-kz-ip"><span>${COIN}</span><b>PARMAĞINLA KAZI</b></div><i class="yn-kz-isi"></i><div class="yn-kz-pl"></div></div>
				<div class="yn-kz-oy">${foes.length && !foes.some((b) => human && b.p.team != null && b.p.team === human.team) ? '<small>RAKİP</small>' : ''}${foes.map((b, k) => `<span class="yn-kz-c" data-p="${b.p.i}" style="--pc:${esc(b.p.css || '#888')};--k:${k}">${avOf(card, b.p)}<b>%0</b></span>`).join('')}</div>
			</div>
			<div data-r="o"></div>
		</div>`;
		rule(el, 'Az kazı, çok kazan');
		const root = el.querySelector('.yn-kz');
		const pen = root.querySelector('.yn-kz-pen');
		const cvR = pen.querySelector('.yn-kz-res');
		const cvF = pen.querySelector('.yn-kz-fol');
		const cvS = pen.querySelector('.yn-kz-sim');
		const ip = pen.querySelector('.yn-kz-ip');
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
		let peeling = false;
		let peeled = false;
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
		// ---------------------------------------------------------------- resim: önbellek, CPU çizimi ya da yedek
		const K = q.kadraj || {};
		const th = { ...(TEMA[q.tema] || TEMA.gunduz), ...(K.ground ? { ground: K.ground } : {}) };
		let pic = null; // { W, H, rgba } ya da canvas
		let job = null;
		let jobT = 0;
		let picDrawn = false;
		const putPic = () => {
			if (!pic || picDrawn) return;
			picDrawn = true;
			cvR.width = pic.W;
			cvR.height = pic.H;
			const x = cvR.getContext('2d');
			if (pic.rgba) x.putImageData(new ImageData(pic.rgba, pic.W, pic.H), 0, 0);
			else yedek(x, pic.W, pic.H, q.tema);
		};
		const startJob = (Wc, Hc) => {
			// resmin boyu pencerenin oranında; genişlik pencerenin CSS genişliğinin 1,3 katı (en çok 460): 2×2 örneklemeyle
			const low = (app?.tier?.id ?? 1) === 0; // düşük kademe: daha küçük resim (çizim süresi yarıya iner)
			const W = Math.round(clamp(Wc * (low ? 1 : 1.3), 220, low ? 360 : 460));
			const H = Math.round(W * clamp(Hc / Math.max(1, Wc), 0.38, 0.9));
			const key = `${q.id}|${q.model}|${W}x${H}`;
			if (RESIM.has(key)) {
				pic = RESIM.get(key);
				return putPic();
			}
			// bekleme: temanın göğü ve zemini (siluetsiz: yanıltmasın); kazınan yer boş görünmez
			cvR.width = W;
			cvR.height = H;
			yedek(cvR.getContext('2d'), W, H, q.tema, false);
			if (!HEROES[q.model]) {
				pic = { W, H, rgba: null };
				return putPic();
			}
			const L = [Math.cos(K.el ?? 0.8) * Math.sin(K.az ?? 1), Math.sin(K.el ?? 0.8), Math.cos(K.el ?? 0.8) * Math.cos(K.az ?? 1)];
			const gen = (function* () {
				const it = modelKur(q.model);
				let s;
				while (!(s = it.next()).done) yield;
				const g = s.value;
				const ao = g.userData.ao;
				if (ao) {
					const t0 = performance.now();
					while (!ao.next().done) if (performance.now() - t0 > 6) yield;
				}
				const geo = { pos: g.getAttribute('position').array, nor: g.getAttribute('normal').array, col: g.getAttribute('col').array, info: g.getAttribute('info').array };
				const out = {};
				yield* ciz(geo, { W, H, ss: 2, yaw: K.yaw, pitch: K.pitch, fov: K.fov || 30, fill: K.fill || 0.8, box: K.box, panX: K.panX, panY: K.panY, groundY: K.gy, light: L, theme: th, slice: 7 }, out);
				g.dispose();
				return out;
			})();
			job = gen;
			const pump = () => {
				if (job !== gen || LIVE !== me || !el.isConnected) return;
				const t0 = performance.now();
				try {
					while (performance.now() - t0 < 9) {
						const r = gen.next();
						if (r.done) {
							job = null;
							pic = { W: r.value.W, H: r.value.H, rgba: r.value.rgba };
							RESIM.set(key, pic);
							if (RESIM.size > 6) RESIM.delete(RESIM.keys().next().value);
							return putPic();
						}
					}
				} catch (e) {
					console.error('kazı kazan resmi çizilemedi', e);
					job = null;
					pic = { W, H, rgba: null };
					return putPic();
				}
				jobT = setTimeout(pump, 0);
			};
			jobT = setTimeout(pump, 0);
		};
		const finishJob = () => {
			if (!job) return;
			clearTimeout(jobT);
			const gen = job;
			job = null;
			try {
				let r;
				while (!(r = gen.next()).done);
				pic = { W: r.value.W, H: r.value.H, rgba: r.value.rgba };
			} catch (e) {
				pic = { W: cvR.width, H: cvR.height, rgba: null };
			}
			putPic();
		};
		// ---------------------------------------------------------------- folyo: boy, çizim, kazıma
		let fw = 0;
		let fh = 0;
		let dpr = 1;
		let rect = null;
		const fctx = cvF.getContext('2d');
		const brushPx = () => clamp((rect?.width || 300) * 0.06, 13, 24);
		const stampAt = (nx, ny, r, k) => {
			// pürüzlü madeni para izi: kenarında folyonun kalkık gölgesi, sonra birkaç kayık daire silinir
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
			// pay ızgarası
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
				stampAt(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r, (stroke?.k || 0) + i);
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
				stampAt(s.p[0][0], s.p[0][1], r0, 0);
				for (let i = 1; i < s.p.length; i++) segment(s.p[i - 1], s.p[i], r0, false);
			}
			if (!pic && !job) startJob(r.width, r.height);
			return true;
		};
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => !peeling && !peeled && size()) : null;
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
		// folyo kırıntısı
		let lastKir = 0;
		const kirinti = (nx, ny) => {
			const t = clock.now();
			if (t - lastKir < 38) return;
			lastKir = t;
			const e = document.createElement('i');
			e.className = 'yn-kz-kir';
			const px = nx * rect.width;
			const py = ny * rect.height;
			const dx = (Math.random() - 0.5) * 40;
			const col = f.stops[Math.floor(Math.random() * f.stops.length)];
			e.style.cssText = `--s:${(2.5 + Math.random() * 3.5).toFixed(1)}px;--c:${col};--x0:${px.toFixed(0)}px;--y0:${py.toFixed(0)}px;--x1:${(px + dx).toFixed(0)}px;--y1:${(py + 18 + Math.random() * 26).toFixed(0)}px;--r:${Math.round(Math.random() * 540 - 270)}deg`;
			pen.appendChild(e);
			setTimeout(() => e.remove(), 760);
		};
		const toN = (ev) => {
			const r = rect || pen.getBoundingClientRect();
			return [clamp((ev.clientX - r.left) / r.width, 0, 1), clamp((ev.clientY - r.top) / r.height, 0, 1)];
		};
		let lastSnd = 0;
		let lastBuzz = 0;
		let first = true;
		cvF.addEventListener('pointerdown', (ev) => {
			if (locked || peeling || !t0) return;
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
		const frame = () => {
			raf = 0;
			if (LIVE !== me || !el.isConnected) return;
			const tl = (clock.now() - t0) / 1000;
			if (!peeling && !peeled && !locked) shimmer(tl);
			else if (simOn) {
				sctx.clearRect(0, 0, cvS.width, cvS.height);
				simOn = false;
			}
			if (!peeled) foeTick(tl);
			if (!peeled) raf = requestAnimationFrame(frame);
		};
		// tam ekran kart haritayı bütünüyle örter: kart oturunca (açılış geçişinden sonra) 3B harita çizilmez, son karesi
		// arkada durur (pil, kare hızı: balonlar ve kazıma düşük telefonda da akıcı). Kart kapanınca sınıfın çizimi geri gelir.
		const noDraw = () => {};
		let drawT = 0;
		const stopOpen = onOpen(el, () => {
			drawT = setTimeout(() => {
				if (LIVE === me && el.isConnected && app && !Object.prototype.hasOwnProperty.call(app, 'render')) app.render = noDraw;
			}, 450);
			t0 = clock.now();
			if (!rect) size();
			raf = requestAnimationFrame(frame);
		});
		// ---------------------------------------------------------------- imza: soyulma (köşeden kıvrılan folyo)
		const peel = (ms, done) => {
			if (!fw || !fh) {
				// folyo hiç boyanmadıysa (kart ölçülmeden cevap geldi): resim yine açılır
				cvF.style.visibility = 'hidden';
				peeled = true;
				return done?.();
			}
			peeling = true;
			const W = fw;
			const H = fh;
			const snap = document.createElement('canvas');
			snap.width = W;
			snap.height = H;
			snap.getContext('2d').drawImage(cvF, 0, 0);
			// arka yüz: aynı delikler, kâğıt rengi + ince baskı
			const back = document.createElement('canvas');
			back.width = W;
			back.height = H;
			const bx = back.getContext('2d');
			bx.drawImage(snap, 0, 0);
			bx.globalCompositeOperation = 'source-in';
			bx.fillStyle = f.back;
			bx.fillRect(0, 0, W, H);
			bx.globalCompositeOperation = 'source-atop';
			bx.fillStyle = 'rgba(120,110,90,.12)';
			for (let y = 0; y < H; y += Math.max(3, H / 40)) bx.fillRect(0, y, W, 1);
			bx.globalCompositeOperation = 'source-over';
			const C0 = [W, H];
			const T = [-W * 0.35, -H * 0.35];
			const a0 = clock.now();
			const ease = (x) => (x < 0.16 ? 0.05 * (x / 0.16) : 0.05 + 0.95 * (1 - Math.pow(1 - (x - 0.16) / 0.84, 2.2)));
			const clipHalf = (poly, M, u, keepNeg) => {
				// Sutherland–Hodgman: (p − M)·u < 0 (keepNeg) ya da > 0 yarısı
				const out = [];
				const s = (p) => ((p[0] - M[0]) * u[0] + (p[1] - M[1]) * u[1]) * (keepNeg ? -1 : 1);
				for (let i = 0; i < poly.length; i++) {
					const A = poly[i];
					const B = poly[(i + 1) % poly.length];
					const sa = s(A);
					const sb = s(B);
					if (sa >= 0) out.push(A);
					if (sa >= 0 !== sb >= 0) {
						const t = sa / (sa - sb);
						out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]);
					}
				}
				return out;
			};
			const path = (ctx, poly) => {
				ctx.beginPath();
				poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
				ctx.closePath();
			};
			const step = () => {
				if (LIVE !== me || !el.isConnected) return;
				const k = Math.min(1, (clock.now() - a0) / ms);
				const e = ease(k);
				const Cp = [C0[0] + (T[0] - C0[0]) * e, C0[1] + (T[1] - C0[1]) * e];
				let u = [C0[0] - Cp[0], C0[1] - Cp[1]];
				const ul = Math.hypot(u[0], u[1]) || 1;
				u = [u[0] / ul, u[1] / ul];
				const M = [(C0[0] + Cp[0]) / 2, (C0[1] + Cp[1]) / 2];
				const rectP = [[0, 0], [W, 0], [W, H], [0, H]];
				const flat = clipHalf(rectP, M, u, true);
				const lifted = clipHalf(rectP, M, u, false);
				const md = M[0] * u[0] + M[1] * u[1];
				const refl = (p) => {
					const d = (p[0] * u[0] + p[1] * u[1] - md) * 2;
					return [p[0] - d * u[0], p[1] - d * u[1]];
				};
				const flap = lifted.map(refl);
				fctx.globalCompositeOperation = 'source-over';
				fctx.clearRect(0, 0, W, H);
				if (flat.length > 2) {
					fctx.save();
					path(fctx, flat);
					fctx.clip();
					fctx.drawImage(snap, 0, 0);
					fctx.restore();
				}
				if (flap.length > 2) {
					// kıvrımın gölgesi (resme ve folyoya)
					fctx.save();
					fctx.shadowColor = 'rgba(0,0,0,.5)';
					fctx.shadowBlur = 14 * dpr;
					fctx.shadowOffsetX = -4 * dpr * u[0];
					fctx.shadowOffsetY = -4 * dpr * u[1];
					fctx.fillStyle = 'rgba(0,0,0,.35)';
					path(fctx, flap);
					fctx.fill();
					fctx.restore();
					// arka yüz: yansıtılmış folyo (delikleriyle)
					fctx.save();
					path(fctx, flap);
					fctx.clip();
					fctx.setTransform(1 - 2 * u[0] * u[0], -2 * u[0] * u[1], -2 * u[0] * u[1], 1 - 2 * u[1] * u[1], 2 * md * u[0], 2 * md * u[1]);
					fctx.drawImage(back, 0, 0);
					fctx.setTransform(1, 0, 0, 1, 0, 0);
					// kıvrım gölgelemesi: katlama çizgisinde koyu, uca doğru parlak
					const span = Math.max(20, ul * 0.5);
					const g = fctx.createLinearGradient(M[0], M[1], M[0] - u[0] * span, M[1] - u[1] * span);
					g.addColorStop(0, 'rgba(60,50,30,.45)');
					g.addColorStop(0.22, 'rgba(255,255,255,.28)');
					g.addColorStop(0.6, 'rgba(255,255,255,.05)');
					g.addColorStop(1, 'rgba(40,30,20,.18)');
					fctx.fillStyle = g;
					fctx.fillRect(0, 0, W, H);
					fctx.restore();
				}
				if (k < 1) requestAnimationFrame(step);
				else {
					fctx.clearRect(0, 0, W, H);
					peeling = false;
					peeled = true;
					cvF.style.visibility = 'hidden';
					done?.();
				}
			};
			requestAnimationFrame(step);
		};
		const close = onClose(el, () => {
			stopOpen();
			clearTimeout(drawT);
			if (app && app.render === noDraw) delete app.render;
			cancelAnimationFrame(raf);
			if (meterRaf) cancelAnimationFrame(meterRaf);
			clearTimeout(jobT);
			job = null;
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
				if (!pic) finishJob();
				putPic();
				ip.classList.add('gone');
				const meR = results.find((r) => r.p?.human);
				// kendi puanım: gönderdiğim değerden (denetim araçları da aynı yoldan cevaplar)
				if (meR?.value) setMeter(meR.value.i === v.right ? puanOf(meR.value.s) : 0);
				// plaka: ad, il (plaka numarasıyla), ikinci satır
				const il = ILLER.get(q.il) || '';
				plaka.innerHTML = `<b>${esc(q.ad || q.a[0])}</b><span>${PIN}${esc(il)}${q.alt ? `<i class="alt">· ${esc(q.alt)}</i>` : ''}<em>${String(q.il || '').padStart(2, '0')}</em></span>`;
				// alt şerit: herkesin sonucu (sıralı): portre, puan ya da YANLIŞ, kazıdığı pay
				const order = results.slice().sort((a, b) => a.err - b.err || a.time - b.time);
				oy.innerHTML = order
					.map((r, k) => {
						const j = kazi.judge(v, r.value);
						const s = Math.round(clamp(Number(r.value?.s) || 0, 0, 1) * 100);
						const win = k === 0 && j.correct;
						return `<span class="yn-kz-c done${j.correct ? '' : ' no'}${win ? ' win' : ''}${r.p?.human ? ' me' : ''}" style="--pc:${esc(r.color)};--k:${k}">${avOf(card, r.p)}<b>${r.value == null ? '—' : j.correct ? j.score : 'YANLIŞ'}</b>${r.value == null ? '' : `<small>%${s}</small>`}<i>${j.correct ? CHECK : CROSS}</i></span>`;
					})
					.join('');
				root.classList.add('rv');
				root.classList.toggle('iyi', !!meR?.correct);
				sesA.soy();
				peel(matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 500 : 1100, () => {});
				setTimeout(() => sesA.plaka(!!meR?.correct), 1250);
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
	/** Çevrimiçi görünüm: doğru şık yok (maketin adı resmi çizmek için gerekir; mac.js sertleştirmesi Gölge'deki gibi). */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.right;
		delete o.q.a;
		delete o.q.ad;
		delete o.q.alt;
		delete o.q.il;
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
