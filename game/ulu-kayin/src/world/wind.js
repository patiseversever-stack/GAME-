// Rüzgâr: shaderlib.js içindeki windSway() ile birebir aynı formül.
// Görüntüde sallanan yaprak kümesinin gölgesi neredeyse, oyunun hesapladığı gölge de oradadır.

export const wind = { dx: 1, dz: 0, str: 0.25, gust: 0 };

export function windSway(x, y, z, amount, t, out) {
	const ph = x * 0.071 + z * 0.053 + y * 0.037;
	const base = Math.sin(t * 1.3 + ph * 6.2831) * 0.6 + Math.sin(t * 2.7 + ph * 11.0) * 0.4;
	const gust = wind.gust * (0.65 + 0.35 * Math.sin(t * 5.1 + ph * 17.0));
	const k = (wind.str * base + gust) * amount;
	out.x = wind.dx * k;
	out.y = Math.sin(t * 2.1 + ph * 9.0) * 0.18 * amount * (wind.str + wind.gust);
	out.z = wind.dz * k;
	return out;
}
