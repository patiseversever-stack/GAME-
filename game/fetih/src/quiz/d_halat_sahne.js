// HALAT ÇEKME SAHNESİ (görsel katman; oyun mantığı d_halat.js'te). Gün batımında bir er meydanı: iki yanda takım
// renginde tribünler ve sallanan bayraklar, ortada çamur çukuru. Her takımda üç pehlivan geriye yaslanıp halatı çeker;
// halat bükümlü (çift renkli sarmal), ortasında kırmızı kurdeleli düğüm. Doğru cevapta takım bir adım çeker: ayaklarda
// toz, düğümde şok halkası, tribün zıplar, "+1" uçar; seri (3+) alev rozeti yakar. Son 5 saniyede halat titrer, kenarlar
// kırmızı nabız atar. Sonuçta kaybeden takım çamura sürüklenir (sıçrama), kazanan zıplar.
//
// Çizim tek SVG (viewBox 400×220); kare başına yalnız takım gruplarının dönüşümü, halat yolu ve düğüm güncellenir.

export const VB = { w: 400, h: 220 };
export const GY = 190; // zemin
export const CX = 200;
export const SX = 10; // adım başına kayma
export const STEPS = 7;
const LEAD = 52; // öndeki pehlivanın merkezden uzaklığı
const GAPX = 28; // takım arkadaşları arası
const HANDY = -47; // ellerin ayaktan yüksekliği

const SKIN = ['#f1c39a', '#d9a273', '#b9805a', '#f5d0b0', '#8a5a3a'];
const HAIR = ['#2a1a10', '#5a3418', '#111', '#8a5a2a', '#3a2a20'];

const shade = (hex, k) => {
	const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
	if (!m) return hex;
	const n = parseInt(m[1], 16);
	const f = (c) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
	return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((c) => c.toString(16).padStart(2, '0')).join('');
};

/** Bir pehlivan (sağa bakar, ayak ortası 0,0). k: tohum (ten/saç). */
function puller(color, k, lead) {
	const skin = SKIN[k % SKIN.length];
	const hair = HAIR[(k * 3 + 1) % HAIR.length];
	const dark = shade(color, -0.45);
	const lite = shade(color, 0.35);
	return `<g class="pl">
		<ellipse cx="4" cy="1.5" rx="17" ry="3.4" fill="#000" opacity=".28"/>
		<path d="M-2,-33 L4,-18 L13,-1" fill="none" stroke="${skin}" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round"/>
		<path d="M-2,-33 L-8,-17 L1,-1" fill="none" stroke="${shade(skin, -0.12)}" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round"/>
		<path d="M10,-1.5 h7.5 a2.5,2.5 0 0 1 0,4 h-9z M-2,-1.5 h7 a2.5,2.5 0 0 1 0,4 h-8.5z" fill="#1d1612"/>
		<path d="M-7,-40 C-6,-30 4,-28 6,-34 L3,-26 L-8,-26z" fill="${dark}"/>
		<path d="M-2,-33 L-12,-58" stroke="${color}" stroke-width="14" stroke-linecap="round"/>
		<path d="M-6,-36 L-14,-55" stroke="${lite}" stroke-width="3" stroke-linecap="round" opacity=".55"/>
		${lead ? `<path d="M-3,-35 L-11,-53" stroke="#fff" stroke-width="2.4" stroke-dasharray="3 3" opacity=".8"/>` : ''}
		<path d="M-11,-56 Q4,-56 19,${HANDY + 1}" fill="none" stroke="${skin}" stroke-width="5.2" stroke-linecap="round"/>
		<path d="M-13,-52 Q2,-50 17,${HANDY + 2}" fill="none" stroke="${shade(skin, -0.1)}" stroke-width="4.6" stroke-linecap="round"/>
		<circle cx="19" cy="${HANDY + 0.5}" r="3.6" fill="${skin}"/>
		<g class="hd"><circle cx="-16" cy="-68" r="8.6" fill="${skin}"/>
			<path d="M-24.4,-69 a8.6,8.6 0 0 1 16.8,-1.5 q-6,-4.5 -16.8,1.5z" fill="${hair}"/>
			<path d="M-24.6,-67.5 h17.4" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>
			<circle cx="-11.5" cy="-67" r="1.2" fill="#1d1612"/><path d="M-13.5,-62.5 q2.5,1.6 4.6,-0.4" fill="none" stroke="#1d1612" stroke-width="1.1" stroke-linecap="round"/>
			<circle class="sw" cx="-6.5" cy="-72" r="1.5" fill="#bfe8ff" opacity="0"/></g>
	</g>`;
}

