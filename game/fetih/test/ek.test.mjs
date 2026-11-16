// Ek getirme sınaması (TDK Yazım Kılavuzu): 81 il, sayılar, kişi adları, kısaltmalar ve yabancı adlar, -daki / -lı / -la,
// iyelikli adlar, seçenekler ve hatalar. Beklenen değerler ELLE yazıldı; modülün hesabından türetilmedi.
//   node --test test/ek.test.mjs   (ya da: node test/ek.test.mjs)
import { readFileSync } from 'node:fs';
import { ek, ekYok, turkceKucuk, harfleOku, sayiSonKelime, sesBilgisi, OKUNUS, INCE_L, IYELIK, TURLER, KESME } from '../src/quiz/ek.js';

let fails = 0;
let checks = 0;
const ok = (c, msg) => {
	checks++;
	if (!c) {
		fails++;
		if (fails <= 60) console.log('HATA: ' + msg);
	}
};
const dene = (ad, tur, beklenen, secenek) => {
	let g;
	try {
		g = ek(ad, tur, secenek);
	} catch (e) {
		g = 'HATA: ' + e.message;
	}
	ok(g === beklenen, `ek(${JSON.stringify(ad)}, '${tur}'${secenek ? ', ' + JSON.stringify(secenek) : ''}) = «${g}», beklenen «${beklenen}»`);
};
const hataVerir = (f, msg, icerir) => {
	checks++;
	try {
		const g = f();
		fails++;
		console.log(`HATA: hata vermedi (${msg}): «${g}»`);
	} catch (e) {
		if (icerir && !String(e.message).includes(icerir)) {
			fails++;
			console.log(`HATA: ${msg}: hata iletisi «${e.message}» içinde «${icerir}» yok`);
		}
	}
};

