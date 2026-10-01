// GLB doku küçültme: 4K JPEG dokuları 1024px'e indirir (tek dosya dağıtımı için). Kullanım: node tools/optimize-glb.mjs in.glb out.glb
import fs from 'node:fs';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [, , input = 'assets/models/rack.glb', output = 'assets/models/rack.opt.glb', sizeArg = '1024'] = process.argv;
const size = +sizeArg;
const b = fs.readFileSync(input);
const jl = b.readUInt32LE(12);
const json = JSON.parse(b.slice(20, 20 + jl).toString());
const binStart = 20 + jl + 8;
const bin = b.slice(binStart);
const views = json.bufferViews.map((v) => ({ ...v, data: bin.slice(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength) }));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('about:blank');
for (const img of json.images) {
  const src = views[img.bufferView].data.toString('base64');
  const out = await page.evaluate(async ({ src, size }) => {
    const blob = await (await fetch('data:image/jpeg;base64,' + src)).blob();
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    c.getContext('2d').drawImage(bmp, 0, 0, size, size);
    const url = c.toDataURL('image/jpeg', 0.84);
    return url.split(',')[1];
  }, { src, size });
  views[img.bufferView].data = Buffer.from(out, 'base64');
}
await browser.close();
let off = 0;
const parts = [];
views.forEach((v, i) => {
  const pad = (4 - (off % 4)) % 4;
  if (pad) { parts.push(Buffer.alloc(pad)); off += pad; }
  json.bufferViews[i].byteOffset = off;
  json.bufferViews[i].byteLength = v.data.length;
  parts.push(v.data);
  off += v.data.length;
});
const total = Buffer.concat(parts);
json.buffers[0].byteLength = total.length;
let js = Buffer.from(JSON.stringify(json));
js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const binPad = Buffer.concat([total, Buffer.alloc((4 - (total.length % 4)) % 4)]);
const head = Buffer.alloc(12);
head.write('glTF', 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + binPad.length, 8);
const jh = Buffer.alloc(8); jh.writeUInt32LE(js.length, 0); jh.write('JSON', 4);
const bh = Buffer.alloc(8); bh.writeUInt32LE(binPad.length, 0); bh.write('BIN\0', 4);
fs.writeFileSync(output, Buffer.concat([head, jh, js, bh, binPad]));
console.log(output, (fs.statSync(output).size / 1024 / 1024).toFixed(2) + ' MB');
