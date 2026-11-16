// Açık veri toplayıcı: Wikidata SPARQL sorgularını (sorgu/*.rq) çalıştırır, sonucu temizleyip ham/*.json üretir.
// Kullanım (oyun kökünden):  node tools/veri/getir.mjs [ilce] [kisi] [derin] [--onbellek <klasör>] [--npm <paket klasörü>]
//   ilce / kisi / derin  yalnız o bölümü üret (hiçbiri yoksa hepsi)
//   --onbellek <dir>  SPARQL yanıtlarını bu klasöre yaz; dosya varsa ağdan yeniden çekme (yalnız geliştirme için;
//                     sorgu değişince ya da Wikidata güncellenince klasörü boşaltın)
//   --npm <dir>       turkey-neighbourhoods@4.0.3 paketinin açılmış klasörü (package/ ya da package/src/data);
//                     verilmezse paket npm kayıt sunucusundan indirilip bütünlüğü (sha512) denetlenir.
// Çıktılar: ham/ilceler.json, ham/ilceler_fark.txt, ham/kisiler.json, ham/kisiler_tr.json, ham/ozet.json
// Kaynak: Wikidata (CC0). npm paketi (MIT) yalnız karşılaştırma için kullanılır, çıktıya veri aktarılmaz.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

// Node'un yerleşik fetch'i HTTPS_PROXY değişkenini ancak NODE_USE_ENV_PROXY=1 ile dinler: gerekirse kendini yeniden başlat.
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
	const r = spawnSync(process.execPath, ['--no-warnings', ...process.execArgv, fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
		stdio: 'inherit',
		env: { ...process.env, NODE_USE_ENV_PROXY: '1' },
	});
	process.exit(r.status ?? 1);
}

const KOK = dirname(fileURLToPath(import.meta.url));
const OYUN = resolve(KOK, '../..');
const SORGU = join(KOK, 'sorgu');
const HAM = join(KOK, 'ham');
const UA = 'FetihLigiVeri/0.1 (acik veri, bilgi yarismasi)';
const UC = 'https://query.wikidata.org/sparql';
const BEKLE_MS = 2000; // istekler arası bekleme

const arg = process.argv.slice(2);
const secenek = (ad) => {
	const i = arg.indexOf(ad);
	return i >= 0 ? arg[i + 1] : null;
};
const ONBELLEK = secenek('--onbellek');
const NPM_DIR = secenek('--npm');
const bolumler = arg.filter((a, i) => !a.startsWith('--') && !(i > 0 && arg[i - 1].startsWith('--')));
const yap = (b) => bolumler.length === 0 || bolumler.includes(b);

const uyu = (ms) => new Promise((r) => setTimeout(r, ms));
let sonIstek = 0;
let hizSiniri = 0; // hız sınırı nedeniyle beklenen toplam sayı
let aralik = BEKLE_MS; // istekler arası en az süre (hız sınırı görülünce uzar)

// ---------------------------------------------------------------- SPARQL
// degistir: { '#YER#': 'değer' } → sorgu metninde yer tutucuyu doldurur.
// dolu: doldurulmuş sorguyu sorgu/dolu/<anahtar>.rq'ye yaz (yeniden çalıştırılabilsin). adEk: anahtar eki.
// enCok: en çok deneme sayısı (zaman aşımında öbeği bölmek isteyen çağıran için küçük tutulur).
async function sparql(ad, degistir = {}, { dolu = false, adEk = null, enCok = 4 } = {}) {
	let metin = readFileSync(join(SORGU, ad + '.rq'), 'utf8');
	for (const [k, v] of Object.entries(degistir)) metin = metin.split(k).join(String(v));
	const ek = Object.values(degistir).map(String).join('_');
	const anahtar = ad + (adEk ? '_' + adEk : !ek ? '' : ek.length < 40 && /^[\w-]+$/.test(ek) ? '_' + ek : '_' + createHash('sha1').update(ek).digest('hex').slice(0, 10));
	if (dolu) {
		mkdirSync(join(SORGU, 'dolu'), { recursive: true });
		writeFileSync(join(SORGU, 'dolu', anahtar + '.rq'), metin);
	}
	const dosya = ONBELLEK && join(ONBELLEK, anahtar + '.json');
	if (dosya && existsSync(dosya)) return cevir(JSON.parse(readFileSync(dosya, 'utf8')));
	for (let deneme = 1; ; deneme++) {
		const gecen = Date.now() - sonIstek;
		if (gecen < aralik) await uyu(aralik - gecen);
		sonIstek = Date.now();
		const t0 = Date.now();
		let yanit, govde;
		try {
			yanit = await fetch(UC, {
				method: 'POST',
				headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({ query: metin }),
				signal: AbortSignal.timeout(90_000),
			});
			govde = await yanit.text();
		} catch (e) {
			govde = String(e.cause || e);
		}
		const sure = ((Date.now() - t0) / 1000).toFixed(1);
		if (yanit && yanit.ok) {
			let j;
			try {
				j = JSON.parse(govde);
			} catch {
				j = null; // zaman aşımında gövde yarım kalabilir
			}
			if (j) {
				console.error(`  ${anahtar}: ${j.results.bindings.length} satır (${sure} sn)`);
				if (dosya) {
					mkdirSync(ONBELLEK, { recursive: true });
					writeFileSync(dosya, govde);
				}
				return cevir(j);
			}
		}
		const kod = yanit ? yanit.status : 'ağ';
		const ret = yanit && Number(yanit.headers.get('retry-after'));
		// Hız sınırı (429 ya da WDQS'in "rate-limiting" hata sayfası): bekle, deneme hakkından düşme.
		if ((kod === 429 || /rate.?limit/i.test(govde)) && ++hizSiniri <= 60) {
			const bekle = Math.max(ret || 0, 65) * 1000;
			aralik = 61_000; // hız sınırı görüldü: bundan sonra dakikada en çok bir istek
			console.error(`  ${anahtar}: hız sınırı (${kod}), ${bekle / 1000} sn bekleniyor; sonraki istekler 61 sn arayla`);
			deneme--;
			await uyu(bekle);
			continue;
		}
		if (deneme >= enCok || (yanit && [400, 403, 404].includes(yanit.status))) throw new Error(`${anahtar}: ${kod} ${govde.slice(0, 300)}`);
		const bekle = ret ? ret * 1000 : 15000 * deneme;
		console.error(`  ${anahtar}: ${kod} (${sure} sn), ${bekle / 1000} sn sonra yeniden`);
		await uyu(bekle);
	}
}

// SPARQL JSON → düz nesneler: varlık URI'si → QID, sayılar → Number, boolean → true/false.
function cevir(j) {
	return j.results.bindings.map((b) => {
		const o = {};
		for (const [k, v] of Object.entries(b)) {
			if (v.type === 'uri') {
				const m = /^http:\/\/www\.wikidata\.org\/entity\/(Q\d+)$/.exec(v.value);
				const r = /^http:\/\/wikiba\.se\/ontology#(\w+)Rank$/.exec(v.value);
				o[k] = m ? m[1] : r ? r[1] : v.value;
			} else if (v.datatype === 'http://www.w3.org/2001/XMLSchema#boolean') o[k] = v.value === 'true';
			else if (v.datatype && /#(integer|decimal|double|float)$/.test(v.datatype)) o[k] = Number(v.value);
			else o[k] = v.value;
		}
		return o;
	});
}

const yaz = (ad, veri) => {
	mkdirSync(HAM, { recursive: true });
	writeFileSync(join(HAM, ad), typeof veri === 'string' ? veri : JSON.stringify(veri, null, '\t') + '\n');
	console.error(`→ ham/${ad}`);
};


// ---------------------------------------------------------------- yardımcılar
const trKucuk = (s) => s.toLocaleLowerCase('tr');
// Gruplama anahtarı: Türkçe küçük harf, şapka ve noktalı harf işaretleri atılır (ı/i ayrımı korunur).
const anahtarOf = (s) =>
	trKucuk(s)
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9ı]/g, '');
const sirala = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const qnum = (q) => Number(q.slice(1));
function km(a, b) {
	const R = 6371, r = Math.PI / 180;
	const dlat = (b.lat - a.lat) * r, dlon = (b.lon - a.lon) * r;
	const h = Math.sin(dlat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dlon / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(h));
}
const yilOf = (t) => (t ? Number(/^(-?\d+)/.exec(t)[1]) : null);

// ---------------------------------------------------------------- ikinci kaynak: npm turkey-neighbourhoods (MIT)
// Yalnız karşılaştırma için. Paket kodu çalıştırılmaz; tar arşivinden iki JSON dosyası okunur.
const NPM_PAKET = 'turkey-neighbourhoods';
const NPM_SURUM = '4.0.3';
const NPM_SHA512 = '1d7Az1IO7Sb9l/EcxBjaLMXs40lbPiG5Z+0ZhUL/OKbbW1hd7lrrtoz8HNKJYPSyS0QefnCbXOdTPcCY1u6X0Q==';
const NPM_DOSYALAR = ['src/data/districtsByCityCode.json', 'src/data/cityNamesByCode.json'];

