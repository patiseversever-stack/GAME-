// Istaka modelinin mobil sürümü: dokular 1024 px JPEG (q82) olarak yeniden kodlanır → assets/models/rack.mobile.glb
// Kullanım (model değişince): npm i --no-save sharp && node tools/mobile-glb.mjs [girdi.glb] [çıktı.glb]
import fs from 'node:fs';

const [, , input = 'assets/models/rack.glb', output = 'assets/models/rack.mobile.glb'] = process.argv;
const SIZE = Number(process.env.OKEY_TEXTURE_SIZE || 1024);
const QUALITY = 82;
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('sharp gerekli: npm i --no-save sharp');
  process.exit(1);
}

const align4 = (n) => (n + 3) & ~3;
const glb = fs.readFileSync(input);
if (glb.readUInt32LE(0) !== 0x46546c67) throw new Error('GLB dosyası değil');
const jsonLength = glb.readUInt32LE(12);
const json = JSON.parse(glb.toString('utf8', 20, 20 + jsonLength).trim());
const binStart = 20 + jsonLength + 8;
const bin = glb.subarray(binStart, binStart + glb.readUInt32LE(20 + jsonLength));
const view = (v) => bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);

const replaced = new Map();
for (const image of json.images || []) {
  const original = view(json.bufferViews[image.bufferView]);
  const resized = await sharp(original).resize(SIZE, SIZE, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
  if (resized.length < original.length) {
    replaced.set(image.bufferView, resized);
    image.mimeType = 'image/jpeg';
  }
}

const chunks = [];
let offset = 0;
json.bufferViews.forEach((v, i) => {
  const data = replaced.get(i) || view(v);
  const padded = align4(offset);
  if (padded > offset) chunks.push(Buffer.alloc(padded - offset));
  v.byteOffset = padded;
  v.byteLength = data.length;
  chunks.push(data);
  offset = padded + data.length;
});
const binOut = Buffer.concat([...chunks, Buffer.alloc(align4(offset) - offset)]);
json.buffers = [{ byteLength: binOut.length }];
let jsonOut = Buffer.from(JSON.stringify(json), 'utf8');
jsonOut = Buffer.concat([jsonOut, Buffer.alloc(align4(jsonOut.length) - jsonOut.length, 0x20)]);
const u32 = (...v) => {
  const b = Buffer.alloc(v.length * 4);
  v.forEach((x, i) => b.writeUInt32LE(x, i * 4));
  return b;
};
const out = Buffer.concat([u32(0x46546c67, 2, 12 + 8 + jsonOut.length + 8 + binOut.length), u32(jsonOut.length, 0x4e4f534a), jsonOut, u32(binOut.length, 0x004e4942), binOut]);
fs.writeFileSync(output, out);
console.log(`${input} ${glb.length} B → ${output} ${out.length} B (dokular ${SIZE}px)`);
