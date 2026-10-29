// Stil yardımcıları (bütün stil dosyaları kullanır).

/** Kalın yazı konturu (text-shadow ile; yalnızca duruk yazılarda). */
export const OUT = (c, w = 2) =>
	`text-shadow:${[
		[w, 0],
		[-w, 0],
		[0, w],
		[0, -w],
		[w * 0.7, w * 0.7],
		[-w * 0.7, w * 0.7],
		[w * 0.7, -w * 0.7],
		[-w * 0.7, -w * 0.7],
	]
		.map(([x, y]) => `${x}px ${y}px 0 ${c}`)
		.join(',')},0 ${w + 2}px 0 ${c}`;

/**
 * Yatay telefon düzeni: oyun dikey kilitli (core/portrait.js), bu yüzden hiç eşleşmez.
 * Eski yatay kurallar dikey ekranlar elden geçirilirken kaldırılacak.
 */
export const LAND = '@media not all';
