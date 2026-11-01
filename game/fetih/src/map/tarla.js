// TASLAK v2 (doku-taslak): bölgeye göre ekin dokusu — sakin sürüm.
//
// Kullanıcı (v1'e): "Çok yoğun, göz yoruyor; o güzel sakin doku azalmış." v2 ilkeleri:
//   - Düzen ana dalın (v1.5) düzeninin aynısı: kıvrık bölge ızgarası, dönük ve hafif dalgalı parsel ızgarası, bölge
//     sınırında ince toprak yol. Uzak ve oyun uzaklığında görünüş ve maliyet değişmez; yalnız parsel renkleri ilin
//     ekininden gelir (bölge kimliği: Trakya ayçiçeği, Ege zeytin-pamuk, Konya buğday-anız, Rize çay…).
//   - Ayrıntı yalnız yakın çekimde ve çok hafif: geniş aralıklı, düşük karşıtlıklı, yumuşak (sinüs) sıra; seyrek ağaç
//     tacı. Desen ekranda ~6 pikselin altına inince ortalama renge karışır: titreşim, hare, ince çizgi yok.
//   - Pivot daireleri yok (dönen kol, ıslak iz, ana dalın dalgalı ızgarasında bozuk oval); çay terasları pürüzsüz
//     yükselti dokusundan (üçgen kırığı, zikzak yok).
//   - q0: hiç yok (ana dalın ucuz yamaları; derlenmez).
// Karma tam sayı (hU): CPU'daki ikizi (fieldAt) süs nesnelerini aynı parsellere oturtur.

import * as THREE from 'three';
import { glslColor } from '../gfx/shaderlib.js';

// ------------------------------------------------------------------ ekin reçeteleri

// desen türleri (yalnız yakın çekim): 0 sıra, 1 saban izi, 2 anız şeridi, 3 düz, 4 nokta (ayçiçeği), 5 bahçe tacı,
// 6 bağ (sıra sıra küçük taç), 7 eş yükselti terası (çay), 8 sera, 9 çeltik
const T = { ROW: 0, FUR: 1, STUB: 2, PLAIN: 3, DOT: 4, ORCH: 5, VINE: 6, CONT: 7, GLASS: 8, PADDY: 9 };
export const CROP = {};
// ad, tür, zemin çarpanı (arazi rengine), öge çarpanı (taç, teras), aralık (birim), karşıtlık / taç yarıçapı
// (çarpanlar ana dalın paletinin ailesinden: aynı sakin ton aralığı)
const LIST = [
	['bugday', T.ROW, [1.16, 1.06, 0.62], [1, 1, 1], 0.07, 0.03],
	['hasat', T.STUB, [1.12, 1.06, 0.82], [1, 1, 1], 0.11, 0.03],
	['yesil', T.ROW, [0.62, 0.94, 0.5], [1, 1, 1], 0.06, 0.05],
	['saban', T.FUR, [0.84, 0.68, 0.54], [1, 1, 1], 0.055, 0.06],
	['nadas', T.PLAIN, [1.04, 1.0, 0.9], [1, 1, 1], 0.1, 0],
	['aycicegi', T.DOT, [1.2, 1.08, 0.46], [1, 1, 1], 0.07, 0.05],
	['pamuk', T.ROW, [0.88, 0.98, 0.74], [1, 1, 1], 0.065, 0.04],
	['pancar', T.ROW, [0.6, 0.9, 0.5], [1, 1, 1], 0.065, 0.06],
	['misir', T.ROW, [0.62, 0.92, 0.47], [1, 1, 1], 0.075, 0.07],
	['zeytin', T.ORCH, [1.02, 1.0, 0.86], [0.62, 0.78, 0.58], 0.14, 0.036],
	['findik', T.ORCH, [0.74, 0.9, 0.58], [0.5, 0.74, 0.44], 0.11, 0.04],
	['narenciye', T.ORCH, [0.92, 0.9, 0.74], [0.44, 0.68, 0.42], 0.12, 0.038],
	['fistik', T.ORCH, [1.06, 0.92, 0.78], [0.68, 0.84, 0.56], 0.16, 0.032],
	['kayisi', T.ORCH, [0.94, 1.0, 0.76], [0.55, 0.8, 0.47], 0.13, 0.037],
	['bag', T.VINE, [1.04, 0.96, 0.8], [0.62, 0.84, 0.5], 0.08, 0.02],
	['cay', T.CONT, [0.58, 0.98, 0.5], [0.34, 0.6, 0.3], 0.11, 0],
	['sera', T.GLASS, [1.18, 1.18, 1.18], [1, 1, 1], 0.09, 0.05],
	['celtik', T.PADDY, [0.62, 0.95, 0.7], [1, 1, 1], 0.06, 0.04],
	['lavanta', T.ROW, [0.9, 0.82, 1.12], [1, 1, 1], 0.065, 0.07],
	['gul', T.ROW, [0.74, 0.9, 0.64], [1, 1, 1], 0.065, 0.04],
	['hashas', T.PLAIN, [1.07, 1.03, 1.02], [1, 1, 1], 0.1, 0],
	['mera', T.PLAIN, [0.8, 0.96, 0.64], [1, 1, 1], 0.1, 0],
	['cayir', T.STUB, [0.86, 1.0, 0.68], [1, 1, 1], 0.12, 0.025],
	['biber', T.ROW, [0.66, 0.9, 0.52], [1, 1, 1], 0.065, 0.05],
];
LIST.forEach((c, i) => (CROP[c[0]] = i));
export const NC = LIST.length;

