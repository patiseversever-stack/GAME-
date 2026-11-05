// HALAT ÇEKME (deneme): 20 sn'lik canlı düello. İki komutanın arasında bir halat; art arda hızlı sorular gelir (doğru mu
// yanlış mı, hangisi daha büyük, kısa 3-4 şık). Her doğru halatı bir adım sana çeker, rakibin her doğrusu ona.
// Süre bitince halat kimin tarafındaysa o kazanır; ortadaysa az yanlış yapan (isabet), o da eşitse o skora önce ulaşan.
// ("Doğru sayısı" eşit nette yanlış sayısıyla birlikte artar, yani seri basmayı ödüllendirirdi; benzetimde rastgele
// basanın kazanma payını ~10 puan büyütüyordu. Bu yüzden eşitlikte isabet bakılır.)
//
// RASTGELE BASMA KÂRSIZDIR (kullanıcı şartı): yanlış cevap halatı rakibe bir adım çeker (−1) VE 0,9 sn kilitler.
// İki şıklı soruda rastgele basanın beklenen adımı 0, üç şıkta −1/3, dört şıkta −1/2: karışık turda beklenen halat
// konumu eksidedir. Her yeni soruda düğmeler okuma kapısı kadar kapalı (0,3 sn + metin/60 harf/sn: en hızlı okuyucudan
// hızlı, okumadan seri basanın basış sayısını yarıya indirir; şans payı küçülür). Kurallar judge içinde de yürür:
// sunucu ya da hakem kaydı yeniden oynatır, kilit içinde ya da sırasız gelen basışları saymaz. Sayısal kanıt:
// test/deneme-duello.test.mjs (rastgele basan bot ortalama bilgili bota karşı kaybeder; beklenen konumu ≤ 0).
//
// Veri: items: [{ t, o: [şıklar], r: doğru şık, d: zorluk, tf? }] (tf: DOĞRU/YANLIŞ, sırası sabit; ötekiler karışır).
// Görünüm: v.items [{ t, o, d, tf }] + v.key [doğru şık] (key yalnız sunucuda; publicView siler).
// Değer: { log: [[k, şık, t], …] } (k: sıradaki soru, t: kartın açılışından sn). Tür 'closest':
//   err = −1000·net + 10·yanlış + t_son/100 (net = doğru − yanlış = oyuncunun halata katkısı; halat = net farkı).
// Çevrimiçi akış (bkz. rapor): her basış act 'halat' { k, şık, t } olarak sunucuya gider; sunucu kendi saatiyle
// damgalar, kilidi uygular, { ok, doğru şık } döner ve iki koltuğa 'ip' { netA, netB } yayınlar (halat canlı oynar).
// Botlar: kayıt önceden üretilir (gerçekçi okuma hızı ve isabet), kart açılınca zamanına göre canlı oynatılır.
// Joker: yarı yarıya → sıradaki çok şıklı sorularda yanlış şıklardan biri (dört şıkta ikisi) söner.

import { css, esc, shuffle, pCorrect, clamp, buzz } from './util.js';
import { PLAYERS } from './timing.js';
import { appOf, stamp, onOpen, onClose, rule, stampLater, sfx, DENEME_CSS } from './d_ortak.js';
import { clock, setTimeout } from '../core/clock.js';
import { sahneSVG, sahne, SAHNE_CSS, STEPS } from './d_halat_sahne.js';

const len = (s) => [...String(s ?? '')].length;

export const GAP = 0.3; // yeni soru görünür olduktan sonra düğmelerin en az kapalı kaldığı süre (sn)
export const LOCK = 0.9; // yanlış cevaptan sonra kilit (sn): 0,6 sn düzeltme + sıradaki sorunun en az 0,3 sn kapısı
/**
 * Okuma kapısı (sn): yeni soru görünür olduktan sonra düğmeler bu kadar kapalı. En hızlı okuyucudan (timing.js
 * PLAYERS.fast, 39 harf/sn) hızlıdır, dürüst oyuncuyu bekletmez; ama okumadan seri basanın basış sayısını yarıya
 * indirir (rastgele basmanın şans payı, yani varyansı küçülür).
 */
