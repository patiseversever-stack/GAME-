// Tek dosya derleme: CSS + JS (esbuild) + yazı tipleri satır içi → dist/okey-oyunu.html
import { build } from 'esbuild';
import fs from 'node:fs';
const css = ['fonts.generated', 'tokens', 'base', 'tile', 'table', 'screens'].map((n) => fs.readFileSync(`styles/${n}.css`, 'utf8')).join('\n');
const js = (await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020' })).outputFiles[0].text.replace(/<\/script/g, '<\\/script');
let html = fs.readFileSync('index.html', 'utf8');
const rackGlb = fs.readFileSync('assets/models/rack.opt.glb').toString('base64');
html = html.replace(/<link rel="(manifest|icon|stylesheet)"[^>]*>\n?/g, '').replace('</head>', `<style>${css}</style>\n</head>`).replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '').replace(/<script type="module"[^>]*><\/script>/, () => `<script>window.__RACK_GLB='${rackGlb}'</script><script>${js}</script>`);
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/okey-oyunu.html', html);
console.log('dist/okey-oyunu.html', (html.length / 1024).toFixed(0) + ' KB');
// Canlı önizleme sürümü (claude.ai Artifact): iskelet etiketleri olmadan
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
const live = `<title>Patisever Okey</title>\n<style>${css}</style>\n${body}`;
fs.writeFileSync('dist/live.html', live);
console.log('dist/live.html', (live.length / 1024).toFixed(0) + ' KB');
