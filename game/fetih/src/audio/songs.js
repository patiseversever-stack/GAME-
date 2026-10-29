// Parçalar (müzik temaları): makam dizileri üzerinde elle yazılmış motifler, usul kalıpları ve düzenleme.
// Bu dosya saf veridir ve besteleyici işlevdir (Web Audio yok, düğümde de çalışır): compose(tema) → olay listesi.
// Olayları bake.js çevrimdışı bağlamda çalar ve kusursuz döngüye pişirir; çalarken tek AudioBufferSource yeter.
//
// Zaman ızgarası: adım = 16'lık nota (60 / bpm / 4 sn). Bir ölçü `bar` adım (4/4 = 16, aksak 9/8 = 18).
// Melodi dizgesi: "4/2 3/2 2/4 | ..." derece/uzunluk(adım); r = es; ölçüler | ile ayrılır, her ölçü tam `bar` adım olmalı.
//   derece: 0..6 makam dizisi, 7 üst oktav, negatif alt oktav. Ekler: ! vurgu, ~ süs (kısa üst vuruş), . kısa (staccato)
// Vurmalı kalıpları: her karakter bir adım. Davul: D düm, B büyük düm, T tek, t hafif tek, K kös, k hafif kös, S tel davul,
//   s hafif tel, r kenar, Z zil, z hafif zil, c çevgen, F def, f hafif def.   Darbuka: d doum, t tek, k ka.
//
// Çalgı grupları (yankı hattı): vurmalı = perc, teller = string, nefesliler = wind, pad/koro/bordo = pad.
//
// Temalar (Sfx.music(ad)):
//   menu      ana menü: yavaş, görkemli Hicaz; ney, kös, yaylı, kanun
//   campaign  sefer haritası: aksak 9/8 zeybek yürüyüşü, Nihavend; bağlama solosu
//   match     sakin harita turu: Uşşak, sıcak ve akıcı; seyrek ney, def
//   duel      düello gerilimi: Kürdi, sürükleyen bağlama ve davul, zurna; "hot" katmanı süre azalınca girer
//   siege     kale kuşatması: Hicaz, kös ve boru, koro; "hot" katmanı
//   victory   zafer: Rast, mehter yürüyüşü
//   defeat    yenilgi: Uşşak, ağır, ney ağıdı
// match, duel ve siege aynı tempo ve uzunlukta (sync: 'war'): geçişte ölçü hizası korunur, müzik "yükselir".
import { rng } from './dsp.js';
import { degHz, ROOT } from './scales.js';

const hash = (s) => {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
	return h >>> 0;
};

// ---------------------------------------------------------------- vuruş haritaları
const DRUM = {
	D: { n: 'dum', v: 1, r: 1, p: 0 },
	B: { n: 'dumBig', v: 1, r: 1, p: 0 },
	T: { n: 'tek', v: 0.8, r: 1, p: 0.1 },
	t: { n: 'tek', v: 0.34, r: 1.15, p: -0.1 },
	K: { n: 'kos', v: 1, r: 1, p: 0 },
	k: { n: 'kos', v: 0.5, r: 1.08, p: 0 },
	S: { n: 'snare', v: 0.75, r: 1, p: 0.05 },
	s: { n: 'snare', v: 0.3, r: 1.1, p: -0.1 },
	r: { n: 'rim', v: 0.5, r: 1, p: 0.2 },
	Z: { n: 'zil', v: 1, r: 1, p: 0 },
	z: { n: 'zil', v: 0.4, r: 1.25, p: 0.15 },
	c: { n: 'shake', v: 0.7, r: 1, p: 0.3 },
	F: { n: 'def', v: 1, r: 1, p: -0.1 },
	f: { n: 'def', v: 0.4, r: 1.2, p: 0.1 },
};
const DARB = {
	d: { n: 'dbDoum', v: 1, r: 1, p: -0.25 },
	t: { n: 'dbTek', v: 0.8, r: 1, p: 0.25 },
	k: { n: 'dbKa', v: 0.55, r: 1, p: 0.2 },
};
// vuruş örneklerinin kuyruk süresi (sn): döngü sarmasında önceden çalınacak olayları seçmek için
const HIT_TAIL = { kos: 1.7, zil: 1.9, dumBig: 1.8, dum: 1, def: 0.6, snare: 0.3, dbDoum: 0.6 };

