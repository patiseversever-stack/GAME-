// UÇUŞ ROTASI (yeni · grup 3): 4–6 durağı doğru sırayla uç. Duraklar haritada gece içinde ışıkta ve adlarıyla, kartta
// karışık kartlar halinde. Oyuncu kartlara ya da haritadaki illere sırayla dokunur; her yeni durakta küçük uçak bir
// önceki duraktan kavisli, kesik çizgili ayağı uçar (3B yay: yükselir ve gidiş yönünün soluna bükülür; altında yerde
// gölgesi ve gölge izi). Yerleşmiş bir durağa yeniden dokunmak rotayı oradan kısaltır (geri alma). Son durak konunca
// uçak iner ve rota gönderilir.
//
// İmza an (cevap): oyuncunun rotası hayalete döner (soluk kesik çizgi), saptığı ayak kırmızı yanar; altın uçak doğru
// rotayı uçar: arkasında parlayan altın iz ve ışıyan kontrail, her durakta altın madalya, yere yayılan iniş nabzı, yıldız
// patlaması ve yükselen bir nota. Kamera alçalıp uçağı izler (biraz önüne, varacağı durağa bakar); son durakta bütün
// rotaya geri çekilir. Oyuncunun uçağı da kendi renginde kontrail bırakır, her inişte nabız atar. Kartta doğru sıra (her durağın notu: tarih, yer) ve her oyuncunun mini rotası.
//
// Puan (tür 'closest'): EN UZUN DOĞRU BAŞLANGIÇ (kalkıştan ilk sapmaya kadar doğru durak sayısı). Rota bir zincir:
// bir durakta sapan uçak sonraki her ayağı yanlış yere uçar (navigasyondaki gibi). Bu kural rotayı kalkıştan başlayarak
// düşünerek kurmayı ödüllendirir ve cevap filmine birebir oturur (sapmaya kadar altın, sapılan ayak kırmızı, sonrası
// hayalet). Eşitlikte doğru yerdeki durak sayısı (3–4 kişide sıralama incelsin), sonra süre.
//   err = (n − başlangıç) + 0,1 · (n − doğru yer) / n; correct = bütün rota doğru.
//
// Veri: q, duraklar: [{ il: plaka, ad?: kartta yazan (yoksa il adı), not: cevapta durağın notu }, …] DOĞRU sırada.
// Değer: { route: [plaka, …] } (oyuncunun sırası; eksik olabilir: süre dolunca o ana kadarki rota sayılır).
// Görünüm: v.sira (doğru sıra, il dizinleri), v.kart (kartların karışık sırası). Çevrimiçi: publicView doğru sırayı
// ve notları taşımaz (kartlar zaten karışık).
// Joker: yarı yarıya → kalkış ve varış durakları kartta ve haritada altın halkayla belirir.

import { css, esc, shuffle, pCorrect, clamp, buzz } from './util.js';
import { botTime } from './timing.js';
import { jokersOff } from './t_pick.js';
import { appOf, stamp, guard, onClose, onOpen, cardTop, pop, tapX, sfx, rule, stampLater, LOOK, ACT, DENEME_CSS } from './d_ortak.js';
import { clock, setTimeout, clearTimeout } from '../core/clock.js';
import { katman, adlar, el as sv, digit, CROSS, PLANE, PLANE_TAIL, yayNok, aci, damga, damgaYeri, sigdir, cerceve, DAMGA_CSS } from './d_rota_katman.js';
import { setNightTone } from '../gfx/env.js';
import DATA from '../data/turkiye.json';

const PROV = DATA.provinces;
const BY_ID = new Map(PROV.map((p, i) => [p.id, i]));
const GOLD = '#ffd25a';
const LEG = 0.78; // oyuncu ayağı (sn)
const GLEG = 0.62; // altın uçuş ayağı (sn)
const DY = -10; // rota çizimi il merkezinin biraz üstünde (3B il adı altta okunsun)
const MIN_MK = 27; // iki durak işaretinin ekranda en yakın merkez uzaklığı (px)
const MK_DY = -21; // durak işareti: ad hapının üstünde (ad noktasından px)

/** Rotadan sonuç: { pre (doğru başlangıç), pos (doğru yerdeki durak), n, all } (sunucu da aynı hesabı yapar). */
export function sonuc(v, route) {
	const sira = Array.isArray(v.sira) ? v.sira : []; // çevrimiçi görünümde yok (cevapla gelir)
	const n = sira.length;
	const ids = [];
	const seen = new Set();
	for (const id of Array.isArray(route) ? route : []) {
		const i = BY_ID.get(id);
		if (i == null || seen.has(i) || !sira.includes(i)) continue;
		seen.add(i);
		ids.push(i);
	}
	let pre = 0;
	while (pre < n && ids[pre] === sira[pre]) pre++;
	let pos = 0;
	for (let k = 0; k < n; k++) if (ids[k] === sira[k]) pos++;
	return { pre, pos, n, all: pre === n, ids };
}

const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const PARK_X = 20; // park yeri: durak işaretinin üst yanı (numara da ilin adı da okunsun); yan, gelen ayağın karşısı
const PARK_Y = -6;

/** Kartta (DOM) çizgi rakam: <svg> içinde. */
const NUM = (k, cls = '') => `<svg class="dgt ${cls}" viewBox="-6 -6 12 12" aria-hidden="true"><path d="${digit(k)}"/></svg>`;
const PLANE_ICO = `<svg class="pi" viewBox="-17 -14 34 28" aria-hidden="true"><path d="${PLANE}"/></svg>`;

