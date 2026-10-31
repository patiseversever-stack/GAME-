// Ses işçisi: müzik ve efekt pişirme (saf JS sentez: synth.js, songs.js, sounds.js, dsp.js) ana iş parçacığının dışında.
// Oyun karesi bu hesapla yarışmaz (eskiden pişirme ~6 ms dilimlerle ana iş parçacığını meşgul ediyordu).
// Yankı: işçide saf JS FFT evrişimi (conv.js), ConvolverNode ile aynı sonuç. Diziler kopyalanmadan aktarılır (transfer).
//
// İleti: { t: 'sfx', id, name, opts, low } | { t: 'music', id, name, low } → { t: 'done', id, r } (r null: başarısız)
//        işçi → ana: { t: 'rv', k, wL, wR, sr, ir } ; ana → işçi: { t: 'rv', k, out: {L, R} | null }
import { renderSfx, renderTheme, setReverb } from './bake.js';
import { reverbJS } from './conv.js';
import { buildSample, BANK_RATE } from './dsp.js';

const own = (a) => (a.byteOffset === 0 && a.byteLength === a.buffer.byteLength ? a : a.slice());
let k = 0;
const waits = new Map();
// yankı işçide, saf JS FFT evrişimiyle (conv.js; ConvolverNode ile aynı yanıt ve normalleştirme). Ana iş parçacığına
// hiç dönülmez (ConvolverNode'a yanıt atamak ana tarafta ~15 ms eşzamanlı iş). İstenirse (sınama) ana tarafa yaptırılır.
let jsReverb = true;
setReverb((wL, wR, sr, ir) => {
	if (jsReverb) return Promise.resolve(reverbJS(wL, wR, sr, ir || {}));
	const id = ++k;
	const a = own(wL);
	const b = own(wR);
	self.postMessage({ t: 'rv', k: id, wL: a, wR: b, sr, ir }, [a.buffer, b.buffer]);
	return new Promise((res) => waits.set(id, res));
});
const noPause = () => Promise.resolve();

self.onmessage = async (e) => {
	const m = e.data;
	if (m.t === 'mode') {
		jsReverb = m.js;
		return;
	}
	if (m.t === 'rv') {
		const f = waits.get(m.k);
		waits.delete(m.k);
		f?.(m.out);
		return;
	}
	if (m.t === 'samples') {
		// canlı vuruş örnekleri (tef, zil, darbuka…): hepsi burada üretilir, ana taraf yalnız AudioBuffer'a kopyalar
		const out = {};
		const tr = [];
		for (const n of m.names) {
			try {
				const d = buildSample(n, BANK_RATE);
				if (d) {
					const a = own(d);
					out[n] = a;
					tr.push(a.buffer);
				}
			} catch (err) {
				/* o örnek ana tarafta üretilir */
			}
		}
		self.postMessage({ t: 'done', id: m.id, r: out }, tr);
		return;
	}
	let r = null;
	try {
		if (m.t === 'sfx') r = await renderSfx(m.name, m.opts, { low: m.low });
		else if (m.t === 'music') r = await renderTheme(m.name, { low: m.low, pause: noPause });
	} catch (err) {
		r = null;
	}
	const tr = [];
	if (r) {
		if (m.t === 'sfx') {
			r.L = own(r.L);
			tr.push(r.L.buffer);
			if (r.R) {
				r.R = own(r.R);
				tr.push(r.R.buffer);
			}
		} else
			for (const st of r.stems) {
				st.L = own(st.L);
				st.R = own(st.R);
				tr.push(st.L.buffer, st.R.buffer);
			}
	}
	self.postMessage({ t: 'done', id: m.id, r }, tr);
};
