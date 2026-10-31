// Soru galerisi: bütün soru tiplerini oyunun kendisiyle (aynı kart, harita, VS girişi, sayaç, jokerler, cevap
// ekranı) birkaç örnek soruyla gösterir. Tasarım, grafik ve mantık incelemesi için.
//
// Üstte galeri şeridi (tip, örnek, sahne ve süre seçimi); altındaki alan telefondaki oyun ekranının aynısı. Her
// örnek gerçek akışla oynar: düello sahnesinde önce saldırı filminin son hali (ordular cephede, gece odağı),
// sonra VS girişi ve soru kartı; cevaplayınca bot da cevaplar ve cevap ekranı açılır.
//
// YENİ · deneme tipleri (src/quiz/deneme.js): tip listesinin başında ayrı bir bölümde; maçta çıkmazlar, yalnız
// burada denenir. Galeri ilk açılışta ilk deneme tipiyle başlar; adresin sonuna #kosu gibi tip adı yazılırsa o açılır.

import { createFetih } from './index.js';
import { TYPES } from './quiz/types.js';
import { CATS } from './quiz/categories.js';
import { BANK } from './data/bank.js';
import { DENEME_TYPES, DENEME_ORDER, DENEME_SAMPLES, bindApp } from './quiz/deneme.js';

const ORDER = [
	['choice', 'Çoktan seçmeli'],
	['tf', 'Doğru / Yanlış'],
	['proverb', 'Atasözü (boşluk doldurma)'],
	['hang', 'Adam asmaca'],
	['anagram', 'Anagram'],
	['cross', 'Çengel bulmaca'],
	['order', 'Sıralama'],
	['match', 'Eşleştirme'],
	['num', 'Tahmin'],
	['pin', 'Harita'],
	['hilo', 'Karşılaştırma'],
	['odd', 'Farklı olan'],
	['emoji', 'Emoji'],
	['riddle', 'Bilmece'],
	['img', 'Resimli'],
	['blitz', 'Yıldırım'],
];
// galerideki bütün tipler tek listede: oyundakiler, ardından kullanıcının defterde tuttuğu yeni tipler (3. alan true).
// Defterde elenen prototipler (Fetih Koşusu, Bağlantı Duvarı) listede yok; kodları src/quiz/ altında duruyor.
const ELENEN = new Set(['kosu', 'baglanti']);
const LIST = [...ORDER, ...DENEME_ORDER.filter(([t]) => !ELENEN.has(t)).map(([t, n, s]) => [t, n, true, s])];
const ALLT = { ...TYPES, ...DENEME_TYPES };
const isNew = (t) => !!DENEME_TYPES[t];

