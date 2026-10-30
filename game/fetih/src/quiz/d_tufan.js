// TUFAN (deneme): "Deniz yükselirse hangisi EN SON batar?" (ya da ÖNCE). Dört il, il merkezi rakımları.
//
// Soru anı: gece, fırtına öncesi. Dört il kaidesinde ışıkta; yağmur yağar, deniz dalgalı ve yavaş kabarır (gösterge
// "+6 m"), seyrek (8–15 sn) dallanan bir şimşek ufukta çakar; gök ve deniz yumuşakça aydınlanır, uzaktan gök gürler.
// Cevap (film, `revealMs`): tek bir akan kamera yolculuğu (anahtar karelerden geçen, zamanla parametrelenmiş Hermite
// eğrisi; hız sürekli, ani dönüş yok, ufuk düz, kesme yok):
//
//   ÇEKİM LİSTESİ (sn)  yol                                                     hedef
//   0.0 – 1.7   açılış      sorunun yüksek kadrajından ağır yaklaşma ve hafif yörünge   dört il, deniz tarafı
//   1.7 – 3.5   vinç inişi  kıyıya iner, deniz üstünden karaya bakar; su kıyıdan girer   ilk ilin kıyısı → ili
//   3.5 – 4.3   ilk batış   yakında ağır yaklaşma ve yörünge                            ilk il (batar)
//   4.3 – 5.3   süzülüş     yükselir, öbür ile süzülür, gelinen yönden iner             ikinci il (batar)
//   5.3 – 7.1   aynı dil    süzülüş, iniş, ağır yaklaşma                               üçüncü il (batar)
//   7.1 – 8.8   su seviyesi son adaya alçaktan, suyun üstünden bakış                     son ada
//   8.8 – 10.9  vinç        yavaşça yükselir ve döner; fırtına dağılır, altın ışık        son ada, sular altındaki ülke
//
// Film boyunca il sahiplerinin renkleri ve başkent kaleleri gizli (doğal arazi); soru bitince geri gelir. Kamera
// araziye ve büyük yapılara girmez (yol önceden örneklenir, gereken anahtar karede eğim artar), kart kadrajı kapatmaz.
// Ses: d_tufan_ses.js (yağmur yatağı, yükseliş uğultusu, uzak gök gürültüsü, batışta gulp, son adada sıcak pad).
//
// Veri: mode: 'son' | 'once', ils: [[plaka, rakım m], …] (dört il). Doğru şık mode'a göre en yüksek ya da en alçak.
//       Rakımlar: il merkezi rakımı (Harita Genel Komutanlığı il merkezi rakımları tablosu; ansiklopedik kaynaklarla
//       aynı); seçenekler arası en az 150 m fark (sınama denetler). Ekranda 10 m'ye yuvarlanmış "≈1.890 m" yazılır:
//       kaynaklar arası birkaç on metrelik oynama yanlış görünmesin.
// Değer: şık indeksi. Tür 'exact'.
// Sahne (su, yağmur, şimşek, fırtına ışığı): d_tufan_film.js. Harita koduna kanca yok: board.sea.visible, il yükselme
// dizileri (lift/liftTo), sahip boyası (guard) ve ortak ışık uniform'ları (kaydedilir, soru bitince geri konur).
// Süre: `revealMs` filmin uzunluğu (ui.reveal cevap ekranını bu kadar tutar; dokununca erken geçer).
// Çevrimiçi: publicView doğru şıkkı, il plakalarını ve rakımları taşımaz (illerin yeri istemciye kart kapanınca
// cevapla gelir; soru anındaki etiketler yalnız ad ve konum).

import * as THREE from 'three';
import { css, esc, shuffle, pCorrect, mountChoice, buzz } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, guard, camLock, onClose, onOpen, cardTop, tag, sfx, rule, stampLater, LOOK, DENEME_CSS } from './d_ortak.js';
import { floodOf, holdLift, rainFrame, boltAt, glowAt } from './d_tufan_film.js';
import { sesOf } from './d_tufan_ses.js';
import { clock, setTimeout } from '../core/clock.js';
import { BASE, VS, LIFT } from '../map/terrain.js';
import DATA from '../data/turkiye.json';

export { floodOf, holdLift };

const PROV = DATA.provinces;
const BY_ID = new Map(PROV.map((p, i) => [p.id, i]));
/** Ekrandaki rakım: 10 m'ye yuvarlanmış, "≈1.890 m" (kaynaklar arası küçük farklar yanlış görünmesin); 100 m altı olduğu gibi. */
const fmtM = (m) => (m < 100 ? Math.round(m) + ' m' : '≈' + (Math.round(Number(m) / 10) * 10).toLocaleString('tr-TR') + ' m'); // kıyı illeri (4 m) olduğu gibi
const fmtG = (m) => '+' + Math.round(m).toLocaleString('tr-TR') + ' m';

/** Metre → su düzleminin yüksekliği (birim): 0 m'de deniz (y 0), ~30 m'de kıyı kara yüksekliği (BASE). */
const levelY = (m) => (m <= 0 ? 0 : BASE * Math.min(1, m / 30) + m * VS);
const PED = 0.3; // soru anı: seçenek illerin kaidesi (lift)
const PED_R = 0.14; // tufan: alçak kaide (il merkezi rakımına dek su üstünde; alçak yerlerine su sızar, yan duvarı ince)
const SINK = 1.3; // batış süresi (sn)
const Q_RISE = 14; // soru boyunca deniz en çok bu kadar kabarır (m)

// film takvimi (cevaptan sonra sn): su yükselmeye başlar, dört seçenek rakımı; son
const KT = [0.9, 3.7, 5.5, 7.3, 8.8];
const END = 10.9;

const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const TAU = Math.PI * 2;
const wrapPi = (a) => a - TAU * Math.round(a / TAU);
/** (dx, dz) yönünde duran kameranın yaw'ı (camera.js: kamera = hedef + (-sin yaw, cos yaw) · uzaklık). */
const yawFrom = (dx, dz) => Math.atan2(-dx, dz);

