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
		// harfler kelime kelime gruplanır: satır yalnız kelime arasında kırılır ("sofray / a" olmasın)
		const chars = txt
			.split(/( +)/)
			.map((w) => (/^ +$/.test(w) || !w ? w : `<span class="w">${[...w].map((c) => `<i style="--d:${(k++ * 0.035).toFixed(3)}s">${esc(c)}</i>`).join('')}</span>`))
			.join('');
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
/* AĞIZ ATLASI (Arena v1 siyah/beyaz): solda karakter (eğik çerçeveli portre, konuşurken ağız oynar), sağda arşiv kaydı:
   kayıt ışığı + dalga biçimi (konuşma süresince oynar, sonra durulur), söz harf harf dökülür, ağız kelimeleri altın
   vurgulu. Cevapta her ağız kelimesinin altına standart karşılığı altyazı gibi iner. Seçim çubuğu bölgenin renginde
   plaka + beyaz eğik "BU YÖRE!" düğmesi. */
.dn-sv{display:flex;flex-direction:column;gap:9px}
.dn-sv .sv-row{display:flex;align-items:stretch;gap:10px}
.dn-sv .sv-who{flex:none;width:72px;display:flex;flex-direction:column;align-items:center;gap:4px}
.dn-sv .sv-av{position:relative;width:68px;height:68px;overflow:hidden;background:#0d1124;border:3px solid #fff;transform:skewX(-6deg);box-shadow:0 4px 0 rgba(0,0,0,.35)}
.dn-sv .sv-av svg{display:block;width:118%;height:118%;margin:-9% 0 0 -9%;transform:skewX(6deg)}
.dn-sv .sv-mouth{transform-origin:28px 39px;animation:svTalk .16s ease-in-out var(--talk,14) alternate}
.dn-sv .sv-who b{max-width:74px;font:400 12px/1.05 'Lilita One',sans-serif;text-align:center;color:#fff;letter-spacing:.02em}
.dn-sv .sv-who small{padding:2px 6px 1px;background:#ffd25a;color:#1a1200;font:italic 800 9.5px/1 'Barlow Condensed',sans-serif;letter-spacing:.14em;text-transform:uppercase;transform:skewX(-8deg)}
.dn-sv.done .sv-who small{background:#fff}
.dn-sv .sv-bub{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;gap:7px;padding:9px 13px 12px;border-left:5px solid var(--cc,#fff);
  background:linear-gradient(180deg,#171c35,#0d1124);clip-path:polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%)}
.dn-sv .sv-hd{display:flex;align-items:center;gap:8px;font:italic 800 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.2em;color:rgba(255,255,255,.6)}
.dn-sv .sv-hd .rec{display:flex;align-items:center;gap:5px;color:#fff}
.dn-sv .sv-hd .rec i{width:8px;height:8px;border-radius:50%;background:#ff4a3a;box-shadow:0 0 8px #ff4a3a;animation:svRec 1s steps(2) infinite}
.dn-sv .sv-hd .wv{flex:1;display:flex;align-items:center;gap:2px;height:16px}
.dn-sv .sv-hd .wv i{flex:1;max-width:4px;height:100%;background:var(--cc,#ffd25a);transform-origin:50% 50%;transform:scaleY(.15);opacity:.85;
  animation:svWave .32s ease-in-out var(--wd) var(--talk,14) alternate}
.dn-sv .sv-hd em{font-style:normal;color:rgba(255,255,255,.45)}
.dn-sv .sv-say{font-family:'Fredoka',sans-serif;font-weight:700;font-size:clamp(20px,calc(5.6 * var(--vw,4px)),25px);line-height:1.18;color:#fff;text-wrap:balance}
.dn-sv .sv-say::before{content:'“';margin-right:2px;color:var(--cc,#ffd25a);font-family:'Lilita One'}
.dn-sv .sv-say .w{white-space:nowrap}
.dn-sv .sv-say i{font-style:normal;display:inline-block;animation:svCh .3s cubic-bezier(.3,1.7,.5,1) var(--d) both}
.dn-sv .sv-say mark{position:relative;display:inline-block;color:#ffd25a;background:linear-gradient(180deg,transparent 78%,rgba(255,210,90,.55) 78% 92%,transparent 92%);padding:0 1px}
.dn-sv .sv-say mark[data-g]::after{content:attr(data-g);position:absolute;left:50%;top:100%;margin-top:1px;transform:translate(-50%,-4px);opacity:0;white-space:nowrap;
  padding:1px 6px 2px;background:#fff;color:#0d1124;font:600 11.5px/1.2 'Fredoka',sans-serif;letter-spacing:0;pointer-events:none;transition:opacity .35s .2s,transform .35s .2s}
.dn-sv.done .sv-say{line-height:2.05;padding-bottom:4px}
.dn-sv.done .sv-say mark[data-g]::after{opacity:1;transform:translate(-50%,0)}
.dn-sv .sv-bar{display:flex;align-items:stretch;gap:8px;min-height:44px}
.dn-sv .sv-pick{flex:1;min-width:0;display:flex;align-items:center;gap:8px;padding:6px 11px;background:rgba(255,255,255,.07);border-left:5px solid var(--rc,rgba(255,255,255,.25));
  font:600 13.5px/1.15 'Fredoka',sans-serif;color:rgba(255,255,255,.7);overflow:hidden;transition:border-color .25s}
.dn-sv .sv-pick i{flex:none;width:12px;height:12px;background:var(--rc,rgba(255,255,255,.3));transform:skewX(-10deg)}
.dn-sv .sv-pick b{font:400 17px/1 'Lilita One',sans-serif;color:#fff}
.dn-sv .sv-pick em{font-style:normal;opacity:.75;overflow:hidden;text-overflow:ellipsis}
.dn-sv .sv-pick.on{animation:svPick .35s cubic-bezier(.3,1.6,.5,1)}
.dn-sv .sv-go{flex:none;padding:0 16px;border:0;background:#fff;color:#0d1124;font:italic 800 19px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.06em;
  transform:skewX(-8deg);box-shadow:0 4px 0 rgba(0,0,0,.35);cursor:pointer;transition:transform .12s,opacity .2s}
.dn-sv .sv-go:disabled{background:transparent;color:rgba(255,255,255,.35);box-shadow:inset 0 0 0 2px rgba(255,255,255,.2);cursor:default}
.dn-sv .sv-go:not(:disabled){animation:svGo .35s cubic-bezier(.3,1.7,.5,1)}
.dn-sv .sv-go:active:not(:disabled){transform:skewX(-8deg) translateY(3px)}
.dn-sv .sv-poll{display:none;grid-template-columns:repeat(7,1fr);gap:4px;align-items:end;height:50px;padding:4px 6px 0;background:rgba(255,255,255,.06)}
.dn-sv .sv-poll.on{display:grid}
.dn-sv .sv-poll span{position:relative;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;font:italic 800 8.5px/1.1 'Barlow Condensed',sans-serif;letter-spacing:.04em;color:rgba(255,255,255,.7)}
.dn-sv .sv-poll span i{width:70%;transform:skewX(-8deg);background:var(--rc);height:calc(var(--p) * .3px);min-height:2px;animation:svGrow .6s cubic-bezier(.3,1.4,.5,1) both}
.dn-sv .sv-poll span em{font-style:normal;font-family:'Lilita One';font-size:10px;color:#fff}
.dn-sv.done .sv-bar,.dn-sv.done .sv-poll{display:none}
.dn-sv.done .sv-hd .wv i,.dn-sv.done .sv-hd .rec i{animation:none}
.dn-sv.done .sv-hd .rec{color:rgba(255,255,255,.6)}
.dn-sv.done .sv-hd .rec i{background:rgba(255,255,255,.4);box-shadow:none}
.fl-qtext.sv-qt{display:block;padding:0;background:none;border:0;box-shadow:none;text-align:left}
.sv-mean{position:relative;padding:9px 12px 10px;border-left:5px solid var(--rc,#ffd25a);background:linear-gradient(180deg,#1b2140,#0f142a);
  clip-path:polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%);animation:svMean .45s cubic-bezier(.3,1.5,.5,1)}
.sv-mean .sv-w{display:flex;flex-wrap:wrap;gap:4px 14px;margin-bottom:5px}
.sv-mean .sv-w span{font:600 15px/1.2 'Fredoka',sans-serif;color:rgba(255,255,255,.85)}
.sv-mean .sv-w b{font:400 18px/1 'Lilita One',sans-serif;color:#ffd25a}
.sv-mean p{margin:0;font:600 12.5px/1.35 'Fredoka',sans-serif;color:rgba(255,255,255,.8)}
.sv-mean .sv-rg{display:inline-block;margin-right:6px;padding:1px 7px 2px;background:var(--rc);color:#0d1124;font:italic 800 12px/1 'Barlow Condensed',sans-serif;letter-spacing:.08em;text-transform:uppercase;transform:skewX(-8deg)}
.sv-mean small{display:block;margin-top:4px;font:italic 800 10.5px/1.2 'Barlow Condensed',sans-serif;letter-spacing:.08em;color:rgba(255,255,255,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dn-tag.sv-rgt>div{background:rgba(7,10,24,.62);border-color:transparent;box-shadow:none;padding:1px 7px 2px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.92}
.dn-tag.sv-rgt>div::after{display:none}
.dn-tag.sv-pct>div{border-color:var(--tc);font-family:'Lilita One';font-weight:400;font-size:13px}
.dn-tag.sv-pct.win>div{font-size:17px;padding:3px 11px 4px;background:#ffd25a;color:#1a1200;border-color:#fff;box-shadow:0 4px 0 rgba(0,0,0,.45)}
/* cevap sahnesi: adım şeridi (SEÇİMİN → DOĞRU YÖRE → İL BONUSU → TÜRKİYE), kalabalık çubukları */
.sv-steps{display:flex;gap:4px;margin-bottom:7px}
.sv-steps i{flex:1;padding:3px 0 2px;text-align:center;font:italic 800 9.5px/1 'Barlow Condensed',sans-serif;letter-spacing:.12em;font-style:normal;color:rgba(255,255,255,.35);background:rgba(255,255,255,.06);transform:skewX(-10deg);transition:background .3s,color .3s}
.sv-steps i.on{background:#fff;color:#0d1124;animation:svStep .4s cubic-bezier(.3,1.7,.5,1)}
.sv-steps i.ok{background:#3ad06e;color:#06210f}
.sv-steps i.no{background:#ff5a46;color:#fff}
.sv-crowd{display:none;margin-top:7px}
.sv-crowd.on{display:block;animation:svMean .4s both}
.sv-crowd small{display:block;margin-bottom:4px;font:italic 800 10px/1 'Barlow Condensed',sans-serif;letter-spacing:.18em;color:rgba(255,255,255,.55)}
.sv-crowd .cb{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;align-items:end;height:40px}
.sv-crowd .cb span{display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;font:italic 800 8.5px/1.05 'Barlow Condensed',sans-serif;color:rgba(255,255,255,.6);text-align:center}
.sv-crowd .cb span i{width:72%;transform:skewX(-8deg);background:rgba(255,255,255,.28);height:calc(var(--p) * .26px + 2px);animation:svGrow .6s cubic-bezier(.3,1.4,.5,1) both;animation-delay:calc(var(--k) * .06s)}
.sv-crowd .cb span em{font-style:normal;font-family:'Lilita One';font-size:10.5px;color:#fff}
.sv-crowd .cb span.win i{background:#ffd25a}
.sv-crowd .cb span.win{color:#ffd25a}
.sv-crowd .cb span.me i{box-shadow:0 0 0 2px #fff}
@keyframes svStep{from{transform:skewX(-10deg) scale(.7)}to{transform:skewX(-10deg)}}
@keyframes svCh{from{opacity:0;transform:translateY(7px) scale(.6) rotate(-8deg)}to{opacity:1;transform:none}}
@keyframes svTalk{from{transform:scaleY(.35)}to{transform:scaleY(1.15)}}
@keyframes svWave{from{transform:scaleY(.15)}to{transform:scaleY(var(--wh,.9))}}
@keyframes svRec{50%{opacity:.25}}
@keyframes svGrow{from{height:0}}
@keyframes svPick{from{transform:translateX(-8px);opacity:.4}to{transform:none;opacity:1}}
@keyframes svGo{from{transform:skewX(-8deg) scale(.8)}to{transform:skewX(-8deg)}}
@keyframes svMean{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.dn-sv .sv-hd .wv i,.dn-sv .sv-hd .rec i{animation:none}}
`;

/** Ağız kelimesinin anlamı: vurgulanan parça ile anlam listesindeki kelime (ek almış hali de) eşleşir. */
function glossOf(mark, mean) {
	// düzenli ifade yalnız ASCII (sayfa windows-1252 okunabilir): harf sınıfı Unicode özelliğiyle
	const n = (s) => String(s).toLocaleLowerCase('tr-TR').replace(/[^\p{L} ]/gu, '').trim();
	const m = n(mark);
	let best = null;
	for (const [w, g] of mean || []) {
		const k = n(w);
		if (!k) continue;
		if (m === k || m.startsWith(k.slice(0, Math.max(3, k.length - 2))) || k.startsWith(m)) if (!best || k.length > best[0].length) best = [k, g];
	}
	return best ? best[1] : '';
}

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
	revealMs: 6200, // cevap filmi: seçimin (kopar, kamera iner) → doğru yöre (altın dalga) → il bonusu (en yükseğe kopar, kamera yaklaşır)
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
				<div class="sv-bub"><div class="sv-hd"><span class="rec"><i></i>KAYIT</span><span class="wv">${Array.from({ length: 22 }, (_, k) => `<i style="--wd:${((k * 37) % 11) * 0.03}s;--wh:${(0.35 + (((k * 53) % 13) / 13) * 0.65).toFixed(2)}"></i>`).join('')}</span><em>AĞIZ ATLASI</em></div><div class="sv-say">${sayHTML(v.say)}</div></div>
			</div>
			<div class="sv-poll"></div>
			<div class="sv-bar"><div class="sv-pick"><i></i><em>Haritadan yöreyi seç</em></div><button class="sv-go" disabled>BU YÖRE!</button></div>
		</div>`;
		rule(el, 'Yöreyi bul, ili bil');
		const root = el.querySelector('.dn-sv');
		// konuşma süresi: harfler dökülürken ağız ve dalga oynar (≈ harf × 35 ms), sonra durulur
		root.style.setProperty('--talk', String(Math.max(6, Math.round(([...plain(v.say)].length * 0.035 + 0.4) / 0.16))));
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
				g.fx(i, on ? 0.28 : 0, on ? 0.55 : 0);
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
				g.fx(sel, 0.28, 0.55);
			}
			sel = i;
			if (prev !== r) lightRegion(r, true, pt);
			// seçilen il: beyaz, haritadan kopup göğe yükselir (bölge renkleriyle karışmasın); öncekisi yerine iner
			g.paint(i, '#ffffff', pt.x, pt.z);
			g.fx(i, 2.1, 1);
			// kamera takibi: seçilen bölgeyi yumuşakça kadraja alır (komşular görünür kalır, başka yere dokunulabilir)
			const rb = app.boundsOf(IN_REG[r]);
			const mx = Math.max(6, (rb.x1 - rb.x0) * 0.35);
			const mz = Math.max(5, (rb.z1 - rb.z0) * 0.35);
			app.cam.fit({ x0: rb.x0 - mx, x1: rb.x1 + mx, z0: rb.z0 - mz - 3, z1: rb.z1 + mz }, { pitch: 0.92, pad: 1.05, top: cardTop(el), dur: 0.9, arc: 2 });
			if (selTag) {
				selTag.el.remove();
				app.ui.pins.splice(app.ui.pins.indexOf(selTag), 1);
			}
			selTag = tag(app, `<b>${esc(RNAME[r])}</b><em>${esc(p.name)}</em>`, p.x, p.z, 'big');
			selTag.el.style.setProperty('--tc', RHOT[r]);
			pick.style.setProperty('--rc', RHOT[r]);
			pick.innerHTML = `<i></i><b>${esc(RNAME[r])}</b><em>· ${esc(p.name)}</em>`;
			pick.classList.remove('on');
			void pick.offsetWidth;
			pick.classList.add('on');
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
				// CEVAP SAHNESİ (adım adım, ~6,5 sn; revealMs): 1) senin seçimin (il yeşil/kırmızı, harita sade koyu)
				// 2) doğru yöre yuvasından dalgayla altına boyanır, kamera iner 3) il bonusu kalkar 4) Türkiye ne dedi (kartta)
				const q = v.q;
				const homeI = BY_ID.get(v.ils[0]);
				const homeName = PROV[homeI]?.name || '';
				const meR = results.find((r) => r.p?.human);
				const myI = BY_ID.get(meR?.value?.il);
				const myD = myI != null ? verdict(v, PROV[myI].id) : null;
				// kart: anlam kutusu soru yazısının yerine; üstünde adım şeridi, altında kalabalık
				root.querySelector('.sv-from').textContent = homeName;
				for (const mk of root.querySelectorAll('.sv-say mark')) {
					const g = glossOf(mk.textContent, q.mean);
					if (g) mk.dataset.g = g;
				}
				// açıklama kutusu yok (haritayı kapatıyordu): anlam, sözün altında altyazıda. Kart küçük kalır, harita görünür.
				const top = cardTop(el);
				const later = (ms, fn) => setTimeout(() => el.isConnected && fn(), ms);
				const sizeOf = (list) => {
					const bb = app.boundsOf(list);
					return { x: (bb.x0 + bb.x1) / 2, z: (bb.z0 + bb.z1) / 2, s: Math.max(bb.x1 - bb.x0, bb.z1 - bb.z0) };
				};
				const lens = top / 2 - (1 - top) * 0.22; // hedef ekranın altındaki damganın üstünde kalsın
				// 1) senin seçimin: harita sade koyu, senin ilin yeşil/kırmızı kopar ve yükselir, kamera ona iner
				PROV.forEach((_, i) => {
					g.fx(i, 0, 0);
					g.paint(i, '#272d42');
				});
				if (myI != null) {
					const p = b.provinces[myI];
					g.paint(myI, myD.right ? '#3ad06e' : '#ff5a46', p.x, p.z);
					g.fx(myI, 2.1, 1);
					tag(app, `<b>SEÇİMİN</b><em>${esc(p.name)}</em>`, p.x, p.z, 'big').el.style.setProperty('--tc', myD.right ? '#3ad06e' : '#ff5a46');
					const m = sizeOf([myI]);
					app.cam.shot(m.x, m.z, { dist: m.s * 2.6 + 16, pitch: 0.78, yaw: app.cam.yaw + 0.2, dur: 1.1, arc: 3, lens });
				} else app.cam.fit(app.boundsOf(PROV.map((_, i) => i)), { pitch: 1.0, pad: 1.05, top, dur: 0.8, arc: 3 });
				// 2) doğru yöre: yuvasından altın dalgayla boyanır, kamera bölgeyi kucaklar
				later(1300, () => {
					const hp = b.provinces[homeI];
					for (const i of IN_REG[v.region]) {
						if (i === myI) continue;
						g.paint(i, '#ffe08a', hp.x, hp.z);
						g.fx(i, 0.3, 0.8);
					}
					const c = regionPoint(b, v.region);
					tag(app, `<b>${esc(RNAME[v.region])}</b><em>✓</em>`, c.x, c.z).el.style.setProperty('--tc', '#ffd25a');
					const rb = app.boundsOf(IN_REG[v.region]);
					app.cam.fit({ x0: rb.x0 - 1, x1: rb.x1 + 1, z0: rb.z0 - 1, z1: rb.z1 + 4 }, { pitch: 0.84, pad: 1.02, top, dur: 1.4, arc: 4 });
					sfx(app, 'reveal');
				});
				// 3) il bonusu: asıl il haritadan kopar, en yükseğe çıkar; kamera alçalarak yaklaşır ve etrafında döner
				later(2800, () => {
					for (const plate of v.ils) {
						const i = BY_ID.get(plate);
						const p = b.provinces[i];
						g.paint(i, i === homeI ? '#ffd25a' : '#ffe9a8', p.x, p.z);
						g.fx(i, i === homeI ? 2.5 : 0.9, 1);
					}
					const hp = b.provinces[homeI];
					tag(app, `<b>${esc(homeName)}</b><em>★ İL</em>`, hp.x, hp.z, 'big').el.style.setProperty('--tc', '#ffd25a');
					pop(app, hp.x, hp.z, '', { colors: ['#ffd25a', '#fff', RHOT[v.region]], n: 22, dist: 90 });
					sfx(app, myD?.bonus ? 'right' : 'star', { n: 4 });
					const h = sizeOf([homeI]);
					app.cam.shot(h.x, h.z, { dist: h.s * 2.1 + 13, pitch: 0.62, yaw: app.cam.yaw + 0.35, dur: 2.1, arc: 5, yawRate: 0.045, distRate: -0.014, decay: 0.2, lens });
				});
				if (meR) {
					const order = results.slice().sort((a, b2) => a.err - b2.err || a.time - b2.time);
					const win = order[0] === meR;
					if (myD?.bonus) stampLater(app, 'TAM İSABET!', 'gold', `Doğru yöre, doğru il: ${PROV[myD.i].name}`);
					else if (myD?.right) stampLater(app, 'DOĞRU YÖRE!', win ? 'gold' : '', `${RNAME[v.region]}; il bonusu ${homeName}`);
					else stampLater(app, 'YANLIŞ YÖRE', 'bad', `Bu ağız ${RNAME[v.region]}'in`);
				}
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
// v1.7: 25 söz, yalnız GERÇEK ağız işaretiyle (ses değişimi, ek ya da yöreye özgü kelime; yemek adı tek başına değil).
// Kaynaklar: Necati Demir ve Brendemoen (Trabzon), Aylin Çakır, TDK Türk Dünyası 47 (Ödemiş-Kiraz-Beydağ), Derleme
// Sözlüğü (gari, bayak), Ş. H. Akalın, Adana'nın Söz Varlığı (essah, deppe), Antalya ağızları bibliyografyası, Konya
// yerli ağzı şimdiki zaman (TDDED), Gemalmaz, Erzurum İli Ağızları, Ahmet Buran, Gakgo/Gakgoş (Elazığ; eskiden yanlışlıkla
// Antep yazılmıştı), Daşdemir ve Efendioğlu (kartol), Günşen (Antep -IcI), Erten, Diyarbakır Ağzı, Eckmann, Edirne Ağzı,
// Bayraktar, Aydamak. Elenenler (bölge ayırt etmiyor): ula, gardaş, kirve, süllüm, gadanı alım, abo, lo, yoh/çoh.
// Eski not: 21 söz, yedi bölgeden üçer. Yazım ağzın telaffuzunu yansıtır; [köşeli] parça sözün anahtarı. Kaba, argo ya da bir
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
	// Karadeniz: uşak (çocuk), iyelikte yuvarlaklaşma (-um), şimdiki zamanda -yrum, haçan (ne zaman)
	SV('dn-sv1', 1, 'karadeniz', [61, 53], '[Uşağum], gel sofraya, çorba soğuyacak!', [['uşağum', 'çocuğum']], 'Karadeniz’de “uşak” çocuk demektir; Trabzon ağzında iyelik eki yuvarlaklaşır: uşağım > uşağum, evim > evum.', W.nine('Fadime Nine', '#2f8a4a', '#4a7dd8')),
	SV('dn-sv2', 2, 'karadeniz', [61], 'Akşama hamsi [yapacaum], erken gel ha!', [['yapacaum', 'yapacağım']], 'Trabzon ağızlarında ünlüler yuvarlaklaşır: yapacağım > yapacaum, ettim > ettum, evim > evum.', W.abla('Cemile', '#2a1a10', '#d8542a')),
	SV('dn-sv3', 2, 'karadeniz', [61], 'Az bekle, şimdi [celiyrum]!', [['celiyrum', 'geliyorum']], 'Trabzon’da Akçaabat’ın doğusunda şimdiki zaman ekinin o’su düşer, g de c olur: geliyorum > celiyrum.', W.amca('Hasan Amca', '#4a4f5e', '#1f8a8a')),
	SV('dn-sv4', 3, 'karadeniz', [61, 53, 28], '[Haçan gelduk], kimse [yoğ idi]!', [['haçan gelduk', 'geldiğimizde'], ['yoğ idi', 'yoktu']], 'Haçan, Eski Türkçe “kaçan”dan gelir; Trabzon, Rize, Giresun ağızlarında “ne zaman, -dığı zaman” demektir.', W.amca('Rıfat Amca', '#3b3b4a', '#2f8a6a')),
	// Ege: -yon (2. ve 1. kişi), gari (artık), -Ip dur- şimdiki zamanı
	SV('dn-sv5', 1, 'ege', [35], 'Nereye [gidiyon] öyle, dur bi!', [['gidiyon', 'gidiyorsun']], 'İzmir’in Ödemiş, Kiraz, Beydağ ağızlarında şimdiki zamanın 2. tekil kişisi -(I)yon’dur: gidiyorsun > gidiyon.', W.amca('Ali Osman Amca', '#2b2b2b', '#2f9b8a')),
	SV('dn-sv6', 2, 'ege', [9, 35, 20], '[Gari] eve gidelim, akşam oldu!', [['gari', 'artık']], 'Gari “artık, bundan böyle” demektir; Derleme Sözlüğü’ne Aydın, İzmir (Tire, Ödemiş, Bergama) ve Denizli’den derlenmiştir.', W.nine('Hatice Nine', '#d84a6a', '#3a7bd5')),
	SV('dn-sv7', 2, 'ege', [9, 35, 48], 'Sabahtan beri ne [yapıp durun] öyle?', [['yapıp durun', 'yapıyorsun']], 'Ege ağızlarında şimdiki zaman “-Ip dur-” ile de kurulur: ne yapıyorsun > ne yapıp durun.', W.genc('Mehmet', '#2a1a10', '#e0803a')),
	SV('dn-sv8', 3, 'ege', [35], 'Durun, ben de [geliyon], bekleyin!', [['geliyon', 'geliyorum']], 'Ödemiş-Kiraz-Beydağ ağzında 1. tekil kişide -m yanında -n de kullanılır: geliyorum > geliyon. Yani “geliyon” = geliyorum!', W.teyze('Emine Teyze', '#3a8d6a', '#5a3218')),
	// Akdeniz: essah (gerçekten), Antalya buba/habar, deppe (bakır güğüm)
	SV('dn-sv9', 2, 'akdeniz', [1, 33], '[Essah] mı? Bizim oğlan sınavı kazanmış!', [['essah', 'gerçekten mi']], 'Adana ağzında essah / esahtan “gerçek mi, gerçekten” demektir; Arapça “en doğru” anlamındaki esahh’tan gelir.', W.teyze('Gülizar Teyze', '#2a8ad8', '#d8a03a')),
	SV('dn-sv10', 3, 'akdeniz', [7], '[Bubam] [habar] saldı, yaylaya çıkıyoz!', [['bubam', 'babam'], ['habar', 'haber']], 'Antalya ağızlarında baba > buba, haber > habar, asker > esker söylenişleri görülür; Yörük ağzının izidir.', W.nine('Fatma Nine', '#c2402a', '#3a9a7a')),
	SV('dn-sv11', 3, 'akdeniz', [1], '[Deppe]yi doldur, tarlaya su götürelim!', [['deppe', 'bakır güğüm']], 'Adana ağızlarında deppe “bakırdan, kulplu, ağzı kapaklı güğüm” demektir; Arapça dabba’dan alınmıştır.', W.amca('Durmuş Amca', '#b8892a', '#3a9a5a')),
	// İç Anadolu: bebe (Ankara), nörüyon (Yozgat, Kayseri), ne din / gı (Konya), bayaktan (Sivas, Yozgat)
	SV('dn-sv12', 1, 'icanadolu', [6], '[La bebe], akşam Kızılay’da buluşuyoz!', [['bebe', 'delikanlı, arkadaş']], 'Ankara ağzının en ünlü kelimesi “bebe”dir: genç erkeğe, arkadaşa seslenmede “la bebe” denir.', W.genc('Cemal', '#120c08', '#e04a3a')),
	SV('dn-sv13', 2, 'icanadolu', [66, 38], '[Nörüyon]? Çoktandır görünmüyon!', [['nörüyon', 'ne yapıyorsun']], 'Nörüyon “ne örüyorsun”, yani “ne iş görüyorsun, ne yapıyorsun” demektir; Yozgat ve Kayseri yöresinde yaygındır.', W.amca('Hüseyin Amca', '#6b4a2a', '#c9a23a')),
	SV('dn-sv14', 2, 'icanadolu', [42], '[Ne din] [gı]? Ben öyle demedim!', [['ne din', 'ne diyorsun'], ['gı', 'kız']], 'Konya yerli ağzında şimdiki zaman yerine geniş zaman kullanılır: ne diyorsun > ne din; “gı” da “kız” seslenmesidir.', W.teyze('Hacer Teyze', '#3a6ad8', '#d65a7a')),
	SV('dn-sv15', 3, 'icanadolu', [58, 66], '[Bayaktan] buradaydı, nereye kayboldu?', [['bayaktan', 'demin']], 'Bayak / bayaktan “demin, az önce” demektir; Derleme Sözlüğü’ne Sivas (Kangal, Gürün, Şarkışla) ve Yozgat’tan derlenmiştir.', W.usta('Ali Usta', '#c24a3a')),
	// Doğu Anadolu: dadaş (Erzurum), gakgoş (Elazığ), -irsen (Erzurum, Kars), kartol (Kars, Erzurum)
	SV('dn-sv16', 1, 'dogu', [25], '[Dadaş], hele otur, bir çay iç!', [['dadaş', 'kardeş, ağabey']], 'Dadaş Erzurum’da “ağabey, kardeş; yiğit delikanlı” demektir; Erzurumlular kendilerine de dadaş der.', W.amca('Ömer Amca', '#2c3e8a', '#1f6fb8')),
	SV('dn-sv17', 1, 'dogu', [23], '[Gakgoş], gel otur yanıma!', [['gakgoş', 'kardeş']], 'Gakgo / gakgoş Elazığ’a özgüdür: “kardeş, ağabey” demektir, sondaki -ş sevgi bildirir. Antep değil, Elazığ!', W.genc('Ahmet', '#3b2414', '#8a5ad0')),
	SV('dn-sv18', 2, 'dogu', [25, 36], 'Ne [diyirsen], bir daha söyle!', [['diyirsen', 'diyorsun']], 'Erzurum ve Kars ağızlarında şimdiki zaman eki -(y)ir’dir: diyirem (diyorum), diyirsen (diyorsun).', W.usta('Nuri Usta', '#2a6ad8')),
	SV('dn-sv19', 3, 'dogu', [36, 25], 'Pazardan iki kilo [kartol] al gel!', [['kartol', 'patates']], 'Kartol, Rusça kartofel’den gelir; Kars, Erzurum ve Bayburt ağızlarında “patates” yerine kullanılır.', W.teyze('Sevim Teyze', '#e0603a', '#3a5ab8')),
	// Güneydoğu: -IcI gelecek zaman (Antep), -i şimdiki zaman (Diyarbakır), -(I)y şimdiki zaman (Antep)
	SV('dn-sv20', 2, 'guneydogu', [27], 'Dayın akşam [gelici], sofrayı kur!', [['gelici', 'gelecek']], 'Gaziantep ağzında gelecek zaman eki -IcI / -UcU’dur: gelecek > gelici, geleceğim > gelicim.', W.usta('Halil Usta', '#2a8a5a')),
	SV('dn-sv21', 3, 'guneydogu', [21], 'Abin çarşıdan [geli], kapıyı aç!', [['geli', 'geliyor']], 'Diyarbakır merkez ağzında şimdiki zaman eki -i’dir: geliyor > geli. Çüngüş ve Çermik’te -iy biçimi kullanılır.', W.abla('Zeynep', '#1a120c', '#c24a6a')),
	SV('dn-sv22', 2, 'guneydogu', [27], 'Bak, otobüs [geliy], koş yetiş!', [['geliy', 'geliyor']], 'Gaziantep ağzında şimdiki zaman -(I)y ekiyle kurulur: geliyor > geliy, gidiyor > gidiy.', W.amca('Mahmut Amca', '#7a1f1f', '#d88a2a')),
	// Marmara (Trakya, Rumeli): ayde ve bre, söz sonunda ı/u > i, aydamak (sürmek)
	SV('dn-sv23', 1, 'marmara', [22, 39, 59], '[Ayde] [bre], vapuru kaçıracağız!', [['ayde', 'haydi'], ['bre', 'be, hey']], 'Ayde (haydi) Balkan dilleriyle ortak Rumeli söyleyişidir; “bre” seslenmesiyle birlikte Trakya’da çok duyulur.', W.genc('Salih', '#2c3e8a', '#6b5bd6')),
	SV('dn-sv24', 3, 'marmara', [22], 'Saat [alti] [oldi], nerde kaldın?', [['alti', 'altı'], ['oldi', 'oldu']], 'Edirne ağzında kelime sonundaki ı, u, ü i olur: altı > alti, oldu > oldi, köprü > köpri, buldu > buldi.', W.nine('Ayşe Nine', '#5a7ad8', '#b8403a')),
	SV('dn-sv25', 3, 'marmara', [22, 39, 59], 'İnekleri sen [ayda], akşam [oldi]!', [['ayda', 'sür'], ['oldi', 'oldu']], 'Aydamak Trakya ağzında “hayvanları sürmek, sevk etmek”tir; ölçünlü dilde yoktur. “Oldi” de Edirne ağzının söyleyişi.', W.amca('Rıza Amca', '#4a3a2a', '#c94a6a')),
];