/** Bir tribün: takım renginde kalabalık (iki sıra baş), bayraklar. side: -1 sol, +1 sağ. */
function stand(color, side) {
	const x0 = side < 0 ? 4 : 250;
	const out = [];
	out.push(`<path d="M${x0},128 L${x0 + 146},128 L${x0 + 146 - side * 0},146 L${x0},146z" fill="#1a1530" opacity=".85"/>`);
	out.push(`<rect x="${x0}" y="126" width="146" height="3" fill="${color}" opacity=".9"/>`);
	const heads = [];
	for (let r = 0; r < 2; r++)
		for (let i = 0; i < 13; i++) {
			const x = x0 + 7 + i * 11 + (r ? 5 : 0);
			const y = 121 - r * 9 + ((i * 7) % 3);
			const c = i % 4 === r ? '#fff' : i % 3 ? color : shade(color, -0.35);
			heads.push(`<g class="fan" style="--d:${((i * 0.13 + r * 0.07) % 0.5).toFixed(2)}s"><rect x="${x - 4}" y="${y}" width="8" height="9" rx="3" fill="${c}"/><circle cx="${x}" cy="${y - 3}" r="3.6" fill="${SKIN[(i + r) % SKIN.length]}"/></g>`);
		}
	out.push(`<g class="crowd ${side < 0 ? 'L' : 'R'}">${heads.join('')}</g>`);
	for (const fx of [x0 + 18, x0 + 128])
		out.push(`<g class="flg" style="transform-origin:${fx}px 100px"><line x1="${fx}" y1="128" x2="${fx}" y2="92" stroke="#e8e0d0" stroke-width="1.6"/><path class="fw" d="M${fx},92 q10,-3 20,2 q-10,4 -20,10z" fill="${color}" stroke="#fff" stroke-width=".8"/></g>`);
	return out.join('');
}

/** Sahnenin durgun katmanları + takım grupları ve halat için boş gruplar. */
export function sahneSVG(cL, cR) {
	const ticks = [];
	for (let i = 1; i <= STEPS; i++)
		for (const s of [-1, 1]) {
			const x = CX + s * i * SX;
			ticks.push(`<line x1="${x}" y1="${GY + 3}" x2="${x}" y2="${GY + (i % 3 === 0 ? 11 : 7)}" stroke="#f4ffe8" stroke-opacity="${i % 3 === 0 ? 0.7 : 0.35}" stroke-width="1.3"/>`);
		}
	const team = (color, side) =>
		`<g class="team ${side < 0 ? 'L' : 'R'}">${[2, 1, 0]
			.map((i) => `<g class="mb" data-i="${i}" transform="translate(${CX + side * (LEAD + i * GAPX)},${GY})"><g transform="scale(${side < 0 ? 1 : -1},1)"><g class="ln">${puller(color, i + (side < 0 ? 0 : 3), i === 0)}</g></g></g>`)
			.join('')}<g class="dusts"></g></g>`;
	return `<svg viewBox="0 0 ${VB.w} ${VB.h}" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
	<defs>
		<linearGradient id="htSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#191446"/><stop offset=".45" stop-color="#5a2f74"/><stop offset=".78" stop-color="#e2664a"/><stop offset="1" stop-color="#ffb15a"/></linearGradient>
		<radialGradient id="htSun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff4c8"/><stop offset=".35" stop-color="#ffd27a" stop-opacity=".9"/><stop offset="1" stop-color="#ff8a4a" stop-opacity="0"/></radialGradient>
		<linearGradient id="htGrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb84a"/><stop offset="1" stop-color="#2f6a26"/></linearGradient>
		<pattern id="htMow" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#fff" opacity=".06"/></pattern>
		<radialGradient id="htMud" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#7a4a22"/><stop offset=".7" stop-color="#4a2a12"/><stop offset="1" stop-color="#2a170a"/></radialGradient>
		<linearGradient id="htL" x1="0" x2="1"><stop offset="0" stop-color="${cL}" stop-opacity=".42"/><stop offset="1" stop-color="${cL}" stop-opacity="0"/></linearGradient>
		<linearGradient id="htR" x1="1" x2="0"><stop offset="0" stop-color="${cR}" stop-opacity=".42"/><stop offset="1" stop-color="${cR}" stop-opacity="0"/></linearGradient>
		<pattern id="htTw" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(55)"><rect width="9" height="9" fill="#c99a56"/><rect width="4.5" height="9" fill="#f0cf8c"/><rect x="4.2" width="1" height="9" fill="#7a5226"/></pattern>
	</defs>
	<rect width="${VB.w}" height="${VB.h}" fill="url(#htSky)"/>
	<circle cx="${CX}" cy="150" r="74" fill="url(#htSun)"/>
	<g fill="#fff" opacity=".5">${[[40, 30, 0.6], [120, 18, 0.9], [300, 26, 0.7], [360, 44, 0.5], [210, 12, 0.6], [80, 56, 0.4]].map(([x, y, o]) => `<circle cx="${x}" cy="${y}" r="${o + 0.4}" opacity="${o}"/>`).join('')}</g>
	<g class="cloud" opacity=".55"><path d="M40,70 q8,-12 22,-6 q10,-10 22,2 q12,0 10,10 h-60 q-6,-4 6,-6z" fill="#ffb7a0"/><path d="M290,58 q8,-10 20,-5 q9,-8 20,2 q11,0 9,9 h-54 q-5,-4 5,-6z" fill="#ffb7a0"/></g>
	<path d="M0,132 C50,112 90,124 140,116 S240,104 280,118 S360,110 400,122 L400,150 L0,150z" fill="#3a1f4a" opacity=".85"/>
	${stand(cL, -1)}${stand(cR, 1)}
	<rect x="0" y="146" width="${VB.w}" height="${VB.h - 146}" fill="url(#htGrass)"/>
	<rect x="0" y="146" width="${VB.w}" height="${VB.h - 146}" fill="url(#htMow)"/>
	<rect x="0" y="146" width="${CX}" height="${VB.h - 146}" fill="url(#htL)"/>
	<rect x="${CX}" y="146" width="${CX}" height="${VB.h - 146}" fill="url(#htR)"/>
	<rect x="0" y="146" width="${VB.w}" height="2" fill="#a6e07a" opacity=".6"/>
	<g class="pit"><ellipse cx="${CX}" cy="${GY + 2}" rx="44" ry="11" fill="#1c1008" opacity=".5"/><ellipse cx="${CX}" cy="${GY}" rx="40" ry="9" fill="url(#htMud)"/>
		<ellipse cx="${CX - 12}" cy="${GY - 3}" rx="12" ry="2.2" fill="#c08a5a" opacity=".45"/>
		${[[-18, 0.0], [6, 0.9], [22, 1.7], [-4, 2.4]].map(([dx, d]) => `<circle class="bub" cx="${CX + dx}" cy="${GY + 1}" r="2" fill="#9a6a3a" style="animation-delay:${d}s"/>`).join('')}</g>
	${ticks.join('')}
	<g class="zero"><line x1="${CX}" y1="${GY + 2}" x2="${CX}" y2="${GY - 36}" stroke="#ffd25a" stroke-width="1.8"/><path d="M${CX},${GY - 36} l12,4 -12,4z" fill="#ffd25a"/></g>
	<g class="tails"></g>
	${team(cL, -1)}${team(cR, 1)}
	<g class="rope"><path class="r0" fill="none" stroke="#5a3a1a" stroke-width="7.4" stroke-linecap="round"/><path class="r1" fill="none" stroke="url(#htTw)" stroke-width="5.6" stroke-linecap="round"/><path class="r2" fill="none" stroke="#fff6d8" stroke-width="1" stroke-linecap="round" opacity=".45"/></g>
	<g class="knot"><circle class="ring" r="9" fill="none" stroke="#fff" stroke-width="2" opacity="0"/>
		<path class="rib" d="M0,2 C-4,10 -2,18 -6,26 L0,22 L5,27 C3,18 4,10 0,2z" fill="#e8343c" stroke="#7a0e14" stroke-width=".9"/>
		<circle r="5.8" fill="#e8343c" stroke="#fff" stroke-width="1.6"/><circle r="2" cx="-1.6" cy="-1.6" fill="#fff" opacity=".7"/></g>
	<g class="fxs"></g>
	</svg>`;
}

