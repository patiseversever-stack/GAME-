// Fetih Ligi derleme betiği
//   node build.mjs          → dist/FetihLigi.html (tek dosya, çevrimdışı açılır) + dist/fetih.esm.js
//   node build.mjs --dev    → küçültmesiz, kaynak haritalı (hata ayıklama ve ekran görüntüsü için)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { paketMetni } from './src/data/banka-ac.js';

const root = dirname(fileURLToPath(import.meta.url));
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
const dev = process.argv.includes('--dev');
// --out=klasör: çıktılar başka klasöre (aynı anda çalışan denetim ajanları birbirinin derlemesini ezmesin)
const OUT = process.argv.find((a) => a.startsWith('--out='))?.slice(6);
const dist = OUT ? resolve(OUT) : join(root, 'dist');
mkdirSync(dist, { recursive: true });
mkdirSync(dist, { recursive: true });

// Yazı tipleri: ana oyunla aynı aileler. Sadece latin + latin-ext (Türkçe harfler) gömülür.
const FONTS = [
	['lilita-one', '400'],
	['fredoka', '500'],
	['fredoka', '600'],
	['fredoka', '700'],
	// gece istemi (Gündönümü tonu): italik serif başlık, ince aralıklı harfler; latin-ext Türkçe harfleri içerir
	['cormorant-garamond', '500-italic'],
	['cormorant-garamond', '700-italic'],
	['manrope', '500'],
	['manrope', '700'],
	['manrope', '800'],
	['barlow-condensed', '800-italic'], // Arena soru ekranı (v1.4): afiş, süre, etiketler
	['barlow-condensed', '700-italic'],
	['barlow-condensed', '900-italic'], // afiş isimleri (12 harf, kalın)
];

function fontFaces() {
	let css = '';
	for (const [pkg, variant] of FONTS) {
		const dir = join(root, 'node_modules/@fontsource', pkg);
		const src = readFileSync(join(dir, `${variant}.css`), 'utf8');
		for (const block of src.split('@font-face').slice(1)) {
			const file = /url\(\.\/files\/([^)]+\.woff2)\)/.exec(block);
			if (!file || !/-(latin|latin-ext)-\d{3}-/.test(file[1])) continue;
			const b64 = readFileSync(join(dir, 'files', file[1])).toString('base64');
			const body = block
				.slice(block.indexOf('{') + 1, block.indexOf('}'))
				.replace(/src:[^;]+;/, `src:url(data:font/woff2;base64,${b64}) format('woff2');`)
				.replace(/\s+/g, ' ')
				.trim();
			css += `@font-face{${body}}`;
		}
	}
	return css;
}

// --ek-yok: soru bankasının ek dosyaları (src/data/q/ek/*.js, src/data/ek/*.js) boş dizi olarak derlenir. Ajanlar ek
// soruları yazarken ara derlemelere yarım (henüz son okumadan geçmemiş) soru girmesin diye.
const EK_YOK = process.argv.includes('--ek-yok');
const ekYok = {
	name: 'ek-yok',
	setup(b) {
		b.onResolve({ filter: /\/ek\/[a-z]+\.js$/ }, (a) => (/[\\/]data[\\/]/.test(a.importer) || /data/.test(a.path) ? { path: a.path, namespace: 'ek-yok' } : null));
		b.onLoad({ filter: /.*/, namespace: 'ek-yok' }, () => ({ contents: 'export default [];', loader: 'js' }));
	},
};
// büyük JSON verisi (harita, kabartma) JavaScript nesnesi yerine JSON.parse metni olarak gömülür: V8 JSON metnini nesne
// sözdiziminden çok daha hızlı ayrıştırır (düşük telefonda açılışın en uzun parçası betiğin ilk çalışmasıydı)
const jsonHizli = {
	name: 'json-hizli',
	setup(b) {
		b.onLoad({ filter: /[\\/]src[\\/]data[\\/].*\.json$/ }, async (a) => {
			const { readFile } = await import('node:fs/promises');
			const txt = JSON.stringify(JSON.parse(await readFile(a.path, 'utf8')));
			return { contents: `export default JSON.parse(${JSON.stringify(txt)});`, loader: 'js' };
		});
	},
};
const base = {
	plugins: EK_YOK ? [ekYok, jsonHizli] : [jsonHizli],
	bundle: true,
	target: ['es2020', 'chrome80', 'safari14'],
	legalComments: 'none',
	logLevel: 'warning',
	minify: !dev,
	define: { 'import.meta.env.DEV': JSON.stringify(dev) },
};

