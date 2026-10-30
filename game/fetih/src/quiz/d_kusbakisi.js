// KUŞBAKIŞI (deneme): kamera haritadaki bir maketin dibine iner (Galata'nın külahı, Nemrut'un başları…), sonra ağır
// ağır dönerek yükselir; kıyı, göl, komşu yapılar göründükçe ipucu artar. Oyuncu dört şıktan ili (ya da yapıyı)
// seçer: ne kadar erken bilirse o kadar iyi (düelloda ikisi de bilirse hızlı olan kazanır).
//
// Veri: site: maket kimliği (landmarks.js SITES: 'galata', 'nemrut'…) YA DA at: [boylam, enlem] (göl, dağ, kıyı)
//       il: cevabın plakası (cevap ekranında il kalkar ve adı yazılır), a: [doğru, y1, y2, y3]
//       isteğe bağlı: yaw (başlangıç yönü tercihi, radyan), near (başlangıç uzaklığı), far (bitiş uzaklığı)
// Değer: şık indeksi. Tür 'exact' (bildi/bilemedi; eşitlikte süre).
// Harita: il adları ve kale/sahip yazıları kapalı (harita sorusu); maketler AÇIK (ipucu onlar). Kamera parmağa
// kapalı: oyuncu kendisi uzaklaşıp cevabı görmesin. Kart kapanınca her şey eski haline döner.
//
// v0.9 yakın çekim: soru açılınca YALNIZ o yapının yüksek ayrıntılı "kahraman" maketi kurulur (landmarks.hero →
// heroes.js; kare kare, ilk kullanımda) ve haritadaki yalın kopyanın yerine konur; kart kapanınca kaldırılır. Kamera
// kahraman hazır olunca yapının dibine kesilir (kart açılırken; en geç saat başlarken). Gölge kapsamı yakın çekime
// daralır (keskin gölge). Başlangıç yönü ve eğimi kendiliğinden seçilir: yamaç yapıyı örtmesin (yaw yalnız tercih);
// İstanbul gibi sık yerlerde komşu yapılar alçak çekimde toprağa gömülür, kamera yükselirken geri çıkar. Başkent
// kalesi yapının yerine kurulduysa (yapı gömülü) kahraman kurulmaz; bu soru o maçta sorulmamalı: `usable(q, app)`.
//
// v1.0 gece ve sinematik ipucu: soru boyunca harita GECE ("Gölgede Renk", guard.dark); yalnız yapı ve yakın çevresi
// sıcak bir ışık havuzunda (G.uPool: dünya uzayında daire, gecede gündüz kalır, projektör tonu). Kıyı ve göller ay
// ışığıyla seçilir. Kamera yükseldikçe ve oyuncu hâlâ bilmediyse soru saatine bağlı kademeler: önce bölgenin dış
// sınırı ince altın hat olarak nabız gibi belirir, sonra ilin sınırı (board.edgeGlow; ışıma shader'da süzülür, iki oyuncu
// aynı anı görür). Cevapta hedef il tam aydınlanır (gündüz), kamera ili ve yapıyı birlikte kadrajlar. Kart kapanınca
// gece, ton, ışık havuzu ve ışımalar eski haline döner.

import { css, esc, shuffle, pCorrect, mountChoice } from './util.js';
import { botTime } from './timing.js';
import { lonLatToWorld } from './types.js';
import { appOf, stamp, guard, camLock, cut, onClose, onOpen, cardTop, tag, sfx, LOOK, DENEME_CSS } from './d_ortak.js';
import { clock, setInterval, clearInterval } from '../core/clock.js';

