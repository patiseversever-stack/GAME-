// Tembel soru bankası sınaması (SORU-100K.md Aşama 0.5):  node test/banka.test.mjs
//   1) Yedek açıcı (src/data/banka-ac.js inflate): saklanmış, sabit ve dinamik Huffman bloklu gzip akışları zlib ile aynı.
//   2) Paket: Node'daki BANK → paket metni → gzip → base64 → paketAc birebir aynı liste (yerleşik açıcıyla ve yedekle);
//      eksik paket sessizce kabul edilmez.
//   3) Tarayıcı yolu: build.mjs'in yaptığı gibi banka-kaynak.js yerine banka-paket.js konup paketlenen modüller yüklenince
//      BANK boş, türetimler (yeniBank, Halat, Mancınık, Fitil) banka açılmadan kurulmaz ve saklanmaz; bankaHazir()
//      sonrasında BANK ve türetimler Node yoluyla birebir aynı. Maç banka açılmadan kurulamaz.
//   4) Wikidata aileleri (kimlikte -wd-): bankada, Mancınık ikizleri kurulu; 100 maçta seçilme payı en çok %15.
import { gzipSync, deflateRawSync, constants } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

await import('./kanca.mjs');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { inflate, gunzip, paketMetni, paketAc, PARCA } = await import('../src/data/banka-ac.js');
const { BANK, bankaVar } = await import('../src/data/bank.js');
const { DENEME_SAMPLES } = await import('../src/quiz/deneme.js');
const duello = await import('../src/quiz/deneme-duello.js');
const MAC = await import('../src/quiz/mac.js');
const { Match, WD_PAY, isWd } = await import('../src/game/match.js');
const { makeApp, makeUI } = await import('./dunya.mjs');

let fails = 0;
let checks = 0;
const ok = (c, m) => {
	checks++;
	if (!c) {
		fails++;
		if (fails <= 40) console.log('  HATA: ' + m);
	}
};
const esit = (a, b) => a.length === b.length && Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;

// ---------------------------------------------------------------- 1) yedek açıcı
console.log('1) Yedek açıcı (inflate)');
{
	let x = 12345;
	const rnd = () => ((x = (x * 1103515245 + 12345) >>> 0) >>> 16) & 255;
	const rastgele = Buffer.from(Array.from({ length: 200000 }, rnd)); // sıkışmaz: saklanmış bloklar
	const metin = Buffer.from(JSON.stringify(BANK.slice(0, 3000)));
	const ornek = [Buffer.alloc(0), Buffer.from('a'), Buffer.from('Fetih Ligi'), Buffer.alloc(70000, 65), rastgele, metin];
	for (const [i, b] of ornek.entries())
		for (const level of [0, 1, 6, 9]) {
			ok(esit(gunzip(gzipSync(b, { level })), b), `gunzip örnek ${i}, düzey ${level}`);
			ok(esit(inflate(deflateRawSync(b, { level, strategy: constants.Z_FIXED })), b), `sabit Huffman örnek ${i}, düzey ${level}`);
		}
	let hata = false;
	try {
		gunzip(gzipSync(metin).subarray(0, 5000));
	} catch {
		hata = true;
	}
	ok(hata, 'yarım akış hata vermedi');
}

// ---------------------------------------------------------------- 2) paket
console.log(`2) Paket: ${BANK.length} soru`);
const B64 = gzipSync(Buffer.from(paketMetni(BANK)), { level: 9 }).toString('base64');
{
	const metin = paketMetni(BANK);
	ok(metin.split('\n').length === Math.ceil(BANK.length / PARCA), 'satır sayısı');
	const a = await paketAc(B64, {}, BANK.length);
	ok(isDeepStrictEqual(a, BANK), 'yerleşik açıcıyla açılan paket bankayla aynı değil');
	const DS = globalThis.DecompressionStream;
	globalThis.DecompressionStream = undefined; // eski tarayıcı: yedek açıcı
	try {
		const b = await paketAc(B64, { acele: true }, BANK.length);
		ok(isDeepStrictEqual(b, BANK), 'yedek açıcıyla açılan paket bankayla aynı değil');
	} finally {
		globalThis.DecompressionStream = DS;
	}
	let hata = false;
	try {
		await paketAc(gzipSync(Buffer.from(paketMetni(BANK.slice(0, 500)))).toString('base64'), {}, BANK.length);
	} catch {
		hata = true;
	}
	ok(hata, 'eksik paket kabul edildi');
}