export const gate = (it) => GAP + len(it.t) / 60 + (it.tf ? 0 : it.o.reduce((s, o) => s + len(o), 0) / 90);
/** Bir kaydı kurallarla yeniden oynat (sunucu da aynısını yapar). */
export function tally(v, log, cap = (v.sec || 20) + 16) {
	const n = v.items.length;
	let k = 0;
	let next = gate(v.items[0]);
	let net = 0;
	let ok = 0;
	let bad = 0;
	let tEnd = 0;
	const steps = [];
	for (const e of Array.isArray(log) ? log : []) {
		if (!Array.isArray(e)) continue;
		const [ki, pick, t] = e;
		if (ki !== k || !Number.isFinite(t) || t < next - 0.02 || t > cap) continue;
		const right = v.key ? v.key[ki % n] === pick : null;
		if (right) {
			net++;
			ok++;
			tEnd = t;
		} else {
			net--;
			bad++;
		}
		// sıradaki soru: doğruda hemen, yanlışta düzeltmeden sonra görünür; düğmeler okuma kapısı kadar kapalı
		next = t + (right ? 0 : LOCK - GAP) + gate(v.items[(ki + 1) % n]);
		steps.push({ k: ki, pick, t, right });
		k++;
	}
	return { net, ok, bad, tEnd, steps };
}

/**
 * Bir oyuncunun turu (bot ve benzetim): skill ile isabet, okuma hızı; mode 'random' → okumadan, izin verilen ilk
 * anda rastgele basar (kullanıcının "rastgele basan" senaryosu).
 */
export function play(v, skill, R, mode = 'know') {
	const sec = v.sec || 20;
	const log = [];
	let t = 0.35 + R() * 0.3; // kart açılışına tepki
	let k = 0;
	const n = v.items.length;
	for (;;) {
		const it = v.items[k % n];
		const m = it.o.length;
		let dt;
		const g = gate(it);
		if (mode === 'random') dt = g + 0.05 + R() * 0.2; // düğme açılır açılmaz
		else {
			// okuma: ifade + (çok şıklıda) şıklar, blitz botuyla aynı ölçü; usta bot daha çabuk
			const L = len(it.t) + (it.tf ? 0 : 0.6 * it.o.reduce((s, o) => s + len(o), 0));
			dt = Math.max(g + 0.1, (L / 20 + 0.55) * (1.15 - 0.5 * skill) * (0.75 + R() * 0.5));
		}
		t += dt;
		if (t > sec) break;
		const right = v.key[k % n];
		let pick = right;
		if (mode === 'random') pick = Math.floor(R() * m);
		else if (R() >= (m === 2 ? Math.min(0.97, pCorrect(skill, it.d) + 0.1) : pCorrect(skill, it.d))) {
			do pick = Math.floor(R() * m);
			while (pick === right);
		}
		log.push([k, pick, Math.round(t * 100) / 100]);
		if (pick !== right) t += LOCK - GAP;
		k++;
	}
	return log;
}