const CSS = /* css */ `
.yn-rt{display:flex;flex-direction:column;gap:6px;container-type:inline-size}
.yn-rt-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
/* durak kartı: açık zeminli eğik levha (arena dili); yerleşince koyulaşır, sol üst köşede oyuncu renginde durak numarası */
.yn-rt-c{position:relative;display:flex;align-items:center;min-width:0;min-height:44px;padding:0 9px 0 13px;border:0;border-radius:3px;cursor:pointer;
  background:linear-gradient(180deg,#fff,#e1e7f3);color:#0e1430;transform:skewX(-7deg);box-shadow:0 3px 0 rgba(0,0,0,.35);text-align:left;
  font:italic 800 15.5px/1.05 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.03em;text-transform:uppercase;transition:box-shadow .2s}
.yn-rt-c:active{transform:skewX(-7deg) translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.35)}
.yn-rt-c>*{transform:skewX(7deg)}
.yn-rt-c .nb{position:absolute;left:-6px;top:-8px;z-index:1;width:23px;height:23px;border-radius:50%;display:none;place-items:center;background:var(--pc);box-shadow:0 0 0 2px #fff,0 2px 6px rgba(0,0,0,.45)}
.yn-rt-c .nb .dgt{width:12px;height:12px;overflow:visible}
.yn-rt-c .dgt path{fill:none;stroke:#fff;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round}
.yn-rt-c .lb{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}
.yn-rt-c .lb b{font:inherit;white-space:nowrap;overflow:hidden}
.yn-rt-c .lb small{display:none;font:600 11px/1.1 'Fredoka',sans-serif;letter-spacing:0;text-transform:none;white-space:nowrap;overflow:hidden}
.yn-rt-c.on{background:linear-gradient(180deg,#26305a,#141a38);color:#fff;box-shadow:inset 0 -3px 0 var(--pc),0 3px 0 rgba(0,0,0,.35)}
.yn-rt-c.on .nb{display:grid}
.yn-rt-c.on.nw .nb{animation:ynRtNb .45s cubic-bezier(.3,1.8,.5,1)}
.yn-rt-c.on.last{background:linear-gradient(180deg,#34407a,#1a2148)}
.yn-rt-c.hint{box-shadow:inset 0 0 0 2.5px ${GOLD},0 0 12px rgba(255,210,90,.6),0 3px 0 rgba(0,0,0,.35)}
.yn-rt-c.shk{animation:ynRtShk .35s}
.yn-rt-hint{min-height:15px;font:600 12px/1.25 'Fredoka',sans-serif;color:#cfe0ff;text-align:center;opacity:.9}
.yn-rt.done .yn-rt-hint{visibility:hidden}
.yn-rt.done .yn-rt-c{cursor:default}
/* cevap: kartlar doğru sırada, altın numara ve not; oyuncunun hükmü sol kenarda */
.yn-rt.rv .yn-rt-c{background:linear-gradient(180deg,#1b2346,#10152d);color:#fff;box-shadow:0 3px 0 rgba(0,0,0,.35);animation:ynRtInC .4s calc(var(--k) * 80ms) cubic-bezier(.2,.9,.3,1.2) both}
.yn-rt.rv .yn-rt-c .nb{display:grid;background:linear-gradient(160deg,#ffe48a,#e0a21a);box-shadow:0 0 0 2px #fff6cc,0 2px 6px rgba(0,0,0,.45)}
.yn-rt.rv .yn-rt-c .dgt path{stroke:#3a2200}
.yn-rt.rv .yn-rt-c .lb small{display:block;color:#ffe9a8}
.yn-rt.rv .yn-rt-c.ok{box-shadow:inset 4px 0 0 #5ff08a,0 3px 0 rgba(0,0,0,.35)}
.yn-rt.rv .yn-rt-c.bad{box-shadow:inset 4px 0 0 #ff4a3a,0 3px 0 rgba(0,0,0,.35);background:linear-gradient(180deg,#3a1420,#1c0f1c)}
.yn-rt-sb{display:none;grid-template-columns:repeat(var(--c,2),minmax(0,1fr));gap:6px}
.yn-rt.rv .yn-rt-sb{display:grid}
.yn-rt.rv .yn-rt-hint{display:none}
.yn-rt-sb .r{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto auto;column-gap:7px;row-gap:4px;align-items:center;min-height:44px;padding:5px 8px 5px 5px;
  background:rgba(255,255,255,.06);box-shadow:inset 3px 0 0 var(--c);animation:ynRtIn .4s calc(var(--k) * 90ms + .25s) cubic-bezier(.2,.9,.3,1.2) both}
.yn-rt-sb .r.win{background:linear-gradient(100deg,rgba(255,210,90,.24),rgba(255,210,90,.05));box-shadow:inset 3px 0 0 var(--c),inset 0 0 0 1.5px rgba(255,210,90,.75)}
.yn-rt-sb .r>b.fl-who{grid-row:1 / 3;position:relative;inset:auto;top:auto;right:auto;margin:0;width:34px;height:34px;border-radius:9px;border:2px solid #fff;box-shadow:0 2px 0 rgba(0,0,0,.35);overflow:hidden;transform:skewX(-6deg)}
.yn-rt-sb .r>b.fl-who.me{box-shadow:0 0 0 2px ${GOLD},0 2px 0 rgba(0,0,0,.35)}
.yn-rt-sb .r>b.fl-who .fl-avs{display:block;width:100%;height:100%}
.yn-rt-sb .hd{min-width:0;display:flex;align-items:baseline;gap:6px}
.yn-rt-sb .nm{min-width:0;flex:1;font:italic 800 13.5px/1.05 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#fff;white-space:nowrap;overflow:hidden}
.yn-rt-sb .hd b{flex:none;font:400 18px/1 'Lilita One',sans-serif;color:${GOLD}}
.yn-rt-sb .hd b small{font-size:12px;color:#cfe0ff}
.yn-rt-sb .mr{display:flex;align-items:center;gap:0;min-width:0}
.yn-rt-sb .mr i{flex:none;width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.22)}
.yn-rt-sb .mr i.ok{background:#5ff08a;box-shadow:0 0 0 1.5px rgba(0,0,0,.35)}
.yn-rt-sb .mr i.x{width:10px;height:10px;background:#ff4a3a;box-shadow:0 0 0 1.5px #fff}
.yn-rt-sb .mr u{flex:1;min-width:2px;max-width:12px;height:2px;background:rgba(255,255,255,.18)}
.yn-rt-sb .mr u.ok{background:#5ff08a}
/* 3–4 oyuncu: tek satır, ad yok (portre ve renk yeter) */
.yn-rt-sb.k4 .r{grid-template-columns:minmax(0,1fr);justify-items:center;padding:5px 4px;row-gap:4px}
.yn-rt-sb.k4 .r>b.fl-who{grid-row:auto;width:30px;height:30px}
.yn-rt-sb.k4 .nm{display:none}
.yn-rt-sb.k4 .hd{justify-content:center}
@container (max-width:330px){.yn-rt-c{font-size:14.5px;padding:0 7px 0 12px}}
@media (max-height:640px){.yn-rt-hint{display:none}.yn-rt.rv .yn-rt-c .lb small{display:none}}
@keyframes ynRtNb{0%{transform:skewX(7deg) scale(.3)}60%{transform:skewX(7deg) scale(1.25)}100%{transform:skewX(7deg)}}
@keyframes ynRtShk{25%{transform:skewX(-7deg) translateX(-5px)}50%{transform:skewX(-7deg) translateX(5px)}75%{transform:skewX(-7deg) translateX(-3px)}100%{transform:skewX(-7deg)}}
@keyframes ynRtInC{from{opacity:0;transform:skewX(-7deg) translateY(6px) scale(.96)}to{opacity:1;transform:skewX(-7deg)}}
@keyframes ynRtIn{from{opacity:0;transform:translateY(6px) scale(.96)}to{opacity:1;transform:none}}
`;