export const SITE_NAMES = {
	ayasofya: 'Ayasofya',
	galata: 'Galata Kulesi',
	kizkulesi: 'Kız Kulesi',
	kopru: 'Boğaziçi Köprüsü',
	anitkabir: 'Anıtkabir',
	peri: 'Peri Bacaları',
	nemrut: 'Nemrut Dağı',
	pamukkale: 'Pamukkale',
	sumela: 'Sümela Manastırı',
	uzungol: 'Uzungöl',
	celsus: 'Efes · Celsus Kütüphanesi',
	saatkulesi: 'Konak Saat Kulesi',
	mevlana: 'Mevlana Türbesi',
	selimiye: 'Selimiye Camii',
	ishakpasa: 'İshak Paşa Sarayı',
	safranbolu: 'Safranbolu Evleri',
	gobekli: 'Göbeklitepe',
	truva: 'Truva Atı',
	aspendos: 'Aspendos Tiyatrosu',
	vankalesi: 'Van Kalesi',
	kizkalesi: 'Kız Kalesi',
	bodrum: 'Bodrum Kalesi',
	ciftemin: 'Çifte Minareli Medrese',
	// v0.9
	sultanahmet: 'Sultanahmet Camii',
	dolmabahce: 'Dolmabahçe Sarayı',
	akdamar: 'Akdamar Kilisesi',
	ani: 'Ani Harabeleri',
	hasankeyf: 'Hasankeyf',
	mardin: 'Mardin Taş Evleri',
	harran: 'Harran Kümbet Evleri',
	hattusa: 'Hattuşa · Aslanlı Kapı',
	bursaulu: 'Bursa Ulu Camii',
	divrigi: 'Divriği Ulu Camii',
	amasya: 'Kral Kaya Mezarları',
	kizilkule: 'Kızıl Kule',
	myra: 'Myra Kaya Mezarları',
	ahlat: 'Ahlat Mezar Taşları',
	zeugma: 'Zeugma',
	bergama: 'Bergama Akropolü',
	ankarakalesi: 'Ankara Kalesi',
	canakkale: 'Çanakkale Şehitler Abidesi',
	diyarbakir: 'Diyarbakır Surları',
};

const CSS = /* css */ `
.dn-kb{display:flex;flex-direction:column;gap:9px}
.dn-kb-top{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#cfe0ff}
.dn-kb-top .sc{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#0a1534;border:2px solid var(--gold)}
.dn-kb-top .sc svg{width:16px;height:16px}
.dn-kb-bar{flex:1;height:8px;border-radius:6px;background:rgba(255,255,255,.14);overflow:hidden;position:relative}
.dn-kb-bar i{position:absolute;inset:0;border-radius:6px;background:linear-gradient(90deg,#ffd25a,#ff8a3a);transform-origin:0 50%}
.dn-kb-bar i.run{animation:dnShrink var(--t,20s) linear forwards}
.fl-q.locked .dn-kb-bar i{animation-play-state:paused}
.dn-kb-top b{font-family:'Lilita One';font-weight:400;font-size:14px;letter-spacing:.04em;color:var(--gold)}
.dn-kb .fl-opt{min-height:50px}
/* dürbün: haritanın kenarları kararır, ortası açık; zamanla açılır (yalnız transform ve opacity) */
.dn-scope{position:absolute;left:50%;top:var(--cy,60%);width:150vmax;height:150vmax;margin:-75vmax 0 0 -75vmax;pointer-events:none;border-radius:50%;
  background:radial-gradient(circle,transparent 0 13%,rgba(255,226,140,.55) 13.4%,rgba(4,8,22,.0) 14.2%,rgba(4,8,22,.55) 19%,rgba(4,8,22,.92) 33%);transform:scale(1);opacity:1}
.dn-scope.run{animation:dnScope var(--t,20s) cubic-bezier(.45,0,.7,1) forwards}
.dn-scope.off{transition:opacity .5s;opacity:0}
@keyframes dnShrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@keyframes dnScope{0%{transform:scale(1);opacity:1}70%{opacity:.85}100%{transform:scale(3.4);opacity:0}}
`;

const SCOPE = '<svg viewBox="0 0 24 24" fill="none" stroke="#ffd25a" stroke-width="2.4" stroke-linecap="round"><circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L20 20"/></svg>';
const LINEAR = (t) => t;
const HERO_SHADOW = 4; // kahraman varken gölge kapsamının en dar yarı genişliği (birim; harita vars. 14)
// en son açılan Kuşbakışı kartı: eski kartın kapanışı (yeni kart açıldıktan sonra gelebilir) yeninin kahramanını,
// gölgesini ve gecesini bozmasın. Yeni kart açılırken eskisinin temizliği önce (hemen) yapılır: gece tonunun
// "soru öncesi" hali yanlışlıkla eski kartın gecesi olarak kaydedilmesin.
let LIVE = 0;
let PREV = null;
// kademeler: bölge sınırı, sonra il sınırı; ışıma, o sınır kadraja girdiği an gelir (yükseliş filminin payı, en
// erken/en geç). Komşu yapılar yükselişin bu payında geri çıkar.
const CLUE_REGION = [0.38, 0.8];
const CLUE_IL = [0.14, 0.92];
const BURY = [0.16, 0.42];
// kadrajın yarı genişliği / kamera uzaklığı (dikey telefon, yukarıdan bakış; yaklaşık)
const VIEW_HALF = 0.36;

