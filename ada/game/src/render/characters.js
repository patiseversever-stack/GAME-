// Karakterler: oyuncu Ece (Meshy modeli), rakipler şimdilik aynı iskeletin "kil" kopyaları.
// Kendi modelleri üretilince yalnızca model dosyası değişecek.
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const UP = new THREE.Vector3(0, 1, 0);

export async function loadCharacterAsset(url) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  // kök hareketini sök: koşucu yerinde koşsun, ilerlemeyi kural motoru versin
  for (const clip of gltf.animations) {
    for (const track of clip.tracks) {
      if (/Hips\.position$/.test(track.name)) {
        const v = track.values;
        const x0 = v[0], z0 = v[2];
        for (let i = 0; i < v.length; i += 3) {
          v[i] = x0;
          v[i + 2] = z0;
        }
      }
    }
  }
  // ölçek: 1.72 m boy
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const h = box.max.y - box.min.y;
  const scale = h > 0.1 ? 1.72 / h : 1;
  return { gltf, scale, footY: box.min.y };
}

const TEAM_CLAY = { safak: 0xc9824a, yakamoz: 0x3d8f95 };

export function createRunnerVisual(asset, { clay = null, castShadow = true } = {}) {
  const root = new THREE.Group();
  const model = clay ? cloneSkinned(asset.gltf.scene) : asset.gltf.scene;
  model.scale.setScalar(asset.scale);
  model.position.y = -asset.footY * asset.scale;
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = castShadow;
      o.receiveShadow = true;
      o.frustumCulled = false;
      if (clay) {
        o.material = new THREE.MeshStandardNodeMaterial({ color: TEAM_CLAY[clay] ?? 0xb0a89a, roughness: 0.55, metalness: 0.0 });
      }
    }
  });
  const pivot = new THREE.Group();
  pivot.add(model);
  root.add(pivot);
  const mixer = new THREE.AnimationMixer(model);
  const clips = Object.fromEntries(asset.gltf.animations.map((c) => [c.name, c]));
  const actions = {};
  for (const [name, clip] of Object.entries(clips)) actions[name] = mixer.clipAction(clip);
  if (actions.Jump) {
    actions.Jump.setLoop(THREE.LoopOnce, 1);
    actions.Jump.clampWhenFinished = true;
  }
  if (actions.Slide) {
    actions.Slide.setLoop(THREE.LoopOnce, 1);
    actions.Slide.clampWhenFinished = true;
  }
  let current = null;
  function play(name, { fade = 0.14, timeScale = 1, offset = 0 } = {}) {
    const a = actions[name];
    if (!a) return;
    if (current === a) {
      a.timeScale = timeScale;
      return;
    }
    a.reset();
    a.timeScale = timeScale;
    a.time = offset * a.getClip().duration;
    a.enabled = true;
    a.setEffectiveWeight(1);
    a.play();
    if (current) current.crossFadeTo(a, fade, false);
    current = a;
  }
  play('Run');
  return { root, pivot, model, mixer, actions, play, clips, lean: 0, lastState: 'run', fallSpin: 0 };
}

// Kural motorundaki koşucu durumunu görüntüye çevir
const tmp = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3() };
export function updateRunnerVisual(v, runner, prevRunner, alpha, path, world, dt) {
  const z = prevRunner ? prevRunner.z + (runner.z - prevRunner.z) * alpha : runner.z;
  const x = prevRunner ? prevRunner.x + (runner.x - prevRunner.x) * alpha : runner.x;
  const y = prevRunner ? prevRunner.y + (runner.y - prevRunner.y) * alpha : runner.y;
  const f = path.frame(z, tmp.p, tmp.t, tmp.r);
  const pos = v.root.position;
  if (runner.state === 'zip') {
    const rope = world.zipRopeY(z);
    pos.copy(f.pos).addScaledVector(f.right, x);
    pos.y = rope.y - 2.02;
  } else {
    pos.copy(f.pos).addScaledVector(f.right, x).addScaledVector(UP, y);
  }
  const yaw = Math.atan2(f.tan.x, f.tan.z);
  // şerit değiştirirken hafif yatış
  const targetLean = THREE.MathUtils.clamp((runner.lane * 1.7 - runner.x) * -0.12, -0.25, 0.25);
  v.lean += (targetLean - v.lean) * Math.min(1, dt * 10);
  v.root.rotation.set(0, yaw, 0);
  v.pivot.rotation.set(0, 0, v.lean);

  // animasyon seçimi
  const s = runner.state;
  if (s !== v.lastState) {
    if (s === 'jump') {
      const d = v.actions.Jump?.getClip().duration || 1;
      v.play('Jump', { fade: 0.08, timeScale: (d * 0.7) / 0.78, offset: 0.22 });
    } else if (s === 'slide') {
      const d = v.actions.Slide?.getClip().duration || 1;
      v.play('Slide', { fade: 0.08, timeScale: d / 0.95 });
    } else if (s === 'zip') v.play('RopeHang', { fade: 0.15 });
    else if (s === 'finished') v.play('Walk', { fade: 0.6, timeScale: 1 });
    else if (s === 'fall') v.fallSpin = 0;
    else v.play('Run', { fade: 0.16 });
    v.lastState = s;
  }
  if (s === 'run' || s === 'stumble') {
    v.play('Run', { timeScale: THREE.MathUtils.clamp(runner.speed / 8.6, 0.55, 1.2) });
  }
  if (s === 'stumble') v.pivot.rotation.x = Math.sin(performance.now() * 0.02) * 0.08 + 0.18;
  else if (s === 'fall') {
    v.fallSpin += dt * 2.4;
    v.pivot.rotation.x = Math.min(1.3, v.fallSpin);
  } else v.pivot.rotation.x *= 0.8;
  v.mixer.update(dt);
}