// ---------------------------------------------------------------- 1) 81 il: bulunma, ayrılma, yönelme, ilgi
// Kocaeli (Koca ili), Kırklareli (Kırklar ili), Tunceli (Tunç ili) 3. kişi iyelik ekiyle biter: araya n girer.
const ILLER = [
	['Adana', "Adana'da", "Adana'dan", "Adana'ya", "Adana'nın"],
	['Adıyaman', "Adıyaman'da", "Adıyaman'dan", "Adıyaman'a", "Adıyaman'ın"],
	['Afyonkarahisar', "Afyonkarahisar'da", "Afyonkarahisar'dan", "Afyonkarahisar'a", "Afyonkarahisar'ın"],
	['Ağrı', "Ağrı'da", "Ağrı'dan", "Ağrı'ya", "Ağrı'nın"],
	['Amasya', "Amasya'da", "Amasya'dan", "Amasya'ya", "Amasya'nın"],
	['Ankara', "Ankara'da", "Ankara'dan", "Ankara'ya", "Ankara'nın"],
	['Antalya', "Antalya'da", "Antalya'dan", "Antalya'ya", "Antalya'nın"],
	['Artvin', "Artvin'de", "Artvin'den", "Artvin'e", "Artvin'in"],
	['Aydın', "Aydın'da", "Aydın'dan", "Aydın'a", "Aydın'ın"],
	['Balıkesir', "Balıkesir'de", "Balıkesir'den", "Balıkesir'e", "Balıkesir'in"],
	['Bilecik', "Bilecik'te", "Bilecik'ten", "Bilecik'e", "Bilecik'in"],
	['Bingöl', "Bingöl'de", "Bingöl'den", "Bingöl'e", "Bingöl'ün"],
	['Bitlis', "Bitlis'te", "Bitlis'ten", "Bitlis'e", "Bitlis'in"],
	['Bolu', "Bolu'da", "Bolu'dan", "Bolu'ya", "Bolu'nun"],
	['Burdur', "Burdur'da", "Burdur'dan", "Burdur'a", "Burdur'un"],
	['Bursa', "Bursa'da", "Bursa'dan", "Bursa'ya", "Bursa'nın"],
	['Çanakkale', "Çanakkale'de", "Çanakkale'den", "Çanakkale'ye", "Çanakkale'nin"],
	['Çankırı', "Çankırı'da", "Çankırı'dan", "Çankırı'ya", "Çankırı'nın"],
	['Çorum', "Çorum'da", "Çorum'dan", "Çorum'a", "Çorum'un"],
	['Denizli', "Denizli'de", "Denizli'den", "Denizli'ye", "Denizli'nin"],
	['Diyarbakır', "Diyarbakır'da", "Diyarbakır'dan", "Diyarbakır'a", "Diyarbakır'ın"],
	['Edirne', "Edirne'de", "Edirne'den", "Edirne'ye", "Edirne'nin"],
	['Elazığ', "Elazığ'da", "Elazığ'dan", "Elazığ'a", "Elazığ'ın"],
	['Erzincan', "Erzincan'da", "Erzincan'dan", "Erzincan'a", "Erzincan'ın"],
	['Erzurum', "Erzurum'da", "Erzurum'dan", "Erzurum'a", "Erzurum'un"],
	['Eskişehir', "Eskişehir'de", "Eskişehir'den", "Eskişehir'e", "Eskişehir'in"],
	['Gaziantep', "Gaziantep'te", "Gaziantep'ten", "Gaziantep'e", "Gaziantep'in"],
	['Giresun', "Giresun'da", "Giresun'dan", "Giresun'a", "Giresun'un"],
	['Gümüşhane', "Gümüşhane'de", "Gümüşhane'den", "Gümüşhane'ye", "Gümüşhane'nin"],
	['Hakkari', "Hakkari'de", "Hakkari'den", "Hakkari'ye", "Hakkari'nin"],
	['Hatay', "Hatay'da", "Hatay'dan", "Hatay'a", "Hatay'ın"],
	['Isparta', "Isparta'da", "Isparta'dan", "Isparta'ya", "Isparta'nın"],
	['Mersin', "Mersin'de", "Mersin'den", "Mersin'e", "Mersin'in"],
	['İstanbul', "İstanbul'da", "İstanbul'dan", "İstanbul'a", "İstanbul'un"],
	['İzmir', "İzmir'de", "İzmir'den", "İzmir'e", "İzmir'in"],
	['Kars', "Kars'ta", "Kars'tan", "Kars'a", "Kars'ın"],
	['Kastamonu', "Kastamonu'da", "Kastamonu'dan", "Kastamonu'ya", "Kastamonu'nun"],
	['Kayseri', "Kayseri'de", "Kayseri'den", "Kayseri'ye", "Kayseri'nin"],
	['Kırklareli', "Kırklareli'nde", "Kırklareli'nden", "Kırklareli'ne", "Kırklareli'nin"],
	['Kırşehir', "Kırşehir'de", "Kırşehir'den", "Kırşehir'e", "Kırşehir'in"],
	['Kocaeli', "Kocaeli'nde", "Kocaeli'nden", "Kocaeli'ne", "Kocaeli'nin"],
	['Konya', "Konya'da", "Konya'dan", "Konya'ya", "Konya'nın"],
	['Kütahya', "Kütahya'da", "Kütahya'dan", "Kütahya'ya", "Kütahya'nın"],
	['Malatya', "Malatya'da", "Malatya'dan", "Malatya'ya", "Malatya'nın"],
	['Manisa', "Manisa'da", "Manisa'dan", "Manisa'ya", "Manisa'nın"],
	['Kahramanmaraş', "Kahramanmaraş'ta", "Kahramanmaraş'tan", "Kahramanmaraş'a", "Kahramanmaraş'ın"],
	['Mardin', "Mardin'de", "Mardin'den", "Mardin'e", "Mardin'in"],
	['Muğla', "Muğla'da", "Muğla'dan", "Muğla'ya", "Muğla'nın"],
	['Muş', "Muş'ta", "Muş'tan", "Muş'a", "Muş'un"],
	['Nevşehir', "Nevşehir'de", "Nevşehir'den", "Nevşehir'e", "Nevşehir'in"],
	['Niğde', "Niğde'de", "Niğde'den", "Niğde'ye", "Niğde'nin"],
	['Ordu', "Ordu'da", "Ordu'dan", "Ordu'ya", "Ordu'nun"],
	['Rize', "Rize'de", "Rize'den", "Rize'ye", "Rize'nin"],
	['Sakarya', "Sakarya'da", "Sakarya'dan", "Sakarya'ya", "Sakarya'nın"],
	['Samsun', "Samsun'da", "Samsun'dan", "Samsun'a", "Samsun'un"],
	['Siirt', "Siirt'te", "Siirt'ten", "Siirt'e", "Siirt'in"],
	['Sinop', "Sinop'ta", "Sinop'tan", "Sinop'a", "Sinop'un"],
	['Sivas', "Sivas'ta", "Sivas'tan", "Sivas'a", "Sivas'ın"],
	['Tekirdağ', "Tekirdağ'da", "Tekirdağ'dan", "Tekirdağ'a", "Tekirdağ'ın"],
	['Tokat', "Tokat'ta", "Tokat'tan", "Tokat'a", "Tokat'ın"],
	['Trabzon', "Trabzon'da", "Trabzon'dan", "Trabzon'a", "Trabzon'un"],
	['Tunceli', "Tunceli'nde", "Tunceli'nden", "Tunceli'ne", "Tunceli'nin"],
	['Şanlıurfa', "Şanlıurfa'da", "Şanlıurfa'dan", "Şanlıurfa'ya", "Şanlıurfa'nın"],
	['Uşak', "Uşak'ta", "Uşak'tan", "Uşak'a", "Uşak'ın"],
	['Van', "Van'da", "Van'dan", "Van'a", "Van'ın"],
	['Yozgat', "Yozgat'ta", "Yozgat'tan", "Yozgat'a", "Yozgat'ın"],
	['Zonguldak', "Zonguldak'ta", "Zonguldak'tan", "Zonguldak'a", "Zonguldak'ın"],
	['Aksaray', "Aksaray'da", "Aksaray'dan", "Aksaray'a", "Aksaray'ın"],
	['Bayburt', "Bayburt'ta", "Bayburt'tan", "Bayburt'a", "Bayburt'un"],
	['Karaman', "Karaman'da", "Karaman'dan", "Karaman'a", "Karaman'ın"],
	['Kırıkkale', "Kırıkkale'de", "Kırıkkale'den", "Kırıkkale'ye", "Kırıkkale'nin"],
	['Batman', "Batman'da", "Batman'dan", "Batman'a", "Batman'ın"],
	['Şırnak', "Şırnak'ta", "Şırnak'tan", "Şırnak'a", "Şırnak'ın"],
	['Bartın', "Bartın'da", "Bartın'dan", "Bartın'a", "Bartın'ın"],
	['Ardahan', "Ardahan'da", "Ardahan'dan", "Ardahan'a", "Ardahan'ın"],
	['Iğdır', "Iğdır'da", "Iğdır'dan", "Iğdır'a", "Iğdır'ın"],
	['Yalova', "Yalova'da", "Yalova'dan", "Yalova'ya", "Yalova'nın"],
	['Karabük', "Karabük'te", "Karabük'ten", "Karabük'e", "Karabük'ün"],
	['Kilis', "Kilis'te", "Kilis'ten", "Kilis'e", "Kilis'in"],
	['Osmaniye', "Osmaniye'de", "Osmaniye'den", "Osmaniye'ye", "Osmaniye'nin"],
	['Düzce', "Düzce'de", "Düzce'den", "Düzce'ye", "Düzce'nin"],
];
{
	ok(ILLER.length === 81, `il tablosunda ${ILLER.length} il var`);
	// tablo oyunun il listesiyle aynı mı
	const veri = JSON.parse(readFileSync(new URL('../src/data/turkiye.json', import.meta.url), 'utf8'));
	const adlar = new Set(veri.provinces.map((p) => p.name));
	for (const [il] of ILLER) ok(adlar.has(il), `${il} oyunun il listesinde yok`);
	ok(adlar.size === 81, `oyunun il listesinde ${adlar.size} il var`);
	for (const [il, de, den, e, ilgi] of ILLER) {
		dene(il, 'de', de);
		dene(il, 'den', den);
		dene(il, 'e', e);
		dene(il, 'in', ilgi);
	}
	// düzeltme işaretli yazılış (TDK: Hakkâri) ve ilin kısa adı
	dene('Hakkâri', 'de', "Hakkâri'de");
	dene('Hakkâri', 'e', "Hakkâri'ye");
	dene('Afyon', 'de', "Afyon'da");
}

