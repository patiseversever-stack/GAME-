// FETİH KOŞUSU (deneme): bir kurala uyan illeri süre bitmeden haritada bul ve fethet ("Ege Bölgesi'nin illeri",
// "Plakası 10–19 olan iller", "Adı K ile başlayan iller"…). Her doğru dokunuşta il, dokunulan noktadan oyuncunun
// rengine boyanır ve kalkar (oyunun fetih anı); yanlış dokunuş kırmızı çarpı ve 0,8 sn kilit (rastgele dokunarak
// puan toplanmasın). Herkes aynı süreyi oynar (tur); çok il alan kazanır, eşitlikte az yanlış, sonra erken bitiren.
// Sporcle'ın "tıkla bul"u ve Tenable'ın "listeyi tamamla"sının 3B harita ve fetih boyasıyla birleşimi.
//
// Veri: ids: [plaka, …] (hedef iller), frame: 'all' | bölge anahtarı | [plaka, …] (kamera kadrajı: cevabı ele
//       vermeyecek kadar geniş bir alan)
// Değer: { taps: [plaka, …] } (dokunulan iller, sırayla; sunucu yargıyı bundan yeniden kurar)
// Tür 'closest': err = −doğru + 0,1·yanlış (on yanlış bir ile bedel); correct = hepsi bulundu.
// Joker: yarı yarıya → henüz bulunmamış iki hedef parlar.

import { css, esc, pCorrect, clamp, buzz } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, guard, onClose, onOpen, cardTop, tag, tapX, sfx, rule, stampLater, LOOK, ACT, DENEME_CSS } from './d_ortak.js';
import { setTimeout, clearTimeout } from '../core/clock.js';
import DATA from '../data/turkiye.json';

const PROV = DATA.provinces; // dizin = tahtadaki il dizini
const BY_ID = new Map(PROV.map((p, i) => [p.id, i]));

const CSS = /* css */ `
.dn-ks{display:flex;flex-direction:column;gap:8px}
.dn-ks-top{display:flex;align-items:center;gap:10px}
.dn-ks-cnt{display:flex;align-items:baseline;gap:4px;min-width:84px}
.dn-ks-cnt b{font-family:'Lilita One';font-weight:400;font-size:38px;line-height:1;color:var(--gold);text-shadow:0 3px 0 #3a2000;transition:transform .15s}
.dn-ks-cnt b.pop{transform:scale(1.3)}
.dn-ks-cnt small{font-family:'Lilita One';font-size:17px;color:#cfe0ff}
.dn-ks-last{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#cfe0ff}
.dn-ks-last span{font-family:'Fredoka';font-weight:600;font-size:16px;letter-spacing:0;text-transform:none;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dn-ks-last span.no{color:#ff9a8a}
.dn-ks .fl-send{flex:none;width:auto;min-width:92px;padding:0 14px;height:44px;font-size:17px}
.dn-ks-seg{display:flex;gap:3px;height:12px}
.dn-ks-seg i{flex:1;border-radius:4px;background:rgba(255,255,255,.14);box-shadow:inset 0 -2px 0 rgba(0,0,0,.25);transition:background .25s,transform .25s}
.dn-ks-seg i.on{background:var(--pc,#ff3030);transform:scaleY(1.25);box-shadow:inset 0 -2px 0 rgba(0,0,0,.25),0 0 0 1.5px #fff}
.dn-ks-seg i.miss{background:#f3ead2;opacity:.75}
.dn-ks-hint{font-size:12.5px;line-height:1.2;text-align:center;color:#cfe0ff;opacity:.9}
.dn-ks.lock .dn-ks-hint{color:#ff9a8a}
.dn-ks.sent .fl-send,.dn-ks.sent .dn-ks-hint{display:none}
.dn-ks-res{display:flex;flex-wrap:wrap;gap:4px;justify-content:center}
.dn-ks-res span{padding:2px 8px;border-radius:8px;font-size:13px;background:rgba(255,255,255,.1)}
.dn-ks-res span.ok{background:var(--pc,#2fa84a);color:#fff}
.dn-ks-res span.miss{background:#f3ead2;color:#3a2a10}
.dn-tag.ks>div{border-color:var(--tc,#fff);animation:flPopIn .3s cubic-bezier(.3,1.7,.5,1) both,dnTagOut .4s 1.5s ease-in forwards}
@keyframes dnTagOut{to{opacity:0;transform:translateX(-50%) translateY(6px) scale(.7)}}
.dn-tag.ks.miss>div{background:rgba(250,244,226,.95);color:#3a2a10;border-color:#fff;animation:flPopIn .3s cubic-bezier(.3,1.7,.5,1) both}
`;

