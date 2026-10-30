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

// sahne (viewBox 360×150): yer çizgisi, mancınık, eksen
const W = 360;
const GY = 128; // yer
const X0 = 84; // eksenin başı (min)
const X1 = 346; // eksenin sonu (max)
const PIV = { x: 42, y: 92 }; // kolun mili
const ARM = 46;
const WALL_H = 42;

const CSS = /* css */ `
.dn-mc{display:flex;flex-direction:column;gap:8px;user-select:none;-webkit-user-select:none}
.dn-mc-scene{position:relative;border-radius:16px;overflow:hidden;background:linear-gradient(180deg,#0b1a44 0%,#16306a 62%,#1d3b72 100%);border:2.5px solid rgba(255,255,255,.22);box-shadow:inset 0 -10px 24px rgba(0,0,0,.35)}
.dn-mc-scene svg{display:block;width:100%;height:auto}
.dn-mc-val{position:absolute;left:50%;top:6px;transform:translateX(-50%);display:flex;align-items:baseline;gap:5px;padding:1px 12px 3px;border-radius:12px;background:rgba(6,14,38,.72);border:2px solid rgba(255,210,90,.55);white-space:nowrap}
.dn-mc-val b{font-family:'Lilita One';font-weight:400;font-size:30px;line-height:1.05;color:var(--gold);text-shadow:0 2px 0 #3a2000}
.dn-mc-val small{font-size:14px;color:#fff;opacity:.9}
.dn-mc-msg{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%) scale(.6);font-family:'Lilita One';font-size:30px;letter-spacing:.03em;color:#fff;opacity:0;pointer-events:none;white-space:nowrap;
  text-shadow:0 3px 0 rgba(0,0,0,.55),0 0 18px rgba(0,0,0,.5);transition:opacity .2s,transform .35s cubic-bezier(.3,1.7,.5,1)}
.dn-mc-msg.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
.dn-mc-msg.good{color:#7dff9a}.dn-mc-msg.gold{color:#ffd25a}.dn-mc-msg.bad{color:#ff6a5a}.dn-mc-msg.cold{color:#bfe3ff}
.dn-mc-msg small{display:block;text-align:center;font-family:'Fredoka';font-weight:600;font-size:13px;letter-spacing:0;color:#fff;opacity:.9}
.dn-mc .fl-range{height:34px}
.dn-mc-row{display:flex;gap:6px}
.dn-mc-row .fl-step{flex:1;min-width:0;padding:7px 4px 8px;font-size:16px}
.dn-mc .fl-send{height:50px;padding:0 16px}
.dn-mc.sent .fl-range,.dn-mc.sent .dn-mc-row{opacity:.35;pointer-events:none}
.dn-mc.sent .fl-send{opacity:.5;pointer-events:none}
.dn-mc.done .dn-mc-val{opacity:0;transition:opacity .4s}
.dn-mc.done .fl-range,.dn-mc.done .dn-mc-row,.dn-mc.done .fl-send{display:none}
.dn-mc .fog{animation:dnMcFog 6s ease-in-out infinite alternate}
.dn-mc .fog2{animation-duration:8s;animation-direction:alternate-reverse}
.dn-mc .fogs{transition:opacity 1s}
.dn-mc .fogs.off{opacity:0}
.dn-mc .wall{transition:transform .7s cubic-bezier(.3,1.5,.5,1),opacity .3s}
.dn-mc .wall.hide{opacity:0;transform:translateY(${WALL_H + 6}px)}
.dn-mc .wall.hit{animation:dnMcHit .4s}
.dn-mc .arm{transition:transform .25s ease-out}
.dn-mc .arm.fire{transition:transform .2s cubic-bezier(.6,0,.9,.4)}
.dn-mc .pv{transition:opacity .2s}
.dn-mc.sent .pv{opacity:0}
.dn-mc .narrow{opacity:0;transition:opacity .3s}
.dn-mc .narrow.on{opacity:1}
.dn-mc .crowd{opacity:0;transition:opacity .3s}
.dn-mc .crowd.on{opacity:1}
.dn-mc .lt{font-family:'Lilita One';font-size:11px;paint-order:stroke;stroke:#0a1534;stroke-width:3px}
.dn-mc .tk{font-family:'Fredoka';font-weight:600;font-size:9px;fill:#cfe0ff;opacity:.8}
.dn-mc .dust{animation:dnMcDust .6s ease-out forwards}
@keyframes dnMcFog{to{transform:translateX(-14px)}}
@keyframes dnMcHit{30%{transform:translateX(3px)}60%{transform:translateX(-2px)}}
@keyframes dnMcDust{from{opacity:.9;transform:scale(.3)}to{opacity:0;transform:scale(1.6)}}
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
	const cy = REL.y - 34 - 46 * f;
	return { x0: REL.x, y0: REL.y, cx: (REL.x + ex) / 2 + 8, cy, x1: ex, y1: GY - 4 };
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
const WOOD_D = '#5a3214';
function sceneSVG(v) {
	const ticks = [0, 0.25, 0.5, 0.75, 1]
		.map((f) => {
			const x = X0 + f * (X1 - X0);
			const val = v.q.min + f * (v.q.max - v.q.min);
			return `<line x1="${x}" y1="${GY + 2}" x2="${x}" y2="${GY + 6}" stroke="#cfe0ff" stroke-opacity=".6" stroke-width="1.2"/><text class="tk" x="${x}" y="${GY + 16}" text-anchor="${f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}">${esc(short(v, val))}</text>`;
		})
		.join('');
	const stars = Array.from({ length: 14 }, (_, i) => `<circle cx="${(i * 97) % 350 + 6}" cy="${(i * 53) % 52 + 6}" r="${i % 3 ? 0.8 : 1.2}" fill="#fff" opacity="${0.25 + (i % 4) * 0.12}"/>`).join('');
	return `<svg viewBox="0 0 ${W} 150" aria-hidden="true">
		<defs>
			<linearGradient id="dnMcG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a7a3a"/><stop offset="1" stop-color="#2a4a22"/></linearGradient>
			<linearGradient id="dnMcS" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9d2c2"/><stop offset="1" stop-color="#8f8676"/></linearGradient>
			<radialGradient id="dnMcR" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#e8e2d6"/><stop offset="1" stop-color="#6d6458"/></radialGradient>
			<filter id="dnMcB" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="5"/></filter>
		</defs>
		${stars}
		<path d="M0,${GY - 18} C40,${GY - 34} 90,${GY - 22} 130,${GY - 30} S220,${GY - 40} 260,${GY - 26} S330,${GY - 36} ${W},${GY - 24} L${W},${GY} L0,${GY}Z" fill="#14285a" opacity=".85"/>
		<rect x="0" y="${GY}" width="${W}" height="${150 - GY}" fill="url(#dnMcG)"/>
		<rect x="0" y="${GY}" width="${W}" height="2.5" fill="#7fb860" opacity=".7"/>
		<rect class="narrow" x="${X0}" y="${GY - 1}" width="0" height="5" rx="2.5" fill="#5ec8ff"/>
		${ticks}
		<g class="fogs">
			<ellipse class="fog" cx="150" cy="${GY - 16}" rx="80" ry="22" fill="#cfe0ff" opacity=".2" filter="url(#dnMcB)"/>
			<ellipse class="fog fog2" cx="250" cy="${GY - 22}" rx="90" ry="26" fill="#cfe0ff" opacity=".24" filter="url(#dnMcB)"/>
			<ellipse class="fog" cx="320" cy="${GY - 12}" rx="60" ry="20" fill="#cfe0ff" opacity=".2" filter="url(#dnMcB)"/>
			<text x="${(X0 + X1) / 2 + 20}" y="${GY - 20}" text-anchor="middle" font-family="Lilita One" font-size="13" fill="#e6efff" opacity=".55" letter-spacing="2">SUR SİSTE · AŞMA!</text>
		</g>
		<g class="wall hide"></g>
		<g class="pv"><path class="pvarc" d="" fill="none" stroke="#ffd25a" stroke-width="1.6" stroke-dasharray="3 4" stroke-linecap="round" opacity=".85"/>
			<g class="pvmk"><line x1="0" y1="${GY - 20}" x2="0" y2="${GY}" stroke="#ffd25a" stroke-width="1.6"/><path d="M0,${GY - 20} l10,4 -10,4z" fill="#ffd25a"/><circle cx="0" cy="${GY}" r="3" fill="#ffd25a"/></g></g>
		<g class="crowd"><line class="cl" x1="0" y1="${GY - 26}" x2="0" y2="${GY}" stroke="#c78bff" stroke-width="1.6" stroke-dasharray="2 2"/><text class="lt ct" x="0" y="${GY - 29}" text-anchor="middle" fill="#e2c8ff">seyirci</text></g>
		<g class="stones"></g>
		<g class="cat">
			<ellipse cx="${PIV.x}" cy="${GY + 1}" rx="40" ry="4" fill="#000" opacity=".3"/>
			<rect x="${PIV.x - 32}" y="${GY - 16}" width="64" height="8" rx="2" fill="${WOOD}" stroke="${WOOD_D}" stroke-width="1.5"/>
			<path d="M${PIV.x - 14},${GY - 14} L${PIV.x},${PIV.y} L${PIV.x + 14},${GY - 14}" fill="none" stroke="${WOOD}" stroke-width="5" stroke-linejoin="round"/>
			<path d="M${PIV.x - 14},${GY - 14} L${PIV.x},${PIV.y} L${PIV.x + 14},${GY - 14}" fill="none" stroke="${WOOD_D}" stroke-width="1.2" stroke-linejoin="round" opacity=".6"/>
			<line x1="${PIV.x + 16}" y1="${GY - 14}" x2="${PIV.x + 24}" y2="${PIV.y + 6}" stroke="${WOOD}" stroke-width="3.5" stroke-linecap="round"/>
			<rect x="${PIV.x + 20}" y="${PIV.y + 2}" width="10" height="5" rx="1.5" fill="#8a4a1a"/>
			<g class="arm" style="transform-origin:${PIV.x}px ${PIV.y}px">
				<line x1="${PIV.x - 10}" y1="${PIV.y}" x2="${PIV.x + ARM}" y2="${PIV.y}" stroke="${WOOD}" stroke-width="5" stroke-linecap="round"/>
				<line x1="${PIV.x - 10}" y1="${PIV.y}" x2="${PIV.x + ARM}" y2="${PIV.y}" stroke="${WOOD_D}" stroke-width="1" opacity=".5"/>
				<path d="M${PIV.x + ARM - 8},${PIV.y - 2} q8,10 16,0" fill="#6b3a16" stroke="${WOOD_D}" stroke-width="1.4"/>
				<circle class="ammo" cx="${PIV.x + ARM}" cy="${PIV.y - 5}" r="5.2" fill="url(#dnMcR)" stroke="#3a342c" stroke-width="1"/>
				<rect x="${PIV.x - 18}" y="${PIV.y - 6}" width="12" height="12" rx="2" fill="#5a5a66" stroke="#2a2a34" stroke-width="1.2"/>
			</g>
			<circle cx="${PIV.x}" cy="${PIV.y}" r="3.4" fill="#ffd25a" stroke="${WOOD_D}" stroke-width="1.2"/>
			${[-22, 22].map((dx) => `<g transform="translate(${PIV.x + dx},${GY - 6})"><circle r="8.5" fill="${WOOD_D}"/><circle r="6.5" fill="${WOOD}"/><path d="M-6.5,0H6.5M0,-6.5V6.5" stroke="${WOOD_D}" stroke-width="1.6"/><circle r="2" fill="#ffd25a"/></g>`).join('')}
		</g>
	</svg>`;
}
function wallSVG(v, wx) {
	const top = GY - WALL_H;
	const bricks = [];
	for (let r = 0; r < 6; r++) {
		const y = top + 6 + r * 6.4;
		bricks.push(`<line x1="${wx - 12}" y1="${y}" x2="${wx + 12}" y2="${y}" stroke="#6a6154" stroke-width=".8"/>`);
		for (let c = -1; c <= 1; c++) {
			const x = wx + c * 8 + (r % 2 ? 4 : 0);
			if (x > wx - 12 && x < wx + 12) bricks.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 6.4}" stroke="#6a6154" stroke-width=".8"/>`);
		}
	}
	const merl = [-12, -4, 4].map((dx) => `<rect x="${wx + dx}" y="${top - 6}" width="8" height="7" fill="url(#dnMcS)" stroke="#4a4338" stroke-width="1"/>`).join('');
	return `<rect x="${wx - 12}" y="${top}" width="24" height="${WALL_H}" fill="url(#dnMcS)" stroke="#4a4338" stroke-width="1.4"/>${bricks.join('')}${merl}
		<path d="M${wx - 4},${GY} v-10 a4,4 0 0 1 8,0 v10z" fill="#2a2018"/>
		<line x1="${wx}" y1="${top - 6}" x2="${wx}" y2="${top - 24}" stroke="#d9d2c2" stroke-width="1.4"/><path d="M${wx},${top - 24} l13,4 -13,4z" fill="#e8343c"/>
		<text class="lt" x="${wx}" y="${top - 28}" text-anchor="middle" fill="#7dff9a">${esc(fmtOf(v)(v.hedef))}</text>`;
}