/**
 * Kamera yolu: anahtar kareler { t, x, y, z, d (uzaklık), p (eğim), w (yaw) } üzerinden zamanla parametrelenmiş
 * kübik Hermite (teğetler komşulardan, tepe ve diplerde sıfır: aşma yok; uçlarda sıfır: yumuşak kalkış ve duruş).
 * Uzaklık logaritmik, yaw sarmasız. at(t, out) kare başına nesne üretmez.
 */
function camPath(keys) {
	const n = keys.length;
	const F = ['x', 'y', 'z', 'd', 'p', 'w'];
	for (let i = 0; i < n; i++) {
		keys[i].d = Math.log(keys[i].dist);
		if (i) keys[i].w = keys[i - 1].w + wrapPi(keys[i].w - keys[i - 1].w);
	}
	const M = keys.map(() => ({}));
	const tangents = () => {
		for (let i = 0; i < n; i++)
			for (const f of F) {
				if (i === 0 || i === n - 1) {
					M[i][f] = 0;
					continue;
				}
				const a = keys[i][f] - keys[i - 1][f];
				const b = keys[i + 1][f] - keys[i][f];
				M[i][f] = a * b <= 0 ? 0 : (keys[i + 1][f] - keys[i - 1][f]) / (keys[i + 1].t - keys[i - 1].t);
			}
	};
	tangents();
	return {
		keys,
		tangents,
		at(t, o) {
			let i = 0;
			if (t <= keys[0].t) i = 0;
			else if (t >= keys[n - 1].t) i = n - 2;
			else while (i < n - 2 && t >= keys[i + 1].t) i++;
			const A = keys[i];
			const B = keys[i + 1];
			const h = B.t - A.t;
			const u = Math.max(0, Math.min(1, (t - A.t) / h));
			const u2 = u * u;
			const u3 = u2 * u;
			const h00 = 2 * u3 - 3 * u2 + 1;
			const h10 = u3 - 2 * u2 + u;
			const h01 = -2 * u3 + 3 * u2;
			const h11 = u3 - u2;
			const ma = M[i];
			const mb = M[i + 1];
			o.x = h00 * A.x + h10 * h * ma.x + h01 * B.x + h11 * h * mb.x;
			o.y = h00 * A.y + h10 * h * ma.y + h01 * B.y + h11 * h * mb.y;
			o.z = h00 * A.z + h10 * h * ma.z + h01 * B.z + h11 * h * mb.z;
			o.dist = Math.exp(h00 * A.d + h10 * h * ma.d + h01 * B.d + h11 * h * mb.d);
			o.p = h00 * A.p + h10 * h * ma.p + h01 * B.p + h11 * h * mb.p;
			o.w = h00 * A.w + h10 * h * ma.w + h01 * B.w + h11 * h * mb.w;
			return o;
		},
	};
}

// ---------------------------------------------------------------- tip

