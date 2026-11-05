// Takip kamerası: koşucunun arkasında ve biraz yukarıda, hız hissi için FOV oynar.
import * as THREE from 'three/webgpu';

export function createFollowCamera(aspect) {
  const cam = new THREE.PerspectiveCamera(72, aspect, 0.1, 6000);
  const state = {
    pos: new THREE.Vector3(),
    look: new THREE.Vector3(),
    shake: 0,
    init: false,
    orbit: 0,
    mode: 'follow', // follow | finish | intro
  };
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  function update(dt, target, frame, speed, opts = {}) {
    const { portrait = true, zip = false } = opts;
    const back = portrait ? 6.8 : 5.6;
    const height = portrait ? 3.3 : 2.6;
    let desiredPos, desiredLook;
    if (state.mode === 'finish') {
      state.orbit += dt * 0.55;
      const ang = Math.PI * 0.85 + state.orbit;
      const fwd = frame.tan;
      const right = frame.right;
      desiredPos = tmp.copy(target).addScaledVector(fwd, Math.cos(ang) * 5.5).addScaledVector(right, Math.sin(ang) * 5.5).add(new THREE.Vector3(0, 1.7, 0));
      desiredLook = tmp2.copy(target).add(new THREE.Vector3(0, 1.1, 0));
    } else if (state.mode === 'intro') {
      desiredPos = tmp.copy(target).addScaledVector(frame.tan, 6).add(new THREE.Vector3(0, 2.0, 0)).addScaledVector(frame.right, 2.5);
      desiredLook = tmp2.copy(target).add(new THREE.Vector3(0, 1.2, 0));
    } else {
      desiredPos = tmp.copy(target).addScaledVector(frame.tan, -back).add(new THREE.Vector3(0, height + (zip ? 1.2 : 0), 0));
      // kamera şeritlerin ortasına doğru hafif çekilsin ki yan şeritler görünsün
      desiredPos.addScaledVector(frame.right, -opts.lateral * 0.35);
      desiredLook = tmp2.copy(target).addScaledVector(frame.tan, 7.5).add(new THREE.Vector3(0, 1.0, 0));
    }
    if (!state.init) {
      state.pos.copy(desiredPos);
      state.look.copy(desiredLook);
      state.init = true;
    }
    const k = 1 - Math.exp(-dt * (state.mode === 'follow' ? 7.5 : 2.4));
    state.pos.lerp(desiredPos, k);
    state.look.lerp(desiredLook, 1 - Math.exp(-dt * 10));
    cam.position.copy(state.pos);
    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt * 2.2);
      const a = state.shake * 0.18;
      cam.position.x += (Math.random() - 0.5) * a;
      cam.position.y += (Math.random() - 0.5) * a;
    }
    cam.lookAt(state.look);
    const baseFov = portrait ? 74 : 62;
    const fov = baseFov + THREE.MathUtils.clamp((speed - 6) * 1.1, 0, 7) + (zip ? 6 : 0);
    cam.fov += (fov - cam.fov) * Math.min(1, dt * 3);
    cam.updateProjectionMatrix();
  }
  return { camera: cam, state, update, shake: (v) => (state.shake = Math.max(state.shake, v)) };
}
