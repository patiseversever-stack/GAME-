// Gökyüzü: öğleden sonra güneşi, yumuşak bulutlar, aynı gökyüzünden çevre yansıması; ışıklar ve sis.
import * as THREE from 'three/webgpu';
import { SkyMesh } from 'three/addons/objects/SkyMesh.js';

const SKY = { turbidity: 3.2, rayleigh: 1.35, mieCoefficient: 0.0045, mieDirectionalG: 0.84, cloudCoverage: 0.42, cloudDensity: 0.55, cloudScale: 0.00022 };

function configure(sky, sunDir) {
  sky.turbidity.value = SKY.turbidity;
  sky.rayleigh.value = SKY.rayleigh;
  sky.mieCoefficient.value = SKY.mieCoefficient;
  sky.mieDirectionalG.value = SKY.mieDirectionalG;
  sky.sunPosition.value.copy(sunDir);
  if (sky.cloudCoverage) {
    sky.cloudCoverage.value = SKY.cloudCoverage;
    sky.cloudDensity.value = SKY.cloudDensity;
    sky.cloudScale.value = SKY.cloudScale;
  }
  sky.material.fog = false;
}

export function createSky({ scene, renderer, quality }) {
  // güneş: arkada-sağda, ~30° yükseklikte: önümüz mavi gökyüzü, gölgeler ileri-sola düşer
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 30), THREE.MathUtils.degToRad(38));
  const sky = new SkyMesh();
  sky.scale.setScalar(4500);
  configure(sky, sunDir);
  scene.add(sky);

  try {
    const envScene = new THREE.Scene();
    const envSky = new SkyMesh();
    envSky.scale.setScalar(1000);
    configure(envSky, sunDir);
    envSky.showSunDisc.value = 0;
    envScene.add(envSky);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.03, 1, 2000).texture;
    scene.environmentIntensity = 0.45;
  } catch (e) {
    console.warn('çevre yansıması kapalı', e);
  }

  scene.fog = new THREE.Fog(0x9ebfd8, 240, quality.fogFar * 2.2 + 300);

  const hemi = new THREE.HemisphereLight(0xbcd6f5, 0x5f4b33, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffdcae, 3.3);
  if (quality.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
    const sc = sun.shadow.camera;
    sc.left = -28; sc.right = 28; sc.top = 28; sc.bottom = -28;
    sc.near = 10; sc.far = 280;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.05;
  }
  scene.add(sun, sun.target);
  return {
    sunDir,
    follow(focus) {
      sun.target.position.copy(focus);
      sun.position.copy(focus).addScaledVector(sunDir, 130);
    },
    update(t, cam) {
      sky.position.copy(cam.position);
    },
  };
}