const CSS = /* css */ `
.dn-tf{display:flex;flex-direction:column;gap:8px}
.dn-tf .fl-opt{min-height:46px}
.fl-q.dn-tf-rv .fl-jk{display:none}
.dn-tf.flood .fl-opt{min-height:42px}
.dn-tf .fl-opt span{display:flex;flex-direction:column;gap:1px}
.dn-tf .fl-opt em{font-style:normal;font-family:'Lilita One';font-weight:400;font-size:13px;letter-spacing:.03em;color:#2a6fd0;opacity:0;transform:translateY(4px);transition:opacity .3s,transform .3s}
.dn-tf .fl-opt.alt em{opacity:1;transform:none}
.dn-tf .fl-opt.sunk{background:linear-gradient(180deg,#bfe6ff,#7cc0f0);border-color:#4aa0e8;color:#0b2a52}
.dn-tf .fl-opt.sunk::before{content:'';position:absolute;inset:auto 0 0 0;height:42%;border-radius:0 0 14px 14px;background:linear-gradient(180deg,rgba(40,120,220,.0),rgba(40,120,220,.45));
  -webkit-mask:radial-gradient(9px 6px at 9px 0,transparent 98%,#000) 0 0/18px 100% repeat-x;mask:radial-gradient(9px 6px at 9px 0,transparent 98%,#000) 0 0/18px 100% repeat-x;animation:dnTfWave 1.6s linear infinite}
.dn-tf .fl-opt.isle{box-shadow:0 0 0 3px #ffd25a,0 0 22px rgba(255,210,90,.75),0 5px 0 rgba(0,0,0,.3)}
.dn-tf-g{display:flex;align-items:center;gap:8px;height:0;overflow:hidden;opacity:0;transition:height .35s,opacity .35s;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#cfe0ff}
.dn-tf.flood .dn-tf-g{height:30px;opacity:1}
.dn-tf-g i{flex:none;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 50% 120%,#3aa8ff 0 48%,#0a1534 50%);border:2px solid #7cc8ff;overflow:hidden;position:relative}
.dn-tf-g i::after{content:'';position:absolute;left:-50%;right:-50%;bottom:30%;height:60%;border-radius:45%;background:rgba(124,200,255,.55);animation:dnTfSpin 2.2s linear infinite}
.dn-tf-g s{flex:1;height:8px;border-radius:6px;background:rgba(255,255,255,.14);position:relative;text-decoration:none}
.dn-tf-g s u{position:absolute;inset:0;border-radius:6px;background:linear-gradient(90deg,#2f6bff,#62e3d4);transform-origin:0 50%;transform:scaleX(0)}
.dn-tf-g s em{position:absolute;top:50%;width:15px;height:15px;margin:-7.5px 0 0 -7.5px;border-radius:50%;background:#1a2550;border:2px solid #ffd25a;font-style:normal;font-family:'Lilita One';font-size:9px;line-height:11px;text-align:center;color:#ffd25a;letter-spacing:0;
  animation:flPopIn .3s cubic-bezier(.3,1.7,.5,1) both;transition:background .25s,border-color .25s,color .25s}
.dn-tf-g s em.wet{background:#6fc8ff;border-color:#bfefff;color:#0b2a52}
.dn-tf-g s em.top{border-color:#ffd25a;background:#ffd25a;color:#3a2a00;box-shadow:0 0 10px rgba(255,210,90,.8)}
.dn-tf-g b{text-transform:none;font-family:'Lilita One';font-weight:400;font-size:20px;letter-spacing:.02em;color:#9fe6ff;min-width:84px;text-align:right;text-shadow:0 2px 0 rgba(0,0,0,.4);font-variant-numeric:tabular-nums}
.dn-tf-g.hot b{color:#ffb08a;animation:dnTfPulse 1.4s ease-in-out infinite}
.dn-tag.tf>div{--tc:#ffd25a}
.dn-tag.tf.off{opacity:0;transition:opacity .2s}
.dn-tag.tf.sunk>div{--tc:#6fc8ff;background:rgba(8,40,80,.9)}
.dn-tag.tf.isle>div{--tc:#ffd25a;background:linear-gradient(180deg,#3a2a00,#1a1200);box-shadow:0 0 18px rgba(255,210,90,.7),0 3px 0 rgba(0,0,0,.35)}
.fl-q.dn-tf-film .fl-stamp.on{animation:flStampB .45s cubic-bezier(.3,1.7,.5,1) forwards,dnTfOut .4s 1.3s ease-in forwards}
.dn-tf-cap{position:absolute;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;z-index:6;opacity:0}
.dn-tf-cap.on{animation:dnTfCap 1.5s cubic-bezier(.25,.6,.3,1) forwards}
.dn-tf-cap.stay{animation:dnTfCapIn 1.1s cubic-bezier(.25,.6,.3,1) forwards}
.dn-tf-cap b{font-family:'Lilita One';font-weight:400;font-size:32px;line-height:1;letter-spacing:.16em;color:#fff;text-transform:uppercase;text-shadow:0 2px 0 rgba(0,0,0,.55),0 0 14px rgba(4,12,30,.7),0 0 26px rgba(70,160,255,.6)}
.dn-tf-cap small{font-family:'Fredoka';font-weight:600;font-size:12px;letter-spacing:.32em;text-transform:uppercase;color:#bfefff;padding:3px 12px 0;border-top:1px solid rgba(191,239,255,.55);text-shadow:0 1px 0 rgba(0,0,0,.7),0 0 8px rgba(4,12,30,.8)}
.dn-tf-cap.gold{padding:8px 0 9px;background:radial-gradient(ellipse 52% 100% at 50% 50%,rgba(8,12,28,.62),rgba(8,12,28,.38) 55%,rgba(8,12,28,0) 100%)}
.dn-tf-cap.gold b{color:#ffd25a;-webkit-text-stroke:1.2px rgba(52,26,0,.85);paint-order:stroke fill;text-shadow:0 2px 0 rgba(40,18,0,.9),0 0 10px rgba(8,10,24,.9),0 0 24px rgba(8,10,24,.7),0 0 34px rgba(255,190,70,.45)}
.dn-tf-cap.gold small{color:#ffeab4;border-color:rgba(255,215,120,.7);text-shadow:0 1px 0 rgba(0,0,0,.85),0 0 8px rgba(8,10,24,.95)}
@keyframes dnTfCap{0%{opacity:0;transform:translateY(8px)}22%{opacity:1;transform:none}76%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-4px)}}
@keyframes dnTfCapIn{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:none}}
@keyframes dnTfOut{to{opacity:0;transform:translate(-50%,-50%) rotate(-6deg) scale(.8)}}
@keyframes dnTfPulse{50%{opacity:.6}}
@keyframes dnTfWave{to{-webkit-mask-position:18px 0;mask-position:18px 0}}
@keyframes dnTfSpin{to{transform:rotate(360deg)}}
`;

