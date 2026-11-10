// MANCINIK (deneme): tahmin sorusu, ama doğru değeri AŞMA (The Price Is Right'ın "aşmadan yaklaş" kuralı). Kaydırıcı
// mancınığın gücüdür: sayı büyüdükçe kol geriye gerilir, kesikli yay taşın düşeceği yeri gösterir. FIRLAT'ta taş
// gerçekten uçar: değerin altında kalan surun önüne düşer ("YAKIN!" mesafeye göre), aşan surun üstünden uçar
// ("AŞTIN!"). Sur soru boyunca siste gizlidir (yeri cevaptır); cevap ekranında sis kalkar, herkesin taşı sırayla
// atılır ve nereye düştüğü görünür.
//
// Veri: bankadaki tahmin (num) sorusunun aynısı: { q, ans, unit, min, max } (type: 'mancinik').
// Değer: sayı (min..max). Tür 'closest'. err: altta kalan 0..1 (kısalık / aralık), aşan 1..2 (1 + aşma / aralık);
// böylece aşmayanlardan en yakın birinci, hepsi aşarsa en az aşan birinci; eşitlikte hız.
// Çevrimiçi: cevap v.hedef'te; publicView siler (v.q'da da ans yok). İstemci sur yerini bilmeden taşı sise atar,
// sonuç cevap ekranında gelir. Jokerler: yarı yarıya (dar aralık), seyirci (kalabalığın değeri).

import { css, esc, pCorrect, gauss, buzz, clamp } from './util.js';
import { botTime } from './timing.js';
import { numSteps } from './types.js';
import { appOf, stamp, rule, stampLater, sfx, LOOK, ACT } from './d_ortak.js';
import { setTimeout } from '../core/clock.js';

const SLIDE = 2.2; // timing.js ACT.slide / ACT.step (orada dışa açık değil)
const STEP = 0.45;

// sahne (viewBox 400×220): gece göğü, dağlar, alan; mancınık solda, eksen min→max sağa
const W = 400;
const H = 220;
const GY = 188; // yer
const X0 = 122; // eksenin başı (min)
const X1 = 388; // eksenin sonu (max)
const PIV = { x: 66, y: 138 }; // kolun mili
const ARM = 52; // uzun kol (askı ucu)
const SHORT = 17; // kısa kol (karşı ağırlık)
const WALL_H = 52;