/**
 * Reçete uniform dizileri (yalnız yakın çekim dalı): uCB (öge çarpanı, aralık), uCC (karşıtlık / taç yarıçapı). Zemin
 * çarpanı ve tür il profili dokusunda (cropTexture satır 3–7): uzak ve oyun zumunda dizi indeksi yok.
 */
export function cropUniforms() {
	const B = [];
	for (const [, , , m2, sp] of LIST) B.push(new THREE.Vector4(m2[0], m2[1], m2[2], sp));
	const Cc = LIST.map(([, , , , , k]) => new THREE.Vector2(k, 0));
	return { uCB: { value: B }, uCC: { value: Cc } };
}

/** Köy ızgarası: 1,75 birimlik hücre, kutu (-50, -25)'ten 58 × 29 hücre; merkez kayması hücrenin ±%20'si. */
export const VIL = { cell: 1.75, x0: -50, z0: -25, nx: 58, nz: 29, jit: 0.4 };

// ------------------------------------------------------------------ il profilleri

// düz ova ekinleri [ad, ağırlık]×4, yamaç ekini, yamaç payı, yamaç üst sınırı (m), pivot, kızıl toprak,
// çit/kavak, kanal, köy, ova üst sınırı (m)
const C = CROP;
const ROAD_A = glslColor('#b59d76'); // ana dalın yol rengi
const ROAD_B = glslColor('#cdb790');
const REG = {
	marmara: { f: [['bugday', 0.3], ['aycicegi', 0.25], ['hasat', 0.2], ['saban', 0.25]], s: 'zeytin', sa: 0.15, se: 700, hedge: 0.6, canal: 0.1, vil: 0.4 },
	ege: { f: [['pamuk', 0.3], ['zeytin', 0.3], ['bag', 0.2], ['saban', 0.2]], s: 'zeytin', sa: 0.55, se: 900, hedge: 0.45, canal: 0.3, vil: 0.4 },
	akdeniz: { f: [['narenciye', 0.3], ['sera', 0.25], ['pamuk', 0.25], ['pancar', 0.2]], s: 'zeytin', sa: 0.3, se: 800, hedge: 0.4, canal: 0.35, vil: 0.35 },
	icanadolu: { f: [['bugday', 0.3], ['hasat', 0.32], ['saban', 0.23], ['nadas', 0.15]], s: 'mera', sa: 0.2, se: 1900, pivot: 0.05, hedge: 0.35, canal: 0.05, vil: 0.4 },
	karadeniz: { f: [['misir', 0.35], ['pancar', 0.25], ['yesil', 0.2], ['mera', 0.2]], s: 'findik', sa: 0.6, se: 900, hedge: 0.7, canal: 0, vil: 0.45 },
	dogu: { f: [['mera', 0.4], ['cayir', 0.3], ['bugday', 0.15], ['saban', 0.15]], s: 'mera', sa: 0.5, se: 2600, hedge: 0.15, canal: 0.05, vil: 0.35, top: 2500 },
	guneydogu: { f: [['bugday', 0.3], ['hasat', 0.25], ['pamuk', 0.25], ['fistik', 0.2]], s: 'fistik', sa: 0.35, se: 1200, red: 0.55, hedge: 0.2, canal: 0.2, vil: 0.4 },
};
// il özel (plaka): yalnızca farklı alanlar
const PROV = {
	22: { f: [['aycicegi', 0.4], ['bugday', 0.25], ['celtik', 0.15], ['hasat', 0.2]] }, // Edirne
	39: { f: [['aycicegi', 0.4], ['bugday', 0.3], ['hasat', 0.15], ['saban', 0.15]] }, // Kırklareli
	59: { f: [['aycicegi', 0.4], ['bugday', 0.3], ['hasat', 0.15], ['bag', 0.15]] }, // Tekirdağ
	17: { f: [['bugday', 0.3], ['aycicegi', 0.25], ['biber', 0.2], ['hasat', 0.25]], s: 'zeytin', sa: 0.45 }, // Çanakkale
	10: { f: [['bugday', 0.3], ['aycicegi', 0.25], ['hasat', 0.2], ['saban', 0.25]], s: 'zeytin', sa: 0.5 }, // Balıkesir
	16: { f: [['pancar', 0.3], ['kayisi', 0.25], ['misir', 0.2], ['bugday', 0.25]], s: 'zeytin', sa: 0.4 }, // Bursa
	77: { f: [['sera', 0.4], ['pancar', 0.3], ['kayisi', 0.15], ['yesil', 0.15]] }, // Yalova
	54: { f: [['misir', 0.4], ['pancar', 0.3], ['yesil', 0.3], ['yesil', 0]], s: 'findik', sa: 0.8 }, // Sakarya
	81: { f: [['misir', 0.5], ['yesil', 0.3], ['mera', 0.2], ['mera', 0]], s: 'findik', sa: 0.8 }, // Düzce
	35: { f: [['pamuk', 0.3], ['bag', 0.25], ['biber', 0.2], ['zeytin', 0.25]], s: 'zeytin', sa: 0.6 }, // İzmir
	45: { f: [['bag', 0.45], ['pamuk', 0.2], ['zeytin', 0.2], ['bugday', 0.15]], s: 'bag', sa: 0.5, se: 1000 }, // Manisa
	9: { f: [['pamuk', 0.4], ['zeytin', 0.25], ['kayisi', 0.2], ['pancar', 0.15]], s: 'zeytin', sa: 0.7 }, // Aydın (incir: kayısı tacı)
	48: { f: [['zeytin', 0.4], ['narenciye', 0.25], ['sera', 0.15], ['pancar', 0.2]], s: 'zeytin', sa: 0.6 }, // Muğla
	20: { f: [['bag', 0.3], ['pamuk', 0.25], ['bugday', 0.25], ['hasat', 0.2]], s: 'bag', sa: 0.3, se: 1100 }, // Denizli
	3: { f: [['bugday', 0.3], ['hashas', 0.25], ['pancar', 0.2], ['hasat', 0.25]] }, // Afyon
	64: { f: [['bugday', 0.3], ['hashas', 0.2], ['hasat', 0.25], ['saban', 0.25]] }, // Uşak
	7: { f: [['sera', 0.4], ['narenciye', 0.3], ['pamuk', 0.15], ['pancar', 0.15]], s: 'zeytin', sa: 0.2 }, // Antalya
	33: { f: [['narenciye', 0.35], ['sera', 0.35], ['pancar', 0.3], ['pancar', 0]], s: 'zeytin', sa: 0.2 }, // Mersin
	1: { f: [['pamuk', 0.35], ['misir', 0.2], ['narenciye', 0.2], ['bugday', 0.25]], canal: 0.6 }, // Adana
	80: { f: [['pamuk', 0.3], ['misir', 0.3], ['pancar', 0.2], ['bugday', 0.2]], canal: 0.45 }, // Osmaniye
	31: { f: [['pamuk', 0.3], ['narenciye', 0.25], ['bugday', 0.25], ['pancar', 0.2]], s: 'zeytin', sa: 0.5 }, // Hatay
	46: { f: [['bugday', 0.3], ['biber', 0.25], ['pamuk', 0.2], ['hasat', 0.25]] }, // K. Maraş
	32: { f: [['kayisi', 0.35], ['gul', 0.25], ['lavanta', 0.2], ['bugday', 0.2]], s: 'kayisi', sa: 0.3, se: 1400 }, // Isparta (elma, gül, lavanta)
	15: { f: [['bugday', 0.3], ['lavanta', 0.2], ['pancar', 0.25], ['hasat', 0.25]] }, // Burdur
	42: { f: [['bugday', 0.28], ['hasat', 0.3], ['saban', 0.2], ['pancar', 0.22]], pivot: 0.18 }, // Konya
	70: { f: [['bugday', 0.3], ['hasat', 0.25], ['kayisi', 0.25], ['saban', 0.2]], pivot: 0.12 }, // Karaman
	68: { f: [['bugday', 0.35], ['hasat', 0.25], ['pancar', 0.2], ['saban', 0.2]], pivot: 0.14 }, // Aksaray
	51: { f: [['kayisi', 0.3], ['pancar', 0.3], ['bugday', 0.2], ['hasat', 0.2]] }, // Niğde (elma, patates)
	50: { f: [['bag', 0.38], ['pancar', 0.22], ['bugday', 0.2], ['kayisi', 0.2]], s: 'bag', sa: 0.5, se: 1500, red: 0.25 }, // Nevşehir
	38: { f: [['bugday', 0.35], ['hasat', 0.25], ['pancar', 0.2], ['saban', 0.2]] }, // Kayseri
	6: { f: [['bugday', 0.35], ['hasat', 0.25], ['aycicegi', 0.15], ['saban', 0.25]] }, // Ankara
	26: { f: [['bugday', 0.3], ['pancar', 0.25], ['aycicegi', 0.2], ['hasat', 0.25]] }, // Eskişehir
	53: { f: [['misir', 0.4], ['yesil', 0.3], ['mera', 0.3], ['mera', 0]], s: 'cay', sa: 1.0, se: 1100 }, // Rize
	8: { f: [['misir', 0.5], ['mera', 0.5], ['mera', 0], ['mera', 0]], s: 'cay', sa: 0.75, se: 1000 }, // Artvin
	61: { f: [['misir', 0.5], ['yesil', 0.25], ['mera', 0.25], ['mera', 0]], s: 'findik', sa: 0.85 }, // Trabzon
	28: { f: [['misir', 0.4], ['findik', 0.3], ['yesil', 0.3], ['yesil', 0]], s: 'findik', sa: 1.0, se: 1000 }, // Giresun
	52: { f: [['misir', 0.4], ['findik', 0.3], ['yesil', 0.3], ['yesil', 0]], s: 'findik', sa: 1.0, se: 1000 }, // Ordu
	55: { f: [['celtik', 0.25], ['pancar', 0.3], ['misir', 0.25], ['bugday', 0.2]], s: 'findik', sa: 0.5 }, // Samsun
	5: { f: [['kayisi', 0.4], ['pancar', 0.2], ['bugday', 0.2], ['yesil', 0.2]] }, // Amasya (elma)
	19: { f: [['bugday', 0.35], ['hasat', 0.25], ['celtik', 0.1], ['saban', 0.3]] }, // Çorum
	36: { f: [['mera', 0.45], ['cayir', 0.35], ['bugday', 0.1], ['saban', 0.1]], s: 'mera', sa: 0.6 }, // Kars
	75: { f: [['mera', 0.45], ['cayir', 0.35], ['bugday', 0.1], ['saban', 0.1]], s: 'mera', sa: 0.6 }, // Ardahan
	25: { f: [['mera', 0.35], ['cayir', 0.3], ['bugday', 0.2], ['saban', 0.15]] }, // Erzurum
	44: { f: [['kayisi', 0.55], ['bugday', 0.2], ['hasat', 0.1], ['saban', 0.15]], s: 'kayisi', sa: 0.5, se: 1500 }, // Malatya
	23: { f: [['bag', 0.3], ['kayisi', 0.3], ['bugday', 0.25], ['hasat', 0.15]], s: 'bag', sa: 0.35, se: 1400 }, // Elazığ
	76: { f: [['kayisi', 0.3], ['pamuk', 0.25], ['pancar', 0.25], ['bugday', 0.2]] }, // Iğdır
	27: { f: [['fistik', 0.4], ['zeytin', 0.2], ['bag', 0.2], ['bugday', 0.2]], s: 'fistik', sa: 0.7, red: 0.75 }, // Gaziantep
	63: { f: [['pamuk', 0.4], ['bugday', 0.3], ['hasat', 0.2], ['fistik', 0.1]], pivot: 0.08, canal: 0.5, red: 0.7 }, // Şanlıurfa (Harran)
	21: { f: [['bugday', 0.35], ['pamuk', 0.2], ['biber', 0.2], ['hasat', 0.25]], red: 0.6 }, // Diyarbakır (karpuz, biber)
	47: { f: [['bugday', 0.35], ['hasat', 0.3], ['pamuk', 0.2], ['saban', 0.15]], red: 0.6 }, // Mardin
	2: { f: [['fistik', 0.35], ['bugday', 0.3], ['hasat', 0.2], ['saban', 0.15]], s: 'fistik', sa: 0.5, red: 0.6 }, // Adıyaman
	79: { f: [['zeytin', 0.55], ['bag', 0.25], ['bugday', 0.2], ['bugday', 0]], s: 'zeytin', sa: 0.6, red: 0.6 }, // Kilis
	56: { f: [['fistik', 0.4], ['bugday', 0.3], ['saban', 0.3], ['saban', 0]], s: 'fistik', sa: 0.5, red: 0.5 }, // Siirt
};

