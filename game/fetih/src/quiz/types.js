// Soru tipleri. Her tip aynı sözleşmeyi uygular:
//
//   time            : tipik süre (sn; bankanın ortancası). Asıl süre her sorunun kendi verisinden
//                     hesaplanır: timing.js → v.sec (prepare koyar). time yalnız belge ve yedektir.
//   label           : kartın üstündeki tip adı
//   prepare(q, R)   : oyuna hazır görünüm (şıklar karıştırılır vb.)
//   mount(el, v, api): kartın gövdesini çizer; oyuncu cevaplayınca api.answer(value).
//                     Dönen nesne: { reveal(results), destroy() }
//   judge(v, value) : { correct, err } (err: tahmin/haritada uzaklık; küçük olan kazanır)
//   bot(v, skill, R): { value, time } botun cevabı ve düşünme süresi (timing.js botTime: hızlı–ortanca/yavaş oyuncu arası)
//   kind            : 'exact' (bildi/bilemedi) ya da 'closest' (en yakın kazanır)
//
// Botların doğruluk modeli: P(doğru) = skill + 0.25 − 0.15·zorluk (0.08..0.95 arası).

import { pCorrect, gauss, esc, mountChoice } from './util.js';
import { timing, botTime } from './timing.js';
import { order } from './t_order.js';
import { match } from './t_match.js';
import { hilo, odd, emoji, proverb, riddle } from './t_pick.js';
import { anagram, cross } from './t_word.js';
import { img } from './t_img.js';
import { blitz } from './t_blitz.js';
import { hang } from './t_hang.js';

// harita izdüşümü (tools/geo.mjs ile aynı)
export const GEO = { K: 6, lon0: 35.2, lat0: 39.0 };
const COS0 = Math.cos((GEO.lat0 * Math.PI) / 180);
export const lonLatToWorld = (lon, lat) => ({ x: (lon - GEO.lon0) * COS0 * GEO.K, z: -(lat - GEO.lat0) * GEO.K });
export const KM_PER_UNIT = 111.2 / GEO.K;

// ---------------------------------------------------------------- harita sorusu: alan tabanlı değerlendirme (v1.6)
// İl sorusunda ilin sınırı içi, göl sorusunda gölün içi tam isabettir (hata 0); dışındaysa en yakın kenara uzaklık.
// Nokta sorularında r (km) yarıçap içi tam isabet; haritadaki maket gerçek konumdan kayıksa ikisi de doğru sayılır.
// Halkalar turkiye.json'da dünya biriminde (x, −z).
// Veri (turkiye.json) buraya gömülmez (oyun paketine ikinci kez girerdi): haritayı yükleyen taraf kaydeder
// (board.js, sunucu.js, testler). Kayıt yoksa il/göl sorusu nokta + yarıçap gibi değerlendirilir.
let AREAS = null;
export function setPinAreas(data) {
	if (AREAS || !data) return;
	AREAS = { il: new Map(), gol: new Map() };
	for (const p of data.provinces) AREAS.il.set(p.name, p.rings);
	for (const l of data.lakes || []) if (!AREAS.gol.has(l.name)) AREAS.gol.set(l.name, [l.ring]);
}
const ringsOf = (kind, name) => AREAS?.[kind].get(name) || null;
function inRing(r, x, y) {
	let c = false;
	for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
		const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
	}
	return c;
}
function ringDist(r, x, y) {
	let d = Infinity;
	for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
		const ax = r[j], ay = r[j + 1], bx = r[i] - ax, by = r[i + 1] - ay;
		const t = Math.max(0, Math.min(1, ((x - ax) * bx + (y - ay) * by) / (bx * bx + by * by || 1)));
		d = Math.min(d, Math.hypot(x - ax - bx * t, y - ay - by * t));
	}
	return d;
}
/** Alan (il ya da göl) hatası, dünya birimi: içindeyse 0. */
function areaErr(rings, x, z) {
	const y = -z;
	if (rings.some((r) => inRing(r, x, y))) return 0;
	return Math.min(...rings.map((r) => ringDist(r, x, y)));
}
/** Harita sorusu hatası (km) ve isabet. */
export function pinJudge(q, value, real, alt) {
	const rings = q.il ? ringsOf('il', q.il) : q.gol ? ringsOf('gol', q.gol) : null;
	let km;
	if (rings) km = Math.max(0, areaErr(rings, value.x, value.z) * KM_PER_UNIT - 3); // (kıyı ve sınır çizgisi kaba: 3 km pay)
	else {
		const d = Math.min(Math.hypot(value.x - real.x, value.z - real.z), alt ? Math.hypot(value.x - alt.x, value.z - alt.z) : Infinity);
		km = Math.max(0, d * KM_PER_UNIT - (q.r ?? (q.il ? 25 : q.gol ? 12 : 5)));
	}
	return { correct: km < 15, err: km };
}