// ---------------------------------------------------------------- melodi ayrıştırıcı
export function parseScore(src, bs) {
	return src.split('|').map((bar, bi) => {
		let t = 0;
		const notes = [];
		for (const tok of bar.trim().split(/\s+/)) {
			if (!tok) continue;
			const m = /^(r|-?\d+)(?:\/(\d+))?([!~.]*)$/.exec(tok);
			if (!m) throw new Error(`parça: geçersiz nota "${tok}"`);
			const len = m[2] ? +m[2] : 1;
			if (m[1] !== 'r') notes.push({ s: t, d: +m[1], n: len, m: m[3] });
			t += len;
		}
		if (t !== bs) throw new Error(`parça: ölçü ${bi + 1} ${t} adım (olması gereken ${bs})`);
		return notes;
	});
}

// ---------------------------------------------------------------- temalar
const WAR_STEP = { makam: 'kurdi', root: ROOT, bpm: 96, bar: 16, bars: 8, sync: 'war' };

export const THEMES = {
	// ------------------------------------------------ ana menü: "Fetih Yolu"
	menu: {
		name: 'menu',
		makam: 'hicaz',
		root: ROOT,
		bpm: 84,
		bar: 16,
		bars: 8,
		level: -19,
		parts: [
			{ t: 'drone', m: [0.5, 0.75], vol: 0.12 },
			{ t: 'pad', ins: 'strings', chords: [[0, 4, 7], [0, 4, 7], [3, 7, 10], [0, 4, 7]], span: 2, oct: -1, vol: 0.17, att: 1.0, rel: 1.2, pan: -0.15 },
			{ t: 'pad', ins: 'choir', chords: [[3, 7], [0, 4]], span: 2, oct: -1, vol: 0.13, att: 1.2, rel: 1.3, on: '....x.x.', vowel: 'o' },
			{ t: 'drums', pat: ['K...............', 'K.......k.......'], vol: 0.85 },
			{ t: 'drums', pat: 'D...T.t.D...T...', vol: 0.42, on: '..xxxxxx', fill: { bars: [7], from: 12 } },
			{ t: 'darb', pat: 'd.k.t.k.d.k.t.kt', vol: 0.2, on: '....xxxx' },
			{ t: 'crash', bars: [0, 4], n: 'zil', vol: 0.3 },
			{ t: 'riff', ins: 'baglama', pat: [0, null, 4, null, 7, null, 4, null, 0, null, 4, null, 7, null, 6, null], prog: [0, 0, 0, 0, 3, 3, 0, 0], oct: -1, vol: 0.4, pan: -0.3 },
			{
				t: 'lead',
				ins: 'ney',
				score:
					'r/2 4/2 4/4 5/2 4/2 3/4 | 2/4 3/2 2/2 1/4 2/2 3/2 | 4/6 3/2 2/4 1/2 0/2 | 0/10 r/6 | 4/2 7/6 6/2 5/2 4/4 | 5/2 4/2 3/4 2/2 3/2 4/4 | 5/6 4/2 3/2 2/2 1/4 | 2/2 1/2 0/12',
				oct: 0,
				vol: 0.5,
				pan: -0.12,
				on: 'xxxxxxxx',
			},
			{
				t: 'lead',
				ins: 'zurna',
				score:
					'r/2 4/2 4/4 5/2 4/2 3/4 | 2/4 3/2 2/2 1/4 2/2 3/2 | 4/6 3/2 2/4 1/2 0/2 | 0/10 r/6 | 4/2 7/6~ 6/2 5/2 4/4 | 5/2 4/2 3/4 2/2 3/2 4/4 | 5/6 4/2 3/2 2/2 1/4 | 2/2 1/2 0/12',
				oct: 0,
				vol: 0.36,
				pan: 0.15,
				on: '....xxxx',
			},
			{ t: 'notes', ins: 'kanun', oct: 0, pan: 0.3, vol: 0.3, list: [[0, 0, 4, 1], [0, 1, 7, 1], [0, 2, 9, 1], [0, 3, 11, 1], [4, 0, 7, 1], [4, 1, 9, 1], [4, 2, 11, 1], [4, 3, 14, 1]] },
		],
	},

	// ------------------------------------------------ sefer haritası: aksak 9/8 (2+2+2+3) zeybek yürüyüşü
	campaign: {
		name: 'campaign',
		makam: 'nihavend',
		root: ROOT,
		bpm: 100,
		bar: 18,
		bars: 8,
		level: -19,
		parts: [
			{ t: 'drone', m: [0.5, 0.75], vol: 0.11 },
			{ t: 'pad', ins: 'strings', chords: [[0, 4, 7], [3, 7, 10]], span: 2, oct: -1, vol: 0.14, att: 0.8, rel: 1.0, pan: 0.15, on: 'xxxxxxxx' },
			{ t: 'drums', pat: ['K.................', 'K.................'], vol: 0.6 },
			{ t: 'drums', pat: 'D...T...D...T.t.t.', vol: 0.5, fill: { bars: [3, 7], from: 12 } },
			{ t: 'darb', pat: 'd.k.t.k.d.k.t.k.t.', vol: 0.22, on: '..xxxxxx' },
			{ t: 'drums', pat: 'c.c.c.c.c.c.c.c.c.', vol: 0.1, on: '....xxxx' },
			{ t: 'crash', bars: [0, 4], n: 'zil', vol: 0.28 },
			{ t: 'riff', ins: 'baglama', pat: [0, null, 4, null, 0, null, 4, null, 0, null, 4, null, 0, null, 3, null, 2, null], prog: [0, 0, 0, 0, 3, 3, 0, 0], accent: [0, 4, 8, 12], oct: -1, vol: 0.4, pan: -0.3 },
			{
				t: 'lead',
				ins: 'baglama',
				score:
					'4/4 5/4 4/4 3/2 2/4 | 3/4 2/4 1/4 0/6 | 4/4 5/4 7/4 6/2 5/4 | 4/4 3/4 2/4 1/2 0/4 | 7/6 6/2 5/2 4/4 5/4 | 7/4 8/4 7/4 6/2 5/4 | 4/4 5/4 6/4 7/6 | 7/4 6/2 5/2 4/4 0/6',
				oct: 0,
				vol: 0.6,
				pan: 0.1,
				trem: true,
				on: 'xxxxxxxx',
			},
			{
				t: 'lead',
				ins: 'zurna',
				score:
					'4/4 5/4 4/4 3/2 2/4 | 3/4 2/4 1/4 0/6 | 4/4 5/4 7/4 6/2 5/4 | 4/4 3/4 2/4 1/2 0/4 | 7/6 6/2 5/2 4/4 5/4 | 7/4 8/4 7/4 6/2 5/4 | 4/4 5/4 6/4 7/6~ | 7/4 6/2 5/2 4/4 0/6',
				oct: 0,
				vol: 0.34,
				pan: 0.2,
				on: '....xxxx',
			},
			{ t: 'notes', ins: 'kanun', oct: 1, pan: 0.3, vol: 0.26, list: [[0, 0, 0, 1], [0, 1, 4, 1], [0, 2, 7, 1], [4, 0, 4, 1], [4, 1, 7, 1], [4, 2, 9, 1]] },
		],
	},

	// ------------------------------------------------ maç: sakin harita turu (Uşşak)
	match: {
		...WAR_STEP,
		name: 'match',
		makam: 'ussak',
		level: -22,
		parts: [
			{ t: 'drone', m: [0.5, 0.75], vol: 0.1 },
			{ t: 'pad', ins: 'strings', chords: [[0, 4, 7], [0, 2, 4], [3, 7, 10], [0, 4, 7]], span: 2, oct: -1, vol: 0.14, att: 1.2, rel: 1.3, pan: 0.1 },
			{ t: 'drums', pat: ['F.......f.......', 'F.....f.f.......'], vol: 0.35, on: 'xxxxxxxx' },
			{ t: 'darb', pat: '..k...k...k...kt', vol: 0.14, on: '....xxxx' },
			{ t: 'riff', ins: 'baglama', pat: [0, null, 4, null, 0, null, 4, null, 1, null, 4, null, 0, null, 4, null], prog: [0, 0, 0, 0, 3, 3, 0, 0], oct: -1, vol: 0.33, pan: -0.3 },
			{ t: 'riff', ins: 'tambur', pat: [0, null, null, null, null, null, null, null, 0, null, null, null, null, null, null, null], prog: [0], oct: -2, vol: 0.4 },
			{
				t: 'lead',
				ins: 'ney',
				score:
					'r/4 4/4 3/2 2/2 1/4 | 0/12 r/4 | r/4 2/2 3/2 4/4 3/2 2/2 | 1/6 0/2 1/2 2/2 1/4 | 4/4 5/2 6/2 7/8 | 6/4 5/2 4/2 3/4 2/4 | 3/2 2/2 1/4 2/2 1/2 0/4 | 0/12 r/4',
				oct: 0,
				vol: 0.46,
				pan: -0.1,
			},
			{ t: 'notes', ins: 'kanun', oct: 0, pan: 0.3, vol: 0.24, list: [[2, 8, 7, 1], [2, 10, 9, 1], [6, 8, 7, 1], [6, 10, 11, 1], [6, 12, 9, 1]] },
		],
	},

	// ------------------------------------------------ düello: gerilim (Kürdi); hot = sürat
	duel: {
		...WAR_STEP,
		name: 'duel',
		level: -17,
		stems: 2,
		parts: [
			{ t: 'drone', m: [0.5, 0.75], vol: 0.14 },
			{ t: 'pad', ins: 'strings', chords: [[0, 4], [0, 4], [3, 7], [0, 4]], span: 2, oct: -1, vol: 0.14, att: 0.6, rel: 0.9, pan: 0.1 },
			{ t: 'drums', pat: ['K...K...K...K.K.', 'K...K...K...K...'], vol: 0.8 },
			{ t: 'drums', pat: 'D.t.T.t.D.D.T.tT', vol: 0.5, fill: { bars: [3, 7], from: 12 } },
			{ t: 'darb', pat: 'd.k.tdk.d.k.tdkt', vol: 0.24, on: '.xxxxxxx' },
			{ t: 'crash', bars: [0, 4], n: 'zil', vol: 0.34 },
			{ t: 'riff', ins: 'baglama', pat: [0, 0, 4, 0, 0, 0, 4, 0, 1, 1, 4, 1, 0, 0, 4, 0], prog: [0, 0, 0, 0, 0, 0, 3, 0], accent: 4, oct: -1, vol: 0.46, pan: -0.3 },
			{ t: 'riff', ins: 'tambur', pat: [0, null, 0, null, 0, null, 0, null, 0, null, 0, null, 0, null, 0, null], prog: [0], oct: -2, vol: 0.42 },
			{
				t: 'lead',
				ins: 'zurna',
				score:
					'0/3 0/1 1/2 0/2 4/4 3/2 2/2 | 1/3 1/1 2/2 1/2 4/4 3/2 1/2 | 0/3 0/1 1/2 0/2 4/4 3/2 2/2 | 4/2 3/2 2/2 1/2 0/8 | 4/3 4/1 5/2 4/2 7/4 6/2 5/2 | 5/3 5/1 6/2 5/2 7/4 6/2 4/2 | 7/2 6/2 5/2 4/2 3/2 2/2 1/2 0/2 | 0/6 r/2 0/2 0/2 0/2 0/2',
				oct: 0,
				vol: 0.4,
				pan: 0.15,
			},
			{ t: 'riser', bars: [3, 7], steps: 8, vol: 0.18 },
			// hot katman
			{ s: 1, t: 'pad', ins: 'horn', chords: [[0], [0], [3], [0]], span: 2, oct: -1, vol: 0.3 },
			{ s: 1, t: 'pad', ins: 'choir', chords: [[0, 4, 7]], span: 4, oct: -1, vol: 0.14, att: 0.7, rel: 0.9, vowel: 'a' },
			{ s: 1, t: 'darb', pat: 'dtktdtktdtktdtkt', vol: 0.26 },
			{ s: 1, t: 'drums', pat: 's.s.s.s.s.s.s.s.', vol: 0.3 },
			{
				s: 1,
				t: 'lead',
				ins: 'zurna',
				score:
					'r/16 | r/16 | r/16 | r/16 | 4/3 4/1 5/2 4/2 7/4 6/2 5/2 | 5/3 5/1 6/2 5/2 7/4 6/2 4/2 | 7/2 6/2 5/2 4/2 3/2 2/2 1/2 0/2 | 0/6 r/2 0/2 0/2 0/2 0/2',
				oct: 1,
				vol: 0.24,
				pan: -0.1,
				bright: true,
			},
		],
	},

	// ------------------------------------------------ kale kuşatması: ağır, kös ve boru (Hicaz); hot = sürat
	siege: {
		...WAR_STEP,
		name: 'siege',
		makam: 'hicaz',
		level: -16,
		stems: 2,
		parts: [
			{ t: 'drone', m: [0.5, 0.75], vol: 0.16 },
			{ t: 'pad', ins: 'strings', chords: [[0, 4], [0, 4], [1, 4], [0, 4]], span: 2, oct: -1, vol: 0.15, att: 0.5, rel: 0.8, pan: 0.1 },
			{ t: 'drums', pat: ['K...K...K...K...', 'K...K...K...K.k.'], vol: 0.95 },
			{ t: 'drums', pat: 'D.D.T.t.D.D.T.tT', vol: 0.5, fill: { bars: [3, 7], from: 12 } },
			{ t: 'darb', pat: 'd.ktd.ktd.ktdkt.', vol: 0.24, on: '.xxxxxxx' },
			{ t: 'crash', bars: [0, 2, 4, 6], n: 'zil', vol: 0.34 },
			{ t: 'riff', ins: 'baglama', pat: [0, 0, 4, 0, 0, 0, 4, 0, 1, 1, 4, 1, 0, 0, 4, 0], prog: [0, 0, 0, 0, 0, 0, 3, 0], accent: 4, oct: -1, vol: 0.46, pan: -0.3 },
			{ t: 'riff', ins: 'tambur', pat: [0, null, 0, null, 0, null, 0, null, 0, null, 0, null, 0, null, 0, null], prog: [0], oct: -2, vol: 0.46 },
			{ t: 'pad', ins: 'horn', chords: [[0], [0], [0], [3]], span: 2, oct: -1, vol: 0.26 },
			{
				t: 'lead',
				ins: 'zurna',
				score:
					'0/3 0/1 1/2 0/2 4/4 3/2 2/2 | 1/3 1/1 2/2 1/2 4/4 3/2 1/2 | 0/3 0/1 1/2 0/2 4/4 3/2 2/2 | 4/2 3/2 2/2 1/2 0/8 | 4/3 4/1 5/2 4/2 7/4 6/2 5/2 | 5/3 5/1 6/2 5/2 7/4 6/2 4/2 | 7/2 6/2 5/2 4/2 3/2 2/2 1/2 0/2 | 0/6 r/2 0/2 0/2 0/2 0/2',
				oct: 0,
				vol: 0.4,
				pan: 0.15,
			},
			{ t: 'riser', bars: [1, 3, 5, 7], steps: 8, vol: 0.2 },
			// hot katman
			{ s: 1, t: 'pad', ins: 'choir', chords: [[0, 4, 7]], span: 2, oct: -1, vol: 0.17, att: 0.5, rel: 0.8, vowel: 'a' },
			{ s: 1, t: 'darb', pat: 'dtktdtktdtktdtkt', vol: 0.28 },
			{ s: 1, t: 'drums', pat: 'S.s.S.s.S.s.S.sS', vol: 0.34 },
			{
				s: 1,
				t: 'lead',
				ins: 'zurna',
				score:
					'r/16 | r/16 | r/16 | r/16 | 4/3 4/1 5/2 4/2 7/4 6/2 5/2 | 5/3 5/1 6/2 5/2 7/4 6/2 4/2 | 7/2 6/2 5/2 4/2 3/2 2/2 1/2 0/2 | 0/6 r/2 0/2 0/2 0/2 0/2',
				oct: 1,
				vol: 0.26,
				pan: -0.1,
				bright: true,
			},
		],
	},

	// ------------------------------------------------ zafer: mehter yürüyüşü (Rast)
	victory: {
		name: 'victory',
		makam: 'rast',
		root: ROOT,
		bpm: 112,
		bar: 16,
		bars: 8,
		level: -17,
		parts: [
			{ t: 'drone', m: [0.5, 0.75], vol: 0.1 },
			{ t: 'pad', ins: 'strings', chords: [[0, 4, 7], [0, 4, 7], [3, 7, 10], [0, 4, 7]], span: 2, oct: -1, vol: 0.16, att: 0.5, rel: 0.8, pan: -0.1 },
			{ t: 'pad', ins: 'choir', chords: [[0, 4, 7]], span: 4, oct: -1, vol: 0.14, att: 0.6, rel: 0.9, vowel: 'a', on: '....x...' },
			{ t: 'drums', pat: ['K.......K.......', 'K.......K.....k.'], vol: 0.8 },
			{ t: 'drums', pat: 'D.t.T.t.D.t.T.tT', vol: 0.5, fill: { bars: [3, 7], from: 12 } },
			{ t: 'darb', pat: 'd.ktd.ktd.ktd.kt', vol: 0.24 },
			{ t: 'drums', pat: 'F.f.F.f.F.f.F.f.', vol: 0.24 },
			{ t: 'drums', pat: 'c.c.c.c.c.c.c.c.', vol: 0.1 },
			{ t: 'crash', bars: [0, 2, 4, 6], n: 'zil', vol: 0.3 },
			{ t: 'riff', ins: 'baglama', pat: [0, null, 4, null, 7, null, 4, null, 0, null, 4, null, 7, null, 4, null], prog: [0, 0, 0, 0, 3, 3, 0, 0], oct: -1, vol: 0.44, pan: -0.3 },
			{
				t: 'lead',
				ins: 'zurna',
				score: '0/4 2/4 4/4 7/4 | 6/6 5/2 4/4 5/4 | 7/4 6/4 5/4 4/4 | 3/6 2/2 1/4 0/4 | 4/2 4/2 7/4 9/4 7/4 | 8/4 7/4 6/4 7/4 | 4/4 5/4 6/4 7/4 | 7/12 r/4',
				oct: 0,
				vol: 0.4,
				pan: 0.12,
				on: 'xxxx....',
			},
			{
				t: 'lead',
				ins: 'zurna',
				score: '0/4 2/4 4/4 7/4 | 6/6 5/2 4/4 5/4 | 7/4 6/4 5/4 4/4 | 3/6 2/2 1/4 0/4 | 4/2 4/2 7/4 9/4 7/4 | 8/4 7/4 6/4 7/4 | 4/4 5/4 6/4 7/4 | 7/12 r/4',
				oct: 1,
				vol: 0.3,
				pan: 0.12,
				bright: true,
				on: '....xxxx',
			},
			{ t: 'pad', ins: 'horn', chords: [[0, 4]], span: 4, oct: -1, vol: 0.22, on: 'x...x...' },
			{ t: 'notes', ins: 'kanun', oct: 0, pan: 0.3, vol: 0.3, list: [[3, 12, 0, 1], [3, 13, 2, 1], [3, 14, 4, 1], [3, 15, 7, 1], [7, 12, 4, 1], [7, 13, 7, 1], [7, 14, 9, 1], [7, 15, 11, 1]] },
		],
	},

	// ------------------------------------------------ yenilgi: ağır, ney ağıdı (Uşşak)
	defeat: {
		name: 'defeat',
		makam: 'ussak',
		root: ROOT,
		bpm: 60,
		bar: 16,
		bars: 6,
		level: -21,
		parts: [
			{ t: 'drone', m: [0.5, 0.75], vol: 0.12, cut: 380 },
			{ t: 'pad', ins: 'strings', chords: [[0, 2, 4], [0, 2, 4], [0, 2, 4]], span: 2, oct: -1, vol: 0.18, att: 1.4, rel: 1.5, pan: 0.1 },
			{ t: 'drums', pat: ['K...............', 'K.......k.......'], vol: 0.5 },
			{ t: 'riff', ins: 'baglama', pat: [0, null, null, null, 4, null, null, null, 2, null, null, null, 4, null, null, null], prog: [0], oct: -1, vol: 0.3, pan: -0.25 },
			{
				t: 'lead',
				ins: 'ney',
				score: '4/8 3/4 2/4 | 1/8 0/6 r/2 | r/2 0/2 1/4 2/4 1/4 | 0/16 | 4/6 3/2 2/4 1/4 | 1/4 0/12',
				oct: 0,
				vol: 0.5,
				pan: -0.08,
			},
			{ t: 'notes', ins: 'kanun', oct: 0, pan: 0.3, vol: 0.2, list: [[1, 8, 7, 1], [4, 4, 9, 1], [4, 8, 7, 1]] },
		],
	},
};