/** Bir ilin tam profili (bölge varsayılanı + il özel). */
export function profileOf(p) {
	return { ...REG[p.region], ...(PROV[p.id] || {}) };
}

/**
 * İl başına profil dokusu (N × 3, RGBA8). 0: maske satırı (ova üst sınırı / yüz m, yamaç payı, kızıl toprak, yamaç ekini):
 * her kara pikseli yalnız bunu okur. 1: ova ekin kimlikleri. 2: birikimli ağırlıklar (3) ve pivot payı (yalnız tarla
 * rengi çizilirken okunur). Açılışta bir kez kurulur (243 piksel).
 */
export function cropTexture(provinces) {
	const N = provinces.length;
	const d = new Float32Array(N * 3 * 4);
	const put = (i, row, v) => d.set(v, (row * N + i) * 4);
	const b8 = (x) => Math.max(0, Math.min(255, Math.round(x)));
	// zemin çarpanı 3 × 8 bit tek kayan sayıda (tam sayı < 2^24: düz aktarımda kayıpsız)
	const mul = (k) => {
		const m = LIST[k][2];
		return b8((m[0] / 1.5) * 255) + b8((m[1] / 1.5) * 255) * 256 + b8((m[2] / 1.5) * 255) * 65536;
	};
	const TOP = { cay: 1100, findik: 1000, zeytin: 900, bag: 1500, kayisi: 1500, fistik: 1200, mera: 2600 };
	provinces.forEach((p, i) => {
		const P = profileOf(p);
		const f = P.f;
		const ids = f.map((c) => CROP[c[0]]);
		const sk = CROP[P.s] ?? 0;
		const W = weights(f).map((w) => b8(w * 255));
		// 0: ova üst sınırı (100 m), yamaç payı, kızıl toprak, yamaç ekini + yamaç üst sınırı (m) × 32
		put(i, 0, [(P.top ?? 1600) / 100, P.sa ?? 0, P.red ?? 0, sk + (TOP[P.s] ?? 1000) * 32]);
		// 1: dört ova ekininin zemin çarpanı (paketli)
		put(i, 1, ids.map(mul));
		// 2: yamaç ekininin çarpanı, birikimli ağırlıklar (3 × 8 bit), desen türleri (5 × 4 bit), ova ekin kimlikleri
		//    (4 × 5 bit). Hepsi köşede bir kez okunur, düz aktarılır: piksel başına doku okuması ve dizi indeksi yok.
		const types = [...ids, sk].reduce((a, k, j) => a + LIST[k][1] * 16 ** j, 0);
		const idp = ids.reduce((a, k, j) => a + k * 32 ** j, 0);
		put(i, 2, [mul(sk), W[0] + W[1] * 256 + W[2] * 65536, types, idp]);
	});
	const tex = new THREE.DataTexture(d, N, 3, THREE.RGBAFormat, THREE.FloatType);
	tex.magFilter = tex.minFilter = THREE.NearestFilter;
	tex.generateMipmaps = false;
	tex.colorSpace = THREE.NoColorSpace;
	tex.needsUpdate = true;
	return tex;
}


