// Deneme soru tipleri (YENİ · deneme) için ortak yardımcılar. Bu tipler yalnızca soru galerisinde oynanır; maç
// dönüşümüne (TYPE_WEIGHTS, banka) girmez. Kullanıcı denedikten sonra benimsenen tip `TYPES`e taşınır.
//
//   bindApp(app) / appOf()   haritalı tipler tahtaya, kameraya, arayüze ve sese buradan ulaşır. (Benimsenince küçük
//                            bir kanca yeter: ui.question'ın api'sine `app` eklemek.)
//   stamp(v, q, parts)       süre bütçesi: timing.js ile AYNI formül ve sabitler (PLAYERS, HOT, SLACK, GENEROUS,
//                            limits); tipin ekrandaki işleri `parts` ile sayılır. timing.js'e yalnız PROFILE girdisi
//                            eklendi; tip benimsenince parts() içine bir `case` olarak taşınır.
//   onClose(el, fn)          kart kapanınca (cevap ekranı bitti ya da yeni soru açıldı) bir kez çalışır: haritayı
//                            soru öncesi haline döndürmek için (ui.question ctl.destroy çağırmaz).
//   guard(app)               boyanan, kaldırılan illeri ve sönük il listesini kaydeder; restore() geri alır.
//   camLock(app)             kamerayı parmağa kapatır (Kuşbakışı: kullanıcı uzaklaşıp kopya çekemesin).
//   tag(app, html, x, z)     haritada bir dünya noktasına bağlı yazı (arayüzün iğne katmanında; her karede izdüşer).
//   rule(el, text)           kart başlığındaki kural yazısı ("En yakın kazanır" yerine tipin kendi kuralı).
//   stampLater(app, …)       cevap damgasını tipe göre değiştirir ("EN YAKIN SEN!" yerine "8 İL FETHETTİN!").

import * as THREE from 'three';
import { PLAYERS, HOT, SLACK, GENEROUS, limits, PROFILE } from './timing.js';
import { setTimeout } from '../core/clock.js';
import { setNightTone } from '../gfx/env.js';

let APP = null;
export const bindApp = (app) => {
	APP = app;
};
export const appOf = () => APP;

// ---------------------------------------------------------------- süre (timing.js ile aynı model)
// timing.js'teki sabitlerin aynısı (orada dışa açık değil): kart açılışı, bakış ve giriş hareketleri (yavaş-rahat oyuncu, sn)
export const OPEN = 0.5;
export const LOOK = { orient: 0.5, gaze: 0.3, map: 1, image: 2, reveal: 4 };
export const ACT = { tap: 0.75, confirm: 0.9, mapTap: 1.2, mapFix: 1.6 };

/** Kod noktası sayısı ve kelime sayısı (timing.js ile aynı ölçü). */
export function len(s) {
	let n = 0;
	for (const _ of String(s ?? '')) n++;
	return n;
}
export function wordsOf(s) {
	let n = 0;
	for (const w of String(s ?? '').split(/\s+/)) if (w) n++;
	return n;
}
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const r1 = (x) => Math.round(x * 10) / 10;
const finish = (p, who) => p.wait + p.look * who.look + p.read / who.cps + p.words * who.word + p.think * who.think + p.act * who.act;

/**
 * Sorunun süre bütçesi: parts(q, k, P, text) tipin ekrandaki işlerini sayar ve { wait, look, think, act } döner
 * (okuma `text(s, f)` ile eklenir). k: zorluk − 1 (0..2), P: PROFILE[tip]. Dönen: timing() ile aynı biçim.
 */
