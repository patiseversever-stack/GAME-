// Soru galerisi: bütün soru tiplerini oyunun kendisiyle (aynı kart, harita, VS girişi, sayaç, jokerler, cevap
// ekranı) birkaç örnek soruyla gösterir. Tasarım, grafik ve mantık incelemesi için.
//
// Üstte galeri şeridi (tip, örnek, sahne ve süre seçimi); altındaki alan telefondaki oyun ekranının aynısı. Her
// örnek gerçek akışla oynar: düello sahnesinde önce saldırı filminin son hali (ordular cephede, gece odağı),
// sonra VS girişi ve soru kartı; cevaplayınca bot da cevaplar ve cevap ekranı açılır.

import { createFetih } from './index.js';
import { TYPES } from './quiz/types.js';
import { CATS } from './quiz/categories.js';
import { BANK } from './data/bank.js';

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
	if (SAMPLES[type]) return SAMPLES[type];
	const list = BANK.filter((q) => q.type === type).sort((a, b) => a.id.localeCompare(b.id));
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
.gal{position:fixed;top:0;z-index:70;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;
  padding:calc(8px + env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) 8px max(12px,env(safe-area-inset-left,0px));
  background:#0a1230;border-bottom:1px solid rgba(255,214,120,.22);color:#eef2fa;font-family:'Fredoka',system-ui,sans-serif;font-weight:600}
.gal .hd{display:flex;align-items:center;gap:10px;min-width:0}
.gal .hd h1{flex:1;min-width:0;margin:0;font-family:'Lilita One',system-ui,sans-serif;font-weight:400;font-size:21px;line-height:1.1;color:#ffd25a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gal .hd h1 small{margin-left:8px;font-family:'Manrope',system-ui,sans-serif;font-weight:800;font-size:11px;letter-spacing:.14em;color:#9fb0d6;vertical-align:3px}
.gal .nv{display:flex;align-items:center;gap:6px;flex:none}
.gal .nv b{min-width:42px;text-align:center;font-family:'Manrope',system-ui,sans-serif;font-weight:800;font-size:13px;font-variant-numeric:tabular-nums;color:#cfd9f2}
.gal button{font:inherit;color:inherit;cursor:pointer;border:0;touch-action:manipulation}
.gal .ar{width:34px;height:34px;border-radius:11px;background:#1d3266;border:1.5px solid rgba(255,255,255,.18);font-size:20px;line-height:1}
.gal .ar:focus-visible,.gal .ch:focus-visible,.gal .tg:focus-visible{outline:2px solid #ffd25a;outline-offset:2px}
.gal .chips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -12px;padding:0 12px}
.gal .chips::-webkit-scrollbar{display:none}
.gal .ch{flex:none;padding:6px 11px 7px;border-radius:999px;background:#16254d;border:1.5px solid rgba(255,255,255,.12);font-size:13.5px;color:#cfd9f2;white-space:nowrap}
.gal .ch.on{background:#ffd25a;border-color:#ffd25a;color:#3a2200}
.gal .ch i{font-style:normal;margin-left:5px;padding:0 5px;border-radius:6px;font-size:10.5px;background:rgba(255,255,255,.14)}
.gal .ch.on i{background:rgba(58,34,0,.15)}
.gal .ft{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-family:'Manrope',system-ui,sans-serif;font-weight:700;font-size:11.5px;color:#9fb0d6;letter-spacing:.02em}
.gal .ft .meta{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gal .ft .meta b{color:#eef2fa}
.gal .tg{padding:4px 9px;border-radius:8px;background:#16254d;border:1px solid rgba(255,255,255,.14);font-size:11.5px;color:#cfd9f2}
.gal .tg em{font-style:normal;color:#ffd25a}
.gal .note{color:#ffb894}
`;

export async function galeri() {
	const st = document.createElement('style');
	st.textContent = CSS;
	document.head.appendChild(st);
	const bar = document.createElement('div');
	bar.className = 'gal';
	document.body.appendChild(bar);

	const game = await createFetih({ container: document.body });
	const app = game.app;
	const root = app.container;
	const ui = app.ui;
	window.__fl = game;
	game.open();
	ui.title(false);

	// yerleşim: şerit oyun sütununun üstünde, oyun alanı altında kalan yer (telefon ekranı gibi)
	const fit = () => {
		const H = innerHeight;
		const h = bar.offsetHeight;
		bar.style.left = root.style.left || '0px';
		bar.style.width = root.style.width || '100%';
		root.style.top = h + 'px';
		root.style.setProperty('--vh', (H - h) / 100 + 'px');
		app.resize();
	};
	addEventListener('resize', fit);

	// maç: 1'e 1, İç Anadolu; başkentler ve yayılma hızlı kurulur, ilerleme kaydedilmez
	await app.debugScene({ show: 'none', cfg: { mode: '1v1', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 });
	const m = app.match;
	m.persist = false;
	const [me, foe] = m.players;
	const jk0 = JSON.stringify(me.jk);

	const S = { type: 'choice', k: 0, scene: 'duel', time: 'real', run: 0 };
	const ex = Object.fromEntries(ORDER.map(([t]) => [t, examples(t)]));
	const R = () => Math.random();

	const draw = () => {
		const list = ex[S.type];
		const q = list[S.k];
		const name = ORDER.find(([t]) => t === S.type)[1];
		const cat = CATS[q.cat]?.name || q.cat;
		const T = TYPES[S.type];
		const v = T.prepare(q, R);
		bar.innerHTML = `<div class="hd"><h1>${esc(name)}<small>SORU GALERİSİ</small></h1>
			<div class="nv"><button class="ar" id="g-prev" aria-label="Önceki örnek">‹</button><b>${S.k + 1} / ${list.length}</b><button class="ar" id="g-next" aria-label="Sonraki örnek">›</button></div></div>
			<div class="chips" role="tablist">${ORDER.map(
				([t, n]) => `<button class="ch ${t === S.type ? 'on' : ''}" data-t="${t}" role="tab" aria-selected="${t === S.type}">${esc(n)}${SAMPLES[t] ? '<i>örnek</i>' : ''}</button>`,
			).join('')}</div>
			<div class="ft"><span class="meta"><b>${esc(q.id)}</b> · ${esc(cat)} · ${DIFF[q.diff] || ''} · süre <b>${v.sec ?? T.time} sn</b>${SAMPLES[S.type] ? ' · <span class="note">bankada henüz soru yok</span>' : ''}</span>
				<button class="tg" id="g-scene">Sahne: <em>${S.scene === 'duel' ? 'Düello' : 'Herkes cevaplıyor'}</em></button>
				<button class="tg" id="g-time">Süre: <em>${S.time === 'real' ? 'Gerçek' : 'Sınırsız'}</em></button>
				<button class="tg" id="g-again">Yeniden</button></div>`;
		bar.querySelector('.ch.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
		fit();
		return { q, v, T };
	};

	bar.addEventListener('click', (e) => {
		const b = e.target.closest('button');
		if (!b) return;
		if (b.dataset.t) {
			S.type = b.dataset.t;
			S.k = 0;
		} else if (b.id === 'g-prev') S.k = (S.k - 1 + ex[S.type].length) % ex[S.type].length;
		else if (b.id === 'g-next') S.k = (S.k + 1) % ex[S.type].length;
		else if (b.id === 'g-scene') S.scene = S.scene === 'duel' ? 'all' : 'duel';
		else if (b.id === 'g-time') S.time = S.time === 'real' ? 'free' : 'real';
		else if (b.id !== 'g-again') return;
		play();
	});

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
		m.cur = { q, v, T, who, clock, ctx, bots: [], used: new Map(who.map((p) => [p.i, new Set()])), second: new Set(), boost: new Map(), delay: new Map(), timers: [], botUses: [], closed: false };
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