/** Birikimli ağırlıklar (8 bit; shader ile aynı yuvarlama). */
export function weights(f) {
	const tot = f.reduce((a, x) => a + x[1], 0) || 1;
	let acc = 0;
	const W = f.map((x) => Math.round((acc += x[1] / tot) * 255) / 255);
	W[3] = 1;
	return W;
}

/**
 * Pürüzsüz yükselti dokusu (kabartma ızgarası 0,4 birim, çift doğrusal süzgeç): çay teraslarının eş yükselti eğrileri.
 * Harita ağının yüksekliği ince sırt gürültüsü ve üçgen yüzeyleri içerdiğinden eğriler zikzak çiziyordu; bu doku
 * gürültüsüz ve üçgenden bağımsız. R8: karekök kodlu (relief.json ile aynı).
 */
export function reliefTexture(relief) {
	const m = relief.m;
	const n = m.w * m.h;
	const d = new Uint8Array(n);
	for (let k = 0; k < n; k++) d[k] = Math.round(Math.sqrt(Math.max(0, relief.E[k]) / m.emax) * 255);
	const tex = new THREE.DataTexture(d, m.w, m.h, THREE.RedFormat, THREE.UnsignedByteType);
	tex.unpackAlignment = 1; // 234 bayt satır: 4 bayt hizası yüklemeyi bozuyordu
	tex.magFilter = tex.minFilter = THREE.LinearFilter;
	tex.generateMipmaps = false;
	tex.colorSpace = THREE.NoColorSpace;
	tex.needsUpdate = true;
	const box = new THREE.Vector4(m.x0 - m.step * 0.5, m.y0 - m.step * 0.5, 1 / (m.w * m.step), 1 / (m.h * m.step));
	return { tex, box, emax: m.emax };
}