export const SAHNE_CSS = /* css */ `
.dn-ht{display:flex;flex-direction:column;gap:8px;min-height:0;user-select:none;-webkit-user-select:none}
/* yalnız sahne (.ht-sw) daralır: öteki parçalar içeriği kadar kalır. Eskiden soru tahtası ve şıklar da daralıyordu
   (min-height içeriğin altına iniyordu): tahtadaki "Doğrusu" satırı kesiliyor, dört şıkkın alt sırası gövdeden taşıyordu */
.dn-ht>*{flex:none}
/* gövdeyi tam doldurur (sahne esner): şıkların altındaki kilit çubuğu (−6 px) ve basılı şık gövdeden taşıp _coverFit'i
   bütün ekranı küçültmeye zorlamasın diye alt pay */
.fl-q.cover .dn-ht{flex:1 1 auto;padding-bottom:8px}
.ht-hud{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px}
.ht-side{display:flex;align-items:center;gap:6px;min-width:0}
.ht-side.R{flex-direction:row-reverse}
.ht-side .fl-av{width:34px;height:34px;flex:none;border-radius:10px;box-shadow:0 0 0 2.5px var(--pc),0 3px 0 rgba(0,0,0,.45)}
.ht-side b{min-width:44px;padding:2px 8px 3px;transform:skewX(-10deg);text-align:center;font:italic 900 24px/1 'Barlow Condensed','Lilita One',sans-serif;color:#fff;background:var(--pc);box-shadow:inset 0 0 0 2px rgba(255,255,255,.7),0 3px 0 rgba(0,0,0,.4);transition:transform .15s}
.ht-side b.pop{transform:skewX(-10deg) scale(1.28)}
.ht-meter{position:relative;display:flex;flex-direction:column;gap:3px;min-width:0}
.ht-mid{text-align:center;white-space:nowrap;font:italic 900 clamp(12px,calc(4 * var(--vw)),15px)/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.08em;color:var(--lc,#ffe7a0);text-shadow:0 1px 0 #000,0 0 10px color-mix(in srgb,var(--lc,#ffd25a) 60%,transparent)}
.dn-ht.hot .ht-mid{color:#ff8a7a;animation:htBeat2 .5s ease-in-out infinite}
.ht-track{position:relative;height:12px;border-radius:7px;overflow:visible;background:#05070f;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.3)}
.ht-track .hl,.ht-track .hr{position:absolute;top:2px;bottom:2px;width:calc(50% - 3px);border-radius:5px;opacity:.85}
.ht-track .hl{left:2px;background:linear-gradient(90deg,var(--cl),color-mix(in srgb,var(--cl) 40%,transparent))}
.ht-track .hr{right:2px;background:linear-gradient(270deg,var(--cr),color-mix(in srgb,var(--cr) 40%,transparent))}
.ht-track .c0{position:absolute;left:50%;top:-4px;bottom:-4px;width:2px;margin-left:-1px;background:#ffd25a;box-shadow:0 0 6px #ffd25a}
.ht-knot{position:absolute;top:50%;left:50%;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff8a8a,#e8343c 60%,#8a0e14);box-shadow:0 0 0 2.5px #fff,0 0 14px var(--lc,#fff);transition:left .25s cubic-bezier(.3,1.5,.5,1)}
.ht-ends{display:flex;justify-content:space-between;font:italic 800 10px/1 'Barlow Condensed',sans-serif;letter-spacing:.1em;color:rgba(255,255,255,.6)}
.ht-ends span{max-width:48%;white-space:nowrap;overflow:hidden}
.ht-tag{position:absolute;top:7%;z-index:2;display:flex;align-items:center;gap:6px;padding:3px 10px 3px 3px;border-radius:999px;background:var(--pc);box-shadow:0 0 0 2px #fff,0 4px 10px rgba(0,0,0,.45)}
.ht-tag.L{left:5%}.ht-tag.R{right:5%;flex-direction:row-reverse;padding:3px 3px 3px 10px}
.ht-tag .fl-av{width:26px;height:26px;border-radius:50%}
.ht-tag b{font:italic 900 15px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.06em;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.4);white-space:nowrap}
.ht-ev{position:absolute;top:36%;z-index:3;display:flex;flex-direction:column;align-items:center;gap:1px;opacity:0;transform:translateY(8px) scale(.6);pointer-events:none;
  font:italic 900 22px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.04em;color:#fff;text-shadow:0 3px 0 rgba(0,0,0,.55)}
.ht-ev.L{left:8%}.ht-ev.R{right:8%}
.ht-ev b{font-size:14px;letter-spacing:.1em;padding:1px 8px;border-radius:5px;background:rgba(0,0,0,.55)}
.ht-ev i{font-style:normal;font-size:18px}
.ht-ev.ok span,.ht-ev.ok i{color:#7dff9a}.ht-ev.no span,.ht-ev.no i{color:#ff7a6a}
.ht-ev.on{animation:htEv 1.1s cubic-bezier(.2,1.2,.4,1) forwards}
@keyframes htEv{0%{opacity:0;transform:translateY(10px) scale(.6)}15%{opacity:1;transform:translateY(0) scale(1.08)}70%{opacity:1;transform:translateY(-4px) scale(1)}100%{opacity:0;transform:translateY(-16px) scale(.96)}}
@keyframes htBeat2{50%{transform:scale(1.12)}}
.ht-log{display:flex;flex-direction:column;gap:3px;min-height:46px}
.ht-log div{display:flex;align-items:center;gap:7px;padding:4px 9px;border-radius:9px;background:rgba(255,255,255,.06);font:500 13px/1.2 'Fredoka',sans-serif;color:#e8eefc;animation:htLog .3s ease-out}
.ht-log div:nth-child(2){opacity:.6}
.ht-log div i{flex:none;width:9px;height:9px;border-radius:50%;background:var(--pc)}
.ht-log div.ok{box-shadow:inset 3px 0 0 #3ee07a}.ht-log div.no{box-shadow:inset 3px 0 0 #ff5a4a}
.ht-log div span{flex:1;min-width:0}
.ht-log div em{flex:none;font-style:normal;font:italic 900 14px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.04em}
.ht-log .rule{justify-content:center;text-align:center;background:rgba(255,210,90,.1);box-shadow:inset 0 0 0 1.5px rgba(255,210,90,.4)}
@keyframes htLog{from{transform:translateY(-6px) scale(.97)}}
.ht-sw{position:relative;flex:1 1 auto;min-height:150px;max-height:calc(55cqw + 8px);container-type:size}
.ht-arena{position:absolute;inset:0;margin:auto;width:100%;height:min(100%,55cqw);overflow:hidden;background:radial-gradient(rgba(255,255,255,.5) .7px,transparent 1px) 0 0/37px 29px,#191446;border-radius:18px;box-shadow:0 0 0 2px rgba(255,255,255,.22),0 12px 28px rgba(0,0,0,.55)}
.fl-q:not(.cover) .ht-sw{flex:none;height:190px}
.ht-arena svg{position:absolute;inset:0;width:100%;height:100%}
.ht-arena::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;box-shadow:inset 0 0 0 0 rgba(255,40,30,0);transition:box-shadow .3s}
.dn-ht.hot .ht-arena::after{animation:htHot .5s ease-in-out infinite alternate}
.ht-combo{position:absolute;top:calc(7% + 38px);z-index:2;padding:3px 10px 4px;transform:skewX(-10deg) scale(.5);opacity:0;font:italic 900 16px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.06em;color:#fff;
  background:linear-gradient(180deg,#ffd25a,#ff6a1a 60%,#e8243c);box-shadow:0 0 0 2px #fff,0 0 18px rgba(255,120,40,.8);transition:opacity .2s,transform .3s cubic-bezier(.3,1.7,.5,1)}
.ht-combo.L{left:5%}.ht-combo.R{right:5%}
.ht-combo.on{opacity:1;transform:skewX(-10deg) scale(1)}
.ht-big{position:absolute;left:50%;top:34%;z-index:2;transform:translate(-50%,-50%) scale(.4);opacity:0;white-space:nowrap;pointer-events:none;
  font:italic 900 min(44px,11cqw)/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.04em;color:#fff;text-shadow:0 4px 0 #8a0e14,0 0 28px rgba(255,60,40,.9);transition:opacity .2s,transform .35s cubic-bezier(.3,1.7,.5,1)}
.ht-big.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
.ht-big.gold{text-shadow:0 4px 0 #7a4a00,0 0 28px rgba(255,210,90,.95)}
.dn-ht .crowd .fan{animation:htFan 1.6s ease-in-out infinite;animation-delay:var(--d)}
.dn-ht .crowd.cheer .fan{animation:htJump .32s ease-out 2;animation-delay:calc(var(--d) * .3)}
.dn-ht .flg .fw{animation:htFlag 1.2s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:0 50%}
.dn-ht .bub{animation:htBub 2.6s ease-in infinite;transform-box:fill-box;transform-origin:50% 50%}
.dn-ht .rib{animation:htRib 1.1s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 0}
.dn-ht .cloud{animation:htCloud 18s linear infinite alternate}
.dn-ht .ring.go{animation:htRing .5s ease-out}
.dn-ht .sw.go{animation:htSweat .7s ease-out}
.dn-ht .dust{animation:htDust .6s ease-out forwards;transform-box:fill-box;transform-origin:50% 50%}
.dn-ht .plus{animation:htPlus .8s ease-out forwards;font:italic 900 16px 'Barlow Condensed','Lilita One',sans-serif;paint-order:stroke;stroke:#000;stroke-width:3px}
.dn-ht .drop{animation:htDrop .9s cubic-bezier(.2,.6,.5,1) forwards}
.dn-ht.hot .rope{animation:htTaut .07s linear infinite}
/* soru tahtası */
.dn-ht-q{position:relative;min-height:72px;display:grid;place-items:center;padding:20px 12px 12px;border-radius:16px;text-align:center;overflow:hidden;
  background:linear-gradient(180deg,#fffdf6,#f3ead6);border:2.5px solid #fff;box-shadow:0 4px 0 #c9b48a,0 8px 18px rgba(0,0,0,.4);font-size:clamp(17px,calc(4.9 * var(--vw)),21px);line-height:1.22;font-weight:700;color:#1a1f3a;text-wrap:balance}
.ht-gate{position:absolute;right:10px;bottom:4px;font-style:normal;font:italic 900 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.14em;color:#8a7a5a}
.ht-gate.go{color:#1f9a4a;animation:htBeat2 .6s ease-in-out infinite}
.dn-ht-q>span{display:block;animation:dnHtIn .24s cubic-bezier(.3,1.4,.5,1)}
.dn-ht-q>i{position:absolute;left:10px;top:5px;padding:1px 7px;border-radius:4px;font-style:normal;font:italic 800 10.5px/1.3 'Barlow Condensed',sans-serif;letter-spacing:.14em;color:#fff;background:#2a3a7a}
.dn-ht-q>u{position:absolute;right:10px;top:5px;text-decoration:none;font:italic 800 10.5px/1.3 'Barlow Condensed',sans-serif;letter-spacing:.1em;color:#8a6a2a}
.dn-ht-q.ok{box-shadow:inset 0 0 0 2.5px #7dff9a,0 0 22px rgba(125,255,154,.45)}
.dn-ht-q.no{box-shadow:inset 0 0 0 2.5px #ff6a5a,0 0 22px rgba(255,106,90,.45);animation:flq-shake .38s}
.dn-ht-q .fix{display:block;margin-top:4px;font-size:13px;color:#c8352a}
.ht-dots{display:flex;justify-content:center;gap:4px;min-height:8px}
.ht-dots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.14)}
.ht-dots i.y{background:#3ee07a;box-shadow:0 0 6px #3ee07a}.ht-dots i.n{background:#ff5a4a;box-shadow:0 0 6px #ff5a4a}
.dn-ht-a{position:relative}
.dn-ht-a .fl-tf .fl-opt{min-height:60px;font-size:23px}
.dn-ht-a .fl-tf .fl-opt::before{width:26px;height:26px}
.dn-ht-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.dn-ht-g .fl-opt{min-height:52px;justify-content:center;text-align:center;padding:6px 8px 7px;font-size:clamp(14.5px,calc(4.1 * var(--vw)),17px)}
.dn-ht-g.n3 .fl-opt:first-child{grid-column:1/3}
.dn-ht-a .fl-opt.wait{pointer-events:none;opacity:.78;filter:saturate(.75)}
.dn-ht-a .fl-opt.gone{opacity:.14;pointer-events:none}
.dn-ht-a.lock .fl-opt{opacity:.35;pointer-events:none;filter:grayscale(.6)}
.dn-ht-rd{position:absolute;left:8%;right:8%;top:-5px;height:3px;border-radius:2px;background:#9fc4ff;transform-origin:left;transform:scaleX(0);opacity:0}
.dn-ht-a.read .dn-ht-rd{opacity:.8;animation:dnHtRd var(--gt) linear forwards}
.dn-ht-lk{position:absolute;left:8%;right:8%;bottom:-6px;height:5px;border-radius:3px;background:#ff6a5a;transform-origin:left;transform:scaleX(0);opacity:0}
.dn-ht-a.lock .dn-ht-lk{opacity:1;animation:dnHtLk var(--lk) linear forwards}
.dn-ht.done .dn-ht-q,.dn-ht.done .dn-ht-a,.dn-ht.done .ht-dots,.dn-ht.done .ht-log{display:none}
/* cevap: son üç maddem. Madde yazısı sarar (kesilmez, küçülmez); doğru şık sağda, gerekirse o da iki satıra iner */
.dn-ht-rows{display:none;flex-direction:column;gap:4px;font:500 12.5px/1.25 'Fredoka',sans-serif;text-align:left}
.dn-ht.done .dn-ht-rows{display:flex}
.dn-ht-rows div{display:flex;gap:7px;align-items:center;padding:5px 9px;border-radius:9px;background:rgba(255,255,255,.07)}
.dn-ht-rows div.n{background:rgba(255,80,60,.2)}
.dn-ht-rows span:first-child{flex:none}
.dn-ht-rows span:nth-child(2){flex:1 1 auto;min-width:0}
.dn-ht-rows em{flex:0 1 auto;max-width:42%;text-align:right;font-style:normal;font-family:'Lilita One';opacity:.85}
@media (max-height:600px){.ht-sw{min-height:72px!important}.dn-ht-q{min-height:48px!important;font-size:14px!important}.dn-ht-a .fl-tf .fl-opt{min-height:44px!important}.dn-ht-g .fl-opt{min-height:38px!important}}
@media (max-height:720px){.ht-sw{min-height:90px}.dn-ht-q{min-height:56px;padding:16px 10px 6px;font-size:15px}.dn-ht-a .fl-tf .fl-opt{min-height:48px;font-size:19px}.dn-ht-g .fl-opt{min-height:42px}.ht-side .fl-av{width:28px;height:28px}.ht-side b{font-size:20px}
  /* kısa ekranda yer soruya ve şıklara: olay kaydı (sahnedeki "+1 DOĞRU" balonlarının yinelemesi) ve turun başlık satırı
     (kategori çipinde ve kural yazısında zaten var) soru boyunca gizlenir; cevapta başlık satırı damganın yeri olur */
  .dn-ht{gap:6px}
  .ht-log{display:none}
  .fl-q.cover.t-halat:not(.rv) .fl-qtext{display:none}
  /* alçak sahnede (≤110 px) çekiş balonu (%36) köşedeki ad etiketinin (%7 + 32 px) üstüne biniyordu: etiketler kalkar
     (taraflar üstteki portre, skor ve ölçerin uçlarındaki adlarla belli), seri rozeti köşeye çıkar */
  .ht-tag{display:none}
  .ht-combo{top:6%}}
@keyframes dnHtIn{from{transform:translateY(12px) scale(.94)}}
@keyframes dnHtRd{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes dnHtLk{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@keyframes htBeat{50%{transform:translateX(-50%) scale(1.15)}}
@keyframes htHot{from{box-shadow:inset 0 0 18px 2px rgba(255,40,30,.35)}to{box-shadow:inset 0 0 38px 8px rgba(255,40,30,.7)}}
@keyframes htFan{50%{transform:translateY(-1.2px)}}
@keyframes htJump{40%{transform:translateY(-7px)}}
@keyframes htFlag{from{transform:skewY(-6deg) scaleX(.9)}to{transform:skewY(5deg) scaleX(1.05)}}
@keyframes htBub{0%{transform:scale(.2);opacity:0}60%{transform:scale(1);opacity:.9}100%{transform:scale(1.4) translateY(-2px);opacity:0}}
@keyframes htRib{from{transform:rotate(-12deg)}to{transform:rotate(14deg)}}
@keyframes htCloud{to{transform:translateX(16px)}}
@keyframes htRing{from{opacity:.95;transform:scale(.6)}to{opacity:0;transform:scale(2.6)}}
@keyframes htSweat{0%{opacity:0}20%{opacity:1}100%{opacity:0;transform:translate(4px,8px)}}
@keyframes htDust{from{opacity:.9;transform:scale(.3)}to{opacity:0;transform:scale(1.8) translateY(-4px)}}
@keyframes htPlus{0%{opacity:0;transform:translateY(4px) scale(.6)}25%{opacity:1;transform:translateY(-6px) scale(1.15)}100%{opacity:0;transform:translateY(-26px)}}
@keyframes htDrop{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(var(--dx),var(--dy))}}
@keyframes htTaut{50%{transform:translateY(.8px)}}
@media (prefers-reduced-motion:reduce){.dn-ht .crowd .fan,.dn-ht .flg .fw,.dn-ht .bub,.dn-ht .rib,.dn-ht .cloud,.dn-ht.hot .rope{animation:none}}
`;