/** Kadraj illeri (dizin): 'all' → bütün Türkiye, bölge anahtarı → o bölge (+ hedefler), plaka listesi. */
function frameOf(q, targets) {
	const f = q.frame;
	if (Array.isArray(f)) return [...new Set([...f.map((id) => BY_ID.get(id)).filter((i) => i != null), ...targets])];
	if (typeof f === 'string' && f !== 'all') {
		const keys = f.split(',');
		const list = PROV.map((p, i) => (keys.includes(p.region) ? i : -1)).filter((i) => i >= 0);
		if (list.length) return [...new Set([...list, ...targets])];
	}
	return PROV.map((_, i) => i);
}

/** Dokunuşlardan doğru ve yanlış sayısı (sunucu da aynı hesabı yapar). */
function count(v, taps) {
	const T = new Set(v.targets);
	const ok = new Set();
	let bad = 0;
	for (const id of Array.isArray(taps) ? taps : []) {
		const i = BY_ID.get(id);
		if (i == null) continue;
		if (T.has(i)) ok.add(i);
		else bad++;
	}
	return { ok: ok.size, bad };
}

export const kosu = {
	time: 30,
	label: 'Fetih Koşusu',
	kind: 'closest',
	needsMap: true,
	jokers: ['yari'],
	fmt: (v, value) => `${count(v, value?.taps).ok}/${v.targets.length} il`,
	sub: (v, value) => {
		const c = count(v, value?.taps);
		return c.bad ? `${c.bad} yanlış` : 'hatasız';
	},
	prepare(q) {
		const targets = q.ids.map((id) => BY_ID.get(id)).filter((i) => i != null);
		const v = { q, targets, frame: frameOf(q, targets) };
		return stamp(v, q, (q2, k) => {
			const n = targets.length;
			return {
				wait: 0.5 + 0.6, // kart + kadraj oturur
				look: LOOK.orient + LOOK.map,
				think: n * (1.4 + 0.5 * k), // her ili hatırla (liste içinden)
				act: n * (ACT.mapTap + 0.6), // haritada bul (ad yok) ve dokun
			};
		});
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('kosu', CSS);
		const app = appOf();
		const n = v.targets.length;
		const me = app?.match?.humanPlayer;
		const color = me?.css || '#ff3030';
		el.innerHTML = `<div class="dn-ks" style="--pc:${color}">
			<div class="dn-ks-top"><div class="dn-ks-cnt"><b>0</b><small>/ ${n}</small></div>
				<div class="dn-ks-last">son fetih<span>—</span></div><button class="fl-send">BİTİR</button></div>
			<div class="dn-ks-seg">${'<i></i>'.repeat(n)}</div>
			<div class="dn-ks-hint">Haritada illere dokun · yanlış dokunuş 1 sn kilitler</div>
		</div>`;
		rule(el, 'En çok il alan');
		const root = el.querySelector('.dn-ks');
		const cnt = root.querySelector('.dn-ks-cnt b');
		const last = root.querySelector('.dn-ks-last span');
		const segs = [...root.querySelectorAll('.dn-ks-seg i')];
		const hint = root.querySelector('.dn-ks-hint');
		const T = new Set(v.targets);
		const found = new Set();
		const taps = [];
		let done = false;
		let lockT = 0;
		let locked = false;
		const finish = () => {
			if (done) return;
			done = true;
			root.classList.add('sent');
			api.answer({ taps: taps.slice() });
		};
		root.querySelector('.fl-send').addEventListener('click', finish);
		if (!app) return { lock: () => (done = true), value: () => ({ taps: taps.slice() }), reveal() {}, destroy() {} };
		const b = app.board;
		const g = guard(app);
		g.allActive();
		queueMicrotask(() => {
			if (!el.isConnected) return;
			app.cam.fit(app.boundsOf(v.frame), { pitch: 1.0, pad: 1.06, top: cardTop(el), dur: 0.9, arc: 4 });
		});
		const stopOpen = onOpen(el, () => sfx(app, 'march'));
		api.onMapTap((pt) => {
			if (done || locked) return;
			const i = b.pick(pt.x, pt.z);
			if (i < 0) return; // deniz: yok say
			if (found.has(i)) {
				sfx(app, 'tap');
				return;
			}
			const p = b.provinces[i];
			taps.push(p.id);
			if (T.has(i)) {
				found.add(i);
				g.paint(i, color, pt.x, pt.z);
				g.fx(i, 0.5, 0);
				tag(app, `<b>${esc(p.name)}</b>`, p.x, p.z, 'ks').el.style.setProperty('--tc', color);
				segs[found.size - 1]?.classList.add('on');
				cnt.textContent = String(found.size);
				cnt.classList.remove('pop');
				void cnt.offsetWidth;
				cnt.classList.add('pop');
				last.textContent = p.name;
				last.classList.remove('no');
				sfx(app, found.size >= 3 ? 'combo' : 'paint', { n: found.size });
				buzz(10);
				if (found.size === n) setTimeout(finish, 350);
			} else {
				tapX(app, pt.x, pt.z);
				last.textContent = `${p.name} değil`;
				last.classList.add('no');
				sfx(app, 'wrong');
				buzz(40);
				locked = true;
				root.classList.add('lock');
				hint.textContent = 'Yanlış il · 1 sn bekle';
				lockT = setTimeout(() => {
					locked = false;
					root.classList.remove('lock');
					hint.textContent = 'Haritada illere dokun · yanlış dokunuş 1 sn kilitler';
				}, 800);
			}
		});
		const close = onClose(el, () => {
			stopOpen();
			clearTimeout(lockT);
			g.restore();
		});
		return {
			lock() {
				done = true;
				root.classList.add('sent');
			},
			value: () => ({ taps: taps.slice() }),
			// yarı yarıya: henüz bulunmamış iki hedef parlar
			joker(e) {
				if (!e?.glow) return;
				for (const i of e.glow) if (!found.has(i)) g.fx(i, 0.25, 1);
				app.ui.toast?.('İki hedef il parlıyor', { tone: 'good', ms: 1800 });
			},
			reveal(results) {
				done = true;
				root.classList.add('sent');
				// bulunamayanlar soluk krem boyanır ve adları yazılır
				let k = 0;
				for (const i of v.targets) {
					if (found.has(i)) continue;
					const p = b.provinces[i];
					setTimeout(() => {
						if (!el.isConnected) return;
						g.paint(i, '#f3ead2', p.x, p.z);
						tag(app, esc(p.name), p.x, p.z, 'ks miss');
					}, 120 * k++);
				}
				const meR = results.find((r) => r.p?.human);
				if (meR) {
					const order = results.slice().sort((a, b2) => a.err - b2.err || a.time - b2.time);
					const c = count(v, meR.value?.taps).ok;
					if (order[0] === meR) stampLater(app, c === n ? 'HEPSİ SENİN!' : `${c} İL ALDIN!`, 'gold', `${n} ilin ${c} tanesini fethettin`);
					else stampLater(app, `${c} İL`, 'bad', `${order[0].name} ${count(v, order[0].value?.taps).ok} il aldı`);
				}
				setTimeout(() => {
					const w = el.closest('.fl-q')?.querySelector('.fl-cr.win .tag');
					if (w) w.textContent = 'EN ÇOK';
				}, 0);
			},
			destroy: close,
		};
	},
	joker(id, v, R) {
		if (id !== 'yari') return null;
		const list = v.targets.slice();
		for (let i = list.length - 1; i > 0; i--) {
			const j = Math.floor(R() * (i + 1));
			[list[i], list[j]] = [list[j], list[i]];
		}
		return { glow: list.slice(0, 2) };
	},
	judge(v, value) {
		const c = count(v, value?.taps);
		const n = v.targets.length;
		return { correct: c.ok === n, err: -c.ok + 0.1 * c.bad, score: c.ok };
	},
	bot(v, skill, R) {
		const n = v.targets.length;
		const p = clamp(pCorrect(skill, v.q.diff) + 0.1, 0.15, 0.97);
		let ok = 0;
		for (let i = 0; i < n; i++) if (R() < p) ok++;
		const bad = Math.floor(R() * (1 + (1 - skill) * 3));
		const pool = v.targets.slice();
		for (let i = pool.length - 1; i > 0; i--) {
			const j = Math.floor(R() * (i + 1));
			[pool[i], pool[j]] = [pool[j], pool[i]];
		}
		const T = new Set(v.targets);
		const others = v.frame.filter((i) => !T.has(i));
		const taps = pool.slice(0, ok).map((i) => PROV[i].id);
		for (let k = 0; k < bad && others.length; k++) taps.splice(Math.floor(R() * (taps.length + 1)), 0, PROV[others[Math.floor(R() * others.length)]].id);
		// hepsini bulan erken bitirir; bulamayan süre sonuna dek arar
		const time = ok === n ? botTime(v, R, skill, 0.4, 1) : v.sec || 30;
		return { value: { taps }, time };
	},
};
