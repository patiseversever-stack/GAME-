// Meshy'den gelen iskeletli karakteri ve tek klipli animasyon dosyalarını
// tek, hafif bir GLB'de birleştirir: dokular küçültülür (webp), geometri meshopt ile sıkıştırılır.
//
// Kullanım (ada/game klasöründen):
//   node tools/glb_birlestir.mjs <rigged.glb> <çıktı.glb> <doku_boyutu> <anim.glb:Ad> ...
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress, meshopt, resample } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const [rigPath, outPath, texSizeArg, ...animArgs] = process.argv.slice(2);
const texSize = parseInt(texSizeArg || '1024', 10);

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const doc = await io.read(rigPath);
const root = doc.getRoot();
const buffer = root.listBuffers()[0];

// İskeletin bağlama pozu klibini at
for (const a of root.listAnimations()) a.dispose();

const nodesByName = new Map(root.listNodes().map((n) => [n.getName(), n]));
const rootBoneName = 'Hips';

for (const arg of animArgs) {
  const [file, name] = arg.split(':');
  const src = await io.read(file);
  const srcAnims = src.getRoot().listAnimations();
  if (!srcAnims.length) {
    console.warn('animasyon yok:', file);
    continue;
  }
  const sa = srcAnims[0];
  const anim = doc.createAnimation(name);
  // kök kemiğe gömülü ölçek hatası: ölçek 1 değilse düzelt, öteleme kanalını aynı oranda böl
  let rootScale = 1;
  for (const ch of sa.listChannels()) {
    const tn = ch.getTargetNode();
    if (tn && tn.getName() === rootBoneName && ch.getTargetPath() === 'scale') {
      const arr = ch.getSampler().getOutput().getArray();
      rootScale = arr[0];
    }
  }
  for (const ch of sa.listChannels()) {
    const tn = ch.getTargetNode();
    if (!tn) continue;
    const target = nodesByName.get(tn.getName());
    if (!target) continue;
    const path = ch.getTargetPath();
    const s = ch.getSampler();
    let out = s.getOutput().getArray().slice();
    if (tn.getName() === rootBoneName && Math.abs(rootScale - 1) > 1e-3) {
      if (path === 'scale') out = out.map(() => 1);
      if (path === 'translation') out = out.map((v) => v / rootScale);
    }
    const input = doc.createAccessor().setType('SCALAR').setArray(s.getInput().getArray().slice()).setBuffer(buffer);
    const output = doc.createAccessor().setType(s.getOutput().getType()).setArray(out).setBuffer(buffer);
    const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation(s.getInterpolation());
    const channel = doc.createAnimationChannel().setTargetNode(target).setTargetPath(path).setSampler(sampler);
    anim.addSampler(sampler).addChannel(channel);
  }
  console.log(`+ ${name}: ${anim.listChannels().length} kanal${Math.abs(rootScale - 1) > 1e-3 ? `, kök ölçeği ${rootScale.toFixed(3)} düzeltildi` : ''}`);
}

await doc.transform(
  resample(),
  dedup(),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [texSize, texSize], quality: 85 }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(outPath, doc);
const { statSync } = await import('node:fs');
console.log('yazıldı', outPath, Math.round(statSync(outPath).size / 1024), 'KB');