/** 1, 2, 5 × 10^k: x'e en yakın küçük "yuvarlak" adım. */
const niceStep = (x) => {
	if (x <= 1) return 1;
	const p = 10 ** Math.floor(Math.log10(x));
	const m = x / p;
	return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p;
};
/**
 * Tahmin kaydırıcısının ince ve kaba adımı: aralık 1000'e kadar ±1 / ±10 (yıllar tam ayarlanır); daha geniş
 * aralıkta ince adım aralığın binde biri (yuvarlak), kaba adım onun 10 katı.
 */
export function numSteps(min, max) {
	const span = Math.abs(Number(max) - Number(min)) || 1;
	const fine = span <= 1000 ? 1 : niceStep(span / 1000);
	return { fine, big: fine * 10 };
}
/** Adım düğmesi yazısı: 10 bin, 2 mn gibi kısa (düğmeye sığsın). */
const stepLabel = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('tr-TR')} mn` : n >= 1e4 ? `${(n / 1e3).toLocaleString('tr-TR')} bin` : n.toLocaleString('tr-TR'));

export const TYPES = {
	choice: {
		time: 20,
		label: 'Test',
		kind: 'exact',
		prepare(q, R) {
			const order = [0, 1, 2, 3].sort(() => R() - 0.5);
			return { q, opts: order.map((i) => q.a[i]), right: order.indexOf(0) };
		},
		mount(el, v, api) {
			const c = mountChoice(el, v, api);
			return { lock: c.lock, reveal: (r) => c.reveal(r), destroy() {} };
		},
		judge(v, value) {
			return { correct: value === v.right, err: value === v.right ? 0 : 1 };
		},
		bot(v, skill, R) {
			const ok = R() < pCorrect(skill, v.q.diff);
			let value = v.right;
			if (!ok) do value = Math.floor(R() * 4); while (value === v.right);
			return { value, time: botTime(v, R, skill, 0.05, 0.8) };
		},
	},

	tf: {
		time: 20,
		label: 'Doğru mu?',
		kind: 'exact',
		prepare(q) {
			return { q, right: q.ans ? 0 : 1 };
		},
		mount(el, v, api) {
			// Arena "HÜKÜM": tek eğik levhanın iki yarısı, ortada "YA DA" dikişi (stil: styles-arena.js .fl-tf.vd)
			el.innerHTML = `<div class="fl-tf vd"><button class="fl-opt fl-yes" data-i="0"><em class="ic"><svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5 10-11"/></svg></em><span>DOĞRU</span></button><div class="fl-tfmid"><i></i><b>YA DA</b></div><button class="fl-opt fl-no" data-i="1"><em class="ic"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></em><span>YANLIŞ</span></button></div>`;
			el.closest('.fl-q')?.classList.add('tf');
			const btns = [...el.querySelectorAll('.fl-opt')];
			let done = false;
			for (const b of btns)
				b.addEventListener('click', () => {
					if (done) return;
					done = true;
					b.classList.add('pick');
					api.answer(Number(b.dataset.i));
				});
			return {
				lock() {
					done = true;
				},
				reveal(results) {
					btns[v.right].classList.add('right');
					btns[1 - v.right].classList.add('dim');
					if (btns[1 - v.right].classList.contains('pick')) btns[1 - v.right].classList.add('wrong');
					for (const r of results) if (r.value != null) btns[r.value]?.insertAdjacentHTML('beforeend', `<b class="fl-who" style="background:${r.color}"></b>`);
					// iddia kartının tamamı hükme döner (yeşil/kırmızı silme + parıltı + büyük işaret)
					const card = el.closest('.fl-q');
					const qt = card?.querySelector('.fl-qtext');
					if (qt && !qt.querySelector('.fl-tfx')) {
						card.classList.add(v.right ? 'tfn' : 'tfy');
						const ic = v.right ? '<path d="M6 6l12 12M18 6 6 18"/>' : '<path d="M4.5 12.5l5 5 10-11"/>';
						qt.insertAdjacentHTML('beforeend', `<i class="fl-tfx"></i><b class="fl-tfbig"><svg viewBox="0 0 24 24">${ic}</svg></b>`);
					}
				},
				destroy() {},
			};
		},
		judge(v, value) {
			return { correct: value === v.right, err: value === v.right ? 0 : 1 };
		},
		bot(v, skill, R) {
			const ok = R() < Math.min(0.97, pCorrect(skill, v.q.diff) + 0.1);
			return { value: ok ? v.right : 1 - v.right, time: botTime(v, R, skill, 0, 0.7) };
		},
	},

	num: {
		time: 20,
		label: 'Tahmin',
		kind: 'closest',
		prepare(q) {
			return { q };
		},
		mount(el, v, api) {
			const q = v.q;
			const mid = Math.round((q.min + q.max) / 2);
			const S = numSteps(q.min, q.max);
			el.innerHTML = `<div class="fl-num">
				<div class="fl-num-val"><b data-r="val">${mid}</b><small>${esc(q.unit || '')}</small></div>
				<input class="fl-range" type="range" min="${q.min}" max="${q.max}" step="1" value="${mid}" aria-label="tahmin">
				<div class="fl-num-row">
					<button class="fl-step" data-d="${-S.big}">−${stepLabel(S.big)}</button><button class="fl-step" data-d="${-S.fine}">−${stepLabel(S.fine)}</button>
					<button class="fl-step" data-d="${S.fine}">+${stepLabel(S.fine)}</button><button class="fl-step" data-d="${S.big}">+${stepLabel(S.big)}</button>
				</div>
				<button class="fl-send">GÖNDER</button>
			</div>`;
			const range = el.querySelector('.fl-range');
			const val = el.querySelector('[data-r=val]');
			let lo = q.min; // yarı yarıya jokeri aralığı daraltabilir
			let hi = q.max;
			const set = (x) => {
				x = Math.max(lo, Math.min(hi, Math.round(x)));
				range.value = String(x);
				val.textContent = x.toLocaleString('tr-TR');
			};
			set(mid);
			range.addEventListener('input', () => set(Number(range.value)));
			// düğme üstünde yazan kadar kaydırır (data-d: adım, aralığa göre numSteps)
			for (const b of el.querySelectorAll('.fl-step')) b.addEventListener('click', () => set(Number(range.value) + Number(b.dataset.d)));
			let done = false;
			el.querySelector('.fl-send').addEventListener('click', () => {
				if (done) return;
				done = true;
				el.querySelector('.fl-num').classList.add('sent');
				api.answer(Number(range.value));
			});
			return {
				lock() {
					done = true;
				},
				value: () => Number(range.value),
				// joker: { kind:'range', min, max } kaydırıcıyı daraltır
				joker(e) {
					if (e.kind !== 'range') return;
					lo = e.min;
					hi = e.max;
					range.min = String(lo);
					range.max = String(hi);
					set((lo + hi) / 2);
					range.dispatchEvent(new Event('input', { bubbles: true }));
					el.querySelector('.fl-num').classList.add('narrow');
				},
				reveal(results) {
					const rows = results
						.slice()
						.sort((a, b) => a.err - b.err)
						.map((r) => `<div class="fl-guess"><b style="background:${r.color}"></b><span>${esc(r.name)}</span><em>${r.value == null ? '—' : Number(r.value).toLocaleString('tr-TR')}</em></div>`)
						.join('');
					el.innerHTML = `<div class="fl-num-ans"><small>Doğru cevap</small><b>${q.ans.toLocaleString('tr-TR')} ${esc(q.unit || '')}</b></div><div class="fl-guesses">${rows}</div>`;
				},
				destroy() {},
			};
		},
		judge(v, value) {
			if (value == null) return { correct: false, err: Infinity };
			const err = Math.abs(value - v.q.ans);
			return { correct: err === 0, err };
		},
		bot(v, skill, R) {
			const q = v.q;
			const sigma = (1.15 - skill) * 0.32 * (0.7 + 0.3 * q.diff);
			// bilenler tam bilir: biraz şans tam isabet
			const exact = R() < pCorrect(skill, q.diff) * 0.35;
			const span = q.max - q.min;
			let value = exact ? q.ans : q.ans + gauss(R) * sigma * Math.min(span, Math.abs(q.ans) + span * 0.2) * 0.5;
			value = Math.round(Math.max(q.min, Math.min(q.max, value)));
			return { value, time: botTime(v, R, skill, 0.1, 0.9) };
		},
	},

	pin: {
		time: 20,
		label: 'Haritada bul',
		kind: 'closest',
		needsMap: true,
		prepare(q) {
			// hedef: haritadaki maket ya da doruk varsa o (iğne cevapta orada görünür), yoksa gerçek konum
			const real = lonLatToWorld(q.lon, q.lat);
			const alt = q.alt ? lonLatToWorld(q.alt[1], q.alt[0]) : null;
			return { q, target: alt || real, real, alt };
		},
		mount(el, v, api) {
			const what = v.q.il ? 'İlin içine dokun' : v.q.gol ? 'Gölün üstüne dokun' : 'Haritaya dokun, iğneyi yerleştir';
			el.innerHTML = `<div class="fl-pin-hint"><span class="ph"><i class="pi"></i><b data-r="h">${what}</b><small data-r="z">İki parmakla yakınlaşabilirsin</small></span><button class="fl-send" disabled>ONAYLA</button></div>`;
			const send = el.querySelector('.fl-send');
			const hint = el.querySelector('[data-r=h]');
			const sub = el.querySelector('[data-r=z]');
			let pt = null;
			let done = false;
			api.onMapTap((p) => {
				if (done) return;
				const first = !pt;
				pt = p;
				api.showPin(p);
				send.disabled = false;
				if (first) {
					// ilk dokunuş: iğnenin çevresine yaklaş (bütün Türkiye ekranda ~150 px; parmakla ince ayar imkânsızdı)
					api.zoomTo?.(p);
					hint.textContent = 'Düzeltmek için yeniden dokun';
					sub.textContent = 'Eminsen onayla';
				}
			});
			send.addEventListener('click', () => {
				if (done || !pt) return;
				done = true;
				api.answer(pt);
			});
			return {
				lock() {
					done = true;
				},
				reveal(results) {
					const rows = results
						.slice()
						.sort((a, b) => a.err - b.err)
						.map((r) => `<div class="fl-guess"><b style="background:${r.color}"></b><span>${esc(r.name)}</span><em>${r.value == null ? '—' : Math.round(r.err) + ' km'}</em></div>`)
						.join('');
					el.innerHTML = `<div class="fl-guesses">${rows}</div>`;
				},
				destroy() {},
			};
		},
		judge(v, value) {
			if (!value) return { correct: false, err: Infinity };
			return pinJudge(v.q, value, v.real || v.target, v.alt);
		},
		bot(v, skill, R) {
			const km = Math.abs(gauss(R)) * ((1 - skill) * 260 + 25) * (0.7 + 0.25 * v.q.diff);
			const a = R() * Math.PI * 2;
			const d = km / KM_PER_UNIT;
			return { value: { x: v.target.x + Math.cos(a) * d, z: v.target.z + Math.sin(a) * d }, time: botTime(v, R, skill, 0.05, 0.85) };
		},
	},
};