// bankada sorusu olmayan tipler: oyunun kendi denemelerindeki örnek sorular
const BLITZ = [
	['Ankara, Türkiye’nin başkentidir.', true],
	['Van Gölü bir tatlı su gölüdür.', false],
	['Everest, dünyanın en yüksek dağıdır.', true],
	['İstanbul Boğazı, Karadeniz’i Ege Denizi’ne bağlar.', false],
	['Mimar Sinan, Selimiye Camii’ni yapmıştır.', true],
	['Türkiye’de 7 coğrafi bölge vardır.', true],
	['Ay, Güneş’ten büyüktür.', false],
	['Pamukkale, Denizli’dedir.', true],
	['Örümceklerin 6 bacağı vardır.', false],
	['Kızılırmak, Türkiye’nin en uzun nehridir.', true],
	['Su, deniz seviyesinde 50 °C’de kaynar.', false],
	['Malazgirt Savaşı 1071’de yapıldı.', true],
].map(([t, ans]) => ({ t, ans }));
const SAMPLES = {
	anagram: [
		{ id: 'ornek-an1', cat: 'bilim', diff: 1, type: 'anagram', q: 'Evcil hayvan', w: 'KEDİ' },
		{ id: 'ornek-an2', cat: 'bilim', diff: 2, type: 'anagram', q: 'Sıcaklık ölçer', w: 'TERMOMETRE' },
		{ id: 'ornek-an3', cat: 'sanat', diff: 3, type: 'anagram', q: 'Kitapları düzenleyen meslek', w: 'KÜTÜPHANECİLİK' },
	],
	cross: [
		{ id: 'ornek-cr1', cat: 'tarih', diff: 2, type: 'cross', q: 'Padişahlar', words: [{ w: 'FATİH', clue: 'İstanbul fatihi' }, { w: 'SELİM', clue: 'Yavuz' }, { w: 'KANUNİ', clue: 'Süleyman' }] },
		{
			id: 'ornek-cr2',
			cat: 'cografya',
			diff: 3,
			type: 'cross',
			q: 'Türkiye coğrafyası',
			words: [
				{ w: 'ERCİYES', clue: 'Kayseri’nin sönmüş volkanı' },
				{ w: 'KIZILIRMAK', clue: 'Türkiye’nin en uzun nehri' },
				{ w: 'TUZGÖLÜ', clue: 'İç Anadolu’nun tuzlu gölü' },
				{ w: 'KAÇKAR', clue: 'Doğu Karadeniz’in en yüksek dağı' },
				{ w: 'ALANYA', clue: 'Kızıl Kule’nin ilçesi' },
			],
		},
	],
	img: [
		{ id: 'ornek-im1', cat: 'cografya', diff: 1, type: 'img', q: 'Bu nedir?', img: 'kedi', mode: 'blur', a: ['Kedi', 'Köpek', 'Tavşan', 'Kuş'] },
		{ id: 'ornek-im2', cat: 'cografya', diff: 2, type: 'img', q: 'Siluetteki yapı hangisi?', img: 'galata', mode: 'silhouette', a: ['Galata Kulesi', 'Kız Kulesi', 'Saat Kulesi', 'Beyazıt Kulesi'] },
		{ id: 'ornek-im3', cat: 'eglence', diff: 2, type: 'img', q: 'Resimleri birleştir', img: ['kar', 'adam'], mode: 'rebus', w: 'KARADAM' },
	],
	blitz: [{ id: 'ornek-bz1', cat: 'cografya', diff: 1, type: 'blitz', q: 'Doğru mu yanlış mı?', items: BLITZ }],
};

/** Bankadan tip başına 4 örnek: zorluk 1, 2, 3 ve bir tane daha; sıralamada iki artan, iki azalan. */
function examples(type) {
	if (DENEME_SAMPLES[type]) return DENEME_SAMPLES[type];
	const list = BANK.filter((q) => q.type === type).sort((a, b) => a.id.localeCompare(b.id));
	if (!list.length && SAMPLES[type]) return SAMPLES[type]; // bankada sorusu olmayan tip (resimli): örnek soru
	const pick = (pred, n) => list.filter((q) => pred(q) && !out.includes(q)).slice(0, n);
	const out = [];
	if (type === 'order') {
		for (const d of [1, 3]) out.push(...pick((q) => q.dir !== 'desc' && q.diff === d, 1));
		for (const d of [2, 3]) out.push(...pick((q) => q.dir === 'desc' && q.diff === d, 1));
	} else for (const d of [1, 2, 3]) out.push(...pick((q) => q.diff === d, 1));
	out.push(...pick(() => true, 4 - out.length));
	return out;
}

