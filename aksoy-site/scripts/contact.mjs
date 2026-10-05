// Ürün görsellerini koyu kart arka planı üzerinde ızgara olarak gösterir: node scripts/contact.mjs <çıktı.png> [anahtarlar]
import sharp from 'sharp';
import fs from 'node:fs';
const [out, keysArg] = process.argv.slice(2);
const keys = keysArg ? keysArg.split(',') : fs.readdirSync('public/img/urun').filter((f) => f.endsWith('-s.webp')).map((f) => f.replace('-s.webp', ''));
const W = 300, H = 225, cols = 5;
const tiles = [];
for (const [i, k] of keys.entries()) {
  const img = await sharp(`public/img/urun/${k}-s.webp`).resize({ width: W, height: H }).png().toBuffer();
  const label = Buffer.from(`<svg width="${W}" height="18"><text x="6" y="13" font-family="DejaVu Sans Mono" font-size="11" fill="#8a919a">${k}</text></svg>`);
  tiles.push({ input: img, left: (i % cols) * W, top: Math.floor(i / cols) * (H + 18) + 18 }, { input: label, left: (i % cols) * W, top: Math.floor(i / cols) * (H + 18) });
}
const rows = Math.ceil(keys.length / cols);
const bg = Buffer.from(`<svg width="${W * cols}" height="${rows * (H + 18)}"><defs><radialGradient id="g" cx="50%" cy="25%" r="80%"><stop offset="0" stop-color="#22262c"/><stop offset="1" stop-color="#0d0f12"/></radialGradient></defs>${Array.from({ length: rows * cols }, (_, i) => `<rect x="${(i % cols) * W + 2}" y="${Math.floor(i / cols) * (H + 18) + 18}" width="${W - 4}" height="${H}" rx="10" fill="url(#g)"/>`).join('')}</svg>`);
await sharp(bg).composite(tiles).png().toFile(out);
console.log(out);
