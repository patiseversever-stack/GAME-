// İL AVI · SICAK SOĞUK (deneme): kartta gizli ilin silueti (kuzey yukarıda) ve bir ipucu; oyuncu haritada bir ile
// dokunur. Doğruysa il altına boyanır. Değilse dokunduğu il UZAKLIĞIN RENGİNE boyanır (kızgın kırmızıdan buz
// mavisine), üstünde "340 km ↗" yazar ve yeni bir ipucu açılır. En çok 4 deneme. Worldle'ın silueti, Globle'ın
// sıcak-soğuk boyası ve Kelime Oyunu'nun açılan ipuçları, 3B maket haritada.
//
// Veri: il: gizli ilin plakası, hints: [ipucu, …] (ilk ipucu baştan görünür, her yanlışta bir sonraki açılır),
//       tries?: deneme hakkı (varsayılan 4)
// Değer: { taps: [plaka, …] } (sırayla). Sunucu uzaklığı ve yargıyı il merkezlerinden yeniden hesaplar.
// Görünüm: v.hedef = gizli ilin dizini (adı `target` DEĞİL: arayüz haritalı tiplerde v.target'ı iğne hedefi sanar).
// Tür 'closest': bulduysa err = deneme − 1 (ilk dokunuşta 0); bulamadıysa err = 10 + en yakın uzaklık/100.
// Çevrimiçi: gizli il yalnız sunucuda kalır; her dokunuşu sunucu yanıtlar (adam asmacadaki 'harf' gibi: act 'il'
// → ev { plaka, km, yön }). Siluet istemciye gider (tipin doğası); harita verisiyle eşleştirilebilir, bu yüzden
// çevrimiçinde siluet hafifçe sadeleştirilip ölçeği gizlenmiş olarak gönderilmeli.
// Joker: yarı yarıya → gizli ilin bölgesi parlar; seyirci → gizli ile komşu bir il parlar.

import { css, esc, pCorrect, clamp, buzz } from './util.js';
import { botTime } from './timing.js';
import { KM_PER_UNIT } from './types.js';
import { jokersOff, tagFloor } from './t_pick.js';
import { appOf, stamp, guard, onClose, cardTop, tag, pop, sfx, rule, stampLater, LOOK, ACT, DENEME_CSS } from './d_ortak.js';
import { setTimeout } from '../core/clock.js';
import DATA from '../data/turkiye.json';

const PROV = DATA.provinces;
const BY_ID = new Map(PROV.map((p, i) => [p.id, i]));
const REGION = { marmara: 'Marmara', karadeniz: 'Karadeniz', ege: 'Ege', akdeniz: 'Akdeniz', icanadolu: 'İç Anadolu', dogu: 'Doğu Anadolu', guneydogu: 'Güneydoğu Anadolu' };
const TRIES = 4;

/** Deneme karosuna sığmayan uzun il adlarının yaygın kısa adı (yalnız karoda; haritada tam ad). */
const SHORT = { Afyonkarahisar: 'Afyon', Kahramanmaraş: 'K.Maraş' };

/** Uzaklığın rengi ve adı (km). */
export const HEAT = [
	[120, '#ff3b1f', 'Kızgın'],
	[250, '#ff8a1a', 'Sıcak'],
	[450, '#ffc93a', 'Ilık'],
	[700, '#7cc8ff', 'Serin'],
	[Infinity, '#2f6bff', 'Buz gibi'],
];
const heat = (km) => HEAT.find((h) => km < h[0]);
const ARROWS = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'];

/** İki il merkezi arası kuş uçuşu (km) ve a'dan b'ye yön oku. */
export function between(a, b) {
	const pa = PROV[a].center;
	const pb = PROV[b].center;
	const dx = pb[0] - pa[0];
	const dy = pb[1] - pa[1]; // kuzey artı
	const km = Math.round(Math.hypot(dx, dy) * KM_PER_UNIT);
	const s = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
	return { km, dir: ARROWS[((s % 8) + 8) % 8] };
}