// ---------------------------------------------------------------- 2) sayılar
// sayının okunuşundaki son kelime → [bulunma, yönelme, ilgi, belirtme, vasıta, -lı] (kesmeden sonrası)
const SON = {
	0: ['da', 'a', 'ın', 'ı', 'la', 'lı'], // sıfır
	1: ['de', 'e', 'in', 'i', 'le', 'li'], // bir
	2: ['de', 'ye', 'nin', 'yi', 'yle', 'li'], // iki
	3: ['te', 'e', 'ün', 'ü', 'le', 'lü'], // üç
	4: ['te', 'e', 'ün', 'ü', 'le', 'lü'], // dört
	5: ['te', 'e', 'in', 'i', 'le', 'li'], // beş
	6: ['da', 'ya', 'nın', 'yı', 'yla', 'lı'], // altı
	7: ['de', 'ye', 'nin', 'yi', 'yle', 'li'], // yedi
	8: ['de', 'e', 'in', 'i', 'le', 'li'], // sekiz
	9: ['da', 'a', 'un', 'u', 'la', 'lu'], // dokuz
	10: ['da', 'a', 'un', 'u', 'la', 'lu'], // on
	20: ['de', 'ye', 'nin', 'yi', 'yle', 'li'], // yirmi
	30: ['da', 'a', 'un', 'u', 'la', 'lu'], // otuz
	40: ['ta', 'a', 'ın', 'ı', 'la', 'lı'], // kırk
	50: ['de', 'ye', 'nin', 'yi', 'yle', 'li'], // elli
	60: ['ta', 'a', 'ın', 'ı', 'la', 'lı'], // altmış
	70: ['te', 'e', 'in', 'i', 'le', 'li'], // yetmiş
	80: ['de', 'e', 'in', 'i', 'le', 'li'], // seksen
	90: ['da', 'a', 'ın', 'ı', 'la', 'lı'], // doksan
	100: ['de', 'e', 'ün', 'ü', 'le', 'lü'], // yüz
};
{
	for (let n = 0; n <= 100; n++) {
		const [de, e, ilgi, i, le, li] = SON[n % 10 ? n % 10 : n];
		for (const ad of [n, String(n)]) {
			dene(ad, 'de', `${n}'${de}`);
			dene(ad, 'den', `${n}'${de}n`);
			dene(ad, 'e', `${n}'${e}`);
			dene(ad, 'in', `${n}'${ilgi}`);
		}
		dene(n, 'i', `${n}'${i}`);
		dene(n, 'le', `${n}'${le}`);
		dene(n, 'li', `${n}'${li}`);
		dene(n, 'deki', `${n}'${de}ki`);
	}
	// istenen örnekler (elle)
	for (const [s, de] of [
		[1, "1'de"], [2, "2'de"], [3, "3'te"], [4, "4'te"], [5, "5'te"], [6, "6'da"], [7, "7'de"], [8, "8'de"], [9, "9'da"],
		[10, "10'da"], [20, "20'de"], [30, "30'da"], [40, "40'ta"], [50, "50'de"], [60, "60'ta"], [70, "70'te"], [80, "80'de"],
		[90, "90'da"], [100, "100'de"],
	])
		dene(s, 'de', de);
	// büyük sayılar: [yazılış, bulunma, ayrılma, yönelme, ilgi]
	const BUYUK = [
		['1000', "1000'de", "1000'den", "1000'e", "1000'in"], // bin
		['1453', "1453'te", "1453'ten", "1453'e", "1453'ün"], // üç
		['1071', "1071'de", "1071'den", "1071'e", "1071'in"], // bir
		['1923', "1923'te", "1923'ten", "1923'e", "1923'ün"], // üç
		['2023', "2023'te", "2023'ten", "2023'e", "2023'ün"], // üç
		['1881', "1881'de", "1881'den", "1881'e", "1881'in"], // bir
		['1938', "1938'de", "1938'den", "1938'e", "1938'in"], // sekiz
		['100000', "100000'de", "100000'den", "100000'e", "100000'in"], // yüz bin
		['1000000', "1000000'da", "1000000'dan", "1000000'a", "1000000'un"], // milyon
		['2000', "2000'de", "2000'den", "2000'e", "2000'in"], // iki bin
		['1900', "1900'de", "1900'den", "1900'e", "1900'ün"], // dokuz yüz
		['1910', "1910'da", "1910'dan", "1910'a", "1910'un"], // on
		['1940', "1940'ta", "1940'tan", "1940'a", "1940'ın"], // kırk
		['1299', "1299'da", "1299'dan", "1299'a", "1299'un"], // dokuz
		['1326', "1326'da", "1326'dan", "1326'ya", "1326'nın"], // altı
		['5000000', "5000000'da", "5000000'dan", "5000000'a", "5000000'un"], // milyon
		['1000000000', "1000000000'da", "1000000000'dan", "1000000000'a", "1000000000'ın"], // milyar
		['3000000000000', "3000000000000'da", "3000000000000'dan", "3000000000000'a", "3000000000000'un"], // trilyon
		['1001000', "1001000'de", "1001000'den", "1001000'e", "1001000'in"], // bir milyon bin
		// binlik ayracı nokta, ondalık ayracı virgül
		['1.000', "1.000'de", "1.000'den", "1.000'e", "1.000'in"],
		['10.000', "10.000'de", "10.000'den", "10.000'e", "10.000'in"],
		['1.000.000', "1.000.000'da", "1.000.000'dan", "1.000.000'a", "1.000.000'un"],
		['2.500.000', "2.500.000'de", "2.500.000'den", "2.500.000'e", "2.500.000'in"], // iki milyon beş yüz bin
		['3,5', "3,5'te", "3,5'ten", "3,5'e", "3,5'in"], // üç virgül beş
		['2,25', "2,25'te", "2,25'ten", "2,25'e", "2,25'in"], // yirmi beş
		['0,5', "0,5'te", "0,5'ten", "0,5'e", "0,5'in"],
		['1,06', "1,06'da", "1,06'dan", "1,06'ya", "1,06'nın"], // sıfır altı
		['9,80', "9,80'de", "9,80'den", "9,80'e", "9,80'in"], // seksen
		['3,0', "3,0'da", "3,0'dan", "3,0'a", "3,0'ın"], // sıfır
		['1.250,75', "1.250,75'te", "1.250,75'ten", "1.250,75'e", "1.250,75'in"], // yetmiş beş
		['1\u202F000', "1\u202F000'de", "1\u202F000'den", "1\u202F000'e", "1\u202F000'in"], // ince boşluklu binlik
		// yüzde, eksi, saat
		['%50', "%50'de", "%50'den", "%50'ye", "%50'nin"],
		['%3', "%3'te", "%3'ten", "%3'e", "%3'ün"],
		['%100', "%100'de", "%100'den", "%100'e", "%100'ün"],
		['-5', "-5'te", "-5'ten", "-5'e", "-5'in"],
		['-40', "-40'ta", "-40'tan", "-40'a", "-40'ın"],
		['15.30', "15.30'da", "15.30'dan", "15.30'a", "15.30'un"], // on beş otuz
		['09.00', "09.00'da", "09.00'dan", "09.00'a", "09.00'un"], // dokuz
		['12:45', "12:45'te", "12:45'ten", "12:45'e", "12:45'in"], // kırk beş
		['17.00', "17.00'de", "17.00'den", "17.00'ye", "17.00'nin"], // on yedi
		// sayıyla biten adlar: son kelime belirler
		['MS 1071', "MS 1071'de", "MS 1071'den", "MS 1071'e", "MS 1071'in"],
		['Apollo 11', "Apollo 11'de", "Apollo 11'den", "Apollo 11'e", "Apollo 11'in"],
		['F-16', "F-16'da", "F-16'dan", "F-16'ya", "F-16'nın"],
		['A4', "A4'te", "A4'ten", "A4'e", "A4'ün"],
		['1914-1918', "1914-1918'de", "1914-1918'den", "1914-1918'e", "1914-1918'in"],
	];
	for (const [s, de, den, e, ilgi] of BUYUK) {
		dene(s, 'de', de);
		dene(s, 'den', den);
		dene(s, 'e', e);
		dene(s, 'in', ilgi);
	}
	// sayı türünde ad
	dene(1923, 'de', "1923'te");
	dene(3.5, 'de', "3,5'te");
	dene(1e6, 'de', "1000000'da");
	dene(-7, 'e', "-7'ye");
	// -lı: sayılarda kesmeyle (TDK: 1980'li yıllar)
	for (const [s, li] of [['1980', "1980'li"], ['90', "90'lı"], ['1900', "1900'lü"], ['1800', "1800'lü"], ['60', "60'lı"], ['2000', "2000'li"]])
		dene(s, 'li', li);
	// yazıyla yazılmış sayı kelimesi cins addır: ek bitişik
	dene('5 milyon', 'de', '5 milyonda');
	dene('3 milyar', 'in', '3 milyarın');
	dene('yüz', 'de', 'yüzde');
	// son kelime yardımcısı
	for (const [s, k] of [['0', 'sıfır'], ['000', 'sıfır'], ['7', 'yedi'], ['110', 'on'], ['1010', 'on'], ['1923', 'üç'], ['100', 'yüz'], ['1000', 'bin'], ['1000000', 'milyon'], ['1000000000', 'milyar'], ['2000000000000', 'trilyon'], ['5000000000000000', 'katrilyon']])
		ok(sayiSonKelime(s) === k, `sayiSonKelime(${s}) = ${sayiSonKelime(s)}, beklenen ${k}`);
	// desteklenmeyen biçimler: tahmin yürütmez, hata verir
	hataVerir(() => ek('1.5', 'de'), '1.5 (noktalı ondalık)');
	hataVerir(() => ek('19.', 'de'), '19. (sıra sayısı)', 'sıra');
	hataVerir(() => ek('4G', 'de'), '4G');
	hataVerir(() => ek('25.70', 'de'), '25.70 (saat değil)');
	hataVerir(() => ek('1.00.000', 'de'), '1.00.000');
	hataVerir(() => ek('1' + '0'.repeat(25), 'de'), 'çok büyük sayı');
}

