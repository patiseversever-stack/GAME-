// ŞİVE HARİTASI (deneme): bir karakter yöresinin ağzıyla konuşur ("Uşağum, gel da buraya!"). Oyuncu haritada sözün
// BÖLGESİNE dokunur (7 coğrafi bölge; dokunulan ilin bütün bölgesi yanar), "Bu yöre!" ile kilitler. Doğru bölge
// puan, doğru il (sözün asıl yurdu) bonus. Cevapta Türkiye'nin dokunuşları ısı haritası olarak yanar, doğru yöre
// kalkar ve parlar, kartta sözün anlamı ve kısa açıklaması çıkar ("uşak = çocuk").
//
// Veri: say (söz; [köşeli] parça vurgulanır), region (bölge anahtarı), ils: [plaka…] (il bonusu), mean (anlam:
//       [[kelime, karşılığı], …]), note (bir cümle açıklama), who: { ad, tip } (karakter ve avatarı; yöresi cevapta).
// Değer: { il } (kilitlenen il; bölge ondan çıkar).
// Tür 'closest': err 0 = doğru il, 1 = doğru bölge, 2 + bölge uzaklığı (komşu bölge adımı) = yanlış bölge.
// Isı haritası: çevrimdışında herkes = gerçek oyuncular + sorunun tohumuyla üretilen 60 kişilik "Türkiye" kalabalığı
// (aynı soru her zaman aynı dağılım). Çevrimiçinde sunucu gerçek dokunuş sayılarını reveal'de gönderir (v.heat).
// Çevrimiçi: publicView sözü, vurguyu ve karakterin adını taşır; bölge, iller, anlam ve açıklama sunucuda kalır.
// Joker: yarı yarıya → yedi bölgeden dördü söner, üç aday kalır; seyirci → kalabalığın bölge yüzdeleri kartta çıkar.

import { css, esc, pCorrect, clamp, buzz } from './util.js';
import { botTime, PROFILE } from './timing.js';
import { appOf, stamp, guard, onClose, cardTop, tag, pop, sfx, rule, stampLater, LOOK, ACT, DENEME_CSS } from './d_ortak.js';
import { setTimeout } from '../core/clock.js';
import { rng } from '../core/math.js';
import DATA from '../data/turkiye.json';

Object.assign(PROFILE, { sive: { min: 20, max: 30, think: [4, 1.5] } }); // ağzı duy, yöreyi düşün, bölgeye dokun, kilitle

const PROV = DATA.provinces;
const BY_ID = new Map(PROV.map((p, i) => [p.id, i]));
export const REGIONS = ['marmara', 'ege', 'akdeniz', 'icanadolu', 'karadeniz', 'dogu', 'guneydogu'];
export const RNAME = { marmara: 'Marmara', karadeniz: 'Karadeniz', ege: 'Ege', akdeniz: 'Akdeniz', icanadolu: 'İç Anadolu', dogu: 'Doğu Anadolu', guneydogu: 'Güneydoğu' };
// oyun sırasında bölgelerin tonu (sınırlar seçilsin) ve seçilince parlak hali
const RCOL = { marmara: '#34588f', ege: '#1f7469', akdeniz: '#94602a', icanadolu: '#86722e', karadeniz: '#2c6638', dogu: '#5e468a', guneydogu: '#8a3e33' };
const RHOT = { marmara: '#9cc6ff', ege: '#7ff0de', akdeniz: '#ffc98a', icanadolu: '#ffe68a', karadeniz: '#8fe39a', dogu: '#d3b4ff', guneydogu: '#ffa594' };
const IN_REG = Object.fromEntries(REGIONS.map((r) => [r, PROV.map((p, i) => (p.region === r ? i : -1)).filter((i) => i >= 0)]));

// bölge komşuluğu (il komşuluğundan) ve adım uzaklığı
const RADJ = Object.fromEntries(REGIONS.map((r) => [r, new Set()]));
for (const p of PROV) for (const id of p.nb) {
	const q = PROV[BY_ID.get(id)];
	if (q && q.region !== p.region) RADJ[p.region].add(q.region);
}
function hops(a, b) {
	if (a === b) return 0;
	let fr = [a];
	const seen = new Set(fr);
	for (let d = 1; d < 8; d++) {
		const nx = [];
		for (const r of fr) for (const s of RADJ[r]) if (!seen.has(s)) {
			if (s === b) return d;
			seen.add(s);
			nx.push(s);
		}
		fr = nx;
	}
	return 6;
}

const hash = (s) => {
	let h = 2166136261;
	for (const c of String(s)) h = Math.imul(h ^ c.codePointAt(0), 16777619);
	return h >>> 0;
};
const pickW = (list, w, R) => {
	let t = R() * list.reduce((s, x) => s + w(x), 0);
	for (const x of list) if ((t -= w(x)) <= 0) return x;
	return list[list.length - 1];
};
/** Bölge içinde bir il: büyük il daha sık dokunulur. */
const provIn = (r, R) => pickW(IN_REG[r], (i) => Math.sqrt(PROV[i].area), R);

