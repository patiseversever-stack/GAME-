// TERAZİ (yeni · grup 1): spot ışığı altında, ceviz kaidede süslü pirinç bir terazi. Her kefede 1–3 etiketli ağırlık
// (dökme demir külçe, pirinç madalyonunda "?"): dağ yükseklikleri, oyuncu sayıları, omurlar… Soru neyin tartıldığını
// söyler; oyuncu SOL AĞIR, DENGEDE ya da SAĞ AĞIR der. Cevaba dek kol hafifçe titrer, kefeler zincirlerinde salınır.
//
// İmza an (cevap): önce herkesin tahmini kendi sütununda avatarlarla; sonra ağırlıkların değeri tek tek sayılır,
// kefelerin askısında toplam belirir. Kol bırakılır: yay fiziğiyle ağır yana devrilir (fark büyükse hızla, küçükse
// gıcırdayarak), dayanağa vurup seker; ağır kefe tok bir sesle iner, toz kalkar, zincirler sarkaç gibi salınıp durulur.
// Denge ise kol bir sola bir sağa yalpalar ve tam ortada durur, ibre altın yanar. Kaidedeki pirinç levhada hüküm yazar.
//
// Veri: { q (neyin tartıldığı), unit, sol: [[etiket, değer], …], sag: [[etiket, değer], …] (1–3 ağırlık),
//         tuzak? (sezginin yanlış seçeneği: botların yanılgısı, yarı yarıyada kalan), not? (hükümle beliren NOT satırı) }.
//         Değerler yalnız iyi bilinen, değişmeyen sayılar.
// Değer: seçenek (0 sol ağır, 1 dengede, 2 sağ ağır). Tür 'exact' (bildi/bilemedi; eşitlikte hız).
// Çevrimiçi: değerler ve hüküm v.vals / v.right'ta; publicView siler (yalnız etiketler gider), cevapta gelir.
// Jokerler: yarı yarıya → yanlış bir seçenek elenir; seyirci → üç seçenekte oy yüzdeleri.

import { css, esc, pCorrect, buzz, clamp } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, rule, stampLater, sfx, onClose, LOOK, ACT } from './d_ortak.js';
import { clock, setTimeout, clearTimeout } from '../core/clock.js';

const OPTS = ['SOL AĞIR', 'DENGEDE', 'SAĞ AĞIR'];
const rmq = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmtV = (x) => (Math.abs(x) >= 1000 ? Math.round(x).toLocaleString('tr-TR') : String(Math.round(x)));
const sum = (a) => a.reduce((s, x) => s + x, 0);
const D2R = Math.PI / 180;
let UID = 0;

