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

/** Yatay telefon düzeni. */
export const LAND = '@media (orientation:landscape) and (max-height:560px)';
