// TUFAN (deneme): "Deniz yükselirse hangisi EN SON batar?" (ya da ÖNCE). Dört il, il merkezi rakımları.
//
// Soru anı: gece ve fırtına. Dört il kaidesinde ışıkta; deniz dalgalı, yağmur çiseler, ufukta şimşek çakar ve deniz
// yavaş yavaş kabarır (gösterge "+6 m"). Kart altında bekleyen bir tehdit.
// Cevap (film, `revealMs`): gün fırtınayla doğar, su 3B haritada GERÇEKTEN yükselir. Sinematografi:
//   1 geniş plan (yüksek, yavaş yaklaşma)  →  KESME: su yüzeyine yakın alçak takip, kıyıdan içeri yürüyen cephenin
//   önünde (kamera suyla yükselir)  →  ilk il: yakın plan, yavaş yörünge, el kamerası, batış (halka dalga,
//   kabarcıklar, ad + rakım damgası)  →  KESME (eşleşen kadraj): ikinci il  →  KESME: üçüncü il ön planda batarken
//   son il arka planda bekler  →  KESME: son adaya su seviyesinden bakış, sonra yükselen vinç çekimi; fırtına
//   dağılır, altın güneş adaya vurur, "SON ADA". Kamera hiç araziye girmez (çekim kurulurken çizgi denetimi), kart
//   kadrajı kapatmaz (lens kaydırması), cevap damgası filmin ortasında çekilip sonda geri gelir.
//
// Veri: mode: 'son' | 'once', ils: [[plaka, rakım m], …] (dört il). Doğru şık mode'a göre en yüksek ya da en alçak.
//       Rakımlar: il merkezi rakımı (Harita Genel Komutanlığı il merkezi rakımları tablosu; ansiklopedik kaynaklarla
//       aynı); seçenekler arası en az 150 m fark (sınama denetler). Ekranda 10 m'ye yuvarlanmış "≈1.890 m" yazılır:
//       kaynaklar arası birkaç on metrelik oynama yanlış görünmesin.
// Değer: şık indeksi. Tür 'exact'.
// Sahne (su, yağmur, fırtına ışığı): d_tufan_film.js. Harita koduna kanca yok: board.sea.visible, il yükselme dizileri
// (lift/liftTo) ve ortak ışık uniform'ları (kaydedilir, soru bitince geri konur).
// Süre: `revealMs` filmin uzunluğu (ui.reveal cevap ekranını bu kadar tutar; dokununca erken geçer).
// Çevrimiçi: publicView doğru şıkkı, il plakalarını ve rakımları taşımaz (illerin yeri istemciye kart kapanınca
// cevapla gelir; soru anındaki etiketler yalnız ad ve konum).

import { css, esc, shuffle, pCorrect, mountChoice, buzz } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, guard, camLock, onClose, onOpen, cardTop, tag, pop, sfx, rule, stampLater, cut, LOOK, DENEME_CSS } from './d_ortak.js';
import { floodOf, holdLift, rainFrame, flashAt } from './d_tufan_film.js';
import { clock, setTimeout } from '../core/clock.js';
import { BASE, VS, LIFT } from '../map/terrain.js';
import DATA from '../data/turkiye.json';

export { floodOf, holdLift };

const PROV = DATA.provinces;
const BY_ID = new Map(PROV.map((p, i) => [p.id, i]));
/** Ekrandaki rakım: 10 m'ye yuvarlanmış, "≈1.890 m" (kaynaklar arası küçük farklar yanlış görünmesin). */
const fmtM = (m) => '≈' + (Math.round(Number(m) / 10) * 10).toLocaleString('tr-TR') + ' m';
const fmtG = (m) => '+' + Math.round(m).toLocaleString('tr-TR') + ' m';

/** Metre → su düzleminin yüksekliği (birim): 0 m'de deniz (y 0), ~30 m'de kıyı kara yüksekliği (BASE). */
const levelY = (m) => (m <= 0 ? 0 : BASE * Math.min(1, m / 30) + m * VS);
const PED = 0.3; // soru anı: seçenek illerin kaidesi (lift)
const PED_R = 0.14; // tufan: alçak kaide (il merkezi rakımına dek su üstünde; alçak yerlerine su sızar, yan duvarı ince)
const SINK = 1.1; // batış süresi (sn)
const Q_RISE = 14; // soru boyunca deniz en çok bu kadar kabarır (m)

