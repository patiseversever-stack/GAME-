// Tek dosya derleme: CSS + JS (esbuild) + yazı tipleri + ıstaka modeli satır içi.
//   node tools/build.mjs            → dist/okey-oyunu.html (uygulama/WebView ve tarayıcı), dist/live.html (Artifact önizleme)
//   node tools/build.mjs --hd       → ıstaka orijinal 2048 px dokularla (dosya ~13 MB; varsayılan mobil 1024 px, ~4 MB)
import { build } from 'esbuild';
import fs from 'node:fs';

const HD = process.argv.includes('--hd');

// Katman sırası önemlidir: temel → arayüz sürümleri → onarımlar ve 101 → taş takımları → duraklatma → menü → profil merkezi → oyun içi
const STYLES = ['fonts.generated', 'tokens', 'base', 'tile', 'table', 'screens', 'ui5', 'ui7', 'repairs', 'table101', 'tile-themes', 'pause', 'menu', 'hub', 'play', 'rotate'];
const css = STYLES.map((n) => fs.readFileSync(`styles/${n}.css`, 'utf8')).join('\n');

// Artifact sandbox'ı (CSP) blob: fetch'ini engeller: GLTFLoader dokuları ImageBitmapLoader yerine TextureLoader ile çözsün
const textureLoaderPlugin = {
  name: 'gltf-texture-loader',
  setup(b) {
    b.onLoad({ filter: /GLTFLoader\.js$/ }, async (args) => {
      const src = await fs.promises.readFile(args.path, 'utf8');
      const from = "typeof createImageBitmap === 'undefined'";
      if (!src.includes(from)) throw new Error('GLTFLoader: beklenen createImageBitmap denetimi bulunamadı');
      return { contents: src.replace(from, 'true'), loader: 'js' };
    });
  },
};

const bundle = async (plugins = []) => (await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', plugins })).outputFiles[0].text.replace(/<\/script/g, '<\\/script');

const rackGlb = fs.readFileSync(HD ? 'assets/models/rack.glb' : 'assets/models/rack.mobile.glb').toString('base64');
const page = (js) =>
  fs
    .readFileSync('index.html', 'utf8')
    .replace(/<link rel="(manifest|icon|stylesheet)"[^>]*>\n?/g, '')
    .replace('</head>', `<style>${css}</style>\n</head>`)
    .replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '')
    .replace(/<script type="module"[^>]*><\/script>/, () => `<script>window.__RACK_GLB='${rackGlb}'</script><script>${js}</script>`);

fs.mkdirSync('dist', { recursive: true });
const html = page(await bundle());
fs.writeFileSync('dist/okey-oyunu.html', html);
console.log('dist/okey-oyunu.html', (html.length / 1024).toFixed(0) + ' KB');

// Canlı önizleme (claude.ai Artifact): iskelet etiketleri olmadan, <html> nitelikleri betikle
const art = page(await bundle([textureLoaderPlugin]));
const attrs = [...art.match(/<html([^>]*)>/)[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => `r.setAttribute(${JSON.stringify(k)},${JSON.stringify(v)});`).join('');
const head = art.match(/<head>([\s\S]*)<\/head>/)[1].replace(/<meta charset[^>]*>\n?/, '');
const body = art.match(/<body>([\s\S]*)<\/body>/)[1];
const live = `${head}<script>(function(){var r=document.documentElement;${attrs}})();</script>\n${body}`;
fs.writeFileSync('dist/live.html', live);
console.log('dist/live.html', (live.length / 1024).toFixed(0) + ' KB');
