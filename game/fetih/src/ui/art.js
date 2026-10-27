// Arayüz çizimleri: simgeler, komutan portreleri, sancaklar, bölge mini haritaları.
// Hepsi SVG metni döner (kimliksiz: aynı çizim sayfada defalarca kullanılabilir).
//
// Portre: başlık (miğfer, börk, kalpak…) ve zırh oyuncunun renginde. İsteğe bağlı görsel adresi
// (ASSETS.md) verilirse <img> kullanılır, yüklenemezse SVG'ye düşer.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ------------------------------------------------------------------ renk

const hex2 = (h) => {
	h = String(h).replace('#', '');
	if (h.length === 3) h = [...h].map((c) => c + c).join('');
	const n = parseInt(h, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
/** k > 0 beyaza, k < 0 siyaha doğru karıştır. */
export const shade = (c, k) => {
	const [r, g, b] = hex2(c);
	const t = k < 0 ? 0 : 255;
	const a = Math.abs(k);
	return toHex(r + (t - r) * a, g + (t - g) * a, b + (t - b) * a);
};
export const rgbOf = (c) => `rgb(${hex2(c).join(', ')})`;
export const hash = (s) => {
	let h = 2166136261;
	for (const ch of String(s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
	// son karıştırma: kısa adlarda da bitler dağılsın
	h ^= h >>> 16;
	h = Math.imul(h, 0x85ebca6b);
	h ^= h >>> 13;
	h = Math.imul(h, 0xc2b2ae35);
	h ^= h >>> 16;
	return h >>> 0;
};

// ------------------------------------------------------------------ simgeler (24×24, çizgi)

export const ICONS = {
	swords: 'M4 4L15 15M12.5 16.5l4-4M16 16l3 3M20 4L9 15M7.5 12.5l4 4M8 16l-3 3',
	castle: 'M4 21V8h3v3h3V8h4v3h3V8h3v13zM10 21v-4a2 2 0 0 1 4 0v4',
	shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
	flag: 'M5 21V4M5 4h12l-2.5 4L17 12H5',
	crown: 'M3 19h18M4.5 16L3 7l5 4 4-6.5 4 6.5 5-4-1.5 9z',
	star: 'M12 2.8l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.4l-5.4 2.9 1.2-6L3.3 9.1l6.1-.7z',
	clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
	bolt: 'M13 2L5 14h6l-1 8 8-12h-6z',
	hourglass: 'M6 3h12M6 21h12M7 3v2c0 3 5 5 5 7s-5 4-5 7v2M17 3v2c0 3-5 5-5 7s5 4 5 7v2',
	check: 'M5 12.5l4.5 4.5L19 7',
	cross: 'M6 6l12 12M18 6L6 18',
	pin: 'M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
	users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14c2 .6 3.5 2.6 3.5 6',
	trophy: 'M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3M8 21h8M9.5 17h5',
	coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
	tap: 'M9 12V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.8-2.4L4.4 15.6a1.6 1.6 0 0 1 2.4-2.1L9 15.5',
	map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15',
	bot: 'M5 9h14v10H5zM12 5v4M9 13.5v1M15 13.5v1M9.5 17h5M12 3.5v.1',
	replay: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4 3.5V8h4.5',
	home: 'M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5',
	edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
	scales: 'M12 4v16M8 20h8M5 7h14M5 7l-3 6.5a3 3 0 0 0 6 0zM19 7l-3 6.5a3 3 0 0 0 6 0z',
	eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
	bomb: 'M10.5 21a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15 9l2.5-2.5M18 3v2M21 6h-2M20 3.8l-1.2 1.2',
	heart: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.6A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z',
	plus: 'M12 5v14M5 12h14',
	half: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18',
	dice: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8.5 8.5h.1M15.5 8.5h.1M12 12h.1M8.5 15.5h.1M15.5 15.5h.1',
	sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8',
	gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
	arrow: 'M5 12h14M13 6l6 6-6 6',
	back: 'M19 12H5M11 6l-6 6 6 6',
	skull: 'M12 3a8 8 0 0 0-5 14.2V20h10v-2.8A8 8 0 0 0 12 3zM9 11.5h.1M15 11.5h.1M10 20v-2M14 20v-2',
};

/** Çizgi simgesi. o: koyu dış hat kalınlığı (0: yok). */
export const ico = (name, { o = 0, w = 2.4, c = '#fff', oc = 'rgba(0,0,0,.4)', cls = '' } = {}) => {
	const d = ICONS[name] || name;
	return `<svg class="fl-i ${cls}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">${
		o ? `<path d="${d}" stroke="${oc}" stroke-width="${w + o}"/>` : ''
	}<path d="${d}" stroke="${c}" stroke-width="${w}"/></svg>`;
};

/** Dolu 4 köşeli parıltı. */
export const SPARK = 'M12 1.5l2.4 8.1 8.1 2.4-8.1 2.4L12 22.5l-2.4-8.1L1.5 12l8.1-2.4z';

// ------------------------------------------------------------------ komutan portreleri

export const AVATARS = [
	{ id: 'gokturk', name: 'Göktürk Bey' },
	{ id: 'selcuklu', name: 'Selçuklu Atabey' },
	{ id: 'yeniceri', name: 'Yeniçeri Ağası' },
	{ id: 'kalpak', name: 'Kuvayı Milliye' },
	{ id: 'sultan', name: 'Sultan' },
	{ id: 'astronot', name: 'Astronot' },
	{ id: 'asci', name: 'Aşçıbaşı' },
	{ id: 'futbol', name: 'Golcü' },
];
const SKINS = ['#f4cba3', '#eab68a', '#d89c6c', '#b97d52'];
const HAIR = ['#2b1d14', '#3d2617', '#1d1511', '#5a3820'];
const GOLD = '#ffcf4a';
const GOLD_D = '#b77a12';
const INK = '#23160f';

/** Oyuncu görünümü: { kind, color, banner, skin, img } (eksikler adından türetilir). */
export function lookOf(p, cmd) {
	const h = hash(p.name || p.i || 'x');
	const own = p.look || (p.human && cmd) || {};
	return {
		kind: own.avatar || own.kind || AVATARS[(h >>> 3) % AVATARS.length].id,
		banner: own.banner || BANNERS[(h >>> 7) % BANNERS.length].id,
		skin: own.skin ?? (h >>> 11) % SKINS.length,
		color: p.css || own.colorCss || '#e0583a',
		img: own.img || null,
	};
}

function face(L, { brows = 'bold', mouth = 'smile', stache = false, beard = 0 } = {}) {
	const skin = SKINS[L.skin % SKINS.length] || SKINS[0];
	const sd = shade(skin, -0.18);
	const hair = HAIR[L.skin % HAIR.length];
	const br =
		brows === 'bold'
			? `<path d="M37.5 46.5l9.5 2.2M62.5 46.5L53 48.7" stroke="${hair}" stroke-width="3.2" stroke-linecap="round"/>`
			: `<path d="M38.5 47q4-2.6 8 0M53.5 47q4-2.6 8 0" stroke="${hair}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`;
	const mo =
		mouth === 'grin'
			? `<path d="M43 62.5q7 6.5 14 0z" fill="#7a2a1c"/><path d="M44.5 63h11" stroke="#fff" stroke-width="1.6"/>`
			: `<path d="M44.5 63.2q5.5 4 11 0" stroke="#6a2a1a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
	const st = stache ? `<path d="M40 61.5q5-4.2 10-1.2q5-3 10 1.2q-4 2.6-10 .4q-6 2.2-10-.4z" fill="${hair}"/>` : '';
	const bd = beard
		? `<path d="M35.5 58q1.5 ${beard === 2 ? 24 : 18} 14.5 ${beard === 2 ? 26 : 20}q13-2 14.5-${beard === 2 ? 26 : 20}q-5 9-14.5 9q-9.5 0-14.5-9z" fill="${hair}"/>`
		: '';
	return `<ellipse cx="33.8" cy="56" rx="3.6" ry="5" fill="${sd}"/><ellipse cx="66.2" cy="56" rx="3.6" ry="5" fill="${sd}"/>
<ellipse cx="50" cy="54" rx="16.5" ry="18.5" fill="${skin}"/>
<path d="M58 38q9 6 8.5 16q-.5 12-9 17.5q5-8 4.5-17.5q-.5-9-4-16z" fill="${sd}" opacity=".55"/>
<ellipse cx="41" cy="60.5" rx="3.2" ry="2" fill="#ff7a6a" opacity=".28"/><ellipse cx="59" cy="60.5" rx="3.2" ry="2" fill="#ff7a6a" opacity=".28"/>
${bd}${br}
<ellipse cx="43.2" cy="53" rx="2.5" ry="3.1" fill="${INK}"/><ellipse cx="56.8" cy="53" rx="2.5" ry="3.1" fill="${INK}"/>
<circle cx="44" cy="52" r=".9" fill="#fff"/><circle cx="57.6" cy="52" r=".9" fill="#fff"/>
<path d="M50 54.5q-2.6 4.6.3 5.6" stroke="${sd}" stroke-width="2" fill="none" stroke-linecap="round"/>
${st}${mo}`;
}

const BODY = (c, trim = GOLD) =>
	`<path d="M5 101C7 85 23 77.5 50 77.5S93 85 95 101z" fill="${shade(c, -0.22)}"/>
<path d="M5 101C7 85 23 77.5 50 77.5c-14 3-22 10-24 23.5z" fill="${shade(c, -0.05)}" opacity=".7"/>
<path d="M31 80.5Q50 90 69 80.5" stroke="${trim}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
const NECK = (L) => `<path d="M43.5 66h13v14q-6.5 4-13 0z" fill="${shade(SKINS[L.skin % SKINS.length] || SKINS[0], -0.22)}"/>`;

const HEADS = {
	gokturk(L, c) {
		const d = shade(c, -0.35);
		return {
			back: `<path d="M30.5 44v25q9 10 19.5 10t19.5-10V44z" fill="${d}"/><path d="M33 64q8 8 17 8t17-8M32 56q9 7 18 7t18-7" stroke="${shade(c, -0.55)}" stroke-width="1.6" fill="none" stroke-dasharray="1.6 2.2"/>`,
			face: face(L, { brows: 'bold', mouth: 'smile', stache: true }),
			top: `<path d="M30.5 48Q30 27 50 7.5Q70 27 69.5 48z" fill="${c}"/>
<path d="M36.5 45Q37.5 28 50 11.5Q43 28 43 45z" fill="#fff" opacity=".28"/>
<path d="M60 46q.5-12-6-24q10 11 10.5 24z" fill="${d}" opacity=".45"/>
<path d="M28.5 43.5Q50 37 71.5 43.5v6.5Q50 43.5 28.5 50z" fill="${GOLD}"/><path d="M28.5 48.5Q50 42 71.5 48.5V50Q50 43.5 28.5 50z" fill="${GOLD_D}"/>
<path d="M48 44.5h4v13.5l-2 2.2-2-2.2z" fill="${GOLD_D}"/><circle cx="50" cy="8" r="3.2" fill="${GOLD}"/>`,
		};
	},
	selcuklu(L, c) {
		const d = shade(c, -0.35);
		return {
			back: '',
			face: face(L, { brows: 'bold', mouth: 'smile', beard: 1 }),
			top: `<path d="M32 44Q31.5 17.5 50 16Q68.5 17.5 68 44z" fill="${c}"/>
<path d="M41.5 42Q42 26 50 17M58.5 42Q58 26 50 17" stroke="${d}" stroke-width="1.8" fill="none" opacity=".6"/>
<path d="M36.5 41Q37 25 46 18.5Q41 27 41.5 41z" fill="#fff" opacity=".3"/>
<path d="M47.6 18L50 2.5l2.4 15.5z" fill="${GOLD}"/><ellipse cx="50" cy="18" rx="4.6" ry="2.2" fill="${GOLD_D}"/>
<path d="M27.5 42.5Q50 31.5 72.5 42.5q2 5.5-1.5 9.5Q50 42 29 52q-3.5-4-1.5-9.5z" fill="#f7eed9"/>
<path d="M31 47.5Q50 37.5 69 47.5" stroke="#d3bf95" stroke-width="1.8" fill="none"/><circle cx="50" cy="41" r="3.4" fill="${c}" stroke="${GOLD}" stroke-width="1.6"/>`,
		};
	},
	yeniceri(L, c) {
		const d = shade(c, -0.3);
		return {
			back: `<path d="M57 13q24-1 26 27q1 21-6.5 39L70.5 75q6-18 2.5-38Q70 20 57 18z" fill="${d}"/><path d="M76 40q1 18-4 33" stroke="${shade(c, -0.5)}" stroke-width="1.6" fill="none" opacity=".6"/>`,
			face: face(L, { brows: 'bold', mouth: 'smile', stache: true }),
			top: `<path d="M34 46l2-34Q50 3.5 64 12l2 34z" fill="${c}"/>
<path d="M39 44.5l1.4-30.5Q43.5 10 46.5 9.5L45 44.5z" fill="#fff" opacity=".28"/>
<path d="M31.5 41.5Q50 37 68.5 41.5v7.5Q50 44.5 31.5 49z" fill="${GOLD}"/>
<path d="M45 42V24.5q5-7 10 0V42z" fill="${GOLD}"/><path d="M47.8 39V26.5q2.2-3 4.4 0V39z" fill="${GOLD_D}"/>
<path d="M31.5 47.4Q50 43 68.5 47.4V49Q50 44.5 31.5 49z" fill="${GOLD_D}"/>`,
		};
	},
	kalpak(L, c) {
		const fur = shade(c, -0.5);
		const lit = shade(c, -0.2);
		let sc = 'M32.5 21';
		for (let i = 0; i < 6; i++) sc += 'q2.9-4.5 5.8 0';
		return {
			back: '',
			face: face(L, { brows: 'bold', mouth: 'smile', stache: true }),
			top: `<path d="M30.5 47l2-26h35l2 26q-19.5-6-39 0z" fill="${fur}"/>
<path d="${sc}V25h-35z" fill="${fur}"/>
<path d="M36 43l1-18M42 41.5l.5-19M48 40.5V22M54 40.5V22M60 41.5l-.5-19M66 43l-1-18" stroke="${lit}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="2.5 3"/>
<path d="M33.5 40l1-16" stroke="#fff" stroke-width="2.4" opacity=".22" stroke-linecap="round"/>
<circle cx="50" cy="33" r="4.4" fill="${GOLD}"/><circle cx="50" cy="33" r="2" fill="${c}"/>`,
		};
	},
	sultan(L, c) {
		const t = shade(c, 0.72);
		return {
			back: '',
			face: face(L, { brows: 'soft', mouth: 'smile', beard: 2 }),
			top: `<path d="M25.5 47Q21 22 50 15q29 7 24.5 32Q50 38 25.5 47z" fill="${t}"/>
<path d="M27 40Q50 24 73 35M26 46Q50 30 74 42M30 30q20-14 40-1" stroke="${c}" stroke-width="3.6" fill="none" stroke-linecap="round"/>
<path d="M31 27Q37 19 47 17" stroke="#fff" stroke-width="3" opacity=".6" fill="none" stroke-linecap="round"/>
<path d="M50 31Q41.5 15 49 1.5q8.5 13 3.5 29.5z" fill="#fff"/><path d="M49 4q4 7 3 14" stroke="${c}" stroke-width="2" fill="none"/>
<circle cx="50" cy="33" r="5" fill="${GOLD}"/><circle cx="50" cy="33" r="2.4" fill="#d22d3a"/>`,
		};
	},
	astronot(L, c) {
		return {
			back: `<circle cx="50" cy="52" r="31.5" fill="#e9eef6"/><circle cx="50" cy="52" r="31.5" fill="none" stroke="#c3ccda" stroke-width="2"/>
<path d="M69 25l9-13" stroke="#c3ccda" stroke-width="2.6" stroke-linecap="round"/><circle cx="78.5" cy="11.5" r="3.6" fill="${c}"/>`,
			face: face(L, { brows: 'soft', mouth: 'grin' }),
			top: `<circle cx="50" cy="53" r="24.5" fill="#8fd0ff" opacity=".22"/>
<circle cx="50" cy="53" r="24.5" fill="none" stroke="${c}" stroke-width="5"/>
<path d="M32 42a20 20 0 0 1 14-13.5" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".85"/>
<path d="M35 48.5a15 15 0 0 1 3-6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>`,
			body: `<path d="M5 101C7 85 23 77.5 50 77.5S93 85 95 101z" fill="#e9eef6"/><path d="M9 101q2-14 15-20l5 20z" fill="${c}"/><path d="M91 101q-2-14-15-20l-5 20z" fill="${c}"/>
<path d="M34 79q16 9 32 0" stroke="${c}" stroke-width="5" fill="none"/><rect x="44" y="88" width="12" height="7" rx="2" fill="${shade(c, -0.25)}"/>`,
		};
	},
	asci(L, c) {
		return {
			back: '',
			face: face(L, { brows: 'soft', mouth: 'grin', stache: true }),
			top: `<path d="M33 41q-10-7-4.5-17.5Q31 12 42 13.5q6-9.5 16-3q11-2.5 12.5 8.5q8 7.5-2.5 22z" fill="#fdfdfd"/>
<path d="M42 39l-1.5-18M50 38.5V15.5M58 39l1.5-18" stroke="#d6dbe6" stroke-width="1.8" stroke-linecap="round"/>
<path d="M33 22q2-7 9-8" stroke="#d6dbe6" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<path d="M31.5 36Q50 31 68.5 36v8.5Q50 39.5 31.5 44.5z" fill="${c}"/><path d="M31.5 42.8Q50 38 68.5 42.8v1.7Q50 39.5 31.5 44.5z" fill="${shade(c, -0.3)}"/>`,
			body: `<path d="M5 101C7 85 23 77.5 50 77.5S93 85 95 101z" fill="#f4f5f8"/><path d="M38 78.5L50 92l12-13.5q-6 4-12 4t-12-4z" fill="${c}"/>
<circle cx="42" cy="95" r="1.8" fill="#c3c9d6"/><circle cx="58" cy="95" r="1.8" fill="#c3c9d6"/>`,
		};
	},
	futbol(L, c) {
		const hair = HAIR[L.skin % HAIR.length];
		return {
			back: '',
			face: face(L, { brows: 'bold', mouth: 'grin' }),
			top: `<path d="M33 49q-4-19 8-23.5q9-4 18 0q12 4.5 8 23.5q-2.5-10-9.5-12q-8.5 3-16 0q-6.5 2-8.5 12z" fill="${hair}"/>
<path d="M32 42Q50 33.5 68 42v5.5Q50 39 32 47.5z" fill="${c}"/><path d="M32.5 44.6Q50 36.4 67.5 44.6" stroke="#fff" stroke-width="1.6" fill="none"/>`,
			body: `<path d="M5 101C7 85 23 77.5 50 77.5S93 85 95 101z" fill="${c}"/><path d="M5 101C7 85 23 77.5 50 77.5c-14 3-22 10-24 23.5z" fill="#fff" opacity=".14"/>
<path d="M40 78.5L50 88l10-9.5" stroke="#fff" stroke-width="3.2" fill="none" stroke-linejoin="round"/>
<text x="50" y="100" text-anchor="middle" font-family="Lilita One,system-ui" font-size="13" fill="#fff">10</text>`,
		};
	},
};

/** Portrenin iç SVG'si. bg: arka plan (oyuncu renginde ışıklı zemin). */
export function avatarSVG(L, { bg = true } = {}) {
	const c = L.color;
	const H = (HEADS[L.kind] || HEADS.gokturk)(L, c);
	const back = bg
		? `<rect width="100" height="100" fill="${shade(c, -0.12)}"/><circle cx="34" cy="26" r="52" fill="${shade(c, 0.28)}" opacity=".55"/><path d="M0 0h100L0 100z" fill="#fff" opacity=".07"/>`
		: '';
	return `<svg class="fl-avs" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">${back}${H.back || ''}${H.body || BODY(c)}${NECK(L)}${H.face}${H.top}</svg>`;
}

/** Portre: görsel varsa <img> (hata olursa SVG'ye düşer), yoksa SVG. */
export function avatar(L, opts = {}) {
	// görsel SVG'nin üstüne biner; yüklenemezse kendini siler, altta SVG kalır
	const img = L.img ? `<img class="fl-avi" alt="" decoding="async" src="${esc(L.img)}" onerror="this.remove()">` : '';
	return avatarSVG(L, opts) + img;
}

/** CSS arka planı olarak kullanılacak portre (data: adresi). */
export const avatarURL = (L) => `url("data:image/svg+xml,${encodeURIComponent(avatarSVG(L).replace('class="fl-avs" ', 'xmlns="http://www.w3.org/2000/svg" '))}")`;

// ------------------------------------------------------------------ sancaklar

export const BANNERS = [
	{ id: 'duz', name: 'Düz' },
	{ id: 'serit', name: 'Şerit' },
	{ id: 'ok', name: 'Ok' },
	{ id: 'yildiz', name: 'Yıldız' },
	{ id: 'gunes', name: 'Güneş' },
	{ id: 'lale', name: 'Lale' },
];

const PATTERN = {
	duz: () => '',
	serit: (l) => `<path d="M8 30h44v10H8zM8 48h44v5H8z" fill="${l}"/>`,
	ok: (l) => `<path d="M8 22l22 16 22-16v10L30 48 8 32z" fill="${l}"/>`,
	yildiz: (l) => `<path d="M30 21l4.4 9.4 10.2 1.2-7.6 7 2 10.1L30 43.6l-9 5.1 2-10.1-7.6-7 10.2-1.2z" fill="${l}"/>`,
	gunes: (l) => `<circle cx="30" cy="36" r="7.5" fill="${l}"/><path d="M30 20v6M30 46v6M14 36h6M40 36h6M18.7 24.7l4.2 4.2M37.1 43.1l4.2 4.2M18.7 47.3l4.2-4.2M37.1 28.9l4.2-4.2" stroke="${l}" stroke-width="3" stroke-linecap="round"/>`,
	lale: (l) => `<path d="M30 52V40M30 40q-9-2-9-13 4 3 6 2-1-6 3-10 4 4 3 10 2 1 6-2 0 11-9 13z" fill="${l}" stroke="${l}" stroke-width="1.5" stroke-linejoin="round"/><path d="M30 50q-6-1-8-6 6 0 8 4" fill="${l}"/>`,
};

/** Kırlangıç kuyruklu sancak (60×100). */
export function bannerSVG(kind, color, { pole = true } = {}) {
	const l = shade(color, 0.55);
	const d = shade(color, -0.3);
	return `<svg class="fl-bnr" viewBox="0 0 60 100">
${pole ? '<rect x="2" y="2" width="56" height="5" rx="2.5" fill="#8a5a1a"/><circle cx="3.5" cy="4.5" r="3.5" fill="' + GOLD + '"/><circle cx="56.5" cy="4.5" r="3.5" fill="' + GOLD + '"/>' : ''}
<path d="M7 7h46v76L30 69 7 83z" fill="${d}"/><path d="M7 7h46v72L30 65 7 79z" fill="${color}"/>
<path d="M7 7h14v68.5L7 79z" fill="#fff" opacity=".12"/>
${(PATTERN[kind] || PATTERN.duz)(l)}
<path d="M7 11h46" stroke="${GOLD}" stroke-width="3"/><path d="M7 79l23-14 23 14" stroke="${GOLD}" stroke-width="2.4" fill="none" stroke-linejoin="round"/>
</svg>`;
}

// ------------------------------------------------------------------ bölge mini haritaları

/** Bütün iller için <symbol> tanımları (bir kez sayfaya konur) ve kart çizimi. */
export function regionSymbols(provinces) {
	let x0 = Infinity;
	let x1 = -Infinity;
	let y0 = Infinity;
	let y1 = -Infinity;
	const byRegion = {};
	for (const p of provinces) {
		let d = '';
		for (const r of p.rings) {
			const step = r.length > 120 ? 4 : 2;
			for (let k = 0; k < r.length; k += step) {
				const x = r[k];
				const y = -r[k + 1];
				x0 = Math.min(x0, x);
				x1 = Math.max(x1, x);
				y0 = Math.min(y0, y);
				y1 = Math.max(y1, y);
				d += (k ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
			}
			d += 'Z';
		}
		(byRegion[p.region] = byRegion[p.region] || []).push(d);
	}
	const W = (x1 - x0 + 2).toFixed(1);
	const H = (y1 - y0 + 2).toFixed(1);
	const real = `${(x0 - 1).toFixed(1)} ${(y0 - 1).toFixed(1)} ${W} ${H}`;
	// semboller gerçek koordinatta; kullanan SVG 0 0 W H kutusuyla bakar (use x/y 0'dan başlar)
	const sym = Object.entries(byRegion)
		.map(([k, ds]) => `<symbol id="fl-rg-${k}" viewBox="${real}"><path d="${ds.join('')}"/></symbol>`)
		.join('');
	const all = `<symbol id="fl-rg-all" viewBox="0 0 ${W} ${H}">${Object.keys(byRegion)
		.map((k) => `<use href="#fl-rg-${k}" width="${W}" height="${H}"/>`)
		.join('')}</symbol>`;
	return { svg: `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${sym}${all}</svg>`, keys: Object.keys(byRegion), vb: `0 0 ${W} ${H}`, W, H };
}

/** Türkiye silüeti üstünde bölgesi parlayan mini harita. */
export const regionMap = (key, vb) => {
	const [, , W, H] = vb.split(' ');
	const u = (id, cls) => `<use href="#fl-rg-${id}" class="${cls}" width="${W}" height="${H}"/>`;
	return `<svg class="fl-mm" viewBox="${vb}">${u('all', 'base')}${key === 'all' ? u('all', 'hi') : key === 'random' ? '' : u(key, 'hi')}</svg>`;
};