/** "Türkiye" kalabalığı: sorunun tohumuyla 60 dokunuş (il dizinleri). Aynı soru → aynı dağılım. */
export function crowd(v, n = 60) {
	const R = rng(hash(v.q.id || v.q.say));
	const pr = [0.74, 0.58, 0.44][clamp((v.q.diff || 2) - 1, 0, 2)];
	const out = [];
	for (let k = 0; k < n; k++) {
		if (R() < pr) {
			const il = R() < 0.5 && v.ils.length ? BY_ID.get(v.ils[Math.floor(R() * v.ils.length)]) : provIn(v.region, R);
			out.push(il);
		} else {
			const near = [...RADJ[v.region]];
			const r = R() < 0.65 && near.length ? near[Math.floor(R() * near.length)] : REGIONS.filter((x) => x !== v.region)[Math.floor(R() * 6)];
			out.push(provIn(r, R));
		}
	}
	return out;
}
/** Bölge yüzdeleri (toplam 100). */
function pollOf(list) {
	const c = Object.fromEntries(REGIONS.map((r) => [r, 0]));
	for (const i of list) c[PROV[i].region]++;
	const n = list.length || 1;
	const pct = REGIONS.map((r) => [r, Math.round((c[r] / n) * 100)]);
	const top = pct.reduce((a, b) => (b[1] > a[1] ? b : a));
	top[1] += 100 - pct.reduce((s, x) => s + x[1], 0);
	return pct;
}

/** Sözü HTML'e çevir: [köşeli] parça vurgulanır; harfler sırayla belirir (ağızdan dökülür gibi). */
function sayHTML(s) {
	let k = 0;
	let out = '';
	for (const part of String(s).split(/(\[[^\]]+\])/)) {
		if (!part) continue;
		const hot = part.startsWith('[');
		const txt = hot ? part.slice(1, -1) : part;
		const chars = [...txt].map((c) => (c === ' ' ? ' ' : `<i style="--d:${(k++ * 0.035).toFixed(3)}s">${esc(c)}</i>`)).join('');
		out += hot ? `<mark>${chars}</mark>` : chars;
	}
	return out;
}
const plain = (s) => String(s).replace(/[[\]]/g, '');

/** Karakter avatarı (SVG): tip yemeni | kasket | genc | sac | usta | nine | kep. Yöreyi ele vermez. */
function avatar(w = {}) {
	const skin = w.skin || '#f1c49b';
	const t = w.tip || 'genc';
	const bg = w.bg || '#2f6bff';
	const hair = w.sac || '#3b2414';
	const eyes = '<circle cx="22.5" cy="31" r="2.1" fill="#1d1d2b"/><circle cx="33.5" cy="31" r="2.1" fill="#1d1d2b"/><circle cx="23.2" cy="30.3" r=".7" fill="#fff"/><circle cx="34.2" cy="30.3" r=".7" fill="#fff"/>';
	const cheeks = '<ellipse cx="19" cy="36" rx="3" ry="1.8" fill="#ff8a7a" opacity=".45"/><ellipse cx="37" cy="36" rx="3" ry="1.8" fill="#ff8a7a" opacity=".45"/>';
	const mouth = '<path class="sv-mouth" d="M23.5 38.5q4.5 4 9 0" fill="#7a2a20" stroke="#5a1a10" stroke-width="1" stroke-linecap="round"/>';
	const head = `<ellipse cx="28" cy="31" rx="13" ry="14" fill="${skin}"/>`;
	const neck = `<path d="M10 56c2-9 9-12 18-12s16 3 18 12z" fill="${w.giysi || '#e8eef9'}"/>`;
	let top = '';
	let front = '';
	if (t === 'yemeni' || t === 'nine') {
		const c = w.yazma || '#d8342a';
		top = `<path d="M12 34c-1-14 6-22 16-22s17 8 16 22c2 6 1 12-3 16H15c-4-4-5-10-3-16z" fill="${c}"/>`;
		front = `<path d="M15 26c2-7 7-10 13-10s11 3 13 10c-4-3-8-4-13-4s-9 1-13 4z" fill="${c}"/><g fill="#fff" opacity=".75"><circle cx="20" cy="20" r="1.1"/><circle cx="28" cy="16.5" r="1.1"/><circle cx="36" cy="20" r="1.1"/><circle cx="16" cy="42" r="1.1"/><circle cx="40" cy="42" r="1.1"/></g>`;
		if (t === 'nine') front += '<path d="M19 27.5h6M31 27.5h6" stroke="#c9c9c9" stroke-width="1.6" stroke-linecap="round"/><circle cx="22.5" cy="31" r="4.2" fill="none" stroke="#6b4a2a" stroke-width="1.2"/><circle cx="33.5" cy="31" r="4.2" fill="none" stroke="#6b4a2a" stroke-width="1.2"/><path d="M26.7 31h2.6" stroke="#6b4a2a" stroke-width="1.2"/>';
	} else if (t === 'kasket') {
		front = `<path d="M14 25c0-8 6-12 14-12s15 4 15 11c3 1 4 2 4 3-6-1-13-2-19-2s-11 0-14 0z" fill="${w.sapka || '#5a5f6e'}"/><path d="M15 24.5c4-1 9-1.5 13-1.5" stroke="rgba(255,255,255,.25)" stroke-width="1"/><path d="M21 37.5q7-4 14 0q-3.5 2.2-7 .8q-3.5 1.4-7-.8z" fill="${w.biyik || '#d9d9d9'}"/>`;
	} else if (t === 'usta') {
		front = `<path d="M15 23c-4-2-4-8 1-9 1-5 7-6 9-3 3-4 9-3 10 1 5 0 6 7 2 10z" fill="#fff" stroke="#d9dde8" stroke-width="1"/><rect x="16" y="21" width="24" height="4" rx="1" fill="#eef1f8"/><path d="M21 37.5q7-4 14 0q-3.5 2.2-7 .8q-3.5 1.4-7-.8z" fill="${w.biyik || '#3b2414'}"/>`;
	} else if (t === 'sac') {
		top = `<path d="M13 32c-2-13 5-20 15-20s17 7 15 20c1 7 2 12 0 16-3-3-4-8-4-12H17c0 4-1 9-4 12-2-4-1-9 0-16z" fill="${hair}"/>`;
		front = `<path d="M15 27c2-8 7-11 13-11s11 3 13 11c-6-5-13-3-16-7-2 4-6 6-10 7z" fill="${hair}"/>`;
	} else if (t === 'kep') {
		front = `<path d="M14 26c0-9 6-13 14-13s14 4 14 13z" fill="${w.sapka || '#e8322a'}"/><path d="M28 26h18c0 2-2 3-5 3H28z" fill="${w.sapka || '#e8322a'}" opacity=".85"/><circle cx="28" cy="13.5" r="1.4" fill="#fff"/>`;
	} else {
		front = `<path d="M15 27c0-9 6-14 13-14s13 5 13 14c-3-4-8-6-13-6s-10 2-13 6z" fill="${hair}"/>`;
	}
	return `<svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="28" fill="${bg}"/>${top}${neck}${head}${eyes}${cheeks}${mouth}${front}</svg>`;
}

