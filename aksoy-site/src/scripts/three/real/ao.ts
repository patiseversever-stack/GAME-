// Ortam kapatma (ambient occlusion) pişirme: her köşe noktasından yarım küreye ışın atılır,
// yakındaki yüzeylere çarpan ışın oranı köşe rengini koyulaştırır. Cep, yarık ve delikler
// gerçek fotoğraftaki gibi kararır; düz yüzeyler etkilenmez.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshBVH } from 'three-mesh-bvh';

export function bakeAO(root: THREE.Object3D, o: { rays?: number; dist?: number; strength?: number; skip?: (m: THREE.Mesh) => boolean } = {}) {
  const rays = o.rays ?? 40, dist = o.dist ?? 7, strength = o.strength ?? 0.92;
  root.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  root.traverse((x) => {
    const m = x as THREE.Mesh;
    if (!m.isMesh || !m.visible) return;
    const mat = m.material as THREE.Material;
    if ((mat as THREE.MeshBasicMaterial).isMeshBasicMaterial || (mat as THREE.Material).transparent) return;
    meshes.push(m);
  });
  // Tüm sahne tek BVH (dünya uzayında)
  const geos = meshes.map((m) => {
    const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone());
    for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
    g.applyMatrix4(m.matrixWorld);
    return g;
  });
  const all = mergeGeometries(geos);
  const bvh = new MeshBVH(all);
  // Kosinüs ağırlıklı yarım küre örnekleri (sabit tohum: tekrarlanabilir)
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const samples: THREE.Vector3[] = [];
  for (let i = 0; i < rays; i++) {
    const u = (i + rnd()) / rays, v = rnd();
    const r = Math.sqrt(u), phi = 2 * Math.PI * v;
    samples.push(new THREE.Vector3(r * Math.cos(phi), r * Math.sin(phi), Math.sqrt(1 - u)));
  }
  const ray = new THREE.Ray();
  const p = new THREE.Vector3(), n = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), d = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  const cache = new Map<string, number>();
  for (const m of meshes) {
    const g = m.geometry;
    const pos = g.attributes.position, nor = g.attributes.normal;
    if (!nor) g.computeVertexNormals();
    const N = g.attributes.normal;
    nm.getNormalMatrix(m.matrixWorld);
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
      const key = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)},${n.x.toFixed(1)},${n.y.toFixed(1)},${n.z.toFixed(1)}`;
      let occ = cache.get(key);
      if (occ === undefined) {
        // Teğet tabanı
        t1.set(Math.abs(n.x) < 0.9 ? 1 : 0, Math.abs(n.x) < 0.9 ? 0 : 1, 0).cross(n).normalize();
        t2.crossVectors(n, t1);
        let hit = 0;
        for (const s of samples) {
          d.set(0, 0, 0).addScaledVector(t1, s.x).addScaledVector(t2, s.y).addScaledVector(n, s.z).normalize();
          ray.origin.copy(p).addScaledVector(n, 0.03);
          ray.direction.copy(d);
          const h = bvh.raycastFirst(ray, THREE.DoubleSide, 0, dist);
          if (h) hit += 1 - (h.distance / dist) ** 1.5 * 0.6;
        }
        occ = hit / rays;
        cache.set(key, occ);
      }
      const v = 1 - strength * Math.min(1, occ * 1.15);
      const c = Math.max(0.06, v);
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = c;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = m.material as THREE.MeshStandardMaterial;
    if (!mat.vertexColors) { mat.vertexColors = true; mat.needsUpdate = true; }
  }
  all.dispose();
}