/** Seçenek simgesi: küçük terazi (eğik ya da düz). */
const mini = (t) => {
	const a = t === 0 ? -14 : t === 2 ? 14 : 0;
	return `<svg viewBox="0 0 40 26" aria-hidden="true"><path d="M20 6V23M13 24h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/><g transform="rotate(${a} 20 6)"><path d="M5 6h30" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M5 6l-3.5 7h7zM35 6l-3.5 7h7z" fill="currentColor"/></g><circle cx="20" cy="6" r="2.4" fill="currentColor"/></svg>`;
};
const svgCheck = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5 10-11" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const CSS = /* css */ `
.yn-terazi{position:relative;flex:1 1 auto;display:flex;flex-direction:column;gap:8px;min-height:0;user-select:none;-webkit-user-select:none}
.yn-terazi .tz-sahne{position:relative;flex:1 1 auto;min-height:170px;overflow:hidden;border-radius:18px;
  background:radial-gradient(46% 58% at 50% 2%,rgba(255,232,170,.30) 0%,rgba(255,220,150,.10) 45%,rgba(255,220,150,0) 72%),
    radial-gradient(circle at 50% 50%,rgba(255,255,255,.035) 0 1.2px,transparent 1.6px) 0 0/18px 18px,
    linear-gradient(180deg,#1b2140 0%,#10142a 62%,#0a0c1a 100%);box-shadow:0 0 0 1.5px rgba(255,255,255,.12),0 14px 30px rgba(0,0,0,.55)}
.yn-terazi .tz-sahne::after{content:'';position:absolute;left:0;right:0;bottom:0;height:22%;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.35))}
/* spot ışığının konisi ve içinde süzülen toz (terazinin altında kalır: yazıların üstüne binmez) */
.yn-terazi .tz-isik{position:absolute;left:50%;top:-6%;width:86%;height:100%;transform:translateX(-50%);pointer-events:none;
  background:conic-gradient(from 160deg at 50% 0%,rgba(255,236,190,0) 0deg,rgba(255,236,190,.09) 14deg,rgba(255,236,190,.13) 20deg,rgba(255,236,190,.09) 26deg,rgba(255,236,190,0) 40deg);
  -webkit-mask:linear-gradient(180deg,#000 0%,#000 55%,transparent 92%);mask:linear-gradient(180deg,#000 0%,#000 55%,transparent 92%)}
.yn-terazi .tz-toz2{position:absolute;inset:0;pointer-events:none}
.yn-terazi .tz-toz2 b{position:absolute;left:var(--x);top:var(--y);width:3px;height:3px;border-radius:50%;background:rgba(255,240,200,.55);box-shadow:0 0 4px rgba(255,230,170,.6);
  animation:tzMote var(--d) var(--z) ease-in-out infinite alternate}
@keyframes tzMote{0%{transform:translate(0,0);opacity:.15}50%{opacity:.7}100%{transform:translate(14px,-18px);opacity:.2}}
@media (prefers-reduced-motion:reduce){.yn-terazi .tz-toz2{display:none}}
.yn-terazi .tz-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.yn-terazi .tz-svg text{font-family:'Fredoka',sans-serif;font-weight:600}
.yn-terazi .tz-svg .lb{fill:#f6ead0;paint-order:stroke;stroke:rgba(0,0,0,.35);stroke-width:2px}
.yn-terazi .tz-svg .md{font-family:'Lilita One',sans-serif;font-weight:400;fill:#3a2404}
.yn-terazi .tz-svg .yk{font-family:'Lilita One',sans-serif;font-weight:400;fill:#3a2404}
.yn-terazi .tz-svg .yk tspan.u{font-family:'Fredoka',sans-serif;font-weight:600}
.yn-terazi .tz-svg .lv{font-family:'Barlow Condensed','Lilita One',sans-serif;font-style:italic;font-weight:900;letter-spacing:.12em;fill:#3a2404}
.yn-terazi .tz-agr{transition:filter .25s}
.yn-terazi .tz-agr.say{filter:drop-shadow(0 0 6px rgba(255,214,110,.95))}
.yn-terazi .tz-toz{opacity:0}
.yn-terazi .tz-toz.on{animation:tzToz .9s ease-out forwards}
.yn-terazi .tz-ibre.altin{filter:drop-shadow(0 0 6px rgba(255,214,90,1))}
.yn-terazi .tz-levha{opacity:0;transition:opacity .35s}
.yn-terazi.hukum .tz-levha{opacity:1}
.yn-terazi.hukum .tz-sus{opacity:0}
.yn-terazi.vur .tz-sahne{animation:tzVur .32s}
/* seçenekler: pirinç çerçeveli üç karo; cevapta tahmin sütunu olur (avatarlar etiketin altında) */
.yn-terazi .tz-sec{flex:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.yn-terazi .tz-o{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:58px;padding:6px 4px 7px;border:0;border-radius:12px;cursor:pointer;touch-action:manipulation;
  color:#2a1a04;background:linear-gradient(180deg,#fff7dc 0%,#f1d48a 55%,#d8a645 100%);box-shadow:inset 0 0 0 1.5px #7a5212,inset 0 2px 0 #fffbe8,0 4px 0 #6a440c,0 7px 14px rgba(0,0,0,.4);transition:transform .07s,filter .2s,opacity .25s}
.yn-terazi .tz-o>svg{width:38px;height:25px;flex:none}
.yn-terazi .tz-o b{font:italic 900 15px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.08em;white-space:nowrap}
.yn-terazi .tz-o:active{transform:translateY(3px);box-shadow:inset 0 0 0 1.5px #7a5212,0 1px 0 #6a440c}
.yn-terazi .tz-o.pick{color:#1a1200;background:linear-gradient(180deg,#fff2a8,#ffd23e 60%,#f0a812);box-shadow:inset 0 0 0 2px #fff,0 0 0 2.5px #ffb800,0 4px 0 #8a5a00,0 0 18px rgba(255,200,40,.6)}
.yn-terazi.secti .tz-o:not(.pick){opacity:.5;filter:saturate(.5)}
.yn-terazi .tz-o.gone{opacity:.22!important;pointer-events:none;filter:grayscale(1)}
.yn-terazi .tz-o .tz-pl{position:absolute;left:6px;right:6px;bottom:4px;height:4px;border-radius:2px;background:rgba(80,40,0,.18);overflow:hidden}
.yn-terazi .tz-o .tz-pl i{display:block;height:100%;width:calc(var(--p) * 1%);background:#ec4f93}
.yn-terazi .tz-o .tz-pq{display:block;height:25px;font:400 19px/25px 'Lilita One',sans-serif;text-decoration:none;color:#b02a6a}
.yn-terazi .tz-o.oy>svg{display:none}
.yn-terazi .tz-who{display:none;flex-wrap:wrap;justify-content:center;gap:4px;min-height:24px}
.yn-terazi.rv .tz-who{display:flex}
.yn-terazi.rv .tz-o{pointer-events:none;min-height:0;padding-top:5px}
.yn-terazi.rv .tz-o>svg{display:none}
/* position:static: ortak .fl-who+.fl-who{right:…} kuralları (göreli konumda yana kaydırırdı) hiç işlemez */
.yn-terazi .tz-who .fl-who{position:static;flex:none;width:24px;height:24px;margin:0;border-radius:7px;border:2px solid #fff;box-shadow:0 2px 0 rgba(0,0,0,.3);overflow:hidden}
.yn-terazi .tz-who .fl-who.me{box-shadow:0 0 0 2px #ffd25a,0 2px 0 rgba(0,0,0,.3)}
.yn-terazi .tz-who em{font:600 11px/24px 'Fredoka',sans-serif;font-style:normal;color:rgba(60,36,4,.6)}
.yn-terazi.hukum .tz-o.dogru{color:#fff;background:linear-gradient(180deg,#6af59a,#22b85a 60%,#128a40);box-shadow:inset 0 0 0 2px #e8fff0,0 4px 0 #0b5a28,0 0 20px rgba(62,224,122,.6);opacity:1;filter:none}
.yn-terazi.hukum .tz-o.dogru b{text-shadow:0 1px 0 rgba(0,60,20,.4)}
.yn-terazi.hukum .tz-o.dogru .ck{display:inline-block}
.yn-terazi .tz-o .ck{display:none;width:13px;height:13px;margin-right:3px;vertical-align:-1px}
.yn-terazi.hukum .tz-o:not(.dogru){opacity:.62;filter:saturate(.35) brightness(.85)}
.yn-terazi.hukum .tz-o.yanlis{box-shadow:inset 0 0 0 2px #e2392c,0 4px 0 #6a440c}
/* not: cevap açılınca yeri ayrılır (yerleşim oynamaz), yazı hükümle belirir (cevabı önceden söylemesin) */
.yn-terazi .tz-not{display:none;flex:none;align-items:flex-start;gap:8px;padding:7px 10px 8px;border-radius:8px;background:linear-gradient(180deg,#fbf3e0,#ece0c4);box-shadow:0 3px 0 rgba(0,0,0,.35);
  font:600 12.5px/1.3 'Fredoka',sans-serif;color:#2a1d0c;opacity:0;transition:opacity .5s .2s}
.yn-terazi .tz-not b{flex:none;padding:3px 6px 2px;border-radius:4px;background:#2a8a4a;color:#fff;font:italic 900 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.12em;transform:skewX(-8deg)}
.yn-terazi.rv .tz-not{display:flex}
.yn-terazi.hukum .tz-not{opacity:1}
@keyframes tzToz{0%{opacity:.85;transform:translateY(0) scale(.4)}100%{opacity:0;transform:translateY(-10px) scale(1.6)}}
@keyframes tzVur{25%{transform:translateY(3px)}60%{transform:translateY(-1px)}}
`;

// ---------------------------------------------------------------- sahne (SVG; ölçüler sahnenin kendi pikselleri)

/** Geometri: sahne boyuna göre (metin boyu sabit kalsın diye görüntü kutusu = sahne pikseli). */
function geom(W, H, nL, nR) {
	const pad = 6;
	const cx = W / 2;
	const maxP = Math.max(nL, nR, 1);
	const panW = clamp(Math.round(W * 0.38), 96, 140);
	const L = Math.min(W / 2 - panW / 2 - pad - 2, W * 0.34);
	const baseH = clamp(Math.round(H * 0.1), 15, 26);
	const finial = clamp(Math.round(H * 0.08), 12, 24);
	let ph = clamp(Math.round(H * 0.095), 16, 30);
	let tmax = 13;
	const yokeH = clamp(Math.round(ph * 0.82), 14, 20);
	const need = () => pad + finial + 4 + L * Math.sin(tmax * D2R) + 8 + yokeH + 5 + maxP * ph + 8 + 10 + baseH + 8;
	while (need() > H && tmax > 7) tmax -= 1;
	while (need() > H && ph > 13) ph -= 1;
	const extra = Math.max(0, H - need());
	const chainX = Math.min(extra * 0.3, 30);
	// boş kalan yükseklik: biraz zincire, çoğu kolun üstüne (terazi sahnenin ortasına iner), kalanı direğe
	let beamY = pad + finial + 4 + L * Math.sin(tmax * D2R) * 0.35 + Math.min((extra - chainX) * 0.42, 74);
	beamY = Math.max(pad + finial + 4, beamY);
	const chain = maxP * ph + 8 + chainX; // boyunduruk altından kefe kenarına
	const baseW = clamp(Math.round(W * 0.36), 92, 160);
	const fs = clamp(Math.round(ph * 0.58 * 10) / 10, 10, 15.5);
	return { W, H, pad, cx, panW, pw: panW - 10, L, baseH, baseW, finial, ph, tmax, yokeH, beamY, chain, fs, link: 8 };
}

function sceneSVG(v, G, id) {
	const { W, H, cx, beamY, L, baseH, baseW, finial, panW, pw, ph, yokeH, chain, fs, link } = G;
	const baseTop = H - baseH - 6;
	const def = `<defs>
		<linearGradient id="tzB${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".35" stop-color="#e9b84e"/><stop offset=".75" stop-color="#b07a1e"/><stop offset="1" stop-color="#6a440a"/></linearGradient>
		<linearGradient id="tzBv${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a5212"/><stop offset=".35" stop-color="#f6d27a"/><stop offset=".6" stop-color="#d9a23a"/><stop offset="1" stop-color="#6a440a"/></linearGradient>
		<radialGradient id="tzBr${id}" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#fff6d0"/><stop offset=".4" stop-color="#eab650"/><stop offset="1" stop-color="#6a440a"/></radialGradient>
		<linearGradient id="tzI${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a6272"/><stop offset=".18" stop-color="#3a404c"/><stop offset=".85" stop-color="#22262e"/><stop offset="1" stop-color="#16191f"/></linearGradient>
		<linearGradient id="tzW${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4a22"/><stop offset=".5" stop-color="#4e2c12"/><stop offset="1" stop-color="#2a170a"/></linearGradient>
		<linearGradient id="tzP${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8d98a"/><stop offset=".5" stop-color="#c88e2c"/><stop offset="1" stop-color="#6a440a"/></linearGradient>
	</defs>`;
	// kaide ve levha
	const lvW = Math.min(baseW - 22, 132);
	const lvH = Math.max(12, baseH - 6);
	const base = `<g class="tz-kaide">
		<ellipse cx="${cx}" cy="${H - 5}" rx="${baseW * 0.62}" ry="5" fill="#000" opacity=".45"/>
		<path d="M${cx - baseW / 2},${H - 6} L${cx - baseW / 2 + 6},${baseTop} H${cx + baseW / 2 - 6} L${cx + baseW / 2},${H - 6}Z" fill="url(#tzW${id})" stroke="#1a0e04" stroke-width="1.2"/>
		<rect x="${cx - baseW / 2 + 6}" y="${baseTop - 3}" width="${baseW - 12}" height="4" rx="2" fill="url(#tzB${id})"/>
		<path class="tz-sus" d="M${cx - 9},${baseTop + baseH / 2} q9,-6 18,0 q-9,6 -18,0z" fill="url(#tzB${id})" opacity=".85"/>
		<g class="tz-levha"><rect x="${cx - lvW / 2}" y="${baseTop + (baseH - lvH) / 2 - 0.5}" width="${lvW}" height="${lvH}" rx="3" fill="url(#tzB${id})" stroke="#5a3a08" stroke-width="1"/>
			<text class="lv" x="${cx}" y="${baseTop + baseH / 2 + Math.min(lvH, 16) * 0.33}" text-anchor="middle" font-size="${Math.min(13, lvH * 0.8).toFixed(1)}"></text></g>
	</g>`;
	// direk, gösterge yayı
	const colTop = beamY + 4;
	const dialR = Math.min(34, (baseTop - colTop) * 0.42);
	const ticks = [-24, -16, -8, 0, 8, 16, 24]
		.map((a) => {
			const r1 = dialR - (a === 0 ? 7 : 4);
			const x0 = cx + Math.sin(a * D2R) * dialR;
			const y0 = beamY + Math.cos(a * D2R) * dialR;
			const x1 = cx + Math.sin(a * D2R) * r1;
			const y1 = beamY + Math.cos(a * D2R) * r1;
			return `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${a === 0 ? '#fff1b8' : '#d9a23a'}" stroke-width="${a === 0 ? 2 : 1.3}"/>`;
		})
		.join('');
	const col = `<g class="tz-direk">
		<path d="M${cx - 7},${baseTop - 2} L${cx - 4.5},${colTop} H${cx + 4.5} L${cx + 7},${baseTop - 2}Z" fill="url(#tzBv${id})" stroke="#4a2e06" stroke-width="1"/>
		<path d="M${cx - 1.4},${colTop + 6} V${baseTop - 6}" stroke="rgba(255,250,220,.55)" stroke-width="1.2"/>
		${[0.32, 0.62].map((f) => `<rect x="${cx - 8}" y="${(colTop + (baseTop - colTop) * f).toFixed(1)}" width="16" height="4" rx="2" fill="url(#tzB${id})" stroke="#4a2e06" stroke-width=".8"/>`).join('')}
		<path d="M${cx - dialR * 0.45},${(beamY + dialR * 0.9).toFixed(1)} A${dialR},${dialR} 0 0 0 ${cx + dialR * 0.45},${(beamY + dialR * 0.9).toFixed(1)}" fill="none" stroke="rgba(255,214,120,.35)" stroke-width="5" stroke-linecap="round"/>
		${ticks}
	</g>`;
	// askı (kefe): yerel koordinat; köken kancada
	const hanger = (side, labels) => {
		const pY = link + yokeH + chain; // kefe ağzı
		const plates = labels
			.map((t, i) => {
				const y = pY - 1 - (i + 1) * ph;
				const mw = G.mw[side];
				const lx = -pw / 2 + 6;
				return `<g class="tz-agr" data-s="${side}" data-i="${i}">
					<rect x="${-pw / 2}" y="${y.toFixed(1)}" width="${pw}" height="${ph - 2}" rx="${Math.min(5, ph * 0.3)}" fill="url(#tzI${id})" stroke="#0d0f14" stroke-width="1"/>
					<rect x="${-pw / 2 + 2}" y="${(y + 1.5).toFixed(1)}" width="${pw - 4}" height="1.4" rx=".7" fill="rgba(255,255,255,.22)"/>
					<text class="lb" x="${lx.toFixed(1)}" y="${(y + (ph - 2) / 2 + fs * 0.36).toFixed(1)}" font-size="${fs}">${esc(t)}</text>
					<rect x="${(pw / 2 - mw - 3).toFixed(1)}" y="${(y + 2).toFixed(1)}" width="${mw}" height="${ph - 6}" rx="${((ph - 6) / 2).toFixed(1)}" fill="url(#tzBr${id})" stroke="#5a3a08" stroke-width=".9"/>
					<text class="md" x="${(pw / 2 - mw / 2 - 3).toFixed(1)}" y="${(y + (ph - 2) / 2 + fs * 0.4).toFixed(1)}" text-anchor="middle" font-size="${(fs + 0.5).toFixed(1)}">?</text>
				</g>`;
			})
			.join('');
		const yw = panW + 4;
		return `<g class="tz-ask" data-s="${side}">
			<path d="M0,0 V${link}" stroke="#c9952e" stroke-width="2.6" stroke-dasharray="3.2 1.6" stroke-linecap="round"/>
			<rect x="${-yw / 2}" y="${link}" width="${yw}" height="${yokeH}" rx="${yokeH / 2}" fill="url(#tzB${id})" stroke="#5a3a08" stroke-width="1"/>
			<text class="yk" x="0" y="${(link + yokeH / 2 + fs * 0.38).toFixed(1)}" text-anchor="middle" font-size="${(fs + 1).toFixed(1)}">?</text>
			${[-1, 1].map((s) => `<path d="M${s * (panW / 2 - 1)},${link + yokeH} V${pY}" stroke="#7a5212" stroke-width="2.8"/><path d="M${s * (panW / 2 - 1)},${link + yokeH + 1} V${pY}" stroke="#f0c45a" stroke-width="1.6" stroke-dasharray="2.6 1.8"/>`).join('')}
			${plates}
			<path d="M${-panW / 2 - 4},${pY} Q0,${pY + 22} ${panW / 2 + 4},${pY}Z" fill="url(#tzP${id})" stroke="#4a2e06" stroke-width="1.1"/>
			<ellipse cx="0" cy="${pY}" rx="${panW / 2 + 4}" ry="3.2" fill="#f6d27a" stroke="#6a440a" stroke-width="1"/>
			<g class="tz-toz">${[-0.36, -0.12, 0.12, 0.36].map((f, i) => `<circle cx="${(f * panW).toFixed(1)}" cy="${pY + 10}" r="${5 + (i % 2) * 2}" fill="#d8c8a8" opacity=".55"/>`).join('')}</g>
		</g>`;
	};
	// kol (dönen): uçlarda kanca halkası, ortada göbek, aşağı sarkan ibre
	const ex = L + 4;
	// kıvrım süsleri: kolun üstünde, uçlara doğru (pirinç sarmallar)
	const curl = (s) => {
		const x = cx + s * L * 0.62;
		const y = beamY - 4.5;
		return `<path d="M${x - s * 16},${y + 1} C${x - s * 10},${y - 9} ${x + s * 4},${y - 9} ${x + s * 4},${y - 3} C${x + s * 4},${y + 1} ${x - s * 2},${y + 1} ${x - s * 1.5},${y - 3}" fill="none" stroke="#6a440a" stroke-width="3.2" stroke-linecap="round"/><path d="M${x - s * 16},${y + 1} C${x - s * 10},${y - 9} ${x + s * 4},${y - 9} ${x + s * 4},${y - 3} C${x + s * 4},${y + 1} ${x - s * 2},${y + 1} ${x - s * 1.5},${y - 3}" fill="none" stroke="#f6d27a" stroke-width="1.6" stroke-linecap="round"/>`;
	};
	const beam = `<g class="tz-kol">
		${curl(-1)}${curl(1)}
		<path d="M${cx - ex},${beamY - 3.2} Q${cx - ex * 0.5},${beamY - 4.8} ${cx},${beamY - 7.2} Q${cx + ex * 0.5},${beamY - 4.8} ${cx + ex},${beamY - 3.2} V${beamY + 3.2} Q${cx + ex * 0.5},${beamY + 4.8} ${cx},${beamY + 7.2} Q${cx - ex * 0.5},${beamY + 4.8} ${cx - ex},${beamY + 3.2}Z" fill="url(#tzB${id})" stroke="#4a2e06" stroke-width="1.1"/>
		<path d="M${cx - ex + 4},${beamY - 1.4} Q${cx},${beamY - 4.6} ${cx + ex - 4},${beamY - 1.4}" fill="none" stroke="rgba(255,250,220,.55)" stroke-width="1.1"/>
		<path d="M${cx},${beamY - 12} L${cx + 9},${beamY} L${cx},${beamY + 12} L${cx - 9},${beamY}Z" fill="url(#tzB${id})" stroke="#4a2e06" stroke-width="1"/>
		${[-1, 1].map((s) => `<circle cx="${cx + s * L}" cy="${beamY}" r="5.4" fill="url(#tzBr${id})" stroke="#4a2e06" stroke-width="1"/><circle cx="${cx + s * (ex + 2)}" cy="${beamY}" r="3.2" fill="url(#tzBr${id})" stroke="#4a2e06" stroke-width=".9"/>`).join('')}
		<g class="tz-ibre"><path d="M${cx},${beamY + 6} L${cx - 2.6},${beamY + dialR - 10} L${cx},${beamY + dialR - 3} L${cx + 2.6},${beamY + dialR - 10}Z" fill="#fff1b8" stroke="#6a440a" stroke-width=".8"/></g>
		<circle cx="${cx}" cy="${beamY}" r="7.5" fill="url(#tzBr${id})" stroke="#4a2e06" stroke-width="1.2"/>
		<circle cx="${cx}" cy="${beamY}" r="2.4" fill="#4a2e06"/>
	</g>`;
	// tepe: çatal ve lale süs (kolun önünde)
	const tepe = `<g class="tz-tepe">
		<path d="M${cx - 6},${beamY + 9} V${beamY - 3} M${cx + 6},${beamY + 9} V${beamY - 3}" stroke="url(#tzBv${id})" stroke-width="3.2" stroke-linecap="round"/>
		<path d="M${cx},${beamY - 9} C${cx - finial * 0.42},${beamY - 9 - finial * 0.3} ${cx - finial * 0.3},${beamY - 9 - finial * 0.85} ${cx},${beamY - 9 - finial} C${cx + finial * 0.3},${beamY - 9 - finial * 0.85} ${cx + finial * 0.42},${beamY - 9 - finial * 0.3} ${cx},${beamY - 9}Z" fill="url(#tzB${id})" stroke="#4a2e06" stroke-width="1"/>
		<path d="M${cx},${beamY - 9} V${beamY - 3}" stroke="#4a2e06" stroke-width="2.4"/>
	</g>`;
	return `<svg class="tz-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">${def}${base}${col}${hanger(0, v.sol)}${hanger(1, v.sag)}${beam}${tepe}</svg>`;
}

// ---------------------------------------------------------------- tip

export const terazi = {
	time: 22,
	label: 'Terazi',
	kind: 'exact',
	cover: true, // tam ekran terazi (harita gizli)
	jokers: ['yari', 'kahin'],
	revealMs: 7600, // tahminler (0,6 sn), sayım (ağırlık başına 0,5 sn), devrilme (~2 sn), hükmün ardından 2 sn
	prepare(q) {
		const lv = q.sol.map((w) => Number(w[1]));
		const rv = q.sag.map((w) => Number(w[1]));
		const a = sum(lv);
		const b = sum(rv);
		const { sol, sag, tuzak, ...pub } = q;
		const v = { q: pub, sol: sol.map((w) => String(w[0])), sag: sag.map((w) => String(w[0])), vals: { l: lv, r: rv }, right: a > b ? 0 : a === b ? 1 : 2, tuzak: tuzak ?? null };
		return stamp(v, q, (q2, k, P, text) => {
			for (const t of [...v.sol, ...v.sag]) text(t);
			text(q.unit);
			for (const o of OPTS) text(o, 0.5); // seçenekler kısa: göz geçer
			const n = v.sol.length + v.sag.length;
			return {
				look: LOOK.orient + LOOK.gaze + n * LOOK.gaze + 3 * LOOK.gaze * 0.5,
				// her ağırlığın değerini hatırla ya da kestir, kefe başına topla, karşılaştır
				think: P.think[0] + P.think[1] * k + 0.6 * n + 0.8,
				act: ACT.tap,
			};
		});
	},
	mount(el, v, api) {
		css('yn-terazi', CSS);
		const app = appOf();
		const id = ++UID;
		const rm = rmq();
		const known = v.vals != null && v.right != null;
		el.innerHTML = `<div class="yn-terazi">
			<div class="tz-sahne"></div>
			<div class="tz-sec">${OPTS.map((o, i) => `<button class="tz-o" data-i="${i}" aria-label="${o}">${mini(i)}<b><span class="ck">${svgCheck}</span>${o}</b><span class="tz-who"></span></button>`).join('')}</div>
			${known && v.q.not ? `<div class="tz-not"><b>NOT</b><span>${esc(v.q.not)}</span></div>` : ''}
		</div>`;
		rule(el, 'Hangi kefe ağır basar?');
		const root = el.querySelector('.yn-terazi');
		const sahne = root.querySelector('.tz-sahne');
		const btns = [...root.querySelectorAll('.tz-o')];
		let done = false;
		let alive = true;
		let G = null;
		let svg = null;
		let parts = null;
		const timers = new Set();
		const wait = (ms) =>
			new Promise((res) => {
				const t = setTimeout(() => {
					timers.delete(t);
					res();
				}, rm ? Math.min(ms, 80) : ms);
				timers.add(t);
			});
		// fizik durumu: kol açısı (derece, artı = sağ aşağı), askıların sarkaç açıları
		const S = { th: 0, w: 0, target: 0, mode: 'tremble', amp: 0.9, phL: 0, wL: 0, phR: 0, wR: 0, t0: clock.now(), hit: false, K: 26, C: 2.4 };
		const valsShown = { l: v.sol.map(() => null), r: v.sag.map(() => null) };
		let sumsShown = false; // toplamlar askıda (yeniden kurulursa korunur)

		// ------------------------------------------------ çizim
		const build = () => {
			const W = Math.round(sahne.clientWidth);
			const H = Math.round(sahne.clientHeight);
			if (W < 40 || H < 40) return;
			if (G && G.W === W && G.H === H) return;
			G = geom(W, H, v.sol.length, v.sag.length);
			// madalyon genişliği: o kefenin en uzun değeri sığsın (cevaptan önce de aynı: kutular oynamaz)
			const width = (side) => {
				const vals = side ? v.vals?.r : v.vals?.l;
				const chars = vals ? Math.max(...vals.map((x) => fmtV(x).length)) : 3;
				return clamp(Math.round(chars * (G.fs + 0.5) * 0.53 + 10), 22, 56);
			};
			G.mw = [width(0), width(1)];
			sahne.innerHTML = `<i class="tz-isik"></i><i class="tz-toz2">${Array.from({ length: 9 }, (_, i) => `<b style="--x:${(12 + ((i * 37) % 76)).toFixed(0)}%;--y:${(8 + ((i * 53) % 60)).toFixed(0)}%;--d:${(5 + (i % 4) * 1.7).toFixed(1)}s;--z:${(-i * 0.9).toFixed(1)}s"></b>`).join('')}</i>${sceneSVG(v, G, id)}`;
			svg = sahne.querySelector('svg');
			parts = {
				kol: svg.querySelector('.tz-kol'),
				ask: [...svg.querySelectorAll('.tz-ask')],
				ibre: svg.querySelector('.tz-ibre'),
				lv: svg.querySelector('.tz-levha text'),
				yk: [...svg.querySelectorAll('.tz-ask .yk')],
				plates: [0, 1].map((s) => [...svg.querySelectorAll(`.tz-agr[data-s="${s}"]`)]),
			};
			// etiketler sığsın: madalyonun soluna kadar (uzun etikette yazı küçülür, gerekirse sıkışır)
			for (const s of [0, 1]) {
				for (const g of parts.plates[s]) {
					const t = g.querySelector('.lb');
					const max = G.pw - G.mw[s] - 13;
					let fsz = G.fs;
					for (let i = 0; i < 10 && t.getComputedTextLength() > max && fsz > 8.5; i++) t.setAttribute('font-size', (fsz -= 0.5).toFixed(1));
					if (t.getComputedTextLength() > max) {
						t.setAttribute('textLength', String(max));
						t.setAttribute('lengthAdjust', 'spacingAndGlyphs');
					}
				}
			}
			// cevap sırasında yeniden kurulursa sayılmış değerler korunur
			for (const s of [0, 1])
				parts.plates[s].forEach((g, i) => {
					const x = valsShown[s ? 'r' : 'l'][i];
					if (x != null) g.querySelector('.md').textContent = fmtV(x);
				});
			if (sumsShown) showSums(true);
			if (root.classList.contains('hukum')) {
				parts.lv.textContent = OPTS[v.right];
				if (v.right === 1) parts.ibre?.classList.add('altin');
			}
			pose();
		};
		/** Kol ve askıları o anki açılara koy. */
		const pose = () => {
			if (!parts) return;
			const { cx, beamY, L } = G;
			parts.kol.setAttribute('transform', `rotate(${S.th.toFixed(3)} ${cx} ${beamY})`);
			const a = S.th * D2R;
			const hx = (s) => cx + s * L * Math.cos(a);
			const hy = (s) => beamY + s * L * Math.sin(a);
			parts.ask[0].setAttribute('transform', `translate(${hx(-1).toFixed(2)} ${hy(-1).toFixed(2)}) rotate(${S.phL.toFixed(3)})`);
			parts.ask[1].setAttribute('transform', `translate(${hx(1).toFixed(2)} ${hy(1).toFixed(2)}) rotate(${S.phR.toFixed(3)})`);
		};
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => build()) : null;
		ro?.observe(sahne);
		build();
		document.fonts?.ready?.then(() => {
			if (!alive) return;
			G = null;
			build();
		});

		// ------------------------------------------------ fizik ve titreme (kare döngüsü)
		let raf = 0;
		let lastT = clock.now();
		let skip = 0;
		/** Bir fizik adımı (h sn): kol yayla hedefe, dayanakta seker; askılar kolun ivmesiyle sarkaç gibi sallanır. */
		const phys = (h) => {
			const prevW = S.w;
			S.w += (S.K * (S.target - S.th) - S.C * S.w) * h;
			S.th += S.w * h;
			const lim = G?.tmax ?? 12;
			if (Math.abs(S.th) > lim) {
				// dayanağa vurdu: seker, ilk vuruşta tok ses ve toz
				S.th = Math.sign(S.th) * lim;
				const imp = Math.abs(S.w);
				S.w = -S.w * 0.3;
				if (!S.hit && imp > 4) {
					S.hit = true;
					thud(S.th > 0 ? 1 : 0, imp);
				}
			}
			const alpha = (S.w - prevW) / h; // açısal ivme
			S.wL += (-22 * S.phL - 1.5 * S.wL + 0.045 * alpha) * h;
			S.wR += (-22 * S.phR - 1.5 * S.wR - 0.045 * alpha) * h;
			S.phL += S.wL * h;
			S.phR += S.wR * h;
			// durdu mu: denge ortada sakinleşti ya da kol dayanağa yaslandı; askılar da durulmuş
			const still = S.target === 0 ? Math.abs(S.th) < 0.15 && Math.abs(S.w) < 0.8 : Math.abs(S.th) >= lim - 0.02 && Math.abs(S.w) < 0.6;
			if (still && Math.abs(S.wL) + Math.abs(S.wR) < 0.6 && Math.abs(S.phL) + Math.abs(S.phR) < 0.25) {
				S.th = S.target === 0 ? 0 : Math.sign(S.th) * lim;
				S.phL = S.phR = 0;
				S.mode = 'rest';
				pose();
				settled?.();
			}
		};
		const loop = () => {
			raf = 0;
			if (!alive || !root.isConnected) return;
			const now = clock.now();
			// geç gelen karede fizik alt adımlarla yetişir (yavaş cihazda da film gerçek sürede oynar)
			let rem = Math.min(0.3, Math.max(0.001, (now - lastT) / 1000));
			lastT = now;
			if (S.mode === 'free') {
				while (rem > 1e-4 && S.mode === 'free') {
					const h = Math.min(1 / 90, rem);
					rem -= h;
					phys(h);
				}
				pose();
			} else if (S.mode === 'tremble') {
				// cevaptan önce: kararsız titreme (iki dalganın toplamı), kefeler hafifçe salınır; mobilde 30 kare yeter
				if (++skip % 2 === 0 || rm) {
					const t = (now - S.t0) / 1000;
					const A = rm ? 0 : S.amp;
					S.th = A * (0.62 * Math.sin(t * 5.4) + 0.38 * Math.sin(t * 13.1 + 1.1));
					S.phL = A * 0.9 * Math.sin(t * 3.1 + 0.4);
					S.phR = A * 0.9 * Math.sin(t * 3.3 + 2.1);
					pose();
				}
			}
			if (S.mode !== 'rest') raf = requestAnimationFrame(loop);
		};
		const wake = () => {
			if (raf || !alive) return;
			lastT = clock.now();
			raf = requestAnimationFrame(loop);
		};
		wake();
		let settled = null;
		const thud = (side, imp) => {
			sfx(app, 'tower', { soft: true });
			buzz(Math.min(60, 18 + imp * 2));
			const toz = svg?.querySelectorAll('.tz-toz')[side];
			if (toz) {
				toz.classList.remove('on');
				void toz.getBoundingClientRect();
				toz.classList.add('on');
			}
			root.classList.remove('vur');
			void root.offsetWidth;
			root.classList.add('vur');
		};

		// ------------------------------------------------ seçim
		root.querySelector('.tz-sec').addEventListener('click', (e) => {
			const b = e.target.closest('.tz-o');
			if (!b || done || b.classList.contains('gone')) return;
			done = true;
			b.classList.add('pick');
			root.classList.add('secti');
			S.amp = 1.5; // bekleyiş: kol biraz daha titrer
			sfx(app, 'tap');
			buzz(8);
			api.answer(Number(b.dataset.i));
		});

		// ------------------------------------------------ cevap: sayım, devrilme, hüküm
		const showSums = (instant = false) => {
			sumsShown = true;
			if (!parts) return;
			[v.vals.l, v.vals.r].forEach((vals, s) => {
				const t = parts.yk[s];
				const u = v.q.unit ? `<tspan class="u" font-size="${(G.fs - 1).toFixed(1)}"> ${esc(v.q.unit)}</tspan>` : '';
				t.innerHTML = `${fmtV(sum(vals))}${u}`;
				if (!instant) {
					t.animate?.([{ opacity: 0.2 }, { opacity: 1 }], { duration: 280 });
				}
			});
		};
		const countSide = async (s) => {
			const vals = s ? v.vals.r : v.vals.l;
			for (let i = 0; i < vals.length; i++) {
				if (!alive) return;
				const g = parts?.plates[s][i];
				const t = g?.querySelector('.md');
				g?.classList.add('say');
				const to = vals[i];
				const ms = rm ? 60 : 430;
				const t0 = clock.now();
				let n = 0;
				await new Promise((res) => {
					const st = () => {
						if (!alive) return res();
						const k = Math.min(1, (clock.now() - t0) / ms);
						const e = 1 - Math.pow(1 - k, 3);
						const x = to * e;
						valsShown[s ? 'r' : 'l'][i] = x;
						const tt = parts?.plates[s][i]?.querySelector('.md');
						if (tt) tt.textContent = fmtV(x);
						if (k * 8 > n) {
							n++;
							sfx(app, 'bzCount', { n: Math.min(20, i * 6 + n) });
						}
						if (k < 1) requestAnimationFrame(st);
						else res();
					};
					requestAnimationFrame(st);
				});
				valsShown[s ? 'r' : 'l'][i] = to;
				if (t?.isConnected) t.textContent = fmtV(to);
				await wait(90);
				parts?.plates[s][i]?.classList.remove('say');
			}
		};
		const release = () =>
			new Promise((res) => {
				const a = sum(v.vals.l);
				const b = sum(v.vals.r);
				const lim = G?.tmax ?? 12;
				S.mode = 'free';
				S.hit = false;
				S.w = 0;
				if (v.right === 1) {
					// denge: bir sola bir sağa yalpalar, tam ortada durur (~2 sn)
					S.target = 0;
					S.K = 20;
					S.C = 3.2;
					S.w = (S.th >= 0 ? -1 : 1) * 34;
				} else {
					const rel = Math.abs(a - b) / Math.max(1, Math.abs(a), Math.abs(b));
					S.target = (v.right === 2 ? 1 : -1) * (lim + 4); // dayanağın ötesine çeker: vurur, orada kalır
					S.K = 14 + 40 * clamp(rel * 3, 0.15, 1); // fark büyükse hızla, küçükse ağır ağır
					S.C = 2.2;
				}
				settled = () => {
					settled = null;
					// son duruş (fizik kendiliğinden durduysa zaten burada; güvenlik zamanlayıcısında buraya oturtulur)
					S.mode = 'rest';
					S.th = v.right === 1 ? 0 : Math.sign(S.target) * lim;
					S.w = S.wL = S.wR = S.phL = S.phR = 0;
					pose();
					res();
				};
				sfx(app, 'whoosh');
				wake();
				setTimeout(() => settled?.(), 4200); // güvenlik: kare gelmezse (arka plan sekmesi) film yine biter
			});

		onClose(el, cleanup); // kart kapanınca: kare döngüsü, zamanlayıcılar, gözlemciler durur
		return {
			lock() {
				done = true;
			},
			joker(e) {
				if (!e) return;
				if (Number.isInteger(e.hide) && btns[e.hide]) {
					btns[e.hide].classList.add('gone');
					btns[e.hide].disabled = true;
					app?.ui?.toast?.(`Yanlış bir seçenek elendi: ${OPTS[e.hide]}`, { tone: 'good', ms: 1800 });
				}
				if (Array.isArray(e.pct)) {
					// oy yüzdesi simgenin yerine geçer (etiketin üstüne binmez), altta pembe çubuk
					btns.forEach((b, i) => {
						b.classList.add('oy');
						b.insertAdjacentHTML('afterbegin', `<s class="tz-pq">%${e.pct[i]}</s>`);
						b.insertAdjacentHTML('beforeend', `<span class="tz-pl" style="--p:${e.pct[i]}"><i></i></span>`);
					});
					app?.ui?.toast?.('Seyirci oyunu verdi', { tone: 'good', ms: 1800 });
				}
			},
			reveal(results) {
				done = true;
				root.classList.add('rv');
				for (const b of btns) b.querySelectorAll('.tz-pl,.tz-pq').forEach((x) => x.remove());
				// herkesin tahmini kendi sütununda (arayüz işaretleri hemen portreye çevirir)
				const cols = [[], [], []];
				for (const r of results) if (Number.isInteger(r.value) && cols[r.value]) cols[r.value].push(r);
				cols.forEach((list, i) => {
					const w = btns[i].querySelector('.tz-who');
					w.innerHTML = list.length ? list.map((r) => `<b class="fl-who${r.p?.human ? ' me' : ''}" style="background:${esc(r.color)}"></b>`).join('') : '<em>kimse</em>';
				});
				const me = results.find((r) => r.p?.human);
				if (!known) return;
				const run = async () => {
					S.amp = 1.6;
					await wait(650);
					await countSide(0);
					await wait(180);
					await countSide(1);
					if (!alive) return;
					showSums();
					sfx(app, 'kmDrop', { n: 3 });
					await wait(520);
					if (!alive) return;
					await release();
					if (!alive) return;
					// hüküm
					if (v.right === 1) {
						parts?.ibre?.classList.add('altin');
						sfx(app, 'star', { n: 2 });
					}
					if (parts?.lv) parts.lv.textContent = OPTS[v.right];
					root.classList.add('hukum');
					btns.forEach((b, i) => {
						b.classList.toggle('dogru', i === v.right);
						b.classList.toggle('yanlis', i !== v.right && cols[i].length > 0);
					});
					const f = app?.ui?.fx;
					if (f && btns[v.right]?.isConnected) {
						const r = btns[v.right].getBoundingClientRect();
						f.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 14, dist: 70, colors: ['#7dff9a', '#fff', '#ffd25a'], kind: 'star', size: 11 });
					}
					const a = sum(v.vals.l);
					const b = sum(v.vals.r);
					const det = `${fmtV(a)} – ${fmtV(b)}`;
					if (me && app) {
						if (me.correct) stampLater(app, v.right === 1 ? 'TAM DENGE!' : 'BİLDİN!', 'gold', `${OPTS[v.right]} · ${det}`);
						else if (me.value != null) stampLater(app, 'YANILDIN', 'bad', `${OPTS[v.right]} · ${det}`);
						else stampLater(app, 'SÜRE DOLDU', 'warn', `${OPTS[v.right]} · ${det}`);
					}
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
			ro?.disconnect();
		}
	},
	joker(id, v, R) {
		const wrong = [0, 1, 2].filter((i) => i !== v.right);
		if (id === 'yari') {
			// sezginin tuzağı kalır (asıl ikilem), öbür yanlış elenir
			const keep = v.tuzak != null && v.tuzak !== v.right ? v.tuzak : wrong[Math.floor(R() * 2)];
			return { hide: wrong.find((i) => i !== keep) };
		}
		if (id === 'kahin') {
			// seyirci çoğunlukla bilir (zorlukla azalır); kalan oyların çoğu tuzağa gider
			const pr = Math.round(100 * clamp(0.74 - 0.08 * (v.q.diff || 2) + (R() - 0.5) * 0.1, 0.45, 0.82));
			const trap = v.tuzak != null && v.tuzak !== v.right ? v.tuzak : wrong[0];
			const other = wrong.find((i) => i !== trap);
			const pct = [0, 0, 0];
			pct[v.right] = pr; // doğru her zaman en çok oyu alır; zor soruda tuzak yakından izler
			pct[trap] = Math.round((100 - pr) * (0.55 + R() * 0.2));
			pct[other] = 100 - pr - pct[trap];
			return { pct };
		}
		return null;
	},
	/** Çevrimiçi görünüm: yalnız etiketler; değerler, toplamlar ve hüküm cevapta gelir. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.vals;
		delete o.right;
		delete o.tuzak;
		delete o.q.not;
		return o;
	},
	judge(v, value) {
		const ok = Number.isInteger(value) && value === v.right;
		return { correct: ok, err: ok ? 0 : 1 };
	},
	bot(v, skill, R) {
		const ok = R() < Math.min(0.96, pCorrect(skill, v.q.diff) + 0.06);
		let value = v.right;
		if (!ok) {
			const wrong = [0, 1, 2].filter((i) => i !== v.right);
			// yanılan çoğunlukla sezgiye kanar
			value = v.tuzak != null && v.tuzak !== v.right && R() < 0.72 ? v.tuzak : wrong[Math.floor(R() * 2)];
		}
		return { value, time: botTime(v, R, skill, 0.05, 0.85) };
	},
	/** Sınama örneği (test/deneme.test.mjs). */
	ornek(v) {
		return { good: v.right, bad: (v.right + 1) % 3 };
	},
};