/** Noktanın, verilen illerin dışında kalan illere (bölgenin dış sınırına) en yakın uzaklığı (dünya birimi). */
function outsideDist(b, x, z, inside) {
	let best = Infinity;
	for (const p of b.provinces) {
		if (inside(p)) continue;
		for (const r of p.rings)
			for (let k = 0; k < r.length; k += 2) {
				const d = (r[k] - x) ** 2 + (-r[k + 1] - z) ** 2;
				if (d < best) best = d;
			}
	}
	return Math.sqrt(best);
}

/** Kimlikten (maket ya da boylam/enlem) dünya noktası: { x, y (taban), z, r (yapının yarıçapı), site? }. */
function spotOf(app, q) {
	if (q.site) {
		const s = app?.props?.landmarks?.sites?.find((x) => x.kind === q.site);
		if (s) return { x: s.x, y: s.y, z: s.z, r: s.r || 1, site: s };
	}
	if (Array.isArray(q.at)) {
		const p = lonLatToWorld(q.at[0], q.at[1]);
		const b = app?.board;
		return { x: p.x, z: p.z, y: b?.heightAt ? b.heightAt(p.x, p.z) : 0.5, r: 1 };
	}
	return null;
}

/** Başkent kalesi yapının yerine kurulduysa yapı gömülüdür (landmarks.js FADE ile aynı ölçü). */
function buried(app, s) {
	for (const k of app?.castles || []) {
		if (!k.group.visible) continue;
		const p = k.group.position;
		if (Math.hypot(p.x - s.x, p.z - s.z) < 2.2 + (s.s || 2) * 0.38 + 0.06) return true;
	}
	return false;
}

/**
 * Başlangıç yönü ve eğimi: yükselişin ilk bölümünde (kamera alçakken) yapıyla kamera arasına yamaç ya da başka bir
 * maket girmesin. Adaylar 16 yön × 3 başlangıç eğimi; puan = örtme (arazi ve komşu maketler; gömülen komşular
 * sayılmaz) + tercihten (q.yaw ya da yapının ön yüzü) sapma + eğim cezası. Belirlenimci: iki oyuncu aynı kadrajı
 * görür. Dönen: { yaw, lift }.
 */
function pickYaw(app, sp, plan, pref, bury = 0) {
	const b = app.board;
	const sites = app.props?.landmarks?.sites || [];
	let best = { yaw: pref, lift: 0 };
	let bestS = Infinity;
	for (let n = 0; n < 48; n++) {
		const i = n % 16;
		const lift = [0, 0.16, 0.32][Math.floor(n / 16)];
		const yaw0 = pref + (i < 8 ? i : i - 16) * (Math.PI / 8);
		let occ = 0;
		const ty = sp.y + sp.r * 0.15;
		for (const [u, w] of [[0, 3], [0.1, 2], [0.22, 1]]) {
			const o = plan(u, yaw0, undefined, lift);
			const cp = Math.cos(o.pitch);
			const cx = sp.x - Math.sin(o.yaw) * cp * o.dist;
			const cy = o.y + Math.sin(o.pitch) * o.dist;
			const cz = sp.z + Math.cos(o.yaw) * cp * o.dist;
			for (let s = 0.16; s < 1.0; s += 0.06) {
				const x = sp.x + (cx - sp.x) * s;
				const y = ty + (cy - ty) * s; // yapının alt kısmına bakış (gövde örtülmesin)
				const z = sp.z + (cz - sp.z) * s;
				if (Math.hypot(x - sp.x, z - sp.z) < sp.r * 0.55) continue; // yapının kendisi (çevresindeki sırt sayılır)
				if (b.heightAt && b.heightAt(x, z) + 0.12 > y) occ += w;
				for (const t of sites) {
					if (t === sp.site || (u < BURY[0] && Math.hypot(t.x - sp.x, t.z - sp.z) < bury)) continue;
					if (Math.hypot(x - t.x, z - t.z) < t.r * 0.8 && y < t.y + (t.s || 1) * 0.75) occ += w * 0.7;
				}
			}
		}
		const d = Math.abs(Math.atan2(Math.sin(yaw0 - pref), Math.cos(yaw0 - pref)));
		// alçak, önden bakış tercih; yamaç örtüyorsa kamera biraz daha yüksekten başlar
		const sc = occ + d * 0.9 + lift * 5;
		if (sc < bestS) {
			bestS = sc;
			best = { yaw: yaw0, lift };
		}
	}
	return best;
}

