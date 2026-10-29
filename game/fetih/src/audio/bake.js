// Pişirme: müziği ve ağır efektleri JS'te (synth.js) bir kez üretip AudioBuffer'a çevirir. Çalarken yalnızca tek
// AudioBufferSource gerekir: telefonda CPU ve düğüm üretimi yok. Yankı (evrişim) pişmiş sesin içindedir.
//
// Kusursuz döngü: tema "kararlı durum" önkoşuluyla çizilir. Döngünün sonuna taşan olaylar (kuyruk, pad, yankı) bir de
// döngü uzunluğu kadar geriye kaydırılmış kopyasıyla ön koşu (pre-roll) olarak çalınır; sonra yalnızca [P, P+L) dilimi alınır.
// Sürekli sesler (bordo) döngüye tam sayıda salınım oturur; notalar önbellekli ve belirleyici olduğundan kopya ile asıl
// nota örnek örnek aynıdır: sarma yerinde süreksizlik olmaz.
//
// Ana iş parçacığı: işler ~6 ms'lik dilimlere bölünür (yield), yalnızca yankı geçişi (yerel ConvolverNode) ses iş
// parçacığında koşar. Düğümde (tarayıcısız) yankısız çalışır: doğrulama ve testler için.
import { JsEngine } from './synth.js';
import { reverbPass, canReverb } from './reverb.js';
import { compose } from './songs.js';
import { SOUNDS } from './sounds.js';
import { masterChain, softLimit, peakOf, loudness, fadeEdges, clearPlucks } from './dsp.js';

export const MUSIC_SR = 32000;
export const MUSIC_SR_LOW = 24000;

const MUSIC_IR = { seconds: 2.4, rt60: 2.1, pre: 0.02, seed: 5, bright: 0.85 };
const MUSIC_IR_LOW = { seconds: 1.5, rt60: 1.3, pre: 0.015, seed: 5, bright: 0.8 };
const SFX_IR = { seconds: 1.5, rt60: 1.05, pre: 0.008, seed: 9, bright: 0.9 };

// ton ayarı: yüksek raf parlaklık/hava verir (sentez ağırlıkla orta bantta), alçak raf telefonda boğuk gürlemeyi azaltır
const MUSIC_EQ = [['hs', 3000, 6], ['ls', 120, -1.5]];
const SFX_EQ = [['hs', 3500, 3]];
// müzik: aynı vol ≈ aynı algısal seviye (ham seviyeler: ney −3, zurna −12, boru −4, bordo −3, pad/koro −20, tel −25 dBFS)
const MUSIC_TRIM = { ney: 0.14, zurna: 0.4, horn: 0.12, strings: 0.8, choir: 0.85, drone: 0.09 };

