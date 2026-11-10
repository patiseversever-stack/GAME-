// KELİME AVI (yeni 5 · tam ekran): harf tablosunda (7×7 … 9×9) üç gizli kelime, üstte üç ipucu. Parmağını harflerin
// üstünde düz bir çizgide (yatay, dikey ya da çapraz) kaydır; bırakınca seçim gönderilir. Doğru kelimenin üstünden
// ışık geçer, harfleri sırayla parlar ve ipucuna uçar (ipucu cevabıyla işaretlenir); yanlış seçim kısa bir sarsıntı.
// Süre içinde en çok kelimeyi bulan kazanır; eşit kelimede son kelimesini erken bulan.
//
// Tablo prepare(q, R) içinde kurulur (her oyunda başka dizilim): kelimeler zorluğa göre yönlere yerleşir (kolay: → ↓ ↘,
// orta: + ↗, zor: sekiz yönün hepsi, tersten okunanlar dahil), açılı kesişebilir; boşluklar Türkçe harf sıklığıyla
// dolar. Denetim (kur): her kelime tabloda sekiz yönde okununca TAM BİR kez geçer; dolgu ne başka bir cevap ne de kaba
// bir kelime oluşturur (gerekirse dolgu harfi değişir, olmazsa tablo yeniden kurulur).
//
// Veri: q: tema cümlesi, words: [[KELİME, ipucu], …] (3 kelime, 3–9 harf), n: tablo boyu (yoksa zorluktan: 7, 8, 9).
// Görünüm: grid (satırlar), clues [{ c, len }], words [{ w, r, c, d, len }] (GİZLİ: yerleşim), n.
// Değer: { s: [[r0, c0, r1, c1, t], …] } gönderilen seçimler (başlangıç ve bitiş hücresi, kart açılışından sn). judge
// seçimleri yerleşimle karşılaştırır (kelime iki uçtan da seçilebilir).
// Tür 'closest': üçü de bulunduysa err 0 (eşitlikte saat: üçüncü kelime bulununca cevap hemen gider); değilse
// (3 − bulunan) + son bulunanın saniyesi / 100 (en çok 0,9): az kelime geride, eşit kelimede erken bulan önde.
// Çevrimiçi: publicView yerleşimi taşımaz (harfler ve ipuçları açık); her seçim sunucuya sorulur (act 'kelime'
// { s } → { i } ya da boş), sunucu aynı judge ile sayar.
// Joker: yarı yarıya → bulunmamış kelimelerin ilk harfi parlar; seyirci → her kelimenin geçtiği 3×3 bölge çerçevelenir.

import { css, esc, pCorrect, clamp, buzz, trUp } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, rule, stampLater, sfx, onOpen, onClose, LOOK, ACT } from './d_ortak.js';
import { clock, setTimeout, clearTimeout } from '../core/clock.js';

/** Sekiz yön [dr, dc]: → ↓ ↘ ↗ ← ↑ ↖ ↙ (ilk dördü ileri, d ile d + 4 aynı doğrultu). */
export const DIRS = [
	[0, 1],
	[1, 0],
	[1, 1],
	[-1, 1],
	[0, -1],
	[-1, 0],
	[-1, -1],
	[1, -1],
];
/** Zorluğa göre yerleşim yönleri ve ağırlıkları (orta ve zorda düz soldan sağa az: kelime ilk bakışta okunmasın). */
export const YON = { 1: [0, 1, 2], 2: [0, 1, 2, 3], 3: [0, 1, 2, 3, 4, 5, 6, 7] };
const YON_W = { 1: [1, 1, 0.8], 2: [0.35, 1, 1.2, 1.2], 3: [0.3, 0.5, 0.75, 0.75, 1.25, 1.2, 1, 1] };
/** Kelime renkleri (ipucu, kapsül, cevap): altın, camgöbeği, pembe. */
export const RENK = ['#ffd25a', '#46d8ff', '#ff70b0'];

// Türkçe harf sıklığı (%, yazılı metin): dolgu harfleri bununla çekilir (J, Q, W, X yok)
const HARF = [...'AEİNRLIKDMYUTSBOÜŞZGHÇĞCVPÖF'];
const SIK = [11.92, 8.91, 8.6, 7.49, 6.72, 5.92, 5.11, 4.68, 4.71, 3.75, 3.34, 3.24, 3.01, 3.01, 2.84, 2.48, 1.85, 1.78, 1.5, 1.25, 1.21, 1.16, 0.9, 0.96, 0.96, 0.89, 0.78, 0.46];
const SIK_T = SIK.reduce((a, b) => a + b, 0);
/** Dolgu hiçbir yönde bunları oluşturmaz (aile oyunu). */
export const KABA = ['SİK', 'GÖT', 'PİÇ', 'AMK', 'AMCIK', 'YARRAK', 'OROSPU', 'ORUSPU', 'KAHPE', 'PEZEVENK', 'İBNE', 'GAVAT', 'YAVŞAK', 'TAŞAK', 'SİKİŞ'];

const isLetter = (ch) => ch.toLocaleLowerCase('tr-TR') !== ch.toLocaleUpperCase('tr-TR');
/** Kelimeyi tablo harflerine çevir: büyük Türkçe harf, harf dışı (boşluk, kesme) atılır. */
export const harfler = (w) => [...trUp(String(w ?? ''))].filter(isLetter);

const ix = (n, r, c) => r * n + c;
const inside = (n, r, c) => r >= 0 && c >= 0 && r < n && c < n;

/** Kelimenin tablodaki bütün geçişleri (sekiz yönde okunarak): [{ r, c, d }]. g: düz harf dizisi (n × n). */
export function gecis(g, n, w) {
	const L = Array.isArray(w) ? w : harfler(w);
	const out = [];
	if (L.length < 2) return out;
	for (let r = 0; r < n; r++)
		for (let c = 0; c < n; c++) {
			if (g[ix(n, r, c)] !== L[0]) continue;
			for (let d = 0; d < 8; d++) {
				const [dr, dc] = DIRS[d];
				if (!inside(n, r + dr * (L.length - 1), c + dc * (L.length - 1))) continue;
				let k = 1;
				while (k < L.length && g[ix(n, r + dr * k, c + dc * k)] === L[k]) k++;
				if (k === L.length) out.push({ r, c, d });
			}
		}
	return out;
}

/** Bir geçişin hücreleri (düz dizin). */
const cellsOf = (n, p, len) => Array.from({ length: len }, (_, k) => ix(n, p.r + DIRS[p.d][0] * k, p.c + DIRS[p.d][1] * k));

/** Dolgu harfi (Türkçe sıklıkla). */
function harf(R) {
	let u = R() * SIK_T;
	for (let i = 0; i < HARF.length; i++) if ((u -= SIK[i]) <= 0) return HARF[i];
	return 'A';
}

/** Tablo kuralına uyuyor mu: her kelime tam bir kez (kendi yerinde), hiçbir kaba kelime yok. */
export function denetle(g, n, words, place) {
	for (let i = 0; i < words.length; i++) {
		const occ = gecis(g, n, words[i]);
		const p = place[i];
		if (occ.length !== 1 || occ[0].r !== p.r || occ[0].c !== p.c || occ[0].d !== p.d) return false;
	}
	for (const w of KABA) if (gecis(g, n, w).length) return false;
	return true;
}

/**
 * Tabloyu kur: words (harf dizileri ya da yazı), n boy, dirs izinli yönler, R rastgele. Dönen: { g (düz dizi), place:
 * [{ r, c, d, len }] } ya da null (sığmadı). Belirlenimci (yalnız R kullanılır).
 */
