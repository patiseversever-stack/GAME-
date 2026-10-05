// Kullanıcının getirdiği (yapay zekâ ile üretilmiş) GLB gövdesini kodla üretilmiş modelin yerine koyar.
// Model meshopt ile sıkıştırılmış olabilir; dokulardaki sahte yansımalar yerine gerçek metal malzeme kullanılır.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { Drill } from './model';

export interface GlbConfig {
  url: string;
  /** Model ekseni hizalama: GLB'yi tasarım eksenine (+Y = uca doğru) çeviren Euler açıları (radyan) */
  rotation: [number, number, number];
  /** Matkabın toplam boyu (mm). Ölçek bundan hesaplanır. */
  lengthMM: number;
  /** Eksen boyunca kaydırma (mm), uç ucunu A_TIP noktasına oturtmak için */
  offsetMM: [number, number, number];
  /** GLB'de uçlar ve vidalar gömülü mü? (true → kodla üretilen uçlar yalnızca havalanırken görünür) */
  bakedInserts: boolean;
  /** Yapay zekâ dokusunu tamamen at ve düz metal kullan (true önerilir) */
  replaceMaterials: boolean;
}

/** Model dosyası gelince burası doldurulur. null → kodla üretilmiş geçici model kullanılır. */
export const GLB: GlbConfig | null = null;

export async function applyGlb(drill: Drill, cfg: GlbConfig, onProgress?: (p: number) => void) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(cfg.url, (e) => {
    if (e.total) onProgress?.(e.loaded / e.total);
  });
  const model = gltf.scene;
  model.rotation.set(...cfg.rotation);
  model.updateMatrixWorld(true);

  // Boyu ölç ve mm'ye ölçekle (tasarım uzayı mm; dış grup 0.01 ile küçültür)
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const s = cfg.lengthMM / size.y;
  model.scale.multiplyScalar(s);
  model.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(model);
  const c = box2.getCenter(new THREE.Vector3());
  // Uç ucu (max Y) tasarımdaki uca (+56 mm) gelsin
  model.position.set(-c.x + cfg.offsetMM[0], 56 - box2.max.y + cfg.offsetMM[1], -c.z + cfg.offsetMM[2]);

  const steel = drill.materials.body as THREE.MeshPhysicalMaterial;
  const gold = drill.materials.insert as THREE.MeshPhysicalMaterial;
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = false;
    const src = m.material as THREE.MeshStandardMaterial;
    if (cfg.replaceMaterials) {
      // Altın tonlu bölgeler (uçlar) için ayrı malzeme yoksa tek gövde malzemesi kullanılır.
      const mat = steel.clone();
      mat.vertexColors = false;
      if (src?.normalMap) mat.normalMap = src.normalMap;
      m.material = mat;
    } else if (src) {
      src.envMapIntensity = 1;
    }
    m.geometry.computeVertexNormals?.();
  });
  void gold;

  // Kodla üretilmiş gövdeyi gizle, GLB'yi ekle
  drill.body.children.forEach((ch) => (ch.visible = false));
  drill.body.add(model);

  if (cfg.bakedInserts) {
    drill.inserts.forEach((ip) => (ip.insert.visible = false));
  }
  return model;
}