// film takvimi (cevaptan sonra sn): su yükselmeye başlar, dört seçenek rakımı, son
const OPEN = 0.5;
const KT = [OPEN, 2.6, 4.25, 5.9, 6.9];
const END = 9.4;

const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const ease3 = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
/** (dx, dz) yönünde duran kameranın yaw'ı (camera.js: kamera = hedef + (-sin yaw, cos yaw) · uzaklık). */
const yawFrom = (dx, dz) => Math.atan2(-dx, dz);

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
.dn-tf-cap.on{animation:dnTfCap 1.25s cubic-bezier(.2,.8,.2,1) forwards}
.dn-tf-cap.stay{animation:dnTfCapIn .6s cubic-bezier(.2,.8,.2,1) forwards}
.dn-tf-cap b{font-family:'Lilita One';font-weight:400;font-size:32px;line-height:1;letter-spacing:.16em;color:#fff;text-transform:uppercase;text-shadow:0 2px 0 rgba(0,0,0,.5),0 0 22px rgba(70,160,255,.75)}
.dn-tf-cap small{font-family:'Fredoka';font-weight:600;font-size:12px;letter-spacing:.32em;text-transform:uppercase;color:#bfefff;padding:3px 12px 0;border-top:1px solid rgba(191,239,255,.55);text-shadow:0 1px 0 rgba(0,0,0,.6)}
.dn-tf-cap.gold b{color:#ffd25a;text-shadow:0 2px 0 rgba(60,30,0,.6),0 0 26px rgba(255,190,70,.9)}
.dn-tf-cap.gold small{color:#ffe7a8;border-color:rgba(255,215,120,.6)}
@keyframes dnTfCap{0%{opacity:0;transform:scale(1.18)}16%{opacity:1;transform:scale(1)}78%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-8px)}}
@keyframes dnTfCapIn{0%{opacity:0;transform:scale(1.25)}100%{opacity:1;transform:none}}
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
		const gQ = guard(app); // soru anı: gece, dört il ışıkta
		const gR = guard(app); // tufan: kaideler ve batış
		gQ.allActive();
		gQ.dark(idx);
		for (const i of idx) gR.fx(i, PED, 0.35);
		const fl = floodOf(app);
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
		queueMicrotask(() => el.isConnected && frame(0.95, 0.9));
		const gauge = root.querySelector('.dn-tf-g b');
		const gBox = root.querySelector('.dn-tf-g');
		const bar = root.querySelector('.dn-tf-g u');
		const card = el.closest('.fl-q');
		const host = card?.parentElement;
		// film yazısı (il adı + rakım damgası): kartın hemen altında, haritanın üstünde
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
		const stopOpen = onOpen(el, () => {
			// düello filmi sahneyi gündüze döndürebilir: gece, kart açılınca (ve az sonra) yeniden kurulur
			gQ.dark(idx);
			setTimeout(() => !reveal && el.isConnected && gQ.dark(idx), 1200);
			frame(0.88, 4, { yawRate: 0.02 });
		});

		// ------------------------------------------------ ortak kare durumu (kare başına nesne yok)
		const U = fl?.U;
		const F = { x: 0, y: 0, z: 0 }; // kameranın izlediği nokta (el kamerası salınımı eklenir)
		const base = { x: 0, y: 0, z: 0 };
		const trk = { on: false, x0: 0, z0: 0, x1: 0, z1: 0, t0: 0, t1: 1 }; // alçak takip: kıyıdan ile
		let hand = 0;
		let lastNow = -1;
		let tq0 = clock.now();
		let qM = 0; // soru anındaki kabarma (m)
		let flashT = -9;
		let nextBolt = 1.2;
		let bolts = 0;
		let lastG = -1;
		let storm = 0;
		let rainK = 0;
		const bolt = (t, gap) => {
			flashT = t;
			bolts++;
			nextBolt = t + gap + 2.2 * (0.5 + 0.5 * Math.sin(bolts * 12.9898));
			sfx(app, 'crumble', { rate: 0.5, vol: 0.5, delay: 0.3 + 0.25 * (bolts % 2) });
		};
		const handheld = (t) => {
			F.x = base.x + hand * (Math.sin(t * 2.1) + 0.5 * Math.sin(t * 3.7 + 1.3));
			F.z = base.z + hand * (Math.sin(t * 1.7 + 0.5) + 0.5 * Math.sin(t * 4.3 + 2.1));
			F.y = base.y + hand * 0.5 * Math.sin(t * 2.9 + 0.7);
		};
		const atmos = (t, S, rain, gold, rise, wet) => {
			const Fk = flashAt(t - flashT);
			fl.storm.apply(S, Fk, gold, b.G.uNight.value.x);
			U.uFl.value.set(S, Fk, rise, wet);
			rainFrame(fl, C, rain, Fk, t, b.G.uNight.value.x);
		};
		// soru anı: gece fırtınası, deniz kabarır, ufukta şimşek
		const qTick = () => {
			const now = clock.now();
			if (now === lastNow) return;
			lastNow = now;
			const t = (now - tq0) / 1000;
			qM = Math.min(Q_RISE, t * 0.6);
			fl.level(levelY(qM));
			if (t >= nextBolt) bolt(t, 3.2);
			storm = Math.min(0.55, t * 0.4);
			rainK = Math.min(0.42, t * 0.3);
			atmos(t, storm, rainK, 0, 0.12, 0.006);
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
		let ended = false;
		const end = () => {
			if (ended) return;
			ended = true;
			if (fl) fl.off();
		};
		const wx = app.weather;
		const calm0 = wx?.calmTo;
		const close = onClose(el, () => {
			closed = true;
			stopOpen();
			end();
			unlock();
			cap.remove();
			card?.classList.remove('dn-tf-film');
			if (wx && calm0 != null) wx.calmTo = calm0;
			gR.restore(false);
			gQ.restore();
		});

		// ------------------------------------------------ kamera: çekim kurulumu
		/** Kartın (üstte) ve isteğe bağlı alt payın dışında kalan alana ortalayan lens kaydırması. */
		const lensOf = (bottom = 0) => (cardTop(el) - bottom) / 2;
		/** Zemin: il içi kabartma (seçenek illeri kaidesiyle) ve büyük yapılar, il dışı deniz; su yüksekse su. */
		let waterY = 0;
		const sites = app.props?.landmarks?.sites || [];
		let ped = PED;
		const ground = (x, z) => {
			const q = fl ? fl.pidAt(x, z) : 1;
			let g = q ? b.heightAt(x, z) + (idx.includes(q - 1) ? ped * LIFT + 0.08 : 0) : 0.06;
			// büyük yapılar (cami, kale, anıt): kamera minarelerin arasına girmesin
			for (const st of sites) if (Math.abs(st.x - x) < 3 && Math.abs(st.z - z) < 3 && Math.hypot(st.x - x, st.z - z) < st.r * 1.6 + 0.6) g = Math.max(g, st.y + st.s * 2.4);
			return Math.max(g, waterY);
		};
		/** Kamera hattı araziye girmesin: kamera noktası zeminden en az 0.3, bakış hattı 0.06 yukarıda (gerekirse eğim artar; yörünge payı dahil). */
		const clearP = (x, y, z, dist, pitch, yaw, drift = 0) => {
			for (let n = 0; n < 16; n++) {
				const cp = Math.cos(pitch);
				const sp = Math.sin(pitch);
				let ok = true;
				for (const yw of drift ? [yaw, yaw + drift] : [yaw])
					for (let s = 0.25; s <= 1.0001 && ok; s += 0.075) {
						const px = x - Math.sin(yw) * cp * dist * s;
						const pz = z + Math.cos(yw) * cp * dist * s;
						if (y + sp * dist * s < ground(px, pz) + (s > 0.95 ? 0.3 : 0.06)) ok = false;
					}
				if (ok) return pitch;
				pitch += 0.04;
			}
			return pitch;
		};
		/** İlden en yakın denize (hiçbir ilin içi olmayan yere) yön ve uzaklık. */
		const seaDir = (i) => {
			const p = b.provinces[i];
			let best = { dx: 0, dz: 1, r: 99 };
			if (!fl) return best;
			for (let a = 0; a < 24; a++) {
				const dx = Math.cos((a / 24) * Math.PI * 2);
				const dz = Math.sin((a / 24) * Math.PI * 2);
				for (let r = 0.5; r < best.r && r < 60; r += 0.5)
					if (fl.pidAt(p.x + dx * r, p.z + dz * r) === 0) {
						if (r < best.r) best = { dx, dz, r };
						break;
					}
			}
			return best;
		};
		/**
		 * Çekim: odak (x, y, z), uzaklık, eğim, yaw; dur sürede varır, sonra yörünge/yaklaşma. from: önce bu kadraja
		 * KESME (eşleşen geçiş için başlangıç), hand: el kamerası salınımı (uzaklığa oranla).
		 */
		const take = (x, y, z, o) => {
			const lens = lensOf(o.bottom || 0);
			waterY = o.water ?? 0;
			const drift = (o.yawRate || 0) * ((o.dur || 1) + 2);
			const pitch = clearP(x, y, z, o.dist, o.pitch, o.yaw, drift);
			base.x = x;
			base.y = y;
			base.z = z;
			hand = (o.hand || 0) * o.dist;
			handheld(clock.now() / 1000);
			if (o.from) {
				const f = o.from;
				cut(app, x, z, { y, dist: f.dist, pitch: clearP(x, y, z, f.dist, f.pitch, f.yaw ?? o.yaw), yaw: f.yaw ?? o.yaw, lens });
			}
			C.shot(x, z, { follow: F, dist: o.dist, pitch, yaw: o.yaw, dur: o.dur ?? 1, arc: o.arc ?? 0, yawRate: o.yawRate || 0, distRate: o.distRate || 0, distMin: 2, decay: o.decay || 0, lens, ease: o.ease || null });
		};
		const sizeOf = (i) => {
			const q = app.boundsOf([i]);
			return { b: q, s: Math.max(q.x1 - q.x0, q.z1 - q.z0) };
		};
		const closeDist = (i, pitch, k = 1) => {
			const { b: q } = sizeOf(i);
			return C.fitDist({ x0: q.x0 - 1, x1: q.x1 + 1, z0: q.z0 - 1, z1: q.z1 + 1 }, pitch, 1.15, cardTop(el)) * k;
		};

		return {
			lock: c.lock,
			reveal(results) {
				reveal = true;
				c.reveal(results);
				card?.classList.add('dn-tf-rv', 'dn-tf-film'); // joker satırı kalkar; cevap damgası filmin ortasında çekilir
				gBox.classList.remove('hot');
				gQ.restore(); // şafak: gün fırtınayla doğar, sahip renkleri geri gelir
				gR.allActive(); // tufan bütün ülkede
				for (const i of idx) gR.fx(i, PED_R, 0.6);
				ped = PED_R;
				if (wx) wx.calm(true); // bölge sisi/karı hafifler: fırtına ve su okunur
				// suyun planı: her seçeneğin rakımına sırayla, aralarda yavaşlayarak; sonunda son adanın eteğine kadar
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
				// gösterge: dört seçeneğin rakımı çizgide (su geçtikçe maviye döner)
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
				const yOf = (k) => levelY(v.alt[k]) + PED_R * LIFT * 0.5;
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
					if (U) U.uSp.value.set(p.x, p.z, 0, sizeOf(i).s * 0.42);
					sfx(app, 'crumble', { rate: 0.8 });
					sfx(app, 'whoosh', { rate: 0.55, vol: 0.8 });
					C.impulse?.(0.22);
					buzz(12);
				};
				const isle = () => {
					final = true;
					const k = ord[3];
					const i = idx[k];
					const p = b.provinces[i];
					gR.fx(i, 0.55, 1);
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
					if (win) setTimeout(() => !closed && pop(app, p.x, p.z, '', { colors: ['#ffd25a', '#fff', '#7dff9a'], n: 22, dist: 100, cls: 'dn dn-gold' }), 900);
					sfx(app, win ? 'star' : 'tap');
					buzz(win ? 25 : 8);
				};
				// ------------------------------------------------ çekim listesi (film)
				const shots = [];
				const p0 = P(ord[0]);
				const d0 = seaDir(idx[ord[0]]);
				const y0 = yawFrom(d0.dx, d0.dz);
				// 1 geniş plan: yüksekten, denizin geldiği yöne hafif dönük, yavaş yaklaşma
				shots.push([
					0,
					() => {
						const w = { x0: bb.x0 - 6, x1: bb.x1 + 6, z0: bb.z0 - 5, z1: bb.z1 + 4 };
						const dist = C.fitDist(w, 0.78, 1.0, cardTop(el)) * 0.82;
						const yw = Math.max(-0.45, Math.min(0.45, y0 * 0.3));
						take((w.x0 + w.x1) / 2, 0, (w.z0 + w.z1) / 2, { dist, pitch: 0.78, yaw: yw, dur: 1.1, arc: 3, distRate: -0.06 });
					},
				]);
				// 2 KESME: su yüzeyine yakın alçak takip; kıyıdan ilk ile, dalganın önünde (kamera denizde, karaya bakar)
				shots.push([
					1.25,
					() => {
						// takip hattı: kıyının biraz açığından ilin sınırına (ilin kaidesi arka planda kalır)
						const r = Math.min(d0.r, 16);
						let rb = 0.5;
						while (rb < r && fl?.pidAt(p0.x + d0.dx * rb, p0.z + d0.dz * rb) === idx[ord[0]] + 1) rb += 0.5;
						const r1 = Math.min(r, rb + 1.2);
						const r0 = Math.max(r + 1.5, r1 + 3);
						trk.x0 = p0.x + d0.dx * r0;
						trk.z0 = p0.z + d0.dz * r0;
						trk.x1 = p0.x + d0.dx * r1;
						trk.z1 = p0.z + d0.dz * r1;
						trk.t0 = 1.25;
						trk.t1 = KT[1] - 0.3;
						trk.on = true;
						for (const tg of tags) tg.el.classList.add('off'); // alçak açıda uzak etiketler kartın üstüne düşmesin
						const dist = 9 + sizeOf(idx[ord[0]]).s * 0.2;
						take(trk.x0, levelY(meters(1.25)), trk.z0, { water: levelY(KM[1]), from: { dist: dist * 1.15, pitch: 0.12 }, dist, pitch: 0.16, yaw: y0 + 0.25, dur: trk.t1 - trk.t0, hand: 0.01, ease: (u) => u });
					},
				]);
				// 3 ilk il: yakın plan, yavaş yörünge (kesmesiz: takipten yükselerek)
				shots.push([
					KT[1] - 0.3,
					() => {
						trk.on = false;
						for (const tg of tags) tg.el.classList.remove('off');
						const k = ord[0];
						take(p0.x, yOf(k), p0.z, { water: levelY(KM[1]), dist: closeDist(idx[k], 0.42, 0.95), pitch: 0.42, yaw: y0 + 0.65, dur: 0.75, arc: 1, yawRate: 0.1, distRate: -0.03, hand: 0.006 });
					},
				]);
				// 4 KESME (eşleşen kadraj): ikinci il, ters yörünge, ağır yaklaşma
				shots.push([
					KT[2] - 0.8,
					() => {
						const k = ord[1];
						const p = P(k);
						const d = seaDir(idx[k]);
						const yw = yawFrom(d.dx, d.dz) - 0.55;
						const dist = closeDist(idx[k], 0.4, 0.95);
						take(p.x, yOf(k), p.z, { water: levelY(KM[2]), from: { dist: dist * 1.3, pitch: 0.34 }, dist, pitch: 0.4, yaw: yw, dur: 1.5, yawRate: -0.1, distRate: -0.03, hand: 0.006 });
					},
				]);
				// 5 KESME: üçüncü il ön planda batar, son il arka planda bekler (alçak, yan)
				shots.push([
					KT[3] - 0.8,
					() => {
						const k2 = ord[2];
						const p2 = P(k2);
						const p3 = P(ord[3]);
						let ux = p2.x - p3.x;
						let uz = p2.z - p3.z;
						const L = Math.hypot(ux, uz) || 1;
						ux /= L;
						uz /= L;
						const tx = p2.x - ux * L * 0.3;
						const tz = p2.z - uz * L * 0.3;
						const dist = Math.min(70, L * 0.85 + sizeOf(idx[k2]).s * 0.9 + 6);
						take(tx, yOf(k2), tz, { water: levelY(KM[3]), from: { dist: dist * 1.12, pitch: 0.26 }, dist, pitch: 0.3, yaw: yawFrom(ux, uz) + 0.18, dur: 1.6, yawRate: 0.05, hand: 0.005 });
					},
				]);
				// 6 KESME: son ada su seviyesinden; sonra yükselen vinç çekimi (fırtına dağılır, altın güneş)
				const k3 = ord[3];
				const p3 = P(k3);
				const d3 = (() => {
					const p2 = P(ord[2]);
					const L = Math.hypot(p2.x - p3.x, p2.z - p3.z) || 1;
					return { dx: (p2.x - p3.x) / L, dz: (p2.z - p3.z) / L };
				})();
				const y3 = yawFrom(d3.dx, d3.dz);
				shots.push([
					KT[4] - 0.3,
					() => {
						const dist = closeDist(idx[k3], 0.2, 0.9);
						take(p3.x, yOf(k3), p3.z, { water: levelY(KM[4]), from: { dist: dist * 1.05, pitch: 0.14 }, dist, pitch: 0.16, yaw: y3, dur: 0.3, hand: 0.004 });
					},
				]);
				shots.push([
					KT[4] + 0.05,
					() => {
						const w = app.boundsOf(idx);
						const dist = Math.max(closeDist(idx[k3], 0.95, 2.6), C.fitDist({ x0: w.x0 - 2, x1: w.x1 + 2, z0: w.z0 - 2, z1: w.z1 + 2 }, 0.9, 1.05, cardTop(el)) * 0.7);
						take(p3.x, yOf(k3), p3.z, { water: levelY(KM[4]), dist, pitch: 0.92, yaw: y3 + 0.75, dur: 2.2, arc: 0, yawRate: 0.035, decay: 0.3, hand: 0.002, bottom: 0.24, ease: ease3 });
					},
				]);
				let shotI = 0;
				let restamp = false;
				const me = results.find((r) => r.p?.human);
				const verdict = me
					? [
							me.correct ? (v.q.mode === 'once' ? 'İLK BATANI BİLDİN!' : 'SON ADAYI BİLDİN!') : me.value == null ? 'SÜRE DOLDU' : 'BATTIN!',
							me.correct ? 'gold' : 'bad',
							`${v.opts[v.right]} · ${fmtM(v.alt[v.right])}`,
						]
					: null;
				if (verdict) stampLater(app, ...verdict);
				sfx(app, 'whoosh', { rate: 0.5, vol: 0.9, delay: 0.45 });
				if (fl) {
					fl.on();
					nextBolt = 0.15;
					bolts = 0;
					flashT = -9;
					fl.tick = () => {
						const now = clock.now();
						if (now === lastNow) return;
						lastNow = now;
						const t = (now - t0) / 1000;
						while (shotI < shots.length && t >= shots[shotI][0]) shots[shotI++][1]();
						const mm = meters(t);
						const L = levelY(mm);
						fl.level(L);
						if (trk.on) {
							const u = smooth((t - trk.t0) / (trk.t1 - trk.t0));
							base.x = trk.x0 + (trk.x1 - trk.x0) * u;
							base.z = trk.z0 + (trk.z1 - trk.z0) * u;
							base.y = L;
						}
						handheld(t);
						// fırtına: cevapla birlikte sertleşir, son adada dağılır; şimşekler sinmelerle
						if (t >= nextBolt && t < KT[4] - 0.5) bolt(t, 2.6);
						const clear = smooth((t - KT[4] + 0.4) / 1.6);
						storm = (0.55 + 0.33 * smooth(t / 0.6)) * (1 - clear * 0.85);
						rainK = 0.9 * smooth(t / 0.5) * (1 - clear);
						const rise = t > KT[0] && t < KT[4] ? 1 : Math.max(0.15, 1 - (t - KT[4]) * 0.8);
						atmos(t, storm, rainK, clear, rise, 0.014);
						const r = Math.round(mm / 10) * 10;
						if (r !== lastM) {
							lastM = r;
							gauge.textContent = fmtG(r);
							bar.style.transform = `scaleX(${Math.min(1, mm / top).toFixed(3)})`;
						}
						for (let s = 0; s < 3; s++) {
							const k = ord[s];
							if (!sunk[k] && t >= KT[s + 1] - 0.15) sink(k, t);
							// batış: önce ağır ağır suya gömülür, sonra dibe; üstündeki su derinleşir
							if (sunk[k]) {
								const u = Math.min(1, (t - sinkT[k]) / SINK);
								holdLift(b, idx[k], PED_R - 0.4 * smooth(Math.min(1, u * 1.6)) - 2.4 * u * u * u);
								U.uSunk.value.setComponent(k, smooth(u));
							}
						}
						const sp = U.uSp.value;
						if (sp.w > 0) sp.z = t - sinkT[ord[sunk[ord[2]] ? 2 : sunk[ord[1]] ? 1 : 0]]; // son batanın halkası
						if (!final && t >= KT[4] - 0.05) isle();
						if (!restamp && verdict && t >= KT[4] + 1.6) {
							restamp = true;
							card?.classList.remove('dn-tf-film');
							app.ui?.stamp?.(...verdict);
						}
					};
				} else {
					ord.slice(0, 3).forEach((k, s) => setTimeout(() => sink(k, 0), 400 + s * 700));
					setTimeout(isle, 2600);
					frame(0.6, 1.5, { yawRate: 0.035 });
				}
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
