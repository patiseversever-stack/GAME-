// SORU SIRA KAYDI (src/data/sira.json, SORU-100K.md Aşama 0.6): soru hafızası kimlik yerine kalıcı sıra numarasını tutar.
//   node test/sira.test.mjs
//  1. Eksiksiz: bankadaki (klasik banka, yeni tipler, galeri örnekleri, türevler) HER kimliğin sırası var. Yeni soru
//     eklenip `node tools/soru/sira.mjs --guncelle` unutulursa burası kırmızı yanar.
//  2. Eşsiz: her kimlik tek numarada, numaralar 0..n−1; boştaki (silinmiş) numaralar kayıtta, bankada değil.
//  3. Çalışma anı: hafiza.js siraOf dosyadakiyle aynı numarayı verir.
//  4. Kodlayıcı: gidiş-dönüş (sıfır dolgusu, genişlik değişimi, sayısız kimlik, uzun sayı); güncelleme yalnız ekler, silineni
//     boşa düşürür, numara yeniden verilmez, geri gelen eski numarasını alır.
await import('./kanca.mjs');
const { siraOf, siraCoz, siraSayisi } = await import('../src/quiz/hafiza.js');
const { siraOku, siraKodla, siraGuncelle, araliklariAc, aralikla, bankaKimlikleri, dogal } = await import('../tools/soru/sira.mjs');

let checks = 0;
let fails = 0;
const ok = (c, m) => {
	checks++;
	if (!c) {
		fails++;
		if (fails <= 40) console.log('  HATA: ' + m);
	}
};
const ornek = (l) => l.slice(0, 8).join(', ') + (l.length > 8 ? ', …' : '');

// ---------------------------------------------------------------- 1–3) gerçek kayıt ve banka
const kayit = siraOku();
ok(kayit && kayit.v === 1 && Array.isArray(kayit.r) && Array.isArray(kayit.bos), 'src/data/sira.json yok ya da biçimi bozuk');
const ids = siraCoz(kayit);
const banka = await bankaKimlikleri();
const of = new Map();
const cift = [];
ids.forEach((id, i) => (of.has(id) ? cift.push(id) : of.set(id, i)));
ok(!cift.length, `kayıtta iki numaralı kimlik: ${ornek(cift)}`);
ok(kayit.n === ids.length, `kayıttaki n (${kayit.n}) çözülen sıra sayısıyla (${ids.length}) tutmuyor`);
const eksik = [...banka].filter((id) => !of.has(id));
ok(!eksik.length, `${eksik.length} kimliğin sırası yok (node tools/soru/sira.mjs --guncelle): ${ornek(eksik)}`);
const bos = araliklariAc(kayit.bos);
ok(new Set(bos).size === bos.length && bos.every((s) => Number.isInteger(s) && s >= 0 && s < ids.length), 'boş numaralar eşsiz ve aralıkta olmalı');
const bosBankada = bos.filter((s) => banka.has(ids[s])).map((s) => ids[s]);
ok(!bosBankada.length, `boşta işaretli ama bankada olan kimlik (geri gelmiş; --guncelle): ${ornek(bosBankada)}`);
// bankadan çıkmış ama boşa işaretlenmemiş kimlik: zararsız (numara yine kimseye verilmez), yalnız bildirilir
const bosSet = new Set(bos);
const isaretsiz = ids.filter((id, i) => !banka.has(id) && !bosSet.has(i));
if (isaretsiz.length) console.log(`  not: bankadan çıkmış ${isaretsiz.length} kimlik boşa işaretli değil (--guncelle): ${ornek(isaretsiz)}`);
// çalışma anı (hafiza.js) aynı numarayı verir
ok(siraSayisi() === ids.length, `hafiza.js kaydı ${siraSayisi()} sıra, dosya ${ids.length}`);
let yanlis = 0;
for (const [id, i] of of) if (siraOf(id) !== i) yanlis++;
ok(!yanlis, `siraOf ${yanlis} kimlikte dosyadan farklı`);
// türevler kayıtta (Mancınık ikizi, halat turları)
ok(ids.some((id) => id.startsWith('dn-mc-')) && ids.some((id) => id.startsWith('dn-ht')), 'türevler (dn-mc-*, dn-ht-*) kayıtta olmalı');
// kayıt kodlayıcının ürettiği biçimde (yeniden kodlayınca aynı gruplar: dosya elle bozulmamış)
ok(JSON.stringify(siraKodla(ids)) === JSON.stringify(kayit.r), 'sira.json grupları kodlayıcının çıktısıyla aynı değil (elle düzenlenmiş?)');
const paket = JSON.stringify(kayit).length;
console.log(`# kayıt ${ids.length} sıra (boşta ${bos.length}), banka ${banka.size} kimlik, eksik ${eksik.length} · paketteki boyut ${(paket / 1024).toFixed(1)} KB (düz dizi ${(JSON.stringify(ids).length / 1024).toFixed(0)} KB)`);

