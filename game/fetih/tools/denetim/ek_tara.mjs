// EK TARAMASI: bankadaki bütün soru metinlerinde (soru, şıklar, açıklamalar, maddeler, ipuçları …) kesme işaretinden
// sonra gelen bulunma (-da, -daki), ayrılma (-dan), yönelme (-a) ve ilgi (-ın) eklerini bulur; src/quiz/ek.js'in
// beklediği biçimle karşılaştırır (Kars'da → Kars'ta). Yalnız rapor verir; banka dosyalarına dokunmaz.
//   node tools/denetim/ek_tara.mjs [--en=N]      (öntanımlı: bütün bulgular; --en=N her listeden ilk N)
//
// Bulgular iki sınıfa ayrılır:
//   kesin  Türkçe yazılışlı adda (il adı, ek.js sözlüklerindeki ad, ğ/ı/ş/İ içeren ad, bilinen Türkçe ad) ya da sayıda kural
//          hatası: ünsüz benzeşmesi (Kars'da), kaynaştırma (Ordu'a, Kocaeli'de), ünlü uyumu (İzmir'da, Iğdır'in), il adına
//          iyelik n'si (Ağrı'nda). Kalın ünlülü adda ince ek, ad l ile bitiyorsa ya da büyük ünlü uyumuna aykırıysa
//          (ince l, saat türü alıntı olabilir) ya da yabancı eşadlı ilse (Batman'in) kesin sayılmaz.
//   bak    elle bakılmalı: okunuşla ek alan yabancı ad ya da kısaltma (Bordeaux'da), Türkçe olduğu bilinmeyen ad, sözlükte
//          olmayan kısaltma, iyelik n'si şüpheli tek kelimelik ad, cins ada kesme. Yabancı adlarda bilinen okunuş
//          kalıplarından (sessiz son e, -y = i, Fransızcada okunmayan son ünsüz) biri yazılanı açıklıyorsa neden
//          sütununda "olası okunuş" yazar; açıklanamayanlar listenin başındadır.
// Çok kelimeli adlarda son kelime belirler (Mimar Sinan'ın); çok kelimeli sözlük girdileri (Los Angeles) aranır.
// Ayrıca düz (') ve kıvrık (’) kesme işaretinin dağılımı.
import { readFileSync } from 'node:fs';

const KOK = new URL('../..', import.meta.url).pathname;
process.chdir(KOK);
await import(KOK + 'test/kanca.mjs');
const { BANK } = await import(KOK + 'src/data/bank.js');
const { yeniBank } = await import(KOK + 'src/quiz/mac.js');
const { ek, ekYok, sesBilgisi, turkceKucuk, harfleOku, IYELIK, INCE_L } = await import(KOK + 'src/quiz/ek.js');

const EN = Number(process.argv.find((a) => a.startsWith('--en='))?.slice(5) || Infinity);

// ---------------------------------------------------------------- banka
const sorular = [];
{
	const gor = new Set();
	for (const q of [...BANK, ...yeniBank()]) if (q && !gor.has(q.id)) gor.add(q.id), sorular.push(q);
}
// metin taşımayan üst alanlar
const ATLA = new Set(['id', 'cat', 'type', 'diff', 'src', 'img', 'style', 'mode', 'dir', 'tag']);
function metinler(q) {
	const out = [];
	const gez = (x, yol) => {
		if (typeof x === 'string') out.push([yol, x]);
		else if (Array.isArray(x)) x.forEach((e, i) => gez(e, `${yol}[${i}]`));
		else if (x && typeof x === 'object')
			for (const [k, v] of Object.entries(x)) if (yol || !ATLA.has(k)) gez(v, yol ? `${yol}.${k}` : k);
	};
	gez(q, '');
	return out;
}