const CSS = /* css */ `
.dn-sv{display:flex;flex-direction:column;gap:7px}
.dn-sv .sv-row{display:flex;align-items:flex-end;gap:9px}
.dn-sv .sv-who{flex:none;width:62px;display:flex;flex-direction:column;align-items:center;gap:3px}
.dn-sv .sv-av{width:58px;height:58px;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 0 rgba(0,0,0,.35);overflow:hidden;animation:svBob 1.4s ease-in-out infinite alternate}
.dn-sv .sv-av svg{display:block;width:100%;height:100%}
.dn-sv .sv-mouth{transform-origin:28px 39px;animation:svTalk .16s ease-in-out 14 alternate}
.dn-sv .sv-who b{max-width:66px;font-family:'Lilita One';font-weight:400;font-size:11.5px;line-height:1.05;text-align:center;color:#fff;letter-spacing:.02em}
.dn-sv .sv-who small{font-family:'Manrope';font-weight:800;font-size:9px;letter-spacing:.1em;color:#ffd25a;text-transform:uppercase;text-align:center;line-height:1.1}
.dn-sv .sv-bub{position:relative;flex:1;min-width:0;padding:10px 13px 11px;border-radius:20px 20px 20px 6px;background:#fffdf6;color:#1c2550;box-shadow:0 4px 0 rgba(0,0,0,.3),inset 0 -3px 0 rgba(0,0,0,.06)}
.dn-sv .sv-bub::before{content:'';position:absolute;left:-9px;bottom:6px;border:9px solid transparent;border-right-color:#fffdf6;border-left:0;border-bottom:0}
.dn-sv .sv-say{font-family:'Lilita One';font-weight:400;font-size:clamp(20px,calc(5.6 * var(--vw,4px)),25px);line-height:1.12;letter-spacing:.01em}
.dn-sv .sv-say i{font-style:normal;display:inline-block;animation:svCh .32s cubic-bezier(.3,1.7,.5,1) var(--d) both}
.dn-sv .sv-say mark{color:#c0331f;background:linear-gradient(180deg,transparent 58%,rgba(255,200,40,.75) 58% 92%,transparent 92%);padding:0 1px}
.dn-sv .sv-bub .sv-q{position:absolute;right:9px;top:-9px;padding:1px 7px 2px;border-radius:7px;font-family:'Manrope';font-weight:800;font-size:9px;letter-spacing:.14em;color:#fff;background:#e2553a;box-shadow:0 2px 0 rgba(0,0,0,.3)}
.dn-sv .sv-bar{display:flex;align-items:center;gap:7px;min-height:38px}
.dn-sv .sv-pick{flex:1;min-width:0;display:flex;align-items:center;gap:7px;padding:5px 10px;border-radius:12px;background:rgba(0,0,0,.28);font-family:'Fredoka';font-weight:600;font-size:13.5px;color:#cfe0ff;white-space:nowrap;overflow:hidden}
.dn-sv .sv-pick i{flex:none;width:14px;height:14px;border-radius:4px;background:var(--rc,#556);box-shadow:inset 0 -2px 0 rgba(0,0,0,.25)}
.dn-sv .sv-pick b{font-family:'Lilita One';font-weight:400;font-size:16px;color:#fff}
.dn-sv .sv-pick em{font-style:normal;opacity:.75;overflow:hidden;text-overflow:ellipsis}
.dn-sv .sv-go{flex:none;height:38px;padding:0 14px;border:0;border-radius:12px;font-family:'Lilita One';font-size:16px;letter-spacing:.03em;color:#3a2200;background:linear-gradient(180deg,#ffe48a,#ffc23a);box-shadow:0 4px 0 #a86a00;cursor:pointer;transition:transform .12s,filter .2s}
.dn-sv .sv-go:disabled{filter:grayscale(1) brightness(.7);box-shadow:0 4px 0 #444;cursor:default}
.dn-sv .sv-go:not(:disabled){animation:flq-pop .3s}
.dn-sv .sv-go:active:not(:disabled){transform:translateY(3px);box-shadow:0 1px 0 #a86a00}
.dn-sv .sv-poll{display:none;grid-template-columns:repeat(7,1fr);gap:3px;align-items:end;height:46px;padding:3px 4px 0;border-radius:10px;background:rgba(0,0,0,.25)}
.dn-sv .sv-poll.on{display:grid}
.dn-sv .sv-poll span{position:relative;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;font-family:'Manrope';font-weight:800;font-size:8px;color:#cfe0ff}
.dn-sv .sv-poll span i{width:70%;border-radius:4px 4px 0 0;background:var(--rc);height:calc(var(--p) * .3px);min-height:2px;animation:svGrow .6s cubic-bezier(.3,1.4,.5,1) both}
.dn-sv .sv-poll span em{font-style:normal;font-family:'Lilita One';font-size:10px;color:#fff}
.dn-sv.done .sv-bar,.dn-sv.done .sv-poll{display:none}
.fl-qtext.sv-qt{display:block;padding:0;background:none;border:0;box-shadow:none;text-align:left}
.sv-mean{padding:8px 11px 9px;border-radius:14px;background:linear-gradient(170deg,#1d3266,#132248);border:2px solid #ffd25a;box-shadow:0 4px 0 rgba(0,0,0,.35);animation:flq-pop .45s cubic-bezier(.3,1.6,.5,1)}
.sv-mean .sv-w{display:flex;flex-wrap:wrap;justify-content:center;gap:2px 12px;margin-bottom:4px}
.sv-mean .sv-w span{font-family:'Fredoka';font-weight:600;font-size:15px;line-height:1.2;color:#fff}
.sv-mean .sv-w b{font-family:'Lilita One';font-weight:400;color:#ffd25a;font-size:18px}
.sv-mean p{margin:0;font-family:'Manrope';font-weight:700;font-size:12px;line-height:1.35;color:#cfe0ff}
.sv-mean .sv-rg{display:inline-block;margin-right:5px;padding:0 6px 1px;border-radius:6px;font-family:'Lilita One';font-weight:400;font-size:12px;color:#14203f;background:var(--rc)}
.sv-mean small{display:block;margin-top:3px;font-family:'Manrope';font-weight:800;font-size:9.5px;letter-spacing:.06em;color:#8fa2cf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dn-tag.sv-rgt>div{background:rgba(10,18,44,.55);border-color:transparent;box-shadow:none;padding:1px 7px 2px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.92}
.dn-tag.sv-rgt>div::after{display:none}
.dn-tag.sv-pct>div{border-color:var(--tc);font-family:'Lilita One';font-weight:400;font-size:13px}
.dn-tag.sv-pct.win>div{font-size:17px;padding:3px 11px 4px;background:linear-gradient(180deg,#ffe48a,#ffc23a);color:#3a2200;box-shadow:0 4px 0 rgba(90,50,0,.6)}
@keyframes svCh{from{opacity:0;transform:translateY(7px) scale(.6) rotate(-8deg)}to{opacity:1;transform:none}}
@keyframes svTalk{from{transform:scaleY(.35)}to{transform:scaleY(1.15)}}
@keyframes svBob{from{transform:translateY(0) rotate(-2deg)}to{transform:translateY(-3px) rotate(2deg)}}
@keyframes svGrow{from{height:0}}
`;

