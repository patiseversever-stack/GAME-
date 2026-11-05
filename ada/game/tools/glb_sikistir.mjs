// Meshy'den gelen dokulu GLB'yi oyun için hafifletir: dokular webp ve küçültülmüş, geometri meshopt.
// Kullanım (ada/game klasöründen): node tools/glb_sikistir.mjs <girdi.glb> <çıktı.glb> [doku_boyutu]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress, meshopt, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { statSync } from 'node:fs';

const [inp, out, sizeArg] = process.argv.slice(2);
const size = parseInt(sizeArg || '1024', 10);
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inp);
await doc.transform(
  weld(),
  dedup(),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality: 82 }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(out, doc);
console.log(out, Math.round(statSync(out).size / 1024), 'KB');
