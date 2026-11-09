// BALON PATLAT (YENİ): bir kural ("Ege Bölgesi'ndeki illeri patlat!") ve gökyüzüne yükselen 9–10 yazılı balon; 3–4'ü
// kurala uyar. Balonlar alttan, kendi şeritlerinde, biraz farklı hızlarla süzülür ve rüzgârda salınır. Dokun, patlat:
//   doğru    balon pat diye patlar: lastik parçaları, konfeti, çan sesi (art arda doğrularda perde yükselir: SERİ)
//   yanlış   balon kırmızıya döner, fısss diye sönerek zikzak çizip düşer: −1
//   kaçan    tepeden çıkan doğru balon kaçırılmış sayılır ("KAÇTI")
// Tur ~15 sn (sabit tur: herkes aynı balonları aynı anda görür). Doğruların hepsini bulan erken biter.
// Sahne tam ekran gökyüzü (harita yok): üç tema (gündüz Ege kıyısı, gün batımında uçurum ve fener, gece İstanbul
// siluetinde fener balonlar). Neden harita değil: kural etiketlerle oynanır, harita yalnız yer kaplar; kısa telefonda
// (320×568) bütün yükseklik gökyüzüne kalır ve sonuç tahtası, damga ve sayaçlar üst üste binmeden yerleşir.
//
// Veri: dogru: [etiket…] (kurala uyanlar), yanlis: [etiket…] (tuzaklar), tema: 'gunduz' | 'batim' | 'gece',
//       ufuk: 'ege' | 'kiyi' | 'istanbul' (siluet)
// Görünüm: b: [{ w, ok, t, d, l, c, ph, sw, fr }] (balon: etiket, doğru mu, çıkış anı ve uçuş süresi sn, şerit, renk,
//          salınım evresi/genliği/sıklığı), n: doğru sayısı, end: son balonun tepeden çıktığı an (sn)
// Değer: { p: [[balon, sn], …] } (patlatılanlar, kart açılışından). judge sayar: ok (doğru), bad (yanlış), miss (kaçan).
//        O an gökte olmayan balon (zaman penceresi dışı) sayılmaz.
// Tür 'closest': err = kaçan + yanlış (küçük önde; eşitlikte erken bitiren). correct = hepsi doğru, hiç yanlış yok.
// Bot: her balon için tepki süresi (botTime dağılımından: beceriyle kısalır, erkene yatık) ve karar: doğruyu pCorrect
//      payıyla, tuzağı acemi daha sık patlatır; bitiş turun kendisinden (hepsini bulan erken biter, bulamayan son balona
//      dek bekler).
// Jokerler yok (sabit tur: süre ve ikinci şans uymaz; joker çubuğu kısa ekranda gökyüzünün üçte birini yerdi).
// Çevrimiçi: publicView doğru bayraklarını siler; her dokunuşu sunucu yanıtlar (Fetih Koşusu gibi: act 'balon').

import { css, esc, shuffle, pCorrect, buzz, clamp } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, onClose, onOpen, rule, stampLater, LOOK, ACT, DENEME_CSS } from './d_ortak.js';
import { clock, setTimeout, clearTimeout } from '../core/clock.js';
import { degHz } from '../audio/scales.js';

/** Tur ölçüleri (sn): ilk balon, son çıkış (en geç), şerit sayısı. */
export const TUR = { ilk: 0.7, son: 14.8, serit: 4 };
/** Zorluğa göre uçuş süresi aralığı (sn): zor soruda balonlar hızlı. */
const UCUS = { 1: [6.8, 7.8], 2: [6.2, 7.2], 3: [5.5, 6.5] };
/** Aynı şeritteki iki balonun en küçük dikey payı (uçuş yolunun payı; en kısa gökyüzünde gövde + ip + boşluk). */
const AYRIK = 0.38;
// balon renkleri: [gövde, koyu, açık, yazı]
const RENK = [
	['#ff4d4d', '#a81616', '#ffb0a8', '#fff'],
	['#ff9a2e', '#b2540a', '#ffd3a0', '#fff'],
	['#ffd23a', '#b88a00', '#fff2b0', '#4a2a00'],
	['#3ccf6e', '#16843e', '#b0f5c8', '#fff'],
	['#26c4d0', '#0b7c88', '#b4f4fa', '#fff'],
	['#3d8bff', '#1648b0', '#b6d4ff', '#fff'],
	['#9b5cff', '#5422b0', '#d8c2ff', '#fff'],
	['#ff5db1', '#b0186a', '#ffc2e2', '#fff'],
];

// ---------------------------------------------------------------- uçuş planı (prepare; belirlenimci)

/** Aynı şeritteki iki balonun uçuş payı farkı (en küçüğü): a önce, c sonra çıkar. Doğrusal: uçlarda en küçük. */
function ayrik(a, c) {
	const t0 = Math.max(a.t, c.t);
	const t1 = Math.min(a.t + a.d, c.t + c.d);
	if (t1 <= t0) return 1;
	const g = (t) => Math.abs((t - a.t) / a.d - (t - c.t) / c.d);
	return Math.min(g(t0), g(t1));
}

/**
 * Plan: sıra (ilk üçte en az bir doğru, art arda en çok iki doğru, son balon tuzak), çıkış anları, şeritler, süreler,
 * renkler. Aynı şeritte iki balon hiçbir anda AYRIK payından yakın olmaz (gövdeler ve yazılar üst üste binmez); olmazsa
 * aynı tohumla yeniden kurulur (belirlenimci).
 */
function plan(q, R) {
	const items = [...(q.dogru || []).map((w) => ({ w, ok: 1 })), ...(q.yanlis || []).map((w) => ({ w, ok: 0 }))];
	const N = items.length;
	const [d0, d1] = UCUS[clamp(Math.round(Number(q.diff) || 2), 1, 3)];
	let best = null;
	for (let tries = 0; tries < 40; tries++) {
		let seq = shuffle(items, R);
		for (let k = 0; k < 60; k++) {
			const first = seq.slice(0, 3).some((x) => x.ok);
			let run = 0;
			let worst = 0;
			for (const x of seq) {
				run = x.ok ? run + 1 : 0;
				worst = Math.max(worst, run);
			}
			if (first && worst <= 2 && !seq[N - 1].ok) break;
			seq = shuffle(items, R);
		}
		const tLast = TUR.son - d1 - 0.25;
		const gap = (tLast - TUR.ilk) / Math.max(1, N - 1);
		const last = Array(TUR.serit).fill(null);
		let prevL = -1;
		let prevC = -1;
		const out = [];
		let t = TUR.ilk;
		for (let i = 0; i < N; i++) {
			const x = seq[i];
			t = Math.max(t, TUR.ilk + i * gap + (i && i < N - 1 ? (R() - 0.5) * gap * 0.3 : 0));
			// şerit: öncekinden payı açılmış (AYRIK + pay) şeritler içinde en uzun süredir boş olan; yoksa ilk boşalana dek bekle
			const free = (l) => (last[l] ? last[l].t + (AYRIK + 0.04) * last[l].d : -1e9);
			let lane = -1;
			let bw = -1e9;
			for (let l = 0; l < TUR.serit; l++) {
				if (l === prevL || free(l) > t) continue;
				const w = t - (last[l]?.t ?? -1e9) + R() * 0.3;
				if (w > bw) {
					bw = w;
					lane = l;
				}
			}
			if (lane < 0) {
				lane = [0, 1, 2, 3].filter((l) => l !== prevL).sort((a, b) => free(a) - free(b))[0];
				t = free(lane);
			}
			t = Math.round(t * 100) / 100;
			let d = d0 + R() * (d1 - d0);
			const a = last[lane];
			// öndekine yetişmesin: öndeki tepeden çıkarken bu balon en çok (1 − AYRIK − pay) yolda olsun
			if (a) d = Math.max(d, (a.t + a.d - t) / (1 - AYRIK - 0.04));
			d = Math.round(Math.min(d, TUR.son - t) * 100) / 100;
			let c = Math.floor(R() * RENK.length);
			if (c === prevC) c = (c + 3) % RENK.length;
			const b = { w: x.w, ok: x.ok, t, d, l: lane, c, ph: Math.round(R() * 628) / 100, sw: Math.round((0.6 + R() * 0.4) * 100) / 100, fr: Math.round((0.75 + R() * 0.5) * 100) / 100 };
			out.push(b);
			last[lane] = b;
			prevL = lane;
			prevC = c;
		}
		// sına: aynı şeritteki her çift, uçuş süresi kısa kalmasın, son çıkış tur içinde
		let worst = 1;
		for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (out[i].l === out[j].l) worst = Math.min(worst, ayrik(out[i], out[j]));
		const fine = worst >= AYRIK && out.every((b) => b.d >= d0 * 0.85 && b.t + b.d <= TUR.son + 1e-6);
		if (!best || (fine && !best.fine) || (fine === best.fine && worst > best.worst)) best = { out, worst, fine };
		if (fine) break;
	}
	const out = best.out;
	const end = Math.round(Math.max(...out.map((b) => b.t + b.d)) * 100) / 100;
	return { b: out, n: out.filter((b) => b.ok).length, end };
}

/** Değerden say: doğru, yanlış, kaçan (aynı balon bir kez; o an gökte olmayan sayılmaz). */
export function sayim(v, value) {
	const seen = new Set();
	let ok = 0;
	let bad = 0;
	for (const x of Array.isArray(value?.p) ? value.p : []) {
		const k = Array.isArray(x) ? x[0] : x;
		const t = Array.isArray(x) ? Number(x[1]) : NaN;
		const b = v.b?.[k];
		if (!b || seen.has(k)) continue;
		if (Number.isFinite(t) && (t < b.t - 0.3 || t > b.t + b.d + 0.4)) continue;
		seen.add(k);
		if (b.ok) ok++;
		else bad++;
	}
	return { ok, bad, miss: Math.max(0, (v.n || 0) - ok), seen };
}