// SORU BANKASI (SORU-100K.md Aşama 0.5): sorular açılış betiğinde JS nesnesi olarak değerlendirilmez. Banka Node'da
// kurulur (src/data/bank.js, aynı süzgeç ve sıra; --ek-yok geçerli), paket metni (src/data/banka-ac.js) gzip ile
// sıkıştırılıp base64 dize olarak `fl:banka-veri` sanal modülüne gömülür. Oyun paketlerinde `./banka-kaynak.js`
// (içerik dosyalarını eşzamanlı içe aktaran Node sürümü) yerine `./banka-paket.js` (paketi menüden sonra açan sürüm)
// girer; q/*.js, q/ek/*.js ve q/harita.js oyun dosyasına hiç girmez. Sınama: test/banka.test.mjs.
// --banka-kat=N (yalnız ölçüm): soru verisi N kez çoğaltılır (kopyaların kimliği ~k ekiyle ayrılır); 100 bin soruluk
// bankanın dosya boyu ve açılış kestirimi için (gzip penceresi 32 KB: uzaktaki kopyalar sıkışmayı ucuzlatmaz).
const KAT = Math.max(1, Number(process.argv.find((a) => a.startsWith('--banka-kat='))?.slice(12)) || 1);
async function bankaVerisi() {
	const r = await build({ ...base, entryPoints: [join(root, 'src/data/bank.js')], platform: 'node', format: 'esm', minify: false, write: false });
	const { BANK } = await import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'));
	const liste = KAT > 1 ? Array.from({ length: KAT }, (_, k) => (k ? BANK.map((q) => ({ ...q, id: `${q.id}~${k}` })) : BANK)).flat() : BANK;
	const metin = paketMetni(liste);
	const gz = gzipSync(Buffer.from(metin, 'utf8'), { level: 9 });
	return { sayi: liste.length, ham: Buffer.byteLength(metin), gz: gz.length, b64: gz.toString('base64') };
}
const BANKA = await bankaVerisi();
// Paketin yeri: HTML sayfalarında (FetihLigi, galeri, paylaşım sayfası) betiğin ARDINDA çalışmayan bir veri bloğu
// (<script type="application/octet-stream" id="fl-banka">): oyun betiği ayrıştırılırken taranmaz, 100 bin soruda bile
// betik büyümez. fetih.esm.js'te sayfa yok: paket betiğe dize olarak gömülür. --banka-dize: HTML'de de dize (ölçüm).
const DIZE = process.argv.includes('--banka-dize');
const bankaPaket = (gomulu) => ({
	name: 'banka-paket',
	setup(b) {
		b.onResolve({ filter: /^\.\/banka-kaynak\.js$/ }, (a) => (/[\\/]src[\\/]data$/.test(a.resolveDir) ? { path: join(root, 'src/data/banka-paket.js') } : null));
		b.onResolve({ filter: /^fl:banka-veri$/ }, () => ({ path: 'banka-veri', namespace: 'fl-banka' }));
		b.onLoad({ filter: /.*/, namespace: 'fl-banka' }, () => ({ contents: `export default ${gomulu ? JSON.stringify(BANKA.b64) : 'null'};\nexport const SAYI = ${BANKA.sayi};`, loader: 'js' }));
	},
});
const HTML_GOMULU = DIZE;
const bankaBlok = HTML_GOMULU ? '' : `<script type="application/octet-stream" id="fl-banka">${BANKA.b64}</script>`;
console.log(`soru paketi: ${BANKA.sayi} soru · ham ${kb(BANKA.ham)} · gzip ${kb(BANKA.gz)} · base64 ${kb(BANKA.b64.length)}`);