// ---------------------------------------------------------------- 3) kişi adları: yumuşamama, ince l, kaynaştırma
const KISI = [
	// özel adlarda ünsüz yumuşaması yok
	['Mehmet', 'e', "Mehmet'e"], ['Mehmet', 'in', "Mehmet'in"], ['Mehmet', 'de', "Mehmet'te"], ['Mehmet', 'i', "Mehmet'i"],
	['Ahmet', 'e', "Ahmet'e"], ['Ahmet', 'in', "Ahmet'in"], ['Ahmet', 'den', "Ahmet'ten"],
	['Recep', 'e', "Recep'e"], ['Recep', 'de', "Recep'te"],
	['Zeynep', 'in', "Zeynep'in"], ['Zeynep', 'e', "Zeynep'e"],
	['Murat', 'e', "Murat'a"], ['Murat', 'in', "Murat'ın"],
	['Selçuk', 'in', "Selçuk'un"], ['Selçuk', 'e', "Selçuk'a"],
	['Burak', 'e', "Burak'a"], ['Burak', 'de', "Burak'ta"],
	['Ferhat', 'in', "Ferhat'ın"],
	['Elif', 'e', "Elif'e"], ['Elif', 'de', "Elif'te"],
	['Atatürk', 'in', "Atatürk'ün"], ['Atatürk', 'e', "Atatürk'e"], ['Atatürk', 'de', "Atatürk'te"], ['Atatürk', 'den', "Atatürk'ten"],
	['Fatih', 'e', "Fatih'e"], ['Fatih', 'in', "Fatih'in"], ['Fatih', 'den', "Fatih'ten"],
	['Sait Faik', 'in', "Sait Faik'in"], ['Sait Faik', 'de', "Sait Faik'te"],
	['Orhan Pamuk', 'in', "Orhan Pamuk'un"], ['Orhan Pamuk', 'e', "Orhan Pamuk'a"],
	['Nazım Hikmet', 'in', "Nazım Hikmet'in"], ['Nazım Hikmet', 'e', "Nazım Hikmet'e"],
	// ince l
	['Kemal', 'e', "Kemal'e"], ['Kemal', 'in', "Kemal'in"], ['Kemal', 'de', "Kemal'de"], ['Kemal', 'i', "Kemal'i"],
	['Cemal', 'in', "Cemal'in"], ['Cemal', 'e', "Cemal'e"],
	['Celal', 'e', "Celal'e"], ['Celal', 'in', "Celal'in"],
	['Bilal', 'den', "Bilal'den"], ['Bilal', 'e', "Bilal'e"],
	['Hilal', 'e', "Hilal'e"], ['Hilal', 'in', "Hilal'in"],
	['Halil', 'e', "Halil'e"], ['Halil', 'in', "Halil'in"],
	['Nihal', 'e', "Nihal'e"],
	['İsmail', 'e', "İsmail'e"],
	['İsrail', 'de', "İsrail'de"],
	['Kemâl', 'e', "Kemâl'e"],
	['Mustafa Kemal', 'in', "Mustafa Kemal'in"], ['Namık Kemal', 'e', "Namık Kemal'e"], ['Yaşar Kemal', 'in', "Yaşar Kemal'in"],
	// Sunal, Bayar Türkçe: l kalın, ek kalın
	['Kemal Sunal', 'in', "Kemal Sunal'ın"], ['Celal Bayar', 'e', "Celal Bayar'a"],
	// ünlüyle bitenler: kaynaştırma
	['Ali', 'e', "Ali'ye"], ['Ali', 'in', "Ali'nin"], ['Ali', 'de', "Ali'de"], ['Ali', 'i', "Ali'yi"],
	['Ayşe', 'in', "Ayşe'nin"], ['Ayşe', 'e', "Ayşe'ye"],
	['Fatma', 'e', "Fatma'ya"], ['Fatma', 'in', "Fatma'nın"],
	['Emine', 'e', "Emine'ye"],
	['Yunus Emre', 'in', "Yunus Emre'nin"], ['Yunus Emre', 'e', "Yunus Emre'ye"],
	['Mevlana', 'in', "Mevlana'nın"], ['Mevlânâ', 'e', "Mevlânâ'ya"],
	['Nasreddin Hoca', 'in', "Nasreddin Hoca'nın"],
	['Kanuni', 'e', "Kanuni'ye"],
	['Evliya Çelebi', 'in', "Evliya Çelebi'nin"],
	['Hacı Bayram Veli', 'in', "Hacı Bayram Veli'nin"],
	['Ziya Paşa', 'in', "Ziya Paşa'nın"],
	['Hz. Ali', 'e', "Hz. Ali'ye"],
	['Picasso', 'in', "Picasso'nun"], ['Picasso', 'e', "Picasso'ya"],
	['Goethe', 'in', "Goethe'nin"], ['Goethe', 'e', "Goethe'ye"],
	['Leonardo da Vinci', 'in', "Leonardo da Vinci'nin"],
	// ünsüzle bitenler
	['Yavuz', 'in', "Yavuz'un"], ['Yavuz', 'e', "Yavuz'a"],
	['Mimar Sinan', 'in', "Mimar Sinan'ın"], ['Mimar Sinan', 'e', "Mimar Sinan'a"],
	['Mozart', 'in', "Mozart'ın"], ['Mozart', 'de', "Mozart'ta"],
	['Newton', 'in', "Newton'un"], ['Newton', 'de', "Newton'da"],
	['Hasan', 'e', "Hasan'a"], ['Hüseyin', 'in', "Hüseyin'in"],
	['Osman', 'in', "Osman'ın"], ['Orhan', 'e', "Orhan'a"],
	['Ömer', 'in', "Ömer'in"], ['Tuğrul', 'in', "Tuğrul'un"],
	['Barbaros', 'in', "Barbaros'un"], ['Barbaros', 'de', "Barbaros'ta"],
	['Piri Reis', 'in', "Piri Reis'in"], ['Piri Reis', 'de', "Piri Reis'te"],
	['Âşık Veysel', 'in', "Âşık Veysel'in"],
	['Sabiha Gökçen', 'in', "Sabiha Gökçen'in"],
	['Aziz Sancar', 'in', "Aziz Sancar'ın"],
	['II. Mehmet', 'in', "II. Mehmet'in"],
	['Kur\'an', 'de', "Kur'an'da"],
];
{
	const adlar = new Set(KISI.map((x) => x[0]));
	ok(adlar.size >= 40, `kişi adı sayısı ${adlar.size} < 40`);
	for (const [ad, tur, b] of KISI) dene(ad, tur, b);
}