export const kusbakisi = {
	time: 22,
	label: 'Kuşbakışı',
	kind: 'exact',
	needsMap: true,
	prepare(q, R) {
		const order = shuffle([0, 1, 2, 3], R);
		const v = { q, opts: order.map((i) => q.a[i]), right: order.indexOf(0) };
		stamp(v, q, (q2, k, P, text) => {
			for (const a of q2.a) text(a);
			return {
				// kart açılınca kamera bir an maketin dibinde durur, sonra yükselir: ortalama oyuncu birkaç sn uzaklaşmayı izler
				wait: 0.5 + 0.9 + 3,
				look: LOOK.orient + 4 * LOOK.gaze + LOOK.image,
			};
		});
		// yükseliş filminin süresi: sorunun kendi bütçesi (galerinin "Sınırsız" kipinde v.sec 600 olur, film yine aynı)
		v.film = v.sec;
		return v;
	},
	/** Bu soru şu haritada sorulabilir mi: yapı var ve başkent kalesinin altında gömülü değil. */
	usable(q, app = appOf()) {
		if (!q.site) return true;
		const s = app?.props?.landmarks?.sites?.find((x) => x.kind === q.site);
		return !!s && !buried(app, s);
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('kusbakisi', CSS);
		const app = appOf();
		el.innerHTML = `<div class="dn-kb">
			<div class="dn-kb-top"><span class="sc">${SCOPE}</span><span>Dürbün yükseliyor</span><span class="dn-kb-bar"><i></i></span><b>ERKEN BİL</b></div>
			<div data-r="o"></div>
		</div>`;
		const c = mountChoice(el.querySelector('[data-r=o]'), v, api, { onPick: () => sfx(app, 'tap') });
		const bar = el.querySelector('.dn-kb-bar i');
		const FILM = Math.min(v.sec || 20, v.film || v.sec || 20);
		bar.style.setProperty('--t', FILM + 's');
		if (!app) return { lock: c.lock, reveal: (r) => c.reveal(r), destroy() {} };
		const q = v.q;
		PREV?.(); // önceki Kuşbakışı kartının temizliği önce
		const sp = spotOf(app, q);
		const lm = app.props?.landmarks;
		const me = ++LIVE;
		const b = app.board;
		const G = b.G;
		const g = guard(app);
		g.allActive();
		const unlock = camLock(app);
		// maketler ipucudur: harita sorusu onları gömmüştü, geri çıkar (il adları kapalı kalır)
		lm?.fade?.(true);
		// gece ("Gölgede Renk"): yalnız yapının çevresi sıcak ışık havuzunda; kıyı ve göller ay ışığında seçilir
		g.dark([]);
		if (sp && G.uPool) G.uPool.value.set(sp.x, sp.z, Math.max(2.2, sp.r * 2.0), 1);
		// ipucu kademeleri: yapının ili ve bölgesi (çevrimiçinde il gizli: yapının konumundan)
		const il = sp ? b.pick(sp.x, sp.z) : -1;
		const region = il >= 0 ? b.provinces[il].region : null;
		const bury = sp?.site ? Math.max(1.6, sp.r * 1.7) : 0;
		// sınırlar kadraja ne zaman girer (yükseliş payı): bölgenin dış sınırına ve ilin sınırına uzaklıktan
		// dürbün halkası: kartın altındaki boş alanın ortasında
		const scope = document.createElement('div');
		scope.className = 'dn-scope';
		scope.style.setProperty('--t', FILM * 0.9 + 's');
		app.ui.$.pins.appendChild(scope);
		const near = q.near || 4.2 + (sp?.r || 1) * 0.8;
		const far = q.far || 64;
		const frame = () => {
			const top = cardTop(el);
			scope.style.setProperty('--cy', ((top + (1 - top) / 2) * 100).toFixed(1) + '%');
			return top;
		};
		// yükseliş planı: soru saatine bağlı (kare hızından bağımsız; çevrimiçinde iki oyuncu aynı anda aynı kadrajı
		// görür). Uzaklık logaritmik (sabit hızda açılır), eğim yandan tepeye hızlı başlayıp yavaşlar, yarım tur dönüş.
		const T = FILM * 0.92;
		const y0 = sp ? sp.y + sp.r * 0.45 : 0;
		const O = { y: 0, dist: near, pitch: 0.3, yaw: 0, dur: 0.25, arc: 0, ease: LINEAR, distMin: 1, lens: 0 };
		const plan = (u, yaw0, o = { y: 0, dist: 0, pitch: 0, yaw: 0 }, lift = 0) => {
			o.dist = near * Math.pow(far / near, u);
			o.pitch = 0.3 + lift * (1 - u) * (1 - u) + (0.68 - lift * 0.4) * (1 - Math.pow(1 - u, 1.7));
			o.yaw = yaw0 + 0.9 * u;
			o.y = y0 + (sp.y - y0) * Math.min(1, u * 1.5);
			return o;
		};
		// tercih: soruda verilen yön, yoksa yapının ön yüzüne hafif sağdan bakış
		const pref = typeof q.yaw === 'number' ? q.yaw : sp?.site ? -(sp.site.ry || 0) + 0.45 : 0.6;
		const pick = sp ? pickYaw(app, sp, plan, pref, bury) : { yaw: pref, lift: 0 };
		const uSee = (d) => Math.log(Math.max(1e-3, d / (VIEW_HALF * near))) / Math.log(far / near);
		const cl = (u, [a, b]) => Math.min(b, Math.max(a, u));
		const uR = sp && region ? cl(uSee(outsideDist(b, sp.x, sp.z, (p) => p.region === region)) + 0.04, CLUE_REGION) : 1;
		const uP = sp && il >= 0 ? cl(Math.max(uR + 0.14, uSee(outsideDist(b, sp.x, sp.z, (p) => p.index === il)) + 0.04), CLUE_IL) : 1;
		const at = (t) => plan(Math.min(1, Math.max(0, t / T)), pick.yaw, O, pick.lift);
		// kahraman maket: kare kare kurulur; kamera hazır olunca (en geç kart açılınca) yapının dibine kesilir
		const useHero = !!(sp?.site && lm?.hero && !buried(app, sp.site));
		let ready = !useHero;
		let heroOn = false;
		let placed = false;
		const place = () => {
			if (placed || !sp || !el.isConnected || !ready) return;
			placed = true;
			O.lens = frame() / 2;
			cut(app, sp.x, sp.z, at(0));
		};
		if (useHero) {
			lm.hero(sp.site.kind, (info) => {
				ready = true;
				if (!el.isConnected) return LIVE === me && lm.heroOff();
				heroOn = !!info;
				if (heroOn && app.shadow) app.shadow.minHalf = HERO_SHADOW;
				if (heroOn && lm.uHide) lm.uHide.value.z = bury;
				place();
			});
		} else queueMicrotask(place);
		let tick = 0;
		const stopOpen = onOpen(el, () => {
			if (!sp) return;
			if (!ready) lm.heroNow(); // kurulum bitmediyse şimdi bitir (saat başlıyor)
			ready = true;
			place();
			O.lens = frame() / 2;
			const t0 = clock.now();
			const STEP = 0.25;
			let clue = 0;
			// her çeyrek saniyede bir sonraki çeyreğin kadrajına doğrusal geçiş (kare başına iş ve nesne yok); kademeler
			// (komşu yapıların geri çıkışı, bölge ve il sınırı ışıması) soru saatine bağlı
			const step = () => {
				if (!el.isConnected) return clearInterval(tick);
				const t = (clock.now() - t0) / 1000 + STEP;
				app.cam.shot(sp.x, sp.z, at(t));
				const u = t / T;
				if (heroOn && lm.uHide && LIVE === me) lm.uHide.value.z = bury * (1 - Math.min(1, Math.max(0, (u - BURY[0]) / (BURY[1] - BURY[0]))));
				if (clue === 0 && u >= uR && region) {
					clue = 1;
					b.edgeGlow?.(region, il, { at: { region: G.uTime.value, il: -1 }, dur: 1.6 });
				}
				if (clue === 1 && u >= uP) {
					clue = 2;
					b.edgeGlowAt?.(null, G.uTime.value);
				}
				if (t >= T + 0.5 || (t >= T && clue === 2)) clearInterval(tick);
			};
			step();
			tick = setInterval(step, STEP * 1000);
			bar.classList.add('run');
			scope.classList.add('run');
			sfx(app, 'whoosh');
		});
		const close = onClose(el, () => {
			stopOpen();
			clearInterval(tick);
			unlock();
			scope.remove();
			if (PREV === close) PREV = null;
			if (LIVE !== me) return; // yeni bir Kuşbakışı kartı açıldı: sahne artık onun
			g.restore();
			b.edgeGlowOff?.();
			if (G.uPool) G.uPool.value.w = 0;
			if (useHero) lm.heroOff();
			if (lm?.uHide) lm.uHide.value.z = 0;
			if (app.shadow) app.shadow.minHalf = 14;
		});
		PREV = close;
		return {
			lock: c.lock,
			reveal(results) {
				c.reveal(results);
				clearInterval(tick);
				unlock();
				scope.classList.add('off');
				const i = b.byId.get(q.il)?.index ?? (sp ? b.pick(sp.x, sp.z) : -1);
				if (i < 0) return;
				const p = b.provinces[i];
				// cevap: hedef il gecenin içinde tam gün ışığına çıkar (beyaz dış hat), il sınırı ışıması sürer
				g.dark([i]);
				G.uSelLit.value = 1;
				if (b.uGlow && !(b.uGlow.value.y > 0)) b.edgeGlow?.(b.provinces[i].region, i, { at: { region: G.uTime.value, il: G.uTime.value }, dur: 0.8 });
				g.fx(i, 0.45, 1);
				const pt = sp || p;
				tag(app, `<b>${esc(p.name)}</b>${q.site && SITE_NAMES[q.site] ? `<em>${esc(SITE_NAMES[q.site])}</em>` : ''}`, pt.x, pt.z, 'big').el.style.setProperty('--tc', '#ffd25a');
				// kadraj: il ve yapı birlikte, kartın altında
				const bb = app.boundsOf([i]);
				const m = 3;
				app.cam.fit({ x0: Math.min(bb.x0, pt.x) - m, x1: Math.max(bb.x1, pt.x) + m, z0: Math.min(bb.z0, pt.z) - m, z1: Math.max(bb.z1, pt.z) + m }, { pitch: 0.82, pad: 1.2, top: cardTop(el), dur: 1.7, arc: 3 });
			},
			destroy: close,
		};
	},
	/**
	 * Çevrimiçi görünüm: doğru şık ve il gizli. Kameranın gideceği yer (site) istemciye gitmek zorunda (tipin doğası);
	 * hile yapan bir istemci konumdan ili çıkarabilir: bu yüzden çevrimiçi sürümde site adı yerine anlamsız bir kimlik
	 * ve konum gönderilmeli, düelloda iki oyuncu aynı anda aynı kadrajı görür (kamera soru saatine bağlı).
	 */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.right;
		delete o.q.a;
		delete o.q.il;
		return o;
	},
	judge(v, value) {
		return { correct: value === v.right, err: value === v.right ? 0 : 1 };
	},
	bot(v, skill, R) {
		const ok = R() < Math.min(0.95, pCorrect(skill, v.q.diff) + 0.05);
		let value = v.right;
		if (!ok) do value = Math.floor(R() * 4); while (value === v.right);
		// bot da kamera biraz yükselir yükselmez bilir (ortanca oyuncudan önce değil)
		return { value, time: botTime(v, R, skill, 0.25, 0.95) };
	},
};