export const THEME_NAMES = Object.keys(THEMES);

// ---------------------------------------------------------------- besteleyici
/**
 * Tema → olay listesi. Her olay: {t (sn), k (tür), s (katman), tl (kuyruk sn)} + türe özgü alanlar.
 * Aynı girdi her seferinde aynı çıktıyı verir (tohum: tema adı).
 */
export function compose(theme) {
	const T = typeof theme === 'string' ? THEMES[theme] : theme;
	if (!T) throw new Error('parça: bilinmeyen tema ' + theme);
	const bs = T.bar || 16;
	const nb = T.bars;
	const sd = 60 / T.bpm / 4;
	const L = nb * bs * sd;
	const R = rng(hash(T.name));
	const ev = [];
	const hz = (d, oct = 0) => degHz(T.makam, d + 7 * oct, T.root);
	const on = (p, b) => !p.on || p.on[b % p.on.length] === 'x';
	const jit = (a) => (R() - 0.5) * 2 * a;
	const at = (b, s) => (b * bs + s) * sd;

	const evStart = [];
	for (let pi = 0; pi < T.parts.length; pi++) {
		const p = T.parts[pi];
		const s = p.s || 0;
		evStart.push(ev.length);
		switch (p.t) {
			case 'drone':
				ev.push({ t: 0, k: 'drone', fs: p.m.map((m) => T.root * m), v: p.vol, o: { cut: p.cut }, d: L, tl: 0, s });
				break;
			case 'pad': {
				const span = p.span || 2;
				for (let b = 0; b < nb; b += span) {
					if (!on(p, b)) continue;
					const ch = p.chords[Math.floor(b / span) % p.chords.length];
					const rel = p.rel === undefined ? 0.9 : p.rel;
					const d = Math.min(span, nb - b) * bs * sd - rel * 0.5;
					const fs = ch.map((x) => hz(x, p.oct || 0));
					if (p.ins === 'horn') fs.forEach((f) => ev.push({ t: at(b, 0), k: 'horn', f, d, v: p.vol / Math.sqrt(fs.length), p: p.pan || 0, tl: 0.4, s }));
					else ev.push({ t: at(b, 0), k: p.ins, fs, d, v: p.vol, p: p.pan || 0, o: { att: p.att, rel, vowel: p.vowel }, tl: rel, s });
				}
				break;
			}
			case 'drums':
			case 'darb': {
				const map = p.t === 'darb' ? DARB : DRUM;
				for (let b = 0; b < nb; b++) {
					if (!on(p, b)) continue;
					const pat = Array.isArray(p.pat) ? p.pat[b % p.pat.length] : p.pat;
					const fill = p.fill && p.fill.bars.indexOf(b) >= 0;
					for (let i = 0; i < bs; i++) {
						const ch = pat[i];
						if (fill && i >= p.fill.from) continue;
						if (!ch || ch === '.') continue;
						const m = map[ch];
						if (!m) throw new Error(`parça: bilinmeyen vuruş "${ch}" (${T.name})`);
						ev.push({ t: Math.max(0, at(b, i) + jit(0.004)), k: 'hit', n: m.n, v: m.v * p.vol * (0.88 + 0.24 * R()), r: m.r * (1 + jit(0.025)), p: m.p + (p.pan || 0), b: 'perc', tl: HIT_TAIL[m.n] || 0.4, s });
					}
					// ölçü sonu yuvarlanması: tel davul, yükselen şiddet
					if (fill) {
						const n = bs - p.fill.from;
						for (let i = 0; i < n; i++) {
							const k = i / Math.max(1, n - 1);
							ev.push({ t: at(b, p.fill.from + i), k: 'hit', n: i % 3 === 2 ? 'snare' : 'tek', v: p.vol * (0.3 + 0.7 * k) * (0.9 + 0.2 * R()), r: 1.05 + 0.1 * k, p: i % 2 ? 0.2 : -0.2, b: 'perc', tl: 0.3, s });
						}
					}
				}
				break;
			}
			case 'crash':
				for (const b of p.bars) ev.push({ t: at(b, 0), k: 'hit', n: p.n || 'zil', v: p.vol, r: 1, p: 0, b: 'perc', tl: 1.9, s });
				break;
			case 'riff': {
				const prog = p.prog || [0];
				const accent = Array.isArray(p.accent) ? (i) => p.accent.indexOf(i) >= 0 : (i) => i % (p.accent || 4) === 0;
				for (let b = 0; b < nb; b++) {
					if (!on(p, b)) continue;
					const off = prog[b % prog.length] || 0;
					for (let i = 0; i < bs; i++) {
						const d = p.pat[i % p.pat.length];
						if (d === null || d === undefined) continue;
						ev.push({ t: Math.max(0, at(b, i) + jit(0.005)), k: 'pluck', i: p.ins || 'baglama', f: hz(d + off, p.oct || 0), v: p.vol * (accent(i) ? 1 : 0.78) * (0.9 + 0.2 * R()), p: (p.pan || 0) + jit(0.08), tl: 1.6, s });
					}
				}
				break;
			}
			case 'lead': {
				const bars = parseScore(p.score, bs);
				bars.forEach((notes, b) => {
					if (!on(p, b)) return;
					for (const n of notes) {
						const t = at(b, n.s);
						const dur = n.n * sd * (n.m.indexOf('.') >= 0 ? 0.5 : 0.94);
						const vel = p.vol * (n.m.indexOf('!') >= 0 ? 1.2 : 1) * (0.92 + 0.16 * R());
						const f = hz(n.d, p.oct || 0);
						const pan = (p.pan || 0) + jit(0.05);
						if (p.ins === 'ney') ev.push({ t, k: 'ney', f, d: Math.max(0.1, dur), v: vel, p: pan, o: p.o || {}, tl: 0.35, s });
						else if (p.ins === 'zurna')
							ev.push({ t, k: 'zurna', f, d: Math.max(0.1, dur), v: vel, p: pan, o: { bend: n.n >= 4 ? 60 : 0, orn: n.m.indexOf('~') >= 0 ? 110 : 0, bright: !!p.bright }, tl: 0.15, s });
						else if (p.ins === 'horn') ev.push({ t, k: 'horn', f, d: Math.max(0.1, dur), v: vel, p: pan, tl: 0.4, s });
						else {
							// çalgı teli: uzun notada hızlı tekrar (tremolo, saz tekniği)
							ev.push({ t, k: 'pluck', i: p.ins, f, v: vel, p: pan, tl: 1.6, s });
							if (p.trem && n.n >= 3) for (let q = 1.5, c = 1; q < n.n - 0.5; q += 1.5, c++) ev.push({ t: t + q * sd, k: 'pluck', i: p.ins, f, v: vel * Math.pow(0.72, c), p: pan, tl: 1.6, s });
						}
					}
				});
				break;
			}
			case 'notes':
				for (const [b, st, d, len, vol] of p.list) ev.push({ t: at(b, st) + 0.0, k: 'pluck', i: p.ins, f: hz(d, p.oct || 0), v: (vol || 1) * p.vol, p: (p.pan || 0) + jit(0.1), tl: 1.8, s });
				break;
			case 'riser':
				for (const b of p.bars) {
					const d = p.steps * sd;
					ev.push({ t: at(b + 1, 0) - d, k: 'noise', d, v: p.vol, f0: 500, f1: 7000, o: { a: d * 0.92, q: 0.9 }, tl: 0.1, s });
				}
				break;
			default:
				throw new Error('parça: bilinmeyen parça türü ' + p.t);
		}
	}
	// her olaya hangi parçadan geldiği (karışım analizi için)
	for (let pi = 0; pi < T.parts.length; pi++) for (let k = evStart[pi]; k < (pi + 1 < evStart.length ? evStart[pi + 1] : ev.length); k++) ev[k].pi = pi;
	ev.sort((a, b) => a.t - b.t);
	return { T, L, ev, stems: T.stems || 1, bs, sd };
}