// Göz Kararı görsel paketleri (src/quiz/gorsel_paket.js): yayın ortamında bir sürüm en çok 511 dosya alır; görseller
// (dist/gk/GK-xxx.webp + siluet maskeleri .m.png) onarlı paketlere toplanır: <çıktı>/gkp/<k>.bin. Görsel numarası paketi
// belirler (GK-001…010 → 0), yeni görsel eklenince eski paketlerin içeriği değişmez. Dizin sayfaya çalışmayan veri bloğu
// olarak gömülür; oyun görseli bayt aralığıyla ister.
const GKP_BOY = 10;
function gorselPaketle() {
	const kaynak = join(root, 'dist/gk');
	const dizin = {};
	const paket = new Map();
	let ad = 0;
	for (const f of readdirSync(kaynak).sort()) {
		const m = /^GK-(\d+)\.(webp|m\.png)$/.exec(f);
		if (!m) continue;
		const k = Math.floor((Number(m[1]) - 1) / GKP_BOY);
		if (!paket.has(k)) paket.set(k, []);
		paket.get(k).push(f);
	}
	mkdirSync(join(dist, 'gkp'), { recursive: true });
	let toplam = 0;
	for (const [k, fs] of paket) {
		const parca = [];
		let bas = 0;
		for (const f of fs) {
			const b = readFileSync(join(kaynak, f));
			dizin[f] = [k, bas, b.length];
			parca.push(b);
			bas += b.length;
			ad++;
		}
		writeFileSync(join(dist, 'gkp', `${k}.bin`), Buffer.concat(parca));
		toplam += bas;
	}
	return { dizin, paket: paket.size, ad, toplam };
}
const GKP = gorselPaketle();
const gkpBlok = `<script type="application/json" id="fl-gkp">${JSON.stringify(GKP.dizin)}</script>`;
console.log(`görsel paketleri: ${GKP.ad} dosya → ${GKP.paket} paket (gkp/), ${kb(GKP.toplam)} · dizin ${kb(gkpBlok.length)}`);

// İşçiler (Web Worker): ayrı derlenir, ana pakete metin olarak gömülür (tek dosya; blob: adresinden çalışır)
async function workerCode(entry) {
	const r = await build({ ...base, entryPoints: [join(root, entry)], format: 'iife', write: false, sourcemap: false });
	return r.outputFiles[0].text;
}
const AUDIO_WORKER = await workerCode('src/audio/worker.js');
const HERO_WORKER = await workerCode('src/map/heroworker.js');

// Sürüm damgası: kaynağın (src/) içerik özeti. Oyun ve defter aynı derlemeden çıkar, ikisinde de görünür (duraklatma
// ekranı, defter başlığı): aynı damga = birebir aynı kod.
function sourceStamp() {
	const h = createHash('sha1');
	const walk = (d) => {
		for (const f of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
			const p = join(d, f.name);
			if (f.isDirectory()) walk(p);
			else if (/\.(js|json|mjs)$/.test(f.name)) h.update(f.name).update(readFileSync(p));
		}
	};
	walk(join(root, 'src'));
	return h.digest('hex').slice(0, 7);
}
const BUILD = sourceStamp();

const common = {
	...base,
	plugins: [...base.plugins, bankaPaket(HTML_GOMULU)],
	sourcemap: dev ? 'inline' : false,
	define: { ...base.define, __AUDIO_WORKER__: JSON.stringify(AUDIO_WORKER), __HERO_WORKER__: JSON.stringify(HERO_WORKER), __BUILD__: JSON.stringify(BUILD) },
};
console.log(`ses işçisi ${kb(Buffer.byteLength(AUDIO_WORKER))} · yapı işçisi ${kb(Buffer.byteLength(HERO_WORKER))} · sürüm ${BUILD}`);

// 1) Tek başına test sayfası: three.js dahil her şey içinde.
const app = await build({
	...common,
	entryPoints: [join(root, 'src/standalone.js')],
	format: 'iife',
	write: false,
});
const js = app.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const tpl = readFileSync(join(root, 'test/template.html'), 'utf8');
const html = tpl
	.replace('/*__FONTS__*/', () => fontFaces())
	.replace('/*__APP__*/', () => js)
	.replace('</body>', () => bankaBlok + gkpBlok + '\n</body>');