// ---------------------------------------------------------------- 3) tarayıcı yolu
console.log('3) Tarayıcı yolu (banka-paket.js)');
{
	// Node yolu: banka modül yüklenince hazır, türetimler bir kez kurulur ve aynı nesne döner
	ok(bankaVar(), 'Node yolunda banka hazır değil');
	ok(DENEME_SAMPLES.halat === DENEME_SAMPLES.halat && duello.SAMPLES.halat === DENEME_SAMPLES.halat, 'Halat turları her erişimde yeniden kuruluyor');
	ok(DENEME_SAMPLES.mancinik === duello.SAMPLES.mancinik && MAC.yeniBank() === MAC.yeniBank(), 'Mancınık / yeniBank saklanmıyor');

	const ozet = (L) => L.map((q) => q.id + '|' + (q.items?.length ?? '') + '|' + (q.src ?? ''));
	const BODY = /* js */ `
import { BANK, bankaVar, bankaHazir } from './src/data/bank.js';
import { DENEME_SAMPLES } from './src/quiz/deneme.js';
import { yeniBank } from './src/quiz/mac.js';
import { Match } from './src/game/match.js';
export const once = { n: BANK.length, var: bankaVar(), halat: DENEME_SAMPLES.halat.length, mc: DENEME_SAMPLES.mancinik.length, yeni: yeniBank().length };
let kurulmadi = false;
try { new Match({}, {}, {}); } catch (e) { kurulmadi = /bankaHazir/.test(e.message); }
once.kurulmadi = kurulmadi;
export { BANK, bankaVar, bankaHazir, DENEME_SAMPLES, yeniBank };
`;
	const paket = {
		name: 'banka-paket',
		setup(b) {
			b.onResolve({ filter: /^\.\/banka-kaynak\.js$/ }, (a) => (/[\\/]src[\\/]data$/.test(a.resolveDir) ? { path: join(root, 'src/data/banka-paket.js') } : null));
			b.onResolve({ filter: /^fl:banka-veri$/ }, () => ({ path: 'banka-veri', namespace: 'fl-banka' }));
			b.onLoad({ filter: /.*/, namespace: 'fl-banka' }, () => ({ contents: `export default ${JSON.stringify(B64)};\nexport const SAYI = ${BANK.length};`, loader: 'js' }));
		},
	};
	const out = await build({ stdin: { contents: BODY, resolveDir: root, sourcefile: 'banka-sinama.js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'error', plugins: [paket] });
	const js = out.outputFiles[0].text;
	ok(!js.includes('cog-wd-ilce-Q932886') && !js.includes('İki kıtaya yayılan İstanbul'), 'içerik dosyaları paketlenmiş betiğe girmiş');
	const uyari = console.warn;
	console.warn = () => {};
	const T = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
	console.warn = uyari;
	ok(T.once.n === 0 && !T.once.var, 'tarayıcı yolunda banka açılıştan önce dolu');
	ok(T.once.halat === 0 && T.once.mc === 0 && T.once.yeni === 0, 'türetimler banka açılmadan kuruldu');
	ok(T.once.kurulmadi, 'maç banka açılmadan kuruldu');
	const [a, b] = await Promise.all([T.bankaHazir({ acele: false }), T.bankaHazir()]);
	ok(a === T.BANK && b === T.BANK && T.bankaVar(), 'bankaHazir aynı diziyi vermedi');
	ok(isDeepStrictEqual(T.BANK, BANK), 'açılan banka Node bankasıyla aynı değil');
	ok(isDeepStrictEqual(ozet(T.DENEME_SAMPLES.halat), ozet(DENEME_SAMPLES.halat)), 'Halat turları Node yoluyla aynı değil');
	ok(isDeepStrictEqual(T.DENEME_SAMPLES.mancinik, DENEME_SAMPLES.mancinik), 'Mancınık ikizleri Node yoluyla aynı değil');
	ok(isDeepStrictEqual(ozet(T.yeniBank()), ozet(MAC.yeniBank())), 'yeniBank Node yoluyla aynı değil');
	ok(T.DENEME_SAMPLES.halat === T.DENEME_SAMPLES.halat, 'Halat turları açıldıktan sonra saklanmıyor');
}

// ---------------------------------------------------------------- 4) Wikidata aileleri
console.log('4) Wikidata aileleri (-wd-)');
{
	const wd = BANK.filter(isWd);
	const by = {};
	for (const q of wd) by[q.type] = (by[q.type] || 0) + 1;
	console.log(`   bankada ${wd.length}: ${Object.entries(by).map(([t, n]) => t + ' ' + n).join(', ')}`);
	ok(by.choice > 0 && by.num > 0 && by.pin > 0, 'Wikidata aileleri bankaya girmemiş');
	ok(wd.every((q) => q.type !== 'pin' || (Number.isFinite(q.lat) && Number.isFinite(q.lon))), 'iğne sorusunda konum yok');
	const ikiz = DENEME_SAMPLES.mancinik.filter((q) => /-wd-dogum-/.test(q.src || ''));
	ok(ikiz.length > 0 && ikiz.every((q) => q.id === 'dn-mc-' + q.src), 'doğum yılı Mancınık ikizleri yok ya da kimliği bozuk');
	const kaynak = new Set(BANK.filter((q) => q.type === 'num' && /-wd-dogum-/.test(q.id)).map((q) => q.id));
	ok(ikiz.every((q) => kaynak.has(q.src) && q.ans > 0 && q.max - q.min >= 10 && (q.ans - q.min) / (q.max - q.min) >= 0.1 && (q.ans - q.min) / (q.max - q.min) <= 0.9), 'ikiz şartları');

	// 100 maç (bütün modlar, iki uzunluk, yedi bölge): seçilen soruların -wd- payı
	const REGIONS = ['ege', 'marmara', 'akdeniz', 'icanadolu', 'karadeniz', 'dogu', 'guneydogu'];
	const MODLAR = ['1v1', 'ffa3', 'ffa4', 'team'];
	let n = 0;
	let toplam = 0;
	let enCok = 0;
	for (let k = 0; k < 100; k++) {
		const app = makeApp();
		const long = k % 10 === 9;
		const m = new Match(app, makeUI(), { mode: MODLAR[k % 4], length: long ? 'long' : 'quick', region: long ? 'all' : REGIONS[k % 7], bot: 'er', seed: 31000 + k * 17, allBots: true, persist: false });
		app.match = m;
		await m.run();
		const r = app.lastSim.wd;
		n += r.n;
		toplam += r.toplam;
		enCok = Math.max(enCok, r.toplam ? r.n / r.toplam : 0);
	}
	const pay = n / toplam;
	console.log(`   100 maç: ${toplam} seçim, ${n} Wikidata sorusu (%${(pay * 100).toFixed(1)}; maç başına en çok %${(enCok * 100).toFixed(1)}; sınır %${WD_PAY * 100})`);
	ok(n > 0, 'Wikidata soruları maçta hiç çıkmadı');
	ok(pay <= WD_PAY, `Wikidata payı %${(pay * 100).toFixed(1)} > %${WD_PAY * 100}`);
}

console.log(checks + ' denetim, ' + fails + ' hata');
process.exitCode = fails ? 1 : 0;