// ---------------------------------------------------------------- ses (oyunun ses motoru; yoksa sessiz)

function sesOf(app) {
	const sx = app?.sfx;
	const e = sx?.e;
	const okA = () => !!(e?.ctx && e.ctx.state === 'running' && !sx.muted);
	const safe = (fn) => {
		try {
			if (okA()) fn(e, e.ctx.currentTime + 0.005);
		} catch {
			/* ses yoksa sessiz */
		}
	};
	const R = (d) => degHz('rast', d);
	return {
		// doğru: lastik patlaması + çan (seri büyüdükçe perde yükselir) + parıltı
		pat(seri, pan) {
			safe((e, t) => {
				e.hit('pop', t, 0.95, 0.85 + Math.random() * 0.1, pan);
				e.noise(t, 0.07, 0.16, 5200, 1400, { type: 'highpass', q: 0.7, a: 0.002, pan });
				e.hit('crack', t + 0.004, 0.35, 1.4, pan);
				const d = 7 + Math.min(7, seri);
				e.hit('chime', t + 0.03, 0.22, R(d) / 880, pan);
				e.hit('chime', t + 0.11, 0.14, R(d + 2) / 880, pan);
				e.pluck('kanun', R(d + 4), t + 0.16, 0.22, pan);
			});
		},
		// yanlış: fısss (yükseklerden kısılan hava) + "pırt" diye sönen lastik
		sondu(pan) {
			safe((e, t) => {
				e.hit('pop', t, 0.45, 0.6, pan);
				e.noise(t, 0.75, 0.13, 7200, 2400, { type: 'highpass', q: 0.5, a: 0.015, pan });
				e.noise(t + 0.05, 0.6, 0.06, 1800, 700, { q: 1.8, a: 0.03, pan });
				for (let i = 0; i < 5; i++) e.tone('sawtooth', 190 - i * 18, 150 - i * 16, t + 0.12 + i * 0.09, 0.08, 0.035, { lp: 800, pan });
			});
		},
		// doğru balon kaçtı: alçalan yumuşak ıslık
		kacti(pan) {
			safe((e, t) => e.tone('sine', 660, 330, t, 0.32, 0.045, { a: 0.02, pan }));
		},
		// başla: fırlayan balonlar için hafif hışırtı ve iki tık
		basla() {
			safe((e, t) => {
				e.noise(t, 0.4, 0.05, 500, 2600, { q: 0.8, a: 0.15 });
				e.hit('woodTap', t + 0.05, 0.3, 1.3);
				e.hit('woodTap', t + 0.2, 0.3, 1.55);
			});
		},
		// hepsi bulundu: kanun dizisi + zil
		hepsi() {
			safe((e, t) => {
				[0, 2, 4, 7, 9, 11, 14].forEach((d, i) => e.pluck('kanun', R(d + 7), t + i * 0.055, 0.34, -0.6 + i * 0.2));
				e.hit('zil', t + 0.4, 0.3, 1.1);
				e.hit('chime', t + 0.4, 0.2, R(14) / 880);
			});
		},
	};
}

// ---------------------------------------------------------------- manzara (SVG, viewBox 400×150: gökyüzünün alt üçte biri)
// Önemli öğeler ortadaki 40–360 aralığında: dar gökyüzünde yanlar kırpılır (xMidYMax slice).

function ufukSVG(kind) {
	const P = [];
	if (kind === 'istanbul') {
		// gece, tarihi yarımada: Haliç'e bakan büyük selatin camisi (kubbe, yarım kubbeler, dört minare), solda altı
		// minareli cami, sağda Galata Kulesi; pencerelerde ışık, denizde yakamoz
		const minare = (x, y, h, w = 3.4) => `M${x - w / 2},${y}V${y - h}L${x},${y - h - h * 0.17}L${x + w / 2},${y - h}V${y}Z`;
		const kubbe = (x, y, r, k = 0.9) => `M${x - r},${y}A${r},${r * k} 0 0 1 ${x + r},${y}Z`;
		P.push(`<rect y="112" width="400" height="38" fill="#0a1a4a"/>`);
		P.push(`<path fill="#101c4e" opacity=".9" d="M0,112V100Q30,92 60,96T130,90T200,94T270,88T340,94T400,92V112Z"/>`);
		// altı minareli cami (sol)
		P.push(`<path fill="#070d2e" d="M40,112V92H112V112Z${kubbe(76, 92, 22)}${kubbe(58, 94, 10)}${kubbe(94, 94, 10)}${kubbe(76, 71, 3)}${minare(36, 112, 34)}${minare(116, 112, 34)}${minare(46, 112, 26)}${minare(106, 112, 26)}${minare(30, 112, 22, 2.6)}${minare(122, 112, 22, 2.6)}"/>`);
		// büyük selatin camisi (orta, tepede)
		P.push(`<path fill="#060b28" d="M150,112V84H250V112Z${kubbe(200, 84, 32)}${kubbe(170, 86, 16)}${kubbe(230, 86, 16)}${kubbe(156, 92, 8)}${kubbe(244, 92, 8)}${kubbe(200, 55, 4)}${minare(146, 112, 52)}${minare(254, 112, 52)}${minare(160, 100, 38)}${minare(240, 100, 38)}"/>`);
		// Galata Kulesi (sağ) ve evler
		P.push(`<path fill="#070d2e" d="M318,112V64H334V112ZM315,64H337L326,42Z"/><path fill="#060b28" d="M280,112V100H300V94H312V112ZM340,112V96H360V102H384V92H400V112Z"/>`);
		let w = '';
		for (const [x, y] of [[54, 104], [64, 100], [88, 100], [98, 104], [170, 98], [182, 94], [196, 92], [206, 92], [218, 94], [230, 98], [284, 104], [294, 104], [304, 100], [322, 70], [329, 70], [322, 90], [345, 104], [352, 100], [366, 106], [376, 104], [390, 98], [10, 104], [18, 108], [126, 106], [138, 104]])
			w += `<rect x="${x}" y="${y}" width="2.4" height="3" rx=".6"/>`;
		P.push(`<g fill="#ffd27a" class="pen">${w}</g>`);
		// yakamoz: ışıkların denizdeki titrek yansıması
		P.push(`<g class="yak" fill="#ffd27a" opacity=".55"><rect x="190" y="118" width="22" height="1.6" rx=".8"/><rect x="194" y="124" width="14" height="1.4" rx=".7"/><rect x="198" y="130" width="8" height="1.2" rx=".6"/><rect x="318" y="118" width="14" height="1.4" rx=".7"/><rect x="321" y="125" width="8" height="1.2" rx=".6"/><rect x="66" y="119" width="18" height="1.4" rx=".7"/><rect x="70" y="126" width="10" height="1.2" rx=".6"/></g>`);
	} else if (kind === 'kiyi') {
		// gün batımı kıyısı: denize gömülen güneşin yolu, sağda uçurumda fener (dönen ışık), solda çamlı kayalık
		P.push(`<defs><linearGradient id="ynBlDz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a3a6a"/><stop offset="1" stop-color="#2a1440"/></linearGradient></defs>`);
		P.push(`<rect y="96" width="400" height="54" fill="url(#ynBlDz)"/>`);
		P.push(`<g fill="#ffcf7a" class="yol"><rect x="170" y="98" width="60" height="2.2" rx="1"/><rect x="178" y="104" width="44" height="2" rx="1"/><rect x="186" y="110" width="30" height="1.8" rx=".9"/><rect x="192" y="117" width="18" height="1.6" rx=".8"/><rect x="196" y="125" width="10" height="1.4" rx=".7"/></g>`);
		P.push(`<path fill="#1e0c26" d="M286,150V104Q300,92 318,88L338,80Q362,74 382,78L400,80V150Z"/>`);
		P.push(`<path fill="#1e0c26" d="M343,80V50H355V80Z"/><path fill="#1e0c26" d="M340,50H358L349,40Z"/><rect x="344" y="56" width="10" height="3" fill="#3a1a30"/><rect x="344" y="66" width="10" height="3" fill="#3a1a30"/><path class="fener" fill="#ffe8a0" d="M343.5,50.5h11v5h-11z"/>`);
		P.push(`<path class="isik" fill="url(#ynBlIs)" d="M349,53L250,30L250,76Z" opacity=".55"/><defs><linearGradient id="ynBlIs" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff2c0"/><stop offset="1" stop-color="#fff2c0" stop-opacity="0"/></linearGradient></defs>`);
		P.push(`<path fill="#2a1030" d="M0,150V96Q22,84 48,90T100,98T132,104V150Z"/><path fill="#1e0c26" d="M14,92l8,-26 8,26zM30,94l7,-20 7,20zM52,94l9,-28 9,28zM74,98l6,-16 6,16z"/>`);
		P.push(`<g class="kus" fill="none" stroke="#2a1030" stroke-width="1.6" stroke-linecap="round"><path d="M100,40q5,-5 10,0q5,-5 10,0"/><path d="M128,28q4,-4 8,0q4,-4 8,0"/><path d="M88,22q3,-3 6,0q3,-3 6,0"/></g>`);
	} else {
		// gündüz Ege kıyısı: puslu dağlar, pırıltılı deniz ve yelkenli, beyaz evler ve zeytinler, tepede yel değirmenleri
		P.push(`<path fill="#9fb6d8" opacity=".75" d="M0,96Q40,74 82,84T160,78T240,86T320,74T400,88V100H0Z"/>`);
		P.push(`<rect y="94" width="400" height="56" fill="#2a86d6"/><rect y="94" width="400" height="5" fill="#5fb0ee" opacity=".7"/>`);
		P.push(`<g fill="#fff" opacity=".6" class="pir"><rect x="30" y="104" width="30" height="1.3" rx=".6"/><rect x="120" y="110" width="44" height="1.3" rx=".6"/><rect x="236" y="102" width="34" height="1.3" rx=".6"/><rect x="300" y="114" width="40" height="1.3" rx=".6"/></g>`);
		P.push(`<g class="yelken"><path fill="#fff" d="M196,98l10,-22v22z"/><path fill="#f3efe6" d="M194,98l12,0l-3,4h-7z"/></g>`);
		P.push(`<path fill="#79a854" d="M0,150V112Q40,98 90,104T170,112T210,120V150Z"/><path fill="#6a9a46" d="M230,150V114Q280,96 330,98T400,104V150Z"/>`);
		P.push(`<path fill="#5a8a3c" d="M0,150V128Q70,118 150,128T300,126T400,130V150Z"/>`);
		const ev = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fbf8f0"/><rect x="${x + w * 0.3}" y="${y + h * 0.4}" width="${w * 0.25}" height="${h * 0.6}" fill="#2a74c0"/>`;
		P.push(ev(30, 104, 14, 9), ev(48, 106, 10, 7), ev(64, 103, 13, 10), ev(96, 108, 12, 8), ev(118, 110, 10, 7));
		const zeytin = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#3f6b2e"/><circle cx="${x - r * 0.4}" cy="${y - r * 0.3}" r="${r * 0.6}" fill="#4f7d38"/>`;
		P.push(zeytin(20, 118, 6), zeytin(84, 116, 5), zeytin(150, 122, 6), zeytin(220, 124, 5), zeytin(380, 118, 6));
		const degirmen = (x, y, s = 1) =>
			`<g transform="translate(${x},${y}) scale(${s})"><path fill="#f6f2e8" d="M-6,0L-4.6,-20H4.6L6,0Z"/><path fill="#a0704a" d="M-6,-20Q0,-28 6,-20Z"/><rect x="-1.5" y="-8" width="3" height="8" fill="#5a4030"/><g class="kanat" style="transform-origin:0 -19px"><path fill="#ece4d0" stroke="#8a7a60" stroke-width=".4" d="M0,-19L2,-36L-1.2,-36ZM0,-19L17,-17L17,-20.5ZM0,-19L-2,-2L1.2,-2ZM0,-19L-17,-21L-17,-17.5Z"/></g></g>`;
		P.push(degirmen(268, 104, 1.15), degirmen(304, 100, 1), degirmen(338, 102, 0.9));
	}
	return `<svg class="yn-bl-ufuk u-${kind}" viewBox="0 0 400 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${P.join('')}</svg>`;
}