// ---------------------------------------------------------------- Türkçe olduğu bilinen adlar
const anah = (s) => turkceKucuk(s.normalize('NFC')).replace(/['’]/g, '').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');
const IL = new Set(JSON.parse(readFileSync(KOK + 'src/data/turkiye.json', 'utf8')).provinces.map((p) => anah(p.name)));
// yabancı bir adla aynı yazılan iller (Batman: çizgi roman kahramanı, "betmın")
const IL_ESADLI = new Set(['batman']);
// ğ ı ş İ içermeyen, Türkçe yazılışlı (ya da Türkçeleşmiş) sık adlar
const TURKCE_AD = new Set(
	(
		'ahmet mehmet ali hasan hüseyin mustafa osman orhan murat murad selim süleyman kemal atatürk fatih yavuz sinan recep ' +
		'zeynep fatma emine hatice elif yunus emre hikmet pamuk cem can deniz ece ege umut mert burak ömer yusuf yakup davut ' +
		'halil kerem çelebi evliya piri reis barbaros hayrettin kanuni selahattin nurettin alparslan malazgirt sultan bey hoca ' +
		'dede baba mevlana rumi veli seyit ahi evran karagöz hacivat nasreddin turgut ziya tevfik fikret cahit sabahattin sait ' +
		'faik refik halide edip melih cevdet oktay rifat attila ilhan sezai necip yahya hamdi nuri kadri peyami safa aziz nesin ' +
		'sancar gökçen sabiha bayezid mahmut mahmud abdülhamit abdülmecit vahdettin fevzi ismet inönü celal bayar adnan menderes ' +
		'ecevit bülent orhun oğuz göktürk uygur türkiye anadolu trakya karadeniz akdeniz ege marmara toros dicle ararat erciyes ' +
		'nemrut kapadokya pamukkale efes truva bergama zeugma göbeklitepe galata kızılay ulus bodrum marmaris fethiye alanya ' +
		'kemer didim selçuk ürgüp avanos göreme safranbolu amasra sümela osmanlı selçuklu türk türkçe avrupa asya afrika amerika ' +
		'londra roma berlin viyana moskova atina madrid lizbon prag budapeşte varşova kahire bağdat kudüs mekke medine tahran ' +
		'pekin tokyo hindistan çin japonya rusya almanya fransa ingiltere italya ispanya yunanistan mısır iran irak suriye ' +
		'ayasofya topkapı süleymaniye sultanahmet dolmabahçe yıldız haliç boğaz tanzimat meşrutiyet cumhuriyet kurtuluş mondros ' +
		'sevr lozan mudanya'
	).split(' '),
);
const turkceMi = (son) => {
	const k = anah(son);
	return IL.has(k) || TURKCE_AD.has(k) || IYELIK.has(k) || INCE_L.has(k) || /[ğışİ]/.test(son);
};
// iyelik eki taşıyor gibi görünen kelime (sözlük dışı): -sı/-si/-su/-sü (ünlüden sonra), -ları/-leri, -oğlu
const iyelikGibi = (son) => {
	const k = anah(son);
	return IYELIK.has(k) || /[aeıioöuü]s[ıiuü]$/.test(k) || /l[ae]r[ıi]$/.test(k) || /oğlu$/.test(k);
};

// ---------------------------------------------------------------- ek ayrıştırma
// kesme işaretinden sonraki harf dizisi → { tur, cek (ek çekirdeği), kalan } ya da null (başka ek)
function ayir(suf) {
	let m = /^(n?[dt][ae])(n?)(.*)$/.exec(suf);
	if (m) {
		const [, cek, abl, kalan] = m;
		if (abl && (kalan === '' || /^[dt][ıiuü]r/.test(kalan))) return { tur: 'den', cek: cek + 'n', kalan };
		if (!abl && (kalan === '' || /^(ki|[dt][ıiuü]r|y|s[ıi]n|l[ae]r)/.test(kalan))) return { tur: 'de', cek, kalan };
		return null;
	}
	m = /^([yn]?[ae])$/.exec(suf);
	if (m) return { tur: 'e', cek: m[1], kalan: '' };
	m = /^(n?[ıiuü]n)(.*)$/.exec(suf);
	if (m && (m[2] === '' || /^(ki|[dt][ıiuü]r)/.test(m[2]))) return { tur: 'in', cek: m[1], kalan: m[2] };
	return null;
}
// ek çekirdeğinin ses özellikleri: kaynaştırma harfi, d/t, ünlü
const ozellik = (c) => ({ k: /^[yn]/.test(c) ? c[0] : '', d: (c.match(/[dt]/) || [''])[0], v: (c.match(/[aeıiuü]/) || [''])[0] });
const kalinMi = (v) => 'aıou'.includes(v);
function hataTuru(yaz, bek) {
	const a = ozellik(yaz);
	const b = ozellik(bek);
	const t = [];
	if (a.d !== b.d) t.push('benzeşme');
	if (a.k !== b.k) t.push('kaynaştırma');
	if (a.v !== b.v) t.push(kalinMi(a.v) !== kalinMi(b.v) ? (kalinMi(b.v) ? 'uyum: kalın ek bekleniyor' : 'uyum: ince ek bekleniyor') : 'uyum: düz/yuvarlak');
	return t;
}

// yabancı adlarda olası okunuşlar (yalnız ipucu: bulgu sınıfını değiştirmez); kalıplar en çok ikisi birlikte uygulanır
const KALIP = [
	[/(eaux|eau|aux|ault|aut|aud|ots|ot)$/, 'o'], // Perrault, Poirot, Peugeot
	[/([^aeıioöuü])e$/, '$1'], // sessiz son e: Alice, Magritte
	[/([^aeıioöuü])es$/, '$1s'], // sessiz e + s: Holmes
	[/e?y$/, 'i'], // Henry, Shelley, Calgary
	[/([aeiou])[tdsxzr]$/, '$1'], // Fransızcada okunmayan son ünsüz: Bizet, Fermat, Louis, Rainier
	[/ce$/, 's'], // France, Provence, Lawrence
	[/c$/, 'k'], // Kroc
	[/gh$/, ''], // Edinburgh
	[/([^aeiou])[oea]([nlr]s?)$/, '$1ı$2'], // İngilizce ı sesi: Johnson, Potter, Austen, Byron
	[/a([^aeiouy])e$/, 'ey$1'], // Cage, Game, Jane
	[/[iy]([^aeiouy])e$/, 'ay$1'], // Klondike, Skype
	[/([^aeiou])le$/, '$1ıl'], // Apple, Hubble, Kindle
	[/ee|ea/g, 'i'], // Queen, Beatles
	[/oo/g, 'u'], // Snooker, Brooklyn
];
const YABANCI_HARF = { à: 'a', á: 'a', ä: 'e', å: 'o', ã: 'a', é: 'e', è: 'e', ê: 'e', ë: 'e', í: 'i', ì: 'i', ï: 'i', ó: 'o', ò: 'o', ô: 'o', õ: 'o', ø: 'ö', ú: 'u', ù: 'u', ñ: 'n', ß: 's', w: 'v', x: 'ks', q: 'k', ý: 'i', ÿ: 'i', æ: 'e', œ: 'ö', č: 'ç', š: 'ş', ž: 'j', ć: 'ç', ł: 'l', ń: 'n', ś: 'ş', ź: 'z', ż: 'j', ř: 'rj', ě: 'e', ő: 'ö', ű: 'ü', ș: 'ş', ț: 'ts' };
const cevir = (s) => [...turkceKucuk(s)].map((h) => YABANCI_HARF[h] ?? h).join('').replace(/[^a-zçğıöşüâîû]/g, '');
function olasiOkunuslar(son) {
	const kok = cevir(son);
	const bir = KALIP.map(([re, y]) => kok.replace(re, y));
	const iki = bir.flatMap((s, i) => KALIP.filter((_, j) => j !== i).map(([re, y]) => s.replace(re, y)));
	return [...new Set([...bir, ...iki])].filter((s) => s && s !== kok && /[aeıioöuü]/.test(s));
}
// okunuşla beklenen ek çekirdeği
function cekirdek(govde, tur, okunus) {
	try {
		const g = ek(govde, tur, { okunus, kesme: true });
		return g.slice(g.lastIndexOf("'") + 1);
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------- tarama
const GOVDE = /(?:%?\d{1,3}(?:[.   ]\d{3})+(?:,\d+)?|%?\d+(?:[.,:]\d+)?|[\p{L}\p{N}](?:[\p{L}\p{N}]|['’.](?=[\p{L}\p{N}]))*)$/u;
const ONCEKI = /((?:[\p{L}\p{N}][\p{L}\p{N}.'’]*[ -]){1,2})$/u;
const say = { metin: 0, ek: { de: 0, den: 0, e: 0, in: 0 }, uydu: 0, iyelikKabul: 0, okunussuzUydu: 0, atlandi: 0 };
const kesmeSay = { duz: 0, kivrik: 0, duzEk: 0, kivrikEk: 0, ikisiSoru: 0, duzSoru: 0, kivrikSoru: 0, ikisiMetin: 0 };
const onekKesme = new Map(); // kimlik öneki → [düz, kıvrık]
const kesin = [];
const bak = [];
const iyelikGovde = new Map();
const bilinmeyen = new Map(); // okunuşu sözlükte olmayan kısaltma / yabancı harfli ad → sayı
const buyukHarf = [];

const harfDizisi = (s) => /^\p{L}+/u.exec(s)?.[0] ?? '';
const kisa = (s, i, n = 60) => {
	const a = Math.max(0, i - n);
	const b = Math.min(s.length, i + n);
	return (a ? '…' : '') + s.slice(a, b).replace(/\s+/g, ' ') + (b < s.length ? '…' : '');
};
const onekOf = (id) => String(id).split('-')[0].replace(/^([a-z]+)\d+$/, '$1');

for (const q of sorular) {
	const onek = onekOf(q.id);
	if (!onekKesme.has(onek)) onekKesme.set(onek, [0, 0]);
	let duzVar = false;
	let kivrikVar = false;
	for (const [alan, s] of metinler(q)) {
		say.metin++;
		if (/[\p{L}\p{N}]'\p{L}/u.test(s) && /[\p{L}\p{N}]’\p{L}/u.test(s)) kesmeSay.ikisiMetin++;
		for (const m of s.matchAll(/['’]/g)) {
			const i = m.index;
			const kivrik = m[0] === '’';
			kivrik ? kesmeSay.kivrik++ : kesmeSay.duz++;
			onekKesme.get(onek)[kivrik ? 1 : 0]++;
			if (!i || !/[\p{L}\p{N}]/u.test(s[i - 1]) || !/\p{L}/u.test(s[i + 1] || '')) continue;
			kivrik ? (kesmeSay.kivrikEk++, (kivrikVar = true)) : (kesmeSay.duzEk++, (duzVar = true));
			const ham = harfDizisi(s.slice(i + 1));
			const suf = turkceKucuk(ham);
			const a = ayir(suf);
			if (!a) continue;
			const once = s.slice(0, i);
			const govde = GOVDE.exec(once)?.[0];
			if (!govde) continue;
			const onceki = ONCEKI.exec(once.slice(0, once.length - govde.length))?.[1] ?? '';
			const ad = onceki + govde;
			say.ek[a.tur]++;
			const yazilan = govde + m[0] + ham;
			const bulgu = (sinif, beklenenCek, neden) =>
				(sinif === 'kesin' ? kesin : bak).push({
					id: q.id,
					alan,
					yazilan,
					beklenen: beklenenCek == null ? null : govde + m[0] + beklenenCek + a.kalan,
					neden,
					baglam: kisa(s, i),
				});
			if (ham !== suf) buyukHarf.push({ id: q.id, alan, yazilan });

			let b;
			try {
				b = sesBilgisi(ad);
			} catch (e) {
				// sözlükte olmayan kısaltma ya da yabancı harfli ad: olası okunuşlardan birine uyuyorsa geç, uymuyorsa bak
				const son = /[^ \t\r\n-]+$/.exec(ad)?.[0] ?? govde;
				const adaylar = new Set();
				const harf = [...son].filter((h) => /\p{L}/u.test(h));
				if (harf.length > 1 && harf.every((h) => /\p{Lu}/u.test(h))) adaylar.add(harfleOku(son));
				if (cevir(son)) adaylar.add(cevir(son));
				for (const o of olasiOkunuslar(son)) adaylar.add(o);
				const beklenenler = [...adaylar].map((o) => cekirdek(govde, a.tur, o)).filter(Boolean);
				bilinmeyen.set(son, (bilinmeyen.get(son) || 0) + 1);
				if (beklenenler.includes(a.cek)) say.okunussuzUydu++;
				else if (beklenenler.length)
					bulgu('bak', [...new Set(beklenenler)].slice(0, 3).join(' ya da '), 'okunuşu sözlükte yok: ' + String(e.message).replace(/^ek: /, '').split(';')[0]);
				else say.atlandi++;
				continue;
			}
			const son = b.son;
			const beklenen = (secenek) => {
				try {
					const g = ek(ad, a.tur, { kesme: true, ...secenek });
					return g.slice(g.lastIndexOf("'") + 1);
				} catch {
					return null;
				}
			};
			const sozluk = beklenen({});
			if (sozluk == null) {
				bulgu('bak', null, "küçük harfli gövde (cins ad): TDK'ye göre cins ada kesme konmaz");
				continue;
			}
			if (a.cek === sozluk) {
				say.uydu++;
				continue;
			}
			const iyelikOlabilir = a.tur !== 'in' && 'ıiuü'.includes(b.sonSes) && b.kaynak !== 'sayi';
			const diger = iyelikOlabilir ? beklenen({ iyelik: !b.iyelik }) : null;
			// çok kelimeli özel ad: önceki kelime büyük harfle başlıyor, eksiz (Bursa Cezaevi, Hababam Sınıfı)
			const tamlama = /(?:^|[ -])\p{Lu}\p{Ll}*[ -]$/u.test(onceki);
			if (diger && a.cek === diger) {
				if (b.iyelik) bulgu('kesin', sozluk, "kaynaştırma: iyelik n'si eksik (ek.js IYELIK sözlüğünde)");
				else if (IL.has(anah(son))) bulgu('kesin', sozluk, 'kaynaştırma: il adı iyelikli değil, n gelmez');
				else if (iyelikGibi(son) || (tamlama && !TURKCE_AD.has(anah(son)))) {
					say.iyelikKabul++;
					iyelikGovde.set(son, (iyelikGovde.get(son) || 0) + 1);
				} else bulgu('bak', sozluk, "iyelik n'si: ad 3. kişi iyelik ekiyle mi bitiyor? (öyleyse doğru)");
				continue;
			}
			// yanlış: iyelikli görünen adda beklenen iyelikli biçim
			const bek = diger && !b.iyelik && iyelikGibi(son) ? diger : sozluk;
			const tur = hataTuru(a.cek, bek);
			let neden = tur.join(', ');
			if (b.kaynak === 'sayi') {
				bulgu('kesin', bek, neden + ` (sayı: "${b.okunus}")`);
				continue;
			}
			if (b.kaynak !== 'yazilis') {
				bulgu('bak', bek, neden + ` (okunuş sözlüğüne göre: ${b.okunus})`);
				continue;
			}
			if (!b.ozel) {
				bulgu('bak', bek, neden + ' (küçük harfli gövde: cins ada kesme konmaz; tırnaklı söz olabilir)');
				continue;
			}
			// kalın ünlülü adda ince ek: ince l, saat türü alıntı ya da yabancı eşadlı olabilir; il adında ve büyük ünlü
			// uyumuna uyan, l ile bitmeyen Türkçe adda kesin
			const istisnaOlabilir =
				tur.includes('uyum: kalın ek bekleniyor') &&
				(IL.has(anah(son)) ? IL_ESADLI.has(anah(son)) : ekYok(son) || /l$/.test(anah(son)));
			if (turkceMi(son) && !istisnaOlabilir) {
				bulgu('kesin', bek, neden);
				continue;
			}
			// bak: olası okunuşlardan biri yazılanı açıklıyor mu
			const aciklayan = olasiOkunuslar(son).find((o) => cekirdek(ad, a.tur, o) === a.cek);
			if (turkceMi(son)) neden += IL.has(anah(son)) ? ' (il adı mı, aynı yazılışlı yabancı ad mı?)' : ' (alıntı ad: ince l / ince ünsüz istisnası olabilir)';
			else neden += ' (Türkçe olduğu bilinmeyen ad)';
			if (aciklayan) neden += `; olası okunuş "${aciklayan}" ise doğru`;
			bulgu('bak', bek, neden);
		}
	}
	if (duzVar && kivrikVar) kesmeSay.ikisiSoru++;
	else if (duzVar) kesmeSay.duzSoru++;
	else if (kivrikVar) kesmeSay.kivrikSoru++;
}

// ---------------------------------------------------------------- rapor
const yaz = (s = '') => console.log(s);
const toplamEk = Object.values(say.ek).reduce((x, y) => x + y, 0);
yaz('EK TARAMASI: kesme işaretinden sonra gelen bulunma, ayrılma, yönelme ve ilgi ekleri (src/quiz/ek.js ile)');
yaz(`Banka: ${sorular.length} soru (BANK + yeniBank, kimliğe göre tekil), ${say.metin} metin alanı`);
yaz();
yaz('KESME İŞARETİ DAĞILIMI');
yaz(`  düz (')   : ${kesmeSay.duz} toplam, ${kesmeSay.duzEk} tanesi ek önünde (harf/rakam + kesme + harf)`);
yaz(`  kıvrık (’): ${kesmeSay.kivrik} toplam, ${kesmeSay.kivrikEk} tanesi ek önünde`);
yaz(`  ek önünde kesme kullanan soru: yalnız düz ${kesmeSay.duzSoru}, yalnız kıvrık ${kesmeSay.kivrikSoru}, ikisi birden ${kesmeSay.ikisiSoru}`);
yaz(`  aynı metin alanında ikisi birden: ${kesmeSay.ikisiMetin}`);
yaz('  kimlik önekine göre, bütün kesme işaretleri (düz / kıvrık):');
for (const [o, [d, k]] of [...onekKesme].filter(([, [d, k]]) => d + k).sort((x, y) => y[1][0] + y[1][1] - x[1][0] - x[1][1]))
	yaz(`    ${o.padEnd(8)} ${String(d).padStart(6)} / ${String(k).padStart(6)}${d && k ? '   (karışık)' : ''}`);
yaz();
yaz('EK SAYILARI');
yaz(`  bulunma (-daki dahil) ${say.ek.de}, ayrılma ${say.ek.den}, yönelme ${say.ek.e}, ilgi ${say.ek.in}; toplam ${toplamEk}`);
yaz(`  ek.js'e uyan ${say.uydu}`);
yaz(`  iyelik n'si (Bursa Cezaevi'nde): sözlük dışı ama iyelikli görünen ya da tamlama içindeki adda kabul ${say.iyelikKabul}`);
yaz(`  okunuşu sözlükte olmayan adda olası bir okunuşa uyan ${say.okunussuzUydu}; hiç değerlendirilemeyen ${say.atlandi}`);
yaz(`  KESİN bulgu ${kesin.length}, BAK bulgu ${bak.length}, ekte büyük harf ${buyukHarf.length}`);
const liste = (baslik, L) => {
	yaz();
	yaz(`${baslik} (${L.length})`);
	yaz('  kimlik | alan | yazılan → beklenen | neden | bağlam');
	for (const f of L.slice(0, EN)) yaz(`  ${f.id} | ${f.alan} | ${f.yazilan} → ${f.beklenen ?? '?'} | ${f.neden} | «${f.baglam}»`);
	if (L.length > EN) yaz(`  … ${L.length - EN} bulgu daha (--en ile)`);
};
const ozet = (baslik, L) => {
	const o = new Map();
	for (const f of L) {
		const k = `${f.yazilan} → ${f.beklenen ?? '?'}`;
		o.set(k, (o.get(k) || 0) + 1);
	}
	yaz();
	yaz(`${baslik} (${o.size} ayrı yazılış)`);
	for (const [k, n] of [...o].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'tr'))) yaz(`  ${n}× ${k}`);
};
const sirala = (L) =>
	L.sort(
		(x, y) =>
			/olası okunuş/.test(x.neden) - /olası okunuş/.test(y.neden) ||
			x.neden.replace(/; olası.*/, '').localeCompare(y.neden.replace(/; olası.*/, ''), 'tr') ||
			x.yazilan.localeCompare(y.yazilan, 'tr') ||
			x.id.localeCompare(y.id),
	);
liste('KESİN', sirala(kesin));
ozet('KESİN ÖZET', kesin);
liste('BAK (önce açıklanamayanlar, sonra olası bir yabancı okunuşla açıklananlar)', sirala(bak));
ozet('BAK ÖZET', bak);
yaz();
yaz(`EKTE BÜYÜK HARF (${buyukHarf.length}; ek küçük harfle yazılır)`);
for (const f of buyukHarf.slice(0, EN)) yaz(`  ${f.id} | ${f.alan} | ${f.yazilan}`);
yaz();
yaz(`OKUNUŞU SÖZLÜKTE OLMAYAN KISALTMA / YABANCI HARFLİ AD (${bilinmeyen.size} ad; OKUNUS'a eklenebilir)`);
yaz('  ' + [...bilinmeyen].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(([k, n]) => `${k}×${n}`).join(', '));
yaz();
yaz(`SÖZLÜK DIŞI İYELİKLİ KABUL EDİLEN GÖVDELER (${iyelikGovde.size}; doğruysa IYELIK'e eklenebilir)`);
yaz('  ' + [...iyelikGovde].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'tr')).map(([k, n]) => `${k}×${n}`).join(', '));
