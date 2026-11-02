// Tasarım dili defteri (yalnız soru galerisinde): aynı soru ("Güneş Sistemi'nde kaç gezegen vardır?", sürgülü tahmin,
// en yakın kazanır) altı ayrı tasarım dilinde, telefon boyunda yan yana. Üçü bugüne kadar kullanılan diller, üçü öneri:
//   Arena v1   ref/tasarim-v14-yonler.jpg C: koyu panel, eğik kesimler, tek renk, altın vurgu
//   Arena v2   bugünkü oyun (ref/C_arena2.jpg): renkli harf blokları, renkli eğik jokerler, kırmızı alt çizgi
//   Arcade v1  bugünkü sayı girişi: yuvarlak, tombul, beyaz tuşlar, sarı basma düğme
//   YENİ Yayın        spor yayını grafiği: harita açık kalır, bilgiler beyaz plakalarda, sert gölge, tek sıcak kırmızı
//   YENİ Harp Masası  savaş masası: kontur çizgili koyu yeşil, pirinç çerçeve, cetvel sürgü, madeni para tuşlar
//   YENİ Çini         İznik çinisi: açık sırlı panel, kobalt ve turkuaz, mercan kırmızısı, kemerli üst kenar
// Sürgü, ±tuşlar ve GÖNDER her çerçevede çalışır; süre 20 sn'den geri sayar (canlı his için). Oyunun koduna dokunmaz.

import { avatarSVG, ico } from './art.js';
import { TSD_BG } from './tasarim_bg.js';

const FLASK = 'M9 3h6M10 3v6.5L4.6 18.3A1.8 1.8 0 0 0 6.2 21h11.6a1.8 1.8 0 0 0 1.6-2.7L14 9.5V3M7.5 14.5h9';
const JOKERS = [
	['half', '50/50', 2],
	['eye', 'Seyirci', 1],
	['clock', 'Süre', 2],
	['heart', 'Şans', 1],
	['bolt', 'Sabotaj', 1],
	['shield', 'Kalkan', 1],
];

const DESIGNS = [
	{ id: 'a1', name: 'Arena v1', tag: 'ESKİ', note: 'İlk arena taslağı: koyu panel, eğik kesimler, tek renk; vurgu yalnız altın.' },
	{ id: 'a2', name: 'Arena v2', tag: 'OYUNDA', note: 'Bugünkü oyun: renkli bloklar ve jokerler, açık zemin değer kutusu, kırmızı alt çizgi.' },
	{ id: 'c1', name: 'Arcade v1', tag: 'OYUNDA', note: 'Bugünkü sayı girişi: yuvarlak, tombul; beyaz tuşlar, sarı basma düğme.' },
	{ id: 'n1', name: 'Yayın', tag: 'YENİ', note: 'Spor yayını grafiği: harita açık kalır, bilgi beyaz plakalarda; sert gölge, tek sıcak kırmızı, cetvel çentikli sürgü.' },
	{ id: 'n2', name: 'Harp Masası', tag: 'YENİ', note: 'Savaş masası: kontur çizgili koyu yeşil, pirinç çerçeve ve perçin; cetvel sürgü, madeni para tuşlar, mühür düğme.' },
	{ id: 'n3', name: 'Çini', tag: 'YENİ', note: 'İznik çinisi: açık sırlı panel, kobalt ve turkuaz, mercan kırmızısı; kemerli üst kenar, sırlı karo tuşlar.' },
];

const A = { kind: 'yeniceri', color: '#e0402f', skin: 0, banner: 'x' };
const D = { kind: 'astronot', color: '#2f6be0', skin: 2, banner: 'x' };

function phone(d) {
	const jk = JOKERS.map(([i, n, c]) => `<span class="j">${ico(i, { w: 2.2, c: 'currentColor' })}<b>${n}</b><em>${c}</em></span>`).join('');
	const ticks = d.id === 'n2' || d.id === 'n1' ? `<div class="rl">${[0, 5, 10, 15, 20].map((v) => `<i style="--x:${v / 20}">${v}</i>`).join('')}</div>` : '';
	return `<div class="ph ${d.id}">
	<div class="bg"></div>
	<div class="top">
		<div class="pl a"><i class="av">${avatarSVG(A)}</i><span class="nm"><small>SALDIRAN</small><b>SEN</b><em>2.200</em></span></div>
		<div class="vs"><b>VS</b></div>
		<div class="pl d"><span class="nm"><small>SAVUNAN</small><b>DEFNE</b><em>2.400</em></span><i class="av">${avatarSVG(D)}</i></div>
	</div>
	<div class="where">ÇANKIRI</div>
	<div class="pan">
		<div class="hd"><span class="cat">${ico(FLASK, { w: 2.2, c: 'currentColor' })}<b>BİLİM</b></span><span class="rule">EN YAKIN KAZANIR</span><span class="clk"><b>16</b><s>SN</s></span></div>
		<div class="tb"><i></i></div>
		<h3 class="qq">Güneş Sistemi’nde kaç gezegen vardır?</h3>
		<div class="val"><b class="n">11</b><span>gezegen</span></div>
		<div class="sl"><input type="range" min="0" max="20" step="1" value="11" aria-label="Tahmin">${ticks}</div>
		<div class="st"><button data-d="-10">−10</button><button data-d="-1">−1</button><button data-d="1">+1</button><button data-d="10">+10</button></div>
		<button class="go">GÖNDER</button>
		<div class="jk">${jk}</div>
	</div>
</div>`;
}

// kontur çizgileri (Harp Masası) ve çini deseni (Çini): küçük SVG döşemeler
const TOPO = `url("data:image/svg+xml,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" fill="none" stroke="#d9b45a" stroke-opacity=".13" stroke-width="1"><path d="M-10 40C30 20 50 70 90 50s60-30 90-10"/><path d="M-10 60C30 40 50 90 90 70s60-30 90-10"/><path d="M-10 84C26 66 56 110 92 92s56-26 88-8"/><path d="M-10 110C30 92 50 140 90 120s60-30 90-10"/><path d="M-10 136C30 118 50 166 90 146s60-30 90-10"/><path d="M-10 14C30-6 50 44 90 24s60-30 90-10"/><ellipse cx="118" cy="98" rx="14" ry="8"/><ellipse cx="118" cy="98" rx="6" ry="3"/></svg>',
)}")`;
const TILE = `url("data:image/svg+xml,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><g fill="none" stroke-width="1.6"><path d="M22 4c6 6 6 12 0 18-6-6-6-12 0-18zM22 40c6-6 6-12 0-18-6 6-6 12 0 18zM4 22c6-6 12-6 18 0-6 6-12 6-18 0zM40 22c-6-6-12-6-18 0 6 6 12 6 18 0z" stroke="#1d3f9a" stroke-opacity=".16"/><circle cx="22" cy="22" r="3" fill="#d8432f" fill-opacity=".22" stroke="none"/><circle cx="0" cy="0" r="5" stroke="#1fa3a3" stroke-opacity=".22"/><circle cx="44" cy="0" r="5" stroke="#1fa3a3" stroke-opacity=".22"/><circle cx="0" cy="44" r="5" stroke="#1fa3a3" stroke-opacity=".22"/><circle cx="44" cy="44" r="5" stroke="#1fa3a3" stroke-opacity=".22"/></g></svg>',
)}")`;

