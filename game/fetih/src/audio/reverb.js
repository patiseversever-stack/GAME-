// Yankı: pişirme sırasında bütün karışım JS'te toplanır; yankı tek bir evrişim geçişiyle (ConvolverNode, yerel ve hızlı)
// eklenir. Hatlar yankıya farklı oranda gönderir: davul kuru, nefesliler ve pedler ıslak: salonda dururlar.
import { rng } from './dsp.js';

// wet = yankıya gönderim oranı
export const BUS = {
	perc: { wet: 0.13 },
	string: { wet: 0.24 },
	wind: { wet: 0.3 },
	pad: { wet: 0.42 },
	fx: { wet: 0.2 },
};

/**
 * Yankı dürtü yanıtı: ilk yansımalar + üstel sönen, zamanla koyulaşan gürültü. Stereo, ilintisiz.
 * ctx'in kendi örnekleme hızında kurulur (ConvolverNode aynı hızı ister).
 */
export function makeIR(ctx, { seconds = 2.2, rt60 = 1.9, pre = 0.014, seed = 5, bright = 0.85 } = {}) {
	const sr = ctx.sampleRate;
	const n = Math.floor(seconds * sr);
	const buf = ctx.createBuffer(2, n, sr);
	for (let ch = 0; ch < 2; ch++) {
		const d = buf.getChannelData(ch);
		const r = rng(seed * 131 + ch * 7919);
		let lp = 0;
		const p0 = Math.floor(pre * sr);
		for (let i = p0; i < n; i++) {
			const t = (i - p0) / sr;
			const env = Math.exp((-6.9 * t) / rt60);
			// zamanla koyulaşan ton: yüksek frekanslar önce söner
			const a = Math.max(0.08, bright * Math.exp(-t * 1.2));
			lp += (r() * 2 - 1 - lp) * a;
			// ilk 40 ms yumuşak yükselir: oda hissi, "çınlama" yok
			const soft = t < 0.04 ? t / 0.04 : 1;
			d[i] = lp * env * soft;
		}
		// birkaç ilk yansıma
		for (let k = 0; k < 6; k++) {
			const at = Math.floor((0.014 + r() * 0.07) * sr);
			if (at < n) d[at] += (r() < 0.5 ? -1 : 1) * (0.5 - k * 0.06);
		}
	}
	return buf;
}

const OC = () => globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;

export function canReverb() {
	return typeof OC() === 'function';
}

function makeOffline(ch, len, sr) {
	const C = OC();
	try {
		return new C(ch, len, sr);
	} catch (e) {
		return new C({ numberOfChannels: ch, length: len, sampleRate: sr });
	}
}

/** Çizim: modern tarayıcılarda Promise, eski Safari'de oncomplete. */
export function renderOffline(oc) {
	return new Promise((res, rej) => {
		try {
			const p = oc.startRendering();
			if (p && p.then) p.then(res, rej);
			else oc.oncomplete = (ev) => res(ev.renderedBuffer);
		} catch (err) {
			rej(err);
		}
	});
}

/**
 * Islak karışımı (wL, wR) evrişimle yankıya sok; dönen: {L, R} (aynı uzunlukta). Bağlam yoksa ya da hata olursa null:
 * çağıran kuru sesle devam eder.
 */
export async function reverbPass(wL, wR, sr, irOpts) {
	if (!canReverb()) return null;
	try {
		const n = wL.length;
		const oc = makeOffline(2, n, sr);
		const buf = oc.createBuffer(2, n, sr);
		buf.getChannelData(0).set(wL);
		buf.getChannelData(1).set(wR);
		const src = oc.createBufferSource();
		src.buffer = buf;
		const cv = oc.createConvolver();
		cv.buffer = makeIR(oc, irOpts || {});
		src.connect(cv);
		cv.connect(oc.destination);
		src.start(0);
		const out = await renderOffline(oc);
		return { L: out.getChannelData(0), R: out.getChannelData(1) };
	} catch (err) {
		return null;
	}
}