const CSS = /* css */ `
.dn-mc{display:flex;flex-direction:column;gap:9px;min-height:0;user-select:none;-webkit-user-select:none}
.fl-q.cover .dn-mc{flex:1 1 auto}
.mc-sw{position:relative;flex:1 1 auto;min-height:150px;container-type:size}
.fl-q:not(.cover) .mc-sw{flex:none;height:200px}
.dn-mc-scene{position:absolute;inset:0;margin:auto;width:100%;height:min(100%,55cqw + 60px,360px);border-radius:18px;overflow:hidden;
  background:radial-gradient(rgba(255,255,255,.55) .7px,transparent 1px) 0 0/31px 23px,#0b1640;box-shadow:0 0 0 2px rgba(255,255,255,.2),0 12px 28px rgba(0,0,0,.55)}
.dn-mc-scene svg{position:absolute;inset:0;width:100%;height:100%}
.dn-mc-val{position:absolute;left:50%;top:10px;z-index:2;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:4px 14px 5px 8px;border-radius:14px;white-space:nowrap;
  background:linear-gradient(180deg,#3a2410,#1a0e06);box-shadow:inset 0 0 0 2px #d9a23a,inset 0 0 0 4px #5a3a14,0 6px 14px rgba(0,0,0,.5)}
.dn-mc-val i{flex:none;width:30px;height:30px;border-radius:50%;background:conic-gradient(from 225deg,#3ee07a 0,#ffd25a calc(var(--pw) * 135deg),#ff5a3a calc(var(--pw) * 270deg),rgba(255,255,255,.12) 0 270deg,transparent 0);
  -webkit-mask:radial-gradient(circle,transparent 9px,#000 10px);mask:radial-gradient(circle,transparent 9px,#000 10px)}
.dn-mc-val small.k{font:italic 800 10px/1 'Barlow Condensed',sans-serif;letter-spacing:.14em;color:#d9a23a}
.dn-mc-val b{font:italic 900 32px/1 'Barlow Condensed','Lilita One',sans-serif;color:#ffe27a;text-shadow:0 2px 0 #5a2a00,0 0 14px rgba(255,190,60,.5)}
.dn-mc-val small.u{font-size:14px;color:#fff;opacity:.9}
.dn-mc-msg{position:absolute;left:50%;top:42%;z-index:3;transform:translate(-50%,-50%) scale(.5);opacity:0;pointer-events:none;white-space:nowrap;text-align:center;
  font:italic 900 40px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.03em;color:#fff;text-shadow:0 4px 0 rgba(0,0,0,.55),0 0 24px rgba(0,0,0,.6);transition:opacity .2s,transform .35s cubic-bezier(.3,1.7,.5,1)}
.dn-mc-msg.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
.dn-mc-msg.good{color:#7dff9a}.dn-mc-msg.gold{color:#ffd25a;text-shadow:0 4px 0 #7a4a00,0 0 30px rgba(255,210,90,.9)}.dn-mc-msg.bad{color:#ff6a5a;text-shadow:0 4px 0 #6a0a08,0 0 30px rgba(255,60,40,.8)}.dn-mc-msg.cold{color:#bfe3ff}
.dn-mc-msg small{display:block;margin-top:5px;font:600 13px/1.2 'Fredoka',sans-serif;letter-spacing:0;color:#fff;opacity:.92}
.dn-mc .fl-range{height:34px}
.dn-mc-row{display:flex;gap:6px}
.dn-mc-row .fl-step{flex:1;min-width:0;padding:7px 4px 8px;font-size:16px}
.dn-mc .fl-send{height:50px;padding:0 16px}
.dn-mc.sent .fl-range,.dn-mc.sent .dn-mc-row{opacity:.35;pointer-events:none}
.dn-mc.sent .fl-send{opacity:.5;pointer-events:none}
.dn-mc.done .dn-mc-val{opacity:0;transition:opacity .4s}
.dn-mc.done .fl-range,.dn-mc.done .dn-mc-row,.dn-mc.done .fl-send{display:none}
.dn-mc .fog{animation:dnMcFog 7s ease-in-out infinite alternate}
.dn-mc .fog2{animation-duration:9s;animation-direction:alternate-reverse}
.dn-mc .fogs{transition:opacity 1.2s,transform 1.6s ease-in}
.dn-mc .fogs.off{opacity:0;transform:translateX(60px)}
.dn-mc .wall{transition:transform .8s cubic-bezier(.3,1.4,.5,1),opacity .3s}
.dn-mc .wall.hide{opacity:0;transform:translateY(${WALL_H + 12}px)}
.dn-mc .wall.hit{animation:dnMcHit .45s}
.dn-mc .pv{transition:opacity .2s}
.dn-mc.sent .pv{opacity:0}
.dn-mc .pvarc{animation:mcDash .8s linear infinite}
.dn-mc .narrow{opacity:0;transition:opacity .3s}
.dn-mc .narrow.on{opacity:1}
.dn-mc .crowd{opacity:0;transition:opacity .3s}
.dn-mc .crowd.on{opacity:1}
.dn-mc .lt{font:italic 900 13px 'Barlow Condensed','Lilita One',sans-serif;paint-order:stroke;stroke:#0a1534;stroke-width:3.4px}
.dn-mc .tk{font:italic 800 10px 'Barlow Condensed',sans-serif;fill:#f4e4c4;transition:opacity .3s}
/* kamera yaklaşınca ölçek yazıları çekilir: kenarda kesilmez, ölçü çizgilerinin yazılarının altında kalmaz */
.dn-mc.zoom .tk{opacity:0}
.dn-mc .dust{animation:dnMcDust .7s ease-out forwards}
.dn-mc .chunk{animation:mcChunk .9s cubic-bezier(.2,.6,.5,1) forwards}
.dn-mc .flash{animation:mcFlash .45s ease-out forwards}
.dn-mc .smk{animation:mcSmoke .9s ease-out forwards}
.dn-mc .fire{animation:mcFlick .12s linear infinite alternate}
.dn-mc .torch{animation:mcFlick .18s linear infinite alternate}
.mc-res{display:none;flex-direction:column;gap:6px}
.dn-mc.done .mc-res{display:flex}
.mc-res div{display:flex;align-items:center;gap:9px;min-height:44px;padding:0 12px 0 0;transform:skewX(-8deg);background:#0a0b14;box-shadow:inset 0 0 0 2px rgba(255,255,255,.75);animation:mcRow .35s calc(var(--k) * 120ms + .6s) cubic-bezier(.2,.9,.3,1.2) both}
.mc-res div>*{transform:skewX(8deg)}
.mc-res div.win{background:linear-gradient(90deg,#ffe066,#ffbb1f);color:#1a1200;box-shadow:inset 0 0 0 2px #fff,0 0 22px rgba(255,210,90,.5)}
.mc-res .rk{align-self:stretch;width:38px;display:grid;place-items:center;transform:none;background:var(--c);font:italic 900 22px/1 'Barlow Condensed','Lilita One',sans-serif;color:#fff}
.mc-res b{flex:0 1 auto;min-width:0;max-width:40%;font:700 16px/1.1 'Fredoka',sans-serif;white-space:nowrap;overflow:hidden}
/* değer ve birim: birim küçük ve bölünmez, gerekirse sayının altına iner ("12.345 milyon yıl" dar ekranda etiketin üstüne
   taşmasın) */
.mc-res em{flex:1 1 0;min-width:0;text-align:right;font:italic 900 20px/1 'Barlow Condensed','Lilita One',sans-serif;white-space:normal;overflow-wrap:normal}
.mc-res em small{font-size:.74em;letter-spacing:.02em;white-space:nowrap}
.mc-res u{flex:none;text-decoration:none;padding:3px 8px;border-radius:6px;font:italic 900 13px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.06em;white-space:nowrap;color:#fff;background:#2fbf5a}
.mc-res u.over{background:#e8343c}.mc-res u.gold{background:#1a1200;color:#ffd25a}
.mc-res div.win u{background:#1a1200;color:#ffd25a}
.dn-mc .ms{opacity:0;animation:mcIn .4s ease-out forwards}
.dn-mc .ms text{font:italic 900 12px 'Barlow Condensed','Lilita One',sans-serif;paint-order:stroke;stroke:#05070f;stroke-width:3.6px}
@keyframes mcRow{0%{opacity:0;transform:skewX(-8deg) translateX(-30px)}100%{opacity:1;transform:skewX(-8deg)}}
@keyframes mcIn{to{opacity:1}}
.dn-mc .moon{filter:drop-shadow(0 0 10px rgba(255,240,200,.6))}
.dn-mc .dust,.dn-mc .chunk,.dn-mc .flash,.dn-mc .smk,.dn-mc .fire,.dn-mc .torch{transform-box:fill-box;transform-origin:50% 50%}
@keyframes dnMcFog{to{transform:translateX(-18px)}}
@keyframes dnMcHit{25%{transform:translateX(4px)}55%{transform:translateX(-3px)}80%{transform:translateX(1px)}}
@keyframes dnMcDust{from{opacity:.9;transform:scale(.3)}to{opacity:0;transform:scale(2)}}
@keyframes mcChunk{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(var(--dx),var(--dy))}}
@keyframes mcFlash{from{opacity:.95;transform:scale(.4)}to{opacity:0;transform:scale(2.4)}}
@keyframes mcSmoke{from{opacity:.55;transform:scale(.6)}to{opacity:0;transform:scale(2) translateY(-6px)}}
@keyframes mcFlick{from{opacity:.75;transform:scale(.92)}to{opacity:1;transform:scale(1.08)}}
@keyframes mcDash{to{stroke-dashoffset:-14}}
@media (max-height:700px){.mc-sw{min-height:110px}}
@media (prefers-reduced-motion:reduce){.dn-mc .fog,.dn-mc .pvarc,.dn-mc .torch{animation:none}}
`;