const DIFF = ['', 'Kolay', 'Orta', 'Zor'];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const CSS = `
.gal{position:fixed;top:0;z-index:70;box-sizing:border-box;display:flex;flex-direction:column;gap:7px;
  padding:calc(10px + env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) 9px max(12px,env(safe-area-inset-left,0px));
  background:linear-gradient(180deg,#0e1a42,#0a1230);border-bottom:1px solid rgba(255,214,120,.25);color:#eef2fa;font-family:'Fredoka',system-ui,sans-serif;font-weight:600}
.gal{transform:translateY(-104%);transition:transform .24s cubic-bezier(.2,.8,.2,1);box-shadow:0 10px 30px rgba(0,0,0,.45)}
.gal.show{transform:none}
.gal-fab{position:fixed;z-index:69;top:calc(66px + env(safe-area-inset-top,0px));width:38px;height:38px;border-radius:12px;border:1.5px solid rgba(255,214,120,.5);
  background:rgba(14,26,66,.82);color:#ffd25a;font:800 18px/1 system-ui,sans-serif;display:grid;place-items:center;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.4);touch-action:manipulation}
.gal-fab:focus-visible{outline:2px solid #ffd25a;outline-offset:2px}
.gal-fab[hidden]{display:none}
.gal button{font:inherit;color:inherit;cursor:pointer;border:0;touch-action:manipulation}
.gal button:focus-visible,.gal-pn button:focus-visible{outline:2px solid #ffd25a;outline-offset:2px}
.gal .ey{font-family:'Manrope',system-ui,sans-serif;font-weight:800;font-size:10px;letter-spacing:.2em;color:#8fa2cf}
.gal .hd{display:flex;align-items:center;gap:8px;min-width:0}
/* tip düğmesi: dokununca bütün tipler açılır */
.gal .ty{flex:1;min-width:0;display:flex;align-items:center;gap:8px;padding:6px 10px 7px 12px;border-radius:13px;background:#16254d;border:1.5px solid rgba(255,210,90,.45);text-align:left}
.gal .ty b{flex:1;min-width:0;font-family:'Lilita One',system-ui,sans-serif;font-weight:400;font-size:20px;line-height:1.1;color:#ffd25a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gal .ty small{flex:none;font-family:'Manrope',system-ui,sans-serif;font-weight:800;font-size:11px;color:#9fb0d6;font-variant-numeric:tabular-nums}
.gal .ty i{flex:none;font-style:normal;font-size:12px;color:#ffd25a;transition:transform .2s}
.gal.open .ty i{transform:rotate(180deg)}
.gal .nv{display:flex;align-items:center;gap:4px;flex:none}
.gal .nv b{min-width:38px;text-align:center;font-family:'Manrope',system-ui,sans-serif;font-weight:800;font-size:13px;font-variant-numeric:tabular-nums;color:#eef2fa}
.gal .nv b small{display:block;font-size:9px;letter-spacing:.14em;color:#8fa2cf}
.gal .ar{width:36px;height:36px;border-radius:11px;background:#1d3266;border:1.5px solid rgba(255,255,255,.16);font-size:20px;line-height:1}
.gal .meta{font-family:'Manrope',system-ui,sans-serif;font-weight:700;font-size:12px;line-height:1.35;color:#9fb0d6}
.gal .meta b{color:#eef2fa}
.gal .meta .note{color:#ffb894}
.gal .ft{display:flex;gap:6px;flex-wrap:wrap}
.gal .tg{display:flex;align-items:center;gap:5px;padding:5px 10px 6px;border-radius:9px;background:#16254d;border:1px solid rgba(255,255,255,.14);font-size:12.5px;color:#cfd9f2}
.gal .tg em{font-style:normal;color:#ffd25a}
/* tip ızgarası: şeridin altında, oyunun üstünde */
.gal-pn{position:fixed;z-index:71;box-sizing:border-box;display:grid;grid-template-columns:repeat(2,1fr);gap:8px;max-height:70vh;overflow-y:auto;touch-action:pan-y;
  padding:12px max(12px,env(safe-area-inset-right,0px)) 14px max(12px,env(safe-area-inset-left,0px));background:#0a1230;border-bottom:1px solid rgba(255,214,120,.25);box-shadow:0 18px 30px rgba(0,0,0,.55)}
.gal-pn button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:9px 11px 10px;border-radius:12px;background:#16254d;border:1.5px solid rgba(255,255,255,.1);color:#eef2fa;font:inherit;font-family:'Fredoka',system-ui,sans-serif;font-weight:600;font-size:14.5px;text-align:left;cursor:pointer}
.gal-pn button small{font-family:'Manrope',system-ui,sans-serif;font-weight:700;font-size:11px;color:#8fa2cf}
.gal-pn button small em{font-style:normal;color:#ffb894}
.gal-pn button.on{background:#ffd25a;border-color:#ffd25a;color:#3a2200}
.gal-pn button.on small{color:rgba(58,34,0,.7)}
.gal-pn[hidden]{display:none}
/* YENİ · deneme tipleri */
.gal .meta .yeni,.gal-pn small .yeni{font-style:normal;color:#ffd25a}
.gal .ty .nw{flex:none;padding:1px 6px 2px;border-radius:6px;font-family:'Manrope',system-ui,sans-serif;font-weight:800;font-size:9.5px;letter-spacing:.1em;color:#3a2200;background:#ffd25a}
.gal-pn h4{grid-column:1/-1;margin:4px 2px -2px;font-family:'Manrope',system-ui,sans-serif;font-weight:800;font-size:10.5px;letter-spacing:.18em;color:#8fa2cf}
.gal-pn h4 b{color:#ffd25a}
.gal-pn button.nw{border-color:rgba(255,210,90,.55);background:linear-gradient(160deg,#243a72,#16254d)}
.gal-pn button.nw i{font-style:normal;font-family:'Manrope',system-ui,sans-serif;font-weight:700;font-size:11px;line-height:1.25;color:#cfd9f2}
.gal-pn button.nw.on i{color:rgba(58,34,0,.75)}
`;

