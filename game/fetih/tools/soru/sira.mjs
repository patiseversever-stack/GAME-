// SORU SIRA KAYDI (SORU-100K.md Aşama 0.6): her sorunun değişmeyen tam sayı sırası (src/data/sira.json). Soru hafızası
// (src/quiz/hafiza.js) kimlik yerine bu sırayı tutar: sıra başına bir bayt, 100 bin soruda ~100 KB.
//   node tools/soru/sira.mjs              denetim: bankada olup kayıtta olmayan kimlik varsa çıkış 1
//   node tools/soru/sira.mjs --guncelle   yeni kimlikleri sona ekler, bankadan çıkanları 'bos' işaretler, dosyayı yazar
// Kurallar: kayıt yalnız büyür; bir kimliğin numarası hiç değişmez. Silinen sorunun kimliği kayıtta kalır, numarası boşta
// (bos) durur ve başka kimliğe verilmez; aynı kimlik bankaya geri gelirse eski numarasını alır.
// Kapsam: klasik banka (BANK), yeni tipler (yeniBank) ve galeri örnekleri (DENEME_SAMPLES), türevler dahil (Mancınık ikizi
// dn-mc-*, halat turları dn-ht-*). Soru ekleyen bu betiği çalıştırır; unutulursa test/sira.test.mjs kırmızı yanar.
//
// Biçim: { v: 1, n: sıra sayısı, bos: [sıra | [ilk, adet], …], r: [kimlik | [önek, ilk sayı, adım, …], …] }. Kimlikler
// "önek + sayı" yapısında olduğundan ardışık numaralar tek grupta toplanır (adım k > 0: ardışık k kimlik daha; −d: sayı d
// atlar). Çözücü: src/quiz/hafiza.js siraCoz. Oyun paketine bu girer (build.mjs JSON'u sıkıştırıp gömer). Ölçüm (21 140
// kimlik): bu biçim 17 KB, düz dizi ["id0", "id1", …] 344 KB, nesne { id: sıra } 457 KB. Elle yazılan aileler ardışık
// numaralı (kimlik başına < 1 bayt); Wikidata aileleri (…-Q<numara>) seyrek, kimlik başına ~6 bayt: 100 binde ~0,5 MB.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { siraCoz } from '../../src/quiz/hafiza.js';

export const SIRA_YOLU = fileURLToPath(new URL('../../src/data/sira.json', import.meta.url));

/** Kimliği önek ve sondaki sayıya böl (sayı yoksa ''). En çok 15 hane: Number kesin kalır. */
export function parca(id) {
	const m = /^(.*?)(\d{1,15})$/.exec(id);
	return m ? [m[1], m[2]] : [id, ''];
}

const yap = (p, w, n) => p + String(n).padStart(w, '0');

/** Doğal sıra: önek, sonra sayı (dn-kb2 < dn-kb10). Yeni kimlikler kayda bu sırayla eklenir (gruplar uzun kalır). */
export function dogal(a, b) {
	const [pa, da] = parca(a);
	const [pb, db] = parca(b);
	if (pa !== pb) return pa < pb ? -1 : 1;
	if (da && db) return Number(da) - Number(db) || da.length - db.length;
	return a < b ? -1 : a > b ? 1 : 0;
}

/** Kimlik dizisini (indeks = sıra) kayıt gruplarına kodla. siraCoz(siraKodla(ids)) === ids. */
export function siraKodla(ids) {
	const r = [];
	let g = null; // açık grup: { p, w, son, e }
	const kapat = () => {
		if (g && g.e.length === 2) r[r.length - 1] = g.e[0] + g.e[1]; // tek kimlik: düz metin
		g = null;
	};
	for (const id of ids) {
		const [p, d] = parca(id);
		if (g && d && p === g.p) {
			const n = Number(d);
			const fark = n - g.son;
			// grup yalnız çözülünce aynı kimliği veriyorsa uzar (sıfır dolgusu ve genişlik dahil)
			if (fark >= 1 && yap(p, g.w, n) === id) {
				const e = g.e;
				if (fark === 1 && e.length > 2 && e[e.length - 1] > 0) e[e.length - 1]++;
				else e.push(fark === 1 ? 1 : -fark);
				g.son = n;
				continue;
			}
		}
		kapat();
		if (!d) {
			r.push(id);
			continue;
		}
		g = { p, w: d.length, son: Number(d), e: [p, d] };
		r.push(g.e);
	}
	kapat();
	return r;
}

/** Sıra listesini aralıklara kodla: [3, [10, 4]] = 3, 10, 11, 12, 13. */
export function aralikla(list) {
	const s = [...new Set(list)].sort((a, b) => a - b);
	const out = [];
	for (let i = 0; i < s.length; ) {
		let j = i;
		while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
		out.push(j > i ? [s[i], j - i + 1] : s[i]);
		i = j + 1;
	}
	return out;
}