/** İlin silueti: SVG yolu (kuzey yukarıda), kutuya sığdırılmış. */
function silhouette(i, S = 100) {
	const rings = PROV[i].rings;
	let x0 = Infinity;
	let x1 = -Infinity;
	let y0 = Infinity;
	let y1 = -Infinity;
	for (const r of rings)
		for (let k = 0; k < r.length; k += 2) {
			x0 = Math.min(x0, r[k]);
			x1 = Math.max(x1, r[k]);
			y0 = Math.min(y0, -r[k + 1]);
			y1 = Math.max(y1, -r[k + 1]);
		}
	const s = (S - 8) / Math.max(x1 - x0, y1 - y0);
	const ox = (S - (x1 - x0) * s) / 2;
	const oy = (S - (y1 - y0) * s) / 2;
	const f = (x) => (Math.round(x * 10) / 10).toString();
	return rings
		.map((r) => {
			let d = '';
			for (let k = 0; k < r.length; k += 2) d += (k ? 'L' : 'M') + f(ox + (r[k] - x0) * s) + ' ' + f(oy + (-r[k + 1] - y0) * s);
			return d + 'Z';
		})
		.join('');
}

/** Dokunuşlardan sonuç: { found, tries, minKm } (sunucu da aynı hesabı yapar). */
function result(v, taps) {
	const list = (Array.isArray(taps) ? taps : []).map((id) => BY_ID.get(id)).filter((i) => i != null).slice(0, v.tries);
	const at = list.indexOf(v.hedef);
	let minKm = Infinity;
	for (const i of list) minKm = Math.min(minKm, i === v.hedef ? 0 : between(i, v.hedef).km);
	return { found: at >= 0, tries: at >= 0 ? at + 1 : list.length, minKm };
}