// ---------------------------------------------------------------- 4) kısaltmalar ve yabancı adlar (OKUNUS'un hepsi)
// [ad, bulunma, yönelme, ilgi]
const OKUNUSLU = [
	// harf harf (Türkçe harf adları: be, ce, de, me, te …)
	['AB', "AB'de", "AB'ye", "AB'nin"], ['ABD', "ABD'de", "ABD'ye", "ABD'nin"], ['AİHM', "AİHM'de", "AİHM'ye", "AİHM'nin"],
	['AVM', "AVM'de", "AVM'ye", "AVM'nin"], ['BAE', "BAE'de", "BAE'ye", "BAE'nin"], ['BBC', "BBC'de", "BBC'ye", "BBC'nin"],
	['BM', "BM'de", "BM'ye", "BM'nin"], ['DNA', "DNA'da", "DNA'ya", "DNA'nın"], ['DSİ', "DSİ'de", "DSİ'ye", "DSİ'nin"],
	['İETT', "İETT'de", "İETT'ye", "İETT'nin"], ['KKTC', "KKTC'de", "KKTC'ye", "KKTC'nin"], ['MTA', "MTA'da", "MTA'ya", "MTA'nın"],
	['OECD', "OECD'de", "OECD'ye", "OECD'nin"], ['ÖSYM', "ÖSYM'de", "ÖSYM'ye", "ÖSYM'nin"], ['PTT', "PTT'de", "PTT'ye", "PTT'nin"],
	['SSCB', "SSCB'de", "SSCB'ye", "SSCB'nin"], ['TBMM', "TBMM'de", "TBMM'ye", "TBMM'nin"], ['TC', "TC'de", "TC'ye", "TC'nin"],
	['TCDD', "TCDD'de", "TCDD'ye", "TCDD'nin"], ['TDK', "TDK'de", "TDK'ye", "TDK'nin"], ['TFF', "TFF'de", "TFF'ye", "TFF'nin"],
	['THY', "THY'de", "THY'ye", "THY'nin"], ['TRT', "TRT'de", "TRT'ye", "TRT'nin"], ['TSK', "TSK'de", "TSK'ye", "TSK'nin"],
	['TTK', "TTK'de", "TTK'ye", "TTK'nin"], ['TV', "TV'de", "TV'ye", "TV'nin"],
	['NBA', "NBA'da", "NBA'ya", "NBA'nın"],
	// kelime gibi okunan
	['ASELSAN', "ASELSAN'da", "ASELSAN'a", "ASELSAN'ın"], ['BOTAŞ', "BOTAŞ'ta", "BOTAŞ'a", "BOTAŞ'ın"],
	['CERN', "CERN'de", "CERN'e", "CERN'in"], ['EXPO', "EXPO'da", "EXPO'ya", "EXPO'nun"], ['FIBA', "FIBA'da", "FIBA'ya", "FIBA'nın"],
	['FIFA', "FIFA'da", "FIFA'ya", "FIFA'nın"], ['İSKİ', "İSKİ'de", "İSKİ'ye", "İSKİ'nin"], ['İTÜ', "İTÜ'de", "İTÜ'ye", "İTÜ'nün"],
	['NASA', "NASA'da", "NASA'ya", "NASA'nın"], ['NATO', "NATO'da", "NATO'ya", "NATO'nun"], ['ODTÜ', "ODTÜ'de", "ODTÜ'ye", "ODTÜ'nün"],
	['OPEC', "OPEC'te", "OPEC'e", "OPEC'in"], ['TEKNOFEST', "TEKNOFEST'te", "TEKNOFEST'e", "TEKNOFEST'in"],
	['TOGG', "TOGG'da", "TOGG'a", "TOGG'un"], ['TOKİ', "TOKİ'de", "TOKİ'ye", "TOKİ'nin"],
	['TÜBİTAK', "TÜBİTAK'ta", "TÜBİTAK'a", "TÜBİTAK'ın"], ['TÜİK', "TÜİK'te", "TÜİK'e", "TÜİK'in"],
	['UEFA', "UEFA'da", "UEFA'ya", "UEFA'nın"], ['UFO', "UFO'da", "UFO'ya", "UFO'nun"],
	['UNESCO', "UNESCO'da", "UNESCO'ya", "UNESCO'nun"], ['UNICEF', "UNICEF'te", "UNICEF'e", "UNICEF'in"], ['YÖK', "YÖK'te", "YÖK'e", "YÖK'ün"],
	// yabancı adlar: okunuşa göre
	['Bach', "Bach'ta", "Bach'a", "Bach'ın"], ['Bordeaux', "Bordeaux'da", "Bordeaux'ya", "Bordeaux'nun"],
	['Broadway', "Broadway'de", "Broadway'e", "Broadway'in"], ['Cambridge', "Cambridge'de", "Cambridge'e", "Cambridge'in"],
	['Camus', "Camus'de", "Camus'ye", "Camus'nün"], ['Cannes', "Cannes'da", "Cannes'a", "Cannes'ın"],
	['Cézanne', "Cézanne'da", "Cézanne'a", "Cézanne'ın"], ['Chelsea', "Chelsea'de", "Chelsea'ye", "Chelsea'nin"],
	['Chopin', "Chopin'de", "Chopin'e", "Chopin'in"], ['Dalí', "Dalí'de", "Dalí'ye", "Dalí'nin"],
	['Darwin', "Darwin'de", "Darwin'e", "Darwin'in"], ['Debussy', "Debussy'de", "Debussy'ye", "Debussy'nin"],
	['Degas', "Degas'da", "Degas'ya", "Degas'nın"], ['Descartes', "Descartes'ta", "Descartes'a", "Descartes'ın"],
	['Dickens', "Dickens'ta", "Dickens'a", "Dickens'ın"], ['Dumas', "Dumas'da", "Dumas'ya", "Dumas'nın"],
	['Einstein', "Einstein'da", "Einstein'a", "Einstein'ın"], ['Freud', "Freud'da", "Freud'a", "Freud'un"],
	['Gaudí', "Gaudí'de", "Gaudí'ye", "Gaudí'nin"], ['Goethe', "Goethe'de", "Goethe'ye", "Goethe'nin"],
	['Google', "Google'da", "Google'a", "Google'ın"], ['Hemingway', "Hemingway'de", "Hemingway'e", "Hemingway'in"],
	['Hollywood', "Hollywood'da", "Hollywood'a", "Hollywood'un"], ['Jackson', "Jackson'da", "Jackson'a", "Jackson'ın"],
	['Liverpool', "Liverpool'da", "Liverpool'a", "Liverpool'un"], ['Louvre', "Louvre'da", "Louvre'a", "Louvre'un"],
	['Los Angeles', "Los Angeles'ta", "Los Angeles'a", "Los Angeles'ın"], ['Manchester', "Manchester'da", "Manchester'a", "Manchester'ın"],
	['Marseille', "Marseille'de", "Marseille'e", "Marseille'in"], ['Michigan', "Michigan'da", "Michigan'a", "Michigan'ın"],
	['Molière', "Molière'de", "Molière'e", "Molière'in"], ['Monet', "Monet'de", "Monet'ye", "Monet'nin"],
	['Netflix', "Netflix'te", "Netflix'e", "Netflix'in"], ['Newton', "Newton'da", "Newton'a", "Newton'un"],
	['Nice', "Nice'te", "Nice'e", "Nice'in"], ['Ottawa', "Ottawa'da", "Ottawa'ya", "Ottawa'nın"],
	['Pelé', "Pelé'de", "Pelé'ye", "Pelé'nin"], ['Renoir', "Renoir'da", "Renoir'a", "Renoir'ın"],
	['Rousseau', "Rousseau'da", "Rousseau'ya", "Rousseau'nun"], ['Seine', "Seine'de", "Seine'e", "Seine'in"],
	['Shakespeare', "Shakespeare'de", "Shakespeare'e", "Shakespeare'in"], ['Strasbourg', "Strasbourg'da", "Strasbourg'a", "Strasbourg'un"],
	['Toulouse', "Toulouse'da", "Toulouse'a", "Toulouse'un"], ['Twitter', "Twitter'da", "Twitter'a", "Twitter'ın"],
	['Verne', "Verne'de", "Verne'e", "Verne'in"], ['Versailles', "Versailles'da", "Versailles'a", "Versailles'ın"],
	['Voltaire', "Voltaire'de", "Voltaire'e", "Voltaire'in"], ['Wagner', "Wagner'de", "Wagner'e", "Wagner'in"],
	['Wall Street', "Wall Street'te", "Wall Street'e", "Wall Street'in"], ['Washington', "Washington'da", "Washington'a", "Washington'ın"],
	['Wellington', "Wellington'da", "Wellington'a", "Wellington'ın"], ['Wimbledon', "Wimbledon'da", "Wimbledon'a", "Wimbledon'ın"],
	['YouTube', "YouTube'da", "YouTube'a", "YouTube'un"], ['Zidane', "Zidane'da", "Zidane'a", "Zidane'ın"],
	['Loire', "Loire'da", "Loire'a", "Loire'ın"],
	// ölçü birimi kısaltmaları: kesmeyle (TDK: km'ye, kg'dan)
	['km', "km'de", "km'ye", "km'nin"], ['cm', "cm'de", "cm'ye", "cm'nin"], ['mm', "mm'de", "mm'ye", "mm'nin"],
	['m', "m'de", "m'ye", "m'nin"], ['kg', "kg'da", "kg'a", "kg'ın"], ['mg', "mg'da", "mg'a", "mg'ın"], ['ml', "ml'de", "ml'ye", "ml'nin"],
	// yazılışına göre değil okunuşuna göre ek alan cins adlar: ek bitişik
	['saat', 'saatte', 'saate', 'saatin'], ['dikkat', 'dikkatte', 'dikkate', 'dikkatin'], ['hakikat', 'hakikatte', 'hakikate', 'hakikatin'],
	['seyahat', 'seyahatte', 'seyahate', 'seyahatin'], ['sıhhat', 'sıhhatte', 'sıhhate', 'sıhhatin'], ['harf', 'harfte', 'harfe', 'harfin'],
];
{
	const tablo = new Set(OKUNUSLU.map((x) => x[0]));
	for (const k of Object.keys(OKUNUS)) ok(tablo.has(k), `OKUNUS'taki "${k}" sınamada yok (tabloya elle ekleyin)`);
	for (const [ad, de, e, ilgi] of OKUNUSLU) {
		dene(ad, 'de', de);
		dene(ad, 'den', de + 'n');
		dene(ad, 'e', e);
		dene(ad, 'in', ilgi);
	}
	// sözlükte arama büyük-küçük harfe duyarsız; çok kelimeli adda son kelimeler sözlükte aranır
	dene('Nato', 'de', "Nato'da");
	dene('Kaliforniya Los Angeles', 'de', "Kaliforniya Los Angeles'ta");
	dene('Saat', 'de', "Saat'te");
	dene('nice', 'e', 'niceye'); // yalnız küçük harfli cins ad büyük harfli sözlük girdisiyle (Nice) eşleşmez
	dene('TBMM Genel Kurulu', 'de', "TBMM Genel Kurulu'nda", { iyelik: true });
	dene('saat', 'i', 'saati');
	dene('5 km', 'den', "5 km'den");
	dene("Eugene O'Neill", 'in', "Eugene O'Neill'in"); // büyük harf içeren ad özel addır: kesmeyle
	dene('saat', 'deki', 'saatteki');
	// sözlükte olmayan kısaltma ve yabancı harfli ad: tahmin yok, hata
	hataVerir(() => ek('XYZ', 'de'), 'bilinmeyen kısaltma', 'okunuş');
	hataVerir(() => ek('İSTANBUL', 'de'), 'büyük harfle yazılmış ad (kısaltma sanılır)');
	hataVerir(() => ek('Bruxelles', 'de'), 'x harfli ad', 'abece');
	hataVerir(() => ek('Würzburg', 'de'), 'w harfli ad', 'abece');
	hataVerir(() => ek('Québec', 'de'), 'q ve é harfli ad', 'abece');
	hataVerir(() => ek('McLaren', 'de'), 'içinde büyük harf olan ad', 'büyük harf');
	// secenek.okunus: bilinmeyen ad için okunuş verilir ve sözlüğün önüne geçer
	ok(harfleOku('TBMM') === 'tebememe', `harfleOku('TBMM') = ${harfleOku('TBMM')}`);
	ok(harfleOku('XYZ') === 'iksyeze', `harfleOku('XYZ') = ${harfleOku('XYZ')}`);
	dene('XYZ', 'de', "XYZ'de", { okunus: harfleOku('XYZ') });
	dene('XYZ', 'e', "XYZ'ye", { okunus: harfleOku('XYZ') });
	dene('Bruxelles', 'de', "Bruxelles'de", { okunus: 'brüksel' });
	dene('Gauguin', 'in', "Gauguin'in", { okunus: 'gogen' });
	dene('Michigan', 'de', "Michigan'de", { okunus: 'mişigen' });
	dene('C', 'de', "C'de"); // tek büyük harf: harf adı (ce)
	dene('C', 'e', "C'ye");
	dene('A', 'in', "A'nın");
	// sözlükler genişletilebilir
	OKUNUS.Seattle = 'siatıl';
	dene('Seattle', 'de', "Seattle'da");
	dene('Seattle', 'e', "Seattle'a");
	delete OKUNUS.Seattle;
	hataVerir(() => ek('ÇAYKUR', 'de'), 'eklenmeden önce ÇAYKUR');
	OKUNUS.ÇAYKUR = 'çaykur';
	dene('ÇAYKUR', 'de', "ÇAYKUR'da");
	delete OKUNUS.ÇAYKUR;
	hataVerir(() => ek('ÇAYKUR', 'de'), 'silindikten sonra ÇAYKUR');
	INCE_L.add('Neval');
	dene('Neval', 'e', "Neval'e");
	dene('Neval', 'in', "Neval'in");
	INCE_L.delete('Neval');
	ok(sesBilgisi('Neval').inceL === false, 'INCE_L silinen girdiyi hâlâ kullanıyor');
	ok(INCE_L.has('kemal') && IYELIK.has('kocaeli'), 'sözlüklerde temel girdiler yok');
}

