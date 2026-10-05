// Uzun bir tam sayfa görüntüsünü küçültüp sütunlara böler (tek bakışta tüm sayfa).
// node scripts/tile.mjs <girdi.png> <çıktı.png> <genişlik> <sütun yüksekliği>
import sharp from 'sharp';
const [inp, out, w = '480', colH = '1400'] = process.argv.slice(2);
const img = sharp(inp);
const meta = await img.metadata();
const scale = +w / meta.width;
const H = Math.round(meta.height * scale);
const buf = await sharp(inp).resize({ width: +w }).png().toBuffer();
const cols = Math.ceil(H / +colH);
const comp = [];
for (let i = 0; i < cols; i++) {
  const top = i * +colH, h = Math.min(+colH, H - top);
  comp.push({ input: await sharp(buf).extract({ left: 0, top, width: +w, height: h }).toBuffer(), left: i * (+w + 12), top: 0 });
}
await sharp({ create: { width: cols * (+w + 12) - 12, height: Math.min(+colH, H), channels: 3, background: '#300' } }).composite(comp).png().toFile(out);
console.log(out, cols, 'columns');