export const halat = {
	time: 20,
	label: 'Halat Çekme',
	kind: 'closest',
	keep: true,
	cover: true, // tam ekran er meydanı (harita gizli)
	jokers: ['yari'],
	fmt: (v, value) => {
		const s = tally(v, value?.log);
		return `${s.net > 0 ? '+' : ''}${s.net} adım`;
	},
	sub: (v, value) => {
		const s = tally(v, value?.log);
		return `${s.ok} doğru · ${s.bad} yanlış`;
	},
	prepare(q, R) {
		const items = shuffle(q.items, R).map((it) => {
			if (it.tf) return { it, o: it.o.slice(), r: it.r };
			const idx = shuffle(it.o.map((_, i) => i), R);
			return { it, o: idx.map((i) => it.o[i]), r: idx.indexOf(it.r) };
		});
		const { items: _, ...pub } = q;
		const v = { q: pub, items: items.map((x) => ({ t: x.it.t, o: x.o, d: x.it.d || 2, ...(x.it.tf ? { tf: true } : {}) })), key: items.map((x) => x.r) };
		return stamp(v, q, (q2, k, P, text) => {
			// sabit tur: ortanca oyuncu ~8 soruyu okuyup cevaplayabilsin (yıldırım turu ölçüsü)
			const avg = v.items.reduce((s, x) => s + len(x.t), 0) / Math.max(1, v.items.length);
			return { think: 0, act: (8 * (avg / 20 + 0.55)) / PLAYERS.med.act };
		});
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('halat', SAHNE_CSS);
		const app = appOf();
		const m = app?.match;
		const card = el.closest('.fl-q');
		// iki taraf: kartın başlığındaki plakalar (soldaki saldıran); insan canlı, bot kaydı zamanında oynatılır
		const plates = [...(card?.querySelectorAll('.fl-qwho .fl-qp') || [])];
		const who = plates.slice(0, 2).map((e) => {
			const i = Number(e.dataset.p);
			const p = m?.players?.[i];
			const b = m?.cur?.v === v ? m.cur.bots?.find((x) => x.p?.i === i) : null;
			return { i, p, el: e, name: p?.name || e.querySelector('.nm b')?.textContent || '', color: p?.css || getComputedStyle(e).getPropertyValue('--pc') || '#888', av: e.querySelector('.fl-av')?.outerHTML || '', human: !!p?.human, steps: b ? tally(v, b.value?.log).steps : null, net: 0, ok: 0, j: 0, combo: 0 };
		});
		while (who.length < 2) who.push({ i: -1, name: who.length ? 'Rakip' : 'Sen', color: who.length ? '#4a8cff' : '#e8343c', av: '<span class="fl-av"></span>', human: !who.length, steps: null, net: 0, ok: 0, j: 0, combo: 0 });
		const meS = who.findIndex((w) => w.human);
		const [L, Rt] = who;
		const side = (w, cls) => `<div class="ht-side ${cls}" style="--pc:${w.color}">${w.av}<b>0</b></div>`;
		const short = (w) => (w.human ? 'SEN' : String(w.name || '').toLocaleUpperCase('tr-TR'));
		const tagOf = (w, cls) => `<span class="ht-tag ${cls}" style="--pc:${w.color}">${w.av}<b>${esc(short(w))}</b></span>`;
		el.innerHTML = `<div class="dn-ht" style="--cl:${L.color};--cr:${Rt.color}">
			<div class="ht-hud">${side(L, 'L')}<div class="ht-meter"><span class="ht-mid">HALAT ORTADA</span>
				<div class="ht-track"><i class="hl"></i><i class="hr"></i><i class="c0"></i><b class="ht-knot"></b></div>
				<div class="ht-ends"><span>${esc(short(L))}</span><span>${esc(short(Rt))}</span></div></div>${side(Rt, 'R')}</div>
			<div class="ht-sw"><div class="ht-arena">${sahneSVG(L.color, Rt.color)}${tagOf(L, 'L')}${tagOf(Rt, 'R')}
				<span class="ht-ev L"></span><span class="ht-ev R"></span><span class="ht-combo L"></span><span class="ht-combo R"></span><span class="ht-big"></span></div></div>
			<div class="ht-log"></div>
			<div class="dn-ht-q"><i></i><u></u><span></span><em class="ht-gate"></em></div>
			<div class="ht-dots"></div>
			<div class="dn-ht-a"><i class="dn-ht-rd"></i><div class="dn-ht-btns"></div><i class="dn-ht-lk"></i></div>
			<div class="dn-ht-rows"></div>
		</div>`;
		rule(el, 'Halatı kendine çek');
		const root = el.querySelector('.dn-ht');
		const sc = [root.querySelector('.ht-side.L b'), root.querySelector('.ht-side.R b')];
		const combo = [root.querySelector('.ht-combo.L'), root.querySelector('.ht-combo.R')];
		const mid = root.querySelector('.ht-mid');
		const big = root.querySelector('.ht-big');
		const knotEl = root.querySelector('.ht-knot');
		const evs = [root.querySelector('.ht-ev.L'), root.querySelector('.ht-ev.R')];
		const logEl = root.querySelector('.ht-log');
		const gateEl = root.querySelector('.ht-gate');
		const events = [];
		const dots = root.querySelector('.ht-dots');
		const stage = root.querySelector('.dn-ht-q');
		const sTxt = stage.querySelector('span');
		const sKind = stage.querySelector('i');
		const sNo = stage.querySelector('u');
		const ans = root.querySelector('.dn-ht-a');
		const btnHost = root.querySelector('.dn-ht-btns');
		ans.style.setProperty('--lk', LOCK - GAP + 's');

		// ---------------------------------------------------------------- sahne (kare kare; durunca biter)
		let alive = true;
		let hot = false;
		let t0 = null; // kart açıldı (sn)
		let frozen = false;
		const now = () => (t0 == null ? 0 : (clock.now() - t0) / 1000);
		const pos = () => L.net - Rt.net; // + : sola (L) çekili
		const sh = sahne(root, pos);
		const sayBig = (txt, cls = '', ms = 900) => {
			big.textContent = txt;
			big.className = `ht-big on ${cls}`;
			if (ms) setTimeout(() => big.classList.remove('on'), ms);
		};
		const meter = () => {
			// düğüm: ortadan önde olanın yanına kayar (en uç 7 adım)
			const p = Math.max(-STEPS, Math.min(STEPS, pos()));
			knotEl.style.left = `${50 - (p / STEPS) * 46}%`;
			root.style.setProperty('--lc', p > 0 ? L.color : p < 0 ? Rt.color : '#ffd25a');
		};
		/** Olay: takımın üstünde büyük yazı + alttaki kayıt ("Defne doğru bildi → halat Defne'ye"). */
		const event = (s, right) => {
			const w = who[s];
			const nm = short(w);
			const e = evs[s];
			e.innerHTML = right ? `<b>${esc(nm)}</b><span>+1 DOĞRU</span><i>${s ? '▶▶' : '◀◀'}</i>` : `<b>${esc(nm)}</b><span>−1 YANLIŞ</span><i>${s ? '◀◀' : '▶▶'}</i>`;
			e.className = `ht-ev ${s ? 'R' : 'L'} ${right ? 'ok' : 'no'}`;
			void e.offsetWidth;
			e.classList.add('on');
			const to = right ? w : who[1 - s];
			const nmL = w.human ? 'Sen' : w.name;
			events.unshift(`<div class="${right ? 'ok' : 'no'}" style="--pc:${w.color}"><i></i><span><b>${esc(nmL)}</b> ${right ? (w.human ? 'doğru bildin' : 'doğru bildi') : w.human ? 'yanıldın' : 'yanıldı'}</span><em style="color:${to.color}">halat → ${esc(to.human ? 'sana' : to.name)}</em></div>`);
			events.length = Math.min(events.length, 2);
			logEl.innerHTML = events.join('');
		};
		const midText = () => {
			meter();
			if (hot && !frozen) return;
			const p = pos();
			const lead = p === 0 ? null : p > 0 ? L : Rt;
			mid.textContent = !lead ? 'HALAT ORTADA' : `${lead.human ? 'SEN' : lead.name.toLocaleUpperCase('tr-TR')} ÖNDE · ${Math.abs(p)}`;
		};
		/** Bir taraf çekti (doğru) ya da kaydı (yanlış: halat rakibe kayar). */
		const pull = (s, right) => {
			const w = who[s];
			w.net += right ? 1 : -1;
			if (right) w.ok++;
			w.combo = right ? w.combo + 1 : 0;
			sc[s].textContent = (w.net > 0 ? '+' : '') + w.net;
			sc[s].classList.add('pop');
			setTimeout(() => sc[s].classList.remove('pop'), 160);
			combo[s].textContent = w.combo >= 3 ? `SERİ ×${w.combo}` : '';
			combo[s].classList.toggle('on', w.combo >= 3);
			sh.pull(s, right, w.color);
			event(s, right);
			if (right) {
				app?.cam?.impulse?.(s === meS ? 0.14 : 0.08);
				if (w.combo === 3 || w.combo === 6) sayBig(w.combo === 6 ? 'DURDURULAMAZ!' : 'ALEV ALDI!', 'gold', 800);
				if (s !== meS) {
					sfx(app, 'whoosh');
					if (meS >= 0) buzz(10);
				}
			}
			midText();
		};
		const loop = () => {
			if (!alive || !root.isConnected) return;
			// bot taraflarının kaydı: kart açıldığından beri geçen süreye göre
			if (t0 != null && !frozen) {
				const e = now();
				for (let s = 0; s < 2; s++) {
					const w = who[s];
					while (w.steps && w.j < w.steps.length && w.steps[w.j].t <= e) pull(s, w.steps[w.j++].right);
				}
				gateTick(e);
				const left = (v.sec || 20) - e;
				if (!hot && left <= 5 && left > 0) {
					hot = true;
					root.classList.add('hot');
					sh.setHot(true);
					mid.textContent = 'SON 5 SANİYE!';
					sayBig('SON 5!', '', 900);
					buzz(30);
				}
			}
			sh.draw(clock.now() / 1000);
			requestAnimationFrame(loop);
		};
		sh.draw(0);
		meter();
		requestAnimationFrame(loop);
		onClose(el, () => (alive = false));

		// ---------------------------------------------------------------- sorular (insan)
		const me = meS >= 0 ? who[meS] : null;
		const log = [];
		const mine = [];
		let k = 0;
		let done = false;
		let lock = false;
		let lockUntil = 0; // yanlıştan sonra düzeltme bitişi (sn, kartın açılışından)
		let readyAt = gate(v.items[0]); // hakemin 'next'i: bu andan önceki basış sayılmaz (tally ile aynı kural)
		let hide = null; // yarı yarıya: { madde: [sönen şıklar] }
		let hideLeft = 0;
		const n = v.items.length;
		const show = () => {
			const it = v.items[k % n];
			sKind.textContent = it.tf ? 'DOĞRU MU?' : it.o.length === 2 ? 'HANGİSİ?' : 'SEÇ';
			sNo.textContent = `${k + 1}. SORU`;
			sTxt.textContent = it.t;
			sTxt.style.animation = 'none';
			void sTxt.offsetWidth;
			sTxt.style.animation = '';
			stage.classList.remove('ok', 'no');
			btnHost.innerHTML = it.tf
				? `<div class="fl-tf"><button class="fl-opt fl-yes wait" data-i="0"><span>DOĞRU</span></button><button class="fl-opt fl-no wait" data-i="1"><span>YANLIŞ</span></button></div>`
				: `<div class="dn-ht-g n${it.o.length}">${it.o.map((o, i) => `<button class="fl-opt wait" data-i="${i}"><span>${esc(o)}</span></button>`).join('')}</div>`;
			const hd = hide?.[k % n];
			if (hd && hideLeft > 0 && !it.tf) {
				hideLeft--;
				for (const i of hd) btnHost.querySelectorAll('.fl-opt')[i]?.classList.add('gone');
			}
			// okuma kapısı: düğmeler readyAt'e dek kapalı (ince çubuk dolar); açılışı oyun saatiyle kare döngüsü yapar
			ans.style.setProperty('--gt', Math.max(0.05, readyAt - now()).toFixed(2) + 's');
			ans.classList.remove('read');
			void ans.offsetWidth;
			ans.classList.add('read');
			gateEl.textContent = 'OKU…';
			gateEl.className = 'ht-gate';
			gateTick(now());
		};
		/** Kare başına: kilit bittiyse sıradaki soru, kapı açıldıysa düğmeler (hakemle aynı saat: kartın açılışı). */
		function gateTick(e) {
			if (done || t0 == null) return;
			if (lock && e >= lockUntil) {
				lock = false;
				ans.classList.remove('lock');
				show();
				return;
			}
			if (!lock && e >= readyAt && btnHost.querySelector('.fl-opt.wait')) {
				for (const b of btnHost.querySelectorAll('.fl-opt.wait')) b.classList.remove('wait');
				ans.classList.remove('read');
				gateEl.textContent = 'BAS!';
				gateEl.className = 'ht-gate go';
			}
		}
		show();
		onOpen(el, () => {
			t0 = clock.now();
			sayBig('HALATI ÇEK!', 'gold', 1300);
			logEl.innerHTML = '<div class="rule"><span>Her doğru halatı <b>sana</b> bir adım çeker, yanlış <b>rakibe</b>. Süre bitince halat kimdeyse o kazanır.</span></div>';
		});
		btnHost.addEventListener('click', (e) => {
			const b = e.target.closest('.fl-opt');
			if (!b || done || lock || t0 == null || b.classList.contains('wait') || b.classList.contains('gone')) return;
			const t = Math.round(now() * 100) / 100;
			if (t < readyAt) return;
			const pick = Number(b.dataset.i);
			const it = v.items[k % n];
			log.push([k, pick, t]);
			// bu sorunun düğmeleri hemen kapanır (sıradaki soru görünene ve kapısı açılana dek basış sayılmaz)
			for (const x of btnHost.querySelectorAll('.fl-opt')) if (x !== b) x.classList.add('wait');
			const right = v.key ? v.key[k % n] === pick : null;
			mine.push({ t: it.t, a: v.key ? it.o[v.key[k % n]] : '', right });
			dots.innerHTML = mine.slice(-12).map((x) => `<i class="${x.right ? 'y' : x.right === false ? 'n' : ''}"></i>`).join('');
			k++;
			readyAt = t + (right === false ? LOCK - GAP : 0) + gate(v.items[k % n]);
			if (right === null) {
				// çevrimiçi: doğru şık sunucuda; halat sunucunun 'ip' yayınıyla oynar (bkz. dosya başı)
				setTimeout(() => !done && show(), 120);
				return;
			}
			if (me) pull(meS, right);
			if (right) {
				stage.classList.add('ok');
				const fx = app?.ui?.fx;
				if (fx) {
					const r = b.getBoundingClientRect();
					fx.text(r.left + r.width / 2, r.top, '+1', { cls: 'dn dn-gold', life: 700 });
				}
				sfx(app, me?.combo >= 3 ? 'combo' : 'right');
				buzz(14);
				setTimeout(() => !done && show(), 120);
			} else {
				b.classList.add('wrong');
				stage.classList.add('no');
				sTxt.insertAdjacentHTML('beforeend', `<b class="fix">Doğrusu: ${esc(it.o[v.key[(k - 1) % n]])} · −1</b>`);
				sfx(app, 'wrong');
				buzz(45);
				app?.cam?.impulse?.(0.1);
				lock = true;
				lockUntil = t + LOCK - GAP;
				ans.classList.add('lock');
			}
		});

		return {
			lock() {
				done = true;
				frozen = true;
			},
			value: () => ({ log: log.map((x) => x.slice()) }),
			joker(e) {
				if (!e?.hide) return;
				hide = e.hide;
				hideLeft = 6;
				app?.ui?.toast?.('Sıradaki çok şıklı sorularda yanlışlar sönüyor', { tone: 'good', ms: 1800 });
			},
			reveal(results) {
				done = true;
				frozen = true;
				root.classList.remove('hot');
				// son durum: hakemin hesabı (bütün kayıtlar)
				for (const r of results) {
					const s = who.findIndex((w) => w.i === r.i);
					if (s < 0) continue;
					const tl = tally(v, r.value?.log);
					who[s].net = tl.net;
					who[s].ok = tl.ok;
					sc[s].textContent = (tl.net > 0 ? '+' : '') + tl.net;
				}
				const order = results.slice().sort((a, b) => a.err - b.err || a.time - b.time);
				const win = order[0];
				const ws = who.findIndex((w) => w.i === win?.i);
				const p = pos();
				meter();
				mid.textContent = p === 0 ? 'ORTADA · İSABET' : `${Math.abs(p)} ADIM`;
				sh.setHot(false);
				if (ws >= 0) {
					setTimeout(() => {
						sh.finish(ws);
						sayBig(p === 0 ? 'İSABET KAZANDI' : 'ÇAMURA!', 'gold', 1500);
						app?.cam?.impulse?.(0.35);
						sfx(app, 'cheer');
						const fx = app?.ui?.fx;
						const r = sc[ws].getBoundingClientRect();
						if (fx) fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 22, dist: 110, colors: [who[ws].color, '#ffd25a', '#fff'], kind: 'star', size: 12, life: 900 });
					}, 350);
				}
				root.classList.add('done');
				root.querySelector('.dn-ht-rows').innerHTML = mine
					.slice(-3)
					.map((l) => `<div class="${l.right ? '' : 'n'}"><span>${l.right ? '✓' : '✗'}</span><span>${esc(l.t)}</span><em>${esc(l.a)}</em></div>`)
					.join('');
				const meR = results.find((r) => r.p?.human);
				if (meR && app && win) {
					const tl = tally(v, meR.value?.log);
					const lead = Math.abs(p);
					if (win === meR) stampLater(app, 'HALATI ÇEKTİN!', 'gold', p === 0 ? 'Halat ortada: senin isabetin yüksek' : `${lead} adım sende · ${tl.ok} doğru`);
					else stampLater(app, 'HALAT KAÇTI', 'bad', p === 0 ? `Halat ortada: ${win.name} daha az yanıldı` : `${win.name} ${lead} adım çekti`);
				}
				setTimeout(() => {
					const w = el.closest('.fl-q')?.querySelector('.fl-cr.win .tag');
					if (w) w.textContent = 'ÇEKTİ';
				}, 0);
			},
			destroy() {
				alive = false;
			},
		};
	},
	joker(id, v) {
		if (id !== 'yari') return null;
		// çok şıklı her soruda sönecek yanlışlar (dört şıkta iki, üç şıkta bir); kart sıradakilere uygular
		const hide = {};
		v.items.forEach((it, i) => {
			if (it.tf || it.o.length < 3) return;
			const wrong = it.o.map((_, j) => j).filter((j) => j !== v.key[i]);
			hide[i] = wrong.slice(0, it.o.length >= 4 ? 2 : 1);
		});
		return { hide };
	},
	/** Çevrimiçi görünüm: soru yazıları ve şıklar; doğru şıklar (key) sunucuda. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.key;
		delete o.q.items;
		return o;
	},
	judge(v, value) {
		const s = tally(v, value?.log);
		if (!value) return { correct: false, err: 1e5, net: 0 };
		return { correct: s.net >= 3, err: -1000 * s.net + 10 * s.bad + s.tEnd / 100, net: s.net };
	},
	bot(v, skill, R) {
		return { value: { log: play(v, skill, R) }, time: v.sec || 20 };
	},
	/** Sınama örneği (test/deneme.test.mjs): kapı açılır açılmaz hep doğru / hep yanlış basan iki kayıt (12 sn). */
	ornek(v) {
		const n = v.items.length;
		const rec = (bad) => {
			const log = [];
			for (let k = 0, t = 0; ; k++) {
				const it = v.items[k % n];
				t += gate(it) + 0.2;
				if (t > 12) return { log };
				log.push([k, bad ? (v.key[k % n] + 1) % it.o.length : v.key[k % n], Math.round(t * 100) / 100]);
				if (bad) t += LOCK - GAP;
			}
		};
		return { good: rec(false), bad: rec(true) };
	},
};