writeFileSync(join(dist, 'FetihLigi.html'), html);

// 1b) İsteğe bağlı: paylaşılabilir sayfa sürümü (iskeletsiz; yayın ortamı doctype/head/body ekler)
const artArg = process.argv.find((a) => a.startsWith('--artifact='));
if (artArg) {
	const out = artArg.slice('--artifact='.length);
	const page = `<meta charset="utf-8">
<title>Fetih Ligi</title>
<meta name="theme-color" content="#1b2a4a">
<style>${fontFaces()}
:root{color-scheme:dark;--bg:#1b2a4a;--fg:#fff4e2;--dim:rgba(255,244,226,.6)}
html,body{height:100%;width:100%;margin:0;overflow:hidden;background:var(--bg);color:var(--fg);overscroll-behavior:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
body{position:fixed;inset:0}
#uk-boot{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-family:'Lilita One',system-ui,sans-serif;text-align:center;padding-inline:16px;background:radial-gradient(circle at 50% 40%,#2b4a7e,#0f1a33)}
#uk-boot b{font-size:46px;font-weight:400;color:#fff;text-shadow:0 4px 0 #2a64b8}
#uk-boot span{font-family:'Fredoka',system-ui,sans-serif;font-weight:600;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#ffd76a}
</style>
<div id="uk-boot"><b>Fetih Ligi</b><span>Harita hazırlanıyor</span></div>
<script>${js}</script>
${bankaBlok}${gkpBlok}`;
	writeFileSync(out, page);
	console.log(`paylaşım sayfası: ${out} ${kb(Buffer.byteLength(page))}`);
}

// 1c) Soru galerisi (dist/SoruGalerisi.html): bütün soru tipleri oyunun kendisiyle, örnek sorularla. İskeletsiz
// paylaşım sayfası biçiminde (yayın ortamı doctype/head/body ekler).
if (!dev || process.argv.includes('--galeri')) {
	const gal = await build({ ...common, entryPoints: [join(root, 'src/galeri-sayfa.js')], format: 'iife', write: false });
	const gjs = gal.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
	const gpage = `<meta charset="utf-8">
<title>Fetih Ligi Soru Galerisi</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#0a1230">
<style>${fontFaces()}
:root{color-scheme:dark;--bg:#0a1230;--fg:#eef2fa}
html,body{height:100%;width:100%;margin:0;overflow:hidden;background:var(--bg);color:var(--fg);overscroll-behavior:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
body{position:fixed;inset:0}
#uk-boot{position:fixed;inset:0;z-index:90;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-family:'Lilita One',system-ui,sans-serif;text-align:center;padding-inline:max(16px,env(safe-area-inset-left,0px)) max(16px,env(safe-area-inset-right,0px));background:radial-gradient(circle at 50% 40%,#2b4a7e,#0f1a33)}
#uk-boot b{font-size:40px;font-weight:400;color:#fff;text-shadow:0 4px 0 #2a64b8}
#uk-boot span{font-family:'Fredoka',system-ui,sans-serif;font-weight:600;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#ffd76a}
</style>
<div id="uk-boot"><b>Soru Galerisi</b><span>Harita ve sorular hazırlanıyor</span></div>
<script>${gjs}</script>
${bankaBlok}${gkpBlok}`;
	writeFileSync(join(dist, 'SoruGalerisi.html'), gpage);
	console.log(`SoruGalerisi.html ${kb(Buffer.byteLength(gpage))}`);
}

// 2) Ana oyuna bağlamak için modül: three dışarıdan gelir (ana oyunun kendi three kopyası kullanılır).
await build({
	...common,
	plugins: [...base.plugins, bankaPaket(true)],
	entryPoints: [join(root, 'src/index.js')],
	format: 'esm',
	external: ['three'],
	outfile: join(dist, 'fetih.esm.js'),
});

console.log(`FetihLigi.html ${kb(Buffer.byteLength(html))}${dev ? ' (dev)' : ''}`);