// ---------------------------------------------------------------- stil (kök: .yn-bl)

const CSS = /* css */ `
.yn-bl{display:flex;flex-direction:column;gap:7px;min-height:0;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.fl-q.cover .yn-bl{flex:1 1 auto}
/* üst şerit: hedef yuvaları, yanlış sayacı, rakipler */
.yn-bl-hud{flex:none;display:flex;align-items:center;gap:10px;min-height:32px;padding:0 2px}
.yn-bl-hd{flex:none;display:flex;align-items:center;gap:6px}
.yn-bl-hd small,.yn-bl-yn small{display:none} /* sade: noktalar ve sayılar yeter */
.yn-bl-hd>span{display:flex;gap:4px}
.yn-bl-hd>span i{width:16px;height:20px;border-radius:50% 50% 50% 50%/58% 58% 42% 42%;background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35);transition:background .2s,box-shadow .2s}
.yn-bl-hd>span i.on{background:radial-gradient(circle at 35% 30%,#fff 0 10%,var(--pc,#ffd25a) 38%,color-mix(in srgb,var(--pc,#ffd25a) 60%,#000) 100%);box-shadow:0 0 0 1.5px #fff,0 0 10px var(--pc,#ffd25a);animation:ynBlSlot .4s cubic-bezier(.3,1.8,.5,1)}
.yn-bl-hd b{font:italic 900 20px/1 'Barlow Condensed','Lilita One',sans-serif;color:#fff;min-width:2.2em}
.yn-bl-yn{flex:none;display:flex;align-items:center;gap:4px;padding:3px 8px 3px 5px;border-radius:6px;background:rgba(255,60,40,.14);box-shadow:inset 0 0 0 1.5px rgba(255,110,90,.45)}
.yn-bl-yn svg{width:14px;height:14px;color:#ff7a66}
.yn-bl-yn b{font:italic 900 18px/1 'Barlow Condensed','Lilita One',sans-serif;color:#ffb4a4}
.yn-bl-yn.bump{animation:ynBlShake .38s}
.yn-bl-rk{flex:1 1 auto;min-width:0;display:flex;justify-content:flex-end;gap:8px;padding-right:6px}
.yn-bl-rk span{position:relative;flex:none;width:28px;height:28px;border-radius:8px;box-shadow:0 0 0 2px var(--pc,#fff)}
.yn-bl-rk span .fl-av{position:absolute;inset:0;border-radius:8px;overflow:hidden}
.yn-bl-rk span .fl-av svg{display:block;width:100%;height:100%}
.yn-bl-rk span em{position:absolute;right:-6px;bottom:-6px;min-width:17px;height:17px;padding:0 3px;border-radius:9px;font:italic 900 12px/17px 'Barlow Condensed',sans-serif;font-style:normal;text-align:center;color:#1a1200;background:#ffd25a;box-shadow:0 0 0 1.5px #0a0d1c}
.yn-bl-rk span em.bump{animation:ynBlSlot .35s cubic-bezier(.3,1.8,.5,1)}
/* gökyüzü */
.yn-bl-sky{position:relative;flex:1 1 auto;min-height:170px;border-radius:16px;overflow:hidden;isolation:isolate;touch-action:manipulation;
  box-shadow:0 0 0 2px rgba(255,255,255,.16),0 12px 28px rgba(0,0,0,.5)}
.yn-bl.t-gunduz .yn-bl-sky{background:radial-gradient(60% 45% at 82% 12%,rgba(255,250,210,.9),rgba(255,240,180,0) 60%),linear-gradient(180deg,#2f7fe6 0%,#6cb6ff 52%,#c8e8ff 100%)}
.yn-bl.t-batim .yn-bl-sky{background:radial-gradient(42% 30% at 50% 78%,rgba(255,220,140,.95),rgba(255,150,80,0) 70%),linear-gradient(180deg,#24195a 0%,#6a2f78 34%,#d9506a 62%,#ff9a4a 82%,#ffcf72 100%)}
.yn-bl.t-gece .yn-bl-sky{background:radial-gradient(70% 40% at 50% 100%,rgba(90,110,220,.4),rgba(90,110,220,0) 70%),linear-gradient(180deg,#040820 0%,#0d1748 58%,#24306e 100%)}
.yn-bl-bg{position:absolute;inset:0;z-index:0;pointer-events:none}
.yn-bl-gunes{position:absolute;right:9%;top:7%;width:15cqw;height:15cqw;max-width:74px;max-height:74px;border-radius:50%;background:radial-gradient(circle,#fffbe6 0 42%,#ffe680 60%,rgba(255,230,128,0) 72%)}
.yn-bl.t-batim .yn-bl-gunes{right:auto;left:50%;top:auto;bottom:16%;width:26cqw;height:26cqw;max-width:130px;max-height:130px;margin-left:-13cqw;background:radial-gradient(circle,#fff4c8 0 30%,#ffc26a 46%,rgba(255,140,60,0) 70%)}
.yn-bl.t-gece .yn-bl-gunes{left:12%;right:auto;top:9%;width:11cqw;height:11cqw;max-width:54px;max-height:54px;background:radial-gradient(circle at 62% 40%,transparent 0 34%,rgba(0,0,0,0) 35%),radial-gradient(circle,#fff8e0 0 46%,rgba(255,248,224,.35) 54%,rgba(255,248,224,0) 70%);
  -webkit-mask:radial-gradient(circle at 66% 36%,transparent 0 31%,#000 33%);mask:radial-gradient(circle at 66% 36%,transparent 0 31%,#000 33%)}
.yn-bl-bulut{position:absolute;left:0;width:30cqw;height:9cqw;border-radius:99px;background:rgba(255,255,255,.85);filter:blur(1.5px);box-shadow:8cqw -3cqw 0 1cqw rgba(255,255,255,.85),17cqw -1cqw 0 .5cqw rgba(255,255,255,.8);animation:ynBlDrift var(--dt,60s) linear infinite;animation-delay:var(--dd,0s)}
.yn-bl.t-batim .yn-bl-bulut{background:rgba(255,170,160,.55);box-shadow:8cqw -2cqw 0 .6cqw rgba(255,170,160,.5),17cqw -1cqw 0 .3cqw rgba(255,190,170,.45);height:4cqw}
.yn-bl-yildiz{position:absolute;inset:0 0 30% 0;background-image:radial-gradient(1.2px 1.2px at 12% 18%,#fff,transparent),radial-gradient(1px 1px at 28% 42%,#fff,transparent),radial-gradient(1.4px 1.4px at 46% 12%,#fff,transparent),radial-gradient(1px 1px at 63% 34%,#fff,transparent),radial-gradient(1.3px 1.3px at 78% 16%,#fff,transparent),radial-gradient(1px 1px at 90% 44%,#fff,transparent),radial-gradient(1.1px 1.1px at 36% 64%,#fff,transparent),radial-gradient(1px 1px at 70% 58%,#fff,transparent),radial-gradient(1.2px 1.2px at 8% 52%,#fff,transparent),radial-gradient(1px 1px at 54% 50%,#fff,transparent);animation:ynBlTwinkle 3.2s ease-in-out infinite alternate}
.yn-bl-ufuk{position:absolute;left:0;right:0;bottom:0;width:100%;height:34%;z-index:1;pointer-events:none}
.yn-bl-ufuk .kanat{animation:ynBlSpin 5s linear infinite}
.yn-bl-ufuk .pen,.yn-bl-ufuk .yak,.yn-bl-ufuk .pir,.yn-bl-ufuk .yol{animation:ynBlTwinkle 2.2s ease-in-out infinite alternate}
.yn-bl-ufuk .fener{animation:ynBlTwinkle 1.1s ease-in-out infinite alternate}
.yn-bl-ufuk .isik{transform-origin:349px 53px;animation:ynBlFener 5s ease-in-out infinite alternate}
.yn-bl-ufuk .yelken{animation:ynBlYelken 26s ease-in-out infinite alternate}
.yn-bl-ufuk .kus{animation:ynBlKus 9s ease-in-out infinite alternate}
.yn-bl-alan{position:absolute;inset:0;z-index:2}
/* balon: düğme = gövde (dokunma alanı); ip ve düğüm gövdenin altında, dokunmaz */
.yn-bl-b{position:absolute;left:0;top:0;width:var(--bw);height:var(--bh);padding:0;margin:0;border:0;background:none;cursor:pointer;will-change:transform;touch-action:manipulation;-webkit-tap-highlight-color:transparent;outline:none}
.yn-bl-b .gv{position:absolute;inset:0;border-radius:50% 50% 50% 50%/58% 58% 42% 42%;
  background:radial-gradient(circle at 32% 26%,rgba(255,255,255,.95) 0 6%,var(--bl) 16%,var(--bc) 48%,var(--bd) 100%);box-shadow:inset -4px -7px 12px rgba(0,0,0,.22),inset 3px 3px 8px rgba(255,255,255,.25)}
.yn-bl-b .gv::before{content:'';position:absolute;left:16%;top:9%;width:30%;height:34%;border-radius:50%;background:radial-gradient(ellipse at 40% 35%,rgba(255,255,255,.9),rgba(255,255,255,0) 70%);transform:rotate(-24deg)}
.yn-bl-b .gv::after{content:'';position:absolute;left:50%;bottom:-5px;width:12px;height:8px;margin-left:-6px;background:var(--bd);clip-path:polygon(50% 0,100% 100%,0 100%);border-radius:2px}
.yn-bl-b .ip{position:absolute;left:50%;top:100%;width:20px;height:var(--sl);margin-left:-10px;overflow:visible;pointer-events:none}
.yn-bl-b .ip path{fill:none;stroke:rgba(255,255,255,.75);stroke-width:1.4}
.yn-bl.t-gunduz .yn-bl-b .ip path{stroke:rgba(30,40,70,.55)}
.yn-bl-b .et{position:absolute;left:50%;top:44%;width:var(--lw,100%);transform:translate(-50%,-50%);display:block;text-align:center;font:italic 800 var(--fs,14px)/1.02 'Barlow Condensed','Fredoka',sans-serif;letter-spacing:.01em;color:var(--bt);
  text-shadow:0 1px 0 var(--bd),0 0 3px var(--bd),0 0 1px var(--bd);overflow-wrap:normal;word-break:keep-all;pointer-events:none;opacity:var(--eo,1)}
.yn-bl.t-gece .yn-bl-b .gv{background:radial-gradient(circle at 50% 62%,rgba(255,240,190,.75) 0 14%,rgba(255,240,190,0) 46%),radial-gradient(circle at 32% 26%,rgba(255,255,255,.95) 0 6%,var(--bl) 16%,var(--bc) 48%,var(--bd) 100%);
  box-shadow:inset -4px -7px 12px rgba(0,0,0,.25),inset 3px 3px 8px rgba(255,255,255,.3),0 0 22px color-mix(in srgb,var(--bc) 75%,transparent),0 0 46px color-mix(in srgb,var(--bc) 35%,transparent)}
.yn-bl-b.pat{pointer-events:none;animation:ynBlPat .12s ease-out forwards}
.yn-bl-b.sondu{pointer-events:none}
.yn-bl-b.sondu .gv{background:radial-gradient(circle at 32% 26%,#ffd0c8 0 6%,#ff6a5a 20%,#d8281a 55%,#7a0a04 100%);animation:ynBlBurus .7s ease-in forwards}
.yn-bl-b.sondu .et{animation:ynBlSil .3s ease-in forwards}
.yn-bl-b.kacti{pointer-events:none}
.yn-bl-b.git{transition:transform .7s cubic-bezier(.5,0,.8,.4),opacity .6s;opacity:0}
/* efekt katmanı (gökyüzünde kırpılır) */
.yn-bl-fx{position:absolute;inset:0;z-index:3;pointer-events:none}
.yn-bl-fx i{position:absolute;left:0;top:0;pointer-events:none}
.yn-bl-fx .kf{width:var(--s);height:calc(var(--s) * .55);border-radius:1.5px;background:var(--c);animation:ynBlKonfeti var(--lt,1.1s) cubic-bezier(.2,.65,.4,1) forwards}
.yn-bl-fx .kf.y{height:var(--s);border-radius:50%}
.yn-bl-fx .lp{width:calc(var(--s) * 1.6);height:var(--s);border-radius:60% 40% 70% 30%/50% 60% 40% 50%;background:var(--c);animation:ynBlKonfeti .75s cubic-bezier(.25,.6,.5,1) forwards}
.yn-bl-fx .hl{width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;border:3px solid var(--c);animation:ynBlHalka .45s ease-out forwards}
.yn-bl-fx .fl{width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:radial-gradient(circle,#fff 0 18%,rgba(255,250,220,.75) 34%,rgba(255,240,180,0) 68%);animation:ynBlFlas .28s ease-out forwards}
.yn-bl-fx .pf{width:var(--s);height:var(--s);margin:calc(var(--s) / -2) 0 0 calc(var(--s) / -2);border-radius:50%;background:rgba(255,255,255,.75);animation:ynBlPuf .6s ease-out forwards}
.yn-bl-sky.kirmizi::after{content:'';position:absolute;inset:0;z-index:6;pointer-events:none;border-radius:16px;box-shadow:inset 0 0 0 3px rgba(255,70,50,.85),inset 0 0 40px rgba(255,40,20,.55);animation:ynBlKirmizi .45s ease-out forwards}
.yn-bl-fx .yz{transform:translate(-50%,-50%);font:italic 900 26px/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.03em;white-space:nowrap;color:#ffd25a;
  text-shadow:0 2px 0 #5a2a00,0 0 10px rgba(255,190,60,.6);animation:ynBlYazi .9s cubic-bezier(.2,.8,.3,1) forwards}
.yn-bl-fx .yz.bg{font-size:34px;color:#fff3b0;text-shadow:0 3px 0 #5a2a00,0 0 18px rgba(255,200,60,.9)}
.yn-bl-sky.seri::before{content:'';position:absolute;inset:0;z-index:6;pointer-events:none;border-radius:16px;box-shadow:inset 0 0 0 3px rgba(255,214,90,.95),inset 0 0 46px rgba(255,200,60,.6);animation:ynBlKirmizi .9s ease-out forwards}
.yn-bl-fx .yz.no{color:#ff7a66;text-shadow:0 2px 0 #5a0a04,0 0 10px rgba(255,60,40,.6)}
.yn-bl-fx .kc{transform:translate(-50%,0);padding:2px 7px;border-radius:5px;font:italic 900 11px/1.2 'Barlow Condensed',sans-serif;letter-spacing:.12em;color:#fff;background:rgba(200,40,30,.85);animation:ynBlKacti 1.1s ease-out forwards}
/* başlangıç ve "HEPSİ" yazısı */
.yn-bl-msg{position:absolute;left:50%;top:42%;z-index:4;transform:translate(-50%,-50%) scale(.5) skewX(-8deg);opacity:0;pointer-events:none;white-space:nowrap;
  font:italic 900 min(12cqw,48px)/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.04em;color:#fff;text-shadow:0 4px 0 rgba(0,0,0,.45),0 0 24px rgba(0,0,0,.4)}
.yn-bl-msg.on{animation:ynBlMsg 1s cubic-bezier(.3,1.6,.5,1) forwards}
.yn-bl-msg.gold{color:#ffd25a;text-shadow:0 4px 0 #6a3a00,0 0 26px rgba(255,200,80,.8)}
.yn-bl-sky.shake{animation:ynBlSkyShake .3s}
.yn-bl-bitti{position:absolute;left:50%;top:44%;z-index:5;display:flex;flex-direction:column;align-items:center;gap:8px;transform:translate(-50%,-50%);animation:ynBlIn .3s ease-out both}
.yn-bl-bitti b{font:italic 900 min(10cqw,40px)/1 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.04em;color:#fff;text-shadow:0 4px 0 rgba(0,0,0,.45),0 0 20px rgba(0,0,0,.4);white-space:nowrap}
.yn-bl-bitti small{padding:3px 10px;border-radius:999px;font:600 13px/1.2 'Fredoka',sans-serif;color:#fff;background:rgba(8,12,30,.7);white-space:nowrap}
.yn-bl-bitti .fl-send{min-width:150px;height:46px;padding:0 18px}
/* cevap: sonuç tahtası (doğru balonlar ve herkesin sayımı) */
.yn-bl-son{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;justify-content:center;gap:max(6px,2.2cqw);padding:10px 10px 12px;opacity:0;pointer-events:none;
  background:linear-gradient(180deg,rgba(5,8,24,.55),rgba(5,8,24,.78))}
.yn-bl.rv .yn-bl-son{animation:ynBlIn .45s .35s ease-out both}
.yn-bl-son h5{margin:0;text-align:center;font:italic 800 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.2em;color:rgba(255,255,255,.8)}
.yn-bl-son h5 em{font-style:normal;color:#ffd25a;letter-spacing:.12em}
/* açıklama: tuzaklar neden yanlış, şaşırtıcı doğrular neden doğru (en çok iki satır) */
.yn-bl-not{margin:0 auto;max-width:min(100%,46ch);padding:5px 10px 6px;text-align:center;font:500 13px/1.3 'Fredoka',sans-serif;color:rgba(255,242,215,.95);text-wrap:balance;
  background:rgba(8,12,30,.72);box-shadow:inset 0 0 0 1px rgba(255,210,90,.38);border-radius:8px;animation:ynBlIn .45s .95s ease-out both}
.yn-bl-tr .pt{margin-left:auto;min-width:2.2em;justify-content:flex-end;font:italic 900 22px/1 'Barlow Condensed','Lilita One',sans-serif;color:#ffe7a0}
.yn-bl-tr.win .pt{color:#1a1200}
.yn-bl-dg{display:flex;justify-content:center;align-items:flex-start;gap:var(--g,10px)}
.yn-bl-dk{position:relative;flex:0 0 var(--sw);display:flex;flex-direction:column;align-items:center;gap:5px;animation:ynBlUp .55s calc(.45s + var(--k) * .08s) cubic-bezier(.2,.9,.3,1.25) both}
.yn-bl-dk .bb{position:relative;width:var(--sw);height:calc(var(--sw) * 1.18);border-radius:50% 50% 50% 50%/58% 58% 42% 42%;
  background:radial-gradient(circle at 32% 26%,rgba(255,255,255,.95) 0 6%,var(--bl) 16%,var(--bc) 48%,var(--bd) 100%);box-shadow:inset -4px -7px 12px rgba(0,0,0,.22)}
.yn-bl-dk .bb::before{content:'';position:absolute;left:16%;top:9%;width:30%;height:34%;border-radius:50%;background:radial-gradient(ellipse at 40% 35%,rgba(255,255,255,.85),rgba(255,255,255,0) 70%);transform:rotate(-24deg)}
.yn-bl-dk .bb::after{content:'';position:absolute;left:50%;bottom:-5px;width:10px;height:7px;margin-left:-5px;background:var(--bd);clip-path:polygon(50% 0,100% 100%,0 100%)}
.yn-bl-dk .bb b{position:absolute;left:50%;top:44%;width:var(--lw,100%);transform:translate(-50%,-50%);text-align:center;font:italic 800 var(--fs,13px)/1.02 'Barlow Condensed',sans-serif;color:var(--bt);text-shadow:0 1px 0 var(--bd),0 0 3px var(--bd)}
.yn-bl-dk.kac .bb{opacity:.5;filter:saturate(.55)}
.yn-bl-dk.vur .bb{box-shadow:inset -4px -7px 12px rgba(0,0,0,.22),0 0 0 3px #0a0d1c,0 0 0 5.5px #3bd16f,0 0 18px rgba(60,210,110,.7)}
.yn-bl-dk.vur::after{content:'';position:absolute;right:-3px;top:-3px;width:20px;height:20px;border-radius:50%;background:#22b85a url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5' fill='none' stroke='%23fff' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/14px no-repeat;box-shadow:0 0 0 2px #0a0d1c}
.yn-bl-dk .tg{padding:1px 6px;border-radius:4px;font:italic 900 10.5px/1.25 'Barlow Condensed',sans-serif;letter-spacing:.12em;white-space:nowrap;color:#1a1200;background:#ffd25a}
.yn-bl-dk .tg.ok{color:#fff;background:#22b85a}
.yn-bl-dk .av{display:flex;justify-content:center;gap:2px;min-height:18px}
.yn-bl-dk .av .fl-av{width:18px;height:18px;border-radius:5px;overflow:hidden;box-shadow:0 0 0 1.5px #fff}
.yn-bl-dk .av .fl-av svg{display:block;width:100%;height:100%}
.yn-bl-tl{display:grid;grid-template-columns:1fr;gap:5px 10px}
.yn-bl-tl.two{grid-template-columns:1fr 1fr}
.yn-bl-tl.two .yn-bl-tr{justify-content:space-between;padding-right:12px}
.yn-bl-tr{display:flex;align-items:center;gap:8px;min-height:30px;padding:0 10px 0 0;transform:skewX(-8deg);background:rgba(10,12,24,.88);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35);animation:ynBlRow .4s calc(.7s + var(--k) * .1s) cubic-bezier(.2,.9,.3,1.2) both}
.yn-bl-tr>*{transform:skewX(8deg)}
.yn-bl-tr .rk{align-self:stretch;width:28px;display:grid;place-items:center;transform:none;background:var(--c);font:italic 900 17px/1 'Barlow Condensed','Lilita One',sans-serif;color:#fff}
.yn-bl-tr .fl-av{flex:none;width:24px;height:24px;border-radius:6px;overflow:hidden;box-shadow:0 0 0 1.5px #fff}
.yn-bl-tr .fl-av svg{display:block;width:100%;height:100%}
.yn-bl-tr b{flex:1 1 auto;min-width:0;font:700 15px/1.1 'Fredoka',sans-serif;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:clip}
.yn-bl-tr span{flex:none;display:flex;align-items:center;gap:3px;font:italic 900 16px/1 'Barlow Condensed','Lilita One',sans-serif;color:#fff}
.yn-bl-tr span svg{width:13px;height:13px}
.yn-bl-tr span.ok svg{color:#7dff9a}.yn-bl-tr span.no svg{color:#ff7a66}.yn-bl-tr span.ms svg{color:#ffd25a}
.yn-bl-tr.win{background:linear-gradient(90deg,#ffe066,#ffbb1f);box-shadow:inset 0 0 0 1.5px #fff,0 0 16px rgba(255,210,90,.5)}
.yn-bl-tr.win b,.yn-bl-tr.win span{color:#1a1200}
.yn-bl-tr.win span.ok svg{color:#137a35}.yn-bl-tr.win span.no svg{color:#b8261a}.yn-bl-tr.win span.ms svg{color:#7a5200}
.yn-bl-tr.me{box-shadow:inset 0 0 0 2px #ffd25a}
.yn-bl-tr.me.win{box-shadow:inset 0 0 0 2px #fff,0 0 16px rgba(255,210,90,.5)}
@container (max-width:370px){
  .yn-bl-hd small,.yn-bl-yn small{display:none}
  .yn-bl-hd>span{gap:3px}
  .yn-bl-hd>span i{width:13px;height:17px}
  .yn-bl-hud{gap:8px}
}
@media (max-height:700px){
  .yn-bl{gap:5px}
  .yn-bl-hud{min-height:28px}
  .yn-bl-rk span{width:24px;height:24px}
  .yn-bl-tr{min-height:26px}
  .yn-bl-tr .fl-av{width:20px;height:20px}
  .yn-bl-tr b{font-size:13.5px}
  .yn-bl-not{font-size:12px;padding:4px 8px 5px}
}
@keyframes ynBlSlot{0%{transform:scale(1.6)}100%{transform:none}}
@keyframes ynBlShake{20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
@keyframes ynBlSkyShake{25%{transform:translate(3px,-2px)}50%{transform:translate(-3px,2px)}75%{transform:translate(2px,1px)}}
@keyframes ynBlDrift{from{transform:translateX(-40cqw)}to{transform:translateX(110cqw)}}
@keyframes ynBlTwinkle{from{opacity:.55}to{opacity:1}}
@keyframes ynBlSpin{to{transform:rotate(360deg)}}
@keyframes ynBlFener{from{transform:rotate(-14deg)}to{transform:rotate(10deg)}}
@keyframes ynBlYelken{from{transform:translateX(-60px)}to{transform:translateX(70px)}}
@keyframes ynBlKus{from{transform:translate(0,0)}to{transform:translate(40px,-10px)}}
@keyframes ynBlPat{0%{transform:var(--tr) scale(1)}100%{transform:var(--tr) scale(1.32);opacity:0}}
@keyframes ynBlBurus{0%{transform:none}15%{transform:scale(1.06,.94)}30%{transform:scale(.88,1.04) rotate(-6deg)}50%{transform:scale(.72,.8) rotate(9deg)}70%{transform:scale(.55,.62) rotate(-12deg)}100%{transform:scale(.3,.34) rotate(20deg);opacity:.0}}
@keyframes ynBlSil{to{opacity:0}}
@keyframes ynBlKonfeti{0%{opacity:1;transform:translate(var(--x0),var(--y0)) rotate(0)}100%{opacity:0;transform:translate(var(--x1),var(--y1)) rotate(var(--r))}}
@keyframes ynBlFlas{0%{opacity:1;transform:translate(var(--x0),var(--y0)) scale(.4)}100%{opacity:0;transform:translate(var(--x0),var(--y0)) scale(1.7)}}
@keyframes ynBlPuf{0%{opacity:.85;transform:translate(var(--x0),var(--y0)) scale(.5)}100%{opacity:0;transform:translate(var(--x1),var(--y1)) scale(1.6)}}
@keyframes ynBlKirmizi{0%{opacity:1}100%{opacity:0}}
@keyframes ynBlHalka{0%{opacity:1;transform:translate(var(--x0),var(--y0)) scale(.5)}100%{opacity:0;transform:translate(var(--x0),var(--y0)) scale(5.5)}}
@keyframes ynBlYazi{0%{opacity:0;transform:translate(calc(var(--x0) - 50%),calc(var(--y0) - 50%)) scale(.6)}20%{opacity:1;transform:translate(calc(var(--x0) - 50%),calc(var(--y0) - 50%)) scale(1.15)}100%{opacity:0;transform:translate(calc(var(--x0) - 50%),calc(var(--y0) - 50% - 38px)) scale(1)}}
@keyframes ynBlKacti{0%{opacity:0;transform:translate(calc(var(--x0) - 50%),var(--y0)) scale(.7)}15%{opacity:1;transform:translate(calc(var(--x0) - 50%),var(--y0)) scale(1)}75%{opacity:1}100%{opacity:0;transform:translate(calc(var(--x0) - 50%),var(--y0))}}
@keyframes ynBlMsg{0%{opacity:0;transform:translate(-50%,-50%) scale(.5) skewX(-8deg)}25%{opacity:1;transform:translate(-50%,-50%) scale(1.08) skewX(-8deg)}70%{opacity:1;transform:translate(-50%,-50%) scale(1) skewX(-8deg)}100%{opacity:0;transform:translate(-50%,-60%) scale(1) skewX(-8deg)}}
@keyframes ynBlIn{from{opacity:0}to{opacity:1}}
@keyframes ynBlUp{0%{opacity:0;transform:translateY(40px) scale(.7)}100%{opacity:1;transform:none}}
@keyframes ynBlRow{0%{opacity:0;transform:skewX(-8deg) translateX(-24px)}100%{opacity:1;transform:skewX(-8deg)}}
@media (prefers-reduced-motion:reduce){.yn-bl-bulut,.yn-bl-yildiz,.yn-bl-ufuk *{animation:none!important}}
`;

