// Deniz: derinliğe göre turkuazdan laciverde, kıyıda dalgalanan köpük, gökyüzü yansıması.
import * as THREE from 'three/webgpu';
import { time, sin, attribute, color, mix, smoothstep as sstep, float, max as tmax, positionWorld } from 'three/tsl';

export function createWater({ scene, terrain, quality, waterNormal }) {
  const res = quality.key === 'dusuk' ? 130 : quality.key === 'orta' ? 190 : 260;
  const box = terrain.bounds.clone().expandByVector(new THREE.Vector3(40, 0, 40));
  const w = box.max.x - box.min.x, dz = box.max.z - box.min.z;
  const g = new THREE.PlaneGeometry(w, dz, Math.round(res * (w / dz)), res);
  g.rotateX(-Math.PI / 2);
  g.translate((box.min.x + box.max.x) / 2, 0, (box.min.z + box.max.z) / 2);
  const p = g.attributes.position;
  const depth = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) depth[i] = Math.max(-1.5, -terrain.heightAt(p.getX(i), p.getZ(i)));
  g.setAttribute('depth', new THREE.BufferAttribute(depth, 1));
  g.deleteAttribute('uv');
  // görünmeyecek kara üstü üçgenleri at (çizim yükü azalır)
  {
    const idx = g.index.array;
    const keep = [];
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i], b = idx[i + 1], c = idx[i + 2];
      if (depth[a] > -1.2 || depth[b] > -1.2 || depth[c] > -1.2) keep.push(a, b, c);
    }
    g.setIndex(keep);
  }

  waterNormal.repeat.set(1, 1);
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.14, metalness: 0.0, normalMap: waterNormal, normalScale: new THREE.Vector2(0.28, 0.28) });
  const dA = attribute('depth', 'float');
  const shallow = color(0x5fe3cf), mid = color(0x22b0c4), deep = color(0x13609f), abyss = color(0x0b3f78);
  let base = mix(shallow, mid, sstep(float(0.15), float(2.4), dA));
  base = mix(base, deep, sstep(float(2.4), float(8.0), dA));
  base = mix(base, abyss, sstep(float(8.0), float(14.0), dA));
  // kıyı köpüğü: sabit ince çizgi + kıyıya doğru yürüyen dalga bantları
  const waveA = sin(time.mul(1.25).sub(dA.mul(5.5))).mul(0.5).add(0.5);
  const waveB = sin(time.mul(0.9).sub(dA.mul(3.1)).add(positionWorld.x.mul(0.05))).mul(0.5).add(0.5);
  const shore = sstep(float(0.35), float(0.0), dA);
  const bandA = sstep(float(1.4), float(0.7), dA).mul(sstep(float(0.78), float(0.97), waveA));
  const bandB = sstep(float(2.6), float(1.4), dA).mul(sstep(float(0.9), float(0.99), waveB)).mul(0.6);
  const foam = tmax(tmax(shore, bandA), bandB);
  m.colorNode = mix(base, color(0xf4fbfa), foam.mul(0.92));
  m.roughnessNode = mix(float(0.12), float(0.85), foam);
  const sea = new THREE.Mesh(g, m);
  sea.position.y = 0.03;
  sea.receiveShadow = quality.shadows;
  scene.add(sea);

  // açık deniz halkası
  const outerMat = new THREE.MeshStandardNodeMaterial({ color: 0x0b3f78, roughness: 0.16, metalness: 0, normalMap: waterNormal, normalScale: new THREE.Vector2(0.2, 0.2) });
  const outer = new THREE.Mesh(new THREE.RingGeometry(Math.min(w, dz) * 0.46, 7000, 96, 1).rotateX(-Math.PI / 2), outerMat);
  outer.position.set((box.min.x + box.max.x) / 2, -0.02, (box.min.z + box.max.z) / 2);
  scene.add(outer);

  // normal haritası dünya koordinatında tekrar etsin
  waterNormal.wrapS = waterNormal.wrapT = THREE.RepeatWrapping;
  const rep = 1 / 16;
  const setUV = (geo, cx, cz) => {
    const pp = geo.attributes.position;
    const uv = new Float32Array(pp.count * 2);
    for (let i = 0; i < pp.count; i++) uv.set([(pp.getX(i) + cx) * rep, (pp.getZ(i) + cz) * rep], i * 2);
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  };
  setUV(g, 0, 0);
  setUV(outer.geometry, outer.position.x, outer.position.z);

  return {
    update(t) {
      waterNormal.offset.set((t * 0.00002) % 1, (t * 0.000013) % 1);
    },
  };
}