const CSS = /* css */ `
.tsd{position:fixed;inset:0;z-index:200;overflow:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;background:radial-gradient(120% 70% at 50% 0%,#141b33,#05060b 70%);color:#eef2fa;font-family:'Manrope',system-ui,sans-serif}
.tsd[hidden]{display:none}
.tsd-hd{position:sticky;left:0;top:0;z-index:2;display:flex;align-items:flex-start;gap:12px;padding:calc(12px + env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) 12px max(16px,env(safe-area-inset-left,0px));background:linear-gradient(#05060bf2 70%,#05060b00)}
.tsd-hd div{flex:1;min-width:0}
.tsd-hd h2{margin:0;font-family:'Lilita One',system-ui,sans-serif;font-weight:400;font-size:24px;line-height:1.05;color:#ffd25a}
.tsd-hd p{margin:4px 0 0;font-weight:700;font-size:12px;line-height:1.4;color:#9fb0d6;max-width:62ch}
.tsd-hd button{flex:none;width:38px;height:38px;border-radius:12px;border:1.5px solid rgba(255,255,255,.18);background:#16254d;color:#fff;font-size:18px;cursor:pointer}
.tsd-row{display:flex;gap:22px;padding:4px max(16px,env(safe-area-inset-right,0px)) 28px max(16px,env(safe-area-inset-left,0px));overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
.tsd-it{flex:none;scroll-snap-align:center;display:flex;flex-direction:column;gap:8px;width:calc(340px * var(--k,1))}
.tsd-lb{display:flex;align-items:baseline;gap:8px}
.tsd-lb b{font-family:'Lilita One',system-ui,sans-serif;font-weight:400;font-size:19px;color:#fff}
.tsd-lb em{font-style:normal;padding:1px 7px 2px;border-radius:6px;font-weight:800;font-size:10px;letter-spacing:.12em;color:#3a2200;background:#ffd25a}
.tsd-lb em.old{color:#cfd9f2;background:#2a3557}
.tsd-lb em.on{color:#fff;background:#2fb45a}
.tsd-nt{min-height:34px;margin:0;font-weight:700;font-size:11.5px;line-height:1.4;color:#9fb0d6}
.tsd-fr{width:calc(340px * var(--k,1));height:calc(736px * var(--k,1))}
.tsd-fr .ph{transform:scale(var(--k,1));transform-origin:0 0}

/* ------------------------------------------------ ortak iskelet */
.tsd .ph{position:relative;width:340px;height:736px;border-radius:38px;overflow:hidden;background:#05060c;box-shadow:0 0 0 2px #1d2333,0 0 0 9px #0b0d14,0 30px 60px rgba(0,0,0,.65);isolation:isolate;-webkit-tap-highlight-color:transparent}
.tsd .ph *{box-sizing:border-box}
.tsd .ph .bg{position:absolute;left:0;right:0;top:56px;height:512px;background:url(${TSD_BG}) center/cover}
.tsd .ph .top{position:absolute;left:0;right:0;top:0;z-index:2;display:flex;align-items:center}
.tsd .ph .pl{flex:1;display:flex;align-items:center;gap:8px;min-width:0}
.tsd .ph .pl.d{justify-content:flex-end;text-align:right}
.tsd .ph .av{flex:none;display:block;overflow:hidden}
.tsd .ph .av svg{display:block;width:100%;height:100%}
.tsd .ph .nm{display:flex;flex-direction:column;min-width:0}
.tsd .ph .nm small,.tsd .ph .nm b,.tsd .ph .nm em{display:block;white-space:nowrap}
.tsd .ph .where{position:absolute;left:50%;top:104px;z-index:2;transform:translateX(-50%)}
.tsd .ph .pan{position:absolute;left:0;right:0;bottom:0;z-index:3;display:flex;flex-direction:column}
.tsd .ph .hd{display:flex;align-items:center;gap:8px}
.tsd .ph .cat{display:flex;align-items:center;gap:6px}
.tsd .ph .cat .fl-i{width:16px;height:16px}
.tsd .ph .rule{white-space:nowrap}
.tsd .ph .clk{margin-left:auto;display:flex;align-items:baseline;gap:3px}
.tsd .ph .clk s{text-decoration:none}
.tsd .ph .tb{position:relative;overflow:hidden}
.tsd .ph .tb i{position:absolute;left:0;top:0;bottom:0;width:calc(var(--t,.8) * 100%);transition:width .25s linear}
.tsd .ph .qq{margin:0}
.tsd .ph .val{display:flex;align-items:baseline;justify-content:center;gap:8px}
.tsd .ph .val .n{font-variant-numeric:tabular-nums}
.tsd .ph .sl{position:relative}
.tsd .ph input[type=range]{-webkit-appearance:none;appearance:none;display:block;width:100%;margin:0;background:transparent;cursor:pointer;touch-action:pan-y}
.tsd .ph input[type=range]::-webkit-slider-runnable-track{height:var(--th,8px);border-radius:var(--tr,99px);background:var(--trk)}
.tsd .ph input[type=range]::-moz-range-track{height:var(--th,8px);border-radius:var(--tr,99px);background:var(--trk)}
.tsd .ph input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:var(--kw,30px);height:var(--kh,30px);margin-top:calc((var(--th,8px) - var(--kh,30px)) / 2);border:0;border-radius:var(--kr,50%);background:var(--kb);box-shadow:var(--ks,none)}
.tsd .ph input[type=range]::-moz-range-thumb{width:var(--kw,30px);height:var(--kh,30px);border:0;border-radius:var(--kr,50%);background:var(--kb);box-shadow:var(--ks,none)}
.tsd .ph .rl{position:relative;height:14px;margin:4px calc(var(--kw,30px) / 2) 0;pointer-events:none}
.tsd .ph .rl i{position:absolute;left:calc(var(--x) * 100%);transform:translateX(-50%);font-style:normal}
.tsd .ph .st{display:grid;grid-template-columns:repeat(4,1fr)}
.tsd .ph button{font:inherit;color:inherit;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.tsd .ph .st button,.tsd .ph .go{transition:transform .08s,filter .08s}
.tsd .ph .st button:active,.tsd .ph .go:active,.tsd .ph .go.hit{transform:translateY(2px) scale(.98);filter:brightness(1.08)}
.tsd .ph .jk{display:grid;grid-template-columns:repeat(6,1fr)}
.tsd .ph .j{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center}
.tsd .ph .j .fl-i{width:20px;height:20px}
.tsd .ph .j b{white-space:nowrap}
.tsd .ph .j em{position:absolute;font-style:normal}

/* ================================================ Arena v1: koyu, eğik, tek renk + altın */
.tsd .a1 .top{height:96px;background:linear-gradient(104deg,#e5322d 0 50%,#2b6cf0 50%);padding:30px 12px 0}
.tsd .a1 .top::after{content:'';position:absolute;inset:auto 0 0;height:3px;background:rgba(0,0,0,.25)}
.tsd .a1 .av{width:46px;height:46px;border-radius:9px;border:2.5px solid #fff;box-shadow:0 3px 0 rgba(0,0,0,.25)}
.tsd .a1 .nm small{font:800 italic 9px/1 'Barlow Condensed',sans-serif;letter-spacing:.2em;color:rgba(255,255,255,.85)}
.tsd .a1 .nm b{font:900 italic 25px/1 'Barlow Condensed',sans-serif;color:#fff;text-transform:uppercase}
.tsd .a1 .nm em{font:800 italic 13px/1.1 'Barlow Condensed',sans-serif;color:#ffd25a;font-style:italic}
.tsd .a1 .vs{flex:none;width:52px;height:40px;display:grid;place-items:center;background:#0b0c12;transform:skewX(-10deg);border:2px solid #fff}
.tsd .a1 .vs b{transform:skewX(10deg);font:900 italic 22px/1 'Barlow Condensed',sans-serif;color:#ffd25a}
.tsd .a1 .where{top:100px;padding:3px 14px;background:#ffd25a;color:#1b1200;font:800 italic 11px/1.2 'Barlow Condensed',sans-serif;letter-spacing:.24em;clip-path:polygon(6% 0,100% 0,94% 100%,0 100%)}
.tsd .a1 .pan{padding:60px 14px 14px;gap:9px;background:linear-gradient(180deg,rgba(7,8,15,0),rgba(7,8,15,.92) 46px,#07080f 70px)}
.tsd .a1 .cat{padding:3px 14px 3px 8px;background:#2fb45a;clip-path:polygon(0 0,100% 0,90% 100%,0 100%)}
.tsd .a1 .cat b{font:800 italic 15px/1.1 'Barlow Condensed',sans-serif;letter-spacing:.14em}
.tsd .a1 .rule{font:700 italic 12px/1 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:rgba(255,255,255,.62)}
.tsd .a1 .clk b{font:800 italic 42px/.85 'Barlow Condensed',sans-serif;color:#fff}
.tsd .a1 .clk s{font:800 italic 15px/1 'Barlow Condensed',sans-serif;color:#ffd25a}
.tsd .a1 .tb{height:7px;background:rgba(255,255,255,.14);-webkit-mask:repeating-linear-gradient(90deg,#000 0 14px,transparent 14px 17px);mask:repeating-linear-gradient(90deg,#000 0 14px,transparent 14px 17px)}
.tsd .a1 .tb i{background:#ffc83a}
.tsd .a1 .qq{padding-left:12px;border-left:4px solid #2fb45a;font:700 23px/1.18 'Fredoka',sans-serif;color:#fff}
.tsd .a1 .val{padding:6px 0 4px;background:#11131d;border:1px solid rgba(255,255,255,.09);transform:skewX(-8deg)}
.tsd .a1 .val .n{transform:skewX(8deg);font:900 italic 56px/1 'Barlow Condensed',sans-serif;color:#ffc83a}
.tsd .a1 .val span{transform:skewX(8deg);font:800 italic 16px/1 'Barlow Condensed',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.55)}
.tsd .a1 .sl{--th:6px;--tr:0;--kw:16px;--kh:30px;--kr:2px;--kb:#ffc83a;--ks:0 0 0 2px #07080f,0 0 12px rgba(255,200,58,.5);--trk:linear-gradient(90deg,#ffc83a calc(var(--p) * 100%),#232637 0);padding:6px 0}
.tsd .a1 .st{gap:8px}
.tsd .a1 .st button{height:44px;background:#151826;border:1px solid rgba(255,255,255,.12);transform:skewX(-10deg);font:800 italic 21px/1 'Barlow Condensed',sans-serif;color:#fff}
.tsd .a1 .st button:active{transform:skewX(-10deg) translateY(2px)}
.tsd .a1 .go{height:50px;background:linear-gradient(90deg,#ffd25a,#ffb92a);clip-path:polygon(0 0,100% 0,97.5% 100%,0 100%);font:900 italic 25px/1 'Barlow Condensed',sans-serif;letter-spacing:.2em;color:#1b1200}
.tsd .a1 .jk{gap:6px;margin-top:2px}
.tsd .a1 .j{height:50px;gap:3px;border:1px solid rgba(255,255,255,.2);transform:skewX(-8deg)}
.tsd .a1 .j>*{transform:skewX(8deg)}
.tsd .a1 .j b{font:800 italic 8.5px/1 'Barlow Condensed',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.75)}
.tsd .a1 .j em{top:3px;right:5px;font:800 italic 10px/1 'Barlow Condensed',sans-serif;color:#ffd25a}
.tsd .a1 .j em::before{content:'×'}

/* ================================================ Arena v2: bugünkü oyun, renkli bloklar */
.tsd .a2 .top{height:96px;background:linear-gradient(104deg,#ff4a2f,#d81f1f 49.8%,#2f7cff 50.2%,#1f55d8);padding:30px 12px 0}
.tsd .a2 .av{width:48px;height:48px;border-radius:10px;border:3px solid #fff;box-shadow:0 4px 0 rgba(0,0,0,.28)}
.tsd .a2 .nm small{font:800 italic 9px/1 'Barlow Condensed',sans-serif;letter-spacing:.22em;color:rgba(255,255,255,.9)}
.tsd .a2 .nm b{font:900 italic 27px/.95 'Barlow Condensed',sans-serif;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.25)}
.tsd .a2 .nm em{font:800 italic 13px/1.1 'Barlow Condensed',sans-serif;color:#ffe08a}
.tsd .a2 .vs{flex:none;width:54px;height:42px;display:grid;place-items:center;background:#111;transform:skewX(-10deg);box-shadow:0 0 0 2px #fff,0 4px 0 2px rgba(0,0,0,.35)}
.tsd .a2 .vs b{transform:skewX(10deg);font:900 italic 24px/1 'Barlow Condensed',sans-serif;color:#ffd25a}
.tsd .a2 .where{top:100px;padding:3px 16px;background:#ffd25a;color:#1b1200;font:800 italic 11px/1.2 'Barlow Condensed',sans-serif;letter-spacing:.24em;clip-path:polygon(6% 0,100% 0,94% 100%,0 100%)}
.tsd .a2 .pan{padding:60px 12px 16px;gap:9px;background:linear-gradient(180deg,rgba(7,8,15,0),rgba(7,8,15,.9) 42px,#07080f 64px)}
.tsd .a2 .pan::after{content:'';position:absolute;inset:auto 0 0;height:4px;background:#ff3a2a}
.tsd .a2 .cat{padding:3px 14px 3px 8px;background:#22c55e;clip-path:polygon(0 0,100% 0,90% 100%,0 100%)}
.tsd .a2 .cat b{font:800 italic 15px/1.1 'Barlow Condensed',sans-serif;letter-spacing:.14em}
.tsd .a2 .rule{font:700 italic 12px/1 'Barlow Condensed',sans-serif;letter-spacing:.14em;color:rgba(255,255,255,.7)}
.tsd .a2 .clk b{font:800 italic 44px/.85 'Barlow Condensed',sans-serif;color:#fff;text-shadow:0 0 18px rgba(255,210,90,.45)}
.tsd .a2 .clk s{font:800 italic 16px/1 'Barlow Condensed',sans-serif;color:#ffd25a}
.tsd .a2 .tb{height:7px;background:rgba(255,255,255,.16);-webkit-mask:repeating-linear-gradient(90deg,#000 0 14px,transparent 14px 17px);mask:repeating-linear-gradient(90deg,#000 0 14px,transparent 14px 17px)}
.tsd .a2 .tb i{background:linear-gradient(90deg,#ffb020,#ffe066)}
.tsd .a2 .qq{padding-left:12px;border-left:4px solid #22c55e;font:700 24px/1.18 'Fredoka',sans-serif;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.5)}
.tsd .a2 .val{position:relative;padding:6px 0 6px 40px;background:linear-gradient(180deg,#fff,#e4e9f4);clip-path:polygon(0 0,100% 0,97.5% 100%,0 100%)}
.tsd .a2 .val::before{content:'≈';position:absolute;left:0;top:0;bottom:0;width:48px;display:grid;place-items:center;background:#ffb020;clip-path:polygon(0 0,100% 0,78% 100%,0 100%);font:900 italic 30px/1 'Barlow Condensed',sans-serif;color:#1b1200}
.tsd .a2 .val .n{font:900 italic 54px/1 'Barlow Condensed',sans-serif;color:#0e1430}
.tsd .a2 .val span{font:800 italic 17px/1 'Barlow Condensed',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#46507a}
.tsd .a2 .sl{--th:8px;--tr:0;--kw:18px;--kh:32px;--kr:3px;--kb:#fff;--ks:0 0 0 3px #ffb020,0 4px 0 2px rgba(0,0,0,.4);--trk:linear-gradient(90deg,#ffb020,#ffe066 calc(var(--p) * 100%),#1d2033 0);padding:7px 0}
.tsd .a2 .st{gap:7px}
.tsd .a2 .st button{height:46px;transform:skewX(-10deg);font:900 italic 22px/1 'Barlow Condensed',sans-serif;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.25);box-shadow:inset 0 -4px 0 rgba(0,0,0,.22)}
.tsd .a2 .st button:nth-child(1){background:#8b5cf6}.tsd .a2 .st button:nth-child(2){background:#ff8a1f}.tsd .a2 .st button:nth-child(3){background:#22c55e}.tsd .a2 .st button:nth-child(4){background:#2f7cff}
.tsd .a2 .st button:active{transform:skewX(-10deg) translateY(2px)}
.tsd .a2 .go{height:52px;background:linear-gradient(90deg,#ffd25a,#ffb020);clip-path:polygon(0 0,100% 0,97.5% 100%,0 100%);box-shadow:inset 0 -5px 0 rgba(150,80,0,.35);font:900 italic 26px/1 'Barlow Condensed',sans-serif;letter-spacing:.2em;color:#1b1200}
.tsd .a2 .jk{gap:5px;margin-top:4px}
.tsd .a2 .j{height:52px;gap:3px;transform:skewX(-8deg);box-shadow:inset 0 -4px 0 rgba(0,0,0,.22)}
.tsd .a2 .j>*{transform:skewX(8deg)}
.tsd .a2 .j:nth-child(1){background:#2f7cff}.tsd .a2 .j:nth-child(2){background:#ec4899}.tsd .a2 .j:nth-child(3){background:#16a34a}.tsd .a2 .j:nth-child(4){background:#8b5cf6}.tsd .a2 .j:nth-child(5){background:#f0532c}.tsd .a2 .j:nth-child(6){background:#f59e0b}
.tsd .a2 .j b{font:800 italic 8.5px/1 'Barlow Condensed',sans-serif;letter-spacing:.06em;text-transform:uppercase}
.tsd .a2 .j em{top:-6px;right:-3px;width:17px;height:17px;display:grid;place-items:center;background:#fff;color:#0e1430;font:800 italic 11px/1 'Barlow Condensed',sans-serif;box-shadow:0 2px 0 rgba(0,0,0,.35)}

/* ================================================ Arcade v1: yuvarlak, tombul */
.tsd .c1 .top{top:12px;left:10px;right:10px;height:72px;gap:6px}
.tsd .c1 .pl{height:64px;padding:0 10px;border-radius:18px;border:3px solid #1a1030;box-shadow:0 5px 0 #1a1030}
.tsd .c1 .pl.a{background:linear-gradient(180deg,#ff6a4d,#e0382a)}
.tsd .c1 .pl.d{background:linear-gradient(180deg,#5b93ff,#2f63e0)}
.tsd .c1 .av{width:44px;height:44px;border-radius:50%;border:3px solid #fff}
.tsd .c1 .nm small{font:600 9px/1 'Fredoka',sans-serif;letter-spacing:.1em;color:rgba(255,255,255,.85)}
.tsd .c1 .nm b{font:400 22px/1 'Lilita One',sans-serif;color:#fff;-webkit-text-stroke:1px #1a1030;text-shadow:0 2px 0 #1a1030}
.tsd .c1 .nm em{font:700 12px/1.1 'Fredoka',sans-serif;font-style:normal;color:#ffe066}
.tsd .c1 .vs{position:absolute;left:50%;top:6px;transform:translateX(-50%);z-index:2;width:50px;height:50px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 40% 35%,#ffe680,#ffb51e);border:3px solid #1a1030;box-shadow:0 4px 0 #1a1030}
.tsd .c1 .vs b{font:400 20px/1 'Lilita One',sans-serif;color:#fff;-webkit-text-stroke:1.2px #1a1030}
.tsd .c1 .where{top:96px;padding:4px 14px;border-radius:99px;background:#fff;color:#1a1030;font:400 13px/1.1 'Lilita One',sans-serif;letter-spacing:.06em;box-shadow:0 3px 0 #1a1030}
.tsd .c1 .pan{margin:0 8px 10px;left:0;right:0;padding:14px 12px 12px;gap:10px;border-radius:26px;background:#10131f;border:3px solid #1f2540;box-shadow:0 10px 30px rgba(0,0,0,.5)}
.tsd .c1 .cat{padding:4px 12px 4px 8px;border-radius:10px;background:#2fb45a;box-shadow:0 3px 0 #17733a}
.tsd .c1 .cat b{font:400 15px/1.1 'Lilita One',sans-serif;letter-spacing:.04em}
.tsd .c1 .rule{font:700 italic 12px/1 'Barlow Condensed',sans-serif;letter-spacing:.12em;color:rgba(255,255,255,.75)}
.tsd .c1 .clk b{font:400 38px/.9 'Lilita One',sans-serif;color:#f5ff8a;text-shadow:0 0 14px rgba(230,255,120,.4)}
.tsd .c1 .clk s{font:400 13px/1 'Lilita One',sans-serif;color:#f5ff8a}
.tsd .c1 .tb{height:8px;border-radius:99px;background:rgba(255,255,255,.12)}
.tsd .c1 .tb i{border-radius:99px;background:linear-gradient(90deg,#d6f53a,#f5ff8a)}
.tsd .c1 .qq{font:700 24px/1.2 'Fredoka',sans-serif;color:#fff}
.tsd .c1 .val{padding:8px 0;border-radius:18px;background:#141a33;border:2px solid rgba(255,255,255,.1)}
.tsd .c1 .val .n{font:400 54px/1 'Lilita One',sans-serif;color:#ffd84a;-webkit-text-stroke:2px #5a3300;text-shadow:0 4px 0 #5a3300}
.tsd .c1 .val span{font:700 17px/1 'Fredoka',sans-serif;color:#fff}
.tsd .c1 .sl{--th:14px;--kw:36px;--kh:36px;--kb:radial-gradient(circle at 40% 35%,#ffe9a0,#ffb51e 60%,#e08a00);--ks:0 0 0 3px #fff,0 4px 0 3px #1a1030;--trk:linear-gradient(90deg,#ffb51e,#ffe066 calc(var(--p) * 100%),#0d1124 0);padding:10px 2px}
.tsd .c1 .sl input::-webkit-slider-runnable-track{box-shadow:0 0 0 2px #fff}
.tsd .c1 .st{gap:8px}
.tsd .c1 .st button{height:46px;border-radius:14px;background:linear-gradient(180deg,#fff,#e2e7f2);box-shadow:0 4px 0 #a9b3c9;font:400 20px/1 'Lilita One',sans-serif;color:#1a1f3c}
.tsd .c1 .go{height:52px;border-radius:16px;background:linear-gradient(180deg,#ffe066,#ffbf1e);box-shadow:0 5px 0 #b77a12;font:400 22px/1 'Lilita One',sans-serif;letter-spacing:.06em;color:#4a2a00}
.tsd .c1 .jk{gap:6px}
.tsd .c1 .j{height:46px;border-radius:12px;gap:2px;box-shadow:0 3px 0 rgba(0,0,0,.45)}
.tsd .c1 .j:nth-child(1){background:#4f8bff}.tsd .c1 .j:nth-child(2){background:#ff5fa8}.tsd .c1 .j:nth-child(3){background:#2fcf6a}.tsd .c1 .j:nth-child(4){background:#a46bff}.tsd .c1 .j:nth-child(5){background:#ff7a3d}.tsd .c1 .j:nth-child(6){background:#ffb51e}
.tsd .c1 .j b{font:600 8.5px/1 'Fredoka',sans-serif}
.tsd .c1 .j em{top:-6px;right:-4px;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;background:#fff;color:#1a1030;font:400 11px/1 'Lilita One',sans-serif;box-shadow:0 2px 0 #1a1030}

/* ================================================ YENİ · Yayın: spor yayını grafiği */
.tsd .n1 .bg{top:0;height:600px}
.tsd .n1 .bg::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,6,12,.25),rgba(5,6,12,0) 30%,rgba(5,6,12,.15) 55%,rgba(5,6,12,.85) 92%)}
.tsd .n1 .top{top:40px;left:12px;right:12px;height:44px;background:#f5f4ef;box-shadow:5px 5px 0 #000}
.tsd .n1 .pl{height:100%;gap:7px}
.tsd .n1 .pl.a{padding-left:0;border-left:6px solid #e5322d}
.tsd .n1 .pl.d{padding-right:0;border-right:6px solid #2b6cf0}
.tsd .n1 .av{width:44px;height:44px}
.tsd .n1 .nm{flex-direction:row;align-items:baseline;gap:6px}
.tsd .n1 .nm small{display:none}
.tsd .n1 .nm b{font:900 italic 21px/1 'Barlow Condensed',sans-serif;color:#0b0b0d;letter-spacing:.02em}
.tsd .n1 .nm em{font:700 13px/1 'Manrope',sans-serif;font-style:normal;color:#0b0b0d;font-variant-numeric:tabular-nums;opacity:.6}
.tsd .n1 .vs{flex:none;height:100%;width:40px;display:grid;place-items:center;background:#0b0b0d}
.tsd .n1 .vs b{font:900 italic 17px/1 'Barlow Condensed',sans-serif;color:#ff2d3d}
.tsd .n1 .where{top:94px;left:12px;transform:none;padding:4px 10px;background:#ff2d3d;color:#fff;font:800 11px/1 'Manrope',sans-serif;letter-spacing:.22em;box-shadow:3px 3px 0 #000}
.tsd .n1 .where::before{content:'● CANLI  ';color:#fff}
.tsd .n1 .pan{padding:0 12px 14px;gap:8px}
.tsd .n1 .hd{gap:0;height:30px}
.tsd .n1 .cat{height:30px;padding:0 10px;gap:5px;background:#0b0b0d;color:#fff}
.tsd .n1 .cat b{font:800 12px/1 'Manrope',sans-serif;letter-spacing:.18em}
.tsd .n1 .rule{height:30px;display:flex;align-items:center;padding:0 10px;background:#ff2d3d;font:800 11px/1 'Manrope',sans-serif;letter-spacing:.14em;color:#fff}
.tsd .n1 .clk{height:30px;align-items:center;padding:0 10px;background:#f5f4ef;box-shadow:4px 4px 0 #000}
.tsd .n1 .clk b{font:900 italic 26px/1 'Barlow Condensed',sans-serif;color:#0b0b0d;font-variant-numeric:tabular-nums}
.tsd .n1 .clk s{font:800 10px/1 'Manrope',sans-serif;color:#ff2d3d;letter-spacing:.1em}
.tsd .n1 .tb{height:4px;margin-top:-4px;background:rgba(255,255,255,.25)}
.tsd .n1 .tb i{background:#ff2d3d}
.tsd .n1 .qq{padding:12px 14px;background:#f5f4ef;box-shadow:5px 5px 0 #000;font:800 21px/1.2 'Manrope',sans-serif;letter-spacing:-.01em;color:#0b0b0d}
.tsd .n1 .val{justify-content:flex-start;align-items:center;gap:0;background:#0b0b0d;box-shadow:5px 5px 0 #ff2d3d}
.tsd .n1 .val .n{min-width:110px;padding:6px 14px;font:900 italic 58px/1 'Barlow Condensed',sans-serif;color:#fff;text-align:center}
.tsd .n1 .val span{align-self:stretch;display:flex;align-items:center;padding:0 14px;border-left:1px solid rgba(255,255,255,.18);font:800 12px/1 'Manrope',sans-serif;letter-spacing:.24em;text-transform:uppercase;color:#ff2d3d}
.tsd .n1 .val::after{content:'TAHMİNİN';margin-left:auto;padding-right:14px;font:800 10px/1 'Manrope',sans-serif;letter-spacing:.2em;color:rgba(255,255,255,.45)}
.tsd .n1 .sl{--th:4px;--tr:0;--kw:12px;--kh:28px;--kr:0;--kb:#ff2d3d;--ks:2px 2px 0 #000;--trk:linear-gradient(90deg,#fff calc(var(--p) * 100%),rgba(255,255,255,.28) 0);padding:8px 0 0}
.tsd .n1 .rl{height:16px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.55) 0 1px,transparent 1px calc(100% / 20)) 0 0/100% 5px no-repeat}
.tsd .n1 .rl i{top:5px;font:800 9px/1 'Manrope',sans-serif;color:rgba(255,255,255,.7)}
.tsd .n1 .st{gap:8px}
.tsd .n1 .st button{height:42px;background:#f5f4ef;box-shadow:4px 4px 0 #000;font:900 italic 21px/1 'Barlow Condensed',sans-serif;color:#0b0b0d}
.tsd .n1 .go{height:50px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:#ff2d3d;box-shadow:5px 5px 0 #000;font:900 italic 25px/1 'Barlow Condensed',sans-serif;letter-spacing:.18em;color:#fff}
.tsd .n1 .go::after{content:'▶';font-size:16px}
.tsd .n1 .jk{gap:6px}
.tsd .n1 .j{height:44px;gap:2px;background:rgba(11,11,13,.82);border-top:3px solid #f5f4ef;color:#fff}
.tsd .n1 .j b{font:800 7.5px/1 'Manrope',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.75)}
.tsd .n1 .j em{top:2px;right:3px;font:800 10px/1 'Manrope',sans-serif;color:#ff2d3d}

/* ================================================ YENİ · Harp Masası: pirinç, kontur, cetvel */
.tsd .n2 .top{height:98px;padding:28px 10px 0;gap:6px;background:linear-gradient(180deg,#0d1513,#0d151300)}
.tsd .n2 .pl{height:58px;padding:0 8px;gap:8px;border:1.5px solid #c9a24a;box-shadow:inset 0 0 0 3px rgba(0,0,0,.25),0 4px 10px rgba(0,0,0,.4)}
.tsd .n2 .pl.a{background:linear-gradient(180deg,#9c241c,#6e1712);clip-path:polygon(0 0,100% 0,100% 100%,52% 100%,50% 88%,48% 100%,0 100%)}
.tsd .n2 .pl.d{background:linear-gradient(180deg,#1f4f9c,#15366e);clip-path:polygon(0 0,100% 0,100% 100%,52% 100%,50% 88%,48% 100%,0 100%)}
.tsd .n2 .av{width:42px;height:42px;border-radius:50%;border:2px solid #e8c56a;box-shadow:0 0 0 2px rgba(0,0,0,.35)}
.tsd .n2 .nm small{font:800 8px/1 'Manrope',sans-serif;letter-spacing:.24em;color:#e8c56a}
.tsd .n2 .nm b{font:700 italic 22px/1.05 'Cormorant Garamond',serif;color:#f6ecd2}
.tsd .n2 .nm em{font:800 11px/1.1 'Manrope',sans-serif;font-style:normal;color:#e8c56a;font-variant-numeric:tabular-nums}
.tsd .n2 .vs{flex:none;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#fbe7a6,#c9a24a 55%,#7d5a1c);box-shadow:0 0 0 2px #2a1d08,0 4px 8px rgba(0,0,0,.5)}
.tsd .n2 .vs b{font:700 italic 17px/1 'Cormorant Garamond',serif;color:#2a1d08}
.tsd .n2 .where{top:104px;padding:3px 14px;border:1px solid #c9a24a;background:rgba(13,21,19,.85);color:#e8c56a;font:800 10px/1.2 'Manrope',sans-serif;letter-spacing:.32em}
.tsd .n2 .pan{padding:20px 14px 14px;gap:10px;background:${TOPO} 0 0/160px,linear-gradient(180deg,#13201c,#0b1311);border-top:2px solid transparent;border-image:linear-gradient(90deg,#7d5a1c,#f3d37a,#c9a24a,#f3d37a,#7d5a1c) 1;box-shadow:0 -14px 30px rgba(0,0,0,.55)}
.tsd .n2 .pan::before,.tsd .n2 .pan::after{content:'';position:absolute;top:8px;width:7px;height:7px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fbe7a6,#9b7428)}
.tsd .n2 .pan::before{left:8px}.tsd .n2 .pan::after{right:8px}
.tsd .n2 .cat{padding:4px 10px;border:1px solid rgba(232,197,106,.55);border-radius:99px;color:#e8c56a}
.tsd .n2 .cat b{font:800 10.5px/1 'Manrope',sans-serif;letter-spacing:.24em}
.tsd .n2 .rule{font:700 italic 15px/1 'Cormorant Garamond',serif;color:rgba(246,236,210,.75)}
.tsd .n2 .clk{position:relative;width:46px;height:46px;border-radius:50%;justify-content:center;align-items:center;flex-direction:column;gap:0;background:radial-gradient(circle,#0b1311 58%,transparent 60%),conic-gradient(#e8c56a calc(var(--t,.8) * 360deg),rgba(232,197,106,.18) 0)}
.tsd .n2 .clk b{font:900 italic 20px/1 'Barlow Condensed',sans-serif;color:#f6ecd2}
.tsd .n2 .clk s{font:800 7px/1 'Manrope',sans-serif;letter-spacing:.18em;color:#e8c56a}
.tsd .n2 .tb{display:none}
.tsd .n2 .qq{font:700 italic 27px/1.08 'Cormorant Garamond',serif;color:#f6ecd2;text-align:center}
.tsd .n2 .val{margin:0 40px;padding:6px 0 4px;border-radius:8px;background:#060a09;box-shadow:inset 0 2px 8px rgba(0,0,0,.8),0 0 0 1.5px #9b7428,0 0 0 4px #0b1311,0 0 0 5px rgba(232,197,106,.35)}
.tsd .n2 .val .n{font:900 italic 52px/1 'Barlow Condensed',sans-serif;background:linear-gradient(180deg,#fff1c2,#e8c56a 55%,#a77c26);-webkit-background-clip:text;background-clip:text;color:transparent}
.tsd .n2 .val span{font:700 italic 18px/1 'Cormorant Garamond',serif;color:#e8c56a}
.tsd .n2 .sl{--th:22px;--tr:3px;--kw:22px;--kh:34px;--kr:4px;--kb:linear-gradient(180deg,#d33a2c,#8e1b14);--ks:0 0 0 2px #f6ecd2,0 4px 6px rgba(0,0,0,.6);
  --trk:repeating-linear-gradient(90deg,rgba(60,40,10,.75) 0 1px,transparent 1px calc((100% - 22px) / 20)) 11px 0/calc(100% - 22px) 9px no-repeat,repeating-linear-gradient(90deg,rgba(60,40,10,.9) 0 1.5px,transparent 1.5px calc((100% - 22px) / 4)) 11px 0/calc(100% - 22px + 2px) 15px no-repeat,linear-gradient(90deg,rgba(211,58,44,.28) calc(var(--p) * 100%),transparent 0),linear-gradient(180deg,#f4e7c4,#d9c18a);padding:2px 0}
.tsd .n2 .rl{margin-top:5px;margin-inline:11px}
.tsd .n2 .rl i{font:800 9.5px/1 'Manrope',sans-serif;color:#e8c56a}
.tsd .n2 .st{gap:10px;justify-items:center}
.tsd .n2 .st button{width:58px;height:58px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fbe7a6,#d8b257 45%,#9b7428);box-shadow:inset 0 0 0 3px rgba(255,240,190,.35),inset 0 0 0 6px rgba(80,55,15,.35),0 4px 0 #4b360f,0 6px 10px rgba(0,0,0,.45);font:900 italic 20px/1 'Barlow Condensed',sans-serif;color:#3a2808;text-shadow:0 1px 0 rgba(255,240,190,.6)}
.tsd .n2 .go{height:50px;border-radius:10px;background:linear-gradient(180deg,#b7281d,#7e1710);box-shadow:inset 0 0 0 1.5px #e8c56a,inset 0 0 0 4px rgba(0,0,0,.25),0 4px 0 #3d0a07;font:700 italic 25px/1 'Cormorant Garamond',serif;letter-spacing:.14em;color:#f6ecd2}
.tsd .n2 .go::before{content:'⚜ '}.tsd .n2 .go::after{content:' ⚜'}
.tsd .n2 .jk{gap:6px}
.tsd .n2 .j{height:46px;gap:2px;border-radius:8px;border:1px solid rgba(232,197,106,.35);background:rgba(232,197,106,.06);color:#e8c56a}
.tsd .n2 .j b{font:800 7px/1 'Manrope',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(246,236,210,.7)}
.tsd .n2 .j em{top:-6px;right:-4px;width:17px;height:17px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#fbe7a6,#c9a24a);color:#2a1d08;font:900 italic 10px/1 'Barlow Condensed',sans-serif}

/* ================================================ YENİ · Çini: İznik, kobalt, turkuaz, mercan */
.tsd .n3 .top{top:12px;left:12px;right:12px;height:70px;gap:8px}
.tsd .n3 .pl{height:62px;padding:0 10px;gap:8px;border-radius:31px 31px 12px 12px;background:#f7f3ea;box-shadow:0 0 0 2px #1d3f9a,0 0 0 5px #f7f3ea,0 0 0 6.5px rgba(29,63,154,.35),0 8px 18px rgba(0,0,0,.4)}
.tsd .n3 .av{width:44px;height:44px;border-radius:50%;box-shadow:0 0 0 2.5px #fff,0 0 0 4.5px var(--pc)}
.tsd .n3 .pl.a{--pc:#d8432f}.tsd .n3 .pl.d{--pc:#1d3f9a}
.tsd .n3 .nm small{font:800 8px/1 'Manrope',sans-serif;letter-spacing:.2em;color:#1fa3a3}
.tsd .n3 .nm b{font:700 19px/1.05 'Fredoka',sans-serif;color:var(--pc)}
.tsd .n3 .nm em{font:700 11px/1.1 'Manrope',sans-serif;font-style:normal;color:#6b6250;font-variant-numeric:tabular-nums}
.tsd .n3 .vs{position:absolute;left:50%;top:15px;transform:translateX(-50%) rotate(45deg);z-index:2;width:36px;height:36px;display:grid;place-items:center;background:#1d3f9a;box-shadow:0 0 0 3px #f7f3ea,0 0 0 4.5px #1fa3a3}
.tsd .n3 .vs b{transform:rotate(-45deg);font:700 13px/1 'Fredoka',sans-serif;color:#fff}
.tsd .n3 .where{top:96px;padding:4px 14px;border-radius:99px;background:#1fa3a3;color:#fff;font:700 11px/1.1 'Manrope',sans-serif;letter-spacing:.26em;box-shadow:0 0 0 2px #f7f3ea}
.tsd .n3 .pan{padding:30px 14px 14px;gap:10px;background:${TILE} 0 0/44px,linear-gradient(180deg,#fbf8f1,#efe7d6);
  -webkit-mask:radial-gradient(60px 26px at 50% 0,transparent 98%,#000) 50% 0/120px 52px repeat-x,linear-gradient(#000,#000) 0 26px/100% 100% no-repeat;mask:radial-gradient(60px 26px at 50% 0,transparent 98%,#000) 50% 0/120px 52px repeat-x,linear-gradient(#000,#000) 0 26px/100% 100% no-repeat}
.tsd .n3 .pan::before{content:'';position:absolute;left:0;right:0;top:26px;height:6px;background:repeating-linear-gradient(90deg,#1d3f9a 0 10px,#1fa3a3 10px 14px,#d8432f 14px 18px,#1fa3a3 18px 22px)}
.tsd .n3 .hd{margin-top:8px}
.tsd .n3 .cat{padding:4px 12px 4px 8px;border-radius:99px;background:#1d3f9a;color:#fff}
.tsd .n3 .cat b{font:700 13px/1 'Fredoka',sans-serif;letter-spacing:.08em}
.tsd .n3 .rule{font:800 10.5px/1 'Manrope',sans-serif;letter-spacing:.16em;color:#1fa3a3}
.tsd .n3 .clk b{font:700 34px/.9 'Fredoka',sans-serif;color:#d8432f}
.tsd .n3 .clk s{font:800 10px/1 'Manrope',sans-serif;color:#1d3f9a}
.tsd .n3 .tb{height:8px;border-radius:99px;background:rgba(29,63,154,.12)}
.tsd .n3 .tb i{border-radius:99px;background:linear-gradient(90deg,#1fa3a3,#1d3f9a)}
.tsd .n3 .qq{font:700 24px/1.18 'Fredoka',sans-serif;color:#13275f}
.tsd .n3 .val{padding:6px 0;border-radius:16px;background:#fff;box-shadow:inset 0 0 0 2px #1d3f9a,inset 0 0 0 5px #fff,inset 0 0 0 6.5px rgba(31,163,163,.5),0 4px 0 rgba(29,63,154,.18)}
.tsd .n3 .val .n{font:700 54px/1 'Fredoka',sans-serif;color:#1d3f9a}
.tsd .n3 .val span{font:600 18px/1 'Fredoka',sans-serif;color:#d8432f}
.tsd .n3 .sl{--th:12px;--kw:32px;--kh:32px;--kb:radial-gradient(circle at 38% 32%,#ff9a85,#d8432f 60%,#a52a1b);--ks:0 0 0 4px #fff,0 0 0 6px #1d3f9a,0 4px 6px rgba(0,0,0,.25);--trk:linear-gradient(90deg,#1fa3a3,#1d3f9a calc(var(--p) * 100%),rgba(29,63,154,.12) 0);padding:10px 4px}
.tsd .n3 .st{gap:8px}
.tsd .n3 .st button{height:46px;border-radius:12px;background:linear-gradient(160deg,#fff 0 40%,#eef3fb);box-shadow:inset 0 0 0 2px #1d3f9a,inset 0 0 0 4.5px #fff,inset 0 0 0 5.5px rgba(31,163,163,.55),0 3px 0 #1d3f9a;font:700 20px/1 'Fredoka',sans-serif;color:#1d3f9a}
.tsd .n3 .go{height:52px;border-radius:14px;background:linear-gradient(180deg,#2b55c2,#1d3f9a);box-shadow:inset 0 2px 0 rgba(255,255,255,.25),0 4px 0 #0f245e;font:700 21px/1 'Fredoka',sans-serif;letter-spacing:.14em;color:#fff}
.tsd .n3 .go::before{content:'';display:inline-block;width:9px;height:9px;margin-right:10px;vertical-align:2px;background:#ff9a85;transform:rotate(45deg)}
.tsd .n3 .go::after{content:'';display:inline-block;width:9px;height:9px;margin-left:10px;vertical-align:2px;background:#ff9a85;transform:rotate(45deg)}
.tsd .n3 .jk{gap:6px}
.tsd .n3 .j{height:46px;gap:2px;border-radius:10px;background:#fff;box-shadow:inset 0 0 0 1.5px rgba(29,63,154,.35),0 2px 0 rgba(29,63,154,.2);color:#1d3f9a}
.tsd .n3 .j b{font:700 7.5px/1 'Manrope',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6b6250}
.tsd .n3 .j em{top:-6px;right:-4px;width:17px;height:17px;border-radius:50%;display:grid;place-items:center;background:#d8432f;color:#fff;font:700 10px/1 'Fredoka',sans-serif;box-shadow:0 0 0 2px #fbf8f1}
`;