export const tufan = {
	time: 24,
	label: 'Tufan',
	kind: 'exact',
	needsMap: true,
	/** Cevap filmi (ms): ui.reveal cevap ekranını bu kadar tutar. */
	revealMs: Math.round(END * 1000 + 100),
	prepare(q, R) {
		const order = shuffle([0, 1, 2, 3], R);
		const alts = q.ils.map((x) => x[1]);
		const best = q.mode === 'once' ? alts.indexOf(Math.min(...alts)) : alts.indexOf(Math.max(...alts));
		const names = q.ils.map(([id]) => PROV[BY_ID.get(id)]?.name || String(id));
		const v = { q, opts: order.map((i) => names[i]), ils: order.map((i) => q.ils[i][0]), alt: order.map((i) => q.ils[i][1]), right: order.indexOf(best) };
		return stamp(v, q, (q2, k, P, text) => {
			for (const n of names) text(n);
			return { wait: 0.5 + 0.9, look: LOOK.orient + LOOK.map + 4 * LOOK.gaze };
		});
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('tufan', CSS);
		const app = appOf();
		el.innerHTML = `<div class="dn-tf">
			<div class="dn-tf-g"><i></i><span>Deniz</span><s><u></u></s><b>+0 m</b></div>
			<div data-r="o"></div>
		</div>`;
		const root = el.firstElementChild;
		const c = mountChoice(el.querySelector('[data-r=o]'), v, api, { onPick: () => sfx(app, 'tap') });
		rule(el, v.q.mode === 'once' ? 'İlk batanı bul' : 'Son adayı bul');
		if (!app) return { lock: c.lock, reveal: (r) => c.reveal(r), destroy() {} };
		const b = app.board;
		const C = app.cam;
		const idx = v.ils.map((id) => BY_ID.get(id));
		const gQ = guard(app); // soru anı: gece, dört il ışıkta (sahip renkleri gizli)
		const gR = guard(app); // tufan: kaideler ve batış
		const gH = guard(app); // film: sahip renkleri gizli kalır (soru bitince dalgayla geri gelir)
		gQ.allActive();
		gQ.dark(idx);
		for (const i of idx) gR.fx(i, PED, 0.35);
		const fl = floodOf(app);
		let snd = sesOf(app); // ses bağlamı ilk dokunuşla açılır: cevapta yeniden denenir
		const unlock = camLock(app);
		const tags = idx.map((i, k) => {
			const p = b.provinces[i];
			const t = tag(app, `<b>${'ABCD'[k]}</b>${esc(p.name)}`, p.x, p.z, 'tf');
			t.el.classList.add('tf');
			return t;
		});
		const bb = app.boundsOf(idx);
		const frame = (pitch, dur, extra = {}) =>
			C.fit({ x0: bb.x0 - 3, x1: bb.x1 + 3, z0: bb.z0 - 3, z1: bb.z1 + 2 }, { pitch, pad: 1.18, top: cardTop(el), dur, arc: 3, ...extra });
		// soru anı: alçak, eğik bakış (dört il önde, ufuk ve fırtınalı gök kadrajda): şimşek ufukta çakar
		const Q_PITCH = 0.36;
		queueMicrotask(() => el.isConnected && frame(Q_PITCH + 0.08, 0.9));
		const gauge = root.querySelector('.dn-tf-g b');
		const gBox = root.querySelector('.dn-tf-g');
		const bar = root.querySelector('.dn-tf-g u');
		const card = el.closest('.fl-q');
		const host = card?.parentElement;
		// film yazısı (il adı + rakım): kartın hemen altında, haritanın üstünde
		const cap = document.createElement('div');
		cap.className = 'dn-tf-cap';
		cap.innerHTML = '<b></b><small></small>';
		host?.appendChild(cap);
		const caption = (big, small, gold = false, stay = false) => {
			if (!host || !card) return;
			cap.style.top = card.offsetTop + card.offsetHeight + 18 + 'px';
			cap.firstChild.textContent = big;
			cap.lastChild.textContent = small;
			cap.className = 'dn-tf-cap';
			void cap.offsetWidth;
			cap.className = `dn-tf-cap ${stay ? 'stay' : 'on'}${gold ? ' gold' : ''}`;
		};
		let reveal = false;
		let closed = false;
		// gece okunur kalsın: dört il gölgede renk tonunun aydınlık yüzüyle (tam gündüz değil), kıyılar ay ışığında
		const litUp = () => {
			if (reveal) return;
			b.G.uSelLit.value = Math.max(b.G.uSelLit.value, 0.6);
			// gölgede renk tonunun biraz aydınlığı: kıyılar, dağlar ve il sınırları gecede seçilir (guard.restore geri alır)
			b.G.uNightTone.value.set(2.7, 2.5, 2.3, 0.95);
		};
		litUp();
		const stopOpen = onOpen(el, () => {
			// düello filmi sahneyi gündüze döndürebilir: gece, kart açılınca (ve az sonra) yeniden kurulur
			gQ.dark(idx);
			litUp();
			setTimeout(() => !reveal && el.isConnected && (gQ.dark(idx), litUp()), 1200);
			frame(Q_PITCH, 5, { yawRate: 0.012 });
			snd.bed();
			nextBolt = (clock.now() - tq0) / 1000 + 1.4; // ilk şimşek kart açıldıktan az sonra
		});

		// ------------------------------------------------ hava: yağmur, şimşek, fırtına ışığı (kare başına nesne yok)
		const U = fl?.U;
		let lastNow = -1;
		let tq0 = clock.now();
		let qM = 0; // soru anındaki kabarma (m)
		let boltT = -9;
		let nextBolt = 2.6;
		let boltN = 0;
		const pxAng = () => (2 * Math.tan((app.camera.fov * Math.PI) / 360)) / Math.max(200, app.canvas?.clientHeight || innerHeight);
		/**
		 * Şimşek: kartın hemen altındaki görünen şeridin bir yanında (ekrandan dünyaya ışın). Alçak bakışta ışın zemine
		 * uzaktan değer ya da hiç değmez: şimşek ufukta, gökte çakar; yüksek bakışta denize iner. Kameradan hep uzak.
		 */
		const strike = (t, near = 0.35, sky = false) => {
			boltT = t;
			boltN++;
			const cam = app.camera;
			const side = boltN % 2 ? 1 : -1;
			const d = C.dist;
			// kartın altındaki görünen şerit: alçak bakışta (sky) ufuk çizgisinden göğe yükselen iri şimşek, ortaya yakın
			const ndcY = 1 - 2 * Math.min(0.9, cardTop(el) + (sky ? 0.3 : 0.1));
			const o = new THREE.Vector3(cam.position.x, cam.position.y, cam.position.z);
			const r = new THREE.Vector3(side * (sky ? 0.12 + 0.22 * Math.random() : 0.3 + 0.25 * Math.random()), ndcY, 0.5).unproject(cam).sub(o).normalize();
			let k = r.y < -0.02 ? -o.y / r.y : Infinity;
			const far = d * 1.5; // ufuktaki şimşek kameraya yakınca: gökte iri görünür
			if (k > far) k = far;
			const ox = o.x + r.x * k;
			const oz = o.z + r.z * k;
			let fx = r.x;
			let fz = r.z;
			const fL = Math.hypot(fx, fz) || 1;
			fx /= fL;
			fz /= fL;
			// ufukta (alçak bakış): gökte iri, yere kadar inen dallı şimşek; yüksek bakışta denize iner
			const big = sky || k >= far;
			const H = big ? d * (0.8 + 0.25 * Math.random()) : Math.min(d * (0.28 + 0.12 * Math.random()), Math.max(2, cam.position.y * 0.6));
			fl.bolt.strike(ox, big && k >= far ? -H * 0.15 : 0, oz, H, -fz, fx, Math.random());
			U.uBolt.value.set(ox, oz, 0, d * 0.45);
			snd.thunder(0.9 + Math.random() * 1.3, side * 0.6, near);
			if (globalThis.__fl) globalThis.__fl.tfBolt = (globalThis.__fl.tfBolt || 0) + 1; // çekim araçları için (geliştirme)
		};
		const atmos = (t, S, rain, gold, rise, wet) => {
			const db = t - boltT;
			const Lb = boltAt(db);
			const Lg = glowAt(db);
			const night = b.G.uNight.value.x;
			fl.bolt.U.uI.value = Lb;
			fl.bolt.U.uPx.value = pxAng();
			fl.bolt.mesh.visible = Lb > 0.003;
			fl.storm.apply(S, Lg, gold, night);
			U.uFl.value.set(S, Lg * 0.5, rise, wet);
			U.uBolt.value.z = Lg;
			U.uRain.value = rain;
			rainFrame(fl, C, rain, t, night, fl.bolt.U.uPx.value);
		};
		let lastG = -1;
		// soru anı: gece fırtınası, deniz kabarır, seyrek şimşek
		const qTick = () => {
			const now = clock.now();
			if (now === lastNow) return;
			lastNow = now;
			const t = (now - tq0) / 1000;
			qM = Math.min(Q_RISE, t * 0.6);
			fl.level(levelY(qM));
			if (t >= nextBolt) {
				strike(t, 0.3, true); // soru anı: alçak bakışta ufukta iri, dallı şimşek
				nextBolt = t + 8 + 7 * (0.5 + 0.5 * Math.sin(boltN * 12.9898));
			}
			atmos(t, 0.6 * smooth(t / 2), 0.6 * smooth(t / 2.5), 0, 0.12, 0.006);
			const r = Math.round(qM);
			if (r !== lastG) {
				lastG = r;
				gauge.textContent = fmtG(r);
			}
		};
		root.classList.add('flood');
		gBox.classList.add('hot');
		if (fl) {
			fl.setOpts(idx);
			U.uFl.value.w = 0.006;
			fl.ready.then(() => {
				if (closed || reveal) return;
				fl.on();
				tq0 = clock.now();
				fl.tick = qTick;
			});
		}
		const wx = app.weather;
		const calm0 = wx?.calmTo;
		const castles = (app.castles || []).map((k) => [k, k.group.visible]);
		const close = onClose(el, () => {
			closed = true;
			stopOpen();
			if (fl) fl.off();
			snd.stop();
			unlock();
			cap.remove();
			card?.classList.remove('dn-tf-film');
			if (wx && calm0 != null) wx.calmTo = calm0;
			for (const [k, vis] of castles) k.group.visible = vis;
			gR.restore(false);
			gQ.restore();
			gH.restore(true);
		});

		// ------------------------------------------------ kamera yardımcıları
		// büyük yapılar: yalnız dört ilin çevresindekiler (yol denetimi ucuz kalsın)
		const sites = (app.props?.landmarks?.sites || []).filter((st) => st.x > bb.x0 - 25 && st.x < bb.x1 + 25 && st.z > bb.z0 - 25 && st.z < bb.z1 + 25);
		let ped = PED;
		let waterY = 0;
		/** Zemin: il içi kabartma (seçenek illeri kaidesiyle) ve büyük yapılar, il dışı deniz; su yüksekse su. */
		const ground = (x, z) => {
			const q = fl ? fl.pidAt(x, z) : 1;
			let g = q ? b.heightAt(x, z) + (idx.includes(q - 1) ? ped * LIFT + 0.08 : 0) : 0.06;
			for (const st of sites) if (Math.abs(st.x - x) < 3 && Math.abs(st.z - z) < 3 && Math.hypot(st.x - x, st.z - z) < st.r * 1.6 + 0.6) g = Math.max(g, st.y + st.s * 2.4);
			return Math.max(g, waterY);
		};
		/** Kamera noktası ve bakış hattı zeminin üstünde mi (nokta 0.3, hat 0.06 pay). */
		const clear = (o) => {
			const cp = Math.cos(o.p);
			const sp = Math.sin(o.p);
			for (let s = 0.3; s <= 1.0001; s += 0.1) {
				const px = o.x - Math.sin(o.w) * cp * o.dist * s;
				const pz = o.z + Math.cos(o.w) * cp * o.dist * s;
				if (o.y + sp * o.dist * s < ground(px, pz) + (s > 0.95 ? 0.3 : 0.06)) return false;
			}
			return true;
		};
		/** İlden en yakın denize (hiçbir ilin içi olmayan yere) yön ve uzaklık. */
		const seaDir = (i) => {
			const p = b.provinces[i];
			let best = { dx: 0, dz: 1, r: 99 };
			if (!fl) return best;
			for (let a = 0; a < 24; a++) {
				const dx = Math.cos((a / 24) * TAU);
				const dz = Math.sin((a / 24) * TAU);
				for (let r = 0.5; r < best.r && r < 60; r += 0.5)
					if (fl.pidAt(p.x + dx * r, p.z + dz * r) === 0) {
						if (r < best.r) best = { dx, dz, r };
						break;
					}
			}
			return best;
		};
		/** Bu kadrajda alt kenarda kesilen büyük yapı sayısı (yapının ekrandaki alt payı, kenar şeridi). */
		const cutAt = (x, y, z, dist, p, w, top) => {
			const cp = Math.cos(p);
			const cx = x - Math.sin(w) * cp * dist;
			const cy = y + Math.sin(p) * dist;
			const cz = z + Math.cos(w) * cp * dist;
			let fx = x - cx;
			let fy = y - cy;
			let fz = z - cz;
			const fl0 = Math.hypot(fx, fy, fz) || 1;
			fx /= fl0;
			fy /= fl0;
			fz /= fl0;
			// sağ = f × yukarı, yukarı' = sağ × f
			let rx = -fz;
			let rz = fx;
			const rl = Math.hypot(rx, rz) || 1;
			rx /= rl;
			rz /= rl;
			const ux = -rz * fy;
			const uy = rz * fx - rx * fz;
			const uz = rx * fy;
			const tv = Math.tan((app.camera.fov * Math.PI) / 360);
			const asp = app.camera.aspect || 0.46;
			let n = 0;
			for (const st of sites) {
				for (const hy of [0.2, 1.4]) {
					const vx = st.x - cx;
					const vy = st.y + st.s * hy - cy;
					const vz = st.z - cz;
					const dd = vx * fx + vy * fy + vz * fz;
					if (dd < 0.5) continue;
					const sx = (vx * rx + vz * rz) / dd / (tv * asp);
					const sy = (vx * ux + vy * uy + vz * uz) / dd / tv - top; // kart: görüntü merkezi ekranda aşağıda (lens kaydırma)
					if (Math.abs(sx) < 1.05 && sy < -0.72 && sy > -1.45) {
						n += st.s;
						break;
					}
				}
			}
			return n;
		};
		const sizeOf = (i) => {
			const q = app.boundsOf([i]);
			return { b: q, s: Math.max(q.x1 - q.x0, q.z1 - q.z0) };
		};
		const closeDist = (i, pitch, k = 1) => {
			const { b: q } = sizeOf(i);
			return C.fitDist({ x0: q.x0 - 1.5, x1: q.x1 + 1.5, z0: q.z0 - 1.5, z1: q.z1 + 1.5 }, pitch, 1.15, cardTop(el)) * k;
		};

		return {
			lock: c.lock,
			reveal(results) {
				reveal = true;
				c.reveal(results);
				card?.classList.add('dn-tf-rv', 'dn-tf-film'); // joker satırı kalkar; cevap damgası filmin ortasında çekilir
				gBox.classList.remove('hot');
				// sahip renkleri film boyunca gizli: gecenin gizlediği boyalar gH'ye geçer (gece kalkar, renkler gelmez)
				for (const i of gQ.painted) gH.painted.add(i);
				gQ.painted.clear();
				gQ.restore(); // şafak: gün fırtınayla doğar
				gR.allActive(); // tufan bütün ülkede
				for (const i of idx) gR.fx(i, PED_R, 0.25);
				ped = PED_R;
				for (const [k] of castles) k.group.visible = false; // başkent kaleleri (oyuncu renkleri) filmde yok
				if (wx) wx.calm(true); // bölge sisi/karı hafifler: yağmur ve su okunur
				if (!snd.ok) {
					snd = sesOf(app);
					snd.bed();
				}
				app.sfx?.duck?.(0.6, END, 1.5);
				// suyun planı: her seçeneğin rakımına sırayla; sonunda son adanın eteğine kadar
				const ord = idx.map((_, k) => k).sort((a, b2) => v.alt[a] - v.alt[b2]);
				const a = ord.map((k) => v.alt[k]);
				const KM = [qM, a[0], a[1], a[2], a[2] + (a[3] - a[2]) * 0.72];
				const top = a[3] * 1.06;
				const sunk = [false, false, false, false];
				const sinkT = [0, 0, 0, 0];
				let final = false;
				let lastM = -1;
				const btns = c.btns;
				const t0 = clock.now();
				const sBar = root.querySelector('.dn-tf-g s');
				const ticks = idx.map((_, k) => {
					const e = document.createElement('em');
					e.textContent = 'ABCD'[k];
					e.style.left = ((v.alt[k] / top) * 100).toFixed(1) + '%';
					sBar.appendChild(e);
					return e;
				});
				const meters = (t) => {
					if (t <= KT[0]) return KM[0];
					for (let s = 0; s < 4; s++) if (t < KT[s + 1]) return KM[s] + (KM[s + 1] - KM[s]) * smooth((t - KT[s]) / (KT[s + 1] - KT[s]));
					return KM[4] + (a[3] - a[2]) * 0.1 * smooth((t - KT[4]) / 2.4);
				};
				const P = (k) => b.provinces[idx[k]];
				const sink = (k, t) => {
					sunk[k] = true;
					sinkT[k] = t;
					const i = idx[k];
					const p = b.provinces[i];
					const first = ord[0] === k;
					const gold = v.q.mode === 'once' && first;
					const e = tags[k].el;
					e.classList.add(gold ? 'isle' : 'sunk');
					e.innerHTML = `<div>${gold ? '<b>İLK BATAN</b>' : ''}<b>${esc(p.name)}</b><em>${fmtM(v.alt[k])}</em></div>`;
					btns[k].classList.add('sunk', 'alt');
					if (gold) btns[k].classList.add('isle');
					btns[k].querySelector('span').insertAdjacentHTML('beforeend', `<em>${gold ? 'İLK BATTI · ' : 'BATTI · '}${fmtM(v.alt[k])}</em>`);
					ticks[k].classList.add('wet');
					caption(p.name, gold ? `İlk batan · ${fmtM(v.alt[k])}` : `${fmtM(v.alt[k])} · Battı`, gold);
					U.uSp.value.set(p.x, p.z, 0, sizeOf(i).s * 0.42);
					snd.gulp();
					buzz(12);
				};
				const isle = () => {
					final = true;
					const k = ord[3];
					const i = idx[k];
					const p = b.provinces[i];
					gR.fx(i, 0.4, 0.45);
					const e = tags[k].el;
					const win = v.q.mode !== 'once';
					e.classList.add(win ? 'isle' : 'sunk');
					e.classList.add('big');
					e.innerHTML = `<div>${win ? '<b>SON ADA</b>' : ''}<b>${esc(p.name)}</b><em>${fmtM(v.alt[k])}</em></div>`;
					btns[k].classList.add('alt');
					if (win) btns[k].classList.add('isle');
					btns[k].querySelector('span').insertAdjacentHTML('beforeend', `<em>${win ? 'SON ADA · ' : 'KALDI · '}${fmtM(v.alt[k])}</em>`);
					ticks[k].classList.add('top');
					caption(win ? 'Son ada' : p.name, win ? `${p.name} · ${fmtM(v.alt[k])}` : `Kaldı · ${fmtM(v.alt[k])}`, true, true);
					snd.hope();
					buzz(win ? 25 : 8);
				};
				const me = results.find((r) => r.p?.human);
				const verdict = me
					? [
							me.correct ? (v.q.mode === 'once' ? 'İLK BATANI BİLDİN!' : 'SON ADAYI BİLDİN!') : me.value == null ? 'SÜRE DOLDU' : 'BATTIN!',
							me.correct ? 'gold' : 'bad',
							`${v.opts[v.right]} · ${fmtM(v.alt[v.right])}`,
						]
					: null;
				if (verdict) stampLater(app, ...verdict);
				if (!fl) {
					ord.slice(0, 3).forEach((k, s) => setTimeout(() => sink(k, 0), 400 + s * 700));
					setTimeout(isle, 2600);
					frame(0.6, 1.5, { yawRate: 0.035 });
					return;
				}
				// ------------------------------------------------ çekim listesi → kamera yolu (bkz. dosya başı)
				const top0 = cardTop(el);
				const at = (t) => levelY(meters(t));
				const p0 = P(ord[0]);
				const d0 = seaDir(idx[ord[0]]);
				const ys0 = yawFrom(d0.dx, d0.dz);
				const keys = [{ t: 0, x: C.target.x, y: C.target.y, z: C.target.z, dist: C.dist, p: C.pitch, w: C.yaw }];
				// açılış: dört il, ilk ile doğru hafif kayık; yüksek, ağır yaklaşma
				{
					const w = { x0: bb.x0 - 4, x1: bb.x1 + 4, z0: bb.z0 - 4, z1: bb.z1 + 3 };
					const cx = (w.x0 + w.x1) / 2;
					const cz = (w.z0 + w.z1) / 2;
					keys.push({ t: 1.7, x: cx + (p0.x - cx) * 0.35, y: 0, z: cz + (p0.z - cz) * 0.35, dist: C.fitDist(w, 0.7, 1.0, top0) * 0.66, p: 0.7, w: Math.max(-0.5, Math.min(0.5, wrapPi(ys0) * 0.4)) });
				}
				// vinç inişi: kıyıya, deniz tarafından; önde kalan büyük yapılar (İstanbul) alt kenarda kesilmesin diye
				// yön (±0,3/0,6/0,9) ve eğim adaylarından en az kesen seçilir
				{
					const r = Math.min(d0.r, 14);
					const s0 = sizeOf(idx[ord[0]]).s;
					const x = p0.x + d0.dx * r * 0.55;
					const z = p0.z + d0.dz * r * 0.55;
					const dist = 26 + s0 * 0.5;
					let best = { w: ys0 + 0.18, p: 0.46 };
					let bs = Infinity;
					for (const dw of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9]) {
						for (const p of [0.46, 0.56, 0.68]) {
							const sc = cutAt(x, at(2.75), z, dist, p, ys0 + 0.18 + dw, top0) * 3 + Math.abs(dw) * 1.2 + (p - 0.46) * 4;
							if (sc < bs) {
								bs = sc;
								best = { w: ys0 + 0.18 + dw, p };
							}
						}
					}
					keys.push({ t: 2.75, x, y: at(2.75), z, dist, p: best.p, w: best.w });
				}
				// her il: varış (batıştan hemen önce), ağır yaklaşma; aralarda yükselip süzülme
				let yPrev = ys0 + 0.3;
				for (let s = 0; s < 3; s++) {
					const k = ord[s];
					const p = P(k);
					const ta = KT[s + 1] - 0.3;
					let yw = yPrev;
					if (s > 0) {
						const q = P(ord[s - 1]);
						const L = Math.hypot(p.x - q.x, p.z - q.z) || 1;
						yw = yawFrom((q.x - p.x) / L, (q.z - p.z) / L) + 0.2; // gelinen yandan
						const prev = keys[keys.length - 1];
						const wm = prev.w + wrapPi(yw - prev.w) * 0.5;
						const dm = Math.max(closeDist(idx[k], 0.55), prev.dist, L * 0.85);
						keys.push({ t: ta - 0.6, x: (p.x + q.x) / 2, y: (at(ta - 0.6) + 0.3) / 2, z: (p.z + q.z) / 2, dist: dm, p: 0.58, w: wm });
					}
					const dc = closeDist(idx[k], 0.42, 1.2);
					keys.push({ t: ta, x: p.x, y: at(KT[s + 1]), z: p.z, dist: dc, p: 0.4, w: yw });
					keys.push({ t: ta + 0.8, x: p.x, y: at(KT[s + 1] + 0.5), z: p.z, dist: dc * 0.86, p: 0.45, w: yw + 0.14 });
					yPrev = yw + 0.14;
				}
				// son ada: su seviyesinden, sonra yükselen vinç ve yavaş yörünge
				const k3 = ord[3];
				const p3 = P(k3);
				{
					const q = P(ord[2]);
					const L = Math.hypot(p3.x - q.x, p3.z - q.z) || 1;
					const y3 = yawFrom((q.x - p3.x) / L, (q.z - p3.z) / L) + 0.25;
					const prev = keys[keys.length - 1];
					keys.push({ t: KT[4] - 0.75, x: (p3.x + q.x) / 2, y: at(KT[4] - 0.75), z: (p3.z + q.z) / 2, dist: Math.max(prev.dist, L * 0.8, closeDist(idx[k3], 0.4)), p: 0.42, w: prev.w + wrapPi(y3 - prev.w) * 0.6 });
					const dl = closeDist(idx[k3], 0.2, 1.1);
					keys.push({ t: KT[4] - 0.1, x: p3.x, y: at(KT[4]) + 0.05, z: p3.z, dist: dl, p: 0.2, w: y3 });
					const all = app.boundsOf(idx);
					const dTop = Math.max(dl * 2.4, C.fitDist({ x0: all.x0 - 2, x1: all.x1 + 2, z0: all.z0 - 2, z1: all.z1 + 2 }, 0.85, 1.0, top0) * 0.6);
					keys.push({ t: END, x: p3.x, y: at(END), z: p3.z, dist: dTop, p: 0.84, w: y3 + 0.6 });
				}
				// yakın anahtar kareler (batış, son ada): önde kalan büyük yapılar alt kenarda kesilmesin; yön hafifçe döner
				for (let i = 2; i < keys.length; i++) {
					const kf = keys[i];
					if (kf.p > 0.6) continue;
					let bw = kf.w;
					let bsc = cutAt(kf.x, kf.y, kf.z, kf.dist, kf.p, kf.w, top0) * 3;
					for (const dw of [0.35, -0.35, 0.7, -0.7]) {
						const sc = cutAt(kf.x, kf.y, kf.z, kf.dist, kf.p, kf.w + dw, top0) * 3 + Math.abs(dw) * 1.2;
						if (sc < bsc) {
							bsc = sc;
							bw = kf.w + dw;
						}
					}
					kf.w = bw;
				}
				const path = camPath(keys);
				// yol denetimi: kamera ve bakış hattı araziye girmesin (gereken anahtar karede eğim artar)
				const o = { x: 0, y: 0, z: 0, dist: 1, p: 0, w: 0 };
				for (let it = 0; it < 60; it++) {
					let bad = -1;
					for (let t = 0.08; t <= END && bad < 0; t += 0.08) {
						waterY = at(t);
						path.at(t, o);
						if (!clear(o)) bad = t;
					}
					if (bad < 0) break;
					let ki = 1;
					for (let i = 1; i < keys.length; i++) if (Math.abs(keys[i].t - bad) < Math.abs(keys[ki].t - bad)) ki = i;
					keys[ki].p = Math.min(1.2, keys[ki].p + 0.04);
					path.tangents();
				}
				waterY = 0;
				C.shake = 0;
				C.sh.on = false;
				C.mode = 'tufan'; // kamera bu yoldan sürülür (kare başına; camera.js dinlenmede bekler)
				fl.on();
				boltT = -9;
				nextBolt = 0.55;
				let lens = C.lens;
				snd.rise(KT[4] + 0.8);
				let restamp = false;
				fl.tick = () => {
					const now = clock.now();
					if (now === lastNow) return;
					lastNow = now;
					const t = (now - t0) / 1000;
					// kamera
					path.at(Math.min(t, END), o);
					C.target.set(o.x, o.y, o.z);
					C.goal.copy(C.target);
					C.dist = C.distTo = o.dist;
					C.pitch = C.pitchTo = o.p;
					C.yaw = C.yawTo = o.w;
					const want = t > KT[4] + 0.6 && verdict ? (top0 - 0.22) / 2 : top0 / 2;
					lens += (want - lens) * 0.04;
					C.lensTo = lens;
					// alçak inişte uzak etiketler kartın üstüne düşmesin
					const hide = t > 2.2 && t < KT[1] - 0.4;
					for (const tg of tags) tg.el.classList.toggle('off', hide);
					// su
					const mm = meters(t);
					fl.level(levelY(mm));
					// hava: açılışta bir şimşek, ortada bir tane; son adada fırtına dağılır
					if (t >= nextBolt) {
						strike(t, 0.55);
						nextBolt = nextBolt < 1 ? 5.1 : 99;
					}
					const clr = smooth((t - KT[4] + 0.5) / 2);
					atmos(t, 0.9 * (1 - clr * 0.85), 0.85 * (1 - clr), clr, t > KT[0] && t < KT[4] ? 1 : Math.max(0.15, 1 - (t - KT[4]) * 0.8), 0.014);
					const r = Math.round(mm / 10) * 10;
					if (r !== lastM) {
						lastM = r;
						gauge.textContent = fmtG(r);
						bar.style.transform = `scaleX(${Math.min(1, mm / top).toFixed(3)})`;
					}
					let last = -1;
					for (let s = 0; s < 3; s++) {
						const k = ord[s];
						if (!sunk[k] && t >= KT[s + 1] - 0.15) sink(k, t);
						// batış: önce ağır ağır suya gömülür, sonra dibe; üstündeki su derinleşir
						if (sunk[k]) {
							last = k;
							const u = Math.min(1, (t - sinkT[k]) / SINK);
							holdLift(b, idx[k], PED_R - 0.35 * smooth(Math.min(1, u * 1.5)) - 2.4 * u * u * u);
							U.uSunk.value.setComponent(k, smooth(u));
						}
					}
					if (last >= 0) U.uSp.value.z = t - sinkT[last]; // son batanın halkası
					if (!final && t >= KT[4] - 0.05) isle();
					if (!restamp && verdict && t >= KT[4] + 1.5) {
						restamp = true;
						card?.classList.remove('dn-tf-film');
						app.ui?.stamp?.(...verdict);
					}
				};
			},
			destroy: close,
		};
	},
	/** Çevrimiçi görünüm: doğru şık, plakalar ve rakımlar sunucuda (cevapla gelir). */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.right;
		delete o.alt;
		delete o.q.ils;
		return o;
	},
	/** Sınama yardımcısı: bir doğru ve bir yanlış değer (test/deneme*.test.mjs). */
	probe: (v) => ({ good: v.right, bad: (v.right + 1) % 4 }),
	judge(v, value) {
		return { correct: value === v.right, err: value === v.right ? 0 : 1 };
	},
	bot(v, skill, R) {
		const ok = R() < Math.min(0.95, pCorrect(skill, v.q.diff) + 0.05);
		let value = v.right;
		if (!ok) {
			// yanılan bot çoğunlukla en yakın rakıma kanar
			const ord = v.alt.map((_, k) => k).sort((a, b) => v.alt[a] - v.alt[b]);
			const near = v.q.mode === 'once' ? ord[1] : ord[2];
			value = R() < 0.6 ? near : ord.filter((k) => k !== v.right)[Math.floor(R() * 3)];
		}
		return { value, time: botTime(v, R, skill, 0.05, 0.85) };
	},
};