// ---------------------------------------------------------------- 5) -daki, -lı, -la (en az 15'er)
const DEKI = [
	['Ankara', "Ankara'daki"], ['Kars', "Kars'taki"], ['İzmir', "İzmir'deki"], ['Bitlis', "Bitlis'teki"], ['Ordu', "Ordu'daki"],
	['Rize', "Rize'deki"], ['Muş', "Muş'taki"], ['Sinop', "Sinop'taki"], ['Elazığ', "Elazığ'daki"], ['Tokat', "Tokat'taki"],
	['Karabük', "Karabük'teki"], ['Iğdır', "Iğdır'daki"], ['Bingöl', "Bingöl'deki"], ['Kocaeli', "Kocaeli'ndeki"],
	['Kuşadası', "Kuşadası'ndaki"], ['Ağrı Dağı', "Ağrı Dağı'ndaki"], ['1923', "1923'teki"], ['2000', "2000'deki"],
	['TBMM', "TBMM'deki"], ['NATO', "NATO'daki"], ['Bordeaux', "Bordeaux'daki"], ['Kemal', "Kemal'deki"],
];
// TDK: özel adlara gelen yapım ekleri kesmeyle ayrılmaz (Ankaralı); sayı, kısaltma ve okunuşlu adda kesme
const LI = [
	['Ankara', 'Ankaralı'], ['İstanbul', 'İstanbullu'], ['İzmir', 'İzmirli'], ['Kars', 'Karslı'], ['Muş', 'Muşlu'],
	['Rize', 'Rizeli'], ['Ordu', 'Ordulu'], ['Bingöl', 'Bingöllü'], ['Sinop', 'Sinoplu'], ['Tokat', 'Tokatlı'],
	['Karabük', 'Karabüklü'], ['Iğdır', 'Iğdırlı'], ['Konya', 'Konyalı'], ['Düzce', 'Düzceli'], ['Kocaeli', 'Kocaelili'],
	['Avrupa', 'Avrupalı'], ['Aydın', 'Aydınlı'], ['1980', "1980'li"], ['90', "90'lı"], ['30', "30'lu"], ['ODTÜ', "ODTÜ'lü"],
	['ABD', "ABD'li"], ['Bordeaux', "Bordeaux'lu"],
];
const LE = [
	['Ankara', "Ankara'yla"], ['Kars', "Kars'la"], ['İzmir', "İzmir'le"], ['Ordu', "Ordu'yla"], ['Rize', "Rize'yle"],
	['Muş', "Muş'la"], ['Bitlis', "Bitlis'le"], ['Bingöl', "Bingöl'le"], ['Ali', "Ali'yle"], ['Ayşe', "Ayşe'yle"],
	['Mehmet', "Mehmet'le"], ['Kemal', "Kemal'le"], ['Atatürk', "Atatürk'le"], ['1923', "1923'le"], ['6', "6'yla"],
	['10', "10'la"], ['TBMM', "TBMM'yle"], ['NATO', "NATO'yla"], ['Kocaeli', "Kocaeli'yle"], ['Bordeaux', "Bordeaux'yla"],
	['Ağrı Dağı', "Ağrı Dağı'yla"],
];
{
	ok(DEKI.length >= 15 && LI.length >= 15 && LE.length >= 15, 'deki/li/le örneği 15\'ten az');
	for (const [ad, b] of DEKI) dene(ad, 'deki', b);
	for (const [ad, b] of LI) dene(ad, 'li', b);
	for (const [ad, b] of LE) dene(ad, 'le', b);
	dene('Ankara', 'li', "Ankara'lı", { kesme: true });
	dene('Kars', 'de', 'Karsta', { kesme: false });
}