// ------------------------------------------------------------------ GLSL

export const TARLA = /* glsl */ `
#define NCROP ${NC}
uniform highp sampler2D uCrop; // il başına ekin profili (il × 3, RGBA32F, paketli): köşe gölgelendiricisi okur
flat varying vec4 vPc;        // dört ova ekininin zemin çarpanı (paketli)
flat varying vec4 vPx;        // yamaç çarpanı, ağırlıklar, türler, ekin kimlikleri (paketli)
uniform sampler2D uVil;       // köy ızgarası (hayat.js yerleştirir): r var, g/b merkez kayması, a boyut
uniform sampler2D uRel;       // pürüzsüz yükselti (çay terası)
uniform vec4 uRelBox;         // x0, y0 (kuzey), 1/en, 1/boy
uniform vec4 uCB[NCROP];      // öge çarpanı (taç, teras), aralık
uniform vec2 uCC[NCROP];      // karşıtlık / taç yarıçapı
vec2 gDn = vec2(0.0);         // mikro kabartma: ışık normaline eklenen dünya xz eğimi (hafif)
float gMsh = 1.0;             // taç gölgesi: güneş payı
float gGl = 0.0;              // ek cila (sera, çeltik)
float gCropK = 0.0;           // ekin deseni payı (ince tane gürültüsü azalır)
float gEyeD = 99.0;           // kameraya uzaklık (board.js main): köy toprağı köy evleriyle aynı uzaklıkta söner
vec4 gPm;                     // il profili maske satırı: ova üst sınırı, yamaç payı + kızıl toprak, yamaç ekini, yamaç üst sınırı
float gRed = 0.0;             // kızıl toprak payı (board.js çözer)
int gSlopeK = 0;              // yamaç ekini (reçete sırası)

// tam sayı karması: CPU'daki ikizi tarla.js hU()
uint hU(uvec2 v) {
	uint h = (v.x * 0x8da6b343u) ^ (v.y * 0xd8163841u);
	h ^= h >> 15u;
	h *= 0x2c1b3c6du;
	h ^= h >> 12u;
	h *= 0x297a2d39u;
	h ^= h >> 15u;
	return h;
}
float u8(uint h, uint sh) {
	return float((h >> sh) & 255u) * (1.0 / 256.0);
}
// pürüzsüz yükselti (çay yamacı): yükseklik (dünya birimi) ve yokuş yukarı eğim; üç doku okuması, yalnız çay illerinde
float gRelH = 0.0;
vec2 gRelG = vec2(0.0);
void relGrad(vec2 q) {
	vec2 ruv = vec2((q.x - uRelBox.x) * uRelBox.z, (-q.y - uRelBox.y) * uRelBox.w);
	float e0 = texture(uRel, ruv).r;
	float e1 = texture(uRel, ruv + vec2(0.1 * uRelBox.z, 0.0)).r;
	float e2 = texture(uRel, ruv - vec2(0.0, 0.1 * uRelBox.w)).r;
	const float KH = ${(5200 * 0.00054).toFixed(4)};
	gRelH = e0 * e0 * KH;
	gRelG = vec2(e1 * e1 * KH - gRelH, e2 * e2 * KH - gRelH) / 0.1;
}

/**
 * Tarlalar. Düzen, yol ve kenar koyuluğu ana dalın (v1.5) aynısı; renk ilin ekininden. Yakın çekimde (upx < 0,0085)
 * hafif sıra / taç / teras. farm: düz ova maskesi, mS: yamaç tarımı maskesi, upx / hpx: konumun ve yüksekliğin piksel izi.
 */
vec3 tarla(vec3 c, vec2 q, vec4 f1, vec4 f3, float upx, float hpx, float farm, float mS, vec3 N, float pid) {
	float n1 = f1.r;
	float n2 = f1.g;
	vec2 zq = q * 0.16 + n1 * 0.6;
	vec2 zone = floor(zq);
	uint hz = hU(uvec2(ivec2(zone) + 4096));
	float ang = float(hz >> 16u) * (3.14159265 / 65536.0);
	vec2 cs = vec2(cos(ang), sin(ang));
	vec2 rq = vec2(cs.x * q.x + cs.y * q.y, -cs.y * q.x + cs.x * q.y);
	vec2 fq = rq * vec2(1.7, 0.95) + vec2(n2 * 0.7, n1 * 0.9);
	// türevler dallanmadan önce
	float fpx = fwidth(fq.x) + fwidth(fq.y);
	vec2 zw = max(fwidth(zq), vec2(1e-5));
	float fade = 1.0 - smoothstep(0.3, 0.75, fpx);
	float k0 = max(farm, mS) * fade;
	if (k0 < 0.003) return c;
	vec2 cell = floor(fq);
	vec2 fr = fq - cell;
	uint hp = hU(uvec2(ivec2(cell) + 65536) + uvec2(hz, hz >> 11u));
	float rPick = u8(hp, 24u);
	float rBri = u8(hp, 8u);
	float rMisc = u8(hp, 0u);
	bool slope = mS > farm;
	// ekin: il profilinden (köşede okundu, düz aktarıldı; piksel başına doku okuması ve dizi indeksi yok)
	uint pw = uint(vPx.y + 0.5);
	vec3 Wc = vec3(float(pw & 255u), float((pw >> 8u) & 255u), float(pw >> 16u)) * (1.0 / 255.0);
	int slot = slope ? 4 : rPick < Wc.x ? 0 : rPick < Wc.y ? 1 : rPick < Wc.z ? 2 : 3;
	uint pm = uint((slot == 4 ? vPx.x : slot == 0 ? vPc.x : slot == 1 ? vPc.y : slot == 2 ? vPc.z : vPc.w) + 0.5);
	vec4 A = vec4(vec3(float(pm & 255u), float((pm >> 8u) & 255u), float(pm >> 16u)) * (1.5 / 255.0), 0.0);
	int ty = int((uint(vPx.z + 0.5) >> (uint(slot) * 4u)) & 15u);
	// yamaçta parsellerin bir kısmı doğal yamaç; çay terası kesintisiz
	float fm = slope ? mS * (ty == ${T.CONT} ? 1.0 : step(rMisc, 0.78)) : farm;
	vec3 soil = mix(vec3(1.0), vec3(1.06, 0.86, 0.78), gRed);
	vec3 fc = c * A.rgb * soil * (0.95 + 0.1 * rBri);
	// tarla kenarı (ana dal): ince koyu sınır otu
	float edge = min(min(fr.x, 1.0 - fr.x), min(fr.y, 1.0 - fr.y));
	if (ty != ${T.CONT}) fc *= mix(0.8, 1.0, smoothstep(0.0, 0.05 + fpx, edge));
	// --- yakın çekim: hafif ekin dokusu (geniş aralık, düşük karşıtlık, yumuşak profil; pikselden küçülünce söner).
	// Yalnız yakın zum programında derlenir (TARLA_YAKIN): uzak ve oyun zumu programı ana dalın maliyetinde kalır (büyük
	// dal, atlansa bile yazmaç baskısıyla bütün gölgelendiriciyi yavaşlatıyordu).
#if TARLA_YAKIN
	if (upx < 0.012) {
		// ince desen (sıra, nokta, asma) yalnız çok yakında; iri öge (ağaç tacı, çay terası) oyuncunun en yakın zumunda da
		float near = ty == ${T.ORCH} || ty == ${T.CONT} ? 1.0 - smoothstep(0.009, 0.012, upx) : 1.0 - smoothstep(0.006, 0.0085, upx);
		int k = slope ? gSlopeK : int((uint(vPx.w + 0.5) >> (uint(slot) * 5u)) & 31u); // reçete (yalnız yakın çekim dalı)
		vec4 B = uCB[k];
		float sp = B.w;
		float kk = uCC[k].x;
		float vis = (1.0 - smoothstep(0.12, 0.2, upx / sp)) * near;
		vec2 eAc = vec2(cs.x, cs.y); // parselin kısa ekseni (sıralar arası) dünyada
		vec2 eAl = vec2(-cs.y, cs.x); // uzun ekseni (sıra boyunca)
		if (vis > 0.002) {
			if (ty == ${T.ROW} || ty == ${T.FUR} || ty == ${T.PADDY}) {
				float t = rq.x / sp * 6.2832;
				fc *= 1.0 + kk * sin(t) * vis;
				gDn += eAc * cos(t) * (ty == ${T.FUR} ? 0.22 : 0.12) * vis;
				if (ty == ${T.PADDY}) gGl += 0.25 * vis;
			} else if (ty == ${T.STUB}) {
				// biçer şeritleri: geniş, yumuşak, açık-koyu
				fc *= 1.0 + kk * sin(rq.x / sp * 6.2832) * vis;
			} else if (ty == ${T.DOT}) {
				vec2 g = vec2(rq.x, rq.y) / sp;
				float d = length(fract(g) - 0.5) * sp;
				fc *= 1.0 + kk * (1.0 - smoothstep(sp * 0.22, sp * 0.36, d)) * vis;
			} else if (ty == ${T.ORCH} || ty == ${T.VINE}) {
				// ağaç tacı / asma: seyrek, yumuşak gölgeli kubbe
				vec2 spv = ty == ${T.VINE} ? vec2(sp, sp * 0.6) : vec2(sp);
				vec2 g = vec2(rq.x, rq.y) / spv;
				vec2 ce = floor(g);
				vec2 jt = fract(vec2(dot(ce, vec2(0.6180339, 0.4142136)), dot(ce, vec2(0.7548777, 0.5698403)))) - 0.5;
				vec2 f = (g - ce - 0.5 - jt * 0.16) * spv;
				float rad = kk * (0.88 + 0.24 * fract(jt.x * 7.13 + 0.5));
				float d = length(f);
				float tv = (1.0 - smoothstep(0.12, 0.22, upx / min(spv.x, spv.y))) * near;
				float m = (1.0 - smoothstep(rad - upx * 1.2, rad + upx * 1.2, d)) * tv;
				// taç: güneşe bakan yarısı açık, kenarı koyu (küçük kubbe); gölgesi arkada
				float rr = clamp(1.0 - d / rad, 0.0, 1.0);
				float lit = 0.5 + 0.5 * dot(normalize(f + 1e-5), -normalize(vec2(dot(uSunDir.xz, eAc), dot(uSunDir.xz, eAl)) + 1e-5));
				vec3 crown = c * B.rgb * soil * (0.82 + 0.16 * rr + 0.14 * (1.0 - lit) * (1.0 - rr));
				// yumuşak taç gölgesi (güneşin karşısı), hafif
				vec2 sunL = vec2(dot(uSunDir.xz, eAc), dot(uSunDir.xz, eAl)) / max(uSunDir.y, 0.3);
				float sd = length(f + sunL * rad * 0.9);
				float shd = (1.0 - smoothstep(rad * 0.6, rad * 1.25, sd)) * (1.0 - m) * tv;
				fc = mix(fc, crown, m);
				gMsh *= 1.0 - 0.22 * shd;
				gDn += (eAc * f.x + eAl * f.y) / max(rad, 1e-4) * 0.08 * m;
			} else if (ty == ${T.CONT}) {
				// çay terası: pürüzsüz yükseltinin (dokudan, üçgenden bağımsız) eş yükselti eğrileri. Eğim ve piksel izi de
				// aynı dokudan (ağ yüksekliğinin türevi üçgen üçgen sıçrıyordu: zikzak ve kesik kesik görünüm)
				// (gRelH, gRelG: board.js çay ilinde maske için zaten okudu)
				float hm = gRelH;
				vec2 gh = gRelG; // yokuş yukarı (dünya x, z)
				float F = 1.0 / (sp * 0.8);
				float t = hm * F + (n2 - 0.5) * 0.25;
				float tf = length(gh) * F * upx * 1.6; // piksel başına teras (eğik bakış payıyla)
				float tw = (1.0 - smoothstep(0.12, 0.24, tf)) * near;
				// teras: geniş, açık yeşil sıra; aşağı kenarında ince koyu set (basamak gölgesi)
				float tt = fract(t);
				float riser = smoothstep(0.6, 0.72, tt) * (1.0 - smoothstep(0.88, 0.99, tt));
				// çay sırası: teras düzlüğü açık, set dibi koyu (yumuşak geçiş; ince çizgi yok)
				fc = mix(fc * (0.94 + 0.12 * tt), c * B.rgb * soil, riser * tw);
				vec2 gd = -gh / max(length(gh), 1e-4); // yokuş aşağı
				gDn += gd * (riser - 0.25) * 0.15 * tw;
			} else if (ty == ${T.GLASS}) {
				float t = rq.x / sp * 6.2832;
				fc *= 1.0 + kk * sin(t) * vis;
				gGl += 0.35 * vis;
			}
		}
	}
#endif
	// --- bölge sınırı toprak yolu (ana dal): her yakınlıkta ince ve keskin; yol boyu hafif çit gölgesi
	vec2 zd = (0.5 - abs(fract(zq) - 0.5)) / zw;
	float zpx = min(zd.x, zd.y);
	float hw = max(0.0056 / max(zw.x, zw.y), 0.7);
	float road = 1.0 - smoothstep(hw - 0.7, hw + 0.7, zpx);
	float hedge = (1.0 - smoothstep(hw, hw * 2.2 + 1.5, zpx)) * (1.0 - road);
	fc *= 1.0 - hedge * 0.14;
	fc = mix(fc, mix(${ROAD_A}, ${ROAD_B}, f3.g), road);
	// --- köy: çiğnenmiş toprak (evleri hayat.js kurar; aynı köy ızgarası). Evlerle aynı kamera uzaklığında söner.
#if TARLA_YAKIN
	if (gEyeD < 12.4) {
		vec2 vi = clamp(floor((q + vec2(50.0, 25.0)) / ${VIL.cell.toFixed(2)}), vec2(0.0), vec2(${VIL.nx - 1}.0, ${VIL.nz - 1}.0));
		vec4 vt = texelFetch(uVil, ivec2(vi), 0);
		if (vt.r > 0.5) {
			vec2 vcen = (vi + 0.5 + (vt.gb - 0.5) * ${VIL.jit.toFixed(2)}) * ${VIL.cell.toFixed(2)} - vec2(50.0, 25.0);
			float dC = length(q - vcen) / mix(0.8, 1.0, vt.a);
			float vk = (1.0 - smoothstep(0.38, 0.58, dC)) * (1.0 - smoothstep(9.8, 12.4, gEyeD));
			vec3 earth = c * vec3(0.98, 0.9, 0.78) * soil;
			fc = mix(fc, earth, vk * 0.75);
		}
	}
#endif
	gCropK = max(gCropK, fm * fade);
	return mix(c, fc, fm * fade * 0.92);
}
`;

