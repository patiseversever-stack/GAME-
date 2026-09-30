// loader/src → loader/build  (oyuna gömülecek sıkıştırılmış paket + önizleme paketi + boyut raporu)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = p => path.join(root, 'loader', 'src', p), out = p => path.join(root, 'loader', 'build', p);
fs.mkdirSync(out('.'), { recursive: true });

const common = { bundle: true, format: 'iife', target: ['es2020', 'chrome80', 'safari13.1'], legalComments: 'none', charset: 'utf8' };
await esbuild.build({ ...common, entryPoints: [src('entry-game.js')], outfile: out('loader.game.min.js'), minify: true });
await esbuild.build({ ...common, entryPoints: [src('entry-preview.js')], outfile: out('loader.preview.js'), minify: false, sourcemap: false });
const css = fs.readFileSync(src('loader.css'), 'utf8');
const min = (await esbuild.transform(css, { loader: 'css', minify: true })).code;
fs.writeFileSync(out('loader.min.css'), min);
fs.writeFileSync(out('loader.css'), css);

const gz = b => zlib.gzipSync(b, { level: 9 }).length, br = b => zlib.brotliCompressSync(b).length;
const js = fs.readFileSync(out('loader.game.min.js')), cs = Buffer.from(min);
const shell = Buffer.from(fs.readFileSync(src('shell.html'), 'utf8'));
const all = Buffer.concat([cs, js, shell]);
console.log('loader.min.css   ', cs.length, 'B   gzip', gz(cs), ' brotli', br(cs));
console.log('loader.game.min.js', js.length, 'B   gzip', gz(js), ' brotli', br(js));
console.log('shell.html       ', shell.length, 'B');
console.log('TOPLAM (css+js+kabuk)', all.length, 'B   gzip', gz(all), ' brotli', br(all));
fs.writeFileSync(out('size-report.json'), JSON.stringify({ css: cs.length, js: js.length, shell: shell.length, total: all.length, gzip: gz(all), brotli: br(all) }, null, 1));
