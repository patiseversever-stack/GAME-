// Birden çok görüntüyü alt alta (veya yan yana) tek kontrol sayfasında birleştirir.
// node scripts/sheet.mjs out.png width a.png b.png ... [--row]
import sharp from 'sharp';
const args = process.argv.slice(2);
const row = args.includes('--row');
const [out, w, ...files] = args.filter((a) => a !== '--row');
const tiles = await Promise.all(files.map((f) => sharp(f).resize({ width: +w }).png().toBuffer({ resolveWithObject: true })));
const W = row ? tiles.reduce((s, t) => s + t.info.width, 0) : +w;
const H = row ? Math.max(...tiles.map((t) => t.info.height)) : tiles.reduce((s, t) => s + t.info.height, 0);
let x = 0, y = 0;
const comp = tiles.map((t) => { const c = { input: t.data, left: x, top: y }; row ? (x += t.info.width) : (y += t.info.height); return c; });
await sharp({ create: { width: W, height: H, channels: 3, background: '#000' } }).composite(comp).png().toFile(out);
