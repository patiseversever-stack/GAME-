// bake çıktılarından GLB üretir. Kullanım: node assemble.mjs <prefix> <out.glb> [roughness]
import {Document, NodeIO} from '@gltf-transform/core';
import fs from 'fs';
const [,, pre, out, rough = '0.82'] = process.argv;
const meta = JSON.parse(fs.readFileSync(pre + '.json'));
const f32 = k => new Float32Array(fs.readFileSync(`${pre}.${k}.bin`).buffer.slice(0));
const idx = new Uint32Array(fs.readFileSync(`${pre}.idx.bin`).buffer.slice(0));
const doc = new Document(); const buf = doc.createBuffer();
const acc = (arr, type) => doc.createAccessor().setArray(arr).setType(type).setBuffer(buf);
const prim = doc.createPrimitive()
  .setAttribute('POSITION', acc(f32('pos'), 'VEC3')).setAttribute('NORMAL', acc(f32('nrm'), 'VEC3'))
  .setAttribute('TEXCOORD_0', acc(f32('uv'), 'VEC2')).setAttribute('TANGENT', acc(f32('tan'), 'VEC4'))
  .setIndices(acc(meta.verts < 65536 ? new Uint16Array(idx) : idx, 'SCALAR'));
const tex = (p, mime) => doc.createTexture().setImage(fs.readFileSync(p)).setMimeType(mime);
const ext = fs.existsSync(pre + '_color.jpg') ? 'jpg' : 'png';
const mat = doc.createMaterial('karakter').setBaseColorTexture(tex(`${pre}_color.${ext}`, ext === 'jpg' ? 'image/jpeg' : 'image/png'))
  .setNormalTexture(tex(`${pre}_normal.png`, 'image/png')).setRoughnessFactor(+rough).setMetallicFactor(0);
prim.setMaterial(mat);
const mesh = doc.createMesh('karakter').addPrimitive(prim);
doc.createScene().addChild(doc.createNode('karakter').setMesh(mesh));
await new NodeIO().write(out, doc);
console.log('yazıldı', out, meta);
