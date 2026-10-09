// Ulu Kayın derleme betiği
//   node build.mjs          → dist/UluKayin_Test.html (tek dosya, çevrimdışı açılır) + dist/ulu-kayin.esm.js
//   node build.mjs --dev    → küçültmesiz, kaynak haritalı (hata ayıklama ve ekran görüntüsü için)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
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

// 2) Ana oyuna bağlamak için modül: three dışarıdan gelir (ana oyunun kendi three kopyası kullanılır).
await build({
	...common,
	entryPoints: [join(root, 'src/index.js')],
	format: 'esm',
	external: ['three'],
	outfile: join(dist, 'ulu-kayin.esm.js'),
});

const kb = (n) => (n / 1024).toFixed(0) + ' KB';
console.log(`UluKayin_Test.html ${kb(Buffer.byteLength(html))}${dev ? ' (dev)' : ''}`);
