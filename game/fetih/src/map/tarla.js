// TASLAK (doku-taslak): bölgeye göre ekin dokusu. Yakın çekimde tarlalar gerçek ekin karakteri kazanır.
//
// Harita yüzeyinin (board.js PROV_FS) tarla deseni burada üretilir; her şey tek parça shader'ında, ek çizim yok:
//   - Bölge ızgarası (~6 birim, hafif kıvrık): sınırları köy yolu (yanında kavak dizisi), sulama kanalı ya da çit.
//     Bölge köşelerinin bir kısmı köy: harman yeri, bostan, çiğnenmiş toprak (evler süs katmanında: hayat.js).
//   - Parseller: her sırada farklı genişlik ve kayma (T kavşaklar), bir kısmı uzun ince şeritlere bölünür.
//   - Ekin: il profili (bölge + il özel) ağırlıklı seçim. Buğday (rüzgâr dalgası), biçilmiş anız + balya, taze
//     ekin, saban izi, nadas, ayçiçeği, pamuk, pancar/sebze, mısır, zeytin, fındık, narenciye, fıstık, kayısı/elma,
//     bağ, çay (yamaçta eş yükselti terasları), sera, çeltik, lavanta, gül, haşhaş, mera (taş duvar), çayır + tınaz,
//     biber. Konya ve Harran'da pivot sulama daireleri (dönen kol, ıslak iz, tekerlek izleri).
//   - Yamaç tarımı: Rize'de çay terası, Ordu-Giresun'da fındık, Ege'de zeytin, Antep'te fıstık… eş yükselti eğrisinde.
// Ucuzluk: ayrıntı pikselin ekran izine göre söner (fwidth; uzak görünüm ayrıntı dalını hiç çalıştırmaz), ince desen
// alt piksele inince ortalama rengine karışır (titreşim ve hare yok). Karma tam sayı (pcg3d): CPU'daki ikizi
// (fieldAt) süs nesnelerini aynı tarlalara oturtur.

import * as THREE from 'three';

// ------------------------------------------------------------------ ekin reçeteleri

// desen türleri: 0 sıra, 1 nokta (taç/çiçek), 2 saban izi, 3 biçilmiş (biçer izi + balya), 4 düz (nadas/mera),
// 5 sera tüneli, 6 çeltik (su). Tür + rüzgâr payı (0..0.49) A.w'de.
// vurgu (D.w): 1.x göbek (yarıçap payı), 2.x benek (yoğunluk), 3.x balya/tınaz (var olma olasılığı)
const T = { ROW: 0, DOT: 1, FUR: 2, SWA: 3, FLAT: 4, GLASS: 5, PADDY: 6 };
export const CROP = {};
const LIST = [
	// ad, tür, rüzgâr, zemin (A), öge (B), aralık, doluluk/yarıçap, sıra boyu aralık, kabartma, gölge, vurgu rengi, vurgu
	// vurgu türü 4: traktör izi (sıralarda her 7 sırada bir çift tekerlek izi)
	['bugday', T.ROW, 0.45, '#a8873f', '#d0ad5c', 0.032, 0.7, 0, 0.5, 0, '#8f7442', 4.5],
	['hasat', T.SWA, 0, '#d8c891', '#c1ad74', 0.08, 0.34, 0.095, 1.1, 1.3, '#c4913a', 3.42],
	['yesil', T.ROW, 0.4, '#5c6838', '#7fa448', 0.03, 0.72, 0, 0.5, 0, '#5d6a3a', 4.5],
	['saban', T.FUR, 0, '#4a3122', '#7a5233', 0.028, 0.5, 0, 0.9, 0, '#000000', 0],
	['nadas', T.FLAT, 0, '#bfae84', '#ab9b70', 0.05, 0.16, 0.18, 0.4, 0.8, '#8a9658', 0],
	['aycicegi', T.DOT, 0, '#43652a', '#ecb820', 0.04, 0.8, 0.04, 0.5, 0.35, '#4a3018', 1.36],
	['pamuk', T.DOT, 0, '#6b5639', '#668e42', 0.045, 0.86, 0.034, 0.5, 0.4, '#f6f4ec', 2.5],
	['pancar', T.ROW, 0, '#5c4532', '#4b9241', 0.042, 0.72, 0, 0.8, 0, '#000000', 0],
	['misir', T.ROW, 0.25, '#54412e', '#5f983a', 0.05, 0.78, 0, 1.1, 0, '#000000', 0],
	['zeytin', T.DOT, 0, '#cfc29c', '#728b58', 0.09, 0.64, 0.09, 1.1, 0.95, '#000000', 0],
	['findik', T.DOT, 0, '#55703a', '#3b7832', 0.065, 0.96, 0.06, 1.0, 0.6, '#000000', 0],
	['narenciye', T.DOT, 0, '#857252', '#2e682f', 0.075, 0.86, 0.068, 1.1, 0.7, '#f0961e', 2.3],
	['fistik', T.DOT, 0, '#8c6a52', '#7f9456', 0.1, 0.44, 0.1, 0.9, 0.95, '#000000', 0],
	['kayisi', T.DOT, 0, '#a39a66', '#5f963c', 0.08, 0.74, 0.075, 1.1, 0.8, '#e6603c', 2.22],
	['bag', T.DOT, 0, '#c4a57f', '#5c8a36', 0.055, 0.62, 0.03, 0.6, 0.5, '#000000', 0],
	['cay', T.ROW, 0, '#2c4b25', '#62ad3e', 0.06, 0.7, 0, 1.0, 0, '#000000', 0],
	['sera', T.GLASS, 0, '#8e989a', '#e6ecee', 0.07, 0.86, 0, 0.9, 0, '#000000', 0],
	['celtik', T.PADDY, 0.3, '#3f6f6a', '#86b84a', 0.026, 0.38, 0, 0.3, 0, '#000000', 0],
	['lavanta', T.ROW, 0.15, '#878b6c', '#8a6cc4', 0.04, 0.6, 0, 0.7, 0, '#b494e6', 2.4],
	['gul', T.DOT, 0, '#5a773c', '#4f7836', 0.045, 0.8, 0.038, 0.6, 0.4, '#e2638f', 2.55],
	['hashas', T.DOT, 0.2, '#7d9656', '#8fa862', 0.026, 0.6, 0.026, 0.2, 0, '#efe6f4', 2.45],
	['mera', T.FLAT, 0, '#84a156', '#98b165', 0.07, 0.12, 0.12, 0.5, 0.8, '#a9a49b', 0],
	['cayir', T.SWA, 0.2, '#9fb962', '#88a655', 0.075, 0.5, 0.11, 1.2, 1.7, '#c9b45e', 3.38],
	['biber', T.DOT, 0, '#5e4532', '#407d35', 0.044, 0.78, 0.036, 0.6, 0.4, '#d23c28', 2.4],
];
LIST.forEach((c, i) => (CROP[c[0]] = i));
export const NC = LIST.length;

