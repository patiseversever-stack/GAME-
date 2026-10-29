// Makam dizileri (sent cinsinden, karar perdesinden). Eşit düzen yerine Arel-Ezgi-Uzdilek koma değerlerine yakın aralıklar:
// Türk müziğinin mikrotonal tınısı (Hicaz'daki artık ikili, Uşşak'taki alçak ikinci) buradan gelir.
export const MAKAM = {
	hicaz: [0, 112, 384, 498, 702, 792, 996], // D Eb F# G A Bb C: artık ikili, destansı ve gizemli
	ussak: [0, 163, 294, 498, 702, 792, 996], // yumuşak, sıcak, hüzünlü; sakin ve ağıt
	rast: [0, 204, 355, 498, 702, 906, 1086], // parlak, soylu; zafer
	kurdi: [0, 90, 294, 498, 702, 792, 996], // koyu, gergin; düello
	nihavend: [0, 204, 294, 498, 702, 792, 1086], // melodik minör: macera, sefer
};

export const ROOT = 293.66; // Re (D4)

/** Derece → Hz. deg 0..6 dizinin perdeleri, 7 üst oktav, negatif alt oktav. */
export function degHz(makam, deg, root = ROOT) {
	const sc = MAKAM[makam] || MAKAM.rast;
	const o = Math.floor(deg / 7);
	const i = ((deg % 7) + 7) % 7;
	return root * Math.pow(2, (sc[i] + 1200 * o) / 1200);
}