export function zaman(q, parts) {
	const P = PROFILE[q.type] || { min: 8, max: 30, think: [3, 1] };
	const k = clamp(Math.round(Number(q.diff) || 2), 1, 3) - 1;
	const acc = { read: 0, words: 0 };
	const text = (s, f = 1) => {
		acc.read += len(s) * f;
		acc.words += wordsOf(s) * f;
	};
	text(q.q);
	const p = { wait: OPEN, look: LOOK.orient, think: (P.think?.[0] || 0) + (P.think?.[1] || 0) * k, act: ACT.tap, ...parts(q, k, P, text) };
	p.read = acc.read;
	p.words = acc.words;
	const fast = finish(p, PLAYERS.fast);
	const med = finish(p, PLAYERS.med);
	const slow = finish(p, PLAYERS.slow);
	const raw = P.round ? med : Math.max(slow + SLACK, med + HOT) * GENEROUS;
	const L = limits(q.type);
	const sec = Math.round(clamp(raw, L.lo, L.hi));
	return { sec, fast: r1(Math.min(fast, sec * 0.6)), med: r1(Math.min(med, sec)), slow: r1(Math.min(slow, sec)), raw: r1(raw), think: r1(p.think), act: r1(p.act) };
}

/** Görünüme süreyi koy (types.js'teki sarmalayıcının eşi): v.sec, v.fast, v.med, v.slow. */
export function stamp(v, q, parts) {
	const t = zaman(q, parts);
	v.sec = t.sec;
	v.fast = t.fast;
	v.med = t.med;
	v.slow = t.slow;
	return v;
}

// ---------------------------------------------------------------- kart yaşam döngüsü

/**
 * Kart kapanınca (cevap ekranı söndü, yeni soru açıldı ya da arayüz sıfırlandı) fn bir kez çalışır. Dönen işlev
 * temizliği hemen yaptırır. Olay güdümlü (MutationObserver): kare başına iş yok.
 */
export function onClose(el, fn) {
	const card = el.closest('.fl-q');
	let done = false;
	let seen = false;
	const run = () => {
		if (done) return;
		done = true;
		mo.disconnect();
		try {
			fn();
		} catch (e) {
			console.error('deneme tipi temizlenemedi', e);
		}
	};
	const check = () => {
		if (!el.isConnected) return run();
		if (!card) return;
		if (card.classList.contains('on')) seen = true;
		else if (seen) run();
	};
	const mo = new MutationObserver(check);
	if (card) mo.observe(card, { attributes: true, attributeFilter: ['class'], childList: true });
	return run;
}

/** Kart açılınca (saat başlayınca) fn bir kez çalışır; kart zaten açıksa hemen. */
export function onOpen(el, fn) {
	const card = el.closest('.fl-q');
	if (!card || card.classList.contains('on')) {
		fn();
		return () => {};
	}
	let done = false;
	const mo = new MutationObserver(() => {
		if (done) return;
		if (!el.isConnected) {
			done = true;
			mo.disconnect();
		} else if (card.classList.contains('on')) {
			done = true;
			mo.disconnect();
			fn();
		}
	});
	mo.observe(card, { attributes: true, attributeFilter: ['class'], childList: true });
	return () => {
		done = true;
		mo.disconnect();
	};
}

/** Kartın ekranın üstünden örttüğü pay (ui._cardTop ile aynı ölçü): haritalı tiplerde kadraj bunun altına ortalanır. */
export function cardTop(el) {
	const card = el.closest('.fl-q');
	const host = card?.parentElement;
	const H = host?.clientHeight || innerHeight;
	if (!card) return 0.34;
	return Math.min(0.62, Math.max(0, (card.offsetTop + card.offsetHeight + 14) / H));
}

/** Kart başlığındaki kural yazısı. */
export function rule(el, text) {
	const r = el.closest('.fl-q')?.querySelector('.fl-rule');
	if (r) r.textContent = text;
}

/** Cevap damgasını değiştir: arayüz kendi damgasını tipin reveal'ından hemen sonra basar, bu ondan sonra gelir. */
export function stampLater(app, text, tone = '', sub = '') {
	setTimeout(() => app?.ui?.stamp?.(text, tone, sub), 0);
}

// ---------------------------------------------------------------- harita: koru ve geri al

/**
 * Tahtaya yapılan geçici değişiklikleri kaydeder: paint (il rengi), fx (kalkma/parlama), sönük iller. restore()
 * hepsini soru öncesine döndürür (sahip rengi dalgayla geri gelir). Maç sırasında güvenli: o anki sahibi okur.
 */