function tarOku(buf, istenen) {
	const out = {};
	for (let o = 0; o + 512 <= buf.length; ) {
		const ad = buf.toString('utf8', o, o + 100).replace(/\0.*$/s, '');
		if (!ad) break;
		const boy = parseInt(buf.toString('utf8', o + 124, o + 136).replace(/\0.*$/s, '').trim(), 8) || 0;
		const yol = ad.replace(/^package\//, '');
		if (istenen.includes(yol)) out[yol] = buf.toString('utf8', o + 512, o + 512 + boy);
		o += 512 + Math.ceil(boy / 512) * 512;
	}
	return out;
}

async function npmListesi() {
	let dosyalar = {};
	if (NPM_DIR) {
		for (const d of NPM_DOSYALAR) {
			const adaylar = [join(NPM_DIR, d), join(NPM_DIR, 'package', d), join(NPM_DIR, d.replace('src/data/', ''))];
			const yol = adaylar.find(existsSync);
			if (!yol) throw new Error('npm dosyası yok: ' + d);
			dosyalar[d] = readFileSync(yol, 'utf8');
		}
	} else {
		const url = `https://registry.npmjs.org/${NPM_PAKET}/-/${NPM_PAKET}-${NPM_SURUM}.tgz`;
		const r = await fetch(url, { headers: { 'User-Agent': UA } });
		if (!r.ok) throw new Error(`${url}: ${r.status}`);
		const tgz = Buffer.from(await r.arrayBuffer());
		const h = createHash('sha512').update(tgz).digest('base64');
		if (h !== NPM_SHA512) throw new Error('npm paketi bütünlük denetiminden geçmedi');
		dosyalar = tarOku(gunzipSync(tgz), NPM_DOSYALAR);
	}
	const ilce = JSON.parse(dosyalar[NPM_DOSYALAR[0]]);
	const il = JSON.parse(dosyalar[NPM_DOSYALAR[1]]);
	const liste = [];
	for (const [kod, adlar] of Object.entries(ilce)) for (const a of adlar) liste.push({ il: il[kod], ad: a });
	return liste;
}

// ---------------------------------------------------------------- oyunun il sınırları (src/data/turkiye.json, salt okunur)
// Halkalar dünya koordinatında düz dizi: x = (lon - lon0)·cos(lat0)·K, y = (lat - lat0)·K (bkz. src/quiz/types.js, tools/harita_uret.py).
function oyunIlleri() {
	const D = JSON.parse(readFileSync(join(OYUN, 'src/data/turkiye.json'), 'utf8'));
	const { K, lon0, lat0 } = D.meta;
	const c0 = Math.cos((lat0 * Math.PI) / 180);
	const birimKm = (Math.PI / 180) * 6371 / K; // 1 dünya birimi ≈ 18.5 km
	const xy = (lat, lon) => [(lon - lon0) * c0 * K, (lat - lat0) * K];
	const icinde = (x, y, r) => {
		let ic = false;
		for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
			const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
			if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ic = !ic;
		}
		return ic;
	};
	const kenarUzak = (x, y, r) => {
		let en = Infinity;
		for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
			const ax = r[j], ay = r[j + 1], bx = r[i], by = r[i + 1];
			const dx = bx - ax, dy = by - ay;
			const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
			en = Math.min(en, Math.hypot(x - ax - t * dx, y - ay - t * dy));
		}
		return en;
	};
	const iller = D.provinces.map((p) => ({ ad: p.name, rings: p.rings, merkez: { lat: lat0 + p.center[1] / K, lon: lon0 + p.center[0] / (c0 * K) } }));
	return {
		adlar: iller.map((p) => p.ad),
		merkez: Object.fromEntries(iller.map((p) => [p.ad, p.merkez])),
		// Noktanın düştüğü il (yoksa null) ve verilen ilin sınırına uzaklığı (km; içindeyse 0).
		konum(lat, lon, ilAd) {
			const [x, y] = xy(lat, lon);
			const dustu = iller.find((p) => p.rings.some((r) => icinde(x, y, r)));
			const p = iller.find((q) => q.ad === ilAd);
			const uzak = !p ? null : dustu === p ? 0 : Math.min(...p.rings.map((r) => kenarUzak(x, y, r))) * birimKm;
			return { dustu: dustu ? dustu.ad : null, sinirKm: uzak };
		},
	};
}