const lin = (hex) => {
	const c = new THREE.Color(hex); // three: sRGB onaltılık → doğrusal (renk yönetimi açık)
	return [c.r, c.g, c.b];
};

/** Reçete uniform dizileri (uCA, uCB, uCC, uCD). */
export function cropUniforms() {
	const A = [];
	const B = [];
	const Cc = [];
	const D = [];
	for (const [, ty, wind, a, b, sp, fill, spA, bump, shl, d, dw] of LIST) {
		A.push(new THREE.Vector4(...lin(a), ty + wind));
		B.push(new THREE.Vector4(...lin(b), sp));
		Cc.push(new THREE.Vector4(fill, spA, bump, shl));
		D.push(new THREE.Vector4(...lin(d), dw));
	}
	return { uCA: { value: A }, uCB: { value: B }, uCC: { value: Cc }, uCD: { value: D } };
}

// ------------------------------------------------------------------ il profilleri

// düz ova ekinleri [ad, ağırlık]×4, yamaç ekini, yamaç payı, yamaç üst sınırı (m), pivot, kızıl toprak,
// çit/kavak, kanal, köy, ova üst sınırı (m)
const C = CROP;
const REG = {
	marmara: { f: [['bugday', 0.3], ['aycicegi', 0.25], ['hasat', 0.2], ['saban', 0.25]], s: 'zeytin', sa: 0.15, se: 700, hedge: 0.6, canal: 0.1, vil: 0.4 },
	ege: { f: [['pamuk', 0.3], ['zeytin', 0.3], ['bag', 0.2], ['saban', 0.2]], s: 'zeytin', sa: 0.55, se: 900, hedge: 0.45, canal: 0.3, vil: 0.4 },
	akdeniz: { f: [['narenciye', 0.3], ['sera', 0.25], ['pamuk', 0.25], ['pancar', 0.2]], s: 'zeytin', sa: 0.3, se: 800, hedge: 0.4, canal: 0.35, vil: 0.35 },
	icanadolu: { f: [['bugday', 0.3], ['hasat', 0.32], ['saban', 0.23], ['nadas', 0.15]], s: 'mera', sa: 0.2, se: 1900, pivot: 0.1, hedge: 0.35, canal: 0.05, vil: 0.4 },
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
	42: { f: [['bugday', 0.28], ['hasat', 0.3], ['saban', 0.2], ['pancar', 0.22]], pivot: 0.38 }, // Konya
	70: { f: [['bugday', 0.3], ['hasat', 0.25], ['kayisi', 0.25], ['saban', 0.2]], pivot: 0.25 }, // Karaman
	68: { f: [['bugday', 0.35], ['hasat', 0.25], ['pancar', 0.2], ['saban', 0.2]], pivot: 0.3 }, // Aksaray
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
	63: { f: [['pamuk', 0.4], ['bugday', 0.3], ['hasat', 0.2], ['fistik', 0.1]], pivot: 0.15, canal: 0.5, red: 0.7 }, // Şanlıurfa (Harran)
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
 * İl başına profil dokusu (N × 4, RGBA8). 0: maske satırı (ova üst sınırı / yüz m, yamaç payı, yamaç üst sınırı / yüz m,
 * yamaç ekini): her kara pikseli yalnız bunu okur. 1: ova ekin kimlikleri, 2: birikimli ağırlıklar, 3: pivot, kızıl
 * toprak, kavak, kanal (bu üçü yalnız tarla ayrıntısı çizilirken okunur). Açılışta bir kez kurulur (324 piksel).
 */
export function cropTexture(provinces) {
	const N = provinces.length;
	const d = new Uint8Array(N * 4 * 4);
	const put = (i, row, v) => d.set(v.map((x) => Math.max(0, Math.min(255, Math.round(x)))), (row * N + i) * 4);
	provinces.forEach((p, i) => {
		const P = profileOf(p);
		const f = P.f;
		const tot = f.reduce((a, x) => a + x[1], 0) || 1;
		let acc = 0;
		const W = f.map((x) => (acc += x[1] / tot));
		W[3] = 1;
		put(i, 0, [(P.top ?? 1600) / 100, (P.sa ?? 0) * 255, (P.se ?? 900) / 100, C[P.s] ?? 0]);
		put(i, 1, [C[f[0][0]], C[f[1][0]], C[f[2][0]], C[f[3][0]]]);
		put(i, 2, [W[0] * 255, W[1] * 255, W[2] * 255, 255]);
		put(i, 3, [(P.pivot ?? 0) * 255, (P.red ?? 0) * 255, (P.hedge ?? 0.3) * 255, (P.canal ?? 0) * 255]);
	});
	const tex = new THREE.DataTexture(d, N, 4, THREE.RGBAFormat, THREE.UnsignedByteType);
	tex.magFilter = tex.minFilter = THREE.NearestFilter;
	tex.generateMipmaps = false;
	tex.colorSpace = THREE.NoColorSpace;
	tex.needsUpdate = true;
	return tex;
}

// ------------------------------------------------------------------ GLSL

export const TARLA = /* glsl */ `
#define NCROP ${NC}
uniform sampler2D uCrop;      // il başına ekin profili (il × 4, RGBA8)
uniform sampler2D uVil;       // köy ızgarası (hayat.js yerleştirir): r var, g/b merkez kayması, a boyut (1,75 birimlik hücre)
uniform vec4 uCA[NCROP];      // zemin rengi (doğrusal), desen türü + rüzgâr payı
uniform vec4 uCB[NCROP];      // öge rengi, sıra aralığı (birim)
uniform vec4 uCC[NCROP];      // doluluk / yarıçap payı, sıra boyu aralık, kabartma, gölge boyu
uniform vec4 uCD[NCROP];      // vurgu rengi, vurgu türü + payı
vec2 gDn = vec2(0.0);         // mikro kabartma: ışık normaline eklenen dünya xz eğimi
float gMsh = 1.0;             // mikro gölge (taç, balya, kavak): güneş ışığı payı
float gGl = 0.0;              // ek cila (sera naylonu, çeltik suyu, kanal)
float gCropK = 0.0;           // bu pikselde ekin deseni payı (ince tane gürültüsü azalır)
vec4 gPm;                     // il profili maske satırı: ova üst sınırı, yamaç payı, yamaç üst sınırı, yamaç ekini

uvec3 pcg3(uvec3 v) {
	v = v * 1664525u + 1013904223u;
	v.x += v.y * v.z;
	v.y += v.z * v.x;
	v.z += v.x * v.y;
	v ^= v >> 16u;
	v.x += v.y * v.z;
	v.y += v.z * v.x;
	v.z += v.x * v.y;
	return v;
}
// tam sayı karması (c tam sayı değerli, pozitif): CPU'daki ikizi tarla.js hsh3(): süs nesneleri aynı tarlaya oturur
vec3 hs3(vec2 c, uint k) {
	return vec3(pcg3(uvec3(uvec2(c), k)) >> 8u) * (1.0 / 16777216.0);
}
float hs(vec2 c, uint k) {
	return float(pcg3(uvec3(uvec2(c), k)).x >> 8u) * (1.0 / 16777216.0);
}
vec2 hs2(vec2 c, uint k) {
	return vec2(pcg3(uvec3(uvec2(c), k)).xy >> 8u) * (1.0 / 16777216.0);
}
float aaBand(float d, float w, float aa) {
	return 1.0 - smoothstep(w - aa, w + aa, d);
}
float cropWind(int k) {
	return fract(uCA[k].w) * 2.0;
}

/**
 * Ekin deseni. p: yerel çerçeve (x sıra boyunca, y sıralar arası; dünya birimi), upx: piksel başına birim, sl: güneşe
 * doğru yerel yön (birim yükseklik başına gölge kayması), red: kızıl toprak, nz: yavaş gürültü. Desen pikselden
 * küçülünce ortalama rengine karışır; tamamen karıştıysa hiç hesaplanmaz (uzak görünüm yalnız ortalamayı öder).
 * dnL yerel eğim (kabartma), msh güneş payı (taç ve balya gölgesi).
 */
vec3 cropCol(int k, vec2 p, float upx, vec2 sl, float red, float nz, out vec2 dnL, out float msh) {
	vec4 A = uCA[k];
	vec4 B = uCB[k];
	vec4 P = uCC[k];
	int ty = int(A.w);
	vec3 ca = mix(A.rgb, A.rgb * vec3(0.98, 0.8, 0.74), red);
	vec3 cb = B.rgb;
	float sp = B.w;
	float pw = upx / sp;
	dnL = vec2(0.0);
	msh = 1.0;
	if (ty == 1) {
		// sıra sıra taç / çiçek (zeytin, fındık, ayçiçeği, pamuk, bağ…): hafif kaymalı, ara ara eksik
		float spA = P.y;
		float cs = min(spA, sp);
		float vis = 1.0 - smoothstep(0.13, 0.3, upx / cs);
		float cov = 0.785 * P.x * P.x * cs * cs / (spA * sp);
		vec4 D = uCD[k];
		float am = floor(D.w);
		float aw = fract(D.w);
		vec3 mean = mix(ca, cb * 0.92, cov);
		if (am > 0.5) mean = mix(mean, D.rgb, cov * (am < 1.5 ? aw * aw : aw * 0.1));
		float msm = 1.0 - min(cov, 0.6) * 0.21 * min(P.w, 1.0);
		if (vis < 0.004) {
			msh = msm;
			return mean;
		}
		float aa = upx * 1.1;
		vec2 g = vec2(p.x / spA, p.y / sp);
		vec2 ce = floor(g);
#if TIER > 0
		vec2 j = hs2(ce + 8192.0, uint(k) + 40u);
#else
		vec2 j = fract(vec2(ce.x * 0.6180339 + ce.y * 0.4142136, ce.x * 0.7548777 + ce.y * 0.5698403)); // q0: karmasız
#endif
		vec2 f = (g - ce - 0.5 - (j - 0.5) * 0.2) * vec2(spA, sp);
		float rad = P.x * 0.5 * cs * (0.86 + 0.28 * j.y);
		float here = step(0.05, j.x);
		float d = length(f);
		float m = (1.0 - smoothstep(rad - aa, rad + aa, d)) * here;
		float rr = clamp(1.0 - d / max(rad, 1e-4), 0.0, 1.0);
		vec3 col = mix(ca, cb * (0.8 + 0.3 * rr + 0.12 * (j.x - 0.5)), m);
#if TIER > 0
		// gölge: güneşin karşısına düşen taç gölgesi; taç kubbe gibi ışık alır (q0: yok)
		float sd = length(f + sl * rad * P.w);
		float shd = (1.0 - smoothstep(rad * 0.72 - aa, rad * 1.04 + aa, sd)) * here * (1.0 - m);
		msh = mix(msm, 1.0 - shd * 0.6, vis);
		dnL = f / max(rad, 1e-4) * P.z * m * vis;
		if (am > 0.5) {
			if (am < 1.5) {
				// göbek (ayçiçeği)
				col = mix(col, D.rgb, (1.0 - smoothstep(rad * aw - aa, rad * aw + aa, d)) * m);
			} else {
				// taçta benek: meyve, pamuk kozası, gül, haşhaş çiçeği
				vec2 g2 = f / max(rad * 0.62, 1e-4);
				vec2 c2 = floor(g2);
				vec2 j2 = hs2(c2 + ce * 5.0 + 16384.0, 77u);
				float d2 = length((g2 - c2 - 0.5 - (j2 - 0.5) * 0.5) * rad * 0.62);
				col = mix(col, D.rgb, (1.0 - smoothstep(rad * 0.17 - aa, rad * 0.17 + aa, d2)) * step(j2.x, aw) * m);
			}
		}
#else
		msh = msm;
#endif
		return mix(mean, col, vis);
	}
	if (ty == 3) {
		// biçilmiş tarla: dönüşümlü biçer izi (açık / koyu), ince anız, sıra sıra balya ya da tınaz
		float vis = 1.0 - smoothstep(0.12, 0.3, pw);
		vec3 mean = mix(ca, cb, 0.5);
		if (vis < 0.004) return mean;
		float t = p.y / sp;
		float si = floor(t);
		float u = t - si;
		float side = mix(0.5, mod(si, 2.0), smoothstep(0.0, pw * 1.5 + 1e-4, min(u, 1.0 - u)));
		vec3 col = mix(ca, cb, mix(0.5, side, vis));
		col *= 1.0 - 0.07 * (1.0 - abs(fract(t * 5.0) - 0.5) * 2.0) * (1.0 - smoothstep(0.1, 0.25, pw * 5.0));
		float rad = P.x * sp * 0.5;
#if TIER > 0
		float bv = 1.0 - smoothstep(0.14, 0.34, upx / (rad * 2.0));
#else
		float bv = 0.0; // q0: balya yok
#endif
		if (bv > 0.004) {
			vec4 D = uCD[k];
			float spA = P.y;
			float bx = p.x / spA;
			float bc = floor(bx);
			vec2 j = hs2(vec2(bc, si) + 8192.0, uint(k) + 60u);
			float here = step(j.x, fract(D.w));
			vec2 f = vec2((bx - bc - 0.5 - (j.y - 0.5) * 0.4) * spA, (u - 0.5) * sp);
			float aa = upx * 1.1;
			float d = length(f * vec2(0.85, 1.0));
			float m = (1.0 - smoothstep(rad - aa, rad + aa, d)) * here;
			col = mix(col, D.rgb * (0.78 + 0.34 * clamp(1.0 - d / max(rad, 1e-4), 0.0, 1.0)), m * bv);
#if TIER > 0
			float sd = length((f + sl * rad * P.w) * vec2(0.85, 1.0));
			msh = 1.0 - (1.0 - smoothstep(rad * 0.7 - aa, rad * 1.05 + aa, sd)) * here * (1.0 - m) * 0.62 * bv;
			dnL = f / max(rad, 1e-4) * P.z * m * bv;
#endif
		}
		return col;
	}
	if (ty == 4) {
		// nadas / mera: lekeli zemin, seyrek taş ve ot öbeği
		vec3 col = mix(ca, cb, smoothstep(0.3, 0.7, nz));
#if TIER > 0
		float vis = 1.0 - smoothstep(0.12, 0.3, upx / (P.x * sp * 2.0));
#else
		float vis = 0.0; // q0: taş ve ot öbeği yok
#endif
		if (vis < 0.004) return col;
		vec4 D = uCD[k];
		vec2 g = p / sp;
		vec2 ce = floor(g);
		vec2 j = hs2(ce + 8192.0, uint(k) + 80u);
		vec2 f = (g - ce - 0.5 - (j - 0.5) * 0.6) * sp;
		float rad = P.x * sp * (0.6 + 0.8 * j.y);
		float aa = upx * 1.1;
		float d = length(f);
		float here = step(j.x, P.y) * vis;
		float m = (1.0 - smoothstep(rad - aa, rad + aa, d)) * here;
		col = mix(col, D.rgb * (0.85 + 0.3 * clamp(1.0 - d / max(rad, 1e-4), 0.0, 1.0)), m);
#if TIER > 0
		float sd = length(f + sl * rad * P.w);
		msh = 1.0 - (1.0 - smoothstep(rad * 0.6 - aa, rad + aa, sd)) * here * (1.0 - m) * 0.5;
		dnL = f / max(rad, 1e-4) * P.z * m;
#endif
		return col;
	}
	// sıralar: ekin (0), saban izi (2), sera tüneli (5), çeltik (6)
	float fill = P.x;
	float mean = ty == 2 ? 0.5 : fill;
	float vis = 1.0 - smoothstep(0.16, 0.34, pw);
	if (vis < 0.004) {
		if (ty == 5) gGl += 0.6 * mean;
		if (ty == 6) gGl += 0.55 * (1.0 - mean);
		return mix(ca, cb, mean);
	}
	float t = p.y / sp;
	float u = fract(t) - 0.5;
	float r = abs(u) * 2.0;
	float m;
	float s;
	if (ty == 2) {
		m = 0.5 + 0.5 * cos(u * 6.2832);
		s = sin(u * 6.2832);
	} else {
		m = 1.0 - smoothstep(fill - pw * 1.4, fill + pw * 1.4, r);
		s = r < fill ? sin(clamp(u / (fill * 0.5), -1.0, 1.0) * 1.5708) : 0.0;
	}
	float mm = mix(mean, m, vis);
	vec3 col = mix(ca, cb, mm);
	if (ty == 2) col *= 0.94 + 0.12 * nz; // saban: kesek lekeleri
	if (ty == 5) gGl += 0.6 * mm;
	if (ty == 6) gGl += 0.55 * (1.0 - mm);
#if TIER > 0
	dnL = vec2(0.0, s * P.z * vis);
	vec4 D = uCD[k];
	float am = floor(D.w);
	if (am > 3.5) {
		// traktör izi: her 7 sırada bir çift tekerlek izi (ekin tarlasının kuşbakışı imzası)
		float tl = abs(fract(t / 7.0) - 0.5) * 7.0 * sp;
		col = mix(col, D.rgb, aaBand(abs(tl - sp * 0.3), sp * 0.09, upx) * vis * 0.8);
	} else if (am > 0.5) {
		// sırada benek: lavanta başağı, çiçek
		vec2 g2 = vec2(p.x / (sp * 0.8), t);
		vec2 c2 = floor(g2);
		vec2 j2 = hs2(c2 + 8192.0, uint(k) + 90u);
		vec2 f2 = (g2 - c2 - 0.5 - (j2 - 0.5) * 0.5) * vec2(sp * 0.8, sp);
		float rb = sp * fill * 0.32;
		col = mix(col, D.rgb, (1.0 - smoothstep(rb - upx, rb + upx, length(f2))) * step(j2.x, fract(D.w)) * m * vis);
	}
#endif
	return col;
}

/**
 * Tarlalar: bölge ızgarası, parseller, şeritler, ekin, pivot daireleri, yollar, kavaklar, kanallar, köyler.
 * c: arazi rengi, farm: düz ova maskesi, rmask: yol ve köy maskesi (tarladan geniş), mS: yamaç tarımı maskesi,
 * upx: pikselin dünya izi. Uzak görünümde hemen döner; oyun uzaklığında yalnız parsel renkleri ve yollar.
 */
vec3 tarla(vec3 c, vec2 q, vec4 f1, vec4 f3, float upx, float farm, float rmask, float mS, vec3 N, float h, float hpx, float pid) {
#if TIER > 0
	float vis0 = 1.0 - smoothstep(0.022, 0.04, upx); // uzak görünüm (~40+): tarla hesabı yok, eski yumuşak yamalar
#else
	float vis0 = 1.0 - smoothstep(0.0085, 0.012, upx); // q0: yalnız yakın çekimde (oyun uzaklığında eski ucuz yamalar)
#endif
	float kAll = max(max(farm, mS), rmask) * vis0;
#if defined(TARLA_OLC) && TARLA_OLC == 0
	return c; // ölçüm (?tarla=0): ayrıntı dalı derlenmez; GPU'nun uzak görünümde dalı atladığı durumun eşi
#endif
	if (kAll < 0.003) return c;
	// il profilinin kalanı (yalnız burada okunur)
	ivec2 pb = ivec2(int(pid + 0.5), 1);
	vec4 P1 = texelFetch(uCrop, pb, 0);
	vec4 P2 = texelFetch(uCrop, pb + ivec2(0, 1), 0);
	vec4 P3 = texelFetch(uCrop, pb + ivec2(0, 2), 0);
	float red = P3.g;
	float nz = f3.b;
	vec2 sunW = uSunDir.xz / max(uSunDir.y, 0.25);
	// --- bölge ızgarası (~6,25 birim), hafif kıvrık: sınırları yol, kanal ya da çit
	vec2 zq = q * 0.16 + vec2(f1.a - 0.5, f1.r - 0.5) * vec2(0.22, 0.12);
	vec2 zi = floor(zq);
	vec2 zf = zq - zi;
	vec2 zc = zi + 4096.0;
	vec3 Hz = hs3(zc, 1u);
	float ang = (Hz.x - 0.5) * 0.5 + step(0.5, Hz.y) * 1.5708;
	vec2 ex = vec2(cos(ang), sin(ang));
	vec2 ey = vec2(-ex.y, ex.x);
	vec2 o = (zi + 0.5) / 0.16;
	vec2 rq = vec2(dot(q - o, ex), dot(q - o, ey));
	// --- parsel: sıra sıra, her sırada farklı genişlik ve kayma (T kavşaklar)
	float rh = mix(0.48, 0.9, Hz.z);
	float ry = rq.y / rh;
	float ri = floor(ry);
	float rv = ry - ri;
	uint kr = uint(int(ri) + 64) << 4u;
	vec3 Hr = hs3(zc, kr + 5u);
	float cw = mix(0.3, 0.9, Hr.x);
	float co = Hr.y * cw;
	float cx = (rq.x + co) / cw;
	float ci = floor(cx);
	float cu = cx - ci;
	uint kp = kr + (uint(int(ci) + 64) << 11u);
	vec3 Hp = hs3(zc, kp + 7u);
	float hp = Hp.x;
	float hp2 = Hp.y;
	// şeritler: miras bölünmesi, uzun ince tarlalar (çoğu tek parça)
	float ns = 1.0 + floor(hp2 * hp2 * 3.2);
	float sx = cu * ns;
	float sidx = floor(sx);
	float su = sx - sidx;
	float hsS = fract(Hp.z + sidx * 0.618034); // şeridin ekin karması (parsel karmasından; ek karma yok)
	// ekin: ovada ilin ağırlıklı seçimi; yamaçta ilin yamaç ekini (parsellerin bir kısmı doğal yamaç), çay eş yükselti
	// eğrisinde (teras) dizilir
	bool slope = mS > farm;
	vec4 ids = floor(P1 * 255.0 + 0.5);
	int k = slope ? int(gPm.a * 255.0 + 0.5) : int(hsS < P2.x ? ids.x : hsS < P2.y ? ids.y : hsS < P2.z ? ids.z : ids.w);
	bool contour = slope && k == ${C.cay};
	float fm = slope ? mS * (contour ? 1.0 : step(hp, 0.78)) : farm;
	float sw = cw / ns;
	// sıra yönü: şeridin uzun kenarı boyunca (ara sıra dik)
	bool alongY = (sw < rh) != (fract(hsS * 7.31) < 0.15);
	vec2 eA = alongY ? ey : ex;
	vec2 eC = alongY ? ex : ey;
	vec2 pl = alongY ? vec2(rq.y, rq.x) : rq;
	vec2 sl = vec2(dot(sunW, eA), dot(sunW, eC));
	vec2 dnL;
	float msh;
	vec3 col;
	vec2 dn;
	float wind;
	if (contour) {
		// eş yükselti terasları: sıralar yükseltiyle, aralık yamaç dikleştikçe daralır
		vec2 gd = N.xz / max(length(N.xz), 1e-4);
		vec2 tg = vec2(-gd.y, gd.x);
		float spc = uCB[k].w;
		float F = 1.0 / (spc * 0.75);
		vec2 pc = vec2(dot(q, tg), (h * F + nz * 0.35) * spc);
		col = cropCol(k, pc, max(upx, hpx * F * spc), vec2(dot(sunW, tg), dot(sunW, gd)), red, nz, dnL, msh);
		dn = tg * dnL.x + gd * dnL.y;
		wind = 0.0;
	} else if (!slope && hp < P3.r && min(cw, rh) > 0.42 && ns < 1.5) {
		// --- pivot sulama dairesi (Konya ovası, Harran): halka halka ekin, dönen kol, ıslak iz, tekerlek izleri
		vec2 dv = rq - vec2((ci + 0.5) * cw - co, (ri + 0.5) * rh);
		float r = length(dv);
		float R = 0.46 * min(cw, rh);
		float inR = 1.0 - smoothstep(R - upx, R + upx, r);
		// çoğu tek ekin (mısır, pancar, taze ekin, buğday); bazısı yarım yarım iki ekin
		float pc = fract(hp * 17.3);
		int kp0 = pc < 0.35 ? ${C.misir} : pc < 0.6 ? ${C.pancar} : pc < 0.82 ? ${C.yesil} : ${C.bugday};
		int kk = (dot(dv, vec2(cos(hp * 40.0), sin(hp * 40.0))) > 0.0 || fract(hp * 5.7) < 0.7) ? kp0 : k;
		float th = atan(dv.y, dv.x);
		vec2 rd = (ex * dv.x + ey * dv.y) / max(r, 1e-4);
		vec2 td = vec2(-rd.y, rd.x);
		col = cropCol(kk, vec2(th * r, r), upx, vec2(dot(sunW, td), dot(sunW, rd)), red, nz, dnL, msh);
		dn = td * dnL.x + rd * dnL.y;
		wind = cropWind(kk);
		if (upx < 0.014) {
			// kol: ~2 dakikada bir tur; arkasında ıslak, koyu iz; tekerlek izi halkaları; kol gölgesi
			float th0 = uTime * 0.05 + hp * 6.2832;
			col *= 1.0 - 0.2 * exp(-mod(th0 - th, 6.2832) * 2.2);
			float ring = abs(fract(r / 0.07) - 0.5) * 0.07;
			float vk = clamp(0.012 / upx, 0.0, 1.0);
			col *= 1.0 - 0.16 * aaBand(ring, 0.0028, upx) * clamp(0.006 / upx, 0.0, 1.0);
			float armD = abs(sin(th - th0)) * r + step(cos(th - th0), 0.0);
#if TIER > 0
			vec2 ds = dv + vec2(dot(sunW, ex), dot(sunW, ey)) * 0.035;
			float rs = length(ds);
			float ths = atan(ds.y, ds.x);
			float armS = abs(sin(ths - th0)) * rs + step(cos(ths - th0), 0.0);
			msh *= 1.0 - 0.55 * aaBand(armS, 0.0045, upx) * (1.0 - smoothstep(R - upx, R + upx, rs)) * vk;
#endif
			float arm = aaBand(armD, 0.004, upx) * inR * vk;
#if TIER > 0
			float tower = aaBand(length(vec2(armD, ring)), 0.0075, upx) * inR * vk;
			arm = max(arm, tower);
#endif
			col = mix(col, vec3(0.6, 0.62, 0.64), arm);
		}
		// daire dışı: kuru köşeler (nadas rengi; desen yok)
		vec3 dry = mix(uCA[${C.nadas}].rgb, uCB[${C.nadas}].rgb, smoothstep(0.3, 0.7, nz)) * mix(vec3(1.0), vec3(0.98, 0.8, 0.74), red);
		col = mix(dry, col, inR);
		msh = mix(1.0, msh, inR);
		dn *= inR;
		wind *= inR;
	} else {
		col = cropCol(k, pl, upx, sl, red, nz, dnL, msh);
		dn = eA * dnL.x + eC * dnL.y;
		wind = cropWind(k);
	}
	// yakınlık: oyun uzaklığında ekin renkleri araziye daha çok karışır (sakin yama), yakında tam canlı
	float rich = 1.0 - smoothstep(0.006, 0.02, upx);
	// parsel parlaklık farkı ve tarla içi nem lekeleri: komşu tarlalar aynı tonda olmasın, tarla düz boya olmasın
	col *= 1.0 + (hp - 0.5) * mix(0.08, 0.15, rich);
	col *= mix(vec3(1.0), (0.9 + 0.2 * f3.r) * mix(vec3(1.0), vec3(0.95, 1.02, 0.97), f3.g), rich);
#if TIER > 0
	// rüzgâr: başakların üstünden geçen yavaş parlaklık dalgası (geniş ölçekli: titreşim yok)
	if (wind > 0.01 && rich > 0.01) col *= 1.0 + wind * rich * 0.09 * sin(dot(q, vec2(0.55, 0.83)) * 3.1 - uTime * 1.25 + f3.r * 5.0) * (0.6 + 0.4 * f1.g);
#endif
	// --- tarla kenarı: ince, koyu-yeşil sınır otu; şerit araları daha ince
	float dP = min(min(cu, 1.0 - cu) * cw, min(rv, 1.0 - rv) * rh);
	float dS = min(su, 1.0 - su) * sw;
	float ev = aaBand(dP, 0.0055, upx) * clamp(0.011 / upx, 0.0, 1.0) * (contour ? 0.0 : 1.0);
	float es = ns > 1.5 && !slope ? aaBand(dS, 0.0032, upx) * clamp(0.0064 / upx, 0.0, 1.0) : 0.0;
	col = mix(col, col * vec3(0.66, 0.74, 0.56), max(ev * 0.85, es * 0.55));
	// tarla rengi araziye
	vec3 res = mix(c, col, fm * vis0 * mix(0.62, 0.94, rich));
	float fk = fm * vis0;
	float ok = kAll;
	// --- bölge sınırı: köy yolu (yanında kavak), kanal ya da çit
	vec2 zd = min(zf, 1.0 - zf);
	bool bx = zd.x < zd.y;
	float dZ = min(zd.x, zd.y) / 0.16;
	if (dZ < 0.12) {
		vec2 eid = (bx ? vec2(zi.x + step(0.5, zf.x), zi.y) : vec2(zi.x, zi.y + step(0.5, zf.y))) + 4096.0;
		float he = hs(eid, bx ? 31u : 32u);
		vec2 nrm = bx ? vec2(zf.x < 0.5 ? 1.0 : -1.0, 0.0) : vec2(0.0, zf.y < 0.5 ? 1.0 : -1.0); // sınırdan bölgenin içine
		if (he >= P3.a * 0.6) {
			// toprak yol: ortası tümsek, kenarları koyu, iki tekerlek izi
			float wr = 0.026;
			float rk = aaBand(dZ, wr, upx) * ok;
			vec3 dust = mix(vec3(0.5, 0.4, 0.27), vec3(0.6, 0.49, 0.34), nz) * mix(vec3(1.0), vec3(1.12, 0.84, 0.72), red);
			float rut = aaBand(abs(dZ - wr * 0.42), 0.0026, upx) * clamp(0.005 / upx, 0.0, 1.0);
			dust *= 1.0 - 0.18 * rut;
			dust *= 1.0 - 0.2 * (1.0 - aaBand(dZ, wr * 0.75, upx));
			res = mix(res, dust, rk);
			dn = mix(dn, nrm * 0.35 * (dZ / wr), rk);
			msh = mix(msh, 1.0, rk);
#if TIER > 0
			// kavak dizisi (yolun iki yanında): ince uzun ağaç, uzun gölge (q0: yok)
			float rad0 = 0.0135;
			if (fract(he * 13.7) < P3.b && upx < rad0 * 0.65) {
				float sp = 0.046;
				float along = bx ? q.y : q.x;
				vec2 eAl = bx ? vec2(0.0, 1.0) : vec2(1.0, 0.0);
				float a = along / sp;
				float ac = floor(a);
				float hh = hs(vec2(ac + 8192.0, eid.x * 7.0 + eid.y), bx ? 33u : 34u);
				vec2 f = vec2((a - ac - 0.5) * sp, dZ - wr - 0.022);
				float rad = rad0 * (0.85 + 0.3 * hh) * step(0.18, hh);
				vec2 sw2 = vec2(dot(sunW, eAl), dot(sunW, nrm));
				float d = length(f);
				float pv = (1.0 - smoothstep(0.15, 0.32, upx / (rad * 2.0 + 1e-4))) * ok;
				float m = aaBand(d, rad, upx * 1.1) * pv;
				float shd = aaBand(length(f + sw2 * 0.055), rad * 1.05, upx * 1.5) * (1.0 - m) * pv;
				res = mix(res, vec3(0.06, 0.15, 0.045) * (0.8 + 0.6 * clamp(1.0 - d / max(rad, 1e-4), 0.0, 1.0)), m);
				msh *= 1.0 - 0.62 * shd;
				dn += (eAl * f.x + nrm * f.y) / max(rad, 1e-4) * m * 0.8;
			}
#endif
		} else {
			// sulama kanalı: ince su, yeşil set
			float wc = 0.008;
			float bank = aaBand(dZ, wc + 0.012, upx) * ok;
			float wk = aaBand(dZ, wc, upx) * clamp(wc * 2.0 / upx, 0.0, 1.0) * ok;
			res = mix(res, res * vec3(0.7, 0.92, 0.6), bank * 0.7);
			res = mix(res, vec3(0.06, 0.22, 0.3), wk);
			gGl += 0.75 * wk;
			msh = mix(msh, 1.0, wk);
		}
	}
	// --- köy: çiğnenmiş toprak, bostanlar, harman yeri. Evleri hayat.js kurar; ikisi de aynı köy ızgarasını okur
	// (CPU geçerli yeri seçer: düz, yapı avlusu ve il merkezi dışında, nehirde değil). Evlerle birlikte söner.
	if (upx < 0.018) {
		vec2 vi = clamp(floor((q + vec2(50.0, 25.0)) / 1.75), vec2(0.0), vec2(57.0, 28.0));
		vec4 vt = texelFetch(uVil, ivec2(vi), 0);
		if (vt.r > 0.5) {
			vec2 vcen = (vi + 0.5 + (vt.gb - 0.5) * 0.4) * 1.75 - vec2(50.0, 25.0);
			vec2 vd = (q - vcen) / (mix(0.75, 1.0, vt.a) * 1.25);
			float dC = length(vd);
			if (dC < 0.42) {
				float vk = (1.0 - smoothstep(0.22, 0.4, dC)) * ok * (1.0 - smoothstep(0.011, 0.018, upx));
				vec3 earth = mix(vec3(0.42, 0.34, 0.24), vec3(0.5, 0.41, 0.29), nz) * mix(vec3(1.0), vec3(1.1, 0.86, 0.74), red);
				earth = mix(earth, res, 0.25);
#if TIER > 0
				// bostanlar: köyün çevresinde küçük yeşil ve kahve parseller
				vec2 bg = vd / 0.055;
				vec2 bc = floor(bg);
				float bh = hs(bc + 8192.0 + vi * 13.0, 23u);
				vec2 bf = abs(bg - bc - 0.5);
				float plot = step(max(bf.x, bf.y), 0.4) * step(0.17, dC) * step(0.35, bh);
				vec3 garden = bh > 0.7 ? vec3(0.2, 0.38, 0.12) : bh > 0.5 ? vec3(0.42, 0.3, 0.18) : vec3(0.32, 0.45, 0.16);
				earth = mix(earth, garden, plot * (1.0 - smoothstep(0.15, 0.3, upx / 0.055)));
#endif
				// harman yeri: açık renkli yuvarlak düzlük
				earth = mix(earth, vec3(0.62, 0.55, 0.4), aaBand(length(vd - vec2(0.15, -0.13)), 0.05, upx));
				res = mix(res, earth, vk);
				msh = mix(msh, 1.0, vk);
				dn *= 1.0 - vk;
			}
		}
	}
	gDn += dn * max(fk, ok * 0.5);
	gMsh *= mix(1.0, msh, max(fk, ok * 0.5));
	gCropK = max(gCropK, fk);
	return res;
}
`;

// ------------------------------------------------------------------ CPU ikizi (süs nesneleri için)

function pcg3(a, b, c) {
	let x = (Math.imul(a, 1664525) + 1013904223) >>> 0;
	let y = (Math.imul(b, 1664525) + 1013904223) >>> 0;
	let z = (Math.imul(c, 1664525) + 1013904223) >>> 0;
	x = (x + Math.imul(y, z)) >>> 0;
	y = (y + Math.imul(z, x)) >>> 0;
	z = (z + Math.imul(x, y)) >>> 0;
	x = (x ^ (x >>> 16)) >>> 0;
	y = (y ^ (y >>> 16)) >>> 0;
	z = (z ^ (z >>> 16)) >>> 0;
	x = (x + Math.imul(y, z)) >>> 0;
	y = (y + Math.imul(z, x)) >>> 0;
	z = (z + Math.imul(x, y)) >>> 0;
	return [x, y, z];
}
/** GLSL hs(c, k) ikizi (c tam sayı, pozitif). */
export function hsh(cx, cy, k) {
	return (pcg3(cx >>> 0, cy >>> 0, k >>> 0)[0] >>> 8) / 16777216;
}
/** GLSL hs3(c, k) ikizi. */
export function hsh3(cx, cy, k) {
	const h = pcg3(cx >>> 0, cy >>> 0, k >>> 0);
	return [(h[0] >>> 8) / 16777216, (h[1] >>> 8) / 16777216, (h[2] >>> 8) / 16777216];
}

/** Gürültü dokusundan çift doğrusal örnek (GPU ile aynı: tekrarlı, doku piksel merkezli). */
export function noiseAt(data, u, v, ch) {
	const N = 256;
	let x = u * N - 0.5;
	let y = v * N - 0.5;
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
 * Bir dünya noktasının tarla bilgisi (shader'daki tarla() ile aynı hesap): bölge, parsel, şerit, ekin seçim
 * karması, sıra yönü (dünya), parsel merkezi ve boyları. profile: il profili (profileOf), noise: gürültü verisi.
 */
export function fieldAt(x, z, profile, noise) {
	const a = noiseAt(noise, x / 48, z / 48, 3);
	const r = noiseAt(noise, x / 48, z / 48, 0);
	const zqx = x * 0.16 + (a - 0.5) * 0.22;
	const zqy = z * 0.16 + (r - 0.5) * 0.12;
	const zix = Math.floor(zqx);
	const ziy = Math.floor(zqy);
	const zcx = zix + 4096;
	const zcy = ziy + 4096;
	const Hz = hsh3(zcx, zcy, 1);
	const ang = (Hz[0] - 0.5) * 0.5 + (Hz[1] >= 0.5 ? 1.5708 : 0);
	const ex = [Math.cos(ang), Math.sin(ang)];
	const ey = [-ex[1], ex[0]];
	const ox = (zix + 0.5) / 0.16;
	const oz = (ziy + 0.5) / 0.16;
	const rqx = (x - ox) * ex[0] + (z - oz) * ex[1];
	const rqy = (x - ox) * ey[0] + (z - oz) * ey[1];
	const rh = 0.48 + (0.9 - 0.48) * Hz[2];
	const ri = Math.floor(rqy / rh);
	const rv = rqy / rh - ri;
	const kr = ((ri + 64) << 4) >>> 0;
	const Hr = hsh3(zcx, zcy, kr + 5);
	const cw = 0.3 + 0.6 * Hr[0];
	const co = Hr[1] * cw;
	const cxx = (rqx + co) / cw;
	const ci = Math.floor(cxx);
	const cu = cxx - ci;
	const kp = (kr + ((ci + 64) << 11)) >>> 0;
	const Hp = hsh3(zcx, zcy, kp + 7);
	const hp = Hp[0];
	const hp2 = Hp[1];
	const ns = 1 + Math.floor(hp2 * hp2 * 3.2);
	const sidx = Math.floor(cu * ns);
	const su = cu * ns - sidx;
	const hsS = Math.fround(Math.fround(Hp[2] + Math.fround(sidx * 0.618034)) % 1);
	// ekin seçimi (cropPick ikizi: 8 bit ağırlıklar)
	const f = profile.f;
	const tot = f.reduce((s, v) => s + v[1], 0) || 1;
	let acc = 0;
	const W = f.map((v) => Math.round(((acc += v[1] / tot)) * 255) / 255);
	W[3] = 1;
	const name = hsS < W[0] ? f[0][0] : hsS < W[1] ? f[1][0] : hsS < W[2] ? f[2][0] : f[3][0];
	const sw = cw / ns;
	const fl = hsS * 7.31;
	const alongY = sw < rh !== fl - Math.floor(fl) < 0.15;
	const piv = hp < Math.round((profile.pivot ?? 0) * 255) / 255 && Math.min(cw, rh) >= 0.42 && ns < 1.5;
	// parsel ve şerit merkezi (dünya)
	const toW = (u, v) => [ox + ex[0] * u + ey[0] * v, oz + ex[1] * u + ey[1] * v];
	const pcx = (ci + 0.5) * cw - co;
	const pcy = (ri + 0.5) * rh;
	const scx = (ci + (sidx + 0.5) / ns) * cw - co;
	return {
		zone: [zix, ziy],
		ang,
		ex,
		ey,
		crop: name,
		cropId: CROP[name],
		piv,
		ns,
		cw,
		rh,
		sw,
		// sıra yönü (dünya xz birim vektör) ve şerit merkezi
		dir: alongY ? ey : ex,
		across: alongY ? ex : ey,
		len: alongY ? rh : sw, // sıra boyunca şerit boyu
		wid: alongY ? sw : rh, // sıralar arası şerit eni
		parcel: toW(pcx, pcy),
		strip: toW(scx, pcy),
		// kenara uzaklık (birim): parsel ve şerit
		edge: Math.min(Math.min(cu, 1 - cu) * cw, Math.min(rv, 1 - rv) * rh, Math.min(su, 1 - su) * sw),
		zoneEdge: Math.min(zqx - zix, 1 - (zqx - zix), zqy - ziy, 1 - (zqy - ziy)) / 0.16,
		hp,
	};
}

/** Köy ızgarası: 1,75 birimlik hücre, kutu (-50, -25)'ten 58 × 29 hücre; merkez kayması hücrenin ±%20'si. */
export const VIL = { cell: 1.75, x0: -50, z0: -25, nx: 58, nz: 29, jit: 0.4 };