export function guard(app) {
	const b = app.board;
	const painted = new Set();
	const lifted = new Set();
	let dim = null;
	let darkS = null;
	return {
		paint(i, color, x, z) {
			painted.add(i);
			return b.paint(i, color, x, z);
		},
		fx(i, lift, glow) {
			lifted.add(i);
			b.fx(i, lift, glow);
		},
		/** Bütün iller etkin (maç dışı iller sönük kalmasın); restore eski listeyi geri koyar. */
		allActive() {
			if (dim || !b.dimTo) return;
			dim = Array.from(b.dimTo);
			if (dim.some((x) => x > 0.5)) b.setActive(null);
			else dim = null;
		},
		/**
		 * Karanlık harita ("Gölgede Renk", başkent seçimindeki koyu ton): bütün iller gecede, sahip renkleri
		 * gizli (p.owner değişmez, yalnız boya), yalnız `lit` illeri aydınlık. Tekrar çağrılınca aydınlık
		 * listesi güncellenir; restore() tonu, gece durumunu ve sahip renklerini geri koyar.
		 */
		dark(lit = []) {
			if (!darkS) {
				darkS = { tone: b.G.uNightTone.value.clone(), selLit: b.G.uSelLit.value, night: b.nightTo > 0, sel: Array.from(b.selTo) };
				setNightTone(b.G, 'baskent');
				b.provinces.forEach((p, i) => {
					if (p.owner < 0 || painted.has(i)) return;
					const ow = p.owner;
					b.setOwner(i, -1, null);
					p.owner = ow;
					painted.add(i);
				});
			}
			b.night(true, lit.length ? lit : null);
		},
		get painted() {
			return painted;
		},
		restore(wave = true) {
			for (const i of painted) {
				const p = b.provinces[i];
				const c = p.owner >= 0 ? b.ownerHex?.[p.owner] : null;
				if (wave) b.setOwner(i, p.owner, c ?? null, p.x, p.z);
				else b.setOwner(i, p.owner, c ?? null);
			}
			painted.clear();
			for (const i of lifted) b.fx(i, 0, 0);
			lifted.clear();
			if (dim) {
				b.setActive(dim.map((x, i) => (x > 0.5 ? -1 : i)).filter((i) => i >= 0));
				dim = null;
			}
			if (darkS) {
				b.G.uNightTone.value.copy(darkS.tone);
				b.G.uSelLit.value = darkS.selLit;
				const sel = darkS.sel.map((x, i) => (x > 0.5 ? i : -1)).filter((i) => i >= 0);
				if (darkS.night) b.night(true, sel.length ? sel : null);
				else b.night(false, null, { hold: 0 });
				darkS = null;
			}
		},
	};
}

/**
 * Kamera kesmesi: geçişsiz, hemen o kadraj (o: { y, dist, pitch, yaw, lens }). Durum da hemen yazılır; ardından
 * aynı karede başlayan bir shot() buradan başlar (yoksa bir kare çizilmeden önceki kadrajdan başlardı).
 */
export function cut(app, x, z, o) {
	const c = app.cam;
	c.shot(x, z, { ...o, dur: 0.0001, arc: 0, distMin: 1 });
	c.target.set(x, o.y || 0, z);
	c.dist = o.dist;
	c.pitch = o.pitch;
	c.yaw = o.yaw;
	c.lens = c.lensTo;
}

/** Kamerayı parmağa kapat (kaydırma ve yakınlaştırma yok); dönen işlev açar. */
export function camLock(app) {
	const c = app.cam;
	const lk = app.inputLocked;
	app.inputLocked = true;
	c.pan = () => {};
	c.zoom = () => {};
	return () => {
		delete c.pan;
		delete c.zoom;
		app.inputLocked = lk;
	};
}

/**
 * Haritadaki bir dünya noktasına bağlı yazı: arayüzün iğne katmanına eklenir (ui.update her karede izdüşürür,
 * ui.setPins([]) cevap ekranı bitince kaldırır). Dönen öğe: { el, x, z }.
 */