const NO_I = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/></svg>';
const trUp = (s) => String(s).toLocaleUpperCase('tr-TR');
/**
 * Etiketin yazı boyu: en uzun kelime maxW'ye sığsın (Barlow Condensed 800 italik, harf başına ~0,46 em). Yazı gövdeden biraz
 * taşabilir ama komşu şeridin yazısına hiç ulaşmaz (maxW = şerit − iki salınım − pay).
 */
const fsOf = (w, maxW, cap) => {
	const L = Math.max(4, ...String(w).split(/\s+/).map((x) => [...x].length));
	return clamp(maxW / (L * 0.46), 9.5, cap);
};
const avOf = (card, p) => {
	const html = p?.i != null ? card?.querySelector(`.fl-qwho .fl-qp[data-p="${p.i}"] .fl-av`)?.innerHTML : '';
	return `<span class="fl-av">${html || esc([...String(p?.name || '?')][0] || '?')}</span>`;
};

let LIVE = 0;

export const balon = {
	time: 16,
	label: 'Balon Patlat',
	kind: 'closest',
	cover: true, // tam ekran gökyüzü (harita gizli)
	calm: true, // harita arkada durgun (klasik tiplerle aynı işaret)
	noJoker: true, // sabit tur: joker yok (bkz. baş)
	jokers: [],
	rule: 'Kurala uyanı patlat',
	revealMs: 3000,
	fmt: (v, value) => `${sayim(v, value).ok}/${v.n} balon`,
	sub: (v, value) => {
		const s = sayim(v, value);
		return s.bad ? `${s.bad} yanlış` : s.miss ? `${s.miss} kaçtı` : 'hatasız';
	},
	prepare(q, R) {
		const P = plan(q, R);
		const v = { q, ...P };
		return stamp(v, q, (q2, k, P2, text) => {
			for (const b of P.b) text(b.w, 0.5); // etiketler uçarken okunur (yarısı göz ucuyla)
			return {
				wait: 0.5 + P.end, // tur: son balon tepeden çıkana dek
				look: LOOK.orient + LOOK.gaze * 2,
				think: 0,
				act: P.n * ACT.tap,
			};
		});
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('balon', CSS);
		const app = appOf();
		const me = ++LIVE;
		const q = v.q;
		const card = el.closest('.fl-q');
		const sesA = sesOf(app);
		const cur = app?.match?.cur;
		const human = cur?.who?.find((p) => p.human) || app?.match?.humanPlayer || null;
		const pc = human?.css || '#ffd25a';
		const foes = (cur?.bots || []).filter((b) => b?.p && b.p !== human).slice(0, 3);
		const tema = ['gunduz', 'batim', 'gece'].includes(q.tema) ? q.tema : 'gunduz';
		const ufuk = q.ufuk || (tema === 'gece' ? 'istanbul' : tema === 'batim' ? 'kiyi' : 'ege');
		const clouds = tema === 'gece' ? '' : [[14, 70, 0], [34, 95, -30], [8, 120, -75]].map(([y, dt, dd]) => `<i class="yn-bl-bulut" style="top:${y}%;--dt:${dt}s;--dd:${dd}s"></i>`).join('');
		el.innerHTML = `<div class="yn-bl t-${tema}" style="--pc:${esc(pc)}">
			<div class="yn-bl-hud">
				<div class="yn-bl-hd"><small>DOĞRU</small><span>${'<i></i>'.repeat(v.n)}</span><b>0/${v.n}</b></div>
				<div class="yn-bl-yn">${NO_I}<b>0</b><small>YANLIŞ</small></div>
				<div class="yn-bl-rk">${foes.map((b) => `<span data-p="${b.p.i}" style="--pc:${esc(b.p.css || '#888')}">${avOf(card, b.p)}<em>0</em></span>`).join('')}</div>
			</div>
			<div class="yn-bl-sky">
				<div class="yn-bl-bg">${tema === 'gece' ? '<i class="yn-bl-yildiz"></i>' : ''}<i class="yn-bl-gunes"></i>${clouds}</div>
				${ufukSVG(ufuk)}
				<div class="yn-bl-alan"></div>
				<div class="yn-bl-fx"></div>
				<div class="yn-bl-msg"></div>
				<div class="yn-bl-son"></div>
			</div>
		</div>`;
		rule(el, 'Kurala uyanı patlat');
		const root = el.querySelector('.yn-bl');
		const sky = root.querySelector('.yn-bl-sky');
		const alan = root.querySelector('.yn-bl-alan');
		const fx = root.querySelector('.yn-bl-fx');
		const msg = root.querySelector('.yn-bl-msg');
		const son = root.querySelector('.yn-bl-son');
		const slots = [...root.querySelectorAll('.yn-bl-hd>span i')];
		const hdB = root.querySelector('.yn-bl-hd b');
		const yn = root.querySelector('.yn-bl-yn');
		const ynB = yn.querySelector('b');
		const rk = new Map([...root.querySelectorAll('.yn-bl-rk span')].map((s) => [Number(s.dataset.p), s.querySelector('em')]));
		// ölçüler: gökyüzü boyu, şerit genişliği, balon boyu (ilk karede ve boy değişince)
		let Wc = 0;
		let Hc = 0;
		let bw = 60;
		let bh = 71;
		let sl = 36;
		let sway = 6;
		let labW = 56;
		const lanes = [];
		const measure = () => {
			const w = sky.clientWidth;
			const h = sky.clientHeight;
			if (!w || !h || (w === Wc && h === Hc)) return;
			Wc = w;
			Hc = h;
			const pad = 6;
			const lw = (Wc - pad * 2) / TUR.serit;
			sway = clamp(lw * 0.07, 3, 7);
			bw = Math.round(clamp(lw - sway * 2 - 8, 44, 80));
			bh = Math.round(bw * 1.18);
			labW = lw - sway * 2 - 4;
			sl = Math.round(clamp(bh * 0.5, 22, 42));
			lanes.length = 0;
			for (let l = 0; l < TUR.serit; l++) lanes.push(pad + lw * (l + 0.5));
			for (const B of balls) {
				B.el.style.setProperty('--bw', bw + 'px');
				B.el.style.setProperty('--bh', bh + 'px');
				B.el.style.setProperty('--sl', sl + 'px');
				B.el.style.setProperty('--fs', fsOf(B.b.w, labW, bw * 0.3).toFixed(1) + 'px');
				B.el.style.setProperty('--lw', labW.toFixed(1) + 'px');
			}
		};
		// balonlar (DOM bir kez kurulur; konum her karede transform)
		const balls = v.b.map((b, k) => {
			const [c0, c1, c2, ct] = RENK[b.c % RENK.length];
			const e = document.createElement('button');
			e.className = 'yn-bl-b';
			e.type = 'button';
			e.dataset.k = String(k);
			e.setAttribute('aria-label', b.w);
			e.style.cssText = `--bc:${c0};--bd:${c1};--bl:${c2};--bt:${ct};visibility:hidden`;
			e.innerHTML = `<i class="gv"></i><svg class="ip" viewBox="0 0 20 40" preserveAspectRatio="none"><path d="M10,0 C4,10 16,22 10,40"/></svg><b class="et">${esc(b.w)}</b>`;
			alan.appendChild(e);
			return { b, k, el: e, ip: e.querySelector('.ip path'), et: e.querySelector('.et'), state: 0, x: 0, y: 0 };
		});
		measure();
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null;
		ro?.observe(sky);
		// ---------------------------------------------------------------- durum
		let t0 = 0;
		let raf = 0;
		let done = false;
		let locked = false;
		let seri = 0;
		let hits = 0;
		let bad = 0;
		const pops = [];
		const timers = [];
		const later = (fn, ms) => timers.push(setTimeout(fn, ms));
		const now = () => (t0 ? (clock.now() - t0) / 1000 : 0);
		const finish = () => {
			if (done) return;
			done = true;
			bitti?.remove();
			api.answer({ p: pops.slice() });
		};
		// süre sınırsızken (galerinin inceleme kipi: saat 60 sn'yi aşar) tur bitince sonuç oyuncunun dokunuşunu bekler
		const bekle = (Number(v.sec) || 16) > 60;
		let bitti = null;
		const turBitti = () => {
			if (bitti || done) return;
			bitti = document.createElement('div');
			bitti.className = 'yn-bl-bitti';
			bitti.innerHTML = `<b>TUR BİTTİ</b><small>${hits}/${v.n} doğru · ${bad} yanlış</small><button type="button" class="fl-send">SONUCU GÖR</button>`;
			bitti.querySelector('button').addEventListener('click', finish);
			sky.appendChild(bitti);
		};
		// efektler (gökyüzü biriminde)
		const add = (cls, x, y, style, life) => {
			const e = document.createElement('i');
			e.className = cls;
			e.style.cssText = `--x0:${x.toFixed(1)}px;--y0:${y.toFixed(1)}px;${style}`;
			fx.appendChild(e);
			later(() => e.remove(), life + 80);
			return e;
		};
		const confetti = (x, y, col) => {
			const cols = [pc, '#ffd25a', '#ffffff', col, '#7dff9a', '#6ac8ff'];
			const n = 32;
			add('fl', x, y, '', 300);
			for (let i = 0; i < n; i++) {
				const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
				const d = 46 + Math.random() * 64;
				const x1 = x + Math.cos(a) * d;
				const y1 = y + Math.sin(a) * d * 0.8 + 50 + Math.random() * 70; // dışa saçılır, sonra süzülerek düşer
				const s = 5 + Math.random() * 5;
				const lt = 900 + Math.random() * 500;
				add(`kf${i % 3 ? '' : ' y'}`, x, y, `--x1:${x1.toFixed(0)}px;--y1:${y1.toFixed(0)}px;--r:${Math.round(360 + Math.random() * 540)}deg;--s:${s.toFixed(1)}px;--c:${cols[i % cols.length]};--lt:${lt.toFixed(0)}ms`, lt);
			}
			for (let i = 0; i < 8; i++) {
				const a = (i / 8) * Math.PI * 2 + 0.3;
				const d = 26 + Math.random() * 26;
				add('lp', x, y, `--x1:${(x + Math.cos(a) * d).toFixed(0)}px;--y1:${(y + Math.sin(a) * d + 28).toFixed(0)}px;--r:${Math.round(Math.random() * 400 - 200)}deg;--s:${(6 + Math.random() * 4).toFixed(1)}px;--c:${col}`, 760);
			}
			add('hl', x, y, `--c:${col}`, 460);
		};
		const yazi = (x, y, text, no = false, buyuk = false) => {
			const e = add(`yz${no ? ' no' : ''}${buyuk ? ' bg' : ''}`, x, y, '', 900);
			e.textContent = text;
		};
		const say = (text, gold = false) => {
			msg.textContent = text;
			msg.className = `yn-bl-msg${gold ? ' gold' : ''}`;
			void msg.offsetWidth;
			msg.classList.add('on');
		};
		const hud = () => {
			slots.forEach((s, i) => s.classList.toggle('on', i < hits));
			hdB.textContent = `${hits}/${v.n}`;
			ynB.textContent = String(bad);
		};
		// ---------------------------------------------------------------- dokunuş
		const popBall = (B) => {
			if (done || locked || B.state !== 1) return;
			const t = now();
			B.state = 2;
			pops.push([B.k, Math.round(t * 100) / 100]);
			const cx = B.x + bw / 2;
			const cy = B.y + bh * 0.45;
			const pan = clamp((cx / Math.max(1, Wc)) * 2 - 1, -0.8, 0.8);
			if (B.b.ok) {
				hits++;
				seri++;
				B.el.classList.add('pat');
				confetti(cx, cy, RENK[B.b.c % RENK.length][0]);
				yazi(cx, cy - bh * 0.2, seri >= 2 ? `SERİ ×${seri}` : '+1', false, seri >= 3);
				if (seri >= 3) {
					sky.classList.remove('seri');
					void sky.offsetWidth;
					sky.classList.add('seri');
				}
				sesA.pat(seri - 1, pan);
				buzz(12);
				later(() => (B.el.style.display = 'none'), 140);
				hud();
				if (hits >= v.n) {
					// hepsi bulundu: kutla, kısa bir an sonra bitir (tur boyu beklemez)
					later(() => {
						say('HEPSİ!', true);
						sesA.hepsi();
						// iki alt köşeden konfeti topları ve altın kenar
						for (const [x, d] of [[Wc * 0.12, 0], [Wc * 0.88, 120], [Wc * 0.3, 240], [Wc * 0.7, 360]]) later(() => confetti(x, Hc * 0.86, '#ffd25a'), d);
						sky.classList.remove('seri');
						void sky.offsetWidth;
						sky.classList.add('seri');
					}, 220);
					later(finish, 900);
				}
			} else {
				bad++;
				seri = 0;
				B.el.classList.add('sondu');
				B.fall = { t, x: B.x, y: B.y, dir: cx > Wc / 2 ? -1 : 1 };
				yazi(cx, cy - bh * 0.2, '−1', true);
				sesA.sondu(pan);
				buzz([30, 30, 40]);
				yn.classList.remove('bump');
				void yn.offsetWidth;
				yn.classList.add('bump');
				sky.classList.remove('shake', 'kirmizi');
				void sky.offsetWidth;
				sky.classList.add('shake', 'kirmizi');
				for (let i = 0; i < 5; i++) later(() => B.fall && add('pf', B.x + bw / 2, B.y + bh * 0.9, `--x1:${(B.x + bw / 2 - B.fall.dir * (20 + i * 6)).toFixed(0)}px;--y1:${(B.y + bh + 18).toFixed(0)}px;--s:${(8 + i * 2).toFixed(0)}px`, 620), 60 + i * 110);
				hud();
			}
		};
		sky.addEventListener('pointerdown', (ev) => {
			const e = ev.target.closest?.('.yn-bl-b');
			if (!e) return;
			ev.preventDefault();
			popBall(balls[Number(e.dataset.k)]);
		});
		// klavye ile (erişilebilirlik): odaktaki balonu Enter/boşluk patlatır
		sky.addEventListener('click', (ev) => {
			if (ev.detail !== 0) return; // fare/dokunuş zaten pointerdown'da
			const e = ev.target.closest?.('.yn-bl-b');
			if (e) popBall(balls[Number(e.dataset.k)]);
		});
		// ---------------------------------------------------------------- uçuş
		const foeAt = new Map(foes.map((b) => [b.p.i, (b.value?.p || []).map(([k, t]) => [t, v.b[k]?.ok ? 1 : 0]).filter(([, ok]) => ok).map(([t]) => t).sort((a, b) => a - b)]));
		const foeN = new Map();
		const frame = () => {
			raf = 0;
			if (LIVE !== me || !el.isConnected) return;
			const t = now();
			let alive = 0;
			for (const B of balls) {
				const b = B.b;
				if ((B.state === 2 && !B.fall) || B.state === 3) continue;
				const u = (t - b.t) / b.d;
				const D = Hc + bh + sl + 12;
				if (B.fall) {
					// sönen balon: zikzak çizip düşer
					const k = t - B.fall.t;
					if (k > 0.9) {
						B.el.style.display = 'none';
						B.fall = null;
						continue;
					}
					const x = B.fall.x + B.fall.dir * (k * 60 + Math.sin(k * 26) * 10);
					const y = B.fall.y - Math.sin(Math.min(1, k * 3) * Math.PI) * 18 + k * k * 260;
					B.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${(B.fall.dir * k * 160).toFixed(0)}deg)`;
					alive++;
					continue;
				}
				if (u < 0) {
					alive++;
					continue;
				}
				if (u >= 1) {
					if (B.state === 1) {
						B.state = 3;
						B.el.classList.add('kacti');
						B.el.style.visibility = 'hidden';
						if (b.ok && !done) {
							seri = 0;
							const e = add('kc', lanes[b.l] ?? Wc / 2, 4, '', 1100);
							e.textContent = 'KAÇTI';
							sesA.kacti(clamp(((lanes[b.l] ?? 0) / Math.max(1, Wc)) * 2 - 1, -0.8, 0.8));
						}
					}
					continue;
				}
				alive++;
				if (B.state === 0) {
					B.state = 1;
					B.el.style.visibility = '';
				}
				const ph = b.ph + t * b.fr * 2.1;
				const sx = Math.sin(ph) * sway * b.sw;
				const x = (lanes[b.l] ?? Wc / 2) - bw / 2 + sx;
				const y = Hc + 6 - u * D;
				B.x = x;
				B.y = y;
				const rot = Math.cos(ph) * 4 * b.sw;
				const tr = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rot.toFixed(1)}deg)`;
				B.el.style.transform = tr;
				B.el.style.setProperty('--tr', tr);
				// ip: salınımın tersine kıvrılır
				B.ip.setAttribute('d', `M10,0 C${(10 - sx * 0.8).toFixed(1)},12 ${(10 + sx * 0.9).toFixed(1)},26 ${(10 + Math.sin(ph - 1) * 4).toFixed(1)},40`);
				// etiket: gökyüzünün kenarına değmeden söner (kesik yazı olmasın)
				const lt = y + bh * 0.2;
				const lb = y + bh * 0.68;
				const eo = clamp(Math.min(lt - 4, Hc - 4 - lb) / 14, 0, 1);
				if (B.eo !== eo) {
					B.eo = eo;
					B.et.style.setProperty('--eo', eo.toFixed(2));
				}
			}
			// rakiplerin canlı sayımı
			for (const [i, list] of foeAt) {
				let n = 0;
				while (n < list.length && list[n] <= t) n++;
				if (foeN.get(i) !== n) {
					foeN.set(i, n);
					const em = rk.get(i);
					if (em) {
						em.textContent = String(n);
						em.classList.remove('bump');
						void em.offsetWidth;
						em.classList.add('bump');
					}
				}
			}
			if (!done && t > v.end + 0.15 && !balls.some((B) => B.fall)) {
				if (bekle) turBitti();
				else finish();
			}
			if (!done || alive) raf = requestAnimationFrame(frame);
		};
		// tam ekran kart haritayı bütünüyle örter: kart oturunca (açılış geçişinden sonra) 3B harita çizilmez, son karesi
		// arkada durur (pil, kare hızı: balonlar ve kazıma düşük telefonda da akıcı). Kart kapanınca sınıfın çizimi geri gelir.
		const noDraw = () => {};
		let drawT = 0;
		const stopOpen = onOpen(el, () => {
			drawT = setTimeout(() => {
				if (LIVE === me && el.isConnected && app && !Object.prototype.hasOwnProperty.call(app, 'render')) app.render = noDraw;
			}, 450);
			t0 = clock.now();
			measure();
			say('PATLAT!');
			sesA.basla();
			raf = requestAnimationFrame(frame);
		});
		const close = onClose(el, () => {
			stopOpen();
			clearTimeout(drawT);
			if (app && app.render === noDraw) delete app.render;
			cancelAnimationFrame(raf);
			ro?.disconnect();
			for (const t of timers) clearTimeout(t);
			if (LIVE === me) LIVE++;
		});
		return {
			lock() {
				locked = true;
			},
			value: () => ({ p: pops.slice() }),
			reveal(results) {
				locked = true;
				done = true;
				bitti?.remove();
				// kalan balonlar hızla kaçar
				for (const B of balls) {
					if (B.state === 1) {
						B.state = 3;
						B.el.style.transform = `translate3d(${B.x.toFixed(1)}px,${(-bh - sl - 40).toFixed(1)}px,0)`;
						B.el.classList.add('git');
					}
				}
				// sonuç tahtası: doğru balonlar (kaçırdığın halkalı) ve sıralı sayım
				const meR = results.find((r) => r.p?.human);
				const cnt = new Map(results.map((r) => [r, sayim(v, r.value)]));
				const order = results.slice().sort((a, b) => a.err - b.err || a.time - b.time);
				const okIdx = v.b.map((b, k) => (b.ok ? k : -1)).filter((k) => k >= 0);
				const n = okIdx.length;
				const W = sky.clientWidth || 300;
				const H = sky.clientHeight || 300;
				const g = clamp(W * 0.03, 8, 14);
				// sayım: 1–2 oyuncu tam satır (ad ile), 3–4 oyuncu iki sütun (portre, sıra, doğru ve yanlış)
				const two = order.length > 2;
				const rows = two ? Math.ceil(order.length / 2) : order.length;
				// balon boyu: genişlik ve yükseklik payına göre. Sabit pay: iç boşluk 22, başlık 12, üç aralık, sütun başına etiket
				// 15 + portre 18 + iki aralık 10, sayım satırları (30 + 5), halka ve parıltı payı 16
				const gv = Math.max(6, W * 0.022);
				const notH = v.q.not ? (W < 360 ? 46 : 38) : 0; // açıklama satırı (en çok iki satır)
				const fixed = 22 + 12 + gv * 2 + 10 + rows * 34 + (rows - 1) * 5 + 16 + notH;
				const sw = Math.round(clamp(Math.min((W - 28 - g * (n - 1)) / n, (H - fixed) / 1.18), 30, 66));
				const mine = meR ? cnt.get(meR).seen : new Set();
				const dg = okIdx
					.map((k, i) => {
						const b = v.b[k];
						const [c0, c1, c2, ct] = RENK[b.c % RENK.length];
						const missed = !!meR && !mine.has(k);
						const vur = !!meR && mine.has(k);
						return `<div class="yn-bl-dk${missed ? ' kac' : ''}${vur ? ' vur' : ''}" style="--sw:${sw}px;--k:${i};--bc:${c0};--bd:${c1};--bl:${c2};--bt:${ct};--fs:${fsOf(b.w, sw + g - 4, sw * 0.3).toFixed(1)}px;--lw:${(sw + g - 4).toFixed(0)}px"><div class="bb"><b>${esc(b.w)}</b></div></div>`;
					})
					.join('');
				const tl = order
					.map((r, k) => {
						const s = cnt.get(r);
						const win = k === 0 && r.value != null;
						return `<div class="yn-bl-tr${win ? ' win' : ''}${r.p?.human ? ' me' : ''}" style="--c:${esc(r.color)};--k:${k}"><span class="rk">${k + 1}</span>${avOf(card, r.p)}${two ? '' : `<b>${esc(r.name)}</b>`}<span class="pt" title="${s.ok} doğru, ${s.bad} yanlış">${s.ok - s.bad > 0 ? '+' : ''}${s.ok - s.bad}</span></div>`;
					})
					.join('');
				if (meR) {
					// üst şerit gönderilen değeri gösterir (sonuç tahtası ve damgayla aynı)
					const s0 = cnt.get(meR);
					hits = s0.ok;
					bad = s0.bad;
					hud();
				}
				son.innerHTML = `<h5>DOĞRU CEVAPLAR</h5><div class="yn-bl-dg" style="--g:${g.toFixed(0)}px">${dg}</div>${v.q.not ? `<p class="yn-bl-not">${esc(v.q.not)}</p>` : ''}<div class="yn-bl-tl${two ? ' two' : ''}">${tl}</div>`;
				root.classList.add('rv');
				msg.classList.remove('on');
				if (meR && app) {
					const s = cnt.get(meR);
					const first = order[0] === meR;
					const sub = [s.bad ? `${s.bad} yanlış` : '', s.miss ? `${s.miss} kaçtı` : ''].filter(Boolean).join(' · ') || 'hatasız';
					const pt = s.ok - s.bad;
					if (meR.value == null) stampLater(app, 'BALON YOK', 'warn', `${v.n} doğru balon kaçtı`);
					else if (s.ok === v.n && !s.bad) stampLater(app, 'HEPSİ!', 'gold', 'Hiç kaçırmadın, hiç yanılmadın');
					else stampLater(app, `${pt > 0 ? '+' : ''}${pt} PUAN`, first ? 'gold' : 'bad', `${s.ok} doğru · ${s.bad} yanlış`);
				}
			},
			destroy: close,
		};
	},
	/** Çevrimiçi görünüm: hangi balonun doğru olduğu yok (dokunuşu sunucu yanıtlar). */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		for (const b of o.b) delete b.ok;
		delete o.q.dogru;
		delete o.q.yanlis;
		return o;
	},
	judge(v, value) {
		if (!value || !Array.isArray(value.p)) return { correct: false, err: Infinity };
		const s = sayim(v, value);
		return { correct: s.ok === v.n && s.bad === 0, err: s.miss + s.bad, ok: s.ok, bad: s.bad, miss: s.miss };
	},
	/** Ortak sınama: bütün doğruları uçuşun ortasında patlatan ve yalnız tuzakları patlatan. */
	ornek(v) {
		const mid = (b) => Math.round((b.t + b.d * 0.5) * 100) / 100;
		return { good: { p: v.b.map((b, k) => (b.ok ? [k, mid(b)] : null)).filter(Boolean) }, bad: { p: v.b.map((b, k) => (b.ok ? null : [k, mid(b)])).filter(Boolean) } };
	},
	bot(v, skill, R) {
		const d = clamp(Number(v.q.diff) || 2, 1, 3);
		const sk = clamp(skill, 0, 1);
		const pHit = clamp(pCorrect(sk, d) + 0.12, 0.12, 0.97);
		const pBad = clamp(0.3 - 0.27 * sk + 0.05 * d, 0.02, 0.45);
		const pops = [];
		// tepki payı botTime'dan (evdeki model: beceriyle kısalır, erkene yatık): bütçedeki yeri 0..1 → 0,35–2,3 sn
		const lo = Number(v.fast) || 3;
		const hi = Math.max(lo + 1, Number(v.slow) || 12);
		for (const [k, b] of v.b.entries()) {
			// balon alt kenardan çıkıp yazısı okununca (uçuşun ~%18'i) tepki
			const u = clamp((botTime(v, R, sk, 0, 1) - lo) / (hi - lo), 0, 1);
			const t = b.t + b.d * 0.18 + 0.35 + u * 1.95;
			if (t > b.t + b.d * 0.92) continue;
			if (R() < (b.ok ? pHit : pBad)) pops.push([k, Math.round(t * 100) / 100]);
		}
		pops.sort((a, b) => a[1] - b[1]);
		// hepsini bulan son doğruyu patlatınca biter (sonrası yok); bulamayan son balona dek bekler
		const oks = pops.filter(([k]) => v.b[k].ok);
		let end = v.end + 0.2;
		let list = pops;
		if (oks.length === v.n && v.n) {
			end = oks[oks.length - 1][1] + 0.9;
			list = pops.filter(([, t]) => t <= oks[oks.length - 1][1]);
		}
		const sec = Number(v.sec) || 16;
		return { value: { p: list }, time: clamp(end, 1.5, sec) };
	},
};