/** Harita katmanı (SVG). */
const KCSS = /* css */ `
.yn-rtk .lg{fill:none;stroke-linecap:round;stroke-linejoin:round}
.yn-rtk .lg.sh{stroke:rgba(4,8,20,.42);stroke-width:3;stroke-dasharray:3 7}
.yn-rtk .lg.me{stroke:var(--pc);stroke-width:3.6;stroke-dasharray:8 7;animation:ynRtDash 1.1s linear infinite}
.yn-rtk .lg.meb{stroke:rgba(255,255,255,.9);stroke-width:6.6;stroke-dasharray:8 7;animation:ynRtDash 1.1s linear infinite}
.yn-rtk .lg.gh{stroke:rgba(235,240,255,.38);stroke-width:2.6;stroke-dasharray:5 7;animation:none;transition:stroke .4s}
.yn-rtk .lg.ghb{stroke:rgba(0,0,0,.25);stroke-width:4.4;stroke-dasharray:5 7}
.yn-rtk .lg.bad{stroke:#ff4a3a;stroke-width:4.4;stroke-dasharray:9 6}
.yn-rtk .lg.badg{stroke:rgba(255,74,58,.32);stroke-width:12}
.yn-rtk .lg.gd{stroke:${GOLD};stroke-width:4.4}
.yn-rtk .lg.gdg{stroke:rgba(255,200,60,.3);stroke-width:13}
.yn-rtk .lg.gdh{stroke:#fff8d8;stroke-width:1.3}
.yn-rtk .ct{fill:none;stroke-linecap:round;stroke-width:6}
.yn-rtk .ct.g{stroke-width:17;opacity:.55}
.yn-rtk .ct.h{stroke-width:2;opacity:.95}
/* iniş nabzı: durağın çevresinde yere yayılan halkalar (kamera eğimiyle basık) */
.yn-rtk .pg .r1,.yn-rtk .pg .r2{fill:none;transform-box:fill-box;transform-origin:50% 50%}
.yn-rtk .pg .r1{stroke:var(--c);stroke-width:3.2;animation:ynRtPing .85s cubic-bezier(.2,.7,.3,1) forwards}
.yn-rtk .pg .r2{stroke:#fff;stroke-width:1.6;animation:ynRtPing 1s .12s cubic-bezier(.2,.7,.3,1) both}
.yn-rtk .pg .fl{fill:var(--c);transform-box:fill-box;transform-origin:50% 50%;animation:ynRtFl .55s ease-out forwards}
.yn-rtk .pg.big .r1{stroke-width:4.2}
@keyframes ynRtPing{0%{transform:scale(.15);opacity:1}100%{transform:scale(1.7);opacity:0}}
@keyframes ynRtFl{0%{transform:scale(.4);opacity:.85}100%{transform:scale(1.5);opacity:0}}
.yn-rtk .mk .rg{fill:rgba(8,12,30,.55);stroke:rgba(255,255,255,.85);stroke-width:2;stroke-dasharray:3.2 2.6}
.yn-rtk .mk .dc{stroke:#fff;stroke-width:2}
.yn-rtk .mk .dg{fill:none;stroke:#fff;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round}
.yn-rtk .mk .hn{fill:none;stroke:${GOLD};stroke-width:2.5}
.yn-rtk .mk .gm{fill:url(#ynRtGold);stroke:#fff6cc;stroke-width:2}
.yn-rtk .mk .gmd{fill:none;stroke:#3a2200;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.yn-rtk .mk .xr{fill:#ff4a3a;stroke:#fff;stroke-width:1.8}
.yn-rtk .mk .xx{fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round}
.yn-rtk .pop{transform-box:fill-box;transform-origin:50% 50%;animation:ynRtPop .45s cubic-bezier(.3,1.8,.5,1) both}
.yn-rtk .pl .hl{fill:none;stroke:rgba(4,8,24,.6);stroke-width:4.5;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.yn-rtk .pl .bd{fill:#f6f9ff;stroke:#0a1230;stroke-width:1.4;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.yn-rtk .pl .tl{fill:var(--pc)}
.yn-rtk .pl .st{stroke:var(--pc);stroke-width:1.7;stroke-linecap:round}
.yn-rtk .pl.gold .bd{fill:url(#ynRtGold);stroke:#fff6cc}
.yn-rtk .pl.gold .tl{fill:#c2780a}
.yn-rtk .pl.gold .st{stroke:#fff6cc}
.yn-rtk .pl .gl{fill:url(#ynRtGlow)}
.yn-rtk .ps{fill:rgba(3,6,18,.4)}
.yn-rtk .gh2{opacity:.55;transition:opacity .4s}
@keyframes ynRtDash{to{stroke-dashoffset:-15}}
@keyframes ynRtPop{0%{transform:scale(.2);opacity:0}60%{transform:scale(1.25);opacity:1}100%{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){.yn-rtk .lg.me,.yn-rtk .lg.meb{animation:none}.yn-rtk .pg{display:none}}
`;