// ---------------------------------------------------------------- 6) belirtme ve iyelikli adlar
{
	for (const [ad, b] of [
		['Ankara', "Ankara'yı"], ['Kars', "Kars'ı"], ['İzmir', "İzmir'i"], ['Ordu', "Ordu'yu"], ['Bingöl', "Bingöl'ü"],
		['Muş', "Muş'u"], ['Rize', "Rize'yi"], ['Tokat', "Tokat'ı"], ['Kocaeli', "Kocaeli'ni"], ['Topkapı Sarayı', "Topkapı Sarayı'nı"],
	])
		dene(ad, 'i', b);
	const IYE = [
		// [ad, bulunma, ayrılma, yönelme, ilgi]
		['Ağrı Dağı', "Ağrı Dağı'nda", "Ağrı Dağı'ndan", "Ağrı Dağı'na", "Ağrı Dağı'nın"],
		['Van Gölü', "Van Gölü'nde", "Van Gölü'nden", "Van Gölü'ne", "Van Gölü'nün"],
		['Sakarya Savaşı', "Sakarya Savaşı'nda", "Sakarya Savaşı'ndan", "Sakarya Savaşı'na", "Sakarya Savaşı'nın"],
		['Kuşadası', "Kuşadası'nda", "Kuşadası'ndan", "Kuşadası'na", "Kuşadası'nın"],
		['Beyoğlu', "Beyoğlu'nda", "Beyoğlu'ndan", "Beyoğlu'na", "Beyoğlu'nun"],
		['Eminönü', "Eminönü'nde", "Eminönü'nden", "Eminönü'ne", "Eminönü'nün"],
		['Gölbaşı', "Gölbaşı'nda", "Gölbaşı'ndan", "Gölbaşı'na", "Gölbaşı'nın"],
		['Olimpiyat Oyunları', "Olimpiyat Oyunları'nda", "Olimpiyat Oyunları'ndan", "Olimpiyat Oyunları'na", "Olimpiyat Oyunları'nın"],
		['Ayder Yaylası', "Ayder Yaylası'nda", "Ayder Yaylası'ndan", "Ayder Yaylası'na", "Ayder Yaylası'nın"],
		['Sultanahmet Camii', "Sultanahmet Camii'nde", "Sultanahmet Camii'nden", "Sultanahmet Camii'ne", "Sultanahmet Camii'nin"],
		['Akdeniz Bölgesi', "Akdeniz Bölgesi'nde", "Akdeniz Bölgesi'nden", "Akdeniz Bölgesi'ne", "Akdeniz Bölgesi'nin"],
	];
	for (const [ad, de, den, e, ilgi] of IYE) {
		dene(ad, 'de', de);
		dene(ad, 'den', den);
		dene(ad, 'e', e);
		dene(ad, 'in', ilgi);
	}
	// secenek.iyelik: sözlükte olmayan iyelikli ad
	dene('Dünya Turu', 'de', "Dünya Turu'nda", { iyelik: true });
	ok(sesBilgisi('Dünya Turu').iyelik === false, 'sözlükte olmayan ad iyelikli sayıldı (tahmin yürütülmemeli)');
	ok(sesBilgisi('Kocaeli', { iyelik: false }).iyelik === false, 'secenek.iyelik sözlüğün önüne geçmiyor');
	hataVerir(() => ek('Kars', 'de', { iyelik: true }), 'ünsüzle biten ada iyelik', 'iyelik');
}