/** Tasarım dili sayfası: ilk çağrıda kurulur; açar ya da kapatır. */
export function designBook(open = true) {
	let el = document.querySelector('.tsd');
	if (!el) {
		const st = document.createElement('style');
		st.textContent = CSS;
		document.head.appendChild(st);
		el = document.createElement('div');
		el.className = 'tsd';
		el.innerHTML = `<div class="tsd-hd"><div><h2>Tasarım dili</h2><p>Aynı soru altı dilde: bugüne kadar kullanılan üç dil ve üç yeni öneri. Sürgü, ±tuşlar ve GÖNDER çalışır; sağa kaydır.</p></div><button aria-label="Kapat">✕</button></div>
		<div class="tsd-row">${DESIGNS.map(
			(d) => `<div class="tsd-it"><div class="tsd-lb"><b>${d.name}</b><em class="${d.tag === 'ESKİ' ? 'old' : d.tag === 'OYUNDA' ? 'on' : ''}">${d.tag}</em></div><p class="tsd-nt">${d.note}</p><div class="tsd-fr">${phone(d)}</div></div>`,
		).join('')}</div>`;
		document.body.appendChild(el);
		el.querySelector('.tsd-hd button').addEventListener('click', () => designBook(false));
		const set = (ph, v) => {
			const inp = ph.querySelector('input');
			v = Math.max(0, Math.min(20, v));
			inp.value = v;
			ph.querySelector('.val .n').textContent = v;
			ph.style.setProperty('--p', v / 20);
		};
		for (const ph of el.querySelectorAll('.ph')) set(ph, 11);
		el.addEventListener('input', (e) => {
			const ph = e.target.closest('.ph');
			if (ph) set(ph, +e.target.value);
		});
		el.addEventListener('click', (e) => {
			const b = e.target.closest('.ph button');
			if (!b) return;
			const ph = b.closest('.ph');
			if (b.dataset.d) set(ph, +ph.querySelector('input').value + +b.dataset.d);
			else if (b.classList.contains('go')) {
				b.classList.add('hit');
				setTimeout(() => b.classList.remove('hit'), 160);
			}
		});
		// süre: 20 sn'den geri sayar (bütün çerçevelerde aynı anda), 0'da yeniden
		let t = 16;
		el._tick = setInterval(() => {
			if (el.hidden) return;
			t = t <= 0 ? 20 : t - 1;
			for (const ph of el.querySelectorAll('.ph')) {
				ph.querySelector('.clk b').textContent = t;
				ph.style.setProperty('--t', t / 20);
			}
		}, 1000);
		for (const ph of el.querySelectorAll('.ph')) ph.style.setProperty('--t', 0.8);
		// çerçeve ölçeği: ekrana sığsın (telefonda bir çerçeve, geniş ekranda yan yana)
		const fit = () => {
			const k = Math.min(1, (innerHeight - 150) / 736, (innerWidth - 40) / 340);
			el.style.setProperty('--k', Math.max(0.55, k).toFixed(3));
		};
		fit();
		addEventListener('resize', fit);
	}
	el.hidden = !open;
	return el;
}
