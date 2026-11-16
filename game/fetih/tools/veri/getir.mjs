// Açık veri toplayıcı: Wikidata SPARQL sorgularını (sorgu/*.rq) çalıştırır, sonucu temizleyip ham/*.json üretir.
// Kullanım (oyun kökünden):  node tools/veri/getir.mjs [ilce] [kisi] [--onbellek <klasör>] [--npm <paket klasörü>]
//   ilce / kisi       yalnız o bölümü üret (ikisi de yoksa hepsi)
//   --onbellek <dir>  SPARQL yanıtlarını bu klasöre yaz; dosya varsa ağdan yeniden çekme (geliştirme için)
//   --npm <dir>       turkey-neighbourhoods@4.0.3 paketinin açılmış klasörü (package/ ya da package/src/data);
//                     verilmezse paket npm kayıt sunucusundan indirilip bütünlüğü (sha512) denetlenir.
// Çıktılar: ham/ilceler.json, ham/ilceler_fark.txt, ham/kisiler.json, ham/kisiler_tr.json, ham/ozet.json
// Kaynak: Wikidata (CC0). npm paketi (MIT) yalnız karşılaştırma için kullanılır, çıktıya veri aktarılmaz.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
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

// ---------------------------------------------------------------- SPARQL
async function sparql(ad, degistir = {}) {
	let metin = readFileSync(join(SORGU, ad + '.rq'), 'utf8');
	for (const [k, v] of Object.entries(degistir)) metin = metin.split(k).join(String(v));
	const anahtar = ad + Object.values(degistir).map((v) => '_' + v).join('');
	const dosya = ONBELLEK && join(ONBELLEK, anahtar + '.json');
	if (dosya && existsSync(dosya)) return cevir(JSON.parse(readFileSync(dosya, 'utf8')));
	for (let deneme = 1; ; deneme++) {
		const gecen = Date.now() - sonIstek;
		if (gecen < BEKLE_MS) await uyu(BEKLE_MS - gecen);
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
		if (deneme >= 4 || (yanit && [400, 403, 404].includes(yanit.status))) throw new Error(`${anahtar}: ${kod} ${govde.slice(0, 300)}`);
		const ret = yanit && Number(yanit.headers.get('retry-after'));
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


// Elle düzeltmeler: yalnız Wikidata'daki açık eksik/hatalar için, her biri gerekçeli.
const ILCE_HARIC = {}; // qid → gerekçe (district of Turkey sınıfında olup bugün ilçe olmayanlar)
const ILCE_AD = {}; // qid → doğru ad (Türkçe etiket eski ya da yanlış)

async function ilceler() {
	const oyun = oyunIlleri();
	// İller: Wikidata Türkçe etiketi → oyundaki yazım (birebir eşleşme beklenir; şapka/harf farkı varsa raporlanır).
	const ilAd = {};
	const ilUyari = [];
	const oyunAnahtar = new Map(oyun.adlar.map((a) => [anahtarOf(a), a]));
	const ilSatir = await sparql('iller');
	for (const r of ilSatir) {
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
	const al = (q) => {
		if (!oge.has(q)) oge.set(q, { qid: q, etiket: {}, il: new Map(), ustIlce: new Set(), koord: [], nufus: [], sl: 0, trwiki: null, eski: new Set() });
		return oge.get(q);
	};
	for (const r of await sparql('ilce_temel')) {
		const o = al(r.d);
		o.sl = r.sl;
		if (r.trwiki) o.trwiki = r.trwiki;
		if (r.kapanis) o.eski.add('kapanış tarihi (P576) ' + r.kapanis.slice(0, 10));
		if (r.yerine) o.eski.add('yerine geçen birim (P1366) ' + r.yerine);
		if (r.p31bitis) o.eski.add('ilçe sınıfı bitiş tarihi (P582) ' + r.p31bitis.slice(0, 10));
	}
	for (const r of await sparql('ilce_etiket')) if (oge.has(r.d)) (oge.get(r.d).etiket[r.dil] ||= []).push(r.etiket);
	for (const r of await sparql('ilce_il')) {
		const o = oge.get(r.d);
		if (!o || r.derece === 'Deprecated' || r.bitis) continue;
		if (r.hedefIl) o.il.set(ilAd[r.hedef], Math.max(o.il.get(ilAd[r.hedef]) || 0, r.derece === 'Preferred' ? 2 : 1));
		else if (r.hedefIlce) o.ustIlce.add(r.hedef);
	}
	for (const r of await sparql('ilce_koordinat')) oge.get(r.d)?.koord.push({ lat: r.lat, lon: r.lon, tercih: r.derece === 'Preferred' });
	for (const r of await sparql('ilce_nufus')) oge.get(r.d)?.nufus.push({ deger: r.nufus, yil: yilOf(r.tarih), tercih: r.derece === 'Preferred' });

	// Her öğe için il ve ad
	const dislanan = []; // { qid, ad, il, neden }
	for (const o of oge.values()) {
		// İl: en yüksek kerteli il; birden çok varsa tercihli olan. İl yoksa üst ilçenin ili.
		let iller = [...o.il.entries()];
		const enY = Math.max(0, ...iller.map((e) => e[1]));
		iller = iller.filter((e) => e[1] === enY).map((e) => e[0]);
		if (!iller.length) for (const u of o.ustIlce) for (const [i] of oge.get(u)?.il || []) iller.push(i);
		o.ilAdaylari = [...new Set(iller)].sort(sirala);
		o.ilSec = o.ilAdaylari.length === 1 ? o.ilAdaylari[0] : null;
		// Ad: Türkçe etiket, yoksa yedek diller.
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
		if (ILCE_AD[o.qid]) {
			o.ad = ILCE_AD[o.qid];
			o.adDil = 'elle';
		}
		if (o.ad && o.ilSec && anahtarOf(o.ad) === 'merkez') o.ad = o.ilSec; // "Merkez (Antalya)" → il adı
		// Bir ilçe öğesi mi, kasaba/belediye öğesi mi? (etiketlerinde "ilçe/district" geçiyor mu)
		o.ilceOgesi = Object.values(o.etiket).flat().some((e) => /ilçe|district|distretto|distrito|okrug|околия|rayon/i.test(e));
	}

	// Eleme: kapatılmış/yerine geçilmiş, ilsiz, büyükşehirdeki eski merkez ilçe, elle dışlanan
	const gecerli = [];
	for (const o of [...oge.values()].sort((a, b) => qnum(a.qid) - qnum(b.qid))) {
		const kayit = { qid: o.qid, ad: o.ad, etiket: o.hamEtiket || null, il: o.ilSec || o.ilAdaylari.join('/') || null, sitelinks: o.sl };
		if (ILCE_HARIC[o.qid]) dislanan.push({ ...kayit, neden: ILCE_HARIC[o.qid] });
		else if (o.eski.size) dislanan.push({ ...kayit, neden: 'eski birim: ' + [...o.eski].sort().join('; ') });
		else if (!o.ilSec) dislanan.push({ ...kayit, neden: o.ilAdaylari.length ? 'birden çok il' : 'il bilgisi (P131) yok' });
		else if (!o.ad) dislanan.push({ ...kayit, neden: 'hiçbir dilde etiket yok' });
		else if (buyuk.has(o.ilSec) && anahtarOf(o.ad) === anahtarOf(o.ilSec))
			dislanan.push({ ...kayit, neden: 'büyükşehirde kaldırılmış eski merkez ilçe (2013)' });
		else gecerli.push(o);
	}

	// Aynı ilde aynı adı taşıyan öğeler tek ilçedir (ilçe öğesi + kasaba öğesi, ya da yinelenen öğe).
	const grup = new Map();
	for (const o of gecerli) {
		const k = o.ilSec + '|' + anahtarOf(o.ad);
		if (!grup.has(k)) grup.set(k, []);
		grup.get(k).push(o);
	}
	const ilceler = [];
	for (const og of grup.values()) {
		// Temsilci: trwiki sayfası olan, sonra en çok site bağlantılı, sonra en küçük QID.
		og.sort((a, b) => !!b.trwiki - !!a.trwiki || b.sl - a.sl || qnum(a.qid) - qnum(b.qid));
		const t = og[0];
		// Ad: Türkçe etiketli öğelerden temsilciye en yakın olanınki.
		const adO = og.find((o) => o.adDil === 'elle') || og.find((o) => o.adDil === 'tr') || t;
		// Koordinat: gruptaki tüm koordinatların medoidi (aykırı değerlere dayanıklı).
		const ks = og.flatMap((o) => o.koord.map((k) => ({ ...k, qid: o.qid })));
		let koor = null, yayilim = 0;
		if (ks.length) {
			let enIyi = Infinity;
			for (const a of ks) {
				const top = ks.reduce((s, b) => s + km(a, b), 0) - (a.tercih ? 0.001 : 0);
				if (top < enIyi) (enIyi = top), (koor = a);
			}
			yayilim = Math.max(...ks.map((b) => km(koor, b)));
		}
		// Nüfus: önce ilçe öğelerinden, en son yıllı değer; yoksa diğer öğelerden (kasaba nüfusu olabilir).
		const nufusSec = (liste) => {
			const n = liste.flatMap((o) => o.nufus.map((x) => ({ ...x, qid: o.qid }))).filter((x) => x.yil);
			n.sort((a, b) => b.yil - a.yil || b.tercih - a.tercih || b.deger - a.deger);
			return n[0] || null;
		};
		const ilceOg = og.filter((o) => o.ilceOgesi);
		let nf = nufusSec(ilceOg.length ? ilceOg : og);
		let nfKapsam = nf ? (ilceOg.length || og.length === 1 ? 'ilçe' : 'belirsiz') : null;
		if (!nf && ilceOg.length) {
			nf = nufusSec(og);
			if (nf) nfKapsam = 'belirsiz (kasaba öğesinden)';
		}
		const trw = og.find((o) => o.trwiki);
		ilceler.push({
			qid: t.qid,
			ad: adO.ad,
			il: t.ilSec,
			lat: koor ? Math.round(koor.lat * 1e5) / 1e5 : null,
			lon: koor ? Math.round(koor.lon * 1e5) / 1e5 : null,
			nufus: nf ? { deger: nf.deger, yil: nf.yil, qid: nf.qid, kapsam: nfKapsam } : null,
			trwiki: !!trw,
			trwikiBaslik: trw ? trw.trwiki : null,
			adBaskaIlde: [],
			merkez: anahtarOf(adO.ad) === anahtarOf(t.ilSec),
			qidler: og.map((o) => o.qid).sort((a, b) => qnum(a) - qnum(b)),
			adKaynak: adO.adDil === 'tr' ? undefined : adO.adDil + ': ' + (adO.hamEtiket || ''),
			_koordYayilim: yayilim,
		});
	}
	return { ilceler, dislanan, ilUyari, buyuk, oyun };
}

// GECICI
const r = await ilceler();
console.log('ilce', r.ilceler.length, 'dislanan', r.dislanan.length);
const npm = await npmListesi();
const say = {};
for (const x of r.ilceler) say[x.il] = (say[x.il] || 0) + 1;
const npmSay = {};
for (const x of npm) npmSay[x.il] = (npmSay[x.il] || 0) + 1;
for (const il of Object.keys(npmSay).sort()) if (say[il] !== npmSay[il]) {
	const biz = r.ilceler.filter((x) => x.il === il);
	const bk = new Set(biz.map((x) => (x.merkez ? 'merkez' : anahtarOf(x.ad))));
	const nk = new Set(npm.filter((x) => x.il === il).map((x) => anahtarOf(x.ad)));
	console.log(il, 'wd', say[il], 'npm', npmSay[il], '| fazla:', biz.filter((x) => !nk.has(x.merkez ? 'merkez' : anahtarOf(x.ad))).map((x) => `${x.ad} ${x.qidler.join(',')} ${x.adKaynak||''}`).join(' ; '), '| eksik:', npm.filter((x) => x.il === il && !bk.has(anahtarOf(x.ad))).map((x) => x.ad).join(', '));
}
for (const d of r.dislanan) console.log('DIS', JSON.stringify(d));
console.log('trwiki', r.ilceler.filter((x) => x.trwiki).length, 'koord', r.ilceler.filter((x) => x.lat != null).length, 'nufus', r.ilceler.filter((x) => x.nufus).length, JSON.stringify(Object.entries(r.ilceler.reduce((a, x) => ((a[x.nufus?.kapsam] = (a[x.nufus?.kapsam] || 0) + 1), a), {}))));
console.log(r.ilceler.filter((x) => !x.trwiki).slice(0, 15).map((x) => x.ad + ' ' + x.il + ' ' + x.qidler.join(',')).join('\n'));
writeFileSync('/tmp/claude-0/-home-user/fe79b1eb-0adb-5b11-8d68-d1363e2a6c54/scratchpad/veri/gruplar.json', JSON.stringify(r.ilceler));