// ---------------------------------------------------------------- 7) yardımcılar, cins adlar, hatalar, biçim
{
	ok(turkceKucuk('IĞDIR') === 'ığdır', 'turkceKucuk I → ı');
	ok(turkceKucuk('İSTANBUL') === 'istanbul', 'turkceKucuk İ → i');
	ok(KESME === "'", 'kesme düz kesme değil');
	for (const [ad, b] of [
		['Ankara', false], ['Mehmet', false], ['Ordu', false], ['Yavuz Selim', false], ['Mimar Sinan', true], ['Mozart', false], ['Bingöl', false],
		['Kemal', true], ['Atatürk', true], ['İstanbul', true], ['kitap', true], ['Erzurum', true], ['Afyonkarahisar', true],
	])
		ok(ekYok(ad) === b, `ekYok('${ad}') = ${ekYok(ad)}, beklenen ${b}`);
	// cins adlar: ek bitişik; yumuşama bilinmediğinden p ç t k g + ünlüyle başlayan ek hata
	dene('kitap', 'de', 'kitapta');
	dene('masa', 'e', 'masaya');
	dene('ev', 'in', 'evin');
	hataVerir(() => ek('kitap', 'e'), 'kitap + e (yumuşama)', 'yumuşama');
	hataVerir(() => ek('ağaç', 'i'), 'ağaç + i (yumuşama)', 'yumuşama');
	// hatalı girdi
	hataVerir(() => ek('Kars', 'da'), 'bilinmeyen ek türü', 'ek türü');
	hataVerir(() => ek('', 'de'), 'boş ad');
	hataVerir(() => ek('   ', 'de'), 'boşluk ad');
	hataVerir(() => ek(null, 'de'), 'null ad');
	hataVerir(() => ek('Ankara,', 'de'), 'noktalamayla biten ad');
	// her türde: düz kesme, ek küçük harf, kıvrık kesme yok
	for (const t of TURLER)
		for (const ad of ['Ankara', 'TBMM', '1923', 'Kocaeli', 'Kemal', 'Bordeaux']) {
			const g = ek(ad, t);
			const sonEk = g.slice(ad.length);
			ok(!g.includes('’'), `${g}: kıvrık kesme`);
			ok(sonEk === turkceKucuk(sonEk), `${g}: ek büyük harfli`);
			ok(t === 'li' ? true : sonEk.startsWith("'"), `${g}: kesme yok`);
		}
	// ses bilgisi
	const sb = sesBilgisi('Kars');
	ok(sb.kalin && !sb.yuvarlak && sb.sert && !sb.unlu && sb.kaynak === 'yazilis', 'sesBilgisi(Kars) yanlış');
	ok(sesBilgisi('TBMM').kaynak === 'okunus' && sesBilgisi(1923).kaynak === 'sayi' && sesBilgisi('Kemal').inceL, 'sesBilgisi kaynakları');
	// boşluk kırpılır
	dene('  Kars ', 'de', "Kars'ta");
}

console.log(`${checks} denetim, ${fails} hata`);
if (fails) process.exitCode = 1;