const CSS = /* css */ `
/* SICAK–SOĞUK RADARI (Arena v1 siyah/beyaz): solda dönen radar taramasında gizli ilin silueti; sağda termometre (en
   yakın denemenin ibresi kızgından buza) ve kilitli ipuçları; altta 4 karoluk deneme tahtası (karo uzaklığın rengine
   boyanır: il, km, yön). Haritada her dokunuşta ısı renginde şok dalgası; cevapta denemelerden gizli ile kesik iz. */
.dn-ia{display:flex;flex-direction:column;gap:10px}
.dn-ia-row{display:flex;gap:12px;align-items:stretch}
.dn-ia-sil{position:relative;flex:none;width:104px;height:116px;overflow:hidden;isolation:isolate;background:#0b1022;border-left:4px solid var(--hc,#fff);
  clip-path:polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%);transition:border-color .4s}
.dn-ia-sil .rg{position:absolute;inset:0;z-index:-2;background:
  linear-gradient(rgba(255,255,255,.09),rgba(255,255,255,.09)) 50% 0/1px 100% no-repeat,linear-gradient(rgba(255,255,255,.09),rgba(255,255,255,.09)) 0 46%/100% 1px no-repeat,
  repeating-radial-gradient(circle at 50% 46%,transparent 0 15px,rgba(255,255,255,.08) 15px 16px)}
.dn-ia-sil .sw{position:absolute;left:50%;top:46%;width:180px;height:180px;margin:-90px 0 0 -90px;z-index:-1;border-radius:50%;
  background:conic-gradient(from 0deg,transparent 0 290deg,color-mix(in srgb,var(--hc,#ffd25a) 45%,transparent) 360deg);animation:dnIaSw 2.6s linear infinite}
.dn-ia-sil svg{position:absolute;left:50%;top:46%;width:78px;height:78px;margin:-39px 0 0 -39px;overflow:visible}
.dn-ia-sil path{fill:#fff;stroke:var(--hc,#ffd25a);stroke-width:1.8;stroke-linejoin:round;filter:drop-shadow(0 0 6px rgba(255,255,255,.35));transition:fill .4s,stroke .4s}
.dn-ia-sil .lb{position:absolute;left:0;right:0;bottom:5px;text-align:center;font:italic 800 10px/1 'Barlow Condensed',sans-serif;letter-spacing:.24em;color:rgba(255,255,255,.55)}
.dn-ia-sil.won{--hc:#ffd25a}
.dn-ia-sil.won path{fill:#ffd25a;stroke:#fff;animation:dnIaWin .6s cubic-bezier(.3,1.8,.5,1)}
.dn-ia-sil.won .sw{animation-duration:.9s}
.dn-ia-sil.flash::after{content:'';position:absolute;inset:0;background:var(--hc);opacity:0;animation:dnIaFl .5s ease-out}
.dn-ia-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px}
.dn-ia-th{display:flex;flex-direction:column;gap:5px}
.dn-ia-th .tt{display:flex;align-items:baseline;gap:7px;min-height:18px}
.dn-ia-th small{font:italic 800 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.2em;color:rgba(255,255,255,.55)}
.dn-ia-th .tt b{font:400 18px/1 'Lilita One',sans-serif;color:#fff;font-variant-numeric:tabular-nums}
.dn-ia-th .tt em{margin-left:auto;font:italic 800 13px/1 'Barlow Condensed',sans-serif;letter-spacing:.14em;color:var(--hc,#fff);font-style:normal;text-transform:uppercase}
.dn-ia-th .tb{position:relative;display:flex;gap:3px;height:9px}
.dn-ia-th .tb i{flex:1;transform:skewX(-18deg);opacity:.85}
.dn-ia-th .nw{position:absolute;left:0;top:0;bottom:0;width:100%;transform:translateX(calc(var(--p,-.04) * 100%));transition:transform .7s cubic-bezier(.3,1.5,.5,1);pointer-events:none}
.dn-ia-th .nw::before{content:'';position:absolute;left:-2px;top:-5px;width:4px;height:19px;background:#fff;box-shadow:0 0 0 2px #0d1124,0 0 10px rgba(255,255,255,.8)}
.dn-ia-th.none .nw{opacity:0}
.dn-ia-hints{position:relative;display:flex;flex-direction:column;gap:4px;perspective:400px}
.dn-ia-hints span{display:flex;align-items:center;gap:7px;min-height:27px;padding:3px 8px;background:rgba(255,255,255,.07);font:600 13.5px/1.2 'Fredoka',sans-serif;color:#fff}
.dn-ia-hints span b{flex:none;padding:3px 6px 2px;background:#ffd25a;color:#1a1200;font:italic 800 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.1em;transform:skewX(-8deg)}
/* açık ipucu: yazı rozetin altına da akar (dar sütunda rozet satırın üçte birini yiyordu: 5 satırlık ipucu) */
.dn-ia-hints span:not(.lock){display:block;padding:5px 8px 4px}
.dn-ia-hints span:not(.lock) b{display:inline-block;margin-right:7px;vertical-align:1px}
/* kısa ekran: ipucu listesi bilinçli kayan liste (JS data-kaydir + max-height); son açılan ipucu görünür, üstte eskiler solar */
.dn-ia-hints>span{flex:none} /* kayan listede satırlar küçülmez (sıkışıp üst üste binmesin) */
.dn-ia-hints[data-kaydir]{overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;-webkit-mask:linear-gradient(180deg,transparent 0,#000 14px);mask:linear-gradient(180deg,transparent 0,#000 14px)}
.dn-ia-hints[data-kaydir]::-webkit-scrollbar{display:none}
/* dar kart (içerik ≤ 350 px): siluet küçük, ipucu yazısı ve deneme karoları sıkı (karoda uzun il adı kırpılıyordu) */
.dn-ia{container-type:inline-size}
@container (max-width:350px){
  .dn-ia-row{gap:10px}
  .dn-ia-sil{width:88px;height:102px}
  .dn-ia-sil svg{width:68px;height:68px;margin:-34px 0 0 -34px}
  .dn-ia-hints span{font-size:12.5px;line-height:1.18}
  .dn-ia-slots{gap:3px}
  .dn-ia-slots .sl{padding:4px 2px 4px 3px} /* "AFYONKARAHİSAR" 9 px'te sığsın (ortak sığdırıcı 8,5'e iniyordu) */
  .dn-ia-slots .sl .nm{letter-spacing:0}
}
.dn-ia-hints span.lock{background:rgba(255,255,255,.03);color:rgba(255,255,255,.4)}
.dn-ia-hints span.lock b{background:rgba(255,255,255,.16);color:rgba(255,255,255,.6)}
.dn-ia-hints span.lock em{display:flex;align-items:center;gap:5px;font:italic 800 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.16em;font-style:normal}
.dn-ia-hints span.lock em svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2.6}
.dn-ia-hints span.op{animation:dnIaFlip .5s cubic-bezier(.3,1.4,.5,1)}
.dn-ia-slots{display:grid;grid-template-columns:repeat(var(--n,4),1fr);gap:6px}
.dn-ia-slots .sl{position:relative;min-width:0;height:50px;display:flex;flex-direction:column;justify-content:center;padding:4px 7px;overflow:hidden;
  background:rgba(255,255,255,.06);border-bottom:3px solid rgba(255,255,255,.16);transform:skewX(-8deg)}
.dn-ia-slots .sl>*{transform:skewX(8deg)}
.dn-ia-slots .sl .nm{font:italic 800 11.5px/1.1 'Barlow Condensed',sans-serif;letter-spacing:.04em;text-transform:uppercase;color:rgba(255,255,255,.4);white-space:nowrap;overflow:hidden;text-overflow:clip}
.dn-ia-slots .sl .km{font:400 17px/1.05 'Lilita One',sans-serif;color:rgba(255,255,255,.25);white-space:nowrap}
.dn-ia-slots .sl .km i{font-style:normal;margin-left:3px}
.dn-ia-slots .sl.on{background:linear-gradient(160deg,color-mix(in srgb,var(--hc) 92%,#fff),color-mix(in srgb,var(--hc) 70%,#000));border-bottom-color:#fff;animation:dnIaSlot .45s cubic-bezier(.3,1.6,.5,1)}
.dn-ia-slots .sl.on .nm{color:rgba(0,0,0,.65)}
.dn-ia-slots .sl.on .km{color:#0d1124}
.dn-ia-slots .sl.win{--hc:#ffd25a;box-shadow:0 0 16px rgba(255,210,90,.6)}
.dn-ia-slots .sl.cur{border-bottom-color:#fff;background:rgba(255,255,255,.1)}
.dn-ia-slots .sl.cur .km{animation:dnIaBlink 1s steps(2) infinite}
/* haritada şok dalgası */
.dn-tag.mini>div{gap:0;padding:1px 6px 2px}
.dn-tag.mini b{display:none}
.dn-tag.mini em{font-size:11.5px}
.dn-tag.dn-rt>div{width:0;height:0;padding:0;border:0;background:none;box-shadow:none}
.dn-ring{position:absolute;left:-60px;top:-60px;width:120px;height:120px;border-radius:50%;border:4px solid var(--hc);opacity:0;animation:dnIaRing 1s cubic-bezier(.2,.7,.3,1) forwards}
.dn-ring+.dn-ring{animation-delay:.16s;border-width:2px}
.fl-line.dn-trail{border-top-width:3px;opacity:.95;filter:drop-shadow(0 0 4px rgba(0,0,0,.6));transition:opacity .5s}
.fl-line.dn-trail.out{opacity:0}
@keyframes dnIaSw{to{transform:rotate(360deg)}}
@keyframes dnIaWin{50%{transform:scale(1.18)}}
@keyframes dnIaFl{0%{opacity:.55}100%{opacity:0}}
@keyframes dnIaFlip{from{transform:rotateX(90deg);opacity:0}to{transform:none;opacity:1}}
@keyframes dnIaSlot{from{transform:skewX(-8deg) scale(.6);opacity:0}to{transform:skewX(-8deg);opacity:1}}
@keyframes dnIaBlink{50%{opacity:.2}}
@keyframes dnIaRing{0%{transform:scale(.15);opacity:1}100%{transform:scale(1.6);opacity:0}}
@keyframes dnIaTrail{from{opacity:0}to{opacity:.9}}
@media (prefers-reduced-motion:reduce){.dn-ia-sil .sw{animation:none}}
`;
/** Termometredeki yer (0 kızgın … 1 buz): eşit genişlikli beş dilim, dilim içinde doğrusal. */
const heatPos = (km) => {
	let lo = 0;
	for (let k = 0; k < HEAT.length; k++) {
		const hi = Number.isFinite(HEAT[k][0]) ? HEAT[k][0] : 1100;
		if (km < hi || k === HEAT.length - 1) return Math.min(1, (k + Math.min(1, (km - lo) / (hi - lo))) / HEAT.length);
		lo = hi;
	}
	return 1;
};
const LOCK = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
/** "Plakası 31" gibi cevabı ele veren son ipucu yerine komşuları (haritadan, her zaman doğru). */
function neighborHint(i) {
	const nb = (PROV[i].nb || []).map((id) => BY_ID.get(id)).filter((k) => k != null).map((k) => PROV[k].name).sort((x, y) => x.localeCompare(y, 'tr'));
	if (!nb.length) return '';
	if (nb.length === 1) return `Tek komşusu ${nb[0]}`;
	return `${nb.length} komşusu var; ikisi ${nb[0]} ve ${nb[1]}`;
}

