// Ortak stüdyo ışığı: yumuşak kutular ve şerit ışıklardan oluşan ortam haritası.
// Metal yüzeylerdeki uzun parlak çizgiler (fotoğraf stüdyosu görünümü) buradan gelir.
import * as THREE from 'three';

export function buildEnvScene(bright = false) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(bright ? 0x34383e : 0x15171b);
  const geo = new THREE.PlaneGeometry(1, 1);
  const add = (w: number, h: number, pos: [number, number, number], intensity: number, color = 0xffffff) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.scale.set(w, h, 1);
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  add(10, 4.5, [0, 6, 1], 4.2); // üst softbox
  add(1.6, 12, [-6, 1, 2], 7.0); // sol şerit ışık
  add(1.0, 12, [-5, 0, -3.5], 3.0); // sol arka şerit
  add(1.2, 12, [6, 0.5, -0.5], 3.6, 0xfff1dc); // sağ sıcak şerit
  add(12, 2.6, [0, 1.6, -7], 1.0, 0xfff0dc); // arka ışık
  add(6, 2.2, [2.5, -0.5, 6], 1.4); // ön dolgu
  add(30, 30, [0, -7, 0], bright ? 0.5 : 0.22); // zemin
  if (bright) {
    // Atölye: tavanda geniş panel ve yanlarda ek şeritler (büyük metal yüzeyler karanlıkta kalmasın)
    add(16, 10, [0, 8, 0], 2.2);
    add(3, 10, [7, 2, 4], 2.4, 0xfff4e6);
    add(3, 10, [-7, 2, 5], 1.8);
  }
  return s;
}

/** Ortam haritasını üretir; sahne geçici nesneleri hemen serbest bırakılır. */
export function studioEnvironment(renderer: THREE.WebGLRenderer, bright = false) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = buildEnvScene(bright);
  const tex = pmrem.fromScene(envScene, 0.035).texture;
  envScene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
  });
  pmrem.dispose();
  return tex;
}