/** Isı rengi (0..1): buz mavisi → mor → kızıl → altın. */
const HEAT = ['#5a8cff', '#b06cff', '#ff5a8a', '#ff9a3a', '#ffe14a'];
function heatCol(x) {
	const t = clamp(x, 0, 1) * (HEAT.length - 1);
	const a = Math.floor(t);
	const b = Math.min(HEAT.length - 1, a + 1);
	const f = t - a;
	const h = (s) => [1, 3, 5].map((k) => parseInt(s.slice(k, k + 2), 16));
	const A = h(HEAT[a]);
	const B = h(HEAT[b]);
	return '#' + A.map((c, k) => Math.round(c + (B[k] - c) * f).toString(16).padStart(2, '0')).join('');
}

/** Bölgenin ekrandaki yazı noktası: illerinin alanla ağırlıklı merkezi (board koordinatı). */
function regionPoint(b, r) {
	let x = 0;
	let z = 0;
	let w = 0;
	for (const i of IN_REG[r]) {
		const p = b.provinces[i];
		const a = PROV[i].area;
		x += p.x * a;
		z += p.z * a;
		w += a;
	}
	return { x: x / w, z: z / w };
}

function verdict(v, il) {
	const i = BY_ID.get(il);
	if (i == null) return null;
	const r = PROV[i].region;
	return { i, r, right: r === v.region, bonus: r === v.region && v.ils.includes(il) };
}