// ---------------------------------------------------------------- 1) ilçeler
const YEDEK_DILLER = ['tr', 'mul', 'en', 'ceb', 'it', 'es', 'nl', 'de', 'fr', 'az'];
// Etiketten ilçe adını ayıklar: "Ceyhan (ilçe)", "Tufanbeyli ilçesi", "Güzelyurt, Aksaray", "Tillo'nun ilçesi",
// "Distretto di Kepez", "Kemer district (Antalya)" → yalın ad.
function temizAd(s) {
	let a = s.replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
	a = a.replace(/,.*$/, '').trim();
	a = a.replace(/^(distretto di|distrito de|district of|district d[e'’]|landkreis|kreis|bezirk)\s+/i, '');
	a = a.replace(/\s+(ilçesi|i̇lçesi|İlçesi|ilçe|district|distrikt|rayonu|ilce)$/iu, '');
	a = a.replace(/['’]n?[ıiuü]n$/u, '');
	return a.trim();
}


// Elle düzeltmeler: yalnız Wikidata'daki açık eksik/hatalar için, her biri gerekçeli (bkz. ham/ilceler_fark.txt).
// NOT (bağımsız denetim, 16 Kasım 2026; ham yeniden üretilmedi, düzeltme pilot üreticide):
// - Çayeli (Q117148419) ilçe öğesinde enlem ve boylam ters girilmiş (40,75 / 41,07 → Erzurum'a düşüyor); ilçe merkezi Q2248873.
// - Gebze, Finike, Akşehir, Bafra, Çamlıhemşin, Alanya, Polatlı, Enez, Tosya, İnegöl: ilçe öğesinin koordinatı ilçe merkezinden
//   8–20 km uzakta (ilçe alanının ortası ya da kaba değer). tools/veri/pilot/ilce.mjs MERKEZ_KOORD merkez öğelerinin
//   koordinatını kullanır. Ham yeniden üretilecekse ilçe merkezi (P36 başkent ya da aynı adlı kasaba öğesi) koordinatı alınmalı.
// - Kahta (Q15989053): Türkçe etiket şapkasız; resmî ve TDK yazımı Kâhta (tr.wikipedia başlığı da Kâhta). Pilot seçimde görünen ad.
const ILCE_HARIC = {
	Q116788474: 'Burmageçit bir köy/belde; ilçe sınıfına yanlış konmuş',
};
const ILCE_AD = {
	Q2205869: ['Yahyalı', 'Türkçe etiket yazım hatalı ("Yahyal İlçesi")'],
	Q2318164: ['Kahramankazan', 'Türkçe etiket eski ad ("Kazan"); 2016\'da Kahramankazan oldu'],
	Q14329111: ['Selçuklu', 'Türkçe etiket yanlış ("Selçuklular"); İngilizce etiket Selçuklu'],
	Q49103932: ['Güney', 'Türkçe etiket yanlış ("Güney Bölgesi"); İngilizce etiket "Güney district"'],
	Q49105637: ['Kulu', 'Türkçe etiket "Wikimedia yineleme sayfası"; HASC kodu TR.KO.KU ve koordinatı Kulu ilçesi'],
	Q49103426: ['Eyüpsultan', 'etiket eski ad ("Eyüp"); 2017\'de Eyüpsultan oldu'],
	Q2932699: ['Altınordu', 'Türkçe etiket "Ordu (Altınordu) ilçesi": 2012\'de merkez ilçe Altınordu adını aldı'],
	Q2641900: ['Aziziye', 'etiket eski ad ("Ilıca"); 2012\'de Aziziye oldu'],
	Q49109678: ['Tuşba', 'Türkçe etiket "Tuşpa" (Urartu kentinin adı); ilçenin resmî adı Tuşba'],
	Q1012887: ['Ereğli', 'Türkçe etiket "Karadeniz Ereğli" (yaygın ad); ilçenin resmî adı Ereğli, Konya\'da da Ereğli var'],
	Q15961692: ['Ereğli', 'Türkçe etiket "Karadeniz Ereğli ilçesi"; resmî ad Ereğli'],
};
const ILCE_IL = {
	Q141623322: ['İstanbul', 'Şile ilçe öğesinde P131 yok'],
};

const yuvarla = (v) => Math.round(v * 1e5) / 1e5;
// Koordinat seçimi: ilin (oyun) sınırı içinde ya da 5 km yakınında olan adaylar önce; aralarında medoid
// (diğer adaylara uzaklık toplamı en küçük olan). Dönen: [seçilen, en uzak adaya uzaklık km].
function koordinatSec(ks, il, oyun) {
	if (!ks.length) return [null, 0];
	const ic = ks.filter((k) => oyun.konum(k.lat, k.lon, il).sinirKm <= 5);
	const havuz = ic.length ? ic : ks;
	let koor = null, enIyi = Infinity;
	for (const a of havuz) {
		const top = ks.reduce((s, b) => s + km(a, b), 0) - (a.tercih ? 0.001 : 0);
		if (top < enIyi) (enIyi = top), (koor = a);
	}
	return [koor, Math.max(...ks.map((b) => km(koor, b)))];
}

async function ilceler() {
	const oyun = oyunIlleri();
	// İller: Wikidata Türkçe etiketi → oyundaki yazım (birebir eşleşme beklenir; fark varsa raporlanır).
	const ilAd = {};
	const ilUyari = [];
	const oyunAnahtar = new Map(oyun.adlar.map((a) => [anahtarOf(a), a]));
	for (const r of await sparql('iller')) {
		const a = oyunAnahtar.get(anahtarOf(r.ad || ''));
		if (!a) throw new Error(`il eşlenemedi: ${r.il} ${r.ad}`);
		if (a !== r.ad) ilUyari.push(`${r.il} Wikidata "${r.ad}" → oyun "${a}"`);
		ilAd[r.il] = a;
	}
	if (new Set(Object.values(ilAd)).size !== 81) throw new Error('81 il eşlenmedi');
	const buyuk = new Set((await sparql('buyuksehir')).map((r) => ilAd[r.il]));
	if (buyuk.size !== 30) console.error(`  uyarı: büyükşehir sayısı ${buyuk.size} (30 bekleniyordu)`);

	// Öğeler
	const oge = new Map();
	for (const r of await sparql('ilce_temel')) {
		if (!oge.has(r.d))
			oge.set(r.d, { qid: r.d, etiket: {}, il: new Map(), ustIlce: new Set(), koord: [], nufus: [], sl: r.sl, trwiki: null, eski: new Set() });
		const o = oge.get(r.d);
		if (r.trwiki) o.trwiki = r.trwiki;
		if (r.kapanis) o.eski.add('kapanış tarihi (P576) ' + r.kapanis.slice(0, 10));
		if (r.yerine) o.eski.add('yerine geçen birim (P1366) ' + r.yerine);
		// İlçe sınıfı deyimlerinden en az biri geçerli (kaldırılmamış, bitiş tarihsiz) olmalı.
		if (r.p31kerte !== 'Deprecated' && !r.p31bitis) o.p31Gecerli = true;
		else (o.p31Eski ||= new Set()).add(r.p31bitis ? 'ilçe sınıfı bitiş tarihi (P582) ' + r.p31bitis.slice(0, 10) : 'ilçe sınıfı deyimi kaldırılmış (deprecated)');
	}
	for (const o of oge.values()) if (!o.p31Gecerli) for (const n of o.p31Eski || []) o.eski.add(n);
	for (const r of await sparql('ilce_etiket')) if (oge.has(r.d)) (oge.get(r.d).etiket[r.dil] ||= []).push(r.etiket);
	// İl önceliği: P131 → il (tercihli 3, normal 2) > P131 → bir ilin başkenti ya da öğe ilin başkenti (1).
	const ilEkle = (o, il, p) => o.il.set(il, Math.max(o.il.get(il) || 0, p));
	for (const r of await sparql('ilce_il')) {
		const o = oge.get(r.d);
		if (!o) continue;
		if (r.tur === 'baskent') ilEkle(o, ilAd[r.hedef], 1);
		else if (r.derece === 'Deprecated' || r.bitis) continue;
		else if (r.hedefIl) ilEkle(o, ilAd[r.hedef], r.derece === 'Preferred' ? 3 : 2);
		else if (r.hedefIlce) o.ustIlce.add(r.hedef);
		else if (r.baskentIl) ilEkle(o, ilAd[r.baskentIl], 1);
	}
	for (const r of await sparql('ilce_koordinat')) oge.get(r.d)?.koord.push({ lat: r.lat, lon: r.lon, tercih: r.derece === 'Preferred' });
	for (const r of await sparql('ilce_nufus')) oge.get(r.d)?.nufus.push({ deger: r.nufus, yil: yilOf(r.tarih), tercih: r.derece === 'Preferred' });

	// Her öğe için il ve ad
	for (const o of oge.values()) {
		let iller = [...o.il.entries()];
		const enY = Math.max(0, ...iller.map((e) => e[1]));
		iller = iller.filter((e) => e[1] === enY).map((e) => e[0]);
		if (!iller.length) for (const u of o.ustIlce) for (const [i] of oge.get(u)?.il || []) iller.push(i);
		o.ilKaynak = enY >= 2 ? 'P131' : enY === 1 ? 'başkent' : iller.length ? 'üst ilçe' : null;
		if (ILCE_IL[o.qid]) (iller = [ILCE_IL[o.qid][0]]), (o.ilKaynak = 'elle: ' + ILCE_IL[o.qid][1]);
		o.ilAdaylari = [...new Set(iller)].sort(sirala);
		o.ilSec = o.ilAdaylari.length === 1 ? o.ilAdaylari[0] : null;
		// Ad: Türkçe etiket, yoksa yedek diller (en küçük sözlük sıralı etiket, kararlılık için).
		o.ad = null;
		for (const dil of YEDEK_DILLER) {
			const e = (o.etiket[dil] || []).slice().sort(sirala)[0];
			if (e) {
				o.ad = temizAd(e);
				o.adDil = dil;
				o.hamEtiket = e;
				break;
			}
		}
		if (ILCE_AD[o.qid]) (o.ad = ILCE_AD[o.qid][0]), (o.adDil = 'elle'), (o.adNot = ILCE_AD[o.qid][1]);
		if (o.ad && o.ilSec && anahtarOf(o.ad) === 'merkez') o.ad = o.ilSec; // "Merkez (Antalya)" → il adı
		// İlçe öğesi mi, kasaba/belediye öğesi mi? (etiketlerinde "ilçe/district" geçiyor mu)
		o.ilceOgesi = Object.values(o.etiket).flat().some((e) => /ilçe|district|distretto|distrito|околия|rayon/i.test(e));
	}

	// Eleme: elle dışlanan, kapatılmış/yerine geçilmiş, ilsiz, etiketsiz, büyükşehirdeki eski merkez ilçe
	const dislanan = [];
	const gecerli = [];
	for (const o of [...oge.values()].sort((a, b) => qnum(a.qid) - qnum(b.qid))) {
		const k = { qid: o.qid, ad: o.ad, etiket: o.hamEtiket || null, il: o.ilSec || o.ilAdaylari.join('/') || null, sitelinks: o.sl };
		if (ILCE_HARIC[o.qid]) dislanan.push({ ...k, neden: 'elle: ' + ILCE_HARIC[o.qid] });
		else if (o.eski.size) dislanan.push({ ...k, neden: 'eski birim: ' + [...o.eski].sort().join('; ') });
		else if (!o.ilSec) dislanan.push({ ...k, neden: o.ilAdaylari.length ? 'birden çok il' : 'il bilgisi yok (P131 eksik)' });
		else if (!o.ad) dislanan.push({ ...k, neden: 'hiçbir dilde etiket yok' });
		else if (buyuk.has(o.ilSec) && anahtarOf(o.ad) === anahtarOf(o.ilSec))
			dislanan.push({ ...k, neden: 'büyükşehirde 2013\'te kaldırılmış eski merkez ilçe' });
		else gecerli.push(o);
	}

	// Aynı ilde aynı adı taşıyan öğeler tek ilçedir (ilçe öğesi + kasaba öğesi, ya da yinelenen öğe).
	const grup = new Map();
	for (const o of gecerli) {
		const k = o.ilSec + '|' + anahtarOf(o.ad);
		if (!grup.has(k)) grup.set(k, []);
		grup.get(k).push(o);
	}

	// trwiki sayfası ilçe öğelerinde yoksa: ilçe öğesinin başkenti (P36) ya da aynı ilde aynı adlı kasaba öğesi.
	const baskent = new Map();
	for (const r of await sparql('ilce_baskent')) if (r.trwiki) (baskent.get(r.d) || baskent.set(r.d, []).get(r.d)).push(r);
	const kasaba = new Map();
	for (const r of await sparql('ilce_kasaba')) {
		const il = ilAd[r.il];
		// Başlık biçimleri: "Ad", "Ad, İl", "Ad, Ad", "Ad (ilçe)", "Ad (İl)"; "Gökçeada (ada)" gibi başka nesneler alınmaz.
		const m = /^([^,(]+?)(?:, ([^,]+)| \(([^)]+)\))?$/.exec(r.trwiki);
		if (!m) continue;
		const ek = m[2] || m[3];
		if (ek && !(anahtarOf(ek) === anahtarOf(il) || anahtarOf(ek) === anahtarOf(m[1]) || /ilçe/i.test(ek))) continue;
		const k = il + '|' + anahtarOf(m[1]);
		(kasaba.get(k) || kasaba.set(k, []).get(k)).push(r);
	}

	const ilceler = [];
	const nufusSorunlu = new Set();
	for (const [gk, og] of grup) {
		// Temsilci: trwiki sayfası olan, sonra en çok site bağlantılı, sonra en küçük QID.
		og.sort((a, b) => !!b.trwiki - !!a.trwiki || b.sl - a.sl || qnum(a.qid) - qnum(b.qid));
		const t = og[0];
		const adO = og.find((o) => o.adDil === 'elle') || og.find((o) => o.adDil === 'tr') || t;
		const [koor, yayilim] = koordinatSec(og.flatMap((o) => o.koord.map((k) => ({ ...k, qid: o.qid }))), t.ilSec, oyun);
		// Nüfus: önce adında "ilçe/district" geçen öğelerden, en son yıllı değer.
		// Tam sayı olmayan ya da 1.000'den küçük değerler atlanır (ör. "44.004": binlik ayırıcı ondalık sanılmış).
		const nufusSec = (liste) => {
			const n = liste.flatMap((o) => o.nufus.map((x) => ({ ...x, qid: o.qid }))).filter((x) => x.yil);
			for (const x of n) if (!Number.isInteger(x.deger) || x.deger < 1000) nufusSorunlu.add(`${t.ilSec}/${adO.ad} ${x.qid}: ${x.deger} (${x.yil})`);
			n.splice(0, n.length, ...n.filter((x) => Number.isInteger(x.deger) && x.deger >= 1000));
			n.sort((a, b) => b.yil - a.yil || b.tercih - a.tercih || b.deger - a.deger);
			return n[0] || null;
		};
		const ilceOg = og.filter((o) => o.ilceOgesi);
		let nf = nufusSec(ilceOg), kapsam = 'ilçe';
		if (!nf) (nf = nufusSec(og)), (kapsam = og.length === 1 ? 'ilçe ya da kasaba (tek öğe)' : 'kasaba öğesinden, ilçe nüfusu olmayabilir');
		// trwiki
		let trw = og.find((o) => o.trwiki)?.trwiki || null, trwQid = og.find((o) => o.trwiki)?.qid || null;
		if (!trw) {
			const c = og.flatMap((o) => baskent.get(o.qid) || []).concat(kasaba.get(gk) || []).filter((r) => !og.some((o) => o.qid === r.t));
			c.sort((a, b) => b.sl - a.sl || qnum(a.t) - qnum(b.t));
			if (c[0]) (trw = c[0].trwiki), (trwQid = c[0].t);
		}
		const kayit = {
			qid: t.qid,
			ad: adO.ad,
			il: t.ilSec,
			lat: koor ? yuvarla(koor.lat) : null,
			lon: koor ? yuvarla(koor.lon) : null,
			nufus: nf ? { deger: nf.deger, yil: nf.yil, qid: nf.qid, kapsam } : null,
			trwiki: !!trw,
			trwikiBaslik: trw,
			trwikiQid: trwQid,
			adBaskaIlde: [],
			merkez: anahtarOf(adO.ad) === anahtarOf(t.ilSec),
			qidler: og.map((o) => o.qid).sort((a, b) => qnum(a) - qnum(b)),
		};
		if (adO.adDil !== 'tr') kayit.adKaynak = adO.adDil === 'elle' ? 'elle: ' + adO.adNot : `${adO.adDil} etiketi "${adO.hamEtiket}"`;
		const ilK = og.find((o) => o.ilKaynak !== 'P131')?.ilKaynak;
		if (ilK && !og.some((o) => o.ilKaynak === 'P131')) kayit.ilKaynak = ilK;
		if (yayilim > 25) kayit.koordinatYayilimKm = Math.round(yayilim);
		ilceler.push(kayit);
	}

	// İlçe öğelerinde koordinat yoksa ya da koordinat ilin 25 km'den fazla dışındaysa (başka ilçenin koordinatı
	// kopyalanmış olabilir): trwiki sayfasının bağlı olduğu kasaba/şehir öğesinin koordinatı (ilin içindeyse).
	const disari = (x) => x.lat == null || oyun.konum(x.lat, x.lon, x.il).sinirKm > 25;
	const koorsuz = ilceler.filter((x) => x.trwikiQid && disari(x));
	if (koorsuz.length) {
		const qs = [...new Set(koorsuz.map((x) => x.trwikiQid))].sort((a, b) => qnum(a) - qnum(b));
		const satir = await sparql('ilce_ek_koordinat', { '#QIDLER#': qs.map((q) => 'wd:' + q).join(' ') }, { dolu: true });
		for (const x of koorsuz) {
			const [k] = koordinatSec(satir.filter((r) => r.t === x.trwikiQid).map((r) => ({ lat: r.lat, lon: r.lon, tercih: r.derece === 'Preferred', qid: r.t })), x.il, oyun);
			if (!k) continue;
			if (x.lat != null) {
				if (oyun.konum(k.lat, k.lon, x.il).sinirKm > 5) continue;
				x.koordinatDuzeltme = `ilçe öğesindeki ${x.lat}, ${x.lon} ilin ${Math.round(oyun.konum(x.lat, x.lon, x.il).sinirKm)} km dışında; kasaba öğesinin koordinatı alındı`;
			}
			(x.lat = yuvarla(k.lat)), (x.lon = yuvarla(k.lon)), (x.koordinatKaynak = 'kasaba öğesi ' + k.qid);
		}
	}

	// Hâlâ trwiki sayfası bulunamayanlar: başlıkla ara ("Ad, İl" > "Ad (ilçe)" > "Ad").
	// "Ad" başlığı ancak sayfanın öğesi P131 ile bu ilçeye/ile/il merkezine bağlıysa ya da koordinatı ilçeye 25 km'den yakınsa kabul edilir.
	const ilQid = Object.fromEntries(Object.entries(ilAd).map(([q, a]) => [a, q]));
	const eksik = ilceler.filter((x) => !x.trwiki);
	if (eksik.length) {
		const adaylar = (x) => [`${x.ad}, ${x.il}`, `${x.ad} (ilçe)`, x.ad];
		const basliklar = [...new Set(eksik.flatMap(adaylar))].sort(sirala).map((b) => JSON.stringify(b) + '@tr');
		const satir = await sparql('ilce_trwiki_baslik', { '#BASLIKLAR#': basliklar.join(' ') }, { dolu: true });
		for (const x of eksik) {
			const ab = adaylar(x);
			const uygun = satir.filter((r) => {
				const sira = ab.indexOf(r.baslik);
				if (sira < 0 || r.anlam || x.qidler.includes(r.t)) return false;
				if (sira < 2) return true;
				const bagli = x.qidler.includes(r.ust) || r.ust === ilQid[x.il] || r.ustIl === ilQid[x.il];
				const yakin = r.lat != null && x.lat != null && km(r, x) < 25;
				return bagli || yakin;
			});
			uygun.sort((a, b) => ab.indexOf(a.baslik) - ab.indexOf(b.baslik) || b.sl - a.sl || qnum(a.t) - qnum(b.t));
			if (uygun[0]) (x.trwiki = true), (x.trwikiBaslik = uygun[0].baslik), (x.trwikiQid = uygun[0].t);
		}
	}
	return { ilceler, dislanan, ilUyari, buyuk, oyun, nufusSorunlu: [...nufusSorunlu].sort(sirala) };
}


// Türkçe sayıları yazıya çevir (1–99): "19 Mayıs" ~ "Ondokuzmayıs" karşılaştırması için.
function sayiYazi(n) {
	const b = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
	const o = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
	return n < 100 ? o[Math.floor(n / 10)] + b[n % 10] : String(n);
}
const gevsekAnahtar = (s) => anahtarOf(s.replace(/\d+/g, (d) => sayiYazi(Number(d))));
// Aynı ad denetimi için anahtar: Türkçe küçük harf, şapka ve boşluk atılır (ç/ş/ğ/ö/ü/ı korunur).
const adAnahtar = (s) => trKucuk(s).replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u').replace(/[^\p{L}\p{N}]/gu, '');

async function ilceBolumu() {
	const { ilceler: L, dislanan, ilUyari, buyuk, oyun, nufusSorunlu } = await ilceler();
	L.sort((a, b) => sirala(a.il, b.il) || sirala(a.ad, b.ad) || qnum(a.qid) - qnum(b.qid));

	// Aynı ad: aynı adı taşıyan başka ilçelerin illeri ("hangi ilde?" sorusunda kullanılamaz).
	const adlar = new Map();
	for (const x of L) (adlar.get(adAnahtar(x.ad)) || adlar.set(adAnahtar(x.ad), []).get(adAnahtar(x.ad))).push(x);
	for (const x of L) x.adBaskaIlde = [...new Set(adlar.get(adAnahtar(x.ad)).filter((y) => y !== x).map((y) => y.il))].sort(sirala);

	// Koordinat denetimi: oyunun il çokgenleri (src/data/turkiye.json, Natural Earth, sadeleştirilmiş).
	// İçinde değilse ve ilin sınırına > 5 km ise şüpheli; ayrıca oyundaki il merkezine > 250 km ise işaretli.
	for (const x of L) {
		const k = oyun.konum(x.lat, x.lon, x.il);
		const merkezKm = Math.round(km(x, oyun.merkez[x.il]));
		const n = [];
		if (k.sinirKm > 5) n.push(`il sınırının ${Math.round(k.sinirKm)} km dışında` + (k.dustu ? ` (${k.dustu} içinde)` : ' (denizde/yurt dışında)'));
		if (merkezKm > 250) n.push(`il merkezine ${merkezKm} km`);
		if (n.length) x.koordinatSupheli = n.join('; ');
		else if (k.sinirKm > 0) x.koordinatNot = `sınıra ${k.sinirKm.toFixed(1)} km (kıyı/sınır sadeleştirmesi)`;
	}

	// İkinci kaynak: npm turkey-neighbourhoods. npm'de il merkezi ilçesi "Merkez" diye geçer.
	const npm = await npmListesi();
	const satirlar = [];
	const p = (...a) => satirlar.push(a.join(''));
	p('# Wikidata ilçe listesi ile ikinci kaynağın karşılaştırması');
	p(`# İkinci kaynak: npm ${NPM_PAKET}@${NPM_SURUM} (MIT lisanslı; src/data/districtsByCityCode.json). Yalnız karşılaştırma için.`);
	p('# Üreten: tools/veri/getir.mjs. npm\'de 51 ilin merkez ilçesi "Merkez" adıyla geçer; il adını taşıyan ilçeyle eşlenir.');
	p('');
	p(`Toplam: Wikidata ${L.length}, npm ${npm.length}`);
	const sayW = {}, sayN = {};
	for (const x of L) sayW[x.il] = (sayW[x.il] || 0) + 1;
	for (const x of npm) sayN[x.il] = (sayN[x.il] || 0) + 1;
	const ilFark = Object.keys({ ...sayW, ...sayN }).sort(sirala).filter((i) => sayW[i] !== sayN[i]);
	p(`İl başına sayı farkı: ${ilFark.length ? ilFark.map((i) => `${i} (Wikidata ${sayW[i] || 0}, npm ${sayN[i] || 0})`).join(', ') : 'yok'}`);
	const npmIlleri = new Set(npm.map((x) => x.il));
	const ilAdFark = [...npmIlleri].filter((i) => !oyun.adlar.includes(i));
	p(`İl adı yazımı (npm ↔ oyun): ${ilAdFark.length ? ilAdFark.join(', ') : 'birebir aynı (81 il)'}`);
	p(`İl adı yazımı (Wikidata ↔ oyun): ${ilUyari.length ? ilUyari.join('; ') : 'birebir aynı (81 il)'}`);
	p('');
	const kalanN = new Set(npm);
	const kalanW = new Set(L);
	const eslesme = [];
	const esle = (kural, fW, fN) => {
		for (const w of [...kalanW])
			for (const n of kalanN)
				if (w.il === n.il && fW(w) === fN(n)) {
					eslesme.push({ w, n, kural });
					kalanW.delete(w);
					kalanN.delete(n);
					break;
				}
	};
	esle('aynı', (w) => w.ad, (n) => n.ad);
	esle('merkez', (w) => (w.merkez ? 'Merkez' : '\0'), (n) => n.ad);
	esle('yazım', (w) => gevsekAnahtar(w.ad), (n) => gevsekAnahtar(n.ad));
	const yazim = eslesme.filter((e) => e.kural === 'yazım');
	const farkSay = yazim.length + kalanW.size + kalanN.size;
	p(`FARK SAYISI: ${farkSay} (yazım ${yazim.length}, yalnız Wikidata'da ${kalanW.size}, yalnız npm'de ${kalanN.size})`);
	p(`Eşleşen: ${eslesme.filter((e) => e.kural === 'aynı').length} birebir, ${eslesme.filter((e) => e.kural === 'merkez').length} merkez ilçe`);
	p('');
	p('## Yazım farkı (aynı ilçe, farklı yazılmış): il | Wikidata | npm | Wikidata QID');
	for (const e of yazim) p(`${e.w.il} | ${e.w.ad} | ${e.n.ad} | ${e.w.qid}`);
	p('');
	p("## Yalnız Wikidata'da: il | ad | QID");
	for (const w of kalanW) p(`${w.il} | ${w.ad} | ${w.qid}`);
	p('');
	p("## Yalnız npm'de: il | ad");
	for (const n of kalanN) p(`${n.il} | ${n.ad}`);
	p('');
	p('## Elle düzeltilen Wikidata kayıtları (getir.mjs: ILCE_AD, ILCE_IL, ILCE_HARIC); karşılaştırmada ortaya çıktı');
	for (const [q, [a, g]] of Object.entries(ILCE_AD)) p(`ad   ${q} → ${a}: ${g}`);
	for (const [q, [i, g]] of Object.entries(ILCE_IL)) p(`il   ${q} → ${i}: ${g}`);
	for (const [q, g] of Object.entries(ILCE_HARIC)) p(`hariç ${q}: ${g}`);
	p('');
	p(`## "district of Turkey" (Q1147395) sınıfındaki öğe sayısı ve 973'e iniş`);
	const ogeSay = L.reduce((s, x) => s + x.qidler.length, 0) + dislanan.length;
	p(`Sınıftaki öğe: ${ogeSay}; dışlanan: ${dislanan.length}; aynı ilde aynı adlı öğe birleştirmesi: ${L.reduce((s, x) => s + x.qidler.length - 1, 0)} öğe → ${L.length} ilçe`);
	p(`Büyükşehir illeri (${buyuk.size}): ${[...buyuk].sort(sirala).join(', ')}`);
	p('');
	p('## Dışlanan öğeler: QID | etiket | il | site bağlantısı | neden');
	for (const d of dislanan) p(`${d.qid} | ${d.etiket ?? '-'} | ${d.il ?? '-'} | ${d.sitelinks} | ${d.neden}`);
	p('');
	p('## Birden çok öğeden birleştirilen ilçeler (ilçe öğesi + kasaba öğesi ya da yinelenen öğe): il | ad | QID\'ler');
	for (const x of L.filter((x) => x.qidler.length > 1)) p(`${x.il} | ${x.ad} | ${x.qidler.join(', ')}`);
	p('');
	p('## Atlanan nüfus değerleri (tam sayı değil ya da 1.000\'den küçük): il/ilçe öğe: değer (yıl)');
	for (const n of nufusSorunlu) p(n);
	yaz('ilceler_fark.txt', satirlar.join('\n') + '\n');

	const cikti = L.map((x) => {
		const o = { qid: x.qid, ad: x.ad, il: x.il, lat: x.lat, lon: x.lon, nufus: x.nufus, trwiki: x.trwiki ? 'var' : 'yok', trwikiBaslik: x.trwikiBaslik, adBaskaIlde: x.adBaskaIlde };
		if (x.merkez) o.merkez = true;
		for (const k of ['koordinatSupheli', 'koordinatNot', 'koordinatKaynak', 'koordinatDuzeltme', 'koordinatYayilimKm', 'adKaynak', 'ilKaynak']) if (x[k] != null) o[k] = x[k];
		o.qidler = x.qidler;
		return o;
	});
	yaz('ilceler.json', cikti);
	return {
		ikinciKaynak: `npm ${NPM_PAKET}@${NPM_SURUM} (MIT)`,
		ilceSayisi: L.length,
		ayniAdliIlce: L.filter((x) => x.adBaskaIlde.length).length,
		ayniAdSayisi: [...adlar.values()].filter((v) => new Set(v.map((x) => x.il)).size > 1).length,
		npmFark: farkSay,
		npmFarkOrnek: [...yazim.map((e) => `yazım: ${e.w.il}/${e.w.ad} ↔ npm ${e.n.ad}`), ...[...kalanW].map((w) => `yalnız WD: ${w.il}/${w.ad}`), ...[...kalanN].map((n) => `yalnız npm: ${n.il}/${n.ad}`)].slice(0, 10),
		koordinatSupheli: L.filter((x) => x.koordinatSupheli).map((x) => `${x.il}/${x.ad} (${x.qid}): ${x.koordinatSupheli}`),
		koordinatDuzeltilen: L.filter((x) => x.koordinatDuzeltme).map((x) => `${x.il}/${x.ad} (${x.qid}): ${x.koordinatDuzeltme}`),
		sinirDagilimi: (() => {
			const d = { ic: 0, '0-5': 0, '5-10': 0, '10-25': 0, '25+': 0 };
			for (const x of L) {
				const k = oyun.konum(x.lat, x.lon, x.il).sinirKm;
				d[k === 0 ? 'ic' : k <= 5 ? '0-5' : k <= 10 ? '5-10' : k <= 25 ? '10-25' : '25+']++;
			}
			return d;
		})(),
		trwikiYok: L.filter((x) => !x.trwiki).map((x) => `${x.il}/${x.ad}`),
		nufusVar: L.filter((x) => x.nufus).length,
		nufusSorunlu,
		elleAd: Object.keys(ILCE_AD).length,
		dislanan: dislanan.length,
	};
}


// ---------------------------------------------------------------- 2) kişiler
const KISI_SINIR = 5000; // genel listede en çok
const KISI_SL = 40; // genel liste site bağlantısı eşiği
const TR_SL = 15; // Türkiye/Osmanlı vatandaşları için eşik
const TR_ULKE = { Q43: 'Türkiye', Q12560: 'Osmanlı İmparatorluğu' };
// Site bağlantısı bantları (yukarıdan aşağı). En üst bandın sınırı insanlar için ulaşılmayacak kadar yüksek.
const BANTLAR = [[150, 1000], [120, 149], [100, 119], [90, 99], [80, 89], [74, 79], [68, 73], [63, 67], [59, 62], [55, 58], [52, 54], [49, 51], [46, 48], [44, 45], [42, 43], [40, 41]];
const OBEK = 200; // ayrıntı sorgusunda bir öbekteki kişi sayısı (zaman aşımında ikiye bölünür)
// P1480 (kaynak durumu) nitelikleri. Belirsizlik bildirenler değeri tartışmalı yapar; takvim notları yapmaz (gün kayabilir, yıl çoğunlukla değil).
const BELIRSIZLIK = {
	Q5727902: 'yaklaşık (circa)',
	Q60070514: 'yaklaşık',
	Q18122778: 'muhtemelen',
	Q56644435: 'muhtemelen',
	Q30230067: 'olası',
	Q18912752: 'tartışmalı',
	Q28831311: 'doğrulanmamış',
	Q21096985: 'hesap hatası',
};
const TAKVIM_NOTU = {
	Q26877139: 'takvim belirtilmemiş, Gregoryen varsayıldı',
	Q26877143: 'takvim belirtilmemiş, Jülyen varsayıldı',
	Q18195782: 'takvim belirtilmemiş',
	Q27055388: 'Jülyen ve Gregoryen tarih birlikte verilmiş',
	Q38173183: 'Jülyen tarih verilmiş',
	Q106419137: 'Hicri tarih verilmiş',
	Q1130275: 'İsveç takvimi',
	Q26961029: '1584 öncesi Gregoryen tarih',
	Q712144: 'fiilî (de facto)',
};
// cevir() varlık adreslerini QID'ye kısaltır ("http://www.wikidata.org/entity/Q1985786" → "Q1985786"); karşılaştırma QID ile.
// HATA DÜZELTMESİ (bağımsız denetim, 16 Kasım 2026): burada tam adres yazılıydı, eşleşme hiç tutmadı ve Jülyen tarihler
// geri çevrilmedi. ham/kisiler*.json bu hatayla üretildi: Aralık sonunda Jülyen takvimle doğanların yılı bir fazla
// (Johannes Kepler 27 Aralık 1571 → 1572, Jacques Cartier 31 Aralık 1491 → 1492). Ham yeniden üretilene dek bu kişiler
// pilot seçiminden (tools/veri/pilot/kisi_secim.txt) çıkarıldı.
const JULYEN = 'Q1985786';

// WDQS zaman değerini Gregoryen'e çevrilmiş verir. Değer Jülyen takvimiyle girilmişse girildiği takvime geri çevrilir
// (Wikidata arayüzünde görünen yıl; ör. Newton 25 Aralık 1642 Jülyen = 4 Ocak 1643 Gregoryen). jdn: Gregoryen gün numarası.
// Yalnız gün hassasiyetinde çevrilir; daha kaba değerlerde yıl zaten değişmez.
function tarihCoz(z, takvim, hassasiyet) {
	const m = /^(-?)(\d+)-(\d\d)-(\d\d)/.exec(z);
	if (!m) return null;
	const y = (m[1] ? -1 : 1) * Number(m[2]), ay = Number(m[3]), gun = Number(m[4]);
	const a = Math.floor((14 - ay) / 12), y2 = y + 4800 - a, m2 = ay + 12 * a - 3;
	const jdn = gun + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
	if (takvim !== JULYEN || hassasiyet < 11) return { yil: y, ay, gun, jdn };
	const c = jdn + 32082, d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor((1461 * d) / 4), mm = Math.floor((5 * e + 2) / 153);
	return { yil: d - 4800 + Math.floor(mm / 10), ay: mm + 3 - 12 * Math.floor(mm / 10), gun: e - Math.floor((153 * mm + 2) / 5) + 1, jdn };
}
// İki tarih değeri ortak hassasiyette aynı mı? (yıl 9, ay 10, gün 11; onyıl 8, yüzyıl 7, binyıl 6)
function uyumlu(a, b) {
	const h = Math.min(a.hassasiyet, b.hassasiyet);
	if (h >= 9 && a.t.yil !== b.t.yil) return false;
	if (h >= 10 && a.t.ay !== b.t.ay) return false;
	if (h >= 11 && a.t.gun !== b.t.gun) return false;
	if (h === 8) return Math.floor(a.t.yil / 10) === Math.floor(b.t.yil / 10);
	if (h === 7) return Math.floor((a.t.yil - 1) / 100) === Math.floor((b.t.yil - 1) / 100);
	if (h < 7) return Math.floor((a.t.yil - 1) / 1000) === Math.floor((b.t.yil - 1) / 1000);
	return true;
}
const gunSayisi = (t) => t.jdn;

// Bir tarih özelliğinin (doğum/ölüm) değerlerinden en iyisini seç ve çelişkileri bul.
function tarihSec(degerler) {
	const v = degerler.filter((d) => d.t);
	if (!v.length) return { secilen: null, nedenler: [], notlar: [], farkli: [] };
	const enIyiKerte = v.some((d) => d.derece === 'Preferred') ? v.filter((d) => d.derece === 'Preferred') : v;
	let aday = enIyiKerte.filter((d) => d.hassasiyet >= 9);
	const nedenler = new Set();
	if (!aday.length && v.some((d) => d.hassasiyet >= 9)) {
		aday = v.filter((d) => d.hassasiyet >= 9);
		nedenler.add('en iyi kerteli değer yıldan kaba, daha kesin değer alt kertede');
	}
	aday.sort((a, b) => b.hassasiyet - a.hassasiyet || a.t.yil - b.t.yil || a.t.ay - b.t.ay || a.t.gun - b.t.gun);
	const secilen = aday[0] || null;
	// Ayrık değerler (aynı tarih + hassasiyet tek sayılır)
	const ayri = [];
	for (const d of v) if (!ayri.some((x) => x.zaman === d.zaman && x.hassasiyet === d.hassasiyet)) ayri.push(d);
	for (let i = 0; i < ayri.length; i++)
		for (let j = i + 1; j < ayri.length; j++) {
			const a = ayri[i], b = ayri[j];
			if (uyumlu(a, b)) continue;
			const h = Math.min(a.hassasiyet, b.hassasiyet);
			const takvimFarkli = a.takvim !== b.takvim;
			if (takvimFarkli && h >= 11 && Math.abs(gunSayisi(a.t) - gunSayisi(b.t)) <= 15) nedenler.add('Jülyen/Gregoryen takvim farkı (aynı gün)');
			else if (h >= 9 && a.t.yil !== b.t.yil) nedenler.add(takvimFarkli && Math.abs(a.t.yil - b.t.yil) === 1 ? 'farklı yıllar (takvim modelleri farklı: Jülyen/Gregoryen olabilir)' : 'farklı yıllar');
			else if (h < 9) nedenler.add('farklı onyıl/yüzyıl');
			else nedenler.add('aynı yıl, farklı ay/gün');
		}
	const notlar = new Set();
	if (secilen)
		for (const n of secilen.nitelik)
			if (BELIRSIZLIK[n]) nedenler.add('P1480: ' + BELIRSIZLIK[n]);
			else notlar.add('P1480: ' + (TAKVIM_NOTU[n] || n));
	const yaz1 = (d) => {
		const y = String(d.t.yil) + (d.hassasiyet >= 10 ? '-' + String(d.t.ay).padStart(2, '0') : '') + (d.hassasiyet >= 11 ? '-' + String(d.t.gun).padStart(2, '0') : '');
		return y + (d.hassasiyet < 9 ? ` (hassasiyet ${d.hassasiyet})` : '') + (d.takvim === JULYEN ? ' (Jülyen)' : '') + (d.derece === 'Preferred' ? ' *' : '');
	};
	const farkli = ayri.length > 1 ? ayri.map(yaz1) : [];
	return { secilen, nedenler: [...nedenler].sort(sirala), notlar: [...notlar].sort(sirala), farkli: farkli.sort(sirala) };
}

// #QIDLER# yer tutuculu bir sorguyu öbekler hâlinde çalıştır; zaman aşımında öbeği ikiye böl.
// Her öbek için isle(öbek, satırlar) çağrılır. Öbekler QID sırasıyla, kararlı biçimde kurulur.
async function obekli(sorgu, qids, boyut, isle) {
	qids = qids.filter((q) => /^Q\d+$/.test(q));
	const kuyruk = [];
	for (let i = 0; i < qids.length; i += boyut) kuyruk.push(qids.slice(i, i + boyut));
	while (kuyruk.length) {
		const obek = kuyruk.shift().slice().sort((a, b) => qnum(a) - qnum(b));
		const adEk = obek[0] + '_' + obek.length;
		let satir;
		try {
			satir = await sparql(sorgu, { '#QIDLER#': obek.map((q) => 'wd:' + q).join(' ') }, { dolu: true, adEk, enCok: 2 });
		} catch (e) {
			if (obek.length < 10) throw e;
			console.error(`  öbek bölünüyor (${obek.length}): ${String(e.message).slice(0, 80)}`);
			kuyruk.unshift(obek.slice(0, obek.length >> 1), obek.slice(obek.length >> 1));
			continue;
		}
		isle(obek, satir);
	}
}

// Kişi ayrıntılarını getir (depo: QID → ayrıntı).
async function kisiDetay(qids, depo) {
	await obekli('kisi_detay', qids.filter((q) => !depo.has(q)), OBEK, (obek, satir) => {
		for (const q of obek) depo.set(q, { etiket: {}, aciklama: {}, trwiki: null, dogum: new Map(), olum: new Map(), meslek: new Map(), ulke: new Map() });
		for (const r of satir) {
			const k = depo.get(r.p);
			if (r.tur === 'etiket') k.etiket[r.dil] = r.metin;
			else if (r.tur === 'aciklama') k.aciklama[r.dil] = r.metin;
			else if (r.tur === 'trwiki') k.trwiki = r.metin;
			else if (r.tur === 'dogum' || r.tur === 'olum') {
				if (!k[r.tur].has(r.s)) k[r.tur].set(r.s, { zaman: r.zaman, t: tarihCoz(r.zaman, r.takvim, r.hassasiyet), hassasiyet: r.hassasiyet, takvim: r.takvim, derece: r.derece, nitelik: [] });
				if (r.nitelik && !k[r.tur].get(r.s).nitelik.includes(r.nitelik)) k[r.tur].get(r.s).nitelik.push(r.nitelik);
			} else if ((r.tur === 'meslek' || r.tur === 'ulke') && /^Q\d+$/.test(r.hedef)) {
				// "bilinmeyen değer" (somevalue) deyimleri boş düğüm döner; alınmaz.
				const m = k[r.tur];
				const eski = m.get(r.hedef);
				if (!eski || (r.derece === 'Preferred' && eski.derece !== 'Preferred')) m.set(r.hedef, { qid: r.hedef, derece: r.derece, tr: r.metin || null, en: r.enMetin || null });
			}
		}
	});
}

// Meslek sıralaması için ek diller: kişilerin bu dillerdeki açıklamaları ve mesleklerin bu dillerdeki etiketleri.
const MESLEK_DILLERI = ['de', 'fr', 'es', 'it', 'nl', 'pt'];
async function meslekVerisi(kisiQidleri, depo) {
	await obekli('kisi_aciklama', kisiQidleri, 600, (obek, satir) => {
		for (const r of satir) depo.get(r.p).aciklama[r.dil] = r.metin;
	});
	const meslekQ = [...new Set(kisiQidleri.flatMap((q) => [...depo.get(q).meslek.keys()]))].sort((a, b) => qnum(a) - qnum(b));
	const etiket = new Map(); // meslek QID → { dil: [etiket ve diğer adlar] }
	await obekli('meslek_etiket', meslekQ, 500, (obek, satir) => {
		for (const r of satir) {
			const e = etiket.get(r.m) || etiket.set(r.m, {}).get(r.m);
			(e[r.dil] ||= []).push(r.metin);
		}
	});
	for (const q of kisiQidleri) for (const m of depo.get(q).meslek.values()) m.diller = etiket.get(m.qid) || {};
}

// Kişi şartları taşıyor mu? (doğum tarihi yıl ya da daha kesin, MÖ değil) Taşımıyorsa neden.
function kisiUygun(k) {
	if (!k.dogum.size) return 'doğum tarihi yok';
	const d = tarihSec([...k.dogum.values()]);
	if (!d.secilen) return 'doğum tarihi yıldan kaba';
	if (d.secilen.t.yil <= 0) return 'MÖ doğumlu';
	return null;
}

// Meslek kişinin kaç dildeki açıklamasında geçiyor ve ortalama ne kadar başta? (tr, en ve MESLEK_DILLERI; meslek
// etiketi ya da diğer adları açıklamada alt dize olarak aranır, "Maler" → "Malerin" gibi dişil biçimler de yakalanır.)
// Dönen: { n: eşleşen dil sayısı, konum: ilk eşleşmenin açıklamadaki göreli yeri ortalaması (0 = en başta) }.
function meslekSkoru(k, m) {
	const kucuk = (s, dil) => (dil === 'tr' ? trKucuk(s) : s.toLowerCase());
	let n = 0, konum = 0;
	for (const dil of ['tr', 'en', ...MESLEK_DILLERI]) {
		const ac = k.aciklama[dil];
		if (!ac) continue;
		const adlar = [...new Set([...(dil === 'tr' && m.tr ? [m.tr] : dil === 'en' && m.en ? [m.en] : []), ...(m.diller?.[dil] || [])])].filter((e) => e.length >= 4);
		const a = kucuk(ac, dil);
		const yer = Math.min(...adlar.map((e) => a.indexOf(kucuk(e, dil))).filter((i) => i >= 0));
		if (yer !== Infinity) (n += 1), (konum += yer / a.length);
	}
	return { n, konum: n ? konum / n : 1 };
}
// Meslek belirginliği: bu mesleği taşıyan kişilerin ne kadarının açıklamasında meslek geçiyor (Laplace düzeltmeli).
// "yazar" gibi çok kişiye eklenen ama kişiyi tanımlamayan meslekler düşük, "ressam", "siyasetçi" yüksek çıkar.
function meslekBelirginligi(qids, depo) {
	const say = new Map();
	for (const q of qids)
		for (const m of depo.get(q).meslek.values()) {
			const s = say.get(m.qid) || [0, 0];
			s[0]++;
			if (meslekSkoru(depo.get(q), m).n) s[1]++;
			say.set(m.qid, s);
		}
	return new Map([...say].map(([q, [n, a]]) => [q, (a + 1) / (n + 2)]));
}

// Ayrıntıdan çıktı kaydı. belirgin: meslek QID → belirginlik (meslek sıralamasında kullanılır).
// Meslek sırası (Wikidata deyim sırasını SPARQL vermez): tercihli kerte > kişinin kaç dildeki açıklamasında geçtiği >
// açıklamada ne kadar başta geçtiği > belirginlik > küçük QID.
function kisiKaydi(qid, sl, k, belirgin) {
	const d = tarihSec([...k.dogum.values()]);
	const o = tarihSec([...k.olum.values()]);
	const tr = k.etiket.tr, en = k.etiket.en;
	let ad = tr, adKaynak = null;
	if (!ad) {
		const yedek = k.etiket.mul ? ['mul', k.etiket.mul] : k.trwiki ? ['trwiki', k.trwiki.replace(/\s*\([^)]*\)\s*$/, '')] : ['en', en];
		(ad = yedek[1]), (adKaynak = yedek[0]);
	}
	const meslekler = [...k.meslek.values()]
		.filter((m) => m.tr)
		.map((m) => ({ ...m, s: meslekSkoru(k, m) }))
		.sort(
			(a, b) =>
				(b.derece === 'Preferred') - (a.derece === 'Preferred') ||
				b.s.n - a.s.n ||
				a.s.konum - b.s.konum ||
				(belirgin.get(b.qid) || 0) - (belirgin.get(a.qid) || 0) ||
				qnum(a.qid) - qnum(b.qid),
		)
		.slice(0, 3)
		.map((m) => m.tr);
	const ulkeler = [...k.ulke.values()].sort((a, b) => (b.derece === 'Preferred') - (a.derece === 'Preferred') || qnum(a.qid) - qnum(b.qid));
	const kayit = {
		qid,
		ad,
		dogumYili: d.secilen.t.yil,
		olumYili: o.secilen ? o.secilen.t.yil : null,
		sitelinks: sl,
		meslekler,
		ulke: [...new Set(ulkeler.map((u) => u.tr || u.en).filter(Boolean))],
		aciklama: k.aciklama.tr || null,
	};
	if (d.nedenler.length) (kayit.tartismali = true), (kayit.tartismaNeden = d.nedenler);
	if (d.farkli.length) kayit.dogumDegerleri = d.farkli;
	if (d.notlar.length) kayit.dogumNot = d.notlar;
	if (o.nedenler.length) kayit.olumTartismaNeden = o.nedenler;
	if (k.olum.size && !o.secilen) kayit.olumNot = 'ölüm tarihi var ama yıldan kaba';
	// Yaşam süresi denetimi: ölüm doğumdan önce, 120 yıldan uzun ömür ya da ölüm tarihi olmadan 120 yaşı geçmiş.
	const buYil = new Date().getUTCFullYear();
	if (kayit.olumYili != null && kayit.olumYili < kayit.dogumYili) kayit.yasSupheli = 'ölüm yılı doğumdan önce';
	else if (kayit.olumYili != null && kayit.olumYili - kayit.dogumYili > 120) kayit.yasSupheli = `${kayit.olumYili - kayit.dogumYili} yıl yaşamış görünüyor`;
	else if (kayit.olumYili == null && !k.olum.size && buYil - kayit.dogumYili > 120) kayit.yasSupheli = 'ölüm tarihi yok (eksik olabilir)';
	// Türkçe etiket yoksa Wikidata Türkçe arayüzde "mul" (çok dilli) etiketi gösterir.
	if (!tr) kayit.etiketSupheli = `Türkçe etiket yok (${adKaynak} kullanıldı)` + (en && ad === en ? '; İngilizce etiketle aynı' : '');
	else if (en && tr === en) kayit.etiketSupheli = 'Türkçe etiket İngilizce etiketle aynı';
	const turk = ulkeler.filter((u) => TR_ULKE[u.qid]).map((u) => TR_ULKE[u.qid]);
	if (turk.length) kayit.turk = turk;
	kayit.trwikiBaslik = k.trwiki;
	return kayit;
}

async function kisiBolumu() {
	const depo = new Map();
	const sira = (a, b) => b.sitelinks - a.sitelinks || qnum(a.qid) - qnum(b.qid);
	// 1. geçiş: bantlar yukarıdan aşağı; şartı taşıyan kişi sayısı 5.000'i geçince (bant tamamlanmışken) dur.
	const dislanan = {};
	const genelSl = new Map();
	let sonBant = null;
	for (const [alt, ust] of BANTLAR) {
		const sl = Array.from({ length: ust - alt + 1 }, (_, i) => alt + i);
		const aday = await sparql('kisi_bant', { '#SL#': sl.join(' ') }, { dolu: true, adEk: `${alt}_${ust}` });
		await kisiDetay([...new Set(aday.map((r) => r.p))], depo);
		for (const r of aday) {
			const neden = kisiUygun(depo.get(r.p));
			if (neden) dislanan[neden] = (dislanan[neden] || 0) + 1;
			else genelSl.set(r.p, r.sl);
		}
		sonBant = [alt, ust];
		console.error(`  bant ${alt}–${ust}: ${aday.length} aday, toplam uygun ${genelSl.size}`);
		if (genelSl.size >= KISI_SINIR || alt <= KISI_SL) break;
	}
	// Türk kişileri: eşik 15
	const trSl = new Map((await sparql('kisi_tr')).map((r) => [r.p, r.sl]));
	await kisiDetay([...trSl.keys()], depo);
	const trDislanan = {};
	for (const [q] of trSl) {
		const neden = kisiUygun(depo.get(q));
		if (neden) (trDislanan[neden] = (trDislanan[neden] || 0) + 1), trSl.delete(q);
	}

	// 2. geçiş: başka dillerdeki açıklamalar ve meslek etiketleri, meslek belirginliği (iki listedeki tüm uygun kişilerden), kayıtlar
	const tumu = [...new Set([...genelSl.keys(), ...trSl.keys()])].sort((a, b) => qnum(a) - qnum(b));
	await meslekVerisi(tumu, depo);
	const belirgin = meslekBelirginligi(tumu, depo);
	const genel = [...genelSl].map(([q, sl]) => kisiKaydi(q, sl, depo.get(q), belirgin)).sort(sira);
	const kisiler = genel.slice(0, KISI_SINIR);
	yaz('kisiler.json', kisiler);
	const trListe = [...trSl].map(([q, sl]) => kisiKaydi(q, sl, depo.get(q), belirgin)).sort(sira);
	yaz('kisiler_tr.json', trListe);

	const say = (L, f) => L.filter(f).length;
	return {
		kisiSayisi: kisiler.length,
		esikSitelinks: kisiler.length ? kisiler[kisiler.length - 1].sitelinks : null,
		sonBant,
		uygunToplam: genel.length,
		dislanan,
		turkGenelListede: say(kisiler, (k) => k.turk),
		turkGenelListedeOsmanli: say(kisiler, (k) => k.turk?.includes('Osmanlı İmparatorluğu')),
		trListeSayisi: trListe.length,
		trListe40ve_uzeri: say(trListe, (k) => k.sitelinks >= KISI_SL),
		trDislanan,
		tartismali: say(kisiler, (k) => k.tartismali),
		tartismaliYil: say(kisiler, (k) => k.tartismaNeden?.some((n) => n.startsWith('farklı yıllar'))),
		trTartismaliYil: say(trListe, (k) => k.tartismaNeden?.some((n) => n.startsWith('farklı yıllar'))),
		tartismaNedenleri: kisiler.flatMap((k) => k.tartismaNeden || []).reduce((a, n) => ((a[n] = (a[n] || 0) + 1), a), {}),
		birdenCokDogumDegeri: say(kisiler, (k) => k.dogumDegerleri),
		trTartismali: say(trListe, (k) => k.tartismali),
		etiketYok: say(kisiler, (k) => k.etiketSupheli?.startsWith('Türkçe etiket yok')),
		etiketYokMulVar: say(kisiler, (k) => k.etiketSupheli?.startsWith('Türkçe etiket yok (mul')),
		etiketIngilizceAyni: say(kisiler, (k) => k.etiketSupheli === 'Türkçe etiket İngilizce etiketle aynı'),
		etiketYokVeIngilizceAyni: say(kisiler, (k) => k.etiketSupheli?.startsWith('Türkçe etiket yok') && k.etiketSupheli.includes('aynı')),
		trEtiketYok: say(trListe, (k) => k.etiketSupheli?.startsWith('Türkçe etiket yok')),
		trEtiketIngilizceAyni: say(trListe, (k) => k.etiketSupheli === 'Türkçe etiket İngilizce etiketle aynı'),
		etiketSupheliOrnek: kisiler.filter((k) => k.etiketSupheli).slice(0, 8).map((k) => `${k.qid} ${k.ad}: ${k.etiketSupheli}`),
		tartismaliOrnek: kisiler.filter((k) => k.tartismali).slice(0, 8).map((k) => `${k.qid} ${k.ad} ${k.dogumYili}: ${k.tartismaNeden.join(', ')} [${(k.dogumDegerleri || []).join(' | ')}]`),
		yasSupheli: kisiler.filter((k) => k.yasSupheli).map((k) => `${k.qid} ${k.ad} (${k.dogumYili}–${k.olumYili ?? ''}): ${k.yasSupheli}`),
		trYasSupheli: trListe.filter((k) => k.yasSupheli).map((k) => `${k.qid} ${k.ad} (${k.dogumYili}–${k.olumYili ?? ''}): ${k.yasSupheli}`),
		meslekYok: say(kisiler, (k) => !k.meslekler.length),
		aciklamaYok: say(kisiler, (k) => !k.aciklama),
		ulkeYok: say(kisiler, (k) => !k.ulke.length),
	};
}

// ---------------------------------------------------------------- Türkiye derin (Aşama 2, aile 1)
// Dağ, göl, baraj, antik kent, kale: Wikidata'dan aday listesi. Soru olmaya değer olanı ve doğru ili elle seçilir
// (tools/veri/aile/derin_secim.txt): Wikidata'nın il bağı eksik ya da tek yanlı olabilir (Ağrı Dağı yalnız Ağrı'ya bağlı,
// Iğdır yok), sınıfı yanlış olabilir ("Karapınar Düzlüğü" dağ sınıfında). Çıktı: ham/derin.json.
const DERIN_SINIF = [
	['dag', 'Q8502', 6], // dağ
	['dag', 'Q8072', 6], // yanardağ
	['gol', 'Q23397', 6], // göl (baraj gölü dahil)
	['baraj', 'Q12323', 5], // baraj
	['antik', 'Q15661340', 6], // antik kent
	['antik', 'Q839954', 12], // arkeolojik alan (çok geniş sınıf: eşik yüksek)
	['kale', 'Q23413', 5], // kale
	['kale', 'Q57821', 5], // hisar
];
async function derinBolumu() {
	const byQ = new Map();
	for (const [tur, sinif, enaz] of DERIN_SINIF) {
		const satir = await sparql('derin_nesne', { '#SINIF#': sinif, '#ENAZ#': enaz }, { dolu: true });
		for (const r of satir) {
			const q = r.f.replace(/^.*\//, '');
			let o = byQ.get(q);
			if (!o) byQ.set(q, (o = { qid: q, tur, ad: r.ad, sl: Number(r.sl), trwiki: r.trwiki || null, lat: null, lon: null, yukseklik: [], alan: [], iller: [] }));
			const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(r.koord || '');
			if (m && o.lat == null) (o.lon = Number(m[1])), (o.lat = Number(m[2]));
			if (r.yuk != null && !o.yukseklik.includes(Number(r.yuk))) o.yukseklik.push(Number(r.yuk));
			if (r.alan != null && !o.alan.includes(Number(r.alan))) o.alan.push(Number(r.alan));
			if (r.ilAd && !o.iller.includes(r.ilAd)) o.iller.push(r.ilAd);
		}
	}
	const liste = [...byQ.values()].sort((a, b) => b.sl - a.sl || a.ad.localeCompare(b.ad, 'tr'));
	yaz('derin.json', liste);
	const say = {};
	for (const o of liste) say[o.tur] = (say[o.tur] || 0) + 1;
	return { nesne: liste.length, tur: say };
}

// ---------------------------------------------------------------- ana akış
const ozet = { uretim: new Date().toISOString().slice(0, 10), kaynak: 'Wikidata Query Service (CC0)' };
const ozetDosya = join(HAM, 'ozet.json');
if (existsSync(ozetDosya)) Object.assign(ozet, JSON.parse(readFileSync(ozetDosya, 'utf8')), { uretim: ozet.uretim });
const doluTemizle = (onek) => {
	const d = join(SORGU, 'dolu');
	if (existsSync(d)) for (const f of readdirSync(d)) if (f.startsWith(onek)) rmSync(join(d, f));
};
if (yap('ilce')) {
	doluTemizle('ilce_');
	ozet.ilce = await ilceBolumu();
}
if (yap('kisi')) {
	doluTemizle('kisi_');
	ozet.kisi = await kisiBolumu();
}
if (yap('derin')) {
	doluTemizle('derin_');
	ozet.derin = await derinBolumu();
}
yaz('ozet.json', ozet);