export function tag(app, html, x, z, cls = '') {
	const ui = app.ui;
	const e = document.createElement('div');
	e.className = `dn-tag ${cls}`;
	e.innerHTML = `<div>${html}</div>`;
	ui.$.pins.appendChild(e);
	const t = { el: e, x, z };
	ui.pins.push(t);
	return t;
}

/** Dünya noktasının arayüz katmanındaki ekran yeri (css px). */
const _v = new THREE.Vector3();
const _s = { x: 0, y: 0 };
export function screenOf(app, x, z) {
	const b = app.board;
	app.toScreen(_v.set(x, typeof b.heightAt === 'function' ? b.heightAt(x, z) : b.top, z), _s);
	const r = app.canvas.getBoundingClientRect();
	const u = app.ui.el.getBoundingClientRect();
	return { x: _s.x + r.left - u.left, y: _s.y + r.top - u.top };
}

/**
 * Haritadaki bir noktada arayüz efekti: yıldız patlaması ve isteğe bağlı uçan yazı ("+1", "Kızgın!").
 * Arayüzün kendi Fx katmanı (DOM, yalnız transform/opacity; düşük kademede yarı sayıda parçacık).
 */
export function pop(app, x, z, text = '', { colors = ['#ffd25a', '#fff'], n = 12, dist = 60, cls = 'good' } = {}) {
	const fx = app?.ui?.fx;
	if (!fx) return;
	const p = screenOf(app, x, z);
	const u = app.ui.el.getBoundingClientRect();
	const cx = p.x + u.left;
	const cy = p.y + u.top;
	fx.burst(cx, cy, { n, dist, colors, kind: 'star', size: 11, life: 650 });
	if (text) fx.text(cx, cy - 26, text, { cls, life: 900 });
}

/** Haritada yanlış dokunuş işareti (arayüzün kırmızı çarpısı). */
export function tapX(app, x, z) {
	const p = screenOf(app, x, z);
	const e = document.createElement('i');
	e.className = 'fl-tapx';
	e.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M6 6l12 12M18 6L6 18" stroke="#ff5a4a" stroke-width="3.4" stroke-linecap="round"/></svg>';
	e.style.left = p.x + 'px';
	e.style.top = p.y + 'px';
	app.ui.$.fx.appendChild(e);
	setTimeout(() => e.remove(), 600);
}

/** Ses (yoksa sessiz). */
export function sfx(app, name, opts) {
	try {
		app?.sfx?.play?.(name, opts);
	} catch {
		/* ses yoksa sessiz */
	}
}

/** Haritadaki yazıların (tag) ortak stili: deneme tiplerinin CSS'ine eklenir. */
export const DENEME_CSS = /* css */ `
.dn-tag{position:absolute;left:0;top:0;pointer-events:none;will-change:transform;z-index:2}
.dn-tag>div{position:absolute;left:0;bottom:6px;transform:translateX(-50%);display:flex;align-items:center;gap:5px;padding:2px 9px 3px;border-radius:10px;white-space:nowrap;
  font-family:'Fredoka';font-weight:600;font-size:13px;line-height:1.15;color:#fff;background:rgba(10,18,44,.88);border:2px solid var(--tc,#fff);box-shadow:0 3px 0 rgba(0,0,0,.35);
  animation:flPopIn .3s cubic-bezier(.3,1.7,.5,1) both}
.dn-tag>div::after{content:'';position:absolute;left:50%;bottom:-7px;margin-left:-5px;border:5px solid transparent;border-bottom:0;border-top:6px solid var(--tc,#fff)}
.dn-tag b{font-family:'Lilita One';font-weight:400;font-size:14px;letter-spacing:.02em}
.dn-tag em{font-style:normal;font-family:'Lilita One';font-size:13px;color:var(--tc,#ffd25a)}
.dn-tag.big>div{font-size:15px;padding:3px 11px 4px}
.dn-tag.big b{font-size:17px}
.fl-ftxt.dn{font-size:24px}
.fl-ftxt.dn-gold{color:#ffd25a}
.fl-ftxt.dn-hot{color:#ff9a5a}
.fl-ftxt.dn-cold{color:#9fd8ff}
`;