const hash = (s) => {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
	return h >>> 0;
};

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Ana iş parçacığına söz ver (MessageChannel: setTimeout'un 4 ms bekleme sınırı yok). */
export const yieldMain = () =>
	new Promise((res) => {
		if (typeof MessageChannel !== 'undefined') {
			const c = new MessageChannel();
			c.port1.onmessage = () => {
				c.port1.close();
				res();
			};
			c.port2.postMessage(0);
		} else if (typeof setTimeout === 'function') setTimeout(res, 0);
		else res();
	});

/** Pişirme bu ortamda çalışır mı (hesap saf JS; yalnızca sonuç AudioBuffer'a çevrilirken Web Audio gerekir). */
export function canBake() {
	return typeof globalThis.AudioBuffer === 'function' || typeof (globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext) === 'function';
}

// ---------------------------------------------------------------- müzik olaylarını çal
function perform(e, ev, t) {
	switch (ev.k) {
		case 'hit':
			e.hit(ev.n, t, ev.v, ev.r || 1, ev.p || 0, ev.b || 'perc');
			break;
		case 'pluck':
			e.pluck(ev.i, ev.f, t, ev.v, ev.p || 0, 'string');
			break;
		case 'ney':
			e.ney(t, ev.f, ev.d, ev.v, { ...ev.o, to: 'wind', pan: ev.p });
			break;
		case 'zurna':
			e.zurna(t, ev.f, ev.d, ev.v, { ...ev.o, to: 'wind', pan: ev.p });
			break;
		case 'horn':
			e.horn(t, ev.f, ev.d, ev.v, { to: 'wind', pan: ev.p });
			break;
		case 'strings':
			e.strings(t, ev.fs, ev.d, ev.v, { ...ev.o, to: 'pad', pan: ev.p });
			break;
		case 'choir':
			e.choir(t, ev.fs, ev.d, ev.v, { ...ev.o, to: 'pad', pan: ev.p });
			break;
		case 'noise':
			e.noise(t, ev.d, ev.v, ev.f0, ev.f1, { ...ev.o, to: 'fx' });
			break;
		default:
			break;
	}
}

/** Döngü sonuna taşan olayları kapsayacak ön koşu süresi (sn). */
export function prerollOf(sc) {
	let P = 2.5;
	for (const ev of sc.ev) {
		if (ev.k === 'drone') continue;
		if (ev.t + (ev.d || 0) + (ev.tl || 0) > sc.L) P = Math.max(P, sc.L - ev.t + 0.25);
	}
	return Math.min(P, sc.L * 0.55);
}


/**
 * Temayı pişir. Dönen: { stems: [{L, R}], sr, len, P, rms, gain, sync, hot, bars, bpm } (ham diziler).
 * AudioBuffer'a çevirmek çağıranın işi (toBuffers); doğrulama dizileri doğrudan WAV yazabilsin diye ayrı.
 */
export async function renderTheme(name, { low = false, pause = yieldMain } = {}) {
	const sc = compose(name);
	const T = sc.T;
	const sr = low ? MUSIC_SR_LOW : MUSIC_SR;
	const P = prerollOf(sc);
	const total = P + sc.L;
	const nStem = low ? 1 : sc.stems;
	const raw = [];
	for (let s = 0; s < nStem; s++) {
		const e = new JsEngine({ sr, len: total + 0.05, low, wet: T.wet === undefined ? 1 : T.wet, seed: hash(name) + s, loopLen: sc.L, trim: MUSIC_TRIM });
		let tm = now();
		for (const ev of sc.ev) {
			if (ev.s !== s) continue;
			if (ev.k === 'drone') {
				e.droneLoop(0, total + 0.05, ev.fs, ev.v, { to: 'pad', cut: ev.o && ev.o.cut });
				await pause();
				tm = now();
				continue;
			}
			perform(e, ev, P + ev.t);
			// döngü sonuna taşan olayın bir önceki turdaki kopyası
			if (ev.t + (ev.d || 0) + (ev.tl || 0) > sc.L) perform(e, ev, P + ev.t - sc.L);
			if (now() - tm > 6) {
				await pause();
				tm = now();
			}
		}
		const L = e.dL;
		const R = e.dR;
		const rv = await reverbPass(e.wL, e.wR, sr, low ? MUSIC_IR_LOW : MUSIC_IR);
		e.wL = e.wR = null;
		if (rv) {
			for (let i = 0; i < L.length; i++) {
				L[i] += rv.L[i];
				R[i] += rv.R[i];
			}
		}
		await pause();
		await masterChain(L, R, sr, { bass: 0.3, comp: true, eq: MUSIC_EQ }, pause);
		const i0 = Math.round(P * sr);
		const n = Math.round(sc.L * sr);
		raw.push({ L: L.slice(i0, i0 + n), R: R.slice(i0, i0 + n) });
		await pause();
	}
	// seviye: temel katmanın RMS'ine göre; ek katman aynı kazancı alır (birlikte çalınca yoğunlaşır)
	const r0 = loudness(raw[0].L, raw[0].R, sr);
	const target = Math.pow(10, (T.level === undefined ? -21 : T.level) / 20);
	const gain = r0 > 0 ? target / r0 : 1;
	for (const st of raw) {
		for (const ch of [st.L, st.R]) {
			for (let i = 0; i < ch.length; i++) ch[i] *= gain;
			softLimit(ch, 0.62, 0.97);
		}
	}
	clearPlucks();
	return { stems: raw, sr, len: raw[0].L.length / sr, P, rms: r0 * gain, gain, sync: T.sync || null, hot: raw.length > 1, bars: T.bars, bpm: T.bpm };
}

/**
 * Karışım analizi için: temanın yalnızca seçilen parçalarını (parça sıraları) kuru olarak (yankısız, ana zincirsiz) döngü uzunluğunda
 * çizer. Dönen: {L, R, sr}. Doğrulama her parçanın tek başına algısal seviyesini ve tayfını ölçer.
 */
export async function renderDry(name, parts, { stem = 0, low = false } = {}) {
	const sc = compose(name);
	const sr = low ? MUSIC_SR_LOW : MUSIC_SR;
	const P = prerollOf(sc);
	const e = new JsEngine({ sr, len: P + sc.L + 0.05, low, wet: 0, seed: hash(name) + stem, loopLen: sc.L, trim: MUSIC_TRIM });
	const keep = new Set(parts);
	for (const ev of sc.ev) {
		if (!keep.has(ev.pi)) continue;
		if (ev.k === 'drone') {
			e.droneLoop(0, P + sc.L + 0.05, ev.fs, ev.v, { to: 'pad', cut: ev.o && ev.o.cut });
			continue;
		}
		perform(e, ev, P + ev.t);
		if (ev.t + (ev.d || 0) + (ev.tl || 0) > sc.L) perform(e, ev, P + ev.t - sc.L);
	}
	const i0 = Math.round(P * sr);
	const n = Math.round(sc.L * sr);
	return { L: e.dL.slice(i0, i0 + n), R: e.dR.slice(i0, i0 + n), sr, parts: sc.T.parts };
}

// AudioBuffer bağlamdan bağımsızdır: kurucudan ya da tek seferlik küçük bir çevrimdışı bağlamdan üretilir.
let _mk = null;
function makeBuffer(ch, len, sr) {
	if (typeof AudioBuffer === 'function') {
		try {
			return new AudioBuffer({ numberOfChannels: ch, length: len, sampleRate: sr });
		} catch (e) {
			/* eski tarayıcı: aşağıdaki yol */
		}
	}
	const C = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
	_mk = _mk || new C(1, 1, 44100);
	return _mk.createBuffer(ch, len, sr);
}

/** Ham dizileri AudioBuffer'a çevir. */
export function toBuffers(r) {
	return r.stems.map((st) => {
		const b = makeBuffer(2, st.L.length, r.sr);
		b.getChannelData(0).set(st.L);
		b.getChannelData(1).set(st.R);
		return b;
	});
}

// ---------------------------------------------------------------- efekt pişirme
/**
 * Efekti pişir: tarifi (sounds.js) JsEngine'de çalar, yankı ekler; kuyruk sessizliğini kırpar, tepeyi hedefe getirir.
 * Dönen: { L, R | null (tek kanal), sr, dur, gain } ham diziler.
 */
export async function renderSfx(name, opts = {}, { low = false } = {}) {
	const def = SOUNDS[name];
	if (!def) return null;
	const sr = low ? MUSIC_SR_LOW : MUSIC_SR;
	const lead = 0.01;
	const body = lead + (typeof def.len === 'function' ? def.len(opts) : def.len || def.dur);
	const tail = def.tail === undefined ? 1.0 : def.tail;
	const e = new JsEngine({ sr, len: body + tail, low, wet: def.wet === undefined ? 1 : def.wet, seed: hash(name + JSON.stringify(opts)) });
	def.fn(e, lead, opts);
	const L = e.dL;
	const R = e.dR;
	const rv = await reverbPass(e.wL, e.wR, sr, SFX_IR);
	e.wL = e.wR = null;
	if (rv) {
		for (let i = 0; i < L.length; i++) {
			L[i] += rv.L[i];
			R[i] += rv.R[i];
		}
	}
	await masterChain(L, R, sr, { bass: def.bass === undefined ? 0.4 : def.bass, comp: false, eq: SFX_EQ });
	// baştaki sessizliği ve kuyruk sessizliğini kırp
	const thr = 1.5e-3;
	let a = 0;
	let z = L.length - 1;
	while (a < L.length && Math.abs(L[a]) < thr && Math.abs(R[a]) < thr) a++;
	while (z > a && Math.abs(L[z]) < thr && Math.abs(R[z]) < thr) z--;
	a = Math.max(0, a - Math.round(0.001 * sr));
	z = Math.min(L.length, z + Math.round(0.04 * sr));
	const l2 = L.slice(a, z);
	const r2 = R.slice(a, z);
	const pk = Math.max(peakOf(l2), peakOf(r2));
	const g = pk > 0 ? (def.peak === undefined ? 0.8 : def.peak) / pk : 1;
	for (let i = 0; i < l2.length; i++) {
		l2[i] *= g;
		r2[i] *= g;
	}
	fadeEdges(l2, sr, 0.0015, 0.05);
	fadeEdges(r2, sr, 0.0015, 0.05);
	clearPlucks();
	// iki kanal aynıysa tek kanal tut (bellek yarıya iner)
	let dd = 0;
	let ss = 0;
	for (let i = 0; i < l2.length; i += 3) {
		dd += (l2[i] - r2[i]) ** 2;
		ss += (l2[i] + r2[i]) ** 2;
	}
	const mono = dd < 0.002 * ss;
	return { L: l2, R: mono ? null : r2, sr, dur: l2.length / sr, gain: def.gain === undefined ? 1 : def.gain, reverb: !!rv };
}

export function sfxToBuffer(r) {
	const b = makeBuffer(r.R ? 2 : 1, r.L.length, r.sr);
	b.getChannelData(0).set(r.L);
	if (r.R) b.getChannelData(1).set(r.R);
	return b;
}

export { canReverb };