export function kur(words, n, dirs, R, dw = null) {
	const W = words.map((w) => (Array.isArray(w) ? w : harfler(w)));
	for (let tur = 0; tur < 160; tur++) {
		const g = new Array(n * n).fill('');
		const lines = Array.from({ length: n * n }, () => []); // hücreden geçen kelimelerin doğrultuları (d % 4)
		const place = new Array(W.length);
		const order = W.map((_, i) => i).sort((a, b) => W[b].length - W[a].length || a - b);
		const used = new Set();
		let ok = true;
		for (const i of order) {
			const L = W[i];
			const cands = [];
			for (const d of dirs) {
				const [dr, dc] = DIRS[d];
				for (let r = 0; r < n; r++)
					for (let c = 0; c < n; c++) {
						if (!inside(n, r + dr * (L.length - 1), c + dc * (L.length - 1))) continue;
						let ov = 0;
						let bad = false;
						for (let k = 0; k < L.length && !bad; k++) {
							const j = ix(n, r + dr * k, c + dc * k);
							if (!g[j]) continue;
							// ortak harfte açılı kesişme; aynı doğrultuda üst üste binme yok (kelimeler birbirinin içinde kaybolmasın)
							if (g[j] !== L[k] || lines[j].includes(d % 4)) bad = true;
							else ov++;
						}
						if (!bad) cands.push({ r, c, d, ov });
					}
			}
			if (!cands.length) {
				ok = false;
				break;
			}
			// önce yön (zorluğun yön ağırlığı; kullanılmış doğrultu çok az: üç kelime üç ayrı yönde), sonra yer: tek kesişme
			// (tablo derli toplu), kenardan, hele sol üst köşeden ve ilk satırdan başlayan yatay kelime az (göz tabloya oradan
			// girer), aynı doğrultuda yan yana duran kelime az (üst üste üç dikey "NNN / EEE" gibi okunmasın)
			const byD = new Map();
			for (const x of cands) (byD.get(x.d) || byD.set(x.d, []).get(x.d)).push(x);
			const ds = [...byD.keys()];
			const dW = ds.map((d) => (dw ? dw[dirs.indexOf(d)] ?? 1 : 1) * (used.has(d % 4) ? 0.12 : 1));
			const pickW = (arr, wts) => {
				let u = R() * wts.reduce((a, b) => a + b, 0);
				for (let k = 0; k < arr.length; k++) if ((u -= wts[k]) <= 0) return arr[k];
				return arr[arr.length - 1];
			};
			const dd = pickW(ds, dW);
			const inD = byD.get(dd);
			// aynı doğrultudaki bir kelimeye komşu mu (yanında ya da ucunun devamında): ikisi birleşip tek kelime gibi okunmasın
			const side = (x) => {
				const [dr, dc] = DIRS[x.d];
				const near = (r, c) => inside(n, r, c) && lines[ix(n, r, c)].includes(x.d % 4);
				for (let k = 0; k < L.length; k++) {
					const r = x.r + dr * k;
					const c = x.c + dc * k;
					if (near(r - 1, c) || near(r + 1, c) || near(r, c - 1) || near(r, c + 1)) return true;
				}
				return near(x.r - dr, x.c - dc) || near(x.r + dr * L.length, x.c + dc * L.length);
			};
			const wt = inD.map((x) => {
				// göz tabloya sol üstten girer: ilk satırda yatay ve ilk sütunda dikey kelime çok az, köşeden başlayan az
				const edge = (x.r === 0 || x.c === 0 ? 0.6 : 1) * (x.r === 0 && x.c === 0 ? 0.5 : 1) * (x.d % 4 === 0 ? (x.r === 0 ? 0.12 : x.r === n - 1 ? 0.45 : 1) : 1) * (x.d % 4 === 1 && x.c === 0 ? 0.3 : 1);
				return (x.ov === 1 ? 2.4 : x.ov === 0 ? 1 : 0.25) * edge * (side(x) ? 0.15 : 1);
			});
			const pick = pickW(inD, wt);
			const [dr, dc] = DIRS[pick.d];
			for (let k = 0; k < L.length; k++) {
				const j = ix(n, pick.r + dr * k, pick.c + dc * k);
				g[j] = L[k];
				lines[j].push(pick.d % 4);
			}
			used.add(pick.d % 4);
			place[i] = { r: pick.r, c: pick.c, d: pick.d, len: L.length };
		}
		if (!ok) continue;
		const fill = new Set();
		for (let j = 0; j < n * n; j++)
			if (!g[j]) {
				g[j] = harf(R);
				fill.add(j);
			}
		// onarım: kaba kelime ya da fazladan cevap geçişi dolgudan geliyorsa o dolgu harfi değişir
		let clean = false;
		for (let k = 0; k < 60 && !clean; k++) {
			const bad = [];
			for (const w of KABA) for (const p of gecis(g, n, w)) bad.push(cellsOf(n, p, harfler(w).length));
			W.forEach((L, i) => {
				for (const p of gecis(g, n, L)) if (p.r !== place[i].r || p.c !== place[i].c || p.d !== place[i].d) bad.push(cellsOf(n, p, L.length));
			});
			if (!bad.length) clean = true;
			for (const cells of bad) {
				const f = cells.filter((j) => fill.has(j));
				if (!f.length) {
					k = 99; // yalnız kelime harflerinden oluşuyor: onarılamaz, yeniden kur
					break;
				}
				g[f[Math.floor(R() * f.length)]] = harf(R);
			}
		}
		if (clean && denetle(g, n, W, place)) return { g, place };
	}
	return null;
}