// ------------------------------------------------------------------ CPU ikizi (süs nesneleri için)

/** GLSL hU ikizi (32 bit). */
export function hU(x, y) {
	let h = (Math.imul(x >>> 0, 0x8da6b343) ^ Math.imul(y >>> 0, 0xd8163841)) >>> 0;
	h = (h ^ (h >>> 15)) >>> 0;
	h = Math.imul(h, 0x2c1b3c6d) >>> 0;
	h = (h ^ (h >>> 12)) >>> 0;
	h = Math.imul(h, 0x297a2d39) >>> 0;
	h = (h ^ (h >>> 15)) >>> 0;
	return h;
}

/** Gürültü dokusundan çift doğrusal örnek (GPU ile aynı: tekrarlı, doku piksel merkezli). */
export function noiseAt(data, u, v, ch) {
	const N = 256;
	const x = u * N - 0.5;
	const y = v * N - 0.5;
	const i = Math.floor(x);
	const j = Math.floor(y);
	const fx = x - i;
	const fy = y - j;
	const w = (a) => ((a % N) + N) % N;
	const at = (a, b) => data[(w(b) * N + w(a)) * 4 + ch] / 255;
	const a = at(i, j) + (at(i + 1, j) - at(i, j)) * fx;
	const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * fx;
	return a + (b - a) * fy;
}