export const ilavi = {
	time: 30,
	label: 'İl Avı',
	kind: 'closest',
	needsMap: true,
	jokers: ['yari', 'kahin'],
	fmt(v, value) {
		const r = result(v, value?.taps);
		return r.found ? `${r.tries}. denemede` : Number.isFinite(r.minKm) ? `${r.minKm} km` : '—';
	},
	sub(v, value) {
		const r = result(v, value?.taps);
		return r.found ? (r.tries === 1 ? 'ilk dokunuşta' : 'buldu') : 'en yakın uzaklık';
	},
	prepare(q) {
		const target = BY_ID.get(q.il);
		const hints = (q.hints || []).map((h) => (/^Plaka\S*\s+\d+$/.test(String(h).trim()) ? neighborHint(target) || h : h));
		const v = { q, hedef: target, tries: q.tries || TRIES, sil: silhouette(target), hints };
		return stamp(v, q, (q2, k, P, text) => {
			for (const h of v.hints) text(h);
			const n = v.tries;
			return {
				wait: 0.5 + 0.6,
				look: LOOK.orient + LOOK.image * 0.75 + LOOK.map,
				// her deneme: rengi ve oku oku, yeni ipucunu oku, haritada yeni yeri seç ve dokun (son deneme dahil)
				act: n * (ACT.mapTap + 0.8) + (n - 1) * 1.2,
			};
		});
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('ilavi', CSS);
		const app = appOf();
		const hints = v.hints;
		el.innerHTML = `<div class="dn-ia">
			<div class="dn-ia-row">
				<div class="dn-ia-sil"><i class="rg"></i><i class="sw"></i><svg viewBox="0 0 100 100"><path d="${v.sil}"/></svg><span class="lb">GİZLİ İL</span></div>
				<div class="dn-ia-info">
					<div class="dn-ia-th none"><div class="tt"><small>EN YAKIN</small><b>—</b><em></em></div><div class="tb">${HEAT.map((h) => `<i style="background:${h[1]}"></i>`).join('')}<span class="nw"></span></div></div>
					<div class="dn-ia-hints">${hints.map((h, k) => `<span class="${k ? 'lock' : ''}"><b>İPUCU ${k + 1}</b>${k ? `<em>${LOCK}YANLIŞTA AÇILIR</em>` : esc(h)}</span>`).join('')}</div>
				</div>
			</div>
			<div class="dn-ia-slots" style="--n:${v.tries}">${Array.from({ length: v.tries }, (_, k) => `<div class="sl${k ? '' : ' cur'}"><span class="nm">${k + 1}. DENEME</span><span class="km">?</span></div>`).join('')}</div>
		</div>`;
		rule(el, 'Az denemede bul');
		const root = el.querySelector('.dn-ia');
		const slots = [...root.querySelectorAll('.dn-ia-slots .sl')];
		const hintEls = [...root.querySelectorAll('.dn-ia-hints span')];
		const sil = root.querySelector('.dn-ia-sil');
		const th = root.querySelector('.dn-ia-th');
		let best = Infinity;
		// termometre: en yakın denemenin ibresi
		const gauge = (km) => {
			if (km >= best) return;
			best = km;
			const h = heat(km);
			th.classList.remove('none');
			th.style.setProperty('--p', heatPos(km).toFixed(3));
			th.style.setProperty('--hc', h[1]);
			th.querySelector('.tt b').textContent = `${km} km`;
			th.querySelector('.tt em').textContent = h[2];
			sil.style.setProperty('--hc', h[1]);
		};
		const flash = () => {
			sil.classList.remove('flash');
			void sil.offsetWidth;
			sil.classList.add('flash');
		};
		const fill = (k, cls, color, name, km) => {
			const s = slots[k];
			if (!s) return;
			s.classList.remove('cur');
			s.classList.add('on', ...cls);
			s.style.setProperty('--hc', color);
			s.innerHTML = `<span class="nm">${esc(name)}</span><span class="km">${km}</span>`;
			// dar karoda (320 px'te 54 px) en uzun iki il adı 9 px'te de sığmıyor (ortak sığdırıcı 8,5 px'e iniyordu): yaygın kısa
			// adı yazılır, tam adı karonun başlığında ve haritadaki rozette
			const nm = s.firstChild;
			if (SHORT[name]) {
				nm.style.fontSize = '9px';
				const over = nm.scrollWidth > nm.clientWidth + 1;
				nm.style.fontSize = '';
				if (over) {
					nm.textContent = SHORT[name];
					s.title = name;
				}
			}
			slots[k + 1]?.classList.add('cur');
		};
		const taps = [];
		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			root.classList.add('done');
			api.answer({ taps: taps.slice() });
		};
		if (!app) return { lock: () => (done = true), value: () => ({ taps: taps.slice() }), reveal() {}, destroy() {} };
		const b = app.board;
		const g = guard(app);
		g.allActive();
		const lit = [];
		g.dark(lit); // karanlık harita: sahip renkleri yok, yalnız denenen iller ışıkta
		// kısa ekranda kart ekranın en çok ~%62'sini örter (haritaya dokunulacak): açılan ipuçları sığmazsa ipucu listesi bilinçli
		// kayan liste olur (data-kaydir), son açılan ipucu görünür. 568 px'te üç yanlıştan sonra kart ekranın %89'unu kaplıyor,
		// dördüncü dokunuşa harita kalmıyordu. Kart büyürse harita kadrajı kartın altına yeniden ortalanır.
		const hintsEl = root.querySelector('.dn-ia-hints');
		let lastTop = -1;
		const fitCard = () => {
			const card = el.closest('.fl-q');
			const host = card?.parentElement;
			if (!hintsEl.isConnected || !host) return;
			hintsEl.style.maxHeight = '';
			const H = host.clientHeight || innerHeight;
			const over = card.offsetTop + card.offsetHeight - Math.min(H * 0.62, H - 210);
			const kay = over > 1;
			if (kay) hintsEl.style.maxHeight = Math.max(58, hintsEl.offsetHeight - over) + 'px';
			hintsEl.toggleAttribute('data-kaydir', kay);
			const last = hintEls.filter((h) => !h.classList.contains('lock')).pop();
			if (kay && last) hintsEl.scrollTop = Math.max(0, last.offsetTop + last.offsetHeight - hintsEl.clientHeight);
			const top = cardTop(el);
			if (!done && lastTop >= 0 && Math.abs(top - lastTop) > 0.03) app.cam.fit(app.boundsOf(PROV.map((_, i) => i)), { pitch: 1.02, pad: 1.03, top, dur: 0.6 });
			if (!done) lastTop = top;
			tagFloor(app, top);
		};
		queueMicrotask(() => {
			if (!el.isConnected) return;
			fitCard();
			app.cam.fit(app.boundsOf(PROV.map((_, i) => i)), { pitch: 1.02, pad: 1.03, top: cardTop(el), dur: 0.7 });
		});
		// haritada ısı renginde şok dalgası (iki halka; yazı rozeti değil, çarpışma düzenine girmez)
		const ring = (p, color) => {
			const r = tag(app, `<i class="dn-ring" style="--hc:${color}"></i><i class="dn-ring" style="--hc:${color}"></i>`, p.x, p.z, 'dn-rt');
			setTimeout(() => {
				r.el.remove();
				const L = app.ui.pins;
				const at = L.indexOf(r);
				if (at >= 0) L.splice(at, 1);
			}, 1300);
		};
		const trails = [];
		const tagsOn = []; // denemelerin harita rozetleri
		const open = (k) => {
			const h = hintEls[k];
			if (!h || !h.classList.contains('lock')) return;
			h.classList.remove('lock');
			h.classList.add('op');
			h.innerHTML = `<b>İPUCU ${k + 1}</b>${esc(hints[k])}`;
			sfx(app, 'iaHint', { delay: 0.25 });
			fitCard();
		};
		api.onMapTap((pt) => {
			if (done) return;
			const i = b.pick(pt.x, pt.z);
			if (i < 0) return;
			const p = b.provinces[i];
			if (taps.includes(p.id)) {
				app.ui.toast?.(`${p.name} zaten denendi`, { tone: 'warn', ms: 1200 });
				return;
			}
			taps.push(p.id);
			const k = taps.length - 1;
			lit.push(i);
			g.dark(lit);
			if (i === v.hedef) {
				g.paint(i, '#ffd25a', pt.x, pt.z);
				g.fx(i, 0.6, 1);
				fill(k, ['win'], '#ffd25a', p.name, 'BULDUN');
				slots.slice(k + 1).forEach((s) => s.classList.remove('cur'));
				gauge(0);
				ring(p, '#ffd25a');
				tag(app, `<b>${esc(p.name)}</b><em>✓</em>`, p.x, p.z, 'big').el.style.setProperty('--tc', '#7dff9a');
				root.querySelector('.dn-ia-sil').classList.add('won');
				pop(app, p.x, p.z, 'BULDUN!', { colors: ['#ffd25a', '#7dff9a', '#fff'], n: 18, dist: 90, cls: 'dn dn-gold' });
				sfx(app, 'right', { n: 5 });
				sfx(app, 'fireworks', { delay: 0.25 });
				buzz(14);
				return finish();
			}
			const d = between(i, v.hedef);
			const h = heat(d.km);
			g.paint(i, h[1], pt.x, pt.z);
			g.fx(i, 0.3, 0);
			fill(k, [], h[1], p.name, `${d.km}<i>${d.dir}</i>`);
			gauge(d.km);
			flash();
			ring(p, h[1]);
			// haritada yalnız son deneme tam rozet; öncekiler küçük km çipine iner (adlar karttaki tahtada)
			for (const o of tagsOn) if (!o.el.classList.contains('mini')) {
				o.el.classList.add('mini');
				o.w = null; // arayüz yeniden ölçsün
			}
			const tg = tag(app, `<b>${esc(p.name)}</b><em>${d.km} km ${d.dir}</em>`, p.x, p.z);
			tg.el.style.setProperty('--tc', h[1]);
			tagsOn.push(tg);
			pop(app, p.x, p.z, `${h[2]}!`, { colors: [h[1], '#fff'], n: d.km < 250 ? 14 : 6, dist: 46, cls: `dn ${d.km < 450 ? 'dn-hot' : 'dn-cold'}` });
			sfx(app, 'iaHeat', { n: HEAT.indexOf(h) });
			buzz(d.km < 250 ? 20 : 8);
			open(taps.length);
			if (taps.length >= v.tries) setTimeout(finish, 450);
		});
		const close = onClose(el, () => {
			g.restore();
			for (const l of trails) {
				l.el.remove();
				const at = app.ui.lines.indexOf(l);
				if (at >= 0) app.ui.lines.splice(at, 1);
			}
		});
		return {
			lock() {
				done = true;
				root.classList.add('done');
			},
			value: () => ({ taps: taps.slice() }),
			joker(e) {
				if (e?.zone) {
					for (const i of e.zone) g.fx(i, 0.15, 1);
					g.dark([...lit, ...e.zone]); // ipucu bölgesi karanlıkta aydınlanır
					app.ui.toast?.(e.text, { tone: 'good', ms: 2000 });
				}
			},
			reveal(results) {
				jokersOff(el); // joker çubuğu kalkar: kart kısalır, damga ve harita açıkta (kadraj aşağıda bundan sonra)
				done = true;
				root.classList.add('done');
				const t = b.provinces[v.hedef];
				const won = taps.includes(t.id);
				for (const o of tagsOn) if (!o.el.classList.contains('mini')) {
					o.el.classList.add('mini');
					o.w = null;
				}
				if (!won) {
					lit.push(v.hedef);
					g.dark(lit);
					g.paint(v.hedef, '#ffd25a', t.x, t.z);
					g.fx(v.hedef, 0.6, 1);
					tag(app, `<b>${esc(t.name)}</b>`, t.x, t.z, 'big').el.style.setProperty('--tc', '#ffd25a');
				}
				// iz: her denemeden gizli ile kesik çizgi (denemenin ısı renginde); kart kapanınca kalkar
				for (const id of taps) {
					const j = BY_ID.get(id);
					if (j == null || j === v.hedef) continue;
					const e = document.createElement('i');
					e.className = 'fl-line dn-trail';
					e.style.borderTopColor = heat(between(j, v.hedef).km)[1];
					app.ui.$.pins.insertBefore(e, app.ui.$.pins.firstChild);
					const l = { el: e, a: { x: b.provinces[j].x, z: b.provinces[j].z }, b: { x: t.x, z: t.z } };
					app.ui.lines.push(l);
					trails.push(l);
				}
				if (!won) sfx(app, 'iaReveal');
				// kadraj: gizli il ve bütün denemeler; alt pay geniş (damga ekranın altında: gizli il onun üstünde kalsın)
				const list = [v.hedef, ...taps.map((id) => BY_ID.get(id))];
				const bb = app.boundsOf(list);
				const top = cardTop(el);
				app.cam.fit({ x0: bb.x0 - 4, x1: bb.x1 + 4, z0: bb.z0 - 4, z1: bb.z1 + Math.max(10, (bb.z1 - bb.z0) * 0.7) }, { pitch: 1.0, pad: 1.15, top, dur: 0.9, arc: 3 });
				// sinematik son: genel bakıştan sonra kamera gizli ile alçalarak yaklaşır ve yavaşça etrafında döner
				const tb = app.boundsOf([v.hedef]);
				const size = Math.max(tb.x1 - tb.x0, tb.z1 - tb.z0);
				setTimeout(() => {
					if (!el.isConnected) return;
					// yakın çekimde iz çizgileri söner (denemeler kadraj dışında kalır, çizgiler hedefte kesişip karışıyordu)
					for (const l of trails) l.el.classList.add('out');
					app.cam.shot(t.x, t.z, { dist: size * 2.1 + 9, pitch: 0.6, yaw: app.cam.yaw + 0.35, dur: 1.8, arc: 5, yawRate: 0.045, distRate: -0.015, decay: 0.2, lens: top / 2 - (1 - top) * 0.24 });
				}, 1100);
				const meR = results.find((r) => r.p?.human);
				if (meR) {
					const order = results.slice().sort((a, b2) => a.err - b2.err || a.time - b2.time);
					const r = result(v, meR.value?.taps);
					const win = order[0] === meR;
					// damga kısa (harita kartında en çok ~14 harf sığar), ayrıntı alt satırda
					if (r.found) stampLater(app, r.tries === 1 ? 'İLK DOKUNUŞTA!' : `${r.tries}. DENEMEDE!`, win ? 'gold' : 'bad', win ? `${t.name} bulundu` : `${order[0].name} daha az denemede buldu`);
					else stampLater(app, win ? 'EN YAKIN SEN!' : 'BULAMADIN', win ? 'gold' : 'bad', `Gizli il: ${t.name}`);
				}
			},
			destroy: close,
		};
	},
	joker(id, v, R) {
		const t = PROV[v.hedef];
		if (id === 'yari') {
			const zone = PROV.map((p, i) => (p.region === t.region ? i : -1)).filter((i) => i >= 0);
			return { zone, text: `Gizli il ${REGION[t.region] || ''} Bölgesi'nde` };
		}
		if (id === 'kahin') {
			const nb = t.nb.map((id2) => BY_ID.get(id2)).filter((i) => i != null);
			const i = nb[Math.floor(R() * nb.length)];
			return i == null ? null : { zone: [i], text: `Seyirci: gizli il ${PROV[i].name}'e komşu` };
		}
		return null;
	},
	/** Çevrimiçi görünüm: gizli il ve sonraki ipuçları sunucuda; siluet ve ilk ipucu gider. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.hedef;
		delete o.q.il;
		o.hints = o.hints.map((h, k) => (k ? '' : h)); // sonrakiler yanlış denemede sunucudan gelir
		delete o.q.hints;
		return o;
	},
	judge(v, value) {
		const r = result(v, value?.taps);
		if (r.found) return { correct: true, err: r.tries - 1, tries: r.tries };
		return { correct: false, err: Number.isFinite(r.minKm) ? 10 + r.minKm / 100 : 99 };
	},
	bot(v, skill, R) {
		// bilen bot 1–2 denemede, bilmeyen sıcak-soğukla yaklaşır; her denemede komşulara doğru ilerler
		const p = clamp(pCorrect(skill, v.q.diff) + 0.1, 0.1, 0.95);
		const taps = [];
		let cur = -1;
		for (let k = 0; k < v.tries; k++) {
			if (R() < p * (0.55 + 0.25 * k)) {
				taps.push(PROV[v.hedef].id);
				break;
			}
			// yanlış deneme: önce uzakta bir il, sonra gizli ile her seferinde biraz daha yakın
			const want = (k === 0 ? 350 + R() * 500 : 120 + R() * 260) * (1.2 - skill * 0.5);
			let best = -1;
			let bd = Infinity;
			for (let i = 0; i < PROV.length; i++) {
				if (i === v.hedef || taps.includes(PROV[i].id)) continue;
				const d = Math.abs(between(i, v.hedef).km - want) + (cur >= 0 ? between(i, cur).km * 0.2 : 0);
				if (d < bd) {
					bd = d;
					best = i;
				}
			}
			if (best < 0) break;
			cur = best;
			taps.push(PROV[best].id);
		}
		return { value: { taps }, time: botTime(v, R, skill, 0.15 + 0.15 * taps.length, 1) };
	},
};