export const rota = {
	time: 32,
	label: 'Uçuş Rotası',
	kind: 'closest',
	needsMap: true,
	jokers: ['yari'],
	// cevap filmi: altın uçuş (kalkış 0,64 sn + ayak başına 0,73 sn; 6 durakta ~4,3 sn; kamera uçağı izler), son madalya ve
	// bütün rotaya geri çekilen kamera (1,3 sn); ui.reveal kartı bu kadar tutar
	revealMs: 6600,
	rule: 'En uzağa uçan',
	// sonuç ekranının dili (öneri: ui.js _showResult "EN YAKIN SEN!" / "X daha yakın" / "EN YAKIN" yerine bunları okusun)
	birinci: 'EN UZAĞA SEN UÇTUN!',
	ustun: 'daha uzağa uçtu',
	rozet: 'EN UZAK',
	fmt: (v, value) => `${sonuc(v, value?.route).pre}/${(v.sira || v.kart).length} durak`,
	sub: (v, value) => {
		const r = sonuc(v, value?.route);
		return r.all ? 'tam rota' : !r.ids.length ? 'rota yok' : r.pre >= r.ids.length ? 'rota yarım kaldı' : `${r.pre + 1}. durakta saptı`;
	},
	prepare(q, R) {
		const dur = (q.duraklar || []).map((d) => ({ i: BY_ID.get(d.il), ad: d.ad || PROV[BY_ID.get(d.il)]?.name || '', not: d.not || '' })).filter((d) => d.i != null);
		const n = dur.length;
		const sira = dur.map((d) => d.i);
		// kartlar karışık: ilk kart kalkış değil, en çok bir kart kendi yerinde (dizi soldan sağa okunup geçilmesin)
		let kart = [...Array(n).keys()];
		for (let t = 0; t < 40; t++) {
			kart = shuffle([...Array(n).keys()], R);
			if (kart[0] !== 0 && kart.filter((x, k) => x === k).length <= 1) break;
		}
		const v = { q, sira, kart: kart.map((k) => sira[k]), ad: Object.fromEntries(dur.map((d) => [d.i, d.ad])), not: dur.map((d) => d.not) };
		return stamp(v, q, (q2, k, P, text) => {
			for (const d of dur) text(d.ad);
			return {
				wait: 0.5 + 1.0, // kart + duraklar ışığa çıkar
				look: LOOK.orient + LOOK.map + n * LOOK.gaze,
				think: n * (0.95 + 0.55 * k) + 1.2, // her durağın sıradaki yerini hatırla; son bir bakış
				act: n * (ACT.tap + 0.2), // kartlara (ya da haritaya) sırayla dokun; son durak gönderir
			};
		});
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('yn3-damga', DAMGA_CSS);
		css('yn3-rota', CSS + KCSS);
		const app = appOf();
		const me = app?.match?.humanPlayer;
		const color = me?.css || '#ff3030';
		// soru boyunca yalnız karışık kartlar (v.kart) gerekir: çevrimiçi görünümde doğru sıra (v.sira) yok, cevapla gelir
		const n = v.kart.length;
		const HINT = 'Durakları sırayla seç: karttan ya da haritadan';
		el.innerHTML = `<div class="yn-rt" style="--pc:${color}">
			<div class="yn-rt-grid">${v.kart.map((i, k) => `<button class="yn-rt-c" data-i="${i}" style="--k:${k}"><span class="nb">${NUM(1)}</span><span class="lb"><b>${esc(v.ad[i])}</b><small></small></span></button>`).join('')}</div>
			<div class="yn-rt-hint">${HINT}</div>
			<div class="yn-rt-sb"></div>
		</div>`;
		rule(el, 'En uzağa uçan');
		const root = el.querySelector('.yn-rt');
		const grid = root.querySelector('.yn-rt-grid');
		const chips = new Map([...grid.querySelectorAll('.yn-rt-c')].map((c) => [Number(c.dataset.i), c]));
		const hint = root.querySelector('.yn-rt-hint');
		sigdir([...grid.querySelectorAll('.lb b')], 10);
		const route = []; // il dizinleri, oyuncunun sırası
		let done = false;
		let started = false;
		const timers = [];
		const later = (fn, ms) => timers.push(setTimeout(() => el.isConnected && fn(), ms));
		const value = () => ({ route: route.map((i) => PROV[i].id) });
		const finish = () => {
			if (done) return;
			done = true;
			root.classList.add('done');
			api.answer(value());
		};
		const paintChips = () => {
			chips.forEach((c, i) => {
				const k = route.indexOf(i);
				c.classList.toggle('on', k >= 0);
				c.classList.toggle('last', k >= 0 && k === route.length - 1);
				if (k >= 0) c.querySelector('.nb').innerHTML = NUM(k + 1);
			});
			hint.textContent = route.length ? (route.length < n ? `${route.length}/${n} · geri almak için durağa yine dokun` : 'Rota tamam, iniş!') : HINT;
		};
		const ctlBase = {
			lock() {
				done = true;
				root.classList.add('done');
			},
			value,
		};
		if (!app) {
			// haritasız (sınama): yalnız kartlar
			grid.addEventListener('click', (e) => {
				const c = e.target.closest('.yn-rt-c');
				if (!c || done) return;
				const i = Number(c.dataset.i);
				if (!route.includes(i)) route.push(i);
				paintChips();
				if (route.length === n) finish();
			});
			return { ...ctlBase, reveal() {}, destroy() {} };
		}

		const b = app.board;
		const g = guard(app);
		const lit = [];
		let unAd = () => {};
		const K = katman(app, 'yn-rtk');
		K.svg.style.setProperty('--pc', color);
		K.defs.innerHTML = `<linearGradient id="ynRtGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1a8"/><stop offset=".55" stop-color="#ffc83a"/><stop offset="1" stop-color="#d08a10"/></linearGradient>
			<radialGradient id="ynRtGlow"><stop offset="0" stop-color="#ffe27a" stop-opacity=".75"/><stop offset="1" stop-color="#ffb020" stop-opacity="0"/></radialGradient>
			<linearGradient id="ynRtTrail" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".85"/></linearGradient>
			<linearGradient id="ynRtTrailG" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffb020" stop-opacity="0"/><stop offset=".7" stop-color="#ffd25a" stop-opacity=".35"/><stop offset="1" stop-color="#fff1a8" stop-opacity=".7"/></linearGradient>
			<linearGradient id="ynRtTrailM" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${color}" stop-opacity="0"/><stop offset="1" stop-color="${color}" stop-opacity=".55"/></linearGradient>`;
		// kontrail gradyanı yolun kendi koordinatında: kuyruktan (a) uçağa (b) doğru açılır
		const grad = (ids, a, b) => {
			for (const id of ids) {
				const gr = K.defs.querySelector('#' + id);
				gr.setAttribute('x1', a.x.toFixed(1));
				gr.setAttribute('y1', a.y.toFixed(1));
				gr.setAttribute('x2', b.x.toFixed(1));
				gr.setAttribute('y2', b.y.toFixed(1));
			}
		};
		const top = sv('g', { transform: `translate(0 ${DY})` }, K.svg);
		const gLegs = sv('g', {}, top); // gölge izleri ve oyuncunun ayakları
		const gGold = sv('g', {}, top); // altın rota (cevap)
		const gTrail = sv('g', {}, top); // oyuncu uçağının kontraili
		const meTrail = [sv('path', { class: 'ct g', stroke: 'url(#ynRtTrailM)' }, gTrail), sv('path', { class: 'ct h', stroke: 'url(#ynRtTrail)' }, gTrail)];
		const gPing = sv('g', {}, K.svg); // iniş nabızları: yerde, işaretlerin altında
		const gMarks = sv('g', {}, K.svg); // durak işaretleri: ilin 3B ad hapının hemen üstünde (yayların üstünde)
		const gPlane = sv('g', { transform: `translate(0 ${DY})` }, K.svg); // uçaklar ve gölgeleri: işaretlerin de üstünde uçar
		const mk = new Map(); // il → { g, inner }
		for (const i of v.kart) {
			const gEl = sv('g', { class: 'mk', transform: 'translate(-99 -99)' }, gMarks); // ilk çizime dek ekran dışında
			gEl.innerHTML = `<g class="in pop"><circle r="10.5" class="rg"/></g>`;
			mk.set(i, { g: gEl, hid: false });
		}
		const setMark = (i, html) => {
			const m = mk.get(i);
			if (m) m.g.innerHTML = `<g class="in pop">${html}</g>`;
		};
		const ringMark = (i, hintRing = false) => setMark(i, `${hintRing ? '<circle r="15" class="hn"/>' : ''}<circle r="10.5" class="rg"/>`);
		const numMark = (i, k, hintRing = false) => setMark(i, `${hintRing ? '<circle r="15.5" class="hn"/>' : ''}<circle r="11.5" class="dc" style="fill:${color}"/><path d="${digit(k)}" class="dg" transform="scale(1.05)"/>`);
		const hints = new Set(); // yarı yarıya: kalkış ve varış
		// uçaklar: oyuncunun (renkli kuyruk) ve cevabın altın uçağı; her biri gölgesiyle
		const plane = (cls) => {
			const sh = sv('g', { class: 'ps', style: 'visibility:hidden' }, gPlane);
			sh.innerHTML = `<path d="${PLANE}" transform="scale(.82)"/>`;
			const gEl = sv('g', { class: `pl ${cls}`, style: 'visibility:hidden' }, gPlane);
			gEl.innerHTML = `${cls === 'gold' ? '<circle r="26" class="gl"/>' : ''}<path d="${PLANE}" class="hl"/><path d="${PLANE}" class="bd"/><path d="${PLANE_TAIL}" class="tl"/><path d="M11 0H-12.5" class="st"/>`;
			return { g: gEl, sh, at: -1, fl: null, ang: 0, sx: 1 };
		};
		const pMe = plane('me');
		const pGold = plane('gold');
		// ayak çizgileri (oyuncu): her ayak için gölge izi + beyaz alt + renkli kesik çizgi
		const legs = []; // { a, b, sh, bk, ln, t, t0, dur, out }
		const legEl = () => {
			const sh = sv('path', { class: 'lg sh' }, gLegs);
			const bk = sv('path', { class: 'lg meb' }, gLegs);
			const ln = sv('path', { class: 'lg me' }, gLegs);
			return { sh, bk, ln };
		};
		const ends = new Map();
		const endOf = (i) => {
			let e = ends.get(i);
			if (!e) ends.set(i, (e = {}));
			return K.P.end(i, e);
		};
		const now = () => clock.now() / 1000;
		const fly = (p, a, bI, dur, onEnd = null) => {
			p.fl = { a, b: bI, t0: now(), dur, onEnd, sx: p.sx };
		};
		const o1 = {};
		const o2 = {};
		const q1 = {};
		const q2 = {};
		const q3 = {};
		const o4 = {};
		const q4 = {};
		const q5 = {};
		/** Park yanı (+1 sağ, −1 sol): gelen ayak sağdan iniyorsa uçak sola park eder (ayağın üstüne konmasın). Dik inişte yan korunur. */
		const yanOf = (P, A, B, sx) => {
			yayNok(A, B, 0.9, o4);
			P.at(o4.x, o4.z, o4.y, q4);
			P.at(B.x, B.z, B.y, q5);
			const dx = q4.x - q5.x; // geri yön: duraktan gelen ayağa doğru
			const d = Math.hypot(dx, q4.y - q5.y);
			if (d < 0.5) return sx;
			return dx > 0.2 * d ? -1 : dx < -0.2 * d ? 1 : sx;
		};
		const show = (e, on) => {
			if (e._on === on) return;
			e._on = on;
			e.style.visibility = on ? '' : 'hidden';
		};
		/** Uçağı yayın u noktasına koy (ekran): burun teğete, irtifada biraz büyür; gölgesi yerde. */
		const placePlane = (p, P, A, B, u) => {
			yayNok(A, B, u, o1);
			yayNok(A, B, Math.min(1, u + 0.02), o2);
			P.at(o1.x, o1.z, o1.y, q1);
			P.at(o2.x, o2.z, o2.y, q2);
			if (u >= 0.98) {
				// inişte burun son teğette kalsın
				yayNok(A, B, 0.96, o2);
				P.at(o2.x, o2.z, o2.y, q3);
				p.ang = aci(q3, q1);
			} else if (Math.hypot(q2.x - q1.x, q2.y - q1.y) > 0.2) p.ang = aci(q1, q2);
			// kısa ayakta (komşu iki il) küçük uçak: ayağın ekran boyuyla ölçeklenir; irtifada biraz büyür
			P.at(A.x, A.z, A.y, q2);
			P.at(B.x, B.z, B.y, q3);
			p.base = clamp(Math.hypot(q3.x - q2.x, q3.y - q2.y) / 130, 0.76, 1.05);
			const s = p.base * (1 + 0.32 * Math.sin(Math.PI * u));
			// park yerinden kalkış ve park yerine iniş: işaretin yanındaki park noktasıyla uçuş yolu arasında yumuşak geçiş
			// (kalkışta eski durağın park yanı, inişte yeni durağınki)
			const fl = p.fl;
			if (fl) fl.sx1 = yanOf(P, A, B, fl.sx1 ?? 1);
			const f0 = 1 - smooth(u / 0.16);
			const f1 = smooth((u - 0.84) / 0.16);
			const px = q1.x + PARK_X * ((fl ? fl.sx : p.sx) * f0 + (fl ? fl.sx1 : p.sx) * f1);
			const py = q1.y + PARK_Y * (f0 + f1);
			p.g.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${p.ang.toFixed(1)}) scale(${s.toFixed(3)})`);
			P.at(o1.x, o1.z, o1.g + 0.05, q3);
			p.sh.setAttribute('transform', `translate(${(q3.x + 3).toFixed(1)} ${(q3.y + 4).toFixed(1)}) rotate(${p.ang.toFixed(1)}) scale(${(p.base * (0.9 - 0.2 * Math.sin(Math.PI * u))).toFixed(3)})`);
			show(p.g, !q1.behind);
			show(p.sh, !q3.behind && u > 0.02 && u < 0.98);
		};
		/** Uçağı bir durağa park et: işaretin üst yanında (numara ve ad okunsun), burnu son ayağın yönünde. */
		const parkPlane = (p, P, i) => {
			P.end(i, o1);
			P.at(o1.x, o1.z, o1.y, q1);
			const s = p.base ?? 0.85;
			p.g.setAttribute('transform', `translate(${(q1.x + PARK_X * p.sx).toFixed(1)} ${(q1.y + PARK_Y).toFixed(1)}) rotate(${p.ang.toFixed(1)}) scale(${s.toFixed(3)})`);
			show(p.g, !q1.behind);
			show(p.sh, false);
		};
		// iniş nabzı: durağın tepesinde yere yayılan iki halka ve bir parlama
		const pings = [];
		const ping = (i, c, big = false) => {
			const r = big ? 26 : 20;
			const gEl = sv('g', { class: 'pg' + (big ? ' big' : ''), style: `--c:${c}` }, gPing);
			gEl.innerHTML = `<g><ellipse class="r1" rx="${r}" ry="${r}"/><ellipse class="r2" rx="${r}" ry="${r}"/><circle class="fl" r="${big ? 11 : 8}"/></g>`;
			const pg = { g: gEl, i, p: {}, q: {} };
			pings.push(pg);
			later(() => {
				gEl.remove();
				const k = pings.indexOf(pg);
				if (k >= 0) pings.splice(k, 1);
			}, 1150);
		};
		// cevap filminde kamera altın uçağı izler (biraz önüne, varacağı durağa bakar); film bitince bütün rotaya çekilir
		const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
		const camF = { on: false, x: 0, y: 0, z: 0, t: 0 };
		// altın rota (cevap): ayak başına gölge, parıltı, çizgi, iç parlaklık; uçak izi (kontrail)
		const gold = { on: false, k: 0, u: 0, legs: [], trail: null };
		K.on((P) => {
			const T = now();
			// durak işaretleri: birbirine çok yakın iki durak (Samsun–Amasya) ekranda itişir, işaretler üst üste binmez
			for (const [i, m] of mk) {
				P.lab(i, m.p || (m.p = {}));
				m.x = m.p.x;
				m.y = m.p.y + MK_DY;
			}
			const M = [...mk.values()];
			for (let it = 0; it < 3; it++)
				for (let a = 0; a < M.length; a++)
					for (let c = a + 1; c < M.length; c++) {
						const A = M[a];
						const B = M[c];
						let dx = B.x - A.x;
						let dy = B.y - A.y;
						let d = Math.hypot(dx, dy);
						if (d >= MIN_MK) continue;
						if (d < 0.01) {
							dx = 0;
							dy = 1;
							d = 1;
						}
						const k = (MIN_MK - d) / 2 / d;
						A.x -= dx * k;
						A.y -= dy * k;
						B.x += dx * k;
						B.y += dy * k;
					}
			for (const m of M) {
				show(m.g, !m.p.behind);
				if (!m.p.behind) m.g.setAttribute('transform', `translate(${m.x.toFixed(1)} ${m.y.toFixed(1)})`);
			}
			if (pings.length) {
				const flat = clamp(Math.sin(app.cam.pitch || 1.1), 0.35, 0.92);
				for (const pg of pings) {
					P.end(pg.i, pg.p);
					P.at(pg.p.x, pg.p.z, pg.p.y, pg.q);
					pg.g.setAttribute('transform', `translate(${pg.q.x.toFixed(1)} ${(pg.q.y + DY).toFixed(1)}) scale(1 ${flat.toFixed(3)})`);
				}
			}
			// oyuncunun ayakları
			for (const L of legs) {
				const A = endOf(L.a);
				const B = endOf(L.b);
				let t1 = 1;
				if (L.t0 != null) t1 = ease(Math.min(1, (T - L.t0) / L.dur));
				if (L.out != null) t1 = Math.max(0, 1 - Math.min(1, (T - L.out) / 0.3));
				const d = K.P.yol(A, B, 0, t1, 28);
				L.ln.setAttribute('d', d);
				L.bk.setAttribute('d', d);
				L.sh.setAttribute('d', K.P.yol(A, B, 0, t1, 28, true));
			}
			// oyuncunun uçağı
			if (pMe.fl) {
				const f = pMe.fl;
				const u = Math.min(1, (T - f.t0) / f.dur);
				const A = endOf(f.a);
				const B = endOf(f.b);
				const e = ease(u);
				placePlane(pMe, P, A, B, e);
				// kontrail: uçağın arkasında kısa, oyuncu renginde parlayan beyaz iz
				const t0 = Math.max(0, e - 0.3);
				const d = u < 1 ? K.P.yol(A, B, t0, e, 12) : '';
				for (const t of meTrail) t.setAttribute('d', d);
				if (d) {
					yayNok(A, B, t0, o2);
					P.at(o2.x, o2.z, o2.y, q2);
					grad(['ynRtTrail', 'ynRtTrailM'], q2, q1);
				}
				if (u >= 1) {
					pMe.fl = null;
					pMe.at = f.b;
					pMe.sx = f.sx1 ?? pMe.sx;
					f.onEnd?.();
				}
			} else if (pMe.at >= 0) parkPlane(pMe, P, pMe.at);
			else {
				show(pMe.g, false);
				show(pMe.sh, false);
			}
			// altın uçuş: önce uçağın bu karedeki yeri (ilerleme), sonra ayaklar aynı ilerlemeyle (bir kare geride kalmasın)
			if (gold.on) {
				if (pGold.fl) {
					const f = pGold.fl;
					const u = Math.min(1, (T - f.t0) / f.dur);
					gold.u = u;
					const A = endOf(f.a);
					const B = endOf(f.b);
					const e = ease(u);
					placePlane(pGold, P, A, B, e);
					// kontrail: uçağın arkasındaki son dilim, kuyruktan uçağa doğru açılan beyaz
					// kamera izi: uçağın biraz önü (varacağı durağa doğru), yumuşak süzülme
					if (camF.on) {
						const dt = Math.min(0.1, Math.max(0, T - camF.t));
						camF.t = T;
						const a = 1 - Math.exp(-dt * 3.2);
						camF.x += (o1.x + (B.x - o1.x) * 0.35 - camF.x) * a;
						camF.z += (o1.z + (B.z - o1.z) * 0.35 - camF.z) * a;
					}
					const t0 = Math.max(0, e - 0.4);
					const d = K.P.yol(A, B, t0, e, 16);
					for (const t of gold.trail) t.setAttribute('d', d);
					yayNok(A, B, t0, o2);
					P.at(o2.x, o2.z, o2.y, q2);
					grad(['ynRtTrail', 'ynRtTrailG'], q2, q1);
				} else if (pGold.at >= 0) {
					parkPlane(pGold, P, pGold.at);
					for (const t of gold.trail) t.setAttribute('d', '');
				}
				for (let k = 0; k < gold.legs.length; k++) {
					const L = gold.legs[k];
					const t1 = k < gold.k ? 1 : k === gold.k ? ease(gold.u) : 0;
					const d = t1 > 0 ? K.P.yol(endOf(v.sira[k]), endOf(v.sira[k + 1]), 0, t1, 30) : '';
					L.g1.setAttribute('d', d);
					L.g2.setAttribute('d', d);
					L.g3.setAttribute('d', d);
				}
				// varış: ayak tamam (çizgi tam boy çizildikten sonra sıradaki ayağa geçilir)
				const f = pGold.fl;
				if (f && gold.u >= 1) {
					pGold.fl = null;
					pGold.at = f.b;
					pGold.sx = f.sx1 ?? pGold.sx;
					f.onEnd?.();
				}
			}
		});
		// kadraj: bütün duraklar ve doğru rotanın yay tepeleri kartın altındaki alana (perspektif doğru)
		const tepeler = () => {
			const ek = [];
			const S0 = v.sira || v.kart;
			for (let k = 1; k < n; k++) for (const t of [0.3, 0.5, 0.7]) ek.push(yayNok(K.P.end(S0[k - 1], {}), K.P.end(S0[k], {}), t, {}));
			return ek;
		};
		// gece güvencesi (bkz. d_mayin.js): önceki kartın geç gelen temizliği haritayı gündüze döndürürse gece yeniden kurulur
		let darkList = null;
		K.on(() => {
			if (darkList && b.nightTo < 1) {
				setNightTone(b.G, 'baskent');
				b.night(true, darkList.length ? darkList : null);
			}
		});
		// harita kurulumu bir mikro görevde: önceki kartın temizliği önce çalışsın (bkz. d_mayin.js)
		queueMicrotask(() => {
			if (!el.isConnected) return;
			g.allActive();
			g.dark(lit);
			darkList = lit;
			unAd = adlar(app, v.kart);
			cerceve(app, v.kart, { top: cardTop(el), alt: 62, pitch: 1.12, dur: 0.9, arc: 4, ek: tepeler() });
		});
		const stopOpen = onOpen(el, () => {
			started = true;
			sfx(app, 'cue');
			// duraklar sırayla ışığa çıkar (kartların karışık sırasıyla: doğru sırayı ele vermez)
			v.kart.forEach((i, k) =>
				later(() => {
					lit.push(i);
					g.dark(lit);
				}, 70 * k),
			);
		});
		const legTo = (a, bI) => {
			const L = { a, b: bI, ...legEl(), t0: now(), dur: LEG, out: null };
			legs.push(L);
			return L;
		};
		const add = (i) => {
			if (done) return;
			const k = route.length;
			route.push(i);
			const c = chips.get(i);
			c.classList.remove('nw');
			void c.offsetWidth;
			c.classList.add('nw');
			numMark(i, k + 1, hints.has(i));
			g.fx(i, 0.55, 0.6);
			const p = b.provinces[i];
			if (k === 0) {
				// kalkış: uçak durakta belirir
				pMe.at = i;
				pMe.ang = -20;
				pMe.sx = 1;
				pop(app, p.x, p.z, '', { colors: [color, '#fff'], n: 10, dist: 40 });
				ping(i, color);
				sfx(app, 'claim');
			} else {
				const a = route[k - 1];
				legTo(a, i);
				fly(pMe, a, i, LEG, () => {
					pop(app, p.x, p.z, '', { colors: [color, '#fff', GOLD], n: 9, dist: 38 });
					ping(i, color);
					sfx(app, 'tap');
				});
				sfx(app, 'whoosh');
			}
			buzz(10);
			paintChips();
			if (route.length === n) {
				// son durak: uçak iner, rota gönderilir
				done = true;
				root.classList.add('done');
				later(() => {
					sfx(app, 'star', { n: 2 });
					api.answer(value());
				}, LEG * 1000 + 120);
			}
		};
		// yerleşmiş bir durağa dokununca rota oradan kısalır (o durak ve sonrası kalkar)
		const cut = (i) => {
			if (done) return;
			const k = route.indexOf(i);
			if (k < 0) return;
			const gone = route.splice(k);
			for (const j of gone) {
				ringMark(j, hints.has(j));
				g.fx(j, 0, 0);
			}
			const T = now();
			for (const L of legs) if (gone.includes(L.b) && L.out == null) L.out = T;
			later(() => {
				for (let x = legs.length - 1; x >= 0; x--)
					if (legs[x].out != null) {
						const L = legs[x];
						L.sh.remove();
						L.bk.remove();
						L.ln.remove();
						legs.splice(x, 1);
					}
			}, 340);
			pMe.fl = null;
			for (const t of meTrail) t.setAttribute('d', '');
			if (route.length) {
				// uçak geri döner: son kalan durağa (park yanı o durağa gelen ayağa göre)
				pMe.at = route[route.length - 1];
				pMe.sx = route.length > 1 ? yanOf(K.P, endOf(route[route.length - 2]), endOf(pMe.at), 1) : 1;
			} else pMe.at = -1;
			chips.get(i)?.classList.add('shk');
			later(() => chips.get(i)?.classList.remove('shk'), 360);
			sfx(app, 'tap');
			buzz(6);
			paintChips();
		};
		const pick = (i) => (route.includes(i) ? cut(i) : add(i));
		grid.addEventListener('click', (e) => {
			const c = e.target.closest('.yn-rt-c');
			if (!c || done || !started) return;
			pick(Number(c.dataset.i));
		});
		api.onMapTap((pt) => {
			if (done || !started || el.closest('.fl-q')?.classList.contains('spec')) return; // izlenen düelloda dokunuş yok
			const i = b.pick(pt.x, pt.z);
			if (i < 0) return;
			if (!chips.has(i)) {
				tapX(app, pt.x, pt.z);
				sfx(app, 'wrong');
				app.ui.toast?.(`${b.provinces[i].name} rotada yok`, { tone: 'warn', ms: 1300 });
				return;
			}
			pick(i);
		});
		const close = onClose(el, () => {
			stopOpen();
			for (const t of timers) clearTimeout(t);
			K.destroy();
			unAd();
			g.restore();
		});
		return {
			...ctlBase,
			// yarı yarıya: kalkış ve varış altın halkayla (kartta ve haritada)
			joker(e) {
				if (!Array.isArray(e?.uc)) return;
				for (const i of e.uc) {
					hints.add(i);
					chips.get(i)?.classList.add('hint');
					const k = route.indexOf(i);
					if (k >= 0) numMark(i, k + 1, true);
					else ringMark(i, true);
				}
				app.ui.toast?.('Kalkış ve varış durakları altın halkada', { tone: 'good', ms: 2200 });
			},
			reveal(results) {
				jokersOff(el); // joker çubuğu kalkar: kart kısalır (kadraj aşağıda bundan sonra ölçülür)
				done = true;
				// çevrimiçinde doğru sıra cevapla gelir (sunucunun tam görünümü görünüme katılır); gelmediyse cevap çizilemez
				if (!Array.isArray(v.sira)) return;
				root.classList.add('done', 'rv');
				const all = results.map((r) => ({ r, s: sonuc(v, r.value?.route) }));
				const meR = all.find((x) => x.r.p?.human);
				const mineS = meR?.s;
				// kartlar doğru sırada: altın numara, not; oyuncunun hükmü (başlangıçta doğru / saptığı durak)
				grid.innerHTML = v.sira
					.map((i, k) => {
						const cls = mineS ? (k < mineS.pre ? ' ok' : k === mineS.pre ? ' bad' : '') : '';
						return `<div class="yn-rt-c${cls}" style="--k:${k}"><span class="nb">${NUM(k + 1)}</span><span class="lb"><b>${esc(v.ad[i])}</b><small>${esc(v.not[k] || '')}</small></span></div>`;
					})
					.join('');
				sigdir([...grid.querySelectorAll('.lb b'), ...grid.querySelectorAll('.lb small')], 9);
				// oyuncu satırları: portre, ad, mini rota (doğru başlangıç yeşil, sapma kırmızı, sonrası soluk)
				const order = all.slice().sort((x, y) => x.r.err - y.r.err || x.r.time - y.r.time);
				const sb = root.querySelector('.yn-rt-sb');
				const k4 = results.length > 2;
				sb.classList.toggle('k4', k4);
				sb.style.setProperty('--c', String(k4 ? results.length : Math.max(1, results.length)));
				sb.innerHTML = order
					.map(({ r, s }, k) => {
						const dots = v.sira
							.map((_, j) => {
								const c = j < s.pre ? 'ok' : j === s.pre && s.ids.length > j ? 'x' : '';
								return `${j ? `<u class="${j <= s.pre - 1 ? 'ok' : ''}"></u>` : ''}<i class="${c}"></i>`;
							})
							.join('');
						return `<div class="r${k === 0 ? ' win' : ''}" style="--c:${r.color};--k:${k}"><b class="fl-who" style="background:${r.color}"></b><span class="hd"><span class="nm">${esc(r.name)}</span><b>${s.pre}<small>/${n}</small></b></span><span class="mr">${dots}</span></div>`;
					})
					.join('');
				sigdir([...sb.querySelectorAll('.nm')], 9);
				// harita: insanın rotası hayalete döner (cevap kendi yolundan gelmediyse de çizilir), saptığı ayak kırmızı
				const mineIds = mineS?.ids || [];
				const same = mineIds.length === route.length && mineIds.every((x, k) => x === route[k]);
				if (!same) {
					for (const L of legs) {
						L.sh.remove();
						L.bk.remove();
						L.ln.remove();
					}
					legs.length = 0;
					route.length = 0;
					route.push(...mineIds);
					for (let k = 1; k < mineIds.length; k++) {
						const L = legTo(mineIds[k - 1], mineIds[k]);
						L.t0 = null;
					}
				}
				for (const L of legs) {
					L.t0 = null; // tam boy
					L.ln.setAttribute('class', 'lg gh');
					L.bk.setAttribute('class', 'lg ghb');
				}
				pMe.fl = null;
				pMe.at = -1;
				const devK = mineS && !mineS.all ? mineS.pre : -1; // sapılan durak (oyuncunun sırasında)
				const dev = devK > 0 ? legs[devK - 1] : null;
				if (dev) {
					dev.ln.setAttribute('class', 'lg bad');
					dev.bk.setAttribute('class', 'lg badg');
				}
				// işaretler: önce hepsi halka; sapma durağında kırmızı çarpı
				for (const i of v.sira) ringMark(i);
				if (devK >= 0 && mineIds[devK] != null) setMark(mineIds[devK], `<circle r="11.5" class="xr"/><path d="${CROSS}" class="xx" transform="scale(1.05)"/>`);
				// altın uçuş: kalkıştan varışa, ayak ayak; her durakta altın madalya, iniş nabzı ve yükselen nota
				let tp = 0;
				let fr = null;
				gold.on = true;
				for (let k = 0; k < n - 1; k++) {
					const g3 = [sv('path', { class: 'lg gdg' }, gGold), sv('path', { class: 'lg gd' }, gGold), sv('path', { class: 'lg gdh' }, gGold)];
					gold.legs.push({ g1: g3[0], g2: g3[1], g3: g3[2] });
				}
				gold.trail = [sv('path', { class: 'ct g', stroke: 'url(#ynRtTrailG)' }, gGold), sv('path', { class: 'ct', stroke: 'url(#ynRtTrail)' }, gGold), sv('path', { class: 'ct h', stroke: 'url(#ynRtTrail)' }, gGold)];
				for (const t of meTrail) t.setAttribute('d', '');
				const medal = (k) => {
					const i = v.sira[k];
					const p = b.provinces[i];
					// oyuncunun saptığı il (yanlış sırada koyduğu durak): altın madalyanın köşesinde küçük kırmızı çarpı kalır
					const wrongHere = devK >= 0 && mineIds[devK] === i;
					setMark(i, `<circle r="12.5" class="gm"/><path d="${digit(k + 1)}" class="gmd" transform="scale(1.1)"/>${wrongHere ? `<g transform="translate(11 -10) scale(.62)"><circle r="11.5" class="xr"/><path d="${CROSS}" class="xx"/></g>` : ''}`);
					g.fx(i, 0.6, 1);
					ping(i, GOLD, true);
					pop(app, p.x, p.z, '', { colors: [GOLD, '#fff', '#ffe9a8'], n: 12, dist: 54 });
					sfx(app, 'star', { n: Math.min(2, Math.floor((k * 3) / Math.max(1, n - 1))) });
				};
				const step = (k) => {
					gold.k = k;
					gold.u = 0;
					if (k >= n - 1) {
						pGold.at = v.sira[n - 1];
						// iniş: kamera bütün altın rotaya çekilir
						if (camF.on) {
							camF.on = false;
							cerceve(app, v.sira, { top: tp, alt: 62, pitch: 1.08, dur: 1.3, arc: 2, ek: tepeler() });
						}
						if (mineS?.all) {
							sfx(app, 'fireworks', { delay: 0.1 });
							const p = b.provinces[v.sira[n - 1]];
							pop(app, p.x, p.z, 'KUSURSUZ!', { colors: [GOLD, '#fff', '#7dff9a'], n: 24, dist: 100, cls: 'dn dn-gold' });
						}
						return;
					}
					if (k === 0 && fr && !reduce) {
						// kalkış: kamera alçalır, yaklaşır ve uçağı izlemeye başlar
						const s0 = endOf(v.sira[0]);
						camF.x = s0.x;
						camF.z = s0.z;
						camF.t = now();
						camF.on = true;
						app.cam.shot(s0.x, s0.z, { follow: camF, dist: fr.dist * 0.78, pitch: 1.0, dur: 1.0, arc: 0, lens: tp / 2 });
					}
					fly(pGold, v.sira[k], v.sira[k + 1], GLEG, () => {
						medal(k + 1);
						later(() => step(k + 1), 110);
					});
					sfx(app, 'whoosh');
				};
				later(() => {
					medal(0);
					pGold.at = v.sira[0];
					pGold.ang = aci({ x: 0, y: 0 }, { x: 1, y: -0.3 });
					later(() => step(0), 260);
				}, 380);
				// kadraj: kart kısaldı (joker çubuğu yok, damga sorunun yerinde); duraklar ve altın yaylar kartın altındaki alana
				if (results.some((r) => r.p?.human)) damgaYeri(el); // damga sorunun yerinde: satır şimdi açılır, kadraj ondan sonra
				tp = cardTop(el);
				fr = cerceve(app, v.sira, { top: tp, alt: 62, pitch: 1.08, dur: 0.9, arc: 3, ek: tepeler() });
				if (meR) {
					const ord = order.map((x) => x.r);
					const win = ord[0] === meR.r;
					const s = mineS;
					let text;
					let sub;
					if (s.all) {
						text = 'TAM ROTA!';
						sub = win ? `${n} durağın hepsi doğru sırada` : `${ord[0].name} daha hızlı uçtu`;
					} else if (!s.ids.length) {
						text = 'KALKMADIN';
						sub = 'Rota kurulmadı';
					} else if (s.pre >= s.ids.length) {
						// süre doldu: konan duraklar doğru ama rota yarım
						text = 'ROTA YARIM';
						sub = win ? `${s.pre}/${n} durak doğru · en uzak sen uçtun` : `${ord[0].name} ${sonuc(v, ord[0].value?.route).pre}/${n} durak uçtu`;
					} else {
						text = s.pre === 0 ? 'İLK DURAKTA SAPTIN' : `${s.pre + 1}. DURAKTA SAPTIN`;
						const w = sonuc(v, ord[0].value?.route);
						sub = win ? `${s.pre}/${n} durak doğru · en uzak sen uçtun` : `${ord[0].name} ${w.pre}/${n} durak doğru uçtu`;
					}
					// eşli: takım arkadaşı kazandıysa takımın kazandı (altın)
					const team = !win && !!app.match?.mode?.teams && ord[0].p?.team === meR.r.p?.team;
					if (team) sub = `Takımın kazandı · ${ord[0].name} ${sonuc(v, ord[0].value?.route).pre}/${n} durak`;
					stampLater(app, text, win || team ? 'gold' : 'bad', sub);
					damga(el);
				}
			},
			destroy: close,
		};
	},
	joker(id, v) {
		if (id !== 'yari') return null;
		return { uc: [v.sira[0], v.sira[v.sira.length - 1]] };
	},
	/** Çevrimiçi görünüm: doğru sıra ve notlar sunucuda; kartlar zaten karışık. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.sira;
		delete o.not;
		delete o.q.duraklar;
		return o;
	},
	/** Sınama: doğru rota ve ilk iki durağı yer değiştirmiş rota. */
	probe(v) {
		const ids = v.sira.map((i) => PROV[i].id);
		const bad = ids.slice();
		[bad[0], bad[1]] = [bad[1], bad[0]];
		return { good: { route: ids }, bad: { route: bad } };
	},
	judge(v, value) {
		const r = sonuc(v, value?.route);
		return { correct: r.all, err: r.n - r.pre + (0.1 * (r.n - r.pos)) / Math.max(1, r.n), score: r.pre };
	},
	bot(v, skill, R) {
		// insan gibi: çoğu kez komşu iki durağı karıştırır (Erzurum mu önce Sivas mı), arada bir durağı yanlış uca taşır
		const n = v.sira.length;
		const p = clamp(pCorrect(skill, v.q.diff) + 0.08, 0.1, 0.97);
		const seq = v.sira.slice();
		for (let k = 0; k < n - 1; k++)
			if (R() > Math.pow(p, 0.55)) {
				[seq[k], seq[k + 1]] = [seq[k + 1], seq[k]];
				k++;
			}
		if (R() > p + 0.3) {
			const a = Math.floor(R() * n);
			const [x] = seq.splice(a, 1);
			seq.splice(Math.floor(R() * n), 0, x);
		}
		return { value: { route: seq.map((i) => PROV[i].id) }, time: clamp(botTime(v, R, skill, 0.25, 1), 1.5, v.sec || 30) };
	},
};