const fmtOf = (v) => (x) => (v.yil ? String(Math.round(x)) : Math.round(x).toLocaleString('tr-TR'));
/** Kısa etiket (eksen): 10 bin, 2 mn. */
const short = (v, x) => (v.yil || Math.abs(x) < 1e4 ? fmtOf(v)(x) : Math.abs(x) >= 1e6 ? `${(Math.round(x / 1e5) / 10).toLocaleString('tr-TR')} mn` : `${Math.round(x / 1e3).toLocaleString('tr-TR')} bin`);
const stepLabel = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('tr-TR')} mn` : n >= 1e4 ? `${(n / 1e3).toLocaleString('tr-TR')} bin` : n.toLocaleString('tr-TR'));

/** Değerin sahnedeki x'i. */
const xOf = (v, x) => X0 + ((clamp(x, v.q.min, v.q.max) - v.q.min) / (v.q.max - v.q.min || 1)) * (X1 - X0);
/** Taşın çıktığı yer (kol en üstte). */
const REL = (() => {
	const a = (-78 * Math.PI) / 180;
	return { x: PIV.x + Math.cos(a) * ARM, y: PIV.y + Math.sin(a) * ARM };
})();
/** Uçuş yayı (ikinci derece Bezier): yükseklik mesafeyle büyür, her zaman surun üstünden geçebilecek kadar. */
function arc(ex) {
	const f = (ex - REL.x) / (X1 - REL.x);
	const cy = REL.y - 60 - 70 * f;
	return { x0: REL.x, y0: REL.y, cx: (REL.x + ex) / 2 + 10, cy, x1: ex, y1: GY - 5 };
}
const at = (a, t) => ({ x: (1 - t) * (1 - t) * a.x0 + 2 * (1 - t) * t * a.cx + t * t * a.x1, y: (1 - t) * (1 - t) * a.y0 + 2 * (1 - t) * t * a.cy + t * t * a.y1 });
const pathOf = (a) => `M${a.x0.toFixed(1)},${a.y0.toFixed(1)} Q${a.cx.toFixed(1)},${a.cy.toFixed(1)} ${a.x1.toFixed(1)},${a.y1.toFixed(1)}`;

/** Sonuç (sunucu da aynı hesabı yapar). */
function outcome(v, value) {
	const span = v.q.max - v.q.min || 1;
	const d = Number(value) - v.hedef;
	return { d, over: d > 0, err: d > 0 ? 1 + d / span : -d / span, near: -d / span };
}
/** Taşın sahnede düşeceği x (sur biliniyorsa: altta kalan surun dibine yaslanır, aşan surun arkasına düşer). */
function landX(v, value, wallX) {
	const x = xOf(v, value);
	if (wallX == null) return x;
	if (Number(value) > v.hedef) return Math.max(x, Math.min(W - 6, wallX + 24));
	return Math.min(x, wallX - 9);
}

const WOOD = '#a8662e';
const WOOD_D = '#4a2810';
const WOOD_L = '#d08a4a';
/** Kolun uç noktaları (açı derece; 0 = sağ, saat yönü artı). */
const armEnds = (deg) => {
	const a = (deg * Math.PI) / 180;
	return { long: { x: PIV.x + Math.cos(a) * ARM, y: PIV.y + Math.sin(a) * ARM }, short: { x: PIV.x - Math.cos(a) * SHORT, y: PIV.y - Math.sin(a) * SHORT } };
};
function sceneSVG(v) {
	const ticks = [0, 0.25, 0.5, 0.75, 1]
		.map((f) => {
			const x = X0 + f * (X1 - X0);
			const val = v.q.min + f * (v.q.max - v.q.min);
			return `<g><rect x="${x - 1.6}" y="${GY - 2}" width="3.2" height="12" rx="1" fill="#7a4a22" stroke="#2a1606" stroke-width=".8"/><rect x="${x - 1.6}" y="${GY - 2}" width="3.2" height="3" fill="#f4e4c4"/>
				<text class="tk" x="${x}" y="${GY + 21}" text-anchor="${f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}">${esc(short(v, val))}</text></g>`;
		})
		.join('');
	const stars = Array.from({ length: 22 }, (_, i) => `<circle cx="${(i * 97) % 392 + 4}" cy="${(i * 53) % 84 + 4}" r="${i % 3 ? 0.7 : 1.2}" fill="#fff" opacity="${0.3 + (i % 4) * 0.15}"/>`).join('');
	const wheel = (cx) => `<g transform="translate(${cx},${GY - 7})"><circle r="9.5" fill="${WOOD_D}"/><circle r="7.4" fill="${WOOD}"/><path d="M-7.4,0H7.4M0,-7.4V7.4M-5.2,-5.2L5.2,5.2M-5.2,5.2L5.2,-5.2" stroke="${WOOD_D}" stroke-width="1.4"/><circle r="2.2" fill="#c9a24a" stroke="${WOOD_D}" stroke-width=".8"/></g>`;
	return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
		<defs>
			<linearGradient id="mcSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1640"/><stop offset=".6" stop-color="#22306a"/><stop offset="1" stop-color="#4a3a6a"/></linearGradient>
			<linearGradient id="mcG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f8a3a"/><stop offset="1" stop-color="#1f3f1a"/></linearGradient>
			<linearGradient id="mcS" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e4dccb"/><stop offset="1" stop-color="#8a8070"/></linearGradient>
			<radialGradient id="mcR" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#ece4d4"/><stop offset="1" stop-color="#5d554a"/></radialGradient>
			<radialGradient id="mcF" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#ffd24a"/><stop offset=".7" stop-color="#ff6a1a" stop-opacity=".85"/><stop offset="1" stop-color="#ff3a0a" stop-opacity="0"/></radialGradient>
			<radialGradient id="mcMoon" cx=".4" cy=".4" r=".6"><stop offset="0" stop-color="#fffbe8"/><stop offset="1" stop-color="#e8dcb0"/></radialGradient>
			<filter id="dnMcB" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>
		</defs>
		<rect width="${W}" height="${H}" fill="url(#mcSky)"/>
		${stars}
		<g class="moon"><circle cx="322" cy="40" r="17" fill="url(#mcMoon)"/><circle cx="316" cy="36" r="3" fill="#d8cc9c" opacity=".6"/><circle cx="328" cy="46" r="2.2" fill="#d8cc9c" opacity=".5"/></g>
		<path d="M0,132 L40,104 L72,122 L118,88 L160,116 L210,96 L250,120 L300,92 L340,114 L400,98 L400,${GY} L0,${GY}Z" fill="#1a2350" opacity=".9"/>
		<path d="M262,100 l6,-10 h4 v-8 h3 v8 h6 v-6 h3 v6 h4 l6,10z M274,82 l2.5,-5 2.5,5z" fill="#141a3c"/>
		<path d="M0,152 C50,136 100,150 150,140 S250,128 300,144 S370,134 400,140 L400,${GY} L0,${GY}Z" fill="#243a3a"/>
		<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="url(#mcG)"/>
		<path d="M0,${GY} C80,${GY - 4} 160,${GY + 2} 260,${GY - 3} S360,${GY + 1} 400,${GY - 2} L400,${GY + 3} L0,${GY + 3}Z" fill="#7ac25a" opacity=".55"/>
		${[[90, 0.8], [180, 1.2], [300, 0.9], [360, 1.1]].map(([x, k]) => `<ellipse cx="${x}" cy="${GY + 9}" rx="${6 * k}" ry="${2.4 * k}" fill="#5a5a50" opacity=".7"/>`).join('')}
		<rect class="narrow" x="${X0}" y="${GY - 1}" width="0" height="5" rx="2.5" fill="#5ec8ff"/>
		${ticks}
		<g class="fogs">
			<ellipse class="fog" cx="190" cy="${GY - 22}" rx="92" ry="28" fill="#cfe0ff" opacity=".22" filter="url(#dnMcB)"/>
			<ellipse class="fog fog2" cx="290" cy="${GY - 30}" rx="104" ry="32" fill="#cfe0ff" opacity=".27" filter="url(#dnMcB)"/>
			<ellipse class="fog" cx="360" cy="${GY - 16}" rx="70" ry="24" fill="#cfe0ff" opacity=".22" filter="url(#dnMcB)"/>
			<g transform="translate(${(X0 + X1) / 2 + 30},${GY - 30})"><rect x="-58" y="-11" width="116" height="20" rx="3" fill="#5a3214" stroke="#2a1606" stroke-width="1.4"/><line x1="0" y1="9" x2="0" y2="30" stroke="#5a3214" stroke-width="3"/>
				<text y="3.5" text-anchor="middle" font-family="'Barlow Condensed','Lilita One',sans-serif" font-style="italic" font-weight="900" font-size="12" fill="#ffe7a0" letter-spacing="1.6">SUR SİSTE · AŞMA!</text></g>
		</g>
		<g class="wall hide"></g>
		<g class="pv"><path class="pvarc" d="" fill="none" stroke="#ffd25a" stroke-width="2" stroke-dasharray="3 4" stroke-linecap="round" opacity=".9"/>
			<g class="pvmk"><circle cx="0" cy="${GY}" r="8" fill="none" stroke="#ffd25a" stroke-width="1.6"/><circle cx="0" cy="${GY}" r="3" fill="#ffd25a"/><path d="M-12,${GY}h6M6,${GY}h6M0,${GY - 12}v6" stroke="#ffd25a" stroke-width="1.6"/></g></g>
		<g class="crowd"><line class="cl" x1="0" y1="${GY - 30}" x2="0" y2="${GY}" stroke="#c78bff" stroke-width="1.8" stroke-dasharray="3 2"/><text class="lt ct" x="0" y="${GY - 34}" text-anchor="middle" fill="#e2c8ff">seyirci</text></g>
		<g class="stones"></g>
		<g class="mss"></g>
		<g class="cat">
			<ellipse cx="${PIV.x}" cy="${GY + 2}" rx="46" ry="5" fill="#000" opacity=".35"/>
			<rect x="${PIV.x - 38}" y="${GY - 20}" width="76" height="9" rx="2" fill="${WOOD}" stroke="${WOOD_D}" stroke-width="1.6"/>
			<rect x="${PIV.x - 38}" y="${GY - 20}" width="76" height="2.5" fill="${WOOD_L}" opacity=".6"/>
			<path d="M${PIV.x - 26},${GY - 18} L${PIV.x - 2},${PIV.y} M${PIV.x + 26},${GY - 18} L${PIV.x + 2},${PIV.y}" stroke="${WOOD_D}" stroke-width="8" stroke-linecap="round"/>
			<path d="M${PIV.x - 26},${GY - 18} L${PIV.x - 2},${PIV.y} M${PIV.x + 26},${GY - 18} L${PIV.x + 2},${PIV.y}" stroke="${WOOD}" stroke-width="5.4" stroke-linecap="round"/>
			<path d="M${PIV.x - 16},${GY - 40} h32" stroke="${WOOD_D}" stroke-width="3.4" stroke-linecap="round"/>
			<g class="cw"><path class="cwr" d="" stroke="#3a2a1a" stroke-width="1.4"/><g class="cwb"><rect x="-10" y="0" width="20" height="17" rx="2" fill="#5a4a3a" stroke="#1a120a" stroke-width="1.4"/><rect x="-10" y="0" width="20" height="5" fill="#7a6a5a"/>
				<circle cx="-4.5" cy="10" r="2.6" fill="#8a8070"/><circle cx="3" cy="11.5" r="3" fill="#9a9080"/><circle cx="1" cy="6.5" r="2" fill="#7a7060"/></g></g>
			<g class="arm"><line class="ab" x1="0" y1="0" x2="0" y2="0" stroke="${WOOD_D}" stroke-width="7" stroke-linecap="round"/><line class="af" x1="0" y1="0" x2="0" y2="0" stroke="${WOOD}" stroke-width="4.4" stroke-linecap="round"/>
				<path class="sling" d="" fill="none" stroke="#c9a46a" stroke-width="1.3"/><g class="ammo"><circle r="6" fill="url(#mcR)" stroke="#2a241c" stroke-width="1"/><circle class="fire" r="9" fill="url(#mcF)" opacity="0"/></g></g>
			<circle cx="${PIV.x}" cy="${PIV.y}" r="4" fill="#d9a23a" stroke="${WOOD_D}" stroke-width="1.4"/>
			${wheel(PIV.x - 24)}${wheel(PIV.x + 24)}
		</g>
	</svg>`;
}
function wallSVG(v, wx) {
	const top = GY - WALL_H;
	const ww = 34;
	const bricks = [];
	for (let r = 0; r < 7; r++) {
		const y = top + 7 + r * 6.6;
		bricks.push(`<line x1="${wx - ww / 2}" y1="${y}" x2="${wx + ww / 2}" y2="${y}" stroke="#6a6154" stroke-width=".8"/>`);
		for (let c = -2; c <= 2; c++) {
			const x = wx + c * 9 + (r % 2 ? 4.5 : 0);
			if (x > wx - ww / 2 + 1 && x < wx + ww / 2 - 1) bricks.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 6.6}" stroke="#6a6154" stroke-width=".8"/>`);
		}
	}
	const merl = [-17, -8.5, 0, 8.5].map((dx) => `<rect x="${wx + dx}" y="${top - 7}" width="8.5" height="8" fill="url(#mcS)" stroke="#4a4338" stroke-width="1"/>`).join('');
	const torch = (x) => `<rect x="${x - 1.2}" y="${top + 14}" width="2.4" height="9" fill="#3a2a1a"/><path class="torch" d="M${x},${top + 4} q-4,6 0,10 q4,-4 0,-10z" fill="#ffb23a"/><circle cx="${x}" cy="${top + 11}" r="7" fill="#ffb23a" opacity=".22"/>`;
	return `<ellipse cx="${wx}" cy="${GY + 1}" rx="${ww / 2 + 8}" ry="3.5" fill="#000" opacity=".35"/>
		<rect x="${wx - ww / 2}" y="${top}" width="${ww}" height="${WALL_H}" fill="url(#mcS)" stroke="#4a4338" stroke-width="1.4"/>${bricks.join('')}${merl}
		<path d="M${wx - 6},${GY} v-15 a6,6 0 0 1 12,0 v15z" fill="#2a2018" stroke="#1a120a" stroke-width="1"/>
		${torch(wx - ww / 2 - 4)}${torch(wx + ww / 2 + 4)}
		<line x1="${wx}" y1="${top - 7}" x2="${wx}" y2="${top - 30}" stroke="#d9d2c2" stroke-width="1.6"/><path d="M${wx},${top - 30} q9,-3 17,2 q-9,4 -17,9z" fill="#e8343c" stroke="#fff" stroke-width=".7"/>
		<text class="lt" x="${wx}" y="${top - 35}" text-anchor="middle" fill="#7dff9a">${esc(fmtOf(v)(v.hedef))}</text>`;
}