export const sive = {
	time: 22,
	label: 'Şive Haritası',
	kind: 'closest',
	needsMap: true,
	jokers: ['yari', 'kahin'],
	fmt(v, value) {
		const d = verdict(v, value?.il);
		return d ? `${RNAME[d.r]} · ${PROV[d.i].name}` : '—';
	},
	sub(v, value) {
		const d = verdict(v, value?.il);
		return !d ? 'dokunmadı' : d.bonus ? 'doğru yöre + il bonusu' : d.right ? 'doğru yöre' : 'yanlış yöre';
	},
	prepare(q) {
		const v = { q, region: q.region, ils: (q.ils || []).slice(), say: q.say, who: { ad: q.who?.ad || 'Biri', tip: q.who?.tip, skin: q.who?.skin, bg: q.who?.bg, yazma: q.who?.yazma, sapka: q.who?.sapka, sac: q.who?.sac, giysi: q.who?.giysi, biyik: q.who?.biyik } };
		return stamp(v, q, (q2, k, P, text) => {
			text(plain(q2.say), 1.4); // ağız yazımı: göz takılır, bir kez de içinden seslendirilir
			return {
				wait: 0.5 + [...plain(q2.say)].length * 0.035,
				look: LOOK.orient + LOOK.map + 0.5,
				act: ACT.mapTap + 0.6 + ACT.confirm, // dokun, yanan bölgeyi gör, kilitle
			};
		});
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('sive', CSS);
		const app = appOf();
		el.innerHTML = `<div class="dn-sv">
			<div class="sv-row">
				<div class="sv-who"><div class="sv-av">${avatar(v.who)}</div><b>${esc(v.who.ad)}</b><small class="sv-from">nereli?</small></div>
				<div class="sv-bub"><span class="sv-q">YÖRESEL SÖZ</span><div class="sv-say">${sayHTML(v.say)}</div></div>
			</div>
			<div class="sv-poll"></div>
			<div class="sv-bar"><div class="sv-pick"><i></i><em>Haritada bu ağzın yöresine dokun</em></div><button class="sv-go" disabled>BU YÖRE!</button></div>
		</div>`;
		rule(el, 'Yöreyi bul, ili bil');
		const root = el.querySelector('.dn-sv');
		const pick = root.querySelector('.sv-pick');
		const go = root.querySelector('.sv-go');
		let sel = -1;
		let done = false;
		let out = null; // yarı yarıya: sönen bölgeler
		const finish = () => {
			if (done || sel < 0) return;
			done = true;
			root.classList.add('done');
			go.disabled = true;
			api.answer({ il: PROV[sel].id });
		};
		go.addEventListener('click', () => {
			sfx(app, 'tap');
			buzz(10);
			finish();
		});
		const value = () => (sel >= 0 ? { il: PROV[sel].id } : null);
		if (!app) return { lock: () => (done = true), value, reveal() {}, destroy() {} };
		const b = app.board;
		const g = guard(app);
		g.allActive();
		// yöreler kendi tonunda (bölge sınırları okunsun), adları haritada
		const base = (i) => (out?.has(PROV[i].region) ? '#2a2f44' : RCOL[PROV[i].region]);
		PROV.forEach((_, i) => g.paint(i, base(i)));
		const names = REGIONS.map((r) => {
			const c = regionPoint(b, r);
			return tag(app, esc(RNAME[r]), c.x, c.z, 'sv-rgt');
		});
		queueMicrotask(() => {
			if (!el.isConnected) return;
			app.cam.fit(app.boundsOf(PROV.map((_, i) => i)), { pitch: 1.02, pad: 1.03, top: cardTop(el), dur: 0.7 });
		});
		let selTag = null;
		const lightRegion = (r, on, from) => {
			for (const i of IN_REG[r]) {
				g.paint(i, on ? RHOT[r] : base(i), from?.x, from?.z);
				g.fx(i, on ? 0.38 : 0, on ? 0.8 : 0);
			}
		};
		api.onMapTap((pt) => {
			if (done) return;
			const i = b.pick(pt.x, pt.z);
			if (i < 0) return;
			const p = b.provinces[i];
			const r = PROV[i].region;
			if (out?.has(r)) {
				app.ui.toast?.(`${RNAME[r]} elendi`, { tone: 'warn', ms: 1100 });
				return;
			}
			const prev = sel >= 0 ? PROV[sel].region : null;
			if (prev && prev !== r) lightRegion(prev, false);
			if (sel >= 0 && prev === r) {
				g.paint(sel, RHOT[r]);
				g.fx(sel, 0.38, 0.8);
			}
			sel = i;
			if (prev !== r) lightRegion(r, true, pt);
			g.paint(i, '#ffd25a', pt.x, pt.z);
			g.fx(i, 0.5, 1);
			if (selTag) {
				selTag.el.remove();
				app.ui.pins.splice(app.ui.pins.indexOf(selTag), 1);
			}
			selTag = tag(app, `<b>${esc(RNAME[r])}</b><em>${esc(p.name)}</em>`, p.x, p.z, 'big');
			selTag.el.style.setProperty('--tc', RHOT[r]);
			pick.style.setProperty('--rc', RHOT[r]);
			pick.innerHTML = `<i></i><b>${esc(RNAME[r])}</b><em>· ${esc(p.name)}</em>`;
			go.disabled = false;
			sfx(app, prev === r ? 'tap' : 'star');
			buzz(8);
		});
		const close = onClose(el, () => g.restore());
		const dropTags = (list) => {
			for (const t of list) {
				if (!t) continue;
				t.el.remove();
				const k = app.ui.pins.indexOf(t);
				if (k >= 0) app.ui.pins.splice(k, 1);
			}
		};
		return {
			lock() {
				done = true;
				root.classList.add('done');
				go.disabled = true;
			},
			value,
			joker(e) {
				if (e?.keep) {
					out = new Set(REGIONS.filter((r) => !e.keep.includes(r)));
					PROV.forEach((_, i) => {
						if (out.has(PROV[i].region)) {
							if (i === sel) sel = -1;
							g.paint(i, base(i));
							g.fx(i, 0, 0);
						}
					});
					if (sel < 0) {
						go.disabled = true;
						pick.innerHTML = '<i></i><em>Kalan üç yöreden birine dokun</em>';
					}
					names.forEach((t, k) => out.has(REGIONS[k]) && (t.el.style.opacity = '.25'));
					app.ui.toast?.(e.text, { tone: 'good', ms: 2000 });
				}
				if (e?.poll) {
					const box = root.querySelector('.sv-poll');
					box.innerHTML = e.poll.map(([r, p]) => `<span style="--rc:${RHOT[r]};--p:${p}"><em>%${p}</em><i></i>${esc(RNAME[r].split(' ')[0].slice(0, 7))}</span>`).join('');
					box.classList.add('on');
					app.ui.toast?.('Seyirci oyunu kartta', { tone: 'good', ms: 1500 });
				}
			},
			reveal(results) {
				done = true;
				root.classList.add('done');
				go.disabled = true;
				dropTags([...names, selTag]);
				// ısı haritası: herkesin dokunuşu (kalabalık + oyuncular)
				const votes = Array.isArray(v.heat) ? v.heat.map((id) => BY_ID.get(id)).filter((i) => i != null) : crowd(v);
				for (const r of results) {
					const i = BY_ID.get(r.value?.il);
					if (i != null) votes.push(i);
				}
				const cnt = new Map();
				for (const i of votes) cnt.set(i, (cnt.get(i) || 0) + 1);
				const max = Math.max(1, ...cnt.values());
				// dokunulmamış iller arduvaz (ısı öne çıksın), dokunulanlar yoğunluk renginde
				PROV.forEach((_, i) => {
					g.fx(i, 0, 0);
					if (!cnt.has(i)) g.paint(i, '#2c3248');
				});
				for (const [i, c] of cnt) {
					const p = b.provinces[i];
					g.paint(i, heatCol(Math.pow(c / max, 0.6)), p.x, p.z);
					g.fx(i, 0.08 + 0.3 * (c / max), 0.2);
				}
				const poll = pollOf(votes);
				const pctTags = [];
				// cevap: önce ısı, sonra doğru yöre kalkar ve yüzdeler çıkar
				setTimeout(() => {
					if (!el.isConnected) return;
					for (const i of IN_REG[v.region]) {
						const c = cnt.get(i) || 0;
						if (!c) g.paint(i, '#ffe9a8');
						g.fx(i, 0.45, 1);
					}
					for (const plate of v.ils) {
						const i = BY_ID.get(plate);
						const p = b.provinces[i];
						g.paint(i, '#ffd25a', p.x, p.z);
						g.fx(i, 0.75, 1);
					}
					for (const [r, p] of poll) {
						if (!p && r !== v.region) continue;
						const c = regionPoint(b, r);
						const t = tag(app, r === v.region ? `${esc(RNAME[r])} ✓ %${p}` : `%${p}`, c.x, c.z, `sv-pct${r === v.region ? ' win' : ''}`);
						t.el.style.setProperty('--tc', r === v.region ? '#ffd25a' : RHOT[r]);
						pctTags.push(t);
					}
					const home = b.provinces[BY_ID.get(v.ils[0])];
					pop(app, home.x, home.z, RNAME[v.region].toLocaleUpperCase('tr-TR') + '!', { colors: ['#ffd25a', '#fff', RHOT[v.region]], n: 20, dist: 90, cls: 'dn dn-gold' });
					sfx(app, 'reveal');
				}, 1300);
				// kadraj: Türkiye ısısı, sonra doğru yöreye alçalarak yaklaşma
				const top = cardTop(el);
				app.cam.fit(app.boundsOf(PROV.map((_, i) => i)), { pitch: 1.0, pad: 1.05, top, dur: 0.8, arc: 3 });
				setTimeout(() => {
					if (!el.isConnected) return;
					const rb = app.boundsOf(IN_REG[v.region]);
					app.cam.fit({ x0: rb.x0 - 2, x1: rb.x1 + 2, z0: rb.z0 - 2, z1: rb.z1 + 2 }, { pitch: 0.82, pad: 1.1, top, dur: 1.8, arc: 4 });
				}, 2600);
				// kart: sözün anlamı, açıklaması, karakterin yöresi. Arayüz 'closest' tiplerde gövdeye sıralamayı
				// yazar; anlam soru yazısının yerine (kartın üstünde kalan kutu) konur.
				const homeName = PROV[BY_ID.get(v.ils[0])]?.name || '';
				const q = v.q;
				root.querySelector('.sv-from').textContent = homeName;
				const mean = `<div class="sv-mean"><div class="sv-w">${(q.mean || []).map(([w, m]) => `<span><b>${esc(w)}</b> = ${esc(m)}</span>`).join('')}</div><p><span class="sv-rg" style="--rc:${RHOT[v.region]}">${esc(RNAME[v.region])}</span>${esc(q.note || '')}</p><small>${esc(v.who.ad)} · ${esc(homeName)} · “${esc(plain(v.say))}”</small></div>`;
				const qt = el.closest('.fl-q')?.querySelector('.fl-qtext');
				if (qt) {
					qt.classList.add('sv-qt');
					qt.innerHTML = mean;
				} else root.insertAdjacentHTML('beforeend', mean);
				const meR = results.find((r) => r.p?.human);
				if (meR) {
					const d = verdict(v, meR.value?.il);
					const order = results.slice().sort((a, b2) => a.err - b2.err || a.time - b2.time);
					const win = order[0] === meR;
					if (d?.bonus) stampLater(app, 'TAM İSABET!', 'gold', `Doğru yöre, doğru il: ${PROV[d.i].name}`);
					else if (d?.right) stampLater(app, 'DOĞRU YÖRE!', win ? 'gold' : '', `${RNAME[v.region]}; il bonusu ${homeName}`);
					else stampLater(app, 'YANLIŞ YÖRE', 'bad', `Bu ağız ${RNAME[v.region]}'in`);
				}
				void pctTags;
			},
			destroy: close,
		};
	},
	joker(id, v, R) {
		if (id === 'yari') {
			const others = REGIONS.filter((r) => r !== v.region);
			for (let i = others.length - 1; i > 0; i--) {
				const j = Math.floor(R() * (i + 1));
				[others[i], others[j]] = [others[j], others[i]];
			}
			const keep = [v.region, others[0], others[1]].sort((a, b) => REGIONS.indexOf(a) - REGIONS.indexOf(b));
			return { keep, zone: keep.flatMap((r) => IN_REG[r]), text: `Üç yöre kaldı: ${keep.map((r) => RNAME[r]).join(', ')}` };
		}
		if (id === 'kahin') return { poll: pollOf(crowd(v)) };
		return null;
	},
	/** Çevrimiçi görünüm: söz, vurgu ve karakter gider; bölge, iller, anlam ve açıklama sunucuda. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.region;
		delete o.ils;
		o.q = { id: o.q.id, cat: o.q.cat, diff: o.q.diff, type: o.q.type, q: o.q.q, say: o.q.say };
		return o;
	},
	judge(v, value) {
		const d = verdict(v, value?.il);
		if (!d) return { correct: false, err: 9 };
		if (d.bonus) return { correct: true, err: 0, bonus: true };
		if (d.right) return { correct: true, err: 1 };
		return { correct: false, err: 2 + hops(d.r, v.region) };
	},
	/** Sınama yardımcısı: bir doğru ve bir yanlış örnek cevap (test/deneme.test.mjs genel dalı için). */
	sinama(v) {
		return { good: { il: v.ils[0] }, bad: { il: PROV.find((p) => p.region !== v.region).id } };
	},
	bot(v, skill, R) {
		const p = clamp(pCorrect(skill, v.q.diff) + 0.1, 0.1, 0.95);
		let il;
		if (R() < p) {
			il = R() < 0.2 + 0.5 * skill ? v.ils[Math.floor(R() * v.ils.length)] : PROV[provIn(v.region, R)].id;
		} else {
			const near = [...RADJ[v.region]];
			const r = R() < 0.7 && near.length ? near[Math.floor(R() * near.length)] : REGIONS.filter((x) => x !== v.region)[Math.floor(R() * 6)];
			il = PROV[provIn(r, R)].id;
		}
		return { value: { il }, time: botTime(v, R, skill, 0.1, 1) };
	},
};