// ---------------------------------------------------------------- yeni tipler (src/quiz/t_*.js)
Object.assign(TYPES, { hang, order, match, hilo, odd, emoji, anagram, cross, proverb, riddle, img, blitz });
// sakin tipler: soru boyunca 3B sahneyi canlandırmazlar (haritasız olanlarda harita arkada durgun: mobilde 30 kare)
for (const T of Object.values(TYPES)) if (!T.needsMap) T.calm = true;

// ---------------------------------------------------------------- süre bütçesi
// Her görünüm kendi sorusunun süresini taşır: v.sec (saat, tam sn) ve v.fast / v.med / v.slow (hızlı, ortanca ve
// yavaş-rahat oyuncunun bitirme süresi; botların cevap aralığı). Tek kaynak burası: maç, arayüz, botlar ve uzak
// koltuklar (publicView v'yi kopyalar) aynı değeri görür.
for (const T of Object.values(TYPES)) {
	const prep = T.prepare;
	T.prepare = function (q, R) {
		const v = prep.call(this, q, R);
		const t = timing(q);
		v.sec = t.sec;
		v.fast = t.fast;
		v.med = t.med;
		v.slow = t.slow;
		return v;
	};
}

// ---------------------------------------------------------------- kategori başına tip ağırlıkları
// Oynanış ajanı bunu okur: attack = fetih düellosu (2 kişi), expand = yayılma turu (herkes aynı soruyu çözer;
// 'closest' tiplerde err'e, 'exact' tiplerde doğru + hıza göre sıralanır; 3-4 kişide derece ayrımı için
// tahmin, sıralama, eşleştirme, çengel ve yıldırım turu ağırlıklıdır).
//
// Anahtarlar tip adları, değerler göreli ağırlık (0 = hiç).
// emoji (v1.6): kullanıcı kararıyla maçtan kalktı (ağırlık yok); tip ve sorular galeride durur, ağırlık eklenirse geri gelir
export const TYPE_WEIGHTS = {
	tarih: {
		attack: { choice: 4, tf: 2, order: 3, match: 2, odd: 1, hang: 1, anagram: 1, cross: 1, pin: 2, hilo: 1, img: 1, blitz: 1, riddle: 0.5 },
		expand: { num: 3, order: 3, pin: 2, match: 1, cross: 1, hilo: 1, blitz: 1 },
	},
	cografya: {
		attack: { choice: 4, tf: 2, pin: 3, hang: 1, hilo: 2, match: 2, odd: 1, img: 3, anagram: 1, cross: 1, blitz: 1 },
		expand: { pin: 4, num: 3, hilo: 2, order: 1, match: 1, cross: 1, img: 1, blitz: 1 },
	},
	spor: {
		attack: { choice: 4, tf: 2, hang: 1, hilo: 2, odd: 1, match: 1, anagram: 1, blitz: 1, order: 1, cross: 1 },
		expand: { num: 3, hilo: 2, order: 2, blitz: 2, match: 1, cross: 1 },
	},
	bilim: {
		attack: { choice: 4, tf: 2, hang: 1, odd: 2, anagram: 2, hilo: 2, match: 2, order: 1, riddle: 1, cross: 1, img: 1, blitz: 1 },
		expand: { num: 4, order: 2, hilo: 2, blitz: 1, match: 1, cross: 1 },
	},
	sanat: {
		attack: { choice: 4, tf: 1, odd: 2, match: 2, proverb: 2, riddle: 2, anagram: 1, hang: 1, cross: 2, img: 1, order: 1 },
		expand: { num: 2, order: 2, match: 2, cross: 2, blitz: 1 },
	},
	eglence: {
		attack: { choice: 3, tf: 2, proverb: 3, riddle: 3, odd: 2, anagram: 2, hang: 1, img: 2, match: 1, cross: 1, blitz: 2, hilo: 1, order: 1 },
		expand: { num: 2, hilo: 2, blitz: 2, order: 1, match: 1, cross: 1 },
	},
	// kategori belirsizse
	default: {
		attack: { choice: 4, tf: 2, hang: 1, odd: 1, proverb: 1, anagram: 1, match: 1, order: 1, hilo: 1, img: 1, blitz: 1 },
		expand: { num: 3, order: 2, hilo: 1, match: 1, blitz: 1 },
	},
};

/**
 * Ağırlıklı tip seçimi. phase: 'attack' | 'expand'. R: rastgele fonksiyon.
 * have: isteğe bağlı Set/dizi; yalnızca bankada sorusu olan tipler seçilir.
 */
export function pickType(cat, phase, R = Math.random, have = null) {
	const w = (TYPE_WEIGHTS[cat] || TYPE_WEIGHTS.default)[phase] || TYPE_WEIGHTS.default.attack;
	const ok = have ? new Set(have) : null;
	const list = Object.entries(w).filter(([t, x]) => x > 0 && TYPES[t] && (!ok || ok.has(t)));
	if (!list.length) return phase === 'expand' ? 'num' : 'choice';
	let r = R() * list.reduce((s, [, x]) => s + x, 0);
	for (const [t, x] of list) if ((r -= x) <= 0) return t;
	return list[list.length - 1][0];
}
