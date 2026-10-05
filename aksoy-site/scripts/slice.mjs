// Uzun ekran görüntüsünü okunur dilimlere böler: <girdi> <çıktı öneki> <dilim yüksekliği> [genişlik]
import sharp from 'sharp';
const [inp, prefix, sliceH = '1400', w = '900'] = process.argv.slice(2);
const meta = await sharp(inp).metadata();
const n = Math.ceil(meta.height / +sliceH);
for (let i = 0; i < n; i++) {
  const top = i * +sliceH, h = Math.min(+sliceH, meta.height - top);
  await sharp(inp).extract({ left: 0, top, width: meta.width, height: h }).resize({ width: Math.min(+w, meta.width) }).png().toFile(`${prefix}-${i}.png`);
}
console.log(n);