/** aralikla tersi. */
export function araliklariAc(bos) {
	const out = [];
	for (const e of Array.isArray(bos) ? bos : []) {
		if (Array.isArray(e)) for (let k = 0; k < e[1]; k++) out.push(e[0] + k);
		else if (Number.isInteger(e)) out.push(e);
	}
	return out;
}

/**
 * Kaydı bankaya göre güncelle (saf işlev). kayit: sira.json içeriği (yoksa null); banka: kimlikler (Set ya da dizi).
 * Dönüş: { kayit, eklenen, silinen, geriGelen } (eklenen: yeni numara alanlar; silinen: bu güncellemede boşa düşenler;
 * geriGelen: boştayken bankaya dönenler, eski numarasıyla).
 */
export function siraGuncelle(kayit, banka) {
	const ids = siraCoz(kayit);
	const var_ = new Set(ids);
	const B = banka instanceof Set ? banka : new Set(banka);
	const eskiBos = new Set(araliklariAc(kayit?.bos));
	const eklenen = [...B].filter((id) => !var_.has(id)).sort(dogal);
	const hepsi = [...ids, ...eklenen];
	const bos = [];
	const silinen = [];
	const geriGelen = [];
	hepsi.forEach((id, i) => {
		if (!B.has(id)) {
			bos.push(i);
			if (!eskiBos.has(i)) silinen.push(id);
		} else if (eskiBos.has(i)) geriGelen.push(id);
	});
	return { kayit: { v: 1, n: hepsi.length, bos: aralikla(bos), r: siraKodla(hepsi) }, eklenen, silinen, geriGelen };
}

/** Dosya metni: grup başına bir satır (yeni sorular dosyanın sonuna eklenir, fark okunur kalır). */
export function siraMetni(k) {
	return `{\n\t"v": ${k.v},\n\t"n": ${k.n},\n\t"bos": ${JSON.stringify(k.bos)},\n\t"r": [\n${k.r.map((e) => '\t\t' + JSON.stringify(e)).join(',\n')}\n\t]\n}\n`;
}

export function siraOku(yol = SIRA_YOLU) {
	return existsSync(yol) ? JSON.parse(readFileSync(yol, 'utf8')) : null;
}

/**
 * Bankadaki bütün kimlikler (kayıt kapsamı). Bankanın yükleme biçimi değişirse yalnız burası değişir (test/sira.test.mjs
 * de bunu kullanır). Banka yükleme yolu: tools/denetim/parca.mjs.
 */
export async function bankaKimlikleri() {
	await import('../../test/kanca.mjs'); // maç modülleri harita verisini JSON olarak içe aktarır
	const { BANK } = await import('../../src/data/bank.js');
	const { yeniBank } = await import('../../src/quiz/mac.js');
	const { DENEME_SAMPLES } = await import('../../src/quiz/deneme.js');
	const ids = new Set();
	for (const q of [...BANK, ...yeniBank(), ...Object.values(DENEME_SAMPLES).flat()]) if (q && typeof q.id === 'string' && q.id) ids.add(q.id);
	return ids;
}

// ---------------------------------------------------------------- komut satırı
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	process.chdir(fileURLToPath(new URL('../..', import.meta.url)));
	const guncelle = process.argv.includes('--guncelle');
	const kayit = siraOku();
	const banka = await bankaKimlikleri();
	const { kayit: yeni, eklenen, silinen, geriGelen } = siraGuncelle(kayit, banka);
	const once = kayit ? siraCoz(kayit).length : 0;
	const bosSay = araliklariAc(yeni.bos).length;
	const ornek = (l) => (l.length ? ` (${l.slice(0, 5).join(', ')}${l.length > 5 ? ', …' : ''})` : '');
	console.log(`sıra kaydı: ${once} numara · banka ${banka.size} kimlik`);
	console.log(`  yeni (kayıtta yok): ${eklenen.length}${ornek(eklenen)}`);
	console.log(`  bankadan çıkan (boşa düşecek): ${silinen.length}${ornek(silinen)}`);
	console.log(`  boştan geri gelen: ${geriGelen.length}${ornek(geriGelen)}`);
	if (guncelle) {
		writeFileSync(SIRA_YOLU, siraMetni(yeni));
		console.log(`yazıldı: src/data/sira.json · ${yeni.n} numara (boşta ${bosSay}) · ${(JSON.stringify(yeni).length / 1024).toFixed(1)} KB (paketteki boyut)`);
	} else if (eklenen.length || silinen.length || geriGelen.length) {
		console.log('kayıt güncel değil: node tools/soru/sira.mjs --guncelle');
		process.exitCode = eklenen.length || geriGelen.length ? 1 : 0;
	} else console.log('kayıt güncel');
}