export const mancinik = {
	time: 22,
	label: 'Mancınık',
	kind: 'closest',
	keep: true,
	cover: true, // tam ekran gece sahnesi (harita gizli)
	jokers: ['yari', 'kahin'],
	fmt: (v, value) => `${fmtOf(v)(Number(value))}${v.q.unit ? ' ' + v.q.unit : ''}`,
	sub: (v, value) => {
		if (v.hedef == null) return '';
		const o = outcome(v, value);
		return o.d === 0 ? 'tam isabet' : o.over ? `${fmtOf(v)(o.d)} aştı` : `${fmtOf(v)(-o.d)} kısa`;
	},
	prepare(q) {
		const { ans, ...pub } = q;
		const yil = !q.unit && Number.isInteger(ans) && q.min >= 0 && q.max <= 2100 && String(q.q).toLocaleLowerCase('tr-TR').includes('yıl');
		const v = { q: pub, hedef: ans, yil };
		return stamp(v, q, (q2, k, P, text) => {
			text(q.unit);
			const span = Math.abs(Math.round(q.max - q.min));
			// tahmin tipiyle aynı iş: kaydırıcıyı kabaca sür, adım düğmeleriyle ince ayar, FIRLAT
			return { look: LOOK.orient + 2 * LOOK.gaze, act: SLIDE + STEP * (2 + Math.min(4, String(span).length)) + ACT.confirm };
		});
	},
	mount(el, v, api) {
		css('mancinik', CSS);
		const app = appOf();
		const q = v.q;
		const S = numSteps(q.min, q.max);
		const fmt = fmtOf(v);
		const mid = Math.round(q.min + (q.max - q.min) * 0.4);
		el.innerHTML = `<div class="dn-mc">
			<div class="mc-sw"><div class="dn-mc-scene">${sceneSVG(v)}<div class="dn-mc-val"><i></i><small class="k">GÜÇ</small><b data-r="val">${fmt(mid)}</b><small class="u">${esc(q.unit || '')}</small></div><div class="dn-mc-msg"></div></div></div>
			<input class="fl-range" type="range" min="${q.min}" max="${q.max}" step="1" value="${mid}" aria-label="mancınığın gücü">
			<div class="dn-mc-row">
				<button class="fl-step" data-d="${-S.big}">−${stepLabel(S.big)}</button><button class="fl-step" data-d="${-S.fine}">−${stepLabel(S.fine)}</button>
				<button class="fl-step" data-d="${S.fine}">+${stepLabel(S.fine)}</button><button class="fl-step" data-d="${S.big}">+${stepLabel(S.big)}</button>
			</div>
			<button class="fl-send">FIRLAT!</button>
			<div class="mc-res"></div>
		</div>`;
		rule(el, 'Aşmadan en yakın');
		const root = el.querySelector('.dn-mc');
		const svg = root.querySelector('svg');
		const range = root.querySelector('.fl-range');
		const val = root.querySelector('[data-r=val]');
		const arm = svg.querySelector('.arm');
		const ammo = svg.querySelector('.ammo');
		const pvArc = svg.querySelector('.pvarc');
		const pvMk = svg.querySelector('.pvmk');
		const wall = svg.querySelector('.wall');
		const stones = svg.querySelector('.stones');
		// ölçü çizgileri ve fark yazıları kendi katmanında, taşların üstünde: sonradan atılan taşın krateri yazıyı örtmesin
		const mss = svg.querySelector('.mss');
		// değer yazıları en üst katmanda: uçan taşların dumanı, tozu ve izleri yazıların üstünden geçmez
		const labs = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		labs.setAttribute('class', 'labs');
		svg.appendChild(labs);
		const msg = root.querySelector('.dn-mc-msg');
		let lo = q.min;
		let hi = q.max;
		let done = false;
		let mine = null; // gönderilen değer
		let myThrow = null; // kendi atışım: { known, landed, next }
		let revealed = false;
		const anims = new Set();
		const ab = arm.querySelector('.ab');
		const af = arm.querySelector('.af');
		const sling = arm.querySelector('.sling');
		const cwr = svg.querySelector('.cwr');
		const cwb = svg.querySelector('.cwb');
		const dial = root.querySelector('.dn-mc-val');
		let armDeg = 160;
		/** Kol açısı (derece; 180 sol): uzun kol, askı ve taş; kısa kolda asılı karşı ağırlık. */
		const setArm = (deg, loaded = true) => {
			armDeg = deg;
			const { long, short } = armEnds(deg);
			for (const l of [ab, af]) {
				l.setAttribute('x1', short.x.toFixed(1));
				l.setAttribute('y1', short.y.toFixed(1));
				l.setAttribute('x2', long.x.toFixed(1));
				l.setAttribute('y2', long.y.toFixed(1));
			}
			const sx = long.x + 3;
			const sy = Math.min(GY - 8, long.y + 9);
			sling.setAttribute('d', loaded ? `M${long.x.toFixed(1)},${long.y.toFixed(1)} Q${(sx - 4).toFixed(1)},${(sy + 2).toFixed(1)} ${sx.toFixed(1)},${sy.toFixed(1)}` : `M${long.x.toFixed(1)},${long.y.toFixed(1)} l6,10`);
			ammo.setAttribute('transform', `translate(${sx.toFixed(1)},${sy.toFixed(1)})`);
			cwr.setAttribute('d', `M${short.x.toFixed(1)},${short.y.toFixed(1)} v6`);
			cwb.setAttribute('transform', `translate(${short.x.toFixed(1)},${(short.y + 6).toFixed(1)})`);
		};
		const pose = (x) => {
			// kol gerilir: güç arttıkça askı ucu yere iner, karşı ağırlık yükselir
			const f = (x - q.min) / (q.max - q.min || 1);
			setArm(168 - 34 * f);
			dial.style.setProperty('--pw', f.toFixed(3));
		};
		/** Atış: karşı ağırlık düşer, kol öne savrulur (JS ara karesi; kutu kolla birlikte oynar). */
		const swingArm = (ms = 260) => {
			const from = armDeg;
			const to = 282;
			const a0 = performance.now();
			const st = () => {
				const k = Math.min(1, (performance.now() - a0) / ms);
				setArm(from + (to - from) * k * k, k < 0.7);
				if (k < 1) requestAnimationFrame(st);
			};
			requestAnimationFrame(st);
		};
		const set = (x) => {
			x = Math.max(lo, Math.min(hi, Math.round(x)));
			range.value = String(x);
			val.textContent = fmt(x);
			pose(x);
			const lx = xOf(v, x);
			pvArc.setAttribute('d', pathOf(arc(lx)));
			pvMk.setAttribute('transform', `translate(${lx.toFixed(1)},0)`);
		};
		set(mid);
		range.addEventListener('input', () => set(Number(range.value)));
		for (const b of root.querySelectorAll('.fl-step'))
			b.addEventListener('click', () => {
				set(Number(range.value) + Number(b.dataset.d));
				range.dispatchEvent(new Event('input', { bubbles: true }));
				sfx(app, 'tap');
			});
		const say = (html, tone, ms = 1600) => {
			msg.innerHTML = html;
			msg.className = `dn-mc-msg on ${tone}`;
			if (ms) setTimeout(() => msg.classList.remove('on'), ms);
		};
		const showWall = () => {
			if (v.hedef == null || wall.dataset.on) return;
			wall.dataset.on = '1';
			wall.innerHTML = wallSVG(v, xOf(v, v.hedef));
			// surun değer yazısı da en üst katmanda (sur yükselirken kendi geçişiyle belirir)
			const wt = wall.querySelector('text.lt');
			if (wt) {
				wt.style.transition = 'opacity .5s .5s';
				wt.style.opacity = '0';
				labs.appendChild(wt);
				requestAnimationFrame(() => (wt.style.opacity = '1'));
			}
			svg.querySelector('.fogs').classList.add('off');
			requestAnimationFrame(() => wall.classList.remove('hide'));
		};
		const wallX = () => (v.hedef == null ? null : xOf(v, v.hedef));
		/** Bir taşı at: renk, değer; bitince onLand(x). Kolu (yalnız kendi atışında) savurur. */
		const NS = 'http://www.w3.org/2000/svg';
		const mk = (tag, attrs, parent) => {
			const e = document.createElementNS(NS, tag);
			for (const [k, x] of Object.entries(attrs)) e.setAttribute(k, x);
			parent.appendChild(e);
			return e;
		};
		// işaret yazıları üst üste binmesin: yakın düşen taşların yazısı bir kat yukarı çıkar (direği de uzar)
		const placed = [];
		const levelOf = (ex, label) => {
			const w = [...String(label)].length * 7.4 + 6;
			for (let k = 0; k < 6; k++) if (!placed.some((p) => p.k === k && Math.abs(p.x - ex) < (p.w + w) / 2)) return placed.push({ x: ex, w, k }), k;
			return placed.push({ x: ex, w, k: 6 }), 6;
		};
		/** Çarpma: parlama, toprak parçaları, krater, işaret direği. */
		const impact = (g, ex, color, label, big) => {
			mk('ellipse', { cx: ex, cy: GY + 1, rx: big ? 11 : 8, ry: 2.6, fill: '#1a1208', opacity: '.75' }, g);
			mk('circle', { class: 'flash', cx: ex, cy: GY - 6, r: big ? 13 : 10, fill: '#fff3b0' }, g);
			for (let i = 0; i < (big ? 16 : 11); i++) {
				const a = Math.PI * (0.1 + 0.8 * (i / (big ? 15 : 10)));
				const c = mk('circle', { class: 'chunk', cx: ex, cy: GY - 3, r: (1.4 + (i % 3) * 0.8).toFixed(1), fill: i % 3 ? '#6a4a2a' : '#a07a4a' }, g);
				c.style.setProperty('--dx', `${(Math.cos(a) * (14 + (i % 4) * 7) * (i % 2 ? 1 : -1)).toFixed(1)}px`);
				c.style.setProperty('--dy', `${(-Math.sin(a) * (14 + (i % 5) * 6)).toFixed(1)}px`);
			}
			mk('circle', { class: 'dust', cx: ex, cy: GY - 4, r: 10, fill: '#e8dcc0' }, g);
			const up = label ? levelOf(ex, label) * 15 : 0;
			g.insertAdjacentHTML('beforeend', `<line x1="${ex}" y1="${GY - 26 - up}" x2="${ex}" y2="${GY}" stroke="${color}" stroke-width="2.2"/><path d="M${ex},${GY - 26 - up} l12,4 -12,4z" fill="${color}"/>`);
			if (label) labs.insertAdjacentHTML('beforeend', `<text class="lt sl" x="${ex}" y="${GY - 30 - up}" text-anchor="middle" fill="${color}">${esc(label)}</text>`);
		};
		/** Bir taşı at: renk, değer; bitince onLand(x). Kolu (yalnız kendi atışında) savurur. Taş alev alır, duman bırakır. */
		const throwStone = (value, color, { swing = false, delay = 0, label = '', onLand } = {}) => {
			const ex = landX(v, value, wallX());
			const a = arc(ex);
			const g = document.createElementNS(NS, 'g');
			g.innerHTML = `<path d="${pathOf(a)}" fill="none" stroke="${color}" stroke-width="1.4" stroke-dasharray="2 4" opacity="0" class="trail"/><g class="ball"><circle class="fire" r="11" fill="url(#mcF)"/><circle r="5.6" fill="url(#mcR)" stroke="${color}" stroke-width="1.8"/></g>`;
			const ball = g.querySelector('.ball');
			const trail = g.firstChild;
			g.style.opacity = '0';
			stones.appendChild(g);
			const go = () => {
				if (swing) {
					swingArm();
					setTimeout(() => ammo.setAttribute('opacity', '0'), 180);
					sfx(app, 'catapult');
					buzz(18);
				} else sfx(app, 'whoosh');
				const t0 = performance.now() + (swing ? 180 : 0);
				const dur = 850 + 550 * ((ex - REL.x) / (X1 - REL.x));
				let lastSmoke = 0;
				const step = () => {
					if (!g.isConnected) return anims.delete(step);
					const nowT = performance.now();
					if (nowT < t0) return requestAnimationFrame(step);
					g.style.opacity = '1';
					const t = Math.min(1, (nowT - t0) / dur);
					const p = at(a, t);
					ball.setAttribute('transform', `translate(${p.x.toFixed(1)},${p.y.toFixed(1)}) rotate(${(t * 720).toFixed(0)})`);
					trail.setAttribute('opacity', String(Math.min(0.6, t * 2)));
					if (nowT - lastSmoke > 45 && t < 0.98) {
						lastSmoke = nowT;
						const sm = mk('circle', { class: 'smk', cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: (2.5 + Math.random() * 2).toFixed(1), fill: Math.random() < 0.3 ? '#ffb23a' : '#9aa0b8' }, g);
						setTimeout(() => sm.remove(), 950);
					}
					if (t < 1) return requestAnimationFrame(step);
					anims.delete(step);
					ball.remove();
					// uçuş izi düşünce söner: kesik çizgi surun ve taşların yazılarının üstünden geçmesin
					trail.style.transition = 'opacity .6s';
					trail.setAttribute('opacity', '0');
					const over = v.hedef != null && Number(value) > v.hedef;
					impact(g, ex, color, label, swing);
					app?.cam?.impulse?.(swing ? 0.16 : 0.08);
					if (swing) buzz(over ? 40 : 25);
					onLand?.(ex);
				};
				anims.add(step);
				requestAnimationFrame(step);
			};
			if (delay) setTimeout(go, delay);
			else go();
		};
		/** Ölçü çizgisi: taşın düştüğü yerden sura (ya da surdan taşa) yatay çizgi ve fark yazısı. */
		const measure = (value, color, row = 0) => {
			if (v.hedef == null) return;
			const wx = wallX();
			const ex = landX(v, value, wx);
			const o = outcome(v, value);
			const y = GY + 9 + row * 11;
			const x0 = Math.min(ex, wx);
			const x1 = Math.max(ex, wx);
			const txt = o.d === 0 ? 'TAM İSABET' : o.over ? `${fmt(o.d)} AŞTI` : `${fmt(-o.d)} KISA`;
			const col = o.d === 0 ? '#ffd25a' : o.over ? '#ff6a5a' : '#7dff9a';
			const g = document.createElementNS(NS, 'g');
			g.setAttribute('class', 'ms');
			g.innerHTML = `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${col}" stroke-width="1.8"/><line x1="${x0}" y1="${y - 4}" x2="${x0}" y2="${y + 4}" stroke="${col}" stroke-width="1.8"/><line x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}" stroke="${col}" stroke-width="1.8"/>
				<circle cx="${ex}" cy="${y}" r="3" fill="${color}" stroke="#fff" stroke-width="1"/><text x="${(x0 + x1) / 2}" y="${y - 3}" text-anchor="middle" fill="${col}">${esc(txt)}</text>`;
			mss.appendChild(g);
		};
		/** Kamera: sahnenin görünen alanını (viewBox) sur ve taşların çevresine yumuşakça daraltır. */
		const zoomTo = (xs, ms = 900) => {
			svg.closest('.dn-mc')?.classList.add('zoom');
			const lo = Math.max(0, Math.min(...xs) - 46);
			const hi = Math.min(W, Math.max(...xs) + 46);
			// görünen alan surun bayrağını ve değer yazısını (sur tepesinin 35 px üstü) da içerecek kadar yüksek: dar kadrajda
			// yazı üstten kesiliyordu
			const upMax = Math.max(0, ...placed.map((p) => p.k)) * 15; // kat kat yükselen işaret yazıları da kadrajda kalsın
			const h = Math.min(H, Math.max((Math.max(150, hi - lo) * H) / W, GY + 34 - (GY - WALL_H - 48), 34 + 30 + 18 + upMax));
			const w = (h * W) / H;
			const tx = Math.max(0, Math.min(W - w, (lo + hi) / 2 - w / 2));
			const ty = Math.min(H - h, GY + 34 - h);
			const a0 = performance.now();
			const from = [0, 0, W, H];
			const to = [tx, ty, w, h];
			const st = () => {
				if (!svg.isConnected) return;
				const k = Math.min(1, (performance.now() - a0) / ms);
				const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
				svg.setAttribute('viewBox', from.map((f, i) => (f + (to[i] - f) * e).toFixed(1)).join(' '));
				if (k < 1) requestAnimationFrame(st);
			};
			requestAnimationFrame(st);
		};
		const verdict = (value) => {
			const o = outcome(v, value);
			if (o.d === 0) return ['TAM İSABET!', 'gold', 'surun tam dibinde'];
			if (o.over) return ['AŞTIN!', 'bad', `taş surun üstünden uçtu · ${fmt(o.d)} fazla`];
			if (o.near <= 0.04) return ['ÇOK YAKIN!', 'good', `${fmt(-o.d)} kısa`];
			if (o.near <= 0.15) return ['YAKIN!', 'good', `${fmt(-o.d)} kısa`];
			return ['KISA KALDI', 'cold', `${fmt(-o.d)} kısa`];
		};
		root.querySelector('.fl-send').addEventListener('click', () => {
			if (done) return;
			done = true;
			mine = Number(range.value);
			root.classList.add('sent');
			// cevap hemen gider; atış canlandırması kartta sürer (sur biliniyorsa sonuç da hemen görünür)
			api.answer(mine);
			const known = v.hedef != null;
			if (known) setTimeout(showWall, 380);
			myThrow = { known, landed: false, next: null };
			throwStone(mine, '#ffd25a', {
				swing: true,
				delay: 60,
				label: known ? fmt(mine) : '',
				onLand: () => {
					myThrow.landed = true;
					setTimeout(() => myThrow.next?.(), 700);
					if (revealed) return; // sonuç ekranı geldi: liste ve ölçü çizgileri söyler
					if (!known) return say('Taş sise daldı…<small>sonuç birazdan</small>', 'cold', 0);
					const [t, tone, sub] = verdict(mine);
					say(`${t}<small>${esc(sub)}</small>`, tone, 0);
					if (!revealed) measure(mine, '#ffd25a');
					if (outcome(v, mine).over) {
						wall.classList.add('hit');
						sfx(app, 'wrong');
						buzz(40);
					} else sfx(app, o0(mine) ? 'right' : 'crumble');
				},
			});
		});
		const o0 = (x) => outcome(v, x).near <= 0.15;
		return {
			lock() {
				done = true;
			},
			value: () => Number(range.value),
			joker(e) {
				if (e?.kind === 'range') {
					lo = e.min;
					hi = e.max;
					range.min = String(lo);
					range.max = String(hi);
					set((lo + hi) / 2);
					range.dispatchEvent(new Event('input', { bubbles: true }));
					const n = svg.querySelector('.narrow');
					n.setAttribute('x', xOf(v, lo).toFixed(1));
					n.setAttribute('width', (xOf(v, hi) - xOf(v, lo)).toFixed(1));
					n.classList.add('on');
					app?.ui?.toast?.('Sur bu mavi aralıkta', { tone: 'good', ms: 1800 });
				} else if (e?.kind === 'crowd') {
					const c = svg.querySelector('.crowd');
					const x = xOf(v, e.value);
					// yazı en az bir kat yukarıda ("SUR SİSTE · AŞMA!" levhası yerin 21–41 birim üstünde) ve kat yerleşimine
					// katılır: cevapta düşen taşların yazıları ona binmez (320 px'te "seyirci 1895" ile "1891" üst üste kalıyordu)
					const lab = `seyirci ${fmt(e.value)}`;
					const w = [...lab].length * 7.4 + 6;
					let k = 1;
					while (k < 6 && placed.some((p) => p.k === k && Math.abs(p.x - x) < (p.w + w) / 2)) k++;
					placed.push({ x, w, k });
					const up = k * 15;
					c.querySelector('.cl').setAttribute('x1', x);
					c.querySelector('.cl').setAttribute('x2', x);
					c.querySelector('.cl').setAttribute('y1', GY - 30 - up);
					const t = c.querySelector('.ct');
					t.setAttribute('x', x);
					t.setAttribute('y', GY - 34 - up);
					t.textContent = lab;
					c.classList.add('on');
					app?.ui?.toast?.(`Seyirci ${fmt(e.value)} diyor`, { tone: 'info', ms: 1800 });
				}
			},
			reveal(results) {
				done = true;
				revealed = true;
				root.classList.add('done');
				// sahnedeki atış yazısı kalkar (sonuç damgası ve listesi söyler); ölçü çizgileri yakınlaşmadan sonra yeniden
				setTimeout(() => msg.classList.remove('on'), 700);
				showWall();
				// herkesin taşı sırayla atılır. Kendi taşım sur bilinirken atıldıysa yerinde kalır (uçuşu bitince
				// ötekiler gelir); sur sisteyken atıldıysa sonuç yeniden, doğru yerine atılır.
				const keep = myThrow?.known;
				if (!keep) {
					msg.classList.remove('on');
					stones.innerHTML = '';
					mss.innerHTML = '';
					for (const t of labs.querySelectorAll('.sl')) t.remove(); // taş yazıları üst katmanda
				} else setTimeout(() => msg.classList.remove('on'), 1400);
				const list = results.filter((r) => r.value != null && !(keep && r.p?.human));
				const rest = () => {
					setArm(282, false);
					list.forEach((r, k) => throwStone(Number(r.value), r.color, { delay: 350 + k * 520, label: fmt(Number(r.value)) }));
				};
				if (keep && !myThrow.landed) myThrow.next = rest;
				else setTimeout(rest, keep ? 200 : 300);
				// sıralama ve damga: aşmayanlardan en yakın; hepsi aştıysa en az aşan
				const order = results.slice().sort((a, b) => a.err - b.err || a.time - b.time);
				const win = order[0];
				// ne kadar yaklaştın: kamera sura ve taşlara yaklaşır, fark çizgileri ve sıralı sonuç listesi
				if (v.hedef != null) {
					const shot = results.filter((r) => r.value != null);
					const xs = [wallX(), ...shot.map((r) => landX(v, Number(r.value), wallX()))];
					setTimeout(() => zoomTo(xs), 450 + list.length * 520);
					setTimeout(() => {
						mss.innerHTML = '';
						const meR0 = shot.find((r) => r.p?.human);
						const marks = [win, meR0 && meR0 !== win ? meR0 : null].filter((r) => r && r.value != null);
						marks.forEach((r, i) => measure(Number(r.value), r.color, i));
					}, 1400 + list.length * 520);
					const rows = order.map((r, k) => {
						if (r.value == null) return `<div style="--c:${r.color};--k:${k}"><span class="rk">${k + 1}</span><b>${esc(r.name)}</b><em>—</em><u class="over">ATIŞ YOK</u></div>`;
						const o = outcome(v, Number(r.value));
						const tag = o.d === 0 ? ['TAM İSABET', 'gold'] : o.over ? [`${fmt(o.d)} AŞTI`, 'over'] : [`${fmt(-o.d)} KISA`, ''];
						return `<div class="${r === win ? 'win' : ''}" style="--c:${r.color};--k:${k}"><span class="rk">${k + 1}</span><b>${esc(r.name)}</b><em>${fmt(Number(r.value))}${q.unit ? ` <small>${esc(q.unit)}</small>` : ''}</em><u class="${tag[1]}">${esc(tag[0])}</u></div>`;
					});
					root.querySelector('.mc-res').innerHTML = `<div style="--c:#7dff9a;--k:0;background:#06140a"><span class="rk" style="background:#2a6a3a">✓</span><b>Doğru cevap</b><em>${fmt(v.hedef)}${q.unit ? ` <small>${esc(q.unit)}</small>` : ''}</em></div>` + rows.join('');
				}
				const winOver = win && win.value != null && outcome(v, win.value).over;
				const meR = results.find((r) => r.p?.human);
				if (meR && app && win) {
					const o = meR.value == null ? null : outcome(v, meR.value);
					if (!o) stampLater(app, 'ATIŞ YOK', 'warn');
					else if (win === meR) stampLater(app, o.d === 0 ? 'TAM İSABET!' : o.over ? 'EN AZ SEN AŞTIN!' : 'EN YAKIN SEN!', 'gold', o.over ? 'Herkes aştı, sen en az' : `Surun dibinde · ${fmt(-o.d)} kısa`);
					else stampLater(app, o.over ? 'AŞTIN!' : 'KISA KALDIN', 'bad', `${win.name} ${winOver ? 'daha az aştı' : 'surun dibinde'}`);
				}
				setTimeout(() => {
					const w = el.closest('.fl-q')?.querySelector('.fl-cr.win .tag');
					if (w && win?.value != null) w.textContent = winOver ? 'EN AZ AŞAN' : win.err === 0 ? 'TAM İSABET' : 'AŞMADAN EN YAKIN';
				}, 0);
			},
			destroy() {
				anims.clear();
			},
		};
	},
	joker(id, v, R) {
		const q = v.q;
		const span = q.max - q.min;
		if (id === 'yari') {
			// cevabı içeren ama ortalanmamış dar aralık (tahmin tipiyle aynı: aralığın %28'i)
			const w = Math.max(6, Math.round(span * 0.28));
			let lo = Math.round(v.hedef - w * (0.15 + R() * 0.7));
			lo = Math.max(q.min, Math.min(q.max - w, lo));
			return { kind: 'range', min: lo, max: Math.min(q.max, lo + w) };
		}
		if (id === 'kahin') {
			const spread = Math.round(span * (0.03 + 0.035 * (q.diff || 2)));
			return { kind: 'crowd', value: Math.round(clamp(v.hedef + gauss(R) * spread, q.min, q.max)) };
		}
		return null;
	},
	/** Çevrimiçi görünüm: sur yeri (cevap) yok. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.hedef;
		delete o.q.ans;
		return o;
	},
	judge(v, value) {
		if (value == null || !Number.isFinite(Number(value))) return { correct: false, err: Infinity };
		const o = outcome(v, value);
		return { correct: !o.over && o.near <= 0.03, err: o.err, over: o.over };
	},
	bot(v, skill, R) {
		const q = v.q;
		const span = q.max - q.min;
		// tahmin tipinin hata modeli, artı temkin: bot tahminini kendi belirsizliğinin bir katı kadar aşağı çeker
		// (usta bot az, acemi çok çeker; yine de kimi zaman aşar)
		const sigma = (1.15 - skill) * 0.32 * (0.7 + 0.3 * q.diff) * Math.min(span, Math.abs(v.hedef) + span * 0.2) * 0.5;
		const exact = R() < pCorrect(skill, q.diff) * 0.3;
		const shade = 0.45 + R() * 0.6;
		let value = exact ? v.hedef - Math.floor(R() * 2) : v.hedef + (gauss(R) - shade) * sigma;
		value = Math.round(Math.max(q.min, Math.min(q.max, value)));
		return { value, time: botTime(v, R, skill, 0.1, 0.9) };
	},
	/** Sınama örneği (test/deneme.test.mjs): tam isabet ve aralığın sonuna atılan (aşan) taş. */
	ornek(v) {
		return { good: v.hedef, bad: v.q.max };
	},
};