/** Küçük, belirlenimci yedek rastgele (tablo kurulamazsa sabit tohumla yeniden). */
function mulberry(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Seçimin hücreleri: düz çizgi değilse ya da tablo dışına çıkıyorsa null. */
export function hat(n, r0, c0, r1, c1) {
	if (![r0, c0, r1, c1].every(Number.isInteger) || !inside(n, r0, c0) || !inside(n, r1, c1)) return null;
	const dr = Math.sign(r1 - r0);
	const dc = Math.sign(c1 - c0);
	const steps = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
	if (dr && dc && Math.abs(r1 - r0) !== Math.abs(c1 - c0)) return null;
	return Array.from({ length: steps + 1 }, (_, k) => [r0 + dr * k, c0 + dc * k]);
}

/** Seçim hangi kelime (iki uçtan da): dizin ya da −1. */
export function kelimeOf(v, r0, c0, r1, c1) {
	const cells = hat(v.n, r0, c0, r1, c1);
	if (!cells || !Array.isArray(v.words)) return -1;
	for (let i = 0; i < v.words.length; i++) {
		const w = v.words[i];
		if (w.len !== cells.length) continue;
		const [dr, dc] = DIRS[w.d];
		const e = [w.r + dr * (w.len - 1), w.c + dc * (w.len - 1)];
		if ((r0 === w.r && c0 === w.c && r1 === e[0] && c1 === e[1]) || (r1 === w.r && c1 === w.c && r0 === e[0] && c0 === e[1])) return i;
	}
	return -1;
}

/** Değerden bulunan kelimeler: { got: Map(kelime → sn), miss, last }. */
export function sayim(v, value) {
	const got = new Map();
	let miss = 0;
	const s = Array.isArray(value?.s) ? value.s.slice(0, 80) : [];
	for (const x of s) {
		if (!Array.isArray(x)) continue;
		const i = kelimeOf(v, x[0], x[1], x[2], x[3]);
		const t = Math.max(0, Number(x[4]) || 0);
		if (i < 0) miss++;
		else if (!got.has(i)) got.set(i, t);
	}
	const last = got.size ? Math.max(...got.values()) : 0;
	return { got, miss, last };
}

const fmtSn = (t) => (Math.round(t * 10) / 10).toLocaleString('tr-TR');

const CSS = /* css */ `
/* AV PANOSU: üstte üç ipucu plakası (renkli numara sekmesi, ipucu, harf sayısı; bulunca cevap ve bulanların portreleri),
   altında pirinç çerçeveli koyu pano ve harf tablosu. Katmanlar: zemin karoları (panonun kendi degradesi) < kapsüller
   (seçim, bulunan kelimeler) < harfler (zeminsiz): harf hiçbir zaman bir kapsülün altında kalmaz. Panoda 1em = bir hücre. */
.fl-q.t-kelimeavi .fl-qbody{padding-top:8px}
/* bildirim (joker, "kalmadı") tam ekran kartın başlığının yerine oturur: başlık o an söner (arayüzün kural göstergesiyle aynı yol) */
.fl-ui.toaston .fl-q.t-kelimeavi .fl-cvt{opacity:0;transition:opacity .15s}
.yn-ka{position:relative;flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:9px;user-select:none;-webkit-user-select:none}
.ka-vd{display:none;flex:none;height:62px}
.yn-ka.rv .ka-vd,.yn-ka.vd .ka-vd{display:block}
.ka-clues{flex:none;display:flex;flex-direction:column;gap:5px}
.ka-clue{position:relative;display:flex;align-items:center;gap:8px;min-height:34px;padding:3px 12px 3px 0;background:linear-gradient(90deg,rgba(255,255,255,.085),rgba(255,255,255,.035));
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.1);clip-path:polygon(0 0,100% 0,calc(100% - 6px) 100%,0 100%);transition:background .3s,box-shadow .3s}
.ka-no{flex:none;align-self:stretch;width:30px;display:grid;place-items:center;font:italic 900 19px/1 'Barlow Condensed','Lilita One',sans-serif;color:#0b0e1c;
  background:var(--wc);clip-path:polygon(0 0,100% 0,78% 100%,0 100%);transition:background .3s}
.ka-ct{flex:1 1 auto;min-width:0;font:600 14.5px/1.15 'Fredoka',sans-serif;color:#eef2ff}
/* ipucundaki boşluk (cevap buraya gelir): kesik yazı sanılmasın diye açık bir boşluk çizgisi */
.ka-blank{display:inline-block;width:2.2em;height:.2em;margin-left:.15em;vertical-align:baseline;border-radius:2px;background:var(--wc);opacity:.85}
.ka-ans{display:none;position:absolute;left:38px;top:50%;transform:translateY(-50%);font:400 18px/1.05 'Lilita One',sans-serif;letter-spacing:.06em;color:var(--wc);text-shadow:0 0 12px color-mix(in srgb,var(--wc) 55%,transparent);white-space:nowrap}
.ka-len{flex:none;padding:3px 7px 2px;border-radius:5px;font:italic 800 12px/1 'Barlow Condensed',sans-serif;letter-spacing:.1em;color:#aeb8de;background:rgba(0,0,0,.35);white-space:nowrap}
/* rakip portreleri: yer baştan ayrılır (rakip sayısına göre), portreler üst üste biner; ipucu yazısı oyunda hiç kaymaz */
.ka-who{display:flex;justify-content:flex-end;flex:none;width:var(--rw,0px)}
.ka-who .ka-av+.ka-av{margin-left:-9px}
.yn-ka.rv .ka-who{width:auto;gap:4px}
.yn-ka.rv .ka-who .ka-av+.ka-av{margin-left:0}
.yn-ka.rv.pm .ka-who{gap:0}
.yn-ka.rv.pm .ka-who .ka-av+.ka-av{margin-left:-6px}
.ka-av{position:relative;width:26px;height:26px;flex:none;border-radius:8px;box-shadow:0 0 0 2px var(--pc),0 2px 0 rgba(0,0,0,.4);overflow:hidden;animation:kaPop .4s cubic-bezier(.3,1.8,.5,1) both}
.ka-av .fl-av{display:block;width:100%;height:100%;border:0;border-radius:0;box-shadow:none;transform:none}
.ka-av.me{box-shadow:0 0 0 2px #ffd25a,0 0 10px rgba(255,210,90,.6)}
/* bulunan ipucu: sekme onay işaretine döner, plaka kelimenin renginde parlar, harf sayısının yerine cevap */
.ka-clue.got{background:linear-gradient(90deg,color-mix(in srgb,var(--wc) 26%,transparent),rgba(255,255,255,.04));box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--wc) 70%,transparent)}
.ka-clue.got .ka-no{font-size:0;background:var(--wc) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4.5 12.5l5 5 10-11' fill='none' stroke='%230b0e1c' stroke-width='3.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 42% 50%/16px no-repeat}
/* oyunda bulunan ipucu: cevap ipucu yazısının üstüne yazılır (satırın boyu, dolayısıyla tablo, hiç değişmez) */
.ka-clue.got .ka-ans{display:block;animation:kaAns .45s cubic-bezier(.3,1.6,.5,1) both}
.ka-clue.got .ka-ct,.ka-clue.got .ka-len{visibility:hidden}
.ka-clue.flash{animation:kaFlash .7s ease-out}
/* cevapta: kelime büyük, ipucu altında küçük, sağda bulanların portreleri; bulamadığın kelime beyaz */
.yn-ka.rv .ka-clue{display:grid;grid-template-columns:30px minmax(0,1fr) auto;grid-template-areas:"no ans who" "no ct who";align-items:center;column-gap:8px;row-gap:2px;padding:4px 12px 4px 0}
.yn-ka.rv .ka-no{grid-area:no}
.yn-ka.rv .ka-ans{grid-area:ans;display:block;position:static;transform:none;animation:none}
.yn-ka.rv .ka-ct{grid-area:ct;font-size:12.5px;color:#aab4d6;visibility:visible}
.yn-ka.rv .ka-who,.yn-ka.rv .ka-none{grid-area:who}
.yn-ka.rv .ka-len{display:none}
.yn-ka.rv .ka-clue:not(.got) .ka-ans{color:#fff;text-shadow:none}
.ka-none{font:italic 800 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.12em;color:#7f88aa;white-space:nowrap}
/* pano */
.ka-board{position:relative;flex:1 1 0;min-height:calc(var(--n) * 21px + 10px);container-type:size;display:grid;place-items:center}
/* sahne ışığı: panonun arkasında yukarıdan düşen soğuk bir hale (pano karanlık arenada aydınlık bir masa gibi). Panonun
   dışına taşmaz: mutlak konumlu taşma gövdeyi kaydırmalı yapıyordu (sığdırıcı küçültemez) */
.ka-board::before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(64% 60% at 50% 40%,rgba(120,150,255,.2),rgba(120,150,255,0) 70%);animation:kaBreath 4.8s ease-in-out infinite alternate}
.ka-grid{--cs:calc((min(100cqw,100cqh) - 10px) / var(--n));position:relative;width:calc(var(--cs) * var(--n));height:calc(var(--cs) * var(--n));font-size:var(--cs);touch-action:none;cursor:pointer;
  border-radius:.2em;
  background:
    linear-gradient(90deg,#090c18 0 .045em,transparent .045em calc(100% - .045em),#090c18 calc(100% - .045em)) 0 0/1em 1em,
    linear-gradient(180deg,#090c18 0 .045em,transparent .045em calc(100% - .045em),#090c18 calc(100% - .045em)) 0 0/1em 1em,
    radial-gradient(90% 90% at 32% 24%,rgba(255,255,255,.11),rgba(255,255,255,0) 62%) 0 0/1em 1em,
    linear-gradient(180deg,#2a3256,#1a2040);
  box-shadow:0 0 0 3px #c99a3a,0 0 0 5px #3a2a10,0 0 0 6px #0a0c14,0 14px 30px rgba(0,0,0,.55),inset 0 0 1.6em rgba(0,0,0,.45)}
/* parlama: karoların üstünden ara ara geçen ışık (kapsüllerin ve harflerin altında; yalnız transform ile kayar) */
.ka-gl{position:absolute;inset:0;z-index:0;overflow:hidden;border-radius:inherit;pointer-events:none}
/* üstten vuran ışık: karoların üst yarısı hafif aydınlık, alt köşeler karanlık (derinlik) */
.ka-gl::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,0) 45%),radial-gradient(120% 90% at 50% 0%,transparent 55%,rgba(0,0,0,.35) 100%)}
.ka-gl::before{content:'';position:absolute;top:0;bottom:0;left:0;width:60%;background:linear-gradient(105deg,transparent 0 20%,rgba(255,255,255,.08) 42%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.08) 58%,transparent 80% 100%);
  transform:translateX(-110%);will-change:transform;animation:kaGlint 5.5s ease-in-out infinite}
.ka-hl,.ka-cells{position:absolute;inset:0}
.ka-hl{pointer-events:none;z-index:1}
.ka-cells{z-index:2;display:grid;grid-template-columns:repeat(var(--n),1fr);grid-template-rows:repeat(var(--n),1fr);pointer-events:none}
.ka-c{display:grid;place-items:center;font:400 .66em/1 'Lilita One',sans-serif;color:#f3ecdb;text-shadow:0 .06em 0 rgba(0,0,0,.55);transition:color .2s,transform .2s}
/* giriş: harfler sol üstten çapraz bir dalgayla döner (kart açılınca) */
.yn-ka.intro .ka-c{animation:kaIn .42s cubic-bezier(.3,1.6,.5,1) both;animation-delay:calc(var(--w) * 26ms)}
.ka-c.sel,.ka-c.anc{color:#1a1200;text-shadow:none;transform:scale(1.12)}
.ka-c.on{color:#0b0e1c;text-shadow:0 1px 0 rgba(255,255,255,.35);animation:kaLetter .5s cubic-bezier(.3,1.9,.5,1) both;animation-delay:calc(var(--k) * 55ms)}
.ka-c.hint{position:relative}
.ka-c.hint::after{content:'';position:absolute;inset:.08em;border-radius:50%;box-shadow:0 0 0 .07em #fff,0 0 .35em .12em rgba(255,255,255,.65);animation:kaHint 1s ease-in-out infinite alternate;pointer-events:none}
.ka-c.rv{color:#fff;text-shadow:0 0 .3em rgba(255,255,255,.55);animation:kaRvL .45s cubic-bezier(.3,1.8,.5,1) both;animation-delay:var(--rd,0s)}
.ka-c.on.rv{color:#0b0e1c;text-shadow:0 1px 0 rgba(255,255,255,.35)}
/* kapsül: başlangıç hücresinin ortasından döner; uzunluk ve kalınlık hücre biriminde */
.ka-pill{position:absolute;left:calc(var(--x) * 1em - .41em);top:calc(var(--y) * 1em - .41em);width:calc(var(--l) * 1em + .82em);height:.82em;border-radius:.41em;
  transform-origin:.41em .41em;transform:rotate(var(--a));background:var(--wc,#ffd25a);box-shadow:0 0 0 .05em rgba(255,255,255,.55),0 0 .5em color-mix(in srgb,var(--wc,#ffd25a) 70%,transparent);overflow:hidden}
/* süren seçim beyaz (bulunan kelime kendi rengine dolar: altın, camgöbeği, pembe) */
.ka-pill.sel,.ka-pill.anc{--wc:#ffffff;background:linear-gradient(90deg,#ffffff,#dfe8ff);box-shadow:0 0 0 .05em #fff,0 0 .55em rgba(200,220,255,.85);opacity:.96}
.ka-pill.anc{animation:kaHint .6s ease-in-out infinite alternate}
/* seçim izi: kapsülün ucunda parmağı izleyen parlak bir baş, geride soluk bir kuyruk */
.ka-pill.sel{background:linear-gradient(90deg,rgba(255,255,255,.55),#ffffff 70%,#fff8d8)}
.ka-pill.sel::before{content:'';position:absolute;right:-.12em;top:-.12em;width:1.06em;height:1.06em;border-radius:50%;background:radial-gradient(circle,rgba(255,250,220,.95) 0 30%,rgba(255,210,90,.55) 46%,rgba(255,210,90,0) 72%);animation:kaHead .5s ease-in-out infinite alternate}
.ka-c.tick{animation:kaTick .26s cubic-bezier(.3,1.8,.5,1)}
/* bulunan kelimenin iki ucunda genişleyen halka */
.ka-ring{position:absolute;z-index:1;left:calc(var(--x) * 1em - .5em);top:calc(var(--y) * 1em - .5em);width:1em;height:1em;border-radius:50%;pointer-events:none;
  box-shadow:0 0 0 .08em var(--wc),0 0 .5em var(--wc);animation:kaRing .7s ease-out forwards}
/* seyirci: her bulunmamış kelimenin geçtiği 3×3 bölge kesik çizgiyle çerçevelenir (kelimenin rengiyle) */
.ka-zone{position:absolute;left:calc(var(--x) * 1em + .06em);top:calc(var(--y) * 1em + .06em);width:2.88em;height:2.88em;border-radius:.3em;pointer-events:none;
  border:.06em dashed var(--wc);background:color-mix(in srgb,var(--wc) 12%,transparent);box-shadow:0 0 .6em color-mix(in srgb,var(--wc) 45%,transparent);animation:kaZone 1.1s ease-in-out infinite alternate}
.ka-zone.off{display:none}
.ka-pill.no{--wc:#ff4a3a;background:linear-gradient(90deg,#ff8070,#e8343c);animation:kaNo .42s ease-in-out both,kaFade .3s .42s ease-in forwards}
.ka-pill.got{animation:kaGot .45s cubic-bezier(.3,1.6,.5,1) both}
.ka-pill.got::after,.ka-pill.rvp::after{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent 0 35%,rgba(255,255,255,.95) 50%,transparent 65% 100%) no-repeat;background-size:60% 100%;background-position:-80% 0;animation:kaSweep .6s .12s ease-out both}
.ka-pill.rvp{background:color-mix(in srgb,var(--wc) 22%,transparent);box-shadow:inset 0 0 0 .07em var(--wc),0 0 .45em color-mix(in srgb,var(--wc) 60%,transparent);animation:kaDraw .6s cubic-bezier(.5,0,.2,1) both;animation-delay:var(--dl,0s)}
.ka-pill.rvp::after{animation-delay:calc(var(--dl,0s) + .15s)}
.ka-grid.shake{animation:kaShake .38s}
.ka-grid.win{animation:kaWin .9s ease-out}
.ka-fly{position:absolute;z-index:30;pointer-events:none;display:grid;place-items:center;border-radius:6px;font-family:'Lilita One',sans-serif;line-height:1;color:#0b0e1c;background:var(--wc);
  box-shadow:0 0 12px color-mix(in srgb,var(--wc) 80%,transparent);transition:transform .55s cubic-bezier(.45,-.25,.35,1.15),opacity .2s .5s}
.ka-tip{flex:none;text-align:center;font:600 12.5px/1.25 'Fredoka',sans-serif;color:#9fabd6}
.ka-tip b{color:#ffd25a;font-weight:700}
.yn-ka.rv .ka-tip{display:none}
@keyframes kaRvL{0%{transform:scale(1);color:#f3ecdb}50%{transform:scale(1.35)}100%{transform:scale(1)}}
@keyframes kaBreath{from{opacity:.65}to{opacity:1}}
@keyframes kaHead{from{transform:scale(.85);opacity:.75}to{transform:scale(1.12);opacity:1}}
@keyframes kaTick{0%{transform:scale(1.45)}100%{transform:scale(1.12)}}
@keyframes kaRing{0%{transform:scale(.6);opacity:1}100%{transform:scale(2.6);opacity:0}}
@keyframes kaZone{from{opacity:.55}to{opacity:1}}
@keyframes kaDraw{0%{transform:rotate(var(--a)) scaleX(.08);opacity:.2}100%{transform:rotate(var(--a));opacity:1}}
@keyframes kaPop{0%{transform:scale(.3);opacity:0}100%{transform:none;opacity:1}}
@keyframes kaFlash{0%{filter:brightness(2.2)}100%{filter:none}}
@keyframes kaAns{0%{opacity:0;transform:translateY(-50%) scale(1.6)}100%{opacity:1;transform:translateY(-50%)}}
@keyframes kaLetter{0%{transform:scale(1)}45%{transform:scale(1.42) rotate(-6deg)}100%{transform:scale(1)}}
@keyframes kaHint{from{opacity:.35}to{opacity:1}}
@keyframes kaNo{20%{transform:rotate(var(--a)) translateX(-.12em)}40%{transform:rotate(var(--a)) translateX(.12em)}60%{transform:rotate(var(--a)) translateX(-.08em)}80%{transform:rotate(var(--a)) translateX(.06em)}}
@keyframes kaFade{to{opacity:0}}
@keyframes kaGot{0%{transform:rotate(var(--a)) scaleY(.4);opacity:.3}100%{transform:rotate(var(--a));opacity:1}}
@keyframes kaSweep{0%{background-position:-80% 0}100%{background-position:180% 0}}
@keyframes kaShake{20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
@keyframes kaIn{0%{opacity:0;transform:scale(.2) rotate(-25deg)}100%{opacity:1;transform:none}}
@keyframes kaGlint{0%,55%{transform:translateX(-110%)}100%{transform:translateX(190%)}}
@keyframes kaWin{0%{box-shadow:0 0 0 3px #ffd25a,0 0 0 5px #3a2a10,0 0 2em .6em rgba(255,210,90,.75)}}
/* kısa ekran: ipuçları alçak, ipucu satırı tek satıra yakın; en kısa ekranda soru yazısı yerine ipuçları konuşur */
@media (max-height:720px){
  /* kısa ekran: tema cümlesi kalkar (ipuçları konuşur), yer tabloya */
  .fl-q.t-kelimeavi .fl-qtext{display:none}
  .yn-ka{gap:7px}
  .ka-clue{min-height:29px}
  .ka-no{width:26px;font-size:17px}
  .ka-tip{display:none}
  .ka-vd{height:54px}
  /* tabloya yükseklik: joker çubuğu alçak ve yakın, süre çubuğu sıkı (ızgara kare: her piksel hücreyi büyütür) */
  .fl-q.t-kelimeavi .fl-jk{margin-top:6px}
  .fl-q.t-kelimeavi .fl-jkb{height:48px}
  .fl-q.t-kelimeavi .fl-tbar{margin:4px 2px 5px}
  .fl-q.t-kelimeavi .fl-qbody{padding-top:4px}
  /* başlık satırı: büyük süre yazısı (44 px) satırı yükseltiyordu; kısa ekranda alçak */
  .fl-q.t-kelimeavi .fl-qhead{min-height:0}
  .fl-q.t-kelimeavi .fl-clock b{font-size:30px}
  .fl-q.t-kelimeavi .fl-cat{height:26px}
  .fl-q.t-kelimeavi .fl-qhead .fl-rule{display:none} /* "En çok kelime": ipuçları ve tablo kuralı zaten anlatıyor */
  .ka-ct{font-size:13px;line-height:1.1}
  .yn-ka.rv .ka-clue{grid-template-columns:26px minmax(0,1fr) auto}
}
@media (max-height:600px){
  /* en kısa ekran (320×568): tabloya yer: soru yazısı ve kural satırı (dar kartta kendi satırı) kalkar, ipuçları sıkışır */
  .fl-q.t-kelimeavi .fl-qhead .fl-rule{display:none}
  .fl-q.t-kelimeavi .fl-qbody{padding-top:4px}
  .fl-q.t-kelimeavi .fl-tbar{margin-bottom:4px}
  .yn-ka{gap:5px}
  .ka-clues{gap:3px}
  .ka-clue{min-height:24px;gap:6px;padding-top:1px;padding-bottom:1px}
  .ka-ct{font-size:12px;line-height:1.08}
  .ka-len{padding:2px 5px 1px;font-size:11px}
  /* dar satırda bulmaca yazımı "(8)": ipucu tek satıra sığar, tablo büyür */
  .ka-len{letter-spacing:.02em}
  .ka-len small{font-size:0}
  .ka-len::before{content:'('}
  .ka-len::after{content:')'}
  .ka-vd{height:50px}
  .ka-av{width:22px;height:22px}
}
@media (prefers-reduced-motion:reduce){.ka-c.hint::after,.ka-pill::after,.ka-pill::before,.ka-pill.anc,.ka-gl::before,.yn-ka.intro .ka-c,.ka-board::before,.ka-zone{animation:none}}
`;

export const kelimeavi = {
	time: 45,
	label: 'Kelime Avı',
	kind: 'closest',
	cover: true, // tam ekran av panosu (harita gizli): tablo telefonun genişliğini ister
	calm: true, // harita arkada durgun (klasik tiplerle aynı işaret)
	keep: true,
	stampAt: '.ka-vd', // cevap damgası ipuçlarının üstündeki boş bantta (soru yazısının yerinde); tabloya, cevaplara binmez
	rule: 'En çok kelime',
	birinci: 'AVIN USTASI SEN!', // sonuç ekranı (ui.js): "EN YAKIN" yerine tipin sözcükleri
	ustun: 'seni geçti', // eşit kelimede erken bulan önde: "daha çok" demez
	rozet: 'EN İYİ AV',
	revealMs: 4200,
	jokers: ['yari', 'kahin'],
	fmt: (v, value) => `${sayim(v, value).got.size}/${v.clues.length} kelime`,
	sub: (v, value) => {
		const s = sayim(v, value);
		if (!s.got.size) return 'kelime yok';
		return s.got.size === v.clues.length ? `${fmtSn(s.last)} sn’de hepsi` : `son kelime ${fmtSn(s.last)} sn`;
	},
	prepare(q, R) {
		const diff = clamp(Math.round(Number(q.diff) || 2), 1, 3);
		const list = (q.words || []).map(([w, c]) => ({ w: harfler(w), c: String(c ?? '') }));
		const longest = Math.max(3, ...list.map((x) => x.w.length));
		const n = clamp(Math.round(Number(q.n) || [7, 8, 9][diff - 1]), longest, 10);
		const dirs = YON[diff];
		const W0 = list.map((x) => x.w);
		const res = kur(W0, n, dirs, R, YON_W[diff]) || kur(W0, n, dirs, mulberry(n * 7919 + list.length), YON_W[diff]) || kur(W0, n + 1, dirs, mulberry(17));
		if (!res) throw new Error(`kelimeavi: ${q.id} tablosu kurulamadı`);
		const N = res.g.length === n * n ? n : n + 1;
		const grid = Array.from({ length: N }, (_, r) => res.g.slice(r * N, r * N + N).join(''));
		const { words: _w, ...pub } = q;
		const v = {
			q: pub,
			n: N,
			grid,
			clues: list.map((x) => ({ c: x.c, len: x.w.length })),
			words: list.map((x, i) => ({ w: x.w.join(''), ...res.place[i] })),
		};
		return stamp(v, q, (q2, k, P, text) => {
			for (const x of v.clues) text(x.c);
			const cells = N * N;
			const rev = dirs.length > 4 ? 1 : 0; // tersten okunan kelime aramayı uzatır
			return {
				wait: 0.5 + v.clues.length * 0.45, // bulunan kelimenin canlandırması (harfler ipucuna uçar)
				look: LOOK.orient + v.clues.length * LOOK.gaze + 0.35 * N, // ipuçlarına ve tabloya ilk bakış
				// her kelime için: ipucunu çöz (zorlukla), tabloyu tara (hücre sayısıyla), yönü fark et
				think: v.clues.length * (P.think[0] + P.think[1] * k + cells * 0.042 + rev * 0.8),
				act: v.clues.reduce((s, x) => s + 1.05 + 0.09 * x.len, 0) + ACT.tap, // kaydır, bırak (bir de kaçan seçim)
			};
		});
	},
	mount(el, v, api) {
		css('yeni5-kelimeavi', CSS);
		const app = appOf();
		const card = el.closest('.fl-q');
		const n = v.n;
		const G = v.grid.map((row) => [...row]);
		const W = v.words || [];
		const nW = v.clues.length;
		const avOf = (i) => card?.querySelector(`.fl-qwho .fl-qp[data-p="${i}"] .fl-av`)?.outerHTML || '<span class="fl-av"></span>';
		const cur = app?.match?.cur;
		const bots = cur?.v === v ? cur.bots || [] : [];
		const rw = bots.length ? 26 + 17 * (Math.min(3, bots.length) - 1) : 0;
		el.innerHTML = `<div class="yn-ka" style="--n:${n};--rw:${rw}px">
			<div class="ka-vd"></div>
			<div class="ka-clues">${v.clues
				.map((x, i) => `<div class="ka-clue" data-i="${i}" style="--wc:${RENK[i % 3]}"><i class="ka-no">${i + 1}</i><span class="ka-ct">${esc(x.c).replace(/\s*\u2026\s*/g, ' <u class="ka-blank"></u> ').trim()}</span><b class="ka-ans"></b><em class="ka-len">${x.len}<small> HARF</small></em><span class="ka-who"></span></div>`)
				.join('')}</div>
			<div class="ka-board"><div class="ka-grid"><i class="ka-gl"></i><div class="ka-hl"></div><div class="ka-cells">${G.map((row, r) => row.map((ch, c) => `<span class="ka-c" data-r="${r}" data-c="${c}" style="--w:${r + c}">${esc(ch)}</span>`).join('')).join('')}</div></div></div>
			<div class="ka-tip">Harflerin üstünden <b>düz bir çizgide</b> kaydır, bırak</div>
		</div>`;
		rule(el, 'En çok kelime');
		const root = el.querySelector('.yn-ka');
		const grid = root.querySelector('.ka-grid');
		const hl = root.querySelector('.ka-hl');
		const cellEl = [...root.querySelectorAll('.ka-c')];
		const clueEl = [...root.querySelectorAll('.ka-clue')];
		const cellOf = (r, c) => cellEl[r * n + c];
		const found = new Map(); // kelime → sn
		const log = [];
		const timers = [];
		const later = (fn, ms) => timers.push(setTimeout(fn, ms));
		let t0 = 0;
		let done = false;
		let drag = null;
		let anchor = null;
		let settle = Promise.resolve(); // son kelimenin kutlaması (cevap ekranı bunun ardından)
		const now = () => (t0 ? Math.round(((clock.now() - t0) / 1000) * 10) / 10 : 0);
		const fx = () => app?.ui?.fx;

		/** Kapsül: (r0, c0) → (r1, c1). */
		const pillStyle = (r0, c0, r1, c1) => {
			const dr = r1 - r0;
			const dc = c1 - c0;
			const l = Math.hypot(dr, dc);
			const a = Math.round((Math.atan2(dr, dc) * 180) / Math.PI);
			return `--x:${c0 + 0.5};--y:${r0 + 0.5};--l:${l.toFixed(3)};--a:${a}deg`;
		};
		const pill = (cls, r0, c0, r1, c1, color = '', extra = '') => {
			const e = document.createElement('i');
			e.className = `ka-pill ${cls}`;
			e.style.cssText = pillStyle(r0, c0, r1, c1) + (color ? `;--wc:${color}` : '') + extra;
			hl.appendChild(e);
			return e;
		};
		let selPill = null;
		const clearSel = () => {
			selPill?.remove();
			selPill = null;
			for (const c of root.querySelectorAll('.ka-c.sel')) c.classList.remove('sel');
		};
		const showSel = (s) => {
			if (!selPill) selPill = pill('sel', s.r0, s.c0, s.r1, s.c1);
			else selPill.style.cssText = pillStyle(s.r0, s.c0, s.r1, s.c1);
			const was = new Set(root.querySelectorAll('.ka-c.sel'));
			for (const c of was) c.classList.remove('sel');
			for (const [r, c] of hat(n, s.r0, s.c0, s.r1, s.c1) || []) {
				const e = cellOf(r, c);
				if (!e) continue;
				e.classList.add('sel');
				// yeni giren harf kısa bir sıçrayışla iz bırakır
				if (!was.has(e)) {
					e.classList.remove('tick');
					void e.offsetWidth;
					e.classList.add('tick');
				}
			}
		};
		let ancPill = null;
		const setAnchor = (a) => {
			for (const c of root.querySelectorAll('.ka-c.anc')) c.classList.remove('anc');
			ancPill?.remove();
			ancPill = null;
			anchor = a;
			if (!a) return;
			cellOf(a.r, a.c)?.classList.add('anc');
			ancPill = pill('anc', a.r, a.c, a.r, a.c);
		};
		/** Parmağın altındaki hücre ve hücre birimiyle konum (yakınlaştırma ölçeğinden bağımsız). */
		const posOf = (e) => {
			const b = grid.getBoundingClientRect();
			const cs = b.width / n || 1;
			const fx2 = (e.clientX - b.left) / cs;
			const fy = (e.clientY - b.top) / cs;
			return { fx: fx2, fy, r: clamp(Math.floor(fy), 0, n - 1), c: clamp(Math.floor(fx2), 0, n - 1) };
		};
		/** Sürüklemenin bitişi: başlangıçtan sekiz yönden en yakınına oturur, uzunluk izdüşümle. */
		const snap = (s, p) => {
			const dx = p.fx - (s.c0 + 0.5);
			const dy = p.fy - (s.r0 + 0.5);
			if (Math.hypot(dx, dy) < 0.5) return { r1: s.r0, c1: s.c0 };
			const k = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
			const dc = Math.round(Math.cos((k * Math.PI) / 4));
			const dr = Math.round(Math.sin((k * Math.PI) / 4));
			let steps = Math.max(0, Math.round((dx * dc + dy * dr) / (dc * dc + dr * dr)));
			while (steps > 0 && !inside(n, s.r0 + dr * steps, s.c0 + dc * steps)) steps--;
			return { r1: s.r0 + dr * steps, c1: s.c0 + dc * steps };
		};
		const letterTick = (len) => sfx(app, 'tick', { vol: 0.24, rate: 0.9 + Math.min(10, len) * 0.07 });

		/** Bulunan kelimenin canlandırması: kapsül kilitlenir, ışık geçer, harfler sırayla parlar ve ipucuna uçar. */
		const celebrate = (i, quiet = false) => {
			const w = W[i];
			const [dr, dc] = DIRS[w.d];
			const end = [w.r + dr * (w.len - 1), w.c + dc * (w.len - 1)];
			pill('got', w.r, w.c, end[0], end[1], RENK[i % 3]);
			const cells = hat(n, w.r, w.c, end[0], end[1]);
			// seyirci bölgesi bulununca söner
			hl.querySelector(`.ka-zone[data-i="${i}"]`)?.classList.add('off');
			if (!quiet)
				for (const [r, c] of [[w.r, w.c], end]) {
					const g = document.createElement('i');
					g.className = 'ka-ring';
					g.style.cssText = `--x:${c + 0.5};--y:${r + 0.5};--wc:${RENK[i % 3]}`;
					g.addEventListener('animationend', () => g.remove());
					hl.appendChild(g);
					later(() => g.remove(), 900);
				}
			cells.forEach(([r, c], k) => {
				const e = cellOf(r, c);
				e.style.setProperty('--k', k);
				e.classList.remove('on');
				void e.offsetWidth;
				e.classList.add('on');
			});
			const clue = clueEl[i];
			const ans = clue.querySelector('.ka-ans');
			if (quiet) {
				clue.classList.add('got');
				ans.textContent = w.w;
				return;
			}
			// harfler ipucuna uçar (kopyalar kökün içinde; ipucu cevabıyla dolunca kalkar)
			const rb = root.getBoundingClientRect();
			const zf = rb.width / (root.offsetWidth || rb.width) || 1; // _coverFit yakınlaştırması
			const target = clue.querySelector('.ka-ct').getBoundingClientRect();
			const letters = [...w.w];
			cells.forEach(([r, c], k) => {
				const src = cellOf(r, c).getBoundingClientRect();
				const f = document.createElement('i');
				f.className = 'ka-fly';
				f.textContent = letters[k];
				const sz = Math.max(16, Math.min(28, src.width * 0.86)) / zf;
				f.style.cssText = `--wc:${RENK[i % 3]};width:${sz.toFixed(1)}px;height:${sz.toFixed(1)}px;left:${((src.left + src.width / 2 - rb.left) / zf - sz / 2).toFixed(1)}px;top:${((src.top + src.height / 2 - rb.top) / zf - sz / 2).toFixed(1)}px;font-size:${(sz * 0.62).toFixed(1)}px`;
				root.appendChild(f);
				const tx = ((target.left + 10 + k * 13 - src.left - src.width / 2) / zf).toFixed(1);
				const ty = ((target.top + target.height / 2 - src.top - src.height / 2) / zf).toFixed(1);
				setTimeout(() => {
					f.style.transform = `translate(${tx}px,${ty}px) scale(.55) rotate(${(k % 2 ? 1 : -1) * 12}deg)`;
					f.style.opacity = '0';
				}, 260 + k * 45);
				setTimeout(() => f.remove(), 980 + k * 45);
			});
			later(() => {
				clue.classList.add('got', 'flash');
				ans.textContent = w.w;
				const c = clue.getBoundingClientRect();
				fx()?.burst(c.left + c.width * 0.6, c.top + c.height / 2, { n: 14, dist: 70, colors: [RENK[i % 3], '#fff', '#ffd25a'], kind: 'star', size: 11, life: 700 });
				later(() => clue.classList.remove('flash'), 750);
			}, 300 + letters.length * 45 + 300);
			sfx(app, 'right', { n: found.size });
			later(() => sfx(app, 'coin', { vol: 0.6 }), 240);
			buzz(14);
			const g = grid.getBoundingClientRect();
			const mid = cellOf(Math.round((w.r + end[0]) / 2), Math.round((w.c + end[1]) / 2))?.getBoundingClientRect();
			if (mid) fx()?.text(mid.left + mid.width / 2, Math.max(g.top + 10, mid.top - 6), `+1 · ${found.size}/${nW}`, { cls: 'dn dn-gold', life: 900 });
		};
		const finish = () => {
			if (done) return;
			done = true;
			clearSel();
			setAnchor(null);
			// cevap hemen gider (saat üçüncü kelimenin anı); kutlama kartta sürer, cevap ekranı onu bekler
			api.answer({ s: log.slice() });
			let fin;
			settle = new Promise((r) => (fin = r));
			later(() => {
				grid.classList.add('win');
				sfx(app, 'fireworks', { vol: 0.7 });
				const g = grid.getBoundingClientRect();
				fx()?.burst(g.left + g.width / 2, g.top + g.height / 2, { n: 26, dist: 150, colors: [...RENK, '#fff'], kind: 'star', size: 13, life: 900 });
			}, 520);
			later(fin, 1250);
		};
		// çevrimiçi: yerleşim görünümde yok (publicView); her seçimi sunucu yanıtlar (act 'kelime' { s } → ev 'kelime'
		// { i, w }, sunucu.js). Bulunan kelime seçimin uçlarından görünüme yazılır (kapsül ve kutlama onu çizer)
		const online = !Array.isArray(v.words) && typeof api.act === 'function' && typeof api.wait === 'function';
		let asking = false;
		const submit = async (r0, c0, r1, c1) => {
			const cells = hat(n, r0, c0, r1, c1);
			if (!cells || cells.length < 2 || asking) return;
			const t = now();
			if (log.length < 80) log.push([r0, c0, r1, c1, t]);
			let i = kelimeOf(v, r0, c0, r1, c1);
			if (!Array.isArray(v.words)) {
				if (!online) return; // yargılayacak kimse yok
				asking = true;
				api.act('kelime', { s: [r0, c0, r1, c1] });
				const r = await api.wait('kelime', 3000);
				asking = false;
				if (!r || r.rejected || done) return;
				i = Number.isInteger(r.i) ? r.i : -1;
				if (i >= 0 && !W[i]) {
					const d = DIRS.findIndex(([dr, dc]) => dr === Math.sign(r1 - r0) && dc === Math.sign(c1 - c0));
					W[i] = { w: r.w, r: r0, c: c0, d, len: cells.length };
				}
			}
			if (i >= 0 && !found.has(i)) {
				found.set(i, t);
				for (const c of root.querySelectorAll(`.ka-c.hint`)) if (cells.some(([r, cc]) => cellOf(r, cc) === c)) c.classList.remove('hint');
				celebrate(i);
				if (found.size === nW) finish();
				return;
			}
			// yanlış (ya da zaten bulunmuş): kapsül kızarır, sarsılır, söner
			const p = pill('no', r0, c0, r1, c1);
			later(() => p.remove(), 760);
			grid.classList.remove('shake');
			void grid.offsetWidth;
			grid.classList.add('shake');
			sfx(app, i >= 0 ? 'tap' : 'bzWrong');
			buzz([24, 30, 24]);
		};
		grid.addEventListener('pointerdown', (e) => {
			if (done || !t0 || (e.button != null && e.button > 0)) return;
			e.preventDefault();
			const p = posOf(e);
			drag = { r0: p.r, c0: p.c, r1: p.r, c1: p.c, id: e.pointerId, len: 1 };
			try {
				grid.setPointerCapture(e.pointerId);
			} catch {
				/* yok say */
			}
			showSel(drag);
			letterTick(1);
		});
		grid.addEventListener('pointermove', (e) => {
			if (!drag || e.pointerId !== drag.id) return;
			const s = snap(drag, posOf(e));
			if (s.r1 === drag.r1 && s.c1 === drag.c1) return;
			drag.r1 = s.r1;
			drag.c1 = s.c1;
			showSel(drag);
			const len = Math.max(Math.abs(s.r1 - drag.r0), Math.abs(s.c1 - drag.c0)) + 1;
			if (len !== drag.len) letterTick(len);
			drag.len = len;
		});
		const up = (e) => {
			if (!drag || e.pointerId !== drag.id) return;
			const d = drag;
			drag = null;
			clearSel();
			if (done) return;
			if (d.r0 === d.r1 && d.c0 === d.c1) {
				// dokun-dokun: ilk dokunuş çapa; aynı doğrultudaki ikinci dokunuş seçimi gönderir
				if (anchor && !(anchor.r === d.r0 && anchor.c === d.c0) && hat(n, anchor.r, anchor.c, d.r0, d.c0)) {
					const a = anchor;
					setAnchor(null);
					submit(a.r, a.c, d.r0, d.c0);
				} else setAnchor(anchor && anchor.r === d.r0 && anchor.c === d.c0 ? null : { r: d.r0, c: d.c0 });
				return;
			}
			setAnchor(null);
			submit(d.r0, d.c0, d.r1, d.c1);
		};
		grid.addEventListener('pointerup', up);
		grid.addEventListener('pointercancel', (e) => {
			if (drag && e.pointerId === drag.id) {
				drag = null;
				clearSel();
			}
		});

		// rakipler: botun planı kartta oynanır (bulduğu kelimenin ipucuna portresi düşer; yeri gösterilmez)
		const rivalChip = (i, p) => {
			const box = clueEl[i]?.querySelector('.ka-who');
			if (!box || box.querySelector(`[data-p="${p.i}"]`)) return;
			box.insertAdjacentHTML('beforeend', `<span class="ka-av" data-p="${p.i}" style="--pc:${esc(p.css || '#888')}">${avOf(p.i)}</span>`);
			sfx(app, 'answered', { player: p.i });
		};
		const stopOpen = onOpen(el, () => {
			t0 = clock.now();
			sfx(app, 'whoosh');
			root.classList.add('intro');
			later(() => root.classList.remove('intro'), 520 + 2 * n * 26);
			for (const b of bots) {
				const s = sayim(v, b.value);
				for (const [i, t] of s.got)
					later(() => {
						if (!done) rivalChip(i, b.p);
					}, t * 1000);
			}
		});
		const close = onClose(el, () => {
			stopOpen();
			for (const t of timers) clearTimeout(t);
		});

		return {
			lock() {
				done = true;
				drag = null;
				clearSel();
				setAnchor(null);
				// süre doldu (kelime kaldı): damga bandı hemen açılır, arayüzün "SÜRE DOLDU" damgası kendi yerine otursun. Hepsi
				// bulunduysa açmaz: son kelimenin harfleri uçarken pano kaymasın (bandı cevap ekranı açar)
				if (found.size < nW) root.classList.add('vd');
			},
			value: () => ({ s: log.slice() }),
			joker(e) {
				if (Array.isArray(e?.zone)) {
					for (const [i, r, c] of e.zone) {
						if (found.has(i) || hl.querySelector(`.ka-zone[data-i="${i}"]`)) continue;
						const z = document.createElement('i');
						z.className = 'ka-zone';
						z.dataset.i = String(i);
						z.style.cssText = `--x:${c};--y:${r};--wc:${RENK[i % 3]}`;
						hl.insertBefore(z, hl.firstChild);
					}
					app?.ui?.toast?.('Seyirci bölgeleri işaretledi', { tone: 'good', ms: 1600 });
					return;
				}
				if (!Array.isArray(e?.first)) return;
				for (const [i, r, c] of e.first) if (!found.has(i)) cellOf(r, c)?.classList.add('hint');
				app?.ui?.toast?.('İlk harfler parlıyor', { tone: 'good', ms: 1600 });
			},
			reveal(results) {
				// son kelimenin kutlaması sürüyorsa önce o biter
				settle.then(() => el.isConnected && show(results));
			},
			destroy: close,
		};
		function show(results) {
			{
				done = true;
				drag = null;
				clearSel();
				setAnchor(null);
				for (const c of root.querySelectorAll('.ka-c.hint')) c.classList.remove('hint');
				for (const z of hl.querySelectorAll('.ka-zone')) z.remove();
				root.classList.add('rv');
				root.classList.toggle('pm', results.length > 2); // 3–4 oyuncu: portreler biraz üst üste
				const meR = results.find((r) => r.p?.human);
				const mine = meR ? sayim(v, meR.value) : { got: new Map(), miss: 0, last: 0 };
				// insanın değeri kartın gördüğünden farklıysa (süre doldu, denetim cevabı) kartı ona göre tamamla
				let k = 0;
				W.forEach((w, i) => {
					const [dr, dc] = DIRS[w.d];
					const end = [w.r + dr * (w.len - 1), w.c + dc * (w.len - 1)];
					if (mine.got.has(i)) {
						if (!found.has(i)) celebrate(i, true);
						return;
					}
					// bulunamayan kelime: ince çerçeveli kapsül, harfleri parlar (sırayla)
					const dl = 0.15 + k * 0.32;
					pill('rvp', w.r, w.c, end[0], end[1], RENK[i % 3], `;--dl:${dl.toFixed(2)}s`);
					// harfler kapsül çizilirken baştan sona sırayla yanar
					hat(n, w.r, w.c, end[0], end[1]).forEach(([r, c], j) => {
						const e = cellOf(r, c);
						if (!e) return;
						e.style.setProperty('--rd', `${(dl + 0.08 + j * 0.05).toFixed(2)}s`);
						e.classList.add('rv');
					});
					clueEl[i].querySelector('.ka-ans').textContent = w.w;
					k++;
				});
				// her kelimeyi kimler buldu: ipucunun yanında portreler (bulma sırasıyla; senin portren altın halkalı)
				const by = W.map(() => []);
				for (const r of results) {
					const s = sayim(v, r.value);
					for (const [i, t] of s.got) by[i].push({ r, t });
				}
				by.forEach((list, i) => {
					const box = clueEl[i].querySelector('.ka-who');
					box.innerHTML = list
						.sort((a, b) => a.t - b.t)
						.map(({ r }) => `<span class="ka-av${r.p?.human ? ' me' : ''}" data-p="${r.i}" style="--pc:${esc(r.color)}">${avOf(r.i)}</span>`)
						.join('');
					if (!list.length) clueEl[i].insertAdjacentHTML('beforeend', '<span class="ka-none">KİMSE</span>');
				});
				if (meR && app) {
					const order = results.slice().sort((a, b) => a.err - b.err || a.time - b.time);
					const win = order[0] === meR;
					const nf = mine.got.size;
					const w0 = order[0] ? sayim(v, order[0].value).got.size : 0;
					const why = win ? '' : w0 > nf ? `${order[0].name} ${w0} kelime buldu` : `${order[0].name} daha hızlıydı`;
					if (nf === nW) stampLater(app, 'KUSURSUZ AV!', win ? 'gold' : '', why || `${nW} kelime · ${fmtSn(mine.last)} sn`);
					else if (nf) stampLater(app, `${nf} KELİME`, win ? 'gold' : 'bad', why || 'Kalanlar tabloda işaretli');
					else stampLater(app, meR.value == null ? 'SÜRE DOLDU' : 'AV BOŞ', 'bad', why || 'Kelimeler tabloda işaretli');
				}
				if (!mine.got.size) sfx(app, 'reveal');
			}
		}
	},
	joker(id, v, R = Math.random) {
		if (!Array.isArray(v.words)) return null;
		if (id === 'kahin') {
			// seyirci: her kelimenin geçtiği 3×3 bölge (kelimenin bir orta harfi bölgenin içinde; bölge kayık, harfi ele vermez)
			return {
				zone: v.words.map((w, i) => {
					const [dr, dc] = DIRS[w.d];
					const k = Math.floor(w.len / 2);
					const r = w.r + dr * k;
					const c = w.c + dc * k;
					const r0 = clamp(r - Math.floor(R() * 3), 0, v.n - 3);
					const c0 = clamp(c - Math.floor(R() * 3), 0, v.n - 3);
					return [i, r0, c0];
				}),
			};
		}
		if (id !== 'yari') return null;
		// her kelimenin ilk harfi (kelime hangi uçtan okunursa okunsun yerleşimin başı)
		return { first: v.words.map((w, i) => [i, w.r, w.c]) };
	},
	/** Çevrimiçi görünüm: harfler ve ipuçları; kelimelerin yeri ve kendisi sunucuda. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.words;
		return o;
	},
	judge(v, value) {
		const s = sayim(v, value);
		const nW = v.clues.length;
		const all = s.got.size === nW;
		return { correct: all, err: all ? 0 : nW - s.got.size + Math.min(0.9, s.last / 100), score: s.got.size };
	},
	bot(v, skill, R) {
		// her kelime: ipucunu bilip tabloda bulma olasılığı (zorluk, uzunluk: kısa kelime gözden kaçar), bulma anları
		// insan gibi aralıklı (ilk kelime tabloya alışma payıyla daha geç), toplam süre botTime aralığında
		const p = pCorrect(skill, v.q.diff);
		const T = botTime(v, R, skill, 0.25, 1);
		const order = v.words.map((_, i) => i).sort(() => R() - 0.5);
		const fr = [0.34 + R() * 0.14, 0.62 + R() * 0.14, 0.92 + R() * 0.08];
		const s = [];
		let k = 0;
		for (const i of order) {
			const w = v.words[i];
			const pw = clamp(p + 0.12 - (w.len <= 4 ? 0.08 : 0) - (w.d >= 4 ? 0.06 : 0), 0.08, 0.97);
			const t = Math.round(T * fr[Math.min(k, 2)] * 10) / 10;
			k++;
			if (R() >= pw) {
				// bulamadı: arada bir yanlış seçim de yapar
				if (R() < 0.4) s.push([w.r, w.c, w.r, Math.min(v.n - 1, w.c + 2), Math.round(t * 0.8 * 10) / 10]);
				continue;
			}
			const [dr, dc] = DIRS[w.d];
			const e = [w.r + dr * (w.len - 1), w.c + dc * (w.len - 1)];
			s.push(R() < 0.25 ? [e[0], e[1], w.r, w.c, t] : [w.r, w.c, e[0], e[1], t]);
		}
		s.sort((a, b) => a[4] - b[4]);
		const sc = sayim(v, { s });
		// hepsini bulan son kelimede cevaplar; bulamayan aramayı yavaş oyuncunun süresinde bırakır
		const give = Math.min(v.sec || 60, Math.max(T + 1.5, v.slow || T + 1.5));
		const time = sc.got.size === v.words.length ? Math.max(1, sc.last) : Math.max(1, Math.min(v.sec || 60, give));
		return { value: { s }, time };
	},
	/** Sınama: üç kelimeyi bulan ve hiçbir şey bulamayan cevap. */
	ornek(v) {
		const s = v.words.map((w, i) => {
			const [dr, dc] = DIRS[w.d];
			return [w.r, w.c, w.r + dr * (w.len - 1), w.c + dc * (w.len - 1), 5 + i * 4];
		});
		return { good: { s }, bad: { s: [[0, 0, 0, 1, 3]] } };
	},
};