export const mancinik = {
	time: 22,
	label: 'Mancınık',
	kind: 'closest',
	keep: true,
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
			<div class="dn-mc-scene">${sceneSVG(v)}<div class="dn-mc-val"><b data-r="val">${fmt(mid)}</b><small>${esc(q.unit || '')}</small></div><div class="dn-mc-msg"></div></div>
			<input class="fl-range" type="range" min="${q.min}" max="${q.max}" step="1" value="${mid}" aria-label="mancınığın gücü">
			<div class="dn-mc-row">
				<button class="fl-step" data-d="${-S.big}">−${stepLabel(S.big)}</button><button class="fl-step" data-d="${-S.fine}">−${stepLabel(S.fine)}</button>
				<button class="fl-step" data-d="${S.fine}">+${stepLabel(S.fine)}</button><button class="fl-step" data-d="${S.big}">+${stepLabel(S.big)}</button>
			</div>
			<button class="fl-send">FIRLAT!</button>
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
		const msg = root.querySelector('.dn-mc-msg');
		let lo = q.min;
		let hi = q.max;
		let done = false;
		let mine = null; // gönderilen değer
		let myThrow = null; // kendi atışım: { known, landed, next }
		const anims = new Set();
		const pose = (x) => {
			// kol gerilir: güç arttıkça kepçe yere iner (180° sola, 150° sol-aşağı)
			const f = (x - q.min) / (q.max - q.min || 1);
			arm.style.transform = `rotate(${(198 - 52 * f).toFixed(1)}deg)`;
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
			svg.querySelector('.fogs').classList.add('off');
			requestAnimationFrame(() => wall.classList.remove('hide'));
		};
		const wallX = () => (v.hedef == null ? null : xOf(v, v.hedef));
		/** Bir taşı at: renk, değer; bitince onLand(x). Kolu (yalnız kendi atışında) savurur. */
		const throwStone = (value, color, { swing = false, delay = 0, label = '', onLand } = {}) => {
			const ex = landX(v, value, wallX());
			const a = arc(ex);
			const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			g.innerHTML = `<path d="${pathOf(a)}" fill="none" stroke="${color}" stroke-width="1.4" stroke-dasharray="2 3" opacity="0" class="trail"/><circle r="5.2" fill="url(#dnMcR)" stroke="${color}" stroke-width="2"/>`;
			const ball = g.lastChild;
			const trail = g.firstChild;
			g.style.opacity = '0';
			stones.appendChild(g);
			const go = () => {
				if (swing) {
					arm.classList.add('fire');
					arm.style.transform = 'rotate(282deg)';
					ammo.style.opacity = '0';
					sfx(app, 'catapult');
					buzz(18);
				} else sfx(app, 'whoosh');
				const t0 = performance.now();
				const dur = 700 + 450 * ((ex - REL.x) / (X1 - REL.x));
				g.style.opacity = '1';
				const step = () => {
					if (!g.isConnected) return anims.delete(step);
					const t = Math.min(1, (performance.now() - t0) / dur);
					const p = at(a, t);
					ball.setAttribute('cx', p.x.toFixed(1));
					ball.setAttribute('cy', p.y.toFixed(1));
					ball.setAttribute('transform', `rotate(${(t * 540).toFixed(0)} ${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
					trail.setAttribute('opacity', String(Math.min(0.75, t * 2)));
					trail.setAttribute('stroke-dashoffset', String(-t * 40));
					if (t < 1) return requestAnimationFrame(step);
					anims.delete(step);
					// yere çarptı: toz, işaret
					g.insertAdjacentHTML(
						'beforeend',
						`<circle class="dust" cx="${ex}" cy="${GY - 2}" r="9" fill="#e8dcc0" style="transform-origin:${ex}px ${GY - 2}px"/><line x1="${ex}" y1="${GY - 22}" x2="${ex}" y2="${GY}" stroke="${color}" stroke-width="2"/><path d="M${ex},${GY - 22} l11,4 -11,4z" fill="${color}"/>${
							label ? `<text class="lt" x="${ex}" y="${GY - 26}" text-anchor="middle" fill="${color}">${esc(label)}</text>` : ''
						}`,
					);
					ball.setAttribute('cy', String(GY - 4));
					app?.cam?.impulse?.(0.08);
					onLand?.(ex);
				};
				anims.add(step);
				requestAnimationFrame(step);
			};
			if (delay) setTimeout(go, delay);
			else go();
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
					if (!known) return say('Taş sise daldı…<small>sonuç birazdan</small>', 'cold', 0);
					const [t, tone, sub] = verdict(mine);
					say(`${t}<small>${esc(sub)}</small>`, tone, 0);
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
					c.querySelector('.cl').setAttribute('x1', x);
					c.querySelector('.cl').setAttribute('x2', x);
					const t = c.querySelector('.ct');
					t.setAttribute('x', x);
					t.textContent = `seyirci ${fmt(e.value)}`;
					c.classList.add('on');
					app?.ui?.toast?.(`Seyirci ${fmt(e.value)} diyor`, { tone: 'info', ms: 1800 });
				}
			},
			reveal(results) {
				done = true;
				root.classList.add('done');
				showWall();
				// herkesin taşı sırayla atılır. Kendi taşım sur bilinirken atıldıysa yerinde kalır (uçuşu bitince
				// ötekiler gelir); sur sisteyken atıldıysa sonuç yeniden, doğru yerine atılır.
				const keep = myThrow?.known;
				if (!keep) {
					msg.classList.remove('on');
					stones.innerHTML = '';
				} else setTimeout(() => msg.classList.remove('on'), 1400);
				const list = results.filter((r) => r.value != null && !(keep && r.p?.human));
				const rest = () => {
					arm.classList.remove('fire');
					arm.style.transform = 'rotate(170deg)';
					list.forEach((r, k) => throwStone(Number(r.value), r.color, { delay: 350 + k * 520, label: fmt(Number(r.value)) }));
				};
				if (keep && !myThrow.landed) myThrow.next = rest;
				else setTimeout(rest, keep ? 200 : 300);
				// sıralama ve damga: aşmayanlardan en yakın; hepsi aştıysa en az aşan
				const order = results.slice().sort((a, b) => a.err - b.err || a.time - b.time);
				const win = order[0];
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