// ---------------------------------------------------------------- 4) kodlayıcı ve güncelleme
{
	const zor = ['a-1', 'a-2', 'a-3', 'a-7', 'a-8', 'a-10', 'b-009', 'b-010', 'b-011', 'b-100', 'b-0101', 'x', 'y-', '12', '13', 'q-0', 'q-00', 'q-01', 'uzun-1234567890123456789', 'uzun-1234567890123456790', 'cog-wd-ilce-Q932886', 'cog-wd-ilce-Q459495', 'cog-wd-ilce-Q1000000', 'c-5', 'c-4', 'c-6', 'dn-kb9', 'dn-kb10', 'dn-kb11', 'ş-1', 'ş-2'];
	const geri = siraCoz({ r: JSON.parse(JSON.stringify(siraKodla(zor))) });
	ok(geri.length === zor.length && geri.every((id, i) => id === zor[i]), `kodlayıcı gidiş-dönüş: ${geri.join(' ')}`);
	const sirali = [...zor].sort(dogal);
	ok(sirali.indexOf('dn-kb9') < sirali.indexOf('dn-kb10') && sirali.indexOf('a-8') < sirali.indexOf('a-10'), 'doğal sıra');
	ok(JSON.stringify(aralikla([5, 1, 2, 3, 9, 10])) === '[[1,3],5,[9,2]]' && araliklariAc([[1, 3], 5, [9, 2]]).join() === '1,2,3,5,9,10', 'aralıklar');
	// güncelleme: ilk kurulum doğal sırayla
	const g1 = siraGuncelle(null, ['t-3', 't-1', 't-2', 'u-1']);
	const s1 = siraCoz(g1.kayit);
	ok(s1.join() === 't-1,t-2,t-3,u-1' && g1.kayit.n === 4 && g1.eklenen.length === 4, `ilk kurulum: ${s1}`);
	// soru silindi (t-2), yenileri geldi: eskiler aynı numarada, yeniler sonda, silinen boşta
	const g2 = siraGuncelle(g1.kayit, ['t-1', 't-3', 'u-1', 't-4', 'a-1']);
	const s2 = siraCoz(g2.kayit);
	ok(s2.slice(0, 4).join() === s1.join() && s2.slice(4).join() === 'a-1,t-4', `ekleme yalnız sona: ${s2}`);
	ok(araliklariAc(g2.kayit.bos).join() === '1' && g2.silinen.join() === 't-2', 'silinen boşa düşer, kimliği kayıtta kalır');
	// silinen numara başka kimliğe verilmez; geri gelen eski numarasını alır
	const g3 = siraGuncelle(g2.kayit, ['t-1', 't-2', 't-3', 'u-1', 't-4', 'a-1', 't-5']);
	const s3 = siraCoz(g3.kayit);
	ok(s3.indexOf('t-2') === 1 && s3.indexOf('t-5') === 6 && !g3.kayit.bos.length && g3.geriGelen.join() === 't-2', `geri gelen eski numarasında: ${s3}`);
	// değişiklik yoksa kayıt aynı
	const g4 = siraGuncelle(g3.kayit, new Set(s3));
	ok(JSON.stringify(g4.kayit) === JSON.stringify(g3.kayit) && !g4.eklenen.length && !g4.silinen.length, 'değişiklik yoksa kayıt aynı kalır');
	// gerçek kayıt üzerinde: güncelleme hiçbir kimliğin numarasını değiştirmez
	const gg = siraCoz(siraGuncelle(kayit, banka).kayit);
	ok(ids.every((id, i) => gg[i] === id), 'güncelleme var olan numaraları değiştirmemeli');
}

console.log(`# sira.test.mjs: ${checks} denetim, ${fails} hata`);
if (fails) process.exitCode = 1;