export async function galeri() {
	const st = document.createElement('style');
	st.textContent = CSS;
	document.head.appendChild(st);
	const bar = document.createElement('div');
	bar.className = 'gal';
	document.body.appendChild(bar);
	const pn = document.createElement('div');
	pn.className = 'gal-pn';
	pn.hidden = true;
	pn.setAttribute('role', 'listbox');
	pn.setAttribute('aria-label', 'Soru tipleri');
	document.body.appendChild(pn);
	// galeri denetimleri gizli bir çekmecede: ekran telefondaki oyunun birebir aynısı; sol üstteki küçük düğme açar
	const fab = document.createElement('button');
	fab.className = 'gal-fab';
	fab.setAttribute('aria-label', 'Galeri: soru tipi ve örnek seç');
	fab.textContent = '☰';
	document.body.appendChild(fab);
	const drawer = (on) => {
		bar.classList.toggle('show', on);
		fab.hidden = on;
		if (!on) panel(false);
		fit();
	};
	fab.addEventListener('click', () => drawer(true));

	const game = await createFetih({ container: document.body });
	const app = game.app;
	bindApp(app); // deneme tipleri haritaya, kameraya ve arayüze buradan ulaşır
	const root = app.container;
	const ui = app.ui;
	window.__fl = game;
	game.open();
	ui.title(false);

	// yerleşim: şerit oyun sütununun üstünde, oyun alanı altında kalan yer (telefon ekranı gibi)
	const fit = () => {
		const H = innerHeight;
		const h = bar.offsetHeight;
		for (const e of [bar, pn]) {
			e.style.left = root.style.left || '0px';
			e.style.width = root.style.width || '100%';
		}
		pn.style.top = h + 'px';
		fab.style.left = `calc(${root.style.left || '0px'} + max(8px, env(safe-area-inset-left, 0px)))`;
		// oyun tam ekran: şerit yalnız açıkken üstte durur (oyunu itmez)
		root.style.top = '0px';
		root.style.setProperty('--vh', H / 100 + 'px');
		app.resize();
	};
	addEventListener('resize', fit);

	// maç: 1'e 1, İç Anadolu; başkentler ve yayılma hızlı kurulur, ilerleme kaydedilmez
	await app.debugScene({ show: 'none', cfg: { mode: '1v1', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 });
	const m = app.match;
	m.persist = false;
	const [me, foe] = m.players;
	const jk0 = JSON.stringify(me.jk);

	// ilk açılış: adresteki #tip, yoksa ilk deneme tipi
	const want = decodeURIComponent(location.hash.slice(1));
	const S = { type: LIST.some(([t]) => t === want) ? want : LIST[0][0], k: 0, scene: 'duel', time: 'real', run: 0 };
	const ex = Object.fromEntries(LIST.map(([t]) => [t, examples(t)]));
	const R = () => Math.random();

	const draw = () => {
		const list = ex[S.type];
		const q = list[S.k];
		const name = LIST.find(([t]) => t === S.type)[1];
		const cat = CATS[q.cat]?.name || q.cat;
		const T = ALLT[S.type];
		const v = T.prepare(q, R);
		const ti = LIST.findIndex(([t]) => t === S.type);
		const nw = isNew(S.type);
		bar.innerHTML = `<span class="ey">FETİH LİGİ · SORU GALERİSİ</span>
			<div class="hd"><button class="ty" id="g-type" aria-haspopup="listbox" aria-expanded="${!pn.hidden}">${nw ? '<span class="nw">YENİ</span>' : ''}<b>${esc(name)}</b><small>${ti + 1}/${LIST.length}</small><i>▼</i></button>
				<div class="nv"><button class="ar" id="g-prev" aria-label="Önceki örnek">‹</button><b>${S.k + 1}/${list.length}<small>ÖRNEK</small></b><button class="ar" id="g-next" aria-label="Sonraki örnek">›</button><button class="ar" id="g-close" aria-label="Kapat">✕</button></div></div>
			<div class="meta"><b>${esc(q.id)}</b> · ${esc(cat)} · ${DIFF[q.diff] || ''} · süre <b>${v.sec ?? T.time} sn</b>${
				nw ? ' · <em class="yeni">YENİ</em> <span class="note">maça henüz eklenmedi</span>' : SAMPLES[S.type] ? ' · <span class="note">bankada henüz soru yok, örnek soru</span>' : ''
			}</div>
			<div class="ft"><button class="tg" id="g-scene">Sahne: <em>${S.scene === 'duel' ? 'Düello' : 'Herkes cevaplıyor'}</em></button>
				<button class="tg" id="g-time">Süre: <em>${S.time === 'real' ? 'Gerçek' : 'Sınırsız'}</em></button>
				<button class="tg" id="g-again">↻ Yeniden</button>${document.fullscreenEnabled || document.documentElement.webkitRequestFullscreen ? '<button class="tg" id="g-full">⛶ Tam ekran</button>' : ''}</div>`;
		bar.classList.toggle('open', !pn.hidden);
		const item = ([t, n, nw2, sub]) =>
			`<button data-t="${t}" role="option" aria-selected="${t === S.type}" class="${t === S.type ? 'on' : ''}${nw2 ? ' nw' : ''}">${esc(n)}${nw2 ? `<i>${esc(sub)}</i>` : ''}<small>${
				nw2 ? `<em class="yeni">YENİ</em> · ${ex[t].length} soru` : SAMPLES[t] ? '<em>örnek soru</em>' : `${ex[t].length} soru`
			}</small></button>`;
		pn.innerHTML = `<h4>TÜM SORU TİPLERİ · ${LIST.length}</h4>${LIST.map(item).join('')}`;
		fit();
		return { q, v, T };
	};

	function panel(on) {
		if (on && !bar.classList.contains('show')) drawer(true);
		pn.hidden = !on;
		bar.classList.toggle('open', on);
		bar.querySelector('#g-type')?.setAttribute('aria-expanded', String(on));
		if (on) pn.querySelector('.on')?.focus({ preventScroll: true });
	}
	const go = (type, k = 0) => {
		S.type = type;
		S.k = (k + ex[type].length) % ex[type].length;
		drawer(false);
		play();
	};
	bar.addEventListener('click', (e) => {
		const b = e.target.closest('button');
		if (!b) return;
		if (b.id === 'g-type') return panel(pn.hidden);
		if (b.id === 'g-close') return drawer(false);
		if (b.id === 'g-full') {
			const d = document.documentElement;
			const on = document.fullscreenElement || document.webkitFullscreenElement;
			try {
				const r = on ? (document.exitFullscreen || document.webkitExitFullscreen).call(document) : (d.requestFullscreen || d.webkitRequestFullscreen).call(d);
				r?.catch?.(() => ui.toast?.('Bu görünüm tam ekrana izin vermiyor', { tone: 'warn', ms: 1800 }));
			} catch {
				ui.toast?.('Bu görünüm tam ekrana izin vermiyor', { tone: 'warn', ms: 1800 });
			}
			return drawer(false);
		}
		if (b.id === 'g-prev') return go(S.type, S.k - 1);
		if (b.id === 'g-next') return go(S.type, S.k + 1);
		if (b.id === 'g-scene') S.scene = S.scene === 'duel' ? 'all' : 'duel';
		else if (b.id === 'g-time') S.time = S.time === 'real' ? 'free' : 'real';
		else if (b.id !== 'g-again') return;
		drawer(false);
		play();
	});
	pn.addEventListener('click', (e) => {
		const b = e.target.closest('[data-t]');
		if (b) go(b.dataset.t);
	});
	// klavye: ← → örnek, ↑ ↓ tip, Esc tip listesini kapatır (yazma tiplerinde klavye oyunundur: yalnız şerit odaktayken)
	addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && bar.classList.contains('show')) return drawer(false);
		if (!bar.contains(document.activeElement) && !pn.contains(document.activeElement)) return;
		const ti = LIST.findIndex(([t]) => t === S.type);
		if (e.key === 'ArrowRight') go(S.type, S.k + 1);
		else if (e.key === 'ArrowLeft') go(S.type, S.k - 1);
		else if (e.key === 'ArrowDown') go(LIST[(ti + 1) % LIST.length][0]);
		else if (e.key === 'ArrowUp') go(LIST[(ti - 1 + LIST.length) % LIST.length][0]);
		else return;
		e.preventDefault();
		bar.querySelector('#g-type')?.focus({ preventScroll: true });
	});

	// galeri: sayfa açılırken (görünmezken) gelen otomatik duraklatma, sayfa görünür olunca kendiliğinden kalkar
	const wake = () => document.visibilityState === 'visible' && app.resume();
	document.addEventListener('visibilitychange', () => setTimeout(wake, 50));
	setTimeout(wake, 300);
	addEventListener('fullscreenchange', () => setTimeout(fit, 60));

	// cevap ekranı incelemek için daha uzun kalır (dokununca geçer)
	const hold = ui._hold.bind(ui);
	ui._hold = (ms) => hold(Math.max(ms, 9000));

	async function play() {
		const run = ++S.run;
		ui.reset();
		ui.title(false);
		app.cinema.tempo = 1;
		const { q, v, T } = draw();
		if (S.time === 'free') v.sec = 600;
		me.jk = JSON.parse(jk0);
		ui.hud(m);
		const live = () => run === S.run;
		const duel = S.scene === 'duel';
		let target = -1;
		if (duel) {
			target = m.attackable(me)[0] ?? m.owned(foe.i)[0];
			// gerçek akış: saldırı filminin son hali (ordular cephede), sonra soru
			app.cinema.tempo = 0.01;
			await app.cinema.attack(me, foe, target, false);
			app.cinema.tempo = 1;
			if (!live()) return;
		} else {
			app.board.night?.(false, null, { hold: 0 });
			app.cam.fit(app.boundsOf(m.map), { pitch: 0.98 });
		}
		const ctx = duel ? { title: 'DÜELLO', attacker: me, defender: foe, target, cat: q.cat, phase: 'duel' } : { title: 'Herkes cevaplıyor', phase: 'yayilma', cat: q.cat };
		const who = [me, foe];
		const clock = { extra: 0 };
		// joker bağlamı (Match.ask ile aynı biçim): jokerler soruda gerçekten çalışır
		m.cur = { q, v, T, who, clock, ctx, bots: [], used: new Map(who.map((p) => [p.i, new Set()])), second: new Set(), done: new Set(), boost: new Map(), delay: new Map(), timers: [], botUses: [], closed: false };
		const cur = m.cur;
		cur.bots = [{ p: foe, ...m.botAnswer(cur, foe) }];
		m.refreshJokers();
		const res = await ui.question(m, { q, v, T, who, bots: cur.bots, human: me, clock, botJokers: [], ...ctx });
		cur.closed = true;
		for (const t of cur.timers) clearTimeout(t);
		if (m.cur === cur) m.cur = null; // başka örneğe geçildiyse yeni soru kendi bağlamını kurmuştur
		if (!live() || !res?.human) return;
		const results = who.map((p) => {
			const a = p === me ? res.human : { value: cur.bots[0].value, time: cur.bots[0].time };
			return { p, i: p.i, name: p.name, color: p.css, value: a.value, time: a.time ?? v.sec, ...T.judge(v, a.value) };
		});
		await ui.reveal(m, { q, v, T, results, ...ctx });
	}

	play();
	requestAnimationFrame(fit);
	return game;
}