/**
 * Bir dünya noktasının tarlası (shader'daki tarla() ile aynı hesap): bölge, parsel, ekin, sıra yönü.
 * profile: il profili, noise: gürültü verisi. slope: noktada yamaç ekini baskınsa ilin yamaç ekini.
 */
export function fieldAt(x, z, profile, noise, slope = false) {
	const n1 = noiseAt(noise, x / 48, z / 48, 0);
	const n2 = noiseAt(noise, x / 48, z / 48, 1);
	const zqx = x * 0.16 + n1 * 0.6;
	const zqy = z * 0.16 + n1 * 0.6;
	const zx = Math.floor(zqx);
	const zy = Math.floor(zqy);
	const hz = hU(zx + 4096, zy + 4096);
	const ang = (hz >>> 16) * (3.14159265 / 65536);
	const c = Math.cos(ang);
	const s = Math.sin(ang);
	const rqx = c * x + s * z;
	const rqy = -s * x + c * z;
	const fqx = rqx * 1.7 + n2 * 0.7;
	const fqy = rqy * 0.95 + n1 * 0.9;
	const cx = Math.floor(fqx);
	const cy = Math.floor(fqy);
	const hp = hU(cx + 65536 + hz, cy + 65536 + (hz >>> 11));
	const rMisc = (hp & 255) / 256;
	let crop;
	if (slope) crop = profile.s;
	else {
		const f = profile.f;
		// doku ile aynı 8 bit ağırlık (sınırda shader ile aynı parsel ekini)
		const W = weights(f).map((w) => Math.max(0, Math.min(255, Math.round(w * 255))) / 255);
		const rPick = ((hp >>> 24) & 255) / 256;
		crop = rPick < W[0] ? f[0][0] : rPick < W[1] ? f[1][0] : rPick < W[2] ? f[2][0] : f[3][0];
	}
	const frx = fqx - cx;
	const fry = fqy - cy;
	return {
		zone: [zx, zy],
		cell: [cx, cy],
		key: `${zx},${zy},${cx},${cy}`,
		crop,
		natural: slope && profile.s !== 'cay' && rMisc >= 0.78,
		piv: false, // v2: pivot dairesi yok
		// parsel içindeki konum (0..1) ve kenara uzaklık (parsel birimi)
		fr: [frx, fry],
		edge: Math.min(frx, 1 - frx, fry, 1 - fry),
		// bölge sınırına uzaklık (bölge birimi; dünya ≈ / 0,16)
		zoneEdge: Math.min(zqx - zx, 1 - (zqx - zx), zqy - zy, 1 - (zqy - zy)),
		// sıra yönü (parselin uzun ekseni) ve sıralar arası yön (dünya xz)
		along: [-s, c],
		across: [c, s],
	};
}

