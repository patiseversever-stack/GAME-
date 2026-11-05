// Meshy'den gelen hazır modeller (kalıntı kiti): yükle, birim kutuya oturt, örnekleyerek yerleştir.
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export async function loadKit(base, names) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const kit = {};
  await Promise.all(
    names.map(async (name) => {
      try {
        const gltf = await loader.loadAsync(`${base}${name}.glb`);
        gltf.scene.updateMatrixWorld(true);
        const parts = [];
        const box = new THREE.Box3();
        gltf.scene.traverse((o) => {
          if (!o.isMesh) return;
          const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
          g.computeBoundingBox();
          box.union(g.boundingBox);
          parts.push({ geometry: g, material: o.material });
        });
        // birim kutu: taban y=0, x/z ortada, her boyut 1
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const m = new THREE.Matrix4()
          .makeScale(1 / size.x, 1 / size.y, 1 / size.z)
          .multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));
        for (const p of parts) {
          p.geometry.applyMatrix4(m);
          p.geometry.computeVertexNormals?.();
          if (p.material) {
            p.material.side = THREE.FrontSide;
            if ('roughness' in p.material) p.material.roughness = Math.max(0.75, p.material.roughness ?? 0.9);
            if ('metalness' in p.material) p.material.metalness = 0;
          }
        }
        kit[name] = { parts, size, aspect: { xy: size.x / size.y, zy: size.z / size.y } };
      } catch (e) {
        console.warn('model yüklenemedi:', name, e);
      }
    }),
  );
  return kit;
}

// Yerleştirme listesi topla, sonra her model parçası için tek bir örneklenmiş çizim oluştur
export function createKitPlacer(scene, kit, shadows) {
  const lists = {};
  const tmpM = new THREE.Matrix4();
  return {
    has: (name) => !!kit?.[name],
    add(name, position, quaternion, scale) {
      if (!kit?.[name]) return false;
      (lists[name] ||= []).push({ p: position.clone(), q: quaternion.clone(), s: scale.clone() });
      return true;
    },
    flush() {
      for (const [name, list] of Object.entries(lists)) {
        for (const part of kit[name].parts) {
          const im = new THREE.InstancedMesh(part.geometry, part.material, list.length);
          list.forEach((it, i) => im.setMatrixAt(i, tmpM.compose(it.p, it.q, it.s)));
          im.instanceMatrix.needsUpdate = true;
          im.castShadow = shadows;
          im.receiveShadow = shadows;
          im.frustumCulled = false;
          scene.add(im);
        }
      }
    },
  };
}