// ---------------------------------------------------------------- örnek sözler
// 21 söz, yedi bölgeden üçer. Yazım ağzın telaffuzunu yansıtır; [köşeli] parça sözün anahtarı. Kaba, argo ya da bir
// yöreyi küçümseyen ifade yok; karakter adları yöre ele vermez. Kaynaklar (her söz iki kaynak) commit raporunda:
// TDK Güncel Türkçe Sözlük (yöresel işaretli maddeler), TDK Derleme Sözlüğü, Kültür ve Turizm Bakanlığı il
// mutfağı sayfaları, Leyla Karahan "Anadolu Ağızlarının Sınıflandırılması" (TDK 1996).
const SV = (id, diff, region, ils, say, mean, note, who) => ({ id, cat: 'eglence', diff, type: 'sive', q: 'Bu ağız hangi yörenin?', region, ils, say, mean, note, who });
const W = {
	nine: (ad, yazma, bg) => ({ ad, tip: 'nine', yazma, bg, skin: '#eab896', giysi: '#f3ead8' }),
	teyze: (ad, yazma, bg) => ({ ad, tip: 'yemeni', yazma, bg, skin: '#efc19d', giysi: '#3b5ba8' }),
	amca: (ad, sapka, bg) => ({ ad, tip: 'kasket', sapka, bg, skin: '#d9a57c', giysi: '#7a5a3a' }),
	usta: (ad, bg) => ({ ad, tip: 'usta', bg, skin: '#e3ad84', giysi: '#ffffff' }),
	genc: (ad, sac, bg) => ({ ad, tip: 'genc', sac, bg, skin: '#f1c49b', giysi: '#2a9d5c' }),
	abla: (ad, sac, bg) => ({ ad, tip: 'sac', sac, bg, skin: '#f3c9a5', giysi: '#d8546a' }),
	kep: (ad, sapka, bg) => ({ ad, tip: 'kep', sapka, bg, skin: '#e6b28a', giysi: '#f2f2f2' }),
};

