// Ulu Kayın derleme betiği
//   node build.mjs          → dist/UluKayin_Test.html (tek dosya, çevrimdışı açılır) + dist/ulu-kayin.esm.js
//   node build.mjs --dev    → küçültmesiz, kaynak haritalı (hata ayıklama ve ekran görüntüsü için)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
const dev = process.argv.includes('--dev');
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

// Yazı tipleri: ana oyunla aynı aileler. Sadece latin + latin-ext (Türkçe harfler) gömülür.
const FONTS = [
	['cormorant-garamond', '500-italic'],
	['cormorant-garamond', '600-italic'],
	['manrope', '500'],
	['manrope', '700'],
	['manrope', '800'],
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

const common = {
	bundle: true,
	target: ['es2020', 'chrome80', 'safari14'],
	legalComments: 'none',
	logLevel: 'warning',
	minify: !dev,
	sourcemap: dev ? 'inline' : false,
	define: { 'import.meta.env.DEV': JSON.stringify(dev) },
};

// 1) Tek başına test sayfası: three.js dahil her şey içinde.
const app = await build({
	...common,
	entryPoints: [join(root, 'src/standalone.js')],
	format: 'iife',
	write: false,
});
const js = app.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const tpl = readFileSync(join(root, 'test/template.html'), 'utf8');
const html = tpl.replace('/*__FONTS__*/', () => fontFaces()).replace('/*__APP__*/', () => js);
writeFileSync(join(dist, 'UluKayin_Test.html'), html);

// 1b) İsteğe bağlı: paylaşılabilir sayfa sürümü (iskeletsiz; yayın ortamı doctype/head/body ekler)
const artArg = process.argv.find((a) => a.startsWith('--artifact='));
if (artArg) {
	const out = artArg.slice('--artifact='.length);
	const page = `<title>Ulu Kayın</title>
<meta name="theme-color" content="#16122a">
<style>${fontFaces()}
:root{color-scheme:dark;--bg:#16122a;--fg:#fff4e2;--dim:rgba(255,244,226,.6)}
html,body{height:100%;width:100%;margin:0;overflow:hidden;background:var(--bg);color:var(--fg);overscroll-behavior:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
body{position:fixed;inset:0}
#uk-boot{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;text-align:center;padding-inline:16px}
#uk-boot b{font-size:44px;font-weight:600;color:#ffe2a6}
#uk-boot span{font-family:'Manrope',system-ui,sans-serif;font-style:normal;font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:var(--dim)}
</style>
<div id="uk-boot"><b>Ulu Kayın</b><span>Hayat Ağacı yükleniyor</span></div>
<script>${js}</script>`;
	writeFileSync(out, page);
	console.log(`paylaşım sayfası: ${out} ${kb(Buffer.byteLength(page))}`);
}

// 2) Ana oyuna bağlamak için modül: three dışarıdan gelir (ana oyunun kendi three kopyası kullanılır).
await build({
	...common,
	entryPoints: [join(root, 'src/index.js')],
	format: 'esm',
	external: ['three'],
	outfile: join(dist, 'ulu-kayin.esm.js'),
});

console.log(`UluKayin_Test.html ${kb(Buffer.byteLength(html))}${dev ? ' (dev)' : ''}`);
