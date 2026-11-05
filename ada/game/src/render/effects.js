// Son işlem (bloom, vinyet) ve toz parçacıkları.
import * as THREE from 'three/webgpu';
import { pass, screenUV, smoothstep, mix, vec3, vec4, float } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { softDot } from './textures.js';

export function createPost(renderer, scene, camera, quality) {
  if (!quality.post) return null;
  const pipeline = new THREE.RenderPipeline(renderer);
  const scenePass = pass(scene, camera);
  const color = scenePass.getTextureNode('output');
  let out = color;
  if (quality.bloom) out = color.add(bloom(color, 0.32, 0.45, 0.82));
  // vinyet ve hafif sıcak renk ayarı
  const d = screenUV.sub(0.5).length();
  const vig = smoothstep(float(0.85), float(0.32), d);
  const warm = out.rgb.mul(vec3(1.04, 1.0, 0.95));
  pipeline.outputNode = vec4(mix(warm.mul(0.62), warm, vig), 1);
  return pipeline;
}

export function createDust(scene, count = 90) {
  const tex = softDot();
  const mat = new THREE.SpriteNodeMaterial({ map: tex, transparent: true, depthWrite: false, color: 0xd8c3a0 });
  const sprites = [];
  for (let i = 0; i < count; i++) {
    const s = new THREE.Sprite(mat.clone());
    s.visible = false;
    s.scale.setScalar(0.4);
    scene.add(s);
    sprites.push({ s, life: 0, max: 1, vel: new THREE.Vector3() });
  }
  let idx = 0;
  function burst(at, n = 8, power = 1, color = 0xd8c3a0) {
    for (let k = 0; k < n; k++) {
      const p = sprites[idx++ % sprites.length];
      p.s.visible = true;
      p.s.position.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.1 + Math.random() * 0.2, (Math.random() - 0.5) * 0.8));
      p.vel.set((Math.random() - 0.5) * 2 * power, (0.6 + Math.random() * 1.4) * power, (Math.random() - 0.5) * 2 * power);
      p.life = p.max = 0.6 + Math.random() * 0.7;
      p.s.material.color.set(color);
      p.s.material.opacity = 0.75;
    }
  }
  function update(dt) {
    for (const p of sprites) {
      if (!p.s.visible) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.s.visible = false;
        continue;
      }
      p.vel.y -= 1.4 * dt;
      p.s.position.addScaledVector(p.vel, dt);
      const t = 1 - p.life / p.max;
      p.s.scale.setScalar(0.35 + t * 1.3);
      p.s.material.opacity = 0.7 * (1 - t);
    }
  }
  return { burst, update };
}