export const SIVE_SAMPLES = [
	// Karadeniz
	SV('dn-sv1', 1, 'karadeniz', [61, 53], '[Uşağum], gel da buraya!', [['uşak', 'çocuk'], ['da', 'haydi, pekiştirme']], 'Doğu Karadeniz’de çocuğa “uşak” denir; “-um” iyeliği de ağzın imzasıdır.', W.nine('Emine Nine', '#2f8a4a', '#4a7dd8')),
	SV('dn-sv2', 1, 'karadeniz', [53, 61], '[Hemşo], çayi demledun mi?', [['hemşo', 'hemşerim']], 'Karadenizli birbirine “hemşo” diye seslenir; “çayi, demledun” yazımı ağzın ünlülerini taşır.', W.amca('Recep Amca', '#4a4f5e', '#1f8a8a')),
	SV('dn-sv3', 2, 'karadeniz', [61, 53, 28, 8], '[Pancar] çorbasini koydum, soğumasun!', [['pancar', 'kara lahana']], 'Doğu Karadeniz’de “pancar” şeker pancarı değil, kara lahanadır; pancar çorbası kara lahana çorbası.', W.teyze('Hatice Teyze', '#7a3fa0', '#e0803a')),
	// Ege
	SV('dn-sv4', 1, 'ege', [48, 20, 9], '[Ula], n’aapıyon?', [['ula', 'arkadaşça seslenme'], ['n’aapıyon', 'ne yapıyorsun']], 'Muğla, Denizli ve Aydın’da “ula” sevecen bir seslenmedir; “-yon” Ege ağzının şimdiki zamanı.', W.genc('Mert', '#2a1a10', '#d8542a')),
	SV('dn-sv5', 2, 'ege', [9, 35], '[Efem], böyle nereye gidiyon?', [['efe', 'zeybeklerin başı, yiğit']], 'Efe, Batı Anadolu’da zeybeklerin önderi; bugün yiğit, mert kişiye saygılı bir seslenme.', W.amca('Hüseyin Amca', '#2b2b2b', '#2f9b8a')),
	SV('dn-sv6', 1, 'ege', [35], 'Bi [gevrek], bi [boyoz], bi de çay ver!', [['gevrek', 'simit'], ['boyoz', 'hamur işi']], 'İzmir’de simide “gevrek” denir; boyoz da İzmir kahvaltısının yağlı, kat kat hamur işidir.', W.abla('Deniz', '#5a3218', '#3a7bd5')),
	// Marmara
	SV('dn-sv7', 2, 'marmara', [22, 39, 59], '[Ayde bre], geç kalcaz!', [['ayde', 'haydi'], ['bre', 'seslenme']], 'Trakya’da, Rumeli göçmenlerinin ağzında “ayde” ve “bre” gündelik seslenmedir.', W.nine('Fatma Nine', '#d84a6a', '#6b5bd6')),
	SV('dn-sv8', 2, 'marmara', [22, 39, 59], '[Kaşkavalı] da kes, sofra hazır!', [['kaşkaval', 'kaşar peyniri']], 'Trakya’da kaşar peynirine Balkanlardan gelen adıyla “kaşkaval” denir.', W.teyze('Ayten Teyze', '#e8a23a', '#3a8d6a')),
	SV('dn-sv9', 3, 'marmara', [10, 16], 'Bi tabak [höşmerim] kap, sıcak sıcak!', [['höşmerim', 'peynir tatlısı']], 'Höşmerim, tuzsuz peynir, un ve şekerle yapılan bir tatlıdır; Balıkesir’in meşhur tatlısıdır.', W.usta('Tahsin Usta', '#c24a3a')),
	// İç Anadolu
	SV('dn-sv10', 2, 'icanadolu', [42], 'Hadi [gari], [etliekmek] soğuyo!', [['gari', 'artık'], ['etliekmek', 'kıymalı uzun pide']], 'Etliekmek Konya’nın kol boyu uzunluktaki pidesidir; “gari” Konya ağzında “artık”.', W.amca('Mustafa Amca', '#6b4a2a', '#c9a23a')),
	SV('dn-sv11', 2, 'icanadolu', [38], 'Gız, bu [mantıyı] kim büktü? Kaşığa kırk tane sığıyo!', [['mantı', 'Kayseri mantısı']], 'Kayseri mantısı minicik bükülür; “bir kaşığa kırk tane sığmalı” diye övülür.', W.teyze('Nazmiye Teyze', '#3a6ad8', '#d65a7a')),
	SV('dn-sv12', 2, 'icanadolu', [26], '[Çibörek] pişti, ağzını yakmadan ye!', [['çibörek', 'Tatar böreği']], 'Çibörek, Kırım Tatarlarının kıymalı, yarım ay biçimli kızarmış böreği; Eskişehir’in simgesidir.', W.abla('Gülsüm', '#20140c', '#7a5ad8')),
	// Doğu Anadolu
	SV('dn-sv13', 1, 'dogu', [25], '[Dadaş], ne [edirsen]?', [['dadaş', 'kardeş, delikanlı'], ['ne edirsen', 'ne yapıyorsun']], 'Erzurum ve çevresinde “dadaş” kardeş, delikanlı demektir; “-irsen” bu ağzın şimdiki zamanı.', W.kep('Ferhat', '#2c3e8a', '#1f6fb8')),
	SV('dn-sv14', 2, 'dogu', [65], 'Bi [murtuğa] yap, kahvaltı edek!', [['murtuğa', 'tereyağında un ve yumurta']], 'Murtuğa, tereyağında kavrulan una yumurta katılarak yapılır; Van kahvaltısının yıldızıdır.', W.nine('Zeliha Nine', '#e0603a', '#3a5ab8')),
	SV('dn-sv15', 2, 'dogu', [23, 44], '[Orcik] getirdim, cevizlisinden!', [['orcik', 'cevizli pestil sucuğu']], 'Orcik, cevizin üzüm pestiline batırılarak yapıldığı bir tatlıdır; Elazığ’ın meşhur tatlısıdır.', W.amca('İsmail Amca', '#3b3b4a', '#8a5ad0')),
	// Güneydoğu Anadolu
	SV('dn-sv16', 1, 'guneydogu', [27], '[Gakkoş], yuvalamayı [yidin] mi?', [['gakkoş', 'ağabey, kardeş'], ['yidin', 'yedin']], 'Gaziantep’te ağabeye ve yakın arkadaşa “gakkoş” denir; yuvalama da bayram sofrasının çorbası.', W.usta('Halil Usta', '#2a8a5a')),
	SV('dn-sv17', 1, 'guneydogu', [63], 'Ağam, bi tutam [isot] at, acısı olsun!', [['isot', 'Urfa biberi']], 'İsot, güneşte ve gecede kararana dek kurutulan Urfa biberidir; Şanlıurfa mutfağının ruhudur.', W.amca('Mahmut Amca', '#7a1f1f', '#d88a2a')),
	SV('dn-sv18', 3, 'guneydogu', [47, 72], '[Sembusek] fırından çıktı, gelin!', [['sembusek', 'kıymalı yarım ay hamur işi']], 'Sembusek, kıymayla doldurulup taş fırında pişirilen yarım ay biçimli hamur işidir; Mardin mutfağının simgesi.', W.abla('Leyla', '#1a120c', '#c24a6a')),
	// Akdeniz
	SV('dn-sv19', 1, 'akdeniz', [33], 'Bi [tantuni], bol limonlu olsun [gardaş]!', [['tantuni', 'sacda dana dürüm'], ['gardaş', 'kardeş']], 'Tantuni Mersin’in sacda pişen dürümüdür; “gardaş” k’nin g’ye döndüğü Anadolu ağzıyla kardeş.', W.genc('Cem', '#120c08', '#e04a3a')),
	SV('dn-sv20', 2, 'akdeniz', [31], '[Oruk] yaptım, içi cevizli!', [['oruk', 'içli köfte']], 'Hatay’da içli köfteye “oruk” denir; uzun, ince biçimiyle tanınır.', W.teyze('Meryem Teyze', '#2a8ad8', '#d8a03a')),
	SV('dn-sv21', 2, 'akdeniz', [1], 'Acılı [şalgam] olmadan kebap mı yenir hiç?', [['şalgam', 'mor havuç suyu']], 'Şalgam suyu mor havuç ve bulgurla mayalanır; Adana’nın kebap yanındaki vazgeçilmezidir.', W.amca('Cemil Amca', '#b8892a', '#3a9a5a')),
];
