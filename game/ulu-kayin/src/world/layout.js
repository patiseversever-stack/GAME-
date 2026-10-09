// Ağacın ve patikanın ölçüleri. Görsel modeller ve oynanış (gölge testi, yürüme) aynı
// fonksiyonları kullanır; ekranda gördüğün gölge ile oyunun hesapladığı gölge hep aynıdır.

export const TRUNK_TOP = 53; // gövdenin ana dallara ayrıldığı yükseklik
export const PITCH = 6.5; // patikanın bir tam turda indiği yükseklik
export const PATH_TOP = 50.4;
export const PATH_BOTTOM = 0.62;
export const PATH_W = 1.9; // patika genişliği
export const PATH_T = 0.34; // tahta kalınlığı
export const PATH_GAP = 0.98; // patika ekseninin gövde yüzeyinden uzaklığı
export const THETA_END = ((PATH_TOP - PATH_BOTTOM) / PITCH) * Math.PI * 2;

/** Gövde yarıçapı (yüksekliğe göre): tabanda kök kanatlarıyla genişler, yukarı doğru incelir. */
export function trunkRadius(y) {
	const yy = Math.max(y, -2);
	return 3.05 + 0.95 * (1 - Math.min(yy, 52) / 52) + 1.9 * Math.exp(-Math.max(yy, 0) / 2.3);
}

/**
 * Köprüler: patikanın gövdeden ayrılıp bir dalın üstünden dışarı kıvrıldığı yerler.
 *   th: köprünün tepe noktasının patika açısı, out: dışarı taşma, w: yarı genişlik (radyan).
 * Köprüde gövde gölgesi yetişmez; dalın yaprakları ya da üstteki patika korur.
 */
export const BRIDGES = [
	{ th: 9.35, out: 3.4, w: 0.5, leaves: 'blossom' },
	{ th: 15.5, out: 4.6, w: 0.56, leaves: 'green' },
	{ th: 21.3, out: 6.2, w: 0.62, leaves: 'green', nest: true },
	{ th: 33.0, out: 4.8, w: 0.54, leaves: 'gold' },
	{ th: 39.4, out: 3.8, w: 0.48, leaves: 'snow' },
];

const bump = (x) => (Math.abs(x) >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * x));

/** Patika ekseninin yüksekliği (birikimli açıya göre; açı arttıkça aşağı iner). */
export function pathY(th) {
	return PATH_TOP - (th / (Math.PI * 2)) * PITCH;
}

/** Köprülerin dışarı taşma miktarı. */
export function bridgeOut(th) {
	let o = 0;
	for (const b of BRIDGES) o += b.out * bump((th - b.th) / b.w);
	return o;
}

/** Patika ekseninin gövde ekseninden uzaklığı. */
export function pathR(th) {
	return trunkRadius(pathY(th)) + PATH_GAP + bridgeOut(th);
}

/**
 * Verilen (sarılmış) azimutta patikanın geçtiği bütün yükseklikler.
 * Gövdede patikanın altına kontak gölgesi çizerken ve dal yerleştirirken kullanılır.
 */
export function pathHeightsAt(az, out) {
	out.length = 0;
	const base = ((az % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
	for (let th = base; th <= THETA_END + 0.001; th += Math.PI * 2) out.push(pathY(th));
	return out;
}

/** Bölümler: her biri patikanın bir açı aralığı ve bir mevsim. */
export const LEVELS = [
	{ id: 'bahar-1', season: 'spring', from: 0.0, to: 6.0, title: 'Çiçek Tacı', kicker: 'Bahar · I' },
	{ id: 'bahar-2', season: 'spring', from: 6.0, to: 12.0, title: 'Pembe Rüzgâr', kicker: 'Bahar · II' },
	{ id: 'yaz-1', season: 'summer', from: 12.0, to: 18.0, title: 'Zümrüt Gövde', kicker: 'Yaz · I' },
	{ id: 'yaz-2', season: 'summer', from: 18.0, to: 24.0, title: 'Kuş Yuvası', kicker: 'Yaz · II' },
	{ id: 'guz-1', season: 'autumn', from: 24.0, to: 30.0, title: 'Altın Yapraklar', kicker: 'Güz · I' },
	{ id: 'guz-2', season: 'autumn', from: 30.0, to: 36.0, title: 'Fırtına', kicker: 'Güz · II' },
	{ id: 'kis-1', season: 'winter', from: 36.0, to: 42.0, title: 'Kırağı', kicker: 'Kış · I' },
	{ id: 'kis-2', season: 'winter', from: 42.0, to: THETA_END, title: 'Kök Kapısı', kicker: 'Kış · II', finale: true },
];

/** Yüksekliğe göre mevsim karışımı: [bahar, yaz, güz, kış] ağırlıkları. */
export function seasonWeights(y, out = [0, 0, 0, 0]) {
	const s = (a, b, x) => {
		const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
		return t * t * (3 - 2 * t);
	};
	const sp = s(37, 41, y);
	const su = s(25, 29, y) * (1 - sp);
	const au = s(12.5, 16.5, y) * (1 - sp - su);
	out[0] = sp;
	out[1] = su;
	out[2] = au;
	out[3] = Math.max(0, 1 - sp - su - au);
	return out;
}
