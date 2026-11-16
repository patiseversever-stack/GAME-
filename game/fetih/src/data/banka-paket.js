// Soru bankasının ham kaynağı, tarayıcı paketi: build.mjs `./banka-kaynak.js` içe aktarmasını buraya yönlendirir.
// Soru verisi (bank.js'in Node'da kurduğu BANK, aynı sırayla) derlemede gzip + base64 olarak gömülür:
//   HTML sayfaları   oyun betiğinin ardında çalışmayan veri bloğu <script type="application/octet-stream" id="fl-banka">
//                    (`fl:banka-veri` null): betik ayrıştırılırken taranmaz, sayfa okunurken yalnız metin olarak geçilir.
//   fetih.esm.js     sayfa yok: `fl:banka-veri` paketin kendisi (betikte dize).
// Sorular menüden sonra boşta açılır (bank.js bankaBosta).
import GOMULU, { SAYI } from 'fl:banka-veri';
import { paketAc } from './banka-ac.js';

const BLOK = 'fl-banka';
let metin = GOMULU;

/** Paket metni: betikteki dize ya da sayfadaki veri bloğu (blok, ayrıştırıcı ona varmadıysa belge bitince okunur). */
async function veri() {
	if (metin) return metin;
	let el = typeof document !== 'undefined' ? document.getElementById(BLOK) : null;
	if (!el && typeof document !== 'undefined' && document.readyState === 'loading') {
		await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
		el = document.getElementById(BLOK);
	}
	if (!el) throw new Error('soru paketi: sayfada veri bloğu (#' + BLOK + ') yok');
	metin = el.textContent.trim();
	el.remove(); // metin bellekte bir kez kalsın (açılınca o da bırakılır)
	return metin;
}

/** Ham içerik yok: banka paketten açılır. */
export const ham = null;
/** Paketi aç: soru listesi (ctl.acele: nefes almadan bitir). */
export async function yukle(ctl) {
	const liste = await paketAc(await veri(), ctl, SAYI);
	metin = null;
	return liste;
}
