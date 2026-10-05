// Önce/sonra karşılaştırma görseli: node scripts/ba.mjs <önce.png> <sonra.png> <çıktı.png> [genişlik] [--stack] [başlık]
import sharp from 'sharp';
const args = process.argv.slice(2);
const stack = args.includes('--stack');
const [a, b, out, w = '700', title = ''] = args.filter((x) => x !== '--stack');
const W = +w;
const label = (t, color) => Buffer.from(`<svg width="${W}" height="44"><rect width="100%" height="100%" fill="#0b0c0e"/><text x="16" y="29" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="700" fill="${color}">${t}</text>${title ? `<text x="${W - 16}" y="29" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="15" fill="#8a919a">${title}</text>` : ''}</svg>`);
const prep = async (f, t, c) => {
  const img = await sharp(f).resize({ width: W }).png().toBuffer({ resolveWithObject: true });
  const lab = await sharp(label(t, c)).png().toBuffer();
  return sharp({ create: { width: W, height: img.info.height + 44, channels: 3, background: '#0b0c0e' } }).composite([{ input: lab, left: 0, top: 0 }, { input: img.data, left: 0, top: 44 }]).png().toBuffer({ resolveWithObject: true });
};
const A = await prep(a, 'ÖNCE', '#ff7a6a'), B = await prep(b, 'SONRA', '#4cc38a');
const gap = 14;
const width = stack ? W : W * 2 + gap, height = stack ? A.info.height + B.info.height + gap : Math.max(A.info.height, B.info.height);
await sharp({ create: { width, height, channels: 3, background: '#2a2d33' } }).composite([{ input: A.data, left: 0, top: 0 }, { input: B.data, left: stack ? 0 : W + gap, top: stack ? A.info.height + gap : 0 }]).png().toFile(out);
console.log(out);