/**
 * Sahne denetleyicisi. root: .dn-ht; pos() → halat konumu (+: sola çekili, adım). Dönen nesne kare başına çizer ve
 * olayları canlandırır (çekiş, kayma, seri, son saniyeler, sonuç).
 */
export function sahne(root, pos) {
	const svg = root.querySelector('.ht-arena svg');
	const teams = [svg.querySelector('.team.L'), svg.querySelector('.team.R')];
	const mbs = teams.map((t) => [...t.querySelectorAll('.mb')].sort((a, b) => a.dataset.i - b.dataset.i));
	const lns = mbs.map((l) => l.map((m) => m.querySelector('.ln')));
	const rope = [...svg.querySelectorAll('.rope path')];
	const tails = svg.querySelector('.tails');
	const knot = svg.querySelector('.knot');
	const ring = svg.querySelector('.ring');
	const crowds = [svg.querySelector('.crowd.L'), svg.querySelector('.crowd.R')];
	const fxs = svg.querySelector('.fxs');
	const NS = 'http://www.w3.org/2000/svg';
	let kx = CX;
	let kv = 0;
	let tension = 0;
	const kick = [0, 0]; // takım başına çekiş darbesi (geri yaslanma)
	let hot = false;
	let over = null; // sonuç: { win: s } çamura sürükleme
	let overT = 0;
	const el = (tag, attrs, parent = fxs) => {
		const e = document.createElementNS(NS, tag);
		for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
		parent.appendChild(e);
		return e;
	};
	const gone = (e, ms) => setTimeout(() => e.remove(), ms);
	const memberX = (s, i, shift) => CX + (s ? 1 : -1) * (LEAD + i * GAPX) + shift;
	tails.innerHTML = '';
	const draw = (t) => {
		const target = CX - Math.max(-STEPS, Math.min(STEPS, pos())) * SX;
		kv += (target - kx) * 0.15;
		kv *= 0.74;
		kx += kv;
		tension = Math.max(0, tension - 0.03);
		for (let s = 0; s < 2; s++) kick[s] = Math.max(0, kick[s] - 0.06);
		const shift = kx - CX;
		const jit = hot && !over ? Math.sin(t * 50) * 0.8 : 0;
		const p = Math.max(-1, Math.min(1, pos() / STEPS));
		const hands = [[], []];
		for (let s = 0; s < 2; s++) {
			const side = s ? 1 : -1;
			// önde olan takım daha dik, geride kalan öne çekilmiş; çekişte geriye savrulur
			const lead = side < 0 ? p : -p;
			for (let i = 0; i < 3; i++) {
				let x = memberX(s, i, shift);
				let y = GY;
				let lean = -2 - 5 * tension - 8 * kick[s] + 5 * lead + Math.sin(t * 3 + i + s) * 0.8;
				if (over) {
					const lose = s !== over.win;
					const k = Math.min(1, overT);
					if (lose) {
						// kaybeden: çamura sürüklenir, öne kapaklanır
						x += -side * (24 + i * 10) * k;
						y += 8 * k * (i === 0 ? 1 : 0.4);
						lean = -14 + 70 * k * (i === 0 ? 1 : 0.5);
					} else {
						lean = -18 + Math.sin(t * 14 + i) * 6;
						y -= Math.abs(Math.sin(t * 9 + i * 1.3)) * 10 * k;
					}
				}
				mbs[s][i].setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
				lns[s][i].setAttribute('transform', `rotate(${lean.toFixed(1)})`);
				// el: (19, HANDY) noktası pehlivanın dönüşüyle birlikte (sağ takım aynalı)
				const a = (lean * Math.PI) / 180;
				const hx = 19 * Math.cos(a) - (HANDY + 0.5) * Math.sin(a);
				const hy = 19 * Math.sin(a) + (HANDY + 0.5) * Math.cos(a);
				hands[s][i] = [x + (s ? -hx : hx), y + hy];
			}
		}
		// halat: sol kuyruk → sol takımın elleri (arkadan öne) → düğüm → sağ takım → sağ kuyruk
		const L = [hands[0][2], hands[0][1], hands[0][0]];
		const R = [hands[1][0], hands[1][1], hands[1][2]];
		const sag = 6 - tension * 5 + jit;
		const ky = GY + HANDY + 2 + sag * 0.4;
		const seq = [[L[0][0] - 30, GY - 2], ...L, [kx, ky], ...R, [R[2][0] + 30, GY - 2]];
		let d = `M${seq[0][0].toFixed(1)},${seq[0][1].toFixed(1)}`;
		for (let i = 1; i < seq.length; i++) {
			const a = seq[i - 1];
			const b = seq[i];
			// takım içinde halat gergin (eller arası), ortada (düğümün iki yanı) sarkar; kuyruklar yere iner
			const mid = i === 4 || i === 5 ? sag : i === 1 || i === seq.length - 1 ? 4 : 0.6;
			d += ` Q${((a[0] + b[0]) / 2).toFixed(1)},${((a[1] + b[1]) / 2 + mid).toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`;
		}
		for (const r of rope) r.setAttribute('d', d);
		rope[2].setAttribute('transform', 'translate(0,-1.6)');
		knot.setAttribute('transform', `translate(${kx.toFixed(1)},${ky.toFixed(1)}) rotate(${(kv * 2.2).toFixed(1)})`);
	};
	const dust = (s) => {
		for (let i = 0; i < 3; i++) {
			const x = memberX(s, i, kx - CX) + (s ? -1 : 1) * 10;
			for (let j = 0; j < 2; j++) {
				const c = el('circle', { class: 'dust', cx: (x + (j ? 6 : -4) * (s ? -1 : 1)).toFixed(1), cy: GY - 2, r: 4 + j * 2, fill: '#efe0bf' });
				c.style.animationDelay = `${i * 40 + j * 30}ms`;
				gone(c, 800);
			}
		}
	};
	const plus = (s, txt, color) => {
		const x = memberX(s, 0, kx - CX);
		const tx = el('text', { class: 'plus', x: x.toFixed(1), y: GY - 84, 'text-anchor': 'middle', fill: color });
		tx.textContent = txt;
		gone(tx, 900);
	};
	return {
		draw,
		setHot(v) {
			hot = v;
		},
		/** Bir takım çekti (right) ya da kaydı (yanlış). */
		pull(s, right, color) {
			if (right) {
				kick[s] = 1;
				tension = 1;
				dust(s);
				plus(s, '+1', '#ffe27a');
				ring.classList.remove('go');
				void ring.getBBox?.();
				requestAnimationFrame(() => ring.classList.add('go'));
				crowds[s].classList.remove('cheer');
				void crowds[s].getBBox?.();
				requestAnimationFrame(() => crowds[s].classList.add('cheer'));
				for (const m of mbs[s]) {
					const sw = m.querySelector('.sw');
					sw.classList.remove('go');
					requestAnimationFrame(() => sw.classList.add('go'));
				}
			} else {
				tension = 0.5;
				kick[1 - s] = 0.6;
				plus(s, '−1', '#ff7a6a');
			}
			void color;
		},
		/** Sonuç: kaybeden çamura sürüklenir (sıçrama), kazanan zıplar. win: 0 sol, 1 sağ, null berabere. */
		finish(win) {
			if (win == null) return;
			over = { win };
			const t0 = performance.now();
			const tick = () => {
				overT = (performance.now() - t0) / 900;
				if (overT < 1.2) requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
			setTimeout(() => {
				// çamur sıçraması
				const x = CX + (win ? -1 : 1) * 8;
				for (let i = 0; i < 16; i++) {
					const a = Math.PI * (0.15 + 0.7 * (i / 15));
					const c = el('circle', { class: 'drop', cx: x.toFixed(1), cy: GY - 2, r: (1.5 + (i % 3)).toFixed(1), fill: i % 4 ? '#6a4020' : '#9a6a3a' });
					c.style.setProperty('--dx', `${(Math.cos(a) * (20 + (i % 5) * 7) * (i % 2 ? 1 : -1)).toFixed(1)}px`);
					c.style.setProperty('--dy', `${(-Math.sin(a) * (16 + (i % 4) * 8)).toFixed(1)}px`);
					gone(c, 1000);
				}
			}, 520);
			crowds[win].classList.remove('cheer');
			requestAnimationFrame(() => crowds[win].classList.add('cheer'));
		},
	};
}
